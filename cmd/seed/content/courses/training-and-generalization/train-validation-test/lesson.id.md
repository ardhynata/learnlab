---
slug: train-validation-test
title: Train, validation, dan test
---
::: intro
- Perkirakan derajat tempat validation error berhenti turun dan mulai naik.
- Baca training error dan validation error berdampingan untuk membedakan underfitting dari overfitting.
- Uji sebuah gagasan pada data penguin yang nyata dengan sampel baru, tanpa mengandalkan satu kali split.

Sebelum mulai: baca "Baseline dan pembagian data" serta "Underfitting dan overfitting".
:::

## Apa yang diukur lab
*Mengapa sebuah kurva tidak boleh dinilai dari titik-titik yang dipakai untuk membentuknya?*

Sebuah model baru berguna jika bekerja pada data yang belum pernah dilihatnya, sehingga lab ini menguji setiap kurva pada titik yang tidak ikut dipakai untuk fit. Lab membuat 30 titik di sekitar sebuah kurva tersembunyi, dengan sedikit sebaran acak yang disebut **noise**. Sebagian titik menjadi **titik training** yang digambar sebagai bulatan, sisanya menjadi **titik validasi** yang digambar sebagai tanda silang. Sebuah polinomial di-fit hanya dari bulatan.

**Derajat** polinomial menentukan seberapa fleksibel kurvanya. Derajat 1 adalah garis lurus, derajat 2 punya satu lekukan, dan setiap tambahan derajat memberi satu lekukan lagi.

Untuk setiap derajat, lab melaporkan dua angka. **Error** di sini berarti mean squared error, yaitu rata-rata kuadrat selisih antara kurva dan titik. **Training error** diukur pada bulatan, sedangkan **validation error** diukur pada tanda silang.

> Gagasan kunci: training error menunjukkan seberapa baik kurva menyalin titik yang dipakai untuk fit. Hanya validation error yang menunjukkan bagaimana kurva memperlakukan titik yang belum pernah dilihatnya.

## Tiga set, tiga tugas
*Di mana posisi lab ini dalam proyek yang sebenarnya?*

Dalam proyek nyata, data berlabel dibagi menjadi tiga set.

- **Training set.** Model mencari **parameter**-nya di sini. Untuk polinomial, parameter itu adalah koefisiennya.
- **Validation set.** Kamu memakainya untuk memilih **pengaturan** (sering disebut **hyperparameter**), misalnya derajat polinomial. Pengaturan adalah sesuatu yang kamu tentukan sebelum fit, bukan sesuatu yang dipelajari model.
- **Test set.** Kamu memakainya satu kali saja, di bagian paling akhir, untuk melaporkan seberapa baik model akhirnya.

Lab hanya punya dua set pertama. Bulatan adalah training set, tanda silang adalah validation set, dan pilihan yang kamu buat adalah derajat. Memilih derajat dengan titik validasi sama persis dengan langkah yang kamu ambil dalam sebuah proyek.

Test set adalah perkiraan jujur terakhirmu. Setiap kali kamu melihatnya lalu mengubah sesuatu, ia diam-diam berhenti menjadi data yang belum pernah dilihat. Itulah sebabnya ia dipakai sekali saja.

> Awas: skor validation sedikit terlalu optimistis, karena kamu memilih pengaturan yang skornya paling baik di situ. Laporkan skor test.

## Membaca kurva berbentuk U
*Apa yang terjadi pada kedua error ketika derajat dinaikkan?*

**Training error terus turun.** Polinomial yang lebih fleksibel selalu dapat meniru yang kurang fleksibel lalu melakukan sedikit lebih baik, sehingga training error tidak pernah naik seiring derajat.

**Validation error turun, lalu naik.** Pada awalnya fleksibilitas membantu kurva mengikuti pola yang sebenarnya. Setelah melewati titik tertentu, kurva mulai mengejar noise dan validation error naik. Kurvanya berbentuk U, dan dasar huruf U adalah derajat terbaik.

[[figure:train-validation-test/u-curve|Training error terus turun seiring derajat, sedangkan validation error berbentuk U. Pada sampel pertama lab, dasar huruf U ada di derajat 3.]]

Pada sampel pertama lab, validation error bernilai 1,20 di derajat 1 dan 0,19 di derajat 3. Setelah itu naik: 0,28 di derajat 6, 0,80 di derajat 7, dan 3,59 di derajat 9, padahal training error di sana hanya 0,04. Sisi kiri huruf U adalah underfitting dan sisi kanannya adalah overfitting.

