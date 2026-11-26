---
slug: reproducible-pipelines
title: Pipeline yang reproducible
---
::: intro
- Letakkan imputer, encoder, scaler, selector, dan model dalam satu pipeline, lalu fit semuanya hanya pada fold latih, dan ulangi lagi di setiap putaran.
- Tetapkan seed, catat pengaturannya, dan laporkan tabel hasil yang dapat dijalankan ulang oleh reviewer dengan angka yang sama.
- Kenali cara-cara diam-diam pipeline bocor, dan tanyakan pada setiap langkah apa yang dipelajarinya, dari baris yang mana.

Sebelum mulai: baca "Pipelines and leakage", "Cross-validation and stratification", dan "Defending an evaluation". Yang pertama memberimu aturannya (belajar hanya dari baris latih), yang kedua memberimu fold, dan yang ketiga cara membela sebuah split. Pelajaran ini menjaga agar aturan itu tetap berlaku di setiap fold, dan membuat prosesnya dapat diulang.
:::

## Satu pipeline, di-fit di setiap putaran
*Apa yang berubah ketika pipeline berjalan di dalam cross-validation?*

"Pipelines and leakage" memberi satu aturan: apa pun yang dipelajari dari data harus dipelajari hanya dari baris latih. Dengan satu split, aturan itu mudah dijaga. Cross-validation punya k putaran, dan tiap putaran punya baris latihnya sendiri. Langkah yang di-fit sekali saja, sebelum fold dibuat, sudah melihat setiap fold uji.

Karena itu seluruh pipeline di-fit ulang di setiap putaran. Ada lima jenis langkah yang dapat berada di dalamnya, dan masing-masing mempelajari sesuatu: **imputer** mempelajari median, **encoder** daftar kategori, **scaler** rata-rata dan simpangan baku, **selector** kolom mana yang dipertahankan (ia membaca label), dan **model** bobotnya.

Dalam satu putaran, pipeline di-fit pada fold latih. Fold uji lalu melewati langkah-langkah yang sama dengan angka yang sudah dibekukan, dan jawaban model diberi skor. Putaran berikutnya mulai dari nol. Pipeline yang akhirnya kamu simpan di-fit sekali lagi pada seluruh baris latih.

[[figure:reproducible-pipelines/pipeline-in-folds|Satu putaran cross-validation 5 fold. Atas: lima langkah yang di-fit pada fold latih. Bawah: fold uji melewati langkah yang sama dengan angka yang dibekukan itu, lalu diberi skor.]]

> Gagasan kunci: satu putaran adalah satu kali menjalankan resep secara utuh: fit pada fold latih, terapkan ke fold uji, beri skor. Tidak ada yang dipelajari di satu putaran dibawa ke putaran berikutnya.

## Tiga putaran pada enam penguin
*Seberapa besar bagian latih sebuah putaran mengubah apa yang dipelajari sebuah langkah?*

Ambil enam baris pertama tabel penguin beserta massa tubuhnya dalam gram: 3.750, 3.800, 3.250, satu kekosongan, 3.450, dan 3.650. Bagi menjadi 3 fold berisi dua baris. Setiap putaran men-fit imputer (median) dan scaler (rata-rata dan simpangan baku, dihitung setelah kekosongan diisi) pada empat penguin latih.

| Putaran | Fold uji | Massa latih (g) | Median imputer | Rata-rata scaler | Sd scaler |
| --- | --- | --- | --- | --- | --- |
| 1 | penguin 1, 2 | 3.250, kosong, 3.450, 3.650 | 3.450 | 3.450 | 141,42 |
| 2 | penguin 3, 4 | 3.750, 3.800, 3.450, 3.650 | 3.700 | 3.662,5 | 134,05 |
| 3 | penguin 5, 6 | 3.750, 3.800, 3.250, kosong | 3.750 | 3.637,5 | 224,65 |

> Contoh hitungan: putaran 2 menjadikan penguin 3 (3.250 g) sebagai fold uji. Rata-rata latihnya 3.662,5, dan selisih dari rata-rata itu adalah 87,5, 137,5, -212,5, dan -12,5. Kuadratnya berjumlah 71.875, dibagi 4 menjadi 17.968,75, dan akarnya 134,05. Jadi z = (3.250 - 3.662,5) / 134,05 = -3,08. Kalau scaler di-fit sebelum split pada keenam penguin (kekosongan diisi dengan median mereka, 3.650), rata-ratanya 3.591,67, sd-nya 188,01, dan z = -1,82.

[[figure:reproducible-pipelines/fold-statistics|Keenam penguin pada tiap putaran: penguin latih dan penguin uji pada sumbu massa, rata-rata scaler putaran itu, dan rata-rata keenamnya sebagai garis putus-putus. Kekosongan milik penguin 4 tidak digambar.]]

