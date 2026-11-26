---
slug: drift-alerts-and-rollback
title: Drift, alert, dan rollback
---
::: intro
- Sebutkan empat lapisan yang dipantau pada model yang sudah berjalan (inputs, predictions, outcomes, dan operations) dan jelaskan seberapa cepat masing-masing dapat menunjukkan masalah.
- Jelaskan mengapa alert accuracy datang terlambat ketika label tertunda, dan pakai sinyal proxy untuk melihat masalah lebih awal.
- Rancang alert dengan threshold, window, dan aturan, hitung alert PSI dengan tangan, lalu pilih antara roll back, recalibrate, dan retrain.

Sebelum mulai: baca "Serving, versioning, dan skew" dan "Covariate shift dan concept shift". Pelajaran pertama menunjukkan bagaimana model sampai ke production dan apa yang dapat salah saat serving. Pelajaran kedua menamai tiga jenis shift dan memperkenalkan population stability index (PSI). Pelajaran ini membahas apa yang dilakukan ketika data bergeser dan model sudah berjalan.
:::

## Apa yang dipantau
*Apa yang perlu kamu ukur pada model yang sudah berjalan?*

Model yang sudah di-deploy gagal secara diam-diam. Ia terus memberi jawaban dan tidak ada yang crash, padahal jawabannya perlahan memburuk. **Monitoring** adalah cara kamu menyadarinya, dan ia bekerja pada empat lapisan.

| Lapisan | Contoh sinyal | Menunjukkan masalah dalam | Terlewat |
| --- | --- | --- | --- |
| Operations | tingkat galat, latensi, porsi nilai kosong | hitungan menit | model yang cepat tetapi salah |
| Inputs | porsi baris per bin, kategori baru, PSI | hitungan hari | hubungan yang berubah |
| Predictions | porsi yang ditandai, sebaran skor | hitungan hari | perubahan yang tidak menggeser skor |
| Outcomes | accuracy, precision, calibration | hitungan minggu | tidak ada, tetapi datang paling akhir |

Satu contoh rekaan dipakai sepanjang pelajaran. Sebuah model perusahaan membaca setiap invoice saat dikirim dan memprediksi apakah invoice itu akan dibayar terlambat, yaitu lebih dari 30 hari setelah dikirim. Perusahaan mengirim 500 invoice per hari, dan model benar pada 85% invoice held-out. Apakah sebuah invoice benar-benar dibayar terlambat baru diketahui 30 hari setelah invoice itu keluar.

[[figure:drift-alerts-and-rollback/layers|Empat lapisan monitoring, dari sinyal tercepat sampai yang paling lambat.]]

> Gagasan kunci: lapisan yang murah bereaksi dalam hitungan menit atau hari, tetapi hanya memberi petunjuk. Outcomes memastikan masalahnya, dan datang paling akhir. Setiap lapisan melewatkan sesuatu yang dilihat lapisan lain, jadi monitor memerlukan keempatnya.

## Tiga cara dunia bergeser
*Lapisan mana yang lebih dulu menunjukkan tiap jenis drift?*

**Drift** adalah sebutan sehari-hari untuk dataset shift pada pelajaran "Covariate shift dan concept shift". Jenisnya sama, tiga.

- **Data drift** (covariate shift): inputs berubah. Jenis pelanggan baru mulai mengirim invoice.
- **Label drift** (label shift): keseimbangan kelas berubah. Jauh lebih banyak invoice dibanding sebelumnya berakhir terlambat.
- **Concept drift** (concept shift): input yang sama menghasilkan outcome yang berbeda. Pelanggan dengan profil yang sama kini membayar terlambat karena perusahaan mengubah ketentuan pembayaran.

| Jenis drift | Lapisan pertama yang dapat menunjukkannya |
| --- | --- |
| Data drift | Inputs: porsi baris per bin bergeser |
| Label drift | Predictions: porsi yang diprediksi terlambat bergeser |
| Concept drift | Hanya outcomes: inputs dan predictions tampak normal |

