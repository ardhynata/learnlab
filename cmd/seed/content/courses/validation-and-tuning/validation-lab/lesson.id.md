---
slug: validation-lab
title: Lab validasi
---
::: intro
- Memprediksi apakah fold acak atau fold grouped yang memberi skor lebih tinggi pada tabel dengan beberapa record per orang, lalu memeriksanya di lab.
- Menjelaskan selisih kedua skor itu lewat porsi record uji yang orangnya sudah pernah dilihat model.
- Membandingkan grid search dengan random search pada satu anggaran yang sama, lalu menguji gagasannya pada penguin sungguhan dengan sampel baru.

Sebelum mulai: baca "Cross-validation dan stratifikasi", "Split berkelompok dan split temporal", dan "Tuning dengan search" di course ini.
:::

## Apa yang ditanyakan lab
*Skor mana yang dapat kamu percaya ketika setiap orang punya beberapa record?*

Lab membuat tabel berisi 40 orang buatan dengan 8 record per orang, sehingga totalnya 320 record. Sebuah record punya waktu, feature F1 yang membawa sinyal sungguhan, tiga ciri khas orang C1 sampai C3, dan label 0 atau 1. Ciri khas seseorang hampir sama dari record ke record, sehingga model dapat memakainya untuk mengenali orang itu. Orang baru membawa ciri khas yang baru pula.

Modelnya adalah classifier 5-nearest-neighbor (**Neighbor (k)** bernilai 5), dinilai dengan 5 fold melalui dua cara: **k-fold acak** dan **Grouped k-fold (per orang)**. Setiap fold berisi 64 record. Lab mulai dengan angka berikut: fold acak mendapat skor rata-rata 78,4% dan fold grouped 64,7%. Lab menyebut selisihnya **Selisih optimisme**: 13,7 poin.

[[figure:validation-lab/default-strips|Layar pertama lab. Tiap titik adalah satu fold. Batang tebal adalah rata-rata kelima fold, dan garis putus-putus adalah skor menebak label mayoritas terus-menerus.]]

Menebak label mayoritas terus-menerus mendapat 198 dari 320 record, yaitu 61,9%. Skor grouped hanya 2,8 poin di atas garis itu.

## Mengapa skor acak lebih tinggi
*Apa yang dilakukan model terhadap orang yang sudah pernah dilihatnya?*

Pada fold acak, sebuah record uji masih punya sekitar 6 dari 7 record lain milik orang yang sama di data training (rata-rata 5 atau 6). Ciri khasnya hampir sama, sehingga neighbor terdekatnya adalah record orang itu sendiri, dan model tinggal mengulang label yang biasa dimiliki orang tersebut. Baris detail di lab mengukurnya: 100% record uji acak milik orang yang juga punya record di training. Pada fold grouped porsinya 0%.

> Contoh hitungan: kelima fold acak benar 48, 51, 50, 47, dan 55 record dari 64, sehingga totalnya 251 dari 320, atau 78,4%. Kelima fold grouped benar 39, 45, 41, 36, dan 46, yaitu 207 dari 320, atau 64,7%. Selisihnya 78,4 - 64,7 = 13,7 poin, sehingga kamu dapat memeriksanya dengan pensil.

Satu record bernilai 1 / 64, sekitar 1,6 poin skor sebuah fold, sehingga titik-titik grouped yang terbentang dari 56,3% sampai 71,9% hanya berjarak 10 record. Hanya skor grouped yang menunjukkan kinerja model pada orang baru.

> Gagasan kunci: skor acak mengukur seberapa baik model mengenali orang yang sudah pernah dilihatnya. Skor grouped mengukur yang sebenarnya kamu butuhkan: kinerjanya pada orang yang belum pernah dilihatnya.

## Menaikkan dan menurunkan ciri khas
*Apakah selisih itu memerlukan ciri khas?*

