// Copia in public/wp-content/uploads solo i media che il sito usa davvero.
//
// Gli originali del vecchio sito (circa 2.200 file, 500 MB, con tutte le miniature generate da
// WordPress) stanno in _media-originali/ (ignorata da git: si estrae dal backup con
//   tar -xzf "Backup Elementor.gz" -C _media-originali --strip-components=1 files/wp-content/uploads ).
// Questo script cerca in src/ ogni percorso /wp-content/uploads/... (pagine, dati JSON, CSS)
// e copia quei file, con lo stesso percorso, in public/: mantengono quindi gli URL del vecchio sito.
//
// Uso:  node scripts/copia-media.mjs          (copia)
//       node scripts/copia-media.mjs --verifica   (non copia: elenca i file citati ma mancanti)
import fs from 'node:fs';
import path from 'node:path';

const ORIGINALI = '_media-originali';
const DEST = 'public';
const soloVerifica = process.argv.includes('--verifica');

function* files(dir) {
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, e.name);
		if (e.isDirectory()) yield* files(p);
		else if (/\.(astro|ts|js|mjs|json|css)$/.test(e.name)) yield p;
	}
}

const citati = new Set();
const re = /\/wp-content\/uploads\/[^'"`)\s\\<>,]+?\.(?:jpe?g|png|webp|svg|gif|mp4|webm|pdf)(?![\w.])/gi;
for (const f of files('src')) for (const m of fs.readFileSync(f, 'utf8').matchAll(re)) citati.add(m[0]);

let copiati = 0;
let giaPresenti = 0;
let byte = 0;
const mancanti = [];
for (const url of [...citati].sort()) {
	const rel = decodeURIComponent(url);
	const da = path.join(ORIGINALI, rel);
	const a = path.join(DEST, rel);
	if (!fs.existsSync(da)) {
		if (!fs.existsSync(a)) mancanti.push(url);
		else giaPresenti++;
		continue;
	}
	byte += fs.statSync(da).size;
	if (soloVerifica) continue;
	fs.mkdirSync(path.dirname(a), { recursive: true });
	fs.copyFileSync(da, a);
	copiati++;
}

// Toglie da public/ i media copiati in precedenza che nessuna pagina cita piu'.
let rimossi = 0;
const cartellaMedia = path.join(DEST, 'wp-content', 'uploads');
if (!soloVerifica && fs.existsSync(cartellaMedia)) {
	const attesi = new Set([...citati].map((u) => path.join(DEST, decodeURIComponent(u))));
	const visita = (dir) => {
		for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
			const p = path.join(dir, e.name);
			if (e.isDirectory()) {
				visita(p);
				if (!fs.readdirSync(p).length) fs.rmdirSync(p);
			} else if (!attesi.has(p)) {
				fs.unlinkSync(p);
				rimossi++;
			}
		}
	};
	visita(cartellaMedia);
}

console.log(`${citati.size} file citati in src/.`);
if (rimossi) console.log(`Rimossi ${rimossi} file non piu' citati.`);
if (!soloVerifica) console.log(`Copiati ${copiati} file (${(byte / 1048576).toFixed(0)} MB) in ${DEST}/; ${giaPresenti} gia' presenti.`);
else console.log(`Da copiare: ${(byte / 1048576).toFixed(0)} MB.`);
if (mancanti.length) {
	console.log(`ATTENZIONE: ${mancanti.length} file citati non esistono ne' in ${ORIGINALI}/ ne' in ${DEST}/:`);
	for (const m of mancanti) console.log('  ', m);
	process.exitCode = 1;
}
