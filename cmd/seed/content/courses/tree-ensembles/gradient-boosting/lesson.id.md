---
slug: gradient-boosting
title: Gradient boosting
---
::: intro
- Bangun model boosting secara manual: dua tree kecil pada enam penguin asli, masing-masing dilatih pada kesalahan yang masih dibuat model.
- Jelaskan learning rate, dan mengapa melatih tree pada residual sama dengan gradient descent yang diterapkan pada prediksi.
- Tentukan jumlah tree dengan memantau galat validation, dan kenali kapan bagging dan kapan boosting yang lebih tepat.

Sebelum mulai: baca "Bagging dan random forest" di kursus ini, serta "Kedalaman dan ukuran leaf" dan "Gradient descent". "Bias, varians, dan shrinkage" membantu untuk bagian terakhir.
:::

## Melatih sisa kesalahan
*Apa yang dilakukan model boosting yang tidak dilakukan satu tree?*

"Bagging dan random forest" menumbuhkan banyak tree yang dalam secara berdampingan, masing-masing pada bootstrap sample-nya sendiri, lalu merata-ratakannya. **Gradient boosting** berjalan ke arah sebaliknya. Ia menumbuhkan tree kecil satu demi satu, dan setiap tree baru dilatih pada kesalahan yang masih dibuat tree-tree sebelumnya.

Pelajaran ini memakai kasus paling sederhana: memprediksi sebuah angka dengan squared error. **Residual** adalah nilai sebenarnya dikurangi prediksi saat ini, seperti di "Loss function". Alurnya begini:

1. Mulai dari satu prediksi yang sama untuk semua baris: rata-rata target.
2. Hitung residual setiap baris training.
3. Latih sebuah tree kecil pada residual itu, bukan pada target.
4. Tambahkan output tree ke setiap prediksi setelah dikalikan dengan angka kecil, yaitu **learning rate**.
5. Kembali ke langkah 2 sampai jumlah tree-nya sebanyak yang kamu pilih.

Baris baru mendapat nilai awal ditambah learning rate kali output setiap tree. Satu tree kecil adalah model yang lemah, tetapi jumlah dari banyak tree tidak lagi lemah.

> Gagasan kunci: setiap tree setelah yang pertama dilatih pada kesalahan model sejauh ini, bukan pada target aslinya.

## Tree yang memprediksi angka
*Bagaimana sebuah tree dapat menjawab dengan angka, bukan kelas?*

Tree di "Split dan impurity" berakhir pada label kelas dan memilih split berdasarkan impurity. **Regression tree** punya bentuk yang sama, tetapi sebuah leaf berisi angka: **rata-rata** nilai target yang sampai ke sana. Split yang dipilih adalah yang **squared error**-nya paling kecil, yaitu jumlah kuadrat selisih setiap nilai terhadap rata-rata sisinya. Boosting menjaga tree-nya tetap kecil. Sebuah **stump** hanya punya satu split dan dua leaf.

Berikut enam penguin asli dari tabel bawaan, dengan massa tubuh dalam kilogram. (Percobaan data asli di bagian berikutnya memakai gram, seperti di file-nya.) Setiap kemungkinan split pada panjang sirip berada tepat di tengah antara dua nilai bertetangga.

| Sirip (mm) | 181 | 191 | 195 | 209 | 219 | 228 |
| --- | --- | --- | --- | --- | --- | --- |
| Massa (kg) | 3,75 | 3,35 | 4,30 | 4,80 | 5,20 | 5,60 |
| Spesies | Adelie | Adelie | Adelie | Gentoo | Gentoo | Gentoo |

| Split | Rata-rata kiri | Rata-rata kanan | Squared error |
| --- | --- | --- | --- |
| sirip ≤ 186 | 3,75 | 4,65 | 3,040 |
| sirip ≤ 193 | 3,55 | 4,975 | 1,008 |
| sirip ≤ 202 | 3,80 | 5,20 | 0,775 |
| sirip ≤ 214 | 4,05 | 5,40 | 1,285 |
| sirip ≤ 223,5 | 4,28 | 5,60 | 2,263 |

> Contoh hitungan: pada split di 202 mm, leaf kiri berisi 3,75, 3,35, dan 4,30 dengan rata-rata 11,40 / 3 = 3,80. Kuadrat selisihnya 0,0025 + 0,2025 + 0,25 = 0,455. Leaf kanan berisi 4,80, 5,20, dan 5,60 dengan rata-rata 5,20 serta kuadrat selisih 0,16 + 0 + 0,16 = 0,32. Totalnya 0,775, yang terendah di tabel, sehingga stump membelah di 202 mm.

## Dua tahap secara manual
*Dapatkah kamu melakukan boosting hanya dengan pensil dan learning rate 0,5?*

