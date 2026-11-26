---
slug: neurons-and-backpropagation
title: Neuron dan backpropagation
---
::: intro
- Hitung output satu neuron: jumlah berbobot ditambah bias, lalu dilewatkan ke sebuah fungsi aktivasi.
- Jalankan forward pass pada network 2-2-1 secara manual, lalu cari gradient satu weight dengan aturan rantai.
- Jelaskan mengapa lapisan hidden membuat network mampu membentuk batas yang melengkung, dengan masalah XOR sebagai contoh.

Sebelum mulai: baca "Log loss dan proses fitting" dan "Gradient descent".
:::

## Sebuah neuron
*Apa yang dihitung oleh satu neuron?*

Kamu sudah pernah bertemu dengannya. Regresi logistik menghitung skor `z = w1 × x1 + w2 × x2 + b`, lalu memerasnya dengan sigmoid menjadi probabilitas. Sebuah **neuron** adalah unit yang sama: **jumlah berbobot ditambah bias**, disusul sebuah **fungsi aktivasi** yang dikenakan pada skor itu. Jika aktivasinya f, output neuron adalah `a = f(z)`. Bobot (weight) dan bias disebut **parameter**, yaitu tuas yang diputar saat training.

Ambil neuron dengan weight 0,8 dan 0,2 serta bias -0,4, yang membaca input x1 = 1 dan x2 = 2. Skornya z = 0,8 × 1 + 0,2 × 2 - 0,4 = 0,8. Dengan sigmoid sebagai aktivasi, output-nya a = sigmoid(0,8) = 0,69.

[[figure:neurons-and-backpropagation/neuron|Satu neuron pada angka nyata: input dikali weight, ditambah bias, menghasilkan skor z; sigmoid mengubah z menjadi output a.]]

> Gagasan kunci: neuron adalah dua langkah regresi logistik, yaitu skor linear lalu pemerasan. Yang baru bukan neuronnya, melainkan kenyataan bahwa output sebuah neuron dapat menjadi input neuron lain.

## Lapisan dan multilayer perceptron
*Bagaimana neuron-neuron disambungkan menjadi sebuah network?*

Satu **lapisan** (layer) adalah sekelompok neuron yang membaca input yang sama. **Multilayer perceptron** (MLP) menumpuk beberapa lapisan: **lapisan input** hanyalah feature, satu atau lebih **lapisan hidden** menghitung nilai baru dari feature itu, dan **lapisan output** memberikan prediksi. Setiap neuron membaca semua output lapisan sebelumnya, dan tidak ada yang kembali ke belakang, sehingga angka mengalir satu arah: maju.

Sebuah network dinamai menurut ukuran lapisannya. Network 2-2-1 punya 2 input, 2 neuron hidden, dan 1 neuron output. Hitung parameternya: tiap neuron hidden punya 2 weight dan 1 bias, jadi 2 × 3 = 6 angka, dan neuron output punya 2 weight dan 1 bias, jadi 3 angka lagi. Totalnya 9 parameter.

Output neuron hidden bukan jawaban yang dibaca siapa pun. Ia adalah **feature yang dibangun network untuk dirinya sendiri**, dan lapisan berikutnya memakainya seperti regresi logistik memakai kolom pada tabel. Training-lah yang menentukan feature seperti apa yang dibutuhkan.

> Awas: "hidden" tidak berarti rahasia. Artinya lapisan itu bukan input dan bukan output, sehingga kamu tidak pernah mengatur nilainya secara langsung.

## Forward pass dengan hitungan manual
*Bagaimana input berubah menjadi satu prediksi?*

**Forward pass** menghitung network lapisan demi lapisan, dari input sampai output. Pakai network 2-2-1 di bawah, dengan sigmoid di setiap neuron. Parameternya diberi nama begini: `w11` dan `w12` adalah weight dari x1 dan x2 ke neuron hidden 1, `w21` dan `w22` weight ke neuron hidden 2, `b1` dan `b2` bias keduanya, `v1` dan `v2` weight dari neuron hidden ke neuron output, dan `c` bias neuron output. Inputnya x1 = 1 dan x2 = 2, dan label sebenarnya y = 1. Simpan empat angka desimal di setiap langkah.

