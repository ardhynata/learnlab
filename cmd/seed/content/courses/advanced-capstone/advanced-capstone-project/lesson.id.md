---
slug: advanced-capstone-project
title: Proyek capstone Level 3
---
::: intro
- Rumuskan sistem peninjauan harian pada kasus sintetis: turunkan threshold penandaan dari biaya dan kapasitas peninjauan, lalu nilai model dengan expected cost.
- Bela sebuah split, bandingkan tiga model dengan tidak berbuat apa-apa, dan catat satu run yang bila diulang memberi angka yang sama.
- Rencanakan monitor, putar ulang sebuah stream, selidiki kegagalan tersembunyi dari buktinya, pilih perbaikan berdasarkan biaya, dan nilai pekerjaanmu sendiri.

Sebelum mulai: baca "End-to-end design and reproducibility" dan "Operating and investigating a model" di course ini, serta "Covariate and concept shift" di Advanced evaluation and shift. Kedua yang pertama memberimu daftar periksa desain, rencana monitoring, dan enam langkah investigasi. Yang ketiga menamai jenis-jenis pergeseran yang disembunyikan lab ini.
:::

## Soal yang diberikan
*Apa yang kamu bangun di workbench, dan seperti apa datanya?*

**Workbench capstone Level 3** menutup level ini. Sebuah tim menilai kasus dari banyak entitas (pelanggan, akun) sekali sehari, lalu meninjau yang paling berisiko. Kamu membangun sistem itu, membelanya, memantaunya setelah peluncuran, dan menyelidiki apa yang rusak.

Datanya sintetis: sebuah program membuatnya, dan tidak ada pelanggan sungguhan di baliknya. Skenario 1 dari 6 berisi 2.880 kasus berlabel dari 36 entitas selama 36 hari, 161 di antaranya positif (5,6%). Setelah peluncuran, model menilai 80 kasus per hari selama 54 hari, 40% entitasnya baru, dan setiap hasil baru diketahui 7 hari setelah kasusnya. Satu kegagalan tersembunyi di dalam stream itu.

[[figure:advanced-capstone-project/seven-steps|Tujuh langkah workbench dan apa yang diperiksa lab sebelum membuka langkah berikutnya.]]

> Gagasan kunci: setiap langkah terbuka setelah langkah sebelumnya selesai, dan "selesai" diperiksa pada pekerjaanmu, seperti pada "Intermediate capstone project".

## Langkah 1: rumuskan masalah
*Berapa biaya sebuah kesalahan, dan apa yang disembunyikan accuracy?*

Semua biaya memakai satu satuan. Lab memulai dengan biaya 100 untuk positif yang terlewat, 5 untuk satu peninjauan, dan 5 tambahan untuk alarm palsu (kasus yang ditinjau tetapi ternyata baik). Tim dapat meninjau 24 dari 80 kasus per hari. Sebuah kasus dengan probabilitas p berbiaya 5 + (1 - p) × 5 bila kamu menandainya dan p × 100 bila kamu membiarkannya.

> Contoh hitungan: menandai lebih murah bila 10 - 5p paling besar 100p, yaitu bila p ≥ 10 / 105 = 9,5%. Itulah threshold penandaan. Kapasitas kemudian memotong daftar itu ke skor tertinggi.

Model yang tidak pernah menandai punya accuracy 94,4% tetapi melewatkan semua 161 positif: 5,59 per kasus (161 × 100 / 2.880). Menandai setiap kasus berbiaya 9,72. Jadi metriknya adalah expected cost per kasus dalam batas kapasitas, dengan AUC sebagai sudut pandang kedua. Keputusannya berupa antrean peninjauan harian yang dinilai secara batch: kasus hari itu diurutkan bersama terhadap kapasitas dan hasilnya datang 7 hari kemudian. Langkah 1 selesai bila kamu menekan **Tetapkan biaya ini** dan mencentang dua alasan yang benar mengapa accuracy menyesatkan: positif jarang, dan accuracy menganggap kasus terlewat dan alarm palsu sama buruknya.

