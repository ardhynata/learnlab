---
slug: outliers-and-correlation
title: Outliers and correlation
kind: reading
simulator: ''
minutes: 15
---
::: intro
- Explain how one outlier moves the mean, the median and the spread.
- Read a scatterplot for direction, strength and shape.
- Compute and interpret the correlation r, and say what it cannot tell you.

Before you start: read "Center and spread".
:::

## What an outlier is
*What makes one value stand out from the rest?*

An **outlier** is a value that sits far away from the other values in its column. There is no sharp line between "far" and "normal". It is a judgment, and the rules in this lesson only make that judgment repeatable.

Outliers come from three places:

- **A mistake.** Someone typed 950 instead of 95, or a sensor reported -999 when it was switched off.
- **A rare but real case.** One house in a street of small homes is a mansion.
- **A different group.** A jumbo jet in a list of small passenger cars is real, but it does not belong with the cars.

The cause matters, because it decides what you do. A mistake should be fixed or removed. A real case may be the most interesting row in the table. You cannot tell which one you have from the number alone. You have to ask where the data came from.

> Key idea: an outlier is a question, not a verdict. Look at it first, then decide.

## How outliers pull the mean
*Which summary numbers does one extreme value change?*

Take six delivery times in minutes: 22, 25, 24, 27, 23, 26. Sorted, they are 22, 23, 24, 25, 26, 27. Now one delivery gets stuck in traffic and takes 95 minutes.

> Worked example: before the outlier, the mean is (22 + 25 + 24 + 27 + 23 + 26) / 6 = 147 / 6 = 24.5, and the median is the average of the two middle values, (24 + 25) / 2 = 24.5. After adding 95, the mean is 242 / 7 = 34.57 (rounded). The median is the middle of seven sorted values, which is the fourth: 25.

The mean jumped by about 10 minutes, to a value that no normal delivery came near. The median moved by half a minute. The mean uses every value in a sum, so a huge value drags it. The median only uses the order of the values, so it cares about the 95 only as "the largest one".

[[figure:outliers-and-correlation/mean-vs-median|The same deliveries before and after adding 95 minutes. The mean (diamond) chases the outlier; the median (bar) stays with the crowd.]]

A summary that barely moves when one value changes is called **robust**. The median is robust and the mean is not.

## Finding outliers
*How can you flag an outlier without guessing?*

First, just look: sort the column, or draw it on a number line, and see whether anything sits alone. For a rule you can repeat, use the **1.5 x IQR rule**.

The **quartiles** split sorted data into four parts. Q1 is the median of the lower half, Q3 the median of the upper half, and the **IQR** (interquartile range) is Q3 - Q1. A value is flagged if it is below Q1 - 1.5 x IQR or above Q3 + 1.5 x IQR.

> Worked example: for 22, 23, 24, 25, 26, 27, 95, the median is 25. The lower half is 22, 23, 24, so Q1 = 23. The upper half is 26, 27, 95, so Q3 = 27. The IQR is 27 - 23 = 4, and 1.5 x 4 = 6. The fences are 23 - 6 = 17 and 27 + 6 = 33. The value 95 lies above 33, so it is flagged. Every other value is inside the fences.

## Range versus IQR
*How much do the spread numbers move when an outlier joins?*

Compare with the six values before the outlier: their IQR is 3 (Q1 = 23, Q3 = 26) and their range, the largest minus the smallest, is 5. With 95 added the IQR is 4 but the range is 73. The IQR moves only from 3 to 4, while the range jumps from 5 to 73.

The standard deviation jumps from about 1.9 to about 26.7, because it uses squared gaps from the mean.

Tools compute quartiles in slightly different ways, so a library may give a slightly different IQR. The rule also gives a flag, not a ruling. The outlier you flag may be the one you most want to understand.

> Watch out: the rule flags values only along one column. A point can look normal in each column alone and still be odd as a pair, which is where scatterplots help.

## Reading a scatterplot
*What can you see when two columns share one picture?*

A **scatterplot** draws one dot per row. The horizontal position is one numeric column, the vertical position is another. It answers a question a single column cannot: do these two move together?

Read a scatterplot in four steps:

1. **Direction.** Do the dots rise from left to right, fall, or show no tilt?
2. **Strength.** Do the dots hug a line closely, or form a loose cloud?
3. **Shape.** Is the trend a straight line, a curve, or two separate blobs?
4. **Oddballs.** Are any dots far from the rest?

