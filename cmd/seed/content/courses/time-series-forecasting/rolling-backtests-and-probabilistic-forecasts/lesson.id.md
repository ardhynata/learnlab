---
slug: rolling-backtests-and-probabilistic-forecasts
title: Rolling backtest dan probabilistic forecast
---
::: intro
- Jalankan rolling-origin backtest dengan expanding window atau sliding window, lalu nilai dua model dengan tangan pada tiga forecast window.
- Jelaskan mengapa satu split dapat memilih model yang salah, dan bandingkan model window demi window, bukan dari satu angka.
- Bangun prediction interval dari galat backtest, periksa coverage-nya pada setiap horizon, dan tentukan kapan regime change menuntut model dilatih ulang.

Sebelum mulai: baca "Lags, seasonality and horizons" dan "Grouped and temporal splits". Yang pertama memberimu data penjualan toko, forecast seasonal naive, dan MAE. Yang kedua memberimu origin dan rolling origin pada tabel pendek. Pelajaran ini mengulang pengujian pada banyak origin dan mengganti satu angka dengan sebuah rentang.
:::

## Rolling origin
*Bagaimana backtest mengulang pengujian pada banyak titik waktu?*

Satu temporal split menguji forecaster pada satu titik waktu, padahal model akan meramal pada banyak titik. Tahun ujinya bisa mudah, sulit, atau berada di salah satu sisi sebuah perubahan. **Backtest** memutar ulang masa lalu seolah-olah itu masa depan: pilih sebuah origin, latih model pada data sampai origin itu, ramal 4 kuartal berikutnya (horizon), bandingkan dengan kenyataan, lalu geser origin ke depan. Setiap origin beserta empat kuartal sesudahnya disebut satu **window**.

"Grouped and temporal splits" menjalankan ini dengan forecast satu langkah. Di sini setiap window meramal satu tahun penuh. Dua aturan menentukan bagian latihnya. Pada **expanding window**, bagian latih dimulai dari kuartal 1 dan bertambah satu tahun di setiap origin. Pada **sliding window**, panjangnya tetap, di sini 8 kuartal terbaru, sehingga awalnya ikut bergeser.

Expanding memakai semua data dan memberi estimasi yang lebih stabil. Sliding melupakan data lama, yang membantu bila polanya bergeser, tetapi setiap pelatihan melihat lebih sedikit baris. Keduanya tidak membocorkan masa depan: kuartal uji selalu datang setelah kuartal latih.

[[figure:rolling-backtests-and-probabilistic-forecasts/windows|Tiga origin pada 20 kuartal dengan horizon 4. Expanding window menyimpan seluruh masa lalu, sliding window menyimpan 8 kuartal terbaru, dan kuartal uji berwarna padat.]]

## Tiga window dengan tangan
*Berapa skor dua model pada tiga origin?*

Datanya adalah deret toko dari pelajaran sebelumnya, kini sepanjang enam tahun. Tahun 1 sampai 3 sama dengan tabel di sana. Tahun 4 sampai 6 baru dan dikarang, dan pertumbuhan melambat pada tahun 5.

| Tahun | Q1 | Q2 | Q3 | Q4 | Total |
| --- | --- | --- | --- | --- | --- |
| 1 | 86 | 126 | 102 | 117 | 431 |
| 2 | 98 | 139 | 113 | 129 | 479 |
| 3 | 109 | 150 | 125 | 143 | 527 |
| 4 | 120 | 163 | 136 | 156 | 575 |
| 5 | 124 | 167 | 139 | 161 | 591 |
| 6 | 128 | 172 | 142 | 165 | 607 |

Dua model meramal sebuah kuartal. **Seasonal naive** menyalin kuartal yang sama setahun sebelumnya. **Lag 4 + offset** menambahkan pada salinan itu rata-rata perubahan year-over-year pada tahun-tahun latih. Dengan tangan, offset adalah selisih total tahunan dari tahun latih pertama ke terakhir, dibagi jumlah selang tahun dan dibagi 4.

