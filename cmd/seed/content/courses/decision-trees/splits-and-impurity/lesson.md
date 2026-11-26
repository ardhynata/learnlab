---
slug: splits-and-impurity
title: Splits and impurity
kind: reading
simulator: ''
minutes: 20
---
::: intro
- Describe a split as a yes-or-no question about one feature, and say why it is axis-aligned.
- Compute Gini impurity for a group, and score a split by the weighted impurity of its two groups.
- Choose the best split by hand on a small example, and explain how a tree keeps splitting.

Before you start: read "Data, features and labels".
:::

## A split is a yes-or-no question
*What does a decision tree actually ask?*

A **decision tree** predicts by asking a chain of yes-or-no questions about a case. Each question is a **split**: one feature and one threshold, such as "is the flipper length at most 195.5 mm?" Cases that answer yes go one way, the others go the other way.

Because a split looks at a single feature, its dividing line is straight and parallel to an axis. In a plot of two features it is a vertical or a horizontal line. That is why it is called **axis-aligned**.

A group that is not divided any further is a **leaf**. A leaf predicts the **majority class**: the most common label among the training cases that ended up there.

Training a tree means choosing the questions. Which feature should we ask about, and at which threshold? The rule is simple. Prefer the question that leaves the two groups as *pure* as possible, meaning each group is mostly one class. The next sections make "pure" into a number.

## Impurity: how mixed is a group?
*How can a group's mix of labels become one number?*

**Impurity** is a score that is 0 for a pure group and grows as the labels mix. The most common one is **Gini impurity**. Take the share of each class in the group, square each share, add them up, and subtract the total from 1:

`Gini = 1 - (p1² + p2² + ...)`

- 10 Adelie penguins and no others: 1 - 1² = **0**.
- 5 Adelie and 5 Chinstrap: 1 - (0.5² + 0.5²) = **0.5**.
- 5 Adelie and 2 Chinstrap: 1 - ((5/7)² + (2/7)²) = 1 - 29/49 = 20/49, about **0.41**.

[[figure:splits-and-impurity/gini-curve|Impurity of a two-class group against the share p of one class. Gini (solid) and entropy (dashed, explained below) are both 0 for a pure group and highest for a 50/50 mix. The dot marks 5 Adelie in 7, with a Gini of about 0.41.]]

With two classes, Gini runs from 0 to 0.5, and 0.5 is the worst mix possible.

> Key idea: impurity is low when one class dominates and highest when the classes are evenly mixed.

::: deeper Gini as a chance of a mix-up
Pick one case from the group at random and guess its label by drawing from the group's class shares. The chance of guessing wrong is 1 - (p1² + p2² + ...), which is exactly the Gini impurity. A pure group never produces a wrong guess, and a 50/50 group is wrong half the time.
:::

## Scoring a split
*How do we compare two ways of cutting the same group?*

A split makes two child groups, and each has its own impurity. To get one score for the split, take a **weighted average**, where each child counts in proportion to its size:

`weighted Gini = (n_left / n) × Gini_left + (n_right / n) × Gini_right`

The weights matter. A pure group of two cases should not outweigh a messy group of eight.

The **impurity decrease**, also called the **gain**, is the Gini before the split minus the weighted Gini after it. The best split is the one with the largest decrease. The weighted Gini of the children is never higher than the parent's, so a gain is never negative. A gain of 0 means the question taught us nothing.

Which thresholds do we try? Sort the values of a feature. Any cut between the same two neighboring values makes the same two groups, so one candidate per gap is enough, usually halfway between the neighbors. Equal values give no gap.

> Key idea: a tree builder tries every candidate split on every feature and keeps the one with the largest impurity decrease.

## A worked example
*Can we pick the best split with a pencil?*

Take ten penguins from the course dataset: five Adelie (A) and five Chinstrap (C). Sorted by flipper length in mm, they are 181 A, 186 A, 188 C, 190 A, 193 A, 193 C, 195 A, 196 C, 197 C, 198 C. The whole group has a Gini of 0.5.

> Worked example: try "flipper at most 195.5". Left: 7 penguins, 5 A and 2 C, Gini 20/49 = 0.41. Right: 3 penguins, all C, Gini 0. Weighted: 7/10 × 0.41 + 3/10 × 0 = **0.29**. The gain is 0.5 - 0.29 = **0.21**.

Now try every gap:

