---
slug: pipelines-and-leakage
title: Pipeline dan leakage
---
::: intro
- Rangkai pengisian, encoding, scaling, dan sebuah model menjadi satu pipeline berurutan, lalu fit setiap langkah hanya pada baris latih.
- Sebutkan tiga jalan yang membuat informasi dari baris uji masuk ke proses pelatihan: preprocessing yang di-fit sebelum data dibagi, pemilihan feature dengan semua label, dan duplikat.
- Perkirakan di Leakage lab seberapa jauh akurasi uji pipeline yang bocor melampaui pipeline yang benar, pada label acak dan pada penguin yang asli.

Sebelum mulai: baca "Missing values and encoding", "Scaling and encoding", dan "Outliers and correlation". Dua yang pertama memberimu langkah-langkahnya (mengisi, encode, scale) dan kebiasaan men-fit pada baris latih; yang ketiga menunjukkan seberapa erat sebuah kolom bergerak bersama label. Pelajaran ini merangkai langkah-langkah itu dan menunjukkan apa yang rusak ketika kebiasaan tersebut ditinggalkan.
:::

## Satu resep, bukan empat pekerjaan
*Mengapa langkah-langkah itu diperlakukan sebagai satu resep yang berurutan?*

Dua pelajaran terakhir memberimu tiga langkah persiapan: mengisi kekosongan, meng-encode kategori, dan men-scale angka. Tambahkan model, dan kamu punya resep empat langkah dengan urutan tetap: isi, encode, scale, belajar.

Setiap langkah mempelajari sesuatu dari data. Imputer (langkah pengisi) mempelajari sebuah median untuk tiap kolom, encoder sebuah daftar kategori, scaler sebuah rata-rata dan simpangan baku, dan model bobotnya. Urutannya bukan soal selera: sel kosong tidak dapat di-scale, dan resep ini menghitung rata-rata setelah kekosongan terisi, sehingga langkah pengisi harus berjalan lebih dulu.

**Pipeline** adalah resep itu dalam bentuk satu objek, yaitu daftar langkah yang berurutan. Untuk men-**fit**-nya, kamu menyerahkan baris latih. Langkah pertama mempelajari angkanya lalu meneruskan baris yang sudah berubah ke langkah berikutnya, begitu seterusnya sampai ke model. Saat memprediksi, baris baru melewati langkah-langkah yang sama dengan angka yang sudah dipelajari. Tidak ada yang dipelajari ulang.

Keuntungannya adalah disiplin. Satu panggilan men-fit setiap langkah pada baris yang kamu serahkan, sehingga tidak ada langkah yang secara tidak sengaja di-fit pada baris lain.

[[figure:pipelines-and-leakage/pipeline-recipe|Pipeline adalah empat langkah dengan urutan tetap. Masing-masing mempelajari angkanya hanya dari baris latih. Baris uji dan baris baru melewatinya dengan angka yang tidak berubah.]]

## Fit pada baris latih, terapkan ke setiap baris
*Apa yang dibawa sebuah langkah yang sudah di-fit dari baris latih ke baris uji?*

Setiap langkah hanya meninggalkan beberapa angka.

| Langkah | Dipelajari dari baris latih | Dilakukan pada baris mana pun |
|---|---|---|
| Isi | sebuah median untuk tiap kolom | memasukkannya ke sel kosong |
| Encode | kategori yang pernah dilihat | menulis kolom one-hot |
| Scale | sebuah rata-rata dan simpangan baku | z = (nilai - rata-rata) / simpangan baku |
| Model | bobotnya | memprediksi |

> Contoh hitungan: ambil empat massa latih dari "Missing values and encoding", yaitu 3.650, 3.475, 3.700, dan 5.700 g, serta satu penguin uji seberat 4.000 g. Rata-ratanya 4.131,25. Selisihnya dari rata-rata adalah -481,25, -656,25, -431,25, dan +1.568,75, dan kuadratnya berjumlah 3.309.218,75. Bagi dengan 4 lalu akarkan: simpangan baku 909,56. Penguin uji itu mendapat z = (4.000 - 4.131,25) / 909,56 = -0,14.

