---
slug: l1-and-l2
title: "L1 dan L2: ridge dan lasso"
---
::: intro
- Tuliskan penalti ridge (L2) dan lasso (L1), lalu jelaskan apa yang dilakukan masing-masing pada sebuah koefisien.
- Jelaskan dengan satu gambar mengapa lasso dapat membuat koefisien tepat sama dengan nol, sedangkan ridge tidak.
- Jelaskan mengapa feature harus distandardisasi lebih dulu, bagaimana kedua penalti memperlakukan feature yang saling berkorelasi, dan bagaimana validation set menentukan kekuatan penalti.

Sebelum mulai: baca "Loss function", "Scaling dan encoding", "Underfitting dan overfitting", "Pipeline dan leakage", dan "Train, validation, dan test", serta pelajaran pertama kursus ini tentang bias, varians, dan shrinkage.
:::

## Harga untuk koefisien yang besar
*Apa yang ditambahkan ridge dan lasso pada loss yang sudah kamu kenal?*

Pelajaran pertama kursus ini menunjukkan bahwa menarik koefisien ke arah nol dapat menukar sedikit bias dengan varians yang lebih kecil. Pelajaran ini membahas dua cara yang paling umum untuk melakukan tarikan itu.

Keduanya berangkat dari loss yang kamu temui di "Loss function", yaitu mean squared error (MSE), lalu menambahkan **penalti** untuk koefisien yang besar:

**Loss = MSE + lambda × penalti**

**Lambda** adalah kekuatan penalti. Kamu sendiri yang menentukannya, sehingga lambda adalah hyperparameter. Dengan lambda = 0 kamu mendapatkan fit biasa, dan semakin besar lambda, semakin kuat model didorong menuju koefisien yang kecil. Kedua penalti mengukur kata "besar" dengan cara berbeda. **Ridge**, atau **L2**, menambahkan jumlah kuadrat koefisien. **Lasso**, atau **L1**, menambahkan jumlah nilai mutlak koefisien. Di kursus ini loss-nya adalah *rata-rata* squared error dan setiap feature distandardisasi, jadi lambda yang sama hanya bermakna di dalam pengaturan ini. Ridge dan lasso juga membutuhkan lambda yang berbeda untuk tingkat penyusutan yang sama: bandingkan lambda antara kedua penalti hanya sebagai perkiraan kasar, dan jangan menyalin nilai lambda dari tool lain.

> Contoh hitungan: prediksikan massa tubuh penguin dalam kg dari panjang paruh, kedalaman paruh, panjang flipper, dan jenis kelamin (1 untuk jantan), memakai 333 penguin yang keempat datanya lengkap. Setiap feature sudah distandardisasi, sehingga koefisien terbaca sebagai "kg per simpangan baku feature". Fit biasa menghasilkan -0,013, -0,169, 0,543, dan 0,271. Penalti ridge-nya 0,013² + 0,169² + 0,543² + 0,271² = 0,397. Penalti lasso-nya 0,013 + 0,169 + 0,543 + 0,271 = 0,996.

## Ridge: mengecilkan semuanya dengan mulus
*Apa yang dilakukan penalti L2 pada satu koefisien?*

Ridge menarik setiap koefisien ke arah nol, dan koefisien yang besar ditarik lebih kuat daripada yang kecil. Seiring lambda membesar, koefisien mengecil dengan mulus, tetapi hanya mendekati nol dan tidak pernah tepat berhenti di nol.

Kasus paling sederhana adalah satu feature yang sudah distandardisasi, atau beberapa feature yang tidak saling berkorelasi. Pada kasus ini ridge punya rumus: **koefisien baru = koefisien lama / (1 + lambda)**.

> Contoh hitungan: panjang flipper saja memprediksi massa tubuh dengan koefisien standar 0,6976 kg per simpangan baku (342 penguin). Itu setara 0,6976 / 14,04 = 0,0497 kg per mm, sekitar 50 g untuk setiap tambahan satu milimeter. Dengan lambda = 0,2 ridge menghasilkan 0,6976 / 1,2 = 0,581. Dengan lambda = 0,8 hasilnya 0,6976 / 1,8 = 0,388, dan dengan lambda = 1,5 hasilnya 0,6976 / 2,5 = 0,279.

Setiap koefisien dibagi dengan bilangan yang sama, sehingga semuanya menyusut dengan proporsi yang sama. Itulah sebabnya ridge tidak pernah mencapai nol: bilangan bukan nol yang dibagi 1,8 tetap bukan nol.

> Gagasan kunci: ridge mempertahankan setiap feature di dalam model, masing-masing dengan bobot yang lebih kecil.

