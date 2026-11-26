---
slug: outliers-and-correlation
title: Outlier dan korelasi
---
::: intro
- Jelaskan bagaimana satu outlier menggeser rata-rata, median, dan sebaran data.
- Baca scatterplot untuk melihat arah, kekuatan, dan bentuk hubungan.
- Hitung dan tafsirkan korelasi r, serta pahami apa yang tidak dapat dikatakannya.

Sebelum mulai: baca "Pusat dan sebaran data".
:::

## Apa itu outlier
*Apa yang membuat satu nilai tampak berbeda dari yang lain?*

**Outlier** adalah nilai yang letaknya jauh dari nilai-nilai lain dalam kolomnya. Tidak ada garis tegas antara "jauh" dan "biasa". Ini adalah penilaian, dan aturan dalam pelajaran ini hanya membuat penilaian itu dapat diulang dengan cara yang sama.

Outlier muncul dari tiga sumber:

- **Kesalahan.** Seseorang mengetik 950 padahal maksudnya 95, atau sensor melaporkan -999 saat sedang dimatikan.
- **Kasus langka tetapi nyata.** Satu rumah di deretan rumah kecil ternyata sebuah mansion.
- **Kelompok yang berbeda.** Pesawat jumbo jet di tengah daftar mobil penumpang kecil memang nyata, tetapi tidak termasuk kelompok mobil itu.

Penyebabnya penting, karena menentukan apa yang kamu lakukan. Kesalahan sebaiknya diperbaiki atau dibuang. Kasus nyata bisa jadi baris paling menarik dalam tabel. Kamu tidak dapat membedakannya hanya dari angkanya. Kamu perlu menelusuri asal data tersebut.

> Gagasan kunci: outlier adalah pertanyaan, bukan vonis. Periksa dulu, baru putuskan.

## Bagaimana outlier menarik rata-rata
*Angka ringkasan mana yang berubah karena satu nilai ekstrem?*

Ambil enam waktu pengantaran dalam menit: 22, 25, 24, 27, 23, 26. Setelah diurutkan: 22, 23, 24, 25, 26, 27. Lalu satu pengantaran terjebak macet dan memakan waktu 95 menit.

> Contoh hitungan: sebelum ada outlier, rata-rata adalah (22 + 25 + 24 + 27 + 23 + 26) / 6 = 147 / 6 = 24,5, dan median adalah rata-rata dua nilai tengah, (24 + 25) / 2 = 24,5. Setelah 95 ditambahkan, rata-rata menjadi 242 / 7 = 34,57 (dibulatkan). Median adalah nilai tengah dari tujuh nilai yang terurut, yaitu yang keempat: 25.

Rata-rata melonjak sekitar 10 menit, ke angka yang tidak didekati satu pun pengantaran biasa. Median hanya bergeser setengah menit. Rata-rata memakai semua nilai dalam penjumlahan, sehingga nilai yang sangat besar menariknya. Median hanya memakai urutan nilai, sehingga angka 95 baginya hanyalah "yang terbesar".

[[figure:outliers-and-correlation/mean-vs-median|Pengantaran yang sama sebelum dan sesudah ditambah 95 menit. Rata-rata (berlian) mengejar outlier; median (batang) tetap bersama kerumunan.]]

Ringkasan yang nyaris tidak bergerak ketika satu nilai berubah disebut **robust**. Median bersifat robust, sedangkan rata-rata tidak.

## Menemukan outlier
*Bagaimana menandai outlier tanpa menebak-nebak?*

Pertama, lihat saja: urutkan kolomnya, atau gambar pada garis bilangan, lalu perhatikan apakah ada nilai yang menyendiri. Untuk aturan yang dapat diulang, gunakan **aturan 1,5 x IQR**.

**Kuartil** membagi data terurut menjadi empat bagian. Q1 adalah median dari separuh bawah, Q3 median dari separuh atas, dan **IQR** (interquartile range) adalah Q3 - Q1. Sebuah nilai ditandai jika berada di bawah Q1 - 1,5 x IQR atau di atas Q3 + 1,5 x IQR.

> Contoh hitungan: untuk 22, 23, 24, 25, 26, 27, 95, mediannya 25. Separuh bawahnya 22, 23, 24, sehingga Q1 = 23. Separuh atasnya 26, 27, 95, sehingga Q3 = 27. IQR-nya 27 - 23 = 4, dan 1,5 x 4 = 6. Batasnya adalah 23 - 6 = 17 dan 27 + 6 = 33. Nilai 95 berada di atas 33, jadi ditandai. Semua nilai lain berada di dalam batas.

