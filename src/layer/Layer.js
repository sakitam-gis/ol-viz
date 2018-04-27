import ol from 'openlayers';
import TWEEN from '@tweenjs/tween.js';
import DataSheet from '../data/DataSheet';
import drawSimple from '../canvas/shape/simple';
import pathSimple from '../canvas/path/simple';
import { createCanvas, clearRect, getDevicePixelRatio } from '../utils'

const CONTEXT_CONFIG = {
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
  imageSmoothingEnabled: true,
  strokeStyle: '#000000',
  fillStyle: '#000000',
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  shadowBlur: 0,
  shadowColor: 'rgba(0, 0, 0, 0)',
  lineWidth: 1,
  lineCap: 'butt',
  lineJoin: 'miter',
  miterLimit: 10,
  lineDashOffset: 0,
  font: '10px sans-serif',
  textAlign: 'start',
  textBaseline: 'alphabetic'
};

class Layer extends ol.layer.Image {
  constructor (options = {}) {
    super(options);
    if (!(options.data instanceof DataSheet)) {
      options.data = new DataSheet(options.data);
    }

    /**
     * this canvas
     * @type {null}
     * @private
     */
    this._canvas = null;

    /**
     * options
     * @type {{}}
     */
    this.options = options;

    /**
     * is renderer
     * @type {boolean}
     * @private
     */
    this._isRenderer = false;

    /**
     * 默认鼠标样式
     * @type {string}
     * @private
     */
    this.previousCursor_ = '';

    /**
     * animate
     * @type {null}
     * @private
     */
    this._animationLoop = null;
    if (!this.options.context) {
      this.set('context', '2d')
    }
    this.setSource(new ol.source.ImageCanvas({
      logo: options.logo,
      state: options.state,
      attributions: options.attributions,
      resolutions: options.resolutions,
      canvasFunction: this.canvasFunction.bind(this),
      projection: (options.hasOwnProperty('projection') ? options.projection : ''),
      ratio: (options.hasOwnProperty('ratio') ? options.ratio : getDevicePixelRatio())
    }));

    this.on('precompose', this.redraw, this);
  }

  /**
   * process data
   * @param data
   */
  processData (data) {
    const draw = this.options.draw;
    if (draw === 'simple') {
      for (let i = 0; i < data.length; i++) {
        data[i]._size = undefined;
      }
    }
  }

  /**
   * 是否允许补间动画
   * @returns {*|boolean}
   */
  isEnabledTime () {
    const animationOptions = this.options.animation;
    return (
      animationOptions &&
      !(animationOptions.enabled === false)
    );
  }

  /**
   * animator
   */
  initAnimator () {
    const that = this;
    const animationOptions = this.options.animation;
    if (this.options.draw === 'time' || this.isEnabledTime()) {
      if (!animationOptions.stepsRange) {
        animationOptions.stepsRange = {
          start: this.options.data.getMin('time') || 0,
          end: this.options.data.getMax('time') || 0
        }
      }
      this.steps = {step: animationOptions.stepsRange.start};
      this.animator = new TWEEN.Tween(that.steps).onUpdate(function (event) {
        that._canvasUpdate(event.step);
      }).repeat(Infinity);
      this.addAnimatorEvent();
      const duration = animationOptions.duration * 1000 || 5000;
      this.animator.to({step: animationOptions.stepsRange.end}, duration);
      this.animator.start();
    } else {
      this.animator && this.animator.stop();
    }
    (function frame () {
      that._animationLoop = window.requestAnimFrame(frame);
      TWEEN.update()
    })();
  }

  /**
   * add animator event
   */
  addAnimatorEvent () {
    const _map = this.getMap();
    if (!_map) return;
    _map.on('movestart', this._animatorMovestartEvent, this);
    _map.on('moveend', this._animatorMoveendEvent, this);
  }

  /**
   * handle movestart event
   * @private
   */
  _animatorMovestartEvent () {
    const animationOptions = this.options.animation;
    if (this.isEnabledTime() && this.animator) {
      this.steps.step = animationOptions.stepsRange.start;
      this.animator.stop();
    }
  }

  /**
   * handle moveend event
   * @private
   */
  _animatorMoveendEvent () {
    if (this.isEnabledTime() && this.animator) {
      this.animator.start();
    }
  }

  /**
   * re-draw
   */
  redraw () {
    const _extent = this.options.extent || this._getMapExtent();
    this.setExtent(_extent);
  }

  /**
   * get context
   * @returns {*|CanvasRenderingContext2D|WebGLRenderingContext|ol.webgl.Context}
   */
  getContext () {
    const _context = this._canvas.getContext(this.get('context') || '2d');
    if (!_context._merge_ && CONTEXT_CONFIG) {
      for (let key in CONTEXT_CONFIG) {
        _context[key] = CONTEXT_CONFIG[key]
      }
      _context._merge_ = true;
    }
    return _context;
  }

  /**
   * get map current extent
   * @returns {ol.View|*|Array<number>}
   * @private
   */
  _getMapExtent () {
    if (!this.getMap()) return;
    const size = this._getMapSize();
    const _view = this.getMap().getView();
    return _view && _view.calculateExtent(size);
  }

  /**
   * get size
   * @private
   */
  _getMapSize () {
    if (!this.getMap()) return
    return this.getMap().getSize()
  }

