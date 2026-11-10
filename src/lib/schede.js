/*
 * Divide il testo HTML di un ambiente (pagine sede) in "schede" da mostrare come card a scorrimento.
 * Le parole restano quelle del testo: si segue solo la sua struttura.
 *
 * - Sotto-aree con titolo: un paragrafo (o un pezzo di testo) che inizia con un grassetto seguito da
 *   "a capo" o da ":" ("<strong>Area Cardio</strong><br> Tapis roulant...", "<em><strong>Sauna</strong></em>: ...")
 *   diventa una scheda con titolo (il grassetto) e testo (il resto).
 * - Altrimenti: una scheda per paragrafo; un paragrafo con piu' righe ("<br>") si divide per righe; un testo
 *   lungo senza paragrafi ne' righe si divide per frasi, raggruppate fino a circa 260 caratteri.
 *
 * Restituisce un array di { titolo?: string, html: string }. Con una sola scheda il chiamante mostra il
 * testo normale.
 */

const testoPiano = (h) => h.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

// "<em><strong>Titolo:</strong></em> testo" / "<strong>Titolo</strong><br> testo" -> { titolo, html }
const RE_TITOLO = /^(?:<em>\s*)?<strong>([\s\S]*?)<\/strong>(?:\s*<\/em>)?(\s*:)?\s*(<br\s*\/?>)?\s*([\s\S]*)$/;

function conTitolo(pezzo) {
	const m = pezzo.match(RE_TITOLO);
	if (!m) return null;
	const [, grassetto, duePunti, aCapo, resto] = m;
	const titolo = testoPiano(grassetto).replace(/\s*:\s*$/, '');
	// E' un titolo solo se dopo c'e' un "a capo" o i due punti (dentro o fuori dal grassetto):
	// "<strong>Allenati in una stazione...</strong> dotata di..." e' l'inizio di una frase, non un titolo.
	const eTitolo = !!aCapo || !!duePunti || /:\s*$/.test(testoPiano(grassetto));
	// Un grassetto lungo come una frase (oltre 70 caratteri) non e' un titolo: e' la prima frase del testo in evidenza.
	if (!eTitolo || !titolo || titolo.length > 70 || !testoPiano(resto)) return null;
	return { titolo, html: resto.trim().replace(/^(<br\s*\/?>\s*)+/, '') };
}

