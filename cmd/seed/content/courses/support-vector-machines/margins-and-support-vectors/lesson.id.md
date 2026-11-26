---
slug: margins-and-support-vectors
title: Margin dan support vector
---
::: intro
- Jelaskan gagasan maximum-margin: dari semua garis yang memisahkan dua kelas, pilih garis dengan jalan kosong yang paling lebar.
- Sebutkan support vector, dan jelaskan mengapa hanya merekalah yang menentukan posisi boundary.
- Hitung sebuah margin dengan tangan memakai aturan lebar = 2 / |w| pada delapan titik contoh.

Sebelum mulai: baca "Probabilitas dan sigmoid" dan "Bagaimana k-NN mengambil keputusan".
:::

## Banyak garis, satu pilihan
*Bila banyak garis memisahkan dua kelas, garis mana yang sebaiknya dipilih model?*

Pada "Probabilitas dan sigmoid", regresi logistik menggambar decision boundary yang lurus. Misalkan kedua kelas dapat dipisahkan dengan bersih oleh sebuah garis lurus. Garis seperti itu tidak hanya satu, melainkan tak terhingga banyaknya: geser sedikit atau miringkan, dan garis tersebut tetap memisahkan setiap titik latih.

Garis-garis itu sepakat pada data latih, tetapi berbeda pendapat pada data baru. Sebuah titik baru yang jatuh di antara kedua kelompok berada di satu sisi pada garis yang satu dan di sisi lain pada garis yang lain. Harus ada aturan yang memutuskan.

**Support vector machine (SVM)** memutuskannya dengan satu aturan: pilih garis yang sejauh mungkin dari kedua kelas. Bayangkan garis itu sebagai garis tengah sebuah jalan. Lebarkan jalan itu sampai kedua tepinya menyentuh titik terdekat. Garis dengan jalan terlebar yang menang. Inilah gagasan **maximum-margin**.

[[figure:margins-and-support-vectors/many-lines|Tiga dari sekian banyak garis yang memisahkan data contoh, dengan lebar jalan 2, 2 dan 1,92, serta satu garis dengan jalan terlebar, 2,83.]]

## Jalan dan tepinya
*Apa itu margin dan support vector?*

**Margin** adalah lebar jalan: celah kosong di antara kedua kelas, diukur lurus melintang, dengan boundary di tengahnya. (Sebagian buku menyebut setengah dari lebar itu sebagai margin. Di kursus ini margin adalah lebar penuhnya.)

Kedua sisi jalan disebut **tepi**. Titik yang tepat berada di tepi adalah **support vector**. Titik-titik ini menahan jalan di tempatnya, seperti tiang yang menahan pagar. Titik lainnya berada lebih jauh, dengan jalan kosong antara titik itu dan tepi.

Pada gambar di atas, jalan terlebar menyentuh tepat dua titik, satu dari tiap kelas. Kedua titik itulah support vector-nya. Sebuah jalan membutuhkan sedikitnya satu di tiap sisi, sebab setiap sisi harus tertahan oleh sesuatu. Dengan data yang lebih banyak mungkin muncul beberapa support vector tambahan, biasanya hanya sebagian kecil dari seluruh titik.

> Gagasan kunci: SVM tidak bertanya di mana letak titik yang tipikal. Ia bertanya di mana kedua kelas paling mendekat satu sama lain, lalu menaruh boundary di tengah celah itu.

## Menuliskan jalan sebagai angka
*Bagaimana menuliskan sebuah jalan sebagai angka?*

Ambil delapan titik pada sebuah grid. Kelas A: (1, 1), (2, 1), (1, 2) dan (2, 2). Kelas B: (4, 4), (5, 4), (5, 5) dan (4, 6).

Sebuah garis lurus ditulis `w·x + b = 0`. Di sini w = (w1, w2) adalah sepasang bobot dan b adalah offset. **Skor** `w1·x1 + w2·x2 + b` bernilai 0 pada garis, positif di satu sisi dan negatif di sisi lainnya. Kita skala ulang w dan b agar skornya tepat -1 di tepi A dan +1 di tepi B. Dengan begitu, jalan adalah semua titik yang skornya di antara -1 dan +1.

