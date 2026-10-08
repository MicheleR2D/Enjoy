// Estrae dal dump SQL del vecchio sito WordPress le pagine pubblicate con i loro
// contenuti Elementor e i dati SEO (Yoast). Non tocca il sito: scrive solo file
// JSON in una cartella di lavoro, da cui poi si costruiscono le pagine Astro.
//
// Uso:  node scripts/migrazione/estrai-pagine.mjs <dump.sql> <cartella-output> [prefisso-tabelle]
// (il dump si ottiene con:  gzip -dc "database.sql.gz" > dump.sql)
//
// Output: <cartella>/<slug>.json per ogni pagina + indice.json con l'elenco.
import fs from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';

const [, , DUMP, OUT, PREFISSO = 'eImqx_'] = process.argv;
if (!DUMP || !OUT) {
	console.error('Uso: node estrai-pagine.mjs <dump.sql> <cartella-output>');
	process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });

const VALUE = "NULL|-?\\d+(?:\\.\\d+)?|'(?:[^'\\\\]|\\\\.)*'";
const ROW_RE = new RegExp('\\((?:' + VALUE + ')(?:,(?:' + VALUE + '))*\\)', 'g');
const FIELD_RE = new RegExp(VALUE, 'g');

function unescapeSql(raw) {
	const s = raw.slice(1, -1);
	let out = '';
	for (let i = 0; i < s.length; i++) {
		const c = s[i];
		if (c === '\\' && i + 1 < s.length) {
			const n = s[++i];
			out += { n: '\n', r: '\r', t: '\t', 0: '\0', Z: '\x1a' }[n] ?? n;
		} else out += c;
	}
	return out;
}

function field(tok) {
	if (tok === 'NULL') return null;
	return tok[0] === "'" ? unescapeSql(tok) : tok;
}

function rowsOf(line, cb) {
	ROW_RE.lastIndex = 0;
	let m;
	while ((m = ROW_RE.exec(line)) !== null) {
		FIELD_RE.lastIndex = 0;
		const vals = [];
		let f;
		const inner = m[0].slice(1, -1);
		while ((f = FIELD_RE.exec(inner)) !== null) vals.push(field(f[0]));
		cb(vals);
	}
}

function columnsOf(line) {
	const m = line.match(/^INSERT INTO `[^`]+`\s*\(([^)]*)\)\s*VALUES/);
	return m ? m[1].split(',').map((s) => s.trim().replace(/^`|`$/g, '')) : null;
}

// Legge una tabella del dump e chiama cb(riga) per ogni riga; `filtro` (opzionale)
// scarta le righe a basso costo prima del parsing completo.
async function leggiTabella(nomeTabella, cb, filtro) {
	const rl = readline.createInterface({
		input: fs.createReadStream(DUMP, { encoding: 'utf8', highWaterMark: 4 * 1024 * 1024 }),
		crlfDelay: Infinity,
	});
	let tabella = null;
	let colonne = null;
	for await (const line of rl) {
		const t = line.match(/^-- Table structure for table `([^`]+)`/);
		if (t) {
			tabella = t[1];
			colonne = null;
			continue;
		}
		if (tabella !== nomeTabella) continue;
		const inizio = line.startsWith('INSERT INTO `' + nomeTabella + '`');
		if (!inizio && line[0] !== '(') continue;
		if (inizio) {
			colonne = columnsOf(line);
			if (!colonne) continue;
		}
		if (!colonne) continue;
		if (filtro && !filtro(line)) continue;
		rowsOf(line, (vals) => {
			const riga = {};
			colonne.forEach((c, i) => (riga[c] = vals[i]));
			cb(riga);
		});
	}
}

