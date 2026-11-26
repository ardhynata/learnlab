---
slug: attention-lab
title: Attention lab
kind: simulator
simulator: attention-lab
minutes: 30
---
::: intro
- Trace one token through a row of attention weights, and say which tokens it mixes in and why.
- Predict how a head, the position codes, the causal mask and the tokenizer change the weights, then check each one in the lab.
- Compare bag-of-words naive Bayes with frozen and fine-tuned pretrained vectors at a chosen number of labelled messages, over several draws.

Before you start: read "Tokenization and attention" and "Pretrained models and fine-tuning" (the other two lessons of this course), and "Text classifier lab" in the Naive Bayes and text classification course, whose generated customer messages and bag-of-words baseline come back in Part 2.
:::

## Two parts in one lab
*What does the Attention lab let you do?*

The first lesson computed attention for three tokens with a pencil. The Attention lab does the same arithmetic for a whole sentence and draws the result, in two parts with their own controls.

**Part 1** traces attention inside one small layer. You pick a sentence, a tokenizer and one of four heads. The heatmap shows every row of weights at once: row i is the token that looks, and each column is a token it looks at. Click a row to trace it.

**Part 2** compares three text models on generated customer messages: bag of words with naive Bayes, frozen pretrained vectors with logistic regression, and those vectors fine-tuned. You choose how many messages are labelled and read the scores on 180 test messages.

The lab writes its sentences and messages in the language of the page, so its numbers differ between the English and the Indonesian version. The table at the end of the lab guide lists both; this lesson quotes the English lab.

> Watch out: everything here is generated or written for the course. The word vectors of Part 1 and the four heads are set by hand, and the pretrained vectors of Part 2 are learned in the page from generated messages with their labels thrown away. A real model learns from far more real text. There is no real dataset and no Real data switch.

## Scoring two tokens
*How does attention decide how much one token looks at another?*

Take one row of the heatmap. The token that looks, the **query**, is scored against every token of the sentence, each one a **key**. Inside the lab each word has a small hand-set vector. For Head 1 only three of its numbers matter: how animal-like, thing-like and action-like the word is. "cat" is (2.0, 0.0, 0.1), "the" is (0.3, 0.3, 0.3) and "sat" is (0.1, 0.2, 1.8). As in the first lesson, the score of two tokens is the dot product of their numbers divided by the square root of 3, which is 1.73. (The lab also adds a position code, left out here.)

> Worked example: **cat looks at cat.** 2.0 × 2.0 + 0.0 × 0.0 + 0.1 × 0.1 = 4.01, and 4.01 / 1.73 = 2.32. **cat looks at the.** 2.0 × 0.3 + 0.0 × 0.3 + 0.1 × 0.3 = 0.63, and 0.63 / 1.73 = 0.36. **cat looks at sat.** 2.0 × 0.1 + 0.0 × 0.2 + 0.1 × 1.8 = 0.38, and 0.38 / 1.73 = 0.22.

Words come in two kinds. **Content words** (cat, sat, mat) carry meaning, and **function words** (the, on) mostly glue a sentence together. A content word scores high against itself and words like it. A function word has a vague vector, in the middle of everything, so it scores about the same against all.

## From scores to a row
*How does a row of scores become a mix of tokens?*

A softmax turns the three scores into weights that add up to 100%. Their exponentials are 10.13, 1.44 and 1.25, which add up to 12.81 (from the unrounded scores, so a calculator may differ in the last digit). The weights are 0.79 on "cat", 0.11 on "the" and 0.10 on "sat", so the new vector for "cat" is 79% its own value, 11% that of "the" and 10% that of "sat".

> Key idea: a row of the heatmap is one softmax. The output for that token is a mix of the value vectors, and the weights are the shares.

The lab does this for every token of the sentence and draws one row of the heatmap per token. With Head 1 on "the cat sat on the mat", the row of "cat" reads 8%, 61%, 8%, 8%, 9% and 6%, so the new vector for "cat" is 61% its own and 39% the other five. The row of the first "the" is almost flat, between 15% and 19%, as a function word predicts.

