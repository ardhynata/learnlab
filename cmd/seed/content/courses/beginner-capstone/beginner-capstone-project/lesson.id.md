---
slug: beginner-capstone-project
title: Proyek capstone tingkat pemula
---
::: intro
- Rumuskan sebuah tugas klasifikasi pada tabel penguin, tetapkan baseline, lalu pilih metrik yang sesuai dengan akibat sebuah kesalahan.
- Bandingkan dua model secara adil pada test rows yang sama, baca selisih skor training dan skor test, lalu ulangi pada split baru.
- Jelaskan tiga kesalahan dari angka pengukurannya, tulis laporan proyek, dan nilai pekerjaanmu sendiri dengan sebuah rubrik.

Sebelum mulai: baca "Framing and baselines" dan "Comparing models and errors".
:::

## Ringkasan tugas
*Apa yang kamu bangun di lab ini, dan bagaimana urutan kerjanya?*

**Workbench capstone** adalah proyek yang menutup tingkat ini. Kamu membangun sebuah classifier pada tabel publik, membandingkan dua model dengan sebuah baseline, lalu menjelaskan tiga kesalahan. Tabelnya adalah data penguin dari pelajaran sebelumnya: 344 penguin dari tiga spesies, masing-masing dengan empat pengukuran (panjang paruh, kedalaman paruh, panjang sirip, massa tubuh) dan jenis kelamin. Lab ini tidak memakai data buatan.

Workbench terdiri dari enam langkah. Setiap langkah baru terbuka setelah langkah sebelumnya selesai, dan "selesai" diperiksa pada hasil kerjamu, bukan pada jumlah klik: langkah 5 baru selesai bila tiga baris masing-masing punya alasan dan catatan. Pilihanmu disimpan di browser ini.

[[figure:beginner-capstone-project/six-steps|Enam langkah workbench dan hal yang diperiksa lab sebelum membuka langkah berikutnya.]]

> Gagasan kunci: proyek ini adalah urutan langkahnya. Model yang dipilih sebelum pertanyaannya dirumuskan dan baseline-nya diketahui tidak dapat dinilai.

## Langkah 1: rumuskan masalah
*Pertanyaan apa yang akan kamu ajukan, dan bagaimana kamu menilai jawabannya?*

Pilih salah satu dari tiga tugas. Ketiganya membaca empat pengukuran yang sama dan hanya berbeda pada target.

| Tugas | Baris dipakai | Kelas positif | Dikeluarkan |
|---|---|---|---|
| Adelie atau Chinstrap | 219 | Chinstrap: 68 (31%) | 1 hilang (NA), 124 Gentoo |
| Jantan atau betina | 333 | jantan: 168 (50%) | 11 hilang (NA) |
| Gentoo atau lainnya | 342 | Gentoo: 123 (36%) | 2 hilang (NA) |

Lab membuang baris yang punya missing value, tidak mengisinya, dan menyebutkan jumlahnya. Setelah itu pilih metrik: **Accuracy**, **Recall kelas positif** atau **F1**. Lab menuliskan arti tiap jenis kesalahan dan, bila perlu, sebuah peringatan: pada Adelie atau Chinstrap, model yang selalu menjawab "Adelie" sudah mendapat accuracy 69%.

Sesuaikan metrik dengan akibat kesalahan, seperti di "Framing and baselines". Bila melewatkan Chinstrap adalah kesalahan yang mahal, pilih recall. Bila kedua kesalahan hampir sama mahal dan kedua kelas sama-sama banyak, seperti pada Jantan atau betina, accuracy sudah adil. F1 sesuai untuk kelas positif yang lebih kecil ketika kasus terlewat dan alarm palsu sama-sama berarti.

[[figure:beginner-capstone-project/three-tasks|Tiga tugas: bagaimana masing-masing terbagi menjadi kelas positif dan sisanya, serta skor baseline yang selalu menjawab kelas yang lebih besar pada test rows Split 1.]]

## Langkah 2: baseline
*Skor berapa yang harus dikalahkan setiap model?*

