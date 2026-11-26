---
slug: causal-lab
title: Causal lab
---
::: intro
- Perkirakan seberapa jauh selisih observasional yang naif meleset dari efek sebenarnya yang kamu tetapkan, lalu bandingkan dengan estimasi hasil penyesuaian dan eksperimen acak hasil simulasi.
- Bedakan bias dari noise dengan menjalankan studi yang sama 200 kali, dan sebutkan apa yang dilakukan confounder yang tidak terukur, collider, dan overlap yang tipis terhadap setiap estimator.
- Tentukan ukuran uji coba dengan kurva power, lihat akibat mengintip hasil terhadap false positive, dan periksa setiap hasil pada populasi baru.

Sebelum mulai: baca "Eksperimen acak dan power" dan "Confounding dan efek perlakuan" di kursus ini.
:::

## Apa yang ditanyakan lab
*Mengapa lab ini memakai orang buatan?*

Pada studi nyata, efek sebenarnya tidak pernah diketahui, sehingga kamu tidak dapat menilai sebuah estimasi. Causal lab mengatasinya. Lab ini membuat 400 orang, masing-masing dengan confounder z yang terukur, treatment (treated atau control), dan outcome y. Kamu yang menetapkan efek sebenarnya, sehingga setiap estimator dapat dinilai terhadapnya.

Dua gagasan dari kursus ini bertemu di sini. "Confounding dan efek perlakuan" menunjukkan bahwa perbandingan biasa gagal ketika sebuah variabel memengaruhi siapa yang mendapat treatment sekaligus outcome-nya. "Eksperimen acak dan power" menunjukkan bahwa lemparan koin memperbaiki hal itu, serta berapa banyak orang yang dibutuhkan sebuah uji coba. Lab dimulai di dunia yang terkena confounding: z mendorong orang masuk ke treatment (**Kekuatan confounding** 1,5) dan menaikkan outcome mereka. Efek sebenarnya adalah +2,00.

[[figure:causal-lab/two-worlds|Orang yang sama, dua cara menentukan siapa yang mendapat treatment. Pada studi observasional z mengarahkan pilihan itu, dan kedua kelompok berbeda 1,26 simpangan baku pada z. Setelah lemparan koin, selisihnya 0,16.]]

Penguin dari Level 1 tidak punya treatment dan tidak punya efek sebenarnya yang diketahui, sehingga lab ini tidak punya pilihan data nyata. Yang kamu bawa pulang adalah kebiasaannya: ganti seed lalu periksa lagi.

## Selisih naif
*Mengapa efek 2,00 tampil sebagai 4,15?*

Di awal, lab memiliki 201 orang treated dan 199 orang control. **Selisih naif** adalah rata-rata outcome kelompok treated dikurangi rata-rata outcome kelompok control. Di sini kedua rata-ratanya 4,26 dan 0,11, sehingga selisih naifnya +4,15, lebih dari dua kali efek sebenarnya.

Penyebabnya adalah z. Orang treated punya rata-rata z +0,62 dan orang control −0,45, selisihnya 1,07, atau 1,26 simpangan baku. Di lab ini outcome seseorang tanpa treatment naik sekitar 2 untuk setiap kenaikan satu langkah z (garis titik-titik menunjukkannya), sehingga orang dengan z lebih tinggi hasilnya lebih baik meskipun tidak diberi treatment sama sekali.

> Contoh hitungan: selisih naif adalah efek sebenarnya ditambah keunggulan awal kelompok treated. Keunggulan awal itu 2 × 1,07 = 2,15. Maka selisih naifnya 2,00 + 2,15 = 4,15, dan kolom Galat di tabel menunjukkan +2,15.

Interval selisih naif adalah 3,75 sampai 4,54. Interval ini sempit dan tidak memuat +2,00, sehingga tabel menandainya **Tidak** di kolom **Memuat efek?**. Interval yang sempit menunjukkan bahwa estimasinya presisi. Interval itu tidak menunjukkan bahwa estimasinya benar.

> Gagasan kunci: confounding adalah bias, bukan noise. Bias tidak mengecil walaupun datamu bertambah.

## Menyesuaikan untuk z
*Bagaimana estimator lain bisa mendekati kebenaran?*

