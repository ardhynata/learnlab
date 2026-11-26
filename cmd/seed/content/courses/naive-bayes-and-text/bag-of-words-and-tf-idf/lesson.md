---
slug: bag-of-words-and-tf-idf
title: Bag of words and TF-IDF
kind: reading
simulator: ""
minutes: 20
---
::: intro
- Turn a short text into tokens, and a set of texts into count vectors over a vocabulary.
- Compute TF-IDF (term frequency times inverse document frequency) by hand for three tiny documents, and say why a word found in every document scores 0.
- Name what a bag of words throws away, and what that costs.

Before you start: read "Missing values and encoding" and "Distance and similarity". The first gave you one-hot columns, one column per category; this lesson gives a text one column per word. The second gave you cosine distance, which a "Go deeper" fold uses on word counts.
:::

## From text to numbers
*How does a sentence become something a model can use?*

Every model so far took a table of numbers, such as flipper length in mm. A sentence is not a row of numbers. Before any classifier can read text, each text must become a fixed-length list of numbers, one per feature.

In this lesson a text is a **document**: an email, a review, or one short sentence. A set of documents is a **corpus**. The first step is **tokenisation**: cut each document into pieces called **tokens**, usually words. A simple recipe lowercases everything, splits on spaces and drops punctuation. "The Cat sat on the mat." becomes *the, cat, sat, on, the, mat*. Lowercasing makes "The" and "the" the same token.

Real tokenisers make more choices: whether "don't" stays one token, what to do with numbers or emoji. Each choice changes the features, so it is a modelling decision and not a detail.

The lesson runs on a corpus of three documents, small enough to compute by hand:

| Document | Text |
| --- | --- |
| D1 | the cat sat on the mat |
| D2 | the dog sat on the log |
| D3 | the cat chased the dog |

[[figure:bag-of-words-and-tf-idf/pipeline|From a sentence to numbers: tokenise, then count each vocabulary word. D1 becomes the list 2, 1, 1, 1, 1, 0, 0, 0.]]

## Bag of words
*What does a count vector look like?*

The **vocabulary** is the list of distinct tokens in the corpus, and each one becomes a feature. Listed in order of first appearance, the three documents have 8: *the, cat, sat, on, mat, dog, log, chased*.

The **bag of words** describes a document by how many times each vocabulary word occurs in it. Tip the words into a bag, shake it, and the counts survive while the order does not. Each document becomes a row of 8 counts:

| Doc | the | cat | sat | on | mat | dog | log | chased |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D1 | 2 | 1 | 1 | 1 | 1 | 0 | 0 | 0 |
| D2 | 2 | 0 | 1 | 1 | 0 | 1 | 1 | 0 |
| D3 | 2 | 1 | 0 | 0 | 0 | 1 | 0 | 1 |

This is the one-hot idea from "Missing values and encoding", with one change: a one-hot cell holds 0 or 1, and a bag-of-words cell holds a count. The table is now an ordinary feature table, so any classifier from the earlier lessons can take it as input.

[[figure:bag-of-words-and-tf-idf/count-matrix|The three documents as a count table. Darker cells hold larger counts, and the faint cells are zeros.]]

## Sparse features
*Why are most of the numbers zeros?*

In the table above 10 of the 24 cells are zero. With a real corpus the share is far higher. Say the vocabulary has 20,000 words and one email uses 60 different ones. At most 60 of its 20,000 cells can be non-zero, which is 60 / 20,000 = 0.3%. A row that is nearly all zeros is called **sparse**.

Storing 19,940 zeros wastes memory, so software keeps only the non-zero cells, each as a pair (word number, count). Number the vocabulary from 0 and D1 becomes five pairs instead of eight values:

(0, 2), (1, 1), (2, 1), (3, 1), (4, 1)

Read it as: word 0 (*the*) twice, word 1 (*cat*) once, and so on. A cell that is missing means 0.

Sparse storage changes nothing about the model, only about the cost. It does come with a risk from "Underfitting and overfitting": with thousands of features and few training texts, a model has room to memorise accidents of the training texts. Cutting the vocabulary down, as the next section does, helps with that.

## Stop words and clean-up
*Which words should the vocabulary leave out?*

Look at the *the* column: 2, 2, 2. It is the same in every document, so it cannot tell D1 from D3. (*on* is not constant here, 1, 1, 0, but it is a very common word, so lists include it anyway.) **Stop words** are very common words such as *the, on, a, of, is*. Many pipelines drop them before counting. Dropping *the* and *on* from our corpus shrinks the vocabulary from 8 words to 6: *cat, sat, mat, dog, log, chased*.

Other clean-up steps follow the same logic. Lowercasing merges "Cat" and "cat". Some pipelines also **stem** words, cutting "chased" and "chases" down to a shared stem, and some drop words seen in only one or two documents, which are often typos.

> Watch out: a stop word is not always useless. Some stop-word lists contain "not", and "not good" means the opposite of "good". Whether to drop a word depends on the task, so compare the choices on a validation set instead of trusting a list.

There is also a gentler route than deleting words: keep them and let their numbers shrink. That is what TF-IDF does next.

## TF-IDF
*How do you make telling words count for more?*

A raw count treats every word alike, but a word found in only one document says much more about it than a word found everywhere. TF-IDF multiplies two numbers for each word in each document.

