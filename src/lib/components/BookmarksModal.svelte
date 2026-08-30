<script lang="ts">
	/**
	 * BookmarksModal — THE FIFTH SURFACE, and a fifth FILE.
	 *
	 * Design §46.2, Sam's own words and the rule he had to state twice: three modals are three files.
	 * Auth made four; this makes five. It takes SearchModal's veil values, its panel geometry, its
	 * header and §45.11's exit choreography — by COPYING, exactly as ConnectModal and SearchModal
	 * already copy each other. What it must never do is import a shared results component or grow a
	 * mode flag on an existing modal, because the failure that produced §46.2 was a fade written for
	 * one surface silently altering a shipped transition on another.
	 *
	 * "SIMILAR TO SEARCH MODAL" MEANS THE SPECIES, NOT THE BODY (Sam).
	 *
	 * TWO COLUMNS, one per list, each scrolling independently and uncapped — "they can have as many
	 * bookmarks in each list as they want". The headers are EDITABLE: a pencil turns the title into a
	 * text box, 25 characters, and the new name propagates everywhere immediately because every
	 * surface reads `auth.listName()` rather than holding its own copy (§50.2).
	 */
	import { modal, closeModal } from '$lib/state/modal.svelte';
	import { ascension } from '$lib/state/ascension.svelte';
	import { auth, setListName, setBookmark, LIST_NAME_MAX, type ListId } from '$lib/state/auth.svelte';
	import { load, personById, search, CAT } from '$lib/state/search.svelte';
	import { arriveAtPerson } from '$lib/state/bookmarkNav';
	import { linear, cubicOut } from 'svelte/easing';

	/** §45.11's numbers, copied — two overlays over the same tree that agreed only roughly would read
	 *  as a bug the moment you opened one after the other. */
	const VEIL_IN_MS = 340;
	const VEIL_BLUR = 10;
	const PANEL_OUT_MS = 250;
	const VEIL_OUT_DELAY = 90;
	const VEIL_OUT_MS = 430;

	const open = $derived(modal.kind === 'bookmarks');
	let leaving = $state(false);
	$effect(() => {
		if (open) leaving = false;
	});

	/** The index is what turns a stored ID into a name and a current slug (§50.2). Idempotent. */
	$effect(() => {
		if (open) void load().catch(() => {});
	});

	type Row = { personId: string; name: string; slug: string; orbit: boolean; years: string };

	function rowsFor(list: ListId): Row[] {
		void search.ready;
		const out: Row[] = [];
		for (const { personId } of auth.all(list)) {
			const p = personById(personId) as
				| (ReturnType<typeof personById> & { f?: number; by?: number | null; dy?: number | null })
				| null;
			// A severed or merged id resolves to nothing. Dropped rather than rendered blank — the
			// bookmark row survives in the database, so re-sewing the person brings it back.
			if (!p) continue;
			out.push({
				personId,
				name: p.n,
				slug: p.slug,
				orbit: (p.f ?? 0) === CAT.INFLUENCE,
				years: p.by || p.dy ? `${p.by ?? '?'}–${p.dy ?? ''}` : ''
			});
		}
		return out;
	}

	const list1 = $derived(rowsFor(1));
	const list2 = $derived(rowsFor(2));

	/** Which header is in edit mode, and the draft. Null means nobody is editing. */
	let editing = $state<ListId | null>(null);
	let draft = $state('');
	let saveError = $state('');

	function beginEdit(list: ListId) {
		editing = list;
		draft = auth.listNameRaw(list);
		saveError = '';
	}
	async function commitEdit() {
		const list = editing;
		if (list === null) return;
		editing = null;
		try {
			await setListName(list, draft);
		} catch {
			saveError = 'Could not rename — try again';
		}
	}

	function dismiss() {
		leaving = true;
		closeModal();
	}

	function go(r: Row) {
		leaving = true;
		arriveAtPerson(r.slug, r.orbit);
	}

	/** §45.11's trap: a custom transition SILENTLY ignores any option it does not destructure. */
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
			css: (t: number) => {
				const e = t * t * (3 - 2 * t);
				const b = (VEIL_BLUR * e).toFixed(2);
				return `opacity: ${e}; backdrop-filter: blur(${b}px); -webkit-backdrop-filter: blur(${b}px);`;
			}
		};
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			// Escape cancels an EDIT first, and only closes from a settled header — the same two-stage
			// rule SearchModal applies to its query box, and for the same reason: Escape mid-edit
			// almost always means "not that name", not "I'm done here".
			if (editing !== null) editing = null;
			else dismiss();
		}
	}
