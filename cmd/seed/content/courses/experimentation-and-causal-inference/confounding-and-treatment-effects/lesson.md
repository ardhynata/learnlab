---
slug: confounding-and-treatment-effects
title: Confounding and treatment effects
kind: reading
simulator: ""
minutes: 25
---
::: intro
- Explain confounding, and why a model that predicts well can still give the wrong answer to "what if we changed it".
- Compute an average treatment effect and the effect for named subgroups by stratification on a small table, and name regression adjustment and inverse-propensity weighting as the other ways to adjust.
- Name the assumptions an observational estimate rests on, the variables you must not adjust for (colliders and post-treatment variables), and what a randomized trial gives that adjustment cannot.

Before you start: read "Randomized experiments and power" in this course and "Conditional probability and Bayes' rule" (a rate inside a group).
:::

## Predicting is not the same as changing
*Why can a model that predicts well still answer "what if we changed it" wrongly?*

Take a made-up hospital with 1,000 patients and a new drug. Doctors give the drug mostly to patients who are severely ill. In all, 350 of the 500 patients who got the drug recovered, which is 0.70. Of the 500 who did not, 370 recovered, which is 0.74.

A model that sees only "got the drug" learns that the drug goes with lower recovery. That is a correct prediction for this hospital, as long as doctors keep prescribing the same way: told that a patient got the drug, you should expect 0.70 to recover.

But a doctor asks something else: "if I give this patient the drug, does the chance of recovery go up?" That asks what happens when we **change** the treatment, and the same numbers cannot answer it. They compare two groups that were different before any drug was given.

> Key idea: a prediction answers "what do we expect to see, given what we saw?". A causal question answers "what would happen if we set it?". The two agree only when nothing else pushes on both the treatment and the outcome.

## Confounding: a common cause
*What makes the treated and the untreated different before any treatment?*

A **confounder** is a variable that drives both who gets the treatment and the outcome. Here it is severity. Among the 500 severely ill patients, 400 got the drug, which is 0.8. Among the 500 mildly ill patients, only 100 got it, which is 0.2. Severe patients also recover less often whatever they are given.

So the treated group holds mostly sick patients and the untreated group mostly mild ones. Even a drug that helps everyone can look harmful when the people who take it start out worse. This distortion is **confounding bias**.

