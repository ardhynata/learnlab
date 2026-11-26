---
slug: high-cardinality-and-target-encoding
title: Kategori dengan banyak nilai dan target encoding
---
::: intro
- Jelaskan mengapa one-hot encoding tidak lagi sesuai untuk kolom dengan ratusan nilai, dan gunakan frequency encoding sebagai alternatif yang murah.
- Hitung smoothed target encoding dengan tangan, lalu jelaskan apa yang dilakukan angka smoothing.
- Jelaskan mengapa target encoding yang di-fit pada baris yang sama dengan yang di-encode membocorkan label, dan bangun versi yang aman dari leakage dengan cara out of fold.

Sebelum mulai: baca "Missing values and encoding", "Pipelines and leakage", "Cross-validation and stratification" dan "Interactions and transformations". Kolom one-hot, fitting hanya pada baris training, dan fold dipakai di sini tanpa diajarkan ulang.
:::

## Ketika sebuah kolom punya terlalu banyak nilai
*Apa yang salah ketika one-hot encoding bertemu ratusan kategori?*

Banyaknya nilai yang berbeda dalam sebuah kolom disebut **cardinality**. Kolom island pada data penguin hanya punya 3 nilai, sehingga one-hot encoding menulis 3 kolom dan tidak ada yang hilang. Kode pos atau id produk adalah kasus yang lain.

Bayangkan sebuah tabel rekaan berisi 2.000 pelanggan dengan kode pos dan satu label: 1 jika pelanggan membeli, 0 jika tidak. Tabel itu memuat 412 kode pos berbeda, sehingga one-hot encoding mengubah satu kolom menjadi 412 kolom yang hampir semuanya berisi nol, untuk 2.000 baris.

Jumlahnya tidak merata. Kode pos tersibuk punya 174 pelanggan, tetapi 112 dari 412 kode pos hanya muncul sekali dan 271 muncul tiga kali atau kurang. Model yang memberi bobot sendiri pada setiap kolom itu sedang menetapkan bobot pada satu, dua, atau tiga baris, sehingga setiap bobot bertumpu pada bukti yang sangat sedikit. Kode pos yang baru muncul bulan depan bahkan tidak punya kolom sama sekali.

[[figure:high-cardinality-and-target-encoding/long-tail|Ke-412 kode pos pada tabel rekaan, dikelompokkan menurut jumlah pelanggan masing-masing. Sebagian besar punya tiga pelanggan atau kurang.]]

> Gagasan kunci: jika kategorinya banyak, jangan beri tiap kategori kolomnya sendiri. Wakili setiap kategori dengan satu angka yang dapat dipakai model.

## Frequency encoding
*Bagaimana jika setiap kategori diganti dengan seberapa sering ia muncul?*

**Frequency encoding** mengganti setiap kategori dengan frekuensi kemunculannya pada baris training, sebagai jumlah atau sebagai porsi dari seluruh baris. Hasilnya satu kolom, berapa pun cardinality-nya.

Berikut tabel training kecil berisi 20 pelanggan di empat kode pos. Bagian berikutnya memakai tabel ini lagi. Dari 20 pelanggan itu, 8 membeli.

| Kode pos | Pelanggan | Membeli | Frekuensi sebagai porsi |
| --- | --- | --- | --- |
| A | 10 | 3 | 10 / 20 = 0,50 |
| B | 6 | 1 | 6 / 20 = 0,30 |
| C | 3 | 3 | 3 / 20 = 0,15 |
| D | 1 | 1 | 1 / 20 = 0,05 |

Encoding ini tidak pernah membaca label, sehingga tidak mungkin membocorkan label. Namun ia punya batas yang jelas: dua kode pos dengan jumlah yang sama mendapat angka yang sama, apa pun yang dilakukan pelanggannya. Frequency baru berguna jika seberapa umum sebuah kategori berhubungan dengan label, misalnya kode kota yang ramai dibandingkan kode daerah yang sepi.

Seperti biasa, hitungannya hanya berasal dari baris training.

## Target encoding
*Bisakah sebuah kategori diganti dengan tingkat hasilnya sendiri?*

**Target encoding**, disebut juga mean encoding, mengganti setiap kategori dengan rata-rata label dari baris training di dalamnya. Untuk label 0 dan 1, rata-rata itu adalah porsi angka 1. Pada tabel kecil tadi, A menjadi 3 / 10 = 0,30, B menjadi 1 / 6 = 0,17, C menjadi 3 / 3 = 1,00 dan D menjadi 1 / 1 = 1,00. Rata-rata keseluruhan adalah 8 / 20 = 0,40.

Ini satu kolom yang berbicara langsung tentang label, sehingga model garis lurus hanya membutuhkan satu bobot, bukan 412 bobot yang masing-masing bertumpu pada beberapa baris saja.

