---
slug: bias-variance-and-shrinkage
title: Bias, varians, dan shrinkage
---
::: intro
- Jelaskan bias dan varians sebagai dua cara sebuah model bisa salah, lalu kaitkan keduanya dengan underfitting dan overfitting.
- Hitung penalti ridge secara manual untuk satu koefisien dan lihat bagaimana penalti itu menarik koefisien ke arah nol.
- Baca learning curve untuk membedakan model yang terlalu kaku dari model yang terlalu bersemangat.

Sebelum mulai: baca "Underfitting dan overfitting" dan "Loss function".
:::

## Dua cara untuk salah
*Dari mana galat sebuah model berasal?*

Pelajaran "Underfitting dan overfitting" mengajarkanmu membaca dua galat sebagai satu pasangan. Pelajaran ini memberi kedua kegagalan itu nama statistiknya, lalu menambahkan satu alat untuk melawan salah satunya.

Bayangkan eksperimen yang sama dijalankan berkali-kali. Setiap kali, kamu mengambil sampel training baru dari sumber yang sama, men-fit jenis model yang sama, dan mendapatkan kurva yang sedikit berbeda. Sekumpulan kurva itu dapat salah dengan dua cara yang terpisah.

- **Bias** adalah seberapa jauh *rata-rata* kurva dari pola yang sebenarnya. Model yang terlalu kaku untuk melengkung memiliki bias tinggi: semua kurvanya meleset ke arah yang sama.
- **Varians** adalah seberapa besar kurva-kurva itu berbeda satu sama lain. Model yang mengejar noise memiliki varians tinggi: setiap sampel membawanya ke tempat yang baru.

Underfitting berarti bias tinggi. Overfitting berarti varians tinggi. Bagian ketiga dari galat adalah noise, yaitu sebaran pada data itu sendiri. Tidak ada model yang dapat menghilangkannya.

> Gagasan kunci: bias adalah meleset secara konsisten, varians adalah meleset secara tidak konsisten. Sebuah model dapat memiliki terlalu banyak salah satunya.

## Bias dan varians dalam angka
*Dapatkah kedua jenis galat itu diukur?*

Dapat, dalam simulasi yang pola sebenarnya kita ketahui. Pakai pola yang sama seperti di "Underfitting dan overfitting", y = 5 + 2,2 sin(x / 1,6), dan 10 posisi x yaitu 0,5; 1,5; sampai 9,5. Tambahkan noise dengan simpangan baku 0,5 (varians 0,25), ambil 400 sampel baru, lalu fit masing-masing. Bandingkan 400 kurva itu dengan pola sebenarnya di 91 titik dari 0,5 sampai 9,5.

Di setiap titik, **bias kuadrat** adalah (rata-rata prediksi dikurangi nilai sebenarnya) dikuadratkan, dan **varians** adalah rata-rata kuadrat sebaran prediksi di sekitar rata-ratanya sendiri. Keduanya dirata-ratakan pada semua titik. Untuk galat kuadrat, bias kuadrat + varians + noise sama dengan galat yang diharapkan pada titik baru.

| Model | Bias kuadrat | Varians | Noise | Total |
|---|---|---|---|---|
| Derajat 1 | 0,74 | 0,04 | 0,25 | 1,03 |
| Derajat 3 | 0,01 | 0,08 | 0,25 | 0,34 |
| Derajat 9 | 0,00 | 1,74 | 0,25 | 1,99 |

[[figure:bias-variance-and-shrinkage/crowd-of-fits|Lima belas dari 400 fit untuk derajat 1, 3, dan 9. Garis tebal adalah fit rata-rata, dan garis putus-putus adalah pola sebenarnya.]]

Garis lurus meleset jauh, tetapi selalu meleset dengan cara yang sama. Derajat 9 tepat pada rata-ratanya, namun setiap fit-nya liar. Derajat 3 menyeimbangkan keduanya dan memiliki total terendah.

> Gagasan kunci: semakin fleksibel sebuah model, bias turun dan varians naik. Model terbaik berada di titik dengan total paling rendah.

## Apa yang dilakukan sebuah penalti
*Bagaimana cara menahan model yang fleksibel?*

Satu cara adalah memilih model yang lebih sederhana. Cara lain mempertahankan model yang fleksibel, tetapi menghukum koefisien yang ekstrem. Pada sampel di pelajaran ini, fit derajat 9 memiliki koefisien sekitar 900 setelah x diskalakan agar berkisar dari -1 sampai 1. Angka sebesar itulah yang membuat kurva dapat berayun di antara titik-titik data.

**Regularization** mengubah loss. Model tidak lagi hanya meminimalkan fit loss, tetapi meminimalkan fit loss, yaitu loss biasa seperti jumlah kuadrat residual, ditambah sebuah penalti:

`penalized loss = fit loss + λ × (sum of squared coefficients)`

Inilah regresi **ridge**, yang disebut juga regularization **L2**. Huruf Yunani λ (lambda) adalah **kekuatan penalti**, yaitu pengaturan yang kamu pilih sebelum fitting, seperti derajat. Pada λ = 0 tidak ada penalti. Makin besar λ, model makin terdorong untuk me-*shrink* koefisiennya ke arah nol. Ridge memperkecil koefisien, tetapi tidak membuatnya tepat nol. Pelajaran berikutnya membandingkannya dengan L1, yang dapat melakukannya.

> Awas: penalti menjumlahkan kuadrat koefisien, sehingga hasilnya bergantung pada satuan feature. Lakukan scaling lebih dulu, seperti di "Scaling dan encoding". Intercept biasanya tidak ikut dihukum.

## Ridge secara manual
*Apa yang dilakukan penalti pada satu koefisien?*

Ambil garis yang melewati titik asal, y = w x, sehingga hanya ada satu koefisien w. Datanya tiga titik: (1, 2), (2, 5), dan (3, 6). Fit loss-nya adalah jumlah kuadrat residual:

`SSE(w) = (2 - w)² + (5 - 2w)² + (6 - 3w)² = 65 - 60w + 14w²`

Tanpa penalti, minimumnya berada di w = 30 / 14 = 2,14, dengan loss 0,71. Sekarang tambahkan λ w². Totalnya menjadi 65 - 60w + (14 + λ)w², yang paling kecil pada w = 30 / (14 + λ).

| λ | w | Fit loss | Penalti | Total |
|---|---|---|---|---|
| 0 | 2,14 | 0,71 | 0,00 | 0,71 |
| 1 | 2,00 | 1,00 | 4,00 | 5,00 |
| 4 | 1,67 | 3,89 | 11,11 | 15,00 |
| 14 | 1,07 | 16,79 | 16,07 | 32,86 |

Ambil λ = 4. Jawaban lama w = 2,14 kini berbiaya 0,71 + 4 × 2,143² = 19,08, lebih besar daripada 15,00 pada w = 1,67. Penalti membuat kecocokan pada training lebih buruk, dari 0,71 menjadi 3,89, dan sebagai gantinya koefisiennya menjadi lebih kecil.

[[figure:bias-variance-and-shrinkage/penalty-by-hand|Fit loss, penalti, dan jumlah keduanya untuk λ = 4. Minimum jumlah itu bergeser dari w = 2,14 ke w = 1,67.]]

::: deeper Dari mana rumusnya berasal
Total loss `65 - 60w + (14 + λ)w²` adalah parabola terhadap w. Kemiringannya `-60 + 2(14 + λ)w`, dan bernilai nol pada w = 60 / (2(14 + λ)) = 30 / (14 + λ). Dalam gradient descent, seperti di "Gradient descent", penalti hanya menambahkan 2λw pada kemiringan, sehingga setiap langkah ikut menarik w ke arah nol. Ketika λ = 14, yaitu jumlah kuadrat nilai x, penyebutnya menjadi dua kali lipat dan w menjadi setengahnya.
:::

## Ridge pada kurva yang overfit
*Apakah penalti dapat menjinakkan kurva derajat 9?*

Kembali ke 10 titik training dan 5 titik validation dari "Underfitting dan overfitting". Derajat 9 tanpa penalti memiliki galat training 0,00 dan galat validation 17,74. Di sini model itu di-fit dengan penalti, dengan x diskalakan dari -1 sampai 1 dan intercept tidak dihukum.

| λ | Galat training | Galat validation | Koefisien terbesar (bukan intercept) |
|---|---|---|---|
| 0 | 0,00 | 17,74 | 903 |
| 0,01 | 0,14 | 0,45 | 6,0 |
| 0,03 | 0,21 | 0,43 | 5,1 |
| 0,1 | 0,37 | 0,56 | 3,9 |
| 1 | 0,86 | 0,99 | 2,0 |
| 10 | 1,84 | 1,83 | 0,5 |

[[figure:bias-variance-and-shrinkage/ridge-fits|Fit derajat 9 yang sama tanpa penalti, dengan penalti sedang, dan dengan penalti yang sangat besar.]]

Galat training hanya naik seiring λ membesar, sehingga galat training tidak dapat dipakai untuk memilih λ. Galat validation turun hingga 0,43 pada λ = 0,03, lalu naik lagi, karena λ yang besar meratakan kurva menuju baseline yang selalu memprediksi rata-rata, yang galat validation-nya 2,72. Lima titik validation adalah panduan yang kurang stabil, sehingga anggap 0,43 dan 0,45 sama baiknya.

