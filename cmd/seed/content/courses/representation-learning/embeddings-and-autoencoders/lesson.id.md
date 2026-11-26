---
slug: embeddings-and-autoencoders
title: Embedding dan autoencoder
---
::: intro
- Jelaskan apa itu representasi, dan mengapa data yang sama dapat mudah atau sulit dipelajari bergantung pada representasinya.
- Baca sebuah embedding sebagai titik yang kedekatannya berarti kemiripan, memakai jarak dan cosine.
- Lakukan encode dan decode satu titik dengan tangan memakai autoencoder linear yang sangat kecil, lalu katakan apa yang diatur oleh ukuran bottleneck.

Sebelum mulai: baca "PCA and explained variance" dan "Reconstruction error and embeddings" di kursus Reduksi dimensi, serta "Distance and similarity" di kursus k-NN. Pelajaran ini memakai skor, rekonstruksi, dan kedua jenis jarak itu.
:::

## Vektor yang membuat tugas jadi mudah
*Apa itu representasi, dan mengapa pilihannya penting?*

Sebuah model tidak pernah melihat penguin, kalimat, atau foto. Ia hanya melihat vektor, yaitu daftar angka. **Representasi** adalah pilihan daftar angka mana yang mewakili setiap contoh. Satu contoh punya banyak pilihan: ukuran mentahnya, z-score dari ukuran itu, atau skor PCA-nya adalah tiga representasi dari penguin yang sama.

Pilihan ini dapat menentukan apakah tugasnya sulit. Bayangkan dua cincin titik di sekitar titik asal, seperti dataset Concentric rings di lab k-means: cincin dalam berjari-jari 2 dan cincin luar berjari-jari 4. Jika dijelaskan dengan (x, y), tidak ada garis lurus yang memisahkan keduanya, dan dua centroid k-means memotong kedua cincin. Jika dijelaskan dengan satu angka, yaitu jarak r dari titik asal, setiap titik di cincin dalam punya r = 2 dan setiap titik di cincin luar punya r = 4. Aturan "r di atas 3" memisahkan keduanya dengan sempurna.

> Gagasan kunci: titiknya tidak berubah, yang berubah hanya vektor yang menjelaskannya. **Representation learning** berarti menemukan vektor semacam itu dari data, bukan merancangnya dengan tangan seperti pada feature interaksi dan transformasi dari Level 1.

## Embedding: dekat berarti mirip
*Apa itu embedding?*

**Embedding** adalah representasi yang kedekatannya membawa makna: item yang mirip mendapat vektor yang berdekatan, dan item yang berbeda mendapat vektor yang berjauhan. Embedding biasanya dipelajari dari data, dan biasanya berupa daftar angka yang pendek, lebih pendek daripada input mentahnya.

Berikut embedding mainan dengan dua angka per item. Angkanya dikarang untuk pelajaran ini, bukan diambil dari model yang sudah dilatih.

| Item | Vektor | Jarak ke kucing | Cosine dengan kucing |
| --- | --- | --- | --- |
| kucing | (4, 3) | 0 | 1 |
| anak kucing | (5, 2) | 1,41 | 0,97 |
| anjing | (3, 5) | 2,24 | 0,93 |
| truk | (-4, -1) | 8,94 | -0,92 |

Jarak ke anak kucing adalah akar dari (4 - 5)² + (3 - 2)², yaitu 1,41. Cosine-nya adalah hasil kali titik dibagi kedua panjang vektor: (4 × 5 + 3 × 2) / (5 × 5,385) = 0,97. Kedua ukuran dari "Distance and similarity" sepakat di sini: item terdekat dengan kucing adalah anak kucing.

[[figure:embeddings-and-autoencoders/embedding-map|Empat item mainan pada sebuah bidang. Ruas putus-putus adalah jarak dari kucing, dengan cosine di sampingnya.]]

> Perhatian: sumbu sebuah embedding tidak punya nama. Hanya jarak dan arah yang bermakna. Nearest neighbor di dalam embedding adalah gagasan kursus k-NN, yang dimainkan di ruang hasil belajar.

## Autoencoder
*Bagaimana sebuah model dapat mempelajari representasi tanpa label?*

