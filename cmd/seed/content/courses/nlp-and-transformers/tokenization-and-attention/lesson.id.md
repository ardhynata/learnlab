---
slug: tokenization-and-attention
title: Tokenization dan attention
---
::: intro
- Bandingkan token berupa kata, karakter, dan subword, lalu jalankan tiga merge byte-pair dengan tangan pada korpus kecil.
- Jelaskan bagaimana sebuah token menjadi vektor, dan mengapa model harus menambahkan informasi posisi ke dalamnya.
- Hitung self-attention untuk tiga token dengan vektor 2-D, dan sebutkan empat bagian sebuah transformer block.

Sebelum mulai: baca "Bag of words and TF-IDF" di kursus Naive Bayes and text classification, "Embeddings and autoencoders" di kursus Representation learning, dan "Neurons and backpropagation" di kursus Neural network fundamentals. Yang pertama menunjukkan apa yang hilang ketika kata hanya dihitung, yang kedua menjelaskan apa itu vektor untuk sebuah item, dan yang ketiga membahas jaringan kecil yang ada di dalam setiap block.
:::

## Dari teks ke token
*Apa satuan yang dibaca oleh sebuah model?*

Model membaca angka, bukan huruf. Langkah pertama adalah memotong teks menjadi potongan yang disebut **token**, lalu memberi setiap token yang berbeda sebuah bilangan bulat, yaitu **id**-nya. Kumpulan token yang dikenal model disebut **vocabulary**. Pelajaran "Bag of words and TF-IDF" memotong teks menjadi kata lalu menghitungnya. Kata hanyalah salah satu pilihan potongan.

| Satuan | "unhappiness" menjadi | Kelebihan dan kekurangan |
| --- | --- | --- |
| Kata | unhappiness (1 token) | Urutannya pendek, tetapi vocabulary harus memuat setiap kata, dan kata yang belum pernah dilihat tidak punya id. |
| Karakter | u, n, h, a, p, p, i, n, e, s, s (11 token) | Vocabulary sangat kecil dan tidak ada yang tidak dikenal, tetapi urutannya panjang dan satu huruf hampir tidak membawa makna. |
| Subword | un, happi, ness (3 token) | Jalan tengah: kata umum tetap utuh, dan kata langka dipecah menjadi bagian yang dipakai ulang oleh kata lain. |

Pemecahan subword di atas hanyalah satu kemungkinan. Hasil sebenarnya bergantung pada tokenizer-nya. Sebagian besar model teks modern memakai subword, dan tokenizer itu sendiri dipelajari dari data. Bagian berikutnya membangun satu tokenizer kecil.

## Merge byte-pair dengan tangan
*Bagaimana tokenizer mempelajari potongannya dari data?*

**Byte-pair encoding** (BPE) mempelajari subword dengan satu aturan: mulai dari karakter tunggal, lalu berulang kali gabungkan pasangan token bertetangga yang paling sering muncul menjadi satu token baru. Setiap merge menambah satu token ke vocabulary.

Ambil korpus berisi empat kata beserta jumlah kemunculannya: low (5 kali), lower (2), newer (6), dan wider (3). Setelah dipecah menjadi karakter, korpus ini berisi 5 × 3 + 2 × 5 + 6 × 5 + 3 × 5 = 70 token.

| Merge | Pasangan terbanyak | Jumlah | Token baru | Token dalam korpus |
| --- | --- | --- | --- | --- |
| 1 | e + r | 11 | er | 59 |
| 2 | w + er | 8 | wer | 51 |
| 3 | l + o | 7 | lo | 44 |

> Contoh hitungan: **Merge 1.** Pasangan e + r muncul di lower (2), newer (6), dan wider (3), sehingga 2 + 6 + 3 = 11 kali, lebih banyak daripada pasangan lain (w + e menyusul dengan 8). Setiap e r menjadi er. **Merge 2.** Sekarang newer terbaca n e w er, sehingga w + er muncul di lower (2) dan newer (6): 8 kali, mengalahkan l + o yang 7. **Merge 3.** l + o muncul di low (5) dan lower (2): 7 kali, mengalahkan n + e dan e + wer yang masing-masing 6 (o + w kini hanya ada di low, 5 kali, karena lower terbaca l o wer).

[[figure:tokenization-and-attention/bpe-merges|Keempat kata setelah setiap merge. Potongan berwarna adalah token baru, dan korpus menyusut dari 70 token menjadi 44.]]