Lab membagi baris satu kali: sekitar 75% untuk training dan 25% untuk test, dan tiap kelas mempertahankan proporsinya. **Split baru** menarik pembagian yang lain. Split 1 untuk Adelie atau Chinstrap adalah split dari "Comparing models and errors": 164 training rows dan 55 test rows (di sana disebut baris held-out). Baseline menjawab kelas yang paling banyak pada training rows dan tidak memakai pengukuran apa pun. Di sini jawabannya "Adelie".

> Contoh hitungan: dari 55 test rows, 38 adalah Adelie. Baseline benar 38 kali: accuracy 38 / 55 = 69,1%. Ia tidak pernah menjawab Chinstrap, sehingga menemukan 0 dari 17: recall 0,0% dan F1 0,0%.

Baca baseline pada ketiga metrik, karena satu metrik saja bisa menipu. Pada Jantan atau betina, baseline selalu menjawab "jantan". Dari 83 test rows, 42 adalah jantan, dan semuanya ditemukan: recall 42 / 42 = 100,0%. Namun 41 betina disebut jantan, sehingga precision (dari baris yang disebut jantan, berapa bagian yang benar-benar jantan) dan accuracy sama-sama 42 / 83 = 50,6%.

> Awas: recall 100,0% tidak membuat baseline menjadi baik. Model yang menjawab "ya" untuk semua baris pasti punya recall sempurna.

## Langkah 3 dan 4: dua model, satu perbandingan yang adil
*Bagaimana memilih dua model dan membandingkannya tanpa menipu diri sendiri?*

Model A dan model B masing-masing memilih sebuah **Model** (k tetangga terdekat, Regresi logistik atau Pohon keputusan), pengaturannya, dan fitur yang boleh dipakai. **Evaluasi model A** dan **Evaluasi model B** melatih model pada training rows lalu menilainya di kedua sisi. Skor test, pada baris yang belum pernah dilihat model, adalah skor yang layak dipercaya.

Perbandingannya adil karena kedua model memakai split dan metrik yang sama, dan model B harus berbeda dari model A. Ubah satu hal setiap kali. Pada k-NN, biarkan **Scale fitur (disarankan)** menyala: dalam satuan mentah, massa tubuh dalam gram menenggelamkan ukuran dalam milimeter.

Pada Adelie atau Chinstrap di Split 1, k-NN (k = 5) mendapat 98,2% pada test rows dan tree (kedalaman 3) 100,0%: unggul satu penguin, 1 / 55 = 1,8 poin. Perhatikan juga selisihnya, seperti di "Underfitting and overfitting". Pada Jantan atau betina, tree berkedalaman 8 mendapat 100,0% pada training rows dan 85,5% pada test rows, selisih 14,5 poin.

[[figure:beginner-capstone-project/train-and-test|Jantan atau betina pada Split 1: accuracy training (berkerangka) dan test (penuh). Tree yang lebih dalam menghafal training rows.]]

::: deeper Cara lab menentukan model yang lebih baik
Model yang lebih baik adalah yang skor test-nya lebih tinggi pada metrikmu. Bila kedua skor persis sama, accuracy yang menentukan, lalu Model A. Selisih satu poin atau kurang, dari baseline maupun antara kedua model, dianggap seri. Selisih training dikurangi test disebut terasa mulai dari 4 poin dan besar mulai dari 10. Ini hanya aturan praktis: pada 55 test rows, satu penguin bernilai 1,8 poin.
:::

## Langkah 5: periksa kesalahan
*Di mana model yang lebih baik salah, dan mengapa?*

Skor menghitung kesalahan tetapi tidak menjelaskannya. Langkah 5 menampilkan test rows yang salah dijawab oleh model yang **lebih baik**, dimulai dari yang paling yakin, lengkap dengan empat pengukuran, kelas sebenarnya, kelas prediksi, dan **confidence**, yaitu bagian tetangga atau daun model yang memilih jawabannya. Tandai tiga baris, pilih alasan yang paling mungkin untuk masing-masing, lalu tulis satu baris tentang apa yang dikatakan angkanya. Kelima alasan itu adalah **Kelas saling tumpang tindih**, **Pengukuran tidak biasa**, **Label mungkin salah**, **Model terlalu sederhana** dan **Fitur kurang**.

Pada Jantan atau betina di Split 1, k-NN adalah model yang lebih baik dan membuat 4 kesalahan dari 83 test rows.

