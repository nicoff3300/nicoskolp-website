# Specifiche Tecniche: Skolp Master Mode & Palette Manager

**Data:** 2026-10-20  
**Autore:** Antigravity & Nico Skolp  
**Stato:** Approvato dall'utente  

---

## 1. Obiettivi & Visione d'Insieme

Fornire a Nico Skolp una **modalità riservata (Admin / Master Mode)** accessibile solo a lui tramite URL dedicato con memorizzazione persistente, che consenta:
1. **Sblocco Completo dei Download / Export:** Nelle 6 applicazioni generative (`brio`, `capsule`, `doomeno`, `gridshape`, `letshift`, `logic-ribbon`), riattivazione visiva e funzionale di tutti i formati di output (PNG alta risoluzione, SVG vettoriale, JSON configurazione, Video loop MP4, Batch export). Per i visitatori comuni, tutti questi controlli rimangono completamente invisibili e inaccessibili.
2. **Pannello di Gestione Palette Dedicato nell'Hub (`/lab/`):** In modalità riservata, compare nell'Hub un'interfaccia interattiva dark/minimalista dove Nico può creare nuove palette, modificare colori tramite color picker nativo e codici HEX, rinominare o eliminare palette e salvarle.
3. **Sincronizzazione Ibrida (Server PHP Aruba + localStorage):**
   - Un endpoint PHP sicuro `public/lab/api_palettes.php` salva le palette su file persistente sul server hosting Linux Aruba.
   - `localStorage` mantiene una copia locale immediata (0 ms di latenza e funzionamento offline).
   - All'apertura di qualsiasi delle 6 app, le palette salvate nell'Hub vengono caricate e rese selezionabili nel menu dei preset cromatici.

---

## 2. Architettura del Sistema

```mermaid
flowchart TD
    subgraph "Attivazione & Sessione"
        URL["Accesso a /lab?skolp=admin"] --> Auth["Rilevamento Query Param"]
        Auth --> StoreLocal["Salvataggio in localStorage: skolp_admin_mode=true"]
        Auth --> StoreCookie["Salvataggio Cookie: skolp_admin=1 (path=/; 1 anno)"]
        StoreLocal --> AdminActive{"Admin Mode Attiva?"}
    end

    subgraph "Hub /lab/"
        AdminActive -->|Sì| ShowAdminBar["Mostra Topbar: ● SKOLP MASTER MODE [Esci]"]
        AdminActive -->|Sì| ShowPaletteManager["Mostra Sezione Gestione Palette"]
        AdminActive -->|No (Visitatore)| HideAdminFeatures["Hub pulito: Palette hidate, nessun controllo admin"]
        ShowPaletteManager --> SavePalettes["Salvataggio: POST /lab/api_palettes.php + localStorage"]
    end

    subgraph "Backend Aruba"
        SavePalettes --> PHP["public/lab/api_palettes.php"]
        PHP --> JSONStorage["public/lab/custom_palettes.json"]
    end

    subgraph "6 Web-App Generative"
        AdminActive -->|Sì (Nico)| UnlockExport["Body class: admin-mode -> Rimuove display:none dagli Export"]
        AdminActive -->|No (Visitatore)| KeepExportHidden["Export rimangono invisibili e disabilitati"]
        AppLoad["Avvio App"] --> FetchPalettes["Fetch da /lab/api_palettes.php || localStorage"]
        FetchPalettes --> PopulateDropdown["Popolamento Dropdown Preset Palette"]
    end
```

---

## 3. Specifiche di Dettaglio

### 3.1. Meccanismo di Autenticazione & Persistenza
- **Attivazione:** Se l'URL contiene `?skolp=admin` (o `&skolp=admin`), il codice JS registra:
  - `localStorage.setItem('skolp_admin_mode', 'true')`
  - `document.cookie = "skolp_admin=1; path=/; max-age=31536000; SameSite=Lax"`
  - Pulisce l'URL tramite `history.replaceState` per non lasciare la query string visibile nella cronologia browser.
- **Riconoscimento:** Uno script leggero `admin-auth.js` incluso in `Header`, `Hub` e nelle `App` controlla all'avvio se `localStorage.getItem('skolp_admin_mode') === 'true'` o se è presente il cookie `skolp_admin=1`.
- **Disattivazione:** Cliccando sul pulsante `[Esci]` della barra di stato admin:
  - Rimuove la chiave da `localStorage`
  - Cancella il cookie
  - Ricarica la pagina in modalità visitatore comune.

