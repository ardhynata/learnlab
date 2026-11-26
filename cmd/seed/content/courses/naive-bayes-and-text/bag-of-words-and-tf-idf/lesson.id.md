---
slug: bag-of-words-and-tf-idf
title: Bag of words dan TF-IDF
---
::: intro
- Ubah teks pendek menjadi token, lalu kumpulan teks menjadi count vector pada sebuah vocabulary.
- Hitung TF-IDF (term frequency dikali inverse document frequency) secara manual untuk tiga dokumen kecil, dan jelaskan mengapa kata yang muncul di setiap dokumen mendapat skor 0.
- Sebutkan apa yang dibuang oleh bag of words, dan apa akibatnya.

Sebelum mulai: baca "Missing values and encoding" dan "Distance and similarity". Pelajaran pertama memberimu kolom one-hot, satu kolom untuk tiap kategori; pelajaran ini memberi sebuah teks satu kolom untuk tiap kata. Pelajaran kedua memperkenalkan cosine distance, yang dipakai oleh lipatan "Lebih dalam" pada hitungan kata.
:::

## Dari teks ke angka
*Bagaimana sebuah kalimat menjadi sesuatu yang dapat dipakai model?*

Semua model sejauh ini menerima tabel angka, misalnya panjang sirip dalam mm. Kalimat bukanlah satu baris angka. Sebelum classifier mana pun dapat membaca teks, setiap teks harus diubah menjadi daftar angka dengan panjang tetap, satu angka untuk tiap feature.

Dalam pelajaran ini, teks disebut **dokumen**: bisa berupa email, ulasan, atau satu kalimat pendek. Kumpulan dokumen disebut **corpus**. Langkah pertamanya adalah **tokenisasi**: memotong tiap dokumen menjadi potongan yang disebut **token**, biasanya berupa kata. Resep sederhananya mengubah semua huruf menjadi huruf kecil, memisahkan teks pada spasi, dan membuang tanda baca. "The Cat sat on the mat." menjadi *the, cat, sat, on, the, mat*. Dengan huruf kecil, "The" dan "the" dianggap token yang sama.

Tokenizer sungguhan membuat lebih banyak pilihan: apakah "don't" tetap satu token, bagaimana memperlakukan angka atau emoji. Setiap pilihan mengubah feature yang dihasilkan, jadi ini adalah keputusan pemodelan, bukan sekadar detail.

Pelajaran ini memakai corpus berisi tiga dokumen, cukup kecil untuk dihitung dengan tangan:

| Dokumen | Teks |
| --- | --- |
| D1 | the cat sat on the mat |
| D2 | the dog sat on the log |
| D3 | the cat chased the dog |

[[figure:bag-of-words-and-tf-idf/pipeline|Dari kalimat ke angka: lakukan tokenisasi, lalu hitung tiap kata dalam vocabulary. D1 menjadi daftar 2, 1, 1, 1, 1, 0, 0, 0.]]

## Bag of words
*Seperti apa bentuk sebuah count vector?*

**Vocabulary** adalah daftar token berbeda dalam corpus, dan tiap token menjadi satu feature. Menurut urutan kemunculan pertama, ketiga dokumen memiliki 8 token: *the, cat, sat, on, mat, dog, log, chased*.

**Bag of words** menggambarkan sebuah dokumen lewat berapa kali tiap kata vocabulary muncul di dalamnya. Bayangkan kata-kata dituang ke dalam kantong lalu dikocok: jumlahnya tetap ada, urutannya hilang. Setiap dokumen menjadi satu baris berisi 8 hitungan:

| Dok | the | cat | sat | on | mat | dog | log | chased |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D1 | 2 | 1 | 1 | 1 | 1 | 0 | 0 | 0 |
| D2 | 2 | 0 | 1 | 1 | 0 | 1 | 1 | 0 |
| D3 | 2 | 1 | 0 | 0 | 0 | 1 | 0 | 1 |

