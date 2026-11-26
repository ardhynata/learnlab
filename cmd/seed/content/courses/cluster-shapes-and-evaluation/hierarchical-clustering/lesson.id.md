---
slug: hierarchical-clustering
title: Hierarchical clustering
---
::: intro
- Jalankan agglomerative clustering secara manual pada lima titik, dengan menggabungkan dua cluster terdekat di setiap langkah.
- Bandingkan linkage single, complete, average, dan Ward, lalu jelaskan bentuk cluster yang disukai masing-masing.
- Baca sebuah dendrogram dan potong untuk mendapatkan k cluster.

Sebelum mulai: baca "Apa itu clustering" dan "k-means, langkah demi langkah".
:::

## Menggabungkan, bukan mencari pusat
*Bagaimana jika kamu tidak perlu menentukan k sebelum mulai?*

k-means diawali dengan sebuah keputusan, yaitu jumlah cluster k, lalu menggeser centroid ke sana kemari. **Agglomerative hierarchical clustering** berangkat dari titik yang berbeda: setiap titik adalah satu cluster tersendiri. Setelah itu, ia mengulang satu aturan saja:

1. Cari dua cluster yang paling dekat satu sama lain.
2. Gabungkan keduanya menjadi satu cluster.

Proses berhenti ketika satu cluster memuat semua titik. Untuk n titik, dibutuhkan n - 1 penggabungan. Tidak ada unsur acak, sehingga data dan pengaturan yang sama selalu memberi hasil yang sama.

Jawabannya bukan satu pengelompokan, melainkan seluruh **riwayat penggabungan**. Jumlah cluster kamu pilih belakangan, dengan menentukan sejauh mana riwayat itu ditelusuri mundur. ("Agglomerative" berarti "mengumpulkan menjadi satu". Ada pula versi top-down yang dimulai dari satu cluster besar lalu membaginya, tetapi pelajaran ini hanya memakai versi bottom-up.)

Masih ada satu bagian yang belum jelas. Ketika sebuah cluster sudah berisi beberapa titik, apa arti "terdekat"? Bagian berikut menjawabnya.

## Linkage: jarak antara dua cluster
*Seberapa jauh dua kelompok titik berada?*

Jarak antara dua titik sudah kamu kenal. Jarak antara dua *kelompok* membutuhkan sebuah aturan, yang disebut **linkage**. Ada empat yang umum:

- **Single:** jarak pasangan terdekat, satu titik dari masing-masing kelompok.
- **Complete:** jarak pasangan terjauh.
- **Average:** rata-rata jarak dari semua pasangan.
- **Ward:** gabungkan pasangan cluster yang paling sedikit menambah total jarak kuadrat titik-titik ke pusat cluster mereka sendiri. Besaran ini sama dengan yang disebut inertia dalam k-means.

[[figure:hierarchical-clustering/linkage-distances|Dua kelompok yang sama, masing-masing tiga titik, diukur dengan empat cara. Garis tebal adalah pasangan yang dipakai tiap aturan; Ward memakai kedua pusat kelompok.]]

> Gagasan kunci: linkage adalah pilihan yang kamu buat, dan linkage yang berbeda dapat menggabungkan titik yang sama dalam urutan yang berbeda. Jarak untuk sepasang titik selalu berupa jarak biasa yang sama; yang berubah hanyalah cara merangkum sebuah kelompok.

Single dan complete adalah dua ujung dari gagasan yang sama: yang satu melihat anggota terdekat, yang lain melihat anggota terjauh. Average berada di antara keduanya.

## Lima titik secara manual
*Dapatkah kamu menjalankan penggabungan ini dengan pensil?*

Ambil lima titik pada sebuah garis: A = 0, B = 1, C = 3, D = 7, dan E = 12. Jarak antara setiap pasangan adalah:

| | A | B | C | D | E |
|---|---|---|---|---|---|
| A | 0 | 1 | 3 | 7 | 12 |
| B | 1 | 0 | 2 | 6 | 11 |
| C | 3 | 2 | 0 | 4 | 9 |
| D | 7 | 6 | 4 | 0 | 5 |
| E | 12 | 11 | 9 | 5 | 0 |

> Contoh hitungan: single linkage. (1) Nilai terkecil adalah A-B = 1, sehingga keduanya digabungkan. (2) Jarak dari {A, B} ke C adalah yang lebih kecil dari 3 dan 2, yaitu 2. Nilai itu mengalahkan C-D = 4 dan D-E = 5, sehingga C bergabung pada 2. (3) Jarak {A, B, C} ke D adalah yang terkecil dari 7, 6, dan 4, yaitu 4, lebih kecil daripada D-E = 5, sehingga D bergabung pada 4. (4) Jarak {A, B, C, D} ke E adalah yang terkecil dari 12, 11, 9, dan 5, yaitu 5. Penggabungan terjadi pada 1, 2, 4, 5.

