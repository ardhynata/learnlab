---
slug: text-classifier-lab
title: Text classifier lab
kind: simulator
simulator: text-lab
minutes: 25
---
::: intro
- Train a naive Bayes text classifier in the lab and name the words that drive each class from the bars.
- Predict, then check, what smoothing, training size, TF-IDF and stop words do to test accuracy.
- Read one misclassified message word by word, and tell a real gain from a lucky split.

Before you start: read "The naive Bayes classifier" and "Bag of words and TF-IDF". The first gave you the score of a class as a prior times one smoothed probability per word. The second gave you the bag of words and TF-IDF.
:::

## What the lab asks
*What do you build in this lab, and how do you know it works?*

The last two lessons gave you two halves of a text classifier: a bag of words that turns a message into counts, and naive Bayes that turns counts into a class. The Text classifier lab, titled "Naive Bayes on customer messages", puts them together so that you can take them apart.

It holds 240 short customer messages, 80 each of three classes: billing, delivery and technical problem. The messages are synthetic: the course generated them from word lists, so no real customer wrote them. 60 messages (20 per class) are held back as the **test set**. It trains on 60 of the other messages and is scored on the test set.

When the lab opens, test accuracy is 88.3% (53 of 60 messages) and training accuracy is 98.3%. Guessing a class would score 33.3%, because each class has 20 of the 60 test messages. That is the bar to beat.

The numbers in this lesson are for the English messages. With the page language set to Indonesian the lab generates Indonesian messages, so its numbers differ, and the patterns stay the same.

## Which control changes what
*Where does each control act on the way from a message to an answer?*

A message goes through five steps, and each control of the lab sits on one of them.