If higher values of one column go with higher values of the other, the relationship is **positive**. If higher goes with lower, it is **negative**. If the cloud has no tilt, there is no linear pattern.

[[figure:outliers-and-correlation/scatter-patterns|Four scatterplots of 16 points each, with their correlation r. The last one has a clear pattern, a curve, yet its r is near zero.]]

Always draw the scatterplot before you trust any single number about it. The next section shows why.

## Correlation: one number for a straight-line trend
*How can the tilt of a scatterplot become a number?*

The **correlation coefficient**, written **r**, measures how closely two columns follow a straight line. It always lies between -1 and 1:

- **r near 1:** the dots rise tightly along a line.
- **r near -1:** the dots fall tightly along a line.
- **r near 0:** no straight-line trend.

To compute it, take each column's mean, then for every row multiply the two distances from the means. Add those products, and divide by the square root of the product of the two sums of squared distances.

> Worked example: five students, hours studied x = 1, 2, 3, 4, 5 and test score y = 50, 55, 65, 60, 70. The means are 3 and 60. The distances for x are -2, -1, 0, 1, 2 and for y are -10, -5, 5, 0, 10. The products are 20, 5, 0, 0, 20, which sum to 45. The squared distances sum to 10 for x and 250 for y. So r = 45 / sqrt(10 x 250) = 45 / 50 = 0.90.

An r of 0.90 means a strong upward trend. The sign gives the direction. The size gives how tightly the dots follow a line. It does not give the slope: a steep and a shallow line can share the same r.

## One point can reverse r
*What happens to a correlation when an outlier joins?*

Correlation is built from distances from the mean, and squared distances reward large ones, so an outlier has a loud voice. Add a sixth student to the example: 6 hours studied and a score of 30.

> Worked example: now the means are 3.5 and 55. The products of the distances are 12.5, 0, -5, 2.5, 22.5 and -62.5, and they sum to -30. The squared distances sum to 17.5 for x and 1000 for y. So r = -30 / sqrt(17.5 x 1000) = -0.23. One student moved r from 0.90 to -0.23, a trend that rose steeply now looks like it falls.

::: deeper Why squared distances matter
In the five-point example the largest product is 20. In the six-point version the new student alone contributes -62.5, while the other five contribute 32.5 together, so one point decides the sign. Its y distance of -25 also contributes 625 of the 1000 in the denominator. A point far from both means can dominate both sums at once. Rank-based versions of correlation, such as Spearman's, are less sensitive to this, but this lesson does not need them.
:::

## One point can invent r
*Can a single point create a trend that is not there?*

The reverse also happens. Ten points with no pattern have r of about -0.08. Add one point far up and to the right, at (20, 20), and r becomes 0.82. The "relationship" is only that one point.

[[figure:outliers-and-correlation/outlier-on-r|One added point can reverse a correlation (left to middle) or invent one (right). The ringed point is the added one.]]

> Key idea: a strong r from one far point is not evidence of a trend. Check the scatterplot, then try the correlation with and without the suspect point.

## What correlation does not tell you
*What should you still not conclude from a high r?*

- **Correlation is not causation.** Ice cream sales and sunburns rise together in summer. The sun drives both. A strong r says the columns move together, not why.
- **r only sees straight lines.** The U-shaped panel in the scatterplot figure has an obvious pattern and r near 0. A single number cannot replace the picture.
- **Mixed groups can hide a trend.** In the 342 penguins with both measurements, bill length and bill depth have r of -0.24. But inside each species the relationship is positive: r is 0.39 for Adelie, 0.65 for Chinstrap and 0.64 for Gentoo. Pooling the species gave the opposite sign.
- **It describes this sample.** A correlation from few rows can easily change with new data.

In the penguin data, flipper length and body mass do move together strongly (r is about 0.87), and that is a sensible thing to check before trusting a model that uses one to predict the other.

In the lab that ends this course, you will add an outlier yourself and watch the mean, the median and r move on generated data, then check the same idea on the real penguin measurements.

::: remember
- One outlier drags the mean and the spread, while the median and the IQR move far less, so ask where an outlier came from before you remove it.
- A scatterplot shows direction, strength, shape and oddballs; correlation r turns only the straight-line part of that into a number from -1 to 1.
- One far point can create, hide or reverse a correlation, and a correlation never proves a cause.
:::
