---
slug: pca-and-explained-variance
title: PCA and explained variance
kind: reading
simulator: ""
minutes: 25
---
::: intro
- Explain why fewer dimensions can help (redundancy, noise, drawing the data) and what PCA looks for.
- Compute by hand, for five 2-D points, the covariance matrix, its eigenvector and the projection of two points.
- Read an explained variance ratio and a scree plot, and say why PCA needs standardized columns.

Before you start: read "Center and spread", "Outliers and correlation" and "Scaling and encoding". They gave you variance, the correlation r and z-scores, and this lesson uses all three.
:::

## Why fewer dimensions
*Why would you drop columns you worked to collect?*

A **dimension** is one feature, one column. The penguin table has four measurements: bill length, bill depth, flipper length and body mass. Real tables have dozens or hundreds, and more columns are not always better.

- **Redundancy.** Columns that move together tell the same story twice. Across the 342 measured penguins, flipper length and body mass have a correlation of r = 0.87.
- **Noise.** A shared signal shows up in several columns at once, while measurement noise has no reason to line up. Directions along which the data barely varies are often mostly noise, though not always.
- **Drawing.** You can plot two or three axes. Four, or forty, you cannot.

**Dimensionality reduction** replaces many columns by a few new ones that keep as much of the information as possible. Here "information" means spread: a column that never changes tells you nothing about which row you are looking at. **PCA**, short for principal component analysis, is the most common method, and the rest of the lesson builds it up.

> Key idea: PCA does not pick some of your columns. It builds a few new columns, each a blend of the old ones, so that the spread of the data is kept in as few of them as possible.

## The direction of greatest variance
*What does PCA search for?*

First **center** the data: subtract each column's mean, so the middle of the cloud sits at the origin. Then choose a direction, a line through that middle, and drop every point straight onto the line. That is a **projection**. Each point now has one number, its position along the line, and those numbers have a variance, exactly as in "Center and spread".

Some directions keep the points far apart and some squeeze them together. PCA chooses the direction with the largest variance, the one in which a point's single number tells you the most about where the point was.

Take five points: (1, 2), (2, 1), (3, 4), (4, 3) and (5, 5), with means (3, 3). Projected onto four directions, they have these variances:

| Direction | Variance of the projected numbers |
| --- | --- |
| Along the first axis | 2 |
| Along the second axis | 2 |
| Along the diagonal (1, 1) | 3.6 |
| Along the other diagonal (1, -1) | 0.4 |

[[figure:pca-and-explained-variance/directions|The same five points projected onto three lines through their middle. The segment on each line is the spread of the projected points.]]

The diagonal wins with 3.6, so it is the first principal direction.

## Principal components as new axes
*What are the other components?*

The best direction is the **first principal component**, PC1. The **second**, PC2, is the best direction among those at a right angle to PC1. PC3 is at right angles to both, and so on. A table with d columns has d components.

The components are a new set of axes, turned relative to the old ones. PCA does not move or change the points. It describes the same cloud from a better angle. A point's coordinates on the new axes are its **scores**, and each component is a recipe: a weighted sum of the centered columns. The weights are the component's **loadings**.

Two facts make the new axes useful. The scores on different components are uncorrelated, so no redundancy is left between them. And the variance is handed out in order, with PC1 holding the most and PC2 the most of what remains.

Reducing dimensions is then simple: keep the first k scores and drop the rest.

> Watch out: a component's direction has no sign. A program may report PC1 as (0.71, 0.71) and another as (-0.71, -0.71). They are the same axis pointing the other way, and the scores just flip sign.

## A hand example: the covariance matrix
*How do the five numbers become a matrix?*

Subtract the means (3, 3) from the five points:

| Point | dx | dy | dx² | dy² | dx · dy |
| --- | --- | --- | --- | --- | --- |
| (1, 2) | -2 | -1 | 4 | 1 | 2 |
| (2, 1) | -1 | -2 | 1 | 4 | 2 |
| (3, 4) | 0 | 1 | 0 | 1 | 0 |
| (4, 3) | 1 | 0 | 1 | 0 | 0 |
| (5, 5) | 2 | 2 | 4 | 4 | 4 |
| Sum | | | 10 | 10 | 8 |

Divide each sum by 5 (as "Scaling and encoding" did). The two variances are 10 / 5 = 2 and 10 / 5 = 2. The **covariance** of the two columns is the average of dx · dy, which is 8 / 5 = 1.6. It is positive when the columns rise together, and a column's covariance with itself is its variance.

The **covariance matrix** puts all three numbers in one table:

```
C = [[2.0, 1.6],
     [1.6, 2.0]]
```

The correlation is r = 1.6 / (√2 · √2) = 0.8. Dividing by n - 1 instead of n would multiply every entry by the same factor, and it would change neither the directions nor the shares of variance below.

## Eigenvector and projection
*Which direction does the matrix point to, and where do two points land?*

An **eigenvector** of C is a direction that C only stretches and never turns. The stretch factor is its **eigenvalue**, and it equals the variance of the data along that direction. So the eigenvector with the biggest eigenvalue is PC1.

