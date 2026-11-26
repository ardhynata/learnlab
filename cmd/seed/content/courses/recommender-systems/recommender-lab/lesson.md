---
slug: recommender-lab
title: Recommender lab
kind: simulator
simulator: recommender-lab
minutes: 25
---
::: intro
- Remove the history of some users and measure how six recommenders (popularity, user k-NN, item k-NN, matrix factorization, content-based and a hybrid) cope with cold start.
- Predict which recommender suffers most, then explain the result from how each one uses a user's own history.
- Check the idea on fresh generated samples, and say why one run is not proof.

Before you start: read "Collaborative filtering and matrix factorization" and "Retrieval, ranking and cold start" in this course. The lab uses the matrix, the neighbors, the factors, the three cold-start fallbacks and NDCG@k from those two lessons.
:::

## What the lab asks
*What does Recommender lab let you measure?*

The previous lesson warned that a new user is an empty row, and collaborative filtering has nothing to compare. Recommender lab turns the warning into a measurement. It generates a user-item matrix, draws it as a heatmap with one row per user and one column per item, removes the history of a share of the users, and scores six recommenders on the same users.

The data is always generated. People "click" items, and no real ratings are used; the lab says so on screen. The default has 150 users and 80 items, which is 12,000 cells, and 9.1% of them are interactions the models may use. Each user with enough history also has one interaction held out, the next thing they liked. That held-out interaction is what the recommenders must predict.

[[figure:recommender-lab/row-states|Three rows of the heatmap: a warm user, a cold-start user who kept nothing, and one who kept 3 interactions. The ring is the held-out interaction.]]

## Six recommenders, one empty row
*How does each recommender use a user's own history?*

Every recommender here ranks the 80 items for a user and shows the top k. They differ in what they need from that user.

| Recommender | What it needs from the user | With no history |
| --- | --- | --- |
| Popularity | nothing | the shared popularity list |
| User k-NN | the user's interactions, to find 20 similar users | every score ties |
| Item k-NN | the user's interactions, to find items like those | every score ties |
| Matrix factorization | the user's interactions, to fit a user vector | every score ties |
| Content-based | the genres of the items the user touched | falls back to popularity |
| Hybrid | the number of interactions | popularity, then content, then matrix factorization |

The hybrid is a router: popularity with no interactions, content-based with 1 to 4, and matrix factorization from 5. Every list skips items the user has already seen. A tie means the model has no opinion, and the lab then orders tied items by item number, which is no better than an arbitrary list.

[[figure:recommender-lab/hybrid-routing|The hybrid picks its model from the number of interactions a user has.]]

## Scoring one user
*What is held out, and what do the numbers mean?*

Each user's interactions are sorted in time, as in "Retrieval, ranking and cold start". The last one is held out for scoring, the one before it is set aside to validate matrix factorization, and the models see the rest. Only users that have a held-out interaction are scored: 96 of the 150.

With one held-out item, each user either gets a hit in the top k or does not. So recall@k is 1 or 0 for each user, precision@k is 1 / k or 0, and the average precision@k is the average recall@k divided by k.

> Worked example: the Hybrid has recall@10 of 0.78 with the default data. Its precision@10 is 0.78 / 10 = 0.078, which the lab shows as 0.08. Precision looks tiny because a list of 10 can hold at most one hit.

NDCG@k rewards a hit near the top: a hit at rank r scores 1 / log2(r + 1), since the ideal list has the one item at rank 1. A hit at rank 1 scores 1, at rank 3 it scores 0.5, and at rank 7 it scores 1 / log2(8) = 1 / 3 = 0.33. The Quick Quiz always judges by NDCG at the current k.

## Removing history
*What do the two sliders change?*

**Share of scored users with history removed** chooses users at random from the 96 scored ones. At 30% that is 0.3 × 96 = 28.8, so 29 users become **cold-start users**, which is 30.2% of the scored users. **Interactions they keep** sets how many interactions each of them keeps, picked at random from their history, not the most recent. At 0 they lose everything.

At 30% and 0 kept, the status line reads "29 cold-start users lost their whole history; 327 interactions were removed", about 11 per user. The other 67 scored users are warm: they keep their history and are scored the same way. The scoring is the same for both groups, so the chart can put them side by side.

The removed interactions also leave the training data of every model, so the warm users' scores move a little too. Popularity counts and neighbor similarities now rest on 327 fewer interactions. The held-out interaction of a cold user stays in place and is still the target.

## No history at all
*What happens to each recommender when 29 users have nothing?*

Here is NDCG@10 for the default data, 30% of the scored users cold and none of their history kept.