Tiga penyesuaian membandingkan orang yang sebanding pada z. Di awal, tabel memberi penyesuaian regresi +1,95, stratifikasi +2,08, dan inverse propensity weighting (IPW) +2,03, masing-masing dengan interval yang memuat +2,00. Galatnya −0,05, +0,08, dan +0,03.

[[figure:causal-lab/default-estimates|Tabel lab pada keadaan awalnya. Titik adalah estimasi, batang adalah interval 95%, garis putus-putus adalah efek sebenarnya. Hanya selisih naif yang meleset darinya.]]

::: deeper Ketika efeknya berubah menurut z
Slider **Heterogenitas (efek berubah menurut z)** membuat efek berubah menurut z. Lab lalu menilai estimasi terhadap efek sebenarnya rata-rata dari sampel. Pada 1,0 nilainya +2,08, bukan +2,00, dan baris detail di kotak di atas plot menyebutkannya.
:::

## Melempar koin
*Apa yang diubah oleh eksperimen acak?*

Eksperimen acak memakai 400 orang yang sama, tetapi koin yang menentukan siapa yang mendapat treatment: 187 treated dan 213 control pada lemparan pertama. Estimasinya +1,68, dengan interval 1,23 sampai 2,13, sehingga galatnya −0,32. Itu lebih jauh dari estimasi hasil penyesuaian, tetapi bukan kesalahan yang membesar seiring confounding: z kini hanya berbeda 0,16 simpangan baku di antara kedua kelompok.

Satu studi hanyalah satu undian. Tekan **Jalankan eksperimen acak** lima kali lagi, dan estimasinya berkeliaran di sekitar kebenaran: 2,03, 2,19, 2,13, 2,10, dan 1,82. Menilai sebuah estimator dari satu studi mencampur dua hal, dan bagian berikutnya memisahkannya.

Koin hanya penting ketika ada yang menjadi confounder. Pada **Kekuatan confounding** 0, selisih naif berbunyi +1,87 dan selisih acak +1,68. Tidak ada lagi confounding, sehingga keduanya tidak berbias, dan selisih 0,19 di antara keduanya sebanding dengan noise keduanya (standard error sekitar 0,23). Kuis Cepat menyebut dua galat sama dekat jika selisihnya kurang dari standard error itu.


## Bias dan noise
*Apa yang disembunyikan oleh satu studi?*

Sebuah estimator dapat salah dengan dua cara. **Bias** berarti bidikannya meleset: rata-ratanya dari banyak studi bukan kebenaran. **Noise**, atau sebaran, berarti goyangan: studi tunggal tersebar di sekitar rata-ratanya sendiri. **Jalankan 200 studi** mengulang seluruh eksperimen pada 200 populasi baru dan menggambar semua estimasinya.

Di awal, rata-rata estimasi dan sebarannya adalah:

| Estimator | Bias | Sebaran |
| --- | --- | --- |
| Naif | +2,15 | 0,20 |
| Stratifikasi | +0,22 | 0,16 |
| Regresi | 0,00 | 0,12 |
| IPW | +0,06 | 0,27 |
| Acak | −0,04 | 0,21 |

[[figure:causal-lab/bias-vs-noise|Rata-rata estimasi dari 200 studi, dengan satu sebaran di tiap sisi. Menaikkan sampel empat kali lipat dari 400 menjadi 1.600 membuat sebaran separuhnya dan membiarkan bias naif tetap di tempatnya.]]

Selisih naif rapat tetapi salah: setiap studi mendarat di dekat +4,15. Eksperimen acak benar secara rata-rata dan bergoyang sekitar 0,21 dari satu studi ke studi lain. Penyesuaian regresi paling presisi di sini, tetapi hanya karena outcome di lab memang berupa garis lurus terhadap z, yaitu yang dipasang regresi. Stratifikasi tetap berbias +0,22 karena lima kelompok z terlalu kasar untuk menghilangkan seluruh confounding.

Dengan **Ukuran sampel** 1600, sebaran naif turun menjadi 0,10 sementara biasnya tetap +2,14.

## Jebakan yang tidak dapat diperbaiki penyesuaian
*Apa yang merusak estimasi hasil penyesuaian?*