Sekarang fit scaler pada kelima massa. Rata-ratanya menjadi 4.105, simpangan bakunya 815,23, dan z = (4.000 - 4.105) / 815,23 = -0,13. Perubahannya kecil, namun penguin itu ikut menentukan penggarisnya sendiri, sehingga ia bukan lagi baris yang belum pernah dilihat.

## Tiga pintu masuk leakage
*Apa itu data leakage, dan lewat mana ia masuk?*

Baris uji mewakili data di masa depan. Baris itu disisihkan supaya skornya memberi tahu seberapa baik model pada baris yang belum pernah dilihatnya. **Data leakage** adalah informasi dari baris uji yang masuk ke proses pelatihan. Ketika itu terjadi, pengujian bukan lagi ujian pada baris yang belum dilihat, dan skornya terlalu bagus. Ada tiga pintu masuk.

1. **Preprocessing yang di-fit sebelum data dibagi.** Median, rata-rata, simpangan baku, atau daftar kategori dihitung dari semua baris, termasuk baris uji.
2. **Pemilihan feature dengan semua label.** Kolom dipilih berdasarkan seberapa erat kolom itu berkorelasi dengan label, memakai setiap baris, sehingga jawaban uji ikut memberi suara.
3. **Duplikat.** Baris yang sama, atau salinan yang hampir sama, berada di training set sekaligus test set.

Dua yang pertama menyangkut urutan langkah. Fit sebelum dibagi, maka terjadi leak; bagi lebih dulu, maka tidak.

[[figure:pipelines-and-leakage/fit-order|Sepuluh baris, tujuh untuk latih dan tiga untuk uji. Urutan yang benar membagi lebih dulu, sehingga fit hanya melihat baris latih. Urutan yang bocor melakukan fit lebih dulu, sehingga fit juga melihat baris uji.]]

> Gagasan kunci: apa pun yang dipelajari dari data harus berada di dalam pipeline dan di-fit hanya pada baris latih. Itu termasuk feature mana yang dipertahankan.

## Mengapa keberuntungan tampak seperti kemampuan
*Bagaimana sebuah model dapat tampak mampu memprediksi lemparan koin?*

Leakage lab membuat tabel dengan 60 baris dan 500 kolom angka acak. Label-nya lemparan koin, sehingga tidak ada kolom yang tahu apa pun tentangnya, dan skor yang jujur sekitar 50%. Dua pipeline memakai satu pembagian yang sama, 30 baris latih dan 30 baris uji. Masing-masing mempertahankan 10 kolom yang paling erat berkorelasi dengan label, lalu men-fit model pada kolom itu.

Pipeline yang benar mengurutkan kolom dengan 30 baris latih. Pipeline yang bocor mengurutkannya dengan semua 60 baris, sehingga label uji ikut memberi suara.

> Contoh hitungan: versi kecil dari lab. Sebuah kolom acak berisi hasil lemparan koin di masing-masing dari 10 baris. Kolom itu sesuai dengan label pada 9 atau 10 baris dengan peluang 11 dari 1.024, dan berlawanan pada 9 atau 10 baris dengan peluang yang sama. Membalik tandanya sama bergunanya, sehingga 22 dari 1.024 kolom, sekitar 2%, tampak sebagus ini karena kebetulan: sekitar 11 dari 500. Dengan 60 baris di lab, keberuntungan lebih jarang per kolom, namun 500 kolom tetap menyisakan beberapa.

Pertahankan kolom yang tampak terbaik, dan label terlihat dapat diprediksi padahal tidak ada apa-apa di sana: pada tabel di lab, kolom terbaik berkorelasi 0,39 dengan label, dan sepuluh kolom yang dipertahankan rata-rata 0,32. (Korelasi, antara -1 dan 1, adalah seberapa erat sebuah kolom bergerak bersama label.)

