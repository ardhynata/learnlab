---
slug: randomized-experiments-and-power
title: Eksperimen acak dan power
---
::: intro
- Jelaskan mengapa pemberian perlakuan secara acak membuat selisih rata-rata yang sederhana dapat memperkirakan efeknya.
- Hitung sebuah A/B test dengan tangan: selisih, standard error, interval 95%, dan p-value, lalu sebutkan apa yang tidak dikatakan p-value.
- Tentukan ukuran test dengan power dan minimum detectable effect, dan sebutkan akibat peeking dan banyak perbandingan terhadap false positive.

Sebelum mulai: baca "Variabilitas sampling dan bootstrap" di kursus Probabilitas dan ketidakpastian statistik.
:::

## Mengapa perlu diacak
*Mengapa lemparan koin membuat dua kelompok dapat dibandingkan secara adil?*

Pelajaran sebelumnya bertanya seberapa baik sebuah model memprediksi. Pelajaran ini bertanya: **apa yang terjadi jika kita mengubah sesuatu?** Apakah halaman checkout baru membuat lebih banyak pembeli menyelesaikan pembelian? Perubahan itu disebut **perlakuan** (*treatment*), dan angka yang kamu ukur sesudahnya adalah **outcome**.

Setiap pembeli hanya melihat satu halaman. Kamu tidak pernah tahu apa yang akan dilakukan orang yang sama di halaman lainnya, sehingga yang dibandingkan adalah orang yang berbeda. Perbandingan itu adil hanya jika kedua kelompok serupa dalam segala hal, kecuali halamannya.

**Random assignment** membuat keduanya serupa. Ketika lemparan koin yang menentukan siapa mendapat halaman baru, tidak ada ciri pembeli (belanja sebelumnya, perangkat, suasana hati) yang dapat mengarahkan siapa masuk ke mana. Kedua kelompok hanya berbeda karena kebetulan dan karena halamannya. **Selisih rata-rata** (rata-rata outcome kelompok perlakuan dikurangi rata-rata outcome kelompok kontrol) memperkirakan **average treatment effect**, yaitu perubahan rata-rata yang disebabkan halaman itu. Tidak perlu model apa pun.

[[figure:randomized-experiments-and-power/random-assignment|40 pembeli yang sama, 12 di antaranya sering membeli, dibagi dengan dua cara. Lemparan koin menyisakan selisih kecil karena kebetulan. Ketika pembeli memilih sendiri, halaman baru mengumpulkan sebagian besar pembeli yang sering membeli.]]

> Gagasan kunci: pengacakan tidak membuat kedua kelompok identik. Ia membuat selisih di antara keduanya murni kebetulan, dan kebetulan dapat diukur.

## Sebuah A/B test dengan tangan
*Seberapa besar selisih dua kelompok, dan seberapa yakin kita?*

**A/B test** adalah eksperimen acak dengan dua versi: A, halaman yang berlaku sekarang, dan B, halaman baru. Angka di sini karangan untuk pelajaran ini. Sebuah toko melempar koin untuk setiap dari 4.000 pengunjung, sehingga masing-masing halaman dilihat 2.000 orang. Pembelian dicatat sebagai 1 dan tidak membeli sebagai 0, sehingga rata-rata outcome adalah tingkat pembelian.

| | Kontrol (A) | Halaman baru (B) |
| --- | --- | --- |
| Pengunjung | 2.000 | 2.000 |
| Pembelian | 200 | 240 |
| Tingkat pembelian | 10% | 12% |

Selisihnya 12% - 10% = 2 poin persentase. Variabilitas sampling, dari "Variabilitas sampling dan bootstrap", berarti setiap tingkat bergoyang dari sampel ke sampel. Untuk sebuah tingkat, SE = sqrt(p × (1 - p) / n).