## Lasso: mematikan feature
*Bagaimana penalti L1 dapat membuat koefisien tepat sama dengan nol?*

Untuk kasus sederhana yang sama, lasso juga punya rumus: **kurangi ukuran koefisien dengan lambda / 2, lalu berhenti di nol.** Angka 2 itu berasal dari cara MSE ditulis, sehingga tidak perlu dipikirkan. Koefisien yang lebih kecil dari lambda / 2 menjadi tepat 0, dan feature-nya keluar dari model.

> Contoh hitungan: untuk koefisien flipper 0,6976, lambda = 0,2 memberi 0,6976 - 0,1 = 0,598, lambda = 0,8 memberi 0,6976 - 0,4 = 0,298, dan lambda = 1,5 memberi 0,6976 - 0,75 yang berada di bawah nol, sehingga hasilnya 0. Koefisien mencapai nol pada lambda = 2 × 0,6976 = 1,395.

| Lambda | Ridge | Lasso |
| --- | --- | --- |
| 0 | 0,698 | 0,698 |
| 0,2 | 0,581 | 0,598 |
| 0,8 | 0,388 | 0,298 |
| 1,5 | 0,279 | 0 |

[[figure:l1-and-l2/shrink-rules|Apa yang dilakukan tiap penalti pada sebuah koefisien saat lambda = 0,8: ridge membaginya dengan 1,8, sedangkan lasso mengurangi 0,4 dan berhenti di nol. Koefisien 0,30 bertahan sebagai 0,17 di bawah ridge dan lenyap di bawah lasso.]]

Model lasso dengan beberapa nilai nol itu ringkas: ia menyebut feature mana saja yang dipertahankan. Karena itu lasso dipakai untuk **feature selection**, dan model dengan sedikit koefisien bukan nol mudah dibaca.

## Geometri dalam satu gambar
*Mengapa satu penalti mencapai nol dan yang lain tidak?*

Ada cara kedua untuk melihat penalti. Alih-alih membayar harga, berikan model sebuah anggaran: pilih koefisien dengan loss terkecil yang penaltinya masih berada dalam anggaran. Dengan dua koefisien, pasangan yang diperbolehkan mengisi sebuah daerah di sekitar nol. Untuk L2 daerahnya berupa lingkaran, karena penaltinya adalah jumlah kuadrat. Untuk L1 daerahnya berupa belah ketupat, karena penaltinya adalah jumlah nilai mutlak.

Loss sendiri punya bentuk tersendiri. Titik-titik dengan loss yang sama membentuk elips di sekitar fit tanpa penalti, dan fit itu berada di luar daerah tadi. Jawabannya adalah tempat elips terkecil mulai menyentuh daerah tersebut.

[[figure:l1-and-l2/geometry|Garis loss yang sama di sekitar fit tanpa penalti (titik hitam) dan daerah yang diperbolehkan oleh tiap penalti. Elips merah muda adalah yang pertama menyentuh daerah itu, dan cincin menandai jawabannya.]]

Lingkaran itu mulus, sehingga elips biasanya menyentuhnya di titik yang kedua koefisiennya bukan nol. Belah ketupat punya sudut di sumbu, dan elips yang datang dari luar sering kali mencapai sudut lebih dulu, tempat satu koefisien tepat bernilai 0. Dengan banyak feature, belah ketupat itu punya banyak sudut dan sisi semacam itu, sehingga beberapa koefisien dapat nol sekaligus.

> Awas: sudut itu kemungkinan besar, bukan pasti. Jika fit tanpa penalti berada di tempat lain, elips dapat menyentuh sisi belah ketupat lebih dulu.

## Menyebar atau memusat
*Cara membagi anggaran mana yang disukai tiap penalti?*

Lingkaran dan belah ketupat berbeda karena kedua penalti mengenakan harga yang berbeda untuk bobot yang sama. Bandingkan keduanya pada dua koefisien yang jumlahnya sama.

> Contoh hitungan: belanjakan total 1 untuk dua koefisien. Menaruh semuanya pada satu koefisien, (1, 0), berharga 1 di L1 dan 1 di L2. Membaginya, (0,5, 0,5), berharga 0,5 + 0,5 = 1 di L1 tetapi hanya 0,5² + 0,5² = 0,5 di L2. L2 lebih suka menyebarkan bobot, sedangkan L1 tidak keberatan memusatkannya.

## Standardisasi dulu
*Mengapa feature harus berada pada skala yang sama sebelum dipenalti?*