## Langkah 2: pilih dan bela sebuah split
*Siapa yang akan dihadapi model, dan apakah splitmu meniru hal itu?*

Tanyakan apa yang akan baru setelah peluncuran. Di sini 40% entitas baru muncul hanya setelah peluncuran. Lab mengukur setiap split dengan satu forest acuan, yang dinilai pada sisi test split itu dan pada kasus entitas baru setelah peluncuran, sebelum kegagalan terjadi.

| Split | AUC pada sisi test | AUC pada entitas baru | Split memuji sebesar | Entitas di kedua sisi |
|---|---|---|---|---|
| Acak | 0,84 | 0,67 | +0,17 | 36 |
| Per entitas | 0,64 | 0,62 | +0,02 | 0 |
| Temporal | 0,83 | 0,71 | +0,12 | 36 |

[[figure:advanced-capstone-project/split-gap|Forest acuan pada skenario 1: AUC pada sisi test tiap split dan pada entitas baru setelah peluncuran. Hanya split per entitas yang dekat dengan kenyataan.]]

Setiap kasus membawa pengenal seperti deviceId, yang dapat dipakai forest fleksibel untuk mengenali sebuah entitas dan mengingat riwayatnya. Itu hanya berguna bila entitasnya ada di kedua sisi, dan karena itulah split acak dan temporal memuji, yaitu membuat model tampak lebih baik daripada kenyataan. Split temporal menyingkirkan masa depan dari training tetapi tidak entitasnya. Split acak dan per entitas diulang 3 kali lalu dirata-ratakan. Setelah itu tulis pembelaan satu baris.

## Langkah 3: bandingkan model
*Adakah model yang mengalahkan tidak berbuat apa-apa, dan seberapa yakin kamu?*

Tiga kandidat bersaing: **Baseline** (tidak menandai apa pun), **Regresi logistik** dengan penalti L2 yang perlu di-tune, dan **Random forest** dengan kedalaman maksimum yang perlu di-tune. Setiap pencarian menilai 4 nilai dengan 3 fold validasi yang mengikuti splitmu, hanya pada bagian training. Sesudah itu sisi test dinilai satu kali, dengan interval bootstrap 95%.

| Split per entitas | AUC | Biaya per kasus | Ditandai |
|---|---|---|---|
| Baseline | 0,50 | 2,78 (1,53 – 3,89) | 0 / 216 |
| Logistik, L2 0,1 | 0,78 (0,69 – 0,86) | 3,00 (2,25 – 3,90) | 121 / 216 |
| Forest, kedalaman 4 | 0,61 (0,46 – 0,73) | 3,76 (2,77 – 4,70) | 134 / 216 |

> Contoh hitungan: sisi test berisi 720 kasus dan 20 positif, dari 9 entitas. Baseline berbiaya 20 × 100 / 720 = 2,78. Regresi logistik menangkap 10 dari 20, melewatkan 10 (1.000), menjalankan 121 peninjauan (605) dan 111 alarm palsu (555): 2.160 / 720 = 3,00.

AUC yang bagus belum berarti keputusan yang bagus pada harga ini. Selisih biayanya, logistik dikurangi baseline, adalah +0,22 dengan interval -0,55 sampai +1,08, sehingga baris-baris ini tidak dapat menyatakan mana yang lebih murah. Pada split acak, forest berbiaya 3,81 dibanding 5,97, dan interval selisihnya tetap di bawah 0: jelas lebih murah.

## Langkah 4: catat run yang dapat direproduksi
*Apa yang harus dicatat agar orang lain mendapatkan angkamu kembali?*

**Catat run ini** menyimpan seed skenario, split, model beserta pengaturannya, biaya, dan kapasitas. Untuk regresi logistik pada split per entitas, ia juga menyimpan sidik jari split, 2.160 / 720 kasus train dan test, AUC 0,78, expected cost 3,00, dan 121 kasus yang ditandai.

