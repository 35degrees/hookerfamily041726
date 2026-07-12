/**
 * table-coords.mjs — Phase 3a, Block 1: TABLE COORDINATES.
 *
 * Every person gets a permanent seat on the virtual table:
 *   x = branch position (tidy-tree over the descent), y = time (birth year, estimated
 *   when missing). DERIVED AT EMIT TIME ONLY — never stored in canonical.json, never
 *   computed at runtime (the NaN doctrine). Reads classification FLAGS, never id prefixes.
 *
 * Regions along x (one table, disjoint bands):
 *   HOOKER SPINE   — tidy-tree over is_thomas_descendant, from H00001.
 *   TALCOTT GROVE  — its own tidy-tree over (is_talcott_descendant && !is_thomas_descendant),
 *                    from John Talcott (T00011), in a reserved band right of the spine.
 *   ARCHIPELAGO    — orbit figures (documented CCs but no blood/marriage anchor), beyond the grove.
 *   GUTTER         — true orphans (no flag, no anchor, no CC), parked beyond the archipelago.
 *   Spouses/eggs offset from their anchor's seat within whatever region the anchor sits in.
 *
 * Consumer contract: y may be null (no time basis — never fabricated). ANY consumer
 * (timeline, flyover, zoom, camera) MUST SKIP y:null people — degrade, never throw.
 */

const HOOKER_ROOT = 'H00001';
const TALCOTT_ROOT = 'T00011';
const HOOKER_FOUNDER_Y = 1586;
const TALCOTT_FOUNDER_Y = 1594; // John Talcott (T00011) birth year
const GEN_Y = 28; // years per generation, for estimates
const SPOUSE_OFF = 0.4; // first spouse's x offset from the partner's seat
const SPOUSE_FAN = 0.1; // each further spouse of the same partner fans by this (5 max → ≤ +0.8 < 1)
const REGION_GUTTER = 40; // empty seats between the Hooker spine and the Talcott grove
const BAND_GUTTER = 20; // between grove → archipelago → gutter

