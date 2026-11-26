---
slug: lines-and-predictions
title: Garis dan prediksi
---
::: intro
- Membaca garis lurus sebagai sebuah aturan, `y = slope × x + intercept`, dan menjelaskan dengan kata-kata sederhana apa yang dilakukan slope dan intercept.
- Menggunakan garis untuk memprediksi sebuah angka, dan mengenali kapan prediksi tidak boleh dipercaya.
- Menghitung residual (nilai sebenarnya dikurangi prediksi), membaca tandanya, dan menjelaskan mengapa garis yang bagus tetap meleset ke dua arah.

Sebelum mulai: baca dulu "Data, feature, dan label".
:::

## Garis sebagai aturan prediksi
*Bagaimana sebuah garis lurus dapat memprediksi angka?*

Banyak pertanyaan meminta jawaban berupa angka: berapa ongkos perjalanan ini, berapa berat burung ini, berapa lama pekerjaan ini selesai? Memprediksi sebuah angka disebut **regression**. Aturan paling sederhana untuk itu adalah garis lurus.

Sebuah taksi mengenakan biaya dasar 3, lalu 2 untuk setiap kilometer. Tarif sebuah perjalanan adalah `fare = 2 × km + 3`. Untuk perjalanan 5 km, hasilnya 2 × 5 + 3 = 13. Di sini jarak adalah **feature** x, tarif adalah **target** y, dan aturan tersebut mengubah x menjadi prediksi y.

Setiap garis lurus memiliki bentuk yang sama:

`y = slope × x + intercept`

Slope dan intercept adalah dua angka yang menentukan sebuah garis. Model yang memprediksi dengan garis seperti ini disebut **regresi linear**: regresi karena ia memprediksi angka, linear karena aturannya berupa garis.

[[figure:lines-and-predictions/line-anatomy|Aturan taksi sebagai sebuah garis. Garis dimulai dari 3 pada sumbu tarif dan naik 2 untuk setiap kilometer tambahan, sehingga perjalanan 5 km diprediksi berharga 13.]]

## Dua tombol pengatur
*Apa yang dilakukan slope dan intercept masing-masing?*

Bayangkan kedua angka itu sebagai tombol pengatur. Masing-masing mengubah garis dengan caranya sendiri.

**Slope** menyatakan seberapa besar prediksi berubah ketika x bertambah 1. Pada aturan taksi nilainya 2: satu kilometer tambahan menambah tarif sebesar 2. Bacalah sebagai kenaikan per pergeseran horizontal (rise over run). Dari 2 km (tarif 7) ke 3 km (tarif 9), pergeseran horizontalnya 1 dan kenaikannya 2. Slope positif memiringkan garis ke atas, slope negatif memiringkannya ke bawah. Slope 0 menghasilkan garis datar yang memprediksi nilai yang sama untuk setiap x.

**Intercept** adalah prediksi ketika x bernilai 0, yaitu ketinggian tempat garis memotong sumbu vertikal. Pada aturan taksi nilainya 3, yaitu biaya dasar.

| Tombol | Efek jika diputar | Aturan taksi |
|---|---|---|
| Slope | Memiringkan garis; mengubah seberapa cepat prediksi bertambah | 2 per kilometer |
| Intercept | Menggeser seluruh garis ke atas atau ke bawah; kemiringannya tetap | 3, tarif pada 0 km |

Slope memiliki satuan: satuan y per satuan x, di sini tarif per kilometer. Selalu sebutkan satuannya.

::: deeper Menemukan kedua tombol dari dua titik
Dua titik yang berbeda menentukan satu garis. Ambil (2, 7) dan (5, 13). Slope-nya adalah kenaikan dibagi pergeseran horizontal: (13 - 7) / (5 - 2) = 6 / 3 = 2. Untuk mendapatkan intercept, mundur dari x = 2 ke x = 0: 7 - 2 × 2 = 3. Jadi garisnya y = 2x + 3, yaitu aturan taksi tadi.

Data nyata tidak pernah berada tepat pada satu garis, sehingga sebuah model tidak bisa sekadar memilih dua titik. Pelajaran berikutnya menunjukkan cara memilih nilai kedua tombol ketika titik-titiknya tersebar.
:::

