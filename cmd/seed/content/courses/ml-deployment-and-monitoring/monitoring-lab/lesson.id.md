---
slug: monitoring-lab
title: Monitoring lab
---
::: intro
- Putar ulang stream inferensi buatan hari demi hari, lalu tentukan monitor mana yang berbunyi lebih dulu dan mengapa monitor accuracy terlambat.
- Selidiki sebuah alert lewat histogram fitur, slice, dan kalibrasi skor sebelum kamu menyentuh model.
- Pilih antara rollback, kalibrasi ulang, retraining, dan terus memantau, lalu bandingkan pilihanmu dengan biaya ketiga opsi lainnya.

Sebelum mulai: baca "Serving, versioning, dan skew" dan "Drift, alert, dan rollback". Pelajaran pertama menunjukkan bagaimana satu fitur yang rusak dapat sampai ke production. Pelajaran kedua menunjukkan bagaimana monitor, window, dan label yang terlambat berubah menjadi sebuah alert. Monitoring lab memungkinkan kamu menjalankan kedua cerita itu pada satu stream, dengan kamu sebagai orang yang sedang berjaga.
:::

## Apa yang diputar ulang lab
*Apa isi stream ini, dan apa yang dapat dilihat sebuah monitor?*

Lab memutar ulang stream buatan selama 60 hari dengan 200 prediksi per hari, total 12.000. Tidak ada satu pun yang berasal dari data nyata. Setiap baris memiliki empat input (pengeluaran, masa langganan, tiket, dan login) dan sebuah label 0 atau 1. Model yang bertugas, versi v1, adalah regresi logistik yang dilatih pada 1.959 baris bersih sebelum peluncuran. Skornya 84,2% pada 841 baris lain yang belum pernah dilihatnya. Versi sebelumnya, v2, adalah decision tree berkedalaman 3 yang mendapat 77,3% pada baris yang sama.

Label datang terlambat: setiap label tiba 7 hari setelah prediksinya.
Satu kejadian per run dimulai pada hari yang kamu pilih. Kejadian itu dapat berupa pergeseran pada input, rilis yang merusak sebuah fitur, perubahan keseimbangan kelas, perubahan pada aturan yang menghubungkan input dengan label, atau label yang makin lambat. Kamu berperan sebagai orang yang sedang berjaga dan menerima alert. Setiap grafik hanya menampilkan apa yang dapat dilihat tim sungguhan pada hari itu, dan accuracy yang sebenarnya tetap tersembunyi sampai kamu memintanya.

## Tiga monitor dan satu aturan
*Bagaimana tiap monitor mengubah stream menjadi alert?*

Lab menjalankan tiga monitor dari "Drift, alert, dan rollback" dengan pengaturan di bawah ini. PSI mengukur seberapa jauh sebuah distribusi telah bergeser dari versi training-nya. Covariate drift menggeser input, label shift menggeser keseimbangan kelas, dan concept shift mengubah aturan yang menghubungkan input dengan label.

| Monitor | Apa yang dibaca | Alert ketika |
| --- | --- | --- |
| Drift input (PSI) | PSI tiap fitur pada 1 hari terakhir, terhadap data training yang dipotong menjadi persepuluhan | PSI terbesar di atas 0,25 |
| Drift skor (PSI) | PSI skor model, terhadap skornya pada holdout | di atas batas yang sama, 0,25 |
| Akurasi (label terlambat) | accuracy dari label yang tiba dalam 7 hari terakhir | di bawah 84,2% dikurangi 8 poin, yaitu 76,2% |

Sebuah alert membutuhkan dua hari berturut-turut yang melewati batas, dan monitor accuracy menunggu sedikitnya 100 label. Semua pengaturan itu adalah kontrol yang dapat kamu ubah.

> Contoh hitungan: ambil rilis yang merusak sebuah fitur pada hari ke-25. Prediksi hari ke-25 diberi label pada hari ke-32, karena 25 + 7 = 32. Pada hari ke-36, label yang tiba pada hari ke-30 sampai ke-36 milik prediksi yang dibuat pada hari ke-23 sampai ke-29. Dari 7 hari itu, hari ke-25 sampai ke-29 sudah setelah kejadian: 5 dari 7. Monitor accuracy melihat campuran hari lama dan hari yang rusak, sehingga angkanya turun perlahan walaupun model salah pada setiap baris baru. Dengan cara yang sama, pada hari ke-30 tim sudah melayani 6.000 prediksi tetapi baru mengetahui hasilnya untuk prediksi sampai hari ke-23.

