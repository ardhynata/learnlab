---
slug: recommender-lab
title: Recommender lab
---
::: intro
- Hapus riwayat sebagian pengguna, lalu ukur bagaimana enam recommender (popularity, user k-NN, item k-NN, matrix factorization, content-based, dan hybrid) menghadapi cold start.
- Prediksikan recommender mana yang paling terdampak, lalu jelaskan hasilnya dari cara tiap recommender memakai riwayat pengguna itu sendiri.
- Uji gagasan itu pada sampel baru yang dibangkitkan lab, dan jelaskan mengapa satu kali percobaan belum menjadi bukti.

Sebelum mulai: baca "Collaborative filtering and matrix factorization" dan "Retrieval, ranking and cold start" di kursus ini. Lab memakai matriks, neighbor, faktor, tiga fallback cold-start, dan NDCG@k dari kedua pelajaran itu.
:::

## Apa yang ditanyakan lab
*Apa yang dapat kamu ukur dengan Recommender lab?*

Pelajaran sebelumnya memperingatkan bahwa pengguna baru adalah baris yang kosong, sehingga collaborative filtering tidak punya apa pun untuk dibandingkan. Recommender lab mengubah peringatan itu menjadi pengukuran. Lab membangkitkan matriks pengguna-item, menggambarnya sebagai heatmap dengan satu baris per pengguna dan satu kolom per item, menghapus riwayat sebagian pengguna, lalu menilai enam recommender pada pengguna yang sama.

Datanya selalu buatan. Orang "mengklik" item, tidak ada rating nyata yang dipakai, dan lab menyatakannya di layar. Pengaturan awalnya 150 pengguna dan 80 item, yaitu 12.000 sel, dan 9,1% di antaranya adalah interaksi yang boleh dipakai model. Tiap pengguna dengan riwayat yang cukup juga punya satu interaksi yang disisihkan, yaitu hal berikutnya yang ia sukai. Interaksi yang disisihkan itulah yang harus diprediksi para recommender.

[[figure:recommender-lab/row-states|Tiga baris heatmap: pengguna warm, pengguna cold-start yang tidak menyimpan apa pun, dan satu pengguna yang menyimpan 3 interaksi. Lingkaran menandai interaksi yang disisihkan.]]

## Enam recommender, satu baris kosong
*Bagaimana tiap recommender memakai riwayat pengguna?*

Setiap recommender di sini mengurutkan 80 item untuk seorang pengguna dan menampilkan k teratas. Yang membedakan mereka adalah apa yang dibutuhkan dari pengguna itu.

| Recommender | Yang dibutuhkan dari pengguna | Tanpa riwayat |
| --- | --- | --- |
| Popularity | tidak ada | daftar popularitas bersama |
| User k-NN | interaksi pengguna, untuk mencari 20 pengguna yang mirip | semua skor sama |
| Item k-NN | interaksi pengguna, untuk mencari item yang mirip dengannya | semua skor sama |
| Matrix factorization | interaksi pengguna, untuk menyesuaikan vektor pengguna | semua skor sama |
| Content-based | genre dari item yang pernah disentuh pengguna | kembali ke popularity |
| Hybrid | jumlah interaksi | popularity, lalu content, lalu matrix factorization |

Hybrid adalah sebuah router: popularity bila tidak ada interaksi, content-based untuk 1 sampai 4 interaksi, dan matrix factorization mulai 5. Setiap daftar melewati item yang sudah dilihat pengguna. Skor yang sama berarti model tidak punya pendapat, dan lab lalu mengurutkan item yang seri menurut nomor item, yang tidak lebih baik daripada daftar sembarang.

[[figure:recommender-lab/hybrid-routing|Hybrid memilih modelnya menurut jumlah interaksi yang dimiliki pengguna.]]

## Menilai satu pengguna
*Apa yang disisihkan, dan apa arti angka-angkanya?*

