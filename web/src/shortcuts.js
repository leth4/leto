'use strict';

const editor = document.getElementById('text-editor');
const fontInput = document.getElementById('font-input');
const nameInput = document.getElementById('name-input');

export default class Shortcuts {

  constructor() {
    window.onkeydown = (e) => {
      if (!leto.focused) return;
      var inInput = document.activeElement.nodeName == 'INPUT';
      var inEditor = document.activeElement.nodeName == 'TEXTAREA';
      var inCanvas = leto.directory.isFileACanvas(leto.directory.activeFile) && !inEditor && !inInput;
      var selected = document.activeElement.selectionStart != document.activeElement.selectionEnd;

      if (e.ctrlKey && !e.shiftKey && e.code === 'KeyY' && (inCanvas || inEditor)) {
        e.preventDefault();
        if (leto.directory.isFileACanvas(leto.directory.activeFile)) leto.lea.redo();
        else leto.undo.redo();
      } else if (e.ctrlKey && e.shiftKey && e.code === 'KeyZ' && (inCanvas || inEditor)) {
        e.preventDefault();
        if (leto.directory.isFileACanvas(leto.directory.activeFile)) leto.lea.redo();
        else leto.undo.redo();
      } else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyZ' && (inCanvas || inEditor)) {
        e.preventDefault();
        if (leto.directory.isFileACanvas(leto.directory.activeFile)) leto.lea.undo();
        else leto.undo.undo(); 
      } 

      else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyX' && inEditor) {
        if (selected) return;
        leto.edit.cutLine();
      }
      else if (!e.ctrlKey && !e.shiftKey && e.code === 'Enter' && inEditor) {
        leto.scroll.handleNewLine();
        leto.edit.handleNewLine();
      }

      else if (e.ctrlKey && e.code === 'KeyV') {
        if (inCanvas && !e.shiftKey) {
          leto.lea.pasteCopiedCards();
        } else {
          leto.windowManager.handleImagePaste();
          return;
        }
      }
      
      else if (e.ctrlKey && e.code === 'Tab') leto.directory.setPreviousActiveFile();
      else if (!e.ctrlKey && !e.shiftKey && e.code === 'Tab') leto.edit.handleTab();
      else if (!e.ctrlKey && e.shiftKey && e.code === 'Tab') {}

      else if (document.activeElement === nameInput && e.code === 'Enter') nameInput.blur();
      else if (document.activeElement === fontInput && e.code === 'Enter') fontInput.blur();

      else if (inCanvas && !e.ctrlKey && e.code === 'KeyV') leto.lea.alignSelectedVertically(e.shiftKey);
      else if (inCanvas && !e.ctrlKey && e.code === 'KeyH') leto.lea.alignSelectedHorizontally(e.shiftKey);
      else if (inCanvas && !e.ctrlKey && !e.shiftKey && e.code === 'Enter') leto.lea.createEmptyCard();
      else if (inCanvas && !e.ctrlKey && e.shiftKey && e.code === 'Enter') leto.lea.createDrawCard();
      else if (inCanvas && !e.ctrlKey && !e.shiftKey && e.code === 'KeyR') leto.lea.createRegionCard();
      else if (inCanvas && !e.ctrlKey && !e.shiftKey && e.code === 'Delete') leto.lea.deleteSelectedCards();
      else if (inCanvas && !e.ctrlKey && !e.shiftKey && e.code === 'Backspace') leto.lea.deleteSelectedCards();
      else if (inCanvas && e.ctrlKey && !e.shiftKey && e.code === 'KeyD') leto.lea.duplicateSelectedCards();
      else if (inCanvas && e.ctrlKey && !e.shiftKey && e.code === 'KeyX') leto.lea.cutSelectedCards();
      else if (inCanvas && e.ctrlKey && !e.shiftKey && e.code === 'KeyC') leto.lea.copySelectedCards();
      else if (inCanvas && e.ctrlKey && !e.shiftKey && e.code === 'KeyA') leto.lea.selectAllCards();
      else if (inCanvas && !e.ctrlKey && !e.shiftKey && e.code === 'KeyI') leto.lea.inverseSelectedCards();
      else if (inCanvas && !e.ctrlKey && !e.shiftKey && e.code === 'BracketRight') leto.lea.sendSelectedToFront();
      else if (inCanvas && !e.ctrlKey && !e.shiftKey && e.code === 'BracketLeft') leto.lea.sendSelectedToBack();
      else if (inCanvas && !e.ctrlKey && !e.shiftKey && e.code === 'ArrowUp') leto.lea.nudgeSelected(0, -1);
      else if (inCanvas && !e.ctrlKey && !e.shiftKey && e.code === 'ArrowDown') leto.lea.nudgeSelected(0, 1);
      else if (inCanvas && !e.ctrlKey && !e.shiftKey && e.code === 'ArrowRight') leto.lea.nudgeSelected(1, 0);
      else if (inCanvas && !e.ctrlKey && !e.shiftKey && e.code === 'ArrowLeft') leto.lea.nudgeSelected(-1, 0);
      else if (inCanvas && !e.ctrlKey && !e.shiftKey && e.code === 'Equal') leto.lea.zoom(-1);
      else if (inCanvas && !e.ctrlKey && !e.shiftKey && e.code === 'Minus') leto.lea.zoom(+1);
      else if (inCanvas && !e.ctrlKey && !e.shiftKey && e.code === 'KeyC') leto.lea.connectSelectedCards();
      else if (inCanvas && !e.ctrlKey && !e.shiftKey && e.code === 'KeyD') leto.lea.disconnectSelectedCards();
      else if (inCanvas && e.ctrlKey && !e.shiftKey && e.code === 'KeyF') leto.lea.resetPosition();
      else if (inCanvas && !e.ctrlKey && !e.shiftKey && e.code === 'KeyF') leto.lea.zoomToSelected();
      
