---
slug: how-knn-works
title: Bagaimana k-NN mengambil keputusan
---
::: intro
- Jelaskan bagaimana k-NN memberi label pada contoh baru lewat voting k contoh berlabel yang terdekat.
- Jalankan voting k-NN secara manual pada penguin sungguhan, lalu lihat bagaimana jawabannya berubah menurut k.
- Gambarkan decision boundary yang dibentuk k-NN, dan sebutkan kekuatan serta kelemahannya.

Sebelum mulai: baca "Data, feature, dan label" dan "Supervised, unsupervised, dan tiga pertanyaan".
:::

## Bertanya kepada tetangga
*Bagaimana sebuah model dapat memutuskan padahal belum mempelajari apa pun sebelumnya?*

Bayangkan kamu tiba di kota yang tidak kamu kenal dan ingin tahu apakah sebuah restoran enak. Kamu tidak akan menyusun teori tentang memasak. Kamu cukup bertanya kepada orang yang tinggal paling dekat, lalu mengikuti jawaban yang paling banyak diberikan.

**k-nearest neighbors (k-NN)** mengklasifikasikan contoh baru dengan cara yang sama. Ia menyimpan sekumpulan contoh yang jawabannya sudah diketahui, mencari k contoh yang paling mirip dengan contoh baru, lalu membiarkan mereka melakukan voting. Angka **k** menyatakan berapa neighbor yang mendapat suara.

Di "Supervised, unsupervised, dan tiga pertanyaan" kamu sudah mengenal classification: target-nya berupa kelas, yaitu nama dari daftar yang tetap. k-NN termasuk **supervised**, karena setiap contoh yang disimpan adalah satu baris feature ditambah label, dan label itulah yang dipakai neighbor untuk voting. Contoh kita adalah seekor penguin yang spesiesnya ingin kita tentukan dari dua pengukuran: panjang paruh dan kedalaman paruh, keduanya dalam milimeter.

## Empat langkah
*Apa yang dilakukan k-NN ketika contoh baru datang?*

1. **Simpan** contoh-contoh berlabel. Hanya itu yang disebut training dalam k-NN.
2. **Ukur** seberapa jauh contoh baru, yang disebut **query**, dari setiap contoh yang tersimpan.
3. **Pilih** k contoh yang paling dekat. Merekalah neighbor-nya.
4. **Voting.** Hitung label di antara para neighbor. Label dengan suara terbanyak menjadi jawabannya.

Dengan dua feature, setiap contoh adalah satu titik pada plot, dan "dekat" berarti dekat di plot. Di pelajaran ini, jarak yang dipakai adalah jarak garis lurus biasa, disebut jarak **Euclidean**: jika dua titik berbeda *dx* ke samping dan *dy* ke atas, jaraknya adalah akar dari (dx² + dy²). Pelajaran "Jarak dan kemiripan" membandingkannya dengan cara lain untuk mengukur selisih.

> Gagasan kunci: k-NN adalah **lazy learner**. Tidak ada yang dilatih sebelumnya. Data berlabel itulah modelnya, dan semua pekerjaan baru dilakukan saat query datang. Karena itu langkah 2 sangat menentukan: langkah itu diulang untuk setiap contoh yang tersimpan, pada setiap query.

## Contoh hitungan dengan penguin sungguhan
*Seperti apa satu kali voting, dengan angka nyata?*

Data penguin memuat 219 penguin Adelie dan Chinstrap yang punya kedua ukuran paruh. Kita menyisihkan satu Adelie sebagai query, dengan panjang paruh 44,1 mm dan kedalaman 18,0 mm, lalu berpura-pura tidak tahu spesiesnya. Sisanya, 218 penguin, menjadi contoh yang tersimpan: 150 Adelie dan 68 Chinstrap. Berikut tujuh penguin tersimpan yang paling dekat dengannya:

| Peringkat | Spesies | Panjang paruh (mm) | Kedalaman paruh (mm) | Jarak |
| --- | --- | --- | --- | --- |
| 1 | Chinstrap | 43,5 | 18,1 | 0,61 |
| 2 | Adelie | 43,2 | 18,5 | 1,03 |
| 3 | Chinstrap | 45,2 | 17,8 | 1,12 |
| 4 | Adelie | 42,9 | 17,6 | 1,26 |
| 5 | Adelie | 43,2 | 19,0 | 1,35 |
| 6 | Adelie | 42,8 | 18,5 | 1,39 |
| 7 | Adelie | 42,7 | 18,3 | 1,43 |

