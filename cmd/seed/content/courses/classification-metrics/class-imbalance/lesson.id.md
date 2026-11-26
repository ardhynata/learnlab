---
slug: class-imbalance
title: Class imbalance
---
::: intro
- Jelaskan mengapa accuracy bisa tampak sangat bagus pada data yang salah satu kelasnya langka.
- Hitung baseline majority class dan nilai sebuah model dengan membandingkannya.
- Gunakan precision, recall, dan F1, serta sebutkan dua cara sederhana mengatasi imbalance: resampling dan class weights.

Sebelum mulai: baca "Measuring a classifier".
:::

## Ketika satu kelas langka
*Apa itu class imbalance, dan di mana kamu akan menemuinya?*

Sebuah dataset mengalami **class imbalance** ketika jumlah kasus di satu kelas jauh lebih banyak daripada kelas lain. Kelas yang umum disebut **majority class**, sedangkan yang langka disebut **minority class**. Biasanya kelas yang langka inilah yang sedang kamu cari, sehingga ia menjadi kelas positif dari pelajaran confusion matrix.

Positif yang langka adalah hal biasa, bukan kasus khusus. Sebagian besar pembayaran adalah pembayaran yang sah, sebagian besar email dari bank itu asli, sebagian besar pasien yang diskrining untuk penyakit langka ternyata sehat, dan sebagian besar mesin di lantai pabrik tidak akan segera rusak.

Contoh untuk pelajaran ini: sebuah layanan pembayaran memeriksa 10.000 pembayaran, dan 100 di antaranya adalah penipuan. Itu berarti positive rate sebesar 1 persen. Dengan kata lain, 99 dari 100 pembayaran adalah pembayaran sah.

[[figure:class-imbalance/rare-class|Setiap kotak mewakili 100 pembayaran. Hanya satu kotak dalam grid yang berisi penipuan.]]

Masalahnya, cara umum menilai classifier, yaitu accuracy, memperlakukan setiap kasus dengan bobot yang sama. Ketika satu kelas mencakup 99 persen data, accuracy sebagian besar hanya mengukur seberapa baik kelas itu diprediksi.

## Mengapa accuracy menyesatkan
*Dapatkah model yang sama sekali tidak menemukan penipuan mendapat skor 99 persen?*

Ambil model yang paling malas: ia menjawab "sah" untuk setiap pembayaran, apa pun isi pembayarannya. Hitung hasilnya pada 10.000 pembayaran tadi.

- Ia melewatkan semua 100 penipuan: TP = 0, FN = 100.
- Ia benar pada semua 9.900 pembayaran sah: TN = 9.900, FP = 0.
- Accuracy = (0 + 9.900) / 10.000 = 0,99.
- Recall = 0 / 100 = 0.

Dengan demikian, model ini mendapat skor 99 persen padahal tidak menangkap satu pun penipuan. Ia bahkan tidak pernah melihat datanya. Accuracy memberinya nilai tinggi untuk 9.900 kasus yang mudah dan mengabaikan 100 kasus yang justru penting.

> Gagasan kunci: accuracy adalah bagian kasus yang dijawab dengan benar, sehingga kelas yang besar menentukan nilainya. Ketika kasus yang penting jumlahnya sedikit, accuracy yang tinggi dapat menyembunyikan model yang tidak menemukan satu pun dari kasus itu.

Sekarang ambil model yang benar-benar berusaha. Pada 10.000 pembayaran yang sama, ia mendapat TP = 60, FN = 40, FP = 140, dan TN = 9.760. Accuracy-nya (60 + 9.760) / 10.000 = 0,982. Angka itu lebih rendah daripada 0,99 milik model malas, tetapi model ini menangkap 60 dari 100 penipuan. Untuk tugas yang sedang dihadapi, model ini jauh lebih berguna.

## Baseline majority class
*Angka mana yang harus dilampaui model sebelum ia dianggap berguna?*

Model malas tadi punya nama: **baseline majority class**. Ia selalu menjawab dengan majority class dan mengabaikan data. Accuracy-nya sama dengan proporsi majority class: di sini 99 persen, karena 9.900 dari 10.000 pembayaran adalah pembayaran sah.

**Baseline** adalah jawaban paling sederhana yang dapat kamu berikan tanpa belajar apa pun. Sebuah model baru bernilai jika ia mengalahkan baseline pada ukuran yang kamu pedulikan. Dari sini kamu mendapat aturan yang dapat dipakai untuk setiap angka accuracy yang disodorkan kepadamu.

