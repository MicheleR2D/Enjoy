// Converte le schede (corsi, nuoto, acqua gym, personal training...) estratte dal vecchio
// sito (JSON Elementor) in dati puliti per il template "scheda": src/data/pagine/<slug>.json.
//
// Uso:  node scripts/migrazione/normalizza-schede.mjs <cartella-estratta> [cartella-output]
// (la cartella estratta e' l'output di estrai-pagine.mjs)
//
// Le schede di Enjoy hanno tutte la stessa impalcatura: hero, uno o piu' blocchi
// (titolo h2 + testo + durata + "cosa portare" + barre di intensita'), FAQ e, in fondo,
// le sedi in cui si svolge l'attivita'. Un blocco e' il contenitore piu' grande che
// contiene un solo titolo h2 "di contenuto" (non l'hero, non "Questo corso si tiene
// nelle sedi di", non "F.A.Q."). Cosi' funziona sia per le schede a blocco singolo
// sia per quelle con piu' blocchi (nuoto bambini, X-Class, acqua gym).
//
// Fedelta' ai contenuti: i testi restano quelli del sito originale (solo ripuliti dagli
// stili Elementor).
import fs from 'node:fs';
import path from 'node:path';
import { strip, percorso, pulisci, widgets, maiuscoleIniziali, etichetta, heroDa, collegamento, caricaRisoluzione } from './lib.mjs';

const [, , IN, OUT = 'src/data/pagine'] = process.argv;
if (!IN) {
	console.error('Uso: node normalizza-schede.mjs <cartella-estratta> [cartella-output]');
	process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });
caricaRisoluzione(IN);

// Pagine che hanno un template o un mapper proprio (non sono schede).
const ESCLUSE = new Set([
	'home', 'orari', 'camuzzago', 'meda-3', 'corsi-fitness', 'eventi', 'privacy',
	'info-neonatale', 'info-scuola-nuoto-camuzzago', 'info-scuola-nuoto-meda',
]);

// Titoli h2 che non aprono un blocco di contenuto.
const TITOLO_NON_BLOCCO = /(si tiene|potrai allenarti|sedi di|f\.?a\.?q)/i;

const SEDE_DA_NOME = (t) => (/camuzzago/i.test(t) ? 'camuzzago' : /meda|montecarlo/i.test(t) ? 'meda' : null);

const eTitoloBlocco = (n) =>
	n.elType === 'widget' && n.widgetType === 'heading' && (n.settings?.header_size || 'h2') === 'h2' && strip(n.settings?.title) && !TITOLO_NON_BLOCCO.test(strip(n.settings.title));

// Quanti titoli di blocco ci sono nel sottoalbero.
function contaTitoli(n) {
	if (eTitoloBlocco(n)) return 1;
	return (n.elements || []).reduce((tot, c) => tot + contaTitoli(c), 0);
}

// Contenitori "blocco": il piu' grande che contiene esattamente un titolo di blocco.
function trovaBlocchi(nodo, out = []) {
	for (const c of nodo.elements || []) {
		if (c.elType === 'widget') continue;
		const n = contaTitoli(c);
		if (n === 1) out.push(c);
		else if (n > 1) trovaBlocchi(c, out);
	}
	return out;
}

// Prima foto di sfondo di un contenitore interno (i blocchi hanno la foto come sfondo di
// un contenitore a lato del testo).
function sfondoInterno(nodo) {
	for (const c of nodo.elements || []) {
		if (c.elType === 'widget') continue;
		const bg = c.settings?.background_image?.url;
		if (bg) return percorso(bg);
		const r = sfondoInterno(c);
		if (r) return r;
	}
	return null;
}

function blocco(cont) {
	const ws = widgets(cont);
	const b = { id: null, titolo: null, sottotitolo: null, descrizioneHtml: '', video: null, immagini: [], dettagli: [], portareTitolo: null, portare: [], intensita: [], pulsanti: [], sedi: [] };
	for (const w of ws) {
		const s = w.settings || {};
		switch (w.widgetType) {
			case 'heading': {
				const testo = strip(s.title);
				if (!testo) break;
				if (s.header_size === 'h3') b.portareTitolo = etichetta(testo);
				else if (s.header_size === 'h6') b.sottotitolo = maiuscoleIniziali(testo);
				// Alcune pagine usano un "titolo" senza livello (div/p) per una frase di descrizione.
				else if (s.header_size === 'div' || s.header_size === 'p') b.descrizioneHtml += `<p>${testo}</p>`;
				else if (!b.titolo && eTitoloBlocco(w)) b.titolo = testo;
				break;
			}
			case 'gallery':
				for (const f of s.gallery || []) if (f.url) b.immagini.push(percorso(f.url));
				break;
			case 'button': {
				const href = collegamento(s, 'link');
				if (href && !href.startsWith('#')) b.pulsanti.push({ testo: etichetta(s.text), href, esterno: /^https?:/.test(href) });
				break;
			}
			case 'text-editor':
				b.descrizioneHtml += pulisci(s.editor, { abbassaTitoli: true });
				break;
			case 'blockquote':
				b.descrizioneHtml += '<p>' + pulisci(s.blockquote_content).replace(/^<p>|<\/p>$/g, '') + '</p>';
				break;
			case 'icon-list':
				for (const it of s.icon_list || []) {
					const t = strip(it.text);
					if (t) b.dettagli.push({ testo: t, icona: it.selected_icon?.value || null });
				}
				break;
			case 'image-box':
				b.portare.push({ etichetta: strip(s.title_text), immagine: percorso(s.image?.url) });
				break;
			case 'video':
				b.video = percorso(s.hosted_url?.url || null);
				break;
			case 'image':
				if (s.image?.url && !b.immagini.length) b.immagini.push(percorso(s.image.url));
				break;
			case 'progress':
				// Elementor non salva i valori predefiniti: una barra senza "percent" vale 50.
				b.intensita.push({ etichetta: etichetta(s.inner_text || s.title || ''), valore: Number(s.percent?.size ?? 50) });
				break;
			case 'call-to-action': {
				const sede = SEDE_DA_NOME(strip(s.title));
				if (sede) b.sedi.push(sede);
				break;
			}
		}
	}
	if (!b.immagini.length && !b.video) {
		const bg = sfondoInterno(cont);
		if (bg) b.immagini.push(bg);
	}
	return b;
}

