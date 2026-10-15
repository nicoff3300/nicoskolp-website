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
├── public/                 # Asset statici (immagini, web font, favicon, contact.php, .htaccess)
├── src/
│   ├── components/         # Componenti Astro riutilizzabili (Header, Footer, Lightbox, ecc.)
│   ├── data/               # Dati strutturati JSON (public-art, graffiti, archive, site, hero)
│   ├── layouts/            # Layout di base (BaseLayout.astro)
│   ├── pages/              # Routing SSG (Home, Public Art, Graffiti, About, Digital Art, Archivio)
│   └── styles/             # Fogli di stile globali e variabili CSS
├── scripts/                # Script di validazione dati (verify-data.mjs)
├── .github/workflows/      # Pipeline CI/CD GitHub Actions (deploy-aruba.yml)
├── astro.config.mjs        # Configurazione Astro (output: 'static', directory format)
├── tsconfig.json           # Configurazione TypeScript
└── package.json            # Dipendenze e script npm
```

## Requisiti

- Node.js >= 18.17.1 (consigliato v20 o v22 LTS)
- npm >= 9.x

## Comandi Disponibili

| Comando | Descrizione |
| :--- | :--- |
| `npm install` | Installa le dipendenze del progetto |
| `npm run dev` | Avvia il server di sviluppo locale (`http://localhost:4321`) |
| `npm run build` | Compila il sito statico nella directory `dist/` |
| `npm run preview` | Avvia un'anteprima locale della build statica |
| `npm run check` | Esegue il controllo dei tipi e la diagnostica di Astro (`astro check`) |
| `npm run test:data` | Esegue lo script di validazione dell'integrità dei dati JSON e dei percorsi immagini |

---

## Guida al Deploy Automatico su Hosting Aruba (CI/CD)

Il repository include una pipeline di Continuous Integration & Continuous Deployment (CI/CD) configurata con **GitHub Actions** (`.github/workflows/deploy-aruba.yml`). La pipeline automatizza il collaudo del codice, la compilazione del sito Astro e il caricamento dei file sul server Linux di Aruba ad ogni aggiornamento del ramo principale (`main`).

### 1. Dove trovare i dati FTP su Aruba

Per consentire a GitHub Actions di comunicare con il tuo spazio web, servono le credenziali di accesso FTP rilasciate da Aruba:

1. **Email di attivazione servizio**: Aruba invia un'email di conferma all'attivazione del dominio con oggetto simile a *"Conferma attivazione / Dati accesso hosting Linux"*, contenente l'host FTP, il login e le istruzioni iniziali.
2. **Pannello di Controllo Aruba**:
   - Accedi all'area clienti Aruba su [customerarea.aruba.it](https://customerarea.aruba.it/).
   - Entra nella gestione del dominio `nicoskolp.com`.
   - Seleziona **Pannello di Gestione Hosting Linux** -> **Dati di Accesso FTP** (o **Gestione Account FTP**).

I parametri necessari sono:

* **Server FTP (`FTP_SERVER`)**:
  - Solitamente `ftp.nicoskolp.com` oppure `ftplnx.nicoskolp.com`.
  - In alternativa, è possibile utilizzare l'indirizzo IP del server Linux assegnato da Aruba (visibile nella scheda riassuntiva dell'hosting).
* **Nome utente FTP (`FTP_USERNAME`)**:
  - Formato tipico Aruba: identificativo numerico seguito dal dominio di servizio, ad esempio `1234567@aruba.it`.
* **Password FTP (`FTP_PASSWORD`)**:
  - La password impostata per l'utente FTP principale (se dimenticata, è reimpostabile direttamente dal pannello Aruba senza ripercussioni sul sito).
* **Directory di destinazione (`FTP_SERVER_DIR`)**:
  - Negli hosting Linux Aruba condivisi standard, la root pubblica del sito è la sottocartella `www.nicoskolp.com/`.
  - Se il tuo account FTP è configurato per accedere direttamente alla cartella web (chroot alla root del sito), la cartella può essere semplicemente `/`.
  - Il workflow imposta automaticamente `www.nicoskolp.com/` come valore predefinito se non diversamente specificato.

---

### 2. Come inserire i Secret su GitHub

Per motivi di sicurezza, le credenziali FTP non devono mai essere salvate nel codice sorgente, bensì nei **Repository Secrets** crittografati di GitHub:

1. Apri il repository del sito su GitHub:  
   `https://github.com/nicoff3300/nicoskolp-website`
2. Clicca sulla scheda **Settings** (in alto a destra nel menu del repository).
3. Nella barra laterale sinistra, naviga su **Secrets and variables** -> **Actions**.
4. Clicca sul pulsante verde **New repository secret**.
5. Crea esattamente le seguenti **4 chiavi segrete**:

