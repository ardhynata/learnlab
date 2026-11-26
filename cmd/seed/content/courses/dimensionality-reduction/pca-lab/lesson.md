---
slug: pca-lab
title: PCA lab
kind: simulator
simulator: pca-lab
minutes: 25
---
::: intro
- Predict how much information a single axis loses before you turn it, then check the number in the lab.
- Explain why the variance an axis keeps and the information it loses always add up to the total variance.
- Read a scree plot to pick the number of components, and test the idea on the real penguins and on a fresh sample.

Before you start: read "PCA and explained variance" and "Reconstruction error and embeddings" in this course. They gave you components, explained variance and the reconstruction error, and the lab lets you see all three move.
:::

## What the lab shows
*What do you turn in the PCA lab, and what do you read off it?*

The PCA lab starts with 120 generated points in a long, thin cloud. Each point has two numbers, Feature 1 and Feature 2, and they rise together (correlation r = 0.84). You get one axis, a line through the middle of the cloud, and you can turn it.

Every point drops straight onto the axis. That is the projection from "PCA and explained variance", and the spot where a point lands is its reconstruction from one component, as in "Reconstruction error and embeddings". The dashed line from a point to its landing spot is the part of that point the axis throws away.

The lab reports two numbers for the axis you chose:

- **Variance along the axis**: how far apart the landing spots are. Call it the variance kept.
- **Information lost**: the average squared length of the dashed lines. This is the mean squared reconstruction error from the previous lesson.

With the axis at 0°, pointing right, the status line reads: it keeps 3.15 of the 4.90 total variance (64.4%), and the information lost is 1.74 (35.6%). Everything else in the lab explains those two numbers and how they change.

## Kept plus lost is the total
*Why can the two numbers never both be big?*

Take any point, centred on the middle of the cloud. Its squared distance from the middle splits into two parts at a right angle: the squared length along the axis, and the squared length of the dashed line. Add that up over all the points and divide by their number, and you get the same split for the whole cloud:

> Key idea: variance kept + information lost = total variance, for every axis you can draw. The total never changes, so an axis can only gain by taking from the other side.

> Worked example: at 0° the axis is Feature 1 itself. The variance kept is the variance of Feature 1, 3.152, and the information lost is the variance of Feature 2, 1.744. They add up to 4.896, which the lab rounds to 4.90.

[[figure:pca-lab/rotate|The same 120 points with three axes. The dashed lines are the information lost. The middle axis is the best one, and the right one is at 90° to it.]]

## Turning the axis
*How do the kept variance and the loss change as the angle changes?*

Drag on the plot, move **Axis angle**, or use the arrow keys, and watch the status line. The kept variance depends on the angle θ through the covariance matrix of the cloud. For this cloud the entries are c11 = 3.152, c22 = 1.744 and c12 = 1.966: c11 and c22 are the variances of Feature 1 and Feature 2, and c12 is their covariance, the number that grows when the two rise together (see "PCA and explained variance"). The kept variance is c11 cos²θ + 2 c12 sin θ cos θ + c22 sin²θ.

> Worked example: at 45°, cos θ = sin θ, so the formula becomes (c11 + c22) / 2 + c12 = (3.152 + 1.744) / 2 + 1.966 = 4.414. The lab shows 4.41. At 90° the axis is Feature 2, which keeps 1.74 and loses 3.15, the numbers at 0° swapped.

The chart "Variance kept and information lost at every angle" draws both for all angles from 0° to 180°. The two curves are mirror images that always add up to 4.90. The kept variance peaks at 35.1° (4.54) and bottoms out at 125.1° (0.36), exactly 90° later.

[[figure:pca-lab/sweep|Variance kept and information lost at every angle, for the 120 generated points. The dashed line is the total, 4.90. An axis at 180° is the same line as one at 0°, so the chart stops there.]]

## The best axis is the first component
*What happens when the axis stops on the highest point of the curve?*

Press **Snap to the first principal component** and the axis jumps to 35.1°. It keeps 4.54 of 4.90, which is 92.7%, and loses only 0.36 (7.3%). No other angle does better. This is PC1, and 4.54 is its eigenvalue.

> Worked example: the eigenvalues of the covariance matrix add up to c11 + c22 = 4.896 and multiply to c11 c22 - c12² = 1.632. The numbers 4.536 and 0.360 do both. The larger one gives the angle: tan 2θ = 2 c12 / (c11 - c22) = 3.932 / 1.408 = 2.79, so 2θ = 70.3° and θ = 35.1°. And 4.536 / 4.896 = 92.7%, the explained variance ratio.

Press **Turn the axis by 90°** and you land on PC2: it keeps 0.36 and loses 4.54, the numbers swapped. The lab's Quick Quiz asks you to predict this before you try it. An axis at a right angle to the best one is the worst axis of all, because the two eigenvalues are the best and the worst the curve reaches.

