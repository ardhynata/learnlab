---
slug: what-is-clustering
title: Apa itu clustering
---
::: intro
- Jelaskan perbedaan clustering dengan supervised learning, dan apa yang dimaksud dengan cluster.
- Hitung jarak antara dua titik secara manual, lalu pakai untuk mengelompokkan enam titik.
- Jelaskan mengapa satuan dan skala mengubah titik mana yang dianggap dekat.

Sebelum mulai: baca "Supervised, unsupervised, dan tiga pertanyaan" dan "Jarak dan kemiripan".
:::

## Mengelompokkan tanpa label
*Apa yang kamu lakukan jika tabelmu tidak punya kolom label?*

Pada supervised learning, setiap baris datang bersama jawabannya, misalnya nama spesies, dan model belajar memprediksinya. Pada **unsupervised** learning, kolom jawaban itu tidak ada. Kamu hanya memegang tabel hasil pengukuran, lalu mengajukan pertanyaan yang lebih longgar: apakah baris-baris ini membentuk kelompok yang alami?

**Clustering** adalah jawaban yang paling umum. Sebuah metode clustering membaca feature, lalu memberi setiap baris sebuah kelompok.

Bayangkan data ukuran paruh penguin yang spesiesnya tidak dicatat siapa pun. Kamu tidak bisa bertanya "spesies apa ini?", karena tidak ada yang dapat dipelajari. Namun kamu masih bisa bertanya "penguin mana yang mirip satu sama lain?". Gagasan yang sama dipakai untuk membagi pelanggan ke dalam segmen, memampatkan gambar, atau sekadar menjelajahi sebuah tabel sebelum membangun model.

[[figure:what-is-clustering/no-labels|24 penguin asli yang sama ditampilkan dua kali: pertama seperti yang diterima metode, hanya berisi feature, lalu dengan dua kelompok yang diusulkannya.]]

## Apa itu cluster
*Apa artinya titik-titik menjadi satu kelompok?*

**Cluster** adalah sekumpulan titik yang lebih mirip satu sama lain daripada dengan titik lainnya. Agar "mirip" menjadi angka, kita memakai jarak: anggota satu cluster saling berdekatan dan lebih jauh dari cluster lain.

Dari sini ada tiga hal yang perlu diingat.

- **Nomor kelompok hanyalah nama.** "Kelompok 1" dan "kelompok 2" boleh bertukar tempat tanpa mengubah apa pun. Metode ini tidak tahu arti sebuah kelompok. Kamu baru mengetahuinya setelah melihat anggotanya.
- **Cluster bukan kelas.** Kelas adalah label yang dituliskan seseorang. Cluster adalah kelompok yang diusulkan oleh sebuah metode, dan bisa saja tidak sesuai dengan label mana pun yang akan kamu pilih.
- **Tidak ada kunci jawaban.** Sebuah clustering berguna atau tidak berguna; ia tidak benar atau salah.

> Gagasan kunci: clustering adalah usulan yang dibangun dari jarak. Kamu menilainya dari apakah hasilnya berguna dan stabil, bukan dari apakah ia sesuai dengan kebenaran tersembunyi.

::: deeper Tiga keluarga metode
Metode-metode clustering berbeda dalam aturan yang mengubah jarak menjadi kelompok. Metode **berbasis centroid** seperti k-means menyimpan k pusat (k adalah jumlah kelompok yang kamu minta) dan menghubungkan setiap titik ke pusat terdekat. Metode **berbasis kepadatan** seperti DBSCAN menumbuhkan cluster melewati daerah yang padat. Metode **hierarkis** menggabungkan dua kelompok terdekat, berulang kali. Kursus ini membahas k-means; kursus berikutnya membandingkan yang lain.
:::

## Jarak, sekali lagi
*Bagaimana mengubah "mirip" menjadi angka?*

Kamu sudah mengenal jarak di k-NN. Untuk dua titik dengan dua feature, jarak Euclidean adalah panjang garis lurus di antara keduanya. Ambil selisih pada setiap feature, kuadratkan kedua selisih itu, jumlahkan, lalu tarik akar kuadratnya:

