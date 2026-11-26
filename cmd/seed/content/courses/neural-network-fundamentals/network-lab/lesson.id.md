---
slug: network-lab
title: Network lab
---
::: intro
- Perkirakan apa yang terjadi pada loss, gradient, dan unit ketika kamu mengubah network, titik awalnya, atau optimizer-nya, lalu periksa perkiraan itu di network lab.
- Baca loss chart, gradient chart, dan tampilan bagian dalam network untuk membedakan run yang sehat dari run yang macet, overfitting, atau penuh unit mati.
- Ulangi setiap gagasan pada penguin yang nyata dan pada sampel baru sebelum kamu mempercayainya.

Sebelum mulai: baca "Neurons and backpropagation" dan "Activations, initialization and optimizers".
:::

## Apa yang dilatih lab
*Seperti apa network-nya, dan dari apa ia belajar?*

Dua pelajaran sebelumnya membangun network di atas kertas: forward pass, gradient yang dihitung dengan tangan, lalu aktivasi, weight awal, dan optimizer. Di network lab kamu melatih network itu sungguhan dan melihatnya belajar. Lab dimulai dengan **Dua bulan sabit**, dua setengah lingkaran yang saling menyelip sehingga tidak ada garis lurus yang dapat memisahkannya, dengan 60 titik untuk tiap kelas. Split dengan seed tetap menyimpan 84 dari 120 titik sebagai titik training (bulat) dan menahan 36 titik validasi (silang) yang tidak pernah dipakai untuk melatih network.

Network awalnya punya 2 hidden layer berisi 8 unit, ReLU, inisialisasi He, dan Adam dengan learning rate 0,01. Satu epoch adalah satu kali update dari seluruh 84 titik training. Hitung parameternya: hidden layer pertama punya 2 × 8 + 8 = 24, yang kedua punya 8 × 8 + 8 = 72, dan unit output punya 8 + 1 = 9. Totalnya 105, angka yang ditampilkan lab.

Sebelum dilatih, loss-nya 0,977 dan network hanya mengklasifikasikan 28,6% titik training dengan benar, lebih buruk daripada melempar koin. Setelah 400 epoch, loss-nya 0,002 pada training dan 0,006 pada validasi, dan kedua akurasi mencapai 100%.

## Empat tampilan dari satu run
*Apa yang ditunjukkan tiap bagian lab?*

Satu run menggambar empat gambar. Sebelum mengubah pengaturan apa pun, tanyakan dulu: gambar mana yang akan bereaksi lebih dulu?

[[figure:network-lab/four-views|Empat tampilan lab dan pertanyaan yang dijawab masing-masing.]]

- **Plot** menunjukkan apa yang sudah dipelajari network: arsirannya adalah prediksi, dan garisnya adalah decision boundary.
- **Loss chart** menunjukkan apakah network belajar, dan apakah yang dipelajarinya berlaku juga pada titik validasi.
- **Gradient chart** menunjukkan seberapa banyak sinyal yang sampai ke tiap layer. Dengan SGD biasa, layer dengan gradient yang sangat kecil nyaris tidak berubah.
- **Tampilan bagian dalam** menggambar weight sebagai garis dan output tiap hidden layer sebagai histogram, serta menghitung unit yang sudah berhenti bekerja.

> Gagasan kunci: plot memberi tahu bahwa ada yang salah. Ketiga chart lainnya menjelaskan mengapa, jadi bacalah dengan urutan itu.

## Loss chart
*Bagaimana cara membaca loss training dan loss validasi?*

Loss di sini adalah log loss dari pelajaran "Log loss and fitting": rata-rata dari -ln probabilitas yang diberikan network pada kelas yang benar. Semakin kecil semakin baik. Network yang menjawab 0,5 untuk setiap titik punya loss -ln 0,5 = 0,693, jadi garis yang macet di 0,693 berarti belum ada yang dipelajari. Chart menggambar loss training dan loss validasi, dan jarak di antara keduanya adalah ceritanya.

