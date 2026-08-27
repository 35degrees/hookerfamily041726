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
	import { modal, closeModal } from '$lib/state/modal.svelte';
	import { ascension } from '$lib/state/ascension.svelte';
	import {
		search,
		load,
		setText,
		toggleCategory,
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
	const VEIL_OUT_MS = 260;
	const VEIL_BLUR = 10;

	const open = $derived(modal.kind === 'search');

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

	let input = $state<HTMLInputElement | null>(null);
	let listEl = $state<HTMLElement | null>(null);
	/** Which row the keyboard is on. Dies with the view, so it lives here and not in the module. */
	let cursor = $state(0);

	$effect(() => {
		if (!open) return;
		void load().catch(() => {});
		void tick().then(() => input?.focus());
	});

	/** A new result set invalidates the old cursor — otherwise Enter fires on a row that scrolled out
	 *  from under it. Reset to 0 rather than -1 so Enter always has a target: the top hit. */
	$effect(() => {
		void search.rows;
		cursor = 0;
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

	function veil(_node: Element, { duration }: { duration: number }) {
		return {
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
		closeModal();

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

	/**
	 * Years — or "Living", or nothing.
	 *
	 * `pv` (presumed living, not notable) still withholds the DATES, which is the app-wide rule and is
	 * not being relaxed: no year is printed for these 241 people anywhere, here included.
	 *
	 * WHAT CHANGES IS THAT THE SLOT NO LONGER LIES BY OMISSION. Everywhere else in the app a blank date
	 * line has one meaning, because you are looking at one person and their card. A RESULT LIST puts
	 * 241 living people and 1,920 people with no recorded birth year in the same column showing the
	 * same blank, and those are completely different facts — one is withheld, the other is missing.
	 * "Living" separates them, and it discloses nothing a withheld death date did not already imply.
	 *
	 * This is a search-only convention today. The chips and the card still print nothing, and if that
	 * inconsistency should be closed it is a change to PersonBox and FeaturedCard, not a second rule
	 * invented here.
	 */
	function years(r: { by: number | null; dy: number | null; pv?: boolean }): string {
		if (r.pv) return 'Living';
		if (r.by == null && r.dy == null) return '';
		return `${r.by ?? '?'}–${r.dy ?? ''}`;
	}
</script>

{#if open}
	<div
		class="veil"
		class:zone={ascension.active}
		in:veil={{ duration: VEIL_IN_MS }}
		out:veil={{ duration: VEIL_OUT_MS }}
		onclick={dismiss}
		role="presentation"
	></div>

	<div class="search-layer" role="dialog" aria-modal="true" aria-label="Search the tree">
		<div
			class="panel"
			in:panel={{ duration: 300, delay: 40 }}
			out:panel={{ duration: VEIL_OUT_MS }}
		>
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

			<div class="results" bind:this={listEl}>
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
						<div class="text-area flex min-w-0 flex-col justify-center">
							<span class="line1">
								<!-- THE STAR IS A GUTTER, NOT A PREFIX. It is drawn in a reserved column so every
								     name in the list starts at the same x whether or not it carries one — a star
								     that shoved its own name rightward would make the column ragged and the
								     notables harder to scan, which is the opposite of the point. -->
								<span
									class="star"
									class:has={r.nb}
									title={r.nb ? 'Notable person' : undefined}
									aria-hidden={!r.nb}>{r.nb ? '★' : ''}</span
								>
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

		<button
			class="close"
			onclick={dismiss}
			aria-label="Close search"
			in:panel={{ duration: 300, delay: 40 }}
			out:panel={{ duration: VEIL_OUT_MS }}>&times;</button
		>
	</div>
{/if}

<style>
	/* THE MARSHMALLOW VEIL. Same ground as the ladder's, and deliberately the same values rather than
	   an approximation of them: two overlays over the same tree that agreed only roughly would read as
	   a bug the moment you opened one after the other.
	   TODO once the third overlay lands: this and ConnectModal's veil want extracting into the shared
	   shell `modal.svelte.ts` already describes. Left duplicated for now rather than refactoring a
	   working ladder to make room for a first-pass search. */
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
	.veil.zone {
		background: radial-gradient(
			120% 90% at 50% 42%,
			rgba(233, 231, 223, 0.94) 0%,
			rgba(229, 227, 219, 0.96) 55%,
			rgba(224, 222, 214, 0.975) 100%
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

	.count {
		margin: 0 2px;
		font: 400 12px/1.4 var(--font-inter, sans-serif);
		color: rgba(48, 42, 34, 0.62);
	}

	.results {
		display: flex;
		flex-direction: column;
		gap: 6px;
		overflow-y: auto;
		/* The list scrolls; the box above it does not move. */
		max-height: calc(88vh - 12vh - 180px);
		padding: 2px 2px 14px;
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
	.star {
		flex: 0 0 auto;
		width: 12px;
		font-size: 12px;
		line-height: 1.2;
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
	.yr {
		font: 400 12px/1.2 var(--font-open-sans, 'Open Sans', sans-serif);
		color: rgba(60, 54, 44, 0.55);
		white-space: nowrap;
	}
	.line2 {
		/* Aligned under the NAME, not under the star, so the gutter reads as one column top to bottom. */
		padding-left: 20px;
		font: 400 12px/1.3 var(--font-open-sans, 'Open Sans', sans-serif);
		color: rgba(60, 54, 44, 0.66);
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
		color: rgba(60, 54, 44, 0.42);
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
	.close {
		pointer-events: auto;
		position: fixed;
		right: 16px;
		top: 16px;
		width: 30px;
		height: 30px;
		border-radius: 6px;
		border: 1px solid rgba(60, 54, 44, 0.18);
		background: rgba(255, 253, 247, 0.7);
		color: rgba(60, 54, 44, 0.7);
		font-size: 19px;
		line-height: 1;
		cursor: pointer;
	}
	.close:hover {
		color: rgba(60, 54, 44, 0.95);
		border-color: rgba(60, 54, 44, 0.34);
	}
</style>
