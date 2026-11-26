---
slug: conformal-prediction
title: Conformal prediction
---
::: intro
- Bangun prediction interval dengan split conformal prediction: sisihkan calibration set, hitung residual absolut, lalu tambah dan kurangkan salah satunya.
- Hitung rank kuantil ceil((n + 1)(1 - α)) dengan tangan pada 9 residual kalibrasi, dan sebutkan coverage yang dijanjikannya.
- Jelaskan kapan janji itu gugur, dan bagaimana lebar interval ditukar dengan coverage.

Sebelum mulai: baca "Ketidakpastian aleatoric dan epistemic" dan "Train, validation, dan test".
:::

## Dari satu angka ke sebuah interval
*Apa yang ditambahkan interval pada angka prediksi?*

Pelajaran sebelumnya memisahkan ketidakpastian yang dapat menyusut dengan tambahan data dari noise yang tidak dapat dihilangkan model mana pun. Pelajaran ini bertanya: apa yang tetap dapat dijanjikan model tentang satu prediksi?

Model regresi mengeluarkan satu angka, misalnya 4.161 g untuk seekor penguin. Angka itu hampir tidak pernah tepat, dan ia tidak memberi tahu seberapa jauh ia dapat meleset. **Prediction interval** adalah sebuah rentang, misalnya 3.743 g sampai 4.579 g, yang dimaksudkan memuat nilai sebenarnya.

Kamu memilih α (alpha), yaitu porsi interval yang boleh salah. Dengan α = 0,2 kamu meminta interval 80%, dan dengan α = 0,1 interval 90%. **Coverage** adalah porsi kasus baru yang nilai sebenarnya jatuh di dalam intervalnya. Inilah yang kamu periksa setelahnya.

**Conformal prediction** adalah resep yang membungkus model apa pun, baik garis lurus, forest, maupun jaringan saraf, dan mengubah prediksinya menjadi interval dengan janji coverage. Ia tidak mengandaikan bentuk galat tertentu. Yang ia butuhkan hanya data yang disisihkan dan satu syarat, yang dinamai beberapa bagian lagi di bawah.

## Resep split conformal
*Data mana yang dipakai di setiap langkah?*

**Split conformal prediction** membagi data berlabel menjadi tiga bagian dan bekerja dalam tiga langkah.

1. **Latih.** Latih model pada training set, seperti biasa.
2. **Kalibrasi.** Prediksi **calibration set**, yaitu kasus yang belum pernah dilihat model, dan catat **residual absolut** |y - ŷ| setiap kasus. Misalkan jumlah kasus kalibrasi n. Urutkan n residual itu dari yang terkecil.
3. **Ambil kuantil.** Pilih residual terkecil ke-k, dengan k = ceil((n + 1)(1 - α)), lalu namai q. Bagian berikutnya menjelaskan rank ini.

Untuk kasus baru, prediksi ŷ dan laporkan interval dari ŷ - q sampai ŷ + q.

[[figure:conformal-prediction/recipe|Resep split conformal: latih pada training set, ukur residual pada calibration set, lalu tambah dan kurangkan kuantil q.]]

> Awas: residual harus berasal dari kasus yang tidak dipakai untuk melatih model. Model biasanya mencocokkan kasus latihnya sendiri lebih baik daripada kasus baru, sehingga residual latih terlalu kecil dan intervalnya terlalu sempit.

Harganya adalah kasus kalibrasi tidak dipakai untuk melatih. Keuntungannya, tidak ada model yang dilatih ulang dan tidak ada yang lain yang berubah.

## Contoh hitungan pada penguin
*Dapatkah kamu menyusun interval 80% dengan pensil?*

Sebuah garis lurus dilatih pada 333 penguin untuk memprediksi massa tubuh dari panjang sirip. Sembilan penguin lain dari tabel bawaan disisihkan sebagai calibration set. Residual absolut mereka, dalam gram, diurutkan dari yang terkecil:

| Rank k | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Residual (g) | 72 | 129 | 209 | 268 | 355 | 365 | 369 | 418 | 498 |

> Contoh hitungan: minta 80%, sehingga α = 0,2, dengan n = 9. Maka (n + 1)(1 - α) = 10 × 0,8 = 8, dan ceil(8) = 8. Karena itu q adalah residual terkecil ke-8, yaitu 418 g. Seekor penguin baru dengan sirip 200 mm mendapat ŷ = 4.161 g, dan intervalnya berjalan dari 4.161 - 418 = 3.743 g sampai 4.161 + 418 = 4.579 g. Lebarnya 836 g.

[[figure:conformal-prediction/calibration-residuals|Sembilan residual kalibrasi yang sudah diurutkan, dengan q pada rank 8, dan interval yang dihasilkannya untuk penguin yang diprediksi 4.161 g.]]

