---
slug: distance-and-similarity
title: Jarak dan kemiripan
---
::: intro
- Hitung jarak Euclidean, Manhattan, Chebyshev, dan cosine antara dua titik dengan tangan.
- Jelaskan bentuk "semua titik pada jarak yang sama" untuk masing-masing jarak.
- Perkirakan kapan jarak yang berbeda memilih titik terdekat yang berbeda, lalu periksa di lab Distance playground.

Sebelum mulai: baca "Bagaimana k-NN mengambil keputusan". Di sana jarak dipakai untuk mencari neighbor; pelajaran ini membahas jaraknya sendiri.
:::

## Mengapa model butuh ukuran "dekat"
*Mengapa begitu banyak model berawal dari ukuran jarak?*

Banyak model menjawab pertanyaan dengan mencari contoh yang mirip dengan contoh baru. k-nearest neighbors (k-NN), model dari pelajaran "Bagaimana k-NN mengambil keputusan", melakukannya secara langsung. Clustering (mengelompokkan contoh yang saling berdekatan, dibahas di course berikutnya) dan sistem rekomendasi (menyarankan hal yang disukai orang-orang yang serupa denganmu) bekerja dengan cara yang sama.

Agar bisa menilai "mirip", komputer membutuhkan angka. Setiap contoh adalah daftar feature, jadi ia berupa titik: dua feature memberi titik pada bidang datar, tiga feature memberi titik di dalam kotak, dan seratus feature memberi titik yang tidak dapat digambar, tetapi tetap bisa dihitung.

**Jarak** (*distance*) adalah aturan yang menerima dua titik dan mengembalikan satu angka yang menyatakan seberapa jauh keduanya. Angka kecil berarti dekat, angka besar berarti jauh.

Aturan yang masuk akal tidak hanya satu, dan memilihnya adalah keputusanmu. Ganti aturannya, dan jawaban atas "contoh mana yang menjadi neighbor-ku?" bisa ikut berubah. Pelajaran itu memakai jarak Euclidean, dan Lab k-NN memungkinkan beralih ke Manhattan. Di sini kita menambahkan Chebyshev dan cosine, menghitung keempatnya dengan tangan, lalu melihat neighbor mana yang dipilih oleh masing-masing. "Menyetel k" menentukan berapa banyak neighbor yang ditanya; pelajaran ini menentukan arti "dekat".

## Empat cara mengukur selisih
*Apa saja keempat jarak itu, dan bagaimana cara kerja masing-masing?*

Ambil dua titik, A dan B. Lihat selisih di antara keduanya pada setiap feature: ke samping (x) dan ke atas (y). Setiap aturan di bawah ini dibangun dari selisih tersebut.

| Jarak | Aturan | Gambaran |
|---|---|---|
| Euclidean | kuadratkan tiap selisih, jumlahkan, lalu tarik akar kuadratnya | garis lurus |
| Manhattan | jumlahkan selisihnya | berjalan menyusuri blok kota |
| Chebyshev | ambil selisih terbesar | satu perbedaan yang paling besar |
| Cosine | 1 dikurangi cosine sudut antara dua arah dari titik asal | hanya arah |

Tiga jarak pertama mengukur seberapa jauh kedua titik terpisah. Cosine melakukan hal yang lain: ia tidak peduli seberapa jauh tiap titik dari titik asal, dan hanya membandingkan arah yang harus kamu tuju untuk melihatnya. Cosine sudut antara dua arah bernilai 1 jika keduanya searah dan 0 pada sudut siku-siku, sehingga 1 dikurangi nilai itu kecil untuk arah yang sama. Dua titik pada satu sinar (*ray*) dari titik asal memiliki jarak cosine 0, sejauh apa pun keduanya terpisah.

> Gagasan kunci: tidak ada satu jarak yang menjadi jarak "yang benar". Setiap aturan menjawab pertanyaan yang berbeda tentang apa yang dianggap berbeda.

## Contoh hitungan
*Bisakah kita menghitung keempatnya dengan tangan?*

Ambil A = (3, 3) dan B = (7, 6), posisi awal di lab di bawah. Selisih ke samping adalah |7 − 3| = 4, dan selisih ke atas adalah |6 − 3| = 3.

[[figure:distance-and-similarity/four-distances|Dua titik yang sama diukur dengan empat cara: garis lurus, blok kota, selisih terbesar, dan sudut di titik asal.]]

