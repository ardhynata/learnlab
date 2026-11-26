---
slug: confusion-matrix-and-rates
title: Confusion matrix dan rasio-rasionya
---
::: intro
- Sebutkan empat hasil dari jawaban ya-atau-tidak dan isi sebuah confusion matrix.
- Hitung accuracy, precision, recall, dan F1 dengan tangan dari empat angka hitungan.
- Pilih metrik yang sesuai dengan biaya dari tiap jenis kesalahan.

Sebelum mulai: baca "Baselines and splits" dan "Train, validation and test".
:::

## Satu angka saja tidak cukup
*Mengapa "seberapa sering jawabannya benar?" belum menceritakan semuanya?*

Banyak classifier (model yang menggolongkan tiap kasus ke satu kelas) menjawab ya atau tidak: apakah pasien ini mengidap penyakit tertentu, apakah pesan ini spam, apakah pembayaran ini penipuan? Untuk menilainya, ide pertama yang muncul adalah menghitung seberapa sering jawabannya benar. Angka tunggal itu menyembunyikan hal penting: jawaban ya-atau-tidak dapat salah dengan dua cara yang berbeda.

Dalam modul ini, kasus yang sedang kamu cari disebut kelas **positif**: penyakitnya, spam-nya, penipuannya. Semua sisanya adalah kelas **negatif**. Positif tidak berarti baik, hanya "yang ingin kita temukan".

- Classifier menjawab tidak untuk kasus yang sebenarnya positif: itu **kasus yang terlewat**.
- Classifier menjawab ya untuk kasus yang sebenarnya negatif: itu **alarm palsu**.

Kedua kesalahan ini jarang sama mahalnya. Penyakit yang terlewat bisa berbahaya, sedangkan alarm palsu mungkin hanya berarti satu tes tambahan. Skor persentase jawaban benar menjumlahkan kedua kesalahan menjadi satu hitungan dan tidak dapat membedakannya. Karena itu, kita menghitung tiap jenis kesalahan secara terpisah.

> Gagasan kunci: untuk menilai sebuah classifier, hitung dulu jawaban yang benar dan kedua jenis jawaban yang salah secara terpisah. Setiap metrik dalam pelajaran ini adalah rasio dari angka-angka hitungan tersebut.

## Confusion matrix
*Bagaimana kita menghitung empat kemungkinan hasil dari sebuah jawaban ya-atau-tidak?*

Tempatkan setiap kasus ke dalam salah satu dari empat sel, tergantung pada kebenaran sebenarnya dan jawaban classifier. Tabel berisi empat hitungan itu disebut **confusion matrix**.

[[figure:confusion-matrix-and-rates/cell-names|Empat sel. Baris adalah kebenaran sebenarnya, kolom adalah jawaban. Nama tiap sel dibaca dalam dua langkah.]]

Bacalah nama sel mulai dari kata terakhirnya:

- Kata terakhir menunjukkan apa yang **dijawab** classifier: positif berarti ya, negatif berarti tidak.
- Kata pertama menunjukkan apakah jawaban itu **benar** (true) atau **salah** (false).

Dari situ lahir empat sel. **True positive (TP)** adalah positif sebenarnya yang berhasil ditangkap. **False negative (FN)** adalah positif sebenarnya yang terlewat. **False positive (FP)** adalah negatif sebenarnya yang ikut ditandai, yaitu alarm palsu. **True negative (TN)** adalah negatif sebenarnya yang dibiarkan.

Dua sel jawaban benar (TP dan TN) berada pada satu diagonal. Dua sel kesalahan, FN dan FP, berada pada diagonal lainnya. Setiap kasus jatuh tepat ke satu sel, sehingga keempat hitungan itu berjumlah sama dengan banyaknya kasus.

## Contoh hitungan dengan tangan
*Seperti apa confusion matrix untuk sekumpulan angka yang nyata?*

Sebuah klinik menguji 200 orang untuk suatu kondisi. Berdasarkan pemeriksaan lanjutan yang pasti, 20 di antaranya benar-benar mengidapnya dan 180 tidak. Tes cepat itu menjawab ya untuk 24 orang. Dari 24 orang itu, 15 benar-benar mengidap kondisinya.

Isi sel-selnya dengan pensil:

