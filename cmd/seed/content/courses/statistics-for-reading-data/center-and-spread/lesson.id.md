---
slug: center-and-spread
title: Pusat dan sebaran data
---
::: intro
- Hitung rata-rata dan median dari sebuah kolom, lalu jelaskan kapan keduanya berbeda.
- Ukur sebaran data dengan varians dan simpangan baku, langkah demi langkah.
- Baca histogram untuk melihat bentuk sebuah distribusi.

Sebelum mulai: baca "Data, features and labels".
:::

## Dua pertanyaan tentang sebuah kolom
*Mengapa satu kolom penuh cukup diringkas dengan dua angka saja?*

Tabel penguin yang kita pakai memuat 342 panjang flipper. Tidak ada orang yang dapat membaca 342 angka sekaligus dan langsung melihat polanya, sehingga kita meringkasnya. Dua pertanyaan sudah mencakup sebagian besar isi sebuah ringkasan. **Di mana letak tengahnya?** Itulah **pusat** data. **Seberapa jauh nilai-nilai menyebar dari pusat itu?** Itulah **sebaran**.

Setiap pertanyaan punya lebih dari satu jawaban, dan jawaban-jawaban itu tidak setara. Pelajaran ini membahas yang utama: rata-rata dan median untuk pusat, varians dan simpangan baku untuk sebaran, serta histogram untuk gambaran keseluruhan, yang disebut **distribusi** dari kolom tersebut.

Sepanjang pelajaran kita memakai lima panjang flipper asli dalam milimeter, yaitu lima penguin Adelie pertama di tabel yang punya data pengukuran: **181, 186, 195, 193, 190**. Cukup kecil untuk dihitung dengan pensil.

Apa gunanya dalam machine learning? Model berbasis jarak, seperti k-NN dan k-means di kursus-kursus berikutnya, bergantung pada sebaran setiap feature, sehingga hal pertama yang dilakukan pada kolom baru adalah melihat pusat dan sebarannya.

## Rata-rata
*Apa yang kamu dapat saat sebuah total dibagi rata?*

**Rata-rata** (mean) adalah jumlah semua nilai dibagi banyaknya nilai. Angka ini menunjukkan berapa besar tiap nilai seandainya total itu dibagi sama rata.

> Contoh hitungan: 181 + 186 + 195 + 193 + 190 = 945. Ada 5 nilai, sehingga rata-ratanya 945 / 5 = 189 mm.

Sekarang ukur jarak tiap nilai dari 189: -8, -3, +6, +4, dan +1. Jumlahnya 0. Hasil ini selalu berlaku, dan inilah cara terbaik membayangkan rata-rata: ia adalah **titik keseimbangan**. Bayangkan nilai-nilai itu sebagai beban yang sama berat di atas penggaris. Rata-rata adalah titik tempat penggaris itu seimbang.

[[figure:center-and-spread/mean-and-median|Lima panjang flipper pada garis bilangan. Rata-rata (segitiga) menyeimbangkan beban; median (garis putus-putus) adalah nilai yang di tengah. Flipper keenam yang lebih panjang menarik rata-rata lebih jauh daripada median.]]

> Gagasan kunci: rata-rata memakai besar setiap nilai, sehingga nilai yang jauh dari yang lain ikut menariknya. Ini berguna saat setiap nilai memang penting, dan menjadi masalah saat ada satu nilai yang tidak biasa.

## Median
*Apa nilai tengahnya, dan kapan ia berbeda dari rata-rata?*

**Median** adalah nilai tengah setelah kolom diurutkan. Median hanya memakai urutan nilai, bukan besarnya.

> Contoh hitungan: setelah diurutkan, kelima panjang kita adalah 181, 186, **190**, 193, 195. Nilai tengahnya, yang ketiga, adalah 190 mm. Rata-ratanya tadi 189, maka keduanya hampir sama.

