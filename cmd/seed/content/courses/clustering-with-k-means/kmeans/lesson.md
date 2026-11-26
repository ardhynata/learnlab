---
slug: kmeans
title: k-means, step by step
kind: simulator
simulator: kmeans
minutes: 25
---
::: intro
- Run the assign and update steps by hand on six real penguin flipper lengths.
- Explain why the loop stops when assignments stop changing, and why Inertia (the total squared distance from each point to its centroid) never rises.
- Use the k-means lab to see where k-means works and where it fails.

Before you start: read "What clustering is" and "Starting positions and choosing k".
:::

## The idea
*What does one pass of k-means do to the groups?*

The last lesson was about two choices you make before k-means runs: where the centroids start and how many there are. This lesson opens the loop itself.

A **centroid** is a point in the same feature space as the data, standing for the center of one cluster. k-means keeps k centroids and repeats two moves. In the **assign** step, every point joins the cluster of its nearest centroid. In the **update** step, every centroid moves to the mean of the points that joined it.

Moving the centroids changes which centroid is nearest for some points, so the groups change, and the loop goes around again. It stops when an assign step leaves every point in the cluster it already had.

You will run this by hand on six real penguins, then step through it in the k-means lab.

[[figure:kmeans/loop|The k-means loop: assign, update, and repeat until no point changes cluster.]]

## Assign, then update
*What exactly happens in each step?*

**Assign.** For each point, measure the distance to every centroid and pick the smallest. If two centroids are equally close, the one listed first wins. A centroid can end up with no points at all.

**Update.** For each cluster, average every feature of its points separately. With two features the new centroid is (mean of feature 1, mean of feature 2). A centroid with no points stays where it was, because there is nothing to average.

**Stop.** The first assign step has nothing to be compared with, so k-means always does at least one update. After that, each assign step is checked against the one before. If no point changed cluster, the next update would compute the same means, so the run is finished.

> Key idea: "center" depends on the distance. With squared Euclidean distance the center is the mean. With Manhattan distance it is the median of each feature. With cosine distance it is the average of the directions of the points (each point scaled to length 1), drawn at a fixed distance from the origin. The k-means lab offers all three.

## A worked example on penguins
*Can you run the loop with a pencil on real measurements?*

Take the flipper length, in millimeters, of six penguins from the bundled penguins table: three Adelie (181, 186 and 195) and three Gentoo (210, 211 and 230). One feature keeps the arithmetic short. Use k = 2, and start the two centroids on 181 and 186, two penguins that sit close together, which is a poor start on purpose.

Inertia is the sum of squared distances from each penguin to its centroid, in mm². The table lists, for each pass, the centroids used, the clusters that the assign step gives, and the inertia right after it.

| Pass | Centroids | Cluster 1 | Cluster 2 | Inertia |
| --- | --- | --- | --- | --- |
| 1 | 181 and 186 | 181 | 186, 195, 210, 211, 230 | 3218 |
| 2 | 181 and 206.4 | 181, 186 | 195, 210, 211, 230 | 746.04 |
| 3 | 183.5 and 211.5 | 181, 186, 195 | 210, 211, 230 | 489.5 |
| 4 | 187.33 and 217 | 181, 186, 195 | 210, 211, 230 | 354.67 |

[[figure:kmeans/worked|Four assign passes on six flipper lengths. Colors are clusters and diamonds are the centroids used in that pass.]]

## Four passes, one at a time
*Why does the penguin at 195 mm change cluster?*

> Worked example: **Pass 1.** The penguin at 181 is 0 from the first centroid, so it joins cluster 1. The one at 186 is 0 from the second, so it joins cluster 2, and so do the other four. The update moves centroid 2 to (186 + 195 + 210 + 211 + 230) / 5 = 1032 / 5 = 206.4.

> Worked example: **Pass 2.** 186 is 5 from 181 but 20.4 from 206.4, so it moves to cluster 1. 195 is 14 from 181 and 11.4 from 206.4, so it stays in cluster 2. The update gives (181 + 186) / 2 = 183.5 and (195 + 210 + 211 + 230) / 4 = 846 / 4 = 211.5.

> Worked example: **Pass 3.** Now 195 is 11.5 from 183.5 and 16.5 from 211.5, so it switches to cluster 1. The update gives 562 / 3 = 187.33 and 651 / 3 = 217.

**Pass 4.** Every penguin keeps its cluster, so the loop stops. Cluster 1 holds the three Adelie penguins and cluster 2 the three Gentoo.

> Watch out: that match with the species belongs to these six penguins. k-means never saw a species name, and a cluster is not a label.

## Why the loop stops
*Why can the loop never run forever?*

In the table, inertia fell at every pass: 3218, 746.04, 489.5, 354.67. That is no accident. The assign step gives every point its nearest centroid, which cannot make the total squared distance larger. The update step puts every centroid at the mean of its points, the spot with the smallest total squared distance to them, which cannot make it larger either.

