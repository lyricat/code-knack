let root = typeof self == 'object' && self.self === self && self || 
typeof global == 'object' && global.global === global && global ||
this || {};

function builtinRead(x) {
  if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined)
      throw "File not found: '" + x + "'";
  return Sk.builtinFiles["files"][x];
}


function Knack (lang, opts) {
  this.setup = function () {
    var self = this
    switch (lang) {
      case 'ruby':
        Opal.load('opal')
        Opal.load('opal-parser')
        break
      case 'python':
        try {
          this.Sk = Sk
          this.Sk.configure({output: function (text) { self.onSkOutput(text) }, read: builtinRead})
        } catch (e) {
          console.log('failed to setup Sk')
        }
        break
      case 'scheme':
        try {
          this.biwa =  new BiwaScheme.Interpreter(this.onBiwaError)
        } catch (e) {
          console.log('failed to setup BiwaScheme')
        }
        break
      default:
        break
    }
    this.consoleBuffer = ''
    this.lang = lang
    this.source = ''
    this.opts = opts
  }
  this.clear = function () {
    this.source = ''
    this.consoleBuffer = ''
  }
  this.attachSource = function (source) {
    this.source += source
  }
  this.hookConsole = function () {
    console._log = console.log
    var self = this
    console.log = function (value) {
      // a workaround for Opal
      self.consoleBuffer += value + (self.lang === 'ruby' ? '' : '\n')
    }
  }
  this.unhookConsole = function () {
    console.log = console._log
  }
  this.onBiwaError = function (e) {
    console.error(e)
  }
  this.onSkOutput = function (value) {
    this.consoleBuffer += value
  }
  this.eval = function () {
    var procMap = {
      'javascript': this.evalJS,
      'typescript': this.evalTypescript,
      'scheme': this.evalScheme,
      'ruby': this.evalRuby,
      'python': this.evalPython,
      'cpp': this.evalCpp,
      'c': this.evalCpp,
    }
    var self = this
    var proc = null
    this.hookConsole()
    if (procMap.hasOwnProperty(this.lang)) {
      // compile and run in browser
      proc = procMap[this.lang]
    } else if (self.opts.mode === 'proxy' && self.opts.proxyUrl) {
      // proxy
      proc = self.evalProxy
    } else {
      // unsupported and not proxied
      return new Promise(function (resolve, reject) {
        self.unhookConsole()
        resolve(self.consoleBuffer)
      })
    }
    var promise = proc.apply(this, [this.source])
    return new Promise(function (resolve, reject) {
      promise.then(function (ret) {
        self.unhookConsole()
        if (self.consoleBuffer.length === 0) {
          if (ret.constructor === Object && ret.toString) {
            self.consoleBuffer += ret.toString()
          } else {
            self.consoleBuffer += ret
          }
        }
        resolve(self.consoleBuffer)
      }).catch(function (err) {
        self.unhookConsole()
        reject(err)
      })
    })
  }
  this.evalCpp = function (source) {
    var self = this
    var config = {
      stdio: {
        write: function (s) { self.consoleBuffer += s }
      }
    }
    var promise = new Promise(function (resolve, reject) {
      var ret = JSCPP.run(source, "", config)
      resolve(ret)
    })
    return promise
  }
  this.evalJS = function (source) {
    var promise = new Promise(function (resolve, reject) {
      var ret = eval(source)
      resolve(ret)
    })
    return promise
  }
  this.evalScheme = function (source) {
    var self = this
    var promise = new Promise(function (resolve, reject) {
      var ret = self.biwa.evaluate(source)
      resolve(ret)
    })
    return promise
  }
  this.evalRuby = function (source) {
    var promise = new Promise(function (resolve, reject) {
      var js = Opal.compile(source)
      var ret = eval(js)
      resolve(ret)
    })
    return promise
  }
  this.evalPython = function (source) {
    var sesPromise = Sk.misceval.asyncToPromise(function() {
      return Sk.importMainWithBody("<stdin>", false, source, true)
    })
    return sesPromise
  }
  this.evalTypescript = function (source) {
    var js = ts.transpile(source)
    return this.evalJS(js)
  }
  this.evalProxy = function (source) {
    var self = this
    var promise = new Promise(function (resolve, reject) {
      axios({
        method: 'post',
        url: self.opts.proxyUrl,
        data: {
          code: source
        }
      }).then(function (resp) {
        if (resp.data.code === 0) {
          resolve(resp.data.data)
        } else {
          reject(resp.data.data)
        }
      }).catch(function (err) {
        reject(err)
      })
    })
    return promise
  }
  this.getResult = function () {
    return this.consoleBuffer
  }
  this.setup()
}

if (root) {
  root.Knack = Knack;
}

module.exports = Knack
