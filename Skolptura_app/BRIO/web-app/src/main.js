import * as PIXI from 'pixi.js';
import { generateValidatedLoop, checkOverlapRatio, mapDescPiece } from './brioGenerator.js';
import { getRealPos, PIECE_LIB, clearCache } from './brioGeometry.js';
import { SeededRandom } from './random.js';
import PALETTES from './shared_palettes.json';

const PRESET_FORMATS = {
  "IG_POST": { w: 1080, h: 1080, unit: "px" },
  "IG_VERTICAL": { w: 1080, h: 1350, unit: "px" },
  "POST_1080_1440": { w: 1080, h: 1440, unit: "px" },
  "IG_STORY": { w: 1080, h: 1920, unit: "px" },
  "FHD": { w: 1920, h: 1080, unit: "px" },
  "A4": { w: 21.0, h: 29.7, unit: "cm" },
  "A3": { w: 29.7, h: 42.0, unit: "cm" },
  "POSTER_50_70": { w: 50.0, h: 70.0, unit: "cm" },
  "A6_POSTCARD": { w: 10.5, h: 14.8, unit: "cm" }
};

const DPI = 300;
function cmToPx(cm) { return Math.round((cm / 2.54) * DPI); }
function pxToCm(px) { return parseFloat(((px / DPI) * 2.54).toFixed(1)); }

// --- GLOBAL STATE ---
let state = {
  canvasWidth: 1080,
  canvasHeight: 1440,
  canvasUnit: "px",
  margin: 50,
  autoScale: true,

  // Track generator configs
  targetN: 50,
  straightPct: 0.0,
  maxOverlaps: 10,
  switchProb: 0.5,
  maxSwitches: 3,
  minSwitchDist: 3,
  maxSwitchDist: 11,
  shapeStyle: "dynamic",
  maxTimeout: 30,

  // Visual options
  trackWidth: 100,
  showGridStroke: false, // Frame border
  showCapsuleCaps: false,
  showOutlines: true,
  showPieceOutlines: true,
  strokeWidth: 1.2,

  // Palette & colors
  activePaletteName: "Skolp_01",
  palette: [...PALETTES["Skolp_01"]],
  useManualBg: false,
  manualBgHex: "#f5f5f0",
  useManualStroke: false,
  manualStrokeHex: "#4d3319",
  allowBgColorForPieces: false,
  monochromePieces: false,
  mergeSameColorPieces: false,
  excludeOutlineColorFromPieces: true,

  // Seed
  seed: "brio_default",
  seedLocked: true,

  // Viewport zoom & pan
  viewScale: 1.0,
  viewOffset: { x: 0, y: 0 },
  immersiveMode: false,
  animateTrain: false,
  trainMultiply: true,
  trainSpeed: 3,
  trainColor: "#808080",
  trainSize: 60
};

// --- PIXIJS INITIALIZATION ---
let app;
let bgGraphics;
let trackContainer;
let gridGraphics;
let trainCarGraphicsPool = [];
let trainDistance = 0;
let activeTrainPath = null;
let activeTrainPathPieceIndices = [];
let activePieceLayers = [];

// Variabili per il controllo della registrazione video
let isRecordingVideo = false;
let videoRecorder = null;
let videoChunks = [];
let wasAnimatingInitially = false;
let recordingStopRequested = false;

function isModeAdmin() {
  try {
    return (typeof window.isSkolpAdmin === 'function' && window.isSkolpAdmin()) ||
           localStorage.getItem('skolp_admin_mode') === 'true' ||
           document.documentElement.classList.contains('admin-mode');
  } catch (e) {
    return false;
  }
}

async function initPixi() {
  const wrapper = document.getElementById('canvas-wrapper');
  if (!isModeAdmin() && wrapper) {
    const rect = wrapper.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      state.canvasWidth = Math.max(300, Math.round(rect.width));
      state.canvasHeight = Math.max(300, Math.round(rect.height));
    }
  }
  
  app = new PIXI.Application();
  await app.init({
    width: state.canvasWidth,
    height: state.canvasHeight,
    antialias: true,
    backgroundAlpha: 0,
    autoDensity: true,
    resolution: 1,
    preserveDrawingBuffer: true
  });

  wrapper.appendChild(app.canvas);

  bgGraphics = new PIXI.Graphics();
  trackContainer = new PIXI.Container();
  gridGraphics = new PIXI.Graphics();

  app.stage.addChild(bgGraphics);
  app.stage.addChild(trackContainer);
  app.stage.addChild(gridGraphics);

  setupZoomPan(wrapper);
  setupCanvasClickToggle(wrapper);
  resetView();

  if (!isModeAdmin() && wrapper) {
    let resizeTimer = null;
    const ro = new ResizeObserver(() => {
      if (isModeAdmin()) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!wrapper || !app || !app.renderer) return;
        const rect = wrapper.getBoundingClientRect();
        if (!rect || rect.width <= 0 || rect.height <= 0) return;
        const newW = Math.max(300, Math.round(rect.width));
        const newH = Math.max(300, Math.round(rect.height));
        if (newW !== state.canvasWidth || newH !== state.canvasHeight) {
          state.canvasWidth = newW;
          state.canvasHeight = newH;
          app.renderer.resize(newW, newH);
          resetView();
          renderScene();
        }
      }, 150);
    });
    ro.observe(wrapper);
  }
}

// --- CLICK SUL CANVAS PER COLLASSARE / RIAPRIRE LA GUI ---
function setupCanvasClickToggle(wrapper) {
  if (!wrapper) return;
  let startPos = { x: 0, y: 0 };
  let startTime = 0;
  let isPotentialClick = false;

  wrapper.addEventListener('pointerdown', (e) => {
    if (e.target && e.target.closest('button, a, input, select, .immersive-btn, .reopen-gui-btn')) {
      isPotentialClick = false;
      return;
    }
    if (e.pointerType === 'mouse' && e.button !== 0) {
      isPotentialClick = false;
      return;
    }
    isPotentialClick = true;
    startPos = { x: e.clientX, y: e.clientY };
    startTime = Date.now();
  });

  wrapper.addEventListener('pointerup', (e) => {
    if (!isPotentialClick) return;
    isPotentialClick = false;
    const dx = e.clientX - startPos.x;
    const dy = e.clientY - startPos.y;
    const dist = Math.hypot(dx, dy);
    const elapsed = Date.now() - startTime;

    if (dist < 8 && elapsed < 350) {
      if (!document.body.classList.contains('gui-collapsed')) {
        document.body.classList.add('gui-collapsed');
        triggerResize();
      }
    }
  });

  const reopenBtn = document.getElementById('reopen-gui-btn');
  if (reopenBtn) {
    reopenBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.body.classList.remove('gui-collapsed');
      triggerResize();
    });
  }

  function triggerResize() {
    setTimeout(() => {
      if (!wrapper || !app || !app.renderer) return;
      const rect = wrapper.getBoundingClientRect();
      if (!rect || rect.width <= 0 || rect.height <= 0) return;
      const newW = Math.max(300, Math.round(rect.width));
      const newH = Math.max(300, Math.round(rect.height));
      state.canvasWidth = newW;
      state.canvasHeight = newH;
      app.renderer.resize(newW, newH);
      resetView();
      renderScene();
    }, 60);
  }
}

// --- CAMERA ZOOM & PAN ---
function setupZoomPan(wrapper) {
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };

  wrapper.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = wrapper.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const canvasX = (mouseX - state.viewOffset.x) / state.viewScale;
    const canvasY = (mouseY - state.viewOffset.y) / state.viewScale;

    const zoomFactor = 1.12;
    let nextScale = state.viewScale;
    if (e.deltaY < 0) {
      nextScale *= zoomFactor;
    } else {
      nextScale /= zoomFactor;
    }

    state.viewScale = Math.max(0.05, Math.min(25.0, nextScale));
    state.viewOffset.x = mouseX - canvasX * state.viewScale;
    state.viewOffset.y = mouseY - canvasY * state.viewScale;

    updateViewTransform();
  }, { passive: false });

  wrapper.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragStart = { x: e.clientX - state.viewOffset.x, y: e.clientY - state.viewOffset.y };
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    state.viewOffset = {
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    };
    updateViewTransform();
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  wrapper.addEventListener('dblclick', () => {
    resetView();
  });
}

function updateViewTransform() {
  if (app && app.canvas) {
    app.canvas.style.transform = `translate(${state.viewOffset.x}px, ${state.viewOffset.y}px) scale(${state.viewScale})`;
  }
}

function resetView() {
  const wrapper = document.getElementById('canvas-wrapper');
  if (!wrapper) return;
  const wrapperRect = wrapper.getBoundingClientRect();
  
  if (!isModeAdmin()) {
    state.viewScale = 1.0;
    state.viewOffset = { x: 0, y: 0 };
    updateViewTransform();
    return;
  }

  const scaleX = wrapperRect.width / state.canvasWidth;
  const scaleY = wrapperRect.height / state.canvasHeight;
  state.viewScale = Math.min(scaleX, scaleY) * 0.95;
  
  state.viewOffset = {
    x: (wrapperRect.width - state.canvasWidth * state.viewScale) / 2,
    y: (wrapperRect.height - state.canvasHeight * state.viewScale) / 2
  };

  updateViewTransform();
}

function getPieceCenterlinePaths(piece, pieceIndex) {
  const [pKey, params, pos, pieceColor, deformedPaths] = piece;
  if (deformedPaths && deformedPaths.length > 0) {
    return deformedPaths.map(path => path.map(pt => [pt[0], pt[1], pieceIndex !== undefined ? pieceIndex : 0]));
  }

  const pInfo = PIECE_LIB[pKey];
  if (!pInfo) return [];

  const [px, py, pa] = pos;
  const rad = pa * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const tx = (lx, ly) => [
    px + (lx * cos - ly * sin),
    py + (lx * sin + ly * cos),
    pieceIndex !== undefined ? pieceIndex : 0
  ];

  if (pInfo.type === "STRAIGHT" || pInfo.type === "CROSS") {
    const len = pInfo.type === "CROSS" ? 144 : pInfo.len;
    const paths = [];
    
    // Subdivide straight line into multiple points
    const num = 10;
    const path1 = [];
    for (let i = 0; i <= num; i++) {
      path1.push(tx((len * i) / num, 0));
    }
    paths.push(path1);
    
    if (pInfo.type === "CROSS") {
      const path2 = [];
      const cx = len / 2;
      for (let i = 0; i <= num; i++) {
        const d = -len / 2 + (len * i) / num;
        path2.push(tx(cx, d));
      }
      paths.push(path2);
    }
    return paths;
  } else if (pInfo.type === "CURVE") {
    const { r, angle: sweep } = pInfo;
    const isCw = !params;
    const cY = params ? r : -r;
    const sa = params ? 270 : 90;
    const saRad = sa * Math.PI / 180;

    const points = [];
    const steps = 16;
    for (let i = 0; i <= steps; i++) {
      const angle = saRad + (params ? (sweep * i / steps) : (-sweep * i / steps)) * Math.PI / 180;
      const localX = r * Math.cos(angle);
      const localY = cY + r * Math.sin(angle);
      points.push(tx(localX, localY));
    }
    return [points];
  } else if (pInfo.type === "SWITCH") {
    const len = pInfo.len;
    const { r, angle: sweep } = pInfo;
    const isLeft = pInfo.dir === "left";
    const cY = isLeft ? -r : r;
    const sa = isLeft ? 90 : 270;
    const saRad = sa * Math.PI / 180;
    const isMerge = pInfo.style === "merge";

    const localStraight = [];
    const num = 10;
    for (let i = 0; i <= num; i++) {
      localStraight.push([(len * i) / num, 0]);
    }

    const localBranch = [];
    const steps = 16;
    for (let i = 0; i <= steps; i++) {
      const angle = saRad + (isLeft ? (-sweep * i / steps) : (sweep * i / steps)) * Math.PI / 180;
      const lx = r * Math.cos(angle);
      const ly = cY + r * Math.sin(angle);
      localBranch.push([lx, ly]);
    }

    let localTx = tx;
    if (isMerge) {
      localTx = (lx, ly) => {
        return tx(len - lx, -ly);
      };
    }

    return [
      localStraight.map(pt => localTx(pt[0], pt[1])),
      localBranch.map(pt => localTx(pt[0], pt[1]))
    ];
  }

  return [];
}

