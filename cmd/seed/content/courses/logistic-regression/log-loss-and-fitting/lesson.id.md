---
slug: log-loss-and-fitting
title: Log loss dan proses fitting
---
::: intro
- Hitung log loss dari satu prediksi, dan dari sekumpulan kecil prediksi, secara manual.
- Jelaskan mengapa jawaban salah yang diberikan dengan yakin dihukum jauh lebih berat daripada jawaban yang ragu-ragu, dan apa bedanya dengan squared error.
- Gambarkan bagaimana gradient descent mencari koefisien, lalu ikuti satu langkahnya pada contoh kecil.

Sebelum mulai: baca "Probabilitas dan sigmoid" dan "Loss function".
:::

## Probabilitas butuh skor yang lebih baik daripada benar atau salah
*Mengapa menghitung jumlah kesalahan belum cukup untuk model yang memberikan probabilitas?*

Model regresi logistik tidak hanya menjawab "spam" atau "bukan spam". Ia mengeluarkan probabilitas, misalnya 0,99 atau 0,6. Kalau kita hanya menghitung jawaban yang benar dan yang salah, angka itu terbuang. Misalkan sebuah email memang spam. Model yang memberinya 0,99 dan model yang memberinya 0,51 sama-sama benar selama semua yang di atas 0,5 kita sebut "spam", padahal model pertama jauh lebih yakin.

Kebutaan yang sama juga menyembunyikan kesalahan terburuk. Misalkan sebuah email bukan spam. Model yang memberinya 0,6 dan model yang memberinya 0,99 sama-sama salah, tetapi model kedua akan membuang pesan yang sah ke tempat sampah dengan keyakinan penuh.

Untuk mencari koefisien, komputer memerlukan skor yang memperhitungkan seberapa yakin model itu. Skor tersebut adalah **log loss**, yang juga disebut cross-entropy. Ia adalah loss dalam pengertian "Loss function": satu angka untuk seluruh dataset, makin rendah makin baik, dan proses fitting tidak melihat hal lain selain angka itu.

> Gagasan kunci: log loss menilai probabilitas yang diberikan model, bukan hanya jawaban yang dipilihnya.

## Loss untuk satu contoh
*Berapa harga satu prediksi?*

Setiap contoh latih punya label yang benar, 1 atau 0, dan model memberikan probabilitas **p** bahwa labelnya adalah 1. Log loss melihat probabilitas yang diberikan model untuk kejadian yang sebenarnya terjadi:

- Label benar 1: `loss = -ln(p)`
- Label benar 0: `loss = -ln(1 - p)`

`ln` adalah logaritma natural, tombol yang ada di kalkulator mana pun. Kamu hanya perlu mengenal bentuknya: `ln(1)` bernilai 0, dan `ln` dari bilangan yang dekat dengan 0 adalah bilangan negatif yang besar. Karena itu probabilitas yang kecil untuk kebenaran menghasilkan loss positif yang besar.

| Probabilitas yang diberikan model untuk kejadian sebenarnya | Loss |
|---|---|
| 0,99 | 0,010 |
| 0,9 | 0,105 |
| 0,7 | 0,357 |
| 0,5 | 0,693 |
| 0,3 | 1,204 |
| 0,1 | 2,303 |
| 0,01 | 4,605 |

[[figure:log-loss-and-fitting/loss-curve|Loss dari satu contoh terhadap probabilitas model untuk kelas 1. Kurva untuk label benar 1 turun saat p naik; kurva untuk label benar 0 adalah bayangan cerminnya.]]

Loss tidak pernah negatif, dan baru bernilai 0 ketika model memberikan probabilitas 1 untuk kebenaran.

## Yakin tetapi salah
*Mengapa jawaban salah jauh lebih mahal ketika model yakin?*

Bacalah tabel dari bawah. Ketika model memberi kebenaran hanya 0,5, loss-nya 0,693, sama saja label mana pun yang benar. Pada 0,1 loss-nya 2,303, lebih dari tiga kali lipat. Pada 0,01 loss-nya 4,605. Tidak ada batas atas: pada 0,001 loss-nya 6,908, dan terus bertambah selama probabilitas untuk kebenaran menuju 0. Setiap kali probabilitas itu mengecil sepuluh kali lipat, loss naik sekitar 2,3.

Benar dan yakin hampir tidak dikenai biaya: 0,010 pada 0,99. Maka model diberi hadiah untuk keyakinan saat ia benar, dan dikenai harga mahal saat ia salah. Langkah paling aman bagi model yang sama sekali tidak tahu apa-apa adalah menjawab sekitar 0,5 dan membayar 0,693 apa pun labelnya.

> Awas: `-ln(0)` tak terhingga. Di dalam kode, p biasanya dijaga agar berjarak sangat kecil dari 0 dan 1, supaya satu prediksi ekstrem tidak membuat seluruh loss menjadi tak terhingga.

Inilah perilaku yang kita inginkan dari model yang melaporkan probabilitas: model yang berkata 99 persen seharusnya benar sekitar 99 kali dari 100, dan log loss paling keras terhadap yang tidak demikian.

