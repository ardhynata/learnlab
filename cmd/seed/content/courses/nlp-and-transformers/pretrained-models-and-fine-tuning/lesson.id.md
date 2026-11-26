---
slug: pretrained-models-and-fine-tuning
title: Pretrained model dan fine-tuning
---
::: intro
- Jelaskan bagaimana prediksi token berikutnya dan prediksi kata tersamar mengubah teks tanpa label menjadi sinyal belajar, lalu hitung loss sebuah model penghitung dengan tangan.
- Bandingkan frozen code hasil pretraining dengan baseline bag-of-words saat jumlah pesan berlabel bertambah, dan katakan kapan masing-masing menang.
- Nilai sebuah text classifier dengan accuracy dan F1, lalu ujilah secara adil: baris yang sama, baseline dari Level 2, leakage dari near-duplicate, domain lain, dan kegagalan yang umum terjadi.

Sebelum mulai: baca "Tokenization and attention" (pelajaran sebelumnya, yang membangun token dan vektor yang dipelajari sebuah pretrained model), "Transfer learning and self-supervision" di course Representation learning (pretext task, frozen dibandingkan fine-tuned) dan "The naive Bayes classifier" di course Naive Bayes dan klasifikasi teks (baseline yang akan kamu lawan). Pelajaran ini menambahkan hal yang khusus untuk teks.
:::

## Belajar dari teks tanpa label
*Bagaimana sebuah model dapat belajar dari teks yang tidak diberi label oleh siapa pun?*

Teks mentah itu murah, sedangkan label mahal: jumlah teks jauh lebih banyak daripada yang sanggup diberi topik atau suasana hati oleh manusia. **Pretraining** mengubah teks mentah menjadi sinyal belajar dengan menyembunyikan sebagian teks dan meminta model menebak bagian itu. Ada dua versi yang umum.

**Prediksi token berikutnya.** Tunjukkan token-token sejauh ini kepada model dan minta token selanjutnya. Token yang benar sudah ada di dalam teks, jadi itulah labelnya.

**Prediksi kata tersamar.** Ganti beberapa token dengan bagian kosong, ditulis `[MASK]`, lalu minta model mengisinya dari kata-kata di kedua sisinya.

Keduanya adalah pretext task dari "Transfer learning and self-supervision", dengan token dari "Tokenization and attention" sebagai satuannya. Jawaban tebakannya sendiri bukan tujuan. Agar dapat menebak dengan baik, transformer harus membangun vektor yang menangkap kata mana yang sering berdampingan dan apa arti sebuah kata di dalam kalimatnya. Vektor itulah yang kamu pakai ulang untuk tugas lain, termasuk sebuah classifier.

## Prediksi dengan menghitung
*Seperti apa loss token berikutnya jika dihitung dengan pensil?*

Model yang sebenarnya adalah transformer dengan jutaan weight, tetapi tugasnya dapat dimuat dalam tabel hitungan. Ambil enam pesan pendek. Kosakatanya 11 kata: my, order, is, late, wrong, parcel, invoice, the, has, not, arrived.

| # | Pesan |
| --- | --- |
| 1 | my order is late |
| 2 | my order is wrong |
| 3 | my parcel is late |
| 4 | my invoice is wrong |
| 5 | the order is late |
| 6 | my order has not arrived |

> Contoh hitungan: **Token berikutnya.** Setelah "is", teks berlanjut dengan late sebanyak tiga kali (pesan 1, 3 dan 5) dan dengan wrong dua kali (2 dan 4). Model penghitung menyatakan P(late) = 3 / 5 = 0,6 dan P(wrong) = 2 / 5 = 0,4. Loss pada satu posisi adalah minus logaritma natural dari probabilitas yang diberikan kepada token yang benar: untuk late -ln 0,6 = 0,51, dan untuk wrong -ln 0,4 = 0,92. Dari lima posisi setelah "is", rata-ratanya (3 x 0,51 + 2 x 0,92) / 5 = 0,67. Model yang tidak tahu apa-apa dan memberi 11 kata itu peluang yang sama akan mendapat ln 11 = 2,40.

> Contoh hitungan: **Kata tersamar.** Untuk "[MASK] is late", pesan 1, 3 dan 5 mengisi bagian kosong dengan order, parcel dan order, sehingga P(order) = 2 / 3 = 0,67 dan P(parcel) = 1 / 3 = 0,33.

[[figure:pretrained-models-and-fine-tuning/pretraining-tasks|Dua pretext task pada enam pesan. Batang menunjukkan probabilitas model penghitung untuk kata yang disembunyikan.]]

