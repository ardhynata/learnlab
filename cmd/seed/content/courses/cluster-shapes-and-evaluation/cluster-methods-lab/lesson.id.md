---
slug: cluster-methods-lab
title: Lab perbandingan metode cluster
---
::: intro
- Membandingkan k-means, DBSCAN, dan hierarchical clustering pada gumpalan bulat, cincin, dan cluster dengan kepadatan yang berbeda, lalu menyebutkan di mana masing-masing metode kesulitan.
- Memprediksi apa yang akan dilakukan tiap metode pada sebuah dataset sebelum kamu membaca hasilnya, lalu membaca skor silhouette dan kecocokannya dengan kelompok sebenarnya.
- Menjelaskan mengapa skor silhouette yang tinggi belum membuktikan bahwa sebuah clustering benar, lalu menguji gagasan itu pada penguin nyata dengan sampel baru.

Sebelum mulai: baca "k-means, langkah demi langkah", "Hierarchical clustering", "Skor silhouette", "DBSCAN dan kepadatan", dan "Cluster versus label".
:::

## Pertanyaan dalam lab ini
*Apa yang terjadi kalau tiga metode clustering diberi titik yang sama?*

Kamu sudah mengenal tiga cara untuk mengelompokkan data. k-means mencari pusat, hierarchical clustering menggabungkan kelompok terdekat menjadi sebuah pohon, dan DBSCAN memperluas cluster melalui tempat-tempat yang ramai. Setiap pelajaran menampilkan satu metode pada datanya sendiri. Lab perbandingan metode cluster memberi ketiganya titik yang sama sekaligus, sehingga kamu dapat melihat di mana masing-masing berhasil dan di mana ia gagal.

Lab dimulai dengan 150 titik buatan. Titik-titik itu berasal dari generator acak dengan angka awal yang tetap (disebut seed), jadi semua orang melihat titik yang sama. Ada tiga bentuk yang akan kamu temui: gumpalan bulat, dua cincin, dan dua cluster dengan kepadatan berbeda, satu rapat dan satu renggang. Setiap dataset juga punya **kelompok sebenarnya**, yaitu bentuk yang digambar oleh generatornya. Proyek nyata tidak punya kunci jawaban seperti itu, karena itu lab ini juga bertanya seberapa jauh sebuah skor dapat dipercaya tanpanya.

## Tiga metode, satu set titik
*Apa yang ditampilkan lab untuk setiap metode?*

Setiap metode mendapat panelnya sendiri dengan empat angka yang sama: berapa cluster yang ditemukan, berapa titik yang dianggap noise, skor silhouette-nya, dan kecocokannya dengan kelompok sebenarnya. Hanya DBSCAN yang dapat menyebut sebuah titik sebagai noise. k-means dan hierarchical clustering memasukkan setiap titik ke suatu cluster.

Tiap metode juga punya pengaturan. k-means membutuhkan k. DBSCAN membutuhkan radius dan jumlah titik minimum, yang di lab ditulis sebagai eps dan minPts. Hierarchical clustering membutuhkan linkage dan tempat untuk memotong pohonnya. Pengaturan awalnya masuk akal: k dan titik potong sama dengan jumlah kelompok sebenarnya, minPts bernilai 5, dan eps bernilai 0,80, atau 1,10 pada cincin.

[[figure:cluster-methods-lab/shapes-grid|Tiga metode pada tiga dataset dengan pengaturan awal lab. Di bawah tiap panel: cluster dan noise, skor silhouette, dan kecocokan dengan kelompok sebenarnya.]]

## Dua skor, dua pertanyaan
*Apa yang diukur setiap skor, dan apa yang tidak diukurnya?*

**Skor silhouette**, dari "Skor silhouette", hanya memakai titik-titik dan label cluster-nya. Nilai yang tinggi berarti setiap titik dekat dengan clusternya sendiri dan jauh dari cluster berikutnya. Skor ini tidak pernah melihat kelompok sebenarnya. Lab tidak menyertakan titik noise DBSCAN dalam perhitungannya, dan bila clusternya kurang dari dua, skor tidak ada: lab menampilkan tanda strip dan menjelaskan alasannya.

