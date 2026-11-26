---
slug: intermediate-capstone-project
title: Proyek capstone tingkat menengah
---
::: intro
- Rumuskan proyek fraud yang peka biaya pada transaksi kartu sintetis, lalu turunkan threshold dari harga setiap kesalahan.
- Pilih split yang meniru cara model akan dipakai, bela pilihan itu terhadap dua split yang lain, dan lakukan tuning serta perbandingan model hanya pada training rows.
- Laporkan skor held-out beserta interval bootstrap, sebutkan apa yang tidak dapat dijawab skor itu, dan nilai proyekmu sendiri dengan sebuah rubrik.

Sebelum mulai: baca "Defending an evaluation", "Reproducible pipelines" dan "ROC and precision-recall". Pelajaran pertama memberimu lima pertanyaan untuk sebuah evaluasi, yang kedua cara menjaga sebuah run tetap dapat diulang, dan yang ketiga AUC serta average precision yang dilaporkan lab.
:::

## Ringkasan tugas
*Apa yang kamu bangun di workbench, dan seperti apa datanya?*

**Workbench capstone Level 2** adalah proyek yang menutup level ini. Sebuah bank ingin menandai transaksi kartu yang curang. Kamu membangun sebuah classifier dan membela setiap langkah evaluasinya.

Datanya sintetis: sebuah program membuatnya, dan tidak ada pelanggan sungguhan di baliknya. Dataset 1 berisi 1.200 transaksi dari 60 pelanggan selama 90 hari, masing-masing 20 transaksi. Tiap transaksi punya amount, jam, risiko merchant, dan sidik jari perangkat, dan 93 dari 1.200 transaksi itu adalah fraud (7,8%). Lab menyediakan 24 dataset seperti ini.

Pelanggan berulang dan waktu berjalan, sehingga hal yang akan baru saat model dipakai menentukan splitnya.

Workbench terdiri dari enam langkah. Setiap langkah terbuka setelah langkah sebelumnya selesai, dan "selesai" diperiksa pada hasil kerjamu: langkah 1 memerlukan biaya yang sudah ditetapkan dan alasan yang benar yang sudah dicentang.

[[figure:intermediate-capstone-project/six-steps|Enam langkah workbench dan hal yang diperiksa lab sebelum membuka langkah berikutnya.]]

> Gagasan kunci: proyek ini adalah rantai pertahanan. Satu mata rantai yang lemah, misalnya split yang bocor, merusak setiap angka sesudahnya.

## Langkah 1: biaya
*Berapa harga sebuah kesalahan, dan apa yang disembunyikan accuracy?*

**Alarm palsu** menandai transaksi yang baik, dan **fraud yang terlewat** membiarkan transaksi yang buruk lolos. Lab mulai dari 5 untuk alarm palsu dan 50 untuk fraud yang terlewat, dalam satu satuan bersama seperti uang atau menit kerja peninjau.

Accuracy menyembunyikan perbedaannya. Pada Dataset 1, model yang tidak pernah menandai benar pada 1.107 dari 1.200 transaksi, yaitu 92,3%, tetapi melewatkan semua 93 fraud: 93 × 50 = 4.650, atau 3,88 per transaksi. Model yang menandai semuanya menghasilkan 1.107 alarm palsu: 1.107 × 5 = 5.535, atau 4,61 per transaksi. Sebuah model harus mengalahkan keduanya.

> Contoh hitungan: tandai sebuah transaksi dengan probabilitas fraud p bila tidak menandai adalah taruhan yang lebih mahal, yaitu bila p × 50 paling sedikit sama dengan (1 - p) × 5. Itu memberi 55p ≥ 5, sehingga p ≥ 5 / 55 = 9,1%. Inilah **threshold biaya**, seperti di "Calibration and costs".

Langkah 1 selesai bila kamu menekan **Tetapkan biaya ini** dan mencentang tepat dua alasan yang benar mengapa accuracy menyesatkan: fraud jarang terjadi, dan accuracy menganggap kedua kesalahan sama buruknya.