Merge keempat akan seri antara n + e dan e + wer, masing-masing 6, sehingga tokenizer sungguhan memerlukan aturan pemutus seri. Kita berhenti di sini. Kata yang belum pernah muncul tetap mendapat potongan: ulangi merge sesuai urutannya pada "lowered", yaitu l o w e r e d. Hasilnya l o w er e d, lalu l o wer e d, lalu lo wer e d: empat token.

## Dari token ke vektor
*Bagaimana id token menjadi daftar angka?*

Id hanyalah label: id 7 tidak "lebih" daripada id 3 dalam arti yang berguna. Model membutuhkan vektor. Ia menyimpan tabel dengan satu baris untuk setiap token di vocabulary, yaitu **embedding matrix**, dan setiap baris berisi d angka. Untuk meng-embed sebuah token, ambil barisnya. Vocabulary berisi 50.000 token dengan d = 768 akan memuat 50.000 × 768 = 38.400.000 angka.

Baris-barisnya dimulai secara acak dan dilatih bersama bagian model lainnya. Token yang dipakai dengan cara serupa akhirnya punya baris yang berdekatan, gagasan dari "Embeddings and autoencoders". Kalimat dengan 3 token menjadi tabel berisi 3 vektor, satu per token, berurutan.

Bandingkan dengan bag of words. Di sana, sebuah dokumen adalah satu baris hitungan dengan satu kolom per kata, dan urutannya hilang. Di sini dokumen tetap berupa urutan vektor padat yang pendek, sehingga urutan masih dapat dipakai. Bagian berikutnya menunjukkan caranya.

> Perhatian: pada tahap ini token yang sama punya vektor yang sama di mana pun ia muncul. "Bank" di tepi sungai dan bank yang meminjamkan uang bermula dari satu baris yang sama. Perbedaannya harus datang dari token-token di sekitarnya, dan itulah yang disediakan oleh attention.

## Mengapa urutan butuh posisi
*Mengapa model harus diberi tahu di mana setiap token berada?*

Attention, yang dijelaskan di bagian berikutnya, tidak pernah melihat urutan. Skor antara dua token hanya bergantung pada vektor keduanya. Tukar dua token pada input, maka output keduanya ikut bertukar, dan tidak ada yang lain yang berubah. "The cat chased the dog" dan "the dog chased the cat" akan memberi setiap token vektor output yang sama. Itu adalah masalah bag of words lagi, padahal attention jauh lebih kaya daripada sekadar menghitung.

Solusinya adalah menambahkan **vektor posisi** ke embedding setiap token sebelum attention. Ada dua jenis yang umum. **Learned positions** adalah tabel kedua dengan satu baris per posisi, dilatih seperti tabel embedding. **Sinusoidal positions** berasal dari rumus tetap. Dengan d = 2, posisi p mendapat vektor (sin p, cos p):

| Posisi p | 0 | 1 | 2 |
| --- | --- | --- | --- |
| (sin p, cos p) | (0, 1) | (0,84, 0,54) | (0,91, -0,42) |

> Contoh hitungan: "dog" punya embedding (2, 1). Pada posisi 0 model melihat (2, 1) + (0, 1) = (2, 2). Pada posisi 2 model melihat (2, 1) + (0,91, -0,42) = (2,91, 0,58). Kata yang sama kini punya dua vektor berbeda, sehingga attention dapat membedakan kedua tempat itu.

[[figure:tokenization-and-attention/position-vectors|Kiri: dua angka sinusoidal pada posisi 0 sampai 7. Kanan: kata "dog" dengan dua posisi berbeda yang ditambahkan.]]

## Query, key, dan value
*Bagaimana sebuah token memutuskan token lain mana yang penting baginya?*

**Self-attention** membangun vektor baru untuk setiap token sebagai campuran berbobot dari vektor semua token dalam kalimat, termasuk dirinya sendiri. Bobotnya tidak tetap. Bobot itu dihitung dari kalimatnya.

Setiap vektor token x diubah menjadi tiga vektor oleh tiga matriks yang dipelajari: **query** q (apa yang dicari token ini), **key** k (apa yang ia tawarkan agar bisa ditemukan), dan **value** v (apa yang ia serahkan ketika dipilih). Misalnya, jika x = (1, 2) dan W_q berbaris (0, 1) dan (1, 1), maka q = 1 × (0, 1) + 2 × (1, 1) = (2, 3). Untuk token i:

