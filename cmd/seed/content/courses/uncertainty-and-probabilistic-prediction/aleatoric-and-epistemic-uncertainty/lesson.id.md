---
slug: aleatoric-and-epistemic-uncertainty
title: Ketidakpastian aleatoric dan epistemic
---
::: intro
- Bedakan ketidakpastian aleatoric (noise dalam data) dari ketidakpastian epistemic (kurangnya pengetahuan), dan sebutkan mana yang dapat mengecil dengan data lebih banyak.
- Baca ketidaksepakatan sebuah ensemble sebagai tanda ketidakpastian epistemic, dan hitung pinball loss dengan tangan.
- Jelaskan apa beda prediction interval dengan confidence interval, dan mengapa noise yang berubah menurut input membutuhkan pita yang ikut berubah.

Sebelum mulai: baca "Sampling variability and the bootstrap" di Probability and statistical uncertainty, "Bagging and random forests" di Tree ensembles, dan "Loss functions" di Linear regression.
:::

## Dua cara untuk tidak tahu
*Mengapa "saya tidak yakin" dapat berarti dua hal yang berbeda?*

Sampai sekarang sebuah model hanya memberi satu angka. Sebuah layanan pengantaran ingin menjanjikan waktu tiba kepada pelanggan. Ini layanan rekaan, supaya kita tahu kebenarannya: pengantaran sejauh x km rata-rata memakan 10 + 3x menit, tetapi tiap pengantaran menyimpang dari rata-rata itu dengan simpangan baku 4 menit. Kamu me-fit sebuah garis pada pengantaran lalu, dan garis itu memprediksi 28 menit untuk 6 km. Di balik angka itu ada dua keraguan yang berbeda.

Keraguan pertama: bahkan kalau kamu tahu aturannya dengan tepat, dua pengantaran sejauh 6 km tidak akan memakan waktu yang sama. Ada lampu merah, lift yang lambat, atau salah belok. Inilah **ketidakpastian aleatoric** (dari kata Latin untuk dadu): noise yang ada dalam data itu sendiri. Tidak ada model maupun data tambahan yang dapat menghilangkannya.

Keraguan kedua: garis kamu di-fit pada sejumlah pengantaran lalu yang terbatas, sehingga aturan yang kamu pelajari sendiri sedikit meleset. Inilah **ketidakpastian epistemic** (dari kata Yunani untuk pengetahuan): kurangnya pengetahuan. Ia mengecil seiring bertambahnya data.

> Gagasan kunci: tanyakan pada setiap keraguan, "apakah data lebih banyak dari jenis yang sama akan menghilangkannya?" Kalau ya, itu epistemic. Kalau tidak, itu aleatoric.

## Data lebih banyak hanya mengecilkan satu
*Keraguan mana yang hilang ketika kamu mengumpulkan lebih banyak pengantaran?*

Fit sebuah garis lurus pada n pengantaran lalu yang tersebar merata antara 1 dan 12 km, dengan noise 4 menit dari bagian sebelumnya. Prediksikan di 6 km. Kumpulan n pengantaran yang lain akan menghasilkan garis yang sedikit berbeda, sehingga prediksinya **bergoyang**: itulah standard error-nya, besaran dari "Sampling variability and the bootstrap". Untuk pengaturan ini nilainya sekitar 4,05 / sqrt(n) menit, rumus lazim untuk fit garis lurus ketika noise sama besar di mana-mana.

> Contoh hitungan: untuk n = 80 goyangannya 4,05 / sqrt(80) = 4,05 / 8,94 = 0,45 menit. Kalikan n empat kali menjadi 320 dan goyangannya menjadi setengah, 4,05 / 17,89 = 0,23.

| Pengantaran latih (n) | Goyangan epistemic di 6 km | Sebaran aleatoric satu pengantaran |
| --- | --- | --- |
| 5 | 1,81 | 4,0 |
| 20 | 0,91 | 4,0 |
| 80 | 0,45 | 4,0 |
| 320 | 0,23 | 4,0 |

Kolom tengah terus turun, dengan aturan akar kuadrat yang sama seperti sebelumnya: data empat kali lipat membuatnya setengah. Kolom terakhir tidak pernah bergerak, karena noise itu milik pengantarannya, bukan milik modelnya.

