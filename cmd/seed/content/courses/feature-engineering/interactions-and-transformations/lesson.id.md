---
slug: interactions-and-transformations
title: Interaksi dan transformasi
---
::: intro
- Bangun sebuah interaction feature, lalu tunjukkan dengan hitungan tangan bahwa fitur itu membuat model linear dapat mencocokkan (fit) pola yang sebelumnya tidak dapat ditangkapnya.
- Pilih transformasi untuk sebuah kolom berdasarkan masalah kolom itu: log untuk data yang miring, kuadrat, bin, atau rasio.
- Jelaskan mengapa kolom baru distandarkan setelah dibuat, dengan scaler yang di-fit hanya pada baris training, dan mengapa tambahan kolom menuntut penalti.

Sebelum mulai: baca "Scaling and encoding" dan "Pipelines and leakage" dari Preparing tabular data, serta "Bias, variance and shrinkage" dari Regularization.
:::

## Kolom yang kamu buat sendiri
*Mengapa kolom perlu diubah, dan tidak cukup membiarkan model belajar dari kolom yang sudah ada?*

Model linear menilai sebuah baris dengan menjumlahkan satu dorongan dari setiap kolom: `prediction = b0 + b1 × x1 + b2 × x2 + ...`. Setiap kolom mendorong sebesar bagiannya sendiri, apa pun nilai kolom lain, menurut garis lurus. Sebuah model hanya dapat mempelajari pola yang diizinkan oleh kolom dan bentuk modelnya. Jika pola yang kamu cari tidak ada di keduanya, data yang lebih banyak dan training yang lebih lama tidak akan menemukannya.

**Feature engineering** berarti membuat kolom baru dari kolom lama agar polanya terlihat. Kamu sudah pernah melakukan kasus kecilnya: one-hot encoding mengubah kolom teks menjadi angka. Pelajaran ini menambahkan dua keluarga teknik. Sebuah **interaction** menggabungkan dua feature menjadi satu kolom. Sebuah **transformasi** membentuk ulang satu kolom: log, kuadrat, bin, atau rasio dua kolom.

Sebagian model tidak terlalu membutuhkan bantuan ini. Decision tree dapat memecah data berdasarkan satu feature lalu feature lain, sehingga ia dapat menemukan sebagian interaction sendiri. Regresi linear dan regresi logistik tidak dapat, dan model berbasis jarak seperti k-NN hanya melihat kolom yang diberikan kepadanya.

> Gagasan kunci: sebuah model hanya dapat mempelajari pola yang diperlihatkan oleh kolom-kolomnya. Kolom baru adalah cara untuk memperlihatkan sebuah pola.

## Interaction feature
*Apa yang ditambahkan oleh hasil kali dua feature, yang tidak dapat diberikan oleh kedua feature itu sendiri?*

**Interaction feature** adalah kolom baru yang dibuat dari dua feature, paling sering hasil kalinya, x1 × x2. Pada model linear biasa, pengaruh x1 adalah satu angka tetap, b1, berapa pun nilai x2. Kalau garis hasil fit digambar untuk beberapa nilai x2, garis-garisnya sejajar.

Tambahkan hasil kali itu dan modelnya menjadi `b0 + b1 × x1 + b2 × x2 + b3 × (x1 × x2)`. Pengaruh x1 sekarang `b1 + b3 × x2`, sehingga berubah mengikuti x2. Bila b3 positif, x1 makin berpengaruh ketika x2 besar.

Gunakan interaction ketika kamu punya alasan untuk menduga dua feature bekerja bersama. Contohnya dosis dan lama waktu minum obat, diskon dan bulan yang ramai, atau penanda kelompok 0/1 dikalikan sebuah angka (yang memberi kedua kelompok kemiringan berbeda).

Jangan mencoba semua pasangan. Dengan 10 feature ada 45 pasangan, dan setiap pasangan yang diuji menambah peluang untuk mencocokkan noise. Mulailah dari apa yang kamu ketahui tentang masalahnya.

## Satu interaction, dihitung dengan tangan
*Dapatkah kolom hasil kali memperbaiki model linear yang salah besar?*

Berikut percobaan kebun rekaan: delapan petak, dua petak untuk setiap kombinasi pupuk dan air. Kolom f bernilai 1 bila pupuk diberikan, w bernilai 1 untuk air banyak, dan kolom terakhir adalah hasil panen dalam kg.

| Petak | f | w | f × w | Hasil panen (kg) |
|---|---|---|---|---|
| 1, 2 | 0 | 0 | 0 | 9, 11 |
| 3, 4 | 1 | 0 | 0 | 9, 11 |
| 5, 6 | 0 | 1 | 0 | 8, 12 |
| 7, 8 | 1 | 1 | 1 | 29, 31 |

