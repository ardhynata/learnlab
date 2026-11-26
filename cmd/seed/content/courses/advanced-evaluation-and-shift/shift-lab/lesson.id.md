---
slug: shift-lab
title: Shift lab
---
::: intro
- Terapkan satu jenis shift pada satu waktu di Shift lab, lalu ukur setup validasi mana yang sudah memperkirakan turunnya akurasi.
- Jelaskan dengan angka dari lab mengapa k-fold acak melewatkan covariate shift dan concept shift, mengapa akurasi dapat menyembunyikan label shift, dan apa yang berubah ketika drift sudah ada di data training.
- Ulangi uji itu pada penguin yang nyata dengan satu pulau yang ditahan, lalu bedakan setup yang benar-benar memperingatkan dari setup yang hanya kebetulan tepat.

Sebelum mulai: baca "Nested cross-validation" dan "Covariate and concept shift" di kursus ini, serta "Grouped and temporal splits" di "Validation and hyperparameter tuning". Ketiganya memberimu lima setup dan sebuah tabel tentang setup mana yang seharusnya melihat shift mana. Lab ini menguji tabel itu.
:::

## Apa yang ditanyakan lab
*Skor validasi mana yang akan memperingatkanmu sebelum datanya bergeser?*

"Covariate and concept shift" ditutup dengan sebuah janji: split acak tidak mengantisipasi shift apa pun, sedangkan tes berkelompok, temporal, dan out-of-distribution mengantisipasi sebagian. Di sini kamu memeriksanya dengan angka.

Shift lab menggambar dua kelas pada dua fitur. **Titik penuh adalah train set dan lingkaran adalah test set.** Sebuah model, k-NN dengan k = 5 pada awalnya, dilatih hanya pada baris train. Lalu kamu memilih SATU jenis shift, dan lingkaran test bergeser menjauh dari titik train.

Lab kemudian menampilkan dua hal berdampingan. Yang pertama adalah apa yang *diperkirakan* tiap dari lima setup validasi dari baris training saja. Yang kedua adalah akurasi yang *sebenarnya* terukur pada lingkaran yang sudah bergeser. Selisihnya disebut **gap**: perkiraan dikurangi akurasi sebenarnya. Gap positif berarti setup itu terlalu optimis. Sebuah setup dianggap *mengantisipasi* penurunan bila perkiraannya jatuh dalam 5 poin dari akurasi sebenarnya.

> Gagasan kunci: skor validasi adalah prediksi tentang data di masa depan. Lab ini membiarkanmu melihat masa depan itu, sehingga kamu dapat menilai prediksinya.

## Lima perkiraan
*Apa yang dibaca tiap setup, dan apa yang dapat dilihatnya?*

[[figure:shift-lab/five-setups|Satu putaran tiap setup pada sepuluh baris training. Shifted holdout adalah satu-satunya yang melihat input test, dan tak satu pun pernah melihat label test.]]

**k-fold acak** menyisihkan baris yang diambil dari mana saja di pool. **k-fold berkelompok** tidak pernah memecah sebuah kelompok, dan di lab setiap baris punya kelompok, misalnya sebuah situs. **Temporal split** melatih pada baris yang lebih awal dan menilai blok berikutnya, sehingga blok pertama hanya menjadi data training.

**Holdout bergeser** adalah tes out-of-distribution milik lab. Ia menyisihkan 30% baris training yang paling dekat dengan input test, lalu melatih pada sisanya. Ia membaca *input* test, yang sudah kamu miliki sebelum label mana pun tiba, dan tidak pernah membaca label test. **Nested CV** membiarkan sebuah search di dalam memilih k, lalu fold luarnya menilai resep itu. Karena resepnya memilih k sendiri, lab menilainya terhadap akurasi model hasil tuning, yang ditandai **model hasil tuning** pada chart.

Setiap batang punya garis kumis untuk sebarannya. Untuk keempat setup berbasis fold (acak, berkelompok, temporal, dan nested, yang fold luarnya dihitung), itu adalah sebaran skor antar fold. Untuk holdout bergeser, itu adalah galat baku satu akurasi pada sekitar 60 baris, kira-kira 4 poin.