| Langkah | Hitungan | Hasil |
|---|---|---|
| Hidden 1, skor | 0,5 × 1 + (-0,3) × 2 + 0,3 | z1 = 0,2 |
| Hidden 1, output | sigmoid(0,2) | h1 = 0,5498 |
| Hidden 2, skor | 0,8 × 1 + 0,2 × 2 - 0,4 | z2 = 0,8 |
| Hidden 2, output | sigmoid(0,8) | h2 = 0,6900 |
| Output, skor | 1,2 × 0,5498 + (-0,7) × 0,6900 + 0,05 | z = 0,2268 |
| Output, prediksi | sigmoid(0,2268) | p = 0,5565 |
| Loss | -ln(0,5565) | 0,586 |

[[figure:neurons-and-backpropagation/network|Network 2-2-1 lengkap dengan setiap weight dan bias, serta nilai-nilai forward pass untuk input (1, 2).]]

Network memberi 0,5565 untuk label 1. Itu "ya" yang lemah, dan log loss-nya 0,586, dihitung seperti pada "Log loss dan proses fitting". Training akan berusaha menurunkannya.

## Aturan rantai
*Bagaimana perubahan di bagian dalam network sampai ke loss?*

Training membutuhkan gradient loss untuk setiap parameter: kemiringan yang kamu temukan dengan menggeser satu tuas sedikit, seperti pada "Gradient dan permukaan loss". Namun `w11` tidak menyentuh loss secara langsung. Pergeserannya menggerakkan z1, lalu h1, lalu skor output z, lalu p, lalu loss.

**Aturan rantai** (*chain rule*) berkata bahwa kemiringan seluruh rantai adalah hasil kali kemiringan tiap mata rantainya. Jika u = 2x + 1 dan y = 3u, menggeser x sebesar 1 menggerakkan u sebesar 2 dan y sebesar 3 × 2 = 6.

Untuk `w11`, tiap mata rantai punya kemiringan lokal yang sederhana:

- z1 = w11 × x1 + w12 × x2 + b1, jadi z1 berubah mengikuti w11 dengan laju x1.
- h1 = sigmoid(z1), yang kemiringannya h1 × (1 - h1).
- z = v1 × h1 + v2 × h2 + c, jadi z berubah mengikuti h1 dengan laju v1.
- Dari z ke depan, sigmoid dan log loss bersama-sama memiliki kemiringan p - y, seperti pada "Log loss dan proses fitting".

> Gagasan kunci: gradient sebuah parameter yang letaknya dalam adalah hasil kali kemiringan lokal, satu untuk setiap mata rantai antara parameter itu dan loss.

## Backpropagation pada satu weight
*Berapa gradient w11 jika dihitung manual?*

Mulai dari loss, lalu berjalan mundur sambil mengalikan. Simpan empat angka desimal.

> Contoh hitungan: **Langkah 1.** Loss berubah mengikuti skor output z dengan laju p - y = 0,5565 - 1 = -0,4435.

> Contoh hitungan: **Langkah 2.** z membaca h1 lewat v1 = 1,2, jadi loss berubah mengikuti h1 dengan laju -0,4435 × 1,2 = -0,5322.

> Contoh hitungan: **Langkah 3.** h1 memiliki kemiringan 0,5498 × (1 - 0,5498) = 0,2475, jadi loss berubah mengikuti z1 dengan laju -0,5322 × 0,2475 = -0,1317.

> Contoh hitungan: **Langkah 4.** z1 berubah mengikuti w11 dengan laju x1 = 1, sehingga gradient w11 adalah -0,1317 × 1 = -0,1317.