1. **Skor** setiap token j: hasil kali titik (dot product) antara q_i dan k_j (kalikan angka-angka yang berpasangan lalu jumlahkan).
2. **Skala**: bagi setiap skor dengan akar kuadrat dari d, panjang q dan k.
3. **Softmax**: ubah skor berskala s menjadi weight dengan w_j = exp(s_j) / (jumlah semua exp(s)). Weight-nya positif dan berjumlah 1, dan skor terbesar mendapat bagian terbesar.
4. **Campur**: output untuk token i adalah jumlah dari w_j × v_j.

> Gagasan kunci: weight berasal dari membandingkan satu query dengan setiap key, dan output adalah campuran value. Token yang cocok dengan sebuah key akan mengambil banyak dari value token itu.

## Attention untuk tiga token
*Dapatkah kamu menghitung satu langkah attention dengan pensil?*

Ambil kalimat "the cat sat". Agar hitungannya tetap sederhana, ketiga vektor setiap token diberikan begitu saja, dibuat khusus untuk pelajaran ini. d = 2, sehingga skalanya akar kuadrat dari 2, yaitu 1,414.

| Token | Query q | Key k | Value v |
| --- | --- | --- | --- |
| the | (0, 1) | (1, 0) | (1, 0) |
| cat | (1, 1) | (0, 2) | (0, 2) |
| sat | (1, 2) | (1, 1) | (2, 1) |

> Contoh hitungan: **token "sat".** Skor, yaitu dot product q = (1, 2) dengan setiap key: the 1 × 1 + 2 × 0 = 1, cat 1 × 0 + 2 × 2 = 4, sat 1 × 1 + 2 × 1 = 3. Setelah diskalakan: 0,707, 2,828, dan 2,121. Eksponensialnya: 2,03, 16,92, dan 8,34, yang jumlahnya 27,29. Weight: 2,03 / 27,29 = 0,07, 16,92 / 27,29 = 0,62, 8,34 / 27,29 = 0,31. Output: 0,07 × (1, 0) + 0,62 × (0, 2) + 0,31 × (2, 1) = (0,07 + 0,62, 1,24 + 0,31) = (0,69, 1,55).

Langkah yang sama untuk dua token lainnya menghasilkan tabel ini. Output memakai weight yang belum dibulatkan.

| Token query | Weight pada the | Weight pada cat | Weight pada sat | Output |
| --- | --- | --- | --- | --- |
| the | 0,14 | 0,58 | 0,28 | (0,71, 1,44) |
| cat | 0,20 | 0,40 | 0,40 | (1,00, 1,20) |
| sat | 0,07 | 0,62 | 0,31 | (0,69, 1,55) |

[[figure:tokenization-and-attention/attention-weights|Kiri: bagaimana skor untuk "sat" menjadi weight. Kanan: ketiga baris weight, beserta setiap vektor output.]]

"sat" menaruh weight terbesar pada "cat", sehingga outputnya (0,69, 1,55) dekat dengan value "cat", yaitu (0, 2). Vektor setiap token kini membawa sedikit konteks dari token lain.

::: deeper Mengapa dibagi akar kuadrat dari d
Misalkan angka-angka dalam q dan k saling bebas, masing-masing dengan rata-rata 0 dan varians 1. Maka dot product punya varians d, sehingga ukuran tipikalnya adalah akar kuadrat dari d: sekitar 8 ketika d = 64. Skor sebesar itu membuat softmax hampir one-hot (seluruh weight pada satu token dan nol pada sisanya), dengan gradien, yaitu kemiringan yang diikuti training, yang sangat kecil untuk sisanya. Pembagian dengan akar kuadrat dari d mengembalikan ukuran tipikalnya ke sekitar 1. Di sini d = 2, sehingga pengaruhnya kecil: tanpa penskalaan, "sat" akan menaruh 0,71 pada "cat", bukan 0,62.
:::

## Head dan transformer block
*Terbuat dari apa sebuah transformer block?*

Satu set matriks query, key, dan value mencari satu jenis hubungan. **Multi-head attention** menjalankan beberapa langkah attention berdampingan, setiap head dengan tiga matriksnya sendiri, lalu menggabungkan outputnya dan mencampurnya dengan satu matriks lagi. Training yang menentukan apa yang dicari setiap head.

