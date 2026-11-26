---
slug: reliability-lab
title: Lab reliability
---
::: intro
- Uji stres sebuah model pada baris test yang dirusak, lalu baca hasilnya untuk tiap kelompok, bukan hanya secara keseluruhan.
- Jelaskan mengapa selisih fairness yang mengecil setelah stres dapat berarti semua kelompok menjadi lebih buruk, dan apa yang berubah ketika tiap kelompok diberi threshold sendiri.
- Tentukan rentang tinjauan manusia, periksa ketahanannya di bawah stres, lalu tulis catatan privasi dan model card dari angka yang diukur lab.

Sebelum mulai: baca "Robustness, fairness, dan privacy" dan "Human review dan dokumentasi model". Pelajaran pertama memberimu uji stres, selisih antar kelompok, dan k-anonymity. Pelajaran kedua memberimu rentang tinjauan dan model card.
:::

## Pertanyaan lab ini
*Apa yang harus bisa dilewati sebuah model sebelum kamu membiarkannya menangani kasus nyata?*

Dua pelajaran terakhir memberimu sebuah daftar periksa: merusak input, membandingkan kelompok, mengirim kasus yang meragukan ke seseorang, simpan lebih sedikit data pribadi, dan catat semuanya. Pada lab **Uji stres model pada tiap kelompok**, kamu menjalankan daftar itu pada satu model, dari angka pertama sampai model card yang selesai.

Beberapa nama di lab berbeda dari pelajarannya. **Rentang tinjauan manusia** adalah abstain band, dan **Otomatis** adalah coverage. **Selisih equal opportunity (recall)** adalah selisih true-positive rate. *Selection rate* adalah porsi kasus yang ditandai sebagai positif, dan **Selisih demographic parity (selection rate)** adalah perbedaan terbesar porsi itu antar kelompok.

Modelnya adalah regresi logistik yang dilatih pada 600 pelamar buatan. Model ini menilai 900 pelamar di test set yang terbagi dalam tiga kelompok: A (separuh baris), B (30%), dan C (20%). Kasus positif adalah, misalnya, pinjaman yang akan dilunasi. Model tidak pernah melihat kolom kelompok, tetapi skor kode pos bergerak bersama kelompok, sehingga kelompok tetap dapat meninggalkan jejak.

> Gagasan kunci: skor test adalah satu angka tentang kasus rata-rata. Lab ini mengajukan pertanyaan yang sama empat kali: apa yang terjadi pada tiap kelompok, di bawah stres, dengan threshold yang berbeda, dan dengan seseorang dalam prosesnya?

## Baris bersih dulu
*Apakah kelompok-kelompok sudah berbeda sebelum kamu memberi stres?*

Atur **Kekuatan stres** ke 0, maka lab menampilkan baris test yang bersih. Inilah angka-angka yang perlu kamu ingat.

| Kelompok | Baris | Accuracy | Recall | False-positive rate |
| --- | --- | --- | --- | --- |
| A | 450 | 92,4% | 97,2% | 13,8% |
| B | 270 | 88,1% | 87,3% | 11,3% |
| C | 180 | 73,9% | 58,3% | 20,5% |

Accuracy keseluruhan adalah 87%. Tabel **Selisih fairness sebelum dan sesudah stres** mengurangkan nilai terkecil dari nilai terbesar. Selisih recall adalah 97,2 - 58,3 = 38,9 poin. Selisih selection rate adalah 30,3 poin, dan selisih false-positive rate adalah 20,5 - 11,3 = 9,2 poin.

Kelompok C menanggung dua kerugian sekaligus. Model melewatkan 42% kasus positifnya dan juga menandai 20,5% kasus negatifnya. Kurva **Kalibrasi menurut kelompok** miliknya paling jauh dari garis putus-putus, dengan calibration error (rata-rata selisih antara probabilitas prediksi dan porsi yang sebenarnya positif) sebesar 17,0%, dibandingkan 7,2% untuk A dan 6,1% untuk B.

> Awas: "model tidak melihat kelompok, maka model memperlakukan semua kelompok sama" adalah miskonsepsi yang diuji lebih dulu oleh kotak Kuis Cepat. Membuang sebuah kolom tidak membuang jejaknya.

