---
slug: framing-and-baselines
title: Framing dan baseline
---
::: intro
- Merumuskan masalah: apa yang diprediksi, untuk siapa, berapa biaya sebuah kesalahan, dan data mana yang boleh dipakai.
- Memilih metrik yang sesuai dengan biaya kesalahan.
- Menghitung baseline kelas mayoritas dan aturan satu feature, lalu memahami mengapa sebuah model harus mengalahkan keduanya.

Sebelum mulai: baca "Baselines and splits" dan "Confusion matrix and rates".
:::

## Rumuskan dulu sebelum fitting
*Apa yang kamu putuskan sebelum melatih apa pun?*

Sebuah model menjawab sebuah pertanyaan, jadi pertanyaannya harus ada lebih dulu. Tim yang melewatkan langkah ini sering membangun model yang bagus untuk masalah yang keliru. Sebelum membuka dataset, tuliskan lima hal berikut.

- **Prediksi.** Apa persisnya yang diprediksi untuk satu baris data?
- **Pengguna.** Siapa yang bertindak berdasarkan jawaban itu, dan apa yang ia lakukan?
- **Biaya kesalahan.** Apa akibatnya kalau jawaban salah, dan apakah semua jawaban salah sama buruknya?
- **Metrik.** Angka mana yang mengukur biaya tersebut?
- **Data.** Kolom mana yang sudah ada pada saat prediksi dibuat, dan kolom mana yang harus dikeluarkan?

Proyek capstone pemula mengikuti resep ini pada tabel penguin dari pelajaran sebelumnya. Kamu akan membangun sebuah classifier, membandingkan dua model dengan sebuah baseline, lalu menjelaskan tiga kesalahan. Pelajaran ini mengerjakan paruh pertamanya, yaitu framing dan baseline. Kita memakai dua pertanyaan tentang penguin dan menjaganya tetap di depan mata sampai akhir.

> Gagasan kunci: sebuah model dinilai terhadap sebuah pertanyaan, bukan secara abstrak. Framing adalah langkah yang membuat penilaian itu mungkin dilakukan.

## Dua pertanyaan dari satu tabel
*Bagaimana satu tabel dapat melahirkan lebih dari satu masalah?*

Tabel penguin punya 344 baris. Dua baris tidak memiliki pengukuran sama sekali, sehingga 342 penguin dapat dipakai. Dari tabel yang sama kita dapat mengajukan pertanyaan yang berbeda. Gagasan ini sudah kamu temui di "Three questions, one dataset".

**Pertanyaan A: Adelie atau Chinstrap?** Simpan hanya penguin Adelie dan Chinstrap: 151 + 68 = 219 baris. **Target**-nya adalah spesies. Chinstrap adalah kelas positif, yaitu kelas yang kita buru. Jumlah positif adalah 68 dari 219, sekitar 31%.

**Pertanyaan B: jantan atau betina?** Simpan penguin yang jenis kelaminnya tercatat: 333 baris (168 jantan, 165 betina). Sembilan penguin yang sudah diukur tidak memiliki catatan jenis kelamin, dan sebuah model tidak dapat dinilai terhadap label yang hilang. Di sini jantan adalah kelas positif.

Pada kedua pertanyaan, feature-nya sama: empat pengukuran, yaitu panjang paruh, kedalaman paruh, panjang sirip, dan massa tubuh. Yang berubah hanya target dan baris yang dipakai.

[[figure:framing-and-baselines/two-questions|Tabel yang sama dirumuskan dalam dua cara. Batang kelas menunjukkan pembagian barisnya, dan baris terakhir adalah angka yang harus dikalahkan sebuah model.]]

## Berapa biaya sebuah kesalahan
*Metrik mana yang sesuai dengan biayanya?*

Model ya-atau-tidak dapat salah dengan dua cara, dan framing menentukan mana yang lebih merugikan. Bayangkan seorang ranger yang memakai pertanyaan A untuk menghitung penguin Chinstrap di sebuah koloni campuran. Chinstrap yang disebut "Adelie" adalah kasus yang terlewat, sehingga hitungannya terlalu rendah. Adelie yang disebut "Chinstrap" adalah alarm palsu, sehingga hitungannya sedikit terlalu tinggi. Dalam kasus rekaan ini ia memutuskan bahwa satu yang terlewat adalah kesalahan yang tidak bisa diterima, karena ia harus menemukan setiap sarang Chinstrap untuk melindunginya. Jadi angka yang perlu dipantau adalah **recall**: dari semua penguin Chinstrap yang sebenarnya, berapa yang berhasil ditemukan?

