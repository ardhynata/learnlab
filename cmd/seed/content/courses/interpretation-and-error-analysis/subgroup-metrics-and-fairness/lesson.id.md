---
slug: subgroup-metrics-and-fairness
title: Metrik subgroup dan fairness
---
::: intro
- Hitung accuracy dan recall untuk setiap kelompok secara terpisah, lalu kenali model yang akurat secara keseluruhan tetapi buruk untuk satu kelompok.
- Pakai slice untuk menemukan tempat galat model menumpuk, dan jelaskan mengapa slice kecil perlu diperlakukan hati-hati.
- Sebutkan tiga kriteria fairness (demographic parity, equal opportunity, calibration within groups) dan jelaskan mengapa ketiganya tidak dapat terpenuhi sekaligus ketika base rate berbeda.

Sebelum mulai: baca "Confusion matrix dan rasio-rasionya" dan "Variabilitas sampling dan bootstrap".
:::

## Satu angka dapat menyembunyikan satu kelompok
*Bagaimana sebuah model dapat akurat secara keseluruhan tetapi tetap gagal pada satu kelompok?*

Sebuah model biasanya diringkas dengan satu angka, misalnya accuracy. Angka itu adalah rata-rata dari semua kasus, dan rata-rata dapat menutupi bagian data yang hasilnya buruk.

Ini contoh nyata. Ambil 333 penguin pada tabel bawaan yang punya catatan massa tubuh dan jenis kelamin, lalu satu aturan sederhana: *penguin dengan massa 4700 g atau lebih disebut Gentoo, yang lebih ringan bukan.* Aturan ini benar untuk 303 dari 333 penguin, sehingga accuracy-nya 303 / 333 = 0,91.

Sekarang pecah hasil yang sama menurut jenis kelamin. Jenis kelamin tidak pernah menjadi input aturan ini, tetapi galatnya sebagian besar jatuh pada satu sisi.

**Kelompok** (atau **subgroup**) adalah kumpulan kasus yang memiliki nilai yang sama pada suatu kolom, seperti jenis kelamin atau pulau. **Metrik subgroup** adalah metrik biasa yang dihitung hanya pada kasus-kasus dalam satu kelompok.

| Kelompok | Penguin | Galat | Accuracy | Gentoo terdeteksi (recall) |
| --- | --- | --- | --- | --- |
| Semua | 333 | 30 | 303 / 333 = 0,91 | 93 / 119 = 0,78 |
| Betina | 165 | 26 | 139 / 165 = 0,84 | 32 / 58 = 0,55 |
| Jantan | 168 | 4 | 164 / 168 = 0,98 | 61 / 61 = 1,00 |

[[figure:subgroup-metrics-and-fairness/group-gap|Aturan yang sama, dinilai pada semua penguin dan pada tiap jenis kelamin. Accuracy menyembunyikan selisihnya, sedangkan recall untuk Gentoo memperlihatkannya.]]

## Mengapa angka keseluruhan menyembunyikannya
*Mengapa rata-rata tidak memberi peringatan?*

Setiap metrik kelompok memakai empat hitungan yang sama dengan confusion matrix, hanya saja dibatasi pada kasus-kasus kelompok itu. Accuracy keseluruhan sekadar rata-rata accuracy kelompok dengan ukuran kelompok sebagai bobot: kedua kelompok punya 139 dan 164 jawaban benar, dan (139 + 164) / (165 + 168) = 0,91.

Di sini kedua kelompok berukuran hampir sama, sehingga angka keseluruhan berada di tengah-tengah dan tidak memperlihatkan keduanya. Ketika satu kelompok kecil, ia nyaris tidak menggeser angka keseluruhan.

> Contoh hitungan: sebuah test set berisi 400 kasus. Satu kelompok berisi 380 kasus dan benar 95 persen, yaitu 361 jawaban benar. Kelompok lain berisi 20 kasus dan hanya benar separuhnya, yaitu 10 jawaban benar. Accuracy keseluruhan adalah (361 + 10) / 400 = 0,93, skor yang tampak bagus, padahal kelompok kecil itu tidak lebih baik daripada lemparan koin.

