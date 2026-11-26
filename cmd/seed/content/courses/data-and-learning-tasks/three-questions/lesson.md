---
slug: three-questions
title: Three questions, one dataset
kind: simulator
simulator: feature-explorer
minutes: 25
---
::: intro
- Pose a regression, a classification and a clustering question on the same table, and say what each one gives back.
- Read the score that goes with each question: R², a classification score against a baseline, and the silhouette.
- Check a result on a fresh sample and on real data before you trust it.

Before you start: read "Data, features and labels" and "Supervised, unsupervised and the three questions".
:::

## One table, three ways to ask
*What does the lab give you to work with?*

The lab holds one table. By default it is 120 invented birds from three species called Skerry, Brine and Cobble, 40 birds each. Every bird has four numeric columns: bill length, bill depth, flipper length and body mass. A switch called **Data** swaps in the real penguin table from the earlier lessons.

You never edit the table. You choose the question, and the question decides what each column is for.

[[figure:three-questions/question-roles|One table, three jobs for the same two columns. The target, the result and the score all depend on the question.]]

With **Regression**, the vertical column is the number to predict and the horizontal column is the input. With **Classification**, the species is the target and the two columns are the features. With **Clustering**, the species is hidden, and the lab groups the dots using only the two columns on the axes. Each question gets its own score, because "good" means something different for each.

> Key idea: the table stays the same. The question sets the target, the kind of result and the way you judge it.

## Regression: a line and its gaps
*How does the lab turn two columns into a number to predict?*

Set the question to Regression, with bill length across and bill depth up. The lab draws the best straight line through the 120 birds:

depth = 25.22 - 0.1805 × length

in millimeters. One more millimeter of bill length goes with 0.18 mm less depth.

> Worked example: bird #54 has a bill length of 33.7 mm and a bill depth of 18.4 mm. The line predicts 25.22 - 0.1805 × 33.7 = 25.22 - 6.08 = 19.14 mm. The real depth is 18.4 mm, so the gap is 19.14 - 18.4 = 0.74 mm. The line is a little too high for this bird.