1. **Euclidean.** √(4² + 3²) = √(16 + 9) = √25 = **5**.
2. **Manhattan.** 4 + 3 = **7**.
3. **Chebyshev.** Yang lebih besar antara 4 dan 3 adalah **4**.

**Cosine** membutuhkan satu gagasan lagi. Cosine sudut antara dua arah sama dengan **dot product** keduanya dibagi hasil kali panjangnya. Dot product mengalikan koordinat yang bersesuaian lalu menjumlahkan hasilnya. Langkahnya ada tiga:

- Dot product: 3 × 7 + 3 × 6 = 21 + 18 = 39.
- Panjang dari titik asal: √18 ≈ 4,243 untuk A dan √85 ≈ 9,220 untuk B. Hasil kalinya √18 × √85 = √1530 ≈ 39,115. (Mengalikan panjang yang sudah dibulatkan memberi 39,12, dan hasil akhirnya sama seperti di bawah.)
- Bagi: cos = 39 ÷ 39,115 ≈ 0,99705, sehingga jaraknya 1 − 0,99705 ≈ **0,003**. Sudut antara kedua arah itu sekitar 4,4 derajat.

Perhatikan urutannya: Chebyshev (4) paling banyak sama dengan Euclidean (5), yang paling banyak sama dengan Manhattan (7). Ini berlaku untuk setiap pasangan titik. Cosine memakai skala yang berbeda, sehingga tidak dapat disejajarkan dengan ketiganya. Lab Distance playground di bawah dibuka dengan dua titik yang sama, dan tabelnya menampilkan keempat angka ini, dengan cosine tertulis 0,003.

## Bentuk dari "semua yang sejauh ini"
*Seperti apa kumpulan titik pada satu jarak tetap?*

Pilih titik A dan radius r, lalu kumpulkan semua titik yang tepat berjarak r dari A. Setiap jarak menggambar garis tepi yang berbeda:

- **Euclidean:** sebuah lingkaran.
- **Manhattan:** sebuah belah ketupat, dengan sudutnya tepat di atas, bawah, kiri, dan kanan A.
- **Chebyshev:** sebuah persegi yang sisinya sejajar sumbu.

[[figure:distance-and-similarity/shapes-at-r|Tiga panel pertama menunjukkan titik-titik pada jarak 3 dari A. Titik uji P yang sama berada di dalam lingkaran, di luar belah ketupat, dan di dalam persegi. Panel Cosine hanyalah ilustrasi: semua titik pada satu sinar dari titik asal berjarak 0.]]

Bentuk itu memperlihatkan apa yang dianggap "sama jauh" oleh sebuah aturan. Geser satu langkah ke kanan dan satu langkah ke atas, yaitu (1, 1) dari A. Euclidean menjawab 1,41, Manhattan 2, Chebyshev 1. Gerakan diagonal itu mahal bagi Manhattan dan murah bagi Chebyshev. Karena itulah belah ketupat tertarik ke dalam pada arah diagonal, sedangkan persegi terdorong keluar sampai ke sudutnya.

Cosine tidak punya garis tepi tertutup di sekeliling sebuah titik. Semua titik pada satu sinar dari titik asal berjarak 0 satu sama lain, sehingga "bola"-nya berupa kerucut arah, bukan sebuah bentuk. Lab tidak menggambarnya, dan panel paling kanan di atas hanya menggambarkan gagasannya. Itulah sebabnya daftar Sorot di lab hanya berisi tiga yang pertama.

## Dari jarak ke kemiripan
*Bagaimana "berjauhan" sama dengan "tidak mirip"?*

**Kemiripan** (*similarity*) menyatakan seberapa mirip dua contoh. Ia adalah bayangan cermin dari jarak: jarak kecil berarti kemiripan tinggi, jarak besar berarti kemiripan rendah.

Kamu dapat mengubah jarak d apa pun menjadi kemiripan. Salah satu pilihan sederhana adalah 1 ÷ (1 + d). Pada d = 0 hasilnya 1, kemiripan tertinggi yang mungkin. Pada d = 5, jarak Euclidean di contoh hitungan, hasilnya 1 ÷ 6, sekitar 0,17. Pada d = 7, jarak Manhattan, hasilnya 1 ÷ 8 = 0,125. Rumus persisnya adalah pilihan; yang penting nilainya turun seiring bertambahnya jarak.

