import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

const errors = [];
const warnings = [];

function addError(message, details = null) {
  errors.push({ message, details });
}

function addWarning(message, details = null) {
  warnings.push({ message, details });
}

function getAttr(tagString, attrName) {
  const match = tagString.match(new RegExp(`\\b${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return match ? (match[1] ?? match[2] ?? match[3]) : null;
}

function walkDir(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

console.log('====================================================');
console.log('  NICO SKOLP PORTFOLIO - PRODUCTION BUILD AUDIT');
console.log('====================================================\n');

// --------------------------------------------------------------------------
// 1. Verify dist directory exists
// --------------------------------------------------------------------------
console.log('1. Checking dist directory existence...');
if (!fs.existsSync(distDir)) {
  console.error('FATAL: dist/ directory does not exist! Please run "npm run build" first.');
  process.exit(1);
}
console.log('   ✓ dist/ directory exists.\n');

// --------------------------------------------------------------------------
// 2. Verify all expected pages and critical files
// --------------------------------------------------------------------------
console.log('2. Verifying expected pages and critical static files...');

// Load public-art.json to get expected 22 slugs
const publicArtPath = path.join(rootDir, 'src/data/public-art.json');
if (!fs.existsSync(publicArtPath)) {
  addError(`Missing data file: ${publicArtPath}`);
}

let publicArtProjects = [];
try {
  publicArtProjects = JSON.parse(fs.readFileSync(publicArtPath, 'utf8'));
} catch (err) {
  addError(`Failed to parse public-art.json: ${err.message}`);
}

const expectedPages = [
  'index.html',
  'public-art/index.html',
  'graffiti/index.html',
  'about-me/index.html',
  'skolp-archive/index.html',
  'archive/index.html', // Legacy redirect page
  'contact.php',
  '.htaccess',
];

if (Array.isArray(publicArtProjects)) {
  for (const project of publicArtProjects) {
    if (project.slug) {
      expectedPages.push(`public-art/${project.slug}/index.html`); // Detail page
      expectedPages.push(`${project.slug}/index.html`); // Legacy redirect page
    }
  }
}

let checkedExpectedFilesCount = 0;
for (const relPath of expectedPages) {
  const fullPath = path.join(distDir, relPath);
  if (!fs.existsSync(fullPath)) {
    addError(`Missing expected file in dist: ${relPath}`);
  } else {
    const stat = fs.statSync(fullPath);
    if (stat.size === 0) {
      addError(`Expected file is empty in dist: ${relPath}`);
    } else {
      checkedExpectedFilesCount++;
    }
  }
}
console.log(`   ✓ All ${checkedExpectedFilesCount}/${expectedPages.length} expected files verified in dist/ (detail pages, legacy redirects, PHP backend, .htaccess).\n`);

// --------------------------------------------------------------------------
// 3. Inspect HTML files: images, links, styles, fonts, meta tags
// --------------------------------------------------------------------------
console.log('3. Inspecting HTML files for assets, links, and SEO metadata...');

const allFiles = walkDir(distDir);
const htmlFiles = allFiles.filter((f) => f.endsWith('.html'));

let totalImagesChecked = 0;
let totalStylesChecked = 0;
let totalFontsChecked = 0;
let totalLinksChecked = 0;
let primaryPagesChecked = 0;
let redirectPagesChecked = 0;

for (const htmlFile of htmlFiles) {
  const relHtml = path.relative(distDir, htmlFile);
  const content = fs.readFileSync(htmlFile, 'utf8');
  const isRedirect = content.includes('<meta http-equiv="refresh"');

  if (isRedirect) {
    redirectPagesChecked++;
    // Verify redirect structure
    const refreshMeta = content.match(/<meta[^>]+http-equiv=["']refresh["'][^>]*content=["']([^"']+)["']/i);
    if (!refreshMeta) {
      addError(`Redirect page missing valid refresh meta: ${relHtml}`);
    }
    const hasCanonical = /<link[^>]+rel=["']canonical["']/i.test(content);
    if (!hasCanonical) {
      addWarning(`Redirect page missing canonical tag: ${relHtml}`);
    }
  } else {
    primaryPagesChecked++;
    // Verify SEO meta tags on primary pages
    const titleMatch = content.match(/<title>([^<]+)<\/title>/i);
    if (!titleMatch || !titleMatch[1].trim()) {
      addError(`Missing or empty <title> tag in: ${relHtml}`);
    }

    const metaMatches = [...content.matchAll(/<meta\b([^>]*)>/gi)];
    const metas = metaMatches.map((m) => ({
      name: getAttr(m[1], 'name'),
      property: getAttr(m[1], 'property'),
      content: getAttr(m[1], 'content'),
    }));

    const descMeta = metas.find((m) => m.name && m.name.toLowerCase() === 'description');
    if (!descMeta || !descMeta.content || !descMeta.content.trim()) {
      addError(`Missing or empty <meta name="description"> in: ${relHtml}`);
    }

    const canonicalMatch = content.match(/<link\b([^>]*)>/gi);
    let hasCanonical = false;
    if (canonicalMatch) {
      for (const linkTag of canonicalMatch) {
        const rel = getAttr(linkTag, 'rel');
        const href = getAttr(linkTag, 'href');
        if (rel && rel.toLowerCase() === 'canonical' && href && href.trim()) {
          hasCanonical = true;
          break;
        }
      }
    }
    if (!hasCanonical) {
      addError(`Missing <link rel="canonical"> in: ${relHtml}`);
    }

    // OpenGraph tags
    const ogTitle = metas.find((m) => m.property && m.property.toLowerCase() === 'og:title');
    const ogDesc = metas.find((m) => m.property && m.property.toLowerCase() === 'og:description');
    const ogImage = metas.find((m) => m.property && m.property.toLowerCase() === 'og:image');
    const ogUrl = metas.find((m) => m.property && m.property.toLowerCase() === 'og:url');

    if (!ogTitle || !ogTitle.content) {
      addError(`Missing og:title meta tag in: ${relHtml}`);
    }
    if (!ogDesc || !ogDesc.content) {
      addError(`Missing og:description meta tag in: ${relHtml}`);
    }
    if (!ogImage || !ogImage.content) {
      addError(`Missing og:image meta tag in: ${relHtml}`);
    }
    if (!ogUrl || !ogUrl.content) {
      addError(`Missing og:url meta tag in: ${relHtml}`);
    }

    // Twitter card tags
    const twCard = metas.find((m) => m.name && m.name.toLowerCase() === 'twitter:card');
    const twTitle = metas.find((m) => m.name && m.name.toLowerCase() === 'twitter:title');
    const twDesc = metas.find((m) => m.name && m.name.toLowerCase() === 'twitter:description');
    const twImage = metas.find((m) => m.name && m.name.toLowerCase() === 'twitter:image');

    if (!twCard || !twCard.content) {
      addError(`Missing twitter:card meta tag in: ${relHtml}`);
    }
    if (!twTitle || !twTitle.content) {
      addError(`Missing twitter:title meta tag in: ${relHtml}`);
    }
    if (!twDesc || !twDesc.content) {
      addError(`Missing twitter:description meta tag in: ${relHtml}`);
    }
    if (!twImage || !twImage.content) {
      addError(`Missing twitter:image meta tag in: ${relHtml}`);
    }

    // Verify og:image target exists locally if site-local URL and is non-empty
    if (ogImage?.content) {
      let imgTarget = ogImage.content;
      if (imgTarget.startsWith('https://nicoskolp.com/')) {
        imgTarget = imgTarget.replace('https://nicoskolp.com', '');
      } else if (imgTarget.startsWith('https://www.nicoskolp.com/')) {
        imgTarget = imgTarget.replace('https://www.nicoskolp.com', '');
      }
      if (imgTarget.startsWith('/')) {
        const ogImagePath = path.join(distDir, imgTarget.split('?')[0].split('#')[0]);
        if (!fs.existsSync(ogImagePath)) {
          addError(`og:image file does not exist: ${ogImage.content} in ${relHtml}`);
        } else if (fs.statSync(ogImagePath).size === 0) {
          addError(`og:image file is empty (0 bytes): ${ogImage.content} in ${relHtml}`);
        }
      }
    }
  }

  // Check <img> tags
  const imgTags = [...content.matchAll(/<img\b([^>]*)>/gi)];
  for (const match of imgTags) {
    totalImagesChecked++;
    const src = getAttr(match[1], 'src');
    if (!src) {
      addError(`<img> tag without src in: ${relHtml} -> ${match[0]}`);
      continue;
    }

    if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) {
      continue;
    }

    const cleanSrc = src.split('?')[0].split('#')[0];
    let resolvedImgPath;
    if (cleanSrc.startsWith('/')) {
      resolvedImgPath = path.join(distDir, cleanSrc.slice(1));
    } else {
      resolvedImgPath = path.resolve(path.dirname(htmlFile), cleanSrc);
    }

    if (!fs.existsSync(resolvedImgPath)) {
      addError(`Broken image src: "${src}" in ${relHtml} (resolved to: ${resolvedImgPath})`);
    } else {
      const stat = fs.statSync(resolvedImgPath);
      if (stat.size === 0) {
        addError(`Image file is 0 bytes: "${src}" in ${relHtml}`);
      }
    }
  }

  // Check <link> tags (stylesheets, fonts, icons)
  const linkTags = [...content.matchAll(/<link\b([^>]*)>/gi)];
  for (const match of linkTags) {
    const rel = getAttr(match[1], 'rel');
    const href = getAttr(match[1], 'href');
    const as = getAttr(match[1], 'as');

    if (!href) continue;

    // Check stylesheets
    if (rel && rel.toLowerCase() === 'stylesheet') {
      totalStylesChecked++;
      if (!href.startsWith('http://') && !href.startsWith('https://')) {
        const cleanHref = href.split('?')[0].split('#')[0];
        const resolvedPath = cleanHref.startsWith('/')
          ? path.join(distDir, cleanHref.slice(1))
          : path.resolve(path.dirname(htmlFile), cleanHref);

        if (!fs.existsSync(resolvedPath)) {
          addError(`Broken stylesheet href: "${href}" in ${relHtml}`);
        } else if (fs.statSync(resolvedPath).size === 0) {
          addError(`Stylesheet file is empty: "${href}" in ${relHtml}`);
        }
      }
    }

    // Check font preloads
    if ((as && as.toLowerCase() === 'font') || /\.(woff2?|ttf|otf|eot)(\?.*)?$/i.test(href)) {
      totalFontsChecked++;
      if (!href.startsWith('http://') && !href.startsWith('https://')) {
        const cleanHref = href.split('?')[0].split('#')[0];
        const resolvedPath = cleanHref.startsWith('/')
          ? path.join(distDir, cleanHref.slice(1))
          : path.resolve(path.dirname(htmlFile), cleanHref);

        if (!fs.existsSync(resolvedPath)) {
          addError(`Broken font preload href: "${href}" in ${relHtml}`);
        } else if (fs.statSync(resolvedPath).size === 0) {
          addError(`Font file is empty: "${href}" in ${relHtml}`);
        }
      }
    }

    // Check favicon / icons
    if (rel && (rel.toLowerCase().includes('icon'))) {
      if (!href.startsWith('http://') && !href.startsWith('https://')) {
        const cleanHref = href.split('?')[0].split('#')[0];
        const resolvedPath = cleanHref.startsWith('/')
          ? path.join(distDir, cleanHref.slice(1))
          : path.resolve(path.dirname(htmlFile), cleanHref);

        if (!fs.existsSync(resolvedPath)) {
          addError(`Broken icon href: "${href}" in ${relHtml}`);
        }
      }
    }
  }

  // Check <a> internal links
  const aTags = [...content.matchAll(/<a\b([^>]*)>/gi)];
  for (const match of aTags) {
    const href = getAttr(match[1], 'href');
    if (!href) continue;

    // Ignore anchors, external, protocols
    if (
      href.startsWith('#') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('javascript:')
    ) {
      continue;
    }

    if (href.startsWith('http://') || href.startsWith('https://')) {
      // If external domain, skip
      if (!href.startsWith('https://nicoskolp.com') && !href.startsWith('https://www.nicoskolp.com')) {
        continue;
      }
    }

    totalLinksChecked++;

    let pathOnly = href;
    if (pathOnly.startsWith('https://www.nicoskolp.com')) {
      pathOnly = pathOnly.replace('https://www.nicoskolp.com', '');
      if (!pathOnly) pathOnly = '/';
    } else if (pathOnly.startsWith('https://nicoskolp.com')) {
      pathOnly = pathOnly.replace('https://nicoskolp.com', '');
      if (!pathOnly) pathOnly = '/';
    }

    // Strip hash and query
    pathOnly = pathOnly.split('#')[0].split('?')[0];
    if (!pathOnly) continue;

    // Check if target file/directory exists
    let candidatePaths = [];
    if (pathOnly.startsWith('/')) {
      const trimmed = pathOnly.slice(1);
      candidatePaths = [
        path.join(distDir, trimmed),
        path.join(distDir, trimmed, 'index.html'),
        path.join(distDir, `${trimmed}.html`),
      ];
      if (trimmed === '') {
        candidatePaths = [path.join(distDir, 'index.html')];
      }
    } else {
      const fileDir = path.dirname(htmlFile);
      candidatePaths = [
        path.resolve(fileDir, pathOnly),
        path.resolve(fileDir, pathOnly, 'index.html'),
        path.resolve(fileDir, `${pathOnly}.html`),
      ];
    }

    const exists = candidatePaths.some((p) => {
      if (!fs.existsSync(p)) return false;
      const stat = fs.statSync(p);
      if (stat.isDirectory()) {
        return fs.existsSync(path.join(p, 'index.html'));
      }
      return true;
    });
    if (!exists) {
      addError(`Broken internal link: "${href}" in ${relHtml}`);
    }
  }
}

console.log(`   ✓ Audited ${htmlFiles.length} HTML files (${primaryPagesChecked} primary, ${redirectPagesChecked} redirects).`);
console.log(`   ✓ Checked ${totalImagesChecked} image occurrences (all resolved to existing non-empty files).`);
console.log(`   ✓ Checked ${totalStylesChecked} stylesheet links and ${totalFontsChecked} font preloads.`);
console.log(`   ✓ Checked ${totalLinksChecked} internal navigation links (all resolved without broken targets).\n`);

// --------------------------------------------------------------------------
// 4. Verify CSS font assets declared in fonts.css and compiled stylesheets
// --------------------------------------------------------------------------
console.log('4. Verifying CSS font references and assets integrity...');

const cssFiles = allFiles.filter((f) => f.endsWith('.css'));
let cssFontUrlsChecked = 0;

for (const cssFile of cssFiles) {
  const cssContent = fs.readFileSync(cssFile, 'utf8');
  const urlMatches = [...cssContent.matchAll(/url\(([^)]+)\)/g)];
  for (const match of urlMatches) {
    let url = match[1].trim().replace(/^['"]|['"]$/g, '');
    if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
      continue;
    }
    cssFontUrlsChecked++;
    const cleanUrl = url.split('#')[0].split('?')[0];
    let resolved;
    if (cleanUrl.startsWith('/')) {
      resolved = path.join(distDir, cleanUrl.slice(1));
    } else {
      resolved = path.resolve(path.dirname(cssFile), cleanUrl);
    }

    if (!fs.existsSync(resolved)) {
      addError(`CSS references missing asset: "${url}" in ${path.relative(distDir, cssFile)}`);
    } else if (fs.statSync(resolved).size === 0) {
      addError(`CSS asset is empty: "${url}" in ${path.relative(distDir, cssFile)}`);
    }
  }
}
console.log(`   ✓ Checked ${cssFontUrlsChecked} asset URLs in ${cssFiles.length} CSS files.\n`);

// --------------------------------------------------------------------------
// 5. Final Report & Exit
// --------------------------------------------------------------------------
console.log('====================================================');
console.log('                 AUDIT SUMMARY');
console.log('====================================================');
console.log(`Total HTML files audited:        ${htmlFiles.length}`);
console.log(`Total images checked:            ${totalImagesChecked}`);
console.log(`Total stylesheets & fonts:       ${totalStylesChecked + totalFontsChecked + cssFontUrlsChecked}`);
console.log(`Total internal links checked:    ${totalLinksChecked}`);
console.log(`Warnings:                        ${warnings.length}`);
console.log(`Errors:                          ${errors.length}`);
console.log('----------------------------------------------------');

if (warnings.length > 0) {
  console.log('\nWarnings:');
  for (const w of warnings) {
    console.warn(` [WARN] ${w.message}`);
  }
}

if (errors.length > 0) {
  console.error('\nFAIL: Site audit found errors:\n');
  for (const e of errors) {
    console.error(` [ERROR] ${e.message}`);
  }
  console.error(`\nAudit failed with ${errors.length} error(s).`);
  process.exit(1);
}

console.log('\nSUCCESS: Site audit passed with 0 errors! Production build is fully verified.');
process.exit(0);
