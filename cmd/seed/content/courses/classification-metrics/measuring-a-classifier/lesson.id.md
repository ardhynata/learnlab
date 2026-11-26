---
slug: measuring-a-classifier
title: Mengukur sebuah classifier
---
::: intro
- Jelaskan bagaimana sebuah skor dan sebuah threshold menghasilkan empat hitungan pada confusion matrix.
- Kenali jebakan accuracy dengan membandingkan accuracy dengan baseline "selalu jawab tidak".
- Perkirakan bagaimana menggeser threshold mengubah recall, precision, dan titik pada kurva ROC.

Sebelum mulai: baca "Confusion matrix dan rasio-rasionya".
:::

## Skor dan threshold
*Bagaimana sebuah classifier mengubah satu angka menjadi jawaban ya atau tidak?*

Banyak classifier tidak langsung menjawab ya atau tidak. Mereka memberi setiap kasus sebuah **skor**: makin tinggi skornya, makin besar kemungkinan jawabannya ya. Untuk mendapatkan jawaban, kamu menentukan sebuah **threshold**. Skor yang sama dengan threshold atau di atasnya menjadi ya, sedangkan skor di bawahnya menjadi tidak.

Yang kamu cari adalah kelas **positif**, misalnya suatu penyakit atau pembayaran yang curang. Positif tidak berarti baik.

Lab **Skor dan threshold** membuat skornya sendiri. Skor kasus negatif berpusat di sekitar 0, skor kasus positif berpusat di sekitar nilai **Jarak antarkelas**, dan keduanya menyebar dengan simpangan baku 1. Skor-skor ini angka buatan pada skala sembarang, sehingga skor negatif tidak masalah.

Skor yang sama memberi jawaban berbeda pada threshold yang berbeda. Karena itu ada dua hal yang perlu dinilai: seberapa baik skor memisahkan kedua kelas, dan seberapa baik satu pilihan cut. **Cut** hanyalah threshold yang dipilih.

> Gagasan kunci: mutu sebuah classifier punya dua bagian, yaitu skornya dan cut-nya. Satu confusion matrix hanya menggambarkan satu cut. Kurva ROC (receiver operating characteristic) menggambarkan semua cut sekaligus.

## Satu threshold, empat hitungan
*Seperti apa confusion matrix pada layar pertama lab?*

"Confusion matrix dan rasio-rasionya" sudah memberimu empat hitungan dan rasio yang dibangun darinya. Berikut angka-angka itu untuk layar awal lab: 2.000 kasus, 100 di antaranya positif (5 persen), threshold 2,5.

| | Prediksi ya | Prediksi tidak |
|---|---|---|
| **Aslinya ya** | TP = 36 | FN = 64 |
| **Aslinya tidak** | FP = 5 | TN = 1.895 |

> Contoh hitungan: accuracy = (36 + 1.895) / 2.000 = 0,9655. Precision = 36 / (36 + 5) = 0,878. Recall = 36 / (36 + 64) = 0,36. F1 = 2 x 36 / (2 x 36 + 5 + 64) = 72 / 141 = 0,511. False-positive rate = 5 / (5 + 1.895) = 0,003.

Lab menampilkan accuracy sebagai 96,5%, karena 96,55 tepat berada di batas pembulatan. Bacalah angka-angka itu sebagai satu kesatuan. Precision-nya tinggi: ketika menjawab ya, hampir selalu benar. Recall-nya rendah: 64 dari 100 positif terlewat.

## Jebakan accuracy
*Mungkinkah sebuah classifier 96 persen akurat tetapi tetap melewatkan sebagian besar yang kamu cari?*

Bandingkan dengan classifier yang sama sekali tidak berpikir dan menjawab "tidak" untuk setiap kasus. Ia benar pada seluruh 1.900 negatif dan salah pada seluruh 100 positif.

- Accuracy = 1.900 / 2.000 = 0,95.
- Recall = 0 / 100 = 0. Tidak ada yang ditemukan.

