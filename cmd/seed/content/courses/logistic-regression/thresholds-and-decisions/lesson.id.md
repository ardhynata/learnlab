---
slug: thresholds-and-decisions
title: Threshold dan keputusan
---
::: intro
- Ubah probabilitas prediksi menjadi keputusan ya atau tidak dengan sebuah threshold, dan jelaskan arti masing-masing dari empat hasil yang mungkin.
- Perkirakan bagaimana false positive, false negative, precision, dan recall bergerak ketika threshold diturunkan atau dinaikkan, lalu periksa di lab.
- Pilih threshold berdasarkan biaya tiap jenis kesalahan, dan uji gagasan itu pada data buatan maupun pada data penguin yang nyata.

Sebelum mulai: baca "Probabilitas dan sigmoid" dan "Log loss dan proses fitting".
:::

## Apa yang ditanyakan lab
*Apa yang kamu lakukan dengan sebuah probabilitas setelah model memberikannya?*

Dua pelajaran sebelumnya membangun model yang memberi setiap contoh probabilitas untuk menjadi positif. Probabilitas belum merupakan keputusan. Untuk bertindak, kamu menentukan sebuah batas, yaitu **threshold**, lalu menyebut setiap contoh yang berada di atas atau tepat pada batas itu "positif". Lab **Regresi logistik dan threshold** memungkinkan kamu menggeser batas tersebut dan melihat akibatnya.

Lab dimulai dengan 100 titik buatan dalam dua kelompok yang saling tumpang tindih: 60 negatif dan 40 positif. Sebuah regresi logistik dilatih pada titik-titik itu, dan threshold awalnya 0,5. Pada nilai awal ini lab menunjukkan:

| Ukuran | Pada threshold 0,5 |
|---|---|
| Diprediksi positif | 36 dari 100 |
| True positive / false positive | 30 / 6 |
| True negative / false negative | 54 / 10 |
| Precision / recall | 83,3% / 75,0% |
| Log loss | 0,352 |

Karena titik-titiknya tumpang tindih, tidak ada threshold yang membuat semuanya benar. Menggeser threshold hanya menukar satu jenis kesalahan dengan jenis lainnya, dan pertukaran itulah inti pelajaran ini.

## Dari probabilitas ke keputusan
*Bagaimana threshold mengubah probabilitas menjadi kelas?*

Aturannya singkat: **jika p sama dengan atau lebih besar dari threshold, prediksi contoh itu positif; jika tidak, negatif.** Pada 0,5 ini adalah decision boundary dari "Probabilitas dan sigmoid", yaitu tempat skor bernilai 0.

Threshold pada probabilitas sekaligus merupakan potongan pada skor, karena sigmoid selalu naik. Skor tempat p mencapai threshold t adalah `ln(t / (1 - t))`, yaitu log-odds dari t, besaran yang sama seperti di "Probabilitas dan sigmoid". Hasilnya 0 untuk 0,5, 1,39 untuk 0,8, dan -1,39 untuk 0,2.

[[figure:thresholds-and-decisions/threshold-on-the-curve|100 titik di lab berada pada sigmoid sesuai skornya. Setiap garis putus-putus adalah sebuah threshold; titik di sebelah kanannya diprediksi positif: 60, 36, dan 22 titik.]]

> Contoh hitungan: sebuah titik punya skor 0,5, sehingga p = 1 / (1 + e^-0,5) = 0,62. Pada threshold 0,5 titik itu diprediksi positif, karena 0,62 lebih besar dari 0,5. Pada threshold 0,7 ia diprediksi negatif. Model dan titiknya tidak berubah, hanya aturannya yang berganti.

Pada scatterplot, threshold baru menggambar garis batas baru yang sejajar dengan garis 0,5. Threshold yang lebih tinggi menggeser garis itu lebih dalam ke kelompok positif.

## Empat hasil
*Apa saja yang bisa benar dan yang bisa salah pada setiap prediksi?*

