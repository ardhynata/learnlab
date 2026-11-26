---
slug: feature-ablation-lab
title: Lab feature ablation
---
::: intro
- Menambahkan feature kandidat satu per satu dan menilai tiap peningkatan skor dengan membandingkannya terhadap sebaran skor fold cross-validation.
- Menjelaskan mengapa peningkatan pada satu split bisa lenyap ketika diuji di seluruh fold, memakai kolom noise yang naik 4,2 poin pada satu split.
- Memakai ablation untuk melihat apa yang dihasilkan tiap feature ketika feature lain sudah ada, dan mengenali target encoding yang membocorkan label.

Sebelum mulai: baca "Interactions and transformations", "High-cardinality categories and target encoding", dan "Cross-validation and stratification". Dua pelajaran pertama membangun feature yang kamu uji di sini. Pelajaran ketiga mengajarkan fold dan sebarannya, yang dipakai di sini tanpa diajarkan ulang.
:::

## Ketika sebuah feature tampak membantu
*Bagaimana kamu tahu bahwa feature baru benar-benar membantu?*

Kamu sudah membangun beberapa jenis kolom: hasil kali, logaritma, rasio, dan target encoding. Masing-masing memunculkan pertanyaan yang sama. Skornya lebih tinggi setelah kolom itu ditambahkan, entah naik 1 poin atau 4. Apakah feature-nya yang membantu, atau angkanya hanya berfluktuasi secara kebetulan?

"Cross-validation and stratification" memberimu gagasan yang diperlukan. Skor validasi bergerak mengikuti baris yang ditahan, sehingga sebuah skor punya sebaran. Peningkatan adalah selisih dua skor, jadi peningkatan juga punya sebaran.

Pelajaran ini menjalankan percobaan dari dua arah. **Menambah** dimulai dari baseline, yaitu skor dari selalu menebak kelas mayoritas. Lalu feature ditambahkan satu per satu dan model dinilai setelah tiap penambahan. **Ablation** dimulai dari model dengan semua feature sudah dimasukkan, lalu membuang satu per satu. Skor yang hilang ketika sebuah feature dibuang adalah apa yang dihasilkan feature itu.

Lab ini menjalankan keduanya pada model regresi logistik, dinilai dengan accuracy. Tabel buatannya berisi 400 baris, sembilan feature kandidat, dan target 0/1.

> Gagasan kunci: sebuah feature layak dipertahankan hanya jika skor berubah lebih besar daripada fluktuasi skor itu sendiri.

## Satu split hanyalah satu undian
*Mengapa sebuah feature bisa menambah skor pada satu split tetapi tidak pada split lain?*

Ambil dua feature dari tabel buatan: x1, yang membawa informasi nyata, dan z1, kolom angka acak yang dibuat tanpa melihat target. Tahan 120 dari 400 baris sebagai satu test split, lalu latih model pada 280 baris sisanya. Dengan x1 saja, model benar pada 84 dari 120 baris, yaitu 70,0%. Tambahkan z1, dan model benar pada 89 baris, yaitu 74,2%. Kolom noise itu "menambah" 5 baris, yaitu 4,2 poin.

Sekarang ambil empat split lain dari 400 baris yang sama. Peningkatan z1 dibandingkan x1 saja adalah +1,7, +0,8, -3,3, dan -1,7 poin, sedangkan pada split pertama +4,2. Barisnya, feature-nya, dan modelnya tidak berubah. Yang berubah hanya pilihan 120 baris uji. Satu baris uji bernilai 1 / 120, yaitu 0,83 poin, sehingga setiap peningkatan itu hanyalah beberapa baris.

Cross-validation menguji semua 400 baris, masing-masing satu kali. Di sana peningkatan z1 adalah +2,0 poin, yaitu 8 baris dari 400.

[[figure:feature-ablation-lab/five-splits|Peningkatan dari menambahkan kolom noise z1 pada lima single split yang berbeda (titik), dan peningkatannya pada cross-validation 5 fold dengan sebaran fold (pita berarsir).]]

> Awas: peningkatan yang diukur pada satu split adalah satu undian dari sebaran yang tidak kamu lihat. Cross-validation memperlihatkan sebaran itu.

## Peningkatan harus melampaui sebaran
*Seberapa besar peningkatan agar layak dipercaya?*