Penguin yang sama mendapat dua penggaris berbeda, dan pada penggaris yang bocor, penguin itu ikut membentuk penggarisnya sendiri. Dengan 333 baris selisihnya jauh lebih kecil, tetapi langkah-langkah dalam pipeline tetap saja berbeda dari putaran ke putaran.

## Seed tetap, pengaturan tercatat
*Apa yang harus kamu tulis agar proses yang sama dapat terjadi lagi?*

Sebuah proses membuat pilihan acak: baris mana masuk fold mana, bobot awal sebagian model, sebuah pengacakan. **Seed** adalah angka yang mengunci sebuah pembangkit acak, sehingga ia menghasilkan angka yang sama setiap kali. Tetapkan setiap seed dan tuliskan, maka fold dan skor akan kembali sama.

Seed bukan alat untuk memilih angka yang enak dilihat. Pilih seed sebelum kamu melihat skor apa pun. Setelah itu, jalankan ulang dengan beberapa seed untuk melihat seberapa jauh skor bergantung padanya.

Berikut hasilnya untuk 333 penguin yang jenis kelaminnya (kolom sex) tercatat, memprediksi sex dari empat ukuran, dengan cross-validation 5 fold bertingkat dan sepuluh seed. Skor rata-rata k-NN dengan k = 5 berkisar dari 90,1% sampai 91,9%, dan regresi logistik dari 88,6% sampai 89,5%. k-NN unggul pada kesepuluh seed, sebesar 1,5 sampai 3,3 poin, sehingga selisih dua poin bertahan ketika seed diganti. Selisih setengah poin tidak.

[[figure:reproducible-pipelines/seed-spread|Akurasi rata-rata 5 fold untuk sepuluh seed pengacakan fold, untuk dua model pada 333 penguin yang sama.]]

> Awas: seed hanyalah salah satu dari pengaturan. File data, baris yang kamu buang, pengaturan setiap langkah, metrik, dan versi library juga termasuk dalam catatan.

## Tabel hasil
*Apa yang harus ada dalam tabel hasil?*

Pengaturan masuk ke sebuah catatan, dan skor masuk ke sebuah tabel. Berikut tabel untuk seed 42, dengan lima fold yang sama untuk setiap model, dan setiap baris adalah pipeline dengan scaler yang di-fit di dalam tiap putaran.

| Model | Fold 1 | Fold 2 | Fold 3 | Fold 4 | Fold 5 | Rata-rata | Sd |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Selalu menebak male (baseline) | 50,7 | 50,7 | 50,7 | 50,0 | 50,0 | 50,4 | 0,4 |
| Regresi logistik | 91,0 | 95,5 | 88,1 | 81,8 | 87,9 | 88,9 | 5,0 |
| k-NN, k = 5 | 91,0 | 88,1 | 91,0 | 89,4 | 93,9 | 90,7 | 2,2 |

Sd di sini adalah simpangan baku dari kelima skor fold, dibagi 4 (n - 1).

```
data      penguins.csv, 344 rows; 333 with sex and all four measurements
task      predict sex (male = 1) from bill length, bill depth, flipper length, body mass
folds     5-fold, stratified by sex, seed 42
pipeline  scaler fitted on the training folds -> model
metric    accuracy, in percent
```

Bacalah dari bawah ke atas. Baris baseline menunjukkan apa yang didapat dari menebak, yaitu 50,4. Kedua model jauh di atasnya. k-NN unggul 1,8 poin atas regresi logistik, di 3 dari 5 fold, seri di satu fold, dan kalah di satu fold. Itu baru petunjuk. Sepuluh seed di atas adalah bukti yang lebih kuat. Tampilkan setiap model yang kamu coba, termasuk yang kalah: makin banyak yang kamu coba, makin besar bagian keberuntungan pada baris terbaik.

## Apa yang harus dapat dijalankan ulang oleh reviewer
*Apa yang dapat diperiksa orang asing tanpa bertanya apa pun kepadamu?*

Seorang reviewer harus dapat mengambil folder-mu dan melakukan empat hal tanpa satu pertanyaan pun kepadamu.

1. **Memulai dari data mentah**, dengan nama file dan jumlah barisnya tertulis.
2. **Menjalankan satu perintah** yang membawa dari file itu sampai tabel hasil, tanpa langkah manual di tengah, misalnya sel yang diedit di spreadsheet.
3. **Mendapat tabel yang sama**, sampai ke angka terakhir, karena setiap seed terkunci dan catatan pengaturan memuat semua hal lainnya.
4. **Membaca setiap langkah** dan melihat apa yang dipelajarinya serta dari baris yang mana.