[[figure:text-classifier-lab/controls-map|The path from a message to an answer, with the lab's controls where they act. The clues are learned from the training messages only.]]

**Remove stop words** changes which words are kept. **Word weights** chooses what a kept word counts for: its plain count, or a TF-IDF weight. **Smoothing alpha** decides how much a word that a class never used still counts for. **Training size** and **Seed (random split)** decide which messages the clues are learned from.

Change one control at a time and watch the accuracy line. The test messages stay the same while you change training size, smoothing, weights and stop words, so those results compare fairly. A new seed picks a new test set as well, and then a number is only comparable with other numbers from the same seed.

> Key idea: every setting changes the clues the model learns, and the test set tells you whether the change helped on messages the model has not seen.

## Reading the bars
*Which words does the model treat as clues?*

The chart lists, for each class, the six words with the highest log-odds. For a word w and a class c, the log-odds is ln P(w | c) minus ln P(w | the other two classes pooled). A bar of 2.2 means e^2.2, about 9: the word takes up a share of the class's words about 9 times as large as its share of the other classes' words.

> Worked example: at the start, "have" has log-odds 2.2 for billing. The 20 billing training messages hold 393 words in all, the other 40 messages hold 315 + 350 = 665, and the vocabulary has V = 153 words. "have" occurs 5 times in billing and never elsewhere. With alpha = 1, P(have | billing) = (5 + 1) / (393 + 153) = 6 / 546 = 0.0110, and P(have | others) = (0 + 1) / (665 + 153) = 1 / 818 = 0.00122. The ratio is 8.99, and ln 8.99 = 2.20.

"have" is not a billing word. Five billing messages happened to use it, and no other training message did. The bars show how lopsided a word was in the training messages, which is not the same as how much it matters.

## Smoothing and the zero problem
*What happens to a word that one class never used?*

**Smoothing alpha** is the pretend count that the last lesson set to 1. Each probability is (count + alpha) / (class total + alpha x V). At alpha = 0 a word that a class never used has probability 0, and a message with such a word gets probability 0 for that class, whatever its other words say.

In the lab this is not rare. At alpha = 0 every one of the 60 test messages holds a word that some class never used in training. For 17 of them every class is ruled out, so all three get 33.3% and the tester shows the first class, billing. Test accuracy drops from 88.3% to 76.7% (46 of 60). With only 12 training messages it drops to 38.3% (23 of 60), barely above guessing.

[[figure:text-classifier-lab/smoothing-curve|Test accuracy against alpha, averaged over 10 random splits. The cliff is at 0, and everything above it is close.]]

Above zero, alpha matters little here. Between 0.05 and 2 the average stays at about 87% to 90% for 60 training messages. Alpha does shrink the bars: "have" falls from 2.2 to 1.6 at alpha = 2 and rises to 5.1 at alpha = 0.05.

## More training messages
*What does the model gain from more messages?*

Move **Training size** from 6 to 180. A larger size only adds messages to the smaller one, and the test set does not change. On the first split the test accuracy goes 61.7%, 65.0%, 88.3% and 95.0% at 6, 12, 60 and 180 messages, while the vocabulary grows from 58 to 98, 153 and 168 words. Training accuracy goes the other way: 100%, 100%, 98.3% and 95.0%.

[[figure:text-classifier-lab/size-curve|Training and test accuracy against training size, averaged over 10 random splits. The gap closes as the model sees more messages.]]

With 6 messages the model scores 100% on messages it has seen and about 58% on new ones, averaged over 10 splits. It has fitted its few examples, the same overfitting you met in Level 1. As messages are added, training accuracy slips, because the model can no longer fit every one, and test accuracy climbs. On average, 180 messages give 96.4% on the training set and 92.3% on the test set.

The curve flattens: past about 80 messages each extra message adds little. The remaining mistakes are the topic of "Reading one mistake" and "Many weak words".

## Counts, TF-IDF and stop words
*Does a smarter feature setting beat plain counts?*

On the first split it seems to. Counts score 53 of 60, TF-IDF 54 and **Remove stop words** 55. Other splits change the picture.

| Seed | Word counts | TF-IDF | Remove stop words |
| --- | --- | --- | --- |
| 1 | 53 | 54 | 55 |
| 2 | 50 | 53 | 53 |
| 3 | 55 | 56 | 52 |
| 4 | 56 | 55 | 56 |

Messages correct out of 60. One message is 1 / 60 = 1.7 points. Over 30 splits, stop-word removal changes the result by +0.3 messages on average (better on 14 splits, worse on 10), and TF-IDF by +0.4 (better on 13, worse on 8). That is no reliable gain on this corpus.

These settings are choices to test, as "Bag of words and TF-IDF" said. TF-IDF here is the variant from its "Other TF-IDF recipes" fold, with each message scaled to length 1. Its effect shows best in the probabilities: they get less extreme.

::: deeper Why TF-IDF makes the probabilities less extreme
With counts, a message with 19 different words adds up 19 pushes of whatever size the counts give. With TF-IDF each message's weights are scaled so their squares add up to 1, so every push is a fraction of its count-based size. The ratio between the two classes then grows far more slowly. For the message in the next section the sum of the pushes is +8.64 with counts and +0.98 with TF-IDF. The order of the classes is the same, but 99.98% becomes 62.3%.
:::

## Reading one mistake
*Why did the model get this message wrong?*

On the first split, 7 of the 60 test messages are wrong. The **Misclassified test messages** card lists them, the most confident error first, and the first one is already in the **Message tester**. Its true class is delivery, and the model says billing with 100.0%.

[[figure:text-classifier-lab/one-mistake|The most confident mistake, word by word. Bars pointing right push toward the model's answer, bars pointing left toward the true class.]]

The message holds two complaints: change an address, and a refund for a cancelled subscription. The label records only the first, but the model reads both. Five billing-topic words (still, cancelled, subscription, have, refund) push +9.8 toward billing. "address", "shipment" and "courier" push −4.2 toward delivery. Together with "received" and 10 smaller words (+0.9 and +2.1), and with the prior pushing nothing, the sum is +8.64. So billing is about e^8.64 = 5,650 times as likely as delivery.

> Watch out: 100.0% does not mean the answer is right. Naive Bayes multiplies words as if each brought new evidence, so a message that repeats one topic's words looks overwhelming.

## Many weak words
*Can a message with one complaint still be wrong?*

A second kind of mistake needs no second complaint. "Hi, I cannot login to my account today. This is the second time I am writing." is a technical problem, but the model says billing with 70.2%. The words that point to technical problem (login, cannot, today and a few others) add up to −4.9. Nine weak words (this, am, writing, my, i, second, hi, to, is) each push about 0.5 to 1.0 toward billing, +6.1 together, and the sum is +1.16 for billing. Many small pushes outvote a few big ones. Turn on **Remove stop words** and the model gets this message right, with 58.2%. With stop words off and 180 training messages it is a mistake again, so one message is a story and not a result.

## Why the lab is easier than real data
*How far can you trust these numbers on messages of your own?*

About one message in seven in this corpus holds a second complaint, and they cause most of the mistakes: with 180 training messages, 43 of the 46 mistakes over ten splits. Real messages are messier: longer, with slang and typos, with many more topics, one class far more common than another, and labels that people do not agree on. The **Real data note** under the chart says so. Expect lower accuracy and a far larger vocabulary: a test accuracy of 92% says how well the method reads clean, short, synthetic text, not how it will do on your own messages.

::: remember
- A bar is a word's log-odds for one class against the others, and it shows how lopsided the training messages were, which is not the same as importance. Smoothing alpha = 0 lets one unseen word zero a class; anything above 0 fixes that.
- More training messages close the gap between training and test accuracy. With 60 test messages one message is 1.7 points, so check TF-IDF or stop words on several splits.
- To read a mistake, read the pushes word by word: many weak words can outvote a few strong ones.
:::

@@lab

## Lab: Naive Bayes on customer messages
The lab trains a naive Bayes classifier on short synthetic customer messages of three classes (billing, delivery, technical problem) and tests it on messages it has not seen. The numbers below are for the English messages on the first split; with the page language set to Indonesian the messages and the numbers differ.

### Controls
- **Smoothing alpha** (0 to 2 in steps of 0.05, starts at 1.00) is added to every word count. At 0 a word that a class never saw gives that class probability 0.
- **Word weights** is a menu with **Word counts** (the default) and **TF-IDF**.
- **Remove stop words** is a toggle, off at the start. The stop-word list is short and holds very common words such as "the", "and", "have", "at" and "an".
- **Training size** (6 to 180 messages in steps of 6; starts at 60 messages; 180 is everything outside the test set). A larger size only adds messages to the smaller one, and the test set does not change.
- **Seed (random split)** (a whole number from 1 to 999, starts at 1) picks which messages go to the training pool and which to the test set. Another seed gives a different test set.
- **New split** adds 1 to **Seed (random split)** (after 999 it goes back to 1).
- **Quick Quiz** is the button under the **Controls** card (a round button at the bottom right on a phone): "If you set smoothing to 0, what happens to a message containing a word never seen for a class?". Pick an answer first, then set **Smoothing alpha** to 0 and check again.
- **Fullscreen** enlarges the lab. **Reset** returns every control to its start value (alpha 1.00, **Word counts**, stop words off, 60 messages, seed 1), clears the Quick Quiz answer and puts the first misclassified message back in the tester.

### Reading the screen
- The chart shows, for each class, the six words with the highest log-odds, with the class name and its number of training messages (at the start "20 training messages"). A longer bar is a stronger clue, as the caption **Log-odds (longer bar = stronger clue)** says. The legend names the three classes.
- At **Smoothing alpha** 0 in **Word counts** mode, the bar of a word seen in one class only reads "∞ · 11×": the infinity sign, then how many times the word was seen. The bars are ranked by that count, and a note under the legend explains it.
- Under the legend a note says "240 synthetic messages in English (the language of the page), 80 per class. 60 of them are held back for testing and never used for training. Switch the page language to get messages in the other language."
- **Real data note** is a closed box under the chart. It says why the messages are synthetic and how real messages differ.
- The status line reads "Test accuracy: 88.3% (53 of 60 test messages correct)." The detail line reads "Trained on 60 messages. The vocabulary has 153 different words." and adds ", stop words removed" when that toggle is on. At the right of the status box it says "60 train · 60 test".
- **Accuracy and confusion matrix** shows "Accuracy on the test messages", "Accuracy on the training messages" and "Always guessing the most common class would score 33.3%." Rows of the matrix are the true class and columns the **Predicted class**; the diagonal counts correct predictions. At the start it is billing 18, 1, 1; delivery 1, 16, 3; technical problem 1, 0, 19.
- **Message tester** has **Pick a test message** (a list of the 60 test messages) and **Message**, a box where you can type your own. Under them it says, for example, "The model says "billing" (100.0%). The true class is "delivery": a mistake.", then a bar and a percentage for each class. A tie reads "No class is favoured (all 33.3%); a tie goes to ...".
- Below that, **Why "billing" and not "delivery"?** shows one chip per word. **Pushed toward "billing" (the model's choice)** and **Pushed toward "delivery" (the true class)** hold the words with their pushes, such as "still +2.3" ("×3" before a push means the word occurs 3 times). **Neutral words (almost no push)**, **Not in the training vocabulary, so ignored** and **Stop words, removed** hold the rest. The last line gives the sum of the priors and all the pushes; a positive sum favours the model's choice.
- **Misclassified test messages** lists the wrong test messages, the most confident error first, each with "True class: delivery · Model said: billing (100.0%)". Click one to load it into the tester. A message that becomes correct leaves the list.

### Experiments
Press **Reset** before each one, so that your numbers match.

1. **Which words drive a class?** Predict: will the top words of each class all be topic words such as "refund", "parcel" and "error"? Read the chart. Some are, such as "subscription", "tracking" and "screen", but "have" (billing), "at" (delivery) and "an" (technical problem) are on the lists too. Now turn on **Remove stop words**: those three leave, the test accuracy goes from 88.3% to 91.7% (55 of 60), and the vocabulary shrinks from 153 to 125 words. Why was "have" a clue for billing at all, and what does the bar of 2.2 measure?
2. **Smoothing.** Predict: in the **Quick Quiz**, pick what happens at smoothing 0. Then drag **Smoothing alpha** to 0. The quiz answers with an example message, the bars show "∞", and the test accuracy falls to 76.7% (46 of 60). Set **Training size** to 12: 38.3% (23 of 60), and the matrix puts almost every message in the billing column. Go back to 60 messages and try **Smoothing alpha** 0.05, 1 and 2: 91.7%, 88.3% and 90.0%. Which part of the change is the zero and which is the size of alpha?
3. **How many messages?** Predict: what happens to the test accuracy and the training accuracy as **Training size** grows from 6 to 180? Try 6, 12, 60 and 180 and read the card **Accuracy and confusion matrix**. Test accuracy: 61.7%, 65.0%, 88.3% and 95.0%. Training accuracy: 100%, 100%, 98.3% and 95.0%. The vocabulary in the detail line grows from 58 to 168. Why does the training accuracy fall while the test accuracy rises?
4. **One mistake, word by word.** Predict: the first row of **Misclassified test messages** (the one that begins "Hi, please change the address on my shipment") has true class delivery. Which class do you expect the model to say, and with what probability? Click it. The model says billing with 100.0%. Read the chips: "still", "cancelled", "subscription", "have" and "refund" push toward billing, "address", "shipment" and "courier" toward delivery, and "before", "change" and "comes" are ignored. The sum is +8.64. Now set **Word weights** to **TF-IDF**: the tester says billing with 62.3%. Why is the same message less extreme?
5. **Many weak words.** Predict: click the fifth row, "Hi, I cannot login to my account today. This is the second time I am writing." The true class is technical problem and the model says billing (70.2%). Which words push toward technical problem (login, cannot, today), and are they enough? Many weak words push toward billing, and the sum is +1.16. Then turn on **Remove stop words**: the message leaves the list, and the tester says technical problem (58.2%). Then turn **Remove stop words** off again and set **Training size** to 180: the message is a mistake again (billing, 82.6%). Is one message good evidence about stop words?
6. **A fresh split.** Predict: do stop words and TF-IDF help on every split? On the first split they do, from 53 correct to 55 and 54. Press **New split** three times and each time read the accuracy with **Word counts**, **TF-IDF** and **Remove stop words** (each time switch the other one off): seed 2 gives 50, 53 and 53 correct, seed 3 gives 55, 56 and 52, seed 4 gives 56, 55 and 56. Then open **Real data note** and read it. The idea that helped on one split does not hold on the next. How many test messages is one point of accuracy worth, and what would it take to believe a gain?