function buildConnectivityMap(track) {
  const conn = {};
  track.forEach((piece, pieceIndex) => {
    const paths = getPieceCenterlinePaths(piece, pieceIndex);
    paths.forEach((path, pathIndex) => {
      if (path.length < 2) return;
      const startPt = path[0];
      const endPt = path[path.length - 1];
      
      const startKey = `${startPt[0].toFixed(1)},${startPt[1].toFixed(1)}`;
      const endKey = `${endPt[0].toFixed(1)},${endPt[1].toFixed(1)}`;
      
      if (!conn[startKey]) conn[startKey] = [];
      conn[startKey].push({ pieceIndex, pathIndex, isStart: true });
      
      if (!conn[endKey]) conn[endKey] = [];
      conn[endKey].push({ pieceIndex, pathIndex, isStart: false });
    });
  });
  return conn;
}

function generateRandomLoopPath(track, conn) {
  const pathPoints = [];
  let current = { pieceIndex: 0, pathIndex: 0, goForward: true };
  
  let stepsCount = 0;
  const maxSteps = track.length * 4;
  
  while (stepsCount < maxSteps) {
    const piece = track[current.pieceIndex];
    const paths = getPieceCenterlinePaths(piece, current.pieceIndex);
    const path = paths[current.pathIndex];
    
    const pts = current.goForward ? [...path] : [...path].reverse();
    
    if (pathPoints.length > 0) {
      pathPoints.push(...pts.slice(1));
    } else {
      pathPoints.push(...pts);
    }
    
    const endPt = pts[pts.length - 1];
    const endKey = `${endPt[0].toFixed(1)},${endPt[1].toFixed(1)}`;
    
    if (stepsCount > 0 && current.pieceIndex === 0) {
      break;
    }
    
    const options = conn[endKey] || [];
    const candidates = options.filter(opt => opt.pieceIndex !== current.pieceIndex);
    
    if (candidates.length === 0) break;
    
    let nextOpt = null;
    if (candidates.length === 1) {
      nextOpt = candidates[0];
    } else {
      const lastPt = pts[pts.length - 1];
      const prevPt = pts[pts.length - 2];
      const vIn = { x: lastPt[0] - prevPt[0], y: lastPt[1] - prevPt[1] };
      
      const forwardCandidates = candidates.filter(opt => {
        const nextPiece = track[opt.pieceIndex];
        const nextPaths = getPieceCenterlinePaths(nextPiece, opt.pieceIndex);
        const nextPath = nextPaths[opt.pathIndex];
        const nextPts = opt.isStart ? [...nextPath] : [...nextPath].reverse();
        const vOut = { x: nextPts[1][0] - nextPts[0][0], y: nextPts[1][1] - nextPts[0][1] };
        
        const cosAngle = (vIn.x * vOut.x + vIn.y * vOut.y) / 
                         (Math.hypot(vIn.x, vIn.y) * Math.hypot(vOut.x, vOut.y));
        return cosAngle > 0;
      });
      
      const finalCandidates = forwardCandidates.length > 0 ? forwardCandidates : candidates;
      nextOpt = finalCandidates[Math.floor(Math.random() * finalCandidates.length)];
    }
    
    current = {
      pieceIndex: nextOpt.pieceIndex,
      pathIndex: nextOpt.pathIndex,
      goForward: nextOpt.isStart
    };
    stepsCount++;
  }
  return pathPoints;
}

function mergePaths(paths) {
  let list = paths.map(p => [...p]);
  let merged = [];
  
  while (list.length > 0) {
    let current = list.shift();
    let changed = true;
    
    while (changed) {
      changed = false;
      for (let i = 0; i < list.length; i++) {
        let other = list[i];
        if (other.length === 0) {
          list.splice(i, 1);
          i--;
          continue;
        }
        
        const startCur = current[0];
        const endCur = current[current.length - 1];
        const startOth = other[0];
        const endOth = other[other.length - 1];
        
        if (Math.hypot(endCur[0] - startOth[0], endCur[1] - startOth[1]) < 2.0) {
          current = current.concat(other.slice(1));
          list.splice(i, 1);
          changed = true;
          break;
        } else if (Math.hypot(startCur[0] - endOth[0], startCur[1] - endOth[1]) < 2.0) {
          current = other.concat(current.slice(1));
          list.splice(i, 1);
          changed = true;
          break;
        } else if (Math.hypot(endCur[0] - endOth[0], endCur[1] - endOth[1]) < 2.0) {
          let reversed = [...other].reverse();
          current = current.concat(reversed.slice(1));
          list.splice(i, 1);
          changed = true;
          break;
        } else if (Math.hypot(startCur[0] - startOth[0], startCur[1] - startOth[1]) < 2.0) {
          let reversed = [...other].reverse();
          current = reversed.concat(current.slice(1));
          list.splice(i, 1);
          changed = true;
          break;
        }
      }
    }
    merged.push(current);
  }
  
  return merged;
}

function getPointAtDistance(path, d, loop = true) {
  if (!path || path.length === 0) return null;
  if (path.length === 1) {
    let pieceIdx = path[0][2];
    if (pieceIdx === undefined || pieceIdx === null) {
      if (currentSceneData && currentSceneData.track) {
        pieceIdx = getClosestPieceIndex({ x: path[0][0], y: path[0][1] }, currentSceneData.track);
      } else {
        pieceIdx = 0;
      }
    }
    return { x: path[0][0], y: path[0][1], angle: 0, pieceIdx };
  }

  let lengths = [];
  let totalLength = 0;
  for (let i = 0; i < path.length - 1; i++) {
    let dist = Math.hypot(path[i+1][0] - path[i][0], path[i+1][1] - path[i][1]);
    lengths.push(dist);
    totalLength += dist;
  }

  if (loop && totalLength > 0) {
    d = ((d % totalLength) + totalLength) % totalLength;
  } else {
    d = Math.max(0, Math.min(d, totalLength));
  }

  let accumulated = 0;
  for (let i = 0; i < lengths.length; i++) {
    if (accumulated + lengths[i] >= d) {
      let t = lengths[i] > 0 ? (d - accumulated) / lengths[i] : 0;
      let p1 = path[i];
      let p2 = path[i+1];
      let x = p1[0] + (p2[0] - p1[0]) * t;
      let y = p1[1] + (p2[1] - p1[1]) * t;
      let angle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
      
      let pieceIdx = p1[2];
      if (pieceIdx === undefined || pieceIdx === null) {
        pieceIdx = (activeTrainPathPieceIndices && activeTrainPathPieceIndices.length > i) ? activeTrainPathPieceIndices[i] : undefined;
      }
      if (pieceIdx === undefined || pieceIdx === null) {
        if (currentSceneData && currentSceneData.track) {
          pieceIdx = getClosestPieceIndex({ x, y }, currentSceneData.track);
        } else {
          pieceIdx = 0;
        }
      }
      return { x, y, angle, pieceIdx };
    }
    accumulated += lengths[i];
  }

  let last = path[path.length - 1];
  let prev = path[path.length - 2] || last;
  let angle = Math.atan2(last[1] - prev[1], last[0] - prev[0]);
  
  let pieceIdx = last[2];
  if (pieceIdx === undefined || pieceIdx === null) {
    if (currentSceneData && currentSceneData.track) {
      pieceIdx = getClosestPieceIndex({ x: last[0], y: last[1] }, currentSceneData.track);
    } else {
      pieceIdx = 0;
    }
  }
  return { x: last[0], y: last[1], angle, pieceIdx };
}

function getClosestPieceIndex(pt, track) {
  let closestIdx = 0;
  let minDist = Infinity;
  for (let i = 0; i < track.length; i++) {
    const piece = track[i];
    const paths = getPieceCenterlinePaths(piece, i);
    for (const path of paths) {
      for (const pPt of path) {
        const dist = Math.hypot(pPt[0] - pt.x, pPt[1] - pt.y);
        if (dist < minDist) {
          minDist = dist;
          closestIdx = i;
        }
      }
    }
  }
  return closestIdx;
}

function drawTrain() {
  if (!activeTrainPath || activeTrainPath.length < 2 || !state.animateTrain) {
    trainCarGraphicsPool.forEach(g => {
      g.clear();
      g.visible = false;
    });
    return;
  }

  const numCars = 1;

  // Make sure the pool has the right size
  while (trainCarGraphicsPool.length < numCars) {
    const g = new PIXI.Graphics();
    trainCarGraphicsPool.push(g);
  }

  // Clear and update visibility/presence in trackContainer and draw the circles
  for (let i = 0; i < trainCarGraphicsPool.length; i++) {
    const g = trainCarGraphicsPool[i];
    g.clear();
    if (i < numCars) {
      g.visible = true;
      if (g.parent !== trackContainer) {
        trackContainer.addChild(g);
      }

      // Applica l'effetto moltiplica se attivo
      g.blendMode = state.trainMultiply ? 'multiply' : 'normal';

      // Draw single filled circle without anything else
      g.beginPath();
      g.circle(0, 0, state.trainSize);
      g.fill({ color: state.trainColor });
    } else {
      g.visible = false;
    }
  }

  // Position cars immediately
  updateTrainPositions();

  if (trackContainer && typeof trackContainer.sortChildren === 'function') {
    trackContainer.sortChildren();
  }
}

function getTrainLayer(path, distance, pieceLayers, trainSize, trackWidth) {
  if (!path || path.length < 2) return 0;

  // Calcola il raggio di ricerca basato sullo spessore del tracciato e la dimensione del treno
  // per prevenire la sovrapposizione visiva (clipping) sotto i pezzi a layer superiore.
  const checkRange = trackWidth / 2 + trainSize + 15;

  // Campioniamo 5 punti distribuiti nell'intervallo per determinare con precisione
  // se una parte del treno tocca o si sovrappone a un pezzo con layer superiore.
  const distances = [
    distance - checkRange,
    distance - checkRange / 2,
    distance,
    distance + checkRange / 2,
    distance + checkRange
  ];

  let maxLayer = 0;

  for (const d of distances) {
    const pt = getPointAtDistance(path, d);
    if (pt) {
      const pieceIdx = pt.pieceIdx !== undefined ? pt.pieceIdx : 0;
      const layer = pieceLayers[pieceIdx] || 0;
      if (layer > maxLayer) {
        maxLayer = layer;
      }
    }
  }

  return maxLayer;
}

function updateTrainPositions() {
  if (!activeTrainPath || activeTrainPath.length < 2) return;

  const numCars = 1;

  for (let i = 0; i < numCars; i++) {
    const g = trainCarGraphicsPool[i];
    if (!g || !g.visible) continue;

    const d_i = trainDistance;
    const pt = getPointAtDistance(activeTrainPath, d_i);
    if (pt) {
      g.position.set(pt.x, pt.y);
      g.rotation = pt.angle;

      const pieceLayer = getTrainLayer(
        activeTrainPath,
        d_i,
        activePieceLayers,
        state.trainSize,
        state.trackWidth
      );

      const targetZIndex = pieceLayer * 10 + 13;
      if (g.zIndex !== targetZIndex) {
        g.zIndex = targetZIndex;
      }
    }
  }

  // Always sort children when positions are updated to ensure correct layering
  if (trackContainer && typeof trackContainer.sortChildren === 'function') {
    trackContainer.sortChildren();
  }
}


function drawJointLine(graphics, x, y, dx, dy, tw, color, width) {
  const len = Math.hypot(dx, dy);
  if (len < 0.001) return;
  const px = -dy / len;
  const py = dx / len;
  graphics.beginPath();
  graphics.moveTo(x - px * tw / 2, y - py * tw / 2);
  graphics.lineTo(x + px * tw / 2, y + py * tw / 2);
  graphics.stroke({ color: color, width: width, cap: 'round' });
}

function generateSvgJointLine(x, y, dx, dy, tw, color, width) {
  const len = Math.hypot(dx, dy);
  if (len < 0.001) return "";
  const px = -dy / len;
  const py = dx / len;
  const x1 = x - px * tw / 2;
  const y1 = y - py * tw / 2;
  const x2 = x + px * tw / 2;
  const y2 = y + py * tw / 2;
  return `    <line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" />\n`;
}


