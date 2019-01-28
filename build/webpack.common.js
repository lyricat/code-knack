var path = require('path');
var webpack = require('webpack');

module.exports = {
  entry: [
    'babel-polyfill',
    './assets/scss/code-knack.scss',
    './src/knack.js',
    'webpack-dev-server/client?http://localhost:8080'
  ],
  output: {
    path: path.join(process.cwd(), 'dist'),
    publicPath: '/',
    filename: 'code-knack.min.js'
  },
  devtool: 'source-map',
  module: {
    rules:[
      { 
        test: /\.js$/,
        include: path.join(__dirname, 'src'),
        loader: 'babel-loader',
        type: 'javascript/auto',
        exclude: /node_modules/,
        options: {
          presets: ['es2015', 'env']
        }
      },
      { 
        test: /\.scss$/,
        loader: ['style-loader', 'css-loader', 'sass-loader']
      },
    ]
  },
  devServer: {
    contentBase: './src'
  }
}
