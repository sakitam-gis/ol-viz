import DataSet from './DataSet';

export default {
  getDataSet: function (geoJson) {
    const data = [];
    const features = geoJson.features;
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      const geometry = feature.geometry;
      const properties = feature.properties;
      const item = {};
      for (let key in properties) {
        item[key] = properties[key];
      }
      item.geometry = geometry;
      data.push(item);
    }
    return new DataSet(data);
  }
}
