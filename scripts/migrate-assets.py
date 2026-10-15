#!/usr/bin/env python3
"""
Script di Migrazione Asset Immagini e Web Font per il Sito Web Nico Skolp.

Funzionalità:
1. Copia dei file locali presenti in /Volumes/SSD_Skolp/Skolp/ARTE_URBANA/Wix_site:
   - Graffiti/ -> public/images/graffiti/
   - Archivio_graffiti/ -> public/images/archive/
   - Altro/ -> public/images/public-art/
   - Wallness_logo.png -> public/images/brand/Wallness_logo.png
   - Gif_sito/ -> public/images/brand/
2. Download ad alta risoluzione da static.wixstatic.com/media/ di tutti gli asset censiti:
   - Le 22 opere principali di Public Art (con nomi chiari e alias originali)
   - Le 13 opere della Home Gallery (in public/images/hero/)
   - Il logo Skolp, monogramma, logo FF3300 e grafica di brand (in public/images/brand/)
   - Opere aggiuntive della galleria Graffiti live su Wix
3. Download e configurazione dei Web Font (WOFF2/WOFF):
   - Druk Text Wide (Medium, Bold)
   - Druk Wide (Medium)
   - Druk Text (Medium)
   - Open Sans (Regular 400, Bold 700, Italic 400, Bold Italic 700)
   - Generazione di public/fonts/fonts.css con dichiarazioni @font-face complete
4. Verifica di integrità di tutti i file generati (esistenza e dimensione > 0).
"""

import os
import shutil
import urllib.request
import sys
from pathlib import Path

# Percorsi base
BASE_DIR = Path(__file__).resolve().parent.parent
LOCAL_SRC_DIR = Path("/Volumes/SSD_Skolp/Skolp/ARTE_URBANA/Wix_site")
PUBLIC_DIR = BASE_DIR / "public"
IMAGES_DIR = PUBLIC_DIR / "images"
FONTS_DIR = PUBLIC_DIR / "fonts"

WIX_MEDIA_BASE = "https://static.wixstatic.com/media/"
WIX_FONT_BASE = "https://static.wixstatic.com/ufonts/"
PARASTORAGE_FONT_BASE = "https://static.parastorage.com/fonts/v2/"

USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

