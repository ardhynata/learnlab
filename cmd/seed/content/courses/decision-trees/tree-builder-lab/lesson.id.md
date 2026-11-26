---
slug: tree-builder-lab
title: Lab pembuat tree
---
::: intro
- Buat sendiri split pertama sebuah tree, lalu baca Gini impurity dan penurunan impurity-nya.
- Tumbuhkan sisa tree, dan bandingkan training accuracy dengan validation accuracy di setiap kedalaman.
- Perkirakan di mana kedalaman tambahan berhenti membantu, lalu periksa gagasan itu pada penguin nyata dengan sampel yang baru.

Sebelum mulai: baca "Split dan impurity" serta "Kedalaman dan ukuran leaf".
:::

## Apa yang diminta lab ini
*Apa yang kamu kerjakan di Lab pembuat tree?*

Dua pelajaran sebelumnya memberimu aturan untuk menilai sebuah split dan dua pengaturan yang membatasi tree. Di lab ini kamu menjalankan keduanya. Kamu membuat split pertama sendiri, membiarkan tree menumbuhkan sisanya, lalu membandingkan hasilnya pada titik yang dipelajari tree dengan hasilnya pada titik yang belum pernah dilihatnya.

Lab menggambar 150 titik dalam dua kelas. Sebanyak 100 titik acak menjadi titik **training**, digambar sebagai bulatan, dan hanya dari titik inilah tree belajar. Sisanya, 50 titik, adalah titik **validation**, digambar sebagai silang, yang disisihkan untuk menguji tree. Lab ini tidak memakai test set, hanya validation.

Kedalaman dihitung seperti di "Kedalaman dan ukuran leaf", dengan satu perbedaan. Kedalaman 1 adalah split pertamamu saja, yang menghasilkan 2 leaf. Lab ini tidak punya kedalaman 0, yaitu baseline berupa satu leaf. Tree yang lebih dalam menambahkan pertanyaan setelah pertanyaan pertamamu.

Lab dimulai dengan pola **Gumpalan yang tumpang tindih**. Kelas-kelasnya saling menumpuk, sehingga tidak ada tree yang dapat sempurna pada titik yang belum pernah dilihatnya.

## Membuat split pertama
*Seberapa baik potongan yang kamu pilih?*

Pilih sebuah feature dan threshold dengan menyeret di plot, menekan tombol panah, atau memakai slider. Tabel **Split pertamamu** menampilkan jumlah per kelas dan Gini impurity dari seluruh training set, dari masing-masing sisi, dan Gini berbobot setelah split. Baris terakhirnya, **Penurunan impurity**, adalah gain dari "Split dan impurity".

Pada awalnya split-nya adalah Feature 1 ≤ 3,4. Sisi kiri berisi 30 titik training, semuanya Kelas A. Sisi kanan berisi 70 titik: 19 Kelas A dan 51 Kelas B.

> Contoh hitungan: sisi kanan punya Gini 1 - (19/70)² - (51/70)² = 1 - 2962/4900 = 0,396. Gini berbobotnya 30/100 × 0 + 70/100 × 0,396 = 0,277. Seluruh set punya Gini 0,500, sehingga penurunan impurity-nya 0,500 - 0,277 = **0,223**.

Sisi kiri sudah murni sempurna, tetapi potongan ini bukan yang terbaik. Lab menyatakannya di bawah tabel: split pertama terbaik adalah Feature 1 ≤ 4,8, dengan penurunan 0,371.

[[figure:tree-builder-lab/first-split|Ke-100 titik training yang sama dipotong pada posisi awal lab (Feature 1 ≤ 3,4) dan pada split pertama terbaik (Feature 1 ≤ 4,8). Potongan terbaik tidak murni di sisi kiri, tetapi kedua sisinya hampir murni.]]

Potongan terbaik menaruh 52 titik di sisi kirinya (47 A, 5 B) dan 48 titik di sisi kanannya (2 A, 46 B). Gini berbobotnya 0,129, sehingga penurunannya 0,371. Satu kelompok murni berisi 30 titik memberi sumbangan lebih kecil pada total daripada dua kelompok berisi sekitar 50 titik yang masing-masing hampir murni.

## Menumbuhkan sisanya
*Apa yang dilakukan tree setelah split pertamamu?*