> Gagasan kunci: accuracy keseluruhan adalah rata-rata berbobot menurut ukuran kelompok. Kelompok kecil dapat gagal parah tanpa banyak mengubahnya, karena itu laporkan metrik per kelompok di samping angka keseluruhan.

## Di mana galat menumpuk?
*Bagaimana menemukan slice tempat model paling buruk?*

**Analisis galat per slice** berarti mendaftar jawaban yang salah, memotongnya menurut kolom yang tersedia, lalu mencari slice yang memuat jauh lebih banyak daripada bagian wajarnya. Slice adalah kelompok yang ditentukan oleh satu kolom atau lebih.

Mulai dari 30 galat aturan penguin tadi. Menurut pulau, Torgersen punya 1 galat dari 47 penguin, Dream punya 1 dari 123, dan Biscoe punya 28 dari 163. Di dalam Biscoe, penguin betina punya 26 galat dari 80 dan penguin jantan punya 2 dari 83. Persempit sekali lagi ke Gentoo betina: 26 galat dari 58.

Artinya 26 dari 30 galat, yaitu 87 persen, berasal dari 58 penguin, yaitu 17 persen data. Ke-275 penguin lainnya hanya punya 4 galat.

[[figure:subgroup-metrics-and-fairness/error-slices|Tingkat galat aturan yang sama pada slice yang semakin sempit. Label pada tiap batang menunjukkan jumlah galat dari jumlah penguin dalam slice.]]

Slice menunjukkan di mana harus mencari, bukan mengapa. Petunjuknya ada pada massa tubuh: rata-rata Gentoo betina 4680 g dan Gentoo jantan 5485 g, sehingga batas 4700 g jatuh di tengah-tengah Gentoo betina. Aturan ini gagal pada jenis kelamin yang lebih ringan.

## Slice kecil dan slice yang ditemukan dengan mencari
*Kapan slice yang buruk hanya kebetulan?*

Tingkat galat dari sedikit kasus mudah berubah-ubah. Penguin jantan di Torgersen punya 1 galat dari 23 penguin, tingkatnya 0,04. Satu galat lagi membuatnya 2 / 23 = 0,09, dua kali lipat, padahal penguinnya tidak berubah. "Variabilitas sampling dan bootstrap" sudah menunjukkan seberapa jauh sampel kecil dapat bergeser.

Dua kebiasaan membantu. Pertama, tulis jumlah kasus di samping setiap tingkat galat, seperti pada tabel dan gambar tadi. Kedua, ingat cara slice ditemukan: jika data dipotong dengan banyak cara, akan ada slice yang tampak buruk hanya karena kebetulan.

Slice lebih layak dipercaya jika ia besar, punya penyebab masuk akal yang dapat diperiksa, dan selisihnya muncul lagi pada split baru atau sampel baru. Gentoo betina jelas memenuhi dua yang pertama: 58 penguin dan penyebab pada massa tubuh, dengan 26 galat dibanding 4 pada 275 penguin lainnya. Selisih sebesar itu tetap layak dicek pada sampel baru sebelum diandalkan.

> Awas: slice buruk yang ditemukan setelah melihat banyak potongan hanyalah petunjuk, bukan temuan. Pastikan dulu pada data yang tidak dipakai untuk menemukannya.

## Tiga kriteria fairness
*Apa yang dapat diperiksa ketika ada yang bertanya apakah model memperlakukan dua kelompok secara adil?*

"Adil" punya banyak makna, sehingga bidang ini memakai sifat yang bernama dan dapat diperiksa. Masing-masing membandingkan satu angka antar kelompok. Untuk jawaban ya atau tidak, dalam pelajaran ini disebut flag:

- **Demographic parity:** model memberi flag pada bagian yang sama dari setiap kelompok.
- **Equal opportunity:** di antara kasus yang memang positif, model menemukan bagian yang sama pada setiap kelompok. Itu berarti recall yang sama.
- **Calibration within groups:** sebuah flag bermakna sama di setiap kelompok, sehingga bagian kasus ber-flag yang benar-benar positif adalah sama. Untuk jawaban ya atau tidak, itu berarti precision yang sama. (Untuk skor, artinya skor 0,8 benar pada sekitar 80 persen kasus di setiap kelompok.)

