---
slug: operating-and-investigating-a-model
title: Mengoperasikan dan menyelidiki sebuah model
---
::: intro
- Susun monitoring plan yang menyebutkan apa yang dipantau, seberapa sering, pada threshold berapa, dan siapa pemiliknya, lalu beri setiap alert sebuah runbook.
- Selidiki sebuah kegagalan dalam enam langkah (reproduksi, slice, cari hal pertama yang berubah, konfirmasi penyebab, perbaiki, tambahkan test atau alert) dan tuliskan dalam laporan tanpa menyalahkan siapa pun.
- Pilih antara rollback, rekalibrasi, dan retraining berdasarkan bukti, lalu tutup lingkarannya agar kegagalan yang sama tidak kembali tanpa terlihat.

Sebelum mulai: baca "End-to-end design and reproducibility" di course ini, "Drift, alerts and rollback" di ML deployment and monitoring, serta "Calibration and costs". Yang pertama memberimu desain deteksi fraud kartu yang pelajaran ini lanjutkan setelah peluncuran. Yang kedua memberimu empat lapisan monitoring dan threshold PSI. Yang ketiga menunjukkan apa yang diubah rekalibrasi dan apa yang dibiarkannya.
:::

## Rencana untuk setelah peluncuran
*Apa yang dipantau, seberapa sering, dan siapa yang menjawab?*

Model yang sudah diluncurkan tidak pernah benar-benar selesai. Skor yang kamu ukur sebelum peluncuran hanya berlaku selama dunia dan datanya tetap seperti semula. "Drift, alerts and rollback" menyebut empat lapisan yang perlu dipantau: operasi, input, prediksi, dan hasil. Sebuah **monitoring plan** mengubahnya menjadi tabel. Setiap barisnya menyebut apa yang diukur, cara mengukurnya, seberapa sering, pada threshold berapa sesuatu dilakukan, dan siapa pemiliknya. Baris tanpa pemilik adalah baris yang tidak dibaca siapa pun.

Berikut rencana untuk model fraud kartu dari pelajaran sebelumnya: 10.000 pembayaran per hari, sekitar 100 di antaranya fraud, 200 review per hari, 80 terselamatkan untuk setiap fraud yang tertangkap, dan biaya 2 untuk setiap review. Aturan baseline dari pelajaran sebelumnya, yang mengantrekan 200 amount terbesar, menangkap 38 fraud per hari. Saat peluncuran, antrean model berisi 71 fraud per hari. **Hit rate**-nya 71 / 200 = 35,5%.

| Apa | Cara | Seberapa sering | Threshold | Pemilik |
| --- | --- | --- | --- | --- |
| Job scoring | baris yang di-score sama dengan baris yang diterima | harian, 06:00 | belum selesai pukul 07:00: page | platform on-call |
| Missing value | porsi kosong pada amount, merchant category, country | harian | peluncuran 0,4%; di atas 2%: warn | data engineer |
| Input drift | PSI untuk amount, 7 hari terakhir | harian | 0,10 warn, 0,25 page | data scientist |
| Hit rate antrean | fraud yang dikonfirmasi reviewer / 200, rata-rata 7 hari | harian | di bawah 30% warn, di bawah 24% page | data scientist |
| Recall antrean | fraud di antrean / semua fraud, pada hari yang chargeback-nya sudah masuk | mingguan | peluncuran 71%; di bawah 60%: warn | data scientist |

Dua istilah di tabel perlu dijelaskan. **Warn** adalah pesan yang dibaca seseorang pada hari yang sama. **Page** membangunkan orang yang sedang on call, yaitu orang yang bertugas menjawab alert di malam hari. Jika page tidak dijawab tepat waktu, page itu berpindah ke orang berikutnya.

Reviewer mengonfirmasi setiap kasus di antrean pada hari yang sama, sehingga hit rate adalah metrik operasional yang diukur langsung, tanpa menunggu chargeback. Namun hit rate hanya melihat isi antrean. Fraud yang luput dari model baru muncul di baris recall, yang datang hingga 30 hari kemudian.

