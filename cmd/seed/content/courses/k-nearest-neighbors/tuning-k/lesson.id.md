---
slug: tuning-k
title: Menyetel k
---
::: intro
- Jelaskan apa yang terjadi pada model k-NN kalau k-nya sangat kecil dan kalau k-nya sangat besar.
- Baca validation curve dan pilih k dari bagian yang datar.
- Perkirakan accuracy dengan five-fold cross-validation, dan jaga agar test set tetap bersih.

Sebelum mulai: baca "Bagaimana k-NN mengambil keputusan", tempat query yang sama mendapat vote berbeda pada k = 3 dan k = 5, serta "Jarak dan kemiripan". Lab k-NN di akhir kursus ini memungkinkan kamu melihat gagasan yang sama bergerak langsung.
:::

## Satu angka, dua cara untuk salah
*Apa yang dipertukarkan oleh k?*

Di "Bagaimana k-NN mengambil keputusan", query yang sama diberi label A pada k = 3 dan label B pada k = 5. Jadi k bukan detail kecil: ia adalah pengaturan utama model, dan kamu menetapkannya sebelum model melihat satu titik baru pun. Pengaturan semacam ini, yang kamu pilih sendiri dan tidak dipelajari dari data, disebut **hyperparameter**.

- **k yang sangat kecil** membuat satu atau dua neighbor menentukan jawaban. Kalau salah satunya titik yang salah label atau tidak lazim, jawabannya ikut salah. Model mengikuti noise di data latih (kesalahan acak dan keanehan di dalamnya). Itulah **overfitting**.
- **k yang sangat besar** membuat titik dari tempat yang jauh ikut memberi vote. Suara mereka mengalahkan neighbor yang sebenarnya dekat, sehingga model berhenti menanggapi struktur lokal. Kita menyebutnya **oversmoothing**, salah satu bentuk **underfitting**.

Di antara kedua ujung itu ada k yang mengikuti pola sebenarnya dan mengabaikan noise.

> Gagasan kunci: k mengatur seberapa fleksibel model. k kecil sangat fleksibel, k besar sangat kaku, dan k yang baik ada di tengah. Datalah yang harus menunjukkan di mana letaknya.

## Pengaruh k pada boundary
*Bagaimana perubahannya terlihat di plot?*

Untuk melihat apa yang dilakukan model di semua tempat sekaligus, ajukan pertanyaan ke model di setiap titik pada plot, lalu warnai tiap titik sesuai jawabannya. Batas antarwarna itulah **decision boundary**. Gambar ini memakai sampel kecil yang dibuat khusus untuk pelajaran ini: dua kelas, dan setiap kelas terdiri dari dua gumpalan di sudut-sudut yang berseberangan. Ada 80 titik latih.

[[figure:tuning-k/boundaries|80 titik latih yang sama pada tiga nilai k. Warna latar menunjukkan jawaban k-NN di setiap tempat, dan angkanya menunjukkan berapa dari 200 titik validasi baru yang dijawab benar.]]

Pada **k = 1** boundary-nya bergerigi. Setiap titik latih menguasai petak miliknya sendiri, sehingga beberapa titik yang janggal meninggalkan pulau-pulau kecil berwarna salah. Pada **k = 13** sebagian besar pulau itu hilang dan keempat gumpalan tampak sebagai empat wilayah yang bersih. Pada **k = 41**, lebih dari separuh dari 80 titik ikut memberi vote untuk setiap query, sehingga jawabannya hampir tidak bergantung pada posisi query. Petak yang luas berubah menjadi kelas yang salah, misalnya di sepanjang tepi atas dan di bagian tengah kiri, dan polanya kabur.

Di lab kamu dapat menyalakan **Tampilkan decision region** dan menggeser k sendiri.

## Training accuracy tidak dapat memilih k
*Mengapa tidak langsung memilih k dengan skor terbaik pada titik latih?*

Ambil k = 1 dan nilai model pada titik latihnya sendiri. Neighbor terdekat setiap titik adalah dirinya sendiri, sehingga setiap vote pasti benar. Skornya 80 dari 80, dan akan 100% untuk data berlabel apa pun yang tidak punya duplikat persis, berisi noise atau tidak. Angka itu tidak mengatakan apa-apa tentang titik baru.

