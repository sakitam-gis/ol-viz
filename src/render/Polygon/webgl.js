import { getColorData } from '../../helper';
import {
  createProgram,
  createBuffer,
  enableVertexAttrib,
} from '../../helper/gl-utils';

import vertex from '../../shader/line.vertex.glsl'
import fragment from '../../shader/line.fragment.glsl'

function render(gl, data, that) {
  if (!data) return;
  let colored
  const map = that.getMap();
  const { program, color, size } = createProgram(gl, vertex, fragment);
  gl.clear(gl.COLOR_BUFFER_BIT);
  const halfCanvasWidth = gl.canvas.width / 2;
  const halfCanvasHeight = gl.canvas.height / 2;
  createBuffer(gl, true);
  enableVertexAttrib(gl, program, [
    ['a_position', 2],
  ]);
  gl.vertexAttrib1f(size, that.options._size)
  if (!colored) {
    colored = getColorData(that.options.fillStyle || 'red');
  }
  gl.uniform4f(color,
    colored[0] / 255,
    colored[1] / 255,
    colored[2] / 255,
    colored[3] / 255);

  gl.lineWidth(that.options.lineWidth || 1);

  const { length } = data;
  let [i] = [0, 0];
  for (; i < length; i++) {
    const verticesData = [];
    const coords = data[i].geometry.coordinates;
    for (let j = 0; j < coords.length; j++) {
      const item = map.getPixelFromCoordinate(coords[j]);
      const x = (item[0] - halfCanvasWidth) / halfCanvasWidth;
      const y = (halfCanvasHeight - item[1]) / halfCanvasHeight;
      if (x >= -1 && x <= 1 && y >= -1 && y <= 1) {
        verticesData.push(x, y);
      }
    }
    const vertices = new Float32Array(verticesData);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.drawArrays(gl.LINE_STRIP, 0, coords.length);
  }
}

export default render
