---
slug: clusters-vs-labels
title: Cluster versus label
---
::: intro
- Jelaskan mengapa cluster bukan kelas, dan mengapa nomor cluster 1, 2, 3 hanyalah nama.
- Baca crosstab antara cluster dan kelas sebenarnya, lalu hitung purity darinya.
- Gunakan adjusted Rand index untuk menilai kecocokan, dan tentukan apakah kecocokan yang buruk berasal dari metode, feature, atau kelasnya.

Sebelum mulai: baca "Apa itu clustering", "Posisi awal dan memilih k", dan "k-means, langkah demi langkah". Lab "k-means, lalu ungkap labelnya" memakai ketiganya, dan lab itu dibuka pada 48 titik yang sama dengan lab k-NN.
:::

## Kelas diberikan, cluster ditemukan
*Apa bedanya label dengan cluster?*

Pada lab k-NN, setiap titik sudah memiliki kelas, A atau B, dan k-NN memakai kelas itu untuk voting. Itulah supervised learning: label berfungsi sebagai kunci jawaban.

k-means tidak pernah melihat label. Ia hanya menerima posisi titik, lalu mengembalikan kelompok yang ia temukan semata-mata dari jarak. Kelompok semacam itu disebut **cluster**. Adapun **kelas** adalah nama yang sudah diberikan seseorang pada data sebelumnya, misalnya spesies seekor penguin.

Jadi cluster dan kelas adalah dua hal yang berbeda. Keduanya bisa sejalan, tetapi tidak ada yang memaksa keduanya sejalan. Lab "k-means, lalu ungkap labelnya" memungkinkan kamu menguji seberapa sejalan keduanya. Lab menyembunyikan kelas, menjalankan k-means, dan baru setelah itu menggambar kelas sebenarnya dari tiap titik sebagai garis tepi di sekelilingnya.

[[figure:clusters-vs-labels/hide-and-reveal|The same 48 points three times: with their classes, with the classes hidden, and after k-means with the classes revealed. Fill is the cluster, outline is the true class.]]

> Gagasan kunci: label tidak pernah dipakai untuk membentuk cluster. Label dipakai sesudahnya, hanya untuk menilai cluster itu.

## Crosstab
*Bagaimana cara membandingkan cluster dengan kelas?*

Hitung, untuk setiap cluster, berapa titik dari tiap kelas yang ada di dalamnya. Hasilnya adalah **crosstab**: satu baris untuk tiap cluster, satu kolom untuk tiap kelas, dan di setiap sel tertulis jumlah titik yang termasuk keduanya.

Pada dataset pertama di lab dengan k = 2, crosstab-nya seperti di bawah. Cluster 1 berisi 6 titik kelas A dan 20 titik kelas B. Cluster 2 berisi 18 titik kelas A dan 4 titik kelas B.

[[figure:clusters-vs-labels/crosstab|The crosstab for k = 2 on Overlapping clusters, and the purity it gives. The largest cell of each row is shaded.]]

> Contoh hitungan: sel terbesar di tiap baris adalah kelas mayoritas cluster itu: 20 di Cluster 1 dan 18 di Cluster 2. Jumlahkan: 20 + 18 = 38 titik berada di kelas mayoritas clusternya. Dari 48 titik, **purity** = 38 / 48 = 79,2%.

Purity menjawab satu pertanyaan sederhana: kalau tiap cluster kamu beri nama sesuai kelas utamanya, berapa porsi titik yang memakai nama yang benar? Lab menampilkannya, bersama tabelnya, di bawah plot.

## Nomor cluster hanyalah nama
*Mengapa Cluster 1 bisa didominasi kelas B?*

Pada crosstab tadi, Cluster 1 didominasi kelas B. Tidak ada aturan dalam k-means yang mengharuskan cluster 1 sejalan dengan kelas A. Nomor itu hanya membedakan satu cluster dari yang lain, dan nilainya bergantung pada titik awal.

Di lab, ubah **Inisialisasi** menjadi **Titik acak**. Prosesnya kini butuh 5 pembaruan, bukan 4, dan baris tabelnya bertukar: Cluster 1 sekarang berisi 18 titik kelas A dan 4 titik kelas B. Pengelompokannya sama, hanya namanya yang saling tertukar, dan Inertia tetap 110,76 pada kedua run. Purity juga tetap 79,2%.

