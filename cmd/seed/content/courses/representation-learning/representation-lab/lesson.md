---
slug: representation-lab
title: Representation lab
kind: simulator
simulator: representation-lab
minutes: 30
---
::: intro
- Compare a frozen pretrained representation with features learned from a small labelled set, on the same test rows.
- Predict how the code size, the pretraining length and the noise change that comparison, then check it in the lab.
- Test the idea on the real penguins with a fresh split before you believe it.

Before you start: read "Embeddings and autoencoders" and "Transfer learning and self-supervision" in this course. You will use the code, the bottleneck, the frozen encoder and the rule that a pretrained representation must beat the plain options.
:::

## What the lab asks
*What exactly does the Representation lab compare?*

The last lesson ended with a rule: a pretrained code counts only after it beats the raw features and the features learned from the small labelled set, on the same rows. This lab lets you apply that rule.

The lab draws tiny 8 by 8 pictures called glyphs. There are four shapes: Vertical bar, Cross, Box and Diagonal. Each pixel is flipped with a chance of 15%, so every picture is a little messy. Three sets exist: 400 glyphs with no labels, which an autoencoder learns from; 240 test glyphs, held out; and a labelled set of 100 glyphs per shape, from which you spend only a few. Guessing gives 25%.

The lab starts with an autoencoder whose code has 8 numbers but which has learned nothing yet. When you press **Pretrain on unlabelled glyphs**, it trains on the 400 glyphs and never sees a label. 

> Key idea: the autoencoder is the only part that uses the 400 unlabelled glyphs. Every classifier in the comparison uses the same few labelled glyphs and is scored on the same 240 test glyphs.

## Three ways to use a few labels
*Which three classifiers does the lab score?*

Each arm gets the same labelled glyphs, for example 5 per shape, 20 in all. They differ in what the classifier looks at, and in how many numbers the labels must set.

| Arm | Looks at | Labels train | Numbers to set |
| --- | --- | --- | --- |
| Frozen pretrained features | the 8-number code | a linear classifier | 36 |
| Raw pixels | the 64 pixels | the same kind of classifier | 260 |
| Network from scratch | the 64 pixels | a small network, all of it | 2,116 |

The classifiers are one-vs-rest (each model answers yes or no for one shape), so there are four models. The frozen arm sets 4 × (8 weights + 1 bias) = 36 numbers. The raw arm sets 4 × (64 + 1) = 260. The network has 8 hidden units (8 middle numbers it computes from the pixels): 64 × 8 + 8 = 520 numbers in the hidden layer and 8 + 1 = 9 in the output, 529 per model and 4 × 529 = 2,116 in all.

[[figure:representation-lab/three-arms|The three arms. Only the frozen arm gets a representation made from the 400 unlabelled glyphs. The right column counts the numbers the labels must set at 5 labelled glyphs per shape.]]

The network from scratch is the syllabus's "features learned from a small labelled dataset": it builds its own features, but only from its 20 labelled glyphs. Raw pixels are the plain baseline.

## Reading the first run
*What do the first numbers say?*

Press **Reset**, then **Pretrain on unlabelled glyphs**. The status line reads "Pretrained 20 epochs. Test error 0.128 per pixel (0.252 before)." The "before" figure is the untrained autoencoder on the same test glyphs, and the table fills in as scores finish. A dash means not pretrained yet and three dots mean still scoring.

At 5 labelled glyphs per shape the table reads:

| Arm | Test accuracy |
| --- | --- |
| Frozen features | 94.2% |
| Raw pixels | 85.1% |
| From scratch | 79.2% |

> Worked example: the frozen lead over raw is 94.2 - 85.1 = 9.1 points, and over the network from scratch 94.2 - 79.2 = 15.0 points. One test glyph is worth 1 / 240, about 0.4 point, and every score is the mean of 3 labelled sets (2 for the network), so a gap of a point or so is noise. The lab calls a gap under 3 points "about the same".

The likely reasons are that its 36 numbers are easy to fit from 20 rows, and that the 400 unlabelled glyphs already taught the code where the shapes differ. The lab does not isolate either cause.

## When labels are plentiful
*Does the frozen lead last as the labelled set grows?*

