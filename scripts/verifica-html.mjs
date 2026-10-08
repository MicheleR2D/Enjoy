// Controlla la qualita' delle pagine generate: SEO di base, struttura dei titoli, id duplicati,
// immagini senza alt, collegamenti vuoti o esterni senza rel, ancore che non esistono, e ogni
// traccia di testo "sporco" (entita' HTML non decodificate, undefined, null, segnaposto).
// Si lancia dopo `npm run build`.
//
// Uso:  node scripts/verifica-html.mjs [cartella-build]      (default: .vercel/output/static)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.argv[2] ?? '.vercel/output/static');
if (!fs.existsSync(ROOT)) {
	console.error(`Cartella non trovata: ${ROOT} (lancia prima "npm run build")`);
	process.exit(1);
}

function* html(dir) {
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, e.name);
		if (e.isDirectory()) yield* html(p);
		else if (e.name.endsWith('.html')) yield p;
	}
}

const problemi = [];
const segnala = (pagina, msg) => problemi.push(`${pagina}: ${msg}`);
const titoli = new Map();
const descrizioni = new Map();

for (const file of html(ROOT)) {
	const t = fs.readFileSync(file, 'utf8');
	const pagina = '/' + path.relative(ROOT, file).replace(/index\.html$/, '').replace(/\.html$/, '').replace(/\\/g, '/');
	// redirect generati da Astro: pagine minime con meta refresh
	if (/http-equiv="refresh"/i.test(t)) continue;

	const title = t.match(/<title>([^<]*)<\/title>/)?.[1]?.trim();
	const desc = t.match(/<meta name="description" content="([^"]*)"/)?.[1];
	if (!title) segnala(pagina, 'manca <title>');
	else {
		if (title.length > 70) segnala(pagina, `title lungo (${title.length}): ${title}`);
		titoli.set(title, [...(titoli.get(title) ?? []), pagina]);
	}
	if (!desc) segnala(pagina, 'manca la description');
	else {
		if (desc.length > 170) segnala(pagina, `description lunga (${desc.length})`);
		if (desc.length < 50) segnala(pagina, `description corta (${desc.length}): ${desc}`);
		descrizioni.set(desc, [...(descrizioni.get(desc) ?? []), pagina]);
	}
	if (!/<link rel="canonical"/.test(t)) segnala(pagina, 'manca il canonical');

	const h1 = (t.match(/<h1[\s>]/g) ?? []).length;
	if (h1 !== 1) segnala(pagina, `${h1} elementi h1 (ne serve uno)`);
	// salti nella gerarchia dei titoli (h1 -> h3 senza h2)
	const livelli = [...t.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
	for (let i = 1; i < livelli.length; i++) if (livelli[i] > livelli[i - 1] + 1) { segnala(pagina, `salto di titoli h${livelli[i - 1]} -> h${livelli[i]}`); break; }

	const ids = [...t.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
	const doppi = ids.filter((x, i) => ids.indexOf(x) !== i);
	if (doppi.length) segnala(pagina, `id duplicati: ${[...new Set(doppi)].join(', ')}`);

	for (const m of t.matchAll(/<img\b[^>]*>/g)) if (!/\balt(?=[\s=>])/.test(m[0])) segnala(pagina, `immagine senza alt: ${m[0].slice(0, 90)}`);
	for (const m of t.matchAll(/<a\b([^>]*)>/g)) {
		const href = m[1].match(/href="([^"]*)"/)?.[1];
		if (href === undefined) continue;
		if (href === '' || href === '#') segnala(pagina, `link vuoto: <a ${m[1].slice(0, 80)}>`);
		if (/^https?:\/\//.test(href) && /target="_blank"/.test(m[1]) && !/rel="[^"]*noopener/.test(m[1])) segnala(pagina, `link esterno senza noopener: ${href}`);
		if (href.startsWith('#') && href.length > 1 && !ids.includes(href.slice(1))) segnala(pagina, `ancora inesistente: ${href}`);
	}

	// testo visibile (senza script e stili)
	const testo = t.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
	for (const [re, nome] of [
		[/&amp;(?:#\d+|\w+);/, 'entita HTML doppia'],
		[/&(?!amp;|lt;|gt;|quot;|#39;|#x27;|nbsp;)\w+;|&#(?!39;)\d+;/, 'entita HTML non decodificata'],
		[/\bundefined\b|\bNaN\b|\[object Object\]/, 'undefined/NaN/[object]'],
		[/lorem ipsum/i, 'lorem ipsum'],
		[/Ã[\u0080-¿]|â€/, 'codifica rovinata (mojibake)'],
	]) if (re.test(testo) || re.test(t.replace(/<script[\s\S]*?<\/script>/g, ''))) {
		const m = (re.test(testo) ? testo : t).match(re);
		segnala(pagina, `${nome}: "${m[0]}"`);
	}
}

for (const [mappa, nome] of [[titoli, 'title'], [descrizioni, 'description']]) {
	for (const [k, v] of mappa) if (v.length > 1) problemi.push(`${nome} duplicato in ${v.join(', ')}: ${k.slice(0, 80)}`);
}

console.log(problemi.length ? problemi.join('\n') : 'Nessun problema trovato.');
console.log(`\n${problemi.length} segnalazioni.`);
process.exitCode = problemi.length ? 1 : 0;
