---
slug: text-classifier-lab
title: Lab text classifier
---
::: intro
- Latih classifier naive Bayes untuk teks di dalam lab, lalu sebutkan kata-kata yang menggerakkan tiap kelas dengan membaca bar.
- Prediksikan, lalu periksa, apa yang dilakukan smoothing, ukuran training set, TF-IDF, dan stop words terhadap accuracy pada test set.
- Baca satu pesan yang salah diklasifikasi kata demi kata, dan bedakan peningkatan yang nyata dari pembagian data yang kebetulan menguntungkan.

Sebelum mulai: baca "Classifier naive Bayes" dan "Bag of words dan TF-IDF". Pelajaran pertama memberimu skor sebuah kelas sebagai prior dikali satu probabilitas yang sudah di-smoothing untuk tiap kata. Pelajaran kedua memberimu bag of words dan TF-IDF.
:::

## Apa yang diminta lab ini
*Apa yang kamu bangun di lab ini, dan bagaimana kamu tahu hasilnya benar?*

Dua pelajaran terakhir memberimu dua bagian dari sebuah text classifier: bag of words yang mengubah pesan menjadi hitungan, dan naive Bayes yang mengubah hitungan menjadi kelas. Lab text classifier, yang berjudul "Naive Bayes untuk pesan pelanggan", menyatukan keduanya supaya kamu dapat membongkarnya.

Lab ini berisi 240 pesan pelanggan yang pendek, 80 untuk tiap dari tiga kelas: tagihan (billing), pengiriman (delivery), dan masalah teknis (technical problem). Pesannya sintetis: kursus ini membuatnya dari daftar kata, sehingga tidak ada pelanggan sungguhan yang menulisnya. Sebanyak 60 pesan (20 per kelas) disisihkan sebagai **test set**. Model dilatih dengan 60 dari pesan lainnya, lalu diuji pada test set.

Saat lab dibuka, accuracy test adalah 88,3% (53 dari 60 pesan) dan accuracy training 98,3%. Menebak kelas secara acak hanya mendapat 33,3%, karena tiap kelas memiliki 20 dari 60 pesan test. Itulah batas yang harus kamu lampaui.

Angka-angka di pelajaran ini berlaku untuk pesan dalam bahasa Inggris. Bila bahasa halaman diatur ke bahasa Indonesia, lab membuat pesan berbahasa Indonesia sehingga angkanya berbeda, sedangkan polanya tetap sama.

## Kontrol mana mengubah apa
*Di bagian mana tiap kontrol bekerja pada jalur dari pesan ke jawaban?*

Sebuah pesan melewati lima langkah, dan tiap kontrol lab berada di salah satunya.

[[figure:text-classifier-lab/controls-map|Jalur dari pesan ke jawaban, dengan kontrol lab di tempat kontrol itu bekerja. Petunjuknya dipelajari hanya dari pesan training.]]

**Hapus stop words** menentukan kata mana yang dipertahankan. **Bobot kata** menentukan nilai sebuah kata yang dipertahankan: hitungan biasa atau bobot TF-IDF. **Smoothing alpha** menentukan seberapa besar kata yang tidak pernah dipakai suatu kelas masih dihitung. **Ukuran training set** dan **Seed (pembagian acak)** menentukan pesan mana yang menjadi sumber petunjuk.

Ubah satu kontrol dalam satu waktu dan perhatikan baris accuracy. Pesan test tetap sama selama kamu mengubah ukuran training set, smoothing, bobot, dan stop words, sehingga hasilnya dapat dibandingkan secara adil. Seed baru juga memilih test set baru, dan sejak itu sebuah angka hanya dapat dibandingkan dengan angka lain dari seed yang sama.

> Gagasan kunci: setiap pengaturan mengubah petunjuk yang dipelajari model, dan test set memberi tahu apakah perubahan itu membantu pada pesan yang belum pernah dilihat model.

## Membaca bar
*Kata mana yang dianggap model sebagai petunjuk?*

Grafik menampilkan, untuk tiap kelas, enam kata dengan log-odds tertinggi. Untuk kata w dan kelas c, log-odds adalah ln P(w | c) dikurangi ln P(w | dua kelas lain digabung). Bar bernilai 2,2 berarti e^2,2, sekitar 9: kata itu menempati porsi kata di kelasnya sekitar 9 kali porsinya di kelas-kelas lain.

