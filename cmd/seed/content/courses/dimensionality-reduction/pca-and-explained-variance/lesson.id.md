---
slug: pca-and-explained-variance
title: PCA dan explained variance
---
::: intro
- Jelaskan mengapa lebih sedikit dimensi dapat membantu (redundansi, noise, menggambar data) dan apa yang dicari PCA.
- Hitung dengan tangan, untuk lima titik 2-D, matriks kovarians, eigenvector-nya, dan proyeksi dua titik.
- Baca explained variance ratio dan scree plot, lalu jelaskan mengapa PCA membutuhkan kolom yang sudah distandardisasi.

Sebelum mulai: baca "Pusat dan sebaran data", "Outlier dan korelasi" dan "Scaling dan encoding". Ketiganya memberimu varians, korelasi r dan z-score, dan pelajaran ini memakai ketiganya.
:::

## Mengapa dimensi perlu dikurangi
*Mengapa kamu membuang kolom yang susah payah dikumpulkan?*

**Dimensi** adalah satu feature, satu kolom. Tabel penguin punya empat ukuran: panjang paruh, kedalaman paruh, panjang sirip, dan massa tubuh. Tabel di dunia nyata dapat punya puluhan sampai ratusan kolom, dan lebih banyak kolom belum tentu lebih baik.

- **Redundansi.** Kolom yang bergerak bersama menceritakan hal yang sama dua kali. Pada 342 penguin yang terukur lengkap, panjang sirip dan massa tubuh berkorelasi r = 0,87.
- **Noise.** Sinyal yang sama muncul di beberapa kolom sekaligus, sedangkan noise pengukuran tidak punya alasan untuk searah. Arah yang hampir tidak membuat data bervariasi sering kali sebagian besar berisi noise, tetapi tidak selalu.
- **Menggambar.** Kamu dapat membuat plot dengan dua atau tiga sumbu. Empat sumbu, apalagi empat puluh, tidak mungkin.

**Reduksi dimensi** mengganti banyak kolom dengan beberapa kolom baru yang menyimpan informasi sebanyak mungkin. Di sini "informasi" berarti sebaran: kolom yang tidak pernah berubah tidak memberi tahu baris mana yang sedang kamu lihat. **PCA**, singkatan dari principal component analysis, adalah metode yang paling umum, dan sisa pelajaran ini menyusunnya selangkah demi selangkah.

> Gagasan kunci: PCA tidak memilih sebagian kolom aslimu. PCA membuat beberapa kolom baru, masing-masing campuran dari kolom lama, sehingga sebaran data tersimpan dalam sesedikit mungkin kolom.

## Arah dengan varians terbesar
*Apa yang dicari PCA?*

Pertama, **pusatkan** data (*center*): kurangi setiap kolom dengan rata-ratanya, sehingga pusat awan titik berada di titik asal. Lalu pilih sebuah arah, yaitu garis yang melewati pusat itu, dan jatuhkan setiap titik tegak lurus ke garis tersebut. Itulah **proyeksi**. Setiap titik sekarang punya satu angka, yaitu posisinya sepanjang garis, dan angka-angka itu punya varians, persis seperti di "Pusat dan sebaran data".

Sebagian arah menjaga titik-titik tetap berjauhan, sebagian lain menghimpitnya. PCA memilih arah dengan varians terbesar, yaitu arah tempat satu angka milik sebuah titik paling banyak memberi tahu di mana titik itu semula.

Ambil lima titik: (1, 2), (2, 1), (3, 4), (4, 3) dan (5, 5), dengan rata-rata (3, 3). Jika diproyeksikan ke empat arah, variansnya adalah:

| Arah | Varians angka hasil proyeksi |
| --- | --- |
| Sepanjang sumbu pertama | 2 |
| Sepanjang sumbu kedua | 2 |
| Sepanjang diagonal (1, 1) | 3,6 |
| Sepanjang diagonal lainnya (1, -1) | 0,4 |

