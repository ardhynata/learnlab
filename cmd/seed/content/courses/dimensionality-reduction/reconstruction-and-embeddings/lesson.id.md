---
slug: reconstruction-and-embeddings
title: Galat rekonstruksi dan embedding
---
::: intro
- Bangun ulang data dari k komponen, ukur galat rekonstruksi (reconstruction error), dan tunjukkan bahwa nilainya sama dengan varians yang kamu buang.
- Pilih k berdasarkan galat yang dapat kamu terima, dan jelaskan apa yang tidak dapat dijanjikan PCA sebagai langkah preprocessing.
- Jelaskan apa yang dipertahankan dan apa yang hilang pada peta t-SNE dan UMAP, mengapa PCA hanya di-fit pada baris training, dan mengapa plot t-SNE tidak pernah menjadi input model.

Sebelum mulai: baca "PCA dan explained variance" di course ini. Pelajaran itu memberimu komponen, skor, dan explained variance ratio. Pelajaran ini bertanya: apa harga yang dibayar ketika komponen dibuang?
:::

## Turun, lalu naik lagi
*Apa artinya membangun ulang data dari komponen yang lebih sedikit?*

Pelajaran sebelumnya menjadikan PCA cara untuk membuang dimensi: gambarkan setiap titik dengan k skor pertamanya, lalu buang sisanya. Harganya mudah diukur kalau kamu berjalan mundur.

Sebanyak k skor milik sebuah titik sudah cukup untuk membangun titik yang baru. Mulailah dari rata-rata, lalu tambahkan setiap skor dikali arah komponennya. Itulah **rekonstruksi**. Hasilnya adalah titik pada sumbu yang dipertahankan yang paling dekat dengan titik asli. **Galat rekonstruksi** sebuah titik adalah jarak dari titik asli ke rekonstruksinya. Jika semua komponen dipertahankan, galatnya 0, karena kamu hanya memutar sumbu. Jika sebagian dibuang, galatnya positif.

Ambil lima titik dari pelajaran sebelumnya. Dengan hanya PC1, titik (1, 2) dibangun ulang di (1,5; 1,5), yang berjarak 0,71. Empat dari lima titik berjarak 0,71 dari posisi rekonstruksinya, sedangkan (5, 5) tepat berada di garis, sehingga galatnya 0. Kuadrat galatnya adalah 0,5, 0,5, 0,5, 0,5, dan 0. Jumlahnya 2,0, dan rata-ratanya 0,4, yaitu eigenvalue PC2. Bagian 3 menjelaskan sebabnya.

## Enam penguin dengan tangan
*Dapatkah kamu mengukur galatnya dengan pensil pada penguin nyata?*

Ambil enam penguin dalam bentuk (panjang sirip dalam mm, body mass dalam g): (181, 3750), (186, 3800), (195, 3250), (210, 4450), (211, 4500), dan (230, 5700). Standardisasi setiap kolom dengan rata-rata dan simpangan bakunya sendiri (dibagi n, seperti di pelajaran sebelumnya). Kolom sirip punya rata-rata 202,17 dan simpangan baku 16,71, sedangkan kolom massa punya rata-rata 4241,67 dan simpangan baku 780,71. Korelasinya r = 0,88, sehingga untuk dua kolom yang distandardisasi, PC1 adalah (0,707; 0,707).

Membangun ulang dari PC1 menaruh seekor penguin di rata-rata kedua z-score-nya pada kedua sumbu. Galatnya adalah sisanya: kuadrat galat sama dengan (z sirip - z massa)² / 2.

| Penguin | z sirip | z massa | Dipertahankan (kedua sumbu) | Kuadrat galat |
| --- | --- | --- | --- | --- |
| 181, 3750 | -1,27 | -0,63 | -0,95 | 0,203 |
| 186, 3800 | -0,97 | -0,57 | -0,77 | 0,081 |
| 195, 3250 | -0,43 | -1,27 | -0,85 | 0,354 |
| 210, 4450 | 0,47 | 0,27 | 0,37 | 0,020 |
| 211, 4500 | 0,53 | 0,33 | 0,43 | 0,020 |
| 230, 5700 | 1,67 | 1,87 | 1,77 | 0,020 |

