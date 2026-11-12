/*
 * Riceve i moduli "Prova ora" e "Contattaci" del sito e li passa ai flussi n8n
 * ("richiesta PROVA Enjoy - SITO" e "CONTATTACI ENJOY - SITO"), che poi aggiornano
 * il gestionale, Airtable e mandano le email. Gira come funzione Vercel (non statica).
 *
 * Variabili d'ambiente (solo lato server):
 *   N8N_WEBHOOK_SECRET  chiave condivisa con i flussi n8n (header x-enjoy-secret)
 *   N8N_WEBHOOK_BASE    opzionale, default https://automazione.n8ndevelop.it/webhook
 */
import type { APIRoute } from 'astro';

export const prerender = false;

const SEDI = ['CAMUZZAGO (Bellusco)', 'MEDA (Montecarlo)'];
const ATTIVITA = [
	'Gym Floor (Sala Pesi)',
	'Corsi Fitness',
	'Acqua Fitness',
	'Scuola Nuoto Adulti',
	'Personal Training',
	'Health Fitness',
	'Nuoto Bambini',
	'Nuoto Neonatale',
	'Nuoto Agonistico',
	'Nuoto Sincronizzato',
	// "Aerobica" (il modulo n8n diceva "Aerobice"): e' il valore che il flusso n8n riconosce
	// per mandare l'email a Davide e che esiste tra le opzioni di Airtable.
	'Ginnastica Aerobica',
];
const PERCORSI = { prova: 'enjoy-richiesta-prova', contatto: 'enjoy-contattaci' } as const;

const risposta = (stato: number, corpo: Record<string, unknown>) =>
	new Response(JSON.stringify(corpo), { status: stato, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const pulito = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export const POST: APIRoute = async ({ request }) => {
	let dati: Record<string, unknown>;
	try {
		dati = await request.json();
	} catch {
		return risposta(400, { ok: false, errore: 'Richiesta non valida.' });
	}

	// Campo trappola per i bot: un utente vero non lo vede e non lo compila.
	if (pulito(dati.website)) return risposta(200, { ok: true });

	const tipo = dati.tipo === 'contatto' ? 'contatto' : dati.tipo === 'prova' ? 'prova' : null;
	if (!tipo) return risposta(400, { ok: false, errore: 'Richiesta non valida.' });

	const sede = pulito(dati.sede);
	const nome = pulito(dati.nome, 80);
	const cognome = pulito(dati.cognome, 80);
	const email = pulito(dati.email, 120);
	const cellulare = pulito(dati.cellulare, 30).replace(/[\s.-]/g, '');
	const attivita = pulito(dati.attivita);
	const richiesta = pulito(dati.richiesta, 2000);

	const errori: Record<string, string> = {};
	if (!SEDI.includes(sede)) errori.sede = 'Scegli la sede.';
	if (!nome) errori.nome = 'Inserisci il tuo nome.';
	if (!cognome) errori.cognome = 'Inserisci il tuo cognome.';
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errori.email = 'Inserisci un indirizzo email valido.';
	if (!/^(\+|00)?\d{6,15}$/.test(cellulare)) errori.cellulare = 'Inserisci un numero di cellulare valido.';
	if (tipo === 'contatto') {
		if (!ATTIVITA.includes(attivita)) errori.attivita = "Scegli l'attività di interesse.";
		if (!richiesta) errori.richiesta = 'Scrivi la tua richiesta.';
	}
	if (dati.privacy !== true) errori.privacy = "Per inviare serve il consenso all'informativa privacy.";
	if (Object.keys(errori).length) return risposta(422, { ok: false, errori });

	const segreto = import.meta.env.N8N_WEBHOOK_SECRET ?? process.env.N8N_WEBHOOK_SECRET;
	const base = (import.meta.env.N8N_WEBHOOK_BASE ?? process.env.N8N_WEBHOOK_BASE ?? 'https://automazione.n8ndevelop.it/webhook').replace(/\/+$/, '');
	if (!segreto) {
		console.error('[modulo] N8N_WEBHOOK_SECRET non impostata');
		return risposta(500, { ok: false, errore: 'Servizio momentaneamente non disponibile. Riprova tra poco o chiamaci.' });
	}

	const corpo = {
		sede,
		nome,
		cognome,
		email,
		cellulare,
		attivita,
		richiesta,
		source: 'SitoWeb',
		medium: pulito(dati.medium, 80),
	};

	try {
		const r = await fetch(`${base}/${PERCORSI[tipo]}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'x-enjoy-secret': segreto },
			body: JSON.stringify(corpo),
			signal: AbortSignal.timeout(10000),
		});
		if (!r.ok) throw new Error(`n8n ha risposto ${r.status}`);
	} catch (e) {
		console.error('[modulo] invio a n8n non riuscito', e);
		return risposta(502, { ok: false, errore: "Non siamo riusciti a inviare la richiesta. Riprova tra poco o chiamaci." });
	}

	return risposta(200, { ok: true });
};
