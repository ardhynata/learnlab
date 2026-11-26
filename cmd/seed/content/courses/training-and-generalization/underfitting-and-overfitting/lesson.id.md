---
slug: underfitting-and-overfitting
title: Underfitting dan overfitting
---
::: intro
- Membedakan underfitting dari overfitting dengan melihat kurva model dan kedua galatnya.
- Membaca training error dan validation error sebagai pasangan, lalu membandingkannya dengan baseline.
- Menyebutkan apa yang dicoba berikutnya untuk tiap masalah: fleksibilitas lebih besar, data lebih banyak, atau model yang lebih sederhana.

Sebelum mulai: baca "Baselines and splits".
:::

## Mempelajari pola, bukan titik-titiknya
*Apa yang kita harapkan dipelajari model dari training data-nya?*

Model belajar dari contoh, tetapi contoh itu sendiri bukan yang kita pedulikan. Yang penting adalah data berikutnya: email besok, pasien berikutnya, atau penguin yang belum pernah ditimbang. Kemampuan model untuk bekerja baik pada data yang belum pernah dilihatnya disebut **generalisasi**.

Data nyata terdiri dari **pola** ditambah **noise**, yaitu sebaran acak yang tidak dapat diprediksi model mana pun. Sebuah model menggeneralisasi dengan baik bila menangkap pola dan mengabaikan noise. Ada dua cara yang berlawanan untuk gagal:

- **Underfitting.** Model terlalu sederhana untuk menangkap pola.
- **Overfitting.** Model begitu fleksibel sehingga noise ikut tertangkap.

Dalam pelajaran ini modelnya adalah **polinomial**. Derajat 1 adalah garis lurus tanpa lekukan. Derajat 3 dapat menekuk dua kali, dan derajat 9 sampai delapan kali. Gambar di bawah mencocokkan 10 titik training yang sama sebanyak tiga kali. Tanda silang adalah 5 titik validasi yang disisihkan dan tidak pernah dipakai untuk fitting, sedangkan garis putus-putus adalah pola sebenarnya di balik data.

[[figure:underfitting-and-overfitting/fit-panels|Ke-10 titik training yang sama dicocokkan dengan derajat 1, 3 dan 9. Tanda silang adalah titik validasi yang disisihkan dan garis putus-putus adalah pola sebenarnya.]]

## Underfitting: terlalu kaku
*Seperti apa model yang terlalu sederhana?*

Garis pada panel kiri tidak dapat menekuk, sehingga tidak mampu mengikuti naik turunnya data. Garis itu meleset dari titik training maupun titik validasi dengan jarak yang kurang lebih sama.

Untuk memberi angka pada hal ini, kita butuh ukuran "seberapa jauh meleset". Di sini yang dimaksud **galat** adalah **mean squared error**: rata-rata dari kuadrat selisih antara prediksi dan nilai sebenarnya. Makin rendah makin baik. Garis tadi memiliki training error 1,02 dan validation error 1,06.

Underfitting punya ciri yang jelas: **kedua galat tinggi dan saling berdekatan.** Model tidak punya masalah tersembunyi. Ia hanya tidak dapat menekuk cukup banyak untuk mengikuti pola.

Penyebab yang umum adalah model dengan fleksibilitas terlalu kecil, feature yang tidak memuat jawabannya (menebak harga rumah tanpa tahu luasnya), dan training yang berhenti terlalu cepat.

> Gagasan kunci: model yang underfit buruk pada data yang dipelajarinya, dan sama buruknya pada data baru.

## Overfitting: terlalu bersemangat
*Seperti apa model yang mempelajari noise?*

Kurva derajat 9 pada panel kanan memiliki 10 koefisien (bilangan yang diatur oleh fitting) dan 10 titik training untuk dicocokkan, sehingga kurva itu dapat melewati semuanya: training error-nya 0,00. Namun setiap titik sedikit menyimpang dari pola sebenarnya karena noise, dan kurva harus meliuk untuk menjangkau semuanya. Di antara dan di luar titik-titik itu, kurva berayun liar, dan pada 5 titik validasi galatnya mencapai 17,74.

Itulah cirinya: **training error rendah, sedangkan validation error jauh lebih tinggi.** Model itu menghafal. Siswa yang menghafal jawaban ujian tahun lalu akan mendapat nilai 100% pada ujian itu, tetapi tetap gagal pada ujian baru.