**Awal.** Rata-rata massanya 27,00 / 6 = 4,50 kg. Setiap penguin mendapat 4,50, dan residualnya (massa dikurangi 4,50) ada di kolom Residual pada tabel pertama di bawah. Mean squared error (MSE) adalah 3,715 / 6 = 0,62.

**Tree 1.** Mengurangi setiap massa dengan 4,50 tidak mengubah split mana yang terbaik, sehingga stump kembali membelah di 202 mm. Setiap leaf mengeluarkan rata-rata residual: (-0,75 - 1,15 - 0,20) / 3 = -0,70 di kiri dan (0,30 + 0,70 + 1,10) / 3 = +0,70 di kanan. Dengan learning rate 0,5, setiap prediksi bergeser setengah dari angka itu, sehingga 4,50 menjadi 4,15 atau 4,85. MSE turun menjadi 1,51 / 6 = 0,25.

| Sirip (mm) | Massa | Awal | Residual | Output tree 1 | Setelah tree 1 |
| --- | --- | --- | --- | --- | --- |
| 181 | 3,75 | 4,50 | -0,75 | -0,70 | 4,15 |
| 191 | 3,35 | 4,50 | -1,15 | -0,70 | 4,15 |
| 195 | 4,30 | 4,50 | -0,20 | -0,70 | 4,15 |
| 209 | 4,80 | 4,50 | 0,30 | 0,70 | 4,85 |
| 219 | 5,20 | 4,50 | 0,70 | 0,70 | 4,85 |
| 228 | 5,60 | 4,50 | 1,10 | 0,70 | 4,85 |

**Tree 2** dilatih pada residual yang baru, yaitu massa dikurangi kolom "Setelah tree 1".

| Sirip (mm) | Massa | Setelah tree 1 | Residual | Output tree 2 | Setelah tree 2 |
| --- | --- | --- | --- | --- | --- |
| 181 | 3,75 | 4,15 | -0,40 | -0,60 | 3,85 |
| 191 | 3,35 | 4,15 | -0,80 | -0,60 | 3,85 |
| 195 | 4,30 | 4,15 | 0,15 | 0,30 | 4,30 |
| 209 | 4,80 | 4,85 | -0,05 | 0,30 | 5,00 |
| 219 | 5,20 | 4,85 | 0,35 | 0,30 | 5,00 |
| 228 | 5,60 | 4,85 | 0,75 | 0,30 | 5,00 |

[[figure:gradient-boosting/two-stages|Enam penguin dan prediksi model (garis) pada awal, setelah tree 1, dan setelah tree 2. Batang putus-putus adalah residual yang menjadi bahan latihan tree berikutnya.]]

## Yang dipelajari tree kedua
*Mengapa tree 2 membelah di tempat yang berbeda dari tree 1?*

Tree 1 melihat jurang besar antara Adelie dan Gentoo dan membelah di sana. Ia memperlakukan ketiga Adelie sebagai satu kelompok, padahal residual barunya berbeda-beda: -0,40, -0,80, dan +0,15. Split terbaik untuk residual ini ada di 193 mm, dengan squared error 0,43 dibandingkan 0,775 di 202 mm. Leaf-nya mengeluarkan -0,60 (181 dan 191 mm) serta (0,15 - 0,05 + 0,35 + 0,75) / 4 = +0,30 (empat sisanya). Setelah tree 2, residualnya menjadi -0,10, -0,50, 0, -0,20, 0,20, dan 0,60, dan MSE-nya 0,70 / 6 = 0,12.

> Contoh hitungan: sebuah penguin baru punya sirip 200 mm. Tree 1 mengirimnya ke kiri (200 ≤ 202) dengan output -0,70. Tree 2 mengirimnya ke kanan (200 > 193) dengan output +0,30. Prediksinya 4,50 + 0,5 × (-0,70) + 0,5 × 0,30 = 4,50 - 0,35 + 0,15 = 4,30 kg.

Setiap tree dilatih pada residual, bukan pada massa, sehingga ia dapat memperbaiki kekeliruan tree sebelumnya. Model ini adalah nilai awal ditambah learning rate kali jumlah output semua tree.

> Awas: enam penguin jauh terlalu sedikit untuk memercayai split seperti 193 mm. Data ini hanya untuk latihan hitungan. Percobaan data asli di bawah memakai 200 penguin training.

## Learning rate
*Mengapa hanya sebagian dari setiap tree yang ditambahkan?*

Pada enam penguin tadi, MSE training setelah satu dan dua tree bergantung pada learning rate seperti ini:

| Learning rate | MSE setelah tree 1 | MSE setelah tree 2 |
| --- | --- | --- |
| 0,1 | 0,53 | 0,45 |
| 0,5 | 0,25 | 0,12 |
| 1 | 0,13 | 0,10 |

Learning rate besar mencocokkan baris training paling cepat, dan di situlah jebakannya: ia memercayai setiap tree sepenuhnya, termasuk kebetulan di dalam leaf-nya. Enam baris tidak dapat memperlihatkan kerugiannya, karena itu kita pakai data asli. Tugasnya memprediksi massa tubuh dalam gram dari panjang paruh, kedalaman paruh, dan panjang sirip, untuk 333 penguin yang tidak punya missing value. Pembagiannya sama dengan di "Kedalaman dan ukuran leaf": 200 penguin training, 67 validation, dan 66 test. Tree-nya berkedalaman 2. Memprediksi rata-rata training untuk semua penguin menghasilkan RMSE validation 797 g. RMSE adalah akar dari MSE, sehingga satuannya kembali gram ("Loss function").

| Learning rate | Jumlah tree terbaik | RMSE validation di titik itu | RMSE validation pada 300 tree | RMSE training pada 300 tree |
| --- | --- | --- | --- | --- |
| 0,1 | 45 | 345 | 385 | 182 |
| 0,3 | 23 | 345 | 443 | 97 |
| 1 | 13 | 380 | 506 | 21 |

[[figure:gradient-boosting/learning-rates|RMSE validation saat tree ditambahkan, untuk tiga learning rate. Setiap titik adalah titik terendah kurvanya.]]

Learning rate yang lebih kecil membutuhkan lebih banyak tree. Di sini dua learning rate yang lebih kecil mencapai skor terbaik yang sama, 345 g, lebih baik daripada 380 g milik learning rate 1. Dengan learning rate 1, model mencocokkan penguin training hampir sempurna (21 g) dan justru paling buruk pada penguin validation.

## Gradient descent pada prediksi
*Mengapa disebut gradient boosting?*

Di "Gradient descent" kamu menggeser sebuah parameter berlawanan arah dengan gradient: nilai baru = nilai lama - learning rate × gradient. Boosting melakukan gerakan yang sama, tetapi yang digeser adalah prediksi model untuk setiap baris training. Untuk satu baris dengan squared error (y - F)², dengan F prediksi saat ini, gradient terhadap F adalah 2 × (F - y), yaitu -2 × residual. Karena itu arah menurun adalah arah residual, dikalikan konstanta 2 yang diserap oleh learning rate.

> Contoh hitungan: penguin pertama punya y = 3,75 dan F = 4,50. Loss-nya (3,75 - 4,50)² = 0,5625 dan gradient-nya 2 × (4,50 - 3,75) = 1,5, sehingga arah menurun menunjuk ke prediksi yang lebih kecil, sama seperti residual -0,75. Langkah sebesar 0,5 × residual membuat F = 4,50 - 0,375 = 4,125, dan loss turun menjadi (3,75 - 4,125)² = 0,1406.

Menggeser setiap baris sendiri-sendiri hanya akan menghafal baris training. Tree yang dilatih pada residual memberi setiap baris rata-rata langkah di leaf-nya, dan baris baru juga jatuh ke sebuah leaf. Untuk penguin ini, tree 1 menggeser prediksi sebesar 0,5 × (-0,70) = -0,35, mendekati -0,375 di atas.

> Gagasan kunci: boosting adalah gradient descent di ruang prediksi. Setiap tree adalah satu langkah, learning rate adalah panjang langkahnya, dan jumlah tree adalah jumlah langkahnya.

::: deeper Boosting untuk classifier
Untuk label ya-atau-tidak, loss-nya adalah log loss, seperti di "Log loss dan proses fitting". Alurnya sama, dengan dua perubahan. Model menyimpan skor berjalan pada skala log-odds, dan residual sebuah baris adalah labelnya (0 atau 1) dikurangi probabilitas yang saat ini diberikan model. Ensemble lab melakukan boosting pada label ya-atau-tidak dengan cara ini.
:::

## Berapa banyak tree
*Kapan kamu berhenti menambah tree?*

Setiap tree menurunkan galat training, sehingga kurva training tidak dapat memberi tahu kapan harus berhenti. Pantau validation set saja. Setelah setiap tree, beri skor pada penguin validation dan simpan jumlah tree dengan galat terendah. Cara ini disebut **early stopping**.

Ambil learning rate 0,1. RMSE training turun terus: 805 g tanpa tree, 429 dengan 10, 286 dengan 45, 252 dengan 100, dan 182 dengan 300. RMSE validation turun sampai 345 g pada 45 tree, lalu naik: 350 pada 100 dan 385 pada 300. Lewat 45 tree, tree baru hanya mencocokkan noise pada 200 penguin training.

