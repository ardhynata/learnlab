---
slug: choosing-an-algorithm
title: Memilih metode clustering
---
::: intro
- Memilih metode pertama dengan mengajukan lima pertanyaan tentang datamu: bentuk, noise, kebutuhan menentukan k, ukuran data, dan seberapa jelas hasilnya harus dijelaskan.
- Membaca tabel keputusan yang menyandingkan k-means, hierarchical clustering, dan DBSCAN.
- Memeriksa sebuah clustering sebelum dipercaya, dan menjelaskan mengapa satu skor tidak boleh menjadi penentu.

Sebelum mulai: baca "k-means, langkah demi langkah", "Hierarchical clustering", "Skor silhouette", dan "DBSCAN dan kepadatan", dan coba lab Cluster methods.
:::

## Lima pertanyaan sebelum memilih
*Apa yang perlu kamu tanyakan tentang sebuah masalah sebelum memilih metode?*

Setiap metode di modul ini menjawab satu pertanyaan dengan baik. k-means bertanya centroid mana yang paling dekat. Hierarchical clustering bertanya titik atau kelompok mana yang harus digabung lebih dulu. DBSCAN bertanya di mana titik-titik berkumpul padat. Memilih metode berarti mencocokkan pertanyaan itu dengan masalahmu. Lima pemeriksaan berikut sudah menyelesaikan sebagian besar pekerjaan:

1. **Bentuk.** Apakah kelompoknya berupa gumpalan bulat, atau cincin, bulan sabit, dan rantai?
2. **Noise.** Apakah setiap titik harus masuk ke sebuah kelompok, atau boleh ada titik tersesat yang tidak dimasukkan ke mana pun?
3. **Menentukan k.** Apakah kamu sudah tahu berapa kelompok yang diinginkan sebelum mulai?
4. **Ukuran data.** Berapa banyak titik dan berapa banyak feature: ratusan, atau jutaan?
5. **Kemudahan dijelaskan.** Siapa yang harus memahami hasilnya, dan apa yang akan mereka tanyakan tentang tiap kelompok?

[[figure:choosing-an-algorithm/decision-flow|Panduan langkah pertama: tiga pertanyaan mengarah ke metode awal, dan satu pilihan cadangan menampung sisanya.]]

Panduan ini tempat untuk memulai, bukan putusan akhir. Sisa pelajaran menunjukkan mengapa setiap pertanyaan itu penting.

## Apa yang dapat dilihat tiap metode
*Mengapa data yang sama tampak berbeda bagi tiap metode?*

k-means membagi bidang menjadi wilayah di sekitar centroid-nya, sehingga kelompoknya bulat dan saling bertemu di garis lurus. Hierarchical clustering bergantung pada **linkage**, yaitu aturan untuk menentukan seberapa jauh dua kelompok. Ward linkage menggabungkan pasangan yang menjaga kelompok tetap padat, sehingga perilakunya mirip k-means. Single linkage menghubungkan pasangan titik yang paling dekat, sehingga ia mengikuti rantai dan lengkungan. DBSCAN mengikuti wilayah yang padat dan tidak peduli pada bentuknya.

[[figure:choosing-an-algorithm/same-data-four-ways|Data yang sama, 150 titik per baris, dikelompokkan dengan empat cara. Baris-barisnya berbeda dalam bentuk dan noise.]]

Baca gambar itu baris demi baris. Pada tiga gumpalan, semua metode sepakat. Pada dua cincin, k-means dan ward memotong melintasi kedua cincin, sedangkan single linkage dan DBSCAN menemukannya. Pada kepadatan yang tidak seimbang, single linkage hanya memisahkan satu titik tersesat dan menganggap sisanya satu kelompok. DBSCAN menyisihkan 11 titik sebagai noise, sesuatu yang tidak dapat dilakukan tiga metode lainnya: mereka menempatkan setiap titik ke suatu kelompok.

## Tabel keputusan
*Bagaimana ketiga metode itu dibandingkan pada lima pertanyaan tadi?*

