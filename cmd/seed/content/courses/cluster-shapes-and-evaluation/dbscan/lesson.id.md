---
slug: dbscan
title: DBSCAN dan kepadatan
---
::: intro
- Menentukan jenis titik (core, border, atau noise) dari dua pengaturan DBSCAN, yaitu ε dan MinPts.
- Memprediksi bagaimana ε dan MinPts mengubah jumlah cluster dan titik noise, lalu memeriksanya di lab dbscan.
- Menjelaskan mengapa satu nilai ε kesulitan ketika kelompok yang rapat berdampingan dengan kelompok yang renggang.

Sebelum mulai: baca "Hierarchical clustering" dan "Skor silhouette".
:::

## Cluster sebagai tempat yang ramai
*Bagaimana kalau cluster adalah keramaian, bukan sebuah pusat?*

Pada "k-means, langkah demi langkah", cluster adalah sebuah pusat beserta titik-titik terdekatnya, dan kamu menentukan k sebelum mulai. DBSCAN memakai gambaran yang berbeda. Cluster adalah **tempat yang ramai**: daerah tempat titik-titik berkumpul padat, dengan ruang yang jarang di sekelilingnya. Titik yang sendirian di ruang yang jarang adalah **noise**, dan ia tidak masuk ke cluster mana pun.

Ada dua akibatnya. Kamu tidak menentukan jumlah cluster, karena jumlahnya muncul sendiri dari banyaknya keramaian di dalam data. Selain itu, sebuah keramaian dapat berbentuk apa saja. Dataset **Dua bulan sabit** di lab terdiri dari dua bulan sabit. k-means memotong keduanya secara melintang; DBSCAN mengikuti bentuk tiap bulan sabit, dan dengan 80 titik serta MinPts 4 (pengaturan awal lab) ia menemukan tepat dua cluster tanpa noise untuk ε dari sekitar 0,41 sampai 1,11.

Harganya adalah dua pengaturan yang memang harus kamu pilih sendiri. Keduanya dibahas di bagian berikut.

## Dua pengaturan, tiga jenis titik
*Apa yang diperlukan agar sebuah titik dianggap berada di tempat ramai?*

- **ε** (epsilon) adalah sebuah radius. **ε-neighborhood** suatu titik adalah semua titik yang berjarak paling jauh ε darinya, **termasuk titik itu sendiri**.
- **MinPts** adalah jumlah titik minimum yang harus ada di sebuah neighborhood agar dianggap ramai.

Setiap titik kemudian mendapat satu dari tiga jenis.

| Jenis | Definisi |
| --- | --- |
| **Core** | ε-neighborhood-nya berisi sedikitnya MinPts titik |
| **Border** | Bukan core, tetapi berada di dalam neighborhood sebuah titik core |
| **Noise** | Bukan core dan bukan border |

[[figure:dbscan/kinds|Density tidak merata dengan ε 0,8 dan MinPts 4. A punya 6 titik di dalam lingkarannya, sehingga ia core. B punya 3, tetapi lingkaran A mencakupnya, sehingga ia border. C punya 2 dan tidak dijangkau siapa pun, sehingga ia noise.]]

> Gagasan kunci: titik core adalah kerangka sebuah cluster, titik border menempel di tepinya, dan noise tidak termasuk ke mana pun.

Menghitung titik itu sendiri itu penting. Dengan MinPts = 4, titik yang punya tiga titik lain di dalam ε berarti punya empat titik di neighborhood-nya, sehingga ia core.

## Cara sebuah cluster tumbuh
*Apa yang dikerjakan algoritma ini, satu titik demi satu titik?*

DBSCAN memeriksa satu titik pada satu waktu dan menyimpan antrean titik yang akan dikunjungi.

1. Ambil satu titik yang belum dikunjungi, lalu hitung isi neighborhood-nya.
2. Jika ia bukan core, tandai sebagai noise untuk sementara dan lanjut ke titik berikutnya.
3. Jika ia core, mulai **cluster baru**. Masukkan semua tetangganya ke antrean.
4. Ambil titik dari antrean dan beri tiap titik label cluster tersebut. Bila titik dalam antrean adalah core, masukkan *tetangganya* ke antrean juga.
5. Ketika antrean habis, cluster itu selesai. Pilih titik berikutnya yang belum dikunjungi.