function drawPixiPiece(parentContainer, pKey, params, px, py, pa, colors, deformedPaths, drawType = "both") {
  const pInfo = PIECE_LIB[pKey];
  if (!pInfo) return;

  const { baseColor, strokeColor, strokeWidth, trackWidth, showCapsuleCaps, showOutlines = true, showPieceOutlines = true, freeEnds } = colors;
  const tw = trackWidth;

  const rad = pa * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const toGlobal = (lx, ly) => {
    let localX = lx;
    let localY = ly;
    if (pInfo && pInfo.type === "SWITCH" && params === "MERGE") {
      const len = pInfo.len;
      localX = len - lx;
      localY = -ly;
    }
    return [
      px + (localX * cos - localY * sin),
      py + (localX * sin + localY * cos)
    ];
  };

  const drawOutline = ((showPieceOutlines || showOutlines) && (drawType === "both" || drawType === "outline"));
  const drawFill = (drawType === "both" || drawType === "fill");

  const pieceG = new PIXI.Graphics();
  if (deformedPaths && deformedPaths.length > 0) {
    pieceG.position.set(0, 0);
    pieceG.rotation = 0;
  } else {
    pieceG.position.set(px, py);
    pieceG.rotation = pa * Math.PI / 180;
  }
  parentContainer.addChild(pieceG);

  if (deformedPaths && deformedPaths.length > 0) {
    // Draw outline
    if (drawOutline) {
      for (const path of deformedPaths) {
        if (path.length > 0) {
          pieceG.beginPath();
          pieceG.moveTo(path[0][0], path[0][1]);
          for (let k = 1; k < path.length; k++) {
            pieceG.lineTo(path[k][0], path[k][1]);
          }
          pieceG.stroke({ color: strokeColor, width: tw + 2 * strokeWidth, cap: 'round' });
        }
      }
    }

    // Draw fill
    if (drawFill) {
      for (const path of deformedPaths) {
        if (path.length > 0) {
          pieceG.beginPath();
          pieceG.moveTo(path[0][0], path[0][1]);
          for (let k = 1; k < path.length; k++) {
            pieceG.lineTo(path[k][0], path[k][1]);
          }
          pieceG.stroke({ color: baseColor, width: tw, cap: 'round' });
        }
      }
    }

    if (showCapsuleCaps && drawFill) {
      const endPoints = [];
      for (const path of deformedPaths) {
        if (path.length > 0) {
          endPoints.push(path[0]);
          endPoints.push(path[path.length - 1]);
        }
      }
      pieceG.beginPath();
      for (const [cx, cy] of endPoints) {
        pieceG.circle(cx, cy, tw / 2);
      }
      pieceG.stroke({ color: strokeColor, width: strokeWidth });
    }
    return pieceG;
  }

  let drawTarget = pieceG;
  let endPoints = [];
  let jointDirs = [];

  if (pInfo.type === "STRAIGHT" || pInfo.type === "CROSS") {
    const len = pInfo.type === "CROSS" ? 144 : pInfo.len;
    endPoints = [[0, 0], [len, 0]];
    jointDirs = [[1, 0], [1, 0]];
    if (pInfo.type === "CROSS") {
      endPoints.push([len / 2, -len / 2], [len / 2, len / 2]);
      jointDirs.push([0, 1], [0, 1]);
    }
    
    // Draw outline
    if (drawOutline) {
      pieceG.beginPath();
      pieceG.moveTo(0, 0);
      pieceG.lineTo(len, 0);
      if (pInfo.type === "CROSS") {
        pieceG.moveTo(len / 2, -len / 2);
        pieceG.lineTo(len / 2, len / 2);
      }
      pieceG.stroke({ color: strokeColor, width: tw + 2 * strokeWidth, cap: 'round' });
    }

    // Draw fill
    if (drawFill) {
      pieceG.beginPath();
      pieceG.moveTo(0, 0);
      pieceG.lineTo(len, 0);
      if (pInfo.type === "CROSS") {
        pieceG.moveTo(len / 2, -len / 2);
        pieceG.lineTo(len / 2, len / 2);
      }
      pieceG.stroke({ color: baseColor, width: tw, cap: 'round' });
    }

  } else if (pInfo.type === "CURVE") {
    const { r, angle: sweep } = pInfo;
    const isLeft = !!params;
    const isCw = !isLeft;
    const cY = isLeft ? r : -r;
    const sa = isLeft ? 270 : 90;
    const saRad = sa * Math.PI / 180;
    const sweepRad = sweep * Math.PI / 180;
    const eaRad = saRad + (isLeft ? sweepRad : -sweepRad);

    const radStep = sweep * Math.PI / 180;
    const lx = r * Math.sin(radStep);
    let ly = r * (1 - Math.cos(radStep));
    if (!isLeft) ly = -ly;
    endPoints = [[0, 0], [lx, ly]];
    const curve_dx = Math.cos(radStep);
    const curve_dy = isLeft ? Math.sin(radStep) : -Math.sin(radStep);
    jointDirs = [[1, 0], [curve_dx, curve_dy]];

    // Draw outline
    if (drawOutline) {
      pieceG.beginPath();
      pieceG.arc(0, cY, r, saRad, eaRad, isCw);
      pieceG.stroke({ color: strokeColor, width: tw + 2 * strokeWidth, cap: 'round' });
    }

    // Draw fill
    if (drawFill) {
      pieceG.beginPath();
      pieceG.arc(0, cY, r, saRad, eaRad, isCw);
      pieceG.stroke({ color: baseColor, width: tw, cap: 'round' });
    }

  } else if (pInfo.type === "SWITCH") {
    const len = pInfo.len;
    const isLeft = pInfo.dir === "LEFT";
    const isMerge = params === "MERGE";
    const { branch_r: brR, branch_a: brA } = pInfo;
    const sweep = brA;

    if (isMerge) {
      const mergeG = new PIXI.Graphics();
      mergeG.position.set(len, 0);
      mergeG.rotation = Math.PI;
      pieceG.addChild(mergeG);
      drawTarget = mergeG;
    }

    const cY = isLeft ? brR : -brR;
    const sa = isLeft ? 270 : 90;
    const saRad = sa * Math.PI / 180;
    const sweepRad = sweep * Math.PI / 180;
    const eaRad = saRad + (isLeft ? sweepRad : -sweepRad);

    const radStep = sweep * Math.PI / 180;
    const lx = brR * Math.sin(radStep);
    let ly = brR * (1 - Math.cos(radStep));
    if (!isLeft) ly = -ly;
    endPoints = [[0, 0], [len, 0], [lx, ly]];
    const curve_dx = Math.cos(radStep);
    const curve_dy = isLeft ? Math.sin(radStep) : -Math.sin(radStep);
    jointDirs = [[1, 0], [1, 0], [curve_dx, curve_dy]];

    // Draw outline
    if (drawOutline) {
      drawTarget.beginPath();
      drawTarget.moveTo(0, 0);
      drawTarget.lineTo(len, 0);
      drawTarget.moveTo(0, 0);
      drawTarget.arc(0, cY, brR, saRad, eaRad, !isLeft);
      drawTarget.stroke({ color: strokeColor, width: tw + 2 * strokeWidth, cap: 'round' });
    }

    // Draw fill
    if (drawFill) {
      drawTarget.beginPath();
      drawTarget.moveTo(0, 0);
      drawTarget.lineTo(len, 0);
      drawTarget.moveTo(0, 0);
      drawTarget.arc(0, cY, brR, saRad, eaRad, !isLeft);
      drawTarget.stroke({ color: baseColor, width: tw, cap: 'round' });
    }
  }

  // Draw capsule end circumferences if enabled
  if (showCapsuleCaps && drawFill) {
    drawTarget.beginPath();
    for (const [cx, cy] of endPoints) {
      drawTarget.circle(cx, cy, tw / 2);
    }
    drawTarget.stroke({ color: strokeColor, width: strokeWidth });
  }
  return pieceG;
}

// --- MAIN SCENE RENDERING ---
let currentSceneData = null;

