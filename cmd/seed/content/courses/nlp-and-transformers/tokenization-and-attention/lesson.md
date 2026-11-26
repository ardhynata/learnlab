---
slug: tokenization-and-attention
title: Tokenization and attention
kind: reading
simulator: ""
minutes: 25
---
::: intro
- Compare word, character and subword tokens, and run three byte-pair merges by hand on a tiny corpus.
- Explain how a token becomes a vector, and why a model must add position information to it.
- Compute self-attention for three tokens with 2-D vectors, and name the four parts of a transformer block.

Before you start: read "Bag of words and TF-IDF" in the Naive Bayes and text classification course, "Embeddings and autoencoders" in the Representation learning course, and "Neurons and backpropagation" in the Neural network fundamentals course. The first showed what counting words throws away, the second what a vector for an item is, and the third the small network that sits inside every block.
:::

## From text to tokens
*What is the unit that a model reads?*

A model reads numbers, not letters. The first step is to cut the text into pieces called **tokens** and to give every distinct token a whole number, its **id**. The set of tokens the model knows is its **vocabulary**. "Bag of words and TF-IDF" cut text into words and counted them. Words are only one choice of piece.

| Unit | "unhappiness" becomes | Trade-off |
| --- | --- | --- |
| Words | unhappiness (1 token) | Short sequences, but the vocabulary must hold every word, and a word it never saw has no id. |
| Characters | u, n, h, a, p, p, i, n, e, s, s (11 tokens) | Tiny vocabulary and nothing is unknown, but sequences get long and one letter carries little meaning. |
| Subwords | un, happi, ness (3 tokens) | A middle road: common words stay whole, and rare words split into pieces that other words reuse. |

The subword split is one possible result. The real split depends on the tokenizer. Most modern text models use subwords, and the tokenizer itself is learned from data. The next section builds a tiny one.

## Byte-pair merges by hand
*How can a tokenizer learn its pieces from data?*

**Byte-pair encoding** (BPE) learns subwords with one rule: start from single characters, then repeatedly merge the pair of neighboring tokens that occurs most often into one new token. Each merge adds one token to the vocabulary.

Take a corpus of four words with their counts: low (5 times), lower (2), newer (6) and wider (3). Split into characters, it holds 5 × 3 + 2 × 5 + 6 × 5 + 3 × 5 = 70 tokens.

| Merge | Most frequent pair | Count | New token | Tokens in the corpus |
| --- | --- | --- | --- | --- |
| 1 | e + r | 11 | er | 59 |
| 2 | w + er | 8 | wer | 51 |
| 3 | l + o | 7 | lo | 44 |

> Worked example: **Merge 1.** The pair e + r occurs in lower (2), newer (6) and wider (3), so 2 + 6 + 3 = 11 times, more than any other pair (w + e is next with 8). Every e r becomes er. **Merge 2.** Now newer reads n e w er, so w + er occurs in lower (2) and newer (6): 8 times, ahead of l + o with 7. **Merge 3.** l + o occurs in low (5) and lower (2): 7 times, ahead of n + e and e + wer with 6 each (o + w is only in low now, 5 times, because lower reads l o wer).

[[figure:tokenization-and-attention/bpe-merges|The four words after each merge. Colored pieces are the new tokens, and the corpus shrinks from 70 tokens to 44.]]

A fourth merge would be a tie between n + e and e + wer, at 6 each, so a real tokenizer needs a tie-breaking rule. Stop here. An unseen word still gets pieces: replay the merges in order on "lowered", l o w e r e d. It becomes l o w er e d, then l o wer e d, then lo wer e d: four tokens.

## Tokens to vectors
*How does a token id become a list of numbers?*

An id is only a label: id 7 is not "more" than id 3 in any useful way. The model needs a vector. It keeps a table with one row per token in the vocabulary, the **embedding matrix**, and each row holds d numbers. To embed a token, look up its row. A vocabulary of 50,000 tokens with d = 768 would hold 50,000 × 768 = 38,400,000 numbers.

The rows start random and are trained together with the rest of the model. Tokens used in similar ways end up with nearby rows, the idea of "Embeddings and autoencoders". A sentence of 3 tokens becomes a table of 3 vectors, one per token, in order.