| Recommender | Warm users | Cold-start users | Drop |
| --- | --- | --- | --- |
| Popularity | 0.25 | 0.24 | 0.01 |
| User k-NN | 0.39 | 0.07 | 0.32 |
| Item k-NN | 0.40 | 0.07 | 0.33 |
| Matrix factorization | 0.42 | 0.07 | 0.35 |
| Content-based | 0.48 | 0.24 | 0.23 |
| Hybrid | 0.46 | 0.24 | 0.21 |

[[figure:recommender-lab/warm-vs-cold|NDCG@10 for warm users and cold-start users with no history kept.]]

The three collaborative models fall together, to the same 0.07. They tie on every item, so they all show items 0, 1, 2 and so on, and score a hit only if the held-out item happens to be among those. Content-based and Hybrid land exactly on Popularity's 0.24: with no history, popularity is their fallback. Content-based adds a tiny share of popularity to every score, so with an empty genre profile only that share is left and its list equals Popularity's. They did not learn anything about the user; they stopped using it.

::: deeper One cold user, up close
For cold-start user 6 the held-out item is 25. Popularity ranks it 7th, so that user scores 1 / log2(8) = 0.33. The collaborative lists begin 0, 1, 2, 4, 6, and never reach item 25, so they score 0. Items 3 and 5 are missing because they are in this user's removed history: they were really consumed, so the lab does not recommend them.
:::

## A few interactions go a long way
*How many interactions does a cold user need?*

Raise **Interactions they keep** and look at the cold-start users only. One interaction is already a large step: User k-NN goes from 0.07 to 0.35, because a single click lets it find other users who clicked the same item. With 1 interaction the Hybrid is on content-based and scores 0.39.

| Interactions kept | 0 | 1 | 3 | 5 |
| --- | --- | --- | --- | --- |
| Popularity | 0.24 | 0.24 | 0.25 | 0.24 |
| User k-NN | 0.07 | 0.35 | 0.42 | 0.44 |
| Matrix factorization | 0.07 | 0.29 | 0.36 | 0.43 |
| Hybrid | 0.24 | 0.39 | 0.37 | 0.46 |

[[figure:recommender-lab/keep-ladder|NDCG@10 of the cold-start users as they keep more interactions. Popularity stays flat; the personal models climb.]]

At 5 kept, the three collaborative models reach 0.43 to 0.45, close to the warm users' 0.38 to 0.43. User 6 shows the routing: with 3 kept, the Hybrid uses content-based and puts item 25 at rank 3 (NDCG 0.5); with 5 kept it uses matrix factorization, also at rank 3. Of the 29 cold users, 20 have 5 kept; the other 9 had fewer than 5 to begin with, so they stay on content-based.

> Watch out: the lines are bumpy because 29 users is a small group. A move of 0.02 to 0.05 between neighboring points is not a finding.

## Beyond the score
*What else should you check besides NDCG?*

The third chart box shows **Coverage and diversity** at the start. Coverage is the share of the 80 items that appear in at least one scored user's list. Popularity shows everyone the same ranking, yet its coverage is 0.45, which is 36 of 80 items: each list skips what that user has seen, so the lists differ a little. Content-based reaches 0.99, which is 79 of 80 items.

Diversity looks inside a list: the average of 1 - cosine between the genre vectors of every pair of items. Two items of different genres score 1, and two of the same genre score 0. Popularity's lists score 0.65 and Content-based's 0.32, because content-based fills a list with the user's favorite genres.

> Key idea: a recommender can reach almost every item across its users and still give each user a narrow list. In this lab Content-based has the highest coverage and the lowest diversity, so report accuracy, coverage and diversity together, as in "Retrieval, ranking and cold start".

::: deeper Reading the matrix factorization training curve
The tab **MF training curve** plots RMSE (the typical size of the prediction error) after each of 10 ALS sweeps, plus the start, on the training interactions and on the validation ones (each counted with an equal number of empty cells). With the default 6 factors and lambda 2, training error falls from 0.71 to 0.34 and validation error from 0.71 to 0.41, a gap of 0.07. With 16 factors and lambda 0.1 the model memorizes: training error 0.20, validation error 0.55, a gap of 0.35, and NDCG@10 falls from 0.43 to 0.28. With lambda 10 it underfits: training error stays at 0.51, validation error 0.56, and NDCG@10 is 0.25. The penalty is the L2 penalty from ridge. Of these three settings the default ranks best, with a gap in between.
:::

## One sample
*Is one sample enough to name a winner?*

