---
slug: calibration-lab
title: Lab kalibrasi
---
::: intro
- Bandingkan tiga predictor yang mengurutkan kasus yang sama dengan urutan yang sama, lalu lihat di mana probabilitas mereka mulai berbeda.
- Perkirakan bagaimana threshold, biaya, dan rekalibrasi mengubah jumlah kasus yang ditandai dan biaya per kasus.
- Periksa pada sampel baru hasil mana yang bertahan dan mana yang bergantung pada sampelnya.

Sebelum mulai: baca "ROC dan precision-recall" dan "Kalibrasi dan biaya".
:::

## Pertanyaan lab ini
*Apakah dua predictor dengan ranking yang sama mengambil keputusan yang sama?*

Dua pelajaran terakhir memberimu dua pertanyaan yang terpisah. Ranking bertanya apakah kasus positif berada di atas kasus negatif, dan AUC mengukurnya. Kalibrasi bertanya apakah prediksi 0,8 benar-benar terjadi sekitar 80 persen dari waktu. Di lab kalibrasi, kamu menjaga yang pertama tetap dan mengubah yang kedua.

Lab ini memberi skor pada 1.000 kasus buatan dengan tiga predictor: **Terkalibrasi baik**, **Overconfident**, dan **Underconfident**. Ketiganya memberi kasus urutan yang sama, sehingga kurva ROC-nya saling menumpuk. Yang berbeda hanya angkanya: predictor overconfident mendorongnya ke arah 0 dan 1, sedangkan predictor underconfident menekannya ke tengah. Pada pengaturan awal, 198 dari 1.000 kasus adalah positif.

| Sampel awal | Terkalibrasi baik | Overconfident | Underconfident |
|---|---|---|---|
| AUC | 0,892 | 0,892 | 0,892 |
| Brier score | 0,098 | 0,106 | 0,122 |

Datanya selalu buatan, karena data penguin tidak punya probabilitas model yang dapat dikalibrasi. Setiap percobaan di bawah dimulai dari **Reset**, sehingga angkamu sama dengan angka di pelajaran ini.

## Threshold yang sama, kasus yang sama
*Mengapa tiga predictor yang berbeda menandai kasus yang sama pada 0,5?*

Ambil threshold 0,5: sebuah kasus ditandai positif bila skornya sama dengan atau di atas threshold itu. Meregangkan atau menekan skor di sekitar 0,5 memindahkan setiap skor, tetapi skor di atas 0,5 tetap di atasnya dan skor di bawahnya tetap di bawah. Karena itu ketiga predictor menandai 138 kasus yang sama dari 1.000.

[[figure:calibration-lab/score-maps|Bagaimana tiga predictor mengubah kasus yang sama menjadi tiga angka yang berbeda. Ketiga kurva memotong 0,5 pada kasus yang sama, sehingga threshold 0,5 menghasilkan keputusan yang sama. Pada 0,17, threshold jatuh di tiga kasus yang berbeda.]]

> Contoh hitungan: pada 0,5 tiap predictor punya 38 false positive dan 98 false negative. Bila sebuah false positive berbiaya 1 dan sebuah false negative berbiaya 5, biaya per kasus adalah (38 × 1 + 98 × 5) / 1.000 = 528 / 1.000 = 0,528, sama untuk ketiganya.

Rankingnya sama, jadi kasus yang sama berada di urutan teratas. Threshold 0,5 hanya tampak setara karena itulah satu-satunya threshold yang tidak dapat digeser oleh peregangan tadi. Threshold lain mana pun memilih jumlah kasus yang berbeda dari tiap predictor di antara ketiganya.

## Membaca reliability diagram
*Di mana ketiga predictor mengatakan lebih banyak daripada yang mereka ketahui?*

**Reliability diagram tiap predictor** memasukkan kasus ke 10 bin menurut probabilitas prediksinya, lalu membandingkan rata-rata prediksi dengan proporsi yang benar-benar positif. Predictor yang terkalibrasi baik tetap dekat dengan diagonal. Dua lainnya tidak, dan angka di bawah tiap panel menunjukkan tempat kasus-kasusnya menumpuk.

