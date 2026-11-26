---
slug: defensible-evaluation
title: Evaluasi yang dapat dipertahankan
---
::: intro
- Tuliskan split sebagai satu kalimat tentang cara model akan dipakai, lalu potong data (per grup, menurut waktu, atau acak) agar baris uji baru bagi model dengan cara yang sama.
- Pilih metrik dari biaya setiap kesalahan, lalu tentukan threshold dari biaya itu memakai prediksi out-of-fold, bukan test set.
- Laporkan satu skor test beserta interval bootstrap yang mengambil sampel ulang pasien secara utuh, lalu jawab checklist lima pertanyaan untuk evaluasi apa pun.

Sebelum mulai: baca "Grouped and temporal splits", "Cross-validation and stratification", "Tuning with search", "Sampling variability and the bootstrap", dan "Measuring a classifier". Pelajaran ini menyatukan kelimanya dalam satu proyek.
:::

## Skor adalah sebuah klaim
*Apa yang harus dapat kamu tunjukkan untuk satu angka?*

Sebuah model melaporkan angka, misalnya biaya 24 per pasien. Siapa pun yang membayarnya akan bertanya bagaimana kamu tahu model itu akan bekerja seperti itu pada pasien sungguhan. **Evaluasi yang dapat dipertahankan** adalah evaluasi yang setiap langkahnya punya alasan yang dapat kamu perlihatkan, sehingga angkanya bisa dibela.

Pelajaran ini mengikuti satu proyek rekaan. Sebuah rumah sakit ingin menandai pasien yang mungkin dirawat kembali dalam 30 hari, agar seorang perawat dapat menelepon mereka. Datanya 2.000 discharge dari 500 pasien, masing-masing empat. Model akan menilai pasien yang belum pernah ia lihat. Satu readmission yang terlewat berbiaya 500, dan satu telepon ke pasien yang sebenarnya tidak akan dirawat kembali berbiaya 100. Semua angka di bawah ini hasil simulasi dengan seed tetap, bukan dari pasien sungguhan.

Lima pertanyaan menyatukan seluruh argumen.

[[figure:defensible-evaluation/five-questions|Lima pertanyaan evaluasi yang dapat dipertahankan, sesuai urutan kamu menemuinya, masing-masing dengan hal yang kamu tunjukkan kepada pembaca.]]

> Gagasan kunci: kelima jawaban itu membentuk satu rantai. Satu mata rantai yang lemah, seperti split yang bocor atau threshold yang dipilih dari test set, membuat semua angka sesudahnya tidak berharga.

## Split menyatakan pemakaian
*Bagaimana kamu tahu baris uji baru dengan cara yang tepat?*

Mulailah dengan satu kalimat: ketika model dipakai, apa yang akan baru? Di sini yang baru adalah pasien. Maka potongannya per pasien, dan semua discharge seorang pasien masuk ke sisi yang sama. Tuning mendapat 400 pasien (1.600 discharge), dan test set mendapat 100 pasien (400 discharge).

Potongan acak memperlihatkan apa yang salah. Dengan 20% baris di test set, sebuah discharge uji punya tiga discharge lain dari pasien yang sama. Masing-masing berada di data latih dengan probabilitas 0,8, sehingga peluang paling sedikit satu di antaranya ada di sana adalah 1 - 0,2^3 = 0,992. Sekitar 99,2% discharge uji punya "kerabat dekat" di data latih.

[[figure:defensible-evaluation/same-patient-rows|Berapa banyak dari tiga saudara sebuah discharge uji yang jatuh ke data latih. Potongan acak membuat hampir setiap baris uji punya kerabat di sana. Potongan berkelompok tidak menyisakan satu pun.]]

Untuk pemakaian lain, kalimatnya berubah dan potongannya ikut berubah.

| Model akan menilai | Potongan |
| --- | --- |
| Pasien baru dari rumah sakit yang sama | Kelompokkan per pasien |
| Rumah sakit yang belum pernah dilihat | Kelompokkan per rumah sakit |
| Baris bulan depan | Menurut waktu, dengan rolling origin (latih pada blok sebelumnya, uji pada blok berikutnya) |
| Pasien baru tahun depan | Keduanya: kelompokkan per pasien, tanggal yang lebih baru di test |
| Baris yang saling independen, seperti penguin | Acak |

## Metrik adalah biaya
*Mengapa accuracy adalah angka yang keliru di sini?*

