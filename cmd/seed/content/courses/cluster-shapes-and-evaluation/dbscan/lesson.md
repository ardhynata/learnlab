---
slug: dbscan
title: DBSCAN and density
kind: simulator
simulator: dbscan
minutes: 25
---
::: intro
- Sort points into core, border and noise from the two DBSCAN settings, ε and MinPts.
- Predict how ε and MinPts change the number of clusters and noise points, then check it in the dbscan lab.
- Explain why one ε struggles when a tight group sits next to a loose one.

Before you start: read "Hierarchical clustering" and "The silhouette score".
:::

## Clusters as crowded places
*What if a cluster is a crowd instead of a center?*

In "k-means, step by step" a cluster was a center with the points nearest to it, and you chose k before you started. DBSCAN uses a different picture. A cluster is a **crowded place**: a region where points are packed together, with sparse space around it. A point alone in sparse space is **noise**, and it belongs to no cluster.

Two things follow. You do not choose the number of clusters, because it falls out of how many crowds the data has. And a crowd can have any shape. The lab's **Two moons** dataset has two crescents. k-means cuts across them; DBSCAN follows each crescent, and with the lab's default 80 points and MinPts of 4 it finds exactly two clusters and no noise for any ε from about 0.41 to 1.11.

The price is two settings that you do have to choose, and the next section names them.

## Two settings, three kinds of point
*What does it take to call a point crowded?*

- **ε** (epsilon) is a radius. The **ε-neighborhood** of a point is every point within ε of it, **including the point itself**.
- **MinPts** is how many points a neighborhood needs before it counts as crowded.

Every point then gets one of three types.

| Type | Definition |
| --- | --- |
| **Core** | Its ε-neighborhood has at least MinPts points |
| **Border** | Not core, but inside the neighborhood of a core point |
| **Noise** | Neither core nor border |