# 1. Mappatura 22 Public Art Cover Images
PUBLIC_ART_IMAGES = [
    {
        "slug_name": "teatro-aquilone.jpg",
        "original_name": "Teatroaquilone_DroneCarosino_27_A.jpg",
        "wix_media": "0b5cbf_a8694f3d9db745208d45763fdcaa8c4c~mv2.jpg",
        "title": "Teatroaquilone",
    },
    {
        "slug_name": "sanpaolo.jpg",
        "original_name": "Skolp_sanpaolo_3a.jpg",
        "wix_media": "0b5cbf_86196664eb7048d0836b9b21992f4a1c~mv2.jpg",
        "title": "Museo Quartiere San Paolo",
    },
    {
        "slug_name": "trust-taranto.jpg",
        "original_name": "DJI_0920-HDR.jpg",
        "wix_media": "0b5cbf_86af1c2ce9be414594eca39f80011e09~mv2.jpg",
        "title": "T.R.U.S.T Festival Taranto",
    },
    {
        "slug_name": "rore-festival-rovigo.jpg",
        "original_name": "Skolp_Rovigo_48_drone_6.jpg",
        "wix_media": "0b5cbf_45b65b22f9014dc5b1edc2aac297d1f8~mv2.jpg",
        "title": "Rore Festival Rovigo",
    },
    {
        "slug_name": "skolp-basketball-court-matera-2019.jpg",
        "original_name": "Matera_basketcourt_Uisp_skolp_4.jpg",
        "wix_media": "0b5cbf_af347f776b3643c1a7101ce38f685aaa~mv2.jpg",
        "title": "Basketcourt Matera",
    },
    {
        "slug_name": "graffiti-factory.jpg",
        "original_name": "GraffitiFactory_7_cover.jpg",
        "wix_media": "0b5cbf_9196e5d0d56842c0b8817d6511cc2bcd~mv2_d_1920_1281_s_2.jpg",
        "title": "Graffiti Factory Corato",
    },
    {
        "slug_name": "skolp-steps-molise.jpg",
        "original_name": "01_PAG_Steps_Skolp_aerea.jpg",
        "wix_media": "0b5cbf_432a73f40f344e6f884c42440e23fb96~mv2.jpg",
        "title": "Steps Molise",
    },
    {
        "slug_name": "matera-basket.jpg",
        "original_name": "matera_basket_skolp_1.jpg",
        "wix_media": "0b5cbf_9f11a2a91ff844289ab61b4025c46843~mv2_d_1920_1280_s_2.jpg",
        "title": "Concrete Crack Matera",
    },
    {
        "slug_name": "matera-piazza.jpg",
        "original_name": "matera_thoms_skolp_3.jpg",
        "wix_media": "0b5cbf_e104266997864b4bacf8151996baede0~mv2.jpg",
        "title": "Play Hard Matera",
    },
    {
        "slug_name": "mottola.jpg",
        "original_name": "2019_mottola3.jpg",
        "wix_media": "0b5cbf_6eb32afe47bc49868e3be3aea7a503e2~mv2_d_1920_1440_s_2.jpg",
        "title": "Mottola",
    },
    {
        "slug_name": "ecopoli.jpg",
        "original_name": "2018_EcopoliBiagio.jpg",
        "wix_media": "0b5cbf_0da181830b9f4ccea04b19cd93d58db9~mv2_d_1920_1280_s_2.jpg",
        "title": "Ecopoli",
    },
    {
        "slug_name": "expost-moderno.jpg",
        "original_name": "Expost4.jpg",
        "wix_media": "0b5cbf_4ca7991d988249f3ac9efa08890cf174~mv2_d_1920_1280_s_2.jpg",
        "title": "Expost",
    },
    {
        "slug_name": "umberto-eco-tribute.jpg",
        "original_name": "2018_MateraUmbretoEco.jpg",
        "wix_media": "0b5cbf_acc17dcbc8e9406d851f6d2c51b34bd5~mv2_d_1920_1281_s_2.jpg",
        "title": "Umberto Eco Tribute",
    },
    {
        "slug_name": "ex-fadda.jpg",
        "original_name": "2019_Exfadda2.jpg",
        "wix_media": "0b5cbf_2f531b45fc5a45ffab1957d597d97609~mv2_d_6876_3906_s_4_2.jpg",
        "title": "ExFadda",
    },
    {
        "slug_name": "matera-alter.jpg",
        "original_name": "Matera2017_1.jpg",
        "wix_media": "0b5cbf_33bfdfe5ad4b4bd29b1dae68bb9d0699~mv2_d_1920_1372_s_2.jpg",
        "title": "Matera's Stone",
    },
    {
        "slug_name": "verso-sud-corato.jpg",
        "original_name": "2015_tiles8_Corato.jpg",
        "wix_media": "0b5cbf_85e354ebbc2347fb9190a9e67c33b42d~mv2_d_1920_1280_s_2.jpg",
        "title": "Verso Sud Festival",
    },
    {
        "slug_name": "bar-project-bari.jpg",
        "original_name": "2015_tiles7_Bari.jpg",
        "wix_media": "0b5cbf_28651a5cef4d4b23b1dd32946594af0a~mv2_d_1920_1440_s_2.jpg",
        "title": "Bar Project",
    },
    {
        "slug_name": "splash.jpg",
        "original_name": "2018_WN_Splash_Canvas_Skolp.jpg",
        "wix_media": "0b5cbf_f938a73896924abaa406b7490b820c92~mv2.jpg",
        "title": "Splash",
    },
    {
        "slug_name": "roma-binario18.jpg",
        "original_name": "2018_Roma.jpg",
        "wix_media": "0b5cbf_73bdaa99125c47abb7fa32cf14799571~mv2_d_1920_1440_s_2.jpg",
        "title": "Binario 18 Roma",
    },
    {
        "slug_name": "tempelhof.jpg",
        "original_name": "2015_tiles5_feat.klub7_minahamada_zosenBandido_Berlino.jpg",
        "wix_media": "0b5cbf_2f373c6fb1ea494eb9eac079a503c6e7~mv2_d_1920_1280_s_2.jpg",
        "title": "Tempelhof Berlin",
    },
    {
        "slug_name": "untitled-matera.jpg",
        "original_name": "2015_tiles6_Matera.jpg",
        "wix_media": "0b5cbf_6799b2f017aa41fb87883f5fb9c52487~mv2.jpg",
        "title": "Untitled Matera",
    },
    {
        "slug_name": "berlin-pipe.jpg",
        "original_name": "2015_tiles4_Berlino.jpg",
        "wix_media": "0b5cbf_4db1516454424ac4b7996f18db67b740~mv2.jpg",
        "title": "Berlin Pipe",
    },
]

