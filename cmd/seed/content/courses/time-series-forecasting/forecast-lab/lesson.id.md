---
slug: forecast-lab
title: Forecast lab
---
::: intro
- Perkirakan apakah model lag terlatih atau baseline seasonal yang menang di setiap window forecast, lalu baca jawabannya window demi window, bukan dari satu rata-rata.
- Jelaskan apa yang dilakukan horizon yang lebih jauh, lag yang lebih sedikit, regime shift (lompatan pada level seri), dan gaya backtest yang berbeda terhadap tiap model dan terhadap interval 80%-nya.
- Ulangi sebuah temuan pada seri baru sebelum kamu mempercayainya.

Sebelum mulai: baca "Lags, seasonality and horizons" dan "Rolling backtests and probabilistic forecasts". Keduanya memperkenalkan tiga model, MASE, window bergulir, dan gagasan interval yang dipotong dari galat masa lalu. Di lab ini kamu dapat mematahkan masing-masing dengan sengaja.
:::

## Apa yang ditanyakan lab
*Apa yang dapat kamu bandingkan di Forecast lab?*

Lab membuat satu seri sepanjang 240 langkah: sebuah level, tren +0,10 per langkah, musim sepanjang 12 langkah dengan amplitudo 3, dan noise 0,5. Seed-nya mengunci seri itu, sehingga semua orang memulai dengan seri yang sama. Tiga model meramalkannya: **Naive (nilai terakhir)**, **Seasonal naive**, dan **Model lag terlatih**. Model terlatih adalah regresi pada 12 nilai terakhir ditambah penanda posisi dalam musim, dan dilatih ulang untuk setiap langkah ke depan.

Backtest terdiri dari 8 window. Setiap window memilih sebuah origin, berlatih pada data sebelum origin itu, meramalkan 12 langkah, lalu menilainya. Origin pertama ada di langkah 150, yang lain menyusul setiap 11 langkah, dan window terakhir berakhir di langkah terakhir. **Gaya backtest** bawaannya berlatih pada 72 langkah terakhir (slice training: bagian riwayat tempat model berlatih), dan ukuran galatnya adalah MASE.

Pengaturan awal sudah memuat regime shift (lompatan pada level seri) sebesar +6 pada langkah 190. Rencana di bawah ini lebih dulu menghilangkannya agar kamu melihat model pada seri yang tenang, lalu memasukkannya kembali.

[[figure:forecast-lab/lab-map|Layar lab: plot dengan satu baris per window, empat kotak di sampingnya, dan kelompok kontrol yang terlipat.]]

## Seri yang tenang
*Model mana yang menang ketika tidak ada yang rusak?*

Buka kelompok **Regime shift**, lalu atur **Besar regime shift (0 = tidak ada)** ke 0. Sekarang seri hanya berupa tren yang stabil ditambah musim yang berulang, persis yang dirancang untuk ditangkap oleh model terlatih.

| Model | MASE rata-rata | Window terburuk | Window dimenangkan |
| --- | --- | --- | --- |
| Naive (nilai terakhir) | 1,88 | 2,46 (window 8) | 0 dari 8 |
| Seasonal naive | 1,07 | 1,20 (window 6) | 0 dari 8 |
| Model lag terlatih | 0,45 | 0,63 (window 1) | 8 dari 8 |

> Contoh hitungan: MASE membagi galat sebuah window dengan galat yang dibuat seasonal naive di dalam slice training window itu sendiri (1,23 pada window 1, kira-kira sama pada window lain). MAE rata-rata seasonal naive sebesar 1,32 memberi 1,32 / 1,23 = 1,07. Nilainya dekat 1 karena skalanya berupa galat sejenis: salinan dari satu musim sebelumnya.

Seasonal naive tidak menangkap tren: pertumbuhan satu musim adalah 12 x 0,10 = 1,2 satuan, dan ia juga menyalin satu nilai yang berisi noise. Naive sama sekali tidak menangkap musim. Model terlatih mempelajari keduanya. Jenis seri yang sama muncul di setiap window, sehingga pemenangnya tidak berubah.

> Awas: selisihnya lebar karena seri di lab ini persis berupa tren ditambah musim. Seri nyata lebih berantakan, jadi anggap 8 kemenangan dari 8 sebagai kasus yang bersih, bukan sebagai jaminan.

