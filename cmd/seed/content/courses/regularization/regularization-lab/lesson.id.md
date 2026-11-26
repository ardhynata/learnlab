---
slug: regularization-lab
title: Lab regularisasi
---
::: intro
- Prediksikan bagaimana training error, validation error, dan koefisien berubah saat kekuatan penalti λ dinaikkan, lalu periksa di lab.
- Bandingkan penalti L2 (ridge) dan L1 (lasso) pada sampel yang sama, dan jelaskan kapan penalti membantu dan kapan tidak.
- Uji gagasan ini pada data penguin yang asli dan pada sampel baru sebelum kamu mempercayainya.

Sebelum mulai: baca "Bias, varians, dan shrinkage" dan "L1 dan L2: ridge dan lasso", dua pelajaran sebelum ini dalam kursus.
:::

## Apa yang ditanyakan lab
*Apa yang kamu naikkan, dan apa yang kamu amati?*

Dua pelajaran sebelum ini memberimu sebuah resep: tambahkan harga untuk koefisien yang besar ke dalam loss, yaitu **Loss = MSE + λ × penalti**, lalu pilih λ dengan validation set. Di lab bernama **Fit dengan penalti**, kamu memutar λ sendiri dan melihat apa yang terjadi.

Lab dimulai dengan 60 titik buatan di sekitar sebuah kurva mulus, dengan noise 0,5, yaitu varians 0,25. Sebanyak 18 titik disisihkan sebagai titik silang **Validasi**. Dari 42 titik sisanya, lab mengambil 15 sebagai titik bulat **Training**, lalu mem-fit polinomial derajat 9 hanya pada titik bulat itu. Hasilnya 9 koefisien, satu untuk setiap pangkat x dari 1 sampai 9, dan semua feature distandarkan lebih dulu, seperti diminta pelajaran sebelumnya.

Tiga hal bergerak bersamaan ketika λ diubah:

- **kurva hasil fit** pada plot,
- **koefisien**, satu batang untuk masing-masing,
- **training error** dan **validation error**.

Slider λ berjalan dari 0,00001 sampai 10 pada skala log: setiap langkah mengalikan λ dengan faktor yang sama, sehingga nilai kecil mendapat ruang sebanyak nilai besar. Slider dimulai dari nilai terkecil, sehingga lab terbuka pada fit yang hampir tanpa penalti.

## Prediksi, ubah, jelaskan, terapkan
*Mengapa menebak dulu sebelum menggeser slider?*

Slider mudah digeser tanpa berpikir. Rencana di bawah mengubah setiap geseran menjadi uji kecil.

1. **Prediksi.** Pilih jawaban di kotak **Kuis Cepat**: saat λ membesar dari nilai terkecilnya, apa yang pertama terjadi pada validation error?
2. **Ubah.** Geser λ, satu perubahan dalam satu waktu. Garis validasi hanya terisi sampai λ terbesar yang sudah kamu coba.
3. **Jelaskan.** Tekan **Cek prediksiku**. Lab menampilkan seluruh garis validasi dan melingkari λ terbaik. Jelaskan mengapa kurvanya berbentuk seperti itu dengan bias, varians, dan shrinkage.
4. **Terapkan.** Ulangi gagasan ini pada penalti lain, derajat lain, jumlah data lain, lalu pada data penguin yang asli.

> Gagasan kunci: λ terbaik tidak diketahui sebelumnya. Kamu menemukannya dengan mencoba banyak nilai dan membaca validation error, dan lab menyembunyikan jawaban itu sampai kamu sudah menetapkan tebakanmu.

Tebakan yang salah justru berguna: jika kamu mengira validation error akan terus turun, lab menunjukkan di mana ia berbalik naik, dan langkah menjelaskan memperbaiki gambaran di kepalamu.

## Kurva validation berbentuk U
*Apa yang dilakukan kedua error saat λ membesar?*

Semua angka di bawah memakai sampel bawaan, **L2 (ridge)**, derajat 9, dan 15 titik training. Error di sini adalah mean squared error, jadi makin kecil makin baik.

