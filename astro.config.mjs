// @ts-check
import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

const isVercel = !!process.env.VERCEL;
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

// https://astro.build/config
export default defineConfig({
	site,
	// Indirizzi senza "/" finale (/yoga, non /yoga/): coerenti con i link del sito. I vecchi
	// indirizzi di WordPress, che finivano con "/", vengono rimandati a quelli nuovi da Vercel.
	trailingSlash: 'never',
	redirects: {
		...redirectWordpress,
	},
	// Le pagine "info" erano noindex nel sito originale: restano fuori anche dalla sitemap.
	integrations: [sitemap({ filter: (page) => !/\/info-scuola-nuoto-/.test(page) && !/\/404\/?$/.test(page) })],
	adapter: vercel(),
	devToolbar: { enabled: false },
	server: { port: Number(process.env.PORT) || 4321 },
});