| Cut at | Left (A, C) | Right (A, C) | Weighted Gini |
|---|---|---|---|
| 183.5 | 1, 0 | 4, 5 | 0.44 |
| 187 | 2, 0 | 3, 5 | 0.38 |
| 189 | 2, 1 | 3, 4 | 0.48 |
| 191.5 | 3, 1 | 2, 4 | 0.42 |
| 194 | 4, 2 | 1, 3 | 0.42 |
| **195.5** | 5, 2 | 0, 3 | **0.29** |
| 196.5 | 5, 3 | 0, 2 | 0.38 |
| 197.5 | 5, 4 | 0, 1 | 0.44 |

[[figure:splits-and-impurity/threshold-scan|The ten penguins on a flipper-length line, and the weighted Gini of every candidate cut. The lowest bar, at 195.5 mm, is the best split.]]

The cut at 195.5 mm wins. Notice that 187 is not the best, even though it makes a perfectly pure group of two.

## Trying every feature
*How does the tree choose between features, and what can a straight cut not do?*

The same search runs over every feature, and the best cut of all wins. The same ten penguins also have a bill length in mm. The five Adelie have bills from 36.7 to 40.3 and the five Chinstrap from 45.2 to 52.7. Any cut between 40.3 and 45.2, say "bill length at most 43", gives two pure groups: weighted Gini 0 and a gain of **0.50**. That beats the flipper cut's 0.21, so this tree would ask about the bill first.

[[figure:splits-and-impurity/two-features|The same ten penguins cut two ways. The flipper cut leaves a mixed group below the line. The bill cut leaves both sides pure.]]

Two limits are worth knowing:

- **Equal values stay together.** One Adelie and one Chinstrap both have a flipper length of 193 mm. No flipper cut can separate them.
- **Lines are straight and axis-aligned.** If two classes are divided by a slanted line, a tree needs many small cuts that form a staircase.

## Entropy, the other measure
*Is Gini the only way to score a mix?*

**Entropy** is a second impurity measure. It also uses the class shares, with a logarithm:

`entropy = -(p1 × log2 p1 + p2 × log2 p2 + ...)`

A pure group has entropy 0. A 50/50 group of two classes has entropy 1. For 5 Adelie and 2 Chinstrap it is about 0.86.

A split is scored the same way as before. The weighted entropy of the cut at 195.5 mm is 7/10 × 0.86 + 3/10 × 0 = 0.60, so the gain is 1 - 0.60 = **0.40**.

The shape matches Gini in the figure above, only taller: entropy tops out at 1 where Gini tops out at 0.5. So numbers from the two measures cannot be compared with each other. On these ten penguins both pick the cut at 195.5 mm as the best flipper cut. In practice the two usually choose the same or very similar trees. Gini needs no logarithm, so it is a little cheaper to compute.

> Watch out: do not compare a Gini gain with an entropy gain. Compare splits only within one measure.

## Splitting again, and what comes next
*What happens after the first split?*

A tree builder does not stop at one question. It treats each child group as a new, smaller problem and repeats the search on it. This is **recursion**: the same procedure applied to each group, until a stopping rule applies. The simplest rule is that a group is pure.

To see it, start from the flipper cut. The right group (3 Chinstrap) is pure, so it becomes a leaf. The left group (5 Adelie, 2 Chinstrap) is mixed, so we search again. Among the cuts on either feature, "bill length at most 43" is best: it separates 5 Adelie from 2 Chinstrap. (A builder that always takes the best split available, a **greedy** builder, would really have asked about the bill first; we start from the flipper cut to show the recursion.)

[[figure:splits-and-impurity/split-tree|A tree grown by recursion. Each box shows its question, its class counts and its Gini. The three leaves are pure.]]

Growing until every leaf is pure fits the training data perfectly, which can mean memorizing its noise. The next lesson, "Depth and leaf size", shows how to limit the tree. After that, the "Tree builder lab" lets you grow trees on the penguins yourself and watch each split and its impurity.

::: remember
- A split is a yes-or-no question about one feature and a threshold. It is axis-aligned, and a leaf predicts its majority class.
- Gini impurity is 1 minus the sum of squared class shares. A split's score is the weighted Gini of its two groups, and the best split has the largest decrease.
- The tree tries every cut on every feature, then repeats on each child until the groups are pure or a stopping rule applies. Entropy is a close alternative to Gini.
:::