Inertia never rises, and there are only finitely many ways to split the points into k groups, so the loop cannot go around in circles. It must reach a pass where nothing changes.

[[figure:kmeans/inertia|Inertia after each Next step in the k-means lab. Both kinds of step lower it or leave it unchanged, and the last two readings match.]]

The lab shows the same on Overlapping clusters with k = 2: Inertia goes from 260.09 to 110.89 in 13 steps. The last two readings are both 110.89 because the final assign step changed nothing.

> Watch out: stopping means stable, not best. The loop stops at the first stable answer it reaches, and the starting centroids decide which one that is.

::: deeper Why the mean
The mean is the one spot with the smallest sum of squared distances. For the three Adelie flipper lengths 181, 186 and 195, the mean is 187.33 and the sum is 40.11 + 1.78 + 58.78 = 100.67. Put the center at 186 (the median) and the sum is 25 + 0 + 81 = 106. Put it at 190 and it is 81 + 16 + 25 = 122. Any other spot gives a larger sum, which is why the update step uses the mean.
:::

## One run is one answer
*What do different starting centroids do to this loop?*

The last lesson showed that the same data can end in different groupings. The lab lets you watch it happen. Set Dataset to Checkerboard, type 4 in Number of clusters (k) and run to Converged: it takes Iteration 6 and ends at Inertia 114.24, with 12 points in each of four clusters, one per block.

Now press Randomize centroids and run again, several times. In a simulation of 2000 random starts, about six in ten ended at 114.24 as well. The others stopped higher, for example at 135.91 with uneven clusters of 11, 17, 11 and 9 points.

Every one of those runs stopped because an assign step changed nothing. Stopping tells you the run is stable, not that it found the best answer. As in the last lesson, you compare runs on the same data and the same k by their inertia, and keep the lowest.

## Where k-means struggles
*Which data defeats it?*

- **Non-round shapes.** Each cluster is defined by one center, so groups tend to be round blobs. On Concentric rings with k = 2, the loop stops after Iteration 1 at Inertia 267.49 with 24 and 24 points: a straight cut through both rings, 12 points of each ring on either side. The border between two centroids is the line of points equally far from both, and that line is straight.
- **Outliers.** One far-away point drags a mean toward it. A median resists this better.
- **Unscaled features.** The feature with the large scale dominates every distance.
- **Unequal densities.** A tight group beside a sprawling one is often split in the wrong place.

[[figure:kmeans/limits|The same loop on three datasets from the lab. Two centroids cut both rings, while four centroids find the four blocks.]]

::: deeper Details the k-means lab makes visible
- If two centroids are equally close to a point, the one listed first wins.
- An empty cluster keeps its current centroid.
- A point at the origin has no direction, so under cosine distance it is equally far (distance 1) from every center and adds nothing to any average.
- The shaded regions show where each centroid would win a point, using the centroids from the latest assign step.
- Manhattan region edges are drawn on a grid and look stepped, but every point is assigned by its exact Manhattan distance.
:::

::: deeper Cost
Each assign step computes n x k distances, so a run costs roughly n x k x iterations. In practice k-means is fast, which is why it is the usual first try.
:::

::: remember
- Assign every point to its nearest centroid, move every centroid to the mean of its points, and repeat.
- The loop stops when an assign step changes nothing. Inertia never rises, so it always stops, but at a stable answer that depends on the start.
- k-means suits compact, similar-sized groups. Rings, outliers and unscaled features break it.
:::

@@lab

## Lab: step through k-means
The lab opens on Overlapping clusters: 48 points and no centroids yet. Type a number in **Number of clusters (k)** and the lab places that many centroids on data points. Then you step through the loop and watch Inertia fall.

### Controls
- **Dataset** chooses **Overlapping clusters** (the start), **Concentric rings** or **Checkerboard**. Changing it brings back the course dataset (the same 48 points every time) and puts the centroids on new data points.
- **Distance** chooses **Euclidean (squared)** (the start), **Manhattan** or **Cosine**. Changing it keeps the starting centroids and starts the run again.
- **Number of points** (1 to 1000, starts at 48) and its **Randomize** button. **Randomize** draws new random points and leaves the centroids where they are.
- **Number of clusters (k)** (starts at 0) and its **Randomize centroids** button. Typing a number puts that many centroids on data points chosen the same way every time, so a typed k always starts the same. **Randomize centroids** puts them at random places instead, so the result differs each time.
- **Show cluster boundaries** (on) shades the area each centroid would win. **Show centroid coordinates** (off) writes each centroid's position beside it.
- **Run** plays the whole loop, and shows **Pause** while it plays and **Run again** after **Converged**. **Next step** and **Previous step** move one step forward or back. **Speed** has a slider and a box; the last slider position is **Instant**.
- **Fullscreen** enlarges the lab. **Reset** puts the centroids back at their starting places and clears the run, and keeps the points you have.
- On the plot, before the first assign step: click empty space to add a centroid, drag one to move it, right-click it to type its coordinates or delete it. With the plot focused, Space picks a centroid, the arrow keys move it, Enter edits it, + adds one and Delete removes it.