> Awas: tidak semua perubahan angka adalah drift. Kolom yang tiba-tiba kosong, atau feature yang dihitung berbeda saat serving dibanding saat training (skew di pelajaran sebelumnya), tampak seperti data drift di lapisan inputs. Itu adalah bug, dan bug diperbaiki, bukan di-retrain. Penyelidikanlah yang membedakan keduanya.

## Mengapa alert accuracy datang terlambat
*Jika accuracy adalah ujian sebenarnya, mengapa tidak memasang alert pada accuracy saja?*

Accuracy memerlukan jawaban yang benar, dan jawaban sebuah invoice baru tiba 30 hari setelah invoice itu dikirim. Jadi pada hari t, invoice terbaru yang dapat kamu nilai adalah yang dikirim pada hari t - 30.

Misalkan pada hari ke-10 sebuah segmen pelanggan baru mulai membayar dengan cara berbeda, dan sejak itu model benar pada 70% invoice, bukan 85%. Kamu melaporkan accuracy dari 7 hari berlabel terbaru dan memasang alert di bawah 80%.

> Contoh hitungan: invoice berubah yang pertama dikirim pada hari ke-10 dan diberi label pada hari ke-40. Pada hari ke-40 window berisi invoice yang dikirim pada hari ke-4 sampai ke-10, dengan satu hari berubah dari tujuh: 0,85 - 0,15 x 1/7 = 0,83. Pada hari ke-41 ada dua hari berubah: 0,85 - 0,15 x 2/7 = 0,81. Pada hari ke-42 ada tiga: 0,85 - 0,15 x 3/7 = 0,786, di bawah 0,80, sehingga alert berbunyi.

Sampai hari ke-42, pelanggan yang berubah sudah dinilai selama 33 hari, 33 x 500 = 16.500 invoice, dan model 15 poin kurang akurat pada mereka: 0,15 x 16.500 = 2.475 kesalahan tambahan.

> Gagasan kunci: monitor yang menunggu label tidak akan lebih cepat daripada labelnya. Dengan penundaan 30 hari, alert accuracy datang paling cepat 30 hari setelah kerusakan pertama.

## Sinyal proxy yang dapat dibaca hari ini
*Apa yang dapat dipantau selagi label masih dalam perjalanan?*

Tiga **sinyal proxy** tidak memerlukan outcome.

**Input drift.** Setiap hari, hitung PSI feature penting selama 7 hari terakhir terhadap data training.

**Sebaran prediksi.** Pantau porsi invoice yang diprediksi terlambat. Saat training angkanya 30%. Pada invoice yang berubah, model menyebut 42% terlambat, sehingga window 7 hari keluar dari rentang 25% sampai 35% pada hari ke-12, setelah tiga hari berubah: 0,30 + 0,12 x 3/7 = 0,351.

**Sampel kecil berlabel.** Setiap minggu, ambil 50 invoice terbaru secara acak dan minta seseorang mencari outcome sebenarnya sekarang (periksa kasusnya, tanyakan ke pelanggan). Ini memerlukan usaha, tetapi memberi pembacaan accuracy yang benar dalam hitungan hari. Hasilnya juga berisik: pada accuracy sebenarnya 85%, pembacaan bervariasi sekitar 5 poin dari minggu ke minggu. Pasang alert pada 37 atau kurang yang benar dari 50. Itu berbunyi pada sekitar 3% minggu ketika tidak ada masalah dan menangkap model 70% pada sekitar 78% minggu.

[[figure:drift-alerts-and-rollback/timeline|Hari saat setiap sinyal berbunyi untuk drift yang mulai pada hari ke-10. Alert accuracy baru datang pada hari ke-42.]]

> Awas: proxy adalah petunjuk, bukan bukti. Inputs dapat bergeser sementara accuracy bertahan, dan concept drift tidak menggeser satu input pun. Pakai proxy untuk mulai memeriksa lebih awal, lalu pastikan dengan label.

## Merancang alert
*Kapan sebuah angka menjadi pesan untuk seseorang?*

Alert punya empat bagian: **sinyal**, **threshold**, **window** (seberapa banyak data terbaru yang masuk ke satu pembacaan), dan **aturan** tentang berapa kali pelanggaran dihitung. Ambil PSI pada nilai invoice, dibagi menjadi empat bin, dengan patokan dari pelajaran shift sebelumnya: warning pada 0,10, page pada 0,25. Warning dikirim ke kanal chat, sedangkan page menelepon seseorang.

