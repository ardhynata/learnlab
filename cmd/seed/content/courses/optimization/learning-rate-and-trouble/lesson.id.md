---
slug: learning-rate-and-trouble
title: Learning rate dan masalahnya
---
::: intro
- Memprediksi dari learning rate apakah gradient descent akan merayap, menetap, memantul, atau meledak.
- Menghitung learning rate terbesar yang masih diizinkan sebuah mangkuk, membaca plot loss terhadap langkah, dan mencari rate yang baik pada skala log.
- Menjelaskan bagaimana skala data menggeser batas itu, mengapa sebuah lembah dapat menjebak sebuah run, dan apa yang berubah dengan momentum atau titik awal baru.

Sebelum mulai: baca "Gradient descent" dan lihat sekilas "Scaling dan encoding" (men-standardisasi sebuah kolom).
:::

## Kenop yang paling menentukan
*Mengapa satu angka kecil bisa menentukan berhasil tidaknya training?*

Kamu sudah mengenal aturan ini di "Gradient descent": tiap langkah menggeser titik menuruni lereng sejauh kemiringan dikali sebuah angka pilihanmu, yaitu **learning rate** (di sini ditulis lr):

x baru = x - lr × kemiringan

Learning rate menentukan seberapa berani tiap langkah, dan ada tiga rezim. Ambil f(x) = (x - 5)² / 2 yang terendah di x = 5, dan mulai dari x = 1:

- **Terlalu kecil merayap.** Pada lr 0,01 lima langkah hanya sampai x = 1,196, dan butuh 437 langkah untuk berada dalam jarak 0,05 dari dasar.
- **Yang pas cepat dan stabil.** Pada lr 0,5 titiknya berjalan 1; 3; 4; 4,5; 4,75 dan sudah dalam jarak 0,05 setelah 7 langkah.
- **Terlalu besar divergen.** Pada lr 2,1 titiknya berjalan 1; 9,4; 0,16; 10,324; -0,8564: setiap lompatan lebih jauh daripada yang sebelumnya.

> Gagasan kunci: kemiringan menunjukkan arah yang harus diambil. Learning rate menentukan seberapa jauh melangkah. Hanya yang kedua yang kamu pilih.

## Saat langkahnya terlalu besar
*Seberapa besar yang disebut terlalu besar?*

Untuk sebuah mangkuk, batasnya dapat dihitung. Ambil f(x) = (h/2)(x - c)², yang terendah di x = c. Angka h adalah **curvature** (kelengkungan): seberapa tajam mangkuk itu melengkung (besar untuk mangkuk yang sempit). Kemiringannya h(x - c). Sebut x - c jarak bertanda ke titik terendah. Satu langkah mengubahnya begini:

jarak baru = (1 - lr × h) × jarak lama

Sebut (1 - lr × h) **faktor**. Apa yang terjadi bergantung padanya:

- Tepat 0: titik mendarat di titik terendah dalam satu langkah (lr = 1/h).
- Antara 0 dan 1: titik merayap masuk dari satu sisi.
- Antara -1 dan 0: titik melompat ke sisi seberang di tiap langkah, tetapi mendarat lebih dekat. Inilah **osilasi**.
- Tepat -1: titik memantul di antara dua tempat selamanya.
- Di bawah -1: setiap lompatan lebih jauh daripada yang sebelumnya. Inilah **divergensi**.

Karena itu sebuah mangkuk hanya menetap jika lr < 2 / h. Di lab, Parabola punya h = 1 (batas 2) dan Parabola curam punya h = 6 (batas sekitar 0,33).

> Gagasan kunci: makin tajam lengkungannya, makin kecil learning rate yang dapat ditoleransi.

::: deeper Dari mana faktor itu berasal
Dengan d = x - c, kemiringannya h × d, sehingga d_baru = d - lr × h × d = (1 - lr × h) × d. Jarak menyusut tepat ketika |1 - lr × h| < 1, yang berarti 0 < lr × h < 2. Di dekat titik terendah, kurva mulus apa pun tampak seperti mangkuk, dengan h sama dengan turunan keduanya di titik itu, sehingga batas yang sama berlaku secara lokal. Jika ada beberapa arah, lengkungan yang paling tajam menentukan batas untuk semuanya.
:::

## Contoh hitungan
*Dapatkah kita mengikuti empat learning rate dengan tangan?*

