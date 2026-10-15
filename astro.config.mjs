import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://nicoskolp.com',
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'directory',
    assets: 'assets'
  },
  redirects: {
    '/teatro-aquilone': '/public-art/teatro-aquilone',
    '/sanpaolo': '/public-art/sanpaolo',
    '/trust-taranto': '/public-art/trust-taranto',
    '/rore-festival-rovigo': '/public-art/rore-festival-rovigo',
    '/skolp-basketball-court-matera-2019': '/public-art/skolp-basketball-court-matera-2019',
    '/graffiti-factory': '/public-art/graffiti-factory',
    '/skolp-steps-molise': '/public-art/skolp-steps-molise',
    '/matera-basket': '/public-art/matera-basket',
    '/matera-piazza': '/public-art/matera-piazza',
    '/mottola': '/public-art/mottola',
    '/ecopoli': '/public-art/ecopoli',
    '/expost-moderno': '/public-art/expost-moderno',
    '/umberto-eco-tribute': '/public-art/umberto-eco-tribute',
    '/ex-fadda': '/public-art/ex-fadda',
    '/matera-alter': '/public-art/matera-alter',
    '/verso-sud-festival': '/public-art/verso-sud-festival',
    '/bar-project': '/public-art/bar-project',
    '/splash': '/public-art/splash',
    '/roma-binario18': '/public-art/roma-binario18',
    '/tempelhof': '/public-art/tempelhof',
    '/untitled': '/public-art/untitled',
    '/berlin-klub7': '/public-art/berlin-klub7'
  },
  vite: {
    plugins: [tailwindcss()]
  }
});
