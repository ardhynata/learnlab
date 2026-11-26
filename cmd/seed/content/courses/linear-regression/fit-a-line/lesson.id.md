---
slug: fit-a-line
title: Mencari garis yang pas
---
::: intro
- Temukan garis terbaik untuk galat kuadrat dengan rumus singkat, lalu periksa pada empat titik.
- Baca loss sambil memutar satu dial (slope atau intercept): mangkuk yang mulus untuk galat kuadrat, bentuk V untuk galat absolut.
- Perkirakan bagaimana satu outlier menggeser garis terbaik untuk tiap loss, lalu uji pada data buatan dan data nyata.

Sebelum mulai: baca "Loss function".
:::

## Dari skor menjadi pencarian
*Apa artinya mencari garis yang pas?*

Pada "Loss function" kamu diberi sebuah garis, lalu kamu menilainya. **Fitting** membalik urutan itu. Tidak ada yang memberimu garis. Kamu sendiri yang mencari slope dan intercept dengan loss paling rendah. Kedua angka itu adalah **parameter** model, dan loss menjadi satu-satunya petunjukmu.

Bayangkan setiap pasangan slope dan intercept sebagai satu tempat di peta, dengan loss sebagai tinggi tempat itu. Fitting berarti berjalan menuju tempat yang paling rendah. Komputer melakukannya dalam sebuah loop: coba satu garis, beri skor, ubah sedikit, lalu beri skor lagi.

[[figure:fit-a-line/fit-loop|Fitting adalah sebuah loop. Setiap putaran mencoba satu garis, menilainya dengan loss, lalu mengubah garis itu supaya loss turun.]]

Di lab, kamu memainkan peran komputer. Kamu menggeser garisnya sendiri, dan layar menunjukkan loss setelah setiap gerakan. Dengan begitu kamu merasakan seperti apa pencarian ini sebelum program mengerjakannya untukmu.

## Persegi pada residual
*Bagaimana loss galat kuadrat dapat dilihat pada plot?*

Untuk mean squared error, gambar sebuah persegi pada setiap residual. Sisinya adalah residual, dan luasnya adalah residual kuadrat. MSE adalah rata-rata luas persegi-persegi itu.

> Contoh hitungan: ambil empat titik (1, 2), (2, 3), (3, 5), dan (4, 4) dari "Loss function", serta garis y = 0,8x + 1,5 (asal garis ini dijelaskan di bagian berikutnya). Garis memprediksi 2,3; 3,1; 3,9; dan 4,7, sehingga residualnya -0,3; -0,1; +1,1; dan -0,7. Luasnya 0,09; 0,01; 1,21; dan 0,49. Jumlahnya 1,8, dan 1,8 / 4 = 0,45. Maka MSE-nya 0,45.

[[figure:fit-a-line/squares-on-residuals|Empat titik, garis y = 0,8x + 1,5, dan sebuah persegi pada tiap residual. Persegi yang besar memuat sekitar dua pertiga dari total luas.]]

Persegi di (3, 5) bernilai 1,21 dari total 1,8, kira-kira dua pertiga. Dari empat persegi, satu di antaranya sudah menjadi sebagian besar loss.

> Gagasan kunci: mengecilkan persegi yang besar memberi hasil lebih banyak daripada mengecilkan persegi yang kecil dengan langkah yang sama. Itulah sebabnya garis terbaik untuk galat kuadrat tertarik ke titik-titik yang paling meleset.

## Garis terbaik untuk galat kuadrat
*Adakah rumus untuk MSE terendah?*

Ada. Garis dengan MSE terendah disebut garis **least squares**, dan kamu dapat menghitungnya dengan dua rumus:

`slope = jumlah (x - rata-rata x)(y - rata-rata y) / jumlah (x - rata-rata x)²`

`intercept = rata-rata y - slope × rata-rata x`

> Contoh hitungan: untuk keempat titik yang sama, rata-rata x = 2,5 dan rata-rata y = 3,5.

| x | y | x - 2,5 | y - 3,5 | hasil kali | kuadrat |
|---|---|---|---|---|---|
| 1 | 2 | -1,5 | -1,5 | 2,25 | 2,25 |
| 2 | 3 | -0,5 | -0,5 | 0,25 | 0,25 |
| 3 | 5 | 0,5 | 1,5 | 0,75 | 0,25 |
| 4 | 4 | 1,5 | 0,5 | 0,75 | 2,25 |
| Total | | | | 4 | 5 |

