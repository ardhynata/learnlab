---
slug: serving-versioning-and-skew
title: Serving, versioning, dan skew
---
::: intro
- Pilih antara inferensi batch dan online berdasarkan latency, freshness, dan biaya, lalu sebutkan apa harga dari setiap pilihan.
- Gambarkan model yang sudah di-deploy sebagai versioned artifact (kode, data snapshot, pengaturan, metrik), dan rilis lewat tahap shadow dan canary dengan rollback yang sudah siap.
- Temukan training-serving skew (kode feature yang berbeda, missing value, satuan, time travel) dengan mencatat feature yang disajikan, membandingkan distribusinya, dan memakai satu fungsi feature bersama.

Sebelum mulai: baca "Reproducible pipelines", "Pipelines and leakage", dan "Covariate and concept shift". Yang pertama memberimu proses yang dapat diulang, yang kedua aturan bahwa sebuah langkah hanya belajar dari baris latih, dan yang ketiga apa yang terjadi ketika data bergeser. Pelajaran ini membawa pipeline yang sudah di-fit keluar dari notebook dan menanyakan apa saja yang dapat salah antara notebook dan sebuah permintaan live.
:::

## Batch atau online
*Apakah jawabannya sudah siap sebelum diminta, atau dihitung saat ada yang menunggu?*

Sampai sekarang, model hanyalah sesuatu yang kamu beri skor pada tabel uji. Model yang sudah di-deploy terus menjawab untuk baris yang belum pernah dilihatnya. Ada dua cara menjalankannya.

**Inferensi batch** memberi skor pada seluruh tabel menurut jadwal. Misalnya setiap malam model membaca semua baris pelanggan dan menulis satu skor per pelanggan ke dalam tabel. Tidak ada yang menunggu, dan aplikasi mencari skornya nanti. **Inferensi online** memberi skor pada satu permintaan saat permintaan itu tiba. Ada yang menunggu, sehingga jawaban harus muat dalam anggaran **latency** (berapa lama satu jawaban boleh memakan waktu), biasanya puluhan sampai beberapa ratus milidetik, dan feature pun harus diambil dalam anggaran itu.

Dua istilah lain ikut menentukan pilihan. **Freshness** adalah seberapa tua informasi di balik sebuah jawaban. **Biaya** adalah yang kamu bayar untuk komputasi dan untuk orang yang menjaganya tetap berjalan.

| | Batch | Online |
| --- | --- | --- |
| Siapa yang menunggu | tidak ada, skor sudah siap sebelum dipakai | seseorang atau program, untuk setiap jawaban |
| Latency | tidak penting per baris | harus muat dalam anggaran, misalnya 100 ms |
| Freshness | setua proses terakhir | sebaru feature yang sempat diambil |
| Biaya | murah per baris, tetapi juga memberi skor pada baris yang tidak pernah diminta | server menyala terus, tetapi hanya baris yang diminta yang diberi skor |
| Jika gagal | jalankan ulang job, skor lama tetap di tabel | permintaan gagal atau jawaban cadangan dipakai |
| Cocok untuk | daftar churn tiap malam, kampanye email, tinjauan kredit | pemeriksaan fraud di kasir, ranking pencarian, filter spam |

> Contoh hitungan: sebuah layanan langganan rekaan punya 500.000 pelanggan, dan sekitar 10.000 di antaranya membuka aplikasi pada hari tertentu. Skoring batch menghasilkan 500.000 prediksi sehari untuk memakai 10.000 di antaranya, yaitu 500.000 / 10.000 = 50 kali lebih banyak dari yang dibutuhkan. Skoring online menghasilkan 10.000, tetapi masing-masing harus kembali dalam 100 ms dari server yang menyala sepanjang hari. Skor batch diperbarui setiap 24 jam, sehingga kalau pelanggan membuka aplikasi pada waktu yang tersebar merata sepanjang hari, skor yang mereka lihat rata-rata berusia 12 jam dan paling tua 24 jam.

[[figure:serving-versioning-and-skew/batch-and-online|Dua cara menyajikan model. Batch menghitung semua skor lebih dulu lalu menyimpannya. Online menghitung satu skor saat permintaan tiba, dalam anggaran latency.]]

## Model sebagai versioned artifact
*Apa sebenarnya yang disebut "model" saat di-deploy?*

Berkas bobot saja tidak cukup. Ketika sebuah skor tampak salah di bulan Maret, kamu perlu tahu apa yang menghasilkannya. Karena itu yang di-deploy adalah **versioned artifact**: pipeline yang sudah di-fit ditambah catatan yang membuatnya dapat direproduksi, diikat oleh satu id versi. Catatan itu sama dengan yang diminta "Reproducible pipelines" untuk kamu simpan. Isinya empat bagian.

