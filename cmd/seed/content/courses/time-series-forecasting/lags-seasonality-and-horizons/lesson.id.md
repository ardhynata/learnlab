---
slug: lags-seasonality-and-horizons
title: Lag, seasonality, dan horizon
---
::: intro
- Uraikan sebuah deret waktu menjadi tren, seasonality, dan noise, lalu kalahkan baseline seasonal naive sebelum kamu mempercayai model apa pun.
- Ubah deret waktu menjadi fitur lag dan window, lalu jelaskan apa yang dituntut forecast horizon dari fitur itu: satu langkah atau banyak langkah, recursive atau direct.
- Nilai sebuah forecast dengan MAE, RMSE, dan MASE secara manual, dan kenali tiga tempat di mana masa depan bocor ke dalam forecast.

Sebelum mulai: baca "Loss functions", "Baselines and splits", "Pipelines and leakage", dan "Grouped and temporal splits". Keempatnya memberimu MAE dan MSE, gagasan baseline yang harus dikalahkan, aturan bahwa preprocessing hanya dipelajari dari baris latih, dan temporal split. Pelajaran ini menerapkan keempatnya pada data yang berurutan menurut waktu.
:::

## Data yang berurutan
*Apa yang berubah ketika baris-barisnya tersusun menurut waktu?*

**Deret waktu** (*time series*) adalah daftar nilai yang diukur pada langkah yang teratur: penjualan per kuartal, kunjungan per hari, daya listrik per jam. Urutan adalah bagian dari data. Tabel penguin dapat diacak tanpa kehilangan apa pun. Jika deret waktu diacak, kamu kehilangan justru hal yang ingin dipelajari, karena nilai hari ini bergantung pada nilai-nilai sebelumnya.

**Forecast** memprediksi nilai setelah nilai terakhir yang kamu punya. Titik tempat data berhenti disebut **forecast origin**. Semua yang ada sesudahnya adalah masa depan, dan model tidak boleh melihatnya selama model dibuat.

Pelajaran ini memakai satu deret rekaan: penjualan kuartalan sebuah toko, dalam unit, selama tiga tahun.

| Tahun | Q1 | Q2 | Q3 | Q4 |
| --- | --- | --- | --- | --- |
| 1 | 86 | 126 | 102 | 117 |
| 2 | 98 | 139 | 113 | 129 |
| 3 | 109 | 150 | 125 | 143 |

Tahun 1 dan 2 (kuartal 1 sampai 8) adalah data latih, sehingga origin-nya berada di akhir kuartal 8. Tahun 3 (kuartal 9 sampai 12) adalah data uji: empat kuartal yang harus diprediksi.

> Gagasan kunci: jangan pernah diacak. Baris latih datang sebelum origin dan baris uji sesudahnya.

## Tren, seasonality, dan noise
*Dari apa saja sebuah deret waktu terbentuk?*

Tiga bagian yang dijumlahkan membentuk sebagian besar deret waktu. **Tren** adalah kenaikan atau penurunan yang lambat. **Seasonality** adalah pola yang berulang setelah sejumlah langkah tetap, yaitu **periode**: 4 untuk kuartal, 12 untuk bulan, 7 untuk hari dalam seminggu. **Noise** adalah sisanya, bagian yang tidak dapat dijelaskan oleh aturan apa pun.

Deret toko ini dibuat tepat dari bagian-bagian itu: 100 unit, ditambah 3 unit setiap kuartal, ditambah nilai musiman -18, +22, -9, dan +5 untuk Q1 sampai Q4, ditambah noise beberapa unit. Data nyata tidak datang dengan label untuk tiap bagian. Kamu hanya melihat jumlahnya, lalu membaca bagian-bagiannya dari sana. Q2 adalah kuartal tertinggi setiap tahun (126, 139, 150), dan setiap kuartal berada sekitar 12 unit di atas kuartal yang sama setahun sebelumnya.

