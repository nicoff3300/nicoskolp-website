# Nico Skolp — Portfolio & Archivio Arte Urbana

Sito web ufficiale e archivio opere dell'artista urbano Nico Skolp. Il progetto è una ricostruzione statica ad alte prestazioni (SSG) realizzata con Astro, progettata per replicare con fedeltà assoluta l'identità visiva del sito originale Wix, ottimizzata per hosting su server Aruba.

## Panoramica del Progetto

- **Artista**: Nico Skolp
- **Framework**: [Astro](https://astro.build/) (Static Site Generation)
- **Tipografia**: Druk Text Wide, Open Sans (web font self-hosted)
- **Hosting Target**: Server Linux Aruba (file statici + script PHP per il modulo contatti)
- **Design & Layout**: Fedeltà 100% rispetto al design originale Wix con transizioni pulite, layout responsive e visualizzatore Lightbox nativo per graffiti e public art.

## Struttura del Progetto

```text
├── public/                 # Asset statici (immagini, web font, favicon, contact.php)
├── src/
│   ├── components/         # Componenti Astro riutilizzabili (Header, Footer, Lightbox, ecc.)
│   ├── data/               # Dati strutturati JSON (public-art, graffiti, archive, site)
│   ├── layouts/            # Layout di base (BaseLayout.astro)
│   ├── pages/              # Routing SSG (Home, Public Art, Graffiti, About, Digital Art, Archivio)
│   └── styles/             # Fogli di stile globali e variabili CSS
├── astro.config.mjs        # Configurazione Astro (output: 'static', directory format)
├── tsconfig.json           # Configurazione TypeScript
└── package.json            # Dipendenze e script npm
```

## Requisiti

- Node.js >= 18.17.1 (consigliato v20+)
- npm >= 9.x

## Comandi Disponibili

| Comando | Descrizione |
| :--- | :--- |
| `npm install` | Installa le dipendenze del progetto |
| `npm run dev` | Avvia il server di sviluppo locale (`http://localhost:4321`) |
| `npm run build` | Compila il sito statico nella directory `dist/` |
| `npm run preview` | Avvia un'anteprima locale della build statica |

## Licenza

Tutti i diritti sulle opere d'arte, immagini e testi sono riservati a Nico Skolp.