Complete linkage memakai nilai terbesar. Jarak {A, B} ke C adalah yang lebih besar dari 3 dan 2, yaitu 3. Kemudian jarak {A, B, C} ke D adalah 7, sedangkan D-E hanya 5, sehingga D dan E bergabung pada 5. Penggabungan terakhir memakai yang terbesar dari enam jarak, yaitu 12. Penggabungan terjadi pada 1, 3, 5, 12.

[[figure:hierarchical-clustering/merge-sequence|Cluster setelah setiap penggabungan. Dua penggabungan pertama sama (pada jarak yang berbeda, 2 dan 3); mulai penggabungan ketiga, kelompoknya berbeda.]]

## Dendrogram
*Bagaimana cara menggambar seluruh riwayat penggabungan?*

Sebuah **dendrogram** (diagram pohon) menggambar seluruh riwayat dalam satu halaman. Titik-titik berada di sepanjang bagian bawah. Setiap penggabungan berupa batang horizontal pada ketinggian yang sama dengan jarak saat penggabungan itu terjadi, dengan garis vertikal turun ke masing-masing dari dua cluster yang digabungkan.

[[figure:hierarchical-clustering/dendrograms|Dendrogram untuk lima titik tadi. Kiri: single linkage membentuk tangga. Kanan: complete linkage lebih dulu menggabungkan A, B, C dan D, E, lalu melakukan satu penggabungan akhir yang panjang.]]

Kedua pohon itu memperlihatkan perbedaan pada tabel tadi. Single linkage menambahkan satu titik demi satu ke cluster yang sama, sehingga terbentuk tangga. Complete linkage membangun dua kelompok kecil dan baru menggabungkannya di akhir, pada 12.

> Awas: bacalah dendrogram dari ketinggiannya, bukan dari jarak mendatar. Dua titik (disebut daun, yaitu titik-titik di bagian bawah pohon) dikatakan dekat jika batang yang pertama kali menggabungkan keduanya rendah. Urutan kiri ke kanan hanya mencegah garis saling bersilangan, dan titik yang digambar di samping titik lain belum tentu merupakan tetangga terdekatnya.

## Memotong pohon
*Bagaimana mendapatkan k cluster dari sebuah dendrogram?*

Untuk mendapatkan cluster, tarik garis horizontal melintasi pohon, lalu lihat cabang yang dipotongnya. Setiap cabang adalah satu cluster, yang terdiri dari titik-titik di bawahnya. Inilah yang disebut **memotong** (*cutting*) dendrogram.

Pada pohon complete linkage, yang penggabungannya terjadi pada 1, 3, 5, dan 12:

- Potong pada 0,5: tidak ada penggabungan di bawah garis, sehingga ada 5 cluster.
- Potong pada 4: penggabungan pada 1 dan 3 berada di bawahnya, menghasilkan 3 cluster: {A, B, C}, {D}, dan {E}.
- Potong pada 8: penggabungan pada 1, 3, dan 5 berada di bawahnya, menghasilkan 2 cluster: {A, B, C} dan {D, E}.
- Potong di atas 12: 1 cluster.

Setiap penggabungan di bawah garis mengurangi satu cluster, sehingga jumlah cluster adalah n dikurangi banyaknya penggabungan di bawah potongan.

Petunjuk yang berguna untuk menentukan tempat memotong adalah **rentang terpanjang tanpa penggabungan**. Pada pohon complete, tidak ada yang terjadi antara ketinggian 5 dan 12, sehingga memotong di mana saja dalam celah itu menghasilkan dua cluster, yang paling alami untuk data ini. Pohon single linkage memiliki batang pada 1, 2, 4, 5 dan tidak ada celah panjang, sehingga tidak memberi petunjuk seperti itu. Memotongnya pada 4,5 akan menghasilkan {A, B, C, D} dan {E}.

> Awas: celah panjang hanyalah petunjuk, bukan bukti. Untuk membandingkan potongan dengan angka, kamu akan memakai silhouette score di pelajaran berikutnya.

## Bentuk yang disukai tiap linkage
*Linkage mana yang sesuai untuk bentuk apa?*

Setiap aturan memiliki kecenderungan terhadap bentuk tertentu. Karena hanya mengikuti satu pasangan terdekat, linkage **single** dapat merambat sepanjang kelompok yang tipis dan berkelok, dan juga dapat menyambung melalui jembatan berupa titik-titik outlier. Karena melihat pasangan terjauh, linkage **complete** menjaga cluster tetap padat.

