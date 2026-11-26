---
slug: sampling-variability-and-bootstrap
title: Variabilitas sampling dan bootstrap
---
::: intro
- Jelaskan mengapa skor yang diukur pada satu test set hanyalah satu hasil undian, dan mengapa test set yang kecil membuat accuracy naik-turun.
- Hitung standard error dan confidence interval 95% untuk sebuah accuracy, lalu sebutkan apa yang diklaim dan tidak diklaim oleh interval itu.
- Jalankan bootstrap dengan tangan pada sepuluh hasil uji, dan kenali kasus-kasus ketika bootstrap menyesatkan.

Sebelum mulai: baca "Train, validation and test" dan "Center and spread".
:::

## Satu skor uji adalah satu undian
*Mengapa model yang sama bisa mendapat 85% pada satu test set tetapi 75% pada test set lain?*

Pelajaran sebelumnya bertanya bagaimana probabilitas harus berubah ketika kamu mengetahui hal baru. Pelajaran ini bertanya seberapa jauh angka hasil pengukuranmu dapat dipercaya.

"Train, validation and test" meminta kamu memakai test set satu kali saja dan melaporkan skornya. Tetapi test set hanyalah sebuah **sampel**: segelintir kasus yang diambil dari semua kasus yang kelak dihadapi model. Skornya adalah satu **undian**, dan sampel lain akan memberi skor lain. Naik-turunnya skor dari sampel ke sampel ini disebut **variabilitas sampling** (*sampling variability*). Persentase semua kasus yang dijawab benar oleh model adalah **accuracy sebenarnya** (*true accuracy*), dan kamu tidak pernah melihatnya secara langsung.

Kita buat contoh agar jawabannya diketahui: model dengan accuracy sebenarnya 85%, diuji pada 20 kasus baru. Hasil yang paling mungkin adalah 17 benar, tetapi hanya 24% test set yang memberi hasil persis itu. Sekitar 17% memberi skor 75% atau lebih rendah, dan 18% memberi 95% atau lebih tinggi. Gambar berikut menunjukkan semua skor yang mungkin.

[[figure:sampling-variability-and-bootstrap/test-set-wobble|Seberapa sering tiap skor muncul pada banyak test set, untuk model dengan accuracy sebenarnya 85%. Panel atas memakai 20 kasus per test set, panel bawah 100 kasus.]]

## Standard error
*Seberapa besar naik-turunnya, dan bagaimana mengecilkannya?*

**Standard error** (SE) adalah simpangan baku sebuah metrik pada sampel yang diulang-ulang: seberapa jauh nilai hasil pengukuran biasanya dari nilai sebenarnya. Simpangan baku sudah kamu kenal di "Center and spread".

Untuk accuracy yang diukur pada n kasus independen, `SE = sqrt(p × (1 - p) / n)`, dengan p adalah accuracy-nya.

> Contoh hitungan: dengan p = 0,85 dan n = 20, p × (1 - p) = 0,85 × 0,15 = 0,1275. Bagi 20 untuk mendapatkan 0,006375, dan akar kuadratnya adalah 0,0798. Test set yang biasa meleset dari nilai sebenarnya sekitar 8 poin.

| Jumlah kasus uji (n) | Standard error |
| --- | --- |
| 20 | 8,0 poin |
| 100 | 3,6 poin |
| 400 | 1,8 poin |
| 1.600 | 0,9 poin |

Setiap baris memiliki kasus empat kali lebih banyak daripada baris di atasnya, dan naik-turunnya separuh, karena n berada di bawah akar kuadrat.

> Gagasan kunci: untuk membuat naik-turunnya menjadi separuh, kamu butuh kasus uji empat kali lebih banyak. Dengan 20 kasus, satu kesalahan saja menggeser skor 5 poin, padahal itu lebih dari separuh standard error sebesar 8 poin.

## Confidence interval
*Rentang accuracy sebenarnya yang mana yang cocok dengan skor yang kamu ukur?*

Sekitar 95% undian jatuh dalam 1,96 standard error dari nilai sebenarnya. Maka **confidence interval 95%** untuk sebuah accuracy adalah skor ditambah dan dikurangi 1,96 SE. Dalam praktik kamu tidak tahu p, sehingga skor hasil ukurmu dimasukkan ke rumus.