Penyesuaian hanya menghilangkan confounding yang dapat kamu sebut dan ukur. Nyalakan **Tambahkan confounder yang tidak terukur**, maka sebuah variabel tersembunyi mendorong orang ke treatment dan menaikkan outcome, dan tidak ada estimator yang diberi tahu tentangnya. Pada studi pertama, penyesuaian regresi bergeser ke +3,30, galat +1,30, dan tabel menandainya **Tidak**. Dari 200 studi, biasnya +1,70 sedangkan bias eksperimen acak −0,02. Pengacakan memutus hubungan tersembunyi itu juga, sesuatu yang tidak dapat dilakukan penyesuaian apa pun.

Satu run eksperimen acak tetap dapat berbunyi **Tidak**. Dengan confounder tersembunyi menyala, lemparan pertama memberi +1,36 dengan interval 0,75 sampai 1,97. Interval 95% meleset karena kebetulan 1 dari 20 kali, dan lemparan kedua memberi +2,01.

## Collider dan overlap yang tipis
*Penyesuaian mana yang justru memperburuk?*

Nyalakan **Tambahkan collider (akibat dari treatment dan outcome)** dan baris **Menyesuaikan collider** muncul. Menyesuaikan untuknya membawa estimasi ke −0,07, galat −2,07: efek yang nyata lenyap. Dari 200 studi, biasnya −2,00.

> Awas: interval yang rapat setelah penyesuaian yang cermat tidak mengatakan apa pun tentang confounder yang tidak terukur atau collider. Hanya pengetahuanmu tentang bagaimana treatment dipilih yang dapat menjawabnya.

::: deeper Overlap yang tipis
Turunkan **Overlap kelompok treated dan control** ke 0,2 dan treatment hampir sepenuhnya ditentukan oleh z. Hanya 14 dari 206 orang treated yang z-nya di bawah 0, dan hanya 11 dari 194 orang control yang z-nya di atas 0. IPW lalu mendarat di +4,17, sementara regresi tetap di +1,88 karena garis lurusnya menjangkau melewati celah itu.
:::

## Merancang uji coba
*Berapa banyak orang per kelompok yang dibutuhkan sebuah uji coba?*

Buka **Merancang uji coba: power**. Lab menanyakan uji coba dua kelompok dengan efek 0,5, sebaran outcome (sd) 1, taraf signifikansi 0,05, dan 50 orang per kelompok. Kartunya menunjukkan power 70,5% dan menyebut 63 per kelompok mencapai 80%.

> Contoh hitungan: standard error selisihnya adalah 1 × sqrt(2 / 50) = 0,2. Efeknya berada 0,5 / 0,2 = 2,5 standard error dari nol. Power adalah peluang estimasi melewati 1,96, yaitu 2,5 − 1,96 = 0,54 standard error di bawah pusatnya, sehingga sekitar 70,5%. Untuk 80%, aturan dari "Eksperimen acak dan power" memberi n = 2 × 2,80² × sd² / efek² = 15,68 / 0,25 = 62,7, yang dibulatkan ke atas menjadi 63.

Gandakan sebaran menjadi 2 dan uji coba yang sama punya power 24,0% serta membutuhkan 252 per kelompok, empat kali lipat. Memperkecil efek menjadi 0,25 menghasilkan hal yang sama. Mengatur alpha ke 0,01 menurunkan power pada 50 per kelompok menjadi 47,0% dan menaikkan kebutuhan menjadi 94.

[[figure:causal-lab/power-and-peeking|Kiri: power menurut orang per kelompok untuk sebaran 1 dan 2. Kanan: false positive ketika tidak ada efek nyata, jika kamu mengecek beberapa kali dan berhenti pada hasil signifikan pertama, dibandingkan dengan cutoff yang dikoreksi.]]

## Mengintip
*Apa akibat melihat hasil lebih awal?*

Nyalakan **Intip hasil selama uji coba berjalan**. Kartunya kini mensimulasikan 1.200 uji coba tanpa efek nyata, dengan pengecekan pada batch yang sama besar dan berhenti pada hasil signifikan pertama. Dengan 5 pengecekan, 14,7% uji coba menyatakan menang, bukan 5% yang dijanjikan. Dengan 10 pengecekan, angkanya 19,8%, karena setiap pengecekan adalah satu kesempatan lagi bagi keberuntungan untuk melewati garis. Menguji tiap pengecekan pada alpha dibagi jumlah pengecekan menjaganya di sekitar 3% (garis **Dikoreksi**).

## Batas lab ini
*Apa yang tidak dapat dikatakan lab ini?*