## Langkah 2: pilih dan bela sebuah split
*Siapa yang akan dihadapi model, dan apakah splitmu meniru hal itu?*

Mulailah dari satu kalimat: saat model dipakai, apa yang akan baru? Split **acak** menguji pada transaksi mana pun. Split **per pelanggan** mengirim seluruh transaksi seorang pelanggan ke satu sisi: pada Dataset 1, 45 pelanggan masuk training dan 15 masuk test (900 dan 300 baris). Split **temporal** melatih pada 900 baris paling awal, sampai hari ke-67, dan menguji pada 300 baris paling akhir.

Lab mengukur seberapa optimistis tiap split dengan satu forest acuan, yaitu model fleksibel dengan pengaturan tetap, yang dinilai pada setiap split (AUC-nya adalah rata-rata dari 5 split; split temporal hanya satu). Baseline biasa tidak dapat menunjukkannya: ia mendapat AUC 0,5 di mana pun.

| Split | AUC forest acuan | Terendah sampai tertinggi dari 5 split | Test rows yang pelanggannya ada di training |
|---|---|---|---|
| Acak | 0,84 | 0,77 sampai 0,89 | 100% |
| Dikelompokkan per pelanggan | 0,72 | 0,64 sampai 0,78 | 0% |
| Temporal (menurut waktu) | 0,88 | hanya satu split mungkin | 100% |

[[figure:intermediate-capstone-project/split-optimism|Forest acuan pada Dataset 1: AUC untuk tiap split, dan porsi test rows yang pelanggannya sudah ada di training.]]

Sidik jari perangkat hampir konstan dalam satu pelanggan dan tidak mengatakan apa pun tentang fraud antarpelanggan. Model yang fleksibel tetap dapat memakainya untuk mengenali seorang pelanggan dan mengingat riwayatnya, dan itu membuahkan hasil bila pelanggan itu ada di training rows maupun test rows. Split temporal menghilangkan masa depan tetapi mempertahankan setiap pelanggan. Setelah itu, tulis pembelaanmu dalam satu baris.

## Langkah 3: tiga model, satu pencarian
*Bagaimana kamu membandingkan model tanpa menyentuh held-out rows?*

Tiga model bersaing: **Baseline**, yang memberi setiap baris tingkat fraud pada training (AUC 0,5); **Regresi logistik**, dengan penalti L2 yang di-tune; dan **Random forest**, dengan kedalaman maksimum yang di-tune. Kedua model yang bisa di-tune masing-masing mendapat pencarian kecil yang sama: lima nilai, dinilai dengan AUC pada 3 fold validasi di dalam training rows. Lab menetapkan seed-nya, sehingga awal yang bersih mengulang angka ini, dan itu memungkinkan orang lain mengulang proyekmu. Setiap fit dan setiap pencarian hanya memakai training rows, aturan pipeline dari "Reproducible pipelines".

Fold-nya mengikuti splitmu: pada split per pelanggan, seorang pelanggan tidak pernah ada di kedua sisi sebuah fold, seperti di "Grouped and temporal splits".

| Forest: kedalaman maksimum | 2 | 3 | 5 | 8 | 12 |
|---|---|---|---|---|---|
| Per pelanggan: AUC validasi | 0,76 | 0,73 | 0,68 | 0,67 | 0,63 |
| Acak: AUC validasi | 0,79 | 0,82 | 0,81 | 0,84 | 0,81 |

Pada split per pelanggan, forest yang paling dangkal menang dan kedalaman 12 tertinggal jauh. Pada split acak, kedalaman 8 menang. Tree yang dalam dapat mengingat setiap pelanggan, dan itu hanya berguna bila pelanggan kembali: pengaturan terbaik bergantung pada split.