Titik A yang paling dekat ke kelas B adalah (2, 2), dan titik B yang paling dekat ke kelas A adalah (4, 4). Itulah celah terpendek di antara kedua kelas, sehingga pasangan ini menahan jalan terlebar, dan kedua titik itu adalah support vector. Karena pasangan terdekat menahan jalan, w searah dengan ruas dari (2, 2) ke (4, 4), yaitu arah (1, 1): w = (a, a).

## Mencari w dan b
*Berapa w dan b untuk kedelapan titik ini?*

Kedua support vector berada di tepi jalan, dan itu memberi dua persamaan.

> Contoh hitungan: kedua tepi memberikan 4a + b = -1 di (2, 2) dan 8a + b = +1 di (4, 4). Persamaan kedua dikurangi persamaan pertama menghasilkan 4a = 2, sehingga a = 0,5, dan b = -1 - 4 × 0,5 = -3. Boundary-nya adalah `0,5·x1 + 0,5·x2 - 3 = 0`, yaitu garis x1 + x2 = 6.

| Titik | Kelas | Skor |
| --- | --- | --- |
| (1, 1) | A | -2 |
| (2, 1) dan (1, 2) | A | -1,5 |
| (2, 2) | A | -1 |
| (4, 4) | B | +1 |
| (5, 4) | B | +1,5 |
| (5, 5) dan (4, 6) | B | +2 |

Hanya (2, 2) dan (4, 4) yang tepat bernilai -1 dan +1. Semua titik lain mendapat skor di luar kedua nilai itu, sehingga tidak ada yang berada di dalam jalan.

## Lebar sama dengan 2 dibagi panjang w
*Mengapa lebar hanya bergantung pada w?*

**Panjang w** ditulis |w| dan sama dengan √(w1² + w2²). Di sini |w| = √(0,25 + 0,25) = 0,7071.

Aturannya: **lebar = 2 / |w|**. Dengan kata lain, skor naik sebesar 2 dari satu tepi (-1) ke tepi lainnya (+1). Setiap satu satuan jarak yang kamu tempuh lurus melintasi jalan mengubah skor sebesar |w|. Karena itu jarak melintangnya adalah 2 dibagi |w|.

> Contoh hitungan: lebar = 2 / 0,7071 = 2,83. Periksa dengan cara lain: ruas dari (2, 2) ke (4, 4) memotong jalan dengan sudut siku-siku, dan panjangnya √(2² + 2²) = 2,83. Kedua cara memberi hasil yang sama.

Garis vertikal x1 = 3 juga memisahkan data. Tepinya adalah x1 = 2 dan x1 = 4, sehingga |w| = 1 dan lebarnya 2. Garis diagonal lebih baik: 2,83 mengalahkan 2.

[[figure:margins-and-support-vectors/worked-street|Contoh hitungan: support vector (2, 2) dan (4, 4), tiga garis tempat skornya -1, 0 dan +1, serta perhitungan lebarnya.]]

> Gagasan kunci: w yang pendek berarti jalan yang lebar. Mencari jalan terlebar sama saja dengan mencari w terpendek yang menjaga setiap titik tetap di luar jalan dan di sisinya sendiri.

::: deeper Dari mana 2 / |w| berasal
Ambil titik x0 pada boundary, sehingga skornya 0. Bergeraklah dari x0 lurus ke arah kelas B, searah w, sejauh d. Skornya menjadi d × |w|. Skor itu mencapai +1 pada d = 1 / |w|. Karena simetri, skornya mencapai -1 pada jarak yang sama di sisi sebaliknya. Maka setiap separuh jalan selebar 1 / |w| dan seluruh jalan selebar 2 / |w|. Pada contoh, 1 / 0,7071 = 1,41, yaitu jarak dari (2, 2) ke garis x1 + x2 = 6.
:::

## Hanya support vector yang berpengaruh
*Apa yang terjadi pada jalan ketika titik dihapus atau ditambahkan?*

Hapus (1, 1) dan (5, 5), dua titik yang bukan support vector. Jalannya tidak bergerak: lebarnya tetap 2,83. Tidak ada yang menekan tepinya.

Sekarang hapus support vector (4, 4). Titik B terdekat dari (2, 2) menjadi (5, 4), pada jarak √(3² + 2²) = √13 = 3,61. Jalan menjadi lebih lebar dan miring, dan (5, 4) kini menjadi support vector. Titik yang tadinya aman di belakang dapat mengambil alih peran itu.

