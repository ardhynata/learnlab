---
slug: learning-tasks
title: Supervised, unsupervised, dan tiga pertanyaan
---
::: intro
- Sebutkan tiga learning task, yaitu regression, classification, dan clustering, beserta pertanyaan yang diajukan masing-masing.
- Pilih task yang tepat untuk sebuah pertanyaan dengan melihat kolom mana yang ingin kamu prediksi.
- Jelaskan cara menilai hasil untuk tiap task.

Sebelum mulai: baca "Data, feature, dan label".
:::

## Satu tabel, tiga pertanyaan
*Bagaimana satu tabel dapat melahirkan tiga task yang berbeda?*

Pelajaran ini memakai data nyata: ukuran tubuh penguin dari tiga pulau di Antartika yang dikumpulkan oleh peneliti di Palmer Station. Tabel di bawah menampilkan enam di antaranya. Panjang diukur dalam milimeter dan massa dalam gram.

| Penguin | Panjang paruh | Panjang sirip | Massa tubuh | Spesies |
|---|---|---|---|---|
| 1 | 39,1 | 181 | 3.750 | Adelie |
| 2 | 40,3 | 195 | 3.250 | Adelie |
| 3 | 46,5 | 192 | 3.500 | Chinstrap |
| 4 | 50,0 | 196 | 3.900 | Chinstrap |
| 5 | 46,1 | 211 | 4.500 | Gentoo |
| 6 | 50,0 | 230 | 5.700 | Gentoo |

Tabel ini tidak memberi tahu apa yang harus dipelajari. Itu pilihanmu, dan pilihan itulah yang menentukan *task*-nya, yaitu jenis tugas pembelajarannya. Kamu bisa bertanya *berapa berat penguin ini?*, atau *spesies apa penguin ini?*, atau *apakah penguin-penguin ini membentuk kelompok alami?* Ketiganya memakai baris dan feature yang sama, tetapi masing-masing adalah jenis pembelajaran yang berbeda.

[[figure:learning-tasks/three-cards|Satu tabel, tiga pertanyaan. Kolom yang diwarnai pada tiap kartu adalah kolom yang harus diprediksi model; clustering tidak punya kolom seperti itu.]]

## Regression: berapa banyak?
*Seperti apa rasanya memprediksi sebuah angka?*

Pertanyaan **regression** bertanya *berapa banyak?* Jawabannya berupa angka dari rentang yang kontinu, misalnya massa, harga, atau keterlambatan dalam menit. Kolom target berisi angka, sehingga keluaran model juga berupa angka.

Ambil pertanyaan ini: berapa berat penguin dengan sirip sepanjang sekian milimeter? Panjang sirip dan massa naik bersama-sama, sehingga garis lurus adalah percobaan pertama yang masuk akal. Garis yang dicocokkan dengan data seluruh 342 penguin yang terukur kira-kira berbentuk

massa = -5781 + 49,7 × sirip

dalam gram dan milimeter. Setiap tambahan satu milimeter sirip menambah massa sekitar 50 g.

> Contoh hitungan: untuk penguin 2 dengan sirip 195 mm, 49,7 × 195 = 9.691,5 dan 9.691,5 - 5.781 = 3.910,5, sehingga model memprediksi sekitar 3.910 g. Timbangan menunjukkan 3.250 g. Model terlalu tinggi 660,5 g.

Regression dinilai dari seberapa jauh angka prediksinya dari angka yang sebenarnya, dalam satuan target: di sini, gram.

## Classification: yang mana?
*Apa yang berubah ketika jawabannya berupa nama, bukan angka?*

Pertanyaan **classification** bertanya *yang mana?* Jawabannya adalah sebuah **kelas** (*class*), yaitu nama dari daftar yang tetap: Adelie, Chinstrap, atau Gentoo; spam atau bukan spam; sakit atau sehat. Kolom target berisi kategori.

Untuk tiga spesies, pertanyaannya adalah "yang mana dari tiga?". Pertanyaan yang lebih sederhana hanya menyisakan dua kelas: apakah penguin ini Gentoo atau bukan? Berikut aturan dengan satu feature: jika sirip panjangnya minimal 208 mm, jawab Gentoo; selain itu, jawab bukan Gentoo. Pada enam penguin di atas, aturan ini selalu benar. Dari seluruh 342 penguin yang terukur, aturan ini benar untuk 334, yaitu 97,7%. Skor itu memakai penguin yang sama dengan yang memberi ide aturannya, sehingga agak terlalu optimistis; pelajaran berikutnya menunjukkan cara menguji pada data yang belum pernah dilihat.

Apakah itu bagus? Bandingkan dengan aturan paling sederhana. Dari 342 penguin, 123 adalah Gentoo dan 219 bukan, sehingga jawaban "bukan Gentoo" terus-menerus benar untuk 219 dari 342, yaitu 64,0%. Sebuah classifier harus mengalahkan **baseline** ini. Benar 334 kali jelas mengalahkannya.

> Awas: kelas adalah nama, meskipun ditulis sebagai angka. Jika spesies disimpan sebagai 1, 2, dan 3, task-nya tetap classification. "Rata-rata spesies 2,4" tidak berarti apa-apa.

## Clustering: mana yang satu kelompok?
*Apa yang dapat ditanyakan ketika sama sekali tidak ada kolom jawaban?*

Sekarang sembunyikan kolom spesies. Tabel hanya berisi ukuran dan tidak ada yang diprediksi. Kamu tetap dapat bertanya *apakah penguin-penguin ini membentuk kelompok?* Itulah **clustering**: model mengelompokkan baris-baris yang mirip, hanya dengan memakai feature.

