---
slug: transfer-learning-and-self-supervision
title: Transfer learning dan self-supervision
---
::: intro
- Sebutkan tiga objective self-supervised (reconstruction, masking, dan contrastive pair) dan jelaskan apa yang disembunyikan atau dibandingkan oleh masing-masing.
- Jelaskan bagaimana representasi yang sudah di-pretrain pada data tanpa label dipakai ulang, frozen atau fine-tuned, dan berapa banyak parameter yang harus dilatih pada tiap pilihan.
- Nilai kapan transfer membantu dan kapan merugikan, lalu bandingkan secara adil dengan fitur yang dipelajari dari data berlabel yang kecil saja.

Sebelum mulai: baca "Embeddings and autoencoders" di course ini, yang memperkenalkan code, encoder, dan loss rekonstruksi, serta "Train, validation and test" dari course Training and generalization, untuk memahami mengapa model dinilai pada baris yang belum pernah dilihatnya.
:::

## Label yang tidak perlu dibeli
*Dari mana model mendapat sinyal belajar ketika tidak ada yang memberi label pada datanya?*

Model supervised membutuhkan label, dan label memakan waktu orang: seseorang harus menentukan spesies setiap penguin. Pengukuran tanpa nama jauh lebih murah, dan jumlahnya biasanya jauh lebih banyak.

**Self-supervised learning** membuat label dari datanya sendiri. Sembunyikan satu bagian dari setiap input, lalu minta model memprediksi bagian yang disembunyikan itu. Bagian tersembunyi tersebut menjadi target, dan tidak ada orang yang menuliskannya. Pertanyaan yang kamu ajukan ini disebut **pretext task**. Jawabannya sendiri tidak penting bagimu. Yang penting adalah **representasi** yang harus dibangun model untuk menjawabnya, yaitu code seperti yang kamu temui di pelajaran sebelumnya.

Rencananya terdiri atas dua tahap. **Pretraining** melatih model pada sebuah pretext task dengan banyak data tanpa label. Lalu **transfer** memakai ulang representasi itu untuk **downstream task** yang benar-benar kamu butuhkan, dengan data berlabel yang kecil. Sisa pelajaran ini membahas cara memakainya ulang, kapan hal itu membuahkan hasil, dan bagaimana kamu memastikannya.

## Tiga cara menyembunyikan sesuatu
*Apa yang diminta dari model oleh reconstruction, masking, dan contrastive pair?*

**Reconstruction.** Masukkan seluruh input, peras lewat code yang kecil, lalu bangun ulang. Inilah autoencoder dari pelajaran sebelumnya, dan loss-nya adalah seberapa jauh output dari input.

**Masking.** Sembunyikan satu bagian input dan prediksi dari bagian lainnya: sebuah kata dalam kalimat, sepotong foto, atau satu kolom pada baris tabel.

**Contrastive pair.** Tidak ada yang disembunyikan. Buat dua tampilan (view) dari item yang sama, misalnya sebuah foto dan salinannya yang dipotong, lalu latih encoder agar dua view dari satu item mendapat code yang berdekatan, sedangkan view dari item yang berbeda mendapat code yang berjauhan.

[[figure:transfer-learning-and-self-supervision/pretext-tasks|Tiga pretext task. Reconstruction membangun ulang input, masking memprediksi bagian yang tersembunyi, dan contrastive pair menarik dua view dari satu item agar berdekatan.]]

> Gagasan kunci: ketiganya tidak membutuhkan label, tetapi masing-masing memberi ganjaran pada hal yang berbeda. Secara kasar, reconstruction menyimpan apa yang paling bervariasi, masking menyimpan apa yang membantu memprediksi bagian tersembunyi, dan contrastive training menyimpan apa yang tetap sama di antara view.

## Masking dengan tangan
*Dapatkah kamu melihat objective masking bekerja pada enam penguin nyata?*

Ambil enam penguin dalam bentuk (panjang sirip dalam mm, body mass dalam g): (181, 3750), (186, 3800), (195, 3250), (210, 4450), (211, 4500), dan (230, 5700). Pretext task-nya: sembunyikan panjang sirip dan prediksi dari body mass. Tidak ada nama spesies yang dipakai di mana pun.

Baseline yang mengabaikan massa memprediksi rata-rata panjang sirip, 202,17 mm. Rata-rata galat kuadratnya 279,14 mm².

