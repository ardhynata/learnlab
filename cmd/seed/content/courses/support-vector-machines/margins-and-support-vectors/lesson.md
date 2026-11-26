---
slug: margins-and-support-vectors
title: Margins and support vectors
kind: reading
simulator: ''
minutes: 15
---
::: intro
- Explain the maximum-margin idea: of all the lines that separate two classes, pick the one with the widest empty street.
- Name the support vectors, and say why only they decide where the boundary goes.
- Compute a margin by hand with the rule width = 2 / |w| on eight toy points.

Before you start: read "Probabilities and the sigmoid" and "How k-NN decides".
:::

## Many lines, one choice
*If many lines separate two classes, which one should a model pick?*

In "Probabilities and the sigmoid" a logistic regression drew a straight decision boundary. Suppose the two classes can be split cleanly by a straight line. Then there is not one such line but endless ones: slide a line a little, or tilt it, and it still separates every training point.

Those lines agree on the training data and disagree on new data. A new point that lands between the two groups falls on one side of one line and on the other side of another. Something has to break the tie.

A **support vector machine (SVM)** breaks it with one rule: choose the line that stays as far as it can from both classes. Picture the line as the center line of a street. Widen the street until its edges touch the nearest points. The line with the widest street wins. This is the **maximum-margin** idea.

[[figure:margins-and-support-vectors/many-lines|Three of the many lines that split the toy data, with street widths 2, 2 and 1.92, and the one line with the widest street, 2.83.]]

## The street and its edges
*What are the margin and the support vectors?*

The **margin** is the width of the street: the empty gap between the two classes, measured straight across, with the boundary down its middle. (Some books call half of that the margin. In this course it is the full width.)

The two sides of the street are its **edges**. The points that sit exactly on an edge are the **support vectors**. They hold the street in place, the way fence posts hold a fence. Every other point lies farther out, with empty road between it and the edge.

In the picture above, the widest street touches exactly two points, one from each class. Those two are its support vectors. A street needs at least one on each side, since each side has to be stopped by something. With more data you may get a few more; usually they are a small fraction of the points.

> Key idea: the SVM does not ask where the typical point is. It asks where the two classes come closest to each other, and puts the boundary in the middle of that gap.

## Writing a street as numbers
*How do you write a street as numbers?*

Take eight points on a grid. Class A: (1, 1), (2, 1), (1, 2) and (2, 2). Class B: (4, 4), (5, 4), (5, 5) and (4, 6).

A straight line is written `w·x + b = 0`. Here w = (w1, w2) is a pair of weights and b is an offset. The **score** `w1·x1 + w2·x2 + b` is 0 on the line, positive on one side and negative on the other. We scale w and b so that the score is -1 on A's edge and +1 on B's edge. Then the street is everything with a score between -1 and +1.

The closest A point to class B is (2, 2) and the closest B point to class A is (4, 4). That is the shortest gap between the classes, so it stops the widest street, and the two points are the support vectors. Because the closest pair stops the street, w points along the segment from (2, 2) to (4, 4), the direction (1, 1): w = (a, a).

## Solving for w and b
*What are w and b for these eight points?*

Both support vectors sit on an edge of the street, and that gives two equations.

> Worked example: the edges give 4a + b = -1 at (2, 2) and 8a + b = +1 at (4, 4). Subtracting the first from the second gives 4a = 2, so a = 0.5, and then b = -1 - 4 × 0.5 = -3. The boundary is 0.5·x1 + 0.5·x2 - 3 = 0, the line x1 + x2 = 6.

| Point | Class | Score |
| --- | --- | --- |
| (1, 1) | A | -2 |
| (2, 1) and (1, 2) | A | -1.5 |
| (2, 2) | A | -1 |
| (4, 4) | B | +1 |
| (5, 4) | B | +1.5 |
| (5, 5) and (4, 6) | B | +2 |

Only (2, 2) and (4, 4) land exactly on -1 and +1. Every other point scores beyond them, so none stands inside the street.

## The width is 2 divided by the length of w
*Why does the width depend on w alone?*

The **length of w** is written |w| and equals √(w1² + w2²). Here |w| = √(0.25 + 0.25) = 0.7071.