Sebuah **transformer block** punya empat bagian:

1. **Multi-head self-attention.** Token saling bertukar informasi.
2. **Residual connection.** Input sebuah bagian ditambahkan kembali ke outputnya, out = x + f(x), jalan pintas yang membantu tumpukan dalam untuk dilatih ("Activations, initialization and optimizers").
3. **Normalisasi.** Vektor setiap token diskalakan ulang menjadi rata-rata 0 dan simpangan baku 1, lalu skala dan geseran yang dipelajari diterapkan.
4. **Feed-forward network.** Jaringan kecil dua layer ("Neurons and backpropagation") yang diterapkan pada vektor setiap token sendiri-sendiri dengan weight yang sama. Attention mencampur antar token, sedangkan bagian ini mengubah setiap token.

Urutan yang lazim adalah attention, tambah dan normalisasi, feed-forward, tambah dan normalisasi. Model berbeda dalam tempat melakukan normalisasi. Sebuah model menumpuk banyak block, dan vektor output satu block menjadi input block berikutnya.

[[figure:tokenization-and-attention/transformer-block|Satu transformer block. Dua panah melengkung adalah residual connection yang menambahkan input kembali.]]

::: deeper Residual dan normalisasi dengan angka
Misalkan vektor sebuah token adalah x = (1, 5) dan bagian attention mengembalikan (0,5, -1). Residual connection memberi x + f(x) = (1,5, 4). Normalisasi lalu mengambil jumlah ini, (1,5, 4): rata-ratanya 2,75 dan selisihnya terhadap rata-rata adalah (-1,25, 1,25), yang ukuran tipikalnya, yaitu simpangan baku, adalah 1,25. Membaginya dengan angka itu menghasilkan (-1, 1). Layer sungguhan juga menerapkan skala dan geseran yang dipelajari, serta menambahkan konstanta kecil agar tidak membagi dengan nol.
:::

::: deeper Mengapa satu frekuensi tidak cukup
Pasangan (sin p, cos p) berulang setiap 6,28 posisi: posisi 6 memberi (-0,28, 0,96), dekat dengan posisi 0 di (0, 1). Sinusoidal positions sungguhan memakai banyak pasangan. Pasangan nomor i dalam vektor sepanjang d memakai sin dan cos dari p / 10000^(2i / d), sehingga gelombangnya berjalan dari cepat sampai sangat lambat, dan setiap posisi mendapat polanya sendiri. Tabel yang dipelajari tidak memerlukan rumus, tetapi tidak dapat memberi vektor yang berguna untuk posisi di luar ujung tabelnya.
:::

## Setelah ini
*Apa yang sudah kamu punya sekarang, dan apa yang menyusul?*

Kini kamu mengenal seluruh jalur dari teks ke konteks. Tokenizer memotong teks menjadi token, embedding table mengubah setiap id menjadi vektor, vektor posisi ditambahkan, dan setumpuk block membuat setiap token mencampurkan apa yang dibawa token lain. Block terakhir mengembalikan satu vektor per token, dan setiap vektor itu kini bergantung pada tetangganya. Belum ada label yang diperlukan di sini: semua tabel dan matriksnya dipelajari lewat training.

Pelajaran berikutnya, "Pretrained models and fine-tuning", bertanya dari mana weight jaringan seperti ini berasal dan bagaimana weight itu dipakai ulang untuk tugas berlabel yang kecil. Lab attention kemudian menutup kursus ini: kamu menelusuri attention pada model kecil, tempat setiap baris tabel weight yang kamu hitung dengan tangan menjadi satu baris di layar.

::: remember
- Tokenization memotong teks menjadi kata, karakter, atau subword. Byte-pair encoding mempelajari subword dengan menggabungkan pasangan bertetangga yang paling sering berulang kali, dan setiap id token dicari di embedding matrix untuk mendapatkan vektor.
- Self-attention mencampur vektor value dengan weight dari softmax(q · k / akar kuadrat dari d). Untuk "sat" weight-nya 0,07, 0,62, dan 0,31. Attention mengabaikan urutan, sehingga vektor posisi ditambahkan ke setiap token.
- Transformer block terdiri dari multi-head attention, residual connection, normalisasi, dan feed-forward network, yang ditumpuk berkali-kali.
:::