Sebuah cluster adalah semua titik yang dapat dicapai dengan melompat dari titik core ke titik core, ditambah titik border yang disentuh oleh core-core itu. Karena itulah bulan sabit yang panjang dan tipis tetap satu cluster: tiap titik core meneruskan cluster ke titik core berikutnya.

Di lab dbscan, satu kali **Langkah berikutnya** memeriksa satu titik, dan status line memberi tahu langkah mana di atas yang baru saja terjadi.

## Contoh hitungan
*Bisakah kamu membagi delapan angka ke dalam cluster hanya dengan pensil?*

Ambil delapan titik pada satu garis: 1,0, 1,5, 2,0, 2,4, 3,2, 5,0, 9,0 dan 9,2, dengan ε = 1 dan MinPts = 3. Untuk tiap titik, hitung nilai-nilai yang berjarak paling jauh 1 darinya.

[[figure:dbscan/hand-example|Setiap angka dihitung bersama dirinya sendiri. Tanda kurung menunjukkan neighborhood dari 2,4, yang berisi 1,5, 2,0, 2,4 dan 3,2.]]

> Contoh hitungan: 1,0 punya 1,0, 1,5 dan 2,0 dalam jarak 1, jadi 3 titik: core. 1,5, 2,0 dan 2,4 masing-masing punya 4: core. 3,2 hanya punya 2,4 dan dirinya sendiri, yaitu 2: bukan core, tetapi ia berada di neighborhood titik core 2,4, sehingga ia titik border. 5,0 punya 1 titik: noise. 9,0 dan 9,2 saling berada dalam jarak 1, jadi masing-masing hanya 2 titik, di bawah 3: noise.

Hasilnya satu cluster, {1,0, 1,5, 2,0, 2,4, 3,2}, dan tiga titik noise. Sekarang ubah MinPts menjadi 2. Titik 9,0 dan 9,2 masing-masing punya 2 titik sehingga menjadi core dan membentuk cluster kedua, dan 3,2 ikut menjadi core. Titik 5,0 tetap noise.

::: deeper Noise bisa berubah status
Sebuah titik sering ditandai noise di awal, karena proses belum sampai ke keramaian di dekatnya. Ketika cluster yang muncul kemudian menjangkaunya lewat sebuah titik core, titik itu diberi label ulang sebagai border. Hanya noise yang tersisa di akhir yang benar-benar noise. Lab menunjukkan hal ini: eksperimen 4 mengarahkanmu ke titik yang ditandai noise pada langkah 41 dan menjadi border pada langkah 65.
:::

## Memilih ε dan MinPts
*Bagaimana menyetel dua pengaturan ketika tidak ada label?*

Setel dengan memperhatikan jumlah cluster dan noise sambil menggeser satu pengaturan. Gambar berikut menunjukkan ε pada data **Ring dan outlier** di lab dengan MinPts 4.

[[figure:dbscan/radius-sweep|Ring dan outlier pada empat radius. Terlalu kecil hanya menyisakan noise, 1,0 hanya menemukan ring dalam, 1,35 menemukan kedua ring, dan 2,5 menggabungkan keduanya.]]

Ring luar lebih panjang, sehingga titik-titiknya berjauhan dan memerlukan ε yang lebih besar. Keempat titik noise pada 1,35 adalah titik sudut yang terpencil.

- **ε.** Terlalu kecil, hampir tidak ada yang ramai: pada 0,3 semua 80 titik menjadi noise. Terlalu besar, cluster menyatu: pada 2,5 kedua ring menjadi satu. Di antaranya ada **rentang kerja**, yaitu nilai ε yang menghasilkan 2 cluster dan hampir tanpa noise. Untuk ring ini rentangnya sekitar 1,26 sampai 1,95, jadi 1,35 berada di dalamnya, tetapi dekat dengan batas bawah.
- **MinPts.** Nilai yang lebih besar lebih ketat. Empat adalah titik awal yang umum untuk dua feature. Aturan praktisnya adalah sedikitnya jumlah feature ditambah satu, atau dua kali jumlah feature, yang menghasilkan 4 untuk dua feature.
- **Lakukan scaling dulu.** ε adalah satu radius untuk semua feature, jadi feature harus berskala sama. Kalau tidak, feature dengan angka terbesar yang menentukan siapa tetangga siapa.