[[figure:confounding-and-treatment-effects/common-cause|Severity points to both the drug and recovery. The question mark is the drug's own effect, which is what we want to isolate.]]

A confounder must come before the treatment. The doctor looks at severity first and then decides, so severity can influence the choice. In the data we see the arrow from the drug to recovery mixed with the path through severity, and we cannot tell them apart without more work.

## Treatment effects: what we want to know
*What does it mean to say a drug "works"?*

Every patient has two possible outcomes: recovery if given the drug, and recovery if not. These are **potential outcomes**. We see only one of them, because a patient either gets the drug or does not. The other is a **counterfactual**, never observed.

The **effect for one patient** is the difference between the two, and it can never be seen directly. So we average. The **average treatment effect** (ATE) is the mean outcome if everyone were treated minus the mean outcome if no one were. With a yes or no outcome, the means are recovery rates, so the ATE is a difference in rates.

The **effect for a subgroup** is the same average taken inside one named group, such as only the severely ill. The effect can differ between groups, and an average can hide this. In the table in the next section, the drug adds 0.10 for mildly ill patients and 0.15 for severely ill ones.

> Watch out: the ATE is the average effect over a population, not what the drug does for each person. A positive ATE can sit beside a subgroup where the drug does nothing, so report subgroups you have reason to name.

## Adjusting by stratification
*How do you compare like with like?*

**Stratification** splits the patients into groups, or strata, that are alike on the confounder, compares treated with untreated inside each one, and then averages the comparisons. Here are the made-up hospital's counts.

| Severity | Treated: recovered | Untreated: recovered | Difference |
| --- | --- | --- | --- |
| Mild | 90 of 100 = 0.90 | 320 of 400 = 0.80 | +0.10 |
| Severe | 260 of 400 = 0.65 | 50 of 100 = 0.50 | +0.15 |
| All patients | 350 of 500 = 0.70 | 370 of 500 = 0.74 | -0.04 |

The last row is the naive comparison, and it points the wrong way. Inside each stratum the drug helps. Each stratum holds 500 of the 1,000 patients, so each gets weight 0.5.

> Worked example: ATE = 0.5 × 0.10 + 0.5 × 0.15 = 0.05 + 0.075 = 0.125. The drug raises the chance of recovery by 0.125, about 12.5 percentage points, even though the raw rates look the other way. A result that flips when you split into groups is called **Simpson's paradox**.

[[figure:confounding-and-treatment-effects/two-strata|Recovery rate by group: the drug looks worse overall, and better inside both severity strata.]]

## Regression adjustment and inverse-propensity weighting
*What do you do when there are too many variables to stratify?*

Stratifying on 10 yes or no variables gives 2^10 = 1,024 cells, and many would be empty or tiny. Two other tools handle many variables.

**Regression adjustment** fits a model of the outcome from the treatment and the confounders, for example recovery ≈ a + b × treated + c × severe. The coefficient b is the adjusted effect: the difference the treatment makes with severity held fixed. On this table, least squares gives b = 0.125, the same as stratification. That match comes from this table's symmetry, not from a general rule.

**Inverse-propensity weighting** (IPW) first estimates the **propensity score**, the probability of getting the treatment given the confounders. Here it is 0.2 for mild and 0.8 for severe patients. Each patient is then weighted by 1 divided by the probability of the treatment they actually got, so a rare combination counts more. In the weighted data severity no longer predicts who is treated, and a weighted difference of means estimates the ATE.

::: deeper Inverse-propensity weights by hand
Treated mild patients had probability 0.2 of treatment, so each gets weight 1 / 0.2 = 5. Treated severe patients get 1 / 0.8 = 1.25, untreated mild 1 / 0.8 = 1.25, and untreated severe 1 / 0.2 = 5. The weighted number of recoveries if everyone were treated is 90 × 5 + 260 × 1.25 = 450 + 325 = 775, and 775 / 1,000 = 0.775. If no one were treated it is 320 × 1.25 + 50 × 5 = 400 + 250 = 650, and 650 / 1,000 = 0.65. The ATE is 0.775 - 0.65 = 0.125 again.
:::

::: deeper A regression fit on the table
Least squares on the 1,000 patients gives recovery ≈ 0.795 + 0.125 × treated - 0.275 × severe. The coefficient 0.125 is the adjusted effect. The fitted rates are 0.795 (mild, untreated), 0.92 (mild, treated), 0.52 (severe, untreated) and 0.645 (severe, treated). They are close to the observed 0.80, 0.90, 0.50 and 0.65, but not equal, because this model forces one effect for both strata while the data show 0.10 and 0.15.
:::

## What the data cannot tell you
*Which assumptions does an adjusted estimate rest on?*

Two assumptions sit under every adjusted estimate, and no test on the data confirms them.

**No unmeasured confounding.** Every variable that drives both treatment and outcome must be among the variables you adjust for. Suppose doctors also treat patients they consider frail, and frailty is not in the records. Adjusting for severity cannot remove it. The data cannot warn you, since an unrecorded variable is by definition not in them. You argue from how treatment was really decided, and ask the people who decided.

**Overlap.** Within every stratum there must be both treated and untreated patients. If every severe patient got the drug, the cell "severe, untreated" would hold 0 of 0, and the effect for severe patients could not be computed. You can count cells for the variables you recorded. A flexible model hides the gap by extrapolating.

> Watch out: a careful adjustment only removes the confounding you adjusted for. The estimate looks just as precise when an unmeasured confounder is still biasing it.

## What not to adjust for
*Is it always better to adjust for more variables?*

No. Adjust for variables measured before the treatment that drive both treatment and outcome. Two kinds of variable should be left alone.

A **post-treatment variable** is something the treatment changes, such as blood pressure measured after the drug. If the drug works by lowering it, adjusting for it removes the very effect you want.

A **collider** is a variable caused by both the treatment and the outcome. Adjusting for it, or restricting the data to one of its values, creates a link that was not there.

[[figure:confounding-and-treatment-effects/what-to-adjust|Three roles. Adjust for a confounder. Do not adjust for a post-treatment variable or a collider.]]

> Worked example: a trial of a drug that does nothing, with 400 patients: 200 treated and 200 untreated, and 100 recovered in each group, so 0.50 against 0.50. The clinic follows up every treated patient, and an untreated patient only if still sick. Followed-up patients: 200 treated, of whom 100 recovered, which is 0.50, and 100 untreated, of whom 0 recovered, which is 0.00. Looking only at them gives a gap of 0.50 where the true effect is 0. The numbers are made up and extreme on purpose.

Do not adjust for a variable just because it predicts the outcome. Ask whether it was fixed before the treatment and whether it influenced who got the treatment.

## Observational versus randomized
*How do you know whether an adjusted estimate can be trusted?*

A randomized trial breaks the link between severity and treatment, because a coin flip decides who gets the drug. Take a new trial of 800 patients: 400 treated and 400 control, with about 200 mild and 200 severe in each group. Both groups then have the same mix of severity, so the plain difference in recovery rates, with no adjustment, is the effect: 0.775 for treated against 0.65 for control, which is 0.125. A real trial lands near these figures, not on them, because of sampling noise.

::: deeper The trial's expected recoveries
The expected recoveries are 200 × 0.90 + 200 × 0.65 = 310 of 400 = 0.775 for treated and 200 × 0.80 + 200 × 0.50 = 260 of 400 = 0.65 for control. The difference is 0.775 - 0.65 = 0.125, the same as the stratified ATE.
:::

When a careful adjustment and an experiment disagree, trust the experiment and look for the assumption that failed: an unmeasured confounder, or a gap in overlap.

> Key idea: a prediction model is not a causal model. Its coefficients and importances, including permutation importance and SHAP values, describe how the model uses the data, which includes how doctors chose to prescribe. They do not tell you what happens when you change a feature.

In the Causal lab, the last lesson of this course, you generate confounded data and compare an observational estimate with a simulated randomized experiment. Before each run, predict which estimate will be off and by how much.

::: remember
- A confounder drives both who gets the treatment and the outcome, so a naive comparison, or a model that only predicts, can point the wrong way.
- The ATE is the average of the treatment effect over a population, and subgroup effects are the same average inside a named group. Stratification, regression adjustment and inverse-propensity weighting estimate it by comparing like with like.
- Adjustment needs no unmeasured confounding and overlap, and it must leave out colliders and post-treatment variables. A randomized trial does not need these assumptions.
:::
