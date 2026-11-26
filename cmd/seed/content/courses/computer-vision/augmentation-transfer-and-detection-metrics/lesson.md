---
slug: augmentation-transfer-and-detection-metrics
title: Augmentation, transfer and detection metrics
kind: reading
simulator: ""
minutes: 30
---
::: intro
- Choose augmentations that keep the label true, apply them to training images only, and test on realistic changes in lighting and orientation.
- Explain how a vision model reuses early filters from a pretrained network, and score a classifier by top-1 accuracy and per-class recall.
- Compute intersection over union (IoU) by hand, then precision and recall at an IoU threshold, and say what average precision summarizes.

Before you start: read "Convolutions and CNNs" in this course, "Transfer learning and self-supervision" for frozen and fine-tuned reuse, and "Confusion matrix and rates" for precision and recall.
:::

## Teaching a model what should not matter
*Why would you show a model changed copies of its own training images?*

A CNN learns from the images you give it. If every training photo of a plant is well lit, upright and centered, the network may lean on exactly those accidents. A new photo taken in dim light, or with a phone held at a slant, can then look like a different thing to it.

**Data augmentation** makes new training examples by changing the ones you already have: a flip, a shift, a small rotation, a brightness or contrast jitter. A **jitter** is a small random change, drawn fresh each time. The label stays the same, so the model sees many versions of every image and learns that these changes should not change the answer.

Augmentation adds no new objects to the world. It adds variety along the directions where you expect the world to vary. That is cheap, because nobody has to take or label another photo, and it also makes it harder for the model to memorize the exact pixels of one picture.

## Safe changes, and where to apply them
*Which changes keep the label true, and which images may you change?*

An augmentation is **label-preserving** when the changed image still deserves the same label. Whether a change is safe depends on the task, not on the change alone.

[[figure:augmentation-transfer-and-detection-metrics/augmentations|One digit with four safe changes (plus the original) and two that make the label wrong.]]

A shift, a small rotation and a modest change of brightness or contrast keep a 6 a 6. A mirror image of a digit is not a digit, and a 180° turn makes it a 9. A flip of a cat photo is fine, because a cat facing right is still a cat.

> Key idea: ask of each change, "would a person still give this image the same label?" Keep only the changes where the answer is yes, and keep them in a range you could meet in real use.

> Watch out: augment **training images only**, and split first. Validation and test images stay as they were, so their score describes real pictures. If you augment before the split, copies of one photo land on both sides and leak the answer.

## Testing on changes you expect
*Why can accuracy on clean test images overstate how robust a model is?*

A clean test set is drawn like the training set: well lit, upright, centered. A model can score high on it and still fail in the field, where a photo is dim, tilted or off center. The clean number answers "does it work on pictures like these?" and says little about the rest.

So add a **stress test**: the same test images with a change you expect in use, such as lower brightness or a 20° rotation. Report the clean score and each stress score side by side, never blended into one number.

> Worked example: suppose 200 test images and two models, with made-up numbers. The model trained on clean images only gets 188 right on the clean images (94%), 150 on the dimmer copies (75%) and 164 on the rotated copies (82%). The model trained with brightness and rotation jitter gets 184 (92%), 176 (88%) and 178 (89%). The clean score fell by 2 points, the dim score rose by 13 and the rotated score by 7.

[[figure:augmentation-transfer-and-detection-metrics/clean-vs-stress|Made-up accuracies of two models on clean, dimmer and rotated test images.]]

Judge a model by the changes it will meet. If the stress test uses exactly the jitter the model trained on, it checks the recipe, not the world.

## Reusing a trained network
*Which parts of a network trained on other images can you keep?*

The first layers of a CNN learn small, general filters: edges, color blobs, simple textures. Later layers combine them into parts and shapes that suit the classes the network was trained on. The early filters are useful for almost any photo, so you can reuse them.

[[figure:augmentation-transfer-and-detection-metrics/reuse-the-filters|A pretrained network: early layers reused, a new head trained on your small labelled set.]]

The usual recipe is **transfer learning**. Keep the pretrained layers, cut off the old final layer, and add a new **head** for your classes. Train only the head and the rest stays **frozen**. To go further, **fine-tune**: let the later layers learn too, with a small learning rate, so the filters shift a little.

Suppose the frozen layers hand the head 64 features and you have 3 classes. The head has 64 × 3 + 3 = 195 numbers, few enough for a small labelled set. Fine-tuning trains many more and can overfit. Transfer helps most when your images look like the pretraining images, and less when they do not. "Transfer learning and self-supervision" in the representation-learning course has the same trade-off for tables.

## Classification metrics at a glance
*Which numbers summarize a model that names what is in a picture?*

**Top-1 accuracy** is the share of images where the class with the highest score is the true class. **Top-5 accuracy** counts an image as right if the true class is among the five highest scores, which helps when many classes look alike. **Per-class recall** is, for one class, the share of its images the model found.

The table is a confusion matrix for 300 test images of cats, dogs and birds. Rows are true classes.