**Rerun** dimulai lagi dari catatan itu. Split dan setiap angka harus identik (sampai 9 desimal). Lalu ubah satu pengaturan, supaya kamu tahu pemeriksaannya dapat gagal. Menaikkan biaya kasus terlewat sebesar 10 mengubah 6 nilai tercatat: kasus yang ditandai naik dari 121 menjadi 173 dan threshold turun dari 9,5% menjadi 8,7%, tetapi splitnya sama. Mengubah fraksi test mengubah bahkan sidik jari splitnya.

Menaikkan kapasitas sebesar 4 tidak mengubah apa pun: 121 kasus yang ditandai jauh di bawah 216 yang diizinkan sisi test, sehingga batasnya tidak pernah menahan. Lab lalu memintamu memilih pengaturan lain.

## Langkah 5: rencanakan monitoring
*Monitor mana yang menangkap kegagalan, dan dengan harga berapa alarm palsu?*

Setelah peluncuran, tidak ada yang memberi tahu kapan sesuatu rusak. Model yang dipantau di sini adalah regresi logistik yang dilatih pada seluruh riwayat, sama di setiap skenario. Ada empat monitor: input drift (PSI per feature, Population Stability Index: seberapa jauh sebaran terbaru bergeser dari riwayatnya; 0 berarti tidak berubah, di atas 0,25 besar), score drift, delayed accuracy, dan porsi positif. Dua yang terakhir menunggu label. Satu hari alarm palsu berbiaya 50 untuk investigasi. Sebuah monitor harus melanggar pada beberapa hari berturut-turut (2 di awal) sebelum mengirim alert.

| Rencana, skenario 1 | Alert benar pertama | Hari alarm palsu | Biaya sampai terdeteksi | Total |
|---|---|---|---|---|
| Input drift, PSI di atas 0,25 | hari ke-49 | 0 | 453 | 453 |
| Hanya porsi positif | hari ke-56 | 0 | 989 | 989 |
| Hanya delayed accuracy | tidak pernah | 0 | 5.765 | 5.765 |
| Input drift, PSI di atas 0,10 | hari ke-47 | 1 | 303 | 353 |

Kegagalan dimulai pada hari ke-46. Threshold yang lebih ketat mengirim alert lebih cepat tetapi menambah alarm palsu: 303 + 1 × 50 = 353. Langkah 5 selesai hanya bila rencanamu menangkap kegagalan.

[[figure:advanced-capstone-project/detection-race|Alert benar pertama dari empat monitor pada skenario 1. Input drift dan score drift berbunyi pada hari ke-49, porsi positif pada hari ke-56, dan delayed accuracy tidak pernah.]]

## Langkah 6: selidiki kegagalan
*Hipotesis mana yang didukung bukti, dan perbaikan mana yang termurah?*

Sebuah alert adalah pertanyaan. Pada skenario 1, lab membaca bukti pada hari ke-63: kegagalan dimulai pada hari ke-46, setiap label datang 7 hari setelah kasusnya, dan lab menunggu window 10 hari label yang sudah datang. Ada tiga jenis bukti: PSI feature terhadap riwayat beserta pemeriksaan served-versus-offline, score drift dan delayed accuracy, serta slice. Sebutkan sebuah hipotesis lalu ujilah: **skew** (nilai yang disajikan berbeda dari yang offline), **covariate drift** (input bergeser), **label shift** (porsi positif bergeser), atau **concept shift** (aturan dari input ke hasil berubah). Konfirmasi satu sebelum memilih perbaikan.

[[figure:advanced-capstone-project/evidence-psi|Bukti skenario 1 pada hari ke-63. Hanya amount yang bergerak, nilai yang disajikan sama dengan yang offline, dan model masih mengurutkan dengan baik serta masih memprediksi porsi positif.]]

