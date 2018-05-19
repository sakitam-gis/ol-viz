import ImageLayer from 'ol/layer/Image';
import ImageCanvas from 'ol/source/ImageCanvas';
import TWEEN from '@tweenjs/tween.js';
import GlRender from '../render/Point/webgl'
import Render from '../render/Point/canvas';
import {
  createCanvas, clearRect,
  getDevicePixelRatio, createContext,
} from '../helper';

const keys = [
  'fillStyle',
];

const glOptions = {
  alpha: true,
  antialias: true,
  preserveDrawingBuffer: true,
};

class Layer extends ImageLayer {
  constructor(map, options = {}) {
    super(options);
    if (map) {
      this.setMap(map);
    }

    /**
     * 是否已经添加到地图
     * @type {boolean}
     * @private
     */
    this.isAdd = true;

    /**
     * this canvas
     * @type {null}
     * @private
     */
    this.canvas = null;

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
    this.isRenderer = false;

    /**
     * 默认鼠标样式
     * @type {string}
     * @private
     */
    this.previousCursor = '';

    /**
     * animate
     * @type {null}
     * @private
     */
    this.animationLoop = null;

    this.animatorMovestartEvent = this.animatorMovestartEvent.bind(this);
    this.animatorMoveendEvent = this.animatorMoveendEvent.bind(this);
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
        ratio: options.hasOwnProperty('ratio') ? options.ratio : getDevicePixelRatio(),
      }),
    );
  }

  /**
   * 是否允许补间动画
   * @returns {*|boolean}
   */
  isEnabledTime() {
    const animationOptions = this.options.animation;
    return (
      animationOptions
      && !(animationOptions.enabled === false)
    );
  }

  /**
   * animator
   */
  initAnimator() {
    const that = this;
    const animationOptions = this.options.animation;
    if (this.options.draw === 'time' || this.isEnabledTime()) {
      if (!animationOptions.stepsRange) {
        animationOptions.stepsRange = {
          start: 0,
          end: 0,
        }
      }
      this.steps = { step: animationOptions.stepsRange.start };
      this.animator = new TWEEN.Tween(that.steps).onUpdate((event) => {
        that.canvasUpdate(event.step);
      }).repeat(Infinity);
      this.addAnimatorEvent();
      const duration = animationOptions.duration * 1000 || 5000;
      this.animator.to({ step: animationOptions.stepsRange.end }, duration);
      this.animator.start();
    } else {
      this.animator.stop();
    }
    (function frame() {
      that.animationLoop = window.requestAnimFrame(frame);
      TWEEN.update()
    }());
  }

  /**
   * add animator event
   */
  addAnimatorEvent() {
    const map = this.getMap();
    if (!map) return;
    map.on('movestart', this.animatorMovestartEvent);
    map.on('moveend', this.animatorMoveendEvent);
  }

  /**
   * handle movestart event
   * @private
   */
  animatorMovestartEvent() {
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
  animatorMoveendEvent() {
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
   * @returns {*}
   */
  canvasFunction(extent, resolution, pixelRatio, size) {
    if (!this.canvas) {
      this.canvas = createCanvas(size[0], size[1])
    } else {
      const [width, height] = size;
      this.canvas.width = width;
      this.canvas.height = height;
    }
    if (this.isAdd) {
      this.render()
    } else {
      // console.warn('超出所设置最大分辨率！')
    }
    return this.canvas
  }

  /**
   * render layer
   * @param time
   * @returns {Layer}
   */
  render(time) {
    const context = createContext(this.canvas, this.get('context'), glOptions);
    if (!this.isRenderer) {
      this.isRenderer = true;
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
      Object.keys(this.options).forEach(key => {
        if (keys.indexOf(key) > -1) {
          context[key] = this.options[key];
        }
      })
    } else {
      context.clear(context.COLOR_BUFFER_BIT);
    }

    this.drawContext(context, this.options.data, this.options, { x: 0, y: 0 });
    this.dispatchEvent({
      type: 'render',
      target: this,
      time,
    });
    return this;
  }

  /**
   * draw context
   * @param context
   * @param data
   */
  drawContext(context, data) {
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
  _canvasUpdate(time) {
    this.render(time);
  }

  /**
   * set map
   * @param map
   */
  setMap(map) {
    this.set('_origin_map_', map);
    this.isAdd = true;
    super.setMap(map);
  }

  /**
   * get map
   */
  getMap() {
    return this.get('_origin_map_')
  }

  /**
   * set map cursor
   * @param cursor
   * @param feature
   */
  setDefaultCursor(cursor, feature) {
    if (!this.getMap()) return;
    const element = this.getMap().getTargetElement();
    if (feature) {
      if (element.style.cursor !== cursor) {
        this.previousCursor = element.style.cursor;
        element.style.cursor = cursor
      }
    } else if (this.previousCursor !== undefined) {
      element.style.cursor = this.previousCursor;
      this.previousCursor = undefined;
    }
  }
}

export default Layer;
