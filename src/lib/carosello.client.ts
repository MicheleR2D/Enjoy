// @ts-nocheck - script del browser
/*
 * Fila di card a scorrimento (CourseBlock, FasiPercorso): mentre si scorre aggiorna la card attiva (grande), il
 * pallino attivo e, alla fine della fila, nasconde la freccia che invita a scorrere. Il contenitore dei pallini
 * deve seguire subito la lista.
 */
export function iniziaCarosello(lista) {
	const contenitore = lista.nextElementSibling;
	const punti = [...(contenitore?.querySelectorAll('.cb__punto') ?? [])];
	if (!punti.length) return;
	let attesa = false;
	const aggiorna = () => {
		attesa = false;
		const prima = lista.children[0];
		if (!prima) return;
		const passo = prima.getBoundingClientRect().width + (parseFloat(getComputedStyle(lista).columnGap) || 0);
		const fine = lista.scrollLeft >= lista.scrollWidth - lista.clientWidth - 2;
		const i = fine ? punti.length - 1 : Math.min(punti.length - 1, Math.round(lista.scrollLeft / passo));
		punti.forEach((p, k) => p.classList.toggle('is-on', k === i));
		[...lista.children].forEach((c, k) => c.classList.toggle('is-attiva', k === i));
		contenitore.classList.toggle('is-fine', fine);
	};
	lista.addEventListener(
		'scroll',
		() => {
			if (!attesa) {
				attesa = true;
				requestAnimationFrame(aggiorna);
			}
		},
		{ passive: true }
	);
}