Nilai ε tidak berlaku lintas lab, karena setiap lab punya skala data dan titiknya sendiri. Selalu setel ε pada data yang ada di depanmu.

::: deeper Plot k-distance untuk ε
Untuk setiap titik, hitung jarak ke tetangga terdekat ke-MinPts, lalu urutkan jarak-jarak itu dan gambarkan. Kurvanya tetap rendah di dalam cluster dan melonjak di tempat outlier mulai muncul. Nilai ε di sekitar siku itu adalah tebakan awal yang baik.
:::

## Ketika kepadatan berbeda-beda
*Mengapa satu ε kesulitan menangani kelompok rapat di samping kelompok renggang?*

ε adalah satu radius untuk seluruh plot. Jika satu kelompok rapat dan kelompok lain tersebar, mungkin tidak ada satu radius yang sesuai untuk keduanya. Lihat dataset **Density tidak merata**, yang kelompok kirinya rapat dan kelompok kanannya renggang.

[[figure:dbscan/uneven-density|Density tidak merata dengan MinPts 4. Atas: tiga radius pada 80 titik. Bawah: banyaknya cluster yang ditemukan tiap radius, untuk 80 titik dan untuk 30 titik.]]

Pada ε 0,5, kelompok yang rapat menjadi cluster tetapi 36 titik lainnya menjadi noise. Pada 1,7, celah di antara kedua kelompok terlampaui dan keduanya menyatu. Rentang kerja, yaitu 2 cluster dengan paling banyak 6 titik noise, berkisar dari sekitar 0,77 sampai 1,64.

Sekarang kurangi datanya. Dengan 30 titik, kelompok yang renggang menjadi lebih jarang, sehingga ε 1,0 menemukan satu cluster dan 13 titik noise, dan rentang kerja bergeser ke sekitar 1,27 sampai 1,91 serta menyempit. Makin besar perbedaan kepadatan, makin sempit rentangnya, sampai akhirnya bisa hilang sama sekali.

> Awas: DBSCAN juga melemah pada data dengan banyak feature, karena jarak di dimensi yang banyak cenderung tampak sama semua.

::: deeper Titik border bergantung pada urutan
Titik border yang menyentuh dua cluster masuk ke cluster mana pun yang menjangkaunya lebih dulu, sehingga hasilnya dapat bergantung pada urutan kunjungan titik. Implementasi sederhana juga membandingkan setiap pasangan titik, yang lambat pada data yang sangat besar tanpa spatial index.
:::

## Dataset nyata
*Apa yang terjadi ketika kelompok yang nyata saling bersentuhan?*

Lab dbscan hanya memakai titik buatan, sehingga bagian ini berupa bacaan. Algoritma yang sama dijalankan pada 342 penguin yang punya panjang flipper sekaligus massa tubuh. Flipper punya rata-rata 200,9 mm dengan simpangan baku 14,0, dan massa punya rata-rata 4.201,8 g dengan simpangan baku 800,8, sehingga gram akan menenggelamkan milimeter. Karena itu keduanya distandarkan dulu, dan MinPts-nya 4.

| ε | Cluster | Titik noise | Ukuran cluster |
| --- | --- | --- | --- |
| 0,20 | 3 | 39 | 187, 102, 14 |
| 0,22 | 2 | 30 | 190, 122 |
| 0,25 | 1 | 20 | 322 |

Kolom spesies tidak dipakai untuk clustering. Pada ε = 0,22, satu cluster berisi 110 Gentoo ditambah 4 Adelie dan 8 Chinstrap. Cluster lainnya berisi 132 Adelie dan 58 Chinstrap. DBSCAN menemukan Gentoo versus sisanya, bukan tiga spesies, yang menunjukkan bahwa keramaian Adelie dan Chinstrap saling bersentuhan. Radius yang hanya berbeda 0,03 memberi jawaban yang berbeda, yaitu masalah rentang kerja pada data nyata.

