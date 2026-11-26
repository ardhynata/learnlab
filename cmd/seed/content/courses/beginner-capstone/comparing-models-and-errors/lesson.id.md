---
slug: comparing-models-and-errors
title: Membandingkan model dan kesalahannya
---
::: intro
- Bandingkan dua model secara adil: baris yang sama, feature yang sama, metrik yang sama, dan hanya satu perubahan setiap kali.
- Baca selisih antara skor training dan skor held-out, lalu ulangi pada split baru sebelum kamu mempercayai sebuah perbedaan.
- Buat daftar kesalahan model, cari polanya, beri nama pada tiga kesalahan yang mewakili, dan tulis laporan singkat.

Sebelum mulai: baca "Framing and baselines", "Underfitting and overfitting" dan "Confusion matrix and rates".
:::

## Dua model, satu pertanyaan
*Mengapa satu skor saja tidak cukup untuk menentukan pemenang?*

Tugasnya adalah pertanyaan ya atau tidak pada tabel penguin: apakah penguin ini Chinstrap, bukan Adelie? Ada 219 penguin dengan keempat pengukuran lengkap (panjang paruh, kedalaman paruh, panjang sirip, dan massa tubuh): 151 Adelie dan 68 Chinstrap. Kita menyisihkan 55 di antaranya sebagai held-out, yaitu 17 Chinstrap dan 38 Adelie, lalu melatih model pada 164 penguin sisanya.

Baseline selalu menjawab "Adelie". Jawabannya benar untuk 38 dari 55 penguin held-out: 69,1%. Pelajaran ini memakai split baru, yaitu 164 penguin training dan 55 penguin held-out, sehingga baseline di sini 69,1% dan bukan 68,2% seperti di "Framing and baselines". Aturan satu feature dari pelajaran itu juga tidak dipakai di sini, agar perbandingannya tetap antara dua model. Dua model mencoba mengalahkannya: **k-NN** dengan 5 neighbor dan **decision tree** dengan kedalaman 3. Keduanya melihat keempat pengukuran, dan untuk k-NN nilainya sudah di-scaling.

| Model | Benar pada 55 penguin held-out | Accuracy |
|---|---|---|
| Baseline, selalu Adelie | 38 | 69,1% |
| k-NN, k = 5 | 54 | 98,2% |
| Decision tree, kedalaman 3 | 55 | 100% |

Tree menang tipis, hanya selisih satu penguin, dan ia menemukan ke-17 Chinstrap. k-NN menemukan 16 dari 17: recall sebesar 94,1%. Apakah tree otomatis model yang lebih baik? Satu kali jalan pada satu split bisa menyesatkan. Sisa pelajaran ini membahas cara membuat jawabannya bermakna.

> Gagasan kunci: sebuah perbandingan hanya sekuat aturan yang dipakai saat menjalankannya.

## Aturan yang sama untuk kedua model
*Apa yang harus tetap identik ketika kamu membandingkan dua model?*

Perbandingan disebut adil jika satu-satunya perbedaan antara kedua sisi adalah hal yang ingin kamu uji. Ada tiga hal yang harus sama.

- **Split yang sama.** Kedua model dilatih pada 164 penguin yang sama dan diuji pada 55 penguin yang sama. Jika setiap model memakai hasil shuffle yang berbeda, salah satunya mendapat ujian yang lebih mudah.
- **Feature yang sama.** Keduanya menerima keempat pengukuran yang sama, dengan persiapan yang sama. Kalau satu model melihat kolom tambahan, yang kamu bandingkan adalah informasinya, bukan modelnya.
- **Metrik yang sama.** Pilih metrik sebelum melihat hasil. Di sini metriknya accuracy, ditambah recall untuk Chinstrap. Berganti ke metrik yang paling menguntungkan model favoritmu sama saja dengan menipu diri sendiri.

[[figure:comparing-models-and-errors/fair-comparison|Perbandingan yang adil: baris dan metrik yang sama di kedua sisi, dan hanya modelnya yang berbeda.]]

