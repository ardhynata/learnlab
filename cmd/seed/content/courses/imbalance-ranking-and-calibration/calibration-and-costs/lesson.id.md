---
slug: calibration-and-costs
title: Kalibrasi dan biaya
---
::: intro
- Periksa apakah probabilitas prediksi benar-benar terjadi sesering yang dikatakannya, dengan reliability diagram dan Brier score.
- Tunjukkan bahwa dua model dapat mengurutkan kasus dengan urutan yang sama, dengan AUC yang sama, tetapi berbeda dalam kalibrasi.
- Pilih threshold dari biaya false positive dan biaya false negative, lalu hitung satu threshold dengan tangan.

Sebelum mulai: baca "ROC and precision-recall" dan "Confusion matrix and rates".
:::

## Probabilitas adalah klaim tentang frekuensi
*Apa artinya prediksi 0,8 dikatakan benar?*

Pelajaran sebelumnya membahas *ranking*: apakah model menempatkan kasus positif di atas kasus negatif? Ranking hanya menyatakan kasus mana yang tampak lebih mungkin daripada kasus lain. Seberapa mungkin, itu tidak dikatakan.

Banyak model juga mengeluarkan angka antara 0 dan 1 untuk tiap kasus, dan orang membacanya sebagai probabilitas. Sebuah model disebut *calibrated* (terkalibrasi) jika angka-angka itu berarti seperti yang dikatakannya. Kumpulkan semua kasus yang diprediksi sekitar 0,8. Jika model terkalibrasi, sekitar 80 persen di antaranya positif. Di antara kasus pada 0,3, sekitar 30 persen yang positif.

Kalibrasi adalah sifat sekelompok kasus, bukan satu kasus. Satu pembayaran hanya penipuan atau bukan, sehingga satu hasil tidak dapat membuktikan 0,8 benar atau salah. Kamu butuh banyak kasus dengan prediksi yang sama.

Ranking dan kalibrasi adalah dua pertanyaan yang terpisah. AUC hanya menanyakan apakah kasus positif cenderung berada di atas kasus negatif. AUC tidak berubah walaupun semua angka dipepatkan atau diregangkan, asalkan urutannya tetap. Padahal angka itu penting begitu sebuah keputusan memakainya, misalnya saat kamu mengalikan probabilitas dengan biaya.

> Gagasan kunci: ranking bertanya "kasus mana yang lebih dulu?". Kalibrasi bertanya "sebenarnya seberapa mungkin?". Sebuah model dapat bagus di satu hal dan lemah di hal lain.

## Reliability diagram
*Bagaimana memeriksa kalibrasi pada test set?*

Kelompokkan kasus uji menurut probabilitas prediksinya. Untuk tiap kelompok, bandingkan dua angka: probabilitas yang diprediksi model dan proporsi kasus yang benar-benar positif. *Reliability diagram* memplotnya, dengan prediksi di sumbu mendatar dan proporsi teramati di sumbu tegak. Model yang terkalibrasi sempurna berada tepat di diagonal.

Pelajaran ini memakai test set rekaan berisi 1000 pembayaran dengan 254 penipuan. Supaya hitungannya pendek, setiap pembayaran dalam satu baris mendapat prediksi yang sama. Pada uji nyata, prediksi di dalam satu bin berbeda-beda, dan kamu memakai rata-rata prediksi bin itu.

| Prediksi | Kasus | Positif | Proporsi positif |
| --- | --- | --- | --- |
| 0,05 | 400 | 20 | 0,05 |
| 0,15 | 250 | 40 | 0,16 |
| 0,35 | 150 | 51 | 0,34 |
| 0,60 | 120 | 75 | 0,625 |
| 0,85 | 80 | 68 | 0,85 |

[[figure:calibration-and-costs/reliability|Reliability diagram Model A. Titik-titiknya dekat dengan diagonal, sehingga angkanya berarti kurang lebih seperti yang dikatakannya.]]

