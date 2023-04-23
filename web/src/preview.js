'use strict';

const editor = document.getElementById('text-editor');
const preview = document.getElementById('text-preview');

export default class Preview {

  setPreviewText() {
    var editorText = editor.value + (editor.value.slice(-1) === '\n' ? ' ' : '');
    editorText = editorText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const chunks = editorText.split(/(?<=(?:\n|^))(```[\s\S]*?```(?:$|\n))/g);
    for (var i in chunks) {
      if (i % 2 === 0) {
        chunks[i] = chunks[i]
          .replace(/(?<!# )(\*)(.*?)(\*)/g, `<mark class='hashtag'>$1</mark><mark class='italic'>$2</mark><mark class='hashtag'>$3</mark>`)
          .replace(/(^#{1,4})( .*)/gm, `<mark class='hashtag'>$1</mark><mark class='header'>$2</mark>`)
          .replace(/((?<!`)`(?!`)[^\n]*?(?<!`)`(?!`))/gm, `<mark class='inline-code'>$1</mark>`);
      } else {
        chunks[i] = this.#replaceCodeBlock(chunks[i]);
      }
    }
    preview.innerHTML = chunks.join('');
    preview.scrollTop = editor.scrollTop;
  }

  #replaceCodeBlock(code) {
    if (code.at(-1) == '\n') code = code.slice(0, -1);

    var strReg = /('.*?')|(".*?")/g;
    var numberReg = /[-+]?\d+(\.\d+)?f?/g;

    var language = csharp;

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

    code = code.replace(strReg,`<mark class='variable'>$&</mark>`);
    code = code.replace(numberReg, `<mark class='variable'>$&</mark>`);

    code = code.replace(language.keywordReg, `<mark class='keyword'>$&</mark>`);
    code = code.replace(language.commentReg,`<mark class='comment'>$&</mark>`);
    
    code = code.replace(/^(.*)/, `<mark class='comment'>$1</mark>`);
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

const rust = new Language(
  /\b(as|break|const|continue|crate|else|enum|extern|false|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|self|Self|static|struct|super|trait|true|type|unsafe|use|where|while|async|await|dyn|abstract|become|box|do|final|macro|override|priv|typeof|unsized|virtual|yield|try|union)($|\s|\n|\.|;)/g,
  /(\/\/.*)|(\/\*[\s\S]*?\*\/)/g
);

const python = new Language(
  /\b(False|None|True|and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield|match|case|_)($|\s|\n|\.|;)/g,
  /(#.*)/g
);

const java = new Language(
  /\b(abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|extends|final|finally|float|for|if|goto|implements|import|instanceof|int|interface|long|native|new|package|private|protected|public|return|short|static|strictfp|super|switch|synchronized|this|throw|throws|transient|try|void|volatile|while|_|exports|module|non-sealed|open|opens|permits|provides|record|requires|sealed|to|transitive|uses|var|with|yield)($|\s|\n|\.|;)/g,
  /(\/\/.*)|(\/\*[\s\S]*?\*\/)/g
);

const golang = new Language(
  /\b(break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|range|return|select|struct|switch|type|var)($|\s|\n|\.|;)/g,
  /(\/\/.*)|(\/\*[\s\S]*?\*\/)/g
);

const cpp = new Language(
  /\b(asm|auto|bool|break|case|catch|char|class|const|const_cast|continue|default|delete|do|double|dynamic_cast|else|enum|explicit|export|extern|false|float|for|friend|goto|if|inline|int|long|mutable|namespace|new|operator|private|protected|public|register|reinterpret_cast|return|short|signed|sizeof|static|static_cast|struct|switch|template|this|throw|true|try|typedef|typeid|typename|union|unsigned|using|virtual|void|volatile|wchar_t|while|and|and_eq|bitand|bitor|compl|not|not_eq|or|or_eq|xor|xor_eq)($|\s|\n|\.|;)/g,
  /(\/\/.*)|(\/\*[\s\S]*?\*\/)/g
)

const c = new Language(
  /\b(auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|inline|int|long|register|restrict|return|short|signed|sizeof|static|struct|switch|typedef|union|unsigned|void|volatile|while)($|\s|\n|\.|;)/g,
  /(\/\/.*)|(\/\*[\s\S]*?\*\/)/g
);

const javascript = new Language(
  /\b(break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|function|if|import|in|instanceof|new|return|super|switch|this|throw|try|typeof|var|void|while|with|yield|let|static|enum|await|implements|interface|package|private|protected|public|null|true|false)($|\s|\n|\.|;)/g,
  /(\/\/.*)|(\/\*[\s\S]*?\*\/)/g
);

const csharp = new Language(
  /\b(abstract|as|base|bool|break|byte|case|catch|char|checked|class|const|continue|decimal|default|delegate|do|double|else|enum|event|explicit|extern|false|finally|fixed|float|for|foreach|goto|if|implicit|in|int|interface|internal|is|lock|long|namespace|new|null|object|operator|out|override|params|private|protected|public|readonly|ref|return|sbyte|sealed|short|sizeof|stackalloc|static|string|struct|switch|this|throw|true|try|typeof|uint|ulong|unchecked|unsafe|ushort|using|virtual|void|volatile|while|add|alias|ascending|async|await|by|descending|dynamic|equals|from|get|global|group|into|join|let|nameof|notnull|on|orderby|partial|remove|select|set|unmanaged|value|var|when|where|yield)($|\s|\n|\.|;)/g,
  /(\/\/.*)|(\/\*[\s\S]*?\*\/)/g
);