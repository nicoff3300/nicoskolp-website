/**
 * Skolp Master Mode - Modulo di Autenticazione & Sessione Riservata
 * Gestisce l'abilitazione della modalità Admin per Nico Skolp tramite ?skolp=admin
 */
(function() {
  const ADMIN_STORAGE_KEY = 'skolp_admin_mode';
  const ADMIN_COOKIE_NAME = 'skolp_admin';

  // 1. Verifica query string per attivazione o disattivazione rapida
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('skolp') === 'admin' || urlParams.get('admin') === '1') {
      localStorage.setItem(ADMIN_STORAGE_KEY, 'true');
      document.cookie = `${ADMIN_COOKIE_NAME}=1; path=/; max-age=31536000; SameSite=Lax`;
      
      // Pulisce l'URL senza ricaricare la pagina
      urlParams.delete('skolp');
      urlParams.delete('admin');
      const newQuery = urlParams.toString() ? `?${urlParams.toString()}` : '';
      const cleanUrl = `${window.location.pathname}${newQuery}${window.location.hash}`;
      window.history.replaceState({}, document.title, cleanUrl);
    } else if (urlParams.get('skolp') === 'exit' || urlParams.get('skolp') === 'logout') {
      localStorage.removeItem(ADMIN_STORAGE_KEY);
      document.cookie = `${ADMIN_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
      urlParams.delete('skolp');
      const newQuery = urlParams.toString() ? `?${urlParams.toString()}` : '';
      const cleanUrl = `${window.location.pathname}${newQuery}${window.location.hash}`;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  } catch (e) {
    console.warn('Errore lettura parametri URL:', e);
  }

  // 2. Metodi di verifica stato globale
  function checkIsAdmin() {
    try {
      const isStored = localStorage.getItem(ADMIN_STORAGE_KEY) === 'true';
      const hasCookie = document.cookie.split(';').some(c => c.trim().startsWith(`${ADMIN_COOKIE_NAME}=1`));
      return isStored || hasCookie;
    } catch (e) {
      return false;
    }
  }

  function enableAdmin() {
    try {
      localStorage.setItem(ADMIN_STORAGE_KEY, 'true');
      document.cookie = `${ADMIN_COOKIE_NAME}=1; path=/; max-age=31536000; SameSite=Lax`;
    } catch (e) {}
    window.location.reload();
  }

  function disableAdmin() {
    try {
      localStorage.removeItem(ADMIN_STORAGE_KEY);
      document.cookie = `${ADMIN_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
    } catch (e) {}
    window.location.reload();
  }

  window.isSkolpAdmin = checkIsAdmin;
  window.enableSkolpAdmin = enableAdmin;
  window.disableSkolpAdmin = disableAdmin;

  // Scorciatoia rapida da tastiera: Shift + Option + A oppure Ctrl + Shift + S
  window.addEventListener('keydown', function(e) {
    if ((e.shiftKey && e.altKey && (e.key === 'A' || e.key === 'a')) ||
        (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's'))) {
      e.preventDefault();
      if (checkIsAdmin()) {
        if (confirm('Vuoi uscire dalla modalità Skolp Master Mode?')) {
          disableAdmin();
        }
      } else {
        if (confirm('Attivare Skolp Master Mode (download e palette sbloccati)?')) {
          enableAdmin();
        }
      }
    }
  });

  // 3. Se admin attivo, applica la classe ed inietta la topbar di stato
  if (checkIsAdmin()) {
    document.documentElement.classList.add('admin-mode');

    function applyAdminUI() {
      if (document.body) {
        document.body.classList.add('admin-mode');
      }

      // Propaga sempre ?skolp=admin sui link delle 6 app nell'Hub
      try {
        const appLinks = document.querySelectorAll('a[href*="/lab/"]');
        appLinks.forEach(link => {
          const href = link.getAttribute('href');
          if (href && (href.includes('/brio') || href.includes('/capsule') || href.includes('/doomeno') || href.includes('/gridshape') || href.includes('/letshift') || href.includes('/logic-ribbon')) && !href.includes('skolp=')) {
            const sep = href.includes('?') ? '&' : '?';
            link.setAttribute('href', `${href}${sep}skolp=admin`);
          }
        });
      } catch (e) {}

      // Evita duplicazione topbar
      if (document.getElementById('skolp-master-topbar')) return;

      const topbar = document.createElement('div');
      topbar.id = 'skolp-master-topbar';
      topbar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 34px;
        background: #000000;
        border-bottom: 1px solid #333333;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 16px;
        font-family: 'Druk Text Wide', system-ui, sans-serif;
        font-size: 10px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        z-index: 999999;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.7);
      `;

      topbar.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #00f2fe; box-shadow: 0 0 8px #00f2fe;"></span>
          <span style="font-weight: 700;">Skolp Master Mode</span>
          <span style="color: #888888; font-family: system-ui, sans-serif; font-size: 11px; text-transform: none; margin-left: 6px;">
            Download sbloccati &bull; Gestione Palette attiva
          </span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <button onclick="window.disableSkolpAdmin()" style="
            background: transparent;
            border: 1px solid #444444;
            color: #ffffff;
            font-family: 'Druk Text Wide', system-ui, sans-serif;
            font-size: 9px;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            padding: 3px 8px;
            cursor: pointer;
            transition: all 0.2s ease;
          " onmouseover="this.style.background='#ffffff'; this.style.color='#000000';" onmouseout="this.style.background='transparent'; this.style.color='#ffffff';">
            Esci da Admin
          </button>
        </div>
      `;

      document.body.prepend(topbar);
      
      // Sposta il body e corregge l'altezza per evitare che il footer della sidebar venga tagliato
      document.body.style.marginTop = '34px';
      if (document.querySelector('.app-container')) {
        document.body.style.height = 'calc(100vh - 34px)';
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyAdminUI);
    } else {
      applyAdminUI();
    }
  }
})();
