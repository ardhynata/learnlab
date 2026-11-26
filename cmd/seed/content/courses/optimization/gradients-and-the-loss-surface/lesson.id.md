---
slug: gradients-and-the-loss-surface
title: Gradient dan permukaan loss
---
::: intro
- Baca turunan sebagai slope dari loss, yang ditemukan dengan menggeser satu dial (slope atau intercept garis) sedikit, dan turunan parsial sebagai slope itu saat dial yang lain ditahan.
- Hitung dengan tangan gradient dari mean squared error untuk sebuah garis pada tiga titik.
- Jelaskan mengapa gradient menunjuk ke arah menanjak, lalu ambil satu langkah update ke arah yang berlawanan.

Sebelum mulai: baca "Loss function" dan "Mencari garis yang pas".
:::

## Skor belum berarti arah
*Mengapa mengetahui loss belum cukup untuk memperbaiki sebuah garis?*

Pada "Mencari garis yang pas", fitting berarti berjalan ke tempat terendah di sebuah peta. Setiap pasangan slope dan intercept adalah satu tempat, dan loss dari "Loss function" adalah tinggi tempat itu. Waktu itu kamu berperan sebagai komputer dan menggeser garisnya sendiri.

Program tidak dapat melihat peta. Ia hanya bisa menilai garis yang ia coba, dan jumlah garis yang mungkin terlalu banyak untuk dicoba. Ia membutuhkan arah: apakah slope harus naik atau turun, bagaimana dengan intercept, dan seberapa besar perubahannya? Alat yang menjawab ini adalah **gradient**, dan pelajaran ini membangunnya dari dasar.

> Gagasan kunci: loss memberi tahu seberapa bagus sebuah garis. Gradient memberi tahu ke arah mana garis itu harus diubah supaya lebih baik.

## Tiga titik dan satu garis
*Dari mana kita mulai?*

Angkanya dibuat kecil. Datanya adalah tiga titik pertama dari "Loss function": (1, 2), (2, 3), dan (3, 5). Titik keempat dibuang supaya hitungannya singkat, sehingga loss di sini berbeda dari loss empat titik di pelajaran itu. Garis yang akan diperbaiki adalah garis A dari pelajaran tersebut, y = 1x + 1, dengan slope 1 dan intercept 1. Residualnya (nilai sebenarnya dikurangi prediksi) adalah 0, 0, dan +1, sehingga mean squared error (MSE)-nya (0 + 0 + 1) / 3 = 0,33.

## Turunan adalah slope yang dapat diukur
*Apa yang terjadi pada loss ketika satu dial digeser sedikit?*

Tahan intercept di 1, lalu naikkan slope sedikit. Bagi perubahan loss dengan besar geseran itu.

| Geseran | Slope baru | MSE baru | Perubahan MSE / geseran |
|---|---|---|---|
| +0,5 | 1,5 | 0,5 | +0,333 |
| +0,1 | 1,1 | 0,18 | -1,533 |
| +0,01 | 1,01 | 0,3138 | -1,953 |
| +0,001 | 1,001 | 0,3313 | -1,995 |

Baris pertama adalah peringatan. Geseran 0,5 melompati dasar mangkuk, sehingga loss malah naik dan rasionya tidak mengatakan apa-apa tentang permukaan di slope 1. Begitu gesernya sangat kecil, rasionya mendekati -2.

Angka itu adalah **turunan** (*derivative*) MSE terhadap slope pada garis ini: slope kurva loss di satu titik, dalam satuan loss per satu satuan slope. Tandanya menunjukkan bahwa menaikkan slope menurunkan loss di sini. Besarnya menunjukkan seberapa curam.

[[figure:gradients-and-the-loss-surface/one-dial|MSE terhadap slope, dengan intercept ditahan di 1. Pada slope 1 kurva turun dengan slope -2: sepanjang garis singgung putus-putus, loss turun 2 untuk setiap kenaikan slope 1. Kurvanya sendiri melengkung naik lagi, dan titik terendahnya ada di slope 1,21.]]

## Turunan parsial: satu dial pada satu waktu
*Adakah rumus, supaya kita tidak perlu menggeser dial?*

Ada. Ambil satu titik dengan residual r = y - (slope × x + intercept). Menaikkan slope sebesar δ yang sangat kecil menurunkan r sebesar x × δ, sehingga kuadrat selisihnya, r², berubah sebesar -2xr per satuan geseran (bagian δ² dapat diabaikan). Menaikkan intercept mengubah r² sebesar -2r per satuan.

MSE merata-ratakan n kuadrat selisih itu, maka jumlahkan semua titik lalu bagi dengan n:

`slope: -(2/n) × (jumlah x × r)`

`intercept: -(2/n) × (jumlah r)`

