---
slug: silhouette-score
title: Skor silhouette
---
::: intro
- Menghitung silhouette sebuah titik dari dua jarak rata-ratanya, a dan b.
- Membaca nilai antara -1 dan 1, serta rata-rata silhouette dari seluruh pengelompokan.
- Memakai rata-rata itu untuk membandingkan nilai k, dan menyebutkan tiga batasannya.

Sebelum mulai: baca "k-means, langkah demi langkah" dan "Hierarchical clustering".
:::

## Menilai pengelompokan tanpa label
*Bagaimana kamu tahu bahwa sekumpulan cluster itu baik?*

k-means dan hierarchical clustering sama-sama menghasilkan kelompok, tetapi keduanya tidak menjelaskan apakah kelompok itu bagus. Pada data berlabel, kamu tinggal menghitung jawaban yang benar. Clustering tidak punya label, sehingga skornya hanya boleh melihat titik dan kelompoknya.

Inertia, dari pelajaran k-means, adalah salah satu skor semacam itu. Kelemahannya: nilainya turun setiap kali k bertambah, jadi ia tidak dapat memberi tahu di mana kamu harus berhenti.

**Skor silhouette** mengajukan satu pertanyaan kepada setiap titik: kamu lebih dekat ke cluster sendiri atau ke cluster lain? Titik yang lebih dekat ke cluster sendiri berada di tempat yang tepat. Titik yang lebih dekat ke cluster tetangga kemungkinan besar salah tempat. Rata-rata jawaban dari semua titik menjadi skor untuk seluruh pengelompokan.

Skor ini hanya membutuhkan titik dan label cluster-nya. Kamu dapat menilai hasil metode apa pun, termasuk k-means, potongan sebuah dendrogram, atau DBSCAN yang akan dibahas berikutnya.

## Dua jarak untuk setiap titik
*Dua rata-rata apa yang dibutuhkan sebuah titik?*

Pilih satu titik, P, lalu ukur dua jarak rata-rata.

- **a** adalah jarak rata-rata dari P ke titik-titik lain di cluster-nya sendiri. Nilai a yang kecil berarti P berada rapat di antara anggota cluster yang sama (teman satu cluster).
- **b** adalah jarak rata-rata dari P ke titik-titik di cluster terdekat lainnya. Untuk setiap cluster lain, hitung rata-rata jarak dari P ke titik-titik cluster itu; b adalah yang paling kecil dari rata-rata tersebut. Nilai b yang besar berarti titik-titik luar yang terdekat pun berada jauh.

[[figure:silhouette-score/a-and-b|Untuk titik yang disorot, garis penuh menuju cluster-nya sendiri (rata-ratanya adalah a) dan garis putus-putus menuju cluster lain yang terdekat (rata-ratanya adalah b).]]

Silhouette untuk P menggabungkan keduanya:

```
s = (b - a) / max(a, b)
```

`max(a, b)` adalah yang lebih besar di antara keduanya. Pembagian dengan nilai itu menghilangkan satuan, sehingga mengukur dalam meter atau sentimeter menghasilkan s yang sama.

> Gagasan kunci: "cluster lain yang terdekat" berarti cluster dengan jarak rata-rata terkecil dari P, bukan cluster yang memiliki titik tunggal yang paling dekat dengan P.

## Membaca nilainya
*Apa arti -1, 0, dan 1?*

Setiap s berada di antara -1 dan 1.

| s | Arti |
|---|---|
| mendekati 1 | a jauh lebih kecil daripada b: P jauh lebih dekat ke cluster-nya sendiri daripada ke cluster mana pun. |
| mendekati 0 | a dan b hampir sama: P berada di perbatasan dua cluster. |
| di bawah 0 | a lebih besar daripada b: rata-rata P lebih dekat ke cluster lain daripada ke cluster-nya sendiri. Kemungkinan besar ia berada di cluster yang salah. |

Nilai negatif adalah peringatan untuk satu titik, bukan untuk seluruh pengelompokan. Dengan mendaftar titik-titik yang s-nya paling rendah, kamu dapat melihat titik mana yang ditempatkan dengan buruk oleh metodenya.

