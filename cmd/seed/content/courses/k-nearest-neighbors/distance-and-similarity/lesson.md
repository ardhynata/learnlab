---
slug: distance-and-similarity
title: Distance and similarity
kind: simulator
simulator: distance-playground
minutes: 20
---
::: intro
- Compute the Euclidean, Manhattan, Chebyshev and cosine distances between two points by hand.
- Describe the shape of "all points at the same distance" for each one.
- Predict when a different distance picks a different nearest point, and check it in the Distance playground lab.

Before you start: read "How k-NN decides". It uses distance to find neighbors; this lesson looks at the distance itself.
:::

## Why a model needs "close"
*Why do so many models start with a measure of distance?*

Many models answer a question by finding examples that look like the new one. k-nearest neighbors (k-NN), the model from "How k-NN decides", does this directly. Clustering (grouping examples that are near each other, covered in a later course) and recommenders (suggesting things liked by similar people) work the same way.

To "look like" something, a computer needs a number. Each example is a list of features, so it is a point: two features give a point on a flat plot, three give a point in a box, and a hundred give a point we cannot draw but can still calculate with.

A **distance** is a rule that takes two points and returns one number saying how far apart they are. Small means close, large means far.

There is more than one sensible rule, and the rule is a choice you make. Change it, and the answer to "which examples are my neighbors?" can change too. That lesson used Euclidean distance, and the k-NN lab lets you switch to Manhattan. This one adds Chebyshev and cosine, builds all four by hand, and then shows which neighbors each one picks. "Tuning k" chose how many neighbors to ask; this lesson fixes what "near" means.

## Four ways to measure a gap
*What are the four distances, and how does each one work?*

Take two points, A and B. Look at the gap between them along each feature: across (x) and up (y). Every rule below is built from those gaps.

| Distance | Rule | Picture |
|---|---|---|
| Euclidean | square each gap, add, take the square root | the straight line |
| Manhattan | add the gaps | walking city blocks |
| Chebyshev | take the largest gap | the one biggest difference |
| Cosine | 1 minus the cosine of the angle between the two directions from the origin | direction only |

The first three measure how far apart the points are. Cosine does something different: it ignores how far each point is from the origin, and compares only the direction you would look to see it. The cosine of the angle between two directions is 1 when they point the same way and 0 at a right angle, so 1 minus it is small for matching directions. Two points on the same ray out from the origin have cosine distance 0, however far apart they sit.

> Key idea: there is no single "the" distance. Each rule answers a different question about what counts as different.

## A worked example
*Can we compute all four by hand?*

Take A = (3, 3) and B = (7, 6), the starting positions in the lab below. The gap across is |7 − 3| = 4, and the gap up is |6 − 3| = 3.

[[figure:distance-and-similarity/four-distances|The same two points measured four ways: a straight line, city blocks, the largest gap, and the angle at the origin.]]

1. **Euclidean.** √(4² + 3²) = √(16 + 9) = √25 = **5**.
2. **Manhattan.** 4 + 3 = **7**.
3. **Chebyshev.** The larger of 4 and 3 is **4**.

**Cosine** has one more idea. The cosine of the angle between two directions equals their **dot product** divided by the product of their lengths. The dot product multiplies matching coordinates and adds the results. It takes three short steps:

- Dot product: 3 × 7 + 3 × 6 = 21 + 18 = 39.
- Lengths from the origin: √18 ≈ 4.243 for A and √85 ≈ 9.220 for B. Their product is √18 × √85 = √1530 ≈ 39.115. (Multiplying the rounded lengths gives 39.12, which leads to the same answer below.)
- Divide: cos = 39 ÷ 39.115 ≈ 0.99705, so the distance is 1 − 0.99705 ≈ **0.003**. The angle between the two directions is about 4.4 degrees.

Notice the order: Chebyshev (4) is at most Euclidean (5), which is at most Manhattan (7). That holds for every pair of points. Cosine uses a different scale, so you cannot line it up with the others. The Distance playground lab, below, opens with these same two points, and its table shows these four numbers, with cosine shown as 0.003.

## The shape of "everything this far away"
*What does the set of points at one fixed distance look like?*

Choose a point A and a radius r, and collect every point exactly r away from A. Each distance draws a different outline:

- **Euclidean:** a circle.
- **Manhattan:** a diamond, with its corners straight above, below, left and right of A.
- **Chebyshev:** a square whose sides run parallel to the axes.