> Gagasan kunci: monitoring plan adalah tabel dengan pemilik di setiap baris dan tindakan di balik setiap threshold. Tugasnya membuat orang yang disebut namanya melakukan sesuatu.

## Menangani sebuah alert
*Apa yang pertama kali dilakukan orang yang menerima page?*

Alert pukul 3 pagi tidak boleh bergantung pada ingatan tentang cara kerja modelnya. **Runbook** adalah halaman pendek, satu untuk setiap alert: arti alert itu, apa yang dicek lebih dulu, tindakan apa yang aman, dan kapan harus memanggil orang lain. Tulis runbook saat menulis alert-nya, selagi kamu masih ingat mengapa memilih threshold itu. **Incident** adalah catatan resmi yang memulai respons tim, lengkap dengan pemilik dan timeline.

```
ALERT     hit rate antrean, rata-rata 7 hari, di bawah 24%
ARTINYA   kurang dari 48 fraud per hari di antrean (peluncuran: 71)
PEMILIK   data scientist on call; fraud-ops lead diberi tahu
CEK       (10 menit, dengan urutan ini)
          1. Apakah job scoring berjalan dan men-score semua pembayaran?
          2. Apakah ada rilis model, feature, atau app dalam 7 hari terakhir?
          3. Apakah porsi kosong pada suatu feature melonjak?
AMAN      di bawah 19%, pindahkan antrean ke aturan baseline (200 amount terbesar)
ESKALASI  tidak ada penjelasan setelah 2 jam: buka incident
```

Runbook ini memuat dua gagasan. Pertama, **mitigasi sebelum paham**. Menghentikan kerugian dan mencari penyebab adalah dua pekerjaan berbeda, dan yang pertama boleh kasar. Kedua, mitigasi adalah pilihan yang didukung angka.

> Contoh hitungan: pada 44 fraud di antrean, net value-nya 44 × 80 - 200 × 2 = 3.120 per hari. Aturan baseline menangkap 38 dan menghasilkan 38 × 80 - 400 = 2.640. Berpindah ke aturan itu akan menghilangkan 480 per hari, sehingga runbook membiarkan model tetap berjalan dan baru berpindah di bawah 38 fraud, yaitu hit rate 19%.

> Awas: alert tanpa runbook hanya di-acknowledge (seseorang mengeklik untuk membungkamnya) lalu diabaikan. Jika orang yang menerima page tidak dapat menyebutkan apa yang dicek lebih dulu, alert itu belum selesai.

## Metode menyelidiki kegagalan
*Bagaimana menemukan penyebab, bukan sekadar menebaknya?*

Alert hanya mengatakan bahwa sesuatu bergeser. Analisis kegagalan mencari tahu mengapa, dan enam langkah yang sama sesuai untuk sebagian besar kegagalan.

1. **Reproduksi.** Jalankan ulang kasus yang bermasalah dari input yang tersimpan: snapshot data, versi kode dan model, serta seed. Jika hasil buruk yang sama tidak muncul lagi, temuan pertamamu adalah sistemnya tidak reproducible.
2. **Slice.** Pecah metrik yang gagal menurut setiap field yang kamu log, seperti channel, negara, merchant category, dan hari dalam seminggu. Cari slice tempat penurunan itu terpusat.
3. **Cari hal pertama yang berubah.** Pada slice itu, temukan hari metrik mulai bergeser dari deret hariannya, karena rata-rata mengaburkan awalnya. Daftar semua yang berubah pada hari itu atau sesaat sebelumnya. Penyebab tidak mungkin datang setelah akibatnya.
4. **Konfirmasi penyebab.** Sebuah kandidat belum menjadi penyebab sebelum diuji. Terapkan ke hari yang sehat dan lihat apakah kegagalannya muncul.
5. **Perbaiki.** Buat perubahan terkecil yang menghilangkan penyebab yang sudah terkonfirmasi, dan katakan apakah itu mitigasi atau perbaikan.
6. **Tambahkan test atau alert**, agar kejadian berikutnya tertangkap lebih cepat.

