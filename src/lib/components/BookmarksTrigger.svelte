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

	type Row = { personId: string; list: ListId; name: string; slug: string; orbit: boolean };

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
				out.push({
					personId,
					list,
					name: p.n,
					slug: p.slug,
					orbit: ((p as unknown as { f?: number }).f ?? 0) === CAT.INFLUENCE
				});
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
		arriveAtPerson(r.slug, r.orbit);
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
				{#each [1, 2] as const as list}
					{#if byList[list].length}
						<div class="menu-head">{auth.listName(list)}</div>
						{#each byList[list] as r (r.personId)}
							<button type="button" class="menu-row" onclick={() => go(r)}>
								<svg
									viewBox="0 0 24 24"
									width="11"
									height="11"
									aria-hidden="true"
									class={r.list === 1 ? 'gold' : 'blue'}
								>
									<path
										d="M7 3.5h10a1.5 1.5 0 0 1 1.5 1.5v15.2a.6.6 0 0 1-.94.5L12 16.6l-5.56 4.1a.6.6 0 0 1-.94-.5V5A1.5 1.5 0 0 1 7 3.5z"
										fill="currentColor"
										stroke="currentColor"
										stroke-width="1.5"
										stroke-linejoin="round"
									/>
								</svg>
								<span class="menu-name">{r.name}</span>
							</button>
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
		min-width: 210px;
		max-width: 280px;
		padding: 6px;
		border-radius: 7px;
		background: #fbf8f1;
		box-shadow:
			0 6px 20px rgba(20, 28, 46, 0.2),
			0 0 0 0.5px rgba(43, 38, 32, 0.1);
		display: flex;
		flex-direction: column;
		gap: 1px;
		z-index: 20;
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
	.menu-row {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 6px 8px;
		border: 0;
		border-radius: 5px;
		background: transparent;
		text-align: left;
		cursor: pointer;
		transition: background 140ms ease-out;
	}
	.menu-row:hover,
	.menu-row:focus-visible {
		background: rgba(43, 38, 32, 0.07);
		outline: none;
	}
	.menu-name {
		font: 400 12px/1.25 var(--font-inter, sans-serif);
		color: var(--color-inkblue);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	/* The same two inks as the card's ribbon, so a gold row here and a gold ribbon there are
	   recognisably the same fact. */
	.menu-row svg.gold {
		color: #dcb130;
	}
	.menu-row svg.blue {
		color: #7fa9c9;
	}
</style>
