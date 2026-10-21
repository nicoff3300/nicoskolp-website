# Spec di Design: Miglioramenti Mobile & Interfaccia Skolptura Lab

**Data:** 2026-10-21  
**Stato:** Proposta approvata  
**Applicazioni interessate:** Tutte le 6 app in `Skolptura_app/` (Brio, Capsule, Doomeno, Gridshape, Letshift, Logic Ribbon) e relative build in `public/lab/`.

---

## 1. Obiettivi e Panoramica

L'obiettivo è ottimizzare l'esperienza utente su dispositivi mobili (smartphone e tablet touch) e perfezionare la coerenza grafica secondo il linguaggio brutalist/dark di Nico Skolp, risolvendo 4 criticità:

1. **Precisione Input Numerici / Sliders:** Aggiungere a tutti i campi numerici (`.slider-container` e `input[type="number"]`) due frecce verticali squadrate (`▲` e `▼`) per incrementare e decrementare i valori con tap singolo e pressione prolungata (press & hold).
2. **Posizionamento Mobile Logic Ribbon:** Uniformare la sidebar di Logic Ribbon su mobile portandola in basso sotto il canvas (colonna verticale), esattamente come nelle altre 5 applicazioni.
3. **Stile Tasto Torna a LAB:** Rimuovere lo stile ciano (`#00f2fe`) con angoli arrotondati dal link `← Skolptura Lab`, sostituendolo con un box di testo squadrato, con bordo netto e colore bianco coerente con l'identità del brand.
4. **Funzionamento Tasto "Sfondo Esteso":** Ripristinare e rendere pienamente operativo il pulsante "Sfondo Esteso" (`#immersive-preview-btn`) sia da desktop sia da mobile, rimuovendo le regole CSS che ne bloccavano l'effetto visivo (`!important` sul background e `display: none` per visitatori).

---

## 2. Dettaglio Tecnico dei Componenti

### 2.1 Frecce Stepper Verticali Squadrate (`▲` / `▼`)

- **Markup & Layout:**
  Accanto a ciascun valore numerico (`.slider-value`) all'interno di ogni `.slider-container`:
  ```html
  <div class="slider-container">
    <input type="range" id="targetN" min="10" max="100" value="50">
    <span class="slider-value" id="targetN-val">50</span>
    <div class="stepper-controls">
      <button type="button" class="stepper-btn stepper-up" aria-label="Aumenta">▲</button>
      <button type="button" class="stepper-btn stepper-down" aria-label="Diminuisci">▼</button>
    </div>
  </div>
  ```
- **Stile CSS (Brutalist / Dark):**
  - Contenitore `.stepper-controls`: `display: flex; flex-direction: column; gap: 1px; width: 22px; margin-left: 4px;`
  - Pulsanti `.stepper-btn`:
    - Forma rigorosamente squadrata: `border-radius: 0px;`
    - Altezza / Larghezza touch-friendly: `height: 14px; width: 22px; padding: 0;`
    - Colori: `background: #111111; color: #ffffff; border: 1px solid #333333; font-size: 8px; line-height: 1;`
    - Hover / Active: `background: #ffffff; color: #000000; border-color: #ffffff;`
- **Comportamento Interattivo (JavaScript):**
  - **Funzionamento nativo:** Chiama `input.stepUp()` e `input.stepDown()`, rispettando `min`, `max` e `step` (compresi i decimali).
  - **Aggiornamento real-time:** Genera e dispaccia l'evento `new Event('input', { bubbles: true })`, che attiva immediatamente i listener esistenti (`attachSlider`), aggiorna lo stato e ricalcola il canvas.
  - **Pressione prolungata (Autorepeat):** Supporto per `mousedown` e `touchstart`:
    - Dopo un ritardo iniziale di 300ms, avvia un intervallo di ripetizione ogni 60ms finché il pulsante è premuto (`mouseup`, `mouseleave`, `touchend`, `touchcancel`).
  - **Iniezione automatica e affidabile:** Un modulo/funzione `setupSteppers()` eseguito all'avvio su tutti i `.slider-container` e `input[type="number"]` senza bisogno di riscrivere a mano decine di blocchi HTML.

---

### 2.2 Logic Ribbon: GUI in Basso su Mobile

- **Diagnosi:** In `Skolptura_app/LOGIC RIBBON/web-app/src/style.css` mancavano le regole responsive `@media (max-width: 900px)` presenti nelle altre 5 app.
- **Implementazione:** Inserimento del blocco responsive allineato al 100%:
  ```css
  @media (max-width: 900px) {
    .app-container {
      flex-direction: column;
      overflow-y: auto;
    }
    
    .canvas-area {
      height: 60vh;
      min-height: 400px;
      flex: none;
    }
    
    .sidebar {
      width: 100%;
      height: auto;
      flex: 1;
      border-left: none;
      border-top: 1px solid var(--panel-border);
    }
    
    .accordion {
      max-height: 500px;
    }
  }
  ```