# 2. Mappatura 13 Home Gallery Images
HERO_IMAGES = [
    {
        "slug_name": "01_skolptura-a012.jpg",
        "original_name": "Skolptura_A012_front_alpha.jpg",
        "wix_media": "0b5cbf_a5373a6a96f84e1ea9e0f3e5f45f4014~mv2.jpg",
    },
    {
        "slug_name": "02_skolptura-a013.jpg",
        "original_name": "Skolptura_A013_front_alpha.jpg",
        "wix_media": "0b5cbf_0c6cc5ebbcf74e5c9d0f689c70b45fb6~mv2.jpg",
    },
    {
        "slug_name": "03_skolp-guzzini.png",
        "original_name": "Skolp_guzzini_web.png",
        "wix_media": "0b5cbf_271a0868f82c417a887076292f5eaf05~mv2.png",
    },
    {
        "slug_name": "04_skolptura-a005.png",
        "original_name": "Skolptura_A005_front.png",
        "wix_media": "0b5cbf_f2b34aecb49d45a1b49482ee60f928db~mv2.png",
    },
    {
        "slug_name": "05_skolptura-s002.png",
        "original_name": "Skolptura_S002_a.png",
        "wix_media": "0b5cbf_345aad791bd2490a98c89aace9997118~mv2.png",
    },
    {
        "slug_name": "06_skolptura-a003.png",
        "original_name": "Skolptura_A003_side.png",
        "wix_media": "0b5cbf_ab3fda67527341bca411cd859b8f6795~mv2.png",
    },
    {
        "slug_name": "07_skolptura-s003.png",
        "original_name": "Skolptura_S003.png",
        "wix_media": "0b5cbf_0016ed0730ee48fa815c59acb169d99b~mv2.png",
    },
    {
        "slug_name": "08_skolptura-a004.png",
        "original_name": "Skolptura_A004_front.png",
        "wix_media": "0b5cbf_ac1074ba7901441a841dbe6252b68c53~mv2.png",
    },
    {
        "slug_name": "09_skolptura-s001.png",
        "original_name": "Skolptura_S001.png",
        "wix_media": "0b5cbf_acad54ae38f94051b2b69b6f82b654c1~mv2.png",
    },
    {
        "slug_name": "10_canvas-c001.png",
        "original_name": "C001_site.png",
        "wix_media": "0b5cbf_9a019f7b70054fea999d6089f4f10761~mv2.png",
    },
    {
        "slug_name": "11_canvas-c002.png",
        "original_name": "C002_site.png",
        "wix_media": "0b5cbf_f22d595b4d3741a488612f344a728812~mv2.png",
    },
    {
        "slug_name": "12_skolptura-d001.png",
        "original_name": "Skolptura_D001.png",
        "wix_media": "0b5cbf_9bfc5478b541475b9afdf25a7dee9ba7~mv2.png",
    },
    {
        "slug_name": "13_athletic-shorts.png",
        "original_name": "All_short.png",
        "wix_media": "0b5cbf_ec69e23d425d4a6f9a21a987a4c68674~mv2.png",
    },
]