Pada Bukti 1, PSI amount 2,37 dan feature lain di bawah 0,10 (deviceId, pengenal, 0,097); nilai yang disajikan sama dengan yang offline. Bukti 2: AUC tertunda 0,80 dibanding 0,79 sebelum peluncuran, porsi positif teramati 15,1% dibanding rata-rata skor 15,0%. Hanya inputnya yang bergeser: covariate drift.

Tabel perbaikan memberi harga pada empat opsi dari hari ke-63 sampai akhir. Di sini Pertahankan berbiaya 17.372, Rollback 17.422, Recalibrate 17.472, dan Retrain 17.876 (500 untuk melaksanakannya, aktif setelah 3 hari). Perbaikan termurah adalah Pertahankan: dunia berubah, tetapi model masih bekerja. Diagnosis yang benar tidak selalu menuntut tindakan.

> Awas: penyebab yang terkonfirmasi tidak membuat perbaikannya sepadan dengan harganya. Di sini retraining menambah biaya dan tidak membeli apa-apa, sedangkan pada skenario 5 (dengan rencana bawaan) retraining justru yang termurah.

## Langkah 7: laporkan dan nilai
*Apa yang kamu tulis, dan seberapa jujur penilaian dirimu?*

Langkah 7 meminta enam teks pendek: split dan alasannya, model dan alasannya, rencana monitoring, serta tiga tentang kegagalan (apa yang terjadi, bagaimana kamu menemukannya, apa yang kamu ubah). Setelah itu kamu menilai lima kriteria dengan **Belum**, **Sebagian**, atau **Sudah**. Lab menggabungkan semuanya menjadi **Ringkasan capstone** yang dapat kamu salin.

> Contoh hitungan: "Datanya sintetis. Aku membagi per entitas karena 40% entitas baru setelah peluncuran: split acak membaca AUC 0,84, padahal pada entitas baru hanya 0,67. Pada 720 kasus test dengan 20 positif, tidak ada model yang jelas mengalahkan tidak berbuat apa-apa. Aku memantau input dan mendapat alert pada hari ke-49."

Sebelum mempercayai sebuah temuan, tekan **Skenario baru** dan periksa pada skenario yang segar, lalu katakan apa yang tidak dapat kamu uji.

::: remember
- Rumuskan keputusan beserta biaya dan kapasitasnya, ambil threshold penandaan dari keduanya, dan nilai model dengan expected cost per kasus dibandingkan tidak berbuat apa-apa.
- Bela split dengan selisihnya terhadap entitas baru, laporkan interval, dan catat setiap pengaturan agar rerun memberi angka yang sama dan satu pengaturan yang diubah merusaknya.
- Timbang monitor dari keterlambatan deteksi dan alarm palsunya, konfirmasi penyebab dari bukti sebelum memperbaiki, dan biarkan biaya yang memilih perbaikannya.
:::

@@lab

## Lab: workbench capstone Level 3
Ketujuh langkah terbuka berurutan, dan pekerjaanmu hanya disimpan di browser ini. Angka di bawah berlaku dari awal yang bersih: tekan **Mulai dari awal**, lalu tekan lagi selagi tertulis **Tekan lagi untuk menghapus semuanya**. Kamu berada di skenario 1 dari 6, dengan biaya kasus terlewat 100, alarm palsu 5 tambahan, satu peninjauan 5, dan kapasitas peninjauan 24.

### Langkah
1. **Rumuskan masalah.** Selesai: antrean peninjauan harian, batch, **Tetapkan biaya ini** ditekan, metrik biaya, dan kedua alasan yang benar dicentang.
2. **Pilih dan bela sebuah split.** Selesai: split dipilih, dibandingkan, dan dibela.
3. **Bandingkan model.** Selesai: kedua pencarian dijalankan, ketiga model dinilai, dan satu model dibawa ke langkah berikutnya.
4. **Catat run yang dapat direproduksi.** Selesai: dicatat, di-rerun, dan satu pengaturan yang diubah merusak pemeriksaan.
5. **Rencanakan monitoring.** Selesai: replay menangkap kegagalan.
6. **Selidiki kegagalan.** Selesai: satu hipotesis terkonfirmasi dan satu perbaikan diterapkan.
7. **Laporkan dan nilai.** Selesai: enam teks ditulis dan lima kriteria dinilai.