[[figure:aleatoric-and-epistemic-uncertainty/shrink-vs-floor|Goyangan garis hasil fit turun ketika n bertambah, sedangkan sebaran satu pengantaran tetap 4,0 menit.]]

> Awas: batas antara keduanya bergantung pada apa yang boleh dilihat model. Kalau kamu menambahkan tingkat kemacetan sebagai feature, sebagian dari yang tadinya noise menjadi dapat dijelaskan. Aleatoric berarti "noise, dengan input yang ada ini".

## Ensemble menunjukkan apa yang belum dijawab data
*Bagaimana sebuah model dapat menunjukkan bahwa ia ragu karena kekurangan data?*

Latih beberapa model, masing-masing pada bootstrap sample yang berbeda dari training set yang sama, seperti di "Bagging and random forests". Di tempat data latih melimpah, setiap model melihat gambaran yang hampir sama, sehingga model-model itu sepakat. Di tempat data tipis atau tidak ada, tiap model mengisi kekosongan dengan caranya sendiri, dan model-model itu berselisih. **Ketidaksepakatan** itu adalah ukuran ketidakpastian epistemic.

Ambil 14 pengantaran lalu, semuanya antara 1 dan 8 km, dan fit lima garis lurus, masing-masing pada bootstrap sample-nya sendiri. Gambarnya menampilkan kelimanya. Tanyakan kepada setiap garis tentang dua perjalanan.

> Contoh hitungan: di 4 km kelima prediksinya 21,2, 22,2, 22,6, 21,6 dan 21,6 menit. Rata-ratanya 109,2 / 5 = 21,84. Kuadrat selisih terhadap rata-rata berjumlah 1,23, sehingga variansnya 1,23 / 5 = 0,25 dan simpangan bakunya 0,5. Di 12 km, melewati ujung data, prediksinya 37,8, 40,7, 52,9, 47,8 dan 39,7. Rata-ratanya 43,78, kuadrat selisihnya berjumlah 161,2, variansnya 32,2 dan simpangan bakunya 5,7.

Model-model itu berselisih lebih dari sepuluh kali lipat di 12 km dibanding di 4 km, dan itulah jawaban yang jujur: data hanya sedikit bercerita tentang perjalanan jauh.

[[figure:aleatoric-and-epistemic-uncertainty/ensemble-disagreement|Lima garis yang di-fit pada bootstrap sample dari 14 pengantaran. Garis-garis itu sepakat di dalam data dan menyebar di atas 8 km.]]

> Awas: ketidaksepakatan hanya melihat bagian epistemic. Di 6 km kelima model bisa sepakat pada 28 menit, padahal pengantaran tunggal tetap tersebar sekitar 4 menit. Ensemble juga tidak dapat memperingatkanmu ketika semua anggotanya memiliki titik buta yang sama.

::: deeper Menjumlahkan kedua jenis
Kalau setiap model juga berkata "satu pengantaran tersebar dengan simpangan baku 4 menit", varians total (simpangan baku dikuadratkan) adalah rata-rata varians noise ditambah varians prediksi. Di 4 km itu 16 + 0,25 = 16,25, dengan simpangan baku 4,0. Di 12 km itu 16 + 32,2 = 48,2, dengan simpangan baku 6,9. Jauh dari data, bagian epistemic lebih besar daripada bagian aleatoric.
:::

## Memprediksi sebuah distribusi
*Bagaimana kalau model memberi rentang, bukan satu angka?*

Satu angka prediksi, yaitu rata-rata, menyembunyikan sebaran aleatoric. **Quantile** adalah titik potong: quantile 0,9 adalah nilai yang di bawahnya terdapat 90% hasil, dan disebut juga persentil ke-90. Huruf Yunani tau (ditulis τ dalam pelajaran ini) menamai porsinya: τ = 0,9.

Untuk pengantaran 6 km dari layanan rekaan tadi, quantile 0,9 kira-kira 33 menit: sembilan dari sepuluh pengantaran lebih cepat dari itu. Quantile 0,1 kira-kira 23. Keduanya membentuk **interval 80%** dari 23 sampai 33 menit, dengan 10% pengantaran di bawahnya dan 10% di atasnya.

**Quantile regression** me-fit model yang keluarannya adalah quantile pilihan, satu model untuk setiap τ yang kamu inginkan. "Loss functions" menunjukkan bahwa meminimalkan squared error menghasilkan rata-rata dan meminimalkan absolute error menghasilkan median. Quantile regression menukarnya dengan loss yang dimiringkan, disebut pinball loss dan didefinisikan berikutnya, yang jawaban terbaiknya adalah quantile apa pun yang kamu minta.

