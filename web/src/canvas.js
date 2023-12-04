'use strict';

const { writeTextFile, readTextFile } = window.__TAURI__.fs;
const { convertFileSrc } = window.__TAURI__.tauri;

const container = document.getElementById('canvas-container');
const canvas = document.getElementById('canvas');
const boxSelection = document.getElementById('box-selection');

export default class Canvas {

  #draggedItem;
  #previousCursorPosition;
  #startDragPosition;
  #startDragWidth;

  #isBoxSelecting;
  #previouslySelectedCards;

  #canvasScale = 1;
  #canvasPosition = {x: 0, y: 0};

  #cards = [];
  #previews = [];
  
  #selectedCards = [];
  #copiedCards = [];

  #undoCommands = [];
  #redoCommands = [];

  constructor() {
    container.addEventListener('mousedown', event => this.#handleMouseDown(event))
    container.addEventListener('mousemove', event => this.#handleMouseMove(event));
    container.addEventListener('mouseup', event => this.#handleMouseUp(event));
    container.addEventListener('wheel', event => this.#handleZoom(event));
    document.addEventListener('keydown', event => this.#handleKeyPress(event));

    container.addEventListener('dragenter', event => event.preventDefault());
    container.addEventListener('dragover', event => event.preventDefault());
    container.addEventListener('drop', event => this.#handleDrop(event));
  }

  #handleKeyPress(event) {
    if (event.ctrlKey && event.code === 'Space') this.createEmptyCard();
    if (!event.ctrlKey && event.code === 'Delete' || event.code === 'Backspace') this.deleteSelectedCards();
    if (event.ctrlKey && event.code === 'KeyX') {this.copySelectedCards(); this.deleteSelectedCards();} 
    if (event.ctrlKey && event.code === 'KeyC') this.copySelectedCards();
    if (event.ctrlKey && event.code === 'KeyV') this.pasteCopiedCards();
    if (event.ctrlKey && event.code === 'KeyA') this.#selectAllCards();
    if (event.ctrlKey && event.code === 'KeyZ') this.#undo(event);
    if (event.ctrlKey && event.code === 'KeyY') this.#redo(event);
    if (event.ctrlKey && event.code === 'KeyI') this.inverseSelectedCards();
  }

  #undo(event) {
    event.preventDefault();

    const command = this.#undoCommands.pop();
    if (!command) return;
    this.#redoCommands.push(command);
    this.#handleUndoRedoCommand(command.inverse);
  }

  #redo(event) {
    event.preventDefault();

    const command = this.#redoCommands.pop();
    if (!command) return;
    this.#undoCommands.push(command);
    this.#handleUndoRedoCommand(command.action);
  }

  #handleUndoRedoCommand(command) {
    if (command.type == 'move') {
      const cards = document.getElementsByClassName('card');
      for (let i = 0; i < cards.length; i++) {
        if (cards[i].getAttribute('data-index') != command.index) continue;
        cards[i].style.left = command.position.x + 'px';
        cards[i].style.top = command.position.y + 'px';
      }
    }
    if (command.type == 'edit') {
      const cards = document.getElementsByClassName('card');
      for (let i = 0; i < cards.length; i++) {
        if (cards[i].getAttribute('data-index') != command.index) continue;
        cards[i].children[1].value = command.text;
        this.#updateCard(cards[i], false);
      }
    }
    if (command.type == 'resize') {
      const cards = document.getElementsByClassName('card');
      for (let i = 0; i < cards.length; i++) {
        if (cards[i].getAttribute('data-index') != command.index) continue;
        cards[i].style.width = command.width + 'px';
        cards[i].style.left = command.position.x + 'px';
      }
    }
    if (command.type == 'sendZIndex') {
      const cards = document.getElementsByClassName('card');
      for (let i = 0; i < cards.length; i++) {
        if (cards[i].getAttribute('data-index') != command.index) continue;
        this.#setCardZIndex(cards[i], command.zIndex, false);
      }
    }
    if (command.type == 'inverse') {
      const cards = document.getElementsByClassName('card');
      for (let i = 0; i < cards.length; i++) {
        if (cards[i].getAttribute('data-index') != command.index) continue;
        this.#inverseCard(cards[i], false);
      }
    }
    if (command.type == 'create') {
      const card = command.card;
      this.#createCard(card.position, card.text, card.width, card.imagePath, card.zIndex, card.isInversed, command.index, false);
    }
    if (command.type == 'delete') {
      const cards = document.getElementsByClassName('card');
      for (let i = 0; i < cards.length; i++) {
        if (cards[i].getAttribute('data-index') != command.index) continue;
        this.#deselectAllCards();
        this.#setSelected(cards[i]);
        this.deleteSelectedCards(false);
      }
    }
    this.#deselectAllCards();
  }

  hasCopiedCards() {
    return this.#copiedCards.length > 0;
  }

  hasMultipleSelected() {
    return this.#selectedCards.length >= 2;
  }
  
  createEmptyCard() {
    this.#createCard(this.#screenToCanvasSpace(this.#previousCursorPosition), '', 200);
  }

  sendSelectedToFront() {
    this.#selectedCards.forEach(card => this.#setCardZIndex(card, 100 + this.#cards.length));
  }

  sendSelectedToBack() {
    this.#selectedCards.forEach(card => this.#setCardZIndex(card, 100));
  }

  #setCardZIndex(card, newZIndex, saveUndo = true) {
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

      if (saveUndo) this.#undoCommands.push({
        action: {type: 'sendZIndex', index: card.getAttribute('data-index'), zIndex: newZIndex},
        inverse: {type: 'sendZIndex', index: card.getAttribute('data-index'), zIndex: oldZIndex}
      });
    }
    card.style.zIndex = newZIndex;
    this.#cards[card.getAttribute('data-index')].zIndex = newZIndex;
    this.#save();
  }

  deleteSelectedCards(saveUndo = true) {
    if (document.activeElement.nodeName == 'TEXTAREA') return;

    this.#selectedCards.forEach(card => {
      var index = card.getAttribute('data-index');

      if (saveUndo) this.#undoCommands.push({
          action: {type: 'delete', index: index},
          inverse: {type: 'create', index: index, card: this.#getCardCopy(this.#cards[index])}
      });

      this.#cards.splice(index, 1);
      this.#previews.splice(index, 1);
      card.remove();
      const cardElements = canvas.getElementsByClassName('card');
      for (let i = 0; i < cardElements.length; i++) {
        var cardIndex = parseInt(cardElements[i].getAttribute('data-index'));
        if (cardIndex > index) cardElements[i].setAttribute('data-index', cardIndex - 1); 
      }
    });
    this.#save();
  }

  inverseSelectedCards() {
    this.#selectedCards.forEach(card => this.#inverseCard(card));
  }

  #inverseCard(card, saveUndo = true) {
    var index = card.getAttribute('data-index');
    this.#cards[index].isInversed = !this.#cards[index].isInversed;
    this.#cards[index].isInversed ? card.classList.add('inversed') : card.classList.remove('inversed');
    if (saveUndo) this.#undoCommands.push({
      action: {type: 'inverse', index: parseInt(card.getAttribute('data-index'), 10)},
      inverse: {type: 'inverse', index: parseInt(card.getAttribute('data-index'), 10)}
    });
    this.#save();
  }

  #deselectAllCards() {
    this.#selectedCards.forEach(card => card.classList.remove('selected'));
    this.#selectedCards = [];
  }

  #selectAllCards() {
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
    if (this.#selectedCards.length < 2) return;
    this.#selectedCards.sort((a, b) => this.#cards[a.getAttribute('data-index')].position.y - this.#cards[b.getAttribute('data-index')].position.y);
    for (let i = 1; i < this.#selectedCards.length; i++) {
      var previousCard = this.#cards[this.#selectedCards[i - 1].getAttribute('data-index')];
      this.#moveCardToPosition(this.#selectedCards[i], {x: previousCard.position.x, y: previousCard.position.y + previousCard.height + 25});
    }
  }
  
  alignSelectedHorizontally() {
    if (this.#selectedCards.length < 2) return;
    this.#selectedCards.sort((a, b) => this.#cards[a.getAttribute('data-index')].position.x - this.#cards[b.getAttribute('data-index')].position.x);
    for (let i = 1; i < this.#selectedCards.length; i++) {
      var previousCard = this.#cards[this.#selectedCards[i - 1].getAttribute('data-index')];
      this.#moveCardToPosition(this.#selectedCards[i], {x: previousCard.position.x + previousCard.width + 45, y: previousCard.position.y});
    }
  }

  #moveCardToPosition(card, position) {
    var previousPosition = this.#getPosition(card);
    card.style.left = position.x + 'px'; 
    card.style.top = position.y + 'px';
    this.#updateCard(card);
    this.#undoCommands.push({
      action: {type: 'move', position: position, index: parseInt(card.getAttribute('data-index'), 10)},
      inverse: {type: 'move', position: previousPosition, index: parseInt(card.getAttribute('data-index'), 10)}
    });
    this.#save();
  }

  async #handleDrop(event) {
    var filePath = event.dataTransfer.getData('text/path');
    if (leto.directory.isFileAnImage(filePath)) {
      this.#createCard({x: event.clientX - 204, y: event.clientY}, '', 200, filePath);
    }
    else if (leto.directory.isFileANote(filePath)) {
      this.#createCard({x: event.clientX - 204, y: event.clientY}, await readTextFile(filePath), 200);
    }
  }

  #handleMouseDown(event) {
    this.#previousCursorPosition = {x: event.clientX - 204, y: event.clientY};
    if (event.target.classList.contains('card')) {
      this.#draggedItem = event.target;
      var isSelected = this.#selectedCards.includes(event.target);
      if (!event.shiftKey && (this.#selectedCards.length < 2 || !isSelected)) this.#deselectAllCards()
      if (!event.shiftKey || !isSelected) this.#setSelected(event.target);
      else this.#setDeselected(event.target);
      this.#startDragPosition = this.#getPosition(this.#draggedItem);
    } else if (event.target == container && event.button == 0) {
      this.#deselectAllCards();
      this.#draggedItem = canvas;
      container.style.cursor = 'grabbing';
      this.#startDragPosition = this.#getPosition(this.#draggedItem);
    } else if (event.target == container && event.button == 1) {
      this.#isBoxSelecting = true;
      this.#previouslySelectedCards = event.shiftKey ? [...this.#selectedCards] : [];
      boxSelection.style.display = 'block';
      this.#startDragPosition = this.#previousCursorPosition;
      boxSelection.style.left = this.#previousCursorPosition.x + 'px';
      boxSelection.style.top = this.#previousCursorPosition.y + 'px';
      boxSelection.style.width = '0px';
      boxSelection.style.height = '0px';
    } else if (event.target.classList.contains('handle')) {
      this.#draggedItem = event.target;
      this.#startDragWidth = parseInt(event.target.parentElement.style.width, 10);
      this.#startDragPosition = this.#getPosition(this.#draggedItem.parentElement);
      container.style.cursor = 'e-resize';
    }
  }

  #handleMouseMove(event) {
    var cursorPosition = {x: event.clientX - 204, y: event.clientY};
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
        var newWidth = this.#screenToCanvasSpaceX(event.clientX - 204) - this.#getPosition(this.#draggedItem.parentElement).x - 20;
        newWidth = this.#clamp(newWidth, 100, 500);
        this.#draggedItem.parentElement.style.width = newWidth + 'px';
      }
      else {
        var previousLeft = this.#getPosition(this.#draggedItem.parentElement).x;
        this.#draggedItem.parentElement.style.left = this.#screenToCanvasSpaceX(event.clientX - 204) + 'px';
        var newLeft = this.#getPosition(this.#draggedItem.parentElement).x;
        var newWidth = parseInt(this.#draggedItem.parentElement.style.width, 10) - newLeft + previousLeft;
        if (newWidth > 500 || newWidth < 100) this.#draggedItem.parentElement.style.left = previousLeft + 'px';
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
    }
    if (this.#draggedItem == null) return;
    if (this.#draggedItem.classList.contains('card')) {
      this.#updateCard(this.#draggedItem);
      const cardPosition = this.#getPosition(this.#draggedItem);
      const hasMoved = cardPosition.x != this.#startDragPosition.x || cardPosition.y !=  this.#startDragPosition.y;
      if (!event.shiftKey && event.button == 0 && !hasMoved) {
        this.#deselectAllCards()
        this.#setSelected(this.#draggedItem);
      }
      if (hasMoved) this.#undoCommands.push({
        action: {type: 'move', position: cardPosition, index: parseInt(this.#draggedItem.getAttribute('data-index'), 10)},
        inverse: {type: 'move', position: this.#startDragPosition, index: parseInt(this.#draggedItem.getAttribute('data-index'), 10)}
      });
    }
    else if (this.#draggedItem.classList.contains('handle')) {
      this.#undoCommands.push({
        action: {type: 'resize', position: this.#getPosition(this.#draggedItem.parentElement), width: parseInt(this.#draggedItem.parentElement.style.width, 10), index: parseInt(this.#draggedItem.parentElement.getAttribute('data-index'), 10)},
        inverse: {type: 'resize', position: this.#startDragPosition, width: this.#startDragWidth, index: parseInt(this.#draggedItem.parentElement.getAttribute('data-index'), 10)}
      });
    }
    container.style.cursor = 'auto';
    this.#draggedItem = null;
  }

  #handleBoxSelection() {
    this.#deselectAllCards();
    var selectionRect = boxSelection.getBoundingClientRect();
    var cards = document.getElementsByClassName('card');
    for (let i = 0; i < cards.length; i++) {
      const cardRect = cards[i].getBoundingClientRect();
      if (selectionRect.left < cardRect.right && selectionRect.right > cardRect.left && selectionRect.top < cardRect.bottom && selectionRect.bottom > cardRect.top) {
        this.#previouslySelectedCards.includes(cards[i]) ? this.#setDeselected(cards[i]) : this.#setSelected(cards[i]);
      } else if (this.#previouslySelectedCards.includes(cards[i])) {
        this.#setSelected(cards[i]);
      }
    }
  }

  #createCard(position, text, width, imagePath = '', zIndex = 100 + this.#cards.length, isInversed = false, atIndex = -1, saveUndo = true) {
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

    if (saveUndo) this.#undoCommands.push({
      action: {type: 'create', index: atIndex == -1 ? this.#cards.length - 1 : atIndex, card: new Card(position, text, width, 200, imagePath, zIndex, isInversed)},
      inverse: {type: 'delete', index: atIndex == -1 ? this.#cards.length - 1 : atIndex }
    });
    
    this.#updateCard(newCard);

    return newCard;
  }

  #handleZoom(event) {
    var factor = 0.9;
    if (event.deltaY < 0) factor = 1 / factor;

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
  }

  #updateCard(card, saveUndo = true) {
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
        if (saveUndo) this.#undoCommands.push({
          action: {type: 'edit', index: index, text: card.children[1].value},
          inverse: {type: 'edit', index: index, text: this.#cards[index].text}
        });
        this.#cards[index].text = card.children[1].value;
      }
    }

    this.#save();
  }

  async #save() {
    const configObject = { cards: this.#cards };
    await writeTextFile(leto.directory.activeFile, JSON.stringify(configObject, null, 2));
  }

  async load(file) {
    canvas.style.left = '0px';
    canvas.style.top = '0px';
    var fileJson = await readTextFile(leto.directory.activeFile);
    var file = JSON.parse(fileJson);
    canvas.innerHTML = '';
    this.#cards = [];
    this.#previews = [];
    file.cards.forEach(card => { this.#createCard(card.position, card.text, card.width, card.imagePath, card.zIndex, card.isInversed, -1, false); });
  }

  #getPosition(element) {
    return {x: parseInt(element.style.left, 10), y: parseInt(element.style.top, 10)};
  }

  #screenToCanvasSpaceX(x) {
    return (x - this.#canvasPosition.x) / this.#canvasScale;
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