| λ | Training error | Validation error | Koefisien terbesar |
|---|---|---|---|
| 0,00001 | 0,11 | 3,84 | 14,81 |
| 0,0001 | 0,14 | 1,45 | 9,59 |
| 0,001 | 0,21 | 0,48 | 3,76 |
| 0,01 | 0,29 | 0,48 | 2,61 |
| 0,1 | 0,55 | 0,93 | 1,38 |
| 1 | 1,06 | 2,21 | 0,38 |
| 10 | 1,41 | 2,85 | 0,07 |

Training error naik di setiap langkah: penalti selalu membuat fit ke titik bulat menjadi lebih buruk. Validation error awalnya justru sebaliknya. Ia turun dari 3,84 ke 0,48, bertahan di sekitar 0,48 dari λ = 0,001 sampai 0,01, lalu naik ke 2,85 ketika kurva terjepit menjadi garis yang hampir datar.

[[figure:regularization-lab/u-shape|Training error dan validation error terhadap λ pada sampel bawaan. Training error hanya naik. Validation error turun sampai 0,48 pada λ = 0,010, λ terbaik menurut lab, lalu naik lagi.]]

Sisi kiri adalah overfitting: 9 koefisien bebas dan 15 titik bulat membuat kurva mengejar noise. Sisi kanan adalah underfitting: penalti membuat kurva terlalu kaku untuk mengikuti bentuk yang sebenarnya. Noise saja sudah menetapkan batas bawah sekitar 0,25 untuk sebuah titik baru, jadi 0,48 menunjukkan berapa mahalnya hanya memiliki 15 titik bulat.

## Koefisien: mengecil atau dimatikan
*Apa yang terjadi pada kesembilan koefisien saat λ membesar?*

Grafik koefisien punya satu batang untuk setiap pangkat x. Lihat "Koefisien terbesar" pada tabel di atas: nilainya turun dari 14,81 ke 2,61 lalu ke 0,38. Koefisien besar dengan tanda berlawanan itulah yang membuat kurva derajat 9 meliuk di antara titik bulat, dan penaltilah yang menghilangkannya.

[[figure:regularization-lab/coefficients|Kesembilan koefisien pada tiga nilai λ, untuk ridge (atas) dan lasso (bawah). Ridge mengecilkan semuanya dan tidak pernah mencapai 0. Lasso membuat sebagian tepat 0, sampai tersisa satu saja pada λ = 1.]]

Ridge mengecilkan setiap koefisien dan tidak membuat satu pun tepat 0: lab menulis "Tepat 0: 0 dari 9" di setiap λ. Lasso mematikan koefisien. Pada λ = 0,001 satu koefisien bernilai 0, pada λ = 0,01 empat koefisien (pangkat 5 sampai 8), dan pada λ = 1 hanya pangkat 1 yang tersisa, sehingga kurva hasil fit berupa garis lurus.

> Contoh hitungan: lasso pada λ = 1 mempertahankan satu koefisien, -0,372, dengan training error 1,105. Loss-nya 1,105 + 1 × 0,372 = 1,477. Jika kesembilannya dibuat 0, training error menjadi 1,615 dan penaltinya 0, sehingga loss-nya 1,615. Loss lasso lebih rendah, jadi satu koefisien itu dipertahankan. Pada λ = 2,5 solusi lasso adalah nol semua.

## Ketika penalti tidak membantu
*Apakah setiap model memerlukan regularisasi?*

"Bias, varians, dan shrinkage" sudah memperingatkan bahwa regularisasi menurunkan varians dan menaikkan bias, sehingga ia membantu model yang overfitting dan merugikan model yang tidak. Di lab, kamu dapat memeriksanya dengan mengubah **Derajat polinomial**.

Pada derajat 3, yang terlalu sedikit kebebasannya untuk mengejar noise, λ terkecil sudah menghasilkan training error 0,34 dan validation error 0,40. λ yang lebih besar hanya merugikan: 0,35 dan 0,50 pada λ = 0,01, lalu 1,45 dan 2,84 pada λ = 10. **Cek prediksiku** melaporkan bahwa tidak ada penalti yang membantu pada sampel ini.