## Four heads, four patterns
*Why does a model run several heads at once?*

A head is one set of query, key and value matrices, and each one finds one kind of relation. The lab has four, all set by hand to show one typical pattern each.

- **Head 1: similar meaning.** A token looks hardest at itself and at tokens like it: "cat" 61%, "sat" 50% and "mat" 55% on themselves.
- **Head 2: nearby words.** It uses only the position code. "mat" puts 35% on itself, 30% on the "the" before it and 20% on "on".
- **Head 3: finds the action.** Names and things look for the action word. "cat" puts 50% on "sat", and so does "mat" with 49%.
- **Head 4: untrained (random).** Random weights, as before any training. The rows have no pattern, and no row gives "sat" more than about 11%.

[[figure:attention-lab/four-heads|The four heads on "the cat sat on the mat". Darker means a larger weight, and each row adds up to 100%.]]

A person does not set the heads of a trained model. Training shapes random heads like Head 4 into patterns like the other three. Which relation a head finds is learned, not chosen.

## Positions and the causal mask
*What do the position codes and the causal mask change?*

Attention alone does not see order. Switch to **Head 2: nearby words** and turn **Add position codes** off. Every cell reads 17%, which is 1/6, because the head has only the position code to go on and now has nothing to compare. A model without positions treats "the dog chased the cat" like "the cat chased the dog". Head 1 hardly changes, because it compares meaning, not place.

**Hide the future (causal mask)** matters for models that predict the next token. Token i may then look only at tokens up to i. The lab hatches the cells above the diagonal and sets them to exactly 0, so the softmax runs over the rest. Row 1 has only itself: 100%.

> Worked example: take the toy row of "cat" from before, with 0.11 on "the", 0.79 on "cat" and 0.10 on "sat". If "sat" comes later in the sentence, the mask hides it. Without it, 0.79 / (0.79 + 0.11) = 0.88, and "the" gets 0.11 / 0.90 = 0.12. In the lab the row of "cat" with Head 1 shows 12% and 88%, and the last row, "mat", is unchanged at 55%, because every other token is already in its past.

[[figure:attention-lab/mask-and-positions|Head 2 with and without position codes, and Head 1 with the causal mask. The hatched cells are hidden.]]

## Tokens change the sequence
*How does the tokenizer change what attention sees?*

The **Tokenizer** setting reuses the choices of the first lesson. **Words** gives one token per word, and **Characters** one per character, where ␣ marks a space. With **Byte-pair merges (BPE)**, the slider **BPE merges** sets how many merges are applied: at 0 every word is its letters plus an end-of-word mark, written ·, and with more merges the frequent letters join into pieces until, at the end of the slider, every word is whole again. The lab traces at most 24 tokens and cuts a longer text; the lab guide says when.

Only a whole word has a real vector in this lab. A character or a piece gets a made-up vector, so its attention is arbitrary. A word that is not in the vocabulary is drawn with a dashed border and gets the id of the unknown token. Type "the cat sat on the sofa": "sofa" is dashed, and its row under Head 1 is nearly flat, about 19% on "cat" and on "sat".

> Watch out: a clean pattern needs a token the model knows. Characters and pieces get their meaning only after training, from the tokens around them.

## Three models on the same messages
*What does Part 2 compare, and how?*

Part 2 uses generated customer messages like those of the Text classifier lab: billing, delivery and technical problem. Each draw generates 360 messages for labelling, and 180 (60 per class) are test messages, the same at every size and draw. **Labelled messages** is the total, taken evenly across the classes: 3 is one per class, and 8 is three, three and two.

The three models see the same labelled messages. **Bag of words + Naive Bayes** is the baseline from Level 2. **Frozen pretrained vectors + logistic regression** averages 8-number word vectors learned from unlabelled messages and keeps them fixed. **Fine-tuned pretrained vectors** lets the labels move a copy of the vectors it uses.

