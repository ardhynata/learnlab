---
slug: embeddings-and-autoencoders
title: Embeddings and autoencoders
kind: reading
simulator: ""
minutes: 25
---
::: intro
- Explain what a representation is, and why the same data can be easy or hard to learn from depending on it.
- Read an embedding as a point where closeness means similarity, using distance and cosine.
- Encode and decode one point by hand with a tiny linear autoencoder, and say what the size of the bottleneck controls.

Before you start: read "PCA and explained variance" and "Reconstruction error and embeddings" in the Dimensionality reduction course, and "Distance and similarity" in the k-NN course. This lesson uses scores, reconstruction and both kinds of distance.
:::

## A vector that makes the task easy
*What is a representation, and why does the choice matter?*

A model never sees a penguin, a sentence or a photo. It sees a vector, a list of numbers. A **representation** is the choice of which list stands for each example. One example has many: the raw measurements, the z-scores of those measurements, or its PCA scores are three representations of the same penguin.

The choice can decide whether the task is hard. Picture two rings of points around the origin, like the Concentric rings dataset in the k-means lab: an inner ring of radius 2 and an outer ring of radius 4. Described by (x, y), no straight line separates them, and two k-means centroids cut through both rings. Described by one number, the distance r from the origin, every inner point has r = 2 and every outer point has r = 4. The rule "r above 3" separates them perfectly.

> Key idea: the points did not change, only the vector that describes them. **Representation learning** means finding such a vector from data, instead of designing it by hand as you did with the interaction and transformation features from Level 1.

## Embeddings: close means similar
*What is an embedding?*

An **embedding** is a representation in which closeness carries meaning: similar items get nearby vectors and different items get far-apart ones. It is usually learned from data, and it is usually a short list of numbers, shorter than the raw input.

Here is a toy embedding with two numbers per item. The numbers are invented for this lesson, not taken from a trained model.

| Item | Vector | Distance to cat | Cosine with cat |
| --- | --- | --- | --- |
| cat | (4, 3) | 0 | 1 |
| kitten | (5, 2) | 1.41 | 0.97 |
| dog | (3, 5) | 2.24 | 0.93 |
| truck | (-4, -1) | 8.94 | -0.92 |

The distance to the kitten is the square root of (4 - 5)² + (3 - 2)², which is 1.41. The cosine is the dot product divided by the two lengths: (4 × 5 + 3 × 2) / (5 × 5.385) = 0.97. Both measures, from "Distance and similarity", agree here: the closest item to the cat is the kitten.

[[figure:embeddings-and-autoencoders/embedding-map|The four toy items on a plane. The dashed segments are the distances from the cat, with the cosines beside them.]]

> Watch out: the axes of an embedding have no names. Only distances and directions mean something. Nearest neighbors in an embedding are the idea of the k-NN course, played in a learned space.

## The autoencoder
*How can a model learn a representation without any labels?*

Give a model the job of copying its input, but through a narrow passage. An **autoencoder** has two parts. The **encoder** turns the input x into a short **code** z. The **decoder** turns z back into x̂, the **reconstruction**. The **loss** is the reconstruction error, usually the squared distance between x and x̂, averaged over the rows.

The narrow middle is the **bottleneck**. If the code has fewer numbers than the input, the model cannot pass everything along. It has to find which combinations of the inputs carry most of what the decoder needs, the same redundancy PCA exploits.

The target is the input itself, so no label is needed. This is unsupervised learning: the data supplies its own answer. When training ends, you usually keep the encoder and throw the decoder away. The code z is the representation.

[[figure:embeddings-and-autoencoders/autoencoder-shape|An autoencoder: four numbers in, a code of two numbers, four numbers out. The loss compares the output with the input.]]

## One point by hand
*Can you encode and decode a point with a pencil?*

Build the smallest autoencoder: two numbers in, one number as the code, two numbers out, and no activation functions, so it is linear. Use the five points of the PCA lesson, whose mean is (3, 3). The encoder is z = w1 (x1 - 3) + w2 (x2 - 3). The decoder is x̂ = (3 + v1 z, 3 + v2 z). Take w = v = (0.707, 0.707).

> Worked example: the point (1, 2) is (-2, -1) after centering. **Encode:** z = 0.707 × (-2) + 0.707 × (-1) = -2.12. **Decode:** x̂ = (3 + 0.707 × (-2.12), 3 + 0.707 × (-2.12)) = (1.5, 1.5). The error vector is (1 - 1.5, 2 - 1.5) = (-0.5, 0.5), so the squared error is 0.5.