function renderScene() {
  if (!app) return;

  if (!state.seedLocked) {
    state.seed = Math.random().toString(36).substring(2, 9);
    document.getElementById('seedInput').value = state.seed;
  }

  const rng = new SeededRandom(state.seed);
  clearCache();

  // 1. Generation of track coordinates
  const genResult = generateValidatedLoop(
    state.targetN,
    state.straightPct,
    state.maxOverlaps,
    state.switchProb,
    state.maxSwitches,
    state.shapeStyle,
    state.maxTimeout,
    state.canvasWidth,
    state.canvasHeight,
    0.05, // Margin percentage (5%)
    state.minSwitchDist,
    state.maxSwitchDist,
    rng
  );

  // Determine color pool
  let colorsPool = state.palette;
  if (!state.allowBgColorForPieces && state.palette.length > 1) {
    colorsPool = colorsPool.slice(1);
  }
  if (state.excludeOutlineColorFromPieces && colorsPool.length > 1) {
    colorsPool = colorsPool.slice(0, -1);
  }
  
  // Choose monochrome color if requested
  const monoColor = state.monochromePieces ? rng.randomChoice(colorsPool) : null;

  // Map track to include random colors from palette
  const trackWithColors = genResult.track.map(p => {
    const pieceColor = state.monochromePieces ? monoColor : rng.randomChoice(colorsPool);
    return [p[0], p[1], p[2], pieceColor, p[3]];
  });

  currentSceneData = {
    track: trackWithColors,
    piecesCount: genResult.piecesCount,
    overlapCount: genResult.overlapCount,
    state: { ...state }
  };

  // 2. Clear canvas
  bgGraphics.clear();
  trackContainer.removeChildren();
  gridGraphics.clear();

  // Resize canvas if requested dimensions changed
  if (app.renderer.width !== state.canvasWidth || app.renderer.height !== state.canvasHeight) {
    app.renderer.resize(state.canvasWidth, state.canvasHeight);
    resetView();
  }

  // 3. Resolve visual colors
  const bgColor = state.useManualBg ? state.manualBgHex : (state.palette[0] || "#f5f5f0");
  const strokeColor = state.useManualStroke ? state.manualStrokeHex : (state.palette[state.palette.length - 1] || "#000000");
  const resolvedStrokeColor = strokeColor;

  // Background Fill
  bgGraphics.rect(0, 0, state.canvasWidth, state.canvasHeight);
  bgGraphics.fill({ color: bgColor });

  // 4. Center & Scale Track
  if (trackWithColors.length > 0) {
    const ptsX = [];
    const ptsY = [];
    for (const [pKey, params, pos, pieceColor, deformedPaths] of trackWithColors) {
      if (deformedPaths && deformedPaths.length > 0) {
        for (const path of deformedPaths) {
          for (const pt of path) {
            ptsX.push(pt[0]);
            ptsY.push(pt[1]);
          }
        }
      } else {
        ptsX.push(pos[0]);
        ptsY.push(pos[1]);
      }
    }
    const W_track = state.trackWidth + 2 * state.strokeWidth;
    const minX = Math.min(...ptsX) - W_track / 2;
    const maxX = Math.max(...ptsX) + W_track / 2;
    const minY = Math.min(...ptsY) - W_track / 2;
    const maxY = Math.max(...ptsY) + W_track / 2;

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const trackW = maxX - minX;
    const trackH = maxY - minY;

    let sf = 1.0;
    if (state.autoScale) {
      const drawAreaW = state.canvasWidth - 2 * state.margin;
      const drawAreaH = state.canvasHeight - 2 * state.margin;
      sf = Math.min(drawAreaW / trackW, drawAreaH / trackH);
    }

    // Set scale & position in container
    trackContainer.position.set(state.canvasWidth / 2, state.canvasHeight / 2);
    trackContainer.scale.set(sf);
    trackContainer.pivot.set(cx, cy);
    trackContainer.sortableChildren = true;

    gridGraphics.position.set(state.canvasWidth / 2, state.canvasHeight / 2);
    gridGraphics.scale.set(sf);
    gridGraphics.pivot.set(cx, cy);

    const N = trackWithColors.length;
    activePieceLayers = new Array(N).fill(0);
    for (let i = 0; i < N; i++) {
      activePieceLayers[i] = i;
    }

    // Precalculate all centerline paths for each piece (passing index)
    const piecePaths = [];
    for (let i = 0; i < N; i++) {
      piecePaths.push(getPieceCenterlinePaths(trackWithColors[i], i));
    }

    const freeEnds = getFreeEndpoints(trackWithColors);
    const baseColors = {
      strokeColor: resolvedStrokeColor,
      strokeWidth: state.strokeWidth,
      trackWidth: state.trackWidth,
      showCapsuleCaps: state.showCapsuleCaps,
      showOutlines: state.showOutlines,
      showPieceOutlines: state.showPieceOutlines,
      freeEnds: freeEnds
    };
    const fillOffset = state.showPieceOutlines ? 5 : 12;

    if (state.mergeSameColorPieces) {
      // Group all paths by color AND topological layer
      const colorLayersPaths = {};
      let pieceIndex = 0;
      for (const piece of trackWithColors) {
        const [pKey, params, pos, pieceColor, deformedPaths] = piece;
        const layer = activePieceLayers[pieceIndex] || 0;
        const key = `${pieceColor}_${layer}`;
        const paths = getPieceCenterlinePaths(piece, pieceIndex);
        if (!colorLayersPaths[key]) {
          colorLayersPaths[key] = {
            color: pieceColor,
            layer: layer,
            paths: []
          };
        }
        for (const p of paths) {
          if (p.length > 0) {
            colorLayersPaths[key].paths.push(p);
          }
        }
        pieceIndex++;
      }

      // Merge paths for each color/layer group
      const mergedColorLayersPaths = {};
      for (const key in colorLayersPaths) {
        const group = colorLayersPaths[key];
        mergedColorLayersPaths[key] = {
          color: group.color,
          layer: group.layer,
          paths: mergePaths(group.paths)
        };
      }

      // Draw the merged paths (connected pieces of the same color and layer are merged visually)
      for (const key in mergedColorLayersPaths) {
        const group = mergedColorLayersPaths[key];
        const color = group.color;
        const layer = group.layer;

        for (const path of group.paths) {
          if (path.length < 2) continue;

          // Draw outline on a lower zIndex layer (layer * 10)
          if (state.showOutlines) {
            const outlineG = new PIXI.Graphics();
            outlineG.zIndex = layer * 10; // Outlines layer
            trackContainer.addChild(outlineG);

            outlineG.beginPath();
            outlineG.moveTo(path[0][0], path[0][1]);
            for (let k = 1; k < path.length; k++) {
              outlineG.lineTo(path[k][0], path[k][1]);
            }
            outlineG.stroke({ color: resolvedStrokeColor, width: state.trackWidth + 2 * state.strokeWidth, cap: 'round', join: 'round' });
          }

          // Draw fill on a higher zIndex layer (layer * 10 + fillOffset)
          const fillG = new PIXI.Graphics();
          fillG.zIndex = layer * 10 + fillOffset; // Fills layer
          trackContainer.addChild(fillG);

          fillG.beginPath();
          fillG.moveTo(path[0][0], path[0][1]);
          for (let k = 1; k < path.length; k++) {
            fillG.lineTo(path[k][0], path[k][1]);
          }
          fillG.stroke({ color: color, width: state.trackWidth, cap: 'round', join: 'round' });

          // Draw end caps if enabled
          if (state.showCapsuleCaps) {
            const startPt = path[0];
            const endPt = path[path.length - 1];
            fillG.beginPath();
            fillG.circle(startPt[0], startPt[1], state.trackWidth / 2);
            fillG.circle(endPt[0], endPt[1], state.trackWidth / 2);
            fillG.stroke({ color: resolvedStrokeColor, width: state.strokeWidth });
          }
        }
      }

      if (state.showPieceOutlines) {
        let pieceIndex = 0;
        for (const [pKey, params, pos, pieceColor, deformedPaths] of trackWithColors) {
          const outlineG = drawPixiPiece(trackContainer, pKey, params, pos[0], pos[1], pos[2], {
            ...baseColors,
            baseColor: pieceColor
          }, deformedPaths, "outline");
          if (outlineG) {
            outlineG.zIndex = (activePieceLayers[pieceIndex] || 0) * 10;
          }
          pieceIndex++;
        }
      }
    } else {
      // Fallback: draw all track pieces individually (outlines and fills split)
      let pieceIndex = 0;
      for (const [pKey, params, pos, pieceColor, deformedPaths] of trackWithColors) {
        // Draw outline layer
        const outlineG = drawPixiPiece(trackContainer, pKey, params, pos[0], pos[1], pos[2], {
          ...baseColors,
          baseColor: pieceColor
        }, deformedPaths, "outline");
        if (outlineG) {
          outlineG.zIndex = (activePieceLayers[pieceIndex] || 0) * 10;
        }

        // Draw fill layer
        const fillG = drawPixiPiece(trackContainer, pKey, params, pos[0], pos[1], pos[2], {
          ...baseColors,
          baseColor: pieceColor
        }, deformedPaths, "fill");
        if (fillG) {
          fillG.zIndex = (activePieceLayers[pieceIndex] || 0) * 10 + fillOffset;
        }

        pieceIndex++;
      }
    }

    // Draw joint patch for N-1 -> 0 connection if layout is closed
    const isClosed = !freeEnds || freeEnds.length === 0;
    if (isClosed && trackWithColors.length > 0) {
      const paths0 = piecePaths[0];
      if (paths0 && paths0.length > 0 && paths0[0].length > 0) {
        const jointPt = paths0[0][0];
        const patchG = new PIXI.Graphics();
        patchG.zIndex = N * 10 + 5;
        trackContainer.addChild(patchG);
        patchG.beginPath();
        patchG.circle(jointPt[0], jointPt[1], state.trackWidth / 2);
        patchG.fill({ color: trackWithColors[0][3] });
      }
    }

    // Calculate active train path (random loop starting at piece 0)
    const connMap = buildConnectivityMap(trackWithColors);
    activeTrainPath = generateRandomLoopPath(trackWithColors, connMap);
    activeTrainPathPieceIndices = [];
    if (activeTrainPath) {
      activeTrainPathPieceIndices = activeTrainPath.map(pt => pt[2] !== undefined ? pt[2] : 0);
    }

    if (trackContainer && typeof trackContainer.sortChildren === 'function') {
      trackContainer.sortChildren();
    }

    drawTrain();

    // Canvas boundary visual aid
    if (state.showGridStroke) {
      gridGraphics.rect(minX - 50, minY - 50, trackW, trackH);
      gridGraphics.stroke({ color: 0xee5555, width: 2, alpha: 0.5 });
    }
  }

  // Immersive Mode check
  const canvasArea = document.querySelector('.canvas-area');
  if (canvasArea) {
    if (state.immersiveMode) {
      canvasArea.style.setProperty('--canvas-area-bg', bgColor);
      canvasArea.style.backgroundColor = bgColor;
      if (app.canvas) app.canvas.style.boxShadow = 'none';
    } else {
      canvasArea.style.removeProperty('--canvas-area-bg');
      canvasArea.style.backgroundColor = '';
      if (app.canvas) app.canvas.style.boxShadow = '';
    }
  }
}

function lineSegmentsIntersect(p1, p2, p3, p4) {
  const x0_start = p1[0], y0_start = p1[1];
  const x0_end = p2[0], y0_end = p2[1];
  const x1_start = p3[0], y1_start = p3[1];
  const x1_end = p4[0], y1_end = p4[1];

  const s1_x = x0_end - x0_start;
  const s1_y = y0_end - y0_start;
  const s2_x = x1_end - x1_start;
  const s2_y = y1_end - y1_start;

  const denom = -s2_x * s1_y + s1_x * s2_y;
  if (denom === 0) return false;

  const s = (-s1_y * (x0_start - x1_start) + s1_x * (y0_start - y1_start)) / denom;
  const t = ( s2_x * (y0_start - y1_start) - s2_y * (x0_start - x1_start)) / denom;

  return (s >= 0 && s <= 1 && t >= 0 && t <= 1);
}