Slope-nya 4 / 5 = 0,8. Intercept-nya 3,5 - 0,8 × 2,5 = 1,5. Dengan demikian garisnya y = 0,8x + 1,5, yaitu garis pada gambar sebelumnya, dengan MSE 0,45.

Bandingkan dengan garis-garis pada "Loss function": garis A punya MSE 0,5 dan garis B punya 0,625. Tidak ada garis yang MSE-nya di bawah 0,45 pada keempat titik ini. Tombol "Ke garis terbaik" di lab memakai rumus ini ketika loss-nya MSE.

> Gagasan kunci: garis least squares selalu melewati titik (rata-rata x, rata-rata y). Di sini titiknya (2,5; 3,5): 0,8 × 2,5 + 1,5 = 3,5.

::: deeper Dari mana rumus itu berasal
Jika hanya satu dial yang diputar, MSE berbentuk mangkuk, dan titik terendahnya ada di tempat kurva itu datar. Dengan dua dial, loss berbentuk permukaan seperti mangkuk, dan titik terendahnya datar ke dua arah.

Datar ke arah intercept berarti jumlah residual sama dengan 0, yang menyatakan rata-rata y = slope × rata-rata x + intercept. Karena itu garisnya melewati (rata-rata x, rata-rata y). Datar ke arah slope, bersama fakta tadi, menghasilkan rumus slope. Kalkulus yang mengerjakan aljabarnya, dan kamu cukup memakai hasilnya.
:::

## Satu dial setiap kali
*Seperti apa bentuk loss ketika hanya slope yang diputar?*

Tahan intercept di 1, lalu geser slope. Untuk setiap slope, beri skor pada keempat titik yang sama.

| Slope | MSE | MAE |
|---|---|---|
| 0 | 7,5 | 2,5 |
| 0,5 | 2,125 | 1,25 |
| 1 | 0,5 | 0,5 |
| 1,5 | 2,625 | 1,25 |

[[figure:fit-a-line/bowl-and-v|Loss terhadap slope untuk keempat titik yang sama, dengan intercept ditahan di 1. Titik hijau menandai loss terendah.]]

MSE membentuk **mangkuk** yang mulus. Kurvanya turun curam di tempat yang jauh dari dasar, melandai di dekat dasar, dan hanya punya satu titik terendah, pada slope sekitar 0,97. Dari slope mana pun, berjalan menurun selalu mengarah ke titik itu, sehingga pencarian garis terbaik tidak mungkin tersangkut.

MAE membentuk **V** yang tersusun dari potongan-potongan lurus. Kurvanya menekuk di tempat garis melewati sebuah titik, dan titik terendahnya di sini ada pada slope 1, dengan MAE 0,5.

> Awas: nilai terbaik untuk satu dial bergantung pada dial yang lain. Dengan intercept 1, MSE terendah ada pada slope 0,97. Dengan intercept 1,5, MSE terendah ada pada slope 0,8. Kamu tidak dapat menyetel dial satu per satu lalu berhenti.

::: deeper Mengapa garis MAE terbaik melewati dua titik
Untuk setiap titik ada satu slope yang membuat garis melewatinya, dan di antara slope-slope seperti itu kurva MAE berupa potongan lurus. Rangkaian potongan lurus paling rendah di sebuah tekukan. Dengan kedua dial gagasannya sama, karena itu selalu ada garis MAE terbaik yang melewati sedikitnya dua titik. Lab memanfaatkan hal ini: untuk MAE, tombol "Ke garis terbaik" mencoba setiap pasangan titik dan menyimpan garis terbaiknya. Hasil seri dapat terjadi. Pada keempat titik tadi, garis A (y = x + 1), garis B (y = 0,5x + 2), dan y = 0,67x + 1,33 semuanya punya MAE 0,5.
:::

## Dua loss, dua garis terbaik
*Apakah MSE dan MAE memilih garis yang sama?*

