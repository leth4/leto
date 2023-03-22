export function selectLine(editor) {
    var [ selectionStart, selectionEnd ] = getSelectedLineBorders(editor);
    editor.setSelectionRange(selectionStart, selectionEnd);
}

export function deselect(editor) {
    editor.selectionStart = editor.selectionEnd;
}

export function moveLineUp(editor) {
    // End new line if yeah
    var [ selectionStart, selectionEnd ] = getSelectedLineBorders(editor);
    var positionAtLine = editor.selectionStart - selectionStart;
    var lineToMove = editor.value.slice(selectionStart, selectionEnd);
    cutLine(editor);
    [ selectionStart, selectionEnd ] = getSelectedLineBorders(editor);
    editor.setSelectionRange(selectionEnd, selectionEnd);
    document.execCommand("insertText", false, lineToMove);
    editor.setSelectionRange(selectionEnd + positionAtLine, selectionEnd + positionAtLine);
}

export function createCheckbox(editor) {
    var [ selectionStart, selectionEnd ] = getSelectedLineBorders(editor);

    if (editor.value.slice(selectionStart, selectionStart + 6) == "- [x] ") {
        editor.setSelectionRange(selectionStart + 3, selectionStart + 4);
        document.execCommand("insertText", false, " ");
        editor.setSelectionRange(selectionEnd - 1, selectionEnd - 1);
    }
    else if (editor.value.slice(selectionStart, selectionStart + 6) == "- [ ] ") {
        editor.setSelectionRange(selectionStart + 3, selectionStart + 4);
        document.execCommand("insertText", false, "x");
        editor.setSelectionRange(selectionEnd - 1, selectionEnd - 1);
    }
    else {
       editor.setSelectionRange(selectionStart, selectionStart);
       document.execCommand("insertText", false, "- [ ] ");
       editor.setSelectionRange(selectionEnd + 5, selectionEnd + 5);
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