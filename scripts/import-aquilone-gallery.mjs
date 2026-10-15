import fs from 'fs';
import path from 'path';

// Helper per determinare larghezza e altezza da un JPEG buffer senza librerie esterne
function getJpegDimensions(buffer) {
  let offset = 2; // Salta il SOI marker 0xFFD8
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) break;
    const marker = buffer[offset + 1];
    // Marcatori SOF: SOF0 (0xC0) a SOF15 (0xCF), escluso SOF4 (DHT 0xC4), SOF8, SOF12
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);
      return { width, height };
    }
    const length = buffer.readUInt16BE(offset + 2);
    offset += 2 + length;
  }
  return null;
}

const srcDir = '/Volumes/SSD_Skolp/Skolp/ARTE_URBANA/2022_Carosino_CantiereAquilone/Foto_carosino/Carosino_export/Low';
const destDir = 'public/images/public-art/teatro-aquilone';

fs.mkdirSync(destDir, { recursive: true });

// Lista delle 20 foto per Teatroaquilone corrispondenti alla sequenza Wix
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

const results = [];

photos.forEach((file, index) => {
  const srcPath = path.join(srcDir, file);
  const num = String(index + 1).padStart(2, '0');
  const targetName = `${num}_${file}`;
  const destPath = path.join(destDir, targetName);

  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    const buf = fs.readFileSync(destPath);
    const dims = getJpegDimensions(buf);
    const ratio = dims ? dims.width / dims.height : 1;
    let orientation = 'landscape';
    if (ratio < 0.9) orientation = 'portrait';
    else if (ratio >= 0.9 && ratio <= 1.1) orientation = 'square';

    const info = {
      index: index + 1,
      name: targetName,
      url: `/images/public-art/teatro-aquilone/${targetName}`,
      width: dims ? dims.width : undefined,
      height: dims ? dims.height : undefined,
      orientation,
    };
    results.push(info);
    console.log(`[OK] ${targetName} (${dims?.width}x${dims?.height}, ${orientation})`);
  } else {
    console.warn(`[NOT FOUND] ${srcPath}`);
  }
});

console.log(`\nImportate ${results.length} foto in ${destDir}`);
console.log(JSON.stringify(results, null, 2));