Bacalah diagram ini dari posisinya. Titik di atas diagonal berarti positifnya lebih banyak daripada prediksi model. Titik di bawahnya berarti lebih sedikit. Model A selalu dekat dengan garis: prediksi 0,35 terbukti benar 34 persen dari waktu.

## Brier score
*Bagaimana mengubah kalibrasi menjadi satu angka?*

*Brier score* adalah rata-rata kuadrat selisih antara probabilitas prediksi dan kejadian sebenarnya, dengan positif dihitung 1 dan negatif 0. Makin rendah makin baik, dan 0 berarti sempurna. Ia berkerabat dengan log loss dari pelajaran "Log loss and fitting": keduanya menghargai probabilitas yang jujur, tetapi Brier score lebih lunak terhadap kesalahan yang diucapkan dengan yakin. Misalnya, prediksi 0,99 untuk kasus yang ternyata negatif dihargai 0,98 oleh Brier score, tetapi sekitar 4,6 oleh log loss (logaritma natural).

> Contoh hitungan: empat kasus. Prediksi 0,9 untuk kasus positif menghasilkan (1 − 0,9)² = 0,01. Prediksi 0,8 untuk kasus negatif menghasilkan (0 − 0,8)² = 0,64. Prediksi 0,3 untuk kasus negatif menghasilkan 0,09, dan prediksi 0,6 untuk kasus positif menghasilkan 0,16. Jumlahnya 0,90 dan rata-ratanya 0,90 / 4 = 0,225.

Dua titik acuan membantu. Model yang selalu berkata 0,5 mendapat skor 0,25. Model yang selalu berkata base rate, di sini 254 / 1000 = 0,254, mendapat skor 0,254 × 0,746 = 0,1895.

Pada test set, ambil baris 0,35. Tiap dari 51 kasus positifnya menyumbang (1 − 0,35)² = 0,4225, sehingga 21,5475. Tiap dari 99 kasus negatifnya menyumbang 0,35² = 0,1225, sehingga 12,1275. Baris itu menyumbang 33,675. Jumlah kelima baris adalah 124,7, dan 124,7 / 1000 = 0,1247 untuk Model A.

> Awas: Brier score mencampur kalibrasi dengan kualitas ranking. Skor yang lebih rendah dapat berarti angka yang lebih baik, urutan yang lebih baik, atau keduanya. Reliability diagram menunjukkan bagian kalibrasinya saja.

## Ranking sama, kalibrasi berbeda
*Dapatkah dua model dengan AUC yang sama memberi probabilitas yang berbeda?*

Buat Model B dari Model A dengan mendorong setiap angka menjauhi 0,5: 0,05 menjadi 0,01, 0,15 menjadi 0,05, 0,35 menjadi 0,20, 0,60 menjadi 0,80 dan 0,85 menjadi 0,97. Kelima baris tetap berurutan sama, sehingga setiap pasangan positif-negatif diurutkan persis seperti sebelumnya. AUC-nya 0,84 untuk kedua model.

Sekarang lihat reliability diagram-nya. Model B berkata 0,97 untuk baris yang hanya 85 persen positif, dan 0,01 untuk baris yang 5 persen positif. Titik-titiknya berada di atas diagonal di sisi kiri dan di bawahnya di sisi kanan. Bentuk itu adalah ciri model yang *overconfident* (terlalu yakin).

| Model | AUC | Brier score |
| --- | --- | --- |
| A | 0,84 | 0,1247 |
| B | 0,84 | 0,1360 |

[[figure:calibration-and-costs/same-ranking|Dua model, satu urutan. Garis-garisnya menghubungkan angka tiap kelompok di A dengan angkanya di B dan tidak pernah bersilangan, sehingga AUC-nya sama, tetapi hanya angka A yang jujur.]]

> Gagasan kunci: AUC tidak peka terhadap kalibrasi. Perubahan apa pun yang menjaga urutan skor tidak memengaruhinya, seburuk apa pun angkanya.

