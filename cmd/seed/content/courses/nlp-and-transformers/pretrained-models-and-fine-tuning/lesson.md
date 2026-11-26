---
slug: pretrained-models-and-fine-tuning
title: Pretrained models and fine-tuning
kind: reading
simulator: ""
minutes: 25
---
::: intro
- Explain how next-token and masked prediction turn unlabeled text into a training signal, and compute the loss of a counting model by hand.
- Compare a frozen pretrained code with a bag-of-words baseline as the number of labeled messages grows, and say when each one wins.
- Score a text classifier with accuracy and F1, and test it fairly: same rows, a Level 2 baseline, near-duplicate leakage, another domain and the usual failure modes.

Before you start: read "Tokenization and attention" (the previous lesson, which built the tokens and vectors a pretrained model learns), "Transfer learning and self-supervision" in the Representation learning course (pretext tasks, frozen against fine-tuned) and "The naive Bayes classifier" in the Naive Bayes and text classification course (the baseline you will compete against). This lesson adds what is specific to text.
:::

## Learning from text nobody labeled
*How can a model learn from text that nobody labeled?*

Raw text is cheap and labels are not: there is far more text than anyone could tag with a topic or a mood. **Pretraining** turns raw text into a training signal by hiding part of it and asking the model to predict that part. Two versions are common.

**Next-token prediction.** Show the model the tokens so far and ask for the next one. The true next token is already in the text, so it is the label.

**Masked prediction.** Replace some tokens with a blank, written `[MASK]`, and ask the model to fill it in from the words on both sides.

These are the pretext tasks of "Transfer learning and self-supervision", with the token of "Tokenization and attention" as the unit. The predictions are not the goal. To predict well, the transformer has to build vectors that capture which words go together and what a word means in its sentence. Those vectors are what you reuse for other tasks, a classifier among them.

## Prediction by counting
*What does a next-token loss look like with a pencil?*

A real model is a transformer with millions of weights, but its job fits in a table of counts. Take six short messages. The vocabulary is 11 words: my, order, is, late, wrong, parcel, invoice, the, has, not, arrived.

| # | Message |
| --- | --- |
| 1 | my order is late |
| 2 | my order is wrong |
| 3 | my parcel is late |
| 4 | my invoice is wrong |
| 5 | the order is late |
| 6 | my order has not arrived |

> Worked example: **Next token.** After "is" the text continues with late three times (messages 1, 3 and 5) and with wrong twice (2 and 4). The counting model says P(late) = 3 / 5 = 0.6 and P(wrong) = 2 / 5 = 0.4. The loss at one position is minus the natural log of the probability given to the true token: for late it is -ln 0.6 = 0.51, and for wrong -ln 0.4 = 0.92. Over the five positions after "is" the average is (3 x 0.51 + 2 x 0.92) / 5 = 0.67. A model that knew nothing and gave each of the 11 words the same chance would score ln 11 = 2.40.

> Worked example: **Masked.** For "[MASK] is late", messages 1, 3 and 5 fill the blank with order, parcel and order, so P(order) = 2 / 3 = 0.67 and P(parcel) = 1 / 3 = 0.33.

