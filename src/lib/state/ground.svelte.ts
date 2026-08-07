// Phase 3b — the field SKIN choice (Sam's workbench toggle, now grounds → skins). Module-level rune
// state: persists across navigations within a session, resets on a full reload (no storage machinery).
//
// LIGHT is the DEFAULT and means NO FIELD — the exact pre-field approved render. The other skins mount
// the field: DARK grounds (Midnight/Pine) with glowing gold motes; the LEDGER (aged paper) with decade
// rules + red verticals + rust foxing. The toggle cycles Light → Midnight → Pine → Ledger.
export type Skin = {
	name: string;
	kind: 'light' | 'dark' | 'ledger' | 'paper' | 'parchment';
	ground: string | null; // base --ground colour (null = light, no field)
	swatch: string; // the toggle-pill dot
};

export const GROUNDS: Skin[] = [
	{ name: 'Light', kind: 'light', ground: null, swatch: '#e7e5e4' }, // no field — original render
	{ name: 'Midnight', kind: 'dark', ground: '#0f1626', swatch: '#1a2740' },
	{ name: 'Pine', kind: 'dark', ground: '#10241b', swatch: '#1c3a2b' },
	{ name: 'Ledger', kind: 'ledger', ground: '#ece3d2', swatch: '#d8c9a8' }, // paper + decade rules
	{ name: 'Aged Paper', kind: 'paper', ground: '#e0cfa9', swatch: '#c6ac78' }, // sepia + foxing, no rules
	// PARCHMENT — the lightest ground of the set, and the only one that is JUST paper: fine speckled
	// grain, no foxing, no rules, no mottle. Sampled off Sam's reference (overflow.webp) in the corners
	// he was actually looking at: #ebe6c9 top-right, #ebeadf bottom-left, luminance ~230 of 255 with a
	// grain sigma of ~7. That is barely off white — which is why none of the papers above had beaten
	// plain Light: Ledger and Aged Paper are 15–25% darker than the thing he kept being drawn to.
	{ name: 'Parchment', kind: 'parchment', ground: '#ebe6c9', swatch: '#ebe6c9' }
];

export const groundState = $state({ idx: 0 }); // default = Light
