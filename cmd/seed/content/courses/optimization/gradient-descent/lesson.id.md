---
slug: gradient-descent
title: Gradient descent
---
::: intro
- Mengulang aturan pembaruan dengan tangan pada angka penguin yang nyata, lalu menjelaskan mengapa langkahnya mengecil seiring mengecilnya gradient.
- Membaca lab gradient descent: garis kontur, panah gradient, panah langkah berikutnya, dan vonis dari sebuah run.
- Membedakan mangkuk bulat dari jurang sempit lewat jalur yang dihasilkannya, dan menjelaskan mengapa gradient yang kecil belum membuktikan bahwa kamu sudah di titik terendah.

Sebelum mulai: baca "Gradients and the loss surface" dan "Loss functions".
:::

## Dari satu langkah menjadi satu putaran
*Apa yang berubah ketika langkah pembaruan diulang?*

Di pelajaran "Gradients and the loss surface" kamu baru mengambil satu langkah: gradient menunjuk ke arah naik, sehingga pembaruannya mengurangi nilai dengan gradient yang dikalikan **learning rate**. Satu langkah itu membuat garis sedikit lebih baik, tetapi belum sampai ke dasar, dan kamu harus mengukur lagi. **Gradient descent** adalah langkah itu yang diulang: berdiri di satu tebakan, ukur gradient, melangkah ke arah sebaliknya, lalu ukur lagi sampai permukaannya datar. Kamu sudah bertemu dengannya di "Log loss and fitting", saat ia dipakai untuk melatih regresi logistik. Di sini kamu melihat putarannya bergerak.

Langkahnya tetap satu baris:

```
new value = old value - learning rate × gradient
```

Di lereng yang curam gradient-nya besar, sehingga langkahnya panjang. Di dekat dasar yang datar gradient-nya kecil, sehingga langkahnya mengecil dengan sendirinya. Inilah hal baru yang diperlihatkan sebuah putaran: kamu tidak pernah menyuruhnya melambat.

> Gagasan kunci: gradient menunjukkan arah naik, karena itu pembaruan mengurangkannya. Learning rate menentukan seberapa jauh kamu melangkah.

> Awas: gradient bukanlah langkahnya. Langkah adalah gradient dikali learning rate, dengan arah dibalik.

## Hitungan pensil pada tiga penguin
*Dapatkah kamu menjalankan gradient descent pada pengukuran nyata?*

Ambil tiga penguin dari tabel bawaan: panjang sirip 181, 210, dan 230 mm, dengan massa 3,75, 4,45, dan 5,70 kg. Ukur sirip dalam satuan 100 mm (1,81, 2,10, 2,30). Modelnya hanya punya satu parameter: massa prediksi = w × sirip. Loss-nya adalah mean squared error. Untuk loss ini, gradient-nya adalah rata-rata dari 2 × sirip × (w × sirip - massa); rumus itu berasal dari "Gradients and the loss surface", di sini diterapkan pada model dengan satu parameter.

Mulai dari w = 0 dengan learning rate 0,1. Ketiga sukunya adalah -13,575, -18,69, dan -26,22, sehingga gradient-nya adalah rata-ratanya, yaitu -19,495.

| Langkah | w | Loss | Gradient | w baru = w - 0,1 × gradient |
|---|---|---|---|---|
| 0 | 0 | 22,118 | -19,495 | 1,9495 |
| 1 | 1,9495 | 0,552 | -2,630 | 2,2125 |
| 2 | 2,2125 | 0,159 | -0,355 | 2,2480 |
| 3 | 2,2480 | 0,152 | -0,048 | 2,2528 |

[[figure:gradient-descent/penguin-steps|Kurva loss untuk tiga penguin. Titik-titiknya adalah empat nilai w yang pertama. Tiap langkah lebih pendek daripada sebelumnya, karena gradient mengecil seiring kurvanya mendatar.]]

Loss-nya tidak pernah mencapai 0: tiga penguin tidak berada tepat pada satu garis yang melewati titik asal. Loss terendahnya, 0,152, ada pada w = 2,2536 (dicari dengan aljabar, sebagai pembanding), dan setelah empat pembaruan jalurnya sudah berada dalam jarak 0,001 darinya.

## Dua parameter: petanya
*Bagaimana menggambar loss yang punya dua parameter?*