Z-score di sini dibulatkan, sedangkan galatnya dihitung dari z-score yang tidak dibulatkan. Jumlah galatnya 0,698.

[[figure:reconstruction-and-embeddings/project-and-back|Keenam penguin sebagai z-score, masing-masing dijatuhkan ke komponen pertama. Garis putus-putus adalah galat rekonstruksinya.]]

> Contoh hitungan: penguin dengan sirip 195 mm dan massa 3250 g punya z-score (-0,43; -1,27). Posisinya yang dipertahankan adalah (-0,43 - 1,27) / 2 = -0,85 pada kedua sumbu. Vektor galatnya (-0,43 + 0,85; -1,27 + 0,85) = (0,42; -0,42), dan panjang kuadratnya 0,42² + 0,42² = 0,35.

::: deeper Kembali ke milimeter dan gram
Rekonstruksi terjadi dalam z-score, jadi batalkan standardisasinya di akhir: kalikan dengan simpangan baku dan tambahkan rata-rata. Posisi -0,85 menjadi 202,17 + (-0,85) × 16,71, sekitar 188 mm, padahal yang sebenarnya 195 mm, dan 4241,67 + (-0,85) × 780,71, sekitar 3578 g, padahal yang sebenarnya 3250 g. Penguin ini lebih ringan daripada yang ditunjukkan panjang siripnya, dan satu komponen tidak dapat menyatakannya.
:::

## Mengapa galat sama dengan varians yang dibuang
*Bagaimana hubungan galat rekonstruksi dengan explained variance?*

Memutar sumbu tidak mengubah panjang sebuah titik. Jadi kuadrat panjang titik yang sudah dipusatkan sama dengan jumlah kuadrat semua skornya. Rekonstruksi memakai k skor pertama. Sisanya, yaitu galat, terdiri dari skor-skor yang dibuang, sehingga kuadrat panjangnya adalah jumlah kuadrat skor yang dibuang.

Rata-ratakan itu untuk semua titik, dan hasilnya adalah varians komponen yang dibuang, yaitu jumlah eigenvalue-nya. Pada enam penguin, PC2 punya eigenvalue 1 - r = 0,116, dan enam penguin kali 0,116 adalah 0,698, total pada tabel. Total kuadrat panjangnya 6 + 6 = 12 (setiap kolom yang distandardisasi berjumlah 6), jadi galatnya 0,698 / 12 = 5,8% darinya. PC1 menjelaskan (1 + r) / 2 = 94,2%.

> Gagasan kunci: porsi kuadrat panjang yang hilang sama dengan 1 dikurangi explained variance ratio dari komponen yang kamu simpan. "Explained variance" dan "galat rekonstruksi" adalah fakta yang sama, dilihat dari dua ujung.

## Memilih k
*Berapa komponen yang sebaiknya disimpan?*

Galat rekonstruksi memberi explained variance ratio arti yang jelas: ia adalah anggaran. Untuk empat kolom penguin yang distandardisasi, tabel berikut menunjukkan harga setiap k.

| k | Explained variance | Galat rekonstruksi | Galat tipikal pada body mass |
| --- | --- | --- | --- |
| 1 | 68,8% | 31,2% | 332 g |
| 2 | 88,2% | 11,8% | 327 g |
| 3 | 97,3% | 2,7% | 153 g |
| 4 | 100% | 0% | 0 g |

Perpindahan dari k = 1 ke k = 2 memangkas total galat dengan besar, tetapi body mass nyaris tidak membaik (332 g menjadi 327 g), karena PC2 sebagian besar adalah bill depth dan bill length, bukan body mass.

[[figure:reconstruction-and-embeddings/error-by-k|Porsi kuadrat panjang yang hilang untuk setiap k, pada empat kolom penguin. Garis putus-putus adalah anggaran 5%, yang hanya dipenuhi k = 3 dan k = 4.]]

