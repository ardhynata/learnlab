---
slug: outlier-lab
title: Outlier lab
kind: simulator
simulator: outlier-lab
minutes: 20
---
::: intro
- Predict how one added outlier moves the mean, the median, the spread and the correlation, then check it in the lab.
- Explain why the same outlier matters more in a small sample than in a large one.
- Test an idea on generated points first, then on the real penguins with a fresh sample.

Before you start: read "Center and spread" and "Outliers and correlation".
:::

## What the lab asks
*What happens to the numbers you trust when one extra point joins the data?*

The last two lessons gave you a toolbox: the mean, the median, the standard deviation and the correlation r. They also gave you a warning, that one far-away point can drag some of these numbers and leave others alone. In this lab you add that point yourself and watch.

The lab starts with 15 generated points that rise from left to right. They are seeded, so everyone sees the same ones. Before any outlier, the numbers are:

| Statistic | x | y |
|---|---|---|
| Mean | 5.25 | 5.18 |
| Median | 4.93 | 5.02 |
| Standard deviation | 1.13 | 1.16 |

The correlation r between x and y is 0.87, a strong upward trend. The lab keeps these numbers in the **Without outlier** column of its table and puts the new numbers beside them, so you always see before and after. The rest of the lesson is a plan for what to try, and what to expect.

## Predict, change, explain, transfer
*Why should you guess before you click?*

A lab can turn into clicking until something moves. The plan below makes each click a small test of what you believe.

1. **Predict.** Pick an answer in a **Quick Quiz** box before you change anything.
2. **Change.** Add an outlier, drag it, or change the data.
3. **Explain.** Read the table and the picture, and say why the numbers moved the way they did.
4. **Transfer.** Repeat the idea on the real penguins and on a new sample.

[[figure:outlier-lab/predict-loop|The four steps of every experiment. The last one sends you back to the start with new data.]]

A wrong guess is the useful kind. If you guessed the median would move more and the lab says the mean, you have just found out where your picture of these numbers was off, and the explanation step is where you fix it.

> Key idea: predict first, then change one thing at a time, and explain every difference between your guess and the result.

## The mean moves more than the median
*How far does one extra value move each center?*

Press **Add outlier**. A point appears at x 5, y 9.3, far above the cloud. Look at the y column of the table. The mean of y goes from 5.18 to 5.43, a change of +0.26. The median goes from 5.02 to 5.13, a change of +0.12.

[[figure:outlier-lab/one-point|The default cloud with one outlier at x 5, y 9.3. Faded markers are before, solid ones after; the dashed line is the trend without the outlier.]]

> Worked example: the 15 values of y add up to 77.66. With 9.3 added, the sum is 86.96 for 16 values, so the mean is 86.96 / 16 = 5.43. A shortcut: the mean moves by (new value - old mean) / (number of values after adding), here (9.3 - 5.18) / 16 = 0.26.

## The median only steps
*Why does the median stay put when the outlier moves?*

The median only sees order. Sorted, the 16 values of y have the 8th at 5.019 and the 9th at 5.250, so the median is their average, about 5.13. Now drag the outlier down to about y 8. The mean falls to about 5.35, but the median stays at 5.13, because the outlier is still the largest value. Drag it up to the top edge, y 10, and the mean rises to 5.48 while the median is still 5.13.

> Watch out: "the mean moves about twice as far" is the default case, not a law. The median is not frozen: it steps to the next value, up to half a gap, and in a small sample that step can be large. With the outlier at x 9.5, y 9.5, the mean of x moves 0.27 and the median of x 0.28, and the first Quick Quiz box says "about the same".

::: deeper Why only the mean notices a taller outlier
The two centers use the outlier differently. The mean adds its full size to a sum, so a point 4 units above the cloud shifts the mean of y by about 4 / 16. The median only counts how many values lie above and below it. Moving the outlier from y 9.3 to y 10 adds 0.7 to the sum, so the mean rises by about 0.04, and changes nothing in the order, so the median does not move.
:::

## Correlation depends on where the point sits
*Does an outlier always make r smaller?*

Many people say yes. The second **Quick Quiz** box asks the question, and the answer is no. Correlation measures how closely the points hug a straight line, so what matters is where the new point sits relative to that line.

[[figure:outlier-lab/where-it-sits|The same 15 points with one outlier in three places. Far above the middle, r falls from 0.87 to 0.61. Far out along the trend, it rises to 0.93. Far out off the trend, it falls to 0.01.]]

The middle panel is the surprise. The point at x 9.5, y 9.5 is far from the cloud, so it is an outlier by any look, but it lies close to the line the cloud already follows. It makes the trend look stronger.

## A point inside the cloud
*What if the new point lands among the others?*

