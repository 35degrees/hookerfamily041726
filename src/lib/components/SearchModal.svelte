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

	/** Years, or nothing at all when the dates are private (241 rows). `pv` is the one gate every
	 *  render site in the app reads; a search row is a render site like any other. */
	function years(r: { by: number | null; dy: number | null; pv?: boolean }): string {
		if (r.pv) return '';
		if (r.by == null && r.dy == null) return '';
		return `${r.by ?? '?'}–${r.dy ?? ''}`;
	}
</script>

{#if open}
	<div
		class="veil"
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
					placeholder="Search 19,728 people — a name, a place, a war, a school"
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
						class="chip"
						class:on={(search.cats & c.mask) !== 0}
						onclick={() => toggleCategory(c.mask)}
					>
						{c.label}
					</button>
				{/each}
			</div>

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
					<a
						class="person-box hit flex overflow-hidden rounded-lg"
						class:on={i === cursor}
						class:hooker-line={(r.f & CAT.HD) !== 0}
						class:spouse-line={(r.f & CAT.SPOUSE) !== 0}
						class:ee-line={(r.f & CAT.INLAW) !== 0}
						class:founder-row={(r.f & CAT.FOUNDER) !== 0 && r.id !== 'H00001'}
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
		pointer-events: auto;
		/* 680px was a search-engine's width, not this app's — a name and a short reason left most of a
		   row empty and the eye had to travel the gap. 520 keeps the pair close enough to read as one
		   line of information. */
		width: min(520px, 92vw);
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.box {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 0 14px;
		height: 52px;
		border-radius: 10px;
		background: var(--paper, #f7f5ee);
		box-shadow:
			0 3.2px 9.6px hsl(var(--shadow-ink) / calc(var(--shadow-a1) * 1.45)),
			0 0.8px 2.4px hsl(var(--shadow-ink) / calc(var(--shadow-a2) * 1.35));
	}
	.box svg {
		width: 17px;
		height: 17px;
		flex: none;
		color: rgba(60, 54, 44, 0.42);
	}
	.box input {
		flex: 1;
		border: 0;
		background: none;
		outline: none;
		font: 400 16px/1 var(--font-open-sans, 'Open Sans', sans-serif);
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

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.chip {
		font: 500 11.5px/1 var(--font-inter, sans-serif);
		letter-spacing: 0.01em;
		padding: 6px 10px;
		border-radius: 999px;
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
	.chip.on {
		background: #2f3a52;
		border-color: #2f3a52;
		color: #f4efe4;
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
		max-height: calc(88vh - 12vh - 130px);
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
	.hit.founder-row {
		--card-bg: var(--color-foundergreen);
		box-shadow:
			inset 0 0 0 2px rgba(255, 255, 255, 0.9),
			var(--chip-shadow);
	}
	.hit.founder-row.on {
		box-shadow:
			inset 0 0 0 2px rgba(255, 255, 255, 0.9),
			var(--chip-shadow-hover);
	}
	/* CREAM INK, because §41.3 is not optional here: navy on hunter green is the pair this app's own
	   colour system says never to make. The zone answers the same question with the same token — the
	   cream the rail's years take once the ground goes dark. */
	.hit.founder-row .nm,
	.hit.founder-row .star.has {
		color: var(--color-creamprimary);
	}
	.hit.founder-row .yr,
	.hit.founder-row .line2 {
		color: rgba(245, 238, 229, 0.78);
	}
	.hit.founder-row .tag {
		color: rgba(245, 238, 229, 0.55);
	}
	/* The empty photo well takes the green's own DEEPENED stop rather than the stone grey, which would
	   read as a lit panel punched into a dark card. #1d3420 is the veil's outer stop — the token's
	   shadow, hand-tuned beside it (see Ascension.svelte: mixing toward white greys it, so these are
	   not derivable). */
	.hit.founder-row .photo {
		background: #1d3420;
	}
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