[[figure:neurons-and-backpropagation/chain|Rantai dari w11 ke loss. Forward pass mengisi baris atas; backward pass mengalikan satu kemiringan lokal pada tiap panah dan mengisi baris bawah.]]

Tanda negatif berarti menaikkan `w11` menurunkan loss. Kamu bisa mengujinya, seperti sebelumnya pada gradient: naikkan `w11` dari 0,5 menjadi 0,501, lalu ulangi seluruh forward pass dengan presisi penuh. Loss berubah sekitar -0,00013, yaitu kemiringan sekitar -0,13 per satuan `w11`, dan itu cocok. Dengan learning rate 0,5, pembaruannya adalah 0,5 - 0,5 × (-0,1317) = 0,5659.

## Mengapa backpropagation berjalan mundur
*Mengapa mulai dari loss dan bukan dari weight?*

Perjalanan tadi meninggalkan bagian yang dipakai bersama. Kemiringan pada z, yaitu -0,4435, menjadi awal rantai untuk setiap parameter. Kemiringan pada z1, yaitu -0,1317, melayani `w11`, `w12`, dan `b1` sekaligus, karena mata rantai terakhir mereka hanya berbeda pada x1 = 1, x2 = 2, dan 1 untuk bias. Saat berjalan mundur, tiap faktor dihitung sekali lalu dipakai ulang.

| Neuron | Weight pertama | Weight kedua | Bias |
|---|---|---|---|
| Hidden 1 | w11: -0,132 | w12: -0,263 | b1: -0,132 |
| Hidden 2 | w21: 0,066 | w22: 0,133 | b2: 0,066 |
| Output | v1: -0,244 | v2: -0,306 | c: -0,444 |

Satu forward pass ditambah satu backward pass menghasilkan kesembilan gradient. Menggeser tiap parameter lalu mengulang forward pass akan memerlukan sembilan forward pass, padahal network sungguhan punya ribuan parameter atau lebih. **Backpropagation** adalah ini: aturan rantai yang diterapkan mundur dari loss, satu lapisan demi satu lapisan.

Kurangkan learning rate dikali gradient dari setiap parameter. Dengan 0,5, satu langkah menaikkan p dari 0,5565 menjadi 0,684 dan menurunkan loss dari 0,586 menjadi 0,380.

> Awas: `w21` dan `w22` punya gradient positif, meskipun labelnya 1. Neuron hidden 2 sampai ke output lewat v2 = -0,7, sehingga ia menentang label, dan training menurunkan weight-nya.

## Mengapa kedalaman membuat network bisa melengkung
*Apa yang dapat dilakukan lapisan hidden yang tidak bisa dilakukan satu neuron?*

Satu neuron membelah input dengan garis lurus, yaitu tempat z = 0. Itu gagal pada **XOR**: label bernilai 1 jika tepat satu dari x1 dan x2 bernilai 1. Titik (0, 0) dan (1, 1) berlabel 0, sedangkan (0, 1) dan (1, 0) berlabel 1, dan tidak ada garis lurus yang memisahkannya (lipatan pertama di bawah menunjukkan alasannya).

Lapisan hidden memperbaikinya. Atur sebuah network 2-2-1 dengan tangan: h1 = sigmoid(10 x1 + 10 x2 - 5) menyala jika setidaknya satu input menyala, h2 = sigmoid(10 x1 + 10 x2 - 15) menyala hanya jika keduanya menyala, dan output p = sigmoid(10 h1 - 10 h2 - 5) berkata "h1 menyala, h2 padam".

| x1 | x2 | h1 | h2 | p | Label |
|---|---|---|---|---|---|
| 0 | 0 | 0,01 | 0,00 | 0,01 | 0 |
| 0 | 1 | 0,99 | 0,01 | 0,99 | 1 |
| 1 | 0 | 0,99 | 0,01 | 0,99 | 1 |
| 1 | 1 | 1,00 | 0,99 | 0,01 | 0 |

Untuk (0, 1): z1 = 5 memberi h1 = 0,9933, z2 = -5 memberi h2 = 0,0067, dan skor output 9,933 - 0,067 - 5 = 4,87, sehingga p = 0,99.

