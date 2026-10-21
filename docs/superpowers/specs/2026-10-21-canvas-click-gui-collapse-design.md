# Specifica di Design: Chiusura GUI al Click sull'Area di Rendering & Espansione a Schermo Intero

**Data:** 2026-10-21  
**Stato:** Approvato dall'utente  
**Autore:** Antigravity  

---

## 1. Obiettivo

Consentire all'utente di passare a una modalità di visualizzazione a schermo intero cliccando o toccando l'area di rendering del canvas. Al click:
1. La GUI (sidebar dei controlli) si chiude completamente scivolando in basso.
2. L'area di rendering della composizione si espande per riempire l'intero schermo (`100vw` × `100dvh`).
3. In basso al centro dello schermo compare un pulsante fluttuante (`▲ CONTROLLI`) per riaprire dinamicamente la GUI.
4. Cliccando sul pulsante, la GUI riemerge dal basso e il canvas ritorna alle sue dimensioni standard.

---

## 2. Requisiti di Interazione

- **Rilevamento Click vs Drag:**  
  Nel canvas è attivo lo spostamento con drag o pan. Un'interazione viene considerata click/tap solo se lo scostamento tra `pointerdown` e `pointerup` è inferiore a 8px e la durata è rapida (< 300ms).
- **Transizione Fluida & Stato:**  
  Viene usata la classe `.gui-collapsed` su `document.body` (o `.app-container`).
  - Quando attiva:
    - `.sidebar` viene traslata verso il basso (`transform: translateY(100%)`) o resa `display: none` con transizione CSS.
    - `.canvas-area` e `#canvas-wrapper` passano a `width: 100vw !important; height: 100dvh !important; flex: 1 1 100% !important; max-height: none !important; aspect-ratio: unset !important;`.
    - `#reopen-gui-btn` diventa visibile (`opacity: 1; pointer-events: auto;`).
  - Quando disattivata:
    - `.sidebar` torna alla sua posizione originale (`transform: none;`).
    - `.canvas-area` e `#canvas-wrapper` tornano a `width: 100vw; height: 100vw; aspect-ratio: 1 / 1;` (su mobile) o layout standard (su desktop).
    - `#reopen-gui-btn` si nasconde (`opacity: 0; pointer-events: none;`).
- **ResizeObserver PixiJS:**  
  PixiJS riceve l'evento di ridimensionamento del wrapper e adatta il rendering all'area completa, chiamando `resetView()` e `renderScene()`.

---

## 3. Componenti & Stili

- **Pulsante `#reopen-gui-btn`:**
  - Posizione: `position: fixed; bottom: calc(16px + env(safe-area-inset-bottom, 10px)); left: 50%; transform: translateX(-50%); z-index: 100;`
  - Aspetto: Brutalista minimale, sfondo `rgba(0, 0, 0, 0.85)`, bordo `1px solid #333`, testo `#ffffff` in maiuscolo, font `Open Sans` 11px semi-bold, padding `8px 16px`.
  - Icona/Testo: `▲ CONTROLLI` (o `▲ APRI CONTROLLI`).
  - Comportamento: invisibile di default, visibile quando `body.gui-collapsed` è presente.
