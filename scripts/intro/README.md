# The intro's gilt title plate

`static/intro/title-plate-1600.webp` is THE DESCENDANTS / OF / REV. THOMAS HOOKER / 1586 - 2026, lifted from
Sam's photographs of the 1908 book's spine — not a font. `bash scripts/intro/run.sh` rebuilds it from
`source/` in about a minute and publishes it (plus the title-only `title-gilt-1600.webp`).

- `source/spine-title.png` — the three title lines (Sam's IMG_2277).
- `source/spine-year.png` — the spine's year line, "1586 - 1908" (close-up, different light).

Every hand edit is a NAMED entry in a script (`TOUCHUPS` in `2_title_build.py`, the sections of
`5_year_touchups.py`), so the plate is reproducible and the edits are reviewable.

## Next year (2027)

The spine has no 2 or 7. `7_year_line.py` makes the 2 from Cochin's 2 (sized to the real figures' height and
stroke, gilt quilted from their own grain, a hand-tooled edge, the real figures' darker edge band). For 2027:
make a 7 the same way (`make_two` generalises to any character), change the sequence passed to `compose()`
(`[..., two, '0', two, seven]`), keep a `SETTING` entry per made figure, and rerun. Years after that need only
a new last digit — 2028's 8, 2029's 9 and 2030's 0 exist on the spine.