Ini adalah gagasan one-hot dari "Missing values and encoding", dengan satu perbedaan: sel one-hot berisi 0 atau 1, sedangkan sel bag of words berisi jumlah kemunculan. Tabel ini sekarang menjadi tabel feature biasa, sehingga classifier mana pun dari pelajaran sebelumnya dapat memakainya sebagai input.

[[figure:bag-of-words-and-tf-idf/count-matrix|Ketiga dokumen sebagai tabel hitungan. Sel yang lebih gelap berisi hitungan lebih besar, dan sel yang samar berisi nol.]]

## Fitur yang sparse
*Mengapa kebanyakan angkanya nol?*

Pada tabel di atas, 10 dari 24 sel bernilai nol. Pada corpus sungguhan, porsinya jauh lebih besar. Misalkan vocabulary berisi 20.000 kata dan satu email hanya memakai 60 kata berbeda. Paling banyak 60 dari 20.000 selnya yang tidak nol, yaitu 60 / 20.000 = 0,3%. Baris yang hampir seluruhnya berisi nol disebut **sparse**.

Menyimpan 19.940 angka nol memboroskan memori, sehingga perangkat lunak hanya menyimpan sel yang tidak nol, masing-masing sebagai pasangan (nomor kata, hitungan). Jika vocabulary diberi nomor mulai dari 0, D1 menjadi lima pasangan, bukan delapan nilai:

(0, 2), (1, 1), (2, 1), (3, 1), (4, 1)

Bacalah begini: kata 0 (*the*) dua kali, kata 1 (*cat*) satu kali, dan seterusnya. Sel yang tidak tercantum berarti 0.

Penyimpanan sparse tidak mengubah apa pun pada model, hanya pada biayanya. Namun ada risiko yang sudah kamu kenal dari "Underfitting and overfitting": dengan ribuan feature dan sedikit teks latih, model punya cukup ruang untuk menghafal kebetulan pada teks latih. Memangkas vocabulary, seperti pada bagian berikutnya, membantu mengatasinya.

## Stop words dan pembersihan
*Kata mana yang sebaiknya tidak masuk vocabulary?*

Perhatikan kolom *the*: 2, 2, 2. Nilainya sama di setiap dokumen, sehingga tidak dapat membedakan D1 dari D3. (Kata *on* tidak konstan di sini, yaitu 1, 1, 0, tetapi ia kata yang sangat umum, jadi daftar stop word tetap memuatnya.) **Stop words** adalah kata yang sangat umum, seperti *the, on, a, of, is*. Banyak pipeline membuangnya sebelum menghitung. Jika *the* dan *on* dibuang dari corpus kita, vocabulary menyusut dari 8 kata menjadi 6: *cat, sat, mat, dog, log, chased*.

Langkah pembersihan lain mengikuti logika yang sama. Mengubah ke huruf kecil menggabungkan "Cat" dan "cat". Sebagian pipeline juga melakukan **stemming**, yaitu memotong "chased" dan "chases" menjadi satu stem yang sama, dan sebagian membuang kata yang hanya muncul di satu atau dua dokumen, yang sering kali merupakan salah ketik.

> Awas: stop word tidak selalu tidak berguna. Beberapa daftar stop word memuat "not", padahal "not good" berarti kebalikan dari "good". Perlu tidaknya sebuah kata dibuang bergantung pada tugasnya, jadi bandingkan pilihan-pilihannya pada validation set, jangan hanya mengandalkan sebuah daftar.

Ada cara yang lebih halus daripada menghapus kata: simpan kata itu dan biarkan angkanya mengecil. Itulah yang dilakukan TF-IDF berikutnya.

## TF-IDF
*Bagaimana membuat kata yang khas mendapat bobot lebih besar?*

