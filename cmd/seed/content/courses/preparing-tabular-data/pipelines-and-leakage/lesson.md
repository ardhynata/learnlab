---
slug: pipelines-and-leakage
title: Pipelines and leakage
kind: simulator
simulator: leakage-lab
minutes: 25
---
::: intro
- Chain filling, encoding, scaling and a model into one ordered pipeline, and fit every step on the training rows only.
- Name three ways information from the test rows reaches training: preprocessing fitted before splitting, feature selection with all the labels, and duplicates.
- Predict in the Leakage lab how far a leaky pipeline's test accuracy rises above a correct one's, on random labels and on real penguins.

Before you start: read "Missing values and encoding", "Scaling and encoding" and "Outliers and correlation". The first two gave you the steps (fill, encode, scale) and the habit of fitting on training rows; the third showed how closely a column moves with a label. This lesson chains the steps and shows what breaks when the habit is dropped.
:::

## One recipe, not four chores
*Why treat the steps as one ordered recipe?*

The last two lessons gave you three preparation steps: filling gaps, encoding categories and scaling numbers. Add the model and you have a recipe of four steps in a fixed order: fill, encode, scale, learn.

Every step learns something from data. The imputer (the fill step) learns a median for each column, the encoder a list of categories, the scaler a mean and a standard deviation, and the model its weights. The order is not a matter of taste: a blank cannot be scaled, and this recipe computes the mean after the gaps are filled, so the fill step must run first.

A **pipeline** is that recipe as one object, an ordered list of steps. To **fit** it, you hand it the training rows. The first step learns its numbers and passes the changed rows to the next step, and so on up to the model. To predict, new rows travel through the same steps with the numbers already learned. Nothing is learned again.

The gain is discipline. One call fits every step on the rows you hand it, so no step can be fitted on other rows by accident.

[[figure:pipelines-and-leakage/pipeline-recipe|A pipeline is four steps in a fixed order. Each learns its numbers from the training rows only. Test rows and new rows pass through with those numbers unchanged.]]

## Fit on training, apply to every row
*What does a fitted step carry from the training rows to the test rows?*

Each step leaves behind a few numbers.

| Step | Learns from the training rows | Does to any row |
|---|---|---|
| Fill | a median for each column | puts it into a gap |
| Encode | the categories it saw | writes the one-hot columns |
| Scale | a mean and a standard deviation | z = (value - mean) / standard deviation |
| Model | its weights | predicts |

> Worked example: take the four training masses from "Missing values and encoding", 3,650, 3,475, 3,700 and 5,700 g, and one test penguin of 4,000 g. The mean is 4,131.25. The gaps from it are -481.25, -656.25, -431.25 and +1,568.75, and their squares add up to 3,309,218.75. Divide by 4 and take the square root: 909.56. The test penguin gets z = (4,000 - 4,131.25) / 909.56 = -0.14.

Now fit the scaler on all five masses. The mean becomes 4,105, the standard deviation 815.23, and z = (4,000 - 4,105) / 815.23 = -0.13. The change is small, yet the penguin helped to set its own yardstick, so it is no longer unseen.

## Three doors for leakage
*What is data leakage, and where does it get in?*

The test rows stand in for future data. They are held back so that the score tells you how the model will do on rows it has never seen. **Data leakage** is information from the test rows reaching the training. Then the test is no longer an exam on unseen rows, and the score is too good. Three doors let it in.

1. **Preprocessing fitted before splitting.** A median, mean, standard deviation or category list is computed from all rows, test rows included.
2. **Feature selection with all the labels.** Columns are chosen by how closely they track the label, using every row, so the test answers vote.
3. **Duplicates.** The same row, or a near copy, sits in both the training and the test set.

The first two are about the order of steps. Fit before the split and you leak; split first and you do not.

[[figure:pipelines-and-leakage/fit-order|Ten rows, seven for training and three for testing. The correct order splits first, so the fit sees only the training rows. The leaky order fits first, so the fit also sees the test rows.]]

