<!--
  ConnectAnyoneModal — CONNECT <person> TO ANYONE.

  ITS OWN COMPONENT, DELIBERATELY, and that is the load-bearing decision here rather than an
  organisational one. This began life as a `mode` flag inside ConnectModal, sharing the ladder's markup,
  and Sam stopped it: *"Paths to thomas, Search and Connect to Anyone are all dependent on each other
  like you are trying to be code efficient and minimalize things. that is the wrong approach... each of
  these functions have very different purposes and need to feel individualized not just some pabulum
  functionality that no one cares about."*

  He was right, and the proof was already on the table: tuning THIS feature's header fade had changed
  Paths to Thomas's, a shipped surface nobody had asked me to touch. A shared component means every
  future dial on one of them is a dial on the other.

  SO: SHARED PRIMITIVES, NEVER SHARED FEATURES. What is still common with the rest of the app is the
  app's own vocabulary, not this feature's behaviour —

    `.person-box`      the global card: paper, shadow, line-status fills. A rung must BE one (design
                       §44.1); a lookalike is a promise to diverge on the next stripe.
    `warmPersonLinks`  the one navigation path. Re-implementing it would duplicate the flight lock, the
                       rect snapshot, the tier span and the pivot.
    `search.svelte.ts` one corpus, one fold, one ranking. A second search ENGINE would answer the same
                       question two ways; a second search EXPERIENCE is exactly what this file is.
    `kin.ts`           the walk, which nothing else uses.

  Everything below — the veil, the picker, the rungs, the couple bar, the schedule — belongs to this
  feature alone and may be changed without reading another file.
