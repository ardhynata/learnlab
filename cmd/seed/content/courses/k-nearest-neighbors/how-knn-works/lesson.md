---
slug: how-knn-works
title: How k-NN decides
kind: reading
simulator: ''
minutes: 12
---
::: intro
- Explain how k-NN labels a new example by a vote of its k nearest labelled examples.
- Run a k-NN vote by hand on real penguins, and see how the answer changes with k.
- Describe the decision boundary k-NN draws, and name its strengths and weaknesses.

Before you start: read "Data, features and labels" and "Supervised, unsupervised and the three questions".
:::

## Asking the neighbors
*How can a model decide when it has learned nothing in advance?*

Imagine you arrive in a town where you know nobody, and you want to know whether a restaurant is any good. You would not work out a theory of cooking. You would ask the people who live nearest and go with the answer most of them give.

**k-nearest neighbors (k-NN)** classifies a new example in the same way. It keeps a collection of examples whose answers are already known, finds the k examples that are most like the new one, and lets them vote. The number **k** is how many neighbors get a vote.

In "Supervised, unsupervised and the three questions" you met classification: the target is a class, a name from a fixed list. k-NN is **supervised**, because every stored example is a row of features plus a label, and the labels are what the neighbors vote with. Our example is a penguin whose species we want to name from two measurements: bill length and bill depth, both in millimeters.

## The four steps
*What does k-NN do when a new example arrives?*

1. **Store** the labelled examples. That is all the training there is.
2. **Measure** how far the new example, called the **query**, is from every stored example.
3. **Pick** the k closest ones. These are its neighbors.
4. **Vote.** Count the labels among the neighbors. The label with the most votes is the answer.

With two features, every example is a point on a plot, and "close" means close on the plot. In this lesson, distance is the ordinary straight-line distance, called **Euclidean** distance: if two points differ by *dx* across and *dy* up, the distance is the square root of (dx² + dy²). The lesson "Distance and similarity" compares it with other ways to measure a gap.

> Key idea: k-NN is a **lazy learner**. Nothing is fitted ahead of time. The labelled data is the model, and all the work happens when a query arrives. That is why step 2 matters so much: it is repeated for every stored example, for every query.

## A worked example with real penguins
*What does one vote look like, with real numbers?*

The penguin data has 219 Adelie and Chinstrap penguins with both bill measurements. We hold one Adelie back as the query, with a bill 44.1 mm long and 18.0 mm deep, and pretend we do not know its species. The other 218 are the stored examples: 150 Adelie and 68 Chinstrap. These are its seven nearest stored penguins:

| Rank | Species | Bill length (mm) | Bill depth (mm) | Distance |
| --- | --- | --- | --- | --- |
| 1 | Chinstrap | 43.5 | 18.1 | 0.61 |
| 2 | Adelie | 43.2 | 18.5 | 1.03 |
| 3 | Chinstrap | 45.2 | 17.8 | 1.12 |
| 4 | Adelie | 42.9 | 17.6 | 1.26 |
| 5 | Adelie | 43.2 | 19.0 | 1.35 |
| 6 | Adelie | 42.8 | 18.5 | 1.39 |
| 7 | Adelie | 42.7 | 18.3 | 1.43 |

> Worked example: for rank 1, the gaps are 43.5 - 44.1 = -0.6 across and 18.1 - 18.0 = 0.1 up. The distance is the square root of (0.36 + 0.01) = the square root of 0.37 = 0.61. For rank 2, the gaps are -0.9 and 0.5, so the distance is the square root of (0.81 + 0.25) = the square root of 1.06 = 1.03.

[[figure:how-knn-works/penguin-neighbors|Left: all 218 stored penguins, with the new one as a diamond. Right: a zoom around it, with the same scale on both axes, so each dashed ring is a true distance.]]

## The vote depends on k
*What changes when you ask more neighbors?*

Now vote, reading down the table. With **k = 1**, only penguin 1 votes: Chinstrap. With **k = 3**, the votes are Chinstrap, Adelie, Chinstrap: Chinstrap wins, 2 to 1. With **k = 5**, they are Chinstrap, Adelie, Chinstrap, Adelie, Adelie: Adelie wins, 3 to 2. With **k = 7**, Adelie wins 5 to 2.

[[figure:how-knn-works/vote-by-k|The same new penguin at k = 1 to 7. Each dot is one neighbor, numbered by rank. The answer flips from Chinstrap to Adelie between k = 4 and k = 5.]]

The penguin we held back is an Adelie, so k = 5 and k = 7 are right and k = 1 and k = 3 are wrong. Do not read that as "bigger k is better": this is one penguin. For the same query every k from 5 to 13 says Adelie, but at k = 15 the vote is Chinstrap 8, Adelie 7. Choosing k well needs many test penguins, and "Tuning k" shows how.

