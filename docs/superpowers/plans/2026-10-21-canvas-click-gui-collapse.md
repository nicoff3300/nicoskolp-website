# Piano di Implementazione: Chiusura GUI al Click sull'Area di Rendering & Espansione a Schermo Intero

**Data:** 2026-10-21  
**Stato:** Completato  
**Autore:** Antigravity  

---

## 1. File Coinvolti

Le 6 applicazioni di Skolptura Lab:
1. `Skolptura_app/BRIO/web-app/` (`index.html`, `src/style.css`, `src/main.js`)
2. `Skolptura_app/CAPSULE/web-app/` (`index.html`, `src/style.css`, `src/main.js`)
3. `Skolptura_app/DOOMENO/web-app/` (`index.html`, `src/style.css`, `src/main.js`)
4. `Skolptura_app/GRIDSHAPE/web-app/` (`index.html`, `src/style.css`, `src/main.js`)
5. `Skolptura_app/LETSHIFT/web-app/` (`index.html`, `src/style.css`, `src/main.js`)
6. `Skolptura_app/LOGIC RIBBON/web-app/` (`index.html`, `src/style.css`, `src/main.js`)

Inoltre, i rispettivi file distribuiti in `public/lab/`.

---

## 2. Dettaglio dei Task

### Task 1: Markup HTML (Aggiunta del Pulsante Riapri GUI)
In ciascuno dei 6 `index.html`:
Inserire il pulsante fluttuante per la riapertura della GUI, posizionato all'interno di `.app-container`:
```html
<button id="reopen-gui-btn" class="reopen-gui-btn" aria-label="Riapri pannello controlli">▲ CONTROLLI</button>
```

### Task 2: Stili CSS (Regole per `.gui-collapsed` e `#reopen-gui-btn`)
In ciascuno dei 6 `src/style.css`:
1. Definire le regole per `.reopen-gui-btn`:
   - Nascosto di default (`display: none;` o `opacity: 0; pointer-events: none;`).
   - Visibile quando `body.gui-collapsed` è attivo.
2. In `@media (max-width: 900px)` (e in generale per `body.gui-collapsed`):
   - `.sidebar`: quando `body.gui-collapsed`, scende in basso (`transform: translateY(100%);` o `display: none !important;`).
   - `.canvas-area` e `#canvas-wrapper`: quando `body.gui-collapsed`, occupano `100vw` in larghezza e `100dvh` in altezza (`height: 100dvh !important; max-height: none !important; aspect-ratio: unset !important; flex: 1 1 100% !important;`).

### Task 3: Logica JavaScript (Click Detection & Toggle GUI)
In ciascuno dei 6 `src/main.js`:
1. Rilevare il click/tap su `#canvas-wrapper` (distinguendo con precisione click da drag con soglia < 8px).
2. All'evento click sull'area di rendering:
   `document.body.classList.add('gui-collapsed');`
   Trigger immediato del resize di Pixi per riempire l'intero schermo.
3. Al click su `#reopen-gui-btn`:
   `document.body.classList.remove('gui-collapsed');`
   Trigger del resize di Pixi per tornare al formato 1:1.

### Task 4: Compilazione Vite & Sync `public/lab/`
- Compilazione delle 6 app con `npm run build`.
- Sincronizzazione degli asset in `public/lab/`.

### Task 5: Audit Astro, Commit, Push & Deploy Aruba
- Eseguire `npm run check && npm run build && npm run audit`.
- Commit su GitHub, push su `main`, e monitoraggio deploy FTPS su Aruba con `gh run watch`.
