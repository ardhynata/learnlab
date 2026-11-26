---
slug: clusters-vs-labels
title: Clusters versus labels
kind: simulator
simulator: kmeans-reveal
minutes: 25
---
::: intro
- Explain why a cluster is not a class, and why the cluster numbers 1, 2, 3 are only names.
- Read a crosstab of clusters against true classes, and work out purity from it.
- Use the adjusted Rand index to judge a match, and tell whether a poor match comes from the method, the features or the classes.

Before you start: read "What clustering is", "Starting positions and choosing k" and "k-means, step by step". The lab "k-means, then reveal the labels" uses all three, and it opens on the same 48 points as the k-NN lab.
:::

## A class is given, a cluster is found
*What is the difference between a label and a cluster?*

In the k-NN lab every point came with a class, A or B, and k-NN used those classes to vote. That is supervised learning: the labels are the answer key.

k-means never sees them. It gets only the positions of the points, and it returns groups it found by distance alone. A **cluster** is such a group. A **class** is a name a person attached to the data beforehand, for example a penguin's species.

So a cluster and a class are different things. They can agree, but nothing forces them to. The lab "k-means, then reveal the labels" lets you test how well they agree. It hides the classes, runs k-means, and only then draws each point's true class as an outline around it.

[[figure:clusters-vs-labels/hide-and-reveal|The same 48 points three times: with their classes, with the classes hidden, and after k-means with the classes revealed. Fill is the cluster, outline is the true class.]]

> Key idea: the labels are never used to build the clusters. They are used afterwards, only to judge them.

## The crosstab
*How do you compare clusters with classes?*

Count, for every cluster, how many points of each class it holds. The result is a **crosstab**: one row per cluster, one column per class, and in each cell the number of points that are in both.

On the lab's first dataset with k = 2, the crosstab is below. Cluster 1 holds 6 points of class A and 20 of class B. Cluster 2 holds 18 of class A and 4 of class B.

[[figure:clusters-vs-labels/crosstab|The crosstab for k = 2 on Overlapping clusters, and the purity it gives. The largest cell of each row is shaded.]]

> Worked example: the largest cell of each row is the cluster's majority class: 20 in Cluster 1 and 18 in Cluster 2. Add them: 20 + 18 = 38 points sit in the majority class of their cluster. Out of 48 points, **purity** = 38 / 48 = 79.2%.

Purity answers one plain question: if you named each cluster after its main class, what share of the points would carry the right name? The lab prints it, with the table, under the plot.

## Cluster numbers are only names
*Why can Cluster 1 be mostly class B?*

In the crosstab, Cluster 1 is mostly class B. Nothing in k-means says that cluster 1 should line up with class A. The numbers only tell the clusters apart, and they depend on the start.

In the lab, set **Initialization** to **Random points**. The run takes 5 updates instead of 4, and the table swaps its rows: Cluster 1 now holds 18 points of class A and 4 of class B. It is the same grouping with the names exchanged, and Inertia is 110.76 both times. Purity is 79.2% both times.

This is why you never compare the cluster number with the class name. You compare the groups themselves, and the crosstab does that: a perfect match shows one big cell in every row and every column, wherever the cells are.

> Watch out: if "Cluster 1 = class A" looks wrong, check the row first. A match can sit on a different row from the one you expected.

## Purity can be too easy
*What does purity miss when k grows?*

Purity has a trap. Make every point its own cluster and every cluster is pure, so purity is 100%, and nothing has been learned. Purity tends to rise as clusters get smaller.

The lab shows a small version of this. On Overlapping clusters, going from k = 2 to k = 4 raises purity from 79.2% to 83.3%, although k-means is not finding the classes any better. On Checkerboard with k = 4, purity is 100%: each of the four clusters holds one class only. Yet each class is spread over two clusters.

[[figure:clusters-vs-labels/purity-vs-ari|Purity and the adjusted Rand index for k = 1 to 8 on two datasets. Purity climbs or stays high as k grows; the adjusted Rand index peaks and then falls.]]

Purity also has a floor: with k = 1 it is the share of the biggest class, 50% on the two equal classes, and 44.2% on the penguins (151 Adelie out of 342). On the two equal classes, a purity of 60% is only a little better than that floor.

## The adjusted Rand index, lightly
*What does a second score add?*

The **adjusted Rand index** (ARI) compares the clusters and the classes pair by pair. Take any two points. Did the clusters put them together? Did the classes put them together? The index scores how often the two answers agree, and then subtracts the agreement you would get by chance.

- **1** means the clusters and the classes match exactly.
- **About 0** means the match is no better than random labels.
- **Below 0** means worse than random. A value just below 0, like −0.02 on the rings, is chance.