## Satu stres, tiga kelompok
*Apakah kerusakan pada baris test merugikan setiap kelompok dengan sama?*

Menu **Jenis stres** merusak baris test dan membiarkan model apa adanya. **Missing value** mengosongkan sebagian sel, dan model mengisi sel kosong dengan rata-rata data training. **Noise** menambahkan noise acak. **Outlier** mengganti sel dengan nilai yang berjarak 8 simpangan baku. **Perubahan satuan** mengalikan kolom pertama (skill, atau panjang paruh pada penguin), seolah satuannya berubah. **Distribution shift** menggeser semua nilai, seolah populasinya bergeser. **Kekuatan stres** berjalan dari 0 sampai 1: pada 1 artinya 100% sel kosong, noise sebesar 2 simpangan baku, 30% sel menjadi outlier, faktor 100, atau pergeseran sebesar 2 simpangan baku. Kerusakan yang sama dihasilkan setiap kali (seed-nya tetap), sehingga percobaan dapat diulang.

Lab terbuka pada 40% sel kosong. Accuracy keseluruhan turun dari 87% menjadi 79%, tetapi kelompok-kelompok berpisah jalan: A turun dari 92,4% menjadi 79,8%, B dari 88,1% menjadi 81,1%, dan C naik dari 73,9% menjadi 75,0%. Status line menyebut yang paling dirugikan: Kelompok A paling banyak kehilangan, 12,7 poin.

[[figure:reliability-lab/stress-by-group|Accuracy tiga kelompok pada baris bersih (garis tepi) dan setelah 40% sel kosong (penuh). Kelompok C, yang terlemah pada baris bersih, tidak kehilangan apa pun.]]

Kelompok yang tidak kehilangan apa pun bukan bukti bahwa modelnya baik. Itu hanya memberitahumu bahwa stres ini tidak mengenainya.

## Selisih yang mengecil belum berarti selisih yang teratasi
*Ketika selisih mengecil, apakah modelnya menjadi lebih adil?*

Lihat tabelnya ketika stres kuat. Dengan 40% sel kosong, selisih recall turun dari 38,9 menjadi 32,4 poin. Dengan **Distribution shift** pada 0,4 (0,8 simpangan baku), selisihnya turun dari 38,9 menjadi 20,8. Kelihatannya kabar baik.

Baca baris-baris lainnya. Di bawah pergeseran itu, recall A naik dari 97,2% menjadi 100% dan recall C dari 58,3% menjadi 79,2%, sehingga selisih recall mengecil karena sekarang semua orang lebih sering ditandai. A sudah mendekati batas atas 100%, maka C yang menyusul. Selisih false-positive rate melebar dari 9,2 menjadi 23,6 poin, dan accuracy turun dari 87% menjadi 71%.

Geser **Missing value** ke 1. Setiap sel kosong, setiap skor sama, dan model tidak menandai siapa pun. Recall dan false-positive rate adalah 0% di ketiga kelompok, sehingga setiap selisih tepat 0,0, dengan accuracy 54%. Accuracy tiap kelompok kemudian hanyalah porsi kasus negatifnya.

[[figure:reliability-lab/gap-trap|Accuracy dan selisih recall pada baris bersih dan di bawah tiga stres. Pada ketiganya selisihnya lebih kecil daripada pada baris bersih dan modelnya lebih buruk.]]

> Gagasan kunci: selisih mengukur perbedaan antar kelompok, bukan seberapa baik salah satunya. Selalu baca selisih berdampingan dengan accuracy.

## Satu threshold atau satu per kelompok
*Dapatkah tiap kelompok diberi threshold sendiri, dan apakah hasilnya bertahan?*

Centang **Threshold berbeda untuk tiap kelompok**, maka **Samakan antar kelompok** muncul. Dengan **Recall (equal opportunity)**, lab menyetel satu threshold per kelompok pada sampel validasi yang terpisah agar recall mereka sama. Atur dulu **Kekuatan stres** ke 0. Baris detailnya sekarang terbaca A 0,73, B 0,43, C 0,08, dan selisih recall turun dari 38,9 menjadi 8,1 poin.

