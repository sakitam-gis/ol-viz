import { initShaders, getColorData } from '../../helper';

const vs_s = [ // eslint-disable-line
  'attribute vec4 a_Position;',
  'attribute float a_PointSize;',
  'void main() {',
  'gl_Position = a_Position;',
  'gl_PointSize = a_PointSize;',
  '}'
].join('');

const fs_s = [ // eslint-disable-line
  'precision mediump float;',
  'uniform vec4 u_FragColor;',
  'void main() {',
  'gl_FragColor = u_FragColor;',
  '}'
].join('');

let colored;

function render (gl, data, that) {
  if (!data) return;
  const map = that.getMap();
  const program = initShaders(gl, vs_s, fs_s);
  const a_Position = gl.getAttribLocation(program, 'a_Position'); // eslint-disable-line
  const a_PointSize = gl.getAttribLocation(program, 'a_PointSize'); // eslint-disable-line
  const uFragColor = gl.getUniformLocation(program, 'u_FragColor');
  // gl.clearColor(0.0, 0.0, 1.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  const halfCanvasWidth = gl.canvas.width / 2;
  const halfCanvasHeight = gl.canvas.height / 2;
  const verticesData = [];
  let [count, i, length] = [0, 0, data.length];
  for (; i < length; i++) {
    const item = map.getPixelFromCoordinate(data[i].geometry.coordinates);
    const x = (item[0] - halfCanvasWidth) / halfCanvasWidth;
    const y = (halfCanvasHeight - item[1]) / halfCanvasHeight;
    if (x < -1 || x > 1 || y < -1 || y > 1) {
      continue;
    }
    verticesData.push(x, y);
    count++;
  }
  const vertices = new Float32Array(verticesData);
  const n = count; // The number of vertices
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.vertexAttrib1f(a_PointSize, that.options._size);
  if (!colored) {
    colored = getColorData(that.options.fillStyle || 'red');
  }
  gl.uniform4f(uFragColor,
    colored[0] / 255,
    colored[1] / 255,
    colored[2] / 255,
    colored[3] / 255);
  gl.drawArrays(gl.POINTS, 0, n);
}

export default render