> Contoh hitungan: untuk peringkat 1, selisihnya adalah 43,5 - 44,1 = -0,6 ke samping dan 18,1 - 18,0 = 0,1 ke atas. Jaraknya adalah akar dari (0,36 + 0,01) = akar dari 0,37 = 0,61. Untuk peringkat 2, selisihnya -0,9 dan 0,5, sehingga jaraknya adalah akar dari (0,81 + 0,25) = akar dari 1,06 = 1,03.

[[figure:how-knn-works/penguin-neighbors|Kiri: seluruh 218 penguin yang tersimpan, dengan penguin baru berupa berlian. Kanan: zoom di sekitarnya, dengan skala yang sama pada kedua sumbu, sehingga setiap cincin putus-putus adalah jarak yang sebenarnya.]]

## Hasil voting bergantung pada k
*Apa yang berubah jika kamu bertanya kepada lebih banyak neighbor?*

Sekarang lakukan voting dengan membaca tabel dari atas. Dengan **k = 1**, hanya penguin 1 yang memberi suara: Chinstrap. Dengan **k = 3**, suaranya Chinstrap, Adelie, Chinstrap: Chinstrap menang 2 banding 1. Dengan **k = 5**, suaranya Chinstrap, Adelie, Chinstrap, Adelie, Adelie: Adelie menang 3 banding 2. Dengan **k = 7**, Adelie menang 5 banding 2.

[[figure:how-knn-works/vote-by-k|Penguin baru yang sama pada k = 1 sampai 7. Setiap titik adalah satu neighbor, diberi nomor menurut peringkat. Jawabannya berbalik dari Chinstrap ke Adelie di antara k = 4 dan k = 5.]]

Penguin yang kita sisihkan ternyata seekor Adelie, jadi k = 5 dan k = 7 benar, sedangkan k = 1 dan k = 3 salah. Jangan menyimpulkan bahwa "k yang lebih besar selalu lebih baik": ini baru satu penguin. Untuk query yang sama, setiap k dari 5 sampai 13 menjawab Adelie, tetapi pada k = 15 hasil votingnya Chinstrap 8, Adelie 7. Memilih k yang baik membutuhkan banyak penguin uji, dan "Menyetel k" menunjukkan caranya.

**Seri.** Dengan k = 2 hasilnya 1 banding 1, dan dengan k = 4 hasilnya 2 banding 2. Di sini, hasil yang seri diputuskan oleh kelas neighbor terdekat, yaitu Chinstrap di peringkat 1. Dengan dua kelas, k ganjil menghindari seri.

> Gagasan kunci: jawaban adalah fungsi dari k. k kecil memercayai beberapa titik terdekat, termasuk noise-nya. k besar merata-ratakan area yang lebih luas dan dapat menenggelamkan titik-titik yang paling dekat.

## Dari satu jawaban menjadi peta
*Seperti apa k-NN di seluruh plot?*

Sejauh ini kita hanya bertanya satu kali, di satu tempat. Tanyakan hal yang sama di setiap tempat pada plot, lalu warnai tiap tempat sesuai jawaban yang akan didapat. Batas antarwarna itulah **decision boundary**.

[[figure:how-knn-works/decision-map|Jawaban yang akan diberikan k-NN di setiap posisi, untuk k = 1 dan k = 9. Berlian adalah penguin baru, diwarnai sesuai jawabannya sendiri.]]

Dengan k = 1, setiap penguin yang tersimpan menguasai bagian plot yang lebih dekat kepadanya daripada ke penguin tersimpan lain, sehingga batasnya bergerigi dan membelok mengitari titik tunggal, termasuk yang janggal. Dengan k = 9, satu titik janggal tidak dapat menang sendirian, sehingga batasnya lebih mulus. Berlian berada dekat batas: pada k = 1 peta menjawab Chinstrap di sana, dan pada k = 9 peta menjawab Adelie (6 suara lawan 3), perubahan jawaban yang sama seperti pada voting di atas.

Tidak ada yang menuliskan rumus untuk batas ini. Batas itu langsung terbentuk dari letak titik-titik berlabel, sehingga k-NN dapat mengikuti batas yang melengkung atau terputus-putus, yang tidak mungkin diikuti garis lurus. Lab k-NN di akhir kursus ini memungkinkan kamu melihat wilayah-wilayah ini berubah saat query digeser dan k diubah.

## Apa yang menentukan "terdekat"
*Mengapa feature perlu diukur dengan skala yang sebanding?*