[[figure:distance-and-similarity/shapes-at-r|The first three panels show the points at distance 3 from A. The same test point P is inside the circle, outside the diamond and inside the square. The Cosine panel is only an illustration: everything on one ray from the origin is at distance 0.]]

The shape tells you what a rule treats as "equally far". Move one step right and one step up, to (1, 1) away from A. Euclidean says 1.41, Manhattan says 2, Chebyshev says 1. Diagonal moves are expensive for Manhattan and cheap for Chebyshev. That is why the diamond is pulled in along the diagonals and the square is pushed out to its corners.

Cosine has no closed outline around a point. Everything along one ray from the origin sits at distance 0 from everything else on that ray, so its "ball" is a cone of directions, not a shape. The lab does not draw one, and the right-hand panel above only illustrates the idea. That is why the lab's Highlight list has only the first three.

## From distance to similarity
*How is "far apart" the same idea as "not alike"?*

**Similarity** says how alike two examples are. It is the mirror image of distance: small distance means high similarity, large distance means low.

You can turn any distance d into a similarity. One simple choice is 1 ÷ (1 + d). At d = 0 it gives 1, the most similar possible. At d = 5, the Euclidean distance in the worked example, it gives 1 ÷ 6, about 0.17. At d = 7, the Manhattan distance, it gives 1 ÷ 8 = 0.125. The exact formula is a choice; what matters is that it falls as the distance grows.

Cosine is usually described with similarity first. The **cosine similarity** is the cosine of the angle between two directions: 1 for the same direction, 0 for a right angle. The **cosine distance** is 1 minus that, which is what the lab shows. For points with non-negative coordinates, as in the lab, it stays between 0 and 1.

> Watch out: a small cosine distance means "same direction", not "close together". In the worked example A and B are 5 apart, yet their cosine distance is 0.003.

## Which distance to use
*How do you pick between them?*

Start from the question you care about.

- **Euclidean** is the usual default when features share units and scale. Because gaps are squared, one large gap counts for a lot.
- **Manhattan** suits cases where differences should simply add up, like blocks walked on a street grid. Gaps are not squared, so one huge gap pulls less than it does in Euclidean.
- **Chebyshev** suits cases where any one big gap is a problem. Two parts match within a tolerance of 0.1 only if every single measurement is within 0.1, and that is exactly a Chebyshev distance of at most 0.1.
- **Cosine** suits direction data, such as word counts in a document. A long text and a short text on the same topic use words in similar proportions, so they point the same way even when their lengths differ.

> Watch out: Euclidean, Manhattan and Chebyshev all let a feature with big numbers (such as income in dollars) drown out one with small numbers. Scaling every feature to a similar range is the fix; the lesson "Scaling and encoding", in the course "Preparing tabular data", covers it. The lab's plot already does this by giving both features the same range, 0 to 10.

## Distance decides who is nearest
*Can the same data give different neighbors?*

Yes. "Nearest" always means nearest under some distance. Imagine growing the shape around a query Q until it first touches a point. Circles and squares touch different points first.

[[figure:distance-and-similarity/nearest-changes|The same data, measured two ways. P1 is straight out; P2 is on the diagonal.]]

Put Q at the origin. P1 is at (2, 0). P2 is at (1.6, 1.6).

- Euclidean: P1 is 2.00 away, P2 is √(1.6² + 1.6²) = 2.26 away. **P1 is nearest.**
- Chebyshev: P1 is 2.00 away, P2 is 1.6 away. **P2 is nearest.**
- Manhattan: P1 is 2.00 away, P2 is 3.2 away. **P1 is nearest.**

The lab lets you see the same flip with nine reference points. In "How k-NN decides" the neighbors cast the votes, so a different distance can mean different voters and a different prediction. The "k-NN lab" has a Distance control to try this on labeled points.

## Distance gets blurry in many dimensions
*Does distance still work with hundreds of features?*

It still works, but it becomes less informative. With two features, some points are clearly near a query and others clearly far. As the number of features grows very large, distances between points tend to bunch together: the nearest point is not much closer than the farthest. In a quick simulation (100 random points in a box and a random query, averaged over 2000 runs), the nearest point was about 0.05 times as far as the farthest with 2 features, and about 0.76 times as far with 100 features. Then "nearest" carries less meaning, and a model built on it has less to go on.

This is one reason people reduce the number of features before using distance-based methods, and why choosing features carefully matters. "How k-NN decides" lists this as the curse of dimensionality.

::: deeper The formulas for any number of features
For points a and b with n features each, write aᵢ and bᵢ for feature i.

