---
slug: randomized-experiments-and-power
title: Randomized experiments and power
kind: reading
simulator: ""
minutes: 25
---
::: intro
- Explain why randomly assigning a treatment lets a simple difference in means estimate its effect.
- Work an A/B test by hand: the difference, its standard error, a 95% interval and a p-value, and say what a p-value does not mean.
- Size a test with power and the minimum detectable effect, and name what peeking and many comparisons do to false positives.

Before you start: read "Sampling variability and the bootstrap" in the Probability and statistical uncertainty course.
:::

## Why randomize
*Why does a coin flip let you compare two groups fairly?*

Earlier lessons asked how well a model predicts. This one asks: **what happens if we change something?** Does a new checkout page make more shoppers buy? The change is the **treatment**, and the number you measure afterwards is the **outcome**.

Each shopper sees only one page. You never learn what the same person would have done on the other page, so you compare different people. That is fair only if the two groups are alike in everything except the page.

**Random assignment** makes them alike. When a coin flip decides who gets the new page, nothing about a shopper (past spending, device, mood) can steer who lands where. The groups then differ only by chance and by the page. The **difference in means** (the mean outcome of the treated group minus the mean outcome of the control group) estimates the **average treatment effect**: the average change the page causes. No model is needed.

[[figure:randomized-experiments-and-power/random-assignment|The same 40 shoppers, 12 of them frequent buyers, split two ways. A coin flip leaves a small chance gap. When shoppers choose, the new page collects most of the frequent buyers.]]

> Key idea: randomization does not make the groups identical. It makes the gaps between them chance, and chance can be measured.

## An A/B test by hand
*How big is the gap between two groups, and how sure are we?*

An **A/B test** is a randomized experiment with two versions: A, the current page, and B, the new one. The numbers here are made up for this lesson. A shop flips a coin for each of 4,000 visitors, so 2,000 see each page. A purchase is a 1 and no purchase a 0, so the mean of the outcome is the purchase rate.

| | Control (A) | New page (B) |
| --- | --- | --- |
| Visitors | 2,000 | 2,000 |
| Purchases | 200 | 240 |
| Purchase rate | 10% | 12% |

The difference is 12% - 10% = 2 percentage points. Sampling variability, from "Sampling variability and the bootstrap", says each rate wobbles. For a rate, SE = sqrt(p × (1 - p) / n).

> Worked example: SE for A is sqrt(0.10 × 0.90 / 2000) = sqrt(0.000045) = 0.0067. SE for B is sqrt(0.12 × 0.88 / 2000) = sqrt(0.0000528) = 0.0073. The groups are independent, so variances add: sqrt(0.000045 + 0.0000528) = sqrt(0.0000978) = 0.00989, or 0.989 points. A 95% interval is 2 ± 1.96 × 0.989 = 2 ± 1.94, which is 0.06 to 3.94 points.

Do not add the two SEs (0.0067 + 0.0073): that overstates the wobble. Randomize by person, not by page view, because one person's visits are not independent draws.

## The null and the p-value
*What does a p-value say, and what does it not say?*

The **null hypothesis** says the true effect is exactly 0, so any gap is chance. The **p-value** asks: if the null were true, how often would chance alone produce a gap at least this large, in either direction?

> Worked example: the gap is 2 points and its SE is 0.989, so it sits 2 / 0.989 = 2.02 standard errors from 0. A normal table puts about 0.0216 of the chance gaps beyond 2.02 on each side, so p is about 2 × 0.0216 = 0.043. This matches the interval: 0.06 is just above 0, and p is just below 0.05.

[[figure:randomized-experiments-and-power/null-and-interval|Top: how large the gap gets by chance when the true effect is 0, with both shaded tails added up to the p-value. Bottom: the observed gap with its 95% interval.]]

Four misreadings are common:

- p = 0.043 is **not** a 4.3% chance that the page does nothing. It assumes the null and asks about the data.
- It is **not** the size of the effect. A huge test can give a tiny p for a gap too small to matter.
- A large p does **not** show there is no effect. It says the data cannot tell the effect from chance.
- The 0.05 line is a convention. A p of 0.043 and one of 0.057 are about equally strong evidence.

> Watch out: this result is barely significant and its interval is wide. The true effect could be almost nothing or about 4 points.

## Power and the minimum detectable effect
*How many visitors does a test need to find a real effect?*

**Power** is the chance that a test declares a real effect significant. A common target is 80%. Our test calls a gap significant when it is larger than 1.96 × 0.989 = 1.94 points. Suppose the true lift really is 2 points. The gap we see wobbles around 2, so it clears 1.94 only about 52% of the time. The test was close to a coin flip for the effect it found.

The **minimum detectable effect** (MDE) is the smallest true effect the test finds with 80% power. It equals 2.80 × SE, where 2.80 is 1.96 + 0.84 (the second part buys the extra power). Here the MDE is 2.80 × 0.989 = 2.77 points. A true lift of 2 points is below it.

[[figure:randomized-experiments-and-power/power-curves|Power rises with the number of visitors per group, and faster for a bigger true lift over a 10% baseline. The dots mark our test, with 2,000 per group, and the size the next section works out.]]