Karena itu, nomor cluster tidak pernah dibandingkan dengan nama kelas. Yang dibandingkan adalah kelompoknya, dan crosstab melakukan hal itu: kecocokan yang sempurna menampilkan satu sel besar di setiap baris dan setiap kolom, di mana pun sel itu berada.

> Awas: kalau "Cluster 1 = kelas A" terlihat salah, periksa barisnya lebih dulu. Pasangan yang cocok bisa berada di baris yang berbeda dari dugaanmu.

## Purity bisa terlalu mudah
*Apa yang luput dari purity ketika k membesar?*

Purity punya jebakan. Jika setiap titik dijadikan clusternya sendiri, setiap cluster pasti murni, sehingga purity menjadi 100%, padahal tidak ada yang dipelajari. Purity cenderung naik seiring clusternya mengecil.

Lab menunjukkan versi kecil dari gejala ini. Pada Cluster tumpang tindih, beralih dari k = 2 ke k = 4 menaikkan purity dari 79,2% menjadi 83,3%, padahal k-means tidak menemukan kelasnya dengan lebih baik. Pada Papan catur dengan k = 4, purity 100%: masing-masing dari keempat cluster hanya berisi satu kelas. Namun, setiap kelas tersebar di dua cluster.

[[figure:clusters-vs-labels/purity-vs-ari|Purity and the adjusted Rand index for k = 1 to 8 on two datasets. Purity climbs or stays high as k grows; the adjusted Rand index peaks and then falls.]]

Purity juga punya batas bawah: dengan k = 1 nilainya adalah porsi kelas terbesar, yaitu 50% pada dua kelas yang sama besar, dan 44,2% pada penguin (151 Adelie dari 342). Pada dua kelas yang sama besar, purity 60% hanya sedikit lebih baik daripada batas bawah itu.

## Adjusted Rand index, secara ringkas
*Apa yang ditambahkan oleh skor kedua?*

**Adjusted Rand index** (ARI) membandingkan cluster dan kelas pasangan demi pasangan. Ambil dua titik mana saja. Apakah cluster menempatkan keduanya bersama? Apakah kelas menempatkan keduanya bersama? Indeks ini menilai seberapa sering kedua jawaban itu sama, lalu mengurangkan kesamaan yang akan kamu dapatkan secara kebetulan.

- **1** berarti cluster dan kelas cocok persis.
- **Sekitar 0** berarti kecocokannya tidak lebih baik daripada label acak.
- **Di bawah 0** berarti lebih buruk daripada acak. Nilai sedikit di bawah 0, seperti −0,02 pada cincin, hanyalah kebetulan.

Jika satu kelas terbelah ke dua cluster, skornya turun, karena pasangan titik dari kelas itu terpisah. Itulah sebabnya Papan catur dengan k = 4 punya purity 100% tetapi ARI 0,48. Lab menyebut ARI 0,7 atau lebih sebagai kecocokan yang baik dan di bawah 0,3 sebagai cluster yang memotong lintas kelas: patokan, bukan hukum.

::: deeper Menghitung pasangan
Ke-48 titik membentuk 48 × 47 / 2 = 1.128 pasangan. Pada crosstab 6, 20, 18, dan 4, pasangan di dalam satu sel berjumlah 15 + 190 + 153 + 6 = 364. Pasangan dalam cluster yang sama: 325 + 231 = 556. Pasangan dalam kelas yang sama: 276 + 276 = 552. Secara kebetulan, kamu akan mengharapkan 556 × 552 / 1.128 = 272,09 pasangan yang bersama di keduanya. Indeksnya adalah (364 − 272,09) / (554 − 272,09) = 0,326, dengan 554 sebagai rata-rata dari 556 dan 552. Itulah 0,33 yang ditampilkan lab.
:::

## Ketika cluster dan kelas tidak sejalan
*Apakah kecocokan yang buruk selalu berarti k-means gagal?*