> Worked example: the eigenvalues solve (2 - λ)² - 1.6² = 0, so 2 - λ = 1.6 or -1.6, which gives λ = 0.4 or 3.6. For λ = 3.6 the equation (2 - 3.6)v1 + 1.6v2 = 0 gives v1 = v2. Scale it to length 1: PC1 = (0.707, 0.707). Check: C times (1, 1) is (3.6, 3.6). For λ = 0.4 you get PC2 = (0.707, -0.707).

These match the table: the variances 3.6 and 0.4 add up to 4, the same as 2 + 2. Rotating does not create variance. It only moves it around.

A score is the dot product of a centered point with a unit eigenvector.

> Worked example: the point (5, 5) is (2, 2) centered, so PC1 = 2 · 0.707 + 2 · 0.707 = 2.83 and PC2 = 2 · 0.707 - 2 · 0.707 = 0. The point (1, 2) is (-2, -1) centered: PC1 = (-2 - 1) · 0.707 = -2.12 and PC2 = (-2 + 1) · 0.707 = -0.71. Keep only PC1 and (1, 2) sits at (3, 3) + (-2.12) · (0.707, 0.707) = (1.5, 1.5), which is 0.71 from where it started.

[[figure:pca-and-explained-variance/projection|The five points with the two principal axes. The ringed points are the two from the worked example, and each dashed line drops a point onto PC1.]]

## Explained variance and the scree plot
*How many components are enough?*

The **explained variance ratio** of a component is its eigenvalue divided by the sum of all eigenvalues. In the hand example, PC1 explains 3.6 / 4 = 0.90 and PC2 explains 0.4 / 4 = 0.10. Keeping only PC1 keeps 90% of the variance.

Now the four penguin columns, standardized (next section). Each column then has variance 1, so the total variance is 4, and the eigenvalues are 2.75, 0.77, 0.37 and 0.11.

| Component | Explained variance | Running total |
| --- | --- | --- |
| PC1 | 68.8% | 68.8% |
| PC2 | 19.3% | 88.2% |
| PC3 | 9.1% | 97.3% |
| PC4 | 2.7% | 100% |

A **scree plot** draws these as bars in order, with the running total as a line. Look for the elbow where the bars flatten. Two components already hold 88.2%, so a flat picture of the four columns loses little.

[[figure:pca-and-explained-variance/scree|Scree plot for the four standardized penguin columns. Bars are the share of variance of each component; the line is the running total.]]

> Key idea: there is no single right number of components. Keep enough to reach a target such as 90%, or stop at the elbow, and then check that the task still works.

## Standardize first
*Why must every column be on the same scale?*

PCA looks for variance, and variance depends on units. Take two raw penguin columns: flipper length, in mm, has variance 197.15, and body mass, in g, has variance 641,250.58. Mass wins only because grams are small units.

The eigenvalues of that covariance matrix are 641,400.23 and 47.50. PC1 points along (0.02, 1.00), which is body mass almost alone, and it explains 99.99% of the variance. That is not a finding about penguins. It is a finding about grams. It is the same trap as in "Scaling and encoding", where the column with big numbers decided every distance.

**Standardize** each column to a z-score first. Every column then has variance 1, and the covariance matrix becomes the correlation matrix. With two columns and correlation r, the eigenvalues are 1 + r and 1 - r. Here r = 0.87, so they are 1.87 and 0.13, PC1 is (0.71, 0.71), a blend of both columns equally, and it explains 93.6%.

> Watch out: standardize and run PCA on the training rows only, then apply both to the other rows, the same habit as in "Pipelines and leakage". Skip standardizing only when the columns share a unit and the size differences matter, such as pixel brightness.

[[figure:pca-and-explained-variance/standardize|Flipper length and body mass, raw and standardized. Raw, the mass column holds almost all the variance and PC1 is almost the mass axis alone. Standardized, both columns count equally.]]

## What PCA does not promise
*What should you remember before the lab?*

- **Variance is not the same as usefulness.** PCA never sees a label. A direction with small variance can still be the one that separates two classes, and dropping it would lose that.
- **Straight axes only.** PCA rotates. It cannot unroll a curved or ring-shaped cloud, and the next lesson in this course looks at what is lost when you drop components and at methods for curved structure.
- **Outliers pull.** As in "Outliers and correlation", one far point can add a lot of variance and turn PC1 towards itself.

The PCA lab, the last lesson of this course, lets you rotate a point cloud, project it onto fewer axes and measure how much information is lost. You will have the numbers from this lesson to check it against: the covariance matrix, the eigenvalues and the explained variance ratio.

::: deeper Reading a component
For the four standardized penguin columns, PC1 has loadings of about -0.46 for bill length, +0.40 for bill depth, -0.58 for flipper length and -0.55 for body mass. Three columns pull the same way and bill depth the other way, so PC1 is roughly a body-size axis. (Its overall sign is arbitrary, so the signs could all flip.) PC2 is mostly bill depth and bill length, with almost no flipper or mass.
:::

::: remember
- PCA finds the direction of greatest variance, then the best direction at a right angle to it, and so on. These principal components are new axes for the same data.
- The eigenvalues of the covariance matrix are the variances along the components, and the explained variance ratio is each eigenvalue divided by their sum. A scree plot shows it.
- Standardize first, or the column with the biggest units takes over PC1. PCA is blind to labels and sensitive to outliers.
:::