function doPathsOverlapOrIntersect(pathsI, pathsJ, trackWidth) {
  // 1. Check actual segment intersections
  for (const pathI of pathsI) {
    for (const pathJ of pathsJ) {
      for (let i = 0; i < pathI.length - 1; i++) {
        for (let j = 0; j < pathJ.length - 1; j++) {
          if (lineSegmentsIntersect(pathI[i], pathI[i+1], pathJ[j], pathJ[j+1])) {
            return true;
          }
        }
      }
    }
  }

  // 2. Point distance fallback (using a safe threshold to avoid parallel track bleed-through)
  const threshold = Math.min(35.0, trackWidth * 0.8);
  for (const pathI of pathsI) {
    for (const pathJ of pathsJ) {
      for (const ptI of pathI) {
        for (const ptJ of pathJ) {
          const dist = Math.hypot(ptI[0] - ptJ[0], ptI[1] - ptJ[1]);
          if (dist < threshold) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

function arePiecesConnected(pathsI, pathsJ) {
  for (const pathI of pathsI) {
    if (pathI.length === 0) continue;
    const endsI = [pathI[0], pathI[pathI.length - 1]];
    for (const pathJ of pathsJ) {
      if (pathJ.length === 0) continue;
      const endsJ = [pathJ[0], pathJ[pathJ.length - 1]];
      for (const eI of endsI) {
        for (const eJ of endsJ) {
          if (Math.hypot(eI[0] - eJ[0], eI[1] - eJ[1]) < 5.0) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

function isPointInList(pt, list) {
  for (const p of list) {
    if (Math.hypot(pt[0] - p[0], pt[1] - p[1]) < 5.0) {
      return true;
    }
  }
  return false;
}

function getFreeEndpoints(track) {
  const endpoints = [];
  for (let i = 0; i < track.length; i++) {
    const paths = getPieceCenterlinePaths(track[i], i);
    for (const path of paths) {
      if (path.length > 0) {
        endpoints.push(path[0]);
        endpoints.push(path[path.length - 1]);
      }
    }
  }

  const freeEnds = [];
  for (let i = 0; i < endpoints.length; i++) {
    let connectionsCount = 0;
    const pt1 = endpoints[i];
    for (let j = 0; j < endpoints.length; j++) {
      if (i === j) continue;
      const pt2 = endpoints[j];
      if (Math.hypot(pt1[0] - pt2[0], pt1[1] - pt2[1]) < 5.0) {
        connectionsCount++;
      }
    }
    if (connectionsCount === 0) {
      freeEnds.push(pt1);
    }
  }
  return freeEnds;
}


function updateTrainSizeLimits() {
  const trainSizeEl = document.getElementById('trainSize');
  if (!trainSizeEl) return;
  const maxTrainSize = Math.max(2, Math.floor(state.trackWidth / 2));
  trainSizeEl.min = 2;
  trainSizeEl.max = maxTrainSize;
  if (state.trainSize > maxTrainSize) {
    state.trainSize = maxTrainSize;
  }
  if (state.trainSize < 2) {
    state.trainSize = 2;
  }
  trainSizeEl.value = state.trainSize;
  const valEl = document.getElementById('trainSize-val');
  if (valEl) {
    valEl.textContent = state.trainSize;
  }
}

// --- GUI CONFIGURATION & BINDINGS ---
function syncGUI() {
  document.getElementById('canvasWidthInput').value = state.canvasWidth;
  document.getElementById('canvasHeightInput').value = state.canvasHeight;
  document.getElementById('canvasUnitSelect').value = state.canvasUnit;
  
  document.getElementById('margin').value = state.margin;
  document.getElementById('margin-val').textContent = state.margin;
  document.getElementById('autoScale').checked = state.autoScale;

  document.getElementById('targetN').value = state.targetN;
  document.getElementById('targetN-val').textContent = state.targetN;
  document.getElementById('straightPct').value = state.straightPct;
  document.getElementById('straightPct-val').textContent = state.straightPct.toFixed(2);
  document.getElementById('maxOverlaps').value = state.maxOverlaps;
  document.getElementById('maxOverlaps-val').textContent = state.maxOverlaps;
  document.getElementById('switchProb').value = state.switchProb;
  document.getElementById('switchProb-val').textContent = state.switchProb.toFixed(2);
  document.getElementById('maxSwitches').value = state.maxSwitches;
  document.getElementById('maxSwitches-val').textContent = state.maxSwitches;
  document.getElementById('minSwitchDist').value = state.minSwitchDist;
  document.getElementById('minSwitchDist-val').textContent = state.minSwitchDist;
  document.getElementById('maxSwitchDist').value = state.maxSwitchDist;
  document.getElementById('maxSwitchDist-val').textContent = state.maxSwitchDist;
  document.getElementById('shapeStyle').value = state.shapeStyle;
  document.getElementById('maxTimeout').value = state.maxTimeout;
  document.getElementById('maxTimeout-val').textContent = state.maxTimeout;

  document.getElementById('trackWidth').value = state.trackWidth;
  document.getElementById('trackWidth-val').textContent = state.trackWidth;
  document.getElementById('showGridStroke').checked = state.showGridStroke;
  document.getElementById('showOutlines').checked = state.showOutlines;
  document.getElementById('showPieceOutlines').checked = state.showPieceOutlines;
  document.getElementById('showCapsuleCaps').checked = state.showCapsuleCaps;
  document.getElementById('strokeWidth').value = state.strokeWidth;
  document.getElementById('strokeWidth-val').textContent = state.strokeWidth.toFixed(1);

  document.getElementById('palettePresetSelect').value = state.activePaletteName;
  document.getElementById('useManualBg').checked = state.useManualBg;
  document.getElementById('manualBgHex').value = state.manualBgHex;
  document.getElementById('useManualStroke').checked = state.useManualStroke;
  document.getElementById('manualStrokeHex').value = state.manualStrokeHex;
  document.getElementById('allowBgColorForPieces').checked = state.allowBgColorForPieces;
  document.getElementById('monochromePieces').checked = state.monochromePieces;
  document.getElementById('mergeSameColorPieces').checked = state.mergeSameColorPieces;
  document.getElementById('excludeOutlineColorFromPieces').checked = state.excludeOutlineColorFromPieces;

  document.getElementById('seedInput').value = state.seed;
  document.getElementById('seedLockToggle').checked = state.seedLocked;

  document.getElementById('animateTrain').checked = state.animateTrain;
  document.getElementById('trainMultiply').checked = state.trainMultiply;
  document.getElementById('trainSpeed').value = state.trainSpeed;
  document.getElementById('trainSpeed-val').textContent = state.trainSpeed;
  document.getElementById('trainColor').value = state.trainColor;
  
  updateTrainSizeLimits();

  const isCustom = state.activePaletteName.startsWith('Custom_');
  const deleteBtn = document.getElementById('delete-palette-btn');
  if (deleteBtn) {
    deleteBtn.disabled = !isCustom;
    deleteBtn.style.opacity = isCustom ? '1' : '0.4';
    deleteBtn.style.cursor = isCustom ? 'pointer' : 'not-allowed';
  }

  renderPaletteSwatches();
}

function renderPaletteSwatches() {
  const container = document.getElementById('palette-colors-list');
  container.innerHTML = '';

  state.palette.forEach((color, idx) => {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';

    const input = document.createElement('input');
    input.type = 'color';
    input.value = color;
    input.addEventListener('input', (e) => {
      state.palette[idx] = e.target.value;
      saveCustomPalette();
      renderScene();
    });

    swatch.appendChild(input);

    if (state.palette.length > 2) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-color-btn';
      removeBtn.innerHTML = '×';
      removeBtn.addEventListener('click', () => {
        state.palette.splice(idx, 1);
        saveCustomPalette();
        renderPaletteSwatches();
        renderScene();
      });
      swatch.appendChild(removeBtn);
    }
    container.appendChild(swatch);
  });
}

function saveCustomPalette() {
  if (!state.activePaletteName.startsWith('Custom_')) {
    state.activePaletteName = `Custom_${Math.floor(Date.now() / 1000).toString().substring(6)}`;
  }
  const saved = JSON.parse(localStorage.getItem('brio_custom_palettes') || '{}');
  saved[state.activePaletteName] = state.palette;
  localStorage.setItem('brio_custom_palettes', JSON.stringify(saved));
  populatePaletteSelect();
  syncGUI();
}

function populatePaletteSelect() {
  const select = document.getElementById('palettePresetSelect');
  select.innerHTML = '';

  const presetsGroup = document.createElement('optgroup');
  presetsGroup.label = 'Preset Originali';
  Object.keys(PALETTES).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    presetsGroup.appendChild(opt);
  });
  select.appendChild(presetsGroup);

  const customPalettes = JSON.parse(localStorage.getItem('brio_custom_palettes') || '{}');
  const customKeys = Object.keys(customPalettes);
  if (customKeys.length > 0) {
    const customGroup = document.createElement('optgroup');
    customGroup.label = 'Palette Custom';
    customKeys.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      customGroup.appendChild(opt);
    });
    select.appendChild(customGroup);
  }
  select.value = state.activePaletteName;
}

function setupEvents() {
  document.getElementById('canvasFormatSelect').addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'CUSTOM_PX') {
      state.canvasUnit = "px";
      syncGUI();
      return;
    }
    if (val === 'CUSTOM_CM') {
      state.canvasUnit = "cm";
      syncGUI();
      return;
    }

    const fmt = PRESET_FORMATS[val];
    if (fmt) {
      state.canvasUnit = fmt.unit;
      if (fmt.unit === "px") {
        state.canvasWidth = fmt.w;
        state.canvasHeight = fmt.h;
      } else {
        state.canvasWidth = cmToPx(fmt.w);
        state.canvasHeight = cmToPx(fmt.h);
      }
      syncGUI();
      renderScene();
    }
  });

  const updateWidthHeight = () => {
    const wVal = parseFloat(document.getElementById('canvasWidthInput').value) || 1080;
    const hVal = parseFloat(document.getElementById('canvasHeightInput').value) || 1440;
    if (state.canvasUnit === 'px') {
      state.canvasWidth = Math.round(wVal);
      state.canvasHeight = Math.round(hVal);
    } else {
      state.canvasWidth = cmToPx(wVal);
      state.canvasHeight = cmToPx(hVal);
    }
    document.getElementById('canvasFormatSelect').value = state.canvasUnit === 'px' ? 'CUSTOM_PX' : 'CUSTOM_CM';
    renderScene();
  };

  document.getElementById('canvasWidthInput').addEventListener('change', updateWidthHeight);
  document.getElementById('canvasHeightInput').addEventListener('change', updateWidthHeight);

  document.getElementById('canvasUnitSelect').addEventListener('change', (e) => {
    const nextUnit = e.target.value;
    if (nextUnit === state.canvasUnit) return;

    if (nextUnit === 'cm') {
      document.getElementById('canvasWidthInput').value = pxToCm(state.canvasWidth);
      document.getElementById('canvasHeightInput').value = pxToCm(state.canvasHeight);
      document.getElementById('canvasWidthLabel').textContent = "Larghezza (cm)";
      document.getElementById('canvasHeightLabel').textContent = "Altezza (cm)";
      document.getElementById('canvasFormatSelect').value = 'CUSTOM_CM';
    } else {
      document.getElementById('canvasWidthInput').value = state.canvasWidth;
      document.getElementById('canvasHeightInput').value = state.canvasHeight;
      document.getElementById('canvasWidthLabel').textContent = "Larghezza (px)";
      document.getElementById('canvasHeightLabel').textContent = "Altezza (px)";
      document.getElementById('canvasFormatSelect').value = 'CUSTOM_PX';
    }
    state.canvasUnit = nextUnit;
  });

  const attachSlider = (id, stateProp, step = 1, parseFunc = parseFloat) => {
    const slider = document.getElementById(id);
    slider.addEventListener('input', (e) => {
      const val = parseFunc(e.target.value);
      state[stateProp] = val;
      const valEl = document.getElementById(`${id}-val`);
      if (valEl) {
        valEl.textContent = step < 1 ? val.toFixed(2) : val;
      }
      renderScene();
    });
  };

  attachSlider('margin', 'margin');
  attachSlider('targetN', 'targetN');
  attachSlider('straightPct', 'straightPct', 0.01);
  attachSlider('maxOverlaps', 'maxOverlaps');
  attachSlider('switchProb', 'switchProb', 0.01);
  attachSlider('maxSwitches', 'maxSwitches');
  
  const minSwitchDistSlider = document.getElementById('minSwitchDist');
  const maxSwitchDistSlider = document.getElementById('maxSwitchDist');

  minSwitchDistSlider.addEventListener('input', (e) => {
    let val = parseInt(e.target.value);
    let maxVal = parseInt(maxSwitchDistSlider.value);
    if (val > maxVal) {
      maxSwitchDistSlider.value = val;
      state.maxSwitchDist = val;
      const maxValEl = document.getElementById('maxSwitchDist-val');
      if (maxValEl) maxValEl.textContent = val;
    }
    state.minSwitchDist = val;
    const minValEl = document.getElementById('minSwitchDist-val');
    if (minValEl) minValEl.textContent = val;
    renderScene();
  });

  maxSwitchDistSlider.addEventListener('input', (e) => {
    let val = parseInt(e.target.value);
    let minVal = parseInt(minSwitchDistSlider.value);
    if (val < minVal) {
      minSwitchDistSlider.value = val;
      state.minSwitchDist = val;
      const minValEl = document.getElementById('minSwitchDist-val');
      if (minValEl) minValEl.textContent = val;
    }
    state.maxSwitchDist = val;
    const maxValEl = document.getElementById('maxSwitchDist-val');
    if (maxValEl) maxValEl.textContent = val;
    renderScene();
  });

  attachSlider('maxTimeout', 'maxTimeout');
  
  // Custom trackWidth handler to also clamp train size limits
  const trackWidthSlider = document.getElementById('trackWidth');
  trackWidthSlider.addEventListener('input', (e) => {
    state.trackWidth = parseFloat(e.target.value) || 100;
    const valEl = document.getElementById('trackWidth-val');
    if (valEl) {
      valEl.textContent = state.trackWidth;
    }
    updateTrainSizeLimits();
    renderScene();
  });

  attachSlider('strokeWidth', 'strokeWidth', 0.1);

  const attachCheckbox = (id, stateProp) => {
    document.getElementById(id).addEventListener('change', (e) => {
      state[stateProp] = e.target.checked;
      syncGUI();
      renderScene();
    });
  };

  attachCheckbox('autoScale', 'autoScale');
  attachCheckbox('showGridStroke', 'showGridStroke');
  attachCheckbox('showOutlines', 'showOutlines');
  attachCheckbox('showPieceOutlines', 'showPieceOutlines');
  attachCheckbox('showCapsuleCaps', 'showCapsuleCaps');
  attachCheckbox('useManualBg', 'useManualBg');
  attachCheckbox('useManualStroke', 'useManualStroke');
  attachCheckbox('seedLockToggle', 'seedLocked');
  attachCheckbox('allowBgColorForPieces', 'allowBgColorForPieces');
  attachCheckbox('monochromePieces', 'monochromePieces');
  attachCheckbox('mergeSameColorPieces', 'mergeSameColorPieces');
  attachCheckbox('excludeOutlineColorFromPieces', 'excludeOutlineColorFromPieces');
  attachCheckbox('animateTrain', 'animateTrain');
  attachCheckbox('trainMultiply', 'trainMultiply');

  document.getElementById('trainSpeed').addEventListener('input', (e) => {
    state.trainSpeed = parseFloat(e.target.value) || 3;
    document.getElementById('trainSpeed-val').textContent = state.trainSpeed;
  });



  document.getElementById('trainColor').addEventListener('input', (e) => {
    state.trainColor = e.target.value;
    if (state.animateTrain) {
      drawTrain();
    }
  });

  document.getElementById('trainSize').addEventListener('input', (e) => {
    state.trainSize = parseInt(e.target.value) || 20;
    document.getElementById('trainSize-val').textContent = state.trainSize;
    if (state.animateTrain) {
      drawTrain();
    }
  });

  document.getElementById('shapeStyle').addEventListener('change', (e) => {
    state.shapeStyle = e.target.value;
    renderScene();
  });

  document.getElementById('palettePresetSelect').addEventListener('change', (e) => {
    const val = e.target.value;
    state.activePaletteName = val;
    if (PALETTES[val]) {
      state.palette = [...PALETTES[val]];
    } else {
      const customPalettes = JSON.parse(localStorage.getItem('brio_custom_palettes') || '{}');
      if (customPalettes[val]) {
        state.palette = [...customPalettes[val]];
      }
    }
    syncGUI();
    renderScene();
  });

  document.getElementById('manualBgHex').addEventListener('input', (e) => {
    state.manualBgHex = e.target.value;
    if (state.useManualBg) renderScene();
  });

  document.getElementById('manualStrokeHex').addEventListener('input', (e) => {
    state.manualStrokeHex = e.target.value;
    if (state.useManualStroke) renderScene();
  });

  const deleteBtn = document.getElementById('delete-palette-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      if (state.activePaletteName.startsWith('Custom_')) {
        const saved = JSON.parse(localStorage.getItem('brio_custom_palettes') || '{}');
        delete saved[state.activePaletteName];
        localStorage.setItem('brio_custom_palettes', JSON.stringify(saved));

        // Fallback to Skolp_01
        state.activePaletteName = 'Skolp_01';
        state.palette = [...PALETTES['Skolp_01']];

        populatePaletteSelect();
        syncGUI();
        renderScene();
      }
    });
  }

  document.getElementById('add-color-btn').addEventListener('click', () => {
    state.palette.push("#ffffff");
    saveCustomPalette();
    renderPaletteSwatches();
    renderScene();
  });

  document.getElementById('shuffle-colors-btn').addEventListener('click', () => {
    state.palette = state.palette.sort(() => Math.random() - 0.5);
    saveCustomPalette();
    renderPaletteSwatches();
    renderScene();
  });

  document.getElementById('seedInput').addEventListener('change', (e) => {
    state.seed = e.target.value;
    renderScene();
  });

  document.getElementById('regenerate-btn').addEventListener('click', () => {
    state.seed = Math.random().toString(36).substring(2, 9);
    document.getElementById('seedInput').value = state.seed;
    renderScene();
  });

  document.getElementById('randomize-params-btn').addEventListener('click', () => {
    randomizeParams();
  });

  const immersiveBtn = document.getElementById('immersive-preview-btn');
  if (immersiveBtn) {
    immersiveBtn.addEventListener('click', () => {
      state.immersiveMode = !state.immersiveMode;
      immersiveBtn.classList.toggle('active', state.immersiveMode);
      document.body.classList.toggle('immersive-mode', state.immersiveMode);
      renderScene();
    });
  }

  document.getElementById('export-png-btn').addEventListener('click', downloadPNG);
  document.getElementById('export-svg-btn').addEventListener('click', downloadSVG);
  document.getElementById('export-json-btn').addEventListener('click', exportJSON);
  document.getElementById('export-video-btn').addEventListener('click', startVideoExport);
  
  document.getElementById('import-json-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) importJSON(file);
  });

  document.getElementById('export-batch-btn').addEventListener('click', () => {
    const count = parseInt(document.getElementById('batchCountInput').value) || 5;
    runBatchExport(count, false);
  });

  document.getElementById('export-batch-random-btn').addEventListener('click', () => {
    const count = parseInt(document.getElementById('batchCountInput').value) || 5;
    runBatchExport(count, true);
  });

  setupNumberSteppers();
}