Setiap contoh punya kelas sebenarnya dan kelas prediksi, sehingga ada empat kemungkinan. Positif adalah kelas yang kita cari.

- **True positive:** contoh yang sebenarnya positif dan diprediksi positif.
- **False positive:** contoh yang sebenarnya negatif tetapi diprediksi positif. Alarm palsu.
- **True negative:** contoh yang sebenarnya negatif dan diprediksi negatif.
- **False negative:** contoh yang sebenarnya positif tetapi diprediksi negatif. Kasus yang terlewat.

[[figure:thresholds-and-decisions/four-outcomes|Empat hasil pada threshold 0,5 untuk data awal lab, beserta precision dan recall yang dihasilkannya.]]

Lab menggambar kesalahan itu pada plot: lingkaran penuh untuk false positive dan lingkaran putus-putus untuk false negative.

Dua angka ringkasan memakai hitungan ini. **Precision** adalah true positive dibagi semua yang diprediksi positif: dari semua alarm yang berbunyi, berapa yang sungguhan? **Recall** adalah true positive dibagi semua positif sebenarnya: dari semua kasus yang ada, berapa yang berhasil kita temukan?

> Contoh hitungan: pada 0,5 ada 30 true positive, 6 false positive, dan 10 false negative. Precision = 30 / (30 + 6) = 83,3%. Recall = 30 / (30 + 10) = 75,0%.

## Menggeser threshold
*Apa yang terjadi pada kesalahan ketika threshold turun atau naik?*

Turunkan threshold dari 0,5 ke 0,2, maka lebih banyak titik yang diprediksi positif: 60, bukan 36. Setiap titik yang sudah diprediksi positif tetap positif, jadi tidak ada false positive yang bisa hilang, dan positif sebenarnya yang tadinya terlewat mungkin kini tertangkap, sehingga false negative hanya bisa berkurang.

Naikkan threshold dan yang terjadi berkebalikan. Tiga pengaturan pada data awal:

| Threshold | Diprediksi positif | False positive | False negative |
|---|---|---|---|
| 0,2 | 60 | 22 | 2 |
| 0,5 | 36 | 6 | 10 |
| 0,8 | 22 | 1 | 19 |

[[figure:thresholds-and-decisions/counts-vs-threshold|False positive turun dan false negative naik ketika threshold dinaikkan. Kurvanya bergerak dalam langkah kecil, karena sebuah hitungan baru berubah saat threshold melewati sebuah titik.]]

> Gagasan kunci: threshold tidak membuat model menjadi lebih baik. Ia hanya memilih kesalahan mana yang kamu terima: lebih banyak alarm palsu atau lebih banyak kasus yang terlewat.

::: deeper Mengapa menurunkan threshold tidak pernah menambah false negative
Ambil sebuah contoh positif sebenarnya yang diprediksi positif pada threshold 0,5, artinya p-nya paling sedikit 0,5. Pada threshold t yang lebih rendah, p tetap paling sedikit t, sehingga contoh itu tetap diprediksi positif. Himpunan contoh yang diprediksi positif hanya dapat membesar ketika t turun. False negative adalah positif sebenarnya yang berada di luar himpunan itu, sehingga jumlahnya hanya dapat menyusut. Argumen yang sama, dibalik, menunjukkan bahwa menaikkan t tidak pernah menambah false positive.
:::

## Precision dan recall saling berlawanan
*Mengapa precision dan recall tidak bisa sama-sama didorong ke puncak?*

Bandingkan kedua ujungnya. Pada threshold 0,2 model menemukan 38 dari 40 positif, recall 95,0%, tetapi ia memprediksi 60 contoh sebagai positif dan 22 di antaranya salah, sehingga precision-nya 38 / 60 = 63,3%. Pada 0,8 hanya 22 yang diprediksi positif dan 21 di antaranya benar: precision 95,5%, dan recall 21 / 40 = 52,5%.

