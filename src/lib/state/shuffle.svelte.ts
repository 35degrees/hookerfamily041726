/**
 * SHUFFLE NOTABLES — the deck, dealt at random.
 *
 * Roadmap §13 put this next after the deck shipped, and design §22.8 fixed the shape: "the deck is THE
 * transition for every teleport-class navigation — CC now, SHUFFLE NOTABLES next (same mechanism, random
 * notable target). Build once, inherit twice." So this file contains NO flight code. It performs the same
 * capture sequence a CC click performs in `warmPersonLinks`, with three shuffle-specific values, and the
 * existing deck flies it.
 *
 * WHAT IT INHERITS UNTOUCHED: velocity and heft, the per-axis tilt, the empty-stage beat, the brake tail
 * and settle overshoot, the flight lock, the CC roster hard-cut, the connector cut, the demote.
 *
 * WHAT IT DIVERGES ON, and why each is deliberate rather than convenient:
 *
 *   1. DIRECTION IS FORCED LATERAL. A CC's axis is a kinship claim — `isVerticalMove` reads gen_delta,
 *      relation_class and the build-time kin_distance bake, all of which exist per cross-connection. A
 *      random notable has no such row, and inventing one would be a lie about a relationship nobody
 *      claimed. Sam: "we can totally disregard any vertical CC action… it's a stripped down CC hijacking
 *      the lateral transitions." genDelta 0 + relationClass 'collateral' + kinDistance null is exactly
 *      what isVerticalMove already treats as lateral, so this asserts nothing false.
 *
 *   2. THE DIRECTION IS FIXED, not ping-ponged. See setCarouselLateral in flight.ts.
 *
 *   3. RECENTLY SEEN ARE INELIGIBLE. A carousel that repeats undercuts the point of it — Sam's ask was
 *      that people "uncover the gems… and be delighted and surprised". With 1,059 eligible notables an
 *      unconstrained random repeats sooner than intuition suggests (the birthday problem: a repeat
 *      inside 20 draws is ~17% likely). The ring below makes the last RECENT_MAX ineligible outright.
 *
 *   4. IT PLAYS 10% QUICKER. Sam (Aug 7): "can we speed up notable transition by 10% but maintain CC
 *      standard transition speed as is?" A cross-connection is a claim you chose to follow, and its pace
 *      is the reading pace of that claim; a carousel draw is the same card arriving again and again, and
 *      at the CC's full length the repetition starts to cost. See CAROUSEL_TEMPO in flight.ts — it scales
 *      the deck's ONE shared time dial, so the army stays in formation and only the clock moves.
 */
import { featured } from './featured.svelte';
import { focusPerson } from './navigate';
import { hideCcRoster, showCcRoster } from './ccRoster.svelte';
import { publishCameraMove, type CameraMove } from './camera';
import { lockFlight } from './flightLock';
import {
	captureFlightOrigin,
	captureFlightKind,
	captureClicked,
	capturePivot,
	capturePanDir,
	captureRects,
	setCarouselLateral,
	setCarouselTempo,
	relativeGrowMs
} from '$lib/transitions/flight';
import { prefersReducedMotion } from 'svelte/motion';

type NotableRow = { slug: string; t: { x: number; y: number | null } | null };

/** How many recently-featured notables stay ineligible. Sam settled on 20 after weighing 10 and 12. */
const RECENT_MAX = 20;

/** Ring of recently featured slugs, newest last. Session-scoped: a reload starts fresh, by design. */
const recent: string[] = [];

let pool: NotableRow[] | null = null;
let loading: Promise<NotableRow[]> | null = null;

/** Loaded once and kept. ~1,059 rows; the whole file is a few tens of KB. */
async function getPool(): Promise<NotableRow[]> {
	if (pool) return pool;
	if (loading) return loading;
	loading = fetch('/data/notables.json')
		.then((r) => (r.ok ? r.json() : []))
		.then((rows: NotableRow[]) => {
			pool = Array.isArray(rows) ? rows : [];
			return pool;
		})
		.catch(() => {
			pool = [];
			return pool;
		});
	return loading;
}

/** Warm the pool without navigating, so the first click is not waiting on a fetch. */
export function warmShuffle(): void {
	void getPool();
}

