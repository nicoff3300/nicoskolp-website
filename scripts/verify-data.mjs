import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

function checkImage(imgPath, origin) {
  if (!imgPath.startsWith('/')) {
    throw new Error(`[${origin}] Image path must start with '/': ${imgPath}`);
  }
  const fullPath = path.join(publicDir, imgPath.slice(1));
  if (!fs.existsSync(fullPath)) {
    throw new Error(`[${origin}] Image does not exist: ${imgPath} (resolved: ${fullPath})`);
  }
  const stat = fs.statSync(fullPath);
  if (stat.size === 0) {
    throw new Error(`[${origin}] Image file is empty: ${imgPath}`);
  }
}

// 1. Site config
console.log('Verifying site.json...');
const site = JSON.parse(fs.readFileSync(path.join(rootDir, 'src/data/site.json'), 'utf8'));
if (!site.name || !site.tagline || !site.subtagline || !Array.isArray(site.bio) || site.bio.length === 0) {
  throw new Error('Invalid site.json structure');
}
if (!site.social?.instagram || !site.social?.behance) {
  throw new Error('Missing social links in site.json');
}
if (!site.credits?.studioName || !site.credits?.collectiveName) {
  throw new Error('Missing credits in site.json');
}
console.log('✓ site.json valid');

// 2. Public Art
console.log('Verifying public-art.json...');
const publicArt = JSON.parse(fs.readFileSync(path.join(rootDir, 'src/data/public-art.json'), 'utf8'));
if (!Array.isArray(publicArt) || publicArt.length !== 22) {
  throw new Error(`Expected 22 public art projects, got ${publicArt.length}`);
}
for (const p of publicArt) {
  if (!p.id || !p.slug || !p.title || !p.coverImage || !Array.isArray(p.galleryImages)) {
    throw new Error(`Invalid project structure: ${JSON.stringify(p)}`);
  }
  checkImage(p.coverImage, `public-art cover ${p.id}`);
  for (const g of p.galleryImages) {
    checkImage(g, `public-art gallery ${p.id}`);
  }
}
console.log(`✓ public-art.json valid (22 projects, all images exist)`);

// 3. Graffiti
console.log('Verifying graffiti.json...');
const graffiti = JSON.parse(fs.readFileSync(path.join(rootDir, 'src/data/graffiti.json'), 'utf8'));
if (!Array.isArray(graffiti) || graffiti.length !== 25) {
  throw new Error(`Expected 25 graffiti pieces, got ${graffiti.length}`);
}
for (const g of graffiti) {
  if (!g.id || !g.title || !g.image) {
    throw new Error(`Invalid graffiti piece: ${JSON.stringify(g)}`);
  }
  checkImage(g.image, `graffiti ${g.id}`);
}
console.log(`✓ graffiti.json valid (25 pieces, all images exist)`);

// 4. Archive
console.log('Verifying archive.json...');
const archive = JSON.parse(fs.readFileSync(path.join(rootDir, 'src/data/archive.json'), 'utf8'));
if (!Array.isArray(archive) || archive.length < 20) {
  throw new Error(`Expected >= 20 archive pieces, got ${archive.length}`);
}
for (const a of archive) {
  if (!a.id || !a.year || !a.title || !a.image) {
    throw new Error(`Invalid archive item: ${JSON.stringify(a)}`);
  }
  checkImage(a.image, `archive ${a.id}`);
}
console.log(`✓ archive.json valid (${archive.length} items, all images exist)`);

// 5. Hero
console.log('Verifying hero.json...');
const hero = JSON.parse(fs.readFileSync(path.join(rootDir, 'src/data/hero.json'), 'utf8'));
if (!Array.isArray(hero) || hero.length !== 13) {
  throw new Error(`Expected 13 hero items, got ${hero.length}`);
}
for (const h of hero) {
  if (!h.id || !h.title || !h.image) {
    throw new Error(`Invalid hero item: ${JSON.stringify(h)}`);
  }
  checkImage(h.image, `hero ${h.id}`);
}
console.log(`✓ hero.json valid (13 items, all images exist)`);

// 6. Press
console.log('Verifying press.json...');
const press = JSON.parse(fs.readFileSync(path.join(rootDir, 'src/data/press.json'), 'utf8'));
if (!Array.isArray(press) || press.length === 0) {
  throw new Error(`Expected valid press articles array, got ${press.length}`);
}
for (const p of press) {
  if (!p.id || !p.title || !p.outlet || !p.quote || !p.url) {
    throw new Error(`Invalid press item: ${JSON.stringify(p)}`);
  }
}
console.log(`✓ press.json valid (${press.length} articles verified)`);

console.log('\nSUCCESS: All data files and referenced images are verified and valid!');