Kadang kesalahannya ada pada metode. Pada Cincin konsentris dengan k = 2, lab menunjukkan purity 52,1% dan ARI −0,02: setiap cluster mengambil sekitar separuh dari tiap cincin. Batas di antara dua centroid berupa garis lurus, dan tidak ada garis lurus yang dapat memisahkan sebuah cincin dari cincin di dalamnya. Menaikkan k tidak membantu: k = 4 memberi purity 54,2%.

Kadang kesalahannya ada pada feature atau skalanya, seperti yang akan terlihat pada penguin. Dan kadang tidak ada yang salah: kelas hanyalah salah satu cara seseorang membagi data, dan feature-nya mungkin tidak memisahkan data menurut kelas itu. k-means menemukan kelompok yang ditunjukkan oleh jarak, dan kelompok itu bisa nyata walaupun bukan kelas yang kamu maksud.

Dalam pekerjaan nyata biasanya kamu tidak punya label, dan itulah alasan kamu melakukan clustering. Pengungkapan label ini adalah alat bantu belajar untuk mengetahui seberapa jauh hasil clustering bisa dipercaya.

> Gagasan kunci: skor yang rendah tidak menunjukkan bagian mana yang gagal. Periksa plot, feature, dan skalanya sebelum menyalahkan algoritmanya.

## Penguin asli: tiga spesies, tiga cluster
*Dapatkah k-means menemukan spesies yang tidak pernah disebutkan kepadanya?*

Data nyata di lab adalah 342 penguin, masing-masing dengan panjang paruh dan panjang sirip. Spesiesnya adalah kelas yang disembunyikan. Dengan kedua feature distandardisasi dan k = 3, crosstab-nya begini: Cluster 1 berisi 146 Adelie, 5 Chinstrap, dan tidak ada Gentoo; Cluster 2 berisi 1, 4, dan 122; Cluster 3 berisi 4, 59, dan 1. Purity-nya (146 + 122 + 59) / 342 = 327 / 342 = 95,6%, dan ARI-nya 0,89.

[[figure:clusters-vs-labels/penguins|The 342 penguins clustered with k = 3, with and without standardizing. Without it, flipper length dominates the distances and Adelie and Chinstrap mix.]]

## Mengapa skala penting
*Mengapa cluster tanpa standardisasi mencampur dua spesies?*

Matikan standardisasi, dan gambarnya berubah: purity 83,9% dan ARI 0,64. Panjang sirip memiliki simpangan baku 14,0 mm pada seluruh penguin, sedangkan panjang paruh hanya 5,5 mm. Simpangan baku adalah jarak khas seekor penguin dari rata-rata, sehingga panjang sirip mendominasi jarak. Adelie dan Chinstrap terutama berbeda pada panjang paruh (rata-rata 38,8 berbanding 48,8 mm), bukan pada panjang sirip (190,0 berbanding 195,8 mm), itulah sebabnya cluster tanpa standardisasi mencampur keduanya.

::: deeper Awal yang buruk bukan berarti kecocokan spesies yang buruk
Dengan Inisialisasi diatur ke Titik acak dan standardisasi menyala, seed 1 sampai 7 semuanya berakhir pada Inertia 157,82 dan ARI 0,89. Seed 8 berhenti pada Inertia 206,06 dan ARI 0,57: Gentoo terbelah ke dua cluster. Label tidak diperlukan untuk mengenali run yang lebih buruk, karena Inertia-nya lebih tinggi pada data dan k yang sama.
:::

::: remember
- Cluster ditemukan dari posisi, sedangkan kelas diberikan oleh manusia. Keduanya bisa sejalan, tetapi tidak ada yang memaksanya.
- Crosstab membandingkan keduanya: purity adalah porsi titik yang berada di kelas mayoritas clusternya, dan adjusted Rand index adalah skor berbasis pasangan dengan 1 sebagai kecocokan sempurna dan sekitar 0 sebagai kebetulan.
- Purity naik seiring k. Periksa juga ARI, dan ketika kecocokannya buruk, lihat bentuk data, skala, dan titik awal sebelum menyalahkan k-means.
:::

@@lab

## Lab: k-means, lalu ungkap labelnya
Lab dibuka pada 48 titik yang sama dengan lab k-NN, dengan kelas A dan B disembunyikan dan k = 2. Kamu menjalankan k-means, lalu menampilkan kelasnya dan membandingkannya dengan cluster. Di bawah plot ada crosstab dan grafik elbow.

