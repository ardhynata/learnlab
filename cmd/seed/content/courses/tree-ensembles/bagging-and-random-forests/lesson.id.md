---
slug: bagging-and-random-forests
title: Bagging dan random forest
---
::: intro
- Jelaskan mengapa satu decision tree yang ditumbuhkan penuh tidak stabil, dan bagaimana bagging (banyak tree, masing-masing dilatih pada satu bootstrap sample, lalu dirata-ratakan) menstabilkannya.
- Sebutkan apa yang ditambahkan random forest pada bagging, dan hitung dengan tangan hasil vote lima tree.
- Baca out-of-bag error dan permutation feature importance, lalu sebutkan apa yang dapat dan tidak dapat dikatakan oleh masing-masing.

Sebelum mulai: baca "Split dan impurity" dan "Kedalaman dan ukuran leaf" dari kursus Decision tree, serta "Variabilitas sampling dan bootstrap" dari kursus Probabilitas dan ketidakpastian statistik.
:::

## Satu tree itu tidak stabil
*Mengapa tree yang ditumbuhkan penuh berubah ketika baris training berubah sedikit saja?*

"Kedalaman dan ukuran leaf" ditutup dengan sebuah peringatan. Tree yang ditumbuhkan sampai setiap leaf murni mendapat skor 100% pada penguin training-nya, tetapi hanya 54 dari 67 (80,6%) pada penguin validation. Pelajaran ini memakai tugas dan pembagian data yang sama: apakah seekor penguin jantan atau betina, berdasarkan bill length, bill depth, flipper length dan body mass, dengan 200 penguin training dan 67 penguin validation.

Tree seperti ini memiliki **varians** yang tinggi: jawabannya sangat bergantung pada baris mana persisnya yang ia lihat. Coba buktikan. Ambil 200 penguin dari 200 penguin training dengan pengembalian (*with replacement*), tumbuhkan satu tree penuh pada sampel itu, lalu ulangi 25 kali. Ke-25 tree dinilai pada 67 penguin validation yang sama. Hasilnya antara 52 dan 61 benar, rata-rata 56,4 (84,2%). Skor 54 dari tree awal masih berada dalam rentang itu.

Gagasan besar tree-tree itu tidak berbeda. Dalam satu percobaan dengan 400 tree seperti ini (seed 7), 353 tree menanyakan body mass lebih dulu. Perbedaannya ada pada banyak pertanyaan kecil di dekat leaf, dan pertanyaan itulah yang menentukan nasib penguin yang berada dekat batas.

## Bagging: rata-ratakan banyak tree
*Bagaimana banyak tree yang tidak stabil dapat menghasilkan satu jawaban yang stabil?*

**Bagging** adalah singkatan dari bootstrap aggregating. Langkahnya ada empat.

1. Ambil satu bootstrap sample: n baris dari n baris training, dengan pengembalian, seperti di "Variabilitas sampling dan bootstrap".
2. Tumbuhkan satu tree penuh pada sampel itu. Jangan di-pruning dan jangan batasi kedalamannya.
3. Ulangi untuk T tree.
4. Untuk memprediksi, tanyakan ke semua tree lalu ambil vote mayoritas. Untuk prediksi berupa angka, ambil rata-ratanya.

Satu bootstrap sample berisi 200 penguin memuat sekitar 63% penguin yang berbeda. Lima sampel pertama memuat 133, 123, 117, 123 dan 127. Setiap tree melihat bagian data yang berbeda, sehingga kesalahannya muncul di tempat yang berbeda pula. Vote meniadakan kesalahan yang hanya dibuat oleh sebagian tree.

[[figure:bagging-and-random-forests/tree-scores|Skor validation dari 25 tree yang ditumbuhkan pada 25 bootstrap sample, satu titik per tree. Vote dari ke-25 tree ditandai dengan berlian.]]

Vote itu benar pada 59 dari 67. Tree tunggal terbaik benar pada 61, tetapi tidak ada yang dapat tahu lebih dulu tree mana yang terbaik.