Angkanya bukan 0 karena threshold disetel pada baris yang berbeda dari baris test. Ada dua harga yang harus dibayar. Accuracy keseluruhan turun dari 87% menjadi 84%, dan selisih false-positive rate melebar dari 9,2 menjadi 35,8 poin, karena threshold C yang rendah, 0,08, menandai banyak kasus negatifnya.

Sekarang kembalikan kekuatan ke 0,4. Threshold tetap seperti hasil setelan, sehingga selisih recall naik dari 8,1 menjadi 28,8 poin: perubahan sebesar +20,7. Perbaikan yang dibuat pada data bersih tidak bertahan terhadap stres. Inilah gagasan "Fairness under shift" dari pelajaran sebelumnya, kali ini pada threshold, bukan base rate.

[[figure:reliability-lab/per-group-gap|Selisih recall pada baris bersih (garis tepi) dan di bawah 40% sel kosong (penuh), dengan satu threshold dan dengan satu threshold per kelompok.]]

::: deeper Mengapa threshold disetel pada baris lain
Seandainya lab menyetel threshold pada baris test, ia akan menilai pekerjaannya sendiri: selisihnya tampak lebih baik daripada yang sebenarnya pada kasus baru. Pada data buatan, lab menyetel pada sampel validasi yang terpisah, dan pada penguin pada baris training. Threshold per kelompok juga memerlukan kelompok pada saat keputusan, dan apakah itu diperbolehkan adalah pertanyaan kebijakan, seperti yang dikatakan pelajaran sebelumnya.
:::

## Di mana seseorang memutuskan
*Berapa biaya sebuah rentang tinjauan, dan apakah ia masih berfungsi di bawah stres?*

Dua slider **Rentang tinjauan** mengatur **Rentang tinjauan manusia**: skor di antara keduanya diserahkan ke seseorang, skor di bawah batas bawah adalah "tidak" dari mesin, dan skor di atas batas atas adalah "ya" dari mesin. Histogram memakai skor di bawah stres, dan rentang ini tidak bergantung pada **Threshold**.

Di sampingnya ada lima angka. Dengan rentang awal (0,35 sampai 0,65) dan kekuatan 0, rentang itu menangkap 11% kasus (96). **Otomatis** adalah 89% dan **Akurasi pada bagian otomatis** adalah 91%. Pada 40% sel kosong, rentang itu menangkap 26% (236 kasus), bagian otomatisnya 74% dari kasus dan 87% akurat, dan **Akurasi tanpa tinjauan (batas 0,5)** adalah 79%.

> Contoh hitungan: ambil asumsi pelajaran sebelumnya, 3 menit per tinjauan. Baris bersih: 96 x 3 = 288 menit, sekitar 4,8 jam. Di bawah stres 40%: 236 x 3 = 708 menit, sekitar 11,8 jam. Rentang yang sama membutuhkan peninjau dua setengah kali lebih banyak.

[[figure:reliability-lab/review-band|Skor di bawah 40% sel kosong, dibagi menurut siapa yang memutuskan. Rentang tinjauan menampung bagian tengah histogram.]]

Pada 40% sel kosong, **Akurasi dengan peninjau** (91%) mengasumsikan bahwa orang itu selalu benar, maka angka ini adalah batas atas. Automation bias dari pelajaran sebelumnya akan menariknya turun.

## Privasi dan model card
*Bagaimana kamu mencatat apa yang sudah kamu ukur?*

Kartu **Privasi: k-anonymity dan count ber-noise** bekerja pada direktori buatan berisi 900 orang. Dengan **Usia**, **Kode pos**, dan **Jenis kelamin** sebagai quasi-identifier, semua kolom tepat, 900 orang itu membentuk 848 kelompok dan yang terkecil berisi 1 orang: seluruh 900 berada di kelompok yang lebih kecil dari k = 5. Atur **Lebar rentang usia (tahun)** ke 10 dan **Digit kode pos yang dipertahankan** ke 3, maka ada 14 kelompok, yang terkecil berisi 15 orang, sehingga k = 5 terpenuhi. Centang **Jabatan** dan kelompok terkecil kembali 1 orang, dengan 27 orang (3%) di bawah k.

