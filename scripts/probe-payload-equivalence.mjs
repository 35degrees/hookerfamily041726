/**
 * probe-payload-equivalence.mjs — PROVE A PAYLOAD DIET CHANGED NOTHING THE APP USES (Oct 9).
 *
 * Runs the app's own buildFeatured() (the single function both the cold load and the warm path use to
 * turn a payload into what the page renders) on a BEFORE copy of static/data/person and on the current
 * one, for every person, and requires the two results to be identical. `context` is consumed inside
 * buildFeatured and never reaches the page, so equal output means the page cannot tell the difference.
 *
 *   cp -R static/data/person /tmp/person-before      # before the change
 *   node regenerate-data.js canonical.json           # the change
 *   node scripts/probe-payload-equivalence.mjs /tmp/person-before
 *   node scripts/probe-payload-equivalence.mjs --strip /tmp/person-before   # when the change IS clientStrip.js
 *
 * Prove it red by deleting a field the builder reads from the AFTER copy (e.g. one context record's
 * `birth`) — the person whose child it is must be reported.
 */
import { createJiti } from 'jiti';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const argv = process.argv.slice(2).filter((a) => a !== '--strip');
const STRIP = process.argv.includes('--strip');
const BEFORE = argv[0];
const AFTER = argv[1] ?? 'static/data/person';
if (!BEFORE) {
	console.error('usage: node scripts/probe-payload-equivalence.mjs <before-dir> [after-dir]');
	process.exit(2);
}
const jiti = createJiti(import.meta.url, { alias: { '#lib': resolve('src/lib') } });
const { buildFeatured } = await jiti.import(resolve('src/lib/data/buildFeatured.ts'));
// --strip: apply src/lib/data/clientStrip.js to the BEFORE payload first. Equal output then proves the new
// files are the old ones minus exactly what the strip removes — nothing more, nothing less.
const { clientPerson, clientRegistryEntry } = await jiti.import(resolve('src/lib/data/clientStrip.js'));
function normalize(pl) {
	if (!STRIP) return pl;
	const resolved = Object.fromEntries(Object.entries(pl.person).filter(([k]) => k.endsWith('Resolved')));
	const context = Object.fromEntries(Object.entries(pl.context ?? {}).map(([id, r]) => [id, clientPerson(r)]));
	const institutionsById = Object.fromEntries(
		Object.entries(pl.institutionsById ?? {}).map(([id, r]) => [id, clientRegistryEntry(r)])
	);
	return { ...pl, person: { ...clientPerson(pl.person), ...resolved }, context, institutionsById, burialCemetery: clientRegistryEntry(pl.burialCemetery) };
}

const files = readdirSync(AFTER).filter((f) => f.endsWith('.json'));
const before = new Set(readdirSync(BEFORE));
let same = 0;
const diff = [];
const missing = [];
for (const f of files) {
	if (!before.has(f)) {
		missing.push(f);
		continue;
	}
	const a = JSON.stringify(buildFeatured(normalize(JSON.parse(readFileSync(`${BEFORE}/${f}`, 'utf8')))));
	const b = JSON.stringify(buildFeatured(JSON.parse(readFileSync(`${AFTER}/${f}`, 'utf8'))));
	if (a === b) same++;
	else diff.push(f);
}
console.log(`buildFeatured identical: ${same} / ${files.length}`);
if (missing.length) console.log(`not in before-dir: ${missing.length} (${missing.slice(0, 5).join(', ')})`);
if (diff.length) {
	console.log(`DIFFERENT: ${diff.length} — first: ${diff.slice(0, 10).join(', ')}`);
	process.exit(1);
}