Sebuah transformer menggantikan tabel itu, dan ia dapat menjawab untuk kalimat yang belum pernah dilihatnya. Loss-nya tetap sama: rata-rata minus ln dari probabilitas yang diberikan kepada token yang benar. Loss yang lebih rendah hanya berarti tebakan tentang teks yang lebih baik. Apakah vektornya membantu sebuah classifier adalah pertanyaan lain, yang diuji di bawah.

## Frozen atau fine-tuned
*Setelah model selesai di-pretrain, bagaimana memakainya untuk tugasmu sendiri?*

Kedua cara berangkat dari **encoder** yang sudah di-pretrain, yaitu bagian yang mengubah sebuah pesan menjadi vektor. Kamu menambahkan **head** kecil, yaitu classifier yang mengubah vektor itu menjadi kelas-kelasmu.

**Frozen.** Weight encoder dikunci. Setiap pesan melewati encoder satu kali, dan hanya head yang belajar dari labelmu. Misalkan sebuah encoder dengan sekitar 100 juta weight yang menghasilkan 768 angka per pesan, dan ada 3 kelas. Head memiliki 768 x 3 + 3 = 2.307 angka (weight dan bias), dan hanya itulah yang harus dicocokkan oleh label.

**Fine-tuned.** Label ikut menyesuaikan encoder, sehingga sekitar 100 juta angka dapat bergeser, ditambah 2.307 milik head. Kebebasan itu membuat model dapat menyesuaikan diri dengan tugasmu, tetapi juga dapat overfitting pada set berlabel yang kecil. Fine-tuning biasanya memakai learning rate kecil, hanya beberapa epoch, dan sebuah validation set yang menentukan kapan berhenti.

[[figure:pretrained-models-and-fine-tuning/frozen-or-fine-tuned|Encoder pretrained yang sama, dipakai dengan dua cara. Frozen hanya melatih head, sedangkan fine-tuning melatih keduanya. Ukurannya hanya contoh.]]

> Gagasan kunci: makin banyak angka yang boleh diubah oleh labelmu, makin banyak pesan berlabel yang kamu perlukan agar hasilnya dapat dipercaya. Mulailah dengan frozen, dan lakukan fine-tuning hanya jika hasilnya mengalahkan versi frozen pada pesan yang tidak ikut dilatih.

## Code kecil hasil pretraining
*Seperti apa pretrained code pada ukuran sebuah pelajaran?*

Transformer terlalu besar untuk dilatih di dalam satu pelajaran, sehingga pelajaran ini memakai pengganti kecil. Di sini "pretrained code" berarti 8 angka untuk setiap dari 155 kata, dipelajari dari 600 pesan pelanggan berbahasa Inggris tanpa label dengan menghitung kata mana yang muncul berdekatan. Sebuah pesan adalah rata-rata code kata-katanya, dan head memberikan pesan itu kepada kelas yang code rata-ratanya paling dekat. Itulah jalur frozen: 1.240 angka code (155 x 8) tetap terkunci, dan label hanya mencocokkan 24 angka rata-rata kelas (3 x 8). Fine-tuning, yang membiarkan seluruh 1.264 angka bergeser, tidak diuji di sini.

::: deeper Bagaimana code kecil itu dibuat
Ambil kata yang muncul setidaknya dua kali di 600 pesan: 155 kata. Untuk setiap pasangan kata, hitung seberapa sering keduanya berada dalam jarak 3 posisi, lalu ubah hitungan itu menjadi positive pointwise mutual information: ln(hitungan x total / (total baris x total kolom)), dengan nilai negatif dijadikan 0. Ini menanyakan seberapa lebih sering dua kata bertemu daripada yang diperkirakan kebetulan. Ambil 8 arah terkuat dari tabel itu dengan eigendecomposition, langkah PCA dari Level 2, dan skalakan masing-masing dengan akar eigenvalue-nya. Baris ke-i adalah code kata ke-i. Kata di luar 155 itu dilewati. Seperti prediksi kata tersamar, cara ini belajar dari kata mana yang muncul dekat kata mana, tanpa label apa pun. Courier dan driver berakhir dengan cosine similarity 0,997.
:::

## Melawan baseline
*Apakah pretraining membantu ketika hanya sedikit pesan yang berlabel?*