> Key idea: anything learned from data belongs inside the pipeline and is fitted on the training rows only. That includes which features to keep.

## Why luck looks like skill
*How can a model seem to predict coin flips?*

The Leakage lab builds a table of 60 rows and 500 columns of random numbers. The labels are coin flips, so no column knows anything about them and an honest score is about 50%. Two pipelines share one split, 30 training rows and 30 test rows. Each keeps the 10 columns that track the labels most closely, then fits a model on those.

The correct pipeline ranks the columns with the 30 training rows. The leaky one ranks them with all 60, so the test labels get a vote.

> Worked example: a small version of the lab. A random column is a coin flip in each of 10 rows. It matches the labels in 9 or 10 rows with chance 11 in 1,024, and it disagrees in 9 or 10 with the same chance. Flipping the sign is equally useful, so 22 in 1,024 columns, about 2%, look this good by luck: about 11 of 500. The lab's 60 rows make luck rarer per column, yet 500 columns still leave a few.

Keep the best-looking columns and the labels seem predictable, though nothing is there: in the lab's table the best column has a correlation of 0.39 with the labels, the ten kept ones 0.32 on average. (Correlation, between -1 and 1, is how closely a column moves with the label.)

[[figure:pipelines-and-leakage/luck-correlations|The size of the correlation of each of 500 random columns with the labels of 60 rows. The ten best, which the leaky pipeline keeps, reach 0.39 by luck alone.]]

## Same table, two scores
*How big is the gap, and is it just the luck of one split?*

On the lab's first split the correct pipeline scores 46.7% on the test rows and the leaky one 83.3%. The lab's table shows why. The kept columns of the leaky pipeline correlate 0.34 with the test labels, those of the correct pipeline 0.16. The leaky pipeline's training accuracy is lower, 90.0% against 100%, yet its test score is far higher. That is a warning sign of a leak: it fitted the training rows worse and still passed the exam.

The correct pipeline's 100% on training rows and 46.7% on test rows is overfitting, from "Underfitting and overfitting": it memorized noise.

One split is a weak witness. With 30 test rows each row moves the score by 3.3 points. The lab therefore repeats the experiment on 50 different splits of the same table. The correct pipeline averages 47.5% and wanders between 33.3% and 66.7%. The leaky one averages 78.7%, between 63.3% and 90.0%. It never became smarter. It only chose columns that matched the test answers.

## A leak that barely shows
*Does fitting a mean on all rows always inflate the score?*

Switch the lab to the penguins. The task is "is it an Adelie?" from four measurements. Two penguins lack all four, so the pipeline fills each gap with a median, standardizes every column and fits a logistic regression. The leaky pipeline learns the medians, means and standard deviations from all 344 penguins. The correct one uses the 240 training penguins, and the other 104 test it.

On the first split the mean body mass is 4,200.87 g for the leaky pipeline and 4,171.98 g for the correct one. The numbers differ, but both score 98.1%. Over 50 splits the means are 97.2% and 97.2%.

[[figure:pipelines-and-leakage/leak-scores|Mean test accuracy over 50 splits. On random labels the leak adds about 31 points (47.5% to 78.7%). On the penguins it adds none (97.2% and 97.2%).]]

The reason is freedom. A mean from 344 rows hardly differs from one from 240, and one number per column cannot bend toward 104 test rows. Choosing 10 columns out of 500 with the labels can.

> Watch out: a tiny gap is no permission. The leak was real in both cases; only its size changed. With fewer rows or more steps it can grow, and you cannot know in advance. Split first.

::: deeper Why the best random column reaches 0.39
For columns of pure noise, the correlation with the labels of n rows scatters around 0 with a standard deviation of roughly 1 / square root of (n - 1). With 60 rows that is about 0.13. The best of 500 noise columns lies about 3 standard deviations out, near 0.39, which matches the lab. With 200 rows the scatter shrinks to about 0.07 and the best column reaches only about 0.2. More rows weaken the luck, but 500 chances always leave some.
:::

