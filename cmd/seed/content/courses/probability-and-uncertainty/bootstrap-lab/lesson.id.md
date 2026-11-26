---
slug: bootstrap-lab
title: Lab bootstrap
---
::: intro
- Perkirakan seberapa jauh accuracy hasil pengukuran bergeser dari sampel ke sampel, lalu baca sebaran itu di lab.
- Buat interval bootstrap dari satu sampel dan bandingkan lebarnya dengan sebaran banyak sampel.
- Jalankan 200 eksperimen untuk melihat seberapa sering interval 95% mencakup true accuracy, lalu ulangi gagasan itu pada data penguin yang nyata.

Sebelum mulai: baca "Variabilitas sampling dan bootstrap".
:::

## Apa yang ditanyakan lab ini
*Apa yang dapat kamu lakukan di sini, yang tidak dapat dilakukan di proyek nyata mana pun?*

Pelajaran sebelumnya menyebut bahwa skor pada satu test set hanyalah satu undian, dan bahwa bootstrap membuat interval dari undian tunggal itu. Lab ini memungkinkan kamu menguji kedua klaim tersebut, karena lab ini punya sesuatu yang tidak pernah dimiliki proyek nyata: jawaban yang sebenarnya.

Lab ini menyimpan populasi 5.000 kasus dari sebuah model yang benar tepat pada 4.250 kasus, sehingga **true accuracy**-nya 85,0%. Dari populasi ini kamu dapat mengambil sampel berisi n kasus, dengan pengembalian, sesering yang kamu inginkan. Lab dimulai dengan 200 sampel berukuran n = 100, sehingga setiap sampel adalah test set berisi 100 kasus.

Layar pertama menampilkan angka-angka ini:

| Apa | Nilai |
|---|---|
| 95% tengah dari 200 accuracy sampel | 78,0% sampai 92,0% |
| Sebaran accuracy itu (simpangan baku) | 3,7 poin |
| Standard error menurut rumus buku | 3,6 poin |
| Sampel terakhir | 83,0% benar (83 dari 100) |
| Interval bootstrap 95% dari sampel itu | 74,5% sampai 90,0% |

[[figure:bootstrap-lab/default-screen|Layar pertama lab. Batang: 200 accuracy sampel. Arsiran: 95% tengahnya. Garis putus-putus: true accuracy. Batang paling atas: interval bootstrap dari sampel terakhir, dengan berlian di accuracy-nya.]]

Bagian-bagian berikut menjelaskan tiap baris, lalu mengujinya. Setiap eksperimen di panduan lab dimulai dengan sebuah prediksi.

## Tumpukan accuracy sampel
*Seberapa jauh skor satu model bergeser dari sampel ke sampel?*

Setiap batang pada histogram adalah porsi dari 200 sampel yang mendapat accuracy tertentu. Tumpukan ini berpusat di garis putus-putus, yaitu true accuracy 85,0%. Sampel terendah mendapat 71,0% dan tertinggi 94,0%. Skor yang paling sering muncul, tepat 85,0%, hadir pada 25 dari 200 sampel, sehingga batang tertinggi setinggi 12,5%. Setiap sampel adalah test set yang wajar, tetapi sebagian besar meleset beberapa poin.

Arsiran adalah **95% tengah** dari tumpukan: buang 2,5% sampel terendah dan 2,5% tertinggi, dan yang tersisa membentang dari 78,0% sampai 92,0%, selebar 14,0 poin.

Tabel memberi dua angka untuk dibandingkan. Sebaran tumpukan, sebagai simpangan baku, adalah 3,7 poin. Standard error menurut rumus buku adalah 3,6.

> Contoh hitungan: SE = sqrt(0,85 × 0,15 / 100) = sqrt(0,001275) = 0,0357, atau 3,6 poin. 95% tengah terletak 1,96 standard error di kiri dan kanan nilai sebenarnya: 1,96 × 3,57 = 7,0, maka 85,0 ± 7,0 memberi 78,0 sampai 92,0.

