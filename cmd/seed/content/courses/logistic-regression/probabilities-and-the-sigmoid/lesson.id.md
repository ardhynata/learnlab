---
slug: probabilities-and-the-sigmoid
title: Probabilitas dan sigmoid
---
::: intro
- Jelaskan mengapa garis lurus kurang cocok untuk memprediksi jawaban ya atau tidak.
- Ubah sebuah skor menjadi probabilitas dengan fungsi sigmoid, lalu hitung sendiri dengan tangan.
- Pahami odds dan log-odds, serta apa itu decision boundary.

Sebelum mulai: baca "Lines and predictions".
:::

## Pertanyaan ya atau tidak
*Mengapa garis lurus kesulitan menangani jawaban ya atau tidak?*

Di "Lines and predictions", sebuah garis memprediksi angka, misalnya tarif. Banyak pertanyaan berbeda sifatnya: apakah siswa ini lulus ujian, apakah email ini spam? Jawabannya salah satu dari dua **kelas**, dan memprediksi kelas disebut **classification**.

Tuliskan kelas sebagai angka: 1 untuk lulus dan 0 untuk gagal. Setelah itu kamu bisa mencoba mencocokkan garis ke angka 0 dan 1 tersebut. Gambar di bawah menunjukkan dua belas siswa beserta jam belajarnya. Garis naik seiring bertambahnya jam, dan arah itu memang benar, tetapi tidak ada yang menahannya. Di sisi kiri ia turun di bawah 0, di sisi kanan ia naik di atas 1, dan "prediksi 1,29" tidak bermakna untuk pertanyaan ya atau tidak.

Yang kita butuhkan adalah angka yang selalu berada di antara 0 dan 1, sehingga dapat dibaca sebagai **probabilitas**: peluang terjadinya kelas 1. Model di kursus ini, **regresi logistik**, mencapainya dalam dua langkah: pertama skor linear, lalu kurva yang menekan skor itu ke dalam rentang tersebut.

[[figure:probabilities-and-the-sigmoid/line-vs-sigmoid|Dua belas siswa yang sama. Garis lurus keluar dari rentang 0 sampai 1, sedangkan kurva berbentuk S tidak pernah keluar.]]

## Fungsi sigmoid
*Bagaimana cara menekan sembarang angka ke rentang 0 sampai 1?*

Fungsi **sigmoid** menerima angka z apa pun, besar atau kecil, positif atau negatif, dan mengembalikan angka di antara 0 dan 1:

`sigmoid(z) = 1 / (1 + e^(-z))`

Di sini e kira-kira 2,718. Kamu tidak perlu menghafal rumusnya, cukup pahami perilakunya.

| z | -4 | -2 | -1 | 0 | 1 | 2 | 4 |
|---|---|---|---|---|---|---|---|
| sigmoid(z) | 0,02 | 0,12 | 0,27 | 0,50 | 0,73 | 0,88 | 0,98 |

Pada z = 0, sigmoid tepat bernilai 0,5. Jika z positif hasilnya lebih dari 0,5, dan jika z negatif hasilnya kurang dari 0,5. Kurva paling curam di bagian tengah dan melandai di kedua ujung: ia makin mendekati 1 atau 0, tetapi tidak pernah mencapainya. Kurva ini juga simetris, sehingga sigmoid(-2) = 0,12 dan sigmoid(2) = 0,88 jumlahnya tepat 1.

[[figure:probabilities-and-the-sigmoid/sigmoid-curve|Kurva sigmoid. Skor 0 dipetakan ke 0,5, sedangkan kedua ujungnya melandai menuju 0 dan 1.]]

> Gagasan kunci: sigmoid hanyalah penekan. Ia tidak memutuskan apa pun. Tugasnya mengubah skor apa saja menjadi angka yang dapat dibaca sebagai probabilitas.

## Skor, lalu probabilitas
*Bagaimana model berpindah dari jam belajar ke probabilitas?*

Regresi logistik menghitung **skor** z dengan cara yang sama seperti regresi linear menghitung prediksinya, yaitu jumlah berbobot dari feature ditambah intercept. Setelah itu skor dilewatkan ke sigmoid:

1. `z = weight × x + intercept`
2. `p = sigmoid(z)`

