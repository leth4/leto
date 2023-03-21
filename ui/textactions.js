export function selectLine(editor) {
    var [ selectionStart, selectionEnd ] = getSelectedLineBorders(editor);
    editor.setSelectionRange(selectionStart, selectionEnd);
}

export function moveLineUp(editor) {
    var [ selectionStart, selectionEnd ] = getSelectedLineBorders(editor);
    var lineToMove = editor.value.slice(selectionStart, selectionEnd);
    cutLine(editor);
    [ selectionStart, selectionEnd ] = getSelectedLineBorders(editor);
    setCursorTo(selectionEnd);
    document.execCommand("insertText", false, lineToMove);
}

export function createCheckbox(editor) {
    var [ selectionStart, selectionEnd ] = getSelectedLineBorders(editor);

    if (editor.value.slice(selectionStart, selectionStart + 6) == "- [x] ") {
        editor.selectionStart = selectionStart + 3;
        editor.selectionEnd = selectionStart + 4;
        document.execCommand("insertText", false, " ");
        editor.selectionStart = selectionEnd - 1;
        editor.selectionEnd = selectionEnd - 1;
    }
    else if (editor.value.slice(selectionStart, selectionStart + 6) == "- [ ] ") {
        editor.selectionStart = selectionStart + 3;
        editor.selectionEnd = selectionStart + 4;
        document.execCommand("insertText", false, "x");
        editor.selectionStart = selectionEnd - 1;
        editor.selectionEnd = selectionEnd - 1;
    }
    else {
       editor.selectionStart = selectionStart;
       editor.selectionEnd = selectionStart;
       document.execCommand("insertText", false, "- [ ] ");
       editor.selectionStart = selectionEnd + 5;
       editor.selectionEnd = selectionEnd + 5;
    }
}



export function cutLine(editor) {
    selectLine(editor);
    document.execCommand("cut");
}

function getSelectedLineBorders(editor) {
    var cursorPosition = editor.selectionStart;
    var selectionStart = cursorPosition - 1;
    while (selectionStart >= 0) {
        if (editor.value[selectionStart] == "\n") break;
        selectionStart--;
    }
    var selectionEnd = cursorPosition;
    while (selectionEnd < editor.value.length) {
        if (editor.value[selectionEnd] == "\n") break;
        selectionEnd++;
    }
    return [selectionStart + 1, selectionEnd + 1];
}