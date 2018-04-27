import DataSheet from '../../data/DataSheet';

export default {
  drawDataSet: function (context, dataSet, options) {
    const data = dataSet instanceof DataSheet ? dataSet.get() : dataSet;
    for (let i = 0, len = data.length; i < len; i++) {
      let item = data[i];
      this.draw(context, item, options);
    }
  },
  draw: function (context, data, options) {
    let type = data.geometry.type;
    let coordinates = data.geometry._coordinates || data.geometry.coordinates;
    let symbol = options.symbol || 'circle';
    switch (type) {
      case 'Point':
        let size = data._size || data.size || options._size || options.size || 5;
        if (symbol === 'circle') {
          if (options.bigData === 'Point') {
            context.moveTo(coordinates[0], coordinates[1]);
          }
          context.arc(coordinates[0], coordinates[1], size, 0, Math.PI * 2);
        } else if (symbol === 'rect') {
          context.rect(coordinates[0] - size / 2, coordinates[1] - size / 2, size, size);
        }
        break;
      case 'LineString':
        for (let j = 0; j < coordinates.length; j++) {
          let x = coordinates[j][0];
          let y = coordinates[j][1];
          if (j === 0) {
            context.moveTo(x, y);
          } else {
            context.lineTo(x, y);
          }
        }
        break;
      case 'Polygon':
        this.drawPolygon(context, coordinates);
        break;
      case 'MultiPolygon':
        for (let i = 0; i < coordinates.length; i++) {
          let polygon = coordinates[i];
          this.drawPolygon(context, polygon);
        }
        context.closePath();
        break;
      default:
        console.log('type' + type + 'is not support now!');
        break;
    }
  },
  drawPolygon: function (context, coordinates) {
    for (let i = 0; i < coordinates.length; i++) {
      let coordinate = coordinates[i];
      context.moveTo(coordinate[0][0], coordinate[0][1]);
      for (let j = 1; j < coordinate.length; j++) {
        context.lineTo(coordinate[j][0], coordinate[j][1]);
      }
      context.lineTo(coordinate[0][0], coordinate[0][1]);
    }
  }
}