Compare this with a bag of words. There, a document was one row of counts with one column per word, and the order was gone. Here a document stays a sequence of short dense vectors, so order can still be used. The next sections show how.

> Watch out: at this point the same token has the same vector wherever it appears. The "bank" of a river and a bank that lends money start with one row. Their difference has to come from the other tokens around them, and that is what attention supplies.

## Why order needs positions
*Why does the model have to be told where each token is?*

Attention, described in the next section, never looks at order. The score between two tokens depends only on their vectors. Swap two tokens in the input and their outputs swap too, with nothing else changed. "The cat chased the dog" and "the dog chased the cat" would give every token the same output vector. That is the bag-of-words problem again, even though attention is far richer than counting.

The fix is to add a **position vector** to each token's embedding before attention. Two kinds are common. **Learned positions** are a second table with one row per position, trained like the embedding table. **Sinusoidal positions** come from a fixed formula. With d = 2, position p gets the vector (sin p, cos p):

| Position p | 0 | 1 | 2 |
| --- | --- | --- | --- |
| (sin p, cos p) | (0, 1) | (0.84, 0.54) | (0.91, -0.42) |

> Worked example: "dog" has the embedding (2, 1). At position 0 the model sees (2, 1) + (0, 1) = (2, 2). At position 2 it sees (2, 1) + (0.91, -0.42) = (2.91, 0.58). The same word now has two different vectors, so attention can tell the two places apart.

[[figure:tokenization-and-attention/position-vectors|Left: the two sinusoidal numbers at positions 0 to 7. Right: the word "dog" with two different positions added.]]

## Queries, keys and values
*How does one token decide which other tokens matter to it?*

**Self-attention** builds a new vector for each token as a weighted mix of the vectors of all tokens in the sentence, itself included. The weights are not fixed. They are worked out from the sentence.

Each token vector x is turned into three vectors by three learned matrices: a **query** q (what this token looks for), a **key** k (what it offers to be found by) and a **value** v (what it hands over when chosen). For example, if x = (1, 2) and W_q has the rows (0, 1) and (1, 1), then q = 1 × (0, 1) + 2 × (1, 1) = (2, 3). For token i:

1. **Score** every token j: the dot product of q_i and k_j (multiply the matching numbers and add them up).
2. **Scale**: divide each score by the square root of d, the length of q and k.
3. **Softmax**: turn the scaled scores s into weights by w_j = exp(s_j) / (sum of all exp(s)). The weights are positive and add to 1, and the largest score gets the largest share.
4. **Mix**: the output for token i is the sum of w_j × v_j.

> Key idea: the weights come from comparing one query with every key, and the output is a mix of the values. A token that matches a key well takes in much of that token's value.

## Attention for three tokens
*Can you compute one attention step with a pencil?*

Take the sentence "the cat sat". To keep the arithmetic small, the three vectors of each token are given, invented for this lesson. d = 2, so the scale is the square root of 2, which is 1.414.

| Token | Query q | Key k | Value v |
| --- | --- | --- | --- |
| the | (0, 1) | (1, 0) | (1, 0) |
| cat | (1, 1) | (0, 2) | (0, 2) |
| sat | (1, 2) | (1, 1) | (2, 1) |

> Worked example: **the token "sat".** Scores, the dot product of q = (1, 2) with each key: the 1 × 1 + 2 × 0 = 1, cat 1 × 0 + 2 × 2 = 4, sat 1 × 1 + 2 × 1 = 3. Scaled: 0.707, 2.828 and 2.121. Exponentials: 2.03, 16.92 and 8.34, which add up to 27.29. Weights: 2.03 / 27.29 = 0.07, 16.92 / 27.29 = 0.62, 8.34 / 27.29 = 0.31. Output: 0.07 × (1, 0) + 0.62 × (0, 2) + 0.31 × (2, 1) = (0.07 + 0.62, 1.24 + 0.31) = (0.69, 1.55).

The same steps for the other two tokens give this table. Outputs use the unrounded weights.

