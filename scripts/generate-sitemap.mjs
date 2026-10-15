import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const distDir = path.join(rootDir, 'dist');
const siteUrl = 'https://nicoskolp.com';

const publicArtDataPath = path.join(rootDir, 'src/data/public-art.json');
let publicArtProjects = [];
try {
  publicArtProjects = JSON.parse(fs.readFileSync(publicArtDataPath, 'utf8'));
} catch (err) {
  console.error('Errore nella lettura di public-art.json:', err.message);
  process.exit(1);
}

const currentDate = new Date().toISOString().split('T')[0];


const routes = [
  {
    itPath: '/',
    enPath: '/en',
    changefreq: 'weekly',
    priority: '1.0',
    images: [
      {
        url: `${siteUrl}/images/brand/Nico_skolp.jpg`,
        title: 'Nico Skolp - Urban Art, Graffiti Writing e Muralismo',
        caption: 'Nico Skolp artista visivo, street art e murales a Bari e in Puglia',
      },
    ],
  },
  {
    itPath: '/public-art',
    enPath: '/en/public-art',
    changefreq: 'weekly',
    priority: '0.9',
    images: [
      {
        url: `${siteUrl}/images/brand/Nico_skolp.jpg`,
        title: 'Public Art & Murales - Nico Skolp',
        caption: 'Portfolio di arte pubblica e grandi murales a Bari, in Puglia e in Europa',
      },
    ],
  },
  {
    itPath: '/about-me',
    enPath: '/en/about-me',
    changefreq: 'monthly',
    priority: '0.8',
    images: [
      {
        url: `${siteUrl}/images/brand/Nico_skolp.jpg`,
        title: 'Nico Skolp - Biografia e Profilo Artistico',
        caption: 'Biografia di Nico Skolp, co-fondatore studio FF3300 e membro Wallness Club a Bari',
      },
    ],
  },
  {
    itPath: '/press',
    enPath: '/en/press',
    changefreq: 'monthly',
    priority: '0.8',
  },
  {
    itPath: '/graffiti',
    enPath: '/en/graffiti',
    changefreq: 'monthly',
    priority: '0.8',
  },
  {
    itPath: '/skolp-archive',
    enPath: '/en/skolp-archive',
    changefreq: 'monthly',
    priority: '0.7',
  },
];

// Aggiungiamo i 22 progetti di Public Art
for (const project of publicArtProjects) {
  if (!project.slug) continue;
  const projectImages = [];
  if (project.coverImage) {
    projectImages.push({
      url: `${siteUrl}${project.coverImage}`,
      title: `${project.title} - Murale di Nico Skolp`,
      caption: `Opera di arte urbana "${project.title}" a ${project.city || 'Puglia'} (${project.year || ''}) realizzata da Nico Skolp.`,
    });
  }
  if (Array.isArray(project.galleryImages)) {
    for (const gImg of project.galleryImages) {
      if (gImg !== project.coverImage) {
        projectImages.push({
          url: `${siteUrl}${gImg}`,
          title: `${project.title} - Dettaglio murale`,
          caption: `Dettaglio e visuale dell'opera murale "${project.title}" - Nico Skolp.`,
        });
      }
    }
  }

  routes.push({
    itPath: `/public-art/${project.slug}`,
    enPath: `/en/public-art/${project.slug}`,
    changefreq: 'monthly',
    priority: '0.85',
    images: projectImages,
  });
}

function generateXml(routesList) {
  const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

  const urlEntries = [];

  for (const item of routesList) {
    const itUrl = item.itPath === '/' ? `${siteUrl}/` : `${siteUrl}${item.itPath}`;
    const enUrl = `${siteUrl}${item.enPath}`;

    // Entry Italiana
    let itEntry = `  <url>
    <loc>${itUrl}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
    <xhtml:link rel="alternate" hreflang="it" href="${itUrl}" />
    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${itUrl}" />`;

    if (item.images && item.images.length > 0) {
      for (const img of item.images) {
        itEntry += `
    <image:image>
      <image:loc>${img.url}</image:loc>
      <image:title>${escapeXml(img.title)}</image:title>
      <image:caption>${escapeXml(img.caption || img.title)}</image:caption>
    </image:image>`;
      }
    }
    itEntry += `
  </url>`;
    urlEntries.push(itEntry);

    // Entry Inglese
    let enEntry = `  <url>
    <loc>${enUrl}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
    <xhtml:link rel="alternate" hreflang="it" href="${itUrl}" />
    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${itUrl}" />`;

    if (item.images && item.images.length > 0) {
      for (const img of item.images) {
        enEntry += `
    <image:image>
      <image:loc>${img.url}</image:loc>
      <image:title>${escapeXml(img.title)}</image:title>
      <image:caption>${escapeXml(img.caption || img.title)}</image:caption>
    </image:image>`;
      }
    }
    enEntry += `
  </url>`;
    urlEntries.push(enEntry);
  }

  return `${xmlHeader}\n${urlEntries.join('\n')}\n</urlset>\n`;
}

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

const sitemapContent = generateXml(routes);

// Scrivi in public/sitemap.xml
fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapContent, 'utf8');
console.log('✓ Creato public/sitemap.xml');

// Se la cartella dist esiste già, scrivi anche in dist/sitemap.xml
if (fs.existsSync(distDir)) {
  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapContent, 'utf8');
  console.log('✓ Creato dist/sitemap.xml');
}

console.log(`✓ Sitemap generata con successo! Totale route bilingue (IT + EN): ${routes.length * 2} URL.`);