Hitungan mentah memperlakukan semua kata sama, padahal kata yang hanya muncul di satu dokumen jauh lebih menggambarkan dokumen itu daripada kata yang muncul di mana-mana. TF-IDF mengalikan dua angka untuk setiap kata di setiap dokumen.

- **Term frequency (tf):** berapa kali kata itu muncul di dokumen ini, di sini berupa hitungan mentah.
- **Document frequency (df):** berapa banyak dokumen yang memuat kata itu.
- **Inverse document frequency (idf):** ln(N / df), dengan N jumlah dokumen dan ln logaritma natural. Kata yang ada di setiap dokumen punya df = N, sehingga idf = ln(1) = 0. Semakin langka kata itu, semakin besar idf-nya.

**TF-IDF = tf x idf.** Sebuah kata mendapat skor tinggi di suatu dokumen bila sering muncul di sana dan langka di seluruh corpus.

> Gagasan kunci: TF-IDF mempertahankan hitungan sebagai ukuran seberapa sering dokumen memakai suatu kata, lalu menskalakannya menurut seberapa sedikit dokumen yang memakai kata itu. Kata yang ada di mana-mana diskalakan menjadi nol.

Setiap library punya perbedaan detail: ada yang membagi hitungan dengan panjang dokumen, ada yang menambahkan 1 di dalam logaritma, dan ada yang mengubah skala tiap baris menjadi panjang 1. Angkanya memang berubah, tetapi gagasannya sama. Dalam pelajaran ini tf adalah hitungan mentah dan idf = ln(N / df).

## TF-IDF secara manual
*Dapatkah kamu menghitungnya dengan pensil pada tiga dokumen?*

Corpus berisi N = 3 dokumen. Hitung df untuk tiap kata, lalu idf = ln(3 / df):

| Kata | the | cat | sat | on | mat | dog | log | chased |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| df | 3 | 2 | 2 | 2 | 1 | 2 | 1 | 1 |
| idf | 0 | 0,41 | 0,41 | 0,41 | 1,10 | 0,41 | 1,10 | 1,10 |

> Contoh hitungan: **D1.** *the* muncul dua kali, tetapi df = 3, sehingga idf = ln(3 / 3) = 0 dan tf-idf = 2 x 0 = 0. *cat* muncul sekali dan df = 2, sehingga idf = ln(1,5) = 0,41 dan tf-idf = 1 x 0,41 = 0,41. *mat* muncul sekali dan df = 1, sehingga idf = ln(3) = 1,10 dan tf-idf = 1 x 1,10 = 1,10. *sat* dan *on* mendapat skor 0,41 seperti *cat*.

D1 menjadi (0; 0,41; 0,41; 0,41; 1,10; 0; 0; 0). Kata yang paling khas adalah *mat*, satu-satunya kata yang tidak dipakai dokumen lain. Kata yang paling sering dipakainya, *the*, mendapat skor 0.

[[figure:bag-of-words-and-tf-idf/tfidf-matrix|Idf tiap kata, lalu tabel TF-IDF untuk ketiga dokumen. Kata yang khusus milik satu dokumen mendapat skor tertinggi di dokumen itu, dan kolom untuk the bernilai 0.]]

Tf tetap berpengaruh. Seandainya *mat* muncul 3 kali di D1, skornya menjadi 3 x 1,10 = 3,30.

::: deeper Lebih mirip lewat hitungan atau lewat TF-IDF?
Pakai cosine similarity (1 dikurangi cosine distance dari "Distance and similarity") pada baris-baris tabel. Pada hitungan mentah, D1 dan D2 punya cosine similarity 0,75, sedangkan D1 dan D3 0,67. Sebagian besarnya berasal dari kata *the*, *sat* dan *on* yang sama-sama dipakai: dot product D1 dan D2 adalah 2 x 2 + 1 x 1 + 1 x 1 = 6, dan panjang masing-masing adalah akar kuadrat dari 8.

