---
slug: transfer-learning-and-self-supervision
title: Transfer learning and self-supervision
kind: reading
simulator: ""
minutes: 25
---
::: intro
- Name three self-supervised objectives (reconstruction, masking and contrastive pairs) and say what each one hides or compares.
- Explain how a representation pretrained on unlabelled data is reused, frozen or fine-tuned, and what each choice costs in parameters.
- Judge when transfer helps and when it hurts, and compare it fairly against features learned from the small labelled set alone.

Before you start: read "Embeddings and autoencoders" in this course, which gave you the code, the encoder and the reconstruction loss, and "Train, validation and test" from the Training and generalization course, for why a model is scored on rows it has not seen.
:::

## Labels you do not have to buy
*Where can a model get a learning signal when nobody labelled the data?*

A supervised model needs labels, and labels cost people time: someone must name the species of every penguin. Measurements without names are cheap, and there are usually far more of them.

**Self-supervised learning** makes the labels from the data itself. Hide a part of each input, then ask the model to predict the hidden part. The hidden part is the target, and no person wrote it. The question you ask is called a **pretext task**. You do not care about its answers. You care about the **representation** the model has to build to give them, the same kind of code you met in the last lesson.

The plan has two stages. **Pretraining** trains a model on a pretext task with plenty of unlabelled data. **Transfer** then reuses that representation for the **downstream task** you actually care about, using a small labelled set. The rest of this lesson asks how to reuse it, when that pays off, and how to find out.

## Three ways to hide something
*What do reconstruction, masking and contrastive pairs ask a model to do?*

**Reconstruction.** Feed in the whole input, squeeze it through a small code, and rebuild it. This is the autoencoder from the last lesson, and the loss is how far the output is from the input.

**Masking.** Hide one part of the input and predict it from the rest: a word in a sentence, a patch of a photo, one column of a table row.

**Contrastive pairs.** Nothing is hidden. Make two views of the same item, such as a photo and a cropped copy of it, and train the encoder so that two views of one item get codes close together while views of different items get codes far apart.

[[figure:transfer-learning-and-self-supervision/pretext-tasks|Three pretext tasks. Reconstruction rebuilds the input, masking predicts a hidden part, and contrastive pairs pull two views of one item together.]]

> Key idea: all three need no labels, but each rewards something different. Roughly, reconstruction keeps what varies the most, masking keeps what helps predict the hidden part, and contrastive training keeps what stays the same across views.

## Masking by hand
*Can you see a masking objective at work on six real penguins?*

Take six penguins as (flipper length in mm, body mass in g): (181, 3750), (186, 3800), (195, 3250), (210, 4450), (211, 4500) and (230, 5700). The pretext task is to hide the flipper length and predict it from the body mass. No species name is used anywhere.

A baseline that ignores the mass predicts the mean flipper length, 202.17 mm. Its average squared error is 279.14 mm².

> Worked example: fit a straight line to the six pairs. The slope is 69158.33 / 3657083.33 = 0.01891 mm per gram, and the intercept is 202.17 - 0.01891 x 4241.67 = 121.95 mm. For the first penguin the line predicts 121.95 + 0.01891 x 3750 = 192.9 mm, while the real flipper is 181 mm, so the error is -11.9 mm. The six errors are -11.9, -7.8, 11.6, 3.9, 3.9 and 0.3. Their squares add up to about 367, an average of 61.17 mm².

The masked-flipper loss fell from 279.14 to 61.17 because the line found a shared pattern: heavier penguins have longer flippers. That is a small piece of structure, learned without a single label. Pretraining at scale does the same with millions of rows, and what it learns is the code, not the single answer.

## Pretrain, then reuse
*What happens to the encoder once pretraining is done?*

After pretraining you keep the **encoder**, the part that turns an input into a code. You throw away the part that served the pretext task, and add a small **head** that turns the code into your downstream answer, such as a species. With a frozen encoder, only the head sees labels.

There are two ways to train. **Frozen:** the encoder's numbers are locked, and the labelled set trains only the head. **Fine-tuned:** the labelled set adjusts the encoder as well, so labels reach it too.

Count the numbers each choice must fit. An encoder that turns 4 measurements into a code of 2 has 4 x 2 = 8 weights and 2 biases, 10 numbers. A head that turns that code into one score has 2 weights and 1 bias, 3 numbers. With a labelled set of 10 penguins, frozen fits 3 numbers from 10 rows, while fine-tuning fits 13 numbers from 10 rows. The more numbers you let the labels change, the easier it is to overfit a small set.

[[figure:transfer-learning-and-self-supervision/frozen-or-fine-tuned|The pretrained encoder is built from unlabelled rows. Frozen training changes only the head, and fine-tuning changes both.]]