> Contoh hitungan: window 1 dilatih pada tahun 1 dan 2. Offset-nya (479 - 431) / 1 / 4 = 12, sehingga forecast tahun 3 adalah tahun 2 ditambah 12: 110, 151, 125, 141. Nilai sebenarnya 109, 150, 125, 143, jadi galatnya (actual dikurangi forecast) -1, -1, 0, +2 dan MAE-nya (1 + 1 + 0 + 2) / 4 = 1. Seasonal naive menyalin 98, 139, 113, 129: galat 11, 11, 12, 14 dan MAE 12.

## Mengapa satu window menyesatkan
*Dapatkah dua model yang sama bertukar posisi tergantung tempat memotong?*

Window 2 dan 3 mengikuti resep yang sama, dengan tahun 4 dan tahun 5 sebagai data uji.

| Window | Latih | Uji | Galat seasonal naive | Galat lag 4 + offset | MAE naive | MAE offset |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | tahun 1 sampai 2 | tahun 3 | 11, 11, 12, 14 | -1, -1, 0, +2 | 12 | 1 |
| 2 | tahun 1 sampai 3 | tahun 4 | 11, 13, 11, 13 | -1, +1, -1, +1 | 12 | 1 |
| 3 | tahun 1 sampai 4 | tahun 5 | 4, 4, 3, 5 | -8, -8, -9, -7 | 4 | 8 |

> Contoh hitungan: window 3 memiliki total 431 dan 575, sehingga offset-nya (575 - 431) / 3 / 4 = 12 lagi. Forecast tahun 5 adalah tahun 4 ditambah 12: 132, 175, 148, 168. Nilai sebenarnya 124, 167, 139, 161, jadi galatnya -8, -8, -9, -7 dan MAE-nya 8.

Bila dipotong setelah tahun 2 atau tahun 3, lag 4 + offset tampak 12 kali lebih baik. Bila dipotong setelah tahun 4, seasonal naive tampak 2 kali lebih baik. Modelnya sama, deretnya sama, tetapi kesimpulannya berbalik mengikuti tempat potongan.

[[figure:rolling-backtests-and-probabilistic-forecasts/three-windows|MAE kedua model di setiap window dan rata-ratanya. Lag 4 + offset menang jauh di window 1 dan 2 dan kalah di window 3.]]

## Membandingkan model antar-window
*Bagaimana membaca tiga window tanpa tertipu?*

Rata-rata MAE adalah 9,33 untuk seasonal naive dan 3,33 untuk lag 4 + offset, jadi model offset kira-kira 2,8 kali lebih baik rata-rata. Angka itu sendiri menyembunyikan perbalikan di window terbaru. Laporkan lebih banyak.

- **Setiap window.** MAE per window memperlihatkan bahwa window 3 berperilaku lain.
- **Kemenangan.** Lag 4 + offset menang di 2 dari 3 window.
- **Selisih berpasangan.** Naive dikurangi offset adalah 11, 11, dan -4, dengan rata-rata 6. Membandingkan model di dalam window yang sama menghilangkan pengaruh sulitnya window itu.
- **Window terbaru.** Ia yang paling dekat dengan masa depan. Model yang menang rata-rata tetapi kalah di window terbaru adalah tanda peringatan.

Tiga window itu tipis. Pakai origin sebanyak yang diizinkan data, dan geser origin 1 kuartal, bukan 4, bila kamu butuh lebih banyak window.

> Awas: setiap model harus dinilai pada origin dan horizon yang sama, dan setiap pengaturan yang kamu tuning (lag, panjang window) harus dipilih hanya di dalam bagian latih masing-masing. Men-tuning pada window uji adalah kebocoran yang dijelaskan "Nested cross-validation".

## Dari satu angka ke sebuah rentang
*Bagaimana galat backtest menjadi prediction interval?*

Forecast 134 unit hanyalah satu tebakan. **Prediction interval** adalah rentang yang dimaksudkan memuat nilai sebenarnya dengan probabilitas tertentu, misalnya 80%. **Coverage** adalah bagian nilai sebenarnya yang benar-benar jatuh di dalamnya. Bahan bakunya sudah ada di backtest: galat yang dibuat model pada kuartal yang belum pernah dilihatnya.

