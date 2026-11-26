---
slug: intermediate-capstone-project
title: Intermediate capstone project
kind: simulator
simulator: capstone-l2
minutes: 50
---
::: intro
- Frame a cost-sensitive fraud project on synthetic card transactions and derive the threshold from what each mistake costs.
- Choose a split that imitates how the model will be used, defend it against the other two, and tune and compare models on the training rows only.
- Report held-out scores with bootstrap intervals, say what they cannot tell, and rate your own project against a rubric.

Before you start: read "Defending an evaluation", "Reproducible pipelines" and "ROC and precision-recall". The first gave you the five questions of an evaluation, the second how to keep a run repeatable, and the third the AUC and average precision that the lab reports.
:::

## The brief
*What do you build in the workbench, and what is the data?*

The **Level 2 capstone workbench** is the project that closes the level. A bank wants to flag fraudulent card transactions. You build a classifier and defend every step of the evaluation.

The data are synthetic: a program generated them, and no real customer is behind them. Dataset 1 holds 1,200 transactions from 60 customers over 90 days, 20 per customer. Each has an amount, an hour, a merchant risk and a device fingerprint, and 93 of the 1,200 are fraud (7.8%). The lab offers 24 such datasets.

Customers repeat and time passes, so what will be new when the model is used decides the split.

The workbench has six steps. Each opens when the one before it is done, and "done" is checked on the work: step 1 needs the costs set and the right reasons ticked.

[[figure:intermediate-capstone-project/six-steps|The six steps of the workbench and what the lab checks before it opens the next one.]]

> Key idea: the project is a chain of defences. A weak link, such as a leaky split, spoils every number after it.

## Step 1: the costs
*What does a mistake cost, and what does accuracy hide?*

A **false alarm** flags a good transaction, and a **missed fraud** lets a bad one through. The lab starts at 5 for a false alarm and 50 for a missed fraud, in one shared unit such as money or reviewer minutes.

Accuracy hides the difference. On Dataset 1 a model that never flags is right on 1,107 of 1,200 transactions, 92.3%, yet misses all 93 frauds: 93 × 50 = 4,650, or 3.88 per transaction. A model that flags everything raises 1,107 false alarms: 1,107 × 5 = 5,535, or 4.61 per transaction. A model must beat both.

> Worked example: flag a transaction with fraud probability p when not flagging is the costlier bet, that is when p × 50 is at least (1 - p) × 5. That gives 55p ≥ 5, so p ≥ 5 / 55 = 9.1%. This is the **cost threshold**, as in "Calibration and costs".

Step 1 is done when you press **Set these costs** and tick exactly the two true reasons why accuracy misleads: fraud is rare, and accuracy treats both mistakes as equal.

## Step 2: choose and defend a split
*Who will the model meet, and does your split imitate that?*

Start from one sentence: when the model is used, what will be new? A **random** split tests on any transaction. A **grouped** split sends a whole customer to one side: on Dataset 1, 45 customers train and 15 test (900 and 300 rows). A **temporal** split trains on the earliest 900 rows, up to day 67, and tests on the latest 300.

The lab measures how optimistic each split is with one reference forest, a flexible model with fixed settings, scored on each split (the AUC is the mean of 5 splits; the temporal split has only one). A plain baseline cannot show it: it scores AUC 0.5 everywhere.

| Split | AUC of the reference forest | Lowest to highest of 5 splits | Test rows whose customer was in training |
|---|---|---|---|
| Random | 0.84 | 0.77 to 0.89 | 100% |
| Grouped by customer | 0.72 | 0.64 to 0.78 | 0% |
| Temporal (by time) | 0.88 | one possible split | 100% |

[[figure:intermediate-capstone-project/split-optimism|The reference forest on Dataset 1: AUC for each split, and the share of test rows whose customer was already in training.]]

The device fingerprint is almost constant within one customer and says nothing about fraud across customers. A flexible model can still use it to recognise a customer and recall that customer's history, and that pays when the customer is in both the training and the test rows. The temporal split removes the future but keeps every customer. Then write a one-line defence.

## Step 3: three models, one search
*How do you compare models without touching the held-out rows?*

Three models compete: the **Baseline**, which gives every row the training fraud rate (AUC 0.5); **Logistic regression**, with an L2 penalty to tune; and a **Random forest**, with a maximum depth to tune. The two tunable models each get the same small search: five values, scored by AUC on 3 validation folds inside the training rows. The lab fixes its seeds, so a clean start repeats these numbers, which lets someone rerun your project. Every fit and every search uses the training rows only, the pipeline rule from "Reproducible pipelines".

The folds follow your split: with the grouped split a customer is never on both sides of a fold, as in "Grouped and temporal splits".

