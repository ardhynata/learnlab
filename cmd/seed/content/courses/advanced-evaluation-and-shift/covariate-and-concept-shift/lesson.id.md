---
slug: covariate-and-concept-shift
title: Covariate shift dan concept shift
---
::: intro
- Sebutkan tiga jenis dataset shift (covariate, label, dan concept) menurut apa yang bergeser: input, proporsi kelas, atau hubungan antara keduanya.
- Hitung dengan tangan bagaimana tiap jenis menurunkan skor model yang sudah dipakai, lalu deteksi shift dengan population stability index dan sebuah classifier yang membedakan baris lama dari baris baru.
- Tentukan setup validasi mana yang mengantisipasi shift mana, lalu pilih antara memantau, memberi bobot ulang, dan melatih ulang.

Sebelum mulai: baca "Nested cross-validation", "Grouped and temporal splits", dan "Conditional probability and Bayes' rule". Dua pelajaran pertama memberimu skor yang jujur dari data yang kamu punya. Yang ketiga menunjukkan bahwa sebuah tes skrining berarti lain pada base rate yang lain (porsi orang yang memang sakit). Pelajaran ini bertanya apa yang terjadi pada skor itu setelah datanya bergeser.
:::

## Tiga cara data bergeser
*Apa artinya data baru berbeda dari data yang dipakai untuk melatih model?*

Setiap skor yang jujur sejauh ini, baik dari test set maupun dari cross-validation, bersandar pada satu janji: baris yang kelak ditemui model berasal dari sumber yang sama dengan baris tempat ia belajar. Setelah model dipakai, janji itu dapat patah. Kelompok pelanggan baru datang, sebuah sensor diganti, sebuah aturan berubah. Inilah **dataset shift**.

Sebuah baris punya input x dan label y. Ada tiga hal yang dapat bergeser.

- Komposisi input, P(x). Ini **covariate shift**.
- Proporsi kelas, P(y). Ini **label shift**, disebut juga prior shift.
- Hubungan yang sedang dipelajari model, P(y given x). Ini **concept shift**.

Pelajaran ini mengikuti satu contoh rekaan: sebuah layanan streaming memprediksi apakah pelanggan berhenti berlangganan bulan depan (y) dari jumlah jam menonton per minggu (x). Shift di dunia nyata sering kali campuran ketiganya, tetapi menyebut jenis yang utama memberi tahu apa yang perlu diperiksa dan perbaikan mana yang dapat berhasil.

[[figure:covariate-and-concept-shift/three-shifts|Data training di sebelah kiri dan data baru di sebelah kanan pada tiap panel. Titik penuh dan cincin adalah dua kelas, dan garis putus-putus menunjukkan batas pemisahnya.]]

## Covariate shift: input yang baru
*Apa yang terjadi bila input berubah tetapi hubungannya tidak?*

Pada **covariate shift**, P(x) berubah sedangkan P(y given x) tetap. Dunia mengikuti aturan yang sama, tetapi orang yang datang berbeda. Misalkan layanan itu dibangun untuk penonton berat, lalu sebuah promosi mendatangkan banyak penonton ringan. Hubungan antara jam menonton dan berhenti berlangganan masih sama, tetapi model mempelajarinya terutama dari penonton berat, sehingga ia lebih lemah pada penonton ringan.

> Contoh hitungan: akurasi model adalah 60% untuk penonton di bawah 2 jam per minggu, 80% untuk 2 sampai 6 jam, dan 95% untuk di atas 6 jam. Test set mencerminkan komposisi training sebesar 10%, 30%, dan 60% penonton. Akurasinya 0,10 x 0,60 + 0,30 x 0,80 + 0,60 x 0,95 = 0,06 + 0,24 + 0,57 = 0,87. Setelah promosi, komposisinya 60%, 30%, dan 10%: 0,36 + 0,24 + 0,095 = 0,695.

Akurasi turun dari 87% menjadi 69,5%, padahal tidak ada wilayah yang memburuk. Yang bergeser hanya komposisinya.

