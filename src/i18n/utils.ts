import { ui, defaultLang, type Lang } from './ui';

/**
 * Determina la lingua corrente a partire dall'URL.
 * Se il percorso inizia con /en o /en/ restituisce 'en', altrimenti la lingua predefinita 'it'.
 */
export function getLangFromUrl(url: URL | string): Lang {
  const pathname = typeof url === 'string' ? url : url.pathname;
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0 && segments[0] === 'en') {
    return 'en';
  }
  return defaultLang;
}

/**
 * Restituisce una funzione getter tipizzata per le stringhe UI nella lingua specificata.
 */
export function useTranslations(lang: Lang) {
  return function t(key: keyof (typeof ui)[typeof defaultLang]): string {
    return ui[lang][key] || ui[defaultLang][key] || key;
  };
}

/**
 * Converte un percorso esistente verso la lingua di destinazione.
 * Es:
 * - getLocalizedPath('/', 'en') => '/en'
 * - getLocalizedPath('/en', 'it') => '/'
 * - getLocalizedPath('/public-art/sanpaolo', 'en') => '/en/public-art/sanpaolo'
 * - getLocalizedPath('/en/public-art/sanpaolo', 'it') => '/public-art/sanpaolo'
 */
export function getLocalizedPath(pathname: string, targetLang: Lang): string {
  // Rimuovi trailing slash e normalizza
  let cleanPath = pathname.replace(/\/$/, '') || '/';

  // Rimuovi prefisso /en se presente
  if (cleanPath === '/en') {
    cleanPath = '/';
  } else if (cleanPath.startsWith('/en/')) {
    cleanPath = cleanPath.slice(3) || '/';
  }

  // Se la lingua di destinazione è 'it' (lingua principale), restituisci il percorso senza prefisso
  if (targetLang === 'it') {
    return cleanPath;
  }

  // Se la lingua è 'en', aggiungi il prefisso /en
  if (cleanPath === '/') {
    return '/en';
  }
  return `/en${cleanPath}`;
}
