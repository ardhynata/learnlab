---
slug: missing-values-and-encoding
title: Missing value dan encoding
---
::: intro
- Jelaskan mengapa sebuah nilai bisa hilang, lalu pilih antara membuang baris dan mengisi celahnya.
- Isi sebuah kolom dengan mean, median, atau nilai yang paling sering muncul, dan tambahkan flag "sebelumnya kosong".
- Ubah sebuah kategori menjadi kolom one-hot, jelaskan mengapa kode sembarang menyesatkan, dan lakukan fit untuk kedua langkah itu hanya pada baris training, yaitu baris yang dipakai model untuk belajar.

Sebelum mulai: baca "Data, features and labels" dan "Center and spread".
:::

## Mengapa nilai bisa hilang
*Apa sebenarnya arti sebuah sel kosong di dalam tabel?*

Model bekerja dengan angka, sedangkan sel kosong bukan angka. Rumus jarak tidak dapat mengurangkannya dan sebuah garis tidak dapat mengalikannya, sehingga setiap celah perlu diputuskan penanganannya sebelum model melihat tabel. Langkah pertama adalah menemukan celah itu dan menanyakan dari mana asalnya.

Penyebab yang umum: tidak ada yang mengukur nilainya, alat ukur rusak, pertanyaan tidak berlaku untuk baris itu, seseorang menolak menjawab, atau catatan hilang atau salah ketik. File juga menulis celah dengan cara yang berbeda-beda: sel kosong, `NA`, `?`, atau penanda seperti -999 yang tampak seperti angka sungguhan. Periksa semuanya sebelum kamu percaya pada sebuah hitungan.

File penguin menulis `NA`. Empat kolom ukuran masing-masing punya 2 celah, dan `sex` punya 11. Gambar di bawah menunjukkan letaknya. Baris #4 dan #272 kosong di keempat kolom ukuran dan di kolom sex, sedangkan sembilan penguin lain hanya tidak punya data jenis kelamin. File tidak menjelaskan sebabnya, karena itu seorang data scientist akan bertanya kepada orang yang mengumpulkan datanya.

