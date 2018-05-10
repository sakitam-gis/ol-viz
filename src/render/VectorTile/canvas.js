import { createCanvasContext2D } from 'ol/dom';
import TileState from 'ol/TileState';
import ViewHint from 'ol/ViewHint';
import rbush from 'rbush';
import { buffer, equals, getIntersection, getTopLeft, intersects } from 'ol/extent';
import VectorTileRenderType from 'ol/layer/VectorTileRenderType';
import { equivalent as equivalentProjection } from 'ol/proj';
import Units from 'ol/proj/Units';
import ReplayType from 'ol/render/ReplayType';
// import { labelCache } from 'ol/render/canvas';
import CanvasBuilderGroup from './Builder';
import { ORDER } from 'ol/render/replay';
import CanvasTileLayerRenderer from 'ol/renderer/canvas/TileLayer';
import { getSquaredTolerance as getSquaredRenderTolerance, renderFeature } from 'ol/renderer/vector';
import {
  create as createTransform,
  compose as composeTransform,
  reset as resetTransform,
  scale as scaleTransform,
  translate as translateTransform,
  toString as transformToString,
  makeScale,
  makeInverse
} from 'ol/transform';
import CanvasExecutorGroup from './Executor';

const IMAGE_REPLAYS = {
  'image': [ReplayType.POLYGON, ReplayType.CIRCLE,
    ReplayType.LINE_STRING, ReplayType.IMAGE, ReplayType.TEXT],
  'hybrid': [ReplayType.POLYGON, ReplayType.LINE_STRING]
};

const VECTOR_REPLAYS = {
  'image': [ReplayType.DEFAULT],
  'hybrid': [ReplayType.IMAGE, ReplayType.TEXT, ReplayType.DEFAULT],
  'vector': ORDER
};

class CanvasVectorTileLayerRenderer extends CanvasTileLayerRenderer {
  constructor (layer) {
    super(layer);
    const baseCanvas = this.context.canvas;
    this.overlayContext_ = createCanvasContext2D();
    const overlayCanvas = this.overlayContext_.canvas;
    overlayCanvas.style.position = 'absolute';
    overlayCanvas.style.transformOrigin = 'top left';
    const container = document.createElement('div');
    const style = container.style;
    style.position = 'absolute';
    style.width = '100%';
    style.height = '100%';
    container.appendChild(baseCanvas);
    container.appendChild(overlayCanvas);
    this.container_ = container;
    this.overlayPixelTransform_ = createTransform();
    this.inverseOverlayPixelTransform_ = createTransform();
    this.declutterTree_ = layer.getDeclutter() ? rbush(9, undefined) : null;
    this.dirty_ = false;
    this.renderedLayerRevision_ = null;
    this.tmpTransform_ = createTransform();
    this.zDirection = 0;
    console.log('112');
  }

  disposeInternal () {
    super.disposeInternal();
  }

  getTile (z, x, y, pixelRatio, projection) {
    console.log(projection);
    const tile = super.getTile(z, x, y, pixelRatio, projection);
    if (tile.getState() === TileState.LOADED) {
      this.createExecutorGroup_((tile), pixelRatio, projection);
      if (this.context) {
        this.renderTileImage_((tile), pixelRatio, projection);
      }
    }
    return tile;
  }

  getTileImage (tile) {
    const tileLayer = (this.getLayer());
    return (tile).getImage(tileLayer);
  }

  prepareFrame (frameState, layerState) {
    const layer = this.getLayer();
    const layerRevision = layer.getRevision();
    if (this.renderedLayerRevision_ !== layerRevision) {
      this.renderedTiles.length = 0;
    }
    this.renderedLayerRevision_ = layerRevision;
    return super.prepareFrame(frameState, layerState);
  }

