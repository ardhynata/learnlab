---
slug: soft-margins-and-kernels
title: Soft margin dan kernel
---
::: intro
- Jelaskan bagaimana soft margin mengizinkan sebagian titik melanggar aturan, lalu prediksikan apa yang dilakukan C yang besar atau kecil terhadap jalan.
- Baca kernel RBF sebagai skor kemiripan dan jelaskan pengaruh gamma pada decision boundary.
- Lakukan tuning C dan gamma dengan cross-validation pada feature yang sudah di-scale, lalu bedakan overfitting dari underfitting lewat skornya.

Sebelum mulai: baca "Margins and support vectors" di kursus ini, "Scaling and encoding", serta "Cross-validation and stratification" dan "Tuning with search" dari kursus validasi.
:::

## Saat jalan yang ketat tidak berhasil
*Apa yang salah ketika jalan terlebar bertemu data nyata?*

"Margins and support vectors" memilih garis dengan jalan kosong terlebar: setiap titik berada di luar jalan dan di sisinya sendiri. Itulah **hard margin**, yaitu tidak ada titik yang boleh masuk ke jalan. Cara ini berhasil pada data yang bersih, tetapi pada data nyata gagal dengan dua cara.

Pertama, kelas-kelasnya bisa saling tumpang tindih. Kalau begitu, tidak ada garis yang menyisakan jalan kosong, sehingga tidak ada yang dapat dimaksimalkan. Kedua, satu titik saja dapat menyempitkan jalan.

Ambil tujuh titik pada garis bilangan: kelas -1 di 1, 2, 3 dan 4,4, serta kelas +1 di 4,6, 6 dan 7. Tanpa 4,4 dan 4,6, titik terdekat adalah 3 dan 6, sehingga lebar jalannya 3. Dengan kedua titik itu, potongan yang memisahkan harus jatuh di antara 4,4 dan 4,6, dan lebar jalannya hanya 0,2. Dua titik yang berjarak 0,2 memangkas jalan dari 3 menjadi 0,2.

Bila salah satu dari keduanya adalah salah ketik atau baris yang salah label, seluruh boundary ikut membengkok mengitarinya. **Soft margin** mengizinkan beberapa titik masuk ke jalan, bahkan melewati garis, tetapi dengan harga tertentu.

## Slack dan harga C
*Bagaimana soft margin memberi harga pada pelanggaran aturan?*

**Skor** sebuah titik adalah `w·x + b`, seperti sebelumnya: 0 di boundary, +1 di salah satu tepi jalan, dan -1 di tepi lainnya. Titik berkelas y (+1 atau -1) mematuhi aturan bila `y × skor` paling sedikit 1. **Slack**-nya menyatakan seberapa jauh ia melanggar: slack = max(0, 1 − y × skor).

| Kelas | Skor | y × skor | Slack | Posisi titik |
| --- | --- | --- | --- | --- |
| +1 | 1,5 | 1,5 | 0 | di luar jalan, di sisinya sendiri |
| +1 | 0,4 | 0,4 | 0,6 | di dalam jalan, di sisinya sendiri |
| +1 | -0,5 | -0,5 | 1,5 | di sisi garis yang salah |

Slack di atas 1 berarti titik itu salah diklasifikasikan.

Sekarang training meminimalkan satu angka: **½|w|² + C × (jumlah semua slack)**. Bagian pertama kecil bila jalan lebar, karena lebarnya 2 / |w|. Bagian kedua kecil bila hanya sedikit titik yang melanggar aturan. **C** adalah harga untuk satu satuan slack.

> Gagasan kunci: C yang besar membuat pelanggaran mahal, sehingga jalan menjadi ketat dan sempit. C yang kecil membuat pelanggaran murah, sehingga jalan menjadi lebar dan longgar. Seperti ridge di "L1 and L2: ridge and lasso", C menimbang penalti pada bobot terhadap kecocokan dengan data. Perhatikan bahwa C bekerja berlawanan dengan kekuatan ridge: C yang besar melemahkan tarikan menuju jalan yang lebar.

## Daftar harga untuk dua garis
*Garis mana yang menang pada tiap harga?*

Pakai tujuh titik dari bagian pertama (kelas -1 di 1, 2, 3 dan 4,4, kelas +1 di 4,6, 6 dan 7) dan bandingkan dua garis, keduanya dengan potongan di 4,5, sehingga skornya w × (x − 4,5).

