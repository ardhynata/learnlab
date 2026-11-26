---
slug: activations-initialization-and-optimizers
title: Aktivasi, inisialisasi, dan optimizer
---
::: intro
- Membandingkan sigmoid, tanh, dan ReLU dari output dan kemiringannya, lalu menjelaskan bagaimana tumpukan kemiringan kecil membuat gradient lenyap.
- Menjelaskan mengapa weight awal yang sama gagal, bagaimana skala Xavier dan He menentukan besarnya, dan apa yang dilakukan satu update SGD, momentum, dan Adam.
- Memilih di antara weight decay, dropout, dan early stopping, serta menyebut apa yang perlu diperiksa saat network tidak mau berlatih.

Sebelum mulai: baca "Neuron dan backpropagation". Aturan update-nya juga bersandar pada "Learning rate dan masalahnya", dan penaltinya pada "Bias, varians, dan shrinkage".
:::

## Fungsi aktivasi: lengkungan pada tiap neuron
*Apa tugas fungsi aktivasi, dan apa beda fungsi yang umum dipakai?*

Tiga pilihan menentukan apakah network dapat belajar sama sekali: fungsi aktivasi, weight awal, dan optimizer. Mulai dari yang pertama. Sebuah neuron menjumlahkan input-nya yang sudah dikali weight menjadi skor z, lalu meneruskan z ke **fungsi aktivasi** (*activation function*). Tanpa lengkungan itu, lapisan-lapisan melebur menjadi satu model linear, seperti yang ditunjukkan "Neuron dan backpropagation": dua lapisan dengan weight 2 dan 3 menghitung 3 × (2 × x) = 6 × x, yang juga dapat dikerjakan satu weight 6.

**Sigmoid** memampatkan skor apa pun ke rentang 0 sampai 1, seperti di "Probabilitas dan sigmoid". **tanh** memampatkannya ke rentang -1 sampai 1 dan berpusat di nol. **ReLU** (*rectified linear unit*) mengembalikan 0 untuk skor negatif dan skor itu sendiri untuk skor positif. Kemiringan adalah faktor pengali dalam backpropagation, karena itu tabel di bawah memuatnya juga.

| Skor z | sigmoid | kemiringan | tanh | kemiringan | ReLU | kemiringan |
|---|---|---|---|---|---|---|
| -2 | 0,119 | 0,105 | -0,964 | 0,071 | 0 | 0 |
| 0 | 0,5 | 0,25 | 0 | 1 | 0 | sudut |
| 2 | 0,881 | 0,105 | 0,964 | 0,071 | 2 | 1 |

Kemiringan sigmoid adalah h × (1 - h) untuk output h, seperti di pelajaran sebelumnya, sehingga tidak pernah melebihi 0,5 × 0,5 = 0,25. ReLU punya sudut di 0, sehingga di titik itu library memilih salah satu dari dua kemiringan di sisinya.

[[figure:activations-initialization-and-optimizers/activation-functions|Output dan kemiringan ketiga fungsi aktivasi untuk skor dari -3 sampai 3. Garis putus-putus menandai 0,25, nilai tertinggi yang dapat dicapai kemiringan sigmoid.]]

## Vanishing gradient
*Mengapa lapisan awal pada network dalam berhenti belajar?*

Backpropagation mengirim gradient mundur satu lapisan demi satu lapisan, dan setiap lapisan mengalikannya dengan sebuah faktor: kira-kira weight dikali kemiringan fungsi aktivasi. Gradient yang sampai di lapisan 1 adalah hasil kali semua faktor itu. Agar yang tersisa hanya kemiringannya, beri setiap weight nilai 1.

Pada unit sigmoid faktornya paling besar 0,25, dan 0,105 saat skornya 2. Bahkan dalam kasus terbaik, 5 lapisan menyisakan 0,25^5 = 0,00098 dari gradient, dan 10 lapisan menyisakan kurang dari satu per sejuta. Lapisan awal nyaris tidak menerima sinyal, sehingga weight-nya hampir tidak bergerak. Inilah masalah **vanishing gradient**. tanh punya kemiringan 1 di skor 0, tetapi hanya 0,071 di skor 2, sehingga ia juga jenuh: unit **jenuh** (*saturates*) bila output-nya berada dekat ujung rentang tempat kemiringannya hampir 0. Unit ReLU yang aktif punya kemiringan tepat 1, sehingga hasil kalinya tidak menyusut.

