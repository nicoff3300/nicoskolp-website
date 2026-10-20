/**
 * Skolp Master Mode - Modulo di Autenticazione & Sessione Riservata
 * Gestisce l'abilitazione della modalità Admin per Nico Skolp tramite ?skolp=admin
 */
(function() {
  const ADMIN_STORAGE_KEY = 'skolp_admin_mode';
  const ADMIN_COOKIE_NAME = 'skolp_admin';

  // 1. Verifica query string per attivazione
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('skolp') === 'admin') {
      localStorage.setItem(ADMIN_STORAGE_KEY, 'true');
      document.cookie = `${ADMIN_COOKIE_NAME}=1; path=/; max-age=31536000; SameSite=Lax`;
      
      // Pulisce l'URL senza ricaricare la pagina
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

  function disableAdmin() {
    try {
      localStorage.removeItem(ADMIN_STORAGE_KEY);
      document.cookie = `${ADMIN_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
    } catch (e) {}
    window.location.reload();
  }

  window.isSkolpAdmin = checkIsAdmin;
  window.disableSkolpAdmin = disableAdmin;

  // 3. Se admin attivo, applica la classe e inietta la topbar di stato
  if (checkIsAdmin()) {
    document.documentElement.classList.add('admin-mode');

    function applyAdminUI() {
      if (document.body) {
        document.body.classList.add('admin-mode');
      }

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
      
      // Sposta leggermente il body verso il basso per fare spazio alla topbar
      document.body.style.marginTop = '34px';
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyAdminUI);
    } else {
      applyAdminUI();
    }
  }
})();
