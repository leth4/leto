const { convertFileSrc } = window.__TAURI__.tauri;

const container = document.getElementById('canvas-container');

export class Card {
  constructor(position, width, height, zIndex, isInversed) {
    this.position = position;
    this.width = width;
    this.height = height;
    this.zIndex = zIndex;
    this.isInversed = isInversed;
    this.type = this.constructor.name;
  }

  static getInstance(type) {
    if (type === 'TextCard') return new TextCard();
    if (type === 'DrawCard') return new DrawCard();
    if (type === 'ImageCard') return new ImageCard();
    if (type === 'RegionCard') return new RegionCard();
    return new TextCard();
  }

  getCopy() {}

  update(card, isNew = false) {
    this.position = leto.lea.getPosition(card);
    this.width = parseInt(card.style.width, 10);

    var cardRect = card.getBoundingClientRect();
    if (!isNew) this.height = parseInt(cardRect.height, 10) / leto.lea.canvasScale;
  }

  create(cards) {
    var newCard = document.createElement('div');
    newCard.classList.add('card');

    if (this.isInversed) newCard.classList.add('inversed');
    
    var handleLeft = document.createElement('div');
    handleLeft.classList.add('handle-left', 'handle');
    var handleRight = document.createElement('div');
    handleRight.classList.add('handle-right', 'handle');
    newCard.appendChild(handleLeft);
    newCard.appendChild(handleRight);

    if (this.position.x == null || this.position.y == null) position = {x: 0, y : 0};
    
    canvas.appendChild(newCard);
    newCard.style.left = this.position.x + 'px';
    newCard.style.top = this.position.y + 'px';
    newCard.style.width = this.width + 'px';
    newCard.style.zIndex = this.zIndex;

    newCard.setAttribute("data-index", cards.length);
    cards.push(this);

    return newCard;
  }
}

export class TextCard extends Card {
  constructor(position, width, height, zIndex, isInversed, text) {
    super(position, width, height, zIndex, isInversed);
    this.text = text;
  }
  
  getCopy() {
    return new TextCard(this.position, this.width, this.height, this.zIndex, this.isInversed, this.text);
  }

  update(card, isNew = false) {
    super.update(card, isNew);

    const preview = card.children[2];
    const spellcheck = card.children[3];
    const textarea = card.children[4];
    
    var text = textarea.value + (textarea.value.slice(-1) === '\n' ? ' ' : '');
    var [previewText, codeRanges] = leto.preview.getPreview(text);
    preview.innerHTML = previewText;

    spellcheck.innerHTML = leto.spellcheck.toggled ? leto.preview.getSpellcheck(text, codeRanges) : '';

    leto.preview.updateLinksEventListeners();

    if (!isNew) this.height = parseInt(card.getBoundingClientRect().height, 10) / leto.lea.canvasScale;
    
    if (this.text != textarea.value) {
      if (!isNew) leto.lea.saveUndoState();
      this.text = textarea.value;
    }

    leto.lea.updateArrows();
    leto.lea.save();
  }

  create(cards) {
    var newCard = super.create(cards);

    var preview = document.createElement('code');
    preview.classList.add('card-preview');
    newCard.appendChild(preview);
    
    var spellcheck = document.createElement('code');
    spellcheck.classList.add('card-spellcheck');
    newCard.appendChild(spellcheck);

    var textarea = document.createElement('textarea');
    textarea.setAttribute('spellcheck', 'false');
    textarea.value = this.text;
    textarea.addEventListener('input', () => this.update(newCard));
    newCard.appendChild(textarea);

    this.update(newCard, true);

    return newCard;
  }
}

export class ImageCard extends Card {
  constructor(position, width, height, zIndex, isInversed, imagePath) {
    super(position, width, height, zIndex, isInversed);
    this.imagePath = imagePath;
  }

  getCopy() {
    return new ImageCard(this.position, this.width, this.height, this.zIndex, this.isInversed, this.imagePath);
  }