## Merata-ratakan seluruh data
*Bagaimana beberapa contoh menjadi satu skor?*

Loss sebuah dataset adalah **rata-rata** loss dari contoh-contohnya. Berikut empat contoh dan dua model.

| Contoh | Label benar | Model A: p | Model B: p | Loss A | Loss B |
|---|---|---|---|---|---|
| 1 | 1 | 0,8 | 0,8 | -ln(0,8) = 0,223 | 0,223 |
| 2 | 1 | 0,7 | 0,7 | -ln(0,7) = 0,357 | 0,357 |
| 3 | 0 | 0,3 | 0,3 | -ln(0,7) = 0,357 | 0,357 |
| 4 | 0 | 0,6 | 0,99 | -ln(0,4) = 0,916 | -ln(0,01) = 4,605 |
| Rata-rata | | | | 0,463 | 1,385 |

[[figure:log-loss-and-fitting/two-models|Loss tiap contoh pada kedua model. Keduanya hanya berbeda pada contoh 4, tempat model B salah dengan penuh keyakinan.]]

Dengan cutoff 0,5, kedua model benar pada contoh 1 sampai 3 dan salah pada contoh 4, sehingga accuracy keduanya 3 dari 4. Log loss dapat membedakan keduanya: 0,463 melawan 1,385. Contoh 4 menyumbang 83 persen dari total B.

Ada pula sebuah baseline. Model yang menjawab 0,5 untuk setiap contoh membayar 0,693 di tiap contoh, sehingga rata-ratanya 0,693. Model A mengalahkannya. Model B, dengan 1,385, lebih buruk daripada model yang tidak pernah melihat data.

## Mengapa bukan squared error?
*Mengapa tidak memakai ulang loss dari regresi linear?*

Kamu dapat menganggap label sebagai angka 0 atau 1 dan memakai selisih kuadrat `(y - p)²`, seperti pada MSE. Arahnya benar, tetapi terlalu lembut. Ambil label benar 1:

- Model menjawab p = 0,1: squared error-nya (1 - 0,1)² = 0,810, log loss-nya 2,303.
- Model menjawab p = 0,01: squared error-nya (1 - 0,01)² = 0,980, log loss-nya 4,605.

Squared error pada probabilitas tidak pernah melebihi 1, sehingga kesalahan dengan keyakinan 99 persen berbiaya hampir sama dengan kesalahan dengan keyakinan 90 persen. Log loss naik dua kali lipat dari 2,303 menjadi 4,605. Ia mendorong makin keras, makin yakin model itu.

[[figure:log-loss-and-fitting/log-vs-squared|Untuk label benar 1, log loss naik tanpa batas saat p turun, sedangkan squared error mendatar di bawah 1.]]

> Gagasan kunci: log loss dibangun dari probabilitas yang diberikan model untuk kebenaran, sehingga tidak punya batas atas. Squared error pada probabilitas punya.

::: deeper Mengapa squared error juga belajar lambat
Gradient descent mengikuti kemiringan (slope) kurva loss terhadap skor mentah z, angka yang diubah sigmoid menjadi p. Untuk log loss, kemiringan itu `p - y`. Untuk squared error, kemiringannya `2(p - y) p (1 - p)`.

Ambil label benar 0 dan model yang menjawab p = 0,99. Log loss punya kemiringan 0,99. Squared error punya kemiringan 2 × 0,99 × 0,99 × 0,01 = 0,0196, sekitar 50 kali lebih kecil. Model itu sangat salah, tetapi squared error nyaris tidak menggesernya.
:::

## Fitting dengan gradient descent
*Bagaimana komputer menemukan koefisien dengan log loss yang rendah?*

Modelnya adalah `p = sigmoid(w x + b)`: bobot w untuk setiap feature dan intercept b, yang disebut **koefisien**. Setiap pilihan koefisien menghasilkan rata-rata log loss yang dapat dihitung, sehingga fitting berarti mencari koefisien yang membuatnya kecil. Tidak ada rumus yang langsung memberi jawabannya, sehingga komputer mencarinya dengan **gradient descent**:

1. Mulai dari koefisien sembarang; nol pun boleh.
2. Untuk tiap koefisien, hitung **gradient**: seberapa cepat loss naik ketika koefisien itu digeser ke atas.
3. Geser tiap koefisien selangkah kecil ke arah sebaliknya, menuruni lereng. Ukuran langkahnya adalah **learning rate**.
4. Ulangi sampai loss berhenti turun.

Untuk log loss, gradient-nya sederhana. Ambil rata-rata dari semua contoh:

- bobot: `(p - y) × x`
- intercept: `p - y`

Bacalah sebagai galat kali input. Sebuah contoh menarik keras ketika probabilitasnya jauh dari labelnya, dan feature dengan x besar menarik bobotnya sendiri lebih keras. Contoh yang yakin dan benar (p dekat dengan y) hampir tidak menarik sama sekali.