> Contoh hitungan: pada hari ke-13, 7 hari terakhir berisi empat hari yang berubah. Porsi dibulatkan ke dua desimal.

| Bin | Training | 7 hari terakhir | Baru - lama | ln(baru / lama) | Suku |
| --- | --- | --- | --- | --- | --- |
| small | 0,20 | 0,13 | -0,07 | -0,431 | 0,030 |
| medium | 0,40 | 0,31 | -0,09 | -0,255 | 0,023 |
| large | 0,30 | 0,34 | 0,04 | 0,125 | 0,005 |
| very large | 0,10 | 0,22 | 0,12 | 0,788 | 0,095 |

PSI = 0,030 + 0,023 + 0,005 + 0,095 = 0,153. Angka itu di atas 0,10 dan di bawah 0,25, sehingga sebuah warning terkirim dan tidak ada page. Hari ke-14 memberi 0,23 dan hari ke-15 memberi 0,30, jadi page berbunyi pada hari ke-15.

[[figure:drift-alerts-and-rollback/psi-alert|PSI 7 hari untuk nilai invoice terhadap dua threshold. Warning berbunyi pada hari ke-13 dan page pada hari ke-15.]]

## Window dan alarm palsu
*Bagaimana mencegah alert terlalu sering berbunyi keliru?*

Window dan aturan mengendalikan alarm palsu. Window satu hari berisik: invoice hari Senin berbeda dari hari rata-rata, sehingga PSI melonjak padahal tidak ada yang salah. Window yang mencakup satu siklus mingguan penuh meratakannya. Mensyaratkan dua pelanggaran berturut-turut mengurangi alarm palsu lebih jauh, dengan harga satu hari. Threshold yang terlalu rendah menghasilkan alert yang tidak dipercaya siapa pun, dan yang terlalu tinggi berbunyi setelah kerusakan terjadi.

::: deeper Mengapa banyak feature membuat alarm palsu mudah muncul
Misalkan kamu memantau 20 feature dan masing-masing punya peluang 2% melanggar secara keliru pada suatu hari. Peluang paling sedikit satu alarm palsu adalah 1 - 0,98^20 = 0,33, sekitar satu hari dari tiga. Menjumlahkan peluangnya (20 x 2% = 40%) keliru, karena dua pelanggaran pada hari yang sama terhitung dua kali. Cara menguranginya: pantau hanya feature yang paling diandalkan model, minta dua pelanggaran berturut-turut, dan kirim satu pesan gabungan per hari, bukan satu per feature.
:::

## Selidiki sebelum bertindak
*Sebuah alert berbunyi: apa yang pertama kali kamu periksa?*

Alert menyatakan ada yang bergeser, bukan mengapa. Luangkan menit, bukan hari, untuk empat pertanyaan, dengan urutan ini.

1. **Apakah pipeline sehat?** Lihat lapisan operations: galat, latensi, nilai kosong, feature yang menjadi konstan. Bug adalah penyebab yang paling murah untuk dipastikan dan diperbaiki.
2. **Apakah ada yang dirilis?** Cocokkan waktu alert dengan waktu rilis model, kode feature, dan data hulu. Di sinilah versioning berguna: jika setiap prediksi dicatat bersama versi modelnya, kamu dapat memisahkan metrik per versi.
3. **Input mana yang bergeser?** Satu feature yang melonjak menunjuk ke feed yang rusak. Banyak feature yang bergeser sedikit menunjuk ke perubahan nyata di dunia.
4. **Apakah kerusakannya nyata?** Ambil sampel berlabel. Periksa tiga hal: accuracy-nya, apakah model masih mengurutkan kasus dengan baik (misalnya dengan AUC, lihat "ROC dan precision-recall"), dan apakah probabilitasnya cocok dengan kenyataan (calibration).

Baru setelah itu kamu memilih perbaikan. Bertindak lebih dulu, misalnya me-retrain pada data yang mengandung bug, dapat menanamkan bug itu ke versi berikutnya.