These are not the numbers of the last lesson, which counted labels per class and scored a nearest-class-mean head on about 202 test messages. On the first draw here, with 8 labelled messages, accuracy is 67.2% for bag of words, 82.8% frozen and 82.2% fine-tuned. With 360 it is 94.4%, 91.1% and 94.4%.

[[figure:attention-lab/size-curve|Test accuracy against the number of labelled messages on the first draw. The dotted line is guessing at 33%.]]

## One draw is not an answer
*How much can the result change from one draw to the next?*

Each **New sample** generates a new set of 360 customer messages and labels a balanced subset of them; the 180 test messages stay the same. At 8 messages the first four new draws give 65.0% against 73.9%, 59.4% against 71.7%, 72.2% against 72.8%, and 70.0% against 63.9%, bag of words first. The winner changes with the draw.

Across the first twelve draws, counting the draw on screen when the lab opens as the first, the pretrained vectors led by more than 3 points in 9, were within 3 in 2 and trailed in 1. The mean at 8 messages was 64.5% for bag of words and 73.5% frozen. At 360 messages bag of words was ahead of frozen in all 12.

> Key idea: with few labels the pretrained code is ahead on average, and a single draw can say otherwise. The frozen vectors are fixed, so with plenty of labels the baseline learns each word itself and passes them.

One message is 1/180 = 0.56 points, so the lab's 3-point margin for "about the same" is about 5 messages. As in the last lesson, compare on the same rows, over many draws, and look at the spread before you say that a model won.

::: remember
- A row of the heatmap is one softmax: the output of a token is a mix of the others, and the weights add up to 100%. The four heads show four patterns, and a real model learns its patterns.
- Positions and the causal mask change the rows: Head 2 has nothing without positions, and a masked row is renormalized over the past only. The tokenizer changes what a token is.
- Part 2 compares three models on the same 180 test messages. The pretrained vectors led at 8 messages in 9 of 12 draws and the baseline led at 360, so judge a model over several draws.
:::

@@lab

## Lab: attention
You start with the sentence "the cat sat on the mat", Head 1, and 8 labelled messages. Part 1 draws the attention weights of the sentence. Part 2 scores three text models on generated messages. Everything in it is generated, and there is no real data.

### Controls
- **Attention: trace it, then compare models** is the lab's title. Under **Part 1: trace attention**:
  - **Example sentence** picks one of five bundled sentences or **Your own text**. Typing in the box under it switches to your own text.
  - **Text to trace (up to 80 characters)** holds the text. Only the first 24 tokens are traced.
  - **Tokenizer** is **Words**, **Characters** or **Byte-pair merges (BPE)**.
  - **BPE merges** (0 to 44, starts at 12) appears only with BPE.
  - **Add position codes** adds the position code to every token. It starts on.
  - **Attention head** is **Head 1: similar meaning**, **Head 2: nearby words**, **Head 3: finds the action** or **Head 4: untrained (random)**.
  - **Hide the future (causal mask)** starts off.
- Under **Part 2: compare models**:
  - **Labelled messages** picks 3, 5, 8, 12, 20, 30, 45, 75, 120, 200 or 360 and starts at 8 messages.
  - **Show mistakes of** picks which of the three models fills the list of mistakes.
  - **New sample** generates another set of 360 messages, labels a balanced subset of it and keeps the same 180 test messages. It clears the Quick Quiz answer you saw, but keeps your choice.
- **Quick Quiz** is the button under the settings card (round on a phone): "With only 8 labelled messages, which model will do best: bag of words or the pretrained vectors?" with the choices **Bag of words (Naive Bayes)**, **The pretrained vectors** and **About the same (within 3 points)**. Set 8 messages, pick one and press **Check answer**.
- **Fullscreen** enlarges the lab. **Reset** returns to the first sentence, Words, 12 merges, positions on, Head 1, no mask, 8 messages, the first draw and no Quick Quiz answer.

