---
slug: cross-validation-and-stratification
title: Cross-validation dan stratifikasi
---
::: intro
- Jelaskan mengapa skor dari satu validation split itu noisy, dengan memakai 20 hold-out untuk model yang sama.
- Jalankan 5-fold cross-validation dengan tangan, lalu laporkan rata-rata dan sebaran skor fold.
- Pakai fold yang stratified untuk kelas yang tidak seimbang, ulangi cross-validation, dan jaga agar test set akhir tetap tidak tersentuh.

Sebelum mulai: baca "Train, validation and test", "Tuning k" dan "Class imbalance". Dua pelajaran pertama memperkenalkan validation set dan fold. Pelajaran ini bertanya seberapa jauh skor sebuah fold dapat dipercaya.
:::

## Satu split adalah juri yang noisy
*Mengapa satu validation split saja tidak cukup untuk menilai seberapa bagus sebuah model?*

Skor validasi adalah hasil pengukuran, dan pengukuran pada 50 baris selalu bergeser. Ini situasi yang dipakai sepanjang pelajaran. Ambil 333 penguin yang punya keempat ukuran tubuh dan jenis kelamin yang tercatat. Acak urutannya, lalu sisihkan 83 sebagai **test set**; bagian akhir pelajaran akan kembali ke sini. Sisa 250 penguin disebut **pool**.

Model menebak jenis kelamin penguin dari panjang paruh, kedalaman paruh, panjang sirip, dan massa tubuh lewat vote dari 5 neighbor terdekat, yaitu k-NN dari Level 1. Setiap ukuran di-scale dengan rata-rata dan sebaran dari bagian training saja.

Sisihkan 50 penguin dari pool sebagai hold-out, latih model pada 200 penguin sisanya, lalu hitung jawaban yang benar. Ulangi dengan acakan yang berbeda, sampai 20 kali. Model dan penguinnya tetap sama, tetapi jumlah yang benar bergerak dari 40 sampai 49 dari 50, yaitu 80% sampai 98%.

[[figure:cross-validation-and-stratification/split-noise|Dua puluh hold-out berisi 50 penguin dari pool yang sama, dinilai dengan model yang sama. Hanya acakannya yang berubah.]]

> Gagasan kunci: skor validasi bergantung pada modelnya, dan juga pada baris mana yang kebetulan disisihkan. Dengan 50 baris, satu penguin saja menggeser skor sebesar 2 poin.

## k-fold cross-validation
*Bagaimana setiap penguin dapat giliran menjadi baris validasi?*

Alih-alih satu hold-out, pakai semuanya. Acak pool lalu potong menjadi 5 **fold** berisi masing-masing 50 penguin. Pada ronde 1, fold 1 menjadi validation set dan model dilatih pada fold 2 sampai 5. Pada ronde 2, fold 2 menjadi validation set, dan seterusnya. "Tuning k" menunjukkan cara ini pada 80 titik; di sini lima ronde dijalankan pada pool.

| Ronde | Validasi pada | Latih pada | Benar | Skor |
| --- | --- | --- | --- | --- |
| 1 | fold 1 | fold 2 sampai 5 (200 penguin) | 42 dari 50 | 84% |
| 2 | fold 2 | fold 1, 3, 4, 5 (200 penguin) | 43 dari 50 | 86% |
| 3 | fold 3 | fold 1, 2, 4, 5 (200 penguin) | 48 dari 50 | 96% |
| 4 | fold 4 | fold 1, 2, 3, 5 (200 penguin) | 43 dari 50 | 86% |
| 5 | fold 5 | fold 1 sampai 4 (200 penguin) | 44 dari 50 | 88% |

[[figure:cross-validation-and-stratification/fold-grid|Lima ronde 5-fold cross-validation pada 250 penguin di pool, beserta skor tiap ronde.]]

Setiap penguin dinilai tepat satu kali, oleh model yang belum pernah melihatnya. Kelima model itu hanya ada untuk mengukur. Model yang kamu simpan dilatih satu kali pada seluruh baris training setelahnya.

Jawaban yang benar berjumlah 42 + 43 + 48 + 43 + 44 = 220 dari 250, yaitu 88,0%. Semua fold berisi 50 baris, sehingga rata-rata kelima skor juga 88,0%. Jika ukuran fold tidak sama, keduanya sedikit berbeda, dan yang biasa dilaporkan adalah rata-rata skor fold.

## Rata-rata dan sebaran skor fold
*Apa yang disembunyikan oleh satu angka cross-validation?*

Kelima skornya adalah 84, 86, 96, 86 dan 88. Rata-ratanya 88,0. Selisih tiap skor dari rata-rata berturut-turut 4 di bawah, 2 di bawah, 8 di atas, 2 di bawah, dan 0, sehingga kuadrat selisihnya 16, 4, 64, 4 dan 0. Jumlahnya 88. Bagi dengan 4 (lima skor dikurangi 1) untuk mendapat 22, lalu akarnya adalah **sebaran** atau simpangan baku: 4,7 poin. Tulis laporannya sebagai "88,0, SD 4,7".

