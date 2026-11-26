---
slug: audit-lab
title: Lab audit
---
::: intro
- Audit sebuah model yang sudah di-fit menurut kelompok, lalu prediksikan selisih mana yang akan tertutup dan mana yang akan terbuka ketika threshold diubah.
- Jelaskan mengapa dua feature yang berkorelasi berbagi satu skor importance, namun pasangannya tetap bernilai penuh.
- Periksa tiap gagasan pada penguin nyata dengan split baru sebelum kamu mempercayainya.

Sebelum mulai: baca "Metrik subgroup dan fairness" dan "Permutation importance dan SHAP".
:::

## Apa yang diaudit lab ini
*Model apa yang diaudit, dan apa yang kita tanyakan kepadanya?*

Pelajaran pertama kursus ini mengaudit sebuah aturan menurut kelompok. Pelajaran kedua menjelaskan sebuah model dengan skor importance dan nilai Shapley. Lab audit menaruh keduanya pada satu model dan membiarkan kamu mengubah pengaturannya sendiri.

Lab dimulai dengan 1.200 baris buatan. Separuhnya melatih regresi logistik, dan separuh lainnya, 599 baris, disisihkan untuk audit. Setiap baris masuk ke Kelompok A (439 baris yang diaudit) atau Kelompok B (160 baris), dan kedua kelompok berbeda dalam base rate, yaitu porsi baris yang benar-benar positif. Model tidak pernah melihat kelompoknya.

Setiap baris punya empat feature: **sinyal**, **salinan sinyal**, **sinyal lain** dan **noise**. Hasilnya bergantung pada sinyal dan sinyal lain, tidak pernah pada salinan atau noise. Salinan adalah kembaran sinyal yang ber-noise, dan kamu menentukan seberapa mirip kembarannya lewat **Korelasi antara kedua feature** (awalnya 0,20).

Lab mengajukan tiga pertanyaan kepada satu model. Di mana galat jatuh? Seberapa besar ia bergantung pada tiap feature? Mengapa model memberi satu kasus prediksinya? Accuracy keseluruhan adalah 78,8%.

## Galat menurut kelompok
*Dapatkah dua kelompok punya accuracy yang sama namun tetap diperlakukan berbeda?*

Buka tabel **Galat menurut kelompok**. Accuracy-nya 78,8% di kedua kelompok, sehingga selisih accuracy hanya 0,1 poin. Setiap baris lainnya berbeda.

[[figure:audit-lab/group-gaps|Tabel lab digambar sebagai bar. Accuracy sama, tetapi selisih positive rate mencapai 26,7 poin. Segitiga menandai selisih 10 poin atau lebih.]]

Lab memakai **Positive rate** untuk apa yang di pelajaran pertama disebut flag rate, dan **Recall** untuk apa yang di sana disebut equal opportunity. Tabelnya memuat angka yang sama, kini untuk model yang dapat kamu ubah.

> Contoh hitungan: di balik persentase ada jumlah. Kelompok B punya 160 baris, 50 di antaranya positif. Model menemukan 38 (true positive), melewatkan 12, memberi flag keliru pada 22 baris negatif (false positive) dan membiarkan 88. Recall-nya 38 / 50 = 76,0%. Precision-nya 38 / 60 = 63,3%. False-positive rate-nya 22 / 110 = 20,0%. Positive rate-nya 60 / 160 = 37,5%. Kelompok A punya 228, 39, 54 dan 118 pada keempat kotak yang sama.

Model benar sama seringnya di tiap kelompok, tetapi Kelompok A memuat lebih banyak kasus positif (60,8% dibanding 31,3%). Karena itu model memberi flag pada A lebih sering, dan flag-nya pun lebih sering benar.

> Gagasan kunci: accuracy yang sama tidak berarti galat yang sama. Baca setiap baris, dan baca jumlah barisnya di sampingnya.

## Satu threshold atau satu untuk tiap kelompok
*Apa yang dilakukan tombol Samakan, dan apa harganya?*

Model memberi tiap baris sebuah probabilitas. Sebuah **threshold** mengubahnya menjadi ya atau tidak: baris pada atau di atas threshold diprediksi positif. Pada 0,50 kamu mendapat tabel di atas. Kurva skor di bagian atas lab menunjukkan sebaran skor tiap kelompok, dengan garis putus-putus di threshold.

Geser **Threshold** dari 0,20 sampai 0,90. Satu threshold menggerakkan kedua kelompok bersamaan, sehingga selisih positive rate tetap berada di antara 5,9 dan 28,8 poin (terbesar pada 0,60). Di kedua ujung slider selisihnya 5,9 pada 0,90 dan 10,8 pada 0,20, dan di sana accuracy hanya 53,3% dan 62,8%.

