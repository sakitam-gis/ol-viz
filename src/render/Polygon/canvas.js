function _drawPolygon(context, coordinates, map) {
  let [pixel, pixel_] = [];
  for (let i = 0; i < coordinates.length; i++) {
    const coordinate = coordinates[i];
    pixel = map.getPixelFromCoordinate(coordinate[0]);
    context.moveTo(pixel[0], pixel[1]);
    for (let j = 1; j < coordinate.length; j++) {
      pixel_ = map.getPixelFromCoordinate(coordinate[j]);
      context.lineTo(pixel_[0], pixel_[1]);
    }
    context.lineTo(pixel[0], pixel[1]);
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
    const { strokeStyle, fillStyle } = item.properties || {};
    const { coordinates } = item.geometry;
    const { type } = item.geometry;
    context.save();
    if (fillStyle) {
      context.fillStyle = fillStyle;
    }
    if (strokeStyle) {
      context.strokeStyle = strokeStyle;
    }
    context.beginPath();
    if (type === 'Polygon') {
      _drawPolygon(context, coordinates, map);
    } else if (type === 'MultiPolygon') {
      for (let j = 0; j < coordinates.length; j++) {
        const polygon = coordinates[j];
        _drawPolygon(context, polygon, map);
      }
      context.closePath();
    }
    context.fill();
    context.stroke();
    context.restore();
  }
  context.restore();
}

export default render;
