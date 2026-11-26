---
slug: convolutions-and-cnns
title: Convolution dan CNN
---
::: intro
- Geser filter 3 × 3 di atas potongan gambar 5 × 5 dengan tangan, lalu baca feature map yang dihasilkan sebagai pendeteksi tepi.
- Ikuti perjalanan sebuah gambar melewati convolution, pooling, dan layer dense, lalu hitung weight sebuah CNN kecil dan bandingkan dengan jaringan dense biasa.
- Hitung receptive field, dan jelaskan mengapa weight sharing membutuhkan jauh lebih sedikit weight.

Sebelum mulai: baca "Neuron dan backpropagation" dan "Aktivasi, inisialisasi, dan optimizer" di kursus Neural network fundamentals. CNN dibangun dari neuron, aktivasi ReLU, dan langkah gradient yang sudah kamu temui di sana.
:::

## Mengapa gambar bukan satu baris tabel
*Apa yang salah jika piksel diberikan ke model sebagai kolom?*

Semua model dalam pelajaran data tabular membaca tabel: satu baris untuk setiap contoh, satu kolom untuk setiap feature. Panjang flipper dan kedalaman paruh tidak punya posisi. Tukar dua kolom di semua baris, dan model linear, k-NN, atau decision tree mempelajari hal yang sama.

Gambar berbeda. Gambar abu-abu 28 × 28 adalah 784 nilai kecerahan pada sebuah grid. Grid itu dapat diratakan menjadi satu baris berisi 784 kolom, tetapi piksel yang tepat di bawah sebuah piksel kini berjarak 28 kolom, dan model tidak diberi tahu soal itu.

Ada dua akibatnya. Pertama, informasi berada pada **piksel yang bertetangga**: tepi adalah tempat tetangga saling berbeda, dan satu piksel saja hampir tidak mengatakan apa-apa. Kedua, digit yang sama dapat bergeser dua piksel ke kanan, dan hampir semua dari 784 kolom berubah nilainya. Model dengan satu weight per kolom harus mempelajari digit itu lagi untuk setiap posisi.

[[figure:convolutions-and-cnns/pixels-not-columns|49 piksel yang sama, dengan tetangga tetap berdekatan lalu diacak. Model yang menganggap kolom saling lepas tidak dapat membedakan keduanya; manusia dapat.]]

> Gagasan kunci: jaringan konvolusional dirancang untuk memanfaatkan dua fakta tentang gambar: piksel yang berdekatan saling berkaitan, dan sebuah pola punya arti yang sama di mana pun ia muncul.

## Filter kecil yang bergeser
*Apa yang dihitung oleh sebuah convolution?*

**Filter** (disebut juga kernel) adalah grid kecil berisi weight, di sini 3 × 3. Cara memakainya: letakkan filter di atas window 3 × 3 dari gambar, kalikan setiap weight dengan piksel di bawahnya, lalu jumlahkan kesembilan hasil kalinya. Jumlah itu adalah satu angka. Geser filter satu piksel ke kanan dan ulangi, lalu turun satu baris, sampai setiap window terpakai.

Window bergeser satu piksel setiap kali, langkah yang disebut **stride**. Grid hasil penjumlahan itu adalah sebuah **feature map**. Pada potongan 5 × 5, filter 3 × 3 muat di 5 - 3 + 1 = 3 posisi ke samping dan 3 posisi ke bawah, sehingga feature map-nya 3 × 3. Pada gambar selebar n piksel, filter selebar k menghasilkan n - k + 1 posisi.

Ini neuron yang sudah kamu kenal: jumlah berbobot dari input. Ada dua hal baru. Neuron hanya melihat window yang kecil, dan weight yang sama dipakai ulang di setiap window.

> Awas: pinggiran gambar hilang. Agar peta tetap seukuran gambar, library dapat menambahkan bingkai angka nol lebih dulu (**padding**). Dalam pelajaran ini tidak ada padding.

## Pendeteksi tepi dengan tangan
*Bagaimana sembilan weight dapat menemukan sebuah tepi?*

Ambil potongan di bawah, dengan kecerahan dari 0 (gelap) sampai 9 (terang): gelap di kiri, terang di kanan, dengan sedikit noise. Filter-nya berisi -1 di kolom kiri, 0 di tengah, dan 1 di kolom kanan. Karena itu setiap window mendapat (kolom kanan) - (kolom kiri), yang besar jika sisi kanan lebih terang daripada sisi kiri.

> Contoh hitungan: window kiri atas berisi baris (1, 1, 2), (0, 1, 1), dan (1, 0, 2). Hasil kali per baris adalah -1 + 0 + 2 = 1, 0 + 0 + 1 = 1, dan -1 + 0 + 2 = 1, sehingga jumlahnya 3. Satu langkah ke kanan, window berisi (1, 2, 8), (1, 1, 9), (0, 2, 8). Kolom kanan berjumlah 8 + 9 + 8 = 25, kolom kiri 1 + 1 + 0 = 2, dan hasilnya 25 - 2 = 23.

