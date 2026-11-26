---
slug: svm-lab
title: SVM lab
kind: simulator
simulator: svm-lab
minutes: 25
---
::: intro
- Predict how dragging a support vector, or any other point, changes the margin, then check it in the lab.
- Explain what C does to the margin and the number of support vectors, and what gamma does to a curved boundary.
- Compare Linear and RBF boundaries on generated shapes and on real penguins, and check the result on a fresh sample.

Before you start: read "Margins and support vectors" and "Soft margins and kernels".
:::

## What the lab shows
*What do you see the moment the SVM lab opens?*

The lab opens on two generated blobs: 40 points per class, 80 in all. 30% of them, 24, are held out. The lab never trains on those; it only scores them, so you can compare the model on points it has seen and on points it has not. The other 56 are the training points.

The model is the one from "Soft margins and kernels": a Linear kernel with C 0.1. Under the title the lab prints what it learned. 13 of the 56 training points are support vectors, the margin width is 2.10, and the accuracy is 100.0% on the training points and 95.8% on the held-out points, which is 23 of 24 right.

The margin width is the 2 / |w| of "Margins and support vectors". Here |w| = 0.951, so the width is 2 / 0.951 = 2.10.

Every experiment follows one routine: predict, change one thing, explain the result, then repeat it on the real penguins and on a new sample.

## Reading the picture
*What do the shading, the lines and the marks mean?*

[[figure:svm-lab/reading-the-plot|The lab at its defaults, with a key to every mark and the numbers it prints.]]

The **shading** shows what the model predicts at each place: blue where it says class A, pink where it says class B. The solid line is the decision boundary, where the score is 0. The two dashed lines are the edges of the street, where the score is -1 and +1.

A dot is a class A training point, a diamond is a class B training point, and a cross is a held-out point of either class, in its class color. A ring round a point marks a support vector. As in "Soft margins and kernels", that is a training point on an edge of the street, inside it, or on the wrong side of the line.

With the RBF kernel the boundary curves and the lab draws no dashed lines, because the gap between the edges is not the same everywhere. Its readout says "A curved boundary has no single margin width."

## Move a support vector
*What happens to the street when you drag a circled point?*

[[figure:svm-lab/moving-a-support-vector|Three fits at C 10. Left: the start. Middle: the circled diamond dragged toward the line. Right: it dragged away. The arrow shows the drag.]]

Set C to 10. Only three points stay circled and the margin width is 1.38. The circled diamond nearest the middle, at about x 0.35 and y 0.31, helps hold the street in place.

Drag it toward the line, to about x 0 and y 0, and the margin falls to 0.91. The street has to squeeze between that diamond and the two circled class A points. Push it a little past the line, to about x -0.3 and y -0.2, and the width is 0.55.

Drag it away, to about x 1.5 and y 1.5, and the margin grows to 1.62. The point is no longer on the street, so another diamond, the one at about x 0.6 and y 0.4, takes over as the circled one. This is the claim of "Margins and support vectors": move a support vector and the boundary moves with it.

> Watch out: the same drag at C 0.1 leaves the margin at 2.10. The fold below explains why.

::: deeper Why a drag does little at C 0.1
Each support vector has a weight, alpha, between 0 and C. At C 0.1, 10 of the 13 support vectors sit inside the street and have their alpha stuck at the cap C = 0.1. A capped point pulls on the line with a limited force, and a drag cannot raise it. The other 3 have alphas of 0.038, 0.003 and 0.035 and sit exactly on an edge. At C 10 the three support vectors all sit on an edge, with alphas of 0.63, 0.42 and 1.06, and each one pulls with its full, uncapped force. That is why a drag moves the street at C 10. At C 0.1 the 3 points on the edges alone fix the line, so moving a point that sits inside the street barely moves it.
:::

## Points that are not support vectors
*Which points can you move without changing anything?*

Keep C at 10 and press **Put points back**. Drag the right-most diamond, at about x 2.7 and y 0.6, up to about x 2 and y 2.5. It was far from the street and it is still far from it. Nothing changes: the status line still says 3 of 56 and a margin width of 1.38.

Now drag a held-out cross. Take the class B cross at about x 1.8 and y 0 and drag it across the line to about x -2 and y 0. The margin width and the circled points still do not change. Only the held-out accuracy moves, from 100.0% to 95.8%.