  update(card, cards) {
    super.update(card, cards);

    leto.lea.updateArrows();
    leto.lea.save();
  }

  create(cards) {
    var newCard = super.create(cards);
    var imageDisplay = document.createElement('img');
    imageDisplay.setAttribute('src', convertFileSrc(this.imagePath));
    newCard.appendChild(imageDisplay);

    this.update(newCard);

    return newCard;
  }
}

export class RegionCard extends Card {
  constructor(position, width, height, zIndex, isInversed) {
    super(position, width, height, zIndex, isInversed);
  }

  getCopy() {
    return new RegionCard(this.position, this.width, this.height, this.zIndex, this.isInversed);
  }

  update(card, cards) {
    super.update(card, cards);

    leto.lea.updateArrows();
    leto.lea.save();
  }

  create(cards) {
    var newCard = super.create(cards);
    newCard.classList.add('region');
    
    var handleDown = document.createElement('div');
    handleDown.classList.add('handle-down', 'handle');
    newCard.appendChild(handleDown);
    newCard.style.height = this.height - 40 + 'px';
    
    this.update(newCard);
    return newCard;
  }
}

export class DrawCard extends Card {
  #currentPathPoints = [];
  #currentDrawPath = [];
  #previousCursorPosition;
  #activeState;

  constructor(position, width, height, zIndex, isInversed, drawPaths) {
    super(position, width, height, zIndex, isInversed);
    this.drawPaths = drawPaths;
  }

  getCopy() {
    const drawPaths = [];
    for (let i = 0; i < this.drawPaths.length; i++)
      drawPaths.push([...this.drawPaths[i]]);

    return new DrawCard(this.position, this.width, this.height, this.zIndex, this.isInversed, drawPaths);
  }

  update(card) {
    super.update(card);

    this.#renderDrawPaths(card, this.drawPaths);
    this.height = parseInt(card.style.height, 10) + 40;

    leto.lea.updateArrows();
    leto.lea.save();
  }

  create(cards) {
    var newCard = super.create(cards);
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('draw-svg');
    newCard.appendChild(svg);   
    
    var handleDown = document.createElement('div');
    handleDown.classList.add('handle-down', 'handle');
    newCard.appendChild(handleDown);
    newCard.style.height = this.height - 40 + 'px';

    this.#initializeEvents(svg);

    this.update(newCard);

    return newCard;
  }

  #initializeEvents(svg) {

    svg.addEventListener('pointerdown', event => {
      if (event.button == 0) {
        leto.lea.saveUndoState();
        this.#currentPathPoints = [];
        this.#currentDrawPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        svg.appendChild(this.#currentDrawPath);
        this.#activeState = State.Drawing;
      }
      if (event.button == 1) {
        leto.lea.saveUndoState();
        container.style.cursor = 'grabbing';
        this.#activeState = State.Panning;
        this.#previousCursorPosition = leto.lea.getCursorPosition(event);
      }
      if (event.button == 2) {
        document.getElementById('canvas').querySelectorAll('path').forEach(path => path.classList.add('interactable'));
        leto.lea.saveUndoState();
        this.#activeState = State.Erasing;
      }
    });

