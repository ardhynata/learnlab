---
slug: scaling-and-encoding
title: Scaling dan encoding
---
::: intro
- Jelaskan mengapa sebuah feature yang diukur dengan angka besar dapat mendominasi jarak, dan model mana yang terkena dampaknya.
- Ubah skala sebuah kolom dengan tangan memakai standardisasi dan min-max, lalu sebutkan apa yang dilakukan sebuah outlier pada masing-masing.
- Perkirakan di Scale it lab bagaimana tetangga dan accuracy berubah pada setiap scaling, lalu periksa gagasannya pada penguin yang asli.

Sebelum mulai: baca "Distance and similarity" dan "Missing values and encoding". Pelajaran pertama memberimu jarak; yang kedua memberimu kolom one-hot dan kebiasaan men-fit hanya pada baris training.
:::

## Mengapa angka mentah menyesatkan
*Bagaimana sebuah model dapat mengabaikan kolom yang kamu berikan?*

Rumus jarak mengurangkan angka lalu menjumlahkan kuadratnya. Rumus itu tidak tahu bahwa satu kolom berisi dolar dan kolom lain berisi tahun. Kolom dengan angka yang lebih besar selalu menang.

Ambil dua orang yang berbeda $1.000 dalam pendapatan dan 30 tahun dalam usia. Setelah dikuadratkan, selisih pendapatan menjadi 1.000.000 dan selisih usia menjadi 900. Pendapatan menyumbang lebih dari 99,9% jarak kuadrat itu, sehingga usia seolah-olah tidak ada.

Hal ini berlaku untuk setiap model yang bertumpu pada jarak. Dua contohnya: k-nearest neighbors (k-NN) memberi label pada sebuah titik berdasarkan kelompok mayoritas dari k titik terdekatnya, dan k-means mengelompokkan titik di sekitar k pusat. Untuk model berbasis jarak, perbaikannya adalah menyamakan skala kolom sebelum mengukur apa pun. Perbaikan itu disebut **scaling**.

[[figure:scaling-and-encoding/equal-distance|Dengan jarak mentah, siapa pun yang selisihnya sekitar $4.000 dari titik query dianggap dekat, berapa pun usianya (kiri). Setelah standardisasi (bagian berikutnya), dekat berarti dekat pada kedua feature (kanan).]]

> Gagasan kunci: jarak menjumlahkan selisih yang diukur dalam satuan berbeda. Samakan dulu skalanya, kalau tidak kolom dengan angka terbesar yang memutuskan segalanya.

## Standardisasi
*Bagaimana membuat setiap kolom memiliki ukuran tipikal yang sama?*

**Standardisasi** mengubah setiap nilai menjadi **z-score**:

`z = (value - mean) / standard deviation`

Kamu sudah mengenal rata-rata dan simpangan baku dari "Center and spread". **Rata-rata** (mean) adalah jumlah semua nilai dibagi banyaknya nilai. **Simpangan baku** (standard deviation) menunjukkan seberapa jauh nilai biasanya berada dari rata-rata: kuadratkan setiap selisih dari rata-rata, hitung rata-rata kuadrat itu, lalu ambil akar kuadratnya. (Pelajaran ini membagi dengan banyaknya nilai, seperti yang dilakukan lab.)

Z-score menyatakan berapa simpangan baku sebuah nilai berada dari rata-rata. Z-score 0 adalah nilai rata-rata, +1,5 berarti satu setengah simpangan baku di atas rata-rata, dan -1 berarti satu di bawahnya. Setelah standardisasi, setiap kolom memiliki rata-rata 0 dan simpangan baku 1, apa pun satuan aslinya.

Misalnya, jika usia memiliki rata-rata 40 dan simpangan baku 8, orang berusia 52 memiliki z = (52 - 40) / 8 = 1,5.

Standardisasi mempertahankan bentuk data. Ia hanya menggeser kolom sehingga rata-ratanya 0 dan merenggangkannya sehingga sebarannya 1.

## Min-max scaling dan outlier
*Bagaimana memasukkan kolom ke rentang 0 sampai 1, dan apa yang dapat merusaknya?*

**Min-max scaling** memampatkan sebuah kolom ke rentang 0 sampai 1:

`scaled = (value - min) / (max - min)`

Jika pendapatan berkisar dari $20.000 sampai $120.000, pendapatan $45.000 menjadi (45.000 - 20.000) / 100.000 = 0,25.