Angka 4,7 itu menunjukkan seberapa jauh satu fold berisi 50 penguin bergeser. Ini bukan galat dari rata-ratanya.

Sekarang bandingkan tiga model pada fold yang sama.

| Neighbor | Skor fold | Rata-rata | SD |
| --- | --- | --- | --- |
| 1 | 82, 80, 92, 84, 88 | 85,2 | 4,8 |
| 5 | 84, 86, 96, 86, 88 | 88,0 | 4,7 |
| 15 | 90, 84, 100, 94, 88 | 91,2 | 6,1 |

Kurangkan fold demi fold. Lima neighbor mengalahkan satu neighbor dengan selisih +2, +6, +4, +2 dan 0, tidak pernah lebih buruk. Lima belas mengalahkan lima dengan selisih +6, −2, +4, +8 dan 0: tiga kali menang, satu kali kalah, satu kali seri. Keunggulan yang pertama jelas. Yang kedua baru sebatas petunjuk.

> Awas: jangan memilih pemenang dari selisih yang lebih kecil daripada sebaran fold. Bandingkan model fold demi fold, dan lihat apa kata hasil yang diulang.

::: deeper Seberapa pasti rata-ratanya?
Perkiraan kasar untuk ketidakpastian rata-rata dari lima skor adalah 4,7 / √5, sekitar 2,1 poin. Angka ini kemungkinan sedikit terlalu kecil, karena dua bagian training mana pun berbagi 150 dari 200 penguinnya. Ini mengukur hal yang berbeda dari SD antar-acakan sekitar 1,0 di bagian cross-validation yang diulang di bawah: yang ini adalah noise karena hanya ada 250 penguin ini, yang itu adalah noise karena cara penguin itu diacak.
:::

::: deeper Membagi dengan n atau dengan n - 1
"Center and spread" di Level 1 membagi kuadrat selisih dengan n. Untuk lima skor fold, hasilnya 88 / 5 = 17,6 dan SD 4,2. Pelajaran ini membagi dengan n - 1 karena kelima skor hanyalah contoh kecil dari semua fold yang mungkin kamu ambil, dan inilah pilihan yang lazim untuk skor fold. Keduanya sah selama kamu menyebut mana yang dipakai.
:::

## Fold stratified untuk kelas yang tidak seimbang
*Bagaimana jika satu kelas langka, sehingga sebuah fold bisa tidak memilikinya?*

"Baselines and splits" menunjukkan pemotongan stratified: setiap kelas dibagi sendiri-sendiri supaya tiap bagian mempertahankan komposisi yang sama. Gagasan yang sama berlaku untuk fold. Fold **stratified** membagikan setiap kelas ke seluruh fold, satu kelas demi satu kelas, sehingga setiap fold berisi proporsi yang kurang lebih sama dari tiap kelas.

Tugas menebak jenis kelamin itu seimbang, 125 dan 125, jadi hampir tidak membutuhkan ini. Ambil pertanyaan spesies: 342 penguin, 68 di antaranya Chinstrap, yaitu 19,9%. Pada satu acakan biasa menjadi 5 fold, jumlah Chinstrap-nya 8, 16, 16, 15 dan 13. Acakan stratified menghasilkan 14, 14, 13, 13 dan 14. Dalam 20 acakan biasa, sebuah fold berisi antara 8 dan 19 penguin Chinstrap. Fold stratified selalu berisi 13 atau 14.

[[figure:cross-validation-and-stratification/stratified-folds|Jumlah penguin Chinstrap di setiap dari 5 fold validasi, dari acakan biasa dan dari acakan stratified.]]

Chinstrap hanya ketidakseimbangan yang ringan. Buat lebih tajam: 200 baris dengan 10 positif, dalam 5 fold berisi 40. Fold stratified masing-masing berisi tepat 2 positif. Fold biasa dapat tidak berisi satu pun: peluang sebuah fold kehilangan seluruh 10 positif adalah (160 / 200) × (159 / 199) × … × (151 / 191), sekitar 10% (hasil hitungan, bukan pengukuran). Fold tanpa positif memiliki recall 0 / 0, tidak terdefinisi, dan accuracy-nya hanya mengukur kelas mayoritas.

> Gagasan kunci: buat fold stratified setiap kali ada kelas yang langka, lalu nilai dengan recall atau F1, bukan accuracy saja, seperti di "Class imbalance".

::: deeper Stratifikasi untuk angka
Stratifikasi membutuhkan kelas. Untuk target regresi, triknya yang lazim adalah memotong target menjadi beberapa bin, misalnya kuartil, lalu melakukan stratifikasi pada bin itu.
:::

## Cross-validation yang diulang
*Apakah hasilnya hanya kebetulan dari satu acakan?*

Kelima fold di atas berasal dari satu acakan. Acakan lain menempatkan penguin yang berbeda dalam satu fold dan menghasilkan rata-rata yang berbeda. Untuk lima neighbor, 20 acakan menghasilkan rata-rata dari 88,0% sampai 91,2%, dengan rata-rata keseluruhan 89,76 dan SD sekitar 1,0. Satu hold-out berisi 50 penguin memiliki SD sekitar 4,4 poin, jadi mengulang dan merata-ratakan membuat perkiraan jauh lebih stabil.

