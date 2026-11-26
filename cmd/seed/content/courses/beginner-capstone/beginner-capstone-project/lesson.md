---
slug: beginner-capstone-project
title: Beginner capstone project
kind: simulator
simulator: capstone
minutes: 45
---
::: intro
- Frame a classification task on the penguin table, set a baseline and choose the metric that matches the cost of a mistake.
- Compare two models fairly on the same test rows, read the gap between training and test scores, and repeat on a new split.
- Explain three mistakes from the measurements, write up the project and rate your own work against a rubric.

Before you start: read "Framing and baselines" and "Comparing models and errors".
:::

## The brief
*What do you build in this lab, and how is it organised?*

The **Capstone workbench** is the project that closes the level. You build a classifier on a public table, compare two models with a baseline, and explain three errors. The table is the penguin data from earlier lessons: 344 penguins of three species, each with four measurements (bill length, bill depth, flipper length, body mass) and a sex. The lab has no generated data.

The workbench has six steps. Each opens when the one before it is done, and "done" is checked on the work, not on the clicks: step 5 is done only when three rows each have a reason and a note. Your choices are saved in this browser.

[[figure:beginner-capstone-project/six-steps|The six steps of the workbench and what the lab checks before it opens the next one.]]

> Key idea: the project is the order of the steps. A model chosen before the question is framed and the baseline is known cannot be judged.

## Step 1: frame the problem
*Which question will you ask, and how will you judge the answer?*

Choose one of three tasks. All three read the same four measurements and differ in the target.

| Task | Rows used | Positive class | Left out |
|---|---|---|---|
| Adelie or Chinstrap | 219 | Chinstrap: 68 (31%) | 1 missing (NA), 124 Gentoo |
| Male or female | 333 | male: 168 (50%) | 11 missing (NA) |
| Gentoo or the rest | 342 | Gentoo: 123 (36%) | 2 missing (NA) |

The lab drops rows with a missing value instead of filling them in, and says how many. Then choose the metric: **Accuracy**, **Recall of the positive class** or **F1**. The lab writes what each kind of mistake means and, when it applies, a heads-up: on Adelie or Chinstrap, always answering "Adelie" already scores 69% accuracy.

Match the metric to the cost, as in "Framing and baselines". If missing a Chinstrap is the costly mistake, choose recall. If both mistakes cost about the same and both classes are common, as in Male or female, accuracy is fair. F1 suits a smaller positive class when misses and false alarms both matter.

[[figure:beginner-capstone-project/three-tasks|The three tasks: how each splits into positive class and the rest, and what a baseline that always answers the larger class scores on the test rows of Split 1.]]

## Step 2: the baseline
*What score must every model beat?*

The lab splits the rows once: about 75% to train on and 25% to test on, each class keeping its share. **New split** draws another cut. Split 1 of Adelie or Chinstrap is the one from "Comparing models and errors": 164 training rows and 55 test rows (called held-out rows there). The baseline answers the most common class of the training rows and uses no measurement. Here that is "Adelie".

> Worked example: of the 55 test rows, 38 are Adelie. The baseline is right 38 times: accuracy 38 / 55 = 69.1%. It never says Chinstrap, so it finds 0 of 17: recall 0.0% and F1 0.0%.

Read a baseline on all three metrics, because one can fool you. On Male or female the baseline answers "male" every time. Of 83 test rows, 42 are male, and it finds all 42: recall 42 / 42 = 100.0%. But 41 females are called male, so precision (of the rows called male, the share that really are male) and accuracy are both 42 / 83 = 50.6%.

> Watch out: a recall of 100.0% does not make the baseline good. A model that says "yes" to everything has perfect recall.

## Steps 3 and 4: two models, one fair comparison
*How do you pick two models and compare them without fooling yourself?*

Model A and model B each choose a **Model** (k-nearest neighbors, Logistic regression or Decision tree), its settings and the features it may use. **Evaluate model A** and **Evaluate model B** fit the model on the training rows and score it on both sides. The test score, on rows the model never saw, is the one to trust.

The comparison is fair because both models share the split and the metric, and model B must differ from model A. Change one thing at a time. With k-NN, leave **Scale the features** on: in raw units, body mass in grams swamps millimetres.