Tekan **Tumbuhkan sisanya**. Setiap sisi split-mu menjadi masalah baru yang lebih kecil, dan tree membelahnya lagi dengan potongan terbaik yang dapat ditemukannya, seperti di "Split dan impurity". Dua pengaturan menghentikan pertumbuhan itu. **Kedalaman maksimum** membatasi jumlah pertanyaan berurutan, dan **Ukuran leaf minimum** melarang potongan yang menyisakan leaf dengan titik training terlalu sedikit. Ukuran leaf minimum tidak berlaku untuk split pertamamu, karena kamu sendiri yang memilihnya.

Plot mewarnai wilayah setiap leaf dengan kelas yang diprediksinya. Split-mu berupa garis tebal, dan split berikutnya berupa garis putus-putus.

[[figure:tree-builder-lab/grown-trees|Tree yang ditumbuhkan dari split pertama terbaik sampai kedalaman 1, 3, dan 5. Setiap leaf berupa persegi panjang yang diwarnai dengan kelas yang diprediksinya. Training accuracy naik di setiap level; validation accuracy naik jauh lebih sedikit.]]

Dari split pertama terbaik, kedalaman 3 menghasilkan 6 leaf, dengan 97% titik training dan 82% titik validasi benar. Kedalaman 5 menghasilkan 10 leaf dan training accuracy 100%. Setelah kedalaman 5 tidak ada yang berubah, karena setiap leaf sudah murni dan kelompok murni tidak punya apa pun lagi untuk dibelah.

## Dua skor, satu pertanyaan
*Apa yang diberitahukan skor training dan validation kepadamu?*

Grafik **Training dan validation accuracy per kedalaman** menggambar kedua skor untuk kedalaman 1 sampai 10, dan tabel **Accuracy di setiap kedalaman** memuat angka yang sama. Training accuracy tidak pernah turun saat tree tumbuh. Yang perlu dilihat adalah apakah validation accuracy mengikutinya.

Pada gumpalan yang tumpang tindih, ia hanya mengikuti sedikit. Dari kedalaman 1 ke kedalaman 5, training naik dari 93% ke 100%, bertambah 7 poin. Validation naik dari 80% ke 84%, bertambah 2 titik validasi dari 50.

Pola papan catur, yang sekitar 8% labelnya sengaja dibalik, menceritakan hal yang lebih jelas: validation mencapai 88% di kedalaman 4 dari split awal lab, lalu turun ke 78% di kedalaman 7, sementara training mencapai 100%. Tree yang dalam itu telah menghafal label yang dibalik.

[[figure:tree-builder-lab/depth-curves|Accuracy terhadap maximum depth pada dua sampel. Kiri: gumpalan, tempat validation mendatar di 84%. Kanan: pola papan catur dari split awal lab, tempat validation memuncak di 88% lalu turun. Lingkaran menandai validation accuracy terbaik.]]

> Awas: validation hanya punya 50 titik, sehingga satu titik bernilai 2 poin persentase. Perubahan satu titik dianggap seri, seperti di "Kedalaman dan ukuran leaf". Putusan lab berbunyi "turun" ketika kedalaman terakhir berada paling sedikit 3 poin di bawah puncaknya, dan itu hanya dua titik validasi.

## Prediksi, ubah, jelaskan, terapkan
*Mengapa menebak dulu sebelum menggeser slider?*

Setiap percobaan di bawah mengikuti pola yang sama. **Prediksi** apa yang akan terjadi. **Ubah** satu hal saja. **Jelaskan** hasilnya dengan gagasan dari kursus ini. **Terapkan** gagasan itu pada penguin nyata, lalu periksa pada sampel yang baru.

Lab punya satu kotak **Kuis Cepat**: "Apakah validation accuracy akan terus naik saat pohon makin dalam?" Pilih satu jawaban, tekan **Tumbuhkan sisanya**, lalu tekan **Cek prediksiku**. Sebelum kamu mengeceknya, grafik dan tabel hanya menampilkan validation accuracy untuk kedalaman yang sudah kamu coba, sehingga kamu tidak dapat membaca jawabannya dari grafik. Jawaban kotak ini bergantung pada split pertama dan ukuran leaf minimum yang kamu pakai, dan ia mulai dari awal ketika kamu mengubah data atau menekan **Sampel baru**.

Tebakan yang salah justru berguna. Jika kamu menebak validation akan terus naik padahal ia mendatar, pemahamanmu tentang kedalaman masih kurang satu gagasan, dan langkah menjelaskan adalah tempat memperbaikinya.

