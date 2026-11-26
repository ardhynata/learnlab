---
slug: high-cardinality-and-target-encoding
title: High-cardinality categories and target encoding
kind: reading
simulator: ""
minutes: 20
---
::: intro
- Explain why one-hot encoding breaks down for a column with hundreds of values, and use frequency encoding as a cheap alternative.
- Compute a smoothed target encoding by hand, and say what the smoothing number does.
- Explain why a target encoding fitted on the rows it encodes leaks the label, and build the leakage-safe version out of fold.

Before you start: read "Missing values and encoding", "Pipelines and leakage", "Cross-validation and stratification" and "Interactions and transformations". One-hot columns, fitting on training rows only and folds are used here without being taught again.
:::

## When a column has too many values
*What goes wrong when one-hot encoding meets hundreds of categories?*

The number of different values in a column is its **cardinality**. The island column of the penguins has 3 values, so one-hot encoding writes 3 columns and loses nothing. A zip code or a product id is a different case.

Take a made-up table of 2,000 customers with a zip code and a label: 1 if the customer bought, 0 if not. It holds 412 different zip codes, so one-hot encoding turns one column into 412 columns that are almost all zeros, for 2,000 rows.

The counts are uneven. The busiest zip code has 174 customers, but 112 of the 412 appear once and 271 appear three times or fewer. A model that gives each of those columns its own weight is fitting a weight to one, two or three rows, so each weight rests on very little evidence. A zip code that appears next month has no column at all.

[[figure:high-cardinality-and-target-encoding/long-tail|The 412 zip codes of the made-up table, grouped by how many customers each has. Most have three or fewer.]]

> Key idea: with many categories, do not give each one its own column. Describe each one with a single number the model can use.

## Frequency encoding
*What if each category is replaced by how common it is?*

**Frequency encoding** replaces each category by how often it appears in the training rows, as a count or as a share of the rows. It is one column, whatever the cardinality.

Here is a small training table of 20 customers in four zip codes. The next sections reuse it. Of the 20 customers, 8 bought.

| Zip | Customers | Bought | Frequency as a share |
| --- | --- | --- | --- |
| A | 10 | 3 | 10 / 20 = 0.50 |
| B | 6 | 1 | 6 / 20 = 0.30 |
| C | 3 | 3 | 3 / 20 = 0.15 |
| D | 1 | 1 | 1 / 20 = 0.05 |

The encoding never reads the label, so it cannot leak the label. It also has a clear limit: two zip codes with the same count get the same number, whatever their customers do. Frequency helps only when how common a category is has something to do with the label, for example busy city codes against quiet rural ones.

As always, the counts come from the training rows only.

## Target encoding
*Can a category be replaced by its own outcome rate?*

**Target encoding**, also called mean encoding, replaces each category by the average label of the training rows in it. For a label coded 0 and 1, that average is the share of 1s. In the small table, A becomes 3 / 10 = 0.30, B becomes 1 / 6 = 0.17, C becomes 3 / 3 = 1.00 and D becomes 1 / 1 = 1.00. The overall mean is 8 / 20 = 0.40.

This is one column that speaks about the label directly, so a straight-line model needs one weight for it, not 412 weights each resting on a handful of rows.

But look at C and D. Both read 1.00, yet C rests on three customers and D on one. One customer who bought says almost nothing about the rate of a whole zip code. The encoding shows no sign of how much evidence stands behind each number.

> Watch out: the mean of one row is that row's label, not an estimate of a rate.

## Smoothing
*How do you stop a tiny category from claiming a perfect rate?*

**Smoothing** blends the category mean with the overall mean, and leans on the category more as it has more rows:

`encoded = (n × category mean + m × overall mean) / (n + m)`

Here n is the number of training rows in the category. The number m is your choice. You can read it as m imaginary customers, all at the overall mean, added to every category.

> Worked example: take m = 4 and the overall mean 0.40. Zip C: (3 × 1.00 + 4 × 0.40) / (3 + 4) = 4.6 / 7 = 0.66. Zip D: (1 × 1.00 + 4 × 0.40) / (1 + 4) = 2.6 / 5 = 0.52. Zip A: (3 + 1.6) / 14 = 0.33. Zip B: (1 + 1.6) / 10 = 0.26. For A and B, n × category mean is just the number of buyers.

D falls from 1.00 to 0.52, and C only to 0.66. The weight on a zip code's own mean is n / (n + m): 1 / 5 = 0.20 for D, 3 / 7 = 0.43 for C and 10 / 14 = 0.71 for A. A new zip code, with n = 0, gets the overall mean, 0.40. A bigger m trusts the categories less. Choose it like k in k-NN, by cross-validation.

[[figure:high-cardinality-and-target-encoding/smoothing|A zip code where every customer bought: its encoded value against its number of customers, for m = 4 and m = 10. Zips C and D from the table sit on the m = 4 curve.]]

