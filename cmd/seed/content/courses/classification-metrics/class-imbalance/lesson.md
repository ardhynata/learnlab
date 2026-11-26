---
slug: class-imbalance
title: Class imbalance
kind: reading
simulator: ""
minutes: 15
---
::: intro
- Explain why accuracy can look excellent on data where one class is rare.
- Compute the majority-class baseline and judge a model against it.
- Use precision, recall and F1, and name the simple remedies for imbalance: resampling and class weights.

Before you start: read "Measuring a classifier".
:::

## When one class is rare
*What is class imbalance, and where do you meet it?*

A dataset has **class imbalance** when one class has far more cases than another. The common class is the **majority class**; the rare one is the **minority class**. Usually the rare class is the one you are hunting, so it is the positive class from the confusion-matrix lessons.

Rare positives are normal, not a special case. Most payments are honest, most emails from a bank are real, most patients screened for a rare illness are healthy, and most machines on a factory floor are not about to break.

Here is the example for this lesson: a payment service checks 10,000 payments, and 100 of them are fraud. That is a positive rate of 1 percent. Another way to say it: 99 payments in 100 are honest.

[[figure:class-imbalance/rare-class|Each square stands for 100 payments. Only one square in the grid is fraud.]]

The trouble is that the usual way to score a classifier, accuracy, counts every case the same. When one class is 99 percent of the data, accuracy is mostly a measure of how that class is doing.

## Why accuracy misleads
*Can a model that finds no fraud at all score 99 percent?*

Take the laziest model there is: it answers "honest" to every payment, whatever the payment looks like. Count its results on the 10,000 payments.

- It misses all 100 frauds: TP = 0, FN = 100.
- It is right about all 9,900 honest payments: TN = 9,900, FP = 0.
- Accuracy = (0 + 9,900) / 10,000 = 0.99.
- Recall = 0 / 100 = 0.

So the model scores 99 percent and catches nothing. It never even looks at the data. Accuracy rewarded it for the 9,900 easy cases and ignored the 100 that matter.

> Key idea: accuracy is the share of cases answered correctly, so a big class decides it. When the cases that matter are few, a high accuracy can hide a model that finds none of them.

Now a model that really tries. On the same 10,000 payments it gets TP = 60, FN = 40, FP = 140 and TN = 9,760. Its accuracy is (60 + 9,760) / 10,000 = 0.982. That is lower than the lazy model's 0.99, yet this model catches 60 of the 100 frauds. For the job at hand it is far more useful.

## The majority-class baseline
*Which number must a model beat before it counts as useful?*

The lazy model has a name: the **majority-class baseline**. It always answers with the majority class and ignores the data. Its accuracy is simply the share of the majority class: 99 percent here, because 9,900 of 10,000 payments are honest.

A **baseline** is the simplest answer you can give without learning anything. A model is only worth something if it beats the baseline on the measure you care about. This gives a rule you can apply to any accuracy figure you are shown.

> Key idea: before you read an accuracy, find the positive rate and compute the majority-class baseline, which is 1 minus the positive rate. An accuracy at or near that baseline says almost nothing.

There is a second, opposite baseline: always answer "fraud". It has recall 1, since it flags every fraud, but precision 0.01, since only 100 of its 10,000 yes answers are real. Its F1 is 2 x 0.01 x 1 / (0.01 + 1) = 0.02. Any useful model has to do better than both.

[[figure:class-imbalance/baseline-vs-model|The same 10,000 payments, scored by the always-honest baseline and by the trained model. Accuracy puts the baseline first; recall and F1 put it last.]]

## What to look at instead
*Which numbers still tell the truth when positives are rare?*

Look at the numbers that are about the positive class. You know them from the confusion-matrix lessons, and each one ignores the pile of true negatives.

| Number | Question | Trained model |
|---|---|---|
| Recall | Of the real frauds, how many did it find? | 60 / 100 = 0.60 |
| Precision | Of the payments it flagged, how many are fraud? | 60 / 200 = 0.30 |
| F1 | Are both decent? | 2 x 60 / (2 x 60 + 140 + 40) = 0.40 |

Read together: the model finds 60 percent of the frauds, and about 3 flagged payments in 10 are really fraud. It raises 140 false alarms. Whether that is good depends on what an alarm and a missed fraud cost, a question about your business, not the data.

Also keep the **confusion matrix** itself in view. Four counts tell you more than any single score, and they show the 100 positives, where accuracy hid them.