Penalti menjumlahkan koefisien, padahal besar koefisien bergantung pada satuan feature-nya. Ukur panjang flipper dalam meter, bukan milimeter, dan koefisiennya menjadi 1000 kali lebih besar, sementara prediksi model tetap sama. Penalti tidak tahu hal itu dan membebankan harga yang jauh lebih mahal pada feature dalam meter.

> Contoh hitungan: ridge pada panjang flipper saja, dengan lambda = 0,05 dan tanpa standardisasi, dalam tiga satuan. Baris untuk meter hanya mempertahankan 0,4% dari kemiringannya.

| Flipper dalam | Kemiringan tanpa penalti | Kemiringan dengan lambda = 0,05 | Bagian yang bertahan | Kenaikan untuk +10 mm |
| --- | --- | --- | --- | --- |
| mm | 0,0497 | 0,0497 | 99,97% | 0,497 kg |
| cm | 0,497 | 0,485 | 97,5% | 0,485 kg |
| m | 49,7 | 0,195 | 0,4% | 0,002 kg |

Feature, data, dan lambda yang sama menghasilkan tiga model yang berbeda. Solusinya adalah **standardisasi**: kurangi setiap feature dengan rata-ratanya dan bagi dengan simpangan bakunya, sehingga setiap feature punya rata-rata 0 dan simpangan baku 1, dan penalti memperlakukan semuanya sama. Hitung rata-rata dan simpangan baku itu hanya dari baris training, lalu pakai ulang pada baris validation, seperti di "Pipeline dan leakage".

::: deeper Mengapa intercept tidak dipenalti
Intercept adalah prediksi model ketika semua feature yang sudah distandardisasi bernilai 0, yaitu rata-rata massa tubuh. Jika intercept ikut dikecilkan, setiap prediksi akan tertarik ke 0 kg, dan itu tidak masuk akal. Cara yang lazim adalah memusatkan target, seperti pada gambar-gambar di sini, sehingga intercept sama dengan rata-rata dan hanya koefisien feature yang terkena penalti.
:::

## Feature yang berkorelasi
*Bagaimana kedua penalti membagi bobot antara feature yang bergerak bersama?*

Ambil dua salinan identik dari satu feature yang layak mendapat total bobot 0,8. Ridge membaginya rata, 0,4 dan 0,4, karena pembagian rata lebih murah dalam kuadrat. Lasso melihat total yang sama berapa pun cara 0,8 itu dibagi, sehingga ia tidak punya preferensi. Ia cenderung mempertahankan satu salinan, dan salinan mana yang dipilih dapat berubah hanya karena data sedikit berbeda.

Feature nyata jarang yang identik, tetapi pada data penguin panjang flipper dan panjang paruh saling berkorelasi, dengan r = 0,65 (korelasi dari "Outlier dan korelasi": 0 berarti tidak ada hubungan garis lurus dan 1 berarti hubungan sempurna). Berikut keempat koefisien dari bagian pertama, dengan penalti yang dinaikkan:

| Pengaturan | Panjang paruh | Kedalaman paruh | Panjang flipper | Jantan |
| --- | --- | --- | --- | --- |
| Tanpa penalti | -0,013 | -0,169 | 0,543 | 0,271 |
| Ridge, lambda = 0,2 | 0,070 | -0,176 | 0,413 | 0,231 |
| Ridge, lambda = 1 | 0,113 | -0,129 | 0,259 | 0,142 |
| Lasso, lambda = 0,2 | 0 | 0 | 0,578 | 0,094 |
| Lasso, lambda = 1 | 0 | 0 | 0,202 | 0 |

[[figure:l1-and-l2/paths|Keempat koefisien penguin saat lambda membesar. Ridge mengecilkannya dengan mulus. Lasso membawanya ke nol tepat satu per satu, dan cincin menandai tempatnya.]]

Saat ridge memotong koefisien flipper, tetangganya yang berkorelasi, panjang paruh, mengambil alih sebagian tugas dan naik dari -0,013 menjadi 0,113. Ridge mengecilkan daftar secara keseluruhan, bukan tiap angka: jumlah kuadratnya turun dari 0,397 ke 0,260 lalu 0,117. Lasso menyingkirkan panjang paruh pada lambda sekitar 0,01, kedalaman paruh sekitar 0,15, jenis kelamin sekitar 0,44, dan panjang flipper terakhir, sekitar 1,40.

Jika kamu ingin perpaduan keduanya, ada **elastic net**, yang menambahkan kedua penalti sekaligus. Di sini kamu cukup mengetahui namanya.