- **Kode:** commit yang membangun feature dan pipeline.
- **Data snapshot:** tabel yang mana, berapa baris, dan sidik jari (hash) berkasnya. Ubah satu byte saja dan hash-nya berubah.
- **Pengaturan:** seed, hyperparameter, split, dan versi library.
- **Metrik:** skor held-out pada evaluation set yang diberi nama, di samping sebuah baseline.

**Registry** adalah daftar versi. Setiap barisnya memuat id versi, keempat bagian itu, dan sebuah **stage**: candidate, shadow, canary, live, atau retired.

| Versi | Data snapshot | Pengaturan | Evaluation set | Accuracy held-out | Stage |
| --- | --- | --- | --- | --- | --- |
| v2 | 2026-06-01, 41.000 baris | regresi logistik | test-2026-06 | 88,9% | retired, disimpan |
| v3 | 2026-09-01, 48.000 baris | k-NN, k = 5 | test-2026-06 | 90,7% | live |
| v4 | 2026-10-01, 52.000 baris | k-NN, k = 9 | test-2026-06 | 91,4% | shadow |

Baris-barisnya rekaan, dan ketiga accuracy memakai set bernama yang sama, sehingga dapat dibandingkan. Versi yang pensiun tidak dihapus, karena suatu saat kamu mungkin membutuhkannya kembali.

> Awas: dua accuracy dapat dibandingkan hanya jika diukur pada evaluation set yang sama. Tulis nama set-nya di samping setiap metrik, kalau tidak, tabel itu membandingkan ujian yang berbeda.

## Shadow, canary, dan rollback
*Bagaimana cara menayangkan versi baru tanpa mempertaruhkan semuanya?*

Setiap stage memperlihatkan versi baru kepada sedikit lebih banyak dunia.

- **Shadow.** Versi baru menerima setiap permintaan dan menghitung jawaban, tetapi jawabannya hanya dicatat. Tidak ada pengguna yang melihatnya. Kamu membandingkannya dengan jawaban versi live dan mengamati latency serta kegagalan.
- **Canary.** Sebagian kecil lalu lintas nyata, katakanlah 5%, mendapat jawaban dari versi baru. Jika versi itu buruk, hanya sedikit pengguna yang terkena.
- **Rilis penuh.** Semua lalu lintas ke versi baru, dan versi lama tetap terdaftar.

[[figure:serving-versioning-and-skew/release-path|Jalur rilis versi v4 saat v3 sedang live. Hijau adalah porsi jawaban dari v4 yang dilihat pengguna, dan batang putus-putus adalah v4 yang berjalan tanpa terlihat di shadow.]]

> Contoh hitungan: sebuah layanan menerima 40.000 permintaan sehari. Di shadow, v4 sepakat dengan v3 pada 93% di antaranya, sehingga 7% dari 40.000 = 2.800 permintaan mendapat jawaban berbeda. Label nanti menunjukkan model mana yang benar pada permintaan itu. Di canary, 5% dari 40.000 = 2.000 permintaan masuk ke v4. Kalau 8% permintaan v3 melewati anggaran latency dan 10,5% permintaan v4 melewatinya, itu berarti 210 permintaan lambat, padahal yang diharapkan 160.

**Kesiapan rollback** ditetapkan sebelum peluncuran, bukan saat insiden. Pastikan versi lama masih tersimpan dan dapat dimuat. Pastikan feature yang dibutuhkannya masih dihitung (kolom yang dibuang atau job yang dimatikan dapat membuat rollback mustahil). Buat kembali ke versi lama cukup satu pengaturan, dan cobalah sekali dalam gladi. Lalu tuliskan pemicunya, misalnya "porsi lambat di atas 12% selama 10 menit".

::: deeper Apakah selisih di canary hanya noise?
Ambil 2.000 permintaan canary dan porsi lambat yang diharapkan 8%. Galat baku sebuah porsi adalah sqrt(0,08 x 0,92 / 2000) = 0,0061, atau 0,61 poin. Angka 10,5% yang teramati berada 2,5 poin di atas, yaitu 2,5 / 0,61 = 4,1 galat baku: bukan noise. Dengan hanya 200 permintaan, galat bakunya 1,9 poin dan selisih yang sama menjadi 1,3 galat baku, sehingga kamu tidak dapat membedakannya dari kebetulan. Canary membutuhkan permintaan yang cukup untuk memperlihatkan selisih yang kamu pedulikan, dan porsi 5% dari layanan yang sepi dapat memakan waktu berhari-hari untuk mengumpulkannya.
:::

## Empat sumber skew
*Mengapa model yang lolos pengujian bisa gagal pada permintaan live pertamanya?*