[[figure:thresholds-and-decisions/precision-recall|Recall turun ketika threshold naik, sedangkan precision cenderung naik. Tiga threshold yang ditandai adalah yang ada di tabel di atas.]]

Threshold yang tinggi hanya memprediksi contoh yang sangat diyakini model, sehingga sebagian besar prediksinya benar, tetapi banyak positif sebenarnya yang tertinggal. Threshold yang rendah menangkap hampir semuanya, berikut banyak alarm palsu.

Perhatikan apa yang tidak bergerak. Menggeser threshold tidak mengubah probabilitasnya, sehingga **log loss** tetap 0,352 pada setiap threshold. Log loss menilai probabilitas; precision dan recall menilai keputusan yang diambil dari probabilitas itu.

> Awas: precision bisa tampak sempurna karena alasan yang keliru. Pada 0,9 model memprediksi 13 contoh positif dan ketiga belasnya benar, sehingga precision 100,0%, tetapi recall hanya 32,5%: 27 dari 40 positif terlewat.

## Memilih threshold
*Bagaimana memilih threshold, jika 0,5 bukan angka yang istimewa?*

Threshold sebaiknya mengikuti biaya dari tiap kesalahan. Ambil aturan sederhana: alarm palsu berbiaya 1 dan kasus yang terlewat berbiaya 5, seolah-olah setiap kasus terlewat berarti seorang pasien sakit yang dipulangkan. Total biayanya adalah false positive + 5 × false negative.

| Threshold | False positive | False negative | Total biaya |
|---|---|---|---|
| 0,2 | 22 | 2 | 22 + 10 = 32 |
| 0,5 | 6 | 10 | 6 + 50 = 56 |
| 0,8 | 1 | 19 | 1 + 95 = 96 |

Karena kasus terlewat lima kali lebih mahal, threshold rendah yang menang. Jika kedua kesalahan berbiaya sama, 0,5 sudah mendekati yang terbaik: ia membuat 16 kesalahan, sedangkan yang terbaik di seluruh rentang slider lab adalah 15, pada 0,57 atau 0,58.

Model tidak memberimu threshold. Kamu memilihnya dari biaya kesalahan, dan pekerjaan yang berbeda dapat menuntut threshold yang berbeda pada model yang sama.

> Gagasan kunci: tanyakan dulu "kesalahan mana yang lebih buruk di sini?" Lalu geser threshold ke arah yang menghindari kesalahan itu.

## Penguin nyata
*Apakah pertukaran yang sama muncul pada data nyata?*

Lab juga dapat menanyakan apakah seekor penguin adalah Gentoo, berdasarkan panjang paruh dan massa tubuhnya. Dari 344 penguin dalam tabel, 342 punya kedua pengukuran dan 123 di antaranya Gentoo. Pada threshold 0,5 model yang dilatih memprediksi 121 positif, dengan 108 true positive, 13 false positive, dan 15 false negative. Precision-nya 89,3% dan recall-nya 87,8%.

Pertukaran yang sama muncul. Pada 0,2 ada 28 false positive dan 6 false negative. Pada 0,8 ada 2 false positive dan 31 false negative.

## Sampel baru
*Apakah pola itu bertahan pada sampel data yang baru?*

Data nyata tidak berubah, jadi lab hanya dapat menarik sampel baru lewat data buatan. Pada tiga sampel buatan baru, hitungan pastinya berbeda, tetapi arahnya tidak: pada 0,2 selalu ada lebih banyak false positive dan lebih sedikit false negative dibandingkan pada 0,5. Eksperimen 6 memuat angkanya.

Sebuah hitungan baru berubah saat threshold melewati probabilitas sebuah contoh, jadi selama threshold bergerak di antara dua probabilitas yang berdekatan, hitungannya tetap datar.

