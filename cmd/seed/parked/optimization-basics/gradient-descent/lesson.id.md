---
slug: gradient-descent
title: Gradient descent
---
::: intro
- Paham mengapa gradient descent melangkah berlawanan arah dengan gradient: gradient itu justru menunjuk ke atas.
- Dapat menghitung satu kali update dengan tangan, menggunakan rumus nilai baru = nilai lama - learning rate × gradient.
- Dapat membaca garis kontur dan verdict dari run, tahu mengapa gradient kecil belum tentu berarti titik terendah, dan sadar bahwa melatih model pada dasarnya adalah turun bukit yang sama.

Sebelum mulai: baca "Loss function".
:::

## Seperti turun bukit di tengah kabut
*Bagaimana komputer bisa menemukan titik rendah jika ia tidak pernah melihat seluruh lanskapnya?*

Bayangkan kamu berdiri di lereng bukit dan kabutnya sangat tebal. Lembah di bawah tidak kelihatan, tetapi kakimu bisa merasakan ke arah mana tanah miring. Selama kamu terus melangkah ke arah yang menurun, biasanya kamu akan sampai di tempat yang rendah.

Gradient descent bekerja persis begitu, dengan **loss** sebagai "tanahnya". Loss adalah angka yang menunjukkan seberapa meleset model kita saat ini (semakin kecil semakin bagus). Nilai loss tergantung pada **parameter**, yaitu angka-angka yang bisa diatur oleh model. Anggap loss itu ketinggian lanskap, dan parameter itu posisimu di lanskap tersebut. Karena itu, melatih model berarti berjalan menuju tempat yang rendah.

Komputer tidak pernah melihat seluruh lanskap. Yang ia ketahui hanya nilai loss dan kemiringan di posisinya sekarang. Itu sudah cukup, karena kemiringan memberi tahu ke mana arah turun.

> Gagasan kunci: gradient descent hanya mengulang satu gerakan kecil. Ukur kemiringan di tempatmu berdiri, melangkah sedikit ke arah turun, lalu ukur lagi.

## Satu parameter: kemiringan menentukan arah
*Bagaimana kemiringan memberi tahu kita harus bergerak ke mana?*

Kita mulai dari satu parameter saja, namanya x, jadi lanskapnya hanya berupa kurva. **Kemiringan** (*slope*) di suatu titik menunjukkan seberapa cepat kurva naik saat x membesar. Jika kemiringannya positif, kurva naik ke kanan, jadi arah turun ada di kiri. Jika negatif, kurva turun ke kanan, jadi arah turun ada di kanan. Semakin besar kemiringannya, semakin curam tanahnya.

[[figure:gradient-descent/slope-step|Loss di sini adalah (x - 5)² / 2, yang akan kita pakai lagi di contoh hitungan nanti. Di x = 1 kemiringannya -4, jadi kurva turun ke kanan. Dengan learning rate 0,5, langkahnya 0,5 × 4 = 2 ke kanan, sampai di x = 3.]]

Tanda kemiringan menentukan arah. Besarnya kemiringan menentukan seberapa jauh kita melangkah: tanah curam, langkahnya panjang; tanah landai, langkahnya pendek. Ada satu lagi yang ikut menentukan ukuran langkah, yaitu learning rate, angka yang kamu pilih sendiri (0,5 di gambar). Keduanya kita gabungkan di rumus update berikut.

## Rumus update
*Jadi, kemiringan itu kita apakan?*

Jika parameternya lebih dari satu, kemiringan menjadi **gradient**: satu kemiringan untuk tiap parameter, dikumpulkan menjadi satu panah. Jika parameternya hanya satu, gradient sama dengan kemiringan biasa. Gradient menunjuk **ke atas**, ke arah loss yang semakin tinggi. Karena kita ingin turun, kita melangkah ke arah sebaliknya, jadi gradient-nya dikurangkan:

```
x baru = x - learning rate × gradient
```