Dengan demikian, classifier yang sebenarnya, dengan 0,9655, hanya mengungguli sikap tidak berbuat apa-apa sebesar 0,0155, sekitar satu setengah poin, padahal ia masih melewatkan 64 dari 100 positif. Penyebabnya adalah **class imbalance**: ketika positif jarang, negatif mendominasi hitungan, sehingga accuracy pada dasarnya hanya mengukur seberapa banyak negatifnya.

> Awas: pada data yang imbalanced, selalu bandingkan accuracy dengan baseline "selalu jawab tidak", yang tidak lain adalah proporsi negatif. Setelah itu, lihat recall dan precision.

Lab melakukan perbandingan ini untukmu. Baris status menampilkan "Jebakan accuracy" ketika accuracy tinggi dan recall rendah, dan baris kedua menyebutkan skor yang akan didapat jika model selalu menjawab tidak. Pelajaran berikutnya, "Class imbalance", membahas lebih dalam mengapa ini terjadi dan apa yang dapat dilakukan.

## Menggeser threshold
*Apa yang terjadi pada kesalahan ketika cut digeser?*

Bayangkan skor kedua kelas sebagai dua bukit yang saling tumpang tindih: negatif sebagian besar di sisi rendah, positif sebagian besar di sisi tinggi. Threshold adalah garis vertikal, dan semua yang berada di kanannya menjadi ya.

[[figure:measuring-a-classifier/score-regions|Dua kelas dengan skor yang tumpang tindih, masing-masing digambar sebagai proporsi dari kelasnya sendiri sehingga kedua bukit sama tingginya. Threshold membagi tiap bukit menjadi bagian yang benar dan bagian yang salah, sehingga terbentuk empat hitungan.]]

Geser garis ke kiri, maka lebih banyak kasus yang ditandai: kamu menangkap lebih banyak positif, tetapi lebih banyak negatif ikut ditandai. Berikut angka-angka lab untuk kasus bawaan:

| Threshold | TP | FP | FN | Precision | Recall | Accuracy |
|---|---|---|---|---|---|---|
| 2,5 | 36 | 5 | 64 | 87,8% | 36,0% | 96,5% |
| 2,0 | 54 | 46 | 46 | 54,0% | 54,0% | 95,4% |
| 1,0 | 87 | 300 | 13 | 22,5% | 87,0% | 84,4% |
| 0,5 | 94 | 581 | 6 | 13,9% | 94,0% | 70,7% |

[[figure:measuring-a-classifier/threshold-sweep|Sampel yang sama pada setiap threshold. Recall turun ketika cut bergeser ke kanan, sedangkan precision naik. Accuracy tidak pernah melampaui garis putus-putus "selalu jawab tidak" lebih dari dua poin, sehingga kedua tren itu tersembunyi.]]

Kedua jenis kesalahan tidak bisa turun bersamaan, karena kedua bukit saling tumpang tindih. Hanya skor yang lebih baik yang dapat melakukannya.

## Memilih cut dari biaya
*Threshold mana yang terbaik ketika kedua kesalahan berbiaya berbeda?*

Kasus yang terlewat dan alarm palsu jarang berbiaya sama, sehingga cut terbaik bergantung pada biayanya.

::: deeper Memilih threshold dari biaya
Misalkan satu kasus yang terlewat berbiaya 10 dan satu alarm palsu berbiaya 1. Total biaya = 10 x FN + FP. Pada threshold 2,5 biayanya 10 x 64 + 5 = 645. Pada 2,0 biayanya 10 x 46 + 46 = 506, pada 1,5 biayanya 10 x 23 + 129 = 359, dan pada 1,0 biayanya 10 x 13 + 300 = 430. Cut termurah di lab adalah 1,6, dengan 10 x 24 + 108 = 348. Ubah biayanya, dan threshold terbaik ikut bergeser; skornya tetap sama.
:::

## Kurva ROC dan AUC
*Bagaimana kita menilai skor tanpa memilih threshold?*

**Kurva ROC** menampilkan semua threshold sekaligus. Namanya bersifat historis dan yang penting hanyalah bentuknya. Setiap threshold adalah satu titik: false-positive rate di sumbu horizontal, true-positive rate (recall) di sumbu vertikal.