[[figure:pca-and-explained-variance/directions|Lima titik yang sama diproyeksikan ke tiga garis yang melewati pusatnya. Ruas pada setiap garis menunjukkan sebaran titik hasil proyeksi.]]

Diagonal menang dengan 3,6, sehingga ia menjadi arah utama yang pertama.

## Principal component sebagai sumbu baru
*Apa saja komponen yang lain?*

Arah terbaik disebut **principal component pertama**, PC1. **Yang kedua**, PC2, adalah arah terbaik di antara arah-arah yang tegak lurus terhadap PC1. PC3 tegak lurus terhadap keduanya, dan seterusnya. Tabel dengan d kolom punya d komponen.

Komponen-komponen itu adalah satu set sumbu baru yang diputar terhadap sumbu lama. PCA tidak menggeser atau mengubah titik-titiknya. PCA hanya menggambarkan awan yang sama dari sudut yang lebih baik. Koordinat sebuah titik pada sumbu baru disebut **skor**, dan setiap komponen adalah sebuah resep: jumlah berbobot dari kolom yang sudah dipusatkan. Bobotnya disebut **loading** komponen itu.

Dua fakta membuat sumbu baru ini berguna. Skor pada komponen yang berbeda tidak berkorelasi, sehingga tidak ada lagi redundansi di antaranya. Selain itu, varians dibagikan secara berurutan: PC1 memegang paling banyak, dan PC2 memegang paling banyak dari sisanya.

Mengurangi dimensi pun menjadi sederhana: simpan k skor pertama dan buang sisanya.

> Perhatian: arah sebuah komponen tidak punya tanda. Satu program dapat melaporkan PC1 sebagai (0,71; 0,71) dan program lain sebagai (-0,71; -0,71). Keduanya sumbu yang sama dengan arah berlawanan, dan skornya hanya berganti tanda.

## Contoh hitungan: matriks kovarians
*Bagaimana lima titik berubah menjadi sebuah matriks?*

Kurangi lima titik itu dengan rata-rata (3, 3):

| Titik | dx | dy | dx² | dy² | dx · dy |
| --- | --- | --- | --- | --- | --- |
| (1, 2) | -2 | -1 | 4 | 1 | 2 |
| (2, 1) | -1 | -2 | 1 | 4 | 2 |
| (3, 4) | 0 | 1 | 0 | 1 | 0 |
| (4, 3) | 1 | 0 | 1 | 0 | 0 |
| (5, 5) | 2 | 2 | 4 | 4 | 4 |
| Jumlah | | | 10 | 10 | 8 |

Bagi setiap jumlah dengan 5 (seperti di "Scaling dan encoding"). Kedua varians adalah 10 / 5 = 2 dan 10 / 5 = 2. **Kovarians** kedua kolom adalah rata-rata dx · dy, yaitu 8 / 5 = 1,6. Nilainya positif ketika kedua kolom naik bersama, dan kovarians sebuah kolom dengan dirinya sendiri adalah variansnya.

**Matriks kovarians** menaruh ketiga angka itu dalam satu tabel:

```
C = [[2.0, 1.6],
     [1.6, 2.0]]
```

Korelasinya adalah r = 1,6 / (√2 · √2) = 0,8. Jika kamu membagi dengan n - 1 dan bukan n, setiap isi matriks dikalikan dengan faktor yang sama, sehingga arah dan porsi varians di bawah ini tidak berubah.

## Eigenvector dan proyeksi
*Matriks itu menunjuk ke arah mana, dan di mana dua titik mendarat?*

**Eigenvector** dari C adalah arah yang hanya diregangkan oleh C dan tidak pernah diputar. Faktor regangannya adalah **eigenvalue**, dan nilainya sama dengan varians data sepanjang arah itu. Jadi eigenvector dengan eigenvalue terbesar adalah PC1.

