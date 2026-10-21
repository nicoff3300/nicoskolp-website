import * as PIXI from 'pixi.js';
import { generateScene, exportToSVG, hexToRgbStr } from './generator.js';

// --- CONFIGURAZIONE PALETTE ---
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

function cmToPx(cm) {
  return Math.round((cm / 2.54) * DPI);
}

function pxToCm(px) {
  return parseFloat(((px / DPI) * 2.54).toFixed(1));
}

// --- STATO GLOBAL ---
let state = {
  canvasWidth: 1080,
  canvasHeight: 1080,
  canvasUnit: "px",
  margin: 50,
  autoScale: true,

  macroLayoutMode: "RANDOM",
  macroColsRange: { min: 1, max: 1 },
  macroRowsRange: { min: 1, max: 1 },
  macroColsCustom: "1.0",
  macroRowsCustom: "1.0",
  macroGap: 0,

  gridCols: 28,
  gridRows: 1,

  capsuleThicknessRatio: 40,
  randomRadius: false,
  capsuleCountRange: { min: 2, max: 2 },
  capsuleFullHeight: false,
  capsuleYVarRange: { min: 0, max: 5 },
  capsuleConstantStep: false,
  capsuleStepSize: 1,

  probBrokenCapsule: 0.0,
  brokenOrientation: "AUTO",
  brokenOnlyExternals: true,
  brokenVertPos: "RANDOM",
  brokenVertRatio: 2,

  useOverlap: false,
  probOverlap: 0.4,

  orientationMode: "VERTICAL",
  orientationMixProb: 0.1,

  showGridStroke: false,
  showIntersectionLines: true,
  strokeWidth: 1.2,

  activePaletteName: "Skolp_01",
  palette: [...PALETTES["Skolp_01"]],
  useManualBg: false,
  manualBgHex: "#989986",
  useManualStroke: false,
  manualStrokeHex: "#000000",

  seed: "skolptura_default",
  seedLocked: true,
  
  viewScale: 1.0,
  viewOffset: { x: 0, y: 0 },
  immersiveMode: false
};

// --- INIZIALIZZAZIONE PIXIJS ---
let app;
let bgGraphics;
let capsulesGraphics;
let gridGraphics;

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
  capsulesGraphics = new PIXI.Graphics();
  gridGraphics = new PIXI.Graphics();

  app.stage.addChild(bgGraphics);
  app.stage.addChild(capsulesGraphics);
  app.stage.addChild(gridGraphics);

  setupZoomPan(wrapper);
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

// --- ZOOM E PAN CSS SUL CANVAS DOM ---
function setupZoomPan(wrapper) {
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };

  // Zoom sul cursore del mouse
  wrapper.addEventListener('wheel', (e) => {
    e.preventDefault();
    
    const rect = wrapper.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Coordinata del mouse sul canvas prima dello zoom
    const canvasX = (mouseX - state.viewOffset.x) / state.viewScale;
    const canvasY = (mouseY - state.viewOffset.y) / state.viewScale;

    // Nuova scala
    const zoomFactor = 1.12;
    let nextScale = state.viewScale;
    if (e.deltaY < 0) {
      nextScale *= zoomFactor;
    } else {
      nextScale /= zoomFactor;
    }

    state.viewScale = Math.max(0.05, Math.min(25.0, nextScale));

    // Ricalcolo dell'offset per tenere fermo il punto sotto il mouse
    state.viewOffset.x = mouseX - canvasX * state.viewScale;
    state.viewOffset.y = mouseY - canvasY * state.viewScale;

    updateViewTransform();
  }, { passive: false });

  // Trascinamento (Pan)
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

