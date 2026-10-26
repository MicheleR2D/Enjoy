// @ts-check
import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

const isVercel = !!process.env.VERCEL;
/** @param {string} v */
const senzaSlashFinale = (v) => v.replace(/\/+$/, '');

const sitoProduzione = process.env.SITE_URL ? senzaSlashFinale(process.env.SITE_URL) : null;
const sitoVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
const site = sitoProduzione ?? (isVercel && sitoVercel ? `https://${sitoVercel}` : 'https://enjoyclub.eu');

if (!sitoProduzione) {
	console.warn('[enjoy-club] SITE_URL non impostata: build di prova su ' + site);
}

// 301 dal vecchio sito (WordPress e, prima ancora, Joomla): estratti dal plugin Redirection
// con scripts/migrazione/normalizza-redirect.mjs. Includono anche /meda-3 -> /meda.
// Le chiavi sono senza "/" finale: con trailingSlash 'never' Vercel rimanda prima "/vecchia/" a
// "/vecchia" e poi il redirect porta alla pagina nuova.
const redirectWordpress = JSON.parse(readFileSync(new URL('./src/data/redirect-wp.json', import.meta.url), 'utf8'));

// Altri indirizzi del sito WordPress attuale che il plugin Redirection non conosceva (e che Google
// ha gia' indicizzato): articoli di prova, feed, sitemap di Yoast e le pagine "allegato" dei PDF
// (planning e rendicontazioni), che ora sono file diretti. Scritti a mano qui perche' redirect-wp.json
// viene riscritto da scripts/migrazione/normalizza-redirect.mjs.
const redirectAggiuntivi = {
	'/hello-world': '/',
	'/hello-world-1': '/',
	'/hello-world-2': '/',
	'/hello-world-3': '/',
	'/category/uncategorized': '/',
	'/author/jdnhkmnhei': '/',
	'/feed': '/',
	'/comments/feed': '/',
	'/sitemap_index.xml': '/sitemap-index.xml',
	'/page-sitemap.xml': '/sitemap-index.xml',
	'/post-sitemap.xml': '/sitemap-index.xml',
	'/category-sitemap.xml': '/sitemap-index.xml',
	'/author-sitemap.xml': '/sitemap-index.xml',
	'/planning-camuzzago-2627-verisione-20': '/wp-content/uploads/2026/09/Planning-Camuzzago-2627-verisione-20.pdf',
	'/planning-meda-2025-2026-250226-2': '/wp-content/uploads/2026/04/Planning-Meda-2025-2026-250226-1.pdf',
	'/rendicontazione-contributi-pubblici-camuzzago-anno-2025': '/wp-content/uploads/2026/06/Rendicontazione-contributi-pubblici-CAMUZZAGO-anno-2025.pdf',
	'/rendicontazione-contributi-pubblici-montecarlo-anno-2025': '/wp-content/uploads/2026/06/Rendicontazione-contributi-pubblici-MONTECARLO-anno-2025.pdf',
};

// https://astro.build/config
export default defineConfig({
	site,
	// Indirizzi senza "/" finale (/yoga, non /yoga/): coerenti con i link del sito. I vecchi
	// indirizzi di WordPress, che finivano con "/", vengono rimandati a quelli nuovi da Vercel.
	trailingSlash: 'never',
	redirects: {
		...redirectWordpress,
		...redirectAggiuntivi,
	},
	// Le pagine "info" erano noindex nel sito originale: restano fuori anche dalla sitemap.
	integrations: [sitemap({ filter: (page) => !/\/info-scuola-nuoto-/.test(page) && !/\/404\/?$/.test(page) })],
	adapter: vercel(),
	devToolbar: { enabled: false },
	server: { port: Number(process.env.PORT) || 4321 },
});