Titik noise tidak masuk cluster mana pun, jadi "Skor silhouette" tidak menyertakannya saat menilai sebuah clustering; laporkan berapa yang dibuang. "Memilih metode clustering" kemudian menempatkan DBSCAN di samping k-means dan hierarchical clustering.

::: remember
- DBSCAN menumbuhkan cluster melalui neighborhood yang ramai. Kamu memilih ε dan MinPts, bukan jumlah cluster.
- Titik core punya sedikitnya MinPts titik dalam jarak ε, termasuk dirinya sendiri. Titik border menyentuh sebuah titik core, dan noise tidak menyentuh satu pun.
- Setel ε dengan memperhatikan jumlah cluster dan noise. Rentang kerja menyempit ketika kepadatannya berbeda, dan kelompok yang bersentuhan mungkin tidak pernah terpisah.
:::

@@lab

## Lab: menumbuhkan cluster lewat kepadatan
Lab dimulai dengan 80 titik **Ring dan outlier**, dengan ε 1,35 dan MinPts 4. Belum ada yang di-cluster sampai kamu menekan **Jalankan** atau **Langkah berikutnya**. Setiap langkah memeriksa satu titik, dan status line menyebutkan apa yang terjadi padanya.

### Kontrol
- **Jalankan** memutar algoritma. Tombolnya berubah menjadi **Jeda** saat berjalan dan menjadi **Jalankan lagi** setelah selesai. **Langkah sebelumnya** dan **Langkah berikutnya** bergerak satu titik mundur atau maju. **Kecepatan** punya slider dan kotak isian dengan tanda × di belakangnya; ujung paling kanan slider adalah **Instan**.
- **Dataset** memilih **Ring dan outlier**, **Dua bulan sabit**, atau **Density tidak merata**.
- **Jumlah titik** (1 sampai 1.000, awalnya 80) menentukan banyaknya titik. **Acak ulang** menggambar bentuk yang sama dengan jitter baru.
- **Radius neighborhood (ε)** awalnya 1,35 dan **MinPts (titik minimum)** awalnya 4. MinPts sudah termasuk titik yang sedang dicek. Mengubah salah satunya, **Dataset**, atau **Jumlah titik** akan memulai ulang proses.
- **Tampilkan ε-neighborhood** menampilkan lingkaran putus-putus di sekitar titik yang sedang dicek. Awalnya menyala.
- **Periksa titik**: klik sebuah titik, atau pilih nomornya di **Titik**. **Ikuti animasi** kembali ke titik yang sedang dicek proses. Saat plot difokuskan, tombol panah berpindah ke titik terdekat ke arah itu dan Esc kembali mengikuti proses.
- **Layar penuh** memperbesar lab. **Reset** memulai ulang proses dengan pengaturan saat ini; ia tidak mengembalikan nilai awal.

### Membaca layar
- Plotnya bernama **Feature space**. Lingkaran penuh adalah **Core**, lingkaran kosong adalah **Border**, tanda silang adalah **Noise**, dan titik kecil adalah **Belum dicek**. Warna menandai sebuah cluster. Lingkaran putus-putus adalah **ε-neighborhood**, dan titik di dalamnya diberi halo, berlabel **Tetangga di dalam ε**.
- Status line berbunyi **Siap dicoba**, **Cluster baru dimulai**, **Cluster membesar**, **Border point ditambahkan**, **Titik ditandai sebagai noise**, atau **Clustering selesai**. Di bawahnya, baris seperti "Titik 12 · 5 di dalam ε-neighborhood · Cluster 1" menjelaskan titik yang sedang dicek, dan sebuah penghitung menyebutkan berapa titik yang sudah dikunjungi.
- **Hasil** menampilkan **Cluster**, **Core**, **Border**, dan **Noise**. Ketika proses selesai, **Core**, **Border**, dan **Noise** jika dijumlahkan sama dengan **Jumlah titik**.