> Gagasan kunci: training error selalu memihak model yang lebih fleksibel. Hanya validation error yang dapat memberi tahu kapan harus berhenti.

## Contoh hitungan
*Dapatkah kita memilih derajat secara manual dari sepuluh titik?*

Berikut 10 titik rekaan (x, y). Kita sisihkan 3 titik sebagai validation dan melakukan fit pada 7 titik sisanya.

- Training: (1; 2,1), (2; 3,6), (4; 5,4), (5; 5,5), (7; 6,6), (8; 7,5), (10; 7,4)
- Validation: (3; 4,2), (6; 6,6), (9; 7,4)

Kita fit derajat 1, 2, 3, dan 6 hanya pada titik training, dengan fit kuadrat terkecil yang sama seperti di lab, lalu menghitung error pada kedua set.

| Derajat | Training error | Validation error |
|---|---|---|
| 1 | 0,306 | 0,201 |
| 2 | 0,063 | 0,017 |
| 3 | 0,061 | 0,026 |
| 6 | 0,000 | 0,448 |

[[figure:train-validation-test/worked-example|Contoh hitungan. Derajat 6 melewati ketujuh titik training, tetapi meleset dari ketiga tanda silang validasi lebih jauh daripada derajat 2.]]

Validation error paling kecil ada di derajat 2, sehingga derajat 2 yang dipilih. Derajat 3 nyaris tidak menambah apa-apa pada training set (0,063 menjadi 0,061) dan sedikit lebih buruk pada validation. Derajat 6 memiliki 7 koefisien untuk 7 titik training, sehingga kurvanya melewati semua titik: training error 0. Namun ia ikut mempelajari noise setiap titik, dan validation error-nya sekitar 26 kali milik derajat 2.

> Awas: tiga titik validasi itu sangat sedikit, sehingga selisih antara derajat 2 dan derajat 3 terlalu kecil untuk dipercaya.

::: deeper Periksa derajat 1 dengan pensil
Rata-rata training: x adalah 37/7, sekitar 5,286, dan y adalah 38,1/7, sekitar 5,443. Jumlah kuadrat x adalah 259, sehingga sebaran x adalah 259 dikurangi 37 kuadrat dibagi 7, sekitar 63,43. Jumlah hasil kali x dan y adalah 238,6, sehingga suku silangnya adalah 238,6 dikurangi 37 kali 38,1 dibagi 7, sekitar 37,21.

Slope = 37,21 / 63,43, sekitar 0,587. Intercept = 5,443 dikurangi 0,587 kali 5,286, sekitar 2,342. Garisnya adalah y = 2,342 + 0,587x.

Pada titik validasi, garis ini memprediksi 4,10, 5,86, dan 7,62. Selisihnya terhadap nilai sebenarnya 4,2, 6,6, dan 7,4 adalah 0,10, 0,74, dan -0,22. Setelah dikuadratkan dan dirata-rata: (0,01 + 0,55 + 0,05) / 3, sekitar 0,20, yang sesuai dengan 0,201 di tabel.
:::

## Memperkirakan di mana U berbelok
*Apa yang menggeser dasar huruf U, dan seberapa yakin kamu dengan letaknya?*

Sebelum menggeser slider, buat tebakan dan sebutkan alasannya. Ada tiga hal yang membentuk jawabannya.

- **Noise.** Dengan noise 0, titik-titik berada tepat di kurva sehingga tidak ada yang dikejar, dan fit yang fleksibel tidak dihukum. Dengan noise 1,5 semua error menjadi lebih besar, tetapi pada sampel pertama lab dasar huruf U tetap berada di derajat 3.
- **Ukuran training.** Titik training yang lebih banyak menjinakkan overfitting. Pada derajat 9, validation error adalah 2,77 dengan 8 titik training dan 0,51 dengan 26 titik.
- **Validation set.** Ukurannya kecil, sehingga jawabannya berisik.

[[figure:train-validation-test/best-degree-spread|Derajat dengan validation error terendah pada 20 sampel, untuk 14 dan 26 titik training. Dengan 26 titik, hanya ada 4 titik validasi, dan jawabannya berubah-ubah.]]

Pada 20 sampel itu, derajat terbaik berkisar dari 3 sampai 7 dengan 14 titik training, tetapi dari 3 sampai 12 dengan 26 titik. Dasar huruf U hanyalah tebakan dari tanda silang yang kebetulan kamu punya. Jika beberapa derajat hasilnya hampir sama, pilih yang lebih sederhana.