## Monitor saling berlomba
*Siapa yang berbunyi lebih dulu ketika sebuah rilis merusak input?*

Mulailah dari bawaan lab, **Bug training-serving skew**. Mulai hari ke-25, sebuah rilis mengirim pengeluaran dikali 100, seolah-olah satuannya berubah. Nilai sebenarnya dan label tidak berubah.

[[figure:monitoring-lab/alert-race|Run bawaan pada sumbu hari. Rilis terjadi pada hari ke-25, monitor input dan skor berbunyi pada hari ke-26, label rusak pertama tiba pada hari ke-32, dan monitor accuracy berbunyi pada hari ke-36.]]

Monitor input berbunyi pada hari ke-26 dengan PSI pengeluaran 6,39 terhadap batas 0,25, dan monitor skor pada hari yang sama dengan 6,38. Monitor accuracy baru berbunyi pada hari ke-36, dengan angka 73,9% terhadap batasnya 76,2%. Selisihnya 10 hari.

Selama 10 hari itu, dari hari ke-26 sampai hari ke-35, model melayani 2.000 prediksi dan 586 di antaranya salah. Dengan input yang benar, model yang sama hanya akan salah pada 337. Diamnya monitor accuracy menelan 586 - 337 = 249 kesalahan tambahan.

> Gagasan kunci: input terlihat begitu datang, sedangkan label baru diketahui setelah kembali. Ketika sebuah bug menggeser input sejauh ini, monitor input memenangkan lomba dengan selisih sekitar lamanya keterlambatan label.

## Selidiki sebelum bertindak
*Apa yang ditunjukkan ketiga tampilan penyelidikan?*

Sebuah alert hanya mengatakan bahwa ada yang bergeser, bukan apa yang bergeser. Pada tampilan **Selidiki**, kartu plot menampilkan salah satu dari tiga gambar, masing-masing dibaca pada hari yang ditunjuk slider.

| Tampilan | Pertanyaan yang dijawab | Pada run bawaan |
| --- | --- | --- |
| Histogram fitur | Apakah satu input berubah bentuk? | Pada hari ke-31 PSI pengeluaran 5,50, dan 53% dari 7 hari terakhir berada di persepuluhan terendah nilai training dan 46% di persepuluhan tertinggi. Ketiga PSI lainnya 0,02 atau kurang. |
| Irisan menurut fitur | Di mana accuracy hilang? | Pada hari ke-36 baris terbagi 52% ke sepertiga bawah pengeluaran, 0% ke sepertiga tengah, dan 48% ke sepertiga atas. |
| Kalibrasi skor | Apakah skor masih berarti seperti yang dikatakannya? | Pada hari ke-36 skor rata-rata 49% dan positif yang terlihat 51%, sehingga kalibrasinya tampak baik. |

Satu fitur yang timpang menunjuk ke feed yang rusak. Banyak fitur yang bergeser sedikit menunjuk ke perubahan di dunia. Dan kalibrasi yang tampak baik belum membersihkan model dari kecurigaan: sebuah bug dapat membiarkan skor rata-rata tidak berubah.

> Awas: sebuah tampilan hanya memiliki apa yang dapat diketahui tim. Tampilan accuracy dan kalibrasi hanya memakai baris yang labelnya sudah tiba, dari rentang telusur 21 hari (tidak terkait keterlambatan label), sehingga pada hari terjadinya perubahan keduanya masih menunjukkan dunia yang lama.

## Empat perbaikan dan harganya
*Bagaimana lab memberi harga pada sebuah keputusan?*

Ketika kamu menekan tombol keputusan, lab menerapkannya mulai dari hari yang ditampilkan, lalu membandingkan keempat opsi pada sisa stream dengan memakai label yang sebenarnya.

| Opsi | Apa yang dilakukan | Biaya tetap | Aktif |
| --- | --- | --- | --- |
| Rollback ke versi sebelumnya | menghapus bug rilis dan mengembalikan v2 | 1 | seketika |
| Kalibrasi ulang | menskalakan ulang skor v1 dengan label terbaru yang sudah tiba | 2 | seketika |
| Latih ulang dengan data berlabel terbaru | melatih ulang regresi logistik pada label tersebut | 10 | 3 hari kemudian |
| Terus pantau | tidak melakukan apa pun | 0 | - |

