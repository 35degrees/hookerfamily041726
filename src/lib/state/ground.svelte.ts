// Phase 3b — the field SKIN choice (Sam's workbench toggle, now grounds → skins). Module-level rune
// state: persists across navigations within a session, resets on a full reload (no storage machinery).
//
// LIGHT is the DEFAULT and means NO FIELD — the exact pre-field approved render. The other skins mount
// the field: DARK grounds (Midnight/Pine) with glowing gold motes; the LEDGER (aged paper) with decade
// rules + red verticals + rust foxing. The toggle cycles Light → Midnight → Pine → Ledger.
export type Skin = {
	name: string;
	kind: 'light' | 'dark' | 'ledger' | 'paper' | 'parchment' | 'sheet';
	ground: string | null; // base --ground colour (null = light, no field)
	/**
	 * A real photographed sheet — the BASE path, with no width suffix and no extension.
	 * Field derives four widths from it by convention: `<base>-800|1100|1400|2200.webp`.
	 *
	 * ADDING A SHEET IS ONE ENTRY: generate those four widths from the licensed master in
	 * `_assets/textures/`, drop them in `static/textures/`, and name the base here. Nothing else.
	 */
	image?: string;
	swatch: string; // the toggle-pill dot
};

export const GROUNDS: Skin[] = [
	// MANUSCRIPT — a real photographed sheet, and THE DEFAULT since August 6. The reason Parchment below
	// exists only as a fallback: procedural grain is STATIONARY, identical everywhere by construction,
	// and no dial produces the tonal drift and fibre a real sheet has. Bought after measuring five
	// candidates (docs/background-sources.md). Chosen for being LIGHT (lum ~245 against Parchment's
	// 229), half as warm, and — the decider — nearly EVEN: broad drift 19 where the rejected sheets ran
	// 52–70, so its edges sit only ~5 luminance below centre and it imposes none of the constraints a
	// vignette would (it can still tile, still parallax, and the sibling panel's edge stays light).
	{
		name: 'Manuscript',
		kind: 'sheet',
		ground: '#f7f1e6',
		swatch: '#f7f1e6',
		image: '/textures/paper-manuscript'
	},
	// PARCHMENT — the procedural stand-in: fine speckled grain, no foxing, no rules, no mottle. Sampled
	// off Sam's first reference (overflow.webp) in the corners he was actually looking at: #ebe6c9
	// top-right, #ebeadf bottom-left, luminance ~230 of 255 with a grain sigma of ~7. Kept as the
	// zero-download fallback and as the thing Manuscript is judged against.
	{ name: 'Parchment', kind: 'parchment', ground: '#ebe6c9', swatch: '#ebe6c9' },
	// LIGHT — NO FIELD AT ALL, the exact pre-field approved render. Was the default until August 6 and
	// is kept third on purpose: it is the incumbent every paper has to beat.
	{ name: 'Light', kind: 'light', ground: null, swatch: '#e7e5e4' },
	{ name: 'Midnight', kind: 'dark', ground: '#0f1626', swatch: '#1a2740' },
	{ name: 'Pine', kind: 'dark', ground: '#10241b', swatch: '#1c3a2b' },
	{ name: 'Ledger', kind: 'ledger', ground: '#ece3d2', swatch: '#d8c9a8' }, // paper + decade rules
	{ name: 'Aged Paper', kind: 'paper', ground: '#e0cfa9', swatch: '#c6ac78' } // sepia + foxing, no rules
];

export const groundState = $state({ idx: 0 }); // default = GROUNDS[0] = Manuscript
