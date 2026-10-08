// @ts-nocheck — script vanilla per il browser
import { hasConsentFor } from './consent.client.js';

const PIXEL_ID = import.meta.env.PUBLIC_META_PIXEL_ID;

let caricato = false;

function caricaScriptMetaPixel() {
	if (caricato || !PIXEL_ID || typeof window === 'undefined') return;
	caricato = true;

	/* eslint-disable */
	!(function (f, b, e, v, n, t, s) {
		if (f.fbq) return;
		n = f.fbq = function () {
			n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
		};
		if (!f._fbq) f._fbq = n;
		n.push = n;
		n.loaded = true;
		n.version = '2.0';
		n.queue = [];
		t = b.createElement(e);
		t.async = true;
		t.src = v;
		s = b.getElementsByTagName(e)[0];
		s.parentNode.insertBefore(t, s);
	})(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
	/* eslint-enable */

	window.fbq('init', PIXEL_ID);
	window.fbq('track', 'PageView');
}

// Carica il Pixel solo se il consenso "advertisement" e' gia' stato dato,
// e resta in ascolto per quando l'utente lo concede dal banner CookieYes.
export function initMetaPixel() {
	if (!PIXEL_ID || typeof document === 'undefined') return;
	if (hasConsentFor('advertisement')) {
		caricaScriptMetaPixel();
		return;
	}
	document.addEventListener('consenso:aggiornato', () => {
		if (hasConsentFor('advertisement')) caricaScriptMetaPixel();
	});
}