## Duplicates and a checklist
*How can the same row sit in both sets?*

A table can hold the same row twice: a customer entered two times, or several photos of one object. A near copy is just as bad. A random split with 30% test rows sends the two copies to different sets with chance 2 × 0.3 × 0.7 = 0.42, so a test row finds its twin in the training set. A model that memorizes its training rows then "predicts" it perfectly. k-NN with k = 1 is the extreme: the twin is at distance 0.

The fix: remove exact duplicates before you split, and keep near copies together on one side. The penguin file has no two identical rows, so the lab does not show this door.

Before you trust a score, ask three questions of every step, the model included. What does it learn? From which rows? Does it read the labels? If the answer to the second is "all of them", the score is not an exam.

::: remember
- A pipeline chains fill, encode, scale and model in a fixed order and fits every step on the training rows only. New rows travel through with the learned numbers unchanged.
- Leakage is information from test rows reaching training: preprocessing fitted before splitting, feature selection with all the labels, or duplicates. Selecting with the labels can turn coin flips into about 79%.
- The size of a leak depends on how much a step can bend toward the test rows. Scaling leaves a tiny gap on the penguins, selection a huge one. Split first either way.
:::

::: deeper Columns that hold the answer
A fourth door is a column that exists only because the answer is already known, such as a "refund issued" column when you predict who will cancel. It leaks the label itself. Ask of each column: would I know it at the moment I must predict?
:::

@@lab

## Lab: Leakage lab
The card is titled **Fit before or after splitting?** Two pipelines get the same data and the same split. The leaky one learns from all rows before the split, the correct one from the training rows only, and both are scored on the test rows. With generated data the lab runs the feature-selection leak on random labels. With the real penguins it runs the median-and-standardize leak.

### Controls
- **Data** switches between **Generated data** and **Penguins (real)**. With generated data the lab builds a random table with coin-flip labels and uses half the rows for training. With the penguins it asks "is it an Adelie?" and uses 70% of the penguins for training.
- **Model** chooses **Logistic regression** or **k-NN (k = 5)**.
- **Number of rows** (40 to 200, starts at 60), **Number of noise features** (20 to 1000, starts at 500) and **Features kept** (1 up to the smaller of 50 and the noise number, starts at 10) shape the random table. They disappear with the penguins.
- **New split** repeats the comparison on another split of the same data. **New random table** draws a different random table (disabled with the penguins). **Repeat 50 splits** runs 50 different splits of the same data and fills the strip chart.
- **Quick Quiz** is the button under the settings card (a round button at the bottom right on a phone). It holds two quizzes: "The labels are random. What test accuracy should an honest model get? And the leaky pipeline?" and "On the real penguins, the median and the standardization are learned from all rows (leak) or from the training rows only (correct). How different is the test accuracy?" Pick an answer. The box answers by itself as soon as a finished 50-split run of the matching data exists, or you can press its **Check answer** button. Pressing **Repeat 50 splits** or **Reset** clears the box. The order of the choices changes each time you open the page.
- **Fullscreen** and **Reset** come with every lab. Reset returns to generated data, **Logistic regression**, 60 rows, 500 noise features, 10 kept, the first split, and runs 50 splits.

### Reading the screen
- The bar chart shows **Test accuracy** (0 to 100%) of one split: **Fit preprocessing after splitting (correct)** and **Fit preprocessing before splitting (leak)**. With generated data a dashed line marks **Chance level (50%)**.
- The status line gives both scores, for example "One split (60 rows, 30 of them test rows): the correct pipeline scores 46.7% on the test rows, the leaky pipeline 83.3%." After 50 splits it adds "Over 50 splits: correct 47.5% on average, leaky 78.7%." The line under it begins "What leaked:" and says what the leaky pipeline saw. At the right, a count such as "60 rows × 500 features · split seed 1".
- The card **Test accuracy over 50 splits** has one lane for **Correct pipeline** and one for **Leaky pipeline**. Each dot is one split, the thick line is the mean and is printed as "mean 47.5%". Both lanes share one axis. With the penguins the axis starts higher and says so. After a setting changes it asks you to press **Repeat 50 splits**.
- With generated data the table **What each pipeline kept, and how it scored** has the columns **Measure**, **Correct pipeline** and **Leaky pipeline**, and the rows **Test accuracy**, **Training accuracy**, **Rows used to choose the features**, **Average correlation of the kept features with the test labels** and **Kept features (column numbers)**. A note counts the features both pipelines kept, for example "2 of 10".
- With the penguins the table **What each pipeline learned from the penguins** has the columns **Statistic**, **Correct pipeline**, **Leaky pipeline** and **Difference (leak - correct)**, with a mean and a median for each of the four measurements, and **Test accuracy**.