If you drop it inside the cloud, at about x 5 and y 5, nothing changes: r stays 0.87 and the means move by 0.02 at most. A point inside the cloud is not an outlier at all.

> Key idea: an outlier changes r by how far it is from the trend, not by how far it is from the middle. Far off the line lowers r, far along the line raises it.

## Spread and the trend line
*What else changes besides the centers?*

Look at the standard deviation of y in the table: it grows from 1.16 to 1.50 with the first outlier. The standard deviation uses squared gaps from the mean, so one big gap weighs a lot: the gap from the old mean is 4.12, and its square, about 17, is nearly as large as the 15 original squared gaps added together, about 20.

The trend line changes too. The dashed grey line is the best straight line through the 15 points, drawn as if the outlier were absent. The solid pink line fits all 16. With the outlier at y 9.3 it tilts a little: it rises 0.89 for each step right before, and 0.84 after.

Now click **Add outlier** two more times. The lab places the second one at the bottom right and the third at the top left. Then r falls to 0.07 with two outliers and to -0.18 with three, and the pink line tilts downward: its slope is -0.21. Three points out of 18 turned a clear upward trend into a faint downward one.

> Watch out: this is why you plot before you quote an r. A summary can be a poor description of the 15 points that carry the real pattern.

## How many points you have
*Does the same outlier matter as much in a bigger sample?*

Leave one outlier at x 5, y 9.3 and change **Number of points**. The effect shrinks fast, as the figure shows.

[[figure:outlier-lab/more-points|The same outlier added to the first n points of the generated cloud. The mean shifts less as n grows, and the median shifts less still.]]

> Worked example: for 200 points, the mean of y is 5.11, so the shortcut gives (9.3 - 5.11) / 201 = 0.02. The mean barely moves. With 6 points, the mean of y is 4.62 and the shortcut gives (9.3 - 4.62) / 7 = 0.67, a jump more than 30 times larger.

The same happens to r. With 6 points it falls from 0.71 to 0.40. With 200 points it falls only from 0.86 to 0.83. One point out of 201 cannot bend a line that 200 others agree on.

An outlier is a bigger threat when data is scarce, so look harder at it when you have few rows.

## One outlier on real data
*Does the idea survive real penguins?*

Press **Reset**, then set **Data** to **Penguins (real)**. The lab plots flipper length against body mass for 342 of the 344 penguins in the table; two rows have missing values and are left out. On all 342, r is about 0.87, the same number you met in the last lesson. The lab shows 15 of them, picked by a seeded shuffle.

On the first sample of 15, r is 0.65. Add an outlier at 200 mm and 6.65 kg, which is where the lab puts the first one. The flipper is ordinary, the mass is above every penguin in the table (the heaviest weighs 6.3 kg), and a 200 mm flipper normally goes with about 3.9 kg, so the pair lies far from the trend. r falls to 0.51, and the mean body mass goes from 3.96 to 4.13 kg.

## Fresh samples
*Does the result hold on a new sample?*

Now press **New sample** three times. Without the outlier, r is 0.94, 0.90 and 0.79 on the next three samples, so a small sample's r moves around by itself. With the outlier it is 0.76, 0.77 and 0.53. In all four samples the outlier pulled r down, and the effect fades with more points: on the first sample, at 200 penguins r goes from 0.85 to 0.83.

Four samples is a small check, not a proof. Always compare "with" and "without" on the same sample.

::: remember
- A far outlier keeps dragging the mean, while the median only steps to the next value; r changes with how far the outlier sits from the trend, and can go up or down.
- The same outlier matters less as the number of points grows: the mean shifts by about (new value - old mean) / (n + 1).
- Quick Quiz, change one thing, explain the result, then repeat it on real data and a fresh sample before you believe it.
:::

@@lab

## Lab: outliers and statistics
You start with 15 generated points that rise from left to right and no outlier. You add up to three outliers and watch the statistics, the trend line and r change. Everything that changes is shown next to its value without the outliers.

### Controls
- **Data** switches between **Generated data** and **Penguins (real)**. The real data plots **Flipper length (mm)** against **Body mass (kg)**. Switching data removes your outliers and your predictions.
- **Number of points** (6 to 200, or up to 342 with the real data; starts at 15) sets how many points the cloud has. A bigger number keeps the points you already had and adds more. With the real data it shows the first n of a seeded shuffle of the 342 penguins.
- **New sample** draws a new generated cloud, or a new random set of penguins. Your outliers stay where they are.
- **Add outlier** adds an outlier far from the cloud. The first one lands at x 5, y 9.3. The button is disabled at three outliers.
- **Remove outlier** removes the selected outlier. It is disabled when there is none. Removing the last one also clears both predictions.
- **Show mean and median** and **Show trend line** hide or show those markers and lines. Both start on.
- **Fullscreen** enlarges the lab. **Reset** returns to generated data, 15 points, the default sample, no outliers, both toggles on and the predictions cleared.
- On the plot: click empty space to add an outlier, drag an outlier to move it, double-click it to remove it. With the keyboard, focus the plot, press Enter to add an outlier (with three, Enter picks which one is selected), use the arrow keys to move it (Shift for bigger steps), and Delete to remove it.
- **Quick Quiz** is the button under the settings card (a round button at the bottom right on a phone); it holds two quizzes (use the arrows in its panel to move between them): "You add outliers far from the cloud. Which moves more: the mean or the median?" and "Does adding an outlier always make the correlation r smaller?". Pick an answer first, then add an outlier to see if you were right.

