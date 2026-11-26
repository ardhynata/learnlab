---
slug: naive-bayes
title: Classifier naive Bayes
---
::: intro
- Gunakan aturan Bayes untuk memberi skor pada setiap kelas bagi sebuah pesan, dan jelaskan mengapa suku evidence boleh dibuang jika kamu hanya membandingkan kelas.
- Jelaskan asumsi independensi bersyarat, mengapa asumsi itu disebut "naive", dan mengapa classifier tersebut tetap sering berhasil.
- Hitung prediksi multinomial naive Bayes dengan tangan memakai Laplace smoothing, lalu ulangi dalam log probabilitas.

Sebelum mulai: baca "Probabilitas bersyarat dan aturan Bayes" dan "Bag of words dan TF-IDF".
:::

## Aturan Bayes untuk kelas
*Bagaimana aturan Bayes memilih kelas untuk sebuah pesan?*

Pelajaran sebelumnya mengubah pesan menjadi bag of words: kata apa saja yang ada dan seberapa sering muncul, tanpa memedulikan urutan. Pelajaran ini memilih kelas untuk bag seperti itu. Kita pakai dua kelas, spam dan ham (surat biasa).

Di "Probabilitas bersyarat dan aturan Bayes", prior diperbarui dengan evidence. Sekarang evidence-nya adalah kata-kata dalam pesan. Untuk setiap kelas c:

P(c | words) = P(c) x P(words | c) / P(words)

**Prior** P(c) menyatakan seberapa umum kelas itu. **Likelihood** P(words | c) menyatakan seberapa besar kemungkinan pesan dari kelas tersebut memuat kata-kata ini. Suku terakhir, P(words), bernilai sama untuk semua kelas, sehingga tidak mengubah kelas mana yang lebih besar. Buang saja, lalu bandingkan **skor**-nya:

score(c) = P(c) x P(words | c)

Kelas dengan skor lebih besar menang. Untuk mengubah skor menjadi probabilitas, bagi tiap skor dengan jumlah semua skor.

[[figure:naive-bayes/flow|Naive Bayes menghitung skor tiap kelas sebagai prior dikali satu faktor per kata, lalu memilih skor terbesar.]]

> Gagasan kunci: classifier berbasis aturan Bayes tidak bertanya "kata mana yang terlihat seperti spam?". Ia bertanya "kelas mana yang lebih mungkin menghasilkan kata-kata ini?".

## Asumsi yang naive
*Apa yang diasumsikan oleh "naive", dan mengapa tetap berhasil?*

Faktor yang sulit adalah P(words | c), yaitu peluang kombinasi kata yang persis seperti ini. Dengan vocabulary 10.000 kata, jumlah pesan yang mungkin jauh lebih banyak daripada isi training set mana pun, sehingga hampir tidak pernah ada pesan persis sama yang sudah kamu lihat sebelumnya.

**Asumsi independensi bersyarat** menyelesaikan masalah ini. Isinya: jika kelasnya sudah diketahui, setiap kata muncul secara independen dari kata lain. Dengan begitu, kombinasi tadi terpecah menjadi satu faktor per kata:

P(words | c) = P(w1 | c) x P(w2 | c) x ... x P(wn | c)

Setiap faktor dapat diperoleh dari satu hitungan kata, seperti yang terlihat di bagian berikutnya.

Asumsi ini disebut **naive** karena memang tidak benar. Di spam, "free" dan "prize" lebih sering muncul bersamaan daripada kebetulan. Model mengabaikan hal itu dan mengalikan seolah-olah setiap kata membawa evidence baru.

Meski begitu, model ini sering berhasil karena sebuah keputusan hanya perlu skor yang lebih besar, bukan probabilitas yang tepat. Keterkaitan antarkata cenderung menggeser skor kedua kelas dengan cara yang mirip, sehingga urutan skornya sering tetap terjaga.

> Awas: probabilitas dari naive Bayes biasanya terlalu ekstrem jika kata-katanya saling terkait. Percayai peringkat dan pilihan kelasnya, bukan angka seperti 0,97.

## Menghitung kata di setiap kelas
*Bagaimana probabilitas kata diestimasi?*

**Model multinomial** memperlakukan satu kelas sebagai satu kantong besar: masukkan semua kata dari semua pesan latih kelas itu. Lalu

P(w | c) = (berapa kali w muncul di kelas c) / (total kata di kelas c)

Kata yang muncul dua kali dalam satu pesan dihitung dua kali. Prior menghitung pesan: P(c) = (jumlah pesan kelas c) / (semua pesan).

Berikut training set rekaan berisi lima pesan pendek, cukup untuk diikuti dengan pensil.

