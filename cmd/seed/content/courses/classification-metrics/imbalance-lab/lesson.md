---
slug: imbalance-lab
title: Imbalance lab
kind: simulator
simulator: imbalance-lab
minutes: 25
---
::: intro
- Predict how the share of positive examples changes the accuracy of a majority-class baseline and the recall of a trained model, then check it in the lab.
- Explain what class weight and the decision threshold change, and what each one costs in precision.
- Test an idea on generated data first, then on the real penguins with a fresh sample.

Before you start: read "Confusion matrix and rates", "Measuring a classifier" and "Class imbalance".
:::

## What the lab shows
*What does the Imbalance lab compare, and on which data?*

The last lesson warned you that accuracy misleads when positives are rare. In the **Imbalance lab** you make that happen yourself. The lab trains a logistic regression and sets it beside the majority-class baseline, the "model" that always answers negative.

The data are two overlapping groups of points, generated with a seed so everyone sees the same ones. A thousand examples train the model, and another thousand, which it never saw, test it. Both sets have the share of positives you choose, 5% at the start, and the model says positive when its probability reaches the threshold, 0.50 at the start. At these defaults the table reads:

| Measure | Baseline | Logistic regression |
|---|---|---|
| Accuracy | 95.0% | 96.7% |
| Precision | n/a | 70.7% |
| Recall | 0.0% | 58.0% |
| F1 | 0.0% | 63.7% |

The test set holds 50 positives. The model finds 29 of them, misses 21 and raises 12 false alarms. The baseline finds none, and its precision is n/a because it never says positive.

## Rarer positives, easier baseline
*What happens to the scores as the share of positives falls?*

Slide **Share of positive examples** down from 50% to 1% and watch two numbers. The baseline's accuracy is the share of negatives, so it climbs. The model's recall falls.

| Share of positives | Baseline accuracy | Model accuracy | Model recall |
|---|---|---|---|
| 50% | 50.0% | 88.9% | 88.0% |
| 20% | 80.0% | 92.7% | 78.5% |
| 10% | 90.0% | 95.1% | 69.0% |
| 5% | 95.0% | 96.7% | 58.0% |
| 1% | 99.0% | 99.3% | 30.0% |

[[figure:imbalance-lab/share-sweep|Generated data, default sample, threshold 0.50, no class weight. Both accuracy lines climb toward 100% as positives get rarer, while the recall line falls.]]

> Worked example: at 5% the test set has 950 negatives, so the baseline scores 950 / 1,000 = 95.0%. The model gets 29 positives and 938 negatives right: (29 + 938) / 1,000 = 96.7%. That is only 1.7 points above a model that finds nothing, yet the gap in recall is 58 points.

> Key idea: when positives are rare, accuracy hardly separates a useful model from a useless one. Recall does.

A likely reason for the falling recall is that 950 of the 1,000 training examples are negative, so the loss the model minimizes is mostly made of negatives. The next section tests that idea.

## Class weight
*Can you make the rare positives count more while the model trains?*

Switch on **Weigh positives more (class weight)**. At 5% the training set has 950 negatives and 50 positives. The lab counts each positive 950 / 50 = 19 times, so all the positives together weigh as much as all the negatives (50 x 19 = 950). The model is then trained again.

| At 5% positives | No weight | Class weight |
|---|---|---|
| Positives found | 29 of 50 | 43 of 50 |
| False alarms | 12 | 92 |
| Recall | 58.0% | 86.0% |
| Precision | 70.7% | 31.9% |
| Accuracy | 96.7% | 90.1% |

The suspicion fits what you see: once the positives count more, the model leans toward them and recall jumps. The price is 80 more false alarms, so precision drops.

> Watch out: the weighted model's accuracy, 90.1%, is now below the baseline's 95.0%. That does not make it worse. It finds 43 of the 50 positives, and the baseline finds none. Accuracy is the wrong judge here; whether 92 false alarms are acceptable depends on what a miss and an alarm cost.

::: deeper How the lab picks the weight
The weight is the number of negatives divided by the number of positives in the training set, rounded, and never below 1. It is 9 at 10%, 19 at 5%, 49 at 2% and 99 at 1%. At 50% it is 1, so the toggle changes nothing there. Counting a positive with weight 19 gives the same loss as writing that row into the training set 19 times.
:::

## Same model quality, lower precision
*Why does precision fall when positives get rarer, even though recall holds?*

Keep **Weigh positives more (class weight)** on and slide the share down again. Now recall barely falls while precision collapses.

| Share of positives | Recall | Precision |
|---|---|---|
| 50% | 88.0% | 89.6% |
| 20% | 88.5% | 67.0% |
| 10% | 88.0% | 50.3% |
| 5% | 86.0% | 31.9% |
| 1% | 80.0% | 8.4% |

[[figure:imbalance-lab/precision-fall|With class weight on, recall stays high while precision falls with the share of positives.]]