**Learning rate** adalah angka yang kamu tentukan sendiri, misalnya 0,5. Learning rate menentukan seberapa besar tiap langkah. Di tanah yang curam, gradient-nya besar, jadi langkahnya panjang. Semakin dekat ke dasar yang datar, gradient-nya semakin kecil, jadi langkahnya mengecil dengan sendirinya.

> Awas: gradient bukanlah langkah. Langkahnya adalah gradient dikali learning rate, lalu diambil ke arah yang berlawanan.

## Contoh hitungan
*Bisakah kita menjalankan gradient descent cukup dengan pensil dan kertas?*

Ambil loss f(x) = (x - 5)² / 2. Titik terendahnya ada di x = 5, tempat loss bernilai 0, dan kemiringannya x - 5. Tiap loss punya rumus kemiringannya sendiri, yang didapat lewat kalkulus. Di sini rumusnya langsung kita gunakan, sedangkan pada model sungguhan, software yang menghitungnya. Kita mulai dari x = 1 dengan learning rate 0,5.

| Langkah | x | Loss | Gradient (x - 5) | Pergeseran (-0,5 × gradient) | x baru |
|---|---|---|---|---|---|
| 0 | 1 | 8 | -4 | +2 | 3 |
| 1 | 3 | 2 | -2 | +1 | 4 |
| 2 | 4 | 0,5 | -1 | +0,5 | 4,5 |
| 3 | 4,5 | 0,125 | -0,5 | +0,25 | 4,75 |

Perhatikan, tiap langkah memangkas jarak ke 5 menjadi separuhnya (4, lalu 2, 1, 0,5, 0,25). Itu karena x baru - 5 = (x - 5) - 0,5 × (x - 5) = 0,5 × (x - 5). Hanya dalam tiga langkah, loss sudah turun dari 8 ke 0,125.

::: deeper Contoh hitungan dengan dua parameter
Sekarang loss-nya f(x, y) = (x - 5)² + (y - 5)², berupa mangkuk bulat. Tidak ada ½ di depannya, jadi tiap kemiringan menjadi dua kali lipat: gradient-nya (2(x - 5); 2(y - 5)). Kita mulai dari (1,5; 8) dengan learning rate 0,25. Loss awalnya (1,5 - 5)² + (8 - 5)² = 12,25 + 9 = 21,25.

1. Gradient-nya (-7; 6). Pergeserannya -0,25 × (-7; 6) = (+1,75; -1,5), jadi titiknya pindah ke (3,25; 6,5). Loss turun dari 21,25 ke 5,3125.
2. Gradient-nya (-3,5; 3). Pergeserannya (+0,875; -0,75), jadi titiknya pindah ke (4,125; 5,75). Sekarang loss-nya sekitar 1,33.

Rumus yang sama digunakan untuk semua parameter sekaligus, masing-masing dengan kemiringannya sendiri.
:::

## Dua parameter: garis kontur
*Bagaimana cara menggambar lanskap dengan dua parameter di kertas yang datar?*

Dengan dua parameter, loss membentuk permukaan. Cara menggambarnya sama seperti peta jalur pendakian, yaitu menggunakan **garis kontur** (*contour lines*): tiap garis menghubungkan titik-titik yang loss-nya sama. Selisih loss antar garis dibuat sama, jadi jika garisnya rapat, permukaannya curam; jika garisnya jarang, permukaannya landai. Lingkaran-lingkaran yang mengelilingi satu titik di sini menandai titik rendah (di peta lain, bisa saja itu puncak).

Di titik mana pun, gradient adalah panah yang menunjuk lurus ke arah menanjak. Panah itu memotong garis kontur yang melewati titik tersebut dengan sudut siku-siku. Sebabnya, sepanjang garis kontur loss tidak berubah, jadi arah menanjak sama sekali tidak sejajar dengan garis. Langkah kita ambil ke arah sebaliknya.

[[figure:gradient-descent/contour-gradient|Gradient (pink) memotong garis kontur dengan sudut siku-siku dan menunjuk ke atas. Langkah pertama (teal) menuju arah sebaliknya. Panjang panah pink tidak sesuai skala; yang penting hanya arahnya.]]