export function computeTableCoords(people) {
	const byId = Object.fromEntries(people.map((p) => [p.id, p]));
	const C = (p) => p.classification || {};
	const isTd = (p) => C(p).is_thomas_descendant === true;
	const isGrove = (p) => C(p).is_talcott_descendant === true && !isTd(p);
	const isEgg = (p) => C(p).is_easter_egg === true;
	const nameOf = (p) => (p.bio || p.name || {}).display_name || p.id;
	const anomalies = []; // [id, name, reason, detail] worklist rows

	// ── family edges ────────────────────────────────────────────────────────
	const childrenIds = (p) => {
		const o = [];
		for (const m of p.marriages || []) for (const c of m.children_ids || []) if (byId[c]) o.push(c);
		return o;
	};
	// spouse adjacency (symmetric) + per-spouse list of anchors (partner + marriage order)
	const spouseAdj = new Map();
	const spouseAnchors = new Map(); // spouseId -> [{ partner, order }]
	const addSp = (a, b) => {
		if (!spouseAdj.has(a)) spouseAdj.set(a, new Set());
		spouseAdj.get(a).add(b);
	};
	for (const p of people) {
		(p.marriages || []).forEach((m, i) => {
			const s = m.spouse_id;
			if (s && byId[s]) {
				addSp(p.id, s);
				addSp(s, p.id);
				if (!spouseAnchors.has(s)) spouseAnchors.set(s, []);
				spouseAnchors.get(s).push({ partner: p.id, order: i }); // 0-based marriage index → 1st spouse +0.4
			}
		});
	}

	// ── Y (time) : dated seed → BFS estimate over child(+28) / parent(-28) / spouse(0) ──
	const yById = new Map();
	const yEst = new Set();
	const q = [];
	for (const p of people) {
		const b = p.birth && p.birth.year;
		if (b != null) {
			yById.set(p.id, b);
			q.push(p.id);
		}
	}
	for (let qi = 0; qi < q.length; qi++) {
		const id = q[qi];
		const cy = yById.get(id);
		const p = byId[id];
		for (const c of childrenIds(p))
			if (!yById.has(c)) {
				yById.set(c, cy + GEN_Y);
				yEst.add(c);
				q.push(c);
			}
		const par = p.parents || {};
		for (const r of ['father_id', 'mother_id']) {
			const pa = par[r];
			if (pa && byId[pa] && !yById.has(pa)) {
				yById.set(pa, cy - GEN_Y);
				yEst.add(pa);
				q.push(pa);
			}
		}
		for (const s of spouseAdj.get(id) || [])
			if (!yById.has(s)) {
				yById.set(s, cy);
				yEst.add(s);
				q.push(s);
			}
	}
	// founder fallback: disconnected from every dated person but has a generation (rare — usually 0)
	for (const p of people) {
		if (yById.has(p.id)) continue;
		const g = C(p).generation_from_thomas;
		const gt = C(p).generation_from_john_talcott;
		if (isTd(p) && g != null) {
			yById.set(p.id, HOOKER_FOUNDER_Y + g * GEN_Y);
			yEst.add(p.id);
		} else if (isGrove(p) && gt != null) {
			yById.set(p.id, TALCOTT_FOUNDER_Y + gt * GEN_Y);
			yEst.add(p.id);
		}
	}

	// ── X (branch) : one tidy-tree per region ────────────────────────────────
	const xById = new Map();
	// canonical single parent = GEOMETRY tiebreak only (father-line): the seat is a rendering
	// decision, never a genealogical claim — both parents stay full parents in data and UI.
	function buildTree(memberPred) {
		const canon = new Map(); // childId -> the one parent it hangs from
		const inTree = (q) => q && byId[q] && memberPred(byId[q]);
		for (const p of people) {
			if (!memberPred(p)) continue;
			const par = p.parents || {};
			if (inTree(par.father_id)) canon.set(p.id, par.father_id);
			else if (inTree(par.mother_id)) canon.set(p.id, par.mother_id);
		}
		const kids = new Map();
		for (const [c, pa] of canon) {
			if (!kids.has(pa)) kids.set(pa, []);
			kids.get(pa).push(c);
		}
		const roots = people.filter((p) => memberPred(p) && !canon.has(p.id)).map((p) => p.id);
		return { kids, roots };
	}
	const diedYoung = (id) => {
		const p = byId[id];
		const b = p.birth && p.birth.year;
		const d = p.death && p.death.year;
		return b != null && d != null && d - b <= 15;
	};
	// children ordered: birth-year asc, died-young last, id tiebreak (deterministic)
	const okey = (id) => [diedYoung(id) ? 1 : 0, yById.has(id) ? yById.get(id) : Infinity, id];
	const sortKids = (arr) =>
		arr.slice().sort((a, b) => {
			const ka = okey(a);
			const kb = okey(b);
			return ka[0] - kb[0] || ka[1] - kb[1] || (ka[2] < kb[2] ? -1 : ka[2] > kb[2] ? 1 : 0);
		});
	function layoutTree(kids, rootIds, startSeat) {
		let seat = startSeat;
		const seen = new Set();
		function lay(id) {
			if (seen.has(id)) return xById.get(id);
			seen.add(id);
			const ch = sortKids((kids.get(id) || []).filter((k) => !seen.has(k)));
			if (!ch.length) {
				xById.set(id, seat);
				seat += 1;
				return seat - 1;
			}
			const xs = ch.map(lay);
			const cx = (Math.min(...xs) + Math.max(...xs)) / 2; // internal node centered over its children
			xById.set(id, cx);
			return cx;
		}
		for (const r of rootIds) lay(r);
		return seat;
	}
	// HOOKER spine: primary tree from Thomas, then any detached td subtrees at the right edge
	const byRootOrder = (ids) =>
		ids.slice().sort((a, b) => okey(a)[1] - okey(b)[1] || (a < b ? -1 : a > b ? 1 : 0));
	const hk = buildTree(isTd);
	let seat = layoutTree(hk.kids, [HOOKER_ROOT], 0);
	const detachedTd = byRootOrder(hk.roots.filter((r) => r !== HOOKER_ROOT));
	if (detachedTd.length) {
		seat += 5;
		seat = layoutTree(hk.kids, detachedTd, seat);
		for (const r of detachedTd)
			anomalies.push([
				r,
				nameOf(byId[r]),
				'detached-td-root',
				'is_thomas_descendant but no in-tree parent; seated as a detached subtree (linkage gap)'
			]);
	}
	const hookerEnd = seat;
	// TALCOTT grove: its OWN tidy-forest over the descendants, in a reserved band right of the spine.
	// The Talcott progenitors (T00001/T00011) aren't flagged is_talcott_descendant, so the natural
	// roots are their descendant lines (John Talcott T00002's line + T00011's children); seat them
	// birth-year-ordered. (TALCOTT_FOUNDER_Y stays the y-estimate anchor for grove people with no date.)
	const gv = buildTree(isGrove);
	const groveStart = hookerEnd + REGION_GUTTER;
	seat = layoutTree(gv.kids, byRootOrder(gv.roots), groveStart);
	const groveEnd = seat;

	// ── spouses / eggs (offset from the anchor's seat) — iterate to settle spouse-of-spouse ──
	const anchorX = (id) => (xById.has(id) ? xById.get(id) : null);
	let changed = true;
	while (changed) {
		changed = false;
		for (const p of people) {
			if (xById.has(p.id)) continue;
			// spouse: offset from the seated partner with the lowest x; fan by that partner's marriage order
			const anchors = (spouseAnchors.get(p.id) || [])
				.map((a) => ({ ...a, x: anchorX(a.partner) }))
				.filter((a) => a.x != null)
				.sort((a, b) => a.x - b.x || a.order - b.order);
			if (anchors.length) {
				const a = anchors[0];
				xById.set(p.id, a.x + SPOUSE_OFF + SPOUSE_FAN * a.order);
				changed = true;
				continue;
			}
			// easter egg with a seated connector (cross-connection target): offset from the connector
			if (isEgg(p)) {
				const conn = (p.cross_connections || [])
					.map((cc) => anchorX(cc.related_id))
					.filter((x) => x != null)
					.sort((a, b) => a - b)[0];
				if (conn != null) {
					xById.set(p.id, conn + SPOUSE_OFF);
					changed = true;
					continue;
				}
			}
		}
	}

	// ── archipelago (orbit: has CCs, no seat yet) then gutter (true orphans) ──
	const unseated = people.filter((p) => !xById.has(p.id));
	const hasCC = (p) => (p.cross_connections || []).length > 0;
	const archi = unseated.filter(hasCC).sort((a, b) => (a.id < b.id ? -1 : 1));
	const orphans = unseated.filter((p) => !hasCC(p)).sort((a, b) => (a.id < b.id ? -1 : 1));
	let s = groveEnd + BAND_GUTTER;
	for (const p of archi) {
		xById.set(p.id, s++);
		anomalies.push([p.id, nameOf(p), 'archipelago', 'orbit figure: documented CCs but no blood/marriage anchor']);
	}
	s += BAND_GUTTER;
	for (const p of orphans) {
		xById.set(p.id, s++);
		anomalies.push([p.id, nameOf(p), 'true-orphan', 'no blood/egg flag, no marriage anchor, no CC — likely a linkage gap']);
	}

	// ── assemble coords : t = {x, y, e?} on every person ──
	const coords = new Map();
	let nullY = 0;
	for (const p of people) {
		const x = xById.get(p.id);
		const hasY = yById.has(p.id);
		const yv = hasY ? yById.get(p.id) : null;
		const estimated = !hasY || yEst.has(p.id); // e:true when time is estimated OR unknown
		const t = { x, y: yv };
		if (estimated) t.e = true;
		coords.set(p.id, t);
		if (yv == null) {
			nullY++;
			anomalies.push([p.id, nameOf(p), 'no-y-basis', 'no birth year and no dated relative/partner — y:null (consumers skip)']);
		}
	}

	const stats = {
		total: people.length,
		hookerSeats: hookerEnd,
		groveStart,
		groveEnd,
		regionsDisjoint: groveStart >= hookerEnd,
		detachedTd: detachedTd.length,
		archipelago: archi.length,
		gutterOrphans: orphans.length,
		yDated: people.length - yEst.size - nullY, // people with an exact birth year used directly
		yEstimated: yEst.size,
		yNull: nullY
	};
	return { coords, anomalies, stats, TALCOTT_ROOT, HOOKER_ROOT };
}
