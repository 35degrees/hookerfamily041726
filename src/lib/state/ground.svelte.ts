// Phase 3b — the field SKIN choice (Sam's workbench toggle, now grounds → skins). Module-level rune
// state: persists across navigations within a session, resets on a full reload (no storage machinery).
//
// LIGHT is the DEFAULT and means NO FIELD — the exact pre-field approved render. The other skins mount
// the field: DARK grounds (Midnight/Pine) with glowing gold motes; the LEDGER (aged paper) with decade
// rules + red verticals + rust foxing. The toggle cycles Light → Midnight → Pine → Ledger.
export type Skin = {
	name: string;
	kind: 'light' | 'dark' | 'ledger';
	ground: string | null; // base --ground colour (null = light, no field)
	swatch: string; // the toggle-pill dot
};

export const GROUNDS: Skin[] = [
	{ name: 'Light', kind: 'light', ground: null, swatch: '#e7e5e4' }, // no field — original render
	{ name: 'Midnight', kind: 'dark', ground: '#0f1626', swatch: '#1a2740' },
	{ name: 'Pine', kind: 'dark', ground: '#10241b', swatch: '#1c3a2b' },
	{ name: 'Ledger', kind: 'ledger', ground: '#ece3d2', swatch: '#d8c9a8' } // aged paper
];

export const groundState = $state({ idx: 0 }); // default = Light