[[figure:lags-seasonality-and-horizons/parts|12 kuartal toko (atas) dan tiga bagian yang menjumlahkannya: tren, seasonality, dan noise.]]

Forecast yang baik membawa tren dan pola musiman ke depan. Tidak ada yang dapat membawa noise ke depan, sehingga noise menjadi batas bawah galat: model yang sempurna pun tetap salah beberapa unit.

## Baseline yang harus dikalahkan
*Apa forecast yang paling sederhana, dan mengapa mulai dari sana?*

Forecast **naive** menyatakan bahwa nilai berikutnya sama dengan nilai terakhir. Forecast **seasonal naive** menyatakan bahwa nilai berikutnya sama dengan nilai satu periode lalu: Q1 tahun 3 diprediksi sebagai Q1 tahun 2. Keduanya tidak perlu dilatih, dan keduanya adalah batas yang harus dilewati model. Model yang tidak dapat mengalahkan seasonal naive belum mempelajari apa pun yang belum dikatakan kalender.

Ambil empat kuartal uji. Galat adalah nilai aktual dikurangi forecast.

| Kuartal | Aktual | Naive | Galat | Seasonal naive | Galat |
| --- | --- | --- | --- | --- | --- |
| 9 | 109 | 129 | -20 | 98 | +11 |
| 10 | 150 | 129 | +21 | 139 | +11 |
| 11 | 125 | 129 | -4 | 113 | +12 |
| 12 | 143 | 129 | +14 | 129 | +14 |

**MAE** (*mean absolute error*, rata-rata galat mutlak dalam unit) adalah (20 + 21 + 4 + 14) / 4 = 14,75 untuk naive dan (11 + 11 + 12 + 14) / 4 = 12 untuk seasonal naive. Seasonal naive menang, tetapi semua galatnya positif: ia memprediksi terlalu rendah di keempat kuartal, karena mengabaikan pertumbuhan sekitar 12 unit per tahun.

## Lag dan window
*Bagaimana mengubah deret waktu menjadi baris yang dapat dipelajari model?*

Model membutuhkan baris berisi fitur dan target. Buatlah dari deret itu sendiri. **Fitur lag** adalah nilai beberapa langkah sebelumnya: lag 1 adalah kuartal lalu, lag 4 adalah kuartal yang sama setahun lalu. **Fitur window** merangkum beberapa nilai terakhir, misalnya rata-rata 4 nilai sebelumnya. Targetnya adalah nilai saat ini.

| Kuartal | Target | Lag 1 | Lag 4 | Rata-rata 4 sebelumnya | Target - lag 4 |
| --- | --- | --- | --- | --- | --- |
| 5 | 98 | 117 | 86 | 107,75 | 12 |
| 6 | 139 | 98 | 126 | 110,75 | 13 |
| 7 | 113 | 139 | 102 | 114 | 11 |
| 8 | 129 | 113 | 117 | 116,75 | 12 |

[[figure:lags-seasonality-and-horizons/lags|Baris untuk kuartal 6: target (terisi) beserta lag 1, lag 4, dan window 4 kuartal sebelumnya.]]

Kuartal 1 sampai 4 belum punya lag 4, sehingga delapan nilai hanya menghasilkan empat baris latih. Setiap lag mengorbankan beberapa baris di awal. Kolom terakhir hampir konstan: tiap kuartal berada 12, 13, 11, atau 12 di atas kuartal yang sama setahun sebelumnya, dan itulah tren. Model kecil dapat mempelajarinya. Forecast = lag 4 + offset, dengan offset sama dengan rata-rata kolom terakhir, (12 + 13 + 11 + 12) / 4 = 12. Model ini hanya memakai baris latih.

## Satu langkah atau banyak langkah
*Seberapa jauh forecast harus menjangkau, dan apa yang boleh dipakai fitur?*