## Lima tree memberi vote dengan tangan
*Seperti apa sebuah vote pada satu penguin nyata?*

Ambil lima tree dari ke-25 tree itu. Penguinnya jantan dari validation set: bill length 50,2 mm, bill depth 18,8 mm, flipper length 202 mm, body mass 3800 g. Setiap tree mengirimnya lewat jalurnya sendiri ke sebuah leaf. Leaf mencatat baris training dari sampel milik tree itu sendiri, dan penguin yang terambil dua kali dihitung dua kali.

| Tree | Pertanyaan pertama | Jumlah pertanyaan | Leaf yang dicapai | Vote |
| --- | --- | --- | --- | --- |
| 1 | body mass ≤ 3625 g | 5 | 0 betina, 21 jantan | jantan |
| 2 | body mass ≤ 3712,5 g | 5 | 8 betina, 0 jantan | betina |
| 3 | body mass ≤ 3625 g | 6 | 0 betina, 19 jantan | jantan |
| 4 | body mass ≤ 3712,5 g | 6 | 4 betina, 0 jantan | betina |
| 5 | body mass ≤ 3675 g | 6 | 0 betina, 9 jantan | jantan |

[[figure:bagging-and-random-forests/five-votes|Penguin yang sama dikirim melalui lima tree. Tiga tree memilih jantan dan dua tree memilih betina.]]

> Contoh hitungan: tiga vote untuk jantan dan dua untuk betina, sehingga forest menjawab jantan, dan jawaban itu benar. Setiap leaf murni, sehingga porsi leaf jantan adalah (1 + 0 + 1 + 0 + 1) / 5 = 3 / 5 = 0,6. Porsi 0,6 hanyalah mayoritas yang tipis, tanda bahwa penguin ini berada dekat batas.

Pada seluruh 67 penguin validation, vote kelima tree ini benar pada 59. Kelima tree itu sendiri-sendiri benar pada 61, 55, 57, 55 dan 56.

## Makin banyak tree, makin stabil skornya
*Berapa banyak tree yang sudah cukup?*

Bagging memakai sampel acak, sehingga resep yang sama dengan seed lain menghasilkan forest lain. Untuk melihat sebarannya, setiap ukuran forest dibangun 30 kali, dengan seed 1 sampai 30, pada penguin training yang sama, dan setiap forest dinilai pada 67 penguin validation yang sama. Ini adalah percobaan baru, sehingga rata-rata satu tree di bawah sedikit berbeda dari 56,4 di atas.

| Jumlah tree T | Rata-rata benar | Terendah sampai tertinggi | Simpangan baku |
| --- | --- | --- | --- |
| 1 | 56,70 | 52 sampai 61 | 2,10 |
| 5 | 57,47 | 54 sampai 61 | 1,87 |
| 25 | 58,40 | 56 sampai 61 | 1,25 |
| 100 | 58,23 | 57 sampai 60 | 0,57 |

Sebarannya menyusut di setiap langkah, dan itulah arti ungkapan "varians turun". Rata-ratanya naik dari 56,70 menjadi 58,40 lalu mendatar. Menambah tree tidak membuat forest makin menghafal, tetapi setiap tree menambah waktu komputasi.

::: deeper Mengapa rata-rata membantu, dalam angka
Misalkan prediksi tiap tree dari T tree memiliki galat dengan varians 1, dan dua tree mana pun berkorelasi r. Rata-rata dari T galat itu memiliki varians r + (1 - r) / T. Dengan 25 tree yang saling bebas (r = 0) nilainya 1 / 25 = 0,04. Dengan r = 0,5 nilainya 0,5 + 0,5 / 25 = 0,52, dan dengan r = 0,9 nilainya 0,9 + 0,1 / 25 = 0,904. Menambah tree hanya mengecilkan suku kedua, sehingga tree-tree itu harus berbeda satu sama lain, bukan sekadar banyak.
:::

## Apakah berlaku pada pembagian lain?
*Apakah pembagian ini hanya kebetulan beruntung?*