[[figure:three-questions/regression-gap|The best line for the 120 birds, the lazy guess "always the mean", and the gap for bird #54.]]

## How good is the line?
*What do the average error and R² say about a regression?*

Over all 120 birds, the line is off by 1.79 mm on average. A lazy guesser who always says the mean depth, 17.1 mm, is off by 2.00 mm. The line barely wins. **R²** says the same as a share: the line explains 16% of the ups and downs of bill depth. 0% means no better than the mean, and 100% means no gaps at all.

> Watch out: 16% does not mean that 16% of the birds are predicted correctly. A regression is never right or wrong, only near or far.

The lab also ranks every other column as the input for bill depth. Flipper length comes first with 51%, yet a flipper does not shape a bill. Turn on the colors and you see why: Cobble birds have the shallowest bills and the longest flippers, so flipper length points to the species. A good fit shows that two columns move together, not why.

::: deeper Where R² comes from
Add up the squared gaps around the mean guess: 616.75 for the 120 birds. Add up the squared gaps around the line: 520.54. The line leaves 520.54 / 616.75 = 0.844 of the mess, so it explains 1 - 0.844 = 0.156, which is the 16%. The more the line shrinks the squared gaps, the closer R² gets to 100%.
:::

## Classification: a score against a baseline
*How do you tell a good label guesser from a lucky one?*

Switch to Classification. The species is now the target, shown as color, and the two columns are the features. For every bird in turn, the lab hides its species and lets the 5 nearest birds on the plot vote, leaving the bird out of its own vote. The **score** is the share of birds for which the vote picks the right species.

For bill length and bill depth the vote is right for 114 of 120 birds, which is 95%. A lazy rule that always names one species is right for 40 of 120, because each species has 40 birds. That is 33%, and it is the **baseline** to beat.

[[figure:three-questions/score-bars|Every pair of columns scored on the same 120 birds. The dashed line is the 33% that always guessing one species gives.]]

The worst pair, bill depth and body mass, scores 79 of 120, which is 66%: twice the baseline, but a third of the birds are still wrong.

> Key idea: a score means little without its baseline. For the sex of the real penguins, always guessing the more common one is right for 168 of 333, about 50%, so a score near 50% tells you nothing.

::: deeper Why a bird is left out of its own vote
If a bird could vote for itself, it would always find a neighbor with its own species, namely itself, and the score would look better than it is. Leaving it out makes the test fair: the lab judges each bird the way a new bird would be judged. The lab also rescales each column first, so that millimeters and kilograms count alike.
:::

## Clustering: groups without an answer key
*How can you score groups when there is nothing to check them against?*

Set the question to Clustering. The lab hides the labels and splits the dots into k groups using only the two columns on the axes. You choose k with **Number of groups (k)**; the default is 3. The method is k-means.

Two numbers judge the result.

- **Silhouette** runs from -1 to 1 and needs no label. It says how clearly the groups stand apart; above about 0.5 is clear. For k = 3 it is 0.55.
- **Agreement with species** is checked afterwards. The lab counts the birds that sit in a group whose main species is their own: 115 of 120, which is 96%.

## Why agreement alone cannot pick k
*How do you choose k when the species is hidden?*

Try k = 2, 3 and 4 on the same two columns. The silhouette is 0.46, 0.55 and 0.46, so it peaks at k = 3, the number of species the table was built from. On a real problem there is no species column, so the silhouette is the number you can use to compare values of k.

> Worked example: with k = 2, the silhouette is 0.46 and the agreement is 67%. Two groups have at most two main species, so the 40 birds of the third species always count as wrong. The best case is 80 of 120, which is 67%.

> Watch out: agreement flatters a big k. With k = 4 it is still 95% (114 of 120), but the silhouette falls to 0.46. With every bird in its own group, agreement would be 100% and mean nothing.

::: deeper What the silhouette measures
For one dot, take its average distance a to the dots in its own group, and its average distance b to the dots in the nearest other group. The dot scores (b - a) / the larger of a and b. A dot far closer to its own group than to the next one scores near 1, and a dot between two groups scores near 0. The silhouette is the average over all dots.
:::

## When the table and its groups disagree
*Can a trend in the whole table be wrong for every group inside it?*

Switch Data to Penguins (real), keep Regression, with bill length across and bill depth up. Over all 342 measured penguins the line slopes down: 0.085 mm less depth for each extra millimeter of length, with an R² of only 6%.

With Color by species on, the lab also draws a line inside each species, and every one of them slopes up instead: +0.179 for Adelie, +0.222 for Chinstrap and +0.205 for Gentoo.

[[figure:three-questions/trend-flip|Real penguins, one dot for every sixth measured penguin. The dashed line fits all 342 penguins; the colored lines fit each species alone.]]

The cause is the mix. Adelie penguins have short, deep bills (about 38.8 mm long and 18.3 mm deep on average), while Gentoo have long, shallow ones (47.5 mm and 15.0 mm). Put the species together and the cloud tilts down, even though longer bills go with deeper bills inside each species.

> Key idea: a line fitted to a mix can tell a story that is false inside every group. When a column such as species sorts the rows, look inside the groups before you trust the trend.

## Check before you trust it
*How do you know a result is not an accident of one sample?*

A score comes from one table, so check it on another. **New sample of birds** draws 120 new birds. Bill length and bill depth stay the best pair for classification: 95% on the first sample, then 96% and 93%. The numbers move by a few points, but the story holds.

On real data, sample 1 is every row, and each later sample is a random two thirds of them, 228 of 342. The best pair can change when two pairs are close: on sample 3, bill length with flipper length (96%) beats bill length with bill depth (95%).

Count the rows too. Two of the 344 penguins have no measurements, so the lab leaves them out and 342 remain. For the label Sex, 9 more lack a sex, which leaves 333. The note under **Data** gives the count.

The lab also asks you to predict before it shows a result. Pick an answer, then press Check answer. A wrong guess teaches more than a right one.

::: remember
- One table can pose three questions: regression predicts a number, classification predicts a label, and clustering finds groups with no label.
- Judge each one on its own terms: R² and the average gap for regression, the score against a baseline for classification, and the silhouette for clustering.
- Look inside groups and on a fresh sample before you trust a trend or a score.
:::

@@lab

## Lab: Three questions, one dataset
One table, three ways to ask. Pick two columns and a question, and see what it looks like on the plot. The panel shows only the controls that belong to the question you chose. Numbers below are for the default generated data (seed 7) unless an experiment says Penguins (real). Press Reset first so that you start from the same plot.

### Controls
- **Data**: Generated data (120 invented birds) or Penguins (real). A note under it counts the rows that were left out for a missing value.
- **Horizontal feature** and **Vertical feature**: the two columns on the axes. In Regression, the vertical one is the number to predict and the horizontal one is the input.
- **Question**: Regression: a number, Classification: a category, or Clustering: find groups. Classification is the default.
- **Label to predict**: the category to predict in Classification (Species on generated data; Species, Island or Sex on penguins). It appears only in Classification.
- **Number of groups (k)**: from 2 to 6. It appears only in Clustering.
- **Color by species** (in Classification it follows the label you chose): colors the dots by species. In Regression it also draws one line per species. In Clustering the same checkbox is called **Show the true species**: off colors the dots by the group found, on colors them by the true species.
- **Show the gaps to the line**: draws a segment from every dot to the line. It appears only in Regression.
- **New sample of birds** (New sample of penguins on real data): draws 120 new birds, or a new random two thirds of the penguins.
- **Quick Quiz** box: choose an answer, then press **Check answer**. It resets when you change the data, the question, the columns, the label, k or the sample.
- **Fullscreen / Reset**: Reset returns the lab to its starting state.

### Reading the screen
- **The status line above the plot**: the score for the question. Regression shows R² and the average error. Classification shows the separability score. Clustering shows the number of groups and the silhouette.
- **The plot**: axis titles with units. Click a dot, or focus the plot and press Left or Right, to read that row below it. Escape clears it.
- **The legend**: the species with their counts, or the groups found in Clustering. In Clustering, "Group center" marks each group's middle.
- **The metrics line**: how many rows the plot uses and which sample it is, such as "120 birds, sample 1".
- **The ranking table**: "All pairs, ranked" in Classification, "Inputs for predicting bill depth, ranked" in Regression and "All pairs, clustered" in Clustering. The pair on the plot is highlighted. Click a row to plot it. The last row of the classification table is the baseline.

### Experiments
1. **Predict:** will the pair of columns that sorts the birds well also predict well as a regression? Press Reset, keep bill length across and bill depth up, and switch the Question between the three options. Read the status line each time. Regression gives R² of 16%, Classification 95%, and Clustering a silhouette of 0.55. Explain why one pair can score 95% as a classification and only 16% as a regression.
2. **Predict:** which column is the best input for predicting bill depth? Choose Regression, then read "Inputs for predicting bill depth, ranked": flipper length 51%, body mass 33%, bill length 16%. Click the first row to plot it and make sure Color by species is on. Look at where each species sits, and say whether a flipper really makes a bill deep or whether it just points to the species. Then turn on Show the gaps to the line and click a dot far from the line to read its gap.
3. **Predict:** which pair of columns will classify the species worst? Choose Classification and read "All pairs, ranked". Bill length and bill depth lead with 95%; bill depth and body mass come last with 66%. Click the last row and turn the colors off. Look at how mixed the dots are, then compare the 66% with the baseline row, 33%.
4. **Predict:** which k gives the highest silhouette? Choose Clustering with bill length and bill depth, and try k = 2, 3, 4, 5 and 6. The silhouette is 0.46, 0.55, 0.46, 0.39 and 0.36. Check the agreement for each k as well. Explain why a high agreement alone does not tell you which k is best.
5. **Predict:** will clear groups always match the species? Choose Clustering, then pick Flipper length across and Body mass up, with k = 3. The silhouette is still 0.46, but the agreement drops to 57%. Make sure Show the true species is on and look at how the groups cut across the species.
6. **Predict:** does the trend you saw on the generated birds hold on real data? Set Data to Penguins (real), Question to Regression, bill length across and bill depth up. R² is 6% and the slope is negative. Make sure Color by species is on and look at the lines inside each species. Then press New sample of penguins twice, and check that the overall slope stays negative while every species line stays positive. Finally switch to Classification and compare the best pair of each sample: the score stays between 96% and 97%, but the best pair can change.
