---
slug: human-review-and-model-documentation
title: Human review and model documentation
kind: reading
simulator: ""
minutes: 25
---
::: intro
- Name four situations that call for a person (low confidence, high stakes, out-of-distribution input and appeal), and say why a confidence score catches only one of them.
- Design an abstain band by hand on 333 penguins, compute its coverage and accuracy, and size it to a reviewer's capacity.
- Write a short model card and a decision log, and say plainly when a model must not be used.

Before you start: read "Robustness, fairness and privacy" and "Subgroup metrics and fairness" (from the course "Interpretation and error analysis").
:::

## Four reasons to ask a person
*Which cases should a model not decide alone?*

The last lesson stressed a model to see where it breaks. Some cases will still go wrong, and a model that always answers cannot tell you which ones. **Human review** means a person looks at the case and decides before anything happens. Four situations call for it.

- **Low confidence.** The score sits close to the decision boundary, where the answer flips. It is only worth trusting if the scores are calibrated, as in "Calibration and costs".
- **High stakes.** A wrong answer is costly or hard to undo, such as a denied claim. This is a rule about consequences and ignores the score.
- **Out-of-distribution (OOD) input.** The case is unlike the training data, for example a value outside the range the model saw. The model still answers, often with high confidence, because a score never says "I have not seen this before".
- **Appeal.** The person affected asks for a second look. A route for this must always exist.

