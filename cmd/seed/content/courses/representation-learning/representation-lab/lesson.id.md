---
slug: representation-lab
title: Lab representasi
---
::: intro
- Bandingkan representasi pretrained yang dibekukan dengan fitur yang dipelajari dari set berlabel kecil, pada baris test yang sama.
- Perkirakan bagaimana ukuran kode, lama pretraining, dan noise mengubah perbandingan itu, lalu periksa di lab.
- Uji gagasan ini pada penguin yang nyata dengan pembagian baru sebelum kamu mempercayainya.

Sebelum mulai: baca "Embedding dan autoencoder" serta "Transfer learning dan self-supervision" di kursus ini. Kamu akan memakai kode, bottleneck, encoder yang dibekukan, dan aturan bahwa representasi pretrained harus mengalahkan pilihan yang sederhana.
:::

## Apa yang ditanyakan lab
*Apa tepatnya yang dibandingkan Lab representasi?*

Pelajaran sebelumnya ditutup dengan sebuah aturan: kode pretrained baru dihitung setelah ia mengalahkan fitur mentah dan fitur yang dipelajari dari set berlabel kecil, pada baris yang sama. Lab ini memberimu tempat untuk menerapkan aturan itu.

Lab menggambar gambar kecil berukuran 8 kali 8 yang disebut glyph. Ada empat bentuk: Batang vertikal, Silang, Kotak, dan Diagonal. Setiap piksel dibalik dengan peluang 15%, sehingga setiap gambar sedikit berantakan. Ada tiga set: 400 glyph tanpa label, tempat autoencoder belajar; 240 glyph test yang disisihkan; dan set berlabel berisi 100 glyph per bentuk, yang hanya kamu pakai sebagian kecil. Menebak acak memberi 25%.

Lab dimulai dengan autoencoder yang kodenya terdiri dari 8 angka tetapi belum mempelajari apa pun. Saat kamu menekan **Pretrain pada glyph tanpa label**, ia berlatih pada 400 glyph itu dan tidak pernah melihat label. 

> Gagasan kunci: autoencoder adalah satu-satunya bagian yang memakai 400 glyph tanpa label. Setiap classifier dalam perbandingan memakai glyph berlabel yang sama dan dinilai pada 240 glyph test yang sama.

## Tiga cara memakai sedikit label
*Tiga classifier apa yang dinilai lab?*

Setiap arm mendapat glyph berlabel yang sama, misalnya 5 per bentuk, 20 semuanya. Perbedaannya ada pada apa yang dilihat classifier, dan pada berapa banyak angka yang harus ditentukan oleh label.

| Arm | Melihat | Label melatih | Angka yang ditentukan |
| --- | --- | --- | --- |
| Fitur pretrained yang dibekukan | kode 8 angka | classifier linear | 36 |
| Piksel mentah | 64 piksel | classifier sejenis | 260 |
| Network dari nol | 64 piksel | network kecil, seluruhnya | 2.116 |

Classifier-nya berpola one-vs-rest (setiap model menjawab ya atau tidak untuk satu bentuk), sehingga ada empat model. Arm beku menentukan 4 × (8 bobot + 1 bias) = 36 angka. Arm mentah menentukan 4 × (64 + 1) = 260. Network punya 8 hidden unit (8 angka tengah yang dihitungnya dari piksel): 64 × 8 + 8 = 520 angka di hidden layer dan 8 + 1 = 9 di output, sehingga 529 per model dan 4 × 529 = 2.116 semuanya.

[[figure:representation-lab/three-arms|Tiga arm. Hanya arm beku yang mendapat representasi dari 400 glyph tanpa label. Kolom kanan menghitung angka yang harus ditentukan label pada 5 glyph berlabel per bentuk.]]

Network dari nol adalah "fitur yang dipelajari dari dataset berlabel kecil" dalam silabus: ia membangun fiturnya sendiri, tetapi hanya dari 20 glyph berlabelnya. Piksel mentah adalah baseline yang sederhana.

## Membaca percobaan pertama
*Apa yang dikatakan angka-angka pertama?*