- Euclidean: the square root of the sum of (aᵢ − bᵢ)².
- Manhattan: the sum of |aᵢ − bᵢ|.
- Chebyshev: the largest |aᵢ − bᵢ|.
- Cosine distance: 1 − (a · b) ÷ (|a| |b|), where a · b is the sum of aᵢ × bᵢ and |a| is the square root of the sum of aᵢ².

This is a different effect from the bunching above: the three rules also scale differently as n grows. If two points differ by exactly 1 in every one of 100 features, Euclidean is √100 = 10, Manhattan is 100, and Chebyshev is still 1.
:::

::: deeper Cosine ignores length
Stretch B from (7, 6) to (14, 12), twice as far from the origin, in the same direction. The dot product with A becomes 3 × 14 + 3 × 12 = 78, and the length of B doubles to 2 × √85, so cos = 78 ÷ (√18 × 2√85) = 39 ÷ √1530, the same as before. The cosine distance is still about 0.003, while the Euclidean distance jumps from 5 to √(11² + 9²) = √202 ≈ 14.2.

A point at the origin has no direction at all, so cosine distance is not defined for it. If you move A or B exactly onto (0, 0), the lab's table shows "undefined" for the cosine row.
:::

::: remember
- A distance turns "how alike?" into a number; small distance means high similarity.
- Euclidean, Manhattan and Chebyshev draw a circle, a diamond and a square. Cosine compares direction and ignores length.
- The choice of distance can change which point is nearest, so it is part of the model.
:::


@@lab

## Lab: two points, four distances
The lab is called Distance playground. Two points, A and B, sit on a plot with nine grey reference points. It opens with A at (3, 3) and B at (7, 6), the pair from the worked example, and a shaded circle of radius 3 around A. The plot axes are **Feature 1** (across) and **Feature 2** (up), each from 0 to 10.

### Controls
- **Highlight** chooses the distance that draws the shaded shape, fills the first status line and picks the nearest reference point: **Euclidean**, **Manhattan** or **Chebyshev**. Cosine is not in the list because it has no outline around a point.
- **Distance from A** is the radius of the shape, from 0.5 to 8. It starts at 3.0.
- **Show the shape** turns the shaded shape on or off. Its edge is every point exactly that far from A, and the shading covers every point closer than that.
- **Mark the reference point nearest to A** colors the nearest grey point green, rings it and labels it with its number.
- **Drag** A or B with the mouse or a finger.
- **Keyboard.** Click the plot to focus it. **Space** switches the selected point between A and B. **Tab** goes from A to B, and **Shift+Tab** goes from B back to A; Tab on B leaves the plot, so it never traps you. The **arrow keys** move the selected point by 0.25 of a unit, and holding **Shift** moves it a whole unit.
- **Reset** puts A and B back at (3, 3) and (7, 6). It does not change the other controls, and it does not change which point is selected.
- **Fullscreen** enlarges the lab.

### Reading the screen
- The plot shows A and B as diamonds joined by a dashed grey line, and the nine grey **Reference points**. They are seeded, so they are the same nine every time and never move. While **Mark the reference point nearest to A** is on, the one nearest to A turns green, gets a ring and a label such as #1. The legend under the plot names them: **A and B (draggable)**, **Reference points** and **Nearest to A**.
- The status box has two lines. The first, such as "Euclidean distance A to B: 5.00", follows **Highlight**. The second reads "Nearest reference point to A: #1, at distance 1.46." and measures with the same distance. It says "Reference point marking is off." when the toggle is off.
- While the plot has focus, the first line starts with the selected point and its position, for example "A at (3.00, 3.00)", and a ring circles that point.
- The table **Distances from A to B** has the columns **Distance** and **A to B**, and four rows: **Euclidean**, **Manhattan**, **Chebyshev** and **Cosine (from the origin)**. It always shows all four, to three decimals. At the start it reads 5.000, 7.000, 4.000 and 0.003. The cosine row reads "undefined" if A or B sits exactly at (0, 0), because that point has no direction.

### Experiments
The keyboard recipe used below: click an empty part of the plot, read the first status line, and press **Space** if it names the wrong point ("A at" or "B at"). Using **Highlight**, **Distance from A** or **Reset** takes focus off the plot, and Reset keeps the old selection, so repeat the recipe after them. Every position below is exact, so you can check it in the status line.