[[figure:operating-and-investigating-a-model/investigation-steps|Enam langkah analisis kegagalan, dengan apa yang dilakukan tiap langkah pada kasus fraud di pelajaran ini.]]

> Gagasan kunci: selidiki dulu, baru perbaiki. Retraining di awal, pada data yang sudah memuat kegagalannya, dapat mengajarkan kegagalan itu kepada model sebagai hal normal.

## Reproduksi
*Apa yang ditemukan metode ini pada model fraud?*

Model fraud diluncurkan pada hari 1. Semua angka di bawah adalah rekaan. Agar hitungannya terlihat jelas, setiap hari memuat tepat 71 fraud di antrean sebelum hari 34 dan tepat 44 sesudahnya; hari yang nyata bervariasi beberapa fraud.

Hit rate turun mulai hari 34. Pada hari 36, rata-rata 7 hari adalah (4 × 71 + 3 × 44) / 7 = 59,4 fraud, yaitu hit rate 29,7%, di bawah 30%: warn. Pada hari 39 nilainya (71 + 6 × 44) / 7 = 47,9, atau 23,9%, di bawah 24%: page. Data scientist yang on call mengikuti runbook. Job-nya berjalan, dan tidak ada rilis model atau feature.

**Reproduksi.** Pada hari 40 data scientist menjalankan ulang job scoring untuk hari 36 dari snapshot yang tersimpan, dengan versi model dan seed 42 yang tercatat. Hasilnya 200 pembayaran yang sama dengan 44 fraud terkonfirmasi, sehingga kegagalan itu kini dapat dijalankan sesuai permintaan.

## Slice
*Di mana penurunannya terpusat?*

Pecah antrean menurut setiap field yang dicatat. Hari dalam seminggu, merchant category, dan rentang amount semuanya menunjukkan penurunan ringan yang sama. Channel tidak.

| Slice | Di antrean | Fraud sebelum | Hit rate sebelum | Fraud sesudah | Hit rate sesudah |
| --- | --- | --- | --- | --- | --- |
| App | 120 | 46 | 38% | 19 | 16% |
| Web | 80 | 25 | 31% | 25 | 31% |
| Seluruh antrean | 200 | 71 | 35,5% | 44 | 22% |

Seluruh 71 - 44 = 27 fraud yang hilang berada di app: 46 - 19 = 27.

[[figure:operating-and-investigating-a-model/hit-rate-timeline|Hit rate antrean (rata-rata 7 hari) terhadap threshold di plan. Garis 30% dilewati pada hari 36 dan garis 24% pada hari 39.]]

::: deeper Seberapa besar sebuah slice seharusnya?
Slice dengan sedikit kasus berayun karena kebetulan. Hit rate 80 pembayaran web di antrean sebesar 31% memiliki standard error sekitar 0,05 (akar dari 0,31 × 0,69 / 80), sehingga satu hari slice itu bergerak sekitar 5 poin tanpa sebab apa pun. Tujuh hari dari slice yang sama memuat 560 pembayaran, dan standard error turun menjadi sekitar 2 poin. Nilai sebuah slice dari deret hariannya hanya bila slice itu besar; jika tidak, gabungkan beberapa hari. Ini aturan kasar yang menganggap pembayaran saling bebas.
:::

## Hal pertama yang berubah, pembuktian, dan perbaikan
*Perubahan mana yang memulainya, dan bagaimana kamu tahu?*

**Hal pertama yang berubah.** Slice app bergeser pada hari 34 dan tidak pada hari lain. Change log hari itu memuat dua entri: rilis app `5.2`, yaitu pembaruan otomatis, dan kampanye pemasaran yang menambah sekitar 5% pembayaran. Tidak ada perubahan model, feature, atau aturan yang tercatat. Membandingkan porsi kosong setiap feature pada pembayaran app dengan minggu sebelumnya, hanya `device_age_days` yang bergerak, dari 0,4% menjadi 63%. Kode feature kita mengisi device age yang kosong dengan median data latih, sehingga model melihat usia yang tampak wajar dan tidak ada peringatan. Plan hanya memantau tiga kolom, dan ini bukan salah satunya, sehingga tidak ada alert yang berbunyi.