| Forest: maximum depth | 2 | 3 | 5 | 8 | 12 |
|---|---|---|---|---|---|
| Grouped: validation AUC | 0.76 | 0.73 | 0.68 | 0.67 | 0.63 |
| Random: validation AUC | 0.79 | 0.82 | 0.81 | 0.84 | 0.81 |

On the grouped split the shallowest forest wins and depth 12 is far behind. On the random split depth 8 wins. Deep trees can remember each customer, which pays only when customers return: the best setting depends on the split.

The L2 penalty barely matters: all five scores are about 0.70 on the grouped split. Scores within 0.005 of the best tie, and the first value wins, here the weakest penalty: a strong one shrinks every probability toward the average and would spoil the threshold.

## Step 4: what the held-out rows can say
*How sure can you be of a score from 18 frauds?*

Now the held-out rows (also called the test rows) are scored once. On the grouped split they hold 300 transactions and only 18 frauds, so every score rests on a handful of cases. Each comes with a 95% **bootstrap interval**: resample the 300 rows with replacement, score again, repeat B times, and keep the middle 95%.

| Model | AUC | Average precision | Expected cost per transaction |
|---|---|---|---|
| Baseline | 0.50 | 0.06 (0.03 to 0.08) | 3.00 (1.67 to 4.17) |
| Logistic regression | 0.74 (0.62 to 0.85) | 0.16 (0.09 to 0.31) | 2.65 (2.02 to 3.25) |
| Random forest | 0.70 (0.58 to 0.81) | 0.11 (0.07 to 0.22) | 2.65 (1.68 to 3.52) |

The baseline's AUC is exactly 0.50 whichever rows are drawn, so it has no spread.

Validation put the forest ahead, 0.76 to 0.70. The held-out rows put the logistic regression ahead, 0.74 to 0.70, but the AUC difference, logistic minus forest, is +0.05 with an interval of -0.02 to 0.11. The difference is computed from the unrounded scores (0.745 and 0.699), so it shows as +0.05. The interval includes zero, so these rows cannot say which model is better.

[[figure:intermediate-capstone-project/interval-by-split|Held-out AUC with 95% intervals for the grouped and the random split on Dataset 1. On the random split the forest is clearly ahead; on the grouped split the intervals overlap.]]

> Watch out: the bootstrap resamples transactions one by one, but the 300 held-out rows come from only 15 customers. Their transactions are not independent, so the true uncertainty is wider than these intervals. "Defending an evaluation" resampled whole patients for this reason.

## Step 5: the threshold
*Where do you cut the probabilities, and who picks the cut?*

The threshold turns each fraud probability into a flag, and the costs choose it, not the held-out rows. On the grouped split the logistic regression at 9.1% flags 133 of the 300 transactions and catches 14 of the 18 frauds (recall 78%). It raises 119 false alarms, so precision is 11%.

> Worked example: 4 missed frauds cost 4 × 50 = 200, and 119 false alarms cost 119 × 5 = 595. The total is 795, or 795 / 300 = 2.65 per transaction. Flagging nothing costs 18 × 50 / 300 = 3.00 and flagging everything costs 282 × 5 / 300 = 4.70.

[[figure:intermediate-capstone-project/cost-curve|Expected cost per transaction at each threshold on the grouped held-out rows, for the logistic regression. The curve dips at 13.5%, but the dip was found on the test rows.]]

The curve dips lower at 13.5%: 77 flagged, 13 of 18 caught, cost 1.90. Moving there looks like a gain, but you found the dip on the test rows, so the reported 1.90 is optimistic and the lab warns you. Use the cost threshold, and say it is approximate: a model's probabilities are not always true probabilities.

## Step 6: report and rate
*What do you write down, and what are the limits of the result?*

Step 6 asks for three short texts: **The split and why**, **The model I chose and why** and **What could go wrong**. Then you rate **Split defence**, **Fair comparison**, **Uncertainty** and **Threshold** as **Not yet**, **Partly** or **Yes**. The lab joins everything into a **Capstone summary** you can copy.

> Worked example: "The data are synthetic. I split by customer, because the model will score customers it has not seen; a random split gave the reference forest 0.84 AUC against 0.72. I took the forest forward. On 300 held-out rows with 18 frauds its AUC is 0.70 (0.58 to 0.81), and the logistic regression's interval overlaps it. I flagged at 9.1%."

Before you trust a finding, press **New transactions** and check it on a fresh dataset, then name the limits in your report.

::: remember
- Write the split as a sentence about how the model will be used, check how optimistic each split is, and tune inside the training rows with folds that follow the split.
- A held-out score with a rare label is one draw: report intervals, say which differences the rows cannot settle, and take the threshold from the costs, not from the test curve.
- Report the limits too: synthetic data, one cut, few frauds from few customers, and a bootstrap that treats transactions as independent.
:::

