import {closewindow, minimizeWindow, togglePrefs, toggleSidebar, toggleFullscreen} from '../src/window-actions.js'
import {selectLine, cutLine, moveUp, moveDown, createCheckbox, deselect, copyLineUp, copyLineDown, jumpUp, jumpDown} from '../src/text-actions.js'
import {selectNewFile, selectNewDirectory, exportActiveFile, createFileInDirectory, createNewFolder} from '../src/file-system.js'
import {toggleSpellcheck, focused, handleEditorInput, applyFontSize, applyFontWeight, setNextTheme} from '../src/index.js'
import {undo, redo} from '../src/undo-buffer.js'

window.onkeydown = (e) => {
    if (!focused) return;

    if (document.activeElement == document.getElementById("file-name") && e.code === 'Enter') {
        document.getElementById("file-name").blur();
    } 
    else if (document.activeElement == document.getElementById("folder-name") && e.code === 'Enter') {
        document.getElementById("folder-name").blur();
    }
    else if (e.ctrlKey && e.shiftKey && e.code === 'KeyO') {
        selectNewDirectory();
    }
    else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyO') {
        selectNewFile();
    }
    else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyY') {
        e.preventDefault();
        redo();
    }
    else if (e.ctrlKey && e.shiftKey && e.code === 'KeyZ') {
        e.preventDefault();
        redo();
    }
    else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyZ') {
        e.preventDefault();
        undo();
    }
    else if (e.ctrlKey && e.shiftKey && e.code === 'KeyS') {
        exportActiveFile();
    }
    else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyR') {
        toggleSpellcheck();
    }
    else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyB') {
        toggleSidebar();
    }
    else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyX') {
        if (document.getElementById("text-editor").selectionStart != document.getElementById("text-editor").selectionEnd) return;
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
    else if (e.altKey && !e.shiftKey && e.code === 'ArrowUp') {
        moveUp();
        handleEditorInput();
    }
    else if (e.altKey && !e.shiftKey && e.code === 'ArrowDown') {
        moveDown();
        handleEditorInput();
    }
    else if (e.ctrlKey && !e.shiftKey && e.code === 'ArrowUp') {
        jumpUp();
        handleEditorInput();
    }
    else if (e.ctrlKey && !e.shiftKey && e.code === 'ArrowDown') {
        jumpDown();
        handleEditorInput();
    }
    else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyT') {
        setNextTheme();
    }
    else if (e.ctrlKey && !e.shiftKey && e.code === "Enter") {
        createCheckbox();
    }
    else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyL') {
        selectLine();
    }
    else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyQ') {
        closewindow();
    }
    else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyM') {
        minimizeWindow();
    }
    else if (!e.ctrlKey && !e.shiftKey && e.code === 'Escape') {
        deselect();
    }
    else if (e.ctrlKey && !e.shiftKey && e.code === 'Equal') {
        applyFontSize(+1);
    }
    else if (e.ctrlKey && !e.shiftKey && e.code === 'Minus') {
         applyFontSize(-1);
    }
    else if (e.ctrlKey && !e.shiftKey && e.code === 'BracketRight') {
        applyFontWeight(+100);
    }
    else if (e.ctrlKey && !e.shiftKey && e.code === 'BracketLeft') {
        applyFontWeight(-100);
    }
    else if (e.ctrlKey && e.shiftKey && e.code === 'KeyN') {
        createNewFolder();
    }
    else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyN') {
        createFileInDirectory();
    }
    else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyP') {
        togglePrefs();
    }
    else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyF') {
        toggleFullscreen();
    }
    else if (e.ctrlKey && e.code === 'KeyW') {
        
    }
    else if (e.ctrlKey && e.code === 'KeyG') {}
    else if (e.ctrlKey && e.code === 'KeyU') {}
    else if (e.ctrlKey && e.code === 'KeyE') {}
    else { return; }
    e.preventDefault();
}