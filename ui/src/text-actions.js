export function selectLine(editor) {
    var [ selectionStart, selectionEnd ] = getSelectedLineBorders(editor);
    editor.setSelectionRange(selectionStart, selectionEnd);
}

export function deselect(editor) {
    editor.selectionStart = editor.selectionEnd;
}

export function moveLineDown(editor) {
    var [ selectionStart, selectionEnd ] = getSelectedLineBorders(editor);
    if (selectionEnd - 1 == selectionStart) return;
    var positionAtLine = editor.selectionStart - selectionStart;
    var lineToMove = editor.value.slice(selectionStart, selectionEnd);
    if (selectionEnd > editor.value.length) {
        editor.setSelectionRange(selectionStart, selectionStart);
        document.execCommand("insertText", false, "\n");
        editor.setSelectionRange(selectionStart + positionAtLine + 1, selectionStart + positionAtLine + 1);
        return;
    }
    cutLine(editor);
    [ selectionStart, selectionEnd ] = getSelectedLineBorders(editor);
    editor.setSelectionRange(selectionEnd, selectionEnd);
    if (selectionEnd > editor.value.length)
        lineToMove = "\n" + lineToMove;
    document.execCommand("insertText", false, lineToMove);
    editor.setSelectionRange(selectionEnd + positionAtLine, selectionEnd + positionAtLine);
    editor.blur();
    editor.focus();
}

export function moveLineUp(editor) {
    var [ selectionStart, selectionEnd ] = getSelectedLineBorders(editor);
    if (selectionEnd - 1 == selectionStart) return;
    if (selectionStart == 0) return;
    var positionAtLine = editor.selectionStart - selectionStart;
    var lineToMove = editor.value.slice(selectionStart, selectionEnd);
    cutLine(editor);
    editor.setSelectionRange(selectionStart-1, selectionStart-1);
    [ selectionStart, selectionEnd ] = getSelectedLineBorders(editor);
    editor.setSelectionRange(selectionStart, selectionStart);
    document.execCommand("insertText", false, lineToMove);
    editor.setSelectionRange(selectionStart + positionAtLine, selectionStart + positionAtLine);
    editor.blur();
    editor.focus();
}

export function copyLineDown(editor) {
    var [ selectionStart, selectionEnd ] = getSelectedLineBorders(editor);
    if (selectionEnd - 1 == selectionStart) return;
    var positionAtLine = editor.selectionStart - selectionStart;
    var lineToCopy = editor.value.slice(selectionStart, selectionEnd);
    editor.setSelectionRange(selectionEnd, selectionEnd);
    if (selectionEnd > editor.value.length)
        lineToCopy = "\n" + lineToCopy;
    document.execCommand("insertText", false, lineToCopy);
    editor.setSelectionRange(selectionEnd + positionAtLine, selectionEnd + positionAtLine);
    editor.blur();
    editor.focus();
}

export function copyLineUp(editor) {
    var [ selectionStart, selectionEnd ] = getSelectedLineBorders(editor);
    if (selectionEnd - 1 == selectionStart) return;
    var positionAtLine = editor.selectionStart - selectionStart;
    var lineToCopy = editor.value.slice(selectionStart, selectionEnd);
    if (selectionEnd > editor.value.length)
        lineToCopy += "\n";
    editor.setSelectionRange(selectionStart, selectionStart);
    document.execCommand("insertText", false, lineToCopy);
    editor.setSelectionRange(selectionStart + positionAtLine, selectionStart + positionAtLine);
    editor.blur();
    editor.focus();
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

export function jumpUp(editor) {
    var cursorPosition = editor.selectionStart;
    var selectionStart = cursorPosition - 1;
    while (selectionStart >= 0) {
        if (editor.value[selectionStart] == "\n") break;
        selectionStart--;
    }
    while (selectionStart >= 0) {
        if (editor.value[selectionStart] == "#") break;
        selectionStart--;
    }
    if (selectionStart < 0) selectionStart = 0;
    editor.setSelectionRange(selectionStart,selectionStart);
    var [ selectionStart, selectionEnd ] = getSelectedLineBorders(editor);
    editor.setSelectionRange(selectionEnd - 1, selectionEnd - 1);
    editor.blur();
    editor.focus();
}

export function jumpDown(editor) {
    var cursorPosition = editor.selectionStart;
    var selectionStart = cursorPosition;
    while (selectionStart < editor.value.length) {
        if (editor.value[selectionStart] == "\n") break;
        selectionStart++;
    }
    while (selectionStart < editor.value.length) {
        if (editor.value[selectionStart] == "#") break;
        selectionStart++;
    }
    editor.setSelectionRange(selectionStart, selectionStart);
    var [ selectionStart, selectionEnd ] = getSelectedLineBorders(editor);
    editor.setSelectionRange(selectionEnd - 1, selectionEnd - 1);
    editor.blur();
    editor.focus();
}

export function cutLine(editor) {
    selectLine(editor);
    console.log(editor.selectionEnd, editor.selectionStart);
    if (editor.selectionEnd - 1 == editor.selectionStart)
        document.execCommand("delete");
    else
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