Predictor overconfident menaruh 741 dari 1.000 kasus di bin terendah, dengan rata-rata prediksi 0,008. Di bin itu sekitar 7 persen kasusnya positif, jadi "hampir nol" ternyata jauh dari nol. Bin-bin tingginya menunjukkan kebalikannya: prediksi 0,97 hanya terjadi pada sekitar 83 persen kasus. Predictor underconfident tidak pernah melewati 0,8, dan di bin sekitar 0,15 hanya 2 dari 223 kasus yang positif (sekitar 1 persen).

**Brier score** merangkum semua ini. Makin kecil makin baik, dan nilainya makin kecil ketika angkanya makin jujur: 0,098 untuk predictor terkalibrasi baik, lalu 0,106 dan 0,122, dengan ranking yang sama. Jadi Brier score membedakan hal yang tidak dapat dibedakan AUC.

> Gagasan kunci: kurva ROC dan AUC melihat urutan. Reliability diagram dan Brier score melihat angkanya. AUC yang sama tidak berarti probabilitas yang sama.

## Threshold dari biaya
*Predictor mana yang diuntungkan oleh threshold berbasis biaya?*

Pelajaran "Kalibrasi dan biaya" menunjukkan bahwa, dengan probabilitas yang jujur, kamu menandai sebuah kasus ketika p melebihi biaya sebuah false positive dibagi jumlah kedua biaya. Dengan false positive berbiaya 1 dan false negative berbiaya 5, hasilnya 1 / (1 + 5) = 0,17. Nyalakan **Pakai threshold berbasis biaya**, dan lab menerapkannya pada ketiga predictor.

Sekarang ketiganya sangat berbeda, karena 0,17 berarti hal yang berbeda bagi masing-masing.

| Pada 0,17 | Kasus ditandai | False positive | False negative | Biaya per kasus |
|---|---|---|---|---|
| Terkalibrasi baik | 367 | 197 | 28 | 0,337 |
| Overconfident | 229 | 87 | 56 | 0,367 |
| Underconfident | 786 | 588 | 0 | 0,588 |

> Contoh hitungan: untuk predictor terkalibrasi baik, 197 × 1 + 28 × 5 = 337, dan 337 / 1.000 = 0,337.

Predictor overconfident mendorong banyak kasus berisiko ke bawah 0,17 dan melewatkan 56 kasus positif. Predictor underconfident menekan begitu banyak kasus ke atas 0,17 sehingga ia menandai 786 kasus dan tidak melewatkan satu pun. Aturan biaya mengandaikan probabilitas yang jujur, dan hanya satu predictor yang memilikinya.

## Threshold terbaik tiap predictor
*Apakah ada predictor yang lebih buruk, atau ia hanya butuh threshold yang lain?*

Cincin pada plot ROC dan kurva di **Biaya per kasus terhadap threshold** menunjukkan threshold terbaik tiap predictor. **Panel keputusan: biaya tiap predictor** mendaftarkannya: 0,19 untuk predictor terkalibrasi baik, 0,03 untuk yang overconfident, dan 0,36 untuk yang underconfident.

[[figure:calibration-lab/cost-curves|Biaya per kasus terhadap threshold untuk ketiga predictor, dengan threshold berbasis biaya 0,17. Ketiga kurva punya titik terendah yang sama, 0,333, pada threshold yang berbeda.]]

Biaya per kasus terendahnya 0,333 untuk ketiganya. Sebuah threshold memilih potongan teratas dari ranking, dan ketiga predictor berbagi satu ranking, sehingga mereka dapat mencapai potongan yang persis sama. Kalibrasi tidak mengubah apa yang dapat kamu capai. Ia menentukan threshold mana yang membawamu ke sana.

Bila kamu tidak tahu di mana threshold itu berada, aturan biaya hanya membantu untuk predictor terkalibrasi baik, yang threshold terbaiknya (0,19) berada dekat 0,17.

> Awas: threshold terbaik diukur pada satu sampel ini saja. Ia petunjuk tentang letak lembahnya, bukan angka untuk dibawa ke data baru.

## Rekalibrasi dengan Platt scaling
*Dapatkah angkanya diperbaiki tanpa menyentuh urutan?*

Nyalakan **Rekalibrasi (Platt scaling)**. Lab mencocokkan sebuah regresi logistik kecil yang memetakan skor tiap predictor ke probabilitas, memakai sampel terpisah berisi 3.000 kasus, lalu menerapkannya pada 1.000 kasus yang kamu lihat. Peta yang selalu naik menjaga urutan, sehingga AUC tetap 0,892.

