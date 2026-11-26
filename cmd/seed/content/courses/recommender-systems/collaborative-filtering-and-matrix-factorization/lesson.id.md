---
slug: collaborative-filtering-and-matrix-factorization
title: Collaborative filtering dan matrix factorization
---
::: intro
- Baca sebuah user-item matrix, lalu jelaskan perbedaan rating eksplisit dan implicit feedback serta mengapa sel kosong bukan nol.
- Prediksi satu rating yang hilang dengan tangan memakai popularity baseline, lalu dengan collaborative filtering user-user dan item-item yang memakai cosine similarity.
- Prediksi rating yang sama dengan matrix factorization dua faktor, jelaskan bagaimana SGD atau ALS mempelajari faktornya dan apa yang dilakukan regularisasi, serta mengapa sparsity memengaruhi setiap pilihan.

Sebelum mulai: baca "Distance and similarity" di kursus k-NN, "L1 and L2: ridge and lasso" di kursus Regularisasi, "Gradient descent" dan "Stochastic and mini-batch updates" di kursus Optimisasi, "PCA and explained variance" di kursus Reduksi dimensi, serta "Embeddings and autoencoders" di kursus Representation learning. Pelajaran ini memakai cosine, penalti pada ukuran, langkah gradient, dan vektor yang kedekatannya berarti kemiripan.
:::

## User-item matrix
*Dari data seperti apa sebuah recommender memulai?*

Recommender menyarankan item yang belum pernah ditemui pengguna. Bahan bakunya adalah tabel dengan satu baris untuk setiap pengguna, satu kolom untuk setiap item, dan satu sel untuk setiap interaksi. Berikut contoh sederhana dengan lima pengguna dan lima film, dengan rating fiktif dari 1 sampai 5 bintang. Tanda "?" berarti pengguna belum menilai film itu.

| Pengguna | Orbit | Comet | Rocket | Harbor | Garden |
| --- | --- | --- | --- | --- | --- |
| Ana | 5 | 4 | ? | 1 | 2 |
| Budi | 5 | 5 | 5 | 2 | ? |
| Dewi | 4 | ? | 4 | 2 | 1 |
| Citra | 1 | 2 | 2 | 5 | 4 |
| Eko | 2 | 1 | 2 | 4 | 5 |

[[figure:collaborative-filtering-and-matrix-factorization/rating-matrix|Matriks contoh sebagai heat map. Warna lebih gelap berarti rating lebih tinggi, sel putus-putus adalah sel kosong, dan sel dengan garis tebal adalah sel yang akan diprediksi.]]

Ini adalah **rating eksplisit**: pengguna menyatakan sendiri preferensinya. Banyak data nyata berupa **implicit feedback**: pemutaran, klik, pembelian, menit menonton. Datanya melimpah tetapi ambigu, karena klik bisa sekadar rasa penasaran dan pembelian bisa berupa hadiah. Pada kedua jenis, sel kosong berarti tidak diketahui. Film yang tidak pernah diputar belum tentu tidak disukai, sebab mungkin film itu tidak pernah ditampilkan. Pelajaran ini memakai rating karena hitungannya paling mudah diikuti, dan metodenya berlaku juga untuk data lain.

> Gagasan kunci: tugasnya adalah mengisi sel yang kosong. Prediksi rating Ana untuk Rocket, lalu rekomendasikan film yang belum ditonton dengan prediksi tertinggi.

## Popularity baseline
*Apa yang dapat direkomendasikan tanpa mengenal penggunanya?*

Mulailah dari aturan paling sederhana: rekomendasikan apa yang disukai kebanyakan orang. Dengan rating, beri skor setiap film dengan rata-rata rating dari pengguna yang menilainya. Dengan implicit feedback, hitung berapa pengguna yang berinteraksi dengannya. Setiap pengguna mendapat daftar yang sama, sehingga inilah baseline yang harus dikalahkan metode yang lebih pintar.

> Contoh hitungan: Rocket dinilai oleh Budi (5), Dewi (4), Citra (2), dan Eko (2). Rata-ratanya (5 + 4 + 2 + 2) / 4 = 3,25. Rata-rata film lain adalah Orbit 3,4, Comet 3,0, Harbor 2,8, dan Garden 3,0. Baseline memprediksi 3,25 untuk Ana.