[[figure:covariate-and-concept-shift/covariate-accuracy|Model yang sama dengan akurasi yang sama di tiap wilayah jam menonton per minggu. Hanya porsi penonton di setiap wilayah yang berubah, dan akurasi keseluruhan mengikutinya.]]

> Gagasan kunci: covariate shift merugikan karena model tidak sempurna di suatu tempat, dan shift mengirim lebih banyak kasus ke sana. Model yang sama bagusnya di setiap wilayah tidak akan merasakannya.

## Label shift: proporsi kelas yang baru
*Apa yang terjadi bila proporsi kelas berubah tetapi tampilan tiap kelas sama?*

Pada **label shift**, P(y) berubah sedangkan P(x given y), yaitu tampilan tiap kelas, tetap sama. Kembali ke tes skrining dari "Conditional probability and Bayes' rule": tes itu menandai 90% orang yang sakit dan 5% orang yang sehat. Misalkan tes itu diuji di klinik rujukan tempat 20% orang sakit, lalu dipakai pada check-up warga tempat 2% yang sakit.

Laju penandaan tidak berubah, karena orang sakit dan orang sehat tampak seperti sebelumnya. Yang berubah adalah arti sebuah tanda. Dari 1.000 orang, klinik rujukan memiliki 180 orang sakit dan 40 orang sehat yang ditandai, sehingga precision-nya, yaitu porsi orang yang ditandai dan memang sakit, adalah 180 / 220 = 0,82. Pada warga, ada 18 orang sakit dan 49 orang sehat yang ditandai, sehingga precision-nya 18 / 67 = 0,27.

Kamu dapat mengoreksi hitungan lama tanpa satu label baru pun, asalkan tahu proporsi yang baru. Kalikan tiap kelas dengan porsi barunya dibagi porsi lamanya: yang sakit dengan 0,02 / 0,20 = 0,1 dan yang sehat dengan 0,98 / 0,80 = 1,225. Maka 180 x 0,1 = 18 dan 40 x 1,225 = 49.

[[figure:covariate-and-concept-shift/prior-correction|Orang yang ditandai di klinik rujukan, diskalakan ulang kelas demi kelas ke base rate warga. Precision turun dari 0,82 menjadi 0,27.]]

> Awas: akurasi dapat menyembunyikan label shift. Tes itu benar pada 94% orang di klinik dan 94,9% di warga, sementara precision merosot. Lihatlah precision, dan juga probabilitas yang dikeluarkan model, yang kini terlalu tinggi.

## Concept shift: arti yang baru
*Apa yang terjadi bila input yang sama kini berujung pada hasil yang berbeda?*

Pada **concept shift**, P(y given x) berubah, walaupun input tampak persis seperti sebelumnya. Ambil 100 pelanggan, 50 penonton ringan dan 50 penonton berat, dengan model yang menjawab "berhenti" untuk penonton ringan dan "bertahan" untuk penonton berat. Lalu seorang pesaing meluncurkan paket bundel yang menggoda penonton berat, sementara paket murah milik layanan itu sendiri menahan penonton ringan.

| Periode | Penonton ringan yang berhenti | Penonton berat yang berhenti | Model benar | Akurasi |
| --- | --- | --- | --- | --- |
| Sebelum | 40 dari 50 | 5 dari 50 | 40 + 45 = 85 | 85% |
| Sesudah | 30 dari 50 | 20 dari 50 | 30 + 30 = 60 | 60% |

Model benar pada penonton ringan yang berhenti dan pada penonton berat yang bertahan. Inputnya tidak bergeser: tetap 50 penonton ringan dan 50 penonton berat. Laju berhenti secara keseluruhan nyaris tidak berubah juga, dari 45% menjadi 50%. Membandingkan input tidak menunjukkan apa-apa, begitu pula melirik angka totalnya.

> Awas: concept shift tidak terlihat tanpa label. Hanya membandingkan prediksi dengan apa yang sungguh terjadi yang membongkarnya, dan sebuah pembatalan baru diketahui sebulan kemudian.

::: deeper Mendadak, bertahap, dan musiman
Sebuah shift punya bentuk dalam waktu. Ia dapat mendadak (paket bundel pesaing meluncur pada satu hari), bertahap (kebiasaan berubah pelan-pelan), atau berulang (pekan liburan, lalu kembali normal). Bentuknya menentukan respons. Shift mendadak membutuhkan alarm dan retraining cepat. Shift bertahap paling mudah ditangkap dengan perbandingan bergulir terhadap periode training. Shift berulang lebih baik ditangani dengan memberi model musimnya sebagai fitur daripada melatih ulang tiap kuartal.
:::

## Mendeteksi shift
*Bagaimana kamu menyadari shift sebelum keluhan berdatangan?*

Ada tiga alat, dari yang murah sampai yang mahal.

**1. Bandingkan distribusi fitur.** Potong tiap fitur menjadi bin, lalu bandingkan porsi baris per bin pada training dengan porsi pada data terbaru. **Population stability index (PSI)** menjumlahkan (porsi baru dikurangi porsi lama) x ln(porsi baru / porsi lama) di seluruh bin.

> Contoh hitungan: jam menonton, bin di bawah 2, 2 sampai 6, dan di atas 6. Porsi training 0,10, 0,30, dan 0,60, porsi saat promosi 0,60, 0,30, dan 0,10. Suku-sukunya adalah (0,60 - 0,10) x ln 6 = 0,896, lalu 0 untuk bin tengah, lalu (0,10 - 0,60) x ln(1/6) = 0,896. PSI = 1,79. Aturan praktis yang umum membaca di bawah 0,1 sebagai kecil, 0,1 sampai 0,25 sebagai sedang, dan di atas 0,25 sebagai besar.

**2. Latih classifier untuk membedakan lama dari baru.** Beri baris training label 0 dan baris baru label 1, lalu latih classifier apa saja. Ukur skornya pada baris yang ditahan. AUC (luas di bawah kurva ROC; 0,5 berarti menebak) yang mendekati 0,5 berarti ia tidak dapat membedakan keduanya. Aturan "di bawah 2 jam berarti baru" benar pada 60 dari 100 baris baru dan 90 dari 100 baris lama, yaitu 150 dari 200, atau 75% dibandingkan 50% untuk tebakan.

**3. Pantau hasil nyata.** Begitu label tiba, lacak akurasi, precision, dan porsi prediksi positif. Inilah satu-satunya alat yang melihat concept shift.

::: deeper Apa yang memengaruhi PSI
PSI bergantung pada cara kamu memotong bin. Sepuluh bin yang dipotong pada kuantil data training adalah pilihan yang lazim. Bin kosong membuat logaritma meledak, sehingga orang menambahkan konstanta kecil ke setiap porsi. PSI mengukur seberapa jauh satu fitur bergeser. Ia bukan uji dengan p-value, dan batas-batas di atas hanyalah konvensi.
:::

## Validasi mana yang mengantisipasi shift mana
*Skor uji mana yang akan memperingatkanmu?*

**Split acak** tidak mengantisipasi satu pun dari ketiganya. Baris uji diambil dari kumpulan yang sama dengan baris latih, sehingga membawa input, proporsi, dan hubungan yang sama. Itu sebabnya skornya adalah skor "sebelum": 87% di atas.

**Grouped split** mengantisipasi shift karena bertemu kelompok baru, misalnya rumah sakit yang belum pernah dilihat model. **Temporal split** mengantisipasi drift yang terjadi selama periode yang kamu kumpulkan, dan rolling origin (temporal split berulang yang menggeser batas waktunya maju) memperlihatkan seberapa cepat skornya meluruh. Keduanya hanya mengantisipasi shift yang ada di suatu tempat dalam datamu.

**Uji out-of-distribution** melangkah lebih jauh. Kamu membangun test set dari tempat training tipis atau tidak ada: penonton paling ringan, perangkat baru, musim paling langka. Pada contoh ini, tes acak berkata 87% sedangkan irisan di bawah 2 jam berkata 60%. Selisih itu adalah peringatannya, diberikan sebelum promosi. Gagasan yang sama berlaku untuk proporsi kelas: bangun stress set dengan campuran pelanggan yang berhenti dan bertahan yang berbeda.

[[figure:covariate-and-concept-shift/which-validation|Setup validasi mana yang dapat memperlihatkan tiap jenis shift. Sebagian berarti hanya bila shift itu sudah muncul di antara kelompok atau rentang waktu data yang kamu kumpulkan.]]

Out-of-distribution juga berlaku per baris. Tabel penguin memiliki panjang sirip 172 sampai 231 mm. Baris dengan 300 mm berada di luar yang pernah dilihat model, jadi tandailah ia, jangan percaya begitu saja pada jawabannya.

## Menanggapi shift
*Setelah kamu melihat shift, apa saja pilihanmu?*

Ada tiga respons, dan jenis shift menentukan pilihannya.

**Pantau.** Hitung PSI per fitur tiap pekan, lacak porsi prediksi positif, dan ukur hasil nyata saat label tiba. Simpan sampel kecil berlabel yang terbaru untuk keperluan ini.

**Beri bobot ulang.** Untuk covariate shift, beri tiap baris lama bobot porsi baru / porsi lama di wilayahnya: 0,60 / 0,10 = 6 untuk di bawah 2 jam, 1 untuk yang tengah, dan 0,10 / 0,60 = 1/6 untuk di atas 6 jam. Ambil 100 baris validasi lama, 10, 30, dan 60 per wilayah, dengan 6, 24, dan 57 yang benar. Jumlah benar berbobotnya 6 x 6 + 24 + 57 / 6 = 69,5 dari total bobot 60 + 30 + 10 = 100: 69,5%, angka yang sama seperti tadi, tanpa label baru. Label shift memakai bobot kelas dari bagian sebelumnya. Bobot ulang membutuhkan baris lama di setiap wilayah yang dikunjungi data baru, dan bobot 6 bertumpu pada hanya 10 baris.

**Latih ulang.** Concept shift membutuhkan baris berlabel yang segar, karena baris lama mengajarkan hubungan yang lama. Latih pada data terbaru, dan nilai model barunya dengan temporal split.

> Gagasan kunci: bobot ulang memperbaiki tentang siapa datanya. Ia tidak dapat memperbaiki arti label.

## Sebelum lab
*Apa yang akan kamu coba di Shift lab?*

Pelajaran berikutnya adalah Shift lab, yang terakhir di course ini. Di sana kamu memperkenalkan satu jenis shift pada satu waktu dan mengukur setup validasi mana yang mengantisipasi penurunan performa. Itu adalah tabel validasi mana-mengantisipasi-shift-mana yang diubah menjadi eksperimen.

Sebelum membukanya, tuliskan dua tebakan. Untuk covariate shift, mana di antara split acak, grouped, dan temporal yang paling dekat dengan skor setelah shift? Untuk concept shift, adakah yang dekat? Lalu periksa tebakanmu dengan apa yang diperlihatkan lab.

::: remember
- Shift adalah perubahan pada P(x), P(y), atau P(y given x): covariate, label, dan concept shift. Masing-masing menurunkan skor model yang sudah dipakai dengan caranya sendiri, dan akurasi saja dapat menyembunyikannya.
- Bandingkan distribusi fitur dengan PSI, latih classifier untuk membedakan baris lama dari baru, dan pantau hasil nyata: hanya hasil nyata yang mengungkap concept shift.
- Split acak tidak mengantisipasi shift apa pun. Uji grouped, temporal, dan out-of-distribution mengantisipasi sebagian. Pantau dahulu, beri bobot ulang untuk covariate dan label shift, dan latih ulang untuk concept shift.
:::
