const pumpkin = document.getElementById('carvingPumpkin');
const carvingSurface = document.getElementById('carvingSurface');
const carvingPattern = document.getElementById('carvingPattern');
const carvingStage = document.querySelector('.carving-stage');
const carvingProgress = document.getElementById('carvingProgress');
const carvingToolStatus = document.getElementById('carvingToolStatus');
const knifeToggleButton = document.getElementById('toggleKnife');
const knifeToggleLabel = document.getElementById('knifeToggleLabel');
const undoCarvingButton = document.getElementById('undoCarving');
const resetCarvingButton = document.getElementById('resetCarving');

let activeStroke = null;
let knifeIsHeld = false;

function updateProgress() {
    const cutCount = carvingPattern.childElementCount;
    carvingProgress.textContent = `${cutCount} ${cutCount === 1 ? 'cut' : 'cuts'} carved`;
    undoCarvingButton.disabled = cutCount === 0;
}

function setKnifeHeld(isHeld) {
    knifeIsHeld = isHeld;
    carvingStage.classList.toggle('is-knife-held', isHeld);
    knifeToggleButton.classList.toggle('is-held', isHeld);
    knifeToggleButton.setAttribute('aria-pressed', String(isHeld));
    knifeToggleLabel.textContent = isHeld ? 'Put knife down' : 'Pick up carving knife';
    carvingToolStatus.textContent = isHeld
        ? 'Knife in hand. Drag across the pumpkin to carve.'
        : 'Knife is on the table.';

    if (!isHeld && activeStroke) {
        activeStroke.path.remove();
        activeStroke = null;
        updateProgress();
    }
}

function getPumpkinPoint(event) {
    const point = pumpkin.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(pumpkin.getScreenCTM().inverse());
}

function updateStrokePath() {
    const pathData = activeStroke.points
        .map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
        .join(' ');
    activeStroke.path.setAttribute('d', pathData);
}

function finishStroke(event, keepStroke) {
    if (!activeStroke || activeStroke.pointerId !== event.pointerId) return;

    const strokeLength = activeStroke.points.reduce((length, point, index, points) => {
        if (index === 0) return length;
        return length + Math.hypot(point.x - points[index - 1].x, point.y - points[index - 1].y);
    }, 0);

    if (keepStroke && strokeLength >= 4) {
        activeStroke.path.classList.remove('is-drawing');
    } else {
        activeStroke.path.remove();
    }

    activeStroke = null;
    updateProgress();
}

carvingSurface.addEventListener('pointerdown', (event) => {
    if (!knifeIsHeld || event.button !== 0 || activeStroke) return;

    event.preventDefault();
    carvingSurface.setPointerCapture(event.pointerId);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'carving-cut is-drawing');
    carvingPattern.append(path);
    activeStroke = {
        pointerId: event.pointerId,
        points: [getPumpkinPoint(event)],
        path
    };
    updateStrokePath();
});

knifeToggleButton.addEventListener('click', () => setKnifeHeld(!knifeIsHeld));

carvingSurface.addEventListener('pointermove', (event) => {
    if (!activeStroke || activeStroke.pointerId !== event.pointerId) return;

    const point = getPumpkinPoint(event);
    const previousPoint = activeStroke.points[activeStroke.points.length - 1];
    if (Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y) < 1.5) return;

    activeStroke.points.push(point);
    updateStrokePath();
});

carvingSurface.addEventListener('pointerup', (event) => finishStroke(event, true));
carvingSurface.addEventListener('pointercancel', (event) => finishStroke(event, false));

undoCarvingButton.addEventListener('click', () => {
    carvingPattern.lastElementChild?.remove();
    updateProgress();
});

resetCarvingButton.addEventListener('click', () => {
    carvingPattern.replaceChildren();
    updateProgress();
});

updateProgress();