Pada baris TF-IDF, pasangan yang sama mendapat 0,19 dan 0,10. Tanpa bobot pada *the*, kedua dokumen berbagi jauh lebih sedikit, dan angkanya menunjukkan hal itu. Urutan pasangannya di sini sama, tetapi kata umum tidak lagi membuat dokumen yang tidak berhubungan tampak mirip.
:::

## Yang dibuang oleh bag
*Apa yang hilang dari resep ini?*

Hitung lagi D3, "the cat chased the dog": 2, 1, 0, 0, 0, 1, 0, 1. Sekarang hitung cerita yang berlawanan, "the dog chased the cat". Kalimat itu memakai kata yang sama dengan jumlah yang sama, jadi barisnya adalah delapan angka yang sama. Bag of words tidak dapat membedakan siapa yang mengejar siapa.

[[figure:bag-of-words-and-tf-idf/word-order|Dua kalimat dengan makna berlawanan dan satu count vector yang identik. Bag menyimpan kata-katanya dan kehilangan urutannya.]]

Kehilangan yang sama menyembunyikan "good" di dalam "not good", dan makna sebuah kata menurut kata-kata di sekitarnya. Salah satu solusinya adalah **n-gram**: tambahkan pasangan kata bertetangga, seperti "not good", ke vocabulary sebagai feature tambahan. Harganya adalah tabel yang jauh lebih besar dan lebih sparse.

Vocabulary dan nilai idf juga dipelajari dari data, jadi berlaku kebiasaan dari "Pipelines and leakage": hitung hanya pada dokumen latih. Kata yang baru muncul pertama kali di dokumen baru tidak punya kolom dan diabaikan.

::: deeper Resep TF-IDF lainnya
Dua varian yang umum: (1) ganti hitungan dengan 1 + ln(hitungan), sehingga *mat* yang kesepuluh menambah lebih sedikit daripada yang pertama; (2) pakai ln((1 + N) / (1 + df)) + 1 sebagai idf, yang menjaga setiap idf tetap di atas 0 dan menghindari pembagian dengan nol untuk kata dengan df = 0. Dengan varian 2 pada corpus kita, idf untuk *the* menjadi 1, bukan 0, dan idf untuk *mat* menjadi ln(4 / 2) + 1 = 1,69, bukan 1,10. Resep mana yang paling baik adalah pertanyaan untuk validation set.
:::

## Ke mana setelah ini
*Bagaimana angka-angka ini masuk ke sebuah classifier?*

Sekarang kamu punya separuh pertama dari text classifier: cara mengubah dokumen apa pun menjadi satu baris angka. Model masih harus mempelajari dari baris-baris itu kata mana yang menunjuk ke kelas mana.

Pelajaran berikutnya, Naive Bayes, melakukannya dengan probabilitas: hitungan kata tiap kelas diubah menjadi probabilitas bahwa sebuah dokumen baru termasuk kelas itu. Pelajaran itu bertumpu pada aturan Bayes dari "Conditional probability and Bayes' rule".

Setelah itu, lab text classifier menyatukan kedua separuhnya. Kamu melatih classifier pada teks dan memeriksa kata mana yang menggerakkan prediksi dan kesalahannya. Ingat tiga hal saat sampai di sana: vocabulary adalah pilihan, stop words adalah pilihan, dan hitungan versus TF-IDF adalah pilihan. Masing-masing mengubah apa yang dapat dilihat model.

::: remember
- Lakukan tokenisasi pada dokumen, bangun vocabulary, dan hitung tiap kata: itulah bag of words. Tabelnya sparse, dan urutan kata hilang.
- Stop words adalah kata yang sangat umum dan sedikit informasinya; membuangnya adalah pilihan yang perlu diuji.
- TF-IDF = tf x idf, dengan idf = ln(N / df). Kata yang ada di setiap dokumen mendapat skor 0, dan kata yang ditemukan di sedikit dokumen mendapat skor tinggi.
:::