  createExecutorGroup_ (tile, pixelRatio, projection) {
    const layer = (this.getLayer());
    const revision = layer.getRevision();
    const renderOrder = (layer.getRenderOrder()) || null;

    const builderState = tile.getReplayState(layer);
    if (!builderState.dirty && builderState.renderedRevision === revision &&
      builderState.renderedRenderOrder === renderOrder) {
      return;
    }

    const source = (layer.getSource());
    const sourceTileGrid = source.getTileGrid();
    const tileGrid = source.getTileGridForProjection(projection);
    const zoom = tile.tileCoord[0];
    const resolution = tileGrid.getResolution(zoom);
    const tileExtent = tile.extent;
    for (let t = 0, tt = tile.tileKeys.length; t < tt; ++t) {
      const sourceTile = tile.getTile(tile.tileKeys[t]);
      if (sourceTile.getState() !== TileState.LOADED) {
        continue;
      }
      if (tile.useLoadedOnly) {
        const lowResExecutorGroup = sourceTile.getLowResExecutorGroup(layer, zoom, tileExtent);
        if (lowResExecutorGroup) {
          sourceTile.setExecutorGroup(layer, tile.tileCoord.toString(), lowResExecutorGroup);
          continue;
        }
      }
      const sourceTileCoord = sourceTile.tileCoord;
      const sourceTileExtent = sourceTileGrid.getTileCoordExtent(sourceTileCoord);
      const sharedExtent = getIntersection(tileExtent, sourceTileExtent);
      const bufferedExtent = equals(sourceTileExtent, sharedExtent) ? null : buffer(sharedExtent, layer.getRenderBuffer() * resolution, this.tmpExtent);
      const tileProjection = sourceTile.getProjection();
      let reproject = false;
      if (!equivalentProjection(projection, tileProjection)) {
        reproject = true;
        sourceTile.setProjection(projection);
      }
      builderState.dirty = false;
      const builderGroup = new CanvasBuilderGroup(0, sharedExtent, resolution,
        pixelRatio, source.getOverlaps(), this.declutterTree_, layer.getRenderBuffer());
      const squaredTolerance = getSquaredRenderTolerance(resolution, pixelRatio);
      const render = function (feature) {
        let styles;
        const styleFunction = feature.getStyleFunction() || layer.getStyleFunction();
        if (styleFunction) {
          styles = styleFunction(feature, resolution);
        }
        if (styles) {
          const dirty = this.renderFeature(feature, squaredTolerance, styles, builderGroup);
          this.dirty_ = this.dirty_ || dirty;
          builderState.dirty = builderState.dirty || dirty;
        }
      };

      const features = sourceTile.getFeatures();
      if (renderOrder && renderOrder !== builderState.renderedRenderOrder) {
        features.sort(renderOrder);
      }
      for (let i = 0, ii = features.length; i < ii; ++i) {
        const feature = features[i];
        if (reproject) {
          if (tileProjection.getUnits() === Units.TILE_PIXELS) {
            tileProjection.setWorldExtent(sourceTileExtent);
            tileProjection.setExtent(sourceTile.getExtent());
          }
          feature.getGeometry().transform(tileProjection, projection);
        }
        if (!bufferedExtent || intersects(bufferedExtent, feature.getGeometry().getExtent())) {
          render.call(this, feature);
        }
      }
      const executorGroupInstructions = builderGroup.finish();
      const renderingReplayGroup = new CanvasExecutorGroup(0, sharedExtent, resolution,
        pixelRatio, source.getOverlaps(), this.declutterTree_, executorGroupInstructions, layer.getRenderBuffer());
      sourceTile.setExecutorGroup(layer, tile.tileCoord.toString(), renderingReplayGroup);
    }
    builderState.renderedRevision = revision;
    builderState.renderedRenderOrder = renderOrder;
  }

  forEachFeatureAtCoordinate (coordinate, frameState, hitTolerance, callback, thisArg) {
    const found = undefined;
    return found;
  }

  getReplayTransform_ (tile, frameState) {
    const layer = this.getLayer();
    const source = (layer.getSource());
    const tileGrid = source.getTileGrid();
    const tileCoord = tile.tileCoord;
    const tileResolution = tileGrid.getResolution(tileCoord[0]);
    const viewState = frameState.viewState;
    const pixelRatio = frameState.pixelRatio;
    const renderResolution = viewState.resolution / pixelRatio;
    const tileExtent = tileGrid.getTileCoordExtent(tileCoord, this.tmpExtent);
    const center = viewState.center;
    const origin = getTopLeft(tileExtent);
    const size = frameState.size;
    const offsetX = Math.round(pixelRatio * size[0] / 2);
    const offsetY = Math.round(pixelRatio * size[1] / 2);
    return composeTransform(this.tmpTransform_,
      offsetX, offsetY,
      tileResolution / renderResolution, tileResolution / renderResolution,
      viewState.rotation,
      (origin[0] - center[0]) / tileResolution,
      (center[1] - origin[1]) / tileResolution);
  }

  handleStyleImageChange_ (event) {
    this.renderIfReadyAndVisible();
  }