Biasanya tidak. Pada keempat titik, garis least squares punya MAE 0,55, sedangkan garis A punya MAE 0,5. Menurut MAE, garis least squares bukan yang terbaik, dan menurut MSE, garis A bukan yang terbaik (0,5 dibandingkan 0,45). Setiap loss punya garis terbaiknya sendiri.

Selisihnya makin besar ketika ada satu titik yang jauh dari yang lain. Ambil tujuh titik di dekat sebuah garis: (1, 2), (2, 3), (3, 3), (4, 5), (5, 5), (6, 7), dan (7, 7). Lakukan fitting dengan kedua loss: garis MSE-nya y = 0,89x + 1,00 dan garis MAE-nya y = 0,83x + 1,17. Sekarang tambahkan satu titik yang jauh di (8, 1).

[[figure:fit-a-line/outlier-pull|Tujuh titik dan satu outlier di (8, 1). Garis MSE miring ke arah outlier. Garis MAE tetap persis di tempatnya.]]

Garis MSE berubah menjadi y = 0,30x + 2,79, garis yang jauh lebih landai karena tertarik ke bawah menuju outlier. Garis MAE tetap di y = 0,83x + 1,17. Titik yang jauh itu meleset dari garis MAE sekitar 6,8: selisih itu menambah 6,8 pada total absolut, tetapi sekitar 47 pada total kuadrat, sehingga galat kuadrat tidak dapat mengabaikannya.

> Awas: tidak ada reaksi yang selalu benar. Jika titik yang jauh itu adalah kesalahan pencatatan data, ketenangan MAE menguntungkan. Jika titik itu adalah kesalahan nyata yang mahal, alarm MSE justru petunjuk yang lebih baik.

## Apa yang tidak dijanjikan oleh "terbaik"
*Apakah loss terendah berarti garis itu adalah kebenarannya?*

Garis terbaik hanya yang terbaik untuk titik-titik ini dan loss ini, tidak lebih. Di lab, titik-titik buatan digambar di sekitar y = 0,6x + 1,5 ditambah **noise**, yaitu sebaran acak di sekitar garis itu, tetapi garis MSE terbaiknya punya slope 0,57 dan intercept 1,47. Noise menggesernya sedikit dari yang sebenarnya, dan sampel noise yang berbeda akan menggesernya ke tempat lain.

Loss juga tidak mencapai 0. Di lab, MSE terbaiknya 0,236, karena tidak ada garis lurus yang dapat mengikuti noise.

## Apa yang tidak ditunjukkan oleh loss yang rendah
*Apakah loss yang rendah berarti garis akan memprediksi dengan baik?*

Pada penguin yang nyata, garis least squares punya slope sekitar 49,7 g per mm dan intercept sekitar -5.781 g. Itu dekat dengan garis "50 per mm, dikurangi 5.800" yang kamu gambar dengan mata di "Garis dan prediksi", yang kini ditemukan dengan sebuah aturan, bukan dengan mata.

Loss yang rendah tidak membuktikan bahwa sebuah garis akan memprediksi dengan baik pada data baru, atau bahwa sebaran titiknya memang lurus. Course berikutnya, "Training dan generalisasi", menguji garis pada data yang belum pernah dilihat.

Sebelum membuka lab, perkirakan garis terbaik mana yang bergeser lebih jauh ketika kamu menambahkan satu titik yang jauh: garis MSE atau garis MAE.

::: remember
- Fitting sebuah garis berarti memilih slope dan intercept dengan loss paling rendah, dan loss adalah satu-satunya petunjuk.
- Untuk MSE, garis terbaiknya punya rumus dan kurva loss-nya berupa mangkuk yang mulus; untuk MAE, kurvanya berupa V dari potongan-potongan lurus.
- Setiap loss punya garis terbaiknya sendiri, dan satu outlier menarik garis MSE jauh lebih jauh daripada garis MAE.
:::

@@lab

## Lab: Cari garis yang pas, lihat loss-nya
Plot dimulai dengan 20 titik buatan dan sebuah garis yang kurang pas (slope 0,20, intercept 4,00) yang berada jauh di atas titik-titik itu. Kamu adalah pencarinya. Geser garisnya, amati residual dan loss-nya, lalu tekan **Ke garis terbaik** untuk melihat ke mana komputer akan berakhir.