> Awas: nilai kedua model pada jenis baris yang sama. k-NN dengan k = 1 benar untuk 100% penguin yang dipakai melatihnya, karena setiap penguin menjadi neighbor terdekat bagi dirinya sendiri. Jika angka itu disandingkan dengan 98,2% milik k = 5 pada baris held-out, k = 1 tampak lebih baik. Padahal pada baris held-out, k = 1 hanya mendapat 96,4%.

## Skor training dan skor held-out
*Apa yang diceritakan oleh selisih kedua skor itu?*

Setiap model punya dua skor: satu pada baris training dan satu pada baris held-out. Jarak di antara keduanya disebut **gap**. Model yang menghafal baris training akan menunjukkan skor training yang tinggi dan skor held-out yang lebih rendah.

[[figure:comparing-models-and-errors/train-vs-held-out|Skor training (cincin) dan skor held-out (titik) untuk lima model pada satu split. Angka di sebelah kanan adalah skor training dikurangi skor held-out, dalam poin.]]

> Contoh hitungan: k = 1 benar pada 164 dari 164 penguin training (100%) dan pada 53 dari 55 penguin held-out (96,4%). Gap-nya 100 - 96,4 = 3,6 poin. k = 5 benar pada 160 dari 164 (97,6%) dan pada 54 dari 55 (98,2%). Skor held-out-nya justru 0,6 poin lebih tinggi, sehingga tidak ada tanda bahwa ia menghafal.

Jangan menafsirkan gap yang kecil terlalu jauh. Satu penguin held-out bernilai 1 / 55 = 1,8 poin, sedangkan satu penguin training hanya 1 / 164 = 0,6 poin. Gap satu atau dua poin, ke arah mana pun, hanyalah noise. Laporkan kedua skor: skor held-out menunjukkan seberapa baik model pada baris baru, dan gap menunjukkan apakah model menghafal.

## Satu perubahan setiap kali
*Bagaimana kamu tahu perubahan mana yang menggeser skor?*

Ubah satu hal saja di antara dua kali jalan, dan simpan catatan: satu baris untuk tiap run, berisi apa yang diubah dan kedua skornya. Kalau kamu berpindah dari k-NN ke tree sambil membuang dua feature, lalu skornya bergeser, kamu tidak dapat mengatakan perubahan mana penyebabnya.

Berikut catatan pada split yang sama. Run 2 hanya mengubah k. Run 4 hanya mengubah kedalaman.

| Run | Yang diubah | Training | Held-out |
|---|---|---|---|
| 1 | k-NN, k = 5 | 97,6% | 98,2% |
| 2 | hanya k: 5 menjadi 1 | 100% | 96,4% |
| 3 | decision tree, kedalaman 3 | 97,6% | 100% |
| 4 | hanya kedalaman: 3 menjadi 10 | 100% | 98,2% |

Kedua perubahan yang membuat model "lebih fleksibel" menghasilkan hal yang sama pada split ini. Skor training naik menjadi 100%, sedangkan skor held-out turun satu penguin. Itu sesuai dengan yang kamu lihat di "Underfitting and overfitting": model yang lebih fleksibel mencocokkan baris training dengan lebih rapat, dan itu belum tentu membuatnya lebih baik pada baris baru.

> Gagasan kunci: hasil yang dapat kamu jelaskan dengan satu perubahan lebih berharga daripada skor yang lebih baik tetapi tidak dapat dijelaskan.

## Ulangi pada split baru
*Apakah tree benar-benar lebih baik, atau split yang satu ini kebetulan menguntungkannya?*

Keunggulan tree hanya satu penguin dari 55, yaitu 1,8 poin. Shuffle yang lain bisa dengan mudah membaliknya. Karena itu, ulangi seluruh perbandingan pada split baru: shuffle baru, aturan yang sama, dan kedua model dinilai pada baris held-out baru yang sama.

Berikut sepuluh split, masing-masing dengan 164 penguin training dan 55 penguin held-out. Setiap sel menghitung kesalahan pada 55 penguin held-out.

[[figure:comparing-models-and-errors/ten-splits|Kesalahan pada 55 penguin held-out di sepuluh split. Tree menang dua kali, k-NN menang tiga kali, dan lima split seri.]]