The MDE depends on the visitors, the noise in the outcome and the power you ask for. Visitors sit under a square root, so halving the MDE takes about four times as many.

::: deeper Where 2.80 comes from
The test is significant when the gap exceeds 1.96 SE. For the test to pass that line 80% of the time, the true effect must sit 0.84 SE above it, because 80% of a bell curve lies below 0.84 SE from its center. So the true effect is 1.96 + 0.84 = 2.80 SE. Check: 0.84 standard errors above the line gives a power of about 80%.
:::

## Sizing a test by hand
*How many visitors does the new-page test need?*

Turn the MDE rule around. For a target lift d, take the visitors needed in each group as n = 2.80² × (p_A × (1 - p_A) + p_B × (1 - p_B)) / d². This is the SE formula solved for n.

> Worked example: baseline 10%, target 12%, so d = 0.02. The two variances are 0.10 × 0.90 = 0.09 and 0.12 × 0.88 = 0.1056, adding to 0.1956. Then n = 7.84 × 0.1956 / 0.0004 = 3,834 visitors per group, or 7,668 in all, about twice our 2,000. At that size the SE is 0.714 points, and 2 / 0.714 = 2.80.

Now ask for a 1-point lift, from 10% to 11%. The variances are 0.09 and 0.0979, so n = 7.84 × 0.1879 / 0.0001 = 14,731 per group. Half the lift costs nearly four times the visitors.

Decide the lift worth finding before you run the test. Smaller lifts may be real and still be too expensive to chase. You pick the target lift from what the change is worth, not from what the test can reach.

## Peeking and many comparisons
*Why can looking often, or measuring a lot, make nothing look like something?*

A 5% cutoff promises a false positive 5% of the time if you look **once**, at the planned end. **Peeking** breaks that promise: you check every day and stop the first time p falls below 0.05. Each look is another chance for luck. In a simulation of experiments with no real effect, stopping at the first significant look declared a win about 8% of the time with 2 looks, 14% with 5, 19% with 10 and 25% with 20.

**Multiple comparisons** do the same through breadth. Test m metrics or versions, each at 0.05, with nothing real, and the chance that at least one looks significant is 1 - 0.95^m. That is 22.6% for 5 and 64% for 20.

[[figure:randomized-experiments-and-power/false-positives|Chance of at least one false positive when nothing is real. Repeated looks at one test grow more slowly than separate tests, and both pass the intended 5%.]]

Fixes: set the sample size and the stopping day before you start, and look once. If you must look repeatedly, use methods built for it, with stricter cutoffs at each look. Name one primary metric in advance. For several tests, the Bonferroni rule divides the cutoff by m, so 20 tests use 0.05 / 20 = 0.0025.

> Watch out: a win found after many looks or many metrics is a lead to test again, not a finding.

## Guardrail metrics and the plan
*What must you watch besides the metric you hope will move?*

A **guardrail metric** is one that must not get worse while the main one improves: refund rate, page load time, unsubscribes. The **primary metric** decides whether to ship, and a breached guardrail can veto it. Our page might lift purchases by 2 points and still raise refunds. Set the guardrail as a margin before launch (for example, refunds must not rise by more than 0.5 points) and check it against its interval.

Also check that the assignment itself worked. A 50/50 flip of 4,000 visitors should give about 2,000 each, give or take sqrt(4,000 × 0.25) = 31.6. If you see 2,150 and 1,850, each group is 150 away from 2,000, which is 4.7 times that spread: something broke in the assignment, and no result from that test can be trusted.

Write the plan down before launch:

- the primary metric and the guardrails;
- the unit that is randomized (the shopper);
- the lift worth finding and the sample size it needs (3,834 per group here);
- the stopping day, and the one time you will read the result.

## When you cannot randomize
*What can you do when a coin flip is not possible?*

Sometimes you cannot, or must not, assign the treatment: it would be harmful, impossible (the event already happened), too costly, or the groups affect each other. There are three common ways out, and each needs assumptions you must state.

- **Randomize something nearby.** Randomly invite people to use a feature, assign whole stores or cities, or roll the change out in a random order.
- **Find a natural experiment.** A lottery, or a cutoff such as "scores above 60 pass", can split people almost as if by chance.
- **Compare in observational data.** Compare treated and untreated people and adjust for what differs. This is where the plain difference in means fails.

The next lesson, "Confounding and treatment effects", shows how it fails and what you must assume to correct it. The course ends in the "Causal lab" lesson, where you compare an observational estimate on confounded data with a simulated randomized experiment and see what the coin flip buys.

::: remember
- Random assignment makes the groups alike apart from chance, so a difference in means estimates the average treatment effect. Its standard error and 95% interval tell how far chance can move it.
- A p-value is how often chance alone gives a gap this large if the effect is 0. It is not the chance the null is true, nor the effect size. Size the test first: MDE = 2.80 × SE, and halving it takes about four times the visitors.
- Peeking and many comparisons inflate false positives. Fix the plan, one primary metric and the stopping day in advance, and watch guardrails.
:::