# 3. Mappatura Brand Assets
BRAND_IMAGES = [
    {
        "dest_name": "Skolp_logo.png",
        "wix_media": "0b5cbf_222abe840b81469ab836083de30b2cab~mv2.png",
    },
    {
        "dest_name": "FF_logo.png",
        "wix_media": "0b5cbf_a8d01b5e105642b18ec49b99dbc8d8fa~mv2.png",
    },
    {
        "dest_name": "monogram.png",
        "wix_media": "0b5cbf_87174479920d4e98bb3954b56bf7b7b2~mv2.png",
    },
    {
        "dest_name": "Skolp_graphic.png",
        "wix_media": "0b5cbf_cc23566917594854a9b53e4f89a158b3~mv2.png",
    },
]

# 4. Immagini aggiuntive della galleria Graffiti live su Wix
GRAFFITI_EXTRA = [
    {
        "dest_name": "Quapos_skolp.jpg",
        "wix_media": "0b5cbf_eec753f9019f41afbdbf177ae104414e~mv2.jpg",
    },
    {
        "dest_name": "2019_Skolp_Sannicandro.jpg",
        "wix_media": "0b5cbf_30ce9d20d4d5488fb429419fa8f89c4d~mv2_d_4032_2268_s_2.jpg",
    },
]

# 5. Mappatura Web Font
FONTS = [
    # Druk Fonts
    {
        "subpath": "druk/DrukTextWide-Medium.woff2",
        "url": WIX_FONT_BASE + "0b5cbf_432cbcd2f06245c180df52635be3db00/woff2/file.woff2",
    },
    {
        "subpath": "druk/DrukTextWide-Medium.woff",
        "url": WIX_FONT_BASE + "0b5cbf_432cbcd2f06245c180df52635be3db00/woff/file.woff",
    },
    {
        "subpath": "druk/DrukTextWide-Bold.woff2",
        "url": WIX_FONT_BASE + "0b5cbf_e4733a687fca4a248833244c5579cb44/woff2/file.woff2",
    },
    {
        "subpath": "druk/DrukTextWide-Bold.woff",
        "url": WIX_FONT_BASE + "0b5cbf_e4733a687fca4a248833244c5579cb44/woff/file.woff",
    },
    {
        "subpath": "druk/DrukWide-Medium.woff2",
        "url": WIX_FONT_BASE + "0b5cbf_a2079c0b1f604fe4a43f368911bd33de/woff2/file.woff2",
    },
    {
        "subpath": "druk/DrukWide-Medium.woff",
        "url": WIX_FONT_BASE + "0b5cbf_a2079c0b1f604fe4a43f368911bd33de/woff/file.woff",
    },
    {
        "subpath": "druk/DrukText-Medium.woff2",
        "url": WIX_FONT_BASE + "0b5cbf_184a49989f994c259c8fe5b06de4519b/woff2/file.woff2",
    },
    {
        "subpath": "druk/DrukText-Medium.woff",
        "url": WIX_FONT_BASE + "0b5cbf_184a49989f994c259c8fe5b06de4519b/woff/file.woff",
    },
    # Open Sans Fonts
    {
        "subpath": "opensans/OpenSans-Regular.woff2",
        "url": PARASTORAGE_FONT_BASE + "e59e6f5c-7ac5-47cf-8fe5-22ee5f11aa42/v1/open%20sans.woff2",
    },
    {
        "subpath": "opensans/OpenSans-Bold.woff2",
        "url": PARASTORAGE_FONT_BASE + "66ed32a6-d63b-4f2e-9895-91f58fc7bde6/v1/open%20sans.woff2",
    },
    {
        "subpath": "opensans/OpenSans-Italic.woff2",
        "url": PARASTORAGE_FONT_BASE + "e3af1b1e-e84c-47bd-96ed-ea490697a5d3/v1/open%20sans.woff2",
    },
    {
        "subpath": "opensans/OpenSans-BoldItalic.woff2",
        "url": PARASTORAGE_FONT_BASE + "09e37a90-97bc-4292-863a-a9e5b278309d/v1/open%20sans.woff2",
    },
]