## Seberapa jauh ke depan
*Apakah galat selalu membesar seiring horizon?*

Biarkan shift di 0, lalu atur **Forecast horizon (langkah)** ke 24. Window bergeser lebih awal agar 24 langkah muat, dan **Galat menurut horizon** menampilkan satu titik untuk setiap langkah ke depan.

[[figure:forecast-lab/horizon|MASE menurut langkah ke depan pada seri tenang, horizon 24. Seasonal naive kira-kira berlipat dua setelah satu musim; model terlatih tetap rendah.]]

Seasonal naive punya titik patah di langkah 13. Untuk langkah 1 sampai 12 ia menyalin nilai satu musim sebelumnya, yang tertinggal 12 langkah tren. Untuk langkah 13 dan seterusnya ia hanya dapat menyalin nilai dua musim sebelumnya, yang tertinggal 24 langkah tren, sehingga MASE rata-ratanya naik dari 1,02 menjadi 2,00. Selisih trennya 24 x 0,10 = 2,4 dibanding 1,2, tepat dua kali lipat.

Model terlatih tetap berada di antara 0,3 dan 0,8 pada setiap langkah. Ia dilatih terpisah untuk tiap langkah ke depan, sehingga ia mempelajari tren pada jarak itu. Pelajaran sebelumnya mengatakan galat biasanya membesar bersama horizon. Di sini tidak, karena polanya tidak pernah berubah. Bahkan dengan **Noise** 3,0, MASE rata-rata model terlatih adalah 1,03 untuk langkah 1 sampai 12 dan 1,02 untuk langkah 13 sampai 24. Pertumbuhan baru terlihat pada seri yang polanya bergeser.

## Apa yang dibutuhkan model terlatih
*Bagian mana dari model terlatih yang bekerja?*

Kembalikan horizon ke 12, biarkan shift di 0, lalu buka **Model**. Model terlatih punya dua cara untuk tahu posisinya dalam musim: lag-nya (satu musim penuh adalah 12 nilai) dan toggle **Model terlatih tahu posisi dalam musim**. Angka di bawah adalah MASE rata-rata pada 8 window.

| Lag yang dipakai | Posisi dalam musim | MASE rata-rata | Window dimenangkan |
| --- | --- | --- | --- |
| 12 | diketahui | 0,45 | 8 dari 8 |
| 12 | tidak diketahui | 0,47 | 8 dari 8 |
| 1 | diketahui | 0,75 | 7 dari 8 |
| 1 | tidak diketahui | 1,94 | 0 dari 8 |

Dengan 12 lag, musim sudah ada di dalam input, sehingga toggle itu nyaris tidak menambah apa pun. Dengan 1 lag dan tanpa penanda musim, model hanya melihat nilai terakhir dan sebuah tren. Ia tidak punya cara untuk membedakan puncak dari lembah, sehingga hasilnya lebih buruk daripada seasonal naive (1,07) dan hampir seburuk naive (1,88). Inilah alasan untuk selalu menampilkan baseline di layar.

Lag yang lebih banyak juga tidak gratis. Dengan slice 72 langkah dan 12 langkah ke depan, 12 lag menyisakan 49 baris training untuk 23 input. 24 lag menyisakan 37 baris untuk 35 input.

## Regime shift
*Model mana yang kehilangan lebih banyak akurasi ketika level seri berubah?*

Tekan **Reset**. Sekarang seri punya shift +6 pada langkah 190. Window 1 sampai 3 berakhir sebelum shift, window 4 meramalkan melewatinya, dan window 5 sampai 8 berada sesudahnya. Sebelum membaca tabel, jawab **Kuis Cepat** di bawah kotak Parameter: model mana yang akan kehilangan lebih banyak akurasi?

[[figure:forecast-lab/windows|MASE tiap model di setiap window dengan shift. Model terlatih terbaik sebelum shift, kalah di window 5 dan 6, lalu pulih di window 7 dan 8.]]

