# Lab layout rule (fullscreen)

One rule for every lab, so a learner finds things in the same place.

**Wide fullscreen (1100px and up).** Three columns, one screen tall, no page scroll:

1. **Left: the plot card.** The main simulation, as tall as the screen (its height is measured from the lab's own header and legend by `setupFullscreen` in `sims/common.js`).
2. **Middle: every other chart or table box, in the order the lab adds them.** `layoutLabCards` marks them `data-lab-card=side`. A chart takes an equal share of the spare height (minimum 200px); a table keeps the height of its rows. Boxes are separated by an 18px gap.
3. **Right: the Parameters box.** It ends at its own content.

All three columns start on the same line (the stage padding) and the stack ends on the bottom line of the plot card. A lab with one box beside the plot gets one tall box; with none, the plot card has the width to itself.

**Normal page and phones.** One box per row, in the order the lab adds them. The Quick Quiz button sits under the Parameters box (a round button at the bottom right on a phone).

**For lab authors.** Add each extra chart or table as a `.card` inside `lab.ref('below')` (a wrapper with `data-ref=pair` is looked through). Do not set margins or widths for fullscreen: the rule owns them. A card that is neither a chart nor a table is not placed by the rule.

Every lab fits one screen at 1920x1080 and 3440x1440 with no page scroll. A long form (the Capstone workbench) scrolls inside its plot card; a lab with no boxes beside the plot (Compare clustering methods) gives the plot card the full width.
