---
slug: ensemble-lab
title: Lab ensemble
---
::: intro
- Prediksikan ensemble mana yang mulai overfitting saat kamu menambah tree, bagging atau boosting, lalu periksa tebakanmu di lab Ensemble.
- Baca kurva training dan validation terhadap jumlah tree, dan temukan titik early stopping.
- Jelaskan bagaimana learning rate, kedalaman tree boosting, dan noise menggeser titik itu, lalu ulangi pengujiannya pada penguin nyata dengan sampel baru.

Sebelum mulai: baca "Bagging dan random forest" serta "Gradient boosting" di kursus ini.
:::

## Apa yang dibandingkan lab ini
*Apa yang kamu bandingkan ketika menambah tree satu per satu?*

"Gradient boosting" berakhir dengan tiga pertanyaan. Saat tree bertambah, apakah galat validation bagging terus turun atau malah naik? Bagaimana dengan boosting? Mana yang punya jarak lebih lebar antara training dan validation? Lab Ensemble menjawab ketiganya.

Lab ini menggambar 200 titik dari dua kelas, yaitu dua bulan sabit yang dibuat berbaur oleh Noise sebesar 0,35, lalu membaginya dua. 100 titik melatih tree; 100 titik lainnya, yaitu titik validasi, hanya dipakai untuk memeriksanya. Kedua ensemble dilatih satu kali sampai 100 tree. **Bagging** menumbuhkan tree yang dalam (sampai kedalaman 8, dengan minimal 3 titik di setiap leaf) pada bootstrap sample, lalu merata-ratakannya. **Boosting** menambahkan tree berkedalaman 3 dengan learning rate 0,5, dan tiap tree memperbaiki tree sebelumnya.

Sebuah sakelar di lab mengubah sisi bagging menjadi random forest (lihat "Bagging dan random forest"); eksperimen memakainya satu kali. Slider **Jumlah pohon** hanya menentukan berapa dari 100 tree itu yang ikut memberi suara, sehingga ia tidak pernah melatih ulang apa pun. Lab menilai kedua ensemble dengan **log loss** dari "Log loss dan proses fitting" dan dengan error rate, pada titik training dan titik validasi. Semakin kecil semakin baik.

## Menambah tree secara bertahap
*Apa yang berubah di layar antara 1 tree, 3, 10, dan 100?*

Warna latar menunjukkan prediksi tiap ensemble: semakin pekat, semakin yakin prediksinya. Titik-titiknya adalah titik training. Bandingkan kolom 1 tree dengan kolom 10 tree: satu tree bagging punya daerah bertepi tajam dengan warna paling pekat hampir di mana-mana, sedangkan warna boosting lebih lembut. Lalu lihat kolom 100 tree dan tanyakan apakah boosting menggambar pulau-pulau kecil di sekitar satu titik training. Angka di bawah tiap panel adalah error rate pada titik validasi, dan tabel di bawahnya memberi log loss untuk panel yang sama.

[[figure:ensemble-lab/tree-by-tree|Bagging dan boosting pada sampel bawaan lab dengan 1, 3, 10, dan 100 tree. Angka di bawah tiap panel adalah error rate pada 100 titik validasi.]]

| Tree | Bagging: log loss training / validation | Boosting: log loss training / validation |
| --- | --- | --- |
| 1 | 1,11 / 4,96 | 0,43 / 0,44 |
| 3 | 0,11 / 0,63 | 0,20 / 0,28 |
| 10 | 0,11 / 0,62 | 0,03 / 0,25 |
| 100 | 0,08 / 0,54 | 0,00 / 1,02 |

Log loss validation pada bagging mulai dari angka yang sangat besar, turun cepat, lalu nyaris tidak bergerak. Pada boosting ia mulai rendah, mencapai 0,25 pada 10 tree, lalu naik sampai 1,02 sementara log loss training-nya turun ke 0,00. Ke-100 titik training yang sama dicocokkan makin ketat, dan titik validasi menanggung akibatnya.

