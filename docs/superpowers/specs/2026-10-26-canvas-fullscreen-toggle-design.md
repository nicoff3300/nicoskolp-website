# Specifica di Design: Toggle Fullscreen Canvas & Chiusura Dinamica GUI al Click

**Data:** 2026-10-26  
**Autore:** Antigravity  
**Stato:** Approvato dall'utente  

---

## 1. Visione e Obiettivi

Nelle 6 applicazioni di **Skolptura Lab** (`BRIO`, `CAPSULE`, `DOOMENO`, `GRIDSHAPE`, `LETSHIFT`, `LOGIC RIBBON`), permettere all'utente di focalizzarsi interamente sull'opera generativa:
- **Al click/tap sull'area di rendering del canvas**: la GUI dei controlli si chiude completamente in basso (su mobile) e lateralmente (su desktop).
- **Adattamento del Canvas**: la composizione non deve deformarsi o allungarsi forzatamente; rimane centrata con le sue proporzioni originali (quadrata su mobile o coerente col formato impostato) e l'intera area dello schermo assume come colore di sfondo il colore della composizione (`scene.backgroundColor`), creando un effetto a tutto schermo continuo e pulito.
- **Riapertura Dinamica**: in basso al centro compare un pulsante squadrato brutalista (`▲ MOSTRA CONTROLLI`). Cliccando esclusivamente su questo pulsante, la GUI ricompare ripristinando il layout precedente.

---

## 2. Requisiti Dettagliati

### 2.1 Attivazione (Click su Area di Rendering)
- Il trigger si attiva cliccando o toccando su `.canvas-area` o `#canvas-wrapper`.
- **Prevenzione Falsi Positivi durante Pan/Drag**: viene calcolato lo spostamento tra pointerdown e pointerup. Se il puntatore si è spostato più di 5px (operazione di pan/spostamento), il click NON scatta.
- **Esclusione Elementi Interattivi**: i click su pulsanti interni (es. `#immersive-preview-btn` o il pulsante di riapertura) non scatenano la chiusura.

### 2.2 Stato Fullscreen (`body.gui-collapsed`)
- Viene applicata la classe `.gui-collapsed` a `document.body`.
- **Sidebar GUI**: `display: none !important;` sia su desktop che su mobile.
- **Canvas Area**:
  - `position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100dvh !important; z-index: 40 !important; display: flex !important; align-items: center !important; justify-content: center !important;`
  - Il colore di sfondo (`--canvas-area-bg` e `backgroundColor`) viene impostato dinamicamente con il colore di fondo dell'opera (`scene.backgroundColor` / `bgColor`).
- **Canvas Wrapper**:
  - Rimane centrato e proporzionato senza deformazioni: `max-width: 100vw; max-height: 100dvh; aspect-ratio: 1 / 1;`.
  - Non viene alterato l'aspect ratio delle geometrie generative.

### 2.3 Riapertura GUI (`#gui-reopen-btn`)
- Un elemento `<button id="gui-reopen-btn" class="gui-reopen-btn" aria-label="Mostra Controlli">▲ Mostra Controlli</button>` viene inserito in ogni applicazione.
- **Stile**:
  - Nascosto di default (`display: none;`).
  - Visibile solo in stato `.gui-collapsed`:
    - Posizione: `position: fixed; bottom: calc(20px + env(safe-area-inset-bottom, 0px)); left: 50%; transform: translateX(-50%); z-index: 100;`
    - Design: Nero squadrato (`#000000`, `border: 1px solid #333333`, `border-radius: 0px`), testo bianco maiuscolo 11px con lettera spaziata (`font-family: 'Open Sans', system-ui, sans-serif`), hover invertito (bianco su nero).
- **Interazione al click**:
  - Rimuove la classe `.gui-collapsed` da `document.body`.
  - Ripristina la GUI e la dimensione dell'area di rendering (su mobile: `100vw x 100vw` fissa con GUI scrollabile sotto; su desktop: sidebar a destra).
  - Se la modalità sfondo esteso (`state.immersiveMode`) era disattiva, ripristina il background default di `.canvas-area`.
  - Notifica Pixi (`ResizeObserver` / `resetView()`) per centrare la composizione nel layout ripristinato.

---

## 3. Ambito File

1. **Markup HTML (`index.html` delle 6 app):**
   - Aggiunta del bottone `<button id="gui-reopen-btn" class="gui-reopen-btn" aria-label="Mostra Controlli">▲ Mostra Controlli</button>` dentro `.canvas-area` o come elemento fisso in `.app-container`.
2. **Stili CSS (`src/style.css` delle 6 app):**
   - Regole per `.gui-collapsed .sidebar`, `.gui-collapsed .canvas-area`, `.gui-collapsed #canvas-wrapper`, e `.gui-reopen-btn`.
3. **Logica JavaScript (`src/main.js` delle 6 app):**
   - Gestione `state.guiCollapsed`, funzione `collapseGUI()` e `expandGUI()`.
   - Rilevamento click pulito senza drag su `.canvas-area` e `#canvas-wrapper`.
   - Aggiornamento dinamico del colore di sfondo in `renderScene()`.
4. **Bundle di Produzione e Deploy:**
   - Compilazione Vite delle 6 app.
   - Sincronizzazione in `public/lab/`.
   - Validazione Astro (`check`, `build`, `audit`).
   - Deploy FTPS su hosting Aruba.
