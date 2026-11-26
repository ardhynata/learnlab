---
slug: missing-values-and-encoding
title: Missing values and encoding
kind: reading
simulator: ''
minutes: 20
---
::: intro
- Say why a value goes missing, and choose between dropping rows and filling the gaps.
- Fill a column with its mean, its median or its most frequent value, and add a "was missing" flag.
- Turn a category into one-hot columns, say why arbitrary codes mislead, and fit both steps on the training rows only, the rows the model learns from.

Before you start: read "Data, features and labels" and "Center and spread".
:::

## Why values go missing
*What does a gap in a table really mean?*

A model computes with numbers, and a blank is not a number. A distance formula cannot subtract it and a line cannot multiply it, so every gap needs a decision before the model sees the table. The first step is to find the gaps and ask where they come from.

Typical causes: nobody measured the value, an instrument failed, a question did not apply to that row, someone declined to answer, or a record was lost or mistyped. Files also write gaps in different ways: an empty cell, `NA`, `?`, or a placeholder such as -999 that looks like a real number. Check for those before you trust a count.

The penguin file writes `NA`. Four size columns have 2 gaps each, and `sex` has 11. The picture shows where they sit. Rows #4 and #272 have no measurements and no sex, and nine other penguins lack only the sex. The file does not say why, so a data scientist would ask the people who collected it.

