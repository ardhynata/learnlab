---
slug: permutation-importance-and-shap
title: Permutation importance dan SHAP
---
::: intro
- Ukur permutation importance dengan mengacak satu feature lalu menilai ulang, dan jelaskan mengapa feature yang berkorelasi dapat menyesatkannya.
- Hitung dengan tangan nilai Shapley yang eksak untuk tiga feature, dengan merata-ratakan semua urutan masuknya feature.
- Bedakan penjelasan lokal dari penjelasan global, dan sebutkan apa yang tidak dikatakan oleh penjelasan sebuah model tentang dunia nyata.

Sebelum mulai: baca "Metrik subgroup dan fairness" di kursus ini, "Probabilitas dan sigmoid" serta "Log loss dan proses fitting" di kursus Regresi logistik, dan "Bagging dan random forest" di kursus Ensemble pohon.
:::

## Satu model untuk dijelaskan
*Apa yang kita jelaskan, dan dua pertanyaan apa yang dapat diajukan tentangnya?*

Model yang sudah dilatih adalah aturan yang mengubah feature menjadi prediksi. Penjelasan berusaha menyatakan apa yang dilakukan aturan itu. Pelajaran ini menjelaskan satu model: regresi logistik yang memberi probabilitas bahwa seekor penguin berjenis kelamin jantan, dari tiga ukuran: flipper length (mm), body mass (g) dan bill depth (mm).

Pembagian datanya sama dengan "Bagging dan random forest": 333 penguin yang semua ukurannya lengkap dan jenis kelaminnya tercatat, dibagi menjadi 200 penguin training dan 67 penguin validation. Model ini benar pada 61 dari 67 penguin validation, yaitu 91,0%. Bobotnya, pada feature yang sudah distandarkan (setiap ukuran diskalakan ulang ke rata-rata 0 dan sebaran 1, sehingga bobotnya dapat dibandingkan), adalah -0,20 untuk flipper length, 4,51 untuk body mass dan 3,84 untuk bill depth.

Dua pertanyaan akan terus muncul. Pertanyaan **global** menyangkut seluruh model: feature mana yang diandalkannya? Pertanyaan **lokal** menyangkut satu prediksi: mengapa model memberi penguin ini probabilitas tersebut? Permutation importance menjawab yang pertama. Nilai Shapley menjawab yang kedua, dan bila dirata-ratakan pada banyak penguin, ia menjawab yang pertama juga.

Ingat satu fakta untuk nanti: pada 333 penguin itu, flipper length dan body mass bergerak bersama (r = 0,87, dengan 1 berarti keduanya naik bersama secara sempurna dan 0 berarti tidak ada hubungan).

## Acak satu feature
*Bagaimana cara mengukur sebuah feature dengan merusaknya?*

**Permutation importance** bertanya seberapa besar skor turun ketika satu feature tidak lagi membawa informasi. Nilai model pada penguin validation. Lalu acak kolom satu feature, sehingga setiap penguin menerima nilai milik penguin lain. Nilainya sendiri tidak berubah, tetapi tidak lagi dimiliki penguin yang benar. Nilai lagi. Penurunan skornya adalah importance feature itu.

> Contoh hitungan: ambil enam penguin validation yang dijawab benar oleh model. Geser kolom bill depth satu tempat, sehingga setiap penguin mendapat bill depth dari baris berikutnya dan baris terakhir mendapat milik baris pertama.

| Jenis kelamin | Body mass (g) | Bill depth (mm) | P(jantan) | Depth setelah diacak | P(jantan) sesudahnya | Benar sesudahnya? |
| --- | --- | --- | --- | --- | --- | --- |
| betina | 4850 | 14,3 | 0,12 | 16,5 | 0,91 | tidak |
| jantan | 5250 | 16,5 | 0,99 | 16,3 | 0,98 | ya |
| jantan | 6000 | 16,3 | 1,00 | 15,0 | 1,00 | ya |
| betina | 4700 | 15,0 | 0,19 | 13,7 | 0,02 | ya |
| betina | 4300 | 13,7 | 0,00 | 18,8 | 0,98 | tidak |
| jantan | 4600 | 18,8 | 1,00 | 14,3 | 0,05 | tidak |

Enam benar sebelumnya, tiga benar sesudahnya: turun 3 dari 6 untuk satu kali pengacakan ini. (Model juga melihat flipper length setiap penguin, yang tidak dimasukkan ke tabel.) Satu pengacakan atas enam penguin hanyalah mainan. Prosedur sebenarnya mengacak 67 penguin validation berkali-kali lalu merata-ratakannya, karena satu pengacakan sebagian merupakan keberuntungan.

## Membaca skornya
*Apa kata 30 kali pengacakan tentang ketiga feature?*