Kelemahannya terlihat dari matriks. Ana, Budi, dan Dewi memberi rating tinggi untuk Orbit, Comet, dan Rocket, sedangkan Citra dan Eko memberinya untuk Harbor dan Garden. Satu rata-rata per film mencampur dua selera yang berlawanan, dan tidak pernah melihat rating Ana sendiri. **Collaborative filtering** memakai pola itu: pengguna yang dulu sepakat diharapkan sepakat lagi pada item baru.

## Collaborative filtering user-user
*Bagaimana menemukan pengguna dengan selera yang sama?*

Bandingkan pengguna lewat vektor rating mereka, memakai cosine dari "Distance and similarity": hasil kali titik dua vektor dibagi hasil kali panjangnya. Pakai hanya film yang dinilai oleh kedua pengguna.

> Contoh hitungan: Ana dan Budi sama-sama menilai Orbit, Comet, dan Harbor. Ana memberi (5, 4, 1) dan Budi memberi (5, 5, 2). Hasil kali titiknya 5 × 5 + 4 × 5 + 1 × 2 = 47. Panjang kuadratnya 25 + 16 + 1 = 42 dan 25 + 25 + 4 = 54, sehingga cosine-nya 47 / √(42 × 54) = 0,99.

Langkah yang sama memberi Dewi 0,96, Eko 0,61, dan Citra 0,57. Untuk memprediksi rating Ana pada Rocket, ambil **nearest neighbor**-nya di antara pengguna yang menilai Rocket, lalu rata-ratakan rating mereka dengan bobot kemiripan. Dengan k = 2, tetangganya adalah Budi (5) dan Dewi (4): (0,99 × 5 + 0,96 × 4) / (0,99 + 0,96) = 4,51. Jika keempat pengguna dirata-ratakan, hasilnya 3,56, mendekati popularity baseline, karena Eko dan Citra tetap berpengaruh.

[[figure:collaborative-filtering-and-matrix-factorization/user-neighbours|Cosine similarity Ana terhadap setiap pengguna lain, dan tiga prediksi rating Ana untuk Rocket pada garis bilangan.]]

> Awas: nilai k berpengaruh. Dengan terlalu banyak neighbor, prediksi kembali ke rata-rata populer, dan dengan terlalu sedikit, satu pengguna yang janggal bisa menentukan hasilnya.

::: deeper Mengapa cosine pada rating mentah menguntungkan semua orang
Semua rating positif, sehingga bahkan selera yang berlawanan mendapat cosine jauh di atas 0: Citra bernilai 0,57 terhadap Ana. Perbaikan yang umum adalah mengurangi rata-rata rating setiap pengguna lebih dulu, sehingga sebuah rating terbaca sebagai "di atas atau di bawah yang biasa diberikan pengguna ini". Rata-ratanya adalah Ana 3, Budi 4,25, Dewi 2,75, Citra 2,8, dan Eko 2,8. Setelah dipusatkan, kemiripan Ana adalah 0,90 dengan Budi, 0,84 dengan Dewi, -0,79 dengan Eko, dan -0,99 dengan Citra. Kini selera yang berlawanan mendapat skor negatif, dan daftar neighbor dapat mengabaikannya.
:::

## Collaborative filtering item-item
*Apa yang berubah jika yang dibandingkan adalah film, bukan pengguna?*

Balikkan tabelnya (baris menjadi kolom). Dua film mirip jika pengguna yang sama menilainya dengan serupa, dan prediksi memakai rating pengguna itu sendiri untuk film yang mirip. Bandingkan kolom film, hanya dengan pengguna yang menilai kedua film.

> Contoh hitungan: Rocket dan Orbit sama-sama dinilai oleh Budi, Dewi, Citra, dan Eko. Rocket mendapat (5, 4, 2, 2) dan Orbit mendapat (5, 4, 1, 2). Hasil kali titiknya 25 + 16 + 2 + 4 = 47, panjang kuadratnya 49 dan 46, sehingga cosine-nya 47 / √(49 × 46) = 0,99. Comet juga bernilai 0,99, Harbor 0,73, dan Garden 0,69.

Ana menilai Orbit 5 dan Comet 4, dua film yang paling mirip dengan Rocket, sehingga prediksinya (0,99 × 5 + 0,99 × 4) / (0,99 + 0,99) = 4,50. Kedua metode neighbor menghasilkan prediksi sekitar 4,5, jauh di atas 3,25 milik baseline.