Model terlatih kehilangan lebih banyak akurasi, dengan faktor yang lebar. MASE rata-ratanya naik dari 0,46 sebelum shift menjadi 1,69 sesudahnya (3,7 kali; "sesudah" berarti window 4 sampai 8, karena window 4 sudah mencapai shift). Seasonal naive naik dari 1,04 menjadi 1,61 (1,6 kali). Model terlatih masih menang di 6 dari 8 window, tetapi setelah shift seasonal naive sedikit lebih unggul secara rata-rata, 1,61 dibanding 1,69. Mengapa model terlatih kehilangan lebih banyak? Pada window 4 dan 5 ia dilatih pada riwayat yang sebagian besar dari sebelum shift dan lag-nya masih berisi nilai pra-shift, sehingga ia terus memakai pola lama. Seasonal naive hanya salah selama satu musim: satu salinan dari regime lama, lalu benar kembali. Window 6 berbeda: kedua belas lag-nya sudah pasca-shift, dan penyebabnya adalah slice training yang tipis, seperti dijelaskan di bawah.

::: deeper Mengapa forecast yang sama mendapat MASE lebih rendah setelah shift
Pada window 6, MAE seasonal naive adalah 1,49 di kedua gaya backtest, tetapi MASE-nya 0,61 dengan sliding dan 0,93 dengan expanding. Skalanya, yaitu galat seasonal naive in-sample pada slice training window itu, adalah 2,42 untuk slice sliding dan 1,60 untuk slice expanding. Slice itu memuat 16 langkah setelah shift, dan 12 selisih musiman yang melintasinya masing-masing sekitar 6 lebih besar. Untuk model terlatih, 6,90 / 2,42 = 2,85. MASE dapat dibandingkan antarmodel di dalam satu window, bukan antarpengaturan yang mengubah slice.
:::

## Sliding atau expanding
*Apakah melupakan data lama membantu setelah shift?*

Buka **Backtest** dan ganti **Gaya backtest** ke pilihan expanding. Agar dapat membandingkannya dengan sliding, ganti **Ukuran galat** ke MAE lebih dulu, karena MASE mengubah skalanya di antara kedua gaya.

Pada pengaturan awal, MAE rata-rata model terlatih adalah 2,16 dengan sliding dan 1,19 dengan expanding. MAE seasonal naive adalah 2,13 di keduanya, karena forecast-nya tidak bergantung pada slice. Sliding membayar biaya baris yang lebih sedikit di window 5 dan 6: 3,64 dibanding 2,05, lalu 6,90 dibanding 1,08. Di window 6, slice 72 langkah harus memuat 12 lag dan 11 penanda musim (input yang memberi tahu model posisinya dalam musim), dan 16 langkahnya baru. Kembali ke sliding lalu atur **Lag yang dipakai model terlatih** ke 4, dan window 6 turun dari 6,90 menjadi 1,76.

Pelajaran sebelumnya mengatakan bahwa sliding window melupakan data lama lebih cepat tetapi berlatih pada lebih sedikit baris. Pada seri ini biayanya jelas dan manfaatnya kecil: sliding menang di window 7 sekitar 0,2 (0,80 dibanding 1,01) dan kalah di window 8 sekitar 0,2 (0,98 dibanding 0,80).

::: deeper Dapatkah pilihan ukuran mengubah putusan?
Pada pengaturan awal, MAE rata-rata menempatkan seasonal naive (2,13) sedikit di depan model terlatih (2,16), sedangkan MASE rata-rata (1,40 dibanding 1,23) menempatkan model terlatih di depan. Window dimenangkan tetap 6 dari 8 untuk model terlatih di keduanya. Laporkan angka per window.
:::

## Interval yang tidak bergerak
*Apa yang dilakukan band 80% ketika seri berubah?*

Buka **Galat dan interval**. Band dipotong dari model pada **Interval untuk**, di sini model terlatih, dengan **Target coverage interval** 80%. Lab memotongnya sekali dari 34 window sebelum window backtest pertama dan tidak pernah memperbaruinya.

[[figure:forecast-lab/band|Nilai sebenarnya di dalam band 80% pada tiap window (dari 12), tanpa dan dengan shift. Band menampung 80% secara keseluruhan tanpa shift dan 53% dengan shift.]]

Tanpa shift, band menampung 80% nilai sebenarnya. Dengan shift, band menampung 53%; window 5 hanya punya 1 dari 12 nilai di dalam dan window 6 punya 2 dari 12. Band yang dipotong dari riwayat yang tenang tidak dapat mengikuti seri yang sudah bergerak. Solusinya sama seperti di pelajaran sebelumnya: kalibrasi ulang pada galat terbaru.