Ambil f(x) = (x - 5)² / 2 dari x = 1. Kemiringannya x - 5 dan h = 1, sehingga faktornya 1 - lr. Dengan lr = 1,9, langkah pertamanya: kemiringan = 1 - 5 = -4, lalu x = 1 - 1,9 × (-4) = 8,6. Mengulang aturan itu menghasilkan:

| Langkah | lr 0,5 | lr 1,9 | lr 2,0 | lr 2,1 |
|---|---|---|---|---|
| 0 | 1 | 1 | 1 | 1 |
| 1 | 3 | 8,6 | 9 | 9,4 |
| 2 | 4 | 1,76 | 1 | 0,16 |
| 3 | 4,5 | 7,916 | 9 | 10,324 |
| 4 | 4,75 | 2,3756 | 1 | -0,8564 |

Sekarang lihat jarak x - 5, yang dimulai dari -4:

- **lr 0,5** (faktor 0,5): -4; -2; -1; -0,5; -0,25. Jaraknya separuh di tiap langkah.
- **lr 1,9** (faktor -0,9): -4; 3,6; -3,24; 2,916; -2,6244. Titik berpindah sisi, tetapi jaraknya menyusut 10% per langkah.
- **lr 2,0** (faktor -1): -4; 4; -4; 4; -4. Tidak pernah menetap.
- **lr 2,1** (faktor -1,1): -4; 4,4; -4,84; 5,324; -5,8564. Jaraknya membesar 10% per langkah. Loss (x - 5)² / 2 naik dari 8 menjadi 17,15 dalam empat langkah.

## Memilih rate dalam praktik
*Bagaimana memilih learning rate jika tidak ada yang memberi tahu curvature-nya?*

Coba nilai pada **skala log**: 0,1; 0,03; 0,01; 0,003, dan seterusnya, masing-masing sekitar sepertiga dari yang sebelumnya. Kamu tidak tahu curvature h sebelumnya, dan batas 2 / h bisa besar atau sangat kecil: kurva yang 10 kali lebih tajam membutuhkan rate yang 10 kali lebih kecil. Tebakan dengan jarak sama (0,1; 0,2; 0,3) semuanya berada di dekat puncak rentang: jika rate yang tepat dekat 0,003, tidak satu pun mendekatinya. Slider **Learning rate (skala log)** di lab bekerja dengan cara ini.

[[figure:learning-rate-and-trouble/log-ladder|Learning rate pada sumbu log untuk Parabola curam. Melewati batas sekitar 0,33, jaraknya membesar, bukan menyusut.]]

Resep yang umum: mulailah dari rate yang divergen, turunlah di tangga itu sampai loss turun dengan mantap, lalu pertahankan rate terbesar yang berperilaku baik. Ubah satu kenop dalam satu waktu, jika tidak, kamu tidak dapat mengatakan perubahan mana yang membantu.

## Saat data menentukan batasnya
*Apakah rate yang berhasil pada satu dataset juga berhasil pada dataset lain?*

Belum tentu: curvature berasal dari data. Menyesuaikan sebuah garis adalah perjalanan yang sama, dengan slope w dan intercept b sebagai parameternya. Ambil 342 penguin yang punya panjang sirip dan massa tubuh, dan misalkan loss-nya setengah dari mean squared error. Untuk slope w, h adalah rata-rata dari kuadrat input.

[[figure:learning-rate-and-trouble/penguin-scale|Garis yang sama dipasang dengan panjang sirip dalam mm (batas sekitar 0,000049) dan yang sudah di-standardisasi (batas 2). Kotak putus-putus menandai rate yang ditawarkan slider lab. Angka-angkanya berasal dari data penguin, bukan dari lab.]]

Dengan panjang sirip dalam milimeter, rata-rata kuadratnya 40.564, sehingga lengkungan terajamnya sekitar 40.565 dan batas 2 / h sekitar 0,000049. Rate terkecil di lab, 0,001, sudah 20 kali melewatinya. Setelah standardisasi (lihat "Scaling dan encoding"), kedua kolom punya rata-rata 0 dan simpangan baku 1, sehingga h bernilai 1 dan batasnya 2, seperti Parabola.

> Gagasan kunci: skala data menentukan rate terbesar yang aman. Lakukan standardisasi dulu, baru telusuri tangganya.