## Satu tree bagging terlalu yakin
*Mengapa satu tree bagging mendapat nilai log loss yang begitu buruk?*

Satu tree yang dalam salah pada 23 dari 100 titik validasi, error rate 23,0%, tetapi log loss validation-nya 4,96. Leaf yang hanya berisi satu kelas memberi probabilitas 1 pada kelas itu dan 0 pada kelas lainnya, dan log loss menghukum keras kesalahan yang disertai keyakinan tinggi.

> Contoh hitungan: 14 dari 23 kesalahan jatuh di leaf yang hanya berisi kelas lain, sehingga kelas yang benar mendapat probabilitas 0. Log loss memotongnya ke 1e-15, dan -ln(1e-15) = 34,54. Ke-14 titik itu menyumbang 14 × 34,54 / 100 = 4,84, hampir seluruh dari 4,96. Titik salah yang kelas benarnya mendapat probabilitas 0,25 hanya berbiaya -ln(0,25) = 1,39.

Perata-rataan mengatasi hal ini. Dengan 3 tree, leaf-leaf itu tidak sepakat, sehingga rata-ratanya berada di antara 0 dan 1, dan log loss validation turun ke 0,63. Itulah tugas bagging di sini: mengubah suara yang yakin tetapi tidak stabil menjadi probabilitas yang lebih stabil.

::: deeper Mengapa grafik memotong nilai
Grafik lab mentok di log loss 2, atau di error rate 60%. Nilai di atas batas itu digambar sebagai segitiga beserta angkanya, sehingga angka 4,96 dari satu tree bagging tidak meratakan bagian grafik yang lain.
:::

## Dua kurva, dua cerita
*Apa yang dilakukan kurva validation pada tiap metode?*

Sekarang biarkan tree menumpuk. Garis penuh adalah log loss validation dan garis putus-putus adalah log loss training.

[[figure:ensemble-lab/two-curves|Log loss training (putus-putus) dan validation (penuh) terhadap jumlah tree pada sampel bawaan. Lingkaran menandai tempat log loss validation boosting paling rendah.]]

Kurva validation boosting turun ke 0,21 pada 8 tree, lalu berbalik naik: 0,31 pada 20 tree, 0,94 pada 50, dan 1,02 pada 100. Kurva training-nya terus turun sampai 0,00. Setiap tree baru mencocokkan titik training sedikit lebih baik, dan sejak sekitar lingkaran itu, tree tambahan terutama mencocokkan noise.

Kurva validation bagging mendatar: 0,59 pada 20 tree dan 0,54 pada 50 maupun pada 100, dengan nilai terendah 0,53 pada 79 tree. Ada jarak antara training (0,08) dan validation (0,54), tetapi jarak itu tidak melebar saat tree bertambah.

> Awas: ini satu sampel dengan pengaturan bawaan. Kuis Cepat di lab memakai aturan: log loss validation pada 100 tree yang lebih dari 0,02 di atas nilai terendahnya dihitung sebagai "naik lagi". Sampel dan pengaturan lain dapat memberi kesimpulan yang berbeda.

## Early stopping
*Bagaimana memilih jumlah tree tanpa melihat test set?*

Lingkaran di grafik lab menandai jumlah tree dengan nilai validation terendah. Berhenti di titik itu disebut **early stopping**. Pada sampel bawaan, hasilnya 8 tree dengan log loss validation 0,21. Membiarkan boosting berjalan sampai 100 tree memakan waktu lebih lama dan hasilnya 1,02.

Sebelum kamu memeriksa prediksimu, lingkaran hanya mengenal tree yang sudah kamu tambahkan. Geser **Jumlah pohon** naik dari 3, dan lingkaran mengikuti nilai terendah di antara tree-tree itu. Ia berhenti di 8 tree, dan tidak ada tree sesudahnya yang menurunkan kurva sampai di bawah nilai itu.

> Gagasan kunci: kurva training tidak dapat memberi tahu kapan berhenti, karena ia hanya turun. Kurva validation dapat, karena ia berbalik naik ketika tree tambahan mulai mencocokkan noise.

