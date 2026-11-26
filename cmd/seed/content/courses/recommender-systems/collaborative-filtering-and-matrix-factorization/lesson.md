---
slug: collaborative-filtering-and-matrix-factorization
title: Collaborative filtering and matrix factorization
kind: reading
simulator: ""
minutes: 25
---
::: intro
- Read a user-item matrix, and say how explicit ratings differ from implicit feedback and why a blank is not a zero.
- Predict one missing rating by hand with a popularity baseline, then with user-user and item-item collaborative filtering using cosine similarity.
- Predict the same rating with a two-factor matrix factorization, say how SGD or ALS learns the factors and what regularization does, and explain why sparsity shapes every choice.

Before you start: read "Distance and similarity" in the k-NN course, "L1 and L2: ridge and lasso" in the Regularization course, "Gradient descent" and "Stochastic and mini-batch updates" in the Optimization course, "PCA and explained variance" in the Dimensionality reduction course and "Embeddings and autoencoders" in the Representation learning course. This lesson uses cosine, a penalty on size, a gradient step, and vectors whose closeness means similarity.
:::

## The user-item matrix
*What data does a recommender start from?*

A recommender suggests items a user has not met yet. Its raw material is a table with one row per user, one column per item, and a cell for each interaction. Here is a toy with five users and five films, with invented ratings from 1 to 5 stars. A "?" means the user has not rated that film.

| User | Orbit | Comet | Rocket | Harbor | Garden |
| --- | --- | --- | --- | --- | --- |
| Ana | 5 | 4 | ? | 1 | 2 |
| Budi | 5 | 5 | 5 | 2 | ? |
| Dewi | 4 | ? | 4 | 2 | 1 |
| Citra | 1 | 2 | 2 | 5 | 4 |
| Eko | 2 | 1 | 2 | 4 | 5 |

[[figure:collaborative-filtering-and-matrix-factorization/rating-matrix|The toy matrix as a heat map. Darker means a higher rating, dashed cells are blanks, and the outlined cell is the one to predict.]]

These are **explicit ratings**: the user states a preference. Much real data is **implicit feedback**: plays, clicks, purchases, minutes watched. It is plentiful but ambiguous, because a click may be curiosity and a purchase may be a gift. In both kinds a blank means unknown. A film with no play was not necessarily disliked, since it may never have been shown. This lesson uses ratings because the arithmetic is easiest to follow, and the methods carry over.

> Key idea: the task is to fill the blanks. Predict Ana's rating of Rocket, then recommend the unseen films with the highest predictions.

## The popularity baseline
*What can you recommend without knowing anything about the user?*

Start with the simplest rule: recommend what most people like. With ratings, score each film by its mean rating over the users who rated it. With implicit data, count how many users interacted with it. Every user gets the same list, so this is the baseline any smarter method must beat.

> Worked example: Rocket was rated by Budi (5), Dewi (4), Citra (2) and Eko (2). Its mean is (5 + 4 + 2 + 2) / 4 = 3.25. The other means are Orbit 3.4, Comet 3.0, Harbor 2.8 and Garden 3.0. The baseline predicts 3.25 for Ana.

The weakness shows in the matrix. Ana, Budi and Dewi give high ratings to Orbit, Comet and Rocket, while Citra and Eko give them to Harbor and Garden. One mean per film blends two opposite tastes, and it never looks at Ana's own ratings. **Collaborative filtering** uses exactly that pattern: users who agreed in the past are expected to agree on new items.

## User-user collaborative filtering
*How do you find users with the same taste?*

Compare users by their rating vectors, using the cosine from "Distance and similarity": the dot product of two vectors divided by the product of their lengths. Use only the films both users rated.

> Worked example: Ana and Budi both rated Orbit, Comet and Harbor. Ana gave (5, 4, 1) and Budi gave (5, 5, 2). The dot product is 5 × 5 + 4 × 5 + 1 × 2 = 47. The squared lengths are 25 + 16 + 1 = 42 and 25 + 25 + 4 = 54, so the cosine is 47 / √(42 × 54) = 0.99.