Biaya totalnya adalah biaya tetap ditambah 0,05 untuk setiap prediksi yang salah dari hari kamu memutuskan sampai hari ke-60. Kalibrasi ulang dan retraining belajar dari label yang sudah tiba pada 10 hari terakhir (sampai 10 x 200 = 2.000 baris) dan membutuhkan sedikitnya 60 label yang memuat kedua kelas.

> Contoh hitungan: pada hari ke-26 run bawaan, rollback menyisakan 1.693 prediksi salah, sehingga biayanya 1 + 0,05 x 1.693 = 85,65, yang tampil sebagai 85,7. Kalibrasi ulang menyisakan 2.048, maka 2 + 0,05 x 2.048 = 104,4. Terus memantau berbiaya 102,5 dan retraining 112,4. Kalibrasi ulang lebih buruk daripada tidak berbuat apa-apa karena ia tidak mengubah apa pun (accuracy 70,7% dengan atau tanpanya) dan tetap membayar 2 unit.

## Label menentukan temponya
*Mengapa perbaikan termurah bergantung pada hari kamu memutuskan?*

Kalibrasi ulang atau retraining belajar dari label yang sudah tiba, sehingga hari kamu menekan tombol menentukan apa yang dapat dipelajarinya.

[[figure:monitoring-lab/cost-by-day|Bug skew yang sama, diputuskan pada hari ke-26 dan hari ke-36. Rollback paling murah pada hari ke-26, dan retraining unggul tipis pada hari ke-36. Setiap kelompok hanya menghitung hari setelah keputusannya sendiri.]]

Pada hari ke-36 retraining berbiaya 58,2 dan rollback 61,3. Saat itu label sudah memuat hari-hari yang rusak, sehingga model hasil retraining belajar mengabaikan pengeluaran. Bugnya masih ada. Angka biaya tidak mengetahui hal itu.

[[figure:monitoring-lab/label-shift|Label shift mulai hari ke-25. Skor rata-rata model terhadap positif yang benar-benar muncul, pada hari ke-28, 40, dan 60. Keduanya sama pada awalnya karena label yang sudah tiba berasal dari sebelum pergeseran.]]

Label shift menunjukkan hal yang sama. Pada hari ke-28 terus memantau berbiaya 56,7 dan kalibrasi ulang 63,9, karena label yang dipelajarinya berasal dari sebelum pergeseran. Pada hari ke-40 kalibrasi ulang berbiaya 20,1 dan terus memantau 36,6.

Concept shift bahkan lebih lambat. Retraining pada hari ke-34 belajar dari 2.000 label yang 600 di antaranya, 30%, berasal dari setelah kejadian, dan accuracy sesudahnya 63,0%. Pada hari ke-40, 1.800 dari 2.000 label itu, 90%, berasal dari setelah kejadian, dan accuracy sesudahnya 77,6%. Pada **Label terlambat dengan drift**, label tiba 21 hari setelah prediksinya, bukan 7, sehingga monitor accuracy menjadi lebih lambat lagi.

## Alert bukan kerusakan
*Bagaimana threshold dan window menukar peringatan dini dengan alarm palsu?*

Alert hanyalah petunjuk. Pilih **Covariate drift**: pengeluaran naik 1,5 simpangan baku dan aturan yang menghubungkan input dengan label tidak berubah. Monitor input berbunyi pada hari ke-26 dengan PSI 2,50, dan monitor accuracy tidak pernah berbunyi. Terus memantau berbiaya 38,4 dengan accuracy 89,0%, di atas 84,2% saat peluncuran. Rollback berbiaya 53,2.

[[figure:monitoring-lab/scenario-map|Kelima skenario pada pengaturan bawaannya. Untuk masing-masing: hari saat tiap monitor pertama kali berbunyi, dan opsi dengan biaya total terendah bila kamu memutuskan pada hari alert pertama.]]