> Gagasan kunci: kuis cepat, ubah satu hal setiap kali, dan jelaskan setiap selisih antara tebakanmu dan hasilnya.

## Penguin nyata, sampel baru
*Apakah gagasan ini berlaku pada data nyata dan pada sampel yang baru?*

Ubah **Data** menjadi **Penguin (data nyata)**. Kelasnya kini tiga spesies, dan pengukuran horizontal dan vertikalnya adalah **Panjang flipper** dan **Panjang paruh**. Lab menggambar 150 dari 342 penguin yang memiliki kedua pengukuran yang dipilih, 100 untuk training dan 50 untuk validation.

Pada sampel pertama, **Lompat ke split pertama terbaik** menghasilkan Panjang flipper ≤ 206,5 mm, dengan penurunan impurity 0,341. Setelah ditumbuhkan sampai kedalaman 2, tree menjawab benar 96% penguin training dan 96% penguin validasi. Pada kedalaman 10 ia punya 11 leaf, 100% pada training dan 90% pada validation.

**Sampel baru** mengambil 150 penguin lain. Pada masing-masing dari empat sampel, dengan split pertama terbaik:

| Sampel | Validation terbaik | Di kedalaman | Validation di kedalaman 10 | Training di kedalaman 10 |
|---|---|---|---|---|
| Pertama | 96% | 2 | 90% | 100% |
| Kedua | 92% | 3 | 90% | 100% |
| Ketiga | 98% | 2 | 98% | 100% |
| Keempat | 92% | 3 | 90% | 100% |

Kedalaman terbaiknya selalu 2 atau 3, dan tree yang lebih dalam tidak pernah mengunggulinya. Namun besar penurunannya berbeda dari sampel ke sampel, dan pada satu sampel penurunannya nol. Itulah pelajaran dari "Satu pembagian belum cukup": baca polanya di berbagai sampel, bukan satu angka.

::: deeper Mengapa split satu langkah terbaik dapat memulai tree yang buruk
Lab memilih split pertama terbaik dengan melihat satu langkah ke depan. Itu tidak selalu awal yang terbaik. Pada pola papan catur, split pertama terbaiknya adalah Feature 1 ≤ 9,0, dengan penurunan impurity hanya 0,027: ia memotong 5 titik Kelas A di tepi kanan. Setelah ditumbuhkan sampai kedalaman 3 dari sana, tree mendapat 58% pada training dan 50% pada validation. Split awal lab sendiri, sekitar Feature 1 ≤ 3,0, hanya punya penurunan 0,005 tetapi mencapai 86% dan 82% di kedalaman 3. Pembuat tree yang greedy hanya melihat potongan berikutnya, sehingga keuntungan kecil sekarang dapat menyembunyikan pola yang baru ditemukan oleh beberapa potongan sekaligus.
:::

::: remember
- Sebuah split dinilai dari penurunan impurity-nya: Gini sebelum dikurangi Gini berbobot sesudah. Split pertama terbaik belum tentu yang sisinya paling murni.
- Maximum depth dan minimum leaf size membatasi seberapa halus tree memotong. Training accuracy terus naik seiring kedalaman; validation accuracy mendatar atau turun begitu leaf tambahan hanya menghafal.
- Baca kedua skor bersama, anggap perubahan satu atau dua titik validasi sebagai seri, dan periksa temuanmu pada sampel yang baru.
:::

@@lab

## Lab: Bangun decision tree
Kamu membuat split pertama sebuah tree pada 100 titik training, lalu menumbuhkan sisanya dan membandingkan training accuracy dengan validation accuracy di setiap kedalaman. Lab dimulai dengan **Gumpalan yang tumpang tindih** buatan (150 titik, 100 untuk training dan 50 untuk validation) dengan split pertamamu di Feature 1 ≤ 3,4.