Sekarang bayangkan seorang ahli biologi yang memakai pertanyaan B untuk memberi tag pada satu jenis kelamin dalam sebuah studi. Jawaban yang salah, ke arah mana pun, hanya menyia-nyiakan satu tag, dan kedua kelas hampir sama besar. **Accuracy** biasa adalah metrik yang adil di sini.

> Contoh hitungan: aturan satu feature untuk pertanyaan A (dibuat di bagian selanjutnya pelajaran ini) dinilai pada 44 penguin validasi: 12 true positive, 2 Chinstrap yang terlewat, 1 alarm palsu, dan 29 true negative. Recall = 12 / (12 + 2) = 12 / 14 = 85,7%. Precision = 12 / (12 + 1) = 12 / 13 = 92,3%. Accuracy = (12 + 29) / 44 = 93,2%. Aturan yang selalu menjawab "Adelie" memiliki recall 0 pada baris yang sama.

Biaya di sini hanyalah rekaan untuk contoh. Pada proyekmu sendiri, tuliskan biaya yang sebenarnya, baru pilih metriknya.

## Data apa yang boleh dipakai model
*Kolom mana yang diperbolehkan, dan mana yang sama dengan curang?*

Sebuah model boleh memakai suatu kolom hanya jika kolom itu akan ada **saat prediksi dibuat**. Pada pertanyaan kita ini mudah: peneliti yang memegang penguin hidup dapat mengukur paruh, sirip, dan massanya. Itu feature yang wajar.

Ada dua jebakan yang perlu kamu kenali.

**Kebocoran.** **Data leakage** terjadi ketika informasi yang tidak akan tersedia saat prediksi, atau informasi yang sebenarnya adalah jawaban yang menyamar, ikut masuk ke proses training. Bayangkan sebuah kolom "warna tag" yang oleh para ahli biologi diisi dengan tag biru untuk setiap jantan dan tag merah untuk setiap betina. Kolom itu memprediksi jenis kelamin dengan sempurna sekaligus tidak berguna, karena ia ditulis setelah jenis kelamin diketahui. Tabel ini tidak punya kolom seperti itu, tetapi tabel di dunia nyata sering punya. Skornya lalu tampak luar biasa, dan tidak ada yang memperingatkanmu.

**Jalan pintas.** Pada 219 baris ini, setiap penguin di Torgersen dan Biscoe adalah Adelie, sebanyak 51 + 44 = 95 ekor. Jadi "pulau" tampak membantu, padahal ia hanya menggambarkan di mana studi ini kebetulan mengambil sampel. Di koloni baru, kolom itu akan gagal.

[[figure:framing-and-baselines/known-when|Apa yang sudah diketahui saat model harus menjawab. Pengukuran sudah diketahui; tag yang ditambahkan setelah jenis kelamin diketahui membocorkan jawabannya.]]

Kebocoran juga datang dari cara kerjamu. Cut-off sebuah aturan, rata-rata, atau kelas mayoritas harus dihitung dari baris training saja, seperti di "Baselines and splits".

## Baseline kelas mayoritas
*Jawaban paling malas itu apa, dan seberapa sering ia benar?*

**Baseline** adalah jawaban paling sederhana yang masih masuk akal. Kamu menghitungnya lebih dulu, supaya setiap skor sesudahnya punya pembanding. Untuk classification, baseline pertama adalah **kelas mayoritas**: selalu menjawab kelas yang paling umum di baris training.

Bagi tiap tugas dengan stratified split (seed 1), 60% / 20% / 20%, seperti di "Baselines and splits". Baseline dipilih dari baris training dan dinilai pada baris validasi.

- **Pertanyaan A.** 219 baris terbagi menjadi 132 baris training, 44 validasi, dan 43 test. Training berisi 91 Adelie dan 41 Chinstrap, sehingga baseline menjawab "Adelie". Dari 44 penguin validasi, 30 adalah Adelie: 30 / 44 = 68,2%.
- **Pertanyaan B.** 333 baris terbagi menjadi 200 baris training, 67 validasi, dan 66 test. Training berisi 101 jantan dan 99 betina, sehingga baseline menjawab "jantan". Dari 67 penguin validasi, 34 adalah jantan: 34 / 67 = 50,7%.

> Gagasan kunci: skor baseline bergantung pada pertanyaannya. Angka 68,2% hampir tidak melampaui baseline pada pertanyaan A, tetapi sudah jauh di atas baseline 50,7% pada pertanyaan B. Selalu baca sebuah accuracy bersama baseline-nya sendiri.

## Aturan sederhana
*Apa langkah berikutnya setelah kelas mayoritas?*

Baseline kedua memakai data sedikit saja. Pilih **satu** feature dan satu cut-off, lalu jawab dengan membandingkan keduanya. Cut-off dipilih dari baris training saja: coba setiap kemungkinan titik potong, dan simpan yang membuat paling banyak baris training terjawab benar. Ini adalah model yang hanya berisi satu pertanyaan, dan ia tidak memerlukan algoritma training yang sesungguhnya.