**Repeated cross-validation** menjalankan seluruh k-fold lagi dengan acakan baru lalu merata-ratakan semua skornya. Tiga kali ulang untuk 5 fold berarti 15 skor; ketiga rata-ratanya 88,0, 90,8 dan 91,2, sehingga hasilnya 90,0. Cara ini juga menjawab pertanyaan sebelumnya: dalam 20 ulangan, 15 neighbor rata-rata mencapai 91,34 melawan 89,76 untuk lima, dan unggul di 16 ulangan, seri di 2 dan kalah di 2.

[[figure:cross-validation-and-stratification/repeated-cv|Dua puluh ulangan 5-fold cross-validation untuk tiga model, dengan hold-out tunggal sebagai pembanding. Setiap titik adalah satu acakan.]]

Harganya adalah waktu: 20 ulangan dari 5 fold berarti 100 kali fit per model. Mengulang juga ada batasnya. Cara ini menstabilkan noise dari acakan, bukan noise karena data kita hanya berisi 250 penguin ini dan bukan yang lain.

## Jaga test set akhir tetap tidak tersentuh
*Di mana skor cross-validation berhenti jujur?*

Memilih model dengan cross-validation adalah bentuk training, seperti yang dikatakan "Tuning k". Pemenangnya adalah yang tampak paling bagus, jadi skornya sedikit terlalu optimistis. Hanya baris yang tidak ikut dalam pilihan apa pun yang dapat mengujinya. Itulah sebabnya 83 penguin disisihkan sejak awal.

| Langkah | Baris | Yang terjadi |
| --- | --- | --- |
| 1. Potong | 333 | Sisihkan 83 sebagai test set, sebelum hal lain. |
| 2. Pilih | 250 pool | Bandingkan 1, 5 dan 15 neighbor dengan 5-fold yang diulang; simpan 15. |
| 3. Fit ulang | 250 pool | Latih model terpilih satu kali pada seluruh pool. |
| 4. Laporkan | 83 test | Nilai satu kali saja: 74 benar dari 83, yaitu 89,2%. |

Perkiraan dari repeated cross-validation adalah 91,3%, dan skor test lebih rendah 2,1 poin. Dengan 83 baris, skor test sendiri memiliki sebaran sekitar √(0,892 × 0,108 / 83) = 3,4 poin, sehingga keduanya sejalan.

> Awas: jika kamu menilai 5 dan 15 neighbor pada test set lalu menyimpan yang lebih baik, test set itu sudah menjadi validation set. Skornya tidak lagi laporan yang jujur.

Lakukan scaling di dalam setiap ronde, hanya dengan bagian training, seperti di "Pipelines and leakage". Jika tidak, fold validasi bocor ke dalam training.

::: deeper Berapa banyak fold?
5 dan 10 adalah pilihan yang umum. Fold lebih banyak berarti bagian training lebih besar, sehingga model-model itu lebih mirip model akhir, tetapi fit-nya juga lebih banyak. Ujung ekstremnya adalah leave-one-out: n fold dengan satu baris di masing-masing, yaitu n kali fit dan skor yang sangat noisy untuk tiap barisnya.
:::

## Selanjutnya
*Apa yang diasumsikan oleh fold acak, dan di mana kamu mencobanya?*

Setiap fold dalam pelajaran ini dipotong dengan mengacak. Acakan mengasumsikan bahwa tiap baris adalah sampel yang terpisah, seperti tiap penguin. Jika satu orang punya banyak catatan, atau baris tersusun menurut waktu, fold hasil acakan dapat menaruh "kerabat dekat" dari baris uji di dalam training, dan skornya tampak lebih baik daripada seharusnya. Pelajaran berikutnya, "Grouped and temporal splits", memotong fold mengikuti keterkaitan itu.

Memilih pengaturan dengan cross-validation inilah yang diotomatiskan oleh "Tuning with search", sehingga kebiasaan test set di atas menjadi semakin penting di sana. Setelah itu kamu akan membandingkan split acak dan split berkelompok pada dataset dengan beberapa catatan per orang di Validation lab, pelajaran terakhir kursus ini. Bawa tiga kebiasaan: lihat sebarannya dan bukan hanya rata-ratanya, lakukan stratifikasi ketika ada kelas yang langka, dan sentuh test set hanya satu kali.

::: remember
- Satu validation split adalah juri yang noisy: 20 hold-out untuk model yang sama menghasilkan 80% sampai 98%. Cross-validation menilai setiap baris satu kali, dan melaporkan rata-rata serta sebaran skor fold.
- Buat fold stratified ketika ada kelas yang langka, ulangi cross-validation untuk menstabilkan acakan, dan jangan memilih pemenang dari selisih yang lebih kecil daripada sebarannya.
- Pilih dengan cross-validation pada pool, dan nilai test set akhir satu kali saja.
:::
