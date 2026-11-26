---
slug: depth-and-leaf-size
title: Kedalaman dan ukuran leaf
---
::: intro
- Jelaskan bagaimana maximum depth dan minimum leaf size membatasi ukuran sebuah decision tree.
- Baca training accuracy dan validation accuracy berdampingan untuk mengenali tree yang terlalu dalam.
- Pilih kedua pengaturan itu berdasarkan validation accuracy, dan jelaskan mengapa satu kali pembagian data belum cukup untuk memastikannya.

Sebelum mulai: baca "Split dan impurity" serta "Underfitting dan overfitting".
:::

## Dua pengaturan yang membatasi tree
*Apa yang dikendalikan oleh maximum depth dan minimum leaf size?*

Pelajaran sebelumnya berakhir dengan tree yang terus membelah sampai setiap leaf murni. Jika dibiarkan, tree dapat berakhir dengan satu leaf untuk hampir setiap baris training. Dua **pengaturan** yang kamu tentukan sebelum training akan menghentikannya lebih awal.

- **Maximum depth** adalah jumlah pertanyaan berurutan yang boleh diajukan tree. Pertanyaan pertama berada di kedalaman 0, dan kedalaman sebuah leaf adalah jumlah pertanyaan yang diperlukan untuk sampai ke sana. Maximum depth 0 menghasilkan satu leaf yang selalu menjawab kelas mayoritas, yaitu baseline. Maximum depth 3 mengizinkan paling banyak tiga pertanyaan berurutan.
- **Minimum leaf size** adalah jumlah baris training paling sedikit yang boleh ada di sebuah leaf. Sebuah split hanya diizinkan jika kedua kelompoknya tetap berisi paling sedikit sejumlah baris tersebut. Minimum leaf size 1 berarti tanpa batasan.

Kedua pengaturan ini membatasi seberapa halus tree boleh memecah data, sehingga keduanya mengendalikan kompleksitasnya.

## Data dalam pelajaran ini
*Penguin mana yang dipilah oleh tree?*

Pelajaran ini mengajukan pertanyaan yang lebih sulit daripada spesies: *apakah penguin ini jantan atau betina?* Tree melihat empat pengukuran, yaitu panjang paruh, tebal paruh, panjang sirip, dan massa tubuh. Kita memakai 333 penguin yang keempat pengukurannya lengkap dan jenis kelaminnya tercatat. Pembagian stratified dengan seed 4 menghasilkan 200 penguin training, 67 validation, dan 66 test. Penguin test dibiarkan tidak tersentuh.

## Kedalaman: pertanyaan berurutan
*Bagaimana maximum depth menentukan ukuran tree?*

Setiap level tambahan dapat menggandakan jumlah leaf. Kedalaman 1 mengizinkan 2 leaf, kedalaman 2 mengizinkan 4, dan kedalaman 3 mengizinkan 8. Secara umum, kedalaman d mengizinkan paling banyak 2^d leaf.

[[figure:depth-and-leaf-size/depth-3-tree|Tree yang ditumbuhkan sampai maximum depth 3 pada 200 penguin training. Setiap leaf menampilkan jenis kelamin yang diprediksinya dan berapa penguin training yang sampai ke sana.]]

Tree ini memakai seluruh 8 leaf yang diizinkan. Pertanyaan pertamanya tentang massa tubuh, dan ukuran leaf-nya sangat timpang: satu leaf berisi 97 penguin, sedangkan yang lain hanya 2. Tanpa batas, data yang sama menumbuhkan 23 leaf dan baru berhenti di kedalaman 7, ketika setiap leaf sudah murni.

Maximum depth adalah batas atas, bukan target. Jika semua leaf sudah murni lebih awal, tree berhenti lebih awal.

> Awas: pada pertanyaan spesies, tree yang ditumbuhkan pada 206 penguin training dari "Baselines and splits" berhenti di kedalaman 3 dengan 5 leaf, dan menaikkan batas menjadi 10 tidak mengubah apa pun. Setiap leaf sudah murni, dengan 206 dari 206 benar. Batas ini baru berpengaruh ketika tree akan terus tumbuh tanpanya.

## Minimum leaf size: tanpa kelompok kecil
*Mengapa leaf tidak boleh berisi satu penguin saja?*