## Kontrol: tanpa shift
*Seperti apa sebuah setup ketika memang tidak ada yang perlu diantisipasi?*

Atur **Jenis shift** ke **Tidak ada**. Sampel pertama memberi akurasi sebenarnya 85%. k-fold acak memperkirakan 86%, berkelompok 85%, temporal 86%, dan nested 87%. Keempatnya hijau. Holdout bergeser menyebut 90%, sekitar 6 poin terlalu tinggi, padahal tidak ada yang bergeser. (Angka pastinya 90,0% terhadap 84,5%, ditampilkan dibulatkan, sehingga gap-nya 5,5 dan lab menandainya ✗.)

Selisih itu hanyalah noise. Holdout bergeser adalah satu split dari sekitar 60 baris, sehingga dengan kumis 4 poin, meleset 5 atau 6 poin sesekali memang terjadi. Pada sepuluh sampel pertama, k-fold acak berada dalam 5 poin sepuluh kali, berkelompok sepuluh, temporal delapan, holdout bergeser tujuh, dan nested tujuh.

Detektor sepakat dengan batang yang hijau. PSI kedua fitur adalah 0,04 dan 0,03, dan AUC domain classifier 0,49, yang berarti menebak.

> Awas: satu kali meleset belum membuktikan apa-apa. Bandingkan setup itu dengan run tanpa shift sebelum menyalahkannya, dan tekan **Sampel baru** untuk melihat apakah melesetnya berulang.

## Covariate shift
*Mengapa k-fold acak terus menyebut angka yang sama padahal skor sebenarnya turun?*

Atur **Jenis shift** ke **Covariate shift**. Lingkaran test bergeser ke kanan sejauh 3 satuan dikali **Tingkat pergeseran**, ke wilayah yang nyaris tidak dicakup titik train. Aturan pemberi label tidak diubah.

Perkiraan k-fold acak tidak bergerak ketika kamu menaikkan **Tingkat pergeseran**, karena ia hanya membaca baris training, dan baris itu sama sekali tidak bergantung pada shift. Dirata-ratakan pada sepuluh sampel pertama, akurasi sebenarnya turun seiring test set menjauh.

| Tingkat pergeseran | Akurasi sebenarnya | k-fold acak | Gap |
| --- | --- | --- | --- |
| 0,2 | 86% | 88% | 2 |
| 0,4 | 83% | 88% | 5 |
| 0,6 | 76% | 88% | 12 |
| 0,8 | 67% | 88% | 21 |
| 1,0 | 58% | 88% | 30 |

> Contoh hitungan: pada sampel pertama dengan Tingkat pergeseran 0,8, akurasi sebenarnya adalah 80% dan k-fold acak menyebut 86%. Gap-nya 86 - 80 = 6 poin, sehingga ia ✗. Sampel itu tergolong ringan. Pada sampel 2 sampai 5, akurasi sebenarnya adalah 64%, 61%, 69%, dan 61%, dan tak ada setup yang berada dalam 5 poin.

## Apa yang ditunjukkan input dan model
*Dapatkah covariate shift terlihat sebelum terjadi, dan apakah model mengubah kerusakannya?*

Inputnya sendiri membocorkan shift ini. PSI Fitur 1 adalah 4,87 dan AUC domain classifier 0,95, sementara Fitur 2 tetap di 0,03. Model juga berpengaruh: ganti **Model** ke **Regresi logistik** dan sampel pertama turun ke 57%, karena batas yang lurus diperpanjang ke wilayah yang tidak pernah dilihatnya.

## Label shift
*Dapatkah proporsi kelas berubah tanpa membuat akurasi turun?*

Atur **Jenis shift** ke **Label shift**. Test set kini memuat lebih sedikit baris kelas 1: pada Tingkat pergeseran 0,8, porsinya turun dari 48% ke 22% pada sampel pertama. Tampilan tiap kelas tetap seperti semula.