## Rentang dan IQR
*Seberapa jauh angka sebaran bergeser ketika sebuah outlier bergabung?*

Bandingkan dengan keenam nilai sebelum ada outlier: IQR-nya 3 (Q1 = 23, Q3 = 26) dan rentangnya, yaitu nilai terbesar dikurangi nilai terkecil, adalah 5. Setelah 95 ditambahkan, IQR-nya 4 tetapi rentangnya 73. IQR hanya bergeser dari 3 ke 4, sedangkan rentang melonjak dari 5 ke 73.

Simpangan baku melonjak dari sekitar 1,9 menjadi sekitar 26,7, karena ia memakai selisih kuadrat dari rata-rata.

Tiap tool menghitung kuartil dengan cara yang sedikit berbeda, sehingga sebuah library dapat memberi IQR yang sedikit berlainan. Aturan ini juga hanya memberi tanda, bukan keputusan. Outlier yang kamu tandai mungkin justru yang paling ingin kamu pahami.

> Awas: aturan ini hanya menandai nilai pada satu kolom. Sebuah titik bisa tampak biasa pada tiap kolom secara terpisah, tetapi aneh sebagai pasangan. Di sinilah scatterplot membantu.

## Membaca scatterplot
*Apa yang terlihat ketika dua kolom berbagi satu gambar?*

**Scatterplot** menggambar satu titik untuk tiap baris. Posisi horizontal adalah satu kolom numerik, posisi vertikal adalah kolom lainnya. Ia menjawab pertanyaan yang tidak dapat dijawab satu kolom: apakah kedua kolom ini bergerak bersama?

Baca scatterplot dalam empat langkah:

1. **Arah.** Apakah titik-titik naik dari kiri ke kanan, turun, atau tidak miring sama sekali?
2. **Kekuatan.** Apakah titik-titik rapat mengikuti sebuah garis, atau membentuk awan yang longgar?
3. **Bentuk.** Apakah tren itu garis lurus, kurva, atau dua gerombol yang terpisah?
4. **Titik ganjil.** Adakah titik yang jauh dari yang lain?

Jika nilai yang lebih tinggi pada satu kolom disertai nilai yang lebih tinggi pada kolom lain, hubungannya **positif**. Jika yang lebih tinggi disertai yang lebih rendah, hubungannya **negatif**. Jika awan titik tidak miring, tidak ada pola linear.

[[figure:outliers-and-correlation/scatter-patterns|Empat scatterplot dengan masing-masing 16 titik, beserta korelasi r-nya. Yang terakhir punya pola yang jelas, yaitu kurva, tetapi r-nya mendekati nol.]]

Selalu gambar scatterplot sebelum mempercayai satu angka pun tentangnya. Bagian berikutnya menunjukkan alasannya.

## Korelasi: satu angka untuk tren garis lurus
*Bagaimana kemiringan scatterplot dijadikan satu angka?*

**Koefisien korelasi**, ditulis **r**, mengukur seberapa rapat dua kolom mengikuti garis lurus. Nilainya selalu berada di antara -1 dan 1:

- **r mendekati 1:** titik-titik naik rapat sepanjang sebuah garis.
- **r mendekati -1:** titik-titik turun rapat sepanjang sebuah garis.
- **r mendekati 0:** tidak ada tren garis lurus.

Untuk menghitungnya, ambil rata-rata tiap kolom, lalu untuk setiap baris kalikan kedua jarak dari rata-rata itu. Jumlahkan hasil kalinya, lalu bagi dengan akar dari hasil kali kedua jumlah jarak kuadrat.

> Contoh hitungan: lima siswa, jam belajar x = 1, 2, 3, 4, 5 dan nilai ujian y = 50, 55, 65, 60, 70. Rata-ratanya 3 dan 60. Jarak untuk x adalah -2, -1, 0, 1, dan 2, sedangkan untuk y adalah -10, -5, 5, 0, dan 10. Hasil kalinya 20, 5, 0, 0, dan 20, dengan jumlah 45. Jumlah jarak kuadratnya 10 untuk x dan 250 untuk y. Maka r = 45 / sqrt(10 x 250) = 45 / 50 = 0,90.

Nilai r sebesar 0,90 berarti tren naik yang kuat. Tandanya menunjukkan arah. Besarnya menunjukkan seberapa rapat titik-titik mengikuti garis. Ia tidak menunjukkan kemiringan: garis yang curam dan yang landai dapat memiliki r yang sama.

