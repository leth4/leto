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
  
  #canvasScale = 1;
  #canvasPosition = {x: 0, y: 0};
  #fontSize;
  
  #cards = [];
  #previews = [];
  #arrows = [];
  
  #selectedArrow;
  #selectedCards = [];
  #copiedCards = [];
  
  #undoHistory = []
  #redoHistory = [];
  #isSavingUndoState = true;
  #isLoading = false;
  #isFullyLoaded = false;
  #isSaving = false;
  #savePending = false;

  #currentDrawPath = null;
  #currentPathPoints = [];
  #isErasing = false;

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
    this.#saveUndoState(true);
    this.#applyUndoState(state);
  }

  #applyUndoState(state) {
    this.#isSavingUndoState = false;
    this.#cards = [];
    this.#arrows = [];
    this.#previews = [];
    this.#selectedCards = [];
    canvas.innerHTML = '';

    state.cards.forEach(card => this.#createCard(card.position, card.text, card.width, card.imagePath, card.zIndex, card.isInversed, -1, card.isDrawCard, card.height, card.drawPaths));
    state.arrows.forEach(arrow => this.#createArrow(arrow.fromIndex, arrow.toIndex));

    this.#isSavingUndoState = true;
  }

  #saveUndoState(fromRedo = false) {
    if (!this.#isSavingUndoState) return;
    if (!fromRedo) this.#redoHistory = [];
    var stateCards = [];
    var stateArrows = [];
    this.#cards.forEach(card => stateCards.push(this.#getCardCopy(card)));
    this.#arrows.forEach(arrow => stateArrows.push(this.#getArrowCopy(arrow)));
    this.#undoHistory.push({cards: stateCards, arrows: stateArrows});
  }

  #saveRedoState() {
    var stateCards = [];
    var stateArrows = [];
    this.#cards.forEach(card => stateCards.push(this.#getCardCopy(card)));
    this.#arrows.forEach(arrow => stateArrows.push(this.#getArrowCopy(arrow)));
    this.#redoHistory.push({cards: stateCards, arrows: stateArrows});
  }

  #removeLastUndoState() {
    this.#undoHistory.pop();
  }

  #redrawArrows() {
    var arrowElements = document.getElementsByClassName('arrow');
    for (let i = arrowElements.length - 1; i >= 0; i--) {
      arrowElements[i].parentElement.remove();
    }

    var arrowsCopy = [];
    this.#arrows.forEach(arrow => arrowsCopy.push(this.#getArrowCopy(arrow)));
    
    this.#arrows = [];

    arrowsCopy.forEach(arrow => this.#createArrow(arrow.fromIndex, arrow.toIndex));
  }

  hasCopiedCards() {
    return this.#copiedCards.length > 0;
  }

  hasMultipleSelected() {
    return this.#selectedCards.length >= 2;
  }
  
  createEmptyCard(connected = false) {
    this.#saveUndoState();
    var newCard = this.#createCard(this.#screenToCanvasSpace({x: this.#previousCursorPosition.x, y: this.#previousCursorPosition.y}), '', 200);
    newCard.querySelector('textarea').focus();

    if (!connected || this.#selectedCards.length != 1) return;
    this.#createArrow(this.#selectedCards[0].getAttribute('data-index'), this.#cards.length - 1);
  }
  
  createDrawCard(connected = false) {
    this.#saveUndoState();
    this.#createCard(this.#screenToCanvasSpace({x: this.#previousCursorPosition.x, y: this.#previousCursorPosition.y}), '', 300, '', 100 + this.#cards.length, false, -1, true, 300);
  
    if (!connected || this.#selectedCards.length != 1) return;
    this.#createArrow(this.#selectedCards[0].getAttribute('data-index'), this.#cards.length - 1);
  }

  pasteImage(filePath) {
    this.#saveUndoState();
    this.#createCard(this.#screenToCanvasSpace(this.#previousCursorPosition), '', 200, filePath);
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
      var index = parseInt(card.getAttribute('data-index'), 10);
      this.#cards.splice(index, 1);
      this.#previews.splice(index, 1);
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
    this.#saveUndoState();

    if (this.#selectedCards.length == 0) return;

    if (this.#selectedCards.length == 1) {
      var initialCardIndex = this.#selectedCards[0].getAttribute('data-index');
      this.createEmptyCard();
      this.#createArrow(initialCardIndex, this.#cards.length - 1);
      return;
    }

    for (let i = 0; i < this.#selectedCards.length - 1; i++) {
      this.#createArrow(this.#selectedCards[i].getAttribute('data-index'), this.#selectedCards[i + 1].getAttribute('data-index'));
    }
  }

  disconnectSelectedCards() {
    this.#saveUndoState();

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
    this.#saveUndoState();
    this.#removeArrow(this.#selectedArrow);
    this.#save();
  }

  #removeArrow(arrow) {
    var index = arrow.getAttribute('data-index');
    this.#arrows.splice(index, 1);
    this.#redrawArrows();
  }

  reverseSelectedArrow() {
    this.#saveUndoState();
    var index = this.#selectedArrow.getAttribute('data-index');
    this.#createArrow(this.#arrows[index].toIndex, this.#arrows[index].fromIndex);
    this.#save();
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
      var newCard = this.#createCard({x: cursorPosition.x + positionOffset.x, y: cursorPosition.y + positionOffset.y}, card.text, card.width, card.imagePath, this.#cards.length + 100, card.isInversed, -1, card.isDrawCard, card.height, card.drawPaths);
      this.#setSelected(newCard);
    }
  }

  alignSelectedVertically() {
    this.#saveUndoState();
    
    if (this.#selectedCards.length < 2) return;
    this.#selectedCards.sort((a, b) => this.#cards[a.getAttribute('data-index')].position.y - this.#cards[b.getAttribute('data-index')].position.y);
    for (let i = 1; i < this.#selectedCards.length; i++) {
      var previousCard = this.#cards[this.#selectedCards[i - 1].getAttribute('data-index')];
      this.#moveCardToPosition(this.#selectedCards[i], {x: previousCard.position.x, y: previousCard.position.y + previousCard.height + 10});
    }
  }
  
  alignSelectedHorizontally() {
    this.#saveUndoState();

    if (this.#selectedCards.length < 2) return;
    this.#selectedCards.sort((a, b) => this.#cards[a.getAttribute('data-index')].position.x - this.#cards[b.getAttribute('data-index')].position.x);
    for (let i = 1; i < this.#selectedCards.length; i++) {
      var previousCard = this.#cards[this.#selectedCards[i - 1].getAttribute('data-index')];
      this.#moveCardToPosition(this.#selectedCards[i], {x: previousCard.position.x + previousCard.width + 35, y: previousCard.position.y});
    }
  }

  nudgeSelected(xDelta, yDelta) {
    this.#saveUndoState();

    for (let i = 0; i < this.#selectedCards.length; i++) {
      var card = this.#cards[this.#selectedCards[i].getAttribute('data-index')];
      this.#moveCardToPosition(this.#selectedCards[i], {x: card.position.x + xDelta * 3, y: card.position.y + yDelta * 3});
    }
  }

  #moveCardToPosition(card, position) {
    card.style.left = position.x + 'px'; 
    card.style.top = position.y + 'px';
    this.#updateCard(card);
    this.#updateArrows();
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
    if (event.target == container && (event.offsetY < 5 || event.offsetY > container.offsetHeight - 6 || event.offsetX > container.offsetWidth - 6)) return;

    this.#previousCursorPosition = this.#getCursorPosition(event);
    if (event.target.classList.contains('card')) {
      this.#saveUndoState();
      this.#draggedItem = event.target;
      var isSelected = this.#selectedCards.includes(event.target);
      if (!event.shiftKey && (this.#selectedCards.length < 2 || !isSelected)) this.#deselectAllCards()
      if (!event.shiftKey || !isSelected) this.#setSelected(event.target);
      else this.#setDeselected(event.target);
      this.#startDragPosition = this.#getPosition(this.#draggedItem);
    } else if (event.target == container && event.button == 0) {
      this.#startPanning();
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
      this.#saveUndoState();
      this.#draggedItem = event.target;
      this.#startDragPosition = this.#getPosition(this.#draggedItem.parentElement);
      container.style.cursor = event.target.classList.contains('handle-down') ? 'ns-resize' : 'ew-resize';
      this.#draggedItem.parentElement.classList.add('notransition');
    } else if (event.target.classList.contains('draw-svg') && event.button == 0) {
      this.#saveUndoState();
      this.#currentPathPoints = [];
      this.#currentDrawPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      event.target.appendChild(this.#currentDrawPath);
    } else if (event.target.classList.contains('draw-svg') && event.button == 2) {
      canvas.querySelectorAll('path').forEach(path => path.classList.add('interactable'));
      this.#saveUndoState();
      this.#isErasing = true;
    } else if (event.target.classList.contains('draw-svg') && event.button == 1) {
      this.#saveUndoState();
      container.style.cursor = 'grabbing';
      this.#draggedItem = event.target;
    }
  }

  #handleMouseMove(event) {
    var cursorPosition = this.#getCursorPosition(event);

    if (this.#isErasing && event.target.nodeName == 'path') {
      const pathIndex = Array.prototype.indexOf.call(event.target.parentElement.children, event.target);
      const cardIndex = parseInt(event.target.parentElement.parentElement.getAttribute('data-index'));
      this.#cards[cardIndex].drawPaths.splice(pathIndex, 1);
      event.target.remove();
    }

    if (this.#currentDrawPath != null) {
      let d = this.#currentDrawPath.getAttribute('d');
      const cardPosition = this.#getPosition(this.#currentDrawPath.parentElement.parentElement);
      const x = this.#screenToCanvasSpace(cursorPosition).x - cardPosition.x - 12;
      const y = this.#screenToCanvasSpace(cursorPosition).y - cardPosition.y - 25;
      this.#currentDrawPath.setAttribute('d', d ? d + ` L${x},${y}` : `M${x},${y}`);

      if (this.#currentPathPoints.length == 0) {
        this.#currentPathPoints.push([Math.trunc(x), Math.trunc(y)]);
      } else {
        const coords = [Math.trunc(x), Math.trunc(y)];
        const prevCoords = this.#currentPathPoints[this.#currentPathPoints.length - 1];
        const distance = (coords[0] - prevCoords[0]) * (coords[0] - prevCoords[0]) + (coords[1] - prevCoords[1]) * (coords[1] - prevCoords[1]);
        if (distance > 20) this.#currentPathPoints.push([Math.trunc(x), Math.trunc(y)]);
      }
    }
    
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
        var newHeight = this.#screenToCanvasSpace(this.#getCursorPosition(event)).y - this.#getPosition(this.#draggedItem.parentElement).y - 36;
        newHeight = this.#clamp(newHeight, 100, 3000);
        this.#draggedItem.parentElement.style.height = newHeight + 'px';
      } else if (this.#draggedItem.classList.contains('handle-right')) {
        var newWidth = this.#screenToCanvasSpace(this.#getCursorPosition(event)).x - this.#getPosition(this.#draggedItem.parentElement).x - 20;
        newWidth = this.#clamp(newWidth, 100, 3000);
        this.#draggedItem.parentElement.style.width = newWidth + 'px';
      } else {
        var previousLeft = this.#getPosition(this.#draggedItem.parentElement).x;
        this.#draggedItem.parentElement.style.left = this.#screenToCanvasSpace(this.#getCursorPosition(event)).x + 'px';
        var newLeft = this.#getPosition(this.#draggedItem.parentElement).x;
        var newWidth = parseFloat(this.#draggedItem.parentElement.style.width, 10) - newLeft + previousLeft;
        if (newWidth > 3000 || newWidth < 100) this.#draggedItem.parentElement.style.left = previousLeft + 'px';
        else this.#draggedItem.parentElement.style.width = newWidth + 'px';
      }
      this.#updateCard(this.#draggedItem.parentElement);
    } else if (this.#draggedItem == canvas) {
      var newPositionX = this.#getPosition(canvas).x + (cursorPosition.x - this.#previousCursorPosition.x);
      var newPositionY = this.#getPosition(canvas).y + (cursorPosition.y - this.#previousCursorPosition.y);
      canvas.style.left = newPositionX + 'px';
      canvas.style.top = newPositionY + 'px';
      this.#canvasPosition = this.#getPosition(canvas);
    } else if (this.#draggedItem.nodeName == 'svg') {
      const cardIndex = parseInt(this.#draggedItem.parentElement.getAttribute('data-index'));
      for (let i = 0; i < this.#cards[cardIndex].drawPaths.length; i++) {
        var path = this.#cards[cardIndex].drawPaths[i];
        for (let j = 0; j < path.length; j++) {
          var position = this.#screenToCanvasSpace(cursorPosition);
          var previousPosition = this.#screenToCanvasSpace(this.#previousCursorPosition);
          path[j] = [path[j][0] + (position.x - previousPosition.x), path[j][1] + (position.y - previousPosition.y)];
        }
      }
      this.#updateCard(this.#draggedItem.parentElement);
    } else {
      this.#selectedCards.forEach(card => {
        card.style.left = this.#getPosition(card).x + (cursorPosition.x - this.#previousCursorPosition.x) / this.#canvasScale + 'px';
        card.style.top = this.#getPosition(card).y + (cursorPosition.y - this.#previousCursorPosition.y) / this.#canvasScale + 'px';
        this.#updateCard(card);
      });
    }

    if (this.#draggedItem.classList.contains('card')) this.#updateCard(this.#draggedItem);
    this.#previousCursorPosition = cursorPosition;

    this.#updateArrows();
  }

  #handleMouseUp(event) {
    if (this.#currentDrawPath != null) {
      const cursorPosition = this.#getCursorPosition(event);
      const cardPosition = this.#getPosition(this.#currentDrawPath.parentElement.parentElement);
      const x = this.#screenToCanvasSpace(cursorPosition).x - cardPosition.x - 12;
      const y = this.#screenToCanvasSpace(cursorPosition).y - cardPosition.y - 25;
      this.#currentPathPoints.push([Math.trunc(x), Math.trunc(y)]);

      var index = parseInt(this.#currentDrawPath.parentElement.parentElement.getAttribute('data-index'));
      this.#cards[index].drawPaths.push(this.#currentPathPoints);
      this.#updateCard(this.#currentDrawPath.parentElement.parentElement);
      this.#currentDrawPath = null;
    }

    if (this.#isErasing) {
      this.#isErasing = false;
      document.querySelectorAll('path').forEach(path => path.classList.remove('interactable'));
    }

    if (this.#isBoxSelecting) {
      boxSelection.style.display = 'none';
      this.#isBoxSelecting = false;
    }

    if (this.#draggedItem == null) return;

    if (this.#draggedItem.nodeName == 'svg') {
      this.#updateCard(this.#draggedItem.parentElement);
      container.style.cursor = 'auto';
      this.#draggedItem = null;
      return;
    }

    const cardPosition = this.#getPosition(this.#draggedItem);
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
    } else this.#save();

    container.style.cursor = 'auto';
    this.#draggedItem = null;

    this.#updateArrows();
  }

  #startPanning() {
    this.#deselectAllCards();
    this.#draggedItem = canvas;
    container.style.cursor = 'grabbing';
    this.#startDragPosition = this.#getPosition(this.#draggedItem);
  }

  #endPanning() {
    if (this.#draggedItem == canvas) {
      this.#draggedItem = null;
      container.style.cursor = 'auto';
    }
  }

  #createArrow(fromIndex, toIndex) {
    if (fromIndex == toIndex) return;
    if (toIndex == -1 || fromIndex == -1) return;
    if (toIndex >= this.#cards.length || fromIndex >= this.#cards.length) return;
    if (this.#doesArrowExist(fromIndex, toIndex)) return;

    if (this.#doesArrowExist(toIndex, fromIndex)) this.#removeOppositeArrow(fromIndex, toIndex);
    
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    var visualLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    var selectionLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    visualLine.classList.add('visual-arrow');
    selectionLine.classList.add('arrow');
    svg.appendChild(selectionLine);
    svg.appendChild(visualLine);
    canvas.appendChild(svg);

    selectionLine.addEventListener('contextmenu', () => this.#selectedArrow = selectionLine);

    this.#arrows.push(new Arrow(fromIndex, toIndex));
    selectionLine.setAttribute('data-index', this.#arrows.length - 1);

    this.#updateArrows();

    this.#save();
  }

  #doesArrowExist(fromIndex, toIndex) {
    for (let i = 0; i < this.#arrows.length; i++) {
      if (this.#arrows[i].fromIndex == fromIndex && this.#arrows[i].toIndex == toIndex) {
        return true;
      }
    }
    return false;
  }

  #removeOppositeArrow(fromIndex, toIndex) {
    var index;
    for (let i = 0; i < this.#arrows.length; i++) {
      if (this.#arrows[i].fromIndex == toIndex && this.#arrows[i].toIndex == fromIndex) {
        index = i;
      }
    }
    const arrowElements = document.getElementsByClassName('arrow');
    for (let i = 0; i < arrowElements.length; i++) {
      if (arrowElements[i].getAttribute('data-index') == index) {
        this.#removeArrow(arrowElements[i]);
        return;
      }
    }
  }

  #updateArrows() {
    const arrows = document.getElementsByClassName('arrow');
    for (let i = 0; i < arrows.length; i++) {
      const arrow = this.#arrows[arrows[i].getAttribute('data-index')];

      var visualLine = arrows[i].parentElement.querySelector('.visual-arrow');

      var fromPosition = this.#cards[arrow.fromIndex].position;
      var toPosition = this.#cards[arrow.toIndex].position;
      var fromSize = { x: this.#cards[arrow.fromIndex].width + 25, y: this.#cards[arrow.fromIndex].height };
      var toSize = { x: this.#cards[arrow.toIndex].width + 25, y: this.#cards[arrow.toIndex].height };
      
      if (this.#intersectCards(fromPosition, fromSize, toPosition, toSize)) {
        visualLine.style.display = 'none';
        return;
      } else {
        visualLine.style.display = 'block';
      }

      [toPosition, fromPosition] = this.#getArrowPosition(fromPosition, fromSize, toPosition, toSize);

      arrows[i].setAttribute('x1', fromPosition.x + 5000);
      arrows[i].setAttribute('y1', fromPosition.y + 5000);
      arrows[i].setAttribute('x2', toPosition.x + 5000);
      arrows[i].setAttribute('y2', toPosition.y + 5000);
      
      visualLine.setAttribute('x1', fromPosition.x + 5000);
      visualLine.setAttribute('y1', fromPosition.y + 5000);
      visualLine.setAttribute('x2', toPosition.x + 5000);
      visualLine.setAttribute('y2', toPosition.y + 5000);
    }
  }

  #handleBoxSelection() {
    var selectionRect = boxSelection.getBoundingClientRect();
    var cards = document.getElementsByClassName('card');
    for (let i = 0; i < cards.length; i++) {
      const cardRect = cards[i].getBoundingClientRect();
      if (selectionRect.left < cardRect.right && selectionRect.right > cardRect.left && selectionRect.top < cardRect.bottom && selectionRect.bottom > cardRect.top) {
        this.#previouslySelectedCards.includes(cards[i]) ? this.#setDeselected(cards[i]) : this.#setSelected(cards[i]);
      } else if (this.#previouslySelectedCards.includes(cards[i])) {
        this.#setSelected(cards[i]);
      } else {
        this.#setDeselected(cards[i]);
      }
    }
  }

  #createCard(position, text, width, imagePath = '', zIndex = 100 + this.#cards.length, isInversed = false, atIndex = -1, isDrawCard = false, height = 0, drawPaths = []) {
    var newCard = document.createElement('div');
    newCard.classList.add('card');

    if (isInversed) newCard.classList.add('inversed');

    var preview = document.createElement('code');
    preview.classList.add('card-preview');
    if (atIndex == -1) this.#previews.push(preview);
    else this.#previews.splice(atIndex, 0, preview);
    newCard.appendChild(preview);
    
    if (isDrawCard) {
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.classList.add('draw-svg');
      newCard.appendChild(svg);      
    } else if (imagePath == '') {
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
    handleLeft.classList.add('handle-left', 'handle');
    var handleRight = document.createElement('div');
    handleRight.classList.add('handle-right', 'handle');
    newCard.appendChild(handleLeft);
    newCard.appendChild(handleRight);

    if (position.x == null || position.y == null) position = {x: 0, y : 0};
    
    canvas.appendChild(newCard);
    newCard.style.left = position.x + 'px';
    newCard.style.top = position.y + 'px';
    newCard.style.width = width + 'px';
    newCard.style.zIndex = zIndex;
    
    if (isDrawCard) {
      var handleDown = document.createElement('div');
      handleDown.classList.add('handle-down', 'handle');
      newCard.appendChild(handleDown);
      newCard.style.height = height + 'px';
    }

    if (atIndex == -1) {
      newCard.setAttribute("data-index", this.#cards.length);
      this.#cards.push(new Card({x: newCard.style.left, y: newCard.style.top}, '', 100, 200, '', zIndex, isInversed, isDrawCard, drawPaths));
      this.#cards[this.#cards.length - 1].imagePath = imagePath;
    }
    else {
      this.#cards.splice(atIndex, 0, new Card({x: newCard.style.left, y: newCard.style.top}, '', 100, 200, '', zIndex, isInversed, isDrawCard, drawPaths));
      this.#cards[atIndex].imagePath = imagePath;
      const cardElements = canvas.getElementsByClassName('card');
      for (let i = 0; i < cardElements.length; i++) {
        var cardIndex = parseInt(cardElements[i].getAttribute('data-index'), 10);
        if (cardIndex >= atIndex) cardElements[i].setAttribute('data-index', cardIndex + 1); 
      }
      newCard.setAttribute("data-index", atIndex);
      for (let i = 0; i < this.#arrows.length; i++) {
        if (this.#arrows[i].toIndex >= atIndex) this.#arrows[i].toIndex = parseInt(this.#arrows[i].toIndex, 10) + 1; 
        if (this.#arrows[i].fromIndex >= atIndex) this.#arrows[i].fromIndex = parseInt(this.#arrows[i].fromIndex, 10) + 1; 
      }
    }

    this.#updateCard(newCard, true);

    return newCard;
  }

  zoom(amount) {
    var factor = 0.9;
    if (amount < 0) factor = 1 / factor;
    
    const oldScale = this.#canvasScale;
    this.#canvasScale *= factor;
    this.#canvasScale = this.#clamp(this.#canvasScale, .1, 3);

    factor = this.#canvasScale / oldScale;
    
    var dx = (this.#previousCursorPosition.x - this.#canvasPosition.x) * (factor - 1);
    var dy = (this.#previousCursorPosition.y - this.#canvasPosition.y) * (factor - 1);
    
    canvas.classList.add('notransition');
    canvas.style.left = this.#getPosition(canvas).x - dx + 'px';
    canvas.style.top = this.#getPosition(canvas).y - dy + 'px';
    this.#canvasPosition = this.#getPosition(canvas);
    canvas.offsetHeight;
    canvas.classList.remove('notransition');
    
    canvas.style.transform = `scale(${this.#canvasScale})`;
    var handleSize = this.#clamp(3 / this.#canvasScale, 3, 100);
    canvas.querySelectorAll('.handle-left').forEach(handle => handle.style.width = `${handleSize}px`);
    canvas.querySelectorAll('.handle-right').forEach(handle => handle.style.width = `${handleSize}px`);
    canvas.querySelectorAll('.handle-down').forEach(handle => handle.style.height = `${handleSize}px`);
    this.#save();
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
    this.#canvasScale = Math.min(container.offsetWidth / width, container.offsetHeight / height) * .8;
    this.#canvasScale = this.#clamp(this.#canvasScale, .3, 2);
    canvas.style.transform = `scale(${this.#canvasScale})`;
    
    canvas.classList.add('notransition');
    
    this.#canvasPosition = {x: -(maxX + minX) / 2 * this.#canvasScale + container.offsetWidth / 2 - 10, y: -(maxY + minY) / 2 * this.#canvasScale + container.offsetHeight / 2 - 10};
    canvas.style.left = this.#canvasPosition.x + 'px';
    canvas.style.top = this.#canvasPosition.y + 'px';
    
    canvas.offsetHeight;
    canvas.classList.remove('notransition');

    this.#save();
  }

  resetPosition() {
    this.#canvasPosition = {x: 0, y: 0};
    this.#canvasScale = 1;
    canvas.style.left = this.#canvasPosition.x + 'px';
    canvas.style.top = this.#canvasPosition.y + 'px';
    canvas.style.transform = `scale(${this.#canvasScale})`;
    this.#save();
  }

  #handleZoom(event) {
    if (event.ctrlKey || event.shiftKey) return;
    this.zoom(event.deltaY);
  }

  #updateCard(card, isNew = false) {
    var index = parseInt(card.getAttribute('data-index'));
    this.#cards[index].position = this.#getPosition(card);
    this.#cards[index].width = parseInt(card.style.width, 10);
    this.#cards[index].height = parseInt(card.style.height, 10);
    
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

    if (this.#cards[index].isDrawCard) {
      this.#renderDrawPaths(card, this.#cards[index].drawPaths);
      this.#cards[index].height = parseInt(card.style.height);
    } else {
      var cardRect = card.getBoundingClientRect();
      this.#cards[index].height = parseInt(cardRect.height, 10) / this.#canvasScale;
    }
    
    this.#updateArrows();
    this.#save();
  }

  changeFontSize(change) {
    this.#fontSize = this.#fontSize + change;
    if (this.#fontSize > 50) this.#fontSize = 50;
    else if (this.#fontSize < 12) this.#fontSize = 12;
    document.querySelector(':root').style.setProperty('--canvas-font-size', `${this.#fontSize}px`);
    this.#save();
  }

  #renderDrawPaths(card, paths) {
    var svg = card.querySelector('svg');
    svg.innerHTML = '';

    for (let i = 0; i < paths.length; i++) {
      const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathElement.setAttribute('d', this.#getSmoothPath(paths[i]));
      svg.appendChild(pathElement);
    }
  }

  async #save() {
    if (!this.#isFullyLoaded) return;
    if (this.#isLoading) return;
    if (this.#isSaving) {
      this.#savePending = true;
      return;
    }
    this.#isSaving = true;
    const configObject = { cards: this.#cards, arrows: this.#arrows, scale: this.#canvasScale, position: this.#canvasPosition, fontSize: this.#fontSize };

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
      this.#save();
    }
  }

  async load(file) {
    if (this.#isSaving) return;

    this.#isSavingUndoState = false;
    this.#isLoading = true;
    this.#cards = [];
    this.#arrows = [];
    this.#previews = [];
    this.#draggedItem = null;
    canvas.innerHTML = '';

    var fileJson = await readTextFile(leto.directory.activeFile);

    if (fileJson === '') {
      this.#canvasPosition = {x: 0, y: 0};
      this.#canvasScale = 1;
      this.#fontSize = leto.windowManager.fontSize;
    }
    else {
      var file = JSON.parse(fileJson);
      this.#canvasPosition = {x: file.position.x ?? 0, y: file.position.y ?? 0};
      this.#canvasScale = file.scale;
      this.#fontSize = file.fontSize ?? leto.windowManager.fontSize;
    }
    
    this.changeFontSize(0);

    canvas.style.left = this.#canvasPosition.x + 'px';
    canvas.style.top = this.#canvasPosition.y + 'px';
    canvas.style.transform = `scale(${this.#canvasScale})`;
    
    if (fileJson !== '') {
      file.cards.forEach(card => this.#createCard(card.position, card.text, card.width, card.imagePath, card.zIndex, card.isInversed, -1, card.isDrawCard, card.height, card.drawPaths));
      file.arrows.forEach(arrow => this.#createArrow(arrow.fromIndex, arrow.toIndex));
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
    this.#previews = [];
    this.#arrows = [];
    canvas.innerHTML = '';
    this.#isFullyLoaded = false;
  }

  #getArrowPosition(from, fromSize, to, toSize) {
    var centers = [{x: from.x + fromSize.x / 2, y: from.y + fromSize.y / 2}, {x: to.x + toSize.x / 2, y: to.y + toSize.y / 2}];
    var atBounds = [this.#moveFirstCoordinatesToBounds([centers[1], centers[0]], toSize), this.#moveFirstCoordinatesToBounds([centers[0], centers[1]], fromSize)];
    return this.#truncateLine(atBounds, fromSize, toSize);
  }

  #moveFirstCoordinatesToBounds(points, size) {
    var xDiff = points[1].x - points[0].x;
    var yDiff = points[1].y - points[0].y;

    var yCoeff = (size.y / 2) / (points[1].y - points[0].y)
    var xCoeff = (size.x / 2) / (points[1].x - points[0].x)

    if (Math.abs(xCoeff) > Math.abs(yCoeff)) {
      var xDelta = yCoeff * xDiff;
      var yDelta = size.y / 2;
      points[0].x += yDiff > 0 ? xDelta : -xDelta;
      points[0].y += yDiff > 0 ? yDelta : -yDelta;
    } else {
      xDelta = size.x / 2;
      yDelta = xCoeff * yDiff;
      points[0].x += xDiff > 0 ? xDelta : -xDelta;
      points[0].y += xDiff > 0 ? yDelta : -yDelta;
    }

    return points[0];
  }

  #truncateLine(points, fromSize, toSize) {
    const truncateLength = 20;

    const xDiff = points[1].x - points[0].x;
    const yDiff = points[1].y - points[0].y;

    var angle = Math.atan2(xDiff, yDiff);

    var length = Math.sqrt((xDiff ** 2) + (yDiff ** 2));

    if (length < truncateLength * 2 + 15) return points;

    const cos = Math.abs(Math.cos(angle));
    const sin = Math.abs(Math.sin(angle));

    var cosToSinAngleFrom = Math.sin(Math.atan((fromSize.y) / (fromSize.x)));
    var cosToSinAngleTo = Math.sin(Math.atan((toSize.y) / (toSize.x)));

    points[0].x += this.#clamp((xDiff / length) * (truncateLength / (cos > cosToSinAngleTo ? cos : sin)), -truncateLength, truncateLength);
    points[0].y += this.#clamp((yDiff / length) * (truncateLength / (cos > cosToSinAngleTo ? cos : sin)), -truncateLength, truncateLength);

    points[1].x -= this.#clamp((xDiff / length) * (truncateLength / (cos > cosToSinAngleFrom ? cos : sin)), -truncateLength, truncateLength);
    points[1].y -= this.#clamp((yDiff / length) * (truncateLength / (cos > cosToSinAngleFrom ? cos : sin)), -truncateLength, truncateLength);

    return points;
  }

  #getSmoothPath(points) {
    var path = ` M${points[0][0]},${points[0][1]}`;

    for (let i = 1; i < points.length; i++) {
      const controlPoint1 = this.#getControlPoint(points[i-1], points[i-2], points[i], false);
      const controlPoint2 = this.#getControlPoint(points[i], points[i-1], points[i+1], true);
      path += ` C ${controlPoint1[0]},${controlPoint1[1]} ${controlPoint2[0]},${controlPoint2[1]} ${points[i][0]},${points[i][1]}`;
    }

    return path;
  }

  #getControlPoint(current, previous, next, reverse) {
    if (previous == null) previous = current;
    if (next == null) next = current;
    const smoothing = 0.2;
    const line = this.#getLine(previous, next);

    const angle = line.angle + (reverse ? Math.PI : 0);
    const length = line.length * smoothing;

    const x = current[0] + Math.cos(angle) * length;
    const y = current[1] + Math.sin(angle) * length;
    return [x, y];
  }

  #getLine(point1, point2) {
    const lengthX = point2[0] - point1[0]
    const lengthY = point2[1] - point1[1]
    return {
      length: Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2)),
      angle: Math.atan2(lengthY, lengthX)
    }
  }

  #getPosition(element) {
    return {x: parseFloat(element.style.left), y: parseFloat(element.style.top, 10)};
  }

  #getCursorPosition(event) {
    return {x: event.clientX - (leto.windowManager.getSidebarWidth() + 4), y: event.clientY};
  }

  #screenToCanvasSpace(position) {
    return {x: (position.x - this.#canvasPosition.x) / this.#canvasScale, y: (position.y - this.#canvasPosition.y) / this.#canvasScale};
  }

  #getCardCopy(card) {
    const drawPaths = [];
    for (let i = 0; i < card.drawPaths.length; i++)
      drawPaths.push([...card.drawPaths[i]]);
    return new Card(card.position, card.text, card.width, card.height, card.imagePath, card.zIndex, card.isInversed, card.isDrawCard, drawPaths);
  }

  #getArrowCopy(arrow) {
    return new Arrow(arrow.fromIndex, arrow.toIndex);
  }

  #clamp(number, min, max) {
    if (number > max) number = max;
    else if (number < min) number = min;
    return number;
  }

  #intersectCards(from, fromSize, to, toSize) {
    return !(to.x > from.x + fromSize.x || to.x + toSize.x < from.x || to.y > from.y + fromSize.y || to.y + toSize.y < from.y);
  }
}

class Card {
  constructor(position, text, width, height, imagePath = '', zIndex, isInversed = false, isDrawCard = false, drawPaths = []) {
    this.position = position;
    this.text = text;
    this.width = width;
    this.height = height;
    this.imagePath = imagePath;
    this.zIndex = zIndex;
    this.isInversed = isInversed;
    this.isDrawCard = isDrawCard;
    this.drawPaths = drawPaths;
  }

  isText() {
    return this.imagePath == '' && this.isDrawCard == false;
  }
}

class Arrow {
  constructor(fromIndex, toIndex) {
    this.fromIndex = fromIndex;
    this.toIndex = toIndex;
  }
}