**Kekuatan ciri khas tiap orang** mengatur seberapa berbeda orang yang satu dari yang lain. Tekan **Reset** dulu, lalu coba nilai-nilai pada gambar.

[[figure:validation-lab/quirk-sweep|Kedua rata-rata untuk kekuatan ciri khas 0 sampai 4, pada tabel bawaan lab. Baris di bawah grafik adalah selisih optimisme dalam poin.]]

Pada kekuatan 0 tidak ada yang punya tanda pengenal. Fold acak mendapat 63,1% dan fold grouped 64,4%, selisihnya -1,3 poin, dan lab menyatakan kedua skor hampir sama. Pada kekuatan 1 selisihnya 7,5 poin, pada 2 menjadi 13,7, dan pada 3 menjadi 20,0. Skor acak naik lalu mendatar di sekitar 78%. Skor grouped mula-mula naik sedikit (67,8% pada kekuatan 1), lalu turun di bawah posisi awalnya.

Pada kekuatan 3 dan 4 fold grouped mendapat 58,8% dan 58,4%, di bawah 61,9% milik penebak label mayoritas. Bagi orang baru, ciri khas itu tidak membawa sinyal, tetapi tetap ikut dihitung dalam jarak, sehingga kira-kira ia hanya menambah noise. Selisihnya berhenti membesar, tetapi skor yang jujur terus turun.

## Fold, neighbor, dan urutan waktu
*Pengaturan lain mana yang mengubah selisih, dan mana yang tidak?*

Selisih itu tidak hilang ketika kamu mengubah pengaturan lain. Dengan 3 fold selisihnya 12,4 poin (79,1% lawan 66,7%), dan dengan 10 fold 16,0 (79,4% lawan 63,4%). Dengan k = 1 selisihnya 13,5 poin. Dengan k = 31 selisihnya 8,2: 73,8% lawan 65,6%. k yang besar merata-ratakan lebih banyak neighbor, banyak di antaranya milik orang lain, sehingga kira-kira mengenali satu orang menjadi kurang membantu. Meski begitu, kedua skor tetap berbeda 8 poin.

Sekarang nyalakan **Tampilkan juga split berurutan waktu**. Split ini melatih pada record yang lebih awal dan menguji pada yang lebih akhir, rancangan yang jujur bila pertanyaannya tentang masa depan. Di sini skornya 76,8%, dekat dengan skor acak 78,4%. Baris detailnya menyebut 100% record ujinya milik orang yang sudah ada di training, karena orang yang sama terus muncul lagi di kemudian hari.

> Awas: split berurutan waktu jujur soal masa depan, tetapi tidak jujur soal orang baru. Pakai split ini bila model akan memprediksi baris yang lebih baru dari entitas yang sama, dan split grouped bila model akan bertemu entitas baru.

## Grid search dan random search pada satu anggaran
*Apa yang didapat dari jumlah evaluasi yang sama?*

Kartu pencarian menyetel dua pengaturan: k, dan **bobot** pada feature F1 (seberapa besar F1 dihitung dalam jarak; bobot yang lebih besar mengecilkan porsi ciri khas). Satu evaluasi menilai satu pasang pengaturan dengan split yang dipilih pada **Nilai pencarian dengan**, yang mulai dari **Grouped (orang atau pulau)**. Anggarannya 16 evaluasi.

[[figure:validation-lab/search-points|Keenam belas pengaturan yang dicoba tiap pencarian pada tabel bawaan. Kotak adalah grid, titik adalah random search, dan lingkaran adalah pengaturan terbaik yang ditemukan masing-masing.]]

Grid mencoba 4 nilai k dan 4 nilai bobot, 4 x 4 = 16. Random search mencoba 13 nilai k dan 16 nilai bobot. Sebuah grid harus berupa tabel penuh, sehingga anggaran 7 hanya menghasilkan 3 x 2 = 6 evaluasi.

