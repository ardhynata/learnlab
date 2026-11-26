---
slug: vision-lab
title: Vision lab
kind: simulator
simulator: vision-lab
minutes: 30
---
::: intro
- Train a small convolutional network on generated shape images, with and without augmentation.
- Test it on darker, brighter, rotated and shifted images, and match each augmentation to the change it covers.
- Judge a result across several seeds, and score a dragged box against the true box with IoU.

Before you start: read "Convolutions and CNNs" and "Augmentation, transfer and detection metrics" in this course. The first gives you the network and its weight count, the second the augmentations, the stress test and IoU.
:::

## Four shapes in 144 pixels
*What does the network learn, and from which pictures?*

The Vision lab draws its own 12 × 12 grey pictures of four shapes: a ring, a bar, a cross and a triangle. Each shape is about 5 to 7 pixels tall (the bar is only 1 pixel wide), bright (0.9) on a dark background (0.1), with a little noise, and its centre wanders up to one pixel from the middle. Every training picture is centred and bright, on purpose.

By default there are 200 training, 80 validation and 120 test pictures, 30 of each shape in the test set. Guessing is right 1 time in 4, so 25% is the floor.

The model is the small CNN of "Convolutions and CNNs": a 3 × 3 convolution with 4 filters, ReLU, 2 × 2 max pooling, and a dense layer with 4 scores.

> Worked example: the lab reports 444 weights. The convolution has 36 weights and 4 biases, 40 in all. A 12 × 12 picture gives 10 × 10 maps, pooling makes them 5 × 5, so 4 × 25 = 100 numbers reach the dense layer. That layer has 100 × 4 = 400 weights and 4 biases, 404 in all. In total 40 + 404 = 444.

## Four ways the world can change
*How does the lab change a test picture, and why the same way every time?*

A test picture can be changed in four ways, each with a strength you choose. **Darker** multiplies every pixel by 1 minus the share of light removed, subtracts 0.1 and floors the result at 0. **Brighter** adds a number to every pixel and clips at 1. **Rotated** turns the picture by an angle, alternating sides. **Shifted** moves it by whole pixels in one of eight directions that take turns.

None of these uses a random draw. The change depends only on the picture's number, so two networks are scored on identical pictures.

> Worked example: take 60% less light. A shape pixel of 0.9 becomes 0.9 × 0.4 − 0.1 = 0.26, and a background pixel of 0.1 becomes 0.1 × 0.4 − 0.1 = −0.06, floored at 0. The gap shrinks from 0.8 to 0.26. With brightness +0.35, the shape pixel is 1.25, clipped to 1, and the background is 0.45, so the gap is 0.55.

[[figure:vision-lab/test-changes-and-copies|One ring under the four test changes (top row), and a training picture with four random augmented copies (bottom row).]]

## A new copy every epoch
*What does each augmentation switch do to the training pictures?*

The lab has four augmentation switches, all off at the start. **Flip left-right** mirrors a picture half of the time. **Random shift** moves it by up to a chosen number of pixels in each direction. **Brightness jitter** multiplies the pixels by a random gain and adds a random offset. **Small rotation** turns it by a random angle up to a chosen limit.

Each epoch every training picture is changed again, so the network never sees the same copy twice. The bottom row of the figure above shows four such copies of one picture. The label stays true: a shifted ring is still a ring.

Flip hardly matters here, because all four shapes are the same left to right. As in the last lesson, only training pictures are changed: validation and test pictures stay as they were, and both loss curves are measured on clean pictures.

> Key idea: an augmentation teaches the network that one kind of change should not change the answer. It teaches nothing about changes you did not switch on.

## Match the augmentation to the change
*Which way of training helps which kind of test?*

Train five networks and test each on the five conditions. The table below averages ten seeds (a seed is the number that fixes the random pictures and the random start), with every setting at its start value.

[[figure:vision-lab/which-augmentation-helps|Mean test accuracy over seeds 1 to 10 for five ways of training and five test conditions. The outlined cells are the matching ones.]]

Read it along the outlined cells. Without augmentation, shifted pictures score about 32%, close to guessing. **Random shift** lifts them to 92%. **Brightness jitter** brings both darker and brighter pictures to about 99%. **Small rotation** lifts rotated pictures from 79% to 91%.

Now read the cells that are not outlined. The network trained with shifts scores 25% on dark pictures, which is guessing: it never saw a dim picture. The network trained with brightness jitter still scores 31% on shifted ones. **Each augmentation helps mostly the change it covers.**

The last row switches all three on. Every test condition is now decent, but none matches its specialist, and clean accuracy falls from 99% to 93%.

