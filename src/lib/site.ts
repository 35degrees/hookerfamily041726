/**
 * The site's name, as the browser tab and a shared link's subject line read it.
 *
 * ONE home, two readers: `/` (the intro) shows it alone, and every person page shows it after the
 * person's chip name ("Sam Hooker - The Descendants of Rev. Thomas Hooker"). Two literals would
 * drift the first time the wording moved.
 */
export const SITE_TITLE = 'The Descendants of Rev. Thomas Hooker';

/**
 * THE ONE ADDRESS GOOGLE SHOULD KNOW (SEO_PLAN §4, §5.3). The same build answers at hookerverse.com,
 * hooker-test.vercel.app (Sam's testing host, noindex forever) and a long address per deploy; every page's
 * canonical tag names this origin, so anything a crawler sees elsewhere points home. A constant rather
 * than the request's own origin, because the request's origin is exactly what must NOT be trusted here.
 */
export const SITE_ORIGIN = 'https://hookerverse.com';
