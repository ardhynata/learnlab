---
slug: data-features-labels
title: Data, feature, dan label
---
::: intro
- Baca sebuah tabel data sebagai observasi (baris), feature (kolom input), dan target (kolom yang ingin diprediksi).
- Bedakan feature numerik dari feature kategorikal, lalu pahami mengapa model membutuhkan angka.
- Kenali kolom yang tidak pantas masuk ke model, dan tangani missing value dengan hati-hati.

Sebelum mulai: tidak ada yang perlu disiapkan. Ini pelajaran pertama di kursus ini.
:::

## Tabel observasi
*Data apa yang dipelajari model, dan terdiri dari bagian apa saja?*

Banyak masalah machine learning berawal dari sebuah tabel. Setiap **baris** adalah satu **observasi**: satu hal yang kita amati dan ukur, misalnya satu penguin, satu rumah, atau satu pelanggan. (Buku lain menyebutnya contoh atau sampel.) Setiap **kolom** mencatat jenis fakta yang sama untuk semua observasi.

Kursus ini memakai tabel nyata: hasil pengukuran 344 penguin dari tiga spesies, yang dikumpulkan di tiga pulau di Antartika. Berikut enam baris di antaranya.

[[figure:data-features-labels/table-anatomy|Enam dari 344 penguin. Setiap baris adalah satu observasi. Kolom biru adalah feature, kolom kuning adalah target, dan kolom pertama hanya menghitung baris.]]

> Contoh hitungan: bacalah baris #154 sebagai sebuah kalimat. Penguin #154 adalah Gentoo dari pulau Biscoe. Paruhnya sepanjang 50,0 mm dan sedalam 16,3 mm, siripnya 230 mm, beratnya 5.700 g, dan ia berjenis kelamin jantan.

Itulah satu observasi: tujuh fakta tentang satu penguin. Angka #154 hanya menunjukkan nomor barisnya. (File itu juga punya kolom tahun, yang kita abaikan di sini.)

## Feature dan target
*Kolom mana yang menjadi masukan, dan kolom mana yang ingin kita prediksi?*

Kolom yang kita masukkan ke model disebut **feature**. Kolom yang ingin diprediksi oleh model disebut **target**. Banyak buku menyebut target sebagai **label**, dan di kursus ini kedua kata itu berarti hal yang sama. Model mempelajari baris-baris yang menampilkan keduanya, lalu memprediksi target penguin baru hanya dari feature-nya.

Kolom mana yang menjadi target? Tabel tidak menentukannya. Pertanyaannyalah yang menentukan. Kalau kamu bertanya "penguin ini spesies apa?", targetnya adalah spesies. Kalau kamu bertanya "berapa beratnya?", targetnya adalah massa tubuh, dan spesies menjadi salah satu feature.

> Gagasan kunci: satu tabel yang sama dapat melayani banyak pertanyaan. Feature adalah apa yang sudah kita ketahui saat bertanya, sedangkan target adalah apa yang ingin kita cari tahu.

Pada gambar di atas, spesies adalah target, sedangkan panjang paruh, kedalaman paruh, panjang sirip, dan massa tubuh adalah empat di antara feature-nya. Kolom pulau dan jenis kelamin juga dapat dijadikan feature.

## Feature numerik
*Apa yang dapat kamu lakukan dengan feature yang berupa kuantitas?*

Feature **numerik** adalah sebuah kuantitas. Nilai yang lebih besar berarti lebih banyak dari sesuatu, sehingga nilainya dapat dibandingkan, dijumlahkan, dan dirata-ratakan. Panjang paruh, panjang sirip, dan massa tubuh bersifat numerik. Masing-masing punya **satuan**, dan satuan itu penting: massa tubuh di tabel memakai gram, sehingga 5.700 berarti 5.700 g, atau 5,7 kg.

Ukuran angkanya bisa berbeda jauh. Dari 342 penguin yang berhasil diukur, panjang sirip berkisar dari 172 sampai 231 mm, sedangkan massa tubuh berkisar dari 2.700 sampai 6.300 g. Kolom kilogram dan kolom gram menggambarkan hewan yang sama dengan angka yang tampak sangat berbeda. Pelajaran-pelajaran di bagian selanjutnya menjelaskan mengapa hal ini penting ketika model membandingkan penguin.