> Gagasan kunci: model yang memprediksi quantile 0,1 dan 0,9 memprediksi sebuah rentang, bukan satu titik, dan rentang itu adalah pernyataan tentang noise data.

## Pinball loss dengan tangan
*Bagaimana menilai prediksi yang seharusnya berupa quantile?*

Misalkan y nilai sebenarnya, q quantile yang diprediksi, dan τ porsi yang dituju. **Pinball loss** adalah τ × (y - q) ketika prediksi terlalu rendah (y sama dengan atau di atas q), dan (1 - τ) × (q - y) ketika prediksi terlalu tinggi. Untuk τ = 0,9, selisih satu menit terlalu rendah berharga 0,9 dan satu menit terlalu tinggi hanya 0,1. Terlalu rendah sembilan kali lebih buruk, karena quantile 0,9 yang baik harus berada di atas sebagian besar hasil.

> Contoh hitungan: lima pengantaran pada satu rute memakan 22, 25, 27, 31 dan 45 menit. Nilai tiga prediksi quantile 0,9.

| Prediksi q | Loss pada 22 | pada 25 | pada 27 | pada 31 | pada 45 | Rata-rata |
| --- | --- | --- | --- | --- | --- | --- |
| 27 | 0,5 | 0,2 | 0 | 3,6 | 16,2 | 4,1 |
| 31 | 0,9 | 0,6 | 0,4 | 0 | 12,6 | 2,9 |
| 45 | 2,3 | 2,0 | 1,8 | 1,4 | 0 | 1,5 |

Untuk q = 31, pengantaran 45 terlalu rendah 14 menit: 0,9 × 14 = 12,6. Pengantaran 22 terlalu tinggi 9: 0,1 × 9 = 0,9. Prediksi 45 punya rata-rata terendah, 1,5, sedangkan 44 atau 46 sama-sama 1,6. Dengan hanya lima pengantaran, quantile 0,9 jatuh pada yang terbesar.

[[figure:aleatoric-and-epistemic-uncertainty/pinball-loss|Rata-rata pinball loss untuk τ = 0,9 ketika prediksi digeser. Kurvanya terendah di 45, persentil ke-90 dari kelima waktu.]]

::: deeper Mengapa titik terendahnya adalah quantile
Naikkan q satu menit. Setiap pengantaran di bawah q menjadi 0,1 lebih mahal, dan setiap pengantaran di atas q menjadi 0,9 lebih murah. Kalau sebagian F dari pengantaran berada di bawah q, rata-rata loss berubah sebesar 0,1 × F - 0,9 × (1 - F) = F - 0,9. Ia turun selama F di bawah 0,9 dan naik begitu F melewatinya. Jadi titik terendahnya ada di tempat 90% hasil berada di bawahnya. Antara 31 dan 45, bagian di bawahnya 4 dari 5, sehingga loss turun 0,1 per menit: 2,9 - 14 × 0,1 = 1,5.
:::

## Prediction interval dan confidence interval
*Interval mana yang menjawab pertanyaan mana?*

**Confidence interval** menyatakan di mana rata-rata sebenarnya berada. Kamu sudah bertemu dengannya di "Sampling variability and the bootstrap": ambil ulang sampel pengantaran latih, fit ulang, lalu baca persentil dari nilai hasil fit di 6 km. Ia mengukur goyangan epistemic, sehingga mengecil ketika n bertambah.

**Prediction interval** menyatakan di mana sebuah pengantaran tunggal yang baru akan mendarat. Ia harus memuat sebaran aleatoric juga. Dengan noise normal, aturan kasarnya adalah setengah lebar z × sqrt(4² + goyangan²), dengan z = 1,28 untuk interval 80%.

> Contoh hitungan: garis hasil fit menyatakan 28,0 menit di 6 km. Dengan n = 80 goyangannya 0,45, sehingga confidence interval 80% adalah 28,0 ± 1,28 × 0,45 = 28,0 ± 0,6. Prediction interval-nya 28,0 ± 1,28 × sqrt(16 + 0,2), yaitu 28,0 ± 5,2.

