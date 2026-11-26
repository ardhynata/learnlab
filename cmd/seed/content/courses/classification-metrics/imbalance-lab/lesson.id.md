---
slug: imbalance-lab
title: Lab imbalance
---
::: intro
- Perkirakan bagaimana persentase contoh positif mengubah accuracy sebuah baseline kelas mayoritas dan recall sebuah model yang dilatih, lalu periksa di lab.
- Jelaskan apa yang diubah oleh class weight dan decision threshold, serta berapa harga yang dibayar masing-masing dalam precision.
- Uji sebuah gagasan lebih dulu pada data buatan, lalu pada penguin yang asli dengan sampel yang baru.

Sebelum mulai: baca "Confusion matrix and rates", "Measuring a classifier", dan "Class imbalance".
:::

## Apa yang ditampilkan lab ini
*Apa yang dibandingkan oleh Imbalance lab, dan pada data apa?*

Pelajaran sebelumnya sudah memperingatkan bahwa accuracy menyesatkan ketika positif jarang. Di **Imbalance lab**, kamu membuktikannya sendiri. Lab melatih sebuah regresi logistik dan menaruhnya di samping baseline kelas mayoritas, yaitu "model" yang selalu menjawab negatif.

Datanya berupa dua kelompok titik yang saling tumpang tindih, dibuat dengan seed sehingga semua orang melihat titik yang sama. Seribu contoh melatih model, dan seribu contoh lain yang belum pernah dilihatnya menguji model itu. Kedua set memiliki persentase positif yang kamu pilih, awalnya 5%, dan model menjawab positif ketika probabilitasnya mencapai threshold, awalnya 0,50. Pada pengaturan awal ini, tabelnya seperti berikut.

| Ukuran | Baseline | Regresi logistik |
|---|---|---|
| Accuracy | 95,0% | 96,7% |
| Precision | n/a | 70,7% |
| Recall | 0,0% | 58,0% |
| F1 | 0,0% | 63,7% |

Test set berisi 50 positif. Model menemukan 29 di antaranya, melewatkan 21, dan menimbulkan 12 alarm palsu. Baseline tidak menemukan satu pun, dan precision-nya n/a karena ia tidak pernah menjawab positif.

## Positif makin jarang, baseline makin mudah
*Apa yang terjadi pada skor ketika persentase positif menurun?*

Geser **Persentase contoh positif** turun dari 50% ke 1% dan perhatikan dua angka. Accuracy baseline sama dengan persentase negatif, jadi angkanya naik. Recall model justru turun.

| Persentase positif | Accuracy baseline | Accuracy model | Recall model |
|---|---|---|---|
| 50% | 50,0% | 88,9% | 88,0% |
| 20% | 80,0% | 92,7% | 78,5% |
| 10% | 90,0% | 95,1% | 69,0% |
| 5% | 95,0% | 96,7% | 58,0% |
| 1% | 99,0% | 99,3% | 30,0% |

[[figure:imbalance-lab/share-sweep|Data buatan, sampel awal, threshold 0,50, tanpa class weight. Kedua garis accuracy naik mendekati 100% ketika positif makin jarang, sedangkan garis recall turun.]]

> Contoh hitungan: pada 5%, test set berisi 950 negatif, sehingga baseline mendapat 950 / 1.000 = 95,0%. Model menjawab benar 29 positif dan 938 negatif: (29 + 938) / 1.000 = 96,7%. Selisihnya dari model yang tidak menemukan apa-apa hanya 1,7 poin, padahal selisih recall-nya 58 poin.

> Gagasan kunci: ketika positif jarang, accuracy hampir tidak membedakan model yang berguna dari model yang tidak berguna. Recall yang membedakannya.

Salah satu dugaan penyebab turunnya recall adalah bahwa 950 dari 1.000 contoh training berupa negatif, sehingga loss yang diminimalkan model sebagian besar tersusun dari negatif. Dugaan ini diuji di bagian berikutnya.

## Class weight
*Dapatkah kamu membuat positif yang jarang lebih diperhitungkan saat model dilatih?*