Ada dua peringatan. Titik validasi ikut memilih jumlah tree, sehingga 0,21 sedikit terlalu optimistis; skor akhir sebaiknya dihitung pada test set, seperti di "Tuning dengan search". Selain itu, di dekat titik terendah kurva itu datar, sehingga lingkaran dapat melompat beberapa tree hanya karena selisih yang sangat kecil.

## Log loss menunjukkan lebih banyak daripada error rate
*Mengapa kurva log loss berbalik naik jauh lebih tajam daripada error rate?*

Ubah **Grafik menampilkan** ke **Error rate**. Error rate validation boosting adalah 6,0% pada 3 tree, yang terendah, dan 9,0% pada 100: tiga kesalahan lebih banyak di antara 100 titik. Log loss validation-nya naik dari 0,21 ke 1,02, sekitar 5 kali lipat. Lingkaran kini menunjuk 3 tree, bukan 8.

Error rate hanya menanyakan di sisi mana dari 0,5 sebuah titik berada. Log loss menanyakan seberapa yakin model itu, dan tree tambahan membuat model boosting makin yakin tentang segalanya.

> Contoh hitungan: sebuah titik validasi kelas 1 mendapat probabilitas 0,4 setelah beberapa tree: salah, dengan biaya -ln(0,4) = 0,92. Setelah jauh lebih banyak tree, probabilitasnya 0,02: tetap salah, dengan biaya -ln(0,02) = 3,91, yaitu 2,99 lebih besar. Error rate menghitung satu kesalahan pada kedua keadaan itu.

Karena itu log loss memperlihatkan overfitting lebih awal, sebab ia melihat keyakinan. Perhatikan keduanya. Dengan 100 titik validasi, satu titik berarti satu poin error rate.

## Apa yang menggeser titik berhenti
*Pengaturan mana yang membuat boosting berhenti lebih cepat atau lebih lambat?*

Lingkaran bukan angka tetap. Setiap baris mengubah satu pengaturan dari sampel bawaan, dengan **Grafik menampilkan** pada **Log loss** dan **Jumlah pohon** pada 100.

| Pengaturan | Lingkaran di (tree) | Log loss validation terendah | Pada 100 tree |
| --- | --- | --- | --- |
| Learning rate 0,10 | 40 | 0,22 | 0,42 |
| Learning rate 0,50 (bawaan) | 8 | 0,21 | 1,02 |
| Learning rate 1,00 | 2 | 0,32 | 0,71 |
| Kedalaman tree 1 | 45 | 0,18 | 0,29 |
| Kedalaman tree 5 | 4 | 0,25 | 0,99 |
| Noise 0,00 | 11 | 0,09 | 0,11 |
| Noise 1,00 | 4 | 0,49 | 1,59 |

[[figure:ensemble-lab/learning-rate|Log loss validation boosting untuk tiga learning rate. Rate yang lebih kecil berhenti lebih lambat dan mencapai nilai terendah yang mirip.]]

Learning rate yang lebih kecil mengambil langkah lebih kecil, sehingga butuh lebih banyak tree. Rate 0,10 dan 0,50 mencapai nilai terendah yang hampir sama, pola yang sama seperti di "Gradient boosting", tempat dua rate yang lebih kecil juga mencapai skor terbaik yang sama. Tree yang lebih dalam mengambil langkah lebih besar, sehingga lebih cepat overfitting. Noise yang lebih sedikit menyisakan lebih sedikit hal untuk dihafal.

::: deeper Ketika "tidak ada" adalah jawabannya
Dengan learning rate kecil, lab dapat menyatakan "Tidak ada kurva yang naik lagi dalam 100 pohon". Itu tidak berarti boosting tidak dapat overfitting: rate kecil berjalan lambat dan mungkin butuh lebih dari 100 tree sebelum kurvanya berbalik.
:::

## Penguin nyata, sampel baru
*Apakah polanya bertahan pada data nyata?*