Baseline-nya adalah naive Bayes bag-of-words yang dilatih pada pesan berlabel yang sama. Pesannya adalah pesan sintetis tagihan, pengiriman dan masalah teknis dari lab Text classifier. Setiap titik merupakan rata-rata dari 100 undian set berlabel, dinilai pada pesan uji yang sama.

[[figure:pretrained-models-and-fine-tuning/few-labels|Akurasi uji terhadap jumlah pesan berlabel per kelas, dirata-ratakan dari 100 undian. Menebak mendapat sekitar 33%.]]

Dengan 3 pesan berlabel per kelas, frozen code mendapat 74,7% dan naive Bayes 64,9%. Pada 10 per kelas keduanya seimbang (80,9% melawan 81,7%), dan pada 40 naive Bayes unggul, 89,8% berbanding 82,6%. Code itu menempatkan kata-kata yang dipakai serupa berdekatan, sehingga satu pesan berlabel dengan "driver" ikut membantu untuk "courier". Dengan lebih banyak label, naive Bayes mempelajari kata-kata itu sendiri, sedangkan head frozen tetap terbatas pada 24 angka.

## Menilai sebuah text classifier
*Angka apa yang sebaiknya dilaporkan, dan apa yang disembunyikannya?*

Accuracy adalah porsi pesan yang diklasifikasikan dengan benar. **F1** untuk satu kelas adalah rata-rata harmonik precision dan recall-nya, yang didefinisikan di "Confusion matrix and rates": F1 = 2 TP / (2 TP + FP + FN). **Macro-F1** merata-ratakan F1 semua kelas.

Ambil satu undian set berlabel, 3 pesan per kelas, dengan frozen code. Hasilnya dinilai pada 202 pesan uji, dan barisnya adalah kelas yang sebenarnya.

| Sebenarnya \ Prediksi | Tagihan | Pengiriman | Teknis |
| --- | --- | --- | --- |
| Tagihan | 63 | 1 | 4 |
| Pengiriman | 18 | 48 | 1 |
| Teknis | 14 | 8 | 45 |

> Contoh hitungan: accuracy = (63 + 48 + 45) / 202 = 156 / 202 = 0,772. Untuk tagihan, TP = 63, FP = 18 + 14 = 32 (pesan lain yang disebut tagihan) dan FN = 1 + 4 = 5. Precision = 63 / 95 = 0,663, recall = 63 / 68 = 0,926, dan F1 = 126 / (126 + 32 + 5) = 126 / 163 = 0,773. Pengiriman dan teknis memberi 0,774 dan 0,769, sehingga macro-F1 = 0,772.

Naive Bayes pada 9 pesan yang sama mendapat 132 / 202 = 0,654. Ini baru satu undian. Rata-rata dari 100 undian adalah 74,7% dan 64,9%, dengan sebaran (simpangan baku) 5,6 dan 5,1 poin.

> Awas: accuracy dan macro-F1 sejalan di sini karena ketiga kelas hampir sama banyak. Dengan 1.000 pesan yang 20 di antaranya mendesak, model yang selalu menjawab "tidak mendesak" mendapat accuracy 98% dan F1 sebesar 0 untuk kelas mendesak.

## Uji yang adil untuk teks
*Apa yang harus benar sebelum sebuah skor teks berarti?*

- **Kalahkan baseline, pada baris yang sama.** Beri baseline bag-of-words dari Level 2 pesan berlabel dan pesan uji yang sama dengan pretrained model. Pretrained model yang tidak dapat mengalahkan naive Bayes pada jumlah labelmu tidak sepadan dengan biayanya.
- **Banyak undian.** Satu undian memberi 77,2% untuk frozen code, sedangkan rata-ratanya 74,7%. Laporkan rata-rata dan sebarannya.
- **Tanpa salinan hampir sama.** Teks pelanggan penuh dengan pesan yang diteruskan, dikutip, dan berbasis template. Jika sebuah pesan uji punya salinan hampir sama di teks latih atau teks pretraining, model dapat mencari jawabannya. Ukur tumpang tindih kata: kata yang ada di kedua pesan dibagi kata yang ada di salah satunya. 97 dari 300 pesan uji memiliki setidaknya 0,8 dari katanya yang sama dengan sebuah pesan di pool pretraining. Pesan itu dibuang, begitu pula pesan yang dekat dengan pesan berlabel, sehingga tersisa sekitar 195 sampai 203. Setiap angka di pelajaran ini dihitung pada pesan yang tersisa. Jika dipertahankan, skor dapat naik sampai 2,8 poin.
- **Domain lain.** Uji pada teks dari domain yang tidak dipakai untuk membangun model sebelum kamu mempercayainya di sana. Bagian berikut melakukannya.