The rule is: **width = 2 / |w|**. In words, the score climbs by 2 from one edge (-1) to the other (+1). Walking one unit straight across the street changes the score by |w|. So the distance across is 2 divided by |w|.

> Worked example: width = 2 / 0.7071 = 2.83. Check it another way: the segment from (2, 2) to (4, 4) crosses the street at a right angle, and its length is √(2² + 2²) = 2.83. Both routes agree.

The vertical line x1 = 3 also separates the data. Its edges are x1 = 2 and x1 = 4, so |w| = 1 and the width is 2. The diagonal line is better: 2.83 beats 2.

[[figure:margins-and-support-vectors/worked-street|The worked example: the support vectors (2, 2) and (4, 4), the three lines where the score is -1, 0 and +1, and the calculation of the width.]]

> Key idea: a short w means a wide street. Looking for the widest street is the same as looking for the shortest w that keeps every point outside the street and on its own side.

::: deeper Where 2 / |w| comes from
Take a point x0 on the boundary, so its score is 0. Move from x0 straight toward class B, in the direction of w, by a distance d. The score becomes d × |w|. It reaches +1 at d = 1 / |w|. By symmetry it reaches -1 the same distance on the other side. So each half of the street is 1 / |w| wide and the whole street is 2 / |w|. In the example, 1 / 0.7071 = 1.41, which is the distance from (2, 2) to the line x1 + x2 = 6.
:::

## Only the support vectors matter
*What happens to the street when points are removed or added?*

Delete (1, 1) and (5, 5), two points that are not support vectors. The street does not move: its width is still 2.83. Nothing pressed against its edges.

Now delete the support vector (4, 4). The nearest B point to (2, 2) becomes (5, 4), at distance √(3² + 2²) = √13 = 3.61. The street gets wider and tilts, and (5, 4) is now a support vector. A point that was safely behind can take over.

Add a new B point at (3, 4), inside the old street. It is only √(1² + 2²) = √5 = 2.24 from (2, 2), so the street narrows to 2.24 and tilts the other way.

[[figure:margins-and-support-vectors/removing-points|The same data with points taken away or added. Far points change nothing, but removing or adding a point near the street moves it.]]

> Key idea: the boundary is decided by the support vectors alone. Delete every other training point and train again, and you get the same line. Move a support vector, and the line moves with it.

## How it differs from what you know
*How is this boundary different from logistic regression and k-NN?*

All three models draw a boundary, but they let different points decide it.

| Model | Boundary | Points that shape it |
| --- | --- | --- |
| Logistic regression | Straight line | All points, through the loss; far ones count little |
| k-NN | Follows the data, any shape | All stored points; the nearest ones vote on each query |
| SVM, this lesson | Straight line | The support vectors only |

Logistic regression fits one probability formula to all points at once, so even a far-off point adds a small push to the loss. k-NN keeps the whole training set, as "How k-NN decides" showed, and its boundary can bend around any single point.

The SVM looks only at the gap between the classes. That makes it a **sparse** model: a few points matter, and the rest could be thrown away without changing the answer.

::: deeper Units change the street
Width is measured in the units of the features. Stretch the second feature of the toy data by a factor of 10 and the same two points stay the support vectors, but the street becomes 20.10 wide and its boundary is almost flat. A feature on a large scale dominates the distance, just as it does in k-NN and k-means, so scale features before you fit an SVM.
:::

## What a plain street cannot do
*When does the widest street fail, and where does this course go next?*

Everything so far assumed two things: a straight line splits the classes completely, and no single point is badly placed. Real data breaks both.

If the classes overlap, no line leaves an empty street, so the maximum-margin rule has nothing to maximize. One stray point can also ruin it: adding (3, 4) cut the toy street from 2.83 to 2.24.

The next lesson fixes both problems. It lets a few points sit inside the street, or on the wrong side, at a price, and it bends the boundary with a kernel so curved class shapes become possible.

After that comes the SVM lab. There you move a support vector yourself and watch the margin change, then compare linear and RBF boundaries.

::: remember
- Many lines separate two classes. The SVM picks the one with the widest empty street, which is the maximum-margin line.
- The support vectors are the points on the street's edges. Only they decide the boundary, so removing other points changes nothing.
- The width is 2 / |w|: a shorter w means a wider street. In the toy example w = (0.5, 0.5) gives 2 / 0.7071 = 2.83.
:::
