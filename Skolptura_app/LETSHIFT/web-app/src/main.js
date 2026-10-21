import * as PIXI from 'pixi.js';
import { generateScene, exportToSVG, hexToRgbStr, PALETTES } from './generator.js';

const PRESET_FORMATS = {
  "LETSHIFT_ORIGINAL": { w: 1700, h: 992, unit: "px" },
  "LETSHIFT_SQUARE": { w: 1000, h: 1000, unit: "px" },
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
  canvasHeight: 1440,
  canvasUnit: "px",
  margin: 50,
  autoScale: true,

  numRows: 1,
  numPairs: 10,

  shearFactor: 10,
  shiftRangeLimit: 1.0,
  heightRangeLimit: 2.0,
  widthRangeLimit: 2.0,

  heightOrderFactor: 20,
  widthOrderFactor: 0,
  uniformHeights: true,
  uniformShift: true,
  uniformWidths: false,

  roundOuterCorners: false,
  autoRadius: true,
  cornerRadius: 20,

  showGridStroke: false,
  showIntersectionLines: true,
  strokeWidth: 1.5,

  activePaletteName: "Skolp_01",
  palette: [...PALETTES["Skolp_01"]],
  useManualBg: false,
  manualBgHex: "#475855",
  useManualStroke: false,
  manualStrokeHex: "#000000",

  seed: "letshift_default",
  seedLocked: true,
  
  viewScale: 1.0,
  viewOffset: { x: 0, y: 0 },
  immersiveMode: false
};

// --- INIZIALIZZAZIONE PIXIJS ---
let app;
let bgGraphics;
let shapesGraphics;
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
    resolution: window.devicePixelRatio || 1,
    preserveDrawingBuffer: true
  });

  wrapper.appendChild(app.canvas);

  bgGraphics = new PIXI.Graphics();
  shapesGraphics = new PIXI.Graphics();
  gridGraphics = new PIXI.Graphics();

  app.stage.addChild(bgGraphics);
  app.stage.addChild(shapesGraphics);
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

// --- ZOOM E PAN SUL CANVAS DOM ---
function setupZoomPan(wrapper) {
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };

  // Zoom
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

  // Pan (drag)
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

