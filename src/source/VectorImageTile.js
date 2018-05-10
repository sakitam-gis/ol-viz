import { getUid } from 'ol/util.js';
import Tile from 'ol/Tile.js';
import EventType from 'ol/events/EventType.js';
import { VOID } from 'ol/functions.js';
import TileState from 'ol/TileState.js';
import { createCanvasContext2D } from 'ol/dom.js';
import { listen, unlistenByKey } from 'ol/events.js';
import { containsExtent, getHeight, getIntersection, getWidth } from 'ol/extent.js';
import FormatType from 'ol/format/FormatType';

const loadFeaturesXhr = (url, format, success, failure) => {
  return (
    function (extent, resolution, projection) {
      const xhr = new XMLHttpRequest();
      xhr.open('GET',
        typeof url === 'function' ? url(extent, resolution, projection) : url,
        true);
      if (format.getType() === FormatType.ARRAY_BUFFER) {
        xhr.responseType = 'arraybuffer';
      }
      // xhr.setRequestHeader('Content-Type', 'application/x-protobuf');
      xhr.onload = function (event) {
        if ((!xhr.status || xhr.status >= 200) && xhr.status < 300) {
          var type = format.getType();
          var source;
          if (type === FormatType.JSON || type === FormatType.TEXT) {
            source = xhr.responseText;
          } else if (type === FormatType.XML) {
            source = xhr.responseXML;
            if (!source) {
              source = new DOMParser().parseFromString(xhr.responseText, 'application/xml');
            }
          } else if (type === FormatType.ARRAY_BUFFER) {
            source = /** @type {ArrayBuffer} */ (xhr.response);
          }
          if (source) {
            success.call(this, format.readFeatures(source,
              { featureProjection: projection }),
            format.readProjection(source), format.getLastExtent());
          } else {
            failure.call(this);
          }
        } else {
          failure.call(this);
        }
      }.bind(this);
      xhr.onerror = function () {
        failure.call(this);
      }.bind(this);
      xhr.send();
    }
  );
};

class VectorImageTile extends Tile {
  constructor (tileCoord, state, sourceRevision, format, tileLoadFunction,
    urlTileCoord, tileUrlFunction, sourceTileGrid, tileGrid, sourceTiles,
    pixelRatio, projection, tileClass, handleTileChange, zoom) {
    super(tileCoord, state, { transition: 0 });
    this.context_ = {};
    this.loader_ = null;
    this.replayState_ = {};
    this.sourceTiles_ = sourceTiles;
    this.tileKeys = [];
    this.extent = null;
    this.sourceRevision_ = sourceRevision;
    this.wrappedTileCoord = urlTileCoord;
    this.loadListenerKeys_ = [];
    this.sourceTileListenerKeys_ = [];
    this.useLoadedOnly = zoom !== tileCoord[0];

    if (urlTileCoord) {
      const extent = this.extent = tileGrid.getTileCoordExtent(urlTileCoord);
      const resolution = tileGrid.getResolution(zoom);
      const sourceZ = sourceTileGrid.getZForResolution(resolution);
      const useLoadedOnly = this.useLoadedOnly;
      let loadCount = 0;
      sourceTileGrid.forEachTileCoord(extent, sourceZ, function (sourceTileCoord) {
        let sharedExtent = getIntersection(extent,
          sourceTileGrid.getTileCoordExtent(sourceTileCoord));
        const sourceExtent = sourceTileGrid.getExtent();
        if (sourceExtent) {
          sharedExtent = getIntersection(sharedExtent, sourceExtent, sharedExtent);
        }
        if (getWidth(sharedExtent) / resolution >= 0.5 &&
          getHeight(sharedExtent) / resolution >= 0.5) {
          // only include source tile if overlap is at least 1 pixel
          ++loadCount;
          const sourceTileKey = sourceTileCoord.toString();
          let sourceTile = sourceTiles[sourceTileKey];
          if (!sourceTile && !useLoadedOnly) {
            const tileUrl = tileUrlFunction(sourceTileCoord, pixelRatio, projection);
            sourceTile = sourceTiles[sourceTileKey] = new tileClass(sourceTileCoord, // eslint-disable-line
              tileUrl === undefined ? TileState.EMPTY : TileState.IDLE,
              tileUrl === undefined ? '' : tileUrl,
              format, tileLoadFunction);
            this.sourceTileListenerKeys_.push(
              listen(sourceTile, EventType.CHANGE, handleTileChange));
          }
          if (sourceTile && (!useLoadedOnly || sourceTile.getState() === TileState.LOADED)) {
            sourceTile.consumers++;
            this.tileKeys.push(sourceTileKey);
          }
        }
      }.bind(this));

      if (useLoadedOnly && loadCount === this.tileKeys.length) {
        this.finishLoading_();
      }

      this.createInterimTile_ = function () {
        if (this.getState() !== TileState.LOADED && !useLoadedOnly) {
          let bestZoom = -1;
          for (const key in sourceTiles) {
            const sourceTile = sourceTiles[key];
            if (sourceTile.getState() === TileState.LOADED) {
              const sourceTileCoord = sourceTile.tileCoord;
              const sourceTileExtent = sourceTileGrid.getTileCoordExtent(sourceTileCoord);
              if (containsExtent(sourceTileExtent, extent) && sourceTileCoord[0] > bestZoom) {
                bestZoom = sourceTileCoord[0];
              }
            }
          }
          if (bestZoom !== -1) {
            const tile = new VectorImageTile(tileCoord, state, sourceRevision,
              format, tileLoadFunction, urlTileCoord, tileUrlFunction,
              sourceTileGrid, tileGrid, sourceTiles, pixelRatio, projection,
              tileClass, VOID, bestZoom);
            this.interimTile = tile;
          }
        }
      };
    }
  }

