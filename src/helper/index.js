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
  textBaseline: 'alphabetic',
};

/**
 * core create canvas
 * @param width
 * @param height
 * @returns {HTMLElement}
 */
const createCanvas = (width, height) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

/**
 * handle webgl content error
 * @param error
 */
function onContextCreationError(error) {
  console.log(error.statusMessage); // eslint-disable-line
}

/**
 * 创建图形绘制上下文
 * @param canvas
 * @param type
 * @param glOptions
 * @returns {*}
 */
const createContext = (canvas, type, glOptions = {}) => {
  if (!canvas) return null;
  let context = null;
  if (type === '2d') {
    context = canvas.getContext('2d');
    if (!context._merge_ && CONTEXT_CONFIG) {
      Object.keys(CONTEXT_CONFIG).forEach(key => {
        context[key] = CONTEXT_CONFIG[key]
      })
      context._merge_ = true;
    }
  } else if (type === 'webgl') {
    canvas.addEventListener('webglcontextcreationerror', onContextCreationError, false);
    context = canvas.getContext('webgl2', glOptions);
    context = context || canvas.getContext('experimental-webgl2', glOptions);
    if (!context) {
      context = canvas.getContext('webgl', glOptions);
      context = context || canvas.getContext('experimental-webgl', glOptions);
    }
    canvas.removeEventListener('webglcontextcreationerror', onContextCreationError, false);
  }
  return context;
};

/**
 * get pixel ratio
 * @returns {number}
 */
const getDevicePixelRatio = () => window.devicePixelRatio || 1;

/**
 * scale canvas
 * @param context
 */
const scaleCanvas = context => {
  const devicePixelRatio = getDevicePixelRatio();
  context.canvas.width *= devicePixelRatio;
  context.canvas.height *= devicePixelRatio;
  context.canvas.style.width = `${context.canvas.width / devicePixelRatio}px`;
  context.canvas.style.height = `${context.canvas.height / devicePixelRatio}px`;
  context.scale(devicePixelRatio, devicePixelRatio);
};

/**
 * 清空画布
 * @param context
 * @param type
 */
const clearRect = (context, type) => {
  if (!context) return;
  if (type === '2d') {
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  } else if (type === 'webgl') {
    context.clear(context.COLOR_BUFFER_BIT | context.DEPTH_BUFFER_BIT); // eslint-disable-line
  }
};


/**
 * bind
 * @param fn
 * @param context
 * @param args
 * @returns {Function}
 */
function bind(fn, context, ...args) {
  return function () { // eslint-disable-line
    return fn.apply(context, args);
  };
}

const createShader = (gl, src, type) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  return shader;
};

const initShaders = (gl, vs_source, fs_source) => { // eslint-disable-line
  const vertexShader = createShader(gl, vs_source, gl.VERTEX_SHADER);
  const fragmentShader = createShader(gl, fs_source, gl.FRAGMENT_SHADER);
  const glProgram = gl.createProgram();
  gl.attachShader(glProgram, vertexShader);
  gl.attachShader(glProgram, fragmentShader);
  gl.linkProgram(glProgram);
  gl.useProgram(glProgram);
  return glProgram;
};

const getColorData = (color) => {
  const ctx = createCanvas(1, 1).getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  return ctx.getImageData(0, 0, 1, 1).data;
};

export {
  bind,
  clearRect,
  initShaders,
  createCanvas,
  scaleCanvas,
  createShader,
  createContext,
  getColorData,
  getDevicePixelRatio,
}