Cosine biasanya dijelaskan lewat kemiripan lebih dulu. **Cosine similarity** adalah cosine sudut antara dua arah: 1 untuk arah yang sama, 0 untuk sudut siku-siku. **Cosine distance** adalah 1 dikurangi nilai itu, dan itulah yang ditampilkan lab. Untuk titik dengan koordinat tidak negatif, seperti di lab, nilainya tetap antara 0 dan 1.

> Awas: cosine distance yang kecil berarti "searah", bukan "berdekatan". Di contoh hitungan, A dan B berjarak 5, tetapi cosine distance keduanya 0,003.

## Memilih jarak
*Bagaimana cara memilih di antara keempatnya?*

Mulailah dari pertanyaan yang kamu pedulikan.

- **Euclidean** adalah pilihan default yang umum jika feature memakai satuan dan skala yang sama. Karena selisihnya dikuadratkan, satu selisih besar berpengaruh banyak.
- **Manhattan** sesuai untuk kasus ketika perbedaan cukup dijumlahkan, seperti blok yang dilalui di jalanan berpola kotak. Selisihnya tidak dikuadratkan, sehingga satu selisih yang sangat besar menarik lebih sedikit daripada di Euclidean.
- **Chebyshev** sesuai untuk kasus ketika satu selisih besar saja sudah menjadi masalah. Dua komponen dianggap cocok dalam toleransi 0,1 hanya jika setiap pengukuran berselisih paling banyak 0,1, dan itu persis jarak Chebyshev paling banyak 0,1.
- **Cosine** sesuai untuk data arah, seperti jumlah kata dalam dokumen. Teks panjang dan teks pendek dengan topik yang sama memakai kata dengan proporsi yang mirip, sehingga keduanya searah walaupun panjangnya berbeda.

> Awas: Euclidean, Manhattan, dan Chebyshev sama-sama membiarkan feature dengan angka besar (misalnya pendapatan dalam dolar) menenggelamkan feature dengan angka kecil. Solusinya adalah melakukan scaling pada semua feature ke rentang yang mirip; pelajaran "Scaling dan encoding" di course "Menyiapkan data tabular" membahasnya. Plot di lab sudah melakukannya dengan memberi kedua feature rentang yang sama, 0 sampai 10.

## Jarak menentukan siapa yang terdekat
*Bisakah data yang sama menghasilkan neighbor yang berbeda?*

Bisa. "Terdekat" selalu berarti terdekat menurut suatu jarak. Bayangkan sebuah bentuk yang membesar di sekeliling query Q sampai pertama kali menyentuh sebuah titik. Lingkaran dan persegi menyentuh titik yang berbeda lebih dulu.

[[figure:distance-and-similarity/nearest-changes|Data yang sama, diukur dengan dua cara. P1 lurus ke samping; P2 berada di diagonal.]]

Taruh Q di titik asal. P1 di (2, 0). P2 di (1,6; 1,6).

- Euclidean: P1 berjarak 2,00, P2 berjarak √(1,6² + 1,6²) = 2,26. **P1 terdekat.**
- Chebyshev: P1 berjarak 2,00, P2 berjarak 1,6. **P2 terdekat.**
- Manhattan: P1 berjarak 2,00, P2 berjarak 3,2. **P1 terdekat.**

Di lab, kamu dapat melihat pembalikan yang sama dengan sembilan titik acuan. Di "Bagaimana k-NN mengambil keputusan", neighbor-lah yang memberikan suara, jadi jarak yang berbeda dapat berarti pemberi suara yang berbeda dan prediksi yang berbeda. "Lab k-NN" punya kontrol Jarak untuk mencobanya pada titik berlabel.

## Jarak menjadi kabur di banyak dimensi
*Apakah jarak masih berguna dengan ratusan feature?*

Masih berguna, tetapi informasinya berkurang. Dengan dua feature, sebagian titik jelas dekat dengan query dan sebagian lain jelas jauh. Ketika jumlah feature sangat besar, jarak antartitik cenderung mengumpul: titik terdekat tidak jauh lebih dekat daripada titik terjauh. Dalam simulasi singkat (100 titik acak di dalam kotak dan satu query acak, dirata-ratakan dari 2000 kali percobaan), titik terdekat berjarak sekitar 0,05 kali jarak titik terjauh dengan 2 feature, dan sekitar 0,76 kali dengan 100 feature. Dalam keadaan itu, "terdekat" kurang bermakna, dan model yang dibangun di atasnya punya bekal yang lebih sedikit.