Rata-rata keempat kelompok adalah 10, 10, 10, dan 30 kg, dan rata-rata keseluruhan 15. Kemiringan hasil fit untuk f adalah selisih dua rata-rata, (10 + 30) / 2 - (10 + 10) / 2 = 10. Kemiringan untuk w juga 10, dan intersepnya 15 - 10 × 0,5 - 10 × 0,5 = 5. Garis itu memprediksi 5, 15, 15, dan 25 kg. Ia mengklaim bahwa pupuk saja menambah 10 kg, padahal itu keliru.

Jumlah kuadrat selisihnya 214, sehingga MSE-nya 214 / 8 = 26,75, atau selisih yang tipikal sebesar 5,17 kg (akar kuadrat dari MSE).

Sekarang tambahkan f × w. Hasil fit-nya 10 + 0 × f + 0 × w + 20 × (f × w): masing-masing faktor sendirian tidak berpengaruh, tetapi bersama-sama keduanya menambah 20 kg. Prediksinya sama dengan rata-rata kelompok. Jumlah kuadrat selisihnya 14, sehingga MSE-nya 1,75, atau selisih tipikal 1,32 kg.

[[figure:interactions-and-transformations/parallel-or-fan|Percobaan kebun. Tanpa hasil kali, kedua garis hasil fit harus sejajar (kiri); dengan hasil kali, keduanya dapat melebar seperti kipas (kanan).]]

## Log untuk kolom yang miring
*Apa yang dilakukan log pada ekor yang panjang?*

Sebuah kolom disebut **miring** (*skewed*) bila sebagian besar nilainya menggerombol dan segelintir nilai sangat besar, seperti pada pendapatan, harga, atau hitungan. Segelintir nilai itu menarik rata-rata, meregangkan skala yang distandarkan, dan mendominasi model yang mengkuadratkan galatnya.

**Log** memampatkan ekor itu. Log berbasis 10 bertanya "10 pangkat berapa yang menghasilkan angka ini?": log10(100) = 2 dan log10(1.000) = 3. Sifatnya yang berguna adalah perkalian berubah menjadi penjumlahan. Setiap penggandaan menambah jumlah yang sama, log10(2) = 0,30, sehingga 25, 50, dan 100 berjarak sama.

Ambil tujuh pendapatan dalam ribuan dolar: 25, 30, 38, 45, 60, 90, dan 250. Rata-ratanya 76,9 tetapi mediannya 45. Setelah di-log, nilainya menjadi 1,40, 1,48, 1,58, 1,65, 1,78, 1,95, dan 2,40. Setelah distandarkan, pendapatan terbesar turun dari z = 2,35 menjadi z = 2,06, sedangkan enam nilai lain, yang semula terjepit pada z antara -0,71 dan 0,18, kini tersebar dari -1,11 sampai 0,65. Di sini z adalah banyaknya simpangan baku dari rata-rata, memakai simpangan baku populasi (dibagi n).

[[figure:interactions-and-transformations/log-skew|Tujuh pendapatan yang sama sebelum dan sesudah log10. Titik yang jauh tertarik mendekati yang lain.]]

> Awas: log memerlukan nilai di atas 0. Untuk hitungan yang dapat bernilai nol, pilihan yang umum adalah log dari (1 + x).

## Kuadrat, bin, dan rasio
*Masalah apa yang diatasi oleh masing-masing transformasi lainnya?*

**Kuadrat.** Garis lurus tidak dapat melengkung. Ambil x = -2, -1, 0, 1, 2 dan y = 4, 1, 0, 1, 4. Garis lurus terbaik datar pada rata-rata, yaitu 2, dan jumlah kuadrat selisihnya 14. Tambahkan kolom x² dan hasil fit-nya tepat. Inilah gagasan polinomial dari "Underfitting and overfitting": derajat 2 berarti kolom x dan x².

**Bin.** Potong sebuah angka menjadi rentang lalu one-hot encode rentang itu, misalnya usia di bawah 30, 30 sampai 59, dan 60 ke atas. Setiap pita mendapat koefisiennya sendiri, sehingga pengaruhnya dapat melompat antarpita. Harganya adalah detail di dalam pita yang hilang, dan batas pita yang diambil dari data harus dihitung hanya dari baris training.

**Rasio.** Rasio dua kolom menangkap makna "relatif terhadap". Bagilah panjang paruh penguin dengan kedalaman paruhnya. Rata-rata rasionya 2,12 untuk Adelie, 2,65 untuk Chinstrap, dan 3,18 untuk Gentoo. Chinstrap dan Gentoo hampir sama panjang paruhnya, tetapi rasionya memisahkan keduanya.