Tekan **Samakan positive rate**. Tombol ini menyalakan **Threshold berbeda untuk tiap kelompok**, dan threshold Kelompok B turun ke 0,36, sehingga B diberi flag sesering A. Tabel **Trade-off: satu threshold atau threshold-mu** menunjukkan harganya.

[[figure:audit-lab/three-settings|Ketiga selisih dan accuracy untuk satu threshold 0,50, setelah Samakan positive rate, dan setelah Samakan recall.]]

> Contoh hitungan: positive rate B naik dari 37,5% menjadi 64,4% (103 dari 160 barisnya diberi flag). Hanya 6 true positive tambahan yang ditemukan (44 dari 50), tetapi muncul 37 alarm palsu tambahan (59). Precision turun dari 63,3% menjadi 44 / 103 = 42,7%, false-positive rate naik dari 20,0% menjadi 59 / 110 = 53,6%, dan accuracy keseluruhan turun dari 78,8% menjadi 73,6%.

## Recall yang sama adalah tujuan lain
*Mengapa lab tidak dapat menutup semua selisih sekaligus?*

Sekarang tekan **Samakan recall**. Threshold B hanya turun ke 0,42. Recall-nya kini 85,4% di A dan 86,0% di B, selisih 0,6 poin, dengan accuracy 76,5%. Namun selisih positive rate masih 11,7 poin dan selisih precision 29,7.

Alasannya sudah diberikan pelajaran pertama: flag rate sama dengan recall x base rate / precision. Untuk A hasilnya 0,854 x 0,608 / 0,809 = 0,642. Untuk B pada satu threshold, dengan recall 0,760, base rate 0,313 dan precision 0,633, hasilnya 0,376, sesuai dengan 37,5% pada tabel sampai batas pembulatan. Ketika base rate berbeda, menjaga recall dan positive rate tetap sama akan memaksa precision menjauh satu sama lain.

Penyamaan ini juga hanya perkiraan: lab membulatkan threshold ke 0,01 dan skor yang kembar (baris dengan probabilitas yang sama) bergerak bersamaan. Karena itu, setelah penyamaan, baris detail menampilkan nilai yang dicapai.

> Awas: tombol penyamaan adalah alat, bukan putusan akhir. Tombol itu menunjukkan harga dari tiap tujuan. Selisih mana yang ditutup, dan berapa accuracy yang dikorbankan, bergantung pada biaya tiap kesalahan dalam kasus penggunaannya.

## Feature yang berkorelasi berbagi importance
*Mengapa sinyal tampak kurang penting ketika salinannya muncul?*

Grafik **Permutation importance** menunjukkan seberapa besar accuracy model turun ketika satu feature diacak. Pada korelasi 0,20, mengacak sinyal menurunkan accuracy sebesar 25,9 poin, salinan 0,0 dan sinyal lain 5,8. Bar terakhir, **Keduanya bersama**, mengacak sinyal dan salinannya sekaligus dan menurunkan accuracy sebesar 25,4 poin.

Sekarang naikkan korelasinya. Salinan mulai membawa informasi sinyal, sehingga model bersandar pada keduanya, dan masing-masing dapat menutupi yang lain ketika diacak.

[[figure:audit-lab/shared-importance|Importance sinyal dan salinannya pada empat korelasi, di samping keduanya yang diacak bersamaan.]]

Pada 0,95 sinyal turun ke 14,5 dan salinan naik ke 6,9. Pada 0,99 nilainya 10,9 dan 9,0. Bersama-sama keduanya menurunkan accuracy antara 25,4 dan 26,3 poin di setiap posisi slider, sehingga pasangannya tetap bernilai, sementara kedua bar tunggal jika dijumlahkan menjadi lebih kecil (19,9 pada 0,99).

> Awas: hasilnya tidak pernah bergantung pada salinan, tetapi pada 0,95 bar-nya menunjukkan 6,9. Bar itu menggambarkan model, yang memakai salinan, dan bukan dunia, tempat salinan tidak berpengaruh.

## Mengapa prediksi ini?
*Apakah kredit untuk satu prediksi juga terbagi?*

Grafik **Mengapa prediksi ini? (nilai Shapley)** menjelaskan satu kasus. Grafik ini bermula dari prediksi rata-rata, lalu menambahkan dorongan tiap feature sampai tiba pada prediksi kasus itu. Lab dibuka pada kasus 2, sebuah baris Kelompok A yang sebenarnya positif. Model memberinya 34,5%, dibanding 53,8% untuk kasus rata-rata. Pada 0,50 model memprediksi negatif, dan itu salah.