- **Term frequency (tf):** how many times the word occurs in this document, here the raw count.
- **Document frequency (df):** how many documents contain the word at all.
- **Inverse document frequency (idf):** ln(N / df), where N is the number of documents and ln is the natural logarithm. A word in every document has df = N, so idf = ln(1) = 0. The rarer the word, the larger the idf.

**TF-IDF = tf x idf.** A word scores high in a document when it is frequent there and rare across the corpus.

> Key idea: TF-IDF keeps the count as a measure of how much a document uses a word, and scales it by how few documents use that word. A word found everywhere is scaled to nothing.

Libraries differ in the details: some divide the count by the document length, some add 1 inside the logarithm, and some rescale every row to length 1. The numbers then change, but the idea stays. In this lesson tf is the raw count and idf = ln(N / df).

## TF-IDF by hand
*Can you compute it with a pencil on three documents?*

The corpus has N = 3 documents. Count df for each word, then idf = ln(3 / df):

| Word | the | cat | sat | on | mat | dog | log | chased |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| df | 3 | 2 | 2 | 2 | 1 | 2 | 1 | 1 |
| idf | 0 | 0.41 | 0.41 | 0.41 | 1.10 | 0.41 | 1.10 | 1.10 |

> Worked example: **D1.** *the* occurs twice, but df = 3, so idf = ln(3 / 3) = 0 and tf-idf = 2 x 0 = 0. *cat* occurs once and df = 2, so idf = ln(1.5) = 0.41 and tf-idf = 1 x 0.41 = 0.41. *mat* occurs once and df = 1, so idf = ln(3) = 1.10 and tf-idf = 1 x 1.10 = 1.10. *sat* and *on* score 0.41 like *cat*.

D1 becomes (0, 0.41, 0.41, 0.41, 1.10, 0, 0, 0). Its most telling word is *mat*, the only word that none of the other documents use. The word it uses most, *the*, scores 0.

[[figure:bag-of-words-and-tf-idf/tfidf-matrix|The idf of each word, then the TF-IDF table for the three documents. Each document's own unique word scores highest, and the column for the scores 0.]]

Tf still matters. Had *mat* occurred 3 times in D1, its score would be 3 x 1.10 = 3.30.

::: deeper Do documents look more alike by counts or by TF-IDF?
Use cosine similarity (1 minus the cosine distance from "Distance and similarity") on the rows of the tables. On raw counts, D1 and D2 have cosine similarity 0.75, and D1 and D3 have 0.67. Most of that comes from the shared *the*, *sat* and *on*: the dot product of D1 and D2 is 2 x 2 + 1 x 1 + 1 x 1 = 6, and each length is the square root of 8.

On TF-IDF rows the same pairs score 0.19 and 0.10. Without the weight on *the*, the documents share much less, and the numbers say so. The order of the pairs is the same here, but the common word no longer makes unrelated documents look alike.
:::

## What a bag leaves out
*What does this recipe throw away?*

Count D3, "the cat chased the dog", again: 2, 1, 0, 0, 0, 1, 0, 1. Now count the opposite story, "the dog chased the cat". It uses the same words the same number of times, so its row is the same eight numbers. A bag of words cannot tell who chased whom.

[[figure:bag-of-words-and-tf-idf/word-order|Two sentences with opposite meanings and one identical count vector. The bag keeps the words and loses their order.]]

The same loss hides "good" inside "not good", and a word's sense in its surroundings. One fix is **n-grams**: add pairs of neighbouring words, such as "not good", to the vocabulary as extra features. The price is a much bigger and sparser table.

The vocabulary and the idf values are also learned from data, so they follow the habit from "Pipelines and leakage": compute them on the training documents only. A word that appears first in a new document has no column and is ignored.

::: deeper Other TF-IDF recipes
Two common variants: (1) replace the count with 1 + ln(count), so the tenth *mat* adds less than the first; (2) use ln((1 + N) / (1 + df)) + 1 as the idf, which keeps every idf above 0 and avoids dividing by zero for a word with df = 0. With variant 2 and our corpus, the idf of *the* would be 1 instead of 0, and the idf of *mat* would be ln(4 / 2) + 1 = 1.69 instead of 1.10. Which recipe works best is a question for a validation set.
:::

## Where this goes next
*How do these numbers feed a classifier?*

You now have the first half of a text classifier: a way to turn any document into a row of numbers. A model still has to learn from those rows which words point to which class.

The next lesson, Naive Bayes, does that with probabilities: it turns the word counts of each class into the probability that a new document belongs to it. It relies on Bayes' rule from "Conditional probability and Bayes' rule".

Then the text classifier lab brings both halves together. You train a classifier on text and inspect which words drive its predictions and its mistakes. Keep three things in mind when you get there: the vocabulary is a choice, stop words are a choice, and counts versus TF-IDF is a choice. Each of them changes what the model can see.

::: remember
- Tokenise a document, build a vocabulary, and count each word: that is a bag of words. The table is sparse, and word order is lost.
- Stop words are very common words that carry little, and dropping them is a choice to test.
- TF-IDF = tf x idf, with idf = ln(N / df). A word in every document scores 0, and a word found in few documents scores high.
:::