Atur **Data** ke **Penguin (data nyata)**. Lab memisahkan Adelie dari Chinstrap berdasarkan panjang dan kedalaman paruh. Dari 220 penguin semacam itu, satu tidak punya salah satu pengukuran sehingga dibuang. Tersisa 219 (151 Adelie, 68 Chinstrap): 110 melatih tree dan 109 memeriksanya. Tekan **Sampel baru** untuk membaginya lagi.

| Sampel | Boosting: lingkaran (tree) / terendah | Boosting pada 100 tree | Bagging: terendah / pada 100 tree |
| --- | --- | --- | --- |
| 1 | 4 / 0,21 | 0,77 | 0,12 / 0,12 |
| 2 | 10 / 0,14 | 0,30 | 0,08 / 0,09 |
| 3 | 4 / 0,16 | 0,57 | 0,11 / 0,12 |
| 4 | 10 / 0,12 | 0,57 | 0,09 / 0,10 |
| 5 | 3 / 0,25 | 1,09 | 0,48 / 0,49 |

Boosting berbalik naik pada kelima sampel dan bagging tidak pada satu pun, tetapi lingkaran bergeser antara 3 dan 10 tree. Bentuk hasilnya bertahan, sedangkan angka terbaiknya tidak.

::: remember
- Kurva validation bagging turun lalu mendatar, karena merata-ratakan lebih banyak tree hanya menstabilkan jawaban. Kurva validation boosting turun lalu naik, sementara kurva training-nya terus turun.
- Early stopping memilih jumlah tree pada nilai validation terendah. Learning rate yang lebih kecil, tree yang lebih dangkal, dan noise yang lebih sedikit menggesernya ke kanan, dan angka terbaiknya berubah menurut sampel.
- Log loss memperlihatkan overfitting lebih awal daripada error rate, karena ia melihat keyakinan. Prediksikan dulu, ubah satu pengaturan setiap kali, dan ulangi pada data nyata dengan sampel baru.
:::

@@lab

## Lab: bagging dan boosting, tree demi tree
Dua ensemble mempelajari data berisik yang sama. Bagging (atau random forest) ada di kiri dan boosting di kanan. Kamu menambah tree, mengamati daerah keputusan dan kurvanya, lalu mencari jumlah tree tempat boosting seharusnya berhenti.

### Kontrol
- **Data** berpindah antara **Data buatan** dan **Penguin (data nyata)**. Data nyata memisahkan penguin Adelie dari Chinstrap. Mengubahnya memulai Kuis Cepat dari awal.
- **Bentuk data buatan** adalah **Dua bulan sabit** atau **Papan catur**. **Noise** (0 sampai 1, mulai dari 0,35) membuat bulan sabit berbaur, atau membalik lebih banyak label pada papan catur. Keduanya hanya berlaku untuk data buatan.
- **Pengukuran penguin (x)** dan **Pengukuran penguin (y)** memilih dua dari **Panjang paruh (mm)**, **Kedalaman paruh (mm)**, **Panjang flipper (mm)**, dan **Massa tubuh (g)** untuk data nyata. Keduanya selalu berbeda.
- **Jumlah pohon** (1 sampai 100, mulai dari 3) menentukan berapa tree yang ikut memberi suara. Ia tidak pernah melatih ulang. **Tambah satu pohon** menambahkan satu, dan **Sampel baru** menarik sampel buatan yang baru, atau pembagian baru dari penguin.
- **Random forest: tiap split hanya melihat sebagian fitur** mati pada awalnya. Jika menyala, sisi bagging menjadi random forest. **Porsi fitur (random forest)** (10% sampai 100%, mulai dari 50%) menunjukkan berapa dari 2 fitur yang dilihat sebuah split. Nilai 10% sampai 70% memberi 1 dari 2 fitur dan 80% sampai 100% memberi 2 dari 2, yaitu bagging biasa.
- **Learning rate boosting** (0,05 sampai 1, mulai dari 0,50) dan **Kedalaman pohon boosting** (1 sampai 5, mulai dari 3) mengatur sisi boosting. Bagging selalu menumbuhkan tree sampai kedalaman 8 dengan minimal 3 titik di setiap leaf.
- **Grafik menampilkan** adalah **Log loss** atau **Error rate**. **Tampilkan titik validasi** menyembunyikan atau menampilkan tanda silang validasi.
- **Reset** (dari toolbar lab) mengembalikan semua kontrol ke nilai awal dan kembali ke sampel pertama.
- **Kuis Cepat** adalah tombol di samping kartu **Pengaturan** (tombol di bawah kartu pengaturan (tombol bulat di kanan bawah pada ponsel) pada ponsel). Pertanyaannya adalah "Saat kamu terus menambah pohon, metode mana yang mulai overfitting, dan mana yang terus membaik?". Pilih jawaban, lalu tekan **Periksa jawaban**. Mengubah data, noise, bentuk, random forest, porsi fitur, learning rate, kedalaman, atau menekan **Sampel baru** menghapus hasilnya dan memulai putaran baru.

