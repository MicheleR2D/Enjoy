// Controlla che ogni link interno (href) e ogni risorsa (src, srcset, url() nel CSS inline) delle
// pagine generate esista davvero, e stampa quelli rotti. Si lancia dopo `npm run build`.
//
// Uso:  node scripts/verifica-link.mjs [cartella-build]      (default: .vercel/output/static)
//
// Un link e' valido se corrisponde a un file nella build, a una pagina (cartella con index.html)
// o a un redirect definito in src/data/redirect-wp.json. Si ignorano link esterni, ancore,
// mailto: e tel:.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.argv[2] ?? '.vercel/output/static');
if (!fs.existsSync(ROOT)) {
	console.error(`Cartella non trovata: ${ROOT} (lancia prima "npm run build")`);
	process.exit(1);
}
const redirect = JSON.parse(fs.readFileSync('src/data/redirect-wp.json', 'utf8'));

function* html(dir) {
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, e.name);
		if (e.isDirectory()) yield* html(p);
		else if (e.name.endsWith('.html')) yield p;
	}
}

const esiste = (url) => {
	let p;
	try {
		p = decodeURIComponent(url.split('#')[0].split('?')[0]);
	} catch {
		return false;
	}
	if (p === '' || p === '/') return true;
	const norm = p.replace(/\/+$/, '');
	if (redirect[norm]) return true;
	const f = path.join(ROOT, p);
	if (fs.existsSync(f) && fs.statSync(f).isFile()) return true;
	return fs.existsSync(path.join(ROOT, norm, 'index.html')) || fs.existsSync(path.join(ROOT, norm + '.html'));
};

const rotti = new Map();
let controllati = 0;
for (const file of html(ROOT)) {
	const testo = fs.readFileSync(file, 'utf8');
	const pagina = '/' + path.relative(ROOT, file).replace(/index\.html$/, '').replace(/\\/g, '/');
	const trovati = new Set();
	for (const m of testo.matchAll(/\b(?:href|src|poster)="([^"]+)"/g)) trovati.add(m[1]);
	for (const m of testo.matchAll(/\bsrcset="([^"]+)"/g)) for (const s of m[1].split(',')) trovati.add(s.trim().split(/\s+/)[0]);
	for (const m of testo.matchAll(/url\((['"]?)(\/[^)'"]+)\1\)/g)) trovati.add(m[2]);
	for (const u of trovati) {
		if (!u.startsWith('/') || u.startsWith('//')) continue;
		controllati++;
		if (!esiste(u)) {
			if (!rotti.has(u)) rotti.set(u, new Set());
			rotti.get(u).add(pagina);
		}
	}
}

console.log(`${controllati} riferimenti interni controllati.`);
if (!rotti.size) console.log('Nessun link rotto.');
else {
	console.log(`${rotti.size} rotti:`);
	for (const [u, pagine] of rotti) console.log(' ', u, '<-', [...pagine].slice(0, 3).join(', '), pagine.size > 3 ? `(+${pagine.size - 3})` : '');
	process.exitCode = 1;
}