[[figure:measuring-a-classifier/roc-curve|Kurva ROC dari sampel bawaan lab, dengan empat threshold ditandai. Diagonal putus-putus adalah classifier tanpa kemampuan apa pun.]]

- Threshold di atas semua skor tidak menandai apa pun: titik (0, 0).
- Threshold di bawah semua skor menandai semuanya: titik (1, 1).
- Skor yang tidak membawa informasi menghasilkan **diagonal**. Pada setiap threshold, classifier semacam itu menandai proporsi positif dan negatif yang sama.
- Skor yang baik melengkung ke arah pojok kiri atas: recall tinggi pada false-positive rate yang rendah.

Baris-baris pada tabel tadi adalah empat titik pada kurva ini: (0,003; 0,360), (0,024; 0,540), (0,158; 0,870), dan (0,306; 0,940). **AUC**, luas area di bawah kurva, merangkum seluruh kurva menjadi satu angka: 0,5 untuk kebetulan, 1,0 untuk sempurna. Di sini nilainya 0,931.

::: deeper Arti AUC, dan apa yang disembunyikannya
Ambil satu positif acak dan satu negatif acak. AUC adalah peluang bahwa positif itu mendapat skor lebih tinggi, dengan skor yang persis sama dihitung setengah. Karena itu 0,5 berarti skornya tidak lebih baik dalam mengurutkan daripada lemparan koin.

AUC tidak menyatakan berapa banyak jawaban ya yang benar. Pada threshold 1,0 AUC-nya 0,931, tetapi hanya 22,5 persen jawaban ya yang benar-benar positif.
:::

## Skor atau threshold
*Pengaturan mana yang mengubah skor, dan mana yang hanya menggeser cut?*

Menggeser threshold hanya menggeser titik di sepanjang satu kurva ROC yang tetap. Kurva dan AUC-nya tidak pernah berubah. Hanya perubahan pada skornya sendiri, misalnya **Jarak antarkelas** yang lebih besar, yang membengkokkan kurva.

Biarkan threshold di 1,0 dan ubah jaraknya:

| Jarak antarkelas | False-positive rate | Recall | AUC |
|---|---|---|---|
| 0 | 15,8% | 19,0% | 0,539 |
| 2 | 15,8% | 87,0% | 0,931 |
| 4 | 15,8% | 100% | 0,998 |

False-positive rate tetap 15,8 persen karena ia hanya melihat kasus negatif, dan skor negatif tidak bergerak. Recall naik karena positif bergerak menjauhi negatif. Pada jarak 0, recall (19,0 persen) dekat dengan false-positive rate (15,8 persen): classifier menandai kedua kelas dengan laju yang hampir sama, dan itu tidak lebih baik dari lemparan koin.

Precision juga bergantung pada seberapa jarang positif itu. Pada cut yang sama, 5 persen positif memberi precision 22,5 persen, sedangkan 50 persen positif memberi 84,2 persen. Skornya tidak membaik; pelajaran berikutnya menjelaskan sebabnya.

## Tiga kesalahan yang perlu dihindari
*Apa yang sering salah ketika orang mengukur classifier?*

1. **Memilih metrik setelah melihat hasilnya.** Jika kamu mencoba beberapa metrik lalu mengumumkan yang membuat modelmu tampak bagus, kamu sedang menipu diri sendiri. Putuskan lebih dulu apa yang penting. Threshold adalah pengaturan yang kamu tuning, karena itu pilihlah pada data validation, seperti di "Train, validation, dan test", dan laporkan angka akhirnya pada data test.
2. **Mengabaikan biaya dari tiap kesalahan.** Accuracy menghitung semua kesalahan sama rata, padahal penyakit yang terlewat dan alarm palsu adalah dua masalah yang berbeda. Tuliskan berapa biaya masing-masing, lalu pilih metrik dan threshold yang sesuai.
3. **Membandingkan model pada threshold yang berbeda.** Dua model pada dua cut yang berbeda berbeda dalam dua hal sekaligus, sehingga kamu tidak dapat mengetahui skor siapa yang lebih baik. Bandingkan pada threshold yang sama, atau bandingkan seluruh kurva ROC.