Interaksi tiap pengguna diurutkan menurut waktu, seperti di "Retrieval, ranking and cold start". Yang terakhir disisihkan untuk penilaian, yang sebelumnya disimpan untuk validasi matrix factorization, dan model melihat sisanya. Hanya pengguna yang punya interaksi disisihkan yang dinilai: 96 dari 150.

Dengan satu item yang disisihkan, tiap pengguna entah mendapat hit di k teratas atau tidak. Karena itu recall@k bernilai 1 atau 0 untuk tiap pengguna, precision@k bernilai 1 / k atau 0, dan rata-rata precision@k sama dengan rata-rata recall@k dibagi k.

> Contoh hitungan: Hybrid punya recall@10 sebesar 0,78 pada data awal. Precision@10-nya adalah 0,78 / 10 = 0,078, yang ditampilkan lab sebagai 0,08. Precision tampak kecil karena daftar berisi 10 item paling banyak memuat satu hit.

NDCG@k memberi nilai lebih pada hit yang berada dekat puncak: hit di peringkat r bernilai 1 / log2(r + 1), karena daftar ideal menaruh satu item itu di peringkat 1. Hit di peringkat 1 bernilai 1, di peringkat 3 bernilai 0,5, dan di peringkat 7 bernilai 1 / log2(8) = 1 / 3 = 0,33. Kuis Cepat selalu menilai berdasarkan NDCG pada k saat ini.

## Menghapus riwayat
*Apa yang diubah oleh kedua slider?*

**Proporsi pengguna dinilai dengan riwayat dihapus** memilih pengguna secara acak dari 96 pengguna yang dinilai. Pada 30%, itu 0,3 × 96 = 28,8, sehingga 29 pengguna menjadi **pengguna cold-start**, yaitu 30,2% dari pengguna yang dinilai. **Interaksi yang mereka simpan** menentukan berapa interaksi yang dipertahankan masing-masing dari mereka, dipilih secara acak dari riwayatnya, bukan yang paling baru. Pada 0, mereka kehilangan semuanya.

Pada 30% dan 0 tersimpan, status line berbunyi "29 pengguna cold-start kehilangan seluruh riwayat; 327 interaksi dihapus", sekitar 11 per pengguna. Ke-67 pengguna yang dinilai lainnya adalah pengguna warm: mereka mempertahankan riwayatnya dan dinilai dengan cara yang sama. Penilaiannya sama untuk kedua kelompok, sehingga chart dapat menaruh keduanya berdampingan.

Interaksi yang dihapus juga keluar dari data training setiap model, sehingga skor pengguna warm ikut bergeser sedikit. Hitungan popularitas dan kemiripan neighbor kini bertumpu pada 327 interaksi yang lebih sedikit. Interaksi yang disisihkan milik pengguna cold tetap di tempatnya dan masih menjadi target.

## Tanpa riwayat sama sekali
*Apa yang terjadi pada tiap recommender ketika 29 pengguna tidak punya apa-apa?*

Berikut NDCG@10 untuk data awal, dengan 30% pengguna yang dinilai bersifat cold dan tidak ada riwayat mereka yang disimpan.

| Recommender | Pengguna warm | Pengguna cold-start | Penurunan |
| --- | --- | --- | --- |
| Popularity | 0,25 | 0,24 | 0,01 |
| User k-NN | 0,39 | 0,07 | 0,32 |
| Item k-NN | 0,40 | 0,07 | 0,33 |
| Matrix factorization | 0,42 | 0,07 | 0,35 |
| Content-based | 0,48 | 0,24 | 0,23 |
| Hybrid | 0,46 | 0,24 | 0,21 |

[[figure:recommender-lab/warm-vs-cold|NDCG@10 untuk pengguna warm dan pengguna cold-start tanpa riwayat yang disimpan.]]