Threshold menentukan berapa banyak alert yang kamu terima. Pada stream **Bersih** tidak terjadi apa-apa, dan threshold bawaan 0,25 tidak memunculkan alert pada 6 stream pertama mana pun. Turunkan **Ambang alert PSI** ke 0,05 dengan window input 1 hari dan monitor input berstatus alert pada 48 dari 60 hari. Lebarkan **Jendela input (hari)** ke 7 dan angkanya turun menjadi 0.

Window memakan waktu. Pada run skew bawaan, window input 7 hari menunda alert pertama dari hari ke-26 ke hari ke-27.

> Gagasan kunci: threshold yang lebih rendah dan window yang lebih pendek memberi peringatan lebih awal dan lebih sering membunyikan alarm palsu. Pilihlah keduanya pada stream bersih lebih dulu, lalu periksa harganya pada kejadian yang nyata.

::: deeper Mengapa retraining menang pada hari ke-36 dan tetap belum tentu pilihan yang tepat
Mulai hari ke-36, model biaya lab menyatakan retraining (58,2) mengalahkan rollback (61,3) dengan selisih 3,1 unit. Retraining belajar dari label yang sudah memuat hari-hari dengan input rusak, sehingga ia belajar bergantung lebih sedikit pada pengeluaran, padahal pengeluaran membawa weight terbesar pada aturan yang memberi label stream ini. Accuracy sesudahnya 80,7% dibanding 75,9% untuk v2 hasil rollback.

Ada dua hal yang tidak dihitung oleh biaya itu. Bugnya masih ada di production, sehingga setiap rilis berikutnya bertemu lagi dengannya. Dan model yang belajar mengabaikan pengeluaran harus dilatih ulang sekali lagi setelah perbaikan. Tim yang matang akan melakukan rollback lebih dulu untuk penyelamatan cepat, lalu memperbaiki kode fitur, lalu melatih ulang pada label yang bersih. Lab mengukur apa yang dapat diukurnya: prediksi salah dan biaya tetap. Pertimbangannya tetap ada padamu.
:::

::: remember
- Pada bug yang menggeser input, monitor input dan skor berbunyi dalam satu atau dua hari, dan monitor accuracy menyusul setelah keterlambatan label. Concept shift tidak menggeser input sama sekali, sehingga hanya label yang dapat menunjukkannya.
- Selidiki dengan histogram, slice, dan kalibrasi sebelum memilih, dan ingat bahwa tampilan itu hanya mengetahui label yang sudah tiba.
- Sebuah perbaikan belajar dari label yang sudah tiba, sehingga pilihan termurah berubah menurut hari. Sebuah alert saja bukan kerusakan, dan threshold serta window menukar peringatan dini dengan alarm palsu.
:::

@@lab

## Lab: memantau stream inferensi
Kamu memutar ulang stream buatan selama 60 hari dengan 200 prediksi per hari. Satu kejadian terjadi di dalamnya, dan kamu membaca monitor, menyelidiki, lalu memutuskan. Semuanya dibuat dan di-seed, dan streamnya sama untuk semua orang sampai kamu menekan **Stream baru**.