| Pertanyaan | k-means | Hierarchical | DBSCAN |
| --- | --- | --- | --- |
| Bentuk | Gumpalan bulat dengan ukuran serupa | Bergantung pada linkage: ward padat, single mengikuti rantai | Bentuk apa pun, asalkan kepadatannya merata |
| Noise | Setiap titik dipaksa masuk ke kelompok, dan outlier menarik centroid | Setiap titik ikut digabung; single linkage dapat membentuk rantai lewat titik tersesat | Titik yang jarang diberi label noise |
| Menentukan k | Kamu menetapkan k lebih dulu | Kamu memilih k sesudahnya dengan memotong dendrogram | Tanpa k; kamu menetapkan eps dan MinPts |
| Ukuran data | Cepat: sekitar n x k jarak per putaran | Dimulai dari semua jarak antarpasangan, sehingga sesuai untuk ratusan sampai beberapa ribu titik | Membandingkan titik dengan tetangganya; lambat pada data besar kecuali tetangga dicari dengan struktur pencarian khusus (spatial index) |
| Kemudahan dijelaskan | Tiap kelompok punya centroid, yaitu titik rata-rata kelompok | Dendrogram menunjukkan apa yang bergabung dan pada jarak berapa | Titik core, border, dan noise; tanpa centroid |

> Gagasan kunci: tidak ada satu baris yang menentukan sendiri. Timbang baris-barisnya sesuai masalahmu. Kalau kamu harus memberi label pada setiap pelanggan dan menjelaskan tiap kelompok, baris pertama dan terakhir mengarah ke k-means. Kalau kamu harus menemukan cincin dan menyisihkan outlier, keduanya mengarah ke DBSCAN.

::: deeper Ukuran dalam angka
Hierarchical clustering bekerja dari jarak antara semua pasangan titik. Dengan n titik, ada n x (n - 1) / 2 pasangan. Untuk 150 titik, itu 11.175 pasangan. Untuk 10.000 titik, jumlahnya 49.995.000, sekitar 50 juta. Satu putaran k-means dengan k = 3 pada 10.000 titik menghitung 10.000 x 3 = 30.000 jarak. Selisih itulah alasan tabel menyebut k-means cepat.
:::

## Skor bukan putusan
*Mengapa skor terbaik bisa dimiliki pengelompokan yang salah?*

Skor silhouette memberi nilai tinggi pada titik yang dekat dengan kelompoknya sendiri dan jauh dari kelompok berikutnya. Itu menguntungkan kelompok yang padat dan bulat, apa pun bentuk sebenarnya. Ambil dua cincin pada gambar tadi. k-means memotongnya menjadi separuh kiri dan separuh kanan dan mendapat skor 0,36. Pengelompokan yang benar, yang ditemukan DBSCAN dengan eps 1,0 dan MinPts 4, hanya mendapat 0,01. Pada dua bulan sabit, hal yang sama terjadi dalam bentuk yang lebih ringan: 0,49 untuk potongan k-means dan 0,38 untuk kelompok yang benar (DBSCAN dengan eps 0,8 dan MinPts 4).

[[figure:choosing-an-algorithm/silhouette-trap|Skor silhouette pada cincin dan bulan sabit: pengelompokan yang benar mendapat batang yang lebih rendah di kedua kasus.]]

> Awas: silhouette membandingkan pengaturan dari satu metode pada satu jenis data, misalnya k yang berbeda untuk k-means pada gumpalan. Ia tidak dapat menjadi wasit antarmetode pada bentuk yang berbeda. Plot hasilnya lebih dulu. Inertia punya batas yang sama, dan hanya ada untuk k-means.

## Contoh hitungan: penguin
*Apa yang terjadi pada pilihan sebuah metode ketika kolom-kolomnya berukuran berbeda?*

> Contoh hitungan: 342 penguin memiliki keempat pengukuran lengkap: panjang paruh, kedalaman paruh, panjang sirip, dan massa tubuh. Jalankan k-means dengan k = 3 dan 10 restart.

Simpangan baku keempatnya adalah 5,5 mm, 2,0 mm, 14,0 mm, dan 800,8 g. Ambil dua penguin pertama di file. Selisihnya 0,4 mm, 1,3 mm, 5 mm, dan 50 g. Setelah dikuadratkan menjadi 0,16, 1,69, 25, dan 2.500, yang jumlahnya 2.526,85. Massa tubuh menyumbang 2.500 / 2.526,85, sekitar 98,9 persen, dari jarak kuadrat, sehingga tiga kolom lainnya nyaris tidak berarti.

