// Legge le varianti WebP prodotte da scripts/optimize-images.mjs
// (public/_img/manifest.json). Se una foto non e' nel manifest (script non
// eseguito, foto nuova non ancora elaborata) si ricade sull'originale: la
// pagina funziona comunque, solo piu' pesante.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type Entry = { base: string; widths: number[] };

let cache: Record<string, Entry> | null = null;

function manifest(): Record<string, Entry> {
	if (cache) return cache;
	let data: Record<string, Entry> = {};
	try {
		data = JSON.parse(readFileSync(join(process.cwd(), 'public/_img/manifest.json'), 'utf8'));
	} catch {
		// nessun manifest: si usano gli originali
	}
	// In sviluppo si rilegge a ogni richiesta, cosi' una foto nuova compare
	// senza riavviare; in produzione e' una build e basta una lettura.
	if (import.meta.env.PROD) cache = data;
	return data;
}

export function imgSources(src: string): { src: string; srcset?: string } {
	const entry = manifest()[src];
	if (!entry) return { src };
	const largest = entry.widths[entry.widths.length - 1];
	return {
		src: `${entry.base}-${largest}.webp`,
		srcset: entry.widths.map((w) => `${entry.base}-${w}.webp ${w}w`).join(', '),
	};
}