Garis **Coverage interval menurut horizon** bergerak dalam kelipatan 12,5 poin, karena setiap langkah ke depan hanya punya 8 window. Jangan membaca tren dari satu penurunan.

Ganti **Interval untuk** ke **Seasonal naive** pada seri yang tenang. Bandnya sekitar dua kali lebih lebar (3,68 dibanding 1,76 dalam lebar total) dan tetap hanya menampung 74%, kurang dari 80%. Lebar saja tidak membeli coverage, dan band yang lebar sedikit sekali memberi informasi: ia mengakui sebelumnya bahwa galat besar mungkin terjadi. Band yang lebih lebar adalah forecast yang kurang informatif, bukan yang lebih baik.

## Seri baru
*Apakah hasilnya bertahan pada seri lain?*

Satu seed adalah satu sampel acak. Tekan **Seri baru**, yang menaikkan seed sebanyak 1, lalu periksa kedua temuan (kemenangan pada seri tenang dan faktor kehilangan akibat shift) pada seed 2 sampai 7. Pada seri yang tenang, model terlatih menang di 8 dari 8 window pada setiap seed, dengan MASE rata-rata antara 0,37 dan 0,43 dibanding 0,96 sampai 1,06 untuk seasonal naive. Dengan shift bawaan, galat model terlatih setelah shift adalah 3,5 sampai 4,4 kali galatnya sebelum shift, dan galat seasonal naive 1,4 sampai 1,6 kali. Model terlatih selalu kehilangan akurasi dengan faktor yang lebih lebar.

Kursus ini tidak menyertakan time series nyata, sehingga lab tidak punya sakelar ke data nyata. Seed baru adalah langkah transfer di sini, dan ia menguji gagasan terhadap sampel noise yang berbeda, bukan jenis data yang berbeda. Sebelum menerapkan gagasan itu pada seri nyata, jalankan baseline di atasnya, lakukan backtest pada beberapa origin, dan tanyakan apa yang terjadi ketika levelnya berubah.

::: remember
- Bandingkan model window demi window, dengan baseline di layar. Pada seri buatan yang tenang, model terlatih menang di setiap window, dan dengan shift ia kehilangan akurasi dengan faktor lebar sementara seasonal naive kehilangan lebih kecil.
- Seasonal naive patah setelah horizon melewati satu musim. Model terlatih membutuhkan musim di dalam lag atau penandanya, dan slice training yang tipis dengan banyak input dapat membuat sliding window lebih buruk daripada expanding.
- Band yang dipotong sekali mempertahankan lebarnya tetapi kehilangan coverage ketika seri berubah. Laporkan angka per window, bandingkan gaya dengan MAE, dan uji pada seri baru.
:::

@@lab

## Lab: forecasting dan backtesting
Lab membuat satu seri buatan sepanjang 240 langkah dan menilai tiga model pada 8 window backtest. Kamu mengubah seri, model, backtest, dan interval, lalu membaca efeknya di plot, tiga grafik, dan sebuah tabel. Seri selalu dibuat oleh lab: kursus ini tidak menyertakan time series nyata, jadi tidak ada mode data nyata.

### Kontrol
Kotak Parameter punya lima kelompok yang terlipat: **Seri**, **Regime shift**, **Model**, **Backtest**, dan **Galat dan interval**. Hanya satu yang terbuka pada satu waktu, dan **Regime shift** terbuka di awal. Tombol **Layar penuh** dan **Reset** ada di bagian atas lab; **Reset** mengembalikan setiap kontrol ke nilai awalnya.

- **Seri**
  - **Panjang musim (langkah)** (4 sampai 24; awalnya 12) menyatakan berapa langkah yang dibutuhkan musim untuk berulang.
  - **Tren per langkah** (-0,10 sampai +0,30; awalnya +0,10), **Amplitudo musiman** (0 sampai 8; awalnya 3,0), dan **Noise** (0 sampai 3; awalnya 0,5) mengatur tiga bagian seri.
  - **Seed** (1 sampai 999; awalnya 1) memilih noise acak. **Seri baru** menambahkan 1 padanya.
