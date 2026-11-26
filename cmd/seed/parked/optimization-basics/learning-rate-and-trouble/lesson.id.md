---
slug: learning-rate-and-trouble
title: Learning rate dan masalah yang sering muncul
---
::: intro
- Menebak, dari learning rate-nya, apakah gradient descent akan merayap, menetap, memantul, atau meledak.
- Membaca plot loss terhadap langkah untuk tahu apa yang sedang terjadi, memilih perbaikannya, dan mencari learning rate yang baik pada skala log.
- Memahami mengapa descent bisa terjebak di sebuah lembah, dan apa yang dapat dilakukan momentum atau titik awal yang berbeda.

Sebelum mulai: baca pelajaran "Gradient descent".
:::

## Satu angka yang paling menentukan
*Mengapa satu angka kecil dapat menentukan berhasil atau tidaknya training?*

Kamu sudah mengenal aturannya dari pelajaran Gradient descent: setiap langkah menggeser titik ke arah turun sejauh kemiringan dikalikan satu angka yang kamu tentukan sendiri, yaitu **learning rate** (kita singkat lr):

x baru = x - lr × kemiringan

Di tanah yang curam langkahnya panjang, dan semakin dekat ke dasar langkahnya mengecil dengan sendirinya.

Learning rate mengatur seberapa berani setiap langkah. Jika terlalu kecil, titik memang menuju arah yang benar, tetapi jalannya merayap dan bisa membutuhkan ribuan langkah. Jika terlalu besar, satu langkah melompati dasar dan bisa mendarat lebih tinggi daripada tempat berangkat. Di antara keduanya ada rentang yang membuat descent cepat sekaligus stabil. Mencari nilai yang tepat ini adalah pekerjaan tuning yang hampir selalu ada di *machine learning*.

> Gagasan kunci: kemiringan menunjukkan ke arah mana harus melangkah, sedangkan learning rate menentukan seberapa jauh. Hanya yang kedua yang dapat kamu atur.

## Kapan langkahnya terlalu besar?
*Tepatnya, seberapa besar yang sudah terlalu besar?*

Untuk kurva berbentuk mangkuk, batasnya bisa dihitung. Ambil f(x) = (h/2)(x - c)², mangkuk dengan titik terendah di x = c. Angka h adalah **kelengkungan** (*curvature*), yaitu seberapa tajam mangkuk itu melengkung: mangkuk sempit punya h besar, mangkuk lebar punya h kecil. Kemiringannya h(x - c). Sebut x - c sebagai jarak ke titik minimum. Jarak ini bertanda, jadi bernilai negatif jika x berada di sebelah kiri minimum. Satu langkah mengubah jarak itu menjadi:

jarak baru = (1 - lr × h) × jarak lama

Kita sebut (1 - lr × h) sebagai **faktor**. Apa yang terjadi bergantung pada nilainya:

- Tepat 0: titik langsung mendarat di minimum dalam satu langkah (lr = 1/h).
- Antara 0 dan 1: titik merayap mendekat dari satu sisi.
- Antara -1 dan 0: titik melompat ke sisi seberang di setiap langkah, tetapi mendarat semakin dekat. Ini disebut **osilasi** (*oscillation*).
- Tepat -1: titik memantul di antara dua tempat selamanya.
- Di bawah -1: setiap lompatan lebih jauh dari sebelumnya. Ini disebut **divergensi** (*divergence*).

Jadi, titik di mangkuk hanya akan menetap jika lr < 2 / h. Di lab, Parabola punya h = 1 (batasnya 2) dan Parabola curam punya h = 6 (batasnya 1/3).

> Gagasan kunci: semakin tajam lengkungannya, semakin kecil learning rate yang masih dapat ditoleransi.

::: deeper Dari mana faktor itu muncul
Misalkan d = x - c adalah jarak ke titik minimum. Kemiringannya h × d, jadi update-nya memberi d_new = d - lr × h × d = (1 - lr × h) × d. Jarak mengecil persis ketika |1 - lr × h| < 1, artinya 0 < lr × h < 2. Kurva yang bukan mangkuk pun terlihat seperti mangkuk jika kamu memperbesar tampilan di dekat minimum, dengan h sama dengan turunan keduanya di titik itu, sehingga batas yang sama berlaku secara lokal. Jika ada beberapa arah, lengkungan yang paling tajam yang menentukan batas untuk semuanya.
:::

## Contoh hitungan
*Bisakah kita menelusuri empat learning rate secara manual?*

