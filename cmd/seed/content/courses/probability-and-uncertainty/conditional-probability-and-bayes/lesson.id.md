---
slug: conditional-probability-and-bayes
title: Probabilitas bersyarat dan aturan Bayes
---
::: intro
- Menghitung probabilitas bersyarat dengan cara mencacah, dan memahami mengapa P(A | B) dan P(B | A) adalah dua angka yang berbeda.
- Memakai aturan Bayes dengan natural frequencies (cacah dari 1.000 kasus) untuk mengubah "tes ini sensitif 90 persen" menjadi "hasil positif berarti 27 persen".
- Menjelaskan mengapa precision bergantung pada seberapa umum kelas positif, serta menguji apakah dua kejadian saling independen.

Sebelum mulai: baca "Confusion matrix and rates" dan "Class imbalance".
:::

## Probabilitas setelah tahu sesuatu
*Apa yang berubah ketika kamu sudah tahu satu fakta tentang sebuah kasus?*

**Probabilitas** adalah angka dari 0 sampai 1 yang menyatakan seberapa mungkin sebuah kejadian terjadi. Dalam pelajaran ini probabilitas dipahami sebagai porsi kasus: kalau 124 dari 344 penguin di tabel penguin lengkap (344 baris, termasuk 2 baris tanpa ukuran) adalah Gentoo, maka P(Gentoo) = 124 / 344 = 0,36.

Sekarang seseorang memberi tahu bahwa penguin itu hidup di pulau Biscoe. Fakta itu menyingkirkan semua penguin lain dari hitungan. Dari 344 penguin, 168 hidup di Biscoe, dan 124 di antaranya Gentoo. Maka P(Gentoo | Biscoe) = 124 / 168 = 0,74.

Garis tegak `|` dibaca "diketahui". **Probabilitas bersyarat** adalah probabilitas suatu kejadian, dihitung hanya di antara kasus yang memenuhi kejadian lain:

P(A | B) = (kasus dengan A dan B sekaligus) / (kasus dengan B)

Syarat itu memperkecil kelompok yang kamu hitung. Balik pertanyaannya, dan kelompoknya ikut berganti. Ke-124 penguin Gentoo semuanya hidup di Biscoe, sehingga P(Biscoe | Gentoo) = 124 / 124 = 1,00. Kejadiannya sama, pertanyaannya berbeda, dan angkanya pun berbeda.

> Awas: P(A | B) tidak sama dengan P(B | A). Tertukarnya keduanya adalah kekeliruan paling umum di topik ini, dan bagian berikutnya menunjukkan bagaimana kekeliruan itu merugikan keputusan yang nyata.

## Menghitung dari 1.000 kasus
*Bagaimana menjawab soal probabilitas hanya dengan cacah?*

Persentase seperti "sensitif 90 persen" mudah disalahartikan. Cacah lebih gampang dibaca: bayangkan 1.000 kasus, lalu hitung berapa yang masuk ke tiap kelompok. Cacah semacam ini disebut **natural frequencies**.

Ini contohnya, sebuah tes skrining. Dari setiap 100 orang, 2 orang mengidap kondisi tertentu (kelas positif). Tes ini menjaring 90 dari setiap 100 orang yang sakit: **sensitivity**-nya 0,90, angka yang sama dengan recall di "Confusion matrix and rates". Tes ini juga memberi alarm palsu pada 5 dari setiap 100 orang sehat. Hasil tesmu positif. Seberapa besar kemungkinan kamu sakit?

Susun jawabannya dari 1.000 orang:

1. 2 persen sakit: 20 orang. Sisanya, 980 orang, sehat.
2. Dari 20 orang sakit, 90 persen hasilnya positif: 18 orang. Sisanya, 2 orang, tidak terdeteksi.
3. Dari 980 orang sehat, 5 persen hasilnya positif: 49 orang. Sisanya, 931 orang, hasilnya negatif.

Yang positif: 18 + 49 = 67 orang. Hanya 18 di antaranya yang sakit, sehingga P(sakit | positif) = 18 / 67 = 0,27.

[[figure:conditional-probability-and-bayes/frequency-tree|1.000 orang dipisah dulu menurut kenyataan, lalu menurut hasil tes. Dua kotak berlabel positif adalah kelompok tempatmu berada setelah hasil tes positif.]]

Godaannya adalah menjawab 0,90. Padahal 0,90 hanyalah banyaknya orang sakit yang berhasil dijaring tes, dan itu pertanyaan yang lain.

## Aturan Bayes
*Rumus apa yang ada di balik cara menghitung tadi?*

**Aturan Bayes** adalah hitungan cacah tadi yang ditulis sebagai rumus. Rumus ini membawamu dari P(positif | sakit), yang diukur oleh pembuat tes, ke P(sakit | positif), yang sebenarnya kamu butuhkan:

P(sakit | positif) = P(positif | sakit) x P(sakit) / P(positif)