Standardisasi adalah pilihan awal yang baik. Min-max berguna ketika sebuah metode mengharapkan rentang tetap, seperti kecerahan piksel.

> Awas: kedua scaling ditarik oleh outlier, dan min-max yang paling mudah terlihat. Outlier adalah nilai yang jauh dari yang lain. Nilai terkecil dan terbesar menentukan arti 0 dan 1, sehingga satu nilai ekstrem menentukan rentang untuk semua orang.

[[figure:scaling-and-encoding/outlier-squeeze|Satu nilai 240 di antara nilai-nilai dari 40 sampai 60. Min-max menaruh sebelas nilai lainnya di antara 0 dan 0,1. Standardisasi juga memampatkannya, di antara -0,49 dan -0,11. Tanpa 240, nilai-nilai itu tersebar sekitar -1,6 sampai +1,6.]]

Lihat nilai terkecil dan terbesar sebuah kolom sebelum kamu men-scale-nya.

::: deeper Apa yang dilakukan terhadap outlier
Ada tiga pilihan umum, masing-masing dengan harganya. **Clipping** membatasi nilai pada batas yang kamu pilih, sehingga nilai ekstrem tidak lagi meregangkan rentang. **Transformasi log** menarik ekor panjang berisi angka positif besar, seperti pendapatan. **Robust scaling** memakai median (nilai tengah setelah diurutkan) dan interquartile range (sebaran separuh nilai di tengah) sebagai pengganti rata-rata dan simpangan baku, sehingga beberapa nilai ekstrem nyaris tidak menggesernya. Tidak ada yang selalu benar: tanyakan dulu apakah nilai ekstrem itu sebuah kesalahan atau orang yang memang ada.
:::

## Contoh hitungan lengkap
*Dapatkah scaling mengubah siapa yang dianggap terdekat?*

> Contoh hitungan: tiga orang dengan (pendapatan, usia): Ana ($51.000, 30), Ben ($50.000, 60) dan Cy ($55.000, 33). Siapa yang paling mirip dengan Ana?

**Jarak mentah.**
- Ana ke Ben: selisihnya 1.000 dan 30, sehingga jaraknya akar kuadrat dari 1.000.000 + 900 = 1.000.900, sekitar 1.000,4.
- Ana ke Cy: selisihnya 4.000 dan 3, sehingga jaraknya akar kuadrat dari 16.000.009, sekitar 4.000,0.

Menurut jarak mentah, Ben empat kali lebih dekat, padahal ia 30 tahun lebih tua.

## Contoh yang sama setelah di-scale
*Apakah urutannya berubah setelah kolom-kolomnya setara?*

Tiga orang yang sama: Ana ($51.000, 30), Ben ($50.000, 60) dan Cy ($55.000, 33).

**Standardisasi.** Rata-rata pendapatan = (51.000 + 50.000 + 55.000) / 3 = 52.000. Rata-rata usia = (30 + 60 + 33) / 3 = 41.

- Selisih pendapatan dari rata-rata: -1.000, -2.000, +3.000. Kuadratnya: 1.000.000, 4.000.000, 9.000.000. Rata-ratanya 14.000.000 / 3, sekitar 4.666.667, dan akar kuadratnya sekitar 2.160.
- Selisih usia: -11, +19, -8. Kuadratnya: 121, 361, 64. Rata-ratanya 546 / 3 = 182, dan akar kuadratnya sekitar 13,49.

| Orang | Z pendapatan | Z usia |
|---|---|---|
| Ana | -1.000 / 2.160 = -0,46 | -11 / 13,49 = -0,82 |
| Ben | -2.000 / 2.160 = -0,93 | +19 / 13,49 = +1,41 |
| Cy | +3.000 / 2.160 = +1,39 | -8 / 13,49 = -0,59 |

**Jarak baru.**
- Ana ke Ben: selisihnya 0,47 dan 2,23, sehingga jaraknya akar kuadrat dari 0,22 + 4,97, sekitar 2,3.
- Ana ke Cy: selisihnya 1,85 dan 0,23, sehingga jaraknya akar kuadrat dari 3,42 + 0,05, sekitar 1,9.

(Hitungan ini memakai z-score yang sudah dibulatkan di tabel. Kalkulator pada nilai yang belum dibulatkan memberi 2,27 dan 1,86.)

Sekarang Cy yang terdekat, sesuai dengan penilaian orang pada umumnya. Urutannya berbalik karena usia akhirnya ikut diperhitungkan. Min-max memberi urutan yang sama: 1,02 ke Ben dan 0,81 ke Cy.