Untuk rata-rata dari semua titik, ada patokan kasar: di atas sekitar 0,5, kelompok-kelompoknya terpisah dengan jelas; di bawah sekitar 0,25, hampir tidak terpisah. Ini hanya panduan, bukan hukum.

::: deeper Mengapa skor ini selalu berada di antara -1 dan 1
Jika a lebih kecil daripada b, maka max(a, b) = b dan s = (b - a) / b = 1 - a/b. Karena a paling kecil bernilai 0, hasilnya berada di antara 0 dan 1, dan baru mencapai 1 ketika a = 0. Jika a lebih besar daripada b, maka max(a, b) = a dan s = b/a - 1, yang berada di antara -1 dan 0. Jika a sama dengan b, pembilangnya 0 dan s pun 0.
:::

## Satu titik dengan tangan
*Bagaimana mendapatkan s untuk satu titik?*

Ambil enam titik pada garis bilangan, dalam dua cluster: A = {1, 3, 5} dan B = {8, 9, 10}. Jarak antara dua bilangan adalah selisihnya, misalnya |5 - 8| = 3. Mulailah dari titik 5.

1. **a.** Anggota A lainnya adalah 1 dan 3, pada jarak 4 dan 2. Jadi a = (4 + 2) / 2 = 3.
2. **b.** Satu-satunya cluster lain adalah B, pada jarak 3, 4, dan 5. Jadi b = (3 + 4 + 5) / 3 = 4.
3. **s.** s = (4 - 3) / max(3, 4) = 1/4 = 0,25.

[[figure:silhouette-score/six-points|Untuk titik 5: busur di atas menuju cluster-nya sendiri (a = 3), busur di bawah menuju cluster B (b = 4), sehingga s = 0,25.]]

## Keenam titik
*Seperti apa s untuk setiap titik?*

Jika langkah yang sama dilakukan untuk setiap titik, hasilnya:

| Titik | a | b | s |
|---|---|---|---|
| 1 | (2 + 4) / 2 = 3 | (7 + 8 + 9) / 3 = 8 | 5/8 = 0,625 |
| 3 | (2 + 2) / 2 = 2 | (5 + 6 + 7) / 3 = 6 | 4/6 = 0,667 |
| 5 | 3 | 4 | 0,25 |
| 8 | (1 + 2) / 2 = 1,5 | (7 + 5 + 3) / 3 = 5 | 3,5/5 = 0,7 |
| 9 | (1 + 1) / 2 = 1 | (8 + 6 + 4) / 3 = 6 | 5/6 = 0,833 |
| 10 | (2 + 1) / 2 = 1,5 | (9 + 7 + 5) / 3 = 7 | 5,5/7 = 0,786 |

Titik 5 adalah yang paling lemah karena ia berada di tepi A, paling dekat ke B. Meski begitu, s-nya masih positif: rata-rata ia lebih dekat ke A.

## Rata-rata, dan cara memilih k
*Bagaimana satu angka per titik menjadi cara untuk memilih k?*

**Rata-rata silhouette** adalah rata-rata s dari semua titik. Untuk enam titik di atas, nilainya (0,625 + 0,667 + 0,25 + 0,7 + 0,833 + 0,786) / 6, sekitar 0,64.

Untuk memilih k, lakukan clustering pada data dengan setiap k yang ingin kamu coba, hitung rata-rata silhouette untuk masing-masing, lalu pilih k dengan nilai tertinggi. Berbeda dengan inertia, rata-rata ini dapat turun ketika k terlalu besar, sehingga ia punya puncak.

> Contoh hitungan: bagi keenam titik yang sama menjadi tiga cluster, {1, 3}, {5, 8}, dan {9, 10}. Sekarang titik 8 memiliki a = |8 - 5| = 3 tetapi b = (1 + 2) / 2 = 1,5, sehingga s = (1,5 - 3) / 3 = -0,5: ia berada bersama teman yang lebih jauh daripada cluster di sebelahnya. Keenam nilainya adalah 0,636, 0,429, 0, -0,5, 0,6, dan 0,714, dengan rata-rata sekitar 0,31. Angka itu lebih rendah daripada 0,64, sehingga k = 2 adalah pilihan yang lebih baik.