[[figure:network-lab/loss-gap|Network yang sama pada data bulan sabit buatan dan pada penguin yang nyata. Pada penguin, loss validasi naik lagi sementara loss training terus turun.]]

Pada dua bulan sabit, kedua garis turun bersama: pada epoch 100 nilainya 0,081 dan 0,149, dan pada epoch 400 nilainya 0,002 dan 0,006. Pada penguin yang nyata, network yang sama berperilaku lain. Loss training terus turun sampai 0,012, tetapi loss validasi paling rendah, sekitar 0,10, di dekat epoch 50, lalu naik menjadi 0,227 pada epoch 400. Kenaikan itu adalah *overfitting*: network mulai menghafal 84 penguin training, bukan polanya. **Kekuatan L2** di lab adalah kontrol yang menahannya.

::: deeper Mengapa 0,693 adalah loss dari tidak tahu apa-apa
Log loss memberi biaya sebesar -ln p untuk probabilitas p yang diberikan pada kelas yang benar. Network yang selalu menjawab 0,5 memberi p = 0,5 pada setiap titik, apa pun kelasnya, sehingga loss-nya -ln 0,5 = ln 2 = 0,693. Di lab, 84 titik training berisi 42 titik tiap kelas, jadi menjawab 0,5 juga merupakan jawaban konstan terbaik. Run yang bertahan di 0,693 tidak lebih baik daripada jawaban konstan itu.
:::

## Gradient chart
*Apa arti garis yang jauh di bawah garis lainnya?*

Backpropagation memberi setiap weight sebuah gradient. Untuk tiap layer, chart menggambar rata-rata nilai absolut gradient itu pada skala log: -2 berarti 0,01 dan -4 berarti 0,0001. Layer 1 adalah hidden layer pertama dan garis terakhir adalah Output. Gradient yang tepat 0 digambar di -8, dasar chart. Dengan SGD biasa, besar gradient sebuah layer menunjukkan seberapa kuat training mendorongnya, sehingga garis di -5 berarti layer yang nyaris tidak bergerak. Adam menskalakan ulang tiap langkah, jadi pada Adam garis yang rendah tidak berarti layer yang macet (eksperimen 4).

[[figure:network-lab/gradient-layers|Gradient tiap layer sebelum training, untuk 4 hidden layer berisi 8 unit. Dengan sigmoid, layer pertama mulai sekitar 45 kali lebih rendah daripada dengan ReLU.]]

Gambar itu membandingkan dua network yang belum dilatih, dengan 4 hidden layer berisi 8 unit. Dengan sigmoid, gradient layer pertama adalah 1,3e-4, yaitu 0,00013. Dengan ReLU nilainya 5,9e-3, sekitar 45 kali lebih besar. Pada kedua network, garis Output adalah yang tertinggi, jadi jangan menilai sebuah layer hanya terhadap output. Bandingkan dengan layer yang sama pada pengaturan lain.

::: deeper Mengapa gradient chart memakai skala log
Antar layer, perbedaannya bisa 10 kali atau lebih. Pada sumbu lurus yang mencapai gradient terbesar, yaitu 2,9e-3 pada network sigmoid, nilai 1,3e-4 milik layer pertama hanya setinggi 4,5% dari tinggi chart, nyaris menempel di dasar, dan gradient yang lebih kecil lagi tidak akan terlihat. Skala log memberi setiap kelipatan 10 tinggi yang sama, sehingga layer yang 100 kali lebih kecil berada dua garis grid di bawahnya.
:::

## Di dalam network
*Apa yang ditunjukkan diagram dan histogram?*

Bagian kiri tampilan ini menggambar network: satu lingkaran untuk tiap unit dan satu garis untuk tiap weight. Weight yang lebih besar digambar dengan garis yang lebih tebal, biru bila positif dan merah muda bila negatif. Lingkaran putus-putus yang kosong adalah **unit mati**: slope-nya nol untuk setiap titik training, sehingga tidak ada gradient yang sampai ke weight-nya. Di kanan, satu histogram per hidden layer menampilkan semua output layer itu, dengan judul seperti "Layer 2 · rata-rata 3,04 · mati 13%". Pada ReLU kata yang muncul adalah mati. Pada tanh dan sigmoid kata yang muncul adalah jenuh: output menempel di ujung rentangnya, tempat slope hampir nol.