"Terdekat" bergantung pada feature yang dipakai dan satuannya. Panjang dan kedalaman paruh sama-sama dalam milimeter dan sama-sama bervariasi beberapa milimeter, sehingga keduanya berpengaruh. Sekarang tambahkan feature ketiga, massa tubuh dalam gram. Query kita bermassa 4000 g. Penguin 1, si Chinstrap, bermassa 3400 g, dan penguin 2, si Adelie, bermassa 4100 g.

Dengan dua ukuran paruh saja, penguin 1 lebih dekat: 0,61 dibanding 1,03. Setelah massa ditambahkan, penguin 1 berjarak akar dari (0,6² + 0,1² + 600²) = 600,00, dan penguin 2 berjarak akar dari (0,9² + 0,5² + 100²) = 100,01. Kini penguin 2 yang lebih dekat. Selisih paruh yang kurang dari satu milimeter lenyap di samping selisih ratusan gram, sehingga massa tubuh sendirilah yang menentukan siapa yang terdekat.

> Awas: feature yang diukur dengan angka besar dapat menenggelamkan feature lain tanpa benar-benar lebih berguna. Solusinya adalah **scaling**: menulis ulang setiap feature pada skala yang sebanding sebelum jarak diukur. "Jarak dan kemiripan" menyebut masalah yang sama untuk jarak lain, dan pelajaran "Scaling dan encoding" di bagian program berikutnya membahas solusinya.

::: deeper Neighbor yang lebih dekat boleh bernilai lebih
Alih-alih satu suara untuk tiap neighbor, beri setiap neighbor bobot 1 dibagi jaraknya, sehingga neighbor yang lebih dekat bernilai lebih. Pada k = 5, dua neighbor Chinstrap (peringkat 1 dan 3) berbobot 1/0,61 + 1/1,12 = 1,644 + 0,894 = 2,538. Tiga neighbor Adelie (peringkat 2, 4, dan 5) berbobot 0,971 + 0,791 + 0,743 = 2,505. Kini Chinstrap menang tipis, padahal voting biasa memberi Adelie kemenangan 3 banding 2. Pembobotan adalah aturan yang berbeda, bukan perbaikan gratis: di sini ia mengubah jawabannya, dan hanya pengujian pada banyak penguin yang dapat menunjukkan apakah ia membantu.
:::

::: deeper k-NN untuk angka (regression)
k-NN juga dapat memprediksi angka: ambil rata-rata nilai para neighbor. Untuk massa tubuh query, tiga penguin terdekat bermassa 3400, 4100, dan 3950 g, sehingga prediksinya (3400 + 3950 + 4100) / 3 = 3817 g. Penguin yang sebenarnya bermassa 4000 g. Seperti pada classification, prediksinya bergantung pada k dan pada jarak.
:::

## Kekuatan dan kelemahan
*Kapan k-NN menjadi pilihan yang baik, dan di mana kamu mencobanya?*

Kekuatan:
- **Tidak ada yang dilatih.** Contoh berlabel baru dapat langsung ditambahkan.
- **Mudah dijelaskan.** Kamu dapat menunjuk neighbor yang memberi suara.
- **Tanpa asumsi bentuk batas.** Boundary mengikuti data, apa pun bentuknya.

Kelemahan:
- **Prediksi lambat.** Setiap query dibandingkan dengan semua contoh yang tersimpan.
- **Memori.** Seluruh data berlabel harus disimpan.
- **Banyak feature.** Seiring bertambahnya feature, titik-titik menyebar hingga hampir semuanya berjarak sama jauh, dan "terdekat" kehilangan maknanya (curse of dimensionality).
- **Feature yang tidak relevan dan kelas yang tidak seimbang.** Feature yang tidak berguna menambah noise pada setiap jarak, dan kelas besar dapat mengalahkan suara kelas yang lebih langka tetapi lebih dekat ketika k besar.

Berikutnya adalah "Menyetel k" dan "Jarak dan kemiripan". Setelah itu **lab k-NN** memungkinkan kamu menyeret titik query, mengubah k, dan melihat neighbor, voting, dan region ikut berubah.

::: remember
- k-NN memberi label pada query lewat voting k contoh berlabel yang terdekat. Tidak ada training, dan data yang tersimpan adalah modelnya.
- Jawabannya bergantung pada k, pada cara jarak diukur, dan pada apakah feature berada pada skala yang sama. Bahkan suara yang seri membutuhkan aturan.
- Batasnya mengikuti data, sehingga fleksibel dan mudah dijelaskan, tetapi lambat dan rapuh jika feature-nya banyak atau skalanya tidak seragam.
:::