### Experiments
Do each experiment from a fresh start: press **Reset**, change only what the experiment says, then press **Repeat 50 splits** once. The numbers below come from that path. A later press runs other splits and moves them by a point or two.

1. Predict: the labels are coin flips. In the first Quick Quiz box, pick the test accuracy of the honest and of the leaky pipeline. Pick an answer (the box answers once the opening run has finished), then read the bar chart on the opening split: the correct pipeline scores 46.7% and the leaky one 83.3%. In the table, **Training accuracy** is 100.0% against 90.0%, **Rows used to choose the features** is 30 against 60, and the **Average correlation of the kept features with the test labels** is 0.16 against 0.34. Press **New split** three times: the scores are 26.7% and 86.7%, then 53.3% and 70.0%, then 50.0% and 80.0%. Now press **Repeat 50 splits**: 49.6% and 76.3%. Explain why the leaky pipeline wins every time on random labels.
2. Predict: will fewer or more **Number of noise features** make the leak bigger? Set it to 20 and press **Repeat 50 splits**: 50.7% for the correct pipeline and 59.7% for the leaky one, a gap of 9.0 points. Press **Reset**, set it to 1000 and repeat: 46.5% and 83.6%, a gap of 37.1 points. The default 500 gave 26.7. Explain it with the coin-flip example: more columns, more lucky ones.
3. Predict: does keeping more columns help the leaky pipeline? Press **Reset**, set **Features kept** to 1 and press **Repeat 50 splits**: 50.7% and 69.3%. A single column picked with the test labels in view already gives 18.6 points. Press **Reset**, set **Features kept** to 50 and repeat: 48.9% and 89.6%. Each kept column is another lucky match to the test answers.
4. Predict: what do more rows do to the leak? Press **Reset**, set **Number of rows** to 40 and repeat: 50.0% and 79.7%. Press **Reset**, set it to 200 and repeat: 49.7% and 67.2%. The gap shrinks from 29.7 to 17.5 points but does not vanish. Why does luck weaken with more rows and still survive among 500 columns?
5. Predict: is the leak a quirk of logistic regression? Press **Reset**, set **Model** to **k-NN (k = 5)** and repeat: 48.5% and 73.9%. A different model, a similar gap of about 25 points. Where does the leak live, in the model or in the step before it?
6. Predict: on the real penguins, will fitting the median and the standardization on all rows raise the score? Press **Reset**, pick in the second Quick Quiz box, then set **Data** to **Penguins (real)**; the box answers when the penguin run of 50 splits finishes. Read that opening run: 97.2% and 97.2%. On the first split both score 98.1%, yet the table shows **Mean of body mass (g)** 4,171.98 against 4,200.87 (+28.89) and **Median of body mass (g) (fills NA)** 4,025.00 against 4,050.00 (+25.00). Press **Repeat 50 splits**: 97.2% and 97.1%, and the leaky pipeline is ahead in 0 splits and behind in 5. Now check it on a fresh split: press **New split** once. The means become 4,134.48 and 4,200.87, and both pipelines still score 98.1%. Press **New split** again: 4,213.85 and 4,200.87, both 97.1%. What is the difference between this leak and the one in experiment 1, and why is "it barely shows" not the same as "it is safe"?
