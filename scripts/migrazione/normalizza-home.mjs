// Estrae dalle pagine Elementor "home", "orari" e "corsi-fitness" i dati per le pagine
// scritte a mano in src/pages (home e orari) e per il template "elenco" (corsi-fitness).
// Scrive src/data/home.json, src/data/orari-pagina.json e src/data/pagine/corsi-fitness.json.
//
// Uso:  node scripts/migrazione/normalizza-home.mjs <cartella-estratta>
//
// I testi sono quelli del sito originale (ripuliti dagli stili Elementor); il layout e'
// disegnato dalle pagine Astro.
import fs from 'node:fs';
import path from 'node:path';
import { strip, percorso, pulisci, widgets, collegamento, caricaRisoluzione, maiuscoleIniziali, heroDa } from './lib.mjs';

const [, , IN] = process.argv;
if (!IN) {
	console.error('Uso: node normalizza-home.mjs <cartella-estratta>');
	process.exit(1);
}
caricaRisoluzione(IN);
const leggi = (slug) => JSON.parse(fs.readFileSync(path.join(IN, slug + '.json'), 'utf8'));
const scrivi = (file, dati) => {
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, JSON.stringify(dati, null, '\t') + '\n');
};

// Card "flip-box": foto di sfondo (fronte), titolo e collegamento (retro).
const card = (w) => {
	const s = w.settings || {};
	return {
		titolo: maiuscoleIniziali(strip(s.title_text_a) || strip(s.title_text_b)),
		descrizione: strip(s.description_text_a) || null,
		href: collegamento(s, 'link'),
		immagine: percorso(s.background_a_image?.url),
	};
};
const testi = (ws) => ws.filter((w) => w.widgetType === 'text-editor').map((w) => pulisci(w.settings.editor));
const h2 = (w) => w.widgetType === 'heading' && (w.settings.header_size || 'h2') === 'h2';

// ------------------------------------------------------------------ home
{
	const d = leggi('home');
	const sez = d.elementorData;
	const tutti = sez.flatMap((s) => widgets(s));

	const intro = testi(widgets(sez[0]))[0];
	const caroselli = tutti.filter((w) => w.widgetType === 'media-carousel' || w.widgetType === 'image-carousel');
	const slide = (w) => (w?.settings.slides || w?.settings.carousel || []).map((i) => percorso(i.image?.url ?? i.url)).filter(Boolean);

	// "Storia": contenitore con foto di sfondo + blockquote + testo + pulsante
	const storiaSez = sez.find((s) => widgets(s).some((w) => w.widgetType === 'blockquote'));
	const storiaWs = widgets(storiaSez);
	const storiaFoto = (function cerca(n) {
		for (const c of n.elements || []) {
			if (c.elType !== 'widget' && c.settings?.background_image?.url) return percorso(c.settings.background_image.url);
			const r = c.elType !== 'widget' ? cerca(c) : null;
			if (r) return r;
		}
		return null;
	})(storiaSez);

	// Sezioni di card: dopo ogni titolo h2 "Le nostre attivita'..." / "Health Fitness"
	const gruppi = [];
	let corrente = null;
	for (const w of tutti) {
		if (h2(w)) {
			const t = strip(w.settings.title);
			if (/attivit|health fitness/i.test(t)) {
				corrente = { titolo: t, html: '', card: [] };
				gruppi.push(corrente);
			} else corrente = null;
		} else if (corrente && w.widgetType === 'text-editor') corrente.html += pulisci(w.settings.editor);
		else if (corrente && w.widgetType === 'flip-box') corrente.card.push(card(w));
	}

	// Metodo: titolo + frase + 4 punti (titolo, testo) a coppie
	// (i testi stanno in una sezione dopo il titolo: si raccolgono fino al titolo successivo)
	const iMetodo = tutti.findIndex((w) => h2(w) && /metodo/i.test(strip(w.settings.title)));
	const dopo = tutti.slice(iMetodo + 1);
	const fine = dopo.findIndex((w) => h2(w));
	const metodoWs = dopo.slice(0, fine === -1 ? undefined : fine);
	const metodoTesti = testi(metodoWs);
	const metodo = {
		intro: metodoTesti.slice(0, 2),
		punti: Array.from({ length: Math.floor((metodoTesti.length - 2) / 2) }, (_, i) => ({ titolo: strip(metodoTesti[2 + i * 2]), html: metodoTesti[3 + i * 2] })),
		immagine: percorso(tutti.slice(Math.max(0, iMetodo - 3), iMetodo).find((w) => w.widgetType === 'image')?.settings.image?.url),
	};

	const testimonianze = tutti
		.filter((w) => w.widgetType === 'testimonial')
		.map((w) => ({ nome: maiuscoleIniziali(strip(w.settings.testimonial_name)), testo: strip(w.settings.testimonial_content) }));

	scrivi('src/data/home.json', {
		seo: {
			title: 'Enjoy Club - Palestra e Piscina a Meda e Camuzzago (Brianza)',
			description: 'Enjoy Club: palestra, piscine e corsi a Meda e Camuzzago, in Brianza. Palestra della Salute riconosciuta da Regione Lombardia. Prova ora!',
		},
		hero: { intro, immagini: slide(caroselli.find((w) => w.widgetType === 'media-carousel')) },
		marquee: slide(caroselli.find((w) => w.widgetType === 'image-carousel')),
		storia: {
			titolo: strip(storiaWs.find((w) => w.widgetType === 'blockquote').settings.blockquote_content),
			html: pulisci(testi(storiaWs)[0]),
			immagine: storiaFoto,
		},
		contatori: tutti
			.filter((w) => w.widgetType === 'counter')
			.map((w) => ({ target: Number(w.settings.ending_number), suffisso: strip(w.settings.suffix), titolo: maiuscoleIniziali(strip(w.settings.title)) })),
		metodo,
		gruppi,
		testimonianze,
		orari: { testo: testi(tutti.filter((w, i) => i > tutti.findIndex((x) => h2(x) && /migliori/i.test(strip(x.settings.title)))))[0] },
	});
	console.log('home:', { slide: slide(caroselli[0]).length, marquee: slide(caroselli[1]).length, gruppi: gruppi.map((g) => `${g.titolo} (${g.card.length})`), metodo: metodo.punti.length, testimonianze: testimonianze.length });
}

