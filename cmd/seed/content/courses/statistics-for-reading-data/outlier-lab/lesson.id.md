---
slug: outlier-lab
title: Lab outlier
---
::: intro
- Prediksikan bagaimana satu outlier tambahan menggeser rata-rata, median, sebaran, dan korelasi, lalu periksa hasilnya di lab.
- Jelaskan mengapa outlier yang sama lebih berpengaruh pada sampel kecil daripada sampel besar.
- Uji sebuah gagasan pada titik buatan lebih dulu, lalu pada penguin sungguhan dengan sampel baru.

Sebelum mulai: baca "Pusat dan sebaran data" dan "Outlier dan korelasi".
:::

## Apa yang ditanyakan lab ini
*Apa yang terjadi pada angka-angka yang kamu andalkan ketika satu titik tambahan masuk ke data?*

Dua pelajaran terakhir memberimu seperangkat alat: rata-rata, median, simpangan baku, dan korelasi r. Kedua pelajaran itu juga memberi peringatan bahwa satu titik yang jauh dapat menyeret sebagian angka ini, sementara angka lainnya tidak terpengaruh. Di lab ini kamu menambahkan titik itu sendiri dan mengamati akibatnya.

Lab dimulai dengan 15 titik buatan yang naik dari kiri ke kanan. Titik-titik ini memakai seed, sehingga semua orang melihat titik yang sama. Sebelum ada outlier, angkanya sebagai berikut:

| Statistik | x | y |
|---|---|---|
| Rata-rata | 5,25 | 5,18 |
| Median | 4,93 | 5,02 |
| Simpangan baku | 1,13 | 1,16 |

Korelasi r antara x dan y adalah 0,87, tren naik yang kuat. Lab menyimpan angka-angka ini di kolom **Tanpa outlier** pada tabelnya dan meletakkan angka yang baru di sebelahnya, sehingga kamu selalu dapat membandingkan sebelum dan sesudah. Sisa pelajaran ini adalah rencana tentang apa yang perlu dicoba dan apa yang perlu diharapkan.

## Prediksi, ubah, jelaskan, terapkan
*Mengapa kamu perlu menebak sebelum mengklik?*

Sebuah lab mudah berubah menjadi sekadar mengklik sampai ada yang bergerak. Rencana di bawah ini membuat setiap klik menjadi uji kecil atas apa yang kamu yakini.

1. **Prediksi.** Pilih jawaban di kotak **Kuis Cepat** sebelum mengubah apa pun.
2. **Ubah.** Tambahkan outlier, geser, atau ubah datanya.
3. **Jelaskan.** Baca tabel dan gambarnya, lalu katakan mengapa angka-angkanya bergeser seperti itu.
4. **Terapkan.** Ulangi gagasan yang sama pada penguin sungguhan dan pada sampel baru.

[[figure:outlier-lab/predict-loop|Empat langkah dalam setiap eksperimen. Langkah terakhir membawamu kembali ke awal dengan data baru.]]

Tebakan yang salah justru yang paling berguna. Jika kamu menebak median akan bergeser lebih jauh padahal lab menunjukkan rata-ratanya, kamu baru saja menemukan bagian gambaranmu yang keliru tentang angka-angka ini, dan langkah menjelaskan adalah tempat memperbaikinya.

> Gagasan kunci: kuis cepat, lalu ubah satu hal pada satu waktu, dan jelaskan setiap perbedaan antara tebakanmu dan hasilnya.

## Rata-rata bergeser lebih jauh daripada median
*Seberapa jauh satu nilai tambahan menggeser masing-masing pusat data?*

Tekan **Tambah outlier**. Sebuah titik muncul di x 5, y 9,3, jauh di atas kumpulan titik. Lihat kolom y pada tabel. Rata-rata y naik dari 5,18 menjadi 5,43, perubahan sebesar +0,26. Median naik dari 5,02 menjadi 5,13, perubahan sebesar +0,12.

[[figure:outlier-lab/one-point|Kumpulan titik bawaan dengan satu outlier di x 5, y 9,3. Penanda pudar adalah kondisi sebelum, penanda pekat sesudah; garis putus-putus adalah tren tanpa outlier.]]

> Contoh hitungan: ke-15 nilai y berjumlah 77,66. Setelah 9,3 ditambahkan, jumlahnya 86,96 untuk 16 nilai, sehingga rata-ratanya 86,96 / 16 = 5,43. Ada jalan pintas: rata-rata bergeser sebesar (nilai baru - rata-rata lama) / (banyak nilai setelah penambahan), di sini (9,3 - 5,18) / 16 = 0,26.