[[figure:network-lab/dead-units|Network ReLU yang sama setelah 400 epoch Adam pada learning rate 0,01 dan pada 1. Lingkaran putus-putus adalah unit mati.]]

Network yang sehat pun masih boleh punya unit mati: pada learning rate 0,01, 1 dari 8 unit di Layer 2 mati dan loss berakhir di 0,002. Pada learning rate 1, 6 dari 8 unit itu (75%) mati, dan loss bertahan di 0,291.

## Seperti apa kegagalan itu
*Gambar mana yang menandakan kegagalan mana?*

Pelajaran terakhir ditutup dengan tabel gejala dan kemungkinan penyebabnya. Di lab, tiap gejala punya wajahnya sendiri. Berikut yang akan kamu temui dalam eksperimen.

| Yang kamu lihat | Kemungkinan penyebab | Hal pertama yang dicoba |
|---|---|---|
| Loss datar di 0,693, semua garis gradient di -8 | Semua weight mulai dari 0 | Inisialisasi He atau Xavier |
| Loss dekat 0,69 selama 400 epoch, garis gradient hidden layer di bawah -3 | SGD biasa dengan weight awal yang sangat kecil, atau layer sigmoid yang mengecilkan sinyal | ReLU, titik awal yang lebih besar, atau Adam |
| Loss turun, lalu macet di atas 0,2, banyak lingkaran putus-putus | Learning rate terlalu tinggi untuk ReLU: unit-unit mati | Rate yang lebih kecil, atau tanh |
| Loss training turun, loss validasi naik | Overfitting | Kekuatan L2 yang lebih besar, epoch lebih sedikit, unit lebih sedikit |
| Akurasi training bertahan di sekitar 88% | Unit terlalu sedikit untuk membengkokkan boundary | Tambah unit |

> Awas: satu chart jarang cukup untuk memastikan. Loss yang datar bisa berasal dari awal nol atau dari unit mati, dan hanya gradient chart serta tampilan bagian dalam yang dapat membedakannya.

## Prediksi, ubah, jelaskan, pindahkan
*Bagaimana memakai lab agar kamu benar-benar belajar darinya?*

Setiap eksperimen di panduan di bawah mengikuti empat langkah. Pertama **prediksi**: sebutkan apa yang akan dilakukan loss, garis gradient, atau unit sebelum kamu menyentuh kontrol apa pun. Lab punya Kuis Cepat untuk salah satu tebakan itu. Lalu **ubah** satu pengaturan pada satu waktu. Kemudian **jelaskan** hasilnya dengan gagasan dari dua pelajaran terakhir, dan catat angka yang mengejutkanmu. Terakhir, **pindahkan**: ulangi gagasan itu pada penguin yang nyata dan pada sampel baru, karena satu run pada satu sampel hanyalah anekdot.

Panduan memberikan angka yang seharusnya kamu lihat untuk sampel dan weight bawaan. Tekan **Reset** sebelum tiap eksperimen supaya angkamu sama.

> Gagasan kunci: hasil yang baru kamu lihat pada satu sampel masih berupa dugaan. Ulangi pada sampel baru sebelum menyebutnya temuan.

::: remember
- Loss chart menunjukkan apakah network belajar dan apakah ia melakukan generalisasi: datar di 0,693 berarti tidak ada yang dipelajari, dan garis validasi yang naik berarti overfitting.
- Gradient chart dan tampilan bagian dalam menjelaskan sebabnya: layer yang jauh di bawah yang lain hampir tidak belajar, dan unit mati sama sekali tidak meneruskan gradient.
- Prediksi dulu, ubah satu pengaturan, jelaskan hasilnya, lalu periksa pada penguin dan pada sampel baru.
:::

@@lab