Pada tabel bawaan grid mencapai 71,9% dan random search 70,9%, dan lab menyatakan tidak ada yang menang. Tekan **Random search baru** empat kali: 71,9%, 71,9%, dan 71,9%, lalu 70,3%, ketika grid menang 1,6 poin. Satu poin kira-kira 3 dari 320 record. Random search menjangkau lebih banyak nilai, tetapi apakah ia menang adalah undian yang dapat kamu saksikan sendiri.

## Menilai pencarian dengan split yang salah
*Mengapa pilihan fold juga penting untuk tuning?*

Ubah **Nilai pencarian dengan** ke **k-fold acak**. Kedua pemenang kini mengklaim 76,6% (grid) dan 79,4% (random search). Lab lalu menilai ulang keduanya pada orang baru dengan fold grouped: 71,9% dan 69,7%. Pemenang random search mengklaim 79,4% tetapi hanya memberi 69,7%, turun 9,7 poin.

Pencarian memilih apa pun yang dihargai oleh split-nya, dan split acak menghargai kemampuan mengingat orang. Ini sekali lagi skor pemenang yang terlalu optimistis seperti di "Tuning dengan search", kali ini ditambah split yang bocor. Perhatikan juga bahwa pencarian grouped memilih bobot besar (2,52 dan 4,55 pada tabel bawaan), yang meredam ciri khas dalam jarak.

> Awas: 71,9% dari pencarian grouped juga merupakan yang terbaik dari 16 skor pada fold yang sama, sehingga sedikit terlalu optimistis. Test set yang tidak tersentuh, atau nested cross-validation, memberi angka yang jujur. Itu tidak ada di lab ini.

## Gagasan yang sama pada penguin sungguhan
*Apakah gagasan ini bertahan pada tabel nyata?*

Ubah **Data** ke **Penguin (data nyata)**. Untuk jenis kelamin lab mempertahankan 333 dari 344 penguin (11 baris punya missing value, NA); untuk spesies ia mempertahankan 342. Setiap baris adalah burung yang berbeda, sehingga tidak ada orang yang dapat dikenali. Kelompoknya adalah 3 pulau, dan lajur grouped bernama **Leave-one-island-out**. Itu pertanyaan tentang pulau baru, lebih dekat ke sebuah shift (pulau baru tampak berbeda dari pulau-pulau yang dipelajari model) daripada ke kebocoran.

[[figure:validation-lab/penguin-splits|Fold acak lawan leave-one-island-out untuk penguin sungguhan, memprediksi jenis kelamin dan spesies. Tag menyebut pulau yang ditahan pada tiap fold.]]

Untuk jenis kelamin, fold acak mendapat 90,1% dan leave-one-island-out 78,7%, selisih 11,4 poin, dengan Biscoe 69,3%, Dream 73,2%, dan Torgersen 93,6%. Untuk spesies, selisihnya 42,6 poin (99,1% lawan 56,5%). Penguin Gentoo hanya hidup di Biscoe, sehingga menahan Biscoe membuang satu spesies utuh dari training.

## Sampel baru
*Apakah selisih itu hanya pengacakan yang kebetulan?*

Tekan **Sampel baru** tiga kali untuk jenis kelamin. Skor acak menjadi 91,0%, 91,6%, dan 91,6% dan selisihnya 12,3, 12,9, dan 12,9 poin, sementara leave-one-island-out tetap 78,7%, karena tiga pulau hanya dapat dipotong dengan satu cara. Gagasan ini bertahan pada sampel baru: selisih 11 sampai 13 poin bukan berasal dari pengacakan yang kebetulan menguntungkan.