## Median hanya melangkah
*Mengapa median diam ketika outlier digeser?*

Median hanya melihat urutan. Setelah diurutkan, dari 16 nilai y itu nilai ke-8 adalah 5,019 dan nilai ke-9 adalah 5,250, sehingga mediannya rata-rata keduanya, sekitar 5,13. Sekarang geser outlier turun sampai sekitar y 8. Rata-rata turun menjadi sekitar 5,35, tetapi median tetap 5,13, karena outlier itu masih menjadi nilai terbesar. Geser sampai tepi atas, y 10, dan rata-rata naik menjadi 5,48 sementara median tetap 5,13.

> Awas: "rata-rata bergeser kira-kira dua kali lebih jauh" adalah kasus bawaan, bukan hukum. Median tidak beku: ia melompat ke nilai berikutnya, paling jauh setengah selisih antar nilai, dan pada sampel kecil lompatan itu bisa besar. Dengan outlier di x 9,5, y 9,5, rata-rata x bergeser 0,27 dan median x bergeser 0,28, sehingga kotak Kuis Cepat yang pertama menjawab "kira-kira sama".

::: deeper Mengapa hanya rata-rata yang menyadari outlier yang lebih tinggi
Kedua pusat data memakai outlier dengan cara berbeda. Rata-rata menambahkan seluruh ukurannya ke dalam jumlah, sehingga titik yang 4 satuan di atas kumpulan titik menggeser rata-rata y sekitar 4 / 16. Median hanya menghitung berapa nilai yang berada di atas dan di bawahnya. Memindahkan outlier dari y 9,3 ke y 10 menambah 0,7 pada jumlah, sehingga rata-rata naik sekitar 0,04, dan tidak mengubah apa pun pada urutan, sehingga median tidak bergerak.
:::

## Korelasi bergantung pada letak titik
*Apakah outlier selalu membuat r mengecil?*

Banyak orang menjawab ya. Kotak **Kuis Cepat** yang kedua menanyakan hal itu, dan jawabannya tidak. Korelasi mengukur seberapa rapat titik-titik mengikuti garis lurus, sehingga yang penting adalah letak titik baru terhadap garis tersebut.

[[figure:outlier-lab/where-it-sits|Ke-15 titik yang sama dengan satu outlier di tiga tempat. Jauh di atas bagian tengah, r turun dari 0,87 menjadi 0,61. Jauh di sepanjang tren, r naik menjadi 0,93. Jauh di luar tren, r turun menjadi 0,01.]]

Panel tengah adalah kejutannya. Titik di x 9,5, y 9,5 jauh dari kumpulan titik, sehingga dari pandangan mana pun ia adalah outlier, tetapi letaknya dekat dengan garis yang sudah diikuti kumpulan titik itu. Titik ini justru membuat tren tampak lebih kuat.

## Titik di dalam kumpulan
*Bagaimana jika titik baru jatuh di antara titik-titik lain?*

Jika kamu menaruhnya di dalam kumpulan titik, sekitar x 5 dan y 5, tidak ada yang berubah: r tetap 0,87 dan rata-rata bergeser paling banyak 0,02. Titik di dalam kumpulan sama sekali bukan outlier.

> Gagasan kunci: outlier mengubah r menurut seberapa jauh ia dari tren, bukan seberapa jauh dari tengah. Jauh di luar garis menurunkan r, jauh di sepanjang garis menaikkannya.

## Sebaran dan garis tren
*Apa lagi yang berubah selain pusat data?*

Lihat simpangan baku y pada tabel: nilainya naik dari 1,16 menjadi 1,50 dengan outlier pertama. Simpangan baku memakai selisih kuadrat dari rata-rata, sehingga satu selisih besar berbobot banyak: selisihnya dari rata-rata lama adalah 4,12, dan kuadratnya, sekitar 17, hampir sebesar ke-15 selisih kuadrat awal yang dijumlahkan, sekitar 20.

Garis tren juga berubah. Garis abu-abu putus-putus adalah garis lurus terbaik melalui ke-15 titik, digambar seakan-akan outlier tidak ada. Garis pink pekat mencocokkan semua 16 titik. Dengan outlier di y 9,3, garisnya sedikit miring: sebelumnya naik 0,89 untuk setiap langkah ke kanan, sesudahnya 0,84.

