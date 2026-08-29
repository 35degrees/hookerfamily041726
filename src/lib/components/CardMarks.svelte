<script lang="ts">
	/**
	 * CardMarks — the ribbon and the house, on the featured card's top-left corner.
	 *
	 * TWO OBJECTS, NOT ONE CONTROL WITH FOUR STATES. Sam reached this by trying the single-circle
	 * version and finding the flaw himself: a cycle of gold → blue → home → blank would mean a
	 * casual click could destroy an existing home card. Bookmarks and homes are different kinds of
	 * act — one is cheap and frequent, the other is rare and destructive of prior state — and a
	 * control that conflates them makes the cheap gesture dangerous.
	 *
	 * They are also deliberately DIFFERENT SHAPES rather than two colours of one shape. A ribbon and
	 * a house read as two jobs at a glance; two ribbons in different colours read as one job in two
	 * states. Someone exploring the corner should not have to discover the difference by using it.
	 *
	 * SIGNED-IN ONLY. Nothing renders for a signed-out reader — Sam's call, and the argument for it
	 * is that an unfilled ribbon nobody can use is a control that lies about being available. The
	 * cost is that the feature is undiscoverable until you have an account; that is a known trade.
	 *
	 * A SIBLING OF THE CLIPPED CARD, NEVER A CHILD. The featured card's silhouette is a `clip-path`,
	 * so anything inside it is cut at the boundary — and these circles sit MOSTLY OUTSIDE the card,
	 * anchored by their bottom-right corner over the top-left corner (Sam: "largely off the card").
	 * Mounted as a child, ~80% of each circle would simply vanish, and it would read as a broken
	 * asset rather than as clipping.
	 */
	import { auth, setBookmark, setHero, type ListId } from '$lib/state/auth.svelte';
	import { load, personById } from '$lib/state/search.svelte';

	/**
	 * `personName` is the card's full display name — right for a tooltip, wrong for a button.
	 * `shortName` is the compact form (Sam: "the names wrap inside the button"), resolved by the
	 * page from chip_first_name → first+last+suffix → display name. Two props rather than one
	 * because the confirmation SENTENCE wants the full name and the BUTTON wants the short one.
	 */
	let {
		personId,
		personName,
		shortName
	}: { personId: string; personName: string; shortName: string } = $props();

	const list = $derived(auth.listFor(personId));
	const isHero = $derived(auth.isHero(personId));

	/** Transient, and it says what HAPPENED rather than what the control is — a confirmation, not a
	 *  label. Cleared on a timer; re-firing resets the timer rather than stacking. */
	let toast = $state('');
	let toastTimer: ReturnType<typeof setTimeout> | undefined;
	function say(msg: string) {
		toast = msg;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toast = ''), 2200);
	}

	/**
	 * THE CYCLE: none → 1 → 2 → none.
	 *
	 * The known cost, named rather than designed around: clearing a gold bookmark passes THROUGH
	 * blue, so "remove" is two clicks and briefly files the person into List 2. With only two lists
	 * the wrong state is visible and one click from right, and every alternative was worse — a
	 * popover is a widget (§45.12), a shift-click is a hidden affordance, two ribbons double the
	 * card's chrome for a rare action.
	 *
	 * WHAT MAKES IT HONEST IS THE WORDING. Gold → blue says "MOVED to", not "added to". Sam's
	 * concern was that a user might think the entry had been filed into both lists at once; "moved"
	 * is the one word that answers it, and the unique index on (user_id, person_id) means it is also
	 * literally true.
	 */
	function nextList(current: ListId | null): ListId | null {
		if (current === null) return 1;
		if (current === 1) return 2;
		return null;
	}

	function onRibbon() {
		const next = nextList(list);
		const wasList = list;
		void setBookmark(personId, next);
		if (next === null) say('Bookmark removed');
		else if (wasList === null) say(`Bookmark added to ${auth.listName(next)}`);
		else say(`Moved to ${auth.listName(next)}`);
	}

	/**
	 * THE HOME IS GATED, AND ONLY WHEN THERE IS SOMETHING TO LOSE.
	 *
	 * Setting the FIRST hero is purely additive — nothing is destroyed, so a confirmation would be
	 * friction taxing the very gesture the feature wants to encourage. REPLACING one destroys a
	 * choice the reader may not remember making, and which nothing else records. So the gate appears
	 * exactly when there is a previous value, and it NAMES that value, because "Proceed?" protects
	 * the action without telling you what you are about to lose.
	 *
	 * Resolving the previous id to a NAME needs the corpus, which this component does not have —
	 * so the confirmation is raised to the page, which does. See the `onhero` callback.
	 */
	let heroBusy = $state(false);
	/** Non-null while the replace confirmation is open. Carries the name to be overwritten. */
	let confirmReplacing = $state<string | null>(null);

	async function onHouse() {
		if (heroBusy) return;

		// CLEARING is not gated. You are looking at the card you are clearing, so nothing is lost
		// that you cannot see — which is the whole distinction the gate below is drawn on.
		if (isHero) {
			heroBusy = true;
			try {
				await setHero(null);
				// SAY WHAT IT GOES BACK TO, not just what was removed (Sam: "it should default back
				// to H00001"). Clearing your home does not leave you homeless — `/` returns you to
				// Thomas Hooker, the line's own root (§50.3), and a message that only says "removed"
				// leaves the reader to wonder where they will land instead.
				say('Home cleared — back to Thomas Hooker');
			} catch {
				say('Could not save — try again');
			} finally {
				heroBusy = false;
			}
			return;
		}

		const previous = auth.user?.heroPersonId ?? null;

		// FIRST HERO: purely additive, nothing to destroy, no gate. Taxing this gesture would be
		// taxing the one the feature wants to encourage.
		if (!previous || previous === personId) {
			await commitHero();
			return;
		}

		/**
		 * REPLACING: name the person being lost.
		 *
		 * `load()` is the search index, idempotent and usually already warm because SearchTrigger
		 * fetches it on hover. It is the app's only id → name resolver (see `personById`) — the
		 * payloads are keyed by SLUG, and a hero is stored by ID, so there is no file to fetch.
		 *
		 * If it cannot be resolved — index still loading, or the person since severed — the
		 * confirmation still appears, worded without a name. A gate that silently disappears when a
		 * lookup fails would be the dangerous failure; a vaguer gate is the safe one.
		 */
		heroBusy = true;
		try {
			await load();
			confirmReplacing = personById(previous)?.n ?? '';
		} catch {
			confirmReplacing = '';
		} finally {
			heroBusy = false;
		}
	}

	async function commitHero() {
		heroBusy = true;
		try {
			await setHero(personId);
			say(`${personName} is now your home card`);
		} catch {
			say('Could not save — try again');
		} finally {
			heroBusy = false;
			confirmReplacing = null;
		}
	}
