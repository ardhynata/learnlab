---
slug: tree-builder-lab
title: Tree builder lab
kind: simulator
simulator: tree-builder
minutes: 25
---
::: intro
- Make the first split of a tree yourself, and read its Gini impurity and impurity drop.
- Grow the rest of the tree, and compare training and validation accuracy at every depth.
- Predict where extra depth stops helping, then check the idea on the real penguins with a fresh sample.

Before you start: read "Splits and impurity" and "Depth and leaf size".
:::

## What the lab asks
*What do you do in the Tree builder lab?*

The two earlier lessons gave you the rule for scoring a split and the two settings that limit a tree. In this lab you run both. You make the first split yourself, then let the tree grow the rest, and then compare how it does on the points it learned from and on points it has never seen.

The lab draws 150 points in two classes. A random 100 are the **training** points, drawn as dots, and the tree learns only from them. The other 50 are the **validation** points, drawn as crosses, and they are held back to check the tree. There is no test set in this lab, only validation.

Depth is counted as in "Depth and leaf size", with one difference. Depth 1 is your first split alone, which gives 2 leaves. The lab has no depth 0, the single-leaf baseline. A deeper tree adds more questions after your first one.

The lab starts with the **Overlapping blobs** pattern. The classes overlap, so no tree can be perfect on points it has not seen.

## Making the first split
*How good is the cut you chose?*

Choose a feature and a threshold by dragging on the plot, pressing the arrow keys or using the slider. The table **Your first split** shows the class counts and Gini impurity of the whole training set, of each side, and the weighted Gini after the split. Its last row, the **Impurity drop**, is the gain from "Splits and impurity".

At the start the split is Feature 1 ≤ 3.4. The left side holds 30 training points, all Class A. The right side holds 70: 19 Class A and 51 Class B.

> Worked example: the right side has Gini 1 - (19/70)² - (51/70)² = 1 - 2962/4900 = 0.396. The weighted Gini is 30/100 × 0 + 70/100 × 0.396 = 0.277. The whole set has Gini 0.500, so the impurity drop is 0.500 - 0.277 = **0.223**.

The left side is perfectly pure, yet the cut is not the best one. The lab says so under the table: the best first split is Feature 1 ≤ 4.8, with a drop of 0.371.

