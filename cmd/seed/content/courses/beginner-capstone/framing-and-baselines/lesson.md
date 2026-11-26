---
slug: framing-and-baselines
title: Framing and baselines
kind: reading
simulator: ""
minutes: 15
---
::: intro
- Frame a problem: say what is predicted, for whom, what a mistake costs and which data may be used.
- Choose the metric that matches the cost of the mistakes.
- Compute a majority-class baseline and a one-feature rule, and say why a model must beat both.

Before you start: read "Baselines and splits" and "Confusion matrix and rates".
:::

## Frame it before you fit it
*What do you decide before you train anything?*

A model answers a question, so the question comes first. Teams that skip it often build a good model for the wrong problem. Before you open a dataset, write down five things.

- **The prediction.** What exactly is predicted, for one row at a time?
- **The user.** Who acts on the answer, and what do they do with it?
- **The cost of a mistake.** What happens when the answer is wrong, and are all wrong answers equally bad?
- **The metric.** Which number measures that cost?
- **The data.** Which columns will exist at the moment of prediction, and which must stay out?

The beginner capstone follows this recipe on the penguin table from earlier lessons. You will build a classifier, compare two models with a baseline, and explain three errors. This lesson does the first half of the work: framing and baselines. It uses two penguin questions and keeps them in view to the end.

> Key idea: a model is judged against a question, not in the abstract. Framing is the step that makes the judging possible.

## Two questions from one table
*How can one table pose more than one problem?*

The penguin table has 344 rows. Two rows have no measurements at all, so 342 penguins can be used. The same table lets us ask different questions. You met this idea in "Three questions, one dataset".

**Question A: Adelie or Chinstrap?** Keep only the Adelie and Chinstrap penguins: 151 + 68 = 219 rows. The **target** is the species. Chinstrap is the positive class, the one we hunt for. Positives are 68 of 219, about 31%.

**Question B: male or female?** Keep the penguins whose sex is written down: 333 rows (168 male, 165 female). Nine measured penguins have no sex recorded, and a model cannot be scored against a label that is missing. Here male is the positive class.

In both questions the features are the same four measurements: bill length, bill depth, flipper length and body mass. Only the target and the rows change.

[[figure:framing-and-baselines/two-questions|The same table framed two ways. The class bars show how the rows split, and the last line is what a model has to beat.]]

## What a mistake costs
*Which metric matches the cost?*

A yes-or-no model can be wrong in two ways, and the framing says which one hurts more. Imagine a ranger who uses question A to count Chinstrap penguins in a mixed colony. A Chinstrap called "Adelie" is a missed case, so the count comes out too low. An Adelie called "Chinstrap" is a false alarm, so the count is a little high. In this made-up case she has decided that a miss is the mistake she cannot accept, because she must find every Chinstrap nest to protect it. So the number to watch is **recall**: of all real Chinstrap penguins, how many were found?

Now imagine a biologist who uses question B to tag one sex for a study. Either wrong answer wastes one tag, and the two classes are almost the same size. Plain **accuracy** is a fair metric here.

> Worked example: a one-feature rule for question A (built later in this lesson) is scored on 44 validation penguins: 12 true positives, 2 missed Chinstrap, 1 false alarm and 29 true negatives. Recall = 12 / (12 + 2) = 12 / 14 = 85.7%. Precision = 12 / (12 + 1) = 12 / 13 = 92.3%. Accuracy = (12 + 29) / 44 = 93.2%. A rule that always answers "Adelie" has recall 0 on the same rows.

The costs here are made up for the example. In your own project, write down your own cost, then choose the metric.

## What data may the model use
*Which columns are allowed, and which would be cheating?*

A model may use a column only if it will exist **when the prediction is made**. In our questions that is easy: a researcher holding a live penguin can measure the bill, the flipper and the mass. Those are fair features.

Two traps are worth knowing.

**A leak.** **Data leakage** means information that would not be available at prediction time, or information that is the answer in disguise, gets into training. Imagine a column "tag colour" where biologists put a blue tag on each male and a red tag on each female. It would predict sex perfectly and be useless, because it is written after the sex is known. This table has no such column, but real tables often do. Scores then look wonderful, and nothing warns you.

**A shortcut.** In these 219 rows every penguin on Torgersen and Biscoe is Adelie, 51 + 44 = 95 of them. So "island" looks helpful, but it only describes where this study happened to sample. At a new colony, it would fail.