| Query token | Weight on the | Weight on cat | Weight on sat | Output |
| --- | --- | --- | --- | --- |
| the | 0.14 | 0.58 | 0.28 | (0.71, 1.44) |
| cat | 0.20 | 0.40 | 0.40 | (1.00, 1.20) |
| sat | 0.07 | 0.62 | 0.31 | (0.69, 1.55) |

[[figure:tokenization-and-attention/attention-weights|Left: how the scores for "sat" become weights. Right: all three rows of weights, with each output vector.]]

"sat" puts most of its weight on "cat", so its output (0.69, 1.55) lies close to the value of "cat", (0, 2). Each token's vector now carries some context from the others.

::: deeper Why divide by the square root of d
Suppose the numbers in q and k are independent, each with mean 0 and variance 1. Then the dot product has variance d, so its typical size is the square root of d: about 8 when d = 64. Scores that large make softmax almost one-hot (all the weight on one token and none on the rest), with very small gradients, the slopes that training follows, for the rest. Dividing by the square root of d brings the typical size back to about 1. Here d = 2, so the effect is small: without the scaling, "sat" would put 0.71 on "cat" instead of 0.62.
:::

## Heads and the transformer block
*What is a transformer block made of?*

One set of query, key and value matrices looks for one kind of relation. **Multi-head attention** runs several attention steps side by side, each head with its own three matrices, then joins their outputs and mixes them with one more matrix. Training decides what each head looks for.

A **transformer block** has four parts:

1. **Multi-head self-attention.** Tokens exchange information.
2. **Residual connection.** The input of a part is added back to its output, out = x + f(x), a shortcut that helps a deep stack train ("Activations, initialization and optimizers").
3. **Normalization.** Each token's vector is rescaled to mean 0 and standard deviation 1, then a learned scale and shift are applied.
4. **Feed-forward network.** A small two-layer network ("Neurons and backpropagation") applied to each token's vector on its own, with the same weights. Attention mixes across tokens, and this part transforms each token.

The usual order is attention, add and normalize, feed-forward, add and normalize. Models differ in where they normalize. A model stacks many blocks, and the output vectors of one block are the input of the next.

[[figure:tokenization-and-attention/transformer-block|One transformer block. The two curved arrows are the residual connections that add the input back.]]

::: deeper Residual and normalization with numbers
Say a token's vector is x = (1, 5) and the attention part returns (0.5, -1). The residual connection gives x + f(x) = (1.5, 4). Normalization then takes this sum (1.5, 4): its mean is 2.75 and its deviations from the mean are (-1.25, 1.25), whose typical size, the standard deviation, is 1.25. Dividing by it gives (-1, 1). Real layers also apply a learned scale and shift, and add a tiny constant to avoid dividing by zero.
:::

::: deeper Why one frequency is not enough
The pair (sin p, cos p) repeats every 6.28 positions: position 6 gives (-0.28, 0.96), close to position 0 at (0, 1). Real sinusoidal positions use many pairs. Pair number i in a vector of length d uses sin and cos of p / 10000^(2i / d), so the waves run from fast to very slow, and every position gets its own pattern. A learned table avoids the formula but cannot give a useful vector for a position beyond the end of its table.
:::

## Where this goes next
*What do you have now, and what comes after?*

You now know the whole path from text to context. A tokenizer cuts the text into tokens, an embedding table turns each id into a vector, position vectors are added, and a stack of blocks lets every token mix in what the others carry. The last block returns one vector per token, and each of those vectors now depends on its neighbors. Nothing here needs labels yet: the tables and matrices are all learned by training.

The next lesson, "Pretrained models and fine-tuning", asks where the weights of such a network come from and how they are reused for a small labeled task. The attention lab then ends the course: you trace attention in a small model, where each row of the weight table you computed by hand is a row on screen.

::: remember
- Tokenization cuts text into words, characters or subwords. Byte-pair encoding learns subwords by merging the most frequent neighboring pair again and again, and each token id is looked up in an embedding matrix to get a vector.
- Self-attention mixes value vectors with weights from softmax(q · k / the square root of d). For "sat" the weights were 0.07, 0.62 and 0.31. Attention ignores order, so a position vector is added to each token.
- A transformer block is multi-head attention, residual connections, normalization and a feed-forward network, stacked many times.
:::
