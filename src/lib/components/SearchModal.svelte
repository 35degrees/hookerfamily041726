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
		CATEGORIES,
		RESULT_CAP
	} from '$lib/state/search.svelte';
	import { linear, cubicOut } from 'svelte/easing';
	import { tick } from 'svelte';

	const VEIL_IN_MS = 340;
	const VEIL_OUT_MS = 260;
	const VEIL_BLUR = 10;

	const open = $derived(modal.kind === 'search');

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
	function pick(e: MouseEvent, slug: string) {
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
					<button class="x" onclick={() => { setText(''); input?.focus(); }} aria-label="Clear">
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
					{@const reason = reasonFor(r, search.term)}
					<a
						class="hit"
						class:on={i === cursor}
						href="/person/{r.slug}"
						onclick={(e) => pick(e, r.slug)}
						onmouseenter={() => (cursor = i)}
					>
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
					</a>
				{/each}
			</div>
		</div>

		<button
			class="close"
			onclick={dismiss}
			aria-label="Close search"
			in:panel={{ duration: 300, delay: 40 }}
			out:panel={{ duration: VEIL_OUT_MS }}>&times;</button>
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
	.hit {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 3px;
		min-height: 54px;
		padding: 8px 14px;
		border-radius: 8px;
		text-decoration: none;
		background: var(--paper, #f7f5ee);
		box-shadow:
			0 3.2px 9.6px hsl(var(--shadow-ink) / calc(var(--shadow-a1) * 1.45)),
			0 0.8px 2.4px hsl(var(--shadow-ink) / calc(var(--shadow-a2) * 1.35));
		cursor: pointer;
		/* Colour only. The row does NOT lift on hover — a list of sixty objects all offering to rise is
		   noise, and the ladder already settled that a chip's answer to a pointer is its shadow. */
		transition: background 120ms ease-out;
	}
	/* ONE highlight for both pointer and keyboard: `cursor` follows the mouse on enter, so the two can
	   never disagree about which row is live. */
	.hit.on {
		background: #fffdf6;
	}
	.line1 {
		display: flex;
		align-items: baseline;
		gap: 8px;
	}
	.nm {
		font: 600 14.5px/1.2 var(--font-open-sans, 'Open Sans', sans-serif);
		color: #241f1a;
	}
	.yr {
		font: 400 12px/1.2 var(--font-open-sans, 'Open Sans', sans-serif);
		color: rgba(60, 54, 44, 0.55);
		white-space: nowrap;
	}
	.line2 {
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