## Roll back, recalibrate, atau retrain
*Setelah tahu apa yang terjadi, perbaikan mana yang sesuai?*

| Tindakan | Tepat jika | Biayanya | Waktu |
| --- | --- | --- | --- |
| Roll back | Rilis terbaru menjadi penyebab dan versi sebelumnya bekerja | Kehilangan yang diperbaiki versi baru. Model lama harus masih sesuai dengan data dan kode feature hari ini | hitungan menit |
| Recalibrate | Urutannya masih baik tetapi probabilitas atau porsi yang ditandai (flag rate) meleset | Sampel berlabel terbaru beberapa ratus baris. Ini memperbaiki skor, bukan urutan | hitungan jam sampai sehari |
| Retrain | Hubungannya berubah, atau data bergeser ke tempat yang tidak pernah dipelajari model | Label baru, yang memerlukan waktu, pengecekan dengan temporal split, versi baru untuk di-deploy dan dipantau | hitungan hari sampai minggu |

> Contoh hitungan: tiga alert pada model invoice. **A:** pada hari versi 13 dirilis, porsi nilai kosong pada feature amount naik dari 0,5% menjadi 18%. Roll back ke versi 12, lalu perbaiki kode feature. **B:** inputs stabil, model menyebut 42% invoice terlambat dan sampel berlabel 200 baris menunjukkan 30% terlambat, sedangkan AUC-nya 0,86 dibanding 0,87 saat peluncuran. Urutannya utuh dan probabilitasnya terlalu tinggi, sehingga lakukan recalibrate ("Kalibrasi dan biaya" menunjukkan caranya). **C:** PSI untuk amount adalah 0,41 dan AUC sampel turun dari 0,87 menjadi 0,68. Hubungannya berubah, jadi retrain pada label terbaru.

[[figure:drift-alerts-and-rollback/playbook|Playbook: selidiki dulu, lalu pilih perbaikan yang sesuai dengan temuanmu.]]

Selagi retrain berjalan, langkah sementara seperti mengirim invoice yang paling berisiko ke seorang petugas menekan kerusakannya.

## Setelah insiden
*Apa yang dicatat sesudahnya?*

Dalam beberapa hari, tulis **catatan pasca-insiden** singkat tentang sistem, bukan mencari yang salah. Catat lima hal.

1. Linimasa: kapan drift mulai, kapan setiap sinyal berbunyi, kapan seseorang bertindak, dan kapan selesai.
2. Penundaan: di sini PSI memberi warning pada hari ke-13 dan accuracy pada hari ke-42, sehingga label 29 hari lebih lambat.
3. Penyebab, dan bagaimana kamu memastikannya.
4. Tindakan dan biayanya, dalam jam kerja dan dalam prediksi yang salah.
5. Perubahan yang menyusul: monitor baru, threshold yang berbeda, atau cara yang lebih cepat untuk mendapat label.

## Menuju Monitoring lab
*Apa yang berikutnya?*

Pelajaran berikutnya adalah lab Monitoring, penutup course ini. Di sana kamu memutar ulang aliran prediksi, menyelidiki alert performa, dan memutuskan apakah akan roll back, recalibrate, atau retrain. Sebelum membukanya, tebak sinyal mana yang berbunyi lebih dulu dan mana yang memastikan kerusakan, lalu cocokkan tebakanmu dengan hasil di lab.

::: remember
- Pantau empat lapisan: operations, inputs, predictions, dan outcomes. Yang murah berbunyi lebih dulu dan hanya memberi petunjuk, sedangkan outcomes memastikan tetapi datang setelah penundaan label.
- Alert memerlukan threshold, window, dan aturan: window yang mencakup satu siklus penuh dan dua pelanggaran berturut-turut mengurangi alarm palsu, sedangkan threshold rendah dengan banyak feature mengundangnya.
- Selidiki dulu, lalu roll back untuk rilis yang buruk, recalibrate ketika urutannya bertahan tetapi probabilitasnya meleset, dan retrain ketika hubungannya berubah. Tulis catatan pasca-insiden sesudahnya.
:::