Rumus dan tumpukan itu sesuai. Bedanya, dalam pekerjaan nyata kamu tidak dapat mengambil tumpukannya.

## Satu sampel dan bootstrap-nya
*Apa yang dapat dikatakan satu sampel tentang naik-turunnya skor?*

Proyek nyata hanya punya satu test set. Lab menyimpan **sampel terakhir** yang kamu ambil, di sini 83 benar dari 100, lalu mem-bootstrap-nya: lab mengambil ulang 100 kasus itu dengan pengembalian sebanyak **B** = 500 kali, menghitung accuracy tiap resample, dan membuang 2,5% terendah serta 2,5% tertinggi. Hasilnya adalah batang di sepanjang bagian atas: 74,5% sampai 90,0%, selebar 15,5 poin. Garis tepinya adalah histogram dari 500 accuracy resample.

[[figure:bootstrap-lab/two-routes|Dua jalan menuju sebuah lebar. Dengan seluruh populasi kamu dapat mengambil tumpukannya; dengan satu sampel kamu hanya dapat me-resample-nya. Keduanya memberi sekitar 14 sampai 16 poin.]]

Perhatikan apa yang bergeser. Tumpukan berpusat pada nilai sebenarnya, 85,0%. Interval bootstrap berpusat pada sampelnya: berliannya ada di 83,0%, bukan 85,0%. Ambil sampel lain dan intervalnya ikut bergeser, sedangkan lebarnya tetap dekat dengan lebar tumpukan. Tekan **Ambil satu sampel** tiga kali dari awal, dan sampel terakhir mendapat 88,0%, 87,0%, dan 84,0%, dengan interval 82,0% sampai 94,0%, 80,0% sampai 93,0%, dan 77,0% sampai 91,0%: lebarnya 12,0, 13,0, dan 14,0 poin. Setiap penekanan menambahkan sampel baru ke tumpukan (tumpukan bertambah dari 200 menjadi 203 sampel) dan menjadikannya sampel terakhir, yaitu sampel yang diolah bootstrap.

Mengubah B hampir tidak berpengaruh. Untuk sampel yang sama, B = 100 memberi 75,0% sampai 89,0% dan B = 1.000 memberi 75,0% sampai 90,0%. Resample yang lebih banyak membuat estimasinya lebih halus, tetapi tidak menambah kasus baru.

## Apakah interval itu menepati janjinya?
*Jika kamu membuat interval dari setiap sampel, seberapa sering interval itu mencakup nilai sebenarnya?*

Pelajaran sebelumnya mengingatkan bahwa angka 95% itu milik metodenya, bukan milik satu interval. Di sini kamu dapat mengukurnya, karena nilai sebenarnya diketahui. **Jalankan 200 eksperimen** mengambil 200 sampel baru, mem-bootstrap tiap sampel dengan B resample, lalu menghitung interval yang mencakup 85,0%.

Dari layar pertama, lab melaporkan 97,5%: 195 dari 200 interval mencakup true accuracy dan 5 meleset. Gambar cakupan menampilkan 60 yang pertama, dan yang meleset digambar sebagai garis tebal dengan tanda silang.

[[figure:bootstrap-lab/coverage-lines|60 dari 200 eksperimen yang pertama. Dua interval tidak menyentuh garis putus-putus true accuracy. Dari seluruh 200: 195 mencakupnya, yaitu 97,5%.]]

Tekan tombolnya sekali lagi dan porsinya berubah: 95,5%, lalu 96,5%. Tidak ada yang tepat 95%, dan memang tidak perlu. Setiap putaran hanya 200 eksperimen, sehingga porsinya naik-turun sekitar 3 poin; lab menyebut 97,5% sudah mendekati janjinya.