Akurasinya nyaris tidak bergerak. Pada sampel pertama ia terbaca 92%, sementara k-fold acak memperkirakan 86%, sehingga perkiraan itu 6 poin terlalu *pesimis*. Jangan terlalu membacanya: test set itu hanya memuat 44 baris kelas 1, dan kedua kelas sama-sama memperoleh sekitar 92% di sana, sehingga tak satu kelas pun menjelaskan angka 92% itu. Itu hanya undian yang beruntung. Rata-rata sepuluh sampel adalah panduan yang lebih baik. Akurasi sebenarnya adalah 88,5% dan k-fold acak menyebut 87,9%, dekat dengan 88,1% yang diberikan lab tanpa shift sama sekali. Porsi kelas 1 turun lebih dari separuh, namun akurasinya tetap datar. Acak, berkelompok, dan temporal berada dalam 5 poin pada tujuh, delapan, dan tujuh dari sepuluh sampel.

[[figure:shift-lab/one-estimate|Perkiraan k-fold acak dan akurasi sebenarnya pada Tingkat pergeseran 0,8, sebagai rata-rata sepuluh sampel. Perkiraan 88% yang sama bertemu empat hasil yang berbeda.]]

Karena itu akurasi saja tidak menunjukkan apa-apa di sini, sama seperti tes skrining pada "Covariate and concept shift", ketika presisi runtuh sementara akurasi bertahan di sekitar 94%. Satu-satunya detektor yang melihatnya adalah baris porsi kelas, **Porsi kelas 1, train ke test**, dan ia butuh label test. Holdout bergeser menjadi yang menyimpang: rata-rata ia 7 poin terlalu pesimis dan hanya berada dalam 5 poin pada empat dari sepuluh sampel.

## Concept shift
*Mengapa tak ada setup yang memperingatkanmu?*

Atur **Jenis shift** ke **Concept shift**. Input test mempertahankan distribusinya, tetapi batas yang sebenarnya berputar 90 derajat dikali **Tingkat pergeseran**: itulah garis putus-putus pada plot. Pada 0,8 akurasi sebenarnya adalah 55%, k-fold acak menyebut 86%, dan tak ada setup yang berada dalam 5 poin. Detektor tidak melihat apa-apa: PSI 0,04 dan 0,03, AUC 0,49, keseimbangan kelas 48% ke 52%. Input yang stabil dengan skor yang jatuh adalah ciri khas shift ini.

Setiap setup mempelajari baris training yang mengikuti aturan lama, sehingga tak satu pun dapat tahu bahwa aturannya berubah.

## Drift di data training
*Apa yang membuat satu setup mulai memperingatkan?*

Sekarang naikkan **Drift yang sudah ada di data training**. Baris training yang lebih baru lalu sudah mengikuti sebagian aturan baru, dan itulah yang dibaca temporal split.

[[figure:shift-lab/drift-curves|Concept shift pada Tingkat pergeseran 0,8 saat drift bertambah, rata-rata sepuluh sampel. Drift membuat data training tidak sepakat dengan dirinya sendiri, sehingga perkiraan turun dan akurasi sebenarnya naik.]]

Pada Drift 1,0, sampel pertama menempatkan kelima setup dalam 5 poin, tetapi hanya karena data training sudah ikut bergeser. Pada sampel kelima, hanya temporal split yang berada dalam 5 poin, yaitu 77% terhadap akurasi sebenarnya 75%. Dalam sepuluh sampel, ia berada dalam 5 poin sebanyak 8 kali dan k-fold acak sebanyak 5 kali.

> Gagasan kunci: sebuah setup validasi hanya dapat memperingatkan perubahan yang sudah ada di suatu tempat dalam data yang dipelajarinya.

## Satu perkiraan, empat hasil
*Seperti apa tebakan sebelumnya setelah kamu punya angkanya?*

Tanpa shift, perkiraan k-fold acak itu tepat. Perkiraan 88% yang sama bertemu akurasi sebenarnya 67% pada covariate shift, 89% pada label shift, dan 59% pada concept shift. Perkiraan itu tidak pernah berubah, karena ia tidak pernah melihat test set.

