import _ from '../assets/scss/code-knack.scss';
import Knack from './knack'

let root = typeof self == 'object' && self.self === self && self || 
typeof global == 'object' && global.global === global && global ||
this || {};

var COPY = function (base, extend) { return Object.assign({}, base, extend)}

function words(str) {
  var obj = {}, words = str.split(" ")
  for (var i = 0; i < words.length; ++i) {
    obj[words[i]] = true
  }
  return obj
}

function removeDups(names) {
  let unique = {};
  names.forEach(function(i) {
    if(!unique[i]) {
      unique[i] = true;
    }
  });
  return Object.keys(unique);
}

function buildTheme(name) {
  if (name === 'light') {
    return {
      '--bg': '#f4f4f4',
      '--text': '#333',
      '--border': 'rgba(0,0,0,0.1)',
      '--code': '#333',
      '--code-bg': '#fff',
      '--title': '#888',
      '--button-text': '#d4941d',
      '--button-border': 'rgba(0,0,0,0)'
    }
  }
  return {
    '--bg': 'rgb(58, 54, 54)',
    '--text': 'rgb(255, 255, 255)',
    '--border': 'rgba(0,0,0,0.3)',
    '--code': 'rgb(255, 255, 255)',
    '--code-bg': 'rgba(39, 40, 35, 1)',
    '--title': 'rgb(255, 255, 255)',
    '--button-text': 'wheat',
    '--button-border': 'rgba(0,0,0,0.18)'
  }
}

