---
slug: reproducible-pipelines
title: Reproducible pipelines
kind: reading
simulator: ""
minutes: 20
---
::: intro
- Put the imputer, encoder, scaler, selector and model in one pipeline, and fit all of it on the training folds only, again in every round.
- Fix the seeds, record the settings, and report a results table that a reviewer can rerun and get the same numbers from.
- Name the quiet ways a pipeline leaks, and ask of each step what it learns, from which rows.

Before you start: read "Pipelines and leakage", "Cross-validation and stratification" and "Defending an evaluation". The first gave you the rule (learn from training rows only), the second the folds, and the third how to defend a split. This lesson keeps the rule true in every fold, and makes the run repeatable.
:::

## One pipeline, fitted in every round
*What changes when the pipeline runs inside cross-validation?*

"Pipelines and leakage" gave one rule: whatever is learned from data is learned from the training rows only. With one split that is easy to keep. Cross-validation has k rounds, and each round has its own training rows. A step fitted once, before the folds, has seen every held-out fold.

So the whole pipeline is fitted again in every round. Five kinds of step can sit in it, and each learns something: an **imputer** a median, an **encoder** a list of categories, a **scaler** a mean and a standard deviation, a **selector** which columns to keep (it reads the labels), and the **model** its weights.

In one round the pipeline is fitted on the training folds. The held-out fold then goes through the same steps with their numbers frozen, and the model's answers are scored. The next round starts from nothing. The pipeline you finally keep is fitted once more on all the training rows.

[[figure:reproducible-pipelines/pipeline-in-folds|One round of 5-fold cross-validation. Top: five steps fitted on the training folds. Bottom: the held-out fold passes through the same steps with those numbers frozen, and is scored.]]

> Key idea: one round is one full run of the recipe: fit on the training folds, apply to the held-out fold, score. Nothing learned in one round is carried into the next.

## Three rounds on six penguins
*How much does the training part of a round change what a step learns?*

Take the first six rows of the penguin table and their body mass in grams: 3,750, 3,800, 3,250, a gap, 3,450 and 3,650. Cut them into 3 folds of two. Each round fits an imputer (the median) and a scaler (mean and standard deviation, computed after the gap is filled) on the four training penguins.

| Round | Held out | Training masses (g) | Imputer median | Scaler mean | Scaler sd |
| --- | --- | --- | --- | --- | --- |
| 1 | penguins 1, 2 | 3,250, gap, 3,450, 3,650 | 3,450 | 3,450 | 141.42 |
| 2 | penguins 3, 4 | 3,750, 3,800, 3,450, 3,650 | 3,700 | 3,662.5 | 134.05 |
| 3 | penguins 5, 6 | 3,750, 3,800, 3,250, gap | 3,750 | 3,637.5 | 224.65 |

> Worked example: round 2 holds out penguin 3 (3,250 g). The training mean is 3,662.5 and the gaps from it are 87.5, 137.5, -212.5 and -12.5. Their squares add to 71,875, divided by 4 is 17,968.75, and the square root is 134.05. So z = (3,250 - 3,662.5) / 134.05 = -3.08. Fit the scaler before the split on all six (the gap filled with their median, 3,650) and the mean is 3,591.67, the sd 188.01 and z = -1.82.

[[figure:reproducible-pipelines/fold-statistics|The six penguins in each round: training penguins and held-out penguins on the mass axis, the scaler mean of that round, and the mean of all six as a dashed line. The gap of penguin 4 is not drawn.]]

The same penguin gets two different yardsticks, and in the leaky one it helped to build its own. With 333 rows the gap would be far smaller, but the steps in the pipeline would still disagree from round to round.

## Fixed seeds, recorded settings
*What must you write down so the same run can happen again?*

A run makes random choices: which rows go into which fold, the starting weights of some models, a shuffle. A **seed** is a number that fixes a random generator, so it draws the same numbers each time. Fix every seed and write it down, and the folds and scores come back unchanged.

Seeds are not for picking a pleasing number. Choose the seed before you look at any score. Then rerun with several seeds to see how much the score depends on it.

Here is that for the 333 penguins with a recorded sex, predicting sex from the four measurements, with 5-fold stratified cross-validation and ten seeds. The mean score of k-NN with k = 5 ranges from 90.1% to 91.9%, and that of logistic regression from 88.6% to 89.5%. k-NN is ahead for all ten seeds, by 1.5 to 3.3 points, so a gap of two points survives a new seed. A gap of half a point would not.

[[figure:reproducible-pipelines/seed-spread|The mean 5-fold accuracy for ten seeds of the fold shuffle, for two models on the same 333 penguins.]]

> Watch out: a seed is only one of the settings. The data file, the rows you dropped, every step's settings, the metric and the library versions belong in the record too.

## The results table
*What does a table of results have to hold?*

