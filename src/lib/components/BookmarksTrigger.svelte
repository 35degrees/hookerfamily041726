<script lang="ts">
	/**
	 * BookmarksTrigger — "My Bookmarks" in the corner, and the hover menu beneath it.
	 *
	 * TWO TARGETS IN ONE CONTROL, which is Sam's design: hovering the words deals out the most recent
	 * saves; CLICKING the words opens the full modal. The hover is an accelerator for the common case
	 * — "take me back to someone I just saved" — and the click is the way to everything.
	 *
	 * THE CLICK PATH IS COMPLETE ON ITS OWN, and that is not decoration. A hover affordance does not
	 * exist on touch, so on a phone this control still opens the modal and nothing is unreachable.
	 * That was the one half of my objection to the hover menu that survived Sam overruling it — a
	 * style disagreement was his to settle, a device that cannot hover is not.
	 *
	 * FIVE PER LIST, NOT FIVE OVERALL (Sam): "if they saved 5 list 1 and 2 list 2 all 7 will appear.
	 * if they saved 8 list 1 and 1 list 2 then only the most recent 5 from list 1 will appear." A
	 * single pooled cap would let a busy List 1 crowd List 2 off the menu entirely, which makes the
	 * second list look broken to somebody who has just used it.
	 *
	 * IT NEEDS THE SEARCH INDEX, because bookmarks store IDs and the payloads are keyed by SLUG —
	 * there is no file to fetch for an id. `load()` is idempotent and usually already warm from
	 * SearchTrigger's own hover; this warms it too, so the menu is populated before the pointer
	 * arrives rather than after.
	 */
	import { auth, type ListId } from '$lib/state/auth.svelte';
	import { openModal } from '$lib/state/modal.svelte';
	import { load, personById, search, CAT } from '$lib/state/search.svelte';
	import { arriveAtPerson } from '$lib/state/bookmarkNav';
	import { GROUNDS, groundState } from '$lib/state/ground.svelte';
	import { ascension } from '$lib/state/ascension.svelte';

	const PER_LIST = 5;

	const onDark = $derived(GROUNDS[groundState.idx]?.kind === 'dark');
	const inZone = $derived(ascension.active);

	let open = $state(false);
	let closeTimer: ReturnType<typeof setTimeout> | undefined;

	function warm() {
		void load().catch(() => {});
	}
	/** A SMALL GRACE ON LEAVING. The pointer has to cross a gap between the word and the menu below
	 *  it, and a menu that vanishes in that gap cannot be reached at all. */
	function enter() {
		clearTimeout(closeTimer);
		warm();
		open = true;
	}
	function leave() {
		clearTimeout(closeTimer);
		closeTimer = setTimeout(() => (open = false), 220);
	}

	type Row = NonNullable<ReturnType<typeof personById>> & { personId: string; list: ListId };

	/**
	 * Resolved through the search index, so a row shows the person's CURRENT name and CURRENT slug.
	 * A bookmark saved before a rename or a slug change still lands correctly — which is the whole
	 * reason §50.2 stores the id.
	 *
	 * Rows whose id no longer resolves — severed, merged — are dropped rather than rendered blank.
	 * `search.ready` is in the dependency list so this recomputes when the index lands.
	 */
	const rows = $derived.by((): Row[] => {
		void search.ready;
		const out: Row[] = [];
		for (const list of [1, 2] as ListId[]) {
			for (const { personId } of auth.recent(list, PER_LIST)) {
				const p = personById(personId);
				if (!p) continue;
				out.push({ ...p, personId, list });
			}
		}
		return out;
	});

	const byList = $derived({
		1: rows.filter((r) => r.list === 1),
		2: rows.filter((r) => r.list === 2)
	});

	function go(r: Row) {
		open = false;
		arriveAtPerson(r.slug, (r.f & CAT.INFLUENCE) !== 0);
	}

	/** Same rule as everywhere else: a private-dates row shows "Living", never a range. */
	function years(r: { by: number | null; dy: number | null; pv?: boolean }): string {
		if (r.pv) return 'Living';
		if (r.by == null && r.dy == null) return '';
		return `${r.by ?? '?'}–${r.dy ?? ''}`;
	}
</script>