::: deeper Mengapa 200 eksperimen tidak dapat menunjukkan tepat 95%
Porsi interval yang mencakup nilai sebenarnya adalah proporsi hasil pengukuran, sehingga ia juga punya standard error: SE = sqrt(0,95 × 0,05 / 200) = 0,0154, dan 1,96 × 0,0154 = 0,030, sekitar 3 poin. Hasil antara 92% dan 98% masih sesuai dengan metode 95%.
:::

## Kasus empat kali lebih banyak
*Apa yang membuat interval lebih sempit?*

Di lab, ubah **Ukuran sampel n** dan amati tumpukan serta interval bootstrap-nya. Tumpukan mengikuti aturan dari pelajaran sebelumnya: standard error menurut rumus buku turun dari 3,6 poin pada n = 100 menjadi 1,8 pada n = 400 dan 1,1 pada n = 1.000, sementara pada n = 20 nilainya 8,0.

[[figure:bootstrap-lab/quadruple|Lebar 95% tengah dari accuracy sampel, rata-rata, untuk lima ukuran sampel. Setiap kenaikan empat kali lipat jumlah kasus membuat lebarnya separuh.]]

> Contoh hitungan: lebar 95% tengah adalah 2 × 1,96 × SE. Pada n = 100 hasilnya 2 × 1,96 × 3,57 = 14,0 poin. Pada n = 400 hasilnya 2 × 1,96 × 1,79 = 7,0 poin. Kasus empat kali lebih banyak membuat lebarnya separuh, karena n berada di bawah akar kuadrat.

Interval bootstrap mengikuti aturan yang sama, karena dibuat dari kasus-kasus yang sama: dari layar pertama, beralih ke n = 400 menghasilkan interval selebar sekitar 7 poin, separuh dari 15,5 yang kamu lihat pada n = 100. Setiap kasus tambahan harganya sama, tetapi lebar yang dibelinya makin sedikit. Itulah sebabnya Kuis Cepat di lab menanyakan soal menaikkan n empat kali: tebaklah lebih dahulu sebelum melihat.

## Penguin yang nyata
*Apakah gagasan yang sama berlaku ketika modelnya classifier sungguhan?*

Atur **Data** ke **Penguin (data nyata)**. Populasinya sekarang 342 dari 344 penguin di tabel (dua baris tidak punya pengukuran lengkap dan dibuang). Sebuah classifier 5-nearest-neighbors yang tetap, yang memprediksi spesies dari panjang sirip dan massa tubuh, mengklasifikasikan tiap penguin dari semua penguin lainnya, dan sebuah kasus dianggap benar jika spesiesnya diprediksi dengan tepat. Classifier ini benar pada 263 dari 342 penguin, sehingga true accuracy-nya 76,9%.

Dengan n = 100, standard error menurut rumus buku adalah sqrt(0,769 × 0,231 / 100) = 0,0421, atau 4,2 poin, lebih besar daripada 3,6 pada data buatan. Penyebabnya adalah hasil kali p × (1 - p): nilainya 0,178 di sini dan 0,128 pada 85%, dan nilai itu paling besar ketika accuracy mendekati 50%.

Lab menampilkan tumpukan dari 68,0% sampai 85,0%, selebar 17,0 poin. Sampel terakhir mendapat 79,0% dan interval bootstrap-nya 71,0% sampai 87,0%. Menjalankan 200 eksperimen memberi 97,0%.

> Awas: populasi ini adalah 342 penguin itu sendiri, sehingga 76,9% adalah accuracy pada mereka, bukan pada semua penguin di dunia. Penguin yang nyata pun hanyalah sampel.

## Yang tidak ditampilkan lab
*Bagian kehidupan nyata mana yang tidak ada di lab ini?*

Lab ini sengaja dibuat mudah, dan peringatan dari pelajaran sebelumnya tetap berlaku untuk proyekmu sendiri.