jarak = akar kuadrat dari ((x1 − x2)² + (y1 − y2)²)

Clustering memakai jarak seperti k-NN, dengan satu perbedaan: tidak ada yang berlabel. Jarak diukur antartitik tanpa label, dan antara sebuah titik dengan **centroid** sebuah kelompok, yaitu rata-rata titik-titik kelompok itu, feature demi feature.

Setiap metode clustering membutuhkan tiga bahan.

1. **Feature** yang menggambarkan setiap titik.
2. **Jarak** yang menyatakan seberapa mirip dua titik.
3. **Aturan pengelompokan** yang mengubah jarak menjadi kelompok.

Kalau jaraknya diganti, makna "dekat" ikut berubah, sehingga data yang sama dapat terkelompok secara berbeda.

## Contoh kecil yang dihitung manual
*Bisakah kamu mengelompokkan enam titik hanya dengan pensil?*

Enam penguin asli, dengan panjang dan kedalaman paruh dalam milimeter:

| Penguin | Panjang paruh | Kedalaman paruh |
| --- | --- | --- |
| A | 39,1 | 18,7 |
| B | 39,5 | 17,4 |
| C | 40,3 | 18,0 |
| D | 46,1 | 13,2 |
| E | 48,7 | 14,1 |
| F | 50,0 | 15,2 |

> Contoh hitungan: jarak dari A ke B. Selisihnya 39,5 − 39,1 = 0,4 dan 17,4 − 18,7 = −1,3. Kuadratnya 0,16 dan 1,69. Jumlahnya 1,85, dan akar kuadratnya sekitar 1,36.

Langkah yang sama memberi A ke C = 1,39, A ke D = 8,90, A ke E = 10,65, dan A ke F = 11,45.

[[figure:what-is-clustering/tiny-example|Enam penguin asli dan jaraknya dari A. B dan C dekat dengan A; D, E, dan F jauh.]]

Dua titik berada di dekat A dan tiga lainnya jauh. Ini mengisyaratkan kelompok {A, B, C} dan {D, E, F}. Periksa semua pasangan: jarak terpanjang di dalam satu kelompok adalah D ke F, yaitu 4,38. Jarak terpendek antarkelompok adalah C ke D, yaitu 7,53. Setiap pasangan di dalam kelompok lebih dekat daripada pasangan mana pun yang melintasi kelompok.

## Pusat dan perbatasan
*Bagaimana menempatkan titik baru, dan bagaimana jika ia berada di antara dua kelompok?*

Ringkas setiap kelompok dengan pusatnya. Untuk {A, B, C}, panjang paruhnya (39,1 + 39,5 + 40,3) / 3 = 39,63 dan kedalaman paruhnya (18,7 + 17,4 + 18,0) / 3 = 18,03. Untuk {D, E, F}, pusatnya (48,27; 14,17).

Setiap penguin lebih dekat ke pusatnya sendiri. A berjarak 0,85 dari pusat pertama dan 10,23 dari pusat kedua. Tidak ada penguin yang lebih dari 2,37 dari pusatnya sendiri, dan tidak ada yang lebih dekat dari 8,07 ke pusat yang lain.

Sekarang tambahkan penguin asli ketujuh, G, dengan panjang paruh 43,5 dan kedalaman 15,2. Jaraknya ke pusat pertama 4,79 dan ke pusat kedua 4,88.

> Awas: G hampir tepat di perbatasan. Ia masuk ke kelompok 1 dengan selisih kurang dari 0,1 mm, dan perubahan kecil pada sebuah pengukuran atau pada jarak yang dipakai dapat membaliknya. Data nyata selalu punya titik seperti G, dan di sinilah metode-metode saling berbeda hasil.

## Satuan menentukan siapa yang dekat
*Mengapa satu kolom bisa menguasai jarak?*

Jarak menjumlahkan selisih dari feature yang berbeda, sehingga feature dengan selisih terbesar mendominasi. Ambil dua penguin asli: penguin X punya flipper 195 mm dan massa 4.675 g, sedangkan penguin Y punya flipper 211 mm dan bobot 4.500 g. Selisihnya 16 mm dan 175 g.