- **Garis sempit, w = 10.** Lebar jalannya 2 / 10 = 0,2. Titik di 4,4 berskor -1 dan titik di 4,6 berskor +1, sehingga setiap titik berada di tepi jalan atau di luarnya. Total slack-nya 0 dan biayanya ½ × 10² = 50.
- **Garis lebar, w = 1.** Lebar jalannya 2 / 1 = 2. Titik di 4,4 dan 4,6 berskor -0,1 dan +0,1, sehingga masing-masing punya slack 1 − 0,1 = 0,9, sedangkan titik lainnya berskor melampaui ±1. Total slack-nya 1,8 dan biayanya ½ × 1² + 1,8 × C = 0,5 + 1,8C.

| C | Garis lebar | Garis sempit | Biaya lebih rendah |
| --- | --- | --- | --- |
| 0,1 | 0,68 | 50 | lebar |
| 1 | 2,30 | 50 | lebar |
| 10 | 18,50 | 50 | lebar |
| 100 | 180,50 | 50 | sempit |

> Contoh hitungan: kedua biaya sama ketika 0,5 + 1,8C = 50, sehingga C = 49,5 / 1,8 = 27,5. Di bawah harga itu jalan lebar menang, di atasnya jalan sempit menang. Training sebenarnya mencari di antara semua garis, bukan hanya dua ini, tetapi pertimbangannya sama.

## C pada sampel yang berantakan
*Apa yang dilakukan C pada boundary yang nyata?*

Berikut sampel buatan: 20 titik di tiap kelas, ditambah satu titik liar berkelas -1 yang mendarat di tengah kelompok +1. SVM linear yang sama dilatih dua kali, dengan C = 0,1 dan dengan C = 100.

[[figure:soft-margins-and-kernels/c-dial|41 titik yang sama dengan C kecil dan C besar. Garis tegas: boundary. Garis putus-putus: tepi jalan. Titik berlingkar: support vector.]]

Dengan C = 0,1, jalannya selebar 3,33 dan punya 8 support vector. Titik liar itu berada di sisi yang salah, sehingga 40 dari 41 titik benar. Dengan C = 100, garis miring agar titik liar berada di sisinya sendiri. Ke-41 titik benar, tetapi jalannya hanya selebar 0,74, kurang dari seperempat lebar sebelumnya, dan 3 titik menahannya, salah satunya titik liar itu.

Support vector adalah titik yang berada di tepi jalan, di dalam jalan, atau di sisi garis yang salah. Jalan yang lebar memuat lebih banyak titik, sehingga C yang kecil menghasilkan lebih banyak support vector.

> Awas: C yang besar tidak berarti model yang lebih baik. Artinya, kamu memercayai setiap titik training, termasuk yang keliru. Coba C pada skala pangkat 10, misalnya 0,1, 1, 10 dan 100, karena C bekerja lewat rasio: dari 100 ke 101 nyaris tidak berpengaruh, sedangkan dari 10 ke 100 jalan berubah.

## Kemiripan, bukan koordinat
*Bagaimana metode yang dibangun dari garis lurus dapat menggambar kurva?*

Pada garis bilangan, garis lurus hanyalah satu potongan. Ambil kelas -1 di 0, 1, 7 dan 8, serta kelas +1 di 3, 4 dan 5. Tidak ada satu potongan pun yang memisahkannya: potongan terbaik hanya benar pada 5 dari 7 titik.

**Kernel** adalah aturan yang menerima dua titik dan mengembalikan satu angka, yaitu **kemiripan** keduanya: tinggi untuk titik yang mirip dan rendah untuk titik yang berjauhan. SVM tidak pernah memerlukan koordinat sebuah titik secara tersendiri. Ia hanya memerlukan kemiripan ini. Prediksi adalah vote berbobot dari para support vector:

skor = b + jumlah (bobot × kelas × kemiripan dengan titik baru) untuk semua support vector

Setiap bobot, yang disebut alpha, ditemukan lewat training dan bernilai 0 untuk setiap titik yang bukan support vector. Ini mirip dengan vote neighbor di "How k-NN decides", hanya saja yang memberi vote adalah support vector saja dan tiap vote punya bobot hasil belajar.

Pada **kernel linear**, kemiripan adalah dot product, sehingga vote itu menyusut menjadi garis lurus. Kemiripan yang berbeda menghasilkan garis di ruang berkoordinat tersembunyi, yang tampak melengkung di ruang koordinatmu sendiri. **Kernel trick** berarti SVM tidak pernah membangun koordinat tersembunyi itu: ia hanya menghitung kemiripan antarpasangan titik.