::: deeper Near-duplicate: split acak melawan split berkelompok
Ambil 900 pesan, 300 per kelas. Pada split acak 70/30, 29,2% pesan uji memiliki salinan hampir sama (0,8 dari katanya sama) di set latih. Split berkelompok menaruh setiap kelompok pesan yang saling terkait di satu sisi, seperti di "Grouped and temporal splits": di sini ada 670 kelompok, yang terbesar berisi 20 pesan. Dari 200 split, pencarian 1-nearest-neighbor pada hitungan kata mendapat 92,8% pada split acak dan 91,6% pada split berkelompok, sedangkan naive Bayes 93,7% dan 93,6%. Selisihnya kecil karena pesan-pesan ini sederhana dan model yang menggeneralisasi hampir tidak diuntungkan oleh salinan. Selisih yang besar baru muncul pada model yang menghafal.
:::

## Batas dan kegagalan umum
*Di mana sebuah pretrained model diam-diam bisa salah?*

- **Domain mismatch.** Code yang dibangun dari teks yang salah dibangun untuk dunia yang salah. Code yang dipelajari dari pesan berbahasa Indonesia hanya berbagi 9 dari 173 jenis kata di pesan uji berbahasa Inggris. Dengan 3 pesan berlabel per kelas skornya 48,4%, dibandingkan 74,7% untuk code berbahasa Inggris dan sekitar 33% untuk menebak, dan dengan 40 pesan skornya hanya 55,8%. Ini kasus ekstrem. Ketidakcocokan yang lebih ringan, misalnya teks hukum melawan pesan obrolan, gagal dengan lebih senyap.
- **Spurious cue.** Model dapat bersandar pada petunjuk yang kebetulan sejalan dengan label pada pesan berlabelmu dan tidak akan begitu di masa depan, misalnya baris tanda tangan atau frasa template. Lihat kata mana yang menggerakkan prediksi, seperti yang dilakukan lab Text classifier, dan uji pada pesan yang tidak memuat petunjuk itu.
- **Input panjang.** Sebuah model membaca paling banyak sejumlah token yang tetap. Misalkan batasnya 512 dan sebuah ulasan memiliki 900 token: model hanya melihat 512 / 900 = 57% darinya, dan kesimpulan di kalimat terakhir terpotong. Attention juga membandingkan setiap pasangan token, sehingga panjang yang digandakan membuat jumlah pasangan menjadi empat kali lipat.

> Awas: pretrained model tidak memberi peringatan ketika ia melampaui kemampuannya. Kamu mengetahuinya lewat uji di atas, bukan dari tingkat keyakinannya.

## Ke mana pelajaran ini mengarah
*Apa yang kamu bawa ke lab Attention?*

Kamu sekarang memegang seluruh alur course ini: teks menjadi token dan vektor, attention membuat vektor saling bercampur, pretraining mempelajari weight dari teks tanpa label, dan sebuah head atau fine-tuning mengarahkannya ke tugasmu. Kebiasaan yang paling penting adalah yang kamu kenal dari course Representation learning, kini untuk teks: sebuah pretrained model baru dihitung jika ia mengalahkan baseline sederhana pada baris yang sama, dari banyak undian, pada teks yang tidak ia lihat saat pretraining.

Lab Attention menutup course ini. Kamu menelusuri attention pada sebuah model kecil, lalu membandingkan sebuah pretrained text model dengan baseline bag-of-words dari Level 2. Pakai pemeriksaan dari pelajaran ini di sana: baris yang sama, sebaran di samping rata-rata, serta pencarian salinan hampir sama dan domain lain.

::: remember
- Pretraining belajar dari teks tanpa label dengan menebak token berikutnya atau token yang disamarkan. Loss-nya adalah rata-rata minus ln dari probabilitas yang diberikan kepada token yang benar.
- Encoder pretrained dipakai ulang dalam keadaan frozen (hanya head yang belajar) atau fine-tuned (semuanya belajar). Angka yang dilatih lebih sedikit lebih aman saat label sedikit: code kecil yang frozen menang pada 3 pesan berlabel per kelas dan seimbang pada 10, sedangkan naive Bayes menang pada 40.
- Nilai sebuah model teks dengan accuracy dan F1 terhadap baseline bag-of-words pada baris yang sama, dari banyak undian, dengan salinan hampir sama dibuang dan domain lain dicoba. Waspadai domain mismatch, spurious cue, dan input panjang.
:::