[[figure:missing-values-and-encoding/missing-map|The 344 penguin rows, one strip per column. Each mark is a gap. Rows #4 and #272 are empty in all four size columns and in sex, and nine more rows lack only the sex.]]

> Key idea: a gap is a question before it is a nuisance. How many values are missing, in which columns and why decides what to do about them.

## Drop it or fill it
*When is it safe to delete the rows that have gaps?*

The simplest plan is to **drop** every row that has a gap. For the penguins that removes 11 rows and leaves 333 of 344, a loss of about 3%. Dropping rows #4 and #272 costs nothing, because they carry no measurements at all.

Dropping gets expensive fast. If 40% of the rows have a gap in some column, you throw away much of your data. If one column is mostly empty, drop the column instead of the rows.

It can also change who is in the data. The gaps in `sex` are not spread evenly: five of the 11 sit on Torgersen island, which holds only 52 of the 344 penguins. Drop those rows and Torgersen shrinks a little more than the other islands.

And dropping cannot be your only plan. A new row will arrive with a gap one day, and you still owe it a prediction. You cannot drop a customer you must answer.

The alternative is to **fill** the gap with a guess and keep the row. Filling is called **imputing**. The guess must come from a rule the model can apply to any future row. The rule is worked out from the **training rows**, the rows the model learns from, and the last two sections explain how.

## Mean, median or most frequent
*Which typical value should fill a gap?*

Three simple rules cover most tables.

- **Mean.** The average of the column. A fine choice when the values are spread fairly evenly around it.
- **Median.** The middle value when the column is sorted. Few extreme values move it, so it is safer when a column has a long tail.
- **Most frequent.** The value that appears most often. It is the only one of the three that works for a category.

> Worked example: four penguin body masses are 3,650, 3,475, 3,700 and 5,700 g. Their sum is 16,525, so the mean is 16,525 / 4 = 4,131.25 g. Sorted they read 3,475, 3,650, 3,700, 5,700, so the median is the average of the middle two, (3,650 + 3,700) / 2 = 3,675 g.

One heavy penguin pulls the mean 456.25 g above the median. Fill a gap with the mean and the new value sits above three of the four masses.

[[figure:missing-values-and-encoding/mean-vs-median|Four body masses on a number line. The 5,700 g penguin pulls the mean to the right; the median stays with the other three.]]

> Watch out: a filled value is a guess, not a measurement. Filling many gaps with one number makes the column look less spread out than it is. Never fill with 0 to make a model run: 0 g is a real mass.

For a category, "most frequent" can mislead. The penguins split 168 male and 165 female, so filling the 11 gaps with "male" would turn a near tie into 11 confident labels. Another choice is to make "unknown" its own category.

## A flag for "was missing"
*How can the model still tell a real value from a filled one?*

After filling, a guess looks exactly like a measurement. A **missing indicator** keeps the difference. It is a new column that holds 1 where the original value was missing and 0 where it was present, kept next to the filled column.

Why bother? Sometimes the gap itself says something. Suppose a form asks for income and the richest people skip the question. A column filled with the average makes them all look average, while the flag lets a model learn that "skipped" is a pattern of its own.

For the penguins, `sex_was_missing` would be 1 on 11 rows. Whether it helps is something to test, not to assume.

A flag costs one more column, so add one only where it can matter. A flag that is 0 on every training row carries nothing, and you can leave it out. It also does not make the fill any less of a guess.

Whatever rule you pick, apply it to every row, including future ones. An imputer is a rule plus the number it learned, such as "fill `body_mass_g` with 4,131.25, the mean of the training rows". A model trained on filled columns must be fed filled columns later.

## Categories become columns
*How does a word like "Dream" become numbers?*

Island and sex are **categorical**: their values are names. A model needs numbers, so a name must be **encoded**. There are two main ways.

**Ordinal codes** give each category a whole number: Biscoe 0, Dream 1, Torgersen 2. **One-hot encoding** makes one column per category. A row gets a 1 in its own column and 0 in the others, so a Dream penguin becomes Biscoe 0, Dream 1, Torgersen 0. A category with two values needs only one column, such as `sex_is_male`, because the other column would just be 1 minus it.

Why not number the categories? Because numbers say more than names do. Codes claim that Torgersen (2) is twice as far from Biscoe (0) as Dream (1) is. Number the islands in another order and those "distances" change, though no island moved. One-hot columns make no such claim: any two different islands are the same distance apart, the square root of 2, about 1.41.

[[figure:missing-values-and-encoding/codes-vs-one-hot|Left: ordinal codes put the islands on a line and invent gaps between them. Right: one-hot columns put every pair of islands the same distance apart.]]

Ordinal codes are right when the order is real, such as small, medium and large.

::: deeper Why a straight line cannot use island codes
A linear model, from the regression lessons, gives a column one weight, so its effect has to be a straight line over the codes. The islands' mean body masses are about 4,716 g (Biscoe), 3,713 g (Dream) and 3,706 g (Torgersen). Code them Dream 0, Biscoe 1, Torgersen 2 and the masses go up and then down: no straight line through those codes can rise at Biscoe and fall back after it. With one-hot columns each island gets its own weight, so Biscoe can simply be heavier. Part of the reason is the data: all 124 Gentoo penguins live on Biscoe, and they are the heaviest species.
:::

## A tiny table by hand
*Can you do every step with a pencil?*

Take six real penguins, named by their row in the file. The first four rows are training rows and the last two are test rows. We hide the mass of #155 on purpose, so we can check the fill against the truth (4,450 g). The `NA` in #9 is real.

| Set | Row | Island | Body mass (g) | Sex |
|---|---|---|---|---|
| train | #6 | Torgersen | 3,650 | male |
| train | #9 | Torgersen | 3,475 | NA |
| train | #151 | Dream | 3,700 | female |
| train | #154 | Biscoe | 5,700 | male |
| test | #152 | Dream | 4,000 | male |
| test | #155 | Biscoe | NA | female |

**Fit, using the four training rows only.** The mean mass is 4,131.25. The sexes present are male, female and male, so the most frequent is male. The islands are Biscoe, Dream and Torgersen.

**Transform every row** with those numbers. Row #9 gets sex male plus a flag of 1, and row #155 gets mass 4,131.25.

| Row | Biscoe | Dream | Torgersen | Body mass | Is male | Sex was NA |
|---|---|---|---|---|---|---|
| #6 | 0 | 0 | 1 | 3,650 | 1 | 0 |
| #9 | 0 | 0 | 1 | 3,475 | 1 | 1 |
| #151 | 0 | 1 | 0 | 3,700 | 0 | 0 |
| #154 | 1 | 0 | 0 | 5,700 | 1 | 0 |
| #152 | 0 | 1 | 0 | 4,000 | 1 | 0 |
| #155 | 1 | 0 | 0 | 4,131.25 | 0 | 0 |

The fill for #155 is 319 g below the hidden truth of 4,450. A median fill (3,675) would be 775 g below. Neither knows that this penguin lives on Biscoe, where the heavy Gentoo are. A fill built from one column ignores the others.

::: deeper Filling from similar rows
A smarter fill predicts the gap from the other columns, for example the average mass of penguins on the same island. That is a small model of its own. It must also be fitted on the training rows only.
:::

## What fitting means
*What do an imputer and an encoder learn, and what goes wrong if they peek?*

**Training rows** are the rows a model learns from. **Test rows** are held back and used only to judge the finished model, standing in for future data. The later lesson "Train, validation and test" says more.

An imputer and an encoder both **learn** something from the data: a mean or median, a most frequent value, a list of categories. To **fit** them is to compute those things from some rows. Fit on rows that include the test rows and the test data has quietly shaped the model's inputs, so the test score can look better than it should. This is **data leakage**.

In the table, fitting on all five known masses gives (16,525 + 4,000) / 5 = 4,105 instead of 4,131.25. The change is small here, but the habit is what matters.

## Split first, then fit
*In what order should the steps run?*

The safe order: split first, fit on the training rows, then apply those same numbers, unchanged, to training rows, test rows and any new data.

[[figure:missing-values-and-encoding/fit-on-train|Fit the imputer and encoder on the training rows only, then reuse what they learned on the test rows.]]

A new row can hold a category the encoder never saw, such as a fourth island. It has no column, so decide what to do in advance, for example by giving it all zeros.

The next lesson, "Scaling and encoding", adds scaling to these steps, and its lab, "Scale it", lets you watch what happens to a distance model when columns are not on the same scale. "Pipelines and leakage" then chains all of these steps so they run in the right order every time.

::: remember
- A gap needs a decision: drop the row, or fill with the mean, the median or the most frequent value, perhaps with a "was missing" flag. A filled value is a guess.
- Encode a category with one-hot columns, so no order or spacing is invented. Use ordinal codes only when the order is real.
- Fit the imputer and the encoder on the training rows only, then apply the same numbers to the test rows and to any new data.
:::