Penalti L2 hampir tidak berpengaruh: kelima skornya sekitar 0,70 pada split per pelanggan. Skor yang berselisih tidak lebih dari 0,005 dari yang terbaik dianggap seri, dan nilai pertama yang menang, di sini penalti yang paling lemah: penalti yang kuat menyusutkan setiap probabilitas ke arah rata-rata dan akan merusak threshold.

## Langkah 4: apa yang dapat dikatakan held-out rows
*Seberapa yakin kamu pada skor dari 18 fraud?*

Sekarang held-out rows (disebut juga test rows) dinilai satu kali. Pada split per pelanggan, jumlahnya 300 transaksi dengan hanya 18 fraud, sehingga setiap skor bertumpu pada segelintir kasus. Tiap skor disertai **interval bootstrap** 95%: ambil ulang 300 baris dengan pengembalian, nilai lagi, ulangi B kali, dan ambil 95% bagian tengahnya.

| Model | AUC | Average precision | Expected cost per transaksi |
|---|---|---|---|
| Baseline | 0,50 | 0,06 (0,03 sampai 0,08) | 3,00 (1,67 sampai 4,17) |
| Regresi logistik | 0,74 (0,62 sampai 0,85) | 0,16 (0,09 sampai 0,31) | 2,65 (2,02 sampai 3,25) |
| Random forest | 0,70 (0,58 sampai 0,81) | 0,11 (0,07 sampai 0,22) | 2,65 (1,68 sampai 3,52) |

AUC baseline tepat 0,50 baris mana pun yang terambil, sehingga ia tidak punya sebaran.

Pada validasi, forest unggul, 0,76 dibanding 0,70. Pada held-out rows, regresi logistik unggul, 0,74 dibanding 0,70, tetapi selisih AUC, logistik dikurangi forest, adalah +0,05 dengan interval -0,02 sampai 0,11. Selisihnya dihitung dari skor yang belum dibulatkan (0,745 dan 0,699), sehingga tampil +0,05. Interval itu mencakup nol, sehingga baris-baris ini tidak dapat mengatakan model mana yang lebih baik.

[[figure:intermediate-capstone-project/interval-by-split|AUC held-out dengan interval 95% untuk split per pelanggan dan split acak pada Dataset 1. Pada split acak forest jelas unggul; pada split per pelanggan kedua interval tumpang tindih.]]

> Awas: bootstrap mengambil ulang transaksi satu per satu, padahal 300 held-out rows hanya berasal dari 15 pelanggan. Transaksi mereka tidak saling bebas, sehingga ketidakpastian yang sebenarnya lebih lebar daripada interval ini. "Defending an evaluation" mengambil ulang seluruh pasien karena alasan yang sama.

## Langkah 5: threshold
*Di mana kamu memotong probabilitas, dan siapa yang menentukan potongannya?*

Threshold mengubah setiap probabilitas fraud menjadi sebuah tanda, dan biayalah yang memilihnya, bukan held-out rows. Pada split per pelanggan, regresi logistik pada 9,1% menandai 133 dari 300 transaksi dan menangkap 14 dari 18 fraud (recall 78%). Ia menghasilkan 119 alarm palsu, sehingga precision-nya 11%.

> Contoh hitungan: 4 fraud yang terlewat berbiaya 4 × 50 = 200, dan 119 alarm palsu berbiaya 119 × 5 = 595. Totalnya 795, atau 795 / 300 = 2,65 per transaksi. Tidak menandai apa pun berbiaya 18 × 50 / 300 = 3,00 dan menandai semuanya berbiaya 282 × 5 / 300 = 4,70.

[[figure:intermediate-capstone-project/cost-curve|Expected cost per transaksi di setiap threshold pada held-out rows split per pelanggan, untuk regresi logistik. Kurva turun pada 13,5%, tetapi penurunan itu ditemukan pada test rows.]]