Lab ini adalah dunia sederhana: satu confounder terukur, garis lurus, kebenaran yang diketahui. Studi nyata tidak memberimu satu pun dari itu. Alat yang kamu latih sama dengan yang dipakai studi nyata: tanyakan bagaimana treatment dipilih, acaklah jika bisa, sesuaikan hanya untuk apa yang terjadi sebelum treatment dan memengaruhi keduanya, dan rencanakan ukuran sampel serta jumlah pengecekan sejak awal.

> Gagasan kunci: setiap estimasi yang tampak bagus pada satu populasi perlu dilihat lagi pada populasi baru. Tekan **Populasi baru** dan tanyakan apa yang masih bertahan.

::: remember
- Confounding membuat selisih naif berbias, dan data yang lebih banyak tidak menyembuhkan bias. Penyesuaian memperbaiki apa yang kamu ukur dan namai, sedangkan pengacakan memperbaiki sisanya juga.
- Bias adalah bidikan dan noise adalah goyangan: 200 studi berulang menunjukkan keduanya. Confounder yang tidak terukur, collider, dan overlap yang tipis masing-masing merusak sebagian estimasi hasil penyesuaian, sementara eksperimen acak tetap tepat sasaran.
- Tentukan ukuran uji coba sebelum menjalankannya: efek yang separuhnya atau sebaran yang dua kali lipat membutuhkan empat kali lebih banyak orang, dan mengintip mengubah tingkat kesalahan 5% menjadi sekitar 15% dengan 5 pengecekan.
:::

@@lab

## Lab: inferensi kausal dan eksperimen
Lab ini membuat 400 orang dengan confounder z yang mendorong mereka ke treatment dan menaikkan outcome mereka. Efek sebenarnya adalah +2,00. Kamu membandingkan estimasi observasional dengan eksperimen acak hasil simulasi, mengulang studi 200 kali, dan merancang uji coba. Tidak ada pilihan data nyata: efek sebenarnya dari dataset nyata tidak pernah diketahui.

### Kontrol
- Di bagian atas kotak Parameter: **Jalankan eksperimen acak** menetapkan ulang orang yang sama dengan lemparan koin dan mengalihkan plot, legenda, baris status, dan tabel ke eksperimen itu. Tekan pertama menampilkan lemparan pertama, dan setiap tekan berikutnya melempar lagi. **Jalankan 200 studi** mengulang seluruh studi pada 200 populasi baru dengan pengaturan saat ini; selama berjalan tombolnya berbunyi **Berhenti**. **Tampilkan eksperimen acak di plot** beralih antara studi observasional dan studi acak.
- Grup di bawahnya terbuka satu per satu. **Populasi** terbuka di awal. **Kekuatan confounding** (0 sampai 3, dimulai di 1,5) adalah seberapa kuat z mendorong orang ke treatment. **Overlap kelompok treated dan control** (0,1 sampai 1, dimulai di 1): makin rendah berarti treatment hampir sepenuhnya ditentukan oleh z. **Seed** (dimulai di 7) dan **Populasi baru**, yang menambah seed sebanyak 1.
- **Efek, ukuran, dan jebakan**: **Besar efek sebenarnya** (0 sampai 4, dimulai di 2), **Heterogenitas (efek berubah menurut z)** (0 sampai 2, dimulai di 0), **Ukuran sampel** (100 sampai 2000, dimulai di 400), **Tambahkan confounder yang tidak terukur** dan **Tambahkan collider (akibat dari treatment dan outcome)** (keduanya mati).
- **Merancang uji coba: power** tertutup di awal: **Efek yang ingin dideteksi** (0,1 sampai 1,5, dimulai di 0,5), **Sebaran outcome (simpangan baku)** (0,5 sampai 3, dimulai di 1), **Orang per kelompok** (10 sampai 500, dimulai di 50), **Taraf signifikansi (alpha)** (0,01 sampai 0,2, dimulai di 0,05), dan **Intip hasil selama uji coba berjalan** (mati). **Jumlah pengecekan** (2 sampai 10, dimulai di 5) hanya muncul selama mengintip menyala, dan saat itu **Efek yang ingin dideteksi** dan **Sebaran outcome (simpangan baku)** menjadi abu-abu.
- Setiap perubahan pada populasi menghapus chart 200 studi dan memulai lemparan koin dari awal. **Reset** mengembalikan setiap kontrol ke nilai awal dan menghapus kuis. **Layar penuh** memperbesar lab.
- **Kuis Cepat** adalah tombol yang menempel di bawah kotak Parameter (tombol di bawah kartu pengaturan (tombol bulat di kanan bawah pada ponsel) pada layar kecil). Pertanyaannya: "Confounding kuat. Estimasi mana yang paling dekat dengan efek sebenarnya: selisih naif atau eksperimen acak?" Pilih **Selisih naif**, **Eksperimen acak**, atau **Sama dekatnya**. Jawabannya baru muncul setelah sebuah eksperimen acak dijalankan.

