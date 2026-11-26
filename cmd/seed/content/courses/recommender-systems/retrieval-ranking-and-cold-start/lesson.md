---
slug: retrieval-ranking-and-cold-start
title: Retrieval, ranking and cold start
kind: reading
simulator: ""
minutes: 25
---
::: intro
- Explain why a recommender retrieves a few hundred candidates cheaply and only then ranks them with a richer model.
- Pick a fallback for a new user or a new item: popularity, content features, or asking for preferences.
- Compute precision@k, recall@k and NDCG@k by hand, judge a list by coverage and diversity, split data without leaking the future, and name the feedback loops a recommender creates.

Before you start: read "Collaborative filtering and matrix factorization" in this course, "Confusion matrix and rates" (precision and recall) and "Grouped and temporal splits" (why shuffling in time leaks).
:::

## Two stages, because the catalog is big
*Why not score every title with the best model?*

Picture a streaming service with 1,000,000 titles. Suppose its best model needs 1 millisecond to score one title for one user. Scoring the whole catalog takes 1,000,000 milliseconds, which is 1,000 seconds, about 17 minutes, for one page. These numbers are made up for the arithmetic.

So the work is split. **Retrieval**, also called candidate generation, uses cheap methods to pick a few hundred candidates: the item vectors nearest to the user's vector (matrix factorization, from the last lesson), titles similar to the last few watched, and what is popular today. **Ranking** then scores only those candidates with a richer model that can use the user's history, the title's content and the time of day, and sorts them. Ranking 300 candidates at 1 millisecond each takes 0.3 seconds.

[[figure:retrieval-ranking-and-cold-start/pipeline|Two stages: cheap retrieval cuts 1,000,000 titles to 300 candidates, then a richer model ranks them and the top 10 are shown.]]

> Key idea: retrieval sets a ceiling. The ranker only sees what retrieval passes on, so a title that retrieval dropped can never reach the user.

> Worked example: a user will go on to like 5 titles, and the 300 candidates contain 4 of them. Candidate recall is 4 / 5 = 0.8, so even a perfect ranker can show at most 4 of the 5.

::: deeper Judging each stage
Each stage gets its own question. For retrieval: do the 300 candidates contain what the user went on to like (candidate recall, as above)? For ranking: among the candidates, are the liked titles near the top (NDCG, below)? For the whole page: do real users do better (online tests, below)? A low final score means little until you know which stage lost the titles.
:::

## Cold start: a new user, a new item
*What can a recommender do when it knows nothing yet?*

Collaborative filtering learns from the table of past interactions. A new user is an empty row of that table, and a new item is an empty column. This is the **cold start** problem: there is no history to learn from, so the model has nothing to compare.

[[figure:retrieval-ranking-and-cold-start/cold-start|The interaction table with a new user (an empty row) and a new item (an empty column).]]

There are three standard fallbacks.

- **Popularity.** Recommend what most users watched. It needs no personal data and is a strong baseline. In a made-up service of 1,000 users, 620 watched title P and 180 watched title Q, so P comes first.
- **Content features.** Describe a new item by what you know: genre, tags, cast. Score it by its similarity to titles the user liked. A new title tagged {space, drama, comedy} and a liked one tagged {space, drama, thriller} share 2 of 4 different tags, so their Jaccard similarity is 2 / 4 = 0.5.
- **Ask for preferences.** At sign-up, show eight titles and let the user pick the ones they like. Those picks are the first row of history.

A new item can also be shown to a small group of users, so that real interactions start to arrive.

> Watch out: popularity gives every cold user the same list. It is a start, not a personalised answer, and it feeds the feedback loop described later in this lesson.

## Precision@k and recall@k
*How do you score a list that shows only k titles?*

Hold out the user's later activity. Say she went on to like 4 titles, her **relevant** items, and the model's top 5 hits her relevant titles at ranks 1, 3 and 5 (list A below). At any cut-off k:

- **precision@k** = relevant titles in the top k / k.
- **recall@k** = relevant titles in the top k / all her relevant titles.

These are the precision and recall of the classification lessons, counted only over the slots the user sees.

| k | Relevant in top k | precision@k | recall@k |
| --- | --- | --- | --- |
| 1 | 1 | 1 / 1 = 1 | 1 / 4 = 0.25 |
| 3 | 2 | 2 / 3 = 0.67 | 2 / 4 = 0.5 |
| 5 | 3 | 3 / 5 = 0.6 | 3 / 4 = 0.75 |

Recall can only grow as k grows, while precision tends to fall. To score a model, average each number over all users.

> Watch out: if a user has only 2 relevant titles, precision@5 can never pass 2 / 5 = 0.4. Compare models on the same users and the same k.

## NDCG@k: position matters
*How do you reward a hit for being near the top?*

Precision@5 gives list A (hits at ranks 1, 3, 5) and list B (hits at ranks 3, 4, 5) the same score, 0.6, and the same recall, 0.75. But A puts a hit first. **NDCG** (normalized discounted cumulative gain) counts a hit at rank r as 1 / log2(r + 1), so later hits count less.

| Rank | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- |
| Discount 1 / log2(r + 1) | 1 | 0.631 | 0.5 | 0.431 | 0.387 |
| List A | hit | miss | hit | miss | hit |
| List B | miss | miss | hit | hit | hit |

