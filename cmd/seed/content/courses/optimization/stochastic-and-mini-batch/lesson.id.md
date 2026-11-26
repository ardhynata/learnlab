---
slug: stochastic-and-mini-batch
title: Update stochastic dan mini-batch
---
::: intro
- Menyebutkan berapa titik yang dipakai satu langkah pada gradient descent full batch, mini-batch, dan stochastic, lalu menghitung berapa langkah yang diambil masing-masing dalam satu epoch.
- Menjelaskan mengapa langkah dari beberapa titik saja adalah tebakan yang noisy tetapi adil terhadap gradient penuh, dan bagaimana noise itu menyusut saat batch membesar.
- Memprediksi metode mana yang paling noisy dan mana yang mencapai loss rendah dalam epoch paling sedikit, serta menjelaskan mengapa noise dapat membantu keluar dari lembah dangkal tetapi menuntut learning rate yang lebih kecil atau yang meluruh.

Sebelum mulai: baca "Gradient dan permukaan loss", "Gradient descent", dan "Learning rate dan masalahnya".
:::

## Full batch: setiap titik, setiap langkah
*Berapa ongkos satu langkah yang memakai seluruh tabel?*

Bagian terakhir "Gradient descent" ditutup dengan sebuah janji: satu contoh, atau sekelompok kecil, untuk tiap langkah. Sebelum itu, kita lihat dulu pembandingnya. Untuk garis y = slope × x + intercept dan mean squared error (MSE), satu titik dengan residual r (nilai sebenarnya dikurangi prediksi) punya gradient (-2 × x × r, -2 × r). Gradient descent **full batch** mengambil rata-rata gradient itu dari semua n titik, sehingga tiap langkahnya tepat dan jalurnya mulus. Satu putaran melewati semua titik disebut **epoch**, dan satu epoch pada full batch hanyalah satu langkah.

Harganya: setiap langkah harus membaca setiap titik. Data buatan di lab punya 80 titik, sehingga tiap langkah menghabiskan 80 gradient titik; untuk satu juta baris, harganya satu juta.

::: deeper Mengapa satu epoch full batch memberi 6,10
Loss di lab adalah mean squared error biasa pada data yang sudah distandarkan. Curvature-nya (seberapa tajam mangkuk itu melengkung, dari "Learning rate dan masalahnya") adalah 2, sehingga satu langkah penuh pada learning rate 0,05 mengalikan jarak ke garis terbaik dengan 1 - 0,05 × 2 = 0,9, dan kelebihan loss (loss di atas yang terendah yang mungkin) dengan 0,81. Loss awalnya 7,42 dan loss terendah yang mungkin 0,50, sehingga setelah satu epoch loss-nya 0,50 + 6,92 × 0,81 = 6,10. Fit penguin di "Learning rate dan masalahnya" memakai setengah MSE, itulah sebabnya batasnya di sana 2 dan di sini 1.
:::

## Satu titik dalam satu waktu
*Bagaimana jika tiap langkah hanya melihat satu titik?*

**Stochastic gradient descent** (SGD) mengambil tiap langkah dari gradient satu titik. "Stochastic" berarti ada unsur peluang: titik diacak ulang setiap epoch, dan tiap titik dipakai tepat satu kali. Ambil tiga titik dari "Gradient dan permukaan loss", yaitu (1, 2), (2, 3), dan (3, 5), serta garis A di sana dengan slope 1 dan intercept 1, pada learning rate 0,15. Residualnya 0, 0, dan +1.

> Contoh hitungan: gradient satu titik adalah (-2 × x × r, -2 × r). Titik 1 memberi (0, 0), titik 2 memberi (0, 0), dan titik 3 memberi (-6, -2). Rata-ratanya (-2, -0,67): gradient penuh dari pelajaran itu. SGD bergerak sejauh -0,15 × gradient satu titik. Memilih titik 1 atau 2 tidak mengubah apa pun. Memilih titik 3 menggeser garis ke slope 1,9 dan intercept 1,3, dan MSE naik dari 0,33 menjadi 3,28. Langkah penuhnya menuju 1,3 dan 1,1, dan MSE turun menjadi 0,22.

Satu titik adalah penunjuk arah yang buruk: di sini langkahnya melampaui sasaran. Namun rata-ratakan ketiga gerakannya, (0, 0), (0, 0), dan (+0,9; +0,3), maka hasilnya (+0,3; +0,1), persis sama dengan langkah penuh. Dalam satu epoch, langkah-langkah satu titik itu jika dijumlahkan kira-kira sama dengan langkah penuh.