Sekarang klik **Tambah outlier** dua kali lagi. Lab menaruh yang kedua di kanan bawah dan yang ketiga di kiri atas. Lalu r turun menjadi 0,07 dengan dua outlier dan menjadi -0,18 dengan tiga outlier, dan garis pink miring ke bawah: kemiringannya -0,21. Tiga titik dari 18 mengubah tren naik yang jelas menjadi tren turun yang samar.

> Awas: inilah sebabnya kamu membuat plot sebelum menyebut nilai r. Angka ringkasan bisa menjadi gambaran yang buruk bagi ke-15 titik yang membawa pola sebenarnya.

## Banyaknya titik yang kamu miliki
*Apakah outlier yang sama sama berpengaruhnya pada sampel yang lebih besar?*

Biarkan satu outlier di x 5, y 9,3 dan ubah **Jumlah titik**. Pengaruhnya mengecil dengan cepat, seperti ditunjukkan gambar.

[[figure:outlier-lab/more-points|Outlier yang sama ditambahkan ke n titik pertama dari kumpulan titik buatan. Rata-rata bergeser makin sedikit saat n bertambah, dan median bergeser lebih sedikit lagi.]]

> Contoh hitungan: untuk 200 titik, rata-rata y adalah 5,11, sehingga jalan pintasnya memberi (9,3 - 5,11) / 201 = 0,02. Rata-ratanya nyaris tidak bergerak. Dengan 6 titik, rata-rata y adalah 4,62 dan jalan pintasnya memberi (9,3 - 4,62) / 7 = 0,67, lompatan lebih dari 30 kali lebih besar.

Hal yang sama terjadi pada r. Dengan 6 titik, r turun dari 0,71 menjadi 0,40. Dengan 200 titik, r hanya turun dari 0,86 menjadi 0,83. Satu titik dari 201 tidak dapat membengkokkan garis yang disepakati 200 titik lainnya.

Outlier menjadi ancaman yang lebih besar ketika data sedikit, karena itu periksa lebih teliti saat barisnya sedikit.

## Satu outlier pada data nyata
*Apakah gagasan ini bertahan pada penguin sungguhan?*

Tekan **Reset**, lalu atur **Data** ke **Penguin (data nyata)**. Lab memplot panjang sirip terhadap massa tubuh untuk 342 dari 344 penguin dalam tabel; dua baris memiliki missing value dan tidak diikutkan. Pada ke-342 penguin itu, r sekitar 0,87, angka yang sama dengan yang kamu temui di pelajaran sebelumnya. Lab menampilkan 15 di antaranya, dipilih lewat pengacakan dengan seed.

Pada sampel pertama berisi 15 penguin, r adalah 0,65. Tambahkan outlier di 200 mm dan 6,65 kg, tempat lab menaruh outlier yang pertama. Panjang siripnya biasa saja, massanya di atas semua penguin dalam tabel (yang terberat 6,3 kg), dan sirip 200 mm biasanya berpasangan dengan massa sekitar 3,9 kg, sehingga pasangan nilai ini jauh dari tren. r turun menjadi 0,51, dan rata-rata massa tubuh naik dari 3,96 menjadi 4,13 kg.

## Sampel baru
*Apakah hasilnya bertahan pada sampel baru?*

Sekarang tekan **Sampel baru** tiga kali. Tanpa outlier, r adalah 0,94, 0,90, dan 0,79 pada tiga sampel berikutnya, sehingga r pada sampel kecil dapat berubah-ubah dengan sendirinya. Dengan outlier nilainya 0,76, 0,77, dan 0,53. Pada keempat sampel, outlier menarik r turun, dan pengaruhnya memudar saat titik bertambah: pada sampel pertama, dengan 200 penguin r berubah dari 0,85 menjadi 0,83.

Empat sampel hanyalah pemeriksaan kecil, bukan bukti. Selalu bandingkan "dengan" dan "tanpa" pada sampel yang sama.

::: remember
- Outlier yang jauh terus menyeret rata-rata, sedangkan median hanya melompat ke nilai berikutnya; r berubah menurut seberapa jauh outlier dari tren, dan dapat naik atau turun.
- Outlier yang sama makin kecil pengaruhnya saat jumlah titik bertambah: rata-rata bergeser sekitar (nilai baru - rata-rata lama) / (n + 1).
- Kuis Cepat, ubah satu hal, jelaskan hasilnya, lalu ulangi pada data nyata dan sampel baru sebelum kamu mempercayainya.
:::