## Lab: neural network lab
Kamu melatih network kecil untuk memisahkan dua kelas yang tidak dapat dipisahkan garis lurus, dan kamu mengamati empat tampilan dari run itu: plot, loss chart, gradient chart, dan tampilan bagian dalam. Lab ini deterministik: pengaturan, sampel, dan weight yang sama menghasilkan run yang sama.

### Kontrol
- **Data** berpindah antara **Data buatan** dan **Penguin (data nyata)**. Data nyata adalah penguin Adelie lawan Chinstrap, berdasarkan panjang paruh dan kedalaman paruh. Berpindah data membangun network baru di epoch 0.
- **Bentuk data buatan** (pada data buatan): **Dua bulan sabit**, **Lingkaran**, **XOR (papan catur)**, atau **Spiral**. Awalnya **Dua bulan sabit**.
- **Hidden layer** (1 sampai 4; awalnya 2) dan **Unit per hidden layer** (2 sampai 16; awalnya 8) menentukan ukuran network. Baris keterangan di atas plot menyebut jumlah parameter.
- **Aktivasi** adalah **ReLU**, **tanh**, atau **sigmoid** (awalnya **ReLU**).
- **Inisialisasi** adalah **Nol (semua weight 0)**, **Acak kecil (std 0,01)**, **Xavier**, atau **He** (awalnya **He**).
- **Optimizer** adalah **SGD**, **SGD dengan momentum**, atau **Adam** (awalnya **Adam**).
- **Learning rate** (0,001 sampai 1, pada skala log; awalnya 0,01), **Kekuatan L2** (0 (mati) sampai 0,1; awalnya mati), dan **Jumlah epoch** (50 sampai 2.000; awalnya 400) menentukan training.
- **Sampel baru** menggambar set titik (atau penguin) yang lain. **Weight baru** menggambar titik awal acak yang lain untuk titik yang sama. **Ulangi** kembali ke epoch 0 dengan titik dan titik awal yang sama.
- Catatan di bawah kontrol menyebut pengaturan mana yang mempertahankan weight: **Optimizer**, **Learning rate**, **Kekuatan L2**, dan **Jumlah epoch** boleh diubah di tengah run, sedangkan pengaturan lain membangun network baru di epoch 0.
- Toolbar berisi **Jalankan** (tombolnya berubah menjadi **Jeda** saat berjalan dan **Jalankan lagi** setelah run selesai), **Langkah sebelumnya**, **Langkah berikutnya**, **Kecepatan**, **Layar penuh**, dan **Reset**. **Jalankan lagi** mulai dari epoch 0, jadi untuk berjalan melewati akhir, naikkan dulu **Jumlah epoch**. **Reset** mengembalikan setiap kontrol, sampel, dan weight ke awalnya.
- **Kuis Cepat** adalah tombol yang memuat satu pertanyaan: "Dengan aktivasi sigmoid dan 4 hidden layer, apa yang terjadi pada gradient di layer pertama?" Pilih jawaban, atur lab seperti yang diminta kuis, jalankan sedikitnya 10 epoch, lalu tekan **Periksa jawaban**.

### Membaca layar
- **Plot** mengarsir prediksi network dan menggambar decision boundary sebagai garis. Bulat adalah titik training dan silang adalah titik validasi. Legenda menampilkan **Kelas A** dan **Kelas B** (**Adelie** dan **Chinstrap** pada data nyata), **Titik training (bulat): 84**, **Titik validasi (silang): 36**, dan **Decision boundary**.
- Baris status berbunyi, misalnya, "Epoch 400 dari 400. Loss 0,002 pada training, 0,006 pada validasi. Selesai." Di bawahnya, baris keterangan berbunyi "Akurasi 100,0% pada titik training, 100,0% pada titik validasi. 105 parameter." Pada epoch 0 bunyinya "Epoch 0 dari 400. Ini network sebelum dilatih: tekan Jalankan." Bila weight meledak, baris itu menyebut bahwa loss sudah bukan angka dan learning rate terlalu tinggi.
- **Loss selama training** menggambar **Loss training** dan **Loss validasi** terhadap **Epoch**, sebagai log loss. Loss yang sangat besar digambar di bagian atas chart.
- **Ukuran gradient per layer** menggambar satu garis per layer, pada skala **log10 dari rata-rata |gradient|**. Legendanya menyebut nilai tiap layer saat ini, misalnya "Layer 1: 0,039" pada epoch 0.
- **Di dalam network** punya diagram di kiri (**Input**, **Hidden 1**, **Hidden 2**, **Output**; lebar garis adalah besar weight, biru positif dan merah muda negatif; lingkaran putus-putus yang kosong adalah unit mati) dan satu histogram per hidden layer di kanan, dengan judul seperti "Layer 2 · rata-rata 3,04 · mati 13%". Sumbunya berbunyi **nilai aktivasi**. Pada tanh atau sigmoid, judulnya menyebut jenuh, bukan mati.