### Reading the screen
- The heatmap shows **Token that looks (query)** down the side and **Token looked at (key)** across the top. Each cell is a percentage. The row with the thick outline is the traced token, and a click on any row traces it. Hatched cells are **Hidden by the causal mask**, and the legend explains **Higher weight (darker)** and **Traced token (outlined row)**.
- The status line reads like "Token 2, “cat”, with Head 1: similar meaning: it takes most from “cat” #2 (61%), “the” #5 (9%), “the” #1 (8%).", with a count such as "6 tokens · 4 heads" at the right. The detail line asks for your Quick Quiz answer until you give it, then shows the three accuracies at your size.
- **Tokens** shows one chip per token with its id, such as cat #3. Click a chip to trace it. A dashed chip is a word that is not in the vocabulary. A note explains ␣ (a space) for **Characters** and · (end of a word) for BPE.
- **Where one token looks** draws an arc from the traced token to each token it mixes in; a thicker arc is a bigger weight.
- **Test accuracy and macro F1 against labelled messages** has two panels, **Test accuracy** and **Test macro F1**, one line for each model (**Bag of words** circles, **Frozen vectors** squares, **Fine-tuned** triangles). The dashed line is your size and the dotted line is guessing, 33%.
- **Results at this size** has the table with the columns **Model**, **Test accuracy** and **Test macro F1** (best accuracy in bold), then "Misclassified test messages" for the model you picked in **Show mistakes of**, with a count such as "59 of 180 test messages are wrong (33%). Showing 3." **Data note** says what is generated.

### Experiments
Press **Reset** before each one.

1. **One row.** Predict: with Head 1, which token does "cat" look at hardest, and how hard? Click the chip "cat" and read the status line: 61% on "cat", then 9% and 8% on the two "the". Now click "sat": it puts 50% on itself. Click the first "the": its row is between 15% and 19%. Compare each row with the worked example of the lesson: why does a content word look mostly at itself, and a function word at everything a little?
2. **Four heads.** Predict: under Head 3, which token will "cat" and "mat" both look at? Pick **Head 3: finds the action** and click "cat": 50% on "sat". "mat" gives 49% on "sat", and "sat" itself only 21%. Then **Head 2: nearby words**: "mat" gives 35% to itself, 30% to the "the" before it and 20% to "on". Then **Head 4: untrained (random)**: no pattern, and no row gives "sat" more than 11%. Which of the four heads would you expect a trained model to need?
3. **Positions and the mask.** Predict: what does Head 2 show when you turn **Add position codes** off? Pick Head 2 and turn **Add position codes** off: every cell is 17%. Turn it on again: the first row reads 35%, 30%, 20%, 10%, 4%, 1%. Switch to Head 1 and compare on and off: the "cat" row stays at 61%. Now turn **Hide the future (causal mask)** on: row 1 is 100%, the "cat" row is 12% and 88%, and the last row is unchanged at 55%. Why must a next-word model not see the future?
4. **Tokens.** Predict: how many tokens will the sentence have as **Characters**, and with **Byte-pair merges (BPE)**? Pick **Characters**: 22 tokens. Pick BPE: 7 tokens at 12 merges, 23 at 0 and 6 at 44, where the slider ends. Which pieces make "mat" at 12? Then go back to **Words**, choose **Your own text** and type "the cat sat on the sofa": the dashed chip is "sofa". Why do characters and unknown words give rows with no meaning?
5. **Three models at 8 messages.** Predict: in the **Quick Quiz**, which model will do best with 8 labelled messages? Pick an answer, wait for the chart to fill, press **Check answer**, and read the table: 67.2%, 82.8% and 82.2%, with macro F1 0.67, 0.83 and 0.82. In **Show mistakes of**, switch between **Bag of words + Naive Bayes** (59 of 180 wrong, 33%) and **Frozen pretrained vectors + logistic regression** (31 of 180, 17%). Both get the first listed message wrong: a delivery message that also mentions "the server is down". Then move **Labelled messages** to 3 (58.9%, 58.3% and 58.3%) and to 360 (94.4%, 91.1% and 94.4%). Where does the lead change hands, and why does the frozen line stop climbing?
6. **A fresh sentence and fresh draws.** Predict: do the results hold on another sentence and draw? In Part 1, pick "the dog chased the cat": with Head 1 "dog" puts 43% on "cat" and 38% on itself, and with Head 3 "dog" and "cat" put 60% and 61% on "chased". In Part 2, set **Labelled messages** to 8 and press **New sample** four times, pressing **Check answer** each time: bag of words against frozen is 65.0% against 73.9%, 59.4% against 71.7%, 72.2% against 72.8% and 70.0% against 63.9%. Then set the size to 360 on each draw. The lab has no real dataset and no Real data switch; the messages are generated. So how many draws would you want before you say which model is better at 8 messages?


