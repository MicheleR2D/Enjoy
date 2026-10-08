# Enjoy Club — sito (Astro)

Migrazione del sito `enjoyclub.eu` da WordPress/Elementor ad Astro, pubblicato su Vercel.
Brand kit: Inter, nero e giallo `#FFE600`; sedi di Meda e Camuzzago.

## Comandi

```bash
npm install
npm run dev        # sviluppo (ottimizza prima le foto)
npm run build      # build di produzione in .vercel/output
node scripts/verifica-link.mjs   # dopo la build: cerca link e immagini interni rotti
node scripts/verifica-html.mjs   # dopo la build: SEO di base, titoli, id duplicati, alt, testo sporco
```

## Dove stanno le cose

| Cosa | Dove |
| --- | --- |
| Pagine "a dati" (corsi, sedi, info, privacy…) | `src/data/pagine/<slug>.json`, disegnate da `src/templates/` tramite `src/pages/[slug].astro` |
| Home e Orari | `src/pages/index.astro`, `src/pages/orari.astro` (dati in `src/data/home.json`, `orari-pagina.json`) |
| Sedi, contatti, social, link ai form n8n | `src/data/site.ts` |
| Menu (header e footer) | `src/data/nav.ts` |
| Colori, font, spaziature | `src/styles/tokens.css` |
| Redirect dal vecchio sito | `src/data/redirect-wp.json` (letto da `astro.config.mjs`) |

I pulsanti "Prova ora" e "Contattaci" aprono i moduli n8n già usati dal sito originale (`formUrl()` in `site.ts`):
non c'è un form interno né un database.

## Rigenerare i dati dal backup WordPress

I testi vengono estratti dal dump SQL del vecchio sito, non scritti a mano.

```bash
gzip -dc database.sql.gz > database.sql
node scripts/migrazione/migra-tutto.mjs database.sql
```

Lo script lancia in sequenza `estrai-pagine`, `normalizza-schede` (corsi, nuoto, acqua gym…), `normalizza-sedi`,
`normalizza-info`, `normalizza-home` e `normalizza-redirect`. I JSON grezzi finiscono in `.migrazione/` (ignorata da git).

## Media

Le foto originali del vecchio sito (circa 2.200 file) non stanno nel repo: si estraggono dal backup in `_media-originali/`
(ignorata da git) e se ne copiano in `public/` solo quelle usate, con gli stessi URL di WordPress:

```bash
tar -xzf "Backup Elementor.gz" -C _media-originali --strip-components=1 files/wp-content/uploads
node scripts/copia-media.mjs            # copia i file citati in src/
node scripts/copia-media.mjs --verifica # elenca quelli citati ma mancanti
```

Le versioni leggere (WebP 480/960/1600 px) si generano da sole a ogni `dev` e `build` in `public/_img/`.

## Variabili d'ambiente

Vedi `.env.example`: `SITE_URL`, `PUBLIC_GTM_ID`, `PUBLIC_COOKIEYES_ID`, `PUBLIC_META_PIXEL_ID`.
Senza gli ID il sito funziona, ma senza banner cookie né tracciamento.
