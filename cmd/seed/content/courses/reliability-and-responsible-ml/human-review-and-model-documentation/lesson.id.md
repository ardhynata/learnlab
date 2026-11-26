---
slug: human-review-and-model-documentation
title: Human review dan dokumentasi model
---
::: intro
- Sebutkan empat situasi yang membutuhkan manusia (low confidence, high stakes, input out-of-distribution, dan banding), lalu jelaskan mengapa skor confidence hanya menangkap satu di antaranya.
- Rancang abstain band dengan tangan pada 333 penguin, hitung coverage dan accuracy-nya, lalu sesuaikan ukurannya dengan kapasitas reviewer.
- Tulis model card dan decision log singkat, dan nyatakan dengan jelas kapan sebuah model tidak boleh dipakai.

Sebelum mulai: baca "Robustness, fairness, dan privacy" dan "Metrik subgroup dan fairness" (dari kursus "Interpretasi dan analisis kesalahan").
:::

## Empat alasan untuk bertanya kepada manusia
*Kasus mana yang tidak boleh diputuskan model sendirian?*

Pelajaran sebelumnya menekan model untuk melihat di mana ia rusak. Tetap ada kasus yang akan salah, dan model yang selalu menjawab tidak dapat memberi tahu kasus yang mana. **Human review** berarti seseorang memeriksa kasus itu dan memutuskan sebelum ada tindakan apa pun. Empat situasi membutuhkannya.

- **Low confidence.** Skor berada dekat decision boundary, tempat jawaban berbalik. Skor ini hanya layak dipercaya kalau skornya terkalibrasi, seperti di "Kalibrasi dan biaya".
- **High stakes.** Jawaban yang salah mahal atau sulit dibatalkan, misalnya klaim yang ditolak. Ini aturan tentang akibat, dan skornya tidak dipakai.
- **Input out-of-distribution (OOD).** Kasusnya tidak mirip data latih, misalnya nilai di luar rentang yang pernah dilihat model. Model tetap menjawab, sering dengan confidence tinggi, karena skor tidak pernah berkata "saya belum pernah melihat ini".
- **Banding.** Orang yang terdampak meminta kasusnya ditinjau ulang. Jalur untuk ini harus selalu ada.

[[figure:human-review-and-model-documentation/review-routes|Sebuah kasus melewati tiga pemeriksaan. Gagal di salah satunya mengirim kasus itu ke manusia, dan hanya pemeriksaan terakhir yang memakai skor model.]]

> Awas: confidence band hanya menangkap alasan pertama. High stakes dan banding adalah aturan yang kamu tulis sendiri, sedangkan OOD butuh pemeriksaan tersendiri, misalnya uji rentang pada setiap feature.

## Abstain band yang dapat kamu hitung
*Seperti apa model yang dapat berkata "saya tidak yakin"?*

Kamu akan memakai aturan dari "Metrik subgroup dan fairness": penguin yang beratnya 4.700 g atau lebih adalah Gentoo, yang lebih ringan bukan. Pada 333 penguin di tabel bawaan yang punya berat badan dan jenis kelamin, aturan ini benar untuk 303 ekor, sehingga accuracy-nya 303 / 333 = 0,91.

Aturan itu tidak punya probabilitas, sehingga dalam pelajaran ini jarak dari 4.700 g berperan sebagai confidence. Penguin seberat 4.720 g sulit ditebak, sedangkan yang seberat 3.600 g jelas.

**Abstain band** adalah rentang skor tempat model tidak memutuskan dan mengirim kasusnya ke manusia. Di sini, **coverage** berarti porsi kasus yang diputuskan model sendiri. Ini berbeda dari pemakaian kata itu pada conformal prediction. **Accuracy pada kasus yang diputuskan** berarti seberapa sering model benar di antara kasus yang ia putuskan.

Bagi 333 penguin menurut jaraknya dari 4.700 g, lalu hitung di mana aturan itu benar dan salah.

| Jarak dari 4.700 g | Penguin | Aturan benar | Aturan salah |
| --- | --- | --- | --- |
| 0 sampai 99 g | 21 | 13 | 8 |
| 100 sampai 199 g | 17 | 11 | 6 |
| 200 sampai 399 g | 36 | 27 | 9 |
| 400 g atau lebih | 259 | 252 | 7 |
| Semua | 333 | 303 | 30 |