Overfitting membutuhkan dua bahan: model yang fleksibel, serta noise atau detail ganjil untuk dikejarnya. Model dengan fleksibilitas kecil tidak dapat mengejar banyak. Titik dengan noise lebih sedikit memberi model fleksibel lebih sedikit untuk dikejar.

> Awas: training error yang sangat kecil bukan tanda keberhasilan. Justru itulah yang ditunjukkan model yang overfit.

## Membaca kedua galat
*Bagaimana angka-angka itu menunjukkan masalah yang kamu hadapi?*

Berikut empat model yang dicocokkan ke 10 titik training yang sama, masing-masing diukur pada titik training dan pada 5 titik validasi. Baris pertama adalah **baseline**: "model" yang selalu memprediksi rata-rata jawaban training, yaitu 5,01. Baseline menunjukkan skor yang didapat bila tidak tahu apa-apa.

| Model | Training error | Validation error |
|---|---|---|
| Rata-rata saja (baseline) | 2,76 | 2,72 |
| Derajat 1 | 1,02 | 1,06 |
| Derajat 3 | 0,27 | 0,46 |
| Derajat 9 | 0,00 | 17,74 |

[[figure:underfitting-and-overfitting/error-pairs|Training error dan validation error untuk baseline dan tiga polinomial. Batang validation derajat 9 jauh melampaui skala.]]

**Derajat 1** mengalahkan baseline, tetapi kedua galatnya masih jauh di atas galat derajat 3: underfitting. **Derajat 3** memiliki galat yang rendah. Validation error-nya 0,46, sekitar 1,7 kali training error-nya yang 0,27, dan selisih kecil seperti itu wajar karena kurva dicocokkan ke satu kumpulan dan bukan ke yang lain. **Derajat 9** memiliki training error 0,00 dan validation error 17,74, sekitar 6,5 kali lebih buruk daripada baseline yang 2,72: hasilnya lebih buruk daripada tidak tahu apa-apa.

> Gagasan kunci: baca kedua galat bersama-sama dan bandingkan dengan baseline. Tinggi dan berdekatan berarti underfitting. Rendah pada training tetapi jauh lebih tinggi pada validation berarti overfitting.

::: deeper Periksa baseline dengan pensil
Jawaban training berjumlah 50,1, sehingga rata-ratanya 50,1 / 10 = 5,01. Kuadrat selisih dari 5,01 adalah 1,42; 1,42; 6,71; 2,22; 1,66; 1,23; 2,28; 7,90; 1,72 dan 1,02, yang berjumlah sekitar 27,57. Dibagi 10 hasilnya 2,757, yang dibulatkan menjadi 2,76.

Pada jawaban validation 5,6; 7,7; 4,4; 3,6 dan 3,1, kuadrat selisih dari 5,01 adalah 0,35; 7,24; 0,37; 1,99 dan 3,65. Jumlahnya sekitar 13,59, dan 13,59 / 5 kira-kira 2,72.
:::

## Apa yang menggeser keseimbangan
*Apa yang membuat model lebih mudah underfit atau overfit?*

Ada tiga hal yang paling berpengaruh.

- **Fleksibilitas.** Derajat yang lebih tinggi dapat mengikuti lebih banyak lekukan. Nanti kamu akan bertemu pengaturan lain dengan efek serupa, misalnya berapa banyak neighbor yang ditanyai model k-NN.
- **Noise.** Makin besar sebaran di sekitar pola sebenarnya, makin banyak yang harus dikejar model yang fleksibel.
- **Jumlah data.** Dengan titik yang lebih banyak, kurva yang salah di antara titik-titik itu lebih cepat terdeteksi, sehingga model fleksibel tertahan lebih dekat ke pola.

Gambar ini mengulang satu percobaan pada sampel acak berukuran 10 sampai 120 titik. Noise menyisakan galat sekitar 0,25 yang tidak dapat dihilangkan model mana pun. Setiap titik adalah median dari 41 sampel acak. Training error diukur pada sampel itu sendiri, validation error pada 400 titik baru.

[[figure:underfitting-and-overfitting/more-data|Median galat terhadap jumlah titik training. Data yang lebih banyak menutup selisih untuk derajat 6. Untuk derajat 1, galatnya tidak banyak turun.]]

::: deeper Kurva belajar dalam angka
Dengan 10 titik, derajat 6 memiliki training error 0,06 dan validation error 3,76. Dengan 120 titik, nilainya 0,24 dan 0,27, hampir sama dan dekat dengan batas noise. Derajat 1 bergerak dari 0,95 dan 1,40 menjadi 1,16 dan 1,21: selisihnya menutup, tetapi keduanya menetap jauh di atas 0,25.
:::