## Mempercayai sebuah hasil
*Bagaimana kamu tahu jawabannya bukan kebetulan atau hasil leak?*

Ulangi eksperimen pada sampel baru. Jika derajat terbaik terus jatuh di rentang rendah yang sama, percayai gagasan itu. Jika berpindah-pindah, itu kebetulan.

Pada data yang sedikit, **cross-validation** memberi jawaban yang lebih stabil. Pada k-fold cross-validation, data training dibagi menjadi k fold, misalnya lima. Setiap fold mendapat satu giliran sebagai validation set sementara model dilatih pada empat fold lainnya, lalu kelima skor dirata-rata.

**Data leakage** berarti informasi dari data validation atau test memengaruhi proses training atau tuning, sehingga skor tampak lebih baik daripada kenyataan. Contoh yang paling umum adalah scaling sebelum split, sehingga rata-rata dan sebarannya ikut menghitung baris test. Lakukan split lebih dulu, hitung angka scaling dari baris training saja, lalu terapkan pada set lainnya.

> Awas: hasil yang tampak terlalu bagus lebih sering berasal dari leak daripada dari terobosan. Cari dulu leak-nya.

::: deeper Mengapa test set tidak boleh terus dicek?
Misalkan kamu mencoba 200 pengaturan dan menyimpan yang skor test-nya terbaik. Di antara 200 percobaan, ada satu yang tampak bagus sebagian karena kebetulan, sehingga skor yang kamu laporkan terlalu optimistis dan tidak ada lagi data yang dapat membuktikannya. Hal yang sama terjadi pada validation set, hanya lebih ringan. Itulah sebabnya laporan akhir harus berasal dari set yang tidak pernah dipakai untuk memilih apa pun.
:::

::: remember
- Nilai sebuah kurva pada titik yang tidak dipakai untuk fit: training error saja hanya menghargai hafalan.
- Training error terus turun seiring derajat naik, sedangkan validation error berbentuk U. Pilih dasar huruf U.
- Validation dipakai untuk memilih pengaturan, dan test hanya untuk melapor satu kali. Validation set yang kecil memberi jawaban yang berisik, karena itu ulangi pada sampel baru.
:::

@@lab

## Lab: Fit kurva, lalu uji
Lab dimulai dengan 30 titik buatan: 14 bulatan training dan 16 tanda silang validasi. Pertama, kamu memprediksi derajat tempat validation error mulai naik, lalu menggeser slider derajat untuk mencari tahu. Garis putus-putus yang samar adalah kurva asli yang menjadi pusat sebaran titik buatan itu.

### Kontrol
- **Data** berpindah antara Data buatan dan Penguin (data nyata).
- **Fitur penguin (x)** memilih Panjang flipper (mm) atau Panjang paruh (mm) untuk sumbu x. Kontrol ini hanya berlaku pada data nyata, dan sumbu y selalu massa tubuh.
- **Derajat polinomial** (1 sampai 12, mulai dari 1) menentukan seberapa fleksibel kurva hasil fit.
- **Noise** (0 sampai 1,5, mulai dari 0,50) menentukan seberapa jauh titik buatan menyebar di sekitar kurva asli. Kontrol ini nonaktif pada data nyata.
- **Titik training (dari 30)** (6 sampai 26, mulai dari 14) menentukan berapa banyak titik yang dipakai untuk fit. Sisanya menjadi titik validasi.
- **Tampilkan titik validasi** menyembunyikan atau menampilkan tanda silang. Kontrol ini tidak mengubah fit maupun error, dan tidak memulai ronde baru.
- **Sampel baru** mengambil 30 titik baru dengan split baru, lalu mengatur ulang prediksimu.
- **Cek prediksiku** menampilkan seluruh kurva validation, lingkaran penanda, vonis, dan jawabannya.
- **Reset** mengembalikan semua kontrol, termasuk Data dan Fitur penguin, ke nilai awal dan menghapus prediksi.
- **Kuis Cepat** adalah tombol di bawah kartu pengaturan (tombol bulat di kanan bawah pada ponsel) (lencananya menghitung kuis yang belum kamu jawab; tombol ini membuka panel kecil). Pilih salah satu dari Derajat 1–2, Derajat 3–4, Derajat 5–6, Derajat 7–9, atau Derajat 10–12 sebelum kamu menggeser slider.

