---
slug: permutation-importance-and-shap
title: Permutation importance and SHAP
kind: reading
simulator: ""
minutes: 25
---
::: intro
- Measure a permutation importance by shuffling one feature and scoring again, and say why correlated features can fool it.
- Compute exact Shapley values for three features by hand, averaging over every order in which the features can join.
- Tell a local explanation from a global one, and say what an explanation of a model does not tell you about the world.

Before you start: read "Subgroup metrics and fairness" in this course, "Probabilities and the sigmoid" and "Log loss and fitting" in the Logistic regression course, and "Bagging and random forests" in the Tree ensembles course.
:::

## One model to explain
*What are we explaining, and what two questions can we ask about it?*

A trained model is a rule that turns features into a prediction. An explanation tries to say what that rule does. This lesson explains one model, a logistic regression that gives the probability that a penguin is male from three measurements: flipper length (mm), body mass (g) and bill depth (mm).

It uses the same cut as "Bagging and random forests": the 333 penguins with every measurement and a recorded sex, split into 200 training and 67 validation penguins. The model scores 61 of 67 right on the validation penguins, 91.0%. Its weights, on standardized features (each measurement rescaled to a mean of 0 and a spread of 1, so the weights can be compared), are -0.20 for flipper length, 4.51 for body mass and 3.84 for bill depth.

Two questions come up again and again. A **global** question is about the whole model: which features does it lean on? A **local** question is about one prediction: why did it give this penguin this probability? Permutation importance answers the first. Shapley values answer the second, and averaged over many penguins they answer the first as well.

Keep one fact in mind for later: across the 333 penguins, flipper length and body mass move together (r = 0.87, where 1 means they rise together perfectly and 0 means no link).

## Shuffle one feature
*How do you measure a feature by breaking it?*

**Permutation importance** asks how much the score falls when one feature stops carrying information. Score the model on the validation penguins. Then shuffle one feature's column, so that each penguin receives another penguin's value. The values themselves are unchanged, but they no longer belong to the right penguin. Score again. The drop in the score is the importance of that feature.

> Worked example: take six validation penguins that the model gets right. Shift the bill depth column by one place, so each penguin gets the depth of the next row and the last gets the first.

| Sex | Body mass (g) | Bill depth (mm) | P(male) | Depth after shuffle | P(male) after | Right after? |
| --- | --- | --- | --- | --- | --- | --- |
| female | 4850 | 14.3 | 0.12 | 16.5 | 0.91 | no |
| male | 5250 | 16.5 | 0.99 | 16.3 | 0.98 | yes |
| male | 6000 | 16.3 | 1.00 | 15.0 | 1.00 | yes |
| female | 4700 | 15.0 | 0.19 | 13.7 | 0.02 | yes |
| female | 4300 | 13.7 | 0.00 | 18.8 | 0.98 | no |
| male | 4600 | 18.8 | 1.00 | 14.3 | 0.05 | no |