Item-item populer karena dua alasan praktis. Rating sebuah film biasanya berubah lebih lambat daripada selera seseorang, sehingga kemiripan dapat dihitung lebih dulu, dan alasan sebuah saran mudah ditampilkan: "karena kamu menilai Orbit 5".

## Matrix factorization
*Bagaimana dua vektor pendek dapat menggantikan seluruh tabel?*

Alih-alih menyimpan neighbor, pelajari satu vektor pendek untuk setiap pengguna dan setiap film, sehingga **hasil kali titik** vektor pengguna dengan vektor film memprediksi ratingnya. Angka-angka dalam vektor disebut **faktor**. Vektor berikut berasal dari satu kali pelatihan pada matriks contoh dengan 2 faktor, dibulatkan ke satu desimal.

- Pengguna: Ana (2,1; 0,5), Budi (2,2; 0,8), Dewi (1,7; 0,5), Citra (0,2; 2,1), Eko (0,2; 2,1).
- Film: Orbit (2,1; 0,5), Comet (1,9; 0,5), Rocket (2,0; 0,8), Harbor (0,2; 2,1), Garden (0,2; 2,1).

> Contoh hitungan: Ana · Rocket = 2,1 × 2,0 + 0,5 × 0,8 = 4,20 + 0,40 = 4,60. Sebagai pemeriksaan pada sel yang diketahui, Ana · Harbor = 2,1 × 0,2 + 0,5 × 2,1 = 0,42 + 1,05 = 1,47, sedangkan rating aslinya 1. Dewi belum pernah menilai Comet: 1,7 × 1,9 + 0,5 × 0,5 = 3,23 + 0,25 = 3,48.

Faktor 1 besar untuk Ana, Budi, Dewi dan film yang mereka sukai, sedangkan faktor 2 besar untuk Citra, Eko, Harbor, dan Garden. Tidak ada yang memberi tahu model; ia menemukan kedua kelompok itu dari rating saja.

[[figure:collaborative-filtering-and-matrix-factorization/two-factors|Kiri: vektor dua faktor, pengguna sebagai titik dan film sebagai cincin. Kanan: hasil kali titik Ana dengan setiap film. Garis hitam adalah rating aslinya.]]

::: deeper Factorization, PCA, dan embedding
Susun vektor pengguna sebagai baris matriks U dan vektor film sebagai baris matriks V. Prediksinya adalah tabel U × Vᵀ: tabel besar yang ditulis sebagai hasil kali dua tabel tipis, yaitu low-rank approximation, yang juga dibangun oleh PCA. Namun PCA memerlukan setiap sel terisi, sedangkan tabel rating sebagian besar kosong, sehingga factorization dilatih hanya pada sel yang diketahui, dan itulah alasan SGD dan ALS ada. Vektor-vektor itu adalah embedding dalam arti "Embeddings and autoencoders": vektor pengguna yang dekat dengan vektor film berarti kemungkinan sesuai, dan sumbunya tidak punya nama, sama seperti komponen PCA.
:::

## Mempelajari faktor
*Bagaimana model menemukan vektor yang sesuai dengan rating yang diketahui?*

Loss pelatihan adalah jumlah, hanya pada rating yang diketahui, dari (rating - pengguna · film)², ditambah penalti λ kali panjang kuadrat setiap vektor. Sel kosong tidak pernah masuk ke dalamnya. Ada dua cara standar untuk meminimalkannya:

**SGD** menelusuri rating yang diketahui satu per satu. Dengan galat e = rating - prediksi, ia menggeser kedua vektor: pengguna ← pengguna + η (e × film - λ × pengguna), dan film ← film + η (e × pengguna - λ × film). Ini adalah pembaruan stokastik dari "Stochastic and mini-batch updates".

> Contoh hitungan: kedua vektor mulai dari (1, 1) untuk rating 5 yang diketahui, dengan η = 0,1 dan λ = 0,1. Prediksinya 2, sehingga e = 3. Setiap angka menjadi 1 + 0,1 × (3 × 1 - 0,1 × 1) = 1,29, dan prediksi barunya 2 × 1,29 × 1,29 = 3,33, lebih dekat ke 5.