Masing-masing adalah **turunan parsial** (*partial derivative*): turunan terhadap satu dial, dengan semua dial lain ditahan. Dalam matematika, keduanya ditulis ∂MSE/∂slope dan ∂MSE/∂intercept.

Coba rumus pertama pada garis A. Residualnya 0, 0, dan +1 di x = 1, 2, dan 3, sehingga jumlah x × r adalah 3. Hasilnya -(2/3) × 3 = -2, angka yang didekati oleh geseran-geseran tadi.

::: deeper Dari mana tepatnya -2 berasal
Dengan intercept ditahan di 1, MSE ketiga titik itu adalah kurva biasa terhadap slope: MSE(slope) = (14/3) × slope² - (34/3) × slope + 7. Turunannya adalah (28/3) × slope - 34/3. Di slope 1 nilainya -6/3 = -2.

Turunan ini bernilai nol di slope 34/28 = 1,21, tempat MSE bernilai 0,12. Itulah dasar yang dilompati geseran +0,5: 1 + 0,5 = 1,5 sudah melewati 1,21.
:::

## Permukaan loss di atas slope dan intercept
*Seperti apa loss ketika kedua dial bergerak?*

Letakkan slope pada satu sumbu dan intercept pada sumbu lainnya. Setiap titik adalah sebuah garis, dan tinggi di atasnya adalah MSE garis itu. Inilah **permukaan loss** (*loss surface*) dari "Mencari garis yang pas". Jika dilihat dari atas, permukaan ini digambar dengan **garis kontur**: setiap garis kontur menghubungkan garis-garis yang MSE-nya sama, dan di tempat garis kontur berdempetan, permukaannya curam.

[[figure:gradients-and-the-loss-surface/loss-surface|MSE ketiga titik di setiap kombinasi slope dan intercept. Lingkaran adalah garis A (MSE 0,33) dan belah ketupat adalah titik terendah, dengan slope 1,5 dan intercept 0,33 (MSE 0,06).]]

Permukaannya berupa lembah panjang yang sempit, membentang dari kiri atas ke kanan bawah. Slope dan intercept saling tarik-menarik: ketiga nilai x positif, sehingga slope yang lebih curam mengangkat garis di sisi kanan dan intercept harus turun untuk mengimbanginya. Inilah yang dikatakan "Mencari garis yang pas": nilai terbaik satu dial bergantung pada dial yang lain.

Di dasar lembah, permukaannya datar, sehingga kedua turunan parsial bernilai 0. Periksa di slope 1,5 dan intercept 1/3 (0,33): residualnya +0,17, -0,33, dan +0,17, yang jumlahnya 0, dan jumlah x × r juga 0. Dengan 0,33 yang dibulatkan, jumlahnya 0,01. Kedua syarat itulah asal rumus least squares.

## Menghitung gradient dengan tangan
*Bagaimana mendapatkan kedua turunan parsial untuk garis A?*

Garis A adalah y = 1x + 1. Daftarkan tiap titik, prediksinya, residualnya, dan x × r:

| x | y | Prediksi | Residual r | x × r |
|---|---|---|---|---|
| 1 | 2 | 2 | 0 | 0 |
| 2 | 3 | 3 | 0 | 0 |
| 3 | 5 | 4 | +1 | 3 |
| Jumlah | | | 1 | 3 |

Masukkan jumlah-jumlah itu ke kedua rumus, dengan n = 3:

> Contoh hitungan: turunan parsial untuk slope adalah -(2/3) × 3 = -2. Untuk intercept, -(2/3) × 1 = -2/3, sekitar -0,67.

**Gradient** adalah kumpulan turunan parsial ini dalam satu daftar, satu entri untuk tiap dial: (-2; -0,67). Menggeser intercept sebesar +0,001 mengonfirmasi entri kedua: MSE turun dari 0,3333 ke 0,3327, rasio sekitar -0,67.

Perhatikan tandanya. Kedua entri negatif, sehingga menaikkan salah satu dial menurunkan loss. Ini sesuai dengan gambarnya: satu-satunya titik yang meleset adalah (3, 5), yang berada di atas garis, dan menaikkan garis di sana membantu. Entri slope lebih besar karena titik itu berada di x = 3, tempat perubahan slope menggeser garis paling jauh.

## Gradient menunjuk ke arah menanjak
*Bagaimana kita tahu mana arah naik dan mana arah turun?*

Gradient menunjuk ke arah loss naik paling cepat, dan panjangnya, di sini akar dari 4 + 0,44 atau sekitar 2,11, menunjukkan seberapa cepat. Karena kedua entrinya negatif, arah naik berarti menurunkan kedua dial. Arah turun adalah kebalikannya: menaikkan keduanya.