| Point | Centered | Code z | Rebuilt | Squared error |
| --- | --- | --- | --- | --- |
| (1, 2) | (-2, -1) | -2.12 | (1.5, 1.5) | 0.5 |
| (2, 1) | (-1, -2) | -2.12 | (1.5, 1.5) | 0.5 |
| (3, 4) | (0, 1) | 0.71 | (3.5, 3.5) | 0.5 |
| (4, 3) | (1, 0) | 0.71 | (3.5, 3.5) | 0.5 |
| (5, 5) | (2, 2) | 2.83 | (5, 5) | 0 |

The squared errors add up to 2.0, so the loss, their average, is 0.4. One number stands in for two, and the (5, 5) point lies on the diagonal, so it comes back exactly.

## Training it
*What would training do to these weights?*

Now try w = v = (1, 0): the code is just the first column. The point (1, 2) gets z = -2 and comes back as (1, 3), an error of 1. Over the five points the loss is 2.0, five times worse than 0.4, because this code ignores the second column completely.

Training changes the weights by gradient descent on the loss. Started near (1, 0), it settles at a loss of 0.4 with weights of about (0.7, 0.7) on both sides: the diagonal.

[[figure:embeddings-and-autoencoders/hand-example|The five points rebuilt through two sets of weights. Dashed segments are the errors. Lower is better: 0.4 on the diagonal, 2.0 on the first axis.]]

## Why it is PCA
*Is the diagonal a coincidence?*

The diagonal is PC1 of the five points, and the rebuilt (1.5, 1.5) is the same reconstruction the PCA lesson found. The loss 0.4 is the eigenvalue of PC2, the variance that was dropped.

This is not luck. With a linear encoder and decoder and squared error, the best code of k numbers spans the same subspace as the first k principal components. A linear autoencoder rediscovers PCA.

::: deeper Only the subspace is fixed
Double the encoder weights and halve the decoder weights and every output stays the same, so many weight settings give the same loss of 0.4. What training determines is the line the code lives on and the product of decoder and encoder, not each weight on its own. For these points the product is a matrix with 0.5 in every cell. The weights (0.7, 0.7) above are one of the equal-loss choices that gradient descent happened to reach.
:::

## What the bottleneck controls
*What does the size of the code decide?*

The code size is the number of values the code keeps. It sets a dial between copying and forgetting.

- **Code as large as the input.** The model can pass every number through unchanged. The loss reaches 0 and the code teaches nothing.
- **Small code.** The model must keep what matters most and let the rest go. Some loss stays.

For a linear autoencoder the price is the one from PCA: the error at code size k is the share of the squared spread held by the dropped components. For the four standardized penguin columns, a code of 1 number loses 31.2%, 2 numbers lose 11.8%, 3 lose 2.7%, and 4 lose 0.

A nonlinear autoencoder, with activation functions inside, can bend. Nine points along an arc defeat any straight code: the best line loses 19.2% of the squared spread. A decoder that follows the curve can pass through all nine, so one number, the position along the arc, is enough in principle.

[[figure:embeddings-and-autoencoders/bottleneck-size|Left: the share lost at each code size for four penguin columns. Right: nine points on an arc, with the best straight code and a curved decoder.]]

> Watch out: a small bottleneck is not the only control. A very flexible autoencoder may learn to copy even through a narrow code, so training adds other limits, such as noise in the input.

## Where this goes next
*What do you do with a representation once you have it?*

The code is a new set of columns. You can give it to a classifier instead of the raw columns, search it with nearest neighbors, or draw it. Pick the code size like any setting: by the loss you can accept and by the score of the model that uses it.

An autoencoder learns what is big in the input, not what the label needs. As with PCA, a small direction can be the one that separates your classes, and reconstruction will happily throw it away.

The next lesson, "Transfer learning and self-supervision", asks where a good representation comes from when you have few labels. The representation lab then ends the course with the syllabus question: how does a frozen pretrained representation compare with features learned from a small labeled dataset?

::: remember
- A representation is the vector that stands for an example. An embedding is a learned one where closeness means similarity.
- An autoencoder squeezes the input through a bottleneck and reconstructs it. Its own input is the target, so it needs no labels, and a linear one finds the PCA subspace.
- The code size is a dial: as large as the input it copies and learns nothing, smaller it keeps what matters and loses the rest. Nonlinear parts can bend where a line cannot.
:::