Uji ini sendiri sebelum orang lain melakukannya: jalankan semuanya dua kali lalu bandingkan tabelnya, kemudian jalankan di salinan folder yang bersih dengan file cache dihapus. Kalau kedua tabel berbeda, ada yang kurang dalam catatan: sebuah seed, versi data, atau langkah yang kamu kerjakan dengan tangan.

> Gagasan kunci: tabel yang tidak dapat kamu hasilkan ulang hanyalah klaim. Tabel yang kembali dari satu perintah, dengan pengaturannya di sampingnya, adalah hasil.

## Cara pipeline bocor secara diam-diam
*Kesalahan apa yang tidak memunculkan error namun tetap menggelembungkan skor?*

"Pipelines and leakage" menyebut tiga pintu. Cross-validation menambah beberapa lagi, dan tidak satu pun menghentikan prosesnya.

- **Langkah yang di-fit di luar loop.** Imputer, scaler, encoder, atau selector melihat semua baris sebelum fold dimulai. Target encoding melakukan hal yang sama dengan label.
- **Resampling sebelum split.** Salinan kelas langka yang dibuat lebih dulu menaruh baris yang sama di fold latih dan di fold uji.
- **Entitas berulang atau waktu.** Pelanggan yang sama, atau tanggal yang lebih baru, berada di kedua sisi. "Grouped and temporal splits" menunjukkan cara memisahkannya.
- **Tuning pada skor yang dilaporkan.** Coba 20 pengaturan lalu kutip skor fold terbaik, dan yang kamu kutip adalah yang paling beruntung.
- **Test set yang dipakai dua kali.** Begitu kamu mengubah sesuatu setelah melihatnya, ia sudah menjadi validation set.

> Awas: kebocoran tidak memunculkan error. Ia menaikkan skor, dan skor yang bagus adalah yang tidak pernah diaudit. Pada setiap langkah tanyakan: apa yang dipelajarinya, dari baris yang mana, dan apakah ia membaca label?

::: deeper Bagaimana 20 percobaan menggelembungkan skor
Misalkan sebuah model benar 88% dari waktu dan kamu menilainya pada hold-out 50 baris. Peluang benar 47 atau lebih dari 50 (94% atau lebih) adalah jumlah empat suku binomial, 0,0833 + 0,0382 + 0,0114 + 0,0017, yaitu 0,1345. Model dengan akurasi sebenarnya 88% karena itu menunjukkan 94% sekitar satu kali dari delapan percobaan. Kalau 20 percobaan yang saling bebas masing-masing punya peluang itu, peluang tidak satu pun mencapai 94% adalah (1 - 0,1345)^20 = 0,0556, sehingga setidaknya satu mencapainya dengan peluang 0,9444. Percobaan itu sebenarnya saling berkorelasi (memakai baris yang sama), jadi angka sebenarnya lebih rendah, tetapi arahnya tetap: lakukan tuning di dalam bagian latih, dan kutip skor yang tidak kamu tuning.
:::

::: deeper Seed sama, hasil berbeda
Seed mengunci hasil pengambilan acak pada satu versi dari satu library. Versi lain dapat mengambil dalam urutan lain, mengubah nilai default, atau menjumlahkan angka dalam urutan lain, sehingga skor bergeser di digit terakhir. Karena itu catatan menyebut versi, bukan hanya seed. Model tanpa langkah acak, seperti k-NN dengan seri yang diputus oleh aturan tetap, tidak butuh seed, tetapi tuliskan juga hal itu.
:::

## Menuju proyek capstone
*Apa yang akan kamu bangun dengan ini?*

Pelajaran berikutnya, "Intermediate capstone project", meminta sebuah classifier yang sensitif terhadap biaya pada data dengan entitas berulang atau timestamp. Kamu akan membela split seperti di "Defending an evaluation", membandingkan model dalam tabel hasil seperti di atas, dan melaporkan seberapa pasti skor pada data uji itu.

Mulailah proyek dengan kebiasaan dari pelajaran ini. Tulis catatan pengaturan lebih dulu. Letakkan setiap langkah yang belajar di dalam satu pipeline. Tetapkan seed sebelum kamu melihat skor. Jalankan semuanya sekali, lalu jalankan lagi dari folder yang bersih dan periksa bahwa tabelnya sama. Setelah itu nilai hasil kerjamu sendiri berdasarkan poin-poin di atas.

::: remember
- Pipeline memuat setiap langkah yang belajar, selector termasuk, dan di-fit hanya pada fold latih, lagi di setiap putaran.
- Tetapkan seed sebelum melihat skor, catat data, split, langkah, metrik, dan versi, lalu laporkan tabel berisi skor tiap fold, rata-rata, sebaran, dan sebuah baseline.
- Seorang reviewer harus dapat menjalankannya ulang dari data mentah dengan satu perintah. Kebocoran tidak memunculkan error: tanyakan pada setiap langkah apa yang dipelajarinya, dari baris yang mana.
:::
