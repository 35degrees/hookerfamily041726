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
	 * NO `title` ATTRIBUTES (Sam: "lets get rid of your sub bottom tooltip. i think its clear what the
 * bookmark is for"). The browser's native tooltip is a second, slower, differently-styled label
 * arriving under the cursor while this component already has a toast of its own saying what
 * happened — two explanations for one control, in two visual languages, one of which the app has no
 * say over.
 *
 * The strings survive as `aria-label`, so a screen reader still gets them. Dropping them entirely
 * would have traded a visual annoyance for an accessibility regression, which is not a trade.
 *
 * A SIBLING OF THE CLIPPED CARD, NEVER A CHILD. The featured card's silhouette is a `clip-path`,
	 * so anything inside it is cut at the boundary — and these circles sit MOSTLY OUTSIDE the card,
	 * anchored by their bottom-right corner over the top-left corner (Sam: "largely off the card").
	 * Mounted as a child, ~80% of each circle would simply vanish, and it would read as a broken
	 * asset rather than as clipping.
	 */
	import { auth, setBookmark, setHero, type ListId } from '$lib/state/auth.svelte';
	import { load, personById } from '$lib/state/search.svelte';
	import { cubicOut } from 'svelte/easing';

	/**
	 * `personName` is the card's full display name — right for a tooltip, wrong for a button.
	 * `shortName` is the compact form (Sam: "the names wrap inside the button"), resolved by the
	 * page from chip_first_name → first+last+suffix → display name. Two props rather than one
	 * because the confirmation SENTENCE wants the full name and the BUTTON wants the short one.
	 */
	let {
		personId,
		personName,
		shortName,
		canBeHome = true
	}: {
		personId: string;
		personName: string;
		shortName: string;
		/**
		 * ORBIT FIGURES AND HARTFORD FOUNDERS CANNOT BE A HOME CARD (Sam, 082926) — the ribbon still
		 * works on them, only the house is withheld. A home card is where the reader LIVES in this
		 * tree, and an influence or a founder is somebody the tree reaches sideways; landing there on
		 * every visit would make the orbit the centre.
		 *
		 * H00001 IS THE EXCEPTION, and the app had already made this exact call once:
		 * `ascension.svelte.ts` excludes Thomas Hooker from `isFounder` BY ID for the same reason —
		 * he carries `hartford_founder` and is the line's root rather than a founder the tree merely
		 * touches. The predicate is computed in the page from that same rule, so the two cannot drift.
		 */
		canBeHome?: boolean;
	} = $props();

	const list = $derived(auth.listFor(personId));
	const isHero = $derived(auth.isHero(personId));

	/**
	 * A KEYED LIST, NOT A SINGLE SLOT — third attempt, and the previous two failed for the same
	 * reason: they tried to REPLAY an effect on a node that already existed.
	 *
	 *   1. one `toast` string + a CSS animation      -> the text changed, the animation did not replay
	 *   2. the same + `{#key}` to force recreation   -> still unreliable
	 *
	 * Each toast is now its own object with its own id, rendered by a keyed `{#each}`. Svelte's
	 * guarantee there is unambiguous: a new key means a new element, `in:` runs on mount and `out:`
	 * runs on removal, every time, with no shared node for a second message to inherit. Two rapid
	 * clicks briefly overlap and each fades on its own clock, which is correct — they are two
	 * separate things that happened.
	 */
	let toasts = $state<{ id: number; msg: string }[]>([]);
	let toastId = 0;

	function say(msg: string) {
		const id = ++toastId;
		toasts = [...toasts, { id, msg }];
		/**
		 * THE HOLD. The fade-out runs AFTER this, so the total life is hold + out.
		 *
		 * TUNED TWICE, IN BOTH DIRECTIONS, WHICH IS WHY THE NUMBERS ARE WRITTEN DOWN:
		 *
		 *   2200ms hold, no fade at all   "dark black ink ... takes up all their attention"
		 *   220 hold / 420 out            "a little too aggressive ... the off and on"
		 *   350 hold / 840 out            "rapid fire"
		 *   420 hold / 1010 out           here — +20%, ~1.7s total
		 *
		 * And there IS prior art rather than taste — Sam asked. Material's snackbar motion is ~200ms
		 * in and ~150ms out; iOS-style transient toasts run a couple of seconds end to end. The
		 * common shape across both: the ENTER is quick enough to feel like a response to the click,
		 * the EXIT is slower than the enter, and the total is under two seconds for something purely
		 * informational. 265 in / 420 hold / 1010 out is ~1.7s total and sits inside that.
		 *
		 * The exit being three to four times the enter is the part that reads as "gentle" rather than
		 * "blinking" — an abrupt disappearance is what made the first version feel like a switch.
		 */
		setTimeout(() => {
			toasts = toasts.filter((t) => t.id !== id);
		}, 420);
	}

	/**
	 * SVELTE TRANSITIONS, NOT A CSS ANIMATION — and this is the second attempt at the same problem.
	 *
	 * Sam, twice: "it only works the first time", then "you didn't fix toast on bookmarks it still
	 * only runs once."
	 *
	 * The first fix was `{#key toastSeq}` to force the node to be recreated so a CSS `animation`
	 * would replay. The markup was correct and it still did not work reliably — which is the tell
	 * that CSS animation replay was the wrong mechanism to be depending on at all, not that the key
	 * was missing. An `animation` with `forwards` leaves the element parked at its final frame, and
	 * whether a fresh element replays it depends on details that are not worth being clever about.
	 *
	 * Svelte transitions have no such ambiguity: `in:` runs on mount and `out:` runs on unmount, every
	 * time, by definition. The `{#key}` stays, so a click arriving mid-fade gets a genuinely new node
	 * rather than interrupting the old one's exit.
	 *
	 * And per §45.11's trap, recorded there after it cost a session: a custom transition SILENTLY
	 * IGNORES any option it does not destructure. Both of these take `duration` explicitly.
	 */
	function toastIn(_node: Element, { duration }: { duration: number }) {
		return {
			duration,
			easing: cubicOut,
			css: (t: number) => `opacity: ${t}; transform: translateY(${((1 - t) * 3).toFixed(2)}px);`
		};
	}
	function toastOut(_node: Element, { duration }: { duration: number }) {
		return {
			duration,
			easing: cubicOut,
			// Fades in place — it is leaving, not travelling. Movement on the way out would read as a
			// second event rather than the end of the first.
			css: (t: number) => `opacity: ${t};`
		};
	}

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

		/**
		 * THE CONFIRMATION IS NOT OPTIONAL, AND MY MAKING IT SO IS WHY THIS LOOKED BROKEN.
		 *
		 * Sam asked for it plainly at the start: "a modal confirmation can occur, saying something
		 * like by clicking this, James will be the first card you see when you log in. Proceed? and
		 * then there's a OK or cancel button. so its an extra step to confirm."
		 *
		 * I then added an asymmetry nobody requested — skip the gate when there is no PREVIOUS hero,
		 * on the reasoning that a first set destroys nothing. The reasoning was fine and the decision
		 * was not mine to make. Worse, it made the feature look broken rather than opinionated: with
		 * `heroPersonId` null, EVERY set is a first set, so the gate never appeared at all, and Sam
		 * reported the modal missing four separate times while the code did exactly what I had told
		 * it to.
		 *
		 * It always gates now. The only thing that varies is the WORDING — replacing names the person
		 * being lost, because that is the fact worth carrying and it is what a cancelled confirmation
		 * should leave you knowing.
		 *
		 * The lesson is not about modals: an unrequested optimisation that removes a step the user
		 * asked for is indistinguishable, from outside, from a bug.
		 */
		const previous = auth.heroPersonId;
		heroBusy = true;
		try {
			// Resolve the outgoing hero's NAME if there is one. The search index is the app's only
			// id -> name resolver (payloads are keyed by slug, heroes are stored by id), idempotent,
			// and usually already warm from SearchTrigger's hover.
			if (previous && previous !== personId) {
				await load();
				confirmReplacing = personById(previous)?.n ?? '';
			} else {
				// No previous hero: still gated, just with nothing to name.
				confirmReplacing = '';
			}
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
			aria-label={list === null
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

		{#if canBeHome}
		<button
			type="button"
			class="mark house"
			class:on={isHero}
			onclick={onHouse}
			disabled={heroBusy}
			aria-pressed={isHero}
			aria-label={isHero
				? `${personName} is your home card — click to clear`
				: `Make ${personName} your home card`}
		>
			<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
				<path
					d="M4 10.4 12 4l8 6.4V19a1.2 1.2 0 0 1-1.2 1.2H5.2A1.2 1.2 0 0 1 4 19v-8.6z"
					fill={isHero ? 'currentColor' : 'none'}
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linejoin="round"
				/>
			</svg>
		</button>
		{/if}

		{#each toasts as t (t.id)}
			<span class="toast" in:toastIn={{ duration: 265 }} out:toastOut={{ duration: 1010 }}>
				{t.msg}
			</span>
		{/each}
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
					<strong>{personName}</strong> will be the first card you see when you sign in.
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
		/* -16 -> -17.65 (Sam: "move up 5%"). 5% of the 33px ribbon is 1.65px, so more of both circles
		   clears the card's top border and they read as resting ON the edge rather than straddling it. */
		top: -17.65px;
		/* THE NUDGE, and the arithmetic is written down because it was overshot once.
		   Sam asked for "off card a bit more"; 10% of the 33px circle (-16 -> -20) was too far. 2%
		   is 0.66px, so -16 -> -16.7. Sub-pixel is deliberate and normal here — the Shuffle's own
		   lift is -1.32px — and at this size a whole pixel is already a visible step. */
		left: -16.7px;
		/* A ROW — the house sits to the RIGHT of the ribbon, both riding the card's top border.
		   Tried as a column first (082926) and reverted the same session on Sam's eye: stacked, the
		   pair ran down the card's left edge and read as a toolbar growing off the side. Along the
		   top border they read as two objects resting on the card's edge, which is what they are. */
		display: flex;
		flex-direction: row;
		/* CENTRES ALIGNED, not tops — the two circles are different sizes now, and what should line up
		   is the line they sit on, not their upper edges. */
		align-items: center;
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
	/**
	 * THE HOUSE IS 10% SMALLER THAN THE RIBBON — 33px -> 30px (Sam).
	 *
	 * Not arbitrary once it is there: the ribbon is the frequent gesture and the house is the rare
	 * one, so the pair now has an ORDER to read rather than two equal controls competing. Same
	 * reasoning §45.15 used to seat the corner cluster — the sizes say which one you reach for.
	 */
	.house {
		width: 30px;
		height: 30px;
	}
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
		/* ABOVE THE RIBBON, not along the card's top edge (Sam: "i don't like its placement along top
		   edge of card, it should be smaller above bookmark itself"). Anchored over the FIRST circle
		   rather than centred on the pair, so it sits above the control that produced it — and so its
		   position does not shift when the house is absent on orbit and founder cards. */
		bottom: calc(100% + 5px);
		left: 0;
		white-space: nowrap;
		pointer-events: none;
		padding: 3px 7px;
		border-radius: 4px;
		/* MIDNIGHT BLUE AT 70%, NOT NEAR-BLACK AT 90%. A receipt, not an announcement — it says what
		   you just did and gets out of the way. The old ink was the heaviest thing on screen for two
		   full seconds, which reads as the app asking you to admire the action. */
		background: color-mix(in srgb, var(--color-ascendmidnight, #1c2b4a) 70%, transparent);
		color: #fbf8f1;
		font: 500 10px/1 var(--font-inter, sans-serif);
		letter-spacing: 0.01em;
		box-shadow: 0 1.5px 4px rgba(20, 28, 46, 0.18);
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
