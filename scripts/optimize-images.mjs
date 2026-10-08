// Genera versioni WebP leggere (480/960/1600px) di ogni foto usata dal sito.
//
// Le foto originali (.jpg "-scaled" da 2560px, fino a 800 KB l'una) restano in
// public/wp-content/uploads con gli URL identici a WordPress; qui si producono
// solo le varianti responsive, in public/_img/ (cartella generata: non va in
// git). Parte da solo prima di `npm run dev` e `npm run build`.
//
// Quali foto: tutte quelle citate come /wp-content/uploads/...jpg|jpeg|png nei
// sorgenti (src/). Se ne aggiungi una nuova, al prossimo avvio viene elaborata.
// Quelle gia' elaborate e invariate vengono saltate.
import { readdirSync, readFileSync, statSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, 'src');
const PUBLIC_DIR = join(ROOT, 'public');
const OUT_DIR = join(PUBLIC_DIR, '_img');
const MANIFEST = join(OUT_DIR, 'manifest.json');
const WIDTHS = [480, 960, 1600];
const QUALITY = 76;

let sharp;
try {
	sharp = (await import('sharp')).default;
} catch {
	console.warn('[immagini] sharp non disponibile: salto l\'ottimizzazione, il sito usera\' le foto originali.');
	process.exit(0);
}

function* files(dir) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const p = join(dir, entry.name);
		if (entry.isDirectory()) yield* files(p);
		else if (/\.(astro|ts|js|mjs|json)$/.test(entry.name)) yield p;
	}
}

const found = new Set();
const re = /\/wp-content\/uploads\/[^'"`)\s\\]+?\.(?:jpe?g|png)(?![\w.])/gi;
for (const f of files(SRC_DIR)) {
	for (const m of readFileSync(f, 'utf8').matchAll(re)) found.add(m[0]);
}

mkdirSync(OUT_DIR, { recursive: true });
const manifest = {};
let created = 0;
let skipped = 0;
let missing = 0;

for (const url of [...found].sort()) {
	const srcPath = join(PUBLIC_DIR, url);
	if (!existsSync(srcPath)) {
		missing++;
		console.warn(`[immagini] non trovata: ${url}`);
		continue;
	}

	const base = `/_img${url.slice(0, -extname(url).length)}`;
	const meta = await sharp(srcPath).metadata();
	const max = Math.min(meta.width ?? 1600, WIDTHS.at(-1));
	const widths = [...new Set([...WIDTHS.filter((w) => w < max), max])];
	const srcTime = statSync(srcPath).mtimeMs;

	for (const w of widths) {
		const out = join(PUBLIC_DIR, `${base}-${w}.webp`);
		if (existsSync(out) && statSync(out).mtimeMs >= srcTime) {
			skipped++;
			continue;
		}
		mkdirSync(dirname(out), { recursive: true });
		await sharp(srcPath).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: QUALITY, effort: 4 }).toFile(out);
		created++;
	}
	manifest[url] = { base, widths };
}

writeFileSync(MANIFEST, JSON.stringify(manifest));
console.log(`[immagini] ${Object.keys(manifest).length} foto: ${created} varianti create, ${skipped} gia' pronte${missing ? `, ${missing} non trovate` : ''}.`);
