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

      else if (!e.ctrlKey && e.shiftKey && e.code === 'Digit8') leto.edit.insertDoubleSymbol('*');
      else if (!e.ctrlKey && e.shiftKey && e.code === 'Quote') leto.edit.insertDoubleSymbol('\"');
      else if (!e.ctrlKey && !e.shiftKey && e.code === 'Backquote') leto.edit.insertDoubleSymbol('`');
      else if (!e.ctrlKey && !e.shiftKey && e.code === 'Minus') leto.edit.handleHyphen();
      
      else if (e.ctrlKey && !e.shiftKey && e.code === 'Tab') leto.directory.setPreviousActiveFile();
      else if (!e.ctrlKey && !e.shiftKey && e.code === 'Tab') leto.edit.handleTab();

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

      else if (e.ctrlKey && !e.shiftKey && e.code === 'Digit1') leto.explorer.openPin(0);
      else if (e.ctrlKey && !e.shiftKey && e.code === 'Digit2') leto.explorer.openPin(1);
      else if (e.ctrlKey && !e.shiftKey && e.code === 'Digit3') leto.explorer.openPin(2);
      else if (e.ctrlKey && !e.shiftKey && e.code === 'Digit4') leto.explorer.openPin(3);
      else if (e.ctrlKey && !e.shiftKey && e.code === 'Digit5') leto.explorer.openPin(4);
      else if (e.ctrlKey && !e.shiftKey && e.code === 'Digit6') leto.explorer.openPin(5);
      else if (e.ctrlKey && !e.shiftKey && e.code === 'Digit7') leto.explorer.openPin(6);
      else if (e.ctrlKey && !e.shiftKey && e.code === 'Digit8') leto.explorer.openPin(7);
      else if (e.ctrlKey && !e.shiftKey && e.code === 'Digit9') leto.explorer.openPin(8);
      
      else if (e.ctrlKey && e.code === 'KeyG') {}
      else return;

      e.preventDefault();
    };
  }
}