**Kecocokan dengan kelompok sebenarnya** adalah adjusted Rand index dari "Cluster versus label". Nilainya 1 bila cluster sama persis dengan kelompok sebenarnya, sekitar 0 bila tidak lebih baik daripada label acak, dan sedikit di bawah 0 untuk metode yang lebih buruk daripada kebetulan. Lab menghitung noise sebagai satu kelompok tambahan. Lab ini dapat menghitungnya karena generator data mengetahui jawabannya.

> Gagasan kunci: silhouette bertanya apakah cluster-nya padat dan saling terpisah. Kecocokan bertanya apakah cluster itu adalah kelompok yang memang ada. Keduanya pertanyaan yang berbeda, dan lab ini membahas jarak di antara keduanya.

## Gumpalan bulat: kasus yang mudah
*Apakah ketiga metode sepakat bila kelompoknya bulat dan berjauhan?*

Ya, mereka sepakat. Pada **Tiga gumpalan** setiap metode menemukan 3 cluster. k-means mendapat silhouette 0,80 dan kecocokan 1,00, dan hierarchical clustering dengan Ward mendapat angka yang sama. DBSCAN mendapat 0,81 dan 0,98. Ia menyisihkan 2 titik sebagai noise, dan silhouette tidak menghitung titik itu, itulah sebabnya skornya sedikit lebih tinggi sementara kecocokannya sedikit lebih rendah.

Di sini silhouette juga menjalankan tugasnya yang lain, yaitu memilih k. Dengan k-means pada gumpalan yang sama, k = 2 mendapat 0,56, k = 3 mendapat 0,80, k = 4 mendapat 0,66, dan k = 5 mendapat 0,50. Puncaknya berada pada jumlah kelompok sebenarnya, sama seperti pada pelajaran silhouette.

## Dua cincin: ketika pusat tidak berguna
*Mengapa k-means dan Ward memotong lurus melewati cincin?*

Kedua cincin memiliki satu pusat yang sama. k-means menaruh dua centroid-nya di kedua sisi pusat itu, dan batas antara clusternya berupa garis lurus, sehingga setiap cincin terpotong menjadi dua: silhouette 0,36, kecocokan -0,01, yaitu tingkat kebetulan. Ward membentuk kelompok yang padat dan memotong dengan cara yang sama: 0,35 dan 0,01. DBSCAN mengikuti tiap cincin yang rapat pada eps 1,10: silhouette 0,01, kecocokan 1,00.

Linkage berpengaruh. Linkage **Single** merayap sepanjang setiap cincin dari satu pasangan terdekat ke pasangan berikutnya, dan juga mencapai kecocokan 1,00. Linkage **Average** memotong melintang, dengan -0,02.

[[figure:cluster-methods-lab/score-vs-match|Pada dua cincin, skor silhouette dan kecocokan dengan cincin sebenarnya untuk empat hasil. Metode yang memisahkan cincin justru mendapat silhouette terendah; mengecilkan eps menjadi 0,30 memberi silhouette tertinggi dan pengelompokan yang salah.]]

> Awas: satu-satunya metode yang memisahkan cincin memiliki silhouette terendah, 0,01. Dua metode yang memotong cincin mendapat yang tertinggi, 0,36 dan 0,35. Pada pengelompokan yang benar, masing-masing dari 103 titik cincin luar rata-rata lebih dekat ke cincin dalam daripada ke teman satu cincinnya, sehingga silhouette-nya di bawah 0. Skor ini dirancang untuk cluster yang bulat.

## Kepadatan tak seimbang: ketika satu radius dan satu pasangan terdekat gagal
*Apa yang salah bila cluster rapat berdampingan dengan cluster renggang?*

**Kepadatan tak seimbang** memiliki satu cluster rapat, satu cluster renggang, dan sebaran 15 titik noise. Pada pengaturan awal persaingannya seimbang: k-means mendapat 0,68 dan 0,81, DBSCAN 0,74 dan 0,85 dengan 14 titik noise, dan Ward 0,67 dan 0,81. DBSCAN unggul karena dapat menyisihkan sebaran itu, sedangkan k-means dan Ward harus menempatkan setiap titik di suatu cluster.