Ketiga model kolaboratif turun bersama, ke angka yang sama yaitu 0,07. Mereka seri pada setiap item, sehingga semuanya menampilkan item 0, 1, 2, dan seterusnya, dan hanya mendapat hit bila item yang disisihkan kebetulan ada di antaranya. Content-based dan Hybrid mendarat tepat di 0,24 milik Popularity: tanpa riwayat, popularity adalah fallback mereka. Content-based menambahkan porsi popularitas yang sangat kecil pada setiap skor, sehingga dengan profil genre yang kosong hanya porsi itu yang tersisa dan daftarnya sama dengan daftar Popularity. Mereka tidak mempelajari apa pun tentang pengguna; mereka berhenti memakainya.

::: deeper Satu pengguna cold dari dekat
Untuk pengguna cold-start 6, item yang disisihkan adalah 25. Popularity menempatkannya di peringkat 7, sehingga pengguna itu mendapat 1 / log2(8) = 0,33. Daftar kolaboratif dimulai dari 0, 1, 2, 4, 6, dan tidak pernah mencapai item 25, sehingga skornya 0. Item 3 dan 5 tidak muncul karena keduanya ada di riwayat pengguna ini yang dihapus: item itu sebenarnya sudah dikonsumsi, sehingga lab tidak merekomendasikannya.
:::

## Sedikit interaksi sudah sangat membantu
*Berapa interaksi yang dibutuhkan pengguna cold?*

Naikkan **Interaksi yang mereka simpan** dan perhatikan pengguna cold-start saja. Satu interaksi sudah merupakan lompatan besar: User k-NN naik dari 0,07 ke 0,35, karena satu klik memungkinkannya menemukan pengguna lain yang mengklik item yang sama. Dengan 1 interaksi, Hybrid memakai content-based dan mendapat 0,39.

| Interaksi tersimpan | 0 | 1 | 3 | 5 |
| --- | --- | --- | --- | --- |
| Popularity | 0,24 | 0,24 | 0,25 | 0,24 |
| User k-NN | 0,07 | 0,35 | 0,42 | 0,44 |
| Matrix factorization | 0,07 | 0,29 | 0,36 | 0,43 |
| Hybrid | 0,24 | 0,39 | 0,37 | 0,46 |

[[figure:recommender-lab/keep-ladder|NDCG@10 pengguna cold-start ketika mereka menyimpan makin banyak interaksi. Popularity tetap datar; model personal naik.]]

Pada 5 tersimpan, ketiga model kolaboratif mencapai 0,43 sampai 0,45, dekat dengan 0,38 sampai 0,43 milik pengguna warm. Pengguna 6 menunjukkan routing-nya: dengan 3 tersimpan, Hybrid memakai content-based dan menaruh item 25 di peringkat 3 (NDCG 0,5); dengan 5 tersimpan, ia memakai matrix factorization, juga di peringkat 3. Dari 29 pengguna cold, 20 punya 5 tersimpan; 9 lainnya sejak awal punya kurang dari 5, sehingga mereka tetap memakai content-based.

> Awas: garis-garisnya bergelombang karena 29 pengguna adalah kelompok yang kecil. Perubahan 0,02 sampai 0,05 antara titik yang bersebelahan bukan sebuah temuan.

## Di luar skor
*Apa lagi yang perlu diperiksa selain NDCG?*

Kotak chart ketiga menampilkan **Cakupan dan diversitas** pada awalnya. Cakupan adalah proporsi dari 80 item yang muncul di setidaknya satu daftar pengguna yang dinilai. Popularity menunjukkan peringkat yang sama kepada semua orang, namun cakupannya 0,45, yaitu 36 dari 80 item: tiap daftar melewati apa yang sudah dilihat pengguna itu, sehingga daftarnya sedikit berbeda. Content-based mencapai 0,99, yaitu 79 dari 80 item.

Diversitas melihat ke dalam satu daftar: rata-rata 1 - cosine antara vektor genre dari setiap pasang item. Dua item dengan genre berbeda bernilai 1, dan dua item dengan genre sama bernilai 0. Daftar Popularity bernilai 0,65 dan Content-based 0,32, karena content-based mengisi daftar dengan genre favorit pengguna.