{#if auth.signedIn}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="bm" onmouseenter={enter} onmouseleave={leave}>
		<span
			class="bm-word"
			class:on-dark={onDark}
			class:in-zone={inZone}
			role="button"
			tabindex="0"
			onclick={() => {
				open = false;
				openModal('bookmarks');
			}}
			onfocus={warm}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					open = false;
					openModal('bookmarks');
				}
			}}
		>
			<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
				<path
					d="M7 3.5h10a1.5 1.5 0 0 1 1.5 1.5v15.2a.6.6 0 0 1-.94.5L12 16.6l-5.56 4.1a.6.6 0 0 1-.94-.5V5A1.5 1.5 0 0 1 7 3.5z"
					fill="none"
					stroke="currentColor"
					stroke-width="1.6"
					stroke-linejoin="round"
				/>
			</svg>
			My Bookmarks
		</span>

		{#if open && rows.length}
			<div class="menu">
				<!-- SAM ASKED FOR THIS TITLE, and it earns its place: without it a bare stack of five
				     people is ambiguous between "your bookmarks" and "your most recent". It says which. -->
				<div class="menu-title">Recently Added Bookmarks</div>
				{#each [1, 2] as const as list}
					{#if byList[list].length}
						<div class="menu-head">{auth.listName(list)}</div>
						{#each byList[list] as r (r.personId)}
							{@const isFounder = (r.f & CAT.FOUNDER) !== 0 && r.id !== 'H00001'}
							{@const isOrbit = (r.f & CAT.INFLUENCE) !== 0 && !isFounder}
							<!-- NO RIBBON ICON HERE (Sam): the list is already named by the heading above, so a
							     colour chip beside every name would be restating it once per row. The photo takes
							     the space instead, which is the thing that actually identifies a person. -->
							<a
								class="person-box menu-hit flex overflow-hidden rounded-lg"
								class:hooker-line={(r.f & CAT.HD) !== 0}
								class:spouse-line={(r.f & CAT.SPOUSE) !== 0}
								class:ee-line={(r.f & CAT.INLAW) !== 0}
								class:founder-row={isFounder}
								class:orbit-row={isOrbit}
								href="/person/{r.slug}"
								onclick={(e) => {
									if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
									e.preventDefault();
									go(r);
								}}
							>
								<div class="photo aspect-square shrink-0 bg-stone-100">
									{#if r.ph}
										<img
											src={r.ph}
											alt={r.n}
											class="h-full w-full object-cover object-top"
											loading="lazy"
											onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
										/>
									{/if}
								</div>
								<div class="text-area flex min-w-0 flex-col justify-center">
									<span class="line1"><span class="nm">{r.n}</span></span>
									<span class="line2">{years(r)}</span>
								</div>
							</a>
						{/each}
					{/if}
				{/each}
			</div>
		{/if}
	</div>
{/if}

<style>
	.bm {
		position: relative;
		display: inline-flex;
	}
	/* SEARCHTRIGGER'S TYPE AND GROUND-AWARENESS, to the value — four bare words in one corner that
	   agreed only roughly would read as a bug, and they are always on screen together. */
	.bm-word {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font: 500 12px/1 var(--font-inter, sans-serif);
		letter-spacing: 0.02em;
		color: rgba(43, 38, 32, 0.7);
		cursor: pointer;
		user-select: none;
		padding: 6px 2px;
		white-space: nowrap;
		transition: color 180ms ease-out;
	}
	.bm-word:hover,
	.bm-word:focus-visible {
		color: rgba(43, 38, 32, 0.98);
		outline: none;
	}
	.bm-word.on-dark {
		color: rgba(255, 250, 240, 0.72);
	}
	.bm-word.on-dark:hover,
	.bm-word.on-dark:focus-visible {
		color: rgba(255, 250, 240, 0.96);
	}
	.bm-word.in-zone {
		color: rgba(247, 241, 230, 0.82);
	}
	.bm-word.in-zone:hover,
	.bm-word.in-zone:focus-visible {
		color: rgba(247, 241, 230, 1);
	}

	/**
	 * THE MENU IS A SMALL CARD, not a dropdown panel — house paper, the chip's radius, the chip's
	 * shadow. §45.12: this app contains no widgets, and a menu that looked like a browser's would be
	 * the one object here that came from somewhere else.
	 *
	 * `top: 100%` with a gap the pointer must cross, which is what the 220ms close grace is for.
	 */
	.menu {
		position: absolute;
		top: calc(100% + 6px);
		right: 0;
		min-width: 244px;
		max-width: 300px;
		padding: 6px;
		border-radius: 7px;
		background: #fbf8f1;
		box-shadow:
			0 6px 20px rgba(20, 28, 46, 0.2),
			0 0 0 0.5px rgba(43, 38, 32, 0.1);
		display: flex;
		flex-direction: column;
		gap: 4px;
		z-index: 20;
	}
	/* The title names the whole stack; the per-list heads name each group under it. Two levels, so
	   the smaller one is quieter rather than the same size in a different weight. */
	.menu-title {
		padding: 4px 6px 5px;
		border-bottom: 1px solid rgba(43, 38, 32, 0.1);
		margin-bottom: 2px;
		font-family: var(--font-opensans, 'Open Sans', sans-serif);
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-inkblue);
		opacity: 0.7;
	}
	.menu-head {
		padding: 5px 8px 3px;
		font-family: var(--font-opensans, 'Open Sans', sans-serif);
		font-size: 9px;
		font-weight: 600;
		letter-spacing: 0.13em;
		text-transform: uppercase;
		color: var(--color-inkblue);
		opacity: 0.5;
	}
	/**
	 * THE MENU ROW IS A CARD — `.person-box`, the same object the tree is built from, at its smallest
	 * legible size. Sam: "we don't do lists with transparent backgrounds that look like songlists at
	 * amazon prime music." Only the height and the photo width are stated; the paper, the shadow, the
	 * radius and the line-status shading all come from the house.
	 */
	.menu-hit {
		height: 42px;
		flex: none;
		text-decoration: none;
		cursor: pointer;
	}
	/* Sized, never inferred — SearchModal's scar: `aspect-square` against a stretched row height is
	   circular, and the tie-break is the image's intrinsic size, which is how one tall portrait grew
	   its own row. */
	.menu-hit .photo {
		width: 42px;
	}
	.menu-hit .line1 {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	/* The years sit UNDER the name (Sam), on the card's own second line — smaller here than in the
	   modal because this row has no blurb to balance against. */
	.menu-hit .line2 {
		font-size: 10px;
		opacity: 0.62;
	}
	/* The zone's grounds, so the room a click leads to is legible before the click. */
	.menu-hit.orbit-row {
		--card-bg: var(--color-ascendmidnight);
	}
	.menu-hit.founder-row {
		--card-bg: var(--color-foundergreen);
	}
</style>