### Kontrol
- Ketujuh chip (**Rumuskan**, **Split**, **Model**, **Repro**, **Monitor**, **Selidiki**, **Laporan**) melompat ke sebuah langkah. Sebuah langkah tertulis **Selesai**, **Belum**, atau **Terkunci**; **Lanjut ke langkah N** melanjutkan.
- Langkah 1. **Skenario baru** pindah ke skenario berikutnya dari 6 dan mereset langkah 2 sampai 6. Pertanyaan **1. Keputusan apa yang didukung model?** dan **2. Batch atau online?**. Slider **Biaya positif yang terlewat**, **Biaya tambahan alarm palsu (kasus yang ditinjau tetapi ternyata baik)**, **Biaya satu peninjauan**, dan **Kapasitas peninjauan (kasus per hari)**, lalu **Tetapkan biaya ini**. **3. Metrik operasional mana yang kamu pakai untuk menilai model?** dan **4. Mengapa accuracy biasa menyesatkan di sini? Centang setiap alasan yang benar.**
- Langkah 2. **1. Pilih split yang sesuai dengan cara model akan dipakai**: **Acak**, **Per entitas**, **Temporal**. **Bandingkan ketiga split**. **2. Pembelaanmu atas split ini dalam satu baris** (200 karakter).
- Langkah 3. **Cari kekuatan penalti** dan **Cari kedalaman maksimum**, lalu **Nilai penalti L2 yang dipakai** dan **Nilai kedalaman maks yang dipakai** (mulai dari "Terbaik dari pencarian"). **Nilai ketiga model pada sisi test**. **Model yang kubawa ke langkah berikutnya**.
- Langkah 4. **Catat run ini**, **Rerun**, **Satu pengaturan mana yang diubah**, dan **Rerun dengan perubahan**.
- Langkah 5. **Pantau input** dengan satu toggle per feature (deviceId, sebuah pengenal, mulai dalam keadaan mati), **Alert bila PSI terbesar di atas** dan **Window (hari)**; **Pantau skor**; **Pantau delayed accuracy**; **Pantau porsi positif**; **Hari berturut-turut sebuah monitor harus melanggar sebelum alert**; **Putar ulang stream**. Hanya input drift yang menyala di awal (0,25, 7 hari, 2 hari berturut-turut).
- Langkah 6. **Feature yang diperiksa (tabel slice di bawah, serta hipotesis skew atau covariate, membahas feature ini)**; **Hipotesis mana yang menjelaskan alert ini?** (skew, covariate drift, label shift, concept shift) dengan **Uji hipotesis ini**; **Perbaikan mana yang kamu terapkan?** (**Pertahankan model apa adanya**, **Rollback**, **Recalibrate**, **Retrain**) dengan **Terapkan perbaikan ini**. Penghitung tertulis **Hipotesis yang ditolak sejauh ini: N.**
- Langkah 7. Enam kotak teks (masing-masing 500 karakter), **Nilai pekerjaanmu sendiri**, dan **Salin ringkasan**.
- Tombol bulat **Kuis Cepat** membuka panelnya. **Mulai dari awal** dan **Reset** menghapus pekerjaanmu, tetapi hanya pada tekanan kedua.

