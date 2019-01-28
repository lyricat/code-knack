# Code-Knack

A widget to run code inline

## Demo

- [Simple Demo](https://lyricat.github.io/code-knack/demo/)
- [My Blog](https://lyric.im)

## How to use

### For browser

1. use the production version under the `/dist`

```html
<script src="./code-knack.min.js" type="application/javascript"></script>
```

2. CodeKnack uses [CodeMirror](http://codemirror.net/) as editor, so you need to link CodeMirror's script and css

```html
<link rel="stylesheet", href="./lib/codemirror/codemirror.css"></link>
<link rel="stylesheet", href="./lib/codemirror/theme/monokai.css"></link>
<script src="./lib/codemirror/codemirror.js" type="application/javascript"></script>
```

3. Configure CodeKnack and init.

```javascript
 var codeKnack = new CodeKnack({
    codeKnackPath: './lib/code-knack',  // the resource path of code-knack
    elements: elements,                 // an array contains elements with code
    guessLang: guessLang,               // a function to guess langauge in each element
    enabledLanguages: langs,            // enabled language array
    languages: {                        // language config
      'javascript': {                   
        mode: 'browser',                      // use browser based implement
        scripts: ['./lib/codemirror/mode/javascript/javascript.js'],    // required script
      },
      'scheme': {
          mode: 'browser',
          scripts: ['./lib/codemirror/mode/scheme/scheme.js', './lib/engines/biwascheme-min.js'],  // load biwascheme to enable scheme implement
      },
      'css': {
          mode: 'view',                 // mode == 'view', can not run.
          scripts: ['./lib/codemirror/mode/css/css.js'],
      },
      ...
    }
 })
 codeKnack.init()
```

See [Demo](https://github.com/lyricat/code-knack/tree/master/docs/demo) for more details.

### For npm package

WIP
