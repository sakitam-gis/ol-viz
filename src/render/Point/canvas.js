function render(context, data, that) {
  const map = that.getMap();
  const symbol = that.options.symbol || 'circle';
  const size = data._size || data.size || that.options._size || that.options.size || 5;
  context.save();
  context.beginPath();
  let i = 0, len = data.length; // eslint-disable-line
  for (; i < len; i++) {
    const coordinates = map.getPixelFromCoordinate(data[i].geometry.coordinates);
    if (symbol === 'point') {
      context.moveTo(coordinates[0], coordinates[1]);
      context.arc(coordinates[0], coordinates[1], size, 0, Math.PI * 2);
    } else if (symbol === 'circle') {
      context.arc(coordinates[0], coordinates[1], size, 0, Math.PI * 2);
    } else if (symbol === 'rect') {
      context.rect(coordinates[0] - size / 2, coordinates[1] - size / 2, size, size);
    }
  }
  context.fill();
  context.restore();
}

export default render;