// ------------------------------------------------------------------ orari
{
	const d = leggi('orari');
	const tutti = d.elementorData.flatMap((s) => widgets(s));
	const sedi = tutti.filter((w) => w.widgetType === 'flip-box').map((w) => ({ nome: maiuscoleIniziali(strip(w.settings.title_text_a)), immagine: percorso(w.settings.background_a_image?.url), pdf: collegamento(w.settings, 'link') }));
	scrivi('src/data/orari-pagina.json', {
		seo: { title: 'Planning Orari - Enjoy Club', description: 'Gli orari aggiornati dei corsi di Enjoy Club a Meda e Camuzzago: scarica il planning della sede che ti interessa.' },
		hero: heroDa(d.elementorData[0]),
		intro: testi(tutti).map((t) => t),
		titolo: strip(tutti.find((w) => h2(w) && /sede/i.test(strip(w.settings.title)))?.settings.title),
		sedi,
	});
	console.log('orari:', sedi);
}

// ------------------------------------------------------------------ corsi-fitness
{
	const d = leggi('corsi-fitness');
	const sez = d.elementorData;
	const tutti = sez.flatMap((s) => widgets(s));
	const corsi = tutti.filter((w) => w.widgetType === 'flip-box').map(card);
	const introHtml = pulisci(testi(tutti)[0], { abbassaTitoli: true });
	const hero = heroDa(sez[0]);
	const titoloHero = strip(tutti.find((w) => h2(w))?.settings.title);
	const acc = tutti.find((w) => w.widgetType === 'nested-accordion');
	const faq = (acc?.settings.items || []).map((it, i) => ({
		domanda: strip(it.item_title),
		risposta: widgets(acc.elements?.[i] || { elements: [] })
			.filter((w) => w.widgetType === 'text-editor')
			.map((w) => pulisci(w.settings.editor))
			.join('') || null,
	}));
	// Foto di fondo dell'hero: l'hero e' diviso in tre contenitori con foto diverse; si usa quella centrale (con il titolo).
	const centro = sez[0].elements.find((c) => c.settings?.background_image?.url && widgets(c).length);
	scrivi('src/data/pagine/corsi-fitness.json', {
		tipo: 'elenco',
		slug: 'corsi-fitness',
		nome: 'Corsi Fitness',
		seo: {
			title: 'Corsi Fitness a Meda e Camuzzago - Enjoy Club',
			description: strip(introHtml).slice(0, 155).replace(/\s+\S*$/, '') + '…',
		},
		hero: { titolo: hero.titolo, parole: hero.parole, immagine: percorso(centro?.settings.background_image.url) ?? hero.immagine, badge: titoloHero },
		introHtml,
		corsi,
		faq,
	});
	console.log('corsi-fitness:', corsi.length, 'corsi');
}