Ketiga Brier score kini menjadi 0,098, dan ketiga threshold terbaik menjadi 0,20. Peta-petanya hampir berimpit, jadi pada threshold berbasis biaya 0,17 keputusannya juga.

[[figure:calibration-lab/platt-effect|Kasus yang ditandai pada threshold berbasis biaya 0,17 sebelum dan sesudah Platt scaling. Tiga batang 367, 229, dan 786 menjadi 375, 373, dan 375.]]

::: deeper Mengapa Platt scaling bekerja sebaik itu di sini
Lab membuat ketiga predictor dengan mengalikan log-odds yang sama (skor sebelum sigmoid memerasnya ke 0 sampai 1) dengan 1, 2,5, dan 0,4. Platt scaling mempelajari sebuah pengali dan sebuah offset pada log-odds dari skor. Untuk predictor overconfident ia menemukan pengali sekitar 0,4, yang membatalkan 2,5, dan untuk yang underconfident sekitar 2,5, yang membatalkan 0,4. Model sungguhan jarang terdistorsi serapi itu, jadi hasilnya jarang sebersih ini.
:::

> Awas: Platt scaling dicocokkan pada sampel terpisah. Mencocokkannya pada kasus yang kemudian kamu beri skor akan membuat hasilnya tampak lebih bagus daripada kenyataan.

## Kasus positif yang jarang dan sampel baru
*Hasil mana yang bertahan pada sampel yang berbeda?*

Turunkan **Persentase kasus positif (prevalensi)** menjadi 5. Sekarang hanya ada 52 kasus positif. Pada 0,5 ketiga predictor menandai 8 kasus yang sama dan melewatkan 49 kasus positif: biaya per kasusnya (5 × 1 + 49 × 5) / 1.000 = 0,250. Tidak menandai apa pun akan berbiaya 52 × 5 / 1.000 = 0,260, jadi kebiasaan memakai 0,5 nyaris tidak mengalahkan tidak berbuat apa-apa. Threshold terbaiknya mencapai 0,151.

**Sampel baru** menarik kasus yang berbeda. Pada sampel kedua, threshold terbaiknya 0,16, 0,02, dan 0,34, dan pada sampel ketiga 0,30, 0,10, dan 0,41. Cincin predictor overconfident selalu berada paling kiri dan cincin predictor underconfident paling kanan. Yang bergeser adalah threshold terbaik predictor terkalibrasi baik itu sendiri: 0,19, 0,16, dan 0,30 pada tiga sampel, sementara aturan biaya mengatakan 0,17. Pilih threshold pada data validasi, dan harapkan angkanya berubah-ubah.

## Ketika data sungguhan masuk
*Bagaimana kamu akan menjalankan ini pada dataset sungguhan?*

Lab ini tidak dapat memakai penguin. Tabel penguin berisi hasil pengukuran, bukan probabilitas model, jadi tidak ada yang dapat dikalibrasi. Pada data sungguhan, kamu lebih dulu melatih sebuah classifier, misalnya regresi logistik dari Level 1, lalu memberi skor pada kasus yang tidak dipakai untuk melatihnya.

Setelah itu kamu mengulang apa yang dilakukan di sini, dengan urutan yang sama. Lihat ranking dengan kurva ROC dan AUC. Lihat angkanya dengan reliability diagram dan Brier score. Tetapkan biaya tiap kesalahan, hitung threshold berbasis biaya, lalu bandingkan biaya per kasusnya dengan 0,5 pada data yang ditahan. Bila probabilitasnya meleset, rekalibrasi pada sampel terpisah dan periksa lagi.

::: remember
- Ranking dan AUC tidak mengatakan apakah probabilitasnya jujur. Periksa juga reliability diagram dan Brier score.
- Ketiga predictor ini menandai kasus yang sama pada 0,5 hanya karena peregangannya membiarkan 0,5 tetap di tempatnya. Pada threshold lain mereka menandai kasus yang berbeda, namun masing-masing mencapai biaya terendah yang sama pada threshold terbaiknya sendiri.
- Platt scaling mencocokkan sebuah peta pada sampel terpisah, memperbaiki angkanya, dan menjaga urutan, sehingga AUC tetap dan keputusannya berimpit. Threshold terbaik tetap berubah-ubah dari sampel ke sampel.
:::

@@lab

