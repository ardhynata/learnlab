---
slug: ensemble-lab
title: Ensemble lab
kind: simulator
simulator: ensemble-lab
minutes: 25
---
::: intro
- Predict which ensemble starts to overfit as you add trees, bagging or boosting, then check your guess in the Ensemble lab.
- Read training and validation curves against the number of trees, and find the early-stopping point.
- Explain how the learning rate, the depth of the boosting trees and the noise move that point, then repeat the test on real penguins with a fresh sample.

Before you start: read "Bagging and random forests" and "Gradient boosting" in this course.
:::

## What the lab compares
*What do you compare when you add trees one at a time?*

"Gradient boosting" ended with three questions. As you add trees, does bagging's validation error keep falling or turn up? And boosting's? Which shows the wider gap between training and validation? The Ensemble lab answers them.

It draws 200 points of two classes, two moons smeared by a Noise of 0.35, and splits them in half. 100 points train the trees; the other 100, the validation points, only check them. Both ensembles are fitted once for up to 100 trees. **Bagging** grows deep trees (up to depth 8, at least 3 points in a leaf) on bootstrap samples and averages them. **Boosting** adds depth-3 trees with a learning rate of 0.5, each correcting the trees before it.

A switch in the lab turns the bagging side into a random forest (see "Bagging and random forests"); the experiments use it once. The **Number of trees** slider only chooses how many of the 100 trees vote, so it never refits anything. The lab scores both ensembles with the **log loss** of "Log loss and fitting" and with the error rate, on the training and the validation points. Lower is better.

## Adding trees in stages
*What changes on the screen between 1 tree, 3, 10 and 100?*

The tint shows what each ensemble predicts, a stronger tint means a surer prediction, and the dots are the training points. Compare the 1-tree column with the 10-tree column: bagging's single tree has hard-edged regions with the strongest tint almost everywhere, while boosting's tints are softer. Then look at the 100-tree column and ask whether boosting draws small islands around single training dots. The number under each panel is the error rate on the validation points, and the table below gives the log loss behind the same panels.

