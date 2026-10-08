// Trasforma i redirect estratti dal plugin Redirection (_redirect.json) nell'elenco usato da
// astro.config.mjs: src/data/redirect-wp.json  ({ "/vecchio": "/nuovo" }).
//
// Uso:  node scripts/migrazione/normalizza-redirect.mjs <cartella-estratta>
//
// Si tiene solo quello che Astro sa gestire (percorsi senza query string), si rendono
// relative le destinazioni sul dominio del sito e si evitano i doppioni "con e senza
// slash finale". Le correzioni dei nomi cambiati nel nuovo sito stanno in MANUALI.
import fs from 'node:fs';
import path from 'node:path';

const [, , IN] = process.argv;
if (!IN) {
	console.error('Uso: node normalizza-redirect.mjs <cartella-estratta>');
	process.exit(1);
}

// Pagine il cui indirizzo cambia nel nuovo sito (o che prima non avevano redirect).
const MANUALI = {
	'/meda-3': '/meda',
	// La privacy policy linka /cookie-policy, che nel sito originale e' un 404: porta alla privacy.
	'/cookie-policy': '/privacy',
};

// Destinazioni da correggere perche' la pagina ora ha un altro indirizzo.
const DESTINAZIONI = { '/meda-3': '/meda' };

const senzaSlash = (p) => (p.length > 1 ? p.replace(/\/+$/, '') : p);
const relativo = (u) => senzaSlash(u.replace(/^https?:\/\/(www\.)?enjoyclub\.eu/i, '') || '/');

const grezzi = JSON.parse(fs.readFileSync(path.join(IN, '_redirect.json'), 'utf8')).sort((a, b) => b.visite - a.visite);
const mappa = {};
const scartati = [];
for (const r of grezzi) {
	const da = senzaSlash(r.da);
	let a = relativo(r.a);
	a = DESTINAZIONI[a] ?? a;
	if (!da.startsWith('/') || /[?\s]/.test(da) || da.includes('.it') || da.startsWith('/wp-content')) {
		scartati.push(r.da);
		continue;
	}
	if (!a.startsWith('/') || a === da) {
		scartati.push(r.da);
		continue;
	}
	if (!(da in mappa)) mappa[da] = a;
}
Object.assign(mappa, MANUALI);

const ordinata = Object.fromEntries(Object.entries(mappa).sort(([x], [y]) => x.localeCompare(y)));
fs.mkdirSync('src/data', { recursive: true });
fs.writeFileSync('src/data/redirect-wp.json', JSON.stringify(ordinata, null, '\t') + '\n');
console.log(`${Object.keys(ordinata).length} redirect scritti, ${scartati.length} scartati:`, scartati);