Splitting a class over two clusters counts against the score, because pairs from that class are separated. That is why Checkerboard with k = 4 has purity 100% but ARI 0.48. The lab calls 0.7 or more a good match and under 0.3 clusters that cut across the classes: a rule of thumb, not a law.

::: deeper Counting the pairs
The 48 points make 48 × 47 / 2 = 1,128 pairs. In the crosstab 6, 20, 18 and 4, the pairs inside one cell are 15 + 190 + 153 + 6 = 364. Pairs in the same cluster: 325 + 231 = 556. Pairs in the same class: 276 + 276 = 552. By chance you would expect 556 × 552 / 1,128 = 272.09 pairs to be together in both. The index is (364 − 272.09) / (554 − 272.09) = 0.326, where 554 is the average of 556 and 552. That is the 0.33 the lab shows.
:::

## When clusters and classes disagree
*Is a poor match always a failure of k-means?*

Sometimes the fault is the method. On Concentric rings with k = 2, the lab gives purity 52.1% and ARI −0.02: each cluster takes about half of each ring. The border between two centroids is a straight line, and no straight line separates a ring from the ring inside it. Raising k does not help: k = 4 gives purity 54.2%.

Sometimes the fault is the features or their scale, as the penguins show next. And sometimes nothing is at fault: a class is one way a person split the data, and the features may not draw that line. k-means finds the groups the distances suggest, and those can be real even when they are not your classes.

In real work you usually have no labels, which is why you cluster. The reveal is a classroom tool for learning how far a clustering can be trusted.

> Key idea: a low score does not say which part failed. Look at the plot, the features and the scaling before you blame the algorithm.

## Real penguins: three species, three clusters
*Can k-means find species it was never told about?*

The lab's real data is 342 penguins, each with a bill length and a flipper length. The species is the hidden class. With both features standardized and k = 3, the crosstab is: Cluster 1 holds 146 Adelie, 5 Chinstrap and no Gentoo; Cluster 2 holds 1, 4 and 122; Cluster 3 holds 4, 59 and 1. Purity is (146 + 122 + 59) / 342 = 327 / 342 = 95.6%, and ARI is 0.89.

[[figure:clusters-vs-labels/penguins|The 342 penguins clustered with k = 3, with and without standardizing. Without it, flipper length dominates the distances and Adelie and Chinstrap mix.]]

## Why scaling matters
*Why do the unscaled clusters mix two species?*

Turn standardizing off and the picture changes: purity 83.9% and ARI 0.64. Flipper length has a standard deviation of 14.0 mm across all penguins, bill length only 5.5 mm. The standard deviation is the typical distance of a penguin from the average, so flipper length dominates the distance. Adelie and Chinstrap differ mostly in bill length (average 38.8 against 48.8 mm), not in flipper length (190.0 against 195.8 mm), which is why the unscaled clusters mix them.

::: deeper A bad start is not a bad species match
With Initialization set to Random points and standardizing on, seeds 1 to 7 all end at Inertia 157.82 and ARI 0.89. Seed 8 stops at Inertia 206.06 and ARI 0.57: Gentoo is split between two clusters. The labels were not needed to spot the worse run, since its Inertia is higher on the same data and the same k.
:::

::: remember
- A cluster is found from positions, a class is given by a person. They may agree, but nothing makes them agree.
- A crosstab compares them: purity is the share of points in the majority class of their cluster, and the adjusted Rand index is a pair-based score where 1 is a perfect match and about 0 is chance.
- Purity grows with k. Check ARI as well, and when the match is poor look at the shapes, the scaling and the start before you blame k-means.
:::

@@lab

## Lab: k-means, then reveal the labels
The lab opens on the same 48 points as the k-NN lab, with the classes A and B hidden and k = 2. You run k-means, then reveal the classes and compare them with the clusters. Under the plot there is a crosstab and an elbow chart.

### Controls
- **Data** switches between **Generated data** and **Penguins (real)**. With the real data, **Number of clusters k** starts at 3 and the labels hide again. If the penguin file cannot load, the lab says so and shows the generated data.
- **Dataset** (generated data only) chooses **Overlapping clusters** (the start), **Concentric rings** or **Checkerboard**.
- **Number of clusters k** is a slider from 1 to 8. It starts at 2 on generated data and at 3 on penguins.
- **Initialization** chooses **k-means++** (the start) or **Random points**.
- **Seed** is a number from 1 to 999 (it starts at 1). The same seed gives the same start every time.
- **Standardize both features first** (penguins only, on at the start) puts bill length and flipper length on one scale before k-means runs. The plot stays in millimetres.
- **Run** and **Next step** above the plot play or step through k-means so you can watch it move, and **Previous step** goes back. **Speed** sets how fast **Run** plays.
- **Run k-means** goes straight to the end of the run.
- **Reveal the labels** draws each point's true class as an outline, and changes to **Hide the labels again**. Switching **Data** hides the labels again.
- **Reset** returns to generated data and the starting settings. **Fullscreen** enlarges the lab.
- **Quick Quiz** is the button under the settings card (a round button at the bottom right on a phone). It asks whether k-means will recover the classes (with k = 2, or k = 3 on the penguins). Pick an answer first, then set that k, run k-means to the end and reveal the labels; the box then answers with the adjusted Rand index and the purity.