Urutkan 12 galat lag 4 + offset: -9, -8, -8, -7, -1, -1, -1, -1, 0, 1, 1, 2. Dengan hanya 12 galat, seluruh rentang adalah satu-satunya pilihan aman untuk 80%, sehingga intervalnya adalah forecast ditambah -9 sampai ditambah 2.

## Membaca interval
*Apa yang dikatakan interval itu tentang tahun 6?*

> Contoh hitungan: model dilatih ulang di origin 20 pada tahun 1 sampai 5. Offset-nya (591 - 431) / 4 / 4 = 10, sehingga tahun 6 diramal sebagai tahun 5 ditambah 10: 134, 177, 149, 171. Intervalnya 125 sampai 136, 168 sampai 179, 140 sampai 151, dan 162 sampai 173. Nilai sebenarnya, 128, 172, 142, dan 165, semuanya jatuh di dalam.

[[figure:rolling-backtests-and-probabilistic-forecasts/intervals|Ke-12 galat backtest, diwarnai per window, dan interval yang dihasilkannya untuk tahun 6. Nilai sebenarnya (titik) berada di bagian bawah setiap interval.]]

Interval condong ke bawah karena window 3 meramal terlalu tinggi, dan lebar, 11 unit, sebab window 3 ikut dalam kumpulan galat. Empat dari empat nilai jatuh di dalam interval, dan itu belum banyak bercerita tentang coverage 80%. Gagasan hitungannya sama dengan di "Conformal prediction" (kursus uncertainty Level 3), di sini diterapkan pada galat bertanda dengan satu peringkat bawah dan satu peringkat atas, dan "Interval lab" membangun interval seperti ini.

::: deeper Mengapa seluruh rentang dari 12 galat
Galat baru sama mungkin jatuh di salah satu dari 13 tempat relatif terhadap 12 galat yang terurut: di bawah yang terkecil, di antara dua tetangga (11 tempat), atau di atas yang terbesar. Seluruh rentang menutup 11 dari 13, sekitar 85%. Membuang yang terkecil dan terbesar hanya menutup 9 dari 13, sekitar 69%, di bawah 80% yang diminta. Hitungan ini mengandaikan galat yang boleh diacak, padahal galat backtest berurutan menurut waktu dan memuat regime change, jadi anggap 80% sebagai target yang harus diperiksa, bukan janji.
:::

::: deeper Model kuantil dan pinball loss
**Model kuantil** memprediksi sebuah kuantil secara langsung. Latih satu untuk kuantil 0,1 dan satu untuk kuantil 0,9, dan pasangannya menjadi interval 80%. Loss-nya adalah **pinball loss**: untuk tingkat kuantil 0,9, nilai sebenarnya di atas forecast dikenai 0,9 kali selisihnya, dan di bawah forecast dikenai 0,1 kali selisihnya. Dengan forecast 150, nilai sebenarnya 160 berbiaya 0,9 x 10 = 9, dan nilai sebenarnya 140 berbiaya 0,1 x 10 = 1. Meramal terlalu rendah berbiaya 9 kali lebih besar, sehingga forecast terbaik naik sampai sekitar 90% nilai sebenarnya berada di bawahnya.
:::

## Coverage pada setiap horizon
*Apakah interval yang sama menepati janjinya 1, 2, 3, dan 4 kuartal ke depan?*

Periksa coverage per horizon, tidak hanya secara keseluruhan. Galat biasanya membesar seiring horizon, sehingga satu angka gabungan menyembunyikan interval yang baik pada h = 1 tetapi salah pada h = 4.

Ambil kasus sederhana: random walk (setiap kuartal menambahkan kejutan yang independen) yang diramal dengan nilai terakhirnya. Galat h kuartal ke depan adalah jumlah dari h kejutan, sehingga sebarannya akar h kali sebaran satu langkah. Interval 80% yang dibuat dari galat satu langkah memiliki coverage 80% pada h = 1, tetapi hanya 64%, 54%, dan 48% pada h = 2, 3, dan 4.

