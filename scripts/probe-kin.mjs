/**
 * probe-kin — does the CLIENT walk agree with the BUILD's own answer?
 *
 * kin.ts and regenerate-data.js's kinDistance are the only two things in this project that answer
 * "how far apart are these two", and they were written months apart for different consumers. This
 * replays the client module over the shipped index and checks it against the baked kin_distance on
 * real CC rows — restricted to pairs where BOTH ends are Hooker descendants, because kinDistance
 * prices a marriage bridge at 2 and connect() deliberately allows no bridge inside the path.
 *
 * Run: node scripts/probe-kin.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';

// THE REAL MODULE, imported directly — node 24 strips the types itself, so there is no second copy of
// this logic to drift and no build step between the probe and the thing it is checking. kin.ts is
// deliberately free of DOM and of the search store precisely so this import can work.
const { connect, sentence } = await import('../src/lib/search/kin.ts');
// An instrument that quietly measured nothing is this project's most repeated failure (roadmap §36.4,
// §39.4, §41.3, §43.2). Prove the module is really here before trusting a single number below.
if (typeof connect !== 'function' || typeof sentence !== 'function') {
	throw new Error('probe-kin: kin.ts did not export connect/sentence — nothing below is measuring anything');
}

const index = JSON.parse(readFileSync('static/data/search-index.json', 'utf8'));
const byId = new Map(index.map((r) => [r.id, r]));
const at = (id) => byId.get(id);
const HD = 1, SPOUSE = 2;

// ── 1. agreement with the build ───────────────────────────────────────────────────────────────
const files = readdirSync('static/data/person').slice(0, 1400);
let checked = 0, agree = 0, bridged = 0, disagree = [];
for (const f of files) {
	const p = JSON.parse(readFileSync(`static/data/person/${f}`, 'utf8'));
	const src = p.person?.id;
	const srow = byId.get(src);
	if (!srow || !(srow.f & HD)) continue;
	for (const cc of p.crossConnections ?? []) {
		if (cc.kin_distance == null) continue;
		const trow = byId.get(cc.related_id);
		if (!trow || !(trow.f & HD)) continue;
		const c = connect(src, cc.related_id, at);
		checked++;
		const walked = c ? c.upA + c.upB : null;
		if (walked === cc.kin_distance) agree++;
		// A BAKED VALUE SMALLER THAN THE WALK IS THE MARRIAGE BRIDGE, NOT A DEFECT — kinDistance prices
		// one marriage hop at 2 on each side (an in-law is "up your line" for the deck's purposes), and
		// connect() deliberately allows no bridge INSIDE the path, because a relationship sentence
		// cannot be spoken across one. Alfred Bacon and Theodore Woolsey are the live case: baked 3
		// (father-in-law), walked 9 (they are also distant cousins). Both answers are right about
		// different questions.
		//
		// A baked value LARGER than the walk would be a real disagreement — the build missing a blood
		// route the client found — and that is what this splits out.
		else if (walked != null && walked > cc.kin_distance) bridged++;
		else if (disagree.length < 8) disagree.push({ src, tgt: cc.related_id, baked: cc.kin_distance, walked });
	}
}
console.log(
	`vs the baked kin_distance: ${agree}/${checked} identical, ${bridged} explained by a marriage bridge, ` +
		`${disagree.length} unexplained`
);
for (const d of disagree) console.log('   UNEXPLAINED', JSON.stringify(d));

// ── 2. coverage + column height on the real gate ──────────────────────────────────────────────
const elig = index.filter((r) => (r.f & HD) || ((r.f & SPOUSE) && r.hp));
let n = 0, miss = 0, maxArm = 0, sameRoot = 0;
const arms = {};
let seed = 7;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
for (let i = 0; i < 1200; i++) {
	const a = elig[Math.floor(rnd() * elig.length)], b = elig[Math.floor(rnd() * elig.length)];
	if (a.id === b.id) continue;
	n++;
	const c = connect(a.id, b.id, at);
	if (!c) { miss++; continue; }
	const m = Math.max(c.upA, c.upB);
	arms[m] = (arms[m] ?? 0) + 1;
	if (m > maxArm) maxArm = m;
}
console.log(`\ncoverage over the eligible set (${elig.length} people): ${(100 * (n - miss) / n).toFixed(1)}% answered, ${miss} of ${n} with no shared ancestor`);
console.log(`tallest column: ${maxArm} rungs — distribution`, Object.keys(arms).sort((x, y) => x - y).map((k) => `${k}:${arms[k]}`).join(' '));

// ── 3. the sentence, on cases that exercise each branch ───────────────────────────────────────
console.log('\nwording:');
/** The End the sentence wants: the BLOODLINE person, with the chooser carried as `via` when they differ. */
const endOf = (id, c, side) => {
	const chosen = byId.get(id);
	const viaId = side === 'A' ? c.spouseA : c.spouseB;
	const root = byId.get(viaId ? chosen.hp : id) ?? chosen;
	return { name: root.n, sx: root.sx, ...(viaId ? { via: chosen.n } : {}) };
};
const show = (a, b) => {
	const c = connect(a, b, at);
	if (!c) return console.log(`   ${a} -> ${b}: no shared ancestor`);
	console.log(`   [${c.upA}/${c.upB}] ${sentence(endOf(a, c, 'A'), endOf(b, c, 'B'), c.upA, c.upB)}`);
	console.log(`        apex ${byId.get(c.lca)?.n}   columns ${c.left.length}+${c.right.length}` +
		(c.spouseA ? `   spouseA ${byId.get(a).n}` : '') + (c.spouseB ? `   spouseB ${byId.get(b).n}` : ''));
};
show('H00913', 'H00001');                       // Burr -> Thomas Hooker (lineal)
show('H00001', 'H00913');                       // the swap
const kid = index.find((r) => r.fa === 'H00913' || r.mo === 'H00913');
if (kid) { show('H00913', kid.id); show(kid.id, 'H00913'); }
const sp = elig.find((r) => r.hp && !(r.f & HD));
if (sp) { show(sp.id, 'H00913'); show('H00913', sp.id); }
// A cousin pair and an avuncular one, found rather than hand-picked, so the two commonest branches
// are exercised by a case that actually reaches them.
for (const want of [{ min: 2 }, { min: 1, max: 3 }]) {
	for (let i = 0; i < 4000; i++) {
		const a = elig[Math.floor(rnd() * elig.length)], b = elig[Math.floor(rnd() * elig.length)];
		const c = a.id !== b.id && connect(a.id, b.id, at);
		if (!c) continue;
		const lo = Math.min(c.upA, c.upB), hi = Math.max(c.upA, c.upB);
		if (lo === want.min && (!want.max || hi <= want.max) && c.upA !== c.upB) { show(a.id, b.id); show(b.id, a.id); break; }
	}
}