**ALS** (alternating least squares) menahan semua vektor film tetap, lalu menyelesaikan vektor setiap pengguna sebagai ridge regression kecil pada film yang dinilai pengguna itu. Setelah itu ia menahan pengguna tetap dan menyelesaikan setiap film, lalu mengulang. Vektor di atas berasal dari 200 putaran seperti itu dengan λ = 0,1.

Penaltinya adalah penalti L2 dari ridge, dan ia penting: pengguna dengan satu rating memberi satu persamaan untuk dua angka, sehingga banyak vektor sesuai dengan tepat, dan penalti memilih yang pendek. Pilih λ memakai validation set.

> Awas: pada 22 rating yang diketahui, hasil fit punya root mean squared error 0,40, dibandingkan 1,52 untuk popularity baseline. Keduanya diukur pada sel yang sudah dilihat model, dan untuk Rocket milik Ana ketiga metode memberi 3,25, sekitar 4,5, dan 4,6, yang tidak dapat diurutkan oleh contoh ini tanpa rating yang disembunyikan. Perbandingan yang adil menyembunyikan sebagian rating lebih dulu, seperti pada "Train, validation and test".

## Sparsity
*Mengapa matriks rating yang nyata begitu sulit ditangani?*

Matriks contoh punya 3 sel kosong dari 25 sel. Bayangkan sebuah layanan dengan 1.000 pengguna dan 1.000 film, dan setiap pengguna menilai 20 film. Itu berarti 20.000 sel terisi dari 1.000.000, atau 2%.

Bagi neighbor, sparsity berarti hampir tidak ada irisan. Jika dua pengguna masing-masing menilai 2% film yang dipilih acak, mereka rata-rata berbagi 1.000 × 0,02 × 0,02 = 0,4 film, sehingga cosine pada film yang sama-sama dinilai bertumpu pada kurang dari satu film. Pengguna nyata lebih sering beririsan pada film populer, tetapi tidak merata. Neighbor bagi pengguna dengan sedikit rating menjadi lemah.

Factorization biasanya lebih tahan, karena setiap rating melatih vektor yang dipakai bersama: 2 faktor memerlukan (1.000 + 1.000) × 2 = 4.000 angka, yang dipelajari dari 20.000 rating. Pengguna tanpa rating sama sekali tidak punya apa-apa pada kedua metode: tidak ada neighbor dan tidak ada yang melatih vektornya.

[[figure:collaborative-filtering-and-matrix-factorization/sparsity|Kiri: 30 sel terisi dari 1.500, yaitu 2%. Kanan: betapa sedikit film yang dinilai bersama oleh dua pengguna ketika bagian yang terisi mengecil, jika setiap pengguna memilih film secara acak.]]

## Ke mana setelah ini
*Apa yang belum dijawab oleh metode-metode ini?*

Semua yang dibahas sejauh ini memprediksi rating untuk sel pada tabel yang sudah ada. Recommender nyata punya tiga masalah lagi. Katalog bisa terlalu besar untuk menilai setiap item bagi setiap pengguna, sehingga harus memilih kandidat lebih dulu (retrieval). Ia harus menaruh beberapa yang terbaik di layar dengan urutan yang tepat (ranking). Dan ia harus melayani pengguna serta item tanpa riwayat (cold start).

Pelajaran berikutnya, "Retrieval, ranking and cold start", membahas ketiganya. Kursus lalu ditutup dengan recommender lab, tempat pertanyaan dari silabus adalah bagaimana recommender menangani cold start ketika riwayat interaksi sebagian pengguna dihapus.

::: remember
- User-item matrix sebagian besar kosong, dan sel kosong berarti tidak diketahui, bukan nol atau tidak suka. Popularitas memberi semua pengguna daftar yang sama, sedangkan collaborative filtering memakai siapa menyukai apa.
- Metode user-user dan item-item memprediksi rata-rata rating neighbor berbobot kemiripan, dengan cosine sebagai kemiripannya. Matrix factorization mempelajari satu vektor pendek per pengguna dan per item, yang hasil kali titiknya adalah prediksi, hanya dari sel yang diketahui, dengan SGD atau ALS dan penalti pada ukuran.
- Sparsity menentukan apa yang berhasil: neighbor memerlukan irisan, vektor berbagi apa yang mereka pelajari lintas rating, dan pengguna tanpa riwayat tidak punya keduanya.
:::
