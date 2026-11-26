---
slug: attention-lab
title: Lab attention
---
::: intro
- Telusuri satu token melalui satu baris bobot attention, lalu sebutkan token mana yang dicampurkan dan mengapa.
- Perkirakan bagaimana sebuah head, kode posisi, causal mask, dan tokenizer mengubah bobot itu, lalu periksa satu per satu di lab.
- Bandingkan naive Bayes bag-of-words dengan vektor pretrained yang dibekukan dan yang di-fine-tune pada jumlah pesan berlabel yang kamu pilih, melalui beberapa kali pengambilan sampel.

Sebelum mulai: baca "Tokenization dan attention" dan "Pretrained model dan fine-tuning" (dua pelajaran lain di course ini), serta "Lab text classifier" di course Naive Bayes dan klasifikasi teks. Pesan pelanggan buatan dan baseline bag-of-words dari lab itu kembali dipakai di Bagian 2.
:::

## Dua bagian dalam satu lab
*Apa saja yang dapat kamu lakukan di Lab attention?*

Pelajaran pertama course ini menghitung attention untuk tiga token dengan pensil. Lab attention menjalankan hitungan yang sama untuk satu kalimat utuh dan menampilkan hasilnya sebagai gambar. Lab ini punya dua bagian, dan masing-masing punya kontrolnya sendiri.

**Bagian 1** menelusuri attention di dalam satu lapisan kecil. Kamu memilih kalimat, tokenizer, dan salah satu dari empat head. Heatmap menampilkan semua baris bobot sekaligus: baris i adalah token yang melihat, dan setiap kolom adalah token yang dilihatnya. Klik sebuah baris untuk menelusuri token itu.

**Bagian 2** membandingkan tiga model teks pada pesan pelanggan buatan: bag of words dengan naive Bayes, vektor pretrained yang dibekukan dengan regresi logistik, dan versi fine-tune dari vektor-vektor itu. Kamu menentukan berapa pesan yang berlabel, lalu membaca skornya pada 180 pesan test.

Lab ini menulis kalimat dan pesan pelanggannya dalam bahasa halaman, sehingga angkanya berbeda antara versi bahasa Inggris dan versi bahasa Indonesia. Tabel di akhir panduan lab mencantumkan keduanya, dan pelajaran ini mengutip angka dari lab berbahasa Indonesia.

> Awas: semua yang ada di lab ini dibuat atau ditulis khusus untuk course. Vektor kata di Bagian 1 dan keempat head diatur dengan tangan, sedangkan vektor pretrained di Bagian 2 dipelajari di dalam halaman dari pesan buatan yang labelnya dibuang. Model sungguhan mempelajari head dan vektornya dari teks nyata yang jauh lebih banyak. Lab ini tidak memakai dataset nyata dan tidak punya sakelar Data nyata.

## Menghitung skor dua token
*Bagaimana attention menentukan seberapa banyak satu token melihat token lain?*

Ambil satu baris heatmap. Token yang melihat, yaitu **query**, diberi skor terhadap setiap token dalam kalimat, yang masing-masing menjadi **key**. Di dalam lab, setiap kata punya vektor kecil yang diatur dengan tangan. Untuk Head 1 hanya tiga angka yang berperan: seberapa mirip hewan, benda, dan tindakan kata itu. "kucing" adalah (2,0; 0,0; 0,1), "itu" adalah (0,3; 0,3; 0,3), dan "duduk" adalah (0,1; 0,2; 1,8). Seperti di pelajaran pertama, skor dua token adalah dot product angka-angkanya dibagi akar kuadrat dari 3, yaitu 1,73. Lab juga menambahkan kode posisi ke setiap vektor, yang dilewatkan dalam contoh ini.

> Contoh hitungan: **kucing melihat kucing.** 2,0 × 2,0 + 0,0 × 0,0 + 0,1 × 0,1 = 4,01, dan 4,01 / 1,73 = 2,32. **kucing melihat itu.** 2,0 × 0,3 + 0,0 × 0,3 + 0,1 × 0,3 = 0,63, dan 0,63 / 1,73 = 0,36. **kucing melihat duduk.** 2,0 × 0,1 + 0,0 × 0,2 + 0,1 × 1,8 = 0,38, dan 0,38 / 1,73 = 0,22.