### Kontrol
- **Jalankan**, **Jeda**, **Jalankan lagi**, **Langkah sebelumnya**, **Langkah berikutnya**, **Kecepatan**: memutar ulang stream satu hari per langkah. **Jalankan lagi** muncul pada hari ke-60.
- **Hari** adalah slider di samping kontrol pemutaran. Geser ke hari mana pun. Pada plot, klik atau seret untuk memindahkan hari, dan tombol panah keyboard bekerja pada plot utama.
- **Layar penuh** memperbesar lab. **Reset** mengembalikan setiap parameter, stream, dan Kuis Cepat, lalu memutar balik ke hari ke-1.
- **Monitor** dan **Selidiki** mengalihkan kartu plot antara grafik PSI dan tampilan penyelidikan.
- Pada tampilan Selidiki: **Tampilan** memilih **Histogram fitur**, **Irisan menurut fitur**, atau **Kalibrasi skor**, dan **Fitur** memilih **pengeluaran**, **masa langganan**, **tiket**, atau **login** (tidak dipakai oleh tampilan kalibrasi).
- **Skenario** memilih kejadian: **Bersih (tidak ada kejadian)**, **Covariate drift**, **Bug training-serving skew**, **Label shift**, **Concept shift**, atau **Label terlambat dengan drift**. Memilih salah satunya melompat ke enam hari setelah kejadian.
- **Tingkat keparahan** (0 sampai 1, mulai dari 0,50) menentukan seberapa kuat kejadiannya. **Kejadian mulai pada hari** (10 sampai 45, mulai dari 25) menentukan kapan.
- **Tampilkan akurasi sebenarnya** menambahkan accuracy hari yang sama yang tersembunyi ke grafik accuracy.
- **Ambang alert PSI** (0,05 sampai 1, mulai dari 0,25) dan **Jendela input (hari)** (1 sampai 7, mulai dari 1) mengatur kedua monitor PSI.
- **Penurunan akurasi yang memicu alert (poin)** (2 sampai 20, mulai dari 8) dan **Jendela akurasi (hari)** (1 sampai 14, mulai dari 7) mengatur monitor accuracy.
- **Stream baru** menarik stream lain yang di-seed. **Reset** kembali ke yang pertama.
- Tombol keputusan **Kembalikan ke versi sebelumnya**, **Kalibrasi ulang**, **Latih ulang dengan data berlabel terbaru**, dan **Terus pantau** menerapkan pilihan mulai dari hari yang ditampilkan. Menekan tombol lain menggantikannya.
- Tombol **Kuis Cepat** berisi satu pertanyaan: "Sebuah fitur berubah satuan setelah rilis. Sinyal mana yang berbunyi lebih dulu: monitor drift input atau monitor akurasi?" Pilih jawaban, jalankan skenario bawaan sampai kedua monitor berbunyi, lalu tekan **Periksa jawaban**.

### Membaca layar
- Kartu plot, **Replay stream inferensi**, menggambar PSI **pengeluaran**, **masa langganan**, **tiket**, dan **login** menurut hari, dengan threshold alert putus-putus, tanda merah di bagian bawah pada hari alert, dan garis putus-putus di tempat kejadian dimulai. Sumbunya dipadatkan di atas 1, sehingga bug satuan tidak meratakan sisanya. Baris status berbunyi, misalnya, "Hari 31 dari 60. Alert sejauh ini: ...".
- **Skor prediksi: drift distribusi** menunjukkan PSI skor, dengan sebuah strip di bawahnya: untuk setiap hari, porsi prediksi pada masing-masing dari lima rentang skor.
- **Akurasi: label yang terlambat dibanding kenyataan** menunjukkan accuracy dari label yang sudah tiba, accuracy saat rilis, dan batas alert. Dengan **Tampilkan akurasi sebenarnya** menyala, accuracy yang sebenarnya juga muncul.
- **Log alert** memiliki kolom **Monitor**, **Alert pertama**, **Nilai saat itu**, dan **Hari alert**, dengan satu baris untuk masing-masing **Drift input (PSI)**, **Drift skor (PSI)**, dan **Akurasi (label terlambat)**. Log hanya menghitung hari sampai hari yang ditampilkan.
- **Keputusan** membandingkan **Pilihan**, **Akurasi sesudah**, **Prediksi salah**, dan **Biaya**. Pilihanmu ditandai "pilihanmu" dan yang termurah "termurah". Satu kalimat di bawah plot menjelaskan hasilnya. Menekan sebuah keputusan menyalakan **Tampilkan akurasi sebenarnya** dan menandai hari itu pada grafik.
- Pada **Penyelidikan**, histogram membandingkan training (putus-putus, 10% pada tiap persepuluhan) dengan 7 hari terakhir. Tampilan irisan menunjukkan accuracy pada sepertiga bawah, tengah, dan atas fitur, referensi dibanding terbaru. Tampilan kalibrasi menunjukkan lima rentang skor.

### Eksperimen
Tekan **Reset** sebelum setiap eksperimen, supaya angkamu sama.