> Contoh hitungan: pada awalnya, "have" memiliki log-odds 2,2 untuk billing. Ke-20 pesan training billing memuat 393 kata, 40 pesan lainnya memuat 315 + 350 = 665, dan vocabulary berisi V = 153 kata. "have" muncul 5 kali di billing dan tidak pernah di tempat lain. Dengan alpha = 1, P(have | billing) = (5 + 1) / (393 + 153) = 6 / 546 = 0,0110, dan P(have | lainnya) = (0 + 1) / (665 + 153) = 1 / 818 = 0,00122. Rasionya 8,99, dan ln 8,99 = 2,20.

"have" bukan kata khas billing. Lima pesan billing kebetulan memakainya, dan tidak ada pesan training lain yang memakainya. Bar menunjukkan seberapa timpang sebuah kata pada pesan training, dan itu tidak sama dengan seberapa penting kata tersebut.

## Smoothing dan masalah nol
*Apa yang terjadi pada kata yang tidak pernah dipakai oleh satu kelas?*

**Smoothing alpha** adalah hitungan pura-pura yang pada pelajaran sebelumnya diatur ke 1. Tiap probabilitas adalah (hitungan + alpha) / (total kelas + alpha x V). Pada alpha = 0, kata yang tidak pernah dipakai suatu kelas berprobabilitas 0, dan pesan yang memuat kata seperti itu mendapat probabilitas 0 untuk kelas tersebut, apa pun kata-kata lainnya.

Di lab ini hal itu tidak jarang. Pada alpha = 0, ke-60 pesan test semuanya memuat kata yang tidak pernah dipakai oleh satu kelas saat training. Pada 17 di antaranya semua kelas tersingkir, sehingga ketiganya mendapat 33,3% dan penguji menampilkan kelas pertama, billing. Accuracy test turun dari 88,3% ke 76,7% (46 dari 60). Dengan hanya 12 pesan training, turunnya sampai 38,3% (23 dari 60), nyaris sama dengan menebak.

[[figure:text-classifier-lab/smoothing-curve|Accuracy test terhadap alpha, dirata-ratakan dari 10 pembagian acak. Jurangnya ada di 0, dan semua nilai di atasnya berdekatan.]]

Di atas nol, alpha berpengaruh kecil di sini. Antara 0,05 dan 2, rata-ratanya tetap sekitar 87% sampai 90% untuk 60 pesan training. Alpha memang mengecilkan bar: "have" turun dari 2,2 menjadi 1,6 pada alpha = 2 dan naik menjadi 5,1 pada alpha = 0,05.

## Lebih banyak pesan training
*Apa yang didapat model dari pesan yang lebih banyak?*

Geser **Ukuran training set** dari 6 ke 180. Ukuran yang lebih besar hanya menambahkan pesan ke ukuran yang lebih kecil, dan test set tidak berubah. Pada pembagian pertama, accuracy test berturut-turut 61,7%, 65,0%, 88,3%, dan 95,0% pada 6, 12, 60, dan 180 pesan, sementara vocabulary tumbuh dari 58 ke 98, 153, dan 168 kata. Accuracy training bergerak ke arah sebaliknya: 100%, 100%, 98,3%, dan 95,0%.

[[figure:text-classifier-lab/size-curve|Accuracy training dan test terhadap ukuran training set, dirata-ratakan dari 10 pembagian acak. Selisihnya menyempit seiring model melihat lebih banyak pesan.]]

Dengan 6 pesan, model mendapat 100% pada pesan yang sudah dilihatnya dan sekitar 58% pada pesan baru, dirata-ratakan dari 10 pembagian. Model menyesuaikan diri dengan contohnya yang sedikit, yaitu overfitting yang sudah kamu temui di Level 1. Seiring pesan bertambah, accuracy training merosot karena model tidak lagi dapat menyesuaikan diri dengan setiap pesan, sedangkan accuracy test naik. Rata-rata, 180 pesan memberi 96,4% pada training set dan 92,3% pada test set.

Kurvanya mendatar: setelah sekitar 80 pesan, tiap pesan tambahan hanya menambah sedikit. Kesalahan yang tersisa menjadi topik "Membaca satu kesalahan" dan "Banyak kata lemah".