> Gagasan kunci: gradient satu titik adalah tebakan yang noisy dari gradient penuh, tetapi rata-ratanya atas seluruh data adalah gradient penuh itu sendiri.

## Mini-batch: satu kelompok per langkah
*Apa yang ada di antara satu titik dan semua titik?*

Satu langkah **mini-batch** memakai rata-rata gradient dari sekelompok b titik, dengan b adalah **batch size** (ukuran batch). Tiap epoch, titik-titik diacak lalu dipotong menjadi kelompok berukuran b, dan setiap kelompok menjadi satu langkah. Hasilnya n / b dibulatkan ke atas, ditulis ceil(n / b), langkah per epoch, dan kelompok terakhir lebih pendek bila b tidak habis membagi n: dengan 80 titik dan b = 30, kelompoknya berisi 30, 30, dan 20.

| Metode | Titik per langkah | Langkah per epoch | Gradient titik per epoch |
|---|---|---|---|
| Full batch | 80 | 1 | 80 |
| Mini-batch 16 | 16 | 5 | 80 |
| SGD | 1 | 80 | 80 |

[[figure:stochastic-and-mini-batch/work-per-epoch|Satu epoch atas 80 titik, dipotong dengan tiga cara. Tiap blok adalah satu langkah. Kerja per epoch sama; yang berbeda adalah seberapa sering jalur sempat bergerak.]]

Setiap baris mengerjakan 80 gradient titik per epoch yang sama banyaknya. Batch yang lebih besar membuat tiap langkah lebih mahal dan tepat; batch yang lebih kecil membuat tiap langkah murah dan kasar, tetapi jumlahnya lebih banyak. Batch size adalah kenop di antara kedua ujung itu: b = n adalah full batch dan b = 1 adalah SGD. Lab menghitung langkah dan epoch, bukan detik.

## Noise pada jalur
*Mengapa jalurnya bergoyang, dan apa yang membuatnya bergoyang lebih sedikit?*

Tiap kelompok memberi gradient yang sedikit berbeda, sehingga setiap langkah terdorong sedikit menjauh dari arah turun yang sebenarnya. Meleset secara acak itulah **noise**. Pada garis awal lab (slope -1, intercept 2), gradient penuhnya (-3,42; 4,00), berukuran 5,26. Di banyak kelompok acak, meleset akar-rata-rata-kuadrat (root-mean-square) sekitar 7,5 untuk satu titik, 3,7 untuk batch 4 titik, dan 1,7 untuk batch 16 titik. Setiap kali batch menjadi empat kali lebih besar, melesetnya kira-kira separuh.

Lab mengukur akibatnya sebagai **goyangan**: bagian dari panjang sebuah jalur yang tidak membawa kemajuan. Nilai 0 berarti garis lurus dan nilai mendekati 1 berarti hampir semuanya zigzag. Pada run bawaan, full batch punya goyangan 0,00, mini-batch (16) 0,14, dan SGD 0,96.

[[figure:stochastic-and-mini-batch/three-paths|Titik awal yang sama, learning rate 0,05, dan 10 epoch. Full batch berjalan lurus dalam 10 langkah, mini-batch sedikit zigzag dalam 50, dan SGD mencoret-coret lewat 800.]]

::: deeper Mengapa meleset menyusut seperti 1 per akar kuadrat b
Rata-ratakan b kesalahan yang independen, maka bagian acaknya saling meniadakan sebagian: ukuran akar-rata-rata-kuadrat dari rata-ratanya adalah ukuran satu titik dibagi akar kuadrat b. Batch empat kali lebih besar membuatnya separuh, sesuai dengan 7,5, 3,7, dan 1,7. Kelompok dalam satu epoch diambil tanpa pengembalian, sehingga di dekat b = n meleset menyusut lebih cepat lagi, dan pada b = n nilainya nol.
:::

## Awal yang cepat, akhir yang bergetar
*Metode mana yang lebih dulu turun, dan apa yang terjadi di dasar?*

Inilah run bawaan, dengan loss setelah tiap epoch:

| Epoch | Full batch | Mini-batch (16) | SGD |
|---|---|---|---|
| 0 (awal) | 7,42 | 7,42 | 7,42 |
| 1 | 6,10 | 2,90 | 0,52 |
| 2 | 5,04 | 1,33 | 0,51 |
| 3 | 4,18 | 0,78 | 0,50 |
| 10 | 1,34 | 0,50 | 0,51 |