Titik lemahnya tampak ketika kamu mengubah satu pengaturan. DBSCAN hanya punya satu radius untuk kedua cluster. Pada eps 0,50 radius itu terlalu kecil bagi cluster yang renggang: 38 titik menjadi noise dan kecocokannya turun ke 0,61. Pada eps 0,30 ada 68 titik noise dan kecocokannya 0,71. Hierarchical clustering dengan linkage **Single** dan k = 2 berbuat lain: ia hanya memisahkan satu titik terpencil, menyisakan satu cluster berisi 149 titik dan satu cluster berisi 1 titik, dengan kecocokan 0,01. Linkage Single merayap melewati apa pun yang terdekat.

## Silhouette yang tinggi bukan bukti
*Dapatkah sebuah clustering mendapat skor bagus tetapi tetap salah?*

Dapat, dan lab ini membuatnya mudah dilihat. Kembali ke dua cincin lalu kecilkan eps menjadi 0,30. DBSCAN kini menemukan 5 cluster dan menandai 125 dari 150 titik sebagai noise. Silhouette-nya 0,86, yang tertinggi di layar, dan kecocokannya dengan cincin sebenarnya hanya 0,05.

> Contoh hitungan: 150 titik - 125 titik noise = 25 titik. Angka 0,86 adalah rata-rata dari 25 titik itu saja, yaitu 25 / 150, sekitar seperenam dari data. Titik-titik itu berada dalam busur yang rapat, sehingga skornya tinggi. Ke-125 titik lainnya tidak dihitung.

Sebuah skor dapat membuat clustering tampak lebih baik daripada kenyataannya dengan tiga cara. Ia mengabaikan noise, seperti di atas. Ia menyukai cluster yang bulat, seperti pada cincin. Dan ia tidak pernah melihat kebenaran: pada Kepadatan tak seimbang dengan eps 0,30, silhouette DBSCAN sebesar 0,84 mengalahkan k-means (0,68) dan Ward (0,67), tetapi kecocokannya yang 0,71 lebih rendah daripada 0,81 milik keduanya.

> Gagasan kunci: silhouette yang tinggi berarti cluster-nya padat dan terpisah. Itu tidak berarti cluster-nya benar. Lihat gambarnya, hitung titik noise, dan tanyakan apakah kelompok itu bermakna untuk masalahmu.

## Penguin nyata
*Apakah ceritanya sama pada pengukuran nyata?*

Atur **Sumber data** ke **Penguin (data nyata)**. Lab memplot panjang paruh terhadap panjang sirip untuk 150 dari 342 penguin yang memiliki kedua angka itu, masing-masing diskalakan ke rentang 0 sampai 10. Kelompok sebenarnya adalah tiga spesies, dan tidak ada metode yang melihatnya. Pada pengaturan awal k-means mendapat silhouette 0,50 dan kecocokan 0,81, dan Ward 0,50 dan 0,80. DBSCAN mendapat 0,36 dan 0,52, dengan 37 dari 150 titik, sekitar seperempat, sebagai noise.

## Sampel baru
*Apakah metode yang sama menang pada sekumpulan penguin yang baru?*

Ambil sampel baru: yang pertama, lalu tiga kali menekan **Sampel baru**. Kecocokan k-means adalah 0,81, 0,96, 0,88, dan 0,76. Milik DBSCAN 0,52, 0,41, 0,36, dan 0,52, dan jumlah clusternya 3, 7, 7, dan 4. Pada sampel keempat DBSCAN memiliki silhouette tertinggi, 0,59 dibanding 0,54 milik k-means, padahal k-means jauh lebih sesuai dengan spesiesnya.

[[figure:cluster-methods-lab/penguin-samples|Silhouette terhadap kecocokan dengan spesies untuk tiga metode pada empat sampel penguin. Titik yang paling kanan bukan yang tertinggi.]]

Empat sampel adalah pemeriksaan yang kecil, dan eps 0,50 tidak pernah disetel, jadi ini sebuah pola, bukan peringkat.

::: deeper Sampel baru dapat merusak sebuah pengaturan
Pada Dua cincin, eps 1,10 memisahkan cincin pada sampel pertama dan tiga sampel berikutnya. Tekan **Sampel baru** untuk keempat kalinya dan DBSCAN memecah cincin menjadi 4 cluster dengan kecocokan 0,53, sementara k-means dan Ward tetap memotong melintang. Rentang eps yang bekerja adalah sifat satu sampel, bukan hanya sifat bentuknya, jadi uji sebuah pengaturan pada lebih dari satu sampel sebelum kamu mempercayainya.
:::

