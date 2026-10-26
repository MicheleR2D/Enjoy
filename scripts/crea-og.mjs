// Foto di anteprima per i social (og:image): una per pagina, presa dalla foto della sua hero e
// ritagliata a 1200x630 (il formato che WhatsApp, Facebook e LinkedIn mostrano per intero).
//
// Le foto originali sono spesso verticali o molto grandi: qui si producono JPG leggeri in
// public/_og/<slug>.jpg (cartella generata, non va in git). Parte da solo prima di
// `npm run dev` e `npm run build`, dopo lo script delle foto. Le pagine che non hanno una hero
// (privacy, info) usano la foto della home: vedi Layout.astro.
//
//   public/_og/home.jpg      <- prima foto dell'hero della home (src/data/home.json)
//   public/_og/orari.jpg     <- foto dell'hero della pagina Orari (src/data/orari-pagina.json)
//   public/_og/<slug>.jpg    <- hero di ogni pagina in src/data/pagine/<slug>.json
import { readdirSync, readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const PUBLIC_DIR = join(ROOT, 'public');
const DATA_DIR = join(ROOT, 'src/data');
const OUT_DIR = join(PUBLIC_DIR, '_og');
const LARGHEZZA = 1200;
const ALTEZZA = 630;

let sharp;
try {
	sharp = (await import('sharp')).default;
} catch {
	console.warn("[og] sharp non disponibile: salto le foto di anteprima, il sito usera' quella di riserva.");
	process.exit(0);
}

const json = (p) => JSON.parse(readFileSync(p, 'utf8'));

// slug -> percorso della foto (come scritto nei dati, es. /wp-content/uploads/...)
const foto = new Map();
const home = json(join(DATA_DIR, 'home.json'));
if (home.hero?.immagini?.[0]) foto.set('home', home.hero.immagini[0]);
const orari = json(join(DATA_DIR, 'orari-pagina.json'));
if (orari.hero?.immagine) foto.set('orari', orari.hero.immagine);
for (const f of readdirSync(join(DATA_DIR, 'pagine'))) {
	if (!f.endsWith('.json')) continue;
	const p = json(join(DATA_DIR, 'pagine', f));
	if (p.slug && p.hero?.immagine) foto.set(p.slug, p.hero.immagine);
}

mkdirSync(OUT_DIR, { recursive: true });
let create = 0;
let saltate = 0;
for (const [slug, url] of [...foto].sort()) {
	const origine = join(PUBLIC_DIR, url);
	if (!existsSync(origine)) {
		console.warn(`[og] foto non trovata per ${slug}: ${url}`);
		continue;
	}
	const uscita = join(OUT_DIR, `${slug}.jpg`);
	// gia' fatta e piu' recente della foto di partenza: si salta
	if (existsSync(uscita) && statSync(uscita).mtimeMs > statSync(origine).mtimeMs) {
		saltate++;
		continue;
	}
	// Foto verticale: un ritaglio largo 1200x630 ne prende una striscia, quindi si sceglie la zona con piu'
	// dettaglio (nella piscina: acqua e nuotatore, non il soffitto). Foto orizzontale: zona di maggiore attenzione.
	const meta = await sharp(origine).metadata();
	const verticale = (meta.height ?? 0) > (meta.width ?? 0);
	await sharp(origine)
		.rotate()
		.resize(LARGHEZZA, ALTEZZA, { fit: 'cover', position: verticale ? 'entropy' : 'attention' })
		.jpeg({ quality: 80, mozjpeg: true })
		.toFile(uscita);
	create++;
}
console.log(`[og] ${foto.size} pagine: ${create} foto create, ${saltate} gia' pronte.`);
