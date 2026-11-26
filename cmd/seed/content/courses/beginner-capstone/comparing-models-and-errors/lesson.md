---
slug: comparing-models-and-errors
title: Comparing models and errors
kind: reading
simulator: ""
minutes: 20
---
::: intro
- Compare two models fairly: same rows, same features, same metric, one change at a time.
- Read the gap between a training score and a held-out score, and repeat on fresh splits before you trust a difference.
- List a model's mistakes, find the pattern, name three representative errors, and write a short report.

Before you start: read "Framing and baselines", "Underfitting and overfitting" and "Confusion matrix and rates".
:::

## Two models, one question
*Why is one score not enough to pick a winner?*

The task here is a yes-or-no question on the penguin table: is this penguin a Chinstrap rather than an Adelie? There are 219 penguins with all four measurements (bill length, bill depth, flipper length, body mass): 151 Adelie and 68 Chinstrap. We hold out 55 of them, 17 Chinstrap and 38 Adelie, and train on the other 164.

The baseline always answers "Adelie". It is right for 38 of the 55 held-out penguins: 69.1%. This lesson uses a new split of 164 training and 55 held-out penguins, so the baseline is 69.1% here and not the 68.2% of "Framing and baselines". It also leaves out that lesson's one-feature rule, to keep the comparison to two models. Two models try to beat it: **k-NN** with 5 neighbors and **a decision tree** of depth 3. Both see the four measurements, scaled for k-NN.

| Model | Right on the 55 held-out penguins | Accuracy |
|---|---|---|
| Baseline, always Adelie | 38 | 69.1% |
| k-NN, k = 5 | 54 | 98.2% |
| Decision tree, depth 3 | 55 | 100% |

The tree wins by one penguin, and it found all 17 Chinstraps. k-NN found 16 of 17: a recall of 94.1%. Is the tree the better model? One run on one split can mislead. The rest of this lesson is how to make the answer mean something.

> Key idea: a comparison is only as good as the rules it was run under.

## Same rules for both models
*What must stay identical when you compare two models?*

A comparison is fair when the only difference between the two sides is the thing you want to test. Three things must match.

- **Same split.** Both models train on the same 164 penguins and are scored on the same 55. A different shuffle for each model hands one of them an easier test.
- **Same features.** Both get the same four measurements, prepared the same way. If one model sees extra columns, you are comparing information, not models.
- **Same metric.** Pick it before you look at results. Here it is accuracy, plus recall for Chinstrap. Switching to whichever metric flatters your favorite is a way to fool yourself.

[[figure:comparing-models-and-errors/fair-comparison|A fair comparison: the same rows and the same metric on both sides, and only the model differs.]]

> Watch out: score both models on the same kind of rows. k-NN with k = 1 is right for 100% of the penguins it trained on, because each one is its own nearest neighbor. Set that beside the 98.2% of k = 5 on held-out rows and k = 1 looks better. On the held-out rows k = 1 scores 96.4%.

## Training score and held-out score
*What does the gap between the two scores tell you?*

Every model has two scores: one on its training rows and one on the held-out rows. The distance between them is the **gap**. A model that memorizes its training rows shows a high training score and a lower held-out score.

[[figure:comparing-models-and-errors/train-vs-held-out|Training score (ring) and held-out score (dot) for five models on one split. The number on the right is training minus held-out, in points.]]

> Worked example: k = 1 gets 164 of 164 training penguins right (100%) and 53 of 55 held-out penguins (96.4%). The gap is 100 - 96.4 = 3.6 points. k = 5 gets 160 of 164 (97.6%) and 54 of 55 (98.2%). Its held-out score is 0.6 points higher, so there is no sign of memorizing.

Do not read small gaps too closely. One held-out penguin is worth 1 / 55 = 1.8 points, and one training penguin only 1 / 164 = 0.6 points. A gap of a point or two, in either direction, is just noise. Report both scores: the held-out score says how well the model does on new rows, and the gap says whether it is memorizing.

## One change at a time
*How do you know which change moved the score?*

Change one thing between two runs and keep a log: one line per run with what changed and both scores. If you switch from k-NN to a tree and also drop two features, and the score moves, you cannot say which change did it.

Here is a log on the same split. Run 2 changes only k. Run 4 changes only the depth.

| Run | What changed | Training | Held-out |
|---|---|---|---|
| 1 | k-NN, k = 5 | 97.6% | 98.2% |
| 2 | only k: 5 to 1 | 100% | 96.4% |
| 3 | decision tree, depth 3 | 97.6% | 100% |
| 4 | only depth: 3 to 10 | 100% | 98.2% |

Both "more flexible" changes did the same thing on this split. The training score rose to 100% and the held-out score dropped by one penguin. That matches what you saw in "Underfitting and overfitting": a more flexible model fits the training rows more closely, which does not make it better on new rows.

> Key idea: a result you can explain with one change is worth more than a better score you cannot explain.

## Repeat on a fresh split
*Is the tree really better, or did this one split favor it?*

The tree's lead was one penguin out of 55, which is 1.8 points. A different shuffle could easily reverse it. So repeat the whole comparison on fresh splits: new shuffle, same rules, both models scored on the same new held-out rows.

Here are ten splits, each with 164 training and 55 held-out penguins. Each cell counts the mistakes on the 55 held-out penguins.

