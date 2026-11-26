---
slug: covariate-and-concept-shift
title: Covariate and concept shift
kind: reading
simulator: ""
minutes: 25
---
::: intro
- Name the three kinds of dataset shift (covariate, label and concept) by what moved: the inputs, the class balance or the relationship.
- Work out by hand how each kind lowers a deployed model's score, and detect shift with the population stability index and a classifier that tells old rows from new ones.
- Say which validation setups anticipate which shift, and choose between monitoring, reweighting and retraining.

Before you start: read "Nested cross-validation", "Grouped and temporal splits" and "Conditional probability and Bayes' rule". The first two gave you honest scores from the data you have. The third showed that a screening test means something different at a different base rate (the share of people who really are sick). This lesson asks what happens to a score once the data moves.
:::

## Three ways data moves
*What does it mean for new data to differ from the data you trained on?*

Every honest score so far, from a test set or from cross-validation, rests on one promise: the rows the model meets later come from the same source as the rows it learned from. After deployment that promise can break. A new customer group arrives, a sensor is replaced, a rule changes. This is **dataset shift**.

A row has inputs x and a label y. Three things can move.

- The mix of inputs, P(x). This is **covariate shift**.
- The class balance, P(y). This is **label shift**, also called prior shift.
- The relationship the model is trying to learn, P(y given x). This is **concept shift**.

The lesson follows one invented example: a streaming service predicts whether a subscriber cancels next month (y) from the hours watched per week (x). Real shifts often mix the three kinds, but naming the main one tells you what to check and which repair can work.

[[figure:covariate-and-concept-shift/three-shifts|Training data on the left and new data on the right in each panel. Filled dots and rings are the two classes, and the dashed line is where they split.]]

## Covariate shift: new inputs
*What happens when the inputs change but the relationship does not?*

In **covariate shift** P(x) changes and P(y given x) stays the same. The world follows the same rule, but different people arrive. Say the service was built for heavy viewers, and a promotion now brings in many light ones. Hours still relate to cancelling as before, but the model learned that relationship mostly from heavy viewers, so it is weaker on light ones.

> Worked example: the model's accuracy is 60% for viewers under 2 hours a week, 80% for 2 to 6 hours and 95% for over 6 hours. The test set mirrors the training mix of 10%, 30% and 60% of viewers. Accuracy is 0.10 x 0.60 + 0.30 x 0.80 + 0.60 x 0.95 = 0.06 + 0.24 + 0.57 = 0.87. After the promotion the mix is 60%, 30% and 10%: 0.36 + 0.24 + 0.095 = 0.695.

Accuracy fell from 87% to 69.5% and no region got worse. Only the mix moved.

[[figure:covariate-and-concept-shift/covariate-accuracy|The same model and the same accuracy in each region of weekly hours. Only the share of viewers per region changes, and the overall accuracy follows.]]

> Key idea: covariate shift hurts because the model is imperfect somewhere, and the shift sends more cases there. A model that was equally good in every region would not notice it.

## Label shift: a new class balance
*What happens when the class balance changes but each class looks the same?*

In **label shift** P(y) changes while P(x given y), what each class looks like, stays the same. Return to the screening test from "Conditional probability and Bayes' rule": it flags 90% of sick people and 5% of healthy ones. Suppose it was checked at a referral clinic where 20% of people are sick and is then used at a community check-up where 2% are.

The flag rates do not move, because sick and healthy people look as they did. What moves is the meaning of a flag. Out of 1,000 people, the referral clinic has 180 sick and 40 healthy people flagged, so precision, the share of flagged people who are really sick, is 180 / 220 = 0.82. The community has 18 sick and 49 healthy flagged, so precision is 18 / 67 = 0.27.

You can correct the old counts without a single new label, if you know the new balance. Multiply each class by its new share over its old share: sick by 0.02 / 0.20 = 0.1 and healthy by 0.98 / 0.80 = 1.225. Then 180 x 0.1 = 18 and 40 x 1.225 = 49.