Kurva itu lebih rendah pada 13,5%: 77 ditandai, 13 dari 18 tertangkap, biaya 1,90. Berpindah ke sana tampak seperti keuntungan, tetapi kamu menemukan penurunan itu pada test rows, sehingga biaya 1,90 yang dilaporkan terlalu optimistis dan lab memperingatkanmu. Pakai threshold biaya, dan katakan bahwa angkanya hanya perkiraan: probabilitas sebuah model tidak selalu probabilitas yang sebenarnya.

## Langkah 6: laporkan dan nilai
*Apa yang kamu tulis, dan apa batas hasilnya?*

Langkah 6 meminta tiga teks pendek: **Split dan alasannya**, **Model yang kupilih dan alasannya** dan **Apa yang bisa salah**. Setelah itu kamu menilai **Pembelaan split**, **Perbandingan yang adil**, **Ketidakpastian** dan **Threshold** sebagai **Belum**, **Sebagian** atau **Sudah**. Lab menggabungkan semuanya menjadi **Ringkasan capstone** yang dapat kamu salin.

> Contoh hitungan: "Datanya sintetis. Aku membagi per pelanggan, karena model akan menilai pelanggan yang belum pernah dilihatnya; split acak memberi forest acuan AUC 0,84 dibanding 0,72. Aku membawa forest ke langkah berikutnya. Pada 300 held-out rows dengan 18 fraud, AUC-nya 0,70 (0,58 sampai 0,81), dan interval regresi logistik tumpang tindih dengannya. Aku menandai pada 9,1%."

Sebelum mempercayai sebuah temuan, tekan **Transaksi baru** dan periksa pada dataset lain, lalu sebutkan batasnya di laporanmu.

::: remember
- Tulis split sebagai kalimat tentang cara model akan dipakai, periksa seberapa optimistis tiap split, dan lakukan tuning di dalam training rows dengan fold yang mengikuti split.
- Skor held-out dengan label yang langka hanyalah satu hasil: laporkan interval, sebutkan selisih mana yang tidak dapat diputuskan oleh baris-baris itu, dan ambil threshold dari biaya, bukan dari kurva test.
- Laporkan juga batasnya: data sintetis, satu potongan, sedikit fraud dari sedikit pelanggan, dan bootstrap yang memperlakukan transaksi sebagai saling bebas.
:::

@@lab

## Lab: workbench capstone Level 2
Keenam langkah terbuka berurutan, dan pekerjaanmu hanya disimpan di browser ini. Angka di bawah berlaku dari awal yang bersih: tekan **Mulai dari awal**, lalu tekan lagi selagi tertulis **Tekan lagi untuk menghapus semuanya**. Lab kemudian menampilkan Dataset 1 dari 24 (1.200 transaksi sintetis, 93 fraud), biaya 5 dan 50, serta 200 resample bootstrap.

### Langkah
1. **Rumuskan masalah.** Baik: kamu dapat menjelaskan mengapa model yang tidak pernah menandai tampak bagus padahal tidak.
2. **Pilih dan bela sebuah split.** Baik: splitmu meniru cara model akan dipakai, dan kamu tahu seberapa optimistis kedua split yang lain.
3. **Bandingkan model.** Baik: split sama, pencarian sama, hanya training rows.
4. **Ukur ketidakpastian.** Baik: kamu menyebut selisih mana yang tidak dapat diputuskan oleh held-out rows.
5. **Pilih threshold.** Baik: threshold berasal dari biaya, bukan dari kurva test.
6. **Laporkan dan nilai.** Baik: penilaianmu sesuai dengan buktinya.

