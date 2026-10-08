// Crea public/favicon.ico, public/icon-192.png e public/apple-touch-icon.png dal logo giallo di
// Enjoy Club (la versione ritagliata quadrata che WordPress teneva accanto all'icona nera): il
// giallo si legge sia sulle schede chiare sia su quelle scure dei browser.
//
// Uso:  node scripts/crea-icone.mjs      (richiede _media-originali/, vedi scripts/copia-media.mjs)
//
// favicon.ico: contenitore ICO con dentro il PNG 32x32 (valido per tutti i browser moderni).
import fs from 'node:fs';
import sharp from 'sharp';

const SORGENTE = '_media-originali/wp-content/uploads/2025/05/cropped-logo_yellow.webp';
const png = (px) => sharp(SORGENTE).resize(px, px, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();

const png32 = await png(32);
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // riservato
header.writeUInt16LE(1, 2); // tipo: icona
header.writeUInt16LE(1, 4); // numero di immagini
const voce = Buffer.alloc(16);
voce.writeUInt8(32, 0); // larghezza
voce.writeUInt8(32, 1); // altezza
voce.writeUInt16LE(1, 4); // piani colore
voce.writeUInt16LE(32, 6); // bit per pixel
voce.writeUInt32LE(png32.length, 8); // dimensione dati
voce.writeUInt32LE(header.length + voce.length, 12); // offset dati
fs.writeFileSync('public/favicon.ico', Buffer.concat([header, voce, png32]));
fs.writeFileSync('public/icon-192.png', await png(192));
// L'icona per iPhone non puo' essere trasparente: logo giallo su fondo nero.
fs.writeFileSync(
	'public/apple-touch-icon.png',
	await sharp(await png(150)).extend({ top: 15, bottom: 15, left: 15, right: 15, background: '#0d0d0d' }).flatten({ background: '#0d0d0d' }).png().toBuffer()
);
console.log('Creati public/favicon.ico, public/icon-192.png e public/apple-touch-icon.png');
