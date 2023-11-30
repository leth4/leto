'use strict';

const { writeTextFile, readTextFile } = window.__TAURI__.fs;
const { convertFileSrc } = window.__TAURI__.tauri;

const container = document.getElementById('canvas-container');
const canvas = document.getElementById('canvas');

export default class Canvas {
  #draggedItem;
  #previousCursorPosition;
  #isDraggingArrow;
  #activeArrowIndex;
  #startDragPosition;

  #canvasScale = 1;
  #canvasPosition = {x: 0, y: 0};

  #cards = [];
  #arrows = [];
  #previews = [];
  
  #selectedCards = [];
  #copiedCards = [];

  #selectedArrows = [];
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

  #undo(event) {
    if (document.activeElement.nodeName == 'TEXTAREA') return;
    event.preventDefault();

    const command = this.#undoCommands.pop();
    if (!command) return;
    this.#redoCommands.push(command);
    this.#handleUndoRedoCommand(command.inverse);
  }

  #redo(event) {
    if (document.activeElement.nodeName == 'TEXTAREA') return;
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
    if (command.type == 'create') {
      const card = command.card;
      this.#createCard(card.position, card.text, card.width, card.imagePath, command.index, false);
    }
    if (command.type == 'delete') {
      const cards = document.getElementsByClassName('card');
      for (let i = 0; i < cards.length; i++) {
        if (cards[i].getAttribute('data-index') != command.index) continue;
        this.#deselectAllCards();
        this.#setSelected(cards[i]);
        this.deleteSelected(false);
      }
    }
  }

  hasCopiedCards() {
    return this.#copiedCards.length > 0;
  }

  hasMultipleSelected() {
    return this.#selectedCards.length >= 2;
  }

  #handleKeyPress(event) {
    if (event.ctrlKey && event.code === 'Space') this.createEmptyCard();
    if (!event.ctrlKey && event.code === 'Delete' || event.code === 'Backspace') this.deleteSelected();
    if (event.ctrlKey && event.code === 'KeyX') {this.copySelectedCards(); this.deleteSelected();} 
    if (event.ctrlKey && event.code === 'KeyC') this.copySelectedCards();
    if (event.ctrlKey && event.code === 'KeyV') this.pasteCopiedCards();
    if (event.ctrlKey && event.code === 'KeyA') this.#selectAllCards();
    if (event.ctrlKey && event.code === 'KeyZ') this.#undo(event);
    if (event.ctrlKey && event.code === 'KeyY') this.#redo(event);
  }
  
  createEmptyCard() {
    this.#createCard(this.#screenToCanvasSpace(this.#previousCursorPosition), '', 200);
  }

  deleteSelected(saveUndo = true) {
    if (document.activeElement.nodeName == 'TEXTAREA') return;
    
    this.#selectedArrows.forEach(arrow => {
      var index = arrow.getAttribute('data-index');
      this.#arrows.splice(index, 1);
      arrow.parentElement.remove();
      var arrowElements = canvas.getElementsByClassName('arrow');
      for (let i = 0; i < arrowElements.length; i++) {
        var arrowIndex = arrowElements[i].getAttribute('data-index');
        if (arrowIndex > index) arrowElements[i].setAttribute('data-index', arrowIndex - 1); 
      }
    });

    this.#selectedCards.forEach(card => {
      var index = card.getAttribute('data-index');

      if (saveUndo) this.#undoCommands.push({
          action: {type: 'delete', index: index},
          inverse: {type: 'create', index: index, card: this.#getCardCopy(this.#cards[index])}
      });

      this.#cards.splice(index, 1);
      this.#previews.splice(index, 1);
      for (let i = this.#arrows.length - 1; i >= 0; i--) {
        if (this.#arrows[i].toIndex == index || this.#arrows[i].fromIndex == index) {
          this.#arrows.splice(i, 1);
          const arrowElements = canvas.getElementsByClassName('arrow');
          for (let j = 0; j < arrowElements.length; j++) {
            var arrowIndex = arrowElements[j].getAttribute('data-index');
            if (arrowIndex == i) arrowElements[j].parentElement.remove();
            else if (arrowIndex > i) arrowElements[j].setAttribute('data-index', arrowIndex - 1);
          }
        }
      }
      card.remove();
      const cardElements = canvas.getElementsByClassName('card');
      for (let i = 0; i < cardElements.length; i++) {
        var cardIndex = parseInt(cardElements[i].getAttribute('data-index'));
        if (cardIndex > index) cardElements[i].setAttribute('data-index', cardIndex - 1); 
      }
      for (let i = 0; i < this.#arrows.length; i++) {
        if (this.#arrows[i].toIndex > index) this.#arrows[i].toIndex -= 1; 
        if (this.#arrows[i].fromIndex > index) this.#arrows[i].fromIndex -= 1; 
      }
    });
    this.#updateArrows();
    this.#save();
  }

  #setSelected(card) {
    if (this.#selectedCards.includes(card)) return;
    card.classList.add('selected');
    this.#selectedCards.push(card);
  }

  copySelectedCards() {
    this.#copiedCards = [];
    this.#selectedCards.forEach(selectedCard => {
      var index = selectedCard.getAttribute('data-index');
      var card = this.#cards[index];
      this.#copiedCards.push(new Card(card.position, card.text, card.width, card.height, card.imagePath));
    });
  }

  pasteCopiedCards() {
    this.#copiedCards.forEach(card => this.#createCard(this.#screenToCanvasSpace(this.#previousCursorPosition), card.text, card.width, card.imagePath));
  }

  alignSelectedVertically() {
    if (this.#selectedCards.length < 2) return;
    this.#selectedCards.sort((a, b) => this.#cards[a.getAttribute('data-index')].position.y - this.#cards[b.getAttribute('data-index')].position.y);
    for (let i = 1; i < this.#selectedCards.length; i++) {
      var previousCard = this.#cards[this.#selectedCards[i - 1].getAttribute('data-index')];
      this.#selectedCards[i].style.left = previousCard.position.x + 'px';
      this.#selectedCards[i].style.top = previousCard.position.y + previousCard.height + 25 + 'px'; 
      this.#updateCard(this.#selectedCards[i]);
    }
    this.#updateArrows();
    this.#save();
  }
  
  alignSelectedHorizontally() {
    if (this.#selectedCards.length < 2) return;
    this.#selectedCards.sort((a, b) => this.#cards[a.getAttribute('data-index')].position.x - this.#cards[b.getAttribute('data-index')].position.x);
    for (let i = 1; i < this.#selectedCards.length; i++) {
      var previousCard = this.#cards[this.#selectedCards[i - 1].getAttribute('data-index')];
      this.#selectedCards[i].style.top = previousCard.position.y + 'px';
      this.#selectedCards[i].style.left = previousCard.position.x + previousCard.width + 45 + 'px'; 
      this.#updateCard(this.#selectedCards[i]);
    }
    this.#updateArrows();
    this.#save();
  }

  #deselectAllCards() {
    this.#selectedCards.forEach(card => card.classList.remove('selected'));
    this.#selectedCards = [];
  }

  #deselectAllArrows() {
    this.#selectedArrows.forEach(arrow => arrow.classList.remove('selected'));
    this.#selectedArrows = [];
  }

  #selectAllCards() {
    this.#selectedCards = [];
    const cardElements = canvas.getElementsByClassName('card');
    for (let i = 0; i < cardElements.length; i++) {
      this.#setSelected(cardElements[i]);
    }
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

  #createArrow(fromIndex, toIndex, toPosition) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.classList.add('arrow');
    svg.appendChild(line);
    canvas.appendChild(svg);

    this.#arrows.push(new Arrow(fromIndex, toIndex));
    this.#arrows[this.#arrows.length - 1].toPosition = toPosition;
    line.setAttribute('data-index', this.#arrows.length - 1);

    line.addEventListener('click', event => {
      if (!event.shiftKey) this.#deselectAllArrows();
      if (!this.#selectedCards.includes(line)) {
        this.#selectedArrows.push(line);
        line.classList.add('selected');
      }
    });

    this.#updateArrows();

    this.#save();
  }

  #updateArrows() {
    const arrows = document.getElementsByClassName('arrow');
    for (let i = 0; i < arrows.length; i++) {
      const arrow = this.#arrows[arrows[i].getAttribute('data-index')];

      arrows[i].style.pointerEvents = arrow.toIndex == -1 ? 'none' : 'auto';
      
      var fromPosition = {x: this.#cards[arrow.fromIndex].position.x, y: this.#cards[arrow.fromIndex].position.y};
      var toPosition = arrow.toIndex == -1 ? arrow.toPosition : this.#cards[arrow.toIndex].position;
      var fromSize = {x: this.#cards[arrow.fromIndex].width + 23, y: this.#cards[arrow.fromIndex].height};
      var toSize = arrow.toIndex == -1 ? null : {x: this.#cards[arrow.toIndex].width + 23, y: this.#cards[arrow.toIndex].height};
      [fromPosition, toPosition] = this.#setArrowPosition(fromPosition, fromSize, toPosition, toSize);

      arrows[i].setAttribute('x1', fromPosition.x + 5000);
      arrows[i].setAttribute('y1', fromPosition.y + 5000);
      arrows[i].setAttribute('x2', toPosition.x + 5000);
      arrows[i].setAttribute('y2', toPosition.y + 5000);
    }
  }

  #handleMouseDown(event) {
    if (event.target.classList.contains('card')) {
      this.#draggedItem = event.target;
      if (event.button == 1) {
        this.#isDraggingArrow = true;
        this.#createArrow(event.target.getAttribute('data-index'), -1, this.#screenToCanvasSpace({x: event.clientX - 204, y: event.clientY}));
        this.#activeArrowIndex = this.#arrows.length - 1;
      }
      if (!event.shiftKey && event.button == 0 && (this.#selectedCards.length < 2 || !this.#selectedCards.includes(event.target))) this.#deselectAllCards()
      this.#setSelected(event.target);
    } else if (event.target == container && event.button == 0) {
      if (!event.shiftKey) this.#deselectAllArrows();
      this.#updateArrows();
      this.#deselectAllCards();
      this.#draggedItem = canvas;
      container.style.cursor = 'grabbing';
    } else if (event.target.classList.contains('handle')) {
      this.#draggedItem = event.target;
      container.style.cursor = 'e-resize';
    } else return;
    this.#startDragPosition = this.#getPosition(this.#draggedItem);
    this.#previousCursorPosition = {x: event.clientX - 204, y: event.clientY};
  }

  #handleMouseMove(event) {
    var cursorPosition = {x: event.clientX - 204, y: event.clientY};
    if (this.#draggedItem == null) {
      document.querySelector(':root').style.setProperty('--cards-pointer-events', event.ctrlKey ? 'none' : 'auto');
      this.#previousCursorPosition = cursorPosition;
      return;
    }
    if (this.#isDraggingArrow) {
      this.#arrows[this.#activeArrowIndex].toPosition = this.#screenToCanvasSpace({x: event.clientX - 204, y: event.clientY});
    }
    else if (this.#draggedItem.classList.contains('handle')) {
      if (this.#draggedItem.classList.contains('handle-right')) {
        var newWidth = this.#screenToCanvasSpaceX(event.clientX - 204) - this.#getPosition(this.#draggedItem.parentElement).x - 20;
        if (newWidth > 500) newWidth = 500;
        if (newWidth < 100) newWidth = 100;
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
      canvas.style.left = this.#getPosition(canvas).x + (cursorPosition.x - this.#previousCursorPosition.x) + 'px';
      canvas.style.top = this.#getPosition(canvas).y + (cursorPosition.y - this.#previousCursorPosition.y) + 'px';
      this.#canvasPosition = this.#getPosition(canvas);
    } else {
      this.#selectedCards.forEach(card => {
        card.style.left = this.#getPosition(card).x + (cursorPosition.x - this.#previousCursorPosition.x) / this.#canvasScale + 'px';
        card.style.top = this.#getPosition(card).y + (cursorPosition.y - this.#previousCursorPosition.y) / this.#canvasScale + 'px';
        this.#updateCard(card);
      });
    }
    
    if (this.#draggedItem.classList.contains('card')) this.#updateCard(this.#draggedItem);
    this.#updateArrows();
    this.#previousCursorPosition = cursorPosition;
  }

  #handleMouseUp(event) {
    if (this.#draggedItem == null) return;
    if (this.#isDraggingArrow) {
      if (event.target.classList.contains('card')) {
        this.#arrows[this.#activeArrowIndex].toIndex = parseInt(event.target.getAttribute('data-index'), 10);
      }
      else {
        this.createEmptyCard(event);
        this.#arrows[this.#activeArrowIndex].toIndex = this.#cards.length - 1;
      }
      this.#isDraggingArrow = false;  
    }
    if (this.#draggedItem.classList.contains('card')) {
      this.#updateCard(this.#draggedItem);
      var cardPosition = this.#getPosition(this.#draggedItem);
      if (!event.shiftKey && event.button == 0 && cardPosition.x == this.#startDragPosition.x && cardPosition.y ==  this.#startDragPosition.y) this.#deselectAllCards()
      this.#setSelected(this.#draggedItem);
      this.#undoCommands.push({
        action: {type: 'move', position: cardPosition, index: parseInt(this.#draggedItem.getAttribute('data-index'), 10)},
        inverse: {type: 'move', position: this.#startDragPosition, index: parseInt(this.#draggedItem.getAttribute('data-index'), 10)}
      });
    }
    container.style.cursor = 'auto';
    this.#updateArrows();
    this.#draggedItem = null;
  }

  #createCard(position, text, width, imagePath = '', atIndex = -1, saveUndo = true) {
    var newCard = document.createElement('div');
    newCard.classList.add('card');

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

    
    if (atIndex == -1) {
      newCard.setAttribute("data-index", this.#cards.length);
      this.#cards.push(new Card({x: newCard.style.left, y: newCard.style.top}, ''));
      this.#cards[this.#cards.length - 1].imagePath = imagePath;
    }
    else {
      this.#cards.splice(atIndex, 0, new Card({x: newCard.style.left, y: newCard.style.top}, ''));
      this.#cards[atIndex].imagePath = imagePath;
      const cardElements = canvas.getElementsByClassName('card');
      for (let i = 0; i < cardElements.length; i++) {
        var cardIndex = parseInt(cardElements[i].getAttribute('data-index'), 10);
        if (cardIndex >= atIndex) cardElements[i].setAttribute('data-index', cardIndex + 1); 
      }
      for (let i = 0; i < this.#arrows.length; i++) {
        if (this.#arrows[i].toIndex >= atIndex) this.#arrows[i].toIndex += 1; 
        if (this.#arrows[i].fromIndex >= atIndex) this.#arrows[i].fromIndex += 1; 
      }
      newCard.setAttribute("data-index", atIndex);
    }

    if (saveUndo) this.#undoCommands.push({
      action: {type: 'create', index: atIndex == -1 ? this.#cards.length - 1 : atIndex, card: new Card(position, text, width, 200, imagePath)},
      inverse: {type: 'delete', index: atIndex == -1 ? this.#cards.length - 1 : atIndex }
    });
    
    this.#updateCard(newCard);
  }

  #handleZoom(event) {
    this.#canvasScale -= event.deltaY * 0.001;
    if (this.#canvasScale > 3) this.#canvasScale = 3;
    if (this.#canvasScale < 0.2) this.#canvasScale = 0.2; 
    canvas.style.transform = `scale(${this.#canvasScale})`;
  }

  #updateCard(card) {
    var index = card.getAttribute('data-index');
    this.#cards[index].position = this.#getPosition(card);
    if (this.#cards[index].isText()) this.#cards[index].text = card.children[1].value;
    this.#cards[index].width = parseInt(card.style.width, 10);
    
    var cardRect = card.getBoundingClientRect();
    this.#cards[index].height = parseInt(cardRect.height, 10) / this.#canvasScale;

    if (this.#cards[index].isText()) {
      var text = card.children[1].value + (card.children[1].value.slice(-1) === '\n' ? ' ' : '');
      var [preview, _] = leto.preview.getPreview(text);
      this.#previews[index].innerHTML = preview;
      leto.preview.updateLinksEventListeners();
    }

    this.#save();
  }

  async #save() {
    const configObject = { cards: this.#cards, arrows: this.#arrows };
    await writeTextFile(leto.directory.activeFile, JSON.stringify(configObject, null, 2));
  }

  async load(file) {
    canvas.style.left = '0px';
    canvas.style.top = '0px';
    var fileJson = await readTextFile(leto.directory.activeFile);
    var file = JSON.parse(fileJson);
    canvas.innerHTML = '';
    this.#cards = [];
    this.#arrows = [];
    this.#previews = [];
    file.cards.forEach(card => { this.#createCard(card.position, card.text, card.width, card.imagePath); });
    file.arrows.forEach(arrow => { this.#createArrow(arrow.fromIndex, arrow.toIndex); });
  }

  #setArrowPosition(from, fromSize, to, toSize) {
    var minDistance = Infinity;
    var minPoints = [];

    var fromPoints = this.#getAnchorPoints(from, fromSize);
    var toPoints = toSize == null ? [to] : this.#getAnchorPoints(to, toSize);

    for (let i = 0; i < fromPoints.length; i++) {
      for (let j = 0; j < toPoints.length; j++) {
        var distance = this.#getSquaredDistance(fromPoints[i], toPoints[j]);
        if (distance < minDistance) {
          minDistance = distance; 
          minPoints = [fromPoints[i], toPoints[j]];
        }
      } 
    }

    return minPoints;
  }

  #getAnchorPoints(position, size) {
    return [{x: position.x + size.x / 2, y: position.y},
            {x: position.x + size.x / 2, y: position.y + size.y},
            {x: position.x, y: position.y + size.y / 2},
            {x: position.x + size.x, y: position.y + size.y / 2}];
  }

  #getPosition(element) {
    return {x: parseInt(element.style.left, 10), y: parseInt(element.style.top, 10)};
  }

  #getSquaredDistance(from, to) {
    return (from.x - to.x) ** 2 + (from.y - to.y) ** 2;
  }

  #screenToCanvasSpaceX(x) {
    return (x - this.#canvasPosition.x) / this.#canvasScale;
  }

  #screenToCanvasSpace(position) {
    return {x: (position.x - this.#canvasPosition.x) / this.#canvasScale, y: (position.y - this.#canvasPosition.y) / this.#canvasScale};
  }

  #getCardCopy(card) {
    return new Card(card.position, card.text, card.width, card.height, card.imagePath);
  }
}

class Card {
  constructor(position, text, width, height, imagePath = '') {
    this.position = position;
    this.text = text;
    this.width = width;
    this.height = height;
    this.imagePath = imagePath;
  }

  isText() {
    return this.imagePath == '';
  }
}

class Arrow {
  constructor(fromIndex, toIndex) {
    this.fromIndex = fromIndex;
    this.toIndex = toIndex;
    this.toPosition;
  }
}