    container.addEventListener('pointermove', event => {
      if (this.#activeState == State.None) return;
      var cursorPosition = leto.lea.getCursorPosition(event);

      if (this.#activeState == State.Erasing && event.target.nodeName == 'path') {
        const pathIndex = Array.prototype.indexOf.call(event.target.parentElement.children, event.target);
        this.drawPaths.splice(pathIndex, 1);
        event.target.remove();
      }

      if (this.#activeState == State.Drawing) {
        let d = this.#currentDrawPath.getAttribute('d');
        const cardPosition = leto.lea.getPosition(svg.parentElement);
        const x = leto.lea.screenToCanvasSpace(cursorPosition).x - cardPosition.x - 12;
        const y = leto.lea.screenToCanvasSpace(cursorPosition).y - cardPosition.y - 25;

        if (event.shiftKey && d && d.indexOf("L") > 0) d = d.substring(0, d.lastIndexOf("L") - 1);
        this.#currentDrawPath.setAttribute('d', d ? d + ` L${x},${y}` : `M${x},${y}`);

        if (this.#currentPathPoints.length == 0) {
          this.#currentPathPoints.push([Math.floor(x * 100) / 100, Math.floor(y * 100) / 100]);
        } else {
          const coords = [x, y];
          const prevCoords = this.#currentPathPoints[this.#currentPathPoints.length - 1];
          const distance = (coords[0] - prevCoords[0]) * (coords[0] - prevCoords[0]) + (coords[1] - prevCoords[1]) * (coords[1] - prevCoords[1]);

          if (event.shiftKey && this.#currentPathPoints.length > 1) this.#currentPathPoints.pop();
          if (event.shiftKey || distance > 10 / leto.lea.canvasScale) this.#currentPathPoints.push([Math.floor(x * 100) / 100, Math.floor(y * 100) / 100]);
        }
      }

      if (this.#activeState == State.Panning) {
        for (let i = 0; i < this.drawPaths.length; i++) {
          var path = this.drawPaths[i];
          for (let j = 0; j < path.length; j++) {
            var position = leto.lea.screenToCanvasSpace(cursorPosition);
            var previousPosition = leto.lea.screenToCanvasSpace(this.#previousCursorPosition);
            path[j] = [path[j][0] + (position.x - previousPosition.x), path[j][1] + (position.y - previousPosition.y)];
          }
        }

        this.update(svg.parentElement);
      }

      this.#previousCursorPosition = cursorPosition;
    });

    container.addEventListener('pointerup', event => {
      if (this.#activeState == State.None) return;

      if (this.#activeState == State.Erasing) {
        document.getElementById('canvas').querySelectorAll('path').forEach(path => path.classList.remove('interactable'));
        this.update(svg.parentElement);
      }
      
      if (this.#activeState == State.Panning) {
        this.update(svg.parentElement);
        container.style.cursor = 'auto';
      }

      if (this.#activeState == State.Drawing) {
        const cursorPosition = leto.lea.getCursorPosition(event);
        const cardPosition = leto.lea.getPosition(this.#currentDrawPath.parentElement.parentElement);
        const x = leto.lea.screenToCanvasSpace(cursorPosition).x - cardPosition.x - 12;
        const y = leto.lea.screenToCanvasSpace(cursorPosition).y - cardPosition.y - 25;
        this.#currentPathPoints.push([Math.floor(x * 100) / 100, Math.floor(y * 100) / 100]);

        this.drawPaths.push(this.#currentPathPoints);
        this.update(svg.parentElement);
        this.#currentDrawPath = null;
      }

      this.#activeState = State.None;
    });
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

  #getSmoothPath(points) {
    var path = ` M${points[0][0]},${points[0][1]}`;

    for (let i = 1; i < points.length - 1; i++) {
      const controlPoint1 = this.#getControlPoint(points[i-1], points[i-2], points[i], false);
      const controlPoint2 = this.#getControlPoint(points[i], points[i-1], points[i+1], true);
      path += ` C ${controlPoint1[0]},${controlPoint1[1]} ${controlPoint2[0]},${controlPoint2[1]} ${points[i][0]},${points[i][1]}`;
    }
    path += ` L ${points[points.length - 1][0]},${points[points.length - 1][1]}`;

    return path;
  }

  #getControlPoint(current, previous, next, reverse) {
    if (previous == null) previous = current;
    if (next == null) next = current;
    const smoothing = 0.2;
    const line = this.#getLine(previous, next);

    if (line.length > 20) return [current[0], current[1]];

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
}

const State = {
  None: 'None',
  Drawing: 'Drawing',
  Panning: 'Panning',
  Erasing: 'Erasing'
}