### Kontrol
- Enam chip di atas langkah-langkah melompat ke sebuah langkah. Langkah berikutnya terkunci ("Selesaikan langkah N dulu") sampai langkah sebelumnya selesai; **Lanjut ke langkah N** memindahkanmu.
- Langkah 1. **Transaksi baru** pindah ke dataset berikutnya dari 24 dan mereset langkah 2 sampai 5. **Biaya alarm palsu (transaksi yang baik ditandai)** (1 sampai 20, mulai dari 5) dan **Biaya fraud yang terlewat (fraud tidak ditandai)** (5 sampai 200, mulai dari 50). **Tetapkan biaya ini** mengonfirmasinya. **Mengapa accuracy biasa menyesatkan di sini? Centang setiap alasan yang benar.** mendaftar tiga alasan.
- Langkah 2. **1. Pilih split yang sesuai dengan cara model akan dipakai**: **Acak**, **Dikelompokkan per pelanggan**, **Temporal (menurut waktu)**. **Bandingkan ketiga split** mengisi tabel. **2. Pembelaanmu atas split ini dalam satu baris** menampung 200 karakter. Memilih split lain mereset langkah 3 sampai 5.
- Langkah 3. **Cari kekuatan penalti** dan **Cari kedalaman maksimum** menilai lima nilai masing-masing. **Nilai Penalti L2 yang dipakai** dan **Nilai kedalaman maks yang dipakai** mulai dari "Terbaik dari pencarian". **3. Model yang kubawa ke held-out rows**: **Regresi logistik** atau **Random forest**.
- Langkah 4. **Resample bootstrap (B)** (100 sampai 1000, mulai dari 200). **Nilai held-out rows** melatih model pada training rows dan menilai held-out rows satu kali. **Bagaimana kamu membaca interval ini?** menawarkan empat bacaan.
- Langkah 5. **Threshold (tandai transaksi bila probabilitasnya mencapai nilai ini)** bergerak dengan langkah 0,5 poin. **Pakai threshold biaya** mengembalikannya ke threshold biaya. **Pakai threshold ini** mengonfirmasi pilihanmu.
- Langkah 6. **Split dan alasannya**, **Model yang kupilih dan alasannya** dan **Apa yang bisa salah** masing-masing menampung 500 karakter. **Nilai pekerjaanmu sendiri** punya empat kriteria dengan tiga tingkat masing-masing. **Salin ringkasan** menyalin **Ringkasan capstone**.
- Tombol bulat **Kuis Cepat** membuka panel Kuis Cepat; lencananya berdenyut saat langkah 2 terbuka. **Mulai dari awal** dan **Reset** menghapus pekerjaanmu, tetapi hanya pada tekanan kedua dalam lima detik.

### Yang kamu lihat
- Status menampilkan "N dari 6 langkah selesai". Kartu **Proyekmu** mendaftar **Dataset**, **Biaya**, **Split**, **Model** dan **Threshold**.
- Langkah 1 menyebutkan ukuran dataset dan jumlah fraud-nya, menggambar batang **Keseimbangan kelas**, memberi harga model yang tidak pernah menandai dan yang menandai semuanya, dan menampilkan aturan threshold.
- Langkah 2 menampilkan tabel "Seberapa optimistis tiap split: satu forest acuan, dinilai pada test rows tiap split", dengan **Split**, **AUC forest acuan**, **Terendah sampai tertinggi dari 5 split**, **Test rows yang pelanggannya ada di training** dan **Splitmu dikurangi split ini**, lalu kalimat yang menyebut apakah splitmu yang lebih optimistis atau yang lebih ketat.
- Kuis Cepat menanyakan "Dibandingkan dengan split per pelanggan, AUC berapa yang akan diberikan split acak pada forest acuan?" dan menampilkan kedua AUC setelah kamu menjawab.
- Langkah 3 menampilkan **AUC validasi** dan **Sebaran antar fold** untuk kelima nilai, lalu **Ketiga model berdampingan** dan sebuah kalimat tentang apakah selisihnya lebih besar daripada noise antar fold.
- Langkah 4 menampilkan setiap skor sebagai perkiraan (ujung bawah – ujung atas), diagram interval AUC (garis putus-putus: AUC 0,5) dan interval selisih antara kedua model.
- Langkah 5 menampilkan **Threshold biaya**, **Thresholdmu**, **Ditandai**, **Precision** (menampilkan "–" bila **Ditandai** adalah 0), **Recall**, **Expected cost per transaksi** dan **Total biaya pada held-out rows**, sebuah confusion matrix, diagram **Expected cost pada held-out rows di tiap threshold**, dan peringatan bila kamu meninggalkan threshold biaya.