Tekan **Reset**, lalu **Pretrain pada glyph tanpa label**. Baris status berbunyi "Dipretrain 20 epoch. Error test 0,128 per piksel (0,252 sebelumnya)." Angka "sebelumnya" adalah autoencoder yang belum dilatih pada glyph test yang sama, dan tabel terisi seiring skor selesai dihitung. Tanda strip berarti belum dipretrain dan tiga titik berarti masih dihitung.

Pada 5 glyph berlabel per bentuk, tabel berbunyi:

| Arm | Akurasi test |
| --- | --- |
| Fitur beku | 94,2% |
| Piksel mentah | 85,1% |
| Dari nol | 79,2% |

> Contoh hitungan: keunggulan fitur beku atas piksel mentah adalah 94,2 - 85,1 = 9,1 poin, dan atas network dari nol 94,2 - 79,2 = 15,0 poin. Satu glyph test bernilai 1 / 240, sekitar 0,4 poin, dan setiap skor adalah rata-rata dari 3 set berlabel (2 untuk network), sehingga selisih satu poin atau lebih kurang itu hanyalah noise. Lab menyebut selisih di bawah 3 poin "hampir sama".

Kode beku menang di sini kemungkinan karena 36 angkanya mudah ditentukan dari 20 baris, dan 400 glyph tanpa label sudah mengajari kode itu di mana bentuk-bentuk berbeda. Lab tidak memisahkan salah satu dari kedua penyebab itu.

## Ketika label melimpah
*Apakah keunggulan fitur beku bertahan saat set berlabel membesar?*

Baca tabel dari atas ke bawah. Kolom beku hampir tidak bergerak: 94,2%, 94,3%, 94,6%, 94,4%, 94,6% pada 5, 10, 25, 50, dan 100 per bentuk. Kolom mentah naik: 85,1%, 88,5%, 93,2%, 95,0%, 95,8%. Pada 25 per bentuk keunggulan fitur beku tinggal 1,4 poin, hampir sama. Pada 50 dan 100, piksel mentah unggul 0,6 dan 1,2 poin, juga hampir sama.

[[figure:representation-lab/labels-curve|Akurasi test terhadap glyph berlabel per bentuk, pada skala log, dengan pengaturan awal lab. Garis beku tinggi dan datar; garis piksel mentah dan dari nol naik menyusulnya.]]

Dua hal terjadi. Classifier beku dibatasi oleh kodenya: 8 angka dari pretraining 20 epoch sudah bagus, tetapi tidak dapat membawa detail yang mungkin masih berguna bagi classifier. Classifier mentah dibatasi oleh label: dengan label lebih banyak, ia mempelajari bentuknya sendiri. Jadi representasi pretrained paling bermanfaat saat label paling sedikit, yaitu situasi yang memang ditujukan untuk transfer learning.

> Awas: network dari nol berada di bawah fitur beku pada setiap ukuran, dan jelas di bawahnya (lebih dari 3 poin) sampai 25 per bentuk. Mulai 50 per bentuk ketiga arm berselisih kurang dari 3 poin; pada 100 skornya 94,6%, 95,8%, dan 93,5%. Apakah sebuah keunggulan nyata, itu bergantung pada anggaran label.

## Ukuran kode dan pretraining
*Pengaturan pretraining mana yang menentukan apakah kode beku membantu?*

Ubah **Ukuran bottleneck (jumlah angka dalam kode)** lalu tekan **Pretrain pada glyph tanpa label** lagi, karena lab membuang autoencoder yang lama. Pada 5 per bentuk, akurasi beku adalah 72,2% dengan 3 angka, 94,2% dengan 8, dan 93,3% dengan 16, sementara piksel mentah tetap 85,1%. Kode 3 terlalu sempit: hasilnya lebih buruk daripada tanpa pretraining sama sekali, yang disebut **negative transfer**.

