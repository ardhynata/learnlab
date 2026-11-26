---
slug: robustness-fairness-and-privacy
title: Robustness, fairness and privacy
kind: reading
simulator: ""
minutes: 25
---
::: intro
- Plan a robustness test: list the changes to try, write the pass rule first, and read the result per slice as well as overall.
- Compute the true-positive-rate and false-positive-rate gaps of two groups from a confusion table, and explain why equal error rates and equal precision cannot both hold when base rates differ.
- Say how a model's fairness can change after launch without any change to the model, and handle data with less exposure: keep less, check small cells, add noise, limit access.

Before you start: read "Subgroup metrics and fairness" and "Covariate and concept shift". The first named the fairness criteria and built the penguin rule used below. The second named the three kinds of shift that this lesson turns into tests.
:::

## A robustness test is a question asked in advance
*What does it mean for a model to be robust, and what do you try?*

A test score says how a model does on data like the data it learned from. A **robustness test** asks what happens on data that is not like it. A model is **robust** when its score and its mix of errors stay acceptable under changes that can really happen.

Five kinds of test cover most of the ground.

- **Perturb the inputs.** Add noise or a steady bias to a column, as a worn sensor would.
- **Break the inputs.** Empty a column, or put a value in the wrong unit. The model must not quietly guess.
- **Go out of range.** Feed values outside what training saw. A good system flags them instead of answering.
- **Cut slices.** Repeat every test per group, because an average can hide one group failing.
- **Stress the distribution.** Build the shifts from "Covariate and concept shift": a new input mix, a new class balance, a changed meaning. An **adversarial** test is the sharpest version: a small change chosen on purpose to flip the answer.

> Key idea: write the pass rule before you run the test. A rule written after you see the numbers will always find a reason to accept them.

## Four tests on a one-line rule
*What does a robustness test look like with real numbers?*

Take the rule from "Subgroup metrics and fairness": a penguin of 4700 g or more is called a Gentoo. It was scored on the 333 penguins of the bundled table that have a body mass and a sex. The pass rule, fixed before the run: **overall accuracy at least 0.85, and accuracy for each sex at least 0.80.**

| Test | Accuracy | Female | Male | Gentoo found | Verdict |
| --- | --- | --- | --- | --- | --- |
| No change | 303 / 333 = 0.91 | 139 / 165 = 0.84 | 164 / 168 = 0.98 | 93 / 119 = 0.78 | pass |
| Scale reads 200 g light | 288 / 333 = 0.86 | 121 / 165 = 0.73 | 167 / 168 = 0.99 | 74 / 119 = 0.62 | fail |
| Scale reads 200 g heavy | 307 / 333 = 0.92 | 150 / 165 = 0.91 | 157 / 168 = 0.93 | 104 / 119 = 0.87 | pass |
| All Biscoe masses missing | 212 / 333 = 0.64 | 107 / 165 = 0.65 | 105 / 168 = 0.63 | 0 / 119 = 0.00 | fail |

[[figure:robustness-fairness-and-privacy/stress-tests|Overall accuracy and the lower of the two sex accuracies in each test. Dashed marks show the pass rule.]]

A scale that reads light pushes 18 female Gentoo under the 4700 g cut: overall accuracy stays above 0.85 while female accuracy falls to 0.73, and only the slice shows it. A scale that reads heavy raises accuracy to 0.92, yet false alarms (other penguins called Gentoo) rise from 4 to 11: a pass with a different kind of error. With every Biscoe mass empty, the code treats "missing" as "light" and misses all 119 Gentoo.

> Watch out: a passed test list proves only that these changes were tried. Add the failures you meet in production to the list.

::: deeper Adversarial inputs
For this rule the adversary needs one move: change the mass by a few grams across 4700 and the answer flips. A model with many features offers many such moves, and a search can find a small change to several columns at once that flips the answer while the row still looks normal. Two protections help. Check inputs against the ranges seen in training, and test the model on rows near its decision boundary, since that is where tiny changes matter most.
:::

## Fairness gaps from one confusion table
*How do you measure a fairness gap with a pencil?*

