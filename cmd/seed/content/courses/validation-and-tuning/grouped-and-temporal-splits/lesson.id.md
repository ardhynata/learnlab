---
slug: grouped-and-temporal-splits
title: Split berkelompok dan split temporal
---
::: intro
- Kenali data yang barisnya tidak saling independen: beberapa catatan milik satu orang, perangkat, atau rumah sakit, atau baris yang tersusun menurut waktu.
- Pilih grouped split (split berkelompok) atau temporal split (split temporal, dengan rolling origin) agar baris uji sama barunya bagi model dengan baris yang kelak ia temui.
- Sebutkan dua jenis leakage, lewat identitas dan lewat masa depan, lalu tentukan split mana yang sesuai dengan cara model akan dipakai.

Sebelum mulai: baca "Cross-validation and stratification", "Train, validation and test", dan "Pipelines and leakage". Yang pertama memberimu fold, yang kedua tiga set data, dan yang ketiga gagasan bahwa baris uji harus tetap tidak terlihat. Pelajaran ini bertanya apa arti "tidak terlihat" ketika baris-barisnya saling berkaitan.
:::

## Baris yang saling berkaitan
*Mengapa split acak dapat membuat model tampak lebih baik daripada kenyataannya?*

Di Level 1 kamu mengacak baris lalu memotongnya. Cara itu berhasil bila setiap baris adalah satu pengambilan data yang terpisah, seperti pada tabel penguin, di mana setiap baris adalah burung yang berbeda. Cara itu gagal bila baris-barisnya saling berkaitan.

Satu jenis kaitan adalah **entitas**: seseorang, perangkat, atau rumah sakit yang memiliki beberapa baris. Pasien dengan lima kunjungan ke klinik punya lima baris. Jenis kaitan lainnya adalah waktu: satu baris per hari atau per bulan, dan hari ini sangat mirip dengan kemarin.

Split acak memotong kaitan-kaitan itu begitu saja. Kunjungan seorang pasien jatuh ke training set sekaligus test set, sehingga setiap baris uji punya "kerabat dekat" di data latih. Model dapat memperoleh skor bagus dengan mengenali entitasnya, bukan dengan mempelajari polanya. Ini leakage seperti baris duplikat di "Pipelines and leakage", hanya lebih halus, dan fold cross-validation biasa memiliki kelemahan yang sama.

> Gagasan kunci: sebuah split disebut jujur bila baris uji sama barunya bagi model dengan baris yang akan ia temui dalam pemakaian nyata.

## Dua belas kunjungan, enam pasien
*Apa yang dilakukan model bila ia dapat mengenali orangnya?*

Ambil enam pasien dengan dua kunjungan masing-masing, sehingga ada 12 baris. Setiap baris berisi detak jantung istirahat dalam denyut per menit dan sebuah label: apakah pasien memiliki kondisi tersebut? Angka-angka ini rekaan, dan detak jantungnya sengaja dibuat tidak mengatakan apa pun tentang kondisi itu.

| Pasien | Kondisi | Kunjungan 1 | Kunjungan 2 |
| --- | --- | --- | --- |
| A | ya | 62 | 63 |
| B | tidak | 67 | 68 |
| C | tidak | 70 | 71 |
| D | ya | 75 | 76 |
| E | ya | 80 | 81 |
| F | tidak | 83 | 84 |

Modelnya adalah 1-nearest neighbor: salin label dari baris latih dengan detak jantung paling dekat. Menjawab "ya" terus-menerus, atau "tidak" terus-menerus, menghasilkan 6 benar dari 12.

## Split acak melawan grouped split
*Seberapa jauh selisih kedua skor itu?*

**Split acak.** Sisihkan satu kunjungan dan latih model pada 11 baris lainnya. Baris terdekat selalu kunjungan lain dari pasien yang sama, berjarak 1 denyut, dengan label yang benar. Skornya 12 dari 12, atau 100%.

**Grouped split.** Sisihkan kedua kunjungan satu pasien dan latih model pada sepuluh baris sisanya. Sekarang baris terdekat milik orang lain. Pasien A (62 dan 63) paling dekat dengan B di 67, dan B tidak memiliki kondisi itu, sehingga kedua baris A salah. Dari seluruh 12 baris, skornya 5 dari 12, atau 41,7%, lebih rendah daripada 6 dari 12 yang didapat dengan menebak buta.

Detak jantung itu adalah tanda pengenal orangnya, bukan gejala dari kondisinya. Split acak justru menguntungkan model yang hanya menghafal orangnya, padahal itu tidak berguna bagi pasien baru. Hanya grouped split yang menunjukkan keadaan sebenarnya.

[[figure:grouped-and-temporal-splits/random-vs-grouped|Enam pasien yang sama dipotong dengan dua cara. Pada split acak, kunjungan uji (padat) punya kunjungan lain dari pasien yang sama di data latih. Pada grouped split, tidak ada pasien yang berada di kedua sisi. Sel padat menunjukkan satu contoh potongan; setiap skor dihitung dari semua putaran.]]

