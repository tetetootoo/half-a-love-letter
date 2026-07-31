# Letter/envelope image assets

All three files here are the same 1563×1563 canvas, drawn to line up when
stacked — `.envelope { aspect-ratio: 1/1 }` in `src/style.css` depends on
that staying true if any of these are re-exported.

## `envelope-back.png`
The open flap and back of the envelope. Sits **behind** the paper (z-index 1).

## `envelope-front.png`
The front pocket the paper is tucked into, with a **transparent cutout**
wherever the letter should show through. Sits **in front of** the paper
(z-index 3) — wherever it's opaque, it covers the paper.

## `paper.png`
The paper/letter texture. Used as the background of `.paper` in
`src/style.css`, which also positions the live letter text on top of it.