Untuk setiap feature dilakukan 30 pengacakan. Tabel memberi rata-rata penurunan jumlah penguin yang benar dari 67, serta penurunan terendah dan tertinggi dari satu pengacakan.

| Feature yang diacak | Rata-rata penurunan (penguin) | Terendah sampai tertinggi | Penurunan dalam poin |
| --- | --- | --- | --- |
| Bill depth | 25,3 | 20 sampai 33 | 37,8 |
| Body mass | 16,8 | 10 sampai 25 | 25,0 |
| Flipper length | 1,0 | 0 sampai 2 | 1,5 |

[[figure:permutation-importance-and-shap/permutation|Permutation importance dari ketiga feature: rata-rata penurunan jumlah penguin validation yang benar dari 67 pada 30 pengacakan, dengan rentang tiap pengacakan sebagai garis.]]

Bill depth paling penting bagi model ini, body mass kedua, dan flipper length hampir tidak berarti. Rentangnya menunjukkan betapa satu pengacakan dapat menyesatkan: satu kali mengacak body mass dapat menurunkan skor antara 10 dan 25 penguin.

Selalu nilai pada penguin yang disisihkan. Pada penguin training, model mungkin sudah menghafal noise, dan noise itu akan tampak sebagai importance.

::: deeper Menilai dengan log loss
Accuracy bersifat kasar di sini: satu penguin sama dengan 1,5 poin. Log loss bereaksi terhadap seberapa yakin setiap prediksi. Pada pengacakan yang sama, log loss validation dimulai dari 0,241 dan naik 0,011 (flipper length), 1,201 (body mass) dan 1,930 (bill depth). Urutannya sama, tetapi pengaruh flipper length yang samar lebih mudah terlihat. Pilih skor yang sesuai dengan cara model akan dinilai, dan pakai skor yang sama untuk setiap feature.
:::

## Ketika feature bergerak bersama
*Mengapa sebuah feature tampak tidak berguna ketika feature lain mengatakan hal yang sama?*

Flipper length mendapat 1,0 dari 67: ia tampak seperti feature yang boleh dibuang. Sekarang latih ulang model tanpa body mass, hanya dengan flipper length dan bill depth. Model itu benar pada 59 dari 67 (88,1%), dan kini mengacak flipper length menurunkan 13,6 dari 67 (20,3 poin).

[[figure:permutation-importance-and-shap/correlated|Kiri: flipper length dan body mass pada 333 penguin, r = 0,87. Kanan: importance flipper length pada model dengan body mass dan pada model tanpa body mass.]]

Penguin yang sama, feature yang sama, importance 1,0 pada satu model dan 13,6 pada model lain. Pada model pertama, hasil fitting menaruh hampir seluruh bobot pada body mass, yang membawa informasi ukuran yang sama. Acak flipper length di sana, dan model masih dapat bersandar pada body mass. Kedua ukuran itu berbagi nilai, dan cara pembagiannya bergantung pada pilihan yang kebetulan diambil model.

Ada masalah kedua. Pengacakan juga memutus hubungan flipper length dengan body mass, dan dapat membentuk penguin yang tidak ada. Pada tabel di atas, seekor penguin Gentoo menerima bill depth 18,8 mm yang berasal dari seekor Adelie; tidak ada Gentoo dalam data yang bill-nya lebih dalam dari 17,3 mm.

> Awas: permutation importance yang rendah berarti "model ini tidak memerlukan feature itu, mengingat feature lainnya". Itu tidak berarti feature tersebut tidak berhubungan dengan jawabannya.

## Nilai Shapley dengan kata-kata
*Bagaimana membagi satu prediksi secara adil di antara para feature?*

Permutation importance memberi satu angka per feature untuk seluruh model. Untuk menjelaskan satu prediksi, SHAP meminjam gagasan dari teori permainan kooperatif, yaitu **nilai Shapley**. Feature adalah para pemain, dan prediksi adalah hadiah yang harus dibagi.

Bayangkan feature masuk satu per satu. Ketika sebuah feature masuk, prediksi bergeser, dan pergeseran itu adalah kontribusinya. Namun besarnya bergantung pada siapa yang masuk lebih dulu: bila dua feature membawa informasi yang sama, siapa pun yang masuk pertama mengambil kreditnya. Karena itu tidak ada satu urutan pun yang adil. Bagian yang adil adalah rata-rata kontribusi sebuah feature pada setiap urutan masuk yang mungkin. Dengan tiga feature ada 6 urutan.

## Yang diketahui model
*Bagaimana model dapat memprediksi ketika sebagian feature tidak diketahui?*