## Model mana yang membutuhkan scaling
*Siapa yang dirugikan oleh satuan yang tidak sama, dan siapa yang tidak?*

Scaling penting bagi setiap metode yang mengukur jarak antar baris. k-NN mengukurnya untuk mencari tetangga. Metode clustering seperti k-means dan DBSCAN, yang dibahas di course berikutnya, mengukurnya dari setiap titik ke sebuah pusat atau ke tetangganya. Pada semuanya, kolom dengan satuan besar diam-diam mengambil alih.

Decision tree berbeda. Setiap split-nya membandingkan satu feature dengan sebuah threshold, sehingga perubahan satuan sebuah kolom tidak mengubah baris mana yang jatuh ke sisi mana. Tree tidak membutuhkan scaling.

Scaling mengubah tetangga, bukan hanya angkanya. Di Scale it lab tanpa scaling, lima tetangga terdekat dari satu query adalah lima orang yang pendapatannya paling dekat, berapa pun usia mereka. Setelah kolom di-scale, query yang sama mendapat tetangga yang dekat pada kedua feature. Accuracy model k-NN ikut berubah bersamanya.

> Gagasan kunci: lakukan scaling pada feature setiap kali model membandingkan baris berdasarkan jarak. Scale hanya feature, bukan label kelas: label kelas adalah sebuah nama, bukan besaran.

## Scaling di samping kolom one-hot
*Seberapa besar ketidakcocokan sebuah kategori dibandingkan selisih sebuah angka?*

Di "Missing values and encoding", sebuah kategori menjadi kolom one-hot, dengan angka 1 untuk kategori baris itu dan 0 di kolom lainnya. Kolom-kolom ini sudah berada di antara 0 dan 1, seperti kolom min-max, dan pelajaran ini membiarkannya apa adanya.

Ambil dua orang yang berbeda warna, misalnya merah (1, 0, 0) dan biru (0, 0, 1). Dua kolom berbeda, masing-masing sebesar 1, sehingga jarak dari warna saja adalah akar kuadrat dari 1 + 1, sekitar 1,41. Scale it lab menggambar tabel ini di bawah perbandingannya.

[[figure:scaling-and-encoding/one-hot|Satu kolom warna menjadi tiga kolom, dengan tepat satu angka 1 di setiap baris. Dua warna yang berbeda selalu berjarak 1,41.]]

Sekarang letakkan warna di samping angka yang sudah distandardisasi. Ketidakcocokan warna berharga kira-kira sama dengan selisih 1,41 simpangan baku pada feature yang distandardisasi. Keduanya berada pada skala yang sebanding, sehingga masing-masing ikut menentukan.

Biarkan angkanya mentah dan warna lenyap. Ketidakcocokan menambah 2 pada jarak kuadrat, sedangkan selisih pendapatan $1.000 menambah 1.000.000.

## Fit scaler pada baris training
*Dari mana rata-rata dan simpangan baku sebaiknya berasal?*

**Scaler** adalah sebuah aturan seperti standardisasi, bersama angka-angka yang dipelajarinya: rata-rata dan simpangan baku, atau nilai minimum dan maksimum. Men-**fit** sebuah scaler berarti menghitung angka-angka ini dari beberapa baris. Seperti imputer dan encoder di pelajaran sebelumnya, fit scaler hanya pada baris training, lalu pakai angka yang sama, tanpa diubah, pada baris test dan pada data baru apa pun. "Train, validation and test" menjelaskan mengapa baris test harus tetap tidak terlihat.

[[figure:scaling-and-encoding/no-leak|Scaler di-fit hanya pada baris training, lalu dipakai tanpa diubah pada baris test.]]

Nilai pada baris test dapat jatuh di bawah 0 atau di atas 1 pada min-max. Itu wajar: baris tersebut berada di luar yang pernah dilihat saat training. Melakukan fit ulang pada baris test akan menyebabkan leakage: data test ikut membentuk inputnya, seperti di pelajaran sebelumnya.

## Urutan langkah dan jalan pintas lab
*Dalam urutan apa langkah-langkahnya berjalan, dan apa yang dilewati lab?*

Isi dulu bagian yang kosong, lalu encode, lalu scale, semuanya di-fit pada baris training. Sel kosong tidak dapat di-scale, dan rata-rata harus dihitung dari data yang sudah terisi. Pelajaran berikutnya, "Pipelines and leakage", merangkai langkah-langkah ini agar urutannya selalu benar, lalu mengukur apa yang dilakukan leakage.