### Kontrol
- **Data** berpindah antara **Data buatan** dan **Penguin (data nyata)**. Pada data nyata, **Jumlah cluster k** dimulai dari 3 dan label disembunyikan lagi. Jika file penguin tidak bisa dimuat, lab menyampaikannya dan menampilkan data buatan.
- **Dataset** (hanya pada data buatan) memilih **Cluster tumpang tindih** (awal), **Cincin konsentris**, atau **Papan catur**.
- **Jumlah cluster k** adalah slider dari 1 sampai 8. Nilai awalnya 2 pada data buatan dan 3 pada penguin.
- **Inisialisasi** memilih **k-means++** (awal) atau **Titik acak**.
- **Seed** adalah angka dari 1 sampai 999 (awalnya 1). Seed yang sama selalu memberi titik awal yang sama.
- **Standardisasi kedua feature dulu** (hanya penguin, awalnya menyala) menyamakan skala panjang paruh dan panjang sirip sebelum k-means berjalan. Plot tetap dalam milimeter.
- **Jalankan** dan **Langkah berikutnya** di atas plot memainkan atau menjalankan k-means selangkah demi selangkah supaya kamu bisa melihatnya bergerak, dan **Langkah sebelumnya** kembali satu langkah. **Kecepatan** mengatur seberapa cepat **Jalankan** memutar.
- **Jalankan k-means** langsung menuju akhir proses.
- **Tampilkan label** menggambar kelas sebenarnya dari tiap titik sebagai garis tepi, dan berubah menjadi **Sembunyikan label lagi**. Berpindah **Data** menyembunyikan label lagi.
- **Reset** mengembalikan lab ke data buatan dan pengaturan awal. **Layar penuh** memperbesar lab.
- **Kuis Cepat** adalah tombol di bawah kartu pengaturan (tombol bulat di kanan bawah pada ponsel). Tombol ini menanyakan apakah k-means akan menemukan kembali kelasnya (dengan k = 2, atau k = 3 pada penguin). Pilih jawaban lebih dulu, lalu atur k tersebut, jalankan k-means sampai akhir, dan tampilkan label; setelah itu kotak itu menjawab dengan adjusted Rand index dan purity.

### Membaca layar
- Plot mula-mula menampilkan titik sebagai bulatan abu-abu (**Titik (label tersembunyi)**). Setelah k-means berjalan, warna isian menunjukkan **Cluster 1**, **Cluster 2**, dan seterusnya, dengan berlian untuk tiap **Centroid** dan jejak putus-putus yang menunjukkan perpindahannya. Setelah **Tampilkan label**, garis tepi tiap titik menunjukkan kelasnya: **Kelas A (garis tepi)** dan **Kelas B (garis tepi)**, atau **Adelie (garis tepi)**, **Chinstrap (garis tepi)**, dan **Gentoo (garis tepi)**.
- Baris status menyatakan sejauh mana k-means berjalan: "Langkah N dari M ... Inertia X" selama berjalan, lalu "Selesai setelah N pembaruan: tidak ada titik yang pindah cluster." Di sebelah kanan ada jumlah titik dan k.
- Setelah label ditampilkan dan k-means sudah berjalan, baris di bawahnya memberi penilaian, lengkap dengan purity dan adjusted Rand index: "Cluster ini sesuai dengan kelasnya", "hanya sebagian sesuai", atau "Cluster ini memotong lintas kelas". Dengan k = 1, lab mengatakan tidak ada yang bisa dicocokkan.
- Kartu **Cluster menurut kelas sebenarnya** adalah crosstab: satu baris untuk tiap cluster, satu kolom untuk tiap kelas, baris dan kolom **Total**, dan sel terbesar di tiap baris dicetak tebal.
- Kartu **Inertia terhadap k (grafik elbow)** menggambar **Terbaik dari 5 run** untuk k = 1 sampai 8, dengan garis putus-putus pada k saat ini dan sebuah titik untuk **Run ini**.

### Eksperimen
Semua angka berlaku untuk pengaturan awal (**Seed** 1). Dengan **Jalankan k-means**, proses berjalan sampai akhir, jadi angka di bawah adalah angka akhir.