Count yang ditandai pada kelompok C adalah 55. Dengan **Anggaran privasi ε (epsilon)** pada 0,5, galat tipikalnya adalah 1 / 0,5 = 2,0 (4% dari 55). Dengan 0,05 galatnya 1 / 0,05 = 20,0 (36%). ε yang lebih kecil berarti lebih banyak noise dan lebih banyak privasi.

Terakhir, kartu **Model card**. Setiap kolom diawali dengan apa yang diukur lab, misalnya **Di mana peninjauan manusia diperlukan** menyebut rentang yang kamu pilih. Ubah dengan kata-katamu sendiri, lalu **Salin model card** membawanya keluar.

## Penguin dan sampel baru
*Apakah gagasannya bertahan pada data nyata dan pada pembagian yang baru?*

Atur **Data** ke **Penguin (data nyata)**. Tugasnya adalah menentukan apakah seekor penguin jantan, dari panjang paruh, panjang sirip, dan massa tubuh, dan kelompoknya adalah spesies. Lab memakai 333 dari 344 baris (11 baris punya missing value) dan membaginya: 168 untuk melatih, 165 untuk menguji. Modelnya lemah: accuracy 70%, dengan recall 36% untuk Adelie, 76% untuk Chinstrap, dan 97% untuk Gentoo, sehingga selisih recall-nya 60,6 poin.

Di bawah 40% sel kosong, accuracy turun dari 70% menjadi 60%. Gentoo paling banyak kehilangan (30,5 poin) dan Adelie justru naik 5,6. Tekan **Sampel baru** sekali: pembagian yang baru memberi accuracy 70% secara keseluruhan, selisih recall 41,2, dan kehilangan yang lebih kecil, 18,6 poin, untuk Gentoo di bawah stres yang sama. Kelompok terlemah pada baris bersih berganti (Chinstrap hanya punya 34 baris test), tetapi kedua kalinya Gentoo yang paling terpukul.

## Perubahan satuan pada data nyata
*Apa yang terjadi ketika sebuah kolom berganti satuan?*

Atur **Jenis stres** ke **Perubahan satuan** pada 0,4. Panjang paruh dikalikan 6, model menandai setiap penguin, setiap selisih adalah 0,0, dan accuracy 50%.

> Awas: penguin bukan manusia. Lab memakainya untuk memperlihatkan mekanismenya, dan model card pun mengatakan demikian.

::: remember
- Model yang tidak pernah melihat kelompok tetap dapat salah dengan cara berbeda untuk tiap kelompok, dan stres mengenai kelompok-kelompok itu secara tidak merata.
- Baca selisih fairness berdampingan dengan accuracy: selisih dapat mengecil karena semua kelompok menjadi lebih buruk, dan threshold yang disetel pada data bersih dapat berhenti bekerja di bawah stres.
- Ukuran sebuah rentang tinjauan ditentukan oleh jumlah kasus yang dikirimkannya, dan biayanya naik di bawah stres. Privasi dan model card mencatat angka yang kamu ukur.
:::

@@lab

## Lab: uji stres model pada tiap kelompok
Kamu mulai dengan 900 pelamar test buatan dalam kelompok A, B, dan C, dengan 40% sel dikosongkan. Chart membandingkan tiap kelompok sebelum dan sesudah stres. Di sampingnya ada selisih fairness, kalibrasi, rentang tinjauan manusia, panel privasi, dan model card. Tekan **Reset** sebelum eksperimen agar angkamu sama.

