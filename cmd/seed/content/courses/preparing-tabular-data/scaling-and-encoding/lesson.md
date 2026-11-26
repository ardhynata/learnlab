---
slug: scaling-and-encoding
title: Scaling and encoding
kind: simulator
simulator: scale-it
minutes: 20
---
::: intro
- Explain why a feature measured in big numbers can dominate a distance, and which models suffer from it.
- Rescale a column by hand with standardizing and with min-max, and say what an outlier does to each.
- Predict in the Scale it lab how neighbors and accuracy change with each scaling, then check the idea on real penguins.

Before you start: read "Distance and similarity" and "Missing values and encoding". The first gave you distance; the second gave you one-hot columns and the habit of fitting on training rows only.
:::

## Why raw numbers mislead
*How can a model ignore a column you gave it?*

A distance formula subtracts numbers and adds up the squares. It has no idea that one column is dollars and another is years. Whichever column has the bigger numbers wins.

Take two people who differ by $1,000 in income and by 30 years in age. Squared, the income gap is 1,000,000 and the age gap is 900. Income supplies more than 99.9% of the squared distance, so age might as well not exist.

This matters for every model built on distance. Two examples: k-nearest neighbors (k-NN) labels a point with the majority group of its k closest points, and k-means groups points around k centers. For distance models, the fix is to put the columns on a comparable scale before measuring anything. That fix is called **scaling**.

[[figure:scaling-and-encoding/equal-distance|Under raw distance, everyone within about $4,000 of the query counts as close, whatever their age (left). After standardizing (next section), close means close in both features (right).]]

> Key idea: a distance adds up differences measured in different units. Make the units comparable first, or the column with the biggest numbers decides everything.

## Standardizing
*How do you give every column the same typical size?*

**Standardizing** turns each value into a **z-score**:

`z = (value - mean) / standard deviation`

You met the mean and the standard deviation in "Center and spread". The **mean** is the average. The **standard deviation** says how far values typically sit from the mean: square each gap from the mean, average the squares, then take the square root. (This lesson divides by the number of values, as the lab does.)

A z-score counts standard deviations. A z-score of 0 is an average value, +1.5 is one and a half standard deviations above the mean, and -1 is one below. After standardizing, every column has mean 0 and standard deviation 1, whatever its original units.

For example, if ages have mean 40 and standard deviation 8, a person aged 52 has z = (52 - 40) / 8 = 1.5.

Standardizing keeps the shape of the data. It only slides the column so its mean is 0 and stretches it so its spread is 1.

## Min-max scaling and outliers
*How do you fit a column into 0 to 1, and what can break it?*

**Min-max scaling** squeezes a column into the range 0 to 1:

`scaled = (value - min) / (max - min)`

If incomes run from $20,000 to $120,000, an income of $45,000 becomes (45,000 - 20,000) / 100,000 = 0.25.

Standardizing is a good default. Min-max is handy when a method expects a fixed range, such as pixel brightness.

> Watch out: both scalings are pulled by outliers, and min-max is the easiest to see. An outlier is a value far from the rest. The smallest and largest values decide what 0 and 1 mean, so one extreme value decides the range for everyone.

[[figure:scaling-and-encoding/outlier-squeeze|One value of 240 among values from 40 to 60. Min-max puts the other eleven values between 0 and 0.1. Standardizing squeezes them too, between -0.49 and -0.11. Without the 240 they would spread over about -1.6 to +1.6.]]

Look at a column's smallest and largest values before you scale it.

::: deeper What to do about outliers
Three common choices, each with a cost. **Clipping** caps values at a limit you pick, so an extreme value stops stretching the range. A **log transform** pulls in a long tail of large positive numbers, such as incomes. **Robust scaling** uses the median (the middle value when sorted) and the interquartile range (the spread of the middle half of the values) instead of the mean and standard deviation, so a few extreme values barely move it. None is always right: first ask whether the extreme value is a mistake or a real person.
:::

## A worked example
*Can scaling change who counts as nearest?*

> Worked example: three people with (income, age): Ana ($51,000, 30), Ben ($50,000, 60) and Cy ($55,000, 33). Who is most like Ana?

**Raw distances.**
- Ana to Ben: the gaps are 1,000 and 30, so the distance is the square root of 1,000,000 + 900 = 1,000,900, about 1,000.4.
- Ana to Cy: the gaps are 4,000 and 3, so the distance is the square root of 16,000,009, about 4,000.0.

Raw distance calls Ben four times closer, though he is 30 years older.

## The same example, scaled
*Does the ranking change once the columns match?*

Same three people: Ana ($51,000, 30), Ben ($50,000, 60) and Cy ($55,000, 33).

**Standardize.** Mean income = (51,000 + 50,000 + 55,000) / 3 = 52,000. Mean age = (30 + 60 + 33) / 3 = 41.