Dua tebakan dari "Covariate and concept shift" kini dapat dijawab. Untuk covariate shift, split acak, berkelompok, dan temporal semuanya meleset, rata-rata sekitar 20 poin, dan holdout bergeser paling dekat dengan 14. Untuk concept shift, tak satu pun memperingatkan tanpa drift. Skor nested pun tidak akan memperingatkan: ia menghilangkan sanjungan dari tuning, tetapi tidak dapat melihat test set.

::: deeper Cara lab membangun tiap shift
Covariate shift menggeser fitur pertama ke kanan sebesar 3 kali Tingkat pergeseran. Label shift menurunkan porsi kelas 1 dari 0,5 menjadi 0,5 dikurangi 0,4 kali Tingkat pergeseran, yaitu 0,18 pada Tingkat pergeseran 0,8. Concept shift memutar batas bergelombang di sekitar titik asal sebesar 90 derajat kali Tingkat pergeseran, yaitu 72 derajat pada 0,8. Drift membiarkan baris training bergerak mulus mengikuti urutan waktunya, sehingga baris terakhir sudah bergerak sejauh Drift kali Tingkat pergeseran.
:::

## Sebuah pulau yang nyata
*Apakah pelajarannya tetap berlaku ketika shift-nya adalah sebuah tempat di peta?*

Atur **Data** ke **Penguin (data nyata)**. Model memprediksi jenis kelamin dari panjang paruh dan massa tubuh, dan **Pulau yang ditahan** menjadi test set. Biscoe memuat 44 Adelie dan 119 Gentoo, sedangkan pulau-pulau training tidak punya Gentoo sama sekali, sehingga inputnya sudah berbeda sebelum label mana pun dipakai. Gentoo betina rata-rata 4.680 g, lebih berat daripada Adelie jantan yang 4.043 g.

Dengan Biscoe ditahan dan k-NN, akurasi sebenarnya adalah 60%. Kelima perkiraannya adalah 84%, 80%, 82%, 86%, dan 84%, dan tak satu pun berada dalam 5 poin. Detektor sepakat: PSI 0,53 dan 1,60, AUC 0,87, sedangkan porsi penguin jantan nyaris tidak bergerak, 50% ke 51%.

## Apakah selisih yang kecil adalah peringatan?
*Ketika sebuah setup jatuh dekat dengan akurasi sebenarnya, apakah ia melihat shift-nya?*

[[figure:shift-lab/islands|Perkiraan k-fold acak dibandingkan akurasi sebenarnya pada tiap pulau yang ditahan, untuk kedua model. Selisih yang kecil belum tentu sebuah peringatan.]]

Dengan Dream ditahan dan **Regresi logistik**, k-fold berkelompok, temporal split, dan holdout bergeser jatuh dalam 5 poin dari akurasi sebenarnya 54%. Jangan memberi mereka pujian karena jeli: k-fold acak sendiri hanya 61%, karena modelnya lemah di mana-mana, sehingga tidak banyak yang dapat hilang.

::: remember
- k-fold acak tidak pernah membaca test set, sehingga perkiraannya diam di tempat sementara covariate shift atau concept shift menarik akurasi sebenarnya turun.
- Akurasi dapat turun (covariate, concept), tetap datar (label), maka perhatikan keseimbangan kelas, detektor input, dan hasilnya bersama-sama.
- Sebuah setup hanya mengantisipasi shift bila shift itu sudah ada di datanya: drift membantu temporal split, input test membantu holdout bergeser, dan model yang lemah dapat tampak benar karena kebetulan.
:::

@@lab

## Lab: dataset shift
Kamu mulai dengan titik buatan, Covariate shift pada Tingkat pergeseran 0,80, dan k-NN sebagai model. Kamu memilih sebuah shift, sebuah tingkat pergeseran, dan sebuah model, lalu membandingkan apa yang diperkirakan lima setup dengan akurasi yang sebenarnya terukur pada test set yang bergeser.