Ambil f(x) = (x - 5)² / 2 dan mulai dari x = 1. Kemiringannya x - 5 dan h = 1, jadi faktornya 1 - lr. Langkah pertama dengan lr = 1,9 adalah sebagai berikut: kemiringan = 1 - 5 = -4, lalu x = 1 - 1,9 × (-4) = 8,6. Jika aturan itu diulang, hasilnya:

| Langkah | lr 0,5 | lr 1,9 | lr 2,0 | lr 2,1 |
|---|---|---|---|---|
| 0 | 1 | 1 | 1 | 1 |
| 1 | 3 | 8,6 | 9 | 9,4 |
| 2 | 4 | 1,76 | 1 | 0,16 |
| 3 | 4,5 | 7,916 | 9 | 10,324 |
| 4 | 4,75 | 2,3756 | 1 | -0,8564 |

Sekarang kita perhatikan jaraknya, x - 5, yang awalnya -4:

- **lr 0,5** (faktor 0,5): -4; -2; -1; -0,5; -0,25. Jaraknya menjadi separuh pada setiap langkah.
- **lr 1,9** (faktor -0,9): -4; 3,6; -3,24; 2,916; -2,6244. Titik bolak-balik ke sisi seberang, tetapi jaraknya menyusut 10% setiap langkah.
- **lr 2,0** (faktor -1): -4; 4; -4; 4; -4. Tidak pernah menetap.
- **lr 2,1** (faktor -1,1): -4; 4,4; -4,84; 5,324; -5,8564. Jaraknya membesar 10% setiap langkah. Loss (x - 5)² / 2 naik dari 8 menjadi 17,15 hanya dalam empat langkah.

## Lembah dan area datar
*Mengapa descent bisa berhenti di titik yang bukan yang terendah?*

Gradient descent hanya membaca kemiringan tepat di bawah kakinya. Di dasar lembah mana pun kemiringannya nol, sehingga langkahnya nol dan titik berhenti. Lembah yang bukan yang terendah disebut **local minimum**, seperti di pelajaran Gradient descent. Titik yang benar-benar terendah disebut **global minimum**.

[[figure:learning-rate-and-trouble/stuck-ball|Kurva dan learning rate yang sama, dengan dua titik awal. Dari titik awal A, titik berakhir di lembah dangkal; dari titik awal B, titik sampai ke dasar yang paling dalam. Garis putus-putus menandai dasar setiap lembah.]]

Tempat kamu memulai menentukan tempat kamu berakhir. Dari A, jalan turun mengarah ke lembah dangkal, dan untuk melewati gundukan titik harus naik terlebih dahulu, sedangkan langkah kecil tidak pernah naik.

**Area datar** adalah jebakan yang lebih ringan. Kemiringan di sana hampir nol, sehingga langkahnya sangat kecil dan kemajuannya merayap, walaupun learning rate-nya sudah cukup besar. Lab ini tidak memiliki area datar, tetapi tabel di bawah menyebutnya agar kamu dapat mengenalinya nanti.

Yang bisa dicoba: mulai dari beberapa tempat yang berbeda lalu bandingkan loss akhirnya, atau tambahkan momentum (dibahas sesudah ini). Learning rate yang jauh lebih besar kadang dapat melempar titik melewati gundukan, tetapi hasilnya bergantung pada keberuntungan dan titik awal. Dari titik awal bawaan di lab, cara ini tidak berhasil (titik tetap di lembah dangkal, lalu memantul atau meledak), sedangkan dari tepi paling kiri, lr sekitar 0,8 kebetulan berhasil melewatinya. Loss pada model sungguhan memiliki jauh lebih banyak arah dan gambarannya lebih rumit, tetapi area datar dan jebakan seperti ini tetap ada.

## Momentum
*Bagaimana sebuah titik bisa mengingat arah geraknya tadi?*

**Momentum** memberi titik sebuah kecepatan v yang mengingat langkah-langkah sebelumnya:

v baru = m × v lama - lr × kemiringan, lalu x baru = x + v baru

Di sini m, antara 0 dan 1, menentukan seberapa banyak kecepatan lama yang dipertahankan. Jika m = 0, ini sama saja dengan descent biasa. Titik memulai dengan v = 0.

Coba di mangkuk f(x) = (x - 5)² / 2 dari x = 1 dengan lr 0,5 dan m = 0,5. Kemiringannya x - 5.

