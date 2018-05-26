precision mediump float;

uniform vec4 color;

//float smoothStep(float x, float y) {
//  return 1.0 / (1.0 + exp(50.0 * (x - y)));
//}

void main() {
  gl_FragColor = color;
}
