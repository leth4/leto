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
      var selected = editor.selectionStart != editor.selectionEnd;

      if (e.ctrlKey && !e.shiftKey && e.code === 'KeyY' && (inCanvas || inEditor)) {
        e.preventDefault();
        if (leto.directory.isFileACanvas(leto.directory.activeFile)) leto.canvas.redo();
        else leto.undo.redo();
      } else if (e.ctrlKey && e.shiftKey && e.code === 'KeyZ' && (inCanvas || inEditor)) {
        e.preventDefault();
        if (leto.directory.isFileACanvas(leto.directory.activeFile)) leto.canvas.redo();
        else leto.undo.redo();
      } else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyZ' && (inCanvas || inEditor)) {
        e.preventDefault();
        if (leto.directory.isFileACanvas(leto.directory.activeFile)) leto.canvas.undo();
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
          leto.canvas.pasteCopiedCards();
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

      else if (inCanvas && !e.shiftKey && e.code === 'Enter') leto.canvas.createEmptyCard(e.ctrlKey);
      else if (inCanvas && e.shiftKey && e.code === 'Enter') leto.canvas.createDrawCard(e.ctrlKey);
      else if (inCanvas && !e.ctrlKey && !e.shiftKey && e.code === 'Delete') leto.canvas.deleteSelectedCards();
      else if (inCanvas && !e.ctrlKey && !e.shiftKey && e.code === 'Backspace') leto.canvas.deleteSelectedCards();
      else if (inCanvas && e.ctrlKey && !e.shiftKey && e.code === 'KeyX') leto.canvas.cutSelectedCards();
      else if (inCanvas && e.ctrlKey && !e.shiftKey && e.code === 'KeyC') leto.canvas.copySelectedCards();
      else if (inCanvas && e.ctrlKey && !e.shiftKey && e.code === 'KeyA') leto.canvas.selectAllCards();
      else if (inCanvas && !e.ctrlKey && !e.shiftKey && e.code === 'KeyI') leto.canvas.inverseSelectedCards();
      else if (inCanvas && !e.ctrlKey && !e.shiftKey && e.code === 'BracketRight') leto.canvas.sendSelectedToFront();
      else if (inCanvas && !e.ctrlKey && !e.shiftKey && e.code === 'BracketLeft') leto.canvas.sendSelectedToBack();
      else if (inCanvas && !e.ctrlKey && !e.shiftKey && e.code === 'KeyV') leto.canvas.alignSelectedVertically();
      else if (inCanvas && !e.ctrlKey && !e.shiftKey && e.code === 'KeyH') leto.canvas.alignSelectedHorizontally();
      else if (inCanvas && !e.ctrlKey && !e.shiftKey && e.code === 'ArrowUp') leto.canvas.nudgeSelected(0, -1);
      else if (inCanvas && !e.ctrlKey && !e.shiftKey && e.code === 'ArrowDown') leto.canvas.nudgeSelected(0, 1);
      else if (inCanvas && !e.ctrlKey && !e.shiftKey && e.code === 'ArrowRight') leto.canvas.nudgeSelected(1, 0);
      else if (inCanvas && !e.ctrlKey && !e.shiftKey && e.code === 'ArrowLeft') leto.canvas.nudgeSelected(-1, 0);
      else if (inCanvas && !e.ctrlKey && !e.shiftKey && e.code === 'Equal') leto.canvas.zoom(-1);
      else if (inCanvas && !e.ctrlKey && !e.shiftKey && e.code === 'Minus') leto.canvas.zoom(+1);
      else if (inCanvas && !e.ctrlKey && !e.shiftKey && e.code === 'KeyC') leto.canvas.connectSelectedCards();
      else if (inCanvas && !e.ctrlKey && !e.shiftKey && e.code === 'KeyD') leto.canvas.disconnectSelectedCards();
      else if (inCanvas && e.ctrlKey && !e.shiftKey && e.code === 'KeyR') leto.canvas.resetPosition();
      else if (inCanvas && !e.ctrlKey && !e.shiftKey && e.code === 'KeyF') leto.canvas.zoomToSelected();
      
      else if (leto.directory.isFileACanvas(leto.directory.activeFile) && e.ctrlKey && !e.shiftKey && e.code === 'Equal') leto.canvas.changeFontSize(+1);
      else if (leto.directory.isFileACanvas(leto.directory.activeFile) && e.ctrlKey && !e.shiftKey && e.code === 'Minus') leto.canvas.changeFontSize(-1);

      else if (e.key == '*' && inEditor) leto.edit.insertDoubleSymbol('*');
      else if (e.key == '\"' && inEditor) leto.edit.insertDoubleSymbol('\"');
      else if (e.key == '`' && inEditor) leto.edit.insertDoubleSymbol('`');
      else if (!e.ctrlKey && e.key == '[' && inEditor) leto.edit.handleBracket();
      else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyI' && inEditor && selected) leto.edit.insertDoubleSymbol('*');
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

      else return;

      e.preventDefault();
    };
  }
}