Ambil lima fold yang masing-masing berisi 80 baris. Dengan x1 saja, fold-nya benar pada 54, 58, 55, 55, dan 58 baris. Rata-ratanya 70,0% dan sebarannya (simpangan baku, dibagi n - 1) 2,3 poin. Dengan z1 ditambahkan, fold-nya benar pada 57, 61, 55, 56, dan 59 baris: rata-rata 72,0% dan sebaran 3,0.

Peningkatannya 2,0 poin dan sebarannya 3,0, jadi peningkatan itu masih di dalam noise. Lab ini memakai aturan praktis ini: sebuah feature **bertahan di semua fold** hanya jika peningkatan cross-validation-nya lebih besar daripada sebaran fold. Bandingkan dengan langkah pertama. Baseline yang menebak mayoritas mendapat 53,3% ± 5,5, dan x1 menaikkannya menjadi 70,0% ± 2,3, peningkatan 16,8 poin (16,8 sebelum pembulatan), jauh di atas sebaran mana pun.

Lab memberi tiap langkah salah satu dari empat vonis: Bertahan di semua fold, Hanya single split (fold tidak membenarkannya, tetapi single split naik satu poin atau lebih), Tidak ada perubahan berarti, atau Lebih buruk.

[[figure:feature-ablation-lab/forward-steps|Sembilan feature yang ditambahkan berurutan pada data buatan. Tiap langkah menampilkan rata-rata cross-validation beserta sebarannya, single split (belah ketupat), dan vonis lab.]]

::: deeper Mengapa tidak menghitung fold satu per satu?
Kamu mungkin memperhatikan bahwa z1 tidak kalah di fold mana pun: ia unggul 3 dan 3 baris, seri di satu fold, lalu unggul 1 dan 1. Empat kemenangan kecil tanpa satu pun kekalahan tampak meyakinkan. Namun kelima bagian latih itu berbagi tiga perempat barisnya, sehingga kelima selisih itu bukan undian yang independen. Aturan sebaran adalah cara membaca yang berhati-hati. Untuk kasus yang tipis, ulangi cross-validation dengan pengacakan berbeda, seperti yang dimungkinkan tombol Sampel baru di lab, jangan hanya mengandalkan lima fold. Pada empat sampel baru dari tabel buatan, peningkatan z1 adalah 0,0, 0,0, +0,5, dan 0,0 poin.
:::

## Feature yang baru berarti bersama
*Mengapa dua feature bisa tampak tidak berguna sendirian, tetapi tetap layak ditambahkan?*

Teruskan menambah dengan urutan lab: x2, u, v, lalu u × v. Feature x2 adalah sinyal nyata yang lebih lemah daripada x1. Feature u dan v adalah dua angka independen yang baru berarti bersama: target condong ke satu arah ketika u dan v bertanda sama, dan ke arah lain ketika tandanya berbeda. Garis lurus tidak dapat melihat hal itu dari u saja atau v saja. Ini adalah gagasan interaksi dari "Interactions and transformations".

Skor cross-validation-nya berjalan 70,0% (x1), 72,0% (z1), lalu 71,0% untuk x2, 72,0% untuk u, dan 73,0% untuk v. Tiap perubahan paling besar 1,0 poin, terhadap sebaran 6,3 sampai 7,4 poin. Kemudian u × v masuk: 79,3% ± 5,2, peningkatan 6,3 poin. Single split sejalan, dengan +5,8, dan vonisnya Bertahan di semua fold, meskipun hanya dengan selisih tipis.

Tabel yang sama memuat peringatan. Perubahan x2 adalah -1,0 poin. Padahal x2 membawa informasi nyata, dan dengan 400 baris lab tidak dapat membuktikannya. Di dalam noise berarti belum terbukti, bukan berarti tidak ada.

> Awas: menambah dengan urutan tetap membuat tiap feature dianggap berjasa atas sisa yang ditinggalkan feature sebelumnya. u dan v tampak tidak berarti sampai hasil kalinya hadir.

## Ablation: buang satu per satu
*Apa yang dihasilkan sebuah feature setelah semua feature lain ada?*

Centang delapan feature pertama, semuanya kecuali category region. Model mendapat 78,8% ± 4,8. Sekarang buang satu feature pada satu waktu dan nilai lagi.

