---
slug: three-questions
title: Tiga pertanyaan, satu dataset
---
::: intro
- Ajukan pertanyaan regression, classification, dan clustering pada tabel yang sama, lalu tentukan hasil apa yang diberikan masing-masing.
- Baca skor yang menyertai tiap pertanyaan: R², skor classification yang dibandingkan dengan baseline, dan silhouette.
- Periksa hasilmu pada sampel baru dan pada data nyata sebelum kamu mempercayainya.

Sebelum mulai: baca "Data, feature, dan label" dan "Supervised, unsupervised, dan tiga pertanyaan".
:::

## Satu tabel, tiga cara bertanya
*Apa yang disediakan lab untuk kamu olah?*

Lab ini memegang satu tabel. Secara bawaan isinya 120 burung rekaan dari tiga spesies bernama Skerry, Brine, dan Cobble, masing-masing 40 ekor. Setiap burung punya empat kolom numerik: panjang paruh, tebal paruh, panjang sirip, dan berat badan. Sebuah pilihan bernama **Data** dapat menukar tabel itu dengan tabel penguin nyata dari pelajaran sebelumnya.

Kamu tidak pernah mengubah tabelnya. Yang kamu pilih adalah pertanyaannya, dan pertanyaan itulah yang menentukan fungsi tiap kolom.

[[figure:three-questions/question-roles|Satu tabel, tiga tugas untuk dua kolom yang sama. Target, hasil, dan skornya bergantung pada pertanyaan.]]

Pada **Regression**, kolom vertikal adalah angka yang diprediksi dan kolom horizontal adalah inputnya. Pada **Classification**, spesies menjadi target dan kedua kolom menjadi feature. Pada **Clustering**, spesies disembunyikan, dan lab mengelompokkan titik hanya dari kedua kolom di sumbu. Setiap pertanyaan punya skornya sendiri, sebab arti "bagus" berbeda untuk masing-masing.

> Gagasan kunci: tabelnya tetap sama. Pertanyaanlah yang menentukan target, jenis hasil, dan cara kamu menilainya.

## Regression: sebuah garis dan selisihnya
*Bagaimana lab mengubah dua kolom menjadi angka yang diprediksi?*

Atur pertanyaan ke Regression, dengan panjang paruh di sumbu horizontal dan tebal paruh di sumbu vertikal. Lab menggambar garis lurus terbaik yang melewati 120 burung itu:

tebal = 25,22 - 0,1805 × panjang

dalam milimeter. Setiap tambahan 1 milimeter panjang paruh berjalan bersama tebal paruh yang berkurang 0,18 mm.

> Contoh hitungan: burung #54 memiliki panjang paruh 33,7 mm dan tebal paruh 18,4 mm. Garis memprediksi 25,22 - 0,1805 × 33,7 = 25,22 - 6,08 = 19,14 mm. Tebal sebenarnya 18,4 mm, sehingga selisihnya 19,14 - 18,4 = 0,74 mm. Garis sedikit terlalu tinggi untuk burung ini.