> Contoh hitungan: cocokkan sebuah garis lurus pada keenam pasangan itu. Kemiringannya 69158,33 / 3657083,33 = 0,01891 mm per gram, dan intersepnya 202,17 - 0,01891 x 4241,67 = 121,95 mm. Untuk penguin pertama, garis memprediksi 121,95 + 0,01891 x 3750 = 192,9 mm, sedangkan sirip sebenarnya 181 mm, sehingga galatnya -11,9 mm. Keenam galat itu -11,9, -7,8, 11,6, 3,9, 3,9, dan 0,3. Kuadratnya berjumlah sekitar 367, dengan rata-rata 61,17 mm².

Loss untuk sirip yang disembunyikan turun dari 279,14 menjadi 61,17 karena garis itu menemukan pola bersama: penguin yang lebih berat punya sirip yang lebih panjang. Itu sedikit struktur yang dipelajari tanpa satu label pun. Pretraining berskala besar melakukan hal yang sama pada jutaan baris, dan yang dipelajarinya adalah code, bukan satu jawaban.

## Pretrain, lalu pakai ulang
*Apa yang terjadi pada encoder setelah pretraining selesai?*

Setelah pretraining, kamu menyimpan **encoder**, yaitu bagian yang mengubah input menjadi code. Bagian yang melayani pretext task dibuang, lalu kamu menambahkan **head** kecil yang mengubah code menjadi jawaban downstream-mu, misalnya sebuah spesies. Pada encoder yang frozen, hanya head yang melihat label.

Ada dua cara melatihnya. **Frozen:** angka-angka encoder dikunci, dan data berlabel hanya melatih head. **Fine-tuned:** data berlabel ikut menyesuaikan encoder, sehingga label menjangkaunya juga.

Hitung angka yang harus dicocokkan pada tiap pilihan. Encoder yang mengubah 4 pengukuran menjadi code berisi 2 angka punya 4 x 2 = 8 weight dan 2 bias, yaitu 10 angka. Head yang mengubah code itu menjadi satu skor punya 2 weight dan 1 bias, yaitu 3 angka. Dengan data berlabel 10 penguin, pelatihan frozen mencocokkan 3 angka dari 10 baris, sedangkan fine-tuning mencocokkan 13 angka dari 10 baris. Semakin banyak angka yang boleh diubah oleh label, semakin mudah terjadi overfitting pada data yang kecil.

[[figure:transfer-learning-and-self-supervision/frozen-or-fine-tuned|Encoder yang sudah di-pretrain dibangun dari baris tanpa label. Pelatihan frozen hanya mengubah head, sedangkan fine-tuning mengubah keduanya.]]

## Kapan transfer membantu dan kapan merugikan
*Kondisi apa yang menentukan apakah representasi hasil pretraining membuahkan hasil?*

Transfer paling membantu bila dua hal terpenuhi. Data berlabelnya **kecil**, sehingga fitur yang dipelajari hanya dari data itu akan goyah. Dan data pretraining berasal dari **domain yang berkaitan**, yaitu jenis input yang sama, tempat hal-hal yang sama penting.

Transfer merugikan dengan dua cara. Pertama, **domain mismatch**: data pretraining tidak mirip dengan datamu, sehingga code-nya dibangun untuk dunia yang lain. Kedua, objective yang tidak sesuai: pretext task menyimpan hal yang bukan kebutuhan downstream task-mu. Code hasil reconstruction menyimpan spread terbesar, yang dapat tidak berkaitan dengan kelasmu. Ketika representasi hasil pretraining mendapat skor lebih buruk daripada tidak memakainya, hal itu disebut **negative transfer**.

> Perhatian: representasi hasil pretraining bukan peningkatan gratis. Ia hanya satu kandidat lagi, dan baru layak dipakai bila mengalahkan pilihan-pilihan biasa pada task yang sama.

::: deeper Mengapa contrastive training membutuhkan dorongan menjauh
Jika loss hanya menarik dua view dari item yang sama agar berdekatan, encoder dapat memberi setiap input code yang sama. Semua jarak menjadi nol, dan tidak ada yang dipelajari. Dorongan menjauh, yang menjaga code item yang berbeda tetap berjauhan, mencegah keruntuhan (collapse) itu.
:::

## Membandingkan secara adil
*Bagaimana kamu memastikan bahwa pretraining benar-benar membantu?*

Perbandingan yang adil mengubah satu hal pada satu waktu dan menjaga semua yang lain tetap sama.

- **Baris berlabel yang sama, baris uji yang sama, head yang sama** untuk setiap arm. Hanya representasinya yang berbeda.
- **Dua baseline biasa.** Satu memakai pengukuran mentah, tanpa representation learning. Satunya lagi mempelajari fitur dari data berlabel yang kecil saja. Pretraining harus mengalahkan keduanya agar dihitung.
- **Baris uji tetap di luar pretraining.** Label mereka tersembunyi, tetapi input mereka tetap tidak boleh ikut membentuk encoder, atau skornya terlalu optimistis.
- **Banyak split, bukan satu.** Data berlabel yang kecil membuat skor melompat dari split ke split. Jalankan banyak kali, lalu laporkan rata-rata dan spread-nya, atau hitung seberapa sering satu arm mengalahkan arm lain pada split yang sama.

