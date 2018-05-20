precision mediump float;

// 从缓冲中获取的数据
attribute vec4 a_position;
attribute float size;

// scale of current zoom
uniform float u_scale;

void main() {
  // vec4 pos = vec4(a_position.x + textOffset.x * u_scale, a_position.y + textOffset.y * u_scale, a_position.z, a_position.w);
  gl_Position = a_position;
  gl_PointSize = size;
}
