---
slug: baselines-and-splits
title: Baseline dan pembagian data
---
::: intro
- Gunakan baseline untuk menilai apakah sebuah skor tergolong bagus.
- Jelaskan mengapa model harus dinilai pada baris data yang belum pernah dilihatnya.
- Bagi data menjadi training set, validation set, dan test set, lalu sebutkan fungsi masing-masing.

Sebelum mulai: baca "Supervised, unsupervised, dan tiga pertanyaan" dan "Loss function".
:::

## Apakah 90% itu skor yang bagus?
*Bagaimana kamu tahu sebuah hasil benar-benar bagus, bukan sekadar mudah?*

Skor saja belum banyak bercerita. Misalkan sebuah classifier menjawab benar 90% kasus. Apakah itu mengesankan? Jawabannya bergantung pada seberapa sulit pertanyaannya. Jika dari setiap 100 kasus ada 95 yang termasuk satu kelas, aturan yang tidak pernah melihat data dan selalu menjawab kelas itu sudah mendapat skor 95%. Model dengan skor 90% justru lebih buruk daripada aturan malas tersebut.

Ambil tabel penguin: 342 penguin dengan data pengukuran, dari tiga spesies. Untuk pertanyaan "spesies apa?", jawaban paling malas adalah selalu menjawab "Adelie", karena Adelie adalah spesies yang paling banyak (151 dari 342). Aturan itu benar untuk 151 / 342 = 44,2% penguin.

Karena itu, untuk pertanyaan ini, 44,2% adalah batas yang harus dilampaui. Model dengan skor 40% lebih buruk daripada menebak "Adelie" secara buta. Model dengan skor 90% adalah pencapaian yang nyata.

**Baseline** adalah metode sederhana yang sengaja dipilih, dan skornya menjadi batas tersebut. Hitunglah selalu lebih dulu, sebelum kamu membangun sesuatu yang canggih.

> Gagasan kunci: sebuah skor baru bermakna jika dibandingkan dengan skor alternatif yang sederhana.

## Dua baseline yang perlu kamu kenal
*Apa jawaban paling malas yang masih masuk akal untuk tiap jenis pertanyaan?*

Untuk **classification**, baseline-nya adalah **kelas mayoritas**: selalu menjawab kelas yang paling banyak muncul di antara baris training. Accuracy-nya sama dengan porsi kelas itu. Angka 44,2% di atas adalah contohnya.

Untuk **regression**, baseline-nya adalah sebuah **konstanta**: setiap baris diberi angka yang sama, biasanya rata-rata target pada data training. (Median adalah alternatif yang wajar jika outlier, yaitu beberapa nilai ekstrem, menarik rata-rata.) Baseline ini mengabaikan semua feature, sehingga tidak perlu proses belajar sama sekali.

> Contoh hitungan: enam penguin dari pelajaran sebelumnya memiliki massa 3.750, 3.250, 3.500, 3.900, 4.500, dan 5.700 g. Rata-ratanya 24.600 / 6 = 4.100 g. Selisihnya 350, 850, 600, 200, 400, dan 1.600 g, sehingga mean absolute error-nya (350 + 850 + 600 + 200 + 400 + 1.600) / 6 = 4.000 / 6 = 666,7 g. Model yang sebenarnya harus punya selisih tipikal yang jauh di bawah 667 g agar layak dipakai.

[[figure:baselines-and-splits/baselines|Dua baseline pada data penguin: selalu menyebut spesies yang paling umum, dan selalu memprediksi massa rata-rata.]]

Sebuah baseline hanya butuh satu baris kode, dan melindungimu dari menipu diri sendiri.

## Jebakan menilai model pada data training
*Mengapa model tidak langsung diuji pada baris yang sudah dipelajarinya?*

Model baru berguna pada baris yang belum pernah dilihatnya: email besok, pasien bulan depan. Karena itu pertanyaannya bukan "seberapa sesuai model dengan data yang kita berikan?", melainkan "seberapa baik model pada data baru?". Kemampuan berkinerja baik pada data baru disebut **generalizing**.

Menilai pada baris training menyembunyikan hal ini. Bayangkan model yang hanya menyimpan seluruh tabel training dan menjawab dengan mencarinya kembali. Jika kamu menanyakan baris yang tersimpan, model membalas dengan jawaban yang tersimpan: error 0. Model itu tidak mempelajari apa pun tentang penguin, tetapi pada data training-nya sendiri ia tampak sempurna.

