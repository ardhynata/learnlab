---
slug: loss-functions
title: Loss function
---
::: intro
- Menghitung residual, mean absolute error (MAE), dan mean squared error (MSE) secara manual.
- Menjelaskan bagaimana setiap residual menyumbang ke loss, dan mengapa pengkuadratan membuat kesalahan besar berbobot jauh lebih berat.
- Memperkirakan bagaimana satu titik yang jauh menggeser masing-masing loss.

Sebelum mulai: baca "Garis dan prediksi".
:::

## Garis butuh sebuah skor
*Mengapa kita perlu satu angka untuk menilai seberapa pas sebuah garis?*

Garis adalah sebuah model: untuk setiap x, garis memprediksi y sebagai slope dikali x, ditambah intercept.

Garis mana yang lebih baik? Matamu dapat mengenali garis yang jelas buruk, tetapi tidak dapat mengurutkan dua garis yang sama-sama tampak wajar, dan komputer tidak punya mata sama sekali. Komputer membutuhkan aturan yang mengubah sebuah garis beserta datanya menjadi satu angka, dengan angka yang lebih kecil berarti garis yang lebih baik. Angka itu disebut **loss**, dan aturan yang menghitungnya disebut **loss function**.

Semua loss function dalam pelajaran ini berangkat dari bahan mentah yang sama: seberapa jauh setiap prediksi dari nilai sebenarnya. Perbedaannya ada pada cara mereka merangkum kesalahan-kesalahan itu menjadi satu angka, dan pilihan itulah yang menentukan apa yang dihargai dan dihukum oleh loss.

> Gagasan kunci: loss adalah skor untuk sebuah garis, dan makin kecil makin baik. Dua loss dapat berbeda pendapat tentang garis mana yang lebih baik, bahkan ketika salah satunya menganggapnya seri.

## Residual
*Seberapa meleset satu prediksi?*

**Residual**, yang sudah kamu temui di "Garis dan prediksi", adalah selisih pada satu titik: nilai sebenarnya (aktual) dikurangi nilai prediksi.

`residual = actual - predicted`

Ambil garis y = x + 1 dan titik (3, 5). Pada x = 3 garis memprediksi 4. Nilai sebenarnya 5, sehingga residual-nya 5 - 4 = +1. Titik itu berada di atas garis. Titik di bawah garis memiliki residual negatif, dan titik di garis memiliki residual 0. Pada plot, residual adalah ruas vertikal antara titik dan garis.

[[figure:loss-functions/residual-segments|Empat titik dan garis y = x + 1. Setiap ruas vertikal adalah sebuah residual, lengkap dengan tandanya.]]

Kamu tidak dapat menilai garis dengan menjumlahkan residual begitu saja. Titik (4, 4) memiliki residual 4 - 5 = -1, dan jika dijumlahkan dengan +1 dari (3, 5) hasilnya 0, seolah-olah tidak ada titik yang meleset. Kesalahan yang berlawanan tanda saling meniadakan, sehingga sebuah loss harus lebih dulu membuat setiap kesalahan menjadi positif.

## Mean absolute error
*Bagaimana jika tanda dibuang lalu kesalahannya dirata-ratakan?*

**Mean absolute error (MAE)**, atau galat absolut rata-rata, mengambil nilai mutlak setiap residual, yaitu ukurannya tanpa tanda, lalu merata-ratakannya:

`MAE = (|r1| + |r2| + ... + |rn|) / n`

Di sini r1 sampai rn adalah residual dan n adalah banyaknya titik. Garis y = x + 1 memiliki residual 0, 0, +1, dan -1 pada keempat titik di gambar. Nilai mutlaknya 0, 0, 1, dan 1, sehingga MAE = (0 + 0 + 1 + 1) / 4 = 0,5.