**Ties.** With k = 2 the vote is 1 to 1, and with k = 4 it is 2 to 2. Here a tie goes to the class of the closest neighbor, the Chinstrap at rank 1. With two classes, an odd k avoids ties.

> Key idea: the answer is a function of k. A small k trusts the few closest points, noise included. A large k averages over a wider area and can swamp the closest points.

## From one answer to a map
*What does k-NN look like across the whole plot?*

So far we asked one question, at one place. Ask it at every place on the plot and color each place by the answer it would get. The border between the colors is the **decision boundary**.

[[figure:how-knn-works/decision-map|The answer k-NN would give at each position, for k = 1 and k = 9. The diamond is the new penguin, colored by its own answer.]]

With k = 1, each stored penguin claims the patch of plot that is closer to it than to any other stored penguin, so the border is jagged and bends around single points, including odd ones. With k = 9, one odd point cannot win alone, so the border is smoother. The diamond sits close to the border: at k = 1 the map says Chinstrap there, and at k = 9 it says Adelie (6 votes to 3), the same flip as in the vote above.

Nobody wrote a formula for this border. It comes straight from where the labelled points are, so k-NN can follow curved or broken borders that a straight line could not. The k-NN lab at the end of this course lets you watch these regions change as you move the query and change k.

## What "nearest" depends on
*Why do the features need to be measured on a similar scale?*

"Nearest" depends on which features you use and in what units. Bill length and bill depth are both in millimeters and both vary by a few millimeters, so both count. Now add a third feature, body mass in grams. Our query weighs 4000 g. Penguin 1, the Chinstrap, weighs 3400 g, and penguin 2, the Adelie, weighs 4100 g.

With the bills alone, penguin 1 is nearer: 0.61 against 1.03. With mass added, penguin 1 is the square root of (0.6² + 0.1² + 600²) = 600.00 away, and penguin 2 is the square root of (0.9² + 0.5² + 100²) = 100.01 away. Penguin 2 is now the nearer one. The bill gaps, under a millimeter, vanish next to a gap of hundreds of grams, so body mass alone is deciding who is nearest.

> Watch out: a feature measured in big numbers can drown out the others without being any more useful. The fix is **scaling**: rewriting every feature on a comparable scale before measuring distance. "Distance and similarity" names the same problem for other distances, and the lesson "Scaling and encoding" later in the program covers the fix.

::: deeper Closer neighbors can count for more
Instead of one vote each, give each neighbor a weight of 1 divided by its distance, so closer neighbors count for more. At k = 5, the two Chinstrap neighbors (ranks 1 and 3) weigh 1/0.61 + 1/1.12 = 1.644 + 0.894 = 2.538. The three Adelie neighbors (ranks 2, 4 and 5) weigh 0.971 + 0.791 + 0.743 = 2.505. Chinstrap now wins by a hair, although the plain vote gave Adelie 3 to 2. Weighting is a different rule, not a free improvement: it changes the answer here, and only tests on many penguins can say whether it helps.
:::

::: deeper k-NN for numbers (regression)
k-NN also predicts numbers: take the average of the neighbors' values. For the query's body mass, the three nearest penguins weigh 3400, 4100 and 3950 g, so the prediction is (3400 + 3950 + 4100) / 3 = 3817 g. The real penguin weighs 4000 g. As with classification, the prediction depends on k and on the distance.
:::

## Strengths and weaknesses
*When is k-NN a good choice, and where do you try it?*

Strengths:
- **Nothing to train.** New labelled examples can be added at once.
- **Easy to explain.** You can point at the neighbors that voted.
- **No assumed border.** The boundary follows the data, whatever its shape.

Weaknesses:
- **Slow predictions.** Each query is compared with every stored example.
- **Memory.** All the labelled data must be kept.
- **Many features.** As features pile up, points spread out until almost everything is about equally far away, and "nearest" loses its meaning (the curse of dimensionality).
- **Irrelevant features and unbalanced classes.** A useless feature adds noise to every distance, and a big class can outvote nearer, rarer ones when k is large.

Next come "Tuning k" and "Distance and similarity". Then the **k-NN lab** lets you drag a query point, change k, and watch the neighbors, the vote and the regions respond.

::: remember
- k-NN labels a query by a vote of its k nearest labelled examples. There is no training, and the stored data is the model.
- The answer depends on k, on how distance is measured and on whether the features share a scale. Even a tie needs a rule.
- Its border follows the data, which makes it flexible and easy to explain, but slow and fragile with many or badly scaled features.
:::