function setupNumberSteppers() {
  const numberInputs = document.querySelectorAll('input[type="number"]');
  numberInputs.forEach(input => {
    if (input.dataset.stepperInit || input.closest('.number-stepper-wrap')) return;
    input.dataset.stepperInit = 'true';

    const wrapper = document.createElement('div');
    wrapper.className = 'number-stepper-wrap';

    if (input.style.width) {
      wrapper.style.width = input.style.width;
      input.style.width = '100%';
    }

    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const controls = document.createElement('div');
    controls.className = 'stepper-controls';

    const btnUp = document.createElement('button');
    btnUp.type = 'button';
    btnUp.className = 'stepper-btn stepper-up';
    btnUp.setAttribute('aria-label', 'Aumenta valore');
    btnUp.textContent = '▲';

    const btnDown = document.createElement('button');
    btnDown.type = 'button';
    btnDown.className = 'stepper-btn stepper-down';
    btnDown.setAttribute('aria-label', 'Diminuisci valore');
    btnDown.textContent = '▼';

    controls.appendChild(btnUp);
    controls.appendChild(btnDown);
    wrapper.appendChild(controls);

    const changeVal = (delta) => {
      const step = parseFloat(input.step) || 1;
      const min = input.min !== '' ? parseFloat(input.min) : -Infinity;
      const max = input.max !== '' ? parseFloat(input.max) : Infinity;
      const current = parseFloat(input.value) || 0;
      let nextVal = current + (delta > 0 ? step : -step);
      nextVal = Math.max(min, Math.min(max, parseFloat(nextVal.toFixed(4))));
      input.value = nextVal;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const attachAutoRepeat = (btn, delta) => {
      let timeoutId = null;
      let intervalId = null;

      const stop = () => {
        if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
        if (intervalId) { clearInterval(intervalId); intervalId = null; }
        window.removeEventListener('mouseup', stop);
        window.removeEventListener('blur', stop);
      };

      const start = (e) => {
        if (e.type === 'touchstart') e.preventDefault();
        changeVal(delta);
        window.addEventListener('mouseup', stop, { once: true });
        window.addEventListener('blur', stop, { once: true });
        timeoutId = setTimeout(() => {
          intervalId = setInterval(() => {
            changeVal(delta);
          }, 60);
        }, 300);
      };

      btn.addEventListener('mousedown', start);
      btn.addEventListener('mouseup', stop);
      btn.addEventListener('mouseleave', stop);
      btn.addEventListener('touchstart', start, { passive: false });
      btn.addEventListener('touchend', stop);
      btn.addEventListener('touchcancel', stop);
    };

    attachAutoRepeat(btnUp, 1);
    attachAutoRepeat(btnDown, -1);
  });
}

function randomizeParams() {
  state.targetN = Math.floor(Math.random() * 60) + 15; // 15 to 75
  state.straightPct = Math.random() * 0.4; // 0 to 40%
  state.maxOverlaps = Math.floor(Math.random() * 15) + 3; // 3 to 18
  state.switchProb = Math.random() * 0.8; // 0 to 80%
  state.maxSwitches = Math.floor(Math.random() * 4) + 1; // 1 to 5
  
  const possibleDists = [3, 5, 7, 9, 11];
  const idx1 = Math.floor(Math.random() * possibleDists.length);
  const idx2 = Math.floor(Math.random() * possibleDists.length);
  state.minSwitchDist = possibleDists[Math.min(idx1, idx2)];
  state.maxSwitchDist = possibleDists[Math.max(idx1, idx2)];

  state.shapeStyle = ["dynamic", "circular", "mixed"][Math.floor(Math.random() * 3)];
  state.trackWidth = Math.floor(Math.random() * 130) + 20;

  const pKeys = Object.keys(PALETTES);
  state.activePaletteName = pKeys[Math.floor(Math.random() * pKeys.length)];
  state.palette = [...PALETTES[state.activePaletteName]];
  
  state.seed = Math.random().toString(36).substring(2, 9);
  
  syncGUI();
  renderScene();
}

// --- LOCAL SAVING ENDPOINT CALLS ---
async function saveFileLocally(filename, content, isBase64 = false) {
  try {
    const response = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, content, isBase64 })
    });
    const result = await response.json();
    if (result.success) {
      console.log(`[Local Save] File saved in Download_Brio: ${filename}`);
    } else {
      console.error(`[Local Save] Error saving file: ${result.error}`);
    }
  } catch (err) {
    console.error(`[Local Save] Connection failed.`, err);
  }
}

async function downloadPNG() {
  if (!app) return;
  const dataUrl = app.canvas.toDataURL("image/png");
  const filename = `Brio_Track_${state.seed || 'art'}.png`;

  await saveFileLocally(filename, dataUrl, true);

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

function getPathTotalLength(path) {
  if (!path || path.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    total += Math.hypot(path[i+1][0] - path[i][0], path[i+1][1] - path[i][1]);
  }
  return total;
}

function stopVideoRecording() {
  if (!isRecordingVideo) return;
  isRecordingVideo = false;
  
  // Blocchiamo temporaneamente l'animazione per tenere il treno fisso sull'ultimo frame
  state.animateTrain = false;
  
  // Forza il rendering del frame finale
  if (app) {
    try {
      app.render();
    } catch (e) {
      console.warn("Forzatura render fallita:", e);
    }
  }

  // Ritarda l'arresto effettivo di 50ms per consentire al MediaRecorder di catturare l'ultimo frame
  setTimeout(() => {
    if (videoRecorder && videoRecorder.state !== 'inactive') {
      videoRecorder.stop();
    }
  }, 50);
}

async function startVideoExport() {
  if (!app || !app.canvas || !activeTrainPath || activeTrainPath.length < 2) {
    alert("Crea prima un circuito con un treno attivo per esportare il video!");
    return;
  }

  if (typeof app.canvas.captureStream !== 'function') {
    alert("L'esportazione video non è supportata su questo browser.");
    return;
  }

  const btn = document.getElementById('export-video-btn');
  btn.disabled = true;
  btn.textContent = 'Registrazione: 0%';

  // Stato iniziale di registrazione
  isRecordingVideo = true;
  videoChunks = [];
  trainDistance = 0; // Resetta all'inizio del tracciato
  recordingStopRequested = false;

  wasAnimatingInitially = state.animateTrain;

  // Forza l'animazione se non attiva
  if (!state.animateTrain) {
    state.animateTrain = true;
    syncGUI();
    renderScene();
  }

  // Rileva il mimeType con la stessa priorità di ascii-facemaker-master
  const candidateTypes = [
    'video/mp4;codecs=h264,aac',
    'video/mp4;codecs=h264',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ];
  let mimeType = '';
  for (const type of candidateTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      mimeType = type;
      break;
    }
  }

  const stream = app.canvas.captureStream(30); // 30 FPS
  videoRecorder = new MediaRecorder(stream, { mimeType });

  videoRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      videoChunks.push(e.data);
    }
  };

  videoRecorder.onstop = async () => {
    const blob = new Blob(videoChunks, { type: mimeType || 'video/webm' });
    const isMp4 = mimeType.includes('video/mp4');
    const convertToMp4 = !isMp4; // Converti solo se il browser non ha registrato nativamente in MP4
    const ext = isMp4 ? 'mp4' : 'webm';
    const filename = `Brio_Track_${state.seed || 'art'}.${ext}`;

    btn.textContent = convertToMp4 ? 'Conversione video in corso...' : 'Salvataggio video...';

    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
      const base64data = reader.result;
      const localUrl = URL.createObjectURL(blob);
      
      try {
        const response = await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename,
            content: base64data,
            isBase64: true,
            convertToMp4: convertToMp4
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          const link = document.createElement('a');
          if (convertToMp4 && result.mp4Data) {
            link.download = result.mp4Filename || filename.replace(/\.webm$/, '.mp4');
            link.href = result.mp4Data;
          } else {
            link.download = filename;
            link.href = localUrl;
          }
          link.click();
        } else {
          console.warn("Salvataggio/Conversione fallita, scarico file registrato:", result.error);
          const link = document.createElement('a');
          link.download = filename;
          link.href = localUrl;
          link.click();
        }
      } catch (err) {
        console.error("Errore API, scarico file registrato localmente:", err);
        const link = document.createElement('a');
        link.download = filename;
        link.href = localUrl;
        link.click();
      }

      // Rilascia l'URL del blob con un leggero ritardo per assicurarne il download
      setTimeout(() => URL.revokeObjectURL(localUrl), 100);

      // Ripristina lo stato iniziale dell'animazione
      state.animateTrain = wasAnimatingInitially;
      syncGUI();
      if (!wasAnimatingInitially) {
        renderScene();
      }

      btn.disabled = false;
      btn.textContent = 'Esporta Video (MP4)';
    };
  };

  videoRecorder.start();
}

// --- SVG EXPORT GENERATOR ---
function getSvgPegPath(x, y, angle, isHole, colors) {
  return "";
}