## Memilih lambda dengan validation
*Bagaimana memilih kekuatan penalti tanpa menipu diri sendiri?*

Galat training tidak dapat dipakai untuk memilih lambda: nilainya paling rendah pada lambda = 0, sehingga ia akan selalu menjawab bahwa tidak perlu penalti. Pilihlah lambda pada **validation set**. Untuk setiap lambda dalam sebuah daftar, fit pada baris training, ukur galat pada baris validation, lalu simpan lambda dengan galat validation terendah. Baru setelah itu periksa model akhir satu kali saja pada test set, seperti di "Train, validation, dan test".

> Contoh hitungan: agar model punya ruang untuk overfitting, latih hanya pada 20 penguin acak dengan 14 kolom (keempat feature, kuadratnya, dan hasil kali antarfeature), lalu validasi pada 200 penguin lain. Galat berupa mean squared error dalam kg². Selalu menebak rata-rata training memberi galat validation 0,648.

| Lambda | Ridge training | Ridge validation | Lasso validation | Kolom lasso yang dipertahankan |
| --- | --- | --- | --- | --- |
| 0,0001 | 0,043 | 0,211 | 0,279 | 11 |
| 0,001 | 0,061 | 0,172 | 0,169 | 8 |
| 0,01 | 0,076 | 0,154 | 0,151 | 4 |
| 0,03 | 0,080 | 0,150 | 0,150 | 4 |
| 0,1 | 0,083 | 0,153 | 0,153 | 3 |
| 1 | 0,098 | 0,188 | 0,451 | 1 |

[[figure:l1-and-l2/choose-lambda|Galat training dan galat validation ridge saat lambda membesar pada skala log. Galat training hanya naik, sedangkan galat validation turun lalu naik lagi, dengan titik terendah pada lambda = 0,03.]]

## Membaca kurvanya
*Apa yang dikatakan tabel dan gambar tentang penalti yang terlalu kecil dan terlalu besar?*

Galat training naik di setiap langkah, sedangkan galat validation turun lalu naik lagi: penalti yang terlalu kecil menyebabkan overfitting, dan yang terlalu besar menyebabkan underfitting. Kedua model sepakat dari lambda = 0,01 sampai 0,1, dan keduanya terbaik pada lambda = 0,03, tempat lasso hanya mempertahankan 4 dari 14 kolom. Di kedua ujung keduanya berbeda: lasso lebih buruk daripada ridge pada lambda = 0,0001 (0,279 dibanding 0,211) dan lagi pada lambda = 1 (0,451 dibanding 0,188). Pembagian data yang lain akan menggeser angka-angka ini, maka anggaplah titik terendah itu sebagai daerah yang baik, bukan jawaban yang pasti.

::: deeper Bagaimana lasso diselesaikan
Dengan beberapa feature yang berkorelasi, tidak ada rumus seperti pada ridge. Cara yang umum adalah memperbarui satu koefisien pada satu waktu dengan menerapkan "kurangi lalu berhenti di nol" padanya sementara yang lain dibiarkan tetap, lalu mengulanginya sampai tidak ada yang bergerak. Kurva lasso dalam pelajaran ini dihitung dengan cara tersebut. Pada penalti yang sangat kecil, diperlukan ratusan ribu putaran sebelum tidak ada yang bergerak, sehingga solver harus dijalankan sampai benar-benar konvergen.
:::

## Sebelum lab
*Apa yang akan kamu lakukan dengan ini di lab Regularization?*

Di lab Regularization, pelajaran berikutnya, kamu menaikkan penalti sendiri dan mengikuti perubahan koefisien, galat training, dan galat validation. Buat prediksi sebelum menggeser apa pun. Pada lambda berapa galat training paling rendah? Apakah galat validation turun lalu naik lagi? Koefisien mana yang pertama mencapai nol saat lambda membesar pada lasso, dan apa yang dilakukan ridge dan lasso pada dua feature yang bergerak bersama? Periksa setiap tebakan dengan lab.

::: remember
- Ridge (L2) menambahkan jumlah kuadrat koefisien dan mengecilkan semuanya dengan mulus. Lasso (L1) menambahkan jumlah nilai mutlak dan dapat membuat sebagian koefisien tepat nol, sehingga memilih feature.
- Geometrinya: lingkaran tidak punya sudut, belah ketupat punya sudut di sumbu. Standardisasi feature lebih dulu, atau penalti akan menghukum feature berdasarkan satuannya.
- Feature berkorelasi: ridge membagi bobot di antaranya, lasso cenderung mempertahankan satu. Pilih lambda dengan galat validation, lalu uji satu kali.
:::