The next examples are generated, so every count can be checked, and no real person appears. An invented tool flags loan applications for a manual check. "Positive" means the application really needed the check. Group A has 200 applications and group B has 400.

| Count | Group A | Group B |
| --- | --- | --- |
| TP (flagged, needed it) | 80 | 60 |
| FN (not flagged, needed it) | 20 | 40 |
| FP (flagged, did not need it) | 20 | 15 |
| TN (not flagged, did not need it) | 80 | 285 |

Check A: 80 + 20 = 100 needed it and 20 + 80 = 100 did not. Check B: 60 + 40 = 100 and 15 + 285 = 300.

The **true-positive rate** (TPR) is the recall, TP / (TP + FN). The **false-positive rate** (FPR) is FP / (FP + TN): the share of cases that needed nothing but were flagged anyway. A **gap** is the difference between the groups. Both gaps at zero is called **equalized odds**; a zero TPR gap alone is called **equal opportunity**.

| Number | Group A | Group B | Gap |
| --- | --- | --- | --- |
| TPR | 80 / 100 = 0.80 | 60 / 100 = 0.60 | 0.20 |
| FPR | 20 / 100 = 0.20 | 15 / 300 = 0.05 | 0.15 |
| Precision | 80 / 100 = 0.80 | 60 / 75 = 0.80 | 0.00 |

[[figure:robustness-fairness-and-privacy/group-gaps|The three rates of the same tool in the two groups. Precision matches; the true-positive and false-positive rates do not.]]

Precision equal in both groups means a flag is right 80 percent of the time in each: **calibration by group** (also called calibration within groups) holds for a yes/no flag. For a score, check it by score band: among cases scored near 0.8, about 80 percent should be positive in each group.

## Why the definitions conflict
*Why does the tool not simply close every gap?*

Try to fix group B. Lower its threshold until its rates match group A: TPR 0.80 and FPR 0.20. Of B's 100 applications that needed a check, 80 are now flagged. Of its 300 that did not, 20 percent, 60, are flagged. That is 140 flags, and 80 of them are right.

| Group B | Before | Matched to A |
| --- | --- | --- |
| Flagged | 75 | 140 |
| Precision | 60 / 75 = 0.80 | 80 / 140 = 0.57 |
| Flag rate | 75 / 400 = 0.19 | 140 / 400 = 0.35 |

Equal error rates now hold, but precision has fallen to 0.57 against A's 0.80. This is arithmetic, not a weak model. Precision follows the base rate p, the share of positives in a group:

precision = TPR x p / (TPR x p + FPR x (1 - p))

With equal TPR and FPR, groups with different base rates, here 0.50 and 0.25, must get different precision. "Subgroup metrics and fairness" showed the same conflict from the other side: equal error rates, unequal precision.

> Key idea: when base rates differ and the model is imperfect, equalized odds and calibration by group cannot both hold. Which gap to close depends on who bears the cost of each mistake, so it is a decision for the people who use the tool.

Giving each group its own threshold can close one gap. It needs the group column at decision time, and whether that is allowed is a policy and legal question, not a modeling one.

## Fairness under shift
*Can a tool that was balanced at launch become unbalanced with no change to the model?*

Yes, and "Covariate and concept shift" explains why. Keep the tool of the last section as launched: group B has TPR 0.60 and FPR 0.05. Suppose B's base rate rises from 0.25 to 0.40.

> Worked example: group B still has 400 applications, now 160 that need a check and 240 that do not. Flagged and needed: 0.60 x 160 = 96. Flagged and not needed: 0.05 x 240 = 12. That is 108 flags, and precision is 96 / 108 = 0.89, up from 0.80. Group A's precision is still 0.80, so a gap of 0.09 opens where there was none.

[[figure:robustness-fairness-and-privacy/fairness-shift|Precision, TPR and FPR for group A, for group B at launch and for group B after its base rate rose. Nothing about the model changed.]]

The TPR and FPR gaps did not move, because those rates are measured inside each class, so a new base rate leaves them alone. A change in meaning does move them. If B's applications change so that the tool finds only 0.45 of the ones that need a check, the TPR gap grows from 0.20 to 0.35. And a group that shrinks gives rates from few cases, so a gap may be noise.

