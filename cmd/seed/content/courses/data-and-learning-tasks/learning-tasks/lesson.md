---
slug: learning-tasks
title: Supervised, unsupervised and the three questions
kind: reading
simulator: ''
minutes: 12
---
::: intro
- Name the three learning tasks, regression, classification and clustering, and the question each one asks.
- Choose the right task for a question by checking which column you want to predict.
- Say how you would judge an answer for each task.

Before you start: read "Data, features and labels".
:::

## One table, three questions
*How can a single table lead to three different tasks?*

This lesson uses real data: size measurements of penguins from three islands in Antarctica, collected by researchers at Palmer Station. The table below shows six of them. Lengths are in millimeters and mass is in grams.

| Penguin | Bill length | Flipper length | Body mass | Species |
|---|---|---|---|---|
| 1 | 39.1 | 181 | 3750 | Adelie |
| 2 | 40.3 | 195 | 3250 | Adelie |
| 3 | 46.5 | 192 | 3500 | Chinstrap |
| 4 | 50.0 | 196 | 3900 | Chinstrap |
| 5 | 46.1 | 211 | 4500 | Gentoo |
| 6 | 50.0 | 230 | 5700 | Gentoo |

The table does not say what to learn. That is your choice, and it decides the task. You can ask *how heavy is this penguin?*, or *which species is it?*, or *do these penguins fall into natural groups?* Each question uses the same rows and the same features, and each is a different kind of learning.

[[figure:learning-tasks/three-cards|One table, three questions. The column tinted in each card is the one the model must predict; clustering has no such column.]]

## Regression: how much?
*What does it look like to predict a number?*

A **regression** question asks *how much?* The answer is a number from a continuous range, such as a mass, a price or a delay in minutes. The target column holds numbers, so the model's output is a number too.

Take the question: how heavy is a penguin with a flipper of a given length? Flipper length and mass rise together, so a straight line is a fair first try. A line fitted to all 342 measured penguins is roughly

mass = -5781 + 49.7 × flipper

in grams and millimeters. Each extra millimeter of flipper adds about 50 g.

> Worked example: for penguin 2, with a 195 mm flipper, 49.7 × 195 = 9691.5 and 9691.5 - 5781 = 3910.5, so the model says about 3910 g. The scale said 3250 g. The model is too high by 660.5 g.

A regression is judged by how far its numbers are from the true ones, in the unit of the target: here, grams.

## Classification: which one?
*What changes when the answer is a name, not a number?*

A **classification** question asks *which one?* The answer is a **class**, a name from a fixed list: Adelie, Chinstrap or Gentoo; spam or not spam; sick or healthy. The target column holds categories.

For three species the question is "which of three?". A simpler question keeps just two classes: is this penguin a Gentoo or not? Here is a one-feature rule: if the flipper is at least 208 mm long, say Gentoo; otherwise say not Gentoo. On the six penguins above, it is right every time. Over all 342 measured penguins it is right for 334, which is 97.7%. That score uses the same penguins that suggested the rule, so it is a little optimistic; a later lesson shows how to test on unseen data.

Is that good? Compare it with a lazy rule. Of the 342 penguins, 123 are Gentoo and 219 are not, so always answering "not Gentoo" is right for 219 of 342, which is 64.0%. A classifier has to beat that **baseline**. Getting 334 right clearly does.

> Watch out: a class is a name, even when it is written as a number. If the species were stored as 1, 2 and 3, the task would still be classification. An "average species of 2.4" means nothing.

## Clustering: which belong together?
*What can you ask when there is no answer column at all?*

Now hide the species column. The table has measurements and nothing to predict. You can still ask *do these penguins fall into groups?* That is **clustering**: the model sorts the rows into groups of similar ones, using only the features.

Two things are worth knowing. First, with k-means, the most common method (a later module teaches it), you choose how many groups to look for, a number called k, before you start. Second, the groups arrive as "group 0" and "group 1", not as names. A person has to look at the members and decide what a group means. Often that takes more knowledge than the table holds.

Clustering is **unsupervised**: there are no labels to supervise it. It is the unsupervised task you meet first; other unsupervised tasks exist. Regression and classification are **supervised**: every training row comes with its answer.

::: deeper Do the groups match the species?
We can check, because this table happens to have species. In one run of k-means, a common clustering method, with k = 2 on the four measurements (each rescaled so that no column dominates), one group held 123 penguins, all of them Gentoo. The other held 219: all 151 Adelie and all 68 Chinstrap. The method never saw the species column, yet it found the Gentoo. Adelie and Chinstrap stayed together in that run, so a different k, or different features, would be needed to pull them apart.
:::

## Picking the task
*How do you decide which task a problem is?*

Look at the column you want to predict. Two questions, in order, settle it: is there such a column, and does it hold numbers or names?

[[figure:learning-tasks/task-chooser|Choosing the task: first ask whether there is a column to predict, then whether it holds numbers or names.]]

Other tables work the same way. A house table with a sale price column can pose a regression: what will this house sell for? Turn the same data into a yes or no, did it sell within a month?, and it is classification. Drop the price and the sale outcome, and ask which houses resemble each other, and it is clustering.

> Key idea: the task is not a property of the table. It comes from the question you ask and from the column you pick as the target.

Supervised tasks need labeled rows, and labels often cost effort: someone had to weigh and identify every penguin. Clustering needs none, but it gives you groups to interpret rather than answers.

## Judging each answer
*How do you know whether a result is any good?*

Each task has its own yardstick.

- **Regression:** how far off are the predicted numbers? The errors are in the target's unit. Penguin 2 was off by 660.5 g.
- **Classification:** what share of the answers is right, and does it beat the baseline? The Gentoo rule scored 97.7% against 64.0%.
- **Clustering:** there is no answer key, so there is no "right" count. You ask whether the groups are stable when you rerun (some methods start from a random guess), and whether they are useful and make sense to someone who knows the subject.

[[figure:learning-tasks/three-outputs|Three outputs from 18 real penguins: a fitted line, a rule that splits two classes, and two groups found without labels.]]

All three outputs are shapes drawn over the same dots. What differs is what the model was given and what it returns: a number, a class or a group.

## Before the lab
*What will you try next?*

Three mistakes are worth avoiding before you start.

- **Treating a numeric code as a number.** Species 1, 2, 3 is classification.
- **Expecting clustering to name its groups.** It returns group numbers; naming is your job.
- **Skipping the baseline.** A score of 90% means little until you know what the lazy answer scores.

In the lab that ends this course you will use one dataset to pose a regression question, a classification question and a clustering question, and watch what each one gives you back. Before you open it, try this on paper: take any table you know, such as a menu or a phone bill, and write one question of each kind about it, naming the target of each.

::: remember
- The task comes from the question: a number target is regression, a category target is classification, and no target at all is clustering.
- Regression and classification are supervised and need labels; clustering is unsupervised and gives groups that a person must interpret.
- Judge regression by the size of its errors, classification by its share of right answers against a baseline, and clustering by whether its groups are stable and useful.
:::