1. **Siapa yang berbunyi lebih dulu?** Prediksi: pada bug perubahan satuan, mana yang berbunyi lebih dulu, monitor drift input atau monitor accuracy? Pilih jawaban di Kuis Cepat. Tekan **Jalankan** (naikkan **Kecepatan** jika mau) sampai monitor accuracy berbunyi, lalu baca **Log alert**: **Drift input (PSI)** pada hari ke-26 (6,39, batas 0,25), **Drift skor (PSI)** pada hari ke-26 (6,38), dan **Akurasi (label terlambat)** pada hari ke-36 (73,9%, batas 76,2%). Tekan **Periksa jawaban**. Mengapa selisihnya 10 hari?
2. **Temukan input yang rusak.** Prediksi: fitur mana yang akan ditunjuk histogram? Atur slider **Hari** ke 31, beralih ke **Selidiki**, dan pilih **Histogram fitur** dengan **pengeluaran**: PSI 5,50, rata-rata -3,3 dibanding 0,0 pada training, batang hampir seluruhnya di kedua ujung. Coba **masa langganan** (PSI 0,01). Lalu coba **Irisan menurut fitur** dengan **pengeluaran** pada hari ke-36 (sepertiga tengah kosong) dan **Kalibrasi skor**. Tampilan mana yang menunjukkan biang keladinya, dan mana yang keliru membersihkan model?
3. **Bertindak cepat atau menunggu?** Prediksi: apakah lebih murah bertindak pada alert input pertama atau pada alert accuracy? Atur slider **Hari** ke 26 lalu tekan **Kembalikan ke versi sebelumnya**: biayanya 85,7, yang termurah, dan **Terus pantau** berbiaya 102,5. Lalu atur hari ke 36 dan tekan **Latih ulang dengan data berlabel terbaru**: sekarang ia yang termurah, 58,2, dibanding 61,3 untuk rollback. Baca kalimat di bawah plot. Mana yang akan kamu rilis?
4. **Alert tanpa kerusakan.** Prediksi: apakah accuracy akan turun ketika pengeluaran naik 1,5 simpangan baku? Atur **Skenario** ke **Covariate drift**, atur hari ke 40, dan lihat log. Monitor input berbunyi pada hari ke-26 dengan 2,50 dan monitor accuracy tidak pernah berbunyi. Atur slider **Hari** ke 26 lalu tekan **Terus pantau**: 38,4 dengan accuracy 89,0%, sedangkan rollback berbiaya 53,2. Kemudian atur **Tingkat keparahan** ke 0,20: monitor input masih berbunyi pada hari ke-26, kini dengan 0,41. Naikkan **Ambang alert PSI** ke 1: alert input menghilang, padahal pergeserannya masih ada.
5. **Yang lambat.** Prediksi: apakah ada monitor input yang berbunyi pada **Concept shift**? Atur **Skenario** ke **Concept shift**. Log tidak menampilkan alert input maupun skor (tidak ada PSI input di atas 0,16 dan tidak ada PSI skor di atas 0,19 sepanjang run) dan hanya monitor accuracy yang berbunyi, pada hari ke-34 (72,2%). Atur slider **Hari** ke 34 lalu tekan **Latih ulang dengan data berlabel terbaru** (63,0% sesudahnya, biaya 109,9), lalu lakukan hal yang sama pada hari ke-40 (77,6%, biaya 57,0). Berikutnya atur **Skenario** ke **Label terlambat dengan drift**: monitor accuracy pindah ke hari ke-47. Mengapa?
6. **Threshold dan stream baru.** Prediksi: pada stream **Bersih**, berapa hari monitor input berstatus alert bila **Ambang alert PSI** 0,05? Atur **Skenario** ke **Bersih (tidak ada kejadian)** dan **Ambang alert PSI** ke 0,05, lalu atur slider **Hari** ke 60 dan baca **Hari alert**: 48 untuk monitor input dan 32 untuk monitor skor. Atur **Jendela input (hari)** ke 7: 0 dan 6. Lalu tekan **Stream baru** tiga kali dengan window tetap 1 dan baca lagi hari alert input: 44, 44, dan 46. Terakhir tekan **Reset**, atur hari ke 60, dan tekan **Stream baru** tiga kali. Pada run skew bawaan alert input jatuh pada hari ke-26 setiap kali dan alert accuracy pada hari ke-37, 38, dan 37.

Catatan: lab ini tidak memiliki pengalih data nyata, sehingga streamnya dibuat. Padanan nyatanya adalah slip satuan pada penguin di "Serving, versioning, dan skew" (97,7% turun ke 64,0%). Stream baru pada eksperimen 6 menjadi pemeriksaan transfernya: jika urutan alert bertahan pada stream baru, itulah mekanismenya dan bukan seed yang kebetulan beruntung.
