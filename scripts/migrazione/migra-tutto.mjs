// Lancia in sequenza tutti gli script di migrazione, dal dump SQL ai dati puliti in src/data.
//
// Uso:  node scripts/migrazione/migra-tutto.mjs <dump.sql> [cartella-di-lavoro]
//   (il dump si ottiene con:  gzip -dc database.sql.gz > database.sql)
//
// Cartella di lavoro (default: .migrazione/, ignorata da git): ci finiscono i JSON grezzi
// estratti da WordPress. I dati puliti vanno in src/data/pagine, src/data/home.json,
// src/data/orari-pagina.json e src/data/redirect-wp.json. I media vanno copiati a parte
// (vedi scripts/migrazione/copia-media.mjs).
import { execFileSync } from 'node:child_process';

const [, , DUMP, LAVORO = '.migrazione'] = process.argv;
if (!DUMP) {
	console.error('Uso: node scripts/migrazione/migra-tutto.mjs <dump.sql> [cartella-di-lavoro]');
	process.exit(1);
}

const passi = [
	['estrai-pagine.mjs', DUMP, LAVORO],
	['normalizza-schede.mjs', LAVORO],
	['normalizza-sedi.mjs', LAVORO],
	['normalizza-info.mjs', LAVORO],
	['normalizza-home.mjs', LAVORO],
	['normalizza-redirect.mjs', LAVORO],
];
for (const [script, ...args] of passi) {
	console.log(`\n=== ${script}`);
	execFileSync(process.execPath, ['--max-old-space-size=4096', `scripts/migrazione/${script}`, ...args], { stdio: 'inherit' });
}