Kata-kata di balik angka ini terbagi menjadi dua jenis. **Kata penuh** (*content word*) seperti kucing, duduk, dan tikar membawa makna, sedangkan **kata tugas** (*function word*) seperti itu dan di terutama merekatkan kalimat. Kata penuh mendapat skor tinggi terhadap dirinya sendiri dan kata yang mirip. Kata tugas punya vektor yang samar, di tengah-tengah semuanya, sehingga skornya hampir sama terhadap semua kata.

## Dari skor ke satu baris
*Bagaimana satu baris skor menjadi campuran token?*

Softmax mengubah ketiga skor menjadi bobot yang berjumlah 100%. Eksponensialnya 10,13; 1,44; dan 1,25, yang jumlahnya 12,81 (dihitung dari skor yang belum dibulatkan, sehingga kalkulator yang berangkat dari skor tercetak dapat berbeda di angka terakhir). Bobotnya 0,79 pada "kucing", 0,11 pada "itu", dan 0,10 pada "duduk". Vektor baru untuk "kucing" lalu terdiri dari 79% vektor value "kucing", 11% "itu", dan 10% "duduk".

> Gagasan kunci: satu baris heatmap adalah satu softmax. Output untuk token itu adalah campuran vektor value, dan bobotnya adalah porsi masing-masing.

Lab melakukan ini untuk setiap token dalam kalimat dan menggambar satu baris heatmap untuk tiap token. Dengan Head 1 pada "kucing duduk di tikar dan kucing tidur", baris "kucing" yang pertama terbaca 37%, 5%, 5%, 4%, 5%, 40%, dan 5%: dua sel terbesar adalah kedua "kucing", karena kata yang sama punya vektor yang hampir sama. Baris "di" hampir rata, antara 12% dan 17%, seperti yang diperkirakan untuk kata tugas.

## Empat head, empat pola
*Mengapa sebuah model menjalankan beberapa head sekaligus?*

Head adalah satu set matriks query, key, dan value, dan masing-masing menemukan satu jenis hubungan. Lab ini punya empat head, semuanya diatur dengan tangan agar masing-masing memperlihatkan satu pola yang khas.

- **Head 1: makna mirip.** Sebuah token paling banyak melihat dirinya sendiri dan token yang mirip dengannya: "tikar" 53% pada dirinya, dan "duduk" 35% pada dirinya serta 31% pada "tidur", sesama kata kerja.
- **Head 2: kata berdekatan.** Head ini hanya memakai kode posisi. "tikar" memberi 23% pada dirinya sendiri, dan 20% masing-masing pada "di" di sebelah kirinya dan "dan" di sebelah kanannya.
- **Head 3: mencari kata kerja.** Nama dan benda mencari kata kerja. "kucing" yang pertama memberi 35% pada "duduk" dan 32% pada "tidur", dan "tikar" memberi 35% dan 31%.
- **Head 4: belum dilatih (acak).** Bobotnya acak, seperti sebelum training apa pun. Barisnya tidak berpola, dan tidak ada baris yang memberi "duduk" lebih dari sekitar 12%.

[[figure:attention-lab/four-heads|Keempat head pada "kucing duduk di tikar dan kucing tidur". Warna yang lebih gelap berarti bobot yang lebih besar, dan setiap baris berjumlah 100%.]]

Head pada model yang sudah dilatih tidak ditentukan oleh manusia. Training membentuk head acak seperti Head 4 menjadi pola seperti ketiga head lainnya, dan "Tokenization dan attention" sudah menyebutkan bahwa satu block menggabungkan banyak head. Hubungan apa yang ditemukan sebuah head dipelajari, bukan dipilih.

## Posisi dan causal mask
*Apa yang berubah karena kode posisi dan causal mask?*

Attention saja tidak melihat urutan. Pindah ke **Head 2: kata berdekatan** lalu matikan **Tambahkan kode posisi**. Setiap sel terbaca 14%, yaitu 1/7, karena head ini hanya punya kode posisi sebagai pegangan dan kini tidak ada yang dapat dibandingkan. Model tanpa posisi memperlakukan "anjing mengejar kucing" sama seperti "kucing mengejar anjing". Head 1 hampir tidak berubah: "kucing" yang pertama hanya bergeser dari 37% ke 39% pada dirinya sendiri, karena ia membandingkan makna, bukan tempat.

**Sembunyikan masa depan (causal mask)** penting bagi model yang memprediksi token berikutnya. Token i kemudian hanya boleh melihat token sampai i. Lab mengarsir sel di atas diagonal dan menetapkannya tepat 0, sehingga softmax berjalan pada sisanya. Baris 1 hanya punya dirinya sendiri: 100%.