Sekarang bandingkan error rekonstruksinya: 0,131, 0,128, dan 0,126. Ketiganya hampir sama, tetapi akurasi beku berbeda lebih dari 20 poin. Perubahan kecil pada seberapa baik gambar dibangun ulang dapat menyembunyikan perubahan besar pada seberapa berguna kode itu.

**Epoch pretraining** bekerja dengan cara yang sama. Dengan 5 epoch, errornya 0,139 dan akurasi beku 76,3%. Dengan 20, errornya 0,128 dan akurasinya 94,2%. Dengan 100, 0,123 dan 93,8%. Epoch awal penting; epoch sesudahnya hampir tidak.

[[figure:representation-lab/knobs|Akurasi beku pada 5 glyph berlabel per bentuk. Kiri: ukuran bottleneck 3, 8, dan 16. Kanan: 5, 20, dan 100 epoch pretraining. Garis putus-putus adalah piksel mentah pada 85,1%.]]

## Ketika noise menyembunyikan bentuk
*Dapatkah representasi menyelamatkan data yang terlalu sulit, atau terlalu mudah?*

Atur **Noise (peluang piksel terbalik)** ke 0% lalu pretrain lagi. Ketiga arm mendapat 100,0% di setiap ukuran, sehingga tidak ada yang dapat ditambahkan oleh pretraining. Tugasnya begitu mudah sehingga piksel mentah sudah cukup.

Atur noise ke 35%. Pada 2 per bentuk fitur beku masih unggul tipis, 38,6% dibandingkan 35,0% untuk mentah. Pada 5 per bentuk, skor arm adalah 38,7% (beku), 40,0% (mentah), dan 35,8% (dari nol), dibandingkan 25% untuk tebakan acak, sehingga keunggulan itu hilang. Pada 100 per bentuk skornya menjadi 55,0%, 62,5%, dan 54,6%, dan piksel mentah unggul 7,5 poin atas fitur beku.

> Gagasan kunci: pretraining membantu di tengah-tengah. Jika tugasnya sepele, baseline sudah menang. Jika noise telah menghancurkan apa yang memisahkan kelas-kelas, kode hanya dapat mengembalikan sedikit darinya, karena kode itu dibangun dari gambar-gambar yang sama-sama ber-noise.

## Membaca peta
*Mengapa skor milik peta berbeda dari skor classifier?*

Perhatikan petanya. Scatter plot menunjukkan 2 sumbu utama pertama dari kode untuk glyph test, dengan glyph berlabelmu sebagai belah ketupat. Baris status menambahkan berapa banyak glyph test yang terletak paling dekat dengan pusat kelasnya sendiri. Angka itu mengambil pusatnya dari label semua 240 glyph test, sedangkan classifier hanya punya 20, sehingga angka itu mengukur seberapa terpisah kelas-kelasnya, bukan apa yang dapat dimanfaatkan oleh 20 label. Dengan 3 angka nilainya 86%, namun classifier mendapat 72,2%.

## Uji yang sama pada penguin
*Apakah gagasan ini berlaku pada pengukuran yang nyata?*

Pilih **Penguin (data nyata)**. Lab memakai empat pengukuran dari 342 penguin yang tidak punya missing value, diskalakan ke 0 sampai 1, lalu membaginya dua per spesies: 172 untuk pool dan 170 untuk set test. Pool itu hanya diperlakukan sebagai data tanpa label oleh autoencoder. Tebakan acak memberi 33%. Lab mengatur bottleneck ke 2 dan epoch ke 100 untukmu.

Tekan **Pretrain pada penguin tanpa label**. Pada 5 per spesies (15 semuanya) fitur beku mendapat 82,5%, pengukuran mentah 98,8%, dan network dari nol 99,1%. Baris status melaporkan error test autoencoder 0,0062 per pengukuran, dan PCA dengan 2 komponen berada di 0,0059, sehingga pada pembagian ini autoencoder nonlinear membangun ulang penguin hampir sama baiknya dengan PCA linear dari kursus Reduksi dimensi.