::: remember
- Beri setiap metode titik yang sama dan periksa masing-masing terhadap gambarnya: k-means dan Ward menyukai cluster bulat, single linkage merayap melewati titik-titik yang berdekatan, dan DBSCAN membutuhkan satu radius yang sesuai dengan kepadatan data.
- Skor silhouette mengukur cluster yang padat dan terpisah, tidak menghitung noise, dan tidak dapat melihat kelompok sebenarnya, sehingga clustering yang salah dapat mendapat skor lebih tinggi daripada yang benar.
- Prediksi, ubah satu pengaturan, jelaskan hasilnya, lalu ulangi pada data nyata dan pada sampel baru sebelum kamu mempercayainya.
:::

@@lab

## Lab: bandingkan metode clustering
Lab dibuka dengan 150 titik buatan pada **Dua cincin**. k-means memakai k = 2, DBSCAN memakai eps 1,10 dan minPts 5, dan hierarchical clustering memakai linkage Ward yang dipotong pada k = 2. Pilih prediksimu sebelum membaca panel, yang sudah menampilkan hasil.

### Kontrol
- **Sumber data** beralih antara **Data buatan** dan **Penguin (data nyata)**. Saat beralih, kedua nilai k, eps, dan minPts kembali ke nilai awal data itu dan jawaban **Kuis Cepat** terhapus. Linkage, **Jumlah titik**, dan sampelnya tetap.
- **Dataset buatan** (hanya data buatan) memilih **Tiga gumpalan**, **Gumpalan tumpang tindih**, **Dua cincin** (awal), **Dua bulan sabit**, **Kepadatan tak seimbang**, atau **Ukuran tak seimbang**. Mengubahnya mengembalikan kedua nilai k ke jumlah kelompok sebenarnya, eps ke 0,80 (1,10 untuk cincin), dan menghapus jawaban Kuis Cepat. minPts dan linkage tetap.
- **Pengukuran di sumbu x** dan **Pengukuran di sumbu y** (hanya penguin) memilih di antara **Panjang paruh (mm)**, **Kedalaman paruh (mm)**, **Panjang sirip (mm)**, dan **Massa tubuh (g)**. Awalnya panjang paruh dan panjang sirip, dan keduanya selalu berbeda.
- **Jumlah titik** (40 sampai 350 dengan langkah 10, awalnya 150) mengatur ukuran sampel.
- **Sampel baru** mengambil sampel baru dari jenis yang sama: titik buatan yang baru, atau sekumpulan penguin acak yang berbeda. Pengaturanmu tetap.
- **k-means: jumlah cluster (k)** adalah slider dari 1 sampai 8.
- **DBSCAN: radius (eps)** adalah slider dari 0,10 sampai 2,00 dengan langkah 0,05. **DBSCAN: jumlah titik minimum (minPts)** berkisar dari 2 sampai 15 dan awalnya 5. eps diukur pada bidang plot 0 sampai 10.
- **Hierarchical: linkage** memilih **Single (pasangan terdekat)**, **Average (rata-rata semua pasangan)**, atau **Ward (kenaikan varians terkecil)**. **Hierarchical: jumlah cluster (k)** adalah slider dari 1 sampai 8 dan menentukan tempat pohon dipotong.
- **Tampilkan kelompok sebenarnya (garis tepi)** menggambar lingkaran di sekeliling setiap titik dengan warna kelompok sebenarnya. Awalnya mati.
- **Layar penuh** memperbesar lab. **Reset** kembali ke data buatan, **Dua cincin**, 150 titik, dan sampel pertama, dengan linkage Ward, pengaturan awal, garis tepi mati, dan jawaban Kuis Cepat terhapus.
- **Kuis Cepat** adalah tombol di bawah kartu pengaturan (tombol bulat di kanan bawah pada ponsel); isinya dua kotak (panah di panelnya berpindah di antara keduanya): "Pada dua cincin, metode mana dari ketiganya yang akan memisahkannya?" dan "Pada dua cincin, apakah metode yang paling baik memisahkannya juga mendapat skor silhouette tertinggi?". Pilih jawaban, lalu tekan **Periksa jawaban**. Keduanya hanya dapat dijawab pada **Dua cincin** dengan **Data buatan**; yang kedua juga membutuhkan sebuah metode yang memisahkan cincin.

