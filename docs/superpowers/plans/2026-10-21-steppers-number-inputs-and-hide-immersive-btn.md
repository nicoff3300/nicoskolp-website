# Piano di Implementazione: Frecce Stepper su Campi Numerici & Rimozione Tasto Sfondo Esteso in Versione Pubblica

**Data:** 2026-10-21  
**Stato:** In corso  
**Autore:** Antigravity  

---

## 1. Obiettivi e Requisiti

1. **Rimozione Frecce dagli Slider (`input[type="range"]`):**
   - Gli slider devono rimanere puliti con solo la barra di scorrimento orizzontale e il valore visualizzato. Le frecce stepper `▲` / `▼` non devono più essere applicate a `.slider-container`.
2. **Aggiunta Frecce ai Campi di Valori Numerici (`input[type="number"]`):**
   - Tutti i campi in cui si inseriscono valori numerici (in particolare da mobile, come ad esempio *"Colonne Macro (Min-Max)"*, *"Righe Macro (Min-Max)"*, *"Numero Blocchi Base"*, *"Spessore/Lunghezza"*, *"Capsule Count"*, *"Batch Count"*, ecc.) devono avere due frecce squadrate (`▲` per incrementare, `▼` per decrementare).
   - I controlli devono supportare sia il tap singolo che la pressione prolungata (autorepeat), aggiornando istantaneamente il valore ed emettendo gli eventi `input` e `change` per sincronizzare la generazione della scena.
   - Su mobile (`@media (max-width: 900px)`), i pulsanti devono avere dimensioni confortevoli per il tocco.
3. **Pulsante Sfondo Esteso (`.immersive-btn`):**
   - Nella versione pubblica (utenti non loggati come admin), il canvas occupa già il 100% dell'area disponibile; pertanto il pulsante non serve e deve essere nascosto (`body:not(.admin-mode) .immersive-btn { display: none !important; }`).
   - Rimane invece disponibile per gli amministratori in modalità Master (`admin-mode`).

---

## 2. Piani dei Task

### Task 1: Stili CSS (`Skolptura_app/*/web-app/src/style.css`)
- In ciascuna delle 6 app:
  1. Ripristinare `.slider-container` pulito senza frecce.
  2. Aggiungere le classi `.number-stepper-wrap`, `.number-stepper-wrap input[type="number"]`, `.number-stepper-wrap .stepper-controls`, `.number-stepper-wrap .stepper-btn` (stile brutalist squadrato, nero/bianco).
  3. Nascondere le frecce native del browser (`-webkit-inner-spin-button`, `-moz-appearance: textfield`).
  4. Ottimizzazione mobile a max-width 900px.
  5. Aggiungere `body:not(.admin-mode) .immersive-btn, html:not(.admin-mode) .immersive-btn { display: none !important; }`.

### Task 2: Logica JavaScript (`Skolptura_app/*/web-app/src/main.js`)
- In ciascuna delle 6 app:
  1. Sostituire `setupSteppers()` con la nuova funzione `setupNumberSteppers()`.
  2. Individuare tutti gli elementi `input[type="number"]`.
  3. Incapsularli in `.number-stepper-wrap` preservando flex, dimensioni e layout originale (es. righe a 2 colonne affiancate).
  4. Agganciare i bottoni `▲` (up) e `▼` (down) con autorepeat su mouse e touch, inviando `input` e `change`.

### Task 3: Build Vite, Sync `public/lab/`, Check Astro & Deploy
1. Eseguire `npm run build` per le 6 app in `Skolptura_app/`.
2. Sincronizzare i file compilati in `public/lab/`.
3. Verificare `npm run check`, `npm run build`, `npm run audit`.
4. Effettuare commit e push su GitHub `main`.
5. Monitorare il deploy FTPS su Aruba fino al completamento con successo.
