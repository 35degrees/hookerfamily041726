/**
 * /api/contact — the contact form's delivery (ContactModal, Sam 100926).
 *
 * ONE EMAIL THROUGH SES, AND NOTHING ELSE. No database (Neon bills awake time — roadmap §57.1), no
 * session read, no storage: the message goes to CONTACT_TO with the visitor as Reply-To, so answering
 * them is pressing Reply in Gmail. Sent FROM an address on the SES-verified samhooker.com domain, never
 * from the visitor's own address — that would be spoofing their domain and land in spam.
 *
 * ABUSE, in proportion to a form nobody knows about yet:
 *   - the honeypot (`website`): filled means a bot; answered 200 so it learns nothing, and dropped;
 *   - hard length caps on every field, and newlines stripped from anything that lands in a header;
 *   - a per-instance rate limit. Best effort only — each serverless instance has its own memory — but it
 *     stops a single script hammering one warm function. A real limit belongs at Vercel's firewall
 *     (DEPLOYMENT §9) once there is a site for anyone to find.
 */
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as privateEnv from '$app/env/private';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

// auth.ts's reader, for the same reason: SvelteKit's store in dev, process.env on Vercel.
const readEnv = (key: string): string =>
	(privateEnv as Record<string, string | undefined>)?.[key] ?? process.env[key] ?? '';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').trim();

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const recent = new Map<string, number[]>();

function limited(ip: string): boolean {
	const now = Date.now();
	const hits = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
	hits.push(now);
	recent.set(ip, hits);
	return hits.length > MAX_PER_WINDOW;
}

let client: SESv2Client | null = null;

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
	if (!body) throw error(400, 'Bad request');

	const str = (k: string, max: number) => (typeof body[k] === 'string' ? (body[k] as string) : '').slice(0, max);
	const reason = oneLine(str('reason', 80));
	const subject = oneLine(str('subject', 160));
	const name = oneLine(str('name', 120));
	const email = oneLine(str('email', 200));
	const message = str('message', 5000).trim();
	const page = oneLine(str('page', 300));

	if (str('website', 200)) return Response.json({ ok: true }); // the honeypot
	if (!EMAIL_RE.test(email) || !message) throw error(400, 'An email address and a message are required');
	if (limited(getClientAddress())) throw error(429, 'Too many messages; please try again later');

	const keyId = readEnv('SES_ACCESS_KEY_ID');
	const secret = readEnv('SES_SECRET_ACCESS_KEY');
	// QUOTES ARE STRIPPED, because .env needs them around a value with spaces and a dashboard paste keeps them:
	// on the first deploy CONTACT_FROM arrived as `"Hooker Family Site <sam@samhooker.com>"`, quotes and all,
	// and SES rejected every message with "Missing final '@domain'" (Oct 9).
	const unquote = (v: string) => v.trim().replace(/^(['"])(.*)\1$/, '$2').trim();
	const from = unquote(readEnv('CONTACT_FROM'));
	const to = unquote(readEnv('CONTACT_TO'));
	if (!keyId || !secret || !from || !to) throw error(503, 'The contact form is not configured');

	client ??= new SESv2Client({
		region: readEnv('SES_REGION') || 'us-west-1',
		credentials: { accessKeyId: keyId, secretAccessKey: secret }
	});

	const text = [
		`Reason:  ${reason || '(none)'}`,
		`From:    ${name || '(no name)'} <${email}>`,
		page ? `Page:    ${page}` : '',
		'',
		message
	]
		.filter((l, i) => l !== '' || i === 3)
		.join('\n');

	try {
		await client.send(
			new SendEmailCommand({
				FromEmailAddress: from,
				Destination: { ToAddresses: [to] },
				ReplyToAddresses: [name ? `"${name.replace(/"/g, '')}" <${email}>` : email],
				Content: {
					Simple: {
						Subject: { Data: `[Hooker site] ${reason}${subject ? ` — ${subject}` : ''}`, Charset: 'UTF-8' },
						Body: { Text: { Data: text, Charset: 'UTF-8' } }
					}
				}
			})
		);
	} catch (e) {
		console.error('[contact] SES send failed:', e);
		throw error(502, 'The message could not be sent');
	}
	return Response.json({ ok: true });
};