- **Kasus yang independen.** Setiap pengambilan bersifat independen. Baris dari orang, tempat, atau hari yang sama tidak independen, dan intervalnya pun menjadi terlalu sempit.
- **Satu sampel yang beruntung.** Interval berpusat pada sampelnya: sampel yang mendapat 88,0% menghasilkan 82,0% sampai 94,0%, bergeser ke atas 85,0%. Dengan satu sampel, kamu tidak pernah tahu berada di sisi mana.
- **Populasi yang tetap.** Populasi di lab tidak pernah berubah. Test set yang tidak mirip dengan kasus yang kelak dihadapi model bukan masalah sampling, dan resampling tidak dapat memperbaikinya.

Pakai lab ini untuk membangun perasaan tentang seberapa lebar interval pada ukuran sampelmu. Setelah itu, laporkan skor, jumlah kasus, dan intervalnya bersama-sama.

::: remember
- Banyak sampel dari populasi yang diketahui membentuk tumpukan: 95% tengahnya sekitar 1,96 standard error di kiri dan kanan nilai sebenarnya, dan kasus empat kali lebih banyak membuat lebarnya separuh.
- Satu sampel yang di-resample B kali memberi interval dengan lebar yang hampir sama, tetapi berpusat pada sampel itu, bukan pada nilai sebenarnya. Resample yang lebih banyak tidak mempersempitnya.
- Dari 200 eksperimen, sekitar 95% interval mencakup true accuracy, dengan selisih sekitar 3 poin. Uji gagasan ini pada data nyata dan undian baru sebelum kamu mempercayainya.
:::

@@lab

## Lab: variabilitas sampling dan bootstrap
Lab dimulai pada data buatan: populasi 5.000 kasus dari sebuah model yang true accuracy-nya tepat 85,0% (4.250 benar). Lab sudah mengambil 200 sampel berisi 100 kasus dan mem-bootstrap sampel terakhir. Semua yang tampil di layar memakai seed tetap, sehingga memuat ulang halaman dan menekan **Reset** menampilkan angka yang sama.

### Kontrol
- **Data** berpindah antara **Data buatan** dan **Penguin (data nyata)**. Berpindah memulai tumpukan baru dan menghapus hasil cakupan.
- **Ukuran sampel n** (20 sampai 1000, langkah 10; mulai dari 100) adalah jumlah kasus di setiap sampel. Mengubahnya memulai tumpukan baru berisi sebanyak **Jumlah sampel berulang** sampel baru dan menghapus hasil cakupan.
- **Jumlah sampel berulang** (10 sampai 1000, langkah 10; mulai dari 200) mengatur berapa sampel yang diambil oleh **Ambil 200 sampel**. Label tombol itu mengikuti slider ini.
- Di bawah keterangan **Ambil sampel**: **Ambil satu sampel** menambahkan satu sampel ke tumpukan. **Ambil 200 sampel** memulai tumpukan baru sebanyak itu. **Hapus sampel** mengosongkan tumpukan, sampel terakhir, dan hasil cakupan.
- **Resample bootstrap B** (100 sampai 1000, langkah 100; mulai dari 500) adalah berapa resample yang diambil bootstrap dari sampel terakhir. Mengubahnya menghapus hasil cakupan.
- **Tampilkan resample bootstrap** (mulai dalam keadaan aktif) menampilkan atau menyembunyikan garis tepi accuracy resample.
- **Jalankan 200 eksperimen** ada di kartu **Apakah interval itu menepati janjinya?**. Setiap eksperimen mengambil sampel baru, mem-bootstrap-nya dengan B resample, lalu memeriksa apakah interval 95%-nya mencakup true accuracy 85,0%. Prosesnya berjalan di latar belakang; tombolnya tetap tampil tetapi tidak berbuat apa-apa sampai proses selesai.
- **Layar penuh** memperbesar lab. **Reset** mengembalikan ke data buatan, n = 100, 200 sampel, B = 500, tombol toggle aktif, dan menghapus Kuis Cepat.
- **Kuis Cepat** adalah tombol di bawah kartu pengaturan (tombol bulat di kanan bawah pada ponsel). Tombol ini bertanya "Kalau ukuran sampel dikalikan empat, apa yang terjadi pada lebar intervalnya?" dengan pilihan **Hampir tidak berubah**, **Menjadi sekitar setengahnya**, dan **Menjadi sekitar seperempatnya**. Pilih jawabanmu lebih dahulu. Hasil pemeriksaannya muncul setelah kamu melihat dua ukuran sampel yang berjarak sekitar empat kali lipat, misalnya 100 dan 400.