/** Record a slug as seen. Exported so the page can seed it with the person you arrived on. */
export function markSeen(slug: string | null | undefined): void {
	if (!slug) return;
	const at = recent.indexOf(slug);
	if (at !== -1) recent.splice(at, 1);
	recent.push(slug);
	while (recent.length > RECENT_MAX) recent.shift();
}

/**
 * Pick a notable that is neither the current focus nor recently seen.
 *
 * The exclusion is a FILTER, not a retry loop: with a small pool and a 20-deep ring, rejection sampling
 * can spin, and there is no upper bound on how long. Filtering is O(n) over ~1,059 rows once per click.
 * If everything is excluded (a pool smaller than the ring), it falls back to "anything but the current
 * person" rather than returning nothing — the button must always do something.
 */
function pick(rows: NotableRow[], currentSlug: string | null): NotableRow | null {
	if (!rows.length) return null;
	const blocked = new Set(recent);
	if (currentSlug) blocked.add(currentSlug);
	let eligible = rows.filter((r) => !blocked.has(r.slug));
	if (!eligible.length) eligible = rows.filter((r) => r.slug !== currentSlug);
	if (!eligible.length) return null;
	return eligible[Math.floor(Math.random() * eligible.length)];
}

/**
 * Fly to a random notable. `node` is the element the flight nominally departs from (the button) — a
 * 'cc'-kind flight IGNORES the origin rect and enters whole from offscreen, but growFrom returns a zero
 * duration when the origin is null, so it must be a real rect.
 */
export async function shuffleToNotable(node: HTMLElement): Promise<void> {
	const rows = await getPool();
	const current = featured.current?.person?.slug ?? null;
	const target = pick(rows, current);
	if (!target) return;

	// Everything below mirrors the CC branch of warmPersonLinks, in the same order, for the same reasons.
	if (!prefersReducedMotion.current) lockFlight();
	captureFlightOrigin(node.getBoundingClientRect());
	captureFlightKind('cc');
	captureClicked(null); // no chip is becoming the card — nothing to keep hidden
	capturePivot(featured.current?.person.id ?? null);
	capturePanDir('lateral');
	captureRects(document.querySelectorAll('[data-flight-id]'));

	const slot = document.querySelector('.featured-slot');
	const oc = node.getBoundingClientRect();
	const dr = slot?.getBoundingClientRect();
	const screenVector = dr
		? {
				dx: dr.left + dr.width / 2 - (oc.left + oc.width / 2),
				dy: dr.top + dr.height / 2 - (oc.top + oc.height / 2)
			}
		: { dx: 0, dy: 0 };
	const distance = Math.hypot(screenVector.dx, screenVector.dy);
	const ft = featured.current?.person?.t;
	const from = ft ? { x: ft.x, y: ft.y } : null;
	const to = target.t ? { x: target.t.x, y: target.t.y } : null;

	// genDelta 0 + collateral + no kinDistance === lateral, by isVerticalMove's own rules. See (1) above.
	const move: Omit<CameraMove, 'seq'> = {
		from,
		to,
		screenVector,
		distance,
		duration: relativeGrowMs(distance),
		easing: 'cubicOut',
		kind: 'cc',
		relationClass: 'collateral',
		genDelta: 0,
		kinDistance: null,
		scaleMin: null
	};

	// The two ways a carousel draw diverges from a cross-connection, set together because they are one
	// fact about this flight: it is a shuffle. Both are per-flight and both are cleared by the next
	// captureFlightKind, so neither can bleed into an ordinary CC.
	setCarouselLateral(); // fixed direction — never the ping-pong. See (2) above.
	setCarouselTempo(); // 10% quicker end-to-end. See (4) below.
	publishCameraMove(move);

	markSeen(current);
	markSeen(target.slug);

	if (!prefersReducedMotion.current) {
		hideCcRoster();
		void focusPerson(target.slug).then(() => requestAnimationFrame(() => showCcRoster()));
		return;
	}
	void focusPerson(target.slug);
}

/** Test hook — the probe asserts on the exclusion window, which is otherwise invisible. */
export function recentSlugs(): string[] {
	return [...recent];
}