Feature numerik ada dua jenis. Hasil pengukuran seperti panjang dapat bernilai apa saja dalam sebuah rentang. Hasil penghitungan, misalnya jumlah telur dalam satu sarang, hanya berupa bilangan bulat. Keduanya tetap numerik.

Gunakan uji di awal bagian ini: apakah nilai yang lebih besar berarti lebih banyak? Kalau ya, feature itu numerik.

## Feature kategorikal
*Bagaimana kalau sebuah feature berupa nama, bukan kuantitas?*

Feature **kategorikal** berisi sebuah nama dari himpunan yang tetap. Di tabel penguin, pulau bersifat kategorikal: Biscoe, Dream, atau Torgersen. Begitu pula jenis kelamin dan spesies. Kamu dapat menghitung berapa penguin di setiap kategori, tetapi tidak dapat merata-ratakannya.

Angka dapat menyembunyikan kategori. Misalkan kita memberi kode 1 untuk Biscoe, 2 untuk Dream, dan 3 untuk Torgersen. Rata-rata Biscoe (1) dan Torgersen (3) adalah 2, yang berarti "Dream", dan itu tidak masuk akal. Kode-kode itu hanyalah label nama. Kode pos atau nomor bus bekerja dengan cara yang sama.

> Awas: kolom berisi angka belum tentu feature numerik. Tanyakan apakah nilai yang lebih besar berarti lebih banyak dari sesuatu.

Kebanyakan model menghitung dengan angka, sehingga sebuah kategori harus diubah menjadi angka sebelum model dapat memakainya. Kursus "Menyiapkan data tabular" menunjukkan cara standarnya.

[[figure:data-features-labels/feature-types|Feature numerik terletak pada sebuah skala dan nilainya dapat dirata-ratakan. Feature kategorikal adalah himpunan nama yang hanya dapat dihitung.]]

::: deeper Feature ordinal: kategori yang berurutan
Sebagian kategori punya urutan tetapi jaraknya tidak pasti: kecil, sedang, dan besar, atau peringkat satu sampai lima bintang. Ini disebut feature **ordinal**. Besar memang lebih dari kecil, tetapi selisih dari kecil ke sedang belum tentu sama dengan selisih dari sedang ke besar. Feature ordinal dapat diperlakukan sebagai kategori, dan kadang sebagai angka. Mana yang lebih baik bergantung pada masalahnya.
:::

## Observasi adalah sebuah titik
*Bagaimana sebuah baris menjadi sesuatu yang dapat dibandingkan oleh model?*

Pilih dua feature numerik dan jadikan keduanya sumbu sebuah plot. Setiap penguin menjadi satu titik, yang posisinya ditentukan oleh panjang sirip dan massa tubuhnya. Target menentukan warna titik itu.