Nyalakan **Beri bobot lebih pada positif (class weight)**. Pada 5%, training set berisi 950 negatif dan 50 positif. Lab menghitung setiap positif 950 / 50 = 19 kali, sehingga seluruh positif bersama-sama berbobot sama dengan seluruh negatif (50 x 19 = 950). Setelah itu model dilatih lagi.

| Pada 5% positif | Tanpa bobot | Class weight |
|---|---|---|
| Positif ditemukan | 29 dari 50 | 43 dari 50 |
| Alarm palsu | 12 | 92 |
| Recall | 58,0% | 86,0% |
| Precision | 70,7% | 31,9% |
| Accuracy | 96,7% | 90,1% |

Dugaan tadi sesuai dengan hasilnya: begitu positif diberi bobot lebih, model condong ke arah positif dan recall melonjak. Harganya adalah 80 alarm palsu tambahan, sehingga precision turun.

> Awas: accuracy model berbobot, 90,1%, kini berada di bawah baseline yang 95,0%. Itu tidak berarti modelnya lebih buruk. Model ini menemukan 43 dari 50 positif, sedangkan baseline tidak menemukan satu pun. Accuracy bukan ukuran yang tepat di sini; apakah 92 alarm palsu dapat diterima bergantung pada biaya sebuah positif yang terlewat dan sebuah alarm palsu.

::: deeper Cara lab memilih bobot
Bobot adalah jumlah negatif dibagi jumlah positif di training set, dibulatkan, dan tidak pernah kurang dari 1. Nilainya 9 pada 10%, 19 pada 5%, 49 pada 2%, dan 99 pada 1%. Pada 50% nilainya 1, jadi tombol ini tidak mengubah apa-apa di sana. Menghitung sebuah positif dengan bobot 19 menghasilkan loss yang sama seperti menuliskan baris itu 19 kali di training set.
:::

## Kualitas model sama, precision lebih rendah
*Mengapa precision turun ketika positif makin jarang, padahal recall bertahan?*

Biarkan **Beri bobot lebih pada positif (class weight)** tetap menyala, lalu geser persentasenya turun lagi. Sekarang recall nyaris tidak turun, sedangkan precision anjlok.

| Persentase positif | Recall | Precision |
|---|---|---|
| 50% | 88,0% | 89,6% |
| 20% | 88,5% | 67,0% |
| 10% | 88,0% | 50,3% |
| 5% | 86,0% | 31,9% |
| 1% | 80,0% | 8,4% |

[[figure:imbalance-lab/precision-fall|Dengan class weight menyala, recall tetap tinggi sementara precision turun mengikuti persentase positif.]]

Modelnya tidak menjadi lebih buruk. Lab melatihnya lagi pada setiap persentase, jadi ini resep yang sama dan bukan model yang persis sama, dan recall serta laju alarm palsunya hampir tidak bergerak. Lihat hitungannya. Pada 50% model menimbulkan 51 alarm palsu di antara 500 negatif, yaitu laju 10,2%, dan menemukan 440 positif. Pada 5% model menimbulkan 92 di antara 950 negatif, laju 9,7%, dan hanya menemukan 43 positif. Laju alarmnya sama, tetapi negatifnya jauh lebih banyak dan positifnya jauh lebih sedikit. Precision adalah 440 / (440 + 51) = 89,6% pada 50% dan 43 / (43 + 92) = 31,9% pada 5%.

> Gagasan kunci: precision bergantung pada seberapa jarang positifnya, bukan hanya pada model. Model dengan kualitas yang sama tampak lebih buruk ketika bertemu positif yang lebih jarang.

## Decision threshold
*Bagaimana jika model hanya butuh probabilitas yang lebih rendah untuk menjawab positif?*

Kembali ke kondisi tanpa class weight pada 5%. Turunkan **Threshold keputusan** dari 0,50 ke 0,20. Garis batas putus-putus bergeser dan sisi yang diarsir, tempat model menjawab positif, melebar. Hitungannya berubah menjadi 35 ditemukan, 15 terlewat, dan 35 alarm palsu.

> Contoh hitungan: recall = 35 / 50 = 70,0%. Precision = 35 / (35 + 35) = 50,0%. F1 = 2 x 35 / (2 x 35 + 35 + 15) = 70 / 120 = 58,3%.

Dua pengaturan lain pada model yang sama:

