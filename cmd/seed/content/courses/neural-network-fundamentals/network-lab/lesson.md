---
slug: network-lab
title: Network lab
kind: simulator
simulator: network-lab
minutes: 30
---
::: intro
- Predict what a change to the network, its start or its optimizer will do to the loss, the gradients and the units, then check it in the network lab.
- Read the loss chart, the gradient chart and the inside view to tell a healthy run from one that is stuck, overfitting or dying.
- Repeat each idea on the real penguins and on a fresh sample before you trust it.

Before you start: read "Neurons and backpropagation" and "Activations, initialization and optimizers".
:::

## What the lab trains
*What is the network, and what does it learn from?*

The last two lessons built a network on paper: a forward pass, gradients by hand, then activations, starting weights and optimizers. The network lab lets you train one and watch it learn. It starts on **Two moons**, two interlocking half circles that no straight line can separate, with 60 points of each class. A seeded split keeps 84 of the 120 points as training points (dots) and holds out 36 validation points (crosses) that never train the network.

The starting network has 2 hidden layers of 8 units, ReLU, He initialization, and Adam at a learning rate of 0.01. One epoch is one update from all 84 training points. Count its parameters: the first hidden layer has 2 × 8 + 8 = 24, the second has 8 × 8 + 8 = 72, and the output unit has 8 + 1 = 9. That is 105, the number the lab shows.

Before training, the loss is 0.977 and the network classifies only 28.6% of the training points correctly, worse than a coin flip. After 400 epochs the loss is 0.002 on training and 0.006 on validation, and both accuracies are 100%.

## Four views of one run
*What does each part of the lab show?*

One run draws four pictures. Before you change a setting, ask which of them will react first.

[[figure:network-lab/four-views|The four views of the lab and the question each one answers.]]

- The **plot** shows what the network has learned: the shading is its prediction and the line is its decision boundary.
- The **loss chart** shows whether the network is learning, and whether what it learns carries over to the validation points.
- The **gradient chart** shows how much signal reaches each layer. With plain SGD, a layer whose gradient is tiny barely changes.
- The **inside view** draws the weights as lines and the output of each hidden layer as a histogram, and counts the units that have stopped working.

> Key idea: the plot tells you that something is wrong. The three charts tell you why, so read them in that order.

## The loss chart
*How do you read the training and validation loss?*

The loss is the log loss from "Log loss and fitting": the average of -ln of the probability the network gave to the true class. Lower is better. A network that answers 0.5 for every point has a loss of -ln 0.5 = 0.693, so a line stuck at 0.693 means nothing has been learned. The chart draws the training loss and the validation loss, and the gap between them is the story.

[[figure:network-lab/loss-gap|The same network on generated moons and on real penguins. On the penguins the validation loss turns up while the training loss keeps falling.]]

On two moons the lines fall together: at epoch 100 they are 0.081 and 0.149, and at epoch 400 they are 0.002 and 0.006. On the real penguins the same network behaves differently. The training loss keeps falling to 0.012, but the validation loss is lowest, about 0.10, near epoch 50 and then climbs to 0.227 at epoch 400. That rise is **overfitting**: the network starts to memorize its 84 training penguins instead of the pattern. The lab's **L2 strength** is the control that holds it back.

::: deeper Why 0.693 is the loss of knowing nothing
Log loss charges -ln p for the probability p given to the true class. A network that always says 0.5 gives p = 0.5 for every point, whatever its class, so the loss is -ln 0.5 = ln 2 = 0.693. In the lab the 84 training points hold 42 of each class, so answering 0.5 is also the best constant answer. A run that stays at 0.693 is no better than that constant.
:::

## The gradient chart
*What does a line far below the others mean?*

Backpropagation gives every weight a gradient. For each layer, the chart plots the mean absolute value of those gradients on a log scale: -2 means 0.01 and -4 means 0.0001. Layer 1 is the first hidden layer and the last line is the Output. A gradient of exactly 0 is drawn at -8, the bottom of the chart. With plain SGD, the size of a layer's gradient says how hard training pushes it, so a line at -5 means a layer that hardly moves. Adam rescales each step, so under Adam a low line does not mean a stalled layer (experiment 4).