### Yang kamu lihat
- Status tertulis "N dari 7 langkah selesai". Kartu **Proyekmu** mencantumkan **Skenario**, **Keputusan**, **Biaya**, **Split**, **Model**, **Monitoring**, dan **Diagnosis**.
- Kuis Cepat menanyakan split mana yang memberi AUC paling dekat dengan skor forest pada entitas baru, dan menampilkan ketiga AUC setelah langkah 2 dibandingkan.
- Langkah 1 menyebut riwayatnya, threshold penandaan (9,5%), dan biaya model yang tidak pernah menandai (5,59 per kasus).
- Langkah 2 menampilkan **Seberapa optimistis tiap split** dengan kolom **AUC pada sisi test split**, **AUC pada entitas baru setelah peluncuran**, **Seberapa besar split memuji (selisih)**, **Entitas di kedua sisi**, dan **Selisih, run terendah sampai tertinggi**.
- Langkah 3 menampilkan **Skor sisi test dengan interval bootstrap 95%** dan grafik **Expected cost per kasus beserta interval 95% (makin rendah makin baik)**, lalu ketiga selisih biaya beserta intervalnya.
- Langkah 4 menampilkan **Dari apa sebuah run dibuat**, kotak seperti **Sidik jari split**, dan **Apa yang berbeda dari catatan**.
- Langkah 5 menampilkan kotak **Kegagalan dimulai pada hari**, **Alert pertama pada hari**, **Hari sampai terdeteksi**, **Hari alarm palsu**, **Biaya sampai terdeteksi**, dan **Total biaya dengan alarm palsu**, serta grafik **Monitor drift per hari (PSI)** dan **Delayed accuracy per hari (AUC label yang sudah datang)**.
- Langkah 6 menampilkan **Bukti 1**, **Bukti 2** (**AUC tertunda**, **Porsi positif teramati**, **Rata-rata skor prediksi**) dan **Bukti 3** (**Entitas lama dibandingkan entitas baru**), lalu tabel **Biaya tiap perbaikan dari hari ke-N sampai akhir stream**.

### Percobaan
1. **Split mana yang membuat model tampak terlalu bagus?** Prediksi: jawab Kuis Cepat sebelum melihat hasilnya. Persiapan: selesaikan langkah 1 (opsi pertama pertanyaan 1 dan 2, opsi terakhir pertanyaan 3, kedua alasan pertama, lalu **Tetapkan biaya ini**), pilih **Per entitas** di langkah 2 dan tekan **Bandingkan ketiga split**. Forest acuan mendapat 0,84 pada **Acak** dibanding 0,67 pada entitas baru (+0,17), 0,64 dibanding 0,62 pada **Per entitas** (+0,02), dan 0,83 dibanding 0,71 pada **Temporal** (+0,12). Mengapa split temporal tetap memuji?
2. **Adakah model yang mengalahkan tidak berbuat apa-apa?** Prediksi: pada split per entitas, apakah salah satu model berbiaya lebih rendah per kasus daripada baseline? Persiapan: jalankan kedua pencarian dan **Nilai ketiga model pada sisi test**. Baseline 2,78, logistik 3,00 (2,25 – 3,90), forest 3,76 (2,77 – 4,70): tidak ada yang jelas mengalahkannya, walaupun AUC logistik 0,78. Lalu pilih **Acak**, cari dan nilai lagi: baseline 5,97, logistik 4,78, forest 3,81 (2,74 – 5,08). Mengapa split mengubah putusannya? Kembali ke **Per entitas**, cari dan nilai lagi, lalu bawa **Regresi logistik** ke langkah berikutnya.
3. **Apa yang merusak sebuah rerun?** Prediksi: perubahan mana yang tidak mengubah satu angka pun? Persiapan: **Catat run ini** (AUC 0,78, biaya 3,00, 121 ditandai) dan **Rerun**. Coba **Kapasitas peninjauan harian (+4)**: tidak ada yang berbeda. Coba **Biaya terlewat (+10)**: 6 nilai berbeda dan splitnya sama. Coba **Fraksi test (25% menjadi 20%)**: sidik jari split ikut berubah. Mengapa pemeriksaan yang tidak pernah gagal tidak ada gunanya?
4. **Monitor cepat, monitor lambat.** Prediksi: monitor mana yang berbunyi lebih dulu? Persiapan: tekan **Putar ulang stream** setelah setiap perubahan. Dengan pengaturan bawaan, alert pertama pada hari ke-49, 3 hari setelah hari ke-46, tanpa alarm palsu dan dengan biaya sampai terdeteksi 453. Matikan **Pantau input** dan nyalakan **Pantau porsi positif**: hari ke-56 (989). Pakai **Pantau delayed accuracy** saja: tidak pernah, sehingga langkah 5 tetap terbuka. Dengan **Pantau input** saja lagi, turunkan **Alert bila PSI terbesar di atas** ke 0,10: hari ke-47, 1 hari alarm palsu, total 353. Lalu atur **Hari berturut-turut sebuah monitor harus melanggar sebelum alert** ke 1: hari ke-46, 2 hari alarm palsu, total 100. Rencana mana yang akan kamu luncurkan, dan mengapa satu replay saja tidak cukup?
5. **Diagnosis bukan perbaikan.** Prediksi: perbaikan mana yang termurah? Persiapan: dengan rencana bawaan, langkah 6 menampilkan alert pada hari ke-49 dan membaca bukti pada hari ke-63. Uji **Training-serving skew** pada amount (0% baris berbeda: tidak terkonfirmasi, dan penghitung tertulis 1), lalu **Covariate drift** (PSI amount 2,37: terkonfirmasi). AUC tertunda 0,80 dibanding 0,79, dan porsi positif teramati 15,1% dibanding rata-rata skor 15,0%. Pilih perbaikan dan tekan **Terapkan perbaikan ini**: tabel memberi harga Pertahankan 17.372, Rollback 17.422, Recalibrate 17.472, dan Retrain 17.876. Mengapa retraining tidak membeli apa-apa di sini?
6. **Skenario yang segar.** Prediksi: apakah split per entitas tetap yang paling dekat dengan kenyataan? Persiapan: tekan **Skenario baru** dan **Bandingkan ketiga split**. Skenario 2 memberi acak +0,15, per entitas +0,04, temporal +0,20. Pada keenam skenario, split per entitas selalu yang paling dekat (antara -0,02 dan +0,08), acak berkisar dari +0,13 sampai +0,29, dan temporal dari +0,12 sampai +0,20. Skenario 2 menyembunyikan kegagalan yang berbeda, jadi bangun ulang langkah 3 sampai 6 dan bandingkan diagnosismu dengan buktinya. Bagaimana kamu menyusun kalimat temuannya?

