---
slug: subgroup-metrics-and-fairness
title: Subgroup metrics and fairness
kind: reading
simulator: ""
minutes: 20
---
::: intro
- Compute accuracy and recall for each group separately, and spot a model that is accurate overall but poor for one group.
- Use slices to find where a model's errors pile up, and say why small slices need care.
- Name three fairness criteria (demographic parity, equal opportunity, calibration within groups) and explain why they cannot all hold when base rates differ.

Before you start: read "Confusion matrix and rates" and "Sampling variability and the bootstrap".
:::

## One number can hide a group
*How can a model be accurate overall and still fail one group?*

A model is usually summed up by one number, such as accuracy. That number is an average over every case, and an average can hide a part of the data where things go badly.

Here is a real case. Take the 333 penguins in the bundled table that have both a body mass and a sex recorded, and a one-line rule: *a penguin weighing 4700 g or more is a Gentoo, anything lighter is not.* The rule is right for 303 of the 333 penguins, so its accuracy is 303 / 333 = 0.91.

Now cut the same results by sex. Sex was never an input to the rule, yet the errors fall mostly on one side.

A **group** (or **subgroup**) is the set of cases that share a value of some column, such as sex or island. A **subgroup metric** is an ordinary metric, computed only on the cases of one group.

| Group | Penguins | Errors | Accuracy | Gentoo found (recall) |
| --- | --- | --- | --- | --- |
| All | 333 | 30 | 303 / 333 = 0.91 | 93 / 119 = 0.78 |
| Female | 165 | 26 | 139 / 165 = 0.84 | 32 / 58 = 0.55 |
| Male | 168 | 4 | 164 / 168 = 0.98 | 61 / 61 = 1.00 |

[[figure:subgroup-metrics-and-fairness/group-gap|The same rule, scored on all penguins and on each sex. Accuracy hides the gap; recall for Gentoo shows it.]]

## Why the overall number hides it
*Why does the average not warn us?*

Every group metric uses the same four counts as the confusion matrix, restricted to the cases of that group. The overall accuracy is just the group accuracies averaged with the group sizes as weights: the two groups hold 139 and 164 right answers, and (139 + 164) / (165 + 168) = 0.91.

Here the two groups are about the same size, so the overall figure lies halfway between them and shows neither. When one group is small, it barely moves the overall figure at all.

> Worked example: a test set has 400 cases. A group of 380 cases is right 95 percent of the time, which is 361 right answers. A group of 20 cases is right only half the time, which is 10 right answers. Overall accuracy is (361 + 10) / 400 = 0.93, a score that looks fine, while the small group does no better than a coin flip.

> Key idea: overall accuracy is an average weighted by group size. A small group can fail badly and hardly change it, so report metrics per group next to the overall one.

## Where do the errors pile up?
*How do you find the slices where a model does worst?*

**Error analysis by slices** means listing the wrong answers, cutting them along the columns you have, and looking for a slice that holds far more than its share. A slice is a group defined by one or more columns.

Start from the 30 errors of the penguin rule. By island, Torgersen has 1 error among 47 penguins, Dream has 1 among 123, and Biscoe has 28 among 163. Inside Biscoe, females have 26 errors among 80 and males have 2 among 83. Narrow once more to Gentoo females: 26 errors among 58.

That is 26 of the 30 errors, 87 percent of them, coming from 58 penguins, 17 percent of the data. The other 275 penguins have 4 errors between them.

[[figure:subgroup-metrics-and-fairness/error-slices|Error rate of the same rule in narrower and narrower slices. The label on each bar gives errors out of penguins in the slice.]]

A slice tells you where to look, not why. Here the clue is in body mass: female Gentoo average 4680 g and male Gentoo 5485 g, so the 4700 g cut sits in the middle of the female Gentoo. The rule fails the lighter sex.

## Small slices and slices found by looking
*When can a bad slice be an accident?*

A rate from few cases is jumpy. Torgersen males have 1 error among 23 penguins, a rate of 0.04. One more error would make it 2 / 23 = 0.09, twice as high, and nothing about the penguins would have changed. "Sampling variability and the bootstrap" showed how much a small sample moves.

Two habits help. First, write the number of cases beside every rate, as the table and the figure do. Second, remember how slices are found: if you cut the data many ways, some slice will look bad by chance alone.

Trust a slice more when it is large, when it has a plausible cause you can check, and when the gap appears again on a new split or a fresh sample. Gentoo females pass the first two tests clearly: 58 penguins and a cause in body mass, with 26 errors against 4 among the other 275. A gap that large still deserves a check on a fresh sample before anyone relies on it.

> Watch out: a bad slice found after looking at many cuts is a lead, not a finding. Confirm it on data you did not use to find it.

## Three fairness criteria, named
*What can we check when someone asks whether a model treats two groups fairly?*

"Fair" has many meanings, so the field uses named, checkable properties. Each compares one number across groups. With a yes/no answer, in this lesson called a flag:

- **Demographic parity:** the model flags the same share of each group.
- **Equal opportunity:** among the cases that really are positive, the model finds the same share in each group. That is equal recall.
- **Calibration within groups:** a flag means the same in every group, so the share of flagged cases that are really positive is equal. For a yes/no answer that is equal precision. (For a score, it means a score of 0.8 is right about 80 percent of the time in each group.)