> Contoh hitungan: sebuah model menjawab benar 85 dari 100 kasus uji. SE = sqrt(0,85 × 0,15 / 100) = 0,0357. Lalu 1,96 × 0,0357 = 0,070, sehingga intervalnya 85% ± 7 poin: 78% sampai 92%.

Dengan 400 kasus dan accuracy 85% yang sama, intervalnya menyempit menjadi sekitar 81,5% sampai 88,5%.

Baca interval itu sebagai rentang accuracy sebenarnya yang konsisten dengan apa yang kamu lihat. Dua model dengan skor 85% dan 87% pada masing-masing 100 kasus tidak dapat dibedakan: selisih 2 poin jauh lebih kecil daripada naik-turun 7 poin pada tiap skor.

> Awas: "95%" menggambarkan metodenya, bukan interval yang satu ini. Jika seluruh eksperimen diulang berkali-kali, sekitar 95 dari 100 interval yang dibuat dengan cara ini akan memuat accuracy sebenarnya. Accuracy sebenarnya adalah satu angka yang tetap, sehingga sebuah interval hanya punya dua kemungkinan: memuatnya atau tidak.

## Bootstrap
*Bagaimana mendapatkan interval ketika tidak ada rumusnya?*

Rumus accuracy hanyalah kasus khusus. Untuk F1, recall pada kelas langka, AUC, atau median galat, tidak ada rumus sederhana. **Bootstrap** menghasilkan interval untuk metrik apa pun yang dapat kamu hitung dari daftar kasus.

Idenya: kamu tidak dapat mengambil sampel baru dari dunia, tetapi test set-mu adalah salinan kecil dari dunia itu. Maka ambil sampel baru dari test set. Ada empat langkah:

1. **Resample.** Ambil n kasus dari n kasus uji-mu **dengan pengembalian** (*with replacement*): setelah setiap pengambilan, kasusnya dikembalikan, sehingga dapat terambil dua kali atau tidak sama sekali.
2. **Hitung ulang** metriknya pada resample itu.
3. **Ulangi** berkali-kali, sebanyak B resample. Pakai 1.000 atau lebih.
4. **Urutkan** B nilai itu. Untuk interval 95%, ambil persentil ke-2,5 dan ke-97,5 (nilai yang di bawahnya ada 2,5% hasil, dan di atasnya 2,5%). Inilah **percentile interval**.

[[figure:sampling-variability-and-bootstrap/resample|Satu resample dari sepuluh kasus uji. Kasus 4 dan 8 terambil dua kali, sedangkan kasus 1 dan 10 tidak terambil.]]

::: deeper Mengapa sebagian kasus tidak terambil
Setiap pengambilan melewatkan suatu kasus dengan probabilitas 1 - 1/n. Setelah n kali mengambil, peluang sebuah kasus tidak pernah muncul adalah (1 - 1/n)^n. Untuk n = 10 nilainya 0,9^10 = 0,349, sehingga sebuah resample memuat sekitar 65% kasus yang berbeda. Untuk n besar nilainya mendekati 36,8%, sehingga sekitar 63% kasus ikut terambil. Pengulangan dan kasus yang terlewat inilah yang membuat resample berbeda satu sama lain.
:::

## Bootstrap dengan tangan
*Dapatkah kamu menjalankannya dengan sepuluh hasil uji dan sebatang pensil?*

Sebuah model diuji pada 10 kasus bernomor 1 sampai 10. Model menjawab benar 8 kasus dan salah pada kasus 4 dan 9, sehingga accuracy-nya 80%.

> Contoh hitungan: **Satu resample.** Generator bilangan acak dengan seed tertentu mengambil nomor kasus 8, 4, 3, 6, 9, 7, 5, 4, 8, 2. Kasus 4 muncul dua kali dan kasus 9 satu kali, sehingga resample itu berisi 3 kesalahan dan 7 jawaban benar: accuracy 70%.

Ulangi 20 kali. Hasilnya, dalam jumlah jawaban benar dari 10, diurutkan ke dalam tabel:

| Benar dari 10 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Resample | 1 | 0 | 2 | 5 | 5 | 6 | 1 |