Six right before, three right after: a drop of 3 of 6 for this one shuffle. (The model also sees each penguin's flipper length, which the table leaves out.) One shuffle of six penguins is a toy. The real procedure shuffles the 67 validation penguins many times and averages, because any single shuffle is partly luck.

## Reading the scores
*What did 30 shuffles say about the three features?*

For each feature, 30 shuffles. The table gives the mean drop in penguins right out of 67, and the lowest and highest single drop.

| Feature shuffled | Mean drop (penguins) | Lowest to highest | Drop in points |
| --- | --- | --- | --- |
| Bill depth | 25.3 | 20 to 33 | 37.8 |
| Body mass | 16.8 | 10 to 25 | 25.0 |
| Flipper length | 1.0 | 0 to 2 | 1.5 |

[[figure:permutation-importance-and-shap/permutation|Permutation importance of the three features: the mean drop in validation penguins right out of 67 over 30 shuffles, with the range of single shuffles as a line.]]

Bill depth matters most to this model, body mass comes second, and flipper length hardly matters at all. The ranges show how much one shuffle can mislead: a single shuffle of body mass cost anywhere from 10 to 25 penguins.

Always score on held-out penguins. On the training penguins a model may have memorized noise, and that noise would show up as importance.

::: deeper Scoring with log loss
Accuracy is coarse here: one penguin is 1.5 points. Log loss reacts to how confident each prediction is. On the same shuffles, the validation log loss starts at 0.241 and rises by 0.011 (flipper length), 1.201 (body mass) and 1.930 (bill depth). The ranking is the same, but the faint effect of flipper length is easier to see. Pick the score that matches how the model will be judged, and use the same one for every feature.
:::

## When features move together
*Why does a feature look useless when another one says the same thing?*

Flipper length scored 1.0 of 67: it looks like a feature the model could drop. Now retrain the model without body mass, using only flipper length and bill depth. It gets 59 of 67 right (88.1%), and shuffling flipper length now costs 13.6 of 67 (20.3 points).

[[figure:permutation-importance-and-shap/correlated|Left: flipper length and body mass for the 333 penguins, r = 0.87. Right: the importance of flipper length in the model with body mass and in the model without it.]]

Same penguins, same feature, importance 1.0 in one model and 13.6 in the other. In the first model the fit put nearly all the weight on body mass, which carries the same size information. Shuffle flipper length there and the model still has body mass to lean on. The two measures share the credit, and how it is shared depends on what the model happened to pick.

There is a second problem. Shuffling breaks the link between flipper length and body mass too, and it can build penguins that do not exist. In the table above, a Gentoo penguin received an 18.8 mm bill depth that came from an Adelie; no Gentoo in the data has a bill deeper than 17.3 mm.

> Watch out: a low permutation importance means "this model does not need this feature, given the others". It does not mean the feature is unrelated to the answer.

## Shapley values in words
*How do you split one prediction fairly among the features?*

Permutation importance gives one number per feature for the whole model. To explain a single prediction, SHAP borrows an idea from cooperative game theory, the **Shapley value**. The features are players, and the prediction is the prize to be shared.

Picture the features joining one at a time. When a feature joins, the prediction moves, and that move is its contribution. But the move depends on who joined before: if two features carry the same information, whichever joins first collects the credit. So no single order is fair. The fair share is the average of a feature's contributions over every order in which the features can join. With three features there are 6 orders.

## What the model knows
*How can a model predict when some features are unknown?*

The contributions need a prediction for every subset of features, but the model always wants all three. So set the known features to this penguin's values and fill in the others from a training penguin, then average over all 200 training penguins. Call this v(S) for a set S of known features. With none known, v is the average prediction, the **baseline**. With all known, it is this penguin's prediction.

Shapley values add up: baseline plus all the values equals the prediction. A feature that never changes anything gets 0, and two features that act alike get the same value.

## Three features, by hand
*What does the whole calculation look like for one penguin?*

Take validation penguin 16, a male Adelie with flipper length 180 mm, body mass 3600 g and bill depth 18.7 mm. The model says 0.535. The table lists v(S) for all 8 sets of known features.

| Known features | v(S) |
| --- | --- |
| none | 0.505 |
| flipper | 0.522 |
| mass | 0.269 |
| depth | 0.705 |
| flipper and mass | 0.284 |
| flipper and depth | 0.718 |
| mass and depth | 0.465 |
| all three | 0.535 |

> Worked example: in the order flipper, mass, depth, flipper contributes 0.522 - 0.505 = 0.017, mass contributes 0.284 - 0.522 = -0.238, and depth contributes 0.535 - 0.284 = 0.251. The three steps add up to 0.535 - 0.505 = 0.030. Do the same for all 6 orders.

| Order | Flipper | Mass | Depth |
| --- | --- | --- | --- |
| flipper, mass, depth | 0.017 | -0.238 | 0.251 |
| flipper, depth, mass | 0.017 | -0.183 | 0.196 |
| mass, flipper, depth | 0.015 | -0.236 | 0.251 |
| mass, depth, flipper | 0.070 | -0.236 | 0.196 |
| depth, flipper, mass | 0.013 | -0.183 | 0.200 |
| depth, mass, flipper | 0.070 | -0.240 | 0.200 |
| Sum of the six | 0.202 | -1.316 | 1.294 |
| Shapley value (sum / 6) | 0.034 | -0.219 | 0.216 |

[[figure:permutation-importance-and-shap/orders|The six contributions of each feature for penguin 16, one dot per order, and their average, the Shapley value, as a diamond.]]

The checks: (0.202 - 1.316 + 1.294) / 6 = 0.180 / 6 = 0.030, which is 0.535 - 0.505. The same feature moved the prediction by 0.013 in one order and by 0.070 in another, because the sigmoid, which squeezes a score into a probability, bends the scale: equal steps in the score give unequal steps in probability. Mass pulls toward female (3600 g is light for this data, whose training mean is about 4170 g) and depth pulls toward male. They nearly cancel.

::: deeper The same average with weights
Instead of listing orders, you can weight each step by how many orders contain it. For flipper length: 1/3 of the orders put it first, 1/6 put it after mass only, 1/6 after depth only, and 1/3 last. So the value is (0.017 x 2 + 0.015 + 0.013 + 0.070 x 2) / 6 = 0.202 / 6, the same sum as in the table. With n features there are n! orders and 2^n sets, so exact values get expensive quickly: 3 features need 8 sets, 20 features need more than a million. Libraries use shortcuts built for particular model types, or estimate the average from a sample of orders.
:::

## Local and global
*When does an explanation describe one penguin, and when the whole model?*

The three numbers above are a **local** explanation: they say why this model gave penguin 16 the probability 0.535. Another penguin gets different numbers. Validation penguin 261, a female Gentoo with flipper length 215 mm, body mass 4850 g and bill depth 14.3 mm, gets 0.124 from the model. Her values are -0.014 for flipper length, 0.138 for body mass and -0.505 for bill depth, and 0.505 - 0.014 + 0.138 - 0.505 = 0.124. Her mass pushes toward male, where for penguin 16 it pushed toward female, and her shallow bill pushes hard toward female.

A **global** explanation sums up many local ones. Averaging the size of the Shapley values (ignoring sign) over the 67 validation penguins gives 0.010 for flipper length, 0.256 for body mass and 0.275 for bill depth. The ranking agrees with the permutation importance: bill depth, then body mass, then flipper length far behind. The scales do not agree, because one is a change in probability and the other a drop in penguins right.

[[figure:permutation-importance-and-shap/local-global|Shapley values for two penguins, and the average size of the values over the 67 validation penguins. Right of zero pushes toward male, left toward female.]]

> Key idea: a global number hides direction. Body mass pushes some penguins up and others down, and the average size says only how hard it pushes.

## What an explanation does not say
*Is an explanation about the penguins or about the model?*

Everything so far describes this model. It does not describe penguins.

- **It is not a cause.** Sex affects size, not the reverse; the model predicts sex from size. A Shapley value says what moved the prediction, not what would happen if you made a penguin heavier.
- **It depends on the model.** The same penguins gave flipper length 1.0 in one model and 13.6 in another. Both numbers are right about their model.
- **It shows what the model took from the data, including stand-ins.** Within each species males have deeper bills: Adelie 17.6 mm for females and 19.1 for males, Gentoo 14.2 and 15.7. But a Gentoo of either sex has a shallower bill than an Adelie. One rule fitted to all penguins therefore reads a shallow bill as female. A male Gentoo (flipper length 213 mm, body mass 5850 g, bill depth 14.6 mm) gets 0.652 from body mass and -0.166 from bill depth.

The last point is a finding about the model, and it sends you back to the subgroup metrics: an explanation that looks reasonable overall can hide a group the model treats differently.

> Watch out: a high importance does not make a feature fair, causal or safe to use. It only says the model relies on it.

## On to the audit lab
*What do you take into the next lesson?*

The course ends with the Audit lab. There you audit a model's errors by subgroup and see how correlated features change importance estimates. You now have the pieces for both halves: the subgroup metrics from the first lesson, and the two explanation tools from this one.

Before you read any importance number in the lab, ask three questions. Was it computed on held-out data? Is there a correlated feature that could be sharing the credit, and what happens to the number if you remove it? Is the claim about the model, or are you sliding into a claim about the world? Predict the ranking before you look, then check the prediction against the result.

::: remember
- Permutation importance is the drop in the validation score when one feature is shuffled. Repeat and average. A feature that is correlated with another can look unimportant because the model leans on its twin.
- A Shapley value is a feature's contribution to one prediction, averaged over every order in which the features can join. Baseline plus the values equals the prediction.
- Local explanations are about one prediction, global ones sum up many. Both describe the model, not the world.
:::