### Percobaan
1. **Split mana yang membuat model tampak terlalu bagus?** Prediksi: buka Kuis Cepat (tombol bulat) dan jawab sebelum melihat hasilnya. Persiapan: di langkah 1 tekan **Tetapkan biaya ini** dan centang dua alasan pertama. Di langkah 2 pilih **Dikelompokkan per pelanggan** dan tekan **Bandingkan ketiga split**. Forest acuan mendapat AUC 0,84 pada **Acak**, 0,72 pada **Dikelompokkan per pelanggan** dan 0,88 pada **Temporal (menurut waktu)**; pelanggannya ada di training untuk 100%, 0% dan 100% test rows. Jelaskan dengan sidik jari perangkat. Mengapa split temporal juga tinggi, padahal ia tidak pernah memperlihatkan masa depan kepada model?
2. **Apakah pengaturan terbaik bergantung pada split?** Prediksi: pada split per pelanggan, apakah forest yang lebih dalam mendapat skor lebih baik atau lebih buruk? Persiapan: di langkah 3 tekan **Cari kekuatan penalti** dan **Cari kedalaman maksimum**. Kedalaman 2, 3, 5, 8 dan 12 mendapat 0,76, 0,73, 0,68, 0,67 dan 0,63, sehingga yang paling dangkal menang; kelima penalti mendapat sekitar 0,70. Sekarang pilih **Acak** di langkah 2 dan cari lagi: 0,79, 0,82, 0,81, 0,84 dan 0,81, sehingga kedalaman 8 menang. Mengapa tree yang dalam hanya menguntungkan pada satu split?
3. **Dapatkah held-out rows membedakan kedua model?** Prediksi: pada split per pelanggan, forest unggul di validasi, 0,76 dibanding 0,70. Akankah held-out rows memastikannya? Persiapan: pilih **Dikelompokkan per pelanggan**, cari untuk kedua model, bawa **Random forest** ke depan, lalu tekan **Nilai held-out rows**. AUC-nya 0,50 untuk baseline, 0,74 (0,62 – 0,85) untuk regresi logistik dan 0,70 (0,58 – 0,81) untuk forest, dan selisih forest dikurangi logistik adalah -0,05 dengan interval -0,11 sampai 0,02: interval itu mencakup nol. Pilih bacaan yang sesuai. Lalu ulangi pada **Acak**: forest 0,85 (0,77 – 0,92), logistik 0,75 (0,63 – 0,84), selisih +0,09 (0,01 sampai 0,20). Mengapa kemenangan yang jelas pada split acak bukan kemenangan yang jelas pada split per pelanggan?
4. **Apakah resampling yang lebih banyak mempersempit interval?** Prediksi: bila kamu menaikkan **Resample bootstrap (B)** dari 200 ke 1000, akankah interval AUC modelmu menyempit, tetap sama, atau melebar? Persiapan: pada split per pelanggan dengan forest di depan, interval AUC-nya 0,70 (0,58 – 0,81) pada 200. Pada 1000 hasilnya 0,70 (0,58 – 0,81) lagi, dan pada 100 hasilnya 0,70 (0,59 – 0,82). Jelaskan: apa yang menentukan lebarnya, dan apa yang akan mempersempitnya?
5. **Di mana threshold sebaiknya berada?** Prediksi: bila kamu menyeret **Threshold (tandai transaksi bila probabilitasnya mencapai nilai ini)** ke titik terendah kurva, apakah biaya yang dilaporkan jujur? Persiapan: pada split per pelanggan, bawa **Regresi logistik** ke depan di langkah 3 dan buka langkah 5. Pada 9,1% ia menandai 133 / 300, dengan **Precision** 11%, **Recall** 78% dan **Expected cost per transaksi** 2,65 (total 795); matriksnya menampilkan 14 tertangkap, 4 terlewat, 119 alarm palsu dan 163 true negative. Tidak menandai apa pun berbiaya 3,00 dan menandai semuanya 4,70. Seret ke 13,5%: 77 ditandai, precision 17%, recall 72%, biaya 1,90, dan lab memperingatkan bahwa kamu melakukan tuning pada test rows. Tekan **Pakai threshold biaya**. Lalu atur biaya fraud yang terlewat menjadi 100 di langkah 1: threshold menjadi 4,8%, 214 ditandai (recall 89%) dan biayanya 3,97, dibanding 6,00 untuk tidak menandai apa pun dan 4,70 untuk menandai semuanya. Kembalikan ke 50.
6. **Dataset baru.** Prediksi: akankah split per pelanggan tetap yang paling ketat pada dataset lain? Persiapan: di langkah 1 tekan **Transaksi baru**. Dataset 2 berisi 98 fraud (8,2%); tekan **Bandingkan ketiga split** di langkah 2: acak 0,84, per pelanggan 0,66, temporal 0,84. Dataset 3 berisi 95 fraud (7,9%): 0,94, 0,74, 0,91. Pada keseluruhan 24 dataset, split per pelanggan selalu yang terendah, dan selisih acak dikurangi per pelanggan berkisar dari 0,07 sampai 0,31. Bagaimana kamu menuliskan temuannya?