[[figure:three-questions/regression-gap|Garis terbaik untuk 120 burung, tebakan malas "selalu rata-rata", dan selisih untuk burung #54.]]

## Seberapa baik garisnya?
*Apa yang dikatakan galat rata-rata dan R² tentang sebuah regression?*

Pada seluruh 120 burung, garis itu meleset 1,79 mm rata-rata. Penebak malas yang selalu menjawab rata-rata tebal paruh, yaitu 17,1 mm, meleset 2,00 mm. Garis hanya menang tipis. **R²** menyatakan hal yang sama dalam bentuk bagian: garis menjelaskan 16% naik-turunnya tebal paruh. Nilai 0% berarti tidak lebih baik daripada rata-rata, dan 100% berarti tidak ada selisih sama sekali.

> Awas: 16% tidak berarti 16% burung diprediksi dengan benar. Sebuah regression tidak pernah benar atau salah, hanya dekat atau jauh.

Lab juga mengurutkan setiap kolom lain sebagai input untuk tebal paruh. Panjang sirip berada di urutan pertama dengan 51%, padahal sirip tidak membentuk paruh. Nyalakan warnanya dan kamu akan melihat sebabnya: burung Cobble punya paruh paling dangkal dan sirip paling panjang, sehingga panjang sirip menunjuk ke spesiesnya. Kecocokan yang baik hanya menunjukkan bahwa dua kolom bergerak bersama, bukan mengapa.

::: deeper Dari mana R² berasal
Jumlahkan kuadrat selisih di sekitar tebakan rata-rata: 616,75 untuk 120 burung. Jumlahkan kuadrat selisih di sekitar garis: 520,54. Garis menyisakan 520,54 / 616,75 = 0,844 dari kekacauan itu, sehingga ia menjelaskan 1 - 0,844 = 0,156, yaitu 16% tadi. Semakin banyak garis mengecilkan kuadrat selisih, semakin dekat R² ke 100%.
:::

## Classification: skor dibandingkan baseline
*Bagaimana membedakan penebak label yang bagus dari yang hanya beruntung?*

Beralihlah ke Classification. Spesies kini menjadi target, ditampilkan sebagai warna, dan kedua kolom menjadi feature. Untuk setiap burung secara bergantian, lab menyembunyikan spesiesnya dan membiarkan 5 burung terdekat di plot melakukan vote, dengan burung itu sendiri dikeluarkan dari vote-nya. **Skor** adalah bagian burung yang vote-nya memilih spesies yang benar.

Untuk panjang paruh dan tebal paruh, vote-nya benar pada 114 dari 120 burung, yaitu 95%. Aturan malas yang selalu menyebut satu spesies benar pada 40 dari 120, karena tiap spesies punya 40 burung. Itu 33%, dan itulah **baseline** yang harus dikalahkan.

[[figure:three-questions/score-bars|Setiap pasangan kolom dinilai pada 120 burung yang sama. Garis putus-putus adalah 33% yang didapat dengan selalu menebak satu spesies.]]

Pasangan terburuk, tebal paruh dan berat badan, mendapat 79 dari 120, yaitu 66%: dua kali baseline, tetapi sepertiga burung masih salah.

> Gagasan kunci: skor hampir tidak berarti tanpa baseline-nya. Untuk jenis kelamin penguin nyata, selalu menebak yang lebih umum benar pada 168 dari 333, sekitar 50%, sehingga skor yang mendekati 50% tidak memberi tahu apa-apa.

::: deeper Mengapa burung dikeluarkan dari vote-nya sendiri
Jika sebuah burung boleh memilih dirinya sendiri, ia selalu menemukan tetangga dengan spesies yang sama, yaitu dirinya sendiri, dan skornya tampak lebih baik daripada kenyataan. Dengan mengeluarkannya, pengujian menjadi adil: lab menilai tiap burung seperti ia akan dinilai sebagai burung baru. Lab juga melakukan scaling pada tiap kolom lebih dulu, sehingga milimeter dan kilogram berbobot sama.
:::

## Clustering: kelompok tanpa kunci jawaban
*Bagaimana menilai kelompok jika tidak ada yang bisa dijadikan pembanding?*

Atur pertanyaan ke Clustering. Lab menyembunyikan label dan membagi titik menjadi k kelompok hanya dengan dua kolom di sumbu. Kamu memilih k lewat **Jumlah kelompok (k)**; nilai bawaannya 3. Metodenya adalah k-means.

Dua angka menilai hasilnya.

- **Silhouette** bergerak dari -1 sampai 1 dan tidak memerlukan label. Angka ini menyatakan seberapa jelas kelompok-kelompok itu terpisah; di atas sekitar 0,5 berarti jelas. Untuk k = 3 nilainya 0,55.
- **Kecocokan dengan spesies** diperiksa sesudahnya. Lab menghitung burung yang berada di kelompok dengan spesies utama yang sama dengan spesiesnya: 115 dari 120, yaitu 96%.

## Mengapa kecocokan saja tidak dapat menentukan k
*Bagaimana memilih k ketika spesiesnya tersembunyi?*

Coba k = 2, 3, dan 4 pada dua kolom yang sama. Silhouette-nya 0,46, 0,55, dan 0,46, jadi puncaknya di k = 3, yaitu jumlah spesies yang dipakai untuk membuat tabel ini. Pada masalah nyata tidak ada kolom spesies, sehingga silhouette adalah angka yang dapat kamu pakai untuk membandingkan nilai k.

> Contoh hitungan: dengan k = 2, silhouette-nya 0,46 dan kecocokannya 67%. Dua kelompok paling banyak memiliki dua spesies utama, sehingga 40 burung dari spesies ketiga selalu dihitung salah. Kasus terbaiknya 80 dari 120, yaitu 67%.

> Awas: kecocokan menguntungkan k yang besar. Dengan k = 4 nilainya masih 95% (114 dari 120), tetapi silhouette turun menjadi 0,46. Jika setiap burung berada di kelompoknya sendiri, kecocokannya 100% dan tidak berarti apa-apa.

::: deeper Apa yang diukur silhouette
Untuk satu titik, ambil jarak rata-ratanya a ke titik-titik di kelompoknya sendiri, dan jarak rata-ratanya b ke titik-titik di kelompok lain yang terdekat. Titik itu mendapat skor (b - a) / yang lebih besar di antara a dan b. Titik yang jauh lebih dekat ke kelompoknya sendiri daripada ke kelompok berikutnya mendapat skor mendekati 1, dan titik yang berada di antara dua kelompok mendapat skor mendekati 0. Silhouette adalah rata-rata dari semua titik.
:::

## Ketika tabel dan kelompoknya berbeda arah
*Dapatkah tren pada seluruh tabel salah untuk setiap kelompok di dalamnya?*

Ubah Data ke Penguin (data nyata), tetap pada Regression, dengan panjang paruh di sumbu horizontal dan tebal paruh di sumbu vertikal. Pada seluruh 342 penguin yang terukur, garisnya menurun: tebal paruh berkurang 0,085 mm untuk setiap tambahan satu milimeter panjang, dengan R² hanya 6%.

Dengan Warnai per spesies menyala, lab juga menggambar satu garis di dalam setiap spesies, dan semuanya justru naik: +0,179 untuk Adelie, +0,222 untuk Chinstrap, dan +0,205 untuk Gentoo.

[[figure:three-questions/trend-flip|Penguin nyata, satu titik untuk setiap penguin keenam yang terukur. Garis putus-putus mencocokkan seluruh 342 penguin; garis berwarna mencocokkan tiap spesies sendiri-sendiri.]]

Penyebabnya adalah campurannya. Penguin Adelie punya paruh pendek dan tebal (rata-rata sekitar 38,8 mm panjang dan 18,3 mm tebal), sedangkan Gentoo punya paruh panjang dan tipis (47,5 mm dan 15,0 mm). Jika spesies digabung, awan titiknya miring ke bawah, walaupun di dalam tiap spesies paruh yang lebih panjang berjalan bersama paruh yang lebih tebal.

> Gagasan kunci: garis yang dicocokkan pada sebuah campuran dapat bercerita sesuatu yang salah di dalam setiap kelompok. Jika sebuah kolom seperti spesies memilah baris-barisnya, lihat dulu ke dalam kelompok sebelum kamu mempercayai trennya.

## Periksa sebelum percaya
*Bagaimana kamu tahu bahwa sebuah hasil bukan kebetulan dari satu sampel?*

Sebuah skor berasal dari satu tabel, jadi periksalah pada tabel lain. **Sampel burung baru** mengambil 120 burung baru. Panjang paruh dan tebal paruh tetap menjadi pasangan terbaik untuk classification: 95% pada sampel pertama, lalu 96% dan 93%. Angkanya bergeser beberapa poin, tetapi ceritanya sama.

Pada data nyata, sampel 1 adalah seluruh baris, dan setiap sampel berikutnya adalah dua pertiga acak dari baris itu, yaitu 228 dari 342. Pasangan terbaik dapat berubah ketika dua pasangan berdekatan: pada sampel 3, panjang paruh dengan panjang sirip (96%) mengalahkan panjang paruh dengan tebal paruh (95%).

Hitung juga barisnya. Dua dari 344 penguin tidak punya pengukuran, sehingga lab tidak mengikutsertakannya dan tersisa 342. Untuk label Jenis kelamin, 9 penguin lagi tidak tercatat jenis kelaminnya, sehingga tersisa 333. Catatan di bawah **Data** menyebutkan jumlahnya.

Lab juga meminta kamu memprediksi sebelum menampilkan hasil. Pilih satu jawaban, lalu tekan Periksa jawaban. Tebakan yang salah lebih banyak mengajarkan daripada yang benar.

::: remember
- Satu tabel dapat mengajukan tiga pertanyaan: regression memprediksi angka, classification memprediksi label, dan clustering menemukan kelompok tanpa label.
- Nilai tiap pertanyaan menurut ukurannya sendiri: R² dan selisih rata-rata untuk regression, skor dibandingkan baseline untuk classification, dan silhouette untuk clustering.
- Lihat ke dalam kelompok dan periksa pada sampel baru sebelum kamu mempercayai sebuah tren atau skor.
:::

@@lab

## Lab: Tiga pertanyaan, satu dataset
Satu tabel, tiga cara bertanya. Pilih dua kolom dan satu pertanyaan, lalu lihat tampilannya di plot. Panel hanya menampilkan kontrol yang sesuai dengan pertanyaan yang kamu pilih. Angka di bawah berlaku untuk data buatan bawaan (seed 7), kecuali percobaan menyebut Penguin (data nyata). Tekan Reset lebih dulu agar kamu mulai dari plot yang sama.

### Kontrol
- **Data**: Data buatan (120 burung rekaan) atau Penguin (data nyata). Catatan di bawahnya menghitung baris yang tidak diikutkan karena ada missing value.
- **Fitur sumbu x** dan **Fitur sumbu y**: dua kolom di sumbu. Pada Regression, kolom vertikal adalah angka yang diprediksi dan kolom horizontal adalah inputnya.
- **Pertanyaan**: Regression: angka, Classification: kategori, atau Clustering: cari kelompok. Classification adalah nilai bawaannya.
- **Label yang diprediksi**: kategori yang diprediksi pada Classification (Spesies untuk data buatan; Spesies, Pulau, atau Jenis kelamin untuk penguin). Kontrol ini hanya muncul pada Classification.
- **Jumlah kelompok (k)**: dari 2 sampai 6. Kontrol ini hanya muncul pada Clustering.
- **Warnai per spesies** (pada Classification mengikuti label yang kamu pilih): mewarnai titik menurut spesies. Pada Regression, kontrol ini juga menggambar satu garis untuk tiap spesies. Pada Clustering, kotak centang yang sama bernama **Tampilkan spesies sebenarnya**: jika mati titik diwarnai menurut kelompok yang ditemukan, dan jika menyala titik diwarnai menurut spesies yang sebenarnya.
- **Tampilkan selisih ke garis**: menggambar ruas garis dari setiap titik ke garis. Kontrol ini hanya muncul pada Regression.
- **Sampel burung baru** (Sampel penguin baru pada data nyata): mengambil 120 burung baru, atau dua pertiga acak baru dari penguin.
- Kotak **Kuis Cepat**: pilih satu jawaban, lalu tekan **Periksa jawaban**. Kotak ini diatur ulang saat kamu mengubah data, pertanyaan, kolom, label, k, atau sampel.
- **Layar penuh / Reset**: Reset mengembalikan lab ke keadaan awalnya.

### Yang kamu lihat
- **Kalimat status di atas plot**: skor untuk pertanyaan itu. Regression menampilkan R² dan galat rata-rata. Classification menampilkan skor separability. Clustering menampilkan jumlah kelompok dan silhouette.
- **Plot**: judul sumbu beserta satuannya. Klik sebuah titik, atau fokus ke plot lalu tekan panah kiri atau kanan, untuk melihat baris datanya di bawah plot. Escape menghapus pilihan.
- **Legenda**: spesies beserta jumlahnya, atau kelompok yang ditemukan pada Clustering. Pada Clustering, "Pusat kelompok" menandai titik tengah tiap kelompok.
- **Baris metrik**: berapa baris yang dipakai plot dan sampel yang mana, misalnya "120 burung, sampel 1".
- **Tabel peringkat**: "Semua pasangan fitur" pada Classification, "Input untuk memprediksi tebal paruh, berurutan" pada Regression, dan "Semua pasangan fitur, di-cluster" pada Clustering. Pasangan yang sedang tampil di plot disorot. Klik sebuah baris untuk menampilkannya. Baris terakhir tabel classification adalah baseline.

### Percobaan
1. **Prediksi:** apakah pasangan kolom yang memisahkan burung dengan baik juga memprediksi dengan baik sebagai regression? Tekan Reset, biarkan panjang paruh di sumbu horizontal dan tebal paruh di sumbu vertikal, lalu ganti **Pertanyaan** di antara tiga pilihan. Baca kalimat status setiap kali. Regression memberi R² 16%, Classification 95%, dan Clustering silhouette 0,55. Jelaskan mengapa satu pasangan bisa mendapat skor 95% sebagai classification tetapi hanya 16% sebagai regression.
2. **Prediksi:** kolom mana yang menjadi input terbaik untuk memprediksi tebal paruh? Pilih Regression, lalu baca "Input untuk memprediksi tebal paruh, berurutan": panjang sirip 51%, berat badan 33%, panjang paruh 16%. Klik baris pertama untuk menampilkannya, lalu pastikan **Warnai per spesies** menyala. Perhatikan posisi tiap spesies, dan nilai apakah sirip benar-benar membuat paruh tebal atau hanya menunjuk ke spesiesnya. Lalu nyalakan **Tampilkan selisih ke garis** dan klik sebuah titik yang jauh dari garis untuk membaca selisihnya.
3. **Prediksi:** pasangan kolom mana yang paling buruk dalam mengklasifikasikan spesies? Pilih Classification dan baca "Semua pasangan fitur". Panjang paruh dan tebal paruh memimpin dengan 95%; tebal paruh dan berat badan paling akhir dengan 66%. Klik baris terakhir dan matikan warnanya. Perhatikan betapa campur aduknya titik-titik itu, lalu bandingkan 66% dengan baris baseline, 33%.
4. **Prediksi:** k berapa yang memberi silhouette tertinggi? Pilih Clustering dengan panjang paruh dan tebal paruh, lalu coba k = 2, 3, 4, 5, dan 6. Silhouette-nya 0,46, 0,55, 0,46, 0,39, dan 0,36. Periksa juga kecocokan untuk tiap k. Jelaskan mengapa kecocokan yang tinggi saja tidak menunjukkan k mana yang terbaik.
5. **Prediksi:** apakah kelompok yang jelas selalu sesuai dengan spesies? Pilih Clustering, lalu pilih panjang sirip di sumbu horizontal dan berat badan di sumbu vertikal, dengan k = 3. Silhouette-nya masih 0,46, tetapi kecocokannya turun menjadi 57%. Pastikan **Tampilkan spesies sebenarnya** menyala dan lihat bagaimana kelompok-kelompok itu memotong lintas spesies.
6. **Prediksi:** apakah tren yang kamu lihat pada burung buatan berlaku juga pada data nyata? Atur **Data** ke Penguin (data nyata), **Pertanyaan** ke Regression, panjang paruh di sumbu horizontal dan tebal paruh di sumbu vertikal. R²-nya 6% dan kemiringannya negatif. Pastikan **Warnai per spesies** menyala dan lihat garis di dalam tiap spesies. Lalu tekan **Sampel penguin baru** dua kali, dan pastikan kemiringan keseluruhan tetap negatif sementara setiap garis spesies tetap positif. Terakhir beralihlah ke Classification dan bandingkan pasangan terbaik di tiap sampel: skornya tetap antara 96% dan 97%, tetapi pasangan terbaiknya dapat berubah.