## Hitungan, TF-IDF, dan stop words
*Apakah pengaturan feature yang lebih canggih mengalahkan hitungan biasa?*

Pada pembagian pertama, tampaknya begitu. Hitungan mendapat 53 dari 60, TF-IDF 54, dan **Hapus stop words** 55. Pembagian lain mengubah gambarannya.

| Seed | Jumlah kata | TF-IDF | Hapus stop words |
| --- | --- | --- | --- |
| 1 | 53 | 54 | 55 |
| 2 | 50 | 53 | 53 |
| 3 | 55 | 56 | 52 |
| 4 | 56 | 55 | 56 |

Pesan yang benar dari 60. Satu pesan bernilai 1 / 60 = 1,7 poin. Pada 30 pembagian, penghapusan stop words mengubah hasil rata-rata sebesar +0,3 pesan (lebih baik pada 14 pembagian, lebih buruk pada 10), dan TF-IDF sebesar +0,4 (lebih baik pada 13, lebih buruk pada 8). Pada korpus ini, itu bukan peningkatan yang dapat diandalkan.

Pengaturan ini adalah pilihan yang harus diuji, seperti yang dikatakan "Bag of words dan TF-IDF". TF-IDF di sini adalah varian dari lipatan "Resep TF-IDF lainnya" pada pelajaran itu, dengan tiap pesan diskalakan ke panjang 1. Efeknya paling terlihat pada probabilitas: nilainya menjadi kurang ekstrem.

::: deeper Mengapa TF-IDF membuat probabilitas kurang ekstrem
Dengan hitungan, pesan yang memuat 19 kata berbeda menjumlahkan 19 dorongan, masing-masing sebesar yang diberikan hitungan. Dengan TF-IDF, bobot tiap pesan diskalakan sehingga kuadratnya berjumlah 1, sehingga setiap dorongan hanya sebagian kecil dari ukurannya yang berbasis hitungan. Rasio antara kedua kelas pun tumbuh jauh lebih lambat. Untuk pesan di bagian berikutnya, jumlah dorongannya +8,64 dengan hitungan dan +0,98 dengan TF-IDF. Urutan kelasnya sama, tetapi 99,98% menjadi 62,3%.
:::

## Membaca satu kesalahan
*Mengapa model salah menjawab pesan ini?*

Pada pembagian pertama, 7 dari 60 pesan test salah. Kartu **Pesan test yang salah diklasifikasi** mencantumkannya, dengan kesalahan yang paling diyakini model di urutan pertama, dan pesan pertama itu sudah berada di **Penguji pesan**. Kelas sebenarnya adalah delivery, dan model menjawab billing dengan 100,0%.

[[figure:text-classifier-lab/one-mistake|Kesalahan yang paling diyakini model, kata demi kata. Bar yang menunjuk ke kanan mendorong ke jawaban model, bar yang menunjuk ke kiri ke kelas sebenarnya.]]

Pesan itu memuat dua keluhan: mengubah alamat, dan refund untuk langganan yang dibatalkan. Label hanya mencatat yang pertama, tetapi model membaca keduanya. Lima kata bertopik billing (still, cancelled, subscription, have, refund) mendorong +9,8 ke billing. "address", "shipment", dan "courier" mendorong −4,2 ke delivery. Bersama "received" dan 10 kata kecil lainnya (+0,9 dan +2,1), dengan prior yang tidak mendorong ke mana pun, jumlahnya +8,64. Maka billing sekitar e^8,64 = 5.650 kali lebih mungkin daripada delivery.

> Awas: 100,0% tidak berarti jawabannya benar. Naive Bayes mengalikan kata-kata seolah masing-masing membawa bukti baru, sehingga pesan yang mengulang kata-kata satu topik tampak sangat meyakinkan.

## Banyak kata lemah
*Dapatkah pesan dengan satu keluhan tetap salah diklasifikasi?*

Jenis kesalahan kedua tidak memerlukan keluhan kedua. "Hi, I cannot login to my account today. This is the second time I am writing." adalah masalah teknis, tetapi model menjawab billing dengan 70,2%. Kata-kata yang menunjuk ke technical problem (login, cannot, today, dan beberapa lainnya) berjumlah −4,9. Sembilan kata lemah (this, am, writing, my, i, second, hi, to, is) masing-masing mendorong sekitar 0,5 sampai 1,0 ke billing, totalnya +6,1, dan jumlah akhirnya +1,16 untuk billing. Banyak dorongan kecil dapat mengalahkan beberapa dorongan besar. Nyalakan **Hapus stop words** dan model menjawab pesan ini dengan benar, dengan 58,2%. Dengan stop words mati dan 180 pesan training, pesan itu salah lagi, sehingga satu pesan hanyalah cerita dan bukan hasil.

## Mengapa lab lebih mudah daripada data nyata
*Seberapa jauh angka-angka ini dapat dipercaya pada pesanmu sendiri?*

Sekitar satu dari tujuh pesan di korpus ini memuat keluhan kedua, dan pesan semacam itulah penyebab sebagian besar kesalahan: dengan 180 pesan training, 43 dari 46 kesalahan pada sepuluh pembagian. Pesan nyata lebih berantakan: lebih panjang, penuh bahasa gaul dan salah ketik, topiknya jauh lebih banyak, satu kelas jauh lebih sering daripada yang lain, dan labelnya tidak selalu disepakati orang. **Catatan data nyata** di bawah grafik menyebutkannya. Bersiaplah menghadapi accuracy yang lebih rendah dan vocabulary yang jauh lebih besar: accuracy test 92% menunjukkan seberapa baik metode ini membaca teks sintetis yang bersih dan pendek, bukan seberapa baik hasilnya pada pesanmu sendiri.

::: remember
- Sebuah bar adalah log-odds sebuah kata untuk satu kelas terhadap kelas lain, dan bar itu menunjukkan seberapa timpang pesan training, yang tidak sama dengan tingkat kepentingan. Smoothing alpha = 0 membiarkan satu kata yang belum pernah terlihat menihilkan sebuah kelas; nilai di atas 0 mengatasinya.
- Lebih banyak pesan training mempersempit selisih antara accuracy training dan test. Dengan 60 pesan test, satu pesan bernilai 1,7 poin, karena itu periksa TF-IDF atau stop words pada beberapa pembagian.
- Untuk membaca sebuah kesalahan, baca dorongan tiap kata: banyak kata lemah dapat mengalahkan beberapa kata kuat.
:::

@@lab

## Lab: Naive Bayes untuk pesan pelanggan
Lab ini melatih classifier naive Bayes pada pesan pelanggan sintetis yang pendek dari tiga kelas (billing, delivery, technical problem), lalu mengujinya pada pesan yang belum pernah dilihatnya. Angka di bawah berlaku untuk pesan berbahasa Inggris pada pembagian pertama; bila bahasa halaman diatur ke bahasa Indonesia, pesan dan angkanya berbeda.

### Kontrol
- **Smoothing alpha** (0 sampai 2 dengan langkah 0,05, awalnya 1,00) ditambahkan ke setiap hitungan kata. Pada 0, kata yang tidak pernah dilihat suatu kelas membuat kelas itu berprobabilitas 0.
- **Bobot kata** adalah menu berisi **Jumlah kata** (bawaan) dan **TF-IDF**.
- **Hapus stop words** adalah sakelar, mati pada awalnya. Daftar stop words-nya pendek dan berisi kata yang sangat umum seperti "the", "and", "have", "at", dan "an".
- **Ukuran training set** (6 sampai 180 pesan dengan langkah 6; awalnya 60 pesan; 180 adalah semua pesan di luar test set). Ukuran yang lebih besar hanya menambahkan pesan ke ukuran yang lebih kecil, dan test set tidak berubah.
- **Seed (pembagian acak)** (bilangan bulat 1 sampai 999, awalnya 1) menentukan pesan mana yang masuk ke kumpulan training dan mana yang ke test set. Seed lain menghasilkan test set yang berbeda.
- **Pembagian baru** menambah **Seed (pembagian acak)** sebanyak 1 (setelah 999 kembali ke 1).
- **Kuis Cepat** adalah tombol di bawah kartu **Pengaturan** (tombol di bawah kartu pengaturan (tombol bulat di kanan bawah pada ponsel) pada ponsel): "Jika kamu mengatur smoothing ke 0, apa yang terjadi pada pesan yang memuat kata yang tidak pernah muncul di suatu kelas?". Pilih satu jawaban lebih dulu, lalu atur **Smoothing alpha** ke 0 dan periksa lagi.
- **Layar penuh** memperbesar lab. **Reset** mengembalikan setiap kontrol ke nilai awalnya (alpha 1,00, **Jumlah kata**, stop words mati, 60 pesan, seed 1), menghapus jawaban Kuis Cepat dan menaruh kembali pesan salah pertama di penguji.

### Membaca layar
- Grafik menampilkan, untuk tiap kelas, enam kata dengan log-odds tertinggi, beserta nama kelas dan jumlah pesan trainingnya (pada awalnya "20 pesan training"). Bar yang lebih panjang berarti petunjuk yang lebih kuat, seperti yang dikatakan keterangan **Log-odds (bar lebih panjang = petunjuk lebih kuat)**. Legenda menyebutkan ketiga kelas.
- Pada **Smoothing alpha** 0 dengan mode **Jumlah kata**, bar kata yang hanya terlihat di satu kelas berbunyi "∞ · 11×": tanda tak hingga, lalu berapa kali kata itu terlihat. Bar diurutkan menurut hitungan itu, dan sebuah catatan di bawah legenda menjelaskannya.
- Di bawah legenda ada catatan: "240 pesan sintetis dalam bahasa Inggris (bahasa halaman), 80 per kelas. 60 di antaranya disisihkan untuk pengujian dan tidak pernah dipakai untuk training. Ganti bahasa halaman untuk mendapat pesan dalam bahasa lainnya."
- **Catatan data nyata** adalah kotak tertutup di bawah grafik. Isinya menjelaskan mengapa pesannya sintetis dan apa bedanya dengan pesan nyata.
- Baris status berbunyi "Accuracy test: 88,3% (53 dari 60 pesan test benar)." Baris detail berbunyi "Dilatih dengan 60 pesan. Vocabulary berisi 153 kata berbeda." dan menambahkan ", stop words dihapus" saat sakelar itu menyala. Di sisi kanan kotak status tertulis "60 train · 60 test".
- **Accuracy dan confusion matrix** menampilkan "Accuracy pada pesan test", "Accuracy pada pesan training", dan "Selalu menebak kelas yang paling sering muncul akan menghasilkan 33,3%." Baris matrix adalah kelas sebenarnya dan kolomnya **Kelas prediksi**; diagonal menghitung prediksi yang benar. Pada awalnya isinya billing 18, 1, 1; delivery 1, 16, 3; technical problem 1, 0, 19.
- **Penguji pesan** memiliki **Pilih pesan dari test set** (daftar 60 pesan test) dan **Pesan**, kotak tempat kamu dapat mengetik pesanmu sendiri. Di bawahnya tertulis, misalnya, "Model memprediksi "billing" (100,0%). Kelas sebenarnya adalah "delivery": salah.", lalu sebuah bar dan persentase untuk tiap kelas. Hasil seri berbunyi "Tidak ada kelas yang unggul (semuanya 33,3%); jika seri, hasilnya jatuh ke ...".
- Di bawahnya, **Mengapa "billing" dan bukan "delivery"?** menampilkan satu chip per kata. **Mendorong ke "billing" (pilihan model)** dan **Mendorong ke "delivery" (kelas sebenarnya)** memuat kata beserta dorongannya, seperti "still +2,3" ("×3" sebelum dorongan berarti kata itu muncul 3 kali). **Kata netral (hampir tidak mendorong)**, **Tidak ada di vocabulary training, jadi diabaikan**, dan **Stop words, dihapus** memuat sisanya. Baris terakhir memberikan jumlah prior dan semua dorongan; jumlah positif berarti pilihan model menang.
- **Pesan test yang salah diklasifikasi** mencantumkan pesan test yang salah, dengan kesalahan yang paling diyakini model di urutan pertama, masing-masing dengan "Kelas sebenarnya: delivery · Prediksi model: billing (100,0%)". Klik salah satunya untuk memuatnya ke penguji. Pesan yang menjadi benar akan hilang dari daftar.

### Eksperimen
Tekan **Reset** sebelum tiap eksperimen, agar angkamu sama.

1. **Kata mana yang menggerakkan sebuah kelas?** Prediksikan: apakah kata-kata teratas tiap kelas semuanya kata topik seperti "refund", "parcel", dan "error"? Baca grafiknya. Sebagian memang demikian, seperti "subscription", "tracking", dan "screen", tetapi "have" (billing), "at" (delivery), dan "an" (technical problem) juga ada di daftar. Sekarang nyalakan **Hapus stop words**: ketiganya hilang, accuracy test naik dari 88,3% ke 91,7% (55 dari 60), dan vocabulary menyusut dari 153 ke 125 kata. Mengapa "have" bisa menjadi petunjuk untuk billing, dan apa yang diukur bar bernilai 2,2?
2. **Smoothing.** Prediksikan: di **Kuis Cepat**, pilih apa yang terjadi pada smoothing 0. Lalu seret **Smoothing alpha** ke 0. Kuis menjawab dengan contoh pesan, bar menampilkan "∞", dan accuracy test turun ke 76,7% (46 dari 60). Atur **Ukuran training set** ke 12: 38,3% (23 dari 60), dan matrix menaruh hampir semua pesan di kolom billing. Kembali ke 60 pesan dan coba **Smoothing alpha** 0,05, 1, dan 2: 91,7%, 88,3%, dan 90,0%. Bagian perubahan mana yang berasal dari nol, dan mana yang berasal dari besarnya alpha?
3. **Berapa banyak pesan?** Prediksikan: apa yang terjadi pada accuracy test dan accuracy training saat **Ukuran training set** naik dari 6 ke 180? Coba 6, 12, 60, dan 180 lalu baca kartu **Accuracy dan confusion matrix**. Accuracy test: 61,7%, 65,0%, 88,3%, dan 95,0%. Accuracy training: 100%, 100%, 98,3%, dan 95,0%. Vocabulary di baris detail tumbuh dari 58 ke 168. Mengapa accuracy training turun sementara accuracy test naik?
4. **Satu kesalahan, kata demi kata.** Prediksikan: baris pertama **Pesan test yang salah diklasifikasi** (yang diawali "Hi, please change the address on my shipment") memiliki kelas sebenarnya delivery. Kelas apa yang kamu perkirakan dijawab model, dan dengan probabilitas berapa? Klik baris itu. Model menjawab billing dengan 100,0%. Baca chip-nya: "still", "cancelled", "subscription", "have", dan "refund" mendorong ke billing, "address", "shipment", dan "courier" ke delivery, dan "before", "change", serta "comes" diabaikan. Jumlahnya +8,64. Sekarang atur **Bobot kata** ke **TF-IDF**: penguji menjawab billing dengan 62,3%. Mengapa pesan yang sama menjadi kurang ekstrem?
5. **Banyak kata lemah.** Prediksikan: klik baris kelima, "Hi, I cannot login to my account today. This is the second time I am writing." Kelas sebenarnya adalah technical problem dan model menjawab billing (70,2%). Kata mana yang mendorong ke technical problem (login, cannot, today), dan apakah cukup? Banyak kata lemah mendorong ke billing, dan jumlahnya +1,16. Lalu nyalakan **Hapus stop words**: pesan itu hilang dari daftar, dan penguji menjawab technical problem (58,2%). Lalu matikan lagi **Hapus stop words** dan atur **Ukuran training set** ke 180: pesan itu salah lagi (billing, 82,6%). Apakah satu pesan merupakan bukti yang baik tentang stop words?
6. **Pembagian data yang lain.** Prediksikan: apakah stop words dan TF-IDF membantu di setiap pembagian? Pada pembagian pertama keduanya membantu, dari 53 benar menjadi 55 dan 54. Tekan **Pembagian baru** tiga kali dan tiap kali baca accuracy dengan **Jumlah kata**, **TF-IDF**, dan **Hapus stop words** (tiap kali matikan yang satunya): seed 2 memberi 50, 53, dan 53 benar, seed 3 memberi 55, 56, dan 52, seed 4 memberi 56, 55, dan 56. Lalu buka **Catatan data nyata** dan bacalah. Gagasan yang membantu pada satu pembagian tidak berlaku pada pembagian berikutnya. Satu poin accuracy setara berapa pesan test, dan apa yang diperlukan agar kamu percaya pada sebuah peningkatan?