  getInterimTile () {
    if (!this.interimTile) {
      this.createInterimTile_();
    }
    return super.getInterimTile();
  }

  /**
   * @inheritDoc
   */
  disposeInternal () {
    delete this.createInterimTile_;
    this.state = TileState.ABORT;
    this.changed();
    if (this.interimTile) {
      this.interimTile.dispose();
    }

    for (let i = 0, ii = this.tileKeys.length; i < ii; ++i) {
      const sourceTileKey = this.tileKeys[i];
      const sourceTile = this.getTile(sourceTileKey);
      sourceTile.consumers--;
      if (sourceTile.consumers === 0) {
        delete this.sourceTiles_[sourceTileKey];
        sourceTile.dispose();
      }
    }
    this.tileKeys.length = 0;
    this.sourceTiles_ = null;
    this.loadListenerKeys_.forEach(unlistenByKey);
    this.loadListenerKeys_.length = 0;
    this.sourceTileListenerKeys_.forEach(unlistenByKey);
    this.sourceTileListenerKeys_.length = 0;
    super.disposeInternal();
  }

  getContext (layer) {
    const key = getUid(layer);
    if (!(key in this.context_)) {
      this.context_[key] = createCanvasContext2D();
    }
    return this.context_[key];
  }

  getImage (layer) {
    const image = this.getReplayState(layer).renderedTileRevision === -1
      ? null : this.getContext(layer).canvas;
    // console.log(image);
    return image;
  }

  getReplayState (layer) {
    const key = getUid(layer);
    if (!(key in this.replayState_)) {
      this.replayState_[key] = {
        dirty: false,
        renderedRenderOrder: null,
        renderedRevision: -1,
        renderedTileRevision: -1
      };
    }
    return this.replayState_[key];
  }

  getKey () {
    return this.tileKeys.join('/') + '-' + this.sourceRevision_;
  }

  getTile (tileKey) {
    return this.sourceTiles_[tileKey];
  }

  load () {
    let leftToLoad = 0;
    const errorSourceTiles = {};
    if (this.state === TileState.IDLE) {
      this.setState(TileState.LOADING);
    }
    if (this.state === TileState.LOADING) {
      this.tileKeys.forEach(function (sourceTileKey) {
        const sourceTile = this.getTile(sourceTileKey);
        if (sourceTile.state === TileState.IDLE) {
          sourceTile.setLoader(this.loader_);
          sourceTile.load();
        }
        if (sourceTile.state === TileState.LOADING) {
          const key = listen(sourceTile, EventType.CHANGE, function (e) {
            const state = sourceTile.getState();
            if (state === TileState.LOADED ||
              state === TileState.ERROR) {
              const uid = getUid(sourceTile);
              if (state === TileState.ERROR) {
                errorSourceTiles[uid] = true;
              } else {
                --leftToLoad;
                delete errorSourceTiles[uid];
              }
              if (leftToLoad - Object.keys(errorSourceTiles).length === 0) {
                this.finishLoading_();
              }
            }
          }.bind(this));
          this.loadListenerKeys_.push(key);
          ++leftToLoad;
        }
      }.bind(this));
    }
    if (leftToLoad - Object.keys(errorSourceTiles).length === 0) {
      setTimeout(this.finishLoading_.bind(this), 0);
    }
  }

  finishLoading_ () {
    let loaded = this.tileKeys.length;
    let empty = 0;
    for (let i = loaded - 1; i >= 0; --i) {
      const state = this.getTile(this.tileKeys[i]).getState();
      if (state !== TileState.LOADED) {
        --loaded;
      }
      if (state === TileState.EMPTY) {
        ++empty;
      }
    }
    if (loaded === this.tileKeys.length) {
      this.loadListenerKeys_.forEach(unlistenByKey);
      this.loadListenerKeys_.length = 0;
      this.sourceTilesLoaded = true;
      this.setState(TileState.LOADED);
    } else {
      this.setState(empty === this.tileKeys.length ? TileState.EMPTY : TileState.ERROR);
    }
  }
}

export default VectorImageTile;

export function defaultLoadFunction (tile, url) {
  const loader = loadFeaturesXhr(url, tile.getFormat(), tile.onLoad.bind(tile), tile.onError.bind(tile));
  tile.setLoader(loader);
}