## What augmentation costs
*Why can clean accuracy fall, and how far does the cover reach?*

A network with 444 weights has a fixed amount of room. Without augmentation it can memorize 200 pictures: its training loss ends near 0.00. With all three switched on, the same 30 epochs must cover a far larger family of pictures, and the loss on clean pictures ends near 0.29 on seed 1, with clean accuracy at 85% against 98%.

Augmentation also reaches only as far as you trained it. A network trained with shifts of up to 2 px scores 95% at 1 px, 87% at 2 px, 63% at 3 px and 36% at 4 px (seed 1).

Finally, copies are not new objects. With all three switches on and only 100 training pictures, shifted accuracy is 52% on seed 1, against 82% with 200 pictures and 84% with 400.

> Watch out: use the range you expect to meet. A rotation limit of ±45° for photos that tilt by 10° spends the network's room on pictures it will never see.

## Do not trust one run
*How far can you trust a score from 120 test pictures?*

Each test picture is worth about 0.8 points. A score of 80% on 120 pictures has a standard error (the typical size of the luck in a score) of about 3.7 points, so a gap of 3 or 4 points can be luck.

The figure shows the network trained without augmentation on ten seeds. Clean accuracy is always 115 to 120 right of 120, about 96% to 100%. Shifted accuracy stays between 24% and 39%: that result repeats. Darker accuracy does not: 27% on seed 1 and 98% on seed 2. The network never saw dim pictures, so its answer depends on its random start.

[[figure:vision-lab/seed-spread|One network trained without augmentation, ten seeds, five test conditions. Shifted always fails; darker lands anywhere from 27% to 98%.]]

Read the **Confusion matrix** as well as the accuracy. On seed 1 almost all the dark pictures are called bars (118 of 120): the bar row is perfect and only 2 rings are right, which gives 32 of 120, or 27%.

> Key idea: trust an effect that repeats on a fresh seed and is larger than a few points. Treat a result that changes with the seed as luck. These are results on a made-up task; real photos vary in more ways.

## The detection toy
*How does IoU score a box that you drag over the picture?*

The chosen picture carries two boxes. The solid one is the true box, found from the pixels of the shape, and it moves with the shape when the picture is shifted or rotated. The dashed one is yours: drag it, or use the arrow keys. The lab shows the IoU of "Augmentation, transfer and detection metrics" and compares it with the **IoU threshold**. There is no network inside this toy: you are the detector.

> Worked example: test picture 1 (seed 1) is a bar. The true box starts at x 6, y 3 and is 1 wide and 7 tall, so its area is 7. The first predicted box starts at x 6.35, y 4 and is 1.5 wide and 7.5 tall, area 11.25. The overlap is 0.65 wide (from 6.35 to 7) and 6 tall (from 4 to 10), area 3.9. The union is 7 + 11.25 − 3.9 = 14.35, so IoU = 3.9 / 14.35 = 0.27. At threshold 0.50 that is a false positive, and the bar is missed (a false negative).

## What a thin box teaches
*Why does a small slip cost a thin shape so much?*

Move the box 0.5 px left and 1 px up. The overlap becomes 1 × 7 = 7, the union is 7 + 11.25 − 7 = 11.25, and IoU = 0.62: a true positive. A bar only 1 pixel wide punishes any sideways slip, while a wider shape forgives more.

[[figure:vision-lab/iou-on-the-grid|The bar of test picture 1 with the true box (solid) and the predicted box (dashed): IoU 0.27 at first, 0.62 after a small move.]]

::: deeper More room, fewer losses
With 8 filters (884 weights) and 60 epochs and all three switched on, seed 1 reaches 97% on clean pictures and 95% on darker ones, against 85% and 72% with 4 filters and 30 epochs.
:::

::: deeper Why 1 pixel is forgiven and 2 is not
Pooling takes the maximum of each 2 × 2 block of the map, so a feature that moves 1 pixel often stays inside the same block and the pooled map hardly changes. A move of 2 pixels always pushes it into the next block, and the dense layer reads each block position with its own weights, so it sees something new. In the lab, seed 1 without augmentation scores 78% at 1 px, 35% at 2 px, 14% at 3 px and 23% at 4 px. Treat this as a rough picture, not a proof: the eight shift directions also mix horizontal and diagonal moves.
:::

::: deeper How noisy is a score on 120 pictures?
For a true accuracy p, a score on n pictures has a standard error of about sqrt(p × (1 − p) / n). With p = 0.8 and n = 120: sqrt(0.8 × 0.2 / 120) = sqrt(0.00133) = 0.0365, or 3.7 points. About two thirds of runs land within one standard error of the truth, so 81% and 78% on the same 120 pictures are not a real difference. This counts only the sampling of the test pictures. A different training seed adds more spread, as the seed figure shows.
:::