Namun perhatikan C dan D. Keduanya bernilai 1,00, padahal C bertumpu pada tiga pelanggan dan D pada satu. Satu pelanggan yang membeli hampir tidak mengatakan apa-apa tentang tingkat pembelian satu kode pos. Encoding ini tidak menunjukkan seberapa banyak bukti di balik tiap angka.

> Awas: rata-rata dari satu baris adalah label baris itu sendiri, bukan estimasi sebuah tingkat.

## Smoothing
*Bagaimana mencegah kategori kecil mengklaim tingkat yang sempurna?*

**Smoothing** mencampur rata-rata kategori dengan rata-rata keseluruhan, dan makin bersandar pada kategori itu ketika barisnya makin banyak:

`encoded = (n × category mean + m × overall mean) / (n + m)`

Di sini n adalah jumlah baris training dalam kategori. Angka m adalah pilihanmu. Kamu dapat membayangkannya sebagai m pelanggan khayalan, semuanya berada di rata-rata keseluruhan, yang ditambahkan ke setiap kategori.

> Contoh hitungan: ambil m = 4 dan rata-rata keseluruhan 0,40. Kode pos C: (3 × 1,00 + 4 × 0,40) / (3 + 4) = 4,6 / 7 = 0,66. Kode pos D: (1 × 1,00 + 4 × 0,40) / (1 + 4) = 2,6 / 5 = 0,52. Kode pos A: (3 + 1,6) / 14 = 0,33. Kode pos B: (1 + 1,6) / 10 = 0,26. Untuk A dan B, n × category mean tidak lain adalah jumlah pembeli.

D turun dari 1,00 menjadi 0,52, sedangkan C hanya turun menjadi 0,66. Bobot untuk rata-rata milik kode pos itu sendiri adalah n / (n + m): 1 / 5 = 0,20 untuk D, 3 / 7 = 0,43 untuk C, dan 10 / 14 = 0,71 untuk A. Kode pos baru, dengan n = 0, mendapat rata-rata keseluruhan, 0,40. Makin besar m, makin kecil kepercayaan pada kategori. Pilih m dengan cross-validation, seperti memilih k pada k-NN.

[[figure:high-cardinality-and-target-encoding/smoothing|Kode pos yang semua pelanggannya membeli: nilai encoding-nya terhadap jumlah pelanggan, untuk m = 4 dan m = 10. Kode pos C dan D dari tabel berada pada kurva m = 4.]]

## Mengapa versi naif membocorkan label
*Bagaimana fitur yang dibuat dari label dapat menyesatkan skor?*

Versi **naif** men-fit encoding pada baris training, lalu memakainya sebagai fitur untuk baris training yang sama. Akibatnya, label setiap baris ikut berada di dalam rata-rata kategorinya sendiri. Untuk kode pos D, encoding-nya adalah label satu pelanggan itu.

Ujilah pada tabel yang kode posnya tidak bermakna. Setiap tabel berisi 300 pelanggan training di 100 kode pos, sekitar tiga per kode pos, dan labelnya hasil lempar koin. Modelnya aturan satu pertanyaan: prediksi 1 bila nilai encoding berada di atas sebuah cutoff (ambang) yang dipilih dari baris training. Dirata-ratakan dari 200 tabel simulasi, naive target encoding mendapat skor 71,7% pada baris training dan 50,0% pada 300 pelanggan baru. Smoothing dengan m = 10 tidak mengubah apa pun di sini: 71,7% dan 50,0%.

Selisih 21,7 poin itulah kebocorannya. Sekarang beri kode pos efek yang nyata, dengan tingkat antara 15% dan 85%, dan 1.000 baris training. Skor naifnya 71,0% pada baris training dan 64,5% pada baris baru, sehingga ia melebih-lebihkan 6,5 poin.

[[figure:high-cardinality-and-target-encoding/leak|Akurasi aturan satu pertanyaan pada baris training dan pada baris baru, dengan encoding yang dibuat secara naif dan secara out of fold. Rata-rata dari 200 tabel simulasi.]]

> Awas: skor cross-validation punya cacat yang sama jika encoding dihitung sebelum fold dipotong, karena label setiap baris validation berada di dalam encoding-nya sendiri.

## Encoding out of fold
*Bagaimana meng-encode sebuah baris tanpa memasukkan labelnya sendiri?*

Encode setiap baris training dari baris-baris yang tidak berada di fold-nya. Potong baris training menjadi 5 fold, seperti pada "Cross-validation and stratification". Untuk fold 1, buat tabelnya dari fold 2 sampai 5 lalu terapkan ke fold 1. Ulangi untuk setiap fold. Kini setiap baris training punya encoding yang dibangun tanpa labelnya sendiri. Baris yang datang kemudian, seperti test set, di-encode satu kali dengan tabel yang dibangun dari seluruh baris training.

[[figure:high-cardinality-and-target-encoding/out-of-fold|Lima putaran encoding out of fold. Fold yang gelap di-encode dengan tabel yang dibangun dari empat fold lainnya.]]