Pada korelasi 0,20 sinyal mendorong sebesar -7,7 poin, sinyal lain -11,7, dan salinan serta noise 0,0. Maka 53,8 - 7,7 - 11,7 adalah 34,4, sesuai dengan 34,5 sampai batas pembulatan.

[[figure:audit-lab/one-case|Nilai Shapley kasus 2 pada korelasi 0,20 dan 0,95. Pada 0,95 dorongan sinyal terbagi antara sinyal dan salinannya.]]

Pada 0,95 kasus yang sama mendapat 31,2%. Sinyal mendorong -5,3 dan salinan -5,6, bersama-sama -10,9, sedangkan sinyal lain hampir tidak berubah di -12,1. Jenis modelnya sama, tetapi kreditnya kembali terbagi.

## Penguin nyata
*Apakah audit menceritakan hal yang sama pada data nyata?*

Tekan **Reset**, lalu atur **Data** ke **Penguin (data nyata)**. Lab memakai 333 dari 344 penguin (11 punya missing value) dan bertanya apakah seekor penguin lebih berat daripada median massa tubuh, 4050 g. Massa tubuh bukan feature. Dengan **Bandingkan kelompok menurut** diatur ke **Jenis kelamin**, 168 penguin melatih model dan 165 diaudit: 82 betina dan 83 jantan.

Accuracy keseluruhan 86,1%, tetapi accuracy betina 97,6% dan jantan 74,7%. Recall-nya 100,0% untuk betina dan 62,7% untuk jantan. Positive rate-nya 37,8% dan 41,0%, selisih hanya 3,2. Positive rate tampak wajar, padahal jantan jauh lebih sering terlewat.

## Split baru
*Apakah selisihnya bertahan pada split baru dari penguin yang sama?*

Tekan **Sampel baru** untuk membuat split baru dari penguin yang sama. Pada tiga split berikutnya, recall jantan adalah 72,5%, 60,8% dan 64,7%, sedangkan recall betina 100,0%, 96,6% dan 100,0%. Selisihnya besar setiap kali. Selisih positive rate adalah 3,2 pada split pertama, lalu 14,0, 3,2 dan 4,3 pada tiga split berikutnya, sehingga satu split dapat tampak lebih baik atau lebih buruk daripada yang lain.

::: deeper Mengapa yang jantan
Lab menunjukkan di mana model gagal, bukan mengapa. Satu petunjuk ada pada massa tubuh: Adelie jantan rata-rata 4043 g dan 44% di antaranya berada di atas batas 4050 g, sedangkan Adelie betina rata-rata 3369 g dan tidak ada satu pun yang melewatinya. Batas yang jatuh di tengah sebuah kelompok sulit ditebak hanya dari ukuran tubuh, dan model tidak dapat melihat jenis kelamin. Perlakukan ini sebagai petunjuk yang perlu diperiksa, seperti pada pelajaran pertama.
:::

::: remember
- Satu angka accuracy dapat menyembunyikan galat yang berbeda: baca tabel tiap kelompok beserta jumlah barisnya, lalu bandingkan accuracy, positive rate, recall dan false-positive rate.
- Satu threshold untuk tiap kelompok dapat menutup satu selisih, tetapi biasanya membuka selisih lain atau mengorbankan accuracy, karena base rate-nya berbeda.
- Feature yang berkorelasi berbagi permutation importance dan kredit Shapley: tiap bar tampak lebih kecil sementara pasangannya tetap bernilai, dan bar-bar itu menggambarkan model, bukan dunia.
:::

@@lab

## Lab: audit sebuah model yang sudah di-fit
Kamu mengaudit satu regresi logistik pada baris held-out miliknya. Kamu mengubah threshold, korelasi antara dua feature, dan kasus yang dijelaskan, lalu membaca bagaimana galat, importance, dan satu penjelasan bereaksi. Angka-angka di bawah berlaku untuk **Reset**; angka penguin berlaku untuk **Reset**, lalu **Data** diatur ke **Penguin (data nyata)**.

