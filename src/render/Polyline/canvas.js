function render(context, data, that) {
  const map = that.getMap();
  context.save();
  context.beginPath();
  context.stroke();
  context.lineWidth = that.options.lineWidth;
  context.strokeStyle = that.options.strokeStyle;
  context.stroke();
  let i = 0, len = data.length; // eslint-disable-line
  for (; i < len; i++) {
    const properties = data[i].properties || {};
    const { coordinates } = data[i].geometry;
    for (let j = 0; j < coordinates.length; j++) {
      const coords = map.getPixelFromCoordinate(coordinates[j]);
      if (j === 0) {
        context.moveTo(...coords);
      } else {
        context.lineTo(...coords);
      }
    }
    if (properties.lineWidth) {
      context.save();
      context.lineWidth = that.options.lineWidth;
      context.stroke();
      context.restore();
    }
    if (properties.strokeStyle) {
      context.save();
      context.strokeStyle = that.options.strokeStyle;
      context.stroke();
      context.restore();
    }
  }
  context.restore();
}

export default render;