| Baris | Panjang paruh (mm) | Kedalaman paruh (mm) | Panjang sirip (mm) | Massa tubuh (g) | Sebenarnya | Prediksi | Confidence |
|---|---|---|---|---|---|---|---|
| #344 | 50,2 | 18,7 | 198 | 3.775 | betina | jantan | 100% |
| #38 | 42,2 | 18,5 | 180 | 3.550 | betina | jantan | 80% |
| #285 | 46,0 | 18,9 | 195 | 4.150 | betina | jantan | 80% |
| #178 | 46,1 | 15,1 | 215 | 5.100 | jantan | betina | 60% |

Baris #344 memberi sinyal yang bertentangan. Paruhnya, 50,2 mm, lebih panjang daripada rata-rata jantan 45,9 mm dari semua 333 penguin, tetapi massanya, 3.775 g, di bawah rata-rata betina 3.862 g. Itu sesuai dengan **Kelas saling tumpang tindih**.

[[figure:beginner-capstone-project/species-and-sex|Rata-rata massa tubuh betina dan jantan pada tiap spesies, beserta empat kesalahan pada tabel di atas. Spesies bukan fitur di lab ini.]]

::: deeper Alasan adalah hipotesis, dan baris nyaris salah
Nama alasan hanyalah hipotesis, bukan bukti. Bila model yang lebih baik membuat kurang dari tiga kesalahan, lab menambahkan hingga lima baris yang benar tetapi letaknya paling dekat dengan kelas lain, diberi tanda "nyaris salah", sehingga masih ada tiga baris untuk dipelajari.
:::

## Satu split hanyalah satu pendapat
*Apakah hasilnya bertahan pada split baru?*

Sebelum menulis apa pun, tekan **Split baru** dan lihat lagi. Split dengan 83 test rows adalah penilai yang kecil: satu baris bernilai 1 / 83 = 1,2 poin.

Pada Jantan atau betina, Split 1 mengunggulkan k-NN atas tree, 95,2% berbanding 89,2%. Pada Split 2 hasilnya 91,6% berbanding 79,5%. Pada Split 3 urutannya terbalik: tree mendapat 95,2% dan k-NN 94,0%. Dari Split 1 sampai 10, k-NN unggul pada 6, tree pada 3, dan keduanya seri satu kali. Baseline tetap di 50,6% pada setiap split.

Pada Adelie atau Chinstrap gambarannya lebih beragam. Tree unggul pada 2 dari 10 split, k-NN pada 3, dan 5 split seri. Keunggulan satu penguin pada satu split belum membuktikan apa pun.

> Gagasan kunci: katakan apa yang bertahan pada setiap split yang kamu coba, dan katakan apa yang berubah. "k-NN biasanya unggul pada Jantan atau betina" adalah temuan yang lebih baik daripada "k-NN paling baik".

Split baru juga mengubah baris di langkah 5, sehingga lab menghapus tanda yang sudah tidak ada di daftar.

## Langkah 6: jelaskan dan nilai
*Apa yang kamu tulis, dan bagaimana menilai pekerjaanmu sendiri?*

Langkah 6 meminta tiga teks pendek: **Masalahnya**, **Mengapa memilih model ini** dan **Yang akan kucoba berikutnya**. Setelah itu kamu menilai empat kriteria: framing, baseline, perbandingan yang adil, dan analisis kesalahan. Masing-masing punya tiga tingkat, **Belum**, **Sebagian** dan **Sudah**, dengan satu kalimat untuk tiap tingkat. Pilih tingkat yang jujur benar hari ini.

> Contoh kerja: "Saya bertanya apakah seekor penguin itu jantan. Baseline mendapat accuracy 50,6%. Pada 83 test rows yang sama, k-NN mendapat 95,2% dan tree 89,2%, sehingga saya memilih k-NN, meskipun pada Split 3 urutannya terbalik. Tiga kesalahannya adalah betina yang disebut jantan. Saya akan mencoba menambahkan spesies sebagai fitur."

Lab menggabungkan pilihan, skor, kesalahan, dan teksmu menjadi **Ringkasan capstone** yang bisa kamu salin. Sebutkan batasannya: satu tabel, test set yang kecil, dan satu jenis split.

