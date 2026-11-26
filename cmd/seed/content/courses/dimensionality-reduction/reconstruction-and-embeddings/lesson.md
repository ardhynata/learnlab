---
slug: reconstruction-and-embeddings
title: Reconstruction error and embeddings
kind: reading
simulator: ""
minutes: 25
---
::: intro
- Rebuild data from k components, measure the reconstruction error, and show that it equals the variance you dropped.
- Choose k by the error you can accept, and say what PCA as a preprocessing step cannot promise.
- Explain what t-SNE and UMAP maps keep and lose, why PCA is fitted on training rows only, and why a t-SNE plot never feeds a model.

Before you start: read "PCA and explained variance" in this course. It gave you components, scores and the explained variance ratio. This lesson asks what dropping components costs.
:::

## Down and back up
*What does it mean to rebuild data from fewer components?*

The last lesson turned PCA into a way to drop dimensions: describe each point by its first k scores and throw the rest away. The price is easy to measure if you go back.

A point's k scores are enough to build a new point. Start at the mean and add each score times its component's direction. This is the **reconstruction**. It is the spot on the kept axes that lies closest to the original point. The **reconstruction error** of a point is the distance from the original to its reconstruction. Keep all components and the error is 0, because you only turned the axes. Drop some and it is positive.

Take the five points from the last lesson. Keeping only PC1 rebuilt (1, 2) at (1.5, 1.5), which is 0.71 away. Four of the five points are 0.71 away from their rebuilt spots, and (5, 5) lies exactly on the line, so its error is 0. The squared errors are 0.5, 0.5, 0.5, 0.5 and 0. They add up to 2.0, and the average is 0.4, which is the eigenvalue of PC2. Section 3 shows why.

## Six penguins by hand
*Can you measure the error with a pencil on real penguins?*

Take six penguins as (flipper length in mm, body mass in g): (181, 3750), (186, 3800), (195, 3250), (210, 4450), (211, 4500) and (230, 5700). Standardize each column with its own mean and standard deviation (divided by n, as in the last lesson). The flipper column has mean 202.17 and standard deviation 16.71, and the mass column has mean 4241.67 and standard deviation 780.71. The correlation is r = 0.88, so for two standardized columns PC1 is (0.707, 0.707).

Rebuilding from PC1 puts a penguin at the average of its two z-scores on both axes. The error is what is left: the squared error is (z flipper - z mass)² / 2.

| Penguin | z flipper | z mass | Kept (both axes) | Squared error |
| --- | --- | --- | --- | --- |
| 181, 3750 | -1.27 | -0.63 | -0.95 | 0.203 |
| 186, 3800 | -0.97 | -0.57 | -0.77 | 0.081 |
| 195, 3250 | -0.43 | -1.27 | -0.85 | 0.354 |
| 210, 4450 | 0.47 | 0.27 | 0.37 | 0.020 |
| 211, 4500 | 0.53 | 0.33 | 0.43 | 0.020 |
| 230, 5700 | 1.67 | 1.87 | 1.77 | 0.020 |

The z-scores are rounded here, and the errors use the unrounded ones. The errors add up to 0.698.

[[figure:reconstruction-and-embeddings/project-and-back|The six penguins as z-scores, each dropped onto the first component. The dashed segments are the reconstruction errors.]]

> Worked example: the penguin at 195 mm and 3250 g has z-scores (-0.43, -1.27). Its kept spot is (-0.43 - 1.27) / 2 = -0.85 on both axes. The error vector is (-0.43 + 0.85, -1.27 + 0.85) = (0.42, -0.42), and its squared length is 0.42² + 0.42² = 0.35.

::: deeper Back to millimeters and grams
Reconstruction happens in z-scores, so undo the standardizing at the end: multiply by the standard deviation and add the mean. The kept spot -0.85 becomes 202.17 + (-0.85) × 16.71, about 188 mm, against a true 195 mm, and 4241.67 + (-0.85) × 780.71, about 3578 g, against a true 3250 g. This penguin is a lighter bird than its flipper suggests, and one component cannot say so.
:::

## Why the error is the dropped variance
*How does the reconstruction error relate to the explained variance?*

Rotating the axes does not change a point's length. So a centered point's squared length is the sum of the squares of all its scores. The reconstruction uses the first k scores. What is left over, the error, is made of the dropped scores, so its squared length is the sum of the squares of the dropped scores.

Average that over all points and you get the variance of the dropped components, which is their eigenvalues added up. For the six penguins, PC2 has eigenvalue 1 - r = 0.116, and six penguins times 0.116 is 0.698, the total in the table. The total squared length is 6 + 6 = 12 (each standardized column adds up to 6), so the error is 0.698 / 12 = 5.8% of it. PC1 explains (1 + r) / 2 = 94.2%.

> Key idea: the share of the squared length you lose equals 1 minus the explained variance ratio of what you keep. "Explained variance" and "reconstruction error" are the same fact told from two ends.

## Choosing k
*How many components should you keep?*

Reconstruction error gives the explained variance ratio a plain meaning: it is a budget. For the four standardized penguin columns, the table lists what each k costs.

| k | Explained variance | Reconstruction error | Typical error in body mass |
| --- | --- | --- | --- |
| 1 | 68.8% | 31.2% | 332 g |
| 2 | 88.2% | 11.8% | 327 g |
| 3 | 97.3% | 2.7% | 153 g |
| 4 | 100% | 0% | 0 g |

