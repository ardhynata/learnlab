---
slug: splits-and-impurity
title: Split dan impurity
---
::: intro
- Jelaskan split sebagai pertanyaan ya-atau-tidak tentang satu feature, dan mengapa split itu axis-aligned.
- Hitung Gini impurity suatu kelompok, lalu nilai split dari rata-rata tertimbang impurity kedua kelompok hasilnya.
- Pilih split terbaik secara manual pada contoh kecil, dan jelaskan bagaimana tree terus membelah data.

Sebelum mulai: baca "Data, feature, dan label".
:::

## Split adalah pertanyaan ya-atau-tidak
*Apa sebenarnya yang ditanyakan decision tree?*

**Decision tree** (pohon keputusan) membuat prediksi dengan mengajukan rangkaian pertanyaan ya-atau-tidak tentang suatu kasus. Setiap pertanyaan disebut **split**: satu feature dan satu threshold, misalnya "apakah panjang flipper paling banyak 195,5 mm?" Kasus yang menjawab ya diarahkan ke satu sisi, sedangkan yang lain ke sisi lainnya.

Karena split hanya melihat satu feature, garis pemisahnya lurus dan sejajar dengan salah satu sumbu. Pada plot dua feature, garis itu berupa garis vertikal atau horizontal. Itulah sebabnya split ini disebut **axis-aligned**.

Kelompok yang tidak dibelah lagi disebut **leaf**. Leaf memprediksi **majority class**, yaitu label yang paling banyak muncul di antara kasus training yang berakhir di sana.

Melatih tree berarti memilih pertanyaan-pertanyaannya. Feature mana yang sebaiknya ditanyakan, dan pada threshold berapa? Aturannya sederhana: pilih pertanyaan yang membuat kedua kelompok *semurni* (pure) mungkin, artinya setiap kelompok sebagian besar berisi satu kelas. Bagian-bagian berikut mengubah kata "murni" menjadi angka.

## Impurity: seberapa campur suatu kelompok?
*Bagaimana campuran label dalam suatu kelompok dijadikan satu angka?*

**Impurity** adalah skor yang bernilai 0 untuk kelompok murni dan naik seiring label bercampur. Ukuran yang paling umum adalah **Gini impurity**. Ambil proporsi setiap kelas dalam kelompok, kuadratkan, jumlahkan, lalu kurangkan hasilnya dari 1:

`Gini = 1 - (p1² + p2² + ...)`

- 10 penguin Adelie dan tidak ada yang lain: 1 - 1² = **0**.
- 5 Adelie dan 5 Chinstrap: 1 - (0,5² + 0,5²) = **0,5**.
- 5 Adelie dan 2 Chinstrap: 1 - ((5/7)² + (2/7)²) = 1 - 29/49 = 20/49, sekitar **0,41**.

[[figure:splits-and-impurity/gini-curve|Impurity kelompok dua kelas terhadap proporsi p salah satu kelas. Gini (garis penuh) dan entropy (putus-putus, dijelaskan di bawah) sama-sama bernilai 0 untuk kelompok murni dan tertinggi pada campuran 50/50. Titik menandai 5 Adelie dari 7, dengan Gini sekitar 0,41.]]

Pada dua kelas, Gini bergerak dari 0 sampai 0,5, dan 0,5 adalah campuran terburuk yang mungkin.

> Gagasan kunci: impurity rendah ketika satu kelas mendominasi, dan tertinggi ketika kelas-kelasnya bercampur merata.

::: deeper Gini sebagai peluang salah tebak
Ambil satu kasus secara acak dari kelompok, lalu tebak labelnya dengan menarik dari proporsi kelas kelompok itu. Peluang tebakanmu salah adalah 1 - (p1² + p2² + ...), yang persis sama dengan Gini impurity. Kelompok murni tidak pernah menghasilkan tebakan yang salah, sedangkan kelompok 50/50 salah separuh dari waktu.
:::

## Menilai split
*Bagaimana membandingkan dua cara membelah kelompok yang sama?*

Split menghasilkan dua kelompok anak (child), dan masing-masing punya impurity sendiri. Untuk mendapatkan satu skor bagi split itu, hitung **rata-rata tertimbang** (weighted average), dengan setiap child dihitung sebanding dengan ukurannya:

`weighted Gini = (n_left / n) × Gini_left + (n_right / n) × Gini_right`

Bobot ini penting. Kelompok murni berisi dua kasus tidak boleh mengalahkan kelompok berantakan berisi delapan kasus.

**Penurunan impurity** (impurity decrease), yang juga disebut **gain**, adalah Gini sebelum split dikurangi weighted Gini sesudahnya. Split terbaik adalah yang penurunannya paling besar. Weighted Gini kedua child tidak pernah lebih tinggi daripada milik parent-nya, sehingga gain tidak pernah negatif. Gain 0 berarti pertanyaan itu tidak memberi tahu kita apa-apa.

Threshold mana yang dicoba? Urutkan nilai suatu feature. Setiap potongan di antara dua nilai bertetangga yang sama menghasilkan dua kelompok yang sama, sehingga satu kandidat per celah sudah cukup, biasanya di tengah-tengah kedua tetangga itu. Nilai yang sama tidak membentuk celah.

> Gagasan kunci: pembuat tree mencoba setiap kandidat split pada setiap feature, lalu memilih yang penurunan impurity-nya paling besar.

## Contoh hitungan lengkap
*Dapatkah kita memilih split terbaik hanya dengan pensil?*

Ambil sepuluh penguin dari dataset kursus: lima Adelie (A) dan lima Chinstrap (C). Diurutkan menurut panjang flipper dalam mm, urutannya 181 A, 186 A, 188 C, 190 A, 193 A, 193 C, 195 A, 196 C, 197 C, 198 C. Seluruh kelompok memiliki Gini 0,5.

> Contoh hitungan: coba "flipper paling banyak 195,5". Kiri: 7 penguin, 5 A dan 2 C, Gini 20/49 = 0,41. Kanan: 3 penguin, semuanya C, Gini 0. Tertimbang: 7/10 × 0,41 + 3/10 × 0 = **0,29**. Gain-nya 0,5 - 0,29 = **0,21**.

Sekarang coba setiap celah:

| Potong di | Kiri (A, C) | Kanan (A, C) | Weighted Gini |
|---|---|---|---|
| 183,5 | 1, 0 | 4, 5 | 0,44 |
| 187 | 2, 0 | 3, 5 | 0,38 |
| 189 | 2, 1 | 3, 4 | 0,48 |
| 191,5 | 3, 1 | 2, 4 | 0,42 |
| 194 | 4, 2 | 1, 3 | 0,42 |
| **195,5** | 5, 2 | 0, 3 | **0,29** |
| 196,5 | 5, 3 | 0, 2 | 0,38 |
| 197,5 | 5, 4 | 0, 1 | 0,44 |

[[figure:splits-and-impurity/threshold-scan|Kesepuluh penguin pada garis panjang flipper, beserta weighted Gini untuk setiap potongan kandidat. Batang terendah, pada 195,5 mm, adalah split terbaik.]]

Potongan pada 195,5 mm menang. Perhatikan bahwa 187 bukan yang terbaik, padahal potongan itu menghasilkan satu kelompok berisi dua penguin yang benar-benar murni.

## Mencoba setiap feature
*Bagaimana tree memilih di antara feature, dan apa yang tidak dapat dilakukan potongan lurus?*

Pencarian yang sama dijalankan pada setiap feature, dan potongan terbaik dari semuanya yang dipakai. Kesepuluh penguin tadi juga memiliki bill length dalam mm. Kelima Adelie memiliki bill 36,7 sampai 40,3 dan kelima Chinstrap 45,2 sampai 52,7. Potongan mana pun di antara 40,3 dan 45,2, misalnya "bill length paling banyak 43", menghasilkan dua kelompok murni: weighted Gini 0 dan gain **0,50**. Itu mengalahkan gain 0,21 dari potongan flipper, sehingga tree ini akan bertanya tentang bill lebih dulu.

[[figure:splits-and-impurity/two-features|Kesepuluh penguin yang sama dipotong dengan dua cara. Potongan flipper meninggalkan kelompok campuran di bawah garis. Potongan bill membuat kedua sisi murni.]]

Ada dua batasan yang perlu diketahui:

- **Nilai yang sama tetap bersama.** Satu Adelie dan satu Chinstrap sama-sama punya panjang flipper 193 mm. Tidak ada potongan flipper yang dapat memisahkan keduanya.
- **Garisnya lurus dan axis-aligned.** Jika dua kelas dipisahkan oleh garis miring, tree membutuhkan banyak potongan kecil yang membentuk tangga.

## Entropy, ukuran yang lain
*Apakah Gini satu-satunya cara menilai campuran?*

**Entropy** adalah ukuran impurity kedua. Ia juga memakai proporsi kelas, tetapi dengan logaritma:

`entropy = -(p1 × log2 p1 + p2 × log2 p2 + ...)`

Kelompok murni memiliki entropy 0. Kelompok dua kelas yang 50/50 memiliki entropy 1. Untuk 5 Adelie dan 2 Chinstrap nilainya sekitar 0,86.

Split dinilai dengan cara yang sama seperti sebelumnya. Weighted entropy potongan pada 195,5 mm adalah 7/10 × 0,86 + 3/10 × 0 = 0,60, sehingga gain-nya 1 - 0,60 = **0,40**.

Bentuknya sama dengan Gini pada gambar di atas, hanya lebih tinggi: entropy mencapai puncak di 1, sedangkan Gini di 0,5. Karena itu angka dari kedua ukuran tidak dapat dibandingkan satu sama lain. Pada sepuluh penguin ini, keduanya memilih potongan 195,5 mm sebagai potongan flipper terbaik. Dalam praktik, keduanya biasanya menghasilkan tree yang sama atau sangat mirip. Gini tidak memerlukan logaritma, sehingga sedikit lebih murah untuk dihitung.

> Awas: jangan membandingkan gain Gini dengan gain entropy. Bandingkan split hanya dalam satu ukuran yang sama.

## Membelah lagi, dan langkah berikutnya
*Apa yang terjadi setelah split pertama?*

Pembuat tree tidak berhenti pada satu pertanyaan. Ia memperlakukan setiap kelompok child sebagai masalah baru yang lebih kecil, lalu mengulang pencarian pada kelompok itu. Inilah **rekursi**: prosedur yang sama diterapkan pada setiap kelompok, sampai suatu aturan berhenti berlaku. Aturan yang paling sederhana adalah kelompok sudah murni.

Untuk melihatnya, mulailah dari potongan flipper. Kelompok kanan (3 Chinstrap) sudah murni, sehingga menjadi leaf. Kelompok kiri (5 Adelie, 2 Chinstrap) masih campuran, jadi kita mencari lagi. Di antara potongan pada kedua feature, "bill length paling banyak 43" adalah yang terbaik: potongan itu memisahkan 5 Adelie dari 2 Chinstrap. (Pembuat tree yang selalu memilih split terbaik saat itu, yang disebut **greedy**, sebenarnya akan bertanya tentang bill lebih dulu; kita mulai dari potongan flipper hanya untuk memperlihatkan rekursinya.)

[[figure:splits-and-impurity/split-tree|Tree yang tumbuh lewat rekursi. Setiap kotak menampilkan pertanyaannya, jumlah per kelas, dan Gini-nya. Ketiga leaf-nya murni.]]

Menumbuhkan tree sampai setiap leaf murni membuatnya sesuai sempurna dengan data training, yang dapat berarti menghafal noise-nya. Pelajaran berikutnya, "Depth and leaf size", menunjukkan cara membatasi tree. Setelah itu, "Tree builder lab" memungkinkan kamu menumbuhkan tree pada data penguin sendiri dan melihat setiap split beserta impurity-nya.

::: remember
- Split adalah pertanyaan ya-atau-tidak tentang satu feature dan satu threshold. Split itu axis-aligned, dan leaf memprediksi majority class-nya.
- Gini impurity adalah 1 dikurangi jumlah kuadrat proporsi kelas. Skor split adalah weighted Gini kedua kelompoknya, dan split terbaik memiliki penurunan terbesar.
- Tree mencoba setiap potongan pada setiap feature, lalu mengulanginya pada setiap child sampai kelompok murni atau suatu aturan berhenti berlaku. Entropy adalah alternatif yang mirip dengan Gini.
:::