::: remember
- Threshold mengubah probabilitas menjadi keputusan: prediksi contoh itu positif bila p sama dengan atau lebih besar dari threshold. Threshold pada p adalah potongan pada skor.
- Menurunkan threshold tidak pernah menghapus false positive dan tidak pernah menambah false negative; menaikkannya berlaku sebaliknya. Precision dan recall cenderung saling berlawanan, sedangkan log loss tidak bergerak.
- Pilih threshold dari biaya tiap kesalahan, bukan dari kebiasaan, dan periksa gagasannya pada data nyata dan pada sampel yang baru.
:::

@@lab

## Lab: Regresi logistik dan threshold
Sebuah regresi logistik dilatih pada 100 titik buatan (60 negatif, 40 positif). Kamu menggeser threshold dan mengamati contoh mana yang menjadi false positive atau false negative, dengan hitungan, precision, recall, dan log loss di samping grafik sigmoid.

### Kontrol
- **Data** berpindah antara **Data buatan** dan **Penguin (data nyata)**. Data nyata menanyakan apakah seekor penguin adalah Gentoo (positif) atau spesies lain (negatif), dari **Panjang paruh (mm)** dan **Massa tubuh (kg)**. Catatan di bawah kontrol memberi hitungannya: 342 dari 344 penguin, 2 baris dengan missing value dibuang, 123 Gentoo.
- **Threshold** (0,05 sampai 0,95 dengan langkah 0,01, mulai dari 0,50) adalah batas untuk memprediksi sebuah contoh positif.
- **Atur threshold ke 0,5** mengembalikannya ke 0,50.
- **Sampel baru** menggambar sampel buatan yang baru, lalu model dilatih ulang. Tombol ini nonaktif untuk data nyata.
- **Tampilkan arsiran probabilitas** menyalakan atau mematikan warna probabilitas di belakang titik. Awalnya menyala.
- Keyboard: fokus ke plot, lalu tombol panah kiri dan kanan menggeser threshold sebesar 0,01 (Shift untuk 0,05).
- **Kuis Cepat** adalah tombol di bawah kartu pengaturan (tombol bulat di kanan bawah pada ponsel) (lencananya menghitung kuis yang belum kamu jawab; tombol ini membuka panel kecil): "Jika kamu menurunkan threshold, apa yang terjadi pada false positive dan false negative?" Pilih satu jawaban, lalu geser threshold ke bawah 0,5 untuk melihat apakah kamu benar.
- **Layar penuh** memperbesar lab. **Reset** mengembalikan ke data buatan, sampel awal, threshold 0,50, arsiran menyala, dan prediksi dikosongkan.

### Membaca layar
- Scatterplot, dengan sumbu **Feature 1** dan **Feature 2** (atau **Panjang paruh (mm)** dan **Massa tubuh (kg)**), menampilkan titik **Kelas negatif (0)** dan **Kelas positif (1)**, atau **Spesies lain (negatif)** dan **Gentoo (positif)**. Garis tegas adalah **Batas pada threshold-mu**; garis putus-putus adalah **Batas pada 0,5**. Keduanya menjadi garis yang sama ketika threshold 0,50.
- Lingkaran penuh menandai **False positive (lingkaran penuh)** dan lingkaran putus-putus menandai **False negative (lingkaran putus-putus)**.
- Grafik **Sigmoid: dari skor ke probabilitas** menempatkan setiap contoh pada kurva sesuai skornya (**Skor (log-odds)** ke samping, **Probabilitas positif** ke atas). Garis putus-putus menandai threshold-mu, dan titik di kanan garis vertikal diprediksi positif. Sebuah label menyebut threshold dan "diprediksi positif".
- Baris status berbunyi "Threshold 0,20: 60 dari 100 contoh diprediksi positif. True positive 38, false positive 22, true negative 38, false negative 2." Baris detail menjelaskan precision dan recall, dan di sisi kanan kotak status kamu melihat "Precision 63,3% · Recall 95,0%".
- Tabel **Hitungan dan skor pada threshold ini** punya kolom **Ukuran**, **Pada threshold 0,5**, dan **Pada threshold-mu (0,20)**, serta baris **Diprediksi positif**, **True positive**, **False positive**, **True negative**, **False negative**, **Precision**, **Recall**, dan **Log loss**. Nilai yang berbeda dari kolom 0,5 dicetak tebal. Bila tidak ada yang diprediksi positif, precision bernilai n/a.

