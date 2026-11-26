---
slug: confounding-and-treatment-effects
title: Confounding dan efek perlakuan
---
::: intro
- Jelaskan apa itu confounding, dan mengapa model yang memprediksi dengan baik tetap dapat memberi jawaban yang salah atas pertanyaan "bagaimana kalau kita mengubahnya".
- Hitung average treatment effect dan efek untuk subgroup yang disebut namanya dengan stratification pada tabel kecil, serta kenali regression adjustment dan inverse-propensity weighting sebagai cara koreksi lainnya.
- Sebutkan asumsi yang menopang estimasi observasional, variabel yang tidak boleh dikoreksi (collider dan variabel pasca-perlakuan), dan apa yang diberikan eksperimen acak yang tidak dapat diberikan koreksi statistik.

Sebelum mulai: baca "Eksperimen acak dan power" di kursus ini dan "Probabilitas bersyarat dan aturan Bayes" (angka proporsi di dalam sebuah kelompok).
:::

## Memprediksi tidak sama dengan mengubah
*Mengapa model yang memprediksi dengan baik tetap dapat salah menjawab "bagaimana kalau kita mengubahnya"?*

Bayangkan sebuah rumah sakit rekaan dengan 1.000 pasien dan satu obat baru. Dokter memberikan obat itu terutama kepada pasien yang sakitnya parah. Dari 500 pasien yang mendapat obat, 350 pulih, yaitu 0,70. Dari 500 pasien yang tidak mendapatnya, 370 pulih, yaitu 0,74.

Model yang hanya melihat "mendapat obat" akan belajar bahwa obat berkaitan dengan pemulihan yang lebih rendah. Sebagai prediksi untuk rumah sakit ini, itu benar, selama dokter tetap meresepkan dengan cara yang sama: jika kamu diberi tahu bahwa seorang pasien mendapat obat, perkirakan 0,70 yang akan pulih.

Namun seorang dokter bertanya hal lain: "kalau saya memberi pasien ini obat, apakah peluang pulihnya naik?" Itu pertanyaan tentang apa yang terjadi ketika perlakuannya **diubah**, dan angka yang sama tidak dapat menjawabnya. Angka itu membandingkan dua kelompok yang sudah berbeda sebelum obat apa pun diberikan.

> Gagasan kunci: prediksi menjawab "apa yang kita harapkan terlihat, mengingat apa yang sudah kita lihat?". Pertanyaan kausal menjawab "apa yang terjadi kalau kita menetapkannya?". Keduanya hanya sejalan bila tidak ada hal lain yang mendorong perlakuan dan hasil sekaligus.

## Confounding: penyebab bersama
*Apa yang membuat kelompok yang diobati dan yang tidak sudah berbeda sebelum perlakuan?*

**Confounder** adalah variabel yang mendorong siapa yang mendapat perlakuan sekaligus hasilnya. Di sini variabelnya adalah tingkat keparahan. Di antara 500 pasien yang sakitnya parah, 400 mendapat obat, yaitu 0,8. Di antara 500 pasien yang sakitnya ringan, hanya 100 yang mendapatnya, yaitu 0,2. Pasien parah juga lebih jarang pulih, apa pun yang diberikan kepada mereka.

Karena itu kelompok yang diobati sebagian besar berisi pasien yang sakit parah, dan kelompok yang tidak diobati sebagian besar pasien ringan. Obat yang menolong semua orang pun dapat tampak merugikan bila orang yang memakainya sudah lebih buruk keadaannya sejak awal. Distorsi ini disebut **confounding bias**.

[[figure:confounding-and-treatment-effects/common-cause|Tingkat keparahan menunjuk ke obat sekaligus ke pemulihan. Tanda tanya adalah efek obat itu sendiri, yang ingin kita pisahkan.]]

Confounder harus datang sebelum perlakuan. Dokter melihat tingkat keparahan lebih dulu baru memutuskan, sehingga keparahan dapat memengaruhi pilihannya. Pada data, panah dari obat ke pemulihan bercampur dengan jalur lewat tingkat keparahan, dan keduanya tidak dapat dibedakan tanpa kerja tambahan.