### Membaca layar
- Plot punya **Confounder z** di sumbu horizontal dan **Outcome y** di sumbu vertikal. Legendanya memuat **Control (199)**, **Treated (201)**, **Efek sebenarnya +2,00**, **Selisih naif +4,15**, dan **Estimasi hasil penyesuaian +1,95**. Garis titik-titik adalah garis outcome sebenarnya, garis putus-putus adalah dua rata-rata kelompok, dan pasangan garis tebal adalah penyesuaian regresi. Sebuah kurung untuk tiap efek berwarna sama dengan entri legendanya, dan tingginya adalah efek itu.
- Baris status berbunyi "Studi observasional: selisih naif +4,15, estimasi hasil penyesuaian +1,95, efek sebenarnya +2,00." Dengan eksperimen acak ditampilkan, kalimatnya diawali "Eksperimen acak", dan legenda serta angkanya menggambarkan orang yang ditetapkan ulang. Baris detail di kotak di atas plot menyebut seberapa jauh treated dan control berbeda pada z, misalnya "Treated dan control berbeda 1,26 simpangan baku pada z di sini, dan 0,16 setelah treatment diacak".
- Tabel **Estimator dibandingkan dengan efek sebenarnya** punya kolom **Estimator**, **Estimasi**, **Interval 95%**, **Galat**, dan **Memuat efek?**, serta baris **Efek sebenarnya**, **Selisih naif**, **Stratifikasi (5 kelompok z)**, **Penyesuaian regresi**, **Inverse propensity (IPW)**, **Menyesuaikan collider**, dan **Eksperimen acak**. Galat adalah estimasi dikurangi efek sebenarnya. Baris **Tidak** disorot: intervalnya tidak memuat efek sebenarnya, yang terjadi karena kebetulan 1 dari 20 kali. Baris collider berbunyi **Aktifkan collider** sampai kamu menyalakannya, dan baris acak berbunyi **Belum dijalankan** sampai kamu menjalankannya.
- **Studi diulang: bias dan noise** berbunyi "Jalankan 200 studi untuk melihat di mana tiap estimator mendarat." dan "Belum ada yang dijalankan". Sesudahnya tiap baris (Naif, Stratifikasi, Regresi, IPW, Collider bila menyala, Acak) menampilkan satu titik per studi, sebuah berlian untuk rata-rata, dan angka "bias +2,15 · sebaran 0,20", dengan " · berbias" ketika biasnya jelas bukan noise. Garis putus-putus adalah efek sebenarnya.
- Kartu **Power menurut ukuran sampel** menampilkan kurva power, garis 80% putus-putus, dan penanda di **Orang per kelompok**, dengan petunjuk seperti "50 per kelompok: power 70,5%. 63 per kelompok mencapai 80%." Saat mengintip menyala, kartunya menjadi **False positive saat kamu mengintip** dan petunjuknya berbunyi, misalnya, "Tanpa efek nyata, 5 pengecekan: 14,7% false positive, bukan 5,0%. Dikoreksi: 3,3%."

### Eksperimen
Mulailah setiap eksperimen dengan **Reset**, agar lemparan koin dan angkamu sama.