function generateSvgPiece(pKey, params, px, py, pa, colors, deformedPaths, drawType = "both") {
  const pInfo = PIECE_LIB[pKey];
  if (!pInfo) return "";

  const { baseColor, strokeColor, strokeWidth, trackWidth, showCapsuleCaps, showOutlines = true, showPieceOutlines = true, freeEnds } = colors;
  const tw = trackWidth || 40.0;

  const rad = pa * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const toGlobal = (lx, ly) => {
    let localX = lx;
    let localY = ly;
    if (pInfo && pInfo.type === "SWITCH" && params === "MERGE") {
      const len = pInfo.len;
      localX = len - lx;
      localY = -ly;
    }
    return [
      px + (localX * cos - localY * sin),
      py + (localX * sin + localY * cos)
    ];
  };

  const drawOutline = ((showPieceOutlines || showOutlines) && (drawType === "both" || drawType === "outline"));
  const drawFill = (drawType === "both" || drawType === "fill");

  if (deformedPaths && deformedPaths.length > 0) {
    let svg = "";
    
    // Draw outline paths
    if (drawOutline) {
      for (const path of deformedPaths) {
        if (path.length > 0) {
          let pathD = `M ${path[0][0].toFixed(2)} ${path[0][1].toFixed(2)}`;
          for (let k = 1; k < path.length; k++) {
            pathD += ` L ${path[k][0].toFixed(2)} ${path[k][1].toFixed(2)}`;
          }
          svg += `    <path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="${(tw + 2 * strokeWidth).toFixed(2)}" stroke-linecap="round" />\n`;
        }
      }
    }

    // Draw fill paths
    if (drawFill) {
      for (const path of deformedPaths) {
        if (path.length > 0) {
          let pathD = `M ${path[0][0].toFixed(2)} ${path[0][1].toFixed(2)}`;
          for (let k = 1; k < path.length; k++) {
            pathD += ` L ${path[k][0].toFixed(2)} ${path[k][1].toFixed(2)}`;
          }
          svg += `    <path d="${pathD}" fill="none" stroke="${baseColor}" stroke-width="${tw.toFixed(2)}" stroke-linecap="round" />\n`;
        }
      }
    }

    // Capsule end caps circles
    if (showCapsuleCaps && drawFill) {
      const endPoints = [];
      for (const path of deformedPaths) {
        if (path.length > 0) {
          endPoints.push(path[0]);
          endPoints.push(path[path.length - 1]);
        }
      }
      for (const [cx, cy] of endPoints) {
        svg += `    <circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${(tw / 2).toFixed(2)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" />\n`;
      }
    }
    return svg;
  }

  const tx = (lx, ly) => {
    return {
      x: px + (lx * cos - ly * sin),
      y: py + (lx * sin + ly * cos)
    };
  };

  let svg = "";
  let endPoints = [];
  let jointDirs = [];

  if (pInfo.type === "STRAIGHT" || pInfo.type === "CROSS") {
    const len = pInfo.type === "CROSS" ? 144 : pInfo.len;
    endPoints = [[0, 0], [len, 0]];
    jointDirs = [[1, 0], [1, 0]];
    if (pInfo.type === "CROSS") {
      endPoints.push([len / 2, -len / 2], [len / 2, len / 2]);
      jointDirs.push([0, 1], [0, 1]);
    }
    
    let path = `M ${px.toFixed(2)} ${py.toFixed(2)} L ${tx(len, 0).x.toFixed(2)} ${tx(len, 0).y.toFixed(2)}`;
    
    if (pInfo.type === "CROSS") {
      const c1 = tx(len / 2, -len / 2);
      const c2 = tx(len / 2, len / 2);
      path += ` M ${c1.x.toFixed(2)} ${c1.y.toFixed(2)} L ${c2.x.toFixed(2)} ${c2.y.toFixed(2)}`;
    }

    if (drawOutline) {
      svg += `    <path d="${path}" fill="none" stroke="${strokeColor}" stroke-width="${(tw + 2 * strokeWidth).toFixed(2)}" stroke-linecap="round" />\n`;
    }
    if (drawFill) {
      svg += `    <path d="${path}" fill="none" stroke="${baseColor}" stroke-width="${tw.toFixed(2)}" stroke-linecap="round" />\n`;
    }

    if (showCapsuleCaps && drawFill) {
      for (const [cx, cy] of endPoints) {
        const abs = toGlobal(cx, cy);
        svg += `    <circle cx="${abs[0].toFixed(2)}" cy="${abs[1].toFixed(2)}" r="${(tw / 2).toFixed(2)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" />\n`;
      }
    }

  } else if (pInfo.type === "CURVE") {
    const { r, angle: sweep } = pInfo;
    const isLeft = !!params;
    const cY = isLeft ? r : -r;
    
    // Find rotation center in absolute coords
    const cAbsX = px - cY * sin;
    const cAbsY = py + cY * cos;

    // Angles for SVG arc drawing
    const sa = isLeft ? (pa - 90) : (pa + 90);
    const ea = sa + (isLeft ? sweep : -sweep);
    
    const saRad = sa * Math.PI / 180;
    const eaRad = ea * Math.PI / 180;

    const endCenterX = cAbsX + r * Math.cos(eaRad);
    const endCenterY = cAbsY + r * Math.sin(eaRad);

    const sweepFlag = isLeft ? 1 : 0;

    const radStep = sweep * Math.PI / 180;
    const lx = r * Math.sin(radStep);
    let ly = r * (1 - Math.cos(radStep));
    if (!isLeft) ly = -ly;
    endPoints = [[0, 0], [lx, ly]];
    const curve_dx = Math.cos(radStep);
    const curve_dy = isLeft ? Math.sin(radStep) : -Math.sin(radStep);
    jointDirs = [[1, 0], [curve_dx, curve_dy]];

    let path = `M ${px.toFixed(2)} ${py.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 ${sweepFlag} ${endCenterX.toFixed(2)} ${endCenterY.toFixed(2)}`;

    if (drawOutline) {
      svg += `    <path d="${path}" fill="none" stroke="${strokeColor}" stroke-width="${(tw + 2 * strokeWidth).toFixed(2)}" stroke-linecap="round" />\n`;
    }
    if (drawFill) {
      svg += `    <path d="${path}" fill="none" stroke="${baseColor}" stroke-width="${tw.toFixed(2)}" stroke-linecap="round" />\n`;
    }

    if (showCapsuleCaps && drawFill) {
      for (const [cx, cy] of endPoints) {
        const abs = toGlobal(cx, cy);
        svg += `    <circle cx="${abs[0].toFixed(2)}" cy="${abs[1].toFixed(2)}" r="${(tw / 2).toFixed(2)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" />\n`;
      }
    }

  } else if (pInfo.type === "SWITCH") {
    const len = pInfo.len;
    const isLeft = pInfo.dir === "LEFT";
    const isMerge = params === "MERGE";
    const { branch_r: brR, branch_a: brA } = pInfo;
    const sweep = brA;

    let gTrans = "";
    if (isMerge) {
      gTrans = ` transform="translate(${px.toFixed(2)} ${py.toFixed(2)}) rotate(${pa.toFixed(2)}) translate(${len.toFixed(2)} 0) rotate(180)"`;
    } else {
      gTrans = ` transform="translate(${px.toFixed(2)} ${py.toFixed(2)}) rotate(${pa.toFixed(2)})"`;
    }

    const cY = isLeft ? brR : -brR;
    const sa = isLeft ? 270 : 90;
    const saRad = sa * Math.PI / 180;
    const sweepRad = sweep * Math.PI / 180;
    const eaRad = saRad + (isLeft ? sweepRad : -sweepRad);

    const endX = brR * Math.sin(sweepRad);
    const endY = isLeft ? (brR - brR * Math.cos(sweepRad)) : (-brR + brR * Math.cos(sweepRad));

    const sweepFlag = isLeft ? 1 : 0;

    const radStep = sweep * Math.PI / 180;
    const lx = brR * Math.sin(radStep);
    let ly = brR * (1 - Math.cos(radStep));
    if (!isLeft) ly = -ly;
    endPoints = [[0, 0], [len, 0], [lx, ly]];
    const curve_dx = Math.cos(radStep);
    const curve_dy = isLeft ? Math.sin(radStep) : -Math.sin(radStep);
    jointDirs = [[1, 0], [1, 0], [curve_dx, curve_dy]];

    svg += `  <g${gTrans}>\n`;
    if (drawOutline) {
      svg += `    <path d="M 0 0 L ${len.toFixed(2)} 0 M 0 0 A ${brR.toFixed(2)} ${brR.toFixed(2)} 0 0 ${sweepFlag} ${endX.toFixed(2)} ${endY.toFixed(2)}" fill="none" stroke="${strokeColor}" stroke-width="${(tw + 2 * strokeWidth).toFixed(2)}" stroke-linecap="round" />\n`;
    }
    if (drawFill) {
      svg += `    <path d="M 0 0 L ${len.toFixed(2)} 0 M 0 0 A ${brR.toFixed(2)} ${brR.toFixed(2)} 0 0 ${sweepFlag} ${endX.toFixed(2)} ${endY.toFixed(2)}" fill="none" stroke="${baseColor}" stroke-width="${tw.toFixed(2)}" stroke-linecap="round" />\n`;
    }

    if (showCapsuleCaps && drawFill) {
      for (const [cx, cy] of endPoints) {
        svg += `    <circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${(tw / 2).toFixed(2)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" />\n`;
      }
    }
    svg += `  </g>\n`;
  }

  return svg;
}

