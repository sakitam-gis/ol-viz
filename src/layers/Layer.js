import ImageLayer from 'ol/layer/Image';
import ImageCanvas from 'ol/source/ImageCanvas';
import TWEEN from '@tweenjs/tween.js';
import GlRender from '../render/Point/webgl'
import Render from '../render/Point/canvas';
import {
  createCanvas, clearRect,
  getDevicePixelRatio, createContext
} from '../helper';

const keys = [
  'fillStyle'
];

const glOptions = {
  alpha: true,
  antialias: true,
  preserveDrawingBuffer: true
};

class Layer extends ImageLayer {
  constructor (map, options = {}) {
    super(options);
    if (map) {
      this.setMap(map);
    }

    /**
     * 是否已经添加到地图
     * @type {boolean}
     * @private
     */
    this._isAdd = true;

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

    this.setSource(
      new ImageCanvas({
        logo: options.logo,
        state: options.state,
        attributions: options.attributions,
        resolutions: options.resolutions,
        canvasFunction: this.canvasFunction.bind(this),
        projection: options.hasOwnProperty('projection')
          ? options.projection
          : 'EPSG:3857',
        ratio: options.hasOwnProperty('ratio') ? options.ratio : getDevicePixelRatio()
      })
    );
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
          start: 0,
          end: 0
        }
      }
      this.steps = { step: animationOptions.stepsRange.start };
      this.animator = new TWEEN.Tween(that.steps).onUpdate(function (event) {
        that._canvasUpdate(event.step);
      }).repeat(Infinity);
      this.addAnimatorEvent();
      const duration = animationOptions.duration * 1000 || 5000;
      this.animator.to({ step: animationOptions.stepsRange.end }, duration);
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
    if (this._isAdd) {
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
    const context = createContext(this._canvas, this.get('context'), glOptions);
    if (!this._isRenderer) {
      this._isRenderer = true;
      this.initAnimator();
    }
    if (this.isEnabledTime()) {
      if (time === undefined) {
        clearRect(context, this.get('context'));
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
      clearRect(context, this.get('context'));
    }

    if (this.get('context') === '2d') {
      for (const key in this.options) {
        if (keys.indexOf(key) > -1) {
          context[key] = this.options[key];
        }
      }
    } else {
      context.clear(context.COLOR_BUFFER_BIT);
    }

    this.drawContext(context, this.options.data, this.options, { x: 0, y: 0 });
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
   * @param data
   * @param options
   * @param nwPixel
   */
  drawContext (context, data, options, nwPixel) {
    switch (this.options.draw) {
      default:
        if (this.get('context') === 'webgl') {
          GlRender(context, data, this);
        } else {
          Render(context, data, this);
        }
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
   * set map
   * @param map
   */
  setMap (map) {
    console.log(map);
    this.set('_origin_map_', map);
    this._isAdd = true;
    super.setMap(map);
  }

  /**
   * get map
   */
  getMap () {
    return this.get('_origin_map_')
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