### Kontrol
- **Data** berganti antara **Data buatan** dan **Penguin (data nyata)**. **Tentang data ini** membuka catatan yang lebih panjang. Data nyata memprediksi apakah seekor penguin jantan, dengan spesies sebagai kelompok.
- **Jenis stres**: **Noise**, **Missing value**, **Outlier**, **Perubahan satuan**, atau **Distribution shift**. Sebuah kalimat di bawah **Kekuatan stres** menjelaskan arti jumlah yang sedang dipakai.
- **Kekuatan stres** (0 sampai 1) mengatur seberapa besar kerusakan. Angka di sampingnya, misalnya "40% kosong", berubah menurut jenis stres.
- **Threshold** (0,05 sampai 0,95) adalah batas untuk "positif" ketika semua kelompok memakai satu threshold.
- **Threshold berbeda untuk tiap kelompok** menyetel satu threshold per kelompok. Setelah itu **Samakan antar kelompok** muncul: **Recall (equal opportunity)** atau **Selection rate (demographic parity)**.
- **Rentang tinjauan: threshold bawah** dan **Rentang tinjauan: threshold atas** mengatur **Rentang tinjauan manusia**. Jika salah satu digeser melewati yang lain, yang lain ikut tergeser.
- **Sampel baru** membuat data set buatan yang baru, atau pembagian penguin yang baru.
- **Buka panel privasi** berisi tombol quasi-identifier **Usia**, **Kode pos**, **Jenis kelamin**, dan **Jabatan**, serta **Lebar rentang usia (tahun)**, **Digit kode pos yang dipertahankan**, **k: kelompok terkecil yang diizinkan**, **Anggaran privasi ε (epsilon)**, dan **Tarik noise baru**.
- **Buka kolom model card** berisi kolom **Tujuan penggunaan**, **Data**, **Metrik per kelompok**, **Batasan yang diketahui**, dan **Di mana peninjauan manusia diperlukan**, ditambah **Salin model card** dan **Isi ulang dari lab**. Kolom yang sudah kamu ubah tidak lagi ditimpa sampai kamu mengisi ulang. Pada layar penuh, kedua panel itu terbuka sebagai dialog dan **Tutup** menutupnya.
- **Layar penuh** memperbesar lab, dan **Reset** mengembalikan ke data buatan, sampel pertama, dan setiap nilai awal.
- **Kuis Cepat** berisi satu kotak: "Model tidak pernah melihat kolom kelompok. Apakah tingkat galatnya tetap berbeda antar kelompok?" Pilih jawaban, lalu **Periksa jawaban**.

### Membaca layar
- Status line menyebut bagaimana accuracy berubah dan kelompok mana yang paling banyak kehilangan, lalu bagaimana selisih recall bergerak. Baris kedua menyebut threshold yang dipakai.
- Chart punya tiga blok, **Akurasi**, **Recall (true-positive rate)**, dan **False-positive rate (rendah = baik)**, dengan satu baris per kelompok. Batang bergaris tepi adalah sebelum stres, batang penuh adalah sesudahnya.
- **Selisih fairness sebelum dan sesudah stres** punya kolom **Selisih**, **Sebelum (poin)**, **Sesudah (poin)**, dan **Perubahan (poin)**, dengan baris **Selisih equal opportunity (recall)**, **Selisih demographic parity (selection rate)**, dan **Selisih false-positive rate**. ▲ menandai selisih yang melebar, ▼ yang menyempit.
- **Kalibrasi menurut kelompok** menggambar satu kurva per kelompok di bawah stres, dengan calibration error-nya (misalnya "Kelompok C: 14,9%"). Garis putus-putus adalah kalibrasi sempurna.
- **Rentang tinjauan manusia** menampilkan histogram skor di bawah stres, berlabel **Mesin: tidak**, **Orang memutuskan**, dan **Mesin: ya**. Di sampingnya: **Otomatis**, **Akurasi pada bagian otomatis**, **Beban peninjau**, **Akurasi dengan peninjau**, dan **Akurasi tanpa tinjauan (batas 0,5)**.
- **Privasi: k-anonymity dan count ber-noise** punya **Laporan k-anonymity** dan tabel **Count yang dirilis dengan ε = 0,50** (angkanya mengikuti slider) dengan **Sebenarnya**, **Dirilis (dibulatkan)**, dan **Galat tipikal**. Kartu **Model card** menghitung berapa kolom yang sudah terisi.

### Eksperimen
Semua angka berlaku untuk data buatan dan sampel pertama.