1. **Land B on the edge.** Predict: B is 5 away from A in a straight line. If you set **Distance from A** to 5, does B sit on the edge of the circle, and does it also sit on the edge of the diamond and the square at 5? Press **Reset**, set **Highlight** to Euclidean and the distance to 5. Then set Highlight to Manhattan and the distance to 7, and to Chebyshev and the distance to 4. Each time B lands on the edge, matching the table. Explain: the gaps are the same, 4 across and 3 up, so why do the three shapes need different radii?
2. **Walk B into a corner.** Predict: if B sits on a corner of the Chebyshev square of radius 3, are the Euclidean and Manhattan distances to B smaller than 3, equal to 3, or bigger? Press **Reset**, follow the recipe to select B, and press **Shift+Left** once, so B is at (6, 6). Set **Highlight** to Chebyshev and **Distance from A** to 3. B is on the corner. The table reads 4.243, 6.000, 3.000 and 0.000. Explain: both gaps are 3, so what do Euclidean and Manhattan add up to? Why is cosine 0.000?
3. **Change length, keep direction.** Predict: from that state, move B straight out along the diagonal to (9, 9). Which rows of the table change, and which stay put? Follow the recipe to select B, press **Shift+Right** three times and **Shift+Up** three times. The table reads 8.485, 12.000, 6.000 and 0.000. Explain: B slid along the same ray from the origin that A sits on. What does cosine ignore?
4. **Close in space, far in direction.** Predict: the starting pair is 5 apart with cosine 0.003. Take A at (1, 1) and B at (1, 3) instead. Which pair is closer by Euclidean distance, and which has the larger cosine distance? Press **Reset**, select A and press **Shift+Left** twice and **Shift+Down** twice. Then select B and press **Shift+Left** six times and **Shift+Down** three times. The table reads 2.000, 2.000, 2.000 and 0.106. Explain: why do the first three agree here, and why is the pair that is closer in space farther apart in direction?
5. **Watch the nearest point change.** Predict: with A at (4, 4.75), will Euclidean, Manhattan and Chebyshev all mark the same reference point? Press **Reset**, select A, press **Shift+Right** once and **Up** seven times. Switch **Highlight** between the three and read the second status line: Euclidean marks #2 at 2.65, Manhattan marks #4 at 3.51, Chebyshev marks #2 at 2.08. Now select A again, press **Shift+Left** once and **Down** three times, so A is at (3, 4). Euclidean marks #1 at 2.46, Manhattan marks #1 at 2.54, and Chebyshev marks #4 at 2.20. Explain: at (4, 4.75), #4 is only 0.56 across but 2.95 up, and #2 is 1.65 across and 2.08 up. Why does Manhattan prefer the lopsided one and Chebyshev the other?
6. **Real penguins, and a fresh trio.** Predict: Q is an Adelie penguin with a 46.0 mm bill and a 194 mm flipper. P1 has a 35.5 mm bill and a 195 mm flipper, and P2 has a 37.2 mm bill and a 178 mm flipper. Which of the two is nearer to Q by Euclidean, by Manhattan and by Chebyshev distance? The lab has no switch for real data, so you type the penguins in by hand. Bill length (32.1 to 59.6 mm in the 342 penguins of the course dataset that have measurements) becomes Feature 1 and flipper length (172 to 231 mm) becomes Feature 2, each rescaled onto 0 to 10 and rounded to the nearest 0.25. That puts Q at (5, 3.75), P1 at (1.25, 4) and P2 at (1.75, 1). Turn off **Mark the reference point nearest to A**, because the grey dots are not penguins. Press **Reset**, select A and place it at Q (**Shift+Right** twice, **Up** three times), then select B and place it at P1 (**Shift+Left** five times, **Left** three times, **Shift+Down** twice) and read the table: 3.758, 4.000 and 3.750. Move B to P2 (**Right** twice, **Shift+Down** three times): 4.257, 6.000 and 3.250. Euclidean and Manhattan call P1 nearer, and Chebyshev calls P2 nearer. Now the fresh trio: Q is an Adelie with a 36.5 mm bill and a 181 mm flipper, at (1.5, 1.5); P1 (38.6 mm, 199 mm) is at (2.25, 4.5) and P2 (42.8 mm, 195 mm) is at (4, 4). The table gives 3.092 and 3.536 for Euclidean, 3.750 and 5.000 for Manhattan, and 3.000 and 2.500 for Chebyshev: the same split. Explain: P2 is farther in total, but its biggest gap is smaller. Would you expect the same on a third trio, and what would you check?