[[figure:rolling-backtests-and-probabilistic-forecasts/coverage-by-horizon|Coverage interval 80% yang lebarnya berasal dari galat satu langkah, untuk sebuah random walk. Interval perlu dua kali lebih lebar pada 4 kuartal ke depan.]]

Perbaikannya adalah mengumpulkan galat untuk setiap horizon secara terpisah dan membuat satu interval per horizon. Lalu hitung berapa nilai sebenarnya yang jatuh di dalam interval pada tiap horizon, di semua window. Hitungan itu bervariasi karena kebetulan: pada 20 window, interval 80% diharapkan menangkap 16 nilai, dengan standard error 9 poin. **Standard error** adalah ukuran ayunan acak yang lazim pada persentase tepat sasaran, di sini akar dari 0,8 x 0,2 / 20, sekitar 0,09. Hasil 13 dari 20 (65%) berada 1,7 standard error di bawah target dan layak dicermati, sedangkan 15 dari 20 tidak. Dengan 3 window kita, setiap horizon hanya punya 3 galat, sehingga coverage hanya bisa 0%, 33%, 67%, atau 100%.

## Regime dan pelatihan ulang
*Kapan pola berubah cukup jauh sehingga model harus dilatih ulang?*

**Regime** adalah rentang waktu ketika aturan yang menghubungkan masa lalu dengan masa depan tetap kurang lebih sama. **Regime change** mematahkannya: kenaikan harga, pesaing baru, toko yang ditutup. Toko ini tumbuh 48 unit setahun sampai tahun 4, lalu 16 pada tahun 5. "Covariate and concept shift" menyebut ini concept shift.

Tandanya ada di galat. Galat window 3 semuanya -7 sampai -9, satu tanda, yaitu bias dan bukan noise. Coverage interval turun di bawah target, atau MAE terbaru naik melewati window terburuk di backtest.

Di sini sliding window berguna. Setelah tahun 5, offset expanding adalah (591 - 431) / 4 / 4 = 10, sedangkan sliding window atas tahun 4 dan 5 memberi (591 - 575) / 1 / 4 = 4. Untuk tahun 6, MAE-nya 6 untuk expanding, 4 untuk seasonal naive, dan 0,5 untuk sliding. Sebelumnya kedua aturan itu sama, karena pertumbuhannya stabil. Harganya: baris yang lebih sedikit memberi estimasi yang kurang stabil.

Latih ulang menurut jadwal, misalnya tiap kuartal, atau saat galat yang dipantau melewati ambang yang dipilih dari backtest, dan kalibrasi ulang interval dengan galat terbaru. Jangan bereaksi pada satu window saja.

## Sebelum lab
*Apa yang perlu kamu bawa ke Forecast lab?*

Kini kamu dapat menguji forecaster seperti cara ia akan dipakai. Forecast lab, pelajaran terakhir kursus ini, membandingkan seasonal baseline dan model hasil pelatihan pada beberapa forecast window.

Sebelum membukanya, tuliskan tiga tebakan. Apakah model hasil pelatihan akan mengalahkan baseline di setiap window? Pada horizon mana intervalnya paling sering meleset? Apa yang akan kamu periksa untuk memutuskan bahwa datanya berubah?

Kebiasaan yang dibawa: window yang sama untuk setiap model, angka per window di samping rata-ratanya, dan coverage per horizon.

::: remember
- Rolling-origin backtest mengulang pengujian pada banyak origin, dengan bagian latih expanding atau sliding. Satu window dapat memilih model yang salah, jadi bandingkan model window demi window.
- Prediction interval dapat dibuat dari galat backtest, satu kumpulan per horizon. Periksa coverage per horizon, dan harapkan ia turun saat horizon membesar tetapi lebarnya tidak.
- Regime change tampak sebagai galat bertanda sama dan coverage yang turun. Sliding window, pelatihan ulang, dan interval yang dikalibrasi ulang menjawabnya, dan backtest dapat menguji kebijakan itu juga.
:::