## Memprediksi dengan garis pada data nyata
*Bagaimana cara memakai garis pada hasil pengukuran sungguhan?*

Sekarang data nyata. Dataset penguin yang disertakan memiliki 342 penguin dengan kedua pengukuran lengkap. Feature-nya adalah panjang flipper dalam milimeter dan target-nya adalah massa tubuh dalam gram. Panjang flipper berkisar dari 172 sampai 231 mm.

Berikut sebuah garis yang digambar menembus kumpulan titik itu: `mass = 50 × flipper - 5800`. Slope-nya 50 g per mm dan intercept-nya -5.800 g. Untuk memprediksi, masukkan panjang flipper sebagai pengganti x.

| Flipper (mm) | Perhitungan | Massa prediksi (g) |
|---|---|---|
| 180 | 50 × 180 - 5800 | 3.200 |
| 200 | 50 × 200 - 5800 | 4.200 |
| 220 | 50 × 220 - 5800 | 5.200 |

[[figure:lines-and-predictions/penguin-line|342 penguin, panjang flipper terhadap massa tubuh, dengan garis mass = 50 × flipper - 5800. Garis putus-putus menunjukkan prediksi untuk 200 mm: 4.200 g.]]

Slope mudah dibaca: setiap tambahan satu milimeter flipper berarti prediksi massa bertambah 50 g. Intercept tidak demikian. Pada panjang flipper 0, garis memprediksi -5.800 g, yang tidak masuk akal karena tidak ada penguin dengan flipper 0 mm. Di sini intercept hanya berfungsi untuk menambatkan garis.

> Awas: sebuah garis hanya boleh dipercaya di dalam rentang data asalnya. Garis ini memprediksi 1.700 g untuk flipper 150 mm, tetapi tidak ada penguin dalam data yang flipper-nya lebih pendek dari 172 mm, sehingga angka itu hanyalah tebakan jauh di luar apa yang pernah diukur.

## Residual
*Seberapa meleset garis pada satu titik?*

Sebuah garis adalah prediksi, dan prediksi dapat meleset. Selisih pada satu titik disebut **residual**:

`residual = actual - predicted`

Ambil empat penguin nyata dengan garis yang sama.

| Flipper (mm) | Massa sebenarnya (g) | Prediksi (g) | Residual (g) |
|---|---|---|---|
| 181 | 3.750 | 3.250 | +500 |
| 186 | 3.800 | 3.500 | +300 |
| 193 | 3.450 | 3.850 | -400 |
| 195 | 3.250 | 3.950 | -700 |

[[figure:lines-and-predictions/penguin-residuals|Keempat penguin dari tabel. Setiap segmen vertikal adalah sebuah residual: jarak antara massa sebenarnya (titik) dan prediksi garis (cincin).]]

Residual positif berarti titik berada di atas garis, sehingga garis memprediksi terlalu rendah. Residual negatif berarti titik berada di bawah garis, sehingga garis memprediksi terlalu tinggi. Besarnya menyatakan seberapa jauh garis meleset, dalam satuan y: di sini gram.

> Gagasan kunci: residual adalah selisih bertanda. Tandanya menunjukkan ke arah mana garis salah, dan besarnya menunjukkan seberapa jauh.

Jangan menilai sebuah garis dengan menjumlahkan residual-nya. Keempat residual ini berjumlah -300 g, yang tampak kecil, padahal setiap titik berjarak paling sedikit 300 g dari garis. Selisih di atas dan di bawah garis saling meniadakan.

::: deeper Mengapa selisih diukur lurus ke atas dan ke bawah
Garis mengubah x yang sudah diketahui menjadi prediksi y, sehingga pertanyaannya adalah seberapa jauh y yang sebenarnya dari y prediksi pada x yang sama. Itu adalah selisih vertikal. Kita tidak mengukur jarak terpendek ke garis, karena panjang flipper penguin bukanlah hal yang ingin kita prediksi.
:::

## Garis yang bagus dan garis yang buruk
*Bagaimana mengetahui sebuah garis sesuai dengan data tanpa skor?*

Gambarkan semua residual sebuah garis dalam satu plot: panjang flipper pada sumbu horizontal dan residual pada sumbu vertikal. Garis yang sesuai dengan data menyisakan kumpulan titik di sekitar garis nol, dengan selisih di atas dan di bawah.

