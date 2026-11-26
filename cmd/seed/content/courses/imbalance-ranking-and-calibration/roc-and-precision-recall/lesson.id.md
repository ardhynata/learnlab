---
slug: roc-and-precision-recall
title: ROC dan precision-recall
---
::: intro
- Bangun kurva ROC beserta AUC-nya dengan tangan dari enam kasus yang punya skor, dan baca AUC sebagai hitungan pasangan yang menang.
- Bangun kurva precision-recall dan average precision dari enam kasus yang sama.
- Jelaskan mengapa precision-recall lebih jujur ketika kasus positif jarang, dan apa yang dilakukan class weighting serta resampling pada skor.

Sebelum mulai: baca "Mengukur sebuah classifier" dan "Class imbalance" pada course Metrik klasifikasi. Yang pertama memperkenalkan skor, threshold, dan kurva ROC. Yang kedua menunjukkan apa yang terjadi pada accuracy dan precision ketika kasus positif jarang.
:::

## Menilai skor, bukan satu cut
*Apa yang diberitahukan sebuah ranking dan tidak diberitahukan oleh satu confusion matrix?*

"Mengukur sebuah classifier" ditutup dengan pemisahan dua hal: model memberi setiap kasus sebuah **skor**, dan sebuah **threshold** mengubah skor menjadi ya atau tidak. Satu confusion matrix hanya menggambarkan satu threshold. Sebuah **kurva** menggambarkan semuanya sekaligus, sehingga ia menilai skornya sebelum kamu memilih cut.

Pertanyaan yang dijawab kurva adalah soal **ranking**: jika kasus diurutkan dari skor tertinggi ke terendah, apakah kasus positif yang asli berada di depan? Model dengan ranking yang baik membiarkanmu memilih cut belakangan, berdasarkan biaya setiap jenis kesalahan. Pilihan itu menjadi topik pelajaran berikutnya, "Kalibrasi dan biaya".

Pelajaran ini membangun kedua kurva dengan tangan pada enam kasus, sehingga tidak ada langkah yang tersembunyi. Setelah itu kita bertanya kurva mana yang lebih layak dipercaya ketika kasus positif jarang, dan apa yang dilakukan perbaikan umum untuk imbalance pada skor.

Di seluruh pelajaran ini, sebuah kasus disebut positif jika skornya sama dengan threshold atau di atasnya.

## Enam kasus dan satu penelusuran
*Bagaimana cara menggambar kurva ROC dari daftar skor?*

Ada enam kasus, tiga positif dan tiga negatif, masing-masing dengan sebuah skor. Urutkan dari skor tertinggi ke bawah. Mulai dari titik (0, 0), lalu telusuri daftarnya sambil menurunkan threshold sampai tepat memasukkan satu kasus lagi setiap kali. Kasus positif yang asli menggeser titik **naik** sebesar 1/3, karena ia salah satu dari 3 positif. Kasus negatif yang asli menggesernya **ke kanan** sebesar 1/3, karena ia salah satu dari 3 negatif.

| Kasus | Skor | Kebenaran | TP | FP | False-positive rate | True-positive rate |
|---|---|---|---|---|---|---|
| A | 0,9 | positif | 1 | 0 | 0 | 1/3 |
| B | 0,8 | negatif | 1 | 1 | 1/3 | 1/3 |
| C | 0,7 | positif | 2 | 1 | 1/3 | 2/3 |
| D | 0,6 | positif | 3 | 1 | 1/3 | 1 |
| E | 0,4 | negatif | 3 | 2 | 2/3 | 1 |
| F | 0,2 | negatif | 3 | 3 | 1 | 1 |

Setiap baris adalah threshold yang diatur pada skor kasus itu. Hasilnya berupa tangga dari (0, 0) sampai (1, 1).

[[figure:roc-and-precision-recall/roc-by-hand|Kurva ROC dari enam kasus. Titik penuh adalah positif asli, lingkaran kosong adalah negatif asli, dan area yang diarsir adalah AUC.]]

> Gagasan kunci: kurva ROC hanya bergantung pada urutan skor, tidak pernah pada nilainya. Ubah 0,9 menjadi 0,99 dan tangganya tidak bergeser.

## AUC adalah hitungan pasangan
*Mengapa luas di bawah tangga sama dengan pecahan pasangan yang menang?*

Ada 3 x 3 = 9 pasangan yang terdiri dari satu positif dan satu negatif. Sebuah pasangan **menang** jika positifnya punya skor lebih tinggi.