[[figure:covariate-and-concept-shift/prior-correction|The flagged people at the referral clinic, rescaled class by class to the community's base rate. Precision falls from 0.82 to 0.27.]]

> Watch out: accuracy can hide label shift. The test is right on 94% of people at the clinic and on 94.9% in the community, while precision collapses. Look at precision, and at the probabilities a model outputs, which are now too high.

## Concept shift: a new meaning
*What happens when the same input now leads to a different outcome?*

In **concept shift** P(y given x) changes, even if the inputs look exactly as before. Take 100 subscribers, 50 light viewers and 50 heavy ones, and a model that says "cancels" for light and "stays" for heavy. A rival then launches a bundle that tempts heavy viewers, while the service's own cheap plan keeps light viewers.

| Period | Light viewers who cancel | Heavy viewers who cancel | Model right | Accuracy |
| --- | --- | --- | --- | --- |
| Before | 40 of 50 | 5 of 50 | 40 + 45 = 85 | 85% |
| After | 30 of 50 | 20 of 50 | 30 + 30 = 60 | 60% |

The model is right on the light viewers who cancel and on the heavy viewers who stay. The inputs did not move: it is still 50 light and 50 heavy. The overall cancel rate barely moved either, 45% to 50%. A comparison of inputs shows nothing, and so does a glance at the totals.

> Watch out: concept shift is invisible without labels. Only comparing predictions with what really happened exposes it, and a cancellation is known only a month later.

::: deeper Sudden, gradual and seasonal
A shift has a shape in time. It can be sudden (the rival's bundle launches on one day), gradual (habits slowly change) or recurring (holiday weeks, then back to normal). The shape matters for the response. A sudden shift calls for an alarm and a quick retrain. A gradual one is easiest to catch with a rolling comparison against the training period. A recurring one is better handled by giving the model the season as a feature than by retraining every quarter.
:::

## Detecting shift
*How do you notice a shift before the complaints arrive?*

There are three tools, from cheap to expensive.

**1. Compare feature distributions.** Cut each feature into bins and compare the share of rows per bin in training with the share in recent data. The **population stability index (PSI)** adds up (new share minus old share) x ln(new share / old share) over the bins.

> Worked example: hours watched, bins under 2, 2 to 6 and over 6. Training shares 0.10, 0.30 and 0.60, promotion shares 0.60, 0.30 and 0.10. The terms are (0.60 - 0.10) x ln 6 = 0.896, then 0 for the middle bin, then (0.10 - 0.60) x ln(1/6) = 0.896. PSI = 1.79. A common rule of thumb reads under 0.1 as small, 0.1 to 0.25 as moderate and above 0.25 as large.

**2. Train a classifier to tell old from new.** Label training rows 0 and new rows 1 and fit any classifier. Score it on held-out rows. An AUC (the area under the ROC curve; 0.5 means guessing) near 0.5 means it cannot tell them apart. The rule "under 2 hours means new" gets 60 of 100 new rows and 90 of 100 old rows right, 150 of 200, or 75% against 50% for guessing.

**3. Watch outcomes.** Once labels arrive, track accuracy, precision and the share of positive predictions. This is the only tool that sees concept shift.

::: deeper What PSI depends on
PSI depends on how you cut the bins. Ten bins cut at the quantiles of the training data are a usual choice. An empty bin makes the logarithm blow up, so people add a tiny constant to every share. PSI measures how far one feature moved. It is not a test with a p-value, and the cutoffs above are conventions.
:::

## Which validation anticipates which shift
*Which of your test scores would have warned you?*

A **random split** anticipates none of the three. Test rows are drawn from the same pool as training rows, so they carry the same inputs, balance and relationship. That is why its score is the "before" score: 87% above.

A **grouped split** anticipates the shift of meeting new groups, such as a hospital the model has never seen. A **temporal split** anticipates drift that happened over the period you collected, and a rolling origin (repeated temporal splits that move the cut-off forward) shows how fast the score decays. Both anticipate only the shifts present somewhere in your data.

An **out-of-distribution test** goes further. You build a test set from where training is thin or absent: the lightest viewers, a new device, the rarest season. In the example, the random test says 87% while the slice under 2 hours says 60%. That gap is the warning, given before the promotion. The same idea works for class balance: build a stress set with a different mix of cancelling and staying subscribers.

[[figure:covariate-and-concept-shift/which-validation|Which validation setup can show each kind of shift. Partly means only when that shift already appears across the groups or the time span of the data you collected.]]

Out-of-distribution also works per row. The penguin table has flipper lengths from 172 to 231 mm. A row with 300 mm is outside what the model has seen, so flag it instead of trusting its answer.

## Responding to shift
*Once you see shift, what are your options?*

Three responses, and the kind of shift picks among them.

**Monitor.** Compute PSI per feature each week, track the share of positive predictions, and measure outcomes as labels arrive. Keep a small recent labeled sample for exactly this.

**Reweight.** For covariate shift, give each old row the weight new share / old share of its region: 0.60 / 0.10 = 6 for under 2 hours, 1 for the middle and 0.10 / 0.60 = 1/6 for over 6 hours. Take 100 old validation rows, 10, 30 and 60 per region, with 6, 24 and 57 right. The weighted right count is 6 x 6 + 24 + 57 / 6 = 69.5 out of a total weight of 60 + 30 + 10 = 100: 69.5%, the same figure as before, with no new label. Label shift uses the class weights from earlier. Reweighting needs old rows in every region the new data visits, and a weight of 6 rests on only 10 rows.

**Retrain.** Concept shift needs fresh labeled rows, because the old rows teach the old relationship. Train on recent data, and judge the new model with a temporal split.

> Key idea: reweighting fixes who the data is about. It cannot fix what the labels mean.

## Before the lab
*What will you try in the Shift lab?*

The next lesson is the Shift lab, the last of this course. There you introduce one type of shift at a time and measure which validation setups anticipated the drop in performance. It is the which-validation table turned into an experiment.

Before you open it, write down two guesses. For covariate shift, which of the random, grouped and temporal splits will come closest to the score after the shift? For concept shift, will any of them? Then check your guesses against what the lab shows.

::: remember
- Shift is a change in P(x), P(y) or P(y given x): covariate, label and concept shift. Each lowers a deployed score in its own way, and accuracy alone can hide it.
- Compare feature distributions with PSI, train a classifier to tell old rows from new, and watch outcomes: only outcomes reveal concept shift.
- A random split anticipates no shift. Grouped, temporal and out-of-distribution tests anticipate some. Monitor first, reweight for covariate and label shift, and retrain for concept shift.
:::
