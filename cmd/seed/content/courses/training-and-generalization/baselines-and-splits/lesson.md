---
slug: baselines-and-splits
title: Baselines and splits
kind: reading
simulator: ""
minutes: 15
---
::: intro
- Use a baseline to tell whether a score is good.
- Explain why a model must be judged on rows it has not seen.
- Cut data into training, validation and test sets, and say what each one is for.

Before you start: read "Supervised, unsupervised and the three questions" and "Loss functions".
:::

## Is 90% a good score?
*How do you know whether a result is good or just easy?*

A score alone says little. Suppose a classifier gets 90% of its answers right. Is that impressive? It depends on how hard the question is. If 95 of every 100 cases belong to one class, a rule that never looks at the data and always names that class already scores 95%. A model at 90% would be worse than that lazy rule.

Take the penguin table: 342 penguins with measurements, from three species. Asked "which species?", the laziest answer is "Adelie" every time, because Adelie is the most common species (151 of 342). That rule is right for 151 / 342 = 44.2% of penguins.

So for this question 44.2% is the bar. A model at 40% is worse than guessing "Adelie" blindly. A model at 90% is a real achievement.

A **baseline** is a deliberately simple method whose score sets that bar. You always compute it first, before building anything clever.

> Key idea: a score means something only next to the score of a simple alternative.

## Two baselines to know
*What is the laziest sensible answer for each kind of question?*

For **classification**, the baseline is the **majority class**: always answer the class that is most common among the training rows. Its accuracy is that class's share. The 44.2% above is exactly this.

For **regression**, the baseline is a **constant**: give every row the same number, usually the mean of the training targets. (The median is a fair alternative when outliers, a few extreme values, pull the mean.) It ignores every feature, so it needs no learning at all.

> Worked example: the six penguins from the earlier lesson weigh 3750, 3250, 3500, 3900, 4500 and 5700 g. Their mean is 24600 / 6 = 4100 g. The misses are 350, 850, 600, 200, 400 and 1600 g, so the mean absolute error is (350 + 850 + 600 + 200 + 400 + 1600) / 6 = 4000 / 6 = 666.7 g. A real model must have a typical miss clearly below 667 g to be worth anything.

[[figure:baselines-and-splits/baselines|The two baselines on penguin data: always name the most common species, and always predict the mean mass.]]

A baseline costs one line of code and protects you from fooling yourself.

## The trap of scoring on training data
*Why not just test the model on the rows it learned from?*

A model is useful only on rows it has never seen: tomorrow's email, next month's patients. So the question is never "how well does it match the data we gave it?" but "how well will it do on new data?" Doing well on new data is called **generalizing**.

Scoring on the training rows hides this. Imagine a model that simply stores the whole training table and answers by lookup. Ask it about a row it stored and it replies with the stored answer: error 0. It has learned nothing about penguins, yet on its own training data it looks perfect.

A student who memorizes last year's exam answers scores 100% on that exam and may fail the next one. Training error is last year's exam.

The fix is to **hold out** some rows: set them aside before training, never train the model on them, and score the model on them afterwards. Held-out error estimates how the model will behave on genuinely new rows.

> Key idea: only data the model did not learn from can tell you how it will do on new data.

## Training, validation and test
*What job does each part of the data do?*

One held-out set is not quite enough, because you will use it to make decisions, and a set that guides decisions is no longer fully fresh. So the labeled data is cut into three sets:

- **Training set.** The model fits its **parameters** here, meaning it adjusts them to match these rows, such as the slope and intercept of a line.
- **Validation set.** You use it to compare models and to choose **settings**, such as how many bends a curve may have. A setting (also called a hyperparameter) is something you pick before training, not something the model learns. Your baseline is scored here too, so the baseline and the model face the same rows.
- **Test set.** You use it once, at the very end, to report how well your final choice does.

[[figure:baselines-and-splits/three-sets|The 342 penguins cut about 60% / 20% / 20%, with the job of each part.]]

The test set is your last honest estimate. Each time you look at it and then change something, it quietly stops being unseen. That is why it is touched once.

> Watch out: the 60 / 20 / 20 cut is a common starting point, not a law. With a lot of data, smaller validation and test sets are enough.

## Cutting the rows fairly
*How should the rows be divided?*

