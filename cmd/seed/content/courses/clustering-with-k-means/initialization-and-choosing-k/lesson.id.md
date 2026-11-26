---
slug: initialization-and-choosing-k
title: Posisi awal dan memilih k
---
::: intro
- Jelaskan mengapa k-means dapat berakhir pada pengelompokan yang berbeda jika centroid awalnya berbeda.
- Jalankan beberapa kali dengan posisi awal berbeda, lalu simpan hasil dengan inertia terendah.
- Baca tabel inertia terhadap k, dan jelaskan mengapa inertia saja tidak dapat menentukan k.

Sebelum mulai: baca "Apa itu clustering".
:::

## Satu putaran k-means dalam satu menit
*Apa yang dilakukan k-means, dan angka apa yang berusaha dikecilkannya?*

k-means mengelompokkan titik di sekitar **centroid**, yaitu pusat setiap kelompok. Kamu menentukan **k**, jumlah kelompok, sebelum algoritma mulai. Setelah itu ia mengulang dua langkah:

1. **Assign.** Setiap titik dimasukkan ke centroid terdekatnya.
2. **Update.** Setiap centroid dipindah ke rata-rata titik-titik yang masuk ke dalamnya.

Proses berhenti ketika langkah assign tidak mengubah apa pun. Skor yang terus diturunkannya adalah **inertia**: jumlah kuadrat jarak dari setiap titik ke centroid-nya, dijumlahkan untuk semua titik. Inertia kecil berarti kelompoknya rapat.

> Gagasan kunci: kedua langkah tidak pernah menaikkan inertia, sehingga putaran ini selalu berhenti. Namun ia berhenti pada jawaban stabil pertama yang dicapainya, dan jawaban itu bergantung pada posisi awal centroid.

Pelajaran ini membahas dua pilihan yang kamu buat sebelum putaran berjalan: di mana centroid mulai, dan berapa nilai k. Putarannya sendiri akan kamu jalankan di lab k-means pada pelajaran berikutnya.

## Contoh kecil untuk dihitung dengan tangan
*Bagaimana menghitung inertia hanya dengan pensil?*

Ambil enam titik pada sebuah garis: 0, 1, 10, 11, 20 dan 21. Kamu dapat melihat tiga kelompok yang masing-masing berisi dua titik. Coba k = 3 dengan centroid awal pada titik 0, 10 dan 20.

1. **Assign.** Titik 0 dan 1 masuk ke centroid di 0. Titik 10 dan 11 masuk ke centroid di 10. Titik 20 dan 21 masuk ke centroid di 20.
2. **Update.** Centroid pindah ke rata-rata kelompoknya: 0,5, 10,5 dan 20,5.
3. **Assign lagi.** Tidak ada yang berubah, sehingga proses berhenti.

Inertia adalah jumlah kuadrat jarak. Di setiap kelompok, kedua titik berjarak 0,5 dari rata-ratanya, sehingga tiap kelompok menyumbang 0,25 + 0,25 = 0,5. Tiga kelompok memberi 0,5 + 0,5 + 0,5 = 1,5.

Ingat angka ini: **1,5**. Itulah inertia terbaik yang dapat dicapai oleh tiga kelompok dari titik-titik ini.

## Ketika posisi awal yang buruk membuat proses macet
*Dapatkah k-means berakhir di hasil yang lebih buruk tanpa menyadarinya?*

Pakai titik yang sama dan k = 3, tetapi letakkan centroid awal di 0, 1 dan 10. Dua centroid mulai berdampingan.

1. **Assign.** Titik 0 masuk ke centroid pertama dan titik 1 ke centroid kedua. Titik 10, 11, 20 dan 21 semuanya paling dekat dengan centroid di 10.
2. **Update.** Dua centroid pertama tetap di 0 dan 1. Centroid ketiga pindah ke (10 + 11 + 20 + 21) / 4 = 15,5.
3. **Assign lagi.** Titik 10 berjarak 5,5 dari 15,5, tetapi 9 dari 1, sehingga ia tetap di tempatnya. Tidak ada yang berubah, sehingga proses berhenti.

