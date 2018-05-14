const fs = require('fs');
const path = require('path');
const _package = require('../package.json');
const ExtractTextPlugin = require('mini-css-extract-plugin');
const resolve = _path => path.resolve(__dirname, '..', _path);

const assetsPath = function (_path) {
  return path.posix.join('static', _path);
};

const cssLoaders = function (options) {
  options = options || {};
  const cssLoader = {
    loader: 'css-loader',
    options: {
      sourceMap: options.sourceMap
    }
  };

  const postcssLoader = {
    loader: 'postcss-loader',
    options: {
      sourceMap: options.sourceMap
    }
  };

  // generate loader string to be used with extract text plugin
  function generateLoaders (loader, loaderOptions) {
    const loaders = options.usePostCSS ? [cssLoader, postcssLoader] : [cssLoader];
    if (loader) {
      loaders.push({
        loader: loader + '-loader',
        options: Object.assign({}, loaderOptions, {
          sourceMap: options.sourceMap
        })
      });
    }

    // Extract CSS when that option is specified
    // (which is the case during production build)
    if (options.extract) {
      return [{
        loader: ExtractTextPlugin.loader,
        options: {}
      }].concat(loaders)
    } else {
      return ['style-loader'].concat(loaders);
    }
  }

  return {
    css: generateLoaders(),
    postcss: generateLoaders(),
    less: generateLoaders('less'),
    sass: generateLoaders('sass', { indentedSyntax: true }),
    scss: generateLoaders('sass')
  };
};

const styleLoaders = function (options) {
  const output = [];
  const loaders = cssLoaders(options);
  for (const extension in loaders) {
    const loader = loaders[extension];
    output.push({
      test: new RegExp('\\.' + extension + '$'),
      use: loader
    });
  }
  return output;
};

/**
 * get file size
 * @param code
 * @returns {string}
 */
const getSize = (code) => {
  return (code.length / 1024).toFixed(2) + 'kb'
};
/**
 * print error
 * @param e
 */
const logError = (e) => {
  console.log(e)
};
/**
 * add message color
 * @param str
 * @returns {string}
 */
const blueString = (str) => {
  return '\x1b[1m\x1b[34m' + str + '\x1b[39m\x1b[22m'
};
/**
 * handle min file
 * @param name
 * @returns {string}
 */
const handleMinEsm = name => {
  if (typeof name === 'string') {
    let arr_ = name.split('.')
    let arrTemp = []
    arr_.forEach((item, index) => {
      if (index < arr_.length - 1) {
        arrTemp.push(item)
      } else {
        arrTemp.push('min')
        arrTemp.push(item)
      }
    })
    return arrTemp.join('.')
  }
};
/**
 * check dir exist
 * @param path
 * @param mkdir
 * @returns {boolean}
 */
const checkFolderExist = (path, mkdir) => {
  if (!fs.existsSync(path)) {
    if (mkdir) {
      fs.mkdirSync(path)
    }
    return false
  } else {
    return true
  }
};

module.exports = {
  _package,
  resolve,
  getSize,
  logError,
  assetsPath,
  blueString,
  cssLoaders,
  handleMinEsm,
  styleLoaders,
  checkFolderExist
};
