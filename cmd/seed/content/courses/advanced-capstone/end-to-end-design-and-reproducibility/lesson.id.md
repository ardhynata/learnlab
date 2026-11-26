---
slug: end-to-end-design-and-reproducibility
title: Desain end-to-end dan reproducibility
---
::: intro
- Mulai sebuah desain dari keputusan yang didukung model, lalu pilih metrik operasional (apa yang benar-benar didapat oleh orang yang memakainya), bukan hanya AUC.
- Rencanakan data, label, baseline, dan split yang sesuai dengan deployment, termasuk jeda sebelum label tiba.
- Catat sebuah run agar orang lain dapat mengulanginya, pilih scoring batch atau online, tentukan apa yang dicatat di log, dan tinjau desain dengan sebuah checklist.

Sebelum mulai: baca "Reproducible pipelines" dan "Defending an evaluation" di Intermediate capstone (proyek "Intermediate capstone project" memperlihatkan keduanya dipakai), "Covariate and concept shift" di Advanced evaluation and shift, serta "Framing and baselines" di Beginner capstone. Dua yang pertama memberimu aturan untuk evaluasi yang dapat diulang dan dapat dipertanggungjawabkan. Pelajaran ini memperluasnya dari satu evaluasi menjadi satu sistem utuh.
:::

## Mulai dari keputusan
*Untuk apa model ini dibuat, dan siapa yang bertindak berdasarkan jawabannya?*

Sebuah model hanyalah satu bagian dari sistem: data masuk, skor keluar, lalu seseorang atau sebuah program melakukan sesuatu dengan skor itu. Desain dimulai dari ujung rantai tersebut, yaitu **keputusan**. Siapa yang bertindak berdasarkan skor, apa yang mereka lakukan secara berbeda, dan berapa banyak kasus yang sanggup mereka tangani?

Pelajaran ini mengikuti satu proyek rekaan, dan semua angkanya rekaan. Sebuah perusahaan kartu menerima 10.000 pembayaran sehari, dan sekitar 1% di antaranya, 100 per hari, adalah fraud. Reviewer dapat memeriksa 200 pembayaran per hari. Satu fraud yang tertangkap menghemat rata-rata 80, dan satu review berbiaya 2. Setiap pagi reviewer menerima antrean: 200 pembayaran yang paling mencurigakan menurut model.

**Metrik operasional** mengukur seberapa baik keputusan itu bekerja dalam pemakaian nyata. Di sini metriknya adalah net value per hari: 80 untuk setiap fraud dalam antrean, dikurangi 2 untuk setiap review. AUC, accuracy, dan log loss adalah metrik model. Metrik itu berguna untuk debugging, tetapi bukan yang diperoleh perusahaan.

[[figure:end-to-end-design-and-reproducibility/design-chain|Delapan pertanyaan dalam desain sistem, sesuai urutan menjawabnya. Pelajaran ini membahasnya satu bagian demi satu bagian.]]

> Gagasan kunci: tuliskan keputusan dalam satu kalimat, lengkap dengan kapasitas dan biayanya, sebelum membuka data apa pun. Di sini: "Setiap pagi, urutkan pembayaran kemarin, lalu kirim 200 yang paling mencurigakan ke reviewer."

## Ketika AUC menunjuk ke arah yang salah
*Mungkinkah model dengan AUC lebih tinggi justru pilihan yang lebih buruk?*

Dua model, A dan B, memberi skor pada 10.000 pembayaran yang sama dalam satu hari biasa. A memiliki AUC lebih tinggi, 0,95 dibanding 0,92, sehingga di seluruh daftar ia lebih sering menempatkan fraud di atas non-fraud. Namun reviewer hanya membaca 200 teratas, dan B menaruh lebih banyak fraud di sana. Sebuah aturan sederhana, "masukkan 200 jumlah terbesar ke antrean", menjadi baseline.

| Model | Fraud di 200 teratas | Net value per hari | AUC |
| --- | --- | --- | --- |
| Aturan baseline (jumlah terbesar) | 38 | 2.640 | 0,68 |
| Model A | 62 | 4.560 | 0,95 |
| Model B | 71 | 5.280 | 0,92 |

