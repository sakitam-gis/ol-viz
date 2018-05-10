import { assign } from 'ol/obj.js';
import TileProperty from 'ol/layer/TileProperty';
import VectorTileLayer from 'ol/layer/VectorTile';

class VectorTileLayerGl extends VectorTileLayer {
  constructor (options = {}) {
    const baseOptions = (assign({}, options));
    delete baseOptions.preload;
    delete baseOptions.useInterimTilesOnError;
    super(baseOptions);
  }

  createRenderer () {
    // return new CanvasVectorTileLayer(this);
  }

  getRenderMode () {
    return this.renderMode_;
  }

  getPreload () {
    return this.get(TileProperty.PRELOAD);
  }

  getUseInterimTilesOnError () {
    return this.get(TileProperty.USE_INTERIM_TILES_ON_ERROR);
  }

  setPreload (preload) {
    this.set(TileProperty.PRELOAD, preload);
  }

  setUseInterimTilesOnError (useInterimTilesOnError) {
    this.set(TileProperty.USE_INTERIM_TILES_ON_ERROR, useInterimTilesOnError);
  }
}

export default VectorTileLayerGl;
