'use strict';

export default class Shortcuts {
  constructor() {
    window.onkeydown = (e) => {
      if (!leto.focused) return;

      if (
        document.activeElement === document.getElementById('file-name') &&
        e.code === 'Enter'
      ) {
        document.getElementById('file-name').blur();
      } else if (
        document.activeElement === document.getElementById('folder-name') &&
        e.code === 'Enter'
      ) {
        document.getElementById('folder-name').blur();
      } else if (!e.ctrlKey && !e.shiftKey && e.code === 'Enter') {
        leto.edit.newLineInserted();
      } else if (e.ctrlKey && e.code === 'KeyO') {
        leto.directory.selectNewDirectory();
      } else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyY') {
        e.preventDefault();
        leto.undo.redo();
      } else if (e.ctrlKey && e.shiftKey && e.code === 'KeyZ') {
        e.preventDefault();
        leto.undo.redo();
      } else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyZ') {
        e.preventDefault();
        leto.undo.undo();
      } else if (e.ctrlKey && e.shiftKey && e.code === 'KeyS') {
        leto.directory.exportActiveFile();
      } else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyR') {
        leto.windowManager.toggleSpellcheck();
      } else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyB') {
        leto.windowManager.toggleSidebar();
      } else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyX') {
        if (
          document.getElementById('text-editor').selectionStart !=
          document.getElementById('text-editor').selectionEnd
        )
          return;
        leto.edit.cutLine();
        leto.handleEditorInput();
      } else if (e.altKey && e.shiftKey && e.code === 'ArrowUp') {
        leto.edit.copyLineUp();
        leto.handleEditorInput();
      } else if (e.altKey && e.shiftKey && e.code === 'ArrowDown') {
        leto.edit.copyLineDown();
        leto.handleEditorInput();
      } else if (e.altKey && !e.shiftKey && e.code === 'ArrowUp') {
        leto.edit.moveUp();
        leto.handleEditorInput();
      } else if (e.altKey && !e.shiftKey && e.code === 'ArrowDown') {
        leto.edit.moveDown();
        leto.handleEditorInput();
      } else if (e.ctrlKey && !e.shiftKey && e.code === 'ArrowUp') {
        leto.edit.jumpUp();
        leto.handleEditorInput();
      } else if (e.ctrlKey && !e.shiftKey && e.code === 'ArrowDown') {
        leto.edit.jumpDown();
        leto.handleEditorInput();
      } else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyT') {
        leto.windowManager.setNextTheme();
      } else if (e.ctrlKey && !e.shiftKey && e.code === 'Enter') {
        leto.edit.createCheckbox();
      } else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyL') {
        leto.edit.selectLine();
      } else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyQ') {
        leto.windowManager.closewindow();
      } else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyM') {
        leto.windowManager.minimizeWindow();
      } else if (!e.ctrlKey && !e.shiftKey && e.code === 'Escape') {
        leto.edit.deselect();
      } else if (e.ctrlKey && !e.shiftKey && e.code === 'Equal') {
        leto.windowManager.applyFontSize(+1);
      } else if (e.ctrlKey && !e.shiftKey && e.code === 'Minus') {
        leto.windowManager.applyFontSize(-1);
      } else if (e.ctrlKey && !e.shiftKey && e.code === 'BracketRight') {
        leto.windowManager.applyFontWeight(+100);
      } else if (e.ctrlKey && !e.shiftKey && e.code === 'BracketLeft') {
        leto.windowManager.applyFontWeight(-100);
      } else if (e.ctrlKey && e.shiftKey && e.code === 'KeyN') {
        leto.directory.createNewFolder();
      } else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyN') {
        leto.directory.createNewFile();
      } else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyP') {
        leto.windowManager.togglePrefs();
      } else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyF') {
        leto.windowManager.toggleFullscreen();
      } else if (e.ctrlKey && e.code === 'KeyW') {
      } else if (e.ctrlKey && e.code === 'KeyG') {
      } else if (e.ctrlKey && e.code === 'KeyU') {
      } else if (e.ctrlKey && e.code === 'KeyE') {
      } else if (e.ctrlKey && e.code === 'KeyD') {
      } else {
        return;
      }
      e.preventDefault();
    };
  }
}
