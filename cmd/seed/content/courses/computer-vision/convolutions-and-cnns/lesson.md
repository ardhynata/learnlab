---
slug: convolutions-and-cnns
title: Convolutions and CNNs
kind: reading
simulator: ""
minutes: 25
---
::: intro
- Slide a 3 × 3 filter over a 5 × 5 patch by hand, and read the resulting feature map as an edge detector.
- Follow an image through convolution, pooling and a dense layer, and count the weights of a small CNN against a plain dense network.
- Work out a receptive field, and say why weight sharing needs far fewer weights.

Before you start: read "Neurons and backpropagation" and "Activations, initialization and optimizers" in the Neural network fundamentals course. A CNN is made of the neurons, ReLU activations and gradient steps you met there.
:::

## Why an image is not a table row
*What goes wrong when you feed pixels to a model as columns?*

Every model in the tabular lessons read a table: one row per example, one column per feature. Flipper length and bill depth have no position. Swap two columns in every row and a linear model, k-NN or a tree learns the same thing.

A picture is different. A 28 × 28 grey image is 784 brightness values on a grid. You can unroll the grid into one row of 784 columns, but then the pixel just below a pixel is 28 columns away, and the model is not told that.

Two things follow. First, the information sits in **neighbouring pixels**: an edge is a place where neighbours differ, and a single pixel says almost nothing. Second, the same digit can sit two pixels to the right, and then nearly all 784 columns change value. A model with one weight per column has to learn the digit again for every position.

[[figure:convolutions-and-cnns/pixels-not-columns|The same 49 pixels with their neighbours kept and then shuffled. A model that treats columns as independent cannot tell the two apart; a person can.]]

> Key idea: a convolutional network is built to use two facts about images: nearby pixels belong together, and a pattern means the same thing wherever it appears.

## A small filter that slides
*What does a convolution compute?*

A **filter** (also called a kernel) is a small grid of weights, here 3 × 3. To apply it, place it over a 3 × 3 window of the image, multiply each weight by the pixel under it, and add the nine products. That sum is one number. Then slide the filter one pixel to the right and do it again, then down a row, until every window has been used.

The window moves one pixel at a time, a step called the **stride**. The grid of sums is a **feature map**. On a 5 × 5 patch, a 3 × 3 filter fits in 5 - 3 + 1 = 3 positions across and 3 down, so the feature map is 3 × 3. On an image n pixels wide, a filter k wide gives n - k + 1 positions.

This is the neuron you already know: a weighted sum of inputs. Two things are new. The neuron looks only at a small window, and the same weights are reused at every window.

> Watch out: the border is lost. To keep the map the same size as the image, a library can add a frame of zeros first (**padding**). In this lesson there is no padding.

## An edge detector by hand
*How can nine weights find an edge?*

Take the patch below, with brightness from 0 (dark) to 9 (bright): dark on the left, bright on the right, with a little noise. The filter has -1 in its left column, 0 in the middle and 1 in its right column. Each window therefore gets (right column) - (left column), large when it is brighter on the right than on the left.

> Worked example: the top-left window holds the rows (1, 1, 2), (0, 1, 1) and (1, 0, 2). Row by row the products are -1 + 0 + 2 = 1, 0 + 0 + 1 = 1 and -1 + 0 + 2 = 1, so the sum is 3. One step right, the window holds (1, 2, 8), (1, 1, 9), (0, 2, 8). The right column adds up to 8 + 9 + 8 = 25, the left column to 1 + 1 + 0 = 2, and the result is 25 - 2 = 23.

Doing all nine windows gives the feature map [3, 23, 22], [3, 24, 22], [1, 24, 23]. The big numbers sit exactly where the window straddles the edge.

[[figure:convolutions-and-cnns/sliding-filter|A 3 × 3 vertical-edge filter on a 5 × 5 patch. The outlined window gives 25 - 2 = 23 in the outlined cell of the feature map.]]

Flip the patch along its diagonal (swap rows and columns) so the edge runs left to right, dark above and bright below, and the same filter gives only 0 and -1 across the whole map: it is blind to a horizontal edge. A bright-to-dark edge gives large negative numbers instead.

> Watch out: this filter was written by hand for teaching. In a CNN nobody chooses the nine numbers. They start random and are trained like any weight.

## Feature maps and pooling
*How does a layer combine many filters, and what does pooling add?*

One filter finds one pattern. A **convolution layer** uses many filters on the same input, say 8, each with its own weights. It gives 8 feature maps, stacked like the colour channels of a photo. Then an activation, usually ReLU, sets the negative responses to 0, so a map says "how strongly is my pattern here?".

**Pooling** shrinks a map. With 2 × 2 max pooling, the map is cut into non-overlapping 2 × 2 blocks and only the largest number in each block is kept. Take this 4 × 4 map from another patch:

| 3 | 23 | 22 | 1 |
| --- | --- | --- | --- |
| 3 | 24 | 22 | 0 |
| 1 | 2 | 5 | 21 |
| 0 | 1 | 20 | 23 |

Its four blocks have maxima 24, 22, 2 and 23, so the pooled map is 2 × 2: [24, 22], [2, 23]. The height and width halve, so a quarter of the numbers remain, and pooling has no weights to learn. It also forgives small shifts: if a strong response moves one pixel within its block, the block's maximum does not change.

> Key idea: convolution asks "where is this pattern?", and pooling answers "roughly here" with less data.

## Stacking into a CNN
*What does a whole network of these layers look like?*