[[figure:interactions-and-transformations/bill-ratio|Penguin sungguhan: panjang paruh Chinstrap dan Gentoo saling tumpang tindih, tetapi panjang dibagi kedalaman menjaga separuh bagian tengah keduanya tetap terpisah.]]

## Standarkan setelah transformasi
*Mengapa scaler dipasang setelah kolom baru ada?*

Kolom baru sering berukuran sangat berbeda dari kolom lama. Ambil penguin dengan panjang sirip 181, 186, dan 195 mm dan massa tubuh 3.750, 3.800, dan 3.250 g. Hasil kali keduanya adalah 678.750, 706.800, dan 633.750. Jarak akan didominasi oleh kolom itu, dan penalti akan menghukum kolom-kolom secara tidak setara, karena koefisien pada kolom sebesar itu berada pada skala yang sangat berbeda dari yang lain. Inilah masalah yang sudah kamu temui di "Scaling and encoding".

Karena itu urutannya: buat kolom baru, lalu standarkan semua kolom, termasuk yang baru. Hasil kali, kuadrat, atau rasio yang dihitung dari satu baris hanya membutuhkan baris itu, sehingga aman dibuat sebelum split. Rata-rata dan simpangan baku dipelajari dari data, jadi keduanya di-fit hanya pada baris training dan dipakai tanpa diubah pada baris test, seperti di "Pipelines and leakage". Hal yang sama berlaku untuk batas bin yang diambil dari kuantil.

[[figure:interactions-and-transformations/build-then-scale|Urutan kerja: buat kolom baru, fit scaler pada baris training, terapkan ke kedua set, lalu fit model.]]

::: deeper Centering sebelum mengalikan
Ini alternatif opsional terhadap urutan di atas, bukan penggantinya. Memusatkan (centering) sebuah feature sebelum dikalikan mengubah arti koefisien lainnya. Pada percobaan kebun, pusatkan f dan w menjadi f - 0,5 dan w - 0,5, lalu fit ulang. Modelnya menjadi 15 + 10 × (f - 0,5) + 10 × (w - 0,5) + 20 × (f - 0,5)(w - 0,5). Intersep 15 adalah rata-rata keseluruhan, dan setiap koefisien utama, 10, adalah pengaruh rata-rata faktor itu. Dengan kolom 0/1 mentah, data yang sama menghasilkan 10, 0, 0, dan 20, dengan koefisien f hanyalah pengaruh pupuk pada air sedikit. Prediksinya identik; yang berbeda hanya cara membacanya.
:::

::: deeper Rasio adalah log yang menyamar
Karena log(a / b) = log(a) - log(b), model linear yang diberi log(a) dan log(b) sebagai dua kolom dapat mempelajari pola mirip rasio tanpa kolom rasio. Kolom rasio adalah jalan pintas bila kamu sudah tahu bahwa rasiolah yang penting.
:::

## Kolom lebih banyak, penalti lebih besar
*Berapa biaya setiap kolom baru, dan bagaimana kamu tahu kolom itu pantas dipertahankan?*

Setiap kolom baru adalah koefisien baru yang harus diperkirakan. Pada percobaan kebun, hasil kali menurunkan MSE training dari 26,75 menjadi 1,75, tetapi galat training tidak pernah naik ketika kolom ditambah, sehingga ia tidak dapat membuktikan bahwa kolom itu nyata. Di sini polanya memang sengaja dibuat; pada data sungguhan, penurunan yang sama bisa jadi noise yang ikut di-fit.

Dua kebiasaan menjagamu tetap jujur. Pertama, nilai kolom baru pada data yang tidak dipakai untuk fit: skor validation atau, lebih baik lagi, cross-validation, seperti di "Cross-validation and stratification". Kedua, siapkan diri untuk membutuhkan penalti. Sepuluh feature dengan seluruh 45 hasil kali dan 10 kuadrat menghasilkan 65 kolom, dan penalti dari "L1 and L2: ridge and lasso" menarik koefisien yang tidak berguna ke arah nol.

Pelajaran berikutnya membahas kolom kategorikal dengan banyak nilai. Kursus ini ditutup dengan lab Feature ablation, tempat kamu menambahkan feature satu per satu dan memeriksa perbaikan mana yang bertahan pada cross-validation.

::: remember
- Sebuah interaction (hasil kali) membuat pengaruh satu feature bergantung pada feature lain; model linear tanpanya menggambar garis-garis sejajar.
- Transformasikan kolom sesuai masalahnya: log untuk data miring, kuadrat untuk melengkung, bin untuk lompatan, rasio untuk "relatif terhadap". Setelah itu standarkan, dengan scaler yang di-fit hanya pada baris training.
- Setiap kolom baru menambah satu koefisien. Nilai pada data yang ditahan, dan siapkan diri untuk membutuhkan penalti.
:::