@@lab

## Lab: outlier dan statistik
Kamu mulai dengan 15 titik buatan yang naik dari kiri ke kanan dan tanpa outlier. Kamu menambahkan hingga tiga outlier dan mengamati perubahan statistik, garis tren, dan r. Semua yang berubah ditampilkan di samping nilainya tanpa outlier.

### Kontrol
- **Data** beralih antara **Data buatan** dan **Penguin (data nyata)**. Data nyata memplot **Panjang sirip (mm)** terhadap **Massa tubuh (kg)**. Mengganti data menghapus outlier dan prediksimu.
- **Jumlah titik** (6 sampai 200, atau sampai 342 pada data nyata; mulai dari 15) mengatur banyaknya titik dalam kumpulan. Angka yang lebih besar mempertahankan titik yang sudah ada dan menambah titik baru. Pada data nyata, yang tampil adalah n penguin pertama dari pengacakan ke-342 penguin dengan seed.
- **Sampel baru** membuat kumpulan titik buatan yang baru, atau himpunan penguin acak yang baru. Outlier-mu tetap di tempatnya.
- **Tambah outlier** menambahkan outlier yang jauh dari kumpulan titik. Yang pertama muncul di x 5, y 9,3. Tombol ini nonaktif saat sudah ada tiga outlier.
- **Hapus outlier** menghapus outlier yang dipilih. Tombol ini nonaktif jika tidak ada outlier. Menghapus yang terakhir juga mengosongkan kedua prediksi.
- **Tampilkan rata-rata dan median** dan **Tampilkan garis tren** menyembunyikan atau menampilkan penanda dan garis tersebut. Keduanya aktif di awal.
- **Layar penuh** memperbesar lab. **Reset** mengembalikan ke data buatan, 15 titik, sampel bawaan, tanpa outlier, kedua tombol aktif, dan prediksi kosong.
- Pada plot: klik ruang kosong untuk menambah outlier, seret outlier untuk memindahkannya, klik dua kali untuk menghapusnya. Dengan keyboard, fokus ke plot, tekan Enter untuk menambah outlier (jika sudah ada tiga, Enter memilih outlier mana yang terpilih), pakai tombol panah untuk memindahkannya (Shift untuk langkah lebih besar), dan Delete untuk menghapusnya.
- **Kuis Cepat** adalah tombol di bawah kartu pengaturan (tombol bulat di kanan bawah pada ponsel); isinya dua kuis (pakai tombol panah di panelnya untuk berpindah): "Kamu menambahkan outlier jauh dari kumpulan titik. Mana yang bergeser lebih jauh: rata-rata atau median?" dan "Apakah menambah outlier selalu membuat korelasi r mengecil?". Pilih jawaban lebih dulu, lalu tambahkan outlier untuk melihat apakah kamu benar.

### Membaca layar
- Plot menampilkan titik **Data**, berlian **Outlier (bisa digeser)**, dan, selama **Tampilkan rata-rata dan median** aktif, **Rata-rata (lingkaran)** dan **Median (silang)**. Setelah kamu menambah outlier, penanda sebelumnya memudar, penanda baru pekat, dan garis pendek menunjukkan seberapa jauh masing-masing bergeser. Jika ada lebih dari satu outlier, masing-masing bernomor 1, 2, 3 dan yang terpilih diberi lingkaran.
- Garis abu-abu putus-putus adalah tren tanpa outlier. Garis pink pekat adalah tren dengan outlier.
- Baris status berbunyi "Korelasi r: 0,87 tanpa outlier, 0,61 dengan outlier." Tanpa outlier, bunyinya "Korelasi r: 0,87. Belum ada outlier: klik plot untuk menambahkan." Baris detail menyebut posisi setiap outlier, misalnya "Outlier: x 5,00, y 9,30." Di sisi kanan kotak status ada hitungan seperti "15 titik + 1 outlier".
- Kotak **Kuis Cepat** menjawab setelah kamu memilih satu opsi dan sudah ada outlier. Putusannya menyebut apakah tebakanmu benar dan apa yang terjadi, lengkap dengan angka, misalnya "Untuk y, rata-rata berubah dari 5,18 menjadi 5,43 dan median dari 5,02 menjadi 5,13."
- Tabel **Statistik tanpa dan dengan outlier** memiliki kolom **Statistik**, **Tanpa outlier**, **Dengan outlier**, dan **Perubahan**, serta baris **Jumlah titik**, **Rata-rata x**, **Rata-rata y**, **Median x**, **Median y**, **Simpangan baku x**, **Simpangan baku y**, dan **Korelasi r**. Pada data nyata, x dan y menjadi panjang sirip dan massa tubuh. Perubahan diberi tanda, dan dicetak tebal jika 0,005 atau lebih. Simpangan baku dibagi dengan jumlah titik.