Beri model tugas menyalin inputnya sendiri, tetapi lewat lorong yang sempit. **Autoencoder** punya dua bagian. **Encoder** mengubah input x menjadi **code** z yang pendek. **Decoder** mengubah z kembali menjadi x̂, yaitu **rekonstruksi**. **Loss**-nya adalah galat rekonstruksi, biasanya kuadrat jarak antara x dan x̂, dirata-ratakan pada semua baris.

Bagian tengah yang sempit itu adalah **bottleneck**. Jika code punya lebih sedikit angka daripada input, model tidak dapat meneruskan semuanya. Ia harus menemukan kombinasi input mana yang membawa sebagian besar hal yang dibutuhkan decoder, yaitu redundansi yang sama yang dimanfaatkan PCA.

Targetnya adalah inputnya sendiri, sehingga tidak diperlukan label. Ini adalah unsupervised learning: data menyediakan jawabannya sendiri. Setelah pelatihan selesai, biasanya kamu menyimpan encoder dan membuang decoder. Code z-lah representasinya.

[[figure:embeddings-and-autoencoders/autoencoder-shape|Sebuah autoencoder: empat angka masuk, code berisi dua angka, empat angka keluar. Loss membandingkan output dengan input.]]

## Satu titik dengan tangan
*Dapatkah kamu melakukan encode dan decode satu titik dengan pensil?*

Buat autoencoder terkecil: dua angka masuk, satu angka sebagai code, dua angka keluar, dan tanpa fungsi aktivasi, sehingga modelnya linear. Pakai lima titik dari pelajaran PCA, yang rata-ratanya (3, 3). Encoder-nya adalah z = w1 (x1 - 3) + w2 (x2 - 3). Decoder-nya adalah x̂ = (3 + v1 z, 3 + v2 z). Ambil w = v = (0,707; 0,707).

> Contoh hitungan: titik (1, 2) menjadi (-2, -1) setelah dipusatkan. **Encode:** z = 0,707 × (-2) + 0,707 × (-1) = -2,12. **Decode:** x̂ = (3 + 0,707 × (-2,12), 3 + 0,707 × (-2,12)) = (1,5; 1,5). Vektor galatnya adalah (1 - 1,5; 2 - 1,5) = (-0,5; 0,5), sehingga galat kuadratnya 0,5.

| Titik | Dipusatkan | Code z | Hasil rekonstruksi | Galat kuadrat |
| --- | --- | --- | --- | --- |
| (1, 2) | (-2, -1) | -2,12 | (1,5; 1,5) | 0,5 |
| (2, 1) | (-1, -2) | -2,12 | (1,5; 1,5) | 0,5 |
| (3, 4) | (0, 1) | 0,71 | (3,5; 3,5) | 0,5 |
| (4, 3) | (1, 0) | 0,71 | (3,5; 3,5) | 0,5 |
| (5, 5) | (2, 2) | 2,83 | (5, 5) | 0 |

Galat kuadratnya berjumlah 2,0, sehingga loss, yaitu rata-ratanya, adalah 0,4. Satu angka mewakili dua angka, dan titik (5, 5) terletak pada diagonal sehingga kembali dengan tepat.

## Melatihnya
*Apa yang dilakukan pelatihan pada weight ini?*

Sekarang coba w = v = (1, 0): code-nya hanya kolom pertama. Titik (1, 2) mendapat z = -2 dan kembali sebagai (1, 3), galatnya 1. Pada kelima titik, loss-nya 2,0, lima kali lebih buruk daripada 0,4, karena code ini sama sekali mengabaikan kolom kedua.

Pelatihan mengubah weight dengan gradient descent pada loss. Dimulai dari dekat (1, 0), prosesnya berhenti pada loss 0,4 dengan weight sekitar (0,7; 0,7) di kedua sisi: diagonal.

[[figure:embeddings-and-autoencoders/hand-example|Kelima titik direkonstruksi lewat dua set weight. Ruas putus-putus adalah galatnya. Makin rendah makin baik: 0,4 pada diagonal, 2,0 pada sumbu pertama.]]

## Mengapa ini PCA
*Apakah diagonal itu kebetulan?*

Diagonal itu adalah PC1 dari kelima titik, dan hasil rekonstruksi (1,5; 1,5) sama dengan rekonstruksi yang ditemukan pelajaran PCA. Loss 0,4 adalah eigenvalue PC2, yaitu varians yang dibuang.