The model did not get worse. The lab retrains it at every share, so it is the same recipe rather than literally the same model, and its recall and alarm rate hardly move. Look at the counts. At 50% it raises 51 false alarms among 500 negatives, a rate of 10.2%, and finds 440 positives. At 5% it raises 92 among 950 negatives, a rate of 9.7%, and finds only 43 positives. The alarm rate is the same, but the negatives are far more numerous and the positives far fewer. Precision is 440 / (440 + 51) = 89.6% at 50% and 43 / (43 + 92) = 31.9% at 5%.

> Key idea: precision depends on how rare the positives are, not only on the model. A model of the same quality looks worse when it meets rarer positives.

## The decision threshold
*What if the model needs a lower probability before it says positive?*

Back to no class weight at 5%. Move **Decision threshold** from 0.50 down to 0.20. The dashed boundary moves and the shaded side, where the model says positive, grows. The counts change to 35 found, 15 missed and 35 false alarms.

> Worked example: recall = 35 / 50 = 70.0%. Precision = 35 / (35 + 35) = 50.0%. F1 = 2 x 35 / (2 x 35 + 35 + 15) = 70 / 120 = 58.3%.

Two more settings on the same model:

- At 0.10 it finds 41 of 50 (recall 82.0%) with 74 false alarms (precision 35.7%).
- At 0.80 it finds 22 (recall 44.0%) with no false alarm (precision 100.0%).

Notice that at 0.20 the model's accuracy is 95.0%, exactly the baseline's, although it finds 35 positives.

[[figure:imbalance-lab/two-levers|Precision against recall at 5% positives. Each curve is one model with the threshold swept; the four marked points are settings from this lab.]]

Class weight and threshold work differently. Class weight changes the model by training it again. The threshold keeps the model and only moves the cut. In this lab both slide along nearly the same trade-off: weight at 0.50 gives recall 86.0% and precision 31.9%, and the plain model at threshold 0.10 gives 82.0% and 35.7%.

## Small numbers are noisy
*How far can you trust one sample of the data?*

At 1% the test set has only 10 positives, so recall can only be 0%, 10%, 20% and so on. Press **New sample** and read recall each time: the model finds 3, 4, 1 and 1 positives on four samples, which is 30.0%, 40.0%, 10.0% and 10.0%. Precision is 100.0% every time, but that rests on 1 to 4 positive answers.

Even with 50 positives at 5%, recall moves from sample to sample: 58.0%, 60.0%, 50.0% and 46.0%. Each step of one positive is worth 2 points there and 10 points at 1%.

The real penguin data are smaller still, so when the test set has fewer than 10 positives the lab adds a warning to its detail line, for example "Only 7 positives are in the test set, so recall moves in big steps of 14.3%".

> Watch out: a difference of a few positives is not a result. Check how many positives the test set holds, press **New sample** a few times, and trust only what survives.

## Real penguins
*Does the idea survive on real data?*

Set **Data** to **Penguins (real)**. The lab asks whether a penguin is a Chinstrap, using bill length and bill depth. Of the 344 penguins, 342 have both measurements, and 68 of them are Chinstraps, 19.9%. Below that share the lab keeps all the other penguins and a random part of the Chinstraps. Half of the rows train the model and half test it.

At 10% positives the lab uses 30 Chinstraps and 274 others, and the test set has 152 penguins, 15 of them Chinstraps. The baseline scores 137 / 152 = 90.1%. Here is recall on three samples:

| Sample | No weight | Class weight |
|---|---|---|
| First | 60.0% | 73.3% |
| Second | 33.3% | 60.0% |
| Third | 66.7% | 86.7% |

[[figure:imbalance-lab/penguin-check|Chinstrap recall at 10% positives on three samples of the real penguins, without and with class weight.]]

Class weight raised recall on all three, and precision fell each time: from 81.8% to 37.9%, from 71.4% to 39.1% and from 90.9% to 31.0%. The recall without weight ranges from 33.3% to 66.7% on its own, so three samples are a small check, not a proof.

::: remember
- When positives are rare, the baseline's accuracy rises toward 100% and says little; recall shows what the model finds.
- Class weight and a lower decision threshold both win recall back, and both cost precision. Precision also falls when positives get rarer, even for a model of the same quality.
- With few positives in the test set, recall and precision move a lot between samples. Repeat on new samples, then on real data, before you believe a result.
:::

@@lab

## Lab: rare positives and accuracy
You compare a majority-class baseline with a logistic regression while you change how rare the positive examples are. The lab trains on one set and scores both on a test set of examples the model has not seen. Everything is seeded, so the default screen is the same for everyone.