> Contoh hitungan: ambil baris "kucing" dari contoh tadi, dengan 0,11 pada "itu", 0,79 pada "kucing", dan 0,10 pada "duduk". Jika "duduk" berada di belakang dalam kalimat, mask menyembunyikannya. Tanpa "duduk", 0,79 / (0,79 + 0,11) = 0,88, dan "itu" mendapat 0,11 / 0,90 = 0,12. Di lab, baris "duduk" dengan Head 1 menampilkan 16% pada "kucing" dan 84% pada dirinya sendiri, dan baris terakhir, "tidur", tidak berubah: 34% pada "duduk" dan 31% pada dirinya sendiri, karena semua token lain sudah berada di masa lalunya.

[[figure:attention-lab/mask-and-positions|Head 2 dengan dan tanpa kode posisi, dan Head 1 dengan causal mask. Sel berarsir adalah yang disembunyikan.]]

## Token mengubah urutan
*Bagaimana tokenizer mengubah apa yang dilihat attention?*

Pengaturan **Tokenizer** memakai kembali pilihan dari pelajaran pertama. **Kata** menghasilkan satu token per kata, dan **Karakter** satu token per karakter, dengan ␣ menandai sebuah spasi. Pada **Byte-pair merge (BPE)**, slider **Merge BPE** menentukan berapa merge yang diterapkan: pada 0, setiap kata terdiri dari huruf-hurufnya ditambah tanda akhir kata yang ditulis ·, dan seiring merge bertambah, huruf yang sering muncul bersama bergabung menjadi potongan sampai, di ujung slider, setiap kata utuh kembali. Merge dipelajari dari lima kalimat bawaan, bukan dari keempat kata di pelajaran itu. Lab hanya menelusuri 24 token dan memotong teks yang lebih panjang; panduan lab menyebut kapan hal itu terjadi.

Hanya kata utuh yang punya vektor sungguhan di lab ini. Karakter atau potongan kata mendapat vektor karangan, sehingga attention-nya acak, dan lab menyatakannya. Kata yang tidak ada di vocabulary digambar dengan garis putus-putus dan memakai id yang sama dengan token tak dikenal. Ketik "kucing duduk di sofa": "sofa" bergaris putus-putus, dan barisnya pada Head 1 hampir rata, sekitar 28% pada "kucing" dan 27% pada "duduk".

> Awas: pola yang bersih membutuhkan token yang dikenal model. Karakter dan potongan kata baru mendapat maknanya setelah training, dari token di sekitarnya.

## Tiga model pada pesan yang sama
*Apa yang dibandingkan Bagian 2, dan bagaimana caranya?*

Bagian 2 memakai pesan pelanggan buatan seperti pada Lab text classifier: tagihan, pengiriman, dan masalah teknis. Setiap pengambilan membuat 360 pesan untuk diberi label, dan 180 (60 per kelas) menjadi pesan test, sama pada setiap ukuran dan setiap pengambilan. **Pesan berlabel** adalah totalnya, diambil merata di antara kelas: 3 berarti satu per kelas, dan 8 berarti tiga, tiga, dan dua.

Ketiga model melihat pesan berlabel yang sama. **Bag of words + Naive Bayes** adalah baseline dari Level 2. **Vektor pretrained dibekukan + regresi logistik** merata-ratakan vektor kata 8 angka yang dipelajari dari pesan tanpa label, dan menjaganya tetap. **Vektor pretrained yang di-fine-tune** membiarkan label menggeser salinan vektor yang dipakainya.

Angka-angka ini bukan angka pelajaran sebelumnya, yang menghitung label per kelas dan memakai head nearest-class-mean, dinilai pada sekitar 202 pesan test. Pada pengambilan pertama di sini, dengan 8 pesan berlabel, accuracy-nya 57,8% untuk bag of words, 73,9% untuk yang dibekukan, dan 73,3% untuk yang di-fine-tune. Dengan 360 pesan hasilnya 93,3%, 91,1%, dan 92,8%.

[[figure:attention-lab/size-curve|Accuracy test menurut jumlah pesan berlabel pada pengambilan pertama. Garis titik-titik adalah tebakan acak di 33%.]]

## Satu pengambilan bukan jawaban
*Seberapa besar hasilnya dapat berubah dari satu pengambilan ke pengambilan berikutnya?*