      else if (leto.directory.isFileACanvas(leto.directory.activeFile) && e.ctrlKey && !e.shiftKey && e.code === 'Equal') leto.lea.changeFontSize(+1);
      else if (leto.directory.isFileACanvas(leto.directory.activeFile) && e.ctrlKey && !e.shiftKey && e.code === 'Minus') leto.lea.changeFontSize(-1);

      else if (e.key == '*' && inEditor) leto.edit.insertDoubleSymbol('*');
      else if (e.key == '\"' && inEditor) leto.edit.insertDoubleSymbol('\"');
      else if (e.key == '`' && inEditor) leto.edit.insertDoubleSymbol('`');
      else if (!e.ctrlKey && e.key == '[' && inEditor) leto.edit.handleBracket();
      else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyI' && inEditor && selected) leto.edit.insertDoubleSymbol('*');
      else if (e.ctrlKey && e.shiftKey && e.code === 'KeyC' && inEditor && selected) leto.edit.capitalize();
      else if (!e.ctrlKey && !e.shiftKey && e.code === 'Minus' && inEditor) leto.edit.handleHyphen();
      else if (e.altKey && e.shiftKey && e.code === 'ArrowUp' && inEditor) leto.edit.copyLineUp();
      else if (e.altKey && e.shiftKey && e.code === 'ArrowDown' && inEditor) leto.edit.copyLineDown();
      else if (e.altKey && !e.shiftKey && e.code === 'ArrowUp' && inEditor) leto.edit.moveUp();
      else if (e.altKey && !e.shiftKey && e.code === 'ArrowDown' && inEditor) leto.edit.moveDown();
      else if (e.ctrlKey && !e.shiftKey && e.code === 'ArrowUp' && inEditor) leto.edit.jumpUp();
      else if (e.ctrlKey && !e.shiftKey && e.code === 'ArrowDown' && inEditor) leto.edit.jumpDown();
      else if (e.ctrlKey && !e.shiftKey && e.code === 'Enter' && inEditor) leto.edit.createCheckbox();
      else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyL' && inEditor) leto.edit.selectLine();
      else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyG' && inEditor) leto.edit.insertDateTime(false);
      else if (e.ctrlKey && e.shiftKey && e.code === 'KeyG' && inEditor) leto.edit.insertDateTime(true);

      else if (!e.ctrlKey && !e.shiftKey && e.code === 'Escape') {
        if (leto.quickOpen.toggled) leto.quickOpen.close();
        else if (leto.search.toggled) leto.search.toggle();
        else if (editor.selectionStart !== editor.selectionEnd) leto.edit.deselect();
        else if (leto.windowManager.isFullscreen) leto.windowManager.toggleFullscreen();
        else leto.directory.removeActiveFile(true);
      }
      
      else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyO') leto.directory.selectNewDirectory();
      else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyN') leto.directory.createNewFile();
      else if (e.ctrlKey && e.shiftKey && e.code === 'KeyN') leto.directory.createNewFolder();
      else if (e.ctrlKey && e.shiftKey && e.code === 'KeyS')  leto.directory.exportActiveFile();
      
      else if (e.ctrlKey && e.shiftKey && e.code === 'KeyF') leto.windowManager.toggleFullscreen();
      else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyB') leto.windowManager.toggleSidebar();
      else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyT') leto.windowManager.setNextTheme();
      else if (e.ctrlKey && e.shiftKey && e.code === 'KeyT') leto.windowManager.setPreviousTheme();
      else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyQ') leto.windowManager.closeWindow();
      else if (e.ctrlKey && e.shiftKey && e.code === 'KeyQ') leto.windowManager.closeAllWindows();
      else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyM') leto.windowManager.minimizeWindow();
      else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyP') leto.windowManager.togglePrefs();
      else if (e.ctrlKey && e.shiftKey && e.code === 'KeyP') leto.windowManager.toggleAlwaysOnTop();
      else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyH') leto.windowManager.resetWindowState();
      else if (e.ctrlKey && !e.shiftKey && e.code === 'Equal') leto.windowManager.changeFontSize(+1);
      else if (e.ctrlKey && !e.shiftKey && e.code === 'Minus') leto.windowManager.changeFontSize(-1);
      else if (e.ctrlKey && e.shiftKey && e.code === 'Equal') leto.windowManager.changeSidebarFontSize(+1);
      else if (e.ctrlKey && e.shiftKey && e.code === 'Minus') leto.windowManager.changeSidebarFontSize(-1);
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
      
      else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyD') leto.render.openCurrent();
      else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyR') leto.spellcheck.toggle();
      else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyF') leto.search.toggle();
      else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyE') leto.quickOpen.open();

      else if (e.ctrlKey && e.code === 'KeyJ') {}

      else if (e.altKey && e.code === 'F4') leto.windowManager.closeAllWindows();
      else if (e.altKey) {}

      else return;

      e.preventDefault();
    };
  }
}