> Contoh hitungan: SE untuk A adalah sqrt(0,10 × 0,90 / 2.000) = sqrt(0,000045) = 0,0067. SE untuk B adalah sqrt(0,12 × 0,88 / 2.000) = sqrt(0,0000528) = 0,0073. Kedua kelompok saling independen, sehingga varians dijumlahkan: sqrt(0,000045 + 0,0000528) = sqrt(0,0000978) = 0,00989, atau 0,989 poin. Interval 95% adalah 2 ± 1,96 × 0,989 = 2 ± 1,94, yaitu 0,06 sampai 3,94 poin.

Jangan menjumlahkan kedua SE itu (0,0067 + 0,0073): hasilnya melebih-lebihkan goyangan. Acak per orang, bukan per kunjungan halaman, karena kunjungan oleh satu orang bukan sampel yang independen.

## Hipotesis nol dan p-value
*Apa yang dikatakan p-value, dan apa yang tidak?*

**Hipotesis nol** (*null hypothesis*) menyatakan bahwa efek sebenarnya tepat 0, sehingga setiap selisih hanya kebetulan. **P-value** bertanya: jika hipotesis nol benar, seberapa sering kebetulan saja menghasilkan selisih sebesar ini atau lebih, ke arah mana pun?

> Contoh hitungan: selisihnya 2 poin dan SE-nya 0,989, sehingga ia berada 2 / 0,989 = 2,02 standard error dari 0. Tabel normal menempatkan sekitar 0,0216 selisih kebetulan di luar 2,02 pada tiap sisi, sehingga p kira-kira 2 × 0,0216 = 0,043. Ini sejalan dengan intervalnya: 0,06 sedikit di atas 0, dan p sedikit di bawah 0,05.

[[figure:randomized-experiments-and-power/null-and-interval|Atas: seberapa besar selisih yang muncul karena kebetulan ketika efek sebenarnya 0, dengan kedua ekor yang diarsir dijumlahkan menjadi p-value. Bawah: selisih yang teramati beserta interval 95%-nya.]]

Ada empat salah baca yang umum:

- p = 0,043 **bukan** peluang 4,3% bahwa halaman itu tidak berpengaruh. Ia mengandaikan hipotesis nol dan bertanya tentang data.
- Ia **bukan** ukuran efek. Test yang sangat besar dapat memberi p kecil untuk selisih yang terlalu kecil untuk berarti.
- p yang besar **tidak** menunjukkan bahwa efeknya tidak ada. Ia hanya berarti data tidak dapat memisahkan efek dari kebetulan.
- Garis 0,05 hanyalah konvensi. Nilai p 0,043 dan 0,057 kira-kira sama kuat sebagai bukti.

> Awas: hasil ini hanya sedikit signifikan dan intervalnya lebar. Efek sebenarnya bisa hampir nol atau sekitar 4 poin.

## Power dan minimum detectable effect
*Berapa banyak pengunjung yang dibutuhkan sebuah test untuk menemukan efek yang nyata?*

**Power** adalah peluang sebuah test menyatakan efek yang nyata sebagai signifikan. Target yang umum adalah 80%. Test kita menyebut selisih signifikan jika lebih besar dari 1,96 × 0,989 = 1,94 poin. Misalkan kenaikan sebenarnya memang 2 poin. Selisih yang kita lihat bergoyang di sekitar 2, sehingga ia melewati 1,94 hanya sekitar 52% dari waktu. Untuk efek yang ditemukannya, test itu hampir seperti lemparan koin.

**Minimum detectable effect** (MDE) adalah efek sebenarnya terkecil yang ditemukan test dengan power 80%. Besarnya 2,80 × SE, dengan 2,80 adalah 1,96 + 0,84 (bagian kedua menambah power). Di sini MDE-nya 2,80 × 0,989 = 2,77 poin. Kenaikan sebenarnya sebesar 2 poin berada di bawahnya.

[[figure:randomized-experiments-and-power/power-curves|Power naik seiring jumlah pengunjung per grup, dan lebih cepat untuk kenaikan sebenarnya yang lebih besar dari baseline 10%. Titik-titiknya menandai test kita, dengan 2.000 per grup, dan ukuran yang dihitung di bagian berikutnya.]]