## Coverage melawan accuracy
*Apa yang didapat dan apa yang dibayar untuk setiap lebar band?*

Band selebar w mengirim ke manusia setiap penguin yang jaraknya kurang dari w gram dari 4.700 g. Susun tabel berikut dengan menjumlahkan baris-baris tabel di atas.

> Contoh hitungan: ambil w = 200 g. Band berisi dua baris pertama: 21 + 17 = 38 penguin pergi ke manusia. Model memutuskan 333 - 38 = 295, dan benar pada 303 - (13 + 11) = 279 di antaranya. Coverage-nya 295 / 333 = 0,89 dan accuracy pada kasus yang diputuskan 279 / 295 = 0,95.

| Band (lebih dekat dari) | Dikirim ke manusia | Diputuskan model | Benar | Coverage | Accuracy pada yang diputuskan |
| --- | --- | --- | --- | --- | --- |
| Tanpa band | 0 | 333 | 303 | 333 / 333 = 1,00 | 303 / 333 = 0,91 |
| 100 g | 21 | 312 | 290 | 312 / 333 = 0,94 | 290 / 312 = 0,93 |
| 200 g | 38 | 295 | 279 | 295 / 333 = 0,89 | 279 / 295 = 0,95 |
| 400 g | 74 | 259 | 252 | 259 / 333 = 0,78 | 252 / 259 = 0,97 |

Accuracy pada kasus yang diputuskan naik ketika coverage turun, karena kasus yang disingkirkan adalah kasus yang paling sering salah: 8 dari 21 pada kelompok terdekat. Band hanya berhasil kalau skornya benar-benar mengikuti kebenaran, itulah sebabnya kalibrasi penting.

[[figure:human-review-and-model-documentation/coverage-accuracy|Tiap titik adalah satu lebar band pada data penguin. Band yang lebih lebar bergeser ke kiri (lebih sedikit kasus diputuskan) dan ke atas (keputusan lebih akurat).]]

## Memilih lebarnya
*Seberapa lebar band yang tepat?*

Dua batas yang menentukan: biaya dan kapasitas. Mulai dari biaya. Tinjau sebuah kasus kalau peluang salah dikali biayanya lebih besar daripada biaya satu tinjauan.

> Contoh hitungan: misalkan satu tinjauan memakan 3 menit tenaga staf dan satu keputusan otomatis yang salah menelan 50 menit pengerjaan ulang (keduanya asumsi untuk pelajaran ini). Tinjauan sepadan kalau peluang salah di atas 3 / 50 = 0,06. Porsi salah di tiap baris adalah 8 / 21 = 0,38, 6 / 17 = 0,35, 9 / 36 = 0,25, dan 7 / 259 = 0,03. Tiga baris pertama di atas 0,06 dan baris terakhir di bawahnya, sehingga band-nya 400 g, yang mengirim 74 penguin ke manusia.

Sekarang kapasitas. 74 tinjauan dengan 3 menit masing-masing berarti 222 menit, sekitar 3,7 jam per hari. Kalau satu reviewer hanya punya 2 jam (120 menit, 40 kasus), band 400 g tidak muat tetapi band 200 g muat: 38 × 3 = 114 menit.

Porsi salah ini diukur pada 333 penguin yang sama, sehingga tampak lebih bagus daripada kenyataan: pilih lebarnya pada validation data (kasus yang tidak dipakai untuk melatih) dan periksa pada data baru.

## Coverage per kelompok
*Apakah band memperlakukan semua orang sama?*

Lihat coverage per kelompok, bukan hanya keseluruhan. Dengan band 400 g, model memutuskan 118 dari 165 betina (0,72) tetapi 141 dari 168 jantan (0,84), sehingga reviewer melihat 47 betina dan hanya 27 jantan.

## Beban reviewer dan automation bias
*Apakah mengirim kasus ke manusia membuat jawabannya benar?*

