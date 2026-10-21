# Specifiche Tecniche: Chiusura GUI di Default & Sfondo Manuale Disattivato

**Data:** 2026-10-21  
**Autore:** Antigravity & Nico Skolp  
**Stato:** In attesa di approvazione utente  

---

## 1. Obiettivo
1. **Chiusura finestre GUI di default:** In tutte e 6 le applicazioni del LAB (`BRIO`, `CAPSULE`, `DOOMENO`, `GRIDSHAPE`, `LETSHIFT`, `LOGIC RIBBON`), chiudere tutte le sezioni comprimibili della sidebar (`<details class="accordion-item">`) all'avvio, rimuovendo l'attributo `open`. L'utente potrà aprire con un click solo la sezione che gli interessa.
2. **Sfondo manuale disattivato di default:** Rimuovere la spunta predefinita su "Sfondo Manuale" (`useManualBg: false` e checkbox non spuntata) in tutte le app (in particolare `BRIO`, `GRIDSHAPE` e `LOGIC RIBBON` dove era attiva), così che all'avvio lo sfondo sia sempre determinato armonicamente dalla palette cromatica generativa attiva.

---

## 2. Modifiche Dettagliate

### 2.1. File HTML (`index.html`)
In tutti i file:
- `Skolptura_app/BRIO/web-app/index.html`
- `Skolptura_app/CAPSULE/web-app/index.html`
- `Skolptura_app/DOOMENO/web-app/index.html`
- `Skolptura_app/GRIDSHAPE/web-app/index.html`
- `Skolptura_app/LETSHIFT/web-app/index.html`
- `Skolptura_app/LOGIC RIBBON/web-app/index.html`
1. Sostituire `<details class="accordion-item" open>` con `<details class="accordion-item">` (tutte le sezioni chiuse all'avvio).
2. Nei form dove è presente `<input type="checkbox" id="useManualBg" checked>`, rimuovere `checked` (diventa `<input type="checkbox" id="useManualBg">`).

### 2.2. File JavaScript (`src/main.js`)
- `Skolptura_app/GRIDSHAPE/web-app/src/main.js`: impostare `useManualBg: false` nello stato iniziale.
- `Skolptura_app/LOGIC RIBBON/web-app/src/main.js`: impostare `useManualBg: false` nello stato iniziale.
- `Skolptura_app/BRIO/web-app/src/main.js`: verificare che lo stato iniziale sia `useManualBg: false`.

### 2.3. Build & Deploy
- Rebuild Vite per tutte e 6 le app.
- Sincronizzazione in `public/lab/*/`.
- Verifica con `npm run check && npm run build && npm run audit`.
- Deploy automatico via Git & FTPS su hosting Aruba.