> Contoh hitungan: bagi 20 pelanggan ke dalam 5 fold berisi 4 orang. Fold 1 berisi satu pelanggan C yang membeli, pelanggan D yang membeli, dan dua pelanggan A, satu di antaranya membeli. Ke-16 pelanggan lainnya mencakup 5 pembeli, sehingga rata-rata keseluruhannya 5 / 16 = 0,31. Dengan m = 4, pelanggan C di-encode dari 2 pelanggan C lain, keduanya pembeli: (2 + 4 × 0,3125) / 6 = 0,54. Pelanggan D tidak punya baris D lain: (0 + 1,25) / 4 = 0,31. Kedua pelanggan A: 8 baris A lain dengan 2 pembeli memberi (2 + 1,25) / 12 = 0,27.

::: deeper Mengapa tidak leave one out saja?
Leave-one-out encoding hanya membuang baris itu sendiri. Kelihatannya aman, tetapi tidak. Pada kode pos A, dengan 10 pelanggan dan 3 pembeli, seorang pembeli di-encode sebagai 2 / 9 = 0,22 dan seorang bukan pembeli sebagai 3 / 9 = 0,33. Dalam satu kode pos, kedua nilai itu membocorkan label tanpa galat sedikit pun, dan model yang dapat memisahkannya akan melakukannya. Fold menghindari hal ini, karena semua baris dalam satu fold memakai satu tabel yang sama.
:::

## Di dalam pipeline
*Di mana encoder diletakkan ketika kamu melakukan cross-validation?*

Imputer atau scaler tidak pernah membaca label. Target encoder membacanya, sehingga ia adalah kasus paling tajam dari "fit hanya pada baris training" di "Pipelines and leakage". Pada setiap putaran cross-validation, bangun encoding fold training dengan cara out of fold, fit tabel pada semua fold training, lalu encode fold validation dengan tabel itu. Tidak ada yang berasal dari fold validation yang masuk ke tabel mana pun.

Bandingkan kolom out of fold dengan kolom naif, yang bernilai 1,00 untuk C maupun D. Pelanggan D yang sendirian kini tidak lagi membawa labelnya sendiri dan mendapat rata-rata keseluruhan. Pada tabel lempar koin, skor out of fold adalah 53,8% pada baris training dan 49,9% pada baris baru: jujur, dan dekat dengan lempar koin. Dengan efek yang nyata, skornya 64,6% berbanding 64,2%.

Frequency encoding pada tabel dengan efek nyata mendapat skor 52,1% pada baris baru, hampir sama dengan lempar koin, karena pada tabel itu seberapa umum sebuah kode pos tidak berhubungan dengan pembelian. Target encoding out of fold mendapat 64,2%. Sebuah fitur harus menunjukkan manfaatnya dalam skor yang dapat kamu percaya.

::: deeper Cara lain untuk memperkecil kategori
Kelompokkan nilai yang jarang ke dalam satu kategori "other": memasukkan 271 kode pos dengan tiga pelanggan atau kurang ke satu wadah menyisakan 141 + 1 = 142 kolom. Atau petakan dulu setiap nilai ke kelompok yang lebih kasar, misalnya kode pos ke wilayah. Hashing adalah pilihan lain: setiap nilai dikirim ke salah satu dari sejumlah kolom yang tetap, sehingga nilai yang tidak berhubungan kadang berbagi satu kolom.
:::

## Apa selanjutnya
*Di mana fitur baru diuji secara jujur?*

Kini kamu punya tiga cara untuk mengubah kolom dengan banyak nilai menjadi satu angka: frequency, naive target encoding, dan target encoding out of fold. Hanya yang terakhir yang berguna sekaligus aman, dan ia menuntut kehati-hatian paling banyak: satu tabel per fold, yang tersimpan di dalam setiap putaran.

Pelajaran terakhir dalam course ini, Feature ablation lab, menambahkan fitur satu per satu dan memeriksa perbaikan mana yang bertahan dalam cross-validation. Itulah ujian yang harus lulus oleh sebuah fitur baru. Bawalah kebiasaan dari pelajaran ini: fitur yang dibuat dari label baru layak dipakai hanya jika skornya dihitung di tempat baris validation tidak pernah menyentuh tabelnya.

::: remember
- One-hot encoding menulis satu kolom per nilai. Untuk ratusan nilai, pakai satu angka per kategori: frekuensi, yang tidak pernah membaca label, atau rata-rata target, yang membacanya.
- Haluskan rata-rata target dengan (n × category mean + m × overall mean) / (n + m), sehingga kategori dengan sedikit baris bersandar pada rata-rata keseluruhan.
- Meng-encode baris dari labelnya sendiri adalah kebocoran. Encode baris training secara out of fold, encode baris baru dari seluruh baris training, dan simpan semuanya di dalam setiap putaran cross-validation.
:::