export function exportToSVG(scene) {
  let svgContent = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n`;
  svgContent += `<svg width="${scene.state.canvasWidth}" height="${scene.state.canvasHeight}" viewBox="0 0 ${scene.state.canvasWidth} ${scene.state.canvasHeight}" xmlns="http://www.w3.org/2000/svg">\n`;
  
  const bgColor = scene.state.useManualBg ? scene.state.manualBgHex : (scene.state.palette[0] || "#f5f5f0");
  const strokeColor = scene.state.useManualStroke ? scene.state.manualStrokeHex : (scene.state.palette[scene.state.palette.length - 1] || "#000000");

  svgContent += `  <rect width="100%" height="100%" fill="${bgColor}" />\n`;

  if (scene.track && scene.track.length > 0) {
    const ptsX = [];
    const ptsY = [];
    for (const [pKey, params, pos, pieceColor, deformedPaths] of scene.track) {
      if (deformedPaths && deformedPaths.length > 0) {
        for (const path of deformedPaths) {
          for (const pt of path) {
            ptsX.push(pt[0]);
            ptsY.push(pt[1]);
          }
        }
      } else {
        ptsX.push(pos[0]);
        ptsY.push(pos[1]);
      }
    }
    const W_track = scene.state.trackWidth + 2 * scene.state.strokeWidth;
    const minX = Math.min(...ptsX) - W_track / 2;
    const maxX = Math.max(...ptsX) + W_track / 2;
    const minY = Math.min(...ptsY) - W_track / 2;
    const maxY = Math.max(...ptsY) + W_track / 2;

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const trackW = maxX - minX;
    const trackH = maxY - minY;

    let sf = 1.0;
    if (scene.state.autoScale) {
      const drawAreaW = scene.state.canvasWidth - 2 * scene.state.margin;
      const drawAreaH = scene.state.canvasHeight - 2 * scene.state.margin;
      sf = Math.min(drawAreaW / trackW, drawAreaH / trackH);
    }

    const tx_x = scene.state.canvasWidth / 2 - cx * sf;
    const tx_y = scene.state.canvasHeight / 2 - cy * sf;

    svgContent += `  <g transform="translate(${tx_x.toFixed(2)} ${tx_y.toFixed(2)}) scale(${sf.toFixed(4)})">\n`;
    
    const freeEnds = getFreeEndpoints(scene.track);
    const colors = {
      strokeColor,
      strokeWidth: scene.state.strokeWidth,
      trackWidth: scene.state.trackWidth,
      showCapsuleCaps: scene.state.showCapsuleCaps,
      showOutlines: scene.state.showOutlines,
      showPieceOutlines: scene.state.showPieceOutlines,
      freeEnds: freeEnds
    };
    const fillOffset = scene.state.showPieceOutlines ? 5 : 12;

    const N = scene.track.length;
    const localPieceLayers = new Array(N).fill(0);
    for (let i = 0; i < N; i++) {
      localPieceLayers[i] = i;
    }
    const piecePaths = [];
    for (let i = 0; i < N; i++) {
      piecePaths.push(getPieceCenterlinePaths(scene.track[i], i));
    }

    const elements = [];

    if (scene.state.mergeSameColorPieces) {
      // Group all paths by color AND layer (which is pieceIndex)
      const colorLayersPaths = {};
      let pieceIndex = 0;
      for (const piece of scene.track) {
        const [pKey, params, pos, pieceColor, deformedPaths] = piece;
        const layer = localPieceLayers[pieceIndex] || 0;
        const resolvedColor = pieceColor || (scene.state.palette[1] || "#eadbbb");
        const key = `${resolvedColor}_${layer}`;
        const paths = getPieceCenterlinePaths(piece, pieceIndex);
        
        if (!colorLayersPaths[key]) {
          colorLayersPaths[key] = {
            color: resolvedColor,
            layer: layer,
            paths: []
          };
        }
        for (const p of paths) {
          if (p.length > 0) {
            colorLayersPaths[key].paths.push(p);
          }
        }
        pieceIndex++;
      }

      // Merge paths for each group
      const mergedGroups = [];
      for (const key in colorLayersPaths) {
        const group = colorLayersPaths[key];
        mergedGroups.push({
          color: group.color,
          layer: group.layer,
          paths: mergePaths(group.paths)
        });
      }

      // Generate elements
      for (const group of mergedGroups) {
        const layer = group.layer;
        for (const path of group.paths) {
          if (path.length < 2) continue;

          // Merge path outline
          if (scene.state.showOutlines) {
            let pathD = `M ${path[0][0].toFixed(2)} ${path[0][1].toFixed(2)}`;
            for (let k = 1; k < path.length; k++) {
              pathD += ` L ${path[k][0].toFixed(2)} ${path[k][1].toFixed(2)}`;
            }
            const strokeWidthVal = scene.state.trackWidth + 2 * scene.state.strokeWidth;
            let outlineSvg = `    <path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidthVal.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" />\n`;
            elements.push({ zIndex: layer * 10, svg: outlineSvg });
          }

          // Fill
          let pathD = `M ${path[0][0].toFixed(2)} ${path[0][1].toFixed(2)}`;
          for (let k = 1; k < path.length; k++) {
            pathD += ` L ${path[k][0].toFixed(2)} ${path[k][1].toFixed(2)}`;
          }
          let fillSvg = `    <path d="${pathD}" fill="none" stroke="${group.color}" stroke-width="${scene.state.trackWidth.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" />\n`;

          // Capsule end caps
          if (scene.state.showCapsuleCaps) {
            const startPt = path[0];
            const endPt = path[path.length - 1];
            fillSvg += `    <circle cx="${startPt[0].toFixed(2)}" cy="${startPt[1].toFixed(2)}" r="${(scene.state.trackWidth / 2).toFixed(2)}" fill="none" stroke="${strokeColor}" stroke-width="${scene.state.strokeWidth.toFixed(2)}" />\n`;
            fillSvg += `    <circle cx="${endPt[0].toFixed(2)}" cy="${endPt[1].toFixed(2)}" r="${(scene.state.trackWidth / 2).toFixed(2)}" fill="none" stroke="${strokeColor}" stroke-width="${scene.state.strokeWidth.toFixed(2)}" />\n`;
          }
          elements.push({ zIndex: layer * 10 + fillOffset, svg: fillSvg });
        }
      }

      if (scene.state.showPieceOutlines) {
        let pieceIndex = 0;
        for (const [pKey, params, pos, pieceColor, deformedPaths] of scene.track) {
          const pieceLayer = localPieceLayers[pieceIndex] || 0;
          const outlineSvg = generateSvgPiece(pKey, params, pos[0], pos[1], pos[2], {
            ...colors,
            baseColor: pieceColor || (scene.state.palette[1] || "#eadbbb")
          }, deformedPaths, "outline");
          if (outlineSvg) {
            elements.push({ zIndex: pieceLayer * 10, svg: outlineSvg });
          }
          pieceIndex++;
        }
      }
    } else {
      // Draw individual pieces
      let pieceIndex = 0;
      for (const [pKey, params, pos, pieceColor, deformedPaths] of scene.track) {
        const pieceLayer = localPieceLayers[pieceIndex] || 0;
        
        // Outline
        const outlineSvg = generateSvgPiece(pKey, params, pos[0], pos[1], pos[2], {
          ...colors,
          baseColor: pieceColor || (scene.state.palette[1] || "#eadbbb")
        }, deformedPaths, "outline");
        if (outlineSvg) {
          elements.push({ zIndex: pieceLayer * 10, svg: outlineSvg });
        }

        // Fill
        const fillSvg = generateSvgPiece(pKey, params, pos[0], pos[1], pos[2], {
          ...colors,
          baseColor: pieceColor || (scene.state.palette[1] || "#eadbbb")
        }, deformedPaths, "fill");
        if (fillSvg) {
          elements.push({ zIndex: pieceLayer * 10 + fillOffset, svg: fillSvg });
        }

        pieceIndex++;
      }
    }

    // Add Joint Patch at N * 10 + 5 if loop is closed
    const isClosed = !freeEnds || freeEnds.length === 0;
    if (isClosed && scene.track.length > 0) {
      const paths0 = piecePaths[0];
      if (paths0 && paths0.length > 0 && paths0[0].length > 0) {
        const jointPt = paths0[0][0];
        const pieceColor0 = scene.track[0][3] || (scene.state.palette[1] || "#eadbbb");
        const patchSvg = `    <circle cx="${jointPt[0].toFixed(2)}" cy="${jointPt[1].toFixed(2)}" r="${(scene.state.trackWidth / 2).toFixed(2)}" fill="${pieceColor0}" />\n`;
        elements.push({ zIndex: N * 10 + 5, svg: patchSvg });
      }
    }

    // Add Train if animated
    if (scene.state.animateTrain && activeTrainPath && activeTrainPath.length > 1) {
      const pt = getPointAtDistance(activeTrainPath, trainDistance);
      if (pt) {
        const trainLayer = getTrainLayer(
          activeTrainPath,
          trainDistance,
          localPieceLayers,
          scene.state.trainSize,
          scene.state.trackWidth
        );
        const r = scene.state.trainSize;
        const mixBlendStyle = scene.state.trainMultiply ? ' style="mix-blend-mode: multiply;"' : '';
        const trainSvg = `    <circle cx="${pt.x.toFixed(2)}" cy="${pt.y.toFixed(2)}" r="${r.toFixed(2)}" fill="${scene.state.trainColor}"${mixBlendStyle} />\n`;
        elements.push({ zIndex: trainLayer * 10 + 13, svg: trainSvg });
      }
    }

    // Sort elements by zIndex ascending
    elements.sort((a, b) => a.zIndex - b.zIndex);

    // Write sorted elements to svgContent
    for (const el of elements) {
      svgContent += el.svg;
    }

    svgContent += `  </g>\n`;
  }

  svgContent += `</svg>\n`;
  return svgContent;
}

async function downloadSVG() {
  if (!currentSceneData) return;
  const svgString = exportToSVG(currentSceneData);
  const filename = `Brio_Track_${state.seed || 'art'}.svg`;

  await saveFileLocally(filename, svgString, false);

  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

async function exportJSON() {
  const jsonString = JSON.stringify(state, null, 2);
  const filename = `Brio_Config_${state.seed || 'art'}.json`;

  await saveFileLocally(filename, jsonString, false);

  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const importedState = JSON.parse(e.target.result);
      state = { ...state, ...importedState };
      populatePaletteSelect();
      syncGUI();
      renderScene();
    } catch (err) {
      alert("Errore nel caricamento del file JSON. Formato non valido.");
    }
  };
  reader.readAsText(file);
}

// --- BATCH EXPORTER SYSTEM ---
async function runBatchExport(count, randomizeAll = false) {
  const btn = document.getElementById(randomizeAll ? 'export-batch-random-btn' : 'export-batch-btn');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.style.opacity = '0.6';

  const originalStateJSON = JSON.stringify(state);
  state.seedLocked = true;

  try {
    for (let i = 0; i < count; i++) {
      btn.textContent = `Batch ${i + 1}/${count}...`;

      if (randomizeAll) {
        randomizeParams();
      } else {
        const currentSeed = Math.random().toString(36).substring(2, 9);
        state.seed = currentSeed;
        document.getElementById('seedInput').value = currentSeed;
        renderScene();
      }

      await new Promise(resolve => setTimeout(resolve, 250));
      const currentSeed = state.seed;

      // 1. Export JSON
      const jsonString = JSON.stringify(state, null, 2);
      const jsonFilename = `Brio_Config_${currentSeed}.json`;
      await saveFileLocally(jsonFilename, jsonString, false);

      const jsonBlob = new Blob([jsonString], { type: 'application/json' });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const jsonLink = document.createElement('a');
      jsonLink.download = jsonFilename;
      jsonLink.href = jsonUrl;
      jsonLink.click();
      URL.revokeObjectURL(jsonUrl);

      // 2. Export PNG
      const pngDataUrl = app.canvas.toDataURL("image/png");
      const pngFilename = `Brio_Track_${currentSeed}.png`;
      await saveFileLocally(pngFilename, pngDataUrl, true);

      const pngLink = document.createElement('a');
      pngLink.download = pngFilename;
      pngLink.href = pngDataUrl;
      pngLink.click();

      await new Promise(resolve => setTimeout(resolve, 250));
    }
  } catch (error) {
    console.error("Batch export error:", error);
    alert("Si è verificato un errore durante l'esportazione batch.");
  } finally {
    state = JSON.parse(originalStateJSON);
    syncGUI();
    renderScene();

    btn.textContent = originalText;
    btn.disabled = false;
    btn.style.opacity = '1';
  }
}

function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    if (activeEl) {
      const isTextInput = activeEl.tagName === 'TEXTAREA' || 
                          (activeEl.tagName === 'INPUT' && ['text', 'number'].includes(activeEl.type));
      if (isTextInput) return;
    }

    if (e.metaKey || e.ctrlKey || e.altKey) return;

    const key = e.key.toUpperCase();
    if (key === 'R') {
      e.preventDefault();
      state.seed = Math.random().toString(36).substring(2, 9);
      document.getElementById('seedInput').value = state.seed;
      renderScene();
    } else if (key === 'S') {
      e.preventDefault();
      downloadSVG();
    } else if (key === 'P') {
      e.preventDefault();
      downloadPNG();
    }
  });
}


async function loadSharedPalettes() {
  const isAdmin = (typeof window.isSkolpAdmin === "function" && window.isSkolpAdmin()) || localStorage.getItem("skolp_admin_mode") === "true";
  if (!isAdmin) return;

  let hasNew = false;
  try {
    const res = await fetch("/lab/api_palettes.php");
    if (res && res.ok) {
      const data = await res.json();
      if (data && typeof data === "object") {
        Object.assign(PALETTES, data);
        hasNew = true;
      }
    }
  } catch (e) {}

  try {
    const local = localStorage.getItem("skolp_master_palettes");
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed && typeof parsed === "object") {
        Object.assign(PALETTES, parsed);
        hasNew = true;
      }
    }
  } catch (e) {}

  if (hasNew) {
    populatePaletteSelect();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  loadSharedPalettes();
  populatePaletteSelect();
  initPixi().then(() => {
    setupEvents();
    setupKeyboardShortcuts();
    syncGUI();
    renderScene();

    app.ticker.add((ticker) => {
      if (state.animateTrain && activeTrainPath && activeTrainPath.length > 1) {
        const delta = ticker.deltaTime || 1.0;
        
        if (isRecordingVideo) {
          if (recordingStopRequested) {
            recordingStopRequested = false;
            stopVideoRecording();
            return;
          }

          trainDistance += state.trainSpeed * delta;
          const pathLength = getPathTotalLength(activeTrainPath);
          
          if (trainDistance >= pathLength) {
            trainDistance = pathLength; // Blocca sull'ultimo frame
            updateTrainPositions();
            const btn = document.getElementById('export-video-btn');
            if (btn) btn.textContent = `Registrazione: 100%`;
            recordingStopRequested = true;
          } else {
            updateTrainPositions();
            const pct = Math.min(99, Math.floor((trainDistance / pathLength) * 100));
            const btn = document.getElementById('export-video-btn');
            if (btn) btn.textContent = `Registrazione: ${pct}%`;
          }
        } else {
          trainDistance += state.trainSpeed * delta;
          const pathLength = getPathTotalLength(activeTrainPath);
          if (pathLength > 0 && trainDistance >= pathLength) {
            trainDistance = trainDistance % pathLength;
            if (currentSceneData && currentSceneData.track) {
              const connMap = buildConnectivityMap(currentSceneData.track);
              activeTrainPath = generateRandomLoopPath(currentSceneData.track, connMap);
              activeTrainPathPieceIndices = activeTrainPath.map(pt => pt[2] !== undefined ? pt[2] : 0);
            }
          }
          updateTrainPositions();
        }
      }
    });
  });
});