> Contoh hitungan: dalam gram, jaraknya adalah akar kuadrat dari 16² + 175² = 256 + 30.625 = 30.881, yaitu sekitar 175,7. Massa menentukan hampir segalanya. Tulis massa dalam kilogram, maka selisihnya 0,175, sehingga jaraknya adalah akar kuadrat dari 256 + 0,03, sekitar 16,0. Sekarang panjang flipper yang menentukan.

[[figure:what-is-clustering/units-matter|Dua penguin yang sama dengan massa dalam gram dan dalam kilogram, digambar dengan skala yang sama pada kedua sumbu. Hanya satuannya yang berubah.]]

Pada contoh enam penguin di atas, kedua kolom sama-sama dalam milimeter, sehingga tidak ada yang tenggelam oleh yang lain.

> Awas: skalakan feature sebelum melakukan clustering, misalnya dengan standardisasi. Pelajaran "Scaling dan encoding" menunjukkan caranya.

## Menilai hasil tanpa kunci jawaban
*Apa yang bisa kamu periksa jika tidak ada skor untuk dicocokkan?*

- **Lihat hasilnya.** Dengan dua atau tiga feature, gambarkan kelompok-kelompoknya. Jika terlihat janggal di matamu, kemungkinan besar memang ada yang salah.
- **Jalankan ulang.** Mulai dari awal acak yang berbeda (seed yang berbeda), atau ambil sampel ulang barisnya. Kelompok yang terus muncul kembali lebih layak dipercaya daripada kelompok yang berubah setiap kali.
- **Tanyakan apakah hasilnya berguna.** Apakah kelompok-kelompok itu bermakna bagi orang yang memahami datanya?
- **Jangan percaya begitu saja.** Setiap metode selalu mengembalikan kelompok, bahkan untuk noise murni.

::: deeper Inertia dan silhouette
**Inertia** adalah total jarak kuadrat dari setiap titik ke pusat cluster-nya. Nilai lebih rendah berarti lebih rapat, tetapi nilainya selalu turun ketika cluster ditambah, sehingga ia hanya dapat membandingkan run dengan jumlah cluster yang sama.

**Silhouette** sebuah titik membandingkan a, jarak rata-ratanya ke cluster sendiri, dengan b, jarak rata-ratanya ke cluster lain yang terdekat: (b − a) dibagi yang lebih besar di antara keduanya. Nilainya berkisar dari −1 sampai 1. Mendekati 1 berarti terpisah dengan baik, mendekati 0 berarti berada di perbatasan, dan di bawah 0 berarti kemungkinan besar salah cluster.
:::

## Selanjutnya
*Ke mana gagasan-gagasan ini mengarah di kursus ini?*

Kamu kini punya semua bagiannya: titik yang digambarkan oleh feature, sebuah jarak, dan pusat yang meringkas satu kelompok. Aturan pusat-dan-terdekat dari bagian sebelumnya adalah inti dari **k-means**. Algoritma ini mulai dengan k pusat tebakan (k adalah jumlah kelompok yang kamu minta), mengirim setiap titik ke pusat terdekat, menggeser tiap pusat ke tengah titik-titiknya, lalu mengulang.

Pelajaran berikutnya membahas dari mana tebakan itu berasal dan cara memilih jumlah kelompok. Setelah itu kamu menjalankan loop-nya sendiri di lab k-means dan melihat titik-titik menempel ke centroid terdekatnya sementara pusat-pusat itu bergerak. Di akhir kursus, kamu membuka spesies yang tersembunyi dan membandingkannya dengan cluster.

::: remember
- Clustering mengelompokkan titik tanpa label dengan memakai feature, sebuah jarak, dan aturan pengelompokan.
- Cluster adalah usulan, bukan kelas: nilai dengan melihat, menjalankan ulang, dan kegunaannya, bukan dengan kunci jawaban.
- Jarak bergantung pada satuan, karena itu samakan skala feature terlebih dahulu.
:::