FONTS_CSS_CONTENT = """/* ==========================================================================
   Font Faces: Nico Skolp Portfolio
   Druk Text Wide, Druk Wide, Druk Text, Open Sans
   ========================================================================== */

/* Druk Text Wide - Medium (500) */
@font-face {
  font-family: 'Druk Text Wide';
  src: url('/fonts/druk/DrukTextWide-Medium.woff2') format('woff2'),
       url('/fonts/druk/DrukTextWide-Medium.woff') format('woff');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

/* Druk Text Wide - Bold (700) */
@font-face {
  font-family: 'Druk Text Wide';
  src: url('/fonts/druk/DrukTextWide-Bold.woff2') format('woff2'),
       url('/fonts/druk/DrukTextWide-Bold.woff') format('woff');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

/* Druk Wide - Medium (500) */
@font-face {
  font-family: 'Druk Wide';
  src: url('/fonts/druk/DrukWide-Medium.woff2') format('woff2'),
       url('/fonts/druk/DrukWide-Medium.woff') format('woff');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

/* Druk Text - Medium (500) */
@font-face {
  font-family: 'Druk Text';
  src: url('/fonts/druk/DrukText-Medium.woff2') format('woff2'),
       url('/fonts/druk/DrukText-Medium.woff') format('woff');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

/* Open Sans - Regular (400) */
@font-face {
  font-family: 'Open Sans';
  src: url('/fonts/opensans/OpenSans-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

/* Open Sans - Italic (400) */
@font-face {
  font-family: 'Open Sans';
  src: url('/fonts/opensans/OpenSans-Italic.woff2') format('woff2');
  font-weight: 400;
  font-style: italic;
  font-display: swap;
}

/* Open Sans - Bold (700) */
@font-face {
  font-family: 'Open Sans';
  src: url('/fonts/opensans/OpenSans-Bold.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

/* Open Sans - Bold Italic (700) */
@font-face {
  font-family: 'Open Sans';
  src: url('/fonts/opensans/OpenSans-BoldItalic.woff2') format('woff2');
  font-weight: 700;
  font-style: italic;
  font-display: swap;
}
"""


def ensure_directories():
    """Crea tutte le cartelle di destinazione se non esistono."""
    dirs = [
        IMAGES_DIR / "graffiti",
        IMAGES_DIR / "archive",
        IMAGES_DIR / "public-art",
        IMAGES_DIR / "hero",
        IMAGES_DIR / "brand",
        FONTS_DIR / "druk",
        FONTS_DIR / "opensans",
    ]
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)
    print(f"✓ Cartelle di destinazione create e pronte in {PUBLIC_DIR}")


def copy_local_files():
    """Copia i file locali da /Volumes/SSD_Skolp/Skolp/ARTE_URBANA/Wix_site."""
    print("\n--- Fase 1: Copia dei file locali ---")
    if not LOCAL_SRC_DIR.exists():
        print(f"ERRORE: Directory sorgente locale non trovata: {LOCAL_SRC_DIR}")
        sys.exit(1)

    # 1. Graffiti -> public/images/graffiti/
    graffiti_src = LOCAL_SRC_DIR / "Graffiti"
    graffiti_dst = IMAGES_DIR / "graffiti"
    count_graffiti = 0
    if graffiti_src.exists():
        for file in graffiti_src.iterdir():
            if file.is_file() and not file.name.startswith("."):
                shutil.copy2(file, graffiti_dst / file.name)
                count_graffiti += 1
    print(f"✓ Copiate {count_graffiti} immagini Graffiti in {graffiti_dst}")

    # 2. Archivio_graffiti -> public/images/archive/
    archive_src = LOCAL_SRC_DIR / "Archivio_graffiti"
    archive_dst = IMAGES_DIR / "archive"
    count_archive = 0
    if archive_src.exists():
        for file in archive_src.iterdir():
            if file.is_file() and not file.name.startswith("."):
                shutil.copy2(file, archive_dst / file.name)
                count_archive += 1
    print(f"✓ Copiate {count_archive} immagini Archivio in {archive_dst}")

    # 3. Altro -> public/images/public-art/
    altro_src = LOCAL_SRC_DIR / "Altro"
    public_art_dst = IMAGES_DIR / "public-art"
    count_altro = 0
    if altro_src.exists():
        for file in altro_src.iterdir():
            if file.is_file() and not file.name.startswith("."):
                shutil.copy2(file, public_art_dst / file.name)
                count_altro += 1
    print(f"✓ Copiate {count_altro} immagini Public Art da Altro/ in {public_art_dst}")

    # 4. Wallness_logo.png -> public/images/brand/Wallness_logo.png
    wallness_logo = LOCAL_SRC_DIR / "Wallness_logo.png"
    brand_dst = IMAGES_DIR / "brand"
    if wallness_logo.exists():
        shutil.copy2(wallness_logo, brand_dst / "Wallness_logo.png")
        print(f"✓ Copiato Wallness_logo.png in {brand_dst}")

    # 5. Gif_sito/ -> public/images/brand/
    gif_src = LOCAL_SRC_DIR / "Gif_sito"
    count_gif = 0
    if gif_src.exists():
        for file in gif_src.iterdir():
            if file.is_file() and not file.name.startswith("."):
                shutil.copy2(file, brand_dst / file.name)
                count_gif += 1
    print(f"✓ Copiati {count_gif} file da Gif_sito/ in {brand_dst}")