### Kontrol
- **Data** berganti antara **Data buatan** dan **Penguin (data nyata)**. Data nyata memprediksi jenis kelamin dari panjang paruh dan massa tubuh.
- **Pulau yang ditahan** (**Biscoe**, **Dream**, **Torgersen**) hanya muncul pada data nyata. Penguin dari pulau itu menjadi test set. **Jenis shift**, **Tingkat pergeseran**, **Drift yang sudah ada di data training**, dan **Tampilkan batas sebenarnya** disembunyikan di sana, dan **Sampel baru** dinonaktifkan.
- **Jenis shift** memilih **Tidak ada**, **Covariate shift**, **Label shift**, atau **Concept shift**. Hanya satu shift yang aktif pada satu waktu.
- **Tingkat pergeseran** (0 sampai 1, awalnya 0,80) menyatakan seberapa jauh test set bergeser. Ia dinonaktifkan ketika **Jenis shift** adalah **Tidak ada**.
- **Drift yang sudah ada di data training** (0 sampai 1, awalnya 0,0) membuat baris training yang lebih baru sudah memuat sebagian shift. Ia juga dinonaktifkan pada **Tidak ada**.
- **Model** memilih **k-NN (k = 5)** atau **Regresi logistik**.
- **Tampilkan wilayah prediksi model** mewarnai plot menurut kelas yang diprediksi model. **Tampilkan batas sebenarnya** menggambar garis bergelombang yang memberi label pada data. Keduanya awalnya menyala.
- **Sampel baru** menggambar sampel buatan yang baru, dan sekaligus mengubah pengacakan fold. **Reset** mengembalikan ke sampel pertama dan semua nilai awal. **Layar penuh** memperbesar lab.
- **Kuis Cepat** adalah tombol di bawah kartu pengaturan (tombol bulat di kanan bawah pada ponsel). Ia bertanya: "Setup validasi mana yang akan memperingatkanmu tentang concept shift?" Pilih jawaban sebelum kamu mengatur **Jenis shift** ke **Concept shift**.

### Membaca layar
- Plot menampilkan train set sebagai titik penuh dan test set sebagai lingkaran, satu warna untuk tiap kelas. Pada concept shift, legenda mencantumkan **Batas sebenarnya, train** (abu-abu) dan **Batas sebenarnya, test** (putus-putus).
- Status line berbunyi "Akurasi sebenarnya pada test set yang bergeser: 80%. Random k-fold memperkirakan 86%." lalu menyebut setup yang berada dalam 5 poin, atau berbunyi "Tidak ada setup yang dalam 5 poin." Baris di bawahnya menjelaskan apa yang dilakukan shift, dan kotak di kanan menghitung baris, misalnya "200 baris train, 200 baris test".
- Chart **Akurasi perkiraan dan akurasi sebenarnya** punya satu batang per setup: **k-fold acak**, **k-fold berkelompok**, **Temporal split**, **Holdout bergeser**, dan **Nested CV**. Tiap batang menampilkan perkiraannya, sebuah kumis sebaran, dan sebuah vonis, misalnya "✓ dalam 5 poin" atau "✗ terlalu optimis 6 poin". Label **Sebenarnya: 85%** (angkanya berubah) ada di atas chart, dan garis hitam menandai akurasi sebenarnya. Untuk **Nested CV**, garis itu milik model yang sudah di-tuning, ditandai **model hasil tuning**. Batang hijau berarti dalam 5 poin.
- Kartu **Detektor shift** punya kolom **Detektor**, **Nilai**, dan **Pembacaan**. Barisnya adalah **PSI, Fitur 1**, **PSI, Fitur 2** (**PSI, Panjang paruh** dan **PSI, Massa tubuh** pada penguin), **AUC domain classifier**, dan **Porsi kelas 1, train ke test** (**Porsi penguin jantan, train ke test** pada penguin).

### Eksperimen
Angkanya untuk sampel pertama. Tekan **Reset** sebelum tiap eksperimen, karena **Sampel baru** mengubah setiap angka.