## Rekalibrasi
*Bagaimana memperbaiki angka yang urutannya baik tetapi terbaca keliru?*

Jika urutannya sudah baik dan hanya angkanya yang meleset, kamu tidak perlu model baru. Kamu mempelajari peta kecil dari skor model ke frekuensi teramati. Inilah *rekalibrasi*. Ada dua metode yang menjadi nama standar.

*Platt scaling* mencocokkan regresi logistik satu input pada skor: probabilitas terkalibrasi adalah sigmoid dari a·skor + b, dengan dua angka a dan b yang dipelajari dari data. Parameternya sedikit, sehingga sesuai untuk sampel kecil dan distorsi yang mulus berbentuk S. Dengan a di atas 0, urutannya terjaga persis.

*Isotonic regression* mencocokkan tangga yang tidak pernah turun. Metode ini lebih fleksibel dan butuh lebih banyak data. Ia dapat menggabungkan skor yang bertetangga ke dalam satu anak tangga, sehingga muncul nilai yang sama.

Untuk Model B, proporsi teramati sudah naik bersama skornya, sehingga isotonic fit cukup memetakan 0,01, 0,05, 0,20, 0,80 dan 0,97 ke 0,05, 0,16, 0,34, 0,625 dan 0,85. Brier score turun dari 0,1360 ke 0,1246. AUC tetap 0,84.

> Awas: angka 0,1246 itu diukur pada set yang sama dengan set yang dipakai mencocokkan peta, sehingga terlalu menguntungkan. Cocokkan rekalibrasi pada data yang tidak dipakai melatih model, dan laporkan hasilnya pada test set baru.

## Threshold dari biaya
*Bagaimana biaya menentukan di mana memotong?*

Angka 0,5 yang lazim itu kebiasaan, bukan hukum. Threshold yang tepat bergantung pada biaya kedua jenis kesalahan. Misalkan sebuah *false positive* (pembayaran baik yang dikirim ke tinjauan manual) berbiaya 10 unit uang dan tenaga, dan sebuah *false negative* (penipuan yang lolos) berbiaya 30. Keputusan yang benar tidak berbiaya apa-apa di sini.

Untuk satu kasus dengan probabilitas prediksi p, bandingkan biaya harapan tiap pilihan. Menandai berbiaya (1 − p) × 10, karena kasus itu sebenarnya baik dengan probabilitas 1 − p. Tidak menandai berbiaya p × 30. Tandai kasus itu jika yang pertama lebih kecil:

(1 − p) × 10 < p × 30, yang memberi p > 10 / (10 + 30) = 0,25.

> Contoh hitungan: p = 0,35. Menandai berbiaya 0,65 × 10 = 6,5 dan tidak menandai berbiaya 0,35 × 30 = 10,5, sehingga tandai kasus itu. p = 0,15: menandai berbiaya 0,85 × 10 = 8,5 dan tidak menandai berbiaya 0,15 × 30 = 4,5, sehingga kasus itu dibiarkan.

## Aturan umum
*Bagaimana threshold bergeser ketika biayanya berubah?*

Secara umum, threshold adalah biaya false positive dibagi jumlah kedua biaya. Rasio biaya 1 banding 1 memberi 0,5, false negative (kasus yang terlewat) yang berbiaya 3 kali false positive memberi 0,25, 9 kali memberi 0,1, dan 19 kali memberi 0,05. Makin mahal sebuah false negative, makin rendah threshold-nya.

::: deeper Ketika keputusan yang benar pun berbiaya
Jika true positive berbiaya C_TP dan true negative berbiaya C_TN, langkah yang sama memberi threshold (C_FP − C_TN) / ((C_FP − C_TN) + (C_FN − C_TP)). Dengan C_TP = 2, threshold-nya menjadi 10 / (10 + 28) = 0,263.
:::

## Threshold pada seluruh test set
*Apakah aturan biaya mengalahkan 0,5, dan kapan ia gagal?*