[[figure:pipelines-and-leakage/luck-correlations|Besar korelasi masing-masing dari 500 kolom acak dengan label 60 baris. Sepuluh kolom terbaik, yang dipertahankan pipeline yang bocor, mencapai 0,39 hanya karena kebetulan.]]

## Tabel yang sama, dua skor
*Seberapa besar selisihnya, dan apakah itu hanya keberuntungan satu pembagian?*

Pada pembagian pertama di lab, pipeline yang benar mendapat 46,7% pada baris uji dan yang bocor 83,3%. Tabel di lab menunjukkan sebabnya. Kolom yang dipertahankan pipeline yang bocor berkorelasi 0,34 dengan label uji, sedangkan milik pipeline yang benar 0,16. Akurasi latih pipeline yang bocor justru lebih rendah, 90,0% berbanding 100%, tetapi skor ujinya jauh lebih tinggi. Itulah tanda peringatan adanya leak: ia mem-fit baris latih dengan lebih buruk, namun tetap lulus ujian.

Skor 100% pada baris latih dan 46,7% pada baris uji milik pipeline yang benar adalah overfitting, seperti di "Underfitting and overfitting": ia menghafal noise.

Satu pembagian adalah saksi yang lemah. Dengan 30 baris uji, setiap baris menggeser skor sebesar 3,3 poin. Karena itu lab mengulang eksperimen pada 50 pembagian yang berbeda dari tabel yang sama. Pipeline yang benar rata-rata 47,5% dan berkisar antara 33,3% dan 66,7%. Pipeline yang bocor rata-rata 78,7%, antara 63,3% dan 90,0%. Ia tidak menjadi lebih pintar. Ia hanya memilih kolom yang cocok dengan jawaban uji.

## Leak yang nyaris tidak terlihat
*Apakah men-fit rata-rata pada semua baris selalu menaikkan skor?*

Pindahkan lab ke penguin. Tugasnya "apakah ini Adelie?" dari empat pengukuran. Dua penguin tidak memiliki keempatnya, sehingga pipeline mengisi setiap kekosongan dengan median, men-standardisasi setiap kolom, dan men-fit regresi logistik. Pipeline yang bocor mempelajari median, rata-rata, dan simpangan baku dari semua 344 penguin. Pipeline yang benar memakai 240 penguin latih, dan 104 lainnya menguji.

Pada pembagian pertama, rata-rata massa tubuh adalah 4.200,87 g untuk pipeline yang bocor dan 4.171,98 g untuk yang benar. Angkanya berbeda, tetapi keduanya mendapat 98,1%. Pada 50 pembagian, rata-ratanya 97,2% dan 97,2%.

[[figure:pipelines-and-leakage/leak-scores|Rata-rata akurasi uji pada 50 pembagian. Pada label acak, leak menambah sekitar 31 poin (47,5% menjadi 78,7%). Pada penguin, leak tidak menambah apa pun (97,2% dan 97,2%).]]

Alasannya adalah kebebasan. Rata-rata dari 344 baris nyaris tidak berbeda dari rata-rata 240 baris, dan satu angka per kolom tidak dapat melengkung ke arah 104 baris uji. Memilih 10 kolom dari 500 dengan label dapat melakukannya.

> Awas: selisih yang kecil bukan izin. Leak-nya nyata pada kedua kasus; hanya ukurannya yang berubah. Dengan baris yang lebih sedikit atau langkah yang lebih banyak, leak dapat membesar, dan kamu tidak dapat mengetahuinya sebelumnya. Bagi lebih dulu.

::: deeper Mengapa kolom acak terbaik mencapai 0,39
Untuk kolom yang murni noise, korelasi dengan label dari n baris tersebar di sekitar 0 dengan simpangan baku kira-kira 1 / akar dari (n - 1). Dengan 60 baris, itu sekitar 0,13. Kolom terbaik dari 500 kolom noise berada sekitar 3 simpangan baku ke luar, mendekati 0,39, sesuai dengan lab. Dengan 200 baris, sebarannya menyusut menjadi sekitar 0,07 dan kolom terbaik hanya mencapai sekitar 0,2. Baris yang lebih banyak melemahkan keberuntungan, tetapi 500 kesempatan selalu menyisakan beberapa kolom.
:::