1. **TP** = 15, yaitu orang sakit yang ditandai oleh tes.
2. **FN** = 20 - 15 = 5, yaitu orang sakit yang terlewat.
3. **FP** = 24 - 15 = 9, yaitu orang sehat yang ikut ditandai.
4. **TN** = 180 - 9 = 171, yaitu orang sehat yang dibiarkan.

Periksa: 15 + 5 + 9 + 171 = 200.

[[figure:confusion-matrix-and-rates/worked-matrix|Tes klinik tadi. Total baris adalah kebenaran sebenarnya: 20 sakit, 180 sehat. Total kolom adalah jawaban: 24 ya, 176 tidak.]]

Perhatikan dua jenis total. Jumlahkan sepanjang satu baris, dan kamu mendapatkan jumlah kasus dari jenis itu. Jumlahkan ke bawah satu kolom, dan kamu mendapatkan jumlah jawaban classifier dari jenis itu. Precision dan recall di bagian berikutnya berbeda tepat di sini: yang satu melihat ke bawah sebuah kolom, yang lain melintasi sebuah baris.

## Accuracy, precision, dan recall
*Tiga pertanyaan apa yang dapat kita ajukan pada keempat hitungan itu?*

Setiap metrik menjawab pertanyaan yang berbeda, sehingga masing-masing membagi dengan total yang berbeda.

| Metrik | Pertanyaannya | Rumus | Tes klinik |
|---|---|---|---|
| Accuracy | Seberapa sering jawabannya benar? | (TP + TN) / semua kasus | (15 + 171) / 200 = 0,93 |
| Precision | Ketika menjawab ya, seberapa sering itu benar? | TP / (TP + FP) | 15 / 24 = 0,625 |
| Recall | Dari semua positif sebenarnya, berapa yang berhasil ditemukan? | TP / (TP + FN) | 15 / 20 = 0,75 |

[[figure:confusion-matrix-and-rates/three-ratios|Matrix yang sama, tiga pertanyaan. Sel yang diarsir adalah pembilang tiap pecahan; sel bergaris putus ditambahkan ke sel yang diarsir untuk membentuk pembagi.]]

Precision melihat ke bawah **kolom ya**: dari 24 jawaban ya, 15 benar-benar positif. Recall melihat sepanjang **baris yang sebenarnya ya**: dari 20 orang sakit, 15 berhasil ditemukan. Di dunia kedokteran, recall disebut **sensitivity**.

> Awas: accuracy 93 persen terdengar sangat bagus, padahal 180 dari 200 orang itu sehat. Tes yang selalu menjawab tidak akan mendapat skor 180 / 200 = 0,90 tanpa menemukan seorang pun. Accuracy harus dibaca dengan membandingkannya ke baseline semacam itu, seperti di "Baselines and splits". Pelajaran tentang class imbalance membahas jebakan ini.

## F1: satu angka untuk keduanya
*Bagaimana precision dan recall dapat dinilai bersamaan?*

Precision dan recall saling tarik-menarik. Tes yang hanya menjawab ya ketika sangat yakin memiliki precision tinggi, tetapi melewatkan banyak kasus. Tes yang menjawab ya untuk hampir semua orang memiliki recall tinggi, tetapi menghasilkan banyak alarm palsu. Kita sering menginginkan satu angka yang tinggi hanya jika keduanya cukup baik.

**F1** adalah **rata-rata harmonik** dari precision dan recall (jenis rata-rata yang tetap dekat ke angka yang lebih kecil): 2 x precision x recall / (precision + recall).

Untuk tes klinik: 2 x 0,625 x 0,75 / (0,625 + 0,75) = 0,9375 / 1,375 = 0,68. Rata-rata biasa dari keduanya adalah 0,6875, jaraknya dekat, karena kedua nilainya berdekatan.

[[figure:confusion-matrix-and-rates/f1-vs-average|Tiga classifier. Ketika precision dan recall berjauhan, rata-rata biasa (penanda kosong) tetap tinggi, tetapi F1 (penanda terisi) turun ke arah sisi yang lebih lemah.]]

Ambil precision 0,9 dan recall 0,1: benar ketika menjawab, tetapi hanya menemukan satu dari sepuluh positif. Rata-rata biasanya 0,5; F1-nya 2 x 0,9 x 0,1 / 1,0 = 0,18, yang menggambarkan keadaan sebenarnya.