Lab menyebut sebuah loss rendah bila sudah berada dalam 5% dari jarak antara loss awal dan loss terendah yang mungkin. Di sini angkanya sekitar 0,84. SGD sampai di sana setelah 0,14 epoch (11 langkah), mini-batch setelah 3 epoch, dan full batch tidak sampai dalam 10 epoch. Karena itu SGD butuh epoch paling sedikit tetapi mengambil langkah paling banyak, 800 dibanding 10. Per langkah, full batch yang terbaik; per epoch kerja, SGD yang terbaik.

Di dasar, gambarannya terbalik. Pada garis terbaik gradient penuh bernilai 0, tetapi gradient satu titik masih berukuran akar-rata-rata-kuadrat sekitar 1,8, dan batch 16 titik sekitar 0,4. Karena itu SGD terus terdorong: loss di akhir epoch-nya berkeliaran antara 0,50 dan 0,57, sedangkan mini-batch menetap di 0,50.

## Mengapa noise dapat membantu
*Mungkinkah dorongan ke arah yang salah ternyata berguna?*

Pada permukaan di lab, sebuah mangkuk tunggal, noise hanya merugikan. Namun "Learning rate dan masalahnya" menunjukkan kurva dengan dua lembah, tempat descent biasa dari x = 1 menetap di lembah dangkal dekat x = 2,15 dan tidak pernah mendaki punggungan di 4,72. Dinding lembah dangkal setinggi 1,06 (loss 3,65 di punggungan dibanding 2,59 di lembah); dinding lembah dalam, di x = 8,13, setinggi 2,26. Dorongan acak dapat mengangkat titik melewati dinding yang lebih rendah.

[[figure:stochastic-and-mini-batch/escape|Dua lembah, learning rate 0,1, dari x = 1. Tanpa noise, jalurnya tetap di lembah dangkal. Dengan noise acak yang ditambahkan ke tiap gradient (ukuran 4, meniru batch kecil), jalur ini melewati punggungan di langkah 32 dan berakhir dekat lembah dalam.]]

Lab tidak dapat memperlihatkan ini, karena fit garisnya hanya punya satu lembah. Noise di gambar ditambahkan dengan tangan dan hanya meniru SGD. Dalam pemeriksaan atas 200 jalur ber-seed dengan 60 langkah, 42 berakhir di sisi lembah dalam dari punggungan dengan noise sebesar itu, sedangkan jalur tanpa noise, yang selalu sama, tidak pernah menyeberang. Noise tidak menjamin lembah yang lebih baik. Ia hanya membuat lompatan menjadi mungkin.

## Learning rate yang lebih kecil menenangkan noise
*Bagaimana learning rate menentukan sekeras apa tiap sentakan?*

Tiap sentakan adalah learning rate dikali gradient yang noisy, sehingga rate yang lebih kecil berarti sentakan yang lebih kecil. Di lab dengan batch 16, loss akhir SGD adalah 0,51 pada rate 0,05 dan 0,82 pada 0,2, sementara full batch dan mini-batch sama-sama mencapai 0,50. Pada 0,3 lab menyatakan SGD meledak, artinya loss-nya melewati sepuluh kali nilai awalnya, sedangkan dua yang lain baik-baik saja. Satu titik bisa terletak jauh dari tengah, sehingga satu langkah atas titik itu saja dapat melempar garisnya.

::: deeper Mengapa batas SGD lebih rendah
Untuk satu titik dengan input x, permukaan loss melengkung dengan curvature 2 × (x² + 1), sehingga satu langkah atasnya hanya aman di bawah rate 1 / (x² + 1). |x| terbesar di sini adalah 2,54, yang memberi batas sekitar 0,13, dibanding 1 untuk full batch. Satu lompatan yang melampaui sasaran biasanya ditarik kembali oleh titik-titik berikutnya, sehingga SGD masih bertahan sedikit di atas 0,13; dengan seed 1 ia meledak di antara 0,28 dan 0,30.
:::

## Learning rate yang meluruh
*Bagaimana kita menjaga manfaat noise di awal dan membuang ongkosnya di akhir?*

Obat yang lazim adalah **decaying learning rate**: mulai besar, lalu mengecil, misalnya rate / (1 + decay × epoch). Dengan rate 0,2 dan decay 0,5, rate-nya 0,2 pada epoch pertama, 0,13 pada epoch kedua, 0,08 pada epoch keempat, dan 0,019 pada epoch kedua puluh (rumus itu menghitung epoch pertama sebagai epoch 0). Bila meluruh terlalu cepat, noise awal beserta peluangnya untuk melompat hilang terlalu dini. Lab menjaga rate tetap konstan, jadi gambar berikut dihitung dengan matematika milik lab sendiri.

