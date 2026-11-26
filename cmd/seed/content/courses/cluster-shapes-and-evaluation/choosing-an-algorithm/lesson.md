---
slug: choosing-an-algorithm
title: Choosing a clustering method
kind: reading
simulator: ''
minutes: 15
---
::: intro
- Pick a first method by asking five questions about your data: shape, noise, the need to choose k, size and how well you must explain the result.
- Read a decision table that puts k-means, hierarchical clustering and DBSCAN side by side.
- Check a clustering before you trust it, and explain why one score must not decide.

Before you start: read "k-means, step by step", "Hierarchical clustering", "The silhouette score" and "DBSCAN and density", and try the Cluster methods lab.
:::

## Five questions before you pick
*What should you ask about a problem before you choose a method?*

Each method in this module answers one question well. k-means asks which center is nearest. Hierarchical clustering asks which points or groups should merge first. DBSCAN asks where the points are crowded. Choosing a method means matching that question to your problem. Five checks do most of the work:

1. **Shape.** Are the groups round blobs, or rings, moons and chains?
2. **Noise.** Must every point land in a group, or may stray points stay unassigned?
3. **Choosing k.** Do you know how many groups you want before you start?
4. **Scale of the data.** How many points and how many features: hundreds, or millions?
5. **Interpretability.** Who must understand the result, and what will they ask about each group?

[[figure:choosing-an-algorithm/decision-flow|A first-pass guide: three questions point to a first method, and a fallback covers the rest.]]

The guide is a place to start, not a verdict. The rest of this lesson shows why each question matters.

## What each method can see
*Why does the same data look different to each method?*

k-means cuts the plane into regions around its centers, so its groups are round and meet along straight lines. Hierarchical clustering depends on its **linkage**, the rule for how far apart two groups are. Ward linkage merges the pair that keeps groups compact, so it behaves much like k-means. Single linkage joins the nearest pair of points, so it follows chains and curves. DBSCAN follows dense regions and ignores their shape.

[[figure:choosing-an-algorithm/same-data-four-ways|The same 150 points per row, clustered four ways. Rows differ in shape and in noise.]]

Read the figure row by row. On three blobs every method agrees. On two rings k-means and ward cut across both rings, while single linkage and DBSCAN find them. On unequal density single linkage splits off one stray point and calls the rest a single group. DBSCAN sets 11 points aside as noise, which the other three methods cannot do: they place every point in some group.

## The decision table
*How do the three methods compare on the five questions?*

| Question | k-means | Hierarchical | DBSCAN |
| --- | --- | --- | --- |
| Shape | Round blobs of similar size | Depends on the linkage: ward is compact, single follows chains | Any shape, if the density is even |
| Noise | Every point is forced into a group, and outliers drag the centers | Every point is merged in; single linkage can chain through strays | Sparse points are labeled noise |
| Choosing k | You set k first | You pick k afterward by cutting the dendrogram | No k; you set eps and MinPts |
| Scale of the data | Fast: about n x k distances per pass | Starts from every pairwise distance, so it suits hundreds to a few thousand points | Compares points with their neighbors; slow on large data unless neighbors are found with a special lookup structure (a spatial index) |
| Interpretability | Each group has a center, the average point of the group | The dendrogram shows what merged and at what distance | Core, border and noise points; no center |

> Key idea: no single row decides. Weigh the rows by the problem. If you must label every customer and explain each group, the first and last rows point to k-means. If you must find rings and set outliers aside, they point to DBSCAN.

::: deeper Size in numbers
Hierarchical clustering works from the distances between all pairs of points. With n points there are n x (n - 1) / 2 pairs. For 150 points that is 11,175 pairs. For 10,000 points it is 49,995,000, about 50 million. One k-means pass with k = 3 on 10,000 points computes 10,000 x 3 = 30,000 distances. That gap is why the table calls k-means fast.
:::

