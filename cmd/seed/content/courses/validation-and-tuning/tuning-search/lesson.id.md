---
slug: tuning-search
title: Tuning dengan search
---
::: intro
- Menyusun search space, lalu menjalankan grid search dan random search di atasnya, dan menghitung berapa kali fit yang dibutuhkan masing-masing.
- Menjelaskan mengapa skor terbaik dalam sebuah search terlalu optimistis, dan bagaimana test set yang bersih atau nested cross-validation memberi angka yang jujur.
- Mencatat seed dan pengaturan sebuah run agar orang lain dapat mengulanginya dan mendapatkan pemenang yang sama.

Sebelum mulai: baca "Cross-validation dan stratifikasi" serta "Split berkelompok dan split temporal" di course ini, dan "Kedalaman dan ukuran leaf", tempat dua pengaturan tree dipilih dengan tangan pada satu split.
:::

## Pengaturan dan nilai yang dipelajari
*Apa yang dipilih oleh sebuah search, dan apa yang dipelajari model?*

Di "Menyetel k" dan "Kedalaman dan ukuran leaf" kamu memilih sebuah pengaturan dengan melihat skor validasi. Pengaturan seperti itu disebut **hyperparameter**: kamu menetapkannya sebelum training. **Parameter** adalah nilai yang ditemukan oleh training itu sendiri.

| Model | Hyperparameter (kamu yang memilih) | Parameter (ditemukan training) |
| --- | --- | --- |
| k-NN | k | tidak ada: model menyimpan baris-baris training |
| Decision tree | kedalaman maksimum, ukuran leaf minimum | feature dan threshold setiap split, label setiap leaf |
| Garis yang dilatih dengan gradient descent | learning rate, jumlah langkah | kemiringan dan intersep |

**Tuning** berarti mencoba banyak pengaturan, melatih satu model untuk masing-masing, lalu mempertahankan yang skor validasinya paling tinggi. **Search space** memuat nilai-nilai yang diizinkan untuk tiap hyperparameter, dan satu **konfigurasi** adalah satu pilihan untuk semuanya.

Pelajaran ini menyetel sebuah tree yang menjawab *apakah penguin ini jantan atau betina?* Datanya adalah 333 penguin dari "Kedalaman dan ukuran leaf", dipotong dengan cara yang sama (stratified, seed 4). Sebanyak 66 penguin test disimpan terkunci. Sisanya, 267 penguin, adalah data tuning.

> Gagasan kunci: search adalah loop training satu tingkat di atasnya. Training mencocokkan parameter dengan baris training, sedangkan search mencocokkan hyperparameter dengan skor validasi.

## Grid search
*Berapa model yang dilatih oleh sebuah grid search?*

Skor sebuah konfigurasi adalah accuracy cross-validation lima fold pada 267 penguin: berapa banyak penguin yang dijawab benar ketika masing-masing disisihkan bergiliran. Search space-nya adalah kedalaman maksimum 1 sampai 8 dan ukuran leaf minimum 1 sampai 20, sehingga ada 8 x 20 = 160 konfigurasi.

**Grid search** mencoba setiap kombinasi dari nilai-nilai yang tercantum. Cross-validation lima fold melatih 5 tree per konfigurasi, jadi ke-160 konfigurasi membutuhkan 160 x 5 = 800 fit. Grid yang lebih kasar lebih murah: kedalaman 2, 4, atau 6 dengan ukuran leaf 1, 10, atau 20 berarti 3 x 3 = 9 konfigurasi dan 9 x 5 = 45 fit.

| Kedalaman maksimum | Ukuran leaf 1 | Ukuran leaf 10 | Ukuran leaf 20 |
| --- | --- | --- | --- |
| 2 | 218 dari 267 | 217 dari 267 | 213 dari 267 |
| 4 | 232 dari 267 | 225 dari 267 | 224 dari 267 |
| 6 | 233 dari 267 | 221 dari 267 | 224 dari 267 |

Pemenangnya adalah kedalaman 6 dengan ukuran leaf 1: 233 dari 267, yaitu 87,3%. Kedalaman 4 dengan ukuran leaf 1 hanya tertinggal satu penguin. Satu penguin sama dengan 1 / 267, sekitar 0,4 poin.

> Awas: grid tumbuh secara perkalian. Satu hyperparameter ketiga dengan 5 nilai mengubah 9 konfigurasi menjadi 45 dan 45 fit menjadi 225.

## Seperti apa seluruh space-nya
*Pengaturan mana yang berpengaruh, dan seberapa besar noise-nya?*

Gambar menampilkan seluruh 160 konfigurasi, dengan biaya 800 fit.

[[figure:tuning-search/penguin-grid|Jumlah penguin yang benar dari 267 untuk setiap kedalaman dan ukuran leaf. Lingkaran menandai sembilan konfigurasi grid, dan garis tepi amber menandai yang terbaik dari seluruh 160.]]