Di "Gradients and the loss surface", loss sebuah garis berupa permukaan di atas slope dan intercept, yang digambar dengan garis kontur. Lab gradient descent menggambar permukaan dengan cara yang sama: tiap **garis kontur** menghubungkan titik-titik yang loss-nya sama, dengan selisih loss yang sama antargaris, sehingga garis yang rapat berarti lereng yang curam. Berlian menandai titik terendah.

Di setiap titik, gradient adalah panah yang menunjuk lurus ke arah naik. Panah itu memotong garis kontur dengan sudut siku-siku, karena sepanjang garis kontur loss tidak berubah. Panah langkah menunjuk ke arah yang berlawanan, dan panjangnya adalah gradient dikali learning rate.

[[figure:gradient-descent/contour-gradient|Yang digambar lab pada posisimu. Gradient (pink) memotong garis kontur dengan sudut siku-siku dan menunjuk ke arah naik. Langkah (teal) menuju arah sebaliknya. Hanya arah panah pink yang berarti; panjangnya tidak sesuai skala.]]

> Awas: pada permukaan lonjong, panah menurun tidak menunjuk ke titik terendah. Panah itu menunjuk arah turun yang paling curam dari tempatmu berdiri, dan arah itu bisa menyamping dari tujuan.

Pembaruannya memakai aturan yang sama, diterapkan pada kedua parameter sekaligus, masing-masing dengan kemiringannya sendiri.

## Mangkuk dan jurang
*Apakah setiap permukaan berperilaku seperti mangkuk bulat?*

Pada **mangkuk bulat**, arah turun yang paling curam menunjuk lurus ke titik terendah, sehingga jalurnya lurus. Pada **jurang sempit**, yang curam ke arah melintang dan landai ke arah memanjang, arah turun yang paling curam kebanyakan menunjuk ke dinding di seberang. Satu langkah dapat menyeberangi jurang dan mendarat di sisi lain. Langkah berikutnya menyeberang kembali, sehingga jalurnya zigzag sambil merayap di sepanjang dasar.

[[figure:gradient-descent/bowl-vs-ravine|Metode yang sama pada dua permukaan. Mangkuk menghasilkan jalur lurus (learning rate 0,25). Jurang menghasilkan zigzag (learning rate 0,14, lebih kecil karena 0,25 akan terlalu besar di sana).]]

Jurang bukan sesuatu yang langka. Tambahkan intercept b pada model penguin dan kamu punya dua parameter. Jika siripnya dalam mm (181, 210, 230), permukaannya menjadi jurang yang ekstrem: untuk ketiga penguin ini, learning rate terbesar yang masih konvergen adalah sekitar 0,000023. Dengan sirip dalam satuan 100 mm, nilainya sekitar 0,19. Data sama, model sama, hanya satuannya yang berubah. Itulah salah satu alasan feature di-scale sebelum fitting dengan gradient descent; kamu sudah mengenal scaling di "Scaling and encoding".

::: deeper Mengapa jurang membuat jalur zigzag, dalam angka
Loss pada jurang di lab adalah (x - 5)² / 2 + 6 (y - 5)², sehingga kemiringannya x - 5 dan 12 (y - 5): dua belas kali lebih curam ke arah melintang daripada ke arah memanjang. Setiap langkah mengalikan jarak dari dasar dengan faktor yang tetap: 1 - learning rate untuk x, dan 1 - 12 × learning rate untuk y. Pada learning rate 0,14 faktornya adalah 0,86 dan -0,68.

Tanda minus itulah zigzag-nya: jarak y berganti sisi di setiap langkah. Dari 3,5 jaraknya menjadi -2,38, lalu 1,62, lalu -1,10, dan mengecil tiap kali. Jarak x mengecil lambat (0,86 per langkah), itulah sebabnya jalurnya merayap. Dengan learning rate yang lebih kecil, faktor y tetap positif dan zigzag-nya hilang. Pelajaran berikutnya, "Learning rate and trouble", menunjukkan seberapa besar learning rate boleh dinaikkan sebelum ayunannya membesar.
:::

## Kapan harus berhenti
*Kapan sebuah run dianggap sudah sampai?*

Di titik rendah permukaannya datar, sehingga gradient-nya nol dan pembaruan tidak mengubah apa pun. Dalam praktik gradient tidak pernah persis nol, karena itu kita berhenti ketika gradient-nya sangat kecil, ketika loss tidak membaik lagi, atau ketika batas jumlah langkah tercapai. Lab gradient descent menyebut sebuah run **konvergen** ketika ukuran gradient (panjang gradient, yang tampil di baris status) turun di bawah 0,05 dan titiknya hampir berhenti bergerak.

