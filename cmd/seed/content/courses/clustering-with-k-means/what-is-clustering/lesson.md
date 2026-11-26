---
slug: what-is-clustering
title: What clustering is
kind: reading
simulator: ''
minutes: 15
---
::: intro
- Explain how clustering differs from supervised learning, and what a cluster is.
- Compute the distance between two points by hand and use it to group six points.
- Say why units and scale change which points count as close.

Before you start: read "Supervised, unsupervised and the three questions" and "Distance and similarity".
:::

## Grouping without labels
*What do you do when a table has no label column?*

In supervised learning every row comes with an answer, such as a species name, and the model learns to predict it. **Unsupervised** learning has no answer column. You hold a table of measurements and ask a looser question: do these rows fall into natural groups?

**Clustering** is the most common answer. A clustering method reads the features and gives every row a group.

Imagine bill measurements of penguins whose species nobody wrote down. You cannot ask "which species?", because there is nothing to learn from. You can still ask "which penguins look alike?". People use the same idea to split customers into segments, to compress images, or just to explore a table before building a model.

[[figure:what-is-clustering/no-labels|The same 24 real penguins twice: first as the method receives them, with features only, then with the two groups it proposes.]]

## What a cluster is
*What does it mean for points to belong together?*

A **cluster** is a set of points that are more alike than they are like the rest. To make "alike" a number, we use distance: members of a cluster are close to each other and farther from other clusters.

Three things follow.

- **Group numbers are only names.** "Group 1" and "group 2" could swap places and nothing would change. The method does not know what a group means. You find that out by looking at its members.
- **A cluster is not a class.** A class is a label someone wrote down. A cluster is a group a method proposes, and it may or may not match any label you would have chosen.
- **There is no answer key.** A clustering is useful or not; it is not right or wrong.

> Key idea: a clustering is a proposal built from distances. You judge it by whether it is useful and stable, not by whether it matches a hidden truth.

::: deeper Three families of methods
Methods differ in the rule that turns distances into groups. **Centroid-based** methods such as k-means keep k centers (k is the number of groups you ask for) and attach every point to the nearest one. **Density-based** methods such as DBSCAN grow a cluster through crowded regions. **Hierarchical** methods merge the two closest groups, again and again. This course covers k-means; a later course compares the others.
:::

## Distance again
*How do we turn "alike" into a number?*

You met distance in k-NN. For two points with two features, the Euclidean distance is the length of the straight line between them. Take the gap in each feature, square both gaps, add them, and take the square root:

distance = square root of ((x1 − x2)² + (y1 − y2)²)

Clustering uses distance as k-NN does, with one change: nothing is labeled. It measures between unlabeled points, and between a point and the **centroid** of a group, which is the average of the group's points, feature by feature.

Every clustering method needs three ingredients.

1. **Features** that describe each point.
2. **A distance** that says how alike two points are.
3. **A grouping rule** that turns distances into groups.

Change the distance and "close" changes with it, so the same data can group differently.

## A tiny example by hand
*Can you group six points with only a pencil?*

Six real penguins, with bill length and bill depth in millimeters:

| Penguin | Bill length | Bill depth |
| --- | --- | --- |
| A | 39.1 | 18.7 |
| B | 39.5 | 17.4 |
| C | 40.3 | 18.0 |
| D | 46.1 | 13.2 |
| E | 48.7 | 14.1 |
| F | 50.0 | 15.2 |

> Worked example: distance from A to B. The gaps are 39.5 − 39.1 = 0.4 and 17.4 − 18.7 = −1.3. Squares: 0.16 and 1.69. Their sum is 1.85, and the square root is about 1.36.

The same steps give A to C = 1.39, A to D = 8.90, A to E = 10.65 and A to F = 11.45.

[[figure:what-is-clustering/tiny-example|Six real penguins and their distances from A. B and C are close to A; D, E and F are far away.]]

Two points are near A and three are far. That suggests the groups {A, B, C} and {D, E, F}. Check all pairs: the longest distance inside a group is D to F, 4.38. The shortest distance between groups is C to D, 7.53. Every pair inside a group is closer than every pair that crosses.

## Centers and the border
*How do you place a new point, and what if it sits between groups?*

Summarize each group by its center. For {A, B, C}, bill length is (39.1 + 39.5 + 40.3) / 3 = 39.63 and bill depth is (18.7 + 17.4 + 18.0) / 3 = 18.03. For {D, E, F} the center is (48.27, 14.17).

Each penguin is nearer its own center. A is 0.85 from the first center and 10.23 from the second. No penguin is more than 2.37 from its own center, and none is closer than 8.07 to the other.

Now add a seventh real penguin, G, with bill length 43.5 and depth 15.2. Its distance to the first center is 4.79 and to the second is 4.88.

> Watch out: G is almost on the border. It joins group 1 by less than 0.1 mm, and a small change in a measurement or in the distance could flip it. Real data always has points like G, and this is where methods disagree.

## Units decide who is close
*Why can one column take over the distance?*

Distance adds up gaps from different features, so the feature with the biggest gaps dominates. Take two real penguins: penguin X has a 195 mm flipper and weighs 4675 g, and penguin Y has a 211 mm flipper and weighs 4500 g. The gaps are 16 mm and 175 g.

> Worked example: in grams, the distance is the square root of 16² + 175² = 256 + 30625 = 30881, which is about 175.7. Mass decides almost everything. Write the mass in kilograms and the gap is 0.175, so the distance is the square root of 256 + 0.03, about 16.0. Now flipper length decides.

[[figure:what-is-clustering/units-matter|The same two penguins with mass in grams and in kilograms, drawn at equal scale on both axes. Only the unit changed.]]

In the example above, both columns were in millimeters, so neither was swamped by the other.

> Watch out: scale features before you cluster, for example by standardizing them. The lesson "Scaling and encoding" shows how.

## Judging a result without an answer key
*What can you check when there is no score to match?*

- **Look at it.** With two or three features, plot the groups. If they look wrong to your eye, they probably are.
- **Rerun it.** Start from a different random start (a different seed), or resample the rows. Groups that keep reappearing are more trustworthy than groups that shuffle every time.
- **Ask whether it is useful.** Do the groups mean something to a person who knows the data?
- **Do not trust it blindly.** Every method returns groups, even for pure random noise.

::: deeper Inertia and the silhouette
**Inertia** is the total squared distance from each point to the center of its cluster. Lower means tighter, but it always falls as you add clusters, so it only compares runs with the same number of clusters.

The **silhouette** of a point compares a, its average distance to its own cluster, with b, its average distance to the nearest other cluster: (b − a) divided by the larger of the two. It runs from −1 to 1. Near 1 means well separated, near 0 means on a border, and below 0 means probably in the wrong cluster.
:::

## What comes next
*Where do these ideas lead in this course?*

You now have the pieces: points described by features, a distance, and a center that summarizes a group. The centers-and-nearest rule from the previous sections is the heart of **k-means**. It starts with k guessed centers (k is the number of groups you ask for), sends every point to the nearest one, moves each center to the middle of its points, and repeats.

The next lesson looks at where those guesses come from and how to choose the number of groups. Then you run the loop yourself in the k-means lab and watch points attach to their nearest centroid while the centers move. At the end of the course you reveal the hidden species and compare them with the clusters.

::: remember
- Clustering groups unlabeled points using features, a distance and a grouping rule.
- A cluster is a proposal, not a class: judge it by looking, rerunning and usefulness, not by an answer key.
- Distance depends on units, so put features on one scale first.
:::