[[figure:initialization-and-choosing-k/two-starts|Enam titik yang sama dan k = 3 dari dua posisi awal. Lingkaran menandai centroid awal, belah ketupat menandai centroid akhir.]]

Hasilnya adalah kelompok {0}, {1} dan {10, 11, 20, 21}. Kelompok terakhir menyumbang 5,5² + 4,5² + 4,5² + 5,5² = 30,25 + 20,25 + 20,25 + 30,25 = 101, sehingga inertia-nya **101**, dibandingkan 1,5 dari posisi awal pertama. Setiap titik sudah berada di centroid terdekatnya, dan setiap centroid sudah berada di rata-rata titiknya, sehingga tidak ada langkah yang dapat menurunkan inertia. Putarannya tidak salah. Ia hanya tidak dapat melihat bahwa ada jawaban yang lebih baik.

## Jalankan beberapa kali, simpan inertia terendah
*Bagaimana melindungi diri dari posisi awal yang kurang beruntung?*

Menjalankan k-means itu murah, karena itu jalankan beberapa kali dari posisi awal acak yang berbeda, lalu simpan run dengan inertia terendah. Setiap run pada data dan k yang sama berakhir dengan inertia yang dapat dibandingkan.

| Centroid awal | Kelompok akhir | Inertia |
| --- | --- | --- |
| 0, 10, 20 | {0, 1} {10, 11} {20, 21} | 1,5 |
| 0, 1, 10 | {0} {1} {10, 11, 20, 21} | 101 |
| 0, 10, 11 | {0, 1} {10, 11} {20, 21} | 1,5 |

Posisi awal ketiga juga dimulai dengan sepasang centroid yang berdekatan, tetapi ia pulih: pada update pertama, centroid di 11 tertarik ke arah 20 dan 21 (menjadi 17,33), lalu pengelompokannya menjadi benar. Hasil yang dipertahankan adalah run mana pun dengan inertia 1,5.

> Awas: bandingkan inertia hanya antar-run dengan data, jarak dan k yang sama. Inertia dari k yang berbeda tidak boleh dipakai untuk menentukan run mana yang lebih baik, karena ia selalu turun ketika k naik (lihat di bawah).

## Posisi awal yang lebih cerdas: k-means++
*Dapatkah kita membuat posisi awal yang buruk lebih jarang terjadi, tanpa sekadar mengulang?*

Gagasan **k-means++** adalah menyebar centroid awal. Pilih centroid pertama dari data secara acak. Centroid berikutnya juga dipilih secara acak, tetapi setiap titik diberi bobot sebesar kuadrat jaraknya ke centroid terdekat yang sudah terpilih. Titik yang jauh mendapat bobot besar sehingga besar peluang terpilih. Titik yang persis di samping centroid terpilih hampir tidak mendapat bobot.

Misalkan centroid pertama adalah titik 0. Kuadrat jarak titik 1, 10, 11, 20 dan 21 adalah 1, 100, 121, 400 dan 441, yang jumlahnya 1063. Peluang memilih 21 adalah 441 / 1063, sekitar 41,5%, dan peluang memilih 1 adalah 1 / 1063, sekitar 0,09%. Pemilihan acak biasa memberi masing-masing dari kelima titik itu peluang 20%.

[[figure:initialization-and-choosing-k/plusplus-weights|Peluang setiap titik menjadi centroid kedua ketika centroid pertama ada di 0: pemilihan acak biasa dibandingkan k-means++.]]

k-means++ membuat posisi awal dengan dua centroid berdekatan menjadi jarang, tetapi ia tetap acak dan tidak menjamin jawaban terbaik. Banyak pustaka memakainya sebagai pengaturan bawaan dan tetap menjalankan beberapa posisi awal.

## Inertia selalu turun ketika k naik
*Mengapa inertia terendah tidak dapat menentukan k untukmu?*

Semakin banyak centroid, semakin dekat setiap titik ke salah satunya. Ambil pengelompokan terbaik untuk setiap k pada keenam titik:

