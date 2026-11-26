---
slug: kmeans
title: k-means, langkah demi langkah
---
::: intro
- Jalankan langkah assign dan update dengan tangan pada enam panjang sirip penguin yang nyata.
- Jelaskan mengapa putaran berhenti ketika pembagian titik tidak lagi berubah, dan mengapa Inertia (total kuadrat jarak dari setiap titik ke centroid-nya) tidak pernah naik.
- Pakai lab k-means untuk melihat di mana k-means bekerja dengan baik dan di mana ia gagal.

Sebelum mulai: baca "Apa itu clustering" dan "Posisi awal dan memilih k".
:::

## Gagasan dasarnya
*Apa yang dilakukan satu putaran k-means pada kelompok-kelompoknya?*

Pelajaran sebelumnya membahas dua pilihan yang kamu buat sebelum k-means berjalan: di mana centroid mulai dan berapa jumlahnya. Pelajaran ini membuka putarannya sendiri.

**Centroid** adalah sebuah titik di feature space yang sama dengan datanya, yang mewakili pusat satu cluster. k-means memegang k centroid dan mengulang dua gerakan. Pada langkah **assign**, setiap titik masuk ke cluster milik centroid terdekatnya. Pada langkah **update**, setiap centroid pindah ke rata-rata titik-titik yang baru saja masuk ke dalamnya.

Ketika centroid bergeser, centroid yang terdekat bagi sebagian titik dapat berganti. Kelompoknya pun berubah, dan putaran dimulai lagi. Putaran berhenti ketika sebuah langkah assign membiarkan setiap titik tetap di cluster yang sudah ditempatinya.

Kamu akan menjalankannya dengan tangan pada enam penguin nyata, lalu menelusurinya langkah demi langkah di lab k-means.

[[figure:kmeans/loop|Putaran k-means: assign, update, lalu ulangi sampai tidak ada titik yang pindah cluster.]]

## Assign, lalu update
*Apa tepatnya yang terjadi pada setiap langkah?*

**Assign.** Untuk setiap titik, ukur jaraknya ke semua centroid lalu pilih yang terkecil. Jika dua centroid sama dekatnya, yang disebut lebih dulu menang. Sebuah centroid dapat saja berakhir tanpa titik sama sekali.

**Update.** Untuk setiap cluster, rata-ratakan setiap feature dari titik-titiknya secara terpisah. Dengan dua feature, centroid yang baru adalah (rata-rata feature 1, rata-rata feature 2). Centroid yang tidak punya titik tetap di tempatnya, karena tidak ada yang dapat dirata-ratakan.

**Berhenti.** Langkah assign yang pertama belum punya pembanding, sehingga k-means selalu melakukan setidaknya satu update. Setelah itu, setiap langkah assign dibandingkan dengan langkah sebelumnya. Jika tidak ada titik yang pindah cluster, update berikutnya akan menghasilkan rata-rata yang sama, sehingga proses sudah selesai.

> Gagasan kunci: arti "pusat" bergantung pada jaraknya. Pada jarak Euclidean kuadrat, pusatnya adalah rata-rata. Pada jarak Manhattan, pusatnya adalah median tiap feature. Pada jarak cosine, pusatnya adalah rata-rata arah titik-titiknya (setiap titik diskalakan ke panjang 1), yang digambar pada jarak tetap dari titik asal. Lab k-means menyediakan ketiganya.

## Contoh hitungan pada penguin
*Dapatkah kamu menjalankan putaran ini dengan pensil pada data ukur yang nyata?*

Ambil panjang sirip, dalam milimeter, dari enam penguin pada tabel penguin bawaan: tiga Adelie (181, 186 dan 195) dan tiga Gentoo (210, 211 dan 230). Satu feature membuat hitungannya singkat. Pakai k = 2, dan taruh kedua centroid awal di 181 dan 186, dua penguin yang berdekatan. Itu posisi awal yang buruk, dan memang disengaja.

Inertia adalah jumlah kuadrat jarak dari setiap penguin ke centroid-nya, dalam mm². Tabel mencantumkan, untuk setiap pass, centroid yang dipakai, cluster hasil langkah assign, dan inertia sesudahnya.