| Feature dibuang | Skor tanpa ini | Turun (poin) | Vonis |
| --- | --- | --- | --- |
| x1 | 69,3% | 9,5 | Layak dipertahankan |
| u × v | 72,5% | 6,3 | Layak dipertahankan |
| x2 | 75,3% | 3,5 | Dalam rentang noise |
| z1, z2, z3, u, dan v | 78,8% sampai 79,8% | -1,0 sampai 0,0 | Dalam rentang noise |

Penurunan yang lebih besar daripada sebaran membuat sebuah feature layak dipertahankan. Hanya x1 dan u × v yang lolos. Kolom noise tidak menyebabkan kerugian apa pun, jadi boleh dibuang. Begitu juga u dan v, karena hasil kalinya sudah membawa apa yang mereka bawa bersama. Simpan hanya x1, x2, dan u × v, dan skornya 78,3% ± 3,3, hampir sama dengan model delapan feature, tetapi hanya memakai tiga kolom dan sebarannya lebih kecil.

Ablation juga punya titik buta. Jika dua feature membawa informasi yang sama, membuang salah satunya hampir tidak merugikan, karena yang lain menggantikannya. Feature yang kuat ketika ditambahkan lebih awal bisa tampak tidak berguna dalam ablation. Pada penguin, Panjang sirip menambah 18,3 poin ketika ditambahkan, tetapi membuangnya dari model penuh yang berisi sembilan feature hanya menurunkan skor 0,3.

[[figure:feature-ablation-lab/ablation-drops|Skor yang hilang ketika masing-masing dari delapan feature dibuang dari model penuh. Hanya dua penurunan di luar pita sebaran yang layak dipertahankan.]]

## Peningkatan yang dibuat dari label
*Mengapa peningkatan yang bertahan di setiap fold masih bisa palsu?*

Centang feature kesembilan, region: kolom teks dengan 175 nilai berbeda di antara 400 baris, sekitar dua baris per nilai. Efek nyatanya lemah. Dari "High-cardinality categories and target encoding", kamu tahu cara mengubahnya menjadi satu angka, dan kamu tahu dua caranya. Cara **Out-of-fold (jujur)** di lab membangun ulang encoding di dalam setiap putaran cross-validation, hanya dari fold latih. Cara **Naive (leakage)** membangunnya sekali dari semua 400 label, sebelum fold mana pun dipotong.

Encoding yang jujur memberi 79,8% ± 5,0, peningkatan +1,0 terhadap delapan feature, masih di dalam noise. Yang naive memberi 87,3% ± 1,6, peningkatan 8,5 poin, dan vonis lab berbunyi Bertahan di semua fold. Tanpa region, skornya 78,8% ± 4,8. Skor naive 7,5 poin di atas yang jujur, dan sebarannya kecil, sehingga tampak lebih meyakinkan juga. Poin-poin itu adalah label tiap baris sendiri yang disalin ke feature-nya sendiri.

Cross-validation hanya melindungimu dari apa yang terjadi di dalam fold. Langkah yang membaca label di luar fold memberi setiap baris uji jawabannya sendiri. Peningkatan besar dari kolom lemah yang banyak nilainya adalah alasan untuk memeriksa.

[[figure:feature-ablation-lab/leak|Skor cross-validation dari delapan feature ditambah region: region dibuang, di-encode out-of-fold, dan di-encode secara naive. Batang menunjukkan satu simpangan baku.]]

## Rutinitas untuk feature baru
*Bagaimana memakai semua ini pada tabel nyata?*

Berikut rutinitas singkatnya.

1. Nilai baseline: tebakan mayoritas, atau model kamu saat ini.
2. Tambahkan satu feature, atau satu kelompok yang masuk akal seperti u, v, dan u × v, lalu catat rata-rata cross-validation beserta sebarannya.
3. Pertahankan hanya jika peningkatannya melampaui sebaran. Jika tipis, ulangi cross-validation dengan pengacakan berbeda.
4. Di akhir, buang tiap feature secara bergantian dan singkirkan yang tidak menimbulkan kerugian.
5. Simpan test set akhir tanpa disentuh. Memilih di antara banyak feature berdasarkan skor cross-validation sudah merupakan sebuah seleksi, sehingga skor itu sedikit terlalu optimistis.

