'use strict';

const { writeTextFile, readTextFile } = window.__TAURI__.fs;

import {Card, TextCard, DrawCard, ImageCard, RegionCard} from './cards.js';
import {Arrow} from './arrows.js';

const container = document.getElementById('canvas-container');
const canvas = document.getElementById('canvas');
const boxSelection = document.getElementById('box-selection');

export default class Lea {

  #draggedItem;
  #previousCursorPosition = {x: 0, y: 0};
  #startDragPosition;

  #isBoxSelecting;
  #previouslySelectedCards;
  
  canvasScale = 1;
  #canvasPosition = {x: 0, y: 0};
  #fontSize;
  
  #cards = [];
  #arrows = [];
  
  selectedArrow;
  #selectedCards = [];
  #copiedCards = [];
  
  #undoHistory = []
  #redoHistory = [];
  #isSavingUndoState = true;
  #isLoading = false;
  #isFullyLoaded = false;
  #isSaving = false;
  #savePending = false;

  constructor() {
    container.addEventListener('pointerdown', event => this.#handleMouseDown(event))
    container.addEventListener('pointermove', event => this.#handleMouseMove(event));
    container.addEventListener('pointerup', event => this.#handleMouseUp(event));
    container.addEventListener('wheel', event => this.#handleZoom(event));

    document.addEventListener('keydown', event => {if (event.code == "Space" && document.activeElement.nodeName != 'TEXTAREA') this.#startPanning()});
    document.addEventListener('keyup', event => {if (event.code == "Space") this.#endPanning()});

    container.addEventListener('dragenter', event => event.preventDefault());
    container.addEventListener('dragover', event => event.preventDefault());
    container.addEventListener('drop', event => this.#handleDrop(event));
  }
    
  undo() {
    const state = this.#undoHistory.pop();
    if (!state) return;
    this.#saveRedoState();
    this.#applyUndoState(state);
  }

  redo() {
    const state = this.#redoHistory.pop();
    if (!state) return;
    this.saveUndoState(true);
    this.#applyUndoState(state);
  }

  #applyUndoState(state) {
    this.#isSavingUndoState = false;
    this.#cards = [];
    this.#arrows = [];
    this.#selectedCards = [];
    canvas.innerHTML = '';

    state.cards.forEach(card => card.create(this.#cards));
    state.arrows.forEach(arrow => arrow.create(this.#arrows, this.#cards));

    this.#isSavingUndoState = true;
  }

  saveUndoState(fromRedo = false) {
    if (!this.#isSavingUndoState) return;
    if (!fromRedo) this.#redoHistory = [];
    var stateCards = [];
    var stateArrows = [];
    this.#cards.forEach(card => stateCards.push(card.getCopy()));
    this.#arrows.forEach(arrow => stateArrows.push(arrow.getCopy()));
    this.#undoHistory.push({cards: stateCards, arrows: stateArrows});
  }

  #saveRedoState() {
    var stateCards = [];
    var stateArrows = [];
    this.#cards.forEach(card => stateCards.push(card.getCopy()));
    this.#arrows.forEach(arrow => stateArrows.push(arrow.getCopy()));
    this.#redoHistory.push({cards: stateCards, arrows: stateArrows});
  }

  #removeLastUndoState() {
    this.#undoHistory.pop();
  }

  #redrawArrows() {
    var arrowElements = document.getElementsByClassName('arrow');
    for (let i = arrowElements.length - 1; i >= 0; i--) arrowElements[i].parentElement.remove();

    const arrowsCopy = [];
    this.#arrows.forEach(arrow => arrowsCopy.push(arrow.getCopy()));
    this.#arrows = [];
    arrowsCopy.forEach(arrow => arrow.create(this.#arrows, this.#cards));
  }

  hasCopiedCards() {
    return this.#copiedCards.length > 0;
  }

  hasMultipleSelected() {
    return this.#selectedCards.length >= 2;
  }
  
  createEmptyCard() {
    this.saveUndoState();
    var card = new TextCard(this.screenToCanvasSpace(this.#previousCursorPosition), 200, 100, 100 + this.#cards.length, false, '');
    var cardElement = card.create(this.#cards);
    cardElement.querySelector('textarea').focus();
  }
  
  createDrawCard() {
    this.saveUndoState();
    var card = new DrawCard(this.screenToCanvasSpace(this.#previousCursorPosition), 300, 340, 100 + this.#cards.length, false, []);
    card.create(this.#cards);
  }
  
  createRegionCard() {
    this.saveUndoState();
    var card = new RegionCard(this.screenToCanvasSpace(this.#previousCursorPosition), 600, 640, 100 + this.#cards.length, false);
    card.create(this.#cards);
  }

  pasteImage(filePath) {
    this.saveUndoState();
    var card = new ImageCard(this.screenToCanvasSpace(this.#previousCursorPosition), 200, 100, 100 + this.#cards.length, false, filePath);
    card.create(this.#cards);
  }

  sendSelectedToFront() {
    this.saveUndoState();
    this.#selectedCards.forEach(card => this.#setCardZIndex(card, 100 + this.#cards.length));
  }

  sendSelectedToBack() {
    this.saveUndoState();
    this.#selectedCards.forEach(card => this.#setCardZIndex(card, 100));
  }

  #setCardZIndex(card, newZIndex) {
    var oldZIndex = card.style.zIndex;
    const cardElements = canvas.getElementsByClassName('card');
    for (let i = 0; i < cardElements.length; i++) {
      var cardZIndex = cardElements[i].style.zIndex;
      if (oldZIndex < newZIndex && cardZIndex > oldZIndex && cardZIndex <= newZIndex) {
        cardElements[i].style.zIndex = parseInt(cardZIndex, 10) - 1; 
        this.#cards[cardElements[i].getAttribute('data-index')].zIndex = parseInt(cardZIndex, 10) - 1;
      }
      else if (oldZIndex > newZIndex && cardZIndex < oldZIndex && cardZIndex >= newZIndex) {
        cardElements[i].style.zIndex = parseInt(cardZIndex, 10) + 1; 
        this.#cards[cardElements[i].getAttribute('data-index')].zIndex = parseInt(cardZIndex, 10) + 1;
      }
    }
    card.style.zIndex = newZIndex;
    this.#cards[card.getAttribute('data-index')].zIndex = newZIndex;
    this.save();
  }

  deleteSelectedCards() {
    if (document.activeElement.nodeName == 'TEXTAREA') return;

    this.saveUndoState();

    this.#selectedCards.forEach(card => {
      var index = parseInt(card.getAttribute('data-index'), 10);
      this.#cards.splice(index, 1);
      card.remove();
      const cardElements = canvas.getElementsByClassName('card');
      for (let i = 0; i < cardElements.length; i++) {
        var cardIndex = parseInt(cardElements[i].getAttribute('data-index'));
        if (cardIndex > index) cardElements[i].setAttribute('data-index', cardIndex - 1); 
      }
      for (let i = 0; i < this.#arrows.length; i++) {
        if (this.#arrows[i].toIndex == index) this.#arrows[i].toIndex = -1; 
        if (this.#arrows[i].fromIndex == index) this.#arrows[i].fromIndex = -1; 
        if (this.#arrows[i].toIndex > index) this.#arrows[i].toIndex = parseInt(this.#arrows[i].toIndex, 10) - 1; 
        if (this.#arrows[i].fromIndex > index) this.#arrows[i].fromIndex = parseInt(this.#arrows[i].fromIndex, 10) - 1; 
      }
    });
    this.#redrawArrows();
    this.#deselectAllCards();
    this.save();
  }

  inverseSelectedCards() {
    this.saveUndoState();
    this.#selectedCards.forEach(card => this.#inverseCard(card));
  }

  #inverseCard(card) {
    var index = card.getAttribute('data-index');
    this.#cards[index].isInversed = !this.#cards[index].isInversed;
    this.#cards[index].isInversed ? card.classList.add('inversed') : card.classList.remove('inversed');
    this.save();
  }

  #deselectAllCards() {
    this.#selectedCards.forEach(card => card.classList.remove('selected'));
    this.#selectedCards = [];
  }

  selectAllCards() {
    this.#selectedCards = [];
    const cardElements = canvas.getElementsByClassName('card');
    for (let i = 0; i < cardElements.length; i++) {
      this.#setSelected(cardElements[i]);
    }
  }

  #setSelected(card) {
    if (this.#selectedCards.includes(card)) return;
    card.classList.add('selected');
    this.#selectedCards.push(card);
  }

  #setDeselected(card) {
    if (!this.#selectedCards.includes(card)) return;
    card.classList.remove('selected');
    this.#selectedCards.splice(this.#selectedCards.indexOf(card), 1);
  }

  connectSelectedCards() {
    this.saveUndoState();

    if (this.#selectedCards.length == 0) return;

    if (this.#selectedCards.length == 1) {
      var initialCardIndex = this.#selectedCards[0].getAttribute('data-index');
      this.createEmptyCard();
      new Arrow(initialCardIndex, this.#cards.length - 1).create(this.#arrows, this.#cards);
      return;
    }

    for (let i = 0; i < this.#selectedCards.length - 1; i++) {
      new Arrow(this.#selectedCards[i].getAttribute('data-index'), this.#selectedCards[i + 1].getAttribute('data-index')).create(this.#arrows, this.#cards);
    }
  }

  disconnectSelectedCards() {
    this.saveUndoState();

    for (let i = 0; i < this.#selectedCards.length; i++) {
      for (let j = 0; j < this.#selectedCards.length; j++) {
        if (i == j) continue;
        for (let k = this.#arrows.length - 1; k >= 0; k--) {
          var from = this.#selectedCards[i].getAttribute('data-index');
          var to = this.#selectedCards[j].getAttribute('data-index');
          if ((this.#arrows[k].fromIndex == from && this.#arrows[k].toIndex == to) || (this.#arrows[k].fromIndex == to && this.#arrows[k].toIndex == from))
            this.#arrows.splice(k, 1);
        }
      }
    }

    this.#redrawArrows();
  }

  removeSelectedArrow() {
    this.saveUndoState();
    this.removeArrow(this.selectedArrow);
    this.save();
  }

  removeArrow(arrow) {
    var index = arrow.getAttribute('data-index');
    this.#arrows.splice(index, 1);
    this.#redrawArrows();
  }

  reverseSelectedArrow() {
    this.saveUndoState();
    var index = this.selectedArrow.getAttribute('data-index');
    new Arrow(this.#arrows[index].toIndex, this.#arrows[index].fromIndex).create(this.#arrows, this.#cards);
    this.save();
  }

  cutSelectedCards() {
    this.copySelectedCards();
    this.deleteSelectedCards();
  }

  copySelectedCards() {
    if (document.activeElement.nodeName == 'TEXTAREA') return;
    
    this.#copiedCards = [];
    this.#selectedCards.forEach(selectedCard => {
      var index = selectedCard.getAttribute('data-index');
      var card = this.#cards[index];
      this.#copiedCards.push(card.getCopy());
    });
  }

  pasteCopiedCards() {
    if (document.activeElement.nodeName == 'TEXTAREA') return;
    if (this.#copiedCards.length == 0) return;

    this.saveUndoState();

    const initialFirstCardPosition = this.#copiedCards[0].position;

    this.#deselectAllCards();
    for (let i = 0; i < this.#copiedCards.length; i++) {
      var positionOffset = {x: this.#copiedCards[i].position.x - initialFirstCardPosition.x, y: this.#copiedCards[i].position.y - initialFirstCardPosition.y}
      var cursorPosition = this.screenToCanvasSpace(this.#previousCursorPosition);
      this.#copiedCards[i].position = {x: cursorPosition.x + positionOffset.x, y: cursorPosition.y + positionOffset.y};
      var cardElement = this.#copiedCards[i].create(this.#cards);
      this.#setSelected(cardElement);
    }
  }

  alignSelectedVertically() {
    this.saveUndoState();
    
    if (this.#selectedCards.length < 2) return;
    this.#selectedCards.sort((a, b) => this.#cards[a.getAttribute('data-index')].position.y - this.#cards[b.getAttribute('data-index')].position.y);
    for (let i = 1; i < this.#selectedCards.length; i++) {
      var previousCard = this.#cards[this.#selectedCards[i - 1].getAttribute('data-index')];
      this.#moveCardToPosition(this.#selectedCards[i], {x: previousCard.position.x, y: previousCard.position.y + previousCard.height + 10});
    }
  }
  
  alignSelectedHorizontally() {
    this.saveUndoState();

    if (this.#selectedCards.length < 2) return;
    this.#selectedCards.sort((a, b) => this.#cards[a.getAttribute('data-index')].position.x - this.#cards[b.getAttribute('data-index')].position.x);
    for (let i = 1; i < this.#selectedCards.length; i++) {
      var previousCard = this.#cards[this.#selectedCards[i - 1].getAttribute('data-index')];
      this.#moveCardToPosition(this.#selectedCards[i], {x: previousCard.position.x + previousCard.width + 35, y: previousCard.position.y});
    }
  }

  nudgeSelected(xDelta, yDelta) {
    this.saveUndoState();

    for (let i = 0; i < this.#selectedCards.length; i++) {
      var card = this.#cards[this.#selectedCards[i].getAttribute('data-index')];
      this.#moveCardToPosition(this.#selectedCards[i], {x: card.position.x + xDelta * 3, y: card.position.y + yDelta * 3});
    }
  }

  #moveCardToPosition(card, position) {
    card.style.left = position.x + 'px'; 
    card.style.top = position.y + 'px';
    this.#updateCard(card);
    this.updateArrows();
    this.save();
  }

  async #handleDrop(event) {
    event.preventDefault();
    var filePath = event.dataTransfer.getData('text/path');
    if (leto.directory.isFileAnImage(filePath)) {
      this.saveUndoState();
      var card = new ImageCard(this.screenToCanvasSpace(this.getCursorPosition(event)), 200, 100, 100 + this.#cards.length, false, filePath);
      card.create(this.#cards);
    }
    else if (leto.directory.isFileANote(filePath)) {
      this.saveUndoState();
      var card = new TextCard(this.screenToCanvasSpace(this.getCursorPosition(event)), 200, 100, 100 + this.#cards.length, false, await readTextFile(filePath));
      card.create(this.#cards);
    }
  }

  #handleMouseDown(event) {
    if (event.target == container && (event.offsetY < 5 || event.offsetY > container.offsetHeight - 6 || event.offsetX > container.offsetWidth - 6)) return;

    this.#previousCursorPosition = this.getCursorPosition(event);
    if ((event.target == container || event.target.classList.contains('card')) && event.button == 1) {
      this.#isBoxSelecting = true;
      this.#previouslySelectedCards = event.shiftKey ? [...this.#selectedCards] : [];
      boxSelection.style.display = 'block';
      this.#startDragPosition = this.#previousCursorPosition;
      boxSelection.style.left = this.#previousCursorPosition.x + 'px';
      boxSelection.style.top = this.#previousCursorPosition.y + 'px';
      boxSelection.style.width = '0px';
      boxSelection.style.height = '0px';
    } else if (event.target.classList.contains('card')) {
      this.saveUndoState();
      this.#draggedItem = event.target;
      var isSelected = this.#selectedCards.includes(event.target);
      if (!event.shiftKey && (this.#selectedCards.length < 2 || !isSelected)) this.#deselectAllCards()
      if (!event.shiftKey || !isSelected) this.#setSelected(event.target);
      else this.#setDeselected(event.target);
      if (event.ctrlKey) this.#getCardsInBounds(event.target.getBoundingClientRect()).forEach(card => this.#setSelected(card));
      this.#startDragPosition = this.getPosition(this.#draggedItem);
    } else if (event.target == container && event.button == 0) {
      this.#startPanning();
    } else if (event.target.classList.contains('handle')) {
      this.saveUndoState();
      this.#draggedItem = event.target;
      this.#startDragPosition = this.getPosition(this.#draggedItem.parentElement);
      container.style.cursor = event.target.classList.contains('handle-down') ? 'ns-resize' : 'ew-resize';
      this.#draggedItem.parentElement.classList.add('notransition');
    }
  }

  #handleMouseMove(event) {
    var cursorPosition = this.getCursorPosition(event);
    
    if (this.#isBoxSelecting) {
      var transformX = (cursorPosition.x < this.#startDragPosition.x) ? 'scaleX(-1)' : 'scaleX(1)';
      var transformY =  (cursorPosition.y < this.#startDragPosition.y) ? 'scaleY(-1)' : 'scaleY(1)';
      boxSelection.style.transform = transformX + transformY;
      boxSelection.style.width = Math.abs(cursorPosition.x - this.#startDragPosition.x) + 'px';
      boxSelection.style.height = Math.abs(cursorPosition.y - this.#startDragPosition.y) + 'px';
      this.#previousCursorPosition = cursorPosition;
      this.#handleBoxSelection();
    }

    if (this.#draggedItem == null) {
      document.querySelector(':root').style.setProperty('--cards-pointer-events', event.ctrlKey || this.#isBoxSelecting ? 'none' : 'auto');
      this.#previousCursorPosition = cursorPosition;
      return;
    }

    if (this.#draggedItem.classList.contains('handle')) {
      if (this.#draggedItem.classList.contains('handle-down')) {
        var newHeight = this.screenToCanvasSpace(this.getCursorPosition(event)).y - this.getPosition(this.#draggedItem.parentElement).y - 36;
        newHeight = this.#clamp(newHeight, 100, 3000);
        this.#draggedItem.parentElement.style.height = newHeight + 'px';
      } else if (this.#draggedItem.classList.contains('handle-right')) {
        var newWidth = this.screenToCanvasSpace(this.getCursorPosition(event)).x - this.getPosition(this.#draggedItem.parentElement).x - 20;
        newWidth = this.#clamp(newWidth, 100, 3000);
        this.#draggedItem.parentElement.style.width = newWidth + 'px';
      } else {
        var previousLeft = this.getPosition(this.#draggedItem.parentElement).x;
        this.#draggedItem.parentElement.style.left = this.screenToCanvasSpace(this.getCursorPosition(event)).x + 'px';
        var newLeft = this.getPosition(this.#draggedItem.parentElement).x;
        var newWidth = parseFloat(this.#draggedItem.parentElement.style.width, 10) - newLeft + previousLeft;
        if (newWidth > 3000 || newWidth < 100) this.#draggedItem.parentElement.style.left = previousLeft + 'px';
        else this.#draggedItem.parentElement.style.width = newWidth + 'px';
      }
      this.#updateCard(this.#draggedItem.parentElement);
    } else if (this.#draggedItem == canvas) {
      var newPositionX = this.getPosition(canvas).x + (cursorPosition.x - this.#previousCursorPosition.x);
      var newPositionY = this.getPosition(canvas).y + (cursorPosition.y - this.#previousCursorPosition.y);
      canvas.style.left = newPositionX + 'px';
      canvas.style.top = newPositionY + 'px';
      this.#canvasPosition = this.getPosition(canvas);
    } else {
      this.#selectedCards.forEach(card => {
        card.style.left = this.getPosition(card).x + (cursorPosition.x - this.#previousCursorPosition.x) / this.canvasScale + 'px';
        card.style.top = this.getPosition(card).y + (cursorPosition.y - this.#previousCursorPosition.y) / this.canvasScale + 'px';
        this.#updateCard(card);
      });
    }

    if (this.#draggedItem.classList.contains('card')) this.#updateCard(this.#draggedItem);
    this.#previousCursorPosition = cursorPosition;

    this.updateArrows();
  }

  #handleMouseUp(event) {
    if (this.#isBoxSelecting) {
      boxSelection.style.display = 'none';
      this.#isBoxSelecting = false;
    }

    if (this.#draggedItem == null) return;

    const cardPosition = this.getPosition(this.#draggedItem);
    const xDelta = cardPosition.x - this.#startDragPosition.x;
    const yDelta = cardPosition.y - this.#startDragPosition.y;
    const hasMoved = xDelta != 0 || yDelta != 0;

    if (this.#draggedItem.classList.contains('card')) {
      this.#updateCard(this.#draggedItem);
      if (!event.shiftKey && event.button == 0 && !hasMoved) {
        this.#deselectAllCards()
        this.#setSelected(this.#draggedItem);
      }
      if (!hasMoved) this.#removeLastUndoState();
    } else if (this.#draggedItem.classList.contains('handle')) {
      this.#draggedItem.parentElement.classList.remove('notransition');
      if (!hasMoved) this.#removeLastUndoState();
    } else this.save();

    container.style.cursor = 'auto';
    this.#draggedItem = null;

    this.updateArrows();
  }

  #startPanning() {
    this.#deselectAllCards();
    this.#draggedItem = canvas;
    container.style.cursor = 'grabbing';
    this.#startDragPosition = this.getPosition(this.#draggedItem);
  }

  #endPanning() {
    if (this.#draggedItem == canvas) {
      this.#draggedItem = null;
      container.style.cursor = 'auto';
    }
  }

  updateArrows() {
    const arrows = document.getElementsByClassName('arrow');
    for (let i = 0; i < arrows.length; i++) {
      const index = arrows[i].getAttribute('data-index');
      this.#arrows[index].update(arrows[i], this.#cards);
    }
  }

  #handleBoxSelection() {
    var selectionRect = boxSelection.getBoundingClientRect();
    var cards = this.#getCardsInBounds(selectionRect);
    this.#deselectAllCards();
    cards.forEach(card => this.#setSelected(card));
  }

  #getCardsInBounds(rect) {
    var cards = document.getElementsByClassName('card');
    var selectedCards = [];
    for (let i = 0; i < cards.length; i++) {
      const cardRect = cards[i].getBoundingClientRect();
      if (!(rect.left > cardRect.left && rect.right < cardRect.right && rect.top > cardRect.top && rect.bottom < cardRect.bottom) &&
         (rect.left < cardRect.right && rect.right > cardRect.left && rect.top < cardRect.bottom && rect.bottom > cardRect.top)) 
        selectedCards.push(cards[i]);
    }
    return selectedCards;
  }

  zoom(amount) {
    var factor = 0.9;
    if (amount < 0) factor = 1 / factor;
    
    const oldScale = this.canvasScale;
    this.canvasScale *= factor;
    this.canvasScale = this.#clamp(this.canvasScale, .1, 3);

    factor = this.canvasScale / oldScale;
    
    var dx = (this.#previousCursorPosition.x - this.#canvasPosition.x) * (factor - 1);
    var dy = (this.#previousCursorPosition.y - this.#canvasPosition.y) * (factor - 1);
    
    canvas.classList.add('notransition');
    canvas.style.left = this.getPosition(canvas).x - dx + 'px';
    canvas.style.top = this.getPosition(canvas).y - dy + 'px';
    this.#canvasPosition = this.getPosition(canvas);
    canvas.offsetHeight;
    canvas.classList.remove('notransition');
    
    canvas.style.transform = `scale(${this.canvasScale})`;
    var handleSize = this.#clamp(3 / this.canvasScale, 3, 100);
    canvas.querySelectorAll('.handle-left').forEach(handle => handle.style.width = `${handleSize}px`);
    canvas.querySelectorAll('.handle-right').forEach(handle => handle.style.width = `${handleSize}px`);
    canvas.querySelectorAll('.handle-down').forEach(handle => handle.style.height = `${handleSize}px`);
    this.save();
  }

  zoomToSelected() {
    if (this.#selectedCards.length == 0) return;

    var minX = 99999, maxX = -99999, minY = 99999, maxY = -99999;
    this.#selectedCards.forEach(selectedCard => {
      var card = this.#cards[selectedCard.getAttribute('data-index')];
      minX = Math.min(card.position.x, minX);
      minY = Math.min(card.position.y, minY);
      maxX = Math.max(card.position.x + card.width, maxX);
      maxY = Math.max(card.position.y + card.height, maxY);
    });

    var width = maxX - minX;
    var height = maxY - minY;
    this.canvasScale = Math.min(container.offsetWidth / width, container.offsetHeight / height) * .8;
    this.canvasScale = this.#clamp(this.canvasScale, .3, 2);
    canvas.style.transform = `scale(${this.canvasScale})`;
    
    canvas.classList.add('notransition');
    
    this.#canvasPosition = {x: -(maxX + minX) / 2 * this.canvasScale + container.offsetWidth / 2 - 10, y: -(maxY + minY) / 2 * this.canvasScale + container.offsetHeight / 2 - 10};
    canvas.style.left = this.#canvasPosition.x + 'px';
    canvas.style.top = this.#canvasPosition.y + 'px';
    
    canvas.offsetHeight;
    canvas.classList.remove('notransition');

    this.save();
  }

  resetPosition() {
    this.#canvasPosition = {x: 0, y: 0};
    this.canvasScale = 1;
    canvas.style.left = this.#canvasPosition.x + 'px';
    canvas.style.top = this.#canvasPosition.y + 'px';
    canvas.style.transform = `scale(${this.canvasScale})`;
    this.save();
  }

  #handleZoom(event) {
    if (event.ctrlKey || event.shiftKey) return;
    this.zoom(event.deltaY);
  }

  updateAllCards() {
    if (!this.#isFullyLoaded) return;

    var cards = document.getElementsByClassName('card');
    for (let i = 0; i < cards.length; i++) {
      var index = parseInt(cards[i].getAttribute('data-index'));
      this.#cards[index].update(cards[i]);
    }
    this.updateArrows();
  }

  #updateCard(card) {
    var index = parseInt(card.getAttribute('data-index'));
    this.#cards[index].update(card);
        
    this.updateArrows();
    this.save();
  }

  changeFontSize(change = 0) {
    this.#fontSize = this.#fontSize + change;
    if (this.#fontSize > 50) this.#fontSize = 50;
    else if (this.#fontSize < 12) this.#fontSize = 12;
    document.querySelector(':root').style.setProperty('--canvas-font-size', `${this.#fontSize}px`);
    this.save();
  }

  async save() {
    if (!this.#isFullyLoaded) return;
    if (this.#isLoading) return;
    if (this.#isSaving) {
      this.#savePending = true;
      return;
    }
    this.#isSaving = true;
    const configObject = { cards: this.#cards, arrows: this.#arrows, scale: this.canvasScale, position: this.#canvasPosition, fontSize: this.#fontSize };

    var jsonText = JSON.stringify(configObject, null, 2);

    await writeTextFile(leto.directory.activeFile, jsonText);

    var isValidJSON = false;
    while (!isValidJSON) {
      var savedText = await readTextFile(leto.directory.activeFile);
      isValidJSON = savedText === jsonText;
      if (!isValidJSON) await writeTextFile(leto.directory.activeFile, jsonText);
    }

    this.#isSaving = false;
    if (this.#savePending) {
      this.#savePending = false;
      this.save();
    }
  }

  async load(file) {
    if (this.#isSaving) return;

    this.#isSavingUndoState = false;
    this.#isLoading = true;
    this.#cards = [];
    this.#arrows = [];
    this.#draggedItem = null;
    canvas.innerHTML = '';
    
    var fileJson = await readTextFile(leto.directory.activeFile);
    
    if (fileJson === '') {
      this.#canvasPosition = {x: 0, y: 0};
      this.canvasScale = 1;
      this.#fontSize = leto.windowManager.fontSize;
    } else {
      var file = JSON.parse(fileJson);
      this.#canvasPosition = {x: file.position.x ?? 0, y: file.position.y ?? 0};
      this.canvasScale = file.scale;
      this.#fontSize = file.fontSize ?? leto.windowManager.fontSize;
    }

    this.changeFontSize();

    canvas.style.left = this.#canvasPosition.x + 'px';
    canvas.style.top = this.#canvasPosition.y + 'px';
    canvas.style.transform = `scale(${this.canvasScale})`;

    if (fileJson !== '') {
      file.cards.forEach(card => Object.assign(Card.getInstance(card.type), card).create(this.#cards));
      file.arrows.forEach(arrow => new Arrow(arrow.fromIndex, arrow.toIndex).create(this.#arrows, this.#cards));
    }

    this.#isSavingUndoState = true;
    this.#isLoading = false;
    this.#isFullyLoaded = true;
  }

  reset() {
    this.#undoHistory = [];
    this.#redoHistory = [];
    this.#selectedCards = [];
    this.#cards = [];
    this.#arrows = [];
    canvas.innerHTML = '';
    this.#isFullyLoaded = false;
  }

  getPosition(element) {
    return {x: parseFloat(element.style.left), y: parseFloat(element.style.top, 10)};
  }

  getCursorPosition(event) {
    return {x: event.clientX - (leto.windowManager.getSidebarWidth() + 4), y: event.clientY};
  }

  screenToCanvasSpace(position) {
    return {x: (position.x - this.#canvasPosition.x) / this.canvasScale, y: (position.y - this.#canvasPosition.y) / this.canvasScale};
  }

  #clamp(number, min, max) {
    if (number > max) number = max;
    else if (number < min) number = min;
    return number;
  }
}