| Pass | Centroid | Cluster 1 | Cluster 2 | Inertia |
| --- | --- | --- | --- | --- |
| 1 | 181 dan 186 | 181 | 186, 195, 210, 211, 230 | 3218 |
| 2 | 181 dan 206,4 | 181, 186 | 195, 210, 211, 230 | 746,04 |
| 3 | 183,5 dan 211,5 | 181, 186, 195 | 210, 211, 230 | 489,5 |
| 4 | 187,33 dan 217 | 181, 186, 195 | 210, 211, 230 | 354,67 |

[[figure:kmeans/worked|Empat pass assign pada enam panjang sirip. Warna menunjukkan cluster, dan belah ketupat menunjukkan centroid yang dipakai pada pass itu.]]

## Empat pass, satu per satu
*Mengapa penguin dengan sirip 195 mm berpindah cluster?*

> Contoh hitungan: **Pass 1.** Penguin 181 berjarak 0 dari centroid pertama, sehingga ia masuk cluster 1. Penguin 186 berjarak 0 dari centroid kedua, sehingga ia masuk cluster 2, begitu juga empat penguin lainnya. Update memindahkan centroid 2 ke (186 + 195 + 210 + 211 + 230) / 5 = 1032 / 5 = 206,4.

> Contoh hitungan: **Pass 2.** Penguin 186 berjarak 5 dari 181 tetapi 20,4 dari 206,4, sehingga ia pindah ke cluster 1. Penguin 195 berjarak 14 dari 181 dan 11,4 dari 206,4, sehingga ia tetap di cluster 2. Update menghasilkan (181 + 186) / 2 = 183,5 dan (195 + 210 + 211 + 230) / 4 = 846 / 4 = 211,5.

> Contoh hitungan: **Pass 3.** Sekarang 195 berjarak 11,5 dari 183,5 dan 16,5 dari 211,5, sehingga ia pindah ke cluster 1. Update menghasilkan 562 / 3 = 187,33 dan 651 / 3 = 217.

**Pass 4.** Semua penguin tetap di clusternya, sehingga putaran berhenti. Cluster 1 berisi ketiga penguin Adelie dan cluster 2 berisi ketiga penguin Gentoo.

> Awas: kecocokan dengan spesies itu hanya berlaku untuk keenam penguin ini. k-means tidak pernah melihat nama spesies, dan sebuah cluster bukan label.

## Mengapa putaran berhenti
*Mengapa putaran ini tidak mungkin berjalan selamanya?*

Pada tabel, inertia turun di setiap pass: 3218, 746,04, 489,5, 354,67. Itu bukan kebetulan. Langkah assign memberi setiap titik centroid terdekatnya, sehingga total kuadrat jarak tidak mungkin membesar. Langkah update menaruh setiap centroid di rata-rata titiknya, yaitu tempat dengan total kuadrat jarak terkecil ke titik-titik itu, sehingga totalnya juga tidak mungkin membesar.

Inertia tidak pernah naik, dan jumlah cara membagi titik menjadi k kelompok itu terbatas, sehingga putaran tidak dapat berputar tanpa akhir. Pasti ada pass di mana tidak ada yang berubah.

[[figure:kmeans/inertia|Inertia setelah setiap Langkah berikutnya di lab k-means. Kedua jenis langkah menurunkannya atau membiarkannya tetap, dan dua bacaan terakhir sama.]]

Lab menunjukkan hal yang sama pada Cluster tumpang tindih dengan k = 2: Inertia turun dari 260,09 menjadi 110,89 dalam 13 langkah. Dua bacaan terakhir sama-sama 110,89 karena langkah assign terakhir tidak mengubah apa pun.

> Awas: berhenti berarti stabil, bukan terbaik. Putaran berhenti pada jawaban stabil pertama yang dicapainya, dan posisi awal centroid yang menentukan jawaban yang mana.

::: deeper Mengapa rata-rata
Rata-rata adalah satu-satunya tempat dengan jumlah kuadrat jarak terkecil. Untuk tiga panjang sirip Adelie 181, 186 dan 195, rata-ratanya 187,33 dan jumlahnya 40,11 + 1,78 + 58,78 = 100,67. Jika pusatnya ditaruh di 186 (median), jumlahnya 25 + 0 + 81 = 106. Jika ditaruh di 190, jumlahnya 81 + 16 + 25 = 122. Tempat lain mana pun memberi jumlah yang lebih besar, itulah sebabnya langkah update memakai rata-rata.
:::

## Satu run, satu jawaban
*Apa yang terjadi pada putaran ini jika centroid awalnya berbeda?*