Sebuah run **divergen** ketika loss tumbuh jauh di atas nilai awalnya. Run yang melompat-lompat di antara dua tempat dengan loss yang sama tanpa makin rendah disebut "belum stabil". Selain itu statusnya "masih bergerak": gradient-nya belum kecil. Biasanya loss turun di setiap langkah, tetapi langkah yang terlalu besar dapat menaikkannya untuk sementara.

Semua ini dapat kamu baca dari baris status dan grafik loss, tanpa perlu melihat lanskapnya.

> Gagasan kunci: sebuah run selesai ketika gradient-nya hampir nol. Itu hanya memberitahumu bahwa permukaan di sini datar, klaim yang lebih lemah daripada "ini titik terendah".

## Datar belum tentu terendah
*Apakah gradient yang kecil berarti kita sudah menemukan titik terbaik?*

Gradient descent hanya merasakan kemiringan tepat di bawah kakinya. **Local minimum** adalah dasar sebuah lembah: titik yang lebih rendah daripada semua titik di sekitarnya. Lembah itu tidak harus yang terdalam. Di sana gradient-nya nol, sehingga perjalanan berhenti, dan ia tidak dapat tahu bahwa ada lembah yang lebih dalam di tempat lain.

Permukaan ketiga di lab, Dua lembah, memperlihatkannya. Lembah yang dalam punya loss -0,37 dan yang dangkal 0,36. Di antara keduanya ada punggungan, dekat 4,9 pada Parameter 1 (sumbu horizontal). Sisi punggungan mana yang kamu pilih sebagai titik awal menentukan ke mana perjalanan berakhir, meskipun dua titik awal itu hanya berjarak 1,4.

[[figure:gradient-descent/two-valleys|Dua lembah, learning rate 0,1. Awal A (Parameter 1 = 4,2) berakhir di lembah yang dangkal. Awal B (Parameter 1 = 5,6), hanya berjarak 1,4, berakhir di lembah yang dalam. Kedua run berhenti karena gradient-nya kecil.]]

Fitting yang kamu kerjakan di Level 1 aman dari masalah ini. Regresi linear dengan squared error dan regresi logistik dengan log loss hanya punya satu lembah. Model dengan banyak lapisan tidak demikian, dan itu salah satu alasan titik awal (atau beberapa titik awal) penting.

> Awas: "konvergen" menggambarkan gradient-nya, bukan mutu jawabannya. Periksa loss yang dicapai, dan bandingkan dengan titik awal yang berbeda.

## Langkah yang sama melatih sebuah model
*Bagaimana perjalanan ini melatih model dengan banyak parameter?*

Untuk data set yang tetap, loss sebuah model hanyalah fungsi dari parameternya. Itu adalah sebuah lanskap, seperti peta di atas, dengan satu sumbu untuk tiap parameter; sebuah garis, prediksi = w × input + b, punya dua. Gradient descent mulai dari satu tebakan, menghitung gradient untuk setiap parameter, dan memperbarui semuanya sekaligus dengan aturan yang sama. Ulangi, dan modelnya membaik.

Hitungan penguin merata-ratakan gradient pada ketiga penguin. Itu disebut **batch** gradient descent: akurat, tetapi mahal pada tabel yang besar. Pelajaran terakhir kursus ini memakai satu contoh, atau sekelompok kecil, per langkah: lebih murah, lebih noisy (hasilnya lebih naik-turun), dan rata-rata tetap menurun.

::: deeper Satu langkah dua parameter dengan tangan
Ambil mangkuk f(x, y) = (x - 5)² + (y - 5)², dengan gradient (2(x - 5), 2(y - 5)). Mulai dari (1,5; 8) dengan learning rate 0,25, nilai awal di lab. Loss awalnya 12,25 + 9 = 21,25.

1. Gradient-nya (-7; 6), sehingga geraknya -0,25 × (-7; 6) = (+1,75; -1,5) dan titiknya pindah ke (3,25; 6,5). Loss turun menjadi 5,3125.
2. Gradient-nya (-3,5; 3), sehingga titiknya pindah ke (4,125; 5,75) dan loss-nya 1,328.

Tiap langkah memangkas jarak ke titik terendah menjadi setengahnya, karena 1 - 0,25 × 2 = 0,5, dan jarak yang separuh berarti loss seperempatnya. Eksperimen 1 di lab menampilkan angka-angka ini.
:::