[[figure:pretrained-models-and-fine-tuning/pretraining-tasks|Two pretext tasks on the six messages. The bars are the counting model's probabilities for the hidden word.]]

A transformer replaces the table, and it can answer for sentences it has never seen. The loss stays the same: the average of minus ln of the probability given to the true token. A lower loss means better guesses about text, and nothing more. Whether the vectors help a classifier is a separate question, tested below.

## Frozen or fine-tuned
*Once the model is pretrained, how do you use it on your own task?*

Both routes start from the pretrained **encoder**, the part that turns a message into a vector. You add a small **head**, a classifier that turns that vector into your classes.

**Frozen.** The encoder's weights are locked. Each message goes through it once, and only the head learns from your labels. Suppose an encoder with about 100 million weights that returns 768 numbers per message, and 3 classes. The head has 768 x 3 + 3 = 2,307 numbers (weights and biases), and those are all the labels have to fit.

**Fine-tuned.** The labels adjust the encoder too, so about 100 million numbers can move, plus the head's 2,307. That freedom lets the model bend toward your task and also lets it overfit a small labeled set. Fine-tuning is usually done with a small learning rate, for few epochs and with a validation set that decides when to stop.

[[figure:pretrained-models-and-fine-tuning/frozen-or-fine-tuned|The same pretrained encoder, used two ways. Frozen trains only the head, and fine-tuning trains both. The sizes are an example.]]

> Key idea: the more numbers your labels may change, the more labeled messages you need to trust the result. Start frozen, and fine-tune only when it beats the frozen version on messages held out from training.

## A small pretrained code
*What does a pretrained code look like at lesson size?*

A transformer is too big to train inside a lesson, so this one uses a small stand-in. In this lesson a "pretrained code" is 8 numbers for each of 155 words, learned from 600 unlabeled English customer messages by counting which words appear near each other. A message is the average of its word codes, and the head gives a message to the class whose average code is nearest. That is the frozen route: the 155 x 8 = 1,240 code numbers stay put, and the labels fit only 3 x 8 = 24 class-average numbers. Fine-tuning, which would let all 1,264 move, is not tested here.

::: deeper How the small code is built
Keep the words that occur at least twice in the 600 messages: 155 words. For every pair of words, count how often they sit within 3 places of each other, and turn the counts into positive pointwise mutual information: ln(count x total / (row total x column total)), with negative values set to 0. This asks how much more often two words meet than chance predicts. Take the 8 strongest directions of that table with an eigendecomposition, the step of PCA from Level 2, and scale each by the square root of its eigenvalue. Row i is the code of word i. Words outside the 155 are skipped. Like masked prediction, it learns from which words appear near which, without any label. Courier and driver end up with a cosine similarity of 0.997.
:::

## Against a baseline
*Does pretraining help when only a few messages are labeled?*

The baseline is bag-of-words naive Bayes, trained on the same labeled messages. The messages are the synthetic billing, delivery and technical problem messages of the Text classifier lab. Each point averages 100 draws of the labeled set, scored on the same test messages.

[[figure:pretrained-models-and-fine-tuning/few-labels|Test accuracy against the number of labeled messages per class, averaged over 100 draws. Guessing scores about 33%.]]

With 3 labeled messages per class the frozen code scores 74.7% and naive Bayes 64.9%. At 10 per class they tie (80.9% against 81.7%), and at 40 naive Bayes leads, 89.8% to 82.6%. The code puts words used alike close together, so a labeled "driver" message also helps with "courier". With more labels, naive Bayes learns those words itself, while the frozen head stays limited to 24 numbers.

## Scoring a text classifier
*Which numbers should you report, and what do they hide?*

Accuracy is the share of messages classified correctly. **F1** for one class is the harmonic mean of its precision and recall, which "Confusion matrix and rates" defined: F1 = 2 TP / (2 TP + FP + FN). **Macro-F1** averages the F1 of the classes.

Take one draw of the labeled set, 3 messages per class, with the frozen code. It is scored on 202 test messages, and the rows are the true class.

| True \ Predicted | Billing | Delivery | Technical |
| --- | --- | --- | --- |
| Billing | 63 | 1 | 4 |
| Delivery | 18 | 48 | 1 |
| Technical | 14 | 8 | 45 |

> Worked example: accuracy = (63 + 48 + 45) / 202 = 156 / 202 = 0.772. For billing, TP = 63, FP = 18 + 14 = 32 (other messages called billing) and FN = 1 + 4 = 5. Precision = 63 / 95 = 0.663, recall = 63 / 68 = 0.926, and F1 = 126 / (126 + 32 + 5) = 126 / 163 = 0.773. Delivery and technical give 0.774 and 0.769, so macro-F1 = 0.772.

Naive Bayes on the same 9 messages scored 132 / 202 = 0.654. These are one draw. The 100-draw averages are 74.7% and 64.9%, with a spread (standard deviation) of 5.6 and 5.1 points.

> Watch out: accuracy and macro-F1 agree here because the three classes are about equal. With 1,000 messages of which 20 are urgent, a model that always says "not urgent" gets 98% accuracy and an F1 of 0 for urgent.

## A fair test for text
*What must hold before a text score means anything?*

- **Beat the baseline, on the same rows.** Give the bag-of-words baseline from Level 2 the same labeled messages and test messages as the pretrained model. A pretrained model that cannot beat naive Bayes at your label count is not worth its cost.
- **Many draws.** One draw gave 77.2% for the frozen code and the average is 74.7%. Report the average and the spread.
- **No near-copies.** Customer text is full of forwarded, quoted and template messages. If a test message has a near-copy in the training text or the pretraining text, a model can look the answer up. Measure the overlap of words: the words in both messages divided by the words in either. 97 of the 300 test messages shared at least 0.8 of their words with a message in the pretraining pool. They were removed, and so were those close to a labeled message, leaving about 195 to 203. Every number in this lesson is on those. Keeping them would have raised a score by up to 2.8 points.
- **Another domain.** Test on text from a domain the model was not built from before you trust it there. The next section does.

::: deeper Near-duplicates: random split against grouped split
Take 900 messages, 300 per class. In a random 70/30 split, 29.2% of the test messages had a near-copy (0.8 of their words in common) in the training set. A grouped split keeps every group of linked messages on one side, as in "Grouped and temporal splits": here 670 groups, the largest with 20 messages. Over 200 splits, a 1-nearest-neighbor lookup on word counts scored 92.8% on random splits and 91.6% on grouped splits, and naive Bayes 93.7% and 93.6%. The gap is small because these messages are simple and a model that generalizes gains little from copies. A large gap shows up only for models that memorize.
:::

## Limits and failure modes
*Where does a pretrained model quietly go wrong?*

- **Domain mismatch.** A code built from the wrong text is built for the wrong world. A code learned from Indonesian messages shares only 9 of the 173 word types in the English test messages. With 3 labeled messages per class it scores 48.4%, against 74.7% for the English code and about 33% for guessing, and with 40 it reaches only 55.8%. This is the extreme case. A milder mismatch, such as legal text against chat messages, fails more quietly.
- **Spurious cues.** A model may lean on a cue that tracked the label in your labeled messages and will not in the future, such as a signature line or a template phrase. Look at which words drive predictions, as the Text classifier lab does, and test on messages where the cue is absent.
- **Long inputs.** A model reads a fixed number of tokens at most. Suppose the limit is 512 and a review has 900 tokens: the model sees 512 / 900 = 57% of it, and a verdict in the last sentence is cut off. Attention also compares every pair of tokens, so doubling the length quadruples the pairs.

> Watch out: a pretrained model gives no warning when it is out of its depth. You find out through the tests above, not from its confidence.

## Where this goes next
*What do you take into the Attention lab?*

You now have the whole path of this course: text becomes tokens and vectors, attention lets the vectors mix, pretraining learns the weights from unlabeled text, and a head or fine-tuning aims them at your task. The habit that matters most is the one from the Representation learning course, now in words: a pretrained model counts only after it beats the plain baseline on the same rows, over many draws, on text it did not see in pretraining.

The Attention lab ends this course. You trace attention in a small model, then compare a pretrained text model with the Level 2 bag-of-words baseline. Use the checks of this lesson there: same rows, the spread beside the average, and a look for near-copies and for another domain.

::: remember
- Pretraining learns from unlabeled text by predicting the next token or a masked one. The loss is the average of minus ln of the probability given to the true token.
- A pretrained encoder is reused frozen (only the head learns) or fine-tuned (everything learns). Fewer trained numbers is safer with few labels: the small frozen code won at 3 labeled messages per class and tied at 10, and naive Bayes won at 40.
- Judge a text model with accuracy and F1 against a bag-of-words baseline on the same rows, over many draws, with near-copies removed and another domain tried. Watch for domain mismatch, spurious cues and long inputs.
:::