Pilih k terkecil yang galatnya dapat kamu terima untuk pekerjaan itu. Misalkan anggarannya 5%: maka k = 2 belum cukup dan k = 3 cukup. Untuk gambar dua dimensi yang cepat, k = 2 memang tidak terhindarkan, dan tabel memberi tahu apa yang disembunyikannya.

Totalnya dapat menyembunyikan satu kolom. Pada k = 2 total galatnya 11,8%, tetapi body mass hanya dibangun ulang dengan galat sekitar 327 g, padahal simpangan bakunya sekitar 802 g: kira-kira 17% varians kolom itu sendiri hilang. Jika sebuah model akan memakai hasilnya, perlakukan k sebagai pengaturan yang di-tuning dan pilih dengan skor validation, seperti di "Tuning dengan search".

## PCA sebagai preprocessing, dan batasnya
*Kapan PCA membantu sebuah model, dan kapan merugikan?*

Jika dipakai sebelum model, PCA mengubah banyak kolom yang berkorelasi menjadi beberapa skor yang tidak berkorelasi. Itu dapat memperkecil tabel yang besar, mempercepat training, dan menenangkan model yang terganggu oleh kolom redundan. Batasnya berasal dari cara kerjanya.

- **Ia unsupervised.** PCA melihat sebaran input dan tidak pernah melihat label. Arah dengan varians kecil dapat menjadi satu-satunya arah yang memisahkan kelas.
- **Ia linear.** PCA memutar dan meratakan. Ia tidak dapat meluruskan awan yang melengkung atau berbentuk cincin, dan ia mempertahankan arah lurus mana pun yang sebarannya paling besar.
- **Sumbunya adalah campuran.** Sebuah skor adalah campuran berbobot dari semua kolom, sehingga hasilnya lebih sulit dijelaskan daripada satu kolom asli.

[[figure:reconstruction-and-embeddings/pca-misses-signal|Dua kelas dengan masing-masing 60 titik. Komponen pertama memuat 85,3% varians dan tidak dapat memisahkan keduanya; komponen kedua memuat 14,7% dan memisahkannya sepenuhnya.]]

> Awas: explained variance yang tinggi menyatakan bahwa gambarnya setia pada input, bukan bahwa gambar itu berguna untuk label. Periksa tugasnya dengan skor validation.

## Fit hanya pada baris training
*Baris mana yang boleh ikut menentukan sumbu?*

Mem-fit PCA berarti menghitung tiga hal dari data: rata-rata kolom, skala jika kamu melakukan standardisasi, dan komponennya. Jika semuanya dihitung pada seluruh baris sebelum dibagi, baris yang ditahan ikut menentukan sumbu, dan skor test tidak lagi menjadi latihan pada data yang belum terlihat. Inilah leakage, kebiasaan yang sama seperti di "Pipeline dan leakage".

Urutan yang aman adalah membagi dulu, mem-fit scaler dan PCA pada baris training, lalu menerapkan rata-rata, skala, dan komponen yang sama pada baris validation atau test tanpa mem-fit ulang. Pada cross-validation, fit ulang semuanya di dalam setiap fold, dan pilih k di sana juga.

> Contoh hitungan: PCA di-fit pada lima titik training dari pelajaran sebelumnya, dengan rata-rata (3, 3) dan PC1 = (0,707; 0,707). Sebuah titik baru (4, 5) datang. Setelah dipusatkan dengan rata-rata training, ia menjadi (1, 2). Skor PC1-nya 3 × 0,707 = 2,12, dan rekonstruksinya (3, 3) + 2,12 × (0,707; 0,707) = (4,5; 4,5). Vektor galatnya (-0,5; 0,5), dengan kuadrat galat 0,5. Rata-rata milik titik baru itu sendiri tidak pernah dipakai.

## Apa yang digambar t-SNE dan UMAP
*Bagaimana metode ini membuat peta dari data berdimensi tinggi?*

