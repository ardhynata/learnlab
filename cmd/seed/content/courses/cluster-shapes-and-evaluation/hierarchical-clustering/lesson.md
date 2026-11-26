---
slug: hierarchical-clustering
title: Hierarchical clustering
kind: reading
simulator: ""
minutes: 20
---
::: intro
- Run agglomerative clustering by hand on five points, merging the two closest clusters each time.
- Compare single, complete, average and Ward linkage, and say what each one favours.
- Read a dendrogram and cut it to get k clusters.

Before you start: read "What clustering is" and "k-means, step by step".
:::

## Merging instead of centering
*What if you did not have to choose k before you start?*

k-means begins with a choice, the number of clusters k, and then moves centers around. **Agglomerative hierarchical clustering** begins somewhere else: every point is its own cluster. Then it repeats one rule:

1. Find the two clusters that are closest to each other.
2. Merge them into one cluster.

It stops when a single cluster holds every point. With n points that takes n - 1 merges. Nothing is random, so the same data and the same settings always give the same result.

The answer is not one grouping but the whole **merge history**. You pick the number of clusters afterward, by deciding how far back in the history to look. ("Agglomerative" means "gathering together". A top-down version that starts with one big cluster and splits it also exists, but this lesson only uses the bottom-up kind.)

One piece is missing. Once a cluster holds several points, what does "closest" mean? The next section answers that.

## Linkage: the distance between two clusters
*How far apart are two groups of points?*

The distance between two points is familiar. The distance between two *groups* needs a rule, called the **linkage**. Four are common:

- **Single:** the distance of the closest pair, one point from each group.
- **Complete:** the distance of the farthest pair.
- **Average:** the mean of the distances over all pairs.
- **Ward:** merge the pair of clusters that adds the least to the total squared distance of points from their own cluster center. This is the same quantity k-means calls inertia.

[[figure:hierarchical-clustering/linkage-distances|The same two groups of three points, measured four ways. The bold line is the pair each rule uses; Ward uses the two centers instead.]]

> Key idea: the linkage is a choice you make, and different linkages can merge the same points in a different order. The rule for a single point pair is always the same ordinary distance; only the way a group is summarized changes.

Single and complete are the two extremes of the same idea: one looks at the nearest members, the other at the farthest. Average sits between them.

## Five points by hand
*Can you run the merging with a pencil?*

Take five points on a line: A = 0, B = 1, C = 3, D = 7 and E = 12. The distances between every pair are:

| | A | B | C | D | E |
|---|---|---|---|---|---|
| A | 0 | 1 | 3 | 7 | 12 |
| B | 1 | 0 | 2 | 6 | 11 |
| C | 3 | 2 | 0 | 4 | 9 |
| D | 7 | 6 | 4 | 0 | 5 |
| E | 12 | 11 | 9 | 5 | 0 |

> Worked example: single linkage. (1) The smallest entry is A-B = 1, so merge them. (2) The distance from {A, B} to C is the smaller of 3 and 2, which is 2. That beats C-D = 4 and D-E = 5, so C joins at 2. (3) {A, B, C} to D is the smallest of 7, 6 and 4, which is 4, below D-E = 5, so D joins at 4. (4) {A, B, C, D} to E is the smallest of 12, 11, 9 and 5, which is 5. Merges at 1, 2, 4, 5.

Complete linkage uses the largest entry instead. {A, B} to C is the larger of 3 and 2, which is 3. Then {A, B, C} to D is 7, but D-E is only 5, so D and E merge at 5. The last merge is the largest of six distances, 12. Merges at 1, 3, 5, 12.

[[figure:hierarchical-clustering/merge-sequence|The clusters after each merge. The same first two merges (at different distances, 2 and 3); from merge 3 on, the groups differ.]]

## The dendrogram
*How do you draw the whole merge history?*

A **dendrogram** (a tree diagram) draws the history on one page. The points sit along the bottom. Each merge is a horizontal bar, drawn at the height equal to the distance where the merge happened, with a vertical line down to each of the two clusters it joined.

[[figure:hierarchical-clustering/dendrograms|The dendrograms of the five points. Left: single linkage grows a staircase. Right: complete linkage joins A, B, C and D, E first, then makes one long final merge.]]

The two trees show the difference in the table. Single linkage added one point at a time to the same growing cluster, which makes a staircase. Complete linkage built two small groups and joined them only at the end, at 12.

> Watch out: read a dendrogram by height, not by sideways distance. Two points (the points at the bottom are called leaves) are close if the bar that first joins them is low. The left-to-right order only keeps lines from crossing, and a point drawn next to another is not necessarily its nearest neighbor.

