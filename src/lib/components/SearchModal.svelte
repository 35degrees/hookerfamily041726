<script lang="ts">
	/**
	 * SearchModal — the box, the chips and the results.
	 *
	 * FIRST PASS, deliberately: the box, the category chips, the result rows and the keyboard. The
	 * year-range slider and the "you can pick more than one" note are not here yet. What is here is
	 * enough to judge the ROW by eye against a ladder rung, which is the open design question.
	 *
	 * IT DOES NOT SEARCH. Every scan, filter, rank and cap lives in `search.svelte.ts`; this file
	 * reads `search.rows` and paints them. That is what lets connect-to-anyone reuse the same results
	 * with a different verb — the rows do not know what a click means.
	 *
	 * RESULTS DO NOT FLY, and that is a doctrine call rather than a shortcut. The ladder's premise is
	 * that every card is visible and you watch it take its seat (§44). Search breaks both halves: the
	 * list scrolls, so a stagger would animate rows nobody can see, and the query changes on every
	 * keystroke, so anything with weight is stale before it lands. §17.1 says weight is velocity; a
	 * list that re-sorts six times while you type "thomas" has no time to have any. The motion budget
	 * goes where it still means something — the veil coming in, and the exit into the card's flight.
	 */
	import { listYears as years } from '$lib/utils/dates';
	import { modal, closeModal } from '$lib/state/modal.svelte';
	import { ascension } from '$lib/state/ascension.svelte';
	import {
		search,
		load,
		setText,
		toggleCategory,
		toggleTag,
		clearTags,
		rollTags,
		selectAll,
		clear,
		remember,
		reasonFor,
		CAT,
		CATEGORIES,
		RESULT_CAP
	} from '$lib/state/search.svelte';
	import SearchYears from './SearchYears.svelte';
	import { linear, cubicOut } from 'svelte/easing';
	import { tick } from 'svelte';

	const VEIL_IN_MS = 340;
	const VEIL_BLUR = 10;
	/**
	 * THE EXIT, and the numbers come from measuring the whole handover rather than from taste.
	 *
	 * Filmed at 1440x900, clicking a result: the modal was gone at 390ms, and the incoming card sat
	 * parked off-screen at x=1512 until ~970ms before it began to travel. Nearly SIX HUNDRED
	 * MILLISECONDS of empty stage between the two — that is what reads as jarring, not the length of
	 * the fade.
	 *
	 * The gap itself is not a bug and is not mine to close: the design doc records the shipping CC
	 * transition as "two solid cards trading places with WEIGHT and an EMPTY-STAGE gap", deliberately.
	 * So the answer is to still be LEAVING while it happens instead of cutting to nothing.
	 *
	 * The ladder already had the shape: content goes, then the ground lifts, `veilOutDelay` holding the
	 * veil until every card has left plus a beat. Search had both on one clock, ending together, which
	 * is why it read as a cut rather than a dissolve.
	 */
	const PANEL_OUT_MS = 250;
	/** The ground waits for the panel to be most of the way gone — the ladder's VEIL_HOLD, same idea. */
	const VEIL_OUT_DELAY = 90;
	/**
	 * Still the slowest thing on screen, so the stage is uncovered rather than revealed — but trimmed a
	 * beat (Sam: "unnecessary to have that much"). 520 -> 430, and the hold 120 -> 90.
	 *
	 * THIS TRADES BACK SOME OF THE EMPTY BEAT, knowingly. The veil is what covers the CC transition's
	 * deliberate empty-stage gap, so a shorter fade means slightly longer with nothing on screen:
	 *
	 *   veil gone   empty beat
	 *      390ms       580ms     before any of this — read as a cut
	 *      745ms       236ms     the long version — read as too much
	 *      630ms       310ms     here
	 *
	 * All three rows MEASURED, not derived — the smoothstep's tail runs longer than the nominal
	 * duration suggests, so 430 + 90 lands near 630 rather than the 520 the arithmetic gives. That gap
	 * between the number in the code and the number on screen is exactly why these are filmed.
	 *
	 * The middle column is the one Sam is judging and the right column is what it costs; both are
	 * written down so the next tuning pass is not a blind one.
	 */
	const VEIL_OUT_MS = 430;

	const open = $derived(modal.kind === 'search');
	/** True from the moment a close begins until the transitions finish — see the pointer-events note. */
	let leaving = $state(false);
	$effect(() => {
		if (open) leaving = false;
	});

	/**
	 * THE PHOTO POPOUT, TAKEN FROM THE LADDER RATHER THAN REDERIVED (Sam: same hover effect, same
	 * larger display in the centre). The three things that make it work carry over exactly:
	 *
	 *   - it RESTS CENTRED in the window and swings 1.2x around the photo's own middle. Centring on the
	 *     cursor is FeaturedCard's model and it cannot work down a tall list — rows near either end
	 *     land mostly off-screen and the clamp pins them to 0px of travel.
	 *   - the height ceiling is 0.66, not FeaturedCard's 0.9. A box 90% of the window tall can only be
	 *     positioned across the remaining 10%, so the clamp swallows the whole gesture.
	 *   - every enlargement opens at the COLUMN's right edge, not the individual photo's, so the box
	 *     never drifts sideways from row to row.
	 */
	const ZOFFSET = 33;
	const AMPLIFY = 1.2;
	let zoom = $state<{
		src: string;
		alt: string;
		w: number;
		h: number;
		ax: number;
		dy: number;
	} | null>(null);

	function trackZoom(e: MouseEvent) {
		const img = e.currentTarget as HTMLImageElement;
		if (!img?.src) return;
		const r = img.getBoundingClientRect();
		const ar = img.naturalWidth ? img.naturalHeight / img.naturalWidth : 1;
		let w = Math.max(r.width * 2, window.innerWidth * 0.26);
		let h = w * ar;
		const k = Math.min(1, (window.innerWidth * 0.6) / w, (window.innerHeight * 0.66) / h);
		w *= k;
		h *= k;
		const pivot = r.top + r.height / 2;
		const offset = (e.clientY - pivot) * AMPLIFY;
		/**
		 * THE PHOTO COLUMN'S RIGHT EDGE — the ladder's own anchor, and now literally the same rule
		 * (`.rung .rung-photo` there, `.hit .photo` here), so the enlargement opens in the same
		 * relationship to its row in both places.
		 *
		 * I had moved this to the PANEL's right edge on the reasoning that opening over the list hid the
		 * row being hovered. That was solving a problem the ladder had already decided was not one: the
		 * popout belongs beside the photo it came from, mid-list, and pushing it out past the results
		 * broke the connection between the small picture and the large one. Sam: "it should be in the
		 * middle of the search bars just to the right of the photos."
		 *
		 * Anchoring to the COLUMN rather than to the hovered image is what keeps it from drifting
		 * sideways row to row — every row's photo shares one left edge, so one x serves all of them.
		 */
		const col = document.querySelector('.hit .photo');
		const ax = col ? col.getBoundingClientRect().right : r.right;
		zoom = { src: img.src, alt: img.alt || '', w, h, ax, dy: offset };
	}
	const closeZoom = () => (zoom = null);

	function zoomStyle(z: { w: number; h: number; ax: number; dy: number }): string {
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const left = Math.max(8, Math.min(z.ax + ZOFFSET, vw - z.w - 8));
		const top = Math.max(8, Math.min((vh - z.h) / 2 + z.dy, vh - z.h - 8));
		return `left:${left}px; top:${top}px; width:${z.w}px; height:${z.h}px;`;
	}

	/** Portal to <body> so no ancestor's clip or overflow can reach it. */
	function portalZoom(node: HTMLElement) {
		document.body.appendChild(node);
		return { destroy: () => node.remove() };
	}

	/**
	 * THE EDGE FADES ONLY WHERE THERE IS SOMETHING TO FADE INTO. A mask that softens the first row when
	 * nothing is above it is a lie in the same family as the hatch design §35.4 removed: a mark that
	 * says "there is more here" while there is not. Both ends are tracked so each fades only when the
	 * list actually runs past it.
	 */
	let atTop = $state(true);
	let atBottom = $state(true);
	function readEdges(node: HTMLElement | null) {
		if (!node) return;
		atTop = node.scrollTop <= 1;
		atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 1;
	}

	let input = $state<HTMLInputElement | null>(null);
	let listEl = $state<HTMLElement | null>(null);
	/** Which row the keyboard is on. Dies with the view, so it lives here and not in the module. */
	let cursor = $state(0);

	/**
	 * NO ORPHAN ON THE LAST ROW.
	 *
	 * Nine tags of wildly uneven length wrap unevenly, and the ugly case is one pill alone on a third
	 * row. `flex-wrap: balance` solves it in CSS and is used below — but it shipped in Chrome 150, so
	 * today it fixes this for almost nobody. This is the part that works now.
	 *
	 * MEASURE, DO NOT PREDICT. Every non-`balance` workaround in the article Sam sent needs the item
	 * width known in advance — container queries, conditional clamps, split groups — and these items
	 * are words of unpredictable length. So it renders, reads the pills' `top` values to find the rows,
	 * and if the last row holds exactly one, shows one tag fewer and looks again. Sam's brief was 8-10,
	 * so dropping to 8 is inside spec rather than a compromise.
	 *
	 * Bounded and floored: at most three trims, never below six, and it stops the moment the last row
	 * has company. Where `balance` IS supported no orphan ever forms, so this simply never fires.
	 */
	let tagShown = $state(0);
	async function trimOrphans() {
		for (let guard = 0; guard < 3; guard++) {
			await tick();
			const row =
				listEl?.parentElement?.querySelector('.tagrow') ?? document.querySelector('.tagrow');
			if (!row) return;
			const pills = [...row.querySelectorAll('.tagpill')];
			if (pills.length <= 6) return;
			const tops = pills.map((p) => Math.round(p.getBoundingClientRect().top));
			const last = tops[tops.length - 1];
			if (tops.filter((t) => t === last).length > 1) return;
			tagShown = pills.length - 1;
		}
	}
	$effect(() => {
		const pool = search.tagPool;
		tagShown = pool.length;
		if (pool.length) void trimOrphans();
	});

	$effect(() => {
		if (!open) return;
		// A NEW HANDFUL PER VISIT — the mechanic only works if opening the search twice offers two
		// different sets. `load()` resolves immediately once the index is warm, so the roll happens on
		// the same frame on every open after the first.
		void load()
			.then(() => rollTags())
			.catch(() => {});
		void tick().then(() => input?.focus());
	});

	/** A new result set invalidates the old cursor — otherwise Enter fires on a row that scrolled out
	 *  from under it. Reset to 0 rather than -1 so Enter always has a target: the top hit. */
	$effect(() => {
		void search.rows;
		cursor = 0;
		// A new set is a new scroll height, so the edges have to be re-read or a short list keeps the
		// bottom fade it inherited from a long one.
		void tick().then(() => readEdges(listEl));
	});

	/**
	 * THE PANEL ARRIVES WITH THE GROUND, NOT BEFORE IT.
	 *
	 * The first pass gave the veil a 340ms smoothstep and the panel nothing at all, so the ground
	 * faded up softly underneath a box that had already snapped into place — which is what read as a
	 * broken fade (Sam). Two elements of one gesture cannot be on different clocks; one of them being
	 * on NO clock is the worst version of that.
	 *
	 * A short drop rather than a scale: the panel is a sheet arriving over the tree, and 8px is enough
	 * to say "this came from somewhere" without competing with the card flight that a pick starts.
	 * cubicOut so it decelerates into place — §17.1, weight is velocity.
	 */
	function panel(_node: Element, { duration, delay = 0 }: { duration: number; delay?: number }) {
		return {
			delay,
			duration,
			easing: cubicOut,
			css: (t: number) => `opacity: ${t}; transform: translateY(${((1 - t) * -8).toFixed(2)}px);`
		};
	}

	function veil(_node: Element, { duration, delay = 0 }: { duration: number; delay?: number }) {
		return {
			delay,
			duration,
			easing: linear,
			// Alpha and blur on ONE `t` — an element's opacity does not scale the result of its own
			// backdrop-filter, so driving them separately blurs the tree before the ground arrives.
			css: (t: number) => {
				const e = t * t * (3 - 2 * t);
				const b = (VEIL_BLUR * e).toFixed(2);
				return `opacity: ${e}; backdrop-filter: blur(${b}px); -webkit-backdrop-filter: blur(${b}px);`;
			}
		};
	}

	async function moveCursor(delta: number) {
		const n = search.rows.length;
		if (!n) return;
		cursor = Math.max(0, Math.min(n - 1, cursor + delta));
		await tick();
		// `block: 'nearest'` and NOT smooth: smooth scrolling fights typing, because the next keystroke
		// arrives mid-animation and the list is still travelling when it re-renders.
		listEl?.querySelector('.hit.on')?.scrollIntoView({ block: 'nearest' });
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			// Two-stage: clear a query first, close only from an empty box. Escape on a full box almost
			// always means "wrong query", not "I'm done".
			if (search.text) setText('');
			else dismiss();
			return;
		}
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			void moveCursor(1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			void moveCursor(-1);
		} else if (e.key === 'Enter') {
			const row = search.rows[cursor];
			if (row) {
				e.preventDefault();
				(listEl?.querySelectorAll('.hit')[cursor] as HTMLElement | undefined)?.click();
			}
		}
	}

	function dismiss() {
		leaving = true;
		closeModal();
	}

	/**
	 * A PICK IS A CC ARRIVAL, and it must be launched from the STAGE, not from the row.
	 *
	 * The first version made the row a plain `<a href>` inside the modal and let `warmPersonLinks`
	 * pick it up. That was wrong in a way that looked broken rather than merely plain: a flight grows
	 * from the clicked anchor's RECT, so the incoming card grew out of a result row halfway up the
	 * overlay — Sam saw it "slide in over the existing hero card from the top" — and then the modal
	 * unmounted out from under the animation, which is where the flash back to the old card came from.
	 *
	 * The ladder solved this already and this is the same solution rather than a second one: synthesise
	 * an anchor AT THE FEATURED CARD'S OWN RECT and click it, so the one delegated handler in
	 * `warmPersonLinks` does all the work — flight lock, rect snapshot, tier span, pivot — and search
	 * inherits every one of them instead of reimplementing them badly.
	 *
	 * `data-cc="true"` and NOTHING ELSE. No `genDelta`, because a search result can be any distance
	 * from the reader and claiming a direction we have not measured would send lineal moves sideways;
	 * omitting it says "direction unknown", which is the truth and is what produces the ordinary
	 * lateral CC — inbound from the right while the old card leaves left. No `relationClass` either:
	 * the ladder can assert 'direct' because it is true by construction there, and here it is not.
	 *
	 * Closing FIRST and flying immediately is deliberate and is the ladder's rule too (Sam: "can the
	 * transition start immediately on click, no delay"): the veil lifts while the stage is already in
	 * motion underneath, so what you uncover is a flight in progress rather than one about to begin.
	 */
	function pick(e: MouseEvent, slug: string, f: number) {
		if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // let the browser have it
		e.preventDefault();
		remember(search.text);
		leaving = true;
		closeModal();
		/**
		 * A PICK ENDS THE SEARCH (Sam: "when someone is in search, finds the person they want, and clicks
		 * ... the whole search function should be reset and cleared").
		 *
		 * This narrows the module's standing rule rather than contradicting it. That rule exists for
		 * BROWSING — "pick Hartford Founders, click someone, come back, and the 12 are still on screen" —
		 * and it is still what happens when the modal is dismissed with Escape or the X. But a pick is not
		 * a dismissal: the reader asked a question, got an answer, and travelled to it. Re-opening onto
		 * the query that produced the card you are now standing on is the search equivalent of a stale
		 * far end, and `remember()` has already kept the query where it belongs.
		 *
		 * AFTER `closeModal()`, so the rows the exit choreography is still animating keep their data —
		 * the same ordering connect-to-anyone had to learn the hard way.
		 */
		clear();

		const stage = document.querySelector('.page-container') ?? document.body;
		const card = document.querySelector('.featured-card');
		const r = (card ?? stage).getBoundingClientRect();
		const a = document.createElement('a');
		a.href = `/person/${slug}`;
		a.dataset.cc = 'true';
		/**
		 * ORBIT FIGURES AND HARTFORD FOUNDERS DESCEND INTO THE ZONE (Sam) — Abraham Lincoln and
		 * William Pantry should arrive the way they arrive from a CC blade, foreground to background,
		 * not as an ordinary lateral card.
		 *
		 * `warmPersonLinks` already owns that decision and needs exactly one fact from us:
		 *   ascend = toOrbit === fromOrbit ? null : toOrbit ? 1 : -1
		 * so the flag is the whole handoff. It also makes the REVERSE free — picking an ordinary person
		 * while standing on Lincoln reads toOrbit=false against fromOrbit=true and ascends OUT.
		 *
		 * SET ONLY WHEN TRUE, never `'false'`: navigate.ts carries a scar about exactly this, where an
		 * absent attribute got read as a meaningful false and killed the core transition.
		 *
		 * The green founder skin needs nothing here. The zone is one mechanism and `hartford_founder`
		 * only re-colours it, read off the arriving person's own tags (ascension.svelte.ts §43.1).
		 */
		if (f & CAT.INFLUENCE) a.dataset.orbit = 'true';
		a.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;opacity:0;pointer-events:none;`;
		stage.appendChild(a);
		a.click();
		a.remove();
	}

</script>

{#if open}
	<div
		class="veil"
		class:zone={ascension.active}
		class:leaving
		in:veil={{ duration: VEIL_IN_MS }}
		out:veil={{ duration: VEIL_OUT_MS, delay: VEIL_OUT_DELAY }}
		onclick={dismiss}
		role="presentation"
	></div>

	<div class="search-layer" role="dialog" aria-modal="true" aria-label="Search the tree">
		<div
			class="panel"
			in:panel={{ duration: 300, delay: 40 }}
			out:panel={{ duration: PANEL_OUT_MS }}
		>
			<!-- THE LADDER'S HEADER, taken rather than reinvented: a title on the left, the X pushed right
			     by `margin-left: auto`, both in inkblue and told apart from the cards by WEIGHT and SIZE
			     rather than hue. ConnectModal records why they are not cream — §41.3, "cream ink is
			     defined entirely by the dark behind it", and marshmallow is a shade of the PAGE, so cream
			     on it is cream on cream. -->
			<div class="head">
				<span class="head-title">Search</span>
				<button type="button" class="head-x" onclick={dismiss} aria-label="Close search">
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
			<div class="box">
				<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
					<path
						fill="currentColor"
						d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
					/>
				</svg>
				<input
					bind:this={input}
					value={search.text}
					oninput={(e) => setText((e.currentTarget as HTMLInputElement).value)}
					onkeydown={onKey}
					type="text"
					placeholder={search.corpus
						? `Search ${search.corpus.toLocaleString()} people — a name, a place, a war, a school`
						: 'Search the tree — a name, a place, a war, a school'}
					autocomplete="off"
					spellcheck="false"
				/>
				{#if search.text}
					<button
						class="x"
						onclick={() => {
							setText('');
							input?.focus();
						}}
						aria-label="Clear"
					>
						&times;
					</button>
				{/if}
			</div>

			<div class="chips">
				<button class="chip" class:on={search.cats === 0} onclick={selectAll}>All</button>
				{#each CATEGORIES as c (c.mask)}
					<button
						class="chip chip-{c.key}"
						class:on={(search.cats & c.mask) !== 0}
						onclick={() => toggleCategory(c.mask)}
					>
						{c.label}
					</button>
				{/each}
			</div>

			<SearchYears />

			<!--
				THE TAG ROW — the way in for someone who does not have a question yet.
				Sam: 500-odd tags that are "fun and delightful or insightful that users would never know to
				search for". A search box can only answer a question you already have; this hands you one.
				Nine at random per visit, click to switch on, at most two.
				It stays visible while typing, because a tag is a way IN to a query rather than a
				refinement of one — and it sits between the years and the results so the three filters
				read top to bottom in the order they narrow.
			-->
			{#if search.tagPool.length}
				<div class="tagblock">
					<p class="tagtitle">Assorted tags <span>(optional)</span></p>
					<div class="tagrow">
						{#each search.tagPool.slice(0, tagShown) as t (t)}
							<button
								class="tagpill"
								class:on={search.tags.includes(t)}
								onclick={() => toggleTag(t)}
								title={search.tags.includes(t) ? 'Remove this tag' : 'Show everyone tagged this'}
								><!-- UNDERSCORES, like a real hashtag. The stored form is snake_case; factSegments turned
							     those into spaces so the words stay separately searchable, and this puts them back
							     for DISPLAY only — the value used to filter is still the spaced one. -->#{t.replace(
									/ /g,
									'_'
								)}</button
							>
						{/each}
					</div>
					<!-- Only once there is something to undo — the same rule the year readout follows. A
					     standing "clear" beside an empty selection is a control describing a state that is
					     not happening. -->
					{#if search.tags.length}
						<button class="tagclear" onclick={clearTags}
							>clear {search.tags.length === 1 ? 'tag' : 'tags'}</button
						>
					{/if}
				</div>
			{/if}

			{#if !search.idle}
				<!-- NO SILENT CAPS (§44). The count is the TRUE total and the line says plainly that only
				     RESULT_CAP are drawn — a query returning hundreds wants narrowing, and saying so is
				     what teaches the chips. -->
				<p class="count">
					{#if search.total === 0}
						No one matches.
					{:else if search.capped}
						{search.total.toLocaleString()} matches — showing the first {RESULT_CAP}. Narrow with a
						category.
					{:else}
						{search.total.toLocaleString()}
						{search.total === 1 ? 'match' : 'matches'}
					{/if}
				</p>
			{/if}

			<div
				class="results"
				class:at-top={atTop}
				class:at-bottom={atBottom}
				bind:this={listEl}
				onscroll={(e) => readEdges(e.currentTarget as HTMLElement)}
			>
				{#each search.rows as r, i (r.id)}
					{@const reason = reasonFor(r, search.term, search.terms, search.phrase)}
					<!-- A founder who is ALSO orbit takes the GREEN, because that is what the zone does: the
					     founder skin overrides the plain ascension, and eight of the eleven founders are
					     orbit. Deriving both here keeps search and the room agreeing on one precedence. -->
					{@const isFounder = (r.f & CAT.FOUNDER) !== 0 && r.id !== 'H00001'}
					{@const isOrbit = (r.f & CAT.INFLUENCE) !== 0 && !isFounder}
					<a
						class="person-box hit flex overflow-hidden rounded-lg"
						class:on={i === cursor}
						class:hooker-line={(r.f & CAT.HD) !== 0}
						class:spouse-line={(r.f & CAT.SPOUSE) !== 0}
						class:ee-line={(r.f & CAT.INLAW) !== 0}
						class:founder-row={isFounder}
						class:orbit-row={isOrbit}
						href="/person/{r.slug}"
						onclick={(e) => pick(e, r.slug, r.f)}
						onmouseenter={() => (cursor = i)}
					>
						<div class="photo aspect-square shrink-0 bg-stone-100">
							{#if r.ph}
								<img
									src={r.ph}
									alt={r.n}
									class="h-full w-full object-cover object-top"
									loading="lazy"
									onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
									onmouseenter={trackZoom}
									onmousemove={trackZoom}
									onmouseleave={closeZoom}
								/>
							{/if}
						</div>
						<!-- THE STAR IS A GUTTER, NOT A PREFIX, and its OWN column rather than an item on the
						     name's baseline — so it centres against the card's height instead of riding the
						     first line. Reserved whether or not it is filled, so every name starts at the same
						     x: a star that shoved its own name rightward would make the column ragged and the
						     notables harder to scan, which is the opposite of the point. -->
						<span
							class="star"
							class:has={r.nb}
							title={r.nb ? 'Notable person' : undefined}
							aria-hidden={!r.nb}>{r.nb ? '★' : ''}</span
						>
						<div class="text-area flex min-w-0 flex-col justify-center">
							<span class="line1">
								<span class="nm">{r.n}</span>
								<span class="yr">{years(r)}</span>
							</span>
							<span class="line2">
								{#if reason}
									<span class="tag">{reason.tag}</span>{reason.text}
								{:else if r.bl}
									{r.bl}
								{/if}
							</span>
						</div>
					</a>
				{/each}
			</div>
		</div>

		{#if zoom}
			<div use:portalZoom class="zoom-float" style={zoomStyle(zoom)} aria-hidden="true">
				<img src={zoom.src} alt={zoom.alt} />
			</div>
		{/if}
	</div>
{/if}

<style>
	/* THE MARSHMALLOW VEIL. Same ground as the ladder's, and deliberately the same values rather than
	   an approximation of them: two overlays over the same tree that agreed only roughly would read as
	   a bug the moment you opened one after the other.
	   TODO once the third overlay lands: this and ConnectModal's veil want extracting into the shared
	   shell `modal.svelte.ts` already describes. Left duplicated for now rather than refactoring a
	   working ladder to make room for a first-pass search. */
	/* ONCE A CLOSE HAS STARTED THE VEIL IS SCENERY. It outlives the modal by half a second now, and a
	   full-screen element with a click handler sitting over a stage that is already flying would eat
	   the next click and offer a second dismiss for something already dismissed. */
	.veil.leaving {
		pointer-events: none;
	}
	.veil {
		position: fixed;
		inset: 0;
		z-index: 40;
		background: radial-gradient(
			120% 90% at 50% 42%,
			rgba(228, 226, 216, 0.36) 0%,
			rgba(222, 220, 210, 0.43) 55%,
			rgba(216, 214, 204, 0.49) 100%
		);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
	}
	/**
	 * IN THE ZONE THE VEIL COVERS FAR MORE, and the reason is §29 exactly: these alphas are a property
	 * of the PAIR, and they were measured against parchment. Measured composites at 1440x900:
	 *
	 *                        result row   featured card THROUGH the veil   bare veil
	 *   parchment              L253              L224                        L216
	 *   ascension (midnight)   L253              L220                        L110   <-
	 *   founder (green)        L253              L226                        L147   <-
	 *
	 * The row-against-card contrast was never the problem — it is 29 / 33 / 27, near enough the same
	 * everywhere. What breaks is the FIELD'S UNIFORMITY. On parchment the backdrop is one flat
	 * marshmallow: the card behind it reads 224 against a 216 surround, a difference of eight, so
	 * there is nothing there to compete with the results. Over midnight the same alphas leave a 220
	 * blob sitting in a 110 surround — a difference of a hundred and ten — and that bright patch in
	 * the middle of a dark screen is the "big white blob" Sam is looking at.
	 *
	 * So the fix is not more contrast between the rows and their ground; it is making the GROUND one
	 * thing again. Raising coverage does both at once: the surround comes up toward marshmallow and
	 * the blob flattens into it, because how much of anything shows through is exactly (1 - alpha).
	 *
	 * The tree very nearly disappears behind this, and that is the trade. In the zone the thing behind
	 * the veil is a room the reader has already arrived in; while the search is open it is a backdrop,
	 * and a backdrop that competes with the list is worse than one you cannot quite see.
	 */
	/**
	 * HALFWAY (Sam) — 0.94/0.96/0.975 left nothing visible beneath, which is the opposite failure.
	 *
	 * The two goals are DIRECTLY OPPOSED and it is worth writing down why, so nobody tunes one of them
	 * again without knowing the cost: how much of the room shows through is (1 - alpha), and so is how
	 * much of the featured card shows through. Every step that reveals the zone re-reveals the blob in
	 * exactly the same proportion. There is no value that gets both.
	 *
	 * Measured, at 1440x900, over midnight:
	 *
	 *   alphas             bare   blob   blob-bare Δ   row-bare Δ
	 *   0.36/0.43/0.49      112    222       110           141    original — blobby
	 *   0.68/0.72/0.76      171    226        55            82
	 *   0.74/0.78/0.82      183    226        43            70    <- this
	 *   0.80/0.84/0.88      194    227        33            59
	 *   0.94/0.96/0.975     219    229        10            34    too covered
	 *
	 * This sits where the blob is down 61% from where it started while roughly a fifth of the room
	 * still comes through, and the rows still clear their field by 70 — more than they do on
	 * parchment, where the same measurement is 37.
	 */
	.veil.zone {
		background: radial-gradient(
			120% 90% at 50% 42%,
			rgba(233, 231, 223, 0.74) 0%,
			rgba(229, 227, 219, 0.78) 55%,
			rgba(224, 222, 214, 0.82) 100%
		);
	}
	.search-layer {
		position: fixed;
		inset: 0;
		z-index: 41;
		display: flex;
		flex-direction: column;
		align-items: center;
		/* Not centred: the box sits high so the results have room to grow DOWNWARD from it. A centred
		   box would walk up the screen as results arrived, which is §30's "the stage must not move". */
		padding-top: 12vh;
		pointer-events: none;
	}
	.panel {
		/**
		 * THE FOUR STRIPES, DEFINED ONCE HERE and read by both the result rows and the category chips.
		 * A selected chip is now a preview of the rows it will produce (Sam), which means two surfaces
		 * share every one of these values — and every time in this feature that one colour has lived in
		 * two places, the two have drifted. Cascading them from the panel is the smallest fix that makes
		 * drift impossible rather than merely unlikely.
		 */
		/* ONE OPAQUE ACCENT PER CATEGORY, and both strengths derived from it — the 50% that draws the
		   stripe and the 10% that washes a selected chip's interior. Writing the two strengths as
		   separate literals would be the same two-readers-of-one-colour trap one level down: someone
		   re-tunes the stripe, the wash stays behind, and the chip stops matching its own edge. */
		--accent-hd: rgb(212, 175, 55);
		--accent-spouse: hsl(158 45% 45%);
		--accent-ee: var(--color-ascendmidnight);
		--stripe-hd: color-mix(in srgb, var(--accent-hd) 50%, transparent);
		--stripe-spouse: color-mix(in srgb, var(--accent-spouse) 50%, transparent);
		--stripe-ee: color-mix(in srgb, var(--accent-ee) 50%, transparent);
		--stripe-dark: rgba(255, 255, 255, 0.9);
		pointer-events: auto;
		/* 680px was a search-engine's width, not this app's — a name and a short reason left most of a
		   row empty and the eye had to travel the gap. 520 keeps the pair close enough to read as one
		   line of information. */
		width: min(520px, 92vw);
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	/* QUIETER (Sam: "the search is so wide, and the font you use for text box placeholder is big").
	   The COUNT stays — he wants the tree's size said out loud — so the line is shortened by setting it
	   smaller rather than by dropping what it says. 52 -> 42 and 16 -> 13.5 together take the box from
	   the loudest element in the modal to the same voice as the rows it produces. */
	.box {
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
	.box svg {
		width: 15px;
		height: 15px;
		flex: none;
		color: rgba(60, 54, 44, 0.42);
	}
	.box input {
		flex: 1;
		min-width: 0;
		border: 0;
		background: none;
		outline: none;
		font: 400 13.5px/1 var(--font-open-sans, 'Open Sans', sans-serif);
		color: #2b2620;
	}
	.box input::placeholder {
		color: rgba(60, 54, 44, 0.38);
	}
	.x {
		border: 0;
		background: none;
		cursor: pointer;
		font-size: 20px;
		line-height: 1;
		color: rgba(60, 54, 44, 0.45);
		padding: 0 2px;
	}
	.x:hover {
		color: rgba(60, 54, 44, 0.8);
	}

	/* ONE LINE, NO WRAP (Sam). Six labels have to share the panel's 520px, so the type comes down and
	   the padding tightens rather than the labels being abbreviated — a shortened category name is a
	   different name, and these are the words the rest of the app uses. */
	.chips {
		display: flex;
		flex-wrap: nowrap;
		justify-content: center;
		gap: 3px;
		/**
		 * THE CHIP ROW IS WIDER THAN THE PANEL, ON PURPOSE.
		 *
		 * Six labels need 625px at legible type and the panel is 520 — measured, not estimated. The
		 * three ways to close a 105px gap are: shrink the type (9px, which is smaller than anything else
		 * in the modal), abbreviate the labels (a shortened category name is a different name, and these
		 * are the words the rest of the app uses), or let this one row be wider than the rows below it.
		 * The last costs nothing: it stays centred on the same axis, and the RESULTS keep the 520 Sam
		 * asked for, which is the width that actually governs reading.
		 *
		 * `left: 50%` + `translateX(-50%)` centres an element wider than its parent. Capped at 96vw so a
		 * narrow window falls back to shrinking chips rather than overflowing the screen.
		 */
		width: max-content;
		max-width: 96vw;
		position: relative;
		left: 50%;
		transform: translateX(-50%);
	}
	.chip {
		flex: 0 1 auto;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font: 500 10.5px/1 var(--font-inter, sans-serif);
		letter-spacing: 0.01em;
		/* SQUARED OFF (Sam) — 4px, which is the card's 8px halved, so a chip reads as a smaller member of
		   the same family rather than as a pill from somewhere else. */
		padding: 7px 7px;
		border-radius: 4px;
		cursor: pointer;
		border: 1px solid rgba(60, 54, 44, 0.18);
		background: rgba(255, 253, 247, 0.72);
		color: rgba(60, 54, 44, 0.72);
		transition:
			background 150ms ease-out,
			color 150ms ease-out,
			border-color 150ms ease-out;
	}
	.chip:hover {
		border-color: rgba(60, 54, 44, 0.34);
		color: rgba(60, 54, 44, 0.95);
	}

	/* ── A SELECTED CHIP IS A PREVIEW OF ITS ROWS ───────────────────────────────────────────────────
	   Sam: "when Major Influences is selected, that button should have the same midnight blue
	   background and white stripe. When Spouses is selected that button should be mint green with the
	   green stripe (with some mint green on the outside of stripe)."
	   So the chip takes its category's GROUND and its STRIPE, by the same 2px-mask/3.5px-ring mechanism
	   the rows use and from the same four tokens — the outer 2px of ground is what puts colour outside
	   the stripe. The border is dropped when selected, because the stripe is now the edge. */
	.chip.on {
		border-color: transparent;
		box-shadow:
			inset 0 0 0 2px var(--chip-bg),
			inset 0 0 0 3.5px var(--chip-stripe);
		/* THE WASH IS WHY A SELECTED LIGHT CHIP READS AS SELECTED AT ALL (Sam: "shade the interior…
		   so it feels more selected but just barely"). --hd-bg, --spouse-bg and --ee-bg are all
		   near-whites — that is their whole job as card grounds — so a chip wearing one was very nearly
		   the unselected chip. 10% of its own accent over that ground is enough to register and little
		   enough that the stripe is still the thing announcing it.
		   Layered as a gradient over the ground rather than mixed into it, so --chip-bg stays the exact
		   card colour that the 2px mask paints outside the stripe. */
		background:
			linear-gradient(var(--chip-wash, transparent), var(--chip-wash, transparent)), var(--chip-bg);
		color: var(--chip-ink);
	}
	/* ALL has no row to preview — it is the absence of a filter — so it takes a neutral slate rather
	   than borrowing a category's colour and claiming to be one. */
	/* ALL TAKES NO STRIPE (Sam). It is the ABSENCE of a filter, so it has no category edge to preview
	   and no ground to borrow — a solid neutral says "nothing is narrowing this" without pretending to
	   be a sixth category. The box-shadow is cleared rather than given a transparent ring, so nothing
	   is left implying a mark that is not drawn. */
	.chip.on:not(.chip-hd):not(.chip-spouse):not(.chip-ee):not(.chip-orbit):not(.chip-founder) {
		--chip-bg: #2f3a52;
		--chip-ink: #f4efe4;
		box-shadow: none;
	}
	.chip-hd.on {
		--chip-bg: var(--hd-bg);
		--chip-stripe: var(--stripe-hd);
		--chip-wash: color-mix(in srgb, var(--accent-hd) 10%, transparent);
		--chip-ink: var(--color-inkblue);
	}
	.chip-spouse.on {
		--chip-bg: var(--spouse-bg);
		--chip-stripe: var(--stripe-spouse);
		--chip-wash: color-mix(in srgb, var(--accent-spouse) 10%, transparent);
		--chip-ink: var(--color-inkblue);
	}
	.chip-ee.on {
		--chip-bg: var(--ee-bg);
		--chip-stripe: var(--stripe-ee);
		--chip-wash: color-mix(in srgb, var(--accent-ee) 10%, transparent);
		--chip-ink: var(--color-inkblue);
	}
	.chip-orbit.on {
		--chip-bg: var(--color-ascendmidnight);
		--chip-stripe: var(--stripe-dark);
		--chip-ink: var(--color-creamprimary);
	}
	.chip-founder.on {
		--chip-bg: var(--color-foundergreen);
		--chip-stripe: var(--stripe-dark);
		--chip-ink: var(--color-creamprimary);
	}

	/* Centred, a tenth smaller, a fifth quieter (Sam). It is a status line under a control, not a
	   heading over a list — 12 -> 10.8px and 0.62 -> 0.5 alpha. */
	/**
	 * SMALLER THAN THE CATEGORY CHIPS (Sam) and wrapped to two or three centred rows. They are
	 * suggestions rather than controls, so they sit below the chips in weight as well as in position:
	 * 10.5 -> 9px, and no ground at all until one is chosen.
	 *
	 * NO STRIPE ON THE SELECTED STATE (Sam: "just in a standard styleing no stripe"). The stripe means
	 * a LINE — blood, marriage, in-law, the founder's room — and it is load-bearing everywhere else in
	 * this modal. A tag is not a line, and borrowing the mark would say it was.
	 */
	.tagrow {
		display: flex;
		/* `balance` where it exists (Chrome 150+), plain `wrap` everywhere else — an unknown value makes
		   the declaration invalid and the browser keeps the previous one, which is the whole progressive
		   -enhancement trick. `trimOrphans` covers the everywhere-else case. */
		flex-wrap: wrap;
		flex-wrap: balance;
		justify-content: center;
		gap: 5px;
		padding: 0 8px;
		max-width: 100%;
	}
	/* `.tagpill`, NOT `.tag` — `.tag` is already the match-reason field label in this same component
	   (the small uppercase BORN / SERVED / SCHOOL before a reason), so the first version silently
	   inherited its `text-transform: uppercase` and 0.07em tracking and came out shouting. A collision
	   inside one component's scoped styles, which is the kind scoping does not protect you from. */
	/* A LABEL, because a row of unexplained hashtags is a puzzle rather than an invitation.
	   "(optional)" is Sam's and does real work: sitting between two filters that DO narrow, an
	   unlabelled row of pills reads like something you are expected to pick from. */
	/* ONE BLOCK, so ONE gap governs the space between the label and the pills. They used to be separate
	   children of `.panel`, which meant the panel's own 10px gap PLUS the title's 3px margin — 13px,
	   and halving it (Sam) is not something either value could do alone. */
	.tagblock {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.tagtitle {
		margin: 0;
		text-align: center;
		font: 400 10.5px/1.3 var(--font-inter, sans-serif);
		letter-spacing: 0.03em;
		/* DARKENED (Sam). At 55/35 the label — and "(optional)" especially — was faint enough to read as
		   something showing THROUGH from another layer rather than as text belonging to this one. On a
		   veil that is deliberately letting the room beneath show, anything under about two-thirds
		   strength stops looking authored. */
		color: color-mix(in srgb, var(--color-inkblue) 78%, transparent);
	}
	.tagtitle span {
		color: color-mix(in srgb, var(--color-inkblue) 58%, transparent);
	}
	/**
	 * NAVY AT HALF STRENGTH, and BIGGER (Sam) — the cream pass went too far the other way: 9px of warm
	 * grey on a cream fill was quiet to the point of being unreadable, which is a worse failure than
	 * the navy that was too loud, because at least the loud one could be read.
	 *
	 * THE BLUE IS `--color-inkblue`, NOT `--color-ascendmidnight`, and that is a correction. Midnight
	 * was the obvious pick by name and it came out grey — Sam: "looks black or grey". Measured at 65%
	 * over the pill's white:
	 *
	 *   --color-ascendmidnight  rgb(99,103,112)   blue-minus-red  13   reads grey
	 *   --color-inkblue         rgb(109,116,133)                  24   reads blue
	 *   --color-founderblue     rgb(89,109,146)                   57   strongly blue
	 *
	 * #0f1626 has almost no chroma. It reads BLUE as a large dark field — which is the only job it has
	 * in the zone — and GREY as thin ink at low opacity. §29 says a value belongs to the pair (colour,
	 * ground); this is the same lesson with AREA as the third term, and the third one that has caught
	 * me: the descent gold failed the same way going from a name to a hairline.
	 *
	 * `--color-founderblue` is bluer still, and is deliberately not used — it is the founder zone's
	 * rule colour and carries that meaning.
	 *
	 * The type goes 9 -> 10.5px, the category chips' size. Matching them is fine now that the WEIGHT is carried by opacity rather
	 * than by a filled ground: a half-strength outline beside a solid chip still reads as the quieter
	 * of the two, at a size that can actually be read.
	 *
	 * NO FILL UNTIL SELECTED. An empty pill is an offer; a filled one is a state.
	 */
	.tagpill {
		border: 1px solid color-mix(in srgb, var(--color-inkblue) 65%, transparent);
		/**
		 * AN OPAQUE INTERIOR, and "no fill until selected" was simply wrong. §29 already records why for
		 * the cards — a card cannot be translucent, it shows what is behind it through itself — and a
		 * pill is the same object at a smaller size. With no fill these sat over a veil that is
		 * deliberately letting the blurred room through, so the featured card read STRAIGHT THROUGH
		 * them: they looked like holes punched in the overlay rather than things resting on it.
		 *
		 * `--hd-bg` (Sam) — the warm near-white a Hooker descendant's card is made of, not
		 * `--color-creamprimary`, which is the ZONE'S ink-on-dark and reads muddy out here on paper. A
		 * pill is then literally a small piece of the same stock as the rows below it.
		 */
		/* 60% (Sam). Not the 0% it started at — that was the hole-in-the-overlay failure — but not fully
		   opaque either: at 60 over the marshmallow the pill still reads as a solid object while the
		   veil's warmth comes through it, which is what keeps nine of them from becoming a white block. */
		background: color-mix(in srgb, var(--hd-bg, #fffdf8) 60%, transparent);
		color: color-mix(in srgb, var(--color-inkblue) 65%, transparent);
		font: 400 10.5px/1 var(--font-inter, sans-serif);
		letter-spacing: 0.01em;
		padding: 5px 9px;
		border-radius: 999px;
		cursor: pointer;
		white-space: nowrap;
		transition:
			background-color 140ms ease-out,
			border-color 140ms ease-out,
			color 140ms ease-out;
	}
	.tagpill:hover {
		border-color: color-mix(in srgb, var(--color-inkblue) 85%, transparent);
		color: color-mix(in srgb, var(--color-inkblue) 90%, transparent);
	}
	/* SELECTED IS A 20% NAVY FILL (Sam). The ink goes to full strength with it — at 50% over its own
	   20% wash the text would have less contrast selected than unselected, which is backwards. */
	/* The 20% navy is LAYERED OVER the cream rather than replacing it, so a selected pill stays as
	   opaque as an unselected one — the same reason the category chips wash their ground instead of
	   mixing into it. */
	.tagpill.on {
		background:
			linear-gradient(
				color-mix(in srgb, var(--color-inkblue) 20%, transparent),
				color-mix(in srgb, var(--color-inkblue) 20%, transparent)
			),
			color-mix(in srgb, var(--hd-bg, #fffdf8) 60%, transparent);
		border-color: color-mix(in srgb, var(--color-inkblue) 75%, transparent);
		color: var(--color-inkblue);
	}
	/* THE LADDER'S PROPORTIONS: 34px hit area, inkblue at 0.55 lifting to 1, the title uppercase and
	   letterspaced so the chrome reads as chrome beside solid cards. Sized to the panel rather than the
	   ladder's 440px, since that is the column it belongs to here. */
	.head {
		display: flex;
		align-items: center;
		gap: 14px;
	}
	/**
	 * PULLED IN OFF THE EDGE (Sam: "the 'SEARCH' text title on left side above search input box too far
	 * left just pull it in").
	 *
	 * It sat flush with the panel's left edge, which is the BOX's edge and not the box's text — the
	 * placeholder starts ~36px further in, past the padding and the magnifier — so the title read as
	 * hanging off the side of everything below it. The X earns its 6px overhang optically (its glyph is
	 * inset within a 34px target); the title has no such excuse, so it takes the same 6px inward.
	 */
	.head-title {
		margin-left: 6px;
		font-family: var(--font-opensans, 'Open Sans', sans-serif);
		font-size: 14px;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-inkblue);
		opacity: 0.83;
	}
	.head-x {
		margin-left: auto;
		/* Same six pixels as the ladder's, for the same reason — a 22px glyph centred in a 34px target.
		   Measured: panel edge 973, glyph 967. */
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
	.head-x:hover,
	.head-x:focus-visible {
		opacity: 1;
		outline: none;
	}
	/* Very small and underlined (Sam) — a link's manners rather than a button's, because it undoes a
	   choice rather than making one. No ground, no border, so nothing about it competes with the pills
	   it sits under. */
	.tagclear {
		align-self: center;
		margin-top: 1px;
		border: 0;
		background: none;
		padding: 0;
		font: 400 9px/1.3 var(--font-inter, sans-serif);
		letter-spacing: 0.03em;
		text-decoration: underline;
		text-underline-offset: 2px;
		color: color-mix(in srgb, var(--color-inkblue) 55%, transparent);
		cursor: pointer;
		transition: color 140ms ease-out;
	}
	.tagclear:hover {
		color: var(--color-inkblue);
	}
	.count {
		margin: 0 2px;
		text-align: center;
		font: 400 10.8px/1.4 var(--font-inter, sans-serif);
		color: rgba(48, 42, 34, 0.5);
	}

	/**
	 * THE SCROLL EDGE DISSOLVES, AND THE BAR STOPS LOOKING LIKE A BROWSER'S.
	 *
	 * Two changes, and the first is the one that matters. A native scroll area ends in a HARD CUT — a
	 * row is sliced mid-height at the top and bottom of the box — and then a widget is bolted on to
	 * explain that there is more. This app has an answer for "there is more here than you can see" and
	 * it is not a widget: design §35.4, the rail softens an uncertain end rather than marking it, and
	 * the hatch was REMOVED for being a second channel saying what the dissolve already said. So the
	 * list fades at both ends and the rows pass out of view instead of being cut off.
	 *
	 * The bar itself then only has to stop announcing itself: no track, a thin warm-ink pill in the
	 * same ink as everything else here, darkening under the pointer. Sam liked the pill; what made it
	 * read as a browser was the white channel it sat in.
	 */
	.results {
		display: flex;
		flex-direction: column;
		gap: 6px;
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: rgba(48, 42, 34, 0.22) transparent;
		--fade-top: 16px;
		--fade-bottom: 20px;
		-webkit-mask-image: linear-gradient(
			to bottom,
			transparent 0,
			#000 var(--fade-top),
			#000 calc(100% - var(--fade-bottom)),
			transparent 100%
		);
		mask-image: linear-gradient(
			to bottom,
			transparent 0,
			#000 var(--fade-top),
			#000 calc(100% - var(--fade-bottom)),
			transparent 100%
		);
		/* The list scrolls; the box above it does not move. */
		max-height: calc(88vh - 12vh - 180px);
		padding: 2px 2px 14px;
	}

	/* At an end, that end is square: 0 collapses the gradient stop so the mask is fully opaque there. */
	.results.at-top {
		--fade-top: 0px;
	}
	.results.at-bottom {
		--fade-bottom: 0px;
	}
	.results::-webkit-scrollbar {
		width: 7px;
	}
	.results::-webkit-scrollbar-track {
		background: transparent;
	}
	.results::-webkit-scrollbar-thumb {
		background: rgba(48, 42, 34, 0.2);
		border-radius: 999px;
		/* An inset border rather than a narrower thumb: it keeps the pill off the rows without the
		   track reappearing as a visible channel. */
		border: 2px solid transparent;
		background-clip: content-box;
	}
	.results::-webkit-scrollbar-thumb:hover {
		background: rgba(48, 42, 34, 0.42);
		background-clip: content-box;
	}

	/* THE ROW — a rung's material at a rung's shorter cousin's height.
	   A ladder rung is 72.8px because it was built to hold a portrait AND a blurb. In search that is
	   the wrong size for the corpus, not just for the screen: 16% of people have a photo, 16% have a
	   blurb, and 77% have NEITHER, so three rows in four would be a tall card holding a name and a lot
	   of air — and at that pitch you would see under eight at a time. This is ~54px, so ten or eleven
	   are in view, with the same paper, the same rose shadow and the same click. */
	/**
	 * A RESULT ROW IS A `.person-box`. Not a list item that resembles one — the same class every chip,
	 * sibling and ladder rung in the app already is, so it inherits the whole system rather than
	 * approximating it: `--chip-shadow`, the line-status grounds (hooker banana-cream, spouse, easter
	 * egg, orbit stone), the `--line-edge` spine, and `a.person-box:hover`'s shadow.
	 *
	 * The first version was a bespoke card with its own paper, its own shadow and an inset 38px rounded
	 * thumbnail — a generic search-result avatar, which is exactly what it looked like. Sam: "it's like
	 * you just came in off the street and didn't review my design." The house had already answered every
	 * one of those questions and the answers were three files away.
	 *
	 * Only the size is stated here. Everything else is the house.
	 */
	.hit {
		height: 54px;
		/* `flex: none` IS LOAD-BEARING, not tidiness. `.results` is a column flex container that
		   overflows, and a flex item's default `flex-shrink: 1` applies to a definite height just as it
		   does to a basis — so swapping min-height for height handed the browser permission to compress
		   every row, and it did: 54px became 33px at three viewports and 39px at a fourth. `min-height`
		   had been quietly preventing that all along. */
		flex: none;
		text-decoration: none;
		cursor: pointer;
	}
	/**
	 * THE PHOTO IS SIZED, NOT INFERRED — and leaving it inferred is what made John Talcott's row grow.
	 *
	 * PersonBox writes an explicit width onto this box (`{photoW}`) and I dropped it when porting the
	 * pattern, leaving `aspect-square shrink-0` to work the size out from the stretched row height.
	 * That is circular: the row's height depends on its content, the photo is content, and with
	 * `shrink-0` the box can never be squeezed back down. Whichever way a given browser breaks the
	 * cycle, the input is the image's INTRINSIC size — and Talcott's source is 720x962, three times
	 * every other founder's — so his was the row that escaped.
	 *
	 * It did not reproduce here at 1440x900, at 2x, at 92vw or at 560px, which is exactly why the fix
	 * is to remove the circularity rather than to tune a number until the screenshot looks right: a
	 * definite width and a definite row height cannot resolve differently under any of them.
	 */
	.hit .photo {
		width: 54px;
	}
	/* And the text cannot grow the row either: one line each, clipped. A long name used to be the other
	   way in. */
	.hit .line1 {
		white-space: nowrap;
		overflow: hidden;
	}

	/* ── THE FOUNDER ROW ────────────────────────────────────────────────────────────────────────────
	   A Hartford founder carries the zone's own ground into the list, so the room you are about to
	   enter is legible before you click. `--color-foundergreen` is the token the veil's middle stop and
	   the founder TITLE already read — taken by name, so the row cannot drift away from the room it
	   names.

	   THOMAS HOOKER IS EXCLUDED, and by the same test ascension.svelte.ts uses: `id !== 'H00001'`. He
	   carries the tag — he did found Hartford — but he is the tree's origin rather than one of its
	   orbiting figures, and the zone already refuses him. A second, looser rule here would have let
	   search disagree with the room.

	   THE RING IS RESTATED WITH THE DROP SHADOW AFTER IT, which is layout.css's standing instruction:
	   a ring and a shadow are different jobs sharing one property, so any rule that sets a ring must
	   re-state the shadow or silently delete it. */
	/* ── A MAJOR INFLUENCE ──────────────────────────────────────────────────────────────────────────
	   Not "any old easter egg" (Sam) — an orbit figure is someone the tree reaches ONLY by
	   cross-connection, with no family-id link into it at all, which is what `computeOrbit` derives and
	   what the Major Influences chip already selects. Abraham Lincoln is the type. Their row takes the
	   ascension's own midnight for the same reason a founder's takes the green: the room is legible
	   before the click.

	   The two share everything but the colour, so the stripe, the ink and the shadow are written once
	   below and only `--card-bg` differs. */
	.hit.orbit-row {
		--card-bg: var(--color-ascendmidnight);
	}
	.hit.founder-row {
		--card-bg: var(--color-foundergreen);
	}
	/* A BLOODLINE ROW GETS THE SAME BAND IN GOLD LEAF.
	   It began as `--color-descentgold` (#827400), the ink of the card's own "Sixth Generation
	   Descendant of Thomas Hooker". Same claim, wrong value — Sam: "ouch". That hex is INK ON PAPER at
	   ~14px, where its darkness is legibility; drawn as a 1.5px rule on banana-cream the darkness is all
	   you see and it reads as an olive scratch. §29 is exactly this: a value is a property of the PAIR,
	   so a colour that works as text does not transfer to a hairline on the same ground.
	   Gold leaf rather than olive — lighter, yellow-forward — and at 70% so it sits ON the paper like
	   leaf rather than ruling a line across it.
	   NOT tied to ShuffleNotables' #e8c66d either, for the same §29 reason in the other direction: that
	   gold was measured against dark glass, this one against cream, and binding them would mean tuning
	   one breaks the other.
	   Only the stripe changes here. The ground stays --hd-bg and the ink stays inkblue, because this row
	   is LIGHT and §41.3's cream is for dark grounds only.
	   Declared BEFORE the dark rows so source order settles a row carrying both — the room outranks the
	   line. */
	/* ALL THREE LIGHT ROWS TAKE THE SAME STRIPE AT THE SAME 50%, differing only in hue, so the list says
	   which of the four kinds of person a row is without a legend.
	   
	   THE HUES ARE THE POINT, and the first pass got two of three wrong by reaching for the house's
	   dormant spine tokens: --spouse-edge is hsl(172, ...) and --ee-edge was hsl(198, ...). 172 is TEAL
	   and 198 is CYAN — both land in aqua, so the mint row and the blue row came out siblings of each
	   other rather than of their own grounds. Sam: "too aqua", and "light blue is not derivative of
	   aqua, make it a blue."
	   
	   So the mint stripe takes hue 158, which is --spouse-bg's OWN hue (#f3fefa sits there) — literally
	   a shade darker than the mint it sits on, which is what was asked for. The in-law stripe goes to
	   215, a true blue, and DELIBERATELY LEAVES its ground's hue of 198 behind: that ground is cyan-ish
	   and inheriting it is what produced the aqua in the first place. This is the one place the stripe
	   is not derived from its ground, and the reason is that the ground is the problem.
	   
	   THE SPINE TOKENS ARE LEFT ALONE. --spouse-edge and --hd-edge are Sam's, tuned for a 4px vertical
	   spine and explicitly preserved through its reversion ("the colours are left exactly as they were
	   tuned"). A 1.5px ring at 50% is a different pair (§29), so it gets its own values rather than
	   re-tuning colours that belong to a different feature. */
	.hit.hooker-line {
		--stripe: var(--stripe-hd);
	}
	.hit.spouse-line {
		--stripe: var(--stripe-spouse);
	}
	.hit.ee-line {
		/* MIDNIGHT BLUE (Sam), after two attempts at a mid blue both read aqua once composited. This is
		   `--color-ascendmidnight` — the ascension's own ground — so the in-law stripe is not a fourth
		   invented colour but the room these figures orbit, and at 50% it composites to a slate that
		   cannot be mistaken for cyan at any lightness. */
		--stripe: var(--stripe-ee);
	}
	.hit.hooker-line,
	.hit.spouse-line,
	.hit.ee-line {
		box-shadow:
			inset 0 0 0 2px var(--card-bg),
			inset 0 0 0 3.5px var(--stripe),
			var(--chip-shadow);
	}
	.hit.hooker-line.on,
	.hit.spouse-line.on,
	.hit.ee-line.on {
		box-shadow:
			inset 0 0 0 2px var(--card-bg),
			inset 0 0 0 3.5px var(--stripe),
			var(--chip-shadow-hover);
	}
	.hit.founder-row,
	.hit.orbit-row {
		/* THE STRIPE SITS 2px IN, so a margin of green runs outside it (Sam) and the white reads as a
		   band ON the card rather than as its edge. Two inset shadows do it and ORDER IS THE MECHANISM:
		   the white ring is drawn 3.5px deep, then the green is drawn 2px deep ON TOP of it, masking the
		   outer half back to the card's own colour. Earlier shadows paint over later ones, so reversing
		   these two hides the stripe completely. The drop shadow is restated last, as it must be in any
		   rule that sets a ring. */
		box-shadow:
			inset 0 0 0 2px var(--card-bg),
			inset 0 0 0 3.5px var(--stripe-dark),
			var(--chip-shadow);
	}
	.hit.founder-row.on,
	.hit.orbit-row.on {
		box-shadow:
			inset 0 0 0 2px var(--card-bg),
			inset 0 0 0 3.5px var(--stripe-dark),
			var(--chip-shadow-hover);
	}
	/* CREAM INK, because §41.3 is not optional here: navy on hunter green is the pair this app's own
	   colour system says never to make. The zone answers the same question with the same token — the
	   cream the rail's years take once the ground goes dark. */
	.hit.founder-row .nm,
	.hit.founder-row .star.has,
	.hit.orbit-row .nm,
	.hit.orbit-row .star.has {
		color: var(--color-creamprimary);
	}
	.hit.founder-row .yr,
	.hit.founder-row .line2,
	.hit.orbit-row .yr,
	.hit.orbit-row .line2 {
		color: rgba(245, 238, 229, 0.78);
	}
	.hit.founder-row .tag,
	.hit.orbit-row .tag {
		color: rgba(245, 238, 229, 0.55);
	}
	/* A FAILED PORTRAIT FALLS BACK TO THE EMPTY WELL. 161 of the 3,083 photo URLs are hotlinked to
	   other sites rather than served from our own Cloudinary, and when one of those 404s or is blocked
	   the <img> renders its ALT TEXT — a person's name in browser-default type, spilling across a dark
	   card. That is the known hotlink debt and the real fix is upstream in Stream A; hiding the broken
	   element is only so the list degrades to the same stone well a photoless row already shows.
	   Search is where this bites first: a card shows one portrait, a result list shows sixty.

	   THE EMPTY WELL STAYS THE HOUSE GREY. I had deepened it to the green's outer stop on the theory
	   that a pale panel would read as a hole punched in a dark card; Sam's call is that the well is one
	   thing across the whole app and it does not change costume per row. `bg-stone-100` off PersonBox
	   is what every other photoless box in the project shows, so nothing is overridden here at all —
	   this note exists only so the deepened version is not reintroduced as an improvement. */
	/* THE HIGHLIGHT IS A SHADOW, NOT A FILL — the house's answer to a pointer (`a.person-box:hover`),
	   and it has to be, because the fill is already carrying line status. Painting a highlight colour
	   over it would erase the one thing the row's ground is saying. One rule for both pointer and
	   keyboard: `cursor` follows the mouse on enter, so the two can never disagree about which row is
	   live. */
	.hit.on {
		box-shadow: var(--chip-shadow-hover);
	}
	/* THE PHOTO IS THE CARD'S LEFT EDGE — full height, aspect-square, flush, clipped by the card's own
	   `overflow-hidden` + `rounded-lg`. That is how a photo is drawn everywhere else in this app
	   (PersonBox's `.photo aspect-square shrink-0 bg-stone-100`, and the ladder rung's), and the stone
	   ground stands in when there is no portrait. My first pass inset a 38px rounded thumbnail with air
	   around it, which is a pattern from somewhere else entirely. */
	.text-area {
		padding: 7px 12px;
		gap: 3px;
	}
	.line1 {
		display: flex;
		align-items: baseline;
		gap: 8px;
	}
	/* SAME HEIGHT AS THE NAME (Sam), so it sits on the name's own optical line rather than floating.
	   Fixed width, so it is a gutter: see the note in the markup. */
	/* NAVY, THE NAME'S OWN COLOUR (Sam), not gold. A gold mark on a navy name reads as a separate
	   object stacked down its own column; in the name's ink the star belongs to the name it marks and
	   the indent is just where names start. Same optical size as the name, so it sits on its line. */
	/**
	 * CENTRED BOTH WAYS, and horizontally was the one that was wrong: the column is 10.8px of a much
	 * wider GUTTER, and it sat at the far left of it. The photo is flush to the card's edge with no gap
	 * after it, and `.text-area` carries 12px of left padding before the name — so the star had zero
	 * space on one side and twelve on the other, and read as stuck to the photograph.
	 *
	 * `margin-left` matches the text-area's padding, so the space either side of the star is the same
	 * number. If that padding is ever retuned, this moves with it — they are one measurement.
	 */
	.star {
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
	.star.has {
		color: var(--color-inkblue);
		cursor: help;
	}
	/* THE HERO CARD'S OWN NAME TREATMENT (Sam): Outfit at medium, in inkblue. FeaturedCard sets
	   `font-outfit` + `font-medium` + `text-inkblue` on its <h1>, and a result row is the same person
	   named the same way at a smaller size — so it takes the same face and the same ink rather than a
	   near-miss of both. */
	.nm {
		font-family: var(--font-outfit, 'Outfit Variable', sans-serif);
		font-size: 15px;
		font-weight: 400;
		line-height: 1.2;
		color: var(--color-inkblue);
	}
	/**
	 * THE YEARS AND THE SECOND LINE GO BLUE at 80% (Sam), so a row is one ink at three strengths — name
	 * full, years and reason at 80, the field label quieter still — rather than a blue name sitting on
	 * two lines of warm brown.
	 *
	 * `--color-inkblue`, not `--color-ascendmidnight`, and measured rather than picked by name. At 80%
	 * over the card paper: midnight lands rgb(63,68,80), 17 points bluer than red, which the eye calls
	 * charcoal; inkblue lands rgb(75,84,106) at 31 and reads as blue. Same trap as the tag pills an hour
	 * ago — a token named midnight is a GROUND colour with nearly no chroma, and chroma is what survives
	 * being thin.
	 *
	 * The dark rows override both to cream and still do: those rules are (0,3,0) against this (0,1,0),
	 * so specificity settles it whatever the source order.
	 */
	.yr {
		font: 400 12px/1.2 var(--font-open-sans, 'Open Sans', sans-serif);
		color: color-mix(in srgb, var(--color-inkblue) 80%, transparent);
		white-space: nowrap;
	}
	.line2 {
		font: 400 12px/1.3 var(--font-open-sans, 'Open Sans', sans-serif);
		color: color-mix(in srgb, var(--color-inkblue) 80%, transparent);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	/* The field the hit came from, set apart from the value so "died Oyster Bay, New York" reads as a
	   label and a place rather than as a sentence with a word missing. */
	.tag {
		text-transform: uppercase;
		font: 600 9.5px/1 var(--font-inter, sans-serif);
		letter-spacing: 0.07em;
		/* The field label follows the line it labels — same ink, further back, so BORN / SERVED / SCHOOL
		   still reads as an annotation rather than turning the row into two colours. */
		color: color-mix(in srgb, var(--color-inkblue) 45%, transparent);
		margin-right: 7px;
	}

	/* The enlargement. FeaturedCard's shadow and hairline ring exactly, so the popout is visibly the
	   same object here, on the ladder and on a card. */
	.zoom-float {
		position: fixed;
		z-index: 60;
		pointer-events: none;
		border-radius: 10px;
		overflow: hidden;
		box-shadow:
			0 24px 60px hsl(var(--shadow-ink) / 0.34),
			0 4px 14px hsl(var(--shadow-ink) / 0.22);
		outline: 1px solid rgba(255, 253, 247, 0.55);
	}
	.zoom-float img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
</style>