Buang 5% dari tiap ujung: dengan 20 hasil, itu berarti satu hasil terendah dan satu hasil tertinggi. Sisanya berkisar dari 6 sampai 9 benar, yaitu interval 90% sebesar 60% sampai 90%.

[[figure:sampling-variability-and-bootstrap/bootstrap-results|Ke-20 accuracy resample sebagai tumpukan titik. Hasil terendah dan tertinggi yang dibuang ditandai silang, dan kurung menunjukkan percentile interval 90%.]]

Dua puluh resample jauh terlalu sedikit untuk pekerjaan sungguhan. Dengan 10.000 resample, percentile interval 95% adalah 50% sampai 100%. Rumus accuracy memberi 55% sampai 105%, yang mustahil. Sepuluh kasus tidak cukup untuk menentukan accuracy, dan bootstrap menyatakan hal itu dengan jelas.

## Ketika bootstrap gagal
*Kapan interval hasil resample menyesatkanmu?*

- **Sampel yang sangat kecil.** Bootstrap hanya mengacak ulang kasus yang kamu punya dan tidak dapat menciptakan kasus yang belum pernah kamu lihat. Jika sebuah model menjawab benar 5 dari 5 kasus, setiap resample serba benar: intervalnya 100% sampai 100%, seolah tidak ada keraguan sama sekali. Anggap hasilnya kasar jika kasusnya hanya beberapa lusin atau kurang, terutama ketika sebuah kelas langka hanya punya segelintir kasus.
- **Record yang saling bergantung.** Bootstrap mengasumsikan tiap kasus adalah undian yang independen. Misalkan 100 baris uji berasal dari 20 orang, masing-masing 5 baris, dan model benar atau salah pada kelima baris seseorang sekaligus. Maka kamu punya 20 kasus independen, bukan 100. SE yang jujur adalah sqrt(0,85 × 0,15 / 20) = 0,080, tetapi me-resample baris menghasilkan sekitar 0,036, yaitu interval yang 2,2 kali terlalu sempit. Sebaiknya yang di-resample adalah orangnya secara utuh, bukan barisnya. Record yang berdekatan waktunya saling bergantung dengan cara yang sama.
- **Test set yang tidak mirip masa depan.** Bootstrap hanya mengukur naik-turun akibat sampling. Ia tidak dapat melihat leakage, label yang salah, atau test set yang tidak menyerupai kasus yang akan kamu temui nanti.

> Awas: interval yang sempit berarti skornya stabil, bukan berarti skornya benar. Periksa dulu apakah kasus-kasusnya independen dan representatif.

## Melaporkan skor dengan jujur
*Apa yang harus mendampingi setiap metrik yang kamu laporkan?*

"85%" saja menyembunyikan seberapa besar skor itu dapat dipercaya. Di samping sebuah skor, sebutkan dari berapa kasus uji skor itu berasal dan sertakan sebuah interval. Ajukan empat pertanyaan pada metrik yang dilaporkan:

- Berasal dari berapa kasus, dan berapa kasus yang ada di kelas paling langka?
- Apakah ada interval, dan bagaimana cara menghitungnya?
- Apakah kasus-kasusnya independen, atau baris-barisnya dikelompokkan menurut orang, tempat, atau waktu?
- Apakah test set menyerupai kasus yang akan benar-benar dihadapi model?

Pelajaran berikutnya adalah lab bootstrap. Tugasnya sama dengan pelajaran ini: mengambil sampel berulang kali dari populasi yang sama dan melihat seberapa besar metrik yang dilaporkan bervariasi. Kini kamu sudah punya istilahnya: variabilitas sampling, standard error, confidence interval, dan percentile interval.

::: remember
- Metrik yang diukur pada test set adalah satu undian. Sampel lain memberi skor lain, dan naik-turunnya mengecil hanya sebanding akar kuadrat ukuran test: kasus empat kali lebih banyak membuatnya menjadi separuh.
- Confidence interval, dari rumus maupun dari bootstrap (resample dengan pengembalian, hitung ulang, ambil persentil), menunjukkan nilai sebenarnya mana yang sesuai dengan skor. Angka 95% itu milik metodenya.
- Bootstrap gagal pada sampel yang sangat kecil dan pada record yang saling bergantung, dan ia tidak dapat memperbaiki test set yang tidak menyerupai masa depan.
:::
