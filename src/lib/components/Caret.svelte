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
	{onclick}>{char}</button
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
	@media (prefers-reduced-motion: reduce) {
		.caret {
			transition:
				opacity 180ms ease,
				box-shadow 120ms ease,
				background 120ms ease,
				color 120ms ease;
		}
		.caret:hover,
		.caret:active {
			transform: none;
		}
	}
</style>