Kedalaman adalah pengaturan yang berpengaruh. Kedalaman 1 memperoleh 168 benar, yaitu 62,9%, pada setiap ukuran leaf, karena pertanyaan tunggal terbaik sudah menyisakan paling sedikit 20 penguin di tiap sisi, sehingga ukuran leaf 1 sampai 20 tidak mengubahnya. Kedalaman 2 memperoleh sekitar 218 dan kedalaman 3 sekitar 220. Mulai kedalaman 4, skornya berkisar dari 221 sampai 235: permukaannya datar tetapi bergelombang, dan ukuran leaf menggeser skor hingga sekitar selusin penguin tanpa arah yang jelas.

Yang terbaik dari seluruh 160 adalah kedalaman 7 dan juga kedalaman 8 pada ukuran leaf 3, dengan 235 dari 267, yaitu 88,0%. Grid sembilan konfigurasi mencapai 233, hanya 2 penguin lebih rendah, dengan 45 fit dan bukan 800.

Seberapa besar 2 penguin itu? Standard error untuk skor 88% pada 267 penguin sekitar akar dari 0,88 x 0,12 / 267 = 0,020, yaitu 2 poin atau sekitar 5 penguin. Selisih 2 jauh di dalam noise.

## Random search
*Mengapa random search dapat mengalahkan grid dengan budget yang sama?*

**Random search** mengambil sejumlah tetap konfigurasi secara acak dari space, melatih masing-masing, dan mempertahankan yang terbaik. Sembilan pengambilan membutuhkan 45 fit, sama seperti grid sembilan titik.

Misalkan hanya satu dari dua pengaturan yang berpengaruh. Grid 3 x 3 tetap hanya mencoba 3 nilai berbeda dari pengaturan itu, masing-masing diulang 3 kali. Sembilan pengambilan acak dapat mencoba hingga 9 nilai berbeda. Gambar memakai skor rekaan untuk menunjukkannya.

[[figure:tuning-search/grid-vs-random|Permukaan skor rekaan yang hanya dipengaruhi pengaturan pertama. Grid mencoba 3 nilainya, sedangkan random search mencoba 9.]]

Di sini skor terbaik grid adalah 0,83 dan skor terbaik random search adalah 0,91. Namun itu baru satu pengambilan. Pada 10.000 permukaan simulasi, dengan puncak di mana saja dari 0,1 sampai 0,9, sembilan titik acak mengalahkan sembilan titik grid sekitar 6 kali dari 10 (rata-rata skor terbaik 0,86 berbanding 0,83). Random search bukan keajaiban: ia hanya mencoba lebih banyak nilai dari pengaturan yang penting.

Pada data penguin, kedalaman hanya punya 8 nilai, sehingga keuntungannya lebih kecil. Dalam 2.000 random search dengan 9 pengambilan, median skor terbaik adalah 231 dari 267 (86,5%), dan satu dari 10 search mencapai 235. Skor grid, 233, lebih tinggi daripada yang terbaik dari 68% search acak itu. Sembilan pengambilan rata-rata mencakup 5,7 dari 8 kedalaman.

::: deeper Rentang yang mencakup beberapa orde besar
Beberapa hyperparameter, seperti learning rate, berguna di mana saja dari 0,001 sampai 1. Sebuah grid dapat memakai 0,001, 0,01, 0,1, dan 1, yang jaraknya merata dalam pangkat 10. Random search dapat melakukan hal yang sama dengan mengambil eksponen secara merata antara -3 dan 0, lalu memakai 10 pangkat nilai itu. Dengan begitu setiap pangkat 10 mendapat sekitar sepertiga pengambilan. Jika learning rate-nya sendiri diambil merata antara 0,001 dan 1, sekitar 90% pengambilan akan jatuh di atas 0,1.
:::

## Skor pemenang terlalu optimistis
*Mengapa skor terbaik dalam sebuah search terlalu bagus?*

Skor setiap konfigurasi adalah kualitas sebenarnya ditambah sedikit keberuntungan. Search mempertahankan skor tertinggi, jadi cenderung mempertahankan konfigurasi yang paling beruntung. Makin banyak konfigurasi yang dicoba, makin banyak keberuntungan yang dapat dipilih.

Kasus ekstrem menunjukkannya. Ambil penebak yang melempar koin untuk setiap contoh, sehingga masing-masing punya accuracy sebenarnya 50%. Nilai semuanya pada 50 contoh yang sama. Satu penebak punya peluang 10,1% untuk benar paling sedikit 30, yaitu 60%. Dengan 20 penebak, peluang bahwa setidaknya satu yang berhasil adalah 1 - (1 - 0,101)^20, sekitar 88%.

[[figure:tuning-search/best-of-many|Skor terbaik yang diharapkan dari sekian banyak penebak pelempar koin pada 50 contoh yang sama. Accuracy sebenarnya setiap penebak adalah 50%.]]

Skor terbaik yang diharapkan adalah 63,1% untuk 20 penebak dan 67,6% untuk 100. Setiap pemenang itu hanyalah lemparan koin. Search yang sebenarnya lebih ringan efeknya, karena konfigurasi nyata berbeda kualitasnya dan banyak yang mirip satu sama lain, tetapi arahnya sama.

