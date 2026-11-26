---
slug: initialization-and-choosing-k
title: Starting positions and choosing k
kind: reading
simulator: ''
minutes: 15
---
::: intro
- Explain why k-means can end in different groupings from different starting centroids.
- Run several starts, and use the lowest inertia to keep the best one.
- Read an inertia-versus-k table, and say why inertia alone cannot choose k.

Before you start: read "What clustering is".
:::

## The loop in one minute
*What does k-means do, and what number does it try to make small?*

k-means groups points around **centroids**, which are the centers of the groups. You choose **k**, the number of groups, before it starts. Then it repeats two steps:

1. **Assign.** Give every point to its nearest centroid.
2. **Update.** Move each centroid to the mean of the points assigned to it.

It stops when an assign step changes nothing. The score it works to lower is **inertia**: the sum, over all points, of the squared distance from a point to its centroid. Small inertia means tight groups.

> Key idea: neither step can raise inertia, so the loop always stops. But it stops at the first stable answer it reaches, and that answer depends on where the centroids began.

This lesson is about those two choices you make before the loop runs: where the centroids start, and what k is. You run the loop itself in the next lesson, in the k-means lab.

## A tiny example to compute by hand
*How do you compute inertia with a pencil?*

Take six points on a line: 0, 1, 10, 11, 20 and 21. You can see three groups of two. Try k = 3 with starting centroids on the points 0, 10 and 20.

1. **Assign.** 0 and 1 go to the centroid at 0. 10 and 11 go to the centroid at 10. 20 and 21 go to the centroid at 20.
2. **Update.** The centroids move to the group means: 0.5, 10.5 and 20.5.
3. **Assign again.** Nothing changes, so it stops.

Inertia is the squared distances added up. In each group the two points are 0.5 from the mean, so each group adds 0.25 + 0.25 = 0.5. Three groups give 0.5 + 0.5 + 0.5 = 1.5.

Remember this number: **1.5**. It is the best inertia any three groups of these points can reach.

## When a bad start gets stuck
*Can k-means end somewhere worse, and never notice?*

Use the same points and k = 3, but start the centroids on 0, 1 and 10. Two centroids begin next to each other.

1. **Assign.** The point 0 goes to the first centroid and 1 to the second. All of 10, 11, 20 and 21 are closest to the centroid at 10.
2. **Update.** The first two centroids stay at 0 and 1. The third moves to (10 + 11 + 20 + 21) / 4 = 15.5.
3. **Assign again.** 10 is 5.5 from 15.5 but 9 from 1, so it stays. Nothing changes, so it stops.

[[figure:initialization-and-choosing-k/two-starts|The same six points and k = 3 from two starts. Rings mark the starting centroids, diamonds the final ones.]]

The result is groups {0}, {1} and {10, 11, 20, 21}. The last group adds 5.5² + 4.5² + 4.5² + 5.5² = 30.25 + 20.25 + 20.25 + 30.25 = 101, so inertia is **101**, against 1.5 from the first start. Each point already has its nearest centroid, and each centroid is already at the mean of its points, so neither step can lower inertia. The loop is not wrong. It just cannot see that a better answer exists.

## Run several starts, keep the lowest inertia
*How do you protect yourself from an unlucky start?*

Starts are cheap, so run k-means several times from different random starts and keep the run with the lowest inertia. Each run, on the same data and the same k, ends with an inertia you can compare.

| Starting centroids | Final groups | Inertia |
| --- | --- | --- |
| 0, 10, 20 | {0, 1} {10, 11} {20, 21} | 1.5 |
| 0, 1, 10 | {0} {1} {10, 11, 20, 21} | 101 |
| 0, 10, 11 | {0, 1} {10, 11} {20, 21} | 1.5 |

The third start also begins with a close pair, but it recovers: its centroid at 11 is pulled toward 20 and 21 in the first update (to 17.33), and the groups straighten out. The keeper is any run with 1.5.

