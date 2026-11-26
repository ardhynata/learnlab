---
slug: conditional-probability-and-bayes
title: Conditional probability and Bayes' rule
kind: reading
simulator: ""
minutes: 20
---
::: intro
- Compute a conditional probability by counting, and say why P(A | B) and P(B | A) are different numbers.
- Use Bayes' rule with natural frequencies (counts out of 1,000 cases) to turn "the test is 90 percent sensitive" into "a positive result means 27 percent".
- Explain why precision depends on how common the positive class is, and test whether two events are independent.

Before you start: read "Confusion matrix and rates" and "Class imbalance".
:::

## Probability given something
*What changes when you already know one fact about a case?*

A **probability** is a number from 0 to 1 that says how likely an event is. In this lesson it is a share of cases: if 124 of the 344 penguins in the full penguin table (344 rows, including 2 without measurements) are Gentoo, then P(Gentoo) = 124 / 344 = 0.36.

Now someone tells you the penguin lives on Biscoe island. That fact removes every other penguin from the count. Of the 344 penguins, 168 live on Biscoe, and 124 of those are Gentoo. So P(Gentoo | Biscoe) = 124 / 168 = 0.74.

Read the bar `|` as "given". A **conditional probability** is the probability of one event among only the cases where another event holds:

P(A | B) = (cases with both A and B) / (cases with B)

The condition shrinks the group you count in. Flip the question and the group changes. All 124 Gentoo penguins live on Biscoe, so P(Biscoe | Gentoo) = 124 / 124 = 1.00. Same two events, two different questions, two different numbers.

> Watch out: P(A | B) is not P(B | A). Mixing them up is the most common mistake in this topic, and the next sections show it costing real decisions.

## Counting out of 1,000
*How can you answer a probability question with nothing but counts?*

Percentages such as "90 percent sensitive" are easy to misread. Counts are easier: imagine 1,000 cases and count how many land in each group. These counts are called **natural frequencies**.

Here is a screening test. Out of every 100 people, 2 have the condition (the positive class). The test catches 90 of every 100 sick people: its **sensitivity** is 0.90, the same number as recall in "Confusion matrix and rates". It also raises a false alarm for 5 of every 100 healthy people. You test positive. How likely is it that you are sick?

Build the answer from 1,000 people:

1. 2 percent are sick: 20 people. The other 980 are healthy.
2. Of the 20 sick, 90 percent test positive: 18. The other 2 are missed.
3. Of the 980 healthy, 5 percent test positive: 49. The other 931 test negative.

Positives: 18 + 49 = 67 people. Only 18 of them are sick, so P(sick | positive) = 18 / 67 = 0.27.

[[figure:conditional-probability-and-bayes/frequency-tree|1,000 people split first by the truth, then by the test result. The two boxes marked positive are the group you belong to after a positive test.]]

It is tempting to answer 0.90. But 0.90 is how many sick people the test catches, which is a different question.

## Bayes' rule
*What is the formula behind the counting?*

**Bayes' rule** is the counting above written as a formula. To go from P(positive | sick), which the test maker measures, to P(sick | positive), which you want:

P(sick | positive) = P(positive | sick) x P(sick) / P(positive)

Each part has a name and a number from the example.

- **Prior**, P(sick) = 0.02: how likely you were to be sick before the test.
- **Likelihood**, P(positive | sick) = 0.90: how likely the sick are to test positive.
- **Evidence**, P(positive) = 0.90 x 0.02 + 0.05 x 0.98 = 0.018 + 0.049 = 0.067: how often anyone tests positive, sick or healthy.
- **Posterior**, P(sick | positive) = 0.018 / 0.067 = 0.27: how likely you are to be sick after the test.

Compare with the counts: 0.018 is 18 people out of 1,000, and 0.067 is 67 people out of 1,000. The formula and the counting give the same 0.27, because they are the same arithmetic. Use whichever you trust; the counts are easier to check.

> Key idea: Bayes' rule updates a prior with evidence. The posterior depends on the likelihood and on how common the condition was to begin with.

## Why the base rate matters
*Why does the same test mean something different in a different group?*

The test did not change, but its meaning depends on the group it is used on. Keep sensitivity at 0.90 and the false alarm rate at 0.05, and change only how many people are sick (the **base rate**, or prevalence). Counts out of 1,000 (the false alarms shrink as the healthy group shrinks, the true positives grow, and precision follows):

| Sick among 1,000 | Positives that are sick | Positives that are healthy | P(sick given positive) |
|---|---|---|---|
| 20 (2 percent) | 18 | 49 | 18 / 67 = 0.27 |
| 200 (20 percent) | 180 | 40 | 180 / 220 = 0.82 |
| 500 (50 percent) | 450 | 25 | 450 / 475 = 0.95 |

[[figure:conditional-probability-and-bayes/same-test-two-groups|The same test, used on a group where 2 percent are sick and on a group where 20 percent are sick. Each square is one person who tested positive.]]