| Pengantaran latih (n) | Confidence interval 80%, rata-rata di 6 km | Prediction interval 80%, satu pengantaran |
| --- | --- | --- |
| 80 | 27,4 sampai 28,6 | 22,8 sampai 33,2 |
| 320 | 27,7 sampai 28,3 | 22,9 sampai 33,1 |

Data empat kali lipat memotong confidence interval menjadi setengah dan nyaris tidak menggeser prediction interval. Prediction interval tidak dapat menyusut di bawah noise.

> Awas: confidence interval bukan rentang waktu pengantaran. Di 6 km sebagian besar pengantaran jatuh di luar 27,4 sampai 28,6. Menjanjikan rentang itu kepada pelanggan akan salah hampir setiap kali.

## Noise yang berubah menurut input
*Apa yang berubah ketika sebarannya lebih besar untuk sebagian input daripada yang lain?*

Sejauh ini noise-nya sama di mana-mana, yang disebut **homoscedastic**. Noise sungguhan sering tidak begitu. Ketika sebarannya berubah menurut input, ia **heteroscedastic**. Misalkan simpangan baku sebuah pengantaran adalah 1 + 0,5x menit: 2,0 di 2 km, 4,5 di 7 km dan 7,0 di 12 km. Perjalanan pendek dapat diprediksi, perjalanan jauh tidak. Rata-ratanya tetap 10 + 3x.

Model yang mengira satu sebaran untuk semua perjalanan menggabungkannya menjadi sekitar 4,5 menit, sehingga pita 80%-nya punya setengah lebar 1,28 × 4,54 = 5,8 menit di mana-mana.

| Jarak | Simpangan baku noise | Pita yang memuat 80% | Porsi di dalam pita 5,8 |
| --- | --- | --- | --- |
| 2 km | 2,0 | ± 2,6 | 99,6% |
| 7 km | 4,5 | ± 5,8 | 80% |
| 12 km | 7,0 | ± 9,0 | 59% |

Dirata-ratakan untuk semua jarak, pita konstan itu mencakup sekitar 82%, dekat dengan 80% yang dijanjikan. Rata-rata itu menyembunyikan pita yang terlalu lebar untuk perjalanan pendek dan terlalu sempit untuk perjalanan jauh, padahal perjalanan jauh adalah tempat pelanggan menunggu paling lama.

[[figure:aleatoric-and-epistemic-uncertainty/fan-of-noise|Pengantaran dengan noise yang bertambah menurut jarak. Pita putus-putus punya satu lebar; pita quantile melebar seiring jarak.]]

Quantile regression terhindar dari masalah ini karena setiap quantile di-fit sebagai fungsi x tersendiri, sehingga garis 0,1 dan 0,9 melebar di tempat data lebih berisik.

## Apa selanjutnya
*Dapatkah kamu memercayai interval yang dilaporkan sebuah model?*

Pita quantile itu sendiri adalah sebuah estimasi, dan pelajaran ini baru saja menunjukkan bagaimana sebuah estimasi dapat tampak benar secara rata-rata namun salah di tempat yang penting. Karena itu, interval adalah klaim yang perlu diperiksa: seberapa sering hasil sungguhan jatuh di dalamnya? Porsi itu disebut **coverage**, dan seharusnya sama dengan tingkat yang kamu janjikan.

Pelajaran berikutnya, "Conformal prediction", menyimpan satu set pengantaran held-out untuk mengkalibrasi interval agar coverage-nya terjaga. Setelahnya datang interval lab, yang menutup course ini: di sana kamu membangun prediction interval dan mengukur coverage empiriknya ketika distribusi data berubah.

::: remember
- Ketidakpastian aleatoric adalah noise dalam data dan tetap ada sebanyak apa pun data yang kamu kumpulkan. Ketidakpastian epistemic adalah kurangnya pengetahuan dan mengecil dengan data lebih banyak, dan ensemble menampakkannya sebagai ketidaksepakatan.
- Quantile regression memprediksi sebuah quantile dengan meminimalkan pinball loss. Terlalu rendah berharga τ per menit dan terlalu tinggi 1 - τ, sehingga τ = 0,9 dan τ = 0,1 bersama-sama membentuk interval 80%.
- Confidence interval mencakup rata-rata dan mengecil dengan data. Prediction interval mencakup satu kasus baru dan tetap di atas noise, dan ketika noise-nya heteroscedastic lebarnya harus berubah menurut input.
:::
