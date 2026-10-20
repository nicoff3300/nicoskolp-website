# Piano di Implementazione: Skolp Master Mode & Palette Manager

> **Goal:** Abilitare la modalità riservata (Admin Mode) per Nico Skolp tramite URL dedicato (`/lab?skolp=admin`) con persistenza, sbloccando tutti i download/export nelle 6 applicazioni e fornendo un pannello completo di creazione/modifica palette nell'Hub con sincronizzazione ibrida (server PHP Aruba + localStorage).

## Architettura & Flusso Dati

```mermaid
flowchart TD
    subgraph "Autenticazione Persistente"
        URL["Accesso con ?skolp=admin"] --> AuthModule["admin-auth.js: salva localStorage e Cookie"]
        AuthModule --> StateCheck{"isSkolpAdmin()?"}
    end

    subgraph "Hub /lab/"
        StateCheck -->|Sì| TopBar["Visualizza Topbar: ● SKOLP MASTER MODE [Esci]"]
        StateCheck -->|Sì| PalettePanel["Visualizza Pannello Gestione Palette"]
        StateCheck -->|No| VisitorHub["Hub Pubblico Pulito: Nessun controllo admin"]
        PalettePanel --> SaveActions["Salva Palette: POST /lab/api_palettes.php + localStorage"]
    end

    subgraph "Server Hosting Linux Aruba"
        SaveActions --> PHPAPI["public/lab/api_palettes.php"]
        PHPAPI --> Storage["public/lab/custom_palettes.json"]
    end

    subgraph "6 App Generative (/lab/brio/, /lab/capsule/, ecc.)"
        StateCheck -->|Sì (Nico)| AddAdminClass["body.classList.add('admin-mode') -> Export Sbloccati"]
        StateCheck -->|No (Visitatore)| HideExport["Export Nascosti via body:not(.admin-mode)"]
        LoadApp["Inizializzazione App"] --> FetchAPI["Fetch /lab/api_palettes.php || localStorage"]
        FetchAPI --> UpdateDropdown["Dropdown Preset Popolato con Skolp_01 + Nuove Palette"]
    end
```

---

## File Coinvolti

- **Crea:**
  - `public/lab/admin-auth.js` (modulo condiviso di autenticazione e barra di stato)
  - `public/lab/api_palettes.php` (endpoint backend PHP per salvataggio e lettura palette su Aruba)
  - `public/lab/custom_palettes.json` (storage persistente palette su server)
- **Modifica:**
  - `public/lab/index.html` (inserimento sezione gestione palette riservata e integrazione admin-auth)
  - `Skolptura_app/*/web-app/src/style.css` (regola CSS `body:not(.admin-mode)` per esportazioni)
  - `Skolptura_app/*/web-app/src/main.js` (attivazione `admin-mode` su body e fetch palette dinamiche da `/lab/api_palettes.php`)
  - `Skolptura_app/*/web-app/index.html` (inclusione script `admin-auth.js`)
- **Compila & Sincronizza:**
  - `public/lab/brio/*`
  - `public/lab/capsule/*`
  - `public/lab/doomeno/*`
  - `public/lab/gridshape/*`
  - `public/lab/letshift/*`
  - `public/lab/logic-ribbon/*`

---

## Task 1: Modulo di Autenticazione Condiviso (`public/lab/admin-auth.js`)

**Obiettivo:** Rilevare il parametro segreto nell'URL, memorizzare la sessione in modo persistente in `localStorage` e Cookie, e mostrare la barra di stato Admin Mode con pulsante `[Esci]`.

- Step 1: Crea `public/lab/admin-auth.js` con:
  - Rilevamento `?skolp=admin` o `&skolp=admin` nella query string.
  - Salvataggio in `localStorage.setItem('skolp_admin_mode', 'true')` e cookie `skolp_admin=1; path=/; max-age=31536000; SameSite=Lax`.
  - Pulizia della query string con `window.history.replaceState`.
  - Funzione `isSkolpAdmin()` che verifica localStorage o cookie.
  - Funzione `disableSkolpAdmin()` che rimuove la chiave da localStorage, azzera il cookie e ricarica la pagina.
  - Inserimento automatico della barra di stato `● SKOLP MASTER MODE [Esci]` con stile dark, bordo bianco e pulsante di logout.
  - Se `isSkolpAdmin() === true`, aggiunta automatica della classe `admin-mode` al `document.body` e al `document.documentElement`.

---

## Task 2: Backend PHP per Sincronizzazione Palette (`public/lab/api_palettes.php`)

**Obiettivo:** Fornire un'API REST su hosting Linux Aruba per memorizzare e leggere le palette in modo permanente e multi-dispositivo.

- Step 1: Crea `public/lab/api_palettes.php`:
  - `GET`:
    - Legge `custom_palettes.json` se esiste.
    - Se non esiste, restituisce la palette predefinita `{"Skolp_01": ["#1d1d1d", "#ec5555", "#e189d9", "#6c8cd5", "#39c6a3", "#d4f070", "#fff2e0"]}`.
    - Header `Content-Type: application/json; charset=utf-8`.
  - `POST`:
    - Controllo autorizzazione: verifica presenza di cookie `skolp_admin=1` o header `X-Skolp-Admin: 1` o parametro token.
    - Lettura payload JSON da `php://input`.
    - Validazione struttura (deve essere un oggetto di array di stringhe esadecimali).
    - Assicura che `Skolp_01` sia sempre presente come prima palette.
    - Scrittura sicura su `custom_palettes.json` con `file_put_contents(..., LOCK_EX)`.
    - Risposta JSON: `{"success": true, "palettes": ...}`.