Setiap bagian punya nama dan angka dari contoh tadi.

- **Prior**, P(sakit) = 0,02: seberapa mungkin kamu sakit sebelum dites.
- **Likelihood**, P(positif | sakit) = 0,90: seberapa mungkin orang sakit memperoleh hasil positif.
- **Evidence**, P(positif) = 0,90 x 0,02 + 0,05 x 0,98 = 0,018 + 0,049 = 0,067: seberapa sering siapa pun memperoleh hasil positif, entah sakit atau sehat.
- **Posterior**, P(sakit | positif) = 0,018 / 0,067 = 0,27: seberapa mungkin kamu sakit setelah dites.

Bandingkan dengan cacah tadi: 0,018 berarti 18 orang dari 1.000, dan 0,067 berarti 67 orang dari 1.000. Rumus dan cacah menghasilkan 0,27 yang sama karena keduanya hitungan yang sama. Pakai mana yang kamu percaya; cacah lebih mudah diperiksa.

> Gagasan kunci: aturan Bayes memperbarui prior dengan evidence. Posterior bergantung pada likelihood dan pada seberapa umum kondisi itu sejak awal.

## Mengapa base rate penting
*Mengapa tes yang sama bisa berarti lain di kelompok yang lain?*

Tesnya tidak berubah, tetapi maknanya bergantung pada kelompok tempat tes dipakai. Pertahankan sensitivity 0,90 dan tingkat alarm palsu 0,05, lalu ubah hanya jumlah orang yang sakit (**base rate**, atau prevalensi). Cacah dari 1.000 orang (alarm palsu berkurang ketika kelompok sehat mengecil, sementara true positive bertambah, dan precision mengikuti):

| Sakit dari 1.000 orang | Positif yang sakit | Positif yang sehat | P(sakit jika positif) |
|---|---|---|---|
| 20 (2 persen) | 18 | 49 | 18 / 67 = 0,27 |
| 200 (20 persen) | 180 | 40 | 180 / 220 = 0,82 |
| 500 (50 persen) | 450 | 25 | 450 / 475 = 0,95 |

[[figure:conditional-probability-and-bayes/same-test-two-groups|Tes yang sama dipakai pada kelompok dengan 2 persen sakit dan pada kelompok dengan 20 persen sakit. Setiap kotak adalah satu orang yang hasilnya positif.]]

Ini adalah tabel precision dari "Class imbalance" yang dinyatakan dengan cara lain. Precision adalah P(benar-benar positif | model bilang positif), yaitu sebuah posterior, dan rasio kelas positif adalah prior-nya. Ketika kelas positif langka, tes atau model yang bagus pun sebagian besar hanya memberi alarm palsu.

> Awas: sensitivity dan tingkat alarm palsu sebuah tes belum memberi tahu apa arti hasil positif. Kamu juga perlu base rate di tempat tes itu akan dipakai.

## Alarm sebuah classifier, dihitung manual
*Apa arti alarm fraud bagi orang yang membacanya?*

Ambil model fraud dari "Class imbalance". Dari 10.000 pembayaran, 100 adalah fraud, dan model itu memiliki TP = 60, FN = 40, FP = 140, dan TN = 9.760. Kecilkan skalanya menjadi 1.000 pembayaran dengan membagi setiap cacah dengan 10:

- 10 adalah fraud. Model memberi alarm pada 6 dan melewatkan 4. Recall-nya 6 / 10 = 0,60.
- 990 adalah pembayaran wajar. Model memberi alarm pada 14 dan diam pada 976. Tingkat alarm palsunya 14 / 990 = 0,014.

[[figure:conditional-probability-and-bayes/alert-table|1.000 pembayaran model itu sebagai confusion matrix. Recall dibaca menyusuri baris fraud; precision dibaca menurun di kolom alarm.]]

Alarm: 6 + 14 = 20. Hanya 6 yang fraud, sehingga P(fraud | alarm) = 6 / 20 = 0,30. Itulah precision. Aturan Bayes memberi angka yang sama: 0,60 x 0,01 / (0,60 x 0,01 + 0,014 x 0,99) = 0,006 / 0,020 = 0,30.

Satu tabel memberi dua probabilitas. Menyusuri baris fraud menghasilkan P(alarm | fraud) = 0,60. Membaca menurun di kolom alarm menghasilkan P(fraud | alarm) = 0,30. Analis yang membuka sebuah alarm berkepentingan dengan angka kedua: 7 dari 10 alarm ternyata palsu.

Kalau model yang lebih baik memangkas alarm palsu menjadi separuhnya, yaitu 7, precision-nya menjadi 6 / 13 = 0,46.

## Independensi
*Kapan mengetahui satu fakta tidak memberi tahu apa pun tentang fakta lain?*

Dua kejadian **independen** ketika mengetahui salah satunya tidak mengubah probabilitas yang lain: P(A | B) = P(A). Dalam kasus itu, peluang keduanya terjadi sekaligus adalah P(A dan B) = P(A) x P(B).

