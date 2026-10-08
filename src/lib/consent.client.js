// @ts-nocheck — script vanilla per il browser (accesso a document/cookie, niente tipi)

// Legge il cookie "cookieyes-consent" (formato: "consentid:xxx,consent:yes,necessary:yes,analytics:yes,advertisement:no,...")
function leggiConsensoCookieYes() {
	if (typeof document === 'undefined') return null;
	const match = document.cookie.match(/(?:^|;\s*)cookieyes-consent=([^;]*)/);
	if (!match) return null;
	const raw = decodeURIComponent(match[1]);
	const out = {};
	raw.split(',').forEach((pair) => {
		const idx = pair.indexOf(':');
		if (idx === -1) return;
		out[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
	});
	return out;
}

export function hasConsentFor(categoria) {
	const consenso = leggiConsensoCookieYes();
	return !!consenso && consenso[categoria] === 'yes';
}

function aggiornaConsentMode() {
	if (typeof window.gtag !== 'function') return;
	window.gtag('consent', 'update', {
		analytics_storage: hasConsentFor('analytics') ? 'granted' : 'denied',
		ad_storage: hasConsentFor('advertisement') ? 'granted' : 'denied',
		ad_user_data: hasConsentFor('advertisement') ? 'granted' : 'denied',
		ad_personalization: hasConsentFor('advertisement') ? 'granted' : 'denied',
	});
}

// Collega gli eventi di CookieYes al Consent Mode v2 di Google e avvisa gli altri
// moduli (es. Meta Pixel) tramite un CustomEvent quando il consenso cambia.
export function initConsentBridge() {
	if (typeof document === 'undefined') return;

	function onConsentChange() {
		aggiornaConsentMode();
		document.dispatchEvent(new CustomEvent('consenso:aggiornato'));
	}

	document.addEventListener('cookieyes_consent_update', onConsentChange);
	document.addEventListener('cookieyes_banner_load', onConsentChange);

	// Se il consenso e' gia' stato dato in una visita precedente, sincronizza subito.
	if (leggiConsensoCookieYes()) onConsentChange();
}
