---
slug: cluster-methods-lab
title: Cluster methods lab
kind: simulator
simulator: cluster-compare
minutes: 30
---
::: intro
- Compare k-means, DBSCAN and hierarchical clustering on blobs, rings and clusters of unequal density, and say where each one struggles.
- Predict what each method will do to a dataset before you read its result, then read its silhouette score and its match with the true groups.
- Explain why a high silhouette score is not proof that a clustering is right, and check the idea on real penguins with fresh samples.

Before you start: read "k-means, step by step", "Hierarchical clustering", "The silhouette score", "DBSCAN and density" and "Clusters versus labels".
:::

## What the lab asks
*What happens when three clustering methods get the same points?*

You now know three ways to cluster. k-means looks for centers, hierarchical clustering merges the closest groups into a tree, and DBSCAN grows clusters through crowded places. Each lesson showed one method on its own data. The Cluster methods lab gives all three the same points at once, so you can see where each one works and where it breaks.

The lab starts with 150 generated points. The points come from a random generator with a fixed starting number (a seed), so everyone sees the same ones. You will meet three shapes: round blobs, two rings, and two clusters of unequal density, one tight and one loose. Every dataset also has **true groups**, the shapes the generator drew. A real project has no such answer key, so the lab also asks how far a score can be trusted without one.

## Three methods, one set of points
*What does the lab show for each method?*

Each method gets its own panel with the same four numbers: how many clusters it found, how many points it called noise, its silhouette score, and its match with the true groups. Only DBSCAN can call a point noise. k-means and hierarchical clustering put every point in some cluster.

Each method also has settings. k-means needs k. DBSCAN needs a radius and a minimum number of points, which the lab writes as eps and minPts. Hierarchical clustering needs a linkage and a place to cut the tree. They start sensibly: k and the cut equal the true number of groups, minPts is 5, and eps is 0.80, or 1.10 on the rings.

