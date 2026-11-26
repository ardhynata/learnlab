# Indonesian style and glossary

One document, one rule set. Every translator and every reviewer follows it. The owner reviews the wording; propose changes here (alphabetically) and mention them in your report.

## Tone

The Indonesian should sound like a good ML teacher talking to a student, not like English put into Indonesian words.

- **Natural, paraphrased.** Keep the meaning, the numbers, the structure and the quiz answers. Do not keep the English sentence shape: split or merge sentences, reorder clauses, drop English-style filler, use the idiom an Indonesian speaker would use. Read each sentence aloud; if it sounds like a translation, rewrite it.
- **Semi-formal register** (owner direction): the register of a well-edited tutorial site or textbook. Address the learner as **kamu** (never "Anda", never "gue/lo"). Friendly, plain, not stiff, not slangy.
- **Technical terms stay in English** when that is what Indonesian ML teaching actually says (list below). Italicize a term (`*overfitting*`) only on its first mention in a lesson, not every time. Everyday words are Indonesian.
- Keep code, variable names, formulas, file names and units exactly as in English.

## Register: replace these casual forms

| Too casual | Use |
|---|---|
| gimana | bagaimana |
| kenapa | mengapa |
| cuma, cuman | hanya |
| nggak, ngga, gak, enggak | tidak |
| ketemu | bertemu / menemukan / mendapatkan (by meaning) |
| makanya | karena itu / itulah sebabnya |
| bikin | membuat |
| aja | saja |
| udah | sudah |
| banget | sekali / sangat |
| dikit | sedikit |
| sih, deh, nih, kok, lah (as particles) | drop it |
| jangan kaget / jangan heran | tidak perlu heran |
| bisa (in explanations) | dapat or bisa: both fine; prefer "dapat" in definitions |
| jadi (as "so") | sehingga / karena itu / maka |
| cocok | sesuai |

`tapi` is acceptable in short instructions; use `tetapi` or `namun` in explanations. Keep affixes (menjalankan, not "jalanin"). Instructions are short and polite ("Geser slider-nya", "Coba ubah nilai k"). The lint (`lintTranslation`) flags the words in the first column.

## Terms

**Keep in English** (use as is): cluster, clustering, centroid, feature, label, target, loss, model, dataset, training set, validation set, test set, overfitting, underfitting, learning rate, gradient, gradient descent, threshold, accuracy, precision, recall, F1, confusion matrix, outlier, noise, scaling, epoch, regression, classification, supervised learning, unsupervised learning, decision boundary, decision tree, random forest, baseline, pipeline, leakage, k-means, DBSCAN, k-NN, PCA, ROC, AUC, silhouette, dendrogram, inertia, momentum, seed, run, neighbor (in "k-nearest neighbors"), vote.

**Use Indonesian** where it is the normal word: jarak (distance), titik (point), rata-rata (mean), median, varians (variance), simpangan baku (standard deviation), kelompok (group, in everyday sentences), langkah (step), kecepatan (speed), galat or kesalahan (error), prediksi (prediction), probabilitas (probability), nilai (value), contoh (example), data latih / data uji only when the English says "training data / test data" in plain prose (otherwise "training set / test set").

| English | Indonesian | Note |
|---|---|---|
| algorithm | algoritma | |
| bias (error) | bias | |
| convergence / converge | konvergensi / konvergen | |
| cost / loss | loss | keep |
| decision tree | decision tree | keep; "pohon keputusan" is fine once as a gloss |
| dimension / dimensionality reduction | dimensi / reduksi dimensi | |
| fold (cross-validation) | fold | |
| hyperparameter | hyperparameter | |
| linear / logistic regression | regresi linear / regresi logistik | |
| missing value | missing value | keep |
| outlier | outlier | keep (pencilan only as a gloss) |
| parameter | parameter | |
| supervised / unsupervised | supervised / unsupervised | keep, "learning" optional |
| variance | varians | |

## Callout labels

Use exactly these; the renderer (`md.js`) knows them: **Gagasan kunci** (Key idea), **Awas** (Watch out), **Contoh hitungan** (Worked example), **Coba sendiri** (Try it), **Catatan** (Note). The extra labels `Poin penting`, `Intinya`, `Hati-hati`, `Contoh kasus` also render, but prefer the five above. "Before you start" is **Sebelum mulai**.
