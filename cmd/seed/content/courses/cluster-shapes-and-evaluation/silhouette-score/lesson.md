---
slug: silhouette-score
title: The silhouette score
kind: reading
simulator: ''
minutes: 15
---
::: intro
- Compute a point's silhouette from its two average distances, a and b.
- Read a value between -1 and 1, and the average silhouette of a whole grouping.
- Use the average to compare values of k, and name three limits it has.

Before you start: read "k-means, step by step" and "Hierarchical clustering".
:::

## Scoring a grouping without labels
*How can you tell that a set of clusters is any good?*

k-means and hierarchical clustering both hand back groups, and neither says whether the groups are good. With labeled data you could count right answers. Clustering has no labels, so the score has to look only at the points and the groups.

Inertia, from the k-means lesson, is one such score. It has a flaw: it falls every time k grows, so it cannot tell you where to stop.

The **silhouette score** asks each point one question: are you closer to your own cluster, or to another one? A point that is closer to its own cluster is well placed. A point that is closer to a neighboring cluster is probably in the wrong place. Averaging the answers over all points scores the whole grouping.

It needs only the points and their cluster labels. You can score any method's result, including k-means, a cut of a dendrogram, or DBSCAN, which comes next.

## Two distances for every point
*Which two averages does a point need?*

Pick one point, P, and measure two mean distances.

- **a** is the mean distance from P to the other points in its own cluster. A small a means P sits snugly among its mates.
- **b** is the mean distance from P to the points of the nearest other cluster. For each other cluster, average the distances from P to that cluster's points; b is the smallest of those averages. A large b means the closest outsiders are far away.

[[figure:silhouette-score/a-and-b|For the highlighted point, solid lines go to its own cluster (their mean is a) and dashed lines to the nearest other cluster (their mean is b).]]

The silhouette of P combines them:

```
s = (b - a) / max(a, b)
```

`max(a, b)` is whichever of the two is larger. Dividing by it removes the units, so measuring in meters or in centimeters gives the same s.

> Key idea: "nearest other cluster" means the cluster with the smallest mean distance from P, not the one that owns the single closest point.

## Reading the value
*What do -1, 0 and 1 mean?*

Every s lies between -1 and 1.

| s is | Meaning |
|---|---|
| close to 1 | a is much smaller than b: P is far closer to its own cluster than to any other. |
| close to 0 | a and b are about equal: P sits on the border between two clusters. |
| below 0 | a is larger than b: P is, on average, closer to another cluster than to its own. It is probably in the wrong cluster. |

A negative value is a warning about one point, not about the whole grouping. Listing the points with the lowest s shows which ones the method placed badly.

For the average over all points, rough rules of thumb are: above about 0.5, the groups stand apart clearly; below about 0.25, they barely do. These are guides, not laws.

::: deeper Why the score stays between -1 and 1
If a is smaller than b, then max(a, b) = b and s = (b - a) / b = 1 - a/b. Since a is at least 0, this lies between 0 and 1, and it reaches 1 only when a = 0. If a is larger than b, then max(a, b) = a and s = b/a - 1, which lies between -1 and 0. If a equals b, the top is 0 and so is s.
:::

## One point by hand
*How do you get s for a single point?*

Take six points on a number line, in two clusters: A = {1, 3, 5} and B = {8, 9, 10}. The distance between two numbers is how far apart they are, such as |5 - 8| = 3. Start with the point 5.

1. **a.** Its mates in A are 1 and 3, at distances 4 and 2. So a = (4 + 2) / 2 = 3.
2. **b.** The only other cluster is B, at distances 3, 4 and 5. So b = (3 + 4 + 5) / 3 = 4.
3. **s.** s = (4 - 3) / max(3, 4) = 1/4 = 0.25.

[[figure:silhouette-score/six-points|For the point 5: arcs above go to its own cluster (a = 3), arcs below go to cluster B (b = 4), so s = 0.25.]]

## All six points
*What does s look like for every point?*

Doing the same for every point gives:

| Point | a | b | s |
|---|---|---|---|
| 1 | (2 + 4) / 2 = 3 | (7 + 8 + 9) / 3 = 8 | 5/8 = 0.625 |
| 3 | (2 + 2) / 2 = 2 | (5 + 6 + 7) / 3 = 6 | 4/6 = 0.667 |
| 5 | 3 | 4 | 0.25 |
| 8 | (1 + 2) / 2 = 1.5 | (7 + 5 + 3) / 3 = 5 | 3.5/5 = 0.7 |
| 9 | (1 + 1) / 2 = 1 | (8 + 6 + 4) / 3 = 6 | 5/6 = 0.833 |
| 10 | (2 + 1) / 2 = 1.5 | (9 + 7 + 5) / 3 = 7 | 5.5/7 = 0.786 |

The point 5 is the weakest because it sits at the edge of A, nearest to B. Its s is still positive: it is closer to A on average.

## The average, and choosing k
*How does one number per point become a way to pick k?*

The **average silhouette** is the mean of s over all points. For the six points above it is (0.625 + 0.667 + 0.25 + 0.7 + 0.833 + 0.786) / 6, about 0.64.

To choose k, cluster the data with each k you want to try, compute the average silhouette for each, and prefer the k with the highest value. Unlike inertia, the average can fall when k grows too large, so it has a peak.

> Worked example: split the same six points into three clusters, {1, 3}, {5, 8} and {9, 10}. Now the point 8 has a = |8 - 5| = 3 but b = (1 + 2) / 2 = 1.5, so s = (1.5 - 3) / 3 = -0.5: it sits with a mate that is farther than the cluster next door. The six values are 0.636, 0.429, 0, -0.5, 0.6 and 0.714, and their average is about 0.31. That is lower than 0.64, so k = 2 is the better choice.

[[figure:silhouette-score/score-by-k|Average silhouette of k-means on 150 points drawn from three round blobs. It peaks at k = 3 (0.80) and falls on both sides.]]

> Watch out: the highest average is a suggestion. Look at the clusters too, and ask whether the groups mean anything for your problem.

## What the score cannot see
*When does a low or undefined silhouette mislead?*

- **It favors round clusters.** a is a mean distance to every mate, so a long ring or crescent has points far from their own mates even when the grouping is right. In the figure below, the two true rings score 0.01, while k-means cutting them across scores 0.36.
- **It needs at least two clusters.** With one cluster there is no other cluster, so b does not exist and s is undefined. The score cannot tell you that the data has no clusters at all.
- **Noise has no cluster.** DBSCAN, the next lesson, labels isolated points as noise. A noise point has no cluster of its own, so it has no a. A common choice is to leave these points out of the score; if you do, report how many you dropped.

One caution beside these three limits: like k-means, the score is built from distances, so features that are not scaled distort it.

[[figure:silhouette-score/rings-limit|The same 150 points in two rings. The true grouping scores 0.01. k-means with k = 2 cuts across the rings and scores 0.36.]]

::: deeper Single-point clusters and cost
A cluster with one point has no mates, so a is undefined. The usual convention is to give that point s = 0. Computing every s needs the distance from each point to every other, about n times n distances for n points, so the score gets slow on very large datasets.
:::

## Using it well
*What do you do with a silhouette score in practice?*

Treat the silhouette as a second opinion. First look at the clusters. Then ask the score: which k separates the groups best, which points sit on a border, and does a rival method do better?

It measures compact, well-separated groups. A high score says the groups are tight and apart, not that they are the groups you wanted. A low score on a ring, a crescent or a lot of noise may mean the method is right and the score is the wrong ruler.

After DBSCAN, the cluster methods lab puts several methods on the same data. Compare their results by eye, and use a score like the silhouette to back up what you see, not to replace it.

::: remember
- A point's silhouette is s = (b - a) / max(a, b), with a the mean distance to its own cluster and b the mean distance to the nearest other cluster.
- Near 1 means well placed, near 0 means on a border, below 0 means probably in the wrong cluster. The average over all points compares values of k.
- It favors round clusters, is undefined for one cluster, and has no meaning for noise points, so use it beside the picture.
:::