### Eksperimen
Angka di bawah ini untuk sampel bawaan. Jika kamu sudah menekan **Sampel baru**, tekan **Reset** dulu agar angkamu sama.

1. **Rata-rata atau median?** Prediksi: di kotak Kuis Cepat yang pertama, pilih mana yang bergeser lebih jauh saat kamu menambah outlier jauh di atas kumpulan titik. Lalu tekan **Tambah outlier**. Di tabel, rata-rata y berubah +0,26 (5,18 menjadi 5,43) dan median y berubah +0,12 (5,02 menjadi 5,13). Periksa juga simpangan baku y: 1,16 menjadi 1,50. Mengapa rata-rata bergeser kira-kira dua kali lebih jauh?
2. **Pindahkan ke tempat yang tepat.** Persiapan: tekan **Hapus outlier**, yang mengosongkan kedua kotak. Prediksi: di kotak kedua, pilih apakah r selalu turun. Tekan **Tambah outlier**, lalu seret ke kanan atas, sekitar x 9 dan y 9,5. Lihat **Korelasi r** di baris status dan di tabel: nilainya naik di atas 0,9. Sekarang seret ke kanan bawah, sekitar x 9,5 dan y 1: r turun hingga hampir 0. Di mana letak outlier terhadap garis putus-putus saat r naik? Kotak pertama mungkin kini menjawab "kira-kira sama": pada x, rata-rata dan median masing-masing bergeser sekitar 0,23 sampai 0,28, jadi periksa tabel sebelum kamu mempercayai satu putusan.
3. **Titik di dalam kumpulan.** Prediksi: apa yang terjadi pada r dan rata-rata jika kamu menyeret outlier ke tengah kumpulan titik, sekitar x 5 dan y 5? Cobalah. r tetap dekat 0,87 dan rata-rata berubah 0,02 atau kurang. Kotak pertama mungkin menyebut median, tetapi baca tabelnya: median bergeser 0,04 atau kurang, jadi tidak ada yang banyak bergerak. Lalu apa yang membuat sebuah titik menjadi outlier?
4. **Titik lebih banyak.** Prediksi: dengan outlier di x 5, y 9,3, apa yang dilakukan **Jumlah titik** terhadap perubahan rata-rata y? Lalu tekan **Hapus outlier** dan **Tambah outlier** untuk menaruhnya kembali di sana. Coba 6, 50, dan 200, lalu baca kolom **Perubahan**. Nilainya mengecil dari +0,67 ke +0,08 lalu +0,02. Jelaskan dengan (nilai baru - rata-rata lama) / (n + 1).
5. **Tiga outlier.** Prediksi: berapa outlier yang diperlukan untuk membuat r negatif? Lalu tekan **Reset** dan tekan **Tambah outlier** sampai tombolnya nonaktif dan baca baris status setelah masing-masing: r menjadi 0,61, 0,07, -0,18. Matikan **Tampilkan garis tren** lalu nyalakan lagi untuk melihat garis putus-putus dan garis pekat. Kemudian tekan **Hapus outlier** dan perhatikan r kembali naik.
6. **Penguin dan sampel baru.** Prediksi: jika kamu menambah outlier di 200 mm dan 6,65 kg pada penguin, apakah r turun, dan seberapa banyak? Lalu tekan **Reset**, atur **Data** ke **Penguin (data nyata)**, dan tekan **Tambah outlier**; yang pertama muncul di sana. Pada sampel pertama r turun dari 0,65 menjadi 0,51. Sekarang tekan **Sampel baru** tiga kali, dan catat r dengan dan tanpa outlier setiap kali: 0,94 menjadi 0,76, 0,90 menjadi 0,77, dan 0,79 menjadi 0,53. Kotak pertama mungkin menjawab "kira-kira sama" pada beberapa sampel, jadi periksa tabelnya. Lalu naikkan **Jumlah titik** ke 200: pada sampel keempat ini r berubah dari 0,86 menjadi 0,84. Apakah gagasan ini bertahan pada sampel baru, dan apa yang berubah pada sampel yang lebih besar?
