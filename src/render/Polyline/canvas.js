function _drawLineString(context, coordinates, map) {
  for (let i = 0; i < coordinates.length; i++) {
    const pixel = map.getPixelFromCoordinate(coordinates[i]);
    if (i === 0) {
      context.moveTo(pixel[0], pixel[1]);
    } else {
      context.lineTo(pixel[0], pixel[1]);
    }
  }
}

function render(context, data, that) {
  const map = that.getMap();
  context.save();
  context.beginPath();
  context.stroke();
  context.lineWidth = that.options.lineWidth;
  context.strokeStyle = that.options.strokeStyle;
  context.stroke();
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const { strokeStyle } = item.properties || {};
    const { coordinates } = item.geometry;
    const { type } = item.geometry;
    context.save();
    if (strokeStyle) {
      context.strokeStyle = strokeStyle;
    }
    context.beginPath();
    if (type === 'LineString') {
      _drawLineString(context, coordinates, map);
    } else if (type === 'MultiLineString') {
      for (let j = 0; j < coordinates.length; j++) {
        const LineString = coordinates[j];
        _drawLineString(context, LineString, map);
      }
    }
    context.stroke();
    context.restore();
  }
  context.restore();
}

export default render;