> Watch out: these are measurements, not verdicts. Which one matters depends on what each kind of mistake costs, who bears it and what the model is used for. That is a question for people who know the use case. Penguins only let us practice the arithmetic: no real person appears in this lesson.

## The penguin rule against the criteria
*How does the rule from the start of the lesson score?*

The rule flags 32 / 165 = 0.19 of the females and 65 / 168 = 0.39 of the males, so demographic parity fails. Recall is 0.55 against 1.00, a large failure of equal opportunity. Precision is 32 / 32 = 1.00 against 61 / 65 = 0.94, fairly close.

## A two-group table by hand
*What do the criteria look like on real counts?*

Here is generated data, so every count can be checked. A made-up tool flags penguins for a vet check in two colonies, A and B, with 100 penguins each. The condition is present in 40 penguins of A and in 20 of B: the **base rates** (the share of positive cases in a group) are 0.40 and 0.20.

| Count | Colony A | Colony B |
| --- | --- | --- |
| TP (flagged, has it) | 32 | 16 |
| FN (not flagged, has it) | 8 | 4 |
| FP (flagged, does not) | 6 | 8 |
| TN (not flagged, does not) | 54 | 72 |

Check A: 32 + 8 = 40 and 6 + 54 = 60. Check B: 16 + 4 = 20 and 8 + 72 = 80.

| Criterion | Number | Colony A | Colony B | Equal? |
| --- | --- | --- | --- | --- |
| Demographic parity | flag rate | 38 / 100 = 0.38 | 24 / 100 = 0.24 | No |
| Equal opportunity | recall | 32 / 40 = 0.80 | 16 / 20 = 0.80 | Yes |
| Calibration within groups | precision | 32 / 38 = 0.84 | 16 / 24 = 0.67 | No |
| (for later) | false-positive rate | 6 / 60 = 0.10 | 8 / 80 = 0.10 | Yes |

[[figure:subgroup-metrics-and-fairness/two-groups|The two confusion tables. The tool finds 80 percent of the positives and raises 10 percent false alarms in both colonies, yet flag rate and precision differ.]]

## Why they cannot all hold
*Why can the tool not simply fix the criteria that fail?*

Try it on colony B. To match the flag rate of A (0.38) at recall 0.80, the tool must flag 38 penguins: 16 true positives and 22 false alarms. Precision drops to 16 / 38 = 0.42, against 0.84 in A. To match the precision of A instead, it must flag only 19 penguins (16 true, 3 false), and the flag rate is 0.19.

This is not bad luck. The flag rate, recall, precision and base rate are tied by one identity:

flag rate = recall x base rate / precision

Check A: 0.80 x 0.40 / 0.84 = 0.38. Check B: 0.80 x 0.20 / 0.67 = 0.24. If recall, precision and flag rate were all equal in two groups, the base rates would have to be equal too.

[[figure:subgroup-metrics-and-fairness/precision-base-rate|Precision of a tool with recall 0.80 and false-positive rate 0.10, as the base rate of the group changes. Same tool, different precision.]]

> Key idea: when base rates differ, demographic parity, equal opportunity and calibration within groups cannot all hold. The conflict comes from the numbers, not from a weak algorithm. Choosing which criterion to prioritize is a decision about the use case.

::: deeper Where the identity comes from
Take a group of n cases with base rate p. The real positives number p x n, and the tool finds recall x p x n of them: those are the true positives. The flagged cases are the true positives divided by precision, because precision is true positives over flagged. So flagged = recall x p x n / precision, and dividing by n gives the flag rate. The same algebra gives precision = recall x p / (recall x p + FPR x (1 - p)), where FPR is the false-positive rate. With recall 0.80 and FPR 0.10, a base rate of 0.20 gives 0.16 / (0.16 + 0.08) = 0.67 and 0.40 gives 0.32 / (0.32 + 0.06) = 0.84, the two colonies above.
:::

## Before the lab
*How do you audit a model, and what comes next?*

A small routine sums up this lesson. Pick the groups that matter for the use and are actually recorded: a group you did not record cannot be audited. Compute the metrics for each group with the number of cases beside them. Slice to find where errors pile up, and check any suspect slice on new data. State which criterion matters for this use and why, because the others will usually give way.

Keep two limits in mind. A label is not always the plain truth: if it was recorded unevenly across groups, a model can learn that unevenness. And a metric table does not decide anything. People who know the use case decide, and the table is their evidence.

The next lesson, "Permutation importance and SHAP", asks which features a model leans on, such as body mass in the rule above. Then the Audit lab lets you audit errors by subgroup and see how correlated features affect importance estimates.

::: deeper Names you will meet
Equal opportunity is often paired with equal false-positive rates, and the pair is called equalized odds. Demographic parity is also called statistical parity, and equal precision across groups is also called predictive parity. A common repair is to give each group its own threshold. It can equalize one number, and it moves the others by the same identity. Even a perfect model does not escape: it meets equal opportunity and calibration, but flags each group at its own base rate. The extra condition "the model is not perfect" belongs to a related result (Kleinberg and Chouldechova) about calibration with equal false-positive and false-negative rates.
:::

::: remember
- Compute metrics for each group, with the number of cases beside each. Overall accuracy is a size-weighted average and can hide a group that fails.
- Slice the errors to see where they pile up. Small slices and slices found by looking need confirmation on new data.
- Demographic parity, equal opportunity and calibration within groups cannot all hold when base rates differ. Which one to prioritize is a decision for the use case.
:::