Hanya kalau orang itu sungguh-sungguh memutuskan. **Automation bias** adalah kebiasaan menerima saran mesin, termasuk saran yang salah. Reviewer yang melihat jawaban model lebih dulu, dan lelah setelah berjam-jam menghadapi antrean, mudah terkena bias ini.

Ambil band 400 g. Aturan itu benar pada 13 + 11 + 27 = 51 dari 74 penguin yang ditinjau, dan salah pada 23. Bandingkan tiga reviewer. Angka 70 benar untuk reviewer adalah asumsi, sekitar 95%.

- **Memutuskan sendiri.** Benar pada 70 dari 74. Sistem benar pada 252 + 70 = 322 dari 333, yaitu 0,97.
- **Menerima semua saran.** Benar pada 51 dari 74, sama dengan model. Sistem benar pada 252 + 51 = 303 dari 333, yaitu 0,91, persis seperti tanpa tinjauan sama sekali.
- **Menerima 8 dari 10.** Benar pada 0,8 × 51 + 0,2 × 70 = 54,8 kasus. Skor sistem (252 + 54,8) / 333 = 0,92.

[[figure:human-review-and-model-documentation/review-outcomes|Accuracy sistem pada 333 penguin untuk band 400 g, tanpa review dan dengan tiga perilaku reviewer.]]

Kurangi risikonya dengan menampilkan kasus sebelum saran, meminta alasan singkat, menjaga antrean cukup kecil agar dapat dikerjakan dengan baik, dan mengukur seberapa sering reviewer tidak sepakat dengan model.

## Model card
*Apa yang perlu dikatakan dokumen singkat tentang sebuah model?*

**Model card** adalah dokumen singkat yang menyertai model. Isinya menyebutkan untuk apa model itu, bagaimana ia dibangun dan diuji, dan di mana ia gagal. Isi yang lazim: penggunaan yang dimaksud dan yang di luar cakupan, data, metrik per kelompok, batasan, aturan review, rencana pembaruan, serta pemilik dan nomor versi.

Berikut model card singkat untuk aturan penguin tadi.

| Bagian | Isi |
| --- | --- |
| Model | Penanda Gentoo, aturan v1: berat badan 4.700 g atau lebih |
| Penggunaan yang dimaksud | Menandai penguin yang kemungkinan Gentoo saat spesiesnya kosong, supaya seorang biolog dapat memeriksanya |
| Bukan untuk | Spesies atau tempat lain, anak penguin, dan keputusan tentang satu hewan tanpa pemeriksaan |
| Data | 333 penguin, tiga pulau, 2007 sampai 2009; berat 2.700 sampai 6.300 g; 165 betina, 168 jantan |
| Metrik per kelompok | Semua 0,91 (303 / 333). Betina 0,84 (139 / 165), jantan 0,98 (164 / 168). Diukur pada 333 yang sama, tanpa held-out set (kasus yang disisihkan untuk pengujian) |
| Dengan aturan review | Yang diputuskan: betina 111 / 118 benar (0,94), jantan 141 / 141 (1,00); porsi diputuskan 0,72 dan 0,84 |
| Batasan | Kesalahan menumpuk dekat 4.700 g dan paling banyak menimpa betina; satu pengukuran; aturan itu sendiri tidak memeriksa berat di luar rentang, dan aturan review di bawah menambahkannya |
| Aturan review | 4.301 sampai 5.099 g masuk ke manusia (74 dari 333, 22%, sehingga perlu dua reviewer atau lebih); berat di luar 2.700 sampai 6.300 g tidak mendapat jawaban |
| Rencana pembaruan | Skor ulang tiap musim pada penguin berlabel yang baru; revisi kalau accuracy pada yang diputuskan turun di bawah 0,95 atau dua kelompok berbeda lebih dari 0,10 |

Baris per kelompok adalah penghubung ke "Metrik subgroup dan fairness": satu angka keseluruhan 0,91 menyembunyikan 0,84 untuk betina.

## Decision log
*Apa yang perlu dicatat setiap kali model atau manusia memutuskan?*

**Decision log** menyimpan satu baris per kasus, agar seseorang dapat merekonstruksi apa yang terjadi di kemudian hari. Isinya waktu, versi model, id kasus (bukan data pribadi), skor, jalur (model atau review), jawaban model, jawaban akhir, siapa yang meninjau, dan alasan kalau orang itu tidak setuju. Banding ditambahkan saat selesai.