Switch on **Show the best axis** to see the best axis drawn dashed behind your own.

## Clouds with no clear winner
*Does turning the axis always matter?*

Change **Cloud** to **Noisy**. It has the same long direction, but much more spread across it. The best axis, 35.8°, now keeps 2.55 of 3.99 (63.9%) and loses 1.44 (36.1%). The curves still wave up and down, but with a much smaller swing: the best axis keeps 63.9% against 50% for the average axis.

Change **Cloud** to **Round (no correlation)**. Every angle keeps 2.25 of 4.50, which is 50.0%, and the lab says so: no axis is better than another. There is no redundancy for PCA to remove, because the two features do not move together.

> Key idea: PCA can compress a table only if its columns share information. The better the first component, the more it was a bargain, and a round cloud offers none.

You can use this the other way round. When you meet a real table, the explained variance of the first component tells you how redundant it is, before you decide to drop anything.

## More components and the scree plot
*How does the loss change when you keep k of many components?*

The lower cards of the lab use a table of 8 features that move in two hidden groups. Slide **Components to keep** and read the note under it. The **Scree plot** shows the variance each component explains, 65.4% and 25.1% for the first two, then a flat tail of 2.0% down to 1.1%.

> Worked example: keeping 2 components keeps 65.4% + 25.1% = 90.5% of the variance, so the information lost is 100% - 90.5% = 9.5%. The note says the same. With 3 components it is 92.5% kept and 7.5% lost, only 2 points better for a whole extra component.

[[figure:pca-lab/scree|Scree plot of the 8-feature table, and the information lost by the number of components kept. Keeping 2 loses 9.5%.]]

The chart "Information lost versus components kept" is the scree plot read from the other end, and it bends at the same place. To choose k, stop where the bars flatten, check the share kept, and test that the task still works, as in "Reconstruction error and embeddings". Set **Dimensions** to **3-D** and the best single axis keeps only 81.0% instead of 92.7%, because the cloud also spreads in a second and a third direction. The second component adds 14.4%, so two of them keep 95.4%.

## Real penguins
*Does the idea hold outside generated data?*

Set **Data** to **Penguins (real)**. The lab uses 342 of the 344 penguins, the ones with all four measurements, and standardises them. Two components keep 88.2% of the variance (PC1 68.8% and PC2 19.3%, which add to 88.2% before rounding), the figures from "PCA and explained variance". PCA never saw the species. The colours on the plot show whether the components found them anyway.

Now untick **Standardise the measurements**. PC1 explains about 100%, and its loading for body mass is 1.00. Grams are small units, so the mass column holds almost all of the variance, and the lab says so.

## A fresh sample
*Do the numbers stay put when the sample changes?*

To check the idea on a fresh sample, go back to **Generated data**. The real table has only one sample, so it cannot make a new one. Press **New sample** and snap each time. In six samples of the strong cloud the best axis kept between 92.5% and 93.8% of the variance, at angles between 32° and 35°.

[[figure:pca-lab/fresh|The share of the variance kept by the best axis, in six samples of each generated cloud (seeds 1 to 6).]]

Six samples is a small check, not a proof. It says the pattern is stable and the exact numbers are not.

::: deeper Why the two curves are mirror images
Let p be a centred point and u a unit axis. The squared length of p splits into (p · u)² along the axis plus the squared distance from p to the axis, because the two parts are at a right angle. Average over all the points: the average of (p · u)² is the variance kept, the average of the other part is the information lost, and the average of the squared length is the total variance. The total does not depend on u, so when one curve rises the other falls by the same amount.
:::

::: remember
- For any axis, variance kept + information lost = total variance. The best axis, PC1, keeps the most, and the axis at 90° to it keeps the least.
- A round cloud has no best axis. The first component explains a lot only when the features share information, and the scree plot shows how much.
- Check an idea on a fresh sample before you trust it: the pattern should stay, while the exact numbers move a little.
:::

@@lab

## Lab: rotate an axis, lose information
The lab starts with 120 generated points (Strong correlation, 2-D) and an axis at 0°. You turn the axis and read how much variance it keeps and how much information it loses. The numbers below are for that default; press **Reset** if you changed anything.