::: deeper F1 langsung dari hitungan
F1 = 2 x TP / (2 x TP + FP + FN). Untuk tes klinik, hasilnya 30 / (30 + 9 + 5) = 30 / 44 = 0,68, sama dengan sebelumnya. TN sama sekali tidak muncul: F1 mengabaikan true negative, sehingga negatif mudah dalam jumlah besar tidak dapat mengangkat nilainya.
:::

::: deeper Dua rasio untuk kelas negatif
Precision dan recall hanya melihat kasus yang dijawab ya oleh classifier dan kasus yang sebenarnya positif. Kelas negatif juga punya rasio sendiri. **Specificity** adalah TN / (TN + FP): dari orang sehat, berapa yang tidak ditandai. Di sini 171 / 180 = 0,95. **False-positive rate** adalah FP / (FP + TN) = 9 / 180 = 0,05, yaitu 1 dikurangi specificity. Pelajaran-pelajaran berikutnya membangun kurva dari rasio ini.
:::

## Memilih berdasarkan biaya kesalahan
*Metrik mana yang sebaiknya kamu pantau untuk masalahmu?*

Metrik yang tepat adalah metrik yang mengawasi kesalahan yang tidak sanggup kamu tanggung. Tentukan hal itu sebelum melihat skor apa pun.

| Tugas | Kesalahan yang mahal | Pantau |
|---|---|---|
| Skrining penyakit serius, dengan tes lanjutan yang murah | Melewatkan orang sakit (FN) | Recall |
| Menutup rekening bank secara otomatis | Menandai nasabah yang jujur (FP) | Precision |
| Mencari spam sambil berusaha agar sedikit email baik yang hilang | Keduanya penting | F1, atau kedua angka |

> Contoh hitungan: buat tes klinik lebih agresif, sehingga menjawab ya untuk 39 orang. Misalkan sekarang ia menangkap 18 dari 20 orang sakit. Maka TP = 18, FN = 2, FP = 39 - 18 = 21, dan TN = 180 - 21 = 159. Recall naik dari 0,75 menjadi 18 / 20 = 0,90, sedangkan precision turun dari 0,625 menjadi 18 / 39 = 0,46 dan accuracy turun dari 0,93 menjadi 177 / 200 = 0,885. Tes yang sama menjadi lebih baik dalam menangkap kasus dan lebih buruk dalam ketepatan, itulah sebabnya kamu harus menyatakan mana yang kamu butuhkan.

## Sebelum lab
*Apa yang kamu bawa ke bagian-bagian kursus berikutnya?*

Sekarang kamu memegang seluruh perangkat untuk satu kumpulan jawaban: empat hitungan, serta tiga rasio dan F1 yang dibangun darinya. Coba satu lagi dengan pensil. Sebuah tes pada 100 kasus menghasilkan TP = 10, FP = 5, FN = 10, dan TN = 75. Accuracy-nya 85 / 100 = 0,85, precision-nya 10 / 15 = 0,67, recall-nya 10 / 20 = 0,50, dan F1-nya 20 / 35 = 0,57. Perhatikan bahwa accuracy tampak jauh lebih baik daripada ketiga angka lainnya.

Pelajaran berikutnya melanjutkan dari sini. "Measuring a classifier" membahas di mana sebuah skor berubah menjadi jawaban ya, dan bagaimana menilai classifier di semua titik potong. "Class imbalance" menjelaskan mengapa positif yang langka membuat accuracy dan precision berperilaku seperti itu.

Setelah "Class imbalance", Imbalance lab memungkinkan kamu mengubah sendiri porsi kasus positif dan membandingkan baseline "selalu tidak" dengan classifier yang sudah dilatih, dan kamu akan membaca empat hitungan dan rasio yang sama saat semuanya bergerak.

::: remember
- Confusion matrix menghitung TP, FN, FP, dan TN. Bacalah sebuah nama dari kata terakhirnya (apa yang dijawab), sedangkan kata pertama menunjukkan apakah jawaban itu benar.
- Accuracy = (TP + TN) / semua, precision = TP / (TP + FP), recall = TP / (TP + FN). Precision melihat ke bawah kolom ya, recall melintasi baris yang sebenarnya ya.
- F1 hanya tinggi jika precision dan recall sama-sama tinggi. Pilih metrik yang mengawasi kesalahan yang paling merugikanmu.
:::