- **Regime shift**
  - **Regime shift pada (langkah waktu)** (60 sampai 230; awalnya 190) dan **Besar regime shift (0 = tidak ada)** (-10 sampai +10; awalnya +6,0) menentukan di mana level melompat dan seberapa besar.
  - **Musim ikut bergeser saat shift (setengah periode)** menggeser pola musim setengah periode, sehingga puncak menjadi lembah. Awalnya mati.
- **Model**
  - **Naive (nilai terakhir)**, **Seasonal naive**, dan **Model lag terlatih** menampilkan atau menyembunyikan tiap model di plot, grafik, dan tabel. Awalnya menyala.
  - **Lag yang dipakai model terlatih** (1 sampai 24; awalnya 12) mengatur berapa banyak nilai masa lalu yang dilihatnya.
  - **Model terlatih tahu posisi dalam musim** memberinya penanda untuk langkah dalam musim. Awalnya menyala.
- **Backtest**
  - **Forecast horizon (langkah)** (1 sampai 24; awalnya 12).
  - **Gaya backtest** memilih **Expanding: latih pada semua data sejauh ini** atau **Sliding: latih pada 72 langkah terakhir**. Awalnya sliding.
  - **Jumlah window** (3 sampai 12; awalnya 8).
  - **Window yang ditampilkan** (awalnya window 4) memilih window yang digambar di plot, dengan keterangan seperti "4 dari 8". **Window sebelumnya** dan **Window berikutnya** menelusuri window satu per satu. Kamu juga dapat mengklik sebuah window di plot atau di **Galat di setiap window**, atau menekan tombol panah ketika plot sedang difokuskan.
- **Galat dan interval**
  - **Ukuran galat** memilih MASE, MAE, atau RMSE. Awalnya MASE.
  - **Target coverage interval** (50% sampai 95%; awalnya 80%) adalah porsi nilai sebenarnya yang seharusnya ditampung band.
  - **Interval untuk** memilih galat model mana yang memotong band. Awalnya model terlatih.
- **Kuis Cepat** adalah tombol di bawah kotak Parameter (tombol di bawah kartu pengaturan (tombol bulat di kanan bawah pada ponsel) pada ponsel). Ia bertanya: "Setelah terjadi regime shift, model mana yang paling banyak kehilangan akurasi: seasonal naive atau model lag terlatih?" Pilih jawaban lebih dulu, baru gunakan shift.

### Membaca layar
- Plot menampilkan **Seri sebenarnya** (hitam), window forecast yang diarsir, garis **Regime shift**, forecast tiap model yang dicentang untuk window yang ditampilkan (putus-putus rapat untuk naive, putus-putus panjang untuk seasonal naive, garis utuh untuk model terlatih), dan band interval. **Forecast origin** adalah garis vertikal bertitik. Di bawahnya ada satu baris per window: slice training-nya berwarna abu-abu dan rentang forecast-nya berwarna. Window yang ditampilkan diberi garis tepi.
- Baris status di awal berbunyi "Window 4 dari 8, meramalkan langkah 184 sampai 195. MASE: Naive (nilai terakhir) 3,24, Seasonal naive 3,60, Model lag terlatih 2,74." Baris di bawahnya berbunyi "Interval 80%: 6 dari 12 nilai sebenarnya di window ini berada di dalam, 53% di semua window." Di sisi kanan: "240 langkah, 8 window, horizon 12".
- **Galat di setiap window** menampilkan satu kelompok batang per window dan sebuah penanda di atas batang terendah tiap kelompok. Garis putus-putus berlabel "Shift tercapai" menandai window pertama yang meramalkan melewati shift. Klik sebuah kelompok untuk menampilkan window itu.
- **Galat menurut horizon** menampilkan galat di setiap langkah ke depan, digabung dari semua window. **Coverage interval menurut horizon** menampilkan porsi nilai sebenarnya di dalam band pada tiap langkah ke depan, dibandingkan dengan garis putus-putus pada target.
- Tabel **Galat rata-rata dan window terburuk** punya kolom **Model**, **MASE rata-rata** (atau MAE atau RMSE), **Window terburuk**, dan **Window dimenangkan**. Di awal, model terlatih punya rata-rata 1,23, window terburuk 2,85 (window 6), dan menang di 6 dari 8 window.
- **Kuis Cepat** menjawab begitu kamu memilih sebuah opsi dan shift diatur sehingga sebagian window berada sebelumnya dan sebagian sesudahnya. Putusannya memuat MASE rata-rata sebelum dan sesudah shift untuk kedua model.

