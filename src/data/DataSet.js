function DataSet (data, options) {
  this._options = options || {};
  this._data = []; // layer with data indexed by id
  if (data) {
    this.add(data);
  }
}

/**
 * Add data.
 */
DataSet.prototype.add = function (data, senderId) {
  if (Array.isArray(data)) {
    for (let i = 0, len = data.length; i < len; i++) {
      if (data[i].time && data[i].time.length === 14 && data[i].time.substr(0, 2) === '20') {
        let time = data[i].time;
        data[i].time = new Date(time.substr(0, 4) + '-' + time.substr(4, 2) + '-' + time.substr(6, 2) + ' ' + time.substr(8, 2) + ':' + time.substr(10, 2) + ':' + time.substr(12, 2)).getTime();
      }
      this._data.push(data[i]);
    }
  } else if (data instanceof Object) {
    this._data.push(data);
  } else {
    throw new Error('Unknown dataType');
  }
  this._dataCache = JSON.parse(JSON.stringify(this._data));
};

/**
 * reset data
 */
DataSet.prototype.reset = function () {
  this._data = JSON.parse(JSON.stringify(this._dataCache));
};

/**
 * get data.
 */
DataSet.prototype.get = function (args) {
  args = args || {};
  let data = this._data;
  if (args.filter) {
    let newData = [];
    for (let i = 0; i < data.length; i++) {
      if (args.filter(data[i])) {
        newData.push(data[i]);
      }
    }
    data = newData;
  }
  if (args.transferCoordinate) {
    data = this.transferCoordinate(data, args.transferCoordinate, args.fromColumn, args.toColumn);
  }
  return data;
};

DataSet.prototype.transferCoordinate = function (data, transferFn, fromColumn, toColumnName) {
  toColumnName = toColumnName || '_coordinates';
  fromColumn = fromColumn || 'coordinates';
  for (let i = 0; i < data.length; i++) {
    const geometry = data[i].geometry;
    const coordinates = geometry[fromColumn];
    let _coordinates = [];
    switch (geometry.type) {
      case 'Point':
        geometry[toColumnName] = transferFn(coordinates);
        break;
      case 'LineString':
        for (let j = 0; j < coordinates.length; j++) {
          _coordinates.push(transferFn(coordinates[j]));
        }
        geometry[toColumnName] = _coordinates;
        break;
      case 'Polygon':
        _coordinates = getPolygon(coordinates);
        geometry[toColumnName] = _coordinates;
        break;
      case 'MultiPolygon':
        for (let c = 0; c < coordinates.length; c++) {
          _coordinates.push(getPolygon(coordinates[c]));
        }
        geometry[toColumnName] = _coordinates;
        break;
    }
  }
  function getPolygon (coordinates) {
    let newCoordinates = [];
    for (let c = 0; c < coordinates.length; c++) {
      let coordinate = coordinates[c];
      let newcoordinate = [];
      for (let j = 0; j < coordinate.length; j++) {
        newcoordinate.push(transferFn(coordinate[j]));
      }
      newCoordinates.push(newcoordinate);
    }
    return newCoordinates;
  }
  return data;
};

/**
 * set data.
 */
DataSet.prototype.set = function (data) {
  this._set(data);
};

/**
 * set data.
 */
DataSet.prototype._set = function (data) {
  this.clear();
  this.add(data);
};

/**
 * clear data.
 */
DataSet.prototype.clear = function (args) {
  this._data = []; // layer with data indexed by id
};

/**
 * 获取当前列的最大值
 */
DataSet.prototype.getMax = function (columnName) {
  let data = this._data;
  if (!data || data.length <= 0) {
    return;
  }
  let max = parseFloat(data[0][columnName]);
  for (let i = 1; i < data.length; i++) {
    let value = parseFloat(data[i][columnName]);
    if (value > max) {
      max = value;
    }
  }
  return max;
};

/**
 * 获取当前列的总和
 */
DataSet.prototype.getSum = function (columnName) {
  var data = this._data;
  if (!data || data.length <= 0) {
    return;
  }
  var sum = 0;
  for (var i = 0; i < data.length; i++) {
    if (data[i][columnName]) {
      sum += parseFloat(data[i][columnName]);
    }
  }
  return sum;
};

/**
 * 获取当前列的最小值
 */
DataSet.prototype.getMin = function (columnName) {
  const data = this._data;
  if (!data || data.length <= 0) {
    return;
  }
  let min = parseFloat(data[0][columnName]);
  for (let i = 1; i < data.length; i++) {
    let value = parseFloat(data[i][columnName]);
    if (value < min) {
      min = value;
    }
  }
  return min;
};

/**
 * 获取去重的数据
 */
DataSet.prototype.getUnique = function (columnName) {
  const data = this._data || [];
  if (!data || data.length <= 0) {
    return;
  }
  const maps = {};
  for (let i = 1; i < data.length; i++) {
    maps[data[i][columnName]] = true;
  }
  for (let key in maps) {
    data.push(key);
  }
  return data;
};

export default DataSet;