1. **Sembunyikan, jalankan, ungkap.** Prediksikan: dengan k = 2 pada **Cluster tumpang tindih**, apakah k-means akan menemukan kembali kedua kelas? Pilih jawaban di kotak **Kuis Cepat**. Tekan **Jalankan k-means**, lalu **Tampilkan label**. Lab menyatakan "Cluster ini hanya sebagian sesuai dengan kelasnya": Purity 79,2%, adjusted Rand index 0,33, Inertia 110,76. Di tabel, Cluster 1 berisi 6 titik kelas A dan 20 titik kelas B, sedangkan Cluster 2 berisi 18 dan 4. Sekarang ubah **Inisialisasi** menjadi **Titik acak** dan jalankan lagi: barisnya bertukar tetapi skornya tidak bergerak. Apa artinya itu bagi nomor cluster? Lalu kembalikan **Inisialisasi** ke **k-means++** (atau tekan **Reset**) sebelum eksperimen berikutnya.
2. **Lebih banyak cluster.** Prediksikan: jika kamu menaikkan **Jumlah cluster k** dari 2 ke 4, apakah purity naik atau turun, dan apakah kecocokannya membaik? Jalankan dan ungkap pada tiap nilai. Purity bergerak 79,2%, 81,3%, 83,3%, dan adjusted Rand index bergerak 0,33, 0,29, 0,21. Inertia dan purity membaik, kecocokannya tidak. Skor mana yang sebaiknya kamu percaya ketika mengubah k, dan mengapa?
3. **Papan catur.** Prediksikan: berapa purity dan penilaiannya dengan k = 4 pada **Papan catur**? Coba k = 2 dulu: Purity 62,5%, ARI 0,04, "memotong lintas kelas". Lalu k = 4: Purity 100,0%, ARI 0,48, dan penilaiannya "hanya sebagian". Tabelnya memiliki empat baris, masing-masing berisi 12 titik dari satu kelas dan tidak ada dari kelas lain. Mengapa kecocokannya tidak "baik" padahal setiap cluster murni?
4. **Cincin.** Prediksikan: dapatkah lebih banyak cluster memisahkan dua cincin? Pilih **Cincin konsentris** dan k = 2: Purity 52,1%, ARI −0,02, dengan 11 dan 12 titik dari tiap kelas di Cluster 1 serta 13 dan 12 di Cluster 2. Naikkan k ke 4: Purity 54,2%, ARI −0,03. Mengapa menambah cluster tidak membantu?
5. **Penguin, dengan dan tanpa standardisasi.** Prediksikan: dengan k = 3, apakah k-means akan menemukan ketiga spesies? Ubah **Data** menjadi **Penguin (data nyata)**. Di bawah pilihan data, lab menyebutkan bahwa 342 dari 344 penguin punya kedua pengukuran dan 2 baris dengan missing value (NA) dibuang. Tekan **Jalankan k-means** dan **Tampilkan label**: Purity 95,6%, ARI 0,89, dan baris 146, 5, 0; 1, 4, 122; 4, 59, 1. Sekarang matikan **Standardisasi kedua feature dulu** dan jalankan lagi: Purity 83,9%, ARI 0,64, dan Cluster 1 berisi 38 Adelie dan 54 Chinstrap. Feature mana yang mendominasi jarak, dan spesies mana yang tercampur?
6. **Seed baru.** Prediksikan: apakah seed yang berbeda mengubah hasil pada penguin? Nyalakan lagi standardisasi, atur **Inisialisasi** ke **Titik acak**, lalu coba **Seed** 1 sampai 7, dengan menjalankan dan mengungkap label tiap kali: semuanya berakhir pada Inertia 157,82 dan ARI 0,89. Lalu coba **Seed** 8: Inertia 206,06, Purity 78,7%, ARI 0,57. Run mana yang akan kamu simpan jika tidak punya label, dan mengapa? Periksa gagasan itu sekali lagi dengan standardisasi mati dan **Seed** 1 sampai 4: ARI-nya 0,64, 0,64, 0,54, dan 0,53, tidak pernah mendekati 0,89. Mana yang lebih berpengaruh di sini, seed atau skalanya?