@@lab

## Lab: Level 2 capstone workbench
The six steps open in order, and your work is saved in this browser only. The numbers below hold from a clean start: press **Start over**, then press it again while it reads **Press again to erase everything**. The lab then shows Dataset 1 of 24 (1,200 synthetic transactions, 93 fraud), costs of 5 and 50, and 200 bootstrap resamples.

### Steps
1. **Frame the problem.** Good: you can say why a model that never flags looks good and is not.
2. **Choose and defend a split.** Good: your split imitates how the model will be used, and you know how optimistic the other two are.
3. **Compare models.** Good: same split, same search, training rows only.
4. **Measure the uncertainty.** Good: you say which differences the held-out rows cannot settle.
5. **Choose the threshold.** Good: it comes from the costs, not from the test curve.
6. **Report and rate.** Good: your ratings match the evidence.

### Controls
- The six chips above the steps jump to a step. A later step is locked ("Finish step N first") until the one before it is done; **Continue to step N** moves on.
- Step 1. **New transactions** moves to the next of 24 datasets and resets steps 2 to 5. **Cost of a false alarm (a good transaction is flagged)** (1 to 20, starts at 5) and **Cost of a missed fraud (a fraud is not flagged)** (5 to 200, starts at 50). **Set these costs** confirms them. **Why would a plain accuracy mislead here? Tick every reason that is true.** lists three reasons.
- Step 2. **1. Choose the split that matches how the model will be used**: **Random**, **Grouped by customer**, **Temporal (by time)**. **Compare the three splits** fills the table. **2. Your one-line defence of the split** holds 200 characters. Choosing another split resets steps 3 to 5.
- Step 3. **Search the penalty strength** and **Search the maximum depth** score five values each. **Value of L2 penalty to use** and **Value of max depth to use** start at "Best of the search". **3. The model I take forward to the held-out rows**: **Logistic regression** or **Random forest**.
- Step 4. **Bootstrap resamples (B)** (100 to 1000, starts at 200). **Score the held-out rows** fits the models on the training rows and scores the held-out rows once. **How would you read these intervals?** offers four readings.
- Step 5. **Threshold (flag a transaction when its probability reaches this)** moves in steps of 0.5 points. **Use the cost threshold** puts it back at the cost threshold. **Use this threshold** confirms your choice.
- Step 6. **The split and why**, **The model I chose and why** and **What could go wrong** hold 500 characters each. **Rate your own work** has four criteria with three levels each. **Copy summary** copies the **Capstone summary**.
- The round **Quick Quiz** button opens the Quick Quiz panel; its badge pulses when step 2 opens. **Start over** and **Reset** erase your work, but only on a second press within five seconds.

### Reading the screen
- The status reads "N of 6 steps done". The **Your project** card lists **Dataset**, **Costs**, **Split**, **Model** and **Threshold**.
- Step 1 gives the size of the dataset and its fraud count, draws the **Class balance** bar, prices a model that never flags and one that flags everything, and shows the threshold rule.
- Step 2 shows the table "How optimistic each split is: one reference forest, scored on the test rows of each split", with **Split**, **AUC of the reference forest**, **Lowest to highest of 5 splits**, **Test rows whose customer was in training** and **Your split minus this split**, then sentences saying whether your split is the more optimistic or the stricter one.
- The Quick Quiz asks "Compared with a grouped split, what AUC will a random split give the reference forest?" and reveals the two AUCs after you answer.
- Step 3 shows **Validation AUC** and **Spread over the folds** for the five values, then **The three models side by side** and a sentence on whether the gap beats the fold-to-fold noise.
- Step 4 shows each score as estimate (lower end – upper end), a chart of the AUC intervals (dashed line: AUC 0.5) and the interval of the difference between the two models.
- Step 5 shows **Cost threshold**, **Your threshold**, **Flagged**, **Precision** (shows "–" when **Flagged** is 0), **Recall**, **Expected cost per transaction** and **Total cost on the held-out rows**, a confusion matrix, the chart **Expected cost on the held-out rows at each threshold**, and a warning when you leave the cost threshold.

