---
slug: robustness-fairness-and-privacy
title: Robustness, fairness, dan privacy
---
::: intro
- Rancang uji robustness: daftarkan perubahan yang akan dicoba, tetapkan aturan lulus lebih dulu, lalu baca hasilnya per slice dan juga secara keseluruhan.
- Hitung selisih true-positive rate dan false-positive rate dua kelompok dari sebuah confusion table, lalu jelaskan mengapa error rate yang sama dan precision yang sama tidak dapat berlaku bersamaan ketika base rate berbeda.
- Jelaskan bagaimana fairness sebuah model dapat berubah setelah peluncuran tanpa perubahan apa pun pada model, dan tangani data dengan paparan yang lebih kecil: simpan lebih sedikit, periksa sel kecil, tambahkan noise, batasi akses.

Sebelum mulai: baca "Metrik subgroup dan fairness" dan "Covariate shift dan concept shift". Pelajaran pertama menamai kriteria fairness dan membangun aturan penguin yang dipakai di bawah. Pelajaran kedua menamai tiga jenis shift yang di sini diubah menjadi pengujian.
:::

## Uji robustness adalah pertanyaan yang diajukan lebih dulu
*Apa arti model yang robust, dan apa saja yang dicoba?*

Skor uji menunjukkan bagaimana model bekerja pada data yang mirip dengan data yang dipelajarinya. **Uji robustness** bertanya apa yang terjadi pada data yang tidak mirip. Sebuah model disebut **robust** bila skor dan campuran galatnya tetap dapat diterima ketika terjadi perubahan yang memang mungkin terjadi.

Lima jenis uji mencakup hampir semuanya.

- **Beri gangguan pada input.** Tambahkan noise atau bias tetap pada sebuah kolom, seperti yang dilakukan sensor yang sudah aus.
- **Rusakkan input.** Kosongkan sebuah kolom, atau isi nilai dengan satuan yang salah. Model tidak boleh diam-diam menebak.
- **Keluar rentang.** Beri nilai di luar apa yang dilihat saat training. Sistem yang baik menandainya, bukan menjawabnya.
- **Potong slice.** Ulangi setiap uji per kelompok, karena rata-rata dapat menyembunyikan satu kelompok yang gagal.
- **Beri tekanan pada distribusi.** Bangun shift dari "Covariate shift dan concept shift": campuran input baru, keseimbangan kelas baru, makna yang berubah. Uji **adversarial** adalah versi yang paling tajam: perubahan kecil yang sengaja dipilih untuk membalik jawaban.

> Gagasan kunci: tulis aturan lulus sebelum kamu menjalankan uji. Aturan yang ditulis setelah melihat angka selalu akan menemukan alasan untuk menerimanya.

## Empat uji pada satu aturan sederhana
*Seperti apa uji robustness dengan angka yang nyata?*

Ambil aturan dari "Metrik subgroup dan fairness": penguin dengan massa 4700 g atau lebih disebut Gentoo. Aturan itu dinilai pada 333 penguin dalam tabel bawaan yang punya catatan massa tubuh dan jenis kelamin. Aturan lulus, ditetapkan sebelum uji dijalankan: **accuracy keseluruhan minimal 0,85, dan accuracy untuk tiap jenis kelamin minimal 0,80.**

| Uji | Accuracy | Betina | Jantan | Gentoo terdeteksi | Hasil |
| --- | --- | --- | --- | --- | --- |
| Tanpa perubahan | 303 / 333 = 0,91 | 139 / 165 = 0,84 | 164 / 168 = 0,98 | 93 / 119 = 0,78 | lulus |
| Timbangan membaca 200 g terlalu ringan | 288 / 333 = 0,86 | 121 / 165 = 0,73 | 167 / 168 = 0,99 | 74 / 119 = 0,62 | gagal |
| Timbangan membaca 200 g terlalu berat | 307 / 333 = 0,92 | 150 / 165 = 0,91 | 157 / 168 = 0,93 | 104 / 119 = 0,87 | lulus |
| Semua massa Biscoe kosong | 212 / 333 = 0,64 | 107 / 165 = 0,65 | 105 / 168 = 0,63 | 0 / 119 = 0,00 | gagal |

[[figure:robustness-fairness-and-privacy/stress-tests|Accuracy keseluruhan dan accuracy jenis kelamin yang lebih rendah pada tiap uji. Tanda putus-putus menunjukkan aturan lulus.]]