Karena itu kita **menyisihkan** (*hold out*) sebagian data: titik yang tidak dipakai untuk vote dan sebagai gantinya dipakai untuk menilai. Di sini model memberi vote dengan 80 titik latih dan dinilai pada 200 titik **validasi** baru yang dibuat dengan cara yang sama.

| k | Latih: benar dari 80 | Validasi: benar dari 200 | Validation accuracy |
| --- | --- | --- | --- |
| 1 | 80 | 165 | 82,5% |
| 3 | 72 | 176 | 88,0% |
| 13 | 71 | 178 | 89,0% |
| 31 | 72 | 172 | 86,0% |
| 41 | 61 | 150 | 75,0% |

Menurut data latih, k = 1 sempurna. Menurut validasi, k = 1 berada di dekat posisi paling bawah di antara k ganjil sampai 41. Hitungan untuk k = 1 adalah 165 ÷ 200 = 0,825, yaitu 82,5%.

> Awas: jangan pernah memilih k dengan training accuracy. Pada k = 1 nilainya selalu 100%, sehingga ia selalu memilih model yang paling overfit.

## Validation curve
*Seperti apa skornya pada banyak nilai k?*

Nilai setiap k ganjil dari 1 sampai 41 pada titik validasi yang sama, lalu gambarkan hasilnya. Inilah **validation curve**.

[[figure:tuning-k/validation-curve|Training dan validation accuracy untuk k dari 1 sampai 41. Bagian yang diarsir adalah rentang tempat validation accuracy masih dalam batas noise dari yang terbaik.]]

Bacalah dari kiri ke kanan. Pada k = 1 training accuracy 100% tetapi validasinya hanya 82,5%: selisih yang besar menandakan overfitting. Validasi naik pada k = 3, bertahan di bagian yang datar, lalu turun di ujung kanan ketika k terlalu besar. Skor terbaik adalah 178 dari 200, pada k = 13 dan juga pada k = 23, tetapi k = 3 mendapat 176 dan k = 27 juga 176. Selisih 2 dari 200 (1 poin persentase) lebih kecil daripada goyangan yang akan kamu lihat pada kumpulan 200 titik validasi acak yang lain, sehingga nilai-nilai itu pada dasarnya seri.

> Gagasan kunci: jangan mengejar puncak kurva yang paling atas. Temukan bagian yang datar, lalu pilih k dari tengahnya, jauh dari kedua tebing.

::: deeper Seberapa besar goyangannya?
Skor validasi adalah proporsi yang diukur pada sampel terbatas, sehingga nilainya bervariasi. Ukuran kasar variasi itu adalah standard error, yaitu akar dari p × (1 − p) ÷ n. Dengan p = 0,89 dan n = 200, hasilnya √(0,89 × 0,11 ÷ 200) ≈ 0,022, sekitar 2 poin persentase, atau 4 dari 200.

Kalau kita menyimpan setiap k yang skornya masih dalam satu standard error dari yang terbaik, yaitu 0,89 − 0,022 = 0,868, atau 174 dari 200 ke atas, yang terpilih adalah k = 3 sampai k = 27. Itulah bagian yang diarsir pada gambar. Ini satu aturan yang umum, bukan satu-satunya.
:::

## Cross-validation
*Bagaimana memakai seluruh data untuk vote sekaligus penilaian?*

Satu validation set bisa beruntung atau kurang beruntung. **Cross-validation** mengulang hold-out beberapa kali. Pada **five-fold** cross-validation, data latih dipotong menjadi lima **fold** yang sama besar, di sini masing-masing 16 titik. Di setiap putaran, empat fold dipakai untuk vote dan fold kelima dinilai. Setelah lima putaran, setiap titik sudah dinilai tepat satu kali.

[[figure:tuning-k/cv-folds|Five-fold cross-validation untuk k = 13 pada 80 titik latih: setiap fold disisihkan satu kali.]]