> Awas: di permukaan yang lonjong, panah turun tidak menunjuk ke titik terendah. Panah itu menunjuk ke arah turun yang paling curam dari tempatmu berdiri, dan arah itu bisa saja menyimpang dari tujuan.

## Mangkuk, jurang, dan zig-zag
*Apakah semua permukaan berperilaku seperti mangkuk bulat?*

Di **mangkuk bulat**, arah turun yang paling curam memang menunjuk ke titik terendah, jadi jalurnya lurus. Di **jurang sempit**, yang curam ke arah samping dan landai ke arah memanjang, arah turun yang paling curam lebih banyak mengarah ke dinding di seberang. Jika learning rate-nya cukup besar, satu langkah bisa menyeberangi jurang dan mendarat di sisi lain, langkah berikutnya menunjuk balik, dan jalurnya menjadi zig-zag sambil perlahan maju di sepanjang dasar.

[[figure:gradient-descent/bowl-vs-ravine|Metode yang sama di dua permukaan. Di mangkuk, jalurnya lurus (learning rate 0,25). Di jurang, jalurnya zig-zag (learning rate 0,14, dipilih lebih kecil karena 0,25 akan terlalu besar di sana).]]

Gradient hanya menggambarkan tanah tepat di tempat kita berdiri, jadi langkah yang terlalu panjang bisa melampaui target dan mendarat lebih tinggi dari titik awal. Langkah kecil memang lebih lambat, tetapi lebih aman.

> Awas: jangan berharap jalurnya selalu lurus. Zig-zag di jurang itu wajar, bukan tanda ada yang rusak. Learning rate yang lebih kecil memang menghilangkan zig-zag, tetapi perjalanannya menjadi lebih lambat.

::: deeper Mengapa jurang membuat zig-zag, jika dihitung
Loss jurang ini (x - 5)² / 2 + 6 (y - 5)², jadi kemiringannya x - 5 dan 12 (y - 5). Tiap langkah mengalikan jarak ke dasar dengan faktor yang tetap: 1 - learning rate untuk x, dan 1 - 12 × learning rate untuk y. Pada learning rate 0,14, faktornya 0,86 dan -0,68.

Tanda minus itulah yang membuat zig-zag: jarak y pindah sisi di setiap langkah. Dari 3,5 menjadi -2,38, lalu 1,62, lalu -1,10, dan terus mengecil. Jarak x menyusut pelan (0,86 per langkah), karena itu jalurnya terasa merayap. Jika learning rate-nya cukup kecil, faktor y tetap positif dan zig-zag-nya hilang. Percobaan 4 di lab memperlihatkan hal ini, dan di pelajaran berikutnya kita lihat seberapa besar learning rate boleh dinaikkan sebelum ayunannya semakin membesar.
:::

## Kapan harus berhenti
*Kapan gradient descent dianggap sudah sampai, dan apakah "sampai" sama dengan "menang"?*

Di titik rendah, tanahnya datar, jadi gradient-nya nol dan update tidak mengubah apa pun. Di masalah nyata, gradient jarang tepat nol. Karena itu run dianggap **konvergen** jika ukuran gradient-nya (panjang panahnya) sudah sangat kecil dan titiknya berhenti bergerak. Run dihentikan jika gradient-nya sudah sangat kecil, jika loss tidak membaik lagi, atau jika sudah mencapai batas langkah.

Run disebut **divergen** jika loss-nya terus membesar dan berakhir jauh di atas titik awal. Jika run hanya berayun tanpa semakin rendah, misalnya melompat bolak-balik di antara dua tempat dengan loss yang sama, lab menyebutnya "belum stabil". Selain itu, lab menulis "masih jalan", artinya gradient-nya belum kecil. Loss biasanya turun, tetapi langkah yang terlalu besar bisa menaikkannya untuk sementara.

Tanah datar juga terdapat di dasar lembah yang dangkal. Gradient descent hanya merasakan kemiringan di bawah kakinya, jadi ia tidak dapat membedakan lembah dangkal dari lembah yang paling dalam. Berhenti di lembah dangkal disebut **minimum lokal** (*local minimum*); cara mengatasinya dibahas di pelajaran berikutnya.

