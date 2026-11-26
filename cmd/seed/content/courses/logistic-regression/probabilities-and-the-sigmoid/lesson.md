---
slug: probabilities-and-the-sigmoid
title: Probabilities and the sigmoid
kind: reading
simulator: ""
minutes: 15
---
::: intro
- Explain why a straight line is a poor way to predict a yes-or-no answer.
- Turn a score into a probability with the sigmoid function, and compute it by hand.
- Read odds and log-odds, and say what a decision boundary is.

Before you start: read "Lines and predictions".
:::

## A yes-or-no question
*Why does a straight line struggle with a yes-or-no answer?*

In "Lines and predictions" a line predicted a number, such as a fare. Many questions are different: will this student pass the exam, is this email spam? The answer is one of two **classes**, and predicting a class is **classification**.

Write the classes as numbers: 1 for pass and 0 for fail. Then you could try to fit a line to those 0s and 1s. The figure shows twelve students with their hours of study. The line climbs as hours grow, which is the right trend, but nothing stops it. On the far left it drops below 0 and on the far right it rises above 1, and "a prediction of 1.29" has no meaning for a yes-or-no question.

What we want is a number that always stays between 0 and 1, so we can read it as a **probability**: the chance of the class 1. The model in this course, **logistic regression**, gets there in two steps: a linear score, then a curve that squeezes it into that range.

[[figure:probabilities-and-the-sigmoid/line-vs-sigmoid|The same twelve students. A straight line leaves the range 0 to 1; an S-shaped curve never does.]]

## The sigmoid function
*How do we squeeze any number into the range 0 to 1?*

The **sigmoid** function takes any number z, large or small, positive or negative, and returns a number between 0 and 1:

`sigmoid(z) = 1 / (1 + e^(-z))`

Here e is about 2.718. You do not need to memorize the formula, only its behavior.

| z | -4 | -2 | -1 | 0 | 1 | 2 | 4 |
|---|---|---|---|---|---|---|---|
| sigmoid(z) | 0.02 | 0.12 | 0.27 | 0.50 | 0.73 | 0.88 | 0.98 |

At z = 0 the sigmoid gives exactly 0.5. A positive z gives more than 0.5 and a negative z gives less. The curve is steepest in the middle and flattens at both ends: it gets closer and closer to 1 or to 0 but never reaches either. It is also symmetric, so sigmoid(-2) = 0.12 and sigmoid(2) = 0.88 add up to exactly 1.

[[figure:probabilities-and-the-sigmoid/sigmoid-curve|The sigmoid curve. Score 0 maps to 0.5; the far ends flatten toward 0 and 1.]]

> Key idea: the sigmoid is only a squeezer. It does not decide anything. It turns any score into a number you can read as a probability.

## A score, then a probability
*How does a model get from hours of study to a probability?*

Logistic regression computes a **score** z the same way linear regression computes a prediction, as a weighted sum of the features plus an intercept. Then it passes the score through the sigmoid:

1. `z = weight × x + intercept`
2. `p = sigmoid(z)`

Suppose a model for the exam has weight 1.2 and intercept -3.6, so `z = 1.2 × hours - 3.6`. (A fitted model finds these numbers from data; here we simply picked them.) For a student who studies 4 hours:

- The score is z = 1.2 × 4 - 3.6 = 1.2.
- Then e^-1.2 is about 0.301, so p = 1 / (1 + 0.301) = 0.77.

For 1 hour the score is -2.4 and p = 0.08. For 3 hours the score is 0 and p = 0.50. For 5 hours the score is 2.4 and p = 0.92.

[[figure:probabilities-and-the-sigmoid/score-to-probability|The two steps for four students. Each hour adds 1.2 to the score, but the probability moves fastest near 3 hours.]]

Notice that a step of one hour always adds 1.2 to the score, yet it adds very different amounts to the probability: from 3 to 4 hours it adds 0.27, from 4 to 5 only 0.15.

## Reading a probability
*What does a probability of 0.77 actually say?*

The model says p = 0.77 for a student who studied 4 hours. Read it as an estimate of how often such students pass: if the model is well calibrated and you met 100 students like this, you would expect about 77 of them to pass and about 23 to fail. It is not a promise about this one student, and it is not a class.

So when a student with p = 0.77 fails, the model was not necessarily wrong. A 23 in 100 chance happens all the time. A model that never allows for that, and says p = 1 for everyone it likes, is overconfident.