Setiap **Sampel baru** membuat satu set baru berisi 360 pesan pelanggan dan memberi label pada subset yang seimbang darinya; 180 pesan test tidak berubah. Pada 8 pesan, empat pengambilan baru yang pertama memberi 71,7% lawan 70,6%, 57,2% lawan 84,4%, 68,9% lawan 63,9%, dan 73,9% lawan 68,3%, dengan bag of words di depan. Selisihnya berayun dari pretrained unggul 27 poin sampai bag of words unggul 6.

Pada dua belas pengambilan pertama, dengan pengambilan yang tampil saat lab dibuka dihitung sebagai yang pertama, vektor pretrained unggul lebih dari 3 poin di 8, berselisih dalam 3 poin di 2, dan tertinggal di 2. Rata-rata pada 8 pesan adalah 63,5% untuk bag of words dan 72,5% untuk yang dibekukan. Pada 360 pesan bag of words di depan vektor beku pada 8 dari 12, sama pada 2, dan di belakang pada 2.

> Gagasan kunci: dengan sedikit label, kode pretrained unggul secara rata-rata, tetapi satu pengambilan bisa saja menunjukkan sebaliknya. Vektor beku tidak dapat berubah, karena itu dengan label yang banyak baseline mempelajari setiap kata sendiri dan menyalipnya.

Satu pesan bernilai 1/180 = 0,56 poin, sehingga margin 3 poin di lab untuk "hampir sama" setara sekitar 5 pesan. Test set pun hanyalah satu pengambilan. Inilah kebiasaan dari pelajaran sebelumnya: bandingkan pada baris yang sama, melalui banyak pengambilan, dan lihat sebarannya sebelum menyatakan sebuah model menang.

::: remember
- Satu baris heatmap adalah satu softmax: output sebuah token adalah campuran token lain, dan bobotnya berjumlah 100%. Keempat head memperlihatkan empat pola, dan model sungguhan mempelajari polanya sendiri.
- Posisi dan causal mask mengubah baris: Head 2 tidak punya apa-apa tanpa posisi, dan baris yang di-mask dinormalisasi ulang hanya pada masa lalu. Tokenizer mengubah apa yang disebut token.
- Bagian 2 membandingkan tiga model pada 180 pesan test yang sama. Vektor pretrained unggul pada 8 pesan di 8 dari 12 pengambilan dan baseline unggul pada 360 di 8 dari 12, karena itu nilailah sebuah model melalui beberapa pengambilan.
:::

@@lab

## Lab: attention
Kamu mulai dengan kalimat "kucing duduk di tikar dan kucing tidur", Head 1, dan 8 pesan berlabel. Bagian 1 menggambar bobot attention kalimat itu. Bagian 2 menghitung skor tiga model teks pada pesan buatan. Semuanya dibuat khusus, dan tidak ada data nyata.

### Kontrol
- **Attention: telusuri, lalu bandingkan model** adalah judul lab. Di bawah **Bagian 1: telusuri attention**:
  - **Kalimat contoh** memilih salah satu dari lima kalimat bawaan atau **Teksmu sendiri**. Mengetik di kotak di bawahnya berpindah ke teksmu sendiri.
  - **Teks yang ditelusuri (maksimal 80 karakter)** memuat teksnya. Hanya 24 token pertama yang ditelusuri.
  - **Tokenizer** adalah **Kata**, **Karakter**, atau **Byte-pair merge (BPE)**.
  - **Merge BPE** (0 sampai 66, awalnya 12) hanya muncul pada BPE.
  - **Tambahkan kode posisi** menambahkan kode posisi ke setiap token. Awalnya menyala.
  - **Head attention** adalah **Head 1: makna mirip**, **Head 2: kata berdekatan**, **Head 3: mencari kata kerja**, atau **Head 4: belum dilatih (acak)**.
  - **Sembunyikan masa depan (causal mask)** awalnya mati.
- Di bawah **Bagian 2: bandingkan model**:
  - **Pesan berlabel** memilih 3, 5, 8, 12, 20, 30, 45, 75, 120, 200, atau 360 dan awalnya 8 pesan.
  - **Tampilkan kesalahan dari** memilih model mana dari ketiganya yang mengisi daftar kesalahan.
  - **Sampel baru** membuat satu set lain berisi 360 pesan, memberi label pada subset yang seimbang darinya, dan mempertahankan 180 pesan test yang sama. Tombol ini menghapus jawaban Kuis Cepat yang sudah kamu lihat, tetapi pilihanmu tetap.