::: deeper Pemeriksaan penguin lebih rinci
Pada penguin yang sudah di-standardisasi, dari w = 0 dan b = 0 loss-nya 0,5000. Pada lr 0,5 loss mencapai 0,1209 dalam lima langkah (yang terendah mungkin adalah 0,1205). Pada lr 2,0 loss tetap di 0,5000, dan pada lr 2,1 loss membesar menjadi 17,3 pada langkah 20. Dengan panjang sirip dalam milimeter dan massa tubuh yang sudah di-standardisasi, rate 0,00003 aman, tetapi loss-nya tetap 0,498 setelah 1.000 langkah. Arah yang lain hampir datar (curvature sekitar 0,005), sehingga rate yang dapat ditahan arah yang curam nyaris tidak menggerakkannya. Satu rate tidak dapat sesuai untuk dua lengkungan yang sangat berbeda; standardisasi membuat keduanya 1. Pada empat separuh acak dari data penguin, batasnya tetap di sekitar 0,000049, sehingga ia tidak bergantung pada satu sampel yang kebetulan beruntung.
:::

## Lembah dan tempat yang datar
*Mengapa descent dapat berhenti di titik yang bukan yang terendah?*

Gradient descent hanya membaca kemiringan di bawah kakinya. Di dasar lembah mana pun kemiringannya nol, sehingga langkahnya nol dan titik berhenti. Lembah yang bukan yang terendah disebut **local minimum**; titik terendahnya disebut **global minimum**. Pada kurva Dua lembah di lab, lembah dangkalnya di dekat x = 2,15 (loss 2,59), titik terdalamnya di dekat x = 8,13 (loss 1,39), dan punggungan di antara keduanya di dekat x = 4,72.

[[figure:learning-rate-and-trouble/stuck-ball|Kurva dan rate yang sama, dua titik awal. Titik awal A berakhir di lembah dangkal; titik awal B mencapai titik terdalam. Garis putus-putus menandai dasar tiap lembah.]]

Tempat kamu mulai menentukan tempat kamu berakhir. Pada lr 0,1, setiap titik awal di kiri punggungan berakhir di lembah dangkal dan setiap titik awal di kanannya berakhir di lembah dalam, karena mendaki punggungan berarti naik. Rate yang lebih besar bukan jalan keluar yang dapat diandalkan: dari titik awal 1, bahkan lr 0,7 berakhir di lembah dangkal.

Puncak punggungan adalah **tempat datar**: langkah di sana sangat kecil, dan dari titik awal 4,8 loss hanya turun dari 3,65 menjadi 3,51 dalam 30 langkah. "Datar belum tentu terendah" di "Gradient descent" membahas gagasan ini. Di sini pelajarannya: satu run hanya memberi tahu tentang satu titik awal, karena itu coba beberapa titik awal sebelum menilai sebuah pengaturan.

## Momentum
*Bagaimana sebuah titik dapat mengingat ke mana ia tadi menuju?*

**Momentum** memberi titik sebuah kecepatan v yang mengingat langkah-langkah sebelumnya:

v baru = m × v lama - lr × kemiringan, lalu x baru = x + v baru

Di sini m, antara 0 dan 1, menyatakan seberapa banyak kecepatan lama yang dipertahankan (m = 0 berarti descent biasa), dan v dimulai dari 0. Coba pada f(x) = (x - 5)² / 2 dari x = 1 dengan lr 0,5 dan m = 0,5, dengan kemiringan x - 5:

- Langkah 1: kemiringan = -4, sehingga v = 0,5 × 0 - 0,5 × (-4) = 2 dan x = 1 + 2 = 3.
- Langkah 2: kemiringan = -2, sehingga v = 0,5 × 2 - 0,5 × (-2) = 2 dan x = 5. Descent biasa baru sampai di 4.
- Langkah 3: kemiringan = 0, tetapi v = 0,5 × 2 = 1, sehingga x = 6. Titik melewati dasar.

## Apa yang dilakukan momentum
*Apakah kecepatan yang diingat itu membantu atau merugikan?*