> Gagasan kunci: sebuah recommender dapat menjangkau hampir semua item di seluruh penggunanya, namun tetap memberi tiap pengguna daftar yang sempit. Di lab ini Content-based punya cakupan tertinggi dan diversitas terendah, sehingga laporkan akurasi, cakupan, dan diversitas bersama-sama, seperti di "Retrieval, ranking and cold start".

::: deeper Membaca kurva pelatihan matrix factorization
Tab **Kurva pelatihan MF** menggambar RMSE (ukuran khas galat prediksi) setelah tiap dari 10 putaran ALS, ditambah kondisi awal, pada interaksi training dan pada interaksi validasi (masing-masing dihitung bersama sel kosong dalam jumlah yang sama). Dengan 6 faktor dan lambda 2 sebagai pengaturan awal, galat training turun dari 0,71 ke 0,34 dan galat validasi dari 0,71 ke 0,41, dengan selisih 0,07. Dengan 16 faktor dan lambda 0,1 model menghafal: galat training 0,20, galat validasi 0,55, selisih 0,35, dan NDCG@10 turun dari 0,43 ke 0,28. Dengan lambda 10 model underfit: galat training tetap 0,51, galat validasi 0,56, dan NDCG@10 adalah 0,25. Penaltinya adalah penalti L2 dari ridge. Dari ketiga pengaturan ini, pengaturan awal memberi peringkat terbaik, dengan selisih yang berada di tengah.
:::

## Satu sampel
*Cukupkah satu sampel untuk menyebut pemenang?*

Tekan **Sampel baru** dan ulangi uji 30% tanpa riwayat yang disimpan. Pada sampel 2 sampai 5, kelompok kolaboratif kembali turun paling jauh: pengguna cold mereka mendapat antara 0,03 dan 0,12, sedangkan pengguna cold milik Popularity mendapat antara 0,18 dan 0,30. Pada sampel 6, jawaban Kuis Cepat berubah menjadi Content-based: NDCG@10-nya turun dari 0,41 ke 0,09. Penyebabnya, Popularity sendiri hanya mendapat 0,09 untuk 41 pengguna cold itu, sehingga semua yang berpegang padanya ikut turun.

Satu kali percobaan menjawab "apa yang terjadi pada sampel ini". Pola yang bertahan pada lima dari enam sampel itulah temuannya: model kolaboratif anjlok tanpa riwayat, dan fallback hanya sebaik popularity.

## Apa yang berlaku di data lain
*Apa yang bertahan ketika datanya berubah?*

Datanya dibangkitkan, dengan genre yang sengaja dibangun, sehingga fitur content bersifat informatif di sini. Pada layanan nyata angkanya berbeda. Lab ini tidak punya tombol data nyata, karena tabel penguin yang disertakan tidak memuat interaksi pengguna-item. Pertahankan metodenya: hapus riwayat, bandingkan pengguna warm dan cold, lalu ulangi pada sampel baru. Kebiasaan yang sama berlaku di dalam satu model: bila galat training jauh di bawah galat validasi, seperti pada matrix factorization dengan 16 faktor dan lambda 0,1 (0,20 dibanding 0,55), model telah menghafal interaksi training-nya. **Kurva pelatihan MF** di lab menunjukkan selisih itu.

::: remember
- Pengguna cold-start punya baris kosong. User k-NN, item k-NN, dan matrix factorization memberi skor yang sama untuk semua item, sehingga jatuh ke daftar sembarang, sedangkan popularity mengabaikan riwayat dan nyaris tidak bergerak.
- Content-based dan hybrid bertahan hanya dengan kembali ke popularity, dan beberapa interaksi yang disimpan (1 sampai 5) memulihkan sebagian besar kerugiannya.
- Nilai sebuah daftar dari akurasi, cakupan, dan diversitas, lalu ulangi pada sampel baru sebelum mempercayai seorang pemenang.
:::