**Training-serving skew** berarti feature yang dilihat model saat melayani dihitung dengan cara yang berbeda dari feature yang dipakai untuk melatihnya. Data mentahnya mungkin sama. Alur pengolahannya yang tidak sama. Ada empat sumber yang lazim.

| Sumber | Saat training | Saat serving |
| --- | --- | --- |
| Kode feature berbeda | langkah di notebook dengan pembulatannya sendiri | salinan tulisan tangan dengan pembulatan lain |
| Missing value | kekosongan diisi median training | kekosongan dikirim sebagai 0 atau dibiarkan kosong |
| Satuan | panjang dalam milimeter | panjang dalam sentimeter |
| Time travel | feature dibangun dari tabel yang memuat kejadian yang datang kemudian | hanya yang diketahui pada saat itu |

Yang terakhir adalah aturan leakage dari "Pipelines and leakage", diterapkan pada waktu. Ambil feature "pembelian bulan ini". Seorang pelanggan membeli pada hari ke-3, 8, dan 12, dan prediksi dibuat pada hari ke-10. Saat live, nilai feature-nya 2. Tabel training yang dibangun di akhir bulan menulis 3, karena menghitung hari ke-12, yang belum terjadi ketika prediksi dibuat. Model belajar dari masa depan yang tidak akan pernah dilihatnya.

[[figure:serving-versioning-and-skew/time-travel|Pembelian seorang pelanggan pada hari ke-3, 8, dan 12. Pada prediksi di hari ke-10, nilai feature-nya 2. Tabel yang dibangun di akhir bulan menghitung 3.]]

::: deeper Membangun feature pada satu saat tertentu
Cara mengatasi time travel adalah point-in-time join. Untuk setiap baris training, ambil hanya kejadian yang cap waktunya sama dengan atau sebelum waktu prediksi baris itu, lalu hitung feature dari kejadian tersebut. Untuk pelanggan di atas, kejadian pada atau sebelum hari ke-10 adalah hari ke-3 dan 8, sehingga feature-nya 2, sama seperti saat live. Simpan waktu prediksi sebagai kolom di tabel training, agar pemeriksaannya dapat diulang.
:::

## Skew yang bisa diukur
*Seberapa besar kerusakan akibat satu kesalahan satuan?*

Pakai model satu baris pada 342 penguin yang panjang siripnya tercatat: sebut seekor penguin Gentoo jika panjang siripnya 207 mm atau lebih. Aturan itu benar untuk 334 dari 342, atau 97,7%. Dari 8 kesalahannya, 7 adalah penguin Adelie atau Chinstrap dengan sirip 207 mm atau lebih panjang, dan 1 adalah Gentoo di bawahnya.

Sekarang layanan menerima panjang sirip dalam sentimeter dari sistem lain. Penguin dengan sirip 201 mm datang sebagai 20,1. Semua nilai jauh di bawah 207, sehingga aturan itu selalu menjawab "bukan Gentoo". Aturan itu benar hanya untuk 219 penguin yang bukan Gentoo: 219 / 342 = 64,0%. Accuracy turun 33,6 poin, dan tidak ada yang crash, karena 20,1 adalah angka yang sepenuhnya sah.

[[figure:serving-versioning-and-skew/unit-skew|Aturan yang sama sebelum dan sesudah kesalahan satuan. Training melihat panjang sirip 172 sampai 231 mm, sedangkan service melihat 17,2 sampai 23,1, jauh di kiri garis 207.]]

Missing value merusak model dengan cara diam-diam yang sama. Jika massa tubuh punya rata-rata 4.201,75 g dan simpangan baku 801,95 g, kekosongan yang diisi service dengan 0 menjadi (0 - 4.201,75) / 801,95 = -5,24 setelah scaling: seekor penguin yang 5,24 simpangan baku lebih ringan dari rata-rata, tidak seperti baris training mana pun.

> Awas: model yang mengalami skew tetap menjawab, dengan angka yang berada dalam rentang normal. Tidak ada pesan galat yang memberi tahu ada yang salah; hanya memeriksa input-nya yang dapat menunjukkannya.

## Menangkap skew
*Bagaimana menemukan skew sebelum pengguna menemukannya?*

Tiga kebiasaan dapat menemukannya, dan yang ketiga mencegahnya.

