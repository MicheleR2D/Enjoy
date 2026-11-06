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
	if (!eTitolo || !titolo || !testoPiano(resto)) return null;
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

export function inSchede(html) {
	const h = (html ?? '').trim();
	if (!h) return [];

	// 1) paragrafi
	let pezzi = [...h.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => m[1].trim()).filter((p) => testoPiano(p));
	if (!pezzi.length) pezzi = [h];

	// 2) dentro un pezzo, sotto-aree in fila senza paragrafi ("<em><strong>Sala Energy: </strong></em>...<em><strong>X Space: </strong></em>...")
	pezzi = pezzi.flatMap((p) => (/^(?:<em>\s*)?<strong>/.test(p) ? p.split(/(?=<em>\s*<strong>[^<]*:\s*<\/strong>)/).map((x) => x.trim()).filter(Boolean) : [p]));

	const schede = [];
	for (const p of pezzi) {
		const t = conTitolo(p);
		if (t) {
			schede.push(t);
			continue;
		}
		// 3) senza titolo: righe ("<br>"), poi frasi se resta un unico blocco lungo
		const righe = p.split(/<br\s*\/?>/).map((x) => x.trim()).filter((x) => testoPiano(x));
		const blocchi = righe.length > 1 ? righe : perFrasi(p);
		for (const b of blocchi) schede.push({ html: b });
	}
	return schede;
}