// Testo lungo senza struttura: gruppi di frasi fino a circa `max` caratteri.
function perFrasi(h, max = 260) {
	const frasi = h.split(/(?<=[.!?])\s+(?=(?:<[^>]+>)*[A-ZÀ-ÖØ-Þ“"«])/);
	const gruppi = [];
	let corrente = '';
	for (const f of frasi) {
		if (corrente && testoPiano(corrente + ' ' + f).length > max) {
			gruppi.push(corrente);
			corrente = f;
		} else {
			corrente = corrente ? corrente + ' ' + f : f;
		}
	}
	if (corrente) gruppi.push(corrente);
	return gruppi;
}

// Un paragrafo fatto solo di un grassetto breve ("<p><strong>Benefici principali:</strong></p>") e' il titolo di
// quello che segue (testo sciolto, liste, paragrafi) fino al titolo successivo.
const RE_SOLO_TITOLO = /^\s*(?:<em>\s*)?<strong>([\s\S]*?)<\/strong>(?:\s*<\/em>)?\s*(?:&nbsp;|\u00a0)?\s*$/;

// Pezzi di primo livello: <p>, <ul>/<ol> e il testo sciolto tra l'uno e l'altro (che prima andava perso).
function pezziPrimoLivello(h) {
	const pezzi = [];
	let ultimo = 0;
	for (const m of h.matchAll(/<p[^>]*>([\s\S]*?)<\/p>|<(ul|ol)[^>]*>[\s\S]*?<\/\2>/g)) {
		const prima = h.slice(ultimo, m.index);
		if (testoPiano(prima)) pezzi.push({ tipo: 'sciolto', html: prima.trim() });
		if (m[2]) pezzi.push({ tipo: 'lista', html: m[0] });
		else if (testoPiano(m[1])) pezzi.push({ tipo: 'p', html: m[1].trim() });
		ultimo = m.index + m[0].length;
	}
	const resto = h.slice(ultimo).replace(/<\/p>\s*$/i, '');
	if (testoPiano(resto)) pezzi.push({ tipo: 'sciolto', html: resto.trim() });
	return pezzi;
}

// Rifiniture sulle schede gia' divise (le parole non cambiano, solo come sono raggruppate):
// - una lista lunga senza titolo (oltre ~300 caratteri) si divide in schede da 2-3 voci;
// - una frase breve che finisce con ":" ("In piu', puoi scegliere corsi specifici come:") resta attaccata alla
//   scheda che la segue, invece di restare sola in una scheda quasi vuota.
const RE_LISTA = /^\s*<(ul|ol)\b/i;
const comeParagrafoHtml = (p) => (/^\s*<(p|ul|ol)\b/i.test(p) ? p : `<p>${p}</p>`);

function rifinisci(schede, maxLista = 300, maxScheda = 0) {
	// - una scheda con il solo titolo (grassetto in fondo al testo, es. la frase finale in evidenza) torna testo normale;
	// - una scheda con titolo e un testo troppo lungo si divide alle andate a capo: il titolo resta sulla prima parte.
	const base = [];
	for (const sc of schede) {
		if (sc.titolo && !testoPiano(sc.html)) {
			base.push({ html: `<p><strong>${sc.titolo}</strong></p>` });
			continue;
		}
		if (sc.titolo && maxScheda && testoPiano(sc.html).length > maxScheda * 0.8 && /<br\s*\/?>/i.test(sc.html)) {
			const parti = sc.html.replace(/^\s*<p>|<\/p>\s*$/gi, '').split(/<br\s*\/?>/i).map((x) => x.trim()).filter((x) => testoPiano(x));
			if (parti.length > 1) {
				base.push({ titolo: sc.titolo, html: `<p>${parti[0]}</p>` });
				for (const p of parti.slice(1)) base.push({ html: `<p>${p}</p>` });
				continue;
			}
		}
		base.push(sc);
	}
	const out = [];
	for (const sc of base) {
		if (!sc.titolo && RE_LISTA.test(sc.html) && testoPiano(sc.html).length > maxLista) {
			const voci = sc.html.match(/<li\b[\s\S]*?<\/li>/g) ?? [];
			if (voci.length >= 3) {
				let gruppo = [];
				for (const v of voci) {
					if (gruppo.length && testoPiano(gruppo.join('') + v).length > maxLista) {
						out.push({ html: '<ul>' + gruppo.join('') + '</ul>' });
						gruppo = [];
					}
					gruppo.push(v);
				}
				if (gruppo.length) out.push({ html: '<ul>' + gruppo.join('') + '</ul>' });
				continue;
			}
		}
		out.push(sc);
	}
	// frase introduttiva ("...come:") + scheda successiva senza titolo
	const unite = [];
	for (let i = 0; i < out.length; i++) {
		const sc = out[i];
		const prossima = out[i + 1];
		const testo = testoPiano(sc.html);
		if (!sc.titolo && prossima && !prossima.titolo && testo.length < 80 && /:$/.test(testo) && !RE_LISTA.test(sc.html)) {
			unite.push({ html: comeParagrafoHtml(sc.html) + prossima.html });
			i++;
		} else {
			unite.push(sc);
		}
	}
	// Poche schede: si uniscono le vicine senza titolo finche' la scheda non supera `maxScheda` caratteri.
	if (!maxScheda) return unite;
	const poche = [];
	for (const sc of unite) {
		const ultima = poche[poche.length - 1];
		if (ultima && !ultima.titolo && !sc.titolo && testoPiano(ultima.html + ' ' + sc.html).length <= maxScheda) {
			ultima.html = comeParagrafoHtml(ultima.html) + comeParagrafoHtml(sc.html);
		} else {
			poche.push({ ...sc });
		}
	}
	return poche;
}

export function inSchede(html, { max = 260, rifinito = false } = {}) {
	const h = (html ?? '').trim();
	if (!h) return [];

	const pezzi = pezziPrimoLivello(h);
	const schede = [];
	let titoloAperto = null; // titolo in attesa del suo contenuto
	let corpo = [];

	const chiudi = () => {
		if (titoloAperto !== null || corpo.length) {
			schede.push(titoloAperto !== null ? { titolo: titoloAperto, html: corpo.join('') } : { html: corpo.join('') });
		}
		titoloAperto = null;
		corpo = [];
	};
	const comeParagrafo = (p) => (/^\s*<(p|ul|ol)\b/i.test(p) ? p : `<p>${p}</p>`);

	for (const pezzo of pezzi) {
		const t = pezzo.tipo === 'p' ? pezzo.html.match(RE_SOLO_TITOLO) : null;
		if (t && testoPiano(t[1]).length <= 70) {
			chiudi();
			titoloAperto = testoPiano(t[1]).replace(/\s*:\s*$/, '');
			continue;
		}
		if (titoloAperto !== null) {
			// il contenuto di un titolo: testo, lista o paragrafo
			corpo.push(pezzo.tipo === 'lista' ? pezzo.html : comeParagrafo(pezzo.html));
			continue;
		}
		if (pezzo.tipo === 'lista') {
			schede.push({ html: pezzo.html });
			continue;
		}

		// paragrafo (o testo sciolto) senza titolo davanti: sotto-aree in fila, titolo + testo, righe o frasi
		const sottoAree = /^(?:<em>\s*)?<strong>/.test(pezzo.html)
			? pezzo.html.split(/(?=<em>\s*<strong>[^<]*:\s*<\/strong>)/).map((x) => x.trim()).filter(Boolean)
			: [pezzo.html];
		for (const p of sottoAree) {
			const ct = conTitolo(p);
			if (ct) {
				schede.push(ct);
				continue;
			}
			const righe = p.split(/<br\s*\/?>/).map((x) => x.trim()).filter((x) => testoPiano(x));
			const blocchi = righe.length > 1 ? righe : perFrasi(p, max);
			for (const b of blocchi) schede.push({ html: b });
		}
	}
	chiudi();
	return rifinito ? rifinisci(schede, 300, typeof rifinito === "number" ? rifinito : 0) : schede;
}
