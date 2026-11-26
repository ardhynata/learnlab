---
slug: nested-cross-validation
title: Nested cross-validation
---
::: intro
- Jelaskan mengapa skor terbaik sebuah search, yang diukur pada fold yang sama dengan yang memilihnya, terlalu tinggi, dan seberapa tinggi pada 200 pool penguin hasil simulasi.
- Jalankan nested cross-validation dengan tangan: inner loop memilih k, dan outer loop menilai pilihan itu pada penguin yang tidak ikut menentukannya.
- Bandingkan dua model pada fold yang sama, beri bootstrap interval pada selisihnya, dan sebutkan kapan satu test set yang disisihkan sudah cukup.

Sebelum mulai: baca "Tuning dengan search" dan "Cross-validation dan stratifikasi" di course Validasi dan tuning hyperparameter, serta "Variabilitas sampling dan bootstrap" di course Probabilitas dan ketidakpastian statistik. Ketiganya memberimu search, fold, dan bootstrap. Pelajaran ini menyatukan ketiganya.
:::

## Skor yang dipakai untuk tuning
*Seberapa tinggi skor terbaik sebuah search dibandingkan kenyataannya?*

"Tuning dengan search" memperingatkan bahwa sebuah search menyimpan skor tertinggi, sehingga cenderung menyimpan yang paling beruntung. Berikut seberapa besar efek itu.

Ambil 333 penguin yang punya keempat pengukuran dan jenis kelamin yang tercatat, lalu undi 100 di antaranya secara acak sebagai sebuah **pool**. Modelnya k-NN pada empat pengukuran yang sudah diskalakan, dan tugasnya menebak jenis kelamin. Sebuah search mencoba beberapa nilai k, menilai tiap nilai dengan cross-validation 5 fold pada pool, lalu melaporkan yang terbaik. Ulangi pada 200 pool, dan nilai juga tiap pemenangnya secara jujur: latih ulang pada pool, lalu uji pada 233 penguin yang tidak terambil.

[[figure:nested-cross-validation/optimism|Skor rata-rata pada 200 pool ketika search mencoba makin banyak nilai k. Skor cross-validation terbaik terus naik, sedangkan accuracy sebenarnya tetap datar.]]

Dengan satu nilai k tidak ada yang perlu dipilih, sehingga laporannya jujur: 89,1% dilaporkan, 89,2% sebenarnya. Dengan 30 nilai (k = 1 sampai 30), skor terbaik rata-rata 91,3%, tetapi pemenangnya hanya benar pada 88,7% penguin yang belum pernah dilihat. Sekitar 2,5 poin hanyalah keberuntungan.

> Gagasan kunci: semakin banyak pengaturan yang dicoba sebuah search, semakin terlalu optimistis skor terbaiknya, karena fold yang sama memilih sekaligus menilai pemenangnya.

## Dua loop
*Bagaimana nesting memisahkan yang memilih dari yang menilai?*

**Nested cross-validation** menaruh satu cross-validation di dalam cross-validation lain. **Outer loop** memotong pool menjadi beberapa fold dan menyisihkan satu fold sebagai fold uji outer. Pada baris-baris sisanya, **inner loop** menjalankan seluruh search dari awal dengan cross-validation-nya sendiri dan memilih sebuah pengaturan. Pengaturan itu dilatih ulang pada semua baris training outer, lalu dinilai satu kali pada fold uji outer, yang tidak pernah dilihat search. Lakukan ini untuk setiap fold outer, lalu jumlahkan skornya.

[[figure:nested-cross-validation/nested-layout|Satu putaran outer pada nested cross-validation dengan 100 penguin. Inner loop hanya bekerja pada 80 penguin training, dan fold 1 dinilai satu kali, di akhir.]]

Hasilnya adalah skor sebuah **resep** (*recipe*): "latih k-NN dan biarkan search 4 fold memilih k". Itu bukan skor satu nilai k tertentu. Putaran outer yang berbeda boleh memilih nilai yang berbeda, dan itu tidak masalah, karena resep itulah yang kamu laporkan.

> Gagasan kunci: inner loop memilih dan outer loop menilai. Penguin yang dinilai di sebuah putaran outer tidak ikut dalam pilihan yang dinilai itu.

## Tabel fold dengan tangan
*Dapatkah kamu menjalankan kedua loop dengan pensil?*

Pakai satu pool berisi 100 penguin, 54 jantan dan 46 betina, dan biarkan search memilih k dari 1, 5, dan 15. Outer loop punya 5 fold berisi 20 penguin. Di setiap putaran outer, 80 penguin training dipotong lagi menjadi 4 inner fold berisi 20. Skor inner menghitung jawaban benar dari 80, karena tiap penguin dari 80 itu divalidasi satu kali. Jika seri, k yang lebih kecil menang.

| Putaran outer | Inner k = 1 | Inner k = 5 | Inner k = 15 | Pilihan | Fold outer benar |
| --- | --- | --- | --- | --- | --- |
| 1 | 71 | 67 | 63 | k = 1 | 19 dari 20 |
| 2 | 71 | 73 | 69 | k = 5 | 17 dari 20 |
| 3 | 74 | 76 | 69 | k = 5 | 17 dari 20 |
| 4 | 68 | 72 | 69 | k = 5 | 18 dari 20 |
| 5 | 68 | 71 | 60 | k = 5 | 18 dari 20 |