This is the precision table from "Class imbalance" in other words. Precision is P(truly positive | the model says positive), a posterior, and the positive rate is the prior. When positives are rare, even a good test or model gives mostly false alarms.

> Watch out: a test's sensitivity and false alarm rate do not tell you what a positive result means. You also need the base rate where the test will be used.

## A classifier alert, by hand
*What does a fraud alert mean for the person who reads it?*

Take the fraud model from "Class imbalance". Out of 10,000 payments, 100 are fraud, and the model has TP = 60, FN = 40, FP = 140 and TN = 9,760. Scale it to 1,000 payments, dividing every count by 10:

- 10 are fraud. The model alerts on 6 and misses 4. Recall is 6 / 10 = 0.60.
- 990 are honest. The model alerts on 14 and stays quiet on 976. The false alarm rate is 14 / 990 = 0.014.

[[figure:conditional-probability-and-bayes/alert-table|The model's 1,000 payments as a confusion matrix. Recall reads along the fraud row; precision reads down the alert column.]]

Alerts: 6 + 14 = 20. Only 6 are fraud, so P(fraud | alert) = 6 / 20 = 0.30. That is the precision. Bayes' rule gives the same number: 0.60 x 0.01 / (0.60 x 0.01 + 0.014 x 0.99) = 0.006 / 0.020 = 0.30.

One table gives two probabilities. Reading along the fraud row gives P(alert | fraud) = 0.60. Reading down the alert column gives P(fraud | alert) = 0.30. The analyst who opens an alert cares about the second number: 7 alerts in 10 will be false.

If a better model halved the false alarms to 7, precision would become 6 / 13 = 0.46.

## Independence
*When does knowing one fact tell you nothing about another?*

Two events are **independent** when knowing one does not change the probability of the other: P(A | B) = P(A). Then the chance that both happen is P(A and B) = P(A) x P(B).

Test it on the penguins. Among the 333 with a recorded sex, 168 are male: 0.50. Now ask by species. Among Adelie it is 73 of 146 (0.50), among Chinstrap 34 of 68 (0.50), and among Gentoo 61 of 119 (0.51). Knowing the species tells you almost nothing about the sex, so the two are roughly independent.

Island and species are not. P(Gentoo) is 0.36, but P(Gentoo | Biscoe) is 0.74. Knowing the island changes the answer, so they are **dependent**.

Independence matters in practice. If two test results are independent *given the truth*, a second positive result is strong extra evidence, and you can multiply their likelihoods. If they are not, because both come from the same flawed method or the same blurry sample, the second result tells you little new.

> Watch out: independence is an assumption to check, not a default. Treating strongly linked features or repeated checks as independent counts the same evidence twice.

::: deeper A second positive test
Suppose the 2 percent condition is tested again with a second test of the same quality, and its errors are independent of the first. Use 10,000 people so the counts stay whole. 200 are sick and 9,800 healthy. The first test gives 180 sick positives and 490 healthy positives, so 670 positives in all (180 / 670 = 0.27).

Retest only these 670. Of the 180 sick, 90 percent test positive again: 162. Of the 490 healthy, 5 percent do: 24.5 (half a person is fine in an average). P(sick | two positives) = 162 / (162 + 24.5) = 0.87. The first positive raised the chance from 0.02 to 0.27, and the second from 0.27 to 0.87. If the second test shared the first one's flaw, the result could stay near 0.27.
:::

::: deeper A model's probability is a conditional probability
A logistic regression, from "Probabilities and the sigmoid", outputs a number that is read as P(class = yes | features): the probability of yes given what the model knows about this case. Bayes' rule explains why that number depends on the base rate in the training data. If you oversample the rare class or add class weights, the model learns from data where yes is more common, so its probabilities are roughly too high for real use, even when its ranking of cases is fine.
:::

## Next: sampling and the bootstrap lab
*What do these counts hide?*

Every number in this lesson came from counts: 6 of 10 frauds caught, 73 of 146 Adelie penguins male. A different batch of cases would give slightly different counts, and so a slightly different recall or precision. With 10 frauds, one extra catch moves recall by 10 points.

The next lesson, "Sampling variability and the bootstrap", asks how much a reported number would move if you collected the data again, and how to put an honest range around it. Then the course ends in the "Bootstrap lab": you draw many samples from the same population and watch a metric such as precision vary from sample to sample.

Before you go on, check that you can do the 1,000-case table for the screening test without looking, then change the base rate and predict what happens to P(sick | positive).

::: remember
- P(A | B) counts A only among the cases where B holds, so it is usually different from P(B | A).
- Bayes' rule, or counting out of 1,000 cases, turns a likelihood into a posterior: sensitivity 0.90 with a 2 percent base rate gives 18 / 67 = 0.27.
- Precision is a posterior: it falls when positives are rare. Independence is something you check, not assume.
:::