> Awas: semua ini adalah pengukuran, bukan vonis. Mana yang penting bergantung pada biaya tiap jenis galat, siapa yang menanggungnya, dan untuk apa model dipakai. Itu pertanyaan bagi orang yang memahami kasus penggunaannya. Penguin hanya membantu kita berlatih berhitung: tidak ada orang sungguhan dalam pelajaran ini.

## Aturan penguin terhadap kriteria
*Bagaimana skor aturan dari awal pelajaran?*

Aturan itu memberi flag pada 32 / 165 = 0,19 dari penguin betina dan 65 / 168 = 0,39 dari penguin jantan, sehingga demographic parity tidak terpenuhi. Recall-nya 0,55 berbanding 1,00, kegagalan besar pada equal opportunity. Precision-nya 32 / 32 = 1,00 berbanding 61 / 65 = 0,94, cukup dekat.

## Tabel dua kelompok dihitung manual
*Seperti apa ketiga kriteria itu pada hitungan nyata?*

Berikut data buatan, sehingga setiap hitungan dapat diperiksa. Sebuah alat rekaan memberi flag pada penguin untuk pemeriksaan dokter hewan di dua koloni, A dan B, masing-masing 100 penguin. Kondisinya ada pada 40 penguin di A dan 20 di B: **base rate** (bagian kasus positif dalam sebuah kelompok) adalah 0,40 dan 0,20.

| Hitungan | Koloni A | Koloni B |
| --- | --- | --- |
| TP (ber-flag, mengidap) | 32 | 16 |
| FN (tanpa flag, mengidap) | 8 | 4 |
| FP (ber-flag, tidak mengidap) | 6 | 8 |
| TN (tanpa flag, tidak mengidap) | 54 | 72 |

Periksa A: 32 + 8 = 40 dan 6 + 54 = 60. Periksa B: 16 + 4 = 20 dan 8 + 72 = 80.

| Kriteria | Angka | Koloni A | Koloni B | Sama? |
| --- | --- | --- | --- | --- |
| Demographic parity | flag rate | 38 / 100 = 0,38 | 24 / 100 = 0,24 | Tidak |
| Equal opportunity | recall | 32 / 40 = 0,80 | 16 / 20 = 0,80 | Ya |
| Calibration within groups | precision | 32 / 38 = 0,84 | 16 / 24 = 0,67 | Tidak |
| (untuk nanti) | false-positive rate | 6 / 60 = 0,10 | 8 / 80 = 0,10 | Ya |

[[figure:subgroup-metrics-and-fairness/two-groups|Kedua tabel confusion. Alat ini menemukan 80 persen kasus positif dan memberi 10 persen alarm palsu di kedua koloni, tetapi flag rate dan precision berbeda.]]

## Mengapa ketiganya tidak dapat terpenuhi sekaligus
*Mengapa alat itu tidak bisa begitu saja memperbaiki kriteria yang gagal?*

Coba pada koloni B. Agar flag rate-nya sama dengan A (0,38) pada recall 0,80, alat harus memberi flag pada 38 penguin: 16 true positive dan 22 alarm palsu. Precision turun menjadi 16 / 38 = 0,42, dibanding 0,84 di A. Jika yang disamakan adalah precision A, alat hanya boleh memberi flag pada 19 penguin (16 benar, 3 salah), dan flag rate-nya 0,19.

Ini bukan kesialan. Flag rate, recall, precision, dan base rate terikat oleh satu identitas:

flag rate = recall x base rate / precision

Periksa A: 0,80 x 0,40 / 0,84 = 0,38. Periksa B: 0,80 x 0,20 / 0,67 = 0,24. Jika recall, precision, dan flag rate sama pada dua kelompok, base rate keduanya pun harus sama.