[[figure:network-lab/gradient-layers|The gradient of each layer before any training, for 4 hidden layers of 8 units. With sigmoid the first layer starts about 45 times lower than with ReLU.]]

The figure compares two untrained networks, with 4 hidden layers of 8 units. With sigmoid, the first layer's gradient is 1.3e-4, which means 0.00013. With ReLU it is 5.9e-3, about 45 times larger. In both networks the Output line is the highest one, so do not judge a layer only against the output. Compare it with the same layer under another setting.

::: deeper Why the gradient chart uses a log scale
The layers differ by factors of 10 or more. On a straight axis that reaches the biggest gradient, 2.9e-3 in the sigmoid network, the first layer's 1.3e-4 would sit at 4.5% of the height, almost on the floor, and a smaller gradient would be invisible. A log scale gives each factor of 10 the same height, so a layer 100 times smaller is two gridlines lower.
:::

## Inside the network
*What do the diagram and the histograms show?*

The left of the inside view draws the network: one circle per unit and one line per weight. A bigger weight is a thicker line, blue if it is positive and pink if it is negative. A dashed empty circle is a **dead unit**: its slope is zero for every training point, so no gradient reaches its weights. On the right, one histogram per hidden layer shows everything that layer outputs, with a title such as "Layer 2 · mean 3.04 · dead 13%". With ReLU the word is dead. With tanh and sigmoid it reads saturated, outputs pinned at the ends of their range where the slope is near zero.

[[figure:network-lab/dead-units|The same ReLU network after 400 epochs of Adam at learning rate 0.01 and at 1. Dashed circles are dead units.]]

A healthy network can still have a dead unit: at learning rate 0.01, 1 of the 8 units in Layer 2 is dead and the loss ends at 0.002. At learning rate 1, 6 of those 8 (75%) are dead, and the loss stays at 0.291.

## What failures look like
*Which picture gives away which failure?*

The last lesson ended with a table of symptoms and likely causes. In the lab each one has a face. These are the ones you will meet in the experiments.

| What you see | Likely cause | First thing to try |
|---|---|---|
| Loss flat at 0.693, every gradient line at -8 | Every weight starts at 0 | He or Xavier initialization |
| Loss near 0.69 for 400 epochs, hidden-layer gradient lines below -3 | Plain SGD with tiny starting weights, or sigmoid layers that shrink the signal | ReLU, a larger start, or Adam |
| Loss falls, then stalls above 0.2, many dashed circles | Learning rate too high for ReLU: units died | A smaller rate, or tanh |
| Training loss falls, validation loss climbs | Overfitting | A larger L2 strength, fewer epochs, fewer units |
| Training accuracy stays near 88% | Too few units to bend the boundary | More units |

> Watch out: one chart rarely settles it. A flat loss can come from a zero start or from dead units, and only the gradient chart and the inside view tell them apart.

## Predict, change, explain, transfer
*How do you use the lab so that it teaches you something?*

Every experiment in the guide below follows four steps. First **predict**: say what the loss, the gradient lines or the units will do before you touch a control. The lab has a Quick Quiz for one of these guesses. Then **change** one setting at a time. Then **explain** the result with an idea from the last two lessons, and write down the number that surprised you. Last, **transfer**: repeat the idea on the real penguins and on a fresh sample, because one run on one sample is an anecdote.

The guide gives the numbers you should see for the default sample and the default weights. Press **Reset** before each experiment so that yours match.

> Key idea: a result you have seen on one sample is a guess. Repeat it on a new sample before you call it a finding.

::: remember
- The loss chart says whether the network learns and whether it generalizes: flat at 0.693 means nothing was learned, and a rising validation line means overfitting.
- The gradient chart and the inside view say why: a layer far below the rest barely learns, and a dead unit passes no gradient at all.
- Predict first, change one setting, explain the result, then check it on the penguins and on a new sample.
:::

@@lab

## Lab: neural network lab
You train a small network to separate two classes that no straight line can split, and you watch four views of the run: the plot, the loss chart, the gradient chart and the inside view. The lab is deterministic: the same settings, the same sample and the same weights give the same run.