> Contoh hitungan: model B menangkap 71 fraud, bernilai 71 × 80 = 5.680. Biaya 200 review adalah 200 × 2 = 400, jadi net value-nya 5.680 - 400 = 5.280 per hari. Model A menghasilkan 62 × 80 - 400 = 4.560, dan baseline 38 × 80 - 400 = 2.640. B mengungguli A sebesar 720 per hari, yaitu 720 × 30 = 21.600 dalam 30 hari.

[[figure:end-to-end-design-and-reproducibility/metric-reversal|Tiga ranker pada satu hari rekaan: fraud yang tertangkap di 200 teratas (batang), net value per hari, dan AUC. Urutan AUC bukan urutan nilai.]]

AUC merata-ratakan seluruh 10.000 posisi. A menempatkan fraud di luar 200 teratas dengan lebih baik daripada B, dan itu tidak menghasilkan apa-apa selama tidak ada yang membaca melewati posisi 200. Pilih antarmodel berdasarkan metrik operasional.

::: deeper Dari mana AUC ini berasal
Nilai AUC ini disusun, bukan disimulasikan. AUC adalah porsi pasangan (fraud, non-fraud) yang fraud-nya berperingkat lebih tinggi. Letakkan 62 fraud model A di 200 teratas secara merata pada posisi 1 sampai 200 dan 38 sisanya merata pada posisi 201 sampai 2.500: AUC = 0,947. Model B punya 71 fraud di 200 teratas dan 29 sisanya merata pada posisi 201 sampai 5.000: AUC = 0,922. Baseline punya 38 di 200 teratas dan 62 merata pada posisi 201 sampai 10.000: AUC = 0,682. Bagian atas daftar hanyalah sebagian kecil dari pasangan, sehingga bagian ekorlah yang menentukan AUC.
:::

## Data, label, dan baseline lebih dulu
*Apa yang kamu ketahui saat skor dibutuhkan, dan apa yang harus dikalahkan?*

Ajukan dua pertanyaan tentang data. Pertama, kolom mana yang sudah ada pada saat scoring? Jumlah, waktu, dan merchant sudah ada. "Chargeback diajukan" belum ada: itu label yang menyamar, dan melatih model dengannya adalah leakage yang diperingatkan oleh "Pipelines and leakage". Kedua, kapan setiap label tiba? Fraud dikonfirmasi lewat chargeback yang datang sampai 30 hari setelah pembayaran, sehingga pembayaran kemarin belum punya label.

Lalu buat **baseline** sebelum model apa pun: aturan paling sederhana yang dapat kamu deploy besok, dinilai dengan metrik operasional yang sama. Di sini aturannya "masukkan 200 jumlah terbesar ke antrean": 38 fraud per hari, net value 2.640. Baseline juga dapat berupa proses yang berjalan sekarang, misalnya aturan yang sudah dipakai reviewer.

Baseline menetapkan batas yang harus dilampaui. Model yang menangkap 40, bukan 38, hanya menambah 2 × 80 = 160 per hari, dan belum tentu sepadan dengan biaya pemeliharaannya. Baseline juga menguji pipeline: model yang skornya di bawah aturan sepele menunjukkan adanya bug sebelum menunjukkan data yang sulit.

> Awas: baseline yang dilaporkan dengan metrik berbeda dari model, misalnya accuracy untuk aturan dan AUC untuk model, bukanlah baseline. Letakkan setiap baris dalam satu tabel, dengan metrik operasional.

## Split yang sesuai dengan deployment
*Bagaimana memotong 180 hari riwayat agar pengujian menyerupai hari esok?*

"Defending an evaluation" memulai split dari satu kalimat: apa yang akan baru ketika model dipakai? Di sini yang baru adalah hari-hari yang belum pernah dilihat model, dinilai dengan label yang ada pada saat itu. Jeda label mengubah cara memotong.