Kontribusi memerlukan prediksi untuk setiap himpunan bagian feature, padahal model selalu meminta ketiganya. Jadi isi feature yang diketahui dengan nilai penguin ini dan sisanya dengan nilai dari seekor penguin training, lalu rata-ratakan pada 200 penguin training. Sebut ini v(S) untuk himpunan feature S yang diketahui. Bila tidak ada yang diketahui, v adalah prediksi rata-rata, yaitu **baseline**. Bila semuanya diketahui, v adalah prediksi untuk penguin ini.

Nilai Shapley dijumlahkan: baseline ditambah semua nilainya sama dengan prediksi. Feature yang tidak pernah mengubah apa pun mendapat 0, dan dua feature yang berperan sama mendapat nilai yang sama.

## Tiga feature, dengan tangan
*Seperti apa seluruh perhitungannya untuk satu penguin?*

Ambil penguin validation nomor 16, seekor Adelie jantan dengan flipper length 180 mm, body mass 3600 g dan bill depth 18,7 mm. Model memberi 0,535. Tabel mendaftar v(S) untuk kedelapan himpunan feature yang diketahui.

| Feature yang diketahui | v(S) |
| --- | --- |
| tidak ada | 0,505 |
| flipper | 0,522 |
| mass | 0,269 |
| depth | 0,705 |
| flipper dan mass | 0,284 |
| flipper dan depth | 0,718 |
| mass dan depth | 0,465 |
| ketiganya | 0,535 |

> Contoh hitungan: pada urutan flipper, mass, depth, flipper berkontribusi 0,522 - 0,505 = 0,017, mass berkontribusi 0,284 - 0,522 = -0,238, dan depth berkontribusi 0,535 - 0,284 = 0,251. Ketiga langkah itu berjumlah 0,535 - 0,505 = 0,030. Lakukan hal yang sama untuk keenam urutan.

| Urutan | Flipper | Mass | Depth |
| --- | --- | --- | --- |
| flipper, mass, depth | 0,017 | -0,238 | 0,251 |
| flipper, depth, mass | 0,017 | -0,183 | 0,196 |
| mass, flipper, depth | 0,015 | -0,236 | 0,251 |
| mass, depth, flipper | 0,070 | -0,236 | 0,196 |
| depth, flipper, mass | 0,013 | -0,183 | 0,200 |
| depth, mass, flipper | 0,070 | -0,240 | 0,200 |
| Jumlah keenamnya | 0,202 | -1,316 | 1,294 |
| Nilai Shapley (jumlah / 6) | 0,034 | -0,219 | 0,216 |

[[figure:permutation-importance-and-shap/orders|Enam kontribusi setiap feature untuk penguin 16, satu titik per urutan, dan rata-ratanya, yaitu nilai Shapley, sebagai berlian.]]

Pemeriksaannya: (0,202 - 1,316 + 1,294) / 6 = 0,180 / 6 = 0,030, yang sama dengan 0,535 - 0,505. Feature yang sama menggeser prediksi sebesar 0,013 pada satu urutan dan 0,070 pada urutan lain, karena sigmoid, yang memeras sebuah skor menjadi probabilitas, membengkokkan skalanya: langkah yang sama besar pada skor memberi langkah yang tidak sama besar pada probabilitas. Mass menarik ke arah betina (3600 g tergolong ringan untuk data ini, yang rata-rata training-nya sekitar 4170 g) dan depth menarik ke arah jantan. Keduanya hampir saling menghapus.

::: deeper Rata-rata yang sama dengan bobot
Daripada mendaftar urutan, kamu dapat memberi bobot pada setiap langkah menurut berapa banyak urutan yang memuatnya. Untuk flipper length: 1/3 dari urutan menaruhnya di awal, 1/6 menaruhnya setelah mass saja, 1/6 setelah depth saja, dan 1/3 di akhir. Dengan begitu, nilainya (0,017 x 2 + 0,015 + 0,013 + 0,070 x 2) / 6 = 0,202 / 6, jumlah yang sama dengan di tabel. Dengan n feature ada n! urutan dan 2^n himpunan, sehingga nilai eksak cepat menjadi mahal: 3 feature memerlukan 8 himpunan, 20 feature memerlukan lebih dari satu juta. Library memakai jalan pintas yang dibuat untuk jenis model tertentu, atau memperkirakan rata-ratanya dari sampel urutan.
:::

## Lokal dan global
*Kapan penjelasan menggambarkan satu penguin, dan kapan seluruh model?*