## Kernel RBF dan gamma
*Seberapa lokal vote sebuah titik?*

**Kernel RBF** (radial basis function) mendefinisikan kemiripan sebagai **K = e^(−γ × d²)**, dengan d adalah jarak antara kedua titik. Pada d = 0 nilainya 1, dan menurun mendekati 0 seiring bertambahnya d. **Gamma** (γ) menentukan seberapa cepat penurunannya. Untuk d = 1, γ = 0,25 memberi 0,78, γ = 1 memberi 0,37 dan γ = 4 memberi 0,02. Kemiripan turun menjadi 0,37 pada d = 1 / √γ, yaitu 2, 1 dan 0,5. Sebut 1 / √γ itu **jangkauan** sebuah titik: gamma menentukan seberapa lokal votenya.

[[figure:soft-margins-and-kernels/rbf-similarity|Kiri: kemiripan terhadap jarak untuk tiga nilai gamma. Kanan: skor sebuah SVM RBF yang dilatih pada tujuh titik di bagian kernel, dengan support vector yang dilingkari.]]

Contoh hitungan: tujuh titik di bagian kernel (kelas -1 di 0, 1, 7 dan 8; kelas +1 di 3, 4 dan 5), dilatih dengan γ = 0,25 dan C = 10, menyisakan empat support vector, di 1 dan 7 (kelas -1) serta di 3 dan 5 (kelas +1). Bobotnya sekitar 1,25, dan b = -0,23. Untuk titik baru di x = 4:

| Support vector | Kelas | Bobot | Kemiripan | Bobot × kelas × kemiripan |
| --- | --- | --- | --- | --- |
| 1 | -1 | 1,253 | 0,1054 | -0,132 |
| 3 | +1 | 1,253 | 0,7788 | +0,976 |
| 5 | +1 | 1,254 | 0,7788 | +0,976 |
| 7 | -1 | 1,254 | 0,1054 | -0,132 |

> Contoh hitungan: jumlahnya 1,688, dan setelah ditambah b skornya 1,458, sehingga x = 4 berkelas +1. Skor di x = 2 adalah -0,10, sehingga berkelas -1. Skor melebihi 0 hanya di antara 2,09 dan 5,91, sesuatu yang tidak akan pernah dicapai oleh potongan lurus.

## Dua pengaturan
*Bagaimana C dan gamma bersama-sama menentukan overfitting dan underfitting?*

Gamma mengatur seberapa melengkung boundary-nya, sedangkan C mengatur seberapa mahal setiap kesalahan training. Gambar menunjukkan gamma pada dua cincin berderau, masing-masing 30 titik, dengan C = 1. Skor held-out memakai 400 titik baru dari cincin yang sama.

[[figure:soft-margins-and-kernels/gamma-panels|Tiga SVM RBF pada dua cincin berderau yang sama. Area berwarna menunjukkan kelas mana yang menang di mana; warna di tepi jauh plot hanyalah tebakan model jauh dari data.]]

Pada γ = 0,01, jangkauannya 1 / √0,01 = 10, lebih lebar daripada kedua cincin. Bahkan dua titik yang berjarak 6 punya kemiripan e^(−0,01 × 36) = 0,70, sehingga semua titik tampak sama dan model memberi semua titik pada cincin kelas yang sama (kelas -1), sehingga skornya 50% pada training dan 50% pada held-out. Itulah **underfitting**. Pada γ = 30, jangkauannya 1 / √30, sekitar 0,18, sehingga tiap titik hanya menguasai petak kecilnya sendiri. Ke-60 titik menjadi support vector, skor training 100% dan skor held-out hanya 76%. Itulah **overfitting**.

| Pengaturan | Nilai kecil | Nilai besar |
| --- | --- | --- |
| C | jalan lebar dan longgar, dapat underfit | jalan sempit dan ketat, dapat overfit |
| gamma | boundary halus dan hampir lurus, dapat underfit | benjolan kecil yang menghafal, dapat overfit |

## Scale feature dulu
*Mengapa feature harus di-scale sebelum memakai SVM?*

Margin dan kernel RBF sama-sama mengukur jarak biasa, seperti k-NN dan k-means di "Distance and similarity". Feature yang angkanya besar akan menenggelamkan yang lain.

