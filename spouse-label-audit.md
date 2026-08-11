# Spouse-label audit — `computeSpouseLabel` picks the first match, not the best

Generated 2026-08-10. Regenerate by re-running the snippet in this file's final section against a fresh
`canonical.json` + `static/data/search-index.json`.

## The defect

`computeSpouseLabel` in `src/lib/utils/generation.ts` walks a person's `marriages` **in array
order** and returns on the **first** spouse that yields any anchor:

```ts
const descendantShort =
    getDescendantOrdinalShort(spouse) ?? getSpouseChainShort(spouse, byId, person.id);
if (!descendantShort) continue;
```

`getDescendantOrdinalShort` is the spouse's **own blood** descent. `getSpouseChainShort` is one
hop further out — the spouse is not blood, but married someone who was. The function's own
comment states the intended precedence:

> The spouse is usually blood, and that is the whole label. When they are NOT, they may still
> anchor the person to the line through a marriage of their OWN... **Blood first; the chain only
> as a fallback.**

That precedence is applied **per marriage**, not across the whole array. So when a chain-anchored
spouse sits earlier in `marriages[]` than a blood spouse, the chain wins and the card describes
the person through the wrong partner.

**The fix** is two passes over `marriages[]` — one collecting `getDescendantOrdinalShort`, and only
if that finds nothing, a second collecting `getSpouseChainShort`. About four lines. Not applied:
it changes a label on every card in the file and deserves its own before/after review.

## Group A — 11 cards, actually mislabelled today

An earlier spouse yields a chain anchor and wins, so the real blood spouse is never reached.