| Linkage | Disukai | Titik lemah |
|---|---|---|
| Single | Kelompok panjang, tipis, atau melengkung | Chaining: sebuah jembatan atau titik outlier menyambung cluster |
| Complete | Cluster padat dengan lebar yang mirip | Satu titik yang jauh membesarkan jarak |
| Average | Jalan tengah di antara keduanya | Tetap lebih menyukai kelompok yang padat |
| Ward | Cluster bulat dengan ukuran yang mirip, seperti k-means | Memotong bentuk melengkung |

[[figure:hierarchical-clustering/linkage-shapes|Setiap pohon dipotong menjadi 2 cluster. Baris pertama: dua bulan sabit. Baris kedua: dua blob dengan jembatan empat titik di antaranya.]]

Pada gambar, single linkage menemukan kedua bulan sabit (20 dan 20 titik), sedangkan complete dan Ward memotongnya secara melintang (30 dan 10, serta 26 dan 14). Dengan adanya jembatan, hasilnya terbalik: single linkage merambat sepanjang jembatan dan berakhir dengan 39 titik berbanding 1, sedangkan complete dan Ward memotong jembatan di tengah dan menghasilkan 20 dan 20.

## Keterbatasan, dan apa selanjutnya
*Kapan hierarchical clustering bukan alat yang tepat?*

- **Ukuran.** Metode ini memerlukan jarak untuk setiap pasangan titik, sekitar n x (n - 1) / 2 angka. Dengan 10.000 titik, itu sekitar 50 juta. Ia sesuai untuk ratusan atau beberapa ribu titik, bukan jutaan.
- **Tidak bisa dibatalkan.** Penggabungan bersifat final. Jika penggabungan awal keliru, semua penggabungan berikutnya dibangun di atasnya.
- **Skala.** Jarak menentukan segalanya, karena itu lakukan scaling pada feature terlebih dahulu, seperti pada k-means.
- **Kamu tetap memilih.** Pohon hanya menunda pilihan k, tidak menghilangkannya.

Sekarang kamu memiliki dua cara melakukan clustering dengan kecenderungan berbeda: k-means menyukai cluster bulat di sekitar centroid, sedangkan hierarchical clustering menghasilkan pohon dengan kecenderungan yang dibentuk oleh linkage. Pelajaran berikutnya menambahkan skor untuk membandingkan pengelompokan dan metode berbasis kepadatan, dan lab Cluster methods memungkinkan kamu membandingkan metode-metode itu pada blob, cincin, dan cluster dengan kepadatan yang tidak sama.

::: deeper Ward secara manual pada lima titik yang sama
Ward menggabungkan pasangan yang paling sedikit menambah total jarak kuadrat dari setiap titik ke rata-rata clusternya. Untuk dua cluster dengan n1 dan n2 titik serta rata-rata m1 dan m2, tambahannya adalah n1 x n2 / (n1 + n2) x (m1 - m2)^2.

Pada A = 0, B = 1, C = 3, D = 7, E = 12: A dan B berbiaya 1 x 1 / 2 x 1 = 0,5, B dan C berbiaya 2, D dan E berbiaya 12,5, sehingga A dan B bergabung. Kemudian C bergabung dengan {A, B} (rata-rata 0,5) pada 2 x 1 / 3 x 2,5^2 = 4,17, lebih murah daripada D-E pada 12,5. Lalu D dan E bergabung pada 12,5. Penggabungan terakhir, {A, B, C} dengan {D, E}, berbiaya 3 x 2 / 5 x (9,5 - 1,33)^2 = 80,03. Angka-angka ini bukan jarak, tetapi urutan penggabungannya adalah pilihan Ward.
:::

::: deeper Biaya metode dasar
Memeriksa setiap pasangan cluster pada setiap penggabungan membutuhkan sekitar n x n per penggabungan, sehingga totalnya sekitar n x n x n. Pencatatan yang lebih cerdas dapat menurunkan waktunya, tetapi tabel jarak antarpasangan tetap tumbuh sebesar n x n, dan itulah batas yang sebenarnya.
:::

::: remember
- Agglomerative clustering dimulai dengan setiap titik sendirian dan berulang kali menggabungkan dua cluster terdekat.
- Linkage (single, complete, average, Ward) menentukan arti "terdekat" dan membentuk hasilnya.
- Dendrogram mencatat penggabungan menurut ketinggian; memotongnya pada satu ketinggian menghasilkan k cluster.
:::