[[figure:activations-initialization-and-optimizers/gradient-by-layer|Bagian gradient lapisan terakhir yang tersisa d lapisan ke belakang, dengan setiap weight bernilai 1. Sumbu vertikalnya logaritmik: tiap garis kisi 10 kali lebih kecil dari garis di atasnya.]]

> Awas: ReLU dapat mati. Unit yang skornya negatif untuk setiap contoh punya kemiringan 0, sehingga tidak ada gradient yang sampai ke weight-nya dan gradient tidak dapat menghidupkannya kembali. Satu langkah besar yang mendorong bias-nya jauh di bawah nol dapat menyebabkan hal ini.

## Nol gagal: simetri
*Mengapa semua weight tidak boleh dimulai dari nol, atau dari satu nilai yang sama?*

Beri setiap unit hidden dalam satu lapisan weight awal yang sama. Setiap unit lalu menghitung output yang sama, meneruskan sinyal yang sama, dan menerima gradient yang sama. Update yang sama membuat mereka tetap sama, sehingga selama seluruh run mereka hanya salinan satu sama lain, dan satu lapisan berisi 50 unit bekerja seperti satu unit. Nol adalah kasus ekstrem dari kesalahan ini.

> Contoh hitungan: satu input x = 1, dua unit hidden tanh dengan semua weight 0,5 dan tanpa bias, target y = 1, dan separuh galat kuadrat sebagai loss. Setiap unit menghasilkan tanh(0,5) = 0,462, sehingga prediksinya 0,5 × 0,462 + 0,5 × 0,462 = 0,462 dan galatnya 0,462 - 1 = -0,538. Gradient untuk weight input sebuah unit adalah galat × weight output × (1 - 0,462²) × x = -0,538 × 0,5 × 0,786 × 1 = -0,211. Unit 2 mendapat angka yang persis sama, sehingga setelah update keduanya masih sama.

Weight awal acak memecah kesamaan itu. Tiap unit mulai dengan sedikit perbedaan, sehingga gradient mendorong unit-unit ke tugas yang berbeda. Bias boleh dimulai dari nol; weight-nya tidak boleh.

## Skala: Xavier dan He
*Seberapa besar weight acak awal sebaiknya?*

Sebuah skor menjumlahkan n_in hasil kali w × x, satu per input. Jika input memiliki sebaran 1 dan weight memiliki varians Var(w), skor itu memiliki varians n_in × Var(w). Dengan 100 input, weight dengan simpangan baku 1 menghasilkan skor dengan simpangan baku 10, dan weight dengan 0,1 menghasilkan 1. Dari lapisan ke lapisan sinyal dikalikan lagi dan lagi, sehingga selisih kecil pada ukurannya akan menumpuk.

Skala **Xavier** (disebut juga Glorot) menetapkan Var(w) = 2 / (n_in + n_out), untuk sigmoid dan tanh. Skala **He** menetapkan Var(w) = 2 / n_in, untuk ReLU. Dengan 100 input dan 100 output, Xavier memberi simpangan baku 0,1 dan He memberi 0,141.

[[figure:activations-initialization-and-optimizers/signal-sizes|Satu run dengan seed tetap pada 8 lapisan ReLU berisi 100 unit, dengan bilangan acak yang sama diskalakan dengan tiga cara. Sinyal yang lenyap nyaris tidak sampai ke lapisan akhir, dan sinyal yang meledak membuat output dan loss melonjak.]]

Pada gambar, sinyal dikalikan sekitar 0,35 per lapisan bila simpangan bakunya 0,05, dan sekitar 2,1 bila 0,3. Setelah 8 lapisan itu menjadi 0,0002 berbanding 327, sedangkan skala He menjaganya di dekat 1 (0,8 pada run ini).