Pada pembagian ini kode 2 angka kebanyakan mencampuradukkan Adelie dan Chinstrap, sedangkan Gentoo hampir selalu benar. Dengan 4 pengukuran, input mentah sudah pendek dan informatif, dan memampatkannya menjadi 2 angka membuang bagian yang membedakan dua dari ketiga spesies.

[[figure:representation-lab/penguin-splits|Akurasi test pada 5 penguin berlabel per spesies di empat pembagian yang berbeda. Kode 2 angka selalu berada di bawah pengukuran mentah; kode 3 angka sejajar dengannya.]]

## Pembagian baru
*Apakah jawabannya berubah pada pembagian lain?*

Atur bottleneck ke 3 dan pretrain lagi: fitur beku mendapat 98,2%, mentah 98,8%, hampir sama. Representasi beku bukan peningkatan gratis: ia harus cukup lebar untuk tugasnya.

Satu pembagian hanyalah satu kali pengambilan. Tekan **Pembagian baru** lalu ulangi. Dengan kode 2 angka, akurasi beku adalah 82,5%, 86,1%, 90,2%, dan 91,2% pada empat pembagian, dibandingkan mentah 98,8%, 97,5%, 98,2%, dan 98,8%. Selisih mentahnya adalah 16,3, 11,4, 8,0, dan 7,6 poin, dengan rata-rata 10,8. Dengan 3 angka skor beku adalah 98,2%, 98,0%, 97,8%, dan 98,2%, selalu dalam 0,6 poin dari mentah.

## Kesimpulan yang adil
*Bagaimana kamu melaporkan perbandingan ini?*

Pernyataan yang adil karena itu berbunyi: pada glyph, dengan sedikit label dan kode 8 angka, fitur pretrained yang dibekukan mengalahkan pilihan sederhana sebesar 9 sampai 15 poin pada 5 per bentuk, dan keunggulan itu memudar pada 25 sampai 50 per bentuk. Pada penguin, kode 2 angka kalah sekitar 11 poin rata-rata, dan kode 3 angka seri.

Selalu tulis anggaran label, ukuran kode, dan jumlah pembagian di samping klaimmu.

::: remember
- Fitur pretrained yang dibekukan menang ketika label langka dan kodenya cukup lebar: pada 5 per bentuk, 94,2% dibandingkan 85,1% (mentah) dan 79,2% (dari nol). Keunggulannya memudar seiring label bertambah.
- Kode yang sempit atau pretraining yang terlalu singkat dapat membuat fitur beku lebih buruk daripada mentah (72,2% dengan 3 angka, 76,3% dengan 5 epoch), dan perubahan kecil pada error rekonstruksi dapat menyembunyikan perubahan besar pada kegunaannya.
- Nilai berdasarkan anggaran label, ukuran kode, dan beberapa pembagian: pada penguin kode 2 angka kalah sekitar 11 poin rata-rata, dan kode 3 angka seri.
:::

@@lab

## Lab: representasi
Kamu mulai dengan glyph 8 kali 8 buatan dan autoencoder yang belum mempelajari apa pun. Kamu melakukan pretraining pada glyph tanpa label, lalu membandingkan tiga classifier pada contoh berlabel yang sama dan glyph test yang sama.