The settings go in a record, and the scores go in a table. This is the one for seed 42, the same five folds for every model, each row a pipeline with a scaler fitted inside every round.

| Model | Fold 1 | Fold 2 | Fold 3 | Fold 4 | Fold 5 | Mean | SD |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Always predict male (baseline) | 50.7 | 50.7 | 50.7 | 50.0 | 50.0 | 50.4 | 0.4 |
| Logistic regression | 91.0 | 95.5 | 88.1 | 81.8 | 87.9 | 88.9 | 5.0 |
| k-NN, k = 5 | 91.0 | 88.1 | 91.0 | 89.4 | 93.9 | 90.7 | 2.2 |

The SD here is the standard deviation of the five fold scores, divided by 4 (n - 1).

```
data      penguins.csv, 344 rows; 333 with sex and all four measurements
task      predict sex (male = 1) from bill length, bill depth, flipper length, body mass
folds     5-fold, stratified by sex, seed 42
pipeline  scaler fitted on the training folds -> model
metric    accuracy, in percent
```

Read it from the bottom up. The baseline row says what guessing earns, 50.4. Both models are far above it. k-NN is ahead of logistic regression by 1.8 points, in 3 of 5 folds, tied in one and behind in one. That is a hint. The ten seeds above are the stronger evidence. Show every model you tried, the losers too: the more you tried, the more luck is in the best row.

## What a reviewer should be able to rerun
*What can a stranger check without asking you anything?*

A reviewer should be able to take your folder and do four things without a question to you.

1. **Start from the raw data**, with the file named and its row count written down.
2. **Run one command** that goes from that file to the results table, with no step done by hand in between, such as a cell edited in a spreadsheet.
3. **Get the same table**, digit for digit, because every seed is fixed and the settings record says everything else.
4. **Read each step** and see what it learns and from which rows.

Test this yourself before anyone else does: run the whole thing twice and compare the tables, then run it in a clean copy of the folder with cached files deleted. If the two tables differ, something is missing from the record: a seed, a data version, or a step you did by hand.

> Key idea: a table you cannot regenerate is a claim. A table that comes back from one command, with its settings beside it, is a result.

## Ways a pipeline silently leaks
*Which mistakes raise no error and still inflate the score?*

"Pipelines and leakage" named three doors. Cross-validation adds more, and none of them stops the run.

- **A step fitted outside the loop.** The imputer, scaler, encoder or selector sees every row before the folds start. A target encoding does the same with the labels.
- **Resampling before the split.** Copies of a rare class, made first, put the same row in the training folds and in the held-out fold.
- **Repeated entities or time.** The same customer, or a later date, sits on both sides. "Grouped and temporal splits" showed how to keep them apart.
- **Tuning on the reported score.** Try 20 settings and quote the best fold score, and you have quoted the luckiest one.
- **A test set used twice.** Once you change anything after looking at it, it is a validation set.

> Watch out: a leak raises no error. It raises the score, and a good score is the one nobody audits. For each step ask: what does it learn, from which rows, and does it read the labels?

::: deeper How the 20 tries inflate a score
Suppose a model is right 88% of the time and you score it on a 50-row hold-out. The chance of 47 or more right out of 50 (94% or better) is the sum of four binomial terms, 0.0833 + 0.0382 + 0.0114 + 0.0017, which is 0.1345. A model whose true accuracy is 88% therefore shows 94% about once in eight tries. If 20 independent tries each have that chance, the chance that none reaches 94% is (1 - 0.1345)^20 = 0.0556, so at least one does with probability 0.9444. The tries are really correlated (they share the same rows), so the true figure is lower, but the direction holds: tune inside the training part, and quote a score you did not tune on.
:::

::: deeper Same seed, different result
A seed fixes the draws of one version of one library. Another version may draw in another order, change a default, or sum numbers in another order, and the scores move in the last digits. This is why the record names the versions as well as the seed. Models with no random step, such as k-NN with ties broken by a fixed rule, need no seed, but write that down too.
:::

## Toward the capstone project
*What will you build with this?*

The next lesson, "Intermediate capstone project", asks you for a cost-sensitive classifier on data with repeated entities or timestamps. You will defend the split as in "Defending an evaluation", compare models in a results table like the one above, and report how uncertain the held-out score is.

Start the project from this lesson's habits. Write the settings record first. Put every learned step inside one pipeline. Fix the seeds before you see a score. Run the whole thing once, then run it again from a clean folder and check that the table is the same. Then rate your own work against the points above.

::: remember
- A pipeline holds every learned step, the selector included, and is fitted on the training folds only, again in every round.
- Fix the seeds before you look at scores, record the data, split, steps, metric and versions, and report a table with fold scores, mean, spread and a baseline.
- A reviewer must be able to rerun it from the raw data with one command. Leaks raise no error: ask of each step what it learns, from which rows.
:::