### Eksperimen
Angka di bawah berlaku untuk sampel pertama dan weight pertama. Tekan **Reset** sebelum tiap eksperimen, atur kontrol yang disebut, lalu tekan **Jalankan**. Pada kecepatan bawaan, run 400 epoch memakan waktu sekitar 3 detik.

1. **Berapa unit yang dibutuhkan sebuah lekukan?** Prediksi: dengan 1 hidden layer berisi 2 unit, apakah network masih dapat memisahkan kedua bulan sabit? Atur **Hidden layer** ke 1 dan **Unit per hidden layer** ke 2, lalu jalankan. Status berbunyi "Loss 0,304 pada training, 0,492 pada validasi" dan baris keterangan "Akurasi 88,1% pada titik training, 72,2% pada titik validasi. 9 parameter." Sekarang atur **Unit per hidden layer** ke 8: loss 0,017 dan 0,023, 100,0% pada keduanya, 33 parameter. Tekan **Weight baru**, jalankan pada tiap ukuran (ubah **Unit per hidden layer** di antara kedua run), dan ulangi empat kali. Akurasi validasi dengan 2 dan dengan 8 unit adalah 75,0% dan 100,0%, 75,0% dan 100,0%, 69,4% dan 97,2%, serta 69,4% dan 100,0%. Jelaskan: setiap unit menambahkan satu potongan lagi pada boundary, dan 2 unit tidak dapat membentuk kurvanya. Mengapa ini bukan overfitting, padahal akurasi training-nya juga rendah?
2. **Optimizer mana?** Prediksi: pada **Learning rate** 0,01, mana di antara **SGD**, **SGD dengan momentum**, dan **Adam** yang punya loss terendah pada epoch 400? Untuk masing-masing, atur **Optimizer**, tekan **Ulangi** dan **Jalankan**. Loss training dan validasinya adalah 0,362 dan 0,545 untuk SGD, 0,255 dan 0,408 untuk momentum, serta 0,002 dan 0,006 untuk Adam. Lalu pilih **SGD**, geser **Learning rate** ke 1, tekan **Ulangi** dan **Jalankan**: loss-nya 0,002 dan 0,007, sebaik Adam. Jelaskan dengan ukuran langkah: gradient layer pertama mulai dari 0,039, jadi SGD pada 0,01 melangkah sebesar 0,01 × 0,039 = 0,0004, sedangkan Adam melangkah sekitar sebesar learning rate, yaitu 0,01, 25 kali lebih besar.
3. **Amankah memulai dari nol?** Prediksi: berapa loss pada epoch 400 bila semua weight dimulai dari 0? Atur **Inisialisasi** ke **Nol (semua weight 0)**. Loss-nya 0,693 pada kedua set dan akurasinya 50,0%. Ketiga garis gradient berada di dasar, -8, dan kedua judul histogram berbunyi mati 100%. Karena semua weight 0, tidak ada unit yang meneruskan sinyal dan setiap gradient tepat 0. Adam tidak dapat menolong, sebab ia hanya menskalakan ulang gradient, dan 0 tetap 0. Sekarang atur **Inisialisasi** ke **Acak kecil (std 0,01)**, **Optimizer** ke **SGD**, dan **Learning rate** ke 0,1. Loss-nya tetap 0,693 pada epoch 400, dan garis gradient mulai di dekat -5 (1,3e-5, 5,1e-6, dan 4,2e-5). Dengan **He** dan pengaturan SGD yang sama, loss-nya 0,226.
4. **Apakah gradient menghilang?** Prediksi: pilih jawaban di **Kuis Cepat**. Atur **Aktivasi** ke **sigmoid**, **Hidden layer** ke 4, **Optimizer** ke **SGD**, dan **Learning rate** ke 0,1, jalankan sedikitnya 10 epoch, lalu tekan **Periksa jawaban**. Lab melaporkan 1,3e-4 untuk layer pertama dan 2,8e-3 untuk layer output, sekitar 22 kali lebih kecil. Jalankan sampai epoch 400: loss-nya masih 0,689 pada training dan 0,691 pada validasi. Sekarang atur **Aktivasi** ke **ReLU** dan jalankan: pada epoch 0 gradient layer pertama adalah 5,9e-3, sekitar 45 kali lebih besar, dan loss pada epoch 400 adalah 0,038 dan 0,090. Terakhir, kembali ke **sigmoid**, lalu atur **Optimizer** ke **Adam** dan **Learning rate** ke 0,01: loss-nya mencapai 0,001. Jelaskan: slope sigmoid paling besar 0,25, dan Adam memberi setiap weight langkah sekitar sebesar learning rate, sekecil apa pun gradient-nya.
5. **Bisakah sebuah unit mati?** Prediksi: langkah yang lebih besar seharusnya melatih lebih cepat, jadi apakah loss pada epoch 400 akan lebih rendah daripada 0,002, nilai pada 0,01? Atur **Learning rate** ke 1 dengan ReLU dan Adam, lalu jalankan. Loss naik sampai sekitar 1,8 pada epoch 10, lalu menetap: pada epoch 400 nilainya 0,291 pada training dan 0,404 pada validasi, dengan akurasi 82,1% pada titik training. Histogram Layer 2 berbunyi mati 75%, enam lingkaran putus-putus, dan garis gradient turun ke sekitar -5, -6,5, dan -5. Sekarang atur **Aktivasi** ke **tanh** dan jalankan: loss-nya 0,000 dan akurasinya 100,0%, karena unit tanh menjenuh, tetapi slope-nya tetap di atas nol, sehingga masih ada gradient yang mengalir. Tekan **Weight baru** empat kali dengan ReLU: loss berakhir antara 0,255 dan 0,561, dengan 38% sampai 88% dari Layer 2 mati.
6. **Penguin dan sampel baru.** Prediksi: pada penguin yang nyata, apakah loss validasi akan terus turun seperti loss training? Tekan **Reset**, atur **Data** ke **Penguin (data nyata)**, lalu jalankan. Catatan menyebut 1 dari 220 baris Adelie dan Chinstrap punya missing value, sehingga tersisa 219 penguin, dan lab mengambil 60 untuk tiap spesies. Pada epoch 400 loss-nya 0,012 pada training dan 0,227 pada validasi, dan garis validasi di loss chart berbalik naik di dekat epoch 50 (atur **Jumlah epoch** ke 50 dan loss-nya 0,103). Atur **Kekuatan L2** ke 0,01 dan jalankan lagi: 0,082 dan 0,033. Sekarang tekan **Sampel baru** tiga kali, dan jalankan dengan **Kekuatan L2** di 0 (mati) dan di 0,01 setiap kalinya. Loss validasi tanpa L2 adalah 0,027, 0,162, dan 0,179. Dengan 0,01 nilainya 0,042, 0,068, dan 0,072. L2 membantu pada tiga dari empat sampel dan merugikan pada satu. Nilailah dari loss, bukan akurasi: dengan 36 titik validasi, akurasi bergerak dalam kelipatan 2,8%. Apa artinya ini bagi pemeriksaan sebuah gagasan pada satu sampel saja?
