---
slug: neurons-and-backpropagation
title: Neurons and backpropagation
kind: reading
simulator: ""
minutes: 25
---
::: intro
- Compute what one neuron outputs: a weighted sum plus a bias, passed through an activation.
- Run the forward pass of a 2-2-1 network by hand, then find the gradient of one weight with the chain rule.
- Explain why a hidden layer lets a network draw a bent boundary, using the XOR problem.

Before you start: read "Log loss and fitting" and "Gradient descent".
:::

## A neuron
*What does one neuron compute?*

You have already met one. Logistic regression computes a score `z = w1 × x1 + w2 × x2 + b` and squeezes it with the sigmoid to get a probability. A **neuron** is that same unit: a **weighted sum plus a bias**, followed by an **activation**, a function applied to the score. If the activation is f, the neuron's output is `a = f(z)`. The weights and the bias are its **parameters**, the dials that training turns.

Take a neuron with weights 0.8 and 0.2 and a bias of -0.4, reading the inputs x1 = 1 and x2 = 2. The score is z = 0.8 × 1 + 0.2 × 2 - 0.4 = 0.8. With the sigmoid as the activation, the output is a = sigmoid(0.8) = 0.69.

[[figure:neurons-and-backpropagation/neuron|One neuron on real numbers: inputs times weights, plus the bias, give the score z; the sigmoid turns z into the output a.]]

> Key idea: a neuron is the two steps of logistic regression, a linear score and then a squeeze. What is new is not the neuron. It is that the output of one neuron can be the input of another.

## Layers and the multilayer perceptron
*How do neurons join into a network?*

A **layer** is a group of neurons that all read the same inputs. A **multilayer perceptron** (MLP) stacks layers: the **input layer** is just the features, one or more **hidden layers** compute new values from them, and the **output layer** gives the prediction. Each neuron reads every output of the layer before it, and nothing loops back, so the numbers flow one way: forward.

Name a network by its layer sizes. A 2-2-1 network has 2 inputs, 2 hidden neurons and 1 output neuron. Count its parameters: each hidden neuron has 2 weights and 1 bias, so 2 × 3 = 6 numbers, and the output neuron has 2 weights and 1 bias, so 3 more. That makes 9 parameters.

The output of a hidden neuron is not an answer anyone reads. It is a **feature the network builds for itself**, and the next layer uses it the way logistic regression uses a column of the table. Training decides what those features should be.

> Watch out: "hidden" does not mean secret. It means the layer is neither the input nor the output, so you never set its values directly.

## The forward pass by hand
*How do the inputs become one prediction?*

The **forward pass** computes the network layer by layer, from the inputs to the output. Use the 2-2-1 network below, with a sigmoid in every neuron. Name its parameters like this: `w11` and `w12` are the weights from x1 and x2 into hidden neuron 1, `w21` and `w22` the weights into hidden neuron 2, `b1` and `b2` their biases, `v1` and `v2` the weights from the hidden neurons into the output neuron, and `c` its bias. The input is x1 = 1 and x2 = 2, and the true label is y = 1. Keep four decimals at every step.

| Step | Calculation | Result |
|---|---|---|
| Hidden 1, score | 0.5 × 1 + (-0.3) × 2 + 0.3 | z1 = 0.2 |
| Hidden 1, output | sigmoid(0.2) | h1 = 0.5498 |
| Hidden 2, score | 0.8 × 1 + 0.2 × 2 - 0.4 | z2 = 0.8 |
| Hidden 2, output | sigmoid(0.8) | h2 = 0.6900 |
| Output, score | 1.2 × 0.5498 + (-0.7) × 0.6900 + 0.05 | z = 0.2268 |
| Output, prediction | sigmoid(0.2268) | p = 0.5565 |
| Loss | -ln(0.5565) | 0.586 |

[[figure:neurons-and-backpropagation/network|The 2-2-1 network with every weight and bias, and the values of the forward pass for the input (1, 2).]]