### Membaca layar
- Sumbu x histogram adalah **Accuracy sebuah sampel (porsi benar)** dan sumbu y-nya **Porsi per batang (%)**. Legenda menyebut **Accuracy sampel (batang)**, **True accuracy** yang putus-putus, **95% tengah dari sampel (arsiran)**, berlian **Sampel terakhir**, dan **Interval bootstrap (batang) dan resample (garis tepi)**.
- Dua baris di atas plot memberi angkanya: **95% tengah** dengan rentangnya, dan **Interval bootstrap 95%** dengan rentangnya. Di layar sempit keduanya diringkas dengan tanda hubung, seperti "95% tengah: 78,0% – 92,0%".
- Di bawah plot, baris status berbunyi "200 sampel berisi 100 kasus. 95% tengah dari accuracy-nya adalah 78,0% sampai 92,0%; true accuracy-nya 85,0%." Baris rinciannya berbunyi "Sampel terakhir: 83,0% benar (83 dari 100). Interval bootstrap 95% dari 500 resample: 74,5% sampai 90,0%, mencakup true accuracy."
- Dua catatan ada di bawah legenda: cara sebuah tumpukan dimulai, dan populasinya (pada data buatan, "Populasi: 5.000 kasus buatan ... 85,0% (4.250 benar, sisanya salah)"). Jika data penguin tidak dapat dimuat, sebuah baris peringatan di atas plot menyampaikannya dan data buatan yang ditampilkan.
- Di kartu **Apakah interval itu menepati janjinya?**, setiap garis adalah interval bootstrap 95% dari satu eksperimen, 60 yang pertama ditampilkan. Garis yang tidak menyentuh garis putus-putus true accuracy digambar tebal dan diberi tanda silang; legendanya berbunyi **mencakup** dan **meleset (×)**. Di atas gambar itu, meter punya tanda putus-putus di 95%, dan keterangannya berbunyi, misalnya, "97,5% dari 200 interval mencakup true accuracy ..." serta menyebut apakah itu mendekati janjinya.
- Tabel **Angka di balik gambar** punya baris **Ukuran populasi**, **True accuracy**, **Ukuran sampel n**, **Sampel yang diambil**, **95% tengah dari accuracy sampel**, **Sebaran accuracy sampel (simpangan baku, dalam poin)**, **Standard error rumus buku √(p(1 − p)/n), dalam poin**, **Accuracy sampel terakhir**, **Interval bootstrap 95% dari sampel terakhir**, **Lebar interval itu, dalam poin**, dan **Apakah interval itu mencakup true accuracy?**.

### Eksperimen
Angka di bawah berlaku untuk layar awal. Tekan **Reset** sebelum setiap eksperimen dan tekan tombol sesuai urutan yang diberikan: lab mengambil sampel baru pada setiap penekanan, sehingga urutan yang berbeda menampilkan angka yang sedikit berbeda. Slider menggambar ulang di setiap langkah yang kamu lewati, sehingga setelah menggeser slider, harapkan angka yang selisihnya sekitar satu poin dari yang tertulis di sini.