### Membaca layar
- Setiap plot punya keterangan seperti **Bagging: 3 pohon** (atau **Random forest: 3 pohon**) di kiri dan **Boosting: 3 pohon** di kanan. Bulatan adalah titik training dan tanda silang adalah titik validasi. Warna latar adalah kelas prediksi, dan warna yang lebih pekat berarti prediksi lebih yakin.
- Grafik **Training dan validation log loss terhadap jumlah pohon** (atau **error**, dengan **Grafik menampilkan** pada **Error rate**) punya garis penuh untuk validation dan garis putus-putus untuk training: **Bagging, validation**, **Bagging, training**, **Boosting, validation**, dan **Boosting, training**. Nilai di atas batas grafik dipotong dan ditampilkan sebagai segitiga beserta angkanya.
- Lingkaran pada grafik bertuliskan **early stopping: N pohon**. Ia menandai jumlah tree dengan nilai validation terendah milik boosting, untuk metrik yang sedang ditampilkan grafik. Sebelum kamu memeriksa jawabanmu, garis dan lingkaran hanya mencakup tree yang sudah kamu tambahkan.
- Baris status pada awalnya berbunyi "Dengan 3 pohon, validation log loss adalah 0,63 untuk bagging dan 0,28 untuk boosting." Baris detail memberi nilai validation terendah sejauh ini untuk tiap metode.
- Tabel **Bagging dan boosting berdampingan** punya kolom **Dengan 3 pohon**, **Bagging**, dan **Boosting**, serta baris **Training log loss**, **Validation log loss**, **Jumlah pohon terbaik**, dan **Validation log loss pada jumlah terbaik**. Dengan error rate, kata "log loss" berganti menjadi "error rate".
- Setelah **Periksa jawaban**, grafik menampilkan semua 100 tree. Hasilnya memberi log loss validation pada 100 tree dan nilai terendahnya untuk tiap metode.
- Pada data nyata, catatan di bawah kontrol memberi jumlah penguin. Sumbunya menampilkan dua pengukuran, diskalakan ke 0 sampai 10.

### Eksperimen
Tekan **Reset** sebelum tiap eksperimen agar angkamu sama dengan angka di bawah. Kecuali disebutkan lain, pengaturannya adalah pengaturan awal dan **Grafik menampilkan** pada **Log loss**.

