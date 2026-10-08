// Struttura del mega-menu ricostruita dal template header di Elementor (post ID 642)
// del sito WordPress originale: non esisteva un menu WP classico, la navigazione
// era tutta dentro il Theme Builder. Le voci e i collegamenti sono quelli reali
// (i link dinamici sono stati risolti sugli ID delle pagine).
export interface VoceMenu {
	label: string;
	href: string;
}

export interface ColonnaMenu {
	titolo: string;
	voci: VoceMenu[];
}

export const megaMenu: ColonnaMenu[] = [
	{
		titolo: 'Sedi',
		voci: [
			{ label: 'Meda', href: '/meda' },
			{ label: 'Camuzzago', href: '/camuzzago' },
		],
	},
	{
		titolo: 'Attività Adulti',
		voci: [
			{ label: 'Gym Floor', href: '/gym-floor' },
			{ label: 'Corsi Fitness', href: '/corsi-fitness' },
			{ label: 'X-Class', href: '/x-class' },
			{ label: 'Acqua Gym', href: '/acqua-gym' },
			{ label: 'Scuola Nuoto Adulti', href: '/nuoto-adulti' },
			{ label: 'Nuoto Libero', href: '/nuoto-libero' },
			{ label: 'Personal Training', href: '/personal-training' },
		],
	},
	{
		titolo: 'Attività Junior',
		voci: [
			{ label: 'Nuoto Neonatale', href: '/nuoto-neonatale' },
			{ label: 'Nuoto Bambini', href: '/nuoto-bambini' },
			{ label: 'Nuoto Pre-Agonistico', href: '/nuoto-preagonistico' },
			{ label: 'Nuoto Sincronizzato', href: '/nuoto-sincronizzato' },
			{ label: 'Ginnastica Aerobica', href: '/ginnastica-aerobica' },
		],
	},
	{
		titolo: 'Health Fitness',
		voci: [
			{ label: 'Wellness Lab Meda', href: '/wellness-lab-meda' },
			{ label: 'Health Fitness Camuzzago', href: '/health-fitness-camuzzago' },
		],
	},
];
