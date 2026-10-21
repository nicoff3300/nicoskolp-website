# Piano di Implementazione: Split Screen Mobile (Canvas Fisso 1:1 in Alto, GUI Scrollabile in Basso)

**Data:** 2026-10-21  
**Stato:** In corso  
**Autore:** Antigravity  

---

## 1. Obiettivi e Requisiti

- **Suddivisione dello schermo in due sezioni su Mobile (`@media (max-width: 900px)`):**
  1. **Sezione Superiore (Canvas):**
     - Fissa in alto (`flex: 0 0 auto`), non scorre quando si interagisce con i parametri della GUI.
     - Dimensione e proporzione `1:1` (quadrata), con `width: min(100vw, 50dvh); height: min(100vw, 50dvh); aspect-ratio: 1 / 1;`, perfettamente centrata con sfondo armonizzato.
     - PixiJS rileva la dimensione tramite `ResizeObserver` e adatta il rendering all'area 1:1.
  2. **Sezione Inferiore (GUI):**
     - Occupa l'altra metà dello schermo (`flex: 1 1 0%; min-height: 0;`).
     - Scrollabile internamente in modo indipendente con inerzia touch (`overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior-y: contain;`).
     - Tutti i blocchi accordion si espandono per intero (`max-height: none`), con margine di sicurezza inferiore per la safe area e le barre del browser.

---

## 2. Fasi dei Task

### Task 1: Stili CSS Responsive
- Aggiornare `@media (max-width: 900px)` in tutte e 6 le app:
  - `Skolptura_app/BRIO/web-app/src/style.css`
  - `Skolptura_app/CAPSULE/web-app/src/style.css`
  - `Skolptura_app/DOOMENO/web-app/src/style.css`
  - `Skolptura_app/GRIDSHAPE/web-app/src/style.css`
  - `Skolptura_app/LETSHIFT/web-app/src/style.css`
  - `Skolptura_app/LOGIC RIBBON/web-app/src/style.css`

### Task 2: Build Vite e Sincronizzazione in `public/lab/`
- Ricompilare le 6 app con `npm run build` e copiare gli asset in `public/lab/`.

### Task 3: Controlli Astro e Deploy FTPS su Aruba
- Eseguire `npm run check && npm run build && npm run audit`.
- Commit e push su `main`.
- Monitorare il deploy FTPS su Aruba fino a completamento con verifica HTTP live.
