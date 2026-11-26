---
slug: retrieval-ranking-and-cold-start
title: Retrieval, ranking, dan cold start
---
::: intro
- Jelaskan mengapa recommender mengambil beberapa ratus kandidat dengan cara murah terlebih dahulu, baru kemudian mengurutkannya dengan model yang lebih kaya.
- Pilih cadangan untuk pengguna baru atau item baru: popularitas, fitur konten, atau menanyakan preferensi.
- Hitung precision@k, recall@k, dan NDCG@k dengan tangan, nilai sebuah daftar lewat coverage dan diversity, bagi data tanpa membocorkan masa depan, dan sebutkan feedback loop yang diciptakan recommender.

Sebelum mulai: baca "Collaborative filtering and matrix factorization" di kursus ini, "Confusion matrix dan rasio-rasionya" (precision dan recall), serta "Split berkelompok dan split temporal" (mengapa mengacak data yang berurutan dalam waktu menimbulkan kebocoran).
:::

## Dua tahap, karena katalognya besar
*Mengapa tidak semua judul langsung diberi skor oleh model terbaik?*

Bayangkan layanan streaming dengan 1.000.000 judul. Misalkan model terbaiknya butuh 1 milidetik untuk memberi skor satu judul bagi satu pengguna. Memberi skor seluruh katalog memakan 1.000.000 milidetik, yaitu 1.000 detik, sekitar 17 menit, untuk satu halaman. Angka-angka ini rekaan, hanya untuk hitungan.

Karena itu pekerjaannya dibagi dua. **Retrieval**, disebut juga candidate generation, memakai cara yang murah untuk memilih beberapa ratus kandidat: item vector yang paling dekat dengan vector pengguna (matrix factorization dari pelajaran sebelumnya), judul yang mirip dengan beberapa tontonan terakhir, dan yang sedang populer hari ini. Lalu **ranking** hanya memberi skor pada kandidat itu dengan model yang lebih kaya, yang dapat memakai riwayat pengguna, konten judul, dan waktu dalam sehari, kemudian mengurutkannya. Mengurutkan 300 kandidat dengan 1 milidetik per judul memakan 0,3 detik.

[[figure:retrieval-ranking-and-cold-start/pipeline|Dua tahap: retrieval yang murah memangkas 1.000.000 judul menjadi 300 kandidat, lalu model yang lebih kaya mengurutkan mereka dan 10 teratas ditampilkan.]]

> Gagasan kunci: retrieval menentukan batas atas. Ranker hanya melihat apa yang diteruskan retrieval, sehingga judul yang dibuang retrieval tidak akan pernah sampai ke pengguna.

> Contoh hitungan: seorang pengguna akan menyukai 5 judul, dan 300 kandidat memuat 4 di antaranya. Candidate recall-nya 4 / 5 = 0,8, jadi ranker yang sempurna pun paling banyak dapat menampilkan 4 dari 5 judul itu.

::: deeper Menilai setiap tahap
Setiap tahap punya pertanyaannya sendiri. Untuk retrieval: apakah 300 kandidat memuat judul yang kemudian disukai pengguna (candidate recall, seperti di atas)? Untuk ranking: di antara kandidat, apakah judul yang disukai berada dekat puncak (NDCG, di bawah)? Untuk seluruh halaman: apakah pengguna sungguhan menjadi lebih baik (uji online, di bawah)? Skor akhir yang rendah belum berarti apa-apa sebelum kamu tahu tahap mana yang menghilangkan judul-judul itu.
:::

## Cold start: pengguna baru, item baru
*Apa yang dapat dilakukan recommender ketika belum tahu apa-apa?*

Collaborative filtering belajar dari tabel interaksi masa lalu. Pengguna baru adalah baris kosong pada tabel itu, dan item baru adalah kolom kosong. Inilah masalah **cold start**: tidak ada riwayat untuk dipelajari, sehingga model tidak punya bahan pembanding.