[[figure:stochastic-and-mini-batch/decay|SGD selama 20 epoch pada rate 0,2. Rate konstan terus menyentak loss; rate yang meluruh dengan decay 0,5 (rate / (1 + 0,5 × epoch)) menetap mendekati loss terendah yang mungkin.]]

::: remember
- Full batch mengambil satu langkah tepat per epoch, SGD satu langkah per titik, dan mini-batch ceil(n / b). Setiap epoch mengerjakan kerja yang sama; yang berbeda adalah seberapa sering metode itu bergerak.
- Batch kecil memberi gradient yang noisy tetapi adil. Noise-nya menyusut kira-kira seperti 1 per akar kuadrat b, dan tidak pernah hilang pada SGD dengan rate konstan.
- Noise membuat sebuah jalur dapat melompat keluar dari lembah dangkal, tetapi untuk menetap ia butuh learning rate yang lebih kecil atau yang meluruh, dan SGD meledak pada rate yang masih ditoleransi full batch.
:::

@@lab

## Lab: Full batch, mini-batch, dan SGD
Tiga jalur mulai dari cincin yang sama dengan learning rate yang sama, lalu menuruni garis kontur loss dari sebuah fit garis (slope terhadap intercept). Full batch memakai semua titik per langkah, mini-batch sekelompok titik, SGD satu titik. Angka di bawah berlaku untuk pengaturan bawaan pada data buatan: **Learning rate** 0,05, **Ukuran batch (mini-batch)** 16, **Epoch** 10, dan **Seed** 1. Tekan **Reset** untuk mengembalikannya.

### Kontrol
- **Data:** **Data buatan** (80 titik dengan tren naik) atau **Penguin (data nyata)** (panjang sirip terhadap massa tubuh, keduanya distandarkan; 342 dari 344 penguin, karena 2 baris punya missing value). Catatan di bawahnya menyebutkan data mana yang sedang dimuat.
- **Learning rate:** slider berskala log dari 0,005 sampai 0,59. Lencana menampilkan rate yang dipakai, dan tombol panah menggesernya satu takik sekali tekan.
- **Ukuran batch (mini-batch):** dari 2 sampai jumlah titik (80, atau 342 pada penguin). Di ujung atas, jalur mini-batch sama dengan jalur full batch.
- **Epoch:** 1 sampai 30.
- **Seed:** 1 sampai 999. Ia menentukan urutan titik yang dipilih SGD dan mini-batch. Pada data buatan ia juga menentukan sampelnya; pada penguin ia hanya mengubah urutan.
- **Jalankan** memutar ulang jalurnya satu epoch demi satu epoch; tombol itu berganti menjadi **Jeda** lalu **Jalankan lagi**. **Langkah sebelumnya** dan **Langkah berikutnya** bergerak satu epoch, dan **Kecepatan** mengatur lajunya. Mengubah sebuah pengaturan menghitung ulang semuanya dan menampilkan jalur yang sudah selesai. **Layar penuh** memperbesar lab.
- **Kuis Cepat** adalah tombol di bawah kartu pengaturan (tombol bulat di kanan bawah pada ponsel). Tombol ini menanyakan jalur mana yang paling noisy dan mana yang mencapai loss rendah dalam epoch paling sedikit. Pilih jawaban, lalu tekan **Periksa jawaban**.

### Membaca layar
- Baris status berbunyi, misalnya, "Epoch 10 dari 10 · loss akhir: full batch 1,34, mini-batch 0,50, SGD 0,51" ("loss saat ini" selama pemutaran ulang). Baris di bawahnya memuat **Learning rate**, ukuran batch, dan jumlah titik.
- Plot **Full batch, mini-batch, dan SGD** menampilkan garis kontur loss terhadap **Slope (terstandar)** dan **Intercept (terstandar)**, cincin **Awal**, dan berlian **Garis terbaik**. Selama pemutaran ulang, sebuah cincin, sebuah berlian, dan sebuah silang menandai posisi full batch, mini-batch, dan SGD saat ini.
- Grafik **Loss di akhir tiap epoch** memplot **Epoch** terhadap **Loss**. Garis putus-putus adalah **Loss terendah yang mungkin**. Jika sebuah loss lebih tinggi daripada jangkauan grafik, sebuah segitiga berada di tepi atasnya.
- Tabel **Langkah, loss, dan goyangan ketiga optimizer** punya kolom **Optimizer**, **Langkah yang diambil**, **Loss akhir** (**Loss sejauh ini** selama pemutaran ulang), **Goyangan**, dan **Epoch menuju loss rendah**. Run yang melewati sepuluh kali loss awalnya menampilkan **meledak**, dan run yang tidak pernah mencapai loss rendah menampilkan **belum tercapai**.