::: deeper Dari mana p - y berasal
Rantaikan tiga kemiringan (slope) kurva. Untuk label benar 1, loss `-ln(p)` punya kemiringan `-1/p` terhadap p, dan sigmoid punya kemiringan `p(1 - p)` terhadap z. Kalikan keduanya: `-(1 - p)`, yaitu `p - 1`, yaitu `p - y`. Untuk label benar 0, kemiringan loss-nya `1/(1 - p)`, dan hasil kalinya `p`, yaitu `p - 0`. Kemudian z = w x + b punya kemiringan x terhadap w dan 1 terhadap b. Suku `p(1 - p)` yang merepotkan itu saling menghilangkan, satu alasan lagi mengapa log loss sesuai dipasangkan dengan sigmoid.
:::

## Satu langkah secara manual
*Apa yang dilakukan satu langkah terhadap angka-angkanya?*

Ambil satu feature x yang sudah dipusatkan di 0 (jam latihan dikurangi rata-rata kelas), dan empat contoh: x = -3, -1, 1, 3 dengan label 0, 0, 1, 1 (gagal, gagal, lulus, lulus). Mulai dari w = 0 dan b = 0, sehingga semua p bernilai 0,5 dan rata-rata loss-nya 0,693. Pakai learning rate 0,5.

1. **Galat.** `p - y` bernilai 0,5, 0,5, -0,5, -0,5.
2. **Gradient untuk w.** Rata-rata `(p - y) × x` adalah (0,5 × -3 + 0,5 × -1 + -0,5 × 1 + -0,5 × 3) / 4 = -4 / 4 = -1.
3. **Gradient untuk b.** Rata-rata `p - y` adalah (0,5 + 0,5 - 0,5 - 0,5) / 4 = 0.
4. **Pembaruan.** w = 0 - 0,5 × (-1) = 0,5, dan b tetap 0.

Probabilitas yang baru adalah 0,182, 0,378, 0,622, dan 0,818, masing-masing sudah berada di sisi 0,5 yang benar. Rata-rata loss turun dari 0,693 menjadi 0,338.

[[figure:log-loss-and-fitting/one-step|Kiri: model sebelum dan sesudah langkah pertama. Kanan: rata-rata log loss saat w bertambah, dengan dua langkah pertama ditandai.]]

Gradient yang negatif berarti menaikkan w menurunkan loss, sehingga w naik. Langkah kedua memakai gradient -0,462 dan menghasilkan w = 0,731 dengan loss 0,249. Gradient-nya mengecil (-1, lalu -0,462), sehingga setiap langkah bergerak lebih sedikit daripada langkah sebelumnya.

::: deeper Ketika loss tidak pernah berhenti turun
Keempat contoh ini dapat dipisahkan dengan sempurna oleh cutoff di x = 0. Dalam keadaan itu, w yang lebih besar selalu mendorong setiap probabilitas lebih dekat ke labelnya dan menurunkan loss, sehingga pada data ini gradient descent dapat terus menaikkan w tanpa henti. Dalam praktik, proses fitting berhenti setelah jumlah langkah tertentu, atau ketika loss tidak lagi membaik secara berarti, sehingga bobotnya tetap terbatas.
:::

## Dari probabilitas ke keputusan
*Apa yang kamu dapatkan dari model yang sudah di-fit, dan apa selanjutnya?*

Inilah rantai yang sudah kita susun. Sigmoid mengubah skor menjadi probabilitas. Log loss menilai probabilitas itu, dengan harga mahal untuk kesalahan yang diberikan dengan yakin. Gradient descent menyesuaikan koefisien sampai rata-rata log loss rendah.

Perhatikan apa yang tidak pernah dipakai dalam proses fitting: cutoff. Model yang sudah di-fit memberikan probabilitas, bukan keputusan. Mengubah probabilitas menjadi "spam" atau "bukan spam" adalah langkah terpisah dengan pilihannya sendiri, yaitu threshold, dan pilihan itu menentukan kesalahan mana yang kamu buat. Itulah pokok bahasan bacaan berikutnya, "Thresholds and decisions". Sesudahnya ada lab yang menutup kursus ini, tempat kamu menggeser threshold sendiri dan melihat contoh mana yang menjadi false positive dan false negative.

Ingat dua hal ketika sampai di sana. Model dengan log loss rendah cenderung memberikan probabilitas yang layak dianggap serius, bila diperiksa pada data yang belum pernah dilihatnya. Dan threshold terbaik bergantung pada biaya tiap jenis kesalahan, bukan pada loss.

::: remember
- Log loss adalah `-ln(p)` untuk probabilitas p yang diberikan model pada kejadian yang sebenarnya terjadi. Nilainya kecil ketika model benar dan yakin, dan bertambah tanpa batas ketika ia salah dan yakin.
- Squared error pada probabilitas berhenti di 1, sehingga hampir tidak membedakan kesalahan yang ragu-ragu dari kesalahan yang yakin. Log loss membedakannya.
- Gradient descent mencari koefisien dengan melangkah berlawanan arah gradient, `(p - y) × x` untuk bobot dan `p - y` untuk intercept.
:::