Read down the table. The frozen column hardly moves: 94.2%, 94.3%, 94.6%, 94.4%, 94.6% at 5, 10, 25, 50 and 100 per shape. The raw column climbs: 85.1%, 88.5%, 93.2%, 95.0%, 95.8%. At 25 per shape the frozen lead is 1.4 points, about the same. At 50 and 100 raw is ahead by 0.6 and 1.2 points, also about the same.

[[figure:representation-lab/labels-curve|Test accuracy against labelled glyphs per shape, on a log scale, at the lab's defaults. The frozen line is high and flat; the raw and from-scratch lines climb toward it.]]

Two things happen. The frozen classifier is limited by the code: 8 numbers from 20 epochs of pretraining are good, but they cannot carry detail the classifier might still use. The raw classifier is limited by labels: with more of them it learns the shapes itself. So a pretrained representation pays most when labels are scarcest, which is the situation transfer learning is meant for.

> Watch out: the network from scratch is below frozen features at every size, and clearly so (more than 3 points) up to 25 per shape. From 50 per shape all three arms are within 3 points; at 100 they are 94.6%, 95.8% and 93.5%. Whether a lead is real depends on the label budget.

## The code size and the pretraining
*Which settings of the pretraining decide whether the frozen code helps?*

Change **Bottleneck size (numbers in the code)** and press **Pretrain on unlabelled glyphs** again, because the lab throws the old autoencoder away. At 5 per shape the frozen accuracy is 72.2% with 3 numbers, 94.2% with 8 and 93.3% with 16, while raw stays at 85.1%. A code of 3 is too narrow: it is worse than no pretraining at all, which is **negative transfer**.

Now compare the reconstruction errors: 0.131, 0.128 and 0.126. They are almost the same, yet the frozen accuracy differs by more than 20 points. A small change in how well the picture is rebuilt can hide a large change in what the code is good for.

**Pretraining epochs** works the same way. With 5 epochs the error is 0.139 and the frozen accuracy 76.3%. With 20 it is 0.128 and 94.2%. With 100 it is 0.123 and 93.8%. Early epochs matter; later ones barely.

[[figure:representation-lab/knobs|Frozen accuracy at 5 labelled glyphs per shape. Left: bottleneck sizes 3, 8 and 16. Right: 5, 20 and 100 pretraining epochs. The dashed line is the raw pixels at 85.1%.]]

## When noise hides the shapes
*Can a representation rescue data that is too hard, or too easy?*

Set **Noise (chance a pixel flips)** to 0% and pretrain again. All three arms score 100.0% at every size, so there is nothing for pretraining to add. The task is so easy that raw pixels are enough.

Set noise to 35%. At 2 per shape frozen still leads slightly, 38.6% against 35.0% for raw. At 5 per shape the arms score 38.7% (frozen), 40.0% (raw) and 35.8% (from scratch), against 25% for guessing, so that lead is gone. At 100 per shape they reach 55.0%, 62.5% and 54.6%, and raw leads by 7.5 points over frozen.

> Key idea: pretraining helps in the middle. If the task is trivial, the baseline already wins. If the noise has destroyed what separates the classes, a code can bring back little of it, because the code was built from the same noisy pictures.

## Reading the map
*Why does the map's own score differ from the classifier's?*

Look at the map. The scatter plot shows the first 2 principal axes of the code for the test glyphs, with your labelled glyphs as diamonds. The status line adds how many test glyphs lie nearest their own class centre. That figure draws its centres from the labels of all 240 test glyphs, while the classifier has only 20, so it measures how separated the classes are, not what 20 labels can use. With 3 numbers it says 86%, yet the classifier scores 72.2%.

## The same test on penguins
*Does the idea hold on real measurements?*

Choose **Penguins (real data)**. The lab uses the four measurements of the 342 penguins with no missing value, scaled to 0 to 1, and splits them in half per species: 172 for the pool and 170 for the test set. The pool is only unlabelled for the autoencoder. Guessing gives 33%. The lab sets the bottleneck to 2 and the epochs to 100 for you.

Press **Pretrain on unlabelled penguins**. At 5 per species (15 in all) frozen features score 82.5%, raw measurements 98.8% and the network from scratch 99.1%. The status line reports an autoencoder test error of 0.0062 per measurement, and PCA with 2 components is at 0.0059, so on this split the nonlinear autoencoder rebuilds the penguins about as well as the linear PCA from the Dimensionality reduction course.

On this split the 2-number code mostly mixes up Adelie and Chinstrap, while Gentoo is nearly always right. With 4 measurements the raw input is already short and informative, and squeezing it to 2 numbers throws away the part that separates two of the species.

[[figure:representation-lab/penguin-splits|Test accuracy at 5 labelled penguins per species on four different splits. The 2-number code is below the raw measurements every time; the 3-number code sits on top of them.]]

## A fresh split
*Does the answer change on another split?*

Set the bottleneck to 3 and pretrain again: frozen scores 98.2%, raw 98.8%, about the same. A frozen representation is not a free upgrade: it has to be wide enough for the task.

One split is a single draw. Press **New split** and repeat. With the 2-number code the frozen accuracy is 82.5%, 86.1%, 90.2% and 91.2% on four splits, against raw 98.8%, 97.5%, 98.2% and 98.8%. The raw gaps are 16.3, 11.4, 8.0 and 7.6 points, a mean of 10.8. With 3 numbers the frozen scores are 98.2%, 98.0%, 97.8% and 98.2%, within 0.6 point of raw each time.

## A fair verdict
*How do you report the comparison?*

A fair statement therefore reads: on the glyphs, with few labels and a code of 8 numbers, frozen pretrained features beat the plain options by 9 to 15 points at 5 per shape, and the lead fades by 25 to 50 per shape. On the penguins, a 2-number code loses by about 11 points on average, and a 3-number code ties.

Always report the label budget, the code size and the number of splits beside the claim.

::: remember
- Frozen pretrained features win when labels are scarce and the code is wide enough: at 5 per shape, 94.2% against 85.1% (raw) and 79.2% (from scratch). The lead fades as labels grow.
- A narrow code or too little pretraining can make frozen features worse than raw (72.2% with 3 numbers, 76.3% with 5 epochs), and a small change in reconstruction error can hide a large change in usefulness.
- Judge by label budget, code size and several splits: on penguins a 2-number code loses by about 11 points on average, and a 3-number code ties.
:::

@@lab

## Lab: representation
You start with generated 8 by 8 glyphs and an autoencoder that has not learned anything. You pretrain it on unlabelled glyphs, then compare three classifiers on the same few labelled examples and the same test glyphs.

### Controls
- **Data** switches between **Generated data** and **Penguins (real data)**. Switching data also sets **Bottleneck size (numbers in the code)** and **Pretraining epochs** to the data's defaults (8 and 20 for the glyphs, 2 and 100 for the penguins), and throws the autoencoder away.
- **Bottleneck size (numbers in the code)** (2 to 16, starts at 8) is the size of the code. Changing it throws the autoencoder away: press the Pretrain button again.
- **Pretraining epochs** (5 to 100, starts at 20) is how long the autoencoder trains. It only takes effect when you press the Pretrain button, and pressing the button always trains from the start.
- **Labelled examples per class** (2 to 100, starts at 5) is the size you spend. Changing it keeps the autoencoder and moves the dashed line on the chart. With the penguins the slider stops at 34.
- **Noise (chance a pixel flips)** (0% to 35%, starts at 15%) is the messiness of the glyphs. It is disabled with the penguins. Changing it makes new glyphs and throws the autoencoder away.
- **Seed** picks the data. A new seed gives new glyphs or a new split and throws the autoencoder away.
- **Pretrain on unlabelled glyphs** (**Pretrain on unlabelled penguins** with the real data) trains the autoencoder on the pool without labels. The progress bar fills and the status line counts epochs.
- **New glyphs** (**New split** with the real data) adds 1 to the seed.
- **Fullscreen** enlarges the lab. **Reset** returns to generated data with all settings at their starting values.
- **Quick Quiz** is the button under the settings card (a round button at the bottom right on a phone): "With only 5 labelled examples per class, which wins: frozen pretrained features or raw pixels?" with the choices **Frozen pretrained features**, **Raw pixels** and **About the same (within 3 points)**. Pick one first, then press **Check answer** once the 5-per-class points are on the chart.

### Reading the screen
- The map shows one dot per test glyph, coloured by class (Vertical bar, Cross, Box, Diagonal; with the real data Adelie, Chinstrap, Gentoo), and the diamonds (**Labelled example (diamond)** in the legend) are your labelled glyphs. Before pretraining the code is random, so the classes are mixed. With a bottleneck above 2 the axes are **Principal axis 1 of the code (scaled 0–10)** and axis 2; at 2 they are **Code number 1 (scaled 0–10)** and 2.
- The status line says "Not pretrained yet: the map shows a random code.", then "Pretraining: epoch N of M. Test error X per pixel." and at the end "Pretrained 20 epochs. Test error 0.128 per pixel (0.252 before)." The number in brackets is the untrained autoencoder on the same test rows.
- The detail line gives the three scores at your size, for example "At 5 labelled per class (20 in all): frozen 94%, raw 85%, from scratch 79%.", followed by the share of test glyphs nearest their own class centre in the map. With penguins it ends with the autoencoder and PCA test errors.
- **Glyphs and what the autoencoder rebuilds** shows noisy test glyphs on top and what the autoencoder rebuilds from the code below. With the real data this card becomes **PCA of the same four measurements**.
- **Test accuracy against labelled examples** plots the three arms: **Frozen pretrained features** (blue circles), **Raw pixels** (green squares; **Raw measurements** with the penguins) and **Network from scratch** (purple triangles, dashed). The dashed vertical line is your size and the dotted line is chance, 25% (33% with penguins).
- **Test accuracy at every size** has the columns **Per class (in all)**, **Frozen features**, **Raw pixels** and **From scratch**, with your size highlighted. A – means not pretrained yet and … means still scoring. Wait until no … is left before you read it. With the penguins the rows are 2, 5, 10, 25 and your own size.

### Experiments
Start each one from **Reset**. After any change that throws the autoencoder away, press the Pretrain button again and wait until the table has no … in it.

1. **The first run.** Predict: with 5 labelled glyphs per shape, which wins, frozen features or raw pixels? Pick an answer in the **Quick Quiz** box, press **Pretrain on unlabelled glyphs**, and read the row **5 (20)** of the table: 94.2% frozen, 85.1% raw, 79.2% from scratch. Then press **Check answer**. Why does the arm with the fewest numbers to set do best with only 20 rows?
2. **Where raw catches up.** Predict: at how many labelled glyphs per shape does the frozen lead disappear? After pretraining, read the frozen and raw columns of the rows 10, 25, 50 and 100. Frozen stays near 94.3% to 94.6%, while raw rises from 88.5% to 93.2%, 95.0% and 95.8%. Move **Labelled examples per class** to 25 and watch the dashed line and the diamonds in the map. When is a pretrained code worth building?
3. **The code size.** Predict: what does a bottleneck of 3 do to the frozen accuracy at 5 per shape, and what does 16 do? Set **Bottleneck size (numbers in the code)** to 3, press **Pretrain on unlabelled glyphs**, and read row **5 (20)**: 72.2%, against raw 85.1%, which did not change. Then try 16: 93.3%. Compare the status lines: the test error is 0.131 with 3 and 0.126 with 16. The map says 86% of test glyphs are nearest their own centre with 3 and 95% with 16, but that figure uses the test labels. Why do 0.131 and 0.126 hide a gap of more than 20 points?
4. **Pretraining length.** Predict: will 100 epochs be much better than 20? Set **Pretraining epochs** to 5 and pretrain. The status line reads 0.139 and row 5 shows 76.3%. Now 100 epochs: 0.123 and 93.8%. Explain why the first 15 epochs mattered and the next 80 did not.
5. **Noise.** Predict: is pretraining worth more or less when the glyphs are cleaner, or dirtier? Set **Noise (chance a pixel flips)** to 0% and pretrain: every cell reads 100.0%. Then 35%: at 5 per shape you see 38.7%, 40.0% and 35.8%, and at 100 per shape 55.0%, 62.5% and 54.6%. Where does pretraining help, and where can it not?
6. **Penguins, then a fresh split.** Predict: on the real penguins, does the frozen code still win at 5 per species? Set **Data** to **Penguins (real data)** and press **Pretrain on unlabelled penguins**. At 5 per species (15 in all) you see 82.5%, 98.8% and 99.1%, and the detail line gives the autoencoder error 0.0062 and PCA 0.0059. Raise **Bottleneck size (numbers in the code)** to 3 and pretrain again: 98.2% frozen. Then press **New split** and repeat with 2 and 3, on four splits in all. With 2 numbers frozen gets 82.5%, 86.1%, 90.2%, 91.2% and raw 98.8%, 97.5%, 98.2%, 98.8%. Does the idea survive a fresh split, and what did the code size decide?