::: deeper Dense network on pixels
The **Model** control also offers a dense network. It has no convolution, so the lab builds one small network per shape, 144 pixels into 16 hidden units into 1 score. Each one has 144 × 16 + 16 = 2,320 weights in the hidden layer and 16 + 1 = 17 in the output, 2,337 in all, so the four have 4 × 2,337 = 9,348 weights, about 21 times the 444 of the CNN. On seed 1 it scores 25% on shifted pictures without augmentation, and 88% with **Random shift** on: about what the CNN reaches (87%). Augmentation did that work; convolution mainly saved weights.
:::

::: remember
- The lab trains on centred, bright shapes and tests on darker, brighter, rotated and shifted copies. A clean score hides every failure the training never showed.
- Each augmentation mostly helps the change it covers and only as far as the range you trained; switching on all of them costs some clean accuracy.
- One run on 120 pictures is noisy. Trust an effect that repeats on a fresh seed, read the confusion matrix, and score boxes with IoU at a stated threshold.
:::

@@lab

## Lab: convolutions and augmentation
You train a small network on four generated shapes, switch augmentations on, and watch how it copes with darker, brighter, rotated and shifted test pictures. The network starts untrained. Nothing trains until you press **Train** or **Compare with and without augmentation**. This lab draws its own pictures, so it has no real-data choice: the check on something new is a fresh **Seed**, which gives new training pictures, new test pictures and a new random start.

### Controls
- **Model** chooses **Small CNN (convolution)** or **Dense network on pixels**. **Convolution filters** (2 to 8, starts at 4) applies to the CNN. **Hidden units** (8 to 32, starts at 16) applies to the dense network.
- **Training images** (40 to 400, starts at 200) and **Seed** (1 to 99, starts at 1) set the data. Changing the model, its size, **Training images**, **Seed** or any augmentation setting resets the network, and the status says "Settings changed: the network was reset. Press Train."
- **Flip left-right**, **Random shift**, **Brightness jitter** and **Small rotation** are the augmentations, all off at the start. Each switch shows its strength when it is on: **Shift up to** (1 to 4 px, starts at 2 px), **Brightness strength** (±0.10 to ±0.60, starts at ±0.40) and **Rotate up to** (±5° to ±45°, starts at ±25°).
- **Epochs** (5 to 60, starts at 30) is the target. Raising it keeps the network; if you lower it after training, the status says the target is now lower and asks you to press **Train again**.
- **Train** runs the epochs. It becomes **Pause** while running and **Train again** after the target is reached. **Step (1 epoch)** trains one epoch. **Reset model** only resets the weights; it does not train. A bar under the buttons shows progress.
- **Test condition** is **Clean**, **Darker**, **Brighter**, **Rotated** or **Shifted**. **Test strength** reads "60% less light", "brightness +0.35", "25°" or "2 px" at the start, and each condition remembers its own strength. Changing either one re-tests the same network without retraining.
- **Compare with and without augmentation** trains two networks with the current settings, one with no augmentation and one with the current one, and puts both in the bar chart. It stays disabled until one augmentation is on, and **Train** becomes **Stop** while it runs. Results are kept, so repeating a comparison is instant.
- **Image grid and detection** is a folded group: **Images in the grid** (**Test images (with the test condition)**, **Training images**, **Training images after augmentation**), **Chosen image** and **IoU threshold** (0.30 to 0.90, starts at 0.50).
- On the plot: click an image to choose it, then drag the dashed box. With the keyboard, focus the plot; the arrow keys move the box, Shift with the arrow keys resizes it, Home resets it, Page Up and Page Down choose another image.
- **Fullscreen** enlarges the lab. **Reset** returns every control to its start and clears the Quick Quiz picks.
- **Quick Quiz** holds two boxes: "The network is trained on centred bright images only. How will accuracy on darker or shifted test images compare?" and "You train a second network with the augmentations you switched on. How does its accuracy on clean test images compare with the network trained without augmentation?" Pick an answer first, then train.