Press **New sample** and repeat the 30% test with nothing kept. On samples 2 to 5 the collaborative group again falls most: its cold users score between 0.03 and 0.12, while Popularity's score between 0.18 and 0.30. On sample 6 the Quick Quiz answer changes to Content-based: its NDCG@10 falls from 0.41 to 0.09. The reason is that Popularity itself scores only 0.09 for those 41 cold users, so everything that falls back to it falls too.

One run answers "what happened on this sample". The pattern that held on five samples out of six is the finding: collaborative models collapse with no history, and the fallbacks hold only as high as popularity does.

## What transfers
*What survives a change of data?*

The data is generated, with genres built in, so content features are informative here. On a real service the numbers differ. This lab has no real-data switch, because the bundled penguins table holds no user-item interactions. Keep the method: remove history, compare warm and cold users, and repeat on fresh samples. The same habit applies inside one model: when training error sits far below validation error, as with matrix factorization at 16 factors and lambda 0.1 (0.20 against 0.55), the model has memorized its training interactions. The lab's **MF training curve** shows that gap.

::: remember
- A cold-start user has an empty row. User k-NN, item k-NN and matrix factorization score every item the same, so they fall to an arbitrary list, while popularity ignores history and barely moves.
- Content-based and the hybrid hold up only by falling back to popularity, and a few kept interactions (1 to 5) recover most of the loss.
- Judge a list by accuracy, coverage and diversity, and repeat on fresh samples before you trust a winner.
:::

@@lab

## Lab: Recommenders and cold start
You start with 150 generated users and 80 generated items, nobody's history removed, and all six recommenders on. You remove the history of some users and compare how each recommender scores them against the users who kept theirs. The data is always generated: the lab's note says that people "click" items and that no real ratings are used.

### Controls
- **Share of scored users with history removed** (0 to 80% in steps of 5; starts at 0) sets how many of the scored users lose history. Only users with a held-out interaction count, which is 96 in the default data.
- **Interactions they keep** (0 to 10; starts at 0) is how many random interactions each cold-start user keeps.
- **MF factors** (1 to 16; starts at 6) and **MF lambda (regularization)** (0.1 to 10; starts at 2) set matrix factorization. Moving either switches the third box to **MF training curve**.
- **Recommenders compared** is a folded group with one toggle each for **Popularity**, **User k-NN**, **Item k-NN**, **Matrix factorization**, **Content-based** and **Hybrid**. All start on. A note inside says the k-NN models use 20 neighbours and the hybrid trusts matrix factorization from 5 interactions. If you switch off the last one, the lab shows "At least one recommender stays on."
- **Top-k (list length)** (1 to 20; starts at 10) is the length of every list.
- **Metric in the charts** chooses between **Precision@10**, **Recall@10** and **NDCG@10**; the number follows **Top-k (list length)**. It starts on NDCG.
- **Generated data settings** is a folded group: **Users** (40 to 300; starts at 150), **Items** (20 to 150; starts at 80), **Latent factors of the data** (1 to 8; starts at 3), **Sparsity (share of empty cells)** (70 to 96%; starts at 90%), **Popularity skew** (0 to 2; starts at 1), **Seed** (1 to 9999; starts at 1) and **New sample**, which adds 1 to the seed and clears the Quick Quiz.
- **User to inspect** is a number that picks one user. **Next cold-start user** jumps to the next cold-start user, and is disabled when there is none.
- Click a row of the heatmap, or focus it and use the up and down arrow keys, to choose a user as well. Choosing a user switches the third box to **Selected user**. The three tabs there are **Coverage and diversity**, **MF training curve** and **Selected user**.
- **Fullscreen** enlarges the lab. **Reset** returns every control to its start, including the seed, and turns every recommender back on.
- **Quick Quiz** holds the question "Remove the history of 30 percent of the scored users. Which recommender suffers most?" with four answers. Pick one, press **Check answer**, and the lab compares it with what the sliders show now. At 0% it says to set the share to 30% and **Interactions they keep** to 0 first.