**Horizon** h adalah berapa langkah setelah origin yang kamu prediksi. Forecast **satu langkah** punya h = 1. Forecast **multi-langkah** mencakup h = 1, 2, 3, dan seterusnya: tahun uji adalah h = 1 sampai 4. Galat biasanya membesar seiring h, karena kamu semakin jauh dari nilai terakhir yang diketahui.

Setiap fitur harus sudah diketahui di origin. Jadi untuk horizon h, sebuah lag harus minimal h. Lag 1 hanya dapat melayani h = 1. Lag 4 melayani h = 1 sampai 4: kuartal 9 memakai kuartal 5, dan kuartal 12 memakai kuartal 8, semuanya sudah diketahui.

Jika model membutuhkan lag yang lebih pendek, ada dua cara. **Recursive**: latih satu model satu langkah, lalu masukkan forecast-nya sendiri kembali sebagai lag berikutnya. **Direct**: latih satu model untuk setiap horizon, masing-masing hanya memakai lag yang minimal sepanjang horizon itu.

[[figure:lags-seasonality-and-horizons/horizon|Forecast recursive dan direct dari origin. Aturan mainan "berikutnya = ini + 3" mulai dari 129 dan diulang pada keluarannya sendiri.]]

Recursive hanya butuh satu model tetapi membawa galat ke depan: langkah 2 berangkat dari tebakan langkah 1. Direct butuh beberapa model tetapi tidak pernah bertumpu pada tebakan.

## Menilai sebuah forecast
*Bagaimana merangkum kesalahan dalam satu angka?*

**MAE** merata-ratakan |e|. **RMSE** mengkuadratkan galat, merata-ratakannya, lalu mengambil akar; satuannya juga unit, tetapi kesalahan besar berbobot lebih. **MASE** adalah MAE dibagi sebuah skala: galat mutlak rata-rata seasonal naive pada tahun latih, yaitu MAE-nya di sana. Untuk kuartal 5 sampai 8 nilainya (12 + 13 + 11 + 12) / 4 = 12. MASE 1 berarti "sebesar galat biasa seasonal naive"; di bawah 1 lebih baik, dan tidak punya satuan.

Model lag 4 memprediksi 110, 151, 125, dan 141, sehingga galatnya -1, -1, 0, dan +2.

| Forecast | MAE | RMSE | MASE |
| --- | --- | --- | --- |
| Naive | 14,75 | 16,22 | 1,23 |
| Seasonal naive | 12 | 12,06 | 1 |
| Lag 4 + offset | 1 | 1,22 | 0,08 |

Untuk model ini, RMSE = sqrt((1 + 1 + 0 + 4) / 4) = sqrt(1,5) = 1,22 dan MASE = 1 / 12 = 0,08. Selisih RMSE dan MAE paling lebar pada naive karena galatnya paling bervariasi.

[[figure:lags-seasonality-and-horizons/forecasts|Tahun uji: penjualan aktual dan tiga forecast. Forecast lag 4 hampir menempel pada garis aktual.]]

::: deeper Mengapa skala MASE berasal dari data latih
Tahun uji belum diketahui saat kamu memilih model, sehingga skalanya hanya memakai tahun latih. Skala ini juga membuat MASE dapat dibandingkan antar deret. Forecast dengan MASE 0,5 memangkas separuh galat khas pembandingnya, entah deretnya menghitung unit atau mengukur megawatt.
:::

## Mengapa bukan sMAPE
*Mengapa galat persentase perlu diberi peringatan?*

Galat persentase populer karena tidak punya satuan, sehingga orang sering memilihnya lebih dulu.

> Awas: **sMAPE** (galat persentase yang membagi dengan nilai aktual dan forecast sekaligus) tampak aman, tetapi tidak. Galat yang sama diberi skor lebih buruk bila forecast terlalu rendah, dan nilainya melonjak mendekati batas atasnya, 200%, ketika nilai aktual mendekati nol (dan mencapainya tepat di nol). Catatan di bawah memuat angkanya. Jangan memeringkat model hanya dengan sMAPE.