Inilah salah satu alasan orang mengurangi jumlah feature sebelum memakai metode berbasis jarak, dan mengapa memilih feature dengan cermat itu penting. "Bagaimana k-NN mengambil keputusan" menyebut hal ini sebagai curse of dimensionality.

::: deeper Rumus untuk sebarang jumlah feature
Untuk titik a dan b dengan n feature, tulis aᵢ dan bᵢ untuk feature ke-i.

- Euclidean: akar kuadrat dari jumlah (aᵢ − bᵢ)².
- Manhattan: jumlah |aᵢ − bᵢ|.
- Chebyshev: |aᵢ − bᵢ| yang terbesar.
- Cosine distance: 1 − (a · b) ÷ (|a| |b|), dengan a · b adalah jumlah aᵢ × bᵢ dan |a| adalah akar kuadrat dari jumlah aᵢ².

Ini efek yang berbeda dari penumpukan jarak di atas: ketiga aturan itu juga tumbuh dengan cara yang berbeda ketika n bertambah. Jika dua titik berbeda tepat 1 pada setiap dari 100 feature, Euclidean bernilai √100 = 10, Manhattan 100, dan Chebyshev tetap 1.
:::

::: deeper Cosine mengabaikan panjang
Regangkan B dari (7, 6) menjadi (14, 12), dua kali lebih jauh dari titik asal, pada arah yang sama. Dot product dengan A menjadi 3 × 14 + 3 × 12 = 78, dan panjang B menjadi dua kali lipat, 2 × √85, sehingga cos = 78 ÷ (√18 × 2√85) = 39 ÷ √1530, sama seperti sebelumnya. Cosine distance-nya tetap sekitar 0,003, sedangkan jarak Euclidean melonjak dari 5 menjadi √(11² + 9²) = √202 ≈ 14,2.

Titik di titik asal sama sekali tidak punya arah, sehingga cosine distance tidak terdefinisi untuknya. Jika kamu memindahkan A atau B tepat ke (0, 0), tabel di lab menampilkan "tidak terdefinisi" pada baris cosine.
:::

::: remember
- Jarak mengubah "seberapa mirip?" menjadi angka; jarak kecil berarti kemiripan tinggi.
- Euclidean, Manhattan, dan Chebyshev menggambar lingkaran, belah ketupat, dan persegi. Cosine membandingkan arah dan mengabaikan panjang.
- Pilihan jarak dapat mengubah titik mana yang terdekat, sehingga ia menjadi bagian dari model.
:::


@@lab

## Lab: dua titik, empat jarak
Lab ini bernama Distance playground. Dua titik, A dan B, berada di sebuah plot bersama sembilan titik acuan berwarna abu-abu. Lab dibuka dengan A di (3, 3) dan B di (7, 6), pasangan dari contoh hitungan, serta lingkaran berarsir berradius 3 di sekeliling A. Sumbu plot adalah **Feature 1** (ke samping) dan **Feature 2** (ke atas), masing-masing dari 0 sampai 10.

### Kontrol
- **Sorot** memilih jarak yang menggambar bentuk berarsir, mengisi baris status pertama, dan menentukan titik acuan terdekat: **Euclidean**, **Manhattan**, atau **Chebyshev**. Cosine tidak ada di daftar karena ia tidak punya garis tepi di sekeliling sebuah titik.
- **Jarak dari A** adalah radius bentuk itu, dari 0,5 sampai 8. Nilai awalnya 3,0.
- **Tampilkan bentuknya** menyalakan atau mematikan bentuk berarsir. Tepinya adalah semua titik yang tepat sejauh itu dari A, dan arsirannya mencakup semua titik yang lebih dekat.
- **Tandai acuan terdekat ke A** mewarnai titik abu-abu terdekat menjadi hijau, melingkarinya, dan memberinya label nomornya.
- **Seret** A atau B dengan mouse atau jari.
- **Keyboard.** Klik plot agar mendapat fokus. **Spasi** berpindah antara A dan B. **Tab** berpindah dari A ke B, dan **Shift+Tab** dari B kembali ke A; Tab pada B keluar dari plot, jadi kamu tidak akan terjebak. **Tombol panah** menggeser titik terpilih sebesar 0,25 satuan, dan menahan **Shift** menggesernya satu satuan penuh.
- **Reset** mengembalikan A dan B ke (3, 3) dan (7, 6). Kontrol lain tidak berubah, begitu juga titik yang sedang dipilih.
- **Layar penuh** memperbesar lab.