[[figure:framing-and-baselines/known-when|What is known when the model has to answer. Measurements are known; a tag that is added after the sex is known leaks the answer.]]

Leakage also comes from how you work. A rule's cut-off, a mean or a majority class must be computed from the training rows only, as in "Baselines and splits".

## The majority-class baseline
*What is the laziest answer, and how often is it right?*

A **baseline** is the simplest sensible answer. You compute it first, so that every later score has something to be compared with. For classification the first baseline is the **majority class**: always answer the most common class in the training rows.

Cut each task with a stratified split (seed 1), 60% / 20% / 20%, as in "Baselines and splits". The baseline is picked from the training rows and scored on the validation rows.

- **Question A.** The 219 rows split into 132 training, 44 validation and 43 test rows. Training holds 91 Adelie and 41 Chinstrap, so the baseline says "Adelie". On the 44 validation penguins, 30 are Adelie: 30 / 44 = 68.2%.
- **Question B.** The 333 rows split into 200 training, 67 validation and 66 test rows. Training holds 101 males and 99 females, so the baseline says "male". On the 67 validation penguins, 34 are male: 34 / 67 = 50.7%.

> Key idea: the baseline score depends on the question. 68.2% is barely above the baseline on question A, but it would be a clear gain over the 50.7% baseline on question B. Always read an accuracy next to its own baseline.

## A simple rule
*What is the next step up from the majority class?*

The second baseline uses the data a little. Pick **one** feature and one cut-off, and answer by comparing the two. The cut-off is chosen from the training rows only: try every possible cut, and keep the one that gets the most training rows right. This is a model with a single question in it, and it needs no real training algorithm.

**Question A.** The best training cut on bill length is 44.65 mm: "above 44.65 mm means Chinstrap". It gets 129 of 132 training rows right (97.7%) and 41 of 44 validation rows (93.2%). Bill length separates these two species well.

**Question B.** The best cut on body mass is 3712.5 g: "above 3712.5 g means male". It gets 148 of 200 training rows right (74.0%) and 51 of 67 validation rows (76.1%). Heavier penguins are more often male, but a heavy female and a light male are common, so a mass alone only goes part of the way.

::: deeper How the cut is found
Sort the training rows by the feature. Between every two neighbouring values there is a candidate cut, at the midpoint. For each candidate, count how many training rows the rule would get right, and keep the best one. With 200 rows that is under 200 candidates, a tiny search. A decision tree makes the same kind of search, one split at a time.
:::

## Why a model must beat them
*When is a model worth keeping?*

Collect the validation scores:

| Question | Majority class | One-feature rule |
|---|---|---|
| A: Adelie or Chinstrap | 68.2% | 93.2% |
| B: male or female | 50.7% | 76.1% |

[[figure:framing-and-baselines/baseline-vs-rule|Validation accuracy of the two baselines on both questions, from one stratified cut (seed 1).]]

A real model is worth its extra cost only if it clearly beats the best of these, on the metric you chose in the framing. A model that scores 70% on question A is worse than a rule that fits in one sentence. A model that scores 80% on question B beats both baselines.

Be careful about small gaps. One cut with 44 validation rows is a noisy judge: one penguin is 2.3 points. Over seeds 1 to 10, the rule's validation accuracy on question A ranged from 90.9% to 95.5%, and on question B from 56.7% to 76.1%, while the baselines stayed at 68.2% and 50.7%. A model that wins by one or two penguins has not shown anything yet.

> Watch out: a model can beat the majority class and still lose to a simple rule. Compare with the strongest baseline you can write in a few minutes.

## Before the capstone
*What do you take into the project?*

You now have a frame and a floor. A good frame says what is predicted, who uses it, what a mistake costs, which metric measures that cost and which columns are allowed. A good floor is a majority-class baseline plus a simple rule, scored on validation rows chosen before any modelling.

The next lesson, "Comparing models and errors", puts two models next to those baselines, shows how to read their mistakes row by row, and explains why you look at errors and not only at one score. After it, the "Beginner capstone project" asks you to do the whole job yourself on a public table: frame it, set the baselines, compare two models, and explain three representative errors. Write the frame down before you start; you will want it when the numbers arrive.

::: remember
- Frame first: the prediction, the user, the cost of a mistake, the metric and the columns allowed at prediction time.
- Compute a majority-class baseline and a simple one-feature rule from the training rows, and score them on validation rows.
- A model counts only if it clearly beats both baselines on the metric the framing chose.
:::
