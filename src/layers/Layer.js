import ImageLayer from 'ol/layer/Image';
import ImageCanvas from 'ol/source/ImageCanvas';
import TWEEN from '@tweenjs/tween.js';
import PointGlRender from '../render/Point/webgl'
import PointRender from '../render/Point/canvas';
import LineRender from '../render/Polyline/canvas';
import LineGlRender from '../render/Polyline/webgl';
import {
  createCanvas, clearRect, scaleCanvas,
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
     * canvas & webgl context
     * @type {null}
     */
    this.context = null;

    /**
     * animate
     * @type {null}
     * @private
     */
    this.animationLoop = null;

    this.canvasFunction = this.canvasFunction.bind(this);
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
        canvasFunction: this.canvasFunction,
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
      this.animator && this.animator.stop(); // eslint-disable-line
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
      if ((this.canvas.width !== width || this.canvas.height !== height) && this.context) {
        scaleCanvas(this.context, size, this.get('context'));
      }
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
    if (!this.context) {
      this.context = createContext(this.canvas, this.get('context'), glOptions);
    }
    if (!this.isRenderer) {
      this.isRenderer = true;
      // this.initAnimator();
    }
    if (this.isEnabledTime()) {
      if (time === undefined) {
        clearRect(this.context, this.get('context'));
        return this;
      }
      if (this.get('context') === '2d') {
        this.context.save();
        this.context.globalCompositeOperation = 'destination-out';
        this.context.fillStyle = 'rgba(0, 0, 0, .1)';
        this.context.fillRect(0, 0, this.context.canvas.width, this.context.canvas.height);
        this.context.restore();
      }
    } else {
      clearRect(this.context, this.get('context'));
    }

    if (this.get('context') === '2d') {
      Object.keys(this.options).forEach(key => {
        if (keys.indexOf(key) > -1) {
          this.context[key] = this.options[key];
        }
      })
    } else {
      this.context.clear(this.context.COLOR_BUFFER_BIT);
    }

    this.drawContext(this.context, this.options.data, this.options, { x: 0, y: 0 });
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
      case 'Point':
        if (this.get('context') === 'webgl') {
          PointGlRender(context, data, this);
        } else {
          PointRender(context, data, this);
        }
        break;
      case 'LineString':
        if (this.get('context') === 'webgl') {
          LineGlRender(context, data, this);
        } else {
          LineRender(context, data, this);
        }
        break;
      default:
        console.warn('不存在的类型！'); // eslint-disable-line
    }
  }

  /**
   * update layer
   * @param time
   * @private
   */
  canvasUpdate(time) {
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