The model never trained on that cross, so it cannot shape the boundary. It can only be scored. With 24 held-out points, one wrong point costs 1 / 24 = 4.2 percentage points.

> Key idea: the boundary is decided by the support vectors alone. Training points far from the street, and held-out points, can be moved anywhere and the street stays put.

## C: a narrower street and fewer support vectors
*What does C do to the margin and to the count?*

[[figure:svm-lab/three-values-of-c|The same points at three values of C. As C grows the street narrows and fewer points hold it.]]

Press **Reset** and read 13 support vectors and a margin of 2.10 at C 0.1. Raise C to 10 and the margin falls to 1.38 and the support vectors to 3. Lower C to 0.01 and the margin widens to 3.75 with 42 support vectors. Training accuracy stays at 100.0% in all three.

A small C makes a point inside the street cheap, so the street is wide and many points lie in it. A large C makes each one expensive, so the street narrows until few points are on or in it.

Raise C from 10 to 100 and nothing changes: still 1.38 and 3. No point is inside the street any more, so there is nothing left to squeeze.

> Watch out: a narrower street is not a better one. On the Overlapping blobs, moving C from 0.1 to 100 narrows the margin from 1.97 to 0.73 and cuts the support vectors from 31 to 14, but held-out accuracy falls from 83.3% to 79.2%.

## Linear against RBF
*When does a curved boundary help?*