</script>

{#if auth.signedIn}
	<div class="card-marks">
		<button
			type="button"
			class="mark ribbon"
			class:gold={list === 1}
			class:blue={list === 2}
			onclick={onRibbon}
			aria-pressed={list !== null}
			title={list === null
				? `Save ${personName}`
				: `In ${auth.listName(list)} — click to ${list === 1 ? 'move' : 'remove'}`}
		>
			<!-- A ribbon/bookmark: fills rather than changes shape, so the three states differ only in
			     ink. `currentColor` throughout, so one CSS rule sets both stroke and fill. -->
			<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
				<path
					d="M7 3.5h10a1.5 1.5 0 0 1 1.5 1.5v15.2a.6.6 0 0 1-.94.5L12 16.6l-5.56 4.1a.6.6 0 0 1-.94-.5V5A1.5 1.5 0 0 1 7 3.5z"
					fill={list === null ? 'none' : 'currentColor'}
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linejoin="round"
				/>
			</svg>
		</button>

		<button
			type="button"
			class="mark house"
			class:on={isHero}
			onclick={onHouse}
			disabled={heroBusy}
			aria-pressed={isHero}
			title={isHero
				? `${personName} is your home card — click to clear`
				: `Make ${personName} your home card`}
		>
			<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
				<path
					d="M4 10.4 12 4l8 6.4V19a1.2 1.2 0 0 1-1.2 1.2H5.2A1.2 1.2 0 0 1 4 19v-8.6z"
					fill={isHero ? 'currentColor' : 'none'}
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linejoin="round"
				/>
			</svg>
		</button>

		{#if toast}
			<span class="toast">{toast}</span>
		{/if}
	</div>

	{#if confirmReplacing !== null}
		<!-- A GATE THAT NAMES WHAT IS BEING LOST. "Proceed?" protects the action without telling you
		     what it costs; naming the person is the entire content of the warning — and it is what
		     lets a CANCELLED confirmation still leave the reader knowing what they had. -->
		<div class="confirm-veil" role="presentation" onclick={() => (confirmReplacing = null)}></div>
		<div class="confirm" role="dialog" aria-modal="true" aria-label="Change your home card">
			<p class="confirm-text">
				{#if confirmReplacing}
					This will replace <strong>{confirmReplacing}</strong> as the first card you see when you
					sign in.
				{:else}
					This will replace your current home card — the first card you see when you sign in.
				{/if}
			</p>
			<div class="confirm-acts">
				<button type="button" class="confirm-btn ghost" onclick={() => (confirmReplacing = null)}>
					Cancel
				</button>
				<button type="button" class="confirm-btn go" onclick={commitHero} disabled={heroBusy}>
					{heroBusy ? 'Saving…' : `Make ${shortName} my home`}
				</button>
			</div>
		</div>
	{/if}
{/if}

<style>
	.card-marks {
		position: absolute;
		/* ANCHORED BY THE BOTTOM-RIGHT OF THE PAIR over the card's top-left corner, so most of each
		   circle sits OUTSIDE the card (Sam). It reads as something attached to the card rather than
		   printed on it, and it keeps the card's own face clear. */
		top: -16px;
		/* THE NUDGE, and the arithmetic is written down because it was overshot once.
		   Sam asked for "off card a bit more"; 10% of the 33px circle (-16 -> -20) was too far. 2%
		   is 0.66px, so -16 -> -16.7. Sub-pixel is deliberate and normal here — the Shuffle's own
		   lift is -1.32px — and at this size a whole pixel is already a visible step. */
		left: -16.7px;
		/* A COLUMN — the house sits BENEATH the ribbon (Sam, 082926), not beside it. Stacked, the two
		   run down the card's left edge instead of across its top, which keeps them clear of the
		   name and out of the header's reading line. */
		display: flex;
		flex-direction: column;
		gap: 6px;
		z-index: 3;
	}

	/**
	 * ONE OBJECT AT TWO SIZES OF THE SAME IDEA — the Shuffle's physics, scaled down. Hover raises,
	 * the press returns a FRACTION of that height and never crosses below the surface (§45.12 and
	 * ShuffleNotables' own comment: a real button changes HEIGHT, not colour, when you approach it).
	 */
	.mark {
		--lift: -1.1px;
		--press: -0.44px;
		display: grid;
		place-items: center;
		/* 26 -> 33: a quarter larger (Sam). At 26 they read as UI dropped on the card; at 33 they read
		   as objects belonging to it, which is the difference the whole treatment depends on. */
		width: 33px;
		height: 33px;
		padding: 0;
		border: 0;
		border-radius: 50%;
		cursor: pointer;
		/* The house paper, so the circles read as objects of this app rather than UI dropped on it.
		   Opaque, because §29 says a card cannot be translucent and these are small cards. */
		background: #fbf8f1;
		color: rgba(43, 38, 32, 0.42);
		box-shadow:
			0 0.6px 1.6px rgba(20, 28, 46, 0.22),
			0 0 0 0.5px rgba(43, 38, 32, 0.08);
		transform: translateY(0);
		/**
		 * COLOUR IS NOT TRANSITIONED, AND THAT IS THE FIX FOR THE BLACK FLASH.
		 *
		 * Sam: "for a few milliseconds a small beat the ribbon is black filled but instantly changes
		 * to gold." The specificity fix landed, but a second cause was hiding behind it: the ribbon's
		 * `fill` is `currentColor`, and `color` was on a 160ms transition. So on the first click the
		 * fill switched on INSTANTLY while the colour was still travelling from the resting grey —
		 * and for those 160ms you were watching a dark ribbon fade to gold. The ink was mid-animation,
		 * not wrong.
		 *
		 * Removing `color` from the transition makes every ink change instantaneous, so the ribbon is
		 * only ever grey, gold or blue — never anything in between, which is what Sam asked for.
		 *
		 * It costs nothing, because the feel was never in the colour: §45.12 and ShuffleNotables both
		 * say a real button changes HEIGHT, not colour, when you approach it. The transform and the
		 * shadow still carry the whole gesture.
		 */
		transition:
			transform 190ms cubic-bezier(0.34, 1.36, 0.64, 1),
			box-shadow 190ms ease-out;
	}
	.mark:hover:not(:disabled) {
		transform: translateY(var(--lift));
		box-shadow:
			0 1.7px 3.4px rgba(20, 28, 46, 0.26),
			0 0 0 0.5px rgba(43, 38, 32, 0.1);
		color: rgba(43, 38, 32, 0.72);
	}
	/* Down is FAST with no overshoot — a press answers the finger instantly; a button that bounces
	   on the way down feels like rubber. The bounce belongs on the way back up. */
	.mark:active:not(:disabled) {
		transform: translateY(var(--press));
		transition:
			transform 80ms ease-out,
			box-shadow 80ms ease-out;
	}
	.mark:focus-visible {
		outline: 2px solid var(--color-inkblue);
		outline-offset: 2px;
	}
	.mark:disabled {
		cursor: default;
	}

	/**
	 * THE TWO INKS — and these rules come LAST for a reason that cost a round of feedback.
	 *
	 * THE BUG SAM SAW: "the ribbon is never filled with black, its filled gold instantly". A gold
	 * ribbon was turning dark on hover, and it was pure specificity — §30's CSS-property-outranking
	 * trap, now the fifth time it has bitten in this project.
	 *
	 *   .mark:hover:not(:disabled)   0,3,0   <- the grey hover ink
	 *   .ribbon.gold                 0,2,0   <- lost
	 *
	 * So the moment the pointer was over the thing you had just clicked, gold lost to grey. Worse,
	 * the "fix" already in the file was `.ribbon.gold:hover { color: currentColor }`, which is
	 * circular — `currentColor` on the element resolves to the INHERITED value, not to the rule
	 * being written, so it silently resolved to the card's own dark ink. That is where the black
	 * came from.
	 *
	 * The fix is to state the filled states explicitly for both rest and hover, after the base
	 * rules, so a filled ribbon is its colour in every interaction state and never negotiates.
	 * Hover brightens the SAME hue rather than switching hue — the object changes height on hover
	 * (§45.12), not identity.
	 *
	 * Gold is the Shuffle's family so the app has one gold rather than two that nearly match. Powder
	 * blue is a genuinely different hue rather than a dimmer gold, because neither list ranks above
	 * the other and a dimmer version would say it did.
	 */
	.ribbon.gold {
		color: #dcb130;
	}
	.ribbon.gold:hover:not(:disabled),
	.ribbon.gold:active:not(:disabled) {
		color: #ecc44e;
	}
	.ribbon.blue {
		color: #7fa9c9;
	}
	.ribbon.blue:hover:not(:disabled),
	.ribbon.blue:active:not(:disabled) {
		color: #9cc2de;
	}
	/* The house fills with the house ink rather than a third hue — it is not a third list, and a
	   colour of its own would imply it belonged to the ribbon's family. */
	.house.on {
		/* MIDNIGHT BLUE (Sam), and it is the app's own token rather than a new hue — the
		   ascension's ground colour, which is the darkest ink this app already owns. A home card
		   is the one entry the reader has claimed, so it takes the heaviest ink available and is
		   unmistakably NOT a third bookmark colour. */
		color: var(--color-ascendmidnight, #1c2b4a);
	}
	.house.on:hover:not(:disabled),
	.house.on:active:not(:disabled) {
		color: var(--color-ascendmidnight, #1c2b4a);
		filter: brightness(1.35);
	}

	/**
	 * THE TOAST SAYS WHAT HAPPENED, not what the control does — the titles already do the latter.
	 * It sits to the RIGHT of the pair and outside the card, so it never covers the portrait, and it
	 * is `pointer-events: none` so it cannot swallow the next click while it fades.
	 */
	.toast {
		position: absolute;
		left: 41px;
		top: 4px;
		white-space: nowrap;
		pointer-events: none;
		padding: 4px 9px;
		border-radius: 5px;
		background: rgba(43, 38, 32, 0.9);
		color: #fbf8f1;
		font: 500 11px/1 var(--font-inter, sans-serif);
		letter-spacing: 0.01em;
		box-shadow: 0 1.5px 4px rgba(20, 28, 46, 0.25);
		animation: toast-in 160ms ease-out;
	}
	@keyframes toast-in {
		from {
			opacity: 0;
			transform: translateX(-3px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	/**
	 * THE CONFIRMATION IS NOT A MODAL IN `modal.svelte.ts`'S SENSE, deliberately.
	 *
	 * That store is the app's ONE overlay slot, and opening this would close whatever the reader had
	 * open — Search, the ladder, connect-to-anyone. This gate is a property of one card's control,
	 * not a surface of its own: it interrupts a single gesture and gets out of the way. So it is
	 * local, it sits above the card, and it never touches the slot.
	 *
	 * Its own small veil catches the outside click. Lighter than the marshmallow one (§45.10) because
	 * this is a question about one control, not a room the reader has arrived in.
	 */
	.confirm-veil {
		position: fixed;
		inset: 0;
		z-index: 44;
		background: rgba(43, 38, 32, 0.14);
		backdrop-filter: blur(1.5px);
		-webkit-backdrop-filter: blur(1.5px);
	}
	.confirm {
		position: fixed;
		z-index: 45;
		/* HIGHER THAN CENTRE (Sam: "its too low vs where the home button is clicked"). A gate that
		   appears far from the control that opened it reads as a page-level event rather than as an
		   answer to the thing just pressed. 28% puts it near the card's upper third, which is where
		   the house sits. */
		top: 28%;
		left: 50%;
		transform: translate(-50%, 0);
		width: min(340px, 90vw);
		display: flex;
		flex-direction: column;
		gap: 13px;
		padding: 16px 17px 14px;
		border-radius: 9px;
		background: #fbf8f1;
		box-shadow:
			0 8px 26px rgba(20, 28, 46, 0.24),
			0 0 0 0.5px rgba(43, 38, 32, 0.1);
	}
	.confirm-text {
		margin: 0;
		font-family: var(--font-opensans, 'Open Sans', sans-serif);
		font-size: 13px;
		line-height: 1.5;
		color: var(--color-inkblue);
	}
	.confirm-text strong {
		font-weight: 600;
	}
	.confirm-acts {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
	}
	.confirm-btn {
		/* NEVER WRAP. A two-line button reads as a paragraph with a border, and the name inside it
		   is variable-length by nature — "Commodore Vanderbilt" wrapped where "Sam" would not. The
		   short name keeps it inside one line; this keeps it there even when it does not. */
		white-space: nowrap;
		padding: 8px 13px;
		border: 0;
		border-radius: 6px;
		font: 500 12px/1 var(--font-inter, sans-serif);
		cursor: pointer;
		transition:
			opacity 150ms ease-out,
			background 150ms ease-out;
	}
	.confirm-btn.ghost {
		background: transparent;
		color: var(--color-inkblue);
		opacity: 0.62;
	}
	.confirm-btn.ghost:hover {
		opacity: 1;
	}
	.confirm-btn.go {
		background: var(--color-inkblue);
		color: #fbf8f1;
	}
	.confirm-btn.go:hover:not(:disabled) {
		background: rgba(43, 38, 32, 0.92);
	}
	.confirm-btn:disabled {
		cursor: default;
		opacity: 0.6;
	}
	.confirm-btn:focus-visible {
		outline: 2px solid var(--color-inkblue);
		outline-offset: 2px;
	}
</style>