Ketiga angka di atas adalah penjelasan **lokal**: ia menyatakan mengapa model ini memberi penguin 16 probabilitas 0,535. Penguin lain mendapat angka yang berbeda. Penguin validation nomor 261, seekor Gentoo betina dengan flipper length 215 mm, body mass 4850 g dan bill depth 14,3 mm, mendapat 0,124 dari model. Nilainya adalah -0,014 untuk flipper length, 0,138 untuk body mass dan -0,505 untuk bill depth, dan 0,505 - 0,014 + 0,138 - 0,505 = 0,124. Body mass-nya mendorong ke arah jantan, padahal pada penguin 16 mendorong ke arah betina, dan bill-nya yang dangkal mendorong kuat ke arah betina.

Penjelasan **global** merangkum banyak penjelasan lokal. Merata-ratakan besar nilai Shapley (tanpa tanda) pada 67 penguin validation memberi 0,010 untuk flipper length, 0,256 untuk body mass dan 0,275 untuk bill depth. Urutannya sejalan dengan permutation importance: bill depth, lalu body mass, lalu flipper length jauh di belakang. Skalanya tidak sejalan, karena yang satu adalah perubahan probabilitas dan yang lain adalah penurunan jumlah penguin yang benar.

[[figure:permutation-importance-and-shap/local-global|Nilai Shapley untuk dua penguin, dan besar rata-rata nilai itu pada 67 penguin validation. Ke kanan dari nol mendorong ke jantan, ke kiri mendorong ke betina.]]

> Gagasan kunci: angka global menyembunyikan arah. Body mass mendorong sebagian penguin ke atas dan sebagian lain ke bawah, dan besar rata-ratanya hanya menunjukkan seberapa kuat ia mendorong.

## Yang tidak dikatakan penjelasan
*Apakah penjelasan itu tentang penguin atau tentang model?*

Semua yang dibahas sejauh ini menggambarkan model ini. Ia tidak menggambarkan penguin.

- **Ia bukan sebab.** Jenis kelamin memengaruhi ukuran, bukan sebaliknya; model memprediksi jenis kelamin dari ukuran. Nilai Shapley menyatakan apa yang menggeser prediksi, bukan apa yang akan terjadi bila seekor penguin dibuat lebih berat.
- **Ia bergantung pada model.** Penguin yang sama memberi flipper length 1,0 pada satu model dan 13,6 pada model lain. Kedua angka itu benar tentang modelnya masing-masing.
- **Ia menunjukkan apa yang diambil model dari data, termasuk pengganti.** Dalam tiap spesies, jantan memiliki bill yang lebih dalam: Adelie 17,6 mm untuk betina dan 19,1 untuk jantan, Gentoo 14,2 dan 15,7. Namun Gentoo dari kedua jenis kelamin memiliki bill yang lebih dangkal daripada Adelie. Satu aturan yang dicocokkan pada semua penguin karena itu membaca bill yang dangkal sebagai betina. Seekor Gentoo jantan (flipper length 213 mm, body mass 5850 g, bill depth 14,6 mm) mendapat 0,652 dari body mass dan -0,166 dari bill depth.

Poin terakhir adalah temuan tentang model, dan ia mengarahkanmu kembali ke metrik subgroup: penjelasan yang tampak masuk akal secara keseluruhan dapat menyembunyikan kelompok yang diperlakukan berbeda oleh model.

> Awas: importance yang tinggi tidak membuat sebuah feature adil, kausal, atau aman dipakai. Ia hanya menyatakan bahwa model mengandalkannya.

## Menuju audit lab
*Apa yang kamu bawa ke pelajaran berikutnya?*

Kursus ini ditutup dengan Audit lab. Di sana kamu mengaudit kesalahan model per subgroup dan melihat bagaimana feature yang berkorelasi mengubah estimasi importance. Kini kamu memegang bahan untuk kedua bagiannya: metrik subgroup dari pelajaran pertama, dan dua alat penjelasan dari pelajaran ini.

Sebelum membaca angka importance apa pun di lab, ajukan tiga pertanyaan. Apakah angka itu dihitung pada data yang disisihkan? Adakah feature berkorelasi yang dapat berbagi nilainya, dan apa yang terjadi pada angka itu bila feature tersebut dibuang? Apakah klaimnya tentang model, atau kamu sedang tergelincir ke klaim tentang dunia nyata? Tebak urutannya sebelum melihat, lalu cocokkan tebakan itu dengan hasilnya.

::: remember
- Permutation importance adalah penurunan skor validation ketika satu feature diacak. Ulangi dan rata-ratakan. Feature yang berkorelasi dengan feature lain dapat tampak tidak penting karena model bersandar pada kembarannya.
- Nilai Shapley adalah kontribusi sebuah feature pada satu prediksi, dirata-ratakan pada setiap urutan masuk yang mungkin. Baseline ditambah semua nilainya sama dengan prediksi.
- Penjelasan lokal menyangkut satu prediksi, penjelasan global merangkum banyak penjelasan lokal. Keduanya menggambarkan model, bukan dunia.
:::
