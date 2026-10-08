// Dati di contatto e link ufficiali di Enjoy Club: un'unica fonte per header,
// footer e pagine. Sono gli stessi dati reali del sito originale (template
// Elementor "Testata" ID 642 e "Piè di pagina" ID 626).
export const site = {
	name: 'Enjoy Club',
	tagline: 'Il tuo partner per il benessere e la forma fisica',
	url: 'https://enjoyclub.eu',
} as const;

export interface Sede {
	slug: 'meda' | 'camuzzago';
	nome: string;
	ragioneSociale: string;
	/** Indirizzo su due righe, come sulle card del sito. */
	via: string;
	cap: string;
	citta: string;
	telefono: string;
	telefonoHref: string;
	email?: string;
	piva: string;
	rae: string;
	capitaleSociale: string;
	social: { href: string; label: string }[];
	/** Planning settimanale in PDF (pagina "Orari"). */
	planningPdf: string;
	/** Rendicontazione dei contributi pubblici (obbligo di trasparenza). */
	contributiPdf: string;
}

export const sedi: Sede[] = [
	{
		slug: 'meda',
		nome: 'Meda',
		ragioneSociale: 'Montecarlo Fitness Club ssd a.r.l.',
		via: 'Via Trieste s/n',
		cap: '20821',
		citta: 'Meda (MB)',
		telefono: '0362 827427',
		telefonoHref: 'tel:+390362827427',
		piva: '09308550962',
		rae: 'MB-1904782',
		capitaleSociale: '10.000',
		social: [
			{ href: 'https://www.instagram.com/enjoyclubmontecarlo', label: 'Instagram' },
			{ href: 'https://www.facebook.com/ENJOYCLUBMONTECARLO', label: 'Facebook' },
			{ href: 'https://www.youtube.com/@enjoyclubwellnesscommunity5210', label: 'YouTube' },
		],
		planningPdf: '/wp-content/uploads/2026/04/Planning-Meda-2025-2026-250226-1.pdf',
		contributiPdf: '/wp-content/uploads/2026/06/Rendicontazione-contributi-pubblici-MONTECARLO-anno-2025.pdf',
	},
	{
		slug: 'camuzzago',
		nome: 'Camuzzago',
		ragioneSociale: 'Camuzzago Fitness Club ssd a.r.l.',
		via: 'Via del Borgo 6',
		cap: '20882',
		citta: 'Camuzzago di Bellusco (MB)',
		telefono: '039 6081585',
		telefonoHref: 'tel:+390396081585',
		email: 'info@camuzzagofitnessclub.it',
		piva: '06653790961',
		rae: 'MB-1863179',
		capitaleSociale: '10.000',
		social: [
			{ href: 'https://www.instagram.com/enjoyclubcamuzzago/', label: 'Instagram' },
			{ href: 'https://www.facebook.com/ENJOYCLUBCAMUZZAGO', label: 'Facebook' },
			{ href: 'https://www.youtube.com/@enjoyclubwellnesscommunity5210', label: 'YouTube' },
		],
		planningPdf: '/wp-content/uploads/2026/09/Planning-Camuzzago-2627-verisione-20.pdf',
		contributiPdf: '/wp-content/uploads/2026/06/Rendicontazione-contributi-pubblici-CAMUZZAGO-anno-2025.pdf',
	},
];

export const indirizzoCompleto = (s: Sede) => `${s.via}, ${s.cap} ${s.citta}`;
export const mapsEmbedSrc = (s: Sede) => `https://www.google.com/maps?q=${encodeURIComponent(indirizzoCompleto(s))}&output=embed`;
export const mapsDirectionsUrl = (s: Sede) =>
	`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(indirizzoCompleto(s))}`;

// Form di contatto e di "prova ora": sono moduli n8n esterni (gli stessi del sito
// originale), quindi i pulsanti sono normali collegamenti. Il parametro "medium"
// dice a n8n da quale punto del sito arriva la richiesta.
const N8N = 'https://automazione.n8ndevelop.it/form';
const FORM = {
	contatto: '8422e735-00f7-4ddd-b27b-f03dbef75dc8',
	prova: '783c176d-d972-4eec-8b2c-8cf8db507c55',
} as const;

export const formUrl = (tipo: keyof typeof FORM, medium: string) =>
	`${N8N}/${FORM[tipo]}?source=SitoWeb&medium=${encodeURIComponent(medium)}`;

// Icone SVG inline (viewBox 24x24): niente librerie esterne per tre simboli.
export const iconeSocial: Record<string, string> = {
	Facebook:
		'<path fill="currentColor" d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z"/>',
	Instagram:
		'<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.4" cy="6.6" r="1.3" fill="currentColor"/>',
	YouTube:
		'<path fill="currentColor" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"/>',
};

export interface LegalLink {
	href: string;
	label: string;
	esterno?: boolean;
}

// I documenti legali del footer non avevano un indirizzo nel sito originale
// (solo la Privacy): qui ci sono la Privacy e, per sede, i contributi pubblici.
export const legalLinks: LegalLink[] = [{ href: '/privacy', label: 'Privacy' }];

export const app = {
	titolo: 'Nuova app Technogym®',
	appStore: 'https://apps.apple.com/it/app/technogym/id976506047',
	googlePlay: 'https://play.google.com/store/apps/details?id=com.technogym.tgapp&hl=it',
};