@@lab

## Lab: Recommender dan cold start
Kamu mulai dengan 150 pengguna buatan dan 80 item buatan, tanpa riwayat yang dihapus, dan keenam recommender menyala. Kamu menghapus riwayat sebagian pengguna dan membandingkan skor tiap recommender pada mereka dengan pengguna yang masih menyimpan riwayatnya. Datanya selalu buatan: catatan di lab menyebut bahwa orang "mengklik" item dan tidak ada rating nyata yang dipakai.

### Kontrol
- **Proporsi pengguna dinilai dengan riwayat dihapus** (0 sampai 80% dengan langkah 5; awalnya 0) menentukan berapa banyak pengguna yang dinilai kehilangan riwayat. Hanya pengguna dengan interaksi yang disisihkan yang dihitung, yaitu 96 pada data awal.
- **Interaksi yang mereka simpan** (0 sampai 10; awalnya 0) adalah jumlah interaksi acak yang dipertahankan tiap pengguna cold-start.
- **Faktor MF** (1 sampai 16; awalnya 6) dan **Lambda MF (regularisasi)** (0,1 sampai 10; awalnya 2) mengatur matrix factorization. Menggeser salah satunya mengganti kotak ketiga menjadi **Kurva pelatihan MF**.
- **Recommender yang dibandingkan** adalah grup yang dapat dilipat dengan satu tombol untuk tiap recommender: **Popularity**, **User k-NN**, **Item k-NN**, **Matrix factorization**, **Content-based**, dan **Hybrid**. Semuanya awalnya menyala. Sebuah catatan di dalamnya menyebut bahwa model k-NN memakai 20 neighbor dan hybrid memercayai matrix factorization mulai 5 interaksi. Bila kamu mematikan yang terakhir, lab menampilkan "Setidaknya satu recommender harus tetap aktif."
- **Top-k (panjang daftar)** (1 sampai 20; awalnya 10) adalah panjang setiap daftar.
- **Metrik di grafik** memilih antara **Precision@10**, **Recall@10**, dan **NDCG@10**; angkanya mengikuti **Top-k (panjang daftar)**. Awalnya NDCG.
- **Pengaturan data buatan** adalah grup yang dapat dilipat: **Pengguna** (40 sampai 300; awalnya 150), **Item** (20 sampai 150; awalnya 80), **Faktor laten pada data** (1 sampai 8; awalnya 3), **Sparsity (proporsi sel kosong)** (70 sampai 96%; awalnya 90%), **Kemiringan popularitas** (0 sampai 2; awalnya 1), **Seed** (1 sampai 9999; awalnya 1), dan **Sampel baru**, yang menambah seed sebanyak 1 dan mengosongkan Kuis Cepat.
- **Pengguna yang diperiksa** adalah angka yang memilih satu pengguna. **Pengguna cold-start berikutnya** melompat ke pengguna cold-start selanjutnya, dan dinonaktifkan bila tidak ada.
- Klik satu baris heatmap, atau fokuskan lalu pakai tombol panah atas dan bawah, untuk memilih pengguna juga. Memilih pengguna mengganti kotak ketiga menjadi **Pengguna terpilih**. Ketiga tab di sana adalah **Cakupan dan diversitas**, **Kurva pelatihan MF**, dan **Pengguna terpilih**.
- **Layar penuh** memperbesar lab. **Reset** mengembalikan semua kontrol ke nilai awal, termasuk seed, dan menyalakan kembali semua recommender.
- **Kuis Cepat** memuat pertanyaan "Hapus riwayat 30 persen pengguna yang dinilai. Recommender mana yang paling terdampak?" dengan empat jawaban. Pilih satu, tekan **Periksa jawaban**, dan lab membandingkannya dengan apa yang ditunjukkan slider sekarang. Pada 0%, lab meminta kamu mengatur proporsi ke 30% dan **Interaksi yang mereka simpan** ke 0 lebih dulu.