Tambahkan titik B baru di (3, 4), di dalam jalan yang lama. Jaraknya ke (2, 2) hanya √(1² + 2²) = √5 = 2,24, sehingga jalan menyempit menjadi 2,24 dan miring ke arah sebaliknya.

[[figure:margins-and-support-vectors/removing-points|Data yang sama dengan sebagian titik dihapus atau ditambahkan. Titik yang jauh tidak mengubah apa pun, tetapi menghapus atau menambah titik di dekat jalan menggeser jalan itu.]]

> Gagasan kunci: boundary ditentukan oleh support vector saja. Hapus semua titik latih lainnya lalu latih ulang, dan kamu mendapat garis yang sama. Geser sebuah support vector, dan garisnya ikut bergeser.

## Perbedaannya dengan yang sudah kamu kenal
*Apa bedanya boundary ini dengan regresi logistik dan k-NN?*

Ketiga model menggambar boundary, tetapi titik yang menentukannya berbeda-beda.

| Model | Boundary | Titik yang membentuknya |
| --- | --- | --- |
| Regresi logistik | Garis lurus | Semua titik, lewat loss; titik yang jauh hanya sedikit berpengaruh |
| k-NN | Mengikuti data, bentuk apa pun | Semua titik yang disimpan; yang terdekat memberi vote untuk tiap query |
| SVM, pelajaran ini | Garis lurus | Hanya support vector |

Regresi logistik mencocokkan satu rumus probabilitas pada semua titik sekaligus, sehingga titik yang jauh pun menambahkan dorongan kecil pada loss. k-NN menyimpan seluruh training set, seperti yang ditunjukkan "Bagaimana k-NN mengambil keputusan", dan boundary-nya dapat melengkung mengitari satu titik mana pun.

SVM hanya memperhatikan celah di antara kedua kelas. Karena itu ia disebut model **sparse**: hanya sedikit titik yang berarti, dan sisanya dapat dibuang tanpa mengubah jawabannya.

::: deeper Satuan mengubah jalan
Lebar diukur dalam satuan feature. Regangkan feature kedua pada data contoh dengan faktor 10, dan kedua titik yang sama tetap menjadi support vector, tetapi jalannya menjadi selebar 20,10 dan boundary-nya hampir datar. Feature dengan skala besar mendominasi jarak, sama seperti pada k-NN dan k-means. Karena itu, lakukan scaling pada feature sebelum melatih SVM.
:::

## Yang tidak dapat dilakukan jalan biasa
*Kapan jalan terlebar gagal, dan ke mana kursus ini melangkah selanjutnya?*

Semua pembahasan sejauh ini mengandaikan dua hal: sebuah garis lurus memisahkan kelas-kelas dengan sempurna, dan tidak ada satu titik pun yang letaknya sangat janggal. Data nyata melanggar keduanya.

Bila kelas-kelasnya tumpang tindih, tidak ada garis yang menyisakan jalan kosong, sehingga aturan maximum-margin tidak punya apa pun untuk dimaksimalkan. Satu titik yang menyimpang juga dapat merusaknya: menambahkan (3, 4) memangkas jalan contoh dari 2,83 menjadi 2,24.

Pelajaran berikutnya mengatasi kedua masalah itu. Pelajaran tersebut membolehkan beberapa titik berada di dalam jalan, atau di sisi yang salah, dengan membayar sejumlah harga, dan melengkungkan boundary dengan kernel sehingga bentuk kelas yang melengkung menjadi mungkin.

Setelah itu datang SVM lab. Di sana kamu menggeser sebuah support vector sendiri dan melihat margin berubah, lalu membandingkan boundary linear dan RBF.

::: remember
- Banyak garis memisahkan dua kelas. SVM memilih garis dengan jalan kosong terlebar, yaitu garis maximum-margin.
- Support vector adalah titik-titik di tepi jalan. Hanya merekalah yang menentukan boundary, sehingga menghapus titik lain tidak mengubah apa pun.
- Lebarnya adalah 2 / |w|: w yang lebih pendek berarti jalan yang lebih lebar. Pada contoh, w = (0,5; 0,5) memberi 2 / 0,7071 = 2,83.
:::