// 1) pagine
const pagine = new Map();
// Per risolvere i link dinamici di Elementor ("internal-url"): ID di pagina -> slug,
// ID di allegato -> percorso del file.
const risoluzione = { pagine: {}, allegati: {} };
await leggiTabella(PREFISSO + 'posts', (r) => {
	if (r.post_type === 'attachment') {
		risoluzione.allegati[r.ID] = (r.guid || '').replace(/^https?:\/\/[^/]+/, '');
		return;
	}
	if (r.post_type === 'page') risoluzione.pagine[r.ID] = r.post_name;
	// elementor_library: template di header/footer del Theme Builder (menu, contatti)
	if (r.post_type !== 'page' && r.post_type !== 'elementor_library') return;
	pagine.set(String(r.ID), {
		id: Number(r.ID),
		slug: r.post_name,
		title: r.post_title,
		status: r.post_status,
		parent: Number(r.post_parent),
		date: r.post_date,
		modified: r.post_modified,
		contentHtml: r.post_content || '',
	});
});
console.error(`pagine trovate: ${pagine.size}`);

// 2) meta di quelle pagine
const CHIAVI = new Set([
	'_elementor_data',
	'_elementor_template_type',
	'_wp_page_template',
	'_thumbnail_id',
	'_yoast_wpseo_title',
	'_yoast_wpseo_metadesc',
	'_yoast_wpseo_focuskw',
	'_yoast_wpseo_meta-robots-noindex',
]);
const meta = new Map();
await leggiTabella(
	PREFISSO + 'postmeta',
	(r) => {
		const id = String(r.post_id);
		if (!pagine.has(id) || !CHIAVI.has(r.meta_key)) return;
		if (!meta.has(id)) meta.set(id, {});
		meta.get(id)[r.meta_key] = r.meta_value;
	},
	(line) => line.includes("'_elementor_data'") || line.includes("'_yoast_wpseo_") || line.includes("'_wp_page_template'") || line.includes("'_thumbnail_id'")
);

// 3) scrittura
const indice = [];
for (const [id, p] of pagine) {
	const m = meta.get(id) ?? {};
	let elementor = null;
	if (m._elementor_data) {
		try {
			elementor = JSON.parse(m._elementor_data);
		} catch {
			elementor = null;
		}
	}
	const out = {
		id: p.id,
		slug: p.slug,
		title: p.title,
		status: p.status,
		date: p.date,
		modified: p.modified,
		template: m._wp_page_template || null,
		thumbnailId: m._thumbnail_id ? Number(m._thumbnail_id) : null,
		yoast: {
			title: m._yoast_wpseo_title || null,
			description: m._yoast_wpseo_metadesc || null,
			focusKeyword: m._yoast_wpseo_focuskw || null,
			noindex: m['_yoast_wpseo_meta-robots-noindex'] === '1',
		},
		hasElementor: !!elementor,
		contentHtml: elementor ? '' : p.contentHtml,
		elementorData: elementor,
	};
	const nome = `${p.slug || 'senza-slug-' + p.id}.json`;
	fs.writeFileSync(path.join(OUT, nome), JSON.stringify(out));
	indice.push({ id: p.id, slug: p.slug, title: p.title, status: p.status, hasElementor: out.hasElementor, yoastTitle: out.yoast.title, yoastDescription: !!out.yoast.description, noindex: out.yoast.noindex });
}
fs.writeFileSync(path.join(OUT, '_risoluzione.json'), JSON.stringify(risoluzione));

// 4) redirect del plugin Redirection (per mantenere gli indirizzi del vecchio sito)
const redirect = [];
await leggiTabella(PREFISSO + 'redirection_items', (r) => {
	if (r.status === 'enabled' && r.action_type === 'url' && r.regex === '0') {
		redirect.push({ da: r.url, a: r.action_data, codice: Number(r.action_code), visite: Number(r.last_count) });
	}
});
fs.writeFileSync(path.join(OUT, '_redirect.json'), JSON.stringify(redirect, null, 1));
console.error(`redirect attivi: ${redirect.length}`);
indice.sort((a, b) => a.slug.localeCompare(b.slug));
fs.writeFileSync(path.join(OUT, 'indice.json'), JSON.stringify(indice, null, 2));
console.error(`scritti ${indice.length} file in ${OUT}`);