Going from k = 1 to k = 2 cuts the total error a lot, yet body mass barely improves (332 g to 327 g), because PC2 is mostly bill depth and bill length, not body mass.

[[figure:reconstruction-and-embeddings/error-by-k|Share of the squared length lost for each k, for the four penguin columns. The dashed line is a budget of 5%, which only k = 3 and k = 4 meet.]]

Choose the smallest k whose error you can accept for the job. Say the budget is 5%: then k = 2 is not enough and k = 3 is. For a quick two-dimensional picture, k = 2 is forced and the table tells you what it hides.

The total can hide a column. At k = 2 the total error is 11.8%, but body mass is rebuilt only to about 327 g, against a standard deviation of about 802 g: roughly 17% of its own variance is gone. When a model will use the result, treat k as a setting to tune and pick it by validation score, as in "Tuning with search".

## PCA as preprocessing, and where it falls short
*When does PCA help a model, and when does it hurt?*

Used before a model, PCA turns many correlated columns into a few uncorrelated scores. That can shrink a large table, speed up training and calm models that suffer from redundant columns. Its limits come from how it works.

- **It is unsupervised.** PCA sees the spread of the inputs and never the label. A direction with little variance can be the only one that separates the classes.
- **It is linear.** PCA rotates and flattens. It cannot unroll a curved or ring-shaped cloud, and it keeps whatever straight direction has the most spread.
- **Its axes are blends.** A score is a weighted mix of all the columns, so a result is harder to explain than a single original column.

[[figure:reconstruction-and-embeddings/pca-misses-signal|Two classes of 60 points each. The first component holds 85.3% of the variance and cannot separate them; the second holds 14.7% and separates them completely.]]

> Watch out: a high explained variance says the picture is faithful to the inputs, not that it is useful for the label. Check the task with a validation score.

## Fit it on the training rows only
*Which rows may help choose the axes?*

Fitting PCA means computing three things from data: the column means, the scales if you standardize, and the components. If you compute them on all rows before splitting, the held-out rows helped choose the axes, and the test score no longer rehearses unseen data. This is leakage, the same habit as in "Pipelines and leakage".

The safe order is split first, fit the scaler and PCA on the training rows, then apply the same means, scales and components to the validation or test rows without refitting. Under cross-validation, refit everything inside each fold, and pick k there too.

> Worked example: PCA was fitted on the five training points from the last lesson, with mean (3, 3) and PC1 = (0.707, 0.707). A new point (4, 5) arrives. Centered with the training mean it is (1, 2). Its PC1 score is 3 × 0.707 = 2.12, and its reconstruction is (3, 3) + 2.12 × (0.707, 0.707) = (4.5, 4.5). The error vector is (-0.5, 0.5), a squared error of 0.5. The new point's own mean is never used.

## What t-SNE and UMAP draw
*How do these methods make a map of high-dimensional data?*

PCA cannot flatten every shape, so people also use **t-SNE** and **UMAP**. Both are nonlinear and built for one job: drawing a 2-D map of many columns. They work on neighbourhoods. For each point they note which points lie close to it, then they place the points in 2-D until the same points are neighbours there. The setting **perplexity** in t-SNE is roughly how many neighbours each point pays attention to, and the **n_neighbors** setting in UMAP plays a similar role. The figures below are t-SNE, and the cautions apply to both.

Here are the 342 penguins, all four columns, on three maps. On all three, Gentoo stands apart, and Adelie and Chinstrap sit as two groups side by side, with some mixing at their border. That is the neighbourhood promise working: penguins that are close in the data stay close on the map.

[[figure:reconstruction-and-embeddings/three-maps|The same 342 penguins on a PCA map and on two t-SNE maps. The gap ratio is the Gentoo-to-Adelie distance divided by the Chinstrap-to-Adelie distance.]]

The picture also shows what a map does not promise. In the data itself, the distance from Gentoo to Adelie is 1.85 times the distance from Chinstrap to Adelie. The map gives 2.22, then 2.37 for t-SNE with perplexity 30, and 1.24 with perplexity 5.

## What a map keeps and loses
*What may you read from a t-SNE or UMAP picture, and what may you not?*

**Read:** which points are neighbours, and which groups seem to exist. Those are good starting questions to check with other tools.

**Do not read:** the distances between groups, the size of a group, or the axes. The gap ratio above changed from 1.85 to 1.24 only because a setting changed. A cluster drawn twice as wide may not be twice as spread out, and a gap drawn large may not be large in the data. Different seeds and settings draw different pictures of the same data.

> Watch out: never feed t-SNE coordinates to a model. They depend on every row, so fitting them on all rows leaks the test rows. They change with the settings and the seed, and the usual t-SNE has no rule for placing a new row on the map. Use these maps to look and to form questions, then test the answer with the original columns or with PCA fitted on the training rows.

The PCA lab, the last lesson of this course, lets you rotate a point cloud, project it onto fewer axes and watch the reconstruction error and the explained variance move together. You will check the identity from this lesson with your own eyes there.

::: remember
- A reconstruction rebuilds each point from its first k scores. The squared error is what the dropped components held, so the share of the squared length lost is 1 minus the explained variance you keep.
- Choose the smallest k whose error you can accept, and check it against the task. PCA is linear and unsupervised, so it can drop the direction that separates the labels. Fit it on the training rows only.
- t-SNE and UMAP keep neighbourhoods and lose distances between groups, group sizes and axis meaning. Use them to look, never as model input.
:::