> Awas: nilai λ bergantung pada alatnya dan pada cara loss diskalakan (jumlah atau rata-rata). Bandingkan nilai λ hanya di dalam satu pengaturan yang sama.

## Trade-off, sekali lagi
*Apa yang dilakukan penalti pada bias dan varians?*

Jalankan ulang simulasi 400 sampel untuk derajat 9 dengan penalti, dan dua ukuran yang sama muncul. Penalti menukar sedikit bias dengan penurunan varians yang jauh lebih besar.

| λ | Bias kuadrat | Varians |
|---|---|---|
| 0 | 0,00 | 1,74 |
| 0,01 | 0,01 | 0,12 |
| 0,1 | 0,12 | 0,08 |
| 1 | 0,61 | 0,05 |

Tambahkan noise sebesar 0,25 dan totalnya sekitar 1,99, 0,39, 0,45, dan 0,91 (dari nilai yang belum dibulatkan). Penalti kecil memangkas varians dengan tajam dan nyaris tidak menambah bias. Setelah itu, bias bertambah lebih cepat daripada varians turun, dan totalnya naik lagi. Karena itu, λ adalah pengatur antara overfitting dan underfitting, sama seperti derajat.

> Gagasan kunci: regularization menurunkan varians dan menaikkan bias. Cara ini membantu model yang overfit, dan merugikan model yang sudah underfit.

## Learning curve
*Bagaimana galat terhadap ukuran data training dapat menunjukkan masalahnya?*

**Learning curve** memetakan galat terhadap jumlah titik training: latih model pada n titik, lalu ukur galat training pada n titik itu dan galat validation pada validation set yang tetap. Ulangi pada banyak sampel acak untuk setiap ukuran dan ambil mediannya. Bentuk kurvanya berfungsi sebagai alat diagnosis.

- **Bias tinggi.** Kedua kurva menetap di level yang tinggi dan berdekatan. Derajat 1 bergerak dari 0,95 dan 1,40 pada 10 titik menjadi 1,16 dan 1,21 pada 120 titik, jauh di atas batas noise (noise floor), yaitu varians noise 0,25 yang tidak dapat dihilangkan model mana pun. Data tambahan tidak akan membantu; model perlu lebih fleksibel.
- **Varians tinggi.** Ada kesenjangan lebar yang menutup dengan lambat. Derajat 6 bergerak dari 0,06 dan 3,76 pada 10 titik menjadi 0,24 dan 0,27 pada 120 titik. Data tambahan membantu, begitu juga penalti.

Dengan penalti λ = 0,01, derajat 6 dimulai dari 0,12 dan 0,65 pada 10 titik. Kesenjangannya menyempit dari 3,70 menjadi 0,53. Pada 120 titik hasilnya berakhir di 0,24 dan 0,27 yang sama, karena fit loss tumbuh seiring jumlah titik sedangkan penalti tidak: penalti paling berguna ketika data langka.

[[figure:bias-variance-and-shrinkage/learning-curves|Median galat training dan validation terhadap ukuran data training untuk derajat 1, derajat 6, dan derajat 6 dengan penalti. Setiap titik adalah median dari 41 sampel, divalidasi pada 400 titik baru.]]

## Sebelum lab
*Apa yang akan kamu lakukan dengan semua ini di lab kursus?*

Pelajaran berikutnya membandingkan dua penalti yang umum, L2 dan L1. Setelah itu, kursus ditutup dengan lab regularization, tempat kamu menaikkan kekuatan penalti dan memantau koefisien, galat training, dan galat validation.

Buat prediksi sebelum menggeser apa pun. Pada kekuatan penalti berapa galat training paling rendah? Apakah galat validation turun, lalu naik lagi? Apa yang terjadi pada koefisien terbesar? Periksa setiap tebakan, lalu beri nama pada apa yang kamu lihat dengan istilah dari pelajaran ini: bias, varians, shrinkage.

::: remember
- Bias adalah meleset secara konsisten dan varians meleset secara tidak konsisten: underfitting berarti bias tinggi, overfitting berarti varians tinggi, dan fleksibilitas menukar yang satu dengan yang lain.
- Penalti ridge menambahkan λ kali jumlah kuadrat koefisien ke loss, yang memperkecil koefisien ke arah nol, menurunkan varians, dan menaikkan bias. Pilih λ berdasarkan galat validation, jangan pernah berdasarkan galat training.
- Learning curve yang mendatar di level tinggi dengan kesenjangan kecil menunjukkan bias; kesenjangan lebar yang menutup dengan lebih banyak data menunjukkan varians.
:::