1. **Catat feature yang disajikan.** Bersama setiap prediksi, simpan id versi, waktu, dan baris feature yang benar-benar diterima model, bukan hanya input mentahnya. Label yang tiba kemudian dapat digabungkan ke catatan itu.
2. **Bandingkan distribusi.** Untuk setiap feature, letakkan log yang disajikan di samping data training: rata-rata dalam satuan simpangan baku training, porsi yang kosong, nilai minimum dan maksimum, atau population stability index dari "Covariate and concept shift". Pada kasus salah satuan tadi, rata-rata training 200,9 mm dengan simpangan baku 14,06, dan rata-rata di log 20,09. Selisihnya (200,9 - 20,09) / 14,06 = 12,9 simpangan baku, alarm pada hari pertama. Porsi yang kosong juga dapat diperiksa: 2 dari 344 baris, 0,6%, saat training.
3. **Pakai satu fungsi feature bersama.** Tulis kode feature sekali saja dan impor di kedua tempat. Lebih baik lagi, sertakan pipeline yang sudah di-fit dari "Reproducible pipelines" di dalam versi, sehingga service memakai langkah yang sama dengan angka beku yang sama. Tambahkan parity test: kirim baris mentah yang sama lewat jalur training dan jalur serving, lalu syaratkan feature yang sama sampai toleransi yang sangat kecil.

> Gagasan kunci: skew adalah bug, drift adalah dunia. Pada skew, baris mentah yang sama menghasilkan feature berbeda di training dan di service, sejak permintaan pertama. Pada drift, kodenya sama tetapi barisnya berbeda. Replay dapat membedakannya: jalankan baris lama lewat jalur live. Jika feature-nya berbeda dari training, itu skew. Jika cocok, dan baris hari ini tetap tampak berbeda, itu drift.

## Feature freshness
*Seberapa tua sebuah feature saat dibaca model?*

**Usia** sebuah feature adalah selang waktu antara saat nilainya dihitung dan saat model membacanya. Sebuah feature dapat mengalami skew pada usianya, meskipun kode dan satuannya benar.

| Feature | Cara diperbarui | Usia terburuk saat serving |
| --- | --- | --- |
| Negara pada akun | saat pelanggan mengubahnya | berhari-hari, dan itu tidak masalah |
| Pesanan dalam 7 hari terakhir | job malam pukul 02:00 | 24 jam |
| Isi keranjang | live dari aplikasi | beberapa detik |

> Contoh hitungan: seorang pelanggan memesan pukul 14:00, sehingga hitungan pesanan dalam 7 hari terakhir naik dari 1 menjadi 2. Tabel malam dihitung pukul 02:00 dan masih menulis 1. Permintaan pukul 20:00 membaca nilai yang berusia 18 jam dan ketinggalan satu pesanan. Jika training membangun feature ini tepat pada saat prediksi, dengan usia 0, service mengalami skew pada freshness, sama seperti pada satuan.

Ada dua perbaikan. Perbarui feature lebih sering, yang membutuhkan job streaming dan pencarian di dalam anggaran latency. Atau latih dengan usia yang sama: bangun setiap feature training seperti yang akan dimiliki job malam itu. Pilihannya bergantung pada seberapa cepat feature itu berubah dan seberapa besar model bersandar padanya. Putuskan juga apa yang terjadi bila feature live terlambat atau mati. Ia sebaiknya tiba sebagai missing value, ditangani seperti cara training menanganinya.

## Menuju Monitoring lab
*Apa yang kamu bawa ke bagian course berikutnya?*

Pelajaran ini membahas cara memulai dengan baik: memilih cara menyajikan model, mengetahui versi mana yang live, merilisnya bertahap, dan memeriksa bahwa yang dilihat model sama dengan yang dipelajarinya. Pelajaran berikutnya, tentang drift, alert, dan rollback, membahas apa yang datang sesudahnya, ketika data bergeser, label tiba terlambat, dan sebuah alert menyala. Keputusan apakah akan rollback, recalibrate (lihat "Calibration and costs"), atau retrain adalah saat kebiasaan dari pelajaran ini berguna.

Di Monitoring lab kamu memutar ulang aliran permintaan inferensi, menyelidiki sebuah alert performa, lalu membuat keputusan itu. Bawalah tiga pertanyaan. Versi mana yang melayani permintaan ini? Feature apa yang dilihatnya? Apakah itu sama dengan yang dilihat training (skew), atau dunia yang sudah berubah (drift)? Rollback yang cukup satu saklar membuat keputusan itu murah. Rollback yang membutuhkan build ulang membuatnya menjadi pertaruhan.

::: remember
- Batch dihitung lebih dulu, murah per baris, dan setua proses terakhirnya. Online menjawab satu permintaan dalam anggaran latency dan sebaru feature-nya. Pilih berdasarkan siapa yang menunggu dan seberapa tua sebuah jawaban boleh.
- Model yang di-deploy adalah versioned artifact dalam registry: kode, data snapshot, pengaturan, dan metrik. Rilis lewat shadow dan canary, dengan rollback yang sudah siap sebelum peluncuran.
- Skew berasal dari kode feature, missing value, satuan, time travel, dan feature yang basi. Catat feature yang disajikan, bandingkan dengan training, dan pakai satu fungsi feature bersama.
:::