  /**
   * canvas constructor
   * @param extent
   * @param resolution
   * @param pixelRatio
   * @param size
   * @param projection
   * @returns {*}
   */
  canvasFunction (extent, resolution, pixelRatio, size, projection) {
    if (!this._canvas) {
      this._canvas = createCanvas(size[0], size[1])
    } else {
      this._canvas.width = size[0];
      this._canvas.height = size[1];
    }
    if (resolution <= this.get('maxResolution')) {
      this.render()
    } else {
      // console.warn('超出所设置最大分辨率！')
    }
    return this._canvas
  }

  /**
   * render layer
   * @param time
   * @returns {Layer}
   */
  render (time) {
    const map = this.getMap();
    const context = this.getContext();
    const animationOptions = this.options.animation;
    if (!this._isRenderer) {
      this._isRenderer = true;
      this._initEvent();
      this.initAnimator();
    }
    if (this.isEnabledTime()) {
      if (time === undefined) {
        clearRect(context);
        return this;
      }
      if (this.get('context') === '2d') {
        context.save();
        context.globalCompositeOperation = 'destination-out';
        context.fillStyle = 'rgba(0, 0, 0, .1)';
        context.fillRect(0, 0, context.canvas.width, context.canvas.height);
        context.restore();
      }
    } else {
      clearRect(context);
    }

    if (this.get('context') === '2d') {
      for (const key in this.options) {
        context[key] = this.options[key];
      }
    } else {
      context.clear(context.COLOR_BUFFER_BIT);
    }
    const dataGetOptions = {
      transferCoordinate: function (coordinate) {
        return map.getPixelFromCoordinate(coordinate);
      }
    };

    if (time !== undefined) {
      dataGetOptions.filter = function (item) {
        const trails = animationOptions.trails || 10;
        if (time && item.time > (time - trails) && item.time < time) {
          return true;
        } else {
          return false;
        }
      }
    }

    const data = this.options.data.getData(dataGetOptions);
    this.processData(data);
    this.drawContext(context, new DataSheet(data), this.options, {x: 0, y: 0});
    this.dispatchEvent({
      type: 'render',
      target: this,
      time: time
    });
    return this;
  }

  /**
   * draw context
   * @param context
   * @param dataSet
   * @param options
   * @param nwPixel
   */
  drawContext (context, dataSet, options, nwPixel) {
    switch (this.options.draw) {
      case 'clip':
        context.save();
        context.fillStyle = this.options.fillStyle || 'rgba(0, 0, 0, 0.5)';
        context.fillRect(0, 0, context.canvas.width, context.canvas.height);
        drawSimple.draw(context, dataSet, this.options);
        context.beginPath();
        pathSimple.drawDataSet(context, dataSet, this.options);
        context.clip();
        clearRect(context);
        context.restore();
        break;
      default:
        drawSimple.draw(context, dataSet, this.options);
    }
  }

  /**
   * update layer
   * @param time
   * @private
   */
  _canvasUpdate (time) {
    this.render(time);
  }

  /**
   * point in path
   * @param pixel
   * @returns {*}
   */
  isPointInPath (pixel) {
    const context = this.getContext();
    const data = this.options.data.getData();
    const devicePixelRatio = getDevicePixelRatio();
    for (let i = 0; i < data.length; i++) {
      context.beginPath();
      pathSimple.draw(context, data[i], this.options);
      const x = pixel[0] * devicePixelRatio;
      const y = pixel[1] * devicePixelRatio;
      /* eslint-disable */
      if (context.isPointInPath(x, y) || context.isPointInStroke && context.isPointInStroke(x, y)) {
        return data[i];
      }
    }
  }

  /**
   * init event
   * @private
   */
  _initEvent () {
    const _map = this.getMap();
    if (!_map) return;
    _map.on('pointerdown', this._pointerDownEvent, this);
    _map.on('pointermove', this._pointerMoveEvent, this);
  }

  /**
   * handle click/pointerdown
   * @param event
   */
  _pointerDownEvent (event) {
    const pixel = event.pixel;
    const dataItem = this.isPointInPath(pixel);
    if (dataItem) {
      this.dispatchEvent({
        type: 'pointermove',
        target: this,
        event: event,
        data: dataItem
      });
    }
  }

  /**
   * handle mousemove / pointermove
   * @param event
   */
  _pointerMoveEvent (event) {
    const pixel = event.pixel;
    const dataItem = this.isPointInPath(pixel);
    if (dataItem) {
      this.setDefaultCursor('pointer', dataItem);
      this.dispatchEvent({
        type: 'pointermove',
        target: this,
        event: event,
        data: dataItem
      });
    } else {
      this.setDefaultCursor();
    }
  }

  /**
   * set map
   * @param map
   */
  setMap (map) {
    ol.layer.Image.prototype.setMap.call(this, map);
  }

  /**
   * get map
   */
  getMap () {
    return this.get('map')
  }

  /**
   * set map cursor
   * @param cursor
   * @param feature
   */
  setDefaultCursor (cursor, feature) {
    if (!this.getMap()) return;
    const element = this.getMap().getTargetElement();
    if (feature) {
      if (element.style.cursor !== cursor) {
        this.previousCursor_ = element.style.cursor;
        element.style.cursor = cursor
      }
    } else if (this.previousCursor_ !== undefined) {
      element.style.cursor = this.previousCursor_;
      this.previousCursor_ = undefined;
    }
  }
}

export default Layer;