> Contoh hitungan: untuk k = 13, kelima putaran mendapat 15, 14, 13, 15, dan 14 benar dari 16. Totalnya 15 + 14 + 13 + 15 + 14 = 71 dari 80, sehingga cross-validation accuracy-nya 71 ÷ 80 = 88,75%.

Jalankan lima putaran yang sama untuk nilai k lain lalu bandingkan: k = 1 mendapat 65 dari 80 (81,25%), k = 3 mendapat 70 (87,5%), k = 13 mendapat 71 (88,75%), dan k = 31 mendapat 63 (78,75%). Hasilnya menunjuk ke wilayah yang baik yang kurang lebih sama dengan validation set tadi (k = 31 lebih rendah di sini karena setiap putaran hanya memberi vote dengan 64 titik, sehingga k yang besar lebih cepat merugikan), tanpa memerlukan validation set besar tersendiri.

> Awas: "k" pada k-fold tidak ada hubungannya dengan k pada k-NN. Yang satu menghitung fold, yang lain menghitung neighbor.

## Aturan praktis memilih k
*Dari mana mulai mencari, dan bagaimana menentukan pilihan kalau skornya seri?*

- **Mulai dari sekitar akar kuadrat n.** Untuk n = 80 titik latih, √80 ≈ 8,9, jadi coba k di sekitar 9. Ini tebakan awal, bukan hukum, dan di sini 9 memang berada di bagian yang datar.
- **Pakai k ganjil untuk dua kelas.** Dengan begitu vote tidak dapat berimbang. Kalau kelasnya lebih dari dua, seri tetap mungkin terjadi. Lab k-NN memutus seri dengan memilih kelas neighbor yang paling dekat.
- **Pilih dari tengah bagian yang datar.** Nilai k di sekitar k terbaik hampir sama bagusnya, dan bagian tengah paling jauh dari tebing di kedua sisi.
- **Jaga k tetap di bawah batas yang dapat didukung kelas terkecilmu.** Dengan dua kelas, kelas yang hanya punya 6 contoh tidak akan pernah menang vote begitu k mencapai 13 atau lebih, karena ia tidak dapat memperoleh mayoritas dari 13 vote.
- **Jangan heran kalau jawabannya berubah mengikuti data.** Sampel ini punya bagian datar dari 3 sampai 27. Dataset lain, dengan noise lebih banyak atau titik lebih banyak, akan punya bagian datar yang berbeda, jadi jalankan pencariannya lagi.

## Jaga test set tetap bersih
*Bagaimana agar kamu tidak menipu diri sendiri saat menyetel?*

Memilih k adalah bentuk training: skor validasi atau cross-validation adalah yang kamu jadikan patokan. Setelah kamu memilih, skor itu sedikit terlalu optimistis, karena kamu memilih k yang kebetulan tampak terbaik pada skor tersebut. Karena itu sisihkan **test set** terpisah untuk satu pemeriksaan akhir, dan jangan pakai untuk memilih apa pun.

> Awas: leakage. Apa pun yang di-fit dengan seluruh dataset, seperti rata-rata dan sebaran yang dipakai untuk men-scale sebuah feature, membuat informasi tentang titik validasi atau titik uji sampai ke model. Fit setiap langkah pre-processing hanya pada bagian data latih, dan di dalam cross-validation ulangi untuk setiap putaran.

Lab k-NN adalah tempat yang tepat untuk mencobanya. Atur **Neighbor (k)** dari 1 sampai 15 dengan **Tampilkan decision region** menyala, lalu coba dataset **Papan catur**, yang kelasnya berada di petak-petak yang berselang-seling, tata letak yang mirip dengan yang ada di pelajaran ini.

::: remember
- k yang kecil menyebabkan overfitting, k yang besar menyebabkan oversmoothing, dan k terbaik berada di bagian datar validation curve.
- Training accuracy pada k = 1 selalu sempurna, jadi pilih k dengan data yang disisihkan atau dengan cross-validation.
- Mulailah dari sekitar akar kuadrat n, pakai k ganjil untuk dua kelas, dan simpan test set untuk satu pemeriksaan akhir.
:::