### Membaca layar
- Kotak status di bagian atas menyebut metode mana yang paling cocok dengan kelompok sebenarnya, misalnya "DBSCAN paling cocok dengan kelompok sebenarnya (adjusted Rand 1,00)." Kotak itu melaporkan hasil seri, dan menulis "Tidak ada metode yang cocok dengan kelompok sebenarnya" bila kecocokan terbaik di bawah 0,3. Baris di bawahnya adalah pengingat tentang silhouette; bila silhouette tertinggi dimiliki kecocokan yang lebih buruk, baris itu menyebut keduanya, misalnya "Silhouette saja menyesatkan di sini: skor tertingginya milik k-means (0,36), padahal DBSCAN lebih cocok dengan kelompok sebenarnya." Di sisi kanan kotak ada jumlahnya, seperti "150 titik".
- Ada tiga panel: **k-means** ("k = 2"), **DBSCAN** ("eps = 1,10, minPts = 5"), dan **Hierarchical clustering** ("Linkage Ward, k = 2"). Titik diwarnai menurut cluster, dan kelompok yang berhasil ditemukan sebuah metode berwarna sama di ketiga panel. Pada panel k-means, setiap belah ketupat adalah sebuah centroid. Pada panel DBSCAN, tanda silang abu-abu adalah titik noise dan titik yang lebih kecil adalah border point. Sumbunya bertuliskan **Feature 1** dan **Feature 2**; pada penguin, nama kedua pengukuran ditulis di bawah plot.
- Di bawah plot **Hierarchical clustering** ada dendrogram dengan sumbu **Jarak penggabungan**. Garis putus-putus adalah titik potong dan diberi label "potong: k = 2". Cabang di bawah garis itu mengambil warna clusternya.
- Di bawah setiap panel ada empat baris: **Cluster**, **Titik noise**, **Skor silhouette**, dan **Kecocokan dengan kelompok sebenarnya (adjusted Rand)**. Silhouette tidak menghitung titik noise. Kecocokan menghitung noise sebagai satu kelompok tambahan. Bila clusternya kurang dari dua, silhouette menampilkan tanda strip dan kalimat "Silhouette membutuhkan paling sedikit dua cluster, jadi di sini tidak ada skornya." muncul di bawah panel.
- Dengan **Penguin (data nyata)**, sebuah catatan di bawah pemilih sumbu menyebut berapa penguin yang memiliki kedua pengukuran ("342 dari 344 penguin ... 2 baris dengan missing value (NA) dibuang") dan berapa yang ditampilkan. Legenda menjelaskan tanda-tandanya.

### Eksperimen
Tekan **Reset** sebelum setiap eksperimen: angka-angkanya berlaku untuk sampel pertama berisi 150 titik, dan linkage tidak kembali dengan sendirinya.

