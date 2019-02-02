const webpack = require('webpack');
const Merge = require('webpack-merge');
const CommonConfig = require('./webpack.common.js');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = Merge(CommonConfig, {
  mode: 'production',
  plugins: [
    new TerserPlugin()
  ]
});