### Reading the screen
- The heatmap has one row per user and one column per item. A filled cell is **Seen (the models can use it)**, an outlined cell is **Held out (to be predicted)**, a faint cell is **Removed history**, and a mark at the left of a row is a **Cold-start user (mark at the left)**. A frame around one row is the selected user.
- The status line reads "150 users by 80 items, 9.1% of the cells seen. No user has lost history yet." After removal it adds, for example, "29 cold-start users lost their whole history; 327 interactions were removed." With some history kept it says "keep up to 3 interactions each". The detail line reads "Scored on 96 users with a held-out interaction (67 warm, 29 cold)".
- The first chart is titled **NDCG@10: warm and cold users** (it follows the metric and the k). Each recommender has a solid bar for warm users and a pale outlined bar for cold ones. The legend gives the counts, such as "Warm users (67)" and "Cold-start users (29)", or "Cold-start users (0): raise the share slider".
- The second chart, **NDCG@10 against history length**, has one line per recommender. Its x axis is **Interactions the models know about**, in groups 0, 1-2, 3-5, 6-10 and 11+, with the number of users under each group. Some groups hold only 11 to 21 users, so it is noisy.
- The third box starts on **Coverage and diversity**. Its legend reads "Coverage: share of items recommended to anyone" and "Diversity: genre variety inside one list". **MF training curve** draws "Training error" and "Validation error" against the "ALS sweep (epoch)", and its legend gives the factors and lambda.
- **Selected user** lists "User 6: cold start." with "0 interactions kept of 22.", then the rows **History the models see**, **Removed history** and **Liked next (held out)**. Below, "Top 10 from each recommender (a tick means the user actually liked it)" gives one row per recommender. A row marked "scores tie" is faint with dashed boxes, and the Hybrid row says which model it used, such as "uses Popularity".

### Experiments
Press **Reset** before each experiment. The numbers are for the default sample (seed 1).

1. **The warm baseline.** Predict: with no history removed, how far does Popularity trail the others on NDCG@10, and does the most accurate recommender also cover the most items? Read the first chart: Popularity 0.26, User k-NN 0.45, Item k-NN 0.43, Matrix factorization 0.43, Content-based 0.45 and Hybrid 0.46. Then read the **Coverage and diversity** box: Popularity covers 0.45 of the items and Content-based 0.99, while diversity goes 0.65 against 0.32. So the answer to the second prediction is no: Hybrid is most accurate, but Content-based covers most items. Explain why a list that fits the user's taste is less varied.
2. **Remove 30 percent.** Predict: in the **Quick Quiz**, pick which recommender suffers most. Then set **Share of scored users with history removed** to 30%, check that **Interactions they keep** is 0, and press **Check answer**. The reveal names Matrix factorization with the drops 0.01, 0.32, 0.33, 0.35, 0.23 and 0.21. Press **Next cold-start user**: it is user 6, with 0 interactions kept of 22. Popularity, Content-based and Hybrid show the same list with a tick on item 25 at rank 7; the three collaborative rows say "scores tie" and start 0, 1, 2. Explain why Content-based and Hybrid equal Popularity here.
3. **How many interactions?** Predict: how many kept interactions before cold users look like warm ones? Set the share to 30% first, then raise **Interactions they keep** to 1, 3 and 5 and read the cold bars: User k-NN 0.35, 0.42 and 0.44, Matrix factorization 0.29, 0.36 and 0.43, Popularity flat near 0.24. Press **Next cold-start user** once first, which selects user 6, and then change the slider: at 3 the Hybrid row says "uses Content-based", at 5 it says "uses Matrix factorization". Explain why one interaction helps most.
4. **Top-k and the metric.** Predict: if the Hybrid's Recall@10 is 0.78, what is its Precision@10? Set **Metric in the charts** to Recall@10 and then Precision@10: 0.78 and 0.08. Now set **Top-k (list length)** to 1: the three metrics agree for each recommender (Popularity 0.10, User k-NN 0.24, Content-based 0.23). At 20, Recall@20 is 0.69 for Popularity and 0.91 for the Hybrid. Explain why precision stays small while recall climbs with k.
5. **Matrix factorization settings.** Predict: do more factors and a weaker penalty help? Set **MF factors** to 16 and **MF lambda (regularization)** to 0.1. The box switches to **MF training curve**: training error ends at 0.20 and validation error at 0.55, and the first chart shows Matrix factorization at 0.28 instead of 0.43. Raise lambda to 10: the two curves end at 0.51 and 0.56, and NDCG@10 is 0.25. Which of the three settings has the smallest gap, and which ranks best?
6. **A fresh sample.** Predict: does experiment 2 hold on other samples? Set the share to 30% and press **New sample** five times, picking a Quick Quiz answer and pressing **Check answer** each time. On samples 2 to 5 the answer is "The collaborative ones", with cold NDCG@10 of 0.05, 0.12, 0.08 and 0.03. On sample 6 it is Content-based, falling from 0.41 to 0.09, because Popularity scores only 0.09 for those 41 cold users. Then press **Reset**, set the share to 30% and move **Popularity skew** to 0 and to 2: Popularity's cold NDCG@10 is 0.23 and 0.47. There is no real-data switch in this lab, so the fresh samples and the skew are your transfer test. Does the idea survive them, and what does it depend on?