1. **Gumpalan bulat.** Tekan **Reset**, lalu atur **Dataset buatan** ke **Tiga gumpalan**. Prediksi: apakah ketiga metode sepakat, dan metode mana yang silhouette-nya tertinggi? Setiap metode menemukan 3 **Cluster**: **Skor silhouette** 0,80 (k-means), 0,81 (DBSCAN, dengan 2 **Titik noise**), dan 0,80 (hierarchical); **Kecocokan dengan kelompok sebenarnya (adjusted Rand)** 1,00, 0,98, dan 1,00. Sekarang geser **k-means: jumlah cluster (k)** ke 2, 4, dan 5: silhouette-nya 0,56, 0,66, dan 0,50, dibanding 0,80 pada k = 3. Mengapa skor yang tidak pernah melihat kelompok sebenarnya tetap memuncak pada k yang benar?
2. **Siapa yang memisahkan cincin?** Tekan **Reset**. Lab dibuka pada **Dua cincin**. Prediksi: sebelum membaca panel, buka **Kuis Cepat** dan pilih jawaban di kotak pertama, lalu tekan **Periksa jawaban**. Hanya DBSCAN yang memisahkannya: kecocokannya 1,00, dibanding -0,01 untuk k-means dan 0,01 untuk hierarchical. Nyalakan **Tampilkan kelompok sebenarnya (garis tepi)** untuk melihat di mana k-means memotong. Lalu atur **Hierarchical: linkage** ke **Single (pasangan terdekat)**: kecocokannya menjadi 1,00 dan status menulis "DBSCAN dan hierarchical clustering paling cocok dengan kelompok sebenarnya, seri (adjusted Rand 1,00)." Dengan **Average (rata-rata semua pasangan)** kecocokannya turun ke -0,02. Apa yang dilakukan single linkage yang tidak dilakukan Ward?
3. **Skor dan radius.** Tekan **Reset**. Prediksi: pada kotak **Kuis Cepat** yang kedua, apakah metode yang memisahkan cincin juga memiliki silhouette tertinggi? Silhouette-nya 0,36 (k-means), 0,35 (hierarchical), dan 0,01 (DBSCAN), jadi tidak. Sekarang geser **DBSCAN: radius (eps)** dan prediksi di mana DBSCAN berhenti memisahkan cincin. Dari 0,80 sampai 1,35 ia menemukan 2 cluster tanpa noise dengan kecocokan 1,00. Pada 0,75 ia menemukan 6 cluster (kecocokan 0,41). Pada 1,40 hanya ada 1 cluster dan silhouette menampilkan tanda strip. Mengapa rentang yang bekerja memiliki dua ujung?
4. **Kepadatan tak seimbang.** Tekan **Reset**, lalu atur **Dataset buatan** ke **Kepadatan tak seimbang**. Prediksi: metode mana yang akan menyerah lebih dulu ketika kamu mengubah salah satu pengaturannya? Di awal silhouette dan kecocokannya 0,68 dan 0,81 untuk k-means, 0,74 dan 0,85 untuk DBSCAN (14 titik noise), dan 0,67 dan 0,81 untuk hierarchical. Turunkan **DBSCAN: radius (eps)** ke 0,50, lalu 0,30: noise naik menjadi 38 lalu 68 titik, dan kecocokannya turun ke 0,61 lalu 0,71. Kembalikan eps ke 0,90 untuk mendapat 2 cluster, 11 titik noise, dan kecocokan 0,89. Lalu atur **Hierarchical: linkage** ke **Single (pasangan terdekat)**: kecocokannya 0,01, dan satu cluster hanya berisi satu titik terpencil. Naikkan **Hierarchical: jumlah cluster (k)** ke 3 dan kecocokannya menjadi 0,82.
5. **Skor tinggi yang salah.** Tekan **Reset**. Prediksi: dapatkah DBSCAN mengalahkan kedua metode lain pada silhouette sementara kecocokannya dengan kebenaran lebih buruk? Pada **Dua cincin**, atur eps ke 0,30: DBSCAN memiliki 5 cluster dan 125 titik noise, silhouette 0,86, dan kecocokan 0,05. Pada eps 0,50 ia memiliki 15 cluster, 23 titik noise, silhouette 0,60, dan kecocokan 0,07. Lalu atur **Dataset buatan** ke **Kepadatan tak seimbang** dan eps ke 0,30: silhouette 0,84 kembali menjadi yang tertinggi, dan baris di bawah status menulis "Silhouette saja menyesatkan di sini ...". Berapa titik yang digambarkan oleh masing-masing skor ini?
6. **Penguin nyata dan sampel baru.** Tekan **Reset**, lalu atur **Sumber data** ke **Penguin (data nyata)**. Prediksi: metode mana yang paling sesuai dengan spesiesnya, dan apakah yang sama menang pada sampel baru? Di awal, silhouette dan kecocokannya 0,50 dan 0,81 untuk k-means, 0,36 dan 0,52 untuk DBSCAN (37 titik noise), dan 0,50 dan 0,80 untuk hierarchical. Nyalakan **Tampilkan kelompok sebenarnya (garis tepi)**. Lalu tekan **Sampel baru** tiga kali dan baca kecocokan setelah setiap tekanan. k-means mendapat 0,96, 0,88, dan 0,76, DBSCAN 0,41, 0,36, dan 0,52, hierarchical 0,66, 0,78, dan 0,72. Pada tekanan ketiga silhouette DBSCAN sebesar 0,59 adalah yang tertinggi, tetapi k-means lebih sesuai. Atur eps ke 0,70 pada sampel itu: DBSCAN mendapat 4 cluster, 10 titik noise, silhouette 0,45, dan kecocokan 0,69. Apakah gagasan dari cincin berlaku pada data nyata, dan apakah berlaku pada setiap sampel?
