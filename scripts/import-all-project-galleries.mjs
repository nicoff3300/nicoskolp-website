import fs from 'fs';
import path from 'path';

const projectConfigs = [
  {
    slug: 'trust-taranto',
    srcDir: '/Volumes/SSD_Skolp/Skolp/ARTE_URBANA/2021_Taranto_Trust/Low',
    files: [
      'DJI_0892-HDR-2.jpg',
      'DJI_0908-HDR.jpg',
      'DJI_0911-HDR.jpg',
      'DJI_0917-HDR.jpg',
      'DJI_0920-HDR.jpg',
      'DJI_0929.jpg',
      'DJI_0938.jpg',
      'DJI_0969-HDR.jpg',
      '_SM_6348.jpg',
    ],
  },
  {
    slug: 'rore-festival-rovigo',
    srcDir: '/Volumes/SSD_Skolp/Skolp/ARTE_URBANA/2021_Rovigo_RoreFestival/Comunicato/Foto',
    files: [
      'Skolp_Rovigo_48_drone_1.jpg',
      'Skolp_Rovigo_48_drone_2.jpg',
      'Skolp_Rovigo_48_drone_5.jpg',
      'Skolp_Rovigo_48_drone_6.jpg',
      'Skolp_Rovigo_48_dettagli_2.jpg',
      'Skolp_Rovigo_48_dettagli_3.jpg',
      'Skolp_Rovigo_48_dettagli_4.jpg',
      'Skolp_Rovigo_48_dettagli_6.jpg',
      'Skolp_Rovigo_48_dettagli_7.jpg',
      'Skolp_Rovigo_48_dettagli_8.jpg',
    ],
  },
  {
    slug: 'sanpaolo',
    srcDir: '/Volumes/SSD_Skolp/Skolp/ARTE_URBANA/2022_Bari_SanPaolo/SanPaolo/SanPaolofoto_big/low',
    files: [
      ' Skolp_sanpaolo_1.jpg',
      'Skolp_sanpaolo_2.jpg',
      'Skolp_sanpaolo_3a.jpg',
    ],
  },
  {
    slug: 'skolp-basketball-court-matera-2019',
    srcDir: '/Volumes/SSD_Skolp/Skolp/ARTE_URBANA/2019_Matera_Uisp/foto_lavoro/SELEZIONE_RO',
    files: [
      '_V3A6463_low.jpg',
      '_V3A6553_low.jpg',
      '_V3A6583_low.jpg',
      '_V3A6630_low.jpg',
      '_V3A6710_low.jpg',
      '_V3A6727_low.jpg',
      '_V3A6443.JPG',
      '_V3A6455.JPG',
      '_V3A6458.JPG',
      '_V3A6459.JPG',
      '_V3A6471.JPG',
      '_V3A6474.JPG',
      '_V3A6475.JPG',
      '_V3A6496.JPG',
    ],
  },
  {
    slug: 'graffiti-factory',
    srcDir: '/Volumes/SSD_Skolp/Skolp/ARTE_URBANA/2019_Corato_GraffitiFactory',
    files: [
      'GraffitiFactory_1.jpg',
      'GraffitiFactory_2.jpg',
      'GraffitiFactory_3.jpg',
      'GraffitiFactory_5.jpg',
      'GraffitiFactory_6.jpg',
      'GraffitiFactory_7.jpg',
      'GraffitiFactory_8.jpg',
      'GraffitiFactory_9.jpg',
      'GraffitiFactory_11.jpg',
      'GraffitiFactory_12.jpg',
      'GraffitiFactory_Interno1.jpg',
      'GraffitiFactory_Interno3.jpg',
    ],
  },
  {
    slug: 'ex-fadda',
    srcDir: '/Volumes/SSD_Skolp/Skolp/ARTE_URBANA/2019_SanVito_Exfadda',
    files: [
      '2019_Exfadda1.jpg',
      '2019_Exfadda3.jpg',
      '2019_Exfadda4.jpg',
      '2019_Exfadda5.jpg',
    ],
  },
  {
    slug: 'mottola',
    srcDir: '/Volumes/SSD_Skolp/Skolp/ARTE_URBANA/2019_Mottola_Festival',
    files: [
      '2019_mottola1.jpg',
      '2019_mottola2.jpg',
      '2019_mottola3.jpg',
      '2019_mottola5.jpg',
      '2019_mottola6.jpg',
      '2019_mottola7.jpg',
    ],
  },
  {
    slug: 'roma-binario18',
    srcDir: '/Volumes/SSD_Skolp/Skolp/ARTE_URBANA/2019_Roma_Binario18',
    files: [
      'BINARIO.18-1.jpg',
      'BINARIO.18-155.jpg',
      'BINARIO.18-165.jpg',
      'BINARIO.18-79.jpg',
      'BINARIO.18-80.jpg',
    ],
  },
  {
    slug: 'expost-moderno',
    srcDir: '/Volumes/SSD_Skolp/Skolp/ARTE_URBANA/2017_Expost',
    files: [
      'Expost1.jpg',
      'Expost2.jpg',
      'Expost3.jpg',
      'Expost4.jpg',
      'Expost5.jpg',
    ],
  },
];

const publicArtJsonPath = 'src/data/public-art.json';
const publicArtData = JSON.parse(fs.readFileSync(publicArtJsonPath, 'utf8'));

for (const cfg of projectConfigs) {
  const destDir = path.join('public/images/public-art', cfg.slug);
  fs.mkdirSync(destDir, { recursive: true });

  const importedUrls = [];

  cfg.files.forEach((file, index) => {
    const srcPath = path.join(cfg.srcDir, file);
    const cleanFileName = file.trim().replace(/^_+/, '');
    const num = String(index + 1).padStart(2, '0');
    const targetName = `${num}_${cleanFileName.toLowerCase()}`;
    const destPath = path.join(destDir, targetName);

    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      const url = `/images/public-art/${cfg.slug}/${targetName}`;
      importedUrls.push(url);
      console.log(`[OK] [${cfg.slug}] ${targetName}`);
    } else {
      console.warn(`[NOT FOUND] ${srcPath}`);
    }
  });

  const proj = publicArtData.find((p) => p.slug === cfg.slug);
  if (proj && importedUrls.length > 0) {
    proj.galleryImages = importedUrls;
    console.log(`✓ Aggiornato ${cfg.slug} con ${importedUrls.length} immagini di galleria.`);
  }
}

fs.writeFileSync(publicArtJsonPath, JSON.stringify(publicArtData, null, 2) + '\n');
console.log('\nsrc/data/public-art.json salvato con successo!');