The network says 0.5565 for a label of 1. That is a weak yes, and its log loss is 0.586, computed as in "Log loss and fitting". Training will try to lower it.

## The chain rule
*How does a change deep in the network reach the loss?*

Training needs the gradient of the loss for every parameter: the slope you find by nudging one dial, as in "Gradients and the loss surface". But `w11` does not touch the loss directly. Its nudge moves z1, which moves h1, then the output score z, then p, then the loss.

The **chain rule** says the slope of the whole chain is the product of the slope of each link. If u = 2x + 1 and y = 3u, nudging x by 1 moves u by 2 and y by 3 × 2 = 6.

For `w11` each link has a simple local slope:

- z1 = w11 × x1 + w12 × x2 + b1, so z1 changes with w11 at the rate x1.
- h1 = sigmoid(z1), whose slope is h1 × (1 - h1).
- z = v1 × h1 + v2 × h2 + c, so z changes with h1 at the rate v1.
- From z on, the sigmoid and the log loss together have the slope p - y, as in "Log loss and fitting".

> Key idea: the gradient of a deep parameter is a product of local slopes, one for each link between it and the loss.

## Backpropagation on one weight
*What is the gradient of w11, worked out by hand?*

Start at the loss and walk back, multiplying as you go. Keep four decimals.

> Worked example: **Step 1.** The loss changes with the output score z at the rate p - y = 0.5565 - 1 = -0.4435.

> Worked example: **Step 2.** z reads h1 through v1 = 1.2, so the loss changes with h1 at -0.4435 × 1.2 = -0.5322.

> Worked example: **Step 3.** h1 has slope 0.5498 × (1 - 0.5498) = 0.2475, so the loss changes with z1 at -0.5322 × 0.2475 = -0.1317.

> Worked example: **Step 4.** z1 changes with w11 at x1 = 1, so the gradient of w11 is -0.1317 × 1 = -0.1317.

[[figure:neurons-and-backpropagation/chain|The chain from w11 to the loss. The forward pass fills the top row; the backward pass multiplies one local slope per arrow and fills the bottom row.]]

The sign says that raising `w11` lowers the loss. You can test it, as you did with gradients before: raise `w11` from 0.5 to 0.501 and redo the whole forward pass at full precision. The loss changes by about -0.00013, a slope of about -0.13 per unit of `w11`, which agrees. With a learning rate of 0.5 the update is 0.5 - 0.5 × (-0.1317) = 0.5659.

## Why backpropagation runs backward
*Why start at the loss and not at the weight?*

The walk left shared pieces behind. The slope at z, -0.4435, starts the chain for every parameter. The slope at z1, -0.1317, serves `w11`, `w12` and `b1` all at once, because their last link differs only by x1 = 1, x2 = 2 and 1 for a bias. Going backward, each factor is computed once and reused.

| Neuron | First weight | Second weight | Bias |
|---|---|---|---|
| Hidden 1 | w11: -0.132 | w12: -0.263 | b1: -0.132 |
| Hidden 2 | w21: 0.066 | w22: 0.133 | b2: 0.066 |
| Output | v1: -0.244 | v2: -0.306 | c: -0.444 |

One forward pass plus one backward pass gives all nine gradients. Nudging each parameter and redoing the forward pass would take nine forward passes, and a real network has thousands of parameters or many more. **Backpropagation** is this: the chain rule, applied backward from the loss, one layer at a time.

Subtract the learning rate times each gradient from each parameter. With 0.5, one step takes p from 0.5565 to 0.684 and the loss from 0.586 to 0.380.

> Watch out: `w21` and `w22` have positive gradients, although the label is 1. Hidden neuron 2 reaches the output through v2 = -0.7, so it argues against the label, and training lowers its weights.

## Why depth lets a network bend
*What can a hidden layer do that one neuron cannot?*

