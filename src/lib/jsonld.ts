// Dati strutturati (schema.org) per Google, ricavati dai dati reali del sito: nome, sedi, indirizzi,
// telefoni, P.IVA e social vengono da src/data/site.ts; gli orari di apertura sono quelli scritti nelle
// pagine di Meda e Camuzzago (se cambiano la' vanno cambiati anche qui).
import { site, sedi, type Sede } from '../data/site';

type Json = Record<string, unknown>;

// Orari di apertura delle due sedi, come riportati nelle pagine sede.
const GIORNI = { Lun: 'Monday', Mar: 'Tuesday', Mer: 'Wednesday', Gio: 'Thursday', Ven: 'Friday', Sab: 'Saturday', Dom: 'Sunday' } as const;
type Giorno = keyof typeof GIORNI;
const ORARI: Record<Sede['slug'], { giorni: Giorno[]; apre: string; chiude: string }[]> = {
	meda: [
		{ giorni: ['Lun', 'Mar', 'Mer', 'Gio', 'Ven'], apre: '07:00', chiude: '22:30' },
		{ giorni: ['Sab', 'Dom'], apre: '09:00', chiude: '18:00' },
	],
	camuzzago: [
		{ giorni: ['Lun', 'Mer', 'Ven'], apre: '07:00', chiude: '22:00' },
		{ giorni: ['Mar', 'Gio'], apre: '07:00', chiude: '22:30' },
		{ giorni: ['Sab'], apre: '08:30', chiude: '18:00' },
		{ giorni: ['Dom'], apre: '09:00', chiude: '18:00' },
	],
};

// Descrizione, zona servita e servizi di una sede, ricavati dai testi della sua pagina (non inventati).
const EXTRA: Partial<Record<Sede['slug'], { descrizione: string; zona: string[]; servizi: string[] }>> = {
	camuzzago: {
		descrizione:
			'Palestra e piscina a Camuzzago di Bellusco, a pochi minuti da Vimercate: oltre 500 m² di fitness con attrezzi Technogym, piscina coperta da 25 metri, area benessere e oltre 90 corsi a settimana.',
		zona: ['Vimercate', 'Bellusco'],
		servizi: [
			'Piscina coperta da 25 metri con 6 corsie',
			'Piscina piccola riscaldata a 32 gradi',
			'Piscina esterna da giugno a settembre',
			'Attrezzi Technogym',
			'Sale corsi e Group Cycling',
			'Sauna',
			'Bagno turco',
			'Stanza del sale',
			'Consulting Medical Center',
		],
	},
};

const assoluto = (percorso: string) => (percorso.startsWith('http') ? percorso : site.url + percorso);

/** Telefono nel formato internazionale: "0362 827427" -> "+39 0362 827427". */
const telefonoInternazionale = (s: Sede) => '+39 ' + s.telefono;

/** "Camuzzago di Bellusco (MB)" -> { localita: "Camuzzago di Bellusco", provincia: "MB" }. */
const dividiCitta = (citta: string) => {
	const m = citta.match(/^(.*?)\s*\((\w+)\)$/);
	return { localita: m?.[1] ?? citta, provincia: m?.[2] };
};

export const organizzazione = (): Json => ({
	'@type': 'Organization',
	'@id': site.url + '/#organizzazione',
	name: site.name,
	url: site.url,
	description: site.tagline,
	sameAs: [...new Set(sedi.flatMap((s) => s.social.map((l) => l.href.replace(/\/$/, ''))))],
	subOrganization: sedi.map((s) => ({ '@id': `${site.url}/${s.slug}#sede` })),
});

/** Una sede come attivita' locale (palestra e piscina). `immagine` e' il percorso di una foto della sede. */
export const luogo = (s: Sede, immagine?: string): Json => {
	const { localita, provincia } = dividiCitta(s.citta);
	return {
		'@type': ['SportsActivityLocation', 'HealthClub'],
		'@id': `${site.url}/${s.slug}#sede`,
		name: `${site.name} ${s.nome}`,
		legalName: s.ragioneSociale,
		url: `${site.url}/${s.slug}`,
		telephone: telefonoInternazionale(s),
		...(s.email ? { email: s.email } : {}),
		vatID: 'IT' + s.piva,
		...(immagine ? { image: assoluto(immagine) } : {}),
		...(EXTRA[s.slug]
			? {
					description: EXTRA[s.slug]!.descrizione,
					areaServed: EXTRA[s.slug]!.zona.map((nome) => ({ '@type': 'City', name: nome })),
					amenityFeature: EXTRA[s.slug]!.servizi.map((nome) => ({ '@type': 'LocationFeatureSpecification', name: nome, value: true })),
				}
			: {}),
		hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.via}, ${s.cap} ${s.citta}`)}`,
		address: {
			'@type': 'PostalAddress',
			streetAddress: s.via,
			postalCode: s.cap,
			addressLocality: localita,
			...(provincia ? { addressRegion: provincia } : {}),
			addressCountry: 'IT',
		},
		openingHoursSpecification: ORARI[s.slug].map((o) => ({
			'@type': 'OpeningHoursSpecification',
			dayOfWeek: o.giorni.map((g) => GIORNI[g]),
			opens: o.apre,
			closes: o.chiude,
		})),
		sameAs: s.social.map((l) => l.href.replace(/\/$/, '')),
		parentOrganization: { '@id': site.url + '/#organizzazione' },
	};
};

/** Domande frequenti visibili nella pagina (solo quelle con risposta). */
export const domandeFrequenti = (faq: { domanda: string; risposta: string | null }[]): Json | null => {
	const voci = faq.filter((f) => f.risposta);
	if (!voci.length) return null;
	return {
		'@type': 'FAQPage',
		mainEntity: voci.map((f) => ({
			'@type': 'Question',
			name: f.domanda,
			acceptedAnswer: { '@type': 'Answer', text: (f.risposta as string).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() },
		})),
	};
};

/** Racchiude gli oggetti in un unico documento JSON-LD con @graph. */
export const grafo = (...oggetti: (Json | null | undefined)[]): Json => ({
	'@context': 'https://schema.org',
	'@graph': oggetti.filter(Boolean),
});