So fairness is monitored like accuracy: compute each group's rates per period with the case count beside them. Labels arrive late, as "Covariate and concept shift" noted, so the first alarm may be a change in a group's flag rate.

## Removing the name is not anonymity
*Why is a table without a name column still about people?*

A name is one way to find a person, and other columns find them too. A **quasi-identifier** is a column that is harmless alone but identifying in combination, such as an age band and a neighborhood. Dropping the name column leaves them.

**k-anonymity** asks how many records share each combination of quasi-identifiers. The smallest group size is k, and a record in a group of k looks like k - 1 others. This invented table of 12 records has age band and area as quasi-identifiers and a yes/no condition as the sensitive column.

| Age band | Area | Records | With the condition |
| --- | --- | --- | --- |
| 20 to 29 | North | 1 | 1 |
| 30 to 39 | North | 3 | 1 |
| 40 to 49 | North | 2 | 0 |
| 30 to 39 | South | 2 | 2 |
| 40 to 49 | South | 3 | 0 |
| 50 to 59 | South | 1 | 0 |

Two groups hold a single record, so k = 1: anyone who knows that a neighbor in their 20s lives in the North can read that row's condition. Merge the age bands into 20 to 39 and 40 to 59, and the groups hold 4, 2, 2 and 4 records, so k = 2.

[[figure:robustness-fairness-and-privacy/k-anonymity|Records per combination of age band and area. Cells with one record are marked; after merging the bands the smallest cell holds two.]]

> Watch out: k-anonymity is not a guarantee. The 20 to 39 South group has two records and both have the condition, so knowing someone is in it reveals the condition anyway.

::: deeper Beyond k-anonymity
The fix for that weakness is to also ask for variety in the sensitive column inside every group, an idea called l-diversity. A different line of defense adds random noise to released numbers, which the next section names. No single technique removes all risk, and the more columns a table has, the more combinations can single someone out.
:::

## Keep less, share less
*What habits protect personal data beyond one table?*

**Collect less.** Gather only the columns the model needs, and decide before collecting what each one is for. A column you never stored cannot leak.

**Keep less.** Delete rows when their purpose ends, or reduce them to totals. Old data is a risk with no benefit.

**Watch small cells.** A rate over 3 people tells its readers about those 3. When you report a subgroup table, as in a fairness audit, hide or merge cells below a minimum size set by policy, for example 5. Keep the case count beside every rate that you do show.

**Add noise.** Before releasing a count, add a small random number to it, so that a true 4 might be published as 6 and a true 38 as 37. More noise means more privacy and less accuracy. The formal version is called differential privacy; this lesson only names it.

**Limit access.** Give each person and each job only the data it needs, and keep a log of who looked. The group column that a fairness audit needs is itself sensitive, so you keep it for the audit and restrict it.

> Key idea: privacy is a set of habits, not a switch. Every column you keep and every number you publish is a choice with a cost to the people in the data.

## Before the lab
*What comes next in this course?*

You now have three checks for a model that is about to meet real use: does it hold up when its inputs move, do its error rates differ across groups, and does the data around it expose people. All three give numbers you can read per slice, and all three need a pass rule decided in advance.

The next lesson, "Human review and model documentation", asks who looks at the cases a model flags or cannot handle, and how to write down what the model is for and where it fails. Then the Reliability lab lets you stress-test a model across subgroups and data conditions, and document where human review is needed.

Before you open it, write down two guesses: which slice will fail first under a shifted input, and which gap, TPR or precision, will move when a group's base rate changes.

::: remember
- A robustness test changes the inputs in ways that can really happen, with the pass rule written first and the result read per slice, not only overall.
- Fairness gaps are measurable: TPR gap, FPR gap, precision gap. When base rates differ, equal error rates and equal precision cannot both hold, and a shift can open a gap with no change to the model.
- Removing a name is not anonymisation: combinations of columns single out people. Keep less, check small cells, add noise and limit access.
:::