## Potong menurut kelompok, bukan menurut baris
*Bagaimana menjaga baris-baris seorang pasien tetap bersama?*

**Grouped split** memotong daftar kelompok, bukan daftar baris. Pilih pasien mana yang masuk training dan mana yang masuk test, lalu semua baris mengikuti pasiennya. Dalam cross-validation, versinya adalah **grouped k-fold**: bagikan kelompok ke dalam k fold, lalu pada tiap putaran sisihkan satu fold berisi kelompok.

Ada tiga hal yang berubah dibandingkan dengan potongan acak.

- **Ukuran fold tidak merata.** Kelompok berbeda ukurannya, sehingga satu fold kelompok tidak persis seperlima dari seluruh baris.
- **Kelompok yang sedikit membuat skor berisik.** Dengan enam pasien, hanya ada enam pasien uji yang berbeda, sehingga satu pasien saja dapat menggeser skor cukup jauh. Laporkan sebaran skor antar fold, bukan hanya rata-ratanya.
- **Stratification hanya berlaku secara perkiraan.** Sebuah kelompok berpindah sebagai satu blok, sehingga kamu tidak dapat menyetel proporsi kelas dengan teliti. Periksa proporsinya setelah pemotongan.

> Awas: membuang kolom id pasien tidak memperbaiki split acak. Detak jantung itu sendiri sudah menjadi tanda pengenal orangnya. Kelompokkan baris menurut id, meskipun id itu kemudian tidak dipakai sebagai feature.

::: deeper Melaporkan skor berkelompok
Misalkan sebuah model diuji dengan menyisihkan satu rumah sakit pada tiap putaran. Dua rumah sakit memiliki 300 dan 100 baris, dengan accuracy hasil uji 80% dan 60%. Baris yang benar masing-masing 240 dan 60, sehingga accuracy gabungannya 300 / 400 = 75%. Rata-rata biasa dari kedua skor adalah 70%. Tidak ada angka yang salah, tetapi rumah sakit baru adalah satu rumah sakit lagi, bukan setumpuk baris. Rumah sakit baru itu dapat menyerupai yang mana saja, sehingga laporkan skor tiap rumah sakit yang disisihkan di samping ringkasannya.
:::

## Ketika waktu berperan
*Mengapa mengacak merupakan kesalahan untuk baris yang datang berurutan?*

Baris yang tersusun menurut waktu memiliki jenis kaitan kedua: tetangga dalam waktu saling mirip. Split acak menaruh bulan uji di antara bulan-bulan latih. Model dapat bersandar pada bulan sebelumnya dan bulan sesudahnya, padahal bulan sesudahnya adalah masa depan.

Pada hari kamu memakai model, masa depan justru hal yang tidak kamu miliki. Karena itu uji yang jujur adalah **temporal split**: latih pada baris yang lebih awal, uji pada baris yang lebih akhir.

> Contoh hitungan: penjualan bulanan selama 12 bulan adalah 100, 108, 115, 121, 130, 138, 147, 153, 162, 170, 179, dan 188 unit. Model memprediksi sebuah bulan sebagai rata-rata dua bulan latih terdekat. Bulan 2, misalnya, mendapat (100 + 115) / 2 = 107,5.

| Split | Bulan uji | Prediksi | Galat | Galat rata-rata |
| --- | --- | --- | --- | --- |
| Acak | 2, 5, 8, 11 | 107,5; 129,5; 154,5; 179 | 0,5; 0,5; 1,5; 0 | 0,625 |
| Temporal (latih pada bulan 1 sampai 9) | 10, 11, 12 | 157,5 untuk ketiganya | 12,5; 21,5; 30,5 | 21,5 |

Pada temporal split, dua bulan latih terdekat adalah bulan 9 dan 8 untuk setiap bulan uji, dan (162 + 153) / 2 = 157,5.

[[figure:grouped-and-temporal-splits/future-leak|Model yang sama pada data penjualan yang sama. Kiri: bulan uji acak berada di antara bulan latih, sehingga model mengisi celah. Kanan: bulan sesudah bulan latih terakhir adalah ramalan, dan galatnya membesar seiring jarak.]]

Split acak mengukur seberapa baik model mengisi celah. Temporal split mengukur seberapa baik model meramal, dan itulah tugasnya.

## Rolling origin
*Bagaimana menguji sebuah ramalan beberapa kali tanpa mengintip?*

Satu temporal split hanya menghasilkan satu skor dari satu rentang waktu, dan rentang itu bisa saja tidak biasa. **Rolling origin** mengulang pengujian. **Origin** adalah saat data latih berakhir. Latih pada semua data sampai origin, uji pada data sesudahnya, lalu geser origin ke depan dan ulangi.

Pakai data penjualan yang sama. Kali ini model meramal bulan berikutnya sebagai rata-rata dua bulan terakhir. Origin bergeser dari bulan 6 sampai bulan 11.