Mengubah Data, Fitur penguin, Noise, atau Titik training juga memulai ronde baru, sehingga prediksi lama tidak berlaku lagi.

### Membaca layar
- Baris status berbunyi "Derajat D. Training error X, validation error Y." Setelah kamu mengecek prediksi, baris ini menambahkan vonis: "sudah sesuai" berarti dalam kisaran 50% dari validation error terendah, selain itu "underfitting" jika di bawah derajat terbaik dan "overfitting" jika di atasnya.
- Baris detail menyembunyikan "Validation error terkecil" sampai kamu mengecek. Pada data nyata, baris ini menambahkan seberapa jauh meleset sebuah penguin validasi pada umumnya, dalam gram: akar dari validation error, dikali 360 g per satuan plot.
- Grafik **Training error dan validation error per derajat** menggambar training error untuk setiap derajat. Sebelum kamu mengecek, garis validation-nya hanya menampilkan derajat yang sudah kamu coba. Garis putus-putus "pilihanmu: D" menandai derajat yang sedang kamu pilih, dan setelah pengecekan, sebuah lingkaran menandai "terbaik: derajat B".
- Tabel **Error di setiap derajat** memberi angka yang tepat. Derajat validation yang belum kamu coba menampilkan "?", dan setelah pengecekan, derajat terbaik tertulis "B (terbaik)". Error di atas 1000 ditampilkan sebagai "di atas 1000".
- Pada data nyata, kedua kolom diskalakan ke plot 0 sampai 10, sehingga error dinyatakan dalam satuan plot, bukan gram.

### Eksperimen
1. **Temukan dasar huruf U.** Prediksi: pilih rentang tempat kamu kira validation error berhenti turun. Lalu geser slider derajat dari 1 sampai 12 satu langkah demi satu langkah sambil memperhatikan grafik. Tekan Cek prediksiku. Validation error adalah 1,20 di derajat 1, 0,19 di derajat 3, dan 3,59 di derajat 9, maka jawabannya adalah Derajat 3–4. Apa yang dilakukan training error selama penyapuan yang sama?
2. **Sembunyikan tanda silang.** Atur slider derajat ke 9. Prediksi: jika kamu mematikan Tampilkan titik validasi, apakah kurva atau salah satu error akan berubah? Coba sendiri. Tidak ada yang berubah, karena fit tidak pernah memakai titik-titik itu. Nyalakan lagi dan lihat seberapa jauh jaraknya dari lekukan kurva.
3. **Ubah noise.** Prediksi: di mana dasar huruf U berada dengan Noise 0, dan dengan Noise 1,5? Atur masing-masing, geser derajatnya, lalu cek. Tanpa noise, validation error adalah 0,00 mulai dari derajat 5 dan lingkaran jatuh di derajat 9. Pada 1,5, error lebih besar tetapi derajat terbaiknya tetap 3. Overfitting memerlukan noise untuk dikejar.
4. **Ubah ukuran training.** Prediksi: pada derajat 9, mana yang memiliki validation error lebih rendah, 8 titik training atau 26? Atur slider derajat ke 9, atur masing-masing ukuran training, lalu baca baris status. Dengan 8 titik, training error adalah 0,00 dan validation error 2,77. Dengan 26 titik, nilainya 0,09 dan 0,51. Data training yang lebih banyak menjinakkan overfitting.
5. **Perkecil validation set.** Prediksi: jika Titik training diatur ke 26, sehingga tersisa 4 titik validasi, apakah derajat terbaik akan tetap sama pada sampel baru? Lalu atur, tekan Sampel baru berkali-kali, cek setiap kali, dan catat derajat terbaiknya. Pada 20 sampel, hasilnya berkisar dari 3 sampai 12 dengan 26 titik training, tetapi hanya dari 3 sampai 7 dengan 14 titik.
6. **Pindah ke data nyata.** Prediksi: dengan Data diatur ke Penguin (data nyata), apakah derajat terbaiknya tinggi atau rendah? Panjang flipper dan massa tubuh naik bersama kurang lebih sepanjang garis lurus. Lalu atur, geser derajatnya, dan cek. Lalu tekan Sampel baru lima kali lagi dan catat derajat terbaik setiap kali: pada enam sampel pertama hasilnya 3, 3, 2, 2, 2, dan 1, tidak pernah di atas 3. Ganti Fitur penguin (x) ke Panjang paruh (mm) lalu ulangi. Apakah gagasan itu bertahan pada sampel baru?
