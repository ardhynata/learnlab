---
slug: depth-and-leaf-size
title: Depth and leaf size
kind: reading
simulator: ""
minutes: 15
---
::: intro
- Explain how maximum depth and minimum leaf size limit the size of a decision tree.
- Read training accuracy and validation accuracy side by side to spot a tree that is too deep.
- Pick the two settings by validation accuracy, and say why one split of the data is not enough to be sure.

Before you start: read "Splits and impurity" and "Underfitting and overfitting".
:::

## Two settings that limit a tree
*What do maximum depth and minimum leaf size control?*

The last lesson ended with a tree that keeps splitting until every leaf is pure. Left alone, a tree can end up with a leaf for almost every training row. Two **settings**, chosen before training, stop it sooner.

- **Maximum depth** is how many questions in a row the tree may ask. The first question sits at depth 0, and a leaf's depth is the number of questions needed to reach it. Maximum depth 0 gives a single leaf that always answers the majority class, which is the baseline. Maximum depth 3 allows at most three questions in a row.
- **Minimum leaf size** is the fewest training rows a leaf may hold. A split is allowed only if both of its groups keep at least that many rows. Minimum leaf size 1 means no restriction.

Both settings cap how finely the tree can carve up the data, so both control its complexity.

## The data in this lesson
*Which penguins do the trees sort?*

This lesson asks a question harder than species: *is this penguin male or female?* The tree sees four measurements, namely bill length, bill depth, flipper length and body mass. We use the 333 penguins with all four measurements and a recorded sex. A stratified cut with seed 4 gives 200 training, 67 validation and 66 test penguins. The test penguins stay untouched.

## Depth: questions in a row
*How does maximum depth set the size of the tree?*

Every extra level can double the number of leaves. Depth 1 allows 2 leaves, depth 2 allows 4 and depth 3 allows 8. In general, depth d allows at most 2^d leaves.

[[figure:depth-and-leaf-size/depth-3-tree|The tree grown to maximum depth 3 on the 200 training penguins. Each leaf shows the sex it predicts and how many training penguins reached it.]]

This tree uses all 8 leaves it is allowed. Its first question is about body mass, and the leaves are very uneven: one holds 97 penguins and another only 2. Without a limit, the same data grows 23 leaves and stops at depth 7, where every leaf is pure.

A maximum depth is a ceiling, not a target. If the leaves are all pure sooner, the tree stops sooner.

> Watch out: on the species question, a tree grown on the 206 training penguins of "Baselines and splits" stops at depth 3 with 5 leaves, and raising the cap to 10 changes nothing. Every leaf is already pure, with 206 of 206 right. The limit only matters when the tree would otherwise keep going.

## Minimum leaf size: no tiny groups
*Why not let a leaf hold a single penguin?*

A leaf with one penguin is always pure. It answers "male" because that one penguin was male. That is not knowledge about penguins. It is a memory of one row, and it may well be wrong for similar penguins that are not male.

A minimum leaf size forbids such splits. The figure shows the leaves of the unlimited tree and of a tree with minimum leaf size 10.

[[figure:depth-and-leaf-size/leaf-sizes|The leaves of two trees grown on the same 200 penguins with no depth limit. Minimum leaf size 1 leaves 7 leaves with a single penguin each.]]

Here is the same sweep as a table. Accuracy is the share of penguins answered correctly. Unlike the errors in the earlier lesson, higher is better.

| Minimum leaf size | Leaves | Training right | Validation right |
|---|---|---|---|
| 1 | 23 | 200 of 200 | 54 of 67 |
| 2 | 20 | 194 of 200 | 57 of 67 |
| 5 | 16 | 185 of 200 | 55 of 67 |
| 10 | 9 | 182 of 200 | 57 of 67 |
| 50 | 3 | 165 of 200 | 52 of 67 |

Training accuracy falls steadily as the leaves get bigger, because the tree can no longer memorize individual penguins. Validation accuracy does not move in any clear direction between sizes 2 and 10. Size 50 is too strict: three leaves cannot follow the pattern.

## Training against validation
*What do the two scores say as the tree grows?*

Now let the maximum depth grow and score every tree twice. The first row is the baseline: the majority class, male, with 101 of the 200 training penguins.