::: remember
- Kerjakan berurutan: rumuskan pertanyaan dan pilih metrik, jalankan baseline, lalu bandingkan dua model yang berbeda pada split yang sama.
- Percayai skor test, baca selisihnya, dan periksa keunggulan kecil pada split baru sebelum menyebut seorang pemenang.
- Jelaskan tiga kesalahan dari angka pengukurannya sebagai hipotesis, lalu tulis proyeknya dan nilai dengan jujur.
:::

@@lab

## Lab: workbench capstone
Kamu mulai tanpa pilihan apa pun. Keenam langkah terbuka berurutan, dan apa yang kamu pilih atau ketik hanya disimpan di browser ini. Angka di bawah berlaku dari awal yang bersih: tekan **Mulai dari awal**, lalu tekan lagi selagi tertulis **Tekan lagi untuk menghapus semuanya**. Lab kemudian mulai pada Split 1, dengan Model A pada k tetangga terdekat (k = 5, di-scale) dan Model B pada Pohon keputusan (kedalaman 3, daun 1).

### Langkah
1. **Rumuskan masalah.** Pilih sebuah tugas dan sebuah metrik. Baik: kamu dapat menyebut akibat tiap kesalahan dan alasan metrikmu sesuai.
2. **Baseline.** Tekan **Jalankan baseline** dan baca ketiga skornya. Baik: kamu tahu skor yang harus dikalahkan pada metrikmu.
3. **Model A.** Pilih model, pengaturan, dan fitur, lalu tekan **Evaluasi model A**. Baik: kamu dapat menjelaskan mengapa memilihnya dan membaca kedua skornya.
4. **Model B dan perbandingan.** Jawab Kuis Cepat dulu, buat model B berbeda dari model A, lalu tekan **Evaluasi model B**. Baik: split sama, metrik sama, satu perubahan setiap kali, dan kamu membaca selisihnya.
5. **Periksa kesalahan.** Tandai tiga baris, pilih alasan, dan tulis catatan untuk masing-masing. Baik: setiap catatan mengutip angkanya.
6. **Jelaskan dan nilai.** Isi tiga teks dan nilai empat kriteria. Baik: penilaianmu sesuai dengan buktinya.

### Kontrol
- Enam chip di atas langkah-langkah melompat ke sebuah langkah. Langkah berikutnya terkunci ("Selesaikan langkah N dulu") sampai langkah sebelumnya selesai; **Lanjut ke langkah N** memindahkanmu. Judul langkah membuka dan menutup langkahnya.
- **1. Pilih tugas** (daftar radio): **Adelie atau Chinstrap**, **Jantan atau betina**, **Gentoo atau lainnya**. **2. Pilih metrik untuk menilai**: **Accuracy**, **Recall kelas positif**, **F1**.
- **Jalankan baseline** menilai baseline. **Split baru** menarik split berikutnya (**Split 1**, **Split 2** dan seterusnya).
- **Model** (pilihan): **k tetangga terdekat**, **Regresi logistik**, **Pohon keputusan**. **Tetangga (k)** (1 sampai 25, mulai dari 5) dan **Scale fitur (disarankan)** (menyala) milik k-NN. **Kedalaman maksimum** (1 sampai 8, mulai dari 3) dan **Minimum baris per daun** (1 sampai 20, mulai dari 1) milik tree. Regresi logistik tidak punya pengaturan.
- **Fitur yang boleh dipakai model**: **Panjang paruh (mm)**, **Kedalaman paruh (mm)**, **Panjang sirip (mm)**, **Massa tubuh (g)**; sekurangnya satu tetap menyala.
- **Evaluasi model A** dan **Evaluasi model B**. Setelah tekanan pertama, skor mengikuti setiap perubahan yang kamu buat.
- **Buka Kuis Cepat** membuka panel dari tombol bulat Kuis Cepat; lencananya berdenyut saat langkah 4 terbuka.
- **Tandai** (kotak centang "Tandai baris N") memilih sebuah baris, paling banyak tiga. **Alasan untuk baris N** menawarkan **Pilih alasan** dan kelima alasan. **Catatan untuk baris N** (placeholder "Apa kata angkanya?") menampung 160 karakter.
- **Masalahnya**, **Mengapa memilih model ini** dan **Yang akan kucoba berikutnya** masing-masing menampung 400 karakter. **Nilai pekerjaanmu sendiri** punya empat kriteria dengan tiga tingkat masing-masing. **Salin ringkasan** menyalin **Ringkasan capstone**.
- **Mulai dari awal** (di kartu **Proyekmu** dan di bawah langkah-langkah) dan **Reset** menghapus pekerjaanmu, tetapi hanya pada tekanan kedua dalam lima detik. **Layar penuh** memperbesar lab.

