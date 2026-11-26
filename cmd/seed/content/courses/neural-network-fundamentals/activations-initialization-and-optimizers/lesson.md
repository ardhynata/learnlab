---
slug: activations-initialization-and-optimizers
title: Activations, initialization and optimizers
kind: reading
simulator: ""
minutes: 25
---
::: intro
- Compare sigmoid, tanh and ReLU by their output and their slope, and explain how a stack of small slopes makes a gradient vanish.
- Say why equal starting weights fail, how Xavier and He scaling set their size, and what one SGD, momentum and Adam update does.
- Choose among weight decay, dropout and early stopping, and name what to inspect when a network will not train.

Before you start: read "Neurons and backpropagation". The update rules also build on "Learning rate and trouble", and the penalties on "Bias, variance and shrinkage".
:::

## Activations: the bend in each neuron
*What does an activation function do, and how do the common ones differ?*

Three choices decide whether a network learns at all: the activation function, the starting weights and the optimizer. Take the first. A neuron adds up its weighted inputs into a score z and passes z through an **activation function**. Without that bend the layers collapse into one linear model, as "Neurons and backpropagation" showed: two layers with weights 2 and 3 compute 3 × (2 × x) = 6 × x, which a single weight of 6 does as well.

**Sigmoid** squeezes any score into 0 to 1, as in "Probabilities and the sigmoid". **tanh** squeezes it into -1 to 1 and is centered on zero. **ReLU** (rectified linear unit) returns 0 for a negative score and the score itself for a positive one. The slope is what backpropagation multiplies by, so the table shows it too.

| Score z | sigmoid | slope | tanh | slope | ReLU | slope |
|---|---|---|---|---|---|---|
| -2 | 0.119 | 0.105 | -0.964 | 0.071 | 0 | 0 |
| 0 | 0.5 | 0.25 | 0 | 1 | 0 | corner |
| 2 | 0.881 | 0.105 | 0.964 | 0.071 | 2 | 1 |

The sigmoid's slope is h × (1 - h) for its output h, as in the last lesson, so it never exceeds 0.5 × 0.5 = 0.25. ReLU has a corner at 0, so a library picks one of the two neighboring slopes there.