Bayangkan sebuah bola berat: dorongan yang searah saling menambah. Harganya adalah overshoot, sehingga loss naik turun bergelombang. Pada Parabola dengan lr 0,1 dan 30 langkah, m = 0 menyisakan loss 0,0144, m = 0,5 membawanya ke 0,000000037, dan m = 0,9 melewati dasar berulang kali dalam gelombang. Momentum juga dapat membawa titik melewati punggungan: pada Dua lembah dari titik awal 1, lr 0,7 dengan m = 0,9 berakhir di lembah dalam setelah 100 langkah, sedangkan dengan m = 0 titiknya tetap di lembah dangkal. (Pada 30 langkah bawaan lab, run dengan m = 0,9 masih berosilasi, karena itu beri 100 langkah.)

::: deeper Momentum mengubah batasnya
Pada mangkuk dengan curvature h, momentum m (dari 0 sampai kurang dari 1) menetap jika lr × h < 2 × (1 + m). Dengan m = 0,5 itu berarti lr × h < 3, sehingga Parabola curam (h = 6) menoleransi lr sampai 0,5, bukan 1/3. Dalam pemeriksaan cepat, lr 0,45 dengan m = 0,5 konvergen dan lr 0,55 tidak.
:::

## Membaca riwayat loss
*Bagaimana mengetahui apa yang salah tanpa melihat lanskapnya?*

Model sungguhan punya terlalu banyak kenop untuk digambar, tetapi kamu selalu dapat memplot **loss terhadap langkah**, yaitu riwayat loss, dan bentuknya menyebutkan masalahnya. Kotak Diagnosis di lab membaca bentuk-bentuk ini untukmu: Terlalu lambat, Konvergen, Berosilasi, Divergen, atau Terjebak di local minimum.

[[figure:learning-rate-and-trouble/loss-curves|Loss terhadap langkah pada mangkuk yang sama dengan empat pengaturan. Tiga panel pertama memakai satu skala vertikal yang sama dan panel keempat mencapai empat kali lebih tinggi. Panel ketiga memakai momentum.]]

| Riwayat loss | Kemungkinan penyebab | Yang dicoba lebih dulu |
|---|---|---|
| Turun pelan dan stabil, masih turun ketika kamu berhenti | Rate terlalu kecil | Naikkan, misalnya dengan faktor 3 |
| Turun cepat, lalu mendatar di dekat dasar | Kira-kira pas | Pertahankan |
| Naik turun bergelombang | Momentum terlalu besar | Turunkan momentum atau rate-nya |
| Tetap datar dan tinggi | Rate tepat di batas: titik memantul | Turunkan rate-nya |
| Membesar di setiap langkah sampai angkanya overflow (menjadi terlalu besar untuk disimpan komputer) | Rate melewati batas | Potong dengan faktor 10 |
| Datar, tetapi tidak rendah | Terjebak di lembah atau tempat datar | Ganti titik awal; tambahkan momentum |

## Apa yang dapat disembunyikan loss
*Kapan riwayat loss dapat menyesatkan?*

> Awas: loss saja dapat menyembunyikan rate yang terlalu besar. Pada lr 1,9 loss turun 19% per langkah (0,9 × 0,9 = 0,81) meskipun x melompat dari sisi ke sisi, sehingga tampak seperti penurunan yang lambat. Lihat juga jalurnya, seperti yang dilakukan lab.

Dengan momentum, loss tidak perlu turun di setiap langkah: satu kenaikan kecil di antara banyak langkah yang turun tidak masalah, karena itu nilailah trennya. Kenaikan setiap beberapa langkah berarti gelombang, dan loss yang membesar di setiap langkah berarti divergensi.

::: remember
- Langkahnya adalah lr × kemiringan. Pada mangkuk dengan curvature h, rate harus tetap di bawah 2 / h, jika tidak, titik memantul lalu meledak. Skala data menentukan h. Karena itu lakukan standardisasi, lalu cari rate pada skala log, satu kenop dalam satu waktu.
- Bacalah riwayat loss: penurunan yang lambat berarti naikkan rate, gelombang berarti turunkan momentum atau rate, ledakan berarti potong rate dengan faktor sepuluh.
- Descent dapat terjebak di sebuah lembah lokal. Karena itu titik awal penting. Momentum dapat menggelindingkan titik melewati punggungan kecil, tetapi bisa melewati dasarnya.
:::

@@lab

