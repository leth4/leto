'use strict';

const { writeTextFile, readTextFile } = window.__TAURI__.fs;
const { convertFileSrc } = window.__TAURI__.tauri;

const container = document.getElementById('canvas-container');
const canvas = document.getElementById('canvas');
const boxSelection = document.getElementById('box-selection');

export default class Canvas {

  #draggedItem;
  #previousCursorPosition = {x: 0, y: 0};
  #startDragPosition;

  #isBoxSelecting;
  #previouslySelectedCards;
  #hasChangedBoxSelection;

  #canvasScale = 1;
  #canvasPosition = {x: 0, y: 0};

  #cards = [];
  #previews = [];
  
  #selectedCards = [];
  #copiedCards = [];
  
  #undoHistory = []
  #redoHistory = [];
  #isSavingUndoState = true;

  constructor() {
    container.addEventListener('mousedown', event => this.#handleMouseDown(event))
    container.addEventListener('mousemove', event => this.#handleMouseMove(event));
    container.addEventListener('mouseup', event => this.#handleMouseUp(event));
    container.addEventListener('wheel', event => this.#handleZoom(event));

    container.addEventListener('dragenter', event => event.preventDefault());
    container.addEventListener('dragover', event => event.preventDefault());
    container.addEventListener('drop', event => this.#handleDrop(event));
  }

  undo() {
    const state = this.#undoHistory.pop();
    if (!state) return;
    this.#applyUndoState(state);
    this.#redoHistory.push(state);
  }

  redo() {
    const state = this.#redoHistory.pop();
    if (!state) return;
    this.#applyUndoState(state);
    this.#undoHistory.push(state);
  }

  #applyUndoState(state) {
    this.#isSavingUndoState = false;
    this.#cards = [];
    this.#previews = [];
    this.#selectedCards = [];
    canvas.innerHTML = '';
    state.cards.forEach(card => { this.#createCard(card.position, card.text, card.width, card.imagePath, card.zIndex, card.isInversed, -1); });

    const cardElements = canvas.getElementsByClassName('card');
    for (let i = 0; i < cardElements.length; i++) {
      if (state.selection.includes(parseInt((cardElements[i].getAttribute('data-index')), 10)))
        this.#setSelected(cardElements[i]);
    }

    this.#isSavingUndoState = true;
  }

  #saveUndoState() {
    if (!this.#isSavingUndoState) return;
    var stateCards = [];
    var stateSelectedIndeces = [];
    this.#selectedCards.forEach(card => stateSelectedIndeces.push(parseInt(card.getAttribute('data-index'), 10)));
    this.#cards.forEach(card => stateCards.push(this.#getCardCopy(card)));
    this.#undoHistory.push({cards: stateCards, selection: stateSelectedIndeces});
  }

  #removeLastUndoState() {
    this.#undoHistory.pop();
  }

  hasCopiedCards() {
    return this.#copiedCards.length > 0;
  }

  hasMultipleSelected() {
    return this.#selectedCards.length >= 2;
  }
  
  createEmptyCard() {
    this.#saveUndoState();
    this.#createCard(this.#screenToCanvasSpace(this.#previousCursorPosition), '', 200);
  }

  sendSelectedToFront() {
    this.#saveUndoState();
    this.#selectedCards.forEach(card => this.#setCardZIndex(card, 100 + this.#cards.length));
  }

  sendSelectedToBack() {
    this.#saveUndoState();
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
    this.#save();
  }

  deleteSelectedCards() {
    if (document.activeElement.nodeName == 'TEXTAREA') return;

    this.#saveUndoState();

    this.#selectedCards.forEach(card => {
      var index = card.getAttribute('data-index');
      this.#cards.splice(index, 1);
      this.#previews.splice(index, 1);
      card.remove();
      const cardElements = canvas.getElementsByClassName('card');
      for (let i = 0; i < cardElements.length; i++) {
        var cardIndex = parseInt(cardElements[i].getAttribute('data-index'));
        if (cardIndex > index) cardElements[i].setAttribute('data-index', cardIndex - 1); 
      }
    });
    this.#deselectAllCards();
    this.#save();
  }

  inverseSelectedCards() {
    this.#saveUndoState();
    this.#selectedCards.forEach(card => this.#inverseCard(card));
  }

  #inverseCard(card) {
    var index = card.getAttribute('data-index');
    this.#cards[index].isInversed = !this.#cards[index].isInversed;
    this.#cards[index].isInversed ? card.classList.add('inversed') : card.classList.remove('inversed');
    this.#save();
  }

  #deselectAllCards() {
    this.#selectedCards.forEach(card => card.classList.remove('selected'));
    this.#selectedCards = [];
  }

  selectAllCards() {
    this.#saveUndoState();
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
      this.#copiedCards.push(this.#getCardCopy(card));
    });
  }

  pasteCopiedCards() {
    if (document.activeElement.nodeName == 'TEXTAREA') return;

    this.#saveUndoState();

    this.#deselectAllCards();
    for (let i = 0; i < this.#copiedCards.length; i++) {
      var card = this.#copiedCards[i];
      var positionOffset = {x: 0, y: 0};
      if (i > 0) positionOffset = {x: this.#copiedCards[i].position.x - this.#copiedCards[0].position.x, y: this.#copiedCards[i].position.y - this.#copiedCards[0].position.y}
      var cursorPosition = this.#screenToCanvasSpace(this.#previousCursorPosition);
      var newCard = this.#createCard({x: cursorPosition.x + positionOffset.x, y: cursorPosition.y + positionOffset.y}, card.text, card.width, card.imagePath, this.#cards.length + 100, card.isInversed);
      this.#setSelected(newCard);
    }
  }

  alignSelectedVertically() {
    this.#saveUndoState();
    
    if (this.#selectedCards.length < 2) return;
    this.#selectedCards.sort((a, b) => this.#cards[a.getAttribute('data-index')].position.y - this.#cards[b.getAttribute('data-index')].position.y);
    for (let i = 1; i < this.#selectedCards.length; i++) {
      var previousCard = this.#cards[this.#selectedCards[i - 1].getAttribute('data-index')];
      this.#moveCardToPosition(this.#selectedCards[i], {x: previousCard.position.x, y: previousCard.position.y + previousCard.height + 25});
    }
  }
  
  alignSelectedHorizontally() {
    this.#saveUndoState();

    if (this.#selectedCards.length < 2) return;
    this.#selectedCards.sort((a, b) => this.#cards[a.getAttribute('data-index')].position.x - this.#cards[b.getAttribute('data-index')].position.x);
    for (let i = 1; i < this.#selectedCards.length; i++) {
      var previousCard = this.#cards[this.#selectedCards[i - 1].getAttribute('data-index')];
      this.#moveCardToPosition(this.#selectedCards[i], {x: previousCard.position.x + previousCard.width + 45, y: previousCard.position.y});
    }
  }

  #moveCardToPosition(card, position) {
    card.style.left = position.x + 'px'; 
    card.style.top = position.y + 'px';
    this.#updateCard(card);
    this.#save();
  }

  async #handleDrop(event) {
    event.preventDefault();
    var filePath = event.dataTransfer.getData('text/path');
    if (leto.directory.isFileAnImage(filePath)) {
      this.#saveUndoState();
      this.#createCard(this.#screenToCanvasSpace(this.#getCursorPosition(event)), '', 200, filePath);
    }
    else if (leto.directory.isFileANote(filePath)) {
      this.#saveUndoState();
      this.#createCard(this.#screenToCanvasSpace(this.#getCursorPosition(event)), await readTextFile(filePath), 200);
    }
  }

  #handleMouseDown(event) {
    this.#previousCursorPosition = this.#getCursorPosition(event);
    if (event.target.classList.contains('card')) {
      this.#saveUndoState();
      this.#draggedItem = event.target;
      var isSelected = this.#selectedCards.includes(event.target);
      if (!event.shiftKey && (this.#selectedCards.length < 2 || !isSelected)) this.#deselectAllCards()
      if (!event.shiftKey || !isSelected) this.#setSelected(event.target);
      else this.#setDeselected(event.target);
      this.#saveUndoState();
      this.#startDragPosition = this.#getPosition(this.#draggedItem);
    } else if (event.target == container && event.button == 0) {
      if (this.#selectedCards.length > 0) this.#saveUndoState();
      this.#deselectAllCards();
      this.#draggedItem = canvas;
      container.style.cursor = 'grabbing';
      this.#startDragPosition = this.#getPosition(this.#draggedItem);
    } else if (event.target == container && event.button == 1) {
      this.#saveUndoState();
      this.#isBoxSelecting = true;
      this.#previouslySelectedCards = event.shiftKey ? [...this.#selectedCards] : [];
      boxSelection.style.display = 'block';
      this.#startDragPosition = this.#previousCursorPosition;
      boxSelection.style.left = this.#previousCursorPosition.x + 'px';
      boxSelection.style.top = this.#previousCursorPosition.y + 'px';
      boxSelection.style.width = '0px';
      boxSelection.style.height = '0px';
    } else if (event.target.classList.contains('handle')) {
      this.#saveUndoState();
      this.#draggedItem = event.target;
      this.#startDragPosition = this.#getPosition(this.#draggedItem.parentElement);
      container.style.cursor = 'e-resize';
    }
  }

  #handleMouseMove(event) {
    var cursorPosition = this.#getCursorPosition(event);
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
      if (this.#draggedItem.classList.contains('handle-right')) {
        var newWidth = this.#screenToCanvasSpace(this.#getCursorPosition(event)).x - this.#getPosition(this.#draggedItem.parentElement).x - 20;
        newWidth = this.#clamp(newWidth, 100, 800);
        this.#draggedItem.parentElement.style.width = newWidth + 'px';
      }
      else {
        var previousLeft = this.#getPosition(this.#draggedItem.parentElement).x;
        this.#draggedItem.parentElement.style.left = this.#screenToCanvasSpace(this.#getCursorPosition(event)).x + 'px';
        var newLeft = this.#getPosition(this.#draggedItem.parentElement).x;
        var newWidth = parseFloat(this.#draggedItem.parentElement.style.width, 10) - newLeft + previousLeft;
        if (newWidth > 800 || newWidth < 100) this.#draggedItem.parentElement.style.left = previousLeft + 'px';
        else this.#draggedItem.parentElement.style.width = newWidth + 'px';
      }
      this.#updateCard(this.#draggedItem.parentElement);
    }
    else if (this.#draggedItem == canvas) {
      var newPositionX = this.#getPosition(canvas).x + (cursorPosition.x - this.#previousCursorPosition.x);
      var newPositionY = this.#getPosition(canvas).y + (cursorPosition.y - this.#previousCursorPosition.y);
      newPositionX = this.#clamp(newPositionX, -1000, 1000);
      newPositionY = this.#clamp(newPositionY, -1000, 1000);
      canvas.style.left = newPositionX + 'px';
      canvas.style.top = newPositionY + 'px';
      this.#canvasPosition = this.#getPosition(canvas);

    } else {
      this.#selectedCards.forEach(card => {
        card.style.left = this.#getPosition(card).x + (cursorPosition.x - this.#previousCursorPosition.x) / this.#canvasScale + 'px';
        card.style.top = this.#getPosition(card).y + (cursorPosition.y - this.#previousCursorPosition.y) / this.#canvasScale + 'px';
        this.#updateCard(card);
      });
    }
    
    if (this.#draggedItem.classList.contains('card')) this.#updateCard(this.#draggedItem);
    this.#previousCursorPosition = cursorPosition;
  }

  #handleMouseUp(event) {
    if (this.#isBoxSelecting) {
      boxSelection.style.display = 'none';
      this.#isBoxSelecting = false;
      if (!this.#hasChangedBoxSelection) this.#removeLastUndoState();
    }
    if (this.#draggedItem == null) return;

    const cardPosition = this.#getPosition(this.#draggedItem);
    const xDelta = cardPosition.x - this.#startDragPosition.x;
    const yDelta = cardPosition.y - this.#startDragPosition.y;
    const hasMoved = xDelta != 0 || yDelta != 0;

    if (this.#draggedItem.classList.contains('card')) {
      this.#updateCard(this.#draggedItem);
      if (!event.shiftKey && event.button == 0 && !hasMoved) {
        this.#saveUndoState();
        this.#deselectAllCards()
        this.#setSelected(this.#draggedItem);
      }
      if (!hasMoved) this.#removeLastUndoState();
    }
    else if (this.#draggedItem.classList.contains('handle')) {
      if (!hasMoved) this.#removeLastUndoState();
    }
    else this.#save();
    container.style.cursor = 'auto';
    this.#draggedItem = null;
  }

  #handleBoxSelection() {
    this.#deselectAllCards();
    var selectionRect = boxSelection.getBoundingClientRect();
    var cards = document.getElementsByClassName('card');
    var hasChanged = false;
    for (let i = 0; i < cards.length; i++) {
      const cardRect = cards[i].getBoundingClientRect();
      if (selectionRect.left < cardRect.right && selectionRect.right > cardRect.left && selectionRect.top < cardRect.bottom && selectionRect.bottom > cardRect.top) {
        this.#previouslySelectedCards.includes(cards[i]) ? this.#setDeselected(cards[i]) : this.#setSelected(cards[i]);
        hasChanged = true;
      } else if (this.#previouslySelectedCards.includes(cards[i])) {
        hasChanged = true;
        this.#setSelected(cards[i]);
      }
    }
    this.#hasChangedBoxSelection = hasChanged;
  }

  #createCard(position, text, width, imagePath = '', zIndex = 100 + this.#cards.length, isInversed = false, atIndex = -1) {
    var newCard = document.createElement('div');
    newCard.classList.add('card');

    if (isInversed) newCard.classList.add('inversed');

    var preview = document.createElement('code');
    preview.classList.add('card-preview');
    if (atIndex == -1) this.#previews.push(preview);
    else this.#previews.splice(atIndex, 0, preview);
    newCard.appendChild(preview);

    if (imagePath == '') {
      var textarea = document.createElement('textarea');
      textarea.setAttribute('spellcheck', 'false');
      textarea.value = text;
      textarea.addEventListener('input', () => this.#updateCard(newCard));
      newCard.appendChild(textarea);
    }
    else {
      var imageDisplay = document.createElement('img');
      imageDisplay.setAttribute('src', convertFileSrc(imagePath));
      newCard.appendChild(imageDisplay);
    }
    
    var handleLeft = document.createElement('div');
    handleLeft.classList.add('handle-left');
    handleLeft.classList.add('handle');
    var handleRight = document.createElement('div');
    handleRight.classList.add('handle-right');
    handleRight.classList.add('handle');
    
    newCard.appendChild(handleLeft);
    newCard.appendChild(handleRight);
    
    if (position.x == null || position.y == null) position = {x: 0, y : 0};

    canvas.appendChild(newCard);
    newCard.style.left = position.x + 'px';
    newCard.style.top = position.y + 'px';
    newCard.style.width = width + 'px';
    newCard.style.zIndex = zIndex;
    
    if (atIndex == -1) {
      newCard.setAttribute("data-index", this.#cards.length);
      this.#cards.push(new Card({x: newCard.style.left, y: newCard.style.top}, '', 100, 200, '', zIndex, isInversed));
      this.#cards[this.#cards.length - 1].imagePath = imagePath;
    }
    else {
      this.#cards.splice(atIndex, 0, new Card({x: newCard.style.left, y: newCard.style.top}, '', 100, 200, '', zIndex, isInversed));
      this.#cards[atIndex].imagePath = imagePath;
      const cardElements = canvas.getElementsByClassName('card');
      for (let i = 0; i < cardElements.length; i++) {
        var cardIndex = parseInt(cardElements[i].getAttribute('data-index'), 10);
        if (cardIndex >= atIndex) cardElements[i].setAttribute('data-index', cardIndex + 1); 
      }
      newCard.setAttribute("data-index", atIndex);
    }
    
    this.#updateCard(newCard, true);

    return newCard;
  }

  zoom(amount) {
    var factor = 0.9;
    if (amount < 0) factor = 1 / factor;
    
    var oldScaleInBounds = this.#canvasScale < 3 && this.#canvasScale > .1;
    
    this.#canvasScale *= factor;
    this.#canvasScale = this.#clamp(this.#canvasScale, .1, 3);
    
    var dx = (this.#previousCursorPosition.x - this.#canvasPosition.x) * (factor - 1);
    var dy = (this.#previousCursorPosition.y - this.#canvasPosition.y) * (factor - 1);
    
    if (oldScaleInBounds || (this.#canvasScale < 3 && this.#canvasScale > .1)) {
      canvas.style.left = this.#getPosition(canvas).x - dx + 'px';
      canvas.style.top = this.#getPosition(canvas).y - dy + 'px';
      this.#canvasPosition = this.#getPosition(canvas);
    }
    
    canvas.style.transform = `scale(${this.#canvasScale})`;
    this.#save();
  }

  #handleZoom(event) {
    if (event.ctrlKey || event.shiftKey) return;
    this.zoom(event.deltaY);
  }

  #updateCard(card, isNew = false) {
    var index = card.getAttribute('data-index');
    this.#cards[index].position = this.#getPosition(card);
    this.#cards[index].width = parseInt(card.style.width, 10);
    
    var cardRect = card.getBoundingClientRect();
    this.#cards[index].height = parseInt(cardRect.height, 10) / this.#canvasScale;
    
    if (this.#cards[index].isText()) {
      var text = card.children[1].value + (card.children[1].value.slice(-1) === '\n' ? ' ' : '');
      var [preview, _] = leto.preview.getPreview(text);
      this.#previews[index].innerHTML = preview;
      leto.preview.updateLinksEventListeners();
    }

    if (this.#cards[index].isText()) {
      if (this.#cards[index].text != card.children[1].value) {
        if (!isNew) this.#saveUndoState();
        this.#cards[index].text = card.children[1].value;
      }
    }

    this.#save();
  }

  async #save() {
    const configObject = { cards: this.#cards, scale: this.#canvasScale, position: this.#canvasPosition };
    await writeTextFile(leto.directory.activeFile, JSON.stringify(configObject, null, 2));
  }

  async load(file) {
    this.#isSavingUndoState = false;
    this.#cards = [];
    this.#previews = [];
    canvas.innerHTML = '';

    var fileJson = await readTextFile(leto.directory.activeFile);
    if (fileJson === '') {
      this.#canvasPosition = {x: 0, y: 0};
      this.#canvasScale = 1;
    }
    else {
      var file = JSON.parse(fileJson);
      this.#canvasPosition = {x: file.position.x ?? 0, y: file.position.y ?? 0};
      this.#canvasScale = file.scale;
      file.cards.forEach(card => { this.#createCard(card.position, card.text, card.width, card.imagePath, card.zIndex, card.isInversed, -1); });
    }

    canvas.style.left = this.#canvasPosition.x + 'px';
    canvas.style.top = this.#canvasPosition.y + 'px';
    canvas.style.transform = `scale(${this.#canvasScale})`;
    this.#isSavingUndoState = true;
  }

  reset() {
    this.#undoHistory = [];
    this.#redoHistory = [];
    this.#selectedCards = [];
    this.#cards = [];
    this.#previews = [];
    canvas.innerHTML = '';
  }

  #getPosition(element) {
    return {x: parseFloat(element.style.left), y: parseFloat(element.style.top, 10)};
  }

  #getCursorPosition(event) {
    return {x: event.clientX - (leto.windowManager.sidebarToggled ? 204 : 54), y: event.clientY};
  }

  #screenToCanvasSpace(position) {
    return {x: (position.x - this.#canvasPosition.x) / this.#canvasScale, y: (position.y - this.#canvasPosition.y) / this.#canvasScale};
  }

  #getCardCopy(card) {
    return new Card(card.position, card.text, card.width, card.height, card.imagePath, card.zIndex, card.isInversed);
  }

  #clamp(number, min, max) {
    if (number > max) number = max;
    else if (number < min) number = min;
    return number;
  }
}

class Card {
  constructor(position, text, width, height, imagePath = '', zIndex, isInversed = false) {
    this.position = position;
    this.text = text;
    this.width = width;
    this.height = height;
    this.imagePath = imagePath;
    this.zIndex = zIndex;
    this.isInversed = isInversed;
  }

  isText() {
    return this.imagePath == '';
  }
}