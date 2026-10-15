# Piano di Implementazione: Galleria Dinamica per le Pagine Progetto (Public Art)

> **Per esecutori agentici:** SUB-SKILL RICHIESTA: Utilizza `superpowers:subagent-driven-development` per implementare questo piano task-by-task. I passaggi utilizzano la sintassi checkbox (`- [ ]`) per il tracciamento.

**Obiettivo:** Ricostruire le pagine di dettaglio dei progetti (`/public-art/[slug]` e `/en/public-art/[slug]`) sostituendo la vista a singola immagine con una ricca galleria fotografica dinamica a collage/bento grid (Wix Pro Gallery style), integrando le 20 foto complete di *Teatroaquilone* e degli altri progetti, con supporto modale Lightbox per ciascuno scatto.

**Architettura:** I dati di ciascun progetto in `src/data/public-art.json` vengono arricchiti con l'elenco completo di tutte le foto e metadati di orientamento (`landscape`, `portrait`, `square`). Il nuovo componente `ProjectGallery.astro` raggruppa le immagini in moduli ritmici compositivi (1H + 2V, 2V + 1H, 1H + 1V + 1H, striscia a 5 colonne per dettagli) preservando i rapporti d'aspetto nativi con CSS Grid e aspect-ratio. Cliccando su ogni foto si attiva l'apertura del componente nativo `Lightbox.astro`.

**Diagramma di Architettura:**

```mermaid
graph TD
    A[public-art.json con 20+ foto per progetto] --> B[src/pages/public-art/[slug].astro]
    A --> C[src/pages/en/public-art/[slug].astro]
    B --> D[ProjectGallery.astro]
    C --> D
    D --> E[Moduli Ritmici: 1H+2V / 1H+1V+1H / Striscia 5 Colonne]
    E --> F[Lightbox.astro Modale Fullscreen]
```

**Tech Stack:** Astro, Tailwind CSS (v4), TypeScript, HTML5 `<dialog>`.

## Vincoli Globali

- Lingua comunicazioni e documentazione: Italiano (`<RULE[user_global]>`).
- Zero librerie JavaScript esterne pesanti; uso di Tailwind CSS e standard HTML5.
- Massima ottimizzazione Core Web Vitals: LCP con eager hints per le prime immagini above-the-fold, lazy loading per le restanti.
- Assenza totale di layout shift (CLS = 0) grazie a contenitori con aspect ratio predefiniti.

---

### Task 1: Estrazione e Copia Locale Immagini Galleria Teatroaquilone

**File Coinvolti:**
- Crea: `scripts/import-aquilone-gallery.mjs`
- Destinazione immagini: `public/images/public-art/teatro-aquilone/`

**Interfacce:**
- Consuma: File sorgente locali da `/Volumes/SSD_Skolp/Skolp/ARTE_URBANA/2022_Carosino_CantiereAquilone/Foto_carosino/Carosino_export/Low/` e URL Wix.
- Produce: 20 file immagine ottimizzati in `public/images/public-art/teatro-aquilone/` numerati da `01.jpg` a `20.jpg`.

- [ ] **Step 1: Scrivi lo script di importazione `scripts/import-aquilone-gallery.mjs`**

```javascript
import fs from 'fs';
import path from 'path';

const srcDir = '/Volumes/SSD_Skolp/Skolp/ARTE_URBANA/2022_Carosino_CantiereAquilone/Foto_carosino/Carosino_export/Low';
const destDir = 'public/images/public-art/teatro-aquilone';

fs.mkdirSync(destDir, { recursive: true });

// Elenco ordinato delle 20 foto corrispondenti alla galleria Wix
const photos = [
  'Teatroaquilone_DroneCarosino_27_A_169.jpg',
  'Teatroaquilone_Carosino_01.jpg',
  'Teatroaquilone_Carosino_02.jpg',
  'Teatroaquilone_Carosino_03.jpg',
  'Teatroaquilone_Carosino_04.jpg',
  'Teatroaquilone_Carosino_05.jpg',
  'Teatroaquilone_Carosino_06.jpg',
  'Teatroaquilone_Carosino_07.jpg',
  'Teatroaquilone_Carosino_08.jpg',
  'Teatroaquilone_Carosino_09.jpg',
  'Teatroaquilone_Carosino_10.jpg',
  'Teatroaquilone_Carosino_11.jpg',
  'Teatroaquilone_Carosino_12.jpg',
  'Teatroaquilone_Carosino_13.jpg',
  'Teatroaquilone_Carosino_14.jpg',
  'Teatroaquilone_Carosino_15.jpg',
  'Teatroaquilone_Carosino_16.jpg',
  'Teatroaquilone_Carosino_17.jpg',
  'Teatroaquilone_Carosino_18.jpg',
  'Teatroaquilone_Carosino_19.jpg',
];

photos.forEach((file, index) => {
  const srcPath = path.join(srcDir, file);
  const num = String(index + 1).padStart(2, '0');
  const destPath = path.join(destDir, `${num}_${file}`);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copiato: ${num}_${file}`);
  } else {
    console.warn(`File non trovato: ${srcPath}`);
  }
});
```

- [ ] **Step 2: Esegui lo script e verifica le 20 immagini create**

Run: `node scripts/import-aquilone-gallery.mjs`
Expected: 20 file copiati con successo in `public/images/public-art/teatro-aquilone/`.

- [ ] **Step 3: Commit**

```bash
git add scripts/import-aquilone-gallery.mjs public/images/public-art/teatro-aquilone/
git commit -m "feat(assets): importazione 20 immagini galleria per Teatroaquilone"
```

---

### Task 2: Aggiornamento Tipi TypeScript e Dati di Progetto

**File Coinvolti:**
- Modifica: `src/types/index.ts`
- Modifica: `src/data/public-art.json`
- Test: `scripts/verify-data.mjs`

**Interfacce:**
- Consuma: Nuove immagini in `public/images/public-art/teatro-aquilone/`.
- Produce: Tipo `ProjectGalleryItem` e record `galleryImages` aggiornati per i progetti.

- [ ] **Step 1: Aggiorna l'interfaccia `Project` in `src/types/index.ts`**

Aggiungi il supporto a oggetti immagine ricchi opzionali:
```typescript
export interface ProjectGalleryItem {
  url: string;
  orientation?: 'landscape' | 'portrait' | 'square';
  aspectRatio?: string;
  caption?: string;
}
```

- [ ] **Step 2: Aggiorna `src/data/public-art.json` per `teatro-aquilone`**

Includi tutte le 20 immagini nell'array `galleryImages` del progetto.

- [ ] **Step 3: Esegui il test dati**

Run: `npm run test:data`
Expected: PASS (tutte le immagini risolte con successo).

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/data/public-art.json
git commit -m "feat(data): catalogazione galleria completa 20 foto per Teatroaquilone"
```