### Kontrol
- **Data** berpindah antara **Data buatan** dan **Penguin (data nyata)**. Perpindahan ini men-fit ulang model dan mengembalikan threshold.
- **Bandingkan kelompok menurut** (hanya penguin) memilih **Jenis kelamin** atau **Spesies** sebagai kelompoknya.
- **Threshold berbeda untuk tiap kelompok** menyalakan satu threshold untuk tiap kelompok. **Threshold** (0,01 sampai 0,99, awalnya 0,50) adalah threshold bersama dan disembunyikan selama pengaturan ini menyala. Setelah itu ada satu slider untuk tiap kelompok: **Threshold untuk Kelompok A**, **Threshold untuk Kelompok B** (**Threshold untuk Betina**, **Threshold untuk Jantan** pada penguin).
- **Samakan positive rate** dan **Samakan recall**, di bawah **Samakan kelompok lain dengan yang pertama**, menggeser threshold setiap kelompok lain sampai positive rate atau recall-nya sama dengan kelompok pertama (kolom pertama tabel). Keduanya menyalakan threshold per kelompok dan berangkat dari threshold kelompok pertama saat itu. Catatan di bawahnya mengatakan hal yang sama.
- **Sampel baru** menarik sampel buatan yang baru, atau membuat split baru dari penguin. Tombol ini mengembalikan semua threshold ke 0,50 dan mematikan pengaturan per kelompok.
- **Korelasi antara kedua feature** (0 sampai 0,99, awalnya 0,20) menentukan seberapa dekat feature kedua menyalin yang pertama, dan men-fit ulang model. Nilainya bertahan ketika kamu berpindah data atau menekan **Sampel baru**; **Reset** mengembalikannya ke 0,20.
- **Nomor kasus**, **Kasus acak** dan **Prediksi salah berikutnya** memilih kasus yang dijelaskan oleh **Mengapa prediksi ini? (nilai Shapley)**. **Kasus acak** tidak memakai seed, sehingga angkanya tidak tetap.
- **Layar penuh** memperbesar lab. **Reset** kembali ke data buatan, sampel pertama, satu threshold 0,50, korelasi 0,20 dan kasus 2.
- **Kuis Cepat** adalah tombol di bawah kartu pengaturan (tombol bulat di kanan bawah pada ponsel). Isinya satu pertanyaan: "Jika korelasi antara kedua feature dinaikkan, apa yang terjadi pada tiap bar importance?" Pilih jawaban, naikkan korelasi ke 0,70 atau lebih, lalu tekan **Periksa jawaban**; hasil pemeriksaannya membandingkan dengan korelasi 0,20.

### Membaca layar
- Grafik teratas menunjukkan kurva skor tiap kelompok, dengan **Probabilitas positif yang diprediksi** di sumbu bawah dan **Porsi kelompok** di sumbu samping. Garis putus-putus adalah threshold, dan baris di kanan garis diprediksi positif. Baris status berbunyi, misalnya, "Accuracy keseluruhan 78,8%. Selisih terbesar: positive rate, 26,7 poin (Kelompok A 64,2%, Kelompok B 37,5%)." Baris detail memberi jumlah baris yang diaudit untuk tiap kelompok, dan di kanan kotak status tertulis "601 baris latih, 599 diaudit".
- **Galat menurut kelompok** punya kolom **Metrik**, satu kolom untuk tiap kelompok, dan **Selisih**, serta baris **Baris**, **Base rate (sebenarnya positif)**, **Accuracy**, **Precision**, **Recall**, **False-positive rate** dan **Positive rate (diprediksi positif)**. Selisih yang diarsir berukuran 5 poin atau lebih, segitiga menandai 10 atau lebih, dan n/a berarti tidak ada yang bisa dibagi. Dengan **Spesies**, Gentoo punya base rate 100,0%, sehingga false-positive rate-nya n/a.
- **Trade-off: satu threshold atau threshold-mu** punya kolom **Ukuran**, **Satu threshold, 0,50**, **Threshold-mu** (labelnya sama ketika ada beberapa threshold) dan **Perubahan**, serta baris **Accuracy**, **Selisih positive rate**, **Selisih recall** dan **Selisih false-positive rate**. Setelah tombol Samakan, baris detail menambahkan nilai yang dicapai, misalnya "Positive rate sekarang: Kelompok A 64,2%, Kelompok B 64,4%."
- **Permutation importance** punya satu bar untuk masing-masing **sinyal**, **salinan sinyal**, **sinyal lain** dan **noise** (**panjang sirip**, **salinan sirip**, **panjang paruh**, **kedalaman paruh** pada penguin), serta **Keduanya bersama**, dengan error bar satu simpangan baku dari 20 kali pengacakan. Sumbunya **Accuracy yang hilang saat diacak**. Baris status menambahkan jumlah kedua bar, nilai pasangannya, dan accuracy model.
- **Mengapa prediksi ini? (nilai Shapley)** dimulai dari **Kasus rata-rata**, menambahkan satu bar untuk tiap feature beserta nilainya, seperti "sinyal = -0,20", dan berakhir di **Kasus ini**. Garis putus-putus menandai threshold. Baris statusnya menyebutkan apakah model benar dan feature mana yang mendorong paling besar.