Menghitung kesembilan window menghasilkan feature map [3, 23, 22], [3, 24, 22], [1, 24, 23]. Angka-angka besar berada tepat di tempat window melintasi tepi.

[[figure:convolutions-and-cnns/sliding-filter|Filter tepi vertikal 3 × 3 pada potongan 5 × 5. Window yang diberi garis tepi menghasilkan 25 - 2 = 23 pada sel feature map yang diberi garis tepi.]]

Balik potongan itu menurut diagonalnya (tukar baris dan kolom) sehingga tepinya membentang dari kiri ke kanan, gelap di atas dan terang di bawah, dan filter yang sama hanya menghasilkan 0 dan -1 di seluruh peta: ia buta terhadap tepi horizontal. Tepi dari terang ke gelap justru menghasilkan angka negatif yang besar.

> Awas: filter ini ditulis tangan untuk keperluan belajar. Dalam CNN tidak ada yang memilih sembilan angkanya. Angka itu dimulai secara acak dan dilatih seperti weight lainnya.

## Feature map dan pooling
*Bagaimana satu layer menggabungkan banyak filter, dan apa tambahan dari pooling?*

Satu filter menemukan satu pola. **Layer convolution** memakai banyak filter pada input yang sama, misalnya 8, masing-masing dengan weight sendiri. Hasilnya 8 feature map yang ditumpuk seperti kanal warna sebuah foto. Setelah itu sebuah aktivasi, biasanya ReLU, mengubah respons negatif menjadi 0, sehingga sebuah peta berkata "seberapa kuat pola ini ada di sini?".

**Pooling** memperkecil peta. Pada max pooling 2 × 2, peta dipotong menjadi blok 2 × 2 yang tidak saling tumpang tindih, dan hanya angka terbesar di setiap blok yang disimpan. Ambil peta 4 × 4 ini dari potongan lain:

| 3 | 23 | 22 | 1 |
| --- | --- | --- | --- |
| 3 | 24 | 22 | 0 |
| 1 | 2 | 5 | 21 |
| 0 | 1 | 20 | 23 |

Keempat bloknya punya maksimum 24, 22, 2, dan 23, sehingga peta hasil pooling berukuran 2 × 2: [24, 22], [2, 23]. Tinggi dan lebarnya separuh, jadi tersisa seperempat angka, dan pooling tidak punya weight yang perlu dilatih. Pooling juga mentoleransi pergeseran kecil: jika respons yang kuat bergeser satu piksel di dalam bloknya, maksimum blok itu tidak berubah.

> Gagasan kunci: convolution bertanya "di mana pola ini?", dan pooling menjawab "kira-kira di sini" dengan data yang lebih sedikit.

## Menumpuk menjadi CNN
*Seperti apa jaringan utuh yang terdiri dari layer-layer ini?*

**Convolutional neural network (CNN)** menumpuk bagian-bagian itu: convolution (dengan ReLU), pooling, convolution, pooling, lalu sebuah layer dense. Berikut yang kecil untuk digit abu-abu 28 × 28. Convolution pertama punya 8 filter 3 × 3 dan menghasilkan 26 × 26 × 8 angka. Pooling menjadikannya 13 × 13 × 8. Convolution kedua punya 16 filter, dan setiap filter membaca ke-8 peta sekaligus (ukurannya 3 × 3 × 8), menghasilkan 11 × 11 × 16. Pooling memberi 5 × 5 × 16, karena 11 ganjil dan pooling membuang baris dan kolom terakhir. Ratakan menjadi 400 angka, lalu layer dense mengubahnya menjadi 10 skor, satu untuk setiap digit.

[[figure:convolutions-and-cnns/cnn-pipeline|CNN kecil untuk gambar abu-abu 28 × 28: bentuk data setelah setiap layer, dan jumlah weight di setiap layer.]]

Filter awal cenderung menanggapi hal sederhana seperti tepi, dan filter yang lebih dalam menggabungkannya menjadi bagian yang lebih besar. Convolution dan pooling membangun sebuah representasi dari gambar, seperti di "Embedding dan autoencoder", dan layer dense di akhir melakukan klasifikasi dari representasi itu.

## Menghitung weight
*Mengapa CNN membutuhkan weight yang begitu sedikit?*

Hitung setiap layer: jumlah filter × (tinggi × lebar filter × kanal input), ditambah satu bias untuk setiap filter.

| Layer | Weight | Bias | Total |
| --- | --- | --- | --- |
| Convolution 1 | 8 × (3 × 3 × 1) = 72 | 8 | 80 |
| Convolution 2 | 16 × (3 × 3 × 8) = 1.152 | 16 | 1.168 |
| Dense | 400 × 10 = 4.000 | 10 | 4.010 |

Seluruh jaringan punya 80 + 1.168 + 4.010 = 5.258 parameter. Bandingkan dengan layer dense yang menghasilkan 26 × 26 × 8 = 5.408 angka yang sama dari 784 piksel: ia membutuhkan 784 × 5.408 = 4.239.872 weight, dibanding 72 untuk convolution, sekitar 58.900 kali lipat. Jaringan biasa dengan satu hidden layer berisi 128 neuron (784 input, 10 output) punya 784 × 128 + 128 + 128 × 10 + 10 = 101.770 parameter, sekitar 19 kali CNN tadi.