- Pada 0,10 model menemukan 41 dari 50 (recall 82,0%) dengan 74 alarm palsu (precision 35,7%).
- Pada 0,80 model menemukan 22 (recall 44,0%) tanpa alarm palsu (precision 100,0%).

Perhatikan bahwa pada 0,20 accuracy model adalah 95,0%, persis sama dengan baseline, padahal model menemukan 35 positif.

[[figure:imbalance-lab/two-levers|Precision terhadap recall pada 5% positif. Setiap kurva adalah satu model dengan threshold yang digeser; keempat titik bertanda adalah pengaturan dari lab ini.]]

Class weight dan threshold bekerja dengan cara berbeda. Class weight mengubah model dengan melatihnya lagi. Threshold mempertahankan model dan hanya menggeser batas pemotongnya. Di lab ini keduanya bergerak di sepanjang trade-off yang hampir sama: bobot pada 0,50 memberi recall 86,0% dan precision 31,9%, sedangkan model biasa pada threshold 0,10 memberi 82,0% dan 35,7%.

## Angka kecil itu berisik
*Seberapa jauh satu sampel data dapat dipercaya?*

Pada 1%, test set hanya berisi 10 positif, sehingga recall hanya bisa 0%, 10%, 20%, dan seterusnya. Tekan **Sampel baru** dan baca recall setiap kali: model menemukan 3, 4, 1, dan 1 positif pada empat sampel, yaitu 30,0%, 40,0%, 10,0%, dan 10,0%. Precision selalu 100,0%, tetapi angka itu bertumpu pada 1 sampai 4 jawaban positif.

Bahkan dengan 50 positif pada 5%, recall berubah dari sampel ke sampel: 58,0%, 60,0%, 50,0%, dan 46,0%. Satu positif bernilai 2 poin di sana dan 10 poin pada 1%.

Data penguin asli lebih kecil lagi, sehingga ketika test set memiliki kurang dari 10 positif, lab menambahkan peringatan pada baris detail, misalnya "Hanya ada 7 positif di test set, sehingga recall berubah dalam lompatan besar 14,3%".

> Awas: selisih beberapa positif belum merupakan hasil. Periksa berapa positif yang ada di test set, tekan **Sampel baru** beberapa kali, dan percayai hanya yang bertahan.

## Penguin asli
*Apakah gagasannya masih berlaku pada data nyata?*

Ubah **Data** menjadi **Penguin (data nyata)**. Lab bertanya apakah seekor penguin adalah Chinstrap, berdasarkan panjang dan kedalaman paruh. Dari 344 penguin, 342 memiliki kedua pengukuran, dan 68 di antaranya adalah Chinstrap, yaitu 19,9%. Di bawah persentase itu, lab mempertahankan semua penguin lain dan mengambil sebagian acak Chinstrap. Separuh baris melatih model dan separuhnya menguji.

Pada 10% positif lab memakai 30 Chinstrap dan 274 penguin lain, dan test set berisi 152 penguin, 15 di antaranya Chinstrap. Baseline mendapat 137 / 152 = 90,1%. Berikut recall pada tiga sampel.

| Sampel | Tanpa bobot | Class weight |
|---|---|---|
| Pertama | 60,0% | 73,3% |
| Kedua | 33,3% | 60,0% |
| Ketiga | 66,7% | 86,7% |

[[figure:imbalance-lab/penguin-check|Recall Chinstrap pada 10% positif di tiga sampel penguin asli, tanpa dan dengan class weight.]]

Class weight menaikkan recall pada ketiga sampel, dan precision turun setiap kali: dari 81,8% ke 37,9%, dari 71,4% ke 39,1%, dan dari 90,9% ke 31,0%. Recall tanpa bobot saja sudah berkisar dari 33,3% sampai 66,7%, jadi tiga sampel hanyalah pemeriksaan kecil, bukan bukti.

::: remember
- Ketika positif jarang, accuracy baseline naik mendekati 100% dan tidak banyak bercerita; recall menunjukkan apa yang berhasil ditemukan model.
- Class weight dan decision threshold yang lebih rendah sama-sama mengembalikan recall, dan keduanya mengorbankan precision. Precision juga turun ketika positif makin jarang, bahkan untuk model dengan kualitas yang sama.
- Bila positif di test set sedikit, recall dan precision berubah banyak antarsampel. Ulangi pada sampel baru, lalu pada data nyata, sebelum kamu mempercayai sebuah hasil.
:::