### 3.2. Sblocco dei Download / Export nelle 6 App
- Nelle 6 app, il CSS contiene la regola per visitatori:
  ```css
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
  body:not(.admin-mode) #export-batch-random-btn {
    display: none !important;
  }
  ```
- Quando `skolp_admin_mode === 'true'`, lo script aggiunge la classe `admin-mode` al tag `<body>`.
- Tutti i controlli di esportazione originali ritornano visibili e perfettamente funzionanti con lo stile dark geometrico.

### 3.3. Backend PHP per le Palette su Aruba (`public/lab/api_palettes.php`)
- Script PHP leggero, sicuro e compatibile con l'hosting Linux di Aruba:
  - **`GET /lab/api_palettes.php`**: Restituisce il contenuto di `custom_palettes.json` se esiste, oppure un fallback con `Skolp_01`.
  - **`POST /lab/api_palettes.php`**: Verifica che la richiesta sia autorizzata (cookie `skolp_admin=1` o header `X-Skolp-Admin: 1`), valida il JSON ricevuto (struttura `{ "NomePalette": ["#hex", ...] }`) e lo salva su disco nel file `public/lab/custom_palettes.json`.

### 3.4. Interfaccia di Gestione Palette nell'Hub (`/lab/`)
- Inserita nel DOM di `public/lab/index.html` all'interno di un container `#admin-palette-manager-section` con `display: none`.
- Si attiva visivamente solo quando l'Admin Mode è attiva.
- Caratteristiche UI:
  - Stile allineato al brand: sfondo `#080808`, bordi netti `#222222`, font `Druk Text Wide` per i titoli, `Open Sans` per le label.
  - Elenco card delle palette:
    - Input per rinominare la palette.
    - Swatch interattivi con anteprima visiva colore e color picker `<input type="color">`.
    - Pulsante `×` su ciascun colore per rimuoverlo (minimo 2 colori).
    - Pulsante `+` per aggiungere un nuovo colore.
    - Pulsante `🗑` per eliminare la palette (la palette `Skolp_01` rimane protetta come predefinita).
  - Barra azioni superiori:
    - `+ Nuova Palette`: crea una nuova palette con colori personalizzabili.
    - `💾 Salva & Sincronizza`: salva su server via PHP e in `localStorage`, mostrando una notifica toast.
    - `⬇ Esporta Backup`: scarica il file JSON con tutte le palette create.
    - `⬆ Importa JSON`: consente di caricare un file JSON di palette.

### 3.5. Integrazione nelle 6 Web-App Generative
- Ciascuna applicazione (`brio`, `capsule`, `doomeno`, `gridshape`, `letshift`, `logic-ribbon`), in fase di inizializzazione:
  1. Carica le palette predefinite (`Skolp_01`).
  2. Esegue una chiamata asincrona `fetch('/lab/api_palettes.php')` (con fallback su `localStorage.getItem('skolp_master_palettes')`).
  3. Se ci sono palette aggiuntive salvate da Nico, le aggiunge al set disponibile e aggiorna il menu a tendina `palettePresetSelect`.
  4. L'utente admin può selezionare qualsiasi palette creata, vederla renderizzata istantaneamente in canvas WebGL e randomizzarla.

---

## 4. Verifica e Collaudo
1. Verifica locale con `npm run check`, `npm run build` e `npm run audit`.
2. Test accesso visitatore anonimo su `http://localhost:4321/lab/`:
   - Nessun badge admin visibile.
   - Nessuna sezione gestione palette visibile.
   - Nelle app, nessun bottone export visibile; solo palette `Skolp_01`.
3. Test accesso riservato su `http://localhost:4321/lab/?skolp=admin`:
   - Compare la topbar `● SKOLP MASTER MODE [Esci]`.
   - Compare il pannello "Gestione Palette Riservata".
   - Creazione e salvataggio di una nuova palette `Skolp_02`.
   - Apertura di `/lab/brio/`: compaiono tutti i pulsanti di download (PNG, SVG, Video, Batch) e nel menu preset c'è la nuova palette `Skolp_02` funzionante.