### Reading the screen
- The plot shows the points as grey dots at first (**Point (label hidden)**). After k-means runs, the fill shows the **Cluster 1**, **Cluster 2** and so on, with a diamond for each **Centroid** and a dashed trail of where it moved. After **Reveal the labels**, the outline of each point shows its class: **Class A (outline)** and **Class B (outline)**, or **Adelie (outline)**, **Chinstrap (outline)** and **Gentoo (outline)**.
- The status line says how far k-means has come: "Step N of M ... Inertia X" while it runs, then "Done after N updates: no point changed cluster." At the right is the count of points and k.
- Once the labels are revealed and k-means has run, the line under it gives a verdict, with the purity and the adjusted Rand index: "These clusters match the classes well", "only partly" or "The clusters cut across the classes". With k = 1 it says there is nothing to match.
- The card **Clusters by true classes** is the crosstab: one row per cluster, one column per class, a **Total** row and column, and the largest cell of each row in bold.
- The card **Inertia against k (elbow chart)** draws **Best of 5 starts** for k = 1 to 8, with a dashed line at the current k and a point for **This run, now**.

### Experiments
All numbers are for the default settings (**Seed** 1). With **Run k-means** the run goes to the end, so the figures below are the final ones.

1. **Hide, run, reveal.** Predict: with k = 2 on **Overlapping clusters**, will k-means recover the two classes? Pick an answer in the **Quick Quiz** box. Press **Run k-means**, then **Reveal the labels**. The lab says "These clusters match the classes only partly": Purity 79.2%, adjusted Rand index 0.33, Inertia 110.76. In the table, Cluster 1 holds 6 of class A and 20 of class B, and Cluster 2 holds 18 and 4. Now set **Initialization** to **Random points** and run again: the rows swap but the scores do not move. What does that tell you about the cluster numbers? Then set **Initialization** back to **k-means++** (or press **Reset**) before the next experiment.
2. **More clusters.** Predict: if you raise **Number of clusters k** from 2 to 4, will purity rise or fall, and will the match get better? Run and reveal at each value. Purity goes 79.2%, 81.3%, 83.3%, and the adjusted Rand index goes 0.33, 0.29, 0.21. Inertia and purity improve, the match does not. Which score should you trust when you change k, and why?
3. **Checkerboard.** Predict: what are the purity and the verdict with k = 4 on **Checkerboard**? First try k = 2: Purity 62.5%, ARI 0.04, "cut across the classes". Then k = 4: Purity 100.0%, ARI 0.48 and the verdict "only partly". The table has four rows, each with 12 points of one class and none of the other. Why is the match not "good" when every cluster is pure?
4. **Rings.** Predict: can more clusters separate two rings? Pick **Concentric rings** and k = 2: Purity 52.1%, ARI −0.02, with 11 and 12 points of each class in Cluster 1 and 13 and 12 in Cluster 2. Raise k to 4: Purity 54.2%, ARI −0.03. Why does adding clusters not help?
5. **Penguins, scaled and unscaled.** Predict: with k = 3, will k-means find the three species? Set **Data** to **Penguins (real)**. Under the data select, the lab says that 342 of 344 penguins have both measurements and that 2 rows with missing values (NA) are left out. Press **Run k-means** and **Reveal the labels**: Purity 95.6%, ARI 0.89, and the rows 146, 5, 0; 1, 4, 122; 4, 59, 1. Now turn off **Standardize both features first** and run again: Purity 83.9%, ARI 0.64, and Cluster 1 holds 38 Adelie and 54 Chinstrap. Which feature dominates the distance, and which species are mixed?
6. **A fresh seed.** Predict: will a different seed change the penguin result? Turn standardizing back on, set **Initialization** to **Random points** and try **Seed** 1 to 7, running and revealing each time: every one ends at Inertia 157.82 and ARI 0.89. Then try **Seed** 8: Inertia 206.06, Purity 78.7%, ARI 0.57. Which run would you keep if you had no labels, and why? Check the idea once more with standardizing off and **Seed** 1 to 4: the ARI is 0.64, 0.64, 0.54 and 0.53, never near 0.89. Which matters more here, the seed or the scaling?