### Numbers in both language versions
The lab builds its sentences and messages in the language of the page, so its numbers differ. Read your column.

| Check | English lab | Indonesian lab |
|---|---|---|
| Sentence | "the cat sat on the mat" (6 tokens) | "kucing duduk di tikar dan kucing tidur" (7 tokens) |
| Head 1, traced row | "cat" 8%, 61%, 8%, 8%, 9%, 6% | first "kucing" 37%, 5%, 5%, 4%, 5%, 40%, 5% |
| Head 1, others | "sat" 50%, "mat" 55%, "the" 15% to 19% | "duduk" 35% (31% on "tidur"), "tikar" 53%, "di" 12% to 17% |
| Head 2 | row 1: 35%, 30%, 20%, 10%, 4%, 1%; "mat" 35%, 30%, 20% | row 1: 35%, 30%, 20%, 10%, 4%, 1%, 0%; "tikar" 23%, 20%, 20% |
| Head 2, no positions | 17% everywhere (1/6) | 14% everywhere (1/7) |
| Head 3 | "cat" 50% and "mat" 49% on "sat", "sat" 21% | "kucing" 35% and 32%, "tikar" 35% and 31%, "duduk" 17% |
| Head 4 | no row gives "sat" more than about 11% | no row gives "duduk" more than about 12% |
| Head 1, no positions | "cat" stays at 61% | "kucing" 37% to 39% |
| Head 1, mask | row 1 100%, "cat" 12% and 88%, "mat" 55% | row 1 100%, "duduk" 16% and 84%, "tidur" 34% and 31% |
| Unknown word | "the cat sat on the sofa": about 19% on "cat" and "sat" | "kucing duduk di sofa": about 28% and 27% |
| Characters | 22 tokens | 24 tokens (the text is cut) |
| BPE | 23 tokens at 0 merges, 7 at 12, 6 at 44 | 24 at 0, 19 at 12, 7 at 66 (slider 0 to 66) |
| Second sentence | "the dog chased the cat": 43% and 38%, then 60% and 61% | "anjing itu mengejar kucing": 46% and 40%, then 67% and 68% |
| 8 messages | 67.2%, 82.8%, 82.2%; macro F1 0.67, 0.83, 0.82 | 57.8%, 73.9%, 73.3%; macro F1 0.58, 0.74, 0.73 |
| Mistakes at 8 | 59 of 180 (33%) and 31 of 180 (17%); the same message first | 76 of 180 (42%) and 47 of 180 (26%); the same message second |
| 3 and 360 messages | 58.9%, 58.3%, 58.3% and 94.4%, 91.1%, 94.4% | 44.4%, 52.2%, 52.2% and 93.3%, 91.1%, 92.8% |
| Next four draws at 8 | 65.0% against 73.9%, 59.4% against 71.7%, 72.2% against 72.8%, 70.0% against 63.9% | 71.7% against 70.6%, 57.2% against 84.4%, 68.9% against 63.9%, 73.9% against 68.3% |
| First twelve draws | frozen ahead by more than 3 points in 9, within 3 in 2, behind in 1; mean 64.5% and 73.5%; bag of words ahead at 360 in 12 | ahead in 8, within 3 in 2, behind in 2; mean 63.5% and 72.5%; bag of words ahead at 360 in 8 of 12, level in 2, behind in 2 |