@@lab

## Lab: positif yang jarang dan accuracy
Kamu membandingkan baseline kelas mayoritas dengan regresi logistik sambil mengubah seberapa jarang contoh positifnya. Lab melatih model pada satu set, lalu menilai keduanya pada test set berisi contoh yang belum pernah dilihat model. Semuanya memakai seed, sehingga layar awal sama untuk semua orang.

### Kontrol
- **Data** berpindah antara **Data buatan** dan **Penguin (data nyata)**. Data nyata menanyakan apakah seekor penguin adalah Chinstrap, dari **Panjang paruh (mm)** dan **Kedalaman paruh (mm)**; catatan di bawah pilihan itu menyebutkan berapa baris yang dipertahankan lab.
- **Persentase contoh positif** (1 sampai 50%, awalnya 5%) menentukan persentase positif di training set maupun test set.
- **Beri bobot lebih pada positif (class weight)** (awalnya mati) membuat setiap positif lebih diperhitungkan saat model dilatih, sehingga seluruh positif berbobot hampir sama dengan seluruh negatif. Sebuah catatan di bawah kontrol menjelaskannya.
- **Threshold keputusan** (0,05 sampai 0,95, awalnya 0,50) adalah probabilitas yang harus dicapai model sebelum menjawab positif.
- **Sampel baru** mengambil sampel buatan yang baru, atau kumpulan penguin acak yang baru. Persentase, tombol bobot, dan threshold tetap seperti sebelumnya.
- **Kuis Cepat** adalah tombol di bawah kartu pengaturan (tombol bulat di kanan bawah pada ponsel) (lencananya menghitung kuis yang belum kamu jawab; tombol ini membuka panel kecil): "Saat positif makin langka, apa yang terjadi pada akurasi baseline dan recall model?" Pilih satu jawaban, dan kotak itu memeriksanya terhadap lab begitu persentase berada di bawah 45%. Pada 45% atau lebih, kotak itu mengatakan belum ada yang bisa dibandingkan.
- **Layar penuh** memperbesar lab. **Reset** mengembalikan lab ke data buatan, 5%, tanpa class weight, threshold 0,50, sampel pertama, dan menghapus prediksimu.

### Membaca layar
- Plot berjudul **Positif yang jarang: accuracy bisa menipu**. Setiap tanda adalah contoh uji: silang berarti **Positif** dan titik berarti **Negatif**, pada sumbu **Feature 1** dan **Feature 2** (**Panjang paruh (mm)** dan **Kedalaman paruh (mm)** untuk penguin). Garis putus-putus adalah **Decision boundary**, dan sisi yang diarsir adalah tempat model menjawab positif.
- Baris status menjelaskan arti angkanya, misalnya "Baseline tidak pernah menemukan satu pun positif, tetapi akurasinya 95,0%." Baris detail memberi ukuran test set dan jumlah positif, seperti "Test set: 1.000 contoh, 50 positif (5,0%).", ditambah class weight dan threshold bila kamu mengubahnya. Di sebelah kanan ada hitungan seperti "50 dari 1.000 contoh uji positif".
- Kartu **Baseline dan model pada test set** memiliki kolom **Ukuran**, **Baseline (kelas mayoritas)**, dan **Regresi logistik**, serta baris **Accuracy**, **Precision**, **Recall**, **F1**, **Positif terdeteksi (true positive)**, **Positif terlewat (false negative)**, dan **Alarm palsu (false positive)**. Precision tertulis n/a bila tidak ada yang dijawab positif.
- Grafik **Skor pada test set** menggambar keempat skor yang sama sebagai batang: abu-abu untuk **Baseline (kelas mayoritas)**, hijau untuk **Regresi logistik**.
- Bila test set memiliki kurang dari 10 positif, baris detail memperingatkan bahwa recall berubah dalam lompatan besar.

### Eksperimen
Tekan **Reset** lebih dulu agar angkamu sama dengan angka di bawah. Setiap eksperimen dimulai dengan sebuah prediksi.