Cobalah pada penguin nyata: 333 penguin yang datanya lengkap, dengan target membedakan jantan dari betina. Pada pengacakan pertama, Kedalaman paruh (+14,4), Panjang sirip (+18,3), dan Massa tubuh (+7,2) bertahan di semua fold. Tahun dan Rasio paruh tidak mengubah apa pun (0,0). Dalam sepuluh pengacakan fold, Kedalaman paruh dan Panjang sirip bertahan di kesepuluhnya, Massa tubuh di sembilan, Pulau di tiga, dan category di satu. Kasus yang tipis berganti-ganti. Feature yang kuat tidak.

::: remember
- Peningkatan baru dihitung jika lebih besar daripada sebaran antar fold. Peningkatan pada satu split bisa hanya berasal dari beberapa baris yang kebetulan beruntung.
- Tambahkan feature satu per satu, lalu lakukan ablation: membuang sebuah feature menunjukkan apa yang dihasilkannya ketika feature lain sudah ada. Feature yang bekerja bersama bisa tampak tidak berguna sendirian.
- Semua yang dibangun dari label harus dibangun ulang di dalam setiap fold. Target encoding yang naive bisa lolos cross-validation dan tetap merupakan leakage.
:::

@@lab

## Lab: menambah feature dan ablation
Lab ini berjudul "Menambah feature: apakah peningkatannya bertahan di cross-validation?". Kamu mulai dengan tabel buatan 400 baris dan dua feature pertamanya, x1 dan z1, yang sudah dicentang. Kamu menambah feature satu per satu dan memperhatikan dua skor untuk model yang sama: accuracy cross-validation 5 fold dan accuracy pada satu split tetap. Dua tabel dan satu grafik di bawah grafik utama menunjukkan apa akibat membuang sebuah feature dan apa yang dilakukan feature category pada dua cara encoding.

### Kontrol
- **Data** berpindah antara **Data buatan** dan **Penguin (data nyata)**. Data nyata menanyakan apakah seekor penguin jantan. Mengganti data hanya mencentang dua feature pertama dan menghapus jawaban Kuis Cepat.
- **Tambah feature berikutnya** (kelompok **Feature**) mencentang feature pertama yang belum dicentang di daftar. Baris di atas daftar berbunyi "Feature berikutnya: x2".
- **Hapus semua feature** menghapus semua centang.
- **Sampel baru** (kelompok **Data dan split**) membuat tabel buatan yang baru. Pada data nyata, penguinnya tetap sama dan kelima fold diacak ulang.
- **Single split lain** memilih 30% baris yang berbeda (120 dari 400) sebagai baris uji single split. Fold tidak berubah.
- **Feature kandidat** adalah daftar centang. Centang atau hapus centang feature apa pun, dalam urutan apa pun; angka seperti #1 menunjukkan urutan penambahan. Feature buatan adalah x1, z1, x2, u, v, u × v, z2, z3, dan region (category). Feature penguin adalah **Kedalaman paruh (mm)**, **Pulau (proporsi penguin di sana)**, **Panjang sirip (mm)**, **Tahun**, **Panjang paruh (mm)**, **Rasio paruh (panjang ÷ kedalaman)**, **Panjang sirip kuadrat**, **Massa tubuh (g)**, dan **Panjang paruh sebagai category**.
- **Target encoding untuk feature category** memilih **Out-of-fold (jujur)** atau **Naive (leakage)**. Pilihan ini hanya mengubah skor selama feature category dicentang.
- **Tampilkan sebenarnya tiap feature itu apa** menulis catatan singkat di bawah tiap feature, misalnya "(murni noise)". Awalnya mati: tebak dulu.
- **Layar penuh** memperbesar lab. **Reset** mengembalikan lab ke data buatan dengan x1 dan z1 tercentang, sampel dan split pertama, **Out-of-fold (jujur)**, dan sakelar mati.
- **Kuis Cepat** adalah tombol di bawah kartu pengaturan (tombol bulat di kanan bawah pada ponsel). Isinya dua kuis: "Apakah menambahkan feature ini akan memperbaiki skor cross-validation?" dengan pilihan "Ya, lebih besar daripada sebaran antar fold", "Tidak, hampir sama: perubahannya masih dalam noise", dan "Tidak, justru memburuk", dengan baris "Feature ini: x2" yang menyebut feature berikutnya; dan "Target encoding naive menghitung label setiap baris di feature milik baris itu sendiri. Apa akibatnya pada skor cross-validation feature category?". Pilih jawaban lebih dulu. Lalu tekan **Tambah feature berikutnya** untuk kuis pertama, atau ubah **Target encoding untuk feature category** untuk kuis kedua, dan kotaknya menjawab dengan angka.

