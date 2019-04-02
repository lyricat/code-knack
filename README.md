# Code-Knack

A code evaluator on your web page. Support both client implements and server implements.

- Mobile compatibility
- Allow running code at client side or server (implement yourself)
- Inject required script files automatically
- Good design and theme support
- Syntax highlight editor (powered by [CodeMirror](http://codemirror.net/))
- Multi-languages support (powered by different projects, see table followed)

## TODO

- [x] Java support
- [x] Diagram output
- [x] LaTeX output
- [ ] script state/network state detection
- [ ] Python 3 support
- [ ] Chart

## Demo

![screen record](https://github.com/lyricat/code-knack/blob/master/docs/screenrecord.gif)

Basic Demo:

- [Simple Demo](https://lyricat.github.io/code-knack/demo)

Integration:

- [Jekyll Demo](https://lyricat.github.io/code-knack-jekyll-demo/jekyll/update/2019/01/19/welcome-to-jekyll.html)
- [My Blog (Hexo)](https://lyric.im/code-knack)
- [GitPress.io](https://gitpress.io/c/12/languages)


## How to use

### For browser

1. use the production version in `/dist`

```html
<script src="./code-knack.min.js" type="application/javascript"></script>
```

2. CodeKnack uses [CodeMirror](http://codemirror.net/) as the editor, so you need to link CodeMirror's script and css files

```html
<link rel="stylesheet", href="./lib/codemirror/codemirror.css"></link>
<link rel="stylesheet", href="./lib/codemirror/theme/monokai.css"></link>
<link rel="stylesheet", href="./lib/codemirror/theme/base16-light.css"></link>
<script src="./lib/codemirror/codemirror.js" type="application/javascript"></script>
```

3. Configure CodeKnack and init.

if you use the default output of [marked](https://marked.js.org), you don't need to specify `elements` and `guessLang`. Or you need to find all elements contain code(usually in pre > code) and implement `guessLang`(a function uses an element as argument and return language name in lowercase)

```javascript
 var codeKnack = new CodeKnack({
    codeKnackPath: './lib/code-knack',  // the resource path of code-knack
    elements: elements,                 // an array contains elements with code
    guessLang: guessLang,               // a function to guess language in each element
    enabledLanguages: langs,            // enabled language array
    theme: 'dark',                      // dark theme
    lineNumbers: true,                  // enabled line numbers
    languages: {                        // language config, if you want to add language support manually
      ...
    }
 })
 codeKnack.init()
```

See [Demo](https://github.com/lyricat/code-knack/tree/master/docs/demo) for more details.

### For npm package

WIP

## CodeKnack Options

| Options          | Required? | Defaults                                          | Description                                                            |
|------------------|-----------|---------------------------------------------------|------------------------------------------------------------------------|
| codeKnackPath    | Yes       | '/lib/code-knack/'                                | path to CodeKnack                                                      |
| enabledLanguages | Yes       | []                                                | enabled languages array                                                |
| elements         | Optional  | all elements `pre > code`                         | an array contains DOM elements                                         |
| guessLang        | Optional  | elements with class="language-{name and options}" | a function to guess language for each element                          |
| keepSession      | Optional  | false                                             | if true, all codeblocks in same page will be considered in one session |
| theme            | Optional  | 'dark'                                            | dark or light theme                                                    |
| lineNumbers      | Optional  | true                                              | toggle line number                                                     |
| languages        | Optional  | -                                                 | see followed                                                           |

### CodeKnack Language Config

By default, Code-Knack has built-in language configs ([here](src/languages.json)).

Specified the `languages` field if you want to add new language support, or want to overwrite the existed config

```javascript
  languages: {
    "YOUR_LANGUAGE_NAME": {
      "mode": "...",              // 'view', 'browser' or 'proxy'
      "output": "...",            // 'text' or 'html'
      "proxyUrl": "...",          // required when mode == 'proxy'. A url to run code 
      "scripts": {      
        "syntax": ["..."],        // url of codemirror language mode files
        "engine": ["..."]         // required when mode == 'browser', url of code-knack browser engine files
      }
    },
    ...
  }
```

## Executable Languages


| Language | Implement |
| --- | --- |
| C/CPP 	| [JSCPP](https://github.com/felixhao28/JSCPP) |
| javascript 	| - |
| python 2.7	| [Skulpt](skulpt.org) |
| ruby		| [Opal](https://opalrb.com/#) |
| scheme	| [Biwascheme](https://www.biwascheme.org) |
| swift		| [iSwift](https://iswift.org/) |

## Developement

install dependences.

```bash
$ npm install
```

build dev version

```bash
$ npm run dev
```


build production version

```bash
$ npm run prod
```