[[figure:silhouette-score/score-by-k|Rata-rata silhouette dari k-means pada 150 titik yang diambil dari tiga blob bulat. Puncaknya ada di k = 3 (0,80) dan turun di kedua sisinya.]]

> Awas: rata-rata tertinggi hanyalah saran. Lihat juga cluster-nya, lalu tanyakan apakah kelompok-kelompok itu bermakna untuk masalahmu.

## Apa yang tidak dapat dilihat skor ini
*Kapan silhouette yang rendah atau tidak terdefinisi menyesatkan?*

- **Skor ini cenderung memihak cluster bulat.** a adalah jarak rata-rata ke setiap teman satu cluster, sehingga pada cincin atau bulan sabit yang panjang, ada titik yang jauh dari teman-temannya sendiri walaupun pengelompokannya benar. Pada gambar di bawah, dua cincin yang sebenarnya hanya mendapat skor 0,01, sedangkan k-means yang memotongnya secara melintang mendapat skor 0,36.
- **Skor ini membutuhkan sedikitnya dua cluster.** Dengan satu cluster tidak ada cluster lain, sehingga b tidak ada dan s tidak terdefinisi. Skor ini tidak dapat memberi tahu bahwa data sama sekali tidak memiliki cluster.
- **Noise tidak punya cluster.** DBSCAN, pelajaran berikutnya, memberi label noise pada titik-titik yang terpencil. Titik noise tidak punya cluster sendiri, sehingga ia tidak punya a. Pilihan yang umum adalah mengeluarkan titik-titik ini dari skor; jika kamu melakukannya, laporkan berapa banyak yang dibuang.

Satu peringatan di samping ketiga batasan ini: seperti k-means, skor ini dibangun dari jarak, sehingga feature yang belum di-scaling akan mengacaukannya.

[[figure:silhouette-score/rings-limit|150 titik yang sama dalam dua cincin. Pengelompokan yang sebenarnya mendapat skor 0,01. k-means dengan k = 2 memotong melintang kedua cincin dan mendapat skor 0,36.]]

::: deeper Cluster satu titik dan biaya komputasi
Cluster dengan satu titik tidak punya teman, sehingga a tidak terdefinisi. Konvensi yang umum adalah memberi titik itu s = 0. Untuk menghitung setiap s dibutuhkan jarak dari tiap titik ke semua titik lain, sekitar n kali n jarak untuk n titik, sehingga skor ini menjadi lambat pada dataset yang sangat besar.
:::

## Memakainya dengan baik
*Apa yang kamu lakukan dengan skor silhouette dalam praktik?*

Anggap silhouette sebagai pendapat kedua. Lihat dulu cluster-nya. Lalu tanyakan kepada skor: k mana yang memisahkan kelompok paling baik, titik mana yang berada di perbatasan, dan apakah metode lain memberi hasil yang lebih baik?

Skor ini mengukur kelompok yang padat dan terpisah dengan baik. Skor tinggi berarti kelompoknya rapat dan berjauhan, bukan bahwa itulah kelompok yang kamu inginkan. Skor rendah pada cincin, bulan sabit, atau data yang banyak noise-nya dapat berarti metodenya benar dan penggarisnya yang salah.

Setelah DBSCAN, lab cluster methods menaruh beberapa metode pada data yang sama. Bandingkan hasilnya dengan mata, lalu gunakan skor seperti silhouette untuk menguatkan apa yang kamu lihat, bukan untuk menggantikannya.

::: remember
- Silhouette sebuah titik adalah s = (b - a) / max(a, b), dengan a jarak rata-rata ke cluster-nya sendiri dan b jarak rata-rata ke cluster lain yang terdekat.
- Mendekati 1 berarti ditempatkan dengan baik, mendekati 0 berarti di perbatasan, di bawah 0 berarti kemungkinan besar di cluster yang salah. Rata-rata dari semua titik membandingkan nilai k.
- Skor ini memihak cluster bulat, tidak terdefinisi untuk satu cluster, dan tidak bermakna untuk titik noise, jadi pakailah bersama gambarnya.
:::