### Rubrik
Nilai tiap kriteria di akhir langkah 6 dengan **Belum**, **Sebagian** atau **Sudah**. Lab mencetak kalimat-kalimat ini.

| Kriteria | Belum | Sebagian | Sudah |
|---|---|---|---|
| Pembelaan split | Aku memilih split tanpa menyebut siapa yang akan dihadapi model saat dipakai: pelanggan baru, atau masa depan. | Aku menyebut siapa yang akan dihadapi model, tetapi tidak menjelaskan mengapa splitku sesuai untuk itu. | Aku menyesuaikan split dengan cara model dipakai, membandingkannya dengan split yang lain, dan menulis pembelaan satu baris. |
| Perbandingan yang adil | Aku membandingkan model pada baris yang berbeda, atau pada baris yang dipakai untuk men-tune model. | Baris yang sama untuk semua model, tetapi pencarian tuning tidak mengikuti split, atau aku memilih model setelah melihat held-out rows. | Split yang sama untuk semua model, masing-masing di-tune dengan cara yang sama hanya pada bagian training, dan held-out rows tidak disentuh sampai akhir. |
| Ketidakpastian | Aku melaporkan angka tunggal dari held-out rows. | Aku melihat interval-nya tetapi tidak memakainya untuk menyatakan apa yang tidak bisa dijawab baris-baris ini. | Aku melaporkan AUC, average precision, dan expected cost beserta intervalnya, menyatakan selisih mana yang nyata dan mana yang masih dalam noise, serta menyebut betapa sedikitnya fraud. |
| Threshold | Aku memakai 50%, atau memilih threshold dengan menebak. | Aku memakai biayanya, tetapi men-tune threshold pada held-out rows, atau tidak mempertanyakan probabilitasnya. | Aku menetapkan threshold dari biayanya, membaca expected cost dan confusion matrix, dan menyebut apa yang akan mengubahnya. |

### Data nyata
Lab ini tidak punya tabel nyata dan tidak ada tombol untuk beralih ke data nyata: setiap transaksi bersifat sintetis, dan sidik jari perangkatnya sengaja dibuat bocor. Tanyakan pada tabel nyata mana pun: apakah sebuah entitas (pelanggan, pasien, perangkat) muncul di banyak baris, dan apakah ada urutan waktu? Bila ya, pilih split dari jawaban itu dan tuliskan.