- Langkah 1: kemiringan = -4, jadi v = 0,5 × 0 - 0,5 × (-4) = 2 dan x = 1 + 2 = 3.
- Langkah 2: kemiringan = -2, jadi v = 0,5 × 2 - 0,5 × (-2) = 2 dan x = 5. Descent biasa baru sampai di 4.
- Langkah 3: kemiringan = 0, tetapi v = 0,5 × 2 = 1, jadi x = 6. Titik melampaui dasar.

Bayangkan sebuah bola yang berat. Di lereng panjang yang landai, semua dorongan searah, sehingga bola semakin kencang. Di jalur zig-zag, dorongan ke samping bergantian dan sebagian saling meniadakan, sementara dorongan ke depan terus menumpuk. Gambar berikut memperlihatkan sebuah jurang sempit: descent biasa zig-zag, sedangkan momentum 0,5 mencapai tujuan dengan lebih sedikit langkah.

[[figure:learning-rate-and-trouble/momentum-paths|Jurang sempit dan learning rate 0,15 yang sama, dengan dan tanpa momentum. Elips adalah garis kontur, seperti di pelajaran Gradient descent. Cincin menandai titik awal dan titik hitam besar adalah minimumnya. Dengan momentum, titik sudah berjarak 0,2 dari minimum setelah 9 langkah; descent biasa butuh 19.]]

Harganya: *overshoot*. Bola bisa melewati dasar lalu berayun balik, jadi loss naik-turun bergelombang. Ini terjadi jika momentumnya terlalu besar. Di sisi lain, momentum juga dapat membawa titik melewati gundukan kecil, hal yang tidak bisa dilakukan descent biasa dengan learning rate yang moderat.

::: deeper Momentum menggeser batasnya
Pada mangkuk dengan kelengkungan h, descent dengan momentum m (dari 0 sampai kurang dari 1) menetap jika lr × h < 2 × (1 + m). Dengan m = 0,5, itu berarti lr × h < 3, jadi parabola curam (h = 6) masih tahan sampai lr 0,5, bukan 1/3 seperti tanpa momentum. Dalam percobaan singkat, lr 0,45 dengan m = 0,5 konvergen, sedangkan lr 0,55 tidak.
:::

## Membaca grafik loss
*Bagaimana mengetahui apa yang salah jika lanskapnya tidak terlihat?*

Model sungguhan punya terlalu banyak parameter untuk digambar lanskapnya. Namun, kamu selalu dapat memplot **loss terhadap langkah**, yang di pelajaran ini kita sebut *loss history*, dan bentuk kurvanya langsung menunjukkan masalahnya. Tabel berikut merangkum semua yang sudah dibahas: learning rate, lembah, dan momentum.

[[figure:learning-rate-and-trouble/loss-curves|Loss terhadap langkah pada mangkuk yang sama dengan empat pengaturan. Tiga panel pertama menggunakan skala vertikal yang sama, sedangkan panel keempat skalanya sampai empat kali lebih tinggi. Panel ketiga menggunakan momentum dari bagian sebelumnya.]]

| Bentuk loss history | Kemungkinan penyebab | Coba terlebih dahulu |
|---|---|---|
| Turun pelan tetapi stabil, masih turun saat kamu berhenti, dan titik bergerak ke satu arah (periksa lintasannya) | Learning rate terlalu kecil | Naikkan, misalnya 3 kali lipat |
| Turun cepat, lalu mendatar di dekat dasar | Sudah cukup tepat | Pertahankan |
| Naik-turun bergelombang dan terus berulang | Momentum terlalu besar | Turunkan momentum atau learning rate-nya |
| Datar di posisi tinggi | Learning rate tepat di batas: titik memantul di antara dua tempat | Turunkan learning rate |
| Membesar di setiap langkah sampai angkanya terlalu besar untuk ditampung komputer | Learning rate melewati batas | Bagi learning rate dengan 10 |
| Datar, tetapi tidak rendah | Terjebak di lembah atau area datar | Ganti titik awal; tambahkan momentum |

> Awas: di mangkuk yang mulus, loss saja dapat menutupi learning rate yang terlalu besar. Pada lr 1,9, loss turun 19% setiap langkah (0,9 × 0,9 = 0,81) padahal x melompat dari sisi ke sisi, sehingga yang terlihat adalah penurunan pelan, bukan gelombang. Di mangkuk, descent biasa baru membuat loss bergelombang jika menggunakan momentum. Jika memungkinkan, lihat juga lintasannya, seperti yang dilakukan lab.

## Memilih learning rate dalam praktik
*Bagaimana memilih learning rate jika kelengkungannya tidak diketahui?*