### Eksperimen
Tekan **Reset** sebelum setiap eksperimen agar angkamu sama.

1. **Seri yang tenang.** Prediksikan: dengan **Besar regime shift (0 = tidak ada)** diatur ke 0, berapa dari 8 window yang dimenangkan model terlatih? Atur lalu baca tabel: MASE rata-rata adalah 1,88, 1,07, dan 0,45 untuk naive, seasonal naive, dan model terlatih, dan model terlatih menang 8 dari 8. Di **Galat menurut horizon**, apakah ada model yang galatnya naik seiring langkah ke depan? Tidak ada yang naik terus: naive berayun naik-turun mengikuti musim dan memuncak sekitar setengah musim ke depan (2,62 pada langkah 7), sedangkan seasonal naive dan model terlatih tetap kira-kira mendatar. Jelaskan mengapa seasonal naive berada di dekat 1.
2. **Melewati satu musim.** Prediksikan: atur **Besar regime shift (0 = tidak ada)** ke 0 dan **Forecast horizon (langkah)** ke 24. Apa yang terjadi pada galat seasonal naive di langkah 13 sampai 24? Di **Galat menurut horizon**, seasonal naive melonjak dari 0,67 pada langkah 12 ke 1,92 pada langkah 13, dan rata-ratanya naik dari 1,02 (langkah 1 sampai 12) menjadi 2,00. Model terlatih tetap di bawah 0,8. Jelaskan lonjakan itu dengan tren selama 12 dan selama 24 langkah.
3. **Apa yang dibutuhkan model terlatih.** Prediksikan: dengan **Besar regime shift (0 = tidak ada)** di 0, apakah model terlatih masih mengalahkan seasonal naive ketika kamu mengatur **Lag yang dipakai model terlatih** ke 1 dan mematikan **Model terlatih tahu posisi dalam musim**? Cobalah: MASE rata-ratanya 1,94 dibanding 1,07, dan seasonal naive menang di semua 8 window. Nyalakan toggle-nya dan rata-rata turun ke 0,75. Lalu kembalikan lag ke 12: 0,45. Input mana yang membawa musim?
4. **Shift dan gayanya.** Prediksikan: di **Kuis Cepat**, pilih model mana yang kehilangan lebih banyak akurasi setelah shift. Putusan muncul setelah kamu memilih: seasonal naive naik dari 1,04 ke 1,61 (1,6 kali) dan model lag terlatih dari 0,46 ke 1,69 (3,7 kali). Berikutnya, atur **Ukuran galat** ke MAE dan **Gaya backtest** ke pilihan expanding, lalu bandingkan window 6: MAE model terlatih adalah 6,90 dengan sliding dan 1,08 dengan expanding. Kembalikan **Gaya backtest** ke sliding dan atur **Lag yang dipakai model terlatih** ke 4: window 6 turun ke 1,76. Apa yang dilakukan slice pendek dengan banyak input?
5. **Band yang membeku.** Prediksikan: berapa porsi nilai sebenarnya yang ditampung band 80% dengan shift 0, dan dengan shift 6? Periksa baris detail: 80% tanpa shift, 53% dengan shift. Gunakan **Window berikutnya** untuk sampai ke window 5: 1 dari 12 nilai berada di dalam. Lalu atur shift ke 0 dan **Interval untuk** ke **Seasonal naive**: band menjadi sekitar dua kali lebih lebar dan hanya menampung 74%, dibanding 80% untuk band model terlatih. Apakah band yang lebih lebar membuat forecast lebih baik? Tidak: ia forecast yang kurang informatif, bukan yang lebih baik.
6. **Seri baru.** Prediksikan: apakah kehilangan akurasi model terlatih akibat shift akan berfaktor lebih lebar daripada seasonal naive pada seri lain juga? Tekan **Seri baru** dan baca putusan **Kuis Cepat** pada seed 2 sampai 7: faktor model terlatih adalah 3,5 sampai 4,4 dan faktor seasonal naive adalah 1,4 sampai 1,6 setiap kali. Lalu atur shift ke 0 dan periksa bahwa model terlatih menang 8 dari 8 pada tiap seed. Apa lagi yang masih harus kamu uji sebelum mempercayainya pada seri nyata?
