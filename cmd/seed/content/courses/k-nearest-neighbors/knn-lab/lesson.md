---
slug: knn-lab
title: k-NN lab
kind: simulator
simulator: knn
minutes: 20
---
::: intro
- Predict how the test score of a k-NN model changes when you change k, and check it in the k-NN lab.
- Stretch one feature and explain, with distances, why the neighbors and the boundary change.
- Test the idea on the real penguins, then on a fresh draw of training points, before you trust it.

Before you start: read "How k-NN decides", "Tuning k" and "Distance and similarity". The lab uses the vote, the choice of k and the distance from those three lessons.
:::

## What the lab asks
*What do you do in the lab, and what is on the screen when it opens?*

The k-NN lab has one question: when you change k, or rescale one feature, which test points does k-NN get right? It opens on 48 generated training points in two classes, A and B. The plot holds a query point, the diamond, in the middle. Its k nearest training points vote for its class, and the lab marks them.

At the start k is 3 and the distance is Euclidean. The diamond is class B, because 2 of its 3 neighbors voted B. The lab also scores the model on 40 fixed test points: **34 of 40**, which is 85%. Every experiment below changes one setting and reads that score again.

Each experiment follows the same four steps as the rest of the course. **Predict** the result before you touch a control, **change** one setting, **explain** the result with distances and votes, and **transfer** the idea to real data. The last step makes it count, so the final experiments use the real penguins and a fresh draw of the training points.

## Why the test points stay fixed
*Why does the score count test points and not training points?*

The 40 test points are drawn once and never move. They are not allowed to vote: only the 48 training points do. So each test point is classified by neighbors that have never seen it, as a new example would be. In "Tuning k" you saw why this matters: at k = 1 the training points would score a perfect 100%, because every point is its own nearest neighbor.

Because the test points are the same under every setting, a change in the score comes from your change and from nothing else. That is how you compare two boundaries: same test points, different setting.

It also tells you how much to trust a small change. One test point is 1 of 40, or 2.5 percentage points. A move of one or two points is the size of change that another random set of points can produce by luck. Look for changes of several points, and repeat on a fresh draw before you believe a small one.

> Key idea: compare settings on the same test points, and treat a change of one or two of 40 as noise until a fresh draw agrees.

## Turning k
*What does a bigger k do to the score?*

Drag **Neighbors (k)** to 1. The diamond turns A: its single nearest neighbor is an A point, and at k = 3 two B points outvote it. Now go up to 15. The score on the default clusters rises from 34 to 38 of 40, and the diamond says B again, with 9 of its 15 neighbors voting B.

