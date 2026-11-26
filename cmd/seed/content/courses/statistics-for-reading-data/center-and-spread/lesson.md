---
slug: center-and-spread
title: Center and spread
kind: reading
simulator: ''
minutes: 14
---
::: intro
- Compute the mean and the median of a column, and say when they differ.
- Measure spread with variance and standard deviation, step by step.
- Read a histogram to see the shape of a distribution.

Before you start: read "Data, features and labels".
:::

## Two questions about a column
*Why summarize a whole column with just two numbers?*

The bundled penguin table has 342 flipper lengths. Nobody can read 342 numbers and see anything, so we summarize. Two questions cover most of what a summary needs to say. **Where is the middle?** That is the **center**. **How far do the values stray from it?** That is the **spread**.

Each question has more than one answer, and the answers are not equal. This lesson builds the main ones: the mean and the median for the center, the variance and the standard deviation for the spread, and the histogram for the whole picture, which is called the **distribution** of the column.

Throughout, we use five real flipper lengths in millimeters, the first five Adelie penguins in the table that have a measurement: **181, 186, 195, 193, 190**. Small enough to do with a pencil.

Why care in machine learning? Distance-based models, such as k-NN and k-means in later courses, depend on the spread of every feature, so the first thing to do with a new column is look at its center and spread.

## The mean
*What do you get when you share a total out evenly?*

The **mean** is the sum of the values divided by how many there are. It is what each value would be if the total were shared out equally.

> Worked example: 181 + 186 + 195 + 193 + 190 = 945. There are 5 values, so the mean is 945 / 5 = 189 mm.

Now measure how far each value sits from 189: -8, -3, +6, +4 and +1. Add them up and you get 0. That is always true, and it is the best way to think about the mean: it is the **balance point**. Picture the values as equal weights on a ruler. The mean is the spot where the ruler balances.

[[figure:center-and-spread/mean-and-median|Five flipper lengths on a number line. The mean (triangle) balances the weights; the median (dashed line) is the middle one. A sixth, longer flipper pulls the mean further than the median.]]

> Key idea: the mean uses the size of every value, so a value far from the others pulls it. That is useful when every value matters, and a problem when one value is unusual.

## The median
*What is the middle value, and when does it differ from the mean?*

The **median** is the middle value after you sort the column. It uses only the order of the values, not their size.

> Worked example: sorted, our five lengths are 181, 186, **190**, 193, 195. The middle one, the third, is 190 mm. The mean was 189, so the two agree closely.

With an even number of values there is no single middle one, so you average the two in the middle. Let a sixth penguin join, a Gentoo with a 217 mm flipper. Sorted: 181, 186, 190, 193, 195, 217. The median is (190 + 193) / 2 = 191.5 mm. The mean becomes (945 + 217) / 6 = 193.7 mm, rounded.

The long flipper moved the mean by about 4.7 mm (189 to 193.7), but the median by only 1.5 mm (190 to 191.5). The median ignores how far 217 is from the rest and only counts that it is the largest.

> Watch out: neither is the "right" center. The mean answers "what would each value be if the total were shared equally?" and the median answers "what does the middle value look like?". The next lesson shows what a really extreme value does to each.

## Variance and standard deviation
*How do you measure how far values stray from the center?*

The range (largest minus smallest) is quick, but it uses only two values. A better idea uses every value: take each value's gap from the mean, and average the gaps. The catch is that the gaps sum to 0, as you saw. So we **square** each gap first, which makes every gap positive and lets big gaps count more. The average of the squared gaps is the **variance**. Its square root is the **standard deviation** (SD).

> Worked example: the mean is 189.

| Value | Gap from 189 | Gap squared |
|---|---|---|
| 181 | -8 | 64 |
| 186 | -3 | 9 |
| 195 | +6 | 36 |
| 193 | +4 | 16 |
| 190 | +1 | 1 |

The squares add to 126, so the variance is 126 / 5 = 25.2 mm². The SD is the square root of 25.2, about 5.02 mm. A typical flipper in this group is roughly 5 mm away from the mean.

[[figure:center-and-spread/deviations|Each value's gap from the mean, then the squared gap. The biggest gap, 8 mm, contributes 64 of the total 126.]]

Variance is in squared units (mm²), which is hard to picture. The SD is back in millimeters, so it is the one you quote.

::: deeper Dividing by n or by n - 1
This lesson divides the squared gaps by n, the number of values. Many textbooks and spreadsheet functions divide by n - 1 instead when the values are a small sample of a bigger group. For our five flippers that gives 126 / 4 = 31.5 and an SD of about 5.61 mm. The two versions get closer as n grows. Always check which one a tool uses before you compare numbers.
:::

## Distributions
*What does the whole column look like?*

Two numbers cannot show everything. A **histogram** cuts the range of a column into equal-width bins (intervals, such as 170 to 175 mm) and counts how many values land in each. Tall bars are where the values are crowded.

Shapes to look for: **symmetric** (a hill with both sides alike), **skewed** (one side has a long tail) and **several humps**, which often mean the rows come from different groups.

[[figure:center-and-spread/penguin-shapes|Two columns from all 342 measured penguins. Body mass has one hill and a long tail on the right. Flipper length has two humps.]]

Body mass of the 342 penguins has a mean of about 4,202 g and a median of 4,050 g. The mean is higher because the tail on the right pulls it up, as in our six-penguin example. Flipper length has two humps: shorter flippers (Adelie and Chinstrap) and longer ones (Gentoo). Its mean, about 200.9 mm, falls in the valley between the humps, where few penguins actually are.

> Key idea: a center and a spread describe a column well only when it has one hump. Plot the histogram before you trust the two numbers.

::: deeper How wide is one standard deviation?
For a hill-shaped column, most values lie within a couple of SDs of the mean. Check it on the 151 Adelie flipper lengths: the mean is 189.95 mm and the SD is 6.52 mm (dividing by n). About 71% of the penguins lie within one SD of the mean, and about 95% within two SDs. This is a measured result for one column, not a law for every column.
:::

## Reading center and spread together
*Which summary should you report, and what does it tell you?*

Two columns can have the same center and very different spread. The lists 8, 10, 12 and 2, 10, 18 both have a mean of 10. The first has an SD of about 1.6 and the second about 6.5, so the second is much more scattered.

Spread also tells you whether a difference in centers is large. In the penguin table, Adelie body mass has a mean of about 3,701 g and an SD of 457 g. Gentoo has a mean of about 5,076 g and an SD of 502 g. The centers differ by about 1,375 g, about three SDs of either species. That is why body mass helps to tell the two species apart.

## Which summary to report
*How do you choose between the mean and the median?*

A rule of thumb for what to report:

- A roughly symmetric column with one hump: the **mean** and the **SD**.
- A skewed column, or one with unusual values: the **median**, and say it is the median.
- A column with several humps: show the histogram, and consider each group on its own.

Standardizing, which you will meet in "Scaling and encoding" later in the course, is built from these two numbers: z = (value - mean) / SD.

The lab that ends this course puts a point of your own in the data. You will add an unusual point and drag it away, and watch the mean, the median and the correlation move or stay put, first on generated points and then on the real penguins. The next lesson prepares you: it covers outliers and correlation.

::: remember
- The mean is the balance point and uses every value's size; the median is the middle value and uses only order.
- Variance is the average squared gap from the mean; the standard deviation is its square root, in the original units.
- A histogram shows the shape: skew pulls the mean away from the median, and several humps mean one center is not enough.
:::