> Awas: test set pun tidak kebal. Jika kamu memilih di antara konfigurasi berdasarkan skor test-nya, skor test itu ikut menjadi terlalu optimistis, dan kamu tidak punya data bersih lagi. Lihat test set satu kali saja, setelah pilihan dibuat.

## Skor bersih dari test set
*Bagaimana melaporkan angka yang jujur?*

Kunci dulu test set, lakukan tuning dengan cross-validation pada sisanya, latih ulang konfigurasi pemenang (latih lagi pada seluruh data tuning), lalu nilai test set satu kali. Di sini pemenangnya, kedalaman 7 dan ukuran leaf 3, setelah dilatih ulang pada 267 penguin menjawab benar 58 dari 66 penguin test, yaitu 87,9%. Satu penguin test bernilai 1,5 poin, jadi ini pemeriksaan kasar, bukan pengukuran hingga dua digit.

## Nested cross-validation
*Bagaimana menilai search itu sendiri?*

Cara ini cocok untuk data kecil, atau ketika kamu ingin menilai seluruh **resep**: prosedur lengkap, termasuk search-nya. Loop luar menyisihkan tiap fold secara bergiliran. Pada fold sisanya, seluruh search dijalankan dengan cross-validation dalamnya sendiri. Konfigurasi yang dipilih dinilai pada fold luar yang disisihkan, yang tidak pernah dilihat search.

[[figure:tuning-search/nested|Nested cross-validation dengan grid sembilan konfigurasi. Setiap putaran luar menjalankan search penuh pada empat fold lainnya, lalu menilai pilihannya pada fold yang disisihkan.]]

Putaran-putaran itu memilih pemenang yang berbeda, dan itu tidak masalah: skornya milik resep, bukan milik satu konfigurasi. Skor nested adalah 228 dari 267, yaitu 85,4%, dibandingkan 233 dari 267, yaitu 87,3%, untuk grid yang sama dalam satu tingkat. Biayanya 5 x 9 x 4 = 180 fit dalam dan 5 refit, dibandingkan 45. Dengan seed fold 2, selisihnya berbalik arah, 226 berbanding 225, jadi seberapa besar skor yang terlalu optimistis itu kecil dan berubah-ubah pada 267 penguin. Metodenyalah yang melindungimu.

## Catat run-nya
*Apa yang perlu dicatat agar orang lain mendapatkan pemenang yang sama?*

Cross-validation mengacak baris, sehingga fold-nya bergantung pada sebuah **seed**. Jalankan search 160 konfigurasi yang sama dengan enam seed fold:

| Seed fold | Pemenang (kedalaman, leaf) | Penguin benar | Skor |
| --- | --- | --- | --- |
| 1 | 7, 3 | 235 dari 267 | 88,0% |
| 2 | 5, 13 | 231 dari 267 | 86,5% |
| 3 | 5, 1 | 245 dari 267 | 91,8% |
| 4 | 4, 17 | 231 dari 267 | 86,5% |
| 5 | 5, 1 | 240 dari 267 | 89,9% |
| 6 | 6, 2 | 236 dari 267 | 88,4% |

Datanya dan search-nya sama. Hanya acakannya yang berubah, tetapi pemenangnya berpindah dan skor terbaiknya berkisar dari 86,5% sampai 91,8%, selisih 14 penguin, sekitar 5 poin. Tanpa seed, tidak ada yang dapat mengulang 88,0% milikmu.

Tuliskan apa yang dibutuhkan pembaca untuk menjalankannya ulang:

```
data: penguins.csv, 333 rows with all measurements and sex
test cut: stratified by sex, seed 4 (66 rows kept aside)
cross-validation: 5-fold, stratified, fold seed 1
search: grid over depth 1-8, leaf 1-20 (160 configurations)
metric: accuracy; ties go to the first configuration
result: depth 7, leaf 3, 235 of 267
```

Jika taruhannya besar, ulangi search dengan beberapa seed dan laporkan sebarannya, seperti pada tabel.

## Sebelum lab
*Apa yang diuji oleh pelajaran terakhir course ini?*

Setiap skor dalam pelajaran ini berasal dari sebuah split. Search memilih apa pun yang menguntungkan menurut split itu. Jika split-nya bocor, misalnya dengan menaruh catatan satu orang di kedua sisi, search akan memilih konfigurasi yang paling pandai mengenali orang.

Course ini ditutup dengan Validation lab, tempat kamu membandingkan split acak dengan split berkelompok pada catatan dari beberapa orang. Sebelum membukanya, tebak split mana yang memberi skor lebih tinggi. Lalu tanyakan: apa yang akan dipilih oleh search tuning pada split yang bocor?

::: remember
- Hyperparameter dipilih sebelum training dan parameter dipelajari. Grid search mencoba setiap kombinasi dan biayanya berupa perkalian. Random search mencoba lebih banyak nilai berbeda dari tiap pengaturan untuk budget yang sama.
- Skor terbaik dalam sebuah search terlalu optimistis. Simpan test set dan lihat satu kali, atau pakai nested cross-validation untuk menilai seluruh resep.
- Catat seed, split, search space, metrik, dan hasilnya. Pemenang dapat berubah menurut seed fold.
:::
