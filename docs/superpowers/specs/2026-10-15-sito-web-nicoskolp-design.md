# Specifiche di Progetto: Ricostruzione Sito Web Nico Skolp

- **Data:** 2026-10-15
- **Autore:** Antigravity & Nico Skolp
- **Riferimento Originale:** `https://nicoskolp.wixsite.com/nicoskolp/it`
- **Destinazione Hosting:** Aruba (Hosting Linux con supporto PHP / HTML statico) + Repository GitHub

---

## 1. Obiettivi e Filosofia del Progetto

Il progetto ha l'obiettivo di ricostruire fedelmente l'intero sito web personale e portfolio dell'artista e muralista **Nico Skolp**, replicando con precisione la struttura, la navigazione, la palette cromatica e lo stile tipografico del sito originale precedentemente ospitato su Wix, eliminando completamente la pesantezza e i tempi di caricamento della piattaforma di origine.

### Requisiti Chiave
1. **Fedeltà Visiva e Strutturale al 100%**: Layout, proporzioni, allineamenti, gerarchia visiva e comportamento dei menu identici a Wix.
2. **Massime Prestazioni (Core Web Vitals)**: Caricamento istantaneo (95-100/100 su Google Lighthouse), zero bloatware JS, lazy-loading delle immagini in formati moderni.
3. **Architettura Statica Indipendente (SSG)**: Generazione di puro codice HTML5/CSS3/JS per deploy su spazio web Aruba senza necessità di server Node.js.
4. **Facilità di Manutenzione**: Separazione chiara tra logica dei componenti di visualizzazione e dati delle opere (catalogati in file JSON/Markdown puliti e facilmente aggiornabili).
5. **Integrazione Git & GitHub**: Versionamento pulito del codice sorgente e predisposizione per workflow di Continuous Deployment (GitHub Actions -> Aruba via FTP/SFTP).

---

## 2. Analisi e Mappatura Completa del Sito Wix

Dall'analisi di reverse-engineering condotta su `https://nicoskolp.wixsite.com/nicoskolp/it` e dai dati estratti da Thunderbolt/Wix Pro Gallery, è emersa la seguente struttura:

### 2.1 Tipografia & Design System
- **Font Display / Titoli**: `Druk Text Wide` (Medium / Bold) — utilizzato per i titoli delle sezioni, le voci di menu e i bottoni principali.
- **Font Testo / Body**: `Open Sans` (Regular, Semi-bold, Bold) — utilizzato per paragrafi, didascalie e dettagli biografici.
- **Colori Principali**:
  - Sfondo primario: `#FFFFFF`
  - Colore testo principale: `#000000` / `#292929`
  - Colore testo secondario: `#8F8F8F` / `#757575`
  - Accenti grafici e bordi: `#E2E2E2`
  - Pulsanti / Hover: Sottolineatura netta tipografica su hover

### 2.2 Pagine e Struttura di Navigazione
- **Header Globale**:
  - Logo Nico Skolp (link a `/`)
  - Navigazione:
    - `Public Art` (`/public-art`)
    - `About me` (`/about-me`)
    - `Graffiti` (`/graffiti`)
  - Social Links:
    - Instagram: `https://instagram.com/nicoskolp`
    - Behance: `https://www.behance.net/nicoff3300`
  - Menu responsive drawer per mobile

- **Home (`/`)**:
  - Hero typographic section:
    - *"A contemporary art project about muralism."*
    - *"Get face with your imagination."*
    - CTA Button: *"Buy NFTS"* (collegato a `/digitalart`)
  - Vetrina opere selezionate (13 opere principali con visualizzazione gallery)
  - Sezione Contatto:
    - Titolo: *"Scrivimi per maggiori informazioni"*
    - Campi form: Nome, Cognome, Email, Oggetto, Messaggio
    - Bottone: *"Invia"* con messaggio di avvenuta ricezione *"Il tuo modulo è stato inviato!"*

