---
slug: data-features-labels
title: Data, features and labels
kind: reading
simulator: ''
minutes: 12
---
::: intro
- Read a data table as observations (rows), features (input columns) and a target (the column to predict).
- Tell numeric features from categorical ones, and say why a model needs numbers.
- Spot columns that do not belong in a model, and handle missing values with care.

Before you start: nothing. This is the first lesson of the course.
:::

## A table of observations
*What is the data a model learns from, and what are its parts?*

Many machine-learning problems start as a table. Each **row** is one **observation**: one thing we looked at and measured, such as one penguin, one house or one customer. (Other books say example or sample.) Each **column** records the same kind of fact about every observation.

This course uses a real table: measurements of 344 penguins from three species, collected on three islands in Antarctica. Here are six of its rows.

[[figure:data-features-labels/table-anatomy|Six of the 344 penguins. Each row is one observation. The blue columns are features, the amber column is the target, and the first column only counts rows.]]

> Worked example: read row #154 as a sentence. Penguin #154 is a Gentoo from Biscoe island. Its bill is 50.0 mm long and 16.3 mm deep, its flipper is 230 mm, it weighs 5700 g, and it is male.

That is one observation: seven facts about one penguin. The number #154 only says which row it is. (The file also has a year column, which we ignore here.)

## Features and the target
*Which columns go in, and which one do we try to predict?*

A column we feed into a model is a **feature**. A column we want the model to predict is the **target**. Many books call the target the **label**, and this course uses both words for the same thing. The model studies rows where it can see both, then predicts the target of a new penguin from its features alone.

Which column is the target? The table does not decide. The question does. Ask "which species is this penguin?" and species is the target. Ask "how much will it weigh?" and body mass is the target, while species becomes one more feature.

> Key idea: the same table can serve many questions. Features are what we know when we ask; the target is what we want to find out.

In the figure above, species is the target, and bill length, bill depth, flipper length and body mass are four of the features. The island and sex columns could be features too.

## Numeric features
*What can you do with a feature that is a quantity?*

A **numeric** feature is a quantity. A bigger value means more of something, so you can compare, add and average its values. Bill length, flipper length and body mass are numeric. Each has a **unit**, and the unit matters: body mass in the table is in grams, so 5700 means 5700 g, or 5.7 kg.

Numbers differ in size. Across the 342 penguins that were measured, flipper length runs from 172 to 231 mm, while body mass runs from 2700 to 6300 g. A kilogram column and a gram column describe the same animals with very different looking numbers. Later lessons show why that matters when a model compares penguins.

Numeric features come in two kinds. A measurement such as a length can take any value in a range. A count, such as the number of eggs in a nest, takes whole numbers only. Both are numeric.

Use the test from the start of this section: does bigger mean more? If so, the feature is numeric.

## Categorical features
*What if a feature is a name, not a quantity?*

A **categorical** feature holds a name from a fixed set. In the penguin table, island is categorical: Biscoe, Dream or Torgersen. So are sex and species. You can count how many penguins fall in each category, but you cannot average them.

Numbers can hide categories. Suppose we code the islands as 1 for Biscoe, 2 for Dream and 3 for Torgersen. The average of Biscoe (1) and Torgersen (3) is 2, which says "Dream", and that is nonsense. The codes are only name tags. A postal code or a bus number does the same trick.

> Watch out: a column of numbers is not always a numeric feature. Ask whether a bigger value means more of something.

Most models do arithmetic, so a category has to become numbers before a model can use it. The course "Preparing tabular data" shows the standard way to do it.

[[figure:data-features-labels/feature-types|A numeric feature lies on a scale and its values can be averaged. A categorical feature is a set of names that you can only count.]]

::: deeper Ordinal features: categories with an order
Some categories have an order but no exact spacing: small, medium and large, or a rating of one to five stars. These are **ordinal** features. Large is more than small, but the step from small to medium need not equal the step from medium to large. An ordinal feature can be treated as a category, or sometimes as a number. Which is better depends on the problem.
:::

## An observation is a point
*How does a row become something a model can compare?*

Pick two numeric features and use them as the two axes of a plot. Each penguin becomes one dot, placed by its flipper length and its body mass. The target decides the dot's color.

[[figure:data-features-labels/rows-as-points|Flipper length and body mass for 36 real penguins, plus penguin #154 (ringed), colored by species.]]

The plot shows structure. Gentoo penguins sit up and to the right. Across all 342 measured penguins, Gentoo average about 5076 g, against 3701 g for Adelie, a gap of roughly 1375 g. Adelie and Chinstrap overlap, so these two features cannot tell those two apart well. A model works in the same space, only with more axes: four numeric features make four axes. It judges a new penguin by where it lands.

That is also why features need numbers. A position needs coordinates, and a name has none. Rows with similar features land near each other, and this idea returns in the lessons on distance and nearest neighbors.

## Columns that do not belong
*Which columns should you leave out of a model?*

Not every column is a good feature. Three kinds cause trouble.

- **A row number or ID.** In this file the rows are sorted by species: rows 1 to 152 are Adelie, 153 to 276 Gentoo and 277 to 344 Chinstrap. A model could learn "row 154 means Gentoo" and score perfectly on this file. A new penguin has no such row number, so it would fail.
- **A copy of the target.** If you predict body mass in grams, a column with the mass in kilograms gives the answer away. It is the same number in other units.
- **Anything unknown at prediction time.** A feature must be available when you ask the question, not only afterwards. If you predict whether a customer will leave, a column that records a call to cancel is only known after the fact. For the penguins, a mass weighed after a later feeding would not be known at the time of the question.

The first two look useful in the table and are useless on new penguins, and the third fails the same way when you try to use it. Whenever a score looks too good, check the columns first.

## Missing values
*What do you do when a cell is empty?*

Real tables have gaps. In the penguin file an empty cell is written NA. Row #4 has NA in every measurement and in the sex column, and so does row #272, so 342 of the 344 penguins have measurements. Nine more penguins lack only the sex. In total, 11 rows have at least one gap, and 333 rows are complete.

You have three simple options for a gap.

1. **Drop the row.** Easy, but you lose that penguin's other measurements: 333 rows remain instead of 344.
2. **Fill in a value**, such as the average of the column. This keeps the row but puts a guess in the table.
3. **Fix it at the source**, if you can: re-measure the penguin.

> Watch out: never fill a gap with 0 to make a model run. For flipper length, 0 mm is a real number that says "no flipper".

Which option is best depends on how many gaps there are and why they are there. Always count them first.

## One table, three questions
*What can you ask of a single table?*

Look at the penguin table again, and ask what you want to find out.

[[figure:data-features-labels/three-targets|One table, three questions. A numeric target, a categorical target, or no target at all.]]

A numeric target, such as body mass, asks "how much?". A categorical target, such as species, asks "which one?". With no target at all you ask "which penguins look alike?". The next lesson gives these three tasks their names and shows how each one learns.

In the lab at the end of this course, you will take one real penguin table and pose all three questions on it: you choose the target yourself, change the features, and see how the question changes what a model can do.

::: remember
- Rows are observations, columns are features, and the target is the one column you want to predict. The question decides which column that is.
- Numeric features are quantities, where bigger means more. Categorical features are names, even when written as numbers.
- Leave out IDs, copies of the target and anything unknown at prediction time, and count the missing values before you decide what to do with them.
:::
