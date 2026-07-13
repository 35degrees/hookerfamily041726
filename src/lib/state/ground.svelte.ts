// Phase 3b — the field GROUND choice (Sam's workbench toggle). Module-level rune state: persists across
// navigations within a session, resets on a full reload (no storage machinery, per spec).
//
// LIGHT is the DEFAULT and means NO FIELD — the exact pre-field approved render (the field/motes never
// mount, --ground is not set). The two dark grounds mount the motes + parallax and set --ground. The
// toggle cycles Light → Midnight → Pine.
export type Ground = { name: string; value: string | null; swatch: string };

export const GROUNDS: Ground[] = [
	{ name: 'Light', value: null, swatch: '#e7e5e4' }, // no field — original approved render
	{ name: 'Midnight', value: '#0f1626', swatch: '#1a2740' },
	{ name: 'Pine', value: '#10241b', swatch: '#1c3a2b' }
];

export const groundState = $state({ idx: 0 }); // default = Light