Timbangan yang membaca terlalu ringan mendorong 18 Gentoo betina ke bawah batas 4700 g: accuracy keseluruhan tetap di atas 0,85 sementara accuracy betina turun menjadi 0,73, dan hanya slice yang memperlihatkannya. Timbangan yang membaca terlalu berat menaikkan accuracy menjadi 0,92, tetapi alarm palsu (penguin lain yang disebut Gentoo) naik dari 4 menjadi 11: lulus, dengan jenis galat yang berbeda. Dengan semua massa Biscoe kosong, kode memperlakukan "kosong" sebagai "ringan" dan melewatkan ke-119 Gentoo.

> Awas: daftar uji yang lulus hanya membuktikan bahwa perubahan-perubahan itu sudah dicoba. Tambahkan kegagalan yang kamu temui di produksi ke dalam daftar.

::: deeper Input adversarial
Untuk aturan ini, penyerang hanya butuh satu langkah: ubah massa beberapa gram melewati 4700, lalu jawabannya terbalik. Model dengan banyak feature menyediakan banyak langkah semacam itu, dan sebuah pencarian dapat menemukan perubahan kecil pada beberapa kolom sekaligus yang membalik jawaban sementara barisnya masih tampak normal. Dua perlindungan membantu. Periksa input terhadap rentang yang terlihat saat training, dan uji model pada baris di dekat decision boundary-nya, karena di situlah perubahan kecil paling berpengaruh.
:::

## Selisih fairness dari satu confusion table
*Bagaimana mengukur selisih fairness dengan pensil?*

Contoh berikutnya dibuat sendiri, sehingga setiap hitungan dapat diperiksa, dan tidak ada orang nyata yang muncul. Sebuah alat rekaan menandai pengajuan pinjaman untuk diperiksa manual. "Positif" berarti pengajuan itu memang perlu diperiksa. Grup A punya 200 pengajuan dan grup B punya 400.

| Hitungan | Grup A | Grup B |
| --- | --- | --- |
| TP (ditandai, memang perlu) | 80 | 60 |
| FN (tidak ditandai, memang perlu) | 20 | 40 |
| FP (ditandai, tidak perlu) | 20 | 15 |
| TN (tidak ditandai, tidak perlu) | 80 | 285 |

Periksa A: 80 + 20 = 100 yang perlu dan 20 + 80 = 100 yang tidak. Periksa B: 60 + 40 = 100 dan 15 + 285 = 300.

**True-positive rate** (TPR) adalah recall, TP / (TP + FN). **False-positive rate** (FPR) adalah FP / (FP + TN): bagian kasus yang tidak memerlukan apa-apa tetapi tetap ditandai. **Selisih** (gap) adalah perbedaan antara kedua kelompok. Kedua selisih sama dengan nol disebut **equalized odds**; selisih TPR nol saja disebut **equal opportunity**.

| Angka | Grup A | Grup B | Selisih |
| --- | --- | --- | --- |
| TPR | 80 / 100 = 0,80 | 60 / 100 = 0,60 | 0,20 |
| FPR | 20 / 100 = 0,20 | 15 / 300 = 0,05 | 0,15 |
| Precision | 80 / 100 = 0,80 | 60 / 75 = 0,80 | 0,00 |

[[figure:robustness-fairness-and-privacy/group-gaps|Tiga rate dari alat yang sama pada kedua grup. Precision-nya sama, tetapi true-positive rate dan false-positive rate tidak.]]

Precision yang sama di kedua grup berarti sebuah flag benar 80 persen di masing-masing grup: **calibration by group** (disebut juga calibration within groups) berlaku untuk flag ya/tidak. Untuk skor, periksa per rentang skor: di antara kasus yang berskor sekitar 0,8, sekitar 80 persen seharusnya positif di setiap grup.

## Mengapa definisi-definisi itu bertentangan
*Mengapa alat ini tidak sekadar menutup semua selisih?*

Coba perbaiki grup B. Turunkan threshold-nya sampai rate-nya sama dengan grup A: TPR 0,80 dan FPR 0,20. Dari 100 pengajuan B yang memang perlu diperiksa, sekarang 80 ditandai. Dari 300 yang tidak perlu, 20 persen, yaitu 60, ditandai. Totalnya 140 flag, dan 80 di antaranya benar.

| Grup B | Sebelum | Disamakan dengan A |
| --- | --- | --- |
| Ditandai | 75 | 140 |
| Precision | 60 / 75 = 0,80 | 80 / 140 = 0,57 |
| Flag rate | 75 / 400 = 0,19 | 140 / 400 = 0,35 |

Error rate sekarang sama, tetapi precision turun menjadi 0,57 dibandingkan 0,80 milik A. Ini aritmetika, bukan kelemahan model. Precision mengikuti base rate p, yaitu bagian kasus positif dalam sebuah kelompok:

precision = TPR x p / (TPR x p + FPR x (1 - p))