  renderFrame (frameState, layerState) {
    super.renderFrame(frameState, layerState);
    const layer = (this.getLayer());
    const renderMode = layer.getRenderMode();
    if (renderMode === VectorTileRenderType.IMAGE) {
      return this.container_;
    }
    const context = this.overlayContext_;
    const declutterReplays = layer.getDeclutter() ? {} : null;
    const source = (layer.getSource());
    const replayTypes = VECTOR_REPLAYS[renderMode];
    const pixelRatio = frameState.pixelRatio;
    const rotation = frameState.viewState.rotation;
    const size = frameState.size;
    // set forward and inverse pixel transforms
    makeScale(this.overlayPixelTransform_, 1 / pixelRatio, 1 / pixelRatio);
    makeInverse(this.inverseOverlayPixelTransform_, this.overlayPixelTransform_);
    // resize and clear
    const canvas = context.canvas;
    const width = Math.round(size[0] * pixelRatio);
    const height = Math.round(size[1] * pixelRatio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      const canvasTransform = transformToString(this.overlayPixelTransform_);
      if (canvas.style.transform !== canvasTransform) {
        canvas.style.transform = canvasTransform;
      }
    } else {
      context.clearRect(0, 0, width, height);
    }
    if (declutterReplays) {
      this.declutterTree_.clear();
    }
    const viewHints = frameState.viewHints;
    const snapToPixel = !(viewHints[ViewHint.ANIMATING] || viewHints[ViewHint.INTERACTING]);
    const tiles = this.renderedTiles;
    const tileGrid = source.getTileGridForProjection(frameState.viewState.projection);
    const clips = [];
    const zs = [];
    for (let i = tiles.length - 1; i >= 0; --i) {
      const tile = (tiles[i]);
      if (tile.getState() === TileState.ABORT) {
        continue;
      }
      const tileCoord = tile.tileCoord;
      const worldOffset = tileGrid.getTileCoordExtent(tileCoord, this.tmpExtent)[0] - tile.extent[0];
      const transform = this.getRenderTransform(frameState, width, height, worldOffset);
      for (let t = 0, tt = tile.tileKeys.length; t < tt; ++t) {
        const sourceTile = tile.getTile(tile.tileKeys[t]);
        if (sourceTile.getState() !== TileState.LOADED) {
          continue;
        }
        const executorGroup = /** @type {CanvasExecutorGroup} */ (sourceTile.getExecutorGroup(layer, tileCoord.toString()));
        if (!executorGroup || !executorGroup.hasExecutors(replayTypes)) {
          continue;
        }
        const currentZ = sourceTile.tileCoord[0];
        const currentClip = executorGroup.getClipCoords(transform);
        context.save();
        for (let j = 0, jj = clips.length; j < jj; ++j) {
          const clip = clips[j];
          if (currentZ < zs[j]) {
            context.beginPath();
            // counter-clockwise (outer ring) for current tile
            context.moveTo(currentClip[0], currentClip[1]);
            context.lineTo(currentClip[2], currentClip[3]);
            context.lineTo(currentClip[4], currentClip[5]);
            context.lineTo(currentClip[6], currentClip[7]);
            // clockwise (inner ring) for higher resolution tile
            context.moveTo(clip[6], clip[7]);
            context.lineTo(clip[4], clip[5]);
            context.lineTo(clip[2], clip[3]);
            context.lineTo(clip[0], clip[1]);
            context.clip();
          }
        }
        executorGroup.execute(context, transform, rotation, {}, snapToPixel, replayTypes, declutterReplays);
        context.restore();
        clips.push(currentClip);
        zs.push(currentZ);
      }
    }

    const opacity = layerState.opacity;
    if (opacity !== canvas.style.opacity) {
      canvas.style.opacity = opacity;
    }

    return this.container_;
  }

  renderFeature (feature, squaredTolerance, styles, executorGroup) {
    if (!styles) {
      return false;
    }
    let loading = false;
    if (Array.isArray(styles)) {
      for (let i = 0, ii = styles.length; i < ii; ++i) {
        loading = renderFeature(
          executorGroup, feature, styles[i], squaredTolerance,
          this.handleStyleImageChange_, this) || loading;
      }
    } else {
      loading = renderFeature(
        executorGroup, feature, styles, squaredTolerance,
        this.handleStyleImageChange_, this);
    }
    return loading;
  }

  renderTileImage_ (tile, pixelRatio, projection) {
    const layer = (this.getLayer());
    const replayState = tile.getReplayState(layer);
    const revision = layer.getRevision();
    const replays = IMAGE_REPLAYS[layer.getRenderMode()];
    if (replays && replayState.renderedTileRevision !== revision) {
      replayState.renderedTileRevision = revision;
      const tileCoord = tile.wrappedTileCoord;
      const z = tileCoord[0];
      const source = (layer.getSource());
      const tileGrid = source.getTileGridForProjection(projection);
      const resolution = tileGrid.getResolution(z);
      const context = tile.getContext(layer);
      const size = source.getTilePixelSize(z, pixelRatio, projection);
      context.canvas.width = size[0];
      context.canvas.height = size[1];
      const tileExtent = tileGrid.getTileCoordExtent(tileCoord, this.tmpExtent);
      for (let i = 0, ii = tile.tileKeys.length; i < ii; ++i) {
        const sourceTile = tile.getTile(tile.tileKeys[i]);
        if (sourceTile.getState() !== TileState.LOADED) {
          continue;
        }
        const pixelScale = pixelRatio / resolution;
        const transform = resetTransform(this.tmpTransform_);
        scaleTransform(transform, pixelScale, -pixelScale);
        translateTransform(transform, -tileExtent[0], -tileExtent[3]);
        const executorGroup = /** @type {CanvasExecutorGroup} */ (sourceTile.getExecutorGroup(layer,
          tile.tileCoord.toString()));
        executorGroup.execute(context, transform, 0, {}, true, replays);
      }
    }
  }

  getDataAtPixel (pixel, frameState, hitTolerance) {
    return {};
  }
}

export default CanvasVectorTileLayerRenderer;