Leaf dengan satu penguin selalu murni. Ia menjawab "jantan" karena satu penguin itu jantan. Itu bukan pengetahuan tentang penguin, melainkan ingatan akan satu baris, dan bisa saja keliru untuk penguin serupa yang bukan jantan.

Minimum leaf size melarang split semacam itu. Gambar berikut menunjukkan leaf dari tree tanpa batas dan dari tree dengan minimum leaf size 10.

[[figure:depth-and-leaf-size/leaf-sizes|Leaf dari dua tree yang ditumbuhkan pada 200 penguin yang sama tanpa batas kedalaman. Minimum leaf size 1 menyisakan 7 leaf yang masing-masing hanya berisi satu penguin.]]

Berikut hasil percobaan yang sama dalam bentuk tabel. Accuracy adalah porsi penguin yang dijawab dengan benar. Berbeda dengan galat di pelajaran sebelumnya, di sini makin tinggi makin baik.

| Minimum leaf size | Leaf | Benar di training | Benar di validation |
|---|---|---|---|
| 1 | 23 | 200 dari 200 | 54 dari 67 |
| 2 | 20 | 194 dari 200 | 57 dari 67 |
| 5 | 16 | 185 dari 200 | 55 dari 67 |
| 10 | 9 | 182 dari 200 | 57 dari 67 |
| 50 | 3 | 165 dari 200 | 52 dari 67 |

Training accuracy turun terus seiring leaf yang makin besar, karena tree tidak lagi dapat menghafal penguin satu per satu. Validation accuracy tidak bergerak ke arah yang jelas antara ukuran 2 dan 10. Ukuran 50 terlalu ketat: tiga leaf tidak cukup untuk mengikuti polanya.

## Training dibandingkan validation
*Apa yang ditunjukkan kedua skor itu saat tree makin besar?*

Sekarang biarkan maximum depth bertambah dan beri skor pada setiap tree dua kali. Baris pertama adalah baseline: kelas mayoritas, yaitu jantan, dengan 101 dari 200 penguin training.

| Max depth | Leaf | Training accuracy | Validation accuracy |
|---|---|---|---|
| 0 | 1 | 50,5% | 50,7% |
| 1 | 2 | 76,5% | 56,7% |
| 2 | 4 | 91,0% | 85,1% |
| 3 | 8 | 94,0% | 88,1% |
| 4 | 13 | 95,0% | 86,6% |
| 5 | 17 | 96,5% | 85,1% |
| 6 | 21 | 97,5% | 80,6% |
| 7 | 23 | 100,0% | 80,6% |

[[figure:depth-and-leaf-size/depth-curves|Accuracy pada penguin training dan validation untuk maximum depth 0 sampai 8. Kiri: pembagian yang dipakai dalam tabel. Kanan: rata-rata dari 30 pembagian yang berbeda.]]

Training accuracy tidak pernah turun, dan mencapai 100% di kedalaman 7. Validation accuracy naik sampai 88,1% di kedalaman 3, lalu merosot perlahan ke 80,6%. Kedalaman 8 atau lebih tidak mengubah apa pun, karena tree kedalaman 7 sudah tidak punya leaf tidak murni yang dapat dibelah.

> Contoh hitungan: dari kedalaman 3 ke kedalaman 7, tree menjawab benar 200 - 188 = 12 penguin training lebih banyak. Pada penguin validation, ia menjawab benar 59 - 54 = 5 penguin lebih sedikit. Selisih antara kedua skor melebar dari 94,0% - 88,1% = 5,9 poin menjadi 100,0% - 80,6% = 19,4 poin.

::: deeper Mengapa training accuracy tidak pernah turun
Ambil satu kelompok berisi 10 penguin training, 6 jantan dan 4 betina. Kelompok ini memprediksi "jantan" dan benar 6. Belah dengan cara apa pun: tiap kelompok baru memprediksi mayoritasnya sendiri, dan jumlah kedua mayoritas itu setidaknya 6. Split menjadi (5 jantan, 1 betina) dan (1 jantan, 3 betina) menghasilkan 5 + 3 = 8 benar. Split menjadi (3, 2) dan (3, 2) menghasilkan 3 + 3 = 6 benar, tidak lebih buruk. Dengan begitu, setiap split membuat skor training tetap sama atau naik.
:::

## Satu pembagian belum cukup
*Seberapa jauh satu pembagian data dapat dipercaya?*