[[figure:activations-initialization-and-optimizers/activation-functions|Output and slope of the three activations for scores from -3 to 3. The dashed line marks 0.25, the most the sigmoid's slope can reach.]]

## Vanishing gradients
*Why do the early layers of a deep network stop learning?*

Backpropagation sends the gradient backward one layer at a time, and every layer multiplies it by a factor: roughly the weight times the activation's slope. The gradient that reaches layer 1 is the product of all those factors. To isolate the slope, give every weight the value 1.

With sigmoid units the factor is at most 0.25, and 0.105 when the score is 2. Even in the best case, 5 layers leave 0.25^5 = 0.00098 of the gradient, and 10 layers leave less than one millionth. The early layers get almost no signal, so their weights barely move. This is the **vanishing gradient** problem. tanh has slope 1 at a score of 0 but only 0.071 at 2, so it saturates too: a unit **saturates** when its output sits near an end of its range, where the slope is almost 0. An active ReLU unit has slope exactly 1, so the product does not shrink.

[[figure:activations-initialization-and-optimizers/gradient-by-layer|Share of the last layer's gradient left d layers back, with every weight equal to 1. The vertical axis is logarithmic: each gridline is 10 times smaller than the one above.]]

> Watch out: ReLU can die. A unit whose score is negative for every example has slope 0, so no gradient reaches its weights and the gradient cannot bring it back. A big step that pushes its bias far below zero can cause this.

## Zeros fail: symmetry
*Why can the weights not all start at zero, or at any single value?*

Give every hidden unit in a layer the same starting weights. Each unit then computes the same output, passes the same signal forward and receives the same gradient back. The same update leaves them equal, so they stay copies of each other for the whole run, and a layer of 50 units does the work of one. Zero is the extreme case of this fault.

> Worked example: one input x = 1, two tanh hidden units with every weight 0.5 and no biases, the target y = 1, and half the squared error as the loss. Each unit outputs tanh(0.5) = 0.462, so the prediction is 0.5 × 0.462 + 0.5 × 0.462 = 0.462 and the error is 0.462 - 1 = -0.538. The gradient for a unit's input weight is error × output weight × (1 - 0.462²) × x = -0.538 × 0.5 × 0.786 × 1 = -0.211. Unit 2 gets exactly the same number, so after the update they are still equal.

Random starting weights break the tie. Each unit begins slightly different, so the gradients push the units toward different jobs. The biases may start at zero; the weights may not.

## Scale: Xavier and He
*How large should the random starting weights be?*

A score adds up n_in products w × x, one per input. If the inputs have spread 1 and the weights have variance Var(w), the score has variance n_in × Var(w). With 100 inputs, weights with standard deviation 1 give scores with standard deviation 10, and weights with 0.1 give 1. Layer after layer, the signal gets multiplied again and again, so a small error in the size compounds.

**Xavier** (also called Glorot) scaling sets Var(w) = 2 / (n_in + n_out), for sigmoid and tanh. **He** scaling sets Var(w) = 2 / n_in, for ReLU. With 100 inputs and 100 outputs, Xavier gives a standard deviation of 0.1 and He gives 0.141.

[[figure:activations-initialization-and-optimizers/signal-sizes|A seeded run of 8 ReLU layers of 100 units, with the same random numbers scaled three ways. A signal that vanishes starves the late layers, and one that explodes makes the outputs and the loss blow up.]]

In the figure the signal is multiplied by about 0.35 per layer when the standard deviation is 0.05, and by about 2.1 when it is 0.3. After 8 layers that is 0.0002 against 327, while He scaling keeps it near 1 (0.8 in this run).

::: deeper Why He uses a 2
ReLU turns about half of the scores to 0, so the mean square of its output is half that of its input. With 100 inputs and a standard deviation of 0.1, the score variance is 100 × 0.01 × 1 = 1 and the output keeps only 0.5 of it. The signal then shrinks by a factor of about 0.71 per layer: 0.71^8 is about 0.06 after 8 layers. He's 2 doubles the variance to put the lost half back.
:::

## Optimizers: SGD, momentum and Adam
*How does an optimizer turn a gradient into a step?*

Plain **SGD** moves each weight by `w = w - lr * g`, using the gradient g of a mini-batch, as in "Stochastic and mini-batch updates". **Momentum** adds a velocity that remembers earlier steps: `v = m * v - lr * g`, then `w = w + v`, as in "Learning rate and trouble". Steady gradients add up and zigzags cancel.

**Adam** keeps two running averages for each weight: one of the gradient (the direction, with decay 0.9) and one of its square (the size, with decay 0.999). It steps by the first divided by the square root of the second, after a correction for their start at zero. A weight whose gradients are tiny is divided by a tiny number, so it still moves.

> Worked example: learning rate 0.01, and two weights with gradients 0.4 and 40 on the first step. SGD moves them by 0.004 and 0.4. Adam, for the weight with gradient 0.4: average of the gradient 0.1 × 0.4 = 0.04, divided by 1 - 0.9 for the start correction gives 0.4; average of the square 0.001 × 0.16 = 0.00016, divided by 1 - 0.999 gives 0.16; step 0.01 × 0.4 / √0.16 = 0.01. For gradient 40 the step is also 0.01. Momentum with m = 0.9 and a steady gradient of 0.4 steps by 0.004, then 0.0076, then 0.01084.

On a first step, the size of Adam's step is about the learning rate, whatever the gradient's size. No optimizer wins on every problem, and all of them depend on a sensible learning rate.

## Weight decay
*How does a penalty on the weights keep a network from memorizing?*

A network has far more weights than a linear model, so it can memorize its training set. **Weight decay** is the ridge penalty from "Bias, variance and shrinkage" and "L1 and L2: ridge and lasso", applied to all the weights. A penalty of λ × w² has slope 2 × λ × w, so every update also pulls each weight toward zero by a fraction of its size.

> Worked example: w = 2, gradient 0.5, learning rate 0.1 and λ = 0.25. Without decay, w becomes 2 - 0.1 × 0.5 = 1.95. With decay it becomes 2 - 0.1 × (0.5 + 2 × 0.25 × 2) = 1.85. If the gradient were 0, each step would multiply w by 1 - 0.1 × 2 × 0.25 = 0.95, which leaves 1.197 after 10 steps.

::: deeper Weight decay is not always an L2 penalty
With plain SGD the two give the same update. With Adam they do not: a penalty added to the loss gets rescaled by Adam's division, so a variant called AdamW applies the decay directly to the weights instead.
:::

## Dropout
*How does switching units off at random make a network more robust?*

**Dropout** switches off each hidden unit at random during training, here with probability 0.5, so no unit can lean on a particular partner. Suppose four outputs are 0.8, 0.2, 0.4 and 0.6, and units 3 and 4 are dropped. The survivors are doubled, to 1.6 and 0.4, so their sum, 2, equals the sum of all four before dropping. A different mask would give a different sum, but averaged over many masks the output stays the same. At prediction time every unit is used and nothing is dropped.

## Early stopping
*How can the validation loss tell you when to stop?*

Training loss almost always keeps falling, so it cannot say when to stop. The validation loss can, as in "Gradient boosting", where it chose the number of trees. **Early stopping** watches it after every epoch, remembers the weights of the best epoch, and stops once the loss has not improved for a set number of epochs, the **patience**.

The figure shows an invented run to make the rule concrete. The validation loss reaches 0.37 at epoch 6, then reads 0.375, 0.39 and 0.41 while the training loss keeps falling. With a patience of 3, training stops after epoch 9 and the weights from epoch 6 come back.

[[figure:activations-initialization-and-optimizers/early-stopping|An invented run: training loss falls every epoch, while the validation loss has its lowest value at epoch 6.]]

> Key idea: early stopping costs nothing but a validation set. It also limits how far training can move the weights from their small starting values, so it acts as a regularizer.

## When training fails: what to inspect
*Which three plots tell you why a network will not train?*

Look at three things before you change anything. The **loss curve**, for training and validation, shows whether the loss falls, stalls, explodes or splits into two. The **activations**, as a histogram per layer, show saturation: tanh or sigmoid outputs piled at their ends (a histogram counts how many outputs fall in each range of values), or a ReLU layer where most outputs are exactly 0. The **gradient sizes**, per layer, show the first layers getting far less (vanishing) or far more (exploding) than the last.

| What you see | Likely cause | First thing to try |
|---|---|---|
| Loss flat from the first epoch | Vanishing gradient, dead ReLU units, tiny or equal weights, learning rate too small | ReLU, He or Xavier scaling, a larger rate |
| Loss jumps to NaN (not a number) or infinity | Learning rate too big, or weights too large | Divide the rate by 10, rescale the weights |
| Training falls, validation rises | Overfitting | Weight decay, dropout, early stopping |
| Both fall slowly and stay high | Rate too small, or model too small | Larger rate, more epochs, more units |

Next comes the network lab, the last lesson of the course, where you can inspect a small network's activations and gradients. Predict what each plot will show before you change a setting.

::: remember
- An activation must bend the sum, and its slope is a factor in every backward step: a sigmoid's slope is at most 0.25, so deep sigmoid stacks lose their gradient, while an active ReLU keeps it.
- Start with random weights, never equal ones, scaled by Xavier (sigmoid, tanh) or He (ReLU) so the signal keeps its size from layer to layer.
- Adam rescales each weight's step by its own gradient size, and weight decay, dropout and early stopping hold a network back. When training fails, read the loss curve, the activations and the gradient sizes.
:::