::: remember
- Setiap langkah adalah new value = old value - learning rate × gradient: gradient menunjuk ke arah naik, karena itu kita mengurangkannya. Aturan yang sama memperbarui semua parameter sekaligus.
- Garis kontur memetakan permukaan dengan dua parameter: garis yang rapat berarti curam. Mangkuk menghasilkan jalur lurus dan jurang menghasilkan zigzag; perubahan satuan seperti mm menjadi 100 mm membuat jurang jauh lebih sempit, dan learning rate yang aman jauh lebih kecil.
- Sebuah run berhenti ketika gradient-nya hampir nol, dan itu bisa saja di lembah yang dangkal. Tempat kamu memulai dapat menentukan tempat kamu berakhir.
:::

@@lab

## Lab: menuruni garis kontur
Plot ini adalah peta sebuah permukaan loss. Kedua sumbunya adalah dua parameter, dan tiap garis kontur menghubungkan titik-titik dengan loss yang sama. Kamu memilih permukaan dan learning rate, mengklik untuk menaruh titik awal, lalu menonton perjalanannya.

### Kontrol
- **Permukaan loss** memilih **Mangkuk bulat**, **Jurang sempit**, atau **Dua lembah**. Memilih salah satunya mengatur ulang titik awal dan momentum (ke 0), dan mengatur learning rate ke 0,25, 0,14, atau 0,1 untuk ketiga permukaan itu secara berurutan.
- **Learning rate** adalah slider berskala log, dari sekitar 0,003 sampai 2. Catatan di bawahnya menyebut kira-kira di mana sebuah run berhenti konvergen pada permukaan ini, dengan momentum 0.
- **Momentum (opsional)** bergerak dari 0 sampai 0,95. Momentum membawa sebagian langkah sebelumnya, seperti bola berat yang menggelinding turun bukit. Biarkan di 0 (gradient descent biasa) kecuali sebuah eksperimen meminta lain.
- **Klik atau seret plot** untuk memindahkan titik awal. Saat plot terpilih, tombol panah menggesernya sebesar 0,25, atau 1 dengan Shift.
- **Jalankan** memutar perjalanannya. Tombol ini berubah menjadi **Jeda** saat berjalan dan **Jalankan lagi** saat run sudah selesai, yang mengulang dari titik awal. **Langkah berikutnya**, **Langkah sebelumnya**, dan **Kecepatan** menelusurinya langkah demi langkah. **Reset** mengembalikan semuanya ke nilai awal, termasuk kecepatan.
- Mengubah pengaturan apa pun mengembalikan perjalanan ke langkah 0; tekan **Jalankan** lagi.

### Membaca layar
- Cincin adalah **awal**, dan berlian adalah **Titik terendah**. Titik-titik kecil adalah **Jalur sejauh ini**. Pada Dua lembah, cincin abu-abu menandai **lembah dangkal**.
- Panah pink adalah **Gradient (arah naik)**: hanya arahnya yang berarti. Panah teal adalah **Langkah berikutnya (turun)**, digambar dengan panjang sebenarnya.
- Baris status berbunyi, misalnya, "Langkah 3 · loss 0,332 · ukuran gradient 1,152 · masih bergerak". Kata terakhir adalah vonisnya: **konvergen**, **masih bergerak**, **divergen**, atau **belum stabil**. Kalimat di bawahnya menjelaskan vonis itu.
- Grafik **Loss di tiap langkah** menggambar loss terhadap nomor langkah. Titik pink di tepi atasnya, berlabel **di luar grafik**, berarti loss terlalu besar untuk digambar.