### Kontrol
- **Data** berpindah antara **Data buatan** dan **Penguin (data nyata)**. Berpindah data juga mengatur **Ukuran bottleneck (jumlah angka dalam kode)** dan **Epoch pretraining** ke nilai awal data itu (8 dan 20 untuk glyph, 2 dan 100 untuk penguin), dan membuang autoencoder.
- **Ukuran bottleneck (jumlah angka dalam kode)** (2 sampai 16, mulai dari 8) adalah ukuran kode. Mengubahnya membuang autoencoder: tekan tombol Pretrain lagi.
- **Epoch pretraining** (5 sampai 100, mulai dari 20) menentukan berapa lama autoencoder berlatih. Pengaturan ini baru berlaku saat kamu menekan tombol Pretrain, dan tombol itu selalu melatih dari awal.
- **Contoh berlabel per kelas** (2 sampai 100, mulai dari 5) adalah ukuran yang kamu pakai. Mengubahnya mempertahankan autoencoder dan menggeser garis putus-putus pada grafik. Dengan penguin, slider berhenti di 34.
- **Noise (peluang piksel terbalik)** (0% sampai 35%, mulai dari 15%) adalah tingkat keberantakan glyph. Kontrol ini nonaktif untuk penguin. Mengubahnya membuat glyph baru dan membuang autoencoder.
- **Seed** menentukan datanya. Seed baru memberi glyph baru atau pembagian baru dan membuang autoencoder.
- **Pretrain pada glyph tanpa label** (**Pretrain pada penguin tanpa label** untuk data nyata) melatih autoencoder pada pool tanpa label. Progress bar terisi dan baris status menghitung epoch.
- **Glyph baru** (**Pembagian baru** untuk data nyata) menambah seed sebanyak 1.
- **Layar penuh** memperbesar lab. **Reset** mengembalikan ke data buatan dengan semua pengaturan pada nilai awalnya.
- **Kuis Cepat** adalah tombol di bawah kartu pengaturan (tombol bulat di kanan bawah pada ponsel): "Dengan hanya 5 contoh berlabel per kelas, mana yang menang: fitur pretrained yang dibekukan atau piksel mentah?" dengan pilihan **Fitur pretrained yang dibekukan**, **Piksel mentah**, dan **Hampir sama (selisih di bawah 3 poin)**. Pilih satu dulu, lalu tekan **Periksa jawaban** setelah titik-titik 5 per kelas muncul di grafik.

### Membaca layar
- Peta menunjukkan satu titik per glyph test, diwarnai menurut kelas (Batang vertikal, Silang, Kotak, Diagonal; dengan data nyata Adelie, Chinstrap, Gentoo), dan belah ketupat (**Contoh berlabel (belah ketupat)** di legenda) adalah glyph berlabelmu. Sebelum pretraining kodenya acak, sehingga kelas-kelasnya bercampur. Dengan bottleneck di atas 2, sumbunya adalah **Sumbu utama 1 dari kode (skala 0–10)** dan sumbu 2; pada 2, sumbunya **Angka kode 1 (skala 0–10)** dan 2.
- Baris status berbunyi "Belum dipretrain: peta menampilkan kode acak.", lalu "Pretraining: epoch N dari M. Error test X per piksel." dan di akhir "Dipretrain 20 epoch. Error test 0,128 per piksel (0,252 sebelumnya)." Angka dalam kurung adalah autoencoder yang belum dilatih pada baris test yang sama.
- Baris rincian memberi tiga skor pada ukuranmu, misalnya "Pada 5 berlabel per kelas (20 semuanya): beku 94%, mentah 85%, dari nol 79%.", disusul persentase glyph test yang paling dekat dengan pusat kelasnya sendiri di peta. Dengan penguin, baris ini ditutup dengan error test autoencoder dan PCA.
- **Glyph dan hasil rekonstruksi autoencoder** menampilkan glyph test ber-noise di atas dan hasil rekonstruksi autoencoder dari kode di bawahnya. Dengan data nyata, kartu ini menjadi **PCA dari empat pengukuran yang sama**.
- **Akurasi test terhadap jumlah contoh berlabel** menggambar tiga arm: **Fitur pretrained yang dibekukan** (lingkaran biru), **Piksel mentah** (persegi hijau; **Pengukuran mentah** untuk penguin), dan **Network dari nol** (segitiga ungu, putus-putus). Garis vertikal putus-putus adalah ukuranmu dan garis bertitik adalah peluang acak, 25% (33% untuk penguin).
- **Akurasi test di setiap ukuran** punya kolom **Per kelas (total)**, **Fitur beku**, **Piksel mentah**, dan **Dari nol**, dengan ukuranmu disorot. Tanda – berarti belum dipretrain dan … berarti masih dihitung. Tunggu sampai tidak ada … tersisa sebelum kamu membacanya. Dengan penguin, barisnya adalah 2, 5, 10, 25, dan ukuranmu sendiri.