[[figure:svm-lab/linear-against-rbf|Two rings at the lab's default C and gamma. A straight line cannot enclose the inner ring; the RBF boundary can.]]

Press **Reset**, then set **Generated shape** to **Two rings**. The Linear kernel, at the default C 0.1, scores 60.7% on training points and 54.2% on held-out points, close to guessing. A larger C does not rescue it: across the whole slider the best training accuracy is 64.3%, which is 36 of 56 points. A straight line cannot put one class inside the other.

Switch **Kernel** to **RBF (curved)**, with the default gamma 1. The boundary bends around the inner ring and both accuracies are 100.0%. The **Margin width (linear only)** row shows a dash.

The Moons are in between. At the same C 0.1 and gamma 1, Linear scores 73.2% on training points and 79.2% on held-out points; RBF scores 87.5% and 95.8%. The rule of "Soft margins and kernels" holds: a kernel lets a method built on straight lines draw a curve.

> Key idea: the kernel decides which boundaries are possible, and C and gamma decide which of them you get. Pick the shape first, then tune.

## Gamma and the held-out score
*What does a large gamma buy, and what does it cost?*

Use **Overlapping blobs**, the **RBF (curved)** kernel and C 10. At gamma 0.1 the model has 18 of 56 support vectors, training accuracy 87.5% and held-out accuracy 79.2%. At gamma 1 it has 24 support vectors and the training accuracy is 94.6%. At gamma 10 it has 50 support vectors and the training accuracy is 100.0%. Held-out accuracy stays at 79.2%, which is 19 of 24.

A large gamma lets the curve wrap each training point in its own small patch, so training accuracy tends to rise. The held-out points show whether the wrapping learned anything. Here it did not.

Press **New sample** once to check. At gamma 0.1 that sample gives 82.1% on training points and 79.2% on held-out points. At gamma 10 it gives 100.0% and 66.7%. This is the overfitting that "Soft margins and kernels" showed with its three gamma panels.

> Worked example: 66.7% is 16 of 24 held-out points. Going from 79.2% (19 of 24) to 66.7% means three more wrong, each worth 4.2 points.

## Penguins: C and the kernel
*Do the rules about C and the curve hold on real data?*

Press **Reset**, set **Data** to **Penguins (real)** and keep the Linear kernel. The lab compares Adelie with Chinstrap by bill length and bill depth, each standardized with the training penguins only. 219 of the 220 penguins of those two species have both measurements, and the lab shows 40 of each.

At C 0.1, 24 of the 56 training penguins are support vectors and the margin is 1.65. At C 10 there are 4 and the margin is 0.42. Press **New sample** three times: across the four samples, C 0.1 gives 24 to 29 support vectors and a margin of 1.64 or 1.65, and C 10 gives 4 to 7 and 0.36 to 0.46. A larger C again gives a narrower street and fewer support vectors.

Now keep C at 10 and compare kernels on the same four samples. Linear scores 100.0% held-out on all four. RBF with gamma 10 scores 100.0% training on all four but 91.7%, 95.8%, 91.7% and 91.7% held-out, and needs 47 of the 56 penguins as support vectors on the first sample, against 4 for the line. A straight line is enough here, and the bend only memorizes the training penguins. The gaps are one or two penguins out of 24, so this is a small check, not a proof.

> Key idea: ask whether the data needs a curve before you pay for one. A simpler model that scores as well on held-out points is the better choice.

::: remember
- Moving a support vector moves the street. At C 10, dragging the circled diamond from x 0.35, y 0.31 to the middle cut the margin from 1.38 to 0.91. Points far from the street and held-out points change nothing.
- A larger C gives a narrower street and fewer support vectors (2.10 to 1.38, and 13 to 3, from C 0.1 to 10), but not always a better model.
- RBF can draw curves that a straight line cannot (100.0% against 60.7% training accuracy on Two rings, at C 0.1), but a large gamma tends to raise training accuracy without raising held-out accuracy. Check on held-out points and on a fresh sample.
:::

@@lab

## Lab: support vector machine
You start with 80 generated points in two blobs, 56 for training and 24 held out. The model is a Linear kernel with C 0.1. You drag points, change C, gamma and the kernel, and watch the margin, the circled support vectors and the accuracy update.

### Controls
- **Data** switches between **Generated data** and **Penguins (real)**. The real data compares Adelie with Chinstrap by bill length and bill depth, standardized. Rows with a missing value are left out, and the note under the control says how many.
- **Generated shape** (only with generated data) picks **Two blobs**, **Overlapping blobs**, **Two rings** or **Moons**. It starts on **Two blobs**.
- **Kernel** picks **Linear (straight line)** or **RBF (curved)**. It starts on Linear.
- **C (penalty for points inside the margin)** is a log slider from 0.01 to 100. It starts at 0.1.
- **Gamma (how tightly the RBF curve bends)** is a log slider from 0.01 to 10. It starts at 1. It shows only when **Kernel** is **RBF (curved)**.
- **New sample** draws a new set of points of the same shape, or a new set of penguins. Your drags are cleared and your settings stay.
- **Put points back** returns every dragged point to where it started.
- Drag a point with the mouse or your finger, and the model retrains as you move it. With the keyboard, focus the plot, press an arrow key to select the nearest point in that direction, press Enter to pick it up, move it with the arrow keys (Shift for bigger steps), and press Enter or Escape to put it down.
- **Fullscreen** enlarges the lab. **Reset** returns to **Generated data**, **Two blobs**, **Linear (straight line)**, C 0.1, gamma 1 and the first sample, and clears the Quick Quiz.
- **Quick Quiz** is the button under the Parameters card. It holds one question: "If you make C much larger, what happens to the margin and to the number of support vectors?" Pick an answer on the Linear kernel, then raise C by a lot, for example from 0.1 to 10, and the box checks your answer (or press **Check answer**). Change nothing else between picking an answer and raising C.

### Reading the screen
- The legend names every mark: **Class A (dot)** and **Class B (diamond)** (with the real data, **Adelie** and **Chinstrap**), **Cross: held-out point, not used for training**, **Circled: support vector**, **Decision boundary**, and, with the Linear kernel only, **Margin lines**. The shading shows what the model predicts.
- The status line reads, for example, "13 of 56 training points are support vectors. Margin width 2.10. Accuracy: 100.0% on training points, 95.8% on held-out points." With **RBF (curved)** the margin sentence becomes "A curved boundary has no single margin width." Beside it, a count such as "56 training points, 24 held-out".
- The line under it tells you what to try, and while you drag it gives the point's position, for example "Dragging point 63 (Class B, training): x 0.35, y 0.31."
- The table **What the model learned** has the columns **Reading** and **Value** and the rows **Kernel**, **C**, **Gamma (RBF only)**, **Training points**, **Held-out points**, **Support vectors** (for example "13 of 56"), **Margin width (linear only)**, **Training accuracy** and **Held-out accuracy**.
- If the penguin data cannot be loaded, the lab says "Could not load the penguin data, so the generated data is shown. Pick Penguins again to retry."

### Experiments
Start each one with **Reset**, and read the numbers off the status line or the table. One held-out point is worth 4.2 points of held-out accuracy, so small differences there are noise.

1. **Move a support vector.** Predict: at C 10, if you drag the circled diamond nearest the middle (about x 0.35, y 0.31) toward the line, does the margin get wider or narrower? Setup: drag **C (penalty for points inside the margin)** to 10. Three points are circled and the margin width is 1.38. Drag the diamond to about x 0, y 0: the margin width falls to 0.91. Drag it to about x -0.3, y -0.2: 0.55. A little farther, about x -0.6, y -0.4, the width is back up at 1.05 and **Training accuracy** falls to 98.2%, because the line gives up that one point. Press **Put points back** and drag the diamond away to about x 1.5, y 1.5: the margin widens to 1.62 and a different diamond is circled. Explain: which points hold the street? Then set C to 0.1 and repeat the first drag: the margin stays 2.10. Why does C matter here?
2. **Points that do not count.** Predict: what changes if you drag a point that is not circled, and what if you drag a held-out cross? Setup: C at 10, then **Put points back**. Drag the right-most diamond (about x 2.7, y 0.6) to about x 2, y 2.5: nothing changes, still 3 of 56 and a margin of 1.38. Now drag the class B cross at about x 1.8, y 0 to about x -2, y 0: the margin and the circled points stay the same, and **Held-out accuracy** falls from 100.0% to 95.8%. Explain why a held-out point cannot move the boundary.
3. **C and the number of support vectors.** Predict: open **Quick Quiz** and pick an answer before you touch anything. What does a much larger C do to the margin and to the support vectors? Setup: drag C from 0.1 to 10. The box answers: the margin width goes from 2.10 to 1.38 and the support vectors from 13 to 3. Try C 0.01 (3.75 and 42 of 56) and C 100 (1.38 and 3 again). Explain why the count falls, and why 10 and 100 look the same. Then set **Generated shape** to **Overlapping blobs** and compare C 0.1 with C 100: the margin goes from 1.97 to 0.73, the support vectors from 31 to 14, and **Held-out accuracy** from 83.3% to 79.2%. Does a bigger C help here?
4. **Linear against RBF.** Predict: can a straight line separate the rings? Setup: set **Generated shape** to **Two rings**. Read the Linear kernel at C 0.1: 60.7% training and 54.2% held-out. Slide C anywhere: the best training accuracy is 64.3%. Switch **Kernel** to **RBF (curved)** (gamma 1): 100.0% and 100.0%, and **Margin width (linear only)** shows a dash. Try **Moons** as well, with C 0.1 and gamma 1: Linear gives 73.2% and 79.2%, RBF gives 87.5% and 95.8%. Explain what the kernel changed.
5. **Gamma and overfitting.** Predict: as **Gamma (how tightly the RBF curve bends)** goes from 0.1 to 10, what happens to the training accuracy and to the held-out accuracy? Setup: **Generated shape** **Overlapping blobs**, **Kernel** **RBF (curved)**, C 10. Read 0.1, 1 and 10: training 87.5%, 94.6%, 100.0%; held-out 79.2% each time; support vectors 18, 24, 50. Press **New sample** once and compare gamma 0.1 and 10 again: training 82.1% then 100.0%, held-out 79.2% then 66.7%. Explain what the boundary does at gamma 10.
6. **Penguins and a fresh sample.** Predict: does a larger C still give a narrower margin and fewer support vectors on real data? Setup: **Data** **Penguins (real)**, **Kernel** **Linear (straight line)**. At C 0.1 you read 24 of 56 and a margin of 1.65; at C 10, 4 of 56 and 0.42. Press **New sample** three times and check it on each: 26 and 1.65 then 7 and 0.45; 26 and 1.65 then 5 and 0.36; 29 and 1.64 then 6 and 0.46. Now compare kernels at C 10 on each sample: Linear gives 100.0% held-out every time, RBF with gamma 10 gives 100.0% training but 91.7%, 95.8%, 91.7% and 91.7% held-out. Which kernel would you keep for these two measurements, and how sure are you after four samples?