[[figure:operating-and-investigating-a-model/slice-the-drop|Kiri: hit rate antrean per channel, sebelum dan sesudah hari 34. Kanan: porsi device age yang kosong per channel. Hanya app yang bergeser, pada keduanya.]]

**Konfirmasi.** Dua kandidat berubah pada hari 34, sehingga waktunya saja tidak dapat memisahkan keduanya. Hari 8 memiliki label final dan antreannya berisi 71 fraud. Putar ulang dua kali dengan model yang tersimpan:

- Kosongkan device age pada 63% pembayaran app, seperti yang dilakukan rilis `5.2`. Antrean turun menjadi 45 fraud, dekat dengan 44 yang terlihat langsung.
- Tambahkan 5% pembayaran, seperti kampanye tadi. Antrean tetap berisi 71.

Rilis itulah penyebabnya, bukan kampanye.

**Perbaikan.** App bukan milik kita untuk di-rollback. Kode feature kini membaca device age dari device registry setiap kali app tidak mengirimnya, dan tim app diminta mengirim kolom itu lagi. Perubahan siap pada hari 41 dan dipakai untuk scoring mulai hari 42. Model, data latihnya, dan kalibrasinya tidak disentuh.

> Awas: dua kejadian pada hari yang sama tampak seperti satu penyebab dengan dua nama. Putar ulang masing-masing sendirian pada hari yang sehat sebelum kamu menyebut penyebabnya.

## Menulis laporan tanpa menyalahkan
*Bagaimana mencatat apa yang terjadi agar tim berikutnya dapat belajar darinya?*

**Laporan kegagalan** mencatat apa yang terjadi, mengapa, dan apa yang berubah. Laporan itu **blameless**: ia menjelaskan kegagalan lewat kondisi sistem, bukan lewat seseorang. "Plan hanya memantau tiga dari dua belas feature" adalah temuan. "Seseorang lupa menambahkan kolomnya" bukan, karena sistem yang sama akan membiarkan orang berikutnya lupa juga. Orang yang takut disalahkan menyembunyikan kesalahan, dan perbaikan yang berbunyi "lebih berhati-hatilah" tidak mengubah apa pun.

Berikut laporan untuk insiden ini, dibuat ringkas.

| Bagian | Isi |
| --- | --- |
| Ringkasan | Setelah rilis app `5.2` berhenti mengirim device age, antrean berisi 44 fraud per hari, bukan 71, sampai fallback feature dipakai pada hari 42. |
| Dampak | 27 fraud lebih sedikit per hari, 27 × 80 = 2.160 per hari. Hari 34 sampai 41 adalah 8 hari, sehingga 8 × 2.160 = 17.280 hilang. |
| Timeline | Hari 34 rilis. Hari 36 warn. Hari 39 page. Hari 40 direproduksi dan di-slice. Hari 41 penyebab terkonfirmasi, perbaikan siap. Hari 42 pertama kali di-score dengan perbaikan. |
| Penyebab | Rilis `5.2` menghilangkan `device_age_days` pada 63% pembayaran app. Kode feature kita mengisinya dengan median, dan model kehilangan sebuah sinyal penting untuk pembayaran itu. |
| Deteksi | Alert hit rate: warn 2 hari setelah awal, page setelah 5. Tidak ada alert input yang mencakup kolom itu. |
| Yang berjalan baik | Konfirmasi reviewer pada hari yang sama. Run record yang dapat memutar ulang hari mana pun. Model, yang masih di atas aturan, tetap berjalan. |
| Tindakan | Cek porsi kosong pada 12 feature, data engineer, hari 45. Replay test pada kode feature, data scientist, hari 45. Catatan rilis app masuk ke change log kita, fraud-ops lead, hari 45. |

## Rollback, rekalibrasi, atau retraining
*Perbaikan mana yang sesuai dengan temuanmu?*

Pilih perbaikan hanya setelah penyebabnya terkonfirmasi, dan ambil yang termurah yang diizinkan oleh penyebab itu.