Misalkan model untuk ujian ini memiliki weight 1,2 dan intercept -3,6, sehingga `z = 1.2 × hours - 3.6` (setara dengan z = 1,2 × jam - 3,6 di soal). (Pada model yang sudah dilatih, angka-angka ini dicari dari data; di sini kita pilih saja.) Untuk siswa yang belajar 4 jam:

- Skornya z = 1,2 × 4 - 3,6 = 1,2.
- Lalu e^-1,2 kira-kira 0,301, sehingga p = 1 / (1 + 0,301) = 0,77.

Untuk 1 jam, skornya -2,4 dan p = 0,08. Untuk 3 jam, skornya 0 dan p = 0,50. Untuk 5 jam, skornya 2,4 dan p = 0,92.

[[figure:probabilities-and-the-sigmoid/score-to-probability|Dua langkah itu untuk empat siswa. Tiap jam menambah skor sebesar 1,2, tetapi probabilitas bergerak paling cepat di sekitar 3 jam.]]

Perhatikan bahwa kenaikan satu jam selalu menambah skor sebesar 1,2, tetapi tambahannya pada probabilitas sangat berbeda: dari 3 ke 4 jam bertambah 0,27, sedangkan dari 4 ke 5 jam hanya 0,15.

## Membaca probabilitas
*Sebenarnya apa yang dikatakan probabilitas 0,77?*

Model menyatakan p = 0,77 untuk siswa yang belajar 4 jam. Baca angka itu sebagai perkiraan seberapa sering siswa seperti itu lulus: jika model terkalibrasi dengan baik dan kamu bertemu 100 siswa seperti ini, kamu dapat mengharapkan sekitar 77 lulus dan sekitar 23 gagal. Angka itu bukan janji untuk satu siswa tertentu, dan bukan sebuah kelas.

Karena itu, ketika siswa dengan p = 0,77 ternyata gagal, model belum tentu salah. Peluang 23 dari 100 sering sekali terjadi. Model yang tidak pernah memberi ruang untuk itu, dan menyebut p = 1 untuk semua yang disukainya, berarti terlalu percaya diri.

> Awas: probabilitas bukanlah keputusan. Model hanya mengeluarkan 0,77, sebuah angka. Untuk mengubahnya menjadi "lulus" atau "gagal" diperlukan aturan tersendiri, dan kamulah yang memilih aturan itu. Pelajaran "Thresholds and decisions" membahasnya.

Probabilitas juga lebih berguna daripada kelas mentah. Siswa dengan p = 0,51 dan siswa dengan p = 0,97 mungkin sama-sama diberi label "lulus", tetapi keduanya menuntut tindakan yang berbeda: yang pertama nyaris sama dengan lemparan koin, yang kedua hampir pasti.

## Odds
*Apa itu odds, dan apa bedanya dengan probabilitas?*

Orang sering membicarakan **odds** alih-alih probabilitas. Odds sebuah kelas adalah peluang kelas itu terjadi dibagi peluang kelas itu tidak terjadi:

`odds = p / (1 - p)`

Jika p = 0,8, odds-nya 0,8 / 0,2 = 4: empat yang lulus untuk setiap satu yang gagal, "4 banding 1". Jika p = 0,5, odds-nya 1, artinya peluang lulus dan gagal sama besar.

## Log-odds
*Apa hubungan antara skor dan probabilitas?*

**Log-odds** adalah logaritma natural dari odds. Ada hubungan yang rapi dengan pelajaran ini: **skor z adalah log-odds.** Dengan kata lain, odds sama dengan e^z. Periksa dengan model ujian tadi:

| Jam | Skor z | p | Odds |
|---|---|---|---|
| 3 | 0 | 0,50 | 1 |
| 4 | 1,2 | 0,77 | 3,32 |
| 5 | 2,4 | 0,92 | 11,02 |

Setiap tambahan satu jam menambah 1,2 pada log-odds, artinya odds dikalikan e^1,2, sekitar 3,32: 1 menjadi 3,32, dan 3,32 menjadi 11,02. Log-odds berubah secara linear terhadap jam (+1,2 per jam), sedangkan probabilitasnya melengkung. Itulah sebabnya regresi logistik disebut model linear.