</script>

<svelte:window onkeydown={open ? onKey : undefined} />

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

	<div class="bm-layer" role="dialog" aria-modal="true" aria-label="Your bookmarks">
		<div class="panel" in:panel={{ duration: 300, delay: 40 }} out:panel={{ duration: PANEL_OUT_MS }}>
			<div class="head">
				<span class="head-title">My Bookmarks</span>
				<button type="button" class="head-x" onclick={dismiss} aria-label="Close">
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

			{#if saveError}
				<p class="err">{saveError}</p>
			{/if}

			<div class="cols">
				{#each [1, 2] as const as list}
					{@const rows = list === 1 ? list1 : list2}
					<div class="col">
						<div class="col-head">
							{#if editing === list}
								<!-- svelte-ignore a11y_autofocus -->
								<input
									class="rename"
									bind:value={draft}
									maxlength={LIST_NAME_MAX}
									autofocus
									onblur={commitEdit}
									onkeydown={(e) => {
										if (e.key === 'Enter') {
											e.preventDefault();
											(e.currentTarget as HTMLInputElement).blur();
										}
									}}
								/>
								<span class="count">{draft.length}/{LIST_NAME_MAX}</span>
							{:else}
								<span class="col-name">{auth.listName(list)}</span>
								<button
									type="button"
									class="pencil"
									onclick={() => beginEdit(list)}
									aria-label={`Rename ${auth.listName(list)}`}
								>
									<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
										<path
											d="M4 20h4L19 9a2 2 0 0 0-3-3L5 17v3z"
											fill="none"
											stroke="currentColor"
											stroke-width="1.6"
											stroke-linejoin="round"
										/>
									</svg>
								</button>
								<span class="tally">{rows.length}</span>
							{/if}
						</div>

						<div class="col-rows">
							{#if !rows.length}
								<!-- AN EMPTY COLUMN THAT EXPLAINS ITSELF rather than a hole. Two columns with one
								     blank looks broken; a line saying what the list is for teaches the two-list
								     system to somebody who has only ever clicked the ribbon once. -->
								<p class="empty">
									Nothing here yet. Click a card's ribbon {list === 1 ? 'once' : 'twice'} to file
									someone into {auth.listName(list)}.
								</p>
							{/if}
							{#each rows as r (r.personId)}
								<div class="row">
									<button type="button" class="row-go" onclick={() => go(r)}>
										<svg
											viewBox="0 0 24 24"
											width="12"
											height="12"
											aria-hidden="true"
											class={list === 1 ? 'gold' : 'blue'}
										>
											<path
												d="M7 3.5h10a1.5 1.5 0 0 1 1.5 1.5v15.2a.6.6 0 0 1-.94.5L12 16.6l-5.56 4.1a.6.6 0 0 1-.94-.5V5A1.5 1.5 0 0 1 7 3.5z"
												fill="currentColor"
												stroke="currentColor"
												stroke-width="1.5"
												stroke-linejoin="round"
											/>
										</svg>
										<span class="row-name">{r.name}</span>
										{#if r.years}<span class="row-years">{r.years}</span>{/if}
									</button>
									<button
										type="button"
										class="row-x"
										onclick={() => setBookmark(r.personId, null)}
										aria-label={`Remove ${r.name}`}
									>
										<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
											<path
												d="M6 6 L18 18 M18 6 L6 18"
												stroke="currentColor"
												stroke-width="1.7"
												stroke-linecap="round"
											/>
										</svg>
									</button>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	/* THE MARSHMALLOW VEIL — SearchModal's values, copied per §46.2. */
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
	/* In the zone the veil covers far more — §29, these alphas are a property of the PAIR. */
	.veil.zone {
		background: radial-gradient(
			120% 90% at 50% 42%,
			rgba(233, 231, 223, 0.74) 0%,
			rgba(229, 227, 219, 0.78) 55%,
			rgba(224, 222, 214, 0.82) 100%
		);
	}
	.bm-layer {
		position: fixed;
		inset: 0;
		z-index: 41;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding-top: 12vh;
		pointer-events: none;
	}
	.panel {
		pointer-events: auto;
		/* Wider than search's 520 because this is TWO columns of names, not one column of rows. */
		width: min(760px, 94vw);
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.head {
		display: flex;
		align-items: center;
		gap: 14px;
	}
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
	.err {
		margin: 0 6px;
		font: 500 12px/1.4 var(--font-inter, sans-serif);
		color: #a4402e;
	}

	.cols {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 14px;
	}
	.col {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}
	.col-head {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 0 4px 4px;
		border-bottom: 1px solid rgba(43, 38, 32, 0.12);
	}
	.col-name {
		font-family: var(--font-opensans, 'Open Sans', sans-serif);
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-inkblue);
		opacity: 0.8;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.pencil {
		display: grid;
		place-items: center;
		width: 22px;
		height: 22px;
		padding: 0;
		border: 0;
		background: none;
		color: var(--color-inkblue);
		opacity: 0.4;
		cursor: pointer;
		transition: opacity 160ms ease-out;
	}
	.pencil:hover,
	.pencil:focus-visible {
		opacity: 0.95;
		outline: none;
	}
	.tally {
		margin-left: auto;
		font: 400 11px/1 var(--font-inter, sans-serif);
		color: var(--color-inkblue);
		opacity: 0.45;
	}
	.rename {
		flex: 1;
		min-width: 0;
		padding: 3px 6px;
		border: 1px solid rgba(43, 38, 32, 0.28);
		border-radius: 4px;
		background: #fff;
		font: 600 12px/1.2 var(--font-opensans, 'Open Sans', sans-serif);
		letter-spacing: 0.06em;
		color: var(--color-inkblue);
	}
	.rename:focus {
		outline: none;
		border-color: var(--color-inkblue);
	}
	.count {
		font: 400 10px/1 var(--font-inter, sans-serif);
		color: var(--color-inkblue);
		opacity: 0.45;
	}

	/* SEARCH'S SCROLLBAR AND ITS MASK, copied — a second list in this app that scrolled differently
	   would be the tell that it came from somewhere else. */
	.col-rows {
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: rgba(48, 42, 34, 0.22) transparent;
		max-height: calc(84vh - 12vh - 120px);
		padding: 2px 2px 10px;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}
	.col-rows::-webkit-scrollbar {
		width: 8px;
	}
	.col-rows::-webkit-scrollbar-track {
		background: transparent;
	}
	.col-rows::-webkit-scrollbar-thumb {
		background: rgba(48, 42, 34, 0.22);
		border-radius: 4px;
		border: 2px solid transparent;
		background-clip: content-box;
	}
	.col-rows::-webkit-scrollbar-thumb:hover {
		background: rgba(48, 42, 34, 0.4);
		background-clip: content-box;
	}

	.empty {
		margin: 6px 4px;
		font-family: var(--font-opensans, 'Open Sans', sans-serif);
		font-size: 12px;
		line-height: 1.5;
		color: var(--color-inkblue);
		opacity: 0.55;
	}

	.row {
		display: flex;
		align-items: center;
		border-radius: 5px;
		transition: background 140ms ease-out;
	}
	.row:hover {
		background: rgba(43, 38, 32, 0.06);
	}
	.row-go {
		display: flex;
		align-items: baseline;
		gap: 8px;
		flex: 1;
		min-width: 0;
		padding: 7px 8px;
		border: 0;
		background: none;
		text-align: left;
		cursor: pointer;
	}
	.row-go:focus-visible {
		outline: 2px solid var(--color-inkblue);
		outline-offset: -2px;
		border-radius: 5px;
	}
	.row-name {
		font: 400 13px/1.25 var(--font-inter, sans-serif);
		color: var(--color-inkblue);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.row-years {
		font: 400 11px/1 var(--font-inter, sans-serif);
		color: var(--color-inkblue);
		opacity: 0.45;
		white-space: nowrap;
	}
	.row-go svg.gold {
		color: #dcb130;
		flex: none;
		align-self: center;
	}
	.row-go svg.blue {
		color: #7fa9c9;
		flex: none;
		align-self: center;
	}
	/* The remove control stays quiet until the row is hovered — a column of X's reads as a list of
	   things to delete rather than a list of people. */
	.row-x {
		display: grid;
		place-items: center;
		width: 26px;
		height: 26px;
		margin-right: 4px;
		padding: 0;
		border: 0;
		background: none;
		color: var(--color-inkblue);
		opacity: 0;
		cursor: pointer;
		transition: opacity 160ms ease-out;
	}
	.row:hover .row-x,
	.row-x:focus-visible {
		opacity: 0.5;
		outline: none;
	}
	.row-x:hover {
		opacity: 1;
	}

	@media (max-width: 620px) {
		.cols {
			grid-template-columns: 1fr;
		}
	}
</style>
