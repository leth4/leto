'use strict';

const editor = document.getElementById('text-editor');
const fontInput = document.getElementById('font-input');
const nameInput = document.getElementById('name-input');

export default class Shortcuts {

  constructor() {
    window.onkeydown = (e) => {
      if (!leto.focused) return;

      if (e.ctrlKey && !e.shiftKey && e.code === 'KeyY') {
        e.preventDefault();
        leto.undo.redo();
      } else if (e.ctrlKey && e.shiftKey && e.code === 'KeyZ') {
        e.preventDefault();
        leto.undo.redo();
      } else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyZ') {
        e.preventDefault();
        leto.undo.undo();  
      } 

      else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyX') {
        if (editor.selectionStart != editor.selectionEnd) return;
        leto.edit.cutLine();
      }

      else if (document.activeElement === nameInput && e.code === 'Enter') nameInput.blur();
      else if (document.activeElement === fontInput && e.code === 'Enter') fontInput.blur();

      else if (!e.ctrlKey && !e.shiftKey && e.code === 'Enter') leto.edit.handleNewLine();
      else if (e.altKey && e.shiftKey && e.code === 'ArrowUp') leto.edit.copyLineUp();
      else if (e.altKey && e.shiftKey && e.code === 'ArrowDown') leto.edit.copyLineDown();
      else if (e.altKey && !e.shiftKey && e.code === 'ArrowUp') leto.edit.moveUp();
      else if (e.altKey && !e.shiftKey && e.code === 'ArrowDown') leto.edit.moveDown();
      else if (e.ctrlKey && !e.shiftKey && e.code === 'ArrowUp') leto.edit.jumpUp();
      else if (e.ctrlKey && !e.shiftKey && e.code === 'ArrowDown') leto.edit.jumpDown();
      else if (e.ctrlKey && !e.shiftKey && e.code === 'Enter') leto.edit.createCheckbox();
      else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyL') leto.edit.selectLine();
      else if (!e.ctrlKey && !e.shiftKey && e.code === 'Escape') leto.edit.deselect();
      
      else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyO') leto.directory.selectNewDirectory();
      else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyN') leto.directory.createNewFile();
      else if (e.ctrlKey && e.shiftKey && e.code === 'KeyN') leto.directory.createNewFolder();
      else if (e.ctrlKey && e.shiftKey && e.code === 'KeyS')  leto.directory.exportActiveFile();
      
      else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyR') leto.windowManager.toggleSpellcheck();
      else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyB') leto.windowManager.toggleSidebar();
      else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyT') leto.windowManager.setNextTheme();
      else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyQ') leto.windowManager.closewindow();
      else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyM') leto.windowManager.minimizeWindow();
      else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyP') leto.windowManager.togglePrefs();
      else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyF') leto.windowManager.toggleFullscreen();
      else if (e.ctrlKey && !e.shiftKey && e.code === 'Equal') leto.windowManager.changeFontSize(+1);
      else if (e.ctrlKey && !e.shiftKey && e.code === 'Minus') leto.windowManager.changeFontSize(-1);
      else if (e.ctrlKey && !e.shiftKey && e.code === 'BracketRight') leto.windowManager.changeFontWeight(+100);
      else if (e.ctrlKey && !e.shiftKey && e.code === 'BracketLeft') leto.windowManager.changeFontWeight(-100);
      
      else if (e.ctrlKey && e.code === 'KeyG') {}
      else return;

      e.preventDefault();
    };
  }
}