// --- METODO DISEGNO CAPSULA ---
function drawPixiCapsule(graphics, capsule, strokeWidth, isOutlineOnly) {
  const { x1, y1, x2, y2, r1, r2, fillColor, strokeColor } = capsule;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const dist = Math.hypot(x2 - x1, y2 - y1);

  const tx = (lx, ly) => {
    const rx = lx * Math.cos(angle) - ly * Math.sin(angle);
    const ry = lx * Math.sin(angle) + ly * Math.cos(angle);
    return { x: x1 + rx, y: y1 + ry };
  };

  const startTop = tx(0, -r1);
  const startEnd = tx(0, r1);
  const endTop = tx(dist, r2);
  const endBottom = tx(dist, -r2);

  graphics.beginPath();
  graphics.moveTo(startTop.x, startTop.y);
  graphics.lineTo(endBottom.x, endBottom.y);
  graphics.arc(x2, y2, r2, angle - Math.PI / 2, angle + Math.PI / 2, false);
  graphics.lineTo(startEnd.x, startEnd.y);
  graphics.arc(x1, y1, r1, angle + Math.PI / 2, angle + 3 * Math.PI / 2, false);
  graphics.closePath();

  if (isOutlineOnly) {
    graphics.stroke({ color: strokeColor, width: strokeWidth, join: 'round', cap: 'round' });
  } else {
    graphics.fill({ color: fillColor });
    if (!state.showIntersectionLines) {
      graphics.stroke({ color: strokeColor, width: strokeWidth, join: 'round', cap: 'round' });
    }
  }
}

// --- RENDERING PRINCIPALE ---
let currentSceneData = null;

function renderScene() {
  if (!app) return;

  if (!state.seedLocked) {
    state.seed = Math.random().toString(36).substring(2, 9);
    document.getElementById('seedInput').value = state.seed;
  }

  const scene = generateScene(state);
  currentSceneData = scene;

  bgGraphics.clear();
  capsulesGraphics.clear();
  gridGraphics.clear();

  // Se cambiano le dimensioni, ridimensioniamo il canvas di PixiJS
  if (app.renderer.width !== state.canvasWidth || app.renderer.height !== state.canvasHeight) {
    app.renderer.resize(state.canvasWidth, state.canvasHeight);
    resetView();
  }

  // Sfondo
  bgGraphics.rect(0, 0, state.canvasWidth, state.canvasHeight);
  bgGraphics.fill({ color: scene.backgroundColor });

  // Capsule
  const baseCapsules = scene.capsules.filter(c => !c.isOverlap);
  const overlapCapsules = scene.capsules.filter(c => c.isOverlap);

  if (scene.showIntersectionLines) {
    baseCapsules.forEach(c => {
      drawPixiCapsule(capsulesGraphics, c, scene.strokeWidth, false);
    });
    overlapCapsules.forEach(c => {
      drawPixiCapsule(capsulesGraphics, c, scene.strokeWidth, false);
    });
    scene.capsules.forEach(c => {
      drawPixiCapsule(capsulesGraphics, c, scene.strokeWidth, true);
    });
  } else {
    baseCapsules.forEach(c => {
      drawPixiCapsule(capsulesGraphics, c, scene.strokeWidth, false);
    });
    overlapCapsules.forEach(c => {
      drawPixiCapsule(capsulesGraphics, c, scene.strokeWidth, false);
    });
  }

  // Griglia debug
  if (state.showGridStroke) {
    scene.gridLines.forEach(line => {
      if (line.type === "macro-cell") {
        gridGraphics.rect(line.x, line.y, line.w, line.h);
        gridGraphics.stroke({ color: 0xff0000, width: 1.5 });
      } else if (line.type === "micro-line") {
        gridGraphics.moveTo(line.x1, line.y1);
        gridGraphics.lineTo(line.x2, line.y2);
        gridGraphics.stroke({ color: 0xcccc00, width: 0.5 });
      }
    });
  }

  // Immersive mode
  const canvasArea = document.querySelector('.canvas-area');
  if (canvasArea) {
    if (state.immersiveMode) {
      canvasArea.style.setProperty('--canvas-area-bg', scene.backgroundColor);
      canvasArea.style.backgroundColor = scene.backgroundColor;
      if (app.canvas) app.canvas.style.boxShadow = 'none';
    } else {
      canvasArea.style.removeProperty('--canvas-area-bg');
      canvasArea.style.backgroundColor = '';
      if (app.canvas) app.canvas.style.boxShadow = '';
    }
  }
}