Siswa yang menghafal kunci jawaban ujian tahun lalu akan mendapat nilai 100% pada ujian itu, dan bisa gagal pada ujian berikutnya. Training error adalah ujian tahun lalu.

Solusinya adalah **hold out** sebagian baris: sisihkan sebelum training, jangan pernah gunakan untuk melatih model, lalu nilai model pada baris tersebut setelahnya. Error pada data yang disisihkan memperkirakan perilaku model pada baris yang benar-benar baru.

> Gagasan kunci: hanya data yang tidak dipelajari model yang dapat memberi tahu seberapa baik model itu pada data baru.

## Training, validation, dan test
*Apa tugas masing-masing bagian data?*

Satu set yang disisihkan belum cukup, karena kamu akan memakainya untuk mengambil keputusan, dan set yang dipakai untuk memandu keputusan tidak lagi sepenuhnya baru. Karena itu data berlabel dibagi menjadi tiga set:

- **Training set.** Di sinilah model menyesuaikan (fit) **parameter**-nya agar cocok dengan baris-baris ini, misalnya kemiringan dan intersep sebuah garis.
- **Validation set.** Kamu memakainya untuk membandingkan model dan memilih **setelan**, misalnya berapa lekukan yang boleh dimiliki sebuah kurva. Setelan (sering disebut hyperparameter) adalah sesuatu yang kamu pilih sebelum model dilatih, bukan sesuatu yang dipelajari model. Baseline-mu juga dinilai di sini, sehingga baseline dan model menghadapi baris yang sama.
- **Test set.** Kamu memakainya sekali saja, di akhir, untuk melaporkan seberapa baik pilihan akhirmu.

[[figure:baselines-and-splits/three-sets|342 penguin dibagi sekitar 60% / 20% / 20%, beserta tugas tiap bagian.]]

Test set adalah perkiraan jujur terakhirmu. Setiap kali kamu melihatnya lalu mengubah sesuatu, set itu diam-diam berhenti menjadi data yang belum terlihat. Itulah sebabnya test set hanya disentuh sekali.

> Awas: pembagian 60 / 20 / 20 adalah titik awal yang umum, bukan aturan baku. Jika datamu banyak, validation set dan test set yang lebih kecil sudah cukup.

## Membagi baris dengan adil
*Bagaimana sebaiknya baris dibagi?*

**Acak dulu.** Tabel sering kali sudah terurut. Enam penguin yang terdaftar tadi terurut menurut spesies. Jika dua baris terakhir kamu sisihkan sebagai data hold-out, kamu menyisihkan dua penguin Gentoo, sementara model berlatih hanya dengan Adelie dan Chinstrap.

> Contoh hitungan: latih pada penguin 1 sampai 4 (3.750, 3.250, 3.500, 3.900 g): rata-ratanya 3.600 g. Sisihkan penguin 5 dan 6 (4.500 dan 5.700 g). Baseline meleset 900 dan 2.100 g, sehingga error-nya (900 + 2.100) / 2 = 1.500 g. Angka itu lebih dari dua kali 666,7 g pada enam penguin penuh, karena pembagiannya timpang, bukan karena baseline-nya memburuk.

**Gunakan stratify jika kelasnya tidak seimbang.** Pembagian yang sudah diacak pun masih bisa menyimpang karena kebetulan. Bagi 342 penguin secara acak (seed 4), maka training set berisi 49 penguin Chinstrap dari 205 (23,9%), sedangkan test set berisi 5 dari 69 (7,2%). Pembagian yang **stratified** memotong tiap spesies secara terpisah, sehingga setiap set mempertahankan komposisi yang kurang lebih sama.

[[figure:baselines-and-splits/stratify|342 penguin yang sama dibagi dua kali dengan seed 4. Pengacakan biasa membuat test set kekurangan penguin Chinstrap. Pembagian stratified menjaga tiap porsi di dekat 20%.]]

Tetapkan **seed** acak, yaitu angka yang memulai pengacakan, agar pembagian yang sama dapat diulang.

## Perbandingan lengkap
*Seperti apa ketiga set itu pada penguin yang sebenarnya?*

Bagi 342 penguin dengan split stratified (seed 4): 206 penguin training, 69 validation, dan 67 test. Kita membandingkan metode pada validation dan tidak menyentuh test set.

Untuk pertanyaan spesies, kelas mayoritas di training adalah Adelie (91 dari 206, 44,2%). Selalu menjawab Adelie benar untuk 30 dari 69 penguin validation: 43,5%.