Untuk memilih threshold, kamu perlu prediksi out-of-fold, yaitu prediksi tiap baris oleh model yang tidak berlatih padanya. Grouped 5-fold cross-validation pada pasien tuning menghasilkannya, 80 pasien (320 discharge) per fold. Dari 1.600 discharge, 144 adalah readmission (9,0%).

Selalu menjawab "tidak" menghasilkan 1.456 jawaban benar, accuracy 91,0%. Model yang menandai setiap discharge dengan skor 0,2 atau lebih tinggi mendapat (102 + 1.284) / 1.600 = 86,6%. Menurut accuracy, aturan yang tidak berguna itu menang.

> Contoh hitungan: biaya sebuah aturan adalah 500 × (readmission yang terlewat) + 100 × (alarm palsu). Model pada 0,2 melewatkan 42 dan memberi 172 alarm palsu: 21.000 + 17.200 = 38.200, yaitu 23,9 per discharge. Tidak pernah menelepon siapa pun melewatkan 144: 72.000, atau 45,0. Menelepon semua orang memberi 1.456 alarm palsu: 145.600, atau 91,0.

Model ini memangkas biaya aturan tanpa model yang lebih baik hingga hampir separuh. Letakkan kedua baseline di samping setiap biaya yang kamu laporkan, seperti di "Framing and baselines".

> Awas: pilih metrik sebelum kamu melihat hasil. Metrik yang dipilih sesudahnya hanyalah satu hal lagi yang disetel pada data.

## Tuning tanpa membuka test set
*Di mana pencarian berhenti dan test dimulai?*

Beri setiap kumpulan baris satu tugas. Pasien tuning dipakai untuk melatih dan memilih. Pasien test hanya punya satu tugas: menilai resep akhir satu kali. Lakukan preprocessing dan pemilihan feature di dalam setiap fold, seperti di "Pipelines and leakage".

Pencarian atas 60 pengaturan dengan 5 fold membutuhkan 60 × 5 = 300 fit, lalu kamu melatih ulang pemenangnya pada seluruh data tuning. Skor cross-validation sang pemenang terlalu bagus, seperti yang diperlihatkan "Tuning with search", dan membandingkan kandidat pada test set menghasilkan hal yang sama. Ambil sepuluh kandidat yang sama baiknya, masing-masing dinilai dengan standard error (derau khas pada satu skor) 5 poin. Yang terbaik tampak sekitar 1,54 × 5 = 7,7 poin lebih baik daripada kenyataan semuanya, karena 1,54 adalah nilai terbesar yang diharapkan dari sepuluh pengambilan normal baku.

Karena itu test set tidak boleh memilih apa pun. Bukan model, feature, metrik, maupun threshold.

> Awas: jika kamu sempat melihat angka test lalu mengubah sesuatu, katakan itu dan perlakukan skornya sebagai skor yang sudah disetel. Skor yang diberi label tetap berguna.

## Threshold berasal dari biaya
*Bagaimana memilih threshold tanpa mengintip?*

Model memberi setiap discharge sebuah skor, dan threshold mengubahnya menjadi keputusan, seperti di "Measuring a classifier". Pilih threshold yang biayanya paling rendah pada prediksi out-of-fold. Tujuh kandidatnya (nilai tengah dibulatkan ke atas):

| Threshold | Telepon | Terlewat | Alarm palsu | Biaya per discharge | Accuracy |
| --- | --- | --- | --- | --- | --- |
| 0,5 | 90 | 85 | 31 | 28,5 | 92,8% |
| 0,4 | 122 | 73 | 51 | 26,0 | 92,3% |
| 0,3 | 172 | 64 | 92 | 25,8 | 90,3% |
| 0,2 | 274 | 42 | 172 | 23,9 | 86,6% |
| 0,15 | 343 | 37 | 236 | 26,3 | 82,9% |
| 0,1 | 442 | 26 | 324 | 28,4 | 78,1% |
| 0,06 | 590 | 17 | 463 | 34,3 | 70,0% |

[[figure:defensible-evaluation/cost-by-threshold|Biaya per discharge pada setiap threshold, dari prediksi out-of-fold. Titik terendahnya adalah 0,2. Garis putus-putus adalah dua aturan yang tidak membutuhkan model.]]

Accuracy akan memilih 0,5. Biaya memilih 0,2, yang lebih murah 4,6 per discharge. Dasar kurvanya landai: pindah ke 0,3 hanya menambah 1,9, karena itu sampaikan bahwa pilihan ini tidak setajam itu.