Berikut tiga baris ilustrasi dari aturan penguin.

| Kasus | Versi | Jarak (g) | Jalur | Kata model | Akhir | Alasan |
| --- | --- | --- | --- | --- | --- | --- |
| 0412 | v1 | 38 | review | Gentoo | bukan Gentoo | sirip 189 mm, seperti Adelie |
| 0413 | v1 | 910 | model | bukan Gentoo | bukan Gentoo | tidak ada |
| 0414 | v1 | 1.740 | di luar rentang | tanpa jawaban | dikirim ke biolog | berat 6.440 g |

Log menjawab pertanyaan yang tidak dapat dijawab card. **Override rate** adalah porsi kasus yang ditinjau di mana orang mengubah jawaban model. Aturan itu salah pada 23 dari 74 penguin yang ditinjau, karena itu reviewer yang menangkap kesalahannya semestinya mengubah jawaban model sekitar 23 kali. Override rate 2 / 74 = 0,03 mengisyaratkan automation bias. Kenaikan mendadak pada porsi yang masuk review mengisyaratkan input yang bergeser.

::: deeper Abstain dengan prediction set
Pelajaran "Conformal prediction" membangun interval untuk angka. Resep yang sama dapat membangun himpunan kelas: simpan setiap kelas yang skornya melewati batas yang terkalibrasi. Himpunan dengan tepat satu kelas dapat diputuskan otomatis. Himpunan kosong atau dengan dua kelas atau lebih masuk ke manusia. Hasilnya aturan abstain dengan janji coverage, di bawah syarat exchangeability yang sama (kasus baru berperilaku seperti kasus kalibrasi).
:::

## Kapan model tidak boleh dipakai
*Apa yang dikatakan ketika jawabannya tidak?*

Kadang hasil dokumentasi yang tepat adalah penolakan. Empat alasan yang lazim: input di luar penggunaan yang dimaksud, band yang terlalu lebar sehingga tidak ada yang sanggup meninjaunya (3,7 jam tinjauan padahal hanya ada 2 jam), kelompok dengan terlalu sedikit kasus untuk mengetahui perilaku model, dan pemakaian high stakes tanpa jalur banding.

Pernyataan yang baik punya empat bagian: apa yang tidak boleh dilakukan, bukti dengan angka, apa yang dilakukan sebagai gantinya, dan apa yang akan mengubah jawabannya.

> Contoh hitungan: "Jangan pakai penanda Gentoo pada penguin di luar 2.700 sampai 6.300 g, atau pada spesies selain tiga yang ada di tabel. Aturan ini dibangun dari 333 penguin tahun 2007 sampai 2009 dan belum pernah melihat kasus-kasus itu. Kirim ke biolog. Kami akan menimbang ulang saat 100 penguin berlabel dari lokasi baru tersedia."

Penolakan dapat dibangun langsung ke dalam sistem, seperti jalur tanpa jawaban pada log di atas. Menuliskannya melindungi orang yang berkata tidak, dan orang-orang yang kalau tidak begitu dapat dirugikan model.

## Berikutnya: lab
*Di mana kamu berlatih?*

Pada pelajaran berikutnya, "Reliability lab", kamu menguji model di berbagai subgroup dan kondisi data, lalu mendokumentasikan di mana human review diperlukan.

::: remember
- Empat situasi membutuhkan manusia: low confidence, high stakes, input OOD, dan banding. Confidence band hanya mencakup yang pertama. Abstain band menukar coverage dengan accuracy pada kasus yang diputuskan, dan lebarnya ditentukan oleh biaya, kapasitas reviewer, dan coverage per kelompok.
- Review hanya membantu kalau reviewer sungguh memutuskan. Dengan automation bias, sistem kembali ke accuracy model sendiri (di sini 303 / 333 = 0,91). Pantau override rate.
- Model card (penggunaan, data, metrik per kelompok, batasan, aturan review, rencana pembaruan) dan decision log membuat model dapat diaudit, dan pernyataan "jangan dipakai" yang jelas adalah bagian dari dokumentasi.
:::