::: deeper Kebocoran lewat data pretraining
Tanpa label bukan berarti tidak berbahaya. Jika kumpulan data pretraining memuat baris yang kemudian kamu uji, encoder sudah melihat input mereka. Ini kebocoran yang sama dengan men-fit scaler pada semua baris, dan obatnya juga sama: pisahkan data lebih dulu, lalu pretrain hanya pada sisi training.
:::

## Perbandingan yang adil pada penguin
*Seperti apa ini dengan angka yang nyata?*

Pakai 124 penguin dari pulau Dream, 56 Adelie dan 68 Chinstrap, lalu tanyakan spesies sebuah penguin dari empat pengukurannya. Pada tiap putaran, 40 penguin disisihkan sebagai baris uji. Dari 84 sisanya, yaitu kumpulan tanpa label, 5 per spesies membentuk data berlabel yang berisi 10 penguin. Head memilih rata-rata kelas yang lebih dekat di dalam code. Representasinya adalah PCA, sebuah autoencoder linear, dengan code berisi 2 angka.

Tabel berikut menunjukkan rata-rata akurasi uji dari 1000 putaran acak. Spread adalah simpangan baku antarputaran.

| Representasi | Akurasi | Spread |
| --- | --- | --- |
| Pengukuran mentah, tanpa code | 83,4% | 10,3 |
| Code yang dipelajari dari 10 penguin berlabel saja | 79,5% | 11,0 |
| Code frozen dari 84 penguin Dream tanpa label | 83,8% | 10,1 |
| Code frozen dari 167 penguin Biscoe (pulau lain) | 80,5% | 6,9 |

[[figure:transfer-learning-and-self-supervision/fair-comparison|Rata-rata akurasi uji dari 1000 putaran, beserta satu simpangan baku. Panel kiri memakai code berisi 2 angka, dan panel kanan code berisi 1 angka.]]

Code dari domain yang sama mengalahkan code dari data kecil sebesar 4,3 poin rata-rata (menang di 640 putaran, seri di 168, dan kalah di 192), tetapi ia hanya setara dengan pengukuran mentah, dengan selisih 0,4 poin. Code Biscoe mendapat skor 3,3 poin di bawah code domain yang sama.

## Memeras code menjadi satu angka
*Apa yang berubah ketika code lebih kecil lagi?*

Ulangi 1000 putaran dengan code berisi 1 angka (panel kanan). Code domain yang sama turun ke 63,8%, jauh di bawah 83,4% milik pengukuran mentah: spread terbesar di dalam kumpulan data itu adalah arah ukuran tubuh secara umum, padahal spesies-spesies ini berbeda terutama pada panjang paruh. Code yang dipelajari dari 10 penguin berlabel juga turun ke sekitar 65%. Meski begitu, code 1 angka dari Biscoe mendapat 85,5%; karena itu, periksa setiap kandidat dan jangan berasumsi.

## Ke mana setelah ini
*Apa yang akan kamu lakukan di Representation lab?*

Kamu kini memiliki kosakata dasarnya: pretext task membuat label gratis, pretraining membangun representasi dari baris tanpa label, dan transfer memakainya ulang, frozen atau fine-tuned. Hasil pada penguin menunjukkan kebiasaan yang paling penting: code hasil pretraining baru dihitung setelah mengalahkan pengukuran mentah dan code dari data kecil, pada baris yang sama dan lewat banyak split.

Representation lab, pelajaran terakhir di course ini, meminta kamu membandingkan representasi pretrained yang frozen dengan fitur dari data berlabel yang kecil, dinilai dengan cara yang sama: baris yang sama, baseline biasa, banyak split, dan spread di samping rata-ratanya.

::: remember
- Self-supervised learning membuat label dari datanya sendiri dengan menyembunyikan satu bagian (reconstruction, masking) atau membandingkan view (contrastive pair), sehingga pretraining tidak membutuhkan baris berlabel.
- Encoder hasil pretraining dipakai ulang secara frozen (hanya head yang belajar) atau fine-tuned (semuanya belajar); semakin sedikit angka yang dilatih, semakin aman bila data berlabelnya kecil.
- Transfer membantu bila data berlabel kecil dan domainnya berkaitan, dan dapat merugikan bila tidak sesuai. Ujilah pada baris yang sama terhadap fitur mentah dan fitur dari data kecil, lewat banyak split.
:::
