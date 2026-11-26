---
slug: end-to-end-design-and-reproducibility
title: End-to-end design and reproducibility
kind: reading
simulator: ""
minutes: 25
---
::: intro
- Start a design from the decision the model supports, and pick an operational metric (what the people using it actually gain), not only AUC.
- Plan the data, the labels, a baseline and a split that matches deployment, including the delay before labels arrive.
- Record a run so a stranger can repeat it, choose batch or online scoring, decide what to log, and review a design with a checklist.

Before you start: read "Reproducible pipelines" and "Defending an evaluation" in the Intermediate capstone (the "Intermediate capstone project" shows them at work), "Covariate and concept shift" in Advanced evaluation and shift, and "Framing and baselines" in the Beginner capstone. The first two gave you the rules for a repeatable, defensible evaluation. This lesson widens them from one evaluation to a whole system.
:::

## Start from the decision
*What is the model for, and who acts on its answer?*

A model is one part of a system: data come in, a score comes out, and a person or a program does something with it. Design starts at the end of that chain, with the **decision**. Who acts on the score, what do they do differently, and how many cases can they handle?

This lesson follows one invented project, and every number in it is invented. A card company receives 10,000 payments a day, and about 1% of them, 100 a day, are fraud. Reviewers can check 200 payments a day. A caught fraud saves 80 on average, and a review costs 2. Each morning the reviewers get a queue: the 200 payments the model finds most suspicious.

The **operational metric** measures how well the decision works in real use. Here it is the net value per day: 80 for each fraud in the queue, minus 2 for each review. AUC, accuracy and log loss are model metrics. They help you debug, but they are not what the company gains.

[[figure:end-to-end-design-and-reproducibility/design-chain|Eight questions of a system design, in the order you answer them. The lesson takes them one section at a time.]]

> Key idea: write the decision in one sentence, with its capacity and its costs, before you open any data. Here: "Each morning, rank yesterday's payments, and send the 200 most suspicious to reviewers."

## When AUC points the wrong way
*Can the model with the higher AUC be the worse choice?*

Two models, A and B, score the same 10,000 payments of a typical day. A has the higher AUC, 0.95 against 0.92, so over the whole list it ranks fraud above non-fraud more often. But reviewers read only the top 200, and B puts more fraud there. A simple rule, "queue the 200 largest amounts", is the baseline.

| Model | Fraud in the top 200 | Net value per day | AUC |
| --- | --- | --- | --- |
| Baseline rule (largest amounts) | 38 | 2,640 | 0.68 |
| Model A | 62 | 4,560 | 0.95 |
| Model B | 71 | 5,280 | 0.92 |

> Worked example: model B catches 71 frauds, worth 71 × 80 = 5,680. The 200 reviews cost 200 × 2 = 400, so the net value is 5,680 - 400 = 5,280 a day. Model A gives 62 × 80 - 400 = 4,560, and the baseline 38 × 80 - 400 = 2,640. B beats A by 720 a day, which is 720 × 30 = 21,600 over 30 days.

[[figure:end-to-end-design-and-reproducibility/metric-reversal|Three rankers on one invented day: fraud caught in the top 200 (bars), net value per day, and AUC. The AUC order is not the value order.]]

AUC averages over all 10,000 positions. A ranks the frauds outside the top 200 better than B does, and that earns nothing while nobody reads past position 200. Choose between models on the operational metric.

::: deeper Where these AUCs come from
The AUC values are constructed, not simulated. AUC is the share of (fraud, non-fraud) pairs in which the fraud is ranked higher. Put model A's 62 top-200 frauds evenly in positions 1 to 200 and its other 38 evenly in positions 201 to 2,500: AUC = 0.947. Model B has 71 frauds in the top 200 and its other 29 evenly in positions 201 to 5,000: AUC = 0.922. The baseline has 38 in the top 200 and 62 evenly in positions 201 to 10,000: AUC = 0.682. The top of the list is a tiny part of the pairs, so the tail decides the AUC.
:::

## Data, labels and a baseline first
*What will you know when the score is needed, and what must you beat?*

Ask two questions about the data. First, which columns exist at the moment of scoring? The amount, the time and the merchant do. "Chargeback filed" does not: it is the label in disguise, and training on it is the leakage that "Pipelines and leakage" warned about. Second, when does each label arrive? Fraud is confirmed by chargebacks that come up to 30 days after the payment, so yesterday's payments have no label yet.

Then build the **baseline** before any model: the simplest rule you could deploy tomorrow, scored with the same operational metric. Here it is "queue the 200 largest amounts": 38 frauds a day, net value 2,640. A baseline can also be today's process, such as a rule the reviewers already use.

The baseline sets the bar. A model that catches 40 instead of 38 earns 2 × 80 = 160 more a day, and it may not pay for its own upkeep. It also tests the pipeline: a model that scores below a trivial rule points to a bug before it points to hard data.

> Watch out: a baseline reported in a different metric than the model, such as accuracy for the rule and AUC for the model, is not a baseline. Put every row in the same table, in the operational metric.

## A split that matches deployment
*How do you cut 180 days of history so the test looks like tomorrow?*

"Defending an evaluation" starts the split from one sentence: what will be new when the model is used? Here it is days the model has never seen, scored with the labels that exist at that time. Label delay changes the cut.