[[figure:cluster-methods-lab/shapes-grid|The three methods on three datasets at the lab's starting settings. Under each panel: clusters and noise, the silhouette score, and the match with the true groups.]]


## Two scores, two questions
*What does each score measure, and what does it leave out?*

The **silhouette score**, from "The silhouette score", uses only the points and their cluster labels. A high value means each point sits close to its own cluster and far from the next one. It never sees the true groups. The lab leaves DBSCAN's noise points out of it, and with fewer than two clusters there is no score, so the lab shows a dash and says why.

The **match with the true groups** is the adjusted Rand index from "Clusters versus labels". It is 1 when the clusters are the true groups, about 0 when they are no better than random labels, and slightly below 0 for a method that does worse than chance. The lab counts noise as one more group. The lab can compute it because the data generator knows the answer.

> Key idea: the silhouette asks whether the clusters are compact and apart. The match asks whether they are the groups that were really there. These are different questions, and this lab is about the gap between them.

## Round blobs: the easy case
*Do the methods agree when the groups are round and far apart?*

They do. On **Three blobs** each method finds 3 clusters. k-means scores 0.80 on silhouette and 1.00 on match, and Ward hierarchical clustering scores the same. DBSCAN scores 0.81 and 0.98. It sets 2 points aside as noise, and the silhouette leaves them out, which is why its score is a hair higher while its match is a hair lower.

Here the silhouette also does its other job: choosing k. With k-means on the same blobs, k = 2 scores 0.56, k = 3 scores 0.80, k = 4 scores 0.66 and k = 5 scores 0.50. The peak sits at the true number of groups, as it did in the silhouette lesson.


## Two rings: where centers fail
*Why do k-means and Ward cut straight through the rings?*

Both rings share one center. k-means puts its two centroids on either side of it, and the border between its clusters is a straight line, so it cuts each ring in half: silhouette 0.36, match -0.01, which is chance. Ward linkage builds compact groups and cuts the same way: 0.35 and 0.01. DBSCAN follows each dense ring at eps 1.10: silhouette 0.01, match 1.00.

The linkage matters. **Single** linkage creeps along each ring from one nearest pair to the next and also reaches a match of 1.00. **Average** linkage cuts across, with -0.02.

[[figure:cluster-methods-lab/score-vs-match|On two rings, the silhouette score and the match with the true rings for four results. The method that separates the rings scores lowest on silhouette; shrinking eps to 0.30 gives the highest silhouette and a wrong grouping.]]

> Watch out: the only method that separated the rings has the lowest silhouette, 0.01. The two that cut them have the highest, 0.36 and 0.35. On the true grouping, each of the 103 outer-ring points is on average nearer to the inner ring than to its own ring-mates, so its silhouette is below 0. The score is built for round clusters.

## Unequal density: where one radius and one nearest pair fail
*What goes wrong with a tight cluster beside a loose one?*

**Unequal density** has a tight cluster, a loose cluster and a scatter of 15 noise points. At the starting settings it is a fair fight: k-means scores 0.68 and 0.81, DBSCAN 0.74 and 0.85 with 14 noise points, and Ward 0.67 and 0.81. DBSCAN does best because it can set the scatter aside, while k-means and Ward must put every point somewhere.

The weak spots show when you change a setting. DBSCAN has one radius for both clusters. At eps 0.50 the radius is too small for the loose cluster: 38 points become noise and the match falls to 0.61. At eps 0.30, 68 points are noise and it is 0.71. Hierarchical clustering with **Single** linkage and k = 2 does something different: it cuts off one stray point, leaving a cluster of 149 points and a cluster of 1, with a match of 0.01. Single linkage chains through whatever is nearest.

## A high silhouette is not proof
*Can a clustering score well and still be wrong?*

It can, and the lab makes that easy to see. Go back to the two rings and shrink eps to 0.30. DBSCAN now finds 5 clusters and labels 125 of the 150 points as noise. Its silhouette is 0.86, the highest on the screen, and its match with the true rings is 0.05.

> Worked example: 150 points - 125 noise points = 25 points. The 0.86 is the average over only those 25, which is 25 / 150, about one sixth, of the data. They sit in tight arcs, so the score is high. The other 125 points do not count.

A score can flatter a clustering in three ways. It ignores noise, as above. It prefers round clusters, as on the rings. And it never sees the truth: on Unequal density at eps 0.30, DBSCAN's silhouette of 0.84 beats k-means (0.68) and Ward (0.67), yet its match of 0.71 is below their 0.81.

> Key idea: a high silhouette means the clusters are compact and apart. It does not mean they are right. Look at the picture, count the noise points, and ask whether the groups mean anything for your problem.

## Real penguins
*Does the same story hold on real measurements?*

Set **Data source** to **Penguins (real)**. The lab plots bill length against flipper length for 150 of the 342 penguins that have both numbers, each rescaled to a 0 to 10 range. The true groups are the three species, and no method sees them. At the starting settings k-means scores 0.50 on silhouette and 0.81 on match, and Ward 0.50 and 0.80. DBSCAN scores 0.36 and 0.52, with 37 of the 150 points, about a quarter, as noise.

## Fresh samples
*Does the same method win on a new set of penguins?*

Take fresh samples: the first one, then three presses of **New sample**. The match of k-means is 0.81, 0.96, 0.88 and 0.76. DBSCAN's is 0.52, 0.41, 0.36 and 0.52, and its cluster count is 3, 7, 7 and 4. On the fourth sample DBSCAN has the highest silhouette, 0.59 against 0.54 for k-means, although k-means matches the species far better.

[[figure:cluster-methods-lab/penguin-samples|Silhouette against the match with the species for three methods on four samples of penguins. The point furthest to the right is not the highest one.]]

Four samples is a small check, and eps 0.50 was never tuned, so this is a pattern, not a ranking.

::: deeper A fresh sample can break a setting
On Two rings, eps 1.10 separates the rings on the first sample and on the next three. Press **New sample** a fourth time and DBSCAN splits the rings into 4 clusters with a match of 0.53, while k-means and Ward still cut across them. The working range of eps is a property of one sample as well as of the shape, so test a setting on more than one sample before you trust it.
:::

::: remember
- Give every method the same points and check each against the picture: k-means and Ward like round clusters, single linkage chains through nearby points, and DBSCAN needs one radius that suits the density of the data.
- The silhouette score measures compact, separated clusters, leaves out noise and cannot see the true groups, so a wrong clustering can score higher than a right one.
- Predict, change one setting, explain the result, then repeat it on real data and on a fresh sample before you believe it.
:::

@@lab

## Lab: compare clustering methods
The lab opens on 150 generated points of **Two rings**. k-means has k = 2, DBSCAN has eps 1.10 and minPts 5, and hierarchical clustering uses Ward linkage cut at k = 2. Choose your prediction before you read the panels, which already show results.

### Controls
- **Data source** switches between **Generated data** and **Penguins (real)**. Switching sets both k values, eps and minPts back to that data's starting values and clears the Quick Quiz answers. The linkage, **Number of points** and the sample stay.
- **Generated dataset** (generated data only) chooses **Three blobs**, **Overlapping blobs**, **Two rings** (the start), **Two moons**, **Unequal density** or **Unequal sizes**. Changing it sets both k values to the true number of groups, eps to 0.80 (1.10 for the rings) and clears the Quick Quiz answers. minPts and the linkage stay.
- **Measurement on the x axis** and **Measurement on the y axis** (penguins only) choose among **Bill length (mm)**, **Bill depth (mm)**, **Flipper length (mm)** and **Body mass (g)**. They start on bill length and flipper length and always differ.
- **Number of points** (40 to 350 in steps of 10, starts at 150) sets the size of the sample.
- **New sample** draws a new sample of the same kind: new generated points, or a different random set of penguins. Your settings stay.
- **k-means: number of clusters (k)** is a slider from 1 to 8.
- **DBSCAN: radius (eps)** is a slider from 0.10 to 2.00 in steps of 0.05. **DBSCAN: minimum points (minPts)** goes from 2 to 15 and starts at 5. eps is measured on the 0 to 10 plot square.
- **Hierarchical: linkage** chooses **Single (nearest pair)**, **Average (mean of all pairs)** or **Ward (smallest variance increase)**. **Hierarchical: number of clusters (k)** is a slider from 1 to 8 and sets where the tree is cut.
- **Show the true groups (outline)** draws a ring around every point in the color of its true group. It starts off.
- **Fullscreen** enlarges the lab. **Reset** returns to generated data, **Two rings**, 150 points and the first sample, with Ward linkage, the starting settings, the outline off and the Quick Quiz answers cleared.
- **Quick Quiz** is the button under the settings card (a round button at the bottom right on a phone); it holds two boxes (arrows in its panel move between them): "On two rings, which of the three methods will separate them?" and "On two rings, does the method that separates them best also get the highest silhouette score?". Pick an answer, then press **Check answer**. They answer only on **Two rings** with **Generated data**; the second also needs a method that separates the rings.

### Reading the screen
- The status box at the top says which method matched the true groups best, for example "DBSCAN matches the true groups best (adjusted Rand 1.00)." It reports ties, and says "No method matched the true groups well" when the best match is below 0.3. The line under it is a silhouette reminder; when the highest silhouette belongs to a worse match it names both, for example "Silhouette alone misleads here: it scores k-means highest (0.36), yet DBSCAN matched the true groups better." At the right of the box is the count, such as "150 points".
- There are three panels: **k-means** ("k = 2"), **DBSCAN** ("eps = 1.10, minPts = 5") and **Hierarchical clustering** ("Ward linkage, k = 2"). Points are colored by cluster, and a group that a method gets right has the same color in all three panels. In the k-means panel each diamond is a centroid. In the DBSCAN panel a grey cross is a noise point and a smaller dot is a border point. The axes read **Feature 1** and **Feature 2**; with penguins, the two measurement names are written under the plot.
- Under the **Hierarchical clustering** plot is the dendrogram, with the axis **Merge distance**. The dashed line is the cut and is labeled "cut: k = 2". Branches below the line take the color of their cluster.
- Under each panel there are four rows: **Clusters**, **Noise points**, **Silhouette score** and **Match with the true groups (adjusted Rand)**. The silhouette leaves noise points out. The match counts noise as one more group. With fewer than two clusters the silhouette shows a dash, and the line "Silhouette needs at least two clusters, so there is no score here." appears under the panel.
- With **Penguins (real)**, a note under the axis selectors says how many penguins have both measurements ("342 of 344 penguins ... 2 rows with missing values (NA) are left out") and how many are shown. The legend explains the marks.

### Experiments
Press **Reset** before each experiment: the numbers are for the first sample of 150 points, and linkage does not come back by itself.

1. **Round blobs.** Press **Reset**, then set **Generated dataset** to **Three blobs**. Predict: will the three methods agree, and which will have the highest silhouette? Each method finds 3 **Clusters**: **Silhouette score** 0.80 (k-means), 0.81 (DBSCAN, with 2 **Noise points**) and 0.80 (hierarchical); **Match with the true groups (adjusted Rand)** 1.00, 0.98 and 1.00. Now move **k-means: number of clusters (k)** to 2, 4 and 5: the silhouette is 0.56, 0.66 and 0.50, against 0.80 at k = 3. Why does a score that never sees the true groups still peak at the right k?
2. **Who separates the rings?** Press **Reset**. The lab opens on **Two rings**. Predict: before you read the panels, open **Quick Quiz** and pick an answer in the first box, then press **Check answer**. Only DBSCAN separates them: its match is 1.00, against -0.01 for k-means and 0.01 for hierarchical. Switch on **Show the true groups (outline)** to see where k-means cuts. Then set **Hierarchical: linkage** to **Single (nearest pair)**: its match becomes 1.00 and the status says "DBSCAN and hierarchical clustering match the true groups best, tied (adjusted Rand 1.00)." With **Average (mean of all pairs)** it falls to -0.02. What does single linkage do that Ward does not?
3. **The score and the radius.** Press **Reset**. Predict: in the second **Quick Quiz** box, does the method that separates the rings also have the highest silhouette? The silhouettes are 0.36 (k-means), 0.35 (hierarchical) and 0.01 (DBSCAN), so no. Now move **DBSCAN: radius (eps)** and predict where DBSCAN stops separating the rings. From 0.80 to 1.35 it finds 2 clusters with no noise and a match of 1.00. At 0.75 it finds 6 clusters (match 0.41). At 1.40 there is 1 cluster and the silhouette shows a dash. Why does the working range have two ends?
4. **Unequal density.** Press **Reset**, then set **Generated dataset** to **Unequal density**. Predict: which method will give way first when you change one of its settings? At the start the silhouette and match are 0.68 and 0.81 for k-means, 0.74 and 0.85 for DBSCAN (14 noise points) and 0.67 and 0.81 for hierarchical. Lower **DBSCAN: radius (eps)** to 0.50, then 0.30: noise grows to 38 and then 68 points, and the match falls to 0.61 and then 0.71. Set eps back to 0.90 for 2 clusters, 11 noise points and a match of 0.89. Then set **Hierarchical: linkage** to **Single (nearest pair)**: the match is 0.01, and one cluster holds a single stray point. Raise **Hierarchical: number of clusters (k)** to 3 and the match is 0.82.
5. **A high score that is wrong.** Press **Reset**. Predict: can DBSCAN beat both other methods on silhouette while matching the truth worse? On **Two rings**, set eps to 0.30: DBSCAN has 5 clusters and 125 noise points, a silhouette of 0.86 and a match of 0.05. At eps 0.50 it has 15 clusters, 23 noise points, silhouette 0.60 and match 0.07. Then set **Generated dataset** to **Unequal density** and eps to 0.30: the silhouette of 0.84 is again the highest, and the line under the status says "Silhouette alone misleads here ...". How many points does each of these scores describe?
6. **Real penguins and fresh samples.** Press **Reset**, then set **Data source** to **Penguins (real)**. Predict: which method will match the species best, and will the same one win on a new sample? Start: silhouette and match are 0.50 and 0.81 for k-means, 0.36 and 0.52 for DBSCAN (37 noise points), 0.50 and 0.80 for hierarchical. Switch on **Show the true groups (outline)**. Then press **New sample** three times and read the match after each press. k-means gets 0.96, 0.88 and 0.76, DBSCAN 0.41, 0.36 and 0.52, hierarchical 0.66, 0.78 and 0.72. On the third press DBSCAN's silhouette of 0.59 is the highest, yet k-means matches better. Set eps to 0.70 on that sample: DBSCAN gets 4 clusters, 10 noise points, silhouette 0.45 and match 0.69. Does the idea from the rings hold on real data, and does it hold on every sample?
