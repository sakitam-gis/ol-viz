import pathSimple from '../path/simple';
import DataSheet from '../../data/DataSheet';

export default {
  draw: function (context, dataSet, options) {
    const data = dataSet instanceof DataSheet ? dataSet.getData() : dataSet;
    context.save();
    for (let key in options) {
      context[key] = options[key];
    }
    if (options.bigData) {
      context.save();
      context.beginPath();
      let item;
      for (let i = 0, len = data.length; i < len; i++) {
        item = data[i];
        pathSimple.draw(context, item, options);
      }
      let type = options.bigData;
      if (type === 'Point' || type === 'Polygon' || type === 'MultiPolygon') {
        context.fill();
        if ((item.strokeStyle || options.strokeStyle) && options.lineWidth) {
          context.stroke();
        }
      } else if (type === 'LineString') {
        context.stroke();
      }
      context.restore();
    } else {
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        context.save();
        if (item.fillStyle || item._fillStyle) {
          context.fillStyle = item.fillStyle || item._fillStyle;
        }
        if (item.strokeStyle || item._strokeStyle) {
          context.strokeStyle = item.strokeStyle || item._strokeStyle;
        }
        let type = item.geometry.type;
        context.beginPath();
        pathSimple.draw(context, item, options);
        if (type === 'Point' || type === 'Polygon' || type === 'MultiPolygon') {
          context.fill();
          if ((item.strokeStyle || options.strokeStyle) && options.lineWidth) {
            context.stroke();
          }
        } else if (type === 'LineString') {
          if (item.lineWidth || item._lineWidth) {
            context.lineWidth = item.lineWidth || item._lineWidth;
          }
          context.stroke();
        }
        context.restore();
      }
    }
    context.restore();
  }
}