Pada pembagian data lain, gambarannya sama. Dari 30 pembagian yang berbeda, satu tree penuh rata-rata benar 57,9 dari 67 (86,4%), sedangkan bag berisi 25 tree rata-rata 59,5 (88,9%). Bag itu mendapat skor lebih tinggi pada 23 pembagian, sama pada 1, dan lebih rendah pada 6.

> Awas: pada pembagian ini tree dengan depth 3 dari "Kedalaman dan ukuran leaf" juga benar 59, tetapi kedalamannya dipilih dengan melihat skor validation. Tree hasil bagging tidak membutuhkan pemilihan kedalaman sama sekali.

## Random forest: subset acak di setiap split
*Apa yang ditambahkan oleh pemilihan feature secara acak?*

Tree hasil bagging tetap mirip satu sama lain. Dari 400 tree, 353 menanyakan body mass lebih dulu, karena body mass adalah feature terkuat pada hampir setiap sampel. Tree yang mirip membuat kesalahan yang mirip, dan vote tidak dapat meniadakan kesalahan yang dilakukan semua tree.

**Random forest** menambahkan satu pilihan acak lagi. Di setiap split, sebuah tree hanya boleh melihat subset acak dari feature, di sini 2 dari 4, lalu memilih pertanyaan terbaik di antara feature itu. Pengaturan umum untuk classification adalah akar kuadrat dari jumlah feature. Pada percobaan sejenis dengan 400 tree forest (seed 7), body mass menjadi pertanyaan pertama di 198 tree, bill depth di 96, bill length di 86 dan flipper length di 20. Body mass ada di 3 dari 6 pasangan yang mungkin, sehingga ia hanya tersedia pada sekitar separuh split pertama.

Tree-tree itu menjadi kurang mirip: dua tree hasil bagging memberi jawaban yang sama pada 87,1% penguin validation, sedangkan dua tree forest pada 84,5%. Satu tree forest sedikit lebih lemah, rata-rata benar 55,7 dibandingkan 56,4. Vote menutup kekurangan itu. Dari 30 pembagian, 25 tree forest benar 60,1 dan 25 tree hasil bagging benar 59,5. Selisih 0,6 penguin itu adalah seri, tetapi forest lebih stabil: pada pembagian dengan seed 4, ke-30 seed-nya memberi 57 sampai 60 benar, sedangkan bagging memberi 56 sampai 61.

## Out-of-bag error: validation set gratis
*Dapatkah sebuah forest menilai dirinya sendiri tanpa baris yang disisihkan?*

Sebuah bootstrap sample melewatkan seekor penguin dengan probabilitas (1 - 1/200)^200 = 0,367. Bagi tree itu, penguin tersebut berstatus **out of bag**: tidak pernah dilihat. Karena itu, setiap penguin training dapat dinilai oleh tree-tree yang belum pernah melihatnya. **Out-of-bag (OOB) error** adalah porsi penguin training yang vote OOB-nya salah.

[[figure:bagging-and-random-forests/out-of-bag|Enam penguin training dan lima tree dalam vote. Kotak terisi: tree melihat penguin itu. Kotak kosong: tree tidak melihatnya, dan jawabannya dihitung untuk vote out-of-bag.]]

> Contoh hitungan: penguin C berstatus out of bag untuk tree 1 sampai 4. Keempatnya menjawab betina, dan C memang betina, sehingga vote OOB-nya benar. Penguin F berstatus out of bag untuk tree 1, 3 dan 5. Ketiganya menjawab jantan, padahal F betina, sehingga vote-nya salah. Penguin A dilihat oleh kelima tree dan tidak mendapat vote OOB.

Dengan 25 tree, setiap penguin berstatus out of bag untuk 1 sampai 14 tree, rata-rata 9,14 (25 x 0,367 = 9,2). Sebanyak 18 dari 200 vote OOB salah: error 9,0%. Training accuracy forest, 200 dari 200, tidak memberi informasi apa pun tentang kinerja pada data baru. Validation error-nya 8 dari 67 = 11,9%. Dengan standard error sekitar 2,0 dan 4,0 poin, keduanya sejalan. OOB cenderung terbaca sedikit lebih tinggi, karena setiap penguin hanya dinilai oleh sekitar 9 dari 25 tree: pada 30 pembagian, rata-ratanya 12,7% dibandingkan 11,1%.