> Gagasan kunci: sebelum membaca sebuah accuracy, cari positive rate dan hitung baseline majority class, yaitu 1 dikurangi positive rate. Accuracy yang sama dengan atau mendekati baseline itu hampir tidak mengatakan apa-apa.

Ada baseline kedua yang berlawanan: selalu menjawab "penipuan". Recall-nya 1 karena ia menandai setiap penipuan, tetapi precision-nya 0,01 karena hanya 100 dari 10.000 jawaban ya-nya yang benar. F1-nya 2 x 0,01 x 1 / (0,01 + 1) = 0,02. Model yang berguna harus mengalahkan keduanya.

[[figure:class-imbalance/baseline-vs-model|10.000 pembayaran yang sama, dinilai dengan baseline selalu-sah dan dengan model yang sudah dilatih. Menurut accuracy, baseline unggul; menurut recall dan F1, ia justru terakhir.]]

## Apa yang sebaiknya dilihat
*Angka mana yang tetap jujur ketika positif langka?*

Lihatlah angka-angka yang berkaitan dengan kelas positif. Kamu sudah mengenalnya dari pelajaran confusion matrix, dan semuanya tidak memedulikan tumpukan true negative.

| Angka | Pertanyaan | Model terlatih |
|---|---|---|
| Recall | Dari penipuan yang sebenarnya, berapa yang ditemukan? | 60 / 100 = 0,60 |
| Precision | Dari pembayaran yang ditandai, berapa yang benar-benar penipuan? | 60 / 200 = 0,30 |
| F1 | Apakah keduanya cukup baik? | 2 x 60 / (2 x 60 + 140 + 40) = 0,40 |

Dibaca bersama: model menemukan 60 persen penipuan, dan sekitar 3 dari 10 pembayaran yang ditandai memang penipuan. Ia menimbulkan 140 alarm palsu. Apakah itu baik bergantung pada biaya satu alarm dan satu penipuan yang terlewat, yaitu pertanyaan tentang bisnismu, bukan datanya.

Tetap perhatikan juga **confusion matrix** itu sendiri. Empat hitungan memberi informasi lebih banyak daripada skor tunggal mana pun, dan di sana 100 positif itu terlihat, padahal accuracy menyembunyikannya.

::: deeper Accuracy sebagai rata-rata berbobot
Accuracy mencampur kedua kelas menurut ukurannya masing-masing: accuracy = (positive rate) x recall + (1 - positive rate) x (proporsi negatif yang dijawab benar). Untuk model terlatih tadi, hasilnya 0,01 x 0,60 + 0,99 x (9.760 / 9.900) = 0,006 + 0,976 = 0,982. Negatif membawa bobot 0,99 sedangkan positif hanya 0,01, sehingga recall 0,60 hanya menggeser accuracy sebesar 0,006.
:::

## Positif makin langka, precision makin turun
*Mengapa model yang sama tampak lebih buruk ketika positif makin langka?*

Precision bergantung pada data, tidak hanya pada model. Misalkan model mempertahankan recall yang sama (0,60) dan perilaku alarm palsu yang sama, yaitu 140 alarm palsu di antara 9.900 pembayaran sah. Sekarang ubah satu hal saja: banyaknya kasus penipuan.

| Penipuan di antara 9.900 pembayaran sah | Positive rate | True positive | Precision |
|---|---|---|---|
| 100 | 1 persen | 60 | 60 / 200 = 0,30 |
| 1.100 | 10 persen | 660 | 660 / 800 = 0,825 |
| 9.900 | 50 persen | 5.940 | 5.940 / 6.080 = 0,977 |

Modelnya tidak membaik. Alarm palsunya tetap 140, tetapi kini ia berdampingan dengan lebih banyak tangkapan yang benar, sehingga porsi jawaban ya yang tepat menjadi lebih besar. Kebalikannya juga berlaku: model dengan precision yang tampak bagus pada test set seimbang dapat tenggelam dalam alarm palsu ketika bertemu data nyata yang langka.

[[figure:class-imbalance/precision-vs-rate|Precision dari model yang sama ketika proporsi penipuan bertambah. Ketiga titik adalah baris-baris pada tabel.]]

> Awas: nilai model pada data dengan positive rate yang akan ia temui saat dipakai. Precision yang diukur pada sampel seimbang tidak berlaku di dunia nyata.