Untuk massa tubuh, tiga metode dilatih hanya pada baris training. Memorizer menjawab tiap penguin dengan penguin training yang panjang paruh, kedalaman paruh, dan panjang flipper-nya paling mirip. Error berupa mean absolute error dalam gram:

| Metode | Training error | Validation error |
|---|---|---|
| Baseline: rata-rata training, 4.215 g | 658 | 693 |
| Garis dari panjang flipper | 309 | 344 |
| Memorizer: menyalin penguin training dengan ukuran paruh dan flipper yang paling mirip | 0 | 391 |

**Cara membacanya.** Garis itu memangkas error baseline menjadi separuhnya (344 dibanding 693), sehingga layak dipertahankan. Memorizer sempurna pada training, tetapi meleset 391 g pada baris baru, lebih buruk daripada garis. Garis itu sendiri sedikit lebih baik pada training daripada pada validation (309 dibanding 344), tanda awal bahwa training error bersifat terlalu optimistis.

## Seberapa jauh satu pembagian bisa dipercaya
*Cukupkah satu kali pembagian untuk memutuskan?*

Belum tentu. Semua angka di atas berasal dari satu kali pembagian, dan seed yang berbeda akan memberi baris dan angka yang berbeda.

> Awas: 69 penguin validation dan satu kali pembagian adalah sampel yang kecil. Pada seed 1 sampai 30, validation error garis berkisar dari 270 sampai 364 g. Garis itu selalu mengalahkan baseline, tetapi pada dua pembagian hasilnya tidak lebih baik daripada memorizer.

::: deeper Ketika data terlalu sedikit untuk merelakan 40%
Jika barisnya sangat sedikit, validation set berisi belasan baris adalah penilai yang berisik. Salah satu jalan keluarnya adalah **cross-validation**: bagi data training menjadi k bagian, yang disebut fold, lalu biarkan tiap fold bergiliran menjadi validation set sementara model berlatih pada sisanya. Rata-ratakan skor validation-nya. Test set tetap berada di luar putaran ini dan tetap dipakai sekali saja.
:::

## Menjaga test set tetap bersih
*Bagaimana informasi test bisa menyusup ke training tanpa disengaja?*

**Leakage** berarti informasi dari baris validation atau test memengaruhi training atau proses tuning. Skor lalu tampak lebih bagus daripada kenyataan, dan tidak ada program yang gagal untuk memperingatkanmu.

- **Fitting pada semua data.** Apa pun yang dipelajari dari data termasuk di sini: scaling angka (mengubah skala sebuah kolom ke rentang yang sama), rata-rata pada baseline rata-rata, kelas mayoritas. Hitung hanya dari training set. Jika kamu mengambil rata-rata seluruh 342 massa (4.202 g) sebelum membagi, baris yang disisihkan ikut menentukannya.
- **Tuning pada test set.** Memilih setelan berdasarkan skor test mengubah test set menjadi validation set.
- **Duplikat dan waktu.** Baris yang muncul di dua set memberi rasa aman yang palsu. Untuk baris yang berurutan menurut waktu, latih pada baris yang lebih awal dan uji pada baris yang lebih akhir, karena pengacakan membuat model mengintip masa depan.

> Awas: jika sebuah hasil tampak terlalu bagus, cari dulu kebocoran sebelum kamu merayakannya.

## Sebelum lab
*Apa yang bisa kamu coba di lab kursus ini?*

Lab di kursus ini, "Train, validation, dan test", memungkinkan kamu mencoba gagasan pembagian data sendiri. Kamu mengubah seberapa fleksibel sebuah model dan seberapa banyak data yang dipakainya untuk berlatih, lalu membaca training error dan validation error secara berdampingan. Lab itu tidak membahas baseline, stratify, atau leakage, jadi bawalah kebiasaan-kebiasaan tersebut. Pelajaran berikutnya, "Underfitting dan overfitting", menjelaskan apa yang dikatakan kedua error itu.

::: remember
- Sebuah skor baru bermakna jika dibandingkan dengan baseline: kelas mayoritas untuk classification, rata-rata untuk regression.
- Train menyesuaikan parameter, validation membandingkan model dan memilih setelan, test melaporkan sekali saja. Acak dulu, dan gunakan stratify jika kelasnya tidak seimbang.
- Fit setiap angka yang dipelajari dari data hanya pada training set, atau test set akan bocor.
:::