> Contoh hitungan: pada putaran 1, inner loop menilai k = 1, 5, dan 15 dengan skor 71, 67, dan 63, sehingga k = 1 menang dan dilatih ulang pada 80 penguin training. Lalu ia dinilai pada fold 1, yang belum pernah dilihatnya: 19 dari 20. Kelima skor outer berjumlah 19 + 17 + 17 + 18 + 18 = 89, sehingga skor nested adalah 89 dari 100, atau 89%.

## Nested lawan search biasa
*Seberapa jauh kedua angka itu berbeda?*

Sekarang jalankan search biasa pada kelima fold outer yang sama, ketika setiap fold memilih sekaligus menilai. Totalnya untuk k = 1, 5, dan 15 adalah 92, 89, dan 92 dari 100. Yang terbaik 92, dan jika seri k = 1 menang. Search biasa melaporkan 92%, skor nested 89%, dan selisihnya 3 poin.

Itu baru satu pool. Pada 200 pool, skor terbaik search biasa berada di atas skor nested rata-rata 2,0 poin dengan tiga nilai k, dan 2,7 poin dengan 30 nilai. Angka ini bukan 2,5 dari bagian pertama, yang membandingkan skor terbaik dengan accuracy sebenarnya; di sini pembandingnya skor nested, yang sedikit lebih rendah daripada kenyataan. Skor nested tetap dekat dengan kenyataan: 88,5% berbanding 88,7% pada 30 nilai.

> Awas: inner loop memilih k = 5 di empat dari lima putaran, sedangkan search biasa condong ke k = 1. Skor nested bukan milik salah satunya, melainkan milik seluruh resep, termasuk search-nya.

## Membandingkan dua model secara adil
*Mengapa membandingkan fold demi fold, bukan dua rata-rata?*

Tambahkan resep kedua: sebuah decision tree yang kedalaman maksimumnya, dari 1 sampai 4, dipilih dengan cara yang sama, di dalam kelima fold outer yang sama. Kini setiap fold outer memberi satu skor per resep, pada 20 penguin yang sama.

| Fold outer | k-NN benar | Tree benar | Selisih |
| --- | --- | --- | --- |
| 1 | 19 | 18 | +1 |
| 2 | 17 | 15 | +2 |
| 3 | 17 | 15 | +2 |
| 4 | 18 | 16 | +2 |
| 5 | 18 | 17 | +1 |
| Total | 89 | 81 | +8 |

Dalam persen, k-NN mendapat 95, 85, 85, 90, dan 90: rata-rata 89, simpangan 4,2 poin. Tree mendapat 90, 75, 75, 80, dan 85: rata-rata 81, simpangan 6,5. Rentangnya tumpang tindih, sehingga dua rata-rata beserta simpangannya tampak belum jelas.

Pasangkan skornya. k-NN unggul di setiap fold, dengan selisih 5, 10, 10, 10, dan 5 poin: rata-rata 8, simpangan 2,7. Fold berisi penguin yang sulit akan sulit bagi kedua resep, sehingga pengurangan di dalam fold meniadakannya.

[[figure:nested-cross-validation/paired-folds|Kedua resep di setiap fold outer berisi 20 penguin, beserta selisihnya. Belah ketupat adalah tree dan lingkaran adalah k-NN.]]

> Awas: kelima selisih itu bukan lima uji yang independen. Dua bagian training outer mana pun berbagi 60 dari 80 penguinnya, sehingga jangan mengubah lima angka itu menjadi interval dengan sebuah rumus.

## Bootstrap interval untuk selisih
*Seberapa besar selisih yang sebenarnya mungkin?*

Nesting memprediksi setiap penguin satu kali, dengan pengaturan yang dipilih tanpa dirinya, sehingga tiap dari 100 penguin punya satu hasil per resep. Tabel berisi empat hitungan mengurutkannya.

| | Tree benar | Tree salah |
| --- | --- | --- |
| k-NN benar | 79 | 10 |
| k-NN salah | 2 | 9 |

Sebanyak 88 penguin yang hasilnya sama di kedua resep, 79 + 9, sama sekali tidak membedakan keduanya. Beri skor pada sisanya: +1 untuk 10 penguin yang hanya dijawab benar oleh k-NN, -1 untuk 2 penguin yang hanya dijawab benar oleh tree, dan 0 untuk 88 penguin sisanya. Rata-ratanya (10 - 2) / 100 = 0,08, atau 8 poin.

Sekarang lakukan bootstrap pada ke-100 angka itu seperti di "Variabilitas sampling dan bootstrap": tarik 100 angka dengan pengembalian, hitung rata-ratanya, ulangi 2.000 kali, lalu baca persentil ke-2,5 dan ke-97,5. Intervalnya +1 sampai +15 poin.