::: deeper Asal-usul sigmoid
Mulailah dari pernyataan bahwa skor adalah log-odds: `z = ln(p / (1 - p))`. Pangkatkan e pada kedua sisi sehingga `p / (1 - p) = e^z`. Kalikan keluar: `p = e^z × (1 - p)`, jadi `p + p × e^z = e^z`, dan `p = e^z / (1 + e^z)`. Bagi pembilang dan penyebut dengan e^z, maka kamu mendapatkan `p = 1 / (1 + e^(-z))`, yaitu sigmoid. Jadi sigmoid bukan pilihan sembarangan: ia adalah hasil yang pasti kita peroleh ketika skor linear dibaca sebagai log-odds.
:::

## Decision boundary
*Di mana model berpindah dari satu kelas ke kelas lain?*

**Decision boundary** adalah perbatasan antara daerah tempat model condong ke satu kelas dan daerah tempat model condong ke kelas lainnya. Kamu sudah bertemu dengannya pada k-NN di "k-NN lab". Pada regresi logistik, batas itu ada di tempat p = 0,5, dan itu tepat di tempat skornya 0.

Dengan satu feature, boundary berupa satu titik: untuk `z = 1.2 × hours - 3.6`, skornya 0 pada 3 jam. Tambahkan feature kedua, yaitu jumlah latihan soal, dengan skor `z = hours + 0.8 × tests - 5`. Sekarang boundary adalah semua titik yang memenuhi `hours + 0.8 × tests = 5`, yaitu sebuah garis lurus.

> Contoh hitungan: siswa dengan 2 jam dan 3 latihan soal memiliki z = 2 + 2,4 - 5 = -0,6, sehingga p = 0,35, berada di bawah garis. Siswa dengan 4 jam dan 2 latihan soal memiliki z = 4 + 1,6 - 5 = 0,6, sehingga p = 0,65, berada di atas garis.

[[figure:probabilities-and-the-sigmoid/decision-boundary|Dua feature, satu boundary lurus. Probabilitas berubah mulus saat melintasinya: 0,9 dan 0,1 terletak pada garis-garis sejajar dengan jarak yang sama dari tengah.]]

Boundary itu lurus karena skornya berupa rumus garis lurus terhadap feature. Di tempat p bernilai 0,9, skornya sekitar 2,2, dan di tempat p bernilai 0,1, skornya sekitar -2,2: probabilitas tidak melompat di boundary, melainkan bergeser perlahan.

## Selanjutnya
*Apa yang masih kurang, dan di mana kamu mencobanya?*

Masih ada dua pertanyaan yang terbuka. Pertama, dari mana weight dan intercept berasal? Model memerlukan cara untuk menilai probabilitasnya terhadap label yang sebenarnya, dengan menghukum keras jawaban salah yang diberikan dengan penuh keyakinan. Nilai itu adalah **log loss**, topik dari "Log loss and fitting".

Kedua, apa yang dilakukan dengan sebuah probabilitas? Untuk menetapkan sebuah kelas, kita memerlukan ambang keputusan, yaitu **threshold**. Nilai 0,5 adalah default yang lazim, tetapi tidak ada yang mewajibkannya, dan threshold yang berbeda menghasilkan jenis kesalahan yang berbeda. "Thresholds and decisions" memperlihatkan trade-off tersebut.

Lab di akhir kursus ini memungkinkan kamu menggeser threshold sendiri dan melihat contoh mana yang menjadi false positive (salah diprediksi lulus) atau false negative (salah diprediksi gagal). Sebelum membukanya, pikirkan apa yang terjadi pada jumlah prediksi lulus yang salah jika threshold dinaikkan dari 0,5 ke 0,9.

::: remember
- Garis lurus dapat keluar dari rentang 0 sampai 1, karena itu regresi logistik melewatkan skor linear ke sigmoid untuk mendapatkan probabilitas.
- Skor adalah log-odds: sigmoid(0) = 0,5, dan setiap kenaikan 1 pada skor mengalikan odds dengan e, sekitar 2,72.
- Decision boundary ada di tempat skor bernilai 0, yaitu p = 0,5. Probabilitas belum merupakan keputusan.
:::