Say the system is built on day 150. The history file was exported after day 210, so every label in it is final, and we pretend to stand on day 150. At that moment labels are final only for days 1 to 120, because of the 30-day delay. The honest cut has three parts. Train on days 1 to 120: 1,200,000 payments, about 12,000 fraud. Leave days 121 to 150 out of training: a fraud nobody has reported yet looks like a normal payment. Test on days 151 to 180: 300,000 payments, about 3,000 fraud, and 30 × 200 = 6,000 reviews. Because the exported file holds the final label for every day, the test can be scored at once.

[[figure:end-to-end-design-and-reproducibility/deployment-split|The same 180 days cut two ways. Top: train, gap and test in time order, as in deployment. Bottom: a random cut, where test days sit between training days.]]

A random 80/20 cut trains on payments from after the days it tests, with labels that would not exist yet. It also hides the shift that "Covariate and concept shift" describes. Its score is not the score you will see.

## A pipeline you can rerun
*What must be on record so a reviewer gets your table back?*

"Reproducible pipelines" gave the rules: one pipeline fitted on training rows only, fixed seeds, recorded settings, a results table, one command. A system adds what surrounds the pipeline. The record also names the exact data snapshot (file, row count, checksum), the code version, the library versions and the split dates.

```
data      payments_v3.csv, row count <recorded here>, checksum <recorded here>
code      commit <recorded here>
libraries versions from the lock file
split     train days 1-120, gap 121-150, test 151-180
seed      42
metric    fraud in the 200 highest scores per day, and net value
command   make results   # raw file -> features -> fit -> score test days -> results.csv
```

The results table has the form of the one earlier in this lesson: the baseline and every model you tried, the operational metric first, then the model metric. Add the spread across the 30 test days and across seeds, so a gap such as B's 720 a day over A can be compared with that spread.

Check it as in "Reproducible pipelines": run the command twice, then once in a clean copy of the folder, and compare the tables. If they differ, something is missing from the record.

## Batch or online, and what to log
*When must the score exist, and what must you keep when it does?*

**Batch** scoring runs on a schedule over a whole file. **Online** scoring answers one request as it arrives. Choose by when the decision needs the score. The reviewers start in the morning on yesterday's payments, so a nightly batch job over 10,000 payments is enough. Blocking a payment while the customer waits would need online scoring.

| | Batch | Online |
| --- | --- | --- |
| Score needed | before a scheduled step | during a request, within about a second |
| Features | anything known when the job runs | only what is known at request time |
| When it fails | a late or missing run, easy to rerun | a slow or failed request, so a fallback rule is needed |

For every scored payment, log the id, the time, the model version, the features used (or a pointer to them), the score, the rank and what was done with it. Labels arrive later. Joining them back by id gives the real fraud caught per day, the operational metric measured live.

[[figure:end-to-end-design-and-reproducibility/log-join|The prediction log is written at scoring time. Labels arrive up to 30 days later and are joined to it by id.]]

::: deeper How much is that to log?
If one record is about 200 bytes, a day of 10,000 payments is 10,000 × 200 = 2,000,000 bytes, roughly 2 MB. A year is about 730 MB. That is small next to the cost of a model whose behavior you cannot reconstruct, so log first and trim later.
:::

## A design review checklist
*What do you ask before anyone builds it?*

"Defending an evaluation" has five questions for an evaluation. A system adds more. Ask all eight in a design review, and expect an answer you can point to for each.

| Ask | Show | In this project |
| --- | --- | --- |
| 1. Decision: who acts, on how many cases? | One sentence with capacity and costs | 200 reviews a day |
| 2. Metric: what is gained, against which baseline? | A table row for the baseline | net value, 2,640 |
| 3. Data: what exists at scoring time? | A column list | no chargeback column |
| 4. Labels: when do they arrive? | The delay in days | up to 30 days |
| 5. Split: what will be new? | Train, gap and test dates | days 1-120, 151-180 |
| 6. Rerun: can a stranger repeat it? | The run record and one command | make results |
| 7. Serving: batch or online, and what if it fails? | A schedule or a fallback rule | nightly batch |
| 8. Logs: can a late label join its score? | The record fields | id, version, score |

> Key idea: the checklist asks about the system around the model. A model with a good score still fails the review if nobody can say who acts on it, or what happens when it is wrong.

## Toward the capstone project
*What do you build with this?*

The next lesson, "Operating and investigating a model", takes this design after launch: what to watch once it runs, how to notice that the score you measured no longer holds, and how to investigate a failure. The course "ML deployment and monitoring" goes deeper into serving and drift.

Then comes "Advanced capstone project". There you ship a batch or online model with a reproducible evaluation, an operational metric, a monitoring plan and a documented failure investigation. Start it from this lesson. Write the one-sentence decision, the operational metric, the baseline row, the split and the run record before you fit a first model. Then review your own design with the eight questions.

::: remember
- Design starts from the decision, its capacity and its costs. The operational metric, not AUC alone, decides between models: here B beats A by 720 a day with the lower AUC.
- Plan the data, the label delay and a baseline first, and cut the split the way deployment cuts time: train, gap, test.
- Record the data snapshot, code, versions, seed and one command. Choose batch or online by when the score is needed, and log the id, version, score and action so late labels can be joined.
:::