## Cutting the tree
*How do you get k clusters out of a dendrogram?*

To get clusters, draw a horizontal line across the tree and look at the branches it crosses. Each branch is one cluster, made of the points under it. This is **cutting** the dendrogram.

On the complete-linkage tree, whose merges are at 1, 3, 5 and 12:

- Cut at 0.5: no merge is below the line, so there are 5 clusters.
- Cut at 4: merges at 1 and 3 are below it, giving 3 clusters: {A, B, C}, {D} and {E}.
- Cut at 8: merges at 1, 3 and 5 are below it, giving 2 clusters: {A, B, C} and {D, E}.
- Cut above 12: 1 cluster.

Each merge below the line removes one cluster, so the count is n minus the number of merges below the cut.

A useful hint for where to cut is the **longest stretch with no merge**. In the complete tree nothing happens between heights 5 and 12, so cutting anywhere in that gap gives two clusters, which is the most natural answer here. The single-linkage tree has bars at 1, 2, 4, 5 and no long gap, so it gives no such hint. Cutting it at 4.5 would give {A, B, C, D} and {E}.

> Watch out: a long gap is a hint, not a proof. To compare cuts with a number, you will use the silhouette score in the next lesson.

## What each linkage favours
*Which linkage suits which shapes?*

Each rule builds in a taste for certain shapes. Following one nearest pair lets **single** linkage creep along a thin, winding group, and it also lets it chain through a bridge of stray points. Looking at the farthest pair makes **complete** linkage keep clusters compact.

| Linkage | Favours | Weak spot |
|---|---|---|
| Single | Long, thin or curved groups | Chaining: a bridge or stray point joins clusters |
| Complete | Compact clusters of similar width | A single far point inflates the distance |
| Average | A middle path between the two | Still prefers compact groups |
| Ward | Round clusters of similar size, like k-means | Cuts curved shapes across |

[[figure:hierarchical-clustering/linkage-shapes|Each tree cut at 2 clusters. Row one: two crescents. Row two: two blobs with a bridge of four points between them.]]

In the figure, single linkage finds both crescents (20 and 20 points), while complete and Ward cut across them (30 and 10, and 26 and 14). With the bridge it flips: single linkage chains along it and ends with 39 points against 1, while complete and Ward cut the bridge in the middle and give 20 and 20.

## Limits, and what comes next
*When is hierarchical clustering the wrong tool?*

- **Size.** It needs a distance for every pair of points, about n x (n - 1) / 2 numbers. With 10,000 points that is roughly 50 million. It suits hundreds or a few thousand points, not millions.
- **No undo.** A merge is final. If an early merge is wrong, every later one builds on it.
- **Scale.** Distances decide everything, so scale the features first, as for k-means.
- **You still choose.** The tree postpones the choice of k. It does not remove it.

You now have two ways of clustering with different tastes: k-means likes round clusters around centers, and hierarchical clustering gives a tree with a linkage-shaped taste. The next lessons add a score for comparing groupings and a density-based method, and the Cluster methods lab lets you compare the methods on blobs, rings and clusters of unequal density.

::: deeper Ward by hand on the same five points
Ward merges the pair whose merge adds the least to the total squared distance from each point to its cluster mean. For two clusters with n1 and n2 points and means m1 and m2 the added amount is n1 x n2 / (n1 + n2) x (m1 - m2)^2.

On A = 0, B = 1, C = 3, D = 7, E = 12: A and B cost 1 x 1 / 2 x 1 = 0.5, B and C cost 2, D and E cost 12.5, so A and B merge. Then C joins {A, B} (mean 0.5) at 2 x 1 / 3 x 2.5^2 = 4.17, cheaper than D-E at 12.5. Then D and E merge at 12.5. The last merge, {A, B, C} with {D, E}, costs 3 x 2 / 5 x (9.5 - 1.33)^2 = 80.03. The numbers are not distances, but the order of merges is Ward's choice.
:::

::: deeper The cost of the plain method
Looking through every pair of clusters at every merge costs roughly n x n per merge, so about n x n x n in all. Smarter bookkeeping lowers the time, but the table of pair distances still grows with n x n, which is the real limit.
:::

::: remember
- Agglomerative clustering starts with every point alone and repeatedly merges the two closest clusters.
- The linkage (single, complete, average, Ward) defines "closest" and shapes the result.
- A dendrogram records the merges by height; cutting it at one height gives k clusters.
:::