[[figure:comparing-models-and-errors/ten-splits|Mistakes on 55 held-out penguins in ten splits. The tree wins twice, k-NN wins three times, and five splits tie.]]

Over the ten splits k-NN made 13 mistakes and the tree made 15, out of 10 x 55 = 550 answers each. That is 97.6% against 97.3%. The winner changes from split to split, and half the splits tie. The honest summary is that the two models are about equal here, and both are far above the 69.1% baseline.

::: deeper Ten splits are not ten independent tests
All ten splits cut the same 219 penguins, so a hard penguin lands in the held-out set in about one split out of four. The ten scores are therefore not ten separate pieces of evidence. They give you a feel for how much a score moves with the cut, which is the question we care about here. They cannot tell you how the models would do on penguins from another island or another year.
:::

## Listing the mistakes
*Where is the model wrong, and is it wrong on the same penguins every time?*

A score counts mistakes but does not say which ones. So make a list. For every wrong answer write down the true class, the predicted class, the measurements and how sure the model was. Then look for patterns: the kind of mistake (a missed Chinstrap is a false negative, a wrongly flagged Adelie is a false positive), traits the wrong penguins share, and penguins that come back again and again.

> Worked example: across the ten splits, k-NN made 13 mistakes: 12 missed Chinstraps and 1 false alarm. But those 13 mistakes belong to only 6 different penguins. One penguin was wrong in all 4 splits where it was held out, another in 3 of 3, two more in 2 of 2, and two once. Five of the six are female Chinstraps. The sixth is a male Adelie.

If a mistake were bad luck, a different shuffle would move it. These keep coming back, so the cause is in the penguins or in what the model is allowed to see.

> Key idea: mistakes that repeat across splits are information about the data, not noise from the split.

## Naming representative errors
*What kinds of reason can sit behind a mistake?*

You cannot study every error, so pick a few that stand for the rest and give each a name. There are four common reasons.

- **Overlap between classes.** Both classes really do produce such measurements.
- **An unusual measurement.** The penguin is far from the typical one of its own class, or a value may be a typing error.
- **Possible label noise.** The label may be wrong. Check this when a model is confidently wrong in every split and the row is not odd.
- **A missing feature.** The information that would separate the classes is not among the columns the model sees.

[[figure:comparing-models-and-errors/bill-overlap|Bill length of the 151 Adelie (above) and the 68 Chinstrap (below), in 1 mm bins. The numbered diamonds mark the three errors in the table.]]

| Error | What we see | Name | What to check |
|---|---|---|---|
| 1. Female Chinstrap, bill 42.5 mm, missed 4 of 4 times | Only 4 of 68 Chinstraps have a bill this short or shorter, but 12 of 151 Adelie are this long or longer | Overlap | Look at the other measurements of these penguins. |
| 2. Male Adelie, flipper 210 mm, called Chinstrap once | The longest flipper of 151 Adelie: (210 - 190.0) / 6.5 = 3.1 standard deviations above their mean | Unusual measurement | Typing error or a real big bird? |
| 3. Female Chinstrap, bill 46.0 mm, missed 3 of 3 times | 15 of 15 Chinstraps with a bill of 46 mm or less are female, and 12 of 12 Adelie with 42.5 mm or more are male | Missing feature | Add `sex` as a feature and test it. |

> Watch out: a name is a hypothesis, not a proof. The table cannot tell you whether any of these penguins has a wrong label, and it cannot tell you whether adding `sex` would help until you try it. None of the three examples shows label noise, which is why it stays a possibility and not a finding. One error can also fit two names: rows 1 and 3 are both female Chinstraps with a bill in the overlap zone, and the name is the hypothesis you choose to test first.

::: deeper Why not delete the hard penguins?
Dropping the penguins a model gets wrong makes the held-out score look better and means nothing. The held-out rows must stay as they are. If an error turns out to be a typing mistake or a wrong label, fix it at the source and run the whole comparison again from a fresh split.
:::

## What to write in a short report
*What does a reader need in order to trust your result?*

A short report is half a page. It should let a reader repeat what you did and see how far to trust it. Write these six parts.

1. **Question and data.** The yes-or-no question, how many rows, and which rows were left out and why.
2. **Baseline.** The score to beat: always Adelie, 69.1%.
3. **Models and what differed.** The two models, the settings, and the one change between runs.
4. **Results.** Training and held-out scores for both models on the same split, repeated on ten splits.
5. **Three errors.** Each with its name and the check you would do next.
6. **Verdict and limits.** What you conclude, and what you could not show.

> Worked example: "On 219 penguins, I asked whether a penguin is a Chinstrap rather than an Adelie. The baseline scores 69.1%. On ten splits k-NN made 13 mistakes and a depth-3 tree made 15, out of 550 answers each, so I cannot separate them. Six penguins cause every k-NN mistake; five are female Chinstraps, so I would test `sex` as a feature next."

In the "Beginner capstone project" lesson, the last in this course, you do these steps yourself in its lab and write your own version of this report.

::: remember
- Compare models on the same split, with the same features and the same metric, and change one thing at a time.
- Report the training score and the held-out score, then repeat on fresh splits before you call a winner.
- List the mistakes, look for repeats, and name a few representative errors as hypotheses to check.
:::