**Shuffle first.** Tables are often sorted. The six penguins listed earlier are sorted by species. Cut off the last two rows as held-out data and you hold out two Gentoo penguins while the model trains on Adelie and Chinstrap only.

> Worked example: train on penguins 1 to 4 (3750, 3250, 3500, 3900 g): the mean is 3600 g. Hold out penguins 5 and 6 (4500 and 5700 g). The baseline misses by 900 and 2100 g, so its error is (900 + 2100) / 2 = 1500 g. That is more than twice the 666.7 g from the full six, because the split was lopsided, not because the baseline got worse.

**Stratify when classes are uneven.** A shuffled cut can still drift by chance. Cut the 342 penguins at random (seed 4) and the training set holds 49 Chinstrap penguins out of 205 (23.9%), while the test set holds 5 out of 69 (7.2%). A **stratified** split cuts each species separately, so every set keeps about the same mix.

[[figure:baselines-and-splits/stratify|The same 342 penguins cut twice with seed 4. A plain shuffle leaves the test set short of Chinstrap penguins. A stratified cut keeps each share near 20%.]]

Fix the random **seed**, the number that starts the shuffle, so the same cut can be repeated.

## A worked comparison
*What do the three sets look like on real penguins?*

Cut the 342 penguins with a stratified split (seed 4): 206 training, 69 validation and 67 test penguins. We compare methods on validation and leave the test set alone.

For the species question, the majority class in training is Adelie (91 of 206, 44.2%). Always answering Adelie is right for 30 of the 69 validation penguins: 43.5%.

For body mass, three methods are fitted on the training rows only. The memorizer answers each penguin with the training penguin whose bill length, bill depth and flipper length are closest. Errors are mean absolute error in grams:

| Method | Training error | Validation error |
|---|---|---|
| Baseline: the training mean, 4215 g | 658 | 693 |
| A line from flipper length | 309 | 344 |
| Memorizer: copy the training penguin with the most similar bill and flipper measurements | 0 | 391 |

**Reading it.** The line halves the baseline's error (344 against 693), so it is worth keeping. The memorizer is perfect on training but misses by 391 g on new rows, worse than the line. The line itself does a little better on training than on validation (309 against 344), a first sign that training error is optimistic.

## How much to trust one cut
*Is a single split enough to decide?*

Not always. Every number above comes from one cut, and a different seed would give different rows and different numbers.

> Watch out: 69 validation penguins and one cut are a small sample. Over seeds 1 to 30 the line's validation error ranged from 270 to 364 g. It beat the baseline every time, but on two cuts it was no better than the memorizer.

::: deeper When data is too small to spare 40%
With very few rows, a validation set of a dozen is a noisy judge. One answer is **cross-validation**: cut the training data into k parts, called folds, and let each fold take a turn as the validation set while the model trains on the rest. Average the validation scores. The test set stays outside this loop and is still used once.
:::

## Keeping the test set clean
*How does test information sneak into training by accident?*

**Leakage** means information from the validation or test rows influences training or tuning. Scores then look better than reality, and nothing crashes to warn you.

- **Fitting on everything.** Anything learned from data counts: scaling numbers (rescaling a column to a common range), the mean in a mean baseline, the majority class. Compute them on the training set only. If you take the mean of all 342 masses (4202 g) before splitting, the held-out rows helped set it.
- **Tuning on the test set.** Choosing a setting by test score turns the test set into a validation set.
- **Duplicates and time.** Rows that appear in two sets give false comfort. For rows ordered in time, train on earlier rows and test on later ones, because shuffling lets the model peek at the future.

> Watch out: if a result looks too good, look for a leak before you celebrate.

## Before the lab
*What will the course lab let you try?*

The lab in this course, "Train, validation and test", lets you try the split idea yourself. You change how flexible a model is and how much data it trains on, then read the training error and the validation error side by side. It does not cover baselines, stratifying or leakage, so bring those habits with you. The next lesson, "Underfitting and overfitting", explains what the two errors tell you.

::: remember
- A score means something only next to a baseline: the majority class for classification, the mean for regression.
- Train fits parameters, validation compares models and picks settings, test reports once. Shuffle first, and stratify when classes are uneven.
- Fit every number learned from data on the training set only, or the test set leaks.
:::