Ujilah pada data penguin. Di antara 333 penguin yang jenis kelaminnya tercatat, 168 adalah jantan: 0,50. Sekarang tanyakan per spesies. Pada Adelie angkanya 73 dari 146 (0,50), pada Chinstrap 34 dari 68 (0,50), dan pada Gentoo 61 dari 119 (0,51). Mengetahui spesies nyaris tidak memberi tahu apa pun tentang jenis kelamin, sehingga keduanya kurang lebih independen.

Pulau dan spesies tidak demikian. P(Gentoo) adalah 0,36, tetapi P(Gentoo | Biscoe) adalah 0,74. Mengetahui pulau mengubah jawabannya, sehingga keduanya **dependen**.

Independensi penting dalam praktik. Jika dua hasil tes saling independen bila kenyataan sebenarnya (sakit atau tidak) diketahui, hasil positif kedua menjadi tambahan evidence yang kuat, dan kamu dapat mengalikan likelihood keduanya. Jika tidak, karena keduanya berasal dari metode yang sama-sama cacat atau dari sampel yang sama-sama buram, hasil kedua hampir tidak menambah informasi baru.

> Awas: independensi adalah asumsi yang harus diperiksa, bukan nilai bawaan. Memperlakukan fitur yang berkaitan erat atau pemeriksaan yang diulang sebagai independen berarti menghitung evidence yang sama dua kali.

::: deeper Tes positif yang kedua
Misalkan kondisi 2 persen tadi dites lagi dengan tes kedua yang kualitasnya sama, dan galatnya independen dari tes pertama. Pakai 10.000 orang agar cacahnya tetap bulat. 200 orang sakit dan 9.800 sehat. Tes pertama memberi 180 positif yang sakit dan 490 positif yang sehat, sehingga totalnya 670 positif (180 / 670 = 0,27).

Tes ulang hanya untuk 670 orang ini. Dari 180 orang sakit, 90 persen positif lagi: 162. Dari 490 orang sehat, 5 persen: 24,5 (setengah orang tidak masalah dalam rata-rata). P(sakit | dua kali positif) = 162 / (162 + 24,5) = 0,87. Hasil positif pertama menaikkan peluang dari 0,02 ke 0,27, dan yang kedua dari 0,27 ke 0,87. Kalau tes kedua punya cacat yang sama dengan tes pertama, hasilnya bisa tetap dekat 0,27.
:::

::: deeper Probabilitas sebuah model adalah probabilitas bersyarat
Regresi logistik, dari "Probabilities and the sigmoid", menghasilkan angka yang dibaca sebagai P(kelas = ya | feature): probabilitas ya berdasarkan apa yang diketahui model tentang kasus ini. Aturan Bayes menjelaskan mengapa angka itu bergantung pada base rate di data latih. Kalau kamu melakukan oversampling pada kelas langka atau menambahkan class weights, model belajar dari data tempat ya lebih sering muncul, sehingga probabilitasnya kira-kira terlalu tinggi untuk pemakaian nyata, walaupun urutan peringkat kasusnya tetap baik.
:::

## Berikutnya: sampling dan bootstrap lab
*Apa yang disembunyikan oleh cacah-cacah ini?*

Setiap angka di pelajaran ini berasal dari cacah: 6 dari 10 fraud tertangkap, 73 dari 146 penguin Adelie berjenis kelamin jantan. Kumpulan kasus yang lain akan memberi cacah yang sedikit berbeda, sehingga recall atau precision-nya pun sedikit berbeda. Dengan 10 kasus fraud, satu tangkapan tambahan menggeser recall sebesar 10 poin.

Pelajaran berikutnya, "Sampling variability and the bootstrap", membahas seberapa jauh angka yang dilaporkan akan bergeser kalau datanya dikumpulkan ulang, dan bagaimana memberi rentang yang jujur di sekelilingnya. Setelah itu kursus ditutup dengan "Bootstrap lab": kamu mengambil banyak sampel dari populasi yang sama dan melihat sebuah metrik seperti precision berubah-ubah dari sampel ke sampel.

Sebelum lanjut, pastikan kamu dapat menyusun tabel 1.000 kasus untuk tes skrining tanpa melihat catatan, lalu ubah base rate-nya dan prediksikan apa yang terjadi pada P(sakit | positif).

::: remember
- P(A | B) menghitung A hanya di antara kasus yang memenuhi B, sehingga biasanya berbeda dari P(B | A).
- Aturan Bayes, atau menghitung dari 1.000 kasus, mengubah likelihood menjadi posterior: sensitivity 0,90 dengan base rate 2 persen menghasilkan 18 / 67 = 0,27.
- Precision adalah posterior: nilainya turun ketika kelas positif langka. Independensi adalah sesuatu yang diperiksa, bukan diasumsikan.
:::