| id | person | card | label routes through | should route through |
|---|---|---|---|---|
| `H00420` | Hooker Gilbert | [/person/hooker-gilbert-1751](http://localhost:5173/person/hooker-gilbert-1751) | [Candace Sage Gilbert](/person/candace-sage) | [Sarah Hooker Gilbert](/person/sarah-gilbert-1763) |
| `H01185` | Horace Stiles | [/person/horace-stiles-1801](http://localhost:5173/person/horace-stiles-1801) | [Harriet Thorp](/person/harriet-thorp) | [Lois Pierpont Stiles](/person/lois-stiles-1806) |
| `H01407` | Dr. Worthington Hooker | [/person/worthington-hooker-1806](http://localhost:5173/person/worthington-hooker-1806) | [Mary L. Ingersoll Hooker](/person/mary-ingersoll-1808) | [Henrietta Whitney Edwards Hooker](/person/henrietta-edwards-1815) |
| `HD0260` | Mary Reynolds Rawson | [/person/mary-rawson-1716](http://localhost:5173/person/mary-rawson-1716) | [Dr. Samuel Morse](/person/samuel-morse-1717) | [Dea. Edward Rawson](/person/edward-rawson-1721) |
| `HD0504` | Thomas Lee | [/person/thomas-lee-1776](http://localhost:5173/person/thomas-lee-1776) | [Electra Riley](/person/electra-riley) | [Electa Riley](/person/electa-riley-1776) |
| `HD3218` | Marion Eliza Wilder Drake Hooker | [/person/marion-drake-1836](http://localhost:5173/person/marion-drake-1836) | [Lauren Curtis Drake](/person/lauren-drake-1833) | [Franklin Hooker](/person/franklin-hooker-1827) |
| `HD3384` | Michael Gay Hooker | [/person/michael-hooker-1935](http://localhost:5173/person/michael-hooker-1935) | [Mihaela Hooker](/person/mihaela-hooker) | [Lea Austen Hooker](/person/lea-hooker) |
| `HD8494` | Charles Frederick Johnson Jr. | [/person/charles-johnson-jr-1836](http://localhost:5173/person/charles-johnson-jr-1836) | [Elizabeth Jane McAlpine Johnson](/person/elizabeth-mcalpine-1841) | [Ellen Frances Terry Johnson](/person/ellen-terry-1837) |
| `HD8554` | Theodore Woolsey Johnson Jr. | [/person/theodore-johnson-jr-1904](http://localhost:5173/person/theodore-johnson-jr-1904) | [Evangeline Bettina Stine Jones](/person/evangeline-stine-1906) | [Millicent Ames](/person/millicent-ames-1909) |
| `HD8658` | Newton John Morris | [/person/newton-morris-1752](http://localhost:5173/person/newton-morris-1752) | [Abigail Morris](/person/abigail-morris-1758) | [Eunice Newton Morris](/person/eunice-morris-1763) |
| `HD8782` | Sarah Pond Fowler | [/person/sarah-fowler-1774](http://localhost:5173/person/sarah-fowler-1774) | [David Atwater](/person/david-atwater-1770) | [Anthony William Harpin Fowler](/person/anthony-fowler-1775) |

## Group B — 45 cards, latent only

The blood spouse is not first in the array, but no earlier spouse yields any anchor, so the loop
falls through and lands correctly. These render right today and would keep rendering right after
the fix. Listed because a later edit that gives an earlier spouse a chain anchor moves one of
these into Group A silently.

| id | person | card | label routes through | should route through |
|---|---|---|---|---|
| `I00002` | Rev. Thomas Shepard | [/person/thomas-shepard-1605](http://localhost:5173/person/thomas-shepard-1605) | [Margaret Touteville Shepard](/person/margaret-touteville-1606) | [Joanna Hooker Shepard](/person/joanna-shepard-1621) |
| `I00011` | Lt. Samuel Burwell | [/person/samuel-burwell-1640](http://localhost:5173/person/samuel-burwell-1640) | [Sarah Fenn](/person/sarah-fenn-1645) | [Susannah Newton Burwell](/person/susannah-burwell-1654) |
| `I00015` | Margaret Coffin Terry | [/person/margaret-coffin](http://localhost:5173/person/margaret-coffin) | [Mr. Hall](/person/mr-hall) | [John Wilson](/person/john-wilson-1686) |
| `I00036` | Hon. John Phelps | [/person/john-phelps-1777](http://localhost:5173/person/john-phelps-1777) | [Lucy Lovell Phelps](/person/lucy-lovell-1782) | [Almira Hart Phelps](/person/almira-phelps-1793) |
| `I00072` | Captain Thomas Clark | [/person/thomas-clark-1700](http://localhost:5173/person/thomas-clark-1700) | [Susannah Woodruff](/person/susannah-woodruff) | [Sarah Newton Clark](/person/sarah-clark-1713) |
| `I00074` | Chauncey Whittlesey | [/person/chauncey-whittlesey-1717](http://localhost:5173/person/chauncey-whittlesey-1717) | [Elizabeth Whiting Whittlesey](/person/elizabeth-whiting-1717) | [Martha Newton Whittlesey](/person/martha-whittlesey-1729) |
| `I00114` | Rev. Amariah Frost | [/person/amariah-frost-1720](http://localhost:5173/person/amariah-frost-1720) | [Esther Messenger](/person/esther-messenger) | [Susannah Dorr Frost](/person/susannah-frost-1734) |
| `I00120` | Mary Elliott Hooker | [/person/mary-elliott-1688](http://localhost:5173/person/mary-elliott-1688) | [Hart unknown)](/person/hart-unknown-x01156) | [Samuel Hooker](/person/samuel-hooker-1688) |
| `I00126` | Rev. Isaac Stiles | [/person/isaac-stiles-1697](http://localhost:5173/person/isaac-stiles-1697) | [Keziah Taylor Stiles](/person/keziah-taylor-1702) | [Esther Hooker Stiles](/person/esther-stiles-1702) |
| `I00127` | Esq. Daniel Coit | [/person/daniel-coit-1698](http://localhost:5173/person/daniel-coit-1698) | [Lydia Christophers](/person/lydia-christophers) | [Mehitable Hooker Coit](/person/mehitable-coit-1706) |
| `I00134` | Solomon Whitman | [/person/solomon-whitman-1710](http://localhost:5173/person/solomon-whitman-1710) | [Susannah Cole](/person/susannah-cole-1716) | [Ruth Hooker Whitman](/person/ruth-whitman-1708) |
| `I00137` | Rev. John Hart | [/person/john-hart-1682](http://localhost:5173/person/john-hart-1682) | [Rebekah Hubbard Hart](/person/rebekah-hubbard-1692) | [Mary Hooker Hart](/person/mary-hart-1693) |
| `I00289` | Jane Elise Austin Hooker | [/person/jane-austin-1915](http://localhost:5173/person/jane-austin-1915) | [Thomas McConnell Bunn](/person/thomas-bunn-1904) | [Rodman Lent Hooker](/person/rodman-hooker-1909) |
| `I00290` | Louise Henrichsen Sollner Hooker | [/person/louise-henrichsen-1925](http://localhost:5173/person/louise-henrichsen-1925) | [Mr. Sollner](/person/mr-sollner-x02539) | [Rodman Lent Hooker](/person/rodman-hooker-1909) |
| `I00985` | James Root | [/person/james-root-1747](http://localhost:5173/person/james-root-1747) | [Lydia Anna Root](/person/lydia-robb-1749) | [Abigail Hooker](/person/abigail-hooker-1753) |
| `I01043` | Louisa Vanzant Hooker | [/person/louisa-vanzant-1841](http://localhost:5173/person/louisa-vanzant-1841) | [PVT John Brooks](/person/john-brooks-1839) | [John "Jack" Hooker](/person/john-hooker-1840) |
| `I01240` | Capt. Albert Norton | [/person/albert-norton-1789](http://localhost:5173/person/albert-norton-1789) | [Lucy Lee Norton](/person/lucy-lee-1790) | [Ruth Hart Norton](/person/ruth-norton-1796) |
| `I01243` | Edwin Howell Butler | [/person/edwin-butler-1844](http://localhost:5173/person/edwin-butler-1844) | [Marie L. Brown Butler](/person/marie-brown-1848) | [Harriet Isabella Norton Butler](/person/harriet-butler-1843) |
| `I01346` | Rev. Samuel Porter Williams | [/person/samuel-williams-1779](http://localhost:5173/person/samuel-williams-1779) | [Mary Hanford Webb Williams](/person/mary-webb-1780) | [Sarah Pierpont Tyler](/person/sarah-tyler-1791) |
| `I01680` | Judge Elisha Carpenter | [/person/judge-carpenter-1824](http://localhost:5173/person/judge-carpenter-1824) | [Harriet Grosvenor Brown Carpenter](/person/harriet-carpenter-1828) | [Sophia Tyler Cowen Carpenter](/person/sophia-carpenter-1843) |
| `I01874` | Abigail "Abbie" Hunt Snelling Chaplin | [/person/abigail-hunt-1797](http://localhost:5173/person/abigail-hunt-1797) | [Col. Josiah Snelling](/person/josiah-snelling-1782) | [Jonathan Edwards Chaplin](/person/jonathan-chaplin-1789) |
| `I01952` | Cadwallader Jones Iredell | [/person/cadwallader-iredell-1840](http://localhost:5173/person/cadwallader-iredell-1840) | [Martha Jones Southgate Iredell](/person/martha-southgate-1842) | [Roberta Edmond](/person/roberta-edmond-1860) |
| `I02085` | Emily Meredith Read Spencer | [/person/emily-read-1863](http://localhost:5173/person/emily-read-1863) | [Francis Aquila Stout](/person/francis-stout-1833) | [Edwards Spencer](/person/edwards-spencer-1854) |
| `I02141` | Elizabeth Lydia Strong Hooker | [/person/elizabeth-strong-1816](http://localhost:5173/person/elizabeth-strong-1816) | [Dr. Horatio Marsh Baldwin](/person/horatio-baldwin-1815) | [Samuel Hooker](/person/samuel-hooker-1817) |
| `I02144` | Janet Annenberg Hooker | [/person/janet-annenberg-1904](http://localhost:5173/person/janet-annenberg-1904) | [Leo Stanley Kahn](/person/leo-kahn-1898) | [James Stewart Hooker](/person/james-hooker-1907) |
| `I02354` | Pasquale Giovanni DiCicco | [/person/pasquale-dicicco-1909](http://localhost:5173/person/pasquale-dicicco-1909) | [Thelma Todd](/person/thelma-todd-1906) | [Gloria Laura Vanderbilt](/person/gloria-vanderbilt-1924) |
| `I02555` | Nancy Weller Pierrepont | [/person/nancy-weller-1921](http://localhost:5173/person/nancy-weller-1921) | [Lt. Col. Albert Peter Dewey](/person/albert-dewey-1916) | [John Pierrepont](/person/john-pierrepont-1917) |
| `I02807` | Francis Bayard Winthrop Jr. | [/person/francis-winthrop-jr-1787](http://localhost:5173/person/francis-winthrop-jr-1787) | [Julia Ann Rogers Winthrop](/person/julia-rogers-1788) | [Elizabeth Woolsey Winthrop](/person/elizabeth-winthrop-1794) |
| `I03099` | Sheldon Leroy Dimick | [/person/sheldon-dimick-1849](http://localhost:5173/person/sheldon-dimick-1849) | [Mary Copeland Dimick](/person/mary-copeland-1850) | [Lucy Ida Newton Dimick](/person/lucy-dimick-1856) |
| `X00097` | Sarah Welch Fowler | [/person/sarah-welch-1660](http://localhost:5173/person/sarah-welch-1660) | [John Fowler](/person/john-fowler-1649) | [Samuel Newton](/person/samuel-newton-1646) |
| `X00115` | Col. Peter Mallett | [/person/peter-mallett-1744](http://localhost:5173/person/peter-mallett-1744) | [Eunice Curtis](/person/eunice-curtis) | [Sarah Mumford Mallett](/person/sarah-mallett-1765) |
| `X00123` | Captain Thomas Hopkins | [/person/thomas-hopkins-1725](http://localhost:5173/person/thomas-hopkins-1725) | [Anna (unknown)](/person/anna-x01867) | [Alice Howard Hopkins](/person/alice-hopkins-1721) |
| `X00126` | Rev. James Pierpont | [/person/james-pierpont-1659](http://localhost:5173/person/james-pierpont-1659) | [Abigail Davenport Pierpont](/person/abigail-davenport-1672) | [Mary Hooker Pierpont](/person/mary-pierpont-1673) |
| `X00158` | Dr. Elial Todd Foote | [/person/elial-foote-1796](http://localhost:5173/person/elial-foote-1796) | [Anna L. Cheney Foote](/person/anna-cheney-1800) | [Amelia Stiles Leavitt](/person/amelia-leavitt-1799) |
| `X00168` | Lt. John Hall | [/person/john-hall-1698](http://localhost:5173/person/john-hall-1698) | [Jerusha King Hall](/person/jerusha-king-1711) | [Sarah Marsh Hall](/person/sarah-hall-1704) |
| `X00615` | Theodosia Stillwell Bartow Prevost | [/person/theodosia-bartow-1746](http://localhost:5173/person/theodosia-bartow-1746) | [Jacques Marcus Prevost](/person/jacques-prevost-1736) | [Aaron Burr Jr.](/person/aaron-burr-jr-1756) |
| `X00723` | Daniel Tyler | [/person/daniel-tyler-1750](http://localhost:5173/person/daniel-tyler-1750) | [Mehitable Putnam Tyler](/person/mehitable-putnam-1749) | [Sarah Edwards](/person/sarah-edwards-1761) |
| `X00725` | Josiah Dwight | [/person/josiah-dwight-1767](http://localhost:5173/person/josiah-dwight-1767) | [Caroline Williams](/person/caroline-williams-1770) | [Rhoda "Madam Dwight" Edwards](/person/rhoda-dwight-1778) |
| `X00744` | Theodore Roosevelt | [/person/theodore-roosevelt-1858](http://localhost:5173/person/theodore-roosevelt-1858) | [Alice Hathaway Lee Roosevelt](/person/alice-hathaway-lee-1861) | [Edith Kermit Carow Roosevelt](/person/edith-kermit-carow-1861) |
| `X00746` | Charles Astor Bristed | [/person/charles-bristed-1820](http://localhost:5173/person/charles-bristed-1820) | [Laura Whetten Brevoort Bristed](/person/laura-brevoort-1824) | [Grace Ashburner Sedgwick](/person/grace-sedgwick-1833) |
| `X01321` | Joseph B. Andrews Sr | [/person/joseph-andrews-sr-1751](http://localhost:5173/person/joseph-andrews-sr-1751) | [Lydia Judd Andrews](/person/lydia-judd) | [Amy Cowles](/person/amy-cowles-1758) |
| `X02007` | George Henry Hollister | [/person/george-hollister-1821](http://localhost:5173/person/george-hollister-1821) | [Elizabeth H. Pettibone Hollister](/person/elizabeth-pettibone-1833) | [Frances Elizabeth Hooker Hollister](/person/frances-hollister-1838) |
| `X02254` | Josephine D. Dunham Hooker | [/person/josephine-dunham-1906](http://localhost:5173/person/josephine-dunham-1906) | [Harry Beach Clow Jr.](/person/harry-clow-1901) | [John Rodman Hooker](/person/john-hooker-1903) |
| `X03312` | Olive Wood Longley Warriner Leavitt | [/person/olive-leavitt-1824](http://localhost:5173/person/olive-leavitt-1824) | [Hezekiah Ryland Warriner](/person/hezekiah-warriner-1822) | [Roger Hooker Leavitt](/person/roger-leavitt-1805) |
| `X03536` | Frederic Clark Sayles III | [/person/frederic-sayles-iii-1901](http://localhost:5173/person/frederic-sayles-iii-1901) | [Inez Gibbs Hayward](/person/inez-gibbs-1903) | [Elizabeth Perkins Sayles](/person/elizabeth-sayles-1906) |

## Notes found while auditing

- **`HD0504` Thomas Lee is a different bug.** His two spouses are "Electra Riley" and "Electa
  Riley" — near-certainly one woman entered twice. The duplicate is why a second marriage exists
  at all; fixing the label there fixes a symptom of a merge, not the merge.
- Group A totals 11 against the 56 people whose blood spouse
  is not first in the array. The larger number is the one to ignore — most of it is Group B.

## How this list was built

```python
def blood(s):  # spouse carries their own Hooker descent
    c = (s or {}).get('classification') or {}
    return bool(c.get('is_thomas_descendant') and c.get('generation_from_thomas') is not None)

def chain(s):  # spouse is not blood but married someone who is
    return any(blood(by.get(m.get('spouse_id'))) for m in (s or {}).get('marriages') or [])

# Group A: an earlier spouse yields chain() and therefore wins the first-match loop
# Group B: blood spouse is late in the array but nothing earlier yields any anchor
```