1. **Jebakan accuracy.** Prediksikan: pada 5% positif awal, seberapa baik accuracy baseline, dan berapa positif yang ditemukannya? Baca kartu **Baseline dan model pada test set**. Baseline memiliki accuracy 95,0% dan menemukan 0 dari 50 positif. Model memiliki accuracy 96,7% dan menemukan 29 dari 50 (recall 58,0%, precision 70,7%). Seberapa besar selisih accuracy, dan seberapa besar selisih recall?
2. **Geser persentasenya.** Prediksikan: atur **Persentase contoh positif** ke 50% dan pilih jawaban di **Kuis Cepat**. Kotak itu memintamu menggeser slider turun lebih dulu, karena kelasnya seimbang dan belum ada yang bisa dibandingkan. Lalu geser turun ke 5%. Kotak itu mengatakan accuracy baseline berubah dari 50,0% menjadi 95,0% dan recall model dari 88,0% menjadi 58,0%. Berhentilah di 20%, 10%, dan 1% lalu baca recall: 78,5%, 69,0%, 30,0%. Mengapa accuracy baseline naik sementara recall model turun?
3. **Class weight.** Tekan **Reset** (5%, class weight mati, threshold 0,50). Prediksikan: apa yang akan dilakukan **Beri bobot lebih pada positif (class weight)** terhadap recall, alarm palsu, dan accuracy? Nyalakan. Baris detail mengatakan setiap positif dihitung 19 kali. Recall naik dari 58,0% menjadi 86,0%, alarm palsu dari 12 menjadi 92, precision turun dari 70,7% menjadi 31,9%, dan accuracy turun menjadi 90,1%, di bawah 95,0% milik baseline. Apakah model berbobot itu lebih buruk?
4. **Resep sama, positif lebih jarang.** Tekan **Reset** dan nyalakan class weight. Prediksikan: apa yang terjadi pada recall dan precision ketika kamu menggeser persentase dari 50% ke 5% dan 1%? Recall nyaris tidak turun (88,0%, 86,0%, dan 80,0%), sedangkan precision anjlok (89,6%, 31,9%, dan 8,4%). Bila kamu memilih jawaban di **Kuis Cepat**, kotak itu kini berbunyi "Akurasi baseline naik, recall model hampir tetap" (recall 88,0% menjadi 86,0%). Bandingkan alarm palsu dan positif yang ditemukan pada 50% dan pada 5%, lalu jelaskan mengapa precision turun padahal recall dan laju alarm palsunya hampir tidak berubah.
5. **Threshold melawan class weight.** Tekan **Reset** (5%, class weight mati, threshold 0,50). Prediksikan: dapatkah threshold yang lebih rendah mengembalikan recall seperti class weight? Geser **Threshold keputusan** ke 0,20, lalu 0,10. Pada 0,20: 35 ditemukan, 35 alarm palsu, recall 70,0%, precision 50,0%. Pada 0,10: recall 82,0%, precision 35,7%. Bandingkan dengan eksperimen 3. Lalu coba 0,80 dan lihat precision mencapai 100,0% ketika recall turun ke 44,0%.
6. **Sampel segar, lalu data nyata.** Tekan **Reset**, lalu atur **Persentase contoh positif** ke 1% (class weight mati, threshold 0,50). Prediksikan: ketika kamu menekan **Sampel baru** pada 1%, apakah recall akan tetap dekat 30,0%? Tekan tiga kali: recall menjadi 40,0%, 10,0%, dan 10,0%, karena hanya ada 10 positif. Sekarang tekan **Reset**, ubah **Data** menjadi **Penguin (data nyata)** dan **Persentase contoh positif** menjadi 10%. Pada sampel pertama, baseline memiliki accuracy 90,1% dan model memiliki recall 60,0% (9 dari 15). Nyalakan class weight: recall naik menjadi 73,3% dan precision turun dari 81,8% menjadi 37,9%. Tekan **Sampel baru** dua kali, dengan tombol bobot mati lalu menyala setiap kali: recall berubah dari 33,3% menjadi 60,0% pada sampel kedua dan dari 66,7% menjadi 86,7% pada sampel ketiga. Bobot menaikkan recall pada ketiga sampel; seberapa jauh kamu mempercayai tiga sampel?
