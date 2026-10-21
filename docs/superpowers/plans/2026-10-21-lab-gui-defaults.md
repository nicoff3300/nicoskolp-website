# Piano di Implementazione: Chiusura GUI di Default & Sfondo Manuale Disattivato

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configurare per tutte e 6 le applicazioni di Skolptura Lab la chiusura di default di tutti i gruppi della GUI (accordion) all'avvio e disattivare la spunta sullo sfondo manuale (`useManualBg: false`).

**Architecture:** Modifica degli attributi nei file `index.html` delle 6 app (rimozione di `open` dai tag `<details class="accordion-item">` e rimozione di `checked` dal checkbox `#useManualBg`) e impostazione di `useManualBg: false` nello stato iniziale in `src/main.js`. Ricompilazione dei bundle di produzione con Vite e deploy automatico su hosting Aruba.

**Tech Stack:** HTML5 Details/Summary, JavaScript ES Modules, Vite, Astro, GitHub Actions (FTPS Aruba).

## Global Constraints
- Tutte le comunicazioni e la documentazione devono essere rigorosamente in lingua italiana.
- Nessuna alterazione al funzionamento interattivo degli accordion (devono continuare ad aprirsi e chiudersi normalmente al click).
- Nessuna regressione sui parametri procedurali o sulle logiche di render di PixiJS.
- La build e l'audit finale devono completarsi con 0 errori prima del deploy.

---

### Task 1: Chiusura di Default di tutte le Sezioni Accordion in tutte le 6 App

**Files:**
- Modify: `Skolptura_app/BRIO/web-app/index.html`
- Modify: `Skolptura_app/CAPSULE/web-app/index.html`
- Modify: `Skolptura_app/DOOMENO/web-app/index.html`
- Modify: `Skolptura_app/GRIDSHAPE/web-app/index.html`
- Modify: `Skolptura_app/LETSHIFT/web-app/index.html`
- Modify: `Skolptura_app/LOGIC RIBBON/web-app/index.html`

- [ ] **Step 1: Sostituire `<details class="accordion-item" open>` con `<details class="accordion-item">` in tutte e 6 le app**
- [ ] **Step 2: Verificare tramite `grep -rn "<details" Skolptura_app/*/web-app/index.html` che nessun tag `<details>` abbia l'attributo `open`**
- [ ] **Step 3: Commit delle modifiche HTML**
```bash
git add Skolptura_app/*/web-app/index.html
git commit -m "feat(lab): chiusura di default di tutte le finestre accordion della GUI"
```

---

### Task 2: Disattivazione dello Sfondo Manuale di Default in HTML e JS

**Files:**
- Modify: `Skolptura_app/BRIO/web-app/index.html` (rimuovere `checked` da `#useManualBg`)
- Modify: `Skolptura_app/GRIDSHAPE/web-app/index.html` (rimuovere `checked` da `#useManualBg`)
- Modify: `Skolptura_app/GRIDSHAPE/web-app/src/main.js` (impostare `useManualBg: false`)
- Modify: `Skolptura_app/LOGIC RIBBON/web-app/index.html` (rimuovere `checked` da `#useManualBg`)
- Modify: `Skolptura_app/LOGIC RIBBON/web-app/src/main.js` (impostare `useManualBg: false`)

- [ ] **Step 1: Rimuovere l'attributo `checked` dall'input `#useManualBg` in BRIO, GRIDSHAPE e LOGIC RIBBON**
- [ ] **Step 2: Impostare `useManualBg: false` nello stato iniziale di GRIDSHAPE e LOGIC RIBBON `main.js`**
- [ ] **Step 3: Verificare che in tutte le 6 app `useManualBg` sia `false` nello stato e non spuntato nell'HTML**
- [ ] **Step 4: Commit delle modifiche**
```bash
git add Skolptura_app/*/web-app/index.html Skolptura_app/*/web-app/src/main.js
git commit -m "feat(lab): disattivazione spunta sfondo manuale di default in tutte le app"
```

---

### Task 3: Compilazione Vite di tutte e 6 le App, Build Astro, Audit e Deploy Aruba

**Files:**
- Update: `public/lab/brio/*`
- Update: `public/lab/capsule/*`
- Update: `public/lab/doomeno/*`
- Update: `public/lab/gridshape/*`
- Update: `public/lab/letshift/*`
- Update: `public/lab/logic-ribbon/*`

- [ ] **Step 1: Esegui build Vite per tutte e 6 le app**
```bash
npm --prefix "Skolptura_app/BRIO/web-app" run build
npm --prefix "Skolptura_app/CAPSULE/web-app" run build
npm --prefix "Skolptura_app/DOOMENO/web-app" run build
npm --prefix "Skolptura_app/GRIDSHAPE/web-app" run build
npm --prefix "Skolptura_app/LETSHIFT/web-app" run build
npm --prefix "Skolptura_app/LOGIC RIBBON/web-app" run build
```

- [ ] **Step 2: Sincronizza i file `dist/*` in `public/lab/*/`**
- [ ] **Step 3: Esegui `npm run check && npm run build && npm run audit`**
- [ ] **Step 4: Commit e push su `main` per avviare il deploy FTPS su Aruba**
```bash
git add public/lab/
git commit -m "feat(lab): build di produzione con GUI chiusa e sfondo manuale off di default"
git push origin main
```
- [ ] **Step 5: Monitora il deploy con `gh run list -L 1`**