[[figure:retrieval-ranking-and-cold-start/cold-start|Tabel interaksi dengan satu pengguna baru (baris kosong) dan satu item baru (kolom kosong).]]

Ada tiga cadangan yang lazim.

- **Popularitas.** Rekomendasikan yang paling banyak ditonton pengguna. Tidak butuh data pribadi, dan ini baseline yang kuat. Pada layanan rekaan dengan 1.000 pengguna, 620 menonton judul P dan 180 menonton judul Q, sehingga P berada di urutan pertama.
- **Fitur konten.** Gambarkan item baru lewat apa yang sudah diketahui: genre, tag, pemeran. Beri skor menurut kemiripannya dengan judul yang disukai pengguna. Judul baru ber-tag {space, drama, comedy} dan judul yang disukai ber-tag {space, drama, thriller} berbagi 2 dari 4 tag yang berbeda, sehingga kemiripan Jaccard-nya 2 / 4 = 0,5.
- **Tanyakan preferensi.** Saat mendaftar, tampilkan delapan judul dan biarkan pengguna memilih yang mereka sukai. Pilihan itu menjadi baris riwayat pertamanya.

Item baru juga dapat ditampilkan kepada sekelompok kecil pengguna, agar interaksi nyata mulai terkumpul.

> Awas: popularitas memberi daftar yang sama kepada setiap pengguna cold. Ini awal yang baik, bukan jawaban yang dipersonalisasi, dan ia memperkuat feedback loop yang dibahas di bagian akhir pelajaran ini.

## Precision@k dan recall@k
*Bagaimana menilai daftar yang hanya menampilkan k judul?*

Sisihkan aktivitas pengguna di masa berikutnya. Katakanlah ia kemudian menyukai 4 judul, yaitu item **relevan**-nya, dan 5 teratas dari model mengenai judul relevannya pada rank 1, 3, dan 5 (daftar A di bawah). Pada batas k mana pun:

- **precision@k** = judul relevan di k teratas / k.
- **recall@k** = judul relevan di k teratas / semua judul relevan miliknya.

Keduanya adalah precision dan recall dari pelajaran klasifikasi, hanya dihitung pada slot yang dilihat pengguna.

| k | Relevan di k teratas | precision@k | recall@k |
| --- | --- | --- | --- |
| 1 | 1 | 1 / 1 = 1 | 1 / 4 = 0,25 |
| 3 | 2 | 2 / 3 = 0,67 | 2 / 4 = 0,5 |
| 5 | 3 | 3 / 5 = 0,6 | 3 / 4 = 0,75 |

Recall hanya dapat naik ketika k membesar, sedangkan precision cenderung turun. Untuk menilai sebuah model, rata-ratakan setiap angka atas semua pengguna.

> Awas: jika seorang pengguna hanya punya 2 judul relevan, precision@5 tidak akan pernah melebihi 2 / 5 = 0,4. Bandingkan model pada pengguna yang sama dan k yang sama.

## NDCG@k: posisi itu penting
*Bagaimana memberi nilai lebih pada hit yang dekat puncak?*

Precision@5 memberi daftar A (hit di rank 1, 3, 5) dan daftar B (hit di rank 3, 4, 5) skor yang sama, 0,6, dan recall yang sama, 0,75. Padahal A menaruh hit di urutan pertama. **NDCG** (normalized discounted cumulative gain) menghitung hit di rank r sebagai 1 / log2(r + 1), sehingga hit yang lebih belakang bernilai lebih kecil.

| Rank | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- |
| Diskon 1 / log2(r + 1) | 1 | 0,631 | 0,5 | 0,431 | 0,387 |
| Daftar A | hit | miss | hit | miss | hit |
| Daftar B | miss | miss | hit | hit | hit |