> Contoh hitungan: eigenvalue memenuhi (2 - λ)² - 1,6² = 0, jadi 2 - λ = 1,6 atau -1,6, sehingga λ = 0,4 atau 3,6. Untuk λ = 3,6, persamaan (2 - 3,6)v1 + 1,6v2 = 0 memberi v1 = v2. Skalakan ke panjang 1: PC1 = (0,707; 0,707). Periksa: C dikali (1, 1) adalah (3,6; 3,6). Untuk λ = 0,4 kamu mendapat PC2 = (0,707; -0,707).

Hasilnya cocok dengan tabel tadi: varians 3,6 dan 0,4 berjumlah 4, sama dengan 2 + 2. Memutar sumbu tidak menciptakan varians. Varians hanya dipindahkan.

Skor adalah hasil kali titik (dot product) antara titik yang sudah dipusatkan dan sebuah eigenvector satuan.

> Contoh hitungan: titik (5, 5) menjadi (2, 2) setelah dipusatkan, sehingga PC1 = 2 · 0,707 + 2 · 0,707 = 2,83 dan PC2 = 2 · 0,707 - 2 · 0,707 = 0. Titik (1, 2) menjadi (-2, -1): PC1 = (-2 - 1) · 0,707 = -2,12 dan PC2 = (-2 + 1) · 0,707 = -0,71. Jika hanya PC1 yang disimpan, (1, 2) berada di (3, 3) + (-2,12) · (0,707; 0,707) = (1,5; 1,5), yang berjarak 0,71 dari posisi awalnya.

[[figure:pca-and-explained-variance/projection|Lima titik dengan kedua sumbu utama. Titik yang dilingkari adalah dua titik pada contoh hitungan, dan setiap garis putus-putus menjatuhkan titik ke PC1.]]

## Explained variance dan scree plot
*Berapa banyak komponen yang cukup?*

**Explained variance ratio** sebuah komponen adalah eigenvalue-nya dibagi jumlah semua eigenvalue. Pada contoh hitungan, PC1 menjelaskan 3,6 / 4 = 0,90 dan PC2 menjelaskan 0,4 / 4 = 0,10. Menyimpan PC1 saja berarti menyimpan 90% varians.

Sekarang keempat kolom penguin, setelah distandardisasi (bagian berikutnya). Setiap kolom lalu punya varians 1, sehingga total varians adalah 4, dan eigenvalue-nya adalah 2,75, 0,77, 0,37 dan 0,11.

| Komponen | Explained variance | Total berjalan |
| --- | --- | --- |
| PC1 | 68,8% | 68,8% |
| PC2 | 19,3% | 88,2% |
| PC3 | 9,1% | 97,3% |
| PC4 | 2,7% | 100% |

**Scree plot** menggambar angka-angka ini sebagai batang berurutan, dengan total berjalan sebagai garis. Carilah siku (*elbow*) tempat batang mulai mendatar. Dua komponen sudah memuat 88,2%, sehingga gambar datar dari keempat kolom itu hanya kehilangan sedikit.

[[figure:pca-and-explained-variance/scree|Scree plot untuk empat kolom penguin yang distandardisasi. Batang adalah porsi varians tiap komponen, dan garis adalah total berjalannya.]]

> Gagasan kunci: tidak ada satu jumlah komponen yang pasti benar. Simpan cukup banyak untuk mencapai target seperti 90%, atau berhenti di siku, lalu periksa apakah tugasmu masih berjalan baik.

## Standardisasi dulu
*Mengapa semua kolom harus berada pada skala yang sama?*

PCA mencari varians, dan varians bergantung pada satuan. Ambil dua kolom penguin mentah: panjang sirip, dalam mm, bervarians 197,15, dan massa tubuh, dalam g, bervarians 641.250,58. Massa menang hanya karena gram adalah satuan yang kecil.