| Bulan latih | Ramalan | Nilai sebenarnya | Galat |
| --- | --- | --- | --- |
| 1 sampai 6 | 134 | 147 | 13 |
| 1 sampai 7 | 142,5 | 153 | 10,5 |
| 1 sampai 8 | 150 | 162 | 12 |
| 1 sampai 9 | 157,5 | 170 | 12,5 |
| 1 sampai 10 | 166 | 179 | 13 |
| 1 sampai 11 | 174,5 | 188 | 13,5 |

Galat rata-ratanya 74,5 / 6 = 12,42 unit, sekitar 20 kali galat split acak yang hanya 0,625. Keenam galat itu seragam, sehingga skornya stabil. Semuanya juga positif, karena model tertinggal dari tren yang naik, dan split acak, yang mengisi celah dari kedua sisi, menyembunyikan ketertinggalan itu.

[[figure:grouped-and-temporal-splits/rolling-origin|Rolling origin: enam putaran. Tiap putaran melatih pada semua bulan sebelumnya (terang), menguji pada bulan berikutnya (padat), dan tidak pernah melihat bulan-bulan sesudahnya (kosong).]]

::: deeper Gap, window, dan horizon
Tabel di atas menyimpan seluruh masa lalu (expanding window). Sliding window hanya menyimpan bulan-bulan terbaru, yang sesuai untuk data yang bergeser: pola datanya berubah seiring waktu, sehingga bulan-bulan lama tidak lagi khas. **Horizon** adalah seberapa jauh ke depan kamu harus memprediksi: di sini satu bulan, sedangkan pada temporal split di atas sampai tiga bulan, itulah sebabnya galatnya lebih besar. Ujilah pada horizon yang kamu butuhkan.

Bila label sebuah baris baru diketahui belakangan, seperti "berhenti berlangganan dalam 30 hari", maka label pada 30 hari terakhir baris latih bergantung pada periode uji. Sisakan **gap** sepanjang itu antara akhir data latih dan awal data uji.
:::

## Sesuaikan split dengan pemakaiannya
*Split mana yang sesuai dengan cara model akan dipakai?*

Mulailah dari satu pertanyaan: apa yang akan baru ketika model dipakai? Test set harus baru dengan cara yang sama, dan tidak dengan cara lain.

- Pasien baru dari rumah sakit yang sama: kelompokkan menurut pasien.
- Rumah sakit yang belum pernah dilihat model: kelompokkan menurut rumah sakit. Split per pasien akan meninggalkan kekhasan tiap rumah sakit di data latih dan membuat skor tampak lebih baik.
- Baris bulan depan: split menurut waktu dan latih pada masa lalu.
- Pasien baru tahun depan: keduanya, dengan tanggal yang lebih akhir di test set dan tanpa pasien yang berada di kedua sisi.
- Baris yang memang kasus independen, seperti penguin: split acak sudah memadai.

[[figure:grouped-and-temporal-splits/match-the-use|Empat cara model dipakai, dan split yang membuat uji sama barunya dengan masa depan yang sebenarnya.]]

> Awas: split yang lebih ketat menurunkan skor. Itu tidak berarti kamu membuat model menjadi lebih buruk. Kamu membuat pengukurannya jujur. Semua yang sudah kamu pelajari tentang pipeline tetap berlaku: fit preprocessing, pemilihan feature, dan tuning hanya pada bagian latih di setiap putaran.

## Sebelum lab
*Apa yang akan kamu coba selanjutnya?*

Pelajaran berikutnya membahas grid search dan random search, yang memilih setelan berdasarkan skor validasi. Pakai split yang kamu pilih di sini untuk pencarian itu juga, karena tuning loop pada split yang bocor akan memilih setelan yang pandai mengenali pasien, bukan yang pandai memprediksi.

Setelah itu datang Validation lab, pelajaran terakhir kursus ini. Di sana kamu membandingkan split acak dengan grouped split pada dataset yang memiliki beberapa catatan per orang. Sebelum membukanya, tuliskan tebakanmu: split mana yang akan memberi skor lebih tinggi, dan selisihnya berapa? Kamu sudah melihat jawabannya pada 12 baris, 100% melawan 41,7%. Lab akan menunjukkan apakah hasil itu bertahan pada data yang lebih banyak, dan seberapa jauh ia bergeser dari satu pengacakan ke pengacakan berikutnya.

::: remember
- Baris tidak independen bila satu entitas memiliki beberapa baris atau bila baris datang menurut urutan waktu. Split acak lalu bocor lewat identitas atau lewat masa depan.
- Split menurut kelompok bila model harus menangani kelompok baru, dan menurut waktu, dengan rolling origin serta gap bila label datang terlambat, bila model harus memprediksi baris yang lebih akhir.
- Tanyakan apa yang akan baru dalam pemakaian nyata, lalu potong data agar baris uji baru persis dengan cara itu.
:::