## Why the naive version leaks
*How can a feature built from the label cheat?*

The **naive** version fits the encoding on the training rows and then uses it as a feature for those same rows. Then each row's own label sits inside its category's mean. For zip D the encoding is that one label.

Test it on a table where the zip code means nothing. Each table has 300 training customers in 100 zip codes, about three each, and the label is a coin flip. The model is a one-question rule: predict 1 when the encoded value is above a cutoff (a threshold) picked on the training rows. Averaged over 200 simulated tables, naive target encoding scored 71.7% on the training rows and 50.0% on 300 fresh customers. Smoothing with m = 10 changed nothing here: 71.7% and 50.0%.

The 21.7 points are the leak. Give the zip codes a real effect, rates between 15% and 85%, with 1,000 training rows. The naive score is 71.0% on the training rows and 64.5% on fresh rows, so it overstates by 6.5 points.

[[figure:high-cardinality-and-target-encoding/leak|Accuracy of a one-question rule on the training rows and on fresh rows, with the encoding made naively and out of fold. Averages over 200 simulated tables.]]

> Watch out: a cross-validation score has the same flaw if the encoding was computed before the folds were cut, because every validation row's label is inside its own encoding.

## Out-of-fold encoding
*How do you encode a row without letting its own label in?*

Encode each training row from the rows that are not in its fold. Cut the training rows into 5 folds, as in "Cross-validation and stratification". For fold 1, build the table from folds 2 to 5 and apply it to fold 1. Repeat for each fold. Every training row now has an encoding built without its own label. Rows you meet later, such as the test set, are encoded once with a table built from all the training rows.

[[figure:high-cardinality-and-target-encoding/out-of-fold|The five rounds of out-of-fold encoding. The dark fold is encoded with a table built from the other four.]]

> Worked example: put the 20 customers in 5 folds of 4. Fold 1 holds a C customer who bought, the D customer who bought, and two A customers, one who bought. The other 16 customers include 5 buyers, so their overall mean is 5 / 16 = 0.31. With m = 4, the C customer is encoded from the 2 other C customers, both buyers: (2 + 4 × 0.3125) / 6 = 0.54. The D customer has no other D rows: (0 + 1.25) / 4 = 0.31. Both A customers: 8 other A rows with 2 buyers give (2 + 1.25) / 12 = 0.27.

::: deeper Why not leave one out?
Leave-one-out encoding drops only the row itself. It looks safe and is not. In zip A, with 10 customers and 3 buyers, a buyer is encoded as 2 / 9 = 0.22 and a non-buyer as 3 / 9 = 0.33. Inside one zip code the two values give away the label without any error, and a model that can separate them will. Folds avoid that, because every row of a fold shares one table.
:::

## Inside the pipeline
*Where does the encoder live when you cross-validate?*

An imputer or scaler never reads the label. A target encoder does, so it is the sharpest case of "fit on the training rows only" from "Pipelines and leakage". In each cross-validation round, build the encoding of the training folds out of fold, fit the table on all training folds, and encode the validation fold with that table. Nothing from the validation fold goes into any table.

Compare the out-of-fold column with the naive one, which read 1.00 for both C and D. The lone D customer no longer carries its own label and gets the overall mean. On the coin-flip tables, the out-of-fold score was 53.8% on training rows and 49.9% on fresh rows: honest, close to a coin flip. With the real effect, it was 64.6% against 64.2%.

Frequency encoding on the real-effect tables scored 52.1% on fresh rows, about a coin flip, because in those tables how common a zip is has no link to buying. Out-of-fold target encoding scored 64.2%. A feature must show its gain in a score you can trust.

::: deeper Other ways to shrink a category
Group the rare values into one "other" category: putting the 271 zip codes with three customers or fewer into one bucket leaves 141 + 1 = 142 columns. Or map each value to a coarser group first, such as zip code to region. Hashing is another option: it sends every value to one of a fixed number of columns, so unrelated values sometimes share a column.
:::

## What comes next
*Where do you test a new feature honestly?*

You now have three ways to turn a many-valued column into one number: frequency, naive target encoding and out-of-fold target encoding. Only the last one is both useful and safe, and it costs the most care: a table per fold, kept inside each round.

The last lesson of this course, the Feature ablation lab, adds features one at a time and checks which improvements survive cross-validation. That is the test a new feature has to pass. Bring this lesson's habit: a feature built from the label earns its place only in a score where the validation rows never reached its table.

::: remember
- One-hot encoding writes a column per value. For hundreds of values, use one number per category: a frequency, which never reads the label, or a target mean, which does.
- Smooth the target mean with (n × category mean + m × overall mean) / (n + m), so a category with few rows leans on the overall mean.
- Encoding rows from their own labels leaks. Encode training rows out of fold, encode new rows from all the training rows, and keep it inside each cross-validation round.
:::
