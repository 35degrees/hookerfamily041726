<script lang="ts">
	import { slide } from 'svelte/transition';
	import type { SlideParams, TransitionConfig } from 'svelte/transition';
	import { untrack } from 'svelte';
	import type { NarrativeBlock } from '#lib/types/person.js';
	import { stage } from '#lib/state/stage.svelte.js';
	import { isWebKit } from '#lib/state/engine.js';
	import { openModal, type ModalKind } from '#lib/state/modal.svelte.js';

	/**
	 * THE BLOCK'S SLIDE — Svelte's own `slide`, except in Safari/WebKit, where its opening opacity fade is
	 * dropped (100226). That fade is only the first 5% of the slide, but in Safari an opacity ANIMATION gives
	 * the block its own compositing layer, inside the hero's filtered wrapper, and the card's drop-shadow
	 * blinked out every time a header was clicked open (the same cause as the header-hover blink — see
	 * layout.css's SAFARI section). Height-only, the slide looks the same and the shadow holds. Chrome is
	 * untouched: it gets `slide` exactly as before.
	 */
	function blockSlide(node: Element, params: SlideParams): TransitionConfig {
		const cfg = slide(node, params);
		if (!isWebKit() || !cfg.css) return cfg;
		const css = cfg.css;
		return { ...cfg, css: (t, u) => css(t, u).replace(/opacity:\s*[^;]+;?/, '') };
	}

	type Props = {
		blocks: NarrativeBlock[];
		/** Optional per-person typeface key from bio.display_font. Resolved through FONTS below;
		    anything unrecognised falls through to the card default. */
		font?: string | null;
	};

	let { blocks, font = null }: Props = $props();

	// Allow-list, not a passthrough: canonical.json supplies a KEY, never a class or CSS.
	// The token itself lives in layout.css @theme (--font-rokkitt).
	const FONTS: Record<string, string> = { rokkitt: 'font-rokkitt' };
	let fontClass = $derived(FONTS[(font ?? '').toLowerCase()] ?? '');
	// The typeface lands on the HEADER only — bodies stay in the card's reading face. A slab serif
	// sets optically smaller than Inter at the same px, so the override carries its own +20% step
	// (15px → 18px) rather than changing the default header size for all 18,000 cards.
	// × --nb-head-k / --nb-body-k / --nb-lead-k: set on the featured card when it NARROWS on a short window
	// (FeaturedCard, Sam 100626 — headers 10% smaller, body a little smaller and tighter). 1 everywhere else.
	let headerClass = $derived(
		fontClass
			? `${fontClass} text-[calc(18px*var(--type-k,1)*var(--nb-head-k,1))]`
			: 'text-[calc(15px*var(--type-k,1)*var(--nb-head-k,1))]'
	);

	// PHASE 2.75 — THE CONTENT BUDGET. 7 is the roomy-rung maximum (raised from 6, Sam, 10 Aug 2026,
	// alongside validate.py's NB_MAX_PER_PERSON); a smaller stage
	// takes fewer, because the hybrid means the type does NOT shrink as fast as the card does and the
	// block list would otherwise run past the card's bottom edge. See stage.svelte.ts's `nbCap`, and the
	// note there on why this is the cost of stepping type separately from the frame.
	const MAX_DISPLAYED = $derived(stage.nbCap ?? 7);

	let sortedBlocks = $derived(
		[...blocks]
			.sort((a, b) => {
				const an = a.number ?? Number.POSITIVE_INFINITY;
				const bn = b.number ?? Number.POSITIVE_INFINITY;
				return an - bn;
			})
			.slice(0, MAX_DISPLAYED)
			.map((block, index) => ({
				block,
				// Index-inclusive so two blocks sharing a `number` can't collide and
				// abort the keyed render. Also drives the expanded-block state below.
				key: `${block.number ?? 'b'}-${index}`
			}))
	);

	// OPEN FROM THE FIRST FRAME, NOT ONE FRAME LATER — and this is a real fix, not a preference.
	//
	// It was `null` here with the $effect below opening the first block after mount. That means the
	// `{#if openKey === key}` body did not exist at first paint and was CREATED a frame later, so its
	// local `transition:slide` ran — every card, every arrival, on every navigation in the app. Nobody
	// ever saw it because every other flight enters from offscreen or morphs from a chip, and 220ms of
	// slide is invisible while a card is still travelling.
	//
	// A head-on flight is the one that shows it: the card is large, centred and stationary in the frame
	// while it settles, so the first NB visibly unfurls and shoves the headers under it down the card.
	// Sam: "the NBs slide or transition down… it's almost like the NBs are dropping down like stones as
	// they enter. The card should be fully formed as it enters view."
	//
	// Seeding the state at creation means the block is present in the first render, so the transition has
	// nothing to play — a card arrives already formed. The $effect below still owns the RESET when the
	// blocks prop changes; it simply now writes the value that is already there on a fresh mount, which
	// is a no-op and cannot re-trigger the slide. Toggling by hand still animates exactly as before.
	// `untrack` states the intent the compiler asks about: this is deliberately the value AT CREATION,
	// which is the whole point — the block has to exist in the FIRST render or its local transition
	// plays. Subsequent changes are the $effect's job, below.
	let openKey = $state<string | number | null>(untrack(() => sortedBlocks[0]?.key) ?? null);

	// Reset to the first block whenever the blocks prop changes (e.g., new
	// person navigated to). This ensures the first NB is expanded by default
	// on every new page, regardless of what was open on the previous page.
	$effect(() => {
		blocks; // explicit dependency reference
		if (sortedBlocks.length > 0) {
			openKey = sortedBlocks[0].key;
		} else {
			openKey = null;
		}
	});

	function toggle(key: string | number) {
		openKey = openKey === key ? null : key;
	}

	/**
	 * IN-BODY ACTION LINKS (100926). `[words](action)` in a body renders `words` as a link that runs the
	 * action. An ALLOW-LIST, like FONTS above: canonical supplies a KEY, never a URL or markup, so a body
	 * can open one of the app's own surfaces and nothing else. An unknown key renders as its plain words.
	 * First (and so far only) use: "Click [here](contact)" on Samuel Talcott Hooker's NB 5.
	 */
	const ACTIONS: Record<string, ModalKind> = { contact: 'contact' };
	const LINK_RE = /\[([^\]]+)\]\(([a-z-]+)\)/g;
	type Seg = { text: string; action?: ModalKind };
	function segments(body: string): Seg[] {
		const out: Seg[] = [];
		let last = 0;
		for (const m of body.matchAll(LINK_RE)) {
			if (m.index > last) out.push({ text: body.slice(last, m.index) });
			out.push({ text: m[1], action: ACTIONS[m[2]] });
			last = m.index + m[0].length;
		}
		if (last < body.length) out.push({ text: body.slice(last) });
		return out;
	}