Dengan TPR dan FPR yang sama, kelompok dengan base rate berbeda, di sini 0,50 dan 0,25, pasti mendapat precision yang berbeda. "Metrik subgroup dan fairness" menunjukkan pertentangan yang sama dari sisi lain: error rate sama, precision tidak sama.

> Gagasan kunci: ketika base rate berbeda dan model tidak sempurna, equalized odds dan calibration by group tidak dapat berlaku bersamaan. Selisih mana yang ditutup bergantung pada siapa yang menanggung biaya tiap kesalahan, sehingga ini keputusan bagi orang yang memakai alat tersebut.

Memberi setiap kelompok threshold sendiri dapat menutup satu selisih. Cara itu memerlukan kolom kelompok pada saat keputusan diambil, dan apakah itu boleh adalah pertanyaan kebijakan dan hukum, bukan pertanyaan pemodelan.

## Fairness saat terjadi shift
*Dapatkah alat yang seimbang saat peluncuran menjadi tidak seimbang tanpa perubahan pada modelnya?*

Dapat, dan "Covariate shift dan concept shift" menjelaskan sebabnya. Pertahankan alat dari bagian sebelumnya seperti saat diluncurkan: grup B punya TPR 0,60 dan FPR 0,05. Misalkan base rate B naik dari 0,25 menjadi 0,40.

> Contoh hitungan: grup B masih punya 400 pengajuan, sekarang 160 yang perlu diperiksa dan 240 yang tidak. Ditandai dan memang perlu: 0,60 x 160 = 96. Ditandai tetapi tidak perlu: 0,05 x 240 = 12. Totalnya 108 flag, dan precision-nya 96 / 108 = 0,89, naik dari 0,80. Precision grup A tetap 0,80, sehingga muncul selisih 0,09 di tempat yang tadinya tidak ada.

[[figure:robustness-fairness-and-privacy/fairness-shift|Precision, TPR, dan FPR untuk grup A, untuk grup B saat peluncuran, dan untuk grup B setelah base rate-nya naik. Tidak ada yang berubah pada modelnya.]]

Selisih TPR dan FPR tidak bergerak, karena rate itu diukur di dalam tiap kelas, sehingga base rate yang baru tidak memengaruhinya. Perubahan makna memang menggesernya. Jika pengajuan B berubah sehingga alat hanya menemukan 0,45 dari yang perlu diperiksa, selisih TPR membesar dari 0,20 menjadi 0,35. Dan kelompok yang mengecil menghasilkan rate dari sedikit kasus, sehingga sebuah selisih bisa saja hanya noise.

Karena itu fairness dipantau seperti accuracy: hitung rate tiap kelompok per periode, dengan jumlah kasus di sampingnya. Label datang terlambat, seperti dicatat "Covariate shift dan concept shift", sehingga alarm pertama bisa berupa perubahan flag rate sebuah kelompok.

## Menghapus nama bukan anonimisasi
*Mengapa tabel tanpa kolom nama tetap tentang orang?*

Nama hanyalah satu cara untuk menemukan seseorang, dan kolom lain juga dapat menemukannya. **Quasi-identifier** adalah kolom yang tidak berbahaya sendirian tetapi mengidentifikasi bila digabung, misalnya rentang usia dan lingkungan tempat tinggal. Menghapus kolom nama membiarkan keduanya.

**k-anonymity** bertanya berapa banyak record yang berbagi tiap kombinasi quasi-identifier. Ukuran kelompok terkecil adalah k, dan sebuah record dalam kelompok berukuran k tampak seperti k - 1 record lain. Tabel rekaan ini berisi 12 record, dengan rentang usia dan wilayah sebagai quasi-identifier dan kondisi ya/tidak sebagai kolom sensitif.

| Rentang usia | Wilayah | Record | Dengan kondisi tersebut |
| --- | --- | --- | --- |
| 20 sampai 29 | Utara | 1 | 1 |
| 30 sampai 39 | Utara | 3 | 1 |
| 40 sampai 49 | Utara | 2 | 0 |
| 30 sampai 39 | Selatan | 2 | 2 |
| 40 sampai 49 | Selatan | 3 | 0 |
| 50 sampai 59 | Selatan | 1 | 0 |

Dua kelompok hanya berisi satu record, sehingga k = 1: siapa pun yang tahu bahwa seorang tetangga berusia dua puluhan tinggal di wilayah Utara dapat membaca kondisi pada baris itu. Gabungkan rentang usia menjadi 20 sampai 39 dan 40 sampai 59, maka kelompoknya berisi 4, 2, 2, dan 4 record, sehingga k = 2.