Jika banyak nilainya genap, tidak ada satu nilai yang tepat di tengah, maka dua nilai tengah dirata-ratakan. Misalkan penguin keenam bergabung, seekor Gentoo dengan flipper 217 mm. Setelah diurutkan: 181, 186, 190, 193, 195, 217. Mediannya (190 + 193) / 2 = 191,5 mm. Rata-ratanya menjadi (945 + 217) / 6 = 193,7 mm, setelah dibulatkan.

Flipper yang panjang itu menggeser rata-rata sekitar 4,7 mm (dari 189 ke 193,7), tetapi median hanya bergeser 1,5 mm (dari 190 ke 191,5). Median tidak peduli seberapa jauh 217 dari nilai-nilai lainnya; ia hanya mencatat bahwa nilai itu yang terbesar.

> Awas: tidak ada yang "paling benar" di antara keduanya. Rata-rata menjawab "berapa nilai tiap anggota jika total dibagi sama rata?", sedangkan median menjawab "seperti apa nilai yang berada di tengah?". Pelajaran berikutnya menunjukkan apa yang terjadi pada masing-masing saat ada nilai yang sangat ekstrem.

## Varians dan simpangan baku
*Bagaimana mengukur seberapa jauh nilai-nilai menyebar dari pusatnya?*

Rentang (nilai terbesar dikurangi nilai terkecil) memang cepat dihitung, tetapi hanya memakai dua nilai. Ide yang lebih baik memakai semua nilai: ambil selisih tiap nilai dari rata-rata, lalu rata-ratakan selisih itu. Masalahnya, selisih-selisih itu berjumlah 0, seperti yang sudah kamu lihat. Karena itu tiap selisih **dikuadratkan** lebih dulu, sehingga semuanya positif dan selisih yang besar mendapat bobot lebih. Rata-rata dari selisih kuadrat itu adalah **varians**. Akar kuadratnya adalah **simpangan baku** (SD).

> Contoh hitungan: rata-ratanya 189.

| Nilai | Selisih dari 189 | Selisih kuadrat |
|---|---|---|
| 181 | -8 | 64 |
| 186 | -3 | 9 |
| 195 | +6 | 36 |
| 193 | +4 | 16 |
| 190 | +1 | 1 |

Jumlah kuadratnya 126, sehingga variansnya 126 / 5 = 25,2 mm². SD-nya adalah akar kuadrat dari 25,2, sekitar 5,02 mm. Flipper yang tipikal dalam kelompok ini kira-kira berjarak 5 mm dari rata-rata.

[[figure:center-and-spread/deviations|Selisih tiap nilai dari rata-rata, lalu selisih kuadratnya. Selisih terbesar, 8 mm, menyumbang 64 dari total 126.]]

Varians memakai satuan kuadrat (mm²), yang sulit dibayangkan. SD kembali ke satuan milimeter, sehingga SD-lah yang biasa dilaporkan.

::: deeper Dibagi n atau n - 1
Pelajaran ini membagi selisih kuadrat dengan n, yaitu banyaknya nilai. Banyak buku teks dan fungsi spreadsheet membaginya dengan n - 1 saat nilai-nilai itu hanyalah sampel kecil dari kelompok yang lebih besar. Untuk kelima flipper kita, hasilnya 126 / 4 = 31,5 dan SD sekitar 5,61 mm. Kedua versi itu makin mendekat seiring n bertambah. Periksa dulu versi mana yang dipakai sebuah tool sebelum kamu membandingkan angka.
:::

## Distribusi
*Seperti apa tampilan seluruh kolom?*

Dua angka tidak dapat menunjukkan segalanya. **Histogram** membagi rentang sebuah kolom menjadi bin (selang, misalnya 170 sampai 175 mm) yang lebarnya sama, lalu menghitung berapa nilai yang jatuh ke tiap bin. Batang yang tinggi menandakan tempat nilai-nilai menumpuk.

Bentuk yang perlu dicari: **simetris** (sebuah bukit dengan kedua sisi serupa), **menceng** (satu sisi punya ekor panjang), dan **beberapa punuk**, yang sering berarti baris-barisnya berasal dari kelompok berbeda.