MAE punya makna yang lugas: ia adalah kesalahan yang tipikal, dalam satuan y. Jika y adalah harga dalam euro, MAE 0,5 berarti prediksi meleset rata-rata setengah euro. Garis yang sempurna memiliki MAE 0. Setiap titik menyumbang ke total sebanding dengan kesalahannya: kesalahan 4 menyumbang empat kali lipat kesalahan 1.

## Mean squared error
*Bagaimana jika setiap kesalahan dikuadratkan?*

**Mean squared error (MSE)**, atau galat kuadrat rata-rata, mengkuadratkan setiap residual lalu merata-ratakan hasilnya:

`MSE = (r1² + r2² + ... + rn²) / n`

Kuadrat tidak pernah negatif, sehingga pengkuadratan juga menghilangkan tanda. Untuk residual yang sama, 0, 0, +1, dan -1, kuadratnya 0, 0, 1, dan 1, sehingga MSE = 0,5, sama dengan MAE. Keduanya sama di sini hanya karena setiap kesalahan tepat bernilai 1.

Kuadrat dari kesalahan 1 adalah 1. Kuadrat dari kesalahan 4 adalah 16. Biayanya tumbuh lebih cepat daripada kesalahannya: kesalahan yang empat kali lebih besar dihitung enam belas kali lebih berat.

[[figure:loss-functions/penalty-curves|Apa yang disumbangkan satu residual ke masing-masing loss. Kesalahan mutlak tumbuh lurus; kesalahan kuadrat melengkung naik jauh lebih cepat.]]

MSE diukur dalam satuan kuadrat: jika y dalam euro, MSE dalam euro kuadrat, yang sulit dibayangkan. MAE tetap dalam euro.

## Membandingkan dua garis
*Dapatkah kita menilai dua garis dengan hitungan manual?*

Ambil empat titik (1, 2), (2, 3), (3, 5), dan (4, 4), serta dua garis kandidat: **A** adalah y = x + 1 dan **B** adalah y = 0,5x + 2.

[[figure:loss-functions/two-lines|Empat titik yang sama di bawah dua garis. Angka di bawah setiap panel adalah loss yang dihitung di bawah.]]

Garis A memprediksi 2; 3; 4; dan 5, sehingga residual-nya 0; 0; +1; dan -1. Garis B memprediksi 2,5; 3; 3,5; dan 4, sehingga residual-nya -0,5; 0; +1,5; dan 0.

| Garis | MAE | MSE |
|---|---|---|
| A | (0 + 0 + 1 + 1) / 4 = 0,5 | (0 + 0 + 1 + 1) / 4 = 0,5 |
| B | (0,5 + 0 + 1,5 + 0) / 4 = 0,5 | (0,25 + 0 + 2,25 + 0) / 4 = 0,625 |

MAE menganggapnya seri. MSE lebih memilih A, karena B memiliki satu kesalahan yang lebih besar (1,5), dan pengkuadratan membuat kesalahan itu lebih berat daripada kesalahan-kesalahan kecil jika digabungkan.

> Awas: bandingkan loss yang sama antar garis, jangan pernah membandingkan satu loss dengan loss yang lain. MAE 0,5 dan MSE 0,625 berada pada skala yang berbeda sehingga tidak dapat diurutkan.

## Sumbangan setiap residual
*Apa yang dilakukan satu titik yang jauh terhadap total?*

Tambahkan titik kelima, (5, 11), yang jauh di atas pola. **Outlier** adalah titik seperti ini, jauh dari yang lain, misalnya karena salah ketik atau kejadian yang sekali terjadi. Garis A memprediksi 6 pada x = 5, sehingga residual barunya +5. Berikut sumbangan setiap titik ke total:

| Titik | Residual | Kesalahan mutlak (menyumbang ke MAE) | Kesalahan kuadrat (menyumbang ke MSE) |
|---|---|---|---|
| (1, 2) | 0 | 0 | 0 |
| (2, 3) | 0 | 0 | 0 |
| (3, 5) | +1 | 1 | 1 |
| (4, 4) | -1 | 1 | 1 |
| (5, 11) | +5 | 5 | 25 |
| Total | | 7 | 27 |
| Bagi 5 | | MAE = 1,4 | MSE = 5,4 |