- **Kuis Cepat** adalah tombol di bawah kartu pengaturan (tombol bulat di kanan bawah pada ponsel): "Dengan hanya 8 pesan berlabel, model mana yang paling baik: bag of words atau vektor pretrained?" dengan pilihan **Bag of words (Naive Bayes)**, **Vektor pretrained**, dan **Hampir sama (selisih di bawah 3 poin)**. Atur **Pesan berlabel** ke 8, tunggu chart terisi, pilih satu, lalu tekan **Periksa jawaban**.
- **Layar penuh** memperbesar lab. **Reset** mengembalikan ke kalimat pertama, Kata, 12 merge, posisi menyala, Head 1, tanpa mask, 8 pesan, pengambilan pertama, dan tanpa jawaban Kuis Cepat.

### Membaca layar
- Heatmap menampilkan **Token yang melihat (query)** di sisi kiri dan **Token yang dilihat (key)** di bagian atas. Setiap sel adalah persentase. Baris dengan garis tebal adalah token yang ditelusuri, dan klik pada baris mana pun menelusurinya. Sel berarsir adalah **Disembunyikan causal mask**. Catatan di bawahnya berbunyi "Setiap baris berjumlah 100%." Legenda menjelaskan **Bobot lebih besar (lebih gelap)** dan **Token yang ditelusuri (baris berbingkai)**.
- Status line berbunyi seperti "Token 2, “duduk”, dengan Head 1: makna mirip: paling banyak mengambil dari “duduk” #2 (35%), “tidur” #7 (31%), “di” #3 (7%).", dengan hitungan seperti "7 token · 4 head" di kanan. Baris detail berbunyi "Bagian 2, 8 pesan: pilih model yang menang di Kuis Cepat, lalu tekan Periksa jawaban." sampai kamu menjawab, lalu menampilkan ketiga accuracy pada ukuranmu.
- **Token** menampilkan satu chip per token beserta id-nya, misalnya kucing #2. Klik sebuah chip untuk menelusurinya. Chip bergaris putus-putus adalah kata yang tidak ada di vocabulary. Catatannya berbunyi "Tanda ␣ berarti spasi." untuk **Karakter** dan "Tanda · menandai akhir sebuah kata." untuk BPE.
- **Ke mana satu token melihat** menggambar busur dari token yang ditelusuri ke setiap token yang dicampurkannya. Busur yang lebih tebal berarti bobot yang lebih besar, dan persentasenya dicetak.
- **Accuracy test dan macro F1 menurut jumlah pesan berlabel** punya dua panel, **Accuracy test** dan **Macro F1 test**, dengan satu garis untuk tiap model (**Bag of words** lingkaran, **Vektor dibekukan** persegi, dan **Di-fine-tune** segitiga). Garis putus-putus adalah ukuranmu dan garis titik-titik adalah tebakan acak, 33%. Titik muncul seiring ukuran dihitung skornya; tunggu sampai chart penuh.
- **Hasil pada ukuran ini** berisi tabel dengan kolom **Model**, **Accuracy test**, dan **Macro F1 test** (accuracy terbaik dicetak tebal), lalu "Pesan test yang salah diklasifikasi" untuk model yang kamu pilih di **Tampilkan kesalahan dari**, dengan hitungan seperti "76 dari 180 pesan test salah (42%). Menampilkan 3." Buka **Catatan data** di bawah legenda untuk melihat apa yang dibuat.

### Eksperimen
Tekan **Reset** sebelum tiap eksperimen, agar angkamu sama.