> Contoh hitungan: DCG daftar A = 1 + 0,5 + 0,387 = 1,887. DCG daftar B = 0,5 + 0,431 + 0,387 = 1,318. Daftar ideal menaruh keempat judul relevan di depan: 1 + 0,631 + 0,5 + 0,431 = 2,562. NDCG@5 adalah DCG dibagi nilai ideal: A menghasilkan 1,887 / 2,562 = 0,737, dan B menghasilkan 1,318 / 2,562 = 0,514.

[[figure:retrieval-ranking-and-cold-start/ranking-metrics|Daftar A dan B dengan precision@5 dan recall@5 yang sama, tetapi NDCG@5 yang berbeda. Daftar ideal menjadi pembagi.]]

Daftar ideal menaruh min(k, jumlah judul relevan) hit di depan, sehingga NDCG selalu berada di antara 0 dan 1.

::: deeper Relevansi bertingkat
Relevansi tidak harus ya atau tidak. Jika gain-nya 3 untuk judul yang sangat disukai, 2 untuk yang disukai, dan 0 untuk yang meleset, DCG menjumlahkan gain / log2(r + 1). Daftar dengan gain 3, 0, 2 punya DCG 3 + 0 + 1 = 4. Urutan ideal 3, 2, 0 menghasilkan 3 + 1,262 + 0 = 4,262, sehingga NDCG@3 = 4 / 4,262 = 0,939. Rumus gain punya beberapa versi, jadi sebutkan versi yang kamu pakai.
:::

## Coverage dan diversity
*Dapatkah sebuah daftar bernilai tinggi tetapi tetap recommender yang buruk?*

Precision dan NDCG menilai satu pengguna per satu. Dua pertanyaan lain perlu melihat semua daftar sekaligus.

**Catalog coverage** adalah bagian katalog yang muncul di setidaknya satu daftar pengguna. Ambil katalog 10 judul dan empat pengguna dengan masing-masing 3 judul. Recommender popularitas menampilkan 3 judul yang sama kepada semua orang, sehingga coverage-nya 3 / 10 = 0,3. Recommender yang dipersonalisasi memberi daftar {A, B, C}, {A, D, E}, {F, B, G}, dan {D, B, A}. Judul yang berbeda adalah A, B, C, D, E, F, dan G, sehingga coverage-nya 7 / 10 = 0,7.

**Diversity** melihat ke dalam satu daftar. Beri setiap pasangan judul nilai 1 jika genre-nya berbeda dan 0 jika sama, lalu ambil rata-ratanya. Daftar 4 judul dengan genre action, action, action, comedy punya 6 pasangan, 3 di antaranya berbeda, sehingga diversity-nya 3 / 6 = 0,5. Empat genre yang berbeda memberi 6 / 6 = 1.

> Gagasan kunci: akurasi, coverage, dan diversity saling tarik-menarik. Laporkan ketiganya bersama, karena daftar yang disetel untuk satu hal dapat diam-diam kehilangan yang lain.

## Membagi data tanpa membocorkan masa depan
*Bagaimana menyisihkan data ketika urutan waktu penting?*

Membagi tabel interaksi secara acak itu menggoda, tetapi keliru. Cara ini dapat menaruh rating hari Jumat seorang pengguna di data latih dan rating hari Senin-nya di data uji, sehingga model belajar dari masa depan untuk menebak masa lalu. Recommender sungguhan hanya pernah menebak apa yang terjadi berikutnya.

[[figure:retrieval-ranking-and-cold-start/leave-last-out|Leave-last-out melatih dengan masa lalu dan menguji pada kejadian terakhir setiap pengguna. Random split memasukkan kejadian yang lebih baru ke data latih.]]