::: remember
- Fold acak membuat model mengenali orang yang sudah pernah dilihatnya, sehingga skornya lebih tinggi daripada fold grouped. Hanya skor grouped yang menunjukkan kinerja model pada orang baru.
- Selisih itu membesar bersama kemiripan baris-baris milik satu orang, sampai kekuatan sekitar 3. Ia tidak mengecil dengan fold yang lebih banyak, dan split berurutan waktu tidak menyembunyikan seseorang.
- Pada satu anggaran, grid mencoba sedikit nilai dan random search mencoba banyak, tetapi tak satu pun menang secara konsisten. Nilai pencarian dengan split yang sesuai dengan pemakaiannya, kalau tidak skor pemenangnya terlalu optimistis.
:::

@@lab

## Lab: validasi
Lab ini menilai satu model k-NN dengan beberapa cara pada satu tabel, lalu membandingkan dua cara menyetelnya. Semuanya memakai seed, sehingga setelah **Reset** kamu melihat angka yang sama dengan panduan ini.

### Kontrol
- **Layar penuh** memperbesar lab. **Reset** mengembalikan data buatan, **Kekuatan ciri khas tiap orang** 2, **Jumlah fold** 5, **Neighbor (k)** 5, split berurutan waktu mati, **Jumlah orang** 40, **Record per orang** 8, **Anggaran pencarian (evaluasi)** 16, **Nilai pencarian dengan Grouped**, serta sampel pertama dan random search pertama.
- Pada kartu **Parameter**: **Data** berpindah antara **Data buatan** dan **Penguin (data nyata)**.
- **Prediksi** (**Jenis kelamin** atau **Spesies**) hanya muncul pada data nyata.
- **Kekuatan ciri khas tiap orang** (0 sampai 4) hanya untuk data buatan.
- **Jumlah fold** (3 sampai 10) dan **Neighbor (k)** (1 sampai 31) berlaku untuk kedua jenis data.
- **Tampilkan juga split berurutan waktu** menambahkan lajur ketiga. Pada data nyata namanya **Split per tahun**.
- **Sampel baru** mengambil tabel buatan yang baru dan fold acak yang baru. Pada data nyata, yang berubah hanya fold acaknya.
- Pada kartu **Skor terbaik yang ditemukan terhadap jumlah evaluasi**: **Anggaran pencarian (evaluasi)** (4 sampai 30), **Nilai pencarian dengan** (**Grouped (orang atau pulau)** atau **k-fold acak**), dan **Random search baru**, yang mengundi pengaturan acak baru untuk anggaran yang sama.
- Pada kartu **Sekilas isi tabel**, hanya untuk data buatan: **Jumlah orang** (10 sampai 50) dan **Record per orang** (2 sampai 10).
- **Kuis Cepat** adalah tombol di bawah kartu pengaturan (tombol bulat di kanan bawah pada ponsel). Isinya satu pertanyaan: "Split mana yang memberi skor lebih tinggi, dan mana yang jujur tentang orang baru?" Pilih jawaban; kamu juga dapat menekan **Periksa jawaban**.

### Membaca layar
- Strip chart punya satu lajur untuk tiap cara membagi data. Tiap titik adalah akurasi pada satu fold yang ditahan, batang tebal adalah rata-rata, dan garis putus-putus adalah **Selalu menebak label mayoritas** (61,9%). Bagian kanan header lajur berbunyi, misalnya, "rata-rata 78,4% ± 4,9".
- Panahnya berbunyi **Selisih optimisme: 13,7 poin**: selisih kedua rata-rata yang tercetak.
- Baris status memberi rata-rata tiap lajur dan selisihnya. Baris detail menjelaskan apa yang bocor, dengan porsi record uji yang orangnya juga ada di training. Pada data nyata, titik-titik lajur pulau membawa nama pulaunya.
- Grafik pencarian memplot **Skor terbaik sejauh ini (%)** terhadap **Evaluasi yang dipakai** untuk **Grid search (putus-putus)** dan **Random search**. Teks di bawahnya menyebut berapa nilai k dan bobot yang dicoba masing-masing, skor terbaik tiap pencarian beserta k dan bobotnya, siapa yang menang, dan, bila pencarian dinilai dengan **k-fold acak**, berapa skor kedua pemenang pada orang baru.
- **Sekilas isi tabel** menampilkan baris-baris pertama. Pada data buatan, kolomnya adalah **Orang**, **Waktu**, **F1**, **C1**, **C2**, **C3**, dan **Label**. Pada data nyata, kolomnya adalah kolom **Pulau**, **Spesies**, jenis kelamin, **Sirip (mm)**, paruh, dan **Massa tubuh (g)**, serta **Tahun**.