## Cara sederhana mengatasinya
*Apa yang dapat dilakukan ketika model mengabaikan kelas yang langka?*

Model yang dilatih pada data dengan 99 persen pembayaran sah dapat memperoleh skor bagus hanya dengan condong ke "sah". Dua cara sederhana membuat kelas langka lebih diperhitungkan selama training. Pelajaran ini hanya menyebutkannya, tidak membangunnya.

- **Resampling** mengubah training set. *Oversampling* mengulang kasus langka (atau membuat kasus baru yang mirip) sampai ukuran kedua kelas lebih dekat. *Undersampling* membuang sebagian kasus yang umum.
- **Class weights** membiarkan data apa adanya, tetapi membuat setiap kasus langka berbobot lebih besar dalam loss. Jika pembayaran sah berbobot 1 dan penipuan berbobot 99, satu penipuan yang terlewat berbiaya sama dengan 99 pembayaran sah yang salah ditandai.

[[figure:class-imbalance/remedies|Contoh kecil berisi 20 pembayaran, 2 di antaranya penipuan, dan apa yang dilakukan tiap cara terhadapnya. Pada tiga baris terakhir, kedua kelas berakhir dengan pengaruh total yang sama.]]

Keduanya punya harga. Oversampling dengan mengulang kasus dapat membuat model menghafalnya. Undersampling membuang informasi. Bobot dapat mendorong model menimbulkan lebih banyak alarm palsu.

> Awas: ubah hanya data training. Biarkan validation set dan test set pada positive rate yang sebenarnya, atau metrikmu akan menggambarkan dunia yang tidak ada.

## Melaporkan hasil dengan jujur
*Apa yang perlu dicatat saat kamu melaporkan sebuah classifier pada data imbalanced?*

Daftar singkat ini membantumu tetap jujur:

1. **Sebutkan positive rate** dari data uji, beserta baseline majority class yang mengikutinya.
2. **Tunjukkan confusion matrix**, atau setidaknya TP, FP, dan FN.
3. **Laporkan precision, recall, dan F1** untuk kelas positif, bukan hanya accuracy.
4. **Jelaskan biaya tiap kesalahan**, dan mana yang kamu pilih untuk diutamakan, precision atau recall.
5. **Cantumkan ukuran sampel kelas langka.** Recall 0,60 dari 100 penipuan bertumpu pada 100 kasus. Dengan 10 penipuan, satu tangkapan tambahan menggeser recall sebesar 10 poin.

Accuracy tidak dilarang. Pada kelas yang seimbang dengan biaya kesalahan yang setara, accuracy adalah ringkasan yang baik. Intinya hanya satu: accuracy bukan angka pertama yang boleh dipercaya ketika salah satu kelas langka.

::: deeper Mengapa precision mengikuti positive rate
Dengan recall r, false-alarm rate f di antara negatif, dan positive rate p, precision = r x p / (r x p + f x (1 - p)). Di sini r = 0,60 dan f = 140 / 9.900 = 0,0141. Pada p = 0,01 hasilnya 0,006 / (0,006 + 0,014) = 0,30. Ketika p membesar, suku pertama pada penyebut ikut membesar dan suku kedua mengecil, sehingga precision naik mendekati 1.
:::

## Berikutnya: lab imbalance
*Bagaimana kamu dapat melihat semua ini bergerak?*

Pelajaran berikutnya adalah Imbalance lab. Di sana kamu dapat mengubah proporsi contoh positif dan menaruh baseline majority class di samping model terlatih. Kamu lalu dapat melihat accuracy tetap tinggi sementara recall turun tajam, dan melihat precision turun ketika positif makin langka.

Gunakan lab itu bersama daftar periksa di atas. Sebelum mengubah sebuah pengaturan, prediksikan apa yang terjadi pada accuracy, recall, dan precision. Setelah mengubahnya, jelaskan hasilnya dengan baseline. Lalu periksa penjelasanmu dengan confusion matrix yang ditampilkan lab.

::: remember
- Ketika satu kelas langka, accuracy sebagian besar hanya mengukur kelas yang besar. Bandingkan dengan baseline majority class, yaitu 1 dikurangi positive rate.
- Pada positif yang langka, lihat confusion matrix, precision, recall, dan F1. Precision juga turun ketika positif makin langka, bahkan untuk model yang sama.
- Resampling dan class weights membuat kelas langka lebih diperhitungkan saat training. Terapkan hanya pada data training; biarkan test set pada rate yang sebenarnya.
:::