**Leave-last-out** menjaga waktu tetap jujur. Untuk setiap pengguna, urutkan interaksinya menurut waktu, sisihkan yang terbaru sebagai item uji, dan latih dengan sisanya. Variannya memotong menurut tanggal: latih dengan semua yang terjadi sebelumnya, uji dengan semua yang sesudahnya. Buang dari setiap daftar judul yang sudah ada di riwayat latih pengguna, kalau tidak, "rekomendasikan yang sudah ditonton" akan bernilai bagus padahal tidak membantu siapa pun. Dengan satu item uji per pengguna, recall@k menjadi hit rate: 1 jika item itu ada di k teratas, selain itu 0.

> Contoh hitungan: lima pengguna, dan judul yang disisihkan jatuh pada rank 2, 1, 7, 15, dan 4. Dengan k = 10, empat berada di dalam, sehingga hit rate@10 = 4 / 5 = 0,8. NDCG@10 memberi 1 / log2(r + 1) untuk keempatnya dan 0 untuk yang lain: 0,631, 1, 0,333, 0, dan 0,431. Rata-ratanya 2,395 / 5 = 0,479.

## Offline, online, dan feedback loop
*Apakah skor offline yang bagus berarti pengguna akan lebih puas?*

Semua yang dibahas sejauh ini adalah evaluasi **offline**: memutar ulang riwayat yang tercatat lalu menilai daftarnya. Cara ini murah, cepat, dan dapat diulang, sehingga cocok untuk membandingkan banyak model. Namun log hanya memuat reaksi terhadap apa yang dipilih sistem lama untuk ditampilkan. Judul yang tidak pernah ditampilkan tidak punya klik, sehingga model baru yang menampilkannya dinilai salah.

Evaluasi **online** adalah A/B test: bagi pengguna sungguhan secara acak, beri kelompok A sistem yang sekarang dan kelompok B sistem baru, lalu bandingkan perilaku seperti klik, waktu menonton, atau kunjungan kembali selama beberapa hari. Cara ini mengukur reaksi nyata, tetapi memakai waktu pengguna sungguhan. Kebiasaan yang umum: offline untuk menyaring, online untuk memutuskan.

Recommender juga membentuk data yang ia pelajari. Itulah **feedback loop**. Judul yang ditampilkan mendapat klik, sehingga tampak lebih populer dan makin sering ditampilkan (**popularity bias**). Judul yang tidak pernah ditampilkan tidak pernah mengumpulkan data (**exposure bias**). Pengguna yang disuguhi satu jenis judul mengklik jenis itu, dan riwayatnya menyempit. Pantau coverage dan diversity dari waktu ke waktu, bukan hanya sekali.

## Menuju lab Recommender
*Apa yang akan kamu periksa di lab Recommender?*

Pelajaran terakhir kursus ini adalah lab Recommender. Tugasnya mengikuti rencana modul ini: hapus riwayat interaksi sebagian pengguna, lalu bandingkan bagaimana berbagai recommender menangani cold start.

Masuklah dengan tiga pertanyaan. Cadangan apa yang dipakai setiap recommender ketika baris seorang pengguna kosong? Metrik dan k mana yang menilai daftar, dan apakah pembagian datanya menghormati waktu? Apakah skor akurasi yang lebih baik datang bersama coverage atau diversity yang lebih rendah?

Sebelum setiap eksperimen, tebak recommender mana yang paling rugi ketika riwayat hilang. Lalu periksa tebakanmu dengan angka dari pelajaran ini, bukan dengan kesan terhadap daftarnya.

::: remember
- Retrieval mempersempit katalog menjadi beberapa ratus kandidat dengan murah, ranking mengurutkannya dengan model yang lebih kaya, dan recall retrieval menjadi batas atasnya.
- Pengguna atau item cold butuh cadangan: popularitas, fitur konten, atau bertanya. Precision@k, recall@k, NDCG@k, coverage, dan diversity mengukur hal yang berbeda, jadi laporkan beberapa sekaligus.
- Bagi data menurut waktu dengan leave-last-out, anggap skor offline sebagai penyaring dan uji online sebagai putusannya, dan waspadai feedback loop.
:::