[[figure:human-review-and-model-documentation/review-routes|A case passes three checks. Failing any of them sends it to a person, and only the last check uses the model's score.]]

> Watch out: a confidence band catches only the first reason. High stakes and appeal are rules you write down, and OOD needs its own check, such as a range test on each feature.

## An abstain band you can compute
*What does a model that can say "I am not sure" look like?*

You will use the rule from "Subgroup metrics and fairness": a penguin weighing 4,700 g or more is a Gentoo, anything lighter is not. On the 333 penguins in the bundled table that have a body mass and a sex, it is right for 303, an accuracy of 303 / 333 = 0.91.

That rule has no probability, so in this lesson the distance from 4,700 g plays the part of confidence. A penguin at 4,720 g is a toss-up. One at 3,600 g is clear.

An **abstain band** is a range of scores in which the model does not decide and sends the case to a person. Here, **coverage** means the share of cases the model decides itself. This is a different use of the word from conformal prediction. **Accuracy on decided cases** means how often the model is right among those it decided.

Cut the 333 penguins by distance from 4,700 g and count where the rule is right and wrong.

| Distance from 4,700 g | Penguins | Rule right | Rule wrong |
| --- | --- | --- | --- |
| 0 to 99 g | 21 | 13 | 8 |
| 100 to 199 g | 17 | 11 | 6 |
| 200 to 399 g | 36 | 27 | 9 |
| 400 g or more | 259 | 252 | 7 |
| All | 333 | 303 | 30 |

## Coverage against accuracy
*What does each band width buy, and what does it cost?*

A band of width w sends to a person every penguin closer than w grams to 4,700 g. Build the next table by adding rows of the one above.

> Worked example: take w = 200 g. The band holds the first two rows: 21 + 17 = 38 penguins go to a person. The model decides 333 - 38 = 295. It is right on 303 - (13 + 11) = 279 of them. Coverage is 295 / 333 = 0.89 and accuracy on decided cases is 279 / 295 = 0.95.

| Band (closer than) | Sent to a person | Decided by model | Right | Coverage | Accuracy on decided |
| --- | --- | --- | --- | --- | --- |
| No band | 0 | 333 | 303 | 333 / 333 = 1.00 | 303 / 333 = 0.91 |
| 100 g | 21 | 312 | 290 | 312 / 333 = 0.94 | 290 / 312 = 0.93 |
| 200 g | 38 | 295 | 279 | 295 / 333 = 0.89 | 279 / 295 = 0.95 |
| 400 g | 74 | 259 | 252 | 259 / 333 = 0.78 | 252 / 259 = 0.97 |

Accuracy on decided cases climbs as coverage falls, because the cases removed are the ones the rule gets wrong most often: 8 of 21 in the closest group. A band works only when the score really tracks correctness, which is why calibration matters.

[[figure:human-review-and-model-documentation/coverage-accuracy|Each point is one band width on the penguins. Wider bands move left (fewer decided cases) and up (more accurate decisions).]]

## Choosing the width
*How wide should the band be?*

Two limits decide it: cost and capacity. Start with cost. Review a case when the chance of an error times its cost is larger than the cost of a review.

> Worked example: suppose a review takes 3 minutes of staff time and a wrong automatic decision costs 50 minutes of rework (both are assumptions for this lesson). Review pays off when the error chance is above 3 / 50 = 0.06. The error shares per row are 8 / 21 = 0.38, 6 / 17 = 0.35, 9 / 36 = 0.25 and 7 / 259 = 0.03. The first three rows are above 0.06 and the last is below, so the band is 400 g, which sends 74 penguins to a person.

Now capacity. 74 reviews at 3 minutes are 222 minutes, about 3.7 hours a day. If one reviewer has 2 hours (120 minutes, 40 cases), the 400 g band does not fit but the 200 g band does: 38 × 3 = 114 minutes.

These error shares were measured on the same 333 penguins, so they flatter the band: choose the width on validation data (cases kept out of fitting) and check it on fresh data.

## Coverage by group
*Does the band treat everyone alike?*

Look at coverage by group, not just overall. With the 400 g band the model decides 118 of 165 females (0.72) but 141 of 168 males (0.84), so reviewers see 47 females and only 27 males.

## Reviewer workload and automation bias
*Does sending a case to a person make the answer right?*

Only if the person really decides. **Automation bias** is the habit of accepting a machine's suggestion, even a wrong one. A reviewer who sees the model's answer first and is tired after hours of queue is prone to it.

Take the 400 g band. The rule is right on 13 + 11 + 27 = 51 of the 74 reviewed penguins and wrong on 23. Compare three reviewers. The reviewer figure of 70 right is an assumption, about 95%.

- **Decides alone.** Right on 70 of 74. The system is right on 252 + 70 = 322 of 333, which is 0.97.
- **Accepts every suggestion.** Right on 51 of 74, the same as the model. The system is right on 252 + 51 = 303 of 333, which is 0.91, exactly as if there were no review.
- **Accepts 8 in 10.** Right on 0.8 × 51 + 0.2 × 70 = 54.8 cases. The system scores (252 + 54.8) / 333 = 0.92.

[[figure:human-review-and-model-documentation/review-outcomes|System accuracy on 333 penguins for the 400 g band, with no review and with three reviewer behaviors.]]

Reduce the risk by showing the case before the suggestion, asking for a short reason, keeping the queue small enough to do well, and measuring how often reviewers disagree with the model.

## A model card
*What should a short document say about a model?*

A **model card** is a short document that travels with the model. It says what the model is for, how it was built and tested, and where it fails. Common fields are the intended use and what is out of scope, the data, the metrics by group, the limits, the review rule, the update plan, and the owner with a version number.

Here is a short card for the penguin rule.

| Field | Entry |
| --- | --- |
| Model | Gentoo flag, rule v1: body mass of 4,700 g or more |
| Intended use | Flag likely Gentoo penguins where the species is missing, so a biologist can check them |
| Not for | Other species or places, chicks, any decision about one animal without a check |
| Data | 333 penguins, three islands, 2007 to 2009; masses 2,700 to 6,300 g; 165 female, 168 male |
| Metrics by group | All 0.91 (303 / 333). Female 0.84 (139 / 165), male 0.98 (164 / 168). Measured on the same 333, with no held-out set (cases kept aside for testing) |
| With the review rule | Decided: female 111 / 118 right (0.94), male 141 / 141 (1.00); decided share 0.72 and 0.84 |
| Limits | Errors cluster near 4,700 g and fall mostly on females; one measurement; the rule itself has no check outside the range, and the review rule below adds one |
| Review rule | 4,301 to 5,099 g go to a person (74 of 333, 22%, so two or more reviewers); masses outside 2,700 to 6,300 g get no answer |
| Update plan | Re-score each season on newly labeled penguins; revise if accuracy on decided cases drops below 0.95 or two groups differ by more than 0.10 |

The by-group row is the link to "Subgroup metrics and fairness": one overall figure of 0.91 hides 0.84 for females.

## Decision logs
*What should be written down each time the model or a person decides?*

A **decision log** keeps one row per case, so that someone can reconstruct what happened later. It records the time, the model version, a case id (not personal data), the score, the route (model or review), the model's answer, the final answer, who reviewed, and the reason when the person disagreed. Appeals are added when they close.

Here are three illustrative rows from the penguin rule.

| Case | Version | Distance (g) | Route | Model said | Final | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| 0412 | v1 | 38 | review | Gentoo | not Gentoo | flipper 189 mm, like Adelie |
| 0413 | v1 | 910 | model | not Gentoo | not Gentoo | none |
| 0414 | v1 | 1,740 | out of range | no answer | sent to biologist | mass 6,440 g |

The log answers questions the card cannot. The **override rate** is the share of reviewed cases where the person changed the model's answer. The rule is wrong on 23 of 74 reviewed penguins, so reviewers who catch its errors should override it about 23 times. An override rate of 2 / 74 = 0.03 suggests automation bias. A sudden rise in the share routed to review suggests the inputs have shifted.

::: deeper Abstaining with prediction sets
The lesson "Conformal prediction" built intervals for numbers. The same recipe builds a set of classes: keep every class whose score passes a calibrated cut-off. A set with exactly one class can be decided automatically. An empty set or a set with two or more classes goes to a person. This gives an abstain rule with a coverage promise, under the same exchangeability condition (new cases behave like the calibration cases).
:::

## When a model must not be used
*What do you say when the answer is no?*

Sometimes the right outcome of documentation is a refusal. Four common reasons are an input outside the intended use, a band so wide that nobody can review it (3.7 hours of review where 2 are available), a group with too few cases to know how the model behaves, and a high-stakes use with no appeal route.

A good statement has four parts: what must not be done, the evidence with a number, what to do instead, and what would change the answer.

> Worked example: "Do not use the Gentoo flag on penguins outside 2,700 to 6,300 g, or on any species other than the three in the table. It was built on 333 penguins from 2007 to 2009 and has never seen those cases. Send them to a biologist. We will reconsider when 100 labeled penguins from the new site are available."

A refusal can be built in, as the no-answer route in the log above. Writing it down protects the person who says no, and the people the model would otherwise harm.

## Next: the lab
*Where do you practice this?*

In the next lesson, "Reliability lab", you stress-test a model across subgroups and data conditions, then document where human review is needed.

::: remember
- Four situations call for a person: low confidence, high stakes, OOD input and appeal. A confidence band only covers the first. An abstain band trades coverage for accuracy on decided cases, and its width is set by cost, reviewer capacity and per-group coverage.
- A review only helps if the reviewer decides. Under automation bias the system falls back to the model's own accuracy (303 / 333 = 0.91 here). Watch the override rate.
- A model card (use, data, metrics by group, limits, review rule, update plan) and a decision log make a model auditable, and a clear "do not use" statement is part of the documentation.
:::