Tidak ada langkah di atas yang melihat bagian dalam model. Model apa pun yang mengeluarkan angka dapat menggantikan garis lurus itu.

::: deeper Bagaimana kesembilan penguin dipilih
Ambil 342 penguin di tabel bawaan yang memiliki semua pengukuran. Calibration set-nya adalah penguin ke-4, 42, 80, 118, 156, 194, 232, 270, dan 308 di antara mereka, dan garisnya dilatih pada 333 sisanya. Pilihan sembilan penguin yang lain akan memberi residual dan q yang lain. Goyangan itulah yang dibahas di bagian jaminan di bawah.
:::

## Mengapa rank dibulatkan ke atas
*Mengapa ceil((n + 1)(1 - α)), dan bukan sekadar 80% dari residual?*

Janjinya bertumpu pada **exchangeability**: kasus kalibrasi dan kasus baru berperilaku seolah ditarik dengan cara yang sama, sehingga mengacak urutannya tidak mengubah apa pun. Tarikan independen dari satu sumber memenuhi syarat ini.

Dengan syarat itu, residual kasus baru sama mungkinnya menempati salah satu dari 10 rank di antara 9 residual kalibrasi ditambah dirinya sendiri. Ia jatuh di bawah atau tepat pada residual kalibrasi ke-k dalam k dari 10 posisi itu, sehingga peluang tercakupnya adalah k / (n + 1). Untuk k = 8 hasilnya 8/10 = 0,8, persis 80% yang kita minta.

[[figure:conformal-prediction/rank-slots|Residual baru jatuh ke salah satu dari 10 slot yang sama mungkinnya. Memilih rank k sebagai q mencakup k slot.]]

Agar mendapat setidaknya 1 - α, kita butuh k / (n + 1) ≥ 1 - α, dan bilangan bulat k terkecil yang memenuhinya adalah ceil((n + 1)(1 - α)). Sebagai tingkat kuantil, itu ceil((n + 1)(1 - α)) / n.

> Gagasan kunci: "+ 1" menghitung kasus baru itu sendiri. Tanpanya interval menjadi terlalu sempit. Dengan n = 10 dan α = 0,1, residual ke-9 (90% dari 10) hanya mencakup 9/11 = 82%, sedangkan residual ke-10 yang sudah dikoreksi mencakup 10/11 = 91%.

## Ketika rank tidak ada
*Bagaimana jika kasus kalibrasinya terlalu sedikit?*

Rank k tidak boleh lebih besar dari n. Jika ceil((n + 1)(1 - α)) lebih besar dari n, tidak ada residual kalibrasi yang cukup besar, dan satu-satunya interval yang aman adalah seluruh garis bilangan.

Ambil sembilan residual yang sama dan α = 0,05. Maka 10 × 0,95 = 9,5, dan ceil(9,5) = 10, lebih besar dari 9. Sembilan kasus tidak cukup untuk menopang janji 95%. Secara umum, kamu butuh n ≥ 1/α - 1 kasus kalibrasi, yaitu 19 untuk 95%, dan 99 untuk 99%.

> Contoh hitungan: dengan α = 0,1, rank-nya ceil(10 × 0,9) = 9, yaitu yang terbesar dari sembilan residual, 498 g. Interval untuk penguin yang sama adalah 4.161 - 498 = 3.663 g sampai 4.161 + 498 = 4.659 g, selebar 996 g.

::: deeper Nilai yang sama dan batas atas
Jika tidak ada dua residual yang sama, coverage rata-ratanya setidaknya 1 - α dan paling banyak 1 - α + 1/(n + 1). Dengan n = 9 dan α = 0,2, nilainya antara 0,8 dan 0,9, dan di sini persis 0,8 karena k / (n + 1) = 8/10. Residual yang sama hanya dapat menaikkan coverage, tidak pernah menurunkannya di bawah 1 - α.
:::

## Apa yang dijamin
*Apa persisnya yang dijanjikan, dan apa yang tidak?*

**Janjinya.** Jika kasus kalibrasi dan kasus baru exchangeable, interval memuat nilai sebenarnya dengan probabilitas setidaknya 1 - α. Janji ini berlaku untuk model apa pun, bahkan model yang buruk, untuk bentuk galat apa pun, dan untuk n berapa pun. Karena itulah ia disebut **distribution-free** dan **finite-sample**.

**Yang tidak dikatakannya.**