MDE bergantung pada jumlah pengunjung, derau pada outcome, dan power yang kamu minta. Pengunjung berada di bawah akar kuadrat, sehingga memperkecil MDE setengahnya memerlukan sekitar empat kali lipat pengunjung.

::: deeper Dari mana angka 2,80 berasal
Test dinyatakan signifikan jika selisihnya melebihi 1,96 SE. Agar test melewati garis itu pada 80% kesempatan, efek sebenarnya harus berada 0,84 SE di atasnya, karena 80% dari kurva lonceng terletak di bawah 0,84 SE dari pusatnya. Jadi efek sebenarnya adalah 1,96 + 0,84 = 2,80 SE. Periksa: 0,84 standard error di atas garis menghasilkan power sekitar 80%.
:::

## Menentukan ukuran test dengan tangan
*Berapa banyak pengunjung yang dibutuhkan test halaman baru?*

Balik aturan MDE tadi. Untuk kenaikan target d, jumlah pengunjung yang dibutuhkan di tiap grup adalah n = 2,80² × (p_A × (1 - p_A) + p_B × (1 - p_B)) / d². Ini rumus SE yang diselesaikan untuk n.

> Contoh hitungan: baseline 10%, target 12%, sehingga d = 0,02. Kedua varians adalah 0,10 × 0,90 = 0,09 dan 0,12 × 0,88 = 0,1056, yang jumlahnya 0,1956. Maka n = 7,84 × 0,1956 / 0,0004 = 3.834 pengunjung per grup, atau 7.668 seluruhnya, sekitar dua kali 2.000 kita. Pada ukuran itu SE-nya 0,714 poin, dan 2 / 0,714 = 2,80.

Sekarang minta kenaikan 1 poin, dari 10% ke 11%. Kedua variansnya 0,09 dan 0,0979, sehingga n = 7,84 × 0,1879 / 0,0001 = 14.731 per grup. Kenaikan separuhnya memerlukan hampir empat kali lipat pengunjung.

Tentukan kenaikan yang layak dicari sebelum test dijalankan. Kenaikan yang lebih kecil mungkin nyata, tetapi terlalu mahal untuk dikejar. Kenaikan target kamu pilih dari nilai perubahan itu, bukan dari apa yang dapat dicapai test.

## Peeking dan banyak perbandingan
*Mengapa sering mengintip, atau mengukur banyak hal, dapat membuat ketiadaan efek tampak seperti ada?*

Batas 5% menjanjikan false positive sebesar 5% jika kamu melihat **sekali**, pada akhir yang sudah direncanakan. **Peeking** melanggar janji itu: kamu mengecek tiap hari dan berhenti begitu p turun di bawah 0,05. Setiap pengecekan adalah kesempatan baru bagi keberuntungan. Dalam simulasi eksperimen tanpa efek nyata, berhenti pada pengecekan signifikan pertama menyatakan menang sekitar 8% dari waktu dengan 2 pengecekan, 14% dengan 5, 19% dengan 10, dan 25% dengan 20.

**Banyak perbandingan** (*multiple comparisons*) menghasilkan hal yang sama lewat keluasan. Uji m metrik atau versi, masing-masing pada 0,05, padahal tidak ada yang nyata, dan peluang paling sedikit satu metrik tampak signifikan adalah 1 - 0,95^m. Itu 22,6% untuk 5 dan 64% untuk 20.

[[figure:randomized-experiments-and-power/false-positives|Peluang paling sedikit satu false positive ketika tidak ada yang nyata. Pengecekan berulang pada satu test naik lebih lambat daripada test yang terpisah, dan keduanya melewati target 5%.]]

Cara mencegahnya: tetapkan ukuran sampel dan hari berhenti sebelum mulai, lalu lihat sekali. Jika harus melihat berulang kali, pakai metode yang dirancang untuk itu, dengan batas lebih ketat pada tiap pengecekan. Tetapkan satu metrik utama sejak awal. Untuk beberapa uji, aturan Bonferroni membagi batasnya dengan m, sehingga 20 uji memakai 0,05 / 20 = 0,0025.