---

### 2.3 Tasto "← Skolptura Lab" Squadrato e Bianco

- **HTML (Tutte le 6 app):**
  Sostituzione dell'inline style:
  ```html
  <!-- Prima -->
  <a href="/lab" style="color: #00f2fe; text-decoration: none; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 4px; background: rgba(0, 242, 254, 0.08); border: 1px solid rgba(0, 242, 254, 0.25);">&larr; Skolptura Lab</a>

  <!-- Dopo -->
  <a href="/lab" class="hub-back-btn">&larr; Skolptura Lab</a>
  ```
- **CSS (`style.css`):**
  ```css
  .hub-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: #000000 !important;
    color: #ffffff !important;
    border: 1px solid #333333 !important;
    border-radius: 0px !important;
    font-family: 'Open Sans', system-ui, sans-serif !important;
    font-size: 11px !important;
    font-weight: 600 !important;
    letter-spacing: 0.06em !important;
    text-transform: uppercase !important;
    text-decoration: none !important;
    transition: all 0.2s ease !important;
  }
  .hub-back-btn:hover {
    background: #ffffff !important;
    color: #000000 !important;
    border-color: #ffffff !important;
  }
  ```

---

### 2.4 Risoluzione Funzionamento Tasto "Sfondo Esteso"

- **Diagnosi del bug:**
  1. In `style.css`, la regola `.canvas-area { background-color: #000000 !important; }` impediva a JavaScript di applicare il colore di sfondo della scena a `.canvas-area`.
  2. Nelle regole `:not(.admin-mode)` era presente `display: none !important;` su `.immersive-btn`, nascondendo il pulsante ai visitatori.
  3. In `CAPSULE`, l'event listener su `#immersive-preview-btn` non invocava `renderScene()`.
  4. In `LOGIC RIBBON`, il pulsante era posizionato a sinistra (`left: 20px`) anziché a destra (`right: 20px`) come nelle altre app.
- **Implementazione Soluzione:**
  1. In `style.css`:
     - Rimuovere `display: none !important;` da `.immersive-btn` per i non-admin, consentendo l'uso a tutti gli utenti su desktop e mobile.
     - Permettere a `.canvas-area` di ereditare il colore dinamico:
       ```css
       .canvas-area {
         background-color: var(--canvas-area-bg, #000000);
         transition: background-color 0.3s ease;
       }
       ```
     - Uniformare lo stile di `.immersive-btn`: box squadrato (`border-radius: 0px;`), font pulito, posizionamento coerente `top: 16px; right: 16px; z-index: 50;`.
  2. In `main.js` di tutte e 6 le app:
     - Aggiornare il listener di `#immersive-preview-btn`:
       ```javascript
       const immersiveBtn = document.getElementById('immersive-preview-btn');
       if (immersiveBtn) {
         immersiveBtn.addEventListener('click', () => {
           state.immersiveMode = !state.immersiveMode;
           immersiveBtn.classList.toggle('active', state.immersiveMode);
           document.body.classList.toggle('immersive-mode', state.immersiveMode);
           renderScene();
         });
       }
       ```
     - In `renderScene()` (o nella funzione di disegno dello sfondo):
       ```javascript
       const canvasArea = document.querySelector('.canvas-area');
       if (canvasArea) {
         if (state.immersiveMode) {
           canvasArea.style.setProperty('--canvas-area-bg', currentSceneData.backgroundColor);
           canvasArea.style.backgroundColor = currentSceneData.backgroundColor;
         } else {
           canvasArea.style.removeProperty('--canvas-area-bg');
           canvasArea.style.backgroundColor = '';
         }
       }
       ```

---

## 3. Piano di Verifica e Collaudo

1. **Verifica Stepper Numerici:**
   - In ciascuna delle 6 app, testare il click sui pulsanti `▲` e `▼` verificando l'incremento/decremento e l'aggiornamento immediato del canvas.
   - Testare la pressione prolungata (autorepeat) sia con mouse sia con touch mobile.
2. **Verifica Layout Mobile Logic Ribbon:**
   - Ridimensionare il viewport sotto i 900px o simulare iPhone/Android: la GUI deve posizionarsi sotto il canvas con scorrimento verticale naturale.
3. **Verifica Tasto Torna a LAB:**
   - In tutte e 6 le app, il pulsante `← Skolptura Lab` deve apparire bianco e nero, squadrato, senza alcuna sfumatura ciano.
4. **Verifica Sfondo Esteso:**
   - Cliccare su `👁 Sfondo Esteso` sia su desktop sia su mobile: lo sfondo dell'intera area circostante deve assumere istantaneamente il colore dello sfondo dell'opera, e ritornare nero al secondo click.
5. **Verifica Build di Produzione & Deploy:**
   - Compilazione Vite di tutte e 6 le app.
   - Sincronizzazione in `public/lab/`.
   - `npm run check && npm run build && npm run audit`.
   - Git push e deploy FTPS su Aruba.