1. **Tumpukan.** Prediksi: dari 200 sampel berisi 100 kasus, kira-kira berapa yang mendapat tepat 85,0%, dan selebar apa 95% tengahnya? Tekan **Reset** lalu baca histogramnya: batang tertinggi, di 85,0%, setinggi 12,5% (25 dari 200 sampel), dan 95% tengahnya 78,0% sampai 92,0%, yaitu 14,0 poin. Bandingkan baris tabel **Sebaran accuracy sampel** (3,7) dan **Standard error rumus buku** (3,6). Lalu tekan **Ambil 200 sampel** dua kali: sebarannya menjadi 3,4 lalu 4,1. Mengapa rumus yang sama memberi sebaran yang berbeda dari satu tumpukan ke tumpukan berikutnya?
2. **Satu sampel.** Prediksi: apakah interval bootstrap dari satu sampel selalu mencakup 85,0%, dan di mana letaknya? Tekan **Reset**, lalu **Ambil satu sampel** tiga kali, dan baca baris rincian setelah setiap penekanan. Sampel terakhir mendapat 88,0%, 87,0%, dan 84,0%, dengan interval 82,0% sampai 94,0%, 80,0% sampai 93,0%, dan 77,0% sampai 91,0%. Semuanya mencakup 85,0%. Di mana letak berliannya dibandingkan garis putus-putus, dan bagaimana lebarnya dibandingkan arsiran? Perhatikan bahwa **Sampel yang diambil** mencapai 203, karena tombol ini menambah ke tumpukan.
3. **Resample B.** Prediksi: apakah B = 1.000 memberi interval yang jauh lebih sempit daripada B = 100? Tekan **Reset**, atur **Resample bootstrap B** ke 100 dan baca **Lebar interval itu, dalam poin** (14,0), lalu 500 (15,5) dan 1000 (15,0). Matikan dan nyalakan **Tampilkan resample bootstrap** untuk melihat garis tepinya muncul dan hilang. Apa yang diubah B, dan apa yang tidak?
4. **Cakupan.** Prediksi: dari 200 eksperimen, berapa interval yang akan mencakup nilai sebenarnya? Tekan **Reset**, lalu **Jalankan 200 eksperimen**. Meter menunjukkan 97,5% (195 dari 200), dan 60 garis pertama berisi dua garis tebal dengan tanda silang. Tekan tombolnya dua kali lagi: 95,5%, lalu 96,5%. Apakah ada putaran yang tepat 95%, dan perlukah itu? Lalu tekan **Reset**, atur **Ukuran sampel n** ke 20, dan jalankan lagi: intervalnya sekitar dua kali selebar pada n = 100, rata-rata 28 poin (masing-masing dari sekitar 15 sampai 40), dan porsinya masih dekat 95%.
5. **n empat kali lipat.** Prediksi: di kotak Kuis Cepat, pilih apa yang terjadi pada lebar ketika n naik dari 100 ke 400. Tekan **Reset**, tekan **Ambil 200 sampel**, lalu atur **Ukuran sampel n** ke sekitar 400. Baris **Standard error rumus buku** turun dari 3,6 ke 1,8, arsiran menyempit menjadi sekitar separuh lebarnya, dan kotak Kuis Cepat memberi hasil pemeriksaannya. Seberapa lebar interval bootstrap dari sampel terakhir sekarang? Harapkan sekitar 7 poin.
6. **Penguin dan undian baru.** Prediksi: dengan n = 100 yang sama, apakah tumpukan akan lebih sempit, sama, atau lebih lebar daripada data buatan? Tekan **Reset**, atur **Data** ke **Penguin (data nyata)** dan baca catatannya: 342 dari 344 penguin, true accuracy 76,9%. 95% tengahnya 68,0% sampai 85,0% (17,0 poin) dan baris standard error menunjukkan 4,2. Tekan **Jalankan 200 eksperimen**: 97,0%. Sekarang uji gagasan ini pada undian baru: tekan **Ambil 200 sampel**. 95% tengahnya menjadi 69,0% sampai 84,0% dan sebarannya 4,1. Lalu atur **Ukuran sampel n** ke sekitar 400 dan lihat tumpukannya menyempit menjadi separuh. Apakah gagasan itu berlaku pada classifier yang tidak kamu rancang untuk mencapai 85%?