::: remember
- Sebuah classifier memberi skor, dan threshold mengubahnya menjadi ya dan tidak. Confusion matrix menghitung TP, FP, TN, dan FN untuk satu threshold.
- Bandingkan accuracy dengan baseline "selalu jawab tidak". Threshold yang lebih rendah menaikkan recall dan alarm palsu sekaligus, dan menurunkan precision.
- Kurva ROC menampilkan semua threshold. Menggeser threshold hanya menggeser titik di sepanjang kurva, dan hanya skor yang lebih baik yang membengkokkannya. AUC 0,5 berarti kebetulan dan 1,0 berarti sempurna.
:::

@@lab

## Lab: Skor dan threshold
Setiap kasus mendapat skor sintetis dengan seed: kasus negatif berpusat di 0, kasus positif berpusat di nilai **Jarak antarkelas**, dan keduanya menyebar sebesar 1. Geser threshold dan amati bagaimana setiap angka bereaksi. Angka-angka di bawah berlaku untuk keadaan awal bawaan (2.000 kasus, 5 persen positif, Jarak antarkelas 2) sebelum **Sampel baru** ditekan; tekan **Reset** jika angkamu berbeda.

### Kontrol
- **Threshold** (-3 sampai 6, mulai dari 2,5): skor yang sama dengan threshold atau di atasnya dijawab ya. Garis putus-putus pada histogram menunjukkannya. Kamu juga dapat menyeret garisnya atau mengklik plot, dan dengan keyboard, fokuskan plot lalu gunakan tombol panah (Shift untuk langkah yang lebih besar).
- **Persentase kasus positif** (1 sampai 50 persen, mulai dari 5): seberapa jarang kasus positif itu.
- **Jarak antarkelas** (0 sampai 4, mulai dari 2): seberapa jauh kedua rata-rata kelas terpisah, dalam satuan sebarannya. Pada 0, skornya tidak memberi informasi apa pun.
- **Jumlah kasus** (100 sampai 5.000, mulai dari 2.000): berapa banyak kasus yang dibuat.
- **Tampilkan sebagai % dari tiap kelas**: menggambar ulang histogram sehingga positif yang jarang tampak setinggi negatif.
- **Sampel baru** membuat kasus baru dengan pengaturan yang sama. **Reset** mengembalikan semuanya.

### Membaca layar
- Kalimat status di bawah judul, misalnya "Jebakan accuracy: accuracy-nya 96,5%, tetapi hanya 36 dari 100 kasus positif yang ditemukan (recall 36,0%)." Di bawahnya: "Jika model selalu menjawab tidak, accuracy-nya tetap 95,0% untuk 2.000 kasus ini." Di sisi kanan, hitungan seperti "2.000 kasus, 100 positif".
- Histogram **Skor classifier**: indigo untuk **Aslinya tidak**, merah muda untuk **Aslinya ya**. Di atasnya, hitungan empat hasil pada tiap sisi garis: FN dan TN di sisi **Prediksi tidak**, TP dan FP di sisi **Prediksi ya**. Legenda menamainya: **TP terdeteksi**, **FP alarm palsu**, **TN diabaikan**, **FN terlewat**.
- **Confusion matrix**: baris **Aslinya ya** dan **Aslinya tidak**, kolom **Prediksi ya** dan **Prediksi tidak**, dengan empat hitungan besar **True positive (TP)**, **False negative (FN)**, **False positive (FP)**, dan **True negative (TN)**.
- Enam tile di bawah matrix: **Accuracy**, **Precision**, **Recall**, **F1**, **False-positive rate**, dan **AUC**. Precision menampilkan "belum ada" ketika tidak ada yang ditandai.
- **Kurva ROC** dengan **True-positive rate (recall)** di sumbu vertikal dan **False-positive rate** di sumbu horizontal. Titiknya adalah threshold saat ini, dan diagonal putus-putus adalah **tebak acak**.