Sekarang bandingkan cluster-nya. Pada kolom mentah, skor silhouette-nya 0,58, dan 68 persen penguin berada di cluster yang spesies terbanyaknya sama dengan spesiesnya sendiri. Setelah standardisasi setiap kolom, silhouette turun menjadi 0,45 tetapi persentasenya naik menjadi 92 persen.

[[figure:choosing-an-algorithm/penguins-scaling|k-means pada penguin: standardisasi menurunkan skor silhouette dan memperbaiki kecocokan dengan spesies.]]

Spesies tidak dipakai untuk clustering; ia hanya dipakai untuk memeriksa hasilnya. Cluster dari kolom mentah padat hanya pada massa tubuh, sehingga skornya bagus tetapi maknanya kecil.

## Pemeriksaan untuk setiap metode
*Apa yang harus kamu lakukan, apa pun metode yang dipilih?*

1. **Plot hasilnya.** Skor tinggi pada pengelompokan yang tampak salah mudah didapat, seperti ditunjukkan cincin tadi.
2. **Lakukan scaling pada feature.** Semua metode di sini memakai jarak, sehingga kolom dengan angka besar mengambil alih, seperti massa tubuh tadi.
3. **Uji kestabilan.** Ganti seed, restart, atau linkage, atau geser eps sedikit. Pada kepadatan yang tidak seimbang, DBSCAN dengan MinPts 4 menghasilkan 2 cluster dan 11 titik noise pada eps 1,0, tetapi 4 cluster dan 29 titik noise pada eps 0,5. Hasil yang berubah sebesar itu perlu dilihat lagi.
4. **Bandingkan dua metode yang melihat bentuk secara berbeda.** Pasangkan k-means dengan DBSCAN atau single linkage. Kalau keduanya sepakat, strukturnya kemungkinan nyata; kalau tidak, cari tahu sebabnya. k-means dan ward hampir kembar, sehingga kesepakatan keduanya tidak banyak berarti: pada dua cincin mereka sepakat dan sama-sama salah.
5. **Jelaskan tiap kelompok dengan kata-kata.** Kalau kamu tidak bisa, atau dua kelompok tampak sama bagi orang, clustering itu belum siap.

::: deeper Ketika tidak ada metode yang sesuai
Kelompok dengan kepadatan yang sangat berbeda membebani DBSCAN, karena satu eps harus cocok untuk semuanya. Feature yang terlalu banyak melemahkan setiap metode berbasis jarak, karena jarak antartitik mulai tampak seragam. Maka perbaikannya biasanya ada di data: simpan feature yang lebih sedikit tetapi lebih baik, lakukan scaling, lalu lakukan clustering lagi.
:::

## Kembali ke lab
*Di mana kamu dapat menguji tabel ini sendiri?*

Tabel keputusan adalah kumpulan prediksi, dan lab memungkinkan kamu mengujinya. Kembali ke lab Cluster methods dan jalankan k-means, hierarchical clustering, dan DBSCAN pada gumpalan, cincin, dan kepadatan yang tidak seimbang. Sebelum tiap percobaan, sebutkan baris tabel mana yang berlaku dan metode mana yang kamu duga paling baik. Kemudian jalankan, dan jelaskan kejutan yang muncul dengan pertanyaan tentang bentuk, noise, k, ukuran, dan kemudahan dijelaskan.

Di sini pula kursus ini berakhir. Sekarang kamu dapat mengelompokkan titik berdasarkan centroid, penggabungan, dan kepadatan, memeriksa hasil dengan skor silhouette, dan memilih metode untuk sebuah masalah, bukan sekadar memakai metode favorit.

::: remember
- Pilih metode berdasarkan bentuk kelompok, noise, apakah kamu dapat menyebut k, ukuran data, dan siapa yang harus memahami hasilnya.
- Skor seperti silhouette dapat menguntungkan pengelompokan yang salah, jadi plot, lakukan scaling, uji kestabilan, dan jelaskan tiap kelompok sebelum kamu mempercayainya.
- Bandingkan dua metode yang melihat bentuk secara berbeda ketika kamu ragu; kesepakatan keduanya adalah bukti, dan ketidaksepakatan adalah pertanyaan.
:::