::: deeper sMAPE dalam angka
sMAPE untuk satu nilai adalah 2 x |e| / (|aktual| + |forecast|). Ambil nilai aktual 100. Forecast 50 terlalu rendah 50: 2 x 50 / (100 + 50) = 0,667, atau 66,7%. Forecast 150 terlalu tinggi 50: 2 x 50 / (100 + 150) = 0,4, atau 40%. Galatnya sama, skornya berbeda. Jika nilai aktual 0, forecast apa pun di atas 0 memberi 2 x f / f = 200%, sekecil apa pun galatnya. Pada forecast seasonal naive toko, kuartal pertama bernilai 2 x 11 / (109 + 98) = 0,106, dan rata-rata keempat kuartal adalah 9,65%.
:::

## Leakage lewat waktu
*Di mana masa depan dapat menyelinap ke dalam forecast?*

Ada tiga pintu. Yang pertama adalah **split**. Split acak menaruh kuartal uji di antara kuartal latih, sehingga model hanya mengisi celah dan skornya tidak mengatakan apa-apa tentang kemampuan memprediksi. Pakailah temporal split, seperti di "Grouped and temporal splits": latih pada baris yang lebih awal, uji pada baris yang lebih akhir.

Yang kedua adalah **fitur**. Window yang menengok ke depan memakai masa depan. Di kuartal 8, rata-rata tiga kuartal yang terpusat (*centered*) adalah (113 + 129 + 109) / 3 = 117, dan 109 adalah kuartal 9. Rata-rata mundur (*trailing average*), yaitu (139 + 113 + 129) / 3 = 127, hanya memakai masa lalu. Lag yang lebih pendek daripada horizon adalah kebocoran yang sama, bila kamu mengisinya dengan nilai uji yang asli.

Yang ketiga adalah **scaling**. Kuartal latih berkisar dari 86 sampai 139. Min-max scaling dengan angka itu menempatkan kuartal 10 (150) di (150 - 86) / (139 - 86) = 1,21, di luar rentang yang pernah dilihat model. Scaling dengan rentang seluruh deret menempatkannya tepat di 1: tahun uji sudah bocor ke scaler dan menyembunyikan kejutannya.

> Awas: kebocoran membuat forecast tampak lebih baik, bukan lebih buruk. Skor yang jauh lebih baik daripada seasonal naive adalah alasan untuk mencari kebocorannya sebelum kamu merayakannya.

## Sebelum lab
*Apa yang perlu kamu bawa ke pelajaran berikutnya?*

Satu tahun uji hanyalah satu contoh: seasonal naive bisa saja sedang beruntung atau sial. Pelajaran berikutnya, "Rolling backtests and probabilistic forecasts", mengulang pengujian pada banyak origin dan mengganti satu angka dengan sebuah rentang.

Sesudah itu datang Forecast lab, pelajaran terakhir kursus ini. Di sana kamu membandingkan baseline musiman dengan model hasil belajar di beberapa jendela forecast. Sebelum membukanya, tuliskan dua tebakan: apakah model hasil belajar mengalahkan seasonal naive di setiap jendela, dan bagaimana galatnya berubah ketika horizon makin jauh?

Bawalah tiga kebiasaan: jalankan seasonal naive lebih dulu, pastikan setiap lag minimal sepanjang horizon, dan nilai dengan MASE di samping MAE.

::: remember
- Deret waktu adalah data berurutan: bagi menurut waktu, jangan pernah diacak, dan selalu bandingkan model dengan forecast naive dan seasonal naive.
- Fitur lag dan window berasal dari masa lalu; untuk horizon h, sebuah lag harus minimal h, atau forecast-nya harus recursive atau direct.
- MAE, RMSE, dan MASE menilai sebuah forecast; sMAPE punya catatan khusus. Leakage masuk lewat split, fitur, dan scaling.
:::