[[figure:nested-cross-validation/bootstrap-difference|Distribusi bootstrap untuk rata-rata selisih antara k-NN dan tree. Nol berada di luar 95% bagian tengahnya.]]

Nol berada di luar, sehingga pool ini berpihak pada k-NN, meskipun selisih +1 pun masih masuk akal. Pool ini juga tergolong baik hati. Pada 200 pool, k-NN mendapat skor lebih tinggi di 164, tree di 29, dan 7 seri. Intervalnya seluruhnya di atas nol pada 56 pool, seluruhnya di bawah nol pada 1, dan memuat nol pada 143.

> Awas: interval ini mengambil sampel ulang dari hasil satu pool. Ia tidak melatih ulang kedua resep pada penguin baru, sehingga ketidakpastian sebenarnya lebih lebar.

## Biaya nesting
*Kapan satu test set yang disisihkan sudah cukup?*

Hitung jumlah fit-nya. Dengan 5 fold outer, 4 fold inner, dan G pengaturan, tiap putaran outer melatih 4 x G model di inner loop-nya ditambah satu refit, sehingga nesting menghabiskan 5 x (4 x G + 1) fit. Untuk G = 3 itu 65 fit, dibandingkan 5 x 3 = 15 untuk search biasa. Untuk G = 30 menjadi 605 berbanding 150. Satu fit k-NN secepat kedipan mata. Jika sebuah model butuh satu jam untuk dilatih, 605 fit berarti sekitar 25 hari.

Alternatifnya adalah test set terkunci: lakukan tuning pada sisanya, lalu nilai test set itu satu kali. Fluktuasinya adalah standard error sebuah accuracy, seperti di "Variabilitas sampling dan bootstrap".

| Baris test | Standard error di sekitar 89% |
| --- | --- |
| 100 | 3,1 poin |
| 400 | 1,6 poin |
| 1.600 | 0,8 poin |
| 10.000 | 0,3 poin |

> Gagasan kunci: nesting adalah alat untuk data kecil dan fit yang murah. Dengan ribuan baris test dan fit yang lambat, lakukan tuning pada validation split dan pakai test set terkunci satu kali.

## Sebelum lab
*Apa yang masih belum dikatakan oleh skor yang bersih?*

Nested cross-validation menghilangkan sifat terlalu optimistis akibat tuning. Ia tidak mengubah asal baris-barisnya. Jika satu orang memiliki banyak baris, atau waktu berperan, buat fold berkelompok atau temporal di kedua loop, seperti di "Split berkelompok dan split temporal".

Setiap fold juga dipotong dari pool yang sama, sehingga skor nested menjawab "bagaimana kinerja resep ini pada lebih banyak data seperti penguin-penguin ini?" Ia tidak dapat mengatakan bagaimana resep itu pada penguin dari pulau lain atau dekade lain. Itulah shift. Pelajaran berikutnya, "Covariate shift dan concept shift", menamai cara-cara data dapat bergeser. Course ini ditutup dengan Lab shift, tempat kamu memasukkan satu jenis shift pada satu waktu dan mengukur setup validasi mana yang mengantisipasi penurunannya.

Sebelum membukanya, tebaklah: ketika data bergeser, apakah skor nested akan memperingatkanmu?

::: deeper Mengapa skor nested sedikit rendah
Sebuah inner loop dilatih pada 60 penguin, sebuah putaran outer pada 80, dan model yang kamu simpan pada 100. Model dengan baris lebih sedikit sedikit lebih lemah, sehingga skor nested terbaca sedikit rendah. Sikap sedikit pesimistis adalah kesalahan yang lebih aman.
:::

::: deeper Memeriksa interval dengan tangan
Kuadrat selisihnya adalah 1 untuk 12 penguin yang hasilnya berbeda dan 0 untuk sisanya, sehingga rata-ratanya 12 / 100 = 0,12. Variansnya 0,12 - 0,08 x 0,08 = 0,1136, dan standard error-nya adalah akar dari 0,1136 / 100, yaitu 3,4 poin. Maka 8 ditambah atau dikurangi 1,96 x 3,4 memberi sekitar 1,4 sampai 14,6, dekat dengan +1 sampai +15 dari bootstrap.
:::

::: deeper Seed fold menggeser skor
Pada pool yang sama, enam pemotongan outer lain (seed fold 1 sampai 6) memberi skor nested 91, 89, 90, 91, 86, dan 87 dari 100, dibandingkan 89 untuk pemotongan di atas. Skor terbaik search biasa lebih tinggi daripada skor nested pada lima dari enam pemotongan dan sama pada satu. Seperti seed di "Tuning dengan search", pemotongan itu harus ikut dicatat dalam catatan run.
:::

::: remember
- Skor terbaik sebuah search terlalu optimistis jika fold yang sama memilih sekaligus menilai. Semakin banyak pengaturan yang dicoba, semakin besar sifat optimistis itu.
- Nested cross-validation membiarkan inner loop memilih dan outer loop menilai, sehingga skornya milik seluruh resep.
- Bandingkan resep pada fold yang sama, bootstrap selisih per penguin, dan simpan test set terkunci ketika data melimpah dan fit lambat.
:::