### Experiments
1. **Which split flatters a model?** Predict: open the Quick Quiz (the round button) and answer before you look. Setup: in step 1 press **Set these costs** and tick the first two reasons. In step 2 choose **Grouped by customer** and press **Compare the three splits**. The reference forest gets AUC 0.84 on **Random**, 0.72 on **Grouped by customer** and 0.88 on **Temporal (by time)**; the customer was in training for 100%, 0% and 100% of the test rows. Explain it with the device fingerprint. Why is the temporal split high too, when it never shows the model the future?
2. **Does the best setting depend on the split?** Predict: on the grouped split, will deeper forests score better or worse? Setup: in step 3 press **Search the penalty strength** and **Search the maximum depth**. Depths 2, 3, 5, 8 and 12 score 0.76, 0.73, 0.68, 0.67 and 0.63, so the shallowest wins; all five penalties score about 0.70. Now choose **Random** in step 2 and search again: 0.79, 0.82, 0.81, 0.84 and 0.81, so depth 8 wins. Why do deep trees pay off under one split only?
3. **Can the held-out rows tell the models apart?** Predict: on the grouped split the forest led in validation, 0.76 to 0.70. Will the held-out rows confirm that? Setup: choose **Grouped by customer**, search both models, take **Random forest** forward and press **Score the held-out rows**. AUC is 0.50 for the baseline, 0.74 (0.62 – 0.85) for the logistic regression and 0.70 (0.58 – 0.81) for the forest, and the difference forest minus logistic is -0.05 with an interval of -0.11 to 0.02: it includes zero. Pick the matching reading. Then repeat on **Random**: forest 0.85 (0.77 – 0.92), logistic 0.75 (0.63 – 0.84), difference +0.09 (0.01 to 0.20). Why is a clear win on random not a clear win on grouped?
4. **Does more resampling narrow the interval?** Predict: if you raise **Bootstrap resamples (B)** from 200 to 1000, will the AUC interval of your model get narrower, stay about the same or get wider? Setup: on the grouped split with the forest forward, the AUC interval is 0.70 (0.58 – 0.81) at 200. At 1000 it is 0.70 (0.58 – 0.81) again, and at 100 it is 0.70 (0.59 – 0.82). Explain it: what sets the width, and what would narrow it?
5. **Where should the threshold be?** Predict: if you drag **Threshold (flag a transaction when its probability reaches this)** to the lowest point of the curve, will the reported cost be honest? Setup: on the grouped split take **Logistic regression** forward in step 3 and open step 5. At 9.1% it flags 133 / 300, with **Precision** 11%, **Recall** 78% and **Expected cost per transaction** 2.65 (total 795); the matrix shows 14 caught, 4 missed, 119 false alarms and 163 true negatives. Flagging nothing costs 3.00 and everything 4.70. Drag to 13.5%: 77 flagged, precision 17%, recall 72%, cost 1.90, and the lab warns that you tuned on the test rows. Press **Use the cost threshold**. Then set the missed-fraud cost to 100 in step 1: the threshold becomes 4.8%, 214 are flagged (recall 89%) and the cost is 3.97, against 6.00 for flagging nothing and 4.70 for everything. Set it back to 50.
6. **A fresh dataset.** Predict: will the grouped split still be the strictest on other datasets? Setup: in step 1 press **New transactions**. Dataset 2 holds 98 frauds (8.2%); press **Compare the three splits** in step 2: random 0.84, grouped 0.66, temporal 0.84. Dataset 3 holds 95 frauds (7.9%): 0.94, 0.74, 0.91. Over all 24 datasets grouped is the lowest every time, and random minus grouped runs from 0.07 to 0.31. How would you word the finding?

### Rubric
Rate each criterion at the end of step 6 with **Not yet**, **Partly** or **Yes**. The lab prints these sentences.

| Criterion | Not yet | Partly | Yes |
|---|---|---|---|
| Split defence | I chose a split without saying who the model will meet in use: new customers, or the future. | I said who the model will meet, but I did not explain why my split fits that. | I matched the split to how the model will be used, compared it with the other splits, and wrote a one-line defence. |
| Fair comparison | I compared the models on different rows, or on rows the models were tuned on. | Same rows for every model, but the tuning search did not follow the split, or I chose a model by looking at the held-out rows. | Same split for every model, each tuned the same way on the training part only, and the held-out rows untouched until the end. |
| Uncertainty | I reported single numbers from the held-out rows. | I looked at the intervals but did not use them to say what these rows cannot tell. | I reported AUC, average precision and expected cost with intervals, said which differences are real and which are within the noise, and said how few frauds there are. |
| Threshold | I used 50%, or picked the threshold by eye. | I used the costs, but I tuned the threshold on the held-out rows, or I did not question the probabilities. | I set the threshold from the costs, read the expected cost and the confusion matrix, and said what would change it. |

### Real data
This lab has no real table and no switch to one: every transaction is synthetic, and the device fingerprint was built to leak. Ask of any real table: does an entity (a customer, a patient, a device) appear in many rows, and is there a time order? If so, choose the split from that answer and write it down.