- **Public Art (`/public-art`)**:
  - Titolo: *"Public Art"*
  - Sottotitolo: *"Here, my Urban Art Porfolio. Shape and colors make me fill better."*
  - Griglia Masonry con 22 murales/progetti:
    1. Teatroaquilone (`/teatro-aquilone`)
    2. Museo Quartiere San Paolo (`/sanpaolo`)
    3. T.R.U.S.T Festival Taranto (`/trust-taranto`)
    4. Rore Festival Rovigo (`/rore-festival-rovigo`)
    5. Basketcourt Matera (`/skolp-basketball-court-matera-2019`)
    6. Graffiti Gallery / Factory (`/graffiti-factory`)
    7. Steps Molise (`/skolp-steps-molise`)
    8. Concrete Crack Matera (`/matera-basket`)
    9. Play Hard Matera (`/matera-piazza`)
    10. Mottola (`/mottola`)
    11. Ecopoli (`/ecopoli`)
    12. Expost (`/expost-moderno`)
    13. Umberto Eco Tribute
    14. ExFadda (`/ex-fadda`)
    15. Matera's Stone (`/matera-alter`)
    16. Verso Sud Festival
    17. Bar Project
    18. Splash
    19. Binario 18 Roma (`/roma-binario18`)
    20. Tempelhof
    21. Untitled
    22. Berlin Pipe (`/berlin-klub7`)

- **Graffiti (`/graffiti`)**:
  - Titolo: *"Hall of Fame selection."*
  - Sottotitolo: *"The 5 letters that boost my style."*
  - Griglia fotografica di 25 pareti storiche (Bari, Mainz, Torino, Amburgo, Matera, ecc.)
  - Funzione Lightbox a schermo intero con navigazione avanti/indietro tra le opere.

- **About me (`/about-me`)**:
  - Biografia formattata:
    - *"Nico Skolp is born in the south of Italy, he started painting graffiti since ’97 in his early teens. He has always preferred painting in public spaces, where he finds his best expression."*
    - *"His murals blend shapes and colours into elaborate abstractions, in balance with the surrounding context/background, offering a different visual experience each time."*
    - *"He has painted various outdoor murals and graffiti in several cities around the Europe. When he is not painting, he works in Bari at FF3300 a visual arts and design studio he co-founded in 2006."*
    - *"Since one of his best mottos has became 'works are better when shared', in the last few years he has been painting in team with other artists."*
    - *"Collaboration welcomed"*

- **Pagine di Dettaglio Progetti**:
  - Pagine dedicate per ciascun murale (foto principale, foto di backstage/dettagli, scheda tecnica, location, anno).
  - Serie tele e produzioni: *STRATIFORME 01, 02, 03, 04, 05*.
  - *Digital Art* (`/digitalart`): opere digitali e NFT.
  - *Archivio* (`/skolp-archive`): archivio storico di graffiti dal 1999 al 2019+.