> Contoh hitungan: A (0,9) mengalahkan B, E, dan F: 3 kemenangan. C (0,7) mengalahkan E dan F tetapi kalah dari B (0,8): 2 kemenangan. D (0,6) mengalahkan E dan F tetapi kalah dari B: 2 kemenangan. Totalnya 3 + 2 + 2 = 7 kemenangan dari 9, sehingga AUC = 7/9 = 0,78.

Sekarang hitung luasnya, kolom demi kolom. Setiap langkah ke kanan adalah satu negatif, dan tinggi kurva pada langkah itu adalah porsi positif yang skornya di atasnya. B punya 1 dari 3 positif di atasnya (A): tinggi 1/3. E dan F punya ketiganya: tinggi 1. Luas = 1/3 x (1/3 + 1 + 1) = 7/9. Angkanya sama karena keduanya menghitung hal yang sama.

Jadi AUC 0,78 berarti: ambil satu positif dan satu negatif secara acak, dan positifnya mendapat skor lebih tinggi sekitar 78 kali dari 100. Skor yang persis sama dihitung setengah kemenangan.

> Awas: AUC tidak mengatakan apa pun tentang berapa banyak jawaban ya-mu yang benar. Ia tidak memperhitungkan cut, dan seperti yang ditunjukkan bagian berikutnya, juga tidak memperhitungkan seberapa jarang kasus positifnya.

## Kurva precision-recall
*Apa yang digambarkan kurva kedua, dan bagaimana membacanya?*

Telusuri lagi daftar yang sudah diurutkan itu, tetapi sekarang catat **precision** (TP / (TP + FP)) dan **recall** (TP / 3, angka yang sama dengan true-positive rate).

| Setelah kasus | TP | FP | Recall | Precision |
|---|---|---|---|---|
| A | 1 | 0 | 1/3 | 1 |
| B | 1 | 1 | 1/3 | 1/2 |
| C | 2 | 1 | 2/3 | 2/3 |
| D | 3 | 1 | 1 | 3/4 |
| E | 3 | 2 | 1 | 3/5 |
| F | 3 | 3 | 1 | 1/2 |

Kurvanya sekarang bukan tangga. Precision turun setiap kali sebuah negatif masuk (B, E, F) dan pulih ketika sebuah positif masuk. Ranker yang baik menjaga precision tetap tinggi sementara recall bertambah.

**Average precision** (AP) merangkum kurva ini: ambil precision pada setiap positif asli, yaitu saat recall naik, lalu rata-ratakan. Di sini (1 + 2/3 + 3/4) / 3 = 0,81. Sebagian tools menghitungnya sedikit berbeda, misalnya dengan interpolasi, sehingga angka dari sebuah library dapat berbeda dari hitungan tangan pada digit terakhir.

[[figure:roc-and-precision-recall/pr-by-hand|Titik-titik precision-recall dari enam kasus. Langkah yang diarsir adalah luas yang diukur AP, dan garis putus-putus adalah classifier tanpa kemampuan.]]

Garis tanpa kemampuan itu datar pada **positive rate**, di sini 3/6 = 0,5, karena menandai kasus secara acak menghasilkan precision yang sama dengan porsi positif. Ini bukan diagonal pada plot ROC.

## Mengapa precision-recall lebih jujur ketika kasus positif jarang
*Mengapa satu ranker dapat tampak sangat baik pada ROC tetapi buruk pada precision-recall?*

Ambil pembayaran dari "Class imbalance": 10.000 pembayaran, 100 di antaranya penipuan. Sebuah sistem skor punya cut yang menandai 80 dari 100 penipuan dan 495 dari 9.900 pembayaran sah. Titik ROC-nya (495 / 9.900, 80 / 100) = (0,05; 0,80), yang tampak kuat. Precision-nya 80 / (80 + 495) = 0,14: sekitar 6 dari 7 pembayaran yang ditandai ternyata sah.

Pertahankan ranker dan cut yang sama, tetapi misalkan 10.000 pembayaran itu terdiri dari 5.000 penipuan dan 5.000 sah. Sekarang 4.000 penipuan dan 250 pembayaran sah yang ditandai. Titik ROC-nya tetap (0,05; 0,80), sedangkan precision-nya 4.000 / 4.250 = 0,94.

Sumbu ROC membagi dengan ukuran masing-masing kelas, sehingga positive rate saling meniadakan. Precision membagi dengan jumlah kasus yang ditandai, yang mencampur kedua kelas, sehingga ia ikut bergerak bersama positive rate.

