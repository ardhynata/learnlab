---
slug: naive-bayes
title: The naive Bayes classifier
kind: reading
simulator: ""
minutes: 20
---
::: intro
- Use Bayes' rule to score each class for a message, and say why the evidence term can be left out when you only compare classes.
- Explain the conditional-independence assumption, why it is "naive", and why the classifier still often works.
- Compute a multinomial naive Bayes prediction by hand with Laplace smoothing, then redo it in log probabilities.

Before you start: read "Conditional probability and Bayes' rule" and "Bag of words and TF-IDF".
:::

## Bayes' rule for classes
*How does Bayes' rule choose a class for a message?*

The last lesson turned a message into a bag of words: which words it has and how often, with the order thrown away. This lesson picks a class for such a bag. Take two classes, spam and ham (ordinary mail).

"Conditional probability and Bayes' rule" updated a prior with evidence. Here the evidence is the words of the message. For each class c:

P(c | words) = P(c) x P(words | c) / P(words)

The **prior** P(c) is how common the class is. The **likelihood** P(words | c) is how likely a message of that class is to contain these words. The last term, P(words), is the same for every class, so it cannot change which class is larger. Drop it and compare the **scores**:

score(c) = P(c) x P(words | c)

The class with the larger score wins. To turn scores into probabilities, divide each score by the sum of all the scores.

[[figure:naive-bayes/flow|Naive Bayes scores every class as its prior times one factor per word, then picks the largest score.]]

> Key idea: a classifier built on Bayes' rule does not ask "which words look spammy?". It asks "which class would more likely have produced these words?".

## The naive assumption
*What does "naive" assume, and why does it still work?*

The hard factor is P(words | c), the chance of this exact combination of words. With a vocabulary of 10,000 words there are far more possible messages than any training set holds, so you would almost never have seen the exact message before.

The **conditional-independence assumption** removes the problem. It says: once you know the class, each word appears independently of the others. Then the combination splits into one factor per word:

P(words | c) = P(w1 | c) x P(w2 | c) x ... x P(wn | c)

Each factor is one count away, as the next section shows.

The assumption is **naive** because it is false. In spam, "free" and "prize" show up together more often than chance. The model ignores that and multiplies as if each word brought new evidence.

It still often works because a decision only needs the larger score, not exact probabilities. The links between words tend to push both class scores in a similar way, so the order of the scores often survives.

> Watch out: the probabilities from naive Bayes are usually too extreme when words are linked. Trust its ranking and its choice of class more than a figure like 0.97.

## Counting words in each class
*How are the word probabilities estimated?*

The **multinomial model** treats a class as one big bag: pour in every word of every training message of that class. Then

P(w | c) = (times w appears in class c) / (total words in class c)

A word that appears twice in a message counts twice. The priors count messages: P(c) = (messages of class c) / (all messages).

Here is a made-up training set of five short messages, enough to follow with a pencil.

- Spam: "win free prize" and "free prize now".
- Ham: "meeting now", "lunch meeting" and "report now".

The vocabulary is the seven distinct words in the table. The priors are P(spam) = 2 / 5 = 0.40 and P(ham) = 3 / 5 = 0.60.

| Word | In spam | In ham |
| --- | --- | --- |
| win | 1 | 0 |
| free | 2 | 0 |
| prize | 2 | 0 |
| now | 1 | 2 |
| meeting | 0 | 2 |
| lunch | 0 | 1 |
| report | 0 | 1 |
| Total words | 6 | 6 |

From the table, P(free | spam) = 2 / 6 = 0.33 and P(now | ham) = 2 / 6 = 0.33. Several entries are 0, and that causes trouble.

## Unseen words and Laplace smoothing
*What goes wrong when a word never appeared in a class?*

Score the message "free prize report" with the raw counts. "report" never appeared in spam, so P(report | spam) = 0 / 6 = 0, and the whole spam score is 0 x anything = 0. "free" and "prize" never appeared in ham, so the ham score is 0 too. Both classes score 0, and the classifier has no answer, however strong the other words are.

One unseen word should not veto everything. **Laplace smoothing** pretends every word of the vocabulary was seen one extra time in every class:

P(w | c) = (count + 1) / (total words in c + V)

V is the number of distinct words in the vocabulary, here 7. Adding 1 to each of the V counts adds V to the total, so the probabilities of a class still add up to 1. Both totals are 6 + 7 = 13.

| Word | P(w given spam) | P(w given ham) |
| --- | --- | --- |
| win | 2 / 13 | 1 / 13 |
| free | 3 / 13 | 1 / 13 |
| prize | 3 / 13 | 1 / 13 |
| now | 2 / 13 | 3 / 13 |
| meeting | 1 / 13 | 3 / 13 |
| lunch | 1 / 13 | 2 / 13 |
| report | 1 / 13 | 2 / 13 |