| Bukti | Perbaikan | Waktu hingga berlaku |
| --- | --- | --- |
| Sebuah perubahan dirilis saat masalah mulai, dan membatalkannya memulihkan hasil replay | Rollback atau perbaiki perubahannya | beberapa jam hingga sehari |
| Ranking masih bagus pada sampel berlabel, tetapi skor atau angka rate meleset | Rekalibrasi | sekitar sehari, dengan sampel berlabel yang baru |
| Hubungannya berubah, atau datanya bergeser ke area yang tidak pernah dipelajari model | Retraining | berminggu-minggu, karena label datang terlambat hingga 30 hari |

Pada insiden ini bukti menunjuk ke baris pertama. Rekalibrasi tidak akan membantu, bahkan secara prinsip. Pemetaan kalibrasi yang monoton menjaga urutan skor, sehingga 200 teratas di antrean tetap 200 pembayaran yang sama dan 44 fraud tetap 44. Rekalibrasi penting di tempat probabilitasnya sendiri dipakai, seperti aturan yang memblokir di atas 0,9 atau angka expected loss yang ditampilkan kepada reviewer ("Calibration and costs").

Retraining akan menjadi langkah yang lambat dan keliru. Menunggu label selama 30 hari dengan kerugian 2.160 per hari berarti 30 × 2.160 = 64.800. Model yang dilatih ulang pada hari 34 sampai 41 juga akan mempelajari device age yang kosong sebagai hal normal.

> Gagasan kunci: penyebab yang sudah terkonfirmasi menentukan perbaikannya. Selama penyebab belum terkonfirmasi, lakukan mitigasi sesuai runbook dan teruskan penyelidikan.

## Menutup lingkaran
*Apa yang ditinggalkan insiden ini, dan ke mana kamu melangkah berikutnya?*

Sebuah kegagalan selesai ketika sistemnya berubah, bukan ketika angkanya pulih. Kegagalan ini meninggalkan empat hal:

- Sebuah **test**: putar ulang satu hari yang sehat melalui kode feature sebelum setiap rilis, dan gagalkan bila porsi kosong suatu feature melewati 2%.
- Sebuah **alert**: cek porsi kosong pada ke-12 feature, setiap hari.
- Sebuah **perubahan runbook**: pengecekan 3 menyebut feature menurut porsi kosongnya, dan catatan rilis app masuk ke change log.
- Sebuah **peninjauan plan**: setiap bulan dan setelah setiap insiden, tanyakan apakah setiap baris masih punya pemilik dan threshold.

> Contoh hitungan: cek yang baru membaca pembayaran hari 34 pada pagi hari 35. Dengan tiga hari yang sama dari page hingga perbaikan, perbaikan akan aktif pada hari 38, dan hari 34 sampai 37 menelan 4 × 2.160 = 8.640, bukan 17.280. Baris plan itu akan menghemat separuh kerugian.

Berikutnya adalah "Advanced capstone project". Di sana kamu meluncurkan model dengan evaluasi yang reproducible, metrik operasional, monitoring plan, dan investigasi kegagalan yang terdokumentasi. Pakai plan, runbook, dan laporan di pelajaran ini sebagai templat. Rusak pipeline-mu sendiri dengan sengaja, selidiki dengan enam langkah, dan tulis laporannya agar orang lain dapat belajar darinya.

::: remember
- Monitoring plan menyebut apa, cara, seberapa sering, threshold, dan pemilik di setiap baris, dan setiap alert punya runbook yang memitigasi lebih dulu lalu menyelidiki.
- Selidiki dalam enam langkah: reproduksi, slice, cari hal pertama yang berubah, konfirmasi penyebab lewat replay, perbaiki, dan tambahkan test atau alert. Tulis laporan tentang sistemnya, bukan orangnya.
- Penyebab yang terkonfirmasi menentukan perbaikannya: rollback atau perbaiki sebuah perubahan, rekalibrasi bila hanya probabilitas yang meleset, retraining bila hubungannya berubah. Tutup lingkaran dengan test, alert, dan plan yang ditinjau.
:::
