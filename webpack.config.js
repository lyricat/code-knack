module.exports = function(env) {
  return require(`./build/webpack.${env}.js`)
}