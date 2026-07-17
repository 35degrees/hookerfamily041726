<script lang="ts">
	// Shared carousel caret — ONE component/styles for the spouse notch AND the sibling panel (not a
	// lookalike). Position-AGNOSTIC: the parent wraps it and places it (right/top for the spouse notch,
	// bottom/centre for the sibling panel), so the base carries no absolute offset. Renders `class="caret"`
	// so existing CSS-scope and the probes that query `.caret` still resolve it.
	type Props = {
		char: string; // the chevron glyph (‹ › ⌃ ⌄)
		visible?: boolean; // fades in/out; pointer-events gate with it
		disabled?: boolean; // aria only — the paging lockout nullifies the click in the handler, never the cursor
		onclick?: () => void;
		ariaLabel?: string;
		class?: string; // consumer hook (e.g. caret-left/caret-right for the spouse probes)
	};
	let { char, visible = false, disabled = false, onclick, ariaLabel, class: klass = '' }: Props = $props();
</script>

<button
	type="button"
	class="caret {klass}"
	class:visible
	aria-label={ariaLabel}
	aria-disabled={disabled}
	{onclick}><span class="glyph">{char}</span></button
>

<style>
	.caret {
		position: relative; /* for the ::before hit area; the PARENT positions the caret in its layout */
		z-index: 3;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		padding-bottom: 2px; /* optically centre the chevron */
		border-radius: 9999px;
		border: 1px solid rgb(214, 211, 209); /* stone-300 */
		background: rgba(255, 255, 255, 0.94);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
		color: rgb(87, 83, 78); /* stone-600 */
		font-size: 15px;
		line-height: 1;
		cursor: pointer;
		opacity: 0;
		pointer-events: none; /* faded carets can't be clicked */
		transition:
			opacity 180ms ease,
			transform 120ms ease,
			box-shadow 120ms ease,
			background 120ms ease,
			color 120ms ease;
	}
	.caret.visible {
		opacity: 1;
		pointer-events: auto;
	}
	/* 22px visual, ~32px hit area. */
	.caret::before {
		content: '';
		position: absolute;
		inset: -5px;
	}
	/* Hover LIFT — a whisper of a rise + slightly softer shadow. (Composes with any centering transform on
	   the parent wrapper, since that lives on a different element.) */
	.caret:hover {
		transform: translateY(-1px);
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
		background: #fff;
		color: rgb(28, 25, 23); /* stone-900 */
	}
	.caret:active {
		transform: translateY(-0.5px);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
	}

	/* The glyph lives in its own span so it can be shifted for optical centring INDEPENDENTLY of the button's
	   hover/active transforms (different element → they compose, not fight). By default it carries no shift —
	   the base padding-bottom:2px keeps the horizontal spouse chevrons ‹ › centred exactly as before. */
	.caret .glyph {
		display: block;
		line-height: 1;
	}
	/* ── SIBLING carousel arrows only (scoped by .sib-arrow) — spouse carets untouched ─────────────────
	   The VERTICAL arrowheads have asymmetric ink (measured via canvas TextMetrics): ⌃ sits 2.79px ABOVE the
	   font centre (reads high), ⌄ sits 4.92px BELOW it (reads low). Neutralise the base up-nudge, then shift
	   each glyph by exactly its ink bias so it sits dead-centre in the circle. */
	.caret.sib-arrow {
		padding-bottom: 0;
	}
	.caret.sib-up .glyph {
		transform: translateY(2.8px); /* ⌃ ink high → push down */
	}
	.caret.sib-down .glyph {
		transform: translateY(-4.9px); /* ⌄ ink low → raise */
	}
	/* Pressed DEPRESS — the click reads as a physical push: the button sinks and the shadow flattens,
	   springing back on release (transform/box-shadow already transition at 120ms). */
	.caret.sib-arrow:active {
		transform: translateY(1px);
		box-shadow: 0 0 0 rgba(0, 0, 0, 0);
	}
	@media (prefers-reduced-motion: reduce) {
		.caret {
			transition:
				opacity 180ms ease,
				box-shadow 120ms ease,
				background 120ms ease,
				color 120ms ease;
		}
		.caret:hover,
		.caret:active,
		.caret.sib-arrow:active {
			transform: none; /* suppress the lift/depress; the shadow/colour still change */
		}
	}
</style>