A **convolutional neural network (CNN)** stacks the pieces: convolution (with ReLU), pooling, convolution, pooling, then a dense layer. Here is a small one for a 28 × 28 grey digit. The first convolution has 8 filters of 3 × 3 and gives 26 × 26 × 8 numbers. Pooling makes it 13 × 13 × 8. The second convolution has 16 filters, and each one reads all 8 maps at once (it is 3 × 3 × 8), giving 11 × 11 × 16. Pooling gives 5 × 5 × 16, because 11 is odd and pooling drops the last row and column. Flatten those into 400 numbers, and a dense layer turns them into 10 scores, one per digit.

[[figure:convolutions-and-cnns/cnn-pipeline|A small CNN for a 28 × 28 grey image: the shape after each layer, and the number of weights each layer has.]]

Early filters tend to answer to simple things such as edges, and later ones combine them into larger parts. The convolutions and pooling build a representation of the image, as in "Embeddings and autoencoders", and the dense layer at the end classifies from it.

## Counting the weights
*Why does a CNN need so few weights?*

Count each layer: filters × (filter height × width × input channels), plus one bias per filter.

| Layer | Weights | Biases | Total |
| --- | --- | --- | --- |
| Convolution 1 | 8 × (3 × 3 × 1) = 72 | 8 | 80 |
| Convolution 2 | 16 × (3 × 3 × 8) = 1,152 | 16 | 1,168 |
| Dense | 400 × 10 = 4,000 | 10 | 4,010 |

The whole network has 80 + 1,168 + 4,010 = 5,258 parameters. Now compare with a dense layer that produced the same 26 × 26 × 8 = 5,408 numbers from the 784 pixels: it would need 784 × 5,408 = 4,239,872 weights, against 72 for the convolution, about 58,900 times as many. A plain network with one hidden layer of 128 neurons (784 inputs, 10 outputs) has 784 × 128 + 128 + 128 × 10 + 10 = 101,770 parameters, about 19 times the CNN.

The saving is **weight sharing**: the same 9 weights of a filter are used at all 26 × 26 = 676 windows, so a pattern learned once is found everywhere.

> Watch out: fewer weights does not mean less arithmetic. The first convolution still does 676 × 9 × 8 = 48,672 multiplications for one image.

## The receptive field
*How much of the image can one number see?*

The **receptive field** of a number is the square of input pixels that can change it. One 3 × 3 convolution gives a field of 3 × 3. Stack a second one: each of its numbers reads 3 × 3 numbers of the first map, which together cover 5 × 5 pixels. A third gives 7 × 7. Each stacked 3 × 3 layer widens the field by 2.

Pooling widens it faster. Track two things: the field `rf` and the **jump**, the pixel distance between neighbouring numbers of a layer (1 at the start). A layer with kernel size k grows the field to `rf + (k - 1) × jump`, and a pooling with stride 2 doubles the jump.

| Layer | Field | Jump |
| --- | --- | --- |
| Convolution 1 (k = 3) | 1 + 2 × 1 = 3 | 1 |
| Pooling 1 (k = 2, stride 2) | 3 + 1 × 1 = 4 | 2 |
| Convolution 2 (k = 3) | 4 + 2 × 2 = 8 | 2 |
| Pooling 2 (k = 2, stride 2) | 8 + 1 × 2 = 10 | 4 |

[[figure:convolutions-and-cnns/receptive-field|The square of the 28 × 28 image that one number can see after each layer of the small CNN.]]

Each of the 400 numbers that leave the last pooling sees a 10 × 10 patch. The dense layer then sees all 400 together, so it can combine the patches.

## What comes next
*What can a CNN still get wrong, and where do you test it?*

A CNN learns its filters by the same loop as any network: a forward pass, a loss, backpropagation, an update. A shared weight gets its gradient from every window it was used in.

What it learns comes from the images it saw. A network trained on bright, upright digits can fail on a dim or tilted one, because the convolutions only forgive small shifts. The next lesson in this course covers augmentation, transfer learning and the metrics for detection, which are the usual answers. The **Vision lab**, the last lesson of the course, lets you train with augmentation and then test on changes in lighting and orientation.

::: deeper Convolution or cross-correlation?
A true convolution flips the filter before sliding it. CNN libraries skip the flip and slide the filter as it is, which is strictly called cross-correlation, but everyone says convolution. The flip makes no practical difference: the weights are learned, so training finds the flipped filter if that is the useful one.
:::

::: deeper Output size with padding and stride
For an input n wide, a kernel k, padding p (a frame of zeros on each side) and stride s, the output is floor((n + 2p - k) / s) + 1 wide. For n = 28 and k = 3: stride 1 and no padding gives 26; padding 1 gives (28 + 2 - 3) / 1 + 1 = 28, the same size as the input; stride 2 with no padding gives floor(25 / 2) + 1 = 13.
:::

::: deeper The gradient of a shared weight
A filter weight is used at every window, so a change to it moves the loss along many paths, one per window. The chain rule of "Neurons and backpropagation" gives the gradient for each path, and the gradient of the shared weight is their sum. Backpropagation does this addition automatically.
:::

::: remember
- Neighbouring pixels carry the information. A filter is a small grid of weights slid over the image, and the grid of sums is a feature map.
- A CNN stacks convolution, ReLU and pooling, then a dense layer. Weight sharing gives the small CNN here 5,258 weights, where one dense layer on the same pixels would need millions.
- Each layer widens what one number can see: the receptive field grows with every convolution and faster with pooling.
:::
