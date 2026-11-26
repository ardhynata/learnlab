---
slug: advanced-capstone-project
title: Advanced capstone project
kind: simulator
simulator: capstone-l3
minutes: 60
---
::: intro
- Frame a daily review system on synthetic cases: derive the flag threshold from the costs and the review capacity, and judge models by expected cost.
- Defend a split, compare three models against doing nothing, and record a run that reruns to the same numbers.
- Plan monitors, replay a stream, investigate the hidden failure from evidence, choose a remedy by cost, and rate your own work.

Before you start: read "End-to-end design and reproducibility" and "Operating and investigating a model" in this course, and "Covariate and concept shift" in Advanced evaluation and shift. The first two gave you the design checklist, the monitoring plan and the six-step investigation. The third named the kinds of shift that the lab hides.
:::

## The brief
*What do you build in the workbench, and what is the data?*

The **Level 3 capstone workbench** closes the level. A team scores the cases of many entities (customers, accounts) once a day and reviews the riskiest ones. You build that system, defend it, watch it after launch and investigate what breaks.

The data are synthetic: a program generated them, and no real customer is behind them. Scenario 1 of 6 holds 2,880 labelled cases from 36 entities over 36 days, 161 of them positive (5.6%). After launch the model scores 80 cases a day for 54 days, 40% of the entities are new, and each outcome is known 7 days after its case. One failure is hidden in that stream.

[[figure:advanced-capstone-project/seven-steps|The seven steps of the workbench and what the lab checks before it opens the next one.]]

> Key idea: each step opens when the one before it is done, and "done" is checked on your work, as in the Intermediate capstone project.

## Step 1: frame the problem
*What does a mistake cost, and what does accuracy hide?*

All costs share one unit. The lab starts a missed positive at 100, a review at 5 and a false alarm (a reviewed case that was fine) at 5 extra. The team can review 24 of the 80 daily cases. A case with probability p costs 5 + (1 - p) × 5 if you flag it and p × 100 if you leave it.

> Worked example: flagging is cheaper when 10 - 5p is at most 100p, that is when p ≥ 10 / 105 = 9.5%. This is the flag threshold. The capacity then cuts the list to the highest scores.

A model that never flags is 94.4% accurate and misses all 161 positives: 5.59 per case (161 × 100 / 2,880). Flagging every case costs 9.72. So the metric is the expected cost per case within the capacity, with AUC as a second view. The decision is a daily review queue, scored in batch: the day's cases are ranked together against a capacity, and outcomes arrive 7 days late. Step 1 is done when you press **Set these costs** and tick the two true reasons that accuracy misleads: positives are rare, and accuracy counts a miss and a false alarm as equally bad.

## Step 2: choose and defend a split
*Who will the model meet, and does your split imitate that?*

Ask what will be new after launch. Here 40% of the entities appear only after launch. The lab measures each split with one reference forest, scored on the split's test side and on the new-entity cases after launch, before the failure.

| Split | AUC on the test side | AUC on new entities | The split flatters by | Entities on both sides |
|---|---|---|---|---|
| Random | 0.84 | 0.67 | +0.17 | 36 |
| Grouped by entity | 0.64 | 0.62 | +0.02 | 0 |
| Temporal | 0.83 | 0.71 | +0.12 | 36 |