---

### Task 3: Creazione Componente `ProjectGallery.astro`

**File Coinvolti:**
- Crea: `src/components/ProjectGallery.astro`

**Interfacce:**
- Consuma: `galleryImages: string[]`, `title: string`.
- Produce: Griglia collage responsive con moduli a 2V+1H, 1H+1V+1H, strisce a 5 colonne e trigger per il Lightbox.

- [ ] **Step 1: Implementa `src/components/ProjectGallery.astro`**

Struttura:
- Analisi automatica o sequenziale delle immagini in moduli visivi compatti.
- Modulo 1 (Top Hero Trio): 1 orizzontale panoramica (`col-span-12 lg:col-span-7 aspect-[16/9]`) + 2 immagini affiancate (`col-span-12 lg:col-span-5 grid grid-cols-2 gap-3.5`).
- Modulo 2 (Mix Ritmo 1V + 2H + 1V): layout bento con altezze coordinate e visualizzazione dettagli.
- Modulo 3 (Striscia Dettagli): griglia a 4 o 5 colonne (`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5`) per close-up su texture e gradini.
- Modulo 4 (Chiusura Panoramica): immagini finali d'insieme.
- Ogni card include:
  - `<button type="button" class="group relative w-full h-full text-left overflow-hidden border border-[#e2e2e2] bg-[#fcfcfc] hover:border-black transition-all cursor-zoom-in" data-gallery-index={index}>`
  - Tag `<img>` con `loading={index < 3 ? 'eager' : 'lazy'}` e zoom fluido `group-hover:scale-105 duration-500`.

- [ ] **Step 2: Verifica la compilazione del componente**

Run: `npm run check`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ProjectGallery.astro
git commit -m "feat(components): nuovo componente ProjectGallery con griglia collage ritmica"
```

---

### Task 4: Integrazione Nelle Pagine Dettaglio Progetto IT & EN

**File Coinvolti:**
- Modifica: `src/pages/public-art/[slug].astro`
- Modifica: `src/pages/en/public-art/[slug].astro`

**Interfacce:**
- Consuma: `ProjectGallery.astro`, `Lightbox.astro`, `project.galleryImages`.
- Produce: Pagina dettaglio progetto con header minimale (titolo, metadati, descrizione), galleria dinamica bento completa, navigazione prev/next e modale Lightbox.

- [ ] **Step 1: Aggiorna `src/pages/public-art/[slug].astro`**

- Inserisci `<ProjectGallery images={project.galleryImages} title={project.title} />`.
- Integra `<Lightbox items={lightboxItems} />`.
- Aggiungi script client-side per collegare i click dei bottoni `[data-gallery-index]` all'apertura del Lightbox all'indice specifico.

- [ ] **Step 2: Applica le medesime modifiche in `src/pages/en/public-art/[slug].astro`**

Garantisci identica esperienza utente e parità bilingue.

- [ ] **Step 3: Esegui controlli e build**

Run: `npm run check && npm run build`
Expected: Tutte le 58 pagine compilate con successo, 0 errori.

- [ ] **Step 4: Commit**

```bash
git add src/pages/public-art/[slug].astro src/pages/en/public-art/[slug].astro
git commit -m "feat(pages): integrazione galleria dinamica collage e lightbox nei dettagli progetto"
```

---

### Task 5: Validazione Finale, Audit di Produzione e Push

**File Coinvolti:**
- Verifica: `scripts/audit-site.mjs`
- Test: Build e audit

- [ ] **Step 1: Esegui la suite completa di test**

```bash
npm run test:data
npm run check
npm run build
npm run audit
```
Expected: 0 warnings, 0 errors, tutte le immagini verificate in `dist/`.

- [ ] **Step 2: Push su `main`**

```bash
git push origin main
```
Expected: Repository sincronizzato e deploy CI/CD Aruba innescato.