Ambil dua penguin Adelie dari tabel bawaan. Penguin pertama punya panjang paruh 39,1 mm, kedalaman paruh 18,7 mm, sirip 181 mm, dan massa tubuh 3750 g. Penguin kedua punya 39,5, 17,4, 186 dan 3800. Selisihnya 0,4, -1,3, 5 dan 50, dan jarak kuadratnya 0,16 + 1,69 + 25 + 2500 = 2526,85. Massa tubuh menyumbang 98,9% darinya. Dengan γ = 1, kemiripannya e^(−2526,85), yang untuk semua keperluan praktis sama dengan 0: tidak ada dua penguin yang tampak mirip.

Lakukan standardisasi dulu, memakai rata-rata dan sebaran dari 267 penguin untuk tuning. Selisihnya menjadi 0,07, -0,65, 0,36 dan 0,06, jarak kuadratnya 0,56, dan kemiripan pada γ = 1 adalah e^(−0,56) = 0,57. Sekarang massa tubuh hanya 0,7% dari jarak.

> Awas: fit scaler hanya pada baris training, dan di dalam cross-validation pada bagian training tiap fold. Men-scale semua baris lebih dulu membocorkan baris test, seperti di "Pipelines and leakage".

## Tuning C dan gamma
*Bagaimana memilih kedua pengaturan itu?*

C dan gamma adalah hyperparameter, sehingga "Tuning with search" berlaku. Grid ini memakai tugas penguin dari pelajaran itu: jantan atau betina, pada 267 penguin untuk tuning, dengan stratified five-fold cross-validation. Kedua pengaturan naik dengan faktor 10. Itu berarti 4 × 4 = 16 konfigurasi dan 80 fit.

[[figure:soft-margins-and-kernels/tuning-grid|Jumlah penguin yang benar dari 267 dalam cross-validation, untuk tiap C dan gamma, dengan feature yang di-scale dan dengan feature mentah.]]

Dengan feature yang di-scale, sel terbaiknya C = 1, γ = 1, dengan 242 dari 267 benar, yaitu 90,6%. Sepuluh dari 16 sel mendapat skor 236 atau lebih, sehingga ada dataran yang luas dan pemenang pastinya tidak terlalu penting. Pojok C = 0,1, γ = 0,01 mendapat 145 (54,3%), yaitu underfitting. Pada γ = 10, skor turun ke 223-225 begitu C bernilai 1 atau lebih, yaitu overfitting; dengan C = 0,1 vote terlalu lemah dan skornya 135, yaitu sekadar menebak. Dengan feature mentah, yang terbaik adalah 190 (71,2%).

Setelah refit pada C = 1 dan γ = 1 dengan seluruh 267 penguin, model mendapat 56 dari 66 benar pada test set yang terkunci, yaitu 84,8%. Angka itu lebih rendah daripada 90,6% karena skor terbaik dari 16 itu terlalu optimistis, dan 66 penguin adalah test yang kecil. Satu penguin bernilai 1,5 poin.

## Ke lab
*Apa yang kamu lakukan berikutnya?*

Di lab SVM kamu menggeser sendiri sebuah support vector, melihat jalan berubah, dan membandingkan boundary linear dan RBF pada data buatan dan data nyata.

::: deeper Slack adalah hinge loss
Suku max(0, 1 − y × skor) disebut **hinge loss**. Titik yang berada di luar tepi jalannya dikenai biaya tepat 0. Log loss di "Log loss and fitting" berbeda: nilainya positif untuk setiap titik, bahkan yang posisinya sudah baik. Itulah sebabnya hanya support vector, yaitu titik di tepi jalan, di dalamnya, atau di sisi garis yang salah, yang membentuk sebuah SVM.
:::

::: remember
- Soft margin mengizinkan titik melanggar aturan dengan harga tertentu. Slack adalah seberapa jauh sebuah titik melanggar, dan C adalah harganya: C besar menghasilkan jalan yang sempit dan ketat, C kecil menghasilkan jalan yang lebar dan longgar.
- Kernel mengukur kemiripan antara dua titik. Kernel RBF adalah e^(−γ × d²), sehingga gamma yang besar membuat vote tiap titik bersifat lokal dan dapat overfit, sedangkan gamma yang kecil membuat boundary halus dan dapat underfit.
- Scale feature, lalu tuning C dan gamma pada pangkat 10 dengan cross-validation, dan biarkan test set terkunci sampai akhir.
:::