### Eksperimen
Mulai setiap eksperimen dari **Reset**. Setelah perubahan apa pun yang membuang autoencoder, tekan tombol Pretrain lagi dan tunggu sampai tabel tidak lagi berisi ….

1. **Percobaan pertama.** Prediksi: dengan 5 glyph berlabel per bentuk, mana yang menang, fitur beku atau piksel mentah? Pilih jawaban di kotak **Kuis Cepat**, tekan **Pretrain pada glyph tanpa label**, dan baca baris **5 (20)** pada tabel: 94,2% beku, 85,1% mentah, 79,2% dari nol. Lalu tekan **Periksa jawaban**. Mengapa arm dengan angka paling sedikit untuk ditentukan justru terbaik dengan hanya 20 baris?
2. **Ketika piksel mentah menyusul.** Prediksi: pada berapa glyph berlabel per bentuk keunggulan fitur beku menghilang? Setelah pretraining, baca kolom beku dan mentah pada baris 10, 25, 50, dan 100. Beku bertahan di sekitar 94,3% sampai 94,6%, sementara mentah naik dari 88,5% ke 93,2%, 95,0%, dan 95,8%. Geser **Contoh berlabel per kelas** ke 25 dan perhatikan garis putus-putus serta belah ketupat di peta. Kapan kode pretrained layak dibangun?
3. **Ukuran kode.** Prediksi: apa yang dilakukan bottleneck 3 pada akurasi beku di 5 per bentuk, dan apa yang dilakukan 16? Atur **Ukuran bottleneck (jumlah angka dalam kode)** ke 3, tekan **Pretrain pada glyph tanpa label**, lalu baca baris **5 (20)**: 72,2%, dibandingkan mentah 85,1% yang tidak berubah. Lalu coba 16: 93,3%. Bandingkan baris statusnya: error test adalah 0,131 dengan 3 dan 0,126 dengan 16. Peta menyebut 86% glyph test paling dekat dengan pusatnya sendiri dengan 3 dan 95% dengan 16, tetapi angka itu memakai label test. Mengapa 0,131 dan 0,126 menyembunyikan selisih lebih dari 20 poin?
4. **Lama pretraining.** Prediksi: apakah 100 epoch jauh lebih baik daripada 20? Atur **Epoch pretraining** ke 5 lalu pretrain. Baris status menunjukkan 0,139 dan baris 5 menunjukkan 76,3%. Sekarang 100 epoch: 0,123 dan 93,8%. Jelaskan mengapa 15 epoch pertama penting dan 80 epoch berikutnya tidak.
5. **Noise.** Prediksi: apakah pretraining lebih berharga atau kurang berharga ketika glyph lebih bersih, atau lebih kotor? Atur **Noise (peluang piksel terbalik)** ke 0% lalu pretrain: setiap sel menunjukkan 100,0%. Lalu 35%: pada 5 per bentuk kamu melihat 38,7%, 40,0%, dan 35,8%, dan pada 100 per bentuk 55,0%, 62,5%, dan 54,6%. Di mana pretraining membantu, dan di mana ia tidak dapat membantu?
6. **Penguin, lalu pembagian baru.** Prediksi: pada penguin yang nyata, apakah kode beku masih menang pada 5 per spesies? Atur **Data** ke **Penguin (data nyata)** dan tekan **Pretrain pada penguin tanpa label**. Pada 5 per spesies (15 semuanya) kamu melihat 82,5%, 98,8%, dan 99,1%, dan baris rincian memberi error autoencoder 0,0062 dan PCA 0,0059. Naikkan **Ukuran bottleneck (jumlah angka dalam kode)** ke 3 dan pretrain lagi: beku 98,2%. Lalu tekan **Pembagian baru** dan ulangi dengan 2 dan 3, pada empat pembagian semuanya. Dengan 2 angka, beku mendapat 82,5%, 86,1%, 90,2%, 91,2% dan mentah 98,8%, 97,5%, 98,2%, 98,8%. Apakah gagasan ini bertahan pada pembagian baru, dan apa yang ditentukan oleh ukuran kode?