[[figure:data-features-labels/rows-as-points|Panjang sirip dan massa tubuh dari 36 penguin nyata, ditambah penguin #154 (dilingkari), diberi warna menurut spesies.]]

Plot ini memperlihatkan sebuah struktur. Penguin Gentoo berada di kanan atas. Di seluruh 342 penguin yang berhasil diukur, rata-rata Gentoo sekitar 5.076 g, dibandingkan 3.701 g untuk Adelie, selisih kira-kira 1.375 g. Adelie dan Chinstrap saling tumpang tindih, sehingga kedua feature ini kurang dapat membedakan keduanya. Model bekerja di ruang yang sama, hanya dengan lebih banyak sumbu: empat feature numerik berarti empat sumbu. Model menilai penguin baru dari posisinya di ruang itu.

Itu pula alasan feature perlu berupa angka. Sebuah posisi memerlukan koordinat, sedangkan sebuah nama tidak punya koordinat. Baris dengan feature yang mirip akan berada berdekatan, dan gagasan ini muncul lagi di pelajaran tentang jarak dan nearest neighbors.

## Kolom yang tidak pantas dipakai
*Kolom mana yang sebaiknya tidak dimasukkan ke model?*

Tidak semua kolom sesuai dijadikan feature. Ada tiga jenis yang menimbulkan masalah.

- **Nomor baris atau ID.** Di file ini baris diurutkan menurut spesies: baris 1 sampai 152 adalah Adelie, 153 sampai 276 Gentoo, dan 277 sampai 344 Chinstrap. Model dapat mempelajari "baris 154 berarti Gentoo" dan mendapat skor sempurna pada file ini. Penguin baru tidak punya nomor baris seperti itu, sehingga model akan gagal.
- **Salinan target.** Kalau kamu memprediksi massa tubuh dalam gram, kolom massa dalam kilogram sudah membocorkan jawabannya. Itu angka yang sama dalam satuan lain.
- **Apa pun yang belum diketahui saat prediksi dibuat.** Sebuah feature harus tersedia saat kamu mengajukan pertanyaan, bukan baru sesudahnya. Kalau kamu memprediksi apakah seorang pelanggan akan berhenti, kolom yang mencatat bahwa ia menelepon untuk membatalkan baru diketahui sesudahnya. Untuk penguin, massa yang ditimbang setelah pemberian makan berikutnya belum diketahui pada saat pertanyaan diajukan.

Dua jenis pertama tampak berguna di tabel, tetapi tidak berguna untuk penguin baru, dan jenis ketiga gagal dengan cara yang sama saat dipakai. Setiap kali sebuah skor terlihat terlalu bagus, periksalah kolom-kolomnya lebih dulu.

## Missing value
*Apa yang kamu lakukan kalau sebuah sel kosong?*

Tabel di dunia nyata punya bagian yang kosong. Di file penguin, sel kosong ditulis NA. Baris #4 berisi NA pada semua pengukuran dan pada kolom jenis kelamin, begitu juga baris #272, sehingga 342 dari 344 penguin memiliki hasil pengukuran. Sembilan penguin lain hanya tidak memiliki data jenis kelamin. Secara keseluruhan, 11 baris punya setidaknya satu sel kosong, dan 333 baris lengkap.

Ada tiga cara sederhana untuk menangani sel kosong.

1. **Buang barisnya.** Mudah, tetapi kamu kehilangan pengukuran lain milik penguin itu: tersisa 333 baris dari 344.
2. **Isi dengan sebuah nilai**, misalnya rata-rata kolom. Baris tetap dipertahankan, tetapi kamu menaruh sebuah tebakan ke dalam tabel.
3. **Perbaiki dari sumbernya**, kalau memungkinkan: ukur ulang penguin itu.

> Awas: jangan pernah mengisi sel kosong dengan 0 hanya supaya model dapat berjalan. Untuk panjang sirip, 0 mm adalah angka sungguhan yang berarti "tidak punya sirip".

Cara terbaik bergantung pada banyaknya sel kosong dan penyebabnya. Hitunglah selalu jumlahnya lebih dulu.

## Satu tabel, tiga pertanyaan
*Apa saja yang dapat ditanyakan dari satu tabel?*

Lihat sekali lagi tabel penguin, lalu tanyakan apa yang ingin kamu ketahui.

[[figure:data-features-labels/three-targets|Satu tabel, tiga pertanyaan. Target numerik, target kategorikal, atau tanpa target sama sekali.]]

Target numerik, seperti massa tubuh, menanyakan "berapa banyak?". Target kategorikal, seperti spesies, menanyakan "yang mana?". Tanpa target sama sekali, kamu bertanya "penguin mana saja yang mirip?". Pelajaran berikutnya memberi nama pada ketiga tugas ini dan menunjukkan cara belajar masing-masing.

Di lab pada akhir kursus ini, kamu akan memakai satu tabel penguin nyata untuk mengajukan ketiga pertanyaan itu: kamu memilih sendiri targetnya, mengubah feature-nya, lalu melihat bagaimana pertanyaan mengubah apa yang dapat dilakukan model.

::: remember
- Baris adalah observasi, kolom adalah feature, dan target adalah satu kolom yang ingin diprediksi. Pertanyaanlah yang menentukan kolom itu.
- Feature numerik adalah kuantitas, tempat nilai yang lebih besar berarti lebih banyak. Feature kategorikal adalah nama, bahkan ketika ditulis sebagai angka.
- Buang ID, salinan target, dan apa pun yang belum diketahui saat prediksi dibuat, lalu hitung missing value sebelum memutuskan cara menanganinya.
:::