::: deeper Accuracy as a weighted average
Accuracy mixes the two classes in proportion to their sizes: accuracy = (positive rate) x recall + (1 - positive rate) x (share of negatives answered correctly). For the trained model that is 0.01 x 0.60 + 0.99 x (9,760 / 9,900) = 0.006 + 0.976 = 0.982. The negatives carry a weight of 0.99 and the positives only 0.01, so a recall of 0.60 moves accuracy by just 0.006.
:::

## Rarer positives, lower precision
*Why does the same model look worse when positives get rarer?*

Precision depends on the data as well as on the model. Suppose the model keeps the same recall (0.60) and the same false-alarm behavior, which is 140 false alarms among 9,900 honest payments. Now change only how many fraud cases there are.

| Frauds among 9,900 honest | Positive rate | True positives | Precision |
|---|---|---|---|
| 100 | 1 percent | 60 | 60 / 200 = 0.30 |
| 1,100 | 10 percent | 660 | 660 / 800 = 0.825 |
| 9,900 | 50 percent | 5,940 | 5,940 / 6,080 = 0.977 |

The model did not improve. The false alarms stayed at 140, but they sit beside more real catches, so a larger share of the yes answers is right. The reverse holds too: a model with fine-looking precision on a balanced test can drown in false alarms when it meets real, rare data.

[[figure:class-imbalance/precision-vs-rate|Precision of the same model as the share of fraud grows. The three dots are the rows of the table.]]

> Watch out: judge a model on data with the positive rate it will meet in use. Precision measured on a balanced sample does not carry over to the real world.

## Simple remedies
*What can you do when the model ignores the rare class?*

A model trained on 99 percent honest payments can score well by leaning toward "honest". Two simple remedies make the rare class count more during training. This lesson names them; it does not build them.

- **Resampling** changes the training set. *Oversampling* repeats rare cases (or makes new ones that resemble them) until the classes are closer in size. *Undersampling* throws away some common cases.
- **Class weights** keep the data as it is but make each rare case count more in the loss. If honest payments weigh 1 and frauds weigh 99, one missed fraud costs as much as 99 honest payments wrongly flagged.

[[figure:class-imbalance/remedies|A toy set of 20 payments, 2 of them fraud, and what each remedy does to it. In the last three rows the two classes end up with equal total influence.]]

Both have a price. Oversampling by repeating cases can make a model memorize them. Undersampling discards information. Weights can push the model to raise more false alarms.

> Watch out: change only the training data. Leave the validation and test sets at the real positive rate, or your metrics describe a world that does not exist.

## Reporting results honestly
*What should you write down when you report a classifier on imbalanced data?*

A short checklist keeps you honest:

1. **State the positive rate** of the test data, and the majority-class baseline that follows from it.
2. **Show the confusion matrix**, or at least TP, FP and FN.
3. **Report precision, recall and F1** for the positive class, not accuracy alone.
4. **Say what each error costs**, and which of precision or recall you chose to favor.
5. **Mention the sample size of the rare class.** Recall of 0.60 from 100 frauds rests on 100 cases. With 10 frauds, one more catch moves recall by 10 points.

Accuracy is not forbidden. On balanced classes with equal costs it is a fine summary. The point is only that it is the wrong thing to trust first when one class is rare.

::: deeper Why precision follows the positive rate
With recall r, a false-alarm rate f among negatives and a positive rate p, precision = r x p / (r x p + f x (1 - p)). Here r = 0.60 and f = 140 / 9,900 = 0.0141. At p = 0.01 that is 0.006 / (0.006 + 0.014) = 0.30. As p grows, the first term in the bottom grows and the second shrinks, so precision climbs toward 1.
:::

## Next: the imbalance lab
*How can you see all of this move?*

The next lesson is the Imbalance lab. It lets you change the fraction of positive examples and set a majority-class baseline beside a trained model. You can then watch accuracy stay high while recall collapses, and watch precision fall as positives get rarer.

Use it with the checklist above. Before you change a setting, predict what happens to accuracy, recall and precision. After the change, explain the result with the baseline. Then check your explanation against the confusion matrix the lab shows.

::: remember
- When one class is rare, accuracy mostly measures the big class. Compare it with the majority-class baseline, which is 1 minus the positive rate.
- On rare positives, look at the confusion matrix, precision, recall and F1. Precision also falls as positives get rarer, even for the same model.
- Resampling and class weights make the rare class count more in training. Apply them to training data only; keep the test set at the real rate.
:::
