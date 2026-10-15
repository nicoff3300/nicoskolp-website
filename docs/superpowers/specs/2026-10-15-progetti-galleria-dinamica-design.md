# Specifiche di Progetto: Galleria Dinamica per le Pagine Progetto (Public Art)

- **Data:** 2026-10-15
- **Autore:** Antigravity & Nico Skolp
- **Riferimento Originale:** `https://nicoskolp.wixsite.com/nicoskolp/it/teatro-aquilone`
- **Screenshot Utente:** `media_1792083869394.png`
- **Ambito:** Ricostruzione completa delle pagine di dettaglio murales (`/public-art/[slug]` e `/en/public-art/[slug]`) con galleria fotografica dinamica a collage/bento grid (Wix Pro Gallery style).

---

## 1. Obiettivi e Visione

Nel sito Wix originale, ogni progetto di arte urbana (come *Teatroaquilone*, *T.R.U.S.T Festival*, *San Paolo*, *Basketcourt Matera*, ecc.) non mostra semplicemente una singola immagine isolata, bensì una **ricca galleria fotografica di 10–30 scatti ad altissima risoluzione**, composta da vedute aeree con drone, prospettive architettoniche d'insieme, scatti frontali e molteplici dettagli ravvicinati delle campiture, dei gradini e delle geometrie.

L'obiettivo è:
1. **Reperire e catalogare l'intero archivio fotografico** di ciascuno dei 22 progetti di Public Art direttamente dall'archivio locale (`/Volumes/SSD_Skolp/Skolp/ARTE_URBANA/`) e dal database multimediale Wix.
2. **Creare un nuovo componente Astro riutilizzabile**: `src/components/ProjectGallery.astro`.
3. **Implementare la griglia collage dinamica a ritmo variabile (Bento / Wix Pro Gallery)**:
   - Alternanza armonica di moduli compositivi:
     - **Modulo A (1H + 2V o 2V + 1H)**: 2 immagini verticali affiancate + 1 orizzontale panoramica.
     - **Modulo B (1H + 1V + 1H)**: 1 orizzontale + 1 verticale centrale + 1 orizzontale.
     - **Modulo C (Striscia Dettagli)**: griglia a 4 o 5 colonne per dettagli ravvicinati, campiture cromatiche e texture.
     - **Modulo D (Coppia Monumentale)**: 2 immagini orizzontali bilanciate a tutta larghezza.
4. **Interattività e Navigazione Immersiva**:
   - Ogni immagine della galleria è cliccabile e apre il modale nativo `<Lightbox items={...} />` a schermo intero con navigazione da tastiera (frecce, Escape), touch swipe mobile, contatore foto e didascalia.
5. **Zero Dipendenze Esterne & Massime Prestazioni (Core Web Vitals)**:
   - Pura CSS Grid moderna, aspect-ratio nativo contro il CLS, caricamento eager per le prime immagini e lazy per il resto.

---

## 2. Architettura dei Dati

### 2.1 Aggiornamento di `src/types/index.ts`
Estensione dell'interfaccia `Project` per includere metadati dettagliati sulle immagini della galleria:

```typescript
export interface ProjectImage {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
  orientation?: 'landscape' | 'portrait' | 'square';
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  year?: string;
  city?: string;
  category: 'public-art' | 'graffiti';
  coverImage: string;
  galleryImages: string[];
  galleryItems?: ProjectImage[];
  description?: string;
}
```

### 2.2 Popolamento di `src/data/public-art.json`
Scrittura di uno script di migrazione (`scripts/extract-project-galleries.mjs`) per estrarre e scaricare/collegare tutte le 20+ foto di *Teatroaquilone* (da `Carosino_export/Low` e Wix) e delle altre gallerie dei progetti, registrando array completi di `galleryImages` e `galleryItems`.

---

## 3. Componente `ProjectGallery.astro`

### 3.1 Algoritmo di Composizione Ritmica (Pattern Collage)
Il componente riceve la lista delle immagini del progetto e le raggruppa in **chunk ritmici** basati su moduli da 2, 3 o 4/5 elementi:

- **Sezione 1 - Apertura Monumentale**:
  - Immagine 1 (panoramica/drone) a 2 colonne + Immagini 2 e 3 (verticali) affiancate.
- **Sezione 2 - Ritmo Misto**:
  - Blocco 1H + 1V + 1H o 2V + 1H con proporzioni coordinate (`aspect-[4/3]`, `aspect-[3/4]`, `aspect-[16/9]`).
- **Sezione 3 - Dettagli e Close-up**:
  - Griglia densa a 4 o 5 colonne (`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3`) per la sequenza dei gradini colorati, dettagli di texture e prospettive dal basso.
- **Sezione 4 - Chiusura d'Insieme**:
  - Immagini conclusive di grande respiro.

### 3.2 Stile Visivo & Interazione
- Spaziatura pulita e uniforme (`gap-3 sm:gap-4 lg:gap-5`).
- Bordo sottile `#e2e2e2` e hover border black (`hover:border-black transition-all`).
- Zoom delicato al passaggio del cursore (`group-hover:scale-105 transition-transform duration-500`).
- Cursore a lente d'ingrandimento (`cursor-zoom-in`).
- Click handler per aprire istantaneamente il Lightbox al rispettivo indice `data-index`.

---

## 4. Aggiornamento Pagine Dettaglio Progetto

### 4.1 File Coinvolti
- `src/pages/public-art/[slug].astro` (versione italiana)
- `src/pages/en/public-art/[slug].astro` (versione inglese)

### 4.2 Struttura della Pagina
1. **Navigazione Breadcrumb**: `← Torna a Public Art`
2. **Header Progetto**: Metadati (Località • Anno) e Titolo in font Druk Wide.
3. **Descrizione Sintetica**: Testo curatoriale originale dell'intervento.
4. **Galleria Dinamica Principale**: `<ProjectGallery items={project.galleryItems} title={project.title} />`.
5. **Navigazione Prev/Next**: Barra di navigazione tra progetti con frecce.
6. **Modale Lightbox**: `<Lightbox items={lightboxItems} />` a schermo intero.

---

## 5. Piano di Verifica e Controllo Qualità

1. **Integrità Dati**:
   - `npm run test:data`: verifica che tutti i file immagine esistano su disco e non siano vuoti.
2. **Type Safety & Build**:
   - `npm run check`: 0 errori TypeScript.
   - `npm run build`: compilazione statica di tutte le 22 pagine progetto IT e 22 pagine EN.
3. **Audit di Produzione**:
   - `npm run audit`: verifica di tutti i link interni, tag `<img>`, preloads e canonicals.
4. **Fedeltà Visiva**:
   - Confronto visivo accurato con lo screenshot utente `media_1792083869394.png`.