| Nome Secret | Valore Esempio | Descrizione |
| :--- | :--- | :--- |
| `FTP_SERVER` | `ftp.nicoskolp.com` | Hostname del server FTP Aruba o indirizzo IP |
| `FTP_USERNAME` | `1234567@aruba.it` | Nome utente per l'autenticazione FTP |
| `FTP_PASSWORD` | `••••••••••••` | Password associata all'account FTP |
| `FTP_SERVER_DIR` | `www.nicoskolp.com/` | Percorso della cartella web su Aruba (con slash finale) |

> [!TIP]
> Assicurati che non vi siano spazi vuoti prima o dopo i valori inseriti nei secret.

---

### 3. Come funziona il Deploy Automatico

La pipeline CI/CD è progettata per garantire affidabilità, sicurezza e zero interruzioni di servizio (*zero-downtime*):

#### A. Flusso di Esecuzione della Pipeline
1. **Trigger Automatico o Manuale**:
   - **Push su `main`**: Ogni volta che esegui un comando `git push origin main`, GitHub Actions avvia il job `build-and-deploy`.
   - **Avvio Manuale (`workflow_dispatch`)**: È possibile rilasciare in qualsiasi momento direttamente dall'interfaccia GitHub:
     1. Vai nella scheda **Actions** del repository.
     2. Nella barra laterale sinistra, seleziona il workflow **Deploy su Hosting Aruba**.
     3. Clicca su **Run workflow**, seleziona il ramo `main` e premi il pulsante verde **Run workflow**.
2. **Controllo di Concorrenza (`concurrency`)**:
   - La configurazione `cancel-in-progress: false` garantisce che due deploy consecutivi non si sovrappongano, completando il primo trasferimento prima di iniziare il successivo per evitare corruzioni di file sul server.
3. **Verifica e Validazione Preliminare**:
   - Esegue `npm run test:data` per convalidare la coerenza di tutti i file JSON (`site.json`, `public-art.json`, `graffiti.json`, `archive.json`, `hero.json`) e la presenza di tutti i file immagine referenziati.
   - Esegue `npm run check` per la diagnostica dei tipi TypeScript e la validazione dei componenti Astro.
4. **Compilazione Statica (`npm run build`)**:
   - Genera tutti i percorsi HTML statici, le pagine di dettaglio Public Art, le gallerie e copia gli asset statici nella cartella `dist/`.
5. **Pulizia Preventiva File di Cortesia Aruba**:
   - Sui nuovi piani hosting Aruba viene posizionato un file di benvenuto (`index.php` o `default.html` con grafica "Sito in costruzione"). Poiché Apache per impostazione predefinita assegna priorità a `index.php`, il workflow rimuove preventivamente questi file di cortesia prima del caricamento, garantendo che venga servito il nuovo `index.html`.
6. **Deploy Differenziale e Sicuro (`SamKirkland/FTP-Deploy-Action@v4.3.5`)**:
   - Utilizza il protocollo cifrato **FTPS (Explicit TLS su porta 21)** con `security: loose` per supportare in modo affidabile i certificati di Aruba.
   - Dispone di un **meccanismo di fallback automatico**: qualora il server rifiuti temporaneamente la negoziazione TLS, la pipeline effettua il fallback su FTP standard per garantire il rilascio.
   - Carica solo i file creati o modificati rispetto al deploy precedente, riducendo i tempi di trasferimento da minuti a pochi secondi.

#### B. Modulo Contatti su Hosting Linux Aruba (`contact.php`)
- Il form contatti presente nella pagina About invia una richiesta `POST` in formato JSON all'endpoint `/contact.php`.
- Lo script PHP riceve i dati, verifica la presenza di bot tramite honeypot invisibile (`bot_field`), valida e sanitizza rigorosamente nome, email, oggetto e messaggio (protezione da email injection e caratteri speciali).
- Utilizza la funzione nativa `mail()` di PHP compatibile con Aruba, con mittente envelope `-f noreply@nicoskolp.com` per superare i controlli SPF/DMARC dei provider di posta e recapitare il messaggio alla casella `nicoskolp@gmail.com`.

#### C. Regole Apache e Ottimizzazioni (`.htaccess`)
- Il file `.htaccess` situato in `public/` viene deployato automaticamente nella radice del server e implementa:
  - **Priorità Index**: `DirectoryIndex index.html index.php default.html` per assicurare che la home page statica HTML sia sempre servita per prima.
  - **Redirect HTTPS forzato**: riscrittura automatica di tutto il traffico HTTP verso HTTPS (`301 Moved Permanently`).
  - **Header di Sicurezza**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`.
  - **Compressione Gzip**: compressione attiva per HTML, CSS, JavaScript, JSON, SVG e testo.
  - **Cache Browser**: intestazioni di durata cache a 1 anno per fogli di stile, script JS, font WOFF2 e immagini WebP/JPEG/PNG.

---

## Licenza

Tutti i diritti sulle opere d'arte, immagini e testi sono riservati a Nico Skolp.