> Watch out: a probability is not a decision. The model outputs 0.77, a number. Turning it into "pass" or "fail" needs a separate rule, and you choose that rule. The lesson "Thresholds and decisions" is about it.

Probabilities are also more useful than bare classes. A student with p = 0.51 and one with p = 0.97 might both be labeled "pass", but they call for different actions: one is a coin flip, the other nearly certain.

## Odds
*What are odds, and how do they differ from a probability?*

People often talk about **odds** instead of probabilities. The odds of a class are the chance that it happens divided by the chance that it does not:

`odds = p / (1 - p)`

If p = 0.8, the odds are 0.8 / 0.2 = 4: four passes for each fail, "4 to 1". If p = 0.5, the odds are 1, an even bet.

## Log-odds
*How is the score related to the probability?*

The **log-odds** are the natural logarithm of the odds. They have a neat link to this lesson: **the score z is the log-odds.** Equivalently, the odds equal e^z. Check it with the exam model:

| Hours | Score z | p | Odds |
|---|---|---|---|
| 3 | 0 | 0.50 | 1 |
| 4 | 1.2 | 0.77 | 3.32 |
| 5 | 2.4 | 0.92 | 11.02 |

Each extra hour adds 1.2 to the log-odds, which means it multiplies the odds by e^1.2, about 3.32: 1 becomes 3.32, and 3.32 becomes 11.02. The log-odds are a straight-line function of hours (+1.2 per hour), while the probability bends. That is why logistic regression is called a linear model.

::: deeper Where the sigmoid comes from
Start from the claim that the score is the log-odds: `z = ln(p / (1 - p))`. Raise e to both sides to get `p / (1 - p) = e^z`. Multiply out: `p = e^z × (1 - p)`, so `p + p × e^z = e^z`, and `p = e^z / (1 + e^z)`. Divide the top and the bottom by e^z and you get `p = 1 / (1 + e^(-z))`, the sigmoid. So the sigmoid is not an arbitrary choice: it is what you get when a linear score is read as log-odds.
:::

## The decision boundary
*Where does the model switch from one class to the other?*

A **decision boundary** is the border between the places where the model leans to one class and the places where it leans to the other. You met one for k-NN in the "k-NN lab". For logistic regression it is where p = 0.5, and that is exactly where the score is 0.

With one feature the boundary is a single point: for `z = 1.2 × hours - 3.6`, the score is 0 at 3 hours. Add a second feature, the number of practice tests, with the score `z = hours + 0.8 × tests - 5`. The boundary is now every point where `hours + 0.8 × tests = 5`, which is a straight line.

> Worked example: a student with 2 hours and 3 tests has z = 2 + 2.4 - 5 = -0.6, so p = 0.35, below the line. A student with 4 hours and 2 tests has z = 4 + 1.6 - 5 = 0.6, so p = 0.65, above it.

[[figure:probabilities-and-the-sigmoid/decision-boundary|Two features, one straight boundary. Probabilities change smoothly across it: 0.9 and 0.1 sit on parallel lines at equal distances from the middle.]]

The boundary is straight because the score is a straight-line formula in the features. Where p is 0.9 the score is about 2.2, and where it is 0.1 the score is about -2.2: the probability does not jump at the boundary, it slides.

## What comes next
*What is still missing, and where do you try it?*

Two questions are still open. First, where do the weight and the intercept come from? A model needs a way to score its probabilities against the true labels, punishing confident wrong answers hard. That score is the **log loss**, the subject of "Log loss and fitting".

Second, what do you do with a probability? A class needs a cut-off, a **threshold**. 0.5 is the usual default, but nothing forces it, and different thresholds make different mistakes. "Thresholds and decisions" shows the trade-off.

The lab at the end of this course lets you move the threshold yourself and see which examples become false positives (wrongly predicted to pass) or false negatives (wrongly predicted to fail). Before you open it, think about what happens to the number of wrong passes if you raise the threshold from 0.5 to 0.9.

::: remember
- A straight line can leave the range 0 to 1, so logistic regression passes a linear score through the sigmoid to get a probability.
- The score is the log-odds: sigmoid(0) = 0.5, and each step of 1 in the score multiplies the odds by e, about 2.72.
- The decision boundary is where the score is 0, that is, where p = 0.5. A probability is not yet a decision.
:::