> Gagasan kunci: data yang lebih banyak memperkecil overfitting. Data tidak memperbaiki underfitting, karena model tetap tidak dapat menekuk cukup banyak.

::: deeper Mengapa derajat 9 mencapai tepat nol
Polinomial berderajat d memiliki d + 1 koefisien. Dengan 10 titik pada nilai x yang berbeda, polinomial derajat 9 memiliki 10 koefisien, yang pas untuk menyelesaikan kurva melewati setiap titik. Itulah sebabnya training error tadi tepat 0,00. Model dengan jumlah bilangan bebas sebanyak jumlah titik selalu dapat mencocokkan titik-titik itu, entah titik-titik itu bermakna atau tidak.
:::

## Apa yang dicoba berikutnya
*Apa yang diubah ketika masing-masing masalah ditemukan?*

Setelah tahu kamu berada di sisi mana, perbaikannya mengarah ke sisi sebaliknya.

[[figure:underfitting-and-overfitting/what-to-try|Bandingkan kedua galat dengan baseline, lalu pilih: fleksibilitas lebih besar untuk underfitting, data lebih banyak atau model yang lebih sederhana untuk overfitting.]]

- **Bila underfit,** buat model lebih fleksibel (derajat lebih tinggi), beri feature yang memuat informasi nyata, atau latih lebih lama. Tambahan data sejenis hanya sedikit membantu.
- **Bila overfit,** kumpulkan lebih banyak training data, pilih model yang lebih sederhana, atau pakai feature yang lebih sedikit. Metode bernama **regularization** menambahkan penalti untuk koefisien yang ekstrem, sehingga kurva yang liar tidak disukai.
- **Bila sudah cukup pas,** hentikan penyetelan dan laporkan hasilnya.

Setiap pilihan di sini, seperti derajat, adalah pengaturan yang kamu tentukan sebelum fitting. Pilih berdasarkan validation error, jangan pernah berdasarkan training error, yang selalu memihak model paling fleksibel.

> Awas: bila kamu terus mencoba pengaturan dan memeriksa titik validasi yang sama, lama-lama kamu ikut mencocokkan titik-titik itu. Pelajaran berikutnya menunjukkan bagaimana himpunan ketiga, yaitu test set, melindungi dari hal itu.

::: deeper Bias dan varians
Para statistikawan memberi nama lain untuk kedua kegagalan ini. Underfitting adalah **bias tinggi**: model menyimpang secara sistematis karena bentuknya tidak dapat menyesuaikan pola. Overfitting adalah **varians tinggi**: kurva hasil fitting akan berubah banyak bila kamu mengambil sampel titik training yang lain. Keduanya saling tarik-menarik, sehingga tujuannya adalah titik tengah yang pas di antara keduanya.
:::

## Sebelum lab
*Apa yang dapat kamu coba di lab kursus ini?*

Lab dalam kursus ini menyiapkan percobaan yang sama dalam skala lebih besar. Lab menggambar kurva yang berisi noise dengan 30 titik, membaginya menjadi titik training dan titik validasi, lalu mencocokkan polinomial yang derajatnya kamu atur dari 1 sampai 12. Kamu juga dapat mengubah noise dan jumlah titik training, dan sebuah grafik menampilkan kedua galat pada setiap derajat.

Sebelum menggeser slider derajat, buatlah prediksi. Pada derajat berapa training error paling rendah? Di mana validation error berhenti turun dan mulai naik? Lalu periksa, dan gunakan ciri-ciri dari pelajaran ini untuk menamai apa yang kamu lihat: kedua galat tinggi dan berdekatan, atau training error rendah dengan validation error jauh lebih tinggi.

Kemudian ubah jumlah titik training dan noise, dan buat prediksi lagi. Pelajaran ini menunjukkan bahwa data lebih banyak menutup selisih, dan bahwa noise lebih besar memberi model fleksibel lebih banyak untuk dikejar. Periksa keduanya di lab.

::: remember
- Underfitting berarti kedua galat tinggi dan berdekatan. Overfitting berarti training error rendah dan validation error jauh lebih tinggi.
- Baca kedua galat sebagai pasangan dan bandingkan dengan baseline, karena training error saja selalu menguntungkan model yang lebih fleksibel.
- Data yang lebih banyak dan model yang lebih sederhana membantu mengatasi overfitting. Fleksibilitas lebih besar dan feature yang lebih baik membantu mengatasi underfitting.
:::