### Controls
- **Data** switches between **Generated data** and **Penguins (real)**. With the real data, **Standardise the measurements** is the only other control in the Parameters card.
- **Cloud** has three options: **Strong correlation**, **Noisy** and **Round (no correlation)**.
- **Dimensions** has **2-D (one view)** and **3-D (two linked views)**.
- **Number of points** (30 to 300) sets the size of the cloud. **New sample** draws another seeded sample.
- **Axis angle** (0 to 180) turns the axis. You can also drag on the plot, or focus the plot and press Left and Right to turn it one degree (Shift: five). In 3-D, **Axis tilt (3-D)** (-90 to 90) tilts it, and Up and Down do the same.
- **Snap to the first principal component** puts the axis on the best one. **Turn the axis by 90°** moves it to the axis at a right angle (PC2 in 2-D).
- **Show the best axis** draws the best axis as a dashed line. **Show the information lost** draws the dashed lines from points to the axis. It starts on.
- **Standardise the measurements** (Real data only) puts each measurement on the same scale first.
- **Components to keep** (1 to 8, or 1 to 4 with penguins) sits in the Scree plot card.
- The **Quick Quiz** button sits under the Parameters card (bottom right on a phone). It asks: "If you project onto the axis perpendicular to the best one, what happens to the information lost?" with the answers **More information is lost than on the best axis**, **Less information is lost than on the best axis** and **About the same amount is lost**. It reveals the verdict, with numbers, once your axis is at a right angle to the best one.

### Reading the screen
- The plot shows **Data point** dots, **Your axis**, the **Projection onto the axis** dots, and **Information lost (distance to the axis)** as dashed lines. With **Show the best axis** on, **Best axis (first principal component)** is added.
- The status line reads "Axis at 0°: it keeps 3.15 of the 4.90 total variance (64.4%). Information lost: 1.74 (35.6%)." The line under it says where the best axis is: "The best axis is at 35.1°: it keeps 4.54 (92.7%) and loses only 0.36."
- The card **Variance kept and information lost at every angle** shows both curves, with the key **Variance along the axis**, **Information lost** and **Your axis: N°**. In 3-D the card **Side view: Feature 1 against Feature 3** shows the same cloud from the side.
- The card **Scree plot: variance explained by each component** has the key **Each component**, **Running total** and **You keep k = N**. The card **Information lost versus components kept** has the key **Information lost** and **You keep k = N**. Both use the 8-feature table, or the four measurements with penguins. The note reads "Keeping 2 of 8 components keeps 90.5% of the variance and loses 9.5%."
- The card **What each component is made of** is a table of loadings, with a last row **Variance explained**. With penguins the status line reads "Two components keep 88.2% of the variance of the four measurements: PC1 68.8%, PC2 19.3%."

### Experiments
1. **Perpendicular.** Predict: pick an answer in the **Quick Quiz** box about the axis at a right angle to the best one. Then press **Snap to the first principal component**, press **Turn the axis by 90°** and read the status line. The kept variance goes from 4.54 to 0.36 and the information lost from 0.36 to 4.54, and the total stays 4.90. Explain why the worst axis loses what the best one keeps.
2. **Turn by hand.** Predict: set **Axis angle** to 0 and guess which angle keeps the most variance. Then try 45, 90 and 135, and watch the curves card. The axis keeps 4.41 at 45° (the formula from the lesson gives 4.414), 1.74 at 90° and 0.48 at 135°. At 90° the kept and lost numbers of 0° have swapped. Why does the kept variance peak once, not twice, between 0° and 180°?
3. **Three clouds.** Predict: will **Noisy** or **Round (no correlation)** keep less with its best axis? Press **Snap to the first principal component** for each **Cloud**. **Strong correlation** keeps 92.7%, **Noisy** 63.9% (35.8°) and **Round (no correlation)** 50.0% at every angle. What does the lab's detail line say about the round cloud?
4. **Third dimension.** Predict: with **Dimensions** set to **3-D (two linked views)**, will the best single axis keep more or less than the 92.7% in 2-D? Press **Snap to the first principal component**: it keeps 4.35 of 5.36, which is 81.0%. Press **Turn the axis by 90°** to read the second component: 0.77, or 14.4%. Tilt the axis and watch it leave the flat view in the **Side view** card.
5. **How many components?** Predict: how many of the 8 components do you need to keep 90% of the variance? Slide **Components to keep** from 1 to 3 and read the note: 65.4%, 90.5% and 92.5% kept. Then change **Cloud** to **Noisy**: with 2 components it keeps only 63.3%. With **Round (no correlation)** it keeps 25.0%, because every component explains 12.5%. What shape does the scree plot have when there is nothing to compress?
6. **Penguins and a fresh sample.** Predict: with **Standardise the measurements** on, how much will two components keep, and what happens when you turn it off? Set **Data** to **Penguins (real)**: two components keep 88.2% (PC1 68.8%, PC2 19.3%), and with **Components to keep** at 1, 2 and 3 the note gives 68.8%, 88.2% and 97.3%. Turn off standardising: PC1 explains about 100%, and its loading for body mass is 1.00. Then check the idea on fresh data: set **Data** back to **Generated data**, press **New sample** five times, and press **Snap to the first principal component** each time. With **Strong correlation** the best axis keeps 93.7%, 93.3%, 92.5%, 93.8% and 93.0% (the first sample kept 92.7%). Does the pattern survive a fresh sample, and which numbers changed?