Pada derajat 12, model punya kebebasan yang jauh berlebihan. Dengan λ terkecil, validation error-nya 4,90. Pada λ = 0,001 nilainya turun ke 0,45, dan pada λ = 0,01 menjadi 0,48, sama dengan derajat 9 pada λ itu, dengan koefisien terbesar yang sama (2,6). Setelah λ cukup besar, penaltilah yang menentukan seberapa fleksibel kurvanya, bukan derajatnya.

> Awas: model yang fleksibel ditambah penalti tidak lebih baik daripada model yang ukurannya tepat. Derajat 3 dengan penalti hampir nol mencapai 0,40 di sini, sedangkan derajat 12 dengan penalti terbaiknya mencapai 0,45.

## Data mengubah jawabannya
*Mengapa training set yang kecil memerlukan penalti yang lebih besar?*

Gunakan **Titik training (dari 42)** untuk mengubah seberapa banyak data yang dipelajari model. Ke-18 titik silang validasi tidak pernah berubah, sehingga error tetap dapat dibandingkan.

Dengan 8 titik training, λ terkecil memberi validation error 30,43. λ terbaiknya 0,025, dan ia menurunkan error menjadi 0,71, sekitar 43 kali lebih rendah. Dengan 42 titik training, λ terkecil sudah memberi 0,33, dan λ terbaik, 0,00016, memberi 0,32. Jika datanya banyak, data itu sendiri sudah menjaga kurva tetap terkendali: data yang lebih banyak menurunkan varians, sehingga ia mengerjakan tugas yang tadinya dikerjakan penalti.

[[figure:regularization-lab/penalty-vs-data|Validation error pada λ terkecil dan pada λ terbaik untuk training set berisi 8 sampai 42 titik. Kedua garis berjauhan saat titiknya sedikit dan hampir bersentuhan saat titiknya banyak.]]

**Tampilan learning curve** menunjukkan cerita yang sama dari sumbu lain. Pada λ = 0,01, dengan rata-rata dari 6 pembagian acak, validation error sekitar 3,0 dengan 15 titik training dan sekitar 0,47 dengan 42 titik, sementara training error tetap di sekitar 0,3. Selisihnya menyempit seiring bertambahnya data.

> Contoh hitungan: 30,43 / 0,71 = 42,9, jadi dengan 8 titik, λ terbaik memangkas validation error sekitar 43 kali. Dengan 42 titik, 0,33 / 0,32 kira-kira 1,0, sehingga pengaruhnya hampir tidak terasa.

## Penguin yang asli
*Apakah gagasan ini bertahan pada data nyata?*

Ubah **Data** menjadi **Penguin (data nyata)**. Lab memakai 342 penguin yang semua pengukurannya lengkap (2 dari 344 baris punya missing value), mengambil 60 di antaranya secara acak, dan memprediksi massa tubuh dari panjang flipper, panjang paruh, dan kedalaman paruh. Setiap pengukuran mendapat pangkat 1 sampai 9 sendiri, sehingga ada 27 koefisien. Pengukuran diskalakan ke 0 sampai 10, sehingga lab juga melaporkan rata-rata meleset dalam gram.

Pada sampel pertama dengan ridge, λ terkecil memberi validation error 40,42, atau rata-rata meleset sekitar 2.289 g. λ terbaik, 1,6, memberi 1,84, sekitar 488 g. Kurvanya lagi-lagi berbentuk U.

Dengan **L1 (lasso)**, λ terbaiknya 1,0 dan validation error-nya 1,49, sekitar 439 g, dengan 25 dari 27 koefisien tepat 0.

Tekan **Sampel baru** tiga kali dengan ridge. λ terbaiknya 0,063, 0,10, dan 0,025. Bentuk U selalu muncul, tetapi λ terbaik bergeser dari 0,025 sampai 1,6 di empat sampel, jadi tidak ada angka yang bisa dihafalkan.

> Gagasan kunci: bentuknya stabil, tetapi λ terbaik adalah milik sebuah dataset dan sebuah sampel. Pilih λ pada data validasi setiap kali.

## Membaca angka dengan hati-hati
*Seberapa jauh satu λ terbaik dapat dipercaya?*

Lab memilih λ terbaik hanya dari 18 titik validasi, sebagai yang terendah dari 31 nilai. Nilai terendah yang dipilih dari banyak percobaan tampak sedikit lebih baik daripada yang akan didapat pada data baru. Dasar yang datar pada tabel, 0,48 pada λ = 0,001 maupun 0,01, menunjukkan bahwa beberapa nilai hampir sama baiknya, jadi anggap λ terbaik sebagai sebuah daerah yang baik.

Sampel baru juga menggesernya. Pada empat sampel buatan berikutnya, λ ridge terbaik adalah 0,0010, 0,0063, 0,10, dan 0,0040. Periksa model terpilih satu kali pada test set yang tidak pernah terlibat dalam pemilihan, seperti di "Train, validation, dan test".

::: deeper Mengapa validation error terendah membuat model tampak lebih baik
Misalkan dua nilai λ sama baiknya, tetapi beberapa titik validasi yang kurang beruntung membuat salah satunya tampak sedikit lebih baik. Kamu memilihnya dan melaporkan error-nya. Error itu dipilih karena rendah, sebagian karena kebetulan, sehingga pada data baru biasanya akan lebih tinggi. Makin banyak nilai yang dibandingkan dan makin sedikit titik validasi, makin besar pengaruhnya. Test set yang tidak berperan dalam memilih λ memberikan angka yang jujur.
:::

::: remember
- Menaikkan λ selalu menaikkan training error. Validation error turun lalu naik, dan titik terendah dari bentuk U itu adalah λ terbaik.
- Ridge mengecilkan semua koefisien dan tidak membuat satu pun jadi 0. Lasso membuat sebagian tepat 0. Penalti membantu model yang overfitting dan merugikan model yang tidak, dan paling berarti saat data langka.
- Bentuk U bertahan pada data nyata, tetapi λ terbaik berubah menurut dataset dan sampel. Pilih λ pada data validasi, lalu uji satu kali.
:::

@@lab

## Lab: Fit dengan penalti
Sebuah polinomial di-fit hanya pada titik bulat. Penalti menarik koefisiennya ke nol, dan titik silang disisihkan untuk menguji hasil fit. Kamu menaikkan kekuatan penalti dan mengamati kurva, koefisien, serta kedua error.

### Kontrol
- **Data** berganti antara **Data buatan** dan **Penguin (data nyata)**. Dengan data nyata, plot menampilkan massa tubuh terhadap panjang flipper, keduanya diskalakan 0 sampai 10, dan dua pengukuran lainnya ditahan pada rata-rata data training. Kontrol **Noise** dinonaktifkan di sana.
- **Penalti** memilih **L2 (ridge)** atau **L1 (lasso)**.
- **Kekuatan penalti λ (skala log)** berjalan dari 0,00001 sampai 10 dan dimulai di 0,00001. Dengan keyboard, fokuskan plot lalu tekan panah kiri dan kanan untuk mengubahnya.
- **Derajat polinomial** (1 sampai 12; mulai di 9) menentukan berapa banyak pangkat x yang dipakai model. Pada plot, panah atas dan bawah mengubahnya.
- **Noise** (0 sampai 1,5; mulai di 0,5) adalah sebaran titik buatan di sekitar kurva.
- **Titik training (dari 42)** (6 sampai 42; mulai di 15) menentukan berapa banyak titik bulat yang dipelajari model. Ke-18 titik silang validasi tetap sama.
- **Tampilkan fit tanpa regularisasi** (aktif di awal) menggambar fit λ = 0 sebagai garis hitam samar dan sebagai garis luar putus-putus pada batang koefisien.
- **Tampilan learning curve** (nonaktif di awal) menukar grafik error terhadap λ dengan error terhadap jumlah titik training.
- **Sampel baru** mengambil titik buatan yang baru, atau satu set penguin acak yang baru, dan menghapus prediksimu.
- **Cek prediksiku** menampilkan seluruh garis validasi dan melingkari λ terbaik. **Ke λ terbaik** memindahkan slider ke sana; tombol ini tetap nonaktif sampai kamu sudah mengecek.
- **Reset** mengembalikan ke data buatan, **L2 (ridge)**, λ = 0,00001, derajat 9, noise 0,5, 15 titik training, sampel bawaan, kedua toggle seperti di awal, dan prediksi yang dikosongkan.
- **Kuis Cepat** adalah tombol di bawah kartu Pengaturan (tombol di bawah kartu pengaturan (tombol bulat di kanan bawah pada ponsel) pada ponsel). Kotaknya bertanya "Saat λ membesar dari nilai terkecilnya, apa yang pertama terjadi pada validation error?" dengan jawaban "Turun dulu, lalu naik lagi", "Langsung naik", dan "Terus turun". Pilih satu, lalu tekan **Periksa jawaban** atau **Cek prediksiku**.

### Yang kamu lihat
- Plot menampilkan titik bulat **Training**, titik silang **Validasi**, **Kurva asli** (hanya data buatan), **Kurva hasil fit**, dan, selama toggle aktif, garis **Tanpa regularisasi (λ = 0)**.
- Kalimat status berbunyi, misalnya, "L2 (ridge), λ = 0,00001: training error 0,11, validation error 3,84." Setelah kamu mengecek, ditambahkan "Di bawah λ terbaik: masih terlalu fleksibel.", "Dekat λ terbaik." atau "Di atas λ terbaik: terlalu kaku."
- Baris rincian menampilkan validation error terendah ("disembunyikan sampai prediksimu dicek" di awal), **Koefisien terbesar**, berapa koefisien yang "Tepat 0", dan jumlah titik training dan validasi. Dengan data nyata, baris ini juga menyebut rata-rata meleset dalam gram.
- **Koefisien pada λ ini** punya satu batang untuk setiap koefisien pada skala terstandar. Cincin di garis nol menandai koefisien yang **Tepat 0**. Garis luar putus-putus adalah nilai **Tanpa regularisasi**, dipotong dengan segitiga di tempat yang lebih tinggi daripada grafik. Sumbu vertikal menyesuaikan diri dengan batang terbesar, jadi bandingkan angka di baris rincian, bukan tinggi batang. Batang diberi label **Pangkat k dari x**; dengan data nyata, batang dikelompokkan menurut **Panjang flipper**, **Panjang paruh**, dan **Kedalaman paruh**.
- **Training error dan validation error terhadap λ** menampilkan **Training error** dan **Validation error** terhadap **log10 λ (kekuatan penalti)**, dalam **Mean squared error**. Garis putus-putus adalah **λ-mu**, dan sebuah titik pada setiap garis menunjukkan error di sana. Sebelum kamu mengecek, garis validasi berhenti pada λ terbesar yang sudah kamu coba. Sesudahnya, λ terbaik dilingkari dan diberi label, misalnya **λ terbaik: 0,010**. Segitiga di bagian atas berarti error lebih tinggi daripada yang ditampilkan grafik.
- Pada **Tampilan learning curve**, grafiknya adalah **Training error dan validation error terhadap jumlah titik training**, dengan **Titik training** di sepanjang bawah. Grafik ini merata-ratakan 6 pembagian acak pada λ-mu; garis putus-putus berlabel **milikmu** adalah jumlah titik training yang kamu pilih. Selama menghitung, tertulis **Sedang menghitung…**.
- Di bawah kontrol, sebuah catatan menyebutkan data mana yang dipakai dan bagaimana data itu disiapkan.

### Percobaan
Tekan **Reset** sebelum setiap percobaan, supaya angkamu sama dengan sampel bawaan.

1. **Temukan dasar bentuk U.** Prediksi: di kotak Kuis Cepat, pilih apa yang pertama terjadi pada validation error saat λ membesar. Lalu seret **Kekuatan penalti λ (skala log)** ke kanan dan baca kalimat status. Pada 0,00001, training error 0,11 dan validation error 3,84; pada 0,001, keduanya 0,21 dan 0,48; pada 0,01, 0,29 dan 0,48; pada 0,1, 0,55 dan 0,93; pada 10, 1,41 dan 2,85. Tekan **Cek prediksiku**, lalu **Ke λ terbaik**: slider mendarat di 0,010. Mengapa training error hanya naik, sedangkan validation error turun lalu naik? Sisi mana yang overfitting, dan sisi mana yang underfitting?
2. **Amati ridge mengecilkan koefisien.** Prediksi: dengan **L2 (ridge)**, apakah ada koefisien yang mencapai tepat 0 saat λ membesar, dan apa yang terjadi pada yang terbesar? Atur λ ke 0,00001, 0,01, 1, dan 10, lalu baca baris rincian: koefisien terbesarnya 14,81, 2,61, 0,38, dan 0,07, dan setiap kali tertulis "Tepat 0: 0 dari 9". Pada 0,00001, garis luar putus-putus untuk fit tanpa regularisasi dipotong dengan segitiga. Jelaskan mengapa batang tampak sama besar di setiap λ padahal angkanya turun.
3. **Pindah ke lasso.** Prediksi: dengan **L1 (lasso)** pada λ = 0,01, berapa dari sembilan koefisien yang tepat 0, dan seperti apa kurvanya pada λ = 1? Ubah **Penalti** menjadi **L1 (lasso)**. Pada 0,01, baris rincian menulis "Tepat 0: 4 dari 9" (training 0,23, validasi 0,49) dan cincin menandai pangkat 5 sampai 8. Pada 1 tertulis 8 dari 9 dan kurva hasil fit berupa garis lurus. Pada λ = 2,5 tertulis 9 dari 9, sebuah garis datar. Lalu tekan **Cek prediksiku** dan **Ke λ terbaik**: λ lasso terbaik adalah 0,025, dengan validation error 0,44, dibandingkan 0,48 untuk ridge pada 0,010. Apakah itu cukup untuk menyimpulkan lasso lebih baik?
4. **Model yang tidak memerlukan penalti.** Prediksi: jika kamu mengatur **Derajat polinomial** ke 3, apakah validation error masih turun lalu naik? Atur ke 3 dan baca error pada λ = 0,00001 (0,34 dan 0,40), 0,01 (0,35 dan 0,50), dan 10 (1,45 dan 2,84). Tekan **Cek prediksiku**: kotak Kuis Cepat menyatakan tidak ada penalti yang membantu. Sekarang atur derajat ke 12: pada 0,00001 validation error-nya 4,90; pada λ terbaik, 0,0010, nilainya 0,45. Pada λ = 0,01 error derajat 12 adalah 0,29 dan 0,48, sama dengan derajat 9. Apa yang dilakukan penalti, yang sebelumnya dilakukan derajat?
5. **Data lebih sedikit, penalti lebih besar.** Prediksi: dengan hanya 8 titik training, apakah penalti membantu lebih banyak atau lebih sedikit daripada dengan 15? Atur **Titik training (dari 42)** ke 8. Pada λ = 0,00001 validation error-nya 30,43 dan training error-nya 0,01. Tekan **Cek prediksiku** dan **Ke λ terbaik**: λ = 0,025, validasi 0,71. Atur ke 42: λ terkecil memberi 0,33, dan λ terbaik, 0,00016, memberi 0,32. Lalu tekan **Reset**, **Cek prediksiku**, **Ke λ terbaik**, dan aktifkan **Tampilan learning curve**: pada λ = 0,01 garis validasi dimulai jauh di atas garis training, dan keduanya bertemu di sekitar 0,47 dan 0,34 pada 42 titik. Jelaskan dengan varians.
6. **Penguin dan sampel baru.** Prediksi: pada penguin yang asli, apakah validation error masih turun lalu naik, dan apakah λ terbaiknya sama dengan data buatan? Ubah **Data** menjadi **Penguin (data nyata)**. Pada λ = 0,00001, validation error-nya 40,42, rata-rata meleset sekitar 2.289 g. Tekan **Cek prediksiku** dan **Ke λ terbaik**: λ = 1,6, validasi 1,84, sekitar 488 g. Ubah **Penalti** ke **L1 (lasso)** dan ulangi: λ = 1,0, validasi 1,49, 25 dari 27 koefisien tepat 0. Sekarang kembalikan **Penalti** ke **L2 (ridge)** dan tekan **Sampel baru** tiga kali, dengan mengecek setiap kali. λ terbaiknya 0,063, 0,10, dan 0,025. Apa yang tetap sama di keempat sampel, dan apa yang berubah?