Buktikan dengan gerakan nyata. Ambil langkah sebesar 0,15 kali gradient dari garis A, ke kedua arah:

| Gerakan | Slope | Intercept | MSE |
|---|---|---|---|
| Awal (garis A) | 1 | 1 | 0,33 |
| Searah gradient | 0,7 | 0,9 | 1,55 |
| Berlawanan dengan gradient | 1,3 | 1,1 | 0,22 |

Garis y = 0,7x + 0,9 memprediksi 1,6; 2,3; dan 3, sehingga residualnya +0,4; +0,7; dan +2, dan MSE-nya (0,16 + 0,49 + 4) / 3 = 1,55. Melangkah searah gradient membuat loss memburuk, dan melangkah berlawanan membuatnya membaik.

[[figure:gradients-and-the-loss-surface/gradient-uphill|Tampilan diperbesar di sekitar garis A. Panah merah muda adalah 0,15 kali gradient, menunjuk ke arah menanjak sampai MSE 1,55. Panah teal dengan panjang sama menuju arah sebaliknya, sampai MSE 0,22.]]

> Awas: gradient bukan penunjuk jalan ke titik terendah. Titik terendah di sini ada di slope 1,5 dan intercept 0,33. Langkah menurun justru menaikkan intercept dari 1 ke 1,1, karena langkah itu mengikuti permukaan yang paling curam tepat di tempat ini.

## Satu langkah update
*Bagaimana mengubah gradient menjadi garis yang lebih baik?*

Kurangkan gradient, yang diskalakan dengan angka kecil pilihanmu:

`nilai baru = nilai lama - rate × entri gradient`

Pengali itu disebut **learning rate**. Lab di pelajaran berikutnya memungkinkanmu mengubahnya, dan "Learning rate and trouble" mempelajari pengaruhnya. Di sini nilainya 0,15.

> Contoh hitungan: slope baru = 1 - 0,15 × (-2) = 1,3. Intercept baru = 1 - 0,15 × (-2/3) = 1,1. Garis barunya y = 1,3x + 1,1. Garis ini memprediksi 2,4; 3,7; dan 5,0, sehingga residualnya -0,4; -0,7; dan 0, dan MSE-nya (0,16 + 0,49 + 0) / 3 = 0,22.

Loss turun dari 0,33 ke 0,22 dalam satu langkah.

[[figure:gradients-and-the-loss-surface/update-step|Ketiga titik terhadap garis A dan terhadap garis setelah satu langkah. Selisih besar di (3, 5) sudah hilang, dan dua selisih yang lebih kecil muncul di bawah garis.]]

Kemiringan permukaan berbeda di garis yang baru. Residualnya menghasilkan gradient (1,2; 0,73), lebih pendek daripada sebelumnya, karena itu kamu harus mengukur lagi. Langkah yang lebih besar akan salah: rate 0,3 mendarat di slope 1,6 dan intercept 1,2, tempat MSE bernilai 1,2, lebih buruk daripada awalnya. Gradient hanya menggambarkan permukaan di tempat kamu berdiri.

## Dari satu langkah menjadi perjalanan
*Apa yang dilakukan dengan gradient setelah ini?*

Kamu sudah menjalankan seluruh mekanismenya satu kali: beri skor garisnya, hitung gradient, lalu melangkah berlawanan arah. Ulangi dari garis yang baru, dan lagi, dan garisnya akan menetap di dekat dasar lembah. Loop langkah seperti ini disebut **gradient descent**, dan itulah topik pelajaran berikutnya.

Pelajaran "Gradient descent" punya lab tempat kamu mengulang langkah itu sendiri, langkah demi langkah, pada tiga permukaan: mangkuk bulat, jurang sempit, dan dua lembah. Gagasan yang kamu temui di sini berlaku sama persis: gradient menunjuk ke arah menanjak, dan langkahnya menuju arah sebaliknya.

Sebelum membukanya, tebak dua hal. Saat langkah-langkah mendekati dasar lembah, apakah gradient makin panjang atau makin pendek? Dan apakah langkah-langkah pertama langsung menuju titik terendah? Langkah di pelajaran ini tidak begitu.

::: remember
- Turunan adalah slope loss di satu titik, ditemukan dengan menggeser satu dial; turunan parsial menahan dial yang lain.
- Untuk MSE, gradient adalah -(2/n) × (jumlah x × r) untuk slope dan -(2/n) × (jumlah r) untuk intercept. Gradient menunjuk ke arah menanjak, sehingga update melangkah berlawanan dengannya.
- Satu langkah dengan rate 0,15 membawa garis A dari MSE 0,33 ke 0,22; gradient bersifat lokal, maka ukur lagi setelah setiap langkah.
:::
