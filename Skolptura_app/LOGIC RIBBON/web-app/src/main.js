import * as PIXI from 'pixi.js';
import { generateScene, exportToSVG, hexToRgbStr, PALETTES } from './generator.js';

const PRESET_FORMATS = {
  "LOGICRIBBON_ORIGINAL": { w: 1500, h: 4000, unit: "px" },
  "LOGICRIBBON_SQUARE": { w: 1500, h: 1500, unit: "px" },
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
  numColumns: 3,
  useRandomRowHeights: false,
  rowHeightProportions: "1, 6",

  shearFactor: 40,
  shiftFactor: 5,
  shiftRangeLimit: 3.0,
  heightRangeLimit: 0.0,
  widthRangeLimit: 3.0,

  heightOrderFactor: 20,
  widthOrderFactor: 100,
  columnWidthBase: 50,
  blockRandomFactor: 50,
  adaptiveSplit: false,
  splitFactor: 50,

  uniformHeights: false,
  uniformShift: false,
  uniformWidths: false,

  showGridStroke: false,
  showIntersectionLines: true,
  strokeWidth: 1.2,

  activePaletteName: "Skolp_01",
  palette: [...PALETTES["Skolp_01"]],
  useManualBg: false,
  manualBgHex: "#ffffff",
  useManualStroke: false,
  manualStrokeHex: "#000000",

  seed: "skolptura_logic_ribbon",
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

  // Pan
  wrapper.addEventListener('mousedown', (e) => {
    // Evita pan se clicchiamo su bottoni o moduli
    if (e.target !== wrapper && e.target.id !== 'canvas-wrapper' && e.target.tagName === 'CANVAS') {
      isDragging = true;
      dragStart = { x: e.clientX - state.viewOffset.x, y: e.clientY - state.viewOffset.y };
    }
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

// --- RENDERING DEI SINGOLI PEZZI (PixiJS) ---
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

// --- RENDER SCENE ---
let currentSceneData = null;

function renderScene() {
  if (!app) return;

  if (!state.seedLocked) {
    state.seed = Math.random().toString(36).substring(2, 9);
    document.getElementById('seedInput').value = state.seed;
  }

  // Genera dati geometrici
  currentSceneData = generateScene(state);

  // 1. Sfondo
  bgGraphics.clear();
  bgGraphics.rect(0, 0, state.canvasWidth, state.canvasHeight).fill({ color: currentSceneData.backgroundColor });

  const canvasArea = document.querySelector('.canvas-area');
  if (canvasArea) {
    if (state.immersiveMode) {
      canvasArea.style.setProperty('--canvas-area-bg', currentSceneData.backgroundColor);
      canvasArea.style.backgroundColor = currentSceneData.backgroundColor;
      if (app.canvas) app.canvas.style.boxShadow = 'none';
    } else {
      canvasArea.style.removeProperty('--canvas-area-bg');
      canvasArea.style.backgroundColor = '';
      if (app.canvas) app.canvas.style.boxShadow = '';
    }
  }

  // 2. Forme Generative (Colonne, Ponti, Raccordi)
  shapesGraphics.clear();

  const l0Shapes = currentSceneData.shapes.filter(s => s.layer === 0);
  const l1Shapes = currentSceneData.shapes.filter(s => s.layer === 1);

  if (state.showIntersectionLines) {
    // Step A: Riempimenti per ciascun layer (senza bordo)
    l0Shapes.forEach(s => drawPixiShape(shapesGraphics, s, state.strokeWidth, false, true));
    l1Shapes.forEach(s => drawPixiShape(shapesGraphics, s, state.strokeWidth, false, true));

    // Step B: Outlines superiori di tutti gli elementi grafici
    currentSceneData.shapes.forEach(s => drawPixiShape(shapesGraphics, s, state.strokeWidth, true, true));
  } else {
    // Disegno diretto dei singoli pezzi con contorno
    l0Shapes.forEach(s => drawPixiShape(shapesGraphics, s, state.strokeWidth, false, false));
    l1Shapes.forEach(s => drawPixiShape(shapesGraphics, s, state.strokeWidth, false, false));
  }

  // 3. Griglia di Verifica
  gridGraphics.clear();
  if (state.showGridStroke && currentSceneData.gridLines) {
    currentSceneData.gridLines.forEach(l => {
      gridGraphics.beginPath();
      gridGraphics.moveTo(l.x1, l.y1);
      gridGraphics.lineTo(l.x2, l.y2);
      gridGraphics.stroke({ color: currentSceneData.strokeColor, width: 0.5, alpha: 0.3 });
    });
  }
}

// --- SINCRONIZZAZIONE GUI E STATO ---
function syncGUI() {
  document.getElementById('canvasFormatSelect').value = state.canvasFormat || detectFormat();
  
  document.getElementById('canvasWidthInput').value = state.canvasWidth;
  document.getElementById('canvasHeightInput').value = state.canvasHeight;
  document.getElementById('canvasUnitSelect').value = state.canvasUnit;
  
  updateDimensionsLabels();

  // Margini
  document.getElementById('margin').value = state.margin;
  document.getElementById('margin-val').textContent = state.margin;
  document.getElementById('autoScale').checked = state.autoScale;

  // Struttura
  document.getElementById('numRows').value = state.numRows;
  document.getElementById('numRows-val').textContent = state.numRows;
  document.getElementById('numColumns').value = state.numColumns;
  document.getElementById('numColumns-val').textContent = state.numColumns;
  document.getElementById('useRandomRowHeights').checked = state.useRandomRowHeights;
  document.getElementById('rowHeightProportions').value = state.rowHeightProportions;
  
  const proportionsGroup = document.getElementById('row-proportions-group');
  proportionsGroup.style.display = state.useRandomRowHeights ? 'none' : 'flex';

  // Parametri Geometria
  document.getElementById('shearFactor').value = state.shearFactor;
  document.getElementById('shearFactor-val').textContent = state.shearFactor;
  document.getElementById('shiftFactor').value = state.shiftFactor;
  document.getElementById('shiftFactor-val').textContent = state.shiftFactor;
  
  document.getElementById('shiftRangeLimit').value = state.shiftRangeLimit;
  document.getElementById('shiftRangeLimit-val').textContent = state.shiftRangeLimit.toFixed(1);
  document.getElementById('heightRangeLimit').value = state.heightRangeLimit;
  document.getElementById('heightRangeLimit-val').textContent = state.heightRangeLimit.toFixed(1);
  document.getElementById('widthRangeLimit').value = state.widthRangeLimit;
  document.getElementById('widthRangeLimit-val').textContent = state.widthRangeLimit.toFixed(1);

  // Parametri Ordine
  document.getElementById('heightOrderFactor').value = state.heightOrderFactor;
  document.getElementById('heightOrderFactor-val').textContent = state.heightOrderFactor;
  document.getElementById('widthOrderFactor').value = state.widthOrderFactor;
  document.getElementById('widthOrderFactor-val').textContent = state.widthOrderFactor;
  document.getElementById('columnWidthBase').value = state.columnWidthBase;
  document.getElementById('columnWidthBase-val').textContent = state.columnWidthBase;
  document.getElementById('blockRandomFactor').value = state.blockRandomFactor;
  document.getElementById('blockRandomFactor-val').textContent = state.blockRandomFactor;
  
  document.getElementById('adaptiveSplit').checked = state.adaptiveSplit;
  document.getElementById('splitFactor').value = state.splitFactor;
  document.getElementById('splitFactor-val').textContent = state.splitFactor;

  // Uniformità
  document.getElementById('uniformHeights').checked = state.uniformHeights;
  document.getElementById('uniformShift').checked = state.uniformShift;
  document.getElementById('uniformWidths').checked = state.uniformWidths;


  // Contorni
  document.getElementById('showGridStroke').checked = state.showGridStroke;
  document.getElementById('showIntersectionLines').checked = state.showIntersectionLines;
  document.getElementById('strokeWidth').value = state.strokeWidth;
  document.getElementById('strokeWidth-val').textContent = state.strokeWidth;

  // Palette e colori
  document.getElementById('palettePresetSelect').value = state.activePaletteName;
  document.getElementById('useManualBg').checked = state.useManualBg;
  document.getElementById('manualBgHex').value = state.manualBgHex;
  document.getElementById('useManualStroke').checked = state.useManualStroke;
  document.getElementById('manualStrokeHex').value = state.manualStrokeHex;

  // Seed
  document.getElementById('seedInput').value = state.seed;
  document.getElementById('seedLockToggle').checked = state.seedLocked;

  renderPaletteColors();
}

function detectFormat() {
  for (const [key, val] of Object.entries(PRESET_FORMATS)) {
    if (val.w === state.canvasWidth && val.h === state.canvasHeight && val.unit === state.canvasUnit) {
      return key;
    }
  }
  return state.canvasUnit === "px" ? "CUSTOM_PX" : "CUSTOM_CM";
}

function updateDimensionsLabels() {
  const wLabel = document.getElementById('canvasWidthLabel');
  const hLabel = document.getElementById('canvasHeightLabel');
  if (state.canvasUnit === 'px') {
    wLabel.textContent = "Larghezza (px)";
    hLabel.textContent = "Altezza (px)";
  } else {
    wLabel.textContent = "Larghezza (cm)";
    hLabel.textContent = "Altezza (cm)";
  }
}

// --- RENDERING DELLA TAVOLOZZA COLORI ---
function renderPaletteColors() {
  const container = document.getElementById('palette-colors-list');
  container.innerHTML = '';

  state.palette.forEach((color, idx) => {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = color;
    colorInput.addEventListener('input', (e) => {
      state.palette[idx] = e.target.value;
      renderScene();
    });

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-color-btn';
    removeBtn.innerHTML = '×';
    removeBtn.addEventListener('click', () => {
      state.palette.splice(idx, 1);
      renderPaletteColors();
      renderScene();
    });

    swatch.appendChild(colorInput);
    swatch.appendChild(removeBtn);
    container.appendChild(swatch);
  });
}

function populatePaletteSelect() {
  const select = document.getElementById('palettePresetSelect');
  select.innerHTML = '';
  Object.keys(PALETTES).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });
}

// --- SETUP EVENT LISTENERS ---
function setupEvents() {
  // Preset formato
  document.getElementById('canvasFormatSelect').addEventListener('change', (e) => {
    const formatKey = e.target.value;
    state.canvasFormat = formatKey;

    if (formatKey !== 'CUSTOM_PX' && formatKey !== 'CUSTOM_CM') {
      const preset = PRESET_FORMATS[formatKey];
      state.canvasUnit = preset.unit;
      
      if (preset.unit === 'px') {
        state.canvasWidth = preset.w;
        state.canvasHeight = preset.h;
      } else {
        // cm
        state.canvasWidth = cmToPx(preset.w);
        state.canvasHeight = cmToPx(preset.h);
      }
    } else {
      state.canvasUnit = formatKey === 'CUSTOM_PX' ? 'px' : 'cm';
    }

    if (app) {
      app.renderer.resize(state.canvasWidth, state.canvasHeight);
    }
    syncGUI();
    resetView();
    renderScene();
  });

  // Larghezza e Altezza custom
  const widthInput = document.getElementById('canvasWidthInput');
  const heightInput = document.getElementById('canvasHeightInput');
  
  const handleDimChange = () => {
    const w = parseFloat(widthInput.value) || 100;
    const h = parseFloat(heightInput.value) || 100;
    state.canvasFormat = state.canvasUnit === 'px' ? 'CUSTOM_PX' : 'CUSTOM_CM';

    if (state.canvasUnit === 'px') {
      state.canvasWidth = Math.round(w);
      state.canvasHeight = Math.round(h);
    } else {
      state.canvasWidth = cmToPx(w);
      state.canvasHeight = cmToPx(h);
    }

    if (app) {
      app.renderer.resize(state.canvasWidth, state.canvasHeight);
    }
    resetView();
    renderScene();
  };

  widthInput.addEventListener('change', handleDimChange);
  heightInput.addEventListener('change', handleDimChange);

  // Unità custom
  document.getElementById('canvasUnitSelect').addEventListener('change', (e) => {
    const oldUnit = state.canvasUnit;
    const newUnit = e.target.value;
    state.canvasUnit = newUnit;

    if (oldUnit === 'px' && newUnit === 'cm') {
      const wCm = pxToCm(state.canvasWidth);
      const hCm = pxToCm(state.canvasHeight);
      state.canvasWidth = cmToPx(wCm);
      state.canvasHeight = cmToPx(hCm);
    } else if (oldUnit === 'cm' && newUnit === 'px') {
      // Già salvati in px
    }

    state.canvasFormat = newUnit === 'px' ? 'CUSTOM_PX' : 'CUSTOM_CM';
    syncGUI();
    resetView();
    renderScene();
  });

  // Slider e Inputs Generici
  const bindSlider = (id, stateProp, isFloat = false) => {
    const slider = document.getElementById(id);
    slider.addEventListener('input', (e) => {
      const val = isFloat ? parseFloat(e.target.value) : parseInt(e.target.value, 10);
      state[stateProp] = val;
      document.getElementById(`${id}-val`).textContent = isFloat ? val.toFixed(1) : val;
      renderScene();
    });
  };

  bindSlider('margin', 'margin');
  bindSlider('numRows', 'numRows');
  bindSlider('numColumns', 'numColumns');
  bindSlider('shearFactor', 'shearFactor');
  bindSlider('shiftFactor', 'shiftFactor');
  bindSlider('shiftRangeLimit', 'shiftRangeLimit', true);
  bindSlider('heightRangeLimit', 'heightRangeLimit', true);
  bindSlider('widthRangeLimit', 'widthRangeLimit', true);
  bindSlider('heightOrderFactor', 'heightOrderFactor');
  bindSlider('widthOrderFactor', 'widthOrderFactor');
  bindSlider('columnWidthBase', 'columnWidthBase');
  bindSlider('blockRandomFactor', 'blockRandomFactor');
  bindSlider('splitFactor', 'splitFactor');
  bindSlider('strokeWidth', 'strokeWidth', true);

  // Checkboxes
  const bindCheckbox = (id, stateProp) => {
    document.getElementById(id).addEventListener('change', (e) => {
      state[stateProp] = e.target.checked;
      renderScene();
    });
  };

  bindCheckbox('autoScale', 'autoScale');
  bindCheckbox('useRandomRowHeights', 'useRandomRowHeights');
  bindCheckbox('adaptiveSplit', 'adaptiveSplit');
  bindCheckbox('uniformHeights', 'uniformHeights');
  bindCheckbox('uniformShift', 'uniformShift');
  bindCheckbox('uniformWidths', 'uniformWidths');
  bindCheckbox('showGridStroke', 'showGridStroke');
  bindCheckbox('showIntersectionLines', 'showIntersectionLines');
  bindCheckbox('useManualBg', 'useManualBg');
  bindCheckbox('useManualStroke', 'useManualStroke');

  // Input proportions
  document.getElementById('rowHeightProportions').addEventListener('change', (e) => {
    state.rowHeightProportions = e.target.value;
    renderScene();
  });

  // Sfondo casuale o manuale
  document.getElementById('useRandomRowHeights').addEventListener('change', (e) => {
    document.getElementById('row-proportions-group').style.display = e.target.checked ? 'none' : 'flex';
  });


  // Palette Preset
  document.getElementById('palettePresetSelect').addEventListener('change', (e) => {
    const name = e.target.value;
    state.activePaletteName = name;
    state.palette = [...PALETTES[name]];
    renderPaletteColors();
    renderScene();
  });

  // Aggiungi Colore
  document.getElementById('add-color-btn').addEventListener('click', () => {
    state.palette.push('#6366f1');
    renderPaletteColors();
    renderScene();
  });

  // Sfondi manuali
  document.getElementById('manualBgHex').addEventListener('input', (e) => {
    state.manualBgHex = e.target.value;
    if (state.useManualBg) renderScene();
  });
  document.getElementById('manualStrokeHex').addEventListener('input', (e) => {
    state.manualStrokeHex = e.target.value;
    if (state.useManualStroke) renderScene();
  });

  // Shuffle palette colors
  document.getElementById('shuffle-colors-btn').addEventListener('click', () => {
    // Mescolamento deterministico provvisorio o solo shift
    state.palette = state.palette.sort(() => Math.random() - 0.5);
    renderPaletteColors();
    renderScene();
  });

  // Seed
  document.getElementById('seedInput').addEventListener('input', (e) => {
    state.seed = e.target.value;
    renderScene();
  });
  document.getElementById('seedLockToggle').addEventListener('change', (e) => {
    state.seedLocked = e.target.checked;
  });

  // Rigenera
  document.getElementById('regenerate-btn').addEventListener('click', () => {
    state.seed = Math.random().toString(36).substring(2, 9);
    document.getElementById('seedInput').value = state.seed;
    renderScene();
  });

  // Randomizza parametri
  document.getElementById('randomize-params-btn').addEventListener('click', () => {
    randomizeParams();
  });

  // Anteprima estesa
  const immersiveBtn = document.getElementById('immersive-preview-btn');
  if (immersiveBtn) {
    immersiveBtn.addEventListener('click', () => {
      state.immersiveMode = !state.immersiveMode;
      immersiveBtn.classList.toggle('active', state.immersiveMode);
      document.body.classList.toggle('immersive-mode', state.immersiveMode);
      renderScene();
    });
  }

  // Esportazioni singole
  document.getElementById('export-png-btn').addEventListener('click', downloadPNG);
  document.getElementById('export-svg-btn').addEventListener('click', downloadSVG);
  document.getElementById('export-json-btn').addEventListener('click', exportJSON);
  document.getElementById('import-json-input').addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      importJSON(e.target.files[0]);
    }
  });

  // Esportazioni batch
  document.getElementById('export-batch-btn').addEventListener('click', () => {
    const qty = parseInt(document.getElementById('batchCountInput').value, 10) || 5;
    runBatchExport(qty, false);
  });
  document.getElementById('export-batch-random-btn').addEventListener('click', () => {
    const qty = parseInt(document.getElementById('batchCountInput').value, 10) || 5;
    runBatchExport(qty, true);
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

// --- FUNZIONE PER RANDOMIZZARE I PARAMETRI ---
function randomizeParams() {
  state.seed = Math.random().toString(36).substring(2, 9);
  
  state.numColumns = Math.floor(Math.random() * 7) + 2; // 2-8
  state.shearFactor = Math.floor(Math.random() * 120); // 0-120
  state.shiftFactor = Math.floor(Math.random() * 11); // 0-10
  state.shiftRangeLimit = parseFloat((Math.random() * 4 + 1).toFixed(1)); // 1-5
  state.widthRangeLimit = parseFloat((Math.random() * 3.5 + 0.5).toFixed(1)); // 0.5-4

  state.heightOrderFactor = Math.floor(Math.random() * 80);
  state.widthOrderFactor = Math.floor(Math.random() * 100);
  state.columnWidthBase = Math.floor(Math.random() * 60) + 20; // 20-80
  state.blockRandomFactor = Math.floor(Math.random() * 80) + 10; // 10-90
  state.splitFactor = Math.floor(Math.random() * 80) + 10; // 10-90
  
  state.uniformHeights = Math.random() < 0.25;
  state.uniformShift = Math.random() < 0.35;
  state.uniformWidths = Math.random() < 0.25;
  state.adaptiveSplit = Math.random() < 0.4;

  // Scegli palette a caso
  const paletteKeys = Object.keys(PALETTES);
  const randomPaletteName = paletteKeys[Math.floor(Math.random() * paletteKeys.length)];
  state.activePaletteName = randomPaletteName;
  state.palette = [...PALETTES[randomPaletteName]];

  state.useManualBg = Math.random() < 0.5;
  state.showIntersectionLines = false;

  syncGUI();
  renderScene();
}

// --- SHORTCUTS DA TASTIERA ---
function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    const key = e.key.toUpperCase();
    // Evita shortcuts se stiamo scrivendo in un input testuale
    if (document.activeElement.tagName === 'INPUT' && document.activeElement.type === 'text') {
      return;
    }

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

// --- SALVATAGGIO LOCALE VIA MIDDLEWARE VITE ---
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
      console.log(`[Local Save] File salvato in Download_Logic_Ribbon: ${filename}`);
    } else {
      console.error(`[Local Save] Errore nel salvataggio locale: ${result.error}`);
    }
  } catch (err) {
    console.error(`[Local Save] Impossibile connettersi al server per il salvataggio locale.`, err);
  }
}

// --- ESPORTAZIONI UTENTE ---
async function downloadPNG() {
  if (!app) return;
  const dataUrl = app.canvas.toDataURL("image/png");
  const filename = `Skolptura_LogicRibbon_${state.seed || 'art'}.png`;

  await saveFileLocally(filename, dataUrl, true);

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

async function downloadSVG() {
  if (!currentSceneData) return;

  const svgString = exportToSVG(currentSceneData);
  const filename = `Skolptura_LogicRibbon_${state.seed || 'art'}.svg`;

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
  const filename = `Skolptura_Config_LogicRibbon_${state.seed || 'art'}.json`;

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
      
      if (app) {
        app.renderer.resize(state.canvasWidth, state.canvasHeight);
      }
      resetView();
      renderScene();
    } catch (err) {
      alert("Errore nel caricamento del file JSON. Formato non valido.");
    }
  };
  reader.readAsText(file);
}

// --- BATCH EXPORT ---
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
      const jsonFilename = `Skolptura_Config_LogicRibbon_${currentSeed}.json`;
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
      const pngFilename = `Skolptura_LogicRibbon_${currentSeed}.png`;
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

// --- DOMContentLoaded INIT ---

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
