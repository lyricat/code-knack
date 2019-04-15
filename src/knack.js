let root = typeof self == 'object' && self.self === self && self || 
typeof global == 'object' && global.global === global && global ||
this || {};


function builtinRead(x) {
  if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined)
      throw "File not found: '" + x + "'";
  return Sk.builtinFiles["files"][x];
}

function initBrython() {
  brython({debug: 1, indexedDB: false})
}

function Knack (lang, opts) {
  this.setup = function () {
    var self = this
    this.consoleBuffer = ''
    this.lang = lang
    this.source = ''
    this.opts = opts

    if (root.KnackSetupMap.hasOwnProperty(lang) && root.KnackSetupMap[lang]) {
      // already setup
      return
    }
    switch (lang) {
      case 'ruby':
        if (Opal) {
          Opal.load('opal')
          Opal.load('opal-parser')
          root.KnackSetupMap[lang] = true
        } else {
          console.log('failed to setup Opal')
        }
        break
      case 'python':
        initBrython()
        root.KnackSetupMap[lang] = true
        break
      case 'python2':
        try {
          this.Sk = Sk
          this.Sk.configure({output: function (text) { self.onSkOutput(text) }, read: builtinRead})
          root.KnackSetupMap[lang] = true
        } catch (e) {
          console.log('failed to setup Sk')
        }
        break
      case 'scheme':
        try {
          this.biwa =  new BiwaScheme.Interpreter(this.onBiwaError)
          root.KnackSetupMap[lang] = true
        } catch (e) {
          console.log('failed to setup BiwaScheme')
        }
        break
      default:
        break
    }
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
      self.consoleBuffer += value
      // a workaround for Opal and Brython
      if (self.lang !== 'ruby' && self.lang !== 'python') {
        self.consoleBuffer += '\n'
      }
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
      'python2': this.evalPython2,
      'python': this.evalPython,
      'cpp': this.evalCpp,
      'c': this.evalCpp,
      'mermaid': this.evalMermaid,
      'latex': this.evalLaTeX,
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
        console._log(ret, self.consoleBuffer)
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
  this.evalPython2 = function (source) {
    var sesPromise = Sk.misceval.asyncToPromise(function() {
      return Sk.importMainWithBody("<stdin>", false, source, true)
    })
    return sesPromise
  }
  this.evalPython = function (source) {
    var promise = new Promise(function (resolve, reject) {
      try {
        var ret = __BRYTHON__.run_script(source, '', true)
        resolve(ret || '')
      } catch (e) {
        resolve(e.toString())
      }
    })
    return promise
  }
  this.evalTypescript = function (source) {
    var js = ts.transpile(source)
    return this.evalJS(js)
  }
  this.evalMermaid = function (source) {
    mermaid.initialize({theme: 'neutral'})
    let promise = new Promise(function (resolve, reject) {
      mermaid.render(`mermaid-${Date.now() + (Math.random() * 10  << 20)}`, source, function(svgCode, bindFunctions){
        resolve(svgCode)
      })
    })
    return promise
  }
  this.evalLaTeX = function (source) {
    let promise = new Promise(function (resolve, reject) {
      let html = ''
      try {
        html = katex.renderToString(source, { throwOnError: true })
        resolve(html)
      } catch (e) {
        html = ("Error in LaTeX '" + source + "': " + e.message)
          .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        resolve(html)
      }
    })
    return promise
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
  root.KnackSetupMap = {};
}

module.exports = Knack