Semua hasil di atas berasal dari satu pembagian. Panel kanan pada gambar mengulang percobaan ini pada 30 pembagian stratified yang berbeda, seed 1 sampai 30, lalu merata-ratakannya. Hasilnya jauh lebih stabil.

- Training accuracy naik dari 91,6% di kedalaman 3 menjadi 99,8% di kedalaman 8.
- Validation accuracy nyaris tidak bergerak: 86,0% di kedalaman 3 dan 86,5% di kedalaman 8.
- Selisihnya melebar dari 5,6 poin menjadi 13,3 poin.

Tree yang ditumbuhkan penuh mendapat skor validation lebih rendah daripada tree kedalaman 3 pada 12 dari 30 pembagian, sama pada 6, dan lebih tinggi pada 12. Karena itu seed 4 adalah kasus yang lebih tajam daripada rata-rata. Yang berlaku secara rata-rata adalah ini: **setelah sekitar kedalaman 3, kedalaman tambahan menambah training accuracy cukup banyak, tetapi validation accuracy hampir tidak bertambah.** Leaf tambahan itu menghafal penguin satu per satu.

> Awas: 67 penguin validation adalah himpunan yang kecil. Satu penguin bernilai 1 / 67, sekitar 1,5 poin, sehingga turun dari 57 ke 55 benar berarti selisih 2 penguin, sekitar 3 poin. Jangan membaca selisih seperti itu sebagai putusan. Anggap selisih satu atau dua penguin pada skor validation sebagai seri.

## Memilih pengaturannya
*Bagaimana memilih depth dan leaf size dalam praktik?*

1. **Hitung baseline** pada validation set lebih dulu, supaya kamu tahu apa arti 50,7%.
2. **Coba berbagai nilai**, satu pengaturan per kali atau dikombinasikan, dan catat training dan validation accuracy untuk masing-masing.
3. **Ambil tree paling sederhana yang skornya mendekati yang terbaik di validation.** Mendekati berarti selisih satu atau dua penguin. Kedalaman 3 punya skor validation terbaik di sini, 59 dari 67, dengan 8 leaf. Untuk leaf size, ukuran 2 dan 10 sama-sama mendapat 57 dari 67, sehingga ukuran 10 pilihan yang lebih baik karena hanya membutuhkan 9 leaf, sedangkan ukuran 2 membutuhkan 20.
4. **Beri skor pada test set satu kali saja**, dengan pengaturan yang sudah kamu pilih.

Tree yang lebih sederhana bukan hanya lebih kecil kemungkinannya mengalami overfitting, tetapi juga lebih mudah dibaca dan dijelaskan.

::: deeper Cara lain menjaga tree tetap kecil
Maximum depth dan minimum leaf size bukan satu-satunya kendali. Sebagian pembuat tree juga menolak split yang penurunan impurity-nya di bawah batas tertentu. Yang lain menumbuhkan tree sepenuhnya lalu melakukan **pruning**, yaitu memangkas cabang yang tidak berguna pada data yang ditahan. Gagasannya sama: mengorbankan sedikit training accuracy demi tree yang lebih baik dalam generalisasi.
:::

## Sebelum lab
*Apa yang dapat kamu coba di lab kursus?*

Pelajaran berikutnya adalah lab, "Tree builder lab". Mengikuti rencana kursus, kamu membuat split pertama sendiri, lalu menumbuhkan tree dan membandingkan performa training dan validation-nya. Bawa tiga kebiasaan dari pelajaran ini. Perkirakan di mana validation accuracy berhenti membaik sebelum kamu mengubah depth. Baca kedua skor sebagai pasangan, bersama baseline. Periksa temuanmu pada pembagian yang baru, karena satu pembagian bisa menyesatkan.

Data dan pembagian di lab mungkin berbeda dari yang dipakai di sini, karena itu harapkan pola yang sama, bukan angka yang sama.

::: remember
- Maximum depth membatasi pertanyaan berurutan, sehingga kedalaman d mengizinkan paling banyak 2^d leaf. Minimum leaf size melarang leaf yang berisi terlalu sedikit baris training.
- Training accuracy tidak pernah turun saat tree membesar. Ketika validation accuracy berhenti naik dan selisihnya melebar, kedalaman tambahan hanya menghafal.
- Pilih pengaturan berdasarkan validation accuracy, ambil tree paling sederhana yang mendekati yang terbaik, dan anggap selisih satu atau dua penguin sebagai noise.
:::