Penghematannya berasal dari **weight sharing**: 9 weight milik sebuah filter dipakai di semua 26 × 26 = 676 window, sehingga pola yang dipelajari sekali dapat ditemukan di mana saja.

> Awas: weight yang lebih sedikit tidak berarti hitungan yang lebih sedikit. Convolution pertama tetap melakukan 676 × 9 × 8 = 48.672 perkalian untuk satu gambar.

## Receptive field
*Seberapa banyak gambar yang dapat dilihat oleh satu angka?*

**Receptive field** sebuah angka adalah persegi piksel input yang dapat mengubahnya. Satu convolution 3 × 3 memberi field 3 × 3. Tumpuk convolution kedua: setiap angkanya membaca 3 × 3 angka dari peta pertama, yang bersama-sama mencakup 5 × 5 piksel. Convolution ketiga memberi 7 × 7. Setiap layer 3 × 3 yang ditumpuk melebarkan field sebesar 2.

Pooling melebarkannya lebih cepat. Lacak dua hal: field `rf` dan **jump**, yaitu jarak dalam piksel antara angka-angka bertetangga di sebuah layer (1 pada awalnya). Layer dengan ukuran kernel k memperbesar field menjadi `rf + (k - 1) × jump`, dan pooling dengan stride 2 menggandakan jump.

| Layer | Field | Jump |
| --- | --- | --- |
| Convolution 1 (k = 3) | 1 + 2 × 1 = 3 | 1 |
| Pooling 1 (k = 2, stride 2) | 3 + 1 × 1 = 4 | 2 |
| Convolution 2 (k = 3) | 4 + 2 × 2 = 8 | 2 |
| Pooling 2 (k = 2, stride 2) | 8 + 1 × 2 = 10 | 4 |

[[figure:convolutions-and-cnns/receptive-field|Persegi dari gambar 28 × 28 yang dapat dilihat satu angka setelah setiap layer CNN kecil itu.]]

Masing-masing dari 400 angka yang keluar dari pooling terakhir melihat potongan 10 × 10. Layer dense lalu melihat ke-400 angka itu sekaligus, sehingga ia dapat menggabungkan potongan-potongan tersebut.

## Langkah berikutnya
*Apa yang masih dapat salah pada CNN, dan di mana kamu mengujinya?*

CNN mempelajari filter-nya dengan siklus yang sama seperti jaringan lain: forward pass, loss, backpropagation, update. Sebuah weight bersama mendapat gradient dari setiap window tempat ia dipakai.

Apa yang dipelajari berasal dari gambar yang pernah dilihatnya. Jaringan yang dilatih pada digit yang terang dan tegak dapat gagal pada digit yang redup atau miring, karena convolution hanya mentoleransi pergeseran kecil. Pelajaran berikutnya di kursus ini membahas augmentation, transfer learning, dan metrik untuk deteksi, yang biasanya menjadi jawabannya. **Vision lab**, pelajaran terakhir kursus ini, memungkinkan kamu melatih dengan augmentation lalu menguji pada perubahan pencahayaan dan orientasi.

::: deeper Convolution atau cross-correlation?
Convolution sejati membalik filter sebelum menggesernya. Library CNN melewatkan pembalikan itu dan menggeser filter apa adanya, yang secara tepat disebut cross-correlation, tetapi semua orang menyebutnya convolution. Pembalikan itu tidak berpengaruh dalam praktik: weight-nya dipelajari, sehingga pelatihan akan menemukan filter yang terbalik jika itulah yang berguna.
:::

::: deeper Ukuran output dengan padding dan stride
Untuk input selebar n, kernel k, padding p (bingkai angka nol di setiap sisi), dan stride s, lebar outputnya floor((n + 2p - k) / s) + 1. Untuk n = 28 dan k = 3: stride 1 tanpa padding memberi 26; padding 1 memberi (28 + 2 - 3) / 1 + 1 = 28, sama dengan input; stride 2 tanpa padding memberi floor(25 / 2) + 1 = 13.
:::

::: deeper Gradient sebuah weight bersama
Weight filter dipakai di setiap window, sehingga perubahan padanya menggeser loss lewat banyak jalur, satu jalur untuk setiap window. Aturan rantai dari "Neuron dan backpropagation" memberi gradient untuk tiap jalur, dan gradient weight bersama adalah jumlah semuanya. Backpropagation melakukan penjumlahan ini secara otomatis.
:::

::: remember
- Piksel yang bertetangga membawa informasi. Filter adalah grid kecil berisi weight yang digeser di atas gambar, dan grid hasil penjumlahannya adalah feature map.
- CNN menumpuk convolution, ReLU, dan pooling, lalu layer dense. Weight sharing memberi CNN kecil di sini 5.258 weight, sedangkan satu layer dense pada piksel yang sama membutuhkan jutaan.
- Setiap layer memperluas apa yang dapat dilihat satu angka: receptive field tumbuh pada setiap convolution dan lebih cepat dengan pooling.
:::
