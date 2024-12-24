export class Arrow {
  constructor(fromIndex, toIndex) {
    this.fromIndex = fromIndex;
    this.toIndex = toIndex;
  }

  getCopy() {
    return new Arrow(this.fromIndex, this.toIndex);
  }

  create(arrows, cards) {
    if (this.fromIndex == this.toIndex) return;
    if (this.toIndex == -1 || this.fromIndex == -1) return;
    if (this.toIndex >= cards.length || this.fromIndex >= cards.length) return;
    if (this.#doesArrowExist(arrows, this.fromIndex, this.toIndex)) return;
    
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    var visualLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    var selectionLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    visualLine.classList.add('visual-arrow');
    selectionLine.classList.add('arrow');
    svg.appendChild(selectionLine);
    svg.appendChild(visualLine);
    canvas.appendChild(svg);
    
    selectionLine.addEventListener('contextmenu', () => leto.lea.selectedArrow = selectionLine);
    
    arrows.push(this);
    selectionLine.setAttribute('data-index', arrows.length - 1);

    if (this.#doesArrowExist(arrows, this.toIndex, this.fromIndex)) this.#removeOppositeArrow(arrows, this.fromIndex, this.toIndex);

    leto.lea.updateArrows();
    leto.lea.save();
  }

  #doesArrowExist(arrows, fromIndex, toIndex) {
    for (let i = 0; i < arrows.length; i++)
      if (arrows[i].fromIndex == fromIndex && arrows[i].toIndex == toIndex)
        return true;
    return false;
  }
    
  #removeOppositeArrow(arrows, fromIndex, toIndex) {
    var index;
    for (let i = 0; i < arrows.length; i++)
      if (arrows[i].fromIndex == toIndex && arrows[i].toIndex == fromIndex)
        index = i;

    const arrowElements = document.getElementsByClassName('arrow');
    for (let i = 0; i < arrowElements.length; i++) {
      if (arrowElements[i].getAttribute('data-index') == index) {
        leto.lea.removeArrow(arrowElements[i]);
        return;
      }
    }
  }

  update(arrow, cards) {
    var visualLine = arrow.parentElement.querySelector('.visual-arrow');

    var fromPosition = cards[this.fromIndex].position;
    var toPosition = cards[this.toIndex].position;
    var fromSize = { x: cards[this.fromIndex].width + 25, y: cards[this.fromIndex].height };
    var toSize = { x: cards[this.toIndex].width + 25, y: cards[this.toIndex].height };
    
    visualLine.style.display = 'none';
    if (this.#intersectCards(fromPosition, fromSize, toPosition, toSize)) return;
    visualLine.style.display = 'block';

    [toPosition, fromPosition] = this.#getArrowPosition(fromPosition, fromSize, toPosition, toSize);

    arrow.setAttribute('x1', fromPosition.x + 15000);
    arrow.setAttribute('y1', fromPosition.y + 15000);
    arrow.setAttribute('x2', toPosition.x + 15000);
    arrow.setAttribute('y2', toPosition.y + 15000);
    
    visualLine.setAttribute('x1', fromPosition.x + 15000);
    visualLine.setAttribute('y1', fromPosition.y + 15000);
    visualLine.setAttribute('x2', toPosition.x + 15000);
    visualLine.setAttribute('y2', toPosition.y + 15000);
  }

  #getArrowPosition(from, fromSize, to, toSize) {
    var centers = [{x: from.x + fromSize.x / 2, y: from.y + fromSize.y / 2}, {x: to.x + toSize.x / 2, y: to.y + toSize.y / 2}];

    if (this.#intersectCards(from, {x: fromSize.x + 50, y: fromSize.y + 50}, to, {x: toSize.x + 50, y: toSize.y + 50}))
      return [this.#moveFirstCoordinatesToBounds([centers[1], centers[0]], toSize, false), this.#moveFirstCoordinatesToBounds([centers[0], centers[1]], fromSize, false)];
    
    return [this.#moveFirstCoordinatesToBounds([centers[1], centers[0]], toSize, true), this.#moveFirstCoordinatesToBounds([centers[0], centers[1]], fromSize, true)];
  }

  #moveFirstCoordinatesToBounds(points, size, changeSize) {
    if (changeSize) {
      size.x += 40;
      size.y += 40;
    }

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

  #intersectCards(from, fromSize, to, toSize) {
    return !(to.x > from.x + fromSize.x || to.x + toSize.x < from.x || to.y > from.y + fromSize.y || to.y + toSize.y < from.y);
  }
}