### Kontrol
- **Data** berpindah antara **Data buatan** (20 titik acak dengan seed di sekitar y = 0,6 x + 1,5, selalu sama setiap kali) dan **Penguin (data nyata)** (panjang sirip terhadap massa tubuh, masing-masing diskalakan agar muat di plot dari 0,5 sampai 9,5). Sebanyak 342 penguin dipakai, dan 2 baris yang salah satu pengukurannya hilang (NA) dibuang.
- **Slope** (-0,5 sampai 1,5, mulai di 0,20) dan **Intercept** (0 sampai 6, mulai di 4,00) selalu sejalan dengan dua pegangan belah ketupat di plot. Seret sebuah pegangan, dan slider ikut bergerak; geser sebuah slider, dan pegangan ikut bergerak. Dengan keyboard, fokus ke plot, tekan panah kiri atau kanan untuk memilih pegangan, dan panah atas atau bawah untuk menggesernya (Shift untuk lompatan lebih besar).
- **Loss** memilih **MSE (galat kuadrat rata-rata)** atau **MAE (galat absolut rata-rata)**.
- **Tambah outlier** menambah satu titik di (9, 0,8), jauh di bawah pola data. Mencentangnya juga membuka jawaban untuk Kuis Cepat. Menghapus centangnya mengosongkan kotak itu kembali.
- **Tampilkan residual** menggambar garis residual vertikal dan, untuk loss kuadrat, sebuah persegi pada tiap residual (sisi = residual, luas = residual kuadrat). Pada data penguin hanya 12 persegi terbesar yang digambar.
- **Ke garis terbaik** memindahkan slider dan pegangan ke garis terbaik untuk loss yang dipilih: least squares untuk MSE, pencarian pasti atas pasangan-pasangan titik untuk MAE.
- **Layar penuh** memperbesar lab. **Reset** mengembalikan garis awal, loss kuadrat, tanpa outlier, residual menyala, dan Data buatan, serta menghapus prediksi.
- **Kuis Cepat** adalah tombol di bawah kartu pengaturan (tombol bulat di kanan bawah pada ponsel) (lencananya menghitung kuis yang belum kamu jawab; tombol ini membuka panel kecil): "Kamu menambah outlier. Garis terbaik mana yang bergeser lebih jauh: untuk MSE atau untuk MAE? Pilih satu, lalu centang 'Tambah outlier'." Pilih **Garis MSE bergeser lebih jauh**, **Garis MAE bergeser lebih jauh**, atau **Keduanya bergeser kurang lebih sama**, lalu centang Tambah outlier.

### Membaca layar
- Baris status memuat nama loss, loss garismu, dan loss pada garis terbaik, misalnya "MSE (galat kuadrat rata-rata): 1,958. Di garis terbaik: 0,236."
- Baris rincian memuat garismu, selisih terbesar, garis terbaik, dan berapa bagian dari total galat yang disumbang satu titik: "Garismu: y = 0,20 x + 4,00. Selisih terbesar: 2,13. Garis terbaik: slope 0,57, intercept 1,47. Satu titik menyumbang 12% dari total galat kuadrat." Dengan loss absolut, kalimatnya berbunyi "absolut".
- Baris di bawahnya menunjukkan kedua loss untuk garismu dan jumlah titik: "MSE 1,958 · MAE 1,123 · 20 titik".
- Pada plot, legenda memuat **Titik data**, **Outlier**, **Garismu**, **Pegangan garis (bisa digeser)**, **Residual**, dan **Residual kuadrat (luas)**. Arahkan kursor ke sebuah titik, atau ketuk titik itu, untuk melihat "residual 1,39 | kuadrat 1,92 | absolut 1,39" untuk titik tersebut.
- **Biaya tiap titik** memuat satu batang untuk tiap titik, dari kiri ke kanan: residual kuadrat untuk MSE, residual absolut untuk MAE. Garis putus-putus adalah rata-ratanya, yaitu loss. Batang outlier punya warna tersendiri.
- **Loss saat slope diubah** menampilkan loss pada setiap slope, dengan intercept ditahan di nilainya sekarang. Titik oranye adalah slope-mu dan titik hijau adalah loss terendah.
- **Dua loss untuk garis yang sama** adalah tabel dengan kolom **Milikmu** dan **Terbaik**, satu baris untuk tiap loss.
- Pada data penguin, kedua sumbu diskalakan ke plot 0 sampai 10 yang sama, sehingga slope dan loss berada dalam satuan plot, bukan dalam gram.

