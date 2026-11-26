---
slug: validation-lab
title: Validation lab
kind: simulator
simulator: validation-lab
minutes: 25
---
::: intro
- Predict whether random folds or grouped folds give the higher score on a table with several records per person, then check it in the lab.
- Explain the gap between the two scores with the share of test records whose person the model has already seen.
- Compare a grid search with a random search under one fixed budget, and test the idea on the real penguins with a fresh sample.

Before you start: read "Cross-validation and stratification", "Grouped and temporal splits" and "Tuning with search" in this course.
:::

## What the lab asks
*Which score can you believe when every person has several records?*

The lab builds a table of 40 generated people with 8 records each, so 320 records. A record has a time, a feature F1 that carries a real signal, three person quirks Q1 to Q3, and a label of 0 or 1. A person's quirks stay about the same from record to record, so a model can use them to recognize that person. A new person brings new quirks.

The model is a 5-nearest-neighbor classifier (**Neighbors (k)** is 5), scored with 5 folds in two ways: **Random k-fold** and **Grouped k-fold (by person)**. Each fold holds 64 records. The lab starts with these numbers: random folds score 78.4% on average and grouped folds 64.7%. The lab calls the difference the **Optimism gap**: 13.7 points.

[[figure:validation-lab/default-strips|The lab's first screen. Each dot is one fold. The thick bar is the mean of the five folds and the dashed line is the score of always guessing the majority label.]]

Always guessing the majority label gets 198 of 320 records, 61.9%. The grouped score is only 2.8 points above that line.

## Why the random score is higher
*What does the model do with a person it has already seen?*

With random folds, a test record still has about 6 of the person's 7 other records in the training data (5 or 6 on average). Their quirks nearly match, so the nearest neighbors are that person's own records, and the model repeats the person's usual label. The lab's detail line measures it: 100% of the random test records belong to a person who also has records in training. With grouped folds the share is 0%.

> Worked example: the five random folds got 48, 51, 50, 47 and 55 records right out of 64, which is 251 of 320, or 78.4%. The five grouped folds got 39, 45, 41, 36 and 46 right, which is 207 of 320, or 64.7%. The gap is 78.4 - 64.7 = 13.7 points, so you can check it with a pencil.

One record is 1 / 64, about 1.6 points of a fold's score, so the grouped dots, which run from 56.3% to 71.9%, spread over 10 records. Only the grouped score says how the model does on a new person.

> Key idea: the random score measures how well the model recognizes people it has seen. The grouped score measures what you need: how it does on a person it has not.

## Turning the quirks up and down
*Does the gap need the quirks?*

**Person quirk strength** sets how different people look from one another. Press **Reset** first, then try the values in the figure.

[[figure:validation-lab/quirk-sweep|The two means for quirk strength 0 to 4, on the lab's default table. The row under the chart is the optimism gap in points.]]

At strength 0 nobody has a signature. The random folds score 63.1% and the grouped folds 64.4%, a gap of -1.3 points, and the lab says the two scores are about the same. At strength 1 the gap is 7.5 points, at 2 it is 13.7 and at 3 it is 20.0. The random score climbs and then levels off near 78%. The grouped score first rises a little (67.8% at strength 1), then falls below where it began.

At strengths 3 and 4 the grouped folds score 58.8% and 58.4%, below the 61.9% of always guessing the majority label. For a new person the quirks carry no signal, yet they still count in the distance, so roughly speaking they add noise. The gap stops growing, but the honest score keeps falling.

## Folds, neighbors and time order
*Which other settings change the gap, and which do not?*

The gap does not go away when you change the other settings. With 3 folds it is 12.4 points (79.1% against 66.7%) and with 10 folds it is 16.0 (79.4% against 63.4%). With k = 1 it is 13.5 points. With k = 31 it is 8.2: 73.8% against 65.6%. A large k averages over more neighbors, many of them other people, so roughly speaking recognizing one person helps less. Even then the two scores differ by 8 points.

Now switch on **Also show a time-ordered split**. It trains on earlier records and tests on later ones, which is the honest design when the question is about the future. Here it scores 76.8%, close to the random 78.4%. Its detail line says that 100% of its test records belong to people already in training, because the same people keep coming back later.

> Watch out: a time-ordered split is honest about the future. It is not honest about new people. Use it when the model will predict later rows of the same entities, and a grouped split when it will meet new entities.

## Grid search and random search under one budget
*What does the same number of evaluations buy?*

The search card tunes two settings: k, and a **weight** on feature F1 (how much it counts in the distance; a larger weight shrinks the share of the quirks). One evaluation scores one pair of settings with the split chosen in **Score the search with**, which starts at **Grouped (person or island)**. The budget is 16 evaluations.

[[figure:validation-lab/search-points|The 16 settings each search tried on the default table. Squares are the grid, dots are the random search, and the circle is the best setting each found.]]

The grid tries 4 values of k and 4 of the weight, 4 x 4 = 16. The random search tries 13 values of k and 16 of the weight. A grid must be a full table, so a budget of 7 gives only 3 x 2 = 6 evaluations.

On the default table the grid reaches 71.9% and the random search 70.9%, and the lab says that neither wins. Press **New random search** four times: 71.9%, 71.9% and 71.9%, then 70.3%, where the grid wins by 1.6 points. One point is about 3 of the 320 records. Random search covers more values, but whether it wins is a draw you can watch.

## Scoring the search with the wrong split
*Why does the choice of folds matter for tuning too?*

Set **Score the search with** to **Random k-fold**. The two winners now claim 76.6% (grid) and 79.4% (random search). The lab then re-scores them on new people with grouped folds: 71.9% and 69.7%. The random-search winner claimed 79.4% and delivers 69.7%, a drop of 9.7 points.

A search picks whatever the split rewards, and a random split rewards remembering people. This is the flattered winner of "Tuning with search" again, with a leaking split added. Notice also that the grouped search settles on large weights (2.52 and 4.55 on the default table), which turn the quirks down in the distance.

> Watch out: the 71.9% of the grouped search is also the best of 16 scores on the same folds, so it is a little flattered. An untouched test set, or nested cross-validation, gives the honest figure. That is not in this lab.

## The same idea on real penguins
*Does it survive a real table?*

Set **Data** to **Penguins (real)**. For sex the lab keeps 333 of the 344 penguins (11 rows have a missing value, NA); for species it keeps 342. Each row is a different bird, so there is no person to recognize. The groups are the 3 islands, and the grouped lane is called **Leave-one-island-out**. That is a new-island question, closer to a shift (the new island looks different from the islands it learned from) than to a leak.

[[figure:validation-lab/penguin-splits|Random folds against leave-one-island-out for the real penguins, predicting sex and species. The tags name the island held out in each fold.]]

Predicting sex, random folds score 90.1% and leave-one-island-out 78.7%, a gap of 11.4 points, with Biscoe at 69.3%, Dream at 73.2% and Torgersen at 93.6%. Predicting species, the gap is 42.6 points (99.1% against 56.5%). Gentoo penguins live only on Biscoe, so holding Biscoe out removes a whole species from training.

## A fresh sample
*Is the gap just a lucky shuffle?*

Press **New sample** three times for sex. The random score becomes 91.0%, 91.6% and 91.6% and the gap 12.3, 12.9 and 12.9 points, while leave-one-island-out stays at 78.7%, because three islands can only be cut one way. The idea survives a fresh sample: a gap of 11 to 13 points does not come from a lucky shuffle.

::: remember
- Random folds let a model recognize people it has seen, so they score higher than grouped folds. Only the grouped score tells you how the model does on new people.
- The gap grows with how much a person's rows look alike, until about strength 3. It does not shrink with more folds, and a time-ordered split does not hide a person.
- Under one budget a grid tries few values and a random search tries many, but neither reliably wins. Score the search with the split that matches the use, or its winner is flattered.
:::

@@lab

## Lab: validation
The lab scores one k-NN model several ways on one table and then compares two ways of tuning it. Everything is seeded, so after **Reset** you see the same numbers as this guide.

### Controls
- **Fullscreen** enlarges the lab. **Reset** returns to generated data, **Person quirk strength** 2, **Number of folds** 5, **Neighbors (k)** 5, the time-ordered split off, **Number of people** 40, **Records per person** 8, **Search budget (evaluations)** 16, **Score the search with Grouped**, and the first sample and the first random search.
- In the **Parameters** card: **Data** switches between **Generated data** and **Penguins (real)**.
- **Predict** (**Sex** or **Species**) appears with the real data only.
- **Person quirk strength** (0 to 4) is for generated data only.
- **Number of folds** (3 to 10) and **Neighbors (k)** (1 to 31) apply to both kinds of data.
- **Also show a time-ordered split** adds a third lane. With the real data it is **Split by year**.
- **New sample** draws a new generated table and new random folds. With the real data it changes only the random folds.
- In the **Best score found against evaluations** card: **Search budget (evaluations)** (4 to 30), **Score the search with** (**Grouped (person or island)** or **Random k-fold**), and **New random search**, which draws new random settings for the same budget.
- In the **A peek at the table** card, for generated data only: **Number of people** (10 to 50) and **Records per person** (2 to 10).
- **Quick Quiz** is the button under the settings card (a round button at the bottom right on a phone). It holds one question: "Which split gives the higher score, and which one tells the truth about new people?" Pick an answer; you can also press **Check answer**.

### Reading the screen
- The strip chart has one lane for each way of splitting. Each dot is the accuracy on one held-out fold, the thick bar is the mean, and the dashed line is **Always guess the majority label** (61.9%). The right of each lane header reads, for example, "mean 78.4% ± 4.9".
- The arrow reads **Optimism gap: 13.7 points**: the difference between the two printed means.
- The status line gives the lane means and the gap. The detail line says what leaked, with the share of test records whose person is also in training. With the real data the dots of the island lane carry the island's name.
- The search chart plots **Best score so far (%)** against **Evaluations used** for **Grid search (dashed)** and **Random search**. The text under it says how many values of k and of the weight each tried, each best score with its k and weight, who won, and, when the search is scored with **Random k-fold**, what the winners score on new people.
- **A peek at the table** shows the first rows. In generated data the columns are **Person**, **Time**, **F1**, **Q1**, **Q2**, **Q3** and **Label**. With the real data they are the island, species, sex, flipper, bill and body mass columns and the year.

### Experiments
Press **Reset** before each one so that your numbers match the guide.

1. **Which split flatters the model?** Predict: in **Quick Quiz**, pick which split scores higher and which one is honest. Then read the strip chart: 78.4% for **Random k-fold**, 64.7% for **Grouped k-fold (by person)**, and **Optimism gap: 13.7 points**. The detail line says 100% against 0%. How far above the dashed line, 61.9%, is the grouped mean? Explain what the model does with a random test record.
2. **Switch the quirks off.** Predict: what happens to the gap at **Person quirk strength** 0? Set it to 0: 63.1% against 64.4%, a gap of -1.3, and the detail line says about the same. Try 1 (7.5 points) and 3 (78.8% against 58.8%, 20.0 points). At 3 the detail line adds that the model scores below the majority guess. Why does the grouped score fall while the random score levels off?
3. **Folds, neighbors and time.** Predict: will more folds, a bigger k or a time-ordered split close the gap? Set **Number of folds** to 3 and to 10 (12.4 and 16.0 points), then back to 5. Set **Neighbors (k)** to 1 and 31 (13.5 and 8.2 points). Then switch on **Also show a time-ordered split**: it scores 76.8%, like the random lane. Why does time order not hide a person?
4. **Grid or random search?** Predict: with 16 evaluations, will random search beat the grid? Read the card: 71.9% (k = 21, weight 2.52) against 70.9% (k = 19, weight 4.55), and no winner. Press **New random search** four times and note the best score of each draw. Then set **Search budget (evaluations)** to 7 and read the line about 6 of the 7 evaluations. What does the grid give up?
5. **The wrong split for the search.** Predict: if you score the search with **Random k-fold**, how much of the winner's score survives on new people? Set **Score the search with** to **Random k-fold**: 76.6% and 79.4%, but 71.9% and 69.7% on grouped folds. How many points did the random-search winner lose? Switch back and compare.
6. **Penguins and a fresh sample.** Predict: will leave-one-island-out also score lower on real penguins, and for which target by more? Set **Data** to **Penguins (real)**. For **Sex**: 90.1% against 78.7%, 11.4 points. Switch **Predict** to **Species**: 99.1% against 56.5%, 42.6 points, and the detail line names the species that vanishes. Go back to **Sex** and press **New sample** three times: random 91.0%, 91.6%, 91.6%, and the island lane stays 78.7%. Is this a person leak, or a shift to a new island?