### Membaca layar
- Heatmap punya satu baris per pengguna dan satu kolom per item. Sel terisi adalah **Terlihat (dapat dipakai model)**, sel dengan garis tepi adalah **Disisihkan (untuk diprediksi)**, sel pudar adalah **Riwayat dihapus**, dan tanda di kiri baris adalah **Pengguna cold-start (tanda di kiri)**. Bingkai di sekeliling satu baris menandai pengguna terpilih.
- Status line berbunyi "150 pengguna kali 80 item, 9,1% sel terlihat. Belum ada pengguna yang kehilangan riwayat." Setelah penghapusan, ia menambahkan, misalnya, "29 pengguna cold-start kehilangan seluruh riwayat; 327 interaksi dihapus." Bila sebagian riwayat disimpan, ia berbunyi "menyimpan hingga 3 interaksi masing-masing". Baris detail berbunyi "Dinilai pada 96 pengguna yang punya interaksi disisihkan (67 warm, 29 cold)".
- Chart pertama berjudul **NDCG@10: pengguna warm dan cold** (mengikuti metrik dan k). Tiap recommender punya batang penuh untuk pengguna warm dan batang pucat bergaris tepi untuk pengguna cold. Legendanya memberi jumlahnya, seperti "Pengguna warm (67)" dan "Pengguna cold-start (29)", atau "Pengguna cold-start (0): naikkan slider proporsi".
- Chart kedua, **NDCG@10 menurut panjang riwayat**, punya satu garis per recommender. Sumbu x-nya adalah **Interaksi yang diketahui model**, dalam kelompok 0, 1-2, 3-5, 6-10, dan 11+, dengan jumlah pengguna di bawah tiap kelompok. Beberapa kelompok hanya berisi 11 sampai 21 pengguna, sehingga hasilnya berisik.
- Kotak ketiga mulai dari **Cakupan dan diversitas**. Legendanya berbunyi "Cakupan: proporsi item yang direkomendasikan ke siapa pun" dan "Diversitas: ragam genre dalam satu daftar". **Kurva pelatihan MF** menggambar "Galat training" dan "Galat validasi" terhadap "Putaran ALS (epoch)", dan legendanya memberi jumlah faktor dan lambda.
- **Pengguna terpilih** menampilkan "Pengguna 6: cold start." dengan "0 dari 22 interaksi disimpan.", lalu baris **Riwayat yang dilihat model**, **Riwayat yang dihapus**, dan **Disukai berikutnya (disisihkan)**. Di bawahnya, "Top 10 dari tiap recommender (centang berarti pengguna benar-benar menyukainya)" memberi satu baris per recommender. Baris bertanda "skor sama" tampak pudar dengan kotak putus-putus, dan baris Hybrid menyebut model yang dipakainya, seperti "memakai Popularity".

### Eksperimen
Tekan **Reset** sebelum tiap eksperimen. Angkanya untuk sampel awal (seed 1).