- **Janji ini berupa rata-rata, bukan jaminan untuk satu kelompok.** Angka 80% berlaku di seluruh kasus. Penguin yang berat atau satu pulau dapat tercakup jauh lebih jarang.
- **Janji ini berupa rata-rata atas calibration set.** Satu set berisi 9 kasus dapat menghasilkan coverage jauh di atas atau di bawah 80%, biasanya meleset sekitar 12 poin (satu simpangan baku). Dengan 99 kasus kalibrasi, goyangan yang sama menyusut menjadi sekitar 4 poin.
- **Model yang lemah tidak disembunyikan.** Model yang buruk tidak kehilangan coverage. Ia mendapat interval yang lebar, karena residual kalibrasinya besar.

> Gagasan kunci: conformal prediction menjanjikan coverage, bukan ketajaman. Seberapa sempit intervalnya bergantung pada seberapa baik modelnya.

## Ketika coverage gagal
*Apa yang terjadi jika kasus baru tidak mirip dengan kasus kalibrasi?*

Janji ini butuh exchangeability, dan data nyata merusaknya dengan beberapa cara yang umum.

- **Shift.** Jika input berubah (covariate shift) atau hubungan antara input dan target berubah (concept shift), residual baru dapat lebih besar daripada residual kalibrasi. Course "Evaluasi lanjutan dan shift" membahas keduanya.
- **Entitas berulang.** Jika pasien atau penguin yang sama muncul di calibration dan test, residual mereka mirip, bukan independen.
- **Waktu.** Jika data kalibrasi lebih tua daripada kasus yang kamu prediksi, drift dapat membuat galat baru lebih besar.

[[figure:conformal-prediction/shift|Coverage interval 90% ketika galat baru lebih besar daripada galat kalibrasi, dengan asumsi galat Gaussian.]]

Jika galat baru 1,5 kali lebih besar, interval 90% hanya mencakup sekitar 73%. Pada 2 kali, ia mencakup sekitar 59%.

Yang dapat dilakukan: bagi data kalibrasi dengan cara yang sama seperti kamu akan menjalankannya, seperti di "Split berkelompok dan split temporal"; terus periksa coverage pada kasus berlabel yang terbaru; dan kalibrasi ulang ketika coverage turun. Weighted conformal prediction melangkah lebih jauh dan memberi bobot ulang pada kasus kalibrasi ketika hanya input yang bergeser, jika kamu dapat memperkirakan bobotnya.

## Lebar melawan coverage
*Berapa harga setiap tambahan coverage?*

Coverage yang lebih tinggi butuh rank yang lebih besar, sehingga q yang lebih besar. Untuk sembilan residual penguin dan sirip 200 mm:

| Tingkat yang diminta | α | Rank k | q (g) | Interval (g) |
| --- | --- | --- | --- | --- |
| 50% | 0,5 | 5 | 355 | 3.806 sampai 4.516 |
| 80% | 0,2 | 8 | 418 | 3.743 sampai 4.579 |
| 90% | 0,1 | 9 | 498 | 3.663 sampai 4.659 |
| 95% | 0,05 | 10 | tidak ada | seluruh garis |

Dari 80% ke 90%, interval menjadi sekitar 19% lebih lebar. Menuju 95% sama sekali tidak mungkin dengan sembilan kasus. Lebih banyak kasus kalibrasi memberi anak tangga yang lebih halus.

## Interval adaptive
*Dapatkah lebarnya mengikuti sulit-tidaknya setiap kasus?*

±q yang tetap memberi semua kasus lebar yang sama, padahal sebagian kasus lebih mudah. Interval **adaptive** memperbaikinya. Pada conformal prediction **ternormalisasi** (locally weighted), model kedua memperkirakan sebaran σ̂(x) di setiap input, dan intervalnya ŷ ± q × σ̂(x). **Conformalized quantile regression** berangkat dari model yang memprediksi kuantil bawah dan atas, lalu mengalibrasi pita itu. Keduanya mempertahankan janji coverage rata-rata.

Pada pelajaran berikutnya, "Interval lab", kamu menyusun prediction interval dan mengukur coverage empirisnya saat distribusi data berubah.

::: remember
- Split conformal prediction: latih pada training set, ambil residual absolut pada calibration set, dan laporkan ŷ ± q, dengan q residual terkecil ke-k dan k = ceil((n + 1)(1 - α)).
- Jika kasus kalibrasi dan kasus baru exchangeable, coverage setidaknya 1 - α untuk model apa pun, sebagai rata-rata dan bukan untuk setiap kelompok. "+ 1" menghitung kasus baru itu sendiri.
- Shift, entitas berulang, dan urutan waktu merusak exchangeability, dan coverage turun. Coverage yang lebih tinggi menuntut interval yang lebih lebar, dan interval adaptive membiarkan lebarnya mengikuti kesulitan.
:::