1. **Tambah tree secara bertahap.** Prediksikan: dengan hanya 1 tree, ensemble mana yang punya log loss validation lebih rendah, bagging atau boosting? Atur **Jumlah pohon** ke 1 dan baca tabelnya: bagging 4,96, boosting 0,44, dengan log loss training 1,11 dan 0,43. Tekan **Tambah satu pohon** dua kali: pada 3 tree log loss validation-nya 0,63 dan 0,28. Satu tree bagging itu dalam dan terlalu yakin, sehingga kesalahannya mahal. Mengapa tree kedua dan ketiga membantu sebanyak itu?
2. **Siapa yang overfitting?** Prediksikan: di **Kuis Cepat**, pilih metode mana yang mulai overfitting, lalu tekan **Periksa jawaban**. Hasilnya menyebut boosting: 1,02 pada 100 tree dibanding nilai terendahnya 0,21 pada 8 tree, sedangkan bagging 0,54 dibanding 0,53 pada 79 tree. Geser **Jumlah pohon** ke 100 dan temukan **early stopping: 8 pohon** di grafik. Lalu naikkan **Noise** ke 1 dan turunkan ke 0, dan baca lingkarannya setiap kali: ia pindah ke 4 tree dan ke 11. Mengapa noise yang lebih sedikit menggeser lingkaran ke kanan?
3. **Log loss atau error rate?** Prediksikan: jika kamu mengatur **Grafik menampilkan** ke **Error rate**, apakah kurva boosting naik securam tadi? Atur **Jumlah pohon** ke 100 dan lakukan pergantian itu. Tabel menunjukkan error rate validation 5,0% untuk bagging dan 9,0% untuk boosting, dan jumlah pohon terbaik 3 untuk boosting (6,0%). Lingkaran kini bertuliskan **early stopping: 3 pohon**. Bandingkan dengan 0,21 ke 1,02 pada log loss. Apa yang dilihat log loss tetapi tidak dilihat error rate?
4. **Learning rate dan kedalaman.** Prediksikan: jika kamu menurunkan **Learning rate boosting** ke 0,10, apakah lingkaran bergeser ke kiri atau ke kanan, dan apakah nilai terendahnya membaik atau memburuk? Atur **Jumlah pohon** ke 100 dan coba 0,10, lalu 1,00. Lingkaran pindah ke 40 tree (0,22) dan ke 2 tree (0,32). Kembalikan rate ke 0,50 dan atur **Kedalaman pohon boosting** ke 1, lalu 5: lingkaran pindah ke 45 tree (0,18) dan ke 4 tree (0,25). Jelaskan tiap pergeseran dengan ukuran langkah.
5. **Random forest.** Prediksikan: dengan 100 tree, apakah menyalakan **Random forest: tiap split hanya melihat sebagian fitur** menurunkan log loss validation bagging? Nyalakan. Keterangan di kiri menjadi **Random forest: 100 pohon** dan log loss validation turun dari 0,54 ke 0,23 (ubah **Grafik menampilkan** ke **Error rate** dan error rate bergerak dari 5,0% ke 6,0%). Sekarang naikkan **Porsi fitur (random forest)** ke 80%: tertulis 2 dari 2 fitur dan angkanya kembali ke bagging biasa. Kembalikan **Porsi fitur (random forest)** ke 50%. Tekan **Sampel baru** dengan forest menyala lalu mati: 0,20 dan 0,18. Apakah forest pasti menang di sini, dengan hanya dua fitur?
6. **Penguin, lalu sampel baru.** Prediksikan: pada penguin nyata, apakah kurva boosting berbalik naik lagi, dan apakah lingkaran akan berada di jumlah tree yang sama pada sampel baru? Atur **Data** ke **Penguin (data nyata)** dan **Jumlah pohon** ke 100. Baca catatan di bawah kontrol: 219 penguin, 110 training dan 109 validation. Tekan **Periksa jawaban**: nilai terendah boosting 0,21 pada 4 tree dan 0,77 pada 100, sedangkan bagging 0,12 pada 69 tree dan 0,12 pada 100. Ubah **Grafik menampilkan** ke **Error rate**: boosting 5,5% (6 dari 109 penguin) dan bagging 4,6% (5 dari 109), sehingga error rate menyembunyikan apa yang diperlihatkan log loss. Kembali ke **Log loss** dan tekan **Sampel baru** empat kali, sambil mencatat lingkarannya setiap kali: 10, 4, 10, dan 3 tree. Apa yang tetap sama pada kelima sampel, dan apa yang berubah?