[[figure:subgroup-metrics-and-fairness/precision-base-rate|Precision sebuah alat dengan recall 0,80 dan false-positive rate 0,10, ketika base rate kelompok berubah. Alatnya sama, precision-nya berbeda.]]

> Gagasan kunci: ketika base rate berbeda, demographic parity, equal opportunity, dan calibration within groups tidak dapat terpenuhi sekaligus. Konfliknya datang dari angka-angkanya, bukan dari algoritma yang lemah. Memilih kriteria mana yang diprioritaskan adalah keputusan tentang kasus penggunaannya.

::: deeper Dari mana identitas itu berasal
Ambil kelompok berisi n kasus dengan base rate p. Kasus yang benar-benar positif berjumlah p x n, dan alat menemukan recall x p x n di antaranya: itulah true positive. Kasus ber-flag adalah true positive dibagi precision, karena precision adalah true positive per kasus ber-flag. Maka kasus ber-flag = recall x p x n / precision, dan membaginya dengan n memberi flag rate. Aljabar yang sama memberi precision = recall x p / (recall x p + FPR x (1 - p)), dengan FPR adalah false-positive rate. Dengan recall 0,80 dan FPR 0,10, base rate 0,20 memberi 0,16 / (0,16 + 0,08) = 0,67 dan base rate 0,40 memberi 0,32 / (0,32 + 0,06) = 0,84, yaitu kedua koloni di atas.
:::

## Sebelum lab
*Bagaimana mengaudit sebuah model, dan apa yang datang berikutnya?*

Rutinitas singkat berikut merangkum pelajaran ini. Pilih kelompok yang penting bagi penggunaannya dan benar-benar tercatat: kelompok yang tidak kamu catat tidak dapat diaudit. Hitung metrik untuk setiap kelompok dengan jumlah kasus di sampingnya. Lakukan slice untuk melihat di mana galat menumpuk, lalu periksa slice yang mencurigakan pada data baru. Nyatakan kriteria mana yang penting untuk penggunaan ini beserta alasannya, karena kriteria lain biasanya harus mengalah.

Ingat dua batasan. Label tidak selalu kebenaran murni: jika ia dicatat secara tidak merata antar kelompok, model dapat mempelajari ketidakmerataan itu. Dan tabel metrik tidak memutuskan apa pun. Orang yang memahami kasus penggunaannya yang memutuskan, dan tabel itu menjadi buktinya.

Pelajaran berikutnya, "Permutation importance dan SHAP", bertanya feature mana yang diandalkan model, seperti massa tubuh pada aturan di atas. Setelah itu, Audit lab memungkinkan kamu mengaudit galat per subgroup dan melihat bagaimana feature yang berkorelasi memengaruhi estimasi importance.

::: deeper Nama-nama yang akan kamu temui
Equal opportunity sering dipasangkan dengan false-positive rate yang sama, dan pasangan itu disebut equalized odds. Demographic parity juga disebut statistical parity, dan precision yang sama antar kelompok juga disebut predictive parity. Perbaikan yang umum adalah memberi setiap kelompok threshold sendiri. Cara itu dapat menyamakan satu angka, dan menggeser angka lainnya menurut identitas yang sama. Model yang sempurna pun tidak lolos: ia memenuhi equal opportunity dan calibration, tetapi memberi flag pada tiap kelompok sebesar base rate-nya sendiri. Syarat tambahan "model tidak sempurna" milik hasil lain yang berkaitan (Kleinberg dan Chouldechova) tentang calibration dengan false-positive rate dan false-negative rate yang sama.
:::

::: remember
- Hitung metrik untuk setiap kelompok, dengan jumlah kasus di sampingnya. Accuracy keseluruhan adalah rata-rata berbobot ukuran kelompok dan dapat menyembunyikan kelompok yang gagal.
- Lakukan slice pada galat untuk melihat di mana galat menumpuk. Slice kecil dan slice yang ditemukan dengan mencari perlu dikonfirmasi pada data baru.
- Demographic parity, equal opportunity, dan calibration within groups tidak dapat terpenuhi sekaligus ketika base rate berbeda. Mana yang diprioritaskan adalah keputusan untuk kasus penggunaannya.
:::