### Yang kamu lihat
- Status menampilkan "N dari 6 langkah selesai". Kartu **Proyekmu** mendaftar **Tugas**, **Metrik**, **Split**, **Model A**, **Model B** dan **Model yang lebih baik**.
- Langkah 1 menyebutkan berapa penguin yang dipakai dan dikeluarkan, menggambar batang **Keseimbangan kelas**, dan mendaftar **Arti sebuah kesalahan**.
- Skor ada di sebuah tabel dengan **Skor**, **Training rows** dan **Test rows**; metrikmu ditandai "(metrikmu)". Di bawahnya ada **Confusion matrix** pada test rows: true positive, false negative (terlewat), false positive (alarm palsu), true negative. Kalimat sederhana menyebutkan apakah sebuah model mengalahkan baseline dan menjelaskan selisihnya.
- Langkah 4 menambahkan **Perbandingan pada split yang sama**, sebuah diagram yang judulnya memakai metrikmu, **Batang berkerangka: training rows**, **Batang penuh: test rows** (label dengan satu desimal), dan sebuah kalimat yang menyebut model yang lebih baik.
- Kuis Cepat menanyakan "Akankah model B mengalahkan baseline pada test rows?" dan mengikuti model B saat kamu mengubahnya: "Prediksimu tepat." atau "Tidak seperti dugaanmu."
- Langkah 5 menampilkan **Tandai**, **Baris**, keempat pengukuran, **Sebenarnya**, **Prediksi** dan **Confidence**; tanda • pada judul kolom berarti model memakai fitur itu. Penghitungnya berbunyi "Ditandai 3 dari 3; 3 dengan alasan dan catatan."

### Percobaan
1. **Berapa skor sebuah baseline?** Prediksi: pada Adelie atau Chinstrap, baseline tidak pernah melihat pengukuran. Dari ketiga skornya, mana yang paling tinggi? Persiapan: pilih **Adelie atau Chinstrap** dan **Accuracy**, lalu tekan **Jalankan baseline**. Accuracy-nya 69,1% pada test rows, **Recall kelas positif** dan **F1** 0,0%, dan matriks menampilkan 38 true negative dan 17 false negative. Selanjutnya, prediksi: pada Jantan atau betina, apakah recall-nya rendah atau tinggi? Persiapan: buka langkah 1, pilih **Jantan atau betina** dan **Recall kelas positif**, lalu buka langkah 2. Hasilnya 100,0% (42 dari 42), dengan accuracy 50,6%. Mengapa recall yang sempurna bukan hasil yang baik di sini?
2. **Apakah model B mengalahkan baseline?** Prediksi: akankah model B mengalahkan baseline pada test rows? Persiapan: pilih lagi **Adelie atau Chinstrap** dan **Accuracy**, tekan **Evaluasi model A** (98,2% pada test rows), pergi ke langkah 4, lalu buka Kuis Cepat dan pilih jawaban sebelum menekan **Evaluasi model B**. B mendapat 100,0% melawan 69,1%. Lalu matikan **Panjang paruh (mm)**, **Kedalaman paruh (mm)** dan **Panjang sirip (mm)**, sehingga B hanya melihat **Massa tubuh (g)**: B turun ke 69,1% dengan recall 0,0%, Kuis Cepat berkata "hampir sama", dan A unggul 29,1 poin. Mengapa tree yang hanya melihat massa tubuh berperilaku seperti baseline? Nyalakan kembali fiturnya.
3. **Apakah scaling berpengaruh?** Prediksi: di langkah 3, matikan **Scale fitur (disarankan)**. Apakah accuracy test model A akan naik, tetap, atau turun? Nilainya turun dari 98,2% ke 78,2% (43 dari 55), dan recall dari 94,1% ke 41,2% (7 dari 17). Model itu masih mengalahkan baseline sebesar 9,1 poin tetapi melewatkan 10 dari 17 Chinstrap. Jelaskan dengan satuan: massa tubuh dalam ribuan gram, sedangkan ketiga fitur lain di bawah 250 milimeter. Nyalakan kembali tombolnya.
4. **Skor training dan skor test.** Prediksi: bila **Kedalaman maksimum** model B naik dari 3 ke 8, skor mana yang berubah? Persiapan: buka langkah 1, pilih **Jantan atau betina** dengan **Accuracy**, lalu naikkan kedalamannya. Pada kedalaman 3, B mendapat 91,6% pada training rows dan 89,2% pada test rows. Pada kedalaman 8 hasilnya 100,0% dan 85,5% (71 dari 83), selisih 14,5 poin, dan lab menyebut selisih itu besar. Model A tetap di 94,0% dan 95,2%. Kembalikan kedalamannya ke 3.
5. **Tiga kesalahan.** Prediksi: kesalahan model mana yang akan didaftar langkah 5, dan berapa banyak? Langkah itu mendaftar model yang lebih baik, Model A, dengan 4 kesalahan pada 83 test rows: #344, #38 dan #285 (betina disebut jantan, dengan confidence 100%, 80% dan 80%) serta #178 (jantan disebut betina, dengan confidence 60%). Tandai tiga baris, pilih alasan untuk masing-masing, dan tulis catatan yang mengutip angkanya, misalnya "paruh 50,2 mm di atas rata-rata jantan, massa 3.775 g di bawah rata-rata betina". Di mana alasanmu hanya tebakan, dan apa yang akan mengujinya?
6. **Split baru pada data nyata.** Prediksi: Model A (95,2%) mengalahkan Model B (89,2%) pada Split 1. Apakah itu berlaku pada split baru? Buka langkah 2 dan tekan **Split baru** dua kali. Split 2: A 91,6%, B 79,5%. Split 3: A 94,0%, B 95,2%, sehingga urutannya terbalik. Baseline tetap di 50,6%, dan tanda yang kamu buat mungkin dihapus. Dari Split 1 sampai 10, k-NN unggul 6 kali dan tree 3 kali. Bagaimana kamu menuliskan temuannya?