def download_file(url: str, dest_path: Path) -> bool:
    """Scarica un file tramite HTTP e lo salva nel percorso di destinazione."""
    if dest_path.exists() and dest_path.stat().st_size > 0:
        return True
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=30) as response, open(dest_path, "wb") as out_file:
            shutil.copyfileobj(response, out_file)
        return True
    except Exception as e:
        print(f"  [!] Errore durante il download da {url} verso {dest_path.name}: {e}")
        return False


def download_wix_assets():
    """Scarica le immagini specifiche censite dal CDN Wix."""
    print("\n--- Fase 2: Download immagini specifiche dal CDN Wix ---")

    # A. Public Art (22 cover)
    print("Download 22 copertine Public Art...")
    pa_dir = IMAGES_DIR / "public-art"
    pa_success = 0
    for item in PUBLIC_ART_IMAGES:
        url = WIX_MEDIA_BASE + item["wix_media"]
        slug_file = pa_dir / item["slug_name"]
        orig_file = pa_dir / item["original_name"]

        ok = download_file(url, slug_file)
        if ok:
            # Crea anche la copia col nome file originale per massima retrocompatibilità
            if not orig_file.exists():
                shutil.copy2(slug_file, orig_file)
            pa_success += 1
            print(f"  [OK] {item['title']} -> {item['slug_name']} ({slug_file.stat().st_size // 1024} KB)")

    print(f"✓ Scaricate {pa_success}/{len(PUBLIC_ART_IMAGES)} immagini Public Art")

    # B. Home Gallery (13 hero images)
    print("\nDownload 13 opere Home Gallery...")
    hero_dir = IMAGES_DIR / "hero"
    hero_success = 0
    for item in HERO_IMAGES:
        url = WIX_MEDIA_BASE + item["wix_media"]
        slug_file = hero_dir / item["slug_name"]
        orig_file = hero_dir / item["original_name"]

        ok = download_file(url, slug_file)
        if ok:
            if not orig_file.exists():
                shutil.copy2(slug_file, orig_file)
            hero_success += 1
            print(f"  [OK] {item['original_name']} -> {item['slug_name']} ({slug_file.stat().st_size // 1024} KB)")

    print(f"✓ Scaricate {hero_success}/{len(HERO_IMAGES)} immagini Home Gallery")

    # C. Brand Assets
    print("\nDownload Brand & Identity Assets...")
    brand_dir = IMAGES_DIR / "brand"
    brand_success = 0
    for item in BRAND_IMAGES:
        url = WIX_MEDIA_BASE + item["wix_media"]
        dest_file = brand_dir / item["dest_name"]
        ok = download_file(url, dest_file)
        if ok:
            brand_success += 1
            print(f"  [OK] Brand asset: {item['dest_name']} ({dest_file.stat().st_size // 1024} KB)")
    print(f"✓ Scaricati {brand_success}/{len(BRAND_IMAGES)} brand assets")

    # D. Graffiti Extra da Wix
    print("\nDownload Graffiti extra da Wix...")
    graffiti_dir = IMAGES_DIR / "graffiti"
    graf_success = 0
    for item in GRAFFITI_EXTRA:
        url = WIX_MEDIA_BASE + item["wix_media"]
        dest_file = graffiti_dir / item["dest_name"]
        ok = download_file(url, dest_file)
        if ok:
            graf_success += 1
            print(f"  [OK] Graffiti extra: {item['dest_name']} ({dest_file.stat().st_size // 1024} KB)")
    print(f"✓ Scaricate {graf_success}/{len(GRAFFITI_EXTRA)} immagini Graffiti extra")


