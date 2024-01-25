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
  #isDraggingArrow;

  #isBoxSelecting;
  #previouslySelectedCards;
  #hasChangedBoxSelection;
  
  #canvasScale = 1;
  #canvasPosition = {x: 0, y: 0};
  
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
    this.#arrows = [];
    this.#previews = [];
    this.#selectedCards = [];
    canvas.innerHTML = '';

    state.cards.forEach(card => this.#createCard(card.position, card.text, card.width, card.imagePath, card.zIndex, card.isInversed, -1));
    state.arrows.forEach(arrow => this.#createArrow(arrow.fromIndex, arrow.toIndex));

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
    var stateArrows = [];
    var stateSelectedIndeces = [];
    this.#cards.forEach(card => stateCards.push(this.#getCardCopy(card)));
    this.#arrows.forEach(arrow => stateArrows.push(this.#getArrowCopy(arrow)));
    this.#selectedCards.forEach(card => stateSelectedIndeces.push(parseInt(card.getAttribute('data-index'), 10)));
    this.#undoHistory.push({cards: stateCards, arrows: stateArrows, selection: stateSelectedIndeces});
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
    var newCard = this.#createCard(this.#screenToCanvasSpace({x: this.#previousCursorPosition.x, y: this.#previousCursorPosition.y}), '', 200);
    newCard.querySelector('textarea').focus();
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
      for (let i = this.#arrows.length - 1; i >= 0; i--) {
        if (this.#arrows[i].toIndex == index || this.#arrows[i].fromIndex == index) {
          this.#arrows.splice(i, 1);
          const arrowElements = canvas.getElementsByClassName('arrow');
          for (let j = arrowElements.length - 1; j >= 0; j--) {
            var arrowIndex = parseInt(arrowElements[j].getAttribute('data-index'), 10);
            if (arrowIndex == i) arrowElements[j].parentElement.remove();
            else if (arrowIndex > i) arrowElements[j].setAttribute('data-index', arrowIndex - 1);
          }
        }
      }
      for (let i = 0; i < this.#arrows.length; i++) {
        if (this.#arrows[i].toIndex > index) this.#arrows[i].toIndex = parseInt(this.#arrows[i].toIndex, 10) - 1; 
        if (this.#arrows[i].fromIndex > index) this.#arrows[i].fromIndex = parseInt(this.#arrows[i].fromIndex, 10) - 1; 
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

  connectSelectedCards() {
    this.#saveUndoState();

    if (this.#selectedCards.length < 1) return;

    if (this.#selectedCards.length == 1) {
      this.#isDraggingArrow = true;
      this.#createArrow(this.#selectedCards[0].getAttribute('data-index'), -1, this.#screenToCanvasSpace(this.#previousCursorPosition));
    }
    
    for (let i = 0; i < this.#selectedCards.length; i++) {
      for (let j = 0; j < this.#selectedCards.length; j++) {
        this.#createArrow(this.#selectedCards[i].getAttribute('data-index'), this.#selectedCards[j].getAttribute('data-index'));
      }   
    }
  }

  removeSelectedArrow() {
    this.#removeArrow(this.#selectedArrow);
    var pairedArrow = this.#getPairedArrow(this.#selectedArrow);
    if (pairedArrow != null) this.#removeArrow(this.#selectedArrow);
    this.#save();
  }

  #removeArrow(arrow) {
    var index = arrow.getAttribute('data-index');
    this.#arrows.splice(index, 1);
    arrow.parentElement.remove();
    var arrowElements = canvas.getElementsByClassName('arrow');
    for (let i = 0; i < arrowElements.length; i++) {
      var arrowIndex = arrowElements[i].getAttribute('data-index');
      if (arrowIndex > index) arrowElements[i].setAttribute('data-index', arrowIndex - 1); 
    }
    this.#selectedArrow = null;
  }

  reverseSelectedArrow() {
    var index = this.#selectedArrow.getAttribute('data-index');
    this.#createArrow(this.#arrows[index].toIndex, this.#arrows[index].fromIndex);
    this.#removeArrow(this.#selectedArrow);
    this.#selectedArrow = null;
    this.#save();
  }

  toggleDoubleSelectedArrow() {
    if (this.isSelectedArrowDouble()) {
      this.#getPairedArrow(this.#selectedArrow)?.classList.remove('selected');
      this.#removeArrow(this.#selectedArrow);
      this.#selectedArrow = null;
    } else {
      var index = this.#selectedArrow.getAttribute('data-index');
      this.#createArrow(this.#arrows[index].toIndex, this.#arrows[index].fromIndex);
      this.#selectedArrow?.classList.remove('selected');
      this.#selectedArrow = null;
    }
    this.#save();
  }

  isSelectedArrowDouble() {
    return this.#getPairedArrow(this.#selectedArrow) != null;
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
    if (this.#isDraggingArrow) {
      this.#arrows[this.#arrows.length - 1].toPosition = this.#screenToCanvasSpace(cursorPosition);
      this.#updateArrows();
    }
    if (this.#draggedItem == null) {
      this.#handleArrowSelection(event);
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

    this.#updateArrows();
  }

  #handleMouseUp(event) {
    if (this.#isBoxSelecting) {
      boxSelection.style.display = 'none';
      this.#isBoxSelecting = false;
      if (!this.#hasChangedBoxSelection) this.#removeLastUndoState();
    }
    if (this.#isDraggingArrow) {
      if (event.target.classList.contains('card')) {
        var targetIndex = parseInt(event.target.getAttribute('data-index'), 10);
        if (targetIndex != this.#arrows[this.#arrows.length - 1].fromIndex) this.#arrows[this.#arrows.length - 1].toIndex = targetIndex;
      } else {
        this.createEmptyCard(event);
        this.#arrows[this.#arrows.length - 1].toIndex = this.#cards.length - 1;
      }
      this.#isDraggingArrow = false;  
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

    this.#updateArrows();
  }

  #createArrow(fromIndex, toIndex, toPosition) {
    if (this.#doesArrowExist(fromIndex, toIndex)) return;
    if (fromIndex == toIndex) return;
    
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    var visualLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    var selectionLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    visualLine.classList.add('visual-arrow');
    selectionLine.classList.add('arrow');
    svg.appendChild(selectionLine);
    svg.appendChild(visualLine);
    canvas.appendChild(svg);

    this.#arrows.push(new Arrow(fromIndex, toIndex));
    this.#arrows[this.#arrows.length - 1].toPosition = toPosition;
    selectionLine.setAttribute('data-index', this.#arrows.length - 1);

    this.#updateArrows();

    this.#save();
  }

  #handleArrowSelection(event) {
    if (event.target.classList.contains('arrow')) {
      this.#selectedArrow?.classList.remove('selected');
      this.#getPairedArrow(this.#selectedArrow)?.classList.remove('selected');
      this.#selectedArrow = event.target;
      this.#selectedArrow.classList.add('selected');
      this.#getPairedArrow(this.#selectedArrow)?.classList.add('selected');
    }
    else {
      this.#selectedArrow?.classList.remove('selected');
      this.#getPairedArrow(this.#selectedArrow)?.classList.remove('selected');
    }
  }

  #getPairedArrow(arrow) {
    if (arrow == null || arrow == undefined) return;
    var index = arrow.getAttribute('data-index');
    for (let i = 0; i < this.#arrows.length; i++) {
      if (this.#arrows[i].fromIndex == this.#arrows[index].toIndex && this.#arrows[i].toIndex == this.#arrows[index].fromIndex) {
        return this.#getArrowByIndex(i);
      }
    }
    return null;
  }

  #getArrowByIndex(index) {
    const arrowElements = canvas.getElementsByClassName('arrow');
    for (let j = 0; j < arrowElements.length; j++) {
      var arrowIndex = parseInt(arrowElements[j].getAttribute('data-index'), 10);
      if (arrowIndex == index) return arrowElements[j];
    }
    return null;
  }

  #doesArrowExist(fromIndex, toIndex) {
    for (let i = 0; i < this.#arrows.length; i++) {
      if (this.#arrows[i].fromIndex == fromIndex && this.#arrows[i].toIndex == toIndex) {
        return true;
      }
    }
    return false;
  }

  #updateArrows() {
    const arrows = document.getElementsByClassName('arrow');
    for (let i = 0; i < arrows.length; i++) {
      const arrow = this.#arrows[arrows[i].getAttribute('data-index')];

      arrows[i].style.pointerEvents = arrow.toIndex == -1 ? 'none' : 'auto';
      var visualLine = arrows[i].parentElement.querySelector('.visual-arrow');

      var fromPosition = {x: this.#cards[arrow.fromIndex].position.x, y: this.#cards[arrow.fromIndex].position.y};
      var toPosition = arrow.toIndex == -1 ? arrow.toPosition : this.#cards[arrow.toIndex].position;
      var fromSize = {x: this.#cards[arrow.fromIndex].width + 25, y: this.#cards[arrow.fromIndex].height};
      var toSize = arrow.toIndex == -1 ? null : {x: this.#cards[arrow.toIndex].width + 25, y: this.#cards[arrow.toIndex].height};
      
      if (arrow.toIndex != -1 && this.#intersectCards(fromPosition, fromSize, toPosition, toSize)) {
        arrows[i].style.display = 'none';
      } else {
        arrows[i].style.display = 'block';
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
    
    var cardRect = card.getBoundingClientRect();
    this.#cards[index].height = parseInt(cardRect.height, 10) / this.#canvasScale;
    
    this.#updateArrows();

    this.#save();
  }

  async #save() {
    if (this.#isLoading) return;
    const configObject = { cards: this.#cards, arrows: this.#arrows, scale: this.#canvasScale, position: this.#canvasPosition };
    await writeTextFile(leto.directory.activeFile, JSON.stringify(configObject, null, 2));
  }

  async load(file) {
    this.#isSavingUndoState = false;
    this.#isLoading = true;
    this.#cards = [];
    this.#arrows = [];
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
    }

    canvas.style.left = this.#canvasPosition.x + 'px';
    canvas.style.top = this.#canvasPosition.y + 'px';
    canvas.style.transform = `scale(${this.#canvasScale})`;
    
    if (fileJson !== '') {
      file.cards.forEach(card => this.#createCard(card.position, card.text, card.width, card.imagePath, card.zIndex, card.isInversed, -1));
      file.arrows.forEach(arrow => this.#createArrow(arrow.fromIndex, arrow.toIndex));
    }

    this.#isSavingUndoState = true;
    this.#isLoading = false;
  }

  reset() {
    this.#undoHistory = [];
    this.#redoHistory = [];
    this.#selectedCards = [];
    this.#cards = [];
    this.#previews = [];
    this.#arrows = [];
    canvas.innerHTML = '';
  }

  #getArrowPosition(from, fromSize, to, toSize) {
    if (toSize != null) {
      var centers = [{x: from.x + fromSize.x / 2, y: from.y + fromSize.y / 2}, {x: to.x + toSize.x / 2, y: to.y + toSize.y / 2}];
      var atBounds = [this.#moveFirstCoordinatesToBounds([centers[1], centers[0]], toSize), this.#moveFirstCoordinatesToBounds([centers[0], centers[1]], fromSize)];
      return this.#truncateLine(atBounds);
    }
    else {
      var centers = [{x: from.x + fromSize.x / 2, y: from.y + fromSize.y / 2}, {x: to.x, y: to.y}];
      return [to, this.#moveFirstCoordinatesToBounds([centers[0], centers[1]], fromSize)];
    }
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

  #truncateLine(points) {
    const truncateLength = 20;

    var xDiff = points[1].x - points[0].x;
    var yDiff = points[1].y - points[0].y;

    var length = Math.sqrt((xDiff ** 2) + (yDiff ** 2));

    if (length < truncateLength * 2 + 15) return points;

    points[0].x += xDiff * (truncateLength / length);
    points[0].y += yDiff * (truncateLength / length);

    points[1].x -= xDiff * (truncateLength / length);
    points[1].y -= yDiff * (truncateLength / length);

    return points;
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

class Arrow {
  constructor(fromIndex, toIndex) {
    this.fromIndex = fromIndex;
    this.toIndex = toIndex;
    this.toPosition;
  }
}