// --- INTERFACCIA E CONTROLLI ---
function syncGUI() {
  document.getElementById('canvasWidthInput').value = state.canvasWidth;
  document.getElementById('canvasHeightInput').value = state.canvasHeight;
  document.getElementById('canvasUnitSelect').value = state.canvasUnit;
  
  document.getElementById('margin').value = state.margin;
  document.getElementById('margin-val').textContent = state.margin;
  document.getElementById('autoScale').checked = state.autoScale;

  document.getElementById('macroLayoutMode').value = state.macroLayoutMode;
  document.getElementById('macroColsMin').value = state.macroColsRange.min;
  document.getElementById('macroColsMax').value = state.macroColsRange.max;
  document.getElementById('macroRowsMin').value = state.macroRowsRange.min;
  document.getElementById('macroRowsMax').value = state.macroRowsRange.max;
  document.getElementById('macroColsCustom').value = state.macroColsCustom;
  document.getElementById('macroRowsCustom').value = state.macroRowsCustom;
  document.getElementById('macroGap').value = state.macroGap;
  document.getElementById('macroGap-val').textContent = state.macroGap;

  document.getElementById('macro-random-controls').style.display = state.macroLayoutMode === "RANDOM" ? "block" : "none";
  document.getElementById('macro-custom-controls').style.display = state.macroLayoutMode === "CUSTOM" ? "block" : "none";

  document.getElementById('gridCols').value = state.gridCols;
  document.getElementById('gridCols-val').textContent = state.gridCols;
  document.getElementById('gridRows').value = state.gridRows;
  document.getElementById('gridRows-val').textContent = state.gridRows;

  document.getElementById('capsuleThicknessRatio').value = state.capsuleThicknessRatio;
  document.getElementById('capsuleThicknessRatio-val').textContent = state.capsuleThicknessRatio;
  document.getElementById('randomRadius').checked = state.randomRadius;
  document.getElementById('capsuleCountMin').value = state.capsuleCountRange.min;
  document.getElementById('capsuleCountMax').value = state.capsuleCountRange.max;
  document.getElementById('capsuleFullHeight').checked = state.capsuleFullHeight;
  document.getElementById('capsuleYVarMin').value = state.capsuleYVarRange.min;
  document.getElementById('capsuleYVarMax').value = state.capsuleYVarRange.max;
  document.getElementById('capsuleConstantStep').checked = state.capsuleConstantStep;
  document.getElementById('capsuleStepSize').value = state.capsuleStepSize;
  document.getElementById('capsuleStepSize-val').textContent = state.capsuleStepSize;

  document.getElementById('capsule-height-var-group').style.display = state.capsuleFullHeight ? "none" : "block";
  document.getElementById('capsule-step-size-group').style.display = state.capsuleConstantStep ? "block" : "none";

  document.getElementById('probBrokenCapsule').value = state.probBrokenCapsule;
  document.getElementById('probBrokenCapsule-val').textContent = state.probBrokenCapsule;
  document.getElementById('brokenOrientation').value = state.brokenOrientation;
  document.getElementById('brokenOnlyExternals').checked = state.brokenOnlyExternals;
  document.getElementById('brokenVertPos').value = state.brokenVertPos;
  document.getElementById('brokenVertRatio').value = state.brokenVertRatio;
  document.getElementById('brokenVertRatio-val').textContent = (state.brokenVertRatio * 10) + "%";

  document.getElementById('useOverlap').checked = state.useOverlap;
  document.getElementById('probOverlap').value = state.probOverlap;
  document.getElementById('probOverlap-val').textContent = state.probOverlap;
  document.getElementById('overlap-prob-group').style.display = state.useOverlap ? "block" : "none";

  document.getElementById('orientationMode').value = state.orientationMode;
  document.getElementById('orientationMixProb').value = state.orientationMixProb;
  document.getElementById('orientationMixProb-val').textContent = state.orientationMixProb;
  document.getElementById('orientation-mix-group').style.display = state.orientationMode === "MIXED" ? "block" : "none";
  
  document.getElementById('showGridStroke').checked = state.showGridStroke;
  document.getElementById('showIntersectionLines').checked = state.showIntersectionLines;
  document.getElementById('strokeWidth').value = state.strokeWidth;
  document.getElementById('strokeWidth-val').textContent = state.strokeWidth;

  document.getElementById('palettePresetSelect').value = state.activePaletteName;
  document.getElementById('useManualBg').checked = state.useManualBg;
  document.getElementById('manualBgHex').value = state.manualBgHex;
  document.getElementById('useManualStroke').checked = state.useManualStroke;
  document.getElementById('manualStrokeHex').value = state.manualStrokeHex;

  document.getElementById('seedInput').value = state.seed;
  document.getElementById('seedLockToggle').checked = state.seedLocked;

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
      removeBtn.title = 'Rimuovi Colore';
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
    const timeHash = Math.floor(Date.now() / 1000).toString().substring(6);
    state.activePaletteName = `Custom_${timeHash}`;
  }

  const savedPalettes = JSON.parse(localStorage.getItem('skolptura_custom_palettes') || '{}');
  savedPalettes[state.activePaletteName] = state.palette;
  localStorage.setItem('skolptura_custom_palettes', JSON.stringify(savedPalettes));

  populatePaletteSelect();
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

  const customPalettes = JSON.parse(localStorage.getItem('skolptura_custom_palettes') || '{}');
  const customKeys = Object.keys(customPalettes);
  
  if (customKeys.length > 0) {
    const customGroup = document.createElement('optgroup');
    customGroup.label = 'Palette Salvate (Custom)';
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
    const hVal = parseFloat(document.getElementById('canvasHeightInput').value) || 1080;

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

    const wVal = parseFloat(document.getElementById('canvasWidthInput').value) || 1080;
    const hVal = parseFloat(document.getElementById('canvasHeightInput').value) || 1080;

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

  const attachSlider = (id, stateProp, step = 1, isPercent = false) => {
    const slider = document.getElementById(id);
    slider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      state[stateProp] = val;
      
      const valEl = document.getElementById(`${id}-val`);
      if (valEl) {
        valEl.textContent = isPercent ? (val * 10) + "%" : val;
      }
      renderScene();
    });
  };

  attachSlider('margin', 'margin');
  attachSlider('macroGap', 'macroGap');
  attachSlider('gridCols', 'gridCols');
  attachSlider('gridRows', 'gridRows');
  attachSlider('capsuleThicknessRatio', 'capsuleThicknessRatio');
  attachSlider('capsuleStepSize', 'capsuleStepSize');
  attachSlider('probBrokenCapsule', 'probBrokenCapsule');
  attachSlider('brokenVertRatio', 'brokenVertRatio', 1, true);
  attachSlider('probOverlap', 'probOverlap');
  attachSlider('orientationMixProb', 'orientationMixProb');
  attachSlider('strokeWidth', 'strokeWidth');

  const attachCheckbox = (id, stateProp) => {
    document.getElementById(id).addEventListener('change', (e) => {
      state[stateProp] = e.target.checked;
      syncGUI();
      renderScene();
    });
  };

  attachCheckbox('autoScale', 'autoScale');
  attachCheckbox('randomRadius', 'randomRadius');
  attachCheckbox('capsuleFullHeight', 'capsuleFullHeight');
  attachCheckbox('capsuleConstantStep', 'capsuleConstantStep');
  attachCheckbox('brokenOnlyExternals', 'brokenOnlyExternals');
  attachCheckbox('useOverlap', 'useOverlap');
  attachCheckbox('showGridStroke', 'showGridStroke');
  attachCheckbox('showIntersectionLines', 'showIntersectionLines');
  attachCheckbox('useManualBg', 'useManualBg');
  attachCheckbox('useManualStroke', 'useManualStroke');
  attachCheckbox('seedLockToggle', 'seedLocked');

  const attachNumeric = (id, stateProp, subKey = null) => {
    document.getElementById(id).addEventListener('change', (e) => {
      const val = parseInt(e.target.value) || 0;
      if (subKey) {
        state[stateProp][subKey] = val;
      } else {
        state[stateProp] = val;
      }
      renderScene();
    });
  };

  attachNumeric('macroColsMin', 'macroColsRange', 'min');
  attachNumeric('macroColsMax', 'macroColsRange', 'max');
  attachNumeric('macroRowsMin', 'macroRowsRange', 'min');
  attachNumeric('macroRowsMax', 'macroRowsRange', 'max');
  attachNumeric('capsuleCountMin', 'capsuleCountRange', 'min');
  attachNumeric('capsuleCountMax', 'capsuleCountRange', 'max');
  attachNumeric('capsuleYVarMin', 'capsuleYVarRange', 'min');
  attachNumeric('capsuleYVarMax', 'capsuleYVarRange', 'max');

  document.getElementById('macroLayoutMode').addEventListener('change', (e) => {
    state.macroLayoutMode = e.target.value;
    syncGUI();
    renderScene();
  });

  document.getElementById('macroColsCustom').addEventListener('change', (e) => {
    state.macroColsCustom = e.target.value;
    renderScene();
  });

  document.getElementById('macroRowsCustom').addEventListener('change', (e) => {
    state.macroRowsCustom = e.target.value;
    renderScene();
  });

  document.getElementById('brokenOrientation').addEventListener('change', (e) => {
    state.brokenOrientation = e.target.value;
    renderScene();
  });

  document.getElementById('brokenVertPos').addEventListener('change', (e) => {
    state.brokenVertPos = e.target.value;
    renderScene();
  });

  document.getElementById('orientationMode').addEventListener('change', (e) => {
    state.orientationMode = e.target.value;
    syncGUI();
    renderScene();
  });

  document.getElementById('palettePresetSelect').addEventListener('change', (e) => {
    const val = e.target.value;
    state.activePaletteName = val;

    if (PALETTES[val]) {
      state.palette = [...PALETTES[val]];
    } else {
      const customPalettes = JSON.parse(localStorage.getItem('skolptura_custom_palettes') || '{}');
      if (customPalettes[val]) {
        state.palette = [...customPalettes[val]];
      }
    }
    renderPaletteSwatches();
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

  setupSteppers();
}

function setupSteppers() {
  const containers = document.querySelectorAll('.slider-container');
  containers.forEach(container => {
    const input = container.querySelector('input[type="range"]');
    if (!input || container.querySelector('.stepper-controls')) return;

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
    container.appendChild(controls);

    const changeVal = (delta) => {
      try {
        if (delta > 0) input.stepUp();
        else input.stepDown();
      } catch (err) {
        const step = parseFloat(input.step) || 1;
        const current = parseFloat(input.value) || 0;
        const min = input.min !== '' ? parseFloat(input.min) : -Infinity;
        const max = input.max !== '' ? parseFloat(input.max) : Infinity;
        const nextVal = current + (delta > 0 ? step : -step);
        input.value = Math.max(min, Math.min(max, parseFloat(nextVal.toFixed(4))));
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
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
  state.capsuleThicknessRatio = Math.floor(Math.random() * 40) + 1;
  
  state.gridCols = Math.floor(Math.random() * 40) + 2;
  state.gridRows = Math.floor(Math.random() * 30) + 1;
  
  state.capsuleCountRange = {
    min: Math.floor(Math.random() * 5) + 1,
    max: Math.floor(Math.random() * 10) + 5
  };
  if (state.capsuleCountRange.min > state.capsuleCountRange.max) {
    state.capsuleCountRange.min = state.capsuleCountRange.max;
  }
  
  state.capsuleFullHeight = Math.random() < 0.5;
  state.capsuleYVarRange = { min: 0, max: Math.floor(Math.random() * 4) + 1 };
  state.capsuleConstantStep = Math.random() < 0.3;
  state.capsuleStepSize = Math.floor(Math.random() * 3) + 1;

  state.probBrokenCapsule = Math.random() < 0.5 ? Math.random() * 0.8 : 0;
  state.brokenOrientation = ["AUTO", "VERTICAL", "HORIZONTAL"][Math.floor(Math.random() * 3)];
  state.brokenOnlyExternals = Math.random() < 0.6;
  state.brokenVertPos = ["START", "END", "BOTH", "RANDOM"][Math.floor(Math.random() * 4)];
  state.brokenVertRatio = Math.floor(Math.random() * 8) + 1;

  state.orientationMode = ["VERTICAL", "HORIZONTAL", "RANDOM", "MIXED"][Math.floor(Math.random() * 4)];
  state.orientationMixProb = parseFloat((Math.random() * 0.4).toFixed(2));
  
  const paletteKeys = Object.keys(PALETTES);
  const randomKey = paletteKeys[Math.floor(Math.random() * paletteKeys.length)];
  state.activePaletteName = randomKey;
  state.palette = [...PALETTES[randomKey]];

  state.seed = Math.random().toString(36).substring(2, 9);

  syncGUI();
  renderScene();
}

function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    if (activeEl) {
      const isTextInput = activeEl.tagName === 'TEXTAREA' || 
                          (activeEl.tagName === 'INPUT' && ['text', 'number'].includes(activeEl.type));
      if (isTextInput) {
        return;
      }
    }

    if (e.metaKey || e.ctrlKey || e.altKey) {
      return;
    }

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

async function saveFileLocally(filename, content, isBase64 = false) {
  try {
    const response = await fetch('/api/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ filename, content, isBase64 })
    });
    const result = await response.json();
    if (result.success) {
      console.log(`[Local Save] File salvato in Download_Capsule: ${filename}`);
    } else {
      console.error(`[Local Save] Errore nel salvataggio locale: ${result.error}`);
    }
  } catch (err) {
    console.error(`[Local Save] Impossibile connettersi al server per il salvataggio locale.`, err);
  }
}

async function downloadPNG() {
  if (!app) return;
  const dataUrl = app.canvas.toDataURL("image/png");
  const filename = `Skolptura_Capsule_${state.seed || 'art'}.png`;

  // Salva localmente in Download_Capsule
  await saveFileLocally(filename, dataUrl, true);

  // Fallback download browser
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

async function downloadSVG() {
  if (!currentSceneData) return;

  const svgString = exportToSVG(currentSceneData);
  const filename = `Skolptura_Capsule_${state.seed || 'art'}.svg`;

  // Salva localmente in Download_Capsule
  await saveFileLocally(filename, svgString, false);

  // Fallback download browser
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
  const filename = `Skolptura_Config_${state.seed || 'art'}.json`;

  // Salva localmente in Download_Capsule
  await saveFileLocally(filename, jsonString, false);

  // Fallback download browser
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

async function runBatchExport(count, randomizeAll = false) {
  const btn = document.getElementById(randomizeAll ? 'export-batch-random-btn' : 'export-batch-btn');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.style.opacity = '0.6';

  // Copia profonda dello stato di partenza per ripristinarlo integralmente alla fine
  const originalStateJSON = JSON.stringify(state);
  state.seedLocked = true;

  try {
    for (let i = 0; i < count; i++) {
      btn.textContent = `Esportazione ${i + 1}/${count}...`;

      if (randomizeAll) {
        // Randomizzazione completa: varia parametri e seed casuale
        randomizeParams();
      } else {
        // Varia solo il seed
        const currentSeed = Math.random().toString(36).substring(2, 9);
        state.seed = currentSeed;
        document.getElementById('seedInput').value = currentSeed;
        renderScene();
      }

      // Attendiamo che PixiJS renderizzi il frame prima dell'estrazione
      await new Promise(resolve => setTimeout(resolve, 250));

      const currentSeed = state.seed;

      // 1. Salva e scarica JSON
      const jsonString = JSON.stringify(state, null, 2);
      const jsonFilename = `Skolptura_Config_${currentSeed}.json`;
      await saveFileLocally(jsonFilename, jsonString, false);

      const jsonBlob = new Blob([jsonString], { type: 'application/json' });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const jsonLink = document.createElement('a');
      jsonLink.download = jsonFilename;
      jsonLink.href = jsonUrl;
      jsonLink.click();
      URL.revokeObjectURL(jsonUrl);

      // 2. Salva e scarica PNG
      const pngDataUrl = app.canvas.toDataURL("image/png");
      const pngFilename = `Skolptura_Capsule_${currentSeed}.png`;
      await saveFileLocally(pngFilename, pngDataUrl, true);

      const pngLink = document.createElement('a');
      pngLink.download = pngFilename;
      pngLink.href = pngDataUrl;
      pngLink.click();

      // Intervallo di stabilità per accodamento dei download nel browser
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  } catch (error) {
    console.error("Errore durante l'esportazione batch:", error);
    alert("Si è verificato un errore durante l'esportazione batch.");
  } finally {
    // Ripristiniamo integralmente lo stato originario
    state = JSON.parse(originalStateJSON);
    
    syncGUI();
    renderScene();

    btn.textContent = originalText;
    btn.disabled = false;
    btn.style.opacity = '1';
  }
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
  });
});