[[figure:missing-values-and-encoding/missing-map|Ke-344 baris penguin, satu strip untuk setiap kolom. Setiap tanda adalah satu celah. Baris #4 dan #272 kosong di keempat kolom ukuran dan di kolom sex, dan sembilan baris lain hanya tidak punya jenis kelamin.]]

> Gagasan kunci: celah adalah pertanyaan sebelum menjadi gangguan. Berapa banyak nilai yang hilang, di kolom mana, dan mengapa, menentukan apa yang sebaiknya dilakukan.

## Dibuang atau diisi
*Kapan aman menghapus baris yang punya celah?*

Rencana paling sederhana adalah **membuang** setiap baris yang punya celah. Pada data penguin, ini menghapus 11 baris dan menyisakan 333 dari 344, kehilangan sekitar 3%. Membuang baris #4 dan #272 tidak merugikan apa pun, karena keduanya tidak memuat satu pun pengukuran.

Namun membuang baris cepat menjadi mahal. Jika 40% baris punya celah di salah satu kolom, sebagian besar datamu ikut terbuang. Jika satu kolom hampir kosong seluruhnya, buang kolomnya, bukan baris-barisnya.

Cara ini juga dapat mengubah komposisi data. Celah pada `sex` tidak tersebar merata: lima dari 11 berada di pulau Torgersen, padahal pulau itu hanya menampung 52 dari 344 penguin. Jika baris-baris itu dibuang, Torgersen menyusut sedikit lebih banyak daripada pulau lain.

Lagi pula, membuang baris tidak bisa menjadi satu-satunya rencanamu. Suatu hari akan datang baris baru yang punya celah, dan kamu tetap harus memberikan prediksi untuknya. Kamu tidak dapat "membuang" pelanggan yang harus kamu jawab.

Alternatifnya adalah **mengisi** celah dengan tebakan dan mempertahankan barisnya. Pengisian ini disebut **imputing**. Tebakan itu harus berasal dari aturan yang dapat model terapkan pada baris mana pun di masa depan. Aturan itu dihitung dari **baris training**, yaitu baris yang dipakai model untuk belajar, dan dua bagian terakhir menjelaskan caranya.

## Mean, median, atau yang paling sering muncul
*Nilai tipikal mana yang sebaiknya mengisi celah?*

Tiga aturan sederhana sudah mencakup sebagian besar tabel.

- **Mean.** Rata-rata kolom. Pilihan yang baik bila nilai-nilainya tersebar cukup merata di sekitarnya.
- **Median.** Nilai tengah setelah kolom diurutkan. Hanya sedikit dipengaruhi nilai ekstrem, sehingga lebih aman bila kolom punya ekor panjang.
- **Paling sering muncul.** Nilai yang paling banyak ditemukan. Dari ketiganya, hanya aturan ini yang bisa dipakai untuk kategori.

> Contoh hitungan: empat massa tubuh penguin adalah 3.650, 3.475, 3.700, dan 5.700 g. Jumlahnya 16.525, sehingga mean-nya 16.525 / 4 = 4.131,25 g. Setelah diurutkan: 3.475, 3.650, 3.700, 5.700, sehingga median-nya adalah rata-rata dua nilai tengah, (3.650 + 3.700) / 2 = 3.675 g.

Satu penguin yang berat menarik mean 456,25 g di atas median. Jika sebuah celah diisi dengan mean, nilai barunya berada di atas tiga dari keempat massa tadi.

[[figure:missing-values-and-encoding/mean-vs-median|Empat massa tubuh pada garis bilangan. Penguin 5.700 g menarik mean ke kanan, sedangkan median tetap bersama tiga penguin lainnya.]]

> Awas: nilai yang diisi adalah tebakan, bukan hasil pengukuran. Mengisi banyak celah dengan satu angka membuat kolom tampak kurang menyebar dibandingkan yang sebenarnya. Jangan pernah mengisi dengan 0 hanya supaya model bisa jalan: 0 g adalah massa yang nyata.

Untuk kategori, "paling sering muncul" dapat menyesatkan. Penguin terbagi 168 jantan dan 165 betina, sehingga mengisi 11 celah dengan "male" mengubah selisih yang hampir seri menjadi 11 label yang tampak yakin. Pilihan lain adalah menjadikan "unknown" sebagai kategorinya sendiri.

## Flag untuk "sebelumnya kosong"
*Bagaimana model tetap dapat membedakan nilai asli dari nilai isian?*

Setelah diisi, sebuah tebakan terlihat persis seperti hasil pengukuran. **Missing indicator** menjaga perbedaannya. Ini adalah kolom baru yang berisi 1 di tempat nilai aslinya kosong dan 0 di tempat nilainya ada, dan diletakkan di samping kolom yang sudah diisi.

Mengapa perlu? Terkadang celah itu sendiri membawa informasi. Misalkan sebuah formulir menanyakan penghasilan dan orang-orang terkaya melewatkan pertanyaan itu. Kolom yang diisi dengan rata-rata membuat mereka semua tampak biasa saja, sedangkan flag memungkinkan model mempelajari bahwa "dilewati" adalah pola tersendiri.

Pada data penguin, `sex_was_missing` bernilai 1 pada 11 baris. Apakah flag itu membantu perlu diuji, bukan diasumsikan.

Sebuah flag menambah satu kolom, karena itu tambahkan hanya di tempat yang mungkin berpengaruh. Flag yang bernilai 0 pada setiap baris training tidak membawa informasi apa pun dan boleh dihilangkan. Flag juga tidak membuat isian itu menjadi kurang bersifat tebakan.

Aturan apa pun yang kamu pilih, terapkan pada setiap baris, termasuk baris di masa depan. Sebuah imputer adalah aturan ditambah angka yang sudah dipelajarinya, misalnya "isi `body_mass_g` dengan 4.131,25, mean dari baris training". Model yang dilatih pada kolom yang sudah diisi harus diberi kolom yang sudah diisi pula nantinya.

## Kategori menjadi kolom
*Bagaimana sebuah kata seperti "Dream" menjadi angka?*

Island dan sex bersifat **kategorikal**: nilainya berupa nama. Model membutuhkan angka, jadi nama harus di-**encode**. Ada dua cara utama.

**Kode ordinal** memberi setiap kategori sebuah bilangan bulat: Biscoe 0, Dream 1, Torgersen 2. **One-hot encoding** membuat satu kolom untuk setiap kategori. Sebuah baris mendapat 1 di kolomnya sendiri dan 0 di kolom lain, sehingga penguin Dream menjadi Biscoe 0, Dream 1, Torgersen 0. Kategori dengan dua nilai cukup memakai satu kolom, misalnya `sex_is_male`, karena kolom satunya hanya akan berisi 1 dikurangi kolom itu.

Mengapa kategori tidak diberi nomor saja? Karena angka mengatakan lebih banyak daripada nama. Kode-kode itu mengklaim bahwa Torgersen (2) berjarak dua kali lebih jauh dari Biscoe (0) dibanding Dream (1). Beri nomor pada pulau-pulau itu dengan urutan lain, dan "jarak" tersebut berubah, padahal tidak ada pulau yang berpindah. Kolom one-hot tidak membuat klaim semacam itu: dua pulau yang berbeda selalu berjarak sama, yaitu akar 2, sekitar 1,41.

[[figure:missing-values-and-encoding/codes-vs-one-hot|Kiri: kode ordinal menempatkan pulau-pulau pada satu garis dan mengarang jarak di antaranya. Kanan: kolom one-hot membuat setiap pasangan pulau berjarak sama.]]

Kode ordinal tepat dipakai bila urutannya memang nyata, seperti small, medium, dan large.

::: deeper Mengapa garis lurus tidak dapat memakai kode pulau
Model linear, dari pelajaran regresi, memberi satu bobot pada sebuah kolom, sehingga pengaruhnya harus berupa garis lurus terhadap kode-kodenya. Rata-rata massa tubuh tiap pulau kira-kira 4.716 g (Biscoe), 3.713 g (Dream), dan 3.706 g (Torgersen). Jika diberi kode Dream 0, Biscoe 1, Torgersen 2, massanya naik lalu turun: tidak ada garis lurus yang melewati kode-kode itu yang dapat naik di Biscoe lalu turun kembali sesudahnya. Dengan kolom one-hot, setiap pulau mendapat bobotnya sendiri, sehingga Biscoe cukup dinyatakan lebih berat. Sebagian penyebabnya ada pada datanya: ke-124 penguin Gentoo tinggal di Biscoe, dan merekalah spesies terberat.
:::

## Tabel mungil yang dikerjakan manual
*Bisakah kamu mengerjakan setiap langkah hanya dengan pensil?*

Ambil enam penguin sungguhan, disebut menurut barisnya di file. Empat baris pertama adalah baris training dan dua baris terakhir adalah baris test. Massa #155 sengaja kita sembunyikan, supaya isiannya dapat dicek terhadap nilai sebenarnya (4.450 g). `NA` pada #9 memang asli.

| Set | Baris | Island | Massa tubuh (g) | Sex |
|---|---|---|---|---|
| train | #6 | Torgersen | 3.650 | male |
| train | #9 | Torgersen | 3.475 | NA |
| train | #151 | Dream | 3.700 | female |
| train | #154 | Biscoe | 5.700 | male |
| test | #152 | Dream | 4.000 | male |
| test | #155 | Biscoe | NA | female |

**Fit, hanya dengan empat baris training.** Mean massanya 4.131,25. Jenis kelamin yang ada adalah male, female, dan male, sehingga yang paling sering muncul adalah male. Pulau yang ada adalah Biscoe, Dream, dan Torgersen.

**Transform setiap baris** dengan angka-angka itu. Baris #9 mendapat sex male ditambah flag 1, dan baris #155 mendapat massa 4.131,25.

| Baris | Biscoe | Dream | Torgersen | Massa tubuh | Is male | Sex was NA |
|---|---|---|---|---|---|---|
| #6 | 0 | 0 | 1 | 3.650 | 1 | 0 |
| #9 | 0 | 0 | 1 | 3.475 | 1 | 1 |
| #151 | 0 | 1 | 0 | 3.700 | 0 | 0 |
| #154 | 1 | 0 | 0 | 5.700 | 1 | 0 |
| #152 | 0 | 1 | 0 | 4.000 | 1 | 0 |
| #155 | 1 | 0 | 0 | 4.131,25 | 0 | 0 |

Isian untuk #155 berada 319 g di bawah nilai sebenarnya yang tersembunyi, yaitu 4.450. Isian median (3.675) akan berada 775 g di bawahnya. Keduanya tidak tahu bahwa penguin ini tinggal di Biscoe, tempat Gentoo yang berat berada. Isian yang dibuat dari satu kolom mengabaikan kolom-kolom lainnya.

::: deeper Mengisi dari baris yang mirip
Isian yang lebih cerdas memprediksi celah dari kolom lain, misalnya rata-rata massa penguin di pulau yang sama. Itu sudah merupakan model kecil tersendiri. Model itu pun harus di-fit hanya pada baris training.
:::

## Arti fit
*Apa yang dipelajari imputer dan encoder, dan apa yang salah bila keduanya mengintip?*

**Baris training** adalah baris yang dipakai model untuk belajar. **Baris test** disisihkan dan hanya dipakai untuk menilai model yang sudah jadi, sebagai pengganti data di masa depan. Pelajaran "Train, validation and test" membahasnya lebih lanjut.

Imputer dan encoder sama-sama **mempelajari** sesuatu dari data: mean atau median, nilai yang paling sering muncul, daftar kategori. **Fit** berarti menghitung hal-hal itu dari sejumlah baris. Jika fit dilakukan pada baris yang menyertakan baris test, data test diam-diam ikut membentuk input model, sehingga skor test dapat terlihat lebih bagus daripada seharusnya. Inilah **data leakage**.

Pada tabel tadi, fit pada kelima massa yang diketahui memberi (16.525 + 4.000) / 5 = 4.105, bukan 4.131,25. Selisihnya kecil di sini, tetapi kebiasaannyalah yang penting.

## Bagi dulu, baru fit
*Dalam urutan apa langkah-langkah ini dijalankan?*

Urutan yang aman: bagi data dulu, fit pada baris training, lalu terapkan angka yang sama persis, tanpa diubah, pada baris training, baris test, dan data baru apa pun.

[[figure:missing-values-and-encoding/fit-on-train|Fit imputer dan encoder hanya pada baris training, lalu pakai ulang apa yang sudah dipelajari pada baris test.]]

Baris baru dapat memuat kategori yang belum pernah dilihat encoder, misalnya pulau keempat. Kategori itu tidak punya kolom, karena itu putuskan penanganannya sejak awal, misalnya dengan memberinya nol di semua kolom.

Pelajaran berikutnya, "Scaling and encoding", menambahkan scaling pada langkah-langkah ini, dan lab-nya, "Scale it", memperlihatkan apa yang terjadi pada model berbasis jarak bila kolom-kolomnya tidak berada pada skala yang sama. Setelah itu, "Pipelines and leakage" merangkai semua langkah ini sehingga selalu berjalan dalam urutan yang benar.

::: remember
- Sebuah celah perlu diputuskan penanganannya: buang barisnya, atau isi dengan mean, median, atau nilai yang paling sering muncul, mungkin disertai flag "sebelumnya kosong". Nilai isian adalah tebakan.
- Encode kategori dengan kolom one-hot supaya tidak ada urutan atau jarak yang dikarang. Pakai kode ordinal hanya bila urutannya nyata.
- Lakukan fit imputer dan encoder hanya pada baris training, lalu terapkan angka yang sama pada baris test dan data baru apa pun.
:::