### Rubrik
Nilai setiap kriteria di akhir langkah 7 dengan **Belum**, **Sebagian**, atau **Sudah**. Lab mencetak satu kalimat untuk tiap tingkat. **Sudah** berarti:
- **Pembelaan split**: aku menyesuaikan split dengan cara model dipakai, mengukur optimismenya terhadap split yang lain, dan menulis pembelaan satu baris.
- **Metrik operasional**: aku menilai model dengan expected cost dalam kapasitas peninjauan, lengkap dengan interval, dan menyatakan kapan sebuah model belum jelas mengalahkan tidak berbuat apa-apa.
- **Reproducibility**: aku mencatat seed dan pengaturannya, mengulang sampai angkanya sama, dan melihat bahwa mengubah satu pengaturan mengubah angkanya.
- **Rencana monitoring**: aku memadukan monitor cepat (input, skor) dengan yang lambat tetapi jujur (delayed accuracy), memutar ulang stream, dan menimbang alarm palsu terhadap biaya sampai terdeteksi.
- **Investigasi kegagalan**: aku membaca bukti, mengonfirmasi satu penyebab, membandingkan perbaikan dari biayanya, dan menyebut apa yang kuubah.

### Data nyata
Lab ini tidak punya tabel nyata dan tidak ada tombol untuk beralih ke sana: setiap kasus bersifat sintetis, dan kegagalannya sengaja ditanam. Tanyakan pada sistem nyata mana pun: siapa yang akan dihadapi model yang belum pernah dilihatnya, monitor mana yang berbunyi lebih dulu, dan apa yang akan kamu periksa sebelum mempercayai alert drift?