## Lab: Menggelinding turun di kurva loss
Sebuah titik menggelinding turun di kurva loss dengan satu kenop. Kamu memilih seberapa berani tiap langkah dan menonton apakah run-nya merayap, menetap, memantul, atau meledak. Lab ini menggambar kurva, bukan penguin: Parabola dan Parabola curam mewakili angka curvature di "Saat data menentukan batasnya".

### Kontrol
- **Kurva loss:** Parabola (curvature 1, menetap di bawah rate 2), Parabola curam (curvature 6, menetap di bawah sekitar 0,33), atau Dua lembah (lembah dangkal di dekat x = 2,15, lembah yang lebih dalam di dekat x = 8,13). Memilih kurva juga mengatur titik awalnya, rate Pas-nya, dan momentum 0.
- **Learning rate (skala log):** 0,001 sampai 2,5, dengan tiap geseran slider mengalikan rate dengan faktor yang sama. Pakai tombol panah pada slider untuk mendarat di nilai yang tepat.
- **Momentum:** 0 sampai 0,95. Pada 0, run-nya adalah gradient descent biasa.
- **Posisi awal:** 0 sampai 10. Kamu juga dapat mengklik atau menyeret di plot, atau menekan tombol panah saat plot terpilih.
- **Langkah:** berapa langkah yang dijalani run, 10 sampai 200.
- **Contoh pengaturan:** **Terlalu kecil**, **Pas**, **Terlalu besar**, dan **Kebablasan** mengatur rate (dan momentum 0) untuk kurva yang dipilih. Pada Dua lembah, Pas adalah rate yang baik tetapi tetap terjebak.
- **Tampilkan jalur rencana:** panah samar di plot dan garis putus-putus di grafik memperlihatkan seluruh run lebih dulu.
- **Grafik loss menggunakan skala log:** memplot logaritma loss. Pengaturan ini menyala sendiri ketika loss melewati 10.000.
- **Jalankan**, **Langkah sebelumnya**, **Langkah berikutnya**, dan **Kecepatan** memutar run-nya. Mengganti kurva, rate, momentum, posisi awal, atau langkah memulai ulang run; kedua tombol centang hanya menggambar ulang. **Reset** mengembalikan kurva, rate, momentum, posisi awal, dan langkah, serta mematikan kedua centang.

### Membaca layar
- Plot menampilkan kurva dengan nilai loss sebenarnya di sumbu kiri (**loss f(x)**) dan **x (posisi)** di sepanjang bawah. Legenda menamai tandanya: **awal, terendah** (teal), **langkah (garis penuh)**, **titik sekarang** (berlian pink) dan **rencana (putus-putus)** (panah abu-abu samar). Cincin pink berlabel "di luar plot" berarti titik sudah keluar dari rentang 0 sampai 10.
- Mulai langkah 3, kotak di atas plot berbunyi **Diagnosis:** diikuti Konvergen, Terlalu lambat, Berosilasi, Divergen, atau Terjebak di local minimum, dengan sebuah kalimat yang menjelaskan alasannya. Sebelum itu tertulis "Siap. Jika dijalankan dengan pengaturan ini:" dan memprediksi ke mana run yang direncanakan berakhir. Di bawahnya, sebuah baris menunjukkan langkah, x, loss, learning rate, dan momentum.
- Grafik **Loss per langkah** menampilkan run yang sama: garis penuh untuk yang sudah terjadi, putus-putus untuk run yang direncanakan. Sumbunya adalah **langkah** dan **loss**, atau **log10 loss** saat skala log menyala.