> Worked example: DCG of A = 1 + 0.5 + 0.387 = 1.887. DCG of B = 0.5 + 0.431 + 0.387 = 1.318. The ideal list puts all 4 relevant titles first: 1 + 0.631 + 0.5 + 0.431 = 2.562. NDCG@5 is DCG divided by the ideal: A gives 1.887 / 2.562 = 0.737, and B gives 1.318 / 2.562 = 0.514.

[[figure:retrieval-ranking-and-cold-start/ranking-metrics|Lists A and B with the same precision@5 and recall@5, but different NDCG@5. The ideal list sets the divisor.]]

The ideal list puts min(k, number of relevant titles) hits first, so NDCG is always between 0 and 1.

::: deeper Graded relevance
Relevance does not have to be yes or no. If the gains are 3 for a loved title, 2 for a liked one and 0 for a miss, DCG sums gain / log2(r + 1). The list with gains 3, 0, 2 has DCG 3 + 0 + 1 = 4. The ideal order 3, 2, 0 gives 3 + 1.262 + 0 = 4.262, so NDCG@3 = 4 / 4.262 = 0.939. Several versions of the gain formula exist, so state the one you use.
:::

## Coverage and diversity
*Can a list score well and still be a poor recommender?*

Precision and NDCG judge one user at a time. Two questions need a look at all the lists together.

**Catalog coverage** is the share of the catalog that appears in at least one user's list. Take a catalog of 10 titles and four users with 3 titles each. A popularity recommender shows everyone the same 3, so its coverage is 3 / 10 = 0.3. A personalised one gives the lists {A, B, C}, {A, D, E}, {F, B, G} and {D, B, A}. The distinct titles are A, B, C, D, E, F and G, so coverage is 7 / 10 = 0.7.

**Diversity** looks inside one list. Score each pair of titles 1 if their genres differ and 0 if they match, and average. A list of 4 titles with genres action, action, action, comedy has 6 pairs, 3 of them different, so its diversity is 3 / 6 = 0.5. Four different genres give 6 / 6 = 1.

> Key idea: accuracy, coverage and diversity pull against each other. Report them together, because a list tuned for one can quietly lose the others.

## Splitting without leaking the future
*How do you hold out data when order in time matters?*

A random split of the interaction table is tempting and wrong. It can put a user's Friday rating in the training set and their Monday rating in the test set, so the model learns from the future to predict the past. A real recommender only ever predicts what comes next.

[[figure:retrieval-ranking-and-cold-start/leave-last-out|Leave-last-out trains on the past and tests on each user's last event. A random split puts later events into training.]]

**Leave-last-out** keeps time honest. For each user, sort the interactions by time, hold out the latest one as the test item, and train on the rest. A variant cuts by date: train on everything before it, test on everything after. Remove from each list the titles already in the user's training history, or "recommend what they already watched" would score well and help nobody. With one test item per user, recall@k becomes a hit rate: 1 if it is in the top k, else 0.

> Worked example: five users, and their held-out title lands at ranks 2, 1, 7, 15 and 4. With k = 10, four are inside, so hit rate@10 = 4 / 5 = 0.8. NDCG@10 scores 1 / log2(r + 1) for those four and 0 for the other: 0.631, 1, 0.333, 0 and 0.431. The mean is 2.395 / 5 = 0.479.

## Offline, online and feedback loops
*Does a good offline score mean that users will be happier?*

Everything so far is **offline** evaluation: replay logged history and score the lists. It is cheap, quick and repeatable, so use it to compare many models. But the log holds only reactions to what the old system chose to show. A title that was never shown has no click, so a new model that surfaces it is scored as wrong.

**Online** evaluation is an A/B test: split live users at random, give group A the current system and group B the new one, and compare behaviour such as clicks, watch time or return visits over days. It measures real reactions, but it costs real users' time. A common routine is offline to screen, online to decide.

A recommender also shapes the data it learns from. That makes **feedback loops**. Shown titles get clicks, so they look more popular and are shown more (**popularity bias**). Titles never shown never collect data (**exposure bias**). A user shown one kind of title clicks that kind, and the history narrows. Watch coverage and diversity over time, not once.

## Into the Recommender lab
*What will you check in the Recommender lab?*

The last lesson of this course is the Recommender lab. Its task follows this module's plan: remove the interaction history of some users, then compare how different recommenders handle cold start.

Go in with three questions. Which fallback does each recommender use when a user's row is empty? Which metric and which k judge the list, and does the split respect time? Does a better accuracy score come with lower coverage or diversity?

Before each experiment, predict which recommender will lose the most when the history disappears. Then check your guess with the numbers from this lesson, not with a feeling about the lists.

::: remember
- Retrieval cheaply narrows the catalog to a few hundred candidates, ranking orders them with a richer model, and retrieval's recall is the ceiling.
- A cold user or item needs a fallback: popularity, content features, or asking. Precision@k, recall@k, NDCG@k, coverage and diversity measure different things, so report several.
- Split by time with leave-last-out, treat offline scores as a screen and online tests as the verdict, and watch for feedback loops.
:::