Pelajaran sebelumnya menunjukkan bahwa data yang sama dapat berakhir pada pengelompokan yang berbeda. Di lab, kamu dapat melihatnya terjadi. Atur Dataset ke Papan catur, ketik 4 di Jumlah cluster (k), lalu jalankan sampai Konvergen: dibutuhkan Iterasi 6 dan berakhir pada Inertia 114,24, dengan 12 titik per cluster, satu cluster untuk setiap blok.

Sekarang tekan Acak centroid dan jalankan lagi, beberapa kali. Dalam simulasi 2000 posisi awal acak, sekitar enam dari sepuluh juga berakhir di 114,24. Sisanya berhenti lebih tinggi, misalnya di 135,91 dengan cluster yang tidak seimbang berukuran 11, 17, 11 dan 9 titik.

Setiap run itu berhenti karena sebuah langkah assign tidak mengubah apa pun. Berhenti hanya memberi tahu bahwa run itu stabil, bukan bahwa ia menemukan jawaban terbaik. Seperti pada pelajaran sebelumnya, kamu membandingkan run pada data dan k yang sama berdasarkan inertia-nya, lalu menyimpan yang terendah.

## Di mana k-means kesulitan
*Data seperti apa yang mengalahkannya?*

- **Bentuk yang tidak bulat.** Setiap cluster ditentukan oleh satu pusat, sehingga kelompoknya cenderung berbentuk gumpalan bulat. Pada Cincin konsentris dengan k = 2, putaran berhenti setelah Iterasi 1 pada Inertia 267,49 dengan 24 dan 24 titik: potongan lurus yang memotong kedua cincin, dengan 12 titik dari tiap cincin di setiap sisinya. Batas antara dua centroid adalah garis berisi titik-titik yang sama jauhnya dari keduanya, dan garis itu lurus.
- **Outlier.** Satu titik yang jauh menarik rata-rata ke arahnya. Median lebih tahan terhadap hal ini.
- **Feature yang belum di-scaling.** Feature dengan skala besar mendominasi setiap jarak.
- **Kepadatan yang tidak sama.** Kelompok rapat di samping kelompok yang tersebar sering terbelah di tempat yang salah.

[[figure:kmeans/limits|Putaran yang sama pada tiga dataset dari lab. Dua centroid memotong kedua cincin, sedangkan empat centroid menemukan keempat blok.]]

::: deeper Rincian yang terlihat di lab k-means
- Jika dua centroid sama dekatnya dengan sebuah titik, yang disebut lebih dulu menang.
- Cluster kosong mempertahankan centroid-nya yang sekarang.
- Titik yang berada tepat di titik asal tidak punya arah, sehingga pada jarak cosine ia sama jauhnya (jarak 1) dari setiap pusat dan tidak menyumbang apa pun pada rata-rata mana pun.
- Daerah yang diarsir menunjukkan tempat tiap centroid akan memenangkan sebuah titik, memakai centroid dari langkah assign terakhir.
- Tepi daerah Manhattan digambar pada grid sehingga tampak bergerigi, tetapi setiap titik tetap dikelompokkan berdasarkan jarak Manhattan yang sebenarnya.
:::

::: deeper Biaya komputasi
Setiap langkah assign menghitung n x k jarak, sehingga satu run membutuhkan sekitar n x k x iterasi perhitungan jarak. Dalam praktik k-means cepat, itulah sebabnya ia biasanya menjadi percobaan pertama.
:::

::: remember
- Masukkan setiap titik ke centroid terdekatnya, pindahkan setiap centroid ke rata-rata titiknya, lalu ulangi.
- Putaran berhenti ketika sebuah langkah assign tidak mengubah apa pun. Inertia tidak pernah naik sehingga putaran selalu berhenti, tetapi pada jawaban stabil yang bergantung pada posisi awal.
- k-means sesuai untuk kelompok yang padat dan berukuran mirip. Cincin, outlier, dan feature yang belum di-scaling membuatnya gagal.
:::

@@lab

## Lab: telusuri k-means langkah demi langkah
Lab dibuka pada Cluster tumpang tindih: 48 titik dan belum ada centroid. Ketik angka di **Jumlah cluster (k)** dan lab menaruh centroid sebanyak itu pada titik data. Setelah itu kamu menelusuri putarannya dan melihat Inertia turun.