Eigenvalue matriks kovarians itu adalah 641.400,23 dan 47,50. PC1 menunjuk ke (0,02; 1,00), yaitu hampir hanya massa tubuh, dan ia menjelaskan 99,99% varians. Itu bukan temuan tentang penguin. Itu temuan tentang gram. Jebakannya sama seperti di "Scaling dan encoding", ketika kolom dengan angka besar menentukan setiap jarak.

**Standardisasi** setiap kolom menjadi z-score lebih dulu. Setiap kolom lalu bervarians 1, dan matriks kovarians menjadi matriks korelasi. Dengan dua kolom dan korelasi r, eigenvalue-nya adalah 1 + r dan 1 - r. Di sini r = 0,87, jadi eigenvalue-nya 1,87 dan 0,13, PC1 adalah (0,71; 0,71), campuran kedua kolom yang sama besar, dan ia menjelaskan 93,6%.

> Perhatian: lakukan standardisasi dan PCA hanya pada baris training, lalu terapkan keduanya pada baris lain, dengan kebiasaan yang sama seperti di "Pipeline dan leakage". Lewati standardisasi hanya ketika kolom-kolomnya berbagi satuan dan selisih ukurannya memang penting, seperti kecerahan piksel.

[[figure:pca-and-explained-variance/standardize|Panjang sirip dan massa tubuh, mentah dan sesudah standardisasi. Pada data mentah, kolom massa memegang hampir semua varians dan PC1 hampir hanya sumbu massa. Sesudah standardisasi, kedua kolom dihitung sama.]]

## Yang tidak dijanjikan PCA
*Apa yang perlu kamu ingat sebelum masuk ke lab?*

- **Varians tidak sama dengan kegunaan.** PCA tidak pernah melihat label. Arah dengan varians kecil tetap dapat menjadi arah yang memisahkan dua kelas, dan membuangnya berarti kehilangan pemisahan itu.
- **Hanya sumbu lurus.** PCA memutar. Ia tidak dapat meluruskan awan yang melengkung atau berbentuk cincin, dan pelajaran berikutnya di kursus ini membahas apa yang hilang ketika komponen dibuang serta metode untuk struktur yang melengkung.
- **Outlier menarik.** Seperti di "Outlier dan korelasi", satu titik yang jauh dapat menambah banyak varians dan memutar PC1 ke arahnya.

Lab PCA, pelajaran terakhir kursus ini, membiarkanmu memutar awan titik, memproyeksikannya ke sumbu yang lebih sedikit, dan mengukur seberapa banyak informasi yang hilang. Kamu punya angka-angka dari pelajaran ini sebagai pembanding: matriks kovarians, eigenvalue, dan explained variance ratio.

::: deeper Membaca sebuah komponen
Untuk keempat kolom penguin yang distandardisasi, PC1 punya loading sekitar -0,46 untuk panjang paruh, +0,40 untuk kedalaman paruh, -0,58 untuk panjang sirip dan -0,55 untuk massa tubuh. Tiga kolom menarik ke arah yang sama dan kedalaman paruh ke arah lain, sehingga PC1 kira-kira adalah sumbu ukuran tubuh. (Tanda keseluruhannya bebas, jadi semua tanda dapat berbalik.) PC2 sebagian besar berisi kedalaman paruh dan panjang paruh, dengan hampir tidak ada sirip atau massa.
:::

::: remember
- PCA mencari arah dengan varians terbesar, lalu arah terbaik yang tegak lurus terhadapnya, dan seterusnya. Principal component ini adalah sumbu baru untuk data yang sama.
- Eigenvalue matriks kovarians adalah varians sepanjang komponen, dan explained variance ratio adalah tiap eigenvalue dibagi jumlah semuanya. Scree plot menampilkannya.
- Standardisasi dulu, atau kolom dengan satuan terbesar akan mengambil alih PC1. PCA buta terhadap label dan peka terhadap outlier.
:::