Ada dua hal yang perlu diketahui. Pertama, pada k-means, metode yang paling umum (modul berikutnya mengajarkannya), kamu sendiri yang menentukan berapa kelompok yang dicari, yaitu angka yang disebut k, sebelum mulai. Kedua, kelompok muncul sebagai "kelompok 0" dan "kelompok 1", bukan sebagai nama. Seseorang harus melihat anggotanya lalu memutuskan apa arti sebuah kelompok. Sering kali itu membutuhkan pengetahuan yang lebih banyak daripada isi tabel.

Clustering bersifat **unsupervised**: tidak ada label yang membimbingnya. Ini task unsupervised yang pertama kamu temui; ada task unsupervised lain. Regression dan classification bersifat **supervised**: setiap baris data latih datang bersama jawabannya.

::: deeper Apakah kelompoknya sesuai dengan spesies?
Kita dapat memeriksanya, karena tabel ini kebetulan memiliki spesies. Pada satu run k-means, metode clustering yang umum, dengan k = 2 atas empat ukuran (masing-masing diskalakan agar tidak ada kolom yang mendominasi), satu kelompok berisi 123 penguin, semuanya Gentoo. Kelompok lainnya berisi 219: seluruh 151 Adelie dan seluruh 68 Chinstrap. Metode ini tidak pernah melihat kolom spesies, namun berhasil menemukan Gentoo. Adelie dan Chinstrap tetap bersama pada run itu, sehingga diperlukan k yang berbeda, atau feature yang berbeda, untuk memisahkan keduanya.
:::

## Memilih task
*Bagaimana menentukan task dari sebuah masalah?*

Lihat kolom yang ingin kamu prediksi. Dua pertanyaan, berurutan, menentukannya: apakah kolom seperti itu ada, dan apakah isinya angka atau nama?

[[figure:learning-tasks/task-chooser|Memilih task: pertama tanyakan apakah ada kolom yang diprediksi, lalu apakah isinya angka atau nama.]]

Tabel lain bekerja dengan cara yang sama. Tabel rumah dengan kolom harga jual dapat menjadi pertanyaan regression: berapa harga jual rumah ini? Ubah data yang sama menjadi ya atau tidak, apakah laku dalam sebulan?, dan itu menjadi classification. Buang harga dan hasil penjualan, lalu tanyakan rumah mana yang mirip satu sama lain, dan itu menjadi clustering.

> Gagasan kunci: task bukanlah sifat dari tabel. Task berasal dari pertanyaan yang kamu ajukan dan kolom yang kamu pilih sebagai target.

Task supervised membutuhkan baris berlabel, dan label sering kali memakan usaha: seseorang harus menimbang dan mengenali setiap penguin. Clustering tidak membutuhkannya, tetapi hasilnya berupa kelompok yang harus ditafsirkan, bukan jawaban.

## Menilai tiap hasil
*Bagaimana mengetahui apakah sebuah hasil sudah baik?*

Setiap task punya ukurannya sendiri.

- **Regression:** seberapa jauh angka prediksinya meleset? Galatnya dalam satuan target. Penguin 2 meleset 660,5 g.
- **Classification:** berapa persen jawaban yang benar, dan apakah melampaui baseline? Aturan Gentoo mendapat 97,7% dibandingkan 64,0%.
- **Clustering:** tidak ada kunci jawaban, sehingga tidak ada jumlah kelompok yang "benar". Kamu menilai apakah kelompoknya stabil ketika dijalankan ulang (sebagian metode memulai dari tebakan acak), dan apakah kelompok itu berguna serta masuk akal bagi orang yang menguasai bidangnya.

[[figure:learning-tasks/three-outputs|Tiga keluaran dari 18 penguin nyata: sebuah garis yang dicocokkan dengan data, sebuah aturan yang memisahkan dua kelas, dan dua kelompok yang ditemukan tanpa label.]]

Ketiga keluaran itu adalah bentuk yang digambar di atas titik-titik yang sama. Yang berbeda adalah apa yang diberikan kepada model dan apa yang dikembalikannya: sebuah angka, sebuah kelas, atau sebuah kelompok.

## Sebelum lab
*Apa yang akan kamu coba berikutnya?*

Ada tiga kesalahan yang sebaiknya dihindari sebelum kamu mulai.

- **Menganggap kode numerik sebagai angka.** Spesies 1, 2, 3 adalah classification.
- **Mengharapkan clustering memberi nama pada kelompoknya.** Yang dikembalikan hanya nomor kelompok; memberi nama adalah tugasmu.
- **Melewatkan baseline.** Skor 90% belum berarti banyak sebelum kamu tahu berapa skor jawaban paling sederhana.

Di lab yang menutup kursus ini, kamu akan memakai satu dataset untuk mengajukan satu pertanyaan regression, satu pertanyaan classification, dan satu pertanyaan clustering, lalu melihat apa yang dikembalikan masing-masing. Sebelum membuka lab, coba ini di atas kertas: ambil tabel apa pun yang kamu kenal, misalnya menu atau tagihan telepon, lalu tulis satu pertanyaan dari tiap jenis tentang tabel itu dan sebutkan target masing-masing.

::: remember
- Task berasal dari pertanyaan: target berupa angka adalah regression, target berupa kategori adalah classification, dan tanpa target sama sekali adalah clustering.
- Regression dan classification bersifat supervised dan membutuhkan label; clustering bersifat unsupervised dan menghasilkan kelompok yang harus ditafsirkan oleh seseorang.
- Nilai regression dari besar galatnya, classification dari persentase jawaban yang benar dibandingkan baseline, dan clustering dari apakah kelompoknya stabil dan berguna.
:::
