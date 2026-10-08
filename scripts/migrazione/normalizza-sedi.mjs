// Estrae le pagine delle due sedi (Camuzzago e Meda) dal JSON Elementor del vecchio sito e le
// scrive come src/data/pagine/<slug>.json con tipo "sede".
//
// Uso:  node scripts/migrazione/normalizza-sedi.mjs <cartella-estratta> [cartella-output]
//
// Struttura delle pagine originali: hero (titolo che ruota + frase + due pulsanti), "Scegli
// ogni giorno il tuo benessere" con gli orari, "La Struttura" (due testi), una fisarmonica
// con gli ambienti (ognuno con foto in carosello e descrizione) e un carosello di card con
// le attivita' della sede.
//
// La pagina di Meda si chiamava "meda-3": nel nuovo sito diventa /meda (il vecchio indirizzo
// reindirizza qui, vedi normalizza-redirect.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { strip, percorso, pulisci, widgets, collegamento, caricaRisoluzione, maiuscoleIniziali } from './lib.mjs';

const [, , IN, OUT = 'src/data/pagine'] = process.argv;
if (!IN) {
	console.error('Uso: node normalizza-sedi.mjs <cartella-estratta> [cartella-output]');
	process.exit(1);
}
caricaRisoluzione(IN);
fs.mkdirSync(OUT, { recursive: true });

const SEDI = [
	{ origine: 'camuzzago', slug: 'camuzzago', nome: 'Camuzzago' },
	{ origine: 'meda-3', slug: 'meda', nome: 'Meda' },
];

const troncato = (t, max = 155) => (t.length > max ? t.slice(0, max).replace(/\s+\S*$/, '') + '…' : t);
const h = (w, tag) => w.widgetType === 'heading' && (w.settings.header_size || 'h2') === tag;

for (const sede of SEDI) {
	const d = JSON.parse(fs.readFileSync(path.join(IN, sede.origine + '.json'), 'utf8'));
	const el = d.elementorData;
	const tutti = el.flatMap((s) => widgets(s));

	// --- hero
	const heroSez = el[0];
	const heroWs = widgets(heroSez);
	const an = heroWs.find((w) => w.widgetType === 'animated-headline')?.settings || {};
	const parole = String(an.rotating_text || '').split('\n').map(strip).filter(Boolean);
	// L'hero originale ha un video YouTube di sfondo; qui si usa la foto di ripiego scelta dal sito.
	const sfondo = (function cerca(n) {
		if (n.settings?.background_image?.url) return n.settings.background_image.url;
		if (n.settings?.background_video_fallback?.url) return n.settings.background_video_fallback.url;
		for (const c of n.elements || []) if (c.elType !== 'widget') { const r = cerca(c); if (r) return r; }
		return null;
	})(heroSez);
	const pulsanti = heroWs
		.filter((w) => w.widgetType === 'button')
		.map((w) => ({ testo: maiuscoleIniziali(strip(w.settings.text)), href: collegamento(w.settings, 'link') ?? '#prova' }));

	// --- orari (blockquote), struttura (testi), ambienti (fisarmonica)
	const bq = tutti.find((w) => w.widgetType === 'blockquote');
	const orariHtml = bq ? pulisci(bq.settings.blockquote_content) : null;
	const titoloOrari = strip(tutti.find((w) => h(w, 'h2') && /benessere/i.test(strip(w.settings.title)))?.settings.title) || null;

	const iStr = tutti.findIndex((w) => h(w, 'h2') && /struttura/i.test(strip(w.settings.title)));
	const struttura = {
		titolo: strip(tutti[iStr]?.settings.title),
		sottotitolo: strip(tutti.slice(iStr + 1).find((w) => w.widgetType === 'text-editor')?.settings.editor),
		testi: tutti
			.slice(iStr + 1)
			.filter((w) => w.widgetType === 'icon-box')
			.map((w) => pulisci(w.settings.description_text)),
	};

	const accordion = tutti.find((w) => w.widgetType === 'nested-accordion');
	const ambienti = (accordion?.settings.items || []).map((it, i) => {
		const contenuto = widgets(accordion.elements?.[i] || { elements: [] });
		const slides = contenuto.find((w) => w.widgetType === 'slides');
		return {
			titolo: strip(it.item_title),
			immagini: (slides?.settings.slides || []).map((s) => percorso(s.background_image?.url)).filter(Boolean),
			html: contenuto.filter((w) => w.widgetType === 'text-editor').map((w) => pulisci(w.settings.editor)).join(''),
		};
	});

	// --- attivita' della sede (carosello di card con foto di sfondo; le card stanno dentro il
	// widget "nested-carousel", che widgets() non attraversa)
	const profondi = (n, out = []) => {
		for (const c of n.elements || []) {
			if (c.elType === 'widget') out.push(c);
			profondi(c, out);
		}
		return out;
	};
	const attivita = el
		.flatMap((s) => profondi(s))
		.filter((w) => w.widgetType === 'call-to-action')
		.map((w) => ({ titolo: maiuscoleIniziali(strip(w.settings.title)), href: collegamento(w.settings, 'link'), immagine: percorso(w.settings.bg_image?.url) }));
	// Alcune card non avevano un collegamento nel sito originale: si completano con la pagina omonima.
	const LINK = {
		'gym floor': '/gym-floor', 'corsi fitness': '/corsi-fitness', 'acqua gym': '/acqua-gym', 'x-class': '/x-class',
		'nuoto libero': '/nuoto-libero', 'nuoto adulti': '/nuoto-adulti', 'personal training': '/personal-training',
		'nuoto neonatale': '/nuoto-neonatale', 'nuoto bambini': '/nuoto-bambini', 'health fitness': '/health-fitness-camuzzago',
	};
	for (const a of attivita) a.href ??= LINK[a.titolo.toLowerCase()] ?? null;
	const titoloAttivita =strip(tutti.find((w) => h(w, 'h2') && /attivit/i.test(strip(w.settings.title)))?.settings.title) || `Le attività nella sede di ${sede.nome}`;

	const pagina = {
		tipo: 'sede',
		slug: sede.slug,
		nome: sede.nome,
		seo: {
			title: d.yoast.title || `Enjoy Club ${sede.nome} | Palestra e Piscina`,
			// Yoast ha una descrizione solo per Camuzzago: per le altre si usa l'inizio del testo della struttura.
			description: d.yoast.description || troncato(strip(`${struttura.sottotitolo}. ${struttura.testi[0] ?? ''}`)),
		},
		hero: {
			titolo: strip(an.before_text),
			parole,
			sottotitolo: strip(heroWs.find((w) => h(w, 'h2'))?.settings.title),
			immagine: percorso(sfondo),
			pulsanti,
		},
		orari: { titolo: titoloOrari, html: orariHtml },
		struttura,
		ambienti,
		attivita: { titolo: titoloAttivita, card: attivita },
	};
	fs.writeFileSync(path.join(OUT, sede.slug + '.json'), JSON.stringify(pagina, null, '\t') + '\n');
	console.log(sede.slug, {
		hero: pagina.hero.immagine ? 'ok' : 'MANCA',
		pulsanti: pulsanti.map((p) => p.testo),
		ambienti: ambienti.map((a) => `${a.titolo}(${a.immagini.length})`),
		attivita: attivita.length,
		orari: !!orariHtml,
		struttura: struttura.testi.length,
	});
}