> Gagasan kunci: gradient kecil artinya "di sini datar", bukan "ini titik terendah yang mungkin".

## Hubungannya dengan melatih model
*Bagaimana perjalanan turun bukit ini diterapkan pada model sungguhan?*

Setiap model punya parameter. Garis lurus, prediksi = w × input + b, punya dua: kemiringan w dan intercept b. Untuk setiap pilihan w dan b, loss function mengukur seberapa jauh prediksi garis itu dari data. Datanya sendiri tetap, jadi loss hanya bergantung pada parameter. Itulah lanskap di atas w dan b, sama seperti peta kontur di pelajaran ini.

Hati-hati, jangan sampai tertukar antara dua kemiringan ini: w adalah kemiringan garis, sedangkan gradient adalah kemiringan loss. Gradient descent mulai dari tebakan, menghitung gradient untuk tiap parameter, lalu meng-update semuanya sekaligus: w baru = w - learning rate × (gradient untuk w), dan hal yang sama untuk b. Ulangi terus, dan garisnya semakin sesuai dengan data. Model sungguhan bisa punya jutaan parameter. Rumusnya tetap sama, hanya saja petanya tidak dapat kita gambar.

::: deeper Batch, mini-batch, dan stochastic
Loss pada dataset adalah rata-rata loss dari tiap contoh. Gradient descent **batch** menghitung gradient dari semua contoh sebelum tiap langkah: hasilnya akurat, tetapi lambat jika datanya besar. Gradient descent **stochastic** hanya memakai satu contoh acak per langkah: murah, tetapi *noisy*. **Mini-batch** memakai sekelompok kecil contoh acak, misalnya 32, dan ini kompromi yang paling sering digunakan. Langkah yang noisy memang agak bergoyang, tetapi rata-ratanya tetap menuju ke bawah. Lab menampilkan gradient yang tepat, seperti pada batch.
:::

::: remember
- Tiap langkah mengikuti rumus nilai baru = nilai lama - learning rate × gradient: gradient menunjuk ke atas, jadi kita kurangkan, dan learning rate menentukan ukuran langkah.
- Garis kontur adalah peta permukaan dengan dua parameter: garis yang rapat berarti curam. Jalurnya lurus di mangkuk bulat dan zig-zag di jurang.
- Run berhenti saat gradient-nya hampir nol, dan itu bisa saja baru lembah dangkal. Melatih model adalah perjalanan turun bukit yang sama, di lanskap loss dari parameternya.
:::

@@lab

## Lab: berjalan turun di permukaan loss
Plot ini adalah peta permukaan loss. Kedua sumbunya adalah dua parameter, dan tiap garis kontur menghubungkan titik-titik dengan loss yang sama. Cincin menandai titik awalmu, dan belah ketupat menandai titik terendah. **Panah pink** adalah gradient: selalu menunjuk ke atas, dan panjangnya tidak berarti apa-apa, yang penting adalah arahnya. **Panah teal** adalah langkah berikutnya, digambar dengan panjang sebenarnya dan menunjuk ke bawah.

### Kontrol
- **Permukaan loss** untuk memilih Mangkuk bulat, Jurang sempit, atau Dua lembah. Setiap kali kamu mengganti pilihan, titik awal ikut di-reset dan learning rate disesuaikan dengan permukaan itu.
- **Learning rate** adalah slider berskala logaritmik, kira-kira dari 0,003 sampai 2. Catatan di bawahnya menunjukkan batas kasar learning rate sebelum run tidak lagi konvergen di permukaan itu (dengan momentum 0).
- **Momentum (opsional)** berkisar dari 0 sampai 0,95. Momentum membawa sebagian langkah sebelumnya, seperti bola berat yang menggelinding turun bukit; pelajaran berikutnya menjelaskannya. Di 0, ini gradient descent biasa.
- **Klik atau seret plot** untuk memindahkan titik awal. Jika plot sedang terfokus, tombol panah menggesernya 0,25, atau 1 jika sambil menahan Shift.
- **Jalankan** (berubah menjadi **Jeda** saat berjalan, dan menjadi **Jalankan lagi** jika run sudah selesai, yang mengulang dari titik awal), **Langkah berikutnya**, **Langkah sebelumnya**, dan **Kecepatan** mengatur jalannya animasi. **Reset** mengembalikan semuanya ke pengaturan awal, termasuk kecepatan.
- Mengubah pengaturan apa pun akan mengembalikan perjalanan ke langkah 0, sehingga kamu perlu menekan **Jalankan** lagi.

