import { getColorData } from '../../helper';
import { createProgram, createBuffer, bindAttribute } from '../../helper/gl-utils';

const vs_s = [ // eslint-disable-line
  'attribute vec4 a_Position;',
  'attribute float a_PointSize;',
  'void main() {',
  'gl_Position = a_Position;',
  'gl_PointSize = a_PointSize;',
  '}',
].join('');

const fs_s = [ // eslint-disable-line
  'precision mediump float;',
  'uniform vec4 u_FragColor;',
  'void main() {',
  'gl_FragColor = u_FragColor;',
  '}',
].join('');

let colored;

function render(gl, data, that) {
  if (!data) return;
  const map = that.getMap();
  const mixinProgram = createProgram(gl, vs_s, fs_s);
  const { a_Position, a_PointSize, u_FragColor } = mixinProgram; // eslint-disable-line
  gl.clear(gl.COLOR_BUFFER_BIT);
  const halfCanvasWidth = gl.canvas.width / 2;
  const halfCanvasHeight = gl.canvas.height / 2;
  const verticesData = [];
  const { length } = data;
  let [count, i] = [0, 0];
  for (; i < length; i++) {
    const item = map.getPixelFromCoordinate(data[i].geometry.coordinates);
    const x = (item[0] - halfCanvasWidth) / halfCanvasWidth;
    const y = (halfCanvasHeight - item[1]) / halfCanvasHeight;
    if (x >= -1 && x <= 1 && y >= -1 && y <= 1) {
      verticesData.push(x, y);
      count++;
    }
  }
  const vertices = new Float32Array(verticesData);
  createBuffer(gl, vertices, true);
  bindAttribute(gl, null, a_Position, 2);
  gl.vertexAttrib1f(a_PointSize, that.options._size);
  if (!colored) {
    colored = getColorData(that.options.fillStyle || 'red');
  }
  gl.uniform4f(u_FragColor,
    colored[0] / 255,
    colored[1] / 255,
    colored[2] / 255,
    colored[3] / 255);
  gl.drawArrays(gl.POINTS, 0, count);
}

export default render