| True class | Predicted cat | Predicted dog | Predicted bird | Images | Recall |
| --- | --- | --- | --- | --- | --- |
| cat | 188 | 10 | 2 | 200 | 94% |
| dog | 20 | 36 | 4 | 60 | 60% |
| bird | 2 | 2 | 36 | 40 | 90% |

> Worked example: the correct counts sit on the diagonal, 188 + 36 + 36 = 260, so top-1 accuracy is 260 / 300 = 86.7%. Dog recall is 36 / 60 = 60%.

> Watch out: 86.7% sounds good, but the model misses 4 of every 10 dogs, because cats dominate the score. Always read per-class recall beside accuracy, as in "Confusion matrix and rates".

## Intersection over union
*How do you score a box that is close to the true box but not equal to it?*

A **detector** does more than name a class. For each object it returns a **box** (where), a class (what) and a confidence score (how sure). A box is almost never identical to the true one, so "equal or not" is useless. We need a number for how much they overlap.

**Intersection over union (IoU)** is the area where the two boxes overlap divided by the area they cover together. It is 0 for boxes that do not touch and 1 for identical boxes.

> Worked example: the true box runs from x = 2 to 8 and y = 2 to 6, so it is 6 by 4 with area 24. The predicted box runs from x = 4 to 10 and y = 3 to 7, also 6 by 4. They overlap from x = 4 to 8 and y = 3 to 6, which is 4 by 3 = 12. The union is 24 + 24 − 12 = 36, so IoU = 12 / 36 = 0.33. Move the predicted box to x = 3 to 9 and y = 2 to 6: the overlap is 5 by 4 = 20, the union is 24 + 24 − 20 = 28 and IoU = 20 / 28 = 0.71.

[[figure:augmentation-transfer-and-detection-metrics/iou|Two predicted boxes against the same true box: IoU 0.33 and IoU 0.71.]]

> Watch out: a box that is too large is punished too. A box 6 wide and 8 tall that contains the true box has overlap 24 and union 48, so IoU is only 0.5.

## Precision and recall at an IoU threshold
*How does a score on boxes turn into counts of right and wrong?*

Pick an **IoU threshold**, for example 0.5. A predicted box is a **true positive** if its IoU with a true box of the same class is at least the threshold and no other prediction already claimed that true box. Every other predicted box is a **false positive**, including a second box on an object that was found and a box on empty background. A true box that no prediction claimed is a **false negative**. Then **precision** is TP / (TP + FP) and **recall** is TP / (TP + FN), as in "Confusion matrix and rates".

Take 5 true boxes and 6 predicted boxes. Five predictions have an IoU of 0.83, 0.71, 0.58, 0.47 and 0.31 with five different true boxes, and one sits on empty background.

| IoU threshold | TP | FP | FN | Precision | Recall |
| --- | --- | --- | --- | --- | --- |
| 0.3 | 5 | 1 | 0 | 0.83 | 1 |
| 0.5 | 3 | 3 | 2 | 0.5 | 0.6 |
| 0.75 | 1 | 5 | 4 | 0.17 | 0.2 |

A stricter threshold lowers both numbers, because boxes that were good enough before now count as misses. A detection score always comes with its threshold.

## Average precision, and on to the lab
*How do many thresholds on confidence become one number, and where do you try all this?*

A detector's boxes carry confidence scores. Sort them from the most to the least confident and accept them one at a time. After each box you have a recall and a precision at a fixed IoU threshold, and together they trace a precision–recall curve. **Average precision (AP)** is the area under that curve for one class. **Mean average precision (mAP)** averages AP over the classes, and some benchmarks also average over several IoU thresholds. Benchmarks differ in small details of how they compute AP, so a score is only comparable inside one benchmark.

::: deeper AP for the six boxes
Give the six boxes of the last section confidences 0.95, 0.90, 0.80, 0.70, 0.60 and 0.40, in the order IoU 0.83, 0.71, background, 0.58, 0.47, 0.31. At threshold 0.5 the running (recall, precision) pairs are (0.2, 1), (0.4, 1), (0.4, 0.67), (0.6, 0.75), (0.6, 0.6) and (0.6, 0.5). Replace each precision by the best precision at that recall or higher, then add up rectangles: 0.2 × 1 + 0.2 × 1 + 0.2 × 0.75 = 0.55. Recall never passes 0.6, so the rest of the curve adds nothing, and AP = 0.55.
:::

The next lesson is the course lab, "Vision lab". Its task is the one from the top of this lesson: train with augmentation, then test on realistic changes in lighting and orientation, and compare the clean score with the stress scores.

::: remember
- Augment training images only, with changes that keep the label true, and test on realistic changes: a clean test score overstates robustness.
- Transfer learning keeps the early filters, trains a new head, and fine-tunes later layers only when there is data for it. Read top-1 accuracy together with per-class recall.
- IoU is overlap divided by union. A detection counts as right only at an IoU threshold, and average precision summarizes precision and recall over confidence cuts.
:::