### Eksperimen
Tekan **Reset** sebelum tiap eksperimen supaya angkamu sama dengan panduan.

1. **Split mana yang memuji model?** Prediksikan: di **Kuis Cepat**, pilih split mana yang skornya lebih tinggi dan mana yang jujur. Lalu baca strip chart: 78,4% untuk **k-fold acak**, 64,7% untuk **Grouped k-fold (per orang)**, dan **Selisih optimisme: 13,7 poin**. Baris detail menyebut 100% lawan 0%. Seberapa jauh rata-rata grouped di atas garis putus-putus, 61,9%? Jelaskan apa yang dilakukan model terhadap sebuah record uji acak.
2. **Matikan ciri khas.** Prediksikan: apa yang terjadi pada selisih di **Kekuatan ciri khas tiap orang** 0? Atur ke 0: 63,1% lawan 64,4%, selisih -1,3, dan baris detail berbunyi hampir sama. Coba 1 (7,5 poin) dan 3 (78,8% lawan 58,8%, 20,0 poin). Pada 3 baris detail menambahkan bahwa skor model di bawah tebakan mayoritas. Mengapa skor grouped turun sementara skor acak mendatar?
3. **Fold, neighbor, dan waktu.** Prediksikan: apakah fold yang lebih banyak, k yang lebih besar, atau split berurutan waktu akan menutup selisih itu? Atur **Jumlah fold** ke 3 dan ke 10 (12,4 dan 16,0 poin), lalu kembali ke 5. Atur **Neighbor (k)** ke 1 dan 31 (13,5 dan 8,2 poin). Lalu nyalakan **Tampilkan juga split berurutan waktu**: skornya 76,8%, mirip lajur acak. Mengapa urutan waktu tidak menyembunyikan seseorang?
4. **Grid atau random?** Prediksikan: dengan 16 evaluasi, apakah random search mengalahkan grid? Baca kartunya: 71,9% (k = 21, bobot 2,52) lawan 70,9% (k = 19, bobot 4,55), dan tidak ada pemenang. Tekan **Random search baru** empat kali dan catat skor terbaik tiap undian. Lalu atur **Anggaran pencarian (evaluasi)** ke 7 dan baca baris tentang 6 dari 7 evaluasi. Apa yang dilepaskan grid?
5. **Split yang salah untuk pencarian.** Prediksikan: bila kamu menilai pencarian dengan **k-fold acak**, seberapa banyak skor pemenang yang bertahan pada orang baru? Atur **Nilai pencarian dengan** ke **k-fold acak**: 76,6% dan 79,4%, tetapi 71,9% dan 69,7% pada fold grouped. Berapa poin yang hilang dari pemenang random search? Kembalikan pengaturannya lalu bandingkan.
6. **Penguin dan sampel baru.** Prediksikan: apakah leave-one-island-out juga lebih rendah pada penguin sungguhan, dan untuk target mana selisihnya lebih besar? Atur **Data** ke **Penguin (data nyata)**. Untuk **Jenis kelamin**: 90,1% lawan 78,7%, 11,4 poin. Ubah **Prediksi** ke **Spesies**: 99,1% lawan 56,5%, 42,6 poin, dan baris detail menyebut spesies yang lenyap. Kembali ke **Jenis kelamin** dan tekan **Sampel baru** tiga kali: acak 91,0%, 91,6%, 91,6%, dan lajur pulau tetap 78,7%. Apakah ini kebocoran per orang, atau shift ke pulau baru?