- **Footer Globale**:
  - Sezione Social: *"seguimi su:"* (Instagram, Behance)
  - Copyright: *"2020 – Nico Skolp"* (aggiornabile dinamicamente all'anno corrente)
  - Link Archivio: *"Guarda qui il mio ARCHIVIO"*
  - Crediti: *"design by: FF3300"* (`http://www.ff3300.com`) e *"member of: Wallness"* (`http://www.instagram.com/wallness.com`)

---

## 3. Architettura Tecnica (Astro SSG)

### 3.1 Stack Tecnologico
- **Framework Core**: Astro 4.x / 5.x
- **Rendering**: Static Site Generation (SSG) puro — genera file HTML, CSS e JS statici nella cartella `dist/`.
- **CSS / Stili**: CSS modulare fedele alle classi Wix con supporto alle variabili CSS del design system originale.
- **Tipografia**: Web font locali incorporati (`Druk Text Wide`, `Open Sans`) per evitare dipendenze da server terzi ed eliminare il layout shift (CLS).
- **Gallerie & Lightbox**: Script JavaScript vanilla ultra-leggero (< 5KB), touch-friendly, con supporto alle gesture swipe e tasti freccia.

### 3.2 Struttura del Progetto
```
SITOWEB/
├── public/
│   ├── fonts/
│   │   ├── druk/
│   │   └── opensans/
│   ├── images/
│   │   ├── logo/
│   │   ├── hero/
│   │   ├── public-art/
│   │   ├── graffiti/
│   │   └── archive/
│   ├── favicon.ico
│   └── contact.php          # Backend PHP per ricezione email su hosting Aruba
├── src/
│   ├── components/
│   │   ├── Header.astro     # Barra di navigazione, logo e drawer mobile
│   │   ├── Footer.astro     # Sezione crediti, copyright e link archivio
│   │   ├── ProjectCard.astro# Card di anteprima progetto per griglia Public Art
│   │   ├── GalleryItem.astro# Elemento fotografico con trigger lightbox
│   │   ├── Lightbox.astro   # Modale visualizzatore a tutto schermo
│   │   └── ContactForm.astro# Modulo contatti asincrono con feedback visivo
│   ├── layouts/
│   │   └── BaseLayout.astro # Template master con head, font, SEO e layout base
│   ├── data/
│   │   ├── site.json        # Dati generali del sito, bio, link social
│   │   ├── public-art.json  # Array dei 22 progetti di arte pubblica
│   │   ├── graffiti.json    # Array delle 25 foto Hall of Fame
│   │   └── archive.json     # Array delle opere dell'archivio storico
│   └── pages/
│       ├── index.astro      # Homepage
│       ├── public-art/
│       │   ├── index.astro  # Indice generale Public Art
│       │   └── [slug].astro # Pagine dinamiche dei singoli progetti
│       ├── graffiti.astro   # Pagina Graffiti con lightbox
│       ├── about-me.astro   # Pagina biografia
│       ├── digitalart.astro # Sezione Digital Art / NFTs
│       └── skolp-archive.astro # Pagina archivio storico
├── astro.config.mjs
├── package.json
└── README.md
```

---

## 4. Gestione degli Asset e Dati

1. **Asset Immagini**:
   - I file presenti in `/Volumes/SSD_Skolp/Skolp/ARTE_URBANA/Wix_site` (cartelle `Altro`, `Archivio_graffiti`, `Gif_sito`, `Graffiti`, `Wallness_logo.png`) verranno importati direttamente nella cartella `public/images/`.
   - Tutte le immagini specifiche ospitate sulla CDN di Wix (`static.wixstatic.com/media/...`) verranno scaricate tramite script di migrazione automatico in alta risoluzione e catalogate localmente.
2. **Dati Strutturati**:
   - Ogni progetto di Public Art conterrà: `slug`, `title`, `year`, `city`, `mainImage`, `galleryImages`, `description`.
   - Questo consente in futuro a Nico di aggiungere nuovi progetti semplicemente inserendo un blocco nel file `public-art.json`.

---

## 5. Modulo Contatti su Hosting Aruba

Su hosting Aruba (Linux con PHP attivo di default):
- Lo script `public/contact.php` processerà le richieste POST inviate via `fetch` da `ContactForm.astro`.
- I campi (Nome, Cognome, Email, Oggetto, Messaggio) verranno sanitizzati.
- Verrà inviata una notifica formattata via `mail()` all'indirizzo email di Nico Skolp.
- Il frontend mostrerà senza ricaricare la pagina il messaggio di conferma: *"Il tuo modulo è stato inviato!"*.

---

## 6. Configurazione GitHub e Deploy su Aruba

1. **Repository Git**:
   - Inizializzazione repository locale in `/Volumes/SSD_Skolp/Skolp/SITOWEB`.
   - Creazione file `.gitignore` mirato (`node_modules/`, `.astro/`, `dist/`).
2. **GitHub Actions (CI/CD automatico su Aruba)**:
   - File di workflow `.github/workflows/deploy.yml`:
     - Al push sul branch `main`, esegue `npm run build`.
     - Tramite action FTP/SFTP (usando i dati di accesso FTP di Aruba salvati nei Secrets di GitHub), copia la cartella `dist/` nella root web (`/www.nicoskolp.it/` o cartella pubblica di Aruba).
   - In alternativa o in parallelo, è possibile effettuare il caricamento manuale della cartella `dist/` tramite qualsiasi client FTP (FileZilla/Cyberduck).

---

## 7. Verifica e Criteri di Accettazione

- [ ] Tutte le 35 rotte/pagine del sito Wix sono riprodotte fedelmente o mappate correttamente.
- [ ] Il layout desktop e mobile corrisponde al sito originale.
- [ ] La tipografia Druk Text Wide e Open Sans è applicata con le corrette dimensioni, pesi e spaziature.
- [ ] Le gallerie fotografiche e il lightbox funzionano fluidamente su desktop e touch su mobile.
- [ ] Il modulo contatti invia correttamente l'email tramite `contact.php`.
- [ ] Il comando `npm run build` genera la build statica completa senza errori.
- [ ] Il repository locale è pronto e collegabile al repository remoto GitHub dell'utente.