[[figure:robustness-fairness-and-privacy/k-anonymity|Jumlah record per kombinasi rentang usia dan wilayah. Sel dengan satu record diberi tanda; setelah rentang digabung, sel terkecil berisi dua.]]

> Awas: k-anonymity bukan jaminan. Kelompok 20 sampai 39 di Selatan berisi dua record dan keduanya punya kondisi tersebut, sehingga mengetahui bahwa seseorang ada di dalamnya sudah membuka kondisinya.

::: deeper Melampaui k-anonymity
Perbaikan untuk kelemahan itu adalah meminta variasi pada kolom sensitif di dalam setiap kelompok juga, gagasan yang disebut l-diversity. Pertahanan lain menambahkan noise acak pada angka yang dirilis, yang disebut di bagian berikutnya. Tidak ada satu teknik pun yang menghapus semua risiko, dan semakin banyak kolom dalam sebuah tabel, semakin banyak kombinasi yang dapat menunjuk seseorang.
:::

## Simpan lebih sedikit, bagikan lebih sedikit
*Kebiasaan apa yang melindungi data pribadi di luar satu tabel?*

**Kumpulkan lebih sedikit.** Kumpulkan hanya kolom yang dibutuhkan model, dan tentukan sebelum mengumpulkan untuk apa tiap kolom dipakai. Kolom yang tidak pernah disimpan tidak dapat bocor.

**Simpan lebih sedikit.** Hapus baris ketika tujuannya selesai, atau ringkas menjadi total. Data lama adalah risiko tanpa manfaat.

**Waspadai sel kecil.** Sebuah rate dari 3 orang memberi tahu pembacanya tentang ketiga orang itu. Saat melaporkan tabel subgroup, seperti dalam audit fairness, sembunyikan atau gabungkan sel di bawah ukuran minimum yang ditetapkan kebijakan, misalnya 5. Tetap tuliskan jumlah kasus di samping setiap rate yang kamu tampilkan.

**Tambahkan noise.** Sebelum merilis sebuah hitungan, tambahkan bilangan acak kecil, sehingga 4 yang sebenarnya dapat dipublikasikan sebagai 6 dan 38 yang sebenarnya sebagai 37. Noise lebih besar berarti privasi lebih kuat dan accuracy lebih rendah. Versi formalnya disebut differential privacy; pelajaran ini hanya menyebut namanya.

**Batasi akses.** Beri setiap orang dan setiap pekerjaan hanya data yang dibutuhkannya, dan catat siapa yang melihatnya. Kolom kelompok yang diperlukan audit fairness sendiri bersifat sensitif, sehingga kamu menyimpannya untuk audit dan membatasinya.

> Gagasan kunci: privasi adalah kumpulan kebiasaan, bukan sakelar. Setiap kolom yang kamu simpan dan setiap angka yang kamu publikasikan adalah pilihan yang punya biaya bagi orang-orang di dalam data.

## Sebelum lab
*Apa yang menyusul dalam kursus ini?*

Sekarang kamu punya tiga pemeriksaan untuk model yang akan bertemu pemakaian nyata: apakah ia bertahan ketika inputnya bergeser, apakah error rate-nya berbeda antarkelompok, dan apakah data di sekitarnya membuka identitas orang. Ketiganya menghasilkan angka yang dapat dibaca per slice, dan ketiganya memerlukan aturan lulus yang ditetapkan lebih dulu.

Pelajaran berikutnya, "Human review dan dokumentasi model", membahas siapa yang melihat kasus yang ditandai atau tidak dapat ditangani model, dan cara menuliskan untuk apa model itu dibuat serta di mana ia gagal. Setelah itu Reliability lab memungkinkan kamu menguji model di bawah tekanan lintas subgroup dan kondisi data, lalu mendokumentasikan di mana human review diperlukan.

Sebelum membukanya, tuliskan dua dugaan: slice mana yang akan gagal lebih dulu ketika input bergeser, dan selisih mana, TPR atau precision, yang akan bergerak ketika base rate sebuah kelompok berubah.

::: remember
- Uji robustness mengubah input dengan cara yang memang mungkin terjadi, dengan aturan lulus yang ditulis lebih dulu dan hasil yang dibaca per slice, bukan hanya secara keseluruhan.
- Selisih fairness dapat diukur: selisih TPR, selisih FPR, selisih precision. Ketika base rate berbeda, error rate yang sama dan precision yang sama tidak dapat berlaku bersamaan, dan sebuah shift dapat membuka selisih tanpa perubahan pada model.
- Menghapus nama bukan anonimisasi: kombinasi kolom dapat menunjuk seseorang. Simpan lebih sedikit, periksa sel kecil, tambahkan noise, dan batasi akses.
:::