- Step 2: Crea il file iniziale `public/lab/custom_palettes.json`.

---

## Task 3: Aggiornamento CSS Condiviso delle 6 App (`style.css`)

**Obiettivo:** Trasformare la regola di soppressione export in una regola condizionale legata all'assenza della classe `.admin-mode`.

- Step 1: In ciascun `Skolptura_app/<APP>/web-app/src/style.css`, modifica la regola:
  ```css
  /* Modalità Visitatori: export e download nascosti */
  body:not(.admin-mode) .sidebar-footer,
  body:not(.admin-mode) .export-section,
  body:not(.admin-mode) .export-grid,
  body:not(.admin-mode) .export-video-container,
  body:not(.admin-mode) .export-batch-container,
  body:not(.admin-mode) #export-png-btn,
  body:not(.admin-mode) #export-svg-btn,
  body:not(.admin-mode) #export-json-btn,
  body:not(.admin-mode) #export-video-btn,
  body:not(.admin-mode) #export-batch-btn,
  body:not(.admin-mode) #export-batch-random-btn,
  body:not(.admin-mode) button[id*="export"],
  body:not(.admin-mode) div[class*="export"] {
    display: none !important;
  }
  ```
- Step 2: Quando `body.admin-mode` è attivo, i bottoni di esportazione tornano visibili in perfetto tema nero con bordo bianco (`Druk Text Wide`, hover invertito).

---

## Task 4: Aggiornamento `main.js` delle 6 App per Caricamento Dinamico Palette

**Obiettivo:** Consentire alle 6 app di caricare all'avvio sia la palette predefinita sia tutte le nuove palette salvate da Nico nell'Hub.

- Step 1: In ciascun `main.js` di `BRIO`, `CAPSULE`, `DOOMENO`, `GRIDSHAPE`, `LETSHIFT`, `LOGIC RIBBON`:
  - All'avvio, esegui una funzione asincrona `syncPalettesWithServer()`:
    - Recupera le palette da `/lab/api_palettes.php` (con fallback su `localStorage.getItem('skolp_master_palettes')`).
    - Se l'utente è in Admin Mode: unisce tutte le palette aggiuntive a `PALETTES`.
    - Richiama `populatePaletteSelect()` per popolare il menu a tendina con `Skolp_01` e tutte le palette custom.
  - Verifica della classe `admin-mode`:
    - Se `localStorage.getItem('skolp_admin_mode') === 'true'`, aggiunge `document.body.classList.add('admin-mode')`.
- Step 2: Negli `index.html` delle 6 app, includi `<script src="/lab/admin-auth.js"></script>`.

---

## Task 5: Interfaccia di Gestione Palette nell'Hub (`public/lab/index.html`)

**Obiettivo:** Aggiungere all'Hub (`/lab/`) il pannello interattivo per la creazione, modifica e sincronizzazione delle palette colori, visibile esclusivamente all'utente Admin.

- Step 1: Includi `<script src="/lab/admin-auth.js"></script>` nell'header dell'Hub.
- Step 2: Inserisci nel body la sezione `#admin-palette-section` (nascosta di default, mostrata solo se `isSkolpAdmin()` è true):
  - Intestazione con titolo `Gestione Palette Riservata (Master Mode)` in font `Druk Text Wide`.
  - Barra strumenti:
    - Pulsante `+ Nuova Palette`
    - Pulsante `💾 Salva & Sincronizza su Server`
    - Pulsante `⬇ Esporta JSON`
    - Pulsante `⬆ Importa JSON`
  - Griglia delle card palette:
    - Campo nome palette.
    - Swatch interattivi con input colore nativo e hex label.
    - Tasto `×` per rimuovere colore.
    - Tasto `+` per aggiungere colore.
    - Tasto `🗑` per eliminare la palette (con protezione per `Skolp_01`).
- Step 3: Implementa la logica JavaScript in `public/lab/index.html`:
  - Carica le palette da `/lab/api_palettes.php` (con fallback su `localStorage`).
  - Gestione aggiunta/modifica/eliminazione reattiva.
  - Al click su `Salva & Sincronizza`:
    - Esegue `POST /lab/api_palettes.php`.
    - Salva in `localStorage.setItem('skolp_master_palettes', JSON.stringify(...))`.
    - Mostra notifica toast "Palette salvate e sincronizzate con successo!".

---

## Task 6: Compilazione, Validazione Finale e Deploy

- Step 1: Ricompila tutte le 6 applicazioni con Vite (`npx vite build --base=./`) e copia i file di build aggiornati in `public/lab/<app>/`.
- Step 2: Esegui la suite locale:
  ```bash
  npm run test:data && npm run check && npm run build && npm run audit
  ```
- Step 3: Commit e push su `origin main`:
  ```bash
  git add public/lab/ Skolptura_app/ docs/
  git commit -m "feat(lab): implementazione Skolp Master Mode, sblocco export riservato e palette manager sincronizzato"
  git push origin main
  ```
- Step 4: Monitora il deploy su GitHub Actions (`gh run watch`) e verifica online con test HTTP su `https://www.nicoskolp.com/lab/` e `https://www.nicoskolp.com/lab/?skolp=admin`.