### Rubrik
Nilai tiap kriteria di akhir langkah 6 dengan **Belum**, **Sebagian** atau **Sudah**. Lab mencetak kalimat-kalimat ini.

| Kriteria | Belum | Sebagian | Sudah |
|---|---|---|---|
| Framing masalah | Saya memilih tugas tetapi belum menjelaskan akibat sebuah kesalahan atau alasan memilih metrik. | Saya sudah menjelaskan arti sebuah kesalahan, tetapi alasan memilih metriknya masih samar. | Saya menyebutkan akibat tiap jenis kesalahan dan memilih metrik yang sesuai. |
| Baseline | Saya menjalankan baseline tetapi tidak memakainya untuk menilai model. | Saya melihat skor baseline tetapi belum memeriksa apakah tiap model mengalahkannya pada metrik pilihan saya. | Saya memeriksa bahwa tiap model mengalahkan baseline pada metrik pilihan saya, pada test rows. |
| Perbandingan yang adil | Saya membandingkan model pada baris yang berbeda, atau hanya dari skor training. | Saya memakai test rows yang sama untuk kedua model tetapi tidak melihat selisih train dan test. | Split sama, skor test, dan saya membaca selisih train dan test sebelum memilih; saya tahu split baru bisa mengubah urutannya. |
| Analisis kesalahan | Saya hanya melihat skor, bukan kesalahan satu per satu. | Saya melihat tiga kesalahan, tetapi alasannya hanya tebakan yang tidak saya cocokkan dengan pengukuran. | Untuk tiga kesalahan saya membaca pengukurannya, memberi alasan dan menulis apa yang diberitahukannya. |

### Data nyata
Setiap angka di sini berasal dari tabel penguin yang nyata: 344 penguin dari Kepulauan Palmer, Antarktika (lihat catatan data untuk sumbernya). Langkah transfernya adalah tugasmu: ulangi idemu yang terbaik pada tugas lain, lalu pada split baru, dan katakan apa yang bertahan. Satu tabel bukan semua koloni, karena itu tulis batasan itu di **Yang akan kucoba berikutnya**.
