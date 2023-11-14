'use strict';

const editor = document.getElementById('text-editor');
const preview = document.getElementById('text-preview');
const search = document.getElementById('search-preview');
const spell = document.getElementById('spell-preview');
const counter = document.getElementById('counter');

export default class Preview {

  constructor() {
    document.addEventListener("selectionchange", () => this.#setCounterValues());
  }

  setPreviewText() {
    this.#setCounterValues();

    var editorText = editor.value + (editor.value.slice(-1) === '\n' ? ' ' : '');

    var [previewValue, codeRanges] = this.getPreview(editorText);

    preview.innerHTML = previewValue;
    preview.scrollTop = editor.scrollTop;

    var innerLinks = document.getElementsByClassName('link');
    for (let i = 0; i < innerLinks.length; i++) {
      innerLinks[i].addEventListener('click', event => this.#handleLinkClick(event));
      innerLinks[i].addEventListener('contextmenu', event => this.#handleLinkRightClick(event));
      innerLinks[i].addEventListener('mouseenter', event => this.#handleLinkHover(event));
      innerLinks[i].addEventListener('mouseout', () => leto.contextMenu.hidePreviewImage());
    }

    this.#previewSpell(editorText, codeRanges);

    search.innerHTML = '';
    if (!leto.search.toggled) return;
    search.scrollTop = editor.scrollTop;
    
    if (leto.search.text == "") return;
    var searchText = this.#cleanupHtmlTags(leto.search.text.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&'));
    search.innerHTML = this.#cleanupHtmlTags(editorText).replace(new RegExp(`(${searchText})`, 'gmi'), `<mark class='search'>$1</mark>`);
    search.scrollTop = editor.scrollTop;
  }

  getPreview(editorText) {
    const chunks = this.#cleanupHtmlTags(editorText).split(/(?<=(?:\n|^))(```[\s\S]*?```(?:$|\n))/g);
    var codeRanges = [];
    var currentLength = 0; 
    for (var i in chunks) {
      if (i % 2 === 0) {
        chunks[i] = chunks[i]
          .replace(/(?<!# )(\*\*)(.*?)(\*\*)/g, `<mark class='muted'>$1</mark><mark class='bold'>$2</mark><mark class='muted'>$3</mark>`)
          .replace(/(?<!# )(\*)(.*?)(\*)/g, `<mark class='muted'>$1</mark><mark class='italic'>$2</mark><mark class='muted'>$3</mark>`)
          .replace(/(^# )(.*)/gm, `</div><mark class='muted'>$1</mark><h1>$2</h1><div class="collapsible">`)
          .replace(/(^## )(.*)/gm, `</div><mark class='muted'>$1</mark><h2>$2</h2><div class="collapsible">`)
          .replace(/(^### )(.*)/gm, `</div><mark class='muted'>$1</mark><h3>$2</h3><div class="collapsible">`)
          .replace(/(^#### )(.*)/gm, `</div><mark class='muted'>$1</mark><h4>$2</h4><div class="collapsible">`)
          .replace(/\[\[([^[\]]+)\]\]/g, `<mark class='link' data-link='$1'>[[$1]]</mark>`)
          .replace(/\b((?:https?:\/\/)[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9]{1,6}\b(?:[-a-zA-Z0-9@:%_\+.;~#?&\/=]*))/gm, `<a target="_blank" href="$1">$1</a>`)
          .replace(/((?<!`)`(?!`))([^\n]*?)((?<!`)`(?!`))/gm, `<mark class='inline-code'><mark class='muted'>$1</mark>$2<mark class='muted'>$3</mark></mark>`);
      } else {
        chunks[i] = this.#replaceCodeBlock(chunks[i]);
        codeRanges.push([currentLength, currentLength + chunks[i].length]);
      }
      currentLength += chunks[i].length;
    }
    return [chunks.join('') + "</div>", codeRanges];
  }

  #handleLinkClick(event) {
    leto.explorer.openFromLink(event.target.getAttribute('data-link'));
  }
  
  #handleLinkRightClick(event) {
    leto.explorer.previewFromLink(event.target.getAttribute('data-link'));
  }

  #handleLinkHover(event) {
    var imagePath = leto.explorer.getImagePathFromLink(event.target.getAttribute('data-link'));
    if (imagePath == '') return;
    leto.contextMenu.previewImage(imagePath, event);
  }

  #setCounterValues() {
    var words = editor.value.match(/(\w+)/g);
    if (editor.selectionStart == editor.selectionEnd) 
      counter.innerHTML = `L${editor.value.length} W${words ? words.length : 0}`;
    else
      counter.innerHTML = `S${editor.selectionEnd - editor.selectionStart} L${editor.value.length} W${words ? words.length : 0}`;
  }

  #previewSpell(editorText, excludeRanges) {
    spell.innerHTML = "";

    if (!leto.spellcheck.toggled) return;

    var words = editorText.split(/(\W+)(?<!')/).filter(Boolean);
    var textLength = 0;

    for (var i = 0; i < words.length; i++) {
      var isExcludedRange = 0;
      excludeRanges.forEach(range => { if (textLength > range[0] && textLength < range[1]) isExcludedRange = true; })

      textLength += words[i].length;
      if (/\w+/.test(words[i]) && !/^\d+$/.test(words[i]) && !isExcludedRange)
        words[i] = leto.spellcheck.checkWord(words[i]) ? words[i] : `<mark class='mistake'>${words[i]}</mark>`;
    }

    spell.innerHTML = words.join("");
    spell.scrollTop = editor.scrollTop;
  }

  #cleanupHtmlTags(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  #replaceCodeBlock(code) {
    if (code.at(-1) == '\n') code = code.slice(0, -1);

    var strReg = /('.*?')|(".*?")/g;
    var numberReg = /\b[-+]?\d+(\.\d+)?f?\b/g;

    var language = null;

    var languageName = code.match(/(?<=```)[^\s]+/);
    if (!languageName) {}
    else if (languageName == 'cs' || languageName == 'csharp') language = csharp;
    else if (languageName == 'js' || languageName == 'javascript') language = javascript;
    else if (languageName == 'python' || languageName == 'py') language = python;
    else if (languageName == 'go' || languageName == 'golang') language = golang;
    else if (languageName == 'rust') language = rust;
    else if (languageName == 'cpp') language = cpp;
    else if (languageName == 'c') language = c;
    else if (languageName == 'java') language = java;
    else if (languageName == 'hlsl') language = hlsl;

    if (language) {
      code = code.replace(strReg,`<mark class='keyword'>$&</mark>`);
      code = code.replace(numberReg, `<mark class='keyword'>$&</mark>`);
      code = code.replace(language.keywordReg, `<mark class='keyword'>$1</mark>`);
      code = code.replace(language.commentReg,`<mark class='comment'>$&</mark>`);
    }

    code = code.replace(/^(.*)/, `<mark class='comment'>$&</mark>`);
    code = code.replace(/(.*$)/, `<mark class='comment'>$&</mark>`);
    
    return `<span class='code'>` + code + `\n</span>`;
  }
}

class Language {
  constructor(keywordReg, commentReg) {
    this.keywordReg = keywordReg;
    this.commentReg = commentReg;
  }
}

const hlsl = new Language(
  /(?<=[\s|\n|^|.|\(|-])(#if|#else|#endif|float|float1|float2|float3|float4|float2x2|float3x3|float4x4|int2x2|int3x3|int4x4|int|int1|int2|int3|int4|bool|uint|half|break|lerp|mul|abs|cos|sin|dst|src|min|max|sqrt|saturate|step|sign|continue|if|else|false|true|in|matrix|NULL|return|sample|sampler|string|struct|switch|case|texture|texture2D|texture2DArray|Texture3D|vector|while)(?=[$|\s|\n|\.|;|\(])/g,
  /(\/\/.*)|(\/\*[\s\S]*?\*\/)/g
);

const rust = new Language(
  /(?<=[\s|\n|^|.|\(|-])(as|break|const|continue|crate|else|enum|extern|false|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|self|Self|static|struct|super|trait|true|type|unsafe|use|where|while|async|await|dyn|abstract|become|box|do|final|macro|override|priv|typeof|unsized|virtual|yield|try|union)(?=[$|\s|\n|\.|;|\(])/g,
  /(\/\/.*)|(\/\*[\s\S]*?\*\/)/g
);

const python = new Language(
  /(?<=[\s|\n|^|.|\(|-])(False|None|True|and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield|match|case|_)(?=[$|\s|\n|\.|;|\(])/g,
  /(#.*)/g
);

const java = new Language(
  /(?<=[\s|\n|^|.|\(|-])(abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|extends|final|finally|float|for|if|goto|implements|import|instanceof|int|interface|long|native|new|package|private|protected|public|return|short|static|strictfp|super|switch|synchronized|this|throw|throws|transient|try|void|volatile|while|_|exports|module|non-sealed|open|opens|permits|provides|record|requires|sealed|to|transitive|uses|var|with|yield)(?=[$|\s|\n|\.|;|\(])/g,
  /(\/\/.*)|(\/\*[\s\S]*?\*\/)/g
);

const golang = new Language(
  /(?<=[\s|\n|^|.|\(|-])(break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|range|return|select|struct|switch|type|var)(?=[$|\s|\n|\.|;|\(])/g,
  /(\/\/.*)|(\/\*[\s\S]*?\*\/)/g
);

const cpp = new Language(
  /(?<=[\s|\n|^|.|\(|-])(asm|auto|bool|break|case|catch|char|class|const|const_cast|continue|default|delete|do|double|dynamic_cast|else|enum|explicit|export|extern|false|float|for|friend|goto|if|inline|int|long|mutable|namespace|new|operator|private|protected|public|register|reinterpret_cast|return|short|signed|sizeof|static|static_cast|struct|switch|template|this|throw|true|try|typedef|typeid|typename|union|unsigned|using|virtual|void|volatile|wchar_t|while|and|and_eq|bitand|bitor|compl|not|not_eq|or|or_eq|xor|xor_eq)(?=[$|\s|\n|\.|;|\(])/g,
  /(\/\/.*)|(\/\*[\s\S]*?\*\/)/g
)

const c = new Language(
  /(?<=[\s|\n|^|.|\(|-])(auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|inline|int|long|register|restrict|return|short|signed|sizeof|static|struct|switch|typedef|union|unsigned|void|volatile|while)(?=[$|\s|\n|\.|;|\(])/g,
  /(\/\/.*)|(\/\*[\s\S]*?\*\/)/g
);

const javascript = new Language(
  /(?<=[\s|\n|^|.|\(|-])(break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|function|if|import|in|instanceof|new|return|super|switch|this|throw|try|typeof|var|void|while|with|yield|let|static|enum|await|implements|interface|package|private|protected|public|null|true|false)(?=[$|\s|\n|\.|;|\(])/g,
  /(\/\/.*)|(\/\*[\s\S]*?\*\/)/g
);

const csharp = new Language(
  /(?<=[\s|\n|^|.|\(|-])(#if|#else|abstract|as|not|base|bool|break|byte|case|catch|char|checked|class|const|continue|decimal|default|delegate|do|double|else|enum|event|explicit|extern|false|finally|fixed|float|for|foreach|goto|if|implicit|in|int|interface|internal|is|lock|long|namespace|new|null|object|operator|out|override|params|private|protected|public|readonly|ref|return|sbyte|sealed|short|sizeof|stackalloc|static|string|struct|switch|this|throw|true|try|typeof|uint|ulong|unchecked|unsafe|ushort|using|virtual|void|volatile|while|add|alias|ascending|async|await|by|descending|dynamic|equals|from|get|global|group|into|join|let|nameof|notnull|on|orderby|partial|remove|select|set|unmanaged|value|var|when|where|yield)(?=[$|\s|\n|\.|;|\(])/g,
  /(\/\/.*)|(\/\*[\s\S]*?\*\/)/g
);