Scale it lab men-fit scaler-nya pada semua 60 orang, jalan pintas yang diperingatkan pelajaran ini. Di sana hal itu tidak berbahaya: lab hanya menunjukkan bagaimana scaling mengubah tetangga.

::: remember
- Jarak menjumlahkan selisih mentah, sehingga feature dengan angka terbesar mendominasi kecuali kamu melakukan scaling. Tree tidak peduli; k-NN dan clustering peduli.
- Lakukan standardisasi dengan z = (value - mean) / standard deviation, atau min-max dengan (value - min) / (max - min). Satu outlier meregangkan keduanya. Fit keduanya hanya pada baris training dan pakai ulang angkanya.
- Kolom one-hot sudah berada di antara 0 dan 1, dan dua warna yang berbeda berjarak 1,41, sehingga angka yang di-scale dan kolom one-hot memiliki suara yang sebanding dalam sebuah jarak.
:::

@@lab

## Lab: Scale it
Enam puluh orang dijelaskan oleh pendapatan dalam dolar dan usia dalam tahun. Kedua kelompok terutama berbeda dalam usia: **Grup A (lebih muda)** dan **Grup B (lebih tua)**. Sebuah model k-NN menentukan grup dari belah ketupat, yaitu query, berdasarkan tetangga terdekatnya. Kamu memilih lebih dulu bagaimana angka di-scale. Lab hanya memiliki data buatan, sehingga eksperimen terakhir membawa gagasannya ke penguin yang asli dengan pensil.

### Kontrol
- **Scaling** memilih **Tanpa (angka mentah)**, **Standardisasi (z-score)** atau **Min-max (0 sampai 1)**. Plot selalu menampilkan data seperti yang dilihat model, pada sumbu dengan skala yang sama, dan judul sumbunya berubah mengikuti scaling. Pada Tanpa, sumbu usia memakai skala berukuran dolar yang sama dengan pendapatan, sehingga usia 18 sampai 70 berada di dasar sekali.
- **k (jumlah tetangga yang vote)** menentukan berapa tetangga terdekat yang melakukan vote, dari 1 sampai 15.
- **Pendapatan titik query** dan **Usia titik query** menaruh belah ketupat dengan tepat. Kamu juga dapat menggeser belah ketupat, mengklik plot, atau memakai tombol panah pada plot (Shift menggeser lebih jauh). Pada Tanpa, menggeser hanya mengubah pendapatan, karena plot tidak memiliki ruang untuk usia: pakai **Usia titik query**.
- **Tampilkan k tetangga terdekat** melingkari setiap pemilih, menarik garis putus-putus ke arahnya, dan mengarsir lingkaran yang tepat menjangkau pemilih terjauh.
- **Layar penuh** dan **Reset** ada di setiap lab. Reset mengembalikan ke Tanpa, k = 5, dan query awal ($85.000, usia 27).

### Membaca layar
- Legenda menyebut **Grup A (lebih muda)**, **Grup B (lebih tua)**, **Query (bisa digeser)** dan, selama tetangga ditampilkan, **Dilingkari: k tetangga terdekatnya**.
- Baris status berbunyi, misalnya, "Tanpa scaling: akurasi leave-one-out 42% dengan k = 5". Akurasi leave-one-out memperlakukan setiap orang bergantian sebagai orang yang tidak diketahui dan mengklasifikasikannya dari 59 orang lainnya.
- Baris detail memberi query dan vote-nya, misalnya "Titik query ($85.000, usia 27) diprediksi Grup B: 2 vote untuk Grup A, 3 untuk Grup B." Pada Tanpa, plot juga menulis "Semua 60 orang menumpuk di jalur tipis di bawah ini."
- Tabel **Bandingkan ketiga cara scaling** memiliki kolom **Scaling**, **Akurasi**, **Prediksi** dan **Tetangga** untuk ketiga scaling sekaligus, dan menandai yang sedang ada di plot dengan "(tampil)". **Tetangga** mencantumkan grup dari k tetangga terdekat, dari yang terdekat.
- Di bawah tabel itu, tabel kedua menunjukkan one-hot encoding sebuah kolom warna: kolom is_merah, is_hijau dan is_biru, dengan satu angka 1 di setiap baris.