### Controls
- **Data** switches between **Generated data** and **Penguins (real data)**. The real data is Adelie against Chinstrap penguins, by bill length and bill depth. Switching data builds a new network at epoch 0.
- **Generated shape** (with generated data): **Two moons**, **Circles**, **XOR (checkerboard)** or **Spiral**. It starts on **Two moons**.
- **Hidden layers** (1 to 4; starts at 2) and **Units per hidden layer** (2 to 16; starts at 8) set the size of the network. The detail line above the plot gives the parameter count.
- **Activation** is **ReLU**, **tanh** or **sigmoid** (starts on **ReLU**).
- **Initialization** is **Zeros (every weight 0)**, **Small random (std 0.01)**, **Xavier** or **He** (starts on **He**).
- **Optimizer** is **SGD**, **SGD with momentum** or **Adam** (starts on **Adam**).
- **Learning rate** (0.001 to 1, on a log scale; starts at 0.01), **L2 strength** (0 (off) to 0.1; starts off) and **Epochs to run** (50 to 2000; starts at 400) set the training.
- **New sample** draws another set of points (or penguins). **New weights** draws another random start for the same points. **Restart** goes back to epoch 0 with the same points and the same start.
- A note under the controls says which settings keep the weights: **Optimizer**, **Learning rate**, **L2 strength** and **Epochs to run** can change in the middle of a run, and any other setting builds a new network at epoch 0.
- The toolbar has **Run** (it reads **Pause** while running and **Run again** when the run is finished), **Previous step**, **Next step**, **Speed**, **Fullscreen** and **Reset**. **Run again** starts over from epoch 0, so to run past the end, raise **Epochs to run** first. **Reset** returns every control, the sample and the weights to their start.
- **Quick Quiz** is the button that holds one question: "With sigmoid activations and 4 hidden layers, what happens to the gradients in the first layer?" Pick an answer, set the lab as the quiz says, run at least 10 epochs, and press **Check answer**.

### Reading the screen
- The **plot** shades the network's prediction and draws the decision boundary as a line. Dots are the training points and crosses are the validation points. The legend gives **Class A** and **Class B** (**Adelie** and **Chinstrap** on the real data), **Training points (dots): 84**, **Validation points (crosses): 36** and **Decision boundary**.
- The status line reads, for example, "Epoch 400 of 400. Loss 0.002 on training, 0.006 on validation. Done." Below it, the detail line gives "Accuracy 100.0% on training points, 100.0% on validation points. 105 parameters." At epoch 0 it says "Epoch 0 of 400. This is the network before training: press Run." If the weights ever blow up, it says the loss is no longer a number and that the learning rate is too high.
- **Loss during training** draws the **Training loss** and the **Validation loss** against the **Epoch**, as log loss. A very large loss is drawn at the top of the chart.
- **Gradient size by layer** draws one line per layer, on a scale of **log10 of mean |gradient|**. The legend gives each layer's value now, for example "Layer 1: 0.039" at epoch 0.
- **Inside the network** has the diagram on the left (**Input**, **Hidden 1**, **Hidden 2**, **Output**; line width is weight size, blue positive and pink negative; a dashed empty circle is a dead unit) and one histogram per hidden layer on the right, with a title such as "Layer 2 · mean 3.04 · dead 13%". The axis reads **activation value**. With tanh or sigmoid the title says saturated instead of dead.

### Experiments
The numbers below are for the first sample and the first weights. Press **Reset** before each experiment, set the controls it names, and press **Run**. At the default speed a 400-epoch run takes about 3 seconds.