Ambil garis kita, `mass = 50 × flipper - 5800`. Dari 342 penguin, 140 berada di atasnya dan 191 di bawahnya, dan 11 tepat berada pada garis. Sekarang geser garis itu naik 400 g, menjadi `mass = 50 × flipper - 5400`. Slope-nya tidak berubah, sehingga kemiringannya masih benar, tetapi sekarang garis itu berada di atas sebagian besar titik: 294 penguin berada di bawahnya dan hanya 43 di atasnya.

[[figure:lines-and-predictions/residual-patterns|Residual dari dua garis pada 342 penguin yang sama. Garis A tersebar di sekitar nol. Garis B digeser naik 400 g, sehingga hampir semua residual-nya negatif.]]

> Gagasan kunci: residual yang sebagian besar bertanda sama berarti seluruh garis berada di sisi yang salah dari data. Menggeser garis ke arah titik-titik akan mengecilkan banyak selisih sekaligus.

Itulah gagasan di balik **fitting** sebuah garis: memilih slope dan intercept-nya agar garis sesuai dengan data. Geser garis sedikit demi sedikit sampai selisihnya kecil dan seimbang. Pelajaran berikutnya menjelaskan arti "kecil" secara tepat.

## Kesalahan umum
*Apa yang biasanya keliru dipahami pemula tentang garis?*

- **Membaca slope sebagai total.** Slope 50 g per mm tidak berarti "tambah 50 g secara keseluruhan". Sepuluh milimeter tambahan berarti 10 × 50 = 500 g tambahan pada massa prediksi.
- **Memercayai intercept.** Intercept adalah prediksi pada x = 0, dan x = 0 sering kali jauh di luar data. Massa negatif pada 0 mm bukan kesalahan garis; itu pengingat agar kita tidak membaca titik tersebut.
- **Memprediksi di luar data.** Sebuah garis berlanjut tanpa batas, sedangkan dunia nyata tidak. Tetaplah di dalam rentang yang diukur, atau katakan dengan jelas bahwa kamu sedang menebak.
- **Berharap garis mengenai setiap titik.** Data nyata tersebar. Residual yang tidak nol itu wajar. Yang penting adalah residual itu kecil dan seimbang.
- **Membalik tanda.** Residual adalah actual dikurangi predicted. Predicted dikurangi actual menghasilkan besar yang sama dengan tanda yang berlawanan.

> Awas: sebuah garis menunjukkan bahwa dua hal berjalan bersama, bukan bahwa yang satu menyebabkan yang lain. Flipper yang lebih panjang berjalan bersama penguin yang lebih berat; memanjangkan flipper tidak akan membuat penguin menjadi lebih berat.

## Dari residual ke skor
*Apa yang masih kurang sebelum komputer dapat melakukan fitting sebuah garis?*

Sekarang kamu sudah dapat menggambar garis, memprediksi dengannya, dan mengukur selisih pada setiap titik. Satu bagian masih kurang. Untuk membandingkan dua garis, atau memilih yang terbaik, kita memerlukan satu angka untuk seluruh garis, dan menjumlahkan residual bertanda tidak dapat dipakai.

Pelajaran berikutnya, "Loss function", membangun angka itu dengan dua cara, mean squared error dan mean absolute error, lalu menunjukkan bagaimana model menemukan nilai kedua tombol yang membuatnya sekecil mungkin.

Sesudah itu datang lab "Cari garis yang pas, lihat loss-nya". Kamu akan mendapat titik-titik yang mengandung noise dan menarik sebuah garis melaluinya, lalu melihat bagaimana residual setiap titik masuk ke dalam loss. Sebelum membukanya, tentukan dulu dugaanmu: jika kamu memiringkan garis, residual titik mana yang membesar dan mana yang mengecil?

::: remember
- Sebuah garis memprediksi dengan `y = slope × x + intercept`: slope adalah perubahan prediksi per satuan x, dan intercept adalah prediksi pada x = 0.
- Pakai garis hanya di dalam rentang data asalnya, dan baca slope beserta satuannya.
- Residual adalah actual dikurangi predicted; garis yang bagus menyisakan selisih di kedua sisi, dan selisih bertanda tidak dapat sekadar dijumlahkan untuk menilainya.
:::