[[figure:advanced-capstone-project/split-gap|The reference forest in scenario 1: AUC on each split's test side and on new entities after launch. The grouped split is the only one close to reality.]]

Every case carries an identifier such as deviceId, and a flexible forest can use it to recognise an entity and recall its history. That pays only when the entity is on both sides, which is why random and temporal splits flatter. A temporal split removes the future from training but not the entities. Random and grouped are repeated 3 times and averaged. Then write a one-line defence.

## Step 3: compare models
*Does any model beat doing nothing, and how sure are you?*

Three candidates compete: the **Baseline** (flags nothing), a **Logistic regression** with an L2 penalty to tune, and a **Random forest** with a maximum depth to tune. Each search scores 4 values with 3 validation folds that follow your split, on the training part only. Then the test side is scored once, with 95% bootstrap intervals.

| Grouped split | AUC | Cost per case | Flagged |
|---|---|---|---|
| Baseline | 0.50 | 2.78 (1.53 – 3.89) | 0 / 216 |
| Logistic, L2 0.1 | 0.78 (0.69 – 0.86) | 3.00 (2.25 – 3.90) | 121 / 216 |
| Forest, depth 4 | 0.61 (0.46 – 0.73) | 3.76 (2.77 – 4.70) | 134 / 216 |

> Worked example: the test side has 720 cases and 20 positives, from 9 entities. The baseline costs 20 × 100 / 720 = 2.78. The logistic regression catches 10 of 20, misses 10 (1,000), runs 121 reviews (605) and 111 false alarms (555): 2,160 / 720 = 3.00.

A good AUC does not mean a good decision at this price. The cost difference, logistic minus baseline, is +0.22 with an interval of -0.55 to +1.08, so these rows cannot say which is cheaper. On the random split the forest costs 3.81 against 5.97, and the interval of the difference stays below 0: clearly cheaper.

## Step 4: record a reproducible run
*What must be on record so a stranger gets your numbers back?*

**Record this run** stores the scenario seed, the split, the model and its setting, the costs and the capacity. For the logistic regression on the grouped split it also stores a split fingerprint, 2,160 / 720 train and test cases, AUC 0.78, expected cost 3.00 and 121 cases flagged.

**Rerun** starts again from the record. The split and every number must come out identical (to 9 decimals). Then change one setting, so you know the check can fail. Raising the cost of a miss by 10 changes 6 recorded values: flagged cases rise from 121 to 173 and the threshold falls from 9.5% to 8.7%, but the split is the same. Changing the test fraction changes even the split fingerprint.

Raising the capacity by 4 changes nothing: 121 flagged cases are far below the 216 the test side allows, so the cap never bound. The lab then asks you to choose another setting.

## Step 5: plan the monitoring
*Which monitors catch the failure, and at what price in false alarms?*

After launch nothing tells you when something breaks. The model watched here is a logistic regression fitted on all the history, the same in every scenario. There are four monitors: input drift (PSI per feature, the Population Stability Index: how far a recent distribution has moved from the history; above 0.25 is large), score drift, delayed accuracy and the share of positives. The last two wait for labels. A false alarm day costs 50 of investigation. A monitor must breach on several days in a row (2 at the start) before it alerts.

| Plan, scenario 1 | First true alert | False alarm days | Cost until detection | Total |
|---|---|---|---|---|
| Input drift, PSI above 0.25 | day 49 | 0 | 453 | 453 |
| Share of positives only | day 56 | 0 | 989 | 989 |
| Delayed accuracy only | never | 0 | 5,765 | 5,765 |
| Input drift, PSI above 0.10 | day 47 | 1 | 303 | 353 |

The failure began on day 46. A tighter threshold alerts sooner but raises false alarms: 303 + 1 × 50 = 353. Step 5 is done only when the plan catches the failure.

[[figure:advanced-capstone-project/detection-race|The first true alert of four monitors in scenario 1. Input drift and score drift ring on day 49, the share of positives on day 56, and delayed accuracy never.]]

## Step 6: investigate the failure
*Which hypothesis does the evidence support, and which repair is cheapest?*

An alert is a question. In scenario 1 the lab reads the evidence on day 63: the failure began on day 46, each label arrives 7 days after its case, and the lab waits for a 10-day window of arrived labels. It gives three kinds: feature PSI against the history and the served-versus-offline check, score drift and delayed accuracy, and slices. Name a hypothesis and test it: **skew** (served values differ from offline ones), **covariate drift** (the inputs moved), **label shift** (the share of positives moved) or **concept shift** (the input-to-outcome rule changed). Confirm one before you choose a remedy.

[[figure:advanced-capstone-project/evidence-psi|The evidence of scenario 1 on day 63. Only amount moved, the served values equal the offline ones, and the model still ranks and still predicts the share of positives.]]

Evidence 1: amount PSI 2.37, the others below 0.10 (deviceId, an identifier, 0.097), served values equal offline ones. Evidence 2: delayed AUC 0.80 against 0.79 before launch, observed positive share 15.1% against a mean score of 15.0%. Only the input moved: covariate drift.

The remedy table prices four options from day 63 to the end. Here Keep costs 17,372, Roll back 17,422, Recalibrate 17,472 and Retrain 17,876 (500 to carry out, live after 3 days). The cheapest remedy is Keep: the world changed, and the model still works. A right diagnosis does not always call for action.

> Watch out: a confirmed cause does not make the repair worth its price. Retraining here adds cost and buys nothing, while in scenario 5 (with the default plan) it is the cheapest.

## Step 7: report and rate
*What do you write down, and how honest is your self-assessment?*

Step 7 asks for six short texts: the split and why, the model and why, the monitoring plan, and three on the failure (what happened, how you found it, what you changed). Then you rate five criteria as **Not yet**, **Partly** or **Yes**. The lab joins everything into a **Capstone summary** that you can copy.

> Worked example: "The data are synthetic. I split by entity, because 40% of the entities are new after launch: a random split read 0.84 AUC against 0.67 on new entities. On 720 test cases with 20 positives, no model clearly beat doing nothing. I watched the inputs and was alerted on day 49."

Before you trust a finding, press **New scenario** and check it on a fresh one, then say what you could not test.

::: remember
- Frame the decision with its costs and capacity, take the flag threshold from them, and judge models by expected cost per case against doing nothing.
- Defend the split with the gap to new entities, report intervals, and record every setting so a rerun gives the same numbers and one changed setting breaks them.
- Weigh monitors by detection delay and false alarms, confirm a cause from evidence before you repair, and let the costs choose the remedy.
:::

@@lab

## Lab: Level 3 capstone workbench
The seven steps open in order, and your work is saved in this browser only. The numbers below hold from a clean start: press **Start over**, then press it again while it reads **Press again to erase everything**. You are in scenario 1 of 6, with a miss costing 100, a false alarm 5 extra, a review 5 and a review capacity of 24.

### Steps
1. **Frame the problem.** Done: daily review queue, batch, **Set these costs** pressed, the cost metric, the two true reasons ticked.
2. **Choose and defend a split.** Done: split chosen, compared and defended.
3. **Compare models.** Done: both searches run, the three models scored, one model taken forward.
4. **Record a reproducible run.** Done: recorded, rerun, and one changed setting broke the check.
5. **Plan the monitoring.** Done: the replay catches the failure.
6. **Investigate the failure.** Done: one hypothesis confirmed and a remedy applied.
7. **Report and rate.** Done: six texts written and five criteria rated.

### Controls
- The seven chips (**Frame**, **Split**, **Models**, **Repro**, **Monitor**, **Probe**, **Report**) jump to a step. A step reads **Done**, **To do** or **Locked**; **Continue to step N** moves on.
- Step 1. **New scenario** moves to the next of 6 and resets steps 2 to 6. Questions **1. What decision does the model support?** and **2. Batch or online?**. Sliders **Cost of a missed positive**, **Extra cost of a false alarm (a reviewed case that was fine)**, **Cost of one review** and **Review capacity (cases a day)**, then **Set these costs**. **3. Which operational metric will you judge the models by?** and **4. Why would a plain accuracy mislead here? Tick every reason that is true.**
- Step 2. **1. Choose the split that matches how the model will be used**: **Random**, **Grouped by entity**, **Temporal**. **Compare the three splits**. **2. Your one-line defence of the split** (200 characters).
- Step 3. **Search the penalty strength** and **Search the maximum depth**, then **Value of L2 penalty to use** and **Value of max depth to use** (start at "Best of the search"). **Score the three models on the test side**. **The model I take forward**.
- Step 4. **Record this run**, **Rerun**, **Which one setting to change** and **Rerun with the change**.
- Step 5. **Watch the inputs** with a toggle per feature (deviceId, an identifier, starts off), **Alert when the largest PSI is above** and **Window (days)**; **Watch the scores**; **Watch the delayed accuracy**; **Watch the share of positives**; **Days in a row a monitor must breach before it alerts**; **Replay the stream**. Only input drift is on at the start (0.25, 7 days, 2 days in a row).
- Step 6. **Feature to inspect (the slice table below, and a skew or covariate hypothesis, are about this feature)**; **Which hypothesis explains the alert?** (skew, covariate drift, label shift, concept shift) with **Test this hypothesis**; **Which remedy do you apply?** (**Keep the model as it is**, **Roll back**, **Recalibrate**, **Retrain**) with **Apply this remedy**. The counter reads **Hypotheses rejected so far: N.**
- Step 7. Six text boxes (500 characters each), **Rate your own work**, and **Copy summary**.
- The round **Quick Quiz** button opens its panel. **Start over** and **Reset** erase your work, but only on a second press.

### Reading the screen
- The status reads "N of 7 steps done". The **Your project** card lists **Scenario**, **Decision**, **Costs**, **Split**, **Model**, **Monitoring** and **Diagnosis**.
- The Quick Quiz asks which split gives an AUC closest to what the forest scores on new entities, and reveals the three AUCs once step 2 is compared.
- Step 1 states the history, the flag threshold (9.5%) and what a model that never flags costs (5.59 per case).
- Step 2 shows **How optimistic each split is** with the columns **AUC on the split's test side**, **AUC on new entities after launch**, **How much the split flatters (the gap)**, **Entities on both sides** and **Gap, lowest to highest run**.
- Step 3 shows **Test-side scores with 95% bootstrap intervals** and the chart **Expected cost per case with its 95% interval (lower is better)**, then the three cost differences with their intervals.
- Step 4 shows **What a run is made of**, tiles such as **Split fingerprint**, and **What differs from the record**.
- Step 5 shows the tiles **Failure began on day**, **First alert on day**, **Days until detection**, **False alarm days**, **Cost until detection** and **Total cost with false alarms**, and the charts **Drift monitors by day (PSI)** and **Delayed accuracy by day (AUC of the arrived labels)**.
- Step 6 shows **Evidence 1**, **Evidence 2** (**Delayed AUC**, **Observed positive share**, **Mean predicted score**) and **Evidence 3** (**Established against new entities**), then **What each remedy costs**.

### Experiments
1. **Which split flatters a model?** Predict: answer the Quick Quiz before you look. Setup: finish step 1 (the first option of questions 1 and 2, the last option of question 3, the first two reasons, then **Set these costs**), choose **Grouped by entity** in step 2 and press **Compare the three splits**. The reference forest scores 0.84 on **Random** against 0.67 on new entities (+0.17), 0.64 against 0.62 on **Grouped by entity** (+0.02) and 0.83 against 0.71 on **Temporal** (+0.12). Why does a temporal split still flatter?
2. **Does a model beat doing nothing?** Predict: on the grouped split, will either model cost less per case than the baseline? Setup: run both searches and **Score the three models on the test side**. Baseline 2.78, logistic 3.00 (2.25 – 3.90), forest 3.76 (2.77 – 4.70): none clearly beats it, although the logistic AUC is 0.78. Then choose **Random**, search and score again: baseline 5.97, logistic 4.78, forest 3.81 (2.74 – 5.08). Why does the split change the verdict? Go back to **Grouped by entity**, search and score again, and take **Logistic regression** forward.
3. **What breaks a rerun?** Predict: which changes leave every number alone? Setup: **Record this run** (AUC 0.78, cost 3.00, 121 flagged) and **Rerun**. Try **The daily review capacity (+4)**: nothing differs. Try **The cost of a miss (+10)**: 6 values differ and the split is the same. Try **The test fraction (25% to 20%)**: the split fingerprint changes too. Why is a check that never fails worthless?
4. **Fast monitor, slow monitor.** Predict: which monitor rings first? Setup: press **Replay the stream** after every change. With the defaults the first alert is on day 49, 3 days after day 46, with no false alarms and a cost until detection of 453. Switch off **Watch the inputs** and switch on **Watch the share of positives**: day 56 (989). Use **Watch the delayed accuracy** instead: never, so step 5 stays open. With **Watch the inputs** alone again, lower **Alert when the largest PSI is above** to 0.10: day 47, 1 false alarm day, total 353. Then set **Days in a row a monitor must breach before it alerts** to 1: day 46, 2 false alarm days, total 100. Which plan would you ship, and why is one replay not enough?
5. **A diagnosis is not a repair.** Predict: which remedy is cheapest? Setup: with the default plan, step 6 shows the alert on day 49 and reads the evidence on day 63. Test **Training-serving skew** on amount (0% of rows differ: not confirmed, and the counter reads 1), then **Covariate drift** (amount PSI 2.37: confirmed). Delayed AUC is 0.80 against 0.79, and the observed positive share is 15.1% against a mean score of 15.0%. Pick a remedy and press **Apply this remedy**: the table prices Keep 17,372, Roll back 17,422, Recalibrate 17,472 and Retrain 17,876. Why does retraining buy nothing here?
6. **A fresh scenario.** Predict: will the grouped split still be the closest to reality? Setup: press **New scenario** and **Compare the three splits**. Scenario 2 gives random +0.15, grouped +0.04, temporal +0.20. Over all 6 scenarios grouped is the closest every time (between -0.02 and +0.08), random runs from +0.13 to +0.29 and temporal from +0.12 to +0.20. Scenario 2 hides a different failure, so rebuild steps 3 to 6 and compare your diagnosis with the evidence. How would you word the finding?

### Rubric
Rate each criterion at the end of step 7 with **Not yet**, **Partly** or **Yes**. The lab prints a sentence for each level. **Yes** means:
- **Split defence**: I matched the split to how the model is used, measured its optimism against the other splits, and wrote a one-line defence.
- **Operational metric**: I judged the models by expected cost within the review capacity, with intervals, and said when a model does not clearly beat doing nothing.
- **Reproducibility**: I recorded the seed and settings, reran to the same numbers, and saw that changing one setting changes them.
- **Monitoring plan**: I combined fast monitors (inputs, scores) with the slow, honest one (delayed accuracy), replayed the stream, and weighed false alarms against the cost until detection.
- **Failure investigation**: I read the evidence, confirmed one cause, compared the remedies by cost and said what I changed.

### Real data
This lab has no real table and no switch to one: every case is synthetic, and the failure was planted. Ask of any real system: who will the model meet that it has never seen, which monitor would ring first, and what would you check before you trusted a drift alert?