::: deeper Mengapa He memakai angka 2
ReLU mengubah sekitar separuh skor menjadi 0, sehingga rata-rata kuadrat output-nya hanya separuh dari input-nya. Dengan 100 input dan simpangan baku 0,1, varians skornya 100 × 0,01 × 1 = 1 dan output hanya menyisakan 0,5 darinya. Sinyal lalu menyusut dengan faktor sekitar 0,71 per lapisan: 0,71^8 kira-kira 0,06 setelah 8 lapisan. Angka 2 pada He melipatgandakan varians untuk mengembalikan separuh yang hilang itu.
:::

## Optimizer: SGD, momentum, dan Adam
*Bagaimana optimizer mengubah gradient menjadi langkah?*

**SGD** biasa menggeser setiap weight sebesar `w = w - lr * g`, memakai gradient g dari sebuah mini-batch, seperti di "Update stochastic dan mini-batch". **Momentum** menambahkan kecepatan yang mengingat langkah-langkah sebelumnya: `v = m * v - lr * g`, lalu `w = w + v`, seperti di "Learning rate dan masalahnya". Gradient yang stabil saling menjumlah, sedangkan gerak zigzag saling meniadakan.

**Adam** menyimpan dua rata-rata berjalan untuk setiap weight: satu untuk gradient (arahnya, dengan peluruhan 0,9) dan satu untuk kuadratnya (ukurannya, dengan peluruhan 0,999). Langkahnya adalah rata-rata pertama dibagi akar rata-rata kedua, setelah koreksi karena keduanya mulai dari nol. Weight yang gradient-nya kecil dibagi dengan bilangan kecil, sehingga ia tetap bergerak.

> Contoh hitungan: learning rate 0,01, dan dua weight dengan gradient 0,4 dan 40 pada langkah pertama. SGD menggeser keduanya sebesar 0,004 dan 0,4. Adam, untuk weight dengan gradient 0,4: rata-rata gradient 0,1 × 0,4 = 0,04, dibagi 1 - 0,9 sebagai koreksi awal menjadi 0,4; rata-rata kuadrat 0,001 × 0,16 = 0,00016, dibagi 1 - 0,999 menjadi 0,16; langkah 0,01 × 0,4 / √0,16 = 0,01. Untuk gradient 40 langkahnya juga 0,01. Momentum dengan m = 0,9 dan gradient stabil 0,4 melangkah 0,004, lalu 0,0076, lalu 0,01084.

Pada langkah pertama, besar langkah Adam kira-kira sama dengan learning rate, berapa pun besar gradient-nya. Tidak ada optimizer yang menang di setiap masalah, dan semuanya bergantung pada learning rate yang wajar.

## Weight decay
*Bagaimana penalti pada weight mencegah network menghafal?*

Network punya jauh lebih banyak weight daripada model linear, sehingga ia dapat menghafal training set. **Weight decay** adalah penalti ridge dari "Bias, varians, dan shrinkage" dan "L1 dan L2: ridge dan lasso", yang diterapkan pada semua weight. Penalti λ × w² memiliki kemiringan 2 × λ × w, sehingga setiap update juga menarik tiap weight ke arah nol sebesar sebagian dari ukurannya.

> Contoh hitungan: w = 2, gradient 0,5, learning rate 0,1, dan λ = 0,25. Tanpa decay, w menjadi 2 - 0,1 × 0,5 = 1,95. Dengan decay, w menjadi 2 - 0,1 × (0,5 + 2 × 0,25 × 2) = 1,85. Jika gradient-nya 0, setiap langkah mengalikan w dengan 1 - 0,1 × 2 × 0,25 = 0,95, yang menyisakan 1,197 setelah 10 langkah.

::: deeper Weight decay tidak selalu sama dengan penalti L2
Pada SGD biasa, keduanya memberi update yang sama. Pada Adam keduanya berbeda: penalti yang ditambahkan ke loss ikut diskalakan oleh pembagian Adam, sehingga varian bernama AdamW menerapkan decay langsung pada weight.
:::

## Dropout
*Bagaimana mematikan unit secara acak membuat network lebih tangguh?*