### Kontrol
- **Data** berganti antara **Data buatan** dan **Penguin (data nyata)**. Data nyata mewarnai titik menurut spesies dan punya tiga kelas.
- **Pola** (hanya data buatan) adalah **Gumpalan yang tumpang tindih** atau **Pola papan catur**. Pola papan catur sengaja membalik sekitar 8% labelnya.
- **Pengukuran horizontal** dan **Pengukuran vertikal** (hanya data nyata) memilih dua dari **Panjang paruh**, **Kedalaman paruh**, **Panjang flipper**, dan **Massa tubuh**. Keduanya dimulai sebagai Panjang flipper dan Panjang paruh, dan tidak pernah boleh sama.
- **Sampel baru** mengambil 150 titik acak yang baru, atau 150 penguin, dan mengembalikan split pertamamu ke posisi awal.
- **Split pertama pada** memilih **Fitur horizontal** atau **Fitur vertikal**. **Threshold split pertama** adalah slider untuk potongannya, dan kamu juga dapat mengklik atau menyeret di plot, atau menekan tombol panah saat plot terfokus (Shift untuk langkah yang lebih besar).
- **Lompat ke split pertama terbaik** memindahkan potonganmu ke posisi dengan penurunan impurity terbesar.
- **Tumbuhkan sisanya** membiarkan tree terus membelah dengan dua pengaturan di bawah. **Kembali ke split pertama saja** mengembalikan tampilan ke splitmu sendiri.
- **Kedalaman maksimum** (1 sampai 10, mulai di 3) dan **Ukuran leaf minimum** (1 sampai 20, mulai di 1) bekerja setelah tree ditumbuhkan.
- **Tampilkan titik validasi** menyembunyikan atau menampilkan tanda silang.
- **Cek prediksiku** menjawab kotak **Kuis Cepat** dan menampilkan validation accuracy di setiap kedalaman.
- **Layar penuh** memperbesar lab. **Reset** mengembalikan ke Gumpalan yang tumpang tindih buatan, sampel bawaan, split awal, tree yang belum ditumbuhkan, dan pengaturan bawaan.

### Yang kamu lihat
- Plot menampilkan titik training sebagai bulatan dan titik validasi sebagai silang. Cincin di sekeliling sebuah silang menandai **Titik validasi yang salah ditebak pohon**. Garis tebal adalah **Split pertamamu**; setelah tree ditumbuhkan, **Split berikutnya** berupa garis putus-putus. Belah ketupat adalah gagang threshold-mu. Wilayah setiap leaf diwarnai dengan kelas yang diprediksinya.
- Kalimat status berbunyi, misalnya, "Split pertama: Feature 1 ≤ 3,4. Gini 0,500 sebelum, 0,277 sesudah: penurunan impurity 0,223." Di bawahnya, baris rincian menampilkan jumlah leaf, training accuracy, dan validation accuracy dari tree yang sedang kamu lihat, dan **Leaf** ditampilkan di sebelah kanannya.
- Tabel **Split pertamamu** punya kolom **Kelompok**, **Titik**, **Jumlah per kelas**, dan **Gini**, serta baris **Semua titik training**, **Kiri** dan **Kanan** (masing-masing diikuti aturannya), **Setelah split (berbobot)**, dan **Penurunan impurity**. Di bawahnya, satu baris menyebutkan split pertama terbaik yang mungkin beserta penurunannya di samping milikmu.
- Grafik **Training dan validation accuracy per kedalaman** punya garis putus-putus vertikal pada kedalaman yang sedang kamu lihat, dengan label "kedalaman: N". Sebelum kamu mengecek prediksimu, garis validation hanya menampilkan kedalaman yang sudah kamu coba. Sesudahnya, kedalaman validation terbaik dilingkari.
- Tabel **Accuracy di setiap kedalaman** punya kolom **Kedalaman**, **Leaf**, **Training accuracy**, dan **Validation accuracy**. Tanda "?" menandai kedalaman yang belum kamu coba.
- Kotak **Kuis Cepat** berbunyi "Apakah validation accuracy akan terus naik saat pohon makin dalam?" dengan jawaban **Ya, terus naik**, **Naik dulu, lalu mendatar**, dan **Naik dulu, lalu turun**.

### Percobaan
Angka-angkanya berlaku untuk sampel bawaan. Tekan **Reset** sebelum setiap percobaan agar angkamu sama.