Ini bukan kebetulan. Dengan encoder dan decoder linear serta galat kuadrat, code k angka yang terbaik merentang subruang yang sama dengan k principal component pertama. Autoencoder linear menemukan kembali PCA.

::: deeper Hanya subruangnya yang tetap
Gandakan weight encoder dan separuhkan weight decoder, maka setiap output tetap sama, sehingga banyak pengaturan weight memberi loss 0,4 yang sama. Yang ditentukan pelatihan adalah garis tempat code berada dan hasil kali decoder dengan encoder, bukan setiap weight sendiri-sendiri. Untuk titik-titik ini, hasil kalinya adalah matriks dengan 0,5 di setiap selnya. Weight (0,7; 0,7) di atas adalah salah satu pilihan dengan loss sama yang kebetulan dicapai gradient descent.
:::

## Apa yang diatur bottleneck
*Apa yang ditentukan oleh ukuran code?*

Ukuran code adalah banyaknya nilai yang disimpan code. Ia mengatur sebuah tuas antara menyalin dan melupakan.

- **Code sebesar input.** Model dapat meneruskan setiap angka tanpa perubahan. Loss mencapai 0 dan code tidak mengajarkan apa-apa.
- **Code kecil.** Model harus menyimpan hal yang paling penting dan melepas sisanya. Sebagian loss tetap ada.

Pada autoencoder linear, harganya sama dengan harga pada PCA: galat pada ukuran code k adalah bagian dari sebaran kuadrat yang dipegang oleh komponen yang dibuang. Untuk empat kolom penguin yang sudah distandarisasi, code 1 angka kehilangan 31,2%, 2 angka kehilangan 11,8%, 3 angka kehilangan 2,7%, dan 4 angka kehilangan 0.

Autoencoder nonlinear, dengan fungsi aktivasi di dalamnya, dapat melengkung. Sembilan titik di sepanjang busur mengalahkan code lurus apa pun: garis terbaik kehilangan 19,2% dari sebaran kuadrat. Decoder yang mengikuti lengkungannya dapat melewati kesembilan titik itu, sehingga satu angka, yaitu posisi di sepanjang busur, sudah cukup secara prinsip.

[[figure:embeddings-and-autoencoders/bottleneck-size|Kiri: bagian yang hilang pada setiap ukuran code untuk empat kolom penguin. Kanan: sembilan titik pada busur, dengan code lurus terbaik dan decoder melengkung.]]

> Perhatian: bottleneck kecil bukan satu-satunya pengendali. Autoencoder yang sangat fleksibel dapat belajar menyalin bahkan lewat code yang sempit, sehingga pelatihan menambahkan batasan lain, misalnya noise pada input.

## Ke mana pelajaran ini berlanjut
*Apa yang kamu lakukan dengan representasi setelah memilikinya?*

Code adalah kumpulan kolom baru. Kamu dapat memberikannya kepada classifier sebagai ganti kolom mentah, mencarinya dengan nearest neighbor, atau menggambarnya. Pilih ukuran code seperti pengaturan lain: berdasarkan loss yang dapat kamu terima dan skor model yang memakainya.

Autoencoder mempelajari apa yang besar pada input, bukan apa yang dibutuhkan label. Seperti pada PCA, arah yang kecil dapat menjadi arah yang memisahkan kelasmu, dan rekonstruksi justru membuangnya.

Pelajaran berikutnya, "Transfer learning and self-supervision", menanyakan dari mana representasi yang baik berasal ketika label hanya sedikit. Lab representasi lalu menutup kursus dengan pertanyaan dari silabus: bagaimana representasi pretrained yang dibekukan dibandingkan dengan feature yang dipelajari dari dataset berlabel yang kecil?

::: remember
- Representasi adalah vektor yang mewakili sebuah contoh. Embedding adalah representasi hasil belajar yang kedekatannya berarti kemiripan.
- Autoencoder memeras input lewat bottleneck lalu merekonstruksinya. Inputnya sendiri adalah target, sehingga tidak butuh label, dan autoencoder linear menemukan subruang PCA.
- Ukuran code adalah tuas: sebesar input ia menyalin dan tidak belajar apa-apa, lebih kecil ia menyimpan hal yang penting dan kehilangan sisanya. Bagian nonlinear dapat melengkung di tempat garis tidak bisa.
:::