### Membaca layar
- Grafik utama menggambar **Akurasi** setelah tiap langkah, dari "kosong" sampai feature terakhir yang ditambahkan. Titik besar adalah **Rata-rata cross-validation**, dengan titik pudar untuk tiap fold dan garis ± 1 simpangan baku. Belah ketupat adalah **Single split tetap**. Garis putus-putus adalah **Menebak kelas mayoritas**. Jika belum ada feature yang dicentang, tertulis "Centang sebuah feature, atau tekan "Tambah feature berikutnya"."
- Baris status pada awalnya berbunyi "2 feature: cross-validation 72,0% ± 3,0 poin dari 5 fold, single split 74,2%." Baris rincian menyebut berapa baris yang dipakai single split untuk melatih dan menguji. Di kanan: "400 baris, 5 fold".
- Tabel **Skor setelah tiap feature ditambahkan** punya kolom **#**, **Feature ditambahkan**, **Cross-validation**, **Selisih**, **Single split**, **Selisih**, dan **Vonis**. Baris pertamanya "kosong (tebak mayoritas)". Selisih dalam poin persentase, dihitung sebelum skor dibulatkan, sehingga bisa berbeda 0,1 dari hasil pengurangan skor yang tertulis. Vonisnya: **Bertahan di semua fold**, **Hanya single split**, **Tidak ada perubahan berarti**, dan **Lebih buruk**. Pada data nyata, baris "kosong" berada di bawah 50%, dan catatan di bawah tabel menjelaskan alasannya.
- Tabel **Buang satu feature pada satu waktu** punya kolom **Feature dibuang**, **Skor tanpa ini**, **Turun (poin)**, dan **Vonis**. Baris pertamanya "Semua 2 feature yang dicentang", dan vonisnya **Layak dipertahankan**, **Dalam rentang noise**, dan **Merugikan: tanpa ini lebih baik**. Penurunan yang lebih kecil daripada sebaran antar fold masih dalam rentang noise.
- Grafik **Feature category: encoding out-of-fold atau naive** punya tiga batang: **Dibuang**, **Out-of-fold**, dan **Naive (leakage)**, dengan sumbu **Akurasi cross-validation**. Grafik ini memakai feature yang kamu centang ditambah category, dan satu baris di bawahnya berbunyi, misalnya, "Dengan region (category): naive 84,0%, out-of-fold 72,2%, dibuang 72,0%."

### Eksperimen
Tekan **Reset** sebelum tiap eksperimen supaya angkamu sama dengan angka di bawah.