### Eksperimen
1. **Jebakan pada layar pertama.** Prediksikan: apakah classifier yang accuracy-nya 96,5 persen sudah bekerja dengan baik? Baca kalimat status dan baris keduanya. Accuracy-nya 96,5%, baseline selalu-tidak 95,0%, dan recall hanya 36,0%: 64 dari 100 positif terlewat. Sekarang nyalakan **Tampilkan sebagai % dari tiap kelas**. Ke-100 positif yang tadi nyaris tak terlihat kini setinggi 1.900 negatif. Jelaskan mengapa accuracy menyembunyikan hal ini.
2. **Turunkan threshold.** Prediksikan: ketika **Threshold** turun dari 2,5 ke 1,0, apa yang terjadi pada recall, precision, accuracy, dan titik pada **Kurva ROC**? Lalu geser. Recall naik dari 36,0% menjadi 87,0%, tetapi FP melonjak dari 5 menjadi 300, precision turun menjadi 22,5%, dan accuracy turun menjadi 84,4%, di bawah baseline 95,0%. Titiknya bergeser ke atas dan ke kanan di sepanjang satu kurva, dan **AUC** tetap 0,931. Kemudian geser threshold ke 6: tidak ada yang ditandai, accuracy sama dengan baseline, dan precision menampilkan "belum ada".
3. **Cari cut terbaik.** Prediksikan: apakah threshold dengan **F1** terbaik juga memiliki **Accuracy** terbaik? Coba threshold antara 1,5 dan 3. F1 mencapai puncak di 2,1 (55,2%), dengan precision 61,7% dan recall 50,0%. Accuracy tertinggi di 2,4 dan 2,5 (sekitar 96,5%), ketika recall hanya 39% dan 36%. Pada 2,0, precision dan recall sama-sama 54,0%. Cut mana yang kamu pilih untuk tes skrining, dan mengapa berbeda dari pemenang accuracy?
4. **Skor yang lebih baik atau cut yang berbeda?** Prediksikan: jika kamu mengubah **Jarak antarkelas** dari 2 ke 0 lalu ke 4, dengan **Threshold** di 1,0, angka mana yang berubah? Lihat **False-positive rate**, **Recall**, dan **AUC**. False-positive rate tetap 15,8%. Recall berubah 19,0%, 87,0%, 100%, dan AUC berubah 0,539, 0,931, 0,998. Pada 0, **Kurva ROC** menempel pada diagonal **tebak acak**. Jelaskan mengapa menggeser threshold tidak dapat melakukan apa yang dilakukan jarak yang lebih besar.
5. **Positif yang lebih jarang atau lebih sering.** Prediksikan: dengan **Jarak antarkelas** 2 dan **Threshold** 1,0, apa yang terjadi pada precision jika **Persentase kasus positif** berubah dari 5 menjadi 50 persen? Cobalah. Precision melonjak dari 22,5% menjadi 84,2% sementara AUC tetap sekitar 0,92. Classifier-nya tidak menjadi lebih baik; yang berubah adalah arti jawaban ya, karena kelangkaan positifnya berubah.
6. **Sampel baru.** Prediksikan: apakah gagasan dari eksperimen 2, bahwa threshold yang lebih rendah menaikkan recall dan alarm palsu, berlaku pada setiap sampel? Tekan **Reset**, yaitu sampel 1, lalu baca **Recall** dan FP pada threshold 2,5 dan 1,0. Kemudian tekan **Sampel baru** tiga kali dan ulangi untuk sampel 2, 3, dan 4. Recall bergerak dari 36 ke 87, 39 ke 90, 34 ke 85, dan 41 ke 83 persen, dan FP naik setiap kali. Sekarang tekan **Reset**, atur **Threshold** ke 1,5 dan **Jumlah kasus** ke 100, lalu tekan **Sampel baru** empat kali. Dengan hanya sekitar 5 positif, precision berubah-ubah: 30,8%, 23,1%, 50,0%, 27,3%, dan 66,7% pada sampel 1 sampai 5. Atur **Jumlah kasus** ke 5.000 dan precision tetap di antara 34 dan 37 persen. Apa artinya ini bagi kepercayaanmu pada satu test set yang kecil?