### Eksperimen
**Reset** mempertahankan pengaturanmu, jadi sebelum eksperimen yang tidak menyebutkannya, kembalikan ε ke 1,35, MinPts ke 4, dan **Jumlah titik** ke 80. Atur **Kecepatan** ke **Instan** bila kamu hanya ingin melihat hitungan akhir.
1. **Proses awal.** Prediksi: dengan **Ring dan outlier** pada ε 1,35 dan MinPts 4, berapa cluster yang muncul, dan mana yang menjadi noise? Tekan **Jalankan**. Hasilnya seharusnya **Cluster** 2, **Core** 76, **Border** 0, dan **Noise** 4. Keempat tanda silang itu adalah titik sudut yang terpencil: klik salah satunya dan **Periksa titik** menunjukkan 1 titik di ε-neighborhood-nya, yaitu dirinya sendiri, yang di bawah MinPts. Mengapa semua titik ring lolos dan tidak ada yang menjadi border?
2. **Terlalu kecil, terlalu besar.** Prediksi: apa yang dilakukan ε 0,3, 1,0, dan 2,5? Coba satu per satu. Pada 0,3, **Cluster** 0 dan **Noise** 80. Pada 1,0 ada 1 cluster dengan 38 titik core dan 42 noise: hanya ring dalam yang bertahan. Pada 2,5 ada 1 cluster dan 0 noise. Mengapa ring luar gagal pada 1,0? Klik titik di ring luar dan baca jumlah tetangganya. Lalu cari rentang ε yang menghasilkan 2 cluster dengan hanya sedikit noise: sekitar 1,26 sampai 1,95.
3. **Radius terkecil untuk bulan sabit.** Prediksi: sekecil apa ε boleh turun pada **Dua bulan sabit** dengan MinPts 4 sebelum kedua bulan sabit tidak lagi menjadi dua cluster? Turunkan ε sedikit demi sedikit. Pada 0,41 kamu masih mendapat 2 cluster, pada 0,40 menjadi 4, dan 0,30 menghasilkan semuanya noise. Di ujung yang lain, 1,11 memberi 2 cluster dan 1,12 memberi 1. Bagaimana **Noise** berubah sepanjang jalan?
4. **Menaikkan MinPts.** Prediksi: pada **Dua bulan sabit** dengan ε 0,8, titik mana yang tidak lagi core ketika MinPts naik dari 4 ke 8? Coba MinPts 4, 6, 8, dan 10. **Core** berturut-turut 80, 76, 68, dan pada 10 semua titik menjadi noise. Pada MinPts 6, tekan **Langkah berikutnya** sebanyak 41 kali: status line berbunyi **Titik ditandai sebagai noise** untuk Titik 5. Teruskan: pada langkah 65, **Border point ditambahkan** menampilkan Titik 5 lagi. Di mana lingkaran kosong berada, dan mengapa sebuah titik noise bisa berubah status?
5. **Density tidak merata.** Prediksi: adakah satu ε yang memisahkan kelompok renggang dari kelompok rapat? Pilih **Density tidak merata** dengan MinPts 4 dan 80 titik, lalu coba ε 0,5, 1,35, dan 1,7. Kamu akan mendapat 1 cluster dan 36 noise, lalu 2 cluster dan 4 noise, lalu 1 cluster. Kemudian atur ε ke 1,0, yang menghasilkan 2 cluster pada 80 titik, dan turunkan **Jumlah titik** menjadi 30. Sekarang kamu mendapat 1 cluster dan 13 noise. Jelaskan apa yang dilakukan pengurangan data terhadap kepadatan kelompok yang renggang.
6. **Sampel baru.** Prediksi: jika kamu menekan **Acak ulang**, apakah jawabanmu pada eksperimen 3 tetap berlaku? Pilih **Dua bulan sabit** dengan MinPts 4, **Jumlah titik** 80, dan ε 0,41, tekan **Acak ulang** beberapa kali, dan catat **Cluster** setiap kali. Dalam pemeriksaan terhadap 20 sampel baru, ε 0,41 memberi 2 cluster sebanyak 13 kali dan 3 sampai 5 cluster sebanyak 7 kali. Ulangi pada ε 0,6: hasilnya 2 cluster pada semua 20 sampel. Apa artinya ini bagi pemilihan ε di dekat tepi rentang kerjanya, dan di mana sebaiknya kamu memilihnya? Lab tidak punya pilihan data nyata, jadi angka penguin di pelajaran ini adalah bacaan, bukan eksperimen.