### Eksperimen
1. **Satu langkah demi satu langkah.** Prediksikan: pada **Mangkuk bulat** dengan nilai awal (learning rate 0,25), berapa kali lipat loss dan ukuran gradient mengecil di tiap langkah? Tekan **Langkah berikutnya** tiga kali dan baca baris statusnya. Loss-nya berjalan 21,250, 5,313, 1,328, 0,332, dan ukuran gradient-nya 9,220, 4,610, 2,305, 1,152. Jelaskan dengan bagian lipat "Satu langkah dua parameter dengan tangan": jarak ke titik terendah menjadi setengahnya, sehingga ukuran gradient menjadi setengahnya dan loss turun menjadi seperempatnya. Perhatikan panah teal mengecil sambil tetap menunjuk ke berlian, lalu tekan **Langkah sebelumnya** untuk kembali.
2. **Kecil, pas, terlalu besar.** Prediksikan: pada **Mangkuk bulat**, dari learning rate 0,1, 0,25, dan 0,5, mana yang paling dulu mencapai titik terendah? Tekan **Jalankan** untuk masing-masing (atur slider mendekatinya). Pada 0,1 vonisnya konvergen setelah 24 langkah, pada 0,25 setelah 8, dan pada 0,5 langkah pertama langsung mendarat di titik terendah, karena 1 - 0,5 × 2 = 0 (baris status baru berbunyi konvergen satu langkah kemudian, karena titiknya baru saja berhenti bergerak). Lalu coba 1,0: titik melompat di antara dua tempat dengan loss yang sama, dan vonis "belum stabil" baru muncul setelah 40 langkah, maka biarkan berjalan. Di dekat 1,2 run-nya divergen, dan titik pink muncul di grafik.
3. **Zigzag di jurang.** Prediksikan: pada **Jurang sempit**, apakah jalurnya menuju lurus ke berlian? Pilih permukaan itu dan tekan **Jalankan** (learning rate 0,14): jalurnya menyeberangi dasar di setiap langkah dan konvergen setelah 30 langkah. Tekan **Reset**, pilih **Jurang sempit** lagi, lalu tekan **Langkah berikutnya** sekali: panah pink menunjuk hampir lurus melintang, jauh dari berlian, sehingga langkah-langkah awalnya tidak menuju lurus ke titik terendah. Sekarang atur learning rate mendekati 0,05: penyeberangannya berhenti, tetapi butuh 86 langkah. Di dekat 0,17 run-nya divergen, seperti yang diperingatkan catatan di bawah slider. Ukuran langkah mana yang akan kamu pilih?
4. **Dua lembah.** Prediksikan: dengan nilai awal, di mana jalurnya akan berakhir? Pilih **Dua lembah** dan tekan **Jalankan**. Run-nya konvergen pada langkah 31 di lembah dangkal, dengan loss 0,364, dan teks di bawah baris status menyatakan bahwa ia tidak mencapai titik terendah. Sekarang klik plot di sekitar 4,5 pada **Parameter 1** (sumbu horizontal), tepat di kiri punggungan (sekitar 4,9): jalurnya berakhir di lembah dangkal lagi (loss sekitar 0,36). Klik di sekitar 5,5, tepat di kanan punggungan: jalurnya berakhir di lembah dalam, dengan loss sekitar -0,37. Jelaskan: mengapa sisi punggungan yang menentukan?
5. **Titik awal baru.** Prediksikan: apakah vonis pada sebuah permukaan bergantung pada tempat kamu mulai? Periksa masing-masing dengan empat titik awal baru, misalnya keempat sudut (0, 0), (10, 10), (9, 1), dan (1, 9). Pada **Mangkuk bulat** dengan 0,25 setiap titik awal konvergen dalam 9 langkah; pada **Jurang sempit** dengan 0,14 dalam 30 atau 31. Naikkan jurang ke 0,17 dan keempatnya divergen; pada 0,15 keempatnya konvergen dalam 32 atau 33 langkah. Batasnya milik permukaan, bukan milik titik awal. Lalu kembali ke **Dua lembah**: apakah itu masih berlaku di sana?
6. **Periksa pada penguin.** Prediksikan: untuk tiga penguin yang baru, apakah loss turun seperti di pelajaran, dan apakah w berakhir dekat nilai yang sama? Permukaan di lab tetap dan lab tidak punya pilihan data nyata, karena itu pemeriksaan ini dilakukan di kertas (kalkulator sudah cukup). Pakai panjang sirip 186, 210, dan 230 mm (1,86, 2,10, 2,30 dalam satuan 100 mm), massa 3,80, 4,20, dan 5,80 kg, mulai dari w = 0 dan learning rate 0,1. Gradient-nya -19,485, sehingga w berjalan 0, 1,9485, 2,1876, 2,2169, dan loss-nya 21,907, 0,594, 0,273, 0,268. Hasilnya dekat dengan trio di pelajaran (2,25) dan bentuknya sama: langkah besar dulu, lalu langkah yang mengecil. Sekarang coba learning rate 0,3 di kertas: w berjalan 5,846, -3,694, 11,874 dan loss-nya membesar di setiap langkah. Itu divergensi, seperti pada mangkuk di dekat 1,2. Batasnya di sini sekitar 0,23, sehingga tiap permukaan punya batasnya sendiri.