[[figure:tree-builder-lab/first-split|The same 100 training points cut at the lab's start (Feature 1 ≤ 3.4) and at the best first split (Feature 1 ≤ 4.8). The best cut is not pure on the left, but both sides are nearly pure.]]

The best cut puts 52 points on its left (47 A, 5 B) and 48 on its right (2 A, 46 B). The weighted Gini is 0.129, so the drop is 0.371. A pure group of 30 does less for the total than two groups of about 50 that are each nearly pure.

## Growing the rest
*What does the tree do after your first split?*

Press **Grow the rest**. Each side of your split becomes a new, smaller problem, and the tree splits it again with the best cut it can find, as in "Splits and impurity". Two settings stop the growth. **Maximum depth** caps the questions in a row, and **Minimum leaf size** forbids a cut that leaves a leaf with too few training points. Minimum leaf size is not applied to your own first split, because you chose it.

The plot tints each leaf's region with the class it predicts. Your split is the thick line and the later splits are dashed.

[[figure:tree-builder-lab/grown-trees|The tree grown from the best first split to depth 1, 3 and 5. Each leaf is a rectangle tinted with the class it predicts. Training accuracy climbs with every level; validation accuracy climbs much less.]]

From the best first split, depth 3 gives 6 leaves, with 97% of training points and 82% of validation points right. Depth 5 gives 10 leaves and 100% training accuracy. Past depth 5 nothing changes, because every leaf is already pure and a pure group has nothing left to split.

## Two scores, one question
*What do the training and validation scores tell you?*

The chart **Training and validation accuracy against depth** draws both scores for depths 1 to 10, and the table **Accuracy at every depth** gives the same numbers. Training accuracy never falls as the tree grows. The question is whether validation accuracy follows it.

On the overlapping blobs it follows only a little. From depth 1 to depth 5, training goes from 93% to 100%, up 7 points. Validation goes from 80% to 84%, up 2 validation points out of 50.

The checker pattern, which has about 8% of its labels flipped, tells a clearer story: validation reaches 88% at depth 4 and falls to 78% at depth 7, while training reaches 100%. These numbers come from the lab's starting split. The deep tree has memorized the flipped labels.

[[figure:tree-builder-lab/depth-curves|Accuracy against maximum depth on two samples. Left: the blobs, where validation levels off at 84%. Right: the checker pattern from the lab's starting split, where validation peaks at 88% and then falls. The ring marks the best validation accuracy.]]

> Watch out: there are only 50 validation points, so one point is 2 percentage points. A move of one point is a tie, as in "Depth and leaf size". The lab's verdict says "falls" when the last depth is at least 3 points under the peak, and that is just two validation points.

## Predict, change, explain, transfer
*Why guess before you move a slider?*

Every experiment below follows the same loop. **Predict** what will happen. **Change** one thing. **Explain** the result with the ideas of this course. **Transfer** the idea to the real penguins, and check it on a fresh sample.

The lab has one **Quick Quiz** box: "Will the validation accuracy keep rising as the tree gets deeper?" Pick an answer, press **Grow the rest**, and then press **Check my prediction**. Until you check, the chart and table show the validation accuracy only for the depths you have tried, so you cannot read the answer off the chart. The box answers for your own first split and minimum leaf size, and it starts again when you change the data or press **New sample**.

A wrong guess is the useful kind. If you said validation would keep rising and it levelled off, your picture of depth was off by one idea, and the explain step is where you repair it.

> Key idea: predict first, change one thing at a time, and explain every difference between your guess and the result.

## Real penguins, fresh samples
*Does the idea hold on real data and on a new sample?*

Set **Data** to **Penguins (real data)**. The classes are now three species, and the horizontal and vertical measurements are **Flipper length** and **Bill length**. The lab draws 150 of the 342 penguins that have both chosen measurements, 100 to train and 50 to check.

On the first sample, **Jump to the best first split** gives Flipper length ≤ 206.5 mm, with an impurity drop of 0.341. Grown to depth 2, the tree gets 96% of training and 96% of validation penguins right. At depth 10 it has 11 leaves, 100% on training and 90% on validation.

**New sample** draws another 150. On each of four samples, with the best first split:

| Sample | Best validation | At depth | Validation at depth 10 | Training at depth 10 |
|---|---|---|---|---|
| First | 96% | 2 | 90% | 100% |
| Second | 92% | 3 | 90% | 100% |
| Third | 98% | 2 | 98% | 100% |
| Fourth | 92% | 3 | 90% | 100% |

The best depth was 2 or 3 every time, and deeper trees never beat it. But the size of the fall changes from sample to sample, and on one it is zero. That is the lesson of "One cut is not the whole story": read the pattern across samples, not one number.

::: deeper Why the best one-step split can start a bad tree
The lab picks the best first split by looking one step ahead. That is not always the best start. On the checker pattern the best first split is Feature 1 ≤ 9.0, with an impurity drop of only 0.027: it shaves off 5 Class A points at the right edge. Grown to depth 3 from there, the tree scores 58% on training and 50% on validation. The lab's own starting split, about Feature 1 ≤ 3.0, has a drop of only 0.005 but reaches 86% and 82% at depth 3. A greedy builder only sees the next cut, so a tiny gain now can hide a pattern that several cuts together would find.
:::

::: remember
- A split is scored by its impurity drop: the Gini before minus the weighted Gini after. The best first split is not always the one with the purest side.
- Maximum depth and minimum leaf size limit how finely the tree cuts. Training accuracy keeps rising with depth; validation accuracy levels off or falls once the extra leaves only memorize.
- Read the two scores together, treat a change of one or two validation points as a tie, and check what you find on a fresh sample.
:::

@@lab

## Lab: Grow a decision tree
You make the first split of a tree on 100 training points, then grow the rest and compare training and validation accuracy at every depth. The lab starts on generated **Overlapping blobs** (150 points, 100 to train and 50 to validate) with your first split at Feature 1 ≤ 3.4.

### Controls
- **Data** switches between **Generated data** and **Penguins (real data)**. The real data colors the points by species and has three classes.
- **Pattern** (generated data only) is **Overlapping blobs** or **Checker pattern**. The checker pattern has about 8% of its labels flipped on purpose.
- **Horizontal measurement** and **Vertical measurement** (real data only) pick two of **Bill length**, **Bill depth**, **Flipper length** and **Body mass**. They start as Flipper length and Bill length and can never be the same measurement.
- **New sample** draws a new random 150 points, or 150 penguins, and resets your first split to its starting place.
- **First split on** chooses **Horizontal feature** or **Vertical feature**. **First split threshold** is the slider for the cut, and you can also click or drag on the plot, or press the arrow keys while the plot has focus (Shift for bigger steps).
- **Jump to the best first split** moves your cut to the one with the largest impurity drop.
- **Grow the rest** lets the tree keep splitting under the two settings below. **Back to the first split only** returns to your split alone.
- **Maximum depth** (1 to 10, starts at 3) and **Minimum leaf size** (1 to 20, starts at 1) work once the tree has grown.
- **Show validation points** hides or shows the crosses.
- **Check my prediction** answers the **Quick Quiz** box and shows the validation accuracy at every depth.
- **Fullscreen** enlarges the lab. **Reset** returns to generated Overlapping blobs, the default sample, the starting split, the tree not grown and the default settings.

### Reading the screen
- The plot shows the training points as dots and the validation points as crosses. A ring around a cross marks a **Validation point the tree gets wrong**. The thick line is **Your first split**; once the tree is grown, **Later splits** are dashed. The diamond is the handle of your threshold. Each leaf's region is tinted with the class it predicts.
- The status line reads, for example, "First split: Feature 1 ≤ 3.4. Gini 0.500 before, 0.277 after: impurity drop 0.223." Below it, the detail line gives the leaves, training accuracy and validation accuracy of the tree you are looking at, and **Leaves** is shown at its right.
- The table **Your first split** has the columns **Group**, **Points**, **Class counts** and **Gini**, and the rows **All training points**, **Left** and **Right** (each followed by its rule), **After the split (weighted)** and **Impurity drop**. Under it, a line gives the best possible first split and its drop next to yours.
- The chart **Training and validation accuracy against depth** has a dashed vertical line at the depth you are looking at, with the label "depth: N". Before you check your prediction, the validation line shows only the depths you have tried. After it, the best validation depth is ringed.
- The table **Accuracy at every depth** has the columns **Depth**, **Leaves**, **Training accuracy** and **Validation accuracy**. A "?" marks a depth you have not tried.
- The **Quick Quiz** box says "Will the validation accuracy keep rising as the tree gets deeper?" with the answers **Yes, it keeps rising**, **It rises, then levels off** and **It rises, then falls**.

### Experiments
The numbers are for the default sample. Press **Reset** before each experiment so that yours match.

1. Predict: your first split at Feature 1 ≤ 3.4 has a perfectly pure left side. Will moving the cut to the right raise or lower the impurity drop? Read the table at the start: 30 points on the left (30 A, 0 B), 70 on the right (19 A, 51 B), a drop of 0.223. Now press **Jump to the best first split**, or drag the cut to about 4.8. The left side is no longer pure (47 A, 5 B, Gini 0.174), but the right is cleaner (2 A, 46 B, Gini 0.080), and the drop rises to 0.371. Explain: why does a pure group of 30 count for less than two nearly pure groups of about 50?
2. Predict: what will the training and validation accuracy be as the tree grows from your best first split? Press **Jump to the best first split**, then **Grow the rest**. At depth 3 the detail line says 6 leaves, training accuracy 97% and validation accuracy 82%. Press **Check my prediction**, then set **Maximum depth** to 5 and to 10 and read the chart and the table. Training reaches 100% at depth 5 with 10 leaves, validation tops out at 84%, and depths 6 to 10 change nothing. Explain: why does the tree stop growing at 10 leaves?
3. Predict: does the first split matter once the tree is grown? Press **Reset** and **Grow the rest** without jumping. At depth 3, your start split gives 5 leaves, 97% training and 82% validation, the same scores as the best first split. Press **Back to the first split only**: now it is 81% and 72%, against 93% and 80% for the best split. Explain: what did the later splits repair, and what would not be repaired?
4. Predict: what will raising **Minimum leaf size** do to training accuracy, validation accuracy and the number of leaves? Press **Jump to the best first split** and **Grow the rest**, set **Maximum depth** to 10, and try 1, 5 and 10. The leaves go 10, 6, 4, training accuracy 100%, 95%, 93% and validation accuracy 84%, 82%, 80%. Training falls most. Explain: the drop from 84% to 82% is one validation point out of 50, so which setting would you pick, and why?
5. Predict: on the **Checker pattern**, will validation accuracy keep rising? Set **Pattern** to **Checker pattern** and keep the starting split, press **Grow the rest**, and step **Maximum depth** from 1 to 10 before you press **Check my prediction**. Validation is 88% at depth 4 (13 leaves) and 78% at depth 7 (23 leaves), while training goes from 93% to 100%. Then set **Minimum leaf size** to 5: the validation accuracy stays at 94% from depth 4 on, and training stays at 88%. Explain: what was the deep tree memorizing? As a side trip, press **Jump to the best first split**: the drop is only 0.027. Why does a greedy first split sometimes start a bad tree?
6. Predict: on the real penguins, will validation accuracy be best at a deep tree or a shallow one? Press **Reset**, set **Data** to **Penguins (real data)**, press **Jump to the best first split** (Flipper length ≤ 206.5 mm, drop 0.341) and **Grow the rest**. Step **Maximum depth** from 1 to 10 and read the table: validation is 96% at depth 2 and 90% at depth 10, while training reaches 100%. Press **Check my prediction**. Now repeat three times: press **New sample**, press **Jump to the best first split**, then **Check my prediction**, and note the best depth and the validation score at depth 10: the best depth is 2 or 3, and depth 10 gives 90%, 98% and 90%. Does the idea survive a fresh sample, and which differences are too small to trust with 50 validation points?