1. **How many units does a bend need?** Predict: with 1 hidden layer of 2 units, will the network still separate the two moons? Set **Hidden layers** to 1 and **Units per hidden layer** to 2, then run. The status reads "Loss 0.304 on training, 0.492 on validation" and the detail line "Accuracy 88.1% on training points, 72.2% on validation points. 9 parameters." Now set **Units per hidden layer** to 8: loss 0.017 and 0.023, 100.0% on both, 33 parameters. Press **New weights**, run at each size (change **Units per hidden layer** between the runs), and repeat four times. The validation accuracy with 2 and with 8 units is 75.0% and 100.0%, 75.0% and 100.0%, 69.4% and 97.2%, and 69.4% and 100.0%. Explain: every unit adds one more piece to the boundary, and 2 units cannot make the curve. Why is this not overfitting, when the training accuracy is also low?
2. **Which optimizer?** Predict: at **Learning rate** 0.01, which of **SGD**, **SGD with momentum** and **Adam** has the lowest loss at epoch 400? For each one, set **Optimizer**, press **Restart** and **Run**. The training and validation loss are 0.362 and 0.545 for SGD, 0.255 and 0.408 for momentum, and 0.002 and 0.006 for Adam. Then choose **SGD**, move **Learning rate** to 1, press **Restart** and **Run**: the loss is 0.002 and 0.007, as good as Adam. Explain it with the step size: the first layer's gradient starts at 0.039, so SGD at 0.01 steps by 0.01 × 0.039 = 0.0004, while Adam steps by about the learning rate, 0.01, which is 25 times more.
3. **Is zero a safe start?** Predict: what is the loss at epoch 400 if every weight starts at 0? Set **Initialization** to **Zeros (every weight 0)**. The loss is 0.693 on both sets and the accuracy is 50.0%. All three gradient lines sit at the bottom, -8, and both histogram titles say dead 100%. Every weight is 0, so no unit passes a signal and every gradient is exactly 0. Adam cannot help, since it rescales a gradient and 0 stays 0. Now set **Initialization** to **Small random (std 0.01)**, **Optimizer** to **SGD**, and **Learning rate** to 0.1. The loss is still 0.693 at epoch 400, and the gradient lines start near -5 (1.3e-5, 5.1e-6 and 4.2e-5). With **He** and the same SGD settings, the loss is 0.226.
4. **Do the gradients vanish?** Predict: pick an answer in the **Quick Quiz**. Set **Activation** to **sigmoid**, **Hidden layers** to 4, **Optimizer** to **SGD** and **Learning rate** to 0.1, run at least 10 epochs and press **Check answer**. It reports 1.3e-4 for the first layer and 2.8e-3 for the output layer, about 22 times smaller. Run to epoch 400: the loss is still 0.689 on training and 0.691 on validation. Now set **Activation** to **ReLU** and run: at epoch 0 the first layer's gradient is 5.9e-3, about 45 times larger, and the loss at epoch 400 is 0.038 and 0.090. Last, go back to **sigmoid** and set **Optimizer** to **Adam** and **Learning rate** to 0.01: the loss reaches 0.001. Explain: the sigmoid slope is at most 0.25, and Adam gives every weight a step of about the learning rate however small its gradient is.
5. **Can a unit die?** Predict: a larger step should train faster, so will the loss at epoch 400 be lower than 0.002, the value at 0.01? Set **Learning rate** to 1 with ReLU and Adam, and run. The loss climbs to about 1.8 by epoch 10, then settles: at epoch 400 it is 0.291 on training and 0.404 on validation, with accuracy 82.1% on training points. The Layer 2 histogram reads dead 75%, six dashed circles, and the gradient lines fall to about -5, -6.5 and -5. Now set **Activation** to **tanh** and run: the loss is 0.000 and the accuracy 100.0%, because a tanh unit saturates, yet its slope stays above zero, so some gradient still flows. Press **New weights** four times with ReLU: the loss ends between 0.255 and 0.561, with 38% to 88% of Layer 2 dead.
6. **Penguins and a new sample.** Predict: on the real penguins, will the validation loss keep falling as the training loss does? Press **Reset**, set **Data** to **Penguins (real data)** and run. The note says 1 of the 220 Adelie and Chinstrap rows has a missing value, which leaves 219 penguins, and the lab draws 60 of each species. At epoch 400 the loss is 0.012 on training and 0.227 on validation, and the validation line on the loss chart turns up near epoch 50 (set **Epochs to run** to 50 and the loss is 0.103). Set **L2 strength** to 0.01 and run again: 0.082 and 0.033. Now press **New sample** three times, and run with **L2 strength** at 0 (off) and at 0.01 each time. The validation loss without L2 is 0.027, 0.162 and 0.179. With 0.01 it is 0.042, 0.068 and 0.072. L2 helped on three of four samples and hurt on one. Judge by the loss, not the accuracy: with 36 validation points the accuracy moves in steps of 2.8%. What does that say about checking an idea on one sample?