[[figure:neurons-and-backpropagation/xor|XOR pada input, tempat tidak ada garis yang cocok, dan pada feature hidden (h1, h2), tempat garis neuron output memisahkan kedua label.]]

> Gagasan kunci: lapisan hidden mengubah koordinat. Neuron output tetap membelah dengan garis lurus, tetapi di ruang (h1, h2), tempat kedua label dapat dipisahkan. Pada input aslinya, belahan itu menjadi batas yang melengkung.

## Setelah ini
*Bagaimana satu langkah gradient menjadi network yang sudah dilatih?*

Kamu baru menghitung satu langkah gradient pada satu contoh. Training mengulanginya pada banyak contoh dan banyak putaran data: forward pass, loss, backward pass, pembaruan. Itulah loop pada "Gradient descent", dengan backpropagation yang menyediakan gradient-nya.

Beberapa pilihan dilewati. Sigmoid adalah satu-satunya aktivasi di sini, dan pelajaran berikutnya, "Aktivasi, inisialisasi, dan optimizer", membahas aktivasi lain, weight awal, dan aturan pembaruan yang lebih baik daripada langkah biasa. Setelah itu **network lab**, pelajaran terakhir kursus ini, melatih network kecil pada dataset nonlinear dan memungkinkan kamu memeriksa nilai aktivasi dan gradient-nya, dua hal yang di sini kamu hitung dengan tangan.

::: deeper Mengapa satu neuron tidak bisa mengerjakan XOR
Misalkan sebuah neuron dengan weight w1, w2 dan bias b memberi label 1 jika skornya di atas 0 dan label 0 jika di bawah 0. Keempat titik XOR lalu menuntut: b < 0 untuk (0, 0); w1 + w2 + b < 0 untuk (1, 1); w1 + b > 0 untuk (1, 0); w2 + b > 0 untuk (0, 1). Jumlahkan dua syarat terakhir: w1 + w2 + 2b > 0. Tetapi dua syarat pertama berkata w1 + w2 + b < 0 dan b < 0, sehingga w1 + w2 + 2b < 0. Kedua pernyataan itu bertentangan, jadi weight seperti itu tidak ada.
:::

::: deeper Mengapa aktivasi tidak boleh dilewati
Tanpa aktivasi, sebuah neuron hidden hanyalah jumlah berbobot. Ambil h = 2x + 1 dan output 3h - 2. Keduanya bersama-sama memberi 3 × (2x + 1) - 2 = 6x + 1, yang bisa dikerjakan satu neuron linear sendirian. Berapa pun lapisan yang kamu tumpuk, langkah-langkah linear melebur menjadi satu langkah linear. Lekukan datang dari aktivasi.
:::

::: deeper Dari mana kemiringan h × (1 - h) berasal
Sigmoid adalah h = 1 / (1 + e^(-z)). Kemiringannya e^(-z) / (1 + e^(-z))^2. Karena 1 - h = e^(-z) / (1 + e^(-z)), hasilnya sama dengan h × (1 - h). Pada z = 0, h = 0,5 dan kemiringannya 0,25, yang terbesar yang pernah dicapai. Pada h = 0,8 kemiringannya hanya 0,16.
:::

::: remember
- Neuron adalah jumlah berbobot ditambah bias yang dilewatkan ke fungsi aktivasi. Satu lapisan adalah neuron yang berdampingan, dan MLP menumpuk lapisan.
- Forward pass menghitung prediksi. Backpropagation mengalikan kemiringan lokal dengan aturan rantai, dari loss mundur ke tiap parameter, dengan memakai ulang faktor yang dipakai bersama.
- Satu neuron membelah dengan garis lurus. Lapisan hidden menggambarkan ulang input sehingga belahan lurus lapisan berikutnya menjadi batas yang melengkung, dan begitulah XOR menjadi dapat dipecahkan.
:::