- Spam: "win free prize" dan "free prize now".
- Ham: "meeting now", "lunch meeting" dan "report now".

Vocabulary-nya adalah tujuh kata berbeda yang ada di tabel. Prior-nya P(spam) = 2 / 5 = 0,40 dan P(ham) = 3 / 5 = 0,60.

| Kata | Di spam | Di ham |
| --- | --- | --- |
| win | 1 | 0 |
| free | 2 | 0 |
| prize | 2 | 0 |
| now | 1 | 2 |
| meeting | 0 | 2 |
| lunch | 0 | 1 |
| report | 0 | 1 |
| Total kata | 6 | 6 |

Dari tabel, P(free | spam) = 2 / 6 = 0,33 dan P(now | ham) = 2 / 6 = 0,33. Beberapa isian bernilai 0, dan itu menimbulkan masalah.

## Kata yang belum pernah terlihat dan Laplace smoothing
*Apa yang salah jika sebuah kata tidak pernah muncul di suatu kelas?*

Hitung skor pesan "free prize report" dengan hitungan mentah. "report" tidak pernah muncul di spam, sehingga P(report | spam) = 0 / 6 = 0, dan seluruh skor spam menjadi 0 x apa pun = 0. "free" dan "prize" tidak pernah muncul di ham, jadi skor ham juga 0. Kedua kelas bernilai 0, dan classifier tidak punya jawaban, sekuat apa pun kata-kata lainnya.

Satu kata yang belum pernah terlihat tidak seharusnya menggagalkan semuanya. **Laplace smoothing** berpura-pura bahwa setiap kata di vocabulary pernah terlihat satu kali lebih banyak di setiap kelas:

P(w | c) = (count + 1) / (total kata di c + V)

V adalah jumlah kata berbeda di vocabulary, di sini 7. Menambah 1 pada tiap dari V hitungan berarti menambah V pada total, sehingga probabilitas satu kelas tetap berjumlah 1. Kedua total menjadi 6 + 7 = 13.

| Kata | P(w untuk spam) | P(w untuk ham) |
| --- | --- | --- |
| win | 2 / 13 | 1 / 13 |
| free | 3 / 13 | 1 / 13 |
| prize | 3 / 13 | 1 / 13 |
| now | 2 / 13 | 3 / 13 |
| meeting | 1 / 13 | 3 / 13 |
| lunch | 1 / 13 | 2 / 13 |
| report | 1 / 13 | 2 / 13 |

[[figure:naive-bayes/smoothing|Probabilitas kata per kelas sebelum smoothing (garis tepi) dan sesudahnya (batang). Smoothing mengangkat setiap nilai nol dan mengambil sedikit dari setiap hitungan.]]

Sekarang "free prize report" mendapat skor 0,4 x 3/13 x 3/13 x 1/13 = 0,00164 untuk spam dan 0,6 x 1/13 x 1/13 x 2/13 = 0,00055 untuk ham. Spam menang dengan 0,00164 / (0,00164 + 0,00055) = 0,75.

::: deeper Kata di luar vocabulary
Kata yang tidak pernah muncul di training set, di kelas mana pun, tidak termasuk vocabulary. Kebanyakan implementasi langsung melewatinya saat menghitung skor, karena kata itu tidak memberi tahu kelas mana yang lebih mungkin. Angka "+ 1" juga dapat diganti angka lain, yang biasanya disebut alpha: 1 adalah titik awal yang umum, alpha yang lebih kecil lebih memercayai hitungan, sedangkan alpha yang lebih besar menarik kedua kelas ke arah probabilitas kata yang sama. Dengan alpha = 0,1, P(report | spam) adalah 0,1 / (6 + 0,7) = 0,015, bukan 1 / 13 = 0,077.
:::

## Contoh hitungan dengan tangan
*Kelas mana yang didapat "free prize now"?*

Semua kata dalam "free prize now" ada di training set. Kalikan prior dengan satu faktor hasil smoothing per kata, untuk tiap kelas.

> Contoh hitungan: **Spam.** 0,40 x 3/13 x 3/13 x 2/13 = 7,2 / 2197 = 0,00328.

> Contoh hitungan: **Ham.** 0,60 x 1/13 x 1/13 x 3/13 = 1,8 / 2197 = 0,00082.

Skor spam empat kali skor ham, karena 7,2 / 1,8 = 4. Bagi dengan jumlahnya untuk mendapat probabilitas: P(spam | words) = 7,2 / (7,2 + 1,8) = 0,80, dan P(ham | words) = 0,20. Classifier menjawab spam.

[[figure:naive-bayes/scores|Dua skor untuk "free prize now", dibangun faktor demi faktor, beserta probabilitas yang dihasilkan.]]

