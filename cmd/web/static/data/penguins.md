# penguins.csv

- **What:** size measurements for 344 penguins of three species (Adelie, Chinstrap, Gentoo) on three islands in the Palmer Archipelago, Antarctica, 2007 to 2009.
- **Source:** the `palmerpenguins` project, https://github.com/allisonhorst/palmerpenguins, file `inst/extdata/penguins.csv` (downloaded 2026-11-19, 15,241 bytes, 344 rows). Data collected by Dr. Kristen Gorman and the Palmer Station LTER.
- **Licence:** CC0 1.0 (public domain dedication), see the project's `LICENSE.md` and `DESCRIPTION` (`License: CC0`). Cite Gorman, Williams and Fraser (2014) when you can.
- **Columns:** `species` (text), `island` (text), `bill_length_mm`, `bill_depth_mm`, `flipper_length_mm`, `body_mass_g` (numbers), `sex` (text), `year` (number). Missing values are written `NA`: 2 rows have no size measurements at all, and 11 rows have no `sex` (checked with the parser).
- **Used by:** the Generated / Real data switch in labs (`sims/kit/data.js` loads it, `sims/ml/tabular.js` parses it).