Coba nilai-nilai pada **skala log**: 0,1; 0,03; 0,01; 0,003, dan seterusnya. Skala log mengatur jarak antarnilai berdasarkan rasio (di sini setiap nilai kira-kira sepertiga dari nilai sebelumnya), bukan selisih yang sama. Kelengkungan h tidak kamu ketahui di awal, dan batas 2 / h bisa sangat besar atau sangat kecil: kurva yang 10 kali lebih tajam butuh learning rate 10 kali lebih kecil. Tebakan dengan jarak sama (0,1; 0,2; 0,3) semuanya menumpuk di ujung atas rentang, sehingga jika learning rate yang tepat ada di sekitar 0,003, tidak satu pun yang mendekati. Gambar berikut memperlihatkan parabola curam, tempat satu langkah mengalikan jarak dengan 1 - 6 × lr.

[[figure:learning-rate-and-trouble/log-ladder|Learning rate pada sumbu log untuk parabola curam. Melewati 1/3, jaraknya justru membesar, bukan mengecil.]]

Resep yang umum digunakan: mulai dari learning rate yang sampai divergen, lalu turun satu per satu menyusuri tangga itu sampai loss turun dengan stabil, dan ambil yang terbesar yang masih stabil.

::: deeper Mengapa batas yang tepat jarang berguna, dan learning rate decay
Loss sungguhan tidak hanya memiliki satu nilai h. Lengkungannya berubah dari satu tempat ke tempat lain, jadi learning rate yang aman pun ikut berubah. Karena itu, orang mencoba learning rate secara langsung, bukan menghitung 2 / h, dan karena itu pula learning rate yang cocok di awal mungkin perlu dikecilkan kemudian.

**Learning rate decay** melakukannya dengan sengaja: langkah berani di awal, langkah hati-hati di akhir. Pada parabola dari x = 1 dengan lr 1,9, jika learning rate dikalikan 0,8 setelah setiap langkah, x berturut-turut 1; 8,6; 3,128; 5,404; 5,011. Tanpa decay, x setelah empat langkah adalah 2,3756 dan masih berayun. Lab ini tidak memiliki kontrol decay, tetapi kamu dapat membayangkannya sebagai menurunkan learning rate di tengah jalan.
:::

## Tiga kesalahan yang sering terjadi
*Apa yang sering keliru ketika pemula melakukan tuning?*

- **Menilai dari satu kali run.** Titik awal ikut menentukan hasil, seperti terlihat di kurva dua lembah. Coba beberapa titik awal terlebih dahulu sebelum menyimpulkan bahwa sebuah pengaturan itu buruk atau baik.
- **Mengubah banyak hal sekaligus.** Jika kamu mengubah learning rate, momentum, dan titik awal secara bersamaan lalu hasilnya membaik, kamu tidak tahu perubahan mana yang sebenarnya membantu. Ubah satu hal, bandingkan, lalu ubah yang berikutnya.
- **Berharap loss turun di setiap langkah.** Dengan momentum, atau dengan data yang berisik (*noisy*), loss bisa naik sesaat padahal tren keseluruhannya tetap turun. Nilailah trennya dari banyak langkah. Satu kenaikan kecil di antara banyak langkah yang turun itu wajar. Jika kenaikan muncul setiap beberapa langkah, kira-kira satu dari empat langkah atau lebih sering (pada titik ini lab mulai menandainya), itu sudah gelombang dan artinya momentum terlalu besar. Loss yang membesar di setiap langkah dan tidak pernah berbalik arah adalah hal lain: itu divergensi.

::: remember
- Langkahnya adalah lr × kemiringan. Di mangkuk dengan kelengkungan h, learning rate harus tetap di bawah 2 / h, jika tidak titik memantul lalu meledak. Cari learning rate pada skala log, dan ubah satu hal pada satu waktu.
- Baca loss history: turun lambat berarti naikkan learning rate, bergelombang berarti turunkan momentum atau learning rate, meledak berarti kecilkan learning rate menjadi sepersepuluhnya.
- Descent bisa terjebak di lembah lokal, sehingga titik awal itu penting. Momentum meredam zig-zag dan dapat melewati gundukan kecil, tetapi bisa juga mengalami overshoot.
:::

@@lab

## Lab: menggelinding menuruni kurva loss
Sebuah titik menggelinding menuruni kurva loss yang hanya memiliki satu parameter. Kamu menentukan seberapa berani setiap langkah, lalu melihat apa yang terjadi. Plot menampilkan kurva dengan nilai loss sebenarnya di sumbu kiri. Grafik di bawahnya menunjukkan loss terhadap langkah (loss history), dan kotak di atas plot memberikan diagnosis beserta alasannya.