Misalkan sistem dibangun pada hari ke-150. File riwayat diekspor setelah hari ke-210, sehingga setiap label di dalamnya sudah final, dan kita berpura-pura berdiri di hari ke-150. Pada saat itu label baru final untuk hari 1 sampai 120, karena jeda 30 hari. Potongan yang jujur punya tiga bagian. Latih pada hari 1 sampai 120: 1.200.000 pembayaran, sekitar 12.000 fraud. Jangan masukkan hari 121 sampai 150 ke dalam pelatihan: fraud yang belum dilaporkan tampak seperti pembayaran biasa. Uji pada hari 151 sampai 180: 300.000 pembayaran, sekitar 3.000 fraud, dan 30 × 200 = 6.000 review. Karena file hasil ekspor memuat label final untuk setiap hari, pengujian dapat langsung dinilai.

[[figure:end-to-end-design-and-reproducibility/deployment-split|Ke-180 hari yang sama dipotong dengan dua cara. Atas: latih, jeda, dan uji berurutan menurut waktu, seperti saat deployment. Bawah: potongan acak, tempat hari uji terselip di antara hari latih.]]

Potongan acak 80/20 melatih model dengan pembayaran dari sesudah hari yang diujinya, lengkap dengan label yang belum akan ada. Potongan itu juga menyembunyikan shift yang dijelaskan "Covariate and concept shift". Skornya bukan skor yang akan kamu lihat nanti.

## Pipeline yang dapat dijalankan ulang
*Apa yang harus tercatat agar reviewer mendapatkan kembali tabelmu?*

"Reproducible pipelines" memberi aturannya: satu pipeline yang di-fit hanya pada baris latih, seed tetap, pengaturan tercatat, tabel hasil, satu perintah. Sebuah sistem menambahkan apa yang mengelilingi pipeline. Catatan juga menyebut snapshot data yang tepat (file, jumlah baris, checksum), versi kode, versi library, dan tanggal split.

```
data      payments_v3.csv, row count <recorded here>, checksum <recorded here>
code      commit <recorded here>
libraries versions from the lock file
split     train days 1-120, gap 121-150, test 151-180
seed      42
metric    fraud in the 200 highest scores per day, and net value
command   make results   # raw file -> features -> fit -> score test days -> results.csv
```

Tabel hasilnya berbentuk seperti tabel yang muncul lebih awal dalam pelajaran ini: baseline dan setiap model yang kamu coba, metrik operasional lebih dulu, lalu metrik model. Tambahkan sebaran di 30 hari uji dan di berbagai seed, agar selisih seperti 720 per hari milik B atas A dapat dibandingkan dengan sebaran itu.

Periksa seperti di "Reproducible pipelines": jalankan perintahnya dua kali, lalu sekali lagi di salinan folder yang bersih, dan bandingkan tabelnya. Kalau berbeda, ada yang belum tercatat.

## Batch atau online, dan apa yang dicatat
*Kapan skor harus tersedia, dan apa yang harus kamu simpan ketika skor itu dibuat?*

Scoring **batch** berjalan terjadwal atas satu file utuh. Scoring **online** menjawab satu permintaan begitu permintaan itu tiba. Pilih menurut kapan keputusan membutuhkan skor. Reviewer mulai bekerja di pagi hari pada pembayaran kemarin, sehingga job batch malam hari atas 10.000 pembayaran sudah cukup. Memblokir sebuah pembayaran selagi pelanggan menunggu akan membutuhkan scoring online.

| | Batch | Online |
| --- | --- | --- |
| Skor dibutuhkan | sebelum sebuah langkah terjadwal | selama permintaan, dalam sekitar satu detik |
| Feature | apa pun yang diketahui saat job berjalan | hanya yang diketahui saat permintaan masuk |
| Saat gagal | run terlambat atau hilang, mudah diulang | permintaan lambat atau gagal, sehingga perlu aturan cadangan |

Untuk setiap pembayaran yang diberi skor, catat id, waktu, versi model, feature yang dipakai (atau penunjuk ke feature itu), skor, peringkat, dan tindakan yang dilakukan. Label datang belakangan. Menggabungkannya kembali lewat id memberi fraud nyata yang tertangkap per hari, yaitu metrik operasional yang diukur secara langsung.