Coba pesan "free now meeting". Spam: 0,40 x 3/13 x 2/13 x 1/13 = 2,4 / 2197. Ham: 0,60 x 1/13 x 3/13 x 3/13 = 5,4 / 2197. Sekarang P(spam) = 2,4 / (2,4 + 5,4) = 0,31, dan ham menang. "free" menarik ke arah spam, tetapi "now" dan "meeting" menarik lebih kuat ke arah ham.

## Bekerja dalam log probabilitas
*Mengapa classifier sungguhan menjumlahkan logaritma, bukan mengalikan?*

Pesan sungguhan berisi ratusan kata, dan setiap faktor berupa pecahan kecil. Misalkan 300 kata masing-masing berprobabilitas sekitar 1 / 13. Hasil kalinya 13 pangkat -300, sekitar 10^-334. Bilangan floating-point 64 bit tidak dapat menyimpan nilai yang lebih kecil dari sekitar 5 x 10^-324, sehingga komputer menyimpan 0. Ini disebut underflow. Kedua kelas menjadi 0 dan tidak ada jawaban, jebakan yang sama seperti tadi.

Solusinya adalah mengambil logaritma. Log dari sebuah hasil kali sama dengan jumlah log-nya, ln(a x b) = ln a + ln b (ln adalah logaritma natural), dan skor yang lebih besar selalu punya log yang lebih besar. Jadi yang dibandingkan adalah

log score(c) = ln P(c) + ln P(w1 | c) + ... + ln P(wn | c)

Hasil kali yang sangat kecil berubah menjadi bilangan negatif biasa. Untuk "free prize now":

- Spam: ln 0,4 + ln(3/13) + ln(3/13) + ln(2/13) = -0,916 - 1,466 - 1,466 - 1,872 = -5,720.
- Ham: ln 0,6 + ln(1/13) + ln(1/13) + ln(3/13) = -0,511 - 2,565 - 2,565 - 1,466 = -7,107.

Log score spam lebih tinggi 1,39. Selisih itu adalah log dari rasio kedua skor: e^1,39 = 4, rasio 4 banding 1 yang sama seperti sebelumnya.

[[figure:naive-bayes/underflow|Hasil kali n probabilitas kata 1/13 turun di bawah bilangan terkecil yang dapat disimpan pada sekitar 300 kata. Logaritmanya hanya berupa bilangan negatif yang moderat.]]

::: deeper Kata mana yang menentukan keputusan
Tulis selisihnya sebagai satu jumlah: ln(rasio prior) + jumlah atas semua kata dari ln(P(w | spam) / P(w | ham)). Untuk "free prize now", bagian-bagiannya adalah prior ln(0,4 / 0,6) = -0,405, "free" ln 3 = 1,099, "prize" ln 3 = 1,099, dan "now" ln(2/3) = -0,405. Jumlahnya sekitar 1,39. Bagian positif mendorong ke spam, bagian negatif mendorong ke ham, sehingga bagian terbesar menunjukkan kata-kata di balik sebuah prediksi.
:::

## Berikutnya: lab text classifier
*Apa yang akan kamu periksa pada teks sungguhan?*

Sekarang kamu sudah memegang seluruh resepnya. Hitung kata per kelas, tambahkan 1 untuk smoothing, kalikan prior dengan satu faktor per kata (dalam praktik, jumlahkan log), lalu pilih skor yang lebih besar.

Kursus ini berakhir di "Lab text classifier". Di sana kamu melatih classifier seperti ini dan memeriksa kata mana yang menggerakkan prediksi dan kesalahannya. Bagian log-rasio per kata di "Kata mana yang menentukan keputusan" adalah yang menunjukkan dorongan sebuah kata.

Sebelum lanjut, pastikan kamu dapat melakukan hal berikut dengan tangan tanpa melihat catatan: P(now | ham) hasil smoothing dengan hitungan ini, dan skor "meeting now" di tiap kelas. Lalu perkirakan apa yang terjadi pada skor spam "free prize report" jika smoothing dihilangkan.

::: remember
- Skor setiap kelas adalah prior dikali satu probabilitas per kata, lalu ambil skor yang lebih besar. Suku evidence sama untuk semua kelas, sehingga boleh dibuang.
- "Naive" berarti kata-kata diasumsikan independen jika kelasnya diketahui. Itu tidak benar, sehingga probabilitasnya terlalu percaya diri, tetapi pilihan kelasnya sering tetap tepat.
- Laplace smoothing mencegah satu kata yang belum pernah terlihat menihilkan sebuah kelas, dan penjumlahan log mencegah pesan panjang mengalami underflow menjadi 0.
:::