## Duplikat dan sebuah checklist
*Bagaimana baris yang sama dapat berada di kedua set?*

Sebuah tabel dapat memuat baris yang sama dua kali: seorang pelanggan yang dimasukkan dua kali, atau beberapa foto dari satu objek. Salinan yang hampir sama sama buruknya. Pembagian acak dengan 30% baris uji mengirim kedua salinan ke set yang berbeda dengan peluang 2 × 0,3 × 0,7 = 0,42, sehingga sebuah baris uji menemukan kembarannya di training set. Model yang menghafal baris latih-nya lalu "memprediksi" baris itu dengan sempurna. k-NN dengan k = 1 adalah kasus ekstremnya: kembarannya berada pada jarak 0.

Perbaikannya: hapus duplikat yang persis sama sebelum membagi, dan simpan salinan yang hampir sama bersama di satu sisi. File penguin tidak memiliki dua baris yang identik, sehingga lab tidak menunjukkan pintu ini.

Sebelum memercayai sebuah skor, ajukan tiga pertanyaan pada setiap langkah, termasuk modelnya. Apa yang ia pelajari? Dari baris mana? Apakah ia membaca label? Jika jawaban untuk pertanyaan kedua adalah "semuanya", skor itu bukan ujian.

::: remember
- Pipeline merangkai isi, encode, scale, dan model dalam urutan tetap dan men-fit setiap langkah hanya pada baris latih. Baris baru melewatinya dengan angka yang dipelajari tanpa berubah.
- Leakage adalah informasi dari baris uji yang masuk ke proses pelatihan: preprocessing yang di-fit sebelum data dibagi, pemilihan feature dengan semua label, atau duplikat. Memilih dengan label dapat mengubah lemparan koin menjadi sekitar 79%.
- Besar sebuah leak bergantung pada seberapa jauh sebuah langkah dapat melengkung ke arah baris uji. Scaling menyisakan selisih kecil pada penguin, pemilihan feature menyisakan selisih besar. Bagi lebih dulu dalam kedua kasus.
:::

::: deeper Kolom yang memuat jawabannya
Pintu keempat adalah kolom yang hanya ada karena jawabannya sudah diketahui, misalnya kolom "refund diberikan" ketika kamu memprediksi siapa yang akan berhenti berlangganan. Kolom itu membocorkan label itu sendiri. Tanyakan pada setiap kolom: apakah aku sudah mengetahuinya pada saat aku harus memprediksi?
:::

@@lab

## Lab: Leakage lab
Kartu lab berjudul **Fit sebelum atau sesudah data dibagi?** Dua pipeline mendapat data dan pembagian yang sama. Pipeline yang bocor belajar dari semua baris sebelum pembagian, yang benar hanya dari baris latih, dan keduanya dinilai pada baris uji. Dengan data buatan, lab menjalankan leak pemilihan feature pada label acak. Dengan penguin yang asli, lab menjalankan leak median-dan-standardisasi.