### Reading the screen
- The status line says "Not trained yet: the network is guessing, about 1 in 4 right. Press Train." and then, for example, "Epoch 30 of 30. Training accuracy 100%, validation accuracy 100%." The line below it is the detection toy, and the metric at its right is "Model size: 444 weights".
- The grid shows the pictures with their true shape. After training, a frame marks a **Correct prediction** or a **Wrong prediction**, and a wrong one also names the guess. The **Chosen image** has its own ring. How many pictures the grid shows depends on the width of your screen.
- Under the grid, the chosen image carries the **True box** and the **Predicted box (drag it)**, with "True: …", "Predicted: bar (100%)" and the IoU.
- Next to it, a CNN shows **Learned filters (3×3) and feature maps of the chosen image**: each filter's nine weights (**Positive weight** and **Negative weight**), its feature map after ReLU and the map after max pooling. The dense network shows **First hidden units: weights on all 144 pixels** and each unit's output.
- **Loss while training** has the Training and Validation curves, both on clean pictures. **Accuracy by test condition** has one bar per condition (shortened on a narrow screen) for **No augmentation** and, once compared, **With the current augmentation**, with a dashed line at chance (25%). **Confusion matrix** is for the chosen test condition, with the recall of each shape at the right.

### Experiments
The numbers are for seed 1. Press **Reset** first so that yours match.

1. **A network that only saw the middle.** Predict: with no augmentation, which test conditions will fall well below clean accuracy? Pick an answer in the first Quick Quiz box, press **Train** and read **Accuracy by test condition**: Clean 98%, Darker 27%, Brighter 52%, Rotated 81%, Shifted 35%. Set **Test condition** to **Shifted** and move **Test strength** from 1 px to 4 px: 78%, 35%, 14%, 23%. Then choose **Darker** and open the **Confusion matrix**: the bar column holds almost everything. Explain 27%: the network calls nearly every dim picture a bar. Set Shifted back to 2 px before you go on: the lab remembers each condition's strength.
2. **Lighting.** Predict: if training pictures get random brightness changes, what happens to **Darker** and **Brighter**, and to **Shifted**? Switch on **Brightness jitter** and press **Compare with and without augmentation**. Darker goes 27% to 100%, Brighter 52% to 98%, Clean stays 98%, and Shifted stays near 34%. The second Quick Quiz box says "about the same". Open **Image grid and detection** and set **Images in the grid** to **Training images after augmentation** to see the copies. Explain why lighting augmentation cannot help a shift.
3. **Shift or rotation.** Predict: with only **Random shift** on, which bars rise? Switch **Brightness jitter** off, **Random shift** on and press **Compare with and without augmentation**. Shifted goes 35% to 87%, but Darker is still at the guessing level, 25%, and Clean falls to 93% (the second box says "lower"). Set **Test condition** to **Shifted** and raise **Test strength** to 3 px and 4 px: 63% and 36%. Now switch **Random shift** off and **Small rotation** on, compare again and set the test to **Rotated**: 81% rises to 89%, and at 35° and 45° it is 68% and 47%. Explain what the network was never trained for. Shifted is now at 4 px and Rotated at 45°.
4. **Everything on, and the price.** Press **Reset**. Predict: with all three on, will each condition beat its specialist? Switch on **Random shift**, **Brightness jitter** and **Small rotation** and compare: Clean 85%, Darker 72%, Brighter 79%, Rotated 77%, Shifted 82%. Look at **Loss while training**: the curves end near 0.29, where they ended near 0.00 and 0.02 without augmentation. Then set **Convolution filters** to 8 and **Epochs** to 60 and compare again: Clean 97%, Darker 95%, Brighter 93%, Rotated 78%, Shifted 89%, with "Model size: 884 weights".
5. **A box and a threshold.** Predict: will the starting dashed box on picture 4 pass the **IoU threshold** of 0.50? Open **Image grid and detection**, set **Images in the grid** to **Test images (with the test condition)** (experiment 2 may have changed it), set **Test condition** to **Clean** and **Chosen image** to 4, a triangle. The detail line gives IoU 0.48: a miss. Focus the plot and press the up arrow four times: IoU 0.64. Press the left arrow twice: IoU 0.74. Now raise **IoU threshold** to 0.75 and see it fail again. Then choose picture 1, a thin bar, which starts at 0.27. Explain why a thin shape is harder to box.
6. **A fresh seed.** Predict: which of the findings above will survive a new **Seed**? There is no **Real data** switch here, so a fresh seed is the check. Press **Reset**, set **Seed** to 2 and repeat experiments 1 to 3, reading the bars at the start strengths (2 px, 25°). Without augmentation: Clean 99%, Darker 98%, Brighter 68%, Rotated 77%, Shifted 34%, and the first Quick Quiz box now says only shifted images fell. **Brightness jitter** gives Darker 99% and Brighter 98%; **Random shift** gives Shifted 88% and Darker 25%; **Small rotation** gives Rotated 92%. Try **Seed** 3 too. Which results repeated and which moved? Finally press **Reset** (seed 1, 4 filters, 30 epochs), switch all three augmentations on, set **Training images** to 100 and compare: Shifted falls to 52%, where 200 images gave 82%.