-->
<script lang="ts">
	import { tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import { linear, cubicOut } from 'svelte/easing';
	import { modal, closeModal } from '$lib/state/modal.svelte';
	import { featured } from '$lib/state/featured.svelte';
	import type { PersonCompact } from '$lib/types/neighborhood';
	import { cldSize, PHOTO_TRANSFORM } from '$lib/photo';
	import { stage } from '$lib/state/stage.svelte';
	import { shrinkToFit } from '$lib/actions/shrinkToFit';
	import {
		search,
		setGate,
		setText,
		load,
		clear as clearSearch,
		CAT
	} from '$lib/state/search.svelte';
	import { connect, sentence, type KinCache } from '$lib/search/kin';

	/**
	 * ITS OWN FILE, DELIBERATELY. Read design §46.2 before moving anything out of here.
	 *
	 * This began as a second MODE inside `ConnectModal` — a skin, the way the founder zone is a skin on
	 * the Ascension (§43.1) — on the reasoning that a parallel mechanism silently diverges. That was the
	 * wrong trade for this surface, and Sam named it: *"each of these functions have very different
	 * purposes and need to feel individualized, not just some pabulum functionality … like a rehashed
	 * Disney sequel."* Sharing a body meant a fade written for THIS feature silently changed a shipped
	 * Paths-to-Thomas transition, which is the coupling stated as a bug.
	 *
	 *   connect-thomas   ONE end is fixed. Every route is baked into the payload; the ladder is one
	 *                    column of ancestors and the only choice is WHICH route. Tabs, a switch, a
	 *                    schedule built around survivors moving between paths.
	 *   connect-anyone   BOTH ends are chosen. There is no bake — an arbitrary pair is N² — so the far
	 *                    end is picked from the search index and the path is walked in the browser.
	 *                    One path, no tabs, no switch; a V rather than a line, and a sentence.
	 *
	 * WHAT IS SHARED, AND THE TEST FOR IT: the DATA (`search.svelte.ts`, `kin.ts`, the `CAT` bits, the
	 * parent edges) and the CARD SPECIES (`.person-box`, the paper, the shadow, the star). Nothing that
	 * renders, and nothing that schedules. Before sharing anything with `ConnectModal` or `SearchModal`,
	 * ask whether a change made for one surface would be a change to the OTHER surface's behaviour — if
	 * yes, it is not shared code, it is a coupling, and duplication is the cheaper of the two.
	 *
	 * The duplication is therefore intentional and is not a cleanup target. The machinery this file
	 * inherited that it does NOT use — the path switch — was removed on 082826 precisely because a
	 * mechanism sitting inert is a claim about what this ladder can do (§33's `--ring-live` doctrine).
	 */
	const open = $derived(modal.kind === 'connect-anyone');
	const focus = $derived(featured.current?.neighborhood?.focus ?? null);
	/**
	 * THE SAME GATE THE BUTTON TAKES: `pathsToThomas`'s presence, which by construction is exactly the
	 * Hooker descendants and the married-in spouses. One predicate, so the button and the modal cannot
	 * disagree about who this is for.
	 */
	const eligible = $derived((featured.current?.pathsToThomas ?? []).length > 0);

	/**
	 * THE PICKER COMES FIRST (Sam: "of course the search must come first").
	 *
	 * The modal cannot open on a diagram, because half the diagram has not been chosen yet. So it opens
	 * on the picker INSIDE THIS SAME SHELL — same veil, same blur, same arrival — and becomes a V once a
	 * second person exists. The two phases are one overlay rather than two, so the ground never blinks
	 * between choosing and seeing.
	 */
	let target = $state<string | null>(null);
	/**
	 * WHICH HALF ARE WE IN: simply whether a far end has been chosen. It was briefly a `phase` union,
	 * which bought nothing but a narrowing argument with the compiler — the boolean IS the state.
	 */
	const chosen = $derived(target !== null);

	// ── THE PICKER'S OWN STATE. Dies with the view, so it lives here and not in the search module. ──
	let pickerInput = $state<HTMLInputElement | null>(null);
	let pickerList = $state<HTMLElement | null>(null);
	let pickerCursor = $state(0);
	/** A new result set invalidates the old cursor; 0 rather than −1 so Enter always has a target. */
	$effect(() => {
		void search.rows;
		pickerCursor = 0;
	});
	$effect(() => {
		if (!open || chosen) return;
		void load().catch(() => {});
		void tick().then(() => pickerInput?.focus());
	});
	function onPickerKey(e: KeyboardEvent) {
		// ESCAPE IS THE WINDOW'S, not the field's — see `onKeydown`. Handling it here as well ran both,
		// so one press cleared the box and closed the modal. Left alone, it bubbles to the one owner.
		if (e.key === 'Escape') return;
		const n = search.rows.length;
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			if (!n) return;
			pickerCursor = Math.max(0, Math.min(n - 1, pickerCursor + (e.key === 'ArrowDown' ? 1 : -1)));
			void tick().then(() =>
				pickerList?.querySelector('.pick.on')?.scrollIntoView({ block: 'nearest' })
			);
		} else if (e.key === 'Enter') {
			const row = search.rows[pickerCursor];
			if (row) {
				e.preventDefault();
				target = row.id;
			}
		}
	}

	/**
	 * THE WALK BETWEEN THE TWO ENDS. Null until a pick, and null again on a new card.
	 *
	 * The memo is owned HERE and dies with the modal (see `KinCache`): every pick re-walks the subject's
	 * ancestry and that walk never changes while this card is featured, so the second pick onward is free.
	 */
	const kinCache: KinCache = new Map();
	const conn = $derived.by(() => {
		if (!target || !focus?.id || !search.ready) return null;
		return connect(focus.id, target, (id) => search.row(id), kinCache);
	});

	/**
	 * A RUNG FROM A SEARCH ROW.
	 *
	 * The V's rungs cannot come from the payload — a person eight generations up is nobody's neighbour,
	 * which is the whole reason this walk exists — so they are built from the index the picker already
	 * loaded. Every field the rung markup paints is there: `n`, the years, `ph`, `bl`, and the three
	 * line-status flags fall out of the `f` bitfield, so a rung here is shaded by exactly the rule that
	 * shades that person's chip on the stage.
	 *
	 * `pp` (the crop override) and `sn` are NOT on a search row. The crop degrades to the default and
	 * the short name falls back to the display name — both visible only on a handful of people, and
	 * both cheaper than widening a 19,728-row index for them.
	 */
	function rungOfRow(id: string): Rung | null {
		const r = search.row(id);
		if (!r) return null;
		return {
			id: r.id,
			slug: r.slug,
			n: r.n,
			by: r.by,
			dy: r.dy,
			g: r.g,
			sx: r.sx ?? 'u',
			hd: (r.f & CAT.HD) !== 0,
			td: false,
			ee: (r.f & CAT.INLAW) !== 0,
			sp: (r.f & CAT.SPOUSE) !== 0,
			p: r.ph ?? null,
			...(r.pv ? { pv: true } : {}),
			...(r.bl ? { bl: r.bl } : {}),
			// The paired spouse card is the one surface that names a married-in person alone, beside a
			// partner with the same surname — so it wants the short name and the suffix (design §44.15).
			...(r.sn ? { sn: r.sn } : {}),
			...(r.sf ? { sf: r.sf } : {})
		} as Rung;
	}

	const apexRung = $derived(conn ? rungOfRow(conn.lca) : null);
	const leftRungs = $derived(conn ? (conn.left.map(rungOfRow).filter(Boolean) as Rung[]) : []);
	const rightRungs = $derived(conn ? (conn.right.map(rungOfRow).filter(Boolean) as Rung[]) : []);
	/** The married-in card that hangs off the end of an arm, when that end borrowed a partner's line. */
	const leftSpouse = $derived(conn?.spouseA ? rungOfRow(conn.spouseA) : null);
	const rightSpouse = $derived(conn?.spouseB ? rungOfRow(conn.spouseB) : null);

	/**
	 * THE CASUAL NAME (Sam) — `chip_first_name ?? first_name`, and the display name only as a last
	 * resort. The same precedence the sibling chips use, so a person is called one thing in both places.
	 *
	 * A card is a label under a portrait and wants the full form; a SENTENCE wants the name a person is
	 * called. "Samuel Talcott Hooker is the great-great-grand-nephew of Rev. Charles Chauncey Hooker"
	 * buries the one fact that line exists to state.
	 */
	/**
	 * TITLES THAT ARE NOT NAMES. The last-resort fallback takes the first token of the display name, and
	 * "Rev. Thomas Hooker" would otherwise be called "Rev." — the same trap §21.1 records for splitting
	 * `sn`, which is why `fn` exists as a real field at all. Abbreviations are caught by the trailing
	 * period; the spelled-out forms have to be listed.
	 */
	const TITLE_TOKEN =
		/^(rev|dr|capt|col|gen|lt|maj|gov|sen|dea|eld|hon|mrs|mr|ms|sir|lady|reverend|doctor|captain|colonel|general|lieutenant|major|governor|senator|deacon|elder|honorable|judge|prof|professor)\.?$/i;

	function casual(q: { cf?: string | null; fn?: string | null; n?: string } | null): string {
		if (q?.cf) return q.cf;
		if (q?.fn) return q.fn;
		/**
		 * THE FIRST TOKEN OF THE DISPLAY NAME, and only when both real fields are missing.
		 *
		 * Sam: "Connect Mary Binney Wheeler von Czoernig to…" — "clearly not casual. it should read
		 * Connect Mary to...". She has neither `chip_first_name` nor `first_name`; her whole name lives
		 * in `display_name`, which is part of the multi-token debt roadmap §44.4 already tracks. A
		 * structured field would be better and is Stream A's to fix. Until then the first token is the
		 * given name for every record in this corpus, and a header reading a full four-part name is worse
		 * than a heuristic that is right almost always and can never be dangerous — it only ever picks a
		 * shorter form of a name that is already on screen.
		 */
		const parts = (q?.n ?? '').trim().split(/\s+/).filter(Boolean);
		while (parts.length > 1 && TITLE_TOKEN.test(parts[0])) parts.shift();
		return parts[0] || 'this person';
	}
	/** The casual name off a search row, which is where a V's rungs come from. */
	function casualRow(id: string | null | undefined): string {
		const r = id ? search.row(id) : null;
		return r ? casual(r) : '';
	}

	/**
	 * "Sam is the great-great-grand-nephew of Charles."
	 * "Sam's wife Mary is the great-grand-niece of Charles."
	 * "Sam's wife Mary is the great-grandmother of Tom's wife Inga."
	 *
	 * A married-in end is named THROUGH the person they married, because the line the walk climbed is
	 * that person's. The gendered words — wife/husband, and niece/nephew — both agree with whoever the
	 * sentence NAMES, which is the married-in person where there is one.
	 */
	const relation = $derived.by(() => {
		if (!conn) return '';
		const endA = leftRungs.at(-1) ?? apexRung;
		const endB = rightRungs.at(-1) ?? apexRung;
		if (!endA || !endB) return '';
		// The BLOODLINE person is the subject; the married-in chooser takes the possessive. See kin.ts's
		// `subject` — this was the other way round and claimed a blood relationship for the person who
		// does not have one.
		const A = leftSpouse
			? { name: casualRow(endA.id), sx: endA.sx, of: casualRow(leftSpouse.id) }
			: { name: casualRow(endA.id), sx: endA.sx };
		const B = rightSpouse
			? { name: casualRow(endB.id), sx: endB.sx, of: casualRow(rightSpouse.id) }
			: { name: casualRow(endB.id), sx: endB.sx };
		return sentence(A, B, conn.upA, conn.upB);
	});

	/**
	 * THE APEX'S SPOUSE — the other parent of the first rung below them, never "their first marriage".
	 *
	 * Sam: "obviously the wife would be the mother of the first person in the right column if the LCA has
	 * multiple wives." That is not a nicety, it is the only correct answer: a shared ancestor who married
	 * three times has three wives and exactly ONE of them is on this path. Reading the child's other
	 * parent asks the question the diagram is actually about — which marriage did this descent come
	 * through — instead of picking a spouse and hoping.
	 *
	 * The right column names them because the right column is where the reader's eye lands last; when
	 * that arm is empty (the target IS the apex) the left one answers instead.
	 */
	/**
	 * A LINEAL PAIR IS NOT A V (Sam) — "if the user chooses a direct ancestor like Quentin to Mary, you
	 * don't need to show the wide LCA with both spouses... we won't show James Pierpont."
	 *
	 * When one arm is empty the chosen person IS the shared ancestor, so there is no fork to draw and no
	 * marriage the descent passed THROUGH — it passed through them. A couple bar there would widen the
	 * diagram to say something it does not mean, and would put a stranger at the top of a line that never
	 * went near them. One column, one card, the same width as every other.
	 *
	 * The sentence is untouched: "Quentin is the great-great-grandson of Mary" is still the answer, and
	 * still the only place the relationship is stated in words.
	 */
	const isLineal = $derived(!!conn && (conn.upA === 0 || conn.upB === 0));

	/**
	 * ONE SEQUENCE THROUGH THE WHOLE DIAGRAM — the cards arrive in the order the path is READ: from the
	 * person you are standing on, up their line, across the shared ancestor, and down to the person you
	 * chose. The apex is not an exception; it is the card in the middle of that sequence.
	 *
	 * `arrive`/`depart` count their delay as `(n - 1 - i)`, which is what makes the Thomas ladder build
	 * from the bottom. A card's `i` is therefore its position counted BACK from the end, and passing the
	 * sequence position through that inversion is what puts the whole V on ONE cascade rather than three
	 * independent ones that happened to overlap.
	 */
	const seqTotal = $derived(leftRungs.length + 1 + rightRungs.length);
	const seqLeft = (j: number) => leftRungs.length - 1 - j;
	const seqApex = $derived(leftRungs.length);
	const seqRight = (k: number) => leftRungs.length + 1 + k;
	/** Sequence position -> the `i` the transitions want. */
	const atSeq = (q: number) => seqTotal - 1 - q;
	/**
	 * THE EXIT IS RANKED BY ROW, THE ENTRANCE BY SEQUENCE — two different orders on purpose.
	 *
	 * Arriving, the cards trace the PATH: from the person you are standing on, up their line, across the
	 * shared ancestor, down to the person you chose. That is the story, and it has to be told one card at
	 * a time.
	 *
	 * Leaving, nobody is reading anything. Sam: "it looks gangly and awkward to exit the first column and
	 * then the second column... Kermit Roosevelt and Elizabeth Sturgis Polk Guest would exit out at the
	 * same time as a combined row." So the two arms are re-ranked by DEPTH, and a row leaves as a row.
	 * Same velocity, same stagger, same curve — only the grouping changes.
	 */
	const outRows = $derived(Math.max(leftRungs.length, rightRungs.length) + 1);
	/** Depth 0 is the apex; depth d is the d-th rung of either arm. `depart` counts back from the end. */
	const atRow = (depth: number) => depth;
	/**
	 * A SNIPPET PARAMETER THAT WAS NEVER PASSED IS A SYMBOL, NOT `undefined` — so a default value does
	 * not fire for it, and the first arithmetic that touches it throws "Cannot convert a Symbol value to
	 * a number". It surfaced on the exit, from `outIndex >= 0`.
	 *
	 * These snippets carry nine parameters between them and are rendered from five call sites; one of
	 * them being short by an argument is a live possibility every time this markup is edited, and the
	 * failure mode is a thrown error mid-transition rather than anything visible. So the numbers are
	 * normalised at the boundary instead of being trusted.
	 */
	const num = (v: unknown, fallback: number) => (typeof v === 'number' ? v : fallback);

	const apexSpouse = $derived.by(() => {
		if (!conn) return null;
		// No couple bar on a lineal pair — see isLineal.
		if (isLineal) return null;
		const below = rightRungs[0] ?? leftRungs[0];
		const r = below ? search.row(below.id) : null;
		if (!r) return null;
		const other = r.fa === conn.lca ? r.mo : r.mo === conn.lca ? r.fa : null;
		return other ? rungOfRow(other) : null;
	});

	/**
	 * SWITCHING — true only while a path change is playing out, and it exists to give the ARRIVALS a
	 * different schedule from the leavers. Sam on the first version: "when i click Path 2 … the height
	 * of the ladder increases to like 20 people in an instant which is horrible and confusing … its just
	 * lazy coding." It was: the rows were keyed by `id + position`, so EVERY card counted as a different
	 * card, the whole list was torn down and rebuilt at once, and the container's height jumped in a
	 * single frame.
	 *
	 * Keyed by `id` ALONE, a person who appears in both paths is the SAME element to Svelte, so they are
	 * neither removed nor added — they stay put, or they flip to a new seat. Which is the whole value of
	 * the gesture: "its value is in seeing who stays and having the timing to differentiate who stays and
	 * who goes."
	 *
	 * HERE THERE IS NO SWITCH — this feature draws one path and has no tabs, so a column mounts once and
	 * unmounts once, and no card is ever asked to move between seats. The keying is kept identical anyway:
	 * the two ladders are read side by side, and a gratuitous difference between them is a question a
	 * future reader has to answer before they can trust either.
	 */
	/**
	 * WHERE EACH RUNG WAS SITTING, captured just BEFORE a change that removes any of them.
	 *
	 * Svelte pulls an outgoing keyed item out of the flex flow so the survivors can close the gap — but
	 * it does not preserve where that item was. Measured on Anne Hooker's path switch: all eight leavers
	 * reported `y = 0`, so they piled onto Thomas at the top of the ladder and left as ONE STACK, which
	 * is exactly what Sam saw. The seat has to be remembered by us, before the list changes, and pinned
	 * back on in `depart`.
	 */
	const seatY = new Map<string, { top: number; left: number; width: number; height: number }>();
	function snapshotSeats() {
		const box = document.querySelector('.ladder-rows');
		if (!box) return;
		// `.rung` AND `.rung-spouse` — the paired card leaves with the rest and needs its seat too. It was
		// the only departing card without one, which left it alone in depending on the container.
		for (const el of box.querySelectorAll<HTMLElement>('.rung, .rung-spouse')) {
			const id = el.dataset.rid;
			if (!id) continue;
			const r = el.getBoundingClientRect();
			seatY.set(id, { top: r.top, left: r.left, width: r.width, height: r.height });
		}
	}


	/** True from the moment a close is requested — `depart` reads it to pick the close cascade over the
	 *  switch stagger. Reset when the modal is next opened. */
	let closing = false;
	// A different person means a different ladder; without this, arriving at a 1-path card while
	// index 2 was selected would render nothing. The far end goes with it: a path is between TWO
	// people, so changing one of them invalidates the answer rather than re-anchoring it.
	// A path is between TWO people, so changing one of them invalidates the answer rather than
	// re-anchoring it. Landing on a new card sends the reader back to the picker.
	$effect(() => {
		if (focus?.id) target = null;
	});
	/**
	 * THE ELIGIBILITY FLOOR IS THE SURFACE'S, so it lives and dies with the surface.
	 *
	 * Only a Hooker descendant or someone married to one can be the far end of a blood path — an orbit
	 * figure has no shared ancestor by definition, which is what makes them orbit. Offering them would
	 * be offering a question this modal cannot answer. Cleared on close, because the same module serves
	 * the ordinary search modal and a floor left standing there would quietly hide 938 people from it.
	 */
	$effect(() => {
		if (open && true) {
			setGate(CAT.HD | CAT.SPOUSE);
			return () => setGate(0);
		}
	});
	$effect(() => {
		if (open) closing = false;
	});
	/**
	 * CONNECT-TO-ANYONE FORGETS EVERYTHING — ON THE WAY IN, NOT ON THE WAY OUT (Sam: "when i exit out of
	 * 'Connect to anyone' all fields reset to default empty. the user will have to re-enter their choice,
	 * we don't leave it set to the old one if they exit the functionality and return").
	 *
	 * Deliberately the OPPOSITE of the search modal, whose whole reason for keeping its query is that you
	 * browse with it — pick Hartford Founders, click someone, come back, and the twelve are still there
	 * (search.svelte.ts's own note). A path is not browsing: it is one question about two specific
	 * people, and reopening onto a stale far end answers a question nobody asked, on a card that may not
	 * even be the one it was asked from.
	 *
	 * CLEARING ON OPEN RATHER THAN ON CLOSE IS THE WHOLE FIX. Doing it in `requestClose` destroyed the
	 * V's data in the same frame the cards began their exit — `conn` went null, the arms emptied, and the
	 * departing cards were left computing their schedule against a list that no longer had them in it
	 * (WAAPI threw outright: "duration must be non-negative"). A leaver needs its numbers until it has
	 * finished leaving. Resetting at the START of the next visit gives the same guarantee to the user and
	 * takes nothing away from the animation.
	 */
	/**
	 * THE LAST ANSWER IS GONE BEFORE THE NEXT VISIT STARTS — and WHEN it is cleared has now been wrong
	 * in both directions, so both are written down.
	 *
	 * Clearing in `requestClose` destroyed the V's data in the frame the cards began to leave: `conn`
	 * went null, the arms emptied, and the leavers computed their schedule against a list they were no
	 * longer in (WAAPI threw "duration must be non-negative"). A leaver needs its numbers until it has
	 * finished leaving.
	 *
	 * Clearing on OPEN fixed that and bought a second bug — Sam: "the old remnants from previous search
	 * are still there and they instantly transition out a second time in flashes but nothing is
	 * readable". The reset runs in an effect, which is one flush AFTER the block has already rendered,
	 * so the old V painted for a frame and then tore itself down in front of the new picker.
	 *
	 * So it is cleared on the FALLING edge, once the close has actually finished: late enough that every
	 * leaver kept its data, early enough that the next open finds nothing. The timer is the close
	 * cascade's own length rather than a guess, and it is cancelled if the modal reopens first.
	 */
	/**
	 * A VISIT IS AN IDENTITY, and re-opening starts a new one.
	 *
	 * Clearing `target` stops the OLD ANSWER rendering, but it does nothing about the cards that are
	 * still leaving: a close takes ~600ms, and re-opening inside that window left the previous V's
	 * leavers mid-flight under the new picker — Sam saw them "instantly transition out a second time in
	 * flashes but nothing is readable". They are outro elements of a block Svelte is still tearing down,
	 * so no amount of state-clearing reaches them.
	 *
	 * Keying the contents on a visit counter does: a new key is a new block, and the old one — leavers
	 * included — is discarded rather than allowed to finish over the top of what replaced it.
	 */
	let visit = $state(0);
	let wipeTimer: ReturnType<typeof setTimeout> | null = null;
	$effect(() => {
		if (open) {
			/**
			 * A PENDING WIPE IS RUN, NOT CANCELLED — and cancelling it is what put Thomas Hooker in the
			 * picker. Sam: "why would Thomas appear in search results when i just clicked the Connect Mary
			 * to Anyone button... the Thomas box has squared off corners". Squared corners were the tell:
			 * that was never a result row, it was the previous answer's APEX still mounted. Reopen inside
			 * the close window and the timer was cleared with `target` still set, so `chosen` was true and
			 * the old V rendered instead of the picker.
			 */
			if (wipeTimer) {
				clearTimeout(wipeTimer);
				wipeTimer = null;
				target = null;
				clearSearch();
				visit += 1;
			}
			return;
		}
	});

	/**
	 * THE WIPE IS SCHEDULED BY THE CLOSE, NOT BY AN EFFECT — and this cost a live bug in a feature that
	 * is not even this one.
	 *
	 * It used to sit in the effect above, which read `search.text` to decide whether anything was worth
	 * wiping. That made `search.text` a DEPENDENCY, so the effect re-ran on every keystroke — including
	 * every keystroke typed into the MAIN SEARCH MODAL, while this component was closed and invisible.
	 * Each one scheduled a wipe, and ~600ms later `clearSearch()` emptied the box out from under the
	 * person typing. Sam: "anything i type in the search input bar gets erased after 2-3 characters
	 * constantly and never gets to the point where it can show results".
	 *
	 * A CLOSE IS AN EVENT, NOT A STATE, and that is the whole lesson: an effect fires whenever anything
	 * it touches changes, so reading SHARED state inside one silently couples this feature to every
	 * other feature that writes it. Every close goes through `requestClose`, so scheduling it there is
	 * both complete and inert while this modal is shut.
	 */
	function scheduleWipe() {
		if (wipeTimer) clearTimeout(wipeTimer);
		const lastOut = (seqTotal ? (seqTotal - 1) * CLOSE_STAGGER : 0) + CLOSE_MS + 60;
		wipeTimer = setTimeout(() => {
			target = null;
			clearSearch();
			wipeTimer = null;
		}, lastOut);
	}

	/** Thomas first, focus appended — the chain stops one short of the focus because the payload
	 *  already carries them (see pathsToThomasFor). */
	/** The focus's own blurb is NOT baked into the chain — the chain stops one short of them — but the
	 *  payload already carries their full record, so it is read from there and the same
	 *  `notable_blurb ?? bio_blurb` order applies. They have no chain-spouse by definition: the ladder
	 *  ends at them, so there is no next marriage for the descent to pass through. */
	type Rung = PersonCompact & { bl?: string };
	/** Married-in: the chain is the PARTNER's and already ends on them, so the focus is not appended —
	 *  they are rendered beside that last rung instead (see `.rung-spouse`). */

	/**
	 * THE LADDER FITS THE WINDOW, and it has to compute that itself.
	 *
	 * `--stage-u` shrinks the rungs with the stage, and measured, that is NOT enough: the tallest ladder
	 * in the corpus is 15 rows (Arcangelo Albetta), and at 1280x720 those 15 rungs plus the header ran
	 * from y −34 to y 754 — off the top of the window and past the bottom of it. A ladder is a different
	 * shape from a stage; a stage gets taller slowly and this gets taller a whole row at a time.
	 *
	 * So the fit is a SECOND factor multiplied into the rung geometry, never a scroll: a scrolling ladder
	 * would break the one thing the rows are for, which is being seen arriving into their seats.
	 * Window geometry comes from the stage store rather than from `innerHeight` here — roadmap §2.75's
	 * rule is that one module reads the window and nothing else does.
	 *
	 * (`StageRung` in that store is an unrelated idea — the stage's own size steps. Same word, different
	 * subject.)
	 */
	const RUNG_H = 72.8;
	const RUNG_GAP = 9;
	const HEAD_H = 34;
	const HEAD_GAP = 14;
	const MARGIN = 56; // breathing room top and bottom together
	/**
	 * SIZED FOR THE LONGEST PATH, NOT THE CURRENT ONE — so a switch never resizes anything.
	 *
	 * THE STAGE MUST NOT MOVE WHILE ANYTHING IS FLYING (design §30). On the Thomas ladder, sizing to the
	 * current path meant that switching between routes of different length changed the fit, which changed
	 * every rung's height, which moved the layout under cards mid-flight. Measured on Sarah Knutti, whose
	 * two routes are 10 and 11 rows:
	 *
	 *     t=23    flip translateY −40.5   layout top 805
	 *     t=203   flip translateY −10.5   layout top 754
	 *     t=460   flip translateY   0     layout top 735
	 *
	 * An in-flow element is painted at layout(t) + transform(t), so those two curves composed into the
	 * ideal path PLUS §30's error term. Net travel was 8.5px — the residue of a 70px layout slide against
	 * a 40px transform — and the residue wobbled: peak per-frame movement 6.4x the mean. That is the
	 * "jerky flick" Sam saw, and easing the fit had made it worse rather than better, because before that
	 * the layout at least settled in one frame.
	 *
	 * Taking the MAXIMUM over every path fixes it at the source instead of correcting for it. The ladder
	 * is sized once per person, for their worst case, so a switch changes the row COUNT and nothing else:
	 * the layout settles in a single frame and flip is the only thing moving. A shorter path renders
	 * fractionally smaller than it strictly needs to, which is invisible because it never changes.
	 */
	/** The tallest this person's ladder ever gets — the row count of their longest path. Both the fit
	 *  and the container's reserved height are computed from it, so neither changes on a switch. */
	/**
	 * THE TALLER ARM PLUS THE APEX. A V is two columns, so what has to fit is the LONGER of them and the
	 * shared ancestor above — not the total, which is roughly twice as tall and is what made a single
	 * column impossible here. Measured over the eligible corpus the longest arm is 12 rungs.
	 */
	const maxRows = $derived(Math.max(leftRungs.length, rightRungs.length) + 1);
	const fit = $derived.by(() => {
		const n = maxRows;
		if (!n) return 1;
		const needed = (n * RUNG_H + (n - 1) * RUNG_GAP + HEAD_H + HEAD_GAP) * stage.u;
		const room = stage.vh - MARGIN;
		return Math.min(1, room / needed);
	});

	// ── THE ONE CLOCK ───────────────────────────────────────────────────────────────────────────────
	// A BASEBALL CARD, NOT A HUMMINGBIRD. Sam on the first pass: "you have the entrance transition like
	// hummingbird wings i want these to feel more like baseball cards that slide in like physical objects
	// with heft that overshoot a little to the left because of their weight before settling into place."
	// Every number below moved in the same direction — slower travel, wider spacing between neighbours,
	// and nearly twice the overshoot, because heft is read from how long a thing takes to STOP.
	/**
	 * 519ms — the 560 it settled at, 8% quicker (Sam). Design §17.1 is the reason this is the right dial
	 * to move: PERCEIVED WEIGHT IS VELOCITY, NOT DURATION. A card that travels the same distance in less
	 * time is read as heavier and more purposeful, not as hurried — hurried is what happens when the
	 * SPACING between cards collapses, which is what "hummingbird wings" was and why STAGGER is untouched
	 * here. The 1.6 px/ms ceiling that binds card flights is far above anything a 519ms rung reaches.
	 */
	const ROW_MS = 519; // one card's travel (560 → −8%)
	const STAGGER = 85; // between neighbours (was 55) — separation is what stops it reading as a blur
	const TRAVEL_VW = 62; // starts off the right edge; a SHARE of the window, not px (design §42.6)
	const OVERSHOOT = 14; // px PAST the seat, to the left — the weight carrying through (was 7)
	/**
	 * CLOSING IS NOT A SWITCH, and it must not borrow the switch's schedule.
	 *
	 * On a switch the stagger is the point — the reader is being shown which cards left so they can see
	 * which stayed. On a close nobody is comparing anything; they have already decided to leave. At the
	 * switch's 85ms spacing the top rung of a twelve-rung ladder would not begin moving until 935ms and
	 * the last card would still be travelling at 1375ms, while the veil is back to full light at 200ms —
	 * so the cards would sweep across a page that had already returned to normal.
	 *
	 * A tight cascade instead: ~600ms end to end, which reads as one sweep rather than twelve departures.
	 */
	const CLOSE_STAGGER = 26;
	const CLOSE_MS = 300;

	/**
	 * THE FADE OUT LASTS EXACTLY AS LONG AS THE CARDS ARE STILL LEAVING — derived, not a constant.
	 *
	 * A flat 200ms was quick, which is right ("the user is ready to move on and not linger"), but it
	 * finished while eleven cards were still crossing a page that had returned to full opacity. Sam:
	 * "the paths cards on top of the full 100% opacity normal UX view is not ok." The veil is what those
	 * cards are travelling over, so its clock is the exit's clock: the last rung's delay plus its run.
	 *
	 * That is a different rule from the ENTRANCE, deliberately. Going in, the veil finishes early and the
	 * ladder keeps building — a room can be lit before everything in it has arrived. Coming out, nothing
	 * may outlast the ground it stands on.
	 */
	// THE TAIL IS NOT PADDING. A transition ENDS when its transform reaches full travel, and the card is
	// still crossing its final pixels for a few frames after that — measured without it, the veil cleared
	// 74ms before the last card was actually off-screen, which is the exact artefact this rule exists to
	// prevent, just smaller.
	/**
	 * IT WAITS FOR THE LAST CARD TO BE MOVING, THEN GOES QUICKLY — a delay, not a longer fade.
	 *
	 * Stretching the fade to cover the whole exit made it slow again, which is the thing it was shortened
	 * to avoid. Sam's shape is better: "the backdrop fade duration can be quick like you have it but only
	 * start when all cards exiting left are in motion." So the veil holds at full strength while the
	 * cascade launches, and only begins clearing once nothing is left standing still on it.
	 */
	/** +50 past the last card's launch: the cascade is not only started but visibly under way before the
	 *  ground begins to go. */
	const VEIL_HOLD = 50;
	/**
	 * THE ROWS BOX RESERVES ITS TALLEST HEIGHT, so the header never moves.
	 *
	 * `.ladder` is a centred column of {header, rows}. With an auto-height rows box, dropping a rung made
	 * the box shorter IN LAYOUT, instantly, while the rungs themselves were still being animated by flip
	 * — so the whole column re-centred in one frame and the title jumped, leaving a gap above a #1 that
	 * had not moved yet. Sam: "Paths To Thomas … instantly jumps up to higher position with huge gap
	 * between title and #1 before #1 actually slides up."
	 *
	 * It is design §30 once more, on the last piece of this component still free to move: an in-flow
	 * element painted at layout(t) + transform(t), where the layout stepped and the transform eased.
	 * Reserving the maximum removes the step at the source — the box is the same size on every path, the
	 * header has nothing to react to, and a shorter path simply centres its rows inside a box already
	 * the right size.
	 */
	const rowsHeight = $derived(
		maxRows ? (maxRows * RUNG_H + (maxRows - 1) * RUNG_GAP) * stage.u * fit : 0
	);

	const veilOutDelay = $derived(seqTotal ? (seqTotal - 1) * CLOSE_STAGGER + VEIL_HOLD : VEIL_HOLD);
	/** How long the ladder takes to build itself — the last rung's delay plus its travel. The header
	 *  waits this out; the veil deliberately does not (a room may be lit before it is furnished). */
	const buildMs = $derived(seqTotal ? (seqTotal - 1) * STAGGER + ROW_MS : ROW_MS);
	const VEIL_OUT_MS = 260;
	/**
	 * THE VEIL HAS ITS OWN SHORT CLOCK AGAIN — and this REPLACES the rule it used to follow.
	 *
	 * It was derived from the row count, so the room finished darkening exactly as the last card
	 * landed. That was Sam's earlier ask and it is now reversed: "the color fade in should not end when
	 * cards are settled anymore its too slow and its distracting". On a twelve-rung ladder that meant a
	 * one-second fade, and a ground still changing under cards that had already arrived reads as the
	 * page loading rather than as a room being entered.
	 *
	 * OUT IS QUICKER THAN IN, which needs `in:`/`out:` rather than one `transition:` (a single directive
	 * plays the same duration both ways). Leaving should not be watched: the reader has already decided
	 * to go, so the room comes back to light faster than it went dark.
	 */
	/**
	 * QUICKER THAN THE LADDER'S (Sam: "you don't have to be silly about it, like hushed tones while
	 * backdrop blur fades in like its the point of my project").
	 *
	 * 340 is right for Paths to Thomas, where the room darkens while a ladder BUILDS itself over a
	 * second or more, so the ground has something to keep pace with. Here the next thing is an empty
	 * search box: there is nothing to wait for, and a ceremonial fade in front of a text field asks the
	 * reader to admire the door on the way through it. 230 still reads as an arrival rather than a cut,
	 * which is the only thing the fade has to buy.
	 */
	const VEIL_IN_MS = 230;

	/**
	 * A ROW ARRIVING. Travel from off the right edge, decelerating, ~7px PAST the seat, then settle
	 * back — design §22's weight physics, which the deck already speaks.
	 *
	 * THE OVERSHOOT IS A FIXED DISTANCE AND THE CURVE IS HAND-WRITTEN FOR THAT REASON. A `backOut`
	 * easing would have been one word, but its overshoot is a PROPORTION of the travel: over 55vw that
	 * is ~79px on a 1440 screen, which is not "a little bit of overshoot", it is a bounce. Two segments
	 * — approach to −OVERSHOOT, then settle to 0 — give the same 7px whatever the distance.
	 *
	 * `easing: linear` is deliberate and load-bearing: easing is applied BEFORE the css callback sees
	 * `t` (design §38.2), so any easing here would be composed with the curve below and neither would
	 * be the shape it claims.
	 */
	function arrive(node: Element, { i, n }: { i: number; n: number }) {
		// Measured for the same reason `depart` is: the card must START fully off the right edge.
		const r = (node as HTMLElement).getBoundingClientRect();
		// On the first open the ladder always deals from the right; on a switch it follows the tabs.
		// ALWAYS FROM THE RIGHT. The Thomas ladder deals from either side because its tabs move you
		// along a ROW of paths; this feature shows one path and has no tabs, so there is no second
		// direction to come from.
		const dir = 1;
		const off =
			dir > 0
				? Math.max((TRAVEL_VW / 100) * window.innerWidth, window.innerWidth - r.left + 24)
				: Math.max((TRAVEL_VW / 100) * window.innerWidth, r.right + 24);
		const start = dir * off;
		const over = -dir * OVERSHOOT; // past the seat, in the direction of travel (§17.2)
		return {
			// ON OPEN, bottom-first: the LAST row leaves the gate immediately and the top row waits
			// longest. ON A PATH SWITCH the arrivals are scattered through the list rather than being the
			// whole of it, so they wait out the leavers first and then come in on a tighter stagger —
			// the point of the pause is that the reader can tell who STAYED.
			// NEVER NEGATIVE. A negative delay tells Svelte the intro is already partly elapsed, so `t`
			// starts above 0 — and if the element is then removed, the outro's remaining time is computed
			// as `duration * (1 - t)` and can come out BELOW ZERO, which WAAPI rejects outright
			// ("duration must be non-negative"). It surfaced on the V, whose cards carry a sequence
			// position rather than a row index, so an off-by-one in that arithmetic reaches this line
			// instead of being absorbed. Clamping here makes the whole family safe rather than the one
			// caller that exposed it.
			// NEVER NEGATIVE: a negative delay tells Svelte the intro is already part-elapsed, so `t`
			// starts above 0 — and if the element is then removed, the outro's remaining time comes out
			// below zero and WAAPI rejects it outright.
			delay: Math.max(0, (n - 1 - i) * STAGGER),
			duration: ROW_MS,
			easing: linear,
			css: (t: number) => {
				// A LONGER BRAKE THAN BEFORE (0.72, was 0.78). The last quarter of the clock is the card
				// coming to rest, and that tail is where weight is actually read — a fast approach with a
				// fast stop reads as a flick however far it travelled.
				const APPROACH = 0.72;
				let x: number;
				if (t < APPROACH) {
					const k = 1 - Math.pow(1 - t / APPROACH, 3); // cubic-out over the approach
					x = start + (over - start) * k;
				} else {
					const k = 1 - Math.pow(1 - (t - APPROACH) / (1 - APPROACH), 3);
					x = over * (1 - k);
				}
				// Ink resolves early — a row that is still travelling should already be readable, the way
				// the Ascension's card is opaque the moment it can be seen at all (§38.3).
				return `transform: translateX(${x.toFixed(2)}px); opacity: ${Math.min(1, t / 0.3)};`;
			}
		};
	}

	/**
	 * A CARD LEAVING GOES OUT THE LEFT, and it needs its own function for that.
	 *
	 * A Svelte `transition:` plays its intro BACKWARDS on the way out, which would have sent every
	 * departing card back out the right edge it arrived from — a card retracing its own entrance, which
	 * reads as an undo rather than as a departure. Sam: "the cards do enter from the right browser edge
	 * but they exit out the left browser edge." So `in:` and `out:` are separate, and the ladder has a
	 * DIRECTION: everything moves right-to-left through it, the way a hand of cards is dealt away.
	 *
	 * It accelerates (the mirror of the arrival's brake) because a thing being taken away does not need
	 * to be watched all the way out — design §22's weight physics, which the deck already speaks.
	 */
	function depart(node: Element, { i, n }: { i: number; n: number }) {
		// PIN THE SEAT before anything moves. The element is already out of the flow by the time this
		// runs, so without this it reports y = 0 and every leaver departs from the top of the ladder.
		const el = node as HTMLElement;
		const seat = seatY.get(el.dataset.rid ?? '');
		if (seat) {
			/**
			 * FIXED, IN VIEWPORT COORDINATES — not absolute inside `.ladder-rows`.
			 *
			 * The seat was recorded as an offset from the container and pinned back the same way, which
			 * is only right if the container has not moved. It moves on every switch between paths of
			 * different length: one fewer row is a shorter block, and `.ladder` CENTRES, so the whole
			 * thing slides half a row. Every leaver was therefore pinned half a row from where it had
			 * actually been — measured on Sarah Knutti, Aurelia sat 29px into Thomas Hooker Sr.'s card
			 * and the two overlapped from the first frame. Sam saw it as "#9 covers up #8 before she
			 * departs", and it read as a timing fault because it appeared the instant the list changed.
			 *
			 * Viewport coordinates have no such dependency: a departing card is leaving the layout, so it
			 * should not be positioned by a box that is still rearranging itself.
			 */
			el.style.position = 'fixed';
			el.style.top = `${seat.top}px`;
			el.style.left = `${seat.left}px`;
			el.style.width = `${seat.width}px`;
			/**
			 * AND THE HEIGHT, from the same snapshot. `flex: none` on `.rung` stops the squash at source,
			 * so this is a second net rather than the fix — but it is the RIGHT second net, because the
			 * inline height a leaver carries was written by Svelte from a measurement taken mid-relayout,
			 * and the seat is the one measurement taken before anything moved at all.
			 */
			el.style.height = `${seat.height}px`;
		}
		// MEASURED, NOT A FRACTION OF THE WINDOW. `0.62 * innerWidth` was 893px at 1440 while the card's
		// own right edge sits at 970 — so every leaver stopped 77px short and vanished still on screen.
		// Reading the rect makes the card clear the edge at any window size, which is the same lesson
		// design §42.6 records about the sprite field being sized in pixels.
		// A CLOSE always sweeps left. A SWITCH leaves the way the incoming set is NOT coming from, so the
		// two sets never cross and the ladder reads as one row of paths sliding past a window.
		// ALWAYS LEFT. On the Thomas ladder a card can leave because a path SWITCH replaced it, and then
		// it exits away from the side the replacements are arriving from. Here the only thing that
		// removes a card is the close, so the whole diagram always sweeps the same way.
		const outDir = -1;
		const box = el.getBoundingClientRect();
		const travel = outDir < 0 ? box.right + 24 : window.innerWidth - box.left + 24;
		return {
			// ON A SWITCH, staggered to match the entry — bottom-first on the same 85ms spacing. They used
			// to leave as one block, which read as the list being wiped rather than as objects departing.
			// ON A CLOSE, the tight cascade above.
			// EVERYTHING IS LEAVING, so a card's position in the order already IS its rank — and here that
			// order is the ROW rather than the arrival sequence, so a left card and its right-hand partner
			// go together (see `atRow`).
			delay: Math.max(0, (n - 1 - i) * CLOSE_STAGGER),
			duration: CLOSE_MS,
			easing: linear,
			css: (t: number, u: number) => {
				const k = u * u * u; // cubic-IN on the way out
				return `transform: translateX(${(outDir * travel * k).toFixed(2)}px); opacity: ${Math.min(1, t / 0.25)};`;
			}
		};
	}

	/** The veil: alpha and blur on ONE `t`, because an element's opacity does not scale the result of
	 *  its own backdrop-filter — filmed, and the blur arrived at frame 1 while the dark was a fifth in. */
	/**
	 * THE PICKER'S ARRIVAL — SearchModal's `panel()`, copied verbatim rather than invented.
	 *
	 * Its reasoning is that file's and still holds: the veil had a 340ms smoothstep and the panel had
	 * nothing, so the ground faded up softly under a box that had already snapped into place — "two
	 * elements of one gesture cannot be on different clocks; one of them being on NO clock is the worst
	 * version of that". A short drop rather than a scale, because this is a sheet arriving over the
	 * tree; 8px says "this came from somewhere" without competing with the flight a pick will start;
	 * cubicOut so it decelerates into place (§17.1, weight is velocity).
	 *
	 * Copied and not imported, per the split — the VALUES are shared so the two surfaces feel like one
	 * app, the MECHANISM is not, so tuning this one can never move the other.
	 */
	function panelIn(_node: Element, { duration, delay = 0 }: { duration: number; delay?: number }) {
		return {
			delay,
			duration,
			easing: cubicOut,
			css: (t: number) => `opacity: ${t}; transform: translateY(${((1 - t) * -8).toFixed(2)}px);`
		};
	}

	const VEIL_BLUR = 10;
	function veil(_node: Element, { duration, delay = 0 }: { duration: number; delay?: number }) {
		return {
			delay,
			duration,
			easing: linear,
			css: (t: number) => {
				/**
				 * SMOOTHSTEP — slow at both ends. It was chosen when this clock ran a full second and had
				 * to stay level with a building ladder; at 340ms the reason is simpler and still holds,
				 * which is that an ease-out front-loads and a ground that snaps most of the way in the
				 * first third reads as a flash rather than as a fade.
				 */
				const e = t * t * (3 - 2 * t);
				return `opacity: ${e}; backdrop-filter: blur(${(VEIL_BLUR * e).toFixed(2)}px); -webkit-backdrop-filter: blur(${(VEIL_BLUR * e).toFixed(2)}px);`;
			}
		};
	}

	/**
	 * CLOSING SNAPSHOTS THE SEATS AND NOTHING ELSE.
	 *
	 * It used to also PIN `.ladder-rows` itself to the viewport, because leavers were positioned inside
	 * that box and it collapsed the moment they all went out of flow — the whole ladder dropped a third
	 * of a page before it left. Two later changes retired that: every leaver is now pinned in viewport
	 * coordinates rather than container coordinates, and the box reserves the height of the longest path
	 * instead of sizing to its contents. Neither depends on the other holding still any more, so the
	 * freeze was doing nothing. Measured after removing it: 0px drift on both a descendant ladder and a
	 * paired one.
	 */
	function requestClose() {
		closing = true;
		snapshotSeats();
		/**
		 * CONNECT-TO-ANYONE FORGETS EVERYTHING ON THE WAY OUT (Sam: "when i exit out of 'Connect to
		 * anyone' all fields reset to default empty. the user will have to re-enter their choice, we
		 * don't leave it set to the old one if they exit the functionality and return").
		 *
		 * Deliberately the OPPOSITE of the search modal, whose whole reason for keeping its query is that
		 * you browse with it — pick Hartford Founders, click someone, come back, and the twelve are still
		 * there (search.svelte.ts's own note). A path is not browsing: it is one question about two
		 * specific people, and reopening onto a stale far end would answer a question nobody asked, on a
		 * card that may not even be the one it was asked from.
		 */
		closeModal();
		// The next visit starts clean; the leavers keep their data until they have finished leaving.
		scheduleWipe();
	}

	/**
	 * ESCAPE, ONCE, WHEREVER THE CURSOR IS (Sam: "esc while this is open and cursor is anywhere should
	 * clear input box and search results to default blank").
	 *
	 * This is the WINDOW handler, and it has to own the whole rule rather than half of it. The input had
	 * its own two-stage Escape, but the window handler ran afterwards and closed anyway — so a first
	 * Escape on a full box cleared the query AND dismissed the modal in one press, which is neither
	 * stage. One owner, and the field's handler now defers to it.
	 *
	 * Stage one clears the query and the rows; stage two leaves. On the ANSWER there is nothing to
	 * clear, so Escape simply closes — a V is not a query you are refining.
	 */
	function onKeydown(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') {
			e.stopPropagation();
			e.preventDefault();
			if (!chosen && (search.text || search.rows.length)) clearSearch();
			else requestClose();
		}
	}

	let ladderEl = $state<HTMLDivElement | null>(null);
	$effect(() => {
		if (open && ladderEl) ladderEl.focus();
	});

	/**
	 * THE HOVER ZOOM — FeaturedCard's mechanism, not a second one.
	 *
	 * Sam: "you'll see that when the main photo and the ART/STATUE/LANDMARK images are hovered over by
	 * the user, a large image shows up in the center and creates shadow effect from the left side drop
	 * shadow. lets replicate that on Paths to Thomas."
	 *
	 * Three things carry over verbatim because they are the reasons that popout works:
	 *   - it REUSES THE ALREADY-LOADED src, so there is no network request and no first-hover lag;
	 *   - it is sized to 200% of the displayed width at the image's NATURAL aspect, so a tall portrait
	 *     shows whole instead of being cropped to the midriff the way the object-cover thumbnail is;
	 *   - it is PORTALLED TO <body>, because every ancestor here (`.rung` has `overflow: hidden`, and
	 *     the cards are mid-flight for the first second) would otherwise clip it.
	 *
	 * WHERE IT LANDS: right of the hovered photo, ANCHORED TO THAT CARD — not in one fixed place for the
	 * whole ladder. A first pass centred it on the window, which was wrong in a way worth naming: with
	 * twelve rungs the enlargement always appeared in the same spot regardless of which face was under
	 * the cursor, so it read as a lightbox rather than as that person's photo opening. FeaturedCard pins
	 * to its photo's right edge and RightColumn to its thumbnail's left; both belong to the thing they
	 * enlarge, and so does this.
	 *
	 * AND IT MOVES WITH THE CURSOR, amplified 1.5x around the photo's own centre — RightColumn's factor,
	 * unchanged. Vertical only; the horizontal stays pinned so the box never drifts side to side. It is
	 * `pointer-events: none`, so the rung underneath keeps the hover and the zoom cannot flicker itself
	 * out of existence.
	 */
	let zoom = $state<{
		src: string;
		alt: string;
		w: number;
		h: number;
		ax: number;
		/** Pixels off the window's vertical centre — NOT a y coordinate. See the note in trackZoom. */
		dy: number;
	} | null>(null);
	/** Walked on pixels: FeaturedCard's 33, +25, −15, −10. Back at 33, which is where that file started —
	 *  worth noting rather than quietly rediscovering, because it says the original offset was right. */
	/**
	 * THE ONE CARD THAT KEEPS ITS RAINBOW — a LIST OF ONE, which is the house's form for this.
	 *
	 * Sam: "on Thomas Ruggles Pynchon Jr. when Connect to Thomas is clicked, can he keep his rainbow
	 * background instead of the mint green? one singleton exception. nowhere else." So it is an id and
	 * not a predicate: `isPynchonKin` holds 24 people and TWO of them can appear as a paired card
	 * (X03232 and X01014, Mary Smith Lord Hooker), so using it would have made two exceptions out of a
	 * request for one. Design §35.7 records the same call on the line-anchor overrides — "a list, never
	 * a rule… add a row with a sentence saying why; do not generalise it."
	 *
	 * The RUNGS deliberately do not take it. They carried `class:prism` for a while and it did nothing:
	 * PersonBox's `.person-box.prism` rule is Svelte-SCOPED to that component, so the class never
	 * matched anything here. Removed rather than made to work — Sam's "nowhere else" is the answer to
	 * whether it should have.
	 */

	const ZOFFSET = 33;
	/** FeaturedCard follows the cursor 1:1; this is that plus the 20% Sam asked for. */
	const AMPLIFY = 1.2;

	function trackZoom(e: MouseEvent) {
		const img = e.currentTarget as HTMLImageElement;
		if (!img?.src) return;
		const r = img.getBoundingClientRect();
		const ar = img.naturalWidth ? img.naturalHeight / img.naturalWidth : 1;
		// A rung's photo is small, so 200% of it is still a thumbnail — this opens to a share of the
		// window instead, then obeys the same 60%/90% ceiling FeaturedCard uses.
		let w = Math.max(r.width * 2, window.innerWidth * 0.26);
		let h = w * ar;
		// THE HEIGHT CEILING IS 0.66, NOT FeaturedCard's 0.9, AND THAT IS THE TRACKING'S DOING.
		// A box 90% of the window tall can only be positioned across the remaining 10%, so the on-screen
		// clamp swallows the whole gesture: measured at 0.9, rungs near the top and bottom of a
		// twelve-rung ladder moved 0px however far the cursor travelled, and only the middle of the
		// ladder had any travel at all. FeaturedCard can afford 0.9 because it has ONE photo, sitting
		// mid-card; a ladder spreads its photos down 800px, so most of them live where the clamp bites.
		// 0.66 leaves roughly 300px of room to move in, and 594px is still nine times the rung's own
		// thumbnail — the enlargement loses nothing that matters.
		const k = Math.min(1, (window.innerWidth * 0.6) / w, (window.innerHeight * 0.66) / h);
		w *= k;
		h *= k;
		/**
		 * CENTRED, WITH A MODEST SWING AROUND THAT CENTRE.
		 *
		 * Two wrong models came first and both are worth naming. Centring the box ON THE CURSOR is what
		 * FeaturedCard does, and it cannot work down a tall list: for a rung near either end the box lands
		 * mostly off-screen and the clamp pins it, so those rungs measured 0px of travel. Mapping the
		 * cursor's fraction across the whole remaining window fixed that and overshot badly — a 29px
		 * cursor move threw the picture 190px, roughly 6x, which Sam called too extreme.
		 *
		 * So the box RESTS centred in the window, and the cursor's distance from the photo's own middle
		 * displaces it by 1.2x — FeaturedCard's 1:1 follow plus the "20% wider vertical swings" Sam asked
		 * for. The photo is ~61px tall, so the whole swing is about +/-37px: clearly alive under the hand,
		 * never a flick, and identical for the top rung and the bottom one because the rest position no
		 * longer depends on where the card sits.
		 */
		const pivot = r.top + r.height / 2;
		const offset = (e.clientY - pivot) * AMPLIFY;
		/**
		 * EVERY ENLARGEMENT OPENS IN ONE PLACE — the ladder's own photo column.
		 *
		 * The rung photos all share a left edge, so anchoring to `r.right` put every rung's popout at the
		 * same x for free. The SPOUSE photo does not: it sits 343px further right, at the end of the
		 * paired row, so its popout opened well clear of the others and read as a different mechanism.
		 * Anchoring to the first rung's photo instead makes the column the anchor rather than the
		 * individual image, which is what the eye was already reading it as.
		 */
		const col = document.querySelector('.rung .rung-photo');
		const ax = col ? col.getBoundingClientRect().right : r.right;
		zoom = {
			src: img.src,
			alt: img.alt || '',
			w,
			h,
			ax,
			dy: offset
		};
	}
	const closeZoom = () => (zoom = null);

	/** Fixed horizontal at the photo's right edge + ZOFFSET, so the box never drifts sideways as the
	 *  mouse moves. Vertical is `t` read across the room the window has left, so the ends of that range
	 *  are reachable from any rung — see the note in trackZoom. */
	function zoomStyle(z: { w: number; h: number; ax: number; dy: number }): string {
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const left = Math.max(8, Math.min(z.ax + ZOFFSET, vw - z.w - 8));
		const top = Math.max(8, Math.min((vh - z.h) / 2 + z.dy, vh - z.h - 8));
		return `left:${left}px; top:${top}px; width:${z.w}px; height:${z.h}px;`;
	}

	/** Portal to <body> so no ancestor's clip or overflow can reach it. Client-only: the `{#if zoom}` is
	 *  false during SSR and actions never run on the server. */
	function portalZoom(node: HTMLElement) {
		document.body.appendChild(node);
		return { destroy: () => node.remove() };
	}

	/**
	 * CLICKING A RUNG — THE STAGE DOES THE FLIGHT, NOT THE MODAL.
	 *
	 * Sam chose this shape: the ladder is a way of CHOOSING, and once chosen the app performs the move it
	 * would have performed anyway. So there is no bespoke transition bridging the two views — the modal
	 * closes with its own exit, the stage is revealed intact, and only then does the ordinary flight run.
	 *
	 * WHICH flight is decided by generation, and this is the one place the ladder's own arithmetic pays
	 * off: every rung is a lineal ancestor or descendant of the hero, so the move is ALWAYS vertical and
	 * the laterality question that bites cross-connections cannot arise here.
	 *
	 *     delta = clicked.g − hero.g      (g is 1-based; Thomas is 1)
	 *       −1   the hero's parent   →  the ordinary promotion, arriving from above
	 *       +1   the hero's child    →  the ordinary demotion, arriving from below
	 *     ≤ −2   the deck, gen-delta negative — vertical, from above
	 *     ≥ +2   the deck, gen-delta positive — vertical, from below
	 *        0   cannot occur: a chain holds one person per generation
	 *
	 * AND IT REUSES `warmPersonLinks` RATHER THAN CALLING flight.ts ITSELF. Every navigation in the app
	 * is driven off a clicked anchor's attributes, and re-implementing that here would mean duplicating
	 * the flight lock, the tier span, the tier-open height test, the pivot and the rect snapshot — the
	 * parallel-mechanism mistake CLAUDE.md warns about. For a ±1 move the REAL on-stage chip is clicked,
	 * so the promotion grows from the seat it always grows from; for a ±2 move there is no chip on stage
	 * (that person is not a neighbour), so a correctly-attributed anchor is synthesised at the card's own
	 * rect and clicked. Either way the one delegated handler does the work.
	 */
	/**
	 * NO WAIT — the flight begins in the same frame as the click, and this REPLACES the rule above it.
	 *
	 * It used to be deferred until the whole close had played, so the ladder cleared and only then did the
	 * card move. Sam's call is better: "can the transition start immediately on click, no delay, so its
	 * even moving under the few milliseconds of backdrop blur?" The two gestures now overlap — the cards
	 * sweep left and the veil lifts while, underneath, the promotion is already running — so what the
	 * reader uncovers is a stage in motion rather than one waiting to start.
	 *
	 * It is also the safer order for the ±1 case, not merely the nicer one: the on-stage chip is clicked
	 * while the ladder still covers it, so its rect is read before anything the close does can disturb
	 * the layout underneath.
	 */

	function rungNav(p: Rung, e: MouseEvent) {
		if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // let the browser have it
		e.preventDefault();
		const slug = p.slug;
		if (!slug || p.id === focus?.id) {
			requestClose();
			return;
		}

		/**
		 * ON A MARRIED-IN LADDER THE REFERENCE IS THE PARTNER, NOT THE FOCUS.
		 *
		 * A married-in person has no `generation_from_thomas` — they are not on the line — so measuring
		 * against them yields null for every rung and every click would fall to the deck with no
		 * direction. The ladder is the PARTNER's, and the partner stands where the focus stands, so their
		 * generation is the honest reference: a rung two above the partner is two above the reader.
		 *
		 * And the partner's OWN rung is a spouse swap, not a promotion. They are the person on the other
		 * half of this card's notch, which the app already has a gesture for — "a brisk in-corner swap"
		 * — so it is asked for by name rather than approximated with a generation of 0.
		 */
		// The reference is always the focus here: a V's rungs are measured against the person whose card
		// this modal was opened from, which is the same person the sentence names first.
		const isPartner = false;
		const refG = focus?.g ?? null;
		const delta = !isPartner && refG != null && p.g != null ? p.g - refG : null;
		requestClose();

		{
			const stage = document.querySelector('.page-container') ?? document.body;
			// The partner is a spouse chip in the card's own notch — the app's briskest navigation, and it
			// is right here for the same reason the ±1 case is: the chip is on stage, so click the real one.
			// ±1 — the person IS on stage, as a parent chip or in the children row. Click the real one.
			if (isPartner || delta === -1 || delta === 1) {
				const onStage = stage.querySelector<HTMLElement>(`a[href="/person/${slug}"]`);
				if (onStage) {
					onStage.click();
					return;
				}
			}
			// Otherwise a teleport. A card at that distance has no seat on this stage, so the anchor is
			// made rather than found — carrying `relation_class: 'direct'`, which is true by construction
			// here and is what makes isVerticalMove() answer on the gen-delta alone.
			const card = document.querySelector('.featured-card');
			const r = (card ?? stage).getBoundingClientRect();
			const a = document.createElement('a');
			a.href = `/person/${slug}`;
			a.dataset.cc = 'true';
			a.dataset.relationClass = 'direct';
			// `if (delta)` EXCLUDES 0 AS WELL AS NULL, and that is deliberate. A chain should never hold two
			// people at one generation, but 53 of 2165 do — every one of them downstream of the canonical
			// defects already catalogued (the inverted parent links, the missing `hd` flags, the Ingersoll
			// merge). `isVerticalMove` reads 0 as LATERAL, so passing it through would send a lineal move
			// sideways on exactly the entries whose data is least trustworthy. Omitting the attribute says
			// "direction unknown", which is the truth.
			if (delta) a.dataset.genDelta = String(delta);
			a.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;opacity:0;pointer-events:none;`;
			stage.appendChild(a);
			a.click();
			a.remove();
		}
	}

	/**
	 * TYPE THAT FITS, ROW BY ROW — the card's own `shrinkToFit`, not an ellipsis.
	 *
	 * A PAIRED rung is only 76% of the column, and at that width a name like "Martha Newton Whittlesey"
	 * ran out of room and truncated mid-word beside its own years. Sam's shape: **no blurb, drop the
	 * years to a second line so the name has the whole of the first; a blurb, clamp both rows to fit.**
	 *
	 * Applied to EVERY rung rather than only the narrow ones. A chip already shrinks independently of its
	 * neighbours all over this app, so ragged sizes down a column is the house's normal look rather than
	 * a new one — and a rule that only engages on the paired row would leave the ordinary rows truncating
	 * for exactly the same reason, just less often.
	 *
	 * The action writes `fontSize` on the LINE, so the spans inside are sized in `em` against it.
	 */
	const tt = (px: number) => px * stage.k * fit;


	/**
	 * THE SPOUSE CARD IS SET AT THE ORDINARY RUNG SIZE — `tt(14.3)`, the same ceiling every other card
	 * on the ladder uses. It is not derived from anything.
	 *
	 * TRIED AND REVERTED (August 26–27): capping the spouse at the PARTNER's settled size, measured
	 * back out of the DOM after shrinkToFit had run. The reasoning was that the pair reads as two type
	 * scales on one row. The reasoning was wrong, because the partner is the one card on the ladder
	 * that is guaranteed to be shrunk — it is cut to 76% to make room for this card — so pinning the
	 * spouse to it made the spouse the SMALLEST text in the modal instead of the largest, and the pair
	 * read as two type scales in the other direction. Sam: "why is the John Rockefeller and his years
	 * so small? he doesn't have to match his spouse. the idea is that he just matches all of the other
	 * font sizes that aren't his spouse."
	 *
	 * THE RULE THAT REPLACES IT, and it is the simpler one that should have been reached for first:
	 * **the ladder has ONE type ceiling and every card is measured against that, never against a
	 * neighbour.** A card that has to shrink shrinks on its own account. Deriving one card's size from
	 * another's makes the derived card hostage to whatever squeezed the other one.
	 */
	const yearsOf = (p: PersonCompact) =>
		p.pv ? '' : [p.by ?? '', p.dy ? `–${p.dy}` : p.by ? '–' : ''].join('');
</script>

<svelte:window on:keydown={onKeydown} />

<!-- THE PICKER HAS NO ROWS YET, so the old gate would have kept the whole overlay closed on the one
     phase that exists to fill it. A Thomas ladder still requires its rungs; a V requires only that
     someone asked for it. -->

{#snippet rung(
	p: Rung,
	depth: number,
	n: number,
	isApex: boolean,
	tIndex: number = 0,
	mirror = false,
	terse = false,
	outIndex = -1,
	outOf = 1
)}
	<!-- The same anchor, the same `.person-box`, the same line-status classes as the Thomas ladder —
	     so a rung here takes the identical paper, shadow, fill and hover, and the Pynchon prism reaches
	     it for free. Only the geometry class differs, because a V's column is narrower than a ladder. -->
	<a
		href={p.slug ? `/person/${p.slug}` : '#'}
		onclick={(e) => rungNav(p, e)}
		data-rid={p.id}
		class="rung person-box"
		class:apex={isApex}
		class:mirror
		class:hooker-line={p.hd}
		class:spouse-line={p.sp}
		class:ee-line={p.ee}
		in:arrive|global={{ i: num(tIndex, 0), n }}
		out:depart|global={{
			i: num(outIndex, num(tIndex, 0)),
			n: num(outIndex, -1) >= 0 ? num(outOf, n) : n
		}}
	>
		<div class="rung-photo">
			{#if p.p}<img
					src={cldSize(p.p, PHOTO_TRANSFORM)}
					alt=""
					class="object-top"
					loading="eager"
					onmouseenter={trackZoom}
					onmousemove={trackZoom}
					onmouseleave={closeZoom}
				/>{/if}
		</div>
		<!-- THE APEX IS NOT NUMBERED. Every other rung's number is its DEPTH BELOW THE SHARED ANCESTOR
		     (design §44.12's rule, with the apex playing Thomas's part): a per-path position, never the
		     person's stored generation, which is one number per PERSON and disagrees with a route the
		     moment pedigree collapse gives someone two. The apex itself is depth 0 of both arms, so a
		     number there would have to be two numbers. -->
		<div class="rung-gen">{isApex ? '' : depth}</div>
		<div class="rung-body">
			<div
				class="rung-line1"
				use:shrinkToFit={{
					max: tt(14.3),
					min: tt(9.4),
					key: `${p.id}|${stage.u}|${stage.k}|${fit}`
				}}
			>
				<!-- A PAIRED PARTNER IS NAMED SHORT, WITH THE YEARS BENEATH (Sam, on Dorothy Mills: "just do
				     chip.firstname or fall back to firstname, then last name, then suffix, no long display
				     name... and wrap their years onto the second row").
				     `sn` is exactly that form — the chip's own short name — and this is the one rung in the
				     diagram with a person standing beside it, so it is the one with no room for a display name
				     and a date on a single line. Every other rung keeps both, because it has the width. -->
				{#if terse}
					<span data-fit class="inline-block whitespace-nowrap">
						<span class="rung-n">{p.sn ?? p.n}{p.sf ? ` ${p.sf}` : ''}</span>
					</span>
					<span class="rung-y rung-y-below">{yearsOf(p)}</span>
				{:else}
					<span data-fit class="inline-block whitespace-nowrap">
						<span class="rung-n">{p.n}</span><span class="rung-y">{yearsOf(p)}</span>
					</span>
				{/if}
			</div>
			<!-- NO BLURB ON A PAIRED RUNG (Sam: "for the hooker spouse to the right of them, just do
			     name and year, no blurb"). That card is 76% wide with a person standing beside it; a
			     third line there is the one thing the row has no room for. -->
			{#if p.bl && !terse}
				<div
					class="rung-line2"
					use:shrinkToFit={{
						max: tt(11.55),
						min: tt(8.4),
						key: `${p.id}|${stage.u}|${stage.k}|${fit}`
					}}
				>
					<span data-fit class="rung-bl inline-block whitespace-nowrap">{p.bl}</span>
				</div>
			{/if}
		</div>
	</a>
{/snippet}

{#snippet half(p: Rung, right: boolean)}
	<!-- Half of the couple bar. The right half mirrors: text right-aligned, photo on the outside. -->
	<a
		href={p.slug ? `/person/${p.slug}` : '#'}
		onclick={(e) => rungNav(p, e)}
		class="v-half"
		class:right
	>
		{#if !right}
			<div class="rung-photo">
				{#if p.p}<img
						src={cldSize(p.p, PHOTO_TRANSFORM)}
						alt=""
						class="object-top"
						loading="eager"
						onmouseenter={trackZoom}
						onmousemove={trackZoom}
						onmouseleave={closeZoom}
					/>{/if}
			</div>
		{/if}
		<div class="rung-body">
			<div
				class="rung-line1"
				use:shrinkToFit={{
					max: tt(14.3),
					min: tt(9.4),
					key: `${p.id}|${stage.u}|${stage.k}|${fit}`
				}}
			>
				<span data-fit class="inline-block whitespace-nowrap">
					<span class="rung-n">{p.n}</span><span class="rung-y">{yearsOf(p)}</span>
				</span>
			</div>
			{#if p.bl}
				<div
					class="rung-line2"
					use:shrinkToFit={{
						max: tt(11.55),
						min: tt(8.4),
						key: `${p.id}|${stage.u}|${stage.k}|${fit}`
					}}
				>
					<span data-fit class="rung-bl inline-block whitespace-nowrap">{p.bl}</span>
				</div>
			{/if}
		</div>
		{#if right}
			<div class="rung-photo">
				{#if p.p}<img
						src={cldSize(p.p, PHOTO_TRANSFORM)}
						alt=""
						class="object-top"
						loading="eager"
						onmouseenter={trackZoom}
						onmousemove={trackZoom}
						onmouseleave={closeZoom}
					/>{/if}
			</div>
		{/if}
	</a>
{/snippet}

{#snippet spouseCard(
	p: Rung | null,
	onLeft: boolean,
	tIndex: number,
	outIndex: number,
	outOf: number
)}
	{#if p}
		<!-- THE PERSON YOU CHOSE, standing beside the partner whose line the walk actually climbed
		     (design §44.11's shape, mirrored). It hangs off the OUTSIDE edge of its arm — left arm to the
		     left, right arm to the right — because overhanging is what says "attached to that one"
		     rather than "next in the sequence".

		     IT ENTERS FIRST. The sequence reads from the person you are standing on outward, and on a
		     married-in card that person is this one, not their partner.

		     FIRST NAME AND YEARS ONLY (Sam: "just do their chip.firstname or fall back to firstname, no
		     last name, no suffix, to accommodate space"). It is the narrowest card in the diagram and sits
		     directly beside the partner it is named against, so the surname is carried by the card next to
		     it and a suffix has nothing left to disambiguate against. -->
		<a
			href={p.slug ? `/person/${p.slug}` : '#'}
			onclick={(e) => rungNav(p, e)}
			data-rid={p.id}
			class="v-spouse person-box spouse-line"
			class:left={onLeft}
			class:no-photo={!p.p}
			in:arrive|global={{ i: num(tIndex, 0), n: seqTotal }}
			out:depart|global={{ i: num(outIndex, 0), n: num(outOf, seqTotal) }}
		>
			{#if p.p}
				<div class="rung-photo">
					<img
						src={cldSize(p.p, PHOTO_TRANSFORM)}
						alt=""
						class="object-top"
						loading="eager"
						onmouseenter={trackZoom}
						onmousemove={trackZoom}
						onmouseleave={closeZoom}
					/>
				</div>
			{/if}
			<div class="rung-body">
				<div
					class="rung-line1"
					use:shrinkToFit={{
						max: tt(13),
						min: tt(8.2),
						key: `${p.id}|${stage.u}|${stage.k}|${fit}`
					}}
				>
					<span data-fit class="inline-block whitespace-nowrap"
						><span class="rung-n">{casual(p)}</span></span
					>
					<span class="rung-y rung-y-below">{yearsOf(p)}</span>
				</div>
			</div>
		</a>
	{/if}
{/snippet}

{#if open && eligible}
	<!--
		`|global` ON EVERYTHING INSIDE THIS KEY, and the veil is the one that proves why.

		A `transition:` is LOCAL by default — it plays only when its OWN block changes. Adding this
		`{#key}` to kill the previous visit's ghosts put every element one block DEEPER, so on close the
		`{#if open}` leaving is no longer their own block changing, and their outros silently stopped
		running. The cards kept flying because they were already global; the veil was not, so the blur
		cut out in a single frame instead of fading — Sam: "its a fade out of the backdrop blur that
		completes the illusion you are not doing... feels like whole UX jerks a few pixels into place."

		This is design §44.5's finding for the fourth time in this feature, and the shape is always the
		same: a structural change to the markup silently disarms transitions that were working. If a
		wrapper block is ever added here again, every `in:`/`out:` under it needs checking.
	-->
	{#key visit}
		<div
			class="veil"
			role="presentation"
			onclick={(e) => {
				if (e.target === e.currentTarget) requestClose();
			}}
			in:veil|global={{ duration: VEIL_IN_MS }}
			out:veil|global={{ duration: VEIL_OUT_MS, delay: veilOutDelay }}
		></div>

		{#if !chosen}
			<!--
			THE PICKER — this feature's own, and small on purpose.

			It began as the search modal's panel with five opt-out props (`tags`, `filters`, `narrow`,
			`line2`, `placeholder`), which is a component turning into a switchboard and is the same
			mistake as the shared ladder. With the chips, the year range and the tag row all gone (Sam),
			what is left is not a stripped-down search — it is a different object: ONE box, and a list of
			people to choose from.

			It shares the search ENGINE and nothing else. `search.rows` is the same scan, the same fold and
			the same six-tier ranking that answers the search modal, because there is one corpus and one
			right answer to "who did you mean". What it looks like, what it says, and what a click does are
			all this feature's own.
		-->
			<!-- IT ARRIVES, IT DOES NOT APPEAR (Sam: "there's no fade in of the backdrop blur and then the
		     search box, it's just instant. see all other components in this entire project to understand
		     the quick fade in").
		     Nothing in this app cuts to new content — the ladder builds, the veil smoothsteps, the deck
		     deals, the card flies. A surface that snaps in reads as a page loading rather than as a room
		     being entered, and it was the only thing here on NO clock at all, which design §45.10 names
		     as the worst version of two elements disagreeing about one.
		     Opacity plus a short drop: 8px is enough to say "this came from somewhere" without competing
		     with anything, and cubicOut decelerates into place because weight is velocity (§17.1). -->
			<div
				class="picker"
				role="dialog"
				aria-modal="true"
				aria-label="Choose the other person"
				in:panelIn|global={{ duration: 240, delay: 20 }}
				out:panelIn|global={{ duration: 200 }}
			>
				<div class="picker-head">
					<span class="picker-title">Connect {casual(focus)} to…</span>
					<button type="button" class="ladder-x" onclick={requestClose} aria-label="Close">
						<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
							<path
								d="M6 6 L18 18 M18 6 L6 18"
								stroke="currentColor"
								stroke-width="1.6"
								stroke-linecap="round"
							/>
						</svg>
					</button>
				</div>

				<!-- THE WHOLE BOX IS THE TARGET, and a near miss must not be punished. Sam: "you can't just
			     click inside the text box, you have to click on a narrow band in the middle of the
			     placeholder text, otherwise the cursor doesn't take... if you miss, it exits the
			     functionality". Two separate faults in one gesture: only the `<input>` itself took focus,
			     so the box's own padding did nothing; and anything outside it was the scrim, which closes.

			     So the box focuses the input from anywhere inside it, AND it carries an invisible margin
			     of forgiveness — a pointer-events halo wider than the box it protects, which swallows a
			     near miss instead of dismissing the modal. Forgiveness costs nothing; a mis-click that
			     throws away a half-typed query costs the whole interaction. -->
				<div class="picker-box" role="presentation" onclick={() => pickerInput?.focus()}>
					<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
						<path
							fill="currentColor"
							d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
						/>
					</svg>
					<input
						bind:this={pickerInput}
						value={search.text}
						oninput={(e) => setText((e.currentTarget as HTMLInputElement).value)}
						onkeydown={onPickerKey}
						type="text"
						placeholder="Search all Hooker descendants and spouses"
						autocomplete="off"
						spellcheck="false"
					/>
					<!-- CLEARING MUST NOT REQUIRE THE KEYBOARD (Sam: "so i don't have to insert my mouse to get
				     cursor and delete with the delete key letter by letter"). It appears only when there is
				     something to undo — a standing X beside an empty field is a control describing a state
				     that is not happening. -->
					{#if search.text}
						<button
							type="button"
							class="picker-x"
							aria-label="Clear"
							onclick={(e) => {
								e.stopPropagation();
								setText('');
								pickerInput?.focus();
							}}>&times;</button
						>
					{/if}
				</div>

				<!-- NAMES, YEARS AND FACES — and the blurb, which is who they ARE (Sam). The search modal's
			     second line names the FIELD that matched, which is right when you asked a question and the
			     row owes you an answer. Here you are choosing a person, so the row says who they are, the
			     way a rung does two beats later. -->
				<div class="picker-list" bind:this={pickerList}>
					{#each search.rows as r, i (r.id)}
						<button
							type="button"
							class="pick person-box"
							class:on={i === pickerCursor}
							class:hooker-line={(r.f & CAT.HD) !== 0}
							class:spouse-line={(r.f & CAT.SPOUSE) !== 0}
							onmouseenter={() => (pickerCursor = i)}
							onclick={() => (target = r.id)}
						>
							<div class="pick-photo">
								{#if r.ph}<img src={r.ph} alt="" loading="lazy" />{/if}
							</div>
							<span class="pick-star" class:has={r.nb} aria-hidden={!r.nb}>{r.nb ? '★' : ''}</span>
							<span class="pick-text">
								<span class="pick-n">{r.n}</span>
								<span class="pick-y"
									>{r.pv ? 'Living' : r.by || r.dy ? `${r.by ?? '?'}–${r.dy ?? ''}` : ''}</span
								>
							</span></button
						>
					{/each}
				</div>
			</div>
		{:else}
			<div
				bind:this={ladderEl}
				class="ladder"
				style="--ladder-fit: {fit.toFixed(4)}"
				role="dialog"
				aria-modal="true"
				aria-label="Paths to Thomas Hooker"
				tabindex="-1"
			>
				<!-- `|global` IS WHY THE EXIT FADE HAPPENS AT ALL (Sam: "the blue text at top just stays and
		     then immediately jarringly exits"). A `transition:` is LOCAL by default, so it plays only
		     when its OWN block changes — this header sits two blocks inside the `{#if open}`, so on
		     close it never ran and simply survived until the block was torn down, which is after the
		     last card has left. Design §44.5, third occurrence. Paths to Thomas took the same fix.

		     IT ARRIVES LAST, once every card has landed. The title, the path numbers and the X are the
		     room's furniture, and furniture that is already there before the objects arrive says the page
		     merely loaded — Sam: "should not be visible until all cards have entered and settled in the
		     final position. instead this text is just sitting there right away." The delay is the ladder's
		     own build time, so it is right for a three-rung ladder and a fifteen-rung one alike.

		     OUT is a plain fade, not the same wait in reverse: it used to be removed in the frame the
		     modal closed, so the title and tabs blinked out while cards were still travelling. -->
				<!-- The header waits out the ladder's own build so the furniture does not arrive before the
		     objects. There is nothing to wait for on the picker, and a title that faded in a second
		     after the search box would read as the page still loading. -->
				<div
					class="ladder-head"
					class:wide={chosen && !isLineal}
					class:one-col={chosen && isLineal}
					in:fade|global={{ delay: !chosen ? 0 : buildMs, duration: 300 }}
					out:fade|global={{ duration: 220 }}
				>
					<!-- THE TITLE STATES THE ANSWER, not the feature. On the Thomas ladder the answer is the same
				     for everyone and its heading can be a label; here it is a fact about two people that
				     nothing else on screen says in words. The cards show the route; the sentence is what
				     the route MEANS. While the picker is up there is no answer yet, so it names the
				     question instead. -->
					<span class="ladder-title" class:sentence={chosen}>
						{#if !chosen}
							Connect {casual(focus)} to…
						{:else}
							{relation}
						{/if}
					</span>
					<!-- NO PATH TABS. Connect-to-anyone shows ONE route, the shortest (Sam), so there is
				     nothing to page between. -->
					<button type="button" class="ladder-x" onclick={requestClose} aria-label="Close">
						<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
							<path
								d="M6 6 L18 18 M18 6 L6 18"
								stroke="currentColor"
								stroke-width="1.6"
								stroke-linecap="round"
							/>
						</svg>
					</button>
				</div>

				{#if chosen}
					<!-- THE V. Two arms and the shared ancestor above them — the whole reason this is not the
			     Thomas ladder's single column: measured over the eligible corpus the median answer is 15
			     people, which no column on this stage can hold, while the longest ARM is 12 and fits
			     inside the geometry that already ships.
			     Each arm is the same `.rung` the Thomas ladder uses, so paper, shadow, line-status fill
			     and the Pynchon prism all reach it without a word of new styling. -->
					<div class="ladder-v" style="height: {rowsHeight.toFixed(1)}px">
						{#if apexRung}
							<!-- ONE LONG COUPLE BAR ACROSS BOTH COLUMNS (Sam), not a card the width of one arm.
					     The shared ancestor is the top of BOTH descents, so a bar that spans them says so
					     in geometry; a single centred card said "here is a third column".

					     And the pair is the honest unit: a descent passes through a MARRIAGE, not through
					     one person. The spouse is read as the other parent of the first rung below —
					     never "their first wife" — so a man who married three times shows the one this
					     path actually came through. She sits at the far right with her text right-aligned
					     and her photo on the outside, so the bar reads outward from the middle in both
					     directions and the two arms hang from their own parent. -->
							{#if isLineal}
								<!-- A lineal pair: the chosen person IS the shared ancestor, so this is simply the top card
							     of a single column. Same width, same card, no spouse. -->
								<div class="v-apex-single">
									{@render rung(
										apexRung,
										0,
										seqTotal,
										true,
										atSeq(seqApex),
										false,
										false,
										atRow(0),
										outRows
									)}
								</div>
							{:else}
								<!-- THE COUPLE BAR FLIES LIKE EVERY OTHER CARD (Sam: "the LCA is not an exception"). It had
							     no transitions at all, so it appeared with the block and, on the way out, "just sits
							     there and fades out" while the rungs swept off left. It now enters from the right edge on
							     its own turn in the sequence and leaves left with the rest — one gesture, no exemptions. -->
								<div
									class="v-apex person-box"
									data-rid={apexRung.id}
									class:hooker-line={apexRung.hd}
									class:pair={!!apexSpouse}
									in:arrive|global={{ i: atSeq(seqApex), n: seqTotal }}
									out:depart|global={{ i: atSeq(seqApex), n: seqTotal }}
								>
									{@render half(apexRung, false)}
									{#if apexSpouse}
										<div class="v-apex-seam" aria-hidden="true"></div>
										{@render half(apexSpouse, true)}
									{/if}
								</div>
							{/if}
						{/if}
						<div class="v-cols" class:single={isLineal}>
							<!-- THE PAIRED SPOUSE SITS BESIDE THEIR PARTNER, NOT UNDER THEM (Sam) — same row, hanging off
						     the OUTSIDE edge of its own arm, which is the mirror of the Thomas ladder. Appended to the
						     bottom of the column it read as one more generation, which is exactly what a married-in
						     person is not: they stand NEXT TO someone, and the geometry has to say so. -->
							{#if leftRungs.length}
								<div class="v-col">
									{#each leftRungs as p, i (p.id)}
										{#if leftSpouse && i === leftRungs.length - 1}
											<div class="rung-row mirrored">
												{@render spouseCard(
													leftSpouse,
													true,
													atSeq(seqLeft(i)),
													atRow(i + 1),
													outRows
												)}
												{@render rung(
													p,
													i + 1,
													seqTotal,
													false,
													atSeq(seqLeft(i)),
													false,
													true,
													atRow(i + 1),
													outRows
												)}
											</div>
										{:else}
											{@render rung(
												p,
												i + 1,
												seqTotal,
												false,
												atSeq(seqLeft(i)),
												false,
												false,
												atRow(i + 1),
												outRows
											)}
										{/if}
									{/each}
								</div>
							{/if}
							{#if rightRungs.length}
								<div class="v-col">
									{#each rightRungs as p, i (p.id)}
										{#if rightSpouse && i === rightRungs.length - 1}
											<div class="rung-row">
												{@render rung(
													p,
													i + 1,
													seqTotal,
													false,
													atSeq(seqRight(i)),
													true,
													true,
													atRow(i + 1),
													outRows
												)}
												{@render spouseCard(
													rightSpouse,
													false,
													atSeq(seqRight(i)),
													atRow(i + 1),
													outRows
												)}
											</div>
										{:else}
											{@render rung(
												p,
												i + 1,
												seqTotal,
												false,
												atSeq(seqRight(i)),
												true,
												false,
												atRow(i + 1),
												outRows
											)}
										{/if}
									{/each}
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	{/key}
{/if}

<!-- The enlargement. Centred, `pointer-events: none`, portalled to <body>. The shadow and hairline ring
     are FeaturedCard's exact values so the two popouts are visibly the same object in two places. -->
{#if zoom}
	<div use:portalZoom class="zoom-float" style={zoomStyle(zoom)} aria-hidden="true">
		<img src={zoom.src} alt={zoom.alt} />
	</div>
{/if}

<style>
	.veil {
		position: fixed;
		inset: 0;
		z-index: 40;
		/* MARSHMALLOW — Sam's own token, and the veil is finally the colour those investment modals used.
		   `#f0eee4` at its own value, barely deepened toward the edge, and — the part that matters — at a
		   THIRD of the alpha it started with. It has been wrong in two different ways and they are worth
		   separating, because they are not the same dial:

		     TOO DEEP   the colour was darkened 8% first. Given back in full.
		     TOO DENSE  "too white, covered up too much of background" — that is ALPHA, and it fell from
		                0.72/0.79/0.85 to 0.38/0.45/0.52, then another 5% to 0.36/0.43/0.49.

		   And then, at that lower coverage, the COLOUR came down one small step of its own — marshmallow
		   itself reads as white once it is only a third opaque (Sam: "its all too white"). Each stop moved
		   down one place in the ramp it was already on, so the three keep their relationship and only the
		   whole thing sits a shade lower.

		   The first correction was read as the second and the colour was moved when the opacity was what
		   was wrong. At a third of the coverage the veil stops being a sheet laid over the page and becomes
		   what those investment modals actually did — `bg-marshmallow/30`, with the BLUR doing the
		   separating and the tint only warming it. Keeps the one-colour-under-one-light construction that
		   makes a ground read as a room (§43.6).

		   THIS INVERTS THE ROOM, and the shadow is what pays for it. Every version before was darker than
		   the page; this is a shade OF the page, so separation no longer comes from contrast — it comes
		   from the blur and from each card's own drop shadow. Lightening the ground therefore had to be
		   paid for by DEEPENING that shadow rather than by leaving it alone (Sam asked for both in one
		   breath, and they are the same decision seen from two ends). See `.rung` below.

		   The whole set is held in layout.css; the other seven are backup and have no consumer yet. */
		background: radial-gradient(
			120% 90% at 50% 42%,
			rgba(228, 226, 216, 0.36) 0%,
			rgba(222, 220, 210, 0.43) 55%,
			rgba(216, 214, 204, 0.49) 100%
		);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
	}
	.ladder {
		/* THE FIT EASES, IT DOES NOT STEP. Inherited from the Thomas ladder, where a stepped change made
		   every surviving card scale ~10% and spring back. Nothing re-fits mid-life here — one path, one
		   `maxRows` — but the easing is what makes the value safe to read at any moment, and a stepped
		   custom property is a trap laid for whoever gives this feature a second path. */
		transition: --ladder-fit 460ms cubic-bezier(0.33, 1, 0.68, 1);
		position: fixed;
		inset: 0;
		z-index: 41;
		display: flex;
		flex-direction: column;
		align-items: center;
		/**
		 * THE ANSWER STARTS WHERE THE QUESTION DID (Sam: "its too low you have centered those results but
		 * like the main Search results the top should be the same top as the search input bar. its jarring
		 * to see things happen further down").
		 *
		 * Both halves of this feature hang from 12vh — the same number the picker uses — so the header
		 * stays put between choosing and seeing. It is one instrument answering, not a second thing
		 * appearing lower down.
		 */
		padding-top: 12vh;
		gap: 14px;
		/* The rows are the only thing here; nothing is caught except what a row claims. */
		pointer-events: none;
		outline: none;
	}
	/**
	 * THE CHROME CATCHES THE POINTER — and without this the X is a picture of a button.
	 *
	 * `.ladder` is `pointer-events: none` so the veil behind it stays clickable everywhere the cards are
	 * not. Every interactive thing inside it therefore has to opt back in. My automated CSS-stripping
	 * removed this rule along with the Paths-to-Thomas selectors it was sharing, and the result passed
	 * every test I ran: the X still closed the modal. It was the VEIL closing it — `elementFromPoint` at
	 * the X's own centre returned `.veil`, so the button had no hover, no pointer cursor and no click.
	 * Sam: "it works to exit but no cursor pointer, no darkened x".
	 *
	 * A CONTROL THAT LOOKS LIKE IT WORKS BECAUSE SOMETHING BEHIND IT DOES is the worst version of a
	 * missing rule, and `elementFromPoint` is how to catch it — design §27.10 and §39.4 both record it
	 * lying in the other direction, so it is worth stating that here it told the truth.
	 */
	.ladder-head,
	.ladder-v,
	.picker-head,
	.picker-box,
	.picker-list {
		pointer-events: auto;
	}

	/**
	 * THE V — two arms under one shared ancestor.
	 *
	 * The apex is CENTRED OVER THE SEAM between the columns rather than over either of them, because it
	 * belongs to both: it is the last rung of the left arm and the last rung of the right one, drawn
	 * once. That is the whole diagram, and it is why the answer fits at all — a 15-person route is 7 and
	 * 7 with one card above, where a single column would have been 15 rungs deep and could not be drawn.
	 */
	.ladder-v {
		pointer-events: auto;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: calc(9px * var(--stage-u, 1) * var(--ladder-fit, 1));
	}
	/* A lineal pair has one arm, so the single column centres rather than hugging the left. */
	.v-cols.single {
		justify-content: center;
	}
	.v-apex-single {
		width: min(340px, 40vw);
	}
	.v-cols {
		display: flex;
		align-items: flex-start;
		/* The same air between the columns as between the rungs, so the diagram reads as one grid rather
		   than as two lists that happen to be side by side. */
		gap: calc(9px * var(--stage-u, 1) * var(--ladder-fit, 1));
	}
	.v-col {
		display: flex;
		flex-direction: column;
		gap: calc(9px * var(--stage-u, 1) * var(--ladder-fit, 1));
		/* HALF THE LADDER'S OWN ENVELOPE, so a V occupies the width one column does and degrades on a
		   narrow window exactly as the Thomas ladder already does — `min(440px, 84vw)` there, two of
		   these plus a gap here. */
		width: min(340px, 40vw);
	}
	/**
	 * THE COUPLE BAR — one card the width of BOTH columns and the gap between them, so it is the top of
	 * both descents rather than a third column. `calc` off the same two values the columns use, so the
	 * three can never disagree about where the seam is.
	 */
	.v-apex {
		width: calc(2 * min(340px, 40vw) + 9px * var(--stage-u, 1) * var(--ladder-fit, 1));
		display: flex;
		align-items: stretch;
		height: calc(72.8px * var(--stage-u, 1) * var(--ladder-fit, 1));
		/**
		 * `flex: none` — DESIGN §44.16, THIRD TIME IN THIS PROJECT. An explicit `height` on a flex item is
		 * a REQUEST, not a floor: the default `flex: 0 1 auto` is shrinkable, so when the column ran tall
		 * the browser crushed this bar to satisfy the container. Measured at 9.42px against its stated
		 * 72.8 — Sam: "the LCA couple row is condensed to nothing".
		 *
		 * The ladder's rungs carry the same line for the same reason, and so does the search result row.
		 * Any box in this app whose height is stated and whose parent is a flex container needs it.
		 */
		flex: none;
		/**
		 * THE RADIUS HAS TO BE RESTATED HERE BECAUSE THE CLIP IS. `overflow: hidden` is what keeps the two
		 * halves inside the bar, and it clips to the BORDER BOX — so without a radius of its own the
		 * corners came out square, and a photo with its own rounding left white wedges in them (Sam).
		 * `.person-box` supplies the radius to a normal card; a card that clips its own children has to
		 * say it again on the element doing the clipping.
		 */
		border-radius: var(--chip-radius, 8px);
		overflow: hidden;
	}
	/**
	 * A PHOTO INSIDE THE BAR HAS NO CORNERS OF ITS OWN — Sam: "the rounded corners on all four corners of
	 * Mary's photo when only the outside right two corners should be rounded like all other cards".
	 *
	 * A rung's photo is rounded because it sits at the END of a card and its outer corners ARE the card's
	 * corners. In the couple bar the left photo is at the bar's left end and the right photo at its
	 * right, so each should round only on the side it is on — and the bar's own `overflow: hidden` plus
	 * its radius does exactly that for free, provided the photo stops drawing its own. Squaring them and
	 * letting the parent clip is the whole fix; four rounded corners floating inside a straight edge is
	 * what a photo carrying its own radius looks like.
	 */
	.v-apex :global(.rung-photo),
	.v-apex :global(.rung-photo img) {
		border-radius: 0;
	}
	/* Each half takes exactly its own column's share, so the seam lands on the columns' seam. */
	.v-half {
		flex: 1 1 0;
		min-width: 0;
		display: flex;
		align-items: center;
		text-decoration: none;
		color: inherit;
	}
	/* The right half mirrors: photo outside, text hard against it and reading back toward the middle. */
	.v-half.right {
		flex-direction: row;
		justify-content: flex-end;
		text-align: right;
	}
	.v-half.right :global(.rung-line1),
	.v-half.right :global(.rung-line2) {
		justify-content: flex-end;
	}
	/* A hairline where the two lives meet — the marriage, drawn as the one seam in an unbroken bar. */
	.v-apex-seam {
		flex: none;
		width: 1px;
		align-self: center;
		height: 58%;
		background: color-mix(in oklab, var(--color-inkblue) 16%, transparent);
	}
	/**
	 * THE PAIRED CHOOSER, hanging off the end of its arm.
	 *
	 * Same shape and same reasoning as the Thomas ladder's `.rung-spouse`: the partner holds the rung
	 * because the walk climbed THEIR line, and this card stands beside it. Overhanging is what says
	 * "attached to that one" rather than "next in the sequence".
	 */
	/**
	 * THE PAIRED ROW — the rung keeps the column's full width and the spouse hangs OUTSIDE it.
	 *
	 * Absolutely positioned rather than a flex sibling, and that is the whole reason it works: a sibling
	 * would take its width out of the rung's, so the partner's card would shrink to make room for the
	 * person standing beside them. Out of flow, the rung is untouched and the overhang is genuinely an
	 * overhang.
	 */
	/**
	 * THE PAIRED ROW — ConnectModal's own `.rung-spouse` geometry, MIRRORED, rather than a fresh guess.
	 *
	 * Sam: "do you want to review Paths to Thomas to understand how spouse works?" — fair, because my
	 * first attempt invented its own numbers (62% wide, 58px tall, vertically centred) and looked it. The
	 * ladder's shape is: the partner's rung is cut to 76%, the spouse is ABSOLUTE at `76% + 8px`, half a
	 * rung wide, the FULL height of a rung, on a deepened mint. Every one of those is load-bearing —
	 * a spouse card shorter than the rung beside it reads as a caption, not a person.
	 *
	 * The mirror is the only difference: this arm hangs off the LEFT, so `left:` becomes `right:` and the
	 * rung sits at the row's right edge. The right arm keeps the ladder's own direction.
	 */
	.rung-row {
		position: relative;
		display: flex;
	}
	.rung-row.mirrored {
		justify-content: flex-end;
	}

	.v-spouse {
		position: absolute;
		bottom: 0;
		height: calc(72.8px * var(--stage-u, 1) * var(--ladder-fit, 1));
		width: 50%;
		display: flex;
		align-items: stretch;
		border-radius: 8px;
		overflow: visible;
		text-decoration: none;
		color: inherit;
		/* The mint deepened for this ground, exactly as design §44.11 measured it: a value is a property
		   of the PAIR (colour, ground), and at the chip's own value it read as white here. */
		--card-bg: #e3fbf2;
	}
	.v-spouse.left {
		right: calc(76% + 8px);
	}
	.v-spouse:not(.left) {
		left: calc(76% + 8px);
	}
	.v-spouse .rung-body {
		display: flex;
		flex: 1 1 auto;
		flex-direction: column;
		justify-content: center;
		gap: 2px;
		min-width: 0;
		padding: 0 calc(11px * var(--stage-u, 1));
	}
	.v-spouse.no-photo .rung-body {
		padding-left: calc(20px * var(--stage-u, 1));
	}
	/**
	 * A SPOUSE CARD READS LEFT-TO-RIGHT ON BOTH ARMS (Sam: "if the spouse is in the left column, you
	 * should left align her name and years").
	 *
	 * The right arm's RUNGS mirror, because a mirrored card has to read outward from the seam. A spouse
	 * card does not: it is the narrowest card in the diagram, its name is a single word, and the years
	 * sit under it — there is nothing for a mirror to buy, and a first name pushed to the right edge of
	 * its own card just looks unmoored.
	 */
	.v-spouse :global(.rung-line1) {
		text-align: left;
	}
	/**
	 * THE RIGHT ARM'S SPOUSE CARD MIRRORS, LIKE ITS RUNGS (Sam, on Walter: "needs to have photo on the
	 * right side of his smaller card but sure to put the rounded corner the right way").
	 *
	 * Same reasoning as the rungs: everything that side of the seam reads outward, so the photo goes to
	 * the outside edge and rounds on the edge it now occupies. The TEXT stays left-aligned — a first name
	 * pushed to the right of its own narrow card looks unmoored, which is why the spouse card was
	 * exempted from the mirror's text rule to begin with.
	 */
	.v-spouse:not(.left) {
		flex-direction: row-reverse;
	}
	.v-spouse:not(.left) :global(.rung-photo) {
		border-radius: 0 8px 8px 0;
	}
	/**
	 * AND THE YEARS TAKE THEIR OWN ROW, always (Sam, on Dudley: "all crammed into a single row").
	 *
	 * On a rung the name and years share a line because a rung is 340px wide and they fit. This card is
	 * half that with a square photo in it, so sharing puts them in competition — the name shrinks to make
	 * room for a date. `.rung-y-below` is the Thomas ladder's own answer to the same squeeze (§44.15) and
	 * it is stated here rather than left to the markup, so it cannot be true on one card and not another.
	 */
	.v-spouse :global(.rung-y) {
		display: block;
		margin-left: 0;
		margin-top: 0.25em;
		font-size: 0.846em;
		line-height: 1.3;
	}
	/**
	 * THE RIGHT ARM MIRRORS (Sam: "for the right column... lets put the photos on the right to match the
	 * wife of the LCA row at the top. and then put the number to the left of the photo and the name,
	 * years and blurb shift to the left of the card").
	 *
	 * `flex-direction: row-reverse` does the whole thing, because the card's source order is already
	 * photo → number → body: reversed, that reads body → number → photo, which is exactly what was
	 * asked for. The text then aligns right for the same reason the couple bar's right half does — a
	 * mirrored card must read outward from the centre, or the diagram has a left-hand and a right-hand
	 * grammar instead of one reflected across the seam.
	 */
	.v-col :global(.rung.mirror) {
		flex-direction: row-reverse;
	}
	.v-col :global(.rung.mirror .rung-line1),
	.v-col :global(.rung.mirror .rung-line2) {
		text-align: right;
	}
	.v-col :global(.rung.mirror .rung-body) {
		align-items: flex-end;
		/* Mirrored, the body sits on the other side of the number, so its two paddings swap with it. */
		padding: 0 calc(8px * var(--stage-u, 1)) 0 calc(10px * var(--stage-u, 1));
	}
	/* THE PHOTO'S CORNERS FOLLOW THE PHOTO. Reversing the row moved it to the right-hand end of the card
	   but left it rounding its left corners, so it rounded into the card and squared off against the
	   outside edge — the exact inverse of what a card's end looks like. */
	.v-col :global(.rung.mirror .rung-photo) {
		border-radius: 0 8px 8px 0;
	}
	/* `margin-inline-start` follows the writing direction, not the flex one, so a reversed row needs the
	   offset stated on the side the photo is actually on. */
	.v-col :global(.rung.mirror .rung-gen) {
		margin-inline-start: 0;
		margin-inline-end: calc(8px * var(--stage-u, 1));
	}
	/* A rung in a V is narrower than a rung on the ladder, so its own width rule has to yield. The
	   height, the photo, the type and every colour are untouched — this is the same card in a narrower
	   column, not a fourth size tier. */
	.v-col :global(.rung),
	.v-apex :global(.rung) {
		width: 100%;
	}
	/**
	 * THE PARTNER'S RUNG YIELDS THE WIDTH THE SPOUSE HANGS INTO — the ladder's `.rung.paired`, at 76%.
	 *
	 * IT HAS TO COME AFTER `.v-col :global(.rung)`, and that is design §29.9: both selectors weigh the
	 * same, so the cascade decides on DECLARATION ORDER alone. Declared first, this lost silently — the
	 * rung stayed full width and the spouse card overlapped it by 74px instead of sitting 8px clear.
	 * Reordering rules here silently re-lays out the paired row.
	 */
	.rung-row :global(.rung) {
		width: 76%;
	}
	.ladder-head {
		position: relative;
		display: flex;
		/**
		 * THE X DOES NOT MOVE WHEN THE SENTENCE WRAPS (Sam: "the X should always be in a fixed vertical
		 * position. it shouldn't rise and fall higher than the search result cards if the left aligned
		 * text is longer and wraps").
		 *
		 * Centred, a two-line title lifted the X by half a line and the whole header sat differently for
		 * a long name than a short one — the diagram below it never moves, so a control above it that
		 * does is the one thing in the frame reporting the length of a sentence. Top-aligned, the title
		 * grows DOWNWARD and the X stays where it was.
		 */
		align-items: flex-start;
		gap: 14px;
		width: min(440px, 84vw);
	}
	/* And the X sits on the title's FIRST LINE rather than at its very top: the button is 34px tall
	   against a ~21px line, so half the difference back up puts the glyph's centre on that line's. */
	.ladder-head .ladder-x {
		margin-top: -6.5px;
	}
	/**
	 * A V'S HEADER IS EXACTLY AS WIDE AS THE V (Sam: the sentence "left aligned to top of results rows on
	 * same level as X on right side"). Stated with the same expression the couple bar uses, so the three
	 * cannot drift: the sentence begins on the left column's left edge and the X sits on the right
	 * column's right edge, which is what makes the header read as the diagram's own top line rather than
	 * as a caption floating over it.
	 */
	.ladder-head.wide {
		width: calc(2 * min(340px, 40vw) + 9px * var(--stage-u, 1) * var(--ladder-fit, 1));
	}
	/* A LINEAL PAIR HAS ONE COLUMN, so its header is one column wide. The rule is the same — the header
	   is exactly as wide as the diagram under it — and the diagram is simply narrower here. */
	.ladder-head.one-col {
		width: min(340px, 40vw);
	}

	/**
	 * A SENTENCE IS NOT A LABEL, and it must not be set like one.
	 *
	 * "Path to Thomas" is a caption: three words naming a fixed thing, and uppercase at 0.14em is
	 * exactly right for it. "Aaron Burr Jr. is the 1st cousin twice removed of Sarah Hooker." is a
	 * CLAIM about two specific people, and at that treatment it read as a banner rather than as
	 * something to be read — the letterspacing fights word shapes, and uppercase throws away the
	 * capital that tells you a name has started.
	 *
	 * So: sentence case, normal spacing, a touch larger, and the ink at full strength — this is the one
	 * thing on screen that says what the cards MEAN, and it is the only place in either modal where the
	 * header carries information rather than furniture.
	 */
	/**
	 * THE ANSWER SITS WHERE THE QUESTION SAT — left-aligned on the same line as the X, wrapping onto a
	 * second row when it must (Sam). Centring it made the header a different object between the two
	 * halves of the feature; left-aligned, "CONNECT SARAH TO…" simply becomes the sentence in place.
	 *
	 * A SENTENCE IS NOT A LABEL, though, so it keeps its own type: sentence case at normal tracking,
	 * because uppercase at 0.112em fights word shapes and throws away the capital that says a name has
	 * started. It is the one thing on screen that states what the cards MEAN.
	 */
	.ladder-title.sentence {
		font-size: calc(15.5px * var(--type-k, 1));
		font-weight: 500;
		letter-spacing: 0;
		text-transform: none;
		opacity: 1;
		line-height: 1.35;
		text-align: left;
		flex: 1;
		min-width: 0;
	}
	.ladder-title {
		font-family: var(--font-opensans, sans-serif);
		font-size: calc(14px * var(--type-k, 1));
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-inkblue);
		opacity: 0.83;
	}
	.ladder-x {
		margin-left: auto;
		/* THE GLYPH IS FLUSH, NOT THE BOX. The hit area is 34px around a 22px icon, so a box aligned to
		   the edge leaves the visible X six pixels short of it — measured against the rungs' right edge
		   at 933 vs the glyph's 927. The negative margin gives those six back, so what the eye lines up
		   against the cards is the mark rather than its padding. The 34px target is untouched. */
		margin-right: -6px;
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		padding: 0;
		color: var(--color-inkblue);
		background: none;
		border: 0;
		opacity: 0.55;
		cursor: pointer;
		transition: opacity 200ms ease-out;
	}
	.ladder-x:hover,
	.ladder-x:focus-visible {
		opacity: 1;
	}

	/* THE RUNG'S GEOMETRY, and ONLY its geometry. Paper, shadow, line-status fill and the `--line-edge`
	   rule all arrive from the global `.person-box` block in layout.css — this rule must not restate any
	   of them, or the next change to the chip shadow will fix every chip in the app and miss the ladder.

	   LONG AND LOW rather than the chip's 220x75 (aspect 2.93). At 440x48 the aspect is 9.2, which is
	   the shape Sam asked for — "long in shape more than square and not large". It deliberately does NOT
	   join the chip's size-tier family: those three tiers all hold 2.93 exactly, because flight.ts reads
	   the x/y scale difference to decide whether a landing is same-tier, and a fourth aspect in that set
	   would quietly change which flight runs for a chip. A rung is a different object that borrows the
	   chip's SURFACE, not a fourth chip tier.

	   48px is what makes fifteen rungs fit: the tallest ladder in the corpus is 15 rows, and 15 x 54
	   (48 + the 6px gap) is 810px before the stage unit scales it down on a shorter window. */
	/* THE RUNG'S GEOMETRY, and ONLY its geometry. Paper, shadow, line-status fill and the `--line-edge`
	   rule all arrive from the global `.person-box` block in layout.css — this rule must not restate any
	   of them, or the next change to the chip shadow will fix every chip in the app and miss the ladder.

	   THE FRAME IS THE CHIP'S, MEASURED OFF ONE: 8px radius (`rounded-lg`), `overflow: hidden`, a SQUARE
	   photo flush to the left edge running the full height, and the text stacked name-over-years in the
	   chip's own `px-2.5` inset. The first pass guessed at all four — 4px radius, a 3:4 portrait, name
	   and years inline — and the result read as a table row wearing a card's shadow.

	   LONG AND LOW rather than the chip's 220x75 (aspect 2.93). It deliberately does NOT join the chip's
	   size-tier family: those three tiers hold 2.93 EXACTLY, because flight.ts reads the x/y scale
	   difference to decide whether a landing is same-tier, and a fourth aspect in that set would quietly
	   change which flight runs for a real chip. A rung borrows the chip's SURFACE, not its tier. */
	.rung {
		/**
		 * A DEEPER SHADOW THAN A CHIP'S, and design §29 is why that is not an inconsistency.
		 *
		 * §29.7: how dark a shadow reads depends on the DISTANCE from its ink to the ground, so a value is
		 * a property of the PAIR (colour, ground) and not of the colour — "read the Δ column, never the
		 * alpha". A chip's `--chip-shadow` was measured against the photographed parchment. A rung sits on
		 * a marshmallow veil over a BLURRED version of that parchment, which is a different ground, and on
		 * it the same alpha reads lighter. So the geometry and the INK are the chip's exactly — only the
		 * two alphas are multiplied — and the house ink stays the single source: re-hue `--shadow-ink` and
		 * this follows, which a hard-coded rgba would not.
		 */
		box-shadow:
			0 3.2px 9.6px hsl(var(--shadow-ink) / calc(var(--shadow-a1) * 1.45)),
			0 0.8px 2.4px hsl(var(--shadow-ink) / calc(var(--shadow-a2) * 1.35));
		cursor: pointer;
		text-decoration: none;
		display: flex;
		align-items: stretch;
		height: calc(72.8px * var(--stage-u, 1) * var(--ladder-fit, 1));
		/**
		 * A RUNG MAY NOT SHRINK — and this one line is the whole of the smoosh Sam filmed.
		 *
		 * A column is a flex COLUMN with a reserved height, and a flex item's default is `flex: 0 1 auto`
		 * — SHRINKABLE, which means an explicit `height` is a REQUEST and not a floor. On the Thomas
		 * ladder the over-full frame came from a path switch holding both paths at once; here it comes
		 * from the reserved height of the taller arm being handed to a column that also carries an
		 * overhanging spouse. Either way the flex algorithm squashes every item to fit, and that frame
		 * is the frame a measurement lands in: the couple bar came out at 9.42px against a stated 72.8.
		 *
		 * ONLY CARDS WITHOUT A PHOTO SHOWED IT (Sam saw this before I did), because `min-height: auto`
		 * floors a flex item at its min-content height and an `<img>` supplies one — text alone
		 * collapses to almost nothing. Which is why it read as a bug about photos rather than one
		 * about flex.
		 *
		 * The same finding as the search result row, in a second component: an explicit `height` on a
		 * flex item is a REQUEST, not a floor, until `flex: none` says otherwise.
		 */
		flex: none;
		border-radius: 8px;
		/* VISIBLE, not hidden, so a married-in partner's card can overhang the right edge. The photo was
		   the only thing that ever needed clipping and it now clips itself, which is the smaller claim. */
		overflow: visible;
	}
	/* THE PAIR. Cut to 76% so the two together still read as ONE row rather than a row and a half; the
	   partner takes 50% of the column and is docked past the Hooker card's right edge, so the pair runs
	   about 120px beyond the ladder and that overhang is what says "this one is attached to that one".
	   Sam: "stick it to the right of the hooker spouse, sticking off to the right to make clear this is
	/* Positioned against `.ladder-rows` (which is already `position: relative` for the leavers), and
	   anchored to its BOTTOM — the paired rung is always the last one, so the bottom edge is the same
	/* STACKED, not inline. A rung is 440 wide and sets name and years in series; this card is 220 with a
	/* WITHOUT A PHOTO the text is the card's first thing, and 11px against the edge reads as shoved up
	   against it — Sam, on Gertrude. A rung never has this problem because its photo seat holds its width
	   empty and keeps the column straight; this card drops the seat entirely when there is nothing to put
	   in it (see the markup), so the inset has to come back as padding. Deliberately NOT a photo's width:
	   the point is breathing room, not a phantom square. */
	/* PersonBox's OWN values, and they transfer here because the two boxes are almost the same size —
	   its comment warns that neither the crop nor the veil carries between a 220x75 chip and a 925x575
	   card, and this paired card is 220x73. `cover` on the veil, `200% auto` on the texture so the chip
	   shows a legibly DIAGONAL piece of the band rather than a thin horizontal stripe of one hue.
	   It overrides the mint by sitting after `--card-bg` in this file: `background-image` paints above
	.rung-spouse .rung-n,
	/* `:global` because the portal moves this node to <body>, where Svelte's scoping attribute still
	   rides along but the component's own scope no longer contains it in the way a nested rule expects.
	   Written out rather than borrowed as Tailwind classes so the values are readable beside the
	   comment that explains them. */
	:global(.zoom-float) {
		position: fixed;
		z-index: 9999;
		pointer-events: none;
	}
	:global(.zoom-float img) {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 6px;
		/* FeaturedCard's own values. The negative x is the whole character of it — the light is up and to
		   the right, so the shadow falls LEFT, which is what makes the picture read as lifted off the page
		   rather than pasted onto it. */
		box-shadow: -18px 22px 48px -12px rgba(0, 0, 0, 0.55);
		outline: 1px solid rgba(0, 0, 0, 0.1);
		outline-offset: -1px;
	}
	/* NO LIFT. The rung used to rise 1.3px as well; Sam's call is the chip's own hover and nothing else —
	   which arrives free from `a.person-box:hover` in layout.css (`--chip-shadow-hover`, the same shadow a
	   spouse or parent chip takes). There is deliberately no rule here: writing one would be restating a
	   value that already has a home, and the next change to the chip hover would then miss the ladder. */
	.rung-photo {
		flex: 0 0 auto;
		aspect-ratio: 1 / 1;
		height: 100%;
		background: var(--color-stone100, #f5f5f4);
		/* Its own clip, now that the rung's is gone. */
		border-top-left-radius: 8px;
		border-bottom-left-radius: 8px;
		overflow: hidden;
	}
	.rung-photo img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.rung-photo img.object-top {
		object-position: top;
	}
	/* THE NUMBER'S COLUMN, halved (Sam: "there is so much space between the number like 4 and the name
	   and year and blurb content, you can reduce that gap by 50%"). 30px was the Thomas ladder's, where a
	   rung is 440 wide and can afford the air; a V's column is 340 and the same gutter reads as a hole. */
	.rung-gen {
		flex: 0 0 auto;
		align-self: center;
		/**
		 * CENTRED BETWEEN THE PHOTO AND THE NAME, and the offset is solved rather than nudged.
		 *
		 * With a box of width w, a left margin m, and the body's padding p, the digit's centre sits at
		 * `m + w/2` and the name starts at `m + w + p`. Centring wants those equidistant from the photo's
		 * edge and from each other:  m + w/2 = (m + w + p) / 2  =>  m = p.  With p = 8, m = 8.
		 *
		 * 5 was too tight and 10-with-no-margin was the original hole; 8 is the middle Sam asked for, and
		 * the identity is what keeps the digit centred at whatever value it settles on.
		 */
		margin-inline-start: calc(8px * var(--stage-u, 1));
		width: calc(24px * var(--stage-u, 1) * var(--ladder-fit, 1));
		font-size: calc(12.1px * var(--type-k, 1) * var(--ladder-fit, 1));
		font-variant-numeric: tabular-nums;
		text-align: center;
		color: var(--color-inkblue);
		opacity: 0.4;
	}
	.rung-body {
		/* `align-self: center` and not `stretch`: stretched to the card's full height the text sits at the
		   TOP of that box, which left the name riding high above the generation number beside it. */
		align-self: center;
		flex: 1 1 auto;
		min-width: 0;
		/* 10 -> 5 on the NUMBER's side: that is the gap Sam asked to halve. The outer side keeps its
		   10 so the text never runs to the card's edge. Two gaps, two dials — halving the number's
		   own column instead took the space off both sides at once and pinned the digit to the photo. */
		padding: 0 calc(10px * var(--stage-u, 1)) 0 calc(8px * var(--stage-u, 1));
	}
	/* A BLOCK, not a flex row. `shrinkToFit` measures the wrapper's available width against a single
	   `[data-fit]` inline span; a flex parent sizes to its children instead and nothing ever shrinks —
	   the same `min-w-0` trap FeaturedCard records for the card's own name. */
	.rung-line1 {
		display: block;
		min-width: 0;
		line-height: 1.15;
	}
	.rung-line2 {
		min-width: 0;
		margin-top: 1px;
	}

	.rung-bl {
		display: block;
		font-family: var(--font-opensans, sans-serif);
		font-size: 1em;
		color: var(--color-inkblue);
		opacity: 0.62;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* ONE INK AT TWO STRENGTHS — the chip's own rule (PersonBox: CHIP_TEXT / CHIP_YEARS). The years take
	   ALPHA rather than a lighter blue, so a rung reads as one object at two strengths rather than as two
	   colours.

	   OPEN SANS, NOT THE CHIP'S INHERITED INTER. A pass matching the chip exactly moved this to Inter on
	   the reasoning that a rung borrows the chip's surface and should borrow its type with it; Sam's call
	   is the face that was here before. Worth writing down so it is not "corrected" back: the surface is
	   shared because the object is the same KIND of thing, but a rung is set at a different width and
	   read in a list, and those are type decisions of their own. */
	/* `em`, NOT px. `shrinkToFit` writes `fontSize` on `.rung-line1`/`.rung-line2`, so anything inside
	   that restated its own px size would ignore the fit it was just given. The ratios are the ones the
	   old absolute values expressed: years 12.1/14.3, blurb 11.55 against its own line's 11.55. */
	.rung-n {
		font-family: var(--font-opensans, sans-serif);
		font-size: 1em;
		font-weight: 500;
		color: var(--color-inkblue);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.rung-y {
		flex: 0 0 auto;
		margin-left: calc(8px * var(--stage-u, 1));
		font-family: var(--font-opensans, sans-serif);
		font-size: 0.846em;
		color: var(--color-inkblue);
		opacity: 0.7;
		white-space: nowrap;
	}
	/* PROPORTIONAL, like the inline form — 0.846 of whatever the fitted line settled on. `block` puts it
	   on its own row without leaving the fitted parent.

	   DECLARED AFTER `.rung-y`, and that placement is the rule rather than tidiness. Both are single
	   classes, so specificity cannot separate them and SOURCE ORDER decides (§29.9). Sitting above
	   `.rung-y`, its `margin-left: 0` lost to that rule's 8px gap and the years sat indented under the
	   name — visible on Josephine's card and on nothing else, because hers is the only form that puts
	   them on their own line. */
	/**
	 * THE SPOUSE CARD'S YEARS ARE CAPPED AT A RUNG'S YEARS (Sam: "give the years a max font size in the
	 * spouse chip even though its wrapped").
	 *
	 * Everywhere else on the ladder the years are `0.846em` of a line that shrinks when the NAME beside
	 * them does not fit — name and years travel together because they share one line. On this card they
	 * are stacked, so the years are not what forces the fit, and a short spouse name sitting at the
	 * ceiling puts them at full size next to rungs whose long names have shrunk theirs. `--sp-y-max` is
	 * the ladder's own ceiling in px (`tt(14.3) * RUNG_Y_EM`), so the cap scales with the stage instead
	 * of being a literal that goes wrong the first time a ladder gets tall. The cap itself lived on the
	 * paired-card rule, which is the Thomas ladder's and went with the split; the spacing below is this
	 * feature's own and stays.
	 */
	.rung-y-below {
		display: block;
		margin-left: 0;
		/* AIR UNDER THE NAME, in `em` so it scales with whatever `shrinkToFit` settled on. Matching the
		   two cards' nesting closed the gap to −0.2px on both, which Sam read as too tight — the earlier
		   3.3px was the spacing he wanted, it was just arriving by accident on one card only. Now it is
		   the same deliberate amount on both, at every size. */
		margin-top: 0.25em;
		font-size: 0.846em;
		line-height: 1.3;
	}
	/**
	 * THE PICKER — this feature's own surface, and every value below is written here on purpose.
	 *
	 * Sam asked for two things that sound opposed and are not: it should LOOK like the search modal, and
	 * it must not DEPEND on it. So the numbers are copied and the component is not. A shared component
	 * means a tuning pass on one surface silently retunes the other — which is exactly what happened to
	 * Paths to Thomas's header fade and is why these three features were split apart. Copying a value is
	 * cheap and visible; sharing a mechanism is neither.
	 *
	 * What IS genuinely shared is the app's vocabulary: `.person-box` supplies the paper, the shadow and
	 * the line-status fills, because a result must BE a card of the same species as every other card
	 * (design §45.7). That is the app's argument about what a person looks like, not this feature's.
	 */
	/**
	 * IT HANGS FROM A FIXED HEIGHT, IT DOES NOT CENTRE. Centred, the box walks UP the screen as results
	 * arrive under it — measured, 446px to 212px between an empty query and "hooker" — which is design
	 * §30 in miniature: the thing you are typing into must not move while you type. The search modal's
	 * own rule says so in as many words, and I wrote `justify-content: center` here anyway.
	 */
	.picker {
		position: fixed;
		inset: 0;
		z-index: 41;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding-top: 12vh;
		gap: 10px;
		pointer-events: none;
	}
	/**
	 * ONE MEASURE FOR THE WHOLE PICKER (Sam) — the header, the box and the results are all the width of
	 * the INPUT, not of the search modal's panel. The panel's 520 was inherited from a surface that also
	 * carries chips and a year range; with those gone the column has no reason to be wider than the one
	 * thing the reader is looking at.
	 */
	.picker-head,
	.picker-box,
	.picker-list {
		pointer-events: auto;
		width: var(--pick-w);
	}
	.picker {
		--pick-w: calc(min(520px, 92vw) * 2 / 3);
	}
	.picker-head {
		display: flex;
		align-items: center;
		gap: 14px;
	}
	/**
	 * TRACKING BUYS THE ROOM BEFORE TYPE SIZE DOES (Sam: "maybe reduce the space between letters... by
	 * 20% to help prevent font size reduction"). At 0.14em a six-word title spends a whole character's
	 * width every five letters; 0.112em gives that back invisibly, so 99% of names hold the full size
	 * and the clamp is only ever spent on the genuinely long ones.
	 */
	.picker-title {
		flex: 1;
		min-width: 0;
		font-family: var(--font-opensans, sans-serif);
		font-size: clamp(10.5px, calc(14px * var(--type-k, 1)), calc(14px * var(--type-k, 1)));
		font-weight: 600;
		letter-spacing: 0.112em;
		line-height: 1.3;
		text-transform: uppercase;
		color: var(--color-inkblue);
		opacity: 0.83;
	}
	/* TWO THIRDS OF THE PANEL (Sam) — with no chips or slider under it the box does not need the full
	   measure, and a narrower field reads as one question rather than as a console. Everything else
	   about it is the search box's: 42px tall, 10px radius, the house paper and the house shadow. */
	/* THE HALO — invisible, wider than the box, and `pointer-events: auto` like the box itself, so a
	   click that lands just outside the field still reaches this feature rather than the scrim behind
	   it. `::before` rather than real padding, because padding would move the box. */
	.picker-box::before {
		content: '';
		position: absolute;
		inset: -14px -18px;
		border-radius: 18px;
		/**
		 * BEHIND THE BOX, NOT OVER IT. At the default stacking this pseudo-element covered the `<input>`
		 * it exists to protect, so every click meant for the field hit the halo instead — Playwright named
		 * it outright: "div.picker-box intercepts pointer events". A forgiveness margin that eats the
		 * clicks it was added to forgive is worse than no margin at all.
		 */
		z-index: -1;
	}
	.picker-box {
		position: relative;
		cursor: text;
		/* TWO THIRDS OF THE MAIN SEARCH BAR (Sam). `min(66%, 520px)` was wrong twice over: the percentage
		   resolves against the full-width `.picker`, so `min()` simply picked 520 and the box came out at
		   the panel's FULL width. Stated against the panel's own measure it is two thirds of what search
		   shows, which is what was asked for. */
		width: var(--pick-w);
		display: flex;
		align-items: center;
		gap: 9px;
		padding: 0 12px;
		height: 42px;
		border-radius: 10px;
		background: var(--paper, #f7f5ee);
		box-shadow:
			0 3.2px 9.6px hsl(var(--shadow-ink) / calc(var(--shadow-a1) * 1.45)),
			0 0.8px 2.4px hsl(var(--shadow-ink) / calc(var(--shadow-a2) * 1.35));
	}
	.picker-box svg {
		width: 15px;
		height: 15px;
		flex: none;
		opacity: 0.42;
		color: var(--color-inkblue);
	}
	.picker-box input {
		flex: 1;
		min-width: 0;
		border: 0;
		background: none;
		outline: none;
		font: 400 13.5px/1 var(--font-open-sans, 'Open Sans', sans-serif);
		color: #2b2620;
	}
	.picker-box input::placeholder {
		color: color-mix(in srgb, #2b2620 46%, transparent);
	}
	/* The list fades at both ends rather than cutting a row in half — the same mask the search results
	   use, and for the same reason: a hard edge mid-card reads as a rendering fault. */
	.picker-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
		max-height: 52vh;
		/**
		 * ROOM FOR THE SHADOWS, DERIVED PER SIDE — design §33.7, and I should have used it the first time
		 * instead of picking 8px and being wrong on three sides at once (Sam: "the drop shadow is still
		 * cut off on left and right just a few pixels deeper... are you just hardcoding everything by the
		 * pixel?").
		 *
		 * `overflow-y: auto` makes this a scroll container, and a scroll container clips on BOTH axes
		 * whatever `overflow-x` says. So the box must reserve exactly what the shadow reaches — and a
		 * shadow does not reach the same distance in every direction:
		 *
		 *     a blur of B extends ~B/2 past the shadow's rect
		 *     the rect is the card's box offset DOWN by the y-offset
		 *     => sideways  B/2
		 *        above     B/2 − y
		 *        below     B/2 + y
		 *
		 * The widest layer in play is `--chip-shadow-hover`'s first — `0 5px 14px`, live under the
		 * pointer — which gives 7 sideways, 2 above, 12 below. A single uniform value is simultaneously
		 * too small on three sides and load-bearing on the fourth, which is §33.7 stated exactly.
		 *
		 * RE-RUN THIS ARITHMETIC IF THE SHADOW MOVES. These are not free numbers; they are that shadow's
		 * geometry, and `layout.css` is where it lives.
		 */
		--sh-side: 7px;
		--sh-top: 2px;
		--sh-bottom: 12px;
		padding: var(--sh-top) var(--sh-side) var(--sh-bottom);
		margin: calc(-1 * var(--sh-top)) calc(-1 * var(--sh-side)) calc(-1 * var(--sh-bottom));
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: rgba(48, 42, 34, 0.22) transparent;
		/* NO EDGE MASK. Search fades its list because it scrolls a long way; these are cards you are
		   choosing between, and a softened first and last row reads as damage rather than as depth —
		   Sam: "they are just cards i never said fade out the top of the top result". */
	}
	/* `min-height`, NOT `height` — search's own rule carries the scar: a flex item's `flex-shrink: 1`
	   applies to a definite height just as it does to a basis, so `height` handed the browser permission
	   to compress every row and it did, 54px to 33px. */
	/* A CARD HAS CORNERS. Without a radius these were square-edged slabs with a shadow under them —
	   Sam: "they aren't cards just irregularly shaped blobs". Search gets its 8px from a `rounded-lg` in
	   the markup; this states it, because the class list here is this feature's own. */
	.pick {
		min-height: 54px;
		flex: none;
		display: flex;
		align-items: stretch;
		padding: 0;
		border: 0;
		border-radius: 8px;
		text-align: left;
		cursor: pointer;
		overflow: hidden;
	}
	/**
	 * THE PHOTO NEEDS A DEFINITE BOX IN BOTH AXES, and this is search's own scar arriving in a new place.
	 * There, `.photo` had no definite WIDTH and John Talcott's 720x962 portrait resolved circularly and
	 * made his row twice as tall as everyone else's. Here it had a width and no HEIGHT, so Rev. Thomas
	 * Hooker's tall statue drove the row to 93px against everyone else's 54 — the same defect, rotated
	 * ninety degrees. `aspect-ratio` closes it from the other side, and `align-self: center` means the
	 * image can never set the row's height whatever it is.
	 */
	.pick-photo {
		width: 54px;
		aspect-ratio: 1;
		align-self: center;
		flex: none;
		overflow: hidden;
		background: color-mix(in srgb, var(--color-inkblue) 6%, transparent);
	}
	.pick-photo img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: top;
	}
	/* THE STAR IS A GUTTER, reserved whether or not it is filled, so every name starts at the same x —
	   a star that shoved its own name rightward would make the column ragged. */
	.pick-star {
		flex: 0 0 auto;
		align-self: stretch;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 10.8px;
		margin-left: 12px;
		font-size: 12px;
		line-height: 1;
		color: transparent;
	}
	/* THE HOUSE INK, exactly as search's star is — I had made it gold, which is the DESCENT colour and
	   says something entirely different (§29.8: gold means "this person IS the line"). A notable star is
	   not a statement about descent. */
	.pick-star.has {
		color: var(--color-inkblue);
		cursor: help;
	}
	.pick-text {
		display: flex;
		flex-direction: column;
		justify-content: center;
		min-width: 0;
		padding: 7px 12px;
		gap: 3px;
	}
	.pick-n {
		font-family: var(--font-outfit, 'Outfit Variable', sans-serif);
		font-size: 15px;
		font-weight: 400;
		line-height: 1.2;
		color: var(--color-inkblue);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	/* Smaller, and on its own line under the name — in a picker a date disambiguates, it does not lead. */
	.pick-y {
		font: 400 11.5px/1.2 var(--font-open-sans, 'Open Sans', sans-serif);
		color: color-mix(in srgb, var(--color-inkblue) 72%, transparent);
		white-space: nowrap;
	}
	/* UNDER THE POINTER IS A SHADOW, NEVER A FILL — a fill erases the line-status ground, which is the
	   one piece of information the paper carries. */
	.pick.on {
		box-shadow: var(--chip-shadow-hover);
	}
	.picker-x {
		flex: none;
		border: 0;
		background: none;
		cursor: pointer;
		font-size: 18px;
		line-height: 1;
		padding: 0 2px;
		color: color-mix(in srgb, var(--color-inkblue) 45%, transparent);
	}
	.picker-x:hover {
		color: var(--color-inkblue);
	}
</style>