- Income gaps from the mean: -1,000, -2,000, +3,000. Squares: 1,000,000, 4,000,000, 9,000,000. Their average is 14,000,000 / 3, about 4,666,667, and the square root is about 2,160.
- Age gaps: -11, +19, -8. Squares: 121, 361, 64. Their average is 546 / 3 = 182, and the square root is about 13.49.

| Person | Income z | Age z |
|---|---|---|
| Ana | -1,000 / 2,160 = -0.46 | -11 / 13.49 = -0.82 |
| Ben | -2,000 / 2,160 = -0.93 | +19 / 13.49 = +1.41 |
| Cy | +3,000 / 2,160 = +1.39 | -8 / 13.49 = -0.59 |

**New distances.**
- Ana to Ben: gaps 0.47 and 2.23, so the distance is the square root of 0.22 + 4.97, about 2.3.
- Ana to Cy: gaps 1.85 and 0.23, so the distance is the square root of 3.42 + 0.05, about 1.9.

(These use the rounded z-scores in the table. A calculator on the unrounded values gives 2.27 and 1.86.)

Now Cy is the nearest, which is what a person would say. The ranking flipped because age finally counts. Min-max gives the same ranking: 1.02 to Ben and 0.81 to Cy.

## Which models need scaling
*Who is hurt by unequal units, and who is not?*

Scaling matters for any method that measures distance between rows. k-NN measures it to find neighbors. Clustering methods such as k-means and DBSCAN, which come in later courses, measure it from every point to a center or to its neighbors. For all of them a column in large units quietly takes over.

A decision tree is different. Each of its splits compares one feature with a threshold, so changing a column's units does not change which rows end up on which side. Trees do not need scaling.

Scaling changes the neighbors, not only the numbers. In the Scale it lab with no scaling, the five nearest neighbors of one query are the five people closest in income, whatever their ages. Scale the columns and the same query gets neighbors that are close in both features. The accuracy of the k-NN model changes with them.

> Key idea: scale the features whenever the model compares rows by distance. Scale the features, not the class label: a class label is a name, not a quantity.

## Scaling beside one-hot columns
*How big is a mismatch in a category compared with a gap in a number?*

In "Missing values and encoding" a category became one-hot columns, with a 1 for the row's category and 0 in the others. These columns already sit between 0 and 1, like a min-max column, and this lesson leaves them as they are.

Take two people who differ in color, say red (1, 0, 0) and blue (0, 0, 1). Two columns differ, each by 1, so the distance from color alone is the square root of 1 + 1, about 1.41. The Scale it lab draws this table under its comparison.

[[figure:scaling-and-encoding/one-hot|A color column becomes three columns, with exactly one 1 in each row. Any two different colors are 1.41 apart.]]

Now put color beside a standardized number. A color mismatch costs about as much as a gap of 1.41 standard deviations in a standardized feature. Both sit on a comparable scale, so each has a say.

Leave the numbers raw and color vanishes. A mismatch adds 2 to the squared distance, while an income gap of $1,000 adds 1,000,000.

## Fit the scaler on training rows
*Where should the mean and standard deviation come from?*

A **scaler** is a rule such as standardizing, together with the numbers it learned: the mean and standard deviation, or the minimum and maximum. To **fit** a scaler is to compute these numbers from some rows. As with the imputer and the encoder in the last lesson, fit it on the training rows only, then reuse the same numbers, unchanged, on the test rows and on any new data. "Train, validation and test" explains why a test row must stay unseen.

[[figure:scaling-and-encoding/no-leak|The scaler is fitted on training rows only, then reused unchanged on test rows.]]

A test value can land below 0 or above 1 under min-max. That is normal: the row is outside what training saw. Refitting on the test rows would leak: the test data would shape the inputs, as in the last lesson.

## Step order and the lab shortcut
*In what order do the steps run, and what does the lab skip?*

Fill the gaps first, then encode, then scale, all fitted on the training rows. A blank cannot be scaled, and the mean must come from filled data. The next lesson, "Pipelines and leakage", chains these steps so the order is right every time and measures what leakage does.

The Scale it lab fits its scalers on all 60 people, the shortcut this lesson warns against. It is harmless there: the lab only shows how scaling changes neighbors.

::: remember
- Distance adds up raw differences, so the feature with the biggest numbers dominates unless you scale. Trees do not care; k-NN and clustering do.
- Standardize with z = (value - mean) / standard deviation, or min-max with (value - min) / (max - min). One outlier stretches both. Fit either on training rows only and reuse the numbers.
- One-hot columns already sit between 0 and 1, and two different colors are 1.41 apart, so scaled numbers and one-hot columns have a comparable say in a distance.
:::

@@lab

## Lab: Scale it
Sixty people are described by income in dollars and age in years. The two groups differ mainly by age: **Group A (younger)** and **Group B (older)**. A k-NN model decides the group of the diamond, the query, from its nearest neighbors. You choose how the numbers are scaled first. The lab has generated data only, so the last experiment takes the idea to real penguins with a pencil.