[[figure:roc-and-precision-recall/rare-positives|Satu ranker pada dua positive rate. Kurva ROC-nya sama, sedangkan kurva precision-recall turun jauh lebih rendah pada 1 persen positif.]]

Pada model ideal dalam gambar (skor dari dua kurva lonceng dengan sebaran yang sama), AUC-nya sekitar 0,96 pada kedua rate, tetapi AP-nya sekitar 0,96 pada 50 persen positif dan sekitar 0,47 pada 1 persen. ROC tidak salah. Ia menjawab apakah positif mengungguli negatif, dan itu tidak bergantung pada rate. Precision-recall menjawab hal yang kamu tindak lanjuti: berapa banyak kasus yang ditandai ternyata nyata, pada rate yang akan kamu hadapi.

## Class weighting dan resampling
*Apa yang dilakukan perbaikan imbalance pada skor?*

"Class imbalance" menyebut dua perbaikan: **class weight**, yang membuat setiap kasus langka lebih berbobot dalam loss, dan **resampling**, yang mengulang kasus langka atau membuang kasus umum. Keduanya mengubah training, sehingga keduanya mengubah skor yang menjadi dasar kurva.

Efek yang paling jelas adalah pergeseran. Pada model yang skornya berupa log-odds, memberi setiap positif bobot w kira-kira mengalikan odds yang diprediksi model dengan w. Urutan kasus juga dapat berubah sedikit, karena model dilatih secara berbeda, tetapi pergeseran itulah perubahan utamanya.

> Contoh hitungan: sejenis pembayaran sebenarnya punya peluang penipuan 1 persen, yaitu odds 1 banding 99. Beri setiap penipuan bobot 99 dan model memprediksi odds sekitar 99 banding 99, yaitu 0,50. Kasus itu diranking sama, tetapi skornya tidak lagi sesuai dengan seberapa sering penipuan terjadi.

Jadi setelah diberi bobot, threshold 0,5 menandai jauh lebih banyak pembayaran, dan skornya bukan lagi probabilitas penipuan. Pelajaran berikutnya, "Kalibrasi dan biaya", membahas tepat kesenjangan itu.

> Awas: lakukan resampling sesudah pemisahan data, dan hanya pada bagian training. Salinan satu kasus penipuan yang ada di training sekaligus validation membuat model tampak lebih baik daripada sebenarnya, yaitu leakage seperti pada "Pipeline dan leakage". Evaluasi pada data utuh dengan positive rate yang sebenarnya.

## Kurva mana yang dilaporkan
*Apa yang kamu tulis, dan di mana kamu mencobanya?*

Pakai kedua kurva untuk hal yang dikerjakan masing-masing dengan baik.

- **ROC dan AUC** membandingkan seberapa baik dua model meranking, dan tetap stabil ketika positive rate berbeda antar dataset.
- **Precision-recall dan AP** menggambarkan kasus yang kamu tindak lanjuti. Ketika kasus positif jarang, laporkan AP, precision pada recall yang kamu butuhkan, dan positive rate dari data uji.

Hitung juga jumlah positifmu. Dengan 3 positif, satu kasus dapat menggeser AP beberapa poin. "Variabilitas sampling dan bootstrap" menunjukkan cara memberi interval pada metrik apa pun, termasuk AUC dan AP.

Sebuah kurva tetap tidak memilihkan cut, dan tidak mengatakan apa arti skor 0,8. Pelajaran berikutnya, "Kalibrasi dan biaya", membahas keduanya. Course ini ditutup dengan lab kalibrasi, tempat kamu membandingkan prediksi yang rankingnya hampir sama baik dan melihat bagaimana kalibrasi mengubah keputusan yang kamu ambil dari probabilitasnya.

::: remember
- Kurva ROC adalah penelusuran di sepanjang kasus yang sudah diurutkan: naik untuk positif, ke kanan untuk negatif. AUC adalah porsi pasangan positif dan negatif yang dirankingkan dengan benar, yaitu 7/9 untuk enam kasus tadi.
- Kurva precision-recall menggambarkan precision terhadap recall, dan AP merata-ratakan precision pada setiap positif asli. Garis tanpa kemampuannya berada pada positive rate.
- ROC tidak terpengaruh oleh jarangnya kasus positif, sedangkan precision terpengaruh. Bobot dan resampling menggeser skor, jadi periksa pada data utuh dengan rate yang sebenarnya.
:::
