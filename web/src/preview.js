'use strict';

const editor = document.getElementById('text-editor');
const preview = document.getElementById('text-preview');

export default class Preview {

    setPreviewText() {
      var editorText = editor.value + (editor.value.slice(-1) === '\n' ? ' ' : '');
      preview.innerHTML = editorText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/(?<=(?:\n|^))(```[\s\S]*?```(?:$|\n))/g, this.#replaceCodeBlock)
        .replace(/(?<!# )(\*)(.*?)(\*)/g, `<mark class='hashtag'>$1</mark><mark class='italic'>$2</mark><mark class='hashtag'>$3</mark>`)
        .replace(/(^#{1,4})( .*)/gm, `<mark class='hashtag'>$1</mark><mark class='header'>$2</mark>`)
        .replace(/((?<!`)`(?!`)[^\n]*?(?<!`)`(?!`))/gm, `<span class='inline-code'>$1</span>`);
      preview.scrollTop = editor.scrollTop;
    }

    #replaceCodeBlock(code) {
        var mainKeywordReg = /\b(abstract|as|base|break|case|catch|class|const|continue|do|else|event|explicit|extern|finally|fixed|for|foreach|goto|if|implicit|in|interface|internal|is|lock|namespace|new|operator|out|override|params|private|protected|public|readonly|record|ref|return|scoped|sealed|sizeof|stackalloc|static|struct|switch|this|throw|try|typeof|unchecked|unsafe|using|virtual|void|volatile|while|add|alias|and|ascending|async|await|by|descending|equals|from|get|global|group|init|into|join|let|nameof|not|notnull|on|or|orderby|partial|remove|select|set|unmanaged|value|var|when|where|with|yield)(?=[^\w])/g;
        var secondaryKeywordReg = /\b(bool|byte|char|decimal|delegate|double|dynamic|enum|float|int|long|nint|nuint|object|sbyte|short|string|ulong|uint|ushort|default|false|true|null)(?=[^\w])/g;
        var numberReg = /[-+]?\d+(\.\d+)?/g;
        var strReg1 = /"(.*?)"/g; 
        var strReg2 = /'(.*?)'/g;
        var multilineCommentReg  = /(\/\*[\s\S]*?\*\/)/g;
        var inlineCommentReg = /(\/\/.*)/g;
        
        code = code.replace(mainKeywordReg, `<mark class='keyword-main'>$1</mark>`);
        code = code.replace(secondaryKeywordReg, `<mark class='keyword-secondary'>$1</mark>`);
        code = code.replace(numberReg, `<mark class='keyword-secondary'>$&</mark>`);
        
        code = code.replace(strReg1,`<mark class='string'>"$1"</mark>`);
        // code = code.replace(strReg2,`<mark class="string">'$1'</mark>`);
        
        code = code.replace(multilineCommentReg,`<mark class='comment'>$1</mark>`);
        code = code.replace(inlineCommentReg,`<mark class='comment'>$1</mark>`);
        
        return `<span class='code'>` + code + `</span>`;
    }

}