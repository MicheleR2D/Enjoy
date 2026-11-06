// Adatta il sito compilato per GitHub Pages, dove un repository "di progetto" sta in una sottocartella
// (https://<utente>.github.io/<repository>/) e non alla radice del dominio.
//
// Il sito usa indirizzi che partono dalla radice (/yoga, /wp-content/..., /_img/...): in una
// sottocartella non funzionerebbero. Questo script li riscrive aggiungendo il prefisso, nei file
// gia' compilati in .vercel/output/static, senza toccare il codice del sito (che resta pensato
// per un dominio proprio, come su Vercel). Viene lanciato solo dal workflow di GitHub Pages.
//
// E' un'anteprima da condividere, non il sito definitivo: le pagine sono escluse dai motori di
// ricerca (meta noindex e robots.txt) e i redirect dal vecchio sito, che esistono solo su Vercel,
// non ci sono.
//
//   node scripts/pages-anteprima.mjs Enjoy
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Il nome del repository va passato senza barre (con la barra, Git Bash su Windows lo trasforma in un percorso).
const nome = process.argv[2] ?? '';
if (!/^[A-Za-z0-9._-]+$/.test(nome)) {
	console.error('Indica il nome del repository, senza barre, per esempio: node scripts/pages-anteprima.mjs Enjoy');
	process.exit(1);
}
const base = '/' + nome;
const out = join(process.cwd(), '.vercel/output/static');

const file = (dir) =>
	readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? file(join(dir, e.name)) : [join(dir, e.name)]));

// "/yoga" -> "/Enjoy/yoga"; gli indirizzi senza "/" iniziale, quelli con "//" e quelli gia' col prefisso restano com'e'
const prefissa = (u) => (u.startsWith('/') && !u.startsWith('//') && u !== base && !u.startsWith(base + '/') ? base + u : u);

let html = 0;
let css = 0;

for (const f of file(out)) {
	if (f.endsWith('.html')) {
		let h = readFileSync(f, 'utf8');
		const prima = h;

		// attributi con un indirizzo: href="/x", src="/x", data-src="/x", poster="/x"
		h = h.replace(/(\s(?:href|src|data-src|poster|action)=")(\/(?!\/)[^"]*)"/g, (_, a, u) => `${a}${prefissa(u)}"`);
		// elenchi di immagini: srcset="/a 480w, /b 960w"
		h = h.replace(/(\s(?:srcset|data-srcset)=")([^"]*)"/g, (_, a, v) => `${a}${v.replace(/(^|,\s*)(\/(?!\/)\S+)/g, (m, sep, u) => sep + prefissa(u))}"`);
		// url(/...) negli stili incorporati e negli attributi style
		h = h.replace(/url\((&quot;|'|")?(\/(?!\/)[^)'"&]*)/g, (_, q = '', u) => `url(${q}${prefissa(u)}`);
		// dati JSON incorporati (il pop-up dei corsi negli orari): valori che sono percorsi
		h = h.replace(/(<script[^>]*type="application\/json"[^>]*>)([\s\S]*?)(<\/script>)/g, (_, a, j, c) => a + j.replace(/"(\/(?!\/)[A-Za-z0-9_][^"]*)"/g, (m, v) => `"${v.replace(/(^|,\s*)(\/(?!\/)[^\s,]+)/g, (x, sep, u) => sep + prefissa(u))}"`) + c);
		// indirizzi assoluti del sito (canonical, og:url, og:image, JSON-LD): ora stanno nella sottocartella
		h = h.replace(/(https:\/\/[A-Za-z0-9.-]+\.github\.io)\/(?!Enjoy\/)/g, `$1${base}/`);
		// anteprima: non da indicizzare
		if (!/name="robots"/.test(h)) h = h.replace(/<head>/, '<head><meta name="robots" content="noindex, nofollow">');

		if (h !== prima) {
			writeFileSync(f, h);
			html++;
		}
	} else if (f.endsWith('.css')) {
		const c = readFileSync(f, 'utf8');
		const n = c.replace(/url\((['"]?)(\/(?!\/)[^)'"]*)/g, (_, q, u) => `url(${q}${prefissa(u)}`);
		if (n !== c) {
			writeFileSync(f, n);
			css++;
		}
	}
}

// robots.txt: niente indicizzazione; .nojekyll: GitHub non deve elaborare le cartelle che iniziano con "_"
writeFileSync(join(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
writeFileSync(join(out, '.nojekyll'), '');
console.log(`[pages] prefisso ${base}: ${html} pagine e ${css} fogli di stile adattati.`);