### Membaca layar
- Plot menampilkan A dan B sebagai penanda belah ketupat yang dihubungkan garis putus-putus abu-abu, serta sembilan **Titik acuan** abu-abu. Titik-titik ini dibuat dengan seed tetap, sehingga sembilan titiknya selalu sama dan tidak pernah bergerak. Selama **Tandai acuan terdekat ke A** aktif, titik yang terdekat ke A menjadi hijau, diberi lingkaran, dan diberi label seperti #1. Legenda di bawah plot menamainya: **A dan B (bisa digeser)**, **Titik acuan**, dan **Terdekat ke A**.
- Kotak status berisi dua baris. Baris pertama, misalnya "Jarak Euclidean A ke B: 5,00", mengikuti **Sorot**. Baris kedua berbunyi "Titik acuan terdekat ke A: #1 (jarak 1,46)." dan mengukur dengan jarak yang sama. Jika tombolnya mati, baris itu berbunyi "Penanda titik acuan dimatikan."
- Selama plot mendapat fokus, baris pertama diawali dengan titik terpilih beserta posisinya, misalnya "A di (3,00; 3,00)", dan sebuah lingkaran mengelilingi titik itu.
- Tabel **Jarak dari A ke B** memiliki kolom **Jarak** dan **A ke B**, serta empat baris: **Euclidean**, **Manhattan**, **Chebyshev**, dan **Cosine (dari titik asal)**. Keempatnya selalu ditampilkan, dengan tiga angka desimal. Di awal nilainya 5,000; 7,000; 4,000; dan 0,003. Baris cosine berbunyi "tidak terdefinisi" jika A atau B tepat berada di (0, 0), karena titik itu tidak punya arah.

### Eksperimen
Resep keyboard yang dipakai di bawah: klik bagian plot yang kosong, baca baris status pertama, lalu tekan **Spasi** jika yang disebut titik yang salah ("A di" atau "B di"). Memakai **Sorot**, **Jarak dari A**, atau **Reset** melepas fokus dari plot, dan Reset mempertahankan pilihan lama, jadi ulangi resep itu setelahnya. Semua posisi di bawah tepat, sehingga kamu dapat memeriksanya di baris status.