### Eksperimen
Angka di bawah berlaku untuk sampel buatan yang pertama. Jika kamu sudah menekan **Sampel baru**, tekan **Reset** dulu agar angkamu sama.

1. **Turunkan.** Prediksikan: pilih satu jawaban di **Kuis Cepat**. Lalu atur **Threshold** ke 0,20. Baris status menunjukkan 60 dari 100 diprediksi positif, 22 false positive dan 2 false negative, dibandingkan 6 dan 10 pada 0,50. Beberapa saat kemudian kotak itu memberi penjelasan. Mengapa threshold yang lebih rendah tidak pernah bisa menghapus false positive?
2. **Naikkan.** Prediksikan: pada 0,90, apakah precision dan recall sama-sama naik? Atur **Threshold** ke 0,90. Hanya 13 contoh yang diprediksi positif dan semuanya benar: 0 false positive, 27 false negative. Precision 100,0% tetapi recall 32,5%. Apa yang disembunyikan oleh precision yang sempurna?
3. **Ke mana garisnya pergi.** Prediksikan: pada 0,80, apakah garis batas yang tegas bergeser ke arah kelompok negatif atau kelompok positif? Atur **Threshold** ke 0,80, lalu lihat **Batas pada threshold-mu** dan **Batas pada 0,5**. Kemudian lihat grafik sigmoid: garis vertikalnya berada pada skor 1,39, dan 22 titik berada di kanannya. Matikan lalu nyalakan lagi **Tampilkan arsiran probabilitas** untuk melihat probabilitas di balik titik-titiknya.
4. **Yang tidak bergerak.** Prediksikan: apakah **Log loss** berubah ketika kamu menyeret **Threshold**? Seret dari 0,05 ke 0,95 dan baca tabelnya. **Log loss** tetap 0,352 di kedua kolom, sementara hitungan, **Precision**, dan **Recall** berubah. Tekan **Atur threshold ke 0,5** untuk kembali. Mengapa probabilitasnya tetap sama?
5. **Beri harga pada kesalahan.** Prediksikan: jika kasus terlewat berbiaya 5 dan alarm palsu 1, mana di antara 0,2, 0,5, dan 0,8 yang total biayanya paling rendah? Baca baris **False positive** dan **False negative** pada masing-masing, lalu hitung false positive + 5 × false negative: 32, 56, dan 96. Kemudian tanyakan hal yang sama dengan kedua biaya setara, dan cari total terendah dari false positive ditambah false negative (15, pada 0,57 atau 0,58). Threshold mana yang akan kamu pilih untuk tiap pekerjaan?
6. **Penguin dan sampel baru.** Prediksikan: pada penguin nyata, apakah threshold yang lebih rendah kembali memberi lebih banyak false positive dan lebih sedikit false negative? Tekan **Reset**, atur **Data** ke **Penguin (data nyata)**, lalu baca tabel pada 0,50 (108 true positive, 13 false positive, 15 false negative, **Precision** 89,3%, **Recall** 87,8%), kemudian pada 0,20 (28 dan 6) dan 0,80 (2 dan 31). Setelah itu atur **Data** kembali ke **Data buatan**, tekan **Atur threshold ke 0,5**, dan tekan **Sampel baru** sekali. Pada 0,50 false positive dan false negative-nya adalah 5 dan 4, dan angkanya sama pada 0,40 dan 0,45: sebuah hitungan baru berubah saat threshold melewati sebuah titik. Tekan **Sampel baru** dua kali lagi untuk melihat 9 dan 8, lalu 4 dan 4, dan turunkan threshold ke 0,20 pada tiap sampel (9 dan 3, 16 dan 0, 9 dan 1). Apakah pola threshold rendah itu berlaku pada setiap sampel?