| k | 1 | 2 | 3 | 4 | 5 | 6 |
| --- | --- | --- | --- | --- | --- | --- |
| Inertia | 401,5 | 101,5 | 1,5 | 1 | 0,5 | 0 |

Dengan k = 6, setiap titik menjadi centroid-nya sendiri, sehingga semua jarak bernilai 0 dan inertia-nya 0. Itu skor sempurna untuk jawaban yang tidak berguna: ia tidak menggambarkan apa pun. Karena itu kamu tidak dapat memilih k dengan inertia terkecil. Kamu memerlukan aturan lain.

Nilai untuk k = 1 mudah diperiksa: rata-rata keenam titik adalah 10,5, dan kuadrat jaraknya adalah 110,25 + 90,25 + 0,25 + 0,25 + 90,25 + 110,25 = 401,5.

## Elbow dan cara lain untuk memilih
*Bagaimana memilih k jika inertia yang lebih kecil selalu tersedia?*

Gambar inertia terhadap k, lalu cari **elbow**, yaitu titik ketika penurunan besar berganti menjadi penurunan kecil. Di sini inertia turun 300 dari k = 1 ke 2 dan turun 100 dari 2 ke 3, lalu hanya turun 0,5 dari 3 ke 4. Tekukannya ada di k = 3, sesuai dengan tiga kelompok yang dapat kamu lihat.

[[figure:initialization-and-choosing-k/elbow|Inertia untuk k = 1 sampai 6 pada keenam titik. Setelah k = 3, garisnya hampir datar.]]

Data nyata lebih berantakan, dan tekukannya bisa landai atau tidak ada. Jika demikian, andalkan dua pemeriksaan lain:

- **Pertimbangan bidangnya.** Jika kamu membuat zona pengantaran untuk empat mobil pengantar, k = 4 mungkin sudah tepat, apa pun kata kurvanya.
- **Kegunaan.** Lihat kelompoknya. Jika dua di antaranya tampak serupa bagi manusia, k kemungkinan terlalu besar.

Skor bernama **silhouette** juga dapat membandingkan beberapa nilai k. Kamu akan bertemu dengannya di kursus tentang bentuk cluster dan evaluasi.

## Bawa ke lab
*Apa yang perlu diperhatikan ketika kamu menjalankan k-means sendiri?*

Di pelajaran berikutnya kamu menjalankan k-means langkah demi langkah di lab k-means. Kamu akan melihat hal yang sama seperti di sini, pada plot tempat kamu dapat menggeser centroid:

- Jalankan data yang sama dari centroid awal yang berbeda, lalu bandingkan inertia akhirnya, seperti pada tabel di atas.
- Ubah k dan amati bagaimana inertia bergerak. Tanyakan pada dirimu di mana elbow-nya.
- Jika dua run berbeda hasil, simpan yang inertia-nya lebih rendah, lalu periksa secara visual apakah kelompoknya masuk akal.

::: deeper Mengapa posisi awal yang buruk tetap macet
Pada jawaban yang macet, langkah assign memberi setiap titik centroid terdekatnya, sehingga tidak ada titik yang ingin pindah. Langkah update menaruh setiap centroid di rata-rata titiknya, yang merupakan tempat terbaik bagi titik-titik itu. Kedua langkah sudah sebaik mungkin, sehingga inertia tidak dapat turun lagi. Jawaban yang lebih baik ada (1,5), tetapi untuk mencapainya sebuah centroid harus melompati celah, dan tidak ada langkah yang melakukannya. Inilah yang disebut **local optimum**: jawaban terbaik di sekitarnya, bukan yang terbaik secara keseluruhan.
:::

::: remember
- k-means berhenti pada pengelompokan stabil yang bergantung pada centroid awal, dan posisi awal yang berbeda dapat memberi inertia yang sangat berbeda (1,5 melawan 101 di sini).
- Jalankan beberapa posisi awal, atau pakai k-means++ untuk menyebarkannya, lalu simpan inertia terendah untuk k yang sama.
- Inertia selalu turun ketika k naik, karena itu pilih k dengan elbow, pertimbangan bidang, dan pemeriksaan kelompok secara langsung.
:::
