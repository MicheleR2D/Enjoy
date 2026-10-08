// Numeri del centro (dal contatore della home del sito originale): li usano la
// sezione contatori della home e la prova sociale accanto alla CTA finale,
// cosi' non si scrivono due volte.
export interface Stat {
	target: number;
	suffisso: string;
	titolo: string;
	sotto: string;
	/** Etichetta corta per gli spazi stretti (es. accanto alla CTA). */
	breve: string;
}

export const stats: Stat[] = [
	{ target: 160, suffisso: '+', titolo: 'Corsi a settimana', sotto: 'tra fitness, acqua e nuoto', breve: 'corsi a settimana' },
	{ target: 50, suffisso: '+', titolo: 'Trainer qualificati', sotto: 'sempre al tuo fianco', breve: 'trainer qualificati' },
	{ target: 4500, suffisso: '+', titolo: 'Enjoyers', sotto: 'che si allenano con noi', breve: 'enjoyers' },
];

// Numeri all'italiana: punto come separatore delle migliaia (4.500).
export const formattaNumero = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