Dalam sepuluh split, k-NN membuat 13 kesalahan dan tree membuat 15, dari 10 x 55 = 550 jawaban untuk masing-masing. Itu setara dengan 97,6% melawan 97,3%. Pemenangnya berganti dari split ke split, dan separuh split berakhir seri. Ringkasan yang jujur: kedua model kurang lebih setara di sini, dan keduanya jauh di atas baseline 69,1%.

::: deeper Sepuluh split bukan sepuluh uji yang independen
Kesepuluh split memotong 219 penguin yang sama, sehingga penguin yang sulit akan masuk ke set held-out pada sekitar satu dari empat split. Oleh karena itu, kesepuluh skor itu bukan sepuluh bukti yang terpisah. Skor-skor itu memberi gambaran seberapa jauh skor bergeser mengikuti cara pemotongan, dan itulah pertanyaan yang kita bahas di sini. Skor itu tidak dapat memberitahumu bagaimana kinerja model pada penguin dari pulau lain atau tahun lain.
:::

## Mendaftar kesalahan
*Di mana model salah, dan apakah ia salah pada penguin yang sama setiap kali?*

Skor menghitung jumlah kesalahan, tetapi tidak menunjukkan kesalahan yang mana. Karena itu, buatlah daftar. Untuk setiap jawaban yang salah, catat kelas sebenarnya, kelas yang diprediksi, pengukurannya, dan seberapa yakin model. Setelah itu cari polanya: jenis kesalahan (Chinstrap yang terlewat adalah false negative, Adelie yang salah ditandai adalah false positive), ciri yang dimiliki bersama oleh penguin yang salah, dan penguin yang muncul berulang kali.

> Contoh hitungan: dalam sepuluh split, k-NN membuat 13 kesalahan: 12 Chinstrap yang terlewat dan 1 alarm palsu. Namun ke-13 kesalahan itu hanya berasal dari 6 penguin yang berbeda. Satu penguin salah di semua 4 split saat ia menjadi held-out, satu lagi salah 3 dari 3, dua lainnya 2 dari 2, dan dua lagi hanya sekali. Lima dari enam penguin itu adalah Chinstrap betina. Yang keenam adalah Adelie jantan.

Jika sebuah kesalahan hanya karena kebetulan, shuffle yang lain akan memindahkannya. Kesalahan ini terus kembali, sehingga penyebabnya ada pada penguinnya atau pada apa yang boleh dilihat model.

> Gagasan kunci: kesalahan yang berulang di berbagai split adalah informasi tentang datanya, bukan noise dari split.

## Memberi nama pada kesalahan yang mewakili
*Alasan apa saja yang dapat berada di balik sebuah kesalahan?*

Kamu tidak mungkin mempelajari setiap kesalahan, karena itu pilih beberapa yang mewakili sisanya dan beri masing-masing nama. Ada empat alasan yang umum.

- **Overlap antarkelas.** Kedua kelas memang sama-sama menghasilkan pengukuran seperti itu.
- **Pengukuran yang tidak biasa.** Penguin itu jauh dari penguin tipikal di kelasnya sendiri, atau nilainya mungkin salah ketik.
- **Kemungkinan label noise.** Labelnya bisa saja salah. Periksa hal ini ketika model salah dengan yakin di setiap split dan barisnya tidak aneh.
- **Feature yang hilang.** Informasi yang dapat memisahkan kedua kelas tidak ada di antara kolom yang dilihat model.

[[figure:comparing-models-and-errors/bill-overlap|Panjang paruh 151 Adelie (atas) dan 68 Chinstrap (bawah), dalam bin 1 mm. Berlian bernomor menandai tiga kesalahan pada tabel.]]