function CodeKnack (opts) {
  this.log = function (str) {
    if (this.opts.debug) {
      let args = [str]
      args = args.concat(Array.prototype.slice.call(arguments, 1))
      args.unshift((new Date()).toISOString())
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

  this.inject = function () {
    this.log('Inject knack dependences.')
    let langs = this.opts.enabledLanguages.map((x) => {
      return this.crackLangWithOptions(x).lang
    })
    // remove duplicates
    langs = removeDups(langs)

    const self = this
    langs.forEach(async function (lang) {
      if (self.opts.languages.hasOwnProperty(lang)) {
        var scripts = self.opts.languages[lang].scripts
        if (scripts.syntax) {
          for (let i = 0; i < scripts.syntax.length; i++) {
            const link = scripts.syntax[i]          
            await self.injectScript(link)
          }
        }
        if (scripts.engine) {
          for (let i = 0; i < scripts.engine.length; i++) {
            const link = scripts.engine[i]          
            await self.injectScript(link)
          }
        }
      }
    })
    root.KnackLoaded = true
    this.log('Knack Loaded.')
  }
  
  this.injectScript = function async (link, callback) {
    var self = this
    let tag = 'script'
    if (link.slice(link.length - 4) === '.css') {
      tag = 'link'
    }
    if (null === document.querySelector('script[src="' + link + '"]')) {
      var script = document.createElement(tag)
      if (tag === 'script') {
        script.setAttribute('src', link)
        script.setAttribute('type', 'text/javascript')
        document.body.appendChild(script)
      } else {
        script.setAttribute('href', link)
        script.setAttribute('rel', 'stylesheet')
        document.head.appendChild(script)
      }
      return new Promise(function (resolve, reject) {
        script.onload = function () {
          self.log(`inject <${tag}>`, link)
          resolve()
        }
      })
    } else {
      return new Promise(function (resolve, reject) {
        resolve()
      })
    }
  }

  this.getLangOpts = function (lang) {
    if (this.opts.languages.hasOwnProperty(lang)) {
      return this.opts.languages[lang]
    }
    return {}
  }

  this.initEngines = function () {
    var self = this
    let langs = this.opts.enabledLanguages.map((x) => {
      return this.crackLangWithOptions(x).lang
    })
    langs.forEach(function (lang) {
      self.engines[lang] = new Knack(lang, self.getLangOpts(lang))
      self.log('init engine', lang)
    })
  }

  this.makeUI = function (eles, theme) {
    this.log('make UI')
    let self = this
    const renderTitle = (x) => {
      return x === 'latex' ? 'LaTeX' : x.toUpperCase()
    } 
    eles.forEach(function (ele) {
      var guessRet = self.opts.guessLang.apply(self, [ele])
      var lang = guessRet.lang
      var options = guessRet.opts
      var code = ele.innerText
      let output = '<div class="code-knack-playground ' + (self.opts.lineNumbers ? 'line-number' : '') + '" data-lang="' + lang + '" data-options="' + options +'">'
        + '<div class="code-knack-pane"><div class="code-knack-title">' + renderTitle(lang) + '</div>'
        + '<div class="code-knack-ctrl">'
        + (self.isExeutableLang(lang) && options.indexOf('ignore') === -1 ? '<button class="ck-button run-button"><img src="' + self.opts.codeKnackPath + '/images/icon-play-' + self.opts.theme + '.svg"/><span>run</span></button>'  : '')
        + '<button class="ck-button copy-button"><img src="' + self.opts.codeKnackPath + '/images/icon-copy-' + self.opts.theme + '.svg"/><span>copy</span></button>'
        + '</div></div>'
        + '<textarea class="code-knack-text lang-' + escape(lang, true) + '">'
        + code
        + '</textarea>'
      if (self.getLangOpts(lang).output === 'html') {
        output = output
          + '<div class="code-knack-output html-output"><div class="code-knack-output-title">Output</div><div class="code-knack-output-content"></div></div>'
      } else {
        output = output
          + '<div class="code-knack-output text-output"><div class="code-knack-output-title">Output</div><pre class="code-knack-output-content"></pre></div>'
      }
      output += '<div class="code-knack-footer"></div>'
        + '<div class="code-knack-mask"></div>'
        + '</div>'
        
      var parent = ele.parentNode
      parent.innerHTML = output
      parent.style.padding = 0
      // theme
      if (theme) {
        let themeConfig = buildTheme(theme)
        for (const key in themeConfig) {
          if (themeConfig.hasOwnProperty(key)) {
            parent.style.setProperty(key, themeConfig[key])
          }
        }
      }
    })
  }

  this.isExeutableLang = function (lang) {
    if (this.opts.languages.hasOwnProperty(lang)) {
      return this.opts.languages[lang].mode !== 'view'
    }
    return false
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
      case 'typescript':
        return 'text/typescript'
      case 'c':
        return 'text/x-csrc'
      case 'cpp':
        return 'text/x-c++src'
      case 'java':
        return 'text/x-java'
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
      /* workaround modes*/
      case 'mermaid':
        return 'text/x-erlang'
      case 'latex':
        return 'text/x-stex'
      /* using text/x-??? by default */
      default:
        return 'text/x-' + x
    }
  }

  this.getSource = function (cg) {
    var sourceArray = []
    if (!this.opts.keepSession) {
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
          var output = engine.getResult()
          let langOpts = self.getLangOpts(cg.lang)
          if (langOpts.output === 'html') {
            outputContent.innerHTML = output
          } else {
            outputContent.innerText = output
          }
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
    return lang === 'c' || lang === 'cpp' || lang === 'java'
  }

  this.tryToInit = function () {
    var self = this
    var _proc = function () {
      // init engines
      self.initEngines()

      // replace with new DOM
      self.makeUI(self.opts.elements, self.opts.theme)

      // wrap with CodeMirror
      var allGrounds = document.querySelectorAll('.code-knack-playground')
      allGrounds.forEach(function (ground, idx) {
        var lang = self.formalizeAlias(ground.getAttribute('data-lang'))
        var options = ground.getAttribute('data-options')
        var sourceTextarea = ground.querySelector('.code-knack-text')
        var cm = CodeMirror.fromTextArea(sourceTextarea, {
          mode: self.getMode(lang),
          theme: self.opts.theme === 'light' ? 'base16-light' : 'monokai',
          useCPP: self.isClike(lang),
          keywords: self.isClike(lang) ? words(self.cppKeywords) : {},
          cursorHeight: 1,
          lineNumbers: self.opts.lineNumbers,
        })
        self.codeGrounds.push({
          id: 'cg-' + idx,
          element: ground,
          lang: lang,
          codeMirror: cm
        })
        // bind events
        var lastCodeGround = self.codeGrounds[self.codeGrounds.length - 1]
        var runButton = ground.querySelector('.run-button')
        var runFn = self.runCode(lastCodeGround)
        if (runButton) {
          runButton.onclick = runFn
        }
        ground.querySelector('.copy-button').onclick = self.copyCode(lastCodeGround)
        // auto run?
        if (runButton && options.indexOf('autorun') !== -1) {
          setTimeout(function () {
            runFn.apply(self, [])
          }, 1000)
        }
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

  this.formalizeAlias = function (lang) {
    var alias = {
      'c': 'cpp', 
      'bash': 'sh', 'shell': 'sh',
      'ts': 'typescript'
    }
    if (alias.hasOwnProperty(lang)) { return alias[lang] }
    return lang
  }

  this.guessLang = function (ele) {
    /* 
      element with class="language-{language name and options}" 
    */
    var lang = ele.className.substring(9).toLowerCase()
    return lang
  }

  this.crackLangWithOptions = function (langWithOpts) {
    let opts = ''
    let lang = langWithOpts.toLowerCase()
    let pos = langWithOpts.indexOf(',')
    if (pos !== -1) {
      lang = langWithOpts.slice(0, pos)
      opts = langWithOpts.slice(pos + 1)
    }
    return {lang: this.formalizeAlias(lang), opts: opts}
  }

  this.formalizeLangs = function (langs) {
    var self = this
    langs = langs.map(function (item) {
      return self.formalizeAlias(item)
    })
    return langs.filter(function(item, pos) {
      return langs.indexOf(item) === pos
    })
  }

  this.loadLanguageConfig = function (codeMirrorPath, enginePath) {
    let languages = require('./languages.json')
    for (const name in languages) {
      if (languages.hasOwnProperty(name)) {
        const language = languages[name]
        if (language.scripts) {
          if (language.scripts.syntax) {
            language.scripts.syntax = language.scripts.syntax.map((p) => {
              return codeMirrorPath + p
            })
          }
          if (language.scripts.engine) {
            language.scripts.engine = language.scripts.engine.map((p) => {
              return enginePath + p
            })
          }
          languages[name] = language
        }
      }
    }
    return languages
  }

  this.formalizeOptions = function (_opts) {
    var opts = {}
    opts.codeKnackPath = _opts.codeKnackPath || './lib/code-knack'
    opts.codeMirrorPath = _opts.codeMirrorPath || './lib/codemirror'
    opts.enginePath = _opts.enginePath || './lib/engines'
    opts.theme = _opts.theme || 'dark'
    opts.elements = _opts.elements || this.getTargetsDOM()
    opts.lineNumbers = _opts.lineNumbers === false ? false : true
    opts.keepSession = _opts.keepSession === true ? true : false
    opts.guessLang = (ele) => { 
      return this.crackLangWithOptions((_opts.guessLang || this.guessLang)(ele))
    }
    opts.enabledLanguages = _opts.enabledLanguages || []
    opts.debug = _opts.debug
    opts.languages = COPY(this.loadLanguageConfig(opts.codeMirrorPath, opts.enginePath), _opts.languages)
    return opts
  }

  this.init = function () {
    this.opts = this.formalizeOptions(opts)
    this.engines = {}
    this.codeGrounds = []
    this.session = this.opts.keepSession ? {} : null
    // inject engines dependences
    this.inject()
    // init
    this.tryToInit()
  }
}

if (root) {
  root.CodeKnack = CodeKnack;
}

module.exports = CodeKnack