> Awas: kemenangan yang ditemukan setelah banyak pengecekan atau banyak metrik adalah petunjuk untuk diuji lagi, bukan temuan.

## Guardrail metric dan rencana
*Apa lagi yang harus dipantau selain metrik yang kamu harapkan naik?*

**Guardrail metric** adalah metrik yang tidak boleh memburuk selagi metrik utama membaik: tingkat refund, waktu muat halaman, berhenti berlangganan. **Metrik utama** menentukan apakah perubahan dirilis, dan guardrail yang dilanggar dapat memvetonya. Halaman kita mungkin menaikkan pembelian 2 poin dan tetap menaikkan refund. Tetapkan guardrail sebagai batas sebelum peluncuran (misalnya refund tidak boleh naik lebih dari 0,5 poin) dan periksa terhadap intervalnya.

Periksa juga bahwa pembagiannya sendiri berjalan benar. Lemparan koin 50/50 pada 4.000 pengunjung seharusnya memberi sekitar 2.000 tiap kelompok, dengan simpangan sekitar sqrt(4.000 × 0,25) = 31,6. Jika kamu melihat 2.150 dan 1.850, masing-masing kelompok menyimpang 150 dari 2.000, yaitu 4,7 kali simpangan tersebut: ada yang rusak pada pembagiannya, dan hasil dari test itu tidak dapat dipercaya.

Tulis rencana sebelum peluncuran:

- metrik utama dan guardrail-nya;
- unit yang diacak (pembeli);
- kenaikan yang layak dicari dan ukuran sampel yang dibutuhkannya (di sini 3.834 per grup);
- hari berhenti, dan satu kali kamu akan membaca hasilnya.

## Ketika kamu tidak dapat mengacak
*Apa yang dapat dilakukan ketika lemparan koin tidak mungkin?*

Kadang kamu tidak dapat, atau tidak boleh, menentukan perlakuan: ia berbahaya, mustahil (kejadiannya sudah lewat), terlalu mahal, atau kelompok-kelompoknya saling memengaruhi. Ada tiga jalan keluar yang umum, dan masing-masing memerlukan asumsi yang harus kamu nyatakan.

- **Acak sesuatu yang dekat.** Undang orang secara acak untuk memakai suatu fitur, tentukan seluruh toko atau kota, atau luncurkan perubahan dengan urutan acak.
- **Cari natural experiment.** Undian, atau aturan batas seperti "nilai di atas 60 lulus", dapat membagi orang hampir seperti secara kebetulan.
- **Bandingkan pada data observasi.** Bandingkan orang yang menerima dan yang tidak menerima perlakuan, lalu sesuaikan untuk apa yang membedakan mereka. Di sinilah selisih rata-rata biasa gagal.

Pelajaran berikutnya, "Confounding dan efek perlakuan", menunjukkan bagaimana ia gagal dan apa yang harus diasumsikan untuk memperbaikinya. Kursus ini berakhir di pelajaran "Causal lab", tempat kamu membuat data yang mengandung confounding dan membandingkan perkiraan dari data observasi dengan eksperimen acak simulasi, sehingga kamu melihat sendiri apa yang diberikan lemparan koin.

::: remember
- Random assignment membuat kedua kelompok serupa selain karena kebetulan, sehingga selisih rata-rata memperkirakan average treatment effect. Standard error dan interval 95%-nya menunjukkan seberapa jauh kebetulan dapat menggesernya.
- P-value adalah seberapa sering kebetulan saja memberi selisih sebesar ini jika efeknya 0. Ia bukan peluang bahwa hipotesis nol benar, dan bukan ukuran efek. Tentukan ukuran test lebih dulu: MDE = 2,80 × SE, dan untuk memperkecilnya setengah diperlukan sekitar empat kali lipat pengunjung.
- Peeking dan banyak perbandingan menggelembungkan false positive. Tetapkan rencana, satu metrik utama, dan hari berhenti sejak awal, dan pantau guardrail.
:::
