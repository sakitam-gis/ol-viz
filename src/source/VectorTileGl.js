import Tile from 'ol/VectorTile.js';
// import VectorImageTile from 'ol/VectorImageTile';
import VectorImageTile, { defaultLoadFunction } from './VectorImageTile';
import { getKeyZXY } from 'ol/tilecoord';
import TileState from 'ol/TileState';
import { toSize } from 'ol/size';
import UrlTile from 'ol/source/UrlTile.js';
import { createXYZ, extentFromProjection, createForProjection } from 'ol/tilegrid';

class VectorTileGl extends UrlTile {
  constructor (options = {}) {
    const projection = options.projection || 'EPSG:3857';
    const extent = options.extent || extentFromProjection(projection);
    const tileGrid = options.tileGrid || createXYZ({
      extent: extent,
      maxZoom: options.maxZoom || 22,
      minZoom: options.minZoom,
      tileSize: options.tileSize || 512
    });

    super({
      attributions: options.attributions,
      cacheSize: options.cacheSize !== undefined ? options.cacheSize : 128,
      opaque: false,
      projection: projection,
      state: options.state,
      tileGrid: tileGrid,
      tileLoadFunction: options.tileLoadFunction ? options.tileLoadFunction : defaultLoadFunction,
      tileUrlFunction: options.tileUrlFunction,
      url: options.url,
      urls: options.urls,
      wrapX: options.wrapX === undefined ? true : options.wrapX,
      transition: options.transition
    });
    this.format_ = options.format ? options.format : null;
    this.sourceTiles_ = {};
    this.overlaps_ = options.overlaps === undefined ? true : options.overlaps;
    this.tileClass = options.tileClass ? options.tileClass : Tile;
    this.tileGrids_ = {};
  }

  getOverlaps () {
    return this.overlaps_;
  }

  clear () {
    this.tileCache.clear();
    this.sourceTiles_ = {};
  }

  getTile (z, x, y, pixelRatio, projection) {
    const tileCoordKey = getKeyZXY(z, x, y);
    if (this.tileCache.containsKey(tileCoordKey)) {
      return this.tileCache.get(tileCoordKey);
    } else {
      const tileCoord = [z, x, y];
      const urlTileCoord = this.getTileCoordForTileUrlFunction(tileCoord, projection);
      const tile = new VectorImageTile(
        tileCoord,
        urlTileCoord !== null ? TileState.IDLE : TileState.EMPTY,
        this.getRevision(),
        this.format_, this.tileLoadFunction, urlTileCoord, this.tileUrlFunction,
        this.tileGrid, this.getTileGridForProjection(projection),
        this.sourceTiles_, pixelRatio, projection, this.tileClass,
        this.handleTileChange.bind(this), tileCoord[0]);
      this.tileCache.set(tileCoordKey, tile);
      return tile;
    }
  }

  getTileGridForProjection (projection) {
    const code = projection.getCode();
    let tileGrid = this.tileGrids_[code];
    if (!tileGrid) {
      const sourceTileGrid = this.tileGrid;
      tileGrid = this.tileGrids_[code] = createForProjection(projection, undefined,
        sourceTileGrid ? sourceTileGrid.getTileSize(sourceTileGrid.getMinZoom()) : undefined);
    }
    return tileGrid;
  }

  getTilePixelRatio (pixelRatio) {
    return pixelRatio;
  }

  getTilePixelSize (z, pixelRatio, projection) {
    const tileGrid = this.getTileGridForProjection(projection);
    const tileSize = toSize(tileGrid.getTileSize(z), this.tmpSize);
    return [Math.round(tileSize[0] * pixelRatio), Math.round(tileSize[1] * pixelRatio)];
  }
}

export default VectorTileGl;