### Reading the screen
- The plot shows the **Data** points, the **Outlier (drag it)** diamond, and, while **Show mean and median** is on, the **Mean (ring)** and the **Median (cross)**. After you add an outlier the markers from before are faded, the new ones are solid, and a short line shows how far each moved. With more than one outlier each one is numbered 1, 2, 3 and the selected one has a ring.
- The dashed grey line is the trend without the outliers. The solid pink line is the trend with them.
- The status line reads "Correlation r: 0.87 without the outlier, 0.61 with it." With no outlier it says "Correlation r: 0.87. No outlier yet: click the plot to add one." The detail line gives each outlier's position, for example "Outlier: x 5.00, y 9.30." At the right of the status box, a count such as "15 points + 1 outlier".
- The **Quick Quiz** boxes answer once you have picked an option and an outlier exists. The verdict says whether you predicted it and what happened, with numbers, for example "For y, the mean went from 5.18 to 5.43 and the median from 5.02 to 5.13."
- The table **Statistics without and with the outlier** has the columns **Statistic**, **Without outlier**, **With outlier** and **Change**, and the rows **Number of points**, **Mean of x**, **Mean of y**, **Median of x**, **Median of y**, **Standard deviation of x**, **Standard deviation of y** and **Correlation r**. With the real data, x and y become flipper length and body mass. The change is signed, in bold when it is 0.005 or more. With more than one outlier the headers read **Without outliers** and **With outliers**. Standard deviation divides by the number of points.

### Experiments
The numbers below are for the default sample. If you pressed **New sample**, press **Reset** first so that yours match.

1. **Mean or median?** Predict: in the first Quick Quiz box, pick which moves more when you add outliers far above the cloud. Then press **Add outlier**. In the table, the mean of y changes by +0.26 (5.18 to 5.43) and the median of y by +0.12 (5.02 to 5.13). Check the standard deviation of y as well: 1.16 to 1.50. Why does the mean move about twice as far?
2. **Move it to the right place.** Setup: press **Remove outlier**, which clears both boxes. Predict: in the second box, pick whether r always falls. Press **Add outlier**, then drag it to the top right, about x 9 and y 9.5. Look at **Correlation r** in the status line and the table: it rises above 0.9. Now drag it to the bottom right, about x 9.5 and y 1: r drops to nearly 0. Where does the outlier lie, relative to the dashed line, when r rises? The first box may now say "about the same": on x, the mean and the median move about 0.23 to 0.28 each, so check the table before you trust one verdict.
3. **A point inside the cloud.** Predict: what happens to r and the means if you drag the outlier into the middle of the cloud, about x 5 and y 5? Try it. r stays near 0.87 and the means change by 0.02 or less. The first box may name the median, but read the table: the medians move by 0.04 or less, so nothing moved much. What makes a point an outlier, then?
4. **More points.** Predict: with the outlier at x 5, y 9.3, what does **Number of points** do to the change in the mean of y? Then press **Remove outlier** and **Add outlier** to put it back there. Try 6, 50 and 200, and read the **Change** column. It shrinks from +0.67 to +0.08 to +0.02. Explain it with (new value - old mean) / (n + 1).
5. **Three outliers.** Predict: how many outliers does it take to turn r negative? Then press **Reset** and press **Add outlier** until the button is disabled and read the status line after each one: r goes 0.61, 0.07, -0.18. Switch off **Show trend line** and back on to see the dashed and solid lines. Then press **Remove outlier** and watch r come back.
6. **Penguins and a new sample.** Predict: if you add an outlier at 200 mm and 6.65 kg to the penguins, will r fall, and by how much? Then press **Reset**, set **Data** to **Penguins (real)** and press **Add outlier**; the first one lands there. On the first sample r falls from 0.65 to 0.51. Now press **New sample** three times, and note r with and without the outlier each time: 0.94 to 0.76, 0.90 to 0.77 and 0.79 to 0.53. The first box may say "about the same" on some samples, so check the table. Then raise **Number of points** to 200: on this fourth sample r goes from 0.86 to 0.84. Does the idea survive a fresh sample, and what changes with a bigger one?
