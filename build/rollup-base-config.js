// Config file for running Rollup in "normal" mode (non-watch)
const babel = require('rollup-plugin-babel'); // ES2015 tran
const json = require('rollup-plugin-json');
const cjs = require('rollup-plugin-commonjs');
const nodeResolve = require('rollup-plugin-node-resolve');
const replace = require('rollup-plugin-replace');
const glslify = require('rollup-plugin-glslify');
const { eslint } = require('rollup-plugin-eslint');
const friendlyFormatter = require('eslint-friendly-formatter');
const _package = require('../package.json');
const { handleMinEsm, resolve } = require('./helper');

const time = new Date();
const year = time.getFullYear();
const banner = `/*!\n * author: ${_package.author} 
 * ${_package.name} v${_package.version}
 * build-time: ${year}-${time.getMonth() + 1}-${time.getDate()} ${time.getHours()}:${time.getMinutes()}
 * LICENSE: ${_package.license}
 * (c) 2017-${year} ${_package.homepage}\n */`;

const genConfig = (opts) => {
  const config = {
    input: {
      input: resolve('src/index.js'),
      plugins: [
        eslint({
          throwOnWarning: false,
          configFile: resolve('.eslintrc.js'),
          formatter: friendlyFormatter,
          exclude: [resolve('node_modules')]
        }),
        json({
          include: resolve('package.json'),
          indent: ' '
        }),
        glslify({ basedir: 'src/shader' }),
        babel({
          babelrc: false,
          presets: [
            ['@babel/env', {
              targets: {
                browsers: ['> 1%', 'last 2 versions', 'not ie <= 8'],
              },
              loose: true,
              modules: false,
            }]
          ],
          plugins: ['@babel/external-helpers'],
          externalHelpers: true,
          ignore: [
            'dist/*.js',
          ],
          comments: false,
          exclude: [
            resolve('package.json'),
            resolve('node_modules/**')
          ] // only transpile our source code
        }),
        nodeResolve({
          jsnext: true,
          main: true,
          browser: true
        }),
        cjs()
      ],
      external: ['ol']
    },
    output: {
      file: opts.file,
      format: opts.format,
      banner,
      name: _package.namespace
    }
  }
  if (opts.env) {
    config.input.plugins.unshift(replace({
      'process.env.NODE_ENV': JSON.stringify(opts.env)
    }))
  }
  return config
};
module.exports = [
  {
    file: resolve(_package.unpkg),
    format: 'umd',
    env: 'development'
  },
  {
    file: resolve(handleMinEsm(_package.unpkg)),
    format: 'umd',
    env: 'production'
  },
  {
    file: resolve(_package.main),
    format: 'cjs'
  },
  {
    file: resolve(_package.module),
    format: 'es'
  }
].map(genConfig)