[[figure:end-to-end-design-and-reproducibility/log-join|Log prediksi ditulis saat scoring. Label tiba sampai 30 hari kemudian dan digabungkan ke log itu lewat id.]]

::: deeper Berapa besar log itu?
Kalau satu catatan sekitar 200 byte, satu hari berisi 10.000 pembayaran adalah 10.000 × 200 = 2.000.000 byte, kira-kira 2 MB. Setahun sekitar 730 MB. Itu kecil dibandingkan dengan biaya model yang perilakunya tidak dapat kamu rekonstruksi, jadi catat dulu dan pangkas belakangan.
:::

## Checklist tinjauan desain
*Apa yang kamu tanyakan sebelum ada yang membangunnya?*

"Defending an evaluation" punya lima pertanyaan untuk sebuah evaluasi. Sebuah sistem menambahkan yang lain. Ajukan kedelapannya dalam tinjauan desain, dan harapkan jawaban yang dapat kamu tunjuk untuk masing-masing.

| Tanyakan | Tunjukkan | Di proyek ini |
| --- | --- | --- |
| 1. Keputusan: siapa yang bertindak, atas berapa kasus? | Satu kalimat dengan kapasitas dan biaya | 200 review per hari |
| 2. Metrik: apa yang didapat, dibanding baseline mana? | Satu baris tabel untuk baseline | net value, 2.640 |
| 3. Data: apa yang ada saat scoring? | Daftar kolom | tidak ada kolom chargeback |
| 4. Label: kapan tibanya? | Jeda dalam hari | sampai 30 hari |
| 5. Split: apa yang akan baru? | Tanggal latih, jeda, dan uji | hari 1-120, 151-180 |
| 6. Rerun: dapatkah orang lain mengulanginya? | Catatan run dan satu perintah | make results |
| 7. Serving: batch atau online, dan bagaimana kalau gagal? | Jadwal atau aturan cadangan | batch malam hari |
| 8. Log: dapatkah label yang terlambat digabung dengan skornya? | Kolom catatan | id, versi, skor |

> Gagasan kunci: checklist ini menanyakan sistem di sekitar model. Model dengan skor bagus tetap gagal dalam tinjauan jika tidak ada yang dapat menyebut siapa yang bertindak atasnya, atau apa yang terjadi ketika ia salah.

## Menuju proyek capstone
*Apa yang kamu bangun dengan semua ini?*

Pelajaran berikutnya, "Operating and investigating a model", membawa desain ini ke masa setelah peluncuran: apa yang dipantau selama sistem berjalan, bagaimana menyadari bahwa skor yang kamu ukur tidak lagi berlaku, dan bagaimana menyelidiki sebuah kegagalan. Kursus "ML deployment and monitoring" membahas serving dan drift lebih dalam.

Setelah itu datang "Advanced capstone project". Di sana kamu merilis model batch atau online dengan evaluasi yang reproducible, metrik operasional, rencana monitoring, dan investigasi kegagalan yang terdokumentasi. Mulailah dari pelajaran ini. Tuliskan keputusan satu kalimat, metrik operasional, baris baseline, split, dan catatan run sebelum kamu mem-fit model pertama. Lalu tinjau desainmu sendiri dengan delapan pertanyaan tadi.

::: remember
- Desain dimulai dari keputusan, kapasitas, dan biayanya. Metrik operasional, bukan AUC saja, yang menentukan pilihan antarmodel: di sini B mengungguli A sebesar 720 per hari dengan AUC yang lebih rendah.
- Rencanakan data, jeda label, dan baseline lebih dulu, dan potong split seperti deployment memotong waktu: latih, jeda, uji.
- Catat snapshot data, kode, versi, seed, dan satu perintah. Pilih batch atau online menurut kapan skor dibutuhkan, dan catat id, versi, skor, dan tindakan agar label yang terlambat dapat digabungkan.
:::