### Controls
- **Scaling** chooses **None (raw numbers)**, **Standardize (z-score)** or **Min-max (0 to 1)**. The plot always shows the data as the model sees it, on axes of equal scale, and the axis titles change with the scaling. With None the age axis uses the same dollar-sized scale as income, so ages 18 to 70 sit at the very bottom.
- **k (neighbors that vote)** sets how many nearest neighbors vote, from 1 to 15.
- **Query income** and **Query age** place the diamond exactly. You can also drag the diamond, click the plot, or use the arrow keys on the plot (Shift moves further). With None, dragging moves income only, because the plot has no room for age: use **Query age**.
- **Show the k nearest neighbors** rings each voter, draws a dashed line to it and shades the circle that just reaches the farthest voter.
- **Fullscreen** and **Reset** come with every lab. Reset returns to None, k = 5 and the starting query ($85,000, age 27).

### Reading the screen
- The legend names **Group A (younger)**, **Group B (older)**, **Query (draggable)** and, while the neighbors are shown, **Ringed: its k nearest neighbors**.
- The status line reads, for example, "None: leave-one-out accuracy 42% at k = 5". Leave-one-out accuracy treats each person in turn as unknown and classifies them from the other 59.
- The detail line gives the query and its vote, for example "Query ($85,000, age 27) is predicted Group B: 2 votes for Group A, 3 for Group B." With None, the plot also says "All 60 people sit on this thin strip at the bottom."
- The table **Compare the three scalings** has the columns **Scaling**, **Accuracy**, **Predicted** and **Neighbors** for all three scalings at once, and marks the one on the plot with "(shown)". **Neighbors** lists the groups of the k nearest neighbors, closest first.
- Under the table, a second table shows one-hot encoding of a color column: the columns is_red, is_green and is_blue, with one 1 in each row.

### Experiments
1. Predict: with **Scaling** on **None (raw numbers)** and **k (neighbors that vote)** at 5, which group does the 27-year-old query get, and how often is the model right? Then read the detail line and the table. The query is predicted Group B, **Neighbors** reads A A B B B, and **Accuracy** is 42%, worse than a coin flip. The five voters earn between $84,700 and $86,300 but are aged 18, 26, 45, 59 and 60. Explain why: with no scaling, only income picks the neighbors.
2. Predict: what will switching **Scaling** to **Standardize (z-score)** do to the neighbors and the accuracy? Try it, then **Min-max (0 to 1)**. The points spread into a real scatter, **Accuracy** jumps to 92% for both, and the query is predicted Group A with five Group A neighbors. Now set **Query age** to 40: Standardize predicts Group B (3 votes to 2) and Min-max predicts Group A (3 votes to 2). Why can two good scalings disagree about a borderline point?
3. Predict: with **None (raw numbers)** and k = 5, will moving **Query age** from 27 to 60 change the neighbors? Try it. The **Neighbors** cell stays A A B B B, the same five people. Now choose **Standardize (z-score)** and repeat: the prediction moves from Group A at age 27 to Group B at age 60, with five Group B neighbors.
4. Predict: can a bigger **k (neighbors that vote)** rescue unscaled data? Slide k from 1 to 15 under each scaling and read **Accuracy**. None stays between 22% and 57% and never reaches 60%. Income alone does not tell the groups apart, so scores near or below 50% do not mean the lab is broken. Standardize stays between 92% and 95%, and Min-max between 90% and 93%, never more than 2 points apart. Changing k does not fix the units.
5. Predict: what shape will the shaded circle have under each scaling? Turn on **Show the k nearest neighbors** and drag the diamond. Under Standardize the circle is round and the voters are close in both features. Under None it is a tiny circle on the strip, and the voters are simply the people with the nearest income.
6. Predict: will raw distance or standardized distance pick the right species for a Chinstrap query? Then move to the real penguins by hand. The 342 penguins with measurements have a standard deviation of about 5.45 mm in bill length and 801 g in body mass. Take a Chinstrap query (46.5 mm, 3,500 g) with two candidates, candidate 1 an Adelie (36.7 mm, 3,450 g) and candidate 2 a Chinstrap (46.1 mm, 3,250 g), and find the nearest. Raw: candidate 1 is 51.0 away and candidate 2 is 250.0, so raw picks the wrong species. Divide each gap by its standard deviation: candidate 1 is 1.80 away and candidate 2 is 0.32, so standardizing picks the right one. Now check it on a fresh pick: an Adelie query (39.1 mm, 3,750 g) with candidate 1 a Chinstrap (51.3 mm, 3,750 g) and candidate 2 an Adelie (40.5 mm, 3,950 g). Raw gives 12.2 and 200.0, which picks the Chinstrap. Standardized gives 2.24 and 0.36, which picks the Adelie. At full size, leave-one-out k-NN with k = 5 on all 342 penguins scores 79% on raw bill length and body mass, and 93% with either scaling.