### Percobaan
1. **Kalahkan garis awal.** Prediksi: seberapa rendah MSE yang dapat kamu capai dengan menyeret pegangan, dan ke arah mana garis harus bergerak? Seret, lalu tekan Ke garis terbaik. Garis awal punya MSE 1,958 dan selisih terbesarnya 2,13. Garis terbaik punya slope 0,57, intercept 1,47, dan MSE 0,236, kira-kira 8 kali lebih rendah. Perhatikan bagaimana persegi-persegi mengecil ketika garis masuk ke dalam sebaran titik.
2. **Satu dial setiap kali.** Prediksi: dengan Intercept tertahan di 4,00, dapatkah menggeser Slope saja membuat MSE mendekati 0,24? Geser slider Slope dan amati titik hijau pada kurva. MSE terendah untuk intercept itu adalah 1,885, pada slope sekitar 0,15, sehingga tidak dapat. Setel Intercept ke 1,50 dan geser lagi: titik hijau pindah ke slope 0,57 dan MSE 0,237. Jelaskan mengapa slope terbaik bergantung pada intercept.
3. **Garis yang sama, dua loss.** Prediksi: jika kamu menekan Ke garis terbaik dengan Loss pada MSE (galat kuadrat rata-rata), apakah tabel akan menunjukkan Milikmu sama dengan Terbaik juga pada baris MAE? Tekan, lalu baca tabelnya: MAE Milikmu 0,335, Terbaik 0,319. Ganti Loss ke MAE (galat absolut rata-rata) dan tekan lagi. Sekarang MAE-nya 0,319, dan baris MSE menunjukkan Milikmu 0,245 dibandingkan Terbaik 0,236. Kurvanya kini berbentuk V. Setiap loss punya garis terbaiknya sendiri, dan di sini keduanya berdekatan.
4. **Tambah outlier.** Tekan Reset. Pilih jawaban di Kuis Cepat, lalu centang Tambah outlier. Kotak itu menyebut garis MSE bergeser 0,55 rata-rata dan garis MAE 0,04, dalam satuan plot. Dengan Loss pada MSE (galat kuadrat rata-rata), tekan Ke garis terbaik: garisnya menjadi slope 0,41, intercept 1,96, dan satu titik menyumbang 71% dari total galat kuadrat. Jelaskan, dengan melihat diagram batang, siapa titik itu.
5. **Satu selisih, dua bagian.** Biarkan outlier menyala. Prediksi: apakah outlier menyumbang bagian galat yang sama pada kedua loss? Ganti Loss ke MAE (galat absolut rata-rata) dan tekan Ke garis terbaik: slope 0,60, intercept 1,35, dan outlier menyumbang 48% dari galat absolut (batangnya 5,91, rata-rata putus-putusnya 0,586). Sekarang ganti Loss kembali ke MSE (galat kuadrat rata-rata) tanpa menggeser garis: titik yang sama menyumbang 88%. Pengkuadratan mengubah satu selisih besar menjadi sebagian besar loss.
6. **Pindah ke data nyata.** Tekan Reset, lalu setel Data ke Penguin (data nyata). Prediksi: apakah outlier menggeser garis terbaik sejauh pada 20 titik buatan? Tekan Ke garis terbaik dengan tiap loss: MSE memberi slope 0,81, intercept 0,26, dan MSE 0,966; MAE memberi slope 0,83, intercept 0,13, dan MAE 0,780. Slope 0,81 satuan plot setara dengan sekitar 49,7 g per mm, garis dari "Garis dan prediksi". Sekarang centang Tambah outlier (seekor penguin dengan sekitar 228 mm dan 2.820 g): kotak itu menyebut garis MSE bergeser hanya 0,05 dan garis MAE 0,00. Titik buatan tidak pernah berubah, sehingga data penguin adalah data segarmu. Apakah kedua data sepakat bahwa garis MSE-lah yang bergeser? Apakah keduanya sepakat soal seberapa jauh? Satu titik yang jauh berpengaruh lebih kecil jika ia satu di antara 343 titik daripada satu di antara 21.
