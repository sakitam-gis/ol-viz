import { getColorData } from '../../helper';
import {
  createProgram,
  createBuffer,
  enableVertexAttrib,
} from '../../helper/gl-utils';

import vertex from '../../shader/point.vertex.glsl'
import fragment from '../../shader/point.fragment.glsl'

function render(gl, data, that) {
  if (!data) return;
  let colored
  const map = that.getMap();
  const { program, color, size } = createProgram(gl, vertex, fragment);
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
      verticesData.push(x, y, i);
      count++;
    }
  }
  const vertices = new Float32Array(verticesData);
  createBuffer(gl, true);
  enableVertexAttrib(gl, program, [
    ['a_position', 2],
  ]);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  // gl.uniformMatrix4fv(program.u_matrix, false, m);
  // gl.uniform1f(program.u_scale, 1);
  gl.vertexAttrib1f(size, that.options._size)
  if (!colored) {
    colored = getColorData(that.options.fillStyle || 'red');
  }
  gl.uniform4f(color,
    colored[0] / 255,
    colored[1] / 255,
    colored[2] / 255,
    colored[3] / 255)
  gl.drawArrays(gl.POINTS, 0, count);
}

export default render
