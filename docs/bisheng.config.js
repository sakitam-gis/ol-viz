module.exports = {
  source: './docs/post',
  output: './_site',
  theme: 'bisheng-theme-one',
  plugins: [],
  port: 3333,
  webpackConfig (config) {
    return config;
  },
  root: '/ol-viz/'
};