**Dropout** mematikan tiap unit hidden secara acak selama training, di sini dengan probabilitas 0,5, sehingga tidak ada unit yang dapat bersandar pada pasangan tertentu. Misalkan empat output bernilai 0,8, 0,2, 0,4, dan 0,6, lalu unit 3 dan 4 dimatikan. Unit yang bertahan dikalikan dua, menjadi 1,6 dan 0,4, sehingga jumlahnya, 2, sama dengan jumlah keempat output sebelum dimatikan. Mask lain memberi jumlah yang berbeda, tetapi jika dirata-ratakan pada banyak mask, output-nya tetap sama. Saat prediksi, semua unit dipakai dan tidak ada yang dimatikan.

## Early stopping
*Bagaimana validation loss memberi tahu kapan harus berhenti?*

Training loss hampir selalu terus turun, sehingga ia tidak dapat memberi tahu kapan harus berhenti. Validation loss dapat, seperti di "Gradient boosting", tempat ia menentukan jumlah tree. **Early stopping** memantaunya setelah setiap epoch, mengingat weight dari epoch terbaik, dan berhenti begitu loss tidak membaik selama sejumlah epoch tertentu, yaitu **patience**.

Gambar menunjukkan satu run rekaan agar aturannya konkret. Validation loss mencapai 0,37 pada epoch 6, lalu menjadi 0,375, 0,39, dan 0,41 sementara training loss terus turun. Dengan patience 3, training berhenti setelah epoch 9 dan weight dari epoch 6 dikembalikan.

[[figure:activations-initialization-and-optimizers/early-stopping|Satu run rekaan: training loss turun di setiap epoch, sedangkan validation loss terendah ada di epoch 6.]]

> Gagasan kunci: early stopping tidak memerlukan apa pun selain validation set. Ia juga membatasi seberapa jauh training dapat menggeser weight dari nilai awalnya yang kecil, sehingga bekerja sebagai regularizer.

## Saat training gagal: apa yang diperiksa
*Tiga plot apa yang menjelaskan mengapa network tidak mau berlatih?*

Periksa tiga hal sebelum mengubah apa pun. **Kurva loss**, untuk training dan validation, menunjukkan apakah loss turun, mandek, meledak, atau terpecah menjadi dua. **Aktivasi**, sebagai histogram per lapisan, menunjukkan kejenuhan: output tanh atau sigmoid yang menumpuk di ujungnya (histogram menghitung berapa banyak output yang jatuh di tiap rentang nilai), atau lapisan ReLU yang sebagian besar output-nya tepat 0. **Ukuran gradient**, per lapisan, menunjukkan lapisan awal yang menerima jauh lebih sedikit (vanishing) atau jauh lebih banyak (exploding) daripada lapisan terakhir.

| Yang terlihat | Penyebab yang mungkin | Yang dicoba pertama |
|---|---|---|
| Loss datar sejak epoch pertama | Vanishing gradient, unit ReLU mati, weight kecil sekali atau sama, learning rate terlalu kecil | ReLU, skala He atau Xavier, rate yang lebih besar |
| Loss melonjak menjadi NaN (bukan angka) atau tak hingga | Learning rate terlalu besar, atau weight terlalu besar | Bagi rate dengan 10, skalakan ulang weight |
| Training turun, validation naik | Overfitting | Weight decay, dropout, early stopping |
| Keduanya turun pelan dan tetap tinggi | Rate terlalu kecil, atau model terlalu kecil | Rate lebih besar, lebih banyak epoch, lebih banyak unit |

Berikutnya adalah network lab, pelajaran terakhir kursus ini, tempat kamu dapat memeriksa aktivasi dan gradient sebuah network kecil. Perkirakan dulu apa yang akan ditunjukkan setiap plot sebelum kamu mengubah pengaturan.

::: remember
- Fungsi aktivasi harus melengkungkan jumlah skor, dan kemiringannya adalah faktor dalam setiap langkah mundur: kemiringan sigmoid paling besar 0,25, sehingga tumpukan sigmoid yang dalam kehilangan gradient-nya, sedangkan ReLU yang aktif mempertahankannya.
- Mulailah dengan weight acak, jangan yang sama, diskalakan dengan Xavier (sigmoid, tanh) atau He (ReLU) agar sinyal tetap sama besar dari lapisan ke lapisan.
- Adam menskalakan langkah tiap weight dengan ukuran gradient-nya sendiri, dan weight decay, dropout, serta early stopping menahan network. Saat training gagal, baca kurva loss, aktivasi, dan ukuran gradient.
:::