[[figure:ensemble-lab/tree-by-tree|Bagging and boosting on the lab's default sample with 1, 3, 10 and 100 trees. The number under each panel is the error rate on the 100 validation points.]]

| Trees | Bagging: training / validation log loss | Boosting: training / validation log loss |
| --- | --- | --- |
| 1 | 1.11 / 4.96 | 0.43 / 0.44 |
| 3 | 0.11 / 0.63 | 0.20 / 0.28 |
| 10 | 0.11 / 0.62 | 0.03 / 0.25 |
| 100 | 0.08 / 0.54 | 0.00 / 1.02 |

Bagging's validation log loss starts huge, drops fast and then barely moves. Boosting's starts low, is 0.25 at 10 trees, and then climbs to 1.02 while its training log loss goes to 0.00. The same 100 training points are fitted ever more closely, and the validation points pay for it.

## One bagged tree is sure of itself
*Why does a single bagged tree score so badly on log loss?*

One deep tree gets 23 of the 100 validation points wrong, an error rate of 23.0%, but its validation log loss is 4.96. A leaf that holds only one class gives it probability 1 and the other class probability 0, and log loss punishes a confident mistake hard.

> Worked example: 14 of the 23 mistakes fall in a leaf that held only the other class, so the true class got probability 0. Log loss clips that to 1e-15, and -ln(1e-15) = 34.54. The 14 points add 14 × 34.54 / 100 = 4.84, nearly all of the 4.96. A wrong point whose true class got probability 0.25 costs only -ln(0.25) = 1.39.

Averaging fixes this. With 3 trees the leaves disagree, so the average sits between 0 and 1, and validation log loss falls to 0.63. That is bagging's job here: turn confident, unsteady votes into steadier probabilities.

::: deeper Why the chart cuts values off
The lab's chart tops out at a log loss of 2, or at an error rate of 60%. A value above the top is drawn as a triangle with its number, so the 4.96 of one bagged tree does not flatten the rest of the chart.
:::

## Two curves, two stories
*What does the validation curve do for each method?*

Now let the trees pile up. Solid lines are validation log loss and dashed lines are training log loss.

[[figure:ensemble-lab/two-curves|Training (dashed) and validation (solid) log loss against the number of trees on the default sample. The ring marks where boosting's validation log loss is lowest.]]

Boosting's validation curve falls to 0.21 at 8 trees, then turns up: 0.31 at 20 trees, 0.94 at 50 and 1.02 at 100. Its training curve keeps falling to 0.00. Every new tree fits the training points a little better, and from about the ring on the extra trees mostly fit noise.

Bagging's validation curve levels off: 0.59 at 20 trees and 0.54 at 50 and at 100, with its lowest value, 0.53, at 79 trees. It has a gap between training (0.08) and validation (0.54), but the gap does not grow as trees are added.

> Watch out: this is one sample at the default settings. The lab's Quick Quiz uses a rule: validation log loss at 100 trees more than 0.02 above its lowest value counts as "climbs back up". Other samples and settings can give another verdict.

## Early stopping
*How do you choose a number of trees without looking at the test set?*

The ring in the lab's chart marks the number of trees with the lowest validation value. Stopping there is **early stopping**. On the default sample it says 8 trees, with a validation log loss of 0.21. Letting boosting run to 100 trees costs more time and gives 1.02.

Until you check your prediction, the ring only knows the trees you have added. Drag **Number of trees** up from 3 and it follows the lowest value among them. It stops at 8 trees, and no later tree gets below that value.

> Key idea: the training curve cannot tell you when to stop, since it only falls. The validation curve can, because it turns up when the extra trees start to fit noise.

Two cautions. The validation points chose the number of trees, so 0.21 is a little flattering; a final score belongs on a test set, as in "Tuning with search". And near the lowest point a curve is flat, so the ring can jump a few trees on a tiny difference.

## Log loss shows more than error rate
*Why does the log loss curve turn up so much harder than the error rate?*

Switch **Chart shows** to **Error rate**. Boosting's validation error rate is 6.0% at 3 trees, its lowest, and 9.0% at 100: three more mistakes among 100 points. Its validation log loss went from 0.21 to 1.02, about 5 times. The ring now says 3 trees, not 8.

The error rate only asks which side of 0.5 a point is on. Log loss asks how sure the model was, and extra trees make a boosted model surer about everything.

> Worked example: a validation point of class 1 gets probability 0.4 after a few trees: wrong, and it costs -ln(0.4) = 0.92. After many more trees it gets 0.02: still wrong, and it costs -ln(0.02) = 3.91, that is 2.99 more. The error rate counts one mistake both times.

So log loss shows overfitting early, because it sees confidence. Watch both. With 100 validation points, one point is one point of error rate.

## What moves the stopping point
*Which settings make boosting stop sooner or later?*

The ring is not a fixed number. Each row changes one setting from the default sample, with **Chart shows** on **Log loss** and **Number of trees** at 100.

| Setting | Ring at (trees) | Lowest validation log loss | At 100 trees |
| --- | --- | --- | --- |
| Learning rate 0.10 | 40 | 0.22 | 0.42 |
| Learning rate 0.50 (default) | 8 | 0.21 | 1.02 |
| Learning rate 1.00 | 2 | 0.32 | 0.71 |
| Tree depth 1 | 45 | 0.18 | 0.29 |
| Tree depth 5 | 4 | 0.25 | 0.99 |
| Noise 0.00 | 11 | 0.09 | 0.11 |
| Noise 1.00 | 4 | 0.49 | 1.59 |

[[figure:ensemble-lab/learning-rate|Boosting's validation log loss for three learning rates. A smaller rate stops later and reaches a similar lowest value.]]

A smaller learning rate takes smaller steps, so it needs more trees. Rates 0.10 and 0.50 reach about the same lowest value, the same pattern as in "Gradient boosting", where the two smaller rates also reached the same best score. Deeper trees take bigger steps, so they overfit sooner. Less noise leaves less to memorize.

::: deeper When "neither" is the answer
With a small learning rate the lab can say "Neither curve climbs back up within 100 trees". That does not mean boosting cannot overfit: a small rate is slow and may need more than 100 trees before the curve turns.
:::

## Real penguins, fresh samples
*Does the pattern survive real data?*

Set **Data** to **Penguins (real data)**. The lab separates Adelie from Chinstrap penguins by bill length and bill depth. Of 220 such penguins, one has a missing measurement and is left out. That leaves 219 (151 Adelie, 68 Chinstrap): 110 train the trees and 109 check them. Press **New sample** to split them again.

| Sample | Boosting: ring (trees) / lowest | Boosting at 100 trees | Bagging: lowest / at 100 trees |
| --- | --- | --- | --- |
| 1 | 4 / 0.21 | 0.77 | 0.12 / 0.12 |
| 2 | 10 / 0.14 | 0.30 | 0.08 / 0.09 |
| 3 | 4 / 0.16 | 0.57 | 0.11 / 0.12 |
| 4 | 10 / 0.12 | 0.57 | 0.09 / 0.10 |
| 5 | 3 / 0.25 | 1.09 | 0.48 / 0.49 |

Boosting turned up on all five samples and bagging on none, but the ring moved between 3 and 10 trees. The shape of the result held and the best number did not.

::: remember
- Bagging's validation curve falls and then levels off, because averaging more trees only steadies the answer. Boosting's validation curve falls and then climbs, while its training curve keeps falling.
- Early stopping picks the number of trees at the lowest validation value. A smaller learning rate, shallower trees and less noise move it later, and the best number changes with the sample.
- Log loss shows overfitting earlier than the error rate does, because it sees confidence. Predict first, change one setting at a time, and repeat on real data with a fresh sample.
:::

@@lab

## Lab: bagging and boosting, tree by tree
Two ensembles learn the same noisy data. Bagging (or a random forest) is on the left and boosting on the right. You add trees, watch the regions and the curves, and look for the number of trees where boosting should stop.

### Controls
- **Data** switches between **Generated data** and **Penguins (real data)**. The real data separates Adelie from Chinstrap penguins. Changing it starts the Quick Quiz again.
- **Generated shape** is **Two moons** or **Checkerboard**. **Noise** (0 to 1, starts at 0.35) smears the moons, or flips more labels on the checkerboard. Both only apply to generated data.
- **Penguin measurement (x)** and **Penguin measurement (y)** pick two of **Bill length (mm)**, **Bill depth (mm)**, **Flipper length (mm)** and **Body mass (g)** for the real data. The two always differ.
- **Number of trees** (1 to 100, starts at 3) sets how many trees vote. It never refits. **Add a tree** adds one, and **New sample** draws a new generated sample, or a new split of the penguins.
- **Random forest: each split sees only some of the features** is off at the start. When on, the bagging side becomes a random forest. **Feature fraction (random forest)** (10% to 100%, starts at 50%) shows how many of the 2 features a split sees. Values from 10% to 70% give 1 of 2 features and 80% to 100% give 2 of 2, which is plain bagging.
- **Boosting learning rate** (0.05 to 1, starts at 0.50) and **Boosting tree depth** (1 to 5, starts at 3) set the boosting side. Bagging always grows its trees to depth 8 with at least 3 points in a leaf.
- **Chart shows** is **Log loss** or **Error rate**. **Show validation points** hides or shows the validation crosses.
- **Reset** (from the lab toolbar) returns every control to its starting value and goes back to the first sample.
- **Quick Quiz** is the button next to the **Controls** card (a round button at the bottom right on a phone). Its question is "As you keep adding trees, which method will start to overfit, and which will keep improving?". Pick an answer, then press **Check answer**. Changing the data, the noise, the shape, the random forest, the feature fraction, the learning rate, the depth or pressing **New sample** clears the verdict and starts a new round.

### Reading the screen
- Each plot has a caption such as **Bagging: 3 trees** (or **Random forest: 3 trees**) on the left and **Boosting: 3 trees** on the right. The dots are training points and the crosses are validation points. The background color is the predicted class, and a stronger tint is a more confident prediction.
- The chart **Training and validation log loss against the number of trees** (or **error**, with **Chart shows** on **Error rate**) has solid lines for validation and dashed lines for training: **Bagging, validation**, **Bagging, training**, **Boosting, validation** and **Boosting, training**. A value above the top is cut off and shown as a triangle with its number.
- The ring on the chart reads **early stop: N trees**. It marks the number of trees with boosting's lowest validation value, for the metric the chart shows. Until you check your answer, the lines and the ring only cover the trees you have added.
- The status line reads, at the start, "With 3 trees, validation log loss is 0.63 for bagging and 0.28 for boosting." The detail line gives the lowest validation value so far for each method.
- The table **Bagging and boosting side by side** has the columns **With 3 trees**, **Bagging** and **Boosting**, and the rows **Training log loss**, **Validation log loss**, **Best number of trees** and **Validation log loss at the best number**. With the error rate, the words become "error rate".
- After **Check answer** the chart shows all 100 trees. The verdict gives the validation log loss at 100 trees and its lowest value for each method.
- With real data, a note under the controls gives the penguin counts. The axes show the two measurements, scaled to 0 to 10.

### Experiments
Press **Reset** before each experiment so that your numbers match the ones below. Unless it says otherwise, the settings are the starting ones and **Chart shows** is **Log loss**.

1. **Add trees in stages.** Predict: with only 1 tree, which ensemble has the lower validation log loss, bagging or boosting? Set **Number of trees** to 1 and read the table: bagging 4.96, boosting 0.44, and training log loss 1.11 and 0.43. Press **Add a tree** twice: at 3 trees validation log loss is 0.63 and 0.28. One bagged tree is deep and sure of itself, so its mistakes are costly. Why does a second and third tree help so much?
2. **Who overfits?** Predict: in the **Quick Quiz**, pick which method starts to overfit, then press **Check answer**. The verdict says boosting: 1.02 at 100 trees against its lowest value of 0.21 at 8 trees, while bagging is 0.54 against 0.53 at 79 trees. Drag **Number of trees** to 100 and find **early stop: 8 trees** on the chart. Then raise **Noise** to 1 and lower it to 0 and read the ring each time: it moves to 4 trees and to 11. Why does less noise push the ring right?
3. **Log loss or error rate?** Predict: if you set **Chart shows** to **Error rate**, will boosting's curve climb as steeply as before? Set **Number of trees** to 100 and make the switch. The table shows a validation error rate of 5.0% for bagging and 9.0% for boosting, and a best number of 3 trees for boosting (6.0%). The ring now reads **early stop: 3 trees**. Compare with 0.21 to 1.02 in log loss. What does log loss see that the error rate does not?
4. **Learning rate and depth.** Predict: if you lower **Boosting learning rate** to 0.10, will the ring move left or right, and will the lowest value get better or worse? Set **Number of trees** to 100 and try 0.10, then 1.00. The ring goes to 40 trees (0.22) and to 2 trees (0.32). Put the rate back to 0.50 and set **Boosting tree depth** to 1, then 5: the ring goes to 45 trees (0.18) and to 4 trees (0.25). Explain each move with step size.
5. **A random forest.** Predict: with 100 trees, will turning on **Random forest: each split sees only some of the features** lower bagging's validation log loss? Turn it on. The left caption becomes **Random forest: 100 trees** and validation log loss drops from 0.54 to 0.23 (switch **Chart shows** to **Error rate** and the error rate goes from 5.0% to 6.0%). Now raise **Feature fraction (random forest)** to 80%: it reads 2 of 2 features and the numbers return to plain bagging. Put **Feature fraction (random forest)** back to 50%. Press **New sample** with the forest on and then off: 0.20 and 0.18. Is a forest a sure win here, with only two features?
6. **Penguins, then a fresh sample.** Predict: on real penguins, will boosting's curve turn up again, and will the ring be at the same number of trees on a new sample? Set **Data** to **Penguins (real data)** and **Number of trees** to 100. Read the note under the controls: 219 penguins, 110 training and 109 validation. Press **Check answer**: boosting's lowest is 0.21 at 4 trees and it is 0.77 at 100, while bagging is 0.12 at 69 trees and 0.12 at 100. Switch **Chart shows** to **Error rate**: boosting is at 5.5% (6 of 109 penguins) and bagging at 4.6% (5 of 109), so the error rate hides what log loss shows. Switch back to **Log loss** and press **New sample** four times, writing down the ring each time: 10, 4, 10 and 3 trees. What stayed the same across the five samples, and what changed?