## A score is not a verdict
*Why can the best score belong to the wrong grouping?*

The silhouette score rewards points that sit close to their own group and far from the next one. That favors compact, round groups, whatever the true shape. Take the two rings from the figure. k-means cuts them into a left half and a right half and scores 0.36. The correct grouping, found by DBSCAN with eps 1.0 and MinPts 4, scores 0.01. On two moons the same thing happens in a milder form: 0.49 for the k-means cut and 0.38 for the correct groups (DBSCAN with eps 0.8 and MinPts 4).

[[figure:choosing-an-algorithm/silhouette-trap|Silhouette scores on rings and moons: the correct grouping gets the lower bar both times.]]

> Watch out: the silhouette compares settings of one method on one kind of data, for example different k for k-means on blobs. It cannot referee between methods on different shapes. Plot the result first. Inertia has the same limit, and it exists only for k-means.

## A worked example: penguins
*What happens to a method's choice when the columns have different sizes?*

> Worked example: 342 penguins have all four measurements: bill length, bill depth, flipper length and body mass. Run k-means with k = 3 and 10 restarts.

The standard deviations are 5.5 mm, 2.0 mm, 14.0 mm and 800.8 g. Take the first two penguins in the file. Their gaps are 0.4 mm, 1.3 mm, 5 mm and 50 g. Squared, they are 0.16, 1.69, 25 and 2,500, which add to 2,526.85. Body mass supplies 2,500 / 2,526.85, about 98.9 percent, of the squared distance, so the other three columns barely count.

Now compare the clusters. On the raw columns the silhouette score is 0.58, and 68 percent of penguins share a cluster whose most common species is their own. After standardizing every column, the silhouette falls to 0.45 but the share rises to 92 percent.

[[figure:choosing-an-algorithm/penguins-scaling|k-means on penguins: standardizing lowers the silhouette score and improves the match with species.]]

The species were not used to cluster; they only check the result. The raw clusters were compact in body mass alone, so they scored well and meant little.

## Checks for every method
*What should you do whatever method you chose?*

1. **Plot it.** A high score on a wrong-looking grouping is easy to get, as the rings showed.
2. **Scale the features.** Every method here uses distance, so a column with big numbers takes over, as body mass did.
3. **Test stability.** Change a seed, a restart or a linkage, or nudge eps. On unequal density, DBSCAN with MinPts 4 gives 2 clusters and 11 noise points at eps 1.0, but 4 clusters and 29 noise points at eps 0.5. A result that moves that much needs a second look.
4. **Compare two methods that see shapes differently.** Pair k-means with DBSCAN or single linkage. If they agree, the structure is probably real; if they disagree, find out why. k-means and ward are near twins, so their agreement says little: on the two rings they agree and are both wrong.
5. **Describe each group in words.** If you cannot, or two groups look the same to a person, the clustering is not ready.

::: deeper When no method fits
Groups of very different density strain DBSCAN, because one eps must suit them all. Many features weaken every distance-based method, because distances between points start to look alike. Then the fix is usually in the data: keep fewer, better features, scale them, and cluster again.
:::

## Back to the lab
*Where can you test this table yourself?*

The decision table is a set of predictions, and the lab lets you test them. Go back to the Cluster methods lab and run k-means, hierarchical clustering and DBSCAN on blobs, rings and unequal density. Before each run, say which row of the table applies and which method you expect to do best. Then run it and explain any surprise with the shape, noise, k, size and interpretability questions.

This is also where the course ends. You can now cluster points by center, by merging and by density, check a result with the silhouette score, and choose a method for a problem instead of reaching for a favorite.

::: remember
- Choose a method by the shape of the groups, the noise, whether you can name k, the size of the data and who must understand the result.
- A score such as the silhouette can favor the wrong grouping, so plot, scale, test stability and describe each group before you trust it.
- Compare two methods that see shapes differently when you are unsure; their agreement is evidence and their disagreement is a question.
:::