// --- METODO DISEGNO FORMA (PixiJS) ---
function drawPixiShape(graphics, shape, strokeWidth, isOutlineOnly, showIntersectionLines) {
  if (shape.type === "rect") {
    const { x, y, w, h, radii } = shape;
    const { topLeft = 0, topRight = 0, bottomRight = 0, bottomLeft = 0 } = radii || {};
    
    graphics.beginPath();
    graphics.moveTo(x + bottomLeft, y + h);
    graphics.lineTo(x + w - bottomRight, y + h);
    if (bottomRight > 0) {
      graphics.arcTo(x + w, y + h, x + w, y + h - bottomRight, bottomRight);
    }
    graphics.lineTo(x + w, y + topRight);
    if (topRight > 0) {
      graphics.arcTo(x + w, y, x + w - topRight, y, topRight);
    }
    graphics.lineTo(x + topLeft, y);
    if (topLeft > 0) {
      graphics.arcTo(x, y, x, y + topLeft, topLeft);
    }
    graphics.lineTo(x, y + h - bottomLeft);
    if (bottomLeft > 0) {
      graphics.arcTo(x, y + h, x + bottomLeft, y + h, bottomLeft);
    }
    graphics.closePath();
    
    if (isOutlineOnly) {
      graphics.stroke({ color: shape.strokeColor, width: strokeWidth, join: 'round', cap: 'round' });
    } else {
      graphics.fill({ color: shape.fillColor });
      if (!showIntersectionLines) {
        graphics.stroke({ color: shape.strokeColor, width: strokeWidth, join: 'round', cap: 'round' });
      }
    }
  } else if (shape.type === "quad") {
    const { p1, p2, p3, p4 } = shape;
    
    graphics.beginPath();
    graphics.moveTo(p1.x, p1.y);
    graphics.lineTo(p2.x, p2.y);
    graphics.lineTo(p3.x, p3.y);
    graphics.lineTo(p4.x, p4.y);
    graphics.closePath();
    
    if (isOutlineOnly) {
      graphics.stroke({ color: shape.strokeColor, width: strokeWidth, join: 'round', cap: 'round' });
    } else {
      graphics.fill({ color: shape.fillColor });
      if (!showIntersectionLines) {
        graphics.stroke({ color: shape.strokeColor, width: strokeWidth, join: 'round', cap: 'round' });
      }
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
  shapesGraphics.clear();
  gridGraphics.clear();

  // Resize se dimensioni cambiate
  if (app.renderer.width !== state.canvasWidth || app.renderer.height !== state.canvasHeight) {
    app.renderer.resize(state.canvasWidth, state.canvasHeight);
    resetView();
  }

  // Sfondo
  bgGraphics.rect(0, 0, state.canvasWidth, state.canvasHeight);
  bgGraphics.fill({ color: scene.backgroundColor });

  // Disegno forme (due passaggi se outline solo su intersezioni)
  if (scene.showIntersectionLines) {
    // 1. Disegna i riempimenti
    scene.shapes.forEach(shape => {
      drawPixiShape(shapesGraphics, shape, scene.strokeWidth, false, true);
    });
    // 2. Disegna i contorni sopra
    scene.shapes.forEach(shape => {
      drawPixiShape(shapesGraphics, shape, scene.strokeWidth, true, true);
    });
  } else {
    // Disegno combinato immediato
    scene.shapes.forEach(shape => {
      drawPixiShape(shapesGraphics, shape, scene.strokeWidth, false, false);
    });
  }

  // Griglie e cornici di verifica
  if (state.showGridStroke) {
    scene.gridLines.forEach(line => {
      if (line.type === "outer-boundary") {
        gridGraphics.rect(line.x, line.y, line.w, line.h);
        gridGraphics.stroke({ color: 0xff0000, width: 1.5 });
      } else if (line.type === "row-divider" || line.type === "col-divider") {
        gridGraphics.moveTo(line.x1, line.y1);
        gridGraphics.lineTo(line.x2, line.y2);
        gridGraphics.stroke({ color: 0xcccc00, width: 0.8 });
      }
    });
  }

  // Immersive mode style adjustments
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

  document.getElementById('numRows').value = state.numRows;
  document.getElementById('numRows-val').textContent = state.numRows;
  document.getElementById('numPairs').value = state.numPairs;
  document.getElementById('numPairs-val').textContent = state.numPairs;

  document.getElementById('shearFactor').value = state.shearFactor;
  document.getElementById('shearFactor-val').textContent = state.shearFactor;
  document.getElementById('shiftRangeLimit').value = state.shiftRangeLimit;
  document.getElementById('shiftRangeLimit-val').textContent = state.shiftRangeLimit;
  document.getElementById('heightRangeLimit').value = state.heightRangeLimit;
  document.getElementById('heightRangeLimit-val').textContent = state.heightRangeLimit;
  document.getElementById('widthRangeLimit').value = state.widthRangeLimit;
  document.getElementById('widthRangeLimit-val').textContent = state.widthRangeLimit;

  document.getElementById('heightOrderFactor').value = state.heightOrderFactor;
  document.getElementById('heightOrderFactor-val').textContent = state.heightOrderFactor;
  document.getElementById('widthOrderFactor').value = state.widthOrderFactor;
  document.getElementById('widthOrderFactor-val').textContent = state.widthOrderFactor;
  
  document.getElementById('uniformHeights').checked = state.uniformHeights;
  document.getElementById('uniformShift').checked = state.uniformShift;
  document.getElementById('uniformWidths').checked = state.uniformWidths;

  document.getElementById('roundOuterCorners').checked = state.roundOuterCorners;
  document.getElementById('autoRadius').checked = state.autoRadius;
  document.getElementById('cornerRadius').value = state.cornerRadius;
  document.getElementById('cornerRadius-val').textContent = state.cornerRadius;

  document.getElementById('corner-radius-group').style.display = state.roundOuterCorners ? "flex" : "none";
  document.getElementById('manual-radius-group').style.display = state.autoRadius ? "none" : "block";

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

  const savedPalettes = JSON.parse(localStorage.getItem('letshift_custom_palettes') || '{}');
  savedPalettes[state.activePaletteName] = state.palette;
  localStorage.setItem('letshift_custom_palettes', JSON.stringify(savedPalettes));

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

  const customPalettes = JSON.parse(localStorage.getItem('letshift_custom_palettes') || '{}');
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
    const wVal = parseFloat(document.getElementById('canvasWidthInput').value) || 1700;
    const hVal = parseFloat(document.getElementById('canvasHeightInput').value) || 992;

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

    const wVal = parseFloat(document.getElementById('canvasWidthInput').value) || 1700;
    const hVal = parseFloat(document.getElementById('canvasHeightInput').value) || 992;

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

  const attachSlider = (id, stateProp, step = 1) => {
    const slider = document.getElementById(id);
    slider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      state[stateProp] = val;
      
      const valEl = document.getElementById(`${id}-val`);
      if (valEl) {
        valEl.textContent = val;
      }
      renderScene();
    });
  };

  attachSlider('margin', 'margin');
  attachSlider('numRows', 'numRows');
  attachSlider('numPairs', 'numPairs');
  attachSlider('shearFactor', 'shearFactor');
  attachSlider('shiftRangeLimit', 'shiftRangeLimit');
  attachSlider('heightRangeLimit', 'heightRangeLimit');
  attachSlider('widthRangeLimit', 'widthRangeLimit');
  attachSlider('heightOrderFactor', 'heightOrderFactor');
  attachSlider('widthOrderFactor', 'widthOrderFactor');
  attachSlider('cornerRadius', 'cornerRadius');
  attachSlider('strokeWidth', 'strokeWidth');

  const attachCheckbox = (id, stateProp) => {
    document.getElementById(id).addEventListener('change', (e) => {
      state[stateProp] = e.target.checked;
      syncGUI();
      renderScene();
    });
  };

  attachCheckbox('autoScale', 'autoScale');
  attachCheckbox('uniformHeights', 'uniformHeights');
  attachCheckbox('uniformShift', 'uniformShift');
  attachCheckbox('uniformWidths', 'uniformWidths');
  attachCheckbox('roundOuterCorners', 'roundOuterCorners');
  attachCheckbox('autoRadius', 'autoRadius');
  attachCheckbox('showGridStroke', 'showGridStroke');
  attachCheckbox('showIntersectionLines', 'showIntersectionLines');
  attachCheckbox('useManualBg', 'useManualBg');
  attachCheckbox('useManualStroke', 'useManualStroke');
  attachCheckbox('seedLockToggle', 'seedLocked');

  document.getElementById('palettePresetSelect').addEventListener('change', (e) => {
    const val = e.target.value;
    state.activePaletteName = val;

    if (PALETTES[val]) {
      state.palette = [...PALETTES[val]];
    } else {
      const customPalettes = JSON.parse(localStorage.getItem('letshift_custom_palettes') || '{}');
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
  if (Math.random() < 0.8) {
    state.numPairs = Math.floor(Math.random() * 4) + 2; // Valori molto bassi: 2-5
  } else {
    state.numPairs = Math.floor(Math.random() * 7) + 6; // Valori medi: 6-12
  }
  
  state.shearFactor = Math.floor(Math.random() * 120);
  state.shiftRangeLimit = parseFloat((Math.random() * 3.0).toFixed(1));
  state.heightRangeLimit = parseFloat((Math.random() * 3.0).toFixed(1));
  state.widthRangeLimit = parseFloat((Math.random() * 3.0).toFixed(1));

  state.heightOrderFactor = Math.floor(Math.random() * 21);
  state.widthOrderFactor = Math.floor(Math.random() * 80);
  
  state.uniformHeights = Math.random() < 0.8;
  state.uniformShift = Math.random() < 0.8;
  state.uniformWidths = Math.random() < 0.3;

  state.cornerRadius = Math.floor(Math.random() * 50) + 5;

  state.showIntersectionLines = Math.random() < 0.9;

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
      console.log(`[Local Save] File salvato in Download_Letshift: ${filename}`);
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
  const filename = `Skolptura_Letshift_${state.seed || 'art'}.png`;

  await saveFileLocally(filename, dataUrl, true);

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

async function downloadSVG() {
  if (!currentSceneData) return;

  const svgString = exportToSVG(currentSceneData);
  const filename = `Skolptura_Letshift_${state.seed || 'art'}.svg`;

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
  const filename = `Skolptura_Config_Letshift_${state.seed || 'art'}.json`;

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

async function runBatchExport(count, randomizeAll = false) {
  const btn = document.getElementById(randomizeAll ? 'export-batch-random-btn' : 'export-batch-btn');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.style.opacity = '0.6';

  const originalStateJSON = JSON.stringify(state);
  state.seedLocked = true;

  try {
    for (let i = 0; i < count; i++) {
      btn.textContent = `Esportazione ${i + 1}/${count}...`;

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

      // 1. Save JSON config
      const jsonString = JSON.stringify(state, null, 2);
      const jsonFilename = `Skolptura_Config_Letshift_${currentSeed}.json`;
      await saveFileLocally(jsonFilename, jsonString, false);

      const jsonBlob = new Blob([jsonString], { type: 'application/json' });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const jsonLink = document.createElement('a');
      jsonLink.download = jsonFilename;
      jsonLink.href = jsonUrl;
      jsonLink.click();
      URL.revokeObjectURL(jsonUrl);

      // 2. Save PNG
      const pngDataUrl = app.canvas.toDataURL("image/png");
      const pngFilename = `Skolptura_Letshift_${currentSeed}.png`;
      await saveFileLocally(pngFilename, pngDataUrl, true);

      const pngLink = document.createElement('a');
      pngLink.download = pngFilename;
      pngLink.href = pngDataUrl;
      pngLink.click();

      await new Promise(resolve => setTimeout(resolve, 250));
    }
  } catch (error) {
    console.error("Errore durante l'esportazione batch:", error);
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


async function loadSharedPalettes() {
  const isAdmin = isModeAdmin();
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