1. **Kontrol.** Prediksikan: dengan **Jenis shift** diatur ke **Tidak ada**, adakah setup yang meleset jauh? Periksa: akurasi sebenarnya 85%, dan k-fold acak, k-fold berkelompok, temporal split, dan nested CV semuanya hijau pada 86%, 85%, 86%, dan 87%. Holdout bergeser menyebut 90%, sekitar 6 poin terlalu tinggi. Tekan **Sampel baru** beberapa kali dan hitung seberapa sering sebuah setup meleset. Apa yang dikatakan hal itu tentang satu kali meleset?
2. **Covariate shift.** Prediksikan: setup mana yang akan berada dalam 5 poin? Atur **Jenis shift** ke **Covariate shift**, dengan **Tingkat pergeseran** 0,80. Sampel pertama memberi 80% terhadap 86% milik k-fold acak, dan hanya k-fold berkelompok yang hijau. Tekan **Sampel baru** empat kali: akurasi sebenarnya 64%, 61%, 69%, dan 61%, dan tak ada setup yang hijau. Baca **PSI, Fitur 1** setiap kali (4,12 sampai 5,08). Terakhir, ganti **Model** ke **Regresi logistik** pada sampel pertama: akurasi sebenarnya turun ke 57%. Mengapa batas yang lurus lebih terpukul?
3. **Label shift.** Prediksikan: akankah akurasi turun? Atur **Jenis shift** ke **Label shift**. Akurasi terbaca 92% terhadap 86% milik k-fold acak, dan hanya nested CV yang hijau. **Porsi kelas 1, train ke test** terbaca 48% ke 22%, kedua nilai PSI tetap di bawah 0,1 (0,04 dan 0,09), dan AUC mendekati 0,5 (0,56). Tekan **Sampel baru** dua kali: 91% terhadap 90%, lalu 89% terhadap 87%, dengan empat setup hijau. Mengapa shift ini dapat luput dari akurasi?
4. **Concept shift.** Prediksikan: pada Kuis Cepat, pilih setup mana yang akan memperingatkanmu. Lalu atur **Jenis shift** ke **Concept shift**. Akurasi sebenarnya 55% terhadap 86%, dan tak ada setup yang hijau. Detektor membaca PSI 0,04 dan 0,03, AUC 0,49, dan 48% ke 52%. Matikan lalu nyalakan **Tampilkan batas sebenarnya** untuk melihat batas yang padat dan yang putus-putus. Detektor mana yang akan menangkap ini, dan apa yang dibutuhkannya?
5. **Drift.** Prediksikan: bila baris training yang lebih baru sudah memuat sebagian shift, siapa yang menyadarinya lebih dulu? Tetap di **Concept shift** dan naikkan **Drift yang sudah ada di data training** ke 1,0. Pada sampel pertama, akurasi sebenarnya 76% dan kelima setup hijau. Tekan **Sampel baru** empat kali: pada sampel kelima akurasi sebenarnya 75%, hanya temporal split yang hijau (77%), dan k-fold acak menyebut 84%. Kembalikan Drift ke 0,0 dan ia kembali ke 55% terhadap 87%. Mengapa drift membantu temporal split?
6. **Penguin dan split baru.** Prediksikan: bila satu pulau utuh ditahan, adakah setup yang memperingatkanmu? Atur **Data** ke **Penguin (data nyata)**, **Pulau yang ditahan** ke **Biscoe**. Akurasi sebenarnya 60%, perkiraannya 84%, 80%, 82%, 86%, dan 84%, dan tak satu pun hijau. **Sampel baru** dinonaktifkan di sini, karena itu uji split yang baru dengan mengganti **Pulau yang ditahan**: Dream memberi 54% terhadap 81% milik k-fold acak, dan Torgersen memberi 68% terhadap 85%. Lalu atur **Model** ke **Regresi logistik** pada Dream: k-fold berkelompok, temporal split, dan holdout bergeser hijau pada 57%, 57%, dan 52%, sementara k-fold acak menyebut 61%. Apakah itu peringatan, atau hanya model yang lemah?