[[figure:gradient-boosting/stopping-curve|RMSE training dan validation saat tree ditambahkan (learning rate 0,1, kedalaman 2). Kurva validation mencapai titik terendah di 45 tree.]]

Lekukannya dangkal dan berisik, sehingga aturan yang berhenti pada kenaikan pertama mudah tertipu: pada kurva ini ia berhenti di 36 tree. Aturan dengan **patience** 10 putaran tanpa rekor baru mempertahankan 45.

## Dari 30 pembagian
*Apakah 45 tree adalah sifat data atau hanya sifat satu pembagian?*

Ulangi seluruh percobaan pada 30 pembagian yang berbeda (seed 1 sampai 30). Jumlah tree terbaiknya berada di antara 20 dan 171 pada 29 pembagian, dengan median 54 dari seluruh 30. Pada satu sisanya, kurva masih turun di 300 tree yang dicoba. Pada penguin test, model yang mempertahankan jumlah tree dengan galat validation terendah punya RMSE rata-rata 351 g, sedangkan model 300 tree 370 g.

> Awas: validation set yang memilih jumlah tree, sehingga galatnya pada jumlah itu sedikit terlalu bagus. Laporkan skor akhir pada test set, seperti di "Tuning dengan search".

## Bagging dan boosting
*Kapan masing-masing membantu?*

Keduanya menggabungkan banyak tree, tetapi masalah yang diperbaiki berbeda. Berikut empat model pada pembagian yang sama, dalam RMSE gram. Pada percobaan di pelajaran ini, bagging adalah 100 tree berkedalaman 8 pada bootstrap sample, lalu dirata-ratakan.

| Model | Training | Validation | Test |
| --- | --- | --- | --- |
| Satu tree kedalaman 8 | 168 | 430 | 450 |
| 100 tree kedalaman 8 dengan bagging | 154 | 335 | 379 |
| Satu tree kedalaman 2 | 391 | 391 | 440 |
| 45 tree kedalaman 2 dengan boosting (learning rate 0,1) | 286 | 345 | 365 |

Satu tree yang dalam mencocokkan penguin training dengan rapat tetapi meleset pada penguin validation: varians tinggi. Merata-ratakan 100 tree seperti itu menurunkan RMSE validation dari 430 menjadi 335. Satu tree berkedalaman 2 mendapat 391 yang sama pada kedua set, sehingga ia terlalu kaku: **bias** tinggi, artinya model terlalu sederhana untuk mengikuti pola dan meleset bahkan pada baris training. Boosting 45 tree seperti itu menurunkannya menjadi 345. Selisih 379 dan 365 pada 66 penguin test dari satu pembagian terlalu kecil untuk menentukan pemenang.

[[figure:gradient-boosting/bagging-vs-boosting|Bagging membangun tree yang dalam secara independen lalu merata-ratakannya. Boosting membangun tree kecil dalam rantai, masing-masing dilatih pada sisa kesalahan.]]

Menambah tree pada bagging hanya membuat rata-ratanya lebih stabil. Menambah tree pada boosting dapat menyebabkan overfitting, sehingga jumlahnya adalah pengaturan yang kamu pilih lewat validation.

## Sebelum lab
*Apa yang akan kamu lakukan dengan ini di Ensemble lab?*

Kursus ini ditutup dengan Ensemble lab, tempat kamu menambah tree secara bertahap dan membandingkan bagaimana bagging dan boosting mengubah performa validation. Lab itu bekerja pada label ya-atau-tidak, sehingga residual di sana adalah label dikurangi probabilitas prediksi, seperti pada kotak "Boosting untuk classifier" di atas.

Buat tebakan sebelum menambah tree. Saat tree terus ditambah, apakah galat validation bagging akan terus turun atau berbalik naik? Bagaimana dengan boosting? Dari keduanya, mana yang menunjukkan jarak lebih lebar antara galat training dan validation? Lalu periksa setiap tebakan dan namai yang kamu lihat dengan istilah pelajaran ini: bias, varians, learning rate, early stopping.

::: remember
- Boosting menumbuhkan tree kecil secara berurutan. Masing-masing dilatih pada residual model sejauh ini, dan outputnya ditambahkan setelah dikalikan dengan learning rate.
- Melatih residual adalah gradient descent pada prediksi: tree adalah satu langkah, learning rate adalah panjangnya, dan rate yang lebih kecil membutuhkan lebih banyak tree.
- Pilih jumlah tree dari galat validation, dengan early stopping. Bagging merata-ratakan tree yang dalam untuk menurunkan varians; boosting menambah tree kecil untuk menurunkan bias.
:::