### Kontrol
- **Dataset** memilih **Cluster tumpang tindih** (nilai awal), **Cincin konsentris** atau **Papan catur**. Mengubahnya mengembalikan dataset kursus (48 titik yang sama setiap kali) dan menaruh centroid pada titik data yang baru.
- **Jarak** memilih **Euclidean (kuadrat)** (nilai awal), **Manhattan** atau **Cosine**. Mengubahnya mempertahankan centroid awal dan memulai run dari awal lagi.
- **Jumlah titik** (1 sampai 1000, mulai dari 48) dan tombol **Acak** di sebelahnya. **Acak** menggambar titik acak yang baru dan membiarkan centroid di tempatnya.
- **Jumlah cluster (k)** (mulai dari 0) dan tombol **Acak centroid** di sebelahnya. Mengetik angka menaruh centroid sebanyak itu pada titik data yang dipilih dengan cara yang selalu sama, sehingga k yang diketik selalu mulai dari posisi yang sama. **Acak centroid** menaruhnya di tempat acak, sehingga hasilnya berbeda setiap kali.
- **Tampilkan batas cluster** (menyala) mengarsir daerah yang akan dimenangkan setiap centroid. **Tampilkan koordinat centroid** (mati) menuliskan posisi setiap centroid di sebelahnya.
- **Jalankan** memainkan seluruh putaran, lalu menampilkan **Jeda** selama berjalan dan **Jalankan lagi** setelah **Konvergen**. **Langkah berikutnya** dan **Langkah sebelumnya** maju atau mundur satu langkah. **Kecepatan** punya slider dan sebuah kotak; posisi slider yang terakhir adalah **Instan**.
- **Layar penuh** memperbesar lab. **Reset** mengembalikan centroid ke posisi awalnya dan menghapus run, tetapi titik yang kamu punya tetap ada.
- Pada plot, sebelum langkah assign pertama: klik area kosong untuk menambah centroid, seret untuk memindahkannya, klik kanan untuk mengetik koordinatnya atau menghapusnya. Dengan plot yang difokus, Spasi memilih centroid, tombol panah menggesernya, Enter mengeditnya, + menambah satu, dan Delete menghapusnya.

### Yang kamu lihat
- Kartu **Feature space** menggambar titik yang diwarnai menurut cluster, dengan garis dari setiap titik ke centroid-nya dan belah ketupat untuk setiap centroid. Sumbunya adalah **Feature 1** dan **Feature 2**. Titik yang belum dicapai langkah assign berwarna abu-abu, **Belum dikelompokkan**. Area berwarna muncul setelah langkah assign pertama.
- Baris status menampilkan **Siap**, **Mengelompokkan titik** (dengan "Titik 12 dari 48 → Cluster 2"), **Titik sudah dikelompokkan**, **Centroid sudah bergeser** atau **Konvergen**. Baris di bawahnya menjelaskan apa yang akan dilakukan langkah berikutnya.
- **Iterasi** menghitung jumlah langkah update sejauh ini. **Inertia** adalah total kuadrat jarak dari setiap titik ke centroid-nya, dan menampilkan tanda hubung selama titik masih dikelompokkan. Pada **Manhattan** atau **Cosine** namanya **Total jarak**, dan angkanya tidak dapat dibandingkan dengan Inertia.
- Tabel **Ringkasan cluster** punya kolom **Cluster**, **Titik**, **Centroid · Feature 1** dan **Centroid · Feature 2**, satu baris untuk setiap cluster.

### Percobaan
Geser **Kecepatan** ke posisi terakhirnya, **Instan**, agar setiap **Langkah berikutnya** menjadi satu langkah assign penuh atau satu langkah update penuh. Pada kecepatan yang lebih rendah, **Langkah berikutnya** mengelompokkan satu titik setiap kali. Angka di bawah berasal dari nilai k yang diketik, sehingga hasilnya sama untukmu. Mengubah **Dataset** mengembalikan titik bawaan, yang kamu perlukan setelah menekan **Acak**.