| Max depth | Leaves | Training accuracy | Validation accuracy |
|---|---|---|---|
| 0 | 1 | 50.5% | 50.7% |
| 1 | 2 | 76.5% | 56.7% |
| 2 | 4 | 91.0% | 85.1% |
| 3 | 8 | 94.0% | 88.1% |
| 4 | 13 | 95.0% | 86.6% |
| 5 | 17 | 96.5% | 85.1% |
| 6 | 21 | 97.5% | 80.6% |
| 7 | 23 | 100.0% | 80.6% |

[[figure:depth-and-leaf-size/depth-curves|Accuracy on the training and validation penguins for maximum depth 0 to 8. Left: the cut used in the table. Right: the average of 30 different cuts.]]

Training accuracy never goes down, and it reaches 100% at depth 7. Validation accuracy climbs to 88.1% at depth 3, then drifts down to 80.6%. A depth of 8 or more changes nothing, because the depth-7 tree has no impure leaf left to split.

> Worked example: going from depth 3 to depth 7 makes the tree get 200 - 188 = 12 more training penguins right. On the validation penguins it gets 59 - 54 = 5 fewer right. The gap between the two scores grows from 94.0% - 88.1% = 5.9 points to 100.0% - 80.6% = 19.4 points.

::: deeper Why training accuracy never falls
Take a group of 10 training penguins, 6 male and 4 female. It predicts "male" and gets 6 right. Split it any way you like. Each new group predicts its own majority, and the two majorities add up to at least 6. A split into (5 male, 1 female) and (1 male, 3 female) gets 5 + 3 = 8 right. A split into (3, 2) and (3, 2) gets 3 + 3 = 6 right, no worse. So every split leaves the training score the same or higher.
:::

## One cut is not the whole story
*How much should you trust a single split of the data?*

Everything above comes from one cut. The right-hand panel of the figure repeats the experiment on 30 different stratified cuts, seeds 1 to 30, and averages. The picture is calmer.

- Training accuracy rises from 91.6% at depth 3 to 99.8% at depth 8.
- Validation accuracy hardly moves: 86.0% at depth 3 and 86.5% at depth 8.
- The gap grows from 5.6 points to 13.3 points.

The fully grown tree scored lower on validation than the depth-3 tree on 12 of the 30 cuts, equal on 6 and higher on 12. So seed 4 is a sharper case than a typical one. What holds on average is this: **past about depth 3, extra depth buys a lot of training accuracy and almost no validation accuracy.** The extra leaves memorize individual penguins.

> Watch out: 67 validation penguins is a small set. One penguin is 1 / 67, about 1.5 points, so a drop from 57 to 55 right is 2 penguins, about 3 points. Do not read such a difference as a verdict. Treat a gap in the validation score of a penguin or two as a tie.

## Choosing the settings
*How do you pick depth and leaf size in practice?*

1. **Score the baseline** on the validation set first, so you know what 50.7% means.
2. **Try a range of values**, one setting at a time or in combination, and record training and validation accuracy for each.
3. **Take the simplest tree that scores close to the best on validation.** Close means within a penguin or two. Depth 3 had the best validation score here, 59 of 67, with 8 leaves. For leaf size, sizes 2 and 10 both scored 57 of 67, so size 10 is the better pick because it needs 9 leaves where size 2 needs 20.
4. **Score the test set once**, with the settings you chose.

A simpler tree is not only less likely to overfit, it is also easier to read and to explain.

::: deeper Other ways to keep a tree small
Maximum depth and minimum leaf size are not the only controls. Some tree builders also refuse a split whose impurity decrease is below a chosen amount. Others grow the tree fully and then **prune** it, cutting back branches that do not earn their keep on held-out data. The idea is the same: trade a little training accuracy for a tree that generalizes.
:::

## Before the lab
*What will the course lab let you try?*

The next lesson is the lab, "Tree builder lab". Following the course plan, you make the first split yourself, then grow a tree and compare its training and validation performance. Bring three habits from this lesson. Predict where validation accuracy will stop improving before you change the depth. Read the two scores as a pair, together with the baseline. Check what you find on a fresh split, because one cut can mislead.

The lab's data and cuts may differ from the ones used here, so expect the same pattern rather than the same numbers.

::: remember
- Maximum depth caps the questions in a row, so depth d allows at most 2^d leaves. Minimum leaf size forbids leaves with too few training rows.
- Training accuracy never falls as a tree grows. When validation accuracy stops rising and the gap widens, extra depth is only memorizing.
- Choose the settings by validation accuracy, take the simplest tree close to the best, and treat differences of a penguin or two as noise.
:::