1. **Baris bersih.** Prediksikan: pada kotak Kuis Cepat, pilih apakah tingkat galat berbeda antar kelompok pada data bersih. Lalu atur **Kekuatan stres** ke 0 dan baca batang serta tabelnya. Accuracy berkisar dari 74% (C) sampai 92% (A), recall dari 58% sampai 97%, dan selisih recall adalah 38,9 poin. Periksa jawabanmu. Model tidak pernah melihat kelompok, jadi mengapa kelompok-kelompok itu berbeda?
2. **Tiga stres.** Prediksikan: akankah kekuatan yang sama dari tiap stres merugikan ketiga kelompok dengan sama? Atur **Kekuatan stres** ke 0,4 dan coba **Missing value** (A kehilangan 12,7 poin), **Perubahan satuan** (B kehilangan 8,9), dan **Distribution shift** (A kehilangan 20,2). Di bawah pergeseran, selisih recall turun dari 38,9 menjadi 20,8 poin sementara selisih false-positive rate melebar dari 9,2 menjadi 23,6. Lalu atur **Missing value** ke kekuatan 1: setiap selisih adalah 0,0 dan accuracy 54%. Mengapa selisih nol bukan kabar baik di sini?
3. **Threshold per kelompok.** Prediksikan: dapatkah threshold per kelompok menutup selisih recall, dan akankah ia tetap tertutup di bawah stres? Atur **Kekuatan stres** ke 0, centang **Threshold berbeda untuk tiap kelompok**, dan baca baris detailnya (A 0,73, B 0,43, C 0,08). Selisih recall turun menjadi 8,1 poin dan selisih false-positive rate melebar menjadi 35,8. Lalu atur kekuatan ke 0,4: selisih recall adalah 28,8 poin, perubahan sebesar +20,7. Ganti **Samakan antar kelompok** ke **Selection rate (demographic parity)** dan bandingkan: selisih selection rate menjadi 25,5 poin dan selisih recall 36,6 (pada baris bersih 9,7 dan 19,4), sehingga menutup satu selisih tidak menutup selisih yang lain.
4. **Di mana seseorang memutuskan.** Prediksikan: dengan rentang awal, berapa porsi kasus yang akan diputuskan seseorang di bawah stres 40%, dan pada baris bersih? Baca **Beban peninjau**: 26% (236 kasus) pada 0,4 dan 11% (96 kasus) pada 0. Atur **Kekuatan stres** kembali ke 0,4, lalu lebarkan rentang menjadi 0,20 dan 0,80 (48%, 433 kasus, akurasi otomatis 93%), lalu persempit menjadi 0,45 dan 0,55 (7%, akurasi otomatis 81%). Lalu buka kolom model card dan baca **Di mana peninjauan manusia diperlukan**: kolom itu menyebut rentang yang kamu pilih. Siapa yang sanggup meninjau sebanyak itu?
5. **Privasi.** Prediksikan: berapa orang yang berada di kelompok yang lebih kecil dari k = 5 ketika usia, kode pos, dan jenis kelamin tepat? Hapus dulu centang **Threshold berbeda untuk tiap kelompok** (55 kasus yang ditandai mengasumsikan satu threshold 0,5). Buka panel privasi. Semua 900 orang, dan kelompok terkecil adalah 1. Atur **Lebar rentang usia (tahun)** ke 10 dan **Digit kode pos yang dipertahankan** ke 3: kelompok terkecil adalah 15. Centang **Jabatan**: kembali 1 dan 27 orang (3%) berada di bawah k. Atur **Anggaran privasi ε (epsilon)** ke 0,05 dan baca **Galat tipikal**: ±20,0, yaitu 36% dari 55 kasus yang ditandai pada kelompok C.
6. **Penguin dan sampel baru.** Prediksikan: spesies mana yang paling banyak kehilangan accuracy di bawah 40% sel kosong, dan akankah pembagian baru mengubahnya? Tekan **Reset**, atur **Data** ke **Penguin (data nyata)**, dan baca status line serta kolom **Sebelum (poin)**: accuracy 70% dan selisih recall 60,6 poin. Gentoo paling banyak kehilangan, 30,5 poin. Tekan **Sampel baru** sekali: accuracy 70%, selisih recall 41,2, Gentoo masih paling banyak kehilangan (18,6). Lalu atur **Jenis stres** ke **Perubahan satuan**: accuracy turun menjadi 50% dan setiap selisih adalah 0,0. Apakah gagasannya bertahan pada pembagian yang baru? Apakah model card masih mengatakan apa yang ingin kamu sampaikan kepada pengguna?
