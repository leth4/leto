import {closewindow, minimizeWindow, togglePrefs, toggleSidebar, toggleFullscreen} from '../src/window-actions.js'
import {selectLine, cutLine, moveUp, moveDown, createCheckbox, deselect, copyLineUp, copyLineDown, jumpUp, jumpDown} from '../src/text-actions.js'
import {selectNewFile, selectNewDirectory, exportActiveFile, deleteActiveFile, createFileInDirectory, createNewFolder} from '../src/file-system.js'
import {setNextTheme, toggleSpellcheck, focused, handleEditorInput, pushToGit} from '../src/index.js'

window.onkeydown = (e) => {
    if (!focused) return;

    if (e.ctrlKey && e.shiftKey && e.code === 'KeyO') {
        selectNewDirectory();
    }
    else if (e.ctrlKey && e.code === 'KeyO') {
        selectNewFile();
    }
    else if (e.ctrlKey && e.shiftKey && e.code === 'KeyS') {
        exportActiveFile();
    }
    else if (e.ctrlKey && e.code === 'KeyR') {
        toggleSpellcheck();
    }
    else if (e.ctrlKey && e.code === 'KeyB') {
        toggleSidebar();
    }
    else if (e.ctrlKey && e.code === 'KeyX') {
        if (editor.selectionStart != editor.selectionEnd) return;
        cutLine();
        handleEditorInput();
    }
    else if (e.altKey && e.shiftKey && e.code === 'ArrowUp') {
        copyLineUp();
        handleEditorInput();
    }
    else if (e.altKey && e.shiftKey && e.code === 'ArrowDown') {
        copyLineDown();
        handleEditorInput();
    }
    else if (e.altKey && e.code === 'ArrowUp') {
        moveUp();
        handleEditorInput();
    }
    else if (e.altKey && e.code === 'ArrowDown') {
        moveDown();
        handleEditorInput();
    }
    else if (e.ctrlKey && e.code === 'ArrowUp') {
        jumpUp();
        handleEditorInput();
    }
    else if (e.ctrlKey && e.code === 'ArrowDown') {
        jumpDown();
        handleEditorInput();
    }
    else if (e.ctrlKey && e.code === 'KeyT') {
        setNextTheme();
    }
    else if (e.ctrlKey && e.code === "Enter") {
        createCheckbox();
    }
    else if (e.ctrlKey && e.code === 'KeyL') {
        selectLine();
    }
    else if (e.ctrlKey && e.code === 'KeyQ') {
        closewindow();
    }
    else if (e.ctrlKey && e.code === 'KeyM') {
        minimizeWindow();
    }
    else if (!e.ctrlKey && e.code === 'Escape') {
        deselect();
    }
    else if (e.ctrlKey && e.code === 'Equal') {
        applyFontSize(+3);
    }
    else if (e.ctrlKey && e.code === 'Minus') {
         applyFontSize(-3);
    }
    else if (e.ctrlKey && e.shiftKey && e.code === 'KeyN') {
        createNewFolder();
    }
    else if (e.ctrlKey && e.code === 'KeyN') {
        createFileInDirectory();
    }
    else if (e.ctrlKey && e.code === 'KeyP') {
        togglePrefs();
    }
    else if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') {
        deleteActiveFile();
    }
    else if (e.ctrlKey && e.code === 'KeyF') {
        toggleFullscreen();
    }
    else if (e.ctrlKey && e.code === 'KeyG') {
        pushToGit();
    }
    else if (e.ctrlKey && e.code === 'KeyU') {}
    else if (e.ctrlKey && e.code === 'KeyE') {}
    else { return; }
    e.preventDefault();
}