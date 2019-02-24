import _ from '../assets/scss/code-knack.scss';

var root = root || window || {}

function builtinRead(x) {
  if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined)
      throw "File not found: '" + x + "'";
  return Sk.builtinFiles["files"][x];
}

function words(str) {
  var obj = {}, words = str.split(" ")
  for (var i = 0; i < words.length; ++i) {
    obj[words[i]] = true
  }
  return obj
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
        this.Sk = Sk
        this.Sk.configure({output: function (text) { self.onSkOutput(text) }, read: builtinRead})
        break
      case 'scheme':
        this.biwa =  new BiwaScheme.Interpreter(this.onBiwaError)
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
      'scheme': this.evalScheme,
      'ruby': this.evalRuby,
      'python': this.evalPython,
      'cpp': this.evalCpp,
      'c': this.evalCpp
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

function CodeKnack (opts) {
  this.codeKnackPath = '/lib/code-knack'
  this.log = function (str) {
    if (this.opts.debug) {
      let args = [str]
      args = args.concat(Array.prototype.slice.call(arguments, 1))
      console.log.apply(console, args)
    }
  }
  this.cppKeywords = 'include auto if break case register continue return default do sizeof ' +
    'static else struct switch extern typedef union for goto while enum const ' +
    'volatile inline restrict asm fortran ' +
    'alignas alignof and and_eq audit axiom bitand bitor catch ' +
    'class compl concept constexpr const_cast decltype delete dynamic_cast ' +
    'explicit export final friend import module mutable namespace new noexcept ' +
    'not not_eq operator or or_eq override private protected public ' +
    'reinterpret_cast requires static_assert static_cast template this ' +
    'thread_local throw try typeid typename using virtual xor xor_eq'

  this.inject = function (langs) {
    this.log('Inject knack dependences.')
    const self = this
    langs.forEach(async function (lang) {
      if (self.opts.languages.hasOwnProperty(lang)) {
        var scripts = self.opts.languages[lang].scripts
        for (let i = 0; i < scripts.length; i++) {
          const link = scripts[i]          
          await self.injectScript(link)
        }
      }
    })
    root.KnackLoaded = true
    this.log('Knack Loaded.')
  }
  
  this.injectScript = function (link, callback) {
    var self = this
    var script = document.createElement('script')
    script.setAttribute('src', link)
    script.setAttribute('type', 'text/javascript')
    document.body.appendChild(script)
    return new Promise(function (resolve, reject) {
      script.onload = function () {
        self.log('inject script', link)
        resolve()
      }
    })
  }

  this.getLangOpts = function (lang) {
    if (this.opts.languages.hasOwnProperty(lang)) {
      return this.opts.languages[lang]
    }
    return {}
  }

  this.initEngines = function (langs) {
    var self = this
    langs.forEach(function (lang) {
      self.engines[lang] = new Knack(lang, self.getLangOpts(lang))
      self.log('init engine', lang)
    })
  }

  this.makeUI = function (eles) {
    this.log('make UI')
    var self = this
    eles.forEach(function (ele) {
      var lang = (self.opts.guessLang ? self.opts.guessLang : self.guessLang)(ele)
      var code = ele.innerText
      const html = '<div class="code-knack-playground" data-lang="' + lang + '">'
      + '<div class="code-knack-pane"><div class="code-knack-title">' + lang + '</div>'
      + '<div class="code-knack-ctrl">'
      + (self.isExeutableLang(lang)  ? '<button class="button run-button"><img src="' + self.codeKnackPath + '/images/icon-play.svg"/><span>run</span></button>'  : '')
      + '<button class="button copy-button"><img src="' + self.codeKnackPath + '/images/icon-copy.svg"/><span>copy</span></button>'
      + '</div></div>'
      + '<textarea class="code-knack-text lang-' + escape(lang, true) + '">'
      + code
      + '</textarea>'
      + '<div class="code-knack-output"><div class="code-knack-output-title">Output</div><div class="code-knack-output-content"></div></div>'
      + '<div class="code-knack-footer"></div>'
      + '<div class="code-knack-mask"></div>'
      + '</div>'
      var parent = ele.parentNode
      parent.innerHTML = html
    })
  }

  this.isExeutableLang = function (lang) {
    return this.executableLangs.indexOf(lang) !== -1
  }

  this.getTargetsDOM = function () {
    var eles = []
    document.querySelectorAll('pre').forEach(function (pre) {
      if (pre.children.length !== 0 && pre.children[0].tagName === 'CODE') {
        if (/language-.+/.test(pre.children[0].className)) {
          eles.push(pre.children[0])
        }
      }
    })
    return eles
  }
  
  this.getMode = function (x) {
    switch (x) {
      case 'javascript':
        return 'text/javascript'
      case 'c':
        return 'text/x-csrc'
      case 'cpp':
        return 'text/x-c++src'
      case 'rust':
        return 'text/x-rustsrc'
      case 'css':
        return 'text/css'
      case 'scss':
        return 'text/scss'
      case 'html':
        return {
          name: "htmlmixed",
          scriptTypes: [{matches: /\/x-handlebars-template|\/x-mustache/i,
                         mode: null}]
        }
      default:
        return 'text/x-' + x
    }
  }

  this.getSource = function (cg) {
    var sourceArray = []
    if (this.keepSession) {
      return cg.codeMirror.getValue()
    }
    for (let i = 0; i < this.codeGrounds.length; i++) {
      const thatCg = this.codeGrounds[i]
      if (thatCg.lang === cg.lang) {
        sourceArray.push(thatCg.codeMirror.getValue())
      }
      if (thatCg.id === cg.id) {
        break
      }
    }
    return sourceArray.join('\n')
  }

  this.runCode = function (cg) {
    var output = cg.element.querySelector('.code-knack-output')
    var outputContent = cg.element.querySelector('.code-knack-output-content')
    var self = this
    return function () {
      var engine = self.engines[cg.lang]
      if (self.engines.hasOwnProperty(cg.lang)) {
        engine.clear()
        engine.attachSource(self.getSource(cg))
        self.showMask(cg, {timeout: -1, text: 'Running...'})
        engine.eval().then(function (code) {
          self.hideMask(cg)
          outputContent.innerText = engine.getResult()
        }).catch(function (err) {
          self.hideMask(cg)
          outputContent.innerText = err
        })
        output.style.display = 'block'
      }
    }
  }

  this.copyCode = function (cg) {
    var self = this
    return function () {
      var text = cg.codeMirror.getValue()
      if (root.clipboardData && root.clipboardData.setData) {
        clipboardData.setData("Text", text)
      } else if (document.queryCommandSupported && document.queryCommandSupported("copy")) {
        var textarea = document.createElement("textarea")
        textarea.textContent = text
        textarea.style.position = "fixed";
        document.body.appendChild(textarea)
        textarea.select()
        try {
          document.execCommand("copy")
          self.showMask(cg, {timeout: 2000, text: 'Copied to the clipboard.'})
        } catch (ex) {
          self.showMask(cg, {timeout: 2000, text: 'Failed to copy.'})
          console.warn("Copy to clipboard failed.", ex)
        } finally {
          document.body.removeChild(textarea)
        }
      }
    }
  }

  this.showMask = function (cg, _opts) {
    var mask = cg.element.querySelector('.code-knack-mask')
    var opts = {
      timeout: _opts.timeout || 3000,
      text: _opts.text || ''
    }
    mask.style.display = 'flex'
    mask.innerText = opts.text
    if (opts.timeout !== -1) {
      setTimeout(function () {
        mask.style.display = 'none'
      }, opts.timeout)
    }
  }

  this.hideMask = function (cg) {
    var mask = cg.element.querySelector('.code-knack-mask')
    mask.style.display = 'none'
  }

  this.isClike = function (lang) {
    return lang === 'c' || lang === 'cpp'
  }

  this.tryToInit = function () {
    var self = this
    var _proc = function () {
      // init engines
      self.initEngines(self.langs)
      // replace with new DOM
      if (!self.opts.hasOwnProperty('elements')) {
        var eles = self.getTargetsDOM()
        self.makeUI(eles)
      } else {
        self.makeUI(self.opts.elements)
      }
      // wrap with CodeMirror
      var allGrounds = document.querySelectorAll('.code-knack-playground')
      allGrounds.forEach(function (ground, idx) {
        var lang = ground.getAttribute('data-lang')
        var sourceTextarea = ground.querySelector('.code-knack-text')
        var cm = CodeMirror.fromTextArea(sourceTextarea, {
          mode: self.getMode(lang),
          theme: 'monokai',
          useCPP: self.isClike(lang),
          keywords: self.isClike(lang) ? words(self.cppKeywords) : {},
          cursorHeight: 1,
          lineNumbers: true
        })
        self.codeGrounds.push({
          id: 'cg-' + idx,
          element: ground,
          lang: lang,
          codeMirror: cm
        })
        var lastCodeGround = self.codeGrounds[self.codeGrounds.length - 1]
        var runButton = ground.querySelector('.run-button')
        if (runButton) {
          runButton.onclick = self.runCode(lastCodeGround)
        }
        ground.querySelector('.copy-button').onclick = self.copyCode(lastCodeGround)
      })
    }
    setTimeout(function () {
      if (root.KnackLoaded) {
        _proc()
      } else {
        init()
      }
    }, 1000)
  }

  this.guessLang = function (ele) {
    var lang = ele.className.substring(9).toLowerCase()
    if (lang === 'c') {
      lang = 'cpp'
    }
    return lang
  }

  this.formalizeLangs = function (langs) {
    langs = langs.map(function (item) {
      if (item === 'c') {
        item = 'cpp'
      }
      return item
    })
    return langs.filter(function(item, pos) {
      return langs.indexOf(item) === pos
    })
  }

  this.init = function () {
    var allLangs = this.formalizeLangs(Object.keys(opts.languages))
    this.engines = {}
    this.codeGrounds = []
    this.session = opts.keepSession ? {} : null
    this.executableLangs = allLangs.filter(function (lang) {
      return opts.languages[lang].mode !== 'view'
    })
    this.proxyLangs = this.executableLangs.filter(function (lang) {
      return opts.languages[lang].mode  === 'proxy'
    })
    this.langs = this.formalizeLangs(opts.enabledLanguages)
    this.codeKnackPath = opts.codeKnackPath || this.codeKnackPath
    this.opts = opts
    // inject engines dependences
    this.inject(this.langs)
    // init
    this.tryToInit()
  }
}

if (root) {
  root.CodeKnack = CodeKnack;
}

export default CodeKnack;