On Adelie or Chinstrap at Split 1, k-NN (k = 5) scores 98.2% on the test rows and the tree (depth 3) 100.0%: a lead of one penguin, 1 / 55 = 1.8 points. Watch the gap too, as in "Underfitting and overfitting". On Male or female, a depth-8 tree scores 100.0% on training rows and 85.5% on test rows, a 14.5-point gap.

[[figure:beginner-capstone-project/train-and-test|Male or female at Split 1: training (outlined) and test (solid) accuracy. The deeper tree memorizes the training rows.]]

::: deeper How the lab decides which model is better
The better model has the higher test score on your metric. If the two scores are exactly equal, accuracy decides, then Model A. A difference of one point or less, from the baseline or between the two models, counts as a tie. A training-minus-test gap is called noticeable from 4 points and large from 10. These are rules of thumb: on 55 test rows one penguin is worth 1.8 points.
:::

## Step 5: inspect the errors
*Where does the better model go wrong, and why?*

A score counts mistakes but does not explain them. Step 5 lists the test rows the **better** model got wrong, most confident first, with the four measurements, the true class, the predicted class and the **confidence**, the share of the model's neighbors or leaf that voted for its answer. Mark three, choose the likeliest reason for each and write one line about what the numbers say. The five reasons are **Classes overlap**, **Unusual measurement**, **Label may be wrong**, **Model too simple** and **Feature missing**.

On Male or female at Split 1, k-NN is the better model and makes 4 mistakes on 83 test rows.

| Row | Bill length (mm) | Bill depth (mm) | Flipper length (mm) | Body mass (g) | True | Predicted | Confidence |
|---|---|---|---|---|---|---|---|
| #344 | 50.2 | 18.7 | 198 | 3,775 | female | male | 100% |
| #38 | 42.2 | 18.5 | 180 | 3,550 | female | male | 80% |
| #285 | 46.0 | 18.9 | 195 | 4,150 | female | male | 80% |
| #178 | 46.1 | 15.1 | 215 | 5,100 | male | female | 60% |

Row #344 sends mixed signals. Its bill, 50.2 mm, is longer than the male average of 45.9 mm over all 333 penguins, yet its mass, 3,775 g, is below the female average of 3,862 g. That fits **Classes overlap**.

[[figure:beginner-capstone-project/species-and-sex|Average body mass of females and males in each species, with the four mistakes of the table above. Species is not a feature in this lab.]]

::: deeper A reason is a hypothesis, and close calls
The name of a reason is only a hypothesis, not a proof. If the better model makes fewer than three mistakes, the lab adds up to five correct rows that sit closest to the other class, marked "close call", so you still have three to study.
:::

## One split is one opinion
*Does the result hold on a new split?*

Before you write anything, press **New split** and look again. A split of 83 test rows is a small judge: one row is worth 1 / 83 = 1.2 points.

On Male or female, Split 1 favours k-NN over the tree, 95.2% to 89.2%. On Split 2 it is 91.6% to 79.5%. On Split 3 the order flips: the tree scores 95.2% and k-NN 94.0%. Over Splits 1 to 10, k-NN is ahead on 6, the tree on 3, and they tie once. The baseline stays at 50.6% on every split.

On Adelie or Chinstrap the picture is more mixed. The tree is ahead on 2 of 10 splits, k-NN on 3, and 5 splits tie. A lead of one penguin on one split has not shown anything.

> Key idea: say what held on every split you tried, and say what changed. "k-NN is usually ahead on Male or female" is a better finding than "k-NN is best".

A new split also changes the rows in step 5, so the lab removes marks that are no longer in the list.

## Step 6: explain and rate
*What do you write down, and how do you judge your own work?*

Step 6 asks for three short texts: **The problem**, **Why I picked this model** and **What I would try next**. Then you rate four criteria: framing, baseline, fair comparison and error analysis. Each has three levels, **Not yet**, **Partly** and **Yes**, with a sentence for each. Choose the level that is honestly true today.

> Worked example: "I asked whether a penguin is male. The baseline scores 50.6% accuracy. On the same 83 test rows k-NN scores 95.2% and the tree 89.2%, so I picked k-NN, though on Split 3 the order flipped. Three errors were females called male. I would try adding species as a feature."

The lab joins your choices, scores, errors and texts into a **Capstone summary** you can copy. State the limits: one table, a small test set and one kind of split.