### Controls
- **Data** switches between **Generated data** and **Penguins (real)**. The real data asks whether a penguin is a Chinstrap, from **Bill length (mm)** and **Bill depth (mm)**; a note under the switch says how many rows the lab keeps.
- **Share of positive examples** (1 to 50%, starts at 5%) sets the share of positives in both the training set and the test set.
- **Weigh positives more (class weight)** (off at the start) makes each positive count more while the model trains, so that all positives weigh about as much as all negatives. A note under the controls says so.
- **Decision threshold** (0.05 to 0.95, starts at 0.50) is the probability the model must reach before it says positive.
- **New sample** draws a new generated sample, or a new random set of penguins. The share, the toggle and the threshold stay as they are.
- **Quick Quiz** is the button under the settings card (a round button at the bottom right on a phone) (its badge counts the quizzes you have not answered; it opens a small panel): "As positives become rarer, what happens to the baseline accuracy and to the model recall?" Pick an answer, and the box checks it against the lab once the share is below 45%. At 45% or more it says there is nothing to compare yet.
- **Fullscreen** enlarges the lab. **Reset** returns to generated data, 5%, no class weight, threshold 0.50, the first sample, and clears your prediction.

### Reading the screen
- The plot is titled **Rare positives: accuracy can fool you**. Each mark is a test example: crosses are **Positive** and dots are **Negative**, on the axes **Feature 1** and **Feature 2** (**Bill length (mm)** and **Bill depth (mm)** with the penguins). The dashed line is the **Decision boundary**, and the shaded side is where the model says positive.
- The status line says what the numbers mean, for example "The baseline never finds a positive, yet its accuracy is 95.0%." The detail line gives the test set size and the number of positives, such as "Test set: 1,000 examples, 50 positive (5.0%).", plus the class weight and the threshold when you change them. At the right, a count such as "50 of 1,000 test examples are positive".
- The card **Baseline and model on the test set** has the columns **Measure**, **Baseline (majority class)** and **Logistic regression**, and the rows **Accuracy**, **Precision**, **Recall**, **F1**, **Positives found (true positives)**, **Positives missed (false negatives)** and **False alarms (false positives)**. Precision shows n/a when nothing was called positive.
- The chart **Scores on the test set** draws the same four scores as bars: grey for **Baseline (majority class)**, green for **Logistic regression**.
- When the test set has fewer than 10 positives, the detail line warns that recall moves in big steps.

### Experiments
Press **Reset** first so that your numbers match the ones below. Every experiment starts with a prediction.

1. **The accuracy trap.** Predict: at the default 5% positives, how good is the baseline's accuracy, and how many positives does it find? Read the card **Baseline and model on the test set**. The baseline has 95.0% accuracy and finds 0 of 50 positives. The model has 96.7% accuracy and finds 29 of 50 (recall 58.0%, precision 70.7%). How big is the gap in accuracy, and how big is the gap in recall?
2. **Slide the share.** Predict: set **Share of positive examples** to 50% and pick an answer in **Quick Quiz**. The box asks you to move the slider down first, because the classes are balanced and there is nothing to compare. Then slide down to 5%. The box says baseline accuracy went from 50.0% to 95.0% and the model recall from 88.0% to 58.0%. Stop at 20%, 10% and 1% and read recall: 78.5%, 69.0%, 30.0%. Why does the baseline's accuracy rise while the model's recall falls?
3. **Class weight.** Press **Reset** (5%, class weight off, threshold 0.50). Predict: what will **Weigh positives more (class weight)** do to recall, to false alarms and to accuracy? Switch it on. The detail line says each positive counts 19 times. Recall rises from 58.0% to 86.0%, false alarms from 12 to 92, precision falls from 70.7% to 31.9%, and accuracy falls to 90.1%, below the baseline's 95.0%. Is the weighted model worse?
4. **Same recipe, rarer positives.** Press **Reset** and switch the class weight on. Predict: what happens to recall and to precision as you slide the share from 50% down to 5% and 1%? Recall barely falls (88.0%, 86.0% and 80.0%), while precision collapses (89.6%, 31.9% and 8.4%). If you picked an answer in **Quick Quiz**, it now reads "Baseline accuracy goes up, model recall stays about the same" (recall 88.0% to 86.0%). Compare the false alarms and the positives found at 50% and at 5%, and explain why precision falls although recall and the alarm rate hardly move.
5. **Threshold against class weight.** Press **Reset** (5%, class weight off, threshold 0.50). Predict: can a lower threshold win recall back like class weight did? Move **Decision threshold** to 0.20, then 0.10. At 0.20: 35 found, 35 false alarms, recall 70.0%, precision 50.0%. At 0.10: recall 82.0%, precision 35.7%. Compare with experiment 3. Then try 0.80 and watch precision reach 100.0% as recall drops to 44.0%.
6. **Fresh samples, then real data.** Press **Reset**, then set **Share of positive examples** to 1% (class weight off, threshold 0.50). Predict: when you press **New sample** at 1%, will recall stay near 30.0%? Press it three times: recall is 40.0%, 10.0% and 10.0%, because there are only 10 positives. Now press **Reset**, set **Data** to **Penguins (real)** and **Share of positive examples** to 10%. On the first sample the baseline has 90.1% accuracy and the model has 60.0% recall (9 of 15). Switch the class weight on: recall rises to 73.3% and precision falls from 81.8% to 37.9%. Press **New sample** twice, with the toggle off and on each time: recall goes 33.3% to 60.0% on the second sample and 66.7% to 86.7% on the third. Weight raised recall on all three; how far do you trust three samples?