### Reading the screen
- The **Feature space** card draws the points, colored by cluster, with a line from each point to its centroid and a diamond for each centroid. The axes are **Feature 1** and **Feature 2**. Points the current assign step has not reached yet are grey, **Unassigned**. The tinted areas appear after the first assign step.
- The status line says **Ready**, **Assigning points** (with "Point 12 of 48 → Cluster 2"), **Points assigned**, **Centroids updated** or **Converged**. The line under it says what the next step will do.
- **Iteration** counts the update steps so far. **Inertia** is the total squared distance from each point to its centroid, and shows a dash while points are being assigned. With **Manhattan** or **Cosine** it is named **Total distance**, and it cannot be compared with Inertia.
- The **Cluster summary** table has the columns **Cluster**, **Points**, **Centroid · Feature 1** and **Centroid · Feature 2**, one row per cluster.

### Experiments
Drag **Speed** to its last position, **Instant**, so that each **Next step** is a whole assign step or a whole update step. At lower speeds **Next step** assigns one point at a time. The numbers below come from typed values of k, so they are the same for you. Changing **Dataset** brings back the default points, which you need after **Randomize**.

1. **Watch Inertia.** Predict: will Inertia go up, go down, or stay the same at each step? Leave Dataset on Overlapping clusters, type 2 in **Number of clusters (k)**, and press **Next step** 13 times, reading the status, **Iteration** and **Inertia** each time. The first step gives **Points assigned**, Iteration 0, Inertia 260.09. Then **Centroids updated**, Iteration 1, 189.99, then 159.96, 133.35, and so on down to **Converged** at Iteration 6 with Inertia 110.89. The Cluster summary then shows 21 and 27 points. Which steps lowered Inertia, and why is the last reading the same as the one before it?
2. **More centroids.** Predict: with k = 3, will the loop need more iterations than with k = 2? Type 3, then press **Run**, and read **Iteration** and **Inertia** at **Converged**: Iteration 5 and Inertia 83.83 (clusters of 11, 18 and 19 points). Then type 4: Iteration 8 and Inertia 57.55. Inertia falls as k grows, but the iteration count follows no rule (6, 5, 8). What does a lower Inertia not tell you about k?
3. **Different starts.** Predict: if you press **Randomize centroids**, will the loop end in the same place? Set Dataset to Checkerboard and type 4. Press **Run**: it converges at Iteration 6 with Inertia 114.24 and 12 points per cluster. Now press **Randomize centroids** and **Run** about ten times. Many runs end at 114.24 again. Some stop higher, for example at 135.91 with uneven clusters such as 11, 17, 11 and 9 points. Which run would you keep, and why?
4. **Two centroids on rings.** Predict: can two centroids separate the inner ring from the outer one? Set Dataset to Concentric rings and type 2. Press **Run**: it stops at Iteration 1 with Inertia 267.49 and 24 points in each cluster, and the shaded areas meet along a straight line through both rings. Now type 0, click the plot twice to place two centroids yourself (one at the middle, one near the top, say), and press **Run**. Try a few placements. Why does every placement that gives both centroids some points end with both rings cut?
5. **Another distance.** Predict: will changing Distance change the groups? Set Dataset to Overlapping clusters and type 2, then set **Distance** to **Manhattan** and press **Run**: it converges at Iteration 6 with Total distance 82.66 and 21 and 27 points. The centroids sit at (6.06, 4.17) and (3.97, 5.46), against (6.30, 4.14) and (3.68, 5.81) with Euclidean (squared). With **Cosine** it stops at Iteration 5 with Total distance 0.50, and the centroids are drawn at (6.69, 4.38) and (4.22, 6.80), both 8 from the origin. Why can you not compare 82.66 with 110.89?
6. **A fresh draw.** Predict: if you draw new points and run again, will the loop need six iterations again? Set Dataset to Overlapping clusters, type 2 and press **Run** to reach 110.89. Then press **Randomize** next to **Number of points**: it draws 48 new random points of the same kind, keeps the centroids where they are, and sets the run back to **Ready**. Press **Run** once more, and repeat with several new draws. In a simulation of 1000 draws, most took 1 to 3 iterations, the left centroid mostly landed at x between 3.0 and 3.8, the right one between 6.2 and 7.0, and Inertia mostly fell between about 106 and 149. Do the two groups keep their shape? Why is it wrong to say a draw with Inertia 140 is worse than the first with 110.89? As in the penguin pass, a number belongs to the points it was computed on.