### Eksperimen
1. **Siapa yang paling noisy, dan siapa yang tercepat?** Prediksikan: buka **Kuis Cepat** dan pilih jalur mana yang paling noisy dan mana yang mencapai loss rendah dalam epoch paling sedikit. Lalu tekan **Periksa jawaban**. Di tabel, **Goyangan** adalah 0,00; 0,14; dan 0,96, **Epoch menuju loss rendah** adalah **belum tercapai**, 3,00, dan 0,14, sedangkan **Langkah yang diambil** adalah 10, 50, dan 800. Jelaskan mengapa SGD menang dalam epoch tetapi kalah dalam langkah.
2. **Epoch demi epoch.** Prediksikan: setelah satu epoch, seberapa jauh tiap jalur sudah menuruni lembah? Tekan **Langkah berikutnya** sekali, lalu dua kali. Baris status berbunyi "loss saat ini: full batch 6,10, mini-batch 2,90, SGD 0,52", lalu 5,04, 1,33, dan 0,51. Periksa full batch dengan pensil: kelebihan loss di atas 0,50 menyusut 0,81 kali per langkah, maka 6,92 × 0,81 + 0,50 = 6,10.
3. **Batch size.** Prediksikan: apa yang terjadi pada goyangan dan epoch yang dibutuhkan saat **Ukuran batch (mini-batch)** naik dari 2 ke 40? Coba 2, 4, 8, dan 40. **Langkah yang diambil** adalah 400, 200, 100, dan 20, **Goyangan** adalah 0,89; 0,73; 0,43; dan 0,01, dan **Epoch menuju loss rendah** adalah 0,30; 0,75; 1,50; dan 7,50. Lalu atur 80: baris keterangan menyatakan ukuran batch sama dengan jumlah titik, dan baris mini-batch sama dengan full batch.
4. **Learning rate yang lebih besar.** Prediksikan: jalur mana yang gagal lebih dulu saat **Learning rate** naik? Atur 0,2: baris status menampilkan full batch 0,50, mini-batch 0,50, dan SGD 0,82. Atur 0,3: SGD menampilkan **meledak**, dan baris keterangan menyuruhmu menurunkan rate. Full batch masih baik-baik saja, dan pada 0,5 ia mencapai loss rendah setelah 1,00 epoch, sedangkan SGD tetap meledak. Sekarang atur **Seed** ke 2 pada 0,3: sampelnya baru, sehingga loss yang lain berubah, tetapi SGD meledak lagi. Jelaskan mengapa rate yang lembut bagi full batch bisa terlalu besar untuk langkah atas satu titik.
5. **Learning rate lebih kecil, epoch lebih banyak.** Prediksikan: apakah rate yang lebih kecil menenangkan SGD, dan apa harganya bagi full batch? Atur **Epoch** ke 20 dan coba **Learning rate** 0,2; 0,05; dan 0,01. Loss akhir SGD adalah 0,83; 0,55; dan 0,50, sedangkan full batch berakhir di 0,50; 0,60; dan 3,58. Jelaskan imbal baliknya: rate kecil membungkam getaran SGD tetapi membuat full batch merayap.
6. **Penguin nyata dan seed baru.** Prediksikan: apakah urutan yang sama berlaku pada data nyata? Tekan **Reset**, atur **Data** ke **Penguin (data nyata)**, lalu baca tabelnya: **Langkah yang diambil** adalah 10, 220, dan 3.420, dan SGD lagi-lagi paling noisy dan tercepat dalam epoch. Loss terendah yang mungkin kini 0,24, loss akhirnya 1,15; 0,24; dan 0,24, dengan **Epoch menuju loss rendah** **belum tercapai**, 0,64, dan 0,04. Sekarang atur **Seed** ke 2 lalu 3: hanya urutannya yang berubah. Loss akhir SGD bergeser ke 0,27 dan 0,28 dan goyangannya tetap 0,99, sehingga SGD masih paling noisy dan tercepat dalam epoch, sedangkan mini-batch tetap di 0,24. Kembalikan **Data** ke **Data buatan** dan coba **Seed** 2 sampai 6: urutan yang sama berlaku setiap kali. Klaim yang bertahan terhadap urutan baru, sampel baru, dan data nyata layak dipercaya.