### Eksperimen
1. Prediksikan: dengan **Scaling** pada **Tanpa (angka mentah)** dan **k (jumlah tetangga yang vote)** pada 5, grup mana yang didapat query berusia 27 tahun, dan seberapa sering model benar? Lalu baca baris detail dan tabelnya. Query diprediksi Grup B, **Tetangga** berbunyi A A B B B, dan **Akurasi** 42%, lebih buruk daripada lempar koin. Kelima pemilih berpendapatan antara $84.700 dan $86.300 tetapi berusia 18, 26, 45, 59 dan 60. Jelaskan mengapa: tanpa scaling, hanya pendapatan yang memilih tetangga.
2. Prediksikan: apa yang akan dilakukan perubahan **Scaling** ke **Standardisasi (z-score)** terhadap tetangga dan accuracy? Coba, lalu **Min-max (0 sampai 1)**. Titik-titiknya menyebar menjadi scatter yang sesungguhnya, **Akurasi** melonjak ke 92% untuk keduanya, dan query diprediksi Grup A dengan lima tetangga Grup A. Sekarang atur **Usia titik query** ke 40: Standardisasi memprediksi Grup B (3 vote lawan 2) dan Min-max memprediksi Grup A (3 vote lawan 2). Mengapa dua scaling yang baik dapat berbeda pendapat tentang titik di perbatasan?
3. Prediksikan: dengan **Tanpa (angka mentah)** dan k = 5, apakah menggeser **Usia titik query** dari 27 ke 60 akan mengubah tetangga? Coba. Sel **Tetangga** tetap A A B B B, lima orang yang sama. Sekarang pilih **Standardisasi (z-score)** dan ulangi: prediksinya berpindah dari Grup A pada usia 27 ke Grup B pada usia 60, dengan lima tetangga Grup B.
4. Prediksikan: dapatkah **k (jumlah tetangga yang vote)** yang lebih besar menyelamatkan data yang tidak di-scale? Geser k dari 1 ke 15 pada setiap scaling dan baca **Akurasi**. Tanpa scaling tetap di antara 22% dan 57% dan tidak pernah mencapai 60%. Pendapatan saja tidak membedakan kedua grup, jadi skor di sekitar atau di bawah 50% tidak berarti lab-nya rusak. Standardisasi tetap di antara 92% dan 95%, dan Min-max di antara 90% dan 93%, tidak pernah berselisih lebih dari 2 poin. Mengubah k tidak memperbaiki satuan.
5. Prediksikan: bentuk apa yang akan dimiliki lingkaran berarsir pada setiap scaling? Nyalakan **Tampilkan k tetangga terdekat** dan geser belah ketupat. Pada Standardisasi lingkarannya bulat dan para pemilih dekat pada kedua feature. Pada Tanpa lingkarannya kecil sekali di atas jalur itu, dan para pemilih hanyalah orang dengan pendapatan terdekat.
6. Prediksikan: apakah jarak mentah atau jarak yang distandardisasi memilih spesies yang benar untuk query Chinstrap? Lalu pindah ke penguin yang asli dengan tangan. Ke-342 penguin yang memiliki pengukuran punya simpangan baku sekitar 5,45 mm pada panjang paruh dan 801 g pada massa tubuh. Ambil query Chinstrap (46,5 mm, 3.500 g) dengan dua kandidat, kandidat 1 seekor Adelie (36,7 mm, 3.450 g) dan kandidat 2 seekor Chinstrap (46,1 mm, 3.250 g), lalu cari yang terdekat. Mentah: kandidat 1 berjarak 51,0 dan kandidat 2 berjarak 250,0, sehingga data mentah memilih spesies yang salah. Bagi setiap selisih dengan simpangan bakunya: kandidat 1 berjarak 1,80 dan kandidat 2 berjarak 0,32, sehingga standardisasi memilih yang benar. Sekarang periksa pada pilihan baru: query Adelie (39,1 mm, 3.750 g) dengan kandidat 1 seekor Chinstrap (51,3 mm, 3.750 g) dan kandidat 2 seekor Adelie (40,5 mm, 3.950 g). Data mentah memberi 12,2 dan 200,0, yang memilih Chinstrap. Setelah standardisasi hasilnya 2,24 dan 0,36, yang memilih Adelie. Pada ukuran penuh, k-NN leave-one-out dengan k = 5 pada seluruh 342 penguin mendapat 79% dengan panjang paruh dan massa tubuh mentah, dan 93% dengan scaling mana pun.
