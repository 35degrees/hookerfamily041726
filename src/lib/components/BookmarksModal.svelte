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
	import { listYears as years } from '$lib/utils/dates';
	import { modal, closeModal } from '$lib/state/modal.svelte';
	import { ascension } from '$lib/state/ascension.svelte';
	import { auth, setListName, setBookmark, LIST_NAME_MAX, type ListId } from '$lib/state/auth.svelte';
	import { flip } from 'svelte/animate';
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

	/**
	 * THE ROW IS A `.person-box`, NOT SOMETHING THAT RESEMBLES ONE — design §45.7, and SearchModal
	 * carries the scar that produced it. Its first result row was "a bespoke card with its own paper,
	 * its own shadow and an inset rounded thumbnail — a generic search-result avatar, which is exactly
	 * what it looked like", and Sam's verdict was "it's like you just came in off the street and
	 * didn't review my design."
	 *
	 * MY FIRST VERSION OF THIS MODAL MADE THE SAME MISTAKE IN THE SAME PLACE: transparent rows with a
	 * hover tint. Sam again: "each card being a discrete baseball card feel with heft. we don't do
	 * lists with transparent backgrounds that look like songlists at amazon prime music."
	 *
	 * So the row carries the whole card vocabulary — house paper, line-status shading, the notable
	 * star in its own gutter, the photo at a definite width, the blurb — and the only thing stated
	 * locally is the SIZE. Everything else is the house.
	 */
	type Row = NonNullable<ReturnType<typeof personById>> & { personId: string };

	/**
	 * ── REMOVING A BOOKMARK: THE GAP CLOSES, THE CARD DOES NOT TOUR THE WINDOW (083126) ───────────
	 *
	 * Sam asked for Paths to Thomas's feel — "the cards open and close to allow cards to enter and exit
	 * smoothly" — and the FIRST attempt took that too literally, flying the row out the left edge the
	 * way ConnectModal's leavers do. His verdict: "this isn't working at all ... it takes too long."
	 *
	 * The two surfaces are not the same gesture, and that is the lesson worth keeping. ConnectModal is
	 * SWAPPING one path for another, so departure is half the story — cards have to be seen leaving
	 * because others are about to take their seats. A deletion has no arrival. Nothing is coming, so a
	 * 440px journey is pure waiting, and it puts the motion on the object the reader has just finished
	 * with rather than on the list they are still reading.
	 *
	 * SO WHAT IS BORROWED IS THE SURVIVORS' HALF ONLY — beat 2 of ConnectModal's three, the part Sam
	 * actually pointed at ("replicate the slide up to close the open space"). The row goes at once and
	 * `animate:flip` carries everything below it up into the space, on the same 460ms clock. No delay,
	 * because with nothing departing there is nothing to wait for — the delay only existed there to stop
	 * survivors closing into an occupied seat.
	 */
	const FLIP_MS = 460; // survivors closing the gap — ConnectModal's own clock

	/**
	 * AND THE SCROLLBAR THAT FLASHED. Sam: "when i delete a bookmark the scrollbar for the column
	 * appears and then disappears. confusing."
	 *
	 * It is the flip itself. `animate:flip` holds each survivor at its OLD seat and animates to the new
	 * one, so for the length of the animation every card below the deleted row carries a DOWNWARD
	 * translate — and a transform that moves content down extends a scroll container's overflow. The
	 * column briefly believed it had more content than it does, showed a scrollbar for 460ms, and hid it
	 * again. Nothing was wrong with the list; the scrollbar was reporting on a transform.
	 *
	 * Clipping for the duration is safe here in a way it would not be generally: the content is SHRINKING
	 * by exactly one row, so anything that fitted before still fits after, and a column that was already
	 * scrolling gets its scrollbar back when the class comes off.
	 */
	let settling = $state(false);
	let settleTimer: ReturnType<typeof setTimeout> | null = null;
	function removeBookmark(personId: string) {
		settling = true;
		if (settleTimer) clearTimeout(settleTimer);
		settleTimer = setTimeout(() => (settling = false), FLIP_MS);
		void setBookmark(personId, null);
	}

	function rowsFor(list: ListId): Row[] {
		void search.ready;
		const out: Row[] = [];
		for (const { personId } of auth.all(list)) {
			const p = personById(personId);
			// A severed or merged id resolves to nothing. Dropped rather than rendered blank — the
			// bookmark row survives in the database, so re-sewing the person brings it back.
			if (!p) continue;
			out.push({ ...p, personId });
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
		// An orbit figure descends into the zone on arrival; a founder's green is derived from their
		// own tags by the room itself and needs nothing from here (§43.1).
		arriveAtPerson(r.slug, (r.f & CAT.INFLUENCE) !== 0);
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

						<div class="col-rows" class:settling>
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
								<!-- A founder who is ALSO orbit takes the GREEN — the founder skin overrides the
								     plain ascension, exactly as SearchModal derives it, so this list and the room
								     agree on one precedence. -->
								{@const isFounder = (r.f & CAT.FOUNDER) !== 0 && r.id !== 'H00001'}
								{@const isOrbit = (r.f & CAT.INFLUENCE) !== 0 && !isFounder}
								<div
									class="row-wrap"
									animate:flip={{ duration: FLIP_MS, easing: cubicOut }}
								>
									<a
										class="person-box bm-hit flex overflow-hidden rounded-lg"
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
													onerror={(e) =>
														((e.currentTarget as HTMLImageElement).style.display = 'none')}
												/>
											{/if}
										</div>
										<!-- The star is a GUTTER, not a prefix — reserved whether or not it is filled, so
										     every name starts at the same x and the column stays scannable. -->
										<span class="star" class:has={r.nb} aria-hidden={!r.nb}>{r.nb ? '★' : ''}</span>
										<div class="text-area flex min-w-0 flex-col justify-center">
											<span class="line1">
												<span class="nm">{r.n}</span>
												<span class="yr">{years(r)}</span>
											</span>
											<span class="line2">{r.bl ?? ''}</span>
										</div>
									</a>
									<button
										type="button"
										class="row-x"
										onclick={() => removeBookmark(r.personId)}
										aria-label={`Remove ${r.n}`}
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
		/**
		 * THE UNDERLINE ENDS WHERE THE CARDS END (Sam).
		 *
		 * The rule is the header's own border-bottom, so it spanned the full COLUMN — but the cards
		 * below do not: each sits in a `.row-wrap` beside a 26px remove button with a 2px gap, so they
		 * stop 28px short. The line ran past them and the column read as two different widths stacked.
		 *
		 * Derived from those two numbers rather than eyeballed, so if the button ever changes size the
		 * arithmetic is written down next to it.
		 */
		margin-right: 28px;
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
		/* SIZED TO ITS CONTENT, NOT TO THE COLUMN. It was `flex: 1`, so a box that can only ever hold
		   25 characters stretched across the whole column and read as a search field. `ch` is the
		   width of a "0" in the current font, which is the unit that actually answers "how wide is 25
		   characters" — a px guess would drift the moment the face or size changed. */
		flex: none;
		width: 25ch;
		max-width: 100%;
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
	/* See `settling` in the script — the flip's downward transforms briefly extend this column's
	   overflow, which showed a scrollbar for the length of the animation and then hid it. */
	.col-rows.settling {
		overflow-y: hidden;
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

	/**
	 * THE ROW IS A CARD, AND ONLY ITS SIZE IS STATED HERE.
	 *
	 * `.person-box` brings the paper, the shadow, the radius, the line-status shading and the star
	 * gutter — the same object the tree is built out of. Sam: "each card being a discrete baseball
	 * card feel with heft. we don't do lists with transparent backgrounds that look like songlists at
	 * amazon prime music." The first version of this modal was exactly that songlist.
	 *
	 * 62px rather than search's 54: this row carries a blurb under the name, where a search hit often
	 * carries a one-line reason. Everything else is deliberately unstated so it cannot drift from the
	 * house.
	 */
	.bm-hit {
		height: 62px;
		/* `flex: none` IS LOAD-BEARING — SearchModal's own scar. `.col-rows` is an overflowing column
		   flex container, and a flex item's default `flex-shrink: 1` applies to a definite height just
		   as it does to a basis, so without this the browser is free to compress every card. It did:
		   54px became 33px at three viewports. */
		flex: none;
		flex: 1;
		min-width: 0;
		text-decoration: none;
		cursor: pointer;
	}
	/* THE PHOTO IS SIZED, NOT INFERRED. Leaving it to `aspect-square` plus the stretched row height is
	   circular — the row's height depends on its content, the photo IS content — and the tie-break is
	   the image's INTRINSIC size, which is why one 720x962 portrait once grew its own row. */
	.bm-hit .photo {
		width: 62px;
	}
	/* Neither line may grow the row: a long name was the other way in. */
	.bm-hit .line1,
	.bm-hit .line2 {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	/* The zone's own grounds, so the room a click leads to is legible before the click — the same two
	   tokens search reads, taken by name so this list cannot drift from the room it names. */
	.bm-hit.orbit-row {
		--card-bg: var(--color-ascendmidnight);
	}
	.bm-hit.founder-row {
		--card-bg: var(--color-foundergreen);
	}


	/**
	 * THE CARD'S TYPOGRAPHY, AND IT HAS TO BE STATED HERE — this is what was wrong.
	 *
	 * `.nm` / `.yr` / `.line2` / `.text-area` are styled LOCALLY inside SearchModal, not globally, so
	 * borrowing the class names inherited nothing and the browser's defaults showed through: a huge
	 * unstyled name with no padding over tiny years. Sam: "the giant font for the names with no
	 * padding and the little tiny years font."
	 *
	 * THE FACES ARE THE HOUSE'S, taken for the reasons SearchModal records rather than picked:
	 *   NAME — Outfit at 400, in inkblue. FeaturedCard's <h1> is `font-outfit` + `font-medium` +
	 *          `text-inkblue`, and a bookmark row is the same person named the same way at a smaller
	 *          size, so it takes the same face and the same ink rather than a near-miss of both.
	 *   REST — Open Sans, inkblue at 80%, so a row is ONE ink at two strengths rather than a blue
	 *          name sitting on a line of warm brown.
	 */
	.text-area {
		padding: 7px 12px;
		gap: 3px;
	}
	.line1 {
		display: flex;
		align-items: baseline;
		gap: 7px;
		min-width: 0;
	}
	.nm {
		font-family: var(--font-outfit, 'Outfit Variable', sans-serif);
		font-size: 15px;
		font-weight: 400;
		line-height: 1.2;
		color: var(--color-inkblue);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.yr {
		font: 400 12px/1.2 var(--font-open-sans, 'Open Sans', sans-serif);
		color: color-mix(in srgb, var(--color-inkblue) 80%, transparent);
		white-space: nowrap;
		flex: none;
	}
	.line2 {
		font: 400 12px/1.3 var(--font-open-sans, 'Open Sans', sans-serif);
		color: color-mix(in srgb, var(--color-inkblue) 80%, transparent);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	/* The dark grounds take cream ink — §41.3: cream is defined entirely by the dark behind it. */
	.orbit-row .nm,
	.founder-row .nm,
	.orbit-row .yr,
	.founder-row .yr,
	.orbit-row .line2,
	.founder-row .line2 {
		color: rgba(247, 241, 230, 0.94);
	}

	/* The star is a GUTTER: fixed width, reserved whether filled or not, so every name starts at the
	   same x and the column stays scannable. In the NAME's own ink rather than gold — a gold mark on
	   a navy name reads as a separate object stacked down its own column. */
	.star {
		flex: none;
		display: grid;
		place-items: center;
		width: 13px;
		margin-left: 10px;
		font-size: 10px;
		line-height: 1;
		color: color-mix(in srgb, var(--color-inkblue) 55%, transparent);
	}
	.star:not(.has) {
		visibility: hidden;
	}
	.bm-hit .text-area {
		padding-left: 8px;
	}
	.orbit-row .star,
	.founder-row .star {
		color: rgba(247, 241, 230, 0.7);
	}

	.row-wrap {
		display: flex;
		align-items: center;
		gap: 2px;
	}
	/* The remove control stays quiet until the row is hovered — a column of X's reads as a list of
	   things to delete rather than a list of people. */
	.row-x {
		display: grid;
		place-items: center;
		width: 26px;
		height: 26px;
		flex: none;
		padding: 0;
		border: 0;
		background: none;
		color: var(--color-inkblue);
		opacity: 0;
		cursor: pointer;
		transition: opacity 160ms ease-out;
	}
	.row-wrap:hover .row-x,
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
