/**
 * contact.ts — THE CONTACT FORM'S REASONS, and opening it with one already chosen (Oct 28).
 *
 * Sam's two goals for a reader, in his words: "have people either want to connect their line to the tree if
 * applicable or have me build out something for them with a similar format" — asked for "very very subtly". So
 * the invitations are quiet lines where the intent already is (a search that finds no one, the Paths to Family
 * picker, his own About card), and each opens this form with its reason already picked.
 *
 * WHY A FILE OF ITS OWN: modal.svelte.ts holds only WHICH overlay is open and carries no payload (its header says
 * why). The preset is taken once by ContactModal as it opens and then forgotten, so a later plain opening starts
 * from the first reason as before.
 */
import { openModal } from '#lib/state/modal.svelte.js';

/** Sam's list (100926), with "Share family information" become "Add my family line" and the commission added
 *  (Oct 28). The server takes any reason up to 80 characters (api/contact), so this list is the only place it lives. */
export const CONTACT_REASONS = [
	'General questions and feedback',
	'Technical questions or bugs',
	'Correct a family record',
	'Add my family line',
	'Build a site like this for my family'
] as const;
export type ContactReason = (typeof CONTACT_REASONS)[number];

let preset: ContactReason | null = null;

/** Open the contact form with `reason` chosen. `from` says which invitation was used — it rides the Contact
 *  event (modal.svelte.ts) so analytics shows which quiet line actually brings people in. */
export function openContact(reason: ContactReason, from: string): void {
	preset = reason;
	openModal('contact', { from });
}

/** ContactModal, as it opens: the preset if one was given, once. */
export function takeContactPreset(): ContactReason | null {
	const r = preset;
	preset = null;
	return r;
}