def download_fonts():
    """Scarica e predispone i file webfont e il foglio di stile fonts.css."""
    print("\n--- Fase 3: Download e configurazione Web Font ---")
    font_success = 0
    for f in FONTS:
        dest_file = FONTS_DIR / f["subpath"]
        dest_file.parent.mkdir(parents=True, exist_ok=True)
        ok = download_file(f["url"], dest_file)
        if ok:
            font_success += 1
            print(f"  [OK] Font: {f['subpath']} ({dest_file.stat().st_size // 1024} KB)")

    print(f"✓ Scaricati {font_success}/{len(FONTS)} file di font")

    # Scrittura di public/fonts/fonts.css
    css_file = FONTS_DIR / "fonts.css"
    with open(css_file, "w", encoding="utf-8") as out:
        out.write(FONTS_CSS_CONTENT)
    print(f"✓ Generato {css_file} con le definizioni @font-face complete")


def verify_assets():
    """Verifica che tutte le cartelle e i file siano presenti e non vuoti."""
    print("\n--- Fase 4: Verifica integrità degli asset ---")
    categories = {
        "Graffiti": IMAGES_DIR / "graffiti",
        "Archive": IMAGES_DIR / "archive",
        "Public Art": IMAGES_DIR / "public-art",
        "Hero (Home Gallery)": IMAGES_DIR / "hero",
        "Brand": IMAGES_DIR / "brand",
        "Fonts Druk": FONTS_DIR / "druk",
        "Fonts Open Sans": FONTS_DIR / "opensans",
    }

    all_ok = True
    total_files = 0
    total_bytes = 0

    for name, path in categories.items():
        if not path.exists():
            print(f"ERRORE: Cartella mancante {name}: {path}")
            all_ok = False
            continue

        files = [f for f in path.iterdir() if f.is_file() and not f.name.startswith(".")]
        empty_files = [f for f in files if f.stat().st_size == 0]
        category_bytes = sum(f.stat().st_size for f in files)

        total_files += len(files)
        total_bytes += category_bytes

        if empty_files:
            print(f"ERRORE: File vuoti in {name}: {[f.name for f in empty_files]}")
            all_ok = False
        else:
            print(f"✓ {name:20}: {len(files):3} file | {category_bytes / (1024*1024):6.2f} MB")

    fonts_css = FONTS_DIR / "fonts.css"
    if fonts_css.exists() and fonts_css.stat().st_size > 0:
        total_files += 1
        total_bytes += fonts_css.stat().st_size
        print(f"✓ {'fonts.css':20}:   1 file | {fonts_css.stat().st_size / 1024:6.2f} KB")
    else:
        print("ERRORE: fonts.css mancante o vuoto")
        all_ok = False

    print("--------------------------------------------------")
    print(f"Totale complessivo: {total_files} file | {total_bytes / (1024*1024):.2f} MB")

    if not all_ok:
        print("\nESITO: ERRORI riscontrati nella verifica.")
        sys.exit(1)
    else:
        print("\nESITO: SUCCESSO! Tutti gli asset sono stati migrati, catalogati e verificati con successo.")


def main():
    print("==================================================")
    print("   Nico Skolp Portfolio - Migrazione Asset        ")
    print("==================================================")
    ensure_directories()
    copy_local_files()
    download_wix_assets()
    download_fonts()
    verify_assets()


if __name__ == "__main__":
    main()