### Kontrol
- **Data** berpindah antara **Data buatan** dan **Penguin (data nyata)**. Dengan data buatan, lab membuat tabel acak dengan label lemparan koin dan memakai separuh baris untuk pelatihan. Dengan penguin, lab bertanya "apakah ini Adelie?" dan memakai 70% penguin untuk training.
- **Model** memilih **Regresi logistik** atau **k-NN (k = 5)**.
- **Jumlah baris** (40 sampai 200, mulai dari 60), **Jumlah feature noise** (20 sampai 1.000, mulai dari 500), dan **Feature yang dipertahankan** (1 sampai yang lebih kecil antara 50 dan jumlah noise, mulai dari 10) membentuk tabel acak. Ketiganya menghilang pada penguin.
- **Split baru** mengulang perbandingan pada pembagian lain dari data yang sama. **Tabel acak baru** menggambar tabel acak yang berbeda (nonaktif pada penguin). **Ulangi 50 split** menjalankan 50 pembagian berbeda dari data yang sama dan mengisi diagram strip.
- **Kuis Cepat** adalah tombol di bawah kartu pengaturan (tombol bulat di kanan bawah pada ponsel). Isinya dua kuis: "Label-nya acak. Berapa test accuracy yang seharusnya didapat model yang jujur? Dan pipeline yang bocor?" dan "Pada penguin asli, median dan standardisasi dipelajari dari semua baris (leakage) atau hanya dari baris latih (benar). Seberapa berbeda akurasi ujinya?" Pilih jawaban. Kotak itu menjawab sendiri begitu ada hasil 50 split yang sudah selesai untuk data yang sesuai, atau kamu dapat menekan tombol **Periksa jawaban**-nya. Menekan **Ulangi 50 split** atau **Reset** mengosongkan kotak itu. Urutan pilihan berubah setiap kali kamu membuka halaman.
- **Layar penuh** dan **Reset** ada di setiap lab. Reset mengembalikan ke data buatan, **Regresi logistik**, 60 baris, 500 feature noise, 10 dipertahankan, pembagian pertama, dan menjalankan 50 split.

### Membaca layar
- Diagram batang menampilkan **Akurasi uji** (0 sampai 100%) dari satu pembagian: **Fit preprocessing setelah data dibagi (benar)** dan **Fit preprocessing sebelum data dibagi (leakage)**. Dengan data buatan, garis putus-putus menandai **Tingkat kebetulan (50%)**.
- Baris status memberi kedua skor, misalnya "Satu split (60 baris, 30 di antaranya baris uji): pipeline yang benar mendapat 46,7% pada baris uji, pipeline yang bocor 83,3%." Setelah 50 split, ia menambahkan "Pada 50 split: yang benar rata-rata 47,5%, yang bocor 78,7%." Baris di bawahnya diawali "Yang bocor:" dan menjelaskan apa yang dilihat pipeline yang bocor. Di sisi kanan, hitungan seperti "60 baris × 500 feature · seed split 1".
- Kartu **Akurasi uji pada 50 split** memiliki satu jalur untuk **Pipeline yang benar** dan satu untuk **Pipeline yang bocor**. Setiap titik adalah satu pembagian, garis tebal adalah rata-rata dan ditulis "rata-rata 47,5%". Kedua jalur memakai satu sumbu. Pada penguin, sumbunya mulai lebih tinggi dan hal itu dinyatakan. Setelah sebuah pengaturan berubah, kartu meminta kamu menekan **Ulangi 50 split**.
- Dengan data buatan, tabel **Apa yang dipertahankan tiap pipeline, dan skornya** memiliki kolom **Ukuran**, **Pipeline yang benar**, dan **Pipeline yang bocor**, dengan baris **Akurasi uji**, **Akurasi latih**, **Baris yang dipakai untuk memilih feature**, **Korelasi rata-rata feature terpilih dengan label uji**, dan **Feature terpilih (nomor kolom)**. Sebuah catatan menghitung feature yang dipilih kedua pipeline, misalnya "2 dari 10".
- Dengan penguin, tabel **Apa yang dipelajari tiap pipeline dari penguin** memiliki kolom **Statistik**, **Pipeline yang benar**, **Pipeline yang bocor**, dan **Selisih (leakage - benar)**, dengan rata-rata dan median untuk masing-masing dari empat pengukuran, serta **Akurasi uji**.

### Eksperimen
Lakukan setiap eksperimen dari awal yang bersih: tekan **Reset**, ubah hanya yang disebutkan eksperimen, lalu tekan **Ulangi 50 split** satu kali. Angka-angka di bawah berasal dari jalur itu. Penekanan berikutnya menjalankan pembagian lain dan menggeser angkanya satu atau dua poin.