[[figure:naive-bayes/smoothing|Word probabilities per class before smoothing (outlines) and after (bars). Smoothing lifts every zero and takes a little from every count.]]

Now "free prize report" scores 0.4 x 3/13 x 3/13 x 1/13 = 0.00164 for spam and 0.6 x 1/13 x 1/13 x 2/13 = 0.00055 for ham. Spam wins with 0.00164 / (0.00164 + 0.00055) = 0.75.

::: deeper Words outside the vocabulary
A word that never appeared in the training set, in either class, is not in the vocabulary. Most implementations simply skip it when scoring, because it says nothing about which class is more likely. The "+ 1" can also be another number, usually called alpha: 1 is the common start, a smaller alpha trusts the counts more, and a larger one pulls both classes toward equal word probabilities. With alpha = 0.1, P(report | spam) is 0.1 / (6 + 0.7) = 0.015, instead of 1 / 13 = 0.077.
:::

## A hand-computed example
*Which class does "free prize now" get?*

Every word of "free prize now" is in the training set. Multiply the prior and one smoothed factor per word, for each class.

> Worked example: **Spam.** 0.40 x 3/13 x 3/13 x 2/13 = 7.2 / 2197 = 0.00328.

> Worked example: **Ham.** 0.60 x 1/13 x 1/13 x 3/13 = 1.8 / 2197 = 0.00082.

The spam score is four times the ham score, because 7.2 / 1.8 = 4. Divide by the sum to get probabilities: P(spam | words) = 7.2 / (7.2 + 1.8) = 0.80, and P(ham | words) = 0.20. The classifier says spam.

[[figure:naive-bayes/scores|The two scores for "free prize now", built factor by factor, and the probabilities they give.]]

Try the message "free now meeting". Spam: 0.40 x 3/13 x 2/13 x 1/13 = 2.4 / 2197. Ham: 0.60 x 1/13 x 3/13 x 3/13 = 5.4 / 2197. Now P(spam) = 2.4 / (2.4 + 5.4) = 0.31, and ham wins. "free" pulls toward spam, but "now" and "meeting" pull harder toward ham.

## Working in log probabilities
*Why do real classifiers add logarithms instead of multiplying?*

A real message has hundreds of words, and each factor is a small fraction. Suppose 300 words each have probability about 1 / 13. The product is 13 to the power -300, about 10^-334. A 64-bit floating-point number cannot hold anything smaller than about 5 x 10^-324, so the computer stores 0. This is called underflow. Both classes collapse to 0 and there is no answer, the same trap as before.

The fix is to take logarithms. The log of a product is the sum of the logs, ln(a x b) = ln a + ln b (ln is the natural logarithm), and a larger score always has a larger log. So compare

log score(c) = ln P(c) + ln P(w1 | c) + ... + ln P(wn | c)

The tiny products become ordinary negative numbers. For "free prize now":

- Spam: ln 0.4 + ln(3/13) + ln(3/13) + ln(2/13) = -0.916 - 1.466 - 1.466 - 1.872 = -5.720.
- Ham: ln 0.6 + ln(1/13) + ln(1/13) + ln(3/13) = -0.511 - 2.565 - 2.565 - 1.466 = -7.107.

Spam's log score is higher by 1.39. That gap is the log of the ratio of the scores: e^1.39 = 4, the same 4 to 1 as before.

[[figure:naive-bayes/underflow|The product of n word probabilities of 1/13 falls below the smallest storable number near 300 words. Its logarithm is only a moderate negative number.]]

::: deeper Which words drive the decision
Write the gap as one sum: ln(prior ratio) + the sum over words of ln(P(w | spam) / P(w | ham)). For "free prize now" the pieces are the prior ln(0.4 / 0.6) = -0.405, "free" ln 3 = 1.099, "prize" ln 3 = 1.099 and "now" ln(2/3) = -0.405. They add to about 1.39. A positive piece pushes toward spam, a negative one toward ham, so the largest pieces name the words behind a prediction.
:::

## Next: the text classifier lab
*What will you check on real text?*

You now have the full recipe. Count words per class, add 1 for smoothing, multiply the prior by one factor per word (in practice, add logs), and pick the larger score.

The course ends in the "Text classifier lab". There you train a classifier like this one and inspect which words drive its predictions and mistakes. The word-by-word log-ratio pieces in "Which words drive the decision" are what show a word's push.

Before you go on, check that you can do these by hand without looking: the smoothed P(now | ham) with these counts, and the score for "meeting now" in each class. Then predict what happens to the spam score of "free prize report" if the smoothing were removed.

::: remember
- Score each class as its prior times one probability per word, then take the larger score. The evidence term is the same for every class, so it can be dropped.
- "Naive" means words are assumed independent given the class. That is false, so the probabilities are overconfident, but the choice of class often still works.
- Laplace smoothing keeps one unseen word from zeroing a class, and adding logs keeps long messages from underflowing to 0.
:::