[[figure:dbscan/kinds|Uneven density at ε 0.8 and MinPts 4. A has 6 points inside its circle, so it is core. B has 3, but A's circle holds it, so it is border. C has 2 and nothing reaches it, so it is noise.]]

> Key idea: core points are the skeleton of a cluster, border points hang off its edge, and noise belongs nowhere.

Counting the point itself matters. With MinPts = 4, a point with three other points inside ε has four in its neighborhood, so it is core.

## How a cluster grows
*What does the algorithm do, one point at a time?*

DBSCAN looks at one point at a time and keeps a queue of points to visit.

1. Take an unvisited point and count its neighborhood.
2. If it is not core, mark it noise for now and move on.
3. If it is core, start a **new cluster**. Put every neighbor in the queue.
4. Take points off the queue and give each the cluster's label. When a queued point is core, add *its* neighbors to the queue too.
5. When the queue is empty, the cluster is complete. Pick the next unvisited point.

A cluster is everything you can reach by hopping from core point to core point, plus the border points those cores touch. This is why a long thin crescent is one cluster: each core point passes the cluster on to the next.

In the dbscan lab, each **Next step** is one point, and the status line tells you which of these moves just happened.

## A worked example
*Can you sort eight numbers into clusters with a pencil?*

Take eight points on a line: 1.0, 1.5, 2.0, 2.4, 3.2, 5.0, 9.0 and 9.2, with ε = 1 and MinPts = 3. For each point, count the values within 1 of it.

[[figure:dbscan/hand-example|Each number is counted with itself. The bracket shows the neighborhood of 2.4, which holds 1.5, 2.0, 2.4 and 3.2.]]

> Worked example: 1.0 has 1.0, 1.5 and 2.0 within 1, so 3 points: core. 1.5, 2.0 and 2.4 each have 4: core. 3.2 has only 2.4 and itself, so 2: not core, but it is inside the neighborhood of core point 2.4, so it is a border point. 5.0 has 1 point: noise. 9.0 and 9.2 are within 1 of each other, so 2 each, below 3: noise.

The result is one cluster, {1.0, 1.5, 2.0, 2.4, 3.2}, and three noise points. Now set MinPts to 2. 9.0 and 9.2 each have 2 points and become core, so they form a second cluster, and 3.2 becomes core as well. 5.0 is still noise.

::: deeper Noise can change its mind
A point is often marked noise early, because the run has not yet reached the crowd beside it. When a later cluster reaches it through a core point, the point is relabeled as a border point. Only noise left at the end is truly noise. The lab shows this: its experiment 4 sends you to a point that is marked noise at step 41 and becomes a border point at step 65.
:::

## Choosing ε and MinPts
*How do you tune two settings when there are no labels?*

Tune by watching the cluster and noise counts as you move one setting. The picture shows ε on the lab's **Rings and outliers** data with MinPts 4.

[[figure:dbscan/radius-sweep|Rings and outliers at four radii. Too small leaves only noise, 1.0 finds only the inner ring, 1.35 finds both rings, and 2.5 merges them.]]

The outer ring is longer, so its points sit farther apart and need a larger ε. The four noise points at 1.35 are the isolated corner points.

- **ε.** Too small and almost nothing is crowded: at 0.3 all 80 points are noise. Too large and clusters merge: at 2.5 the two rings become one. Between them lies a **working range**, the ε values that give 2 clusters and almost no noise. For these rings it runs from about 1.26 to 1.95, so 1.35 is inside it, but close to the low end.
- **MinPts.** Larger values are stricter. Four is a common start for two features. A rule of thumb is at least the number of features plus one, or twice the number of features, which gives 4 for two features.
- **Scale first.** ε is one radius for every feature, so features must share a scale. Otherwise the feature with the biggest numbers decides the neighbors.

ε values do not transfer between labs, because each lab has its own data scale and points. Always tune ε on the data in front of you.

::: deeper A k-distance plot for ε
For each point, compute the distance to its MinPts-th nearest neighbor, then sort those distances and plot them. The curve stays low inside clusters and jumps where the outliers begin. An ε near that elbow is a good first guess.
:::

## When density varies
*Why does one ε struggle with a tight group beside a loose one?*

ε is one radius for the whole plot. If one group is packed tightly and another is spread out, no single radius may suit both. Look at the **Uneven density** dataset, whose left group is packed tight and whose right group is loose.

[[figure:dbscan/uneven-density|Uneven density with MinPts 4. Top: three radii on 80 points. Bottom: how many clusters each radius finds, for 80 points and for 30.]]

At ε 0.5 the dense group is a cluster but all 36 other points are noise. At 1.7 the gap between the groups is crossed and they merge. The working range, with 2 clusters and at most 6 noise points, runs from about 0.77 to 1.64.

Now thin the data. With 30 points the loose group is sparser, so ε 1.0 finds one cluster and 13 noise points, and the working range moves to about 1.27 to 1.91 and narrows. The more the densities differ, the smaller the range, until it can vanish.

> Watch out: DBSCAN also weakens with many features, because distances in many dimensions all look alike.

::: deeper Border points depend on order
A border point that touches two clusters goes to whichever cluster reaches it first, so the result can depend on the order the points are visited. A plain implementation also compares every pair of points, which is slow on very large data without a spatial index.
:::

## A real dataset
*What happens when real groups touch?*

The dbscan lab uses generated points only, so this section is a reading. It runs the same algorithm on the 342 penguins that have both a flipper length and a body mass. Flipper has mean 200.9 mm and standard deviation 14.0, and mass has mean 4201.8 g and standard deviation 800.8, so grams would swamp millimeters. Both are standardized first, and MinPts is 4.

| ε | Clusters | Noise points | Cluster sizes |
| --- | --- | --- | --- |
| 0.20 | 3 | 39 | 187, 102, 14 |
| 0.22 | 2 | 30 | 190, 122 |
| 0.25 | 1 | 20 | 322 |

The species column was not used to cluster. At ε = 0.22, one cluster holds 110 Gentoo plus 4 Adelie and 8 Chinstrap penguins. The other holds 132 Adelie and 58 Chinstrap. DBSCAN found Gentoo against the rest, not three species, which suggests the Adelie and Chinstrap crowds touch. Radii that differ by 0.03 give different answers, which is the working-range problem on real data.

Noise points belong to no cluster, so "The silhouette score" leaves them out when it scores a clustering; report how many were dropped. "Choosing a clustering method" then puts DBSCAN beside k-means and hierarchical clustering.

::: remember
- DBSCAN grows clusters through crowded neighborhoods. You choose ε and MinPts, not the number of clusters.
- A core point has at least MinPts points within ε, itself included. Border points touch a core point, and noise touches none.
- Tune ε by watching cluster and noise counts. The working range narrows when densities differ, and groups that touch may never separate.
:::

@@lab

## Lab: grow clusters through density
The lab starts with 80 points of **Rings and outliers**, with ε at 1.35 and MinPts at 4. Nothing is clustered until you press **Run** or **Next step**. Each step checks one point, and the status line says what happened to it.

### Controls
- **Run** plays the algorithm. It changes to **Pause** while it plays and to **Run again** when it is done. **Previous step** and **Next step** move one point back or forward. **Speed** has a slider and a box with a × after it; the far right end of the slider is **Instant**.
- **Dataset** picks **Rings and outliers**, **Two moons** or **Uneven density**.
- **Number of points** (1 to 1000, starts at 80) sets how many points there are. **Randomize points** draws the same shapes with new jitter.
- **Neighborhood radius (ε)** starts at 1.35 and **Minimum points (MinPts)** at 4. MinPts includes the point being checked. Changing either one, **Dataset** or **Number of points** restarts the run.
- **Show ε-neighborhood** shows the dashed circle around the point being checked. It starts on.
- **Point inspector**: click a point, or choose its number in **Point**. **Follow playback** goes back to the point the run is checking. With the plot focused, the arrow keys move to the nearest point in that direction and Esc goes back to following the run.
- **Fullscreen** enlarges the lab. **Reset** restarts the run with the current settings; it does not restore the defaults.

### Reading the screen
- The plot is called **Feature space**. A filled circle is **Core**, a hollow circle is **Border**, a cross is **Noise** and a small dot is **Unvisited**. A color marks a cluster. The dashed circle is the **ε-neighborhood**, and the points inside it get a halo, labeled **Neighbor inside ε**.
- The status line reads **Ready to explore**, **New cluster started**, **Cluster expanded**, **Border point added**, **Point marked as noise** or **Clustering complete**. Under it, a line such as "Point 12 · 5 in ε-neighborhood · Cluster 1" describes the point being checked, and a counter says how many points have been visited.
- **Results** shows **Clusters**, **Core**, **Border** and **Noise**. When the run is complete, **Core**, **Border** and **Noise** add up to the **Number of points**.

### Experiments
**Reset** keeps your settings, so before an experiment that does not name them, put ε back to 1.35, MinPts to 4 and **Number of points** to 80. Set **Speed** to **Instant** when you only want the final counts.
1. **The default run.** Predict: with **Rings and outliers** at ε 1.35 and MinPts 4, how many clusters, and what will be noise? Press **Run**. You should get **Clusters** 2, **Core** 76, **Border** 0 and **Noise** 4. The four crosses are the isolated corner points: click one and the **Point inspector** shows 1 point in its ε-neighborhood, itself, which is below MinPts. Why does every ring point pass and none is border?
2. **Too small, too large.** Predict: what do ε 0.3, 1.0 and 2.5 do? Try each. At 0.3, **Clusters** is 0 and **Noise** is 80. At 1.0 there is 1 cluster with 38 core points and 42 noise: only the inner ring survives. At 2.5 there is 1 cluster and 0 noise. Why does the outer ring fail at 1.0? Click an outer-ring point and read its neighbor count. Then find the ε range that gives 2 clusters with only a few noise points: it is about 1.26 to 1.95.
3. **Smallest radius for the moons.** Predict: how small can ε get on **Two moons** at MinPts 4 before the moons stop being two clusters? Lower ε in small steps. At 0.41 you still get 2 clusters, at 0.40 you get 4, and 0.30 gives all noise. At the other end, 1.11 gives 2 clusters and 1.12 gives 1. What happens to **Noise** along the way?
4. **Raising MinPts.** Predict: on **Two moons** at ε 0.8, which points stop being core when MinPts goes from 4 to 8? Try MinPts 4, 6, 8 and 10. **Core** goes 80, 76, 68, and at 10 every point is noise. At MinPts 6, press **Next step** 41 times: the status reads **Point marked as noise** for Point 5. Keep going: at step 65, **Border point added** shows Point 5 again. Where do the hollow circles sit, and why did a noise point change its mind?
5. **Uneven density.** Predict: is there one ε that separates the loose group from the dense one? Choose **Uneven density** with MinPts 4 and 80 points, and try ε 0.5, 1.35 and 1.7. You get 1 cluster and 36 noise, then 2 clusters and 4 noise, then 1 cluster. Then set ε to 1.0, which gives 2 clusters at 80 points, and lower **Number of points** to 30. You now get 1 cluster and 13 noise. Explain what thinning the data did to the loose group's density.
6. **A fresh sample.** Predict: if you press **Randomize points**, will your answer to experiment 3 hold? Choose **Two moons** with MinPts 4, **Number of points** 80 and ε 0.41, press **Randomize points** several times and write down **Clusters** each time. In a check of 20 fresh samples, ε 0.41 gave 2 clusters 13 times and 3 to 5 clusters 7 times. Repeat at ε 0.6: that gave 2 clusters on all 20. What does this say about choosing ε near the edge of its working range, and where would you choose it? The lab has no real-data switch, so the penguin numbers in the lesson are a reading, not an experiment.