1. **Satu baris.** Perkirakan: dengan Head 1, token mana yang paling banyak dilihat "kucing" yang pertama, dan seberapa besar? Klik chip "kucing" yang pertama dan baca status line: 40% pada "kucing" yang kedua, 37% pada dirinya sendiri, dan 5% pada "dan". Sekarang klik "tikar": ia memberi 53% pada dirinya sendiri. Klik "di": barisnya antara 12% dan 17% di mana-mana. Bandingkan setiap baris dengan contoh hitungan di pelajaran ini: mengapa sebuah kata penuh paling banyak melihat dirinya sendiri dan kata yang sama, dan sebuah kata tugas melihat semuanya sedikit?
2. **Empat head.** Perkirakan: pada Head 3, token mana yang sama-sama dilihat "kucing" dan "tikar"? Pilih **Head 3: mencari kata kerja** dan klik "kucing" yang pertama: 35% pada "duduk" dan 32% pada "tidur". "tikar" memberi 35% dan 31% pada keduanya, dan "duduk" sendiri hanya 17%. Lalu **Head 2: kata berdekatan**: "tikar" memberi 23% pada dirinya sendiri, dan 20% masing-masing pada "di" dan "dan". Lalu **Head 4: belum dilatih (acak)**: tidak ada pola, dan tidak ada baris yang memberi "duduk" lebih dari sekitar 12%. Dari keempat head, mana yang akan dibutuhkan model yang sudah dilatih?
3. **Posisi dan mask.** Perkirakan: apa yang ditampilkan Head 2 ketika **Tambahkan kode posisi** dimatikan? Pilih Head 2 dan matikan **Tambahkan kode posisi**: setiap sel 14%. Nyalakan lagi: baris pertama terbaca 35%, 30%, 20%, 10%, 4%, 1%, dan 0%. Pindah ke Head 1 dan bandingkan saat menyala dan mati: baris "kucing" yang pertama bergeser dari 37% ke 39% pada dirinya sendiri. Sekarang nyalakan **Sembunyikan masa depan (causal mask)**: baris 1 adalah 100%, baris "duduk" adalah 16% dan 84%, dan baris terakhir tidak berubah, dengan 34% pada "duduk" dan 31% pada "tidur" sendiri. Mengapa model prediksi kata berikutnya tidak boleh melihat masa depan?
4. **Token.** Perkirakan: berapa token yang dimiliki kalimat itu sebagai **Karakter**, dan dengan **Byte-pair merge (BPE)**? Pilih **Karakter**: 24 token, karena lab hanya menelusuri 24 token pertama dan kalimat ini lebih panjang (sudut status menampilkan "24 token · 4 head", dan catatan di bawah chip menyebut pemotongan itu). Pilih BPE: 24 token pada 0 merge, 19 pada 12, dan 7 pada 66, tempat slider berakhir. Potongan mana yang membentuk "tikar" pada 12? Lalu kembali ke **Kata**, pilih **Teksmu sendiri** dan ketik "kucing duduk di sofa": chip bergaris putus-putus adalah "sofa". Mengapa karakter dan kata yang tidak dikenal menghasilkan baris tanpa makna?
5. **Tiga model pada 8 pesan.** Perkirakan: di **Kuis Cepat**, model mana yang paling baik dengan 8 pesan berlabel? Pilih jawaban, tunggu chart terisi, tekan **Periksa jawaban**, dan baca tabelnya: 57,8%, 73,9%, dan 73,3%, dengan macro F1 0,58, 0,74, dan 0,73. Di **Tampilkan kesalahan dari**, bergantian antara **Bag of words + Naive Bayes** (76 dari 180 salah, 42%) dan **Vektor pretrained dibekukan + regresi logistik** (47 dari 180, 26%). Keduanya salah pada pesan pengiriman yang sama, yang muncul kedua dalam kedua daftar: "nomor resi untuk pesanan saya tidak dapat dilacak hari ini", yang ditebak sebagai tagihan. Lalu geser **Pesan berlabel** ke 3 (44,4%, 52,2%, dan 52,2%) dan ke 360 (93,3%, 91,1%, dan 92,8%). Di mana keunggulan berpindah tangan, dan mengapa garis vektor dibekukan berhenti naik?
6. **Kalimat baru dan pengambilan baru.** Perkirakan: apakah hasilnya berlaku pada kalimat lain dan pengambilan lain? Di Bagian 1, pilih "anjing itu mengejar kucing": dengan Head 1 "anjing" memberi 46% pada "kucing" dan 40% pada dirinya sendiri, dan dengan Head 3 "anjing" memberi 67% dan "kucing" 68% pada "mengejar". Di Bagian 2, atur **Pesan berlabel** ke 8 dan tekan **Sampel baru** empat kali, menekan **Periksa jawaban** setiap kali: bag of words lawan yang dibekukan adalah 71,7% lawan 70,6%, 57,2% lawan 84,4%, 68,9% lawan 63,9%, dan 73,9% lawan 68,3%. Lalu atur ukurannya ke 360 pada tiap pengambilan. Lab ini tidak punya dataset nyata dan tidak punya sakelar Data nyata; pesannya dibuat khusus, dan penguin di lab lain adalah pengukuran, bukan teks. Pengecekan dengan data nyata membutuhkan pesan nyata dengan label dari sumber selain teks pretraining. Karena itu, berapa pengambilan yang kamu inginkan sebelum menyatakan model mana yang lebih baik pada 8 pesan?