## Lab: kalibrasi
Tiga predictor buatan memberi skor pada 1.000 kasus yang sama dengan urutan yang sama. Kamu memilih biaya, threshold, dan apakah akan merekalibrasi, lalu lab menampilkan reliability, keputusan, dan biaya per kasus tiap predictor. Kurva ROC-nya sengaja saling menumpuk, jadi semua yang berbeda berkaitan dengan probabilitas.

### Kontrol
- **Persentase kasus positif (prevalensi)** (1 sampai 50 persen; mulai dari 20) menentukan berapa banyak kasus yang positif. Mengubahnya menggambar ulang sampel.
- **Biaya false positive** (0 sampai 100; mulai dari 1) dan **Biaya false negative** (0 sampai 100; mulai dari 5) menentukan biaya tiap kesalahan. Keputusan yang benar tidak berbiaya.
- **Pakai threshold berbasis biaya** mengubah threshold menjadi biaya sebuah false positive dibagi jumlah kedua biaya, di sini 0,17. Labelnya menampilkan angka itu. Kontrol ini nonaktif bila kedua biaya 0, dan ketika menyala ia menonaktifkan slider.
- **Threshold keputusan** (0,01 sampai 0,99; mulai dari 0,5) adalah batasnya. Sebuah kasus ditandai positif bila skornya sama dengan atau di atas threshold itu.
- **Rekalibrasi (Platt scaling)** (mati pada awalnya) mencocokkan sebuah peta pada sampel terpisah berisi 3.000 kasus dan menerapkannya pada ketiga predictor.
- **Sampel baru** menarik sampel kasus yang berbeda. **Reset** mengembalikan setiap kontrol ke nilai awalnya, sampel pertama, dan **Kuis Cepat** yang belum dijawab.
- **Kuis Cepat** adalah tombol di bawah kartu Pengaturan (tombol di bawah kartu pengaturan (tombol bulat di kanan bawah pada ponsel) pada ponsel). Ia bertanya "Dua model memiliki AUC yang persis sama. Apakah keduanya akan mengambil keputusan yang sama pada threshold 0,5?" dengan pilihan **Ya, keputusannya sama** dan **Tidak, keduanya menandai kasus yang berbeda**. Pilih salah satu, lalu tekan **Periksa jawaban**.

### Yang kamu lihat
- Grafik ROC (sumbu **False positive rate** dan **True positive rate**) menampilkan satu kurva untuk tiap predictor, tergambar saling menumpuk. Legenda mendaftar **Terkalibrasi baik**, **Overconfident**, dan **Underconfident**, **Penanda penuh: threshold-mu** dan **Cincin: threshold terbaiknya sendiri**. Kotak status membaca, misalnya, "AUC 0,892 untuk ketiganya".
- **Reliability diagram tiap predictor** punya satu panel untuk tiap predictor: **Probabilitas prediksi** ke samping, **Proporsi positif** ke atas, diagonal putus-putus untuk kalibrasi sempurna, dan jumlah kasus di tiap bin di bawah sumbu, berjudul **kasus di tiap bin**. Titik berongga adalah bin dengan kurang dari 10 kasus.
- **Biaya per kasus terhadap threshold** punya satu kurva untuk tiap predictor, garis tegas pada threshold-mu, dan garis titik-titik pada threshold berbasis biaya. Penanda pada tiap kurva adalah threshold terbaik predictor itu sendiri.
- **Panel keputusan: biaya tiap predictor** punya baris **AUC**, **Brier score**, **Kasus yang ditandai positif pada threshold**, **False positive pada threshold**, **False negative pada threshold**, **Biaya per kasus pada threshold**, **Threshold terbaiknya sendiri**, dan **Biaya per kasus pada threshold terbaiknya sendiri**, di bawah header **Pada threshold** yang diikuti threshold-mu. Biaya per kasus yang termurah diberi warna bila ketiganya berbeda. Bila sebuah threshold terbaik berada di luar 0,01 sampai 0,99, atau berarti tidak menandai apa pun, sebuah catatan mengatakan bahwa slider tidak dapat mencapainya.
- Baris status memberi threshold dan biaya per kasus tiap predictor. Baris detail memberi jumlah kasus positif dan negatif, Brier score, dan threshold terbaik.

### Percobaan
Tekan **Reset** sebelum percobaan 1 sampai 4 dan 6, supaya angkamu sama.