1. **Letakkan B di tepi.** Prediksi: B berjarak 5 dari A pada garis lurus. Jika kamu mengatur **Jarak dari A** ke 5, apakah B berada di tepi lingkaran, dan apakah ia juga berada di tepi belah ketupat dan persegi pada 5? Tekan **Reset**, atur **Sorot** ke Euclidean dan jaraknya ke 5. Lalu atur Sorot ke Manhattan dan jaraknya ke 7, kemudian ke Chebyshev dan jaraknya ke 4. Setiap kali, B tepat berada di tepi, sesuai dengan tabel. Jelaskan: selisihnya sama, 4 ke samping dan 3 ke atas, jadi mengapa ketiga bentuk itu membutuhkan radius yang berbeda?
2. **Bawa B ke sudut.** Prediksi: jika B berada di sudut persegi Chebyshev berradius 3, apakah jarak Euclidean dan Manhattan ke B lebih kecil dari 3, sama dengan 3, atau lebih besar? Tekan **Reset**, ikuti resep untuk memilih B, lalu tekan **Shift+Kiri** sekali, sehingga B berada di (6, 6). Atur **Sorot** ke Chebyshev dan **Jarak dari A** ke 3. B berada di sudut. Tabel menunjukkan 4,243; 6,000; 3,000; dan 0,000. Jelaskan: kedua selisihnya 3, jadi berapa jumlah Euclidean dan Manhattan? Mengapa cosine 0,000?
3. **Ubah panjang, pertahankan arah.** Prediksi: dari keadaan itu, geser B lurus keluar sepanjang diagonal ke (9, 9). Baris tabel mana yang berubah, dan mana yang tetap? Ikuti resep untuk memilih B, tekan **Shift+Kanan** tiga kali dan **Shift+Atas** tiga kali. Tabel menunjukkan 8,485; 12,000; 6,000; dan 0,000. Jelaskan: B meluncur di sinar yang sama dari titik asal yang dilalui A. Apa yang diabaikan cosine?
4. **Dekat di ruang, jauh di arah.** Prediksi: pasangan awal berjarak 5 dengan cosine 0,003. Sekarang ambil A di (1, 1) dan B di (1, 3). Pasangan mana yang lebih dekat menurut jarak Euclidean, dan mana yang cosine distance-nya lebih besar? Tekan **Reset**, pilih A lalu tekan **Shift+Kiri** dua kali dan **Shift+Bawah** dua kali. Kemudian pilih B dan tekan **Shift+Kiri** enam kali dan **Shift+Bawah** tiga kali. Tabel menunjukkan 2,000; 2,000; 2,000; dan 0,106. Jelaskan: mengapa tiga yang pertama sama di sini, dan mengapa pasangan yang lebih dekat di ruang justru lebih jauh dalam arah?
5. **Amati titik terdekat berubah.** Prediksi: dengan A di (4; 4,75), apakah Euclidean, Manhattan, dan Chebyshev menandai titik acuan yang sama? Tekan **Reset**, pilih A, tekan **Shift+Kanan** sekali dan **Atas** tujuh kali. Ganti **Sorot** di antara ketiganya dan baca baris status kedua: Euclidean menandai #2 pada 2,65, Manhattan menandai #4 pada 3,51, Chebyshev menandai #2 pada 2,08. Sekarang pilih A lagi, tekan **Shift+Kiri** sekali dan **Bawah** tiga kali, sehingga A berada di (3, 4). Euclidean menandai #1 pada 2,46, Manhattan menandai #1 pada 2,54, dan Chebyshev menandai #4 pada 2,20. Jelaskan: di (4; 4,75), #4 hanya berselisih 0,56 ke samping tetapi 2,95 ke atas, sedangkan #2 berselisih 1,65 ke samping dan 2,08 ke atas. Mengapa Manhattan memilih yang timpang dan Chebyshev memilih yang lain?
6. **Penguin sungguhan, dan trio baru.** Prediksi: Q adalah penguin Adelie dengan bill 46,0 mm dan flipper 194 mm. P1 punya bill 35,5 mm dan flipper 195 mm, sedangkan P2 punya bill 37,2 mm dan flipper 178 mm. Mana di antara keduanya yang lebih dekat ke Q menurut jarak Euclidean, Manhattan, dan Chebyshev? Lab tidak punya pilihan untuk data nyata, jadi kamu memasukkan penguinnya dengan tangan. Panjang bill (32,1 sampai 59,6 mm pada 342 penguin di dataset course yang punya pengukuran) menjadi Feature 1 dan panjang flipper (172 sampai 231 mm) menjadi Feature 2, masing-masing diskalakan ke 0 sampai 10 dan dibulatkan ke 0,25 terdekat. Hasilnya Q di (5; 3,75), P1 di (1,25; 4) dan P2 di (1,75; 1). Matikan **Tandai acuan terdekat ke A**, karena titik abu-abu bukan penguin. Tekan **Reset**, pilih A dan letakkan di Q (**Shift+Kanan** dua kali, **Atas** tiga kali), lalu pilih B dan letakkan di P1 (**Shift+Kiri** lima kali, **Kiri** tiga kali, **Shift+Bawah** dua kali) dan baca tabelnya: 3,758; 4,000; dan 3,750. Pindahkan B ke P2 (**Kanan** dua kali, **Shift+Bawah** tiga kali): 4,257; 6,000; dan 3,250. Euclidean dan Manhattan menyebut P1 lebih dekat, sedangkan Chebyshev menyebut P2 lebih dekat. Sekarang trio baru: Q adalah Adelie dengan bill 36,5 mm dan flipper 181 mm, di (1,5; 1,5); P1 (38,6 mm; 199 mm) di (2,25; 4,5) dan P2 (42,8 mm; 195 mm) di (4, 4). Tabel memberi 3,092 dan 3,536 untuk Euclidean, 3,750 dan 5,000 untuk Manhattan, serta 3,000 dan 2,500 untuk Chebyshev: terbagi dengan cara yang sama. Jelaskan: P2 lebih jauh secara total, tetapi selisih terbesarnya lebih kecil. Apakah kamu menduga hasilnya sama pada trio ketiga, dan apa yang akan kamu periksa?