### Angka di kedua versi bahasa
Lab ini membangun kalimat dan pesan pelanggannya dalam bahasa halaman, sehingga kedua versi menampilkan angka yang berbeda. Bacalah kolom bahasamu; kedua kolom dicantumkan agar versi bahasa Inggris dan versi bahasa Indonesia pelajaran ini menyampaikan hal yang sama.

| Pemeriksaan | Lab bahasa Inggris | Lab bahasa Indonesia |
|---|---|---|
| Kalimat | "the cat sat on the mat" (6 token) | "kucing duduk di tikar dan kucing tidur" (7 token) |
| Head 1, baris yang ditelusuri | "cat" 8%, 61%, 8%, 8%, 9%, 6% | "kucing" pertama 37%, 5%, 5%, 4%, 5%, 40%, 5% |
| Head 1, lainnya | "sat" 50%, "mat" 55%, "the" 15% sampai 19% | "duduk" 35% (31% pada "tidur"), "tikar" 53%, "di" 12% sampai 17% |
| Head 2 | baris 1: 35%, 30%, 20%, 10%, 4%, 1%; "mat" 35%, 30%, 20% | baris 1: 35%, 30%, 20%, 10%, 4%, 1%, 0%; "tikar" 23%, 20%, 20% |
| Head 2, tanpa posisi | 17% di mana-mana (1/6) | 14% di mana-mana (1/7) |
| Head 3 | "cat" 50% dan "mat" 49% pada "sat", "sat" 21% | "kucing" 35% dan 32%, "tikar" 35% dan 31%, "duduk" 17% |
| Head 4 | tidak ada baris yang memberi "sat" lebih dari sekitar 11% | tidak ada baris yang memberi "duduk" lebih dari sekitar 12% |
| Head 1, tanpa posisi | "cat" tetap 61% | "kucing" 37% menjadi 39% |
| Head 1, mask | baris 1 100%, "cat" 12% dan 88%, "mat" 55% | baris 1 100%, "duduk" 16% dan 84%, "tidur" 34% dan 31% |
| Kata tak dikenal | "the cat sat on the sofa": sekitar 19% pada "cat" dan "sat" | "kucing duduk di sofa": sekitar 28% dan 27% |
| Karakter | 22 token | 24 token (teksnya dipotong) |
| BPE | 23 token pada 0 merge, 7 pada 12, 6 pada 44 (slider 0 sampai 44) | 24 pada 0, 19 pada 12, 7 pada 66 (slider 0 sampai 66) |
| Kalimat kedua | "the dog chased the cat": 43% dan 38%, lalu 60% dan 61% | "anjing itu mengejar kucing": 46% dan 40%, lalu 67% dan 68% |
| 8 pesan | 67,2%, 82,8%, 82,2%; macro F1 0,67, 0,83, 0,82 | 57,8%, 73,9%, 73,3%; macro F1 0,58, 0,74, 0,73 |
| Kesalahan pada 8 | 59 dari 180 (33%) dan 31 dari 180 (17%); pesan yang sama di urutan pertama | 76 dari 180 (42%) dan 47 dari 180 (26%); pesan yang sama di urutan kedua |
| 3 dan 360 pesan | 58,9%, 58,3%, 58,3% dan 94,4%, 91,1%, 94,4% | 44,4%, 52,2%, 52,2% dan 93,3%, 91,1%, 92,8% |
| Empat pengambilan berikutnya pada 8 | 65,0% lawan 73,9%, 59,4% lawan 71,7%, 72,2% lawan 72,8%, 70,0% lawan 63,9% | 71,7% lawan 70,6%, 57,2% lawan 84,4%, 68,9% lawan 63,9%, 73,9% lawan 68,3% |
| Dua belas pengambilan pertama | beku unggul lebih dari 3 poin di 9, dalam 3 poin di 2, tertinggal di 1; rata-rata 64,5% dan 73,5%; bag of words di depan pada 360 di 12 | unggul di 8, dalam 3 poin di 2, tertinggal di 2; rata-rata 63,5% dan 72,5%; bag of words di depan pada 360 di 8 dari 12, sama di 2, tertinggal di 2 |