[[figure:loss-functions/outlier-share|Bagaimana total untuk garis A terbagi di antara titik-titik. Outlier menyumbang bagian terbesar dari keduanya, tetapi jauh lebih besar pada MSE.]]

Outlier menyumbang 5 dari 7 pada total MAE, sekitar 71 persen, dan 25 dari 27 pada total MSE, sekitar 93 persen. Dari data yang bersih, MAE naik dari 0,5 menjadi 1,4, yaitu 2,8 kali, sedangkan MSE naik dari 0,5 menjadi 5,4, sekitar 11 kali.

::: deeper Angka tunggal yang dipilih setiap loss
Lupakan garisnya dan prediksikan satu konstanta untuk nilai 1, 2, 3, dan 10. MSE paling kecil pada **rata-rata (mean)**, yaitu 4: nilainya 12,5 di sana, dibandingkan 14,75 pada 2,5. MAE paling kecil pada **median**, yaitu nilai mana pun dari 2 sampai 3: nilainya 2,5 pada 2,5, dibandingkan 3 pada 4.

Dengan demikian MSE mengejar rata-rata, dan angka 10 menariknya naik ke 4. MAE menetap di tengah data dan menghitung angka 10 hanya menurut ukurannya. Ini adalah perbedaan tarikan versus ketenangan yang sama seperti pada tabel di atas.
:::

::: deeper Mengembalikan MSE ke satuan y
Akar kuadrat dari MSE adalah **root mean squared error (RMSE)**, dan satuannya kembali sama dengan y. Untuk garis A pada empat titik bersih, RMSE = sqrt(0,5), sekitar 0,71, mendekati MAE 0,5. Dengan outlier, RMSE = sqrt(5,4), sekitar 2,32, dibandingkan MAE 1,4. Selisih antara RMSE dan MAE adalah tanda cepat bahwa beberapa kesalahan besar mendominasi.
:::

## Memilih loss, dan lab
*Loss mana yang sebaiknya dipakai, dan apa langkah berikutnya?*

Garis yang mengejar MSE rendah akan berusaha keras menyusutkan residual terbesarnya, sehingga cenderung miring ke arah outlier. Garis yang mengejar MAE rendah kurang terganggu oleh satu titik yang jauh. Tidak ada reaksi yang selalu benar.

- Jika outlier adalah kekeliruan, misalnya nilai yang salah ketik, ketenangan MAE adalah keunggulan.
- Jika kesalahan besar memang mahal, misalnya pengiriman yang terlambat sehari, kepekaan MSE adalah keunggulan.
- Jika kamu menginginkan kesalahan tipikal dalam satuan yang mudah dipahami, laporkan MAE.

Loss juga punya tugas kedua: ketika komputer mencari garis terbaik, loss adalah satu-satunya hal yang ia lihat. Ubah loss-nya, dan kamu mengubah arti dari "terbaik".

Di lab "Fit a line", kamu menarik sebuah garis melewati titik-titik yang mengandung noise dan melihat bagaimana setiap residual menyumbang ke loss. Sebelum membukanya, perkirakan apa yang terjadi pada masing-masing loss ketika kamu menarik garis ke arah satu titik yang jauh.

::: remember
- Residual adalah nilai sebenarnya dikurangi prediksi; loss mengubah semua residual menjadi satu angka, dan makin kecil makin baik.
- MAE menambahkan setiap kesalahan menurut ukurannya; MSE menambahkan setiap kesalahan yang dikuadratkan, sehingga kesalahan yang empat kali lebih besar dihitung enam belas kali lebih berat.
- Satu outlier dapat menyumbang sebagian besar total MSE, sehingga pilihan loss menentukan seberapa kuat ia mengarahkan garis.
:::