### Eksperimen
1. **Prediksikan:** setelah 30 langkah pada Parabola dari titik awal 1, seberapa jauh Terlalu kecil sampai? Tekan **Reset**, lalu **Terlalu kecil** (0,01) dan **Jalankan**. Titik hanya sampai x = 2,04 dan Diagnosis berbunyi Terlalu lambat. Tekan **Pas** (0,5): x berjalan 1; 3; 4; 4,5; 4,75 dan Diagnosis berbunyi Konvergen. Centang **Grafik loss menggunakan skala log**: kedua run menjadi garis lurus, karena loss menyusut dengan faktor yang sama di tiap langkah. Garis Pas berhenti di langkah 22, ketika loss turun di bawah 1e-12.
2. **Prediksikan:** apa yang dilakukan rate 1,9, 2, dan 2,1 pada Parabola? Atur **Learning rate (skala log)** lalu **Jalankan** masing-masing. Pada 1,9 Diagnosis berbunyi Berosilasi, tiap ayunan sekitar 10% lebih kecil, dan setelah 30 langkah x adalah 4,83. Pada 2 juga berbunyi Berosilasi, tetapi x memantul di antara 1 dan 9 dan ayunannya tidak menyusut. Pada 2,1 berbunyi Divergen dan loss mencapai 2.436 pada langkah 30. Tekan **Terlalu besar** (2,2): loss melewati 10.000 dan grafik berpindah ke skala log dengan sendirinya.
3. **Prediksikan:** mana yang menetap pada Parabola curam, 0,3 atau 0,4? Keduanya nyaman pada Parabola. Pilih Parabola curam, tekan **Kebablasan** (0,3) dan jalankan: Diagnosis berbunyi Berosilasi, tetapi titik tetap menetap, tiap ayunan sekitar 20% lebih kecil. Tekan **Terlalu besar** (0,4): berbunyi Divergen, karena batasnya sekitar 0,33 dan faktor 1 - 6 × 0,4 adalah -1,4. Lalu tekan **Pas** (0,15): faktornya 0,1 dan x berjalan 1,5; 4,65; 4,965; 4,9965. Coba **Posisi awal** 0,5, 3, dan 9: Terlalu besar divergen dari setiap titik awal dan Pas konvergen dari setiap titik awal, sehingga batasnya milik kurva, bukan milik titik awal.
4. **Prediksikan:** di mana run pada Dua lembah berakhir dari titik awal 1, dan dari titik awal 6? Pilih Dua lembah dan tekan **Pas** (0,1). Kotaknya sudah menyebut terjebak di local minimum sebelum kamu menjalankannya; setelah run, x berada di dekat 2,15 dengan loss 2,59. Atur **Posisi awal** ke 6 dan jalankan lagi: titik menuju x = 8,13, loss 1,39, dan Diagnosis berbunyi Konvergen. Punggungannya di dekat 4,72: 4,7 berakhir di lembah dangkal, sedangkan 4,8 mulai di puncak yang datar dan berbunyi Terlalu lambat. Sekarang coba titik awal 0,5, 2, 4, 6, dan 9 dengan Pas: tiga yang pertama berakhir di lembah dangkal dan dua yang terakhir di lembah dalam. Jebakannya milik titik awal.
5. **Prediksikan:** apakah momentum membantu atau merugikan? Pada Parabola atur rate ke 0,1 dan bandingkan **Momentum** 0, 0,5, dan 0,9 pada 30 langkah. Pada 0 Diagnosis berbunyi Konvergen dengan loss 0,0144, pada 0,5 berbunyi Konvergen jauh lebih cepat (loss 3,7e-8), dan pada 0,9 berbunyi Berosilasi: loss naik turun bergelombang. Lalu pilih Dua lembah dengan **Posisi awal** 1, rate 0,7, **Momentum** 0,9, dan **Langkah** 100: titik menggelinding melewati punggungan sampai dekat 8,13. Dengan momentum 0 titiknya tetap di dekat 2,15.
6. **Prediksikan:** apa yang akan dilakukan fit penguin yang sudah di-standardisasi pada lr 0,5, 2,0, dan 2,1? Curvature-nya 1, sehingga Parabola cukup layak sebagai pengganti. Tekan **Reset**, pilih Parabola, atur 0,5, 2, dan 2,1 bergantian, lalu jalankan masing-masing. Pada 0,5 Diagnosis berbunyi Konvergen, dan loss turun dari 8 menjadi 0,0078 dalam lima langkah. Pada 2 berbunyi Berosilasi dan loss tetap di 8. Pada 2,1 berbunyi Divergen dan loss mencapai 2.436 pada langkah 30. Penguin di "Saat data menentukan batasnya" mulai dari loss 0,5000 dan berperilaku sama: 0,1209 pada lr 0,5 setelah lima langkah, 0,5000 pada lr 2,0, 17,3 pada lr 2,1 pada langkah 20. Terakhir, bandingkan batas sirip mentah, 0,000049, dengan minimum slider, 0,001. Bahkan rate terkecil di lab sudah 20 kali melewati batas itu, itulah sebabnya kolom penguin perlu di-standardisasi sebelum pencarian pada slider ini masuk akal.