1. **Baseline warm.** Prediksikan: tanpa riwayat yang dihapus, seberapa jauh Popularity tertinggal dari yang lain pada NDCG@10, dan apakah recommender yang paling akurat juga mencakup item paling banyak? Baca chart pertama: Popularity 0,26, User k-NN 0,45, Item k-NN 0,43, Matrix factorization 0,43, Content-based 0,45, dan Hybrid 0,46. Lalu baca kotak **Cakupan dan diversitas**: Popularity mencakup 0,45 dari item dan Content-based 0,99, sedangkan diversitasnya 0,65 dibanding 0,32. Jadi jawaban prediksi kedua adalah tidak: Hybrid paling akurat, tetapi Content-based mencakup item paling banyak. Jelaskan mengapa daftar yang sesuai dengan selera pengguna kurang beragam.
2. **Hapus 30 persen.** Prediksikan: di **Kuis Cepat**, pilih recommender mana yang paling terdampak. Lalu atur **Proporsi pengguna dinilai dengan riwayat dihapus** ke 30%, pastikan **Interaksi yang mereka simpan** bernilai 0, dan tekan **Periksa jawaban**. Hasilnya menyebut Matrix factorization dengan penurunan 0,01, 0,32, 0,33, 0,35, 0,23, dan 0,21. Tekan **Pengguna cold-start berikutnya**: itu pengguna 6, dengan 0 dari 22 interaksi disimpan. Popularity, Content-based, dan Hybrid menampilkan daftar yang sama dengan centang pada item 25 di peringkat 7; ketiga baris kolaboratif berbunyi "skor sama" dan dimulai dari 0, 1, 2. Jelaskan mengapa Content-based dan Hybrid sama dengan Popularity di sini.
3. **Berapa interaksi?** Prediksikan: berapa interaksi yang disimpan sebelum pengguna cold tampak seperti pengguna warm? Atur proporsi ke 30% lebih dulu, lalu naikkan **Interaksi yang mereka simpan** ke 1, 3, dan 5 dan baca batang cold: User k-NN 0,35, 0,42, dan 0,44, Matrix factorization 0,29, 0,36, dan 0,43, Popularity datar di sekitar 0,24. Tekan **Pengguna cold-start berikutnya** sekali dulu, yang memilih pengguna 6, lalu ubah slider: pada 3 baris Hybrid berbunyi "memakai Content-based", pada 5 berbunyi "memakai Matrix factorization". Jelaskan mengapa satu interaksi paling membantu.
4. **Top-k dan metrik.** Prediksikan: bila Recall@10 milik Hybrid adalah 0,78, berapa Precision@10-nya? Atur **Metrik di grafik** ke Recall@10 lalu Precision@10: 0,78 dan 0,08. Sekarang atur **Top-k (panjang daftar)** ke 1: ketiga metrik sama untuk tiap recommender (Popularity 0,10, User k-NN 0,24, Content-based 0,23). Pada 20, Recall@20 adalah 0,69 untuk Popularity dan 0,91 untuk Hybrid. Jelaskan mengapa precision tetap kecil sementara recall naik bersama k.
5. **Pengaturan matrix factorization.** Prediksikan: apakah lebih banyak faktor dan penalti yang lebih lemah membantu? Atur **Faktor MF** ke 16 dan **Lambda MF (regularisasi)** ke 0,1. Kotak berganti ke **Kurva pelatihan MF**: galat training berakhir di 0,20 dan galat validasi di 0,55, dan chart pertama menunjukkan Matrix factorization di 0,28 dan bukan 0,43. Naikkan lambda ke 10: kedua kurva berakhir di 0,51 dan 0,56, dan NDCG@10 adalah 0,25. Dari ketiga pengaturan itu, mana yang punya selisih terkecil, dan mana yang peringkatnya terbaik?
6. **Sampel baru.** Prediksikan: apakah eksperimen 2 berlaku pada sampel lain? Atur proporsi ke 30% dan tekan **Sampel baru** lima kali, memilih jawaban Kuis Cepat dan menekan **Periksa jawaban** setiap kali. Pada sampel 2 sampai 5 jawabannya adalah "Yang kolaboratif", dengan NDCG@10 cold sebesar 0,05, 0,12, 0,08, dan 0,03. Pada sampel 6 jawabannya Content-based, turun dari 0,41 ke 0,09, karena Popularity hanya mendapat 0,09 untuk 41 pengguna cold itu. Lalu tekan **Reset**, atur proporsi ke 30% dan geser **Kemiringan popularitas** ke 0 dan ke 2: NDCG@10 cold milik Popularity adalah 0,23 dan 0,47. Lab ini tidak punya tombol data nyata, sehingga sampel baru dan kemiringan itulah uji transfermu. Apakah gagasannya bertahan, dan pada apa ia bergantung?
