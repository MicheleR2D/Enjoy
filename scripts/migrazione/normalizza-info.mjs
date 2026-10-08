// Converte le pagine "Info" (prezzi, orari e regole dei corsi di nuoto) e la privacy dal JSON
// Elementor del vecchio sito in dati per i template "info" e "testo".
//
// Uso:  node scripts/migrazione/normalizza-info.mjs <cartella-estratta> [cartella-output]
//
// Le pagine Info usano i "titoli" come paragrafi e come etichette: invece di indovinare una
// struttura, si conserva l'ordine originale come lista di blocchi:
//   { t: 'titolo', testo }              titolo o riga in evidenza
//   { t: 'testo', html }                paragrafo
//   { t: 'riquadro', blocchi: [...] }   contenitore con sfondo giallo (prezzi, orari)
//   { t: 'fisarmonica', voci: [{ titolo, blocchi }] }
//   { t: 'linea' }                      divisore
//   { t: 'appuntamento', href }         widget Calendly sostituito da un pulsante
import fs from 'node:fs';
import path from 'node:path';
import { strip, pulisci, widgets } from './lib.mjs';

const [, , IN, OUT = 'src/data/pagine'] = process.argv;
if (!IN) {
	console.error('Uso: node normalizza-info.mjs <cartella-estratta> [cartella-output]');
	process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });
const leggi = (slug) => JSON.parse(fs.readFileSync(path.join(IN, slug + '.json'), 'utf8'));

// Converte un nodo Elementor nei blocchi che contiene, in ordine.
function blocchi(nodo) {
	const out = [];
	for (const c of nodo.elements || []) {
		if (c.elType !== 'widget') {
			const bg = c.settings?.background_color;
			const dentro = blocchi(c);
			if (bg && /^#?ffe/i.test(bg) && dentro.length) out.push({ t: 'riquadro', blocchi: dentro });
			else out.push(...dentro);
			continue;
		}
		const s = c.settings || {};
		switch (c.widgetType) {
			case 'heading': {
				const testo = strip(s.title);
				if (testo && testo !== '/') out.push({ t: 'titolo', testo });
				break;
			}
			case 'text-editor': {
				const html = pulisci(s.editor, { abbassaTitoli: true });
				if (html) out.push({ t: 'testo', html });
				break;
			}
			case 'divider':
				out.push({ t: 'linea' });
				break;
			case 'html': {
				const m = String(s.html || '').match(/data-url="([^"]+calendly[^"]*)"/);
				if (m) out.push({ t: 'appuntamento', href: m[1].split('?')[0] });
				break;
			}
			case 'nested-accordion':
				out.push({
					t: 'fisarmonica',
					voci: (s.items || []).map((it, i) => ({ titolo: strip(it.item_title), blocchi: blocchi(c.elements?.[i] || { elements: [] }) })),
				});
				break;
		}
	}
	return out;
}

// Toglie i divisori doppi o in testa/in coda, e i titoli di un solo trattino.
function pulisciLista(lista) {
	const r = lista.map((b) => ({ ...b, ...(b.blocchi ? { blocchi: pulisciLista(b.blocchi) } : {}), ...(b.voci ? { voci: b.voci.map((v) => ({ ...v, blocchi: pulisciLista(v.blocchi) })) } : {}) }));
	return r.filter((b, i) => !(b.t === 'linea' && (i === 0 || i === r.length - 1 || r[i - 1].t === 'linea')));
}

const INFO = [
	{ slug: 'info-neonatale', nome: 'Info Nuoto Neonatale', desc: 'Orari, costi e regole dei corsi di nuoto neonatale di Enjoy Club a Camuzzago.' },
	{ slug: 'info-scuola-nuoto-camuzzago', nome: 'Info Scuola Nuoto Camuzzago', desc: 'Orari, costi e regole della scuola nuoto di Enjoy Club a Camuzzago.' },
	{ slug: 'info-scuola-nuoto-meda', nome: 'Info Scuola Nuoto Meda', desc: 'Orari, costi e regole della scuola nuoto di Enjoy Club a Meda.' },
];

for (const i of INFO) {
	const d = leggi(i.slug);
	const lista = pulisciLista(d.elementorData.flatMap((s) => blocchi(s)));
	// Il primo titolo e' il titolo della pagina.
	const primo = lista.findIndex((b) => b.t === 'titolo');
	const titolo = primo === 0 ? lista.shift().testo : strip(d.title);
	const pagina = { tipo: 'info', slug: i.slug, nome: i.nome, noindex: d.yoast.noindex, seo: { title: `${titolo} - Enjoy Club`, description: i.desc }, titolo, blocchi: lista };
	fs.writeFileSync(path.join(OUT, i.slug + '.json'), JSON.stringify(pagina, null, '\t') + '\n');
	const conta = (l) => l.reduce((n, b) => n + 1 + (b.blocchi ? conta(b.blocchi) : 0) + (b.voci ? b.voci.reduce((m, v) => m + conta(v.blocchi), 0) : 0), 0);
	console.log(i.slug, { noindex: pagina.noindex, titolo, blocchi: conta(lista) });
}

// Privacy: un unico testo lungo.
{
	const d = leggi('privacy');
	const ws = d.elementorData.flatMap((s) => widgets(s));
	const titolo = strip(ws.find((w) => w.widgetType === 'heading')?.settings.title) || 'Privacy Policy';
	const html = ws.filter((w) => w.widgetType === 'text-editor').map((w) => pulisci(w.settings.editor, { abbassaTitoli: true })).join('');
	const pagina = {
		tipo: 'testo',
		slug: 'privacy',
		nome: 'Privacy',
		seo: { title: 'Privacy Policy - Enjoy Club', description: 'Informativa sul trattamento dei dati personali degli utenti del sito di Enjoy Club.' },
		titolo,
		html,
		immagine: null,
	};
	fs.writeFileSync(path.join(OUT, 'privacy.json'), JSON.stringify(pagina, null, '\t') + '\n');
	console.log('privacy', { caratteri: html.length });
}
