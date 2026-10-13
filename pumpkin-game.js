const pumpkin = document.getElementById('carvingPumpkin');
const carvingSurface = document.getElementById('carvingSurface');
const carvingPattern = document.getElementById('carvingPattern');
const fallingPieces = document.getElementById('fallingPieces');
const carvingStage = document.querySelector('.carving-stage');
const carvingProgress = document.getElementById('carvingProgress');
const carvingToolStatus = document.getElementById('carvingToolStatus');
const knifeToggleButton = document.getElementById('toggleKnife');
const knifeToggleLabel = document.getElementById('knifeToggleLabel');
const undoCarvingButton = document.getElementById('undoCarving');
const resetCarvingButton = document.getElementById('resetCarving');
const scrapCountLabel = document.getElementById('scrapCount');

let activeStroke = null;
let knifeIsHeld = false;
let scrapCount = 0;
const pendingFragments = new Map();

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

function getStrokeArea(points) {
    return Math.abs(points.reduce((area, point, index) => {
        const nextPoint = points[(index + 1) % points.length];
        return area + point.x * nextPoint.y - nextPoint.x * point.y;
    }, 0)) / 2;
}

function animateCutout(cut) {
    const bounds = cut.getBBox();
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    const fragment = cut.cloneNode(false);
    const startTime = performance.now();
    const duration = 850;
    let frameId;

    fragment.setAttribute('class', 'carved-fragment');
    fallingPieces.append(fragment);

    function animateFragment(time) {
        const progress = Math.min((time - startTime) / duration, 1);
        const easedProgress = 1 - (1 - progress) ** 3;
        const x = centerX + (393 - centerX) * easedProgress;
        const y = centerY + (353 - centerY) * progress + 38 * Math.sin(Math.PI * progress);
        const rotation = 150 * easedProgress;
        const scale = 1 - 0.86 * easedProgress;

        fragment.setAttribute('transform', `translate(${x} ${y}) rotate(${rotation}) scale(${scale}) translate(${-centerX} ${-centerY})`);

        if (progress < 1) {
            frameId = requestAnimationFrame(animateFragment);
            pendingFragments.set(cut, { fragment, frameId });
        } else {
            fragment.remove();
            pendingFragments.delete(cut);
            scrapCount += 1;
            scrapCountLabel.textContent = String(scrapCount);
        }
    }

    frameId = requestAnimationFrame(animateFragment);
    pendingFragments.set(cut, { fragment, frameId });
}

function finishStroke(event, keepStroke) {
    if (!activeStroke || activeStroke.pointerId !== event.pointerId) return;

    const stroke = activeStroke;
    const strokeLength = stroke.points.reduce((length, point, index, points) => {
        if (index === 0) return length;
        return length + Math.hypot(point.x - points[index - 1].x, point.y - points[index - 1].y);
    }, 0);
    const firstPoint = stroke.points[0];
    const lastPoint = stroke.points[stroke.points.length - 1];
    const isClosed = Math.hypot(lastPoint.x - firstPoint.x, lastPoint.y - firstPoint.y) <= 24;
    const isLargeEnough = stroke.points.length >= 5 && getStrokeArea(stroke.points) >= 180;

    if (keepStroke && strokeLength >= 15 && isClosed && isLargeEnough) {
        updateStrokePath();
        stroke.path.setAttribute('d', `${stroke.path.getAttribute('d')} Z`);
        stroke.path.classList.remove('is-drawing');
        stroke.path.classList.add('is-cutout');
        carvingToolStatus.textContent = 'Outline carved. Watch the piece fall into the bag.';
        animateCutout(stroke.path);
    } else {
        stroke.path.remove();
        if (keepStroke && strokeLength >= 15) {
            carvingToolStatus.textContent = 'Close the outline by joining it to where you started.';
        }
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
    const lastCut = carvingPattern.lastElementChild;
    if (!lastCut) return;

    const pendingFragment = pendingFragments.get(lastCut);
    if (pendingFragment) {
        cancelAnimationFrame(pendingFragment.frameId);
        pendingFragment.fragment.remove();
        pendingFragments.delete(lastCut);
    }

    lastCut.remove();
    updateProgress();
});

resetCarvingButton.addEventListener('click', () => {
    pendingFragments.forEach(({ fragment, frameId }) => {
        cancelAnimationFrame(frameId);
        fragment.remove();
    });
    pendingFragments.clear();
    carvingPattern.replaceChildren();
    scrapCount = 0;
    scrapCountLabel.textContent = '0';
    updateProgress();
});

updateProgress();