Hitung kesalahan nyata Model A pada tiga threshold, dengan biaya 10 per false positive dan 30 per false negative.

| Threshold | Baris yang ditandai | False positive | False negative | Total biaya |
| --- | --- | --- | --- | --- |
| 0,50 | 0,60 dan 0,85 | 57 | 111 | 570 + 3330 = 3900 |
| 0,25 | 0,35, 0,60, 0,85 | 156 | 60 | 1560 + 1800 = 3360 |
| 0,10 | 0,15 ke atas | 366 | 20 | 3660 + 600 = 4260 |

Tidak menandai apa pun berbiaya 254 × 30 = 7620, dan menandai semuanya berbiaya 746 × 10 = 7460. Threshold 0,25 dari biaya memberi total terendah, 3360, sekitar 14 persen di bawah kebiasaan 0,5.

> Awas: pilih threshold pada data validasi, jangan pada test set yang kamu laporkan.

## Ketika angkanya bukan probabilitas
*Mengapa threshold yang sama gagal untuk Model B?*

[[figure:calibration-and-costs/cost-curve|Total biaya terhadap threshold. Model A berbiaya terendah pada 0,25. Model B, dengan ranking yang sama, membayar 3900 di sana, karena angkanya bukan probabilitas.]]

Pada 0,25, Model B hanya menandai dua baris teratasnya, karena baris 0,20 jatuh di bawah garis, padahal 34 persen baris itu positif. Biayanya 3900. Rumus itu mengandaikan probabilitas yang terkalibrasi. Untuk B, kamu harus mencari threshold yang lebih baik: 0,10 kebetulan mencapai 3360, karena menandai baris yang sama dengan 0,25 pada A, tetapi hanya pencarian yang menemukannya. Atau rekalibrasi dulu: angka B lalu sama dengan proporsi A, dan 0,25 kembali memberi 3360.

::: deeper Mengapa bin itu berisik
Bin dengan 20 kasus dan proporsi positif sebenarnya 0,5 memberi proporsi teramati yang bergeser sekitar 0,11 dari satu sampel ke sampel lain, yaitu akar dari 0,5 × 0,5 / 20. Beberapa kasus saja per bin dapat membuat model yang terkalibrasi tampak miring, karena itu pastikan tiap bin berisi cukup kasus.
:::

## Membawa ini ke lab
*Apa yang akan kamu periksa di calibration lab?*

Pelajaran berikutnya, calibration lab, memungkinkan kamu menjalankan seluruh rangkaian ini pada data yang dapat kamu ubah: urutkan kasus, periksa kalibrasinya, lalu putuskan dengan biaya. Kamu hanya perlu tiga kebiasaan.

Pertama, lihat ranking dan kalibrasi secara terpisah. AUC memberi tahu tentang urutan, sedangkan reliability diagram dan Brier score memberi tahu tentang angkanya. Kedua, sebelum memercayai sebuah probabilitas dalam hitungan biaya, tanyakan apakah titik-titiknya dekat dengan diagonal. Ketiga, sebutkan biaya kedua jenis kesalahan, hitung threshold darinya, dan bandingkan total biayanya dengan 0,5 pada data yang ditahan.

Buat prediksi sebelum mengubah pengaturan apa pun: jika dua model memiliki AUC yang sama, apakah reliability diagram-nya juga sama? Kamu sudah tahu jawabannya dari Model A dan Model B.

::: remember
- Probabilitas yang terkalibrasi terjadi sesering yang dikatakannya. Reliability diagram dan Brier score memeriksanya, sedangkan AUC tidak.
- Dua model dapat memiliki ranking dan AUC yang sama tetapi berbeda kalibrasi. Rekalibrasi (Platt scaling, isotonic regression) memperbaiki angkanya tanpa mengubah urutan.
- Dengan probabilitas yang terkalibrasi, tandai sebuah kasus jika p melebihi biaya false positive dibagi jumlah kedua biaya.
:::