</script>

{#if sortedBlocks.length > 0}
	<div class="narrative-blocks space-y-2">
		{#each sortedBlocks as { block, key } (key)}
			<div class="block">
				<button
					type="button"
					onclick={() => toggle(key)}
					class="header-button w-full rounded-sm text-left opacity-[0.85] transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2"
				>
					{#if block.category}
						<div
							class="text-[calc(10px*var(--type-k,1))] font-bold tracking-wider text-blue-900/50 uppercase select-none"
						>
							{block.category}
						</div>
					{/if}
					<h3 class="font-semibold text-blue-900 transition-colors select-none {headerClass}">
						{block.header}<span
							class="ml-2 inline-flex align-baseline text-[calc(18px*var(--type-k,1))] leading-none text-slate-500"
							aria-hidden="true">{openKey === key ? '−' : '+'}</span
						>
					</h3>
				</button>
				{#if openKey === key}
					<div class="pt-1 pr-8 pb-1.5" transition:blockSlide={{ duration: 220, axis: 'y' }}>
						<!-- whitespace-pre-line so a body that contains real newlines renders as lines — the
						     verse blocks (Edward Taylor, 091626). Prose bodies are unaffected: pre-line still
						     collapses runs of spaces and wraps normally, it only honours an explicit \n. -->
						<p
							class="text-[calc(13.5px*var(--type-k,1)*var(--nb-body-k,1))] leading-[calc(1.625*var(--nb-lead-k,1))] whitespace-pre-line text-stone-700 select-none">
							{#each segments(block.body) as seg, i (i)}{#if seg.action}<button
										type="button"
										class="body-link"
										onclick={() => openModal(seg.action!)}>{seg.text}</button
									>{:else}{seg.text}{/if}{/each}
						</p>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<style>
	.header-button {
		cursor: pointer;
	}
	/* THE HOVER RUNS THE OTHER WAY (Sam, 100526: "I've got the NB header hover contrast backwards"). The
	   header rests at 85% and comes UP to full strength under the pointer (opacity-[0.85] hover:opacity-100 on
	   the button), where it used to dim to 60% and go slate. The slate colour on hover is gone with it: it
	   was the other half of the dimming, and it would have turned the founder zone's green headers grey.
	   In its place the hover goes a shade DARKER (Sam): blue-900 #1c398e → #172f76. The founder zone's
	   green does the same in layout.css (#355e3b → #2b4d30), on a rule specific enough to beat this one. */
	.header-button:hover h3 {
		color: #172f76;
	}
	/* An in-body action link: the header's blue, underlined, set in the body's own type. A <button> (it opens
	   a surface, it goes nowhere), stripped back to inline text. */
	.body-link {
		display: inline;
		padding: 0;
		border: 0;
		background: none;
		font: inherit;
		color: #1c398e;
		text-decoration: underline;
		text-decoration-thickness: 1px;
		text-underline-offset: 2px;
		cursor: pointer;
	}
	.body-link:hover {
		color: #172f76;
	}
	.body-link:focus-visible {
		outline: 2px solid #1c398e;
		outline-offset: 1px;
		border-radius: 2px;
	}
</style>