The same steps give Dewi 0.96, Eko 0.61 and Citra 0.57. To predict Ana's rating of Rocket, take her **nearest neighbors** among the users who rated it and average their ratings, weighted by similarity. With k = 2 the neighbors are Budi (5) and Dewi (4): (0.99 × 5 + 0.96 × 4) / (0.99 + 0.96) = 4.51. Averaging all four users gives 3.56, close to the popularity baseline, because Eko and Citra still pull.

[[figure:collaborative-filtering-and-matrix-factorization/user-neighbours|Ana's cosine similarity to each other user, and three predictions of her rating of Rocket on a number line.]]

> Watch out: k matters. With too many neighbors the prediction drifts back to the popular average, and with too few one odd user decides it.

::: deeper Why cosine on raw ratings flatters everyone
Ratings are all positive, so even opposite tastes get a cosine well above 0: Citra scores 0.57 against Ana. The usual fix is to subtract each user's mean rating first, so a rating reads as "above or below what this user usually gives". The means are Ana 3, Budi 4.25, Dewi 2.75, Citra 2.8 and Eko 2.8. After centering, Ana's similarities are 0.90 with Budi, 0.84 with Dewi, -0.79 with Eko and -0.99 with Citra. Now opposite tastes get negative scores, and a neighbor list can drop them.
:::

## Item-item collaborative filtering
*What changes if you compare films instead of users?*

Turn the table on its side. Two films are similar when the same users rate them alike, and the prediction uses the user's own ratings of similar films. Compare film columns, using only users who rated both films.

> Worked example: Rocket and Orbit were both rated by Budi, Dewi, Citra and Eko. Rocket got (5, 4, 2, 2) and Orbit got (5, 4, 1, 2). The dot product is 25 + 16 + 2 + 4 = 47, the squared lengths are 49 and 46, and the cosine is 47 / √(49 × 46) = 0.99. Comet also scores 0.99, Harbor 0.73 and Garden 0.69.

Ana rated Orbit 5 and Comet 4, the two films most similar to Rocket, so the prediction is (0.99 × 5 + 0.99 × 4) / (0.99 + 0.99) = 4.50. Both neighbor methods land near 4.5, well above the 3.25 of the baseline.

Item-item is popular for two practical reasons. A film's ratings usually change more slowly than a person's tastes, so similarities can be computed ahead of time, and the reason for a suggestion is easy to show: "because you rated Orbit 5".

## Matrix factorization
*How can two short vectors replace the whole table?*

Instead of storing neighbors, learn a short vector for every user and every film, so that the **dot product** of a user vector and a film vector predicts the rating. The numbers in a vector are the **factors**. These vectors come from a training run on the toy matrix with 2 factors, rounded to one decimal.

- Users: Ana (2.1, 0.5), Budi (2.2, 0.8), Dewi (1.7, 0.5), Citra (0.2, 2.1), Eko (0.2, 2.1).
- Films: Orbit (2.1, 0.5), Comet (1.9, 0.5), Rocket (2.0, 0.8), Harbor (0.2, 2.1), Garden (0.2, 2.1).

> Worked example: Ana · Rocket = 2.1 × 2.0 + 0.5 × 0.8 = 4.20 + 0.40 = 4.60. As a check on a known cell, Ana · Harbor = 2.1 × 0.2 + 0.5 × 2.1 = 0.42 + 1.05 = 1.47, against her real rating of 1. Dewi never rated Comet: 1.7 × 1.9 + 0.5 × 0.5 = 3.23 + 0.25 = 3.48.

Factor 1 is large for Ana, Budi, Dewi and the films they like, and factor 2 for Citra, Eko, Harbor and Garden. Nobody told the model; it found the two groups from the ratings alone.

[[figure:collaborative-filtering-and-matrix-factorization/two-factors|Left: the two-factor vectors, users as dots and films as rings. Right: Ana's dot product with each film. The black tick is her real rating.]]

::: deeper Factorization, PCA and embeddings
Stack the user vectors as the rows of a matrix U and the film vectors as the rows of V. The predictions are the table U × Vᵀ: a big table written as the product of two thin ones, a low-rank approximation, which is also what PCA builds. But PCA needs every cell filled, and a ratings table is mostly blank, so factorization is fitted on the known cells only, which is why SGD and ALS exist. The vectors are embeddings in the sense of "Embeddings and autoencoders": a user vector near a film vector means a likely match, and the axes have no names, just as PCA components do not.
:::

## Learning the factors
*How does the model find vectors that fit the known ratings?*

The training loss is the sum, over the known ratings only, of (rating - user · film)², plus a penalty λ times the squared length of every vector. Blanks never enter it. Two standard ways to minimize it:

**SGD** goes through the known ratings one at a time. With error e = rating - prediction, it nudges both vectors: user ← user + η (e × film - λ × user), and film ← film + η (e × user - λ × film). It is the stochastic update from "Stochastic and mini-batch updates".

> Worked example: both vectors start at (1, 1) for a known rating of 5, with η = 0.1 and λ = 0.1. The prediction is 2, so e = 3. Every number becomes 1 + 0.1 × (3 × 1 - 0.1 × 1) = 1.29, and the new prediction is 2 × 1.29 × 1.29 = 3.33, closer to 5.

**ALS** (alternating least squares) holds all film vectors fixed and solves each user's vector as a small ridge regression on the films that user rated. Then it holds the users fixed and solves each film, and repeats. The vectors above came from 200 such sweeps with λ = 0.1.

The penalty is the L2 penalty of ridge, and it matters: a user with one rating gives one equation for two numbers, so many vectors fit it exactly, and the penalty picks the short one. Choose λ on a validation set.

> Watch out: on the 22 known ratings the fit has a root mean squared error of 0.40, against 1.52 for the popularity baseline. Both are measured on cells the models saw, and for Ana's Rocket the three methods give 3.25, about 4.5 and 4.6, which this toy cannot rank without hidden ratings. A fair comparison hides some ratings first, as in "Train, validation and test".

## Sparsity
*Why is a real ratings matrix so hard to work with?*

The toy has 3 blanks in 25 cells. Picture a service with 1,000 users and 1,000 films where each user has rated 20 films. That is 20,000 filled cells out of 1,000,000, or 2%.

For neighbors, sparsity means almost no overlap. If two users each rated 2% of the films, picked at random, they share on average 1,000 × 0.02 × 0.02 = 0.4 films, so a cosine on co-rated films would rest on less than one film. Real users overlap more on popular films, but unevenly. The neighbors of a user with few ratings are weak.

Factorization usually copes better, since every rating trains vectors that are shared: 2 factors need (1,000 + 1,000) × 2 = 4,000 numbers, learned from 20,000 ratings. A user with no ratings at all has nothing in either method: no neighbors and nothing to train a vector.

[[figure:collaborative-filtering-and-matrix-factorization/sparsity|Left: 30 filled cells out of 1,500, which is 2%. Right: how few films two users share as the filled share falls, if each user picks films at random.]]

## Where this goes next
*What do these methods leave unanswered?*

Everything so far predicts a rating for a cell of a table that already exists. A real recommender has three more problems. A catalogue can be too big to score every item for every user, so it must first pick candidates (retrieval). It must put the best few on the screen in the right order (ranking). And it must serve users and items with no history (cold start).

The next lesson, "Retrieval, ranking and cold start", takes these up. The course then ends with the recommender lab, where the syllabus question is how recommenders cope with cold start when you remove interaction history for some users.

::: remember
- A user-item matrix is mostly blanks, and a blank means unknown, not zero or dislike. Popularity gives every user the same list, and collaborative filtering uses who liked what.
- User-user and item-item methods predict a similarity-weighted average of neighbors' ratings, with cosine as the similarity. Matrix factorization learns a short vector per user and per item, whose dot product is the prediction, from the known cells only, with SGD or ALS and a penalty on size.
- Sparsity decides what works: neighbors need overlap, vectors share what they learn across ratings, and a user with no history has neither.
:::
