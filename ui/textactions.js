export function selectLine(editor) {
    var [ selectionStart, selectionEnd ] = getSelectedLineBorders(editor);
    editor.setSelectionRange(selectionStart, selectionEnd);
}

export function moveLineUp(editor) {
    var [ selectionStart, selectionEnd ] = getSelectedLineBorders(editor);
    var lineToMove = editor.value.slice(selectionStart, selectionEnd);
    cutLine(editor);
    [ selectionStart, selectionEnd ] = getSelectedLineBorders(editor);
    editor.selectionStart = selectionEnd;
    editor.selectionEnd = selectionEnd;
    document.execCommand("insertText", false, lineToMove);
}

export function cutLine(editor) {
    selectLine(editor);
    document.execCommand("delete");
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