## Efek perlakuan: apa yang ingin kita ketahui
*Apa artinya mengatakan sebuah obat "berhasil"?*

Setiap pasien punya dua kemungkinan hasil: pulih bila diberi obat, dan pulih bila tidak. Keduanya disebut **potential outcomes**. Kita hanya melihat salah satunya, karena seorang pasien mendapat obat atau tidak. Yang satunya adalah **counterfactual**, yang tidak pernah teramati.

**Efek untuk satu pasien** adalah selisih keduanya, dan tidak pernah dapat dilihat langsung. Karena itu kita merata-ratakan. **Average treatment effect** (ATE) adalah rata-rata hasil bila semua orang diberi perlakuan dikurangi rata-rata hasil bila tidak seorang pun diberi. Dengan hasil ya atau tidak, rata-ratanya adalah tingkat pemulihan, sehingga ATE adalah selisih dua tingkat.

**Efek untuk sebuah subgroup** adalah rata-rata yang sama, tetapi dihitung di dalam satu kelompok yang disebut namanya, misalnya hanya pasien yang sakit parah. Efeknya dapat berbeda antarkelompok, dan rata-rata dapat menyembunyikan hal itu. Pada tabel di bagian berikutnya, obat menambah 0,10 untuk pasien ringan dan 0,15 untuk pasien parah.

> Awas: ATE adalah efek rata-rata pada sebuah populasi, bukan apa yang dilakukan obat pada setiap orang. ATE yang positif dapat berdampingan dengan subgroup tempat obat tidak berpengaruh, karena itu laporkan subgroup yang memang punya alasan untuk disebut.

## Koreksi dengan stratification
*Bagaimana membandingkan yang setara dengan yang setara?*

**Stratification** membagi pasien ke dalam kelompok, atau strata, yang sama pada confounder, membandingkan yang diobati dengan yang tidak di dalam masing-masing strata, lalu merata-ratakan hasil perbandingannya. Berikut hitungan rumah sakit rekaan tadi.

| Keparahan | Diobati: pulih | Tidak diobati: pulih | Selisih |
| --- | --- | --- | --- |
| Ringan | 90 dari 100 = 0,90 | 320 dari 400 = 0,80 | +0,10 |
| Parah | 260 dari 400 = 0,65 | 50 dari 100 = 0,50 | +0,15 |
| Semua pasien | 350 dari 500 = 0,70 | 370 dari 500 = 0,74 | -0,04 |

Baris terakhir adalah perbandingan naif, dan arahnya keliru. Di dalam setiap strata, obat itu menolong. Tiap strata berisi 500 dari 1.000 pasien, sehingga masing-masing diberi bobot 0,5.

> Contoh hitungan: ATE = 0,5 × 0,10 + 0,5 × 0,15 = 0,05 + 0,075 = 0,125. Obat menaikkan peluang pulih sebesar 0,125, sekitar 12,5 poin persentase, walaupun angka mentahnya tampak berlawanan. Hasil yang berbalik arah ketika dipecah menjadi kelompok disebut **paradoks Simpson**.

[[figure:confounding-and-treatment-effects/two-strata|Tingkat pemulihan menurut kelompok: obat tampak lebih buruk secara keseluruhan, dan lebih baik di dalam kedua strata keparahan.]]

## Regression adjustment dan inverse-propensity weighting
*Apa yang dilakukan bila variabelnya terlalu banyak untuk di-stratify?*

Men-stratify 10 variabel ya atau tidak menghasilkan 2^10 = 1.024 sel, dan banyak yang kosong atau sangat kecil. Dua alat lain dapat menangani banyak variabel.

**Regression adjustment** menyusun model hasil dari perlakuan dan para confounder, misalnya pulih ≈ a + b × diobati + c × parah. Koefisien b adalah efek yang sudah dikoreksi: selisih yang dibuat perlakuan ketika tingkat keparahan ditahan tetap. Pada tabel ini, least squares memberi b = 0,125, sama dengan stratification. Kesamaan itu datang dari simetri tabel ini, bukan dari aturan umum.

**Inverse-propensity weighting** (IPW) lebih dulu memperkirakan **propensity score**, yaitu probabilitas mendapat perlakuan bila diketahui confounder-nya. Di sini nilainya 0,2 untuk pasien ringan dan 0,8 untuk pasien parah. Setiap pasien lalu diberi bobot 1 dibagi probabilitas perlakuan yang benar-benar ia terima, sehingga kombinasi yang jarang dihitung lebih berat. Pada data berbobot, tingkat keparahan tidak lagi meramalkan siapa yang diobati, dan selisih rata-rata berbobot memperkirakan ATE.

::: deeper Bobot inverse-propensity dengan tangan
Pasien ringan yang diobati punya probabilitas perlakuan 0,2, sehingga masing-masing diberi bobot 1 / 0,2 = 5. Pasien parah yang diobati mendapat 1 / 0,8 = 1,25, pasien ringan yang tidak diobati 1 / 0,8 = 1,25, dan pasien parah yang tidak diobati 1 / 0,2 = 5. Jumlah pemulihan berbobot bila semua orang diobati adalah 90 × 5 + 260 × 1,25 = 450 + 325 = 775, dan 775 / 1.000 = 0,775. Bila tidak seorang pun diobati, hasilnya 320 × 1,25 + 50 × 5 = 400 + 250 = 650, dan 650 / 1.000 = 0,65. ATE-nya 0,775 - 0,65 = 0,125 lagi.
:::

::: deeper Hasil regresi pada tabel ini
Least squares pada 1.000 pasien memberi pulih ≈ 0,795 + 0,125 × diobati - 0,275 × parah. Koefisien 0,125 adalah efek yang sudah dikoreksi. Tingkat pemulihan hasil model adalah 0,795 (ringan, tidak diobati), 0,92 (ringan, diobati), 0,52 (parah, tidak diobati) dan 0,645 (parah, diobati). Angka itu dekat dengan hasil pengamatan 0,80, 0,90, 0,50 dan 0,65, tetapi tidak sama, karena model ini memaksa satu efek untuk kedua strata sementara data menunjukkan 0,10 dan 0,15.
:::

## Yang tidak dapat diberitahukan oleh data
*Pada asumsi apa estimasi yang sudah dikoreksi bertumpu?*

Dua asumsi berada di bawah setiap estimasi yang dikoreksi, dan tidak ada uji pada data yang dapat memastikannya.

**Tidak ada confounder yang tidak terukur.** Setiap variabel yang mendorong perlakuan dan hasil sekaligus harus termasuk di antara variabel yang kamu koreksi. Misalkan dokter juga mengobati pasien yang mereka anggap lemah, dan kelemahan itu tidak ada di catatan. Mengoreksi tingkat keparahan tidak dapat menghilangkannya. Data tidak dapat memperingatkanmu, karena variabel yang tidak dicatat memang tidak ada di dalamnya. Kamu berargumen dari cara perlakuan itu benar-benar diputuskan, dan bertanya kepada orang yang memutuskannya.

**Overlap.** Di dalam setiap strata harus ada pasien yang diobati maupun yang tidak. Bila setiap pasien parah mendapat obat, sel "parah, tidak diobati" berisi 0 dari 0, dan efek untuk pasien parah tidak dapat dihitung. Kamu dapat menghitung sel untuk variabel yang kamu catat. Model yang fleksibel menyembunyikan celah itu dengan melakukan ekstrapolasi.

> Awas: koreksi yang cermat hanya menghilangkan confounding yang kamu koreksi. Estimasinya tampak sama presisinya ketika ada confounder tidak terukur yang masih membiasnya.

## Apa yang tidak boleh dikoreksi
*Apakah mengoreksi lebih banyak variabel selalu lebih baik?*

Tidak. Koreksilah variabel yang diukur sebelum perlakuan dan yang mendorong perlakuan serta hasil. Dua jenis variabel sebaiknya dibiarkan.

**Variabel pasca-perlakuan** adalah sesuatu yang diubah oleh perlakuan, seperti tekanan darah yang diukur setelah obat. Bila obat bekerja dengan menurunkannya, mengoreksi variabel itu menghilangkan efek yang justru ingin kamu ukur.

**Collider** adalah variabel yang disebabkan oleh perlakuan dan hasil sekaligus. Mengoreksinya, atau membatasi data pada salah satu nilainya, menciptakan hubungan yang sebelumnya tidak ada.

[[figure:confounding-and-treatment-effects/what-to-adjust|Tiga peran. Koreksilah confounder. Jangan koreksi variabel pasca-perlakuan atau collider.]]

> Contoh hitungan: uji untuk obat yang tidak berpengaruh apa pun, dengan 400 pasien: 200 diobati dan 200 tidak, dan 100 pulih di setiap kelompok, yaitu 0,50 melawan 0,50. Klinik menindaklanjuti setiap pasien yang diobati, dan pasien yang tidak diobati hanya bila masih sakit. Pasien yang ditindaklanjuti: 200 diobati, 100 di antaranya pulih, yaitu 0,50, dan 100 tidak diobati, 0 di antaranya pulih, yaitu 0,00. Bila hanya mereka yang dilihat, ada selisih 0,50 padahal efek sebenarnya 0. Angkanya rekaan dan sengaja dibuat ekstrem.

Jangan mengoreksi suatu variabel hanya karena ia memprediksi hasil. Tanyakan apakah ia sudah tetap sebelum perlakuan dan apakah ia memengaruhi siapa yang mendapat perlakuan.

## Observasional dan eksperimen acak
*Bagaimana mengetahui apakah estimasi yang sudah dikoreksi dapat dipercaya?*

Eksperimen acak memutus hubungan antara tingkat keparahan dan perlakuan, karena lemparan koin yang menentukan siapa yang mendapat obat. Ambil uji baru dengan 800 pasien: 400 diobati dan 400 kontrol, dengan sekitar 200 pasien ringan dan 200 pasien parah di setiap kelompok. Kedua kelompok lalu memiliki campuran tingkat keparahan yang sama, sehingga selisih sederhana tingkat pemulihan, tanpa koreksi apa pun, adalah efeknya: 0,775 untuk yang diobati melawan 0,65 untuk kontrol, yaitu 0,125. Uji yang sungguhan akan mendarat di dekat angka-angka ini, tidak persis di atasnya, karena derau sampling.

::: deeper Perkiraan pemulihan pada uji tersebut
Perkiraan jumlah pasien pulih adalah 200 × 0,90 + 200 × 0,65 = 310 dari 400 = 0,775 untuk yang diobati dan 200 × 0,80 + 200 × 0,50 = 260 dari 400 = 0,65 untuk kontrol. Selisihnya 0,775 - 0,65 = 0,125, sama dengan ATE hasil stratification.
:::

Bila koreksi yang cermat dan sebuah eksperimen tidak sepakat, percayalah pada eksperimen dan carilah asumsi yang gagal: confounder yang tidak terukur, atau celah pada overlap.

> Gagasan kunci: model prediksi bukan model kausal. Koefisien dan importance-nya, termasuk permutation importance dan nilai SHAP, menggambarkan cara model memakai data, yang mencakup cara dokter memilih meresepkan. Semuanya tidak memberi tahu apa yang terjadi bila sebuah feature diubah.

Di Causal lab, pelajaran terakhir kursus ini, kamu membuat data yang mengandung confounding lalu membandingkan estimasi observasional dengan eksperimen acak simulasi. Sebelum setiap percobaan, prediksikan estimasi mana yang meleset dan seberapa jauh.

::: remember
- Confounder mendorong siapa yang mendapat perlakuan sekaligus hasilnya, sehingga perbandingan naif, atau model yang hanya memprediksi, dapat menunjuk ke arah yang salah.
- ATE adalah rata-rata efek perlakuan pada sebuah populasi, dan efek subgroup adalah rata-rata yang sama di dalam kelompok yang disebut namanya. Stratification, regression adjustment, dan inverse-propensity weighting memperkirakannya dengan membandingkan yang setara dengan yang setara.
- Koreksi membutuhkan tidak adanya confounder yang tidak terukur serta overlap, dan harus membiarkan collider dan variabel pasca-perlakuan. Eksperimen acak tidak membutuhkan asumsi ini.
:::