1. **Pantau Inertia.** Prediksi: apakah Inertia akan naik, turun, atau tetap pada setiap langkah? Biarkan Dataset pada Cluster tumpang tindih, ketik 2 di **Jumlah cluster (k)**, lalu tekan **Langkah berikutnya** 13 kali, sambil membaca status, **Iterasi** dan **Inertia** setiap kali. Langkah pertama menampilkan **Titik sudah dikelompokkan**, Iterasi 0, Inertia 260,09. Lalu **Centroid sudah bergeser**, Iterasi 1, 189,99, lalu 159,96, 133,35, dan seterusnya sampai **Konvergen** pada Iterasi 6 dengan Inertia 110,89. Ringkasan cluster kemudian menampilkan 21 dan 27 titik. Langkah mana yang menurunkan Inertia, dan mengapa bacaan terakhir sama dengan bacaan sebelumnya?
2. **Lebih banyak centroid.** Prediksi: dengan k = 3, apakah putaran memerlukan lebih banyak iterasi daripada k = 2? Ketik 3, lalu tekan **Jalankan**, dan baca **Iterasi** dan **Inertia** saat **Konvergen**: Iterasi 5 dan Inertia 83,83 (cluster berukuran 11, 18 dan 19 titik). Lalu ketik 4: Iterasi 8 dan Inertia 57,55. Inertia turun seiring k bertambah, tetapi jumlah iterasinya tidak mengikuti aturan apa pun (6, 5, 8). Apa yang tidak ditunjukkan oleh Inertia yang lebih rendah tentang k?
3. **Posisi awal yang berbeda.** Prediksi: jika kamu menekan **Acak centroid**, apakah putaran berakhir di tempat yang sama? Atur Dataset ke Papan catur dan ketik 4. Tekan **Jalankan**: putaran konvergen pada Iterasi 6 dengan Inertia 114,24 dan 12 titik per cluster. Sekarang tekan **Acak centroid** dan **Jalankan** sekitar sepuluh kali. Banyak run berakhir lagi di 114,24. Sebagian berhenti lebih tinggi, misalnya di 135,91 dengan cluster tidak seimbang seperti 11, 17, 11 dan 9 titik. Run mana yang akan kamu simpan, dan mengapa?
4. **Dua centroid pada cincin.** Prediksi: dapatkah dua centroid memisahkan cincin dalam dari cincin luar? Atur Dataset ke Cincin konsentris dan ketik 2. Tekan **Jalankan**: putaran berhenti pada Iterasi 1 dengan Inertia 267,49 dan 24 titik di setiap cluster, dan area yang diarsir bertemu pada garis lurus yang melewati kedua cincin. Sekarang ketik 0, klik plot dua kali untuk menaruh dua centroid sendiri (satu di tengah, satu dekat bagian atas, misalnya), lalu tekan **Jalankan**. Coba beberapa penempatan. Mengapa setiap penempatan yang memberi kedua centroid beberapa titik berakhir dengan kedua cincin terpotong?
5. **Jarak yang lain.** Prediksi: apakah mengganti Jarak mengubah kelompoknya? Atur Dataset ke Cluster tumpang tindih dan ketik 2, lalu atur **Jarak** ke **Manhattan** dan tekan **Jalankan**: putaran konvergen pada Iterasi 6 dengan Total jarak 82,66 dan 21 serta 27 titik. Centroid-nya berada di (6,06; 4,17) dan (3,97; 5,46), dibandingkan (6,30; 4,14) dan (3,68; 5,81) pada Euclidean (kuadrat). Dengan **Cosine** putaran berhenti pada Iterasi 5 dengan Total jarak 0,50, dan centroid digambar di (6,69; 4,38) dan (4,22; 6,80), keduanya berjarak 8 dari titik asal. Mengapa 82,66 tidak dapat dibandingkan dengan 110,89?
6. **Gambar data baru.** Prediksi: jika kamu menggambar titik baru dan menjalankan lagi, apakah putaran memerlukan enam iterasi lagi? Atur Dataset ke Cluster tumpang tindih, ketik 2, dan tekan **Jalankan** untuk mencapai 110,89. Lalu tekan **Acak** di sebelah **Jumlah titik**: tombol itu menggambar 48 titik acak baru dengan jenis yang sama, membiarkan centroid di tempatnya, dan mengembalikan run ke **Siap**. Tekan **Jalankan** sekali lagi, dan ulangi dengan beberapa gambar data baru. Dalam simulasi 1000 gambar data, sebagian besar memerlukan 1 sampai 3 iterasi, centroid kiri sebagian besar mendarat di x antara 3,0 dan 3,8, centroid kanan antara 6,2 dan 7,0, dan Inertia sebagian besar jatuh antara sekitar 106 dan 149. Apakah kedua kelompok tetap berbentuk sama? Mengapa salah jika dikatakan bahwa gambar data dengan Inertia 140 lebih buruk daripada yang pertama dengan 110,89? Seperti pada penguin tadi, sebuah angka hanya berlaku untuk titik-titik yang dihitung.