### Cara membaca layar
- Baris status menampilkan nomor langkah, loss, ukuran gradient, dan verdict: konvergen, masih jalan, divergen, atau belum stabil. Istilahnya sama dengan yang dibahas di "Kapan harus berhenti".
- Di Dua lembah, cincin kecil menandai lembah dangkal, di samping belah ketupat untuk titik terendah.
- Grafik **Loss tiap langkah** menampilkan loss untuk setiap nomor langkah. Titik pink di tepi atas grafik artinya nilai loss-nya sudah di luar grafik.

### Percobaan
1. **Satu langkah demi satu langkah.** Di Mangkuk bulat dengan pengaturan awal (learning rate 0,25), tekan Langkah berikutnya tiga kali. Loss terbaca 21,250 di awal, lalu 5,313, 1,328, dan 0,332. Angkanya sama dengan contoh dua parameter di bagian Lebih dalam pada "Contoh hitungan" (mulai dari (1,5; 8), loss (x - 5)² + (y - 5)², learning rate 0,25). Ukuran gradient terbaca 9,220, lalu 4,610, 2,305, dan 1,152, terbagi dua pada setiap langkah. Perhatikan panah teal yang semakin pendek tetapi tetap menunjuk ke titik terendah.
2. **Terlalu kecil, atau tepat.** Masih di mangkuk, atur learning rate mendekati 0,1 lalu tekan Jalankan: run-nya konvergen, tetapi membutuhkan 24 langkah. Di sekitar 0,5, langkah pertama langsung mendarat di titik terendah. Menurutmu, mana yang akan kamu pilih untuk masalah nyata?
3. **Terlalu besar.** Di 0,89, titik melompat ke sisi seberang di setiap langkah, tetapi tetap konvergen setelah sekitar 26 langkah. Di 1,0 verdict-nya "belum stabil": titik melompat bolak-balik di antara dua tempat dengan loss yang sama. Di 1,2 run-nya divergen dan loss-nya membesar. Cari titik pink di grafik. Sedikit di atas 1,0 (coba 1,1), loss naik selama beberapa langkah sementara statusnya masih "masih jalan", sampai nilainya cukup besar untuk dihitung divergen.
4. **Zig-zag.** Pilih Jurang sempit (learning rate 0,14) lalu tekan Jalankan. Jalurnya menyeberangi dasar lembah di setiap langkah, dan verdict-nya "konvergen" setelah sekitar 30 langkah. Sekarang turunkan learning rate ke sekitar 0,05. Jalurnya tidak lagi menyeberang, tetapi membutuhkan sekitar 86 langkah. Di 0,2 run-nya divergen. Opsional: dengan 0,05, coba momentum 0,8 dan bandingkan jumlah langkahnya (sekitar 54 dibandingkan 86).
5. **Dua lembah.** Pilih Dua lembah lalu tekan Jalankan. Lihat baris status dan di mana jalurnya berakhir: ia berhenti di lembah dangkal dengan verdict konvergen, padahal itu bukan titik terendah. Klik untuk menempatkan titik awal di sekitar tengah plot (sekitar 5 di sumbu horizontal), lalu geser sedikit ke kiri atau ke kanan. Di mana titik awal harus berada agar run berakhir di lembah yang satunya?
6. **Ke mana panah menunjuk.** Di Mangkuk bulat, seret titik awal ke beberapa tempat. Panah teal selalu menunjuk ke titik terendah, dan semakin panjang jika titik awalnya semakin jauh. Lalu pilih Jurang sempit dan lakukan hal yang sama, lalu bandingkan arah panah pink dan teal dengan arah titik terendah. Ke mana keduanya menunjuk?