**Pertanyaan A.** Titik potong terbaik pada panjang paruh adalah 44,65 mm: "di atas 44,65 mm berarti Chinstrap". Aturan ini menjawab benar 129 dari 132 baris training (97,7%) dan 41 dari 44 baris validasi (93,2%). Panjang paruh memisahkan kedua spesies ini dengan baik.

**Pertanyaan B.** Titik potong terbaik pada massa tubuh adalah 3.712,5 g: "di atas 3.712,5 g berarti jantan". Aturan ini menjawab benar 148 dari 200 baris training (74,0%) dan 51 dari 67 baris validasi (76,1%). Penguin yang lebih berat memang lebih sering jantan, tetapi betina yang berat dan jantan yang ringan sama-sama lazim, sehingga massa saja hanya membawamu sebagian jalan.

::: deeper Bagaimana titik potong ditemukan
Urutkan baris training berdasarkan feature itu. Di antara setiap dua nilai bertetangga ada satu kandidat titik potong, yaitu di titik tengahnya. Untuk tiap kandidat, hitung berapa baris training yang akan dijawab benar oleh aturannya, lalu simpan yang terbaik. Dengan 200 baris, kandidatnya kurang dari 200, sebuah pencarian yang sangat kecil. Sebuah decision tree melakukan pencarian sejenis, satu split pada satu waktu.
:::

## Mengapa model harus mengalahkannya
*Kapan sebuah model layak dipertahankan?*

Kumpulkan skor validasinya:

| Pertanyaan | Kelas mayoritas | Aturan satu feature |
|---|---|---|
| A: Adelie atau Chinstrap | 68,2% | 93,2% |
| B: jantan atau betina | 50,7% | 76,1% |

[[figure:framing-and-baselines/baseline-vs-rule|Accuracy validasi dari dua baseline pada kedua pertanyaan, dari satu pemotongan stratified (seed 1).]]

Model sungguhan hanya sepadan dengan biaya tambahannya jika ia jelas mengalahkan yang terbaik di antara keduanya, pada metrik yang kamu pilih saat framing. Model yang mendapat skor 70% pada pertanyaan A lebih buruk daripada aturan yang cukup ditulis dalam satu kalimat. Model yang mendapat 80% pada pertanyaan B mengalahkan kedua baseline.

Waspadai selisih yang kecil. Satu pemotongan dengan 44 baris validasi adalah juri yang berisik: satu penguin setara 2,3 poin. Pada seed 1 sampai 10, accuracy validasi aturan itu pada pertanyaan A berkisar dari 90,9% sampai 95,5%, dan pada pertanyaan B dari 56,7% sampai 76,1%, sementara kedua baseline tetap di 68,2% dan 50,7%. Model yang menang hanya satu atau dua penguin belum membuktikan apa-apa.

> Awas: sebuah model dapat mengalahkan kelas mayoritas namun tetap kalah dari aturan sederhana. Bandingkan dengan baseline terkuat yang dapat kamu tulis dalam beberapa menit.

## Sebelum capstone
*Apa yang kamu bawa ke dalam proyek?*

Sekarang kamu punya sebuah frame dan sebuah lantai. Frame yang baik menyebutkan apa yang diprediksi, siapa yang memakainya, berapa biaya sebuah kesalahan, metrik mana yang mengukur biaya itu, dan kolom mana yang diizinkan. Lantai yang baik adalah baseline kelas mayoritas ditambah aturan sederhana, dinilai pada baris validasi yang dipilih sebelum modeling apa pun.

Pelajaran berikutnya, "Comparing models and errors", menaruh dua model di samping baseline tersebut, menunjukkan cara membaca kesalahan mereka baris demi baris, dan menjelaskan mengapa kamu melihat kesalahan, tidak hanya satu skor. Setelah itu, "Beginner capstone project" meminta kamu mengerjakan seluruh pekerjaan sendiri pada tabel publik: merumuskannya, menetapkan baseline, membandingkan dua model, dan menjelaskan tiga kesalahan yang mewakili. Tuliskan frame-nya sebelum mulai; kamu akan membutuhkannya ketika angka-angkanya datang.

::: remember
- Rumuskan dulu: prediksi, pengguna, biaya kesalahan, metrik, dan kolom yang diizinkan saat prediksi dibuat.
- Hitung baseline kelas mayoritas dan aturan satu feature sederhana dari baris training, lalu nilai pada baris validasi.
- Sebuah model baru berarti jika ia jelas mengalahkan kedua baseline pada metrik yang dipilih saat framing.
:::