## Feature importance
*Feature mana yang diandalkan oleh forest?*

**Permutation importance** bertanya seberapa penting sebuah feature bagi model ini. Acak satu feature di antara penguin validation, yang memutuskan hubungannya dengan jenis kelamin, lalu nilai lagi. Penurunan skornya adalah importance.

Sebuah forest dengan 100 tree dan 2 feature per split benar pada 60 dari 67 penguin validation. Dirata-ratakan dari 30 kali pengacakan per feature, skornya turun seperti berikut.

| Feature yang diacak | Penurunan jumlah penguin benar | Penurunan dalam poin |
| --- | --- | --- |
| Bill depth | 20,53 dari 67 | 30,6 |
| Body mass | 12,97 dari 67 | 19,4 |
| Bill length | 2,80 dari 67 | 4,2 |
| Flipper length | 0,27 dari 67 | 0,4 |

[[figure:bagging-and-random-forests/importance|Permutation importance dari keempat feature. Batang menunjukkan penurunan validation accuracy, dalam poin, ketika feature itu diacak.]]

> Awas: skor flipper length mendekati nol, tetapi feature itu bukan tidak berguna. Flipper length dan body mass bergerak bersama pada 333 penguin (r = 0,87). Ketika flipper length diacak, tree-tree masih dapat bersandar pada body mass. Importance menggambarkan model ini pada data ini. Ia tidak menunjukkan sebab-akibat.

::: deeper Ukuran lain yang umum
**Impurity importance** menjumlahkan, untuk setiap feature, seberapa besar impurity yang dikurangi oleh split-nya di seluruh tree, lalu memberi setiap feature sebuah porsi. Pada forest yang sama: body mass 35,4%, bill depth 30,6%, bill length 20,6%, flipper length 13,5%. Ukuran ini menempatkan body mass di urutan pertama dan memberi flipper length porsi yang jelas, padahal permutation tidak. Ukuran ini dihitung pada baris training, sehingga dapat memberi nilai pada split yang hanya mencocokkan noise. Ketika keduanya tidak sepakat, beri bobot lebih besar pada ukuran yang diukur pada data yang disisihkan.
:::

## Yang tidak diperbaiki oleh forest
*Kapan bagging belum cukup, dan apa langkah berikutnya?*

Rata-rata meniadakan kesalahan yang berbeda antar-tree. Ia tidak dapat meniadakan kesalahan yang dimiliki semuanya: forest berisi tree yang semuanya terlalu dangkal tetap terlalu sederhana. Forest juga lebih sulit dibaca daripada satu tree, karena 100 tree tidak muat dalam satu halaman, dan biaya training-nya T kali lebih besar.

Pelajaran berikutnya, "Gradient boosting", membangun tree satu demi satu. Setiap tree dilatih untuk memperbaiki kesalahan tree-tree sebelumnya. Setelah itu, Ensemble lab mengajakmu menambah tree secara bertahap dan membandingkan bagaimana bagging dan boosting mengubah performa validation, dengan titik-titik buatan dan bukan penguin. Baca sebaran skor dan bukan hanya rata-ratanya, dan anggap selisih satu atau dua penguin sebagai seri.

::: remember
- Bagging melatih tree penuh pada bootstrap sample lalu mengambil vote. Setiap tree tidak stabil, vote-nya lebih stabil, dan menambah tree mengecilkan sebaran lalu mendatar.
- Random forest juga membuat setiap split hanya melihat subset acak dari feature, sehingga tree-nya kurang mirip. Out-of-bag error menilai setiap penguin training dengan tree-tree yang belum pernah melihatnya.
- Permutation importance adalah penurunan skor validation ketika satu feature diacak. Ia menggambarkan model, bukan dunia, dan feature yang berkorelasi berbagi nilainya.
:::