1. **AUC sama, keputusan sama?** Perkirakan: pilih satu jawaban di kotak **Kuis Cepat**, lalu tekan **Periksa jawaban**. Jawabannya menyebut ketiganya menandai 138 kasus yang sama dari 1.000. Di **Panel keputusan: biaya tiap predictor**, baca **False positive pada threshold** (38) dan **False negative pada threshold** (98), lalu periksa bahwa biaya per kasusnya 0,528. Kemudian geser **Threshold keputusan** ke 0,20: sekarang mereka menandai 324, 213, dan 703 kasus, dengan biaya 0,342, 0,381, dan 0,517. Mengapa 0,5 menyembunyikan perbedaannya?
2. **Threshold berbasis biaya.** Perkirakan: predictor mana yang menandai kasus terbanyak pada 0,17, dan mana yang termurah? Nyalakan **Pakai threshold berbasis biaya**. Baca tabelnya: 367, 229, dan 786 kasus ditandai, dengan biaya 0,337, 0,367, dan 0,588 per kasus. Lihat penanda pada grafik ROC: ke mana ketiga penanda penuhnya pergi? Lalu atur **Biaya false negative** ke 19: threshold menjadi 0,05, dan biayanya 0,524, 0,957, dan 0,797. Sebuah catatan muncul di bawah tabel. Mengapa? (Threshold terbaik predictor overconfident berada di bawah 0,01.)
3. **Threshold terbaik tiap predictor.** Tekan **Reset**. Perkirakan: apakah ketiga kurva biaya punya titik terendah yang sama? Lihat **Threshold terbaiknya sendiri** (0,19, 0,03, dan 0,36) dan **Biaya per kasus pada threshold terbaiknya sendiri** (0,333 untuk ketiganya). Pada grafik ROC, temukan cincin-cincinnya. Di mana kamu akan menaruh threshold bila tidak dapat melihat kurvanya? Mengapa predictor overconfident dapat menyamai yang lain pada 0,03?
4. **Rekalibrasi.** Perkirakan: bila kamu menyalakan **Rekalibrasi (Platt scaling)**, apakah AUC berubah? Nyalakan, lalu nyalakan **Pakai threshold berbasis biaya**. AUC tetap 0,892 dan ketiga Brier score menjadi 0,098. Kasus yang ditandai pada 0,17 kini 375, 373, dan 375, dengan biaya 0,339, 0,337, dan 0,339. Titik-titik reliability bergerak mendekati diagonal. Matikan lagi dan bandingkan.
5. **Kasus positif yang jarang.** Perkirakan: apakah 0,5 menjadi lebih baik atau lebih buruk bila kasus positif menjadi jarang? Lalu tekan **Reset** dan atur **Persentase kasus positif (prevalensi)** ke 5. Baca tabelnya: ketiganya menandai 8 kasus dan berbiaya 0,250 per kasus, sedangkan tidak menandai apa pun akan berbiaya 0,260. Biaya terbaiknya 0,151 pada threshold 0,18, 0,02, dan 0,35. Nyalakan **Pakai threshold berbasis biaya**: biayanya 0,155, 0,197, dan 0,373. Mengapa kelas positif yang jarang merugikan kebiasaan memakai 0,5?
6. **Sampel baru.** Perkirakan: apakah pola yang sama akan bertahan pada sampel yang berbeda? Lab tidak punya tombol untuk beralih ke data sungguhan, karena data penguin tidak punya probabilitas model, jadi periksa gagasan ini pada sampel buatan yang baru. Tekan **Reset**, lalu tekan **Sampel baru**. Pada sampel kedua AUC-nya 0,878, ketiganya menandai 131 kasus pada 0,5, dan threshold terbaiknya 0,16, 0,02, dan 0,34, semuanya dengan biaya terendah 0,367. Tekan **Sampel baru** sekali lagi: AUC 0,856, threshold terbaik 0,30, 0,10, dan 0,41, biaya terendah 0,367. Apa yang tetap sama di setiap sampel, dan apa yang bergeser? Sekarang nyalakan **Pakai threshold berbasis biaya** dan **Rekalibrasi (Platt scaling)**: pada sampel ketiga ini, ketiga biaya pada 0,17 menjadi 0,405, 0,403, dan 0,405, berselisih tidak lebih dari 0,002, sedangkan tanpa rekalibrasi biayanya 0,403, 0,425, dan 0,647.