[[figure:center-and-spread/penguin-shapes|Dua kolom dari seluruh 342 penguin yang terukur. Massa tubuh punya satu bukit dan ekor panjang di kanan. Panjang flipper punya dua punuk.]]

Massa tubuh ke-342 penguin itu punya rata-rata sekitar 4.202 g dan median 4.050 g. Rata-ratanya lebih tinggi karena ekor di sisi kanan menariknya ke atas, seperti pada contoh enam penguin tadi. Panjang flipper punya dua punuk: flipper yang lebih pendek (Adelie dan Chinstrap) dan yang lebih panjang (Gentoo). Rata-ratanya, sekitar 200,9 mm, jatuh di lembah di antara kedua punuk, tempat yang justru jarang ditempati penguin.

> Gagasan kunci: pusat dan sebaran menggambarkan sebuah kolom dengan baik hanya jika kolom itu punya satu punuk. Buat histogramnya dulu sebelum kamu mempercayai kedua angka itu.

::: deeper Seberapa lebar satu simpangan baku
Untuk kolom berbentuk bukit, sebagian besar nilai berada dalam kisaran beberapa SD dari rata-rata. Periksa pada 151 panjang flipper Adelie: rata-ratanya 189,95 mm dan SD-nya 6,52 mm (dibagi n). Sekitar 71% penguin berada dalam satu SD dari rata-rata, dan sekitar 95% dalam dua SD. Ini hasil pengukuran untuk satu kolom, bukan hukum yang berlaku untuk setiap kolom.
:::

## Membaca pusat dan sebaran bersama-sama
*Ringkasan mana yang sebaiknya dilaporkan, dan apa yang diceritakannya?*

Dua kolom dapat punya pusat yang sama tetapi sebaran yang sangat berbeda. Daftar 8, 10, 12 dan 2, 10, 18 sama-sama punya rata-rata 10. Daftar pertama punya SD sekitar 1,6 dan yang kedua sekitar 6,5, sehingga daftar kedua jauh lebih tersebar.

Sebaran juga menunjukkan apakah selisih antarpusat itu besar. Pada tabel penguin, massa tubuh Adelie punya rata-rata sekitar 3.701 g dan SD 457 g. Gentoo punya rata-rata sekitar 5.076 g dan SD 502 g. Kedua pusat itu berbeda sekitar 1.375 g, sekitar tiga SD dari masing-masing spesies. Itulah sebabnya massa tubuh membantu membedakan kedua spesies.

## Ringkasan mana yang dilaporkan
*Bagaimana memilih antara rata-rata dan median?*

Aturan praktis untuk menentukan apa yang dilaporkan:

- Kolom yang kira-kira simetris dengan satu punuk: **rata-rata** dan **SD**.
- Kolom yang menceng, atau yang punya nilai tidak biasa: **median**, dan sebutkan bahwa itu median.
- Kolom dengan beberapa punuk: tampilkan histogramnya, dan pertimbangkan tiap kelompok secara terpisah.

Standardisasi, yang akan kamu temui di "Scaling and encoding" nanti, dibangun dari kedua angka ini: z = (nilai - rata-rata) / SD.

Lab yang menutup kursus ini meminta kamu menambahkan titik buatanmu sendiri ke dalam data. Kamu akan menambahkan titik yang tidak biasa lalu menggesernya menjauh, dan mengamati rata-rata, median, dan korelasi, mana yang bergerak dan mana yang tetap, pertama pada titik buatan lalu pada penguin sungguhan. Pelajaran berikutnya menyiapkanmu untuk itu: isinya tentang outlier dan korelasi.

::: remember
- Rata-rata adalah titik keseimbangan dan memakai besar setiap nilai; median adalah nilai tengah dan hanya memakai urutan.
- Varians adalah rata-rata selisih kuadrat dari rata-rata; simpangan baku adalah akar kuadratnya, dalam satuan semula.
- Histogram menunjukkan bentuk: kemencengan menarik rata-rata menjauh dari median, dan beberapa punuk berarti satu pusat tidak cukup.
:::