1. **Confounding dan selisih naif.** Perkirakan: dengan **Kekuatan confounding** di 1,5, apakah selisih naif akan jatuh di atas, di bawah, atau dekat +2,00 yang sebenarnya, dan apa yang terjadi pada 0? Lihat baris **Selisih naif**: +4,15, galat +2,15, **Tidak**. Lalu atur slider ke 0: +1,87, galat −0,13, **Ya**. Pada 0,5 hasilnya +2,84 dan pada 3 hasilnya +4,91. Baca baris detail dan jelaskan keunggulan awal itu dengan selisih z (2 × 1,07 = 2,15 di awal).
2. **Lempar koin.** Perkirakan: buka **Kuis Cepat** dan pilih estimasi mana yang paling dekat dengan kebenaran. Lalu tekan **Jalankan eksperimen acak**. Plot beralih ke Control (213) dan Treated (187), dan baris tabelnya berbunyi +1,68, interval 1,23 sampai 2,13, galat −0,32. Kuis menyatakan eksperimen acak lebih dekat: galat +2,15 dan −0,32. Tekan tombolnya lima kali lagi: +2,03, +2,19, +2,13, +2,10, +1,82. Sekarang atur **Kekuatan confounding** ke 0: kuis menjawab lagi dan berkata "Sama dekatnya", karena galatnya, −0,13 dan −0,32, berbeda kurang dari standard error. Mengapa pengacakan penting hanya ketika ada confounding?
3. **Bias dan noise.** Perkirakan: titik estimator mana yang paling tersebar, dan berlian mana yang berada jauh dari garis putus-putus? Tekan **Jalankan 200 studi** dan tunggu sampai selesai. Naif berbunyi bias +2,15 · sebaran 0,20 · berbias, Stratifikasi +0,22 · 0,16 · berbias, Regresi 0,00 · 0,12, IPW +0,06 · 0,27, dan Acak −0,04 · 0,21. Lalu buka **Efek, ukuran, dan jebakan**, atur **Ukuran sampel** ke 1600 dan jalankan lagi, yang memakan beberapa detik. Sebaran naif turun menjadi 0,10 tetapi biasnya tetap +2,14. Mengapa data yang lebih banyak memperbaiki noise tetapi tidak bias?
4. **Jebakan.** Perkirakan: apakah penyesuaian regresi masih mendarat di dekat +2 dengan confounder tersembunyi? Buka **Efek, ukuran, dan jebakan** dan nyalakan **Tambahkan confounder yang tidak terukur**. Regresi bergeser ke +3,30 (galat +1,30, **Tidak**) dan IPW ke +3,42. Tekan **Jalankan eksperimen acak**: +1,36, **Tidak** karena kebetulan; tekan lagi: +2,01. Jalankan 200 studi: bias Regresi +1,70, Acak −0,02. Matikan confounder itu dan nyalakan **Tambahkan collider (akibat dari treatment dan outcome)**: **Menyesuaikan collider** berbunyi −0,07, galat −2,07. Matikan itu, buka lagi **Populasi**, dan turunkan **Overlap kelompok treated dan control** ke 0,2: IPW +4,17 (**Tidak**) dibandingkan Regresi +1,88. Dari ketiga jebakan itu, mana yang dapat kamu kenali hanya dari datanya?
5. **Power dan mengintip.** Perkirakan: jika **Sebaran outcome (simpangan baku)** dua kali lipat, berapa kali lebih banyak orang per kelompok yang dibutuhkan uji coba? Buka **Merancang uji coba: power**. Keadaan awal berbunyi power 70,5% dan 63 per kelompok untuk 80%. Atur sebaran ke 2: 24,0% dan 252 per kelompok. Atur **Orang per kelompok** ke 250: 79,8%. Kembalikan sebaran ke 1 dan **Orang per kelompok** ke 50, lalu atur **Taraf signifikansi (alpha)** ke 0,01: 47,0% dan 94 per kelompok. Kembalikan alpha ke 0,05 dan nyalakan **Intip hasil selama uji coba berjalan**: dengan 5 pengecekan 14,7% false positive, dan dengan **Jumlah pengecekan** di 10, 19,8%. Bagaimana kamu memperbaiki rencananya?
6. **Populasi baru.** Lab ini tidak punya pilihan data nyata, maka ujian pada sesuatu yang baru adalah populasi baru. Perkirakan: apakah selisih naif masih terlalu tinggi pada orang baru, dan apakah estimasi acak masih mendarat di dekat +2,00? Tekan **Populasi baru** dan baca tabelnya. Seed 8: Naif +4,31 (galat +2,31), Regresi +2,14. Seed 9: Naif +3,81, Regresi +2,10. Sekarang nyalakan **Tampilkan eksperimen acak di plot** dan baca baris **Eksperimen acak**: +1,84 pada seed 9. Ketik 8 di **Seed** dan baca lagi: +2,30. Kedua interval memuat efek sebenarnya. Apa yang berubah dari seed ke seed, dan apa yang tetap sama? Apakah satu seed sudah cukup untuk dipercaya?