::: deeper Cutoff dari biaya saja
Anggaplah sebuah skor adalah probabilitas p readmission yang terkalibrasi: dari discharge yang diberi skor p, sebagian p benar-benar dirawat kembali. Menelepon berbiaya (1 - p) × 100 secara rata-rata, dan tidak menelepon berbiaya p × 500. Menelepon lebih murah bila 100 < 600p, yaitu p > 100 / 600 = 0,167. Pada tabel, nilai minimumnya, 0,2, dekat dengan itu. Aturan ini hanya berlaku bila skornya benar-benar terkalibrasi, karena itu pakai sebagai titik awal dan periksa terhadap tabel.
:::

## Skor beserta intervalnya
*Seberapa yakin kamu pada hasil test?*

Sekarang buka test set satu kali, dengan model yang dilatih ulang dan threshold 0,2. Dari 400 discharge, 44 adalah readmission. Model melakukan 57 telepon: TP = 26 true positive, FP = 31 false positive, FN = 18 false negative, TN = 325 true negative. Biayanya 18 × 500 + 31 × 100 = 12.100, atau 30,25 per discharge. Tidak pernah menelepon berbiaya 22.000 (55,0) dan menelepon semua orang berbiaya 35.600 (89,0).

Angka 30,25 saja hanyalah satu pengambilan. Ambil sampel ulang 100 pasien test dengan pengembalian, pindahkan keempat discharge seorang pasien bersama-sama, hitung ulang biayanya, dan ulangi 2.000 kali. Interval persentil 95%-nya, yaitu 95% tengah dari 2.000 biaya itu, adalah 19,0 sampai 43,3. Mengambil sampel ulang 400 discharge seolah-olah independen memberi 20,8 sampai 41,5, sehingga interval per pasien kira-kira 17% lebih lebar, karena test set berisi 100 pasien, bukan 400 kasus.

[[figure:defensible-evaluation/interval-by-patient|Biaya test per discharge dengan dua interval bootstrap. Mengambil sampel ulang pasien adalah cara yang jujur. Perkiraan tuning, 23,9, berada di dalamnya.]]

Penghematan dibandingkan tidak pernah menelepon adalah 55,0 - 30,25 = 24,75 per discharge, dengan interval 8,0 sampai 44,3. Intervalnya tetap di atas nol, sehingga nilai model ini bukan kebetulan dari satu pengambilan data.

## Sebelum proyek
*Apa yang kamu serahkan kepada pembaca bersama angkanya?*

Tulis laporan sebagai jawaban atas lima pertanyaan. Di sini: grouped 5-fold cross-validation pada 400 pasien dan test set berisi 100 pasien lain; biaya, dengan 500 per kasus terlewat dan 100 per alarm palsu; 60 pengaturan yang disetel hanya pada data tuning, dan threshold 0,2; biaya test 30,25, interval 19,0 sampai 43,3, dibandingkan 55,0 bila tidak pernah menelepon.

| Pertanyaan | Yang kamu tunjukkan |
| --- | --- |
| Apa yang baru saat model dipakai? | Splitnya, dan mengapa sesuai |
| Berapa biaya sebuah kesalahan? | Metrik, biayanya, dan kedua baseline |
| Kamu menyetel pada data apa? | Baris mana, dan bahwa test set tetap tertutup |
| Threshold mana yang kamu pakai? | Threshold dari biaya pada prediksi out-of-fold |
| Seberapa yakin kamu? | Interval yang mengambil sampel ulang entitas secara utuh |

Pelajaran berikutnya, "Reproducible pipelines", membahas cara membuat setiap baris laporan ini dapat diulang. Lalu "Intermediate capstone project" meminta kamu mempertahankan sebuah split, membandingkan model, dan melaporkan interval held-out untuk classifier yang peka biaya dengan entitas atau timestamp yang berulang.

::: remember
- Nyatakan apa yang baru saat model dipakai, lalu potong data agar baris uji baru dengan cara itu: per grup, menurut waktu, atau keduanya.
- Pilih metrik dari biaya, lakukan tuning dan pemilihan threshold pada prediksi out-of-fold, dan buka test set hanya sekali.
- Laporkan skor test dengan interval yang mengambil sampel ulang entitas secara utuh, di samping baseline yang tidak butuh model.
:::