### Eksperimen
Mulai setiap eksperimen dengan **Reset**, supaya angkamu sama.

1. Prediksikan: kedua kelompok punya accuracy yang sama. Apakah baris-baris lain pada **Galat menurut kelompok** ikut sama? Baca tabelnya. Accuracy-nya 78,8% di kedua kelompok, tetapi selisih **Positive rate (diprediksi positif)** 26,7 poin, precision 17,5, recall 9,4 dan **False-positive rate** 11,4. Bandingkan **Base rate (sebenarnya positif)**, 60,8% dan 31,3%, lalu jelaskan bagaimana base rate menerangkan positive rate itu.
2. Prediksikan: dapatkah satu threshold bersama menghapus selisih positive rate tanpa merugikan accuracy? Geser **Threshold** dari 0,20 sampai 0,90 dan perhatikan selisih **Positive rate (diprediksi positif)** serta baris status: selisihnya tetap di antara 5,9 dan 28,8 poin (terbesar pada 0,60), dan di kedua ujung, 5,9 pada 0,90 dan 10,8 pada 0,20, accuracy hanya 53,3% dan 62,8%. Lalu tekan **Reset** dan tekan **Samakan positive rate**. Threshold Kelompok B menjadi 0,36, selisihnya menjadi 0,1, dan tabel trade-off menunjukkan accuracy dari 78,8% menjadi 73,6%, **Selisih false-positive rate** dari 11,4 menjadi 22,2 dan **Selisih recall** dari 9,4 menjadi 2,6. Jelaskan apa baris-baris B yang diberi flag tambahan itu.
3. Prediksikan: setelah **Samakan recall**, apakah positive rate ikut sama? Tekan **Reset**, lalu **Samakan recall**. Threshold B menjadi 0,42, recall 85,4% dan 86,0%, accuracy 76,5%, tetapi selisih positive rate masih 11,7 poin dan selisih precision 29,7. Pakai identitas dalam pelajaran untuk menjelaskan sebabnya. Lalu tekan **Samakan positive rate** dan bandingkan selisih recall-nya.
4. Prediksikan: naikkan **Korelasi antara kedua feature** dari 0,20 ke 0,95. Bar importance mana yang berubah? Pilih dulu jawaban di **Kuis Cepat**. Lalu baca baris status pada 0,20 (sinyal 25,9%, salinan sinyal 0,0%, keduanya bersama 25,4%) dan pada 0,95 (14,5%, 6,9%, 25,8%). Coba 0,99 juga: 10,9% dan 9,0%. Apakah salinan sinyal menjadi penyebab hasilnya? Bagaimana kamu tahu?
5. Prediksikan: pada korelasi 0,95, bagaimana penjelasan kasus 2 berubah? Tekan **Reset**, lalu baca **Mengapa prediksi ini? (nilai Shapley)**: sinyal -7,7, salinan 0,0, sinyal lain -11,7, Kasus ini 34,5%. Naikkan korelasi ke 0,95: sinyal -5,3, salinan -5,6, sinyal lain -12,1, Kasus ini 31,2%. Tekan **Prediksi salah berikutnya** dan lihat apakah kreditnya terbagi lagi pada kasus lain.
6. Prediksikan: pada penguin nyata menurut jenis kelamin, apakah positive rate yang sama berarti recall yang sama? Tekan **Reset**, atur **Data** ke **Penguin (data nyata)**, dan baca tabelnya: positive rate 37,8% dan 41,0% (selisih 3,2), recall 100,0% untuk **Betina** dan 62,7% untuk **Jantan**. Tekan **Samakan recall**: threshold untuk Jantan menjadi 0,10, recall menjadi 98,0%, false-positive rate jantan menjadi 87,5% dan accuracy keseluruhan menjadi 81,2%. Tekan **Reset**, atur **Data** ke **Penguin (data nyata)** lagi, lalu tekan **Sampel baru** tiga kali sambil membaca recall kedua jenis kelamin setiap kali (jantan 72,5%, 60,8%, 64,7%; betina 100,0%, 96,6%, 100,0%). Apakah selisih recall bertahan pada setiap split? Terakhir, tekan **Reset**, atur **Data** ke **Penguin (data nyata)** dan korelasi ke 0,90: panjang sirip turun dari 28,6% menjadi 14,9% dan salinan sirip naik dari 0,3% menjadi 5,1%, sementara keduanya bersama naik dari 29,7% menjadi 31,8%.