[[figure:knn-lab/accuracy-by-k|The lab's score at every k from 1 to 15 on each generated dataset. The dashed line marks k = 3, where the lab starts.]]

Bigger k is not always better. On Concentric rings the score is 40 of 40 at k = 3 and 39 at k = 9, then it falls to 33 at k = 11, 22 at k = 13 and 26 at k = 15. All the misses are on the outer ring. Each ring has 24 points, but with 15 voters an outer-ring test point reaches into the inner ring, and the inner points outvote its own ring. On Checkerboard the score is 40 of 40 at every k except k = 3, where it is 39, so there the choice hardly matters.

> Watch out: the best k belongs to the data. The clusters want a larger k to smooth over their overlap, and the rings want a small one so that each ring stays whole.

## Stretching one feature
*What does the stretch slider do to distance?*

Stretching a feature multiplies it by a number before any distance is computed. The points do not move on the plot: the axes keep their true units. Only the neighbors change, because a gap along the stretched feature now counts more.

Set **Stretch the horizontal feature** to ×5 with k = 3. The diamond flips from B to A.

[[figure:knn-lab/stretch-neighbors|The same query and the same three-neighbor vote, without and with the horizontal feature stretched by 5. On the right the picture is drawn in stretched units, so only a narrow strip of the original plot is left.]]

The nearest neighbor, an A point directly above the query, keeps its distance of 0.21, because it has almost no gap across. The B point that was second sat to the side of the query, with a gap across of about 0.21. That gap becomes about 1.04, and the point falls to third place. An A point with a larger gap up takes second place, and A wins 2 to 1. Stretching the horizontal feature makes "near" mean "has a similar horizontal value".

> Key idea: stretching one feature is a vote about which feature should decide who is near. At ×1 both features count equally in the plot's own units.

## A stretch can help or hurt
*Does stretching a feature raise the score?*

Not by itself. It helps only when the stretched feature carries what separates the classes. Use the **Quick Quiz** box to commit to a guess, then try it.

[[figure:knn-lab/accuracy-by-stretch|The score at k = 3 as the horizontal or the vertical feature is stretched from ×1 to ×10. On the rings both lines fall; on the clusters they rise and fall by up to four points.]]

On Concentric rings, one class is a ring around the other, and the class depends on the distance from the center in every direction. Stretch either feature and "near" is no longer round. At ×5 the score drops from 40 to 35 of 40, and at ×10 to 33 for the horizontal and 32 for the vertical feature. On the default clusters both features carry the class, so the picture is mixed. At ×5 the score is 36 of 40 for the horizontal feature and 38 for the vertical one, a gain of 2 and 4. At ×10 it is 35 and 34.

Use **Keep this boundary to compare** before you change a setting. It saves the current boundary as a dashed line and shows the change in the score, for example "Now: 35 of 40 (−5)".

## Real penguins: units decide
*Why does the real data behave differently?*

Switch **Data source** to **Penguins (real)**. The lab plots **Flipper length (mm)** across and **Body mass (g)** up, and the classes are the species. It starts with 48 training penguins and tests on 69 held-out ones.

The two features come in very different units. Across the 342 penguins with both measurements, the standard deviation, a typical spread around the average, is about 14 mm for flipper length and about 800 g for body mass, a ratio of about 57. Grams are big numbers, so body mass dominates every unstretched distance. The query sits at 200 mm and 4,500 g. Its three nearest training penguins are a Chinstrap at 205 mm and 4,500 g, a Gentoo at 211 mm and 4,500 g and an Adelie at 191 mm and 4,600 g.

[[figure:knn-lab/gap-bars|For the Adelie neighbor, a flipper gap of 9 mm and a mass gap of 100 g. Stretching the flipper length makes its bar grow until it nearly matches the mass bar.]]

> Worked example: for the Adelie, the gaps are 9 mm across and 100 g up. With no stretch the distance is the square root of (81 + 10,000), which is 100.4. With flipper length stretched by 10, the across gap is 90, and the distance is the square root of (8,100 + 10,000), which is 134.5. For the Chinstrap, the gaps are 5 and 0, so the distance goes from 5 to 50.

The slider stops at ×10, well short of the ratio of 57, yet it already matters. Near neighbors have small mass gaps, like the 100 g above, and a stretch of ×10 makes 10 mm count as much as 100 g. At k = 3 the score is 51 of 69 at ×1, 53 at ×5 and 52 at ×10. At k = 1 it goes from 46 to 51. Stretching body mass changes nothing, because mass was already deciding.

## Why the score stays near 75%
*What does the stretch not fix?*

The score stays near 75% for another reason. Only 5 of the 48 training penguins are Chinstrap, so a Chinstrap test point seldom finds two Chinstrap neighbors among its three. At k = 3, at most 1 of the 14 Chinstrap test points is classified correctly at any stretch. The stretch helps with the units, but it cannot add Chinstrap examples.

## A fresh draw
*Does the result survive a new set of training points?*

**Randomize** draws a new set of training points and keeps the 69 test penguins. Each draw uses a random seed, the number that fixes which points are drawn, so your numbers will differ from the ones here. **Reset** brings back the shared draw. On the shared draw the stretch gained 1 point at k = 3. Is that typical?

Over 1,000 random draws, flipper length at ×10 with k = 3 lost 1 to 3 test points on about 4% of them and tied on about 5%. It gained on the rest, and by about 4 test points on average over all draws. The shared draw is on the low side, and a single sample understates the effect.

Run the same check on the generated clusters and the answer changes. Over the same kind of 1,000 draws, the horizontal ×5 stretch changed the score by anything from −9 to +5 test points, and by 0 on about 29% of them. The idea that transfers is "stretch the feature that carries the class, when the units are unequal". The idea that does not is "stretch always helps". Scaling every feature to a common range first removes the unit trap before you start. It is covered in the lesson "Scaling and encoding" of the course "Preparing tabular data".

::: deeper Why a stretch changes distance, not the data
A stretch of s on the horizontal feature changes the Euclidean distance between two points from the square root of (dx² + dy²) to the square root of (s² × dx² + dy²), where dx and dy are the gaps across and up. At s = 1 nothing changes. As s grows, dx² is multiplied by s², so a pair of points that differ a little across soon ends up farther apart than a pair that differ only up. For the Adelie above, s = 10 turns 81 into 8,100. A pair with dx = 0 keeps its distance at every s.
:::

::: remember
- Compare settings on the same test points, and treat a change of one or two of 40 as noise until a fresh draw agrees.
- A larger k smooths the boundary and helps on overlapping classes, but it can erase a narrow structure such as a ring.
- Stretching a feature makes it count more in every distance. It helps when that feature carries the class and the units are unequal, and it hurts when the structure needs both features equally.
:::

@@lab

## Lab: k-NN with a stretch
The lab opens on 48 generated training points in two classes, A and B, 40 fixed test points and a query point in the middle, with k = 3, the Euclidean distance and no stretch. It reads "Test points classified correctly: 34 of 40 (85%)".

### Controls
- **Data source** switches between **Generated data** and **Penguins (real)**. The real data plots **Flipper length (mm)** against **Body mass (g)**, and the class is the species. A note under the control says how many penguins are used, that 69 are held out as test points and that the **Dataset** menu applies to generated data only.
- **Dataset** has **Overlapping clusters**, **Concentric rings** and **Checkerboard**. It is switched off with the real data.
- **Distance** has **Euclidean** and **Manhattan**.
- **Neighbors (k)** goes from 1 to 15 and starts at 3.
- **Stretch which feature** chooses **Horizontal feature** or **Vertical feature**. With the real data the choices are **Flipper length (horizontal)** and **Body mass (vertical)**.
- The stretch slider goes from ×1 to ×10 and starts at ×1. Its label follows the feature: **Stretch the horizontal feature**, **Stretch the vertical feature**, **Stretch flipper length** or **Stretch body mass**.
- **Number of points** sets how many training points there are, from 4 to 400 (with the real data, up to the 273 training penguins). It starts at 48. **Randomize** draws a new set of training points; the test points stay the same.
- **Show decision regions** and **Show test points** are both on at the start.
- **Keep this boundary to compare** saves the current boundary as a dashed line. **Clear kept boundary** removes it. Changing **Dataset**, **Number of points** or **Data source**, or pressing **Randomize**, also clears it, because the boundary no longer fits the points.
- **Quick Quiz** is the button under the settings card (a round button at the bottom right on a phone) (its badge counts the quizzes you have not answered; it opens a small panel). It asks "What happens to the test accuracy when you stretch one feature to ×5 or more? Pick an answer, then set the stretch slider." The choices are **It goes up**, **It stays about the same** and **It goes down**.
- On the plot, click or drag to place the query point. With the plot focused, the arrow keys move it by a quarter unit, and Shift moves it a whole unit.
- **Fullscreen** enlarges the lab. **Reset** puts back the shared set of points and the starting settings: k = 3, **Euclidean**, **Overlapping clusters**, 48 points, no stretch, **Horizontal feature**, the query in the middle, an empty **Quick Quiz** box and no kept boundary. It leaves **Data source** and the two **Show** switches as you set them.

### Reading the screen
- The status line reads "Prediction: class B" with a color swatch, and the line under it says "2 of 3 neighbors voted B." or, on a tie, "Votes tie, so the closest neighbor decides." The bar above the plot splits the votes by class, with labels such as "Class A · 1". With the real data the labels are the species.
- The diamond is the query. It takes the color of its predicted class, and a line joins it to each of its neighbors, which are drawn larger with a dark outline.
- Training points are filled dots. Test points are outlined squares in their true class color, and a **×** on a test point means it was classified wrong. The legend names **Training point**, **Test point (fixed)**, **Test point classified wrong**, **Boundary now** (the solid line) and **Kept boundary** (the dashed line).
- The score line reads "Test points classified correctly: 34 of 40 (85%)". After you press **Keep this boundary to compare**, the line under it reads, for example, "Kept boundary (k = 3, Euclidean, no stretch): 40 of 40 correct. Now: 35 of 40 (−5)."
- After you pick an answer in **Quick Quiz** and set the slider to ×5 or more, the box says whether you predicted it and compares the score with the one at no stretch. A change of 1 test point or less counts as "about the same".

### Experiments
Press **Reset** before each experiment, and read the numbers off the score line. They are for the shared points; **Randomize** changes them. **Reset** keeps **Data source** as you left it, so set it to **Generated data** for experiments 1 to 4.

1. **Turn k.** Predict: on the default clusters, will k = 1 or k = 15 score higher? Drag **Neighbors (k)** to 1: the diamond turns A and the score is still 34 of 40 (85%). Drag it to 15: the diamond is B with "9 of 15 neighbors voted B.", and the score is 38 of 40 (95%). With **Show decision regions** on, watch the small islands of one class disappear as k grows. Explain: what do 15 voters average out?
2. **Rings and k.** Predict: on **Concentric rings**, which k keeps both rings whole? Set **Dataset** to **Concentric rings** with k = 3: 40 of 40 (100%). Press **Keep this boundary to compare**, then drag k to 15: the line reads "Now: 26 of 40 (−14)". Walk through 9, 11 and 13: 39, 33 and 22 of 40. Find the crosses: they are on the outer ring. Explain: both rings have 24 points, so why does an outer-ring test point lose the vote at k = 15?
3. **Stretch a ring.** Predict: in the **Quick Quiz** box, pick what a stretch does to the score on the rings. Set **Dataset** to **Concentric rings** with k = 3, press **Keep this boundary to compare**, then set the slider to ×5. The score is 35 of 40 (−5), and the box answers "It goes down". Move to ×10: 33 of 40 (−7). Set **Stretch which feature** to **Vertical feature**: 32 of 40 at ×10. Explain: the class depends on the distance from the center in every direction, so what does a stretch do to "near"?
4. **Stretch the clusters.** Predict: on **Overlapping clusters**, will the same stretch help? Set the slider to ×5 with **Horizontal feature**: 36 of 40, up 2. Switch to **Vertical feature**: 38 of 40. Now set k to 1: 32 of 40, down 2 from the 34 you have at k = 1 with no stretch. Press **Randomize** a few times and repeat the horizontal ×5: it sometimes helps and sometimes hurts. Explain: both features carry the class here, so is a change of 2 of 40 a result or noise?
5. **The penguins.** Predict: does stretching **Flipper length (horizontal)** to ×10 help? Set **Data source** to **Penguins (real)**: with k = 3 the score is 51 of 69 (74%), and the diamond is a Chinstrap on a tie. Set k to 1: 46 of 69 (67%). Press **Keep this boundary to compare** and set the slider to ×10: 51 of 69 (+5). Set **Stretch which feature** to **Body mass (vertical)** with the slider at ×10: the score is back at 46, a change of 0. Explain with the worked example: which feature was already deciding the neighbors? Then set k to 3 and look at the crosses: 14 of the 18 are on Chinstrap test points.
6. **A fresh draw.** Predict: will the gain from flipper length at ×10 hold on new training points? With the real data and k = 3, press **Randomize**, then read the score at ×1 and at ×10, and repeat for at least five draws. In 1,000 random draws the stretch lost on about 4%, tied on about 5% and gained on the rest, so expect gains on most draws but not all. Then set **Data source** back to **Generated data**, choose **Overlapping clusters**, and repeat the horizontal ×5 on a few draws. Explain: which sentence about stretching survives both datasets, and which does not?
