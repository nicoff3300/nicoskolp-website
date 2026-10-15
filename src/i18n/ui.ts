export const languages = {
  it: 'Italiano',
  en: 'English',
} as const;

export type Lang = keyof typeof languages;

export const defaultLang: Lang = 'it';

export const ui = {
  it: {
    // Navigazione
    'nav.publicArt': 'Public Art',
    'nav.about': 'About me',
    'nav.press': 'Press',
    'nav.graffiti': 'Graffiti',
    'nav.archive': 'Archivio',
    'nav.linktree': 'Linktree',

    // Hero
    'hero.tagline': 'A contemporary art project about muralism.',
    'hero.subtagline': 'Progetto di arte urbana contemporanea, muralismo e astrazione geometrica.',
    'hero.showcaseTitle': 'Opere in evidenza',

    // Contatti
    'contact.title': 'Scrivimi per maggiori informazioni',
    'contact.subtitle': 'Disponibile per progetti pubblici, residenze artistiche, mostre e commissioni su misura.',
    'contact.name': 'Nome',
    'contact.namePlaceholder': 'Il tuo nome',
    'contact.surname': 'Cognome',
    'contact.surnamePlaceholder': 'Il tuo cognome',
    'contact.email': 'Email',
    'contact.emailPlaceholder': 'nome@esempio.com',
    'contact.subject': 'Oggetto',
    'contact.subjectPlaceholder': 'Motivo del messaggio',
    'contact.message': 'Messaggio',
    'contact.messagePlaceholder': 'Scrivi qui il tuo messaggio...',
    'contact.send': 'Invia',
    'contact.sending': 'Invio in corso...',
    'contact.success': 'Il tuo modulo è stato inviato!',
    'contact.error': 'Si è verificato un errore durante l\'invio. Riprova più tardi.',

    // Public Art
    'publicArt.title': 'Public Art',
    'publicArt.subtitle': 'Portfolio di arte urbana e muralismo. Geometrie, lettere e colore nello spazio pubblico.',
    'publicArt.back': '← Torna a Public Art',
    'publicArt.allProjects': 'Tutti i murales',
    'publicArt.prev': 'Opera Precedente',
    'publicArt.next': 'Opera Successiva',
    'publicArt.details': 'Dettagli opera',
    'publicArt.location': 'Località',
    'publicArt.year': 'Anno',
    'publicArt.gallery': 'Galleria e Backstage',

    // Graffiti
    'graffiti.title': 'Hall of Fame selection.',
    'graffiti.subtitle': 'The 5 letters that boost my style. Selezione di pareti e graffiti writing dal 1997.',

    // About Me
    'about.title': 'About me',
    'about.subtitle': 'Artista urbano, muralista e co-fondatore di FF3300. Dalla Puglia all\'Europa.',
    'about.motto': 'Collaboration welcomed',
    'about.mottoDesc': 'Disponibile per grandi facciate, progetti di rigenerazione urbana, festival e committenze.',
    'about.contactCta': 'Contattami',
    'about.networkTitle': 'Studio, Collettivo & Network',
    'about.networkDesc': 'I progetti, gli studi e i collettivi indipendenti di cui Nico Skolp fa parte.',
    'about.officialChannels': 'Canali Ufficiali & Profili',
    'about.officialChannelsDesc': 'Segui il processo creativo, i backstage e le nuove uscite.',

    // Bio paragrafi in Italiano
    'about.bio.p1': 'Nico Skolp è nato nel sud Italia a Bari; dipinge graffiti e pratica il writing dal 1997, fin dalla prima adolescenza. Ha sempre privilegiato la pittura negli spazi pubblici e condivisi, dove trova la sua massima e naturale espressione.',
    'about.bio.p2': 'I suoi murales fondono forme geometriche pure e palette cromatiche vibranti in elaborate astrazioni visive, in costante equilibrio con il contesto architettonico e paesaggistico circostante, offrendo ogni volta un\'esperienza percettiva unica e immersiva.',
    'about.bio.p3': 'Ha realizzato interventi monumentali di pittura murale e graffiti in numerose città italiane ed europee. Quando non è sui ponteggi a dipingere, lavora a Bari presso FF3300, studio di arti visive e design che ha co-fondato nel 2006.',
    'about.bio.p4': 'Poiché uno dei suoi motti guida è diventato "works are better when shared", negli ultimi anni collabora attivamente in team con altri artisti, collettivi e realtà di rigenerazione urbana.',

    // Archive
    'archive.title': 'Archive',
    'archive.subtitle': 'Vent\'anni di graffiti, evoluzione delle lettere e studio calligrafico (1999 - 2019).',

    // Press & Media
    'press.title': 'Press & Media',
    'press.subtitle': 'Articoli, interviste e pubblicazioni su riviste d\'arte contemporanea, design e quotidiani nazionali e internazionali.',
    'press.featuredTitle': 'In Evidenza',
    'press.allArticlesTitle': 'Tutti gli Articoli & Pubblicazioni',
    'press.readArticle': 'Leggi articolo',
    'press.pressKitTitle': 'Cartella Stampa & Richieste Media',
    'press.pressKitDesc': 'Sei un giornalista, curatore o redattore? Contattami per richiedere la cartella stampa ufficiale, immagini in alta definizione per la stampa o interviste.',
    'press.pressKitCta': 'Richiedi Press Kit',

    // Footer
    'footer.follow': 'seguimi su:',
    'footer.archiveCta': 'Guarda qui il mio ARCHIVIO',
    'footer.memberOf': 'member of:',

    // SEO & GEO
    'seo.defaultTitle': 'Nico Skolp - Street Art, Muralismo & Arte Urbana | Bari, Puglia, Italia',
    'seo.defaultDescription': 'Portfolio ufficiale di Nico Skolp, street artist e muralista con base a Bari, Puglia. Grandi murales, graffiti writing e progetti di rigenerazione urbana in Italia ed Europa.',
    'seo.keywords': 'Nico Skolp, street art puglia, arte urbana puglia, muralista puglia, murales bari, street art bari, graffiti puglia, muralismo italia, artisti pugliesi, pittura murale su commissione, ff3300, wallness club, deceit',
  },
  en: {
    // Navigation
    'nav.publicArt': 'Public Art',
    'nav.about': 'About me',
    'nav.press': 'Press',
    'nav.graffiti': 'Graffiti',
    'nav.archive': 'Archive',
    'nav.linktree': 'Linktree',

    // Hero
    'hero.tagline': 'A contemporary art project about muralism.',
    'hero.subtagline': 'Contemporary urban art project, muralism and geometric abstraction.',
    'hero.showcaseTitle': 'Featured Artworks',

    // Contact
    'contact.title': 'Get in touch for more information',
    'contact.subtitle': 'Available for public murals, art residencies, exhibitions and custom commissions.',
    'contact.name': 'First Name',
    'contact.namePlaceholder': 'Your first name',
    'contact.surname': 'Last Name',
    'contact.surnamePlaceholder': 'Your last name',
    'contact.email': 'Email',
    'contact.emailPlaceholder': 'name@example.com',
    'contact.subject': 'Subject',
    'contact.subjectPlaceholder': 'Subject of your message',
    'contact.message': 'Message',
    'contact.messagePlaceholder': 'Write your message here...',
    'contact.send': 'Send Message',
    'contact.sending': 'Sending...',
    'contact.success': 'Your message has been sent successfully!',
    'contact.error': 'An error occurred while sending your message. Please try again later.',

    // Public Art
    'publicArt.title': 'Public Art',
    'publicArt.subtitle': 'Urban Art Portfolio. Shape and colors make me feel better.',
    'publicArt.back': '← Back to Public Art',
    'publicArt.allProjects': 'All Murals',
    'publicArt.prev': 'Previous Artwork',
    'publicArt.next': 'Next Artwork',
    'publicArt.details': 'Artwork details',
    'publicArt.location': 'Location',
    'publicArt.year': 'Year',
    'publicArt.gallery': 'Gallery & Backstage',

    // Graffiti
    'graffiti.title': 'Hall of Fame selection.',
    'graffiti.subtitle': 'The 5 letters that boost my style. Curated walls and graffiti writing selection since 1997.',

    // About Me
    'about.title': 'About me',
    'about.subtitle': 'Urban artist, muralist and co-founder of FF3300. Based in Bari, Italy.',
    'about.motto': 'Collaboration welcomed',
    'about.mottoDesc': 'Available for large facades, urban regeneration projects, festivals and commissions worldwide.',
    'about.contactCta': 'Contact Me',
    'about.networkTitle': 'Studio, Collective & Network',
    'about.networkDesc': 'Independent projects, design studios and creative collectives Nico Skolp is part of.',
    'about.officialChannels': 'Official Channels & Profiles',
    'about.officialChannelsDesc': 'Follow the creative process, behind-the-scenes and latest drops.',

    // Bio paragraphs in English
    'about.bio.p1': 'Nico Skolp was born in southern Italy in Bari; he started painting graffiti in 1997 during his early teens. He has always preferred painting in public spaces, where he finds his purest and most powerful artistic expression.',
    'about.bio.p2': 'His murals blend pure geometric shapes and vibrant chromatic palettes into elaborate abstractions, in constant harmony with the surrounding architectural context, offering an engaging visual experience each time.',
    'about.bio.p3': 'He has painted monumental outdoor murals and graffiti in various cities across Italy and Europe. When he is not painting on scaffolding, he works in Bari at FF3300, a visual arts and design studio he co-founded in 2006.',
    'about.bio.p4': 'Since one of his guiding mottos became "works are better when shared", in recent years he has been actively collaborating with other artists, curators and urban regeneration projects.',

    // Archive
    'archive.title': 'Archive',
    'archive.subtitle': 'Twenty years of graffiti, lettering evolution and calligraphic exploration (1999 - 2019).',

    // Press & Media
    'press.title': 'Press & Media',
    'press.subtitle': 'Articles, interviews and features across contemporary art magazines, design publications and newspapers worldwide.',
    'press.featuredTitle': 'Featured Coverage',
    'press.allArticlesTitle': 'All Articles & Press Clips',
    'press.readArticle': 'Read article',
    'press.pressKitTitle': 'Press Kit & Media Inquiries',
    'press.pressKitDesc': 'Are you a journalist, curator or editor? Get in touch for high-resolution press assets, artist bio or interview requests.',
    'press.pressKitCta': 'Request Press Kit',

    // Footer
    'footer.follow': 'follow me on:',
    'footer.archiveCta': 'Check out my ARCHIVE here',
    'footer.memberOf': 'member of:',

    // SEO & GEO
    'seo.defaultTitle': 'Nico Skolp - Urban Art, Muralism & Contemporary Street Art | Italy',
    'seo.defaultDescription': 'Official portfolio of Nico Skolp, contemporary urban artist and muralist based in Bari, Puglia (Italy). Large-scale murals, graffiti writing and architectural public art across Europe.',
    'seo.keywords': 'Nico Skolp, street art italy, urban art bari puglia, muralist italy, italian street artist, graffiti writing europe, contemporary muralism, public art commissions, ff3300, wallness club, deceit',
  },
} as const;