const indice = [];
const file = fs.readdirSync(IN).filter((f) => f.endsWith('.json') && !f.startsWith('_') && f !== 'indice.json');
for (const f of file) {
	const d = JSON.parse(fs.readFileSync(path.join(IN, f), 'utf8'));
	if (ESCLUSE.has(d.slug) || d.status !== 'publish' || !d.elementorData?.length) continue;
	// Solo le pagine vere (non template: per slug iniziano con elementor-/fitnation-/single-...)
	if (/^(elementor-|fitnation-|single-|struttura-|corso-singolo|404$)/.test(d.slug)) continue;

	const el = d.elementorData;
	const hero = el[0];
	const accContainer = el.find((sec) => widgets(sec).some((w) => w.widgetType === 'nested-accordion'));
	const acc = accContainer && widgets(accContainer).find((w) => w.widgetType === 'nested-accordion');
	const faq = (acc?.settings.items || []).map((it, i) => {
		const testi = widgets(acc.elements?.[i] || { elements: [] })
			.filter((w) => w.widgetType === 'text-editor')
			.map((w) => pulisci(w.settings.editor))
			.join('');
		return { domanda: strip(it.item_title), risposta: testi && !/lorem ipsum/i.test(testi) ? testi : null };
	});

	const corpo = el.slice(1).filter((sec) => sec !== accContainer);
	const contenitori = corpo.flatMap((sec) => (contaTitoli(sec) === 1 ? [sec] : trovaBlocchi(sec)));
	const blocchi = contenitori.map(blocco).filter((b) => b.titolo && (b.descrizioneHtml || b.video || b.portare.length));
	for (const b of blocchi) if (!b.pulsanti.length) delete b.pulsanti;

	// Sedi della pagina: quelle dei blocchi, o le CTA fuori dai blocchi (in fondo alla pagina).
	const sediPagina = new Set(blocchi.flatMap((b) => b.sedi));
	for (const sec of corpo) {
		if (contenitori.includes(sec)) continue;
		for (const w of widgets(sec)) if (w.widgetType === 'call-to-action') {
			const s = SEDE_DA_NOME(strip(w.settings.title));
			if (s) sediPagina.add(s);
		}
	}
	// Se i blocchi hanno sedi diverse tra loro, ciascuno mostra la propria: chip "Sede".
	const sediTutti = [...sediPagina];
	const sediDiverse = new Set(blocchi.map((b) => b.sedi.join('+'))).size > 1;
	for (const b of blocchi) {
		if (sediDiverse && b.sedi.length) {
			b.dettagli.push({ testo: 'Sede: ' + b.sedi.map((x) => maiuscoleIniziali(x)).join(' e '), icona: null });
		}
		delete b.sedi;
	}

	const nome = strip(d.title).replace(/\s+[–-]\s+Enjoy\s+(Club|Palestre)\s*$/i, '').trim();
	const heroDati = heroDa(hero);
	// Se l'hero non ha una foto propria si usa quella del primo blocco.
	if (!heroDati.immagine) heroDati.immagine = blocchi[0]?.immagini[0] ?? null;
	// "corso": i blocchi senza foto ripiegano su una foto della pagina; "servizio": niente
	// ripiego (schede con blocchi di solo testo, come le fasi del nuoto neonatale).
	const tuttiConMedia = blocchi.every((b) => b.immagini.length || b.video);
	const testoPiano = strip(blocchi[0]?.descrizioneHtml || '');
	const descrizioneSeo = testoPiano.length > 155 ? testoPiano.slice(0, 155).replace(/\s+\S*$/, '') + '…' : testoPiano;

	const pagina = {
		tipo: tuttiConMedia ? 'corso' : 'servizio',
		slug: d.slug,
		nome,
		seo: {
			title: d.yoast.title || `${nome} - Enjoy Club | Meda e Camuzzago`,
			description: d.yoast.description || descrizioneSeo,
		},
		hero: heroDati,
		blocchi,
		faq,
		sedi: sediTutti.length ? sediTutti : undefined,
	};
	fs.writeFileSync(path.join(OUT, d.slug + '.json'), JSON.stringify(pagina, null, '\t') + '\n');
	indice.push({
		slug: d.slug,
		blocchi: blocchi.length,
		img: blocchi.filter((b) => b.immagini.length || b.video).length,
		barre: blocchi.reduce((n, b) => n + b.intensita.length, 0),
		portare: blocchi.reduce((n, b) => n + b.portare.length, 0),
		faq: faq.length,
		faqRisp: faq.filter((x) => x.risposta).length,
		sedi: sediTutti.join('+'),
		hero: heroDati.immagine ? 'ok' : 'MANCA',
	});
}
console.table(indice);