1. Prediksikan: label-nya lemparan koin. Di kotak Kuis Cepat yang pertama, pilih akurasi uji pipeline yang jujur dan yang bocor (kotak itu menjawab begitu 50 pembagian pembuka selesai). Lalu baca diagram batang pada pembagian pembuka: pipeline yang benar mendapat 46,7% dan yang bocor 83,3%. Di tabel, **Akurasi latih** adalah 100,0% berbanding 90,0%, **Baris yang dipakai untuk memilih feature** adalah 30 berbanding 60, dan **Korelasi rata-rata feature terpilih dengan label uji** adalah 0,16 berbanding 0,34. Tekan **Split baru** tiga kali: skornya 26,7% dan 86,7%, lalu 53,3% dan 70,0%, lalu 50,0% dan 80,0%. Sekarang tekan **Ulangi 50 split**: 49,6% dan 76,3%. Jelaskan mengapa pipeline yang bocor menang setiap kali pada label acak.
2. Prediksikan: apakah **Jumlah feature noise** yang lebih sedikit atau lebih banyak membuat leak lebih besar? Atur ke 20 dan tekan **Ulangi 50 split**: 50,7% untuk pipeline yang benar dan 59,7% untuk yang bocor, selisih 9,0 poin. Tekan **Reset**, atur ke 1.000 dan ulangi: 46,5% dan 83,6%, selisih 37,1 poin. Bawaan 500 memberi 26,7. Jelaskan dengan contoh lemparan koin: semakin banyak kolom, semakin banyak yang kebetulan cocok.
3. Prediksikan: apakah mempertahankan lebih banyak kolom membantu pipeline yang bocor? Tekan **Reset**, atur **Feature yang dipertahankan** ke 1 dan tekan **Ulangi 50 split**: 50,7% dan 69,3%. Satu kolom saja yang dipilih sambil melihat label uji sudah memberi 18,6 poin. Tekan **Reset**, atur **Feature yang dipertahankan** ke 50 dan ulangi: 48,9% dan 89,6%. Setiap kolom yang dipertahankan adalah satu kesesuaian kebetulan lagi dengan jawaban uji.
4. Prediksikan: apa yang dilakukan baris yang lebih banyak pada leak? Tekan **Reset**, atur **Jumlah baris** ke 40 dan ulangi: 50,0% dan 79,7%. Tekan **Reset**, atur ke 200 dan ulangi: 49,7% dan 67,2%. Selisihnya menyusut dari 29,7 menjadi 17,5 poin tetapi tidak hilang. Mengapa keberuntungan melemah dengan baris yang lebih banyak, namun tetap bertahan di antara 500 kolom?
5. Prediksikan: apakah leak ini keanehan regresi logistik? Tekan **Reset**, atur **Model** ke **k-NN (k = 5)** dan ulangi: 48,5% dan 73,9%. Model yang berbeda, selisih yang mirip, sekitar 25 poin. Di mana leak itu berada, di model atau di langkah sebelumnya?
6. Prediksikan: pada penguin yang asli, apakah men-fit median dan standardisasi pada semua baris akan menaikkan skor? Tekan **Reset**, pilih di kotak Kuis Cepat yang kedua, lalu atur **Data** ke **Penguin (data nyata)**; kotak itu menjawab ketika 50 pembagian pada penguin selesai. Baca 50 pembagian pembuka itu: 97,2% dan 97,2%. Pada pembagian pertama keduanya mendapat 98,1%, namun tabel menunjukkan **Rata-rata massa tubuh (g)** 4.171,98 berbanding 4.200,87 (+28,89) dan **Median massa tubuh (g) (mengisi NA)** 4.025,00 berbanding 4.050,00 (+25,00). Tekan **Ulangi 50 split**: 97,2% dan 97,1%, dan pipeline yang bocor unggul pada 0 pembagian serta tertinggal pada 5. Sekarang periksa pada pembagian baru: tekan **Split baru** satu kali. Rata-ratanya menjadi 4.134,48 dan 4.200,87, dan kedua pipeline tetap mendapat 98,1%. Tekan **Split baru** lagi: 4.213,85 dan 4.200,87, keduanya 97,1%. Apa beda leak ini dengan leak di eksperimen 1, dan mengapa "nyaris tidak terlihat" tidak sama dengan "aman"?