## Satu titik dapat membalik r
*Apa yang terjadi pada korelasi ketika sebuah outlier bergabung?*

Korelasi dibangun dari jarak ke rata-rata, dan jarak kuadrat memberi bobot besar pada jarak yang jauh, sehingga outlier berpengaruh sangat besar. Tambahkan siswa keenam pada contoh tadi: 6 jam belajar dan nilai 30.

> Contoh hitungan: sekarang rata-ratanya 3,5 dan 55. Hasil kali jaraknya 12,5; 0; -5; 2,5; 22,5; dan -62,5, dengan jumlah -30. Jumlah jarak kuadratnya 17,5 untuk x dan 1000 untuk y. Maka r = -30 / sqrt(17,5 x 1000) = -0,23. Satu siswa menggeser r dari 0,90 ke -0,23: tren yang tadinya naik curam kini tampak turun.

::: deeper Mengapa jarak kuadrat berpengaruh
Pada contoh lima titik, hasil kali terbesar adalah 20. Pada versi enam titik, siswa baru itu sendiri menyumbang -62,5, sedangkan kelima lainnya bersama-sama menyumbang 32,5, sehingga satu titik menentukan tandanya. Jarak y-nya sebesar -25 juga menyumbang 625 dari 1000 di penyebut. Titik yang jauh dari kedua rata-rata dapat mendominasi kedua jumlah sekaligus. Versi korelasi berbasis peringkat, seperti Spearman, kurang sensitif terhadap hal ini, tetapi pelajaran ini tidak memerlukannya.
:::

## Satu titik dapat menciptakan r
*Bisakah satu titik menciptakan tren yang sebenarnya tidak ada?*

Kebalikannya juga terjadi. Sepuluh titik tanpa pola memiliki r sekitar -0,08. Tambahkan satu titik jauh di kanan atas, di (20, 20), dan r menjadi 0,82. "Hubungan" itu hanyalah satu titik tersebut.

[[figure:outliers-and-correlation/outlier-on-r|Satu titik tambahan dapat membalik korelasi (kiri ke tengah) atau menciptakannya (kanan). Titik yang dilingkari adalah titik yang ditambahkan.]]

> Gagasan kunci: r yang kuat akibat satu titik jauh bukan bukti adanya tren. Periksa scatterplot, lalu coba hitung korelasi dengan dan tanpa titik yang dicurigai.

## Yang tidak dikatakan korelasi
*Apa yang tetap tidak boleh disimpulkan dari r yang tinggi?*

- **Korelasi bukan sebab-akibat.** Penjualan es krim dan kasus sunburn sama-sama naik di musim panas. Matahari yang menggerakkan keduanya. Nilai r yang kuat hanya berkata bahwa kolom-kolom itu bergerak bersama, bukan mengapa.
- **r hanya melihat garis lurus.** Panel berbentuk U pada gambar scatterplot di atas punya pola yang jelas, tetapi r-nya mendekati 0. Satu angka tidak dapat menggantikan gambarnya.
- **Kelompok yang bercampur dapat menyembunyikan tren.** Pada 342 penguin yang punya kedua pengukuran, panjang dan kedalaman paruh memiliki r sebesar -0,24. Namun di dalam tiap spesies, hubungannya positif: r adalah 0,39 untuk Adelie, 0,65 untuk Chinstrap, dan 0,64 untuk Gentoo. Menggabungkan spesies justru membalik tandanya.
- **Ia hanya menggambarkan sampel ini.** Korelasi dari sedikit baris mudah berubah ketika ada data baru.

Pada data penguin, panjang sirip dan massa tubuh memang bergerak bersama dengan kuat (r sekitar 0,87), dan itu hal yang masuk akal untuk diperiksa sebelum mempercayai model yang memakai salah satunya untuk memprediksi yang lain.

Pada lab yang menutup course ini, kamu akan menambahkan outlier sendiri dan melihat rata-rata, median, dan r bergerak pada data buatan, lalu memeriksa gagasan yang sama pada pengukuran penguin yang sebenarnya.

::: remember
- Satu outlier menarik rata-rata dan sebaran, sedangkan median dan IQR bergerak jauh lebih sedikit, jadi tanyakan dulu asal sebuah outlier sebelum membuangnya.
- Scatterplot menunjukkan arah, kekuatan, bentuk, dan titik ganjil; korelasi r hanya mengubah bagian garis lurusnya menjadi angka dari -1 sampai 1.
- Satu titik jauh dapat menciptakan, menyembunyikan, atau membalik korelasi, dan korelasi tidak pernah membuktikan hubungan sebab-akibat.
:::
