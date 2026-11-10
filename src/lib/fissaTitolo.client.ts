// @ts-nocheck - script del browser
/*
 * Titolo della hero con una parola che ruota: a seconda della parola il titolo puo' stare su una o due righe, e il
 * resto della hero (testo, bottone) sale e scende con lui. Qui si misura il titolo con ognuna delle parole e gli
 * si riserva l'altezza della piu' alta: il bottone resta sempre fermo.
 *
 * La misura si fa su una copia nascosta del titolo (nessun lampo e nessuna transizione sull'originale).
 *
 *   fissaAltezzaTitolo(titolo, '.ph__word')
 */
export function fissaAltezzaTitolo(titolo, selettoreParola) {
	if (!titolo) return;
	const parole = titolo.querySelectorAll(selettoreParola);
	if (parole.length < 2) return;

	const misura = () => {
		const larghezza = titolo.getBoundingClientRect().width;
		if (!larghezza) return;
		const copia = titolo.cloneNode(true);
		copia.removeAttribute('data-intro');
		copia.setAttribute('aria-hidden', 'true');
		copia.style.cssText = `position:absolute;left:0;top:0;visibility:hidden;pointer-events:none;margin:0;min-height:0;width:${larghezza}px;animation:none;transition:none`;
		titolo.parentElement.appendChild(copia);
		const paroleCopia = [...copia.querySelectorAll(selettoreParola)];
		let massima = 0;
		paroleCopia.forEach((attiva) => {
			paroleCopia.forEach((p) => p.classList.toggle('is-on', p === attiva));
			massima = Math.max(massima, copia.getBoundingClientRect().height);
		});
		copia.remove();
		titolo.style.minHeight = massima ? `${Math.ceil(massima)}px` : '';
	};

	let attesa = 0;
	const richiedi = () => {
		cancelAnimationFrame(attesa);
		attesa = requestAnimationFrame(misura);
	};
	misura();
	addEventListener('resize', richiedi);
	addEventListener('load', richiedi);
	document.fonts?.ready.then(richiedi);
}