1. Prediksi: split pertamamu di Feature 1 ≤ 3,4 punya sisi kiri yang murni sempurna. Apakah menggeser potongan ke kanan akan menaikkan atau menurunkan penurunan impurity? Baca tabel di awal: 30 titik di kiri (30 A, 0 B), 70 di kanan (19 A, 51 B), penurunan 0,223. Sekarang tekan **Lompat ke split pertama terbaik**, atau seret potongan ke sekitar 4,8. Sisi kiri tidak lagi murni (47 A, 5 B, Gini 0,174), tetapi sisi kanan lebih bersih (2 A, 46 B, Gini 0,080), dan penurunannya naik menjadi 0,371. Jelaskan: mengapa satu kelompok murni berisi 30 titik bernilai lebih kecil daripada dua kelompok yang hampir murni berisi sekitar 50 titik?
2. Prediksi: berapa training accuracy dan validation accuracy ketika tree tumbuh dari split pertama terbaikmu? Tekan **Lompat ke split pertama terbaik**, lalu **Tumbuhkan sisanya**. Di kedalaman 3, baris rincian menyebut 6 leaf, training accuracy 97% dan validation accuracy 82%. Tekan **Cek prediksiku**, lalu atur **Kedalaman maksimum** ke 5 dan ke 10, dan baca grafik serta tabelnya. Training mencapai 100% di kedalaman 5 dengan 10 leaf, validation berhenti naik di 84%, dan kedalaman 6 sampai 10 tidak mengubah apa pun. Jelaskan: mengapa tree berhenti tumbuh di 10 leaf?
3. Prediksi: apakah split pertama masih penting setelah tree ditumbuhkan? Tekan **Reset** dan **Tumbuhkan sisanya** tanpa melompat. Di kedalaman 3, split awalmu menghasilkan 5 leaf, training 97% dan validation 82%, skor yang sama dengan split pertama terbaik. Tekan **Kembali ke split pertama saja**: sekarang hasilnya 81% dan 72%, dibandingkan 93% dan 80% untuk split terbaik. Jelaskan: apa yang diperbaiki oleh split berikutnya, dan apa yang tidak akan diperbaikinya?
4. Prediksi: apa yang terjadi pada training accuracy, validation accuracy, dan jumlah leaf ketika **Ukuran leaf minimum** dinaikkan? Tekan **Lompat ke split pertama terbaik** dan **Tumbuhkan sisanya**, atur **Kedalaman maksimum** ke 10, lalu coba 1, 5, dan 10. Jumlah leaf-nya 10, 6, 4, training accuracy 100%, 95%, 93%, dan validation accuracy 84%, 82%, 80%. Training turun paling banyak. Jelaskan: penurunan dari 84% ke 82% hanyalah satu titik validasi dari 50, jadi pengaturan mana yang akan kamu pilih, dan mengapa?
5. Prediksi: pada **Pola papan catur**, apakah validation accuracy akan terus naik? Atur **Pola** ke **Pola papan catur** dan biarkan split awalnya, tekan **Tumbuhkan sisanya**, lalu naikkan **Kedalaman maksimum** dari 1 sampai 10 sebelum kamu menekan **Cek prediksiku**. Validation 88% di kedalaman 4 (13 leaf) dan 78% di kedalaman 7 (23 leaf), sementara training naik dari 93% ke 100%. Lalu atur **Ukuran leaf minimum** ke 5: validation accuracy bertahan di 94% sejak kedalaman 4, dan training bertahan di 88%. Jelaskan: apa yang dihafal tree yang dalam itu? Sebagai tambahan, tekan **Lompat ke split pertama terbaik**: penurunannya hanya 0,027. Mengapa split pertama yang greedy kadang memulai tree yang buruk?
6. Prediksi: pada penguin nyata, apakah validation accuracy terbaik ada pada tree yang dalam atau yang dangkal? Tekan **Reset**, atur **Data** ke **Penguin (data nyata)**, tekan **Lompat ke split pertama terbaik** (Panjang flipper ≤ 206,5 mm, penurunan 0,341) dan **Tumbuhkan sisanya**. Naikkan **Kedalaman maksimum** dari 1 sampai 10 dan baca tabelnya: validation 96% di kedalaman 2 dan 90% di kedalaman 10, sementara training mencapai 100%. Tekan **Cek prediksiku**. Sekarang ulangi tiga kali: tekan **Sampel baru**, tekan **Lompat ke split pertama terbaik**, lalu **Cek prediksiku**, dan catat kedalaman terbaik dan skor validation di kedalaman 10: kedalaman terbaiknya 2 atau 3, dan kedalaman 10 menghasilkan 90%, 98%, dan 90%. Apakah gagasan itu bertahan pada sampel baru, dan selisih mana yang terlalu kecil untuk dipercaya dengan 50 titik validasi?