### Kontrol
- **Kurva loss:** bentuk permukaan tempat titik menggelinding: Parabola (kelengkungan 1, menetap di bawah learning rate 2), Parabola curam (kelengkungan 6, menetap di bawah sekitar 0,33), atau Dua lembah (lembah dangkal dekat x = 2,15 dan lembah yang lebih dalam dekat x = 8,13).
- **Learning rate (skala log):** 0,001 sampai 2,5. Setiap geseran slider mengalikan learning rate dengan faktor yang sama. Nilainya tampil di samping label. Slider-nya memiliki 300 langkah kecil, jadi gunakan tombol panah untuk mendapatkan nilai yang persis.
- **Momentum:** 0 sampai 0,95. Pada 0, prosesnya gradient descent biasa.
- **Posisi awal:** 0 sampai 10. Kamu juga dapat mengklik atau menyeret di plot, atau menekan tombol panah saat plot sedang fokus.
- **Langkah:** jumlah langkah yang dijalani, 10 sampai 200.
- **Terlalu kecil, Pas, Terlalu besar, Kebablasan:** mengatur learning rate (dan momentum 0) sesuai kurva yang dipilih. Di Dua lembah, "Pas" adalah learning rate yang baik tetapi titik tetap terjebak.
- **Tampilkan jalur rencana:** panah samar di plot dan garis putus-putus di grafik memperlihatkan seluruh proses dari awal.
- **Grafik loss menggunakan skala log:** memplot logaritma dari loss. Otomatis menyala jika loss melewati 10.000.
- **Jalankan, Langkah sebelumnya, Langkah berikutnya, Kecepatan** untuk memutar proses. Mengubah kurva, learning rate, momentum, titik awal, atau langkah akan memulai ulang proses, dan memilih kurva juga mengatur titik awalnya, learning rate "Pas"-nya, dan momentum 0. Kedua toggle itu hanya menggambar ulang tampilan. **Reset** mengembalikan kurva, learning rate, momentum, titik awal, dan jumlah langkah ke semula, dan kedua toggle juga kembali ke bawaan (jalur rencana nyala, skala log mati).

Di plot, titik teal adalah titik awal dan cincin teal berlabel "terendah" adalah titik terendah kurva. Panah ungu adalah langkah-langkahnya, dan belah ketupat merah muda adalah posisi saat ini. Cincin merah muda berlabel "di luar plot" berarti titik sudah keluar dari rentang 0 sampai 10.

### Percobaan
1. Di Parabola, tekan **Pas** lalu **Jalankan**. Titik bergerak 1; 3; 4; 4,5; 4,75 dan diagnosisnya konvergen. Tekan **Terlalu kecil** dan jalankan lagi: setelah 30 langkah, x baru mencapai 2,04. Nyalakan skala log di grafik loss, maka loss berubah menjadi garis lurus yang turun landai, karena mengecil dengan faktor yang sama di setiap langkah.
2. Di Parabola, atur learning rate ke 1,9, lalu 2, lalu 2,1 dengan slider (tombol panah membantu). Pada 1,9 ayunannya mengecil. Pada 2, x memantul antara 1 dan 9 selamanya. Pada 2,1 diagnosisnya berubah menjadi divergen. Cocokkan dengan tabel di pelajaran.
3. Pindah ke Parabola curam, tekan **Kebablasan** (0,3), lalu **Terlalu besar** (0,4). Batasnya di sini 1/3, jadi 0,3 tepat di bawahnya: titik zig-zag tetapi tetap menetap. 0,4 sudah melewati batas, sehingga titik divergen. Padahal kedua angka itu masih aman di Parabola. Terakhir, coba **Pas** (0,15) dan perhatikan betapa cepat titik menetap.
4. Pindah ke Dua lembah, tekan **Pas**, lalu **Jalankan**. Titik berhenti di lembah dangkal dan diagnosisnya terjebak. Klik plot di sekitar x = 6 lalu jalankan lagi. Di mana titik berakhir?
5. Di Dua lembah, mulai dari x = 1, atur learning rate ke 0,7, momentum ke 0,9, dan Langkah ke 100. Apakah titik berhasil menggelinding melewati gundukan? Kembalikan momentum ke 0 dan bandingkan.
6. Di Parabola, atur learning rate ke 0,1 dan bandingkan momentum 0, 0,5, dan 0,9 pada 30 langkah. Mana yang paling cepat menetap? Mana yang membuat grafik loss terhadap langkah naik-turun bergelombang?