::: remember
- Work in order: frame the question and pick the metric, run the baseline, then compare two different models on the same split.
- Trust the test score, read the gap, and check any small lead on a new split before you call a winner.
- Explain three mistakes from the measurements as hypotheses, then write the project up and rate it honestly.
:::

@@lab

## Lab: capstone workbench
You start with nothing chosen. The six steps open in order, and what you choose or type is saved in this browser only. The numbers below hold from a clean start: press **Start over**, then press it again while it reads **Press again to erase everything**. The lab then begins at Split 1, with Model A on k-nearest neighbors (k = 5, scaled) and Model B on Decision tree (depth 3, leaf 1).

### Steps
1. **Frame the problem.** Choose a task and a metric. Good: you can say what each mistake costs and why your metric fits.
2. **Baseline.** Press **Run baseline** and read all three scores. Good: you know the score to beat on your metric.
3. **Model A.** Choose a model, settings and features, then press **Evaluate model A**. Good: you can say why you chose it and read both scores.
4. **Model B and comparison.** Answer the Quick Quiz first, make model B differ from model A and press **Evaluate model B**. Good: same split, same metric, one change at a time, and you read the gap.
5. **Inspect errors.** Mark three rows, choose a reason and write a note for each. Good: every note quotes the numbers.
6. **Explain and rate.** Fill in three texts and rate four criteria. Good: your ratings match the evidence.

### Controls
- The six chips above the steps jump to a step. A later step is locked ("Finish step N first") until the one before it is done; **Continue to step N** moves on. A step heading opens and closes its step.
- **1. Choose a task** (radio list): **Adelie or Chinstrap**, **Male or female**, **Gentoo or the rest**. **2. Choose the metric you will judge by**: **Accuracy**, **Recall of the positive class**, **F1**.
- **Run baseline** scores the baseline. **New split** draws the next split (**Split 1**, **Split 2** and so on).
- **Model** (select): **k-nearest neighbors**, **Logistic regression**, **Decision tree**. **Neighbors (k)** (1 to 25, starts at 5) and **Scale the features (recommended)** (on) belong to k-NN. **Maximum depth** (1 to 8, starts at 3) and **Minimum rows in a leaf** (1 to 20, starts at 1) belong to the tree. Logistic regression has no setting.
- **Features the model may use**: **Bill length (mm)**, **Bill depth (mm)**, **Flipper length (mm)**, **Body mass (g)**; at least one stays on.
- **Evaluate model A** and **Evaluate model B**. After the first press the scores follow every change you make.
- **Open the Quick Quiz** opens the panel of the round Quick Quiz button; its badge pulses when step 4 opens.
- **Mark** (checkbox "Mark row N") picks a row, up to three. **Reason for row N** offers **Choose a reason** and the five reasons. **Note for row N** (placeholder "What do the numbers say?") holds 160 characters.
- **The problem**, **Why I picked this model** and **What I would try next** hold 400 characters each. **Rate your own work** has four criteria with three levels each. **Copy summary** copies the **Capstone summary**.
- **Start over** (in the **Your project** card and under the steps) and **Reset** erase your work, but only on a second press within five seconds. **Fullscreen** enlarges the lab.

### Reading the screen
- The status reads "N of 6 steps done". The **Your project** card lists **Task**, **Metric**, **Split**, **Model A**, **Model B** and **Better model**.
- Step 1 says how many penguins are used and left out, draws the **Class balance** bar and lists **What a mistake means**.
- Scores sit in a table with **Score**, **Training rows** and **Test rows**; your metric is marked "(your metric)". Under it is the **Confusion matrix** on the test rows: true positive, false negative (missed), false positive (false alarm), true negative. Plain sentences say whether a model beats the baseline and describe the gap.
- Step 4 adds **Comparison on the same split**, a chart titled with your metric, **Outlined bar: training rows**, **Solid bar: test rows** (labels with one decimal) and a sentence naming the better model.
- The Quick Quiz asks "Will model B beat the baseline on the test rows?" and follows model B as you change it: "You predicted it." or "Not what you expected."
- Step 5 shows **Mark**, **Row**, the four measurements, **True**, **Predicted** and **Confidence**; a • on a heading means the model used that feature. It counts "Marked 3 of 3; 3 with a reason and a note."

