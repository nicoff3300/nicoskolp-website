# Guida Operativa: Aggiornamento Nuovi Progetti, Gallery e Homepage

Questa guida descrive in modo chiaro e pratico la procedura per inserire nuovi progetti di **Public Art (Murales)**, organizzare le relative **gallerie fotografiche dinamiche** e aggiornare la **vetrina opere in Homepage (Hero Showcase)** sul sito portfolio di Nico Skolp.

---

## Indice dei Contenuti
1. [Aggiungere un Nuovo Progetto di Public Art](#1-aggiungere-un-nuovo-progetto-di-public-art)
2. [Come Preparare e Nominare le Immagini](#2-come-preparare-e-nominare-le-immagini)
3. [Comporre e Ordinare la Gallery Fotografica](#3-comporre-e-ordinare-la-gallery-fotografica)
4. [Aggiornare la Vetrina Opere in Homepage (Hero Showcase)](#4-aggiornare-la-vetrina-opere-in-homepage-hero-showcase)
5. [Aggiungere Pareti alla sezione Graffiti o Archivio](#5-aggiungere-pareti-alla-sezione-graffiti-o-archivio)
6. [Verifica Locale, Test e Pubblicazione su Aruba](#6-verifica-locale-test-e-pubblicazione-su-aruba)

---

## 1. Aggiungere un Nuovo Progetto di Public Art

Tutti i progetti di Public Art sono configurati in modo centralizzato all'interno del file:
📁 `src/data/public-art.json`

Grazie all'architettura dinamica del sito, l'aggiunta di una sola voce in questo file genera **automaticamente**:
- ✅ La pagina di dettaglio in lingua italiana: `/public-art/<slug>`
- ✅ La pagina di dettaglio in lingua inglese: `/en/public-art/<slug>`
- ✅ La card nella griglia generale `/public-art` e `/en/public-art`
- ✅ La galleria fotografica dinamica a ritmo variabile (stile Wix Pro Gallery)
- ✅ Il visualizzatore Lightbox a tutto schermo navigabile via tastiera e swipe touch
- ✅ I collegamenti di navigazione "Progetto Precedente" e "Progetto Successivo"
- ✅ L'aggiornamento automatico della `sitemap.xml` con tutti i metadati e immagini indicizzabili da Google

### Procedura Passo-Passo

1. **Crea la cartella delle immagini**:
   Crea una nuova sottocartella in:
   ```text
   public/images/public-art/<tuo-slug>/
   ```
   *Esempio: `public/images/public-art/cantiere-lecce-2026/`*

2. **Copia le foto dentro la cartella appena creata**:
   Inserisci l'immagine di copertina e tutte le foto di dettaglio/backstage.

3. **Apri il file `src/data/public-art.json`**:
   Aggiungi il nuovo blocco JSON in **cima all'elenco** (così apparirà come primo progetto, essendo il più recente):

```json
[
  {
    "id": "cantiere-lecce-2026",
    "slug": "cantiere-lecce-2026",
    "title": "Cantiere Lecce",
    "year": "2026",
    "city": "Lecce",
    "category": "public-art",
    "coverImage": "/images/public-art/cantiere-lecce-2026/01_copertina.jpg",
    "galleryImages": [
      "/images/public-art/cantiere-lecce-2026/01_copertina.jpg",
      "/images/public-art/cantiere-lecce-2026/02_dettaglio_alto.jpg",
      "/images/public-art/cantiere-lecce-2026/03_dettaglio_lettering.jpg",
      "/images/public-art/cantiere-lecce-2026/04_panoramica_drone.jpg",
      "/images/public-art/cantiere-lecce-2026/05_scaffolding.jpg"
    ],
    "description": "Grande intervento di pittura murale realizzato a Lecce su superficie monumentale. Composizione basata sulla decostruzione di forme geometriche e saturazione cromatica a contrasto con il contesto urbano circostante."
  },
  ...
]
```

### Spiegazione dei Campi
| Campo | Tipo | Descrizione |
| :--- | :--- | :--- |
| `id` | Testo | Identificativo univoco del progetto (consigliato uguale allo slug). |
| `slug` | Testo | Il percorso URL della pagina (es. `cantiere-lecce-2026` genera `/public-art/cantiere-lecce-2026`). Usare solo lettere minuscole, numeri e trattini `-`. |
| `title` | Testo | Titolo dell'opera visualizzato in testa alla pagina e sulle card in font Druk. |
| `year` | Testo | Anno di realizzazione (es. `"2026"`). |
| `city` | Testo | Città, provincia o contesto geografico (es. `"Lecce"` o `"Torino (TO)"`). |
| `category` | Testo | Categoria del progetto: impostare `"public-art"`. |
| `coverImage` | Testo | Percorso relativo della foto principale usata come copertina nella griglia generale e come prima foto di presentazione. |
| `galleryImages` | Elenco | Array contenente i percorsi di tutte le foto da includere nella gallery interna. |
| `description` | Testo | Testo descrittivo del progetto visualizzato sotto il titolo. |

---

## 2. Come Preparare e Nominare le Immagini

Per garantire prestazioni elevate, punteggi Core Web Vitals massimi e assenza di rallentamenti sui dispositivi mobili, segui queste indicazioni per le immagini:

1. **Formato**:
   - `JPG` (qualità 80-85%) o `WebP`.
2. **Dimensioni consigliate**:
   - **Foto Orizzontali / Panoramiche**: larghezza compresa tra `1920px` e `2400px`.
   - **Foto Verticali**: altezza compresa tra `1600px` e `2000px`.
   - **Peso del file**: idealmente tra `200 KB` e `600 KB` (evitare foto non compresse da 5-10 MB uscite direttamente dalla fotocamera reflex).
3. **Nomi dei file**:
   - Utilizzare solo caratteri minuscoli, numeri e trattini o underscore (evitare spazi, accenti o caratteri speciali).
   - *Esempio corretto*: `01_panoramica.jpg`, `02_dettaglio_lettering.jpg`.
   - *Esempio da evitare*: `IMG 4022 (copia) 2.JPG`.

---

## 3. Comporre e Ordinare la Gallery Fotografica

Il componente `ProjectGallery.astro` impagina automaticamente le foto secondo un algoritmo di composizione a griglia bento/collage a ritmo variabile.

### Come l'algoritmo compone le foto:
- **Se inserisci 3 foto**: crea automaticamente una composizione `1H + 2V` (1 grande panoramica a sinistra + 2 verticali a destra).
- **Se inserisci 2 foto**: crea una composizione `2H` (due foto affiancate a mezza larghezza).
- **Se inserisci 4 foto**: crea una striscia quadrupla equilibrata.
- **Se inserisci molte foto (5, 8, 12, 20 o più)**: l'algoritmo alterna ritmicamente:
  - Moduli `1H + 2V` (1 orizzontale + 2 verticali)
  - Moduli `1H + 1V + 1H` (mix alternato)
  - Moduli `2V + 1H` (2 verticali + 1 orizzontale)
  - Moduli `strip-5` (striscia a 5 colonne per dettagli e backstage)
  - Moduli `full` (foto monumentale a piena larghezza)

### Suggerimento per il miglior ritmo visivo:
Quando ordini i percorsi nell'array `galleryImages`, alterna le inquadrature orizzontali e quelle verticali:
1. `galleryImages[0]`: una bella foto panoramica d'impatto.
2. `galleryImages[1]` e `galleryImages[2]`: due dettagli verticali o scorci dal basso.
3. `galleryImages[3]`: un'altra inquadratura orizzontale o a tutto campo.

Tutte le immagini della gallery sono automaticamente collegate al **Lightbox nativo**: cliccando su qualsiasi foto l'utente può visualizzarla ad altissima risoluzione e scorrere avanti/indietro.

---

## 4. Aggiornare la Vetrina Opere in Homepage (Hero Showcase)

La homepage presenta una vetrina dinamica di opere d'arte contemporanea, sculture digitali e dipinti (tratti dalle serie *Skolptura* e *Canvas*).

I dati della vetrina si trovano in:
📁 `src/data/hero.json`

### Procedura per Aggiungere o Sostituire un'Opera in Homepage

1. **Inserisci la nuova immagine** in:
   ```text
   public/images/hero/
   ```
   *Consiglio: formato PNG con sfondo trasparente o JPG a fondo bianco pulito, risoluzione 1080x1350 o proporzione quadrata 1:1.*

2. **Apri `src/data/hero.json`** e inserisci il nuovo elemento nell'array:

```json
[
  {
    "id": "skolptura-a014",
    "title": "Skolptura A014",
    "image": "/images/hero/skolptura-a014.png",
    "category": "sculpture"
  },
  ...
]
```

### Valori ammessi per `category`:
- `"sculpture"`: per le sculture 3D e render della serie Skolptura.
- `"canvas"`: per le tele e opere materiche su telaio.
- `"design"`: per collaborazioni speciali di product design o edizioni limitate.

La homepage genera automaticamente una griglia dinamica bilanciata con tessere standard (`1x1`) e tessere grandi in risalto (`2x2`).

---

## 5. Aggiungere Pareti alla sezione Graffiti o Archivio

Se desideri aggiungere nuove pareti storiche o foto all'archivio:

### Sezione Graffiti (Hall of Fame)
- **File dati**: `src/data/graffiti.json`
- **Cartella immagini**: `public/images/graffiti/`
- **Ordinamento**: il sito ordina automaticamente dal più recente al più vecchio in base al campo `"year"`.
- **Esempio voce**:
  ```json
  {
    "id": "bari-hall-of-fame-2020",
    "title": "Bari Jam",
    "year": "2020",
    "city": "Bari",
    "image": "/images/graffiti/2020_BariJam.jpg",
    "description": "Pezzo realizzato per la Jam a Bari."
  }
  ```

### Sezione Archivio Storico (1999 - 2019)
- **File dati**: `src/data/archive.json`
- **Cartella immagini**: `public/images/archive/`
- **Ordinamento**: il sito ordina automaticamente dal più recente al più vecchio (2019 → 1999).
- **Esempio voce**:
  ```json
  {
    "id": "skolp-2019-mural",
    "year": "2019",
    "title": "Hall of Fame Piece",
    "city": "Bari",
    "image": "/images/archive/skolp_2019_wall.jpg",
    "description": "Pezzo graffiti storico."
  }
  ```

---

## 6. Verifica Locale, Test e Pubblicazione su Aruba

Prima di pubblicare online le modifiche, puoi verificare tutto in locale con i comandi del progetto:

### 1. Avviare il server locale di prova
```bash
npm run dev
```
Apri il browser su:
- Computer: [http://localhost:4321](http://localhost:4321)
- Smartphone (stessa rete Wi-Fi): [http://192.168.1.92:4321](http://192.168.1.92:4321)

### 2. Eseguire i test automatici di integrità
Esegui questo singolo comando per controllare che tutti i file JSON siano corretti e che tutte le immagini esistano:
```bash
npm run test:data && npm run check && npm run build && npm run audit
```
Se il risultato termina con:
`SUCCESS: Site audit passed with 0 errors!`
significa che non ci sono link rotti, le immagini sono tutte presenti e la compilazione è perfetta.

### 3. Pubblicare online su Aruba (Deploy Automatico CI/CD)
Tutto ciò che devi fare è eseguire il commit e il push su GitHub:
```bash
git add .
git commit -m "feat: aggiunto nuovo progetto [Nome del Progetto]"
git push origin main
```

Appena inviato su GitHub:
1. La **GitHub Action** si attiva automaticamente.
2. Compila il sito statico ottimizzato.
3. Carica i file aggiornati tramite FTPS sicuro direttamente sullo spazio hosting **Linux Aruba**.
4. Il nuovo progetto è immediatamente online e visibile a tutti!
