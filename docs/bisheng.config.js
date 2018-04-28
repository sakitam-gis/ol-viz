var path = require('path');

module.exports = {
  source: ['./docs/post', 'CHANGELOG.md'],
  output: './_site',
  theme: './docs/theme',
  entry: {
    index: {
      theme: './docs/theme',
      htmlTemplate: './docs/theme/static/template.html'
    }
  },
  plugins: [
    'bisheng-plugin-react?lang=__react',
    'bisheng-plugin-antd'
  ],
  port: 3333,
  webpackConfig (config) {
    config.resolve.alias = {
      'react-router': 'react-router/umd/ReactRouter'
    };
    return config;
  },
  root: '/ol-viz/'
};