## When transfer helps and when it hurts
*Which conditions decide whether a pretrained representation pays off?*

Transfer helps most when two things hold. The labelled set is **small**, so features learned from it alone would be shaky. And the pretraining data comes from a **related domain**, meaning the same kind of inputs, where the same things matter.

It hurts in two ways. The first is **domain mismatch**: the pretraining data is not like your data, so the code is built for a different world. The second is a mismatched objective: the pretext task keeps something other than what your downstream task needs. A reconstruction code keeps the largest spread, which may be unrelated to your classes. When a pretrained representation scores worse than not using it, that is called **negative transfer**.

> Watch out: a pretrained representation is not a free upgrade. It is one more candidate, and it earns its place only by beating the plain options on the same task.

::: deeper Why contrastive training needs the push
If the loss only pulled two views of the same item together, the encoder could give every input the same code. All distances would be zero, and nothing would be learned. The push, which keeps codes of different items apart, is what prevents that collapse.
:::

## Comparing fairly
*How do you check that pretraining really helped?*

A fair comparison changes one thing at a time and keeps everything else equal.

- **Same labelled rows, same test rows, same head** for every arm. Only the representation differs.
- **Two plain baselines.** One uses the raw measurements, with no representation learning. The other learns its features from the small labelled set alone. Pretraining must beat both to count.
- **Test rows stay out of pretraining.** Their labels are hidden, but their inputs still must not shape the encoder, or the score is optimistic.
- **Many splits, not one.** A small labelled set makes the score jump from split to split. Run many, and report the average and the spread, or count how often one arm beats another on the same split.

::: deeper Leakage through the pretraining data
Unlabelled does not mean harmless. If the pretraining pool contains the rows you later test on, the encoder has already seen their inputs. It is the same leakage as fitting a scaler on all rows, and the cure is the same: split first, pretrain on the training side only.
:::

## A fair comparison on penguins
*What does this look like with real numbers?*

Use the 124 penguins of Dream island, 56 Adelie and 68 Chinstrap, and ask which species a penguin is from its four measurements. Each round sets 40 penguins aside as test rows. Of the other 84, the unlabelled pool, 5 per species form the labelled set of 10. The head picks the nearer class mean in the code. The representation is PCA, a linear autoencoder, with a code of 2 numbers.

The table shows the average test accuracy over 1000 random rounds. The spread is the standard deviation across rounds.

| Representation | Accuracy | Spread |
| --- | --- | --- |
| Raw measurements, no code | 83.4% | 10.3 |
| Code learned from the 10 labelled penguins alone | 79.5% | 11.0 |
| Frozen code from the 84 unlabelled Dream penguins | 83.8% | 10.1 |
| Frozen code from 167 Biscoe penguins (another island) | 80.5% | 6.9 |

[[figure:transfer-learning-and-self-supervision/fair-comparison|Average test accuracy over 1000 rounds, with one standard deviation. The left panel uses a code of 2 numbers and the right panel a code of 1 number.]]

The same-domain code beat the small-set code by 4.3 points on average (640 rounds won, 168 tied, 192 lost), but it only matched the raw measurements, by 0.4 points. The Biscoe code scored 3.3 points below the same-domain code.

## Squeezing the code to one number
*What changes when the code is smaller still?*

Repeat the 1000 rounds with a code of 1 number (the right panel). The same-domain code fell to 63.8%, far below the raw 83.4%: the largest spread in the pool is a general size direction, while these species differ mostly in bill length. The code learned from the 10 labelled penguins fell to about 65% as well. Yet the Biscoe one-number code scored 85.5%, so check every candidate and do not assume.

## Where this goes next
*What will you do in the Representation lab?*

You now have the vocabulary: a pretext task makes free labels, pretraining builds a representation from unlabelled rows, and transfer reuses it, frozen or fine-tuned. The penguin results showed the habit that matters most: a pretrained code counts only after it beats the raw measurements and the small-set code, on the same rows and over many splits.

The Representation lab, the last lesson of this course, has you compare a frozen pretrained representation with features learned from a small labelled set, judged the same way: same rows, plain baselines, many splits, and the spread beside the average.

::: remember
- Self-supervised learning makes labels from the data itself by hiding a part (reconstruction, masking) or by comparing views (contrastive pairs), so pretraining needs no labelled rows.
- A pretrained encoder is reused frozen (only the head learns) or fine-tuned (everything learns); fewer trained numbers is safer when the labelled set is small.
- Transfer helps with a small labelled set and a related domain, and can hurt with a mismatch. Test it on the same rows against raw features and small-set features, over many splits.
:::