One neuron cuts the inputs with a straight line, the place where z = 0. That fails on **XOR**: the label is 1 when exactly one of x1 and x2 is 1. The points (0, 0) and (1, 1) have label 0, while (0, 1) and (1, 0) have label 1, and no straight line separates them (the first fold below shows why).

A hidden layer fixes this. Set a 2-2-1 network by hand: h1 = sigmoid(10 x1 + 10 x2 - 5) is on when at least one input is on, h2 = sigmoid(10 x1 + 10 x2 - 15) is on only when both are, and the output p = sigmoid(10 h1 - 10 h2 - 5) says "h1 on, h2 off".

| x1 | x2 | h1 | h2 | p | Label |
|---|---|---|---|---|---|
| 0 | 0 | 0.01 | 0.00 | 0.01 | 0 |
| 0 | 1 | 0.99 | 0.01 | 0.99 | 1 |
| 1 | 0 | 0.99 | 0.01 | 0.99 | 1 |
| 1 | 1 | 1.00 | 0.99 | 0.01 | 0 |

For (0, 1): z1 = 5 gives h1 = 0.9933, z2 = -5 gives h2 = 0.0067, and the output score is 9.933 - 0.067 - 5 = 4.87, so p = 0.99.

[[figure:neurons-and-backpropagation/xor|XOR in the inputs, where no line works, and in the hidden features (h1, h2), where the output neuron's line separates the labels.]]

> Key idea: a hidden layer changes the coordinates. The output neuron still cuts with a straight line, but in (h1, h2), where the labels can be separated. Back in the inputs, that cut is a bent boundary.

## Where this goes next
*How does one gradient step become a trained network?*

You computed one gradient step on one example. Training repeats it over many examples and many passes through the data: forward pass, loss, backward pass, update. That is the loop of "Gradient descent", with backpropagation supplying the gradients.

Some choices were skipped. The sigmoid was the only activation here, and the next lesson, "Activations, initialization and optimizers", looks at other activations, at starting weights, and at update rules better than a plain step. Then the **network lab**, the last lesson of the course, trains a small network on a nonlinear dataset and lets you inspect its activations and gradients, the two things you worked out by hand here.

::: deeper Why no single neuron can do XOR
Suppose a neuron with weights w1, w2 and bias b gives label 1 when its score is above 0 and label 0 when it is below. The four XOR points then need: b < 0 for (0, 0); w1 + w2 + b < 0 for (1, 1); w1 + b > 0 for (1, 0); w2 + b > 0 for (0, 1). Add the last two: w1 + w2 + 2b > 0. But the first two say w1 + w2 + b < 0 and b < 0, so w1 + w2 + 2b < 0. The two claims contradict each other, so no weights exist.
:::

::: deeper Why the activation cannot be skipped
Without an activation, a hidden neuron is only a weighted sum. Take h = 2x + 1 and an output 3h - 2. Together they give 3 × (2x + 1) - 2 = 6x + 1, which one linear neuron could do alone. However many layers you stack, linear steps collapse into one linear step. The bend comes from the activation.
:::

::: deeper Where the slope h × (1 - h) comes from
The sigmoid is h = 1 / (1 + e^(-z)). Its slope is e^(-z) / (1 + e^(-z))^2. Since 1 - h = e^(-z) / (1 + e^(-z)), this equals h × (1 - h). At z = 0, h = 0.5 and the slope is 0.25, the largest it ever gets. At h = 0.8 it is only 0.16.
:::

::: remember
- A neuron is a weighted sum plus a bias, passed through an activation. A layer is neurons side by side, and an MLP stacks layers.
- The forward pass computes the prediction. Backpropagation multiplies local slopes with the chain rule, from the loss back to each parameter, reusing shared factors.
- One neuron cuts with a straight line. A hidden layer re-describes the inputs so that the next layer's straight cut becomes a bent boundary, which is how XOR becomes solvable.
:::