PCA tidak dapat meratakan setiap bentuk, jadi orang juga memakai **t-SNE** dan **UMAP**. Keduanya nonlinear dan dibuat untuk satu tugas: menggambar peta 2-D dari banyak kolom. Keduanya bekerja dengan lingkungan sekitar (neighbourhood). Untuk setiap titik, mereka mencatat titik mana yang dekat dengannya, lalu menaruh titik-titik di 2-D sampai titik yang sama menjadi tetangga di sana. Pengaturan **perplexity** pada t-SNE kira-kira adalah berapa banyak tetangga yang diperhatikan setiap titik, dan pengaturan **n_neighbors** pada UMAP berperan serupa. Gambar di bawah adalah t-SNE, dan peringatannya berlaku untuk keduanya.

Berikut 342 penguin, keempat kolom, pada tiga peta. Pada ketiganya, Gentoo berdiri terpisah, dan Adelie serta Chinstrap berupa dua kelompok yang bersebelahan, dengan sedikit percampuran di perbatasan. Itulah janji neighbourhood yang bekerja: penguin yang dekat pada data tetap dekat di peta.

[[figure:reconstruction-and-embeddings/three-maps|Ke-342 penguin yang sama pada peta PCA dan dua peta t-SNE. Rasio jarak adalah jarak Gentoo ke Adelie dibagi jarak Chinstrap ke Adelie.]]

Gambar itu juga menunjukkan apa yang tidak dijanjikan sebuah peta. Pada datanya sendiri, jarak dari Gentoo ke Adelie adalah 1,85 kali jarak dari Chinstrap ke Adelie. Peta memberi 2,22, lalu 2,37 untuk t-SNE dengan perplexity 30, dan 1,24 dengan perplexity 5.

## Apa yang dipertahankan dan hilang pada peta
*Apa yang boleh kamu baca dari gambar t-SNE atau UMAP, dan apa yang tidak?*

**Boleh dibaca:** titik mana yang bertetangga, dan kelompok mana yang tampaknya ada. Itu pertanyaan awal yang baik untuk diperiksa dengan alat lain.

**Jangan dibaca:** jarak antarkelompok, ukuran sebuah kelompok, atau sumbunya. Rasio jarak di atas berubah dari 1,85 menjadi 1,24 hanya karena satu pengaturan diganti. Kelompok yang tergambar dua kali lebih lebar belum tentu dua kali lebih tersebar, dan celah yang tergambar besar belum tentu besar pada datanya. Seed dan pengaturan yang berbeda menggambar peta yang berbeda dari data yang sama.

> Awas: jangan pernah memberikan koordinat t-SNE ke sebuah model. Koordinat itu bergantung pada setiap baris, sehingga mem-fit-nya pada semua baris membocorkan baris test. Koordinatnya berubah menurut pengaturan dan seed, dan t-SNE yang umum tidak punya aturan untuk menaruh baris baru di peta. Pakai peta ini untuk melihat dan merumuskan pertanyaan, lalu uji jawabannya dengan kolom asli atau dengan PCA yang di-fit pada baris training.

PCA lab, pelajaran terakhir di course ini, memungkinkan kamu memutar awan titik, memproyeksikannya ke sumbu yang lebih sedikit, dan melihat galat rekonstruksi serta explained variance bergerak bersama. Di sana kamu dapat memeriksa sendiri kesamaan yang dibahas pelajaran ini.

::: remember
- Rekonstruksi membangun ulang setiap titik dari k skor pertamanya. Kuadrat galatnya adalah apa yang dimuat komponen yang dibuang, sehingga porsi kuadrat panjang yang hilang sama dengan 1 dikurangi explained variance yang kamu simpan.
- Pilih k terkecil yang galatnya dapat kamu terima, dan periksa terhadap tugasnya. PCA bersifat linear dan unsupervised, sehingga ia dapat membuang arah yang memisahkan label. Fit hanya pada baris training.
- t-SNE dan UMAP mempertahankan neighbourhood dan kehilangan jarak antarkelompok, ukuran kelompok, dan makna sumbu. Pakai untuk melihat, jangan pernah sebagai input model.
:::