| Kesalahan | Yang kita lihat | Nama | Yang perlu diperiksa |
|---|---|---|---|
| 1. Chinstrap betina, paruh 42,5 mm, terlewat 4 dari 4 kali | Hanya 4 dari 68 Chinstrap yang paruhnya sependek ini atau lebih pendek, tetapi 12 dari 151 Adelie yang paruhnya sepanjang ini atau lebih panjang | Overlap | Lihat pengukuran lain dari penguin-penguin ini. |
| 2. Adelie jantan, sirip 210 mm, dikira Chinstrap sekali | Sirip terpanjang dari 151 Adelie: (210 - 190,0) / 6,5 = 3,1 simpangan baku di atas rata-rata mereka | Pengukuran tidak biasa | Salah ketik atau memang burung yang besar? |
| 3. Chinstrap betina, paruh 46,0 mm, terlewat 3 dari 3 kali | 15 dari 15 Chinstrap dengan paruh 46 mm atau kurang adalah betina, dan 12 dari 12 Adelie dengan paruh 42,5 mm atau lebih adalah jantan | Feature yang hilang | Tambahkan `sex` sebagai feature dan ujilah. |

> Awas: sebuah nama adalah hipotesis, bukan bukti. Tabel ini tidak dapat memberitahumu apakah salah satu penguin ini punya label yang salah, dan tidak dapat memberitahumu apakah menambahkan `sex` akan membantu sampai kamu mencobanya. Tidak satu pun dari ketiga contoh itu menunjukkan label noise, itulah sebabnya ia tetap menjadi kemungkinan dan bukan temuan. Satu kesalahan juga bisa cocok dengan dua nama: baris 1 dan 3 sama-sama Chinstrap betina dengan paruh di zona overlap, dan nama yang dipilih adalah hipotesis yang kamu uji lebih dulu.

::: deeper Mengapa penguin yang sulit tidak dibuang saja?
Membuang penguin yang salah dijawab model membuat skor held-out tampak lebih bagus, tetapi tidak berarti apa-apa. Baris held-out harus tetap apa adanya. Jika sebuah kesalahan ternyata salah ketik atau label yang keliru, perbaiki di sumbernya lalu jalankan seluruh perbandingan lagi dari split yang baru.
:::

## Isi laporan singkat
*Apa yang dibutuhkan pembaca agar mempercayai hasilmu?*

Laporan singkat panjangnya setengah halaman. Laporan itu harus memungkinkan pembaca mengulangi apa yang kamu lakukan dan melihat seberapa jauh hasilnya dapat dipercaya. Tulis enam bagian berikut.

1. **Pertanyaan dan data.** Pertanyaan ya atau tidaknya, jumlah baris, dan baris mana yang disisihkan beserta alasannya.
2. **Baseline.** Skor yang harus dikalahkan: selalu Adelie, 69,1%.
3. **Model dan apa yang berbeda.** Kedua model, pengaturannya, dan satu perubahan di antara run.
4. **Hasil.** Skor training dan held-out untuk kedua model pada split yang sama, diulang pada sepuluh split.
5. **Tiga kesalahan.** Masing-masing dengan namanya dan pemeriksaan yang akan kamu lakukan berikutnya.
6. **Kesimpulan dan batasan.** Apa yang kamu simpulkan, dan apa yang tidak dapat kamu tunjukkan.

> Contoh hitungan: "Pada 219 penguin, saya bertanya apakah seekor penguin adalah Chinstrap, bukan Adelie. Baseline mendapat 69,1%. Dalam sepuluh split, k-NN membuat 13 kesalahan dan tree kedalaman 3 membuat 15, dari 550 jawaban untuk masing-masing, sehingga saya tidak dapat membedakan keduanya. Enam penguin menjadi penyebab semua kesalahan k-NN; lima di antaranya Chinstrap betina, sehingga langkah berikutnya saya akan menguji `sex` sebagai feature."

Dalam pelajaran "Beginner capstone project", yang terakhir di kursus ini, kamu menjalankan langkah-langkah tersebut sendiri di lab-nya dan menulis versi laporanmu sendiri.

::: remember
- Bandingkan model pada split yang sama, dengan feature dan metrik yang sama, dan ubah satu hal saja setiap kali.
- Laporkan skor training dan skor held-out, lalu ulangi pada split baru sebelum menyebut sebuah pemenang.
- Daftar kesalahan, cari yang berulang, dan beri nama pada beberapa kesalahan yang mewakili sebagai hipotesis untuk diperiksa.
:::