### Experiments
1. **What does a baseline score?** Predict: on Adelie or Chinstrap the baseline never looks at a measurement. Which of its three scores will be highest? Setup: choose **Adelie or Chinstrap** and **Accuracy**, then press **Run baseline**. Accuracy is 69.1% on the test rows, **Recall of the positive class** and **F1** are 0.0%, and the matrix shows 38 true negatives and 17 false negatives. Next, predict: on Male or female, will recall be low or high? Setup: open step 1, choose **Male or female** and **Recall of the positive class**, and open step 2. It is 100.0% (42 of 42), with accuracy 50.6%. Why is a perfect recall no good result here?
2. **Will model B beat the baseline?** Predict: will model B beat the baseline on the test rows? Setup: choose **Adelie or Chinstrap** and **Accuracy** again, press **Evaluate model A** (98.2% on the test rows), go to step 4, open the Quick Quiz and pick an answer before you press **Evaluate model B**. B scores 100.0% against 69.1%. Then switch off **Bill length (mm)**, **Bill depth (mm)** and **Flipper length (mm)**, so B sees only **Body mass (g)**: B falls to 69.1% with 0.0% recall, the Quick Quiz says "about the same", and A is 29.1 points ahead. Why does a tree that sees only body mass act like the baseline? Switch the features back on.
3. **Does scaling matter?** Predict: in step 3, turn off **Scale the features (recommended)**. Will model A's test accuracy rise, stay or fall? It falls from 98.2% to 78.2% (43 of 55), and recall from 94.1% to 41.2% (7 of 17). It still beats the baseline by 9.1 points but misses 10 of 17 Chinstraps. Explain it with units: body mass is in thousands of grams, the other three features are under 250 millimetres. Turn the toggle back on.
4. **Training score against test score.** Predict: if model B's **Maximum depth** goes from 3 to 8, which score will change? Setup: open step 1 and choose **Male or female** with **Accuracy**, then raise the depth. At depth 3, B scores 91.6% on training and 89.2% on test rows. At depth 8 it scores 100.0% and 85.5% (71 of 83), a gap of 14.5 points, and the lab calls the gap large. Model A stays at 94.0% and 95.2%. Set the depth back to 3.
5. **Three mistakes.** Predict: whose mistakes will step 5 list, and how many? It lists the better model, Model A, with 4 mistakes on 83 test rows: #344, #38 and #285 (females called male, at 100%, 80% and 80% confidence) and #178 (a male called female, at 60%). Mark three, choose a reason for each and write a note that quotes the numbers, such as "bill 50.2 mm is above the male average, mass 3,775 g is below the female average". Where is your reason a guess, and what would test it?
6. **A fresh split on real data.** Predict: Model A (95.2%) beats Model B (89.2%) on Split 1. Will it on a new split? Open step 2 and press **New split** twice. Split 2: A 91.6%, B 79.5%. Split 3: A 94.0%, B 95.2%, so the order flips. The baseline stays at 50.6%, and marks you made may be removed. Over Splits 1 to 10 k-NN is ahead 6 times and the tree 3. How would you word the finding?

### Rubric
Rate each criterion at the end of step 6 with **Not yet**, **Partly** or **Yes**. The lab prints these sentences.

| Criterion | Not yet | Partly | Yes |
|---|---|---|---|
| Framing | I picked a task but did not say what a mistake costs or why I chose the metric. | I said what a mistake means, but my reason for the metric is vague. | I named what each kind of mistake costs and chose a metric that fits. |
| Baseline | I ran the baseline but did not use it to judge my models. | I looked at the baseline score but did not check whether each model beats it on my chosen metric. | I checked that each model beats the baseline on my chosen metric, on the test rows. |
| Fair comparison | I compared the models on different rows, or only on training scores. | I used the same test rows for both models but did not look at the train and test gap. | Same split, test scores, and I read the train and test gap before choosing; I know a new split could change the order. |
| Error analysis | I looked at the scores only, not at single mistakes. | I looked at three mistakes, but my reasons are guesses I did not check against the measurements. | For three mistakes I read the measurements, gave a reason and wrote what it tells me. |

### Real data
Every number here comes from the real penguin table: 344 penguins from the Palmer Archipelago, Antarctica (see the data note for the source). The transfer step is yours: repeat your best idea on another task, then on a new split, and say what held. One table is not every colony, so write that limit in **What I would try next**.