> Watch out: compare inertia only between runs with the same data, the same distance and the same k. Inertia from different k should not be used to decide which run is better, since it always falls as k rises (see below).

## A smarter start: k-means++
*Can we make bad starts less likely instead of just retrying?*

The idea of **k-means++** is to spread the starting centroids out. Pick the first one from the data at random. Then pick each next one at random too, but give every point a weight equal to its squared distance to the nearest centroid already chosen. Far points get large weights, so they are likely picks. Points sitting right next to a chosen centroid get almost none.

Say the first centroid is the point 0. The squared distances of 1, 10, 11, 20 and 21 are 1, 100, 121, 400 and 441, which add up to 1063. The chance of picking 21 is 441 / 1063, about 41.5%, and of picking 1 is 1 / 1063, about 0.09%. Picking blindly gives each of the five points 20%.

[[figure:initialization-and-choosing-k/plusplus-weights|The chance each point becomes the second centroid when the first is at 0: blind random pick against k-means++.]]

k-means++ makes a close-pair start rare, but it is still random and it does not promise the best answer. Many tools use it by default and also run several starts.

## Inertia always falls as k rises
*Why can't the lowest inertia choose k for you?*

More centroids always means points sit closer to one. Take the best grouping for each k on the six points:

| k | 1 | 2 | 3 | 4 | 5 | 6 |
| --- | --- | --- | --- | --- | --- | --- |
| Inertia | 401.5 | 101.5 | 1.5 | 1 | 0.5 | 0 |

With k = 6 every point is its own centroid, so every distance is 0 and inertia is 0. That is a perfect score for a useless answer: it describes nothing. So you cannot pick the k with the smallest inertia. You need a different rule.

The k = 1 value is easy to check: the mean of all six points is 10.5, and the squared distances are 110.25 + 90.25 + 0.25 + 0.25 + 90.25 + 110.25 = 401.5.

## The elbow and other ways to choose
*How do you pick k when a smaller inertia is always on offer?*

Plot inertia against k and look for the **elbow**, where big drops give way to small ones. Here inertia falls by 300 from k = 1 to 2 and by 100 from 2 to 3, then by only 0.5 from 3 to 4. The bend is at k = 3, which matches the three groups you can see.

[[figure:initialization-and-choosing-k/elbow|Inertia for k = 1 to 6 on the six points. After k = 3 the line is almost flat.]]

Real data is messier, and the bend can be gentle or missing. Then lean on two other checks:

- **Domain sense.** If you are making delivery zones for four vans, k = 4 may be right, whatever the curve says.
- **Usefulness.** Look at the groups. If two of them look alike to a person, k is probably too big.

A score called the **silhouette** can also compare values of k. You meet it in the course on cluster shapes and evaluation.

## Take it to the lab
*What should you watch for when you run k-means yourself?*

In the next lesson you run k-means step by step in the k-means lab. You will see the same things as here, on a plot where you can drag the centroids:

- Run the same data from different starting centroids and compare the final inertia, as in the table above.
- Change k and watch how inertia moves. Ask yourself where the elbow would be.
- When two runs disagree, keep the one with the lower inertia, then check by eye that its groups make sense.

::: deeper Why the bad start stays stuck
At the stuck answer, the assign step gives every point its nearest centroid, so no single point wants to move. The update step puts each centroid at the mean of its points, which is the best spot for them. Both steps are already as good as they can be, so inertia cannot fall further. A better answer exists (1.5), but reaching it means moving a centroid across a gap, and neither step does that. This is what a **local optimum** is: the best answer in the neighborhood, not the best overall.
:::

::: remember
- k-means stops at a stable grouping that depends on the starting centroids, and different starts can give very different inertia (1.5 against 101 here).
- Run several starts, or use k-means++ to spread them out, and keep the lowest inertia for the same k.
- Inertia always falls as k rises, so choose k with the elbow, domain sense and a look at the groups.
:::