1. **Kolom noise pada satu split.** Prediksikan: apakah x1 lalu z1 akan memperbaiki skor cross-validation? Tekan **Hapus semua feature**. Pada Kuis Cepat pertama, jawab untuk feature berikutnya, x1, lalu tekan **Tambah feature berikutnya**. Skor cross-validation naik dari 53,3% ± 5,5 menjadi 70,0% ± 2,3 (+16,8, Bertahan di semua fold). Sekarang prediksikan untuk z1 dan tekan tombolnya lagi. Skor cross-validation pindah ke 72,0% ± 3,0 (+2,0), sementara single split naik dari 70,0% menjadi 74,2% (+4,2), dan vonisnya Hanya single split. Nyalakan **Tampilkan sebenarnya tiap feature itu apa**. Mengapa belah ketupat naik dua kali lebih besar daripada fold?
2. **Single split lain.** Prediksikan: jika kamu menarik single split yang berbeda, apakah belah ketupat z1 akan mempertahankan peningkatannya? Dengan x1 dan z1 tercentang, tekan **Single split lain** empat kali dan baca Selisih di sebelah **Single split** pada baris z1 setiap kali. Angkanya +1,7, +0,8, -3,3, dan -1,7, sementara angka cross-validation tidak bergerak. Lalu tekan **Reset** dan **Sampel baru** empat kali: peningkatan cross-validation z1 adalah 0,0, 0,0, +0,5, dan 0,0, tidak pernah di atas sebaran. Apa yang ditunjukkan ini tentang membaca satu split?
3. **Dua feature yang bekerja bersama.** Prediksikan: u dan v adalah dua angka independen. Apakah menambahkannya akan membantu? Tekan **Reset**, lalu tekan **Tambah feature berikutnya** empat kali, dan jawab Kuis Cepat lebih dulu setiap kali. Langkahnya adalah x2 (71,0% ± 6,9, -1,0), u (72,0% ± 7,4, +1,0), v (73,0% ± 6,3, +1,0, dengan Hanya single split karena belah ketupat naik 2,5), dan u × v (79,3% ± 5,2, +6,3, Bertahan di semua fold). Nyalakan **Tampilkan sebenarnya tiap feature itu apa**. Mengapa hasil kalinya membantu padahal bagian-bagiannya tidak?
4. **Ablation.** Prediksikan: baris mana yang akan berbunyi Layak dipertahankan? Tekan **Reset**, lalu tekan **Tambah feature berikutnya** enam kali sehingga z2 dan z3 ikut masuk. Model mendapat 78,8% ± 4,8. Baca **Buang satu feature pada satu waktu**: hanya x1 (+9,5) dan u × v (+6,3) yang layak dipertahankan, x2 adalah +3,5 dan Dalam rentang noise, dan sisanya berada di antara -1,0 dan 0,0. Hapus centang z1, u, v, z2, dan z3 secara manual. Tiga feature yang tersisa, x1, x2, dan u × v, mendapat 78,3% ± 3,3. Mengapa feature yang nyata, x2, tetap Dalam rentang noise?
5. **Encoding yang bocor.** Prediksikan: pada Kuis Cepat kedua, pilih apa akibat encoding naive pada skor category. Tekan **Tambah feature berikutnya** sampai region (category) tercentang: secara out-of-fold skornya 79,8% ± 5,0 (+1,0, Tidak ada perubahan berarti). Sekarang atur **Target encoding untuk feature category** ke **Naive (leakage)**. Skornya menjadi 87,3% ± 1,6 (+8,5, Bertahan di semua fold), dan grafik menunjukkan **Dibuang** 78,8%, **Out-of-fold** 79,8%, dan **Naive (leakage)** 87,3%, dengan baris yang menyatakan naive 7,5 poin lebih tinggi. Pada **Buang satu feature pada satu waktu**, region kini menghasilkan 8,5 poin dan x1 hanya 2,0. Penurunan mana yang akan kamu percaya?
6. **Penguin, split baru dan sampel baru.** Prediksikan: feature penguin mana yang akan bertahan di cross-validation? Tekan **Reset**, atur **Data** ke **Penguin (data nyata)**, tekan **Hapus semua feature**, lalu tekan **Tambah feature berikutnya** sembilan kali. Baris pertama, "kosong", mendapat 46,0% ± 2,5. Kedalaman paruh (+14,4), Panjang sirip (+18,3), dan Massa tubuh (+7,2) bertahan di semua fold. Tahun dan Rasio paruh menambah 0,0, dan Pulau (+3,0 terhadap sebaran 4,6) Hanya single split. Pada **Buang satu feature pada satu waktu**, kesembilannya mendapat 89,5% ± 2,6 dan hanya Massa tubuh yang layak dipertahankan (6,9 poin). Selanjutnya tekan **Single split lain** dua kali: untuk **Panjang paruh sebagai category** peningkatan single split-nya berubah dari +5,0 menjadi 0,0 dan 0,0, sementara peningkatan cross-validation-nya tetap +1,8. Lalu tekan **Sampel baru** satu kali: Pulau menjadi +2,4 terhadap sebaran 1,5, Panjang paruh sebagai category menjadi +3,0 terhadap 3,0 (Bertahan di semua fold, tipis sekali, karena angkanya dibulatkan), dan Massa tubuh turun menjadi Hanya single split (+5,1 terhadap 5,5). Feature mana yang akan kamu pertahankan, dan vonis mana yang tidak kamu percaya?
