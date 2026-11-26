---
slug: pca-lab
title: Lab PCA
---
::: intro
- Perkirakan berapa banyak informasi yang hilang pada satu sumbu sebelum kamu memutarnya, lalu cocokkan angkanya di lab.
- Jelaskan mengapa varians yang dipertahankan sebuah sumbu dan informasi yang hilang selalu berjumlah varians total.
- Baca scree plot untuk menentukan jumlah komponen, lalu uji gagasan itu pada penguin yang nyata dan pada sampel yang baru.

Sebelum mulai: baca "PCA dan explained variance" serta "Galat rekonstruksi dan embedding" di kursus ini. Keduanya memberimu komponen, explained variance, dan galat rekonstruksi, dan lab ini memperlihatkan ketiganya bergerak.
:::

## Apa yang diperlihatkan lab
*Apa yang kamu putar di lab PCA, dan apa yang kamu baca darinya?*

Lab PCA dimulai dengan 120 titik buatan yang membentuk awan panjang dan tipis. Setiap titik punya dua angka, Feature 1 dan Feature 2, dan keduanya naik bersama (korelasi r = 0,84). Kamu mendapat satu sumbu, yaitu garis yang melewati tengah awan, dan kamu dapat memutarnya.

Setiap titik jatuh tegak lurus ke sumbu. Itulah proyeksi dari "PCA dan explained variance", dan tempat sebuah titik mendarat adalah rekonstruksinya dari satu komponen, seperti di "Galat rekonstruksi dan embedding". Garis putus-putus dari sebuah titik ke tempat pendaratannya adalah bagian titik itu yang dibuang oleh sumbu.

Lab melaporkan dua angka untuk sumbu yang kamu pilih:

- **Varians sepanjang sumbu**: seberapa berjauhan tempat-tempat pendaratan itu. Sebut saja varians yang dipertahankan.
- **Informasi yang hilang**: rata-rata panjang kuadrat garis putus-putus. Inilah rata-rata kuadrat galat rekonstruksi dari pelajaran sebelumnya.

Dengan sumbu di 0° yang menunjuk ke kanan, baris status berbunyi: sumbu menyimpan 3,15 dari 4,90 varians total (64,4%), dan informasi yang hilang adalah 1,74 (35,6%). Semua bagian lab yang lain menjelaskan kedua angka itu dan bagaimana keduanya berubah.

## Yang disimpan ditambah yang hilang sama dengan total
*Mengapa kedua angka itu tidak mungkin sama-sama besar?*

Ambil sembarang titik yang sudah dipusatkan di tengah awan. Jarak kuadratnya dari tengah terbagi menjadi dua bagian yang saling tegak lurus: panjang kuadrat sepanjang sumbu, dan panjang kuadrat garis putus-putus. Jumlahkan untuk semua titik lalu bagi dengan banyaknya titik, dan kamu mendapat pembagian yang sama untuk seluruh awan:

> Gagasan kunci: varians yang dipertahankan + informasi yang hilang = varians total, untuk setiap sumbu yang dapat kamu gambar. Totalnya tidak pernah berubah, sehingga sebuah sumbu hanya dapat menambah di satu sisi dengan mengambil dari sisi lain.

> Contoh hitungan: pada 0° sumbunya adalah Feature 1 itu sendiri. Varians yang dipertahankan adalah varians Feature 1, yaitu 3,152, dan informasi yang hilang adalah varians Feature 2, yaitu 1,744. Jumlahnya 4,896, yang dibulatkan lab menjadi 4,90.

[[figure:pca-lab/rotate|Ke-120 titik yang sama dengan tiga sumbu. Garis putus-putus adalah informasi yang hilang. Sumbu di tengah adalah yang terbaik, dan sumbu di kanan tegak lurus (90°) terhadapnya.]]

## Memutar sumbu
*Bagaimana varians yang dipertahankan dan kehilangannya berubah ketika sudutnya berubah?*

Seret di plot, geser **Sudut sumbu**, atau pakai tombol panah, lalu perhatikan baris status. Varians yang dipertahankan bergantung pada sudut θ melalui matriks kovarians awan itu. Untuk awan ini, isinya c11 = 3,152, c22 = 1,744, dan c12 = 1,966: c11 dan c22 adalah varians Feature 1 dan Feature 2, dan c12 adalah kovarians keduanya, angka yang membesar ketika keduanya naik bersama (lihat "PCA dan explained variance"). Varians yang dipertahankan adalah c11 cos²θ + 2 c12 sin θ cos θ + c22 sin²θ.

> Contoh hitungan: pada 45°, cos θ = sin θ, sehingga rumusnya menjadi (c11 + c22) / 2 + c12 = (3,152 + 1,744) / 2 + 1,966 = 4,414. Lab menampilkan 4,41. Pada 90° sumbunya adalah Feature 2, yang menyimpan 1,74 dan kehilangan 3,15, yaitu angka-angka di 0° yang bertukar tempat.

Grafik "Varians yang dipertahankan dan informasi yang hilang di tiap sudut" menggambar keduanya untuk semua sudut dari 0° sampai 180°. Kedua kurva itu saling mencerminkan dan selalu berjumlah 4,90. Varians yang dipertahankan mencapai puncak di 35,1° (4,54) dan paling rendah di 125,1° (0,36), tepat 90° setelahnya.

[[figure:pca-lab/sweep|Varians yang dipertahankan dan informasi yang hilang di tiap sudut, untuk 120 titik buatan. Garis putus-putus adalah totalnya, 4,90. Sumbu di 180° adalah garis yang sama dengan sumbu di 0°, sehingga grafik berhenti di sana.]]

## Sumbu terbaik adalah komponen pertama
*Apa yang terjadi ketika sumbu berhenti di titik tertinggi kurva?*

Tekan **Pas ke komponen utama pertama** dan sumbu melompat ke 35,1°. Sumbu itu menyimpan 4,54 dari 4,90, yaitu 92,7%, dan hanya kehilangan 0,36 (7,3%). Tidak ada sudut lain yang lebih baik. Inilah PC1, dan 4,54 adalah eigenvalue-nya.

> Contoh hitungan: eigenvalue matriks kovarians berjumlah c11 + c22 = 4,896 dan hasil kalinya c11 c22 - c12² = 1,632. Angka 4,536 dan 0,360 memenuhi keduanya. Yang lebih besar menentukan sudutnya: tan 2θ = 2 c12 / (c11 - c22) = 3,932 / 1,408 = 2,79, sehingga 2θ = 70,3° dan θ = 35,1°. Lalu 4,536 / 4,896 = 92,7%, yaitu explained variance ratio.

Tekan **Putar sumbu 90°** dan kamu mendarat di PC2: sumbu itu menyimpan 0,36 dan kehilangan 4,54, angka yang bertukar tempat. Kuis Cepat di lab meminta kamu menebaknya sebelum mencoba. Sumbu yang tegak lurus dengan sumbu terbaik adalah sumbu yang paling buruk, karena kedua eigenvalue itu adalah yang terbaik dan yang terburuk yang dicapai kurva.

Nyalakan **Tampilkan sumbu terbaik** untuk melihat sumbu terbaik tergambar putus-putus di belakang sumbumu.

## Awan tanpa pemenang yang jelas
*Apakah memutar sumbu selalu berpengaruh?*

Ubah **Kumpulan titik** menjadi **Noisy**. Arah panjangnya sama, tetapi sebarannya ke arah menyilang jauh lebih besar. Sumbu terbaik, 35,8°, kini menyimpan 2,55 dari 3,99 (63,9%) dan kehilangan 1,44 (36,1%). Kurvanya masih naik turun, tetapi dengan ayunan yang jauh lebih kecil: sumbu terbaik menyimpan 63,9% dibandingkan 50% untuk sumbu rata-rata.

Ubah **Kumpulan titik** menjadi **Bulat (tanpa korelasi)**. Setiap sudut menyimpan 2,25 dari 4,50, yaitu 50,0%, dan lab mengatakannya: tidak ada sumbu yang lebih baik daripada yang lain. Tidak ada redundansi yang dapat dibuang PCA, karena kedua feature tidak bergerak bersama.

> Gagasan kunci: PCA hanya dapat memampatkan tabel jika kolom-kolomnya berbagi informasi. Makin baik komponen pertamanya, makin menguntungkan pemampatan itu, dan awan yang bulat tidak menawarkan apa-apa.

Kamu dapat memakainya dari arah sebaliknya. Ketika menghadapi tabel nyata, explained variance komponen pertama memberi tahu seberapa redundan tabel itu, sebelum kamu memutuskan membuang apa pun.

## Lebih banyak komponen dan scree plot
*Bagaimana kehilangan berubah ketika kamu mempertahankan k dari banyak komponen?*

Kartu-kartu di bagian bawah lab memakai tabel berisi 8 feature yang bergerak dalam dua kelompok tersembunyi. Geser **Komponen yang dipertahankan** dan baca catatan di bawahnya. **Scree plot** menunjukkan varians yang dijelaskan tiap komponen, yaitu 65,4% dan 25,1% untuk dua komponen pertama, lalu ekor datar dari 2,0% turun ke 1,1%.

> Contoh hitungan: mempertahankan 2 komponen menyimpan 65,4% + 25,1% = 90,5% varians, sehingga informasi yang hilang adalah 100% - 90,5% = 9,5%. Catatan di lab menyebut hal yang sama. Dengan 3 komponen, 92,5% tersimpan dan 7,5% hilang, hanya lebih baik 2 poin untuk satu komponen tambahan.

[[figure:pca-lab/scree|Scree plot tabel 8 feature, dan informasi yang hilang menurut jumlah komponen yang dipertahankan. Mempertahankan 2 komponen kehilangan 9,5%.]]

Grafik "Informasi yang hilang menurut jumlah komponen yang dipertahankan" adalah scree plot yang dibaca dari ujung yang lain, dan tikungannya berada di tempat yang sama. Untuk memilih k, berhentilah di tempat batangnya mendatar, periksa porsi yang tersimpan, dan pastikan tugasnya masih berjalan, seperti di "Galat rekonstruksi dan embedding". Atur **Dimensi** ke **3-D** dan sumbu tunggal terbaik hanya menyimpan 81,0% dan bukan 92,7%, karena awan itu juga menyebar ke arah kedua dan ketiga. Komponen kedua menambah 14,4%, sehingga dua komponen bersama menyimpan 95,4%.

## Penguin nyata
*Apakah gagasan ini berlaku di luar data buatan?*

Atur **Data** ke **Penguin (data nyata)**. Lab memakai 342 dari 344 penguin, yaitu yang punya keempat pengukuran, lalu menstandardisasinya. Dua komponen menyimpan 88,2% varians (PC1 68,8% dan PC2 19,3%, yang berjumlah 88,2% sebelum pembulatan), angka yang sama dengan "PCA dan explained variance". PCA tidak pernah melihat spesiesnya. Warna di plot menunjukkan apakah komponen menemukannya juga.

Sekarang hilangkan centang **Standarkan pengukurannya**. PC1 menjelaskan sekitar 100%, dan loading untuk massa tubuh adalah 1,00. Gram adalah satuan kecil, sehingga kolom massa memuat hampir seluruh varians, dan lab mengatakannya.

## Sampel baru
*Apakah angkanya tetap sama ketika sampelnya berganti?*

Untuk menguji gagasan ini pada sampel baru, kembali ke **Data buatan**. Tabel nyata hanya punya satu sampel, sehingga tidak dapat membuat sampel baru. Tekan **Sampel baru** lalu pas ke komponen pertama setiap kali. Pada enam sampel awan yang kuat, sumbu terbaik menyimpan 92,5% sampai 93,8% varians, pada sudut antara 32° dan 35°.

[[figure:pca-lab/fresh|Porsi varians yang dipertahankan sumbu terbaik, pada enam sampel tiap awan buatan (seed 1 sampai 6).]]

Enam sampel adalah pemeriksaan kecil, bukan bukti. Hasilnya hanya mengatakan bahwa polanya stabil, sedangkan angka persisnya tidak.

::: deeper Mengapa kedua kurva saling mencerminkan
Misalkan p sebuah titik yang sudah dipusatkan dan u sebuah sumbu satuan. Panjang kuadrat p terbagi menjadi (p · u)² sepanjang sumbu ditambah jarak kuadrat dari p ke sumbu, karena kedua bagian itu saling tegak lurus. Rata-ratakan untuk semua titik: rata-rata (p · u)² adalah varians yang dipertahankan, rata-rata bagian yang lain adalah informasi yang hilang, dan rata-rata panjang kuadrat adalah varians total. Total itu tidak bergantung pada u, sehingga ketika satu kurva naik, kurva yang lain turun sebesar yang sama.
:::

::: remember
- Untuk sumbu mana pun, varians yang dipertahankan + informasi yang hilang = varians total. Sumbu terbaik, PC1, menyimpan paling banyak, dan sumbu yang tegak lurus (90°) terhadapnya menyimpan paling sedikit.
- Awan yang bulat tidak punya sumbu terbaik. Komponen pertama menjelaskan banyak hanya ketika feature-nya berbagi informasi, dan scree plot menunjukkan seberapa banyak.
- Uji sebuah gagasan pada sampel baru sebelum kamu mempercayainya: polanya harus bertahan, sedangkan angka persisnya bergeser sedikit.
:::

@@lab

## Lab: putar sumbu, kehilangan informasi
Lab dimulai dengan 120 titik buatan (Korelasi kuat, 2-D) dan sumbu di 0°. Kamu memutar sumbu dan membaca berapa banyak varians yang disimpannya dan berapa banyak informasi yang hilang. Angka-angka di bawah berlaku untuk pengaturan awal itu; tekan **Reset** jika kamu sudah mengubah sesuatu.

### Kontrol
- **Data** berpindah antara **Data buatan** dan **Penguin (data nyata)**. Dengan data nyata, **Standarkan pengukurannya** adalah satu-satunya kontrol lain di kartu Parameter.
- **Kumpulan titik** punya tiga pilihan: **Korelasi kuat**, **Noisy**, dan **Bulat (tanpa korelasi)**.
- **Dimensi** punya **2-D (satu tampilan)** dan **3-D (dua tampilan terhubung)**.
- **Jumlah titik** (30 sampai 300) menentukan ukuran awan. **Sampel baru** mengambil sampel lain yang memakai seed.
- **Sudut sumbu** (0 sampai 180) memutar sumbu. Kamu juga dapat menyeret di plot, atau fokus ke plot lalu menekan Kiri dan Kanan untuk memutarnya satu derajat (Shift: lima). Di 3-D, **Kemiringan sumbu (3-D)** (-90 sampai 90) memiringkannya, dan Atas serta Bawah melakukan hal yang sama.
- **Pas ke komponen utama pertama** menaruh sumbu di sumbu terbaik. **Putar sumbu 90°** memindahkannya ke sumbu yang tegak lurus (PC2 di 2-D).
- **Tampilkan sumbu terbaik** menggambar sumbu terbaik sebagai garis putus-putus. **Tampilkan informasi yang hilang** menggambar garis putus-putus dari titik ke sumbu. Kontrol ini awalnya menyala.
- **Standarkan pengukurannya** (hanya Data nyata) lebih dulu menyamakan skala setiap pengukuran.
- **Komponen yang dipertahankan** (1 sampai 8, atau 1 sampai 4 untuk penguin) ada di kartu Scree plot.
- Tombol **Kuis Cepat** ada di bawah kartu Parameter (di kanan bawah pada ponsel). Tombol ini bertanya: "Jika kamu memproyeksikan ke sumbu yang tegak lurus dengan sumbu terbaik, apa yang terjadi pada informasi yang hilang?" dengan jawaban **Lebih banyak informasi hilang daripada di sumbu terbaik**, **Lebih sedikit informasi hilang daripada di sumbu terbaik**, dan **Jumlah yang hilang hampir sama**. Kuis ini menampilkan hasilnya, lengkap dengan angka, begitu sumbumu tegak lurus dengan sumbu terbaik.

### Membaca layar
- Plot menampilkan titik **Titik data**, **Sumbumu**, titik **Proyeksi ke sumbu**, dan **Informasi yang hilang (jarak ke sumbu)** sebagai garis putus-putus. Dengan **Tampilkan sumbu terbaik** menyala, **Sumbu terbaik (komponen utama pertama)** ikut ditambahkan.
- Baris status berbunyi "Sumbu di 0°: menyimpan 3,15 dari 4,90 varians total (64,4%). Informasi yang hilang: 1,74 (35,6%)." Baris di bawahnya menyebutkan letak sumbu terbaik: "Sumbu terbaik ada di 35,1°: menyimpan 4,54 (92,7%) dan hanya kehilangan 0,36."
- Kartu **Varians yang dipertahankan dan informasi yang hilang di tiap sudut** menampilkan kedua kurva, dengan keterangan **Varians sepanjang sumbu**, **Informasi yang hilang**, dan **Sumbumu: N°**. Di 3-D, kartu **Tampak samping: Feature 1 terhadap Feature 3** menampilkan awan yang sama dari samping.
- Kartu **Scree plot: varians yang dijelaskan tiap komponen** punya keterangan **Tiap komponen**, **Kumulatif**, dan **Kamu pertahankan k = N**. Kartu **Informasi yang hilang menurut jumlah komponen yang dipertahankan** punya keterangan **Informasi yang hilang** dan **Kamu pertahankan k = N**. Keduanya memakai tabel 8 feature, atau empat pengukuran untuk penguin. Catatannya berbunyi "Mempertahankan 2 dari 8 komponen menyimpan 90,5% varians dan kehilangan 9,5%."
- Kartu **Komponen terbuat dari apa** adalah tabel loading, dengan baris terakhir **Varians yang dijelaskan**. Untuk penguin, baris status berbunyi "Dua komponen menyimpan 88,2% varians dari empat pengukuran: PC1 68,8%, PC2 19,3%."

### Eksperimen
1. **Tegak lurus.** Prediksikan: pilih jawaban di kotak **Kuis Cepat** tentang sumbu yang tegak lurus dengan sumbu terbaik. Lalu tekan **Pas ke komponen utama pertama**, tekan **Putar sumbu 90°**, dan baca baris status. Varians yang dipertahankan turun dari 4,54 menjadi 0,36 dan informasi yang hilang naik dari 0,36 menjadi 4,54, sedangkan totalnya tetap 4,90. Jelaskan mengapa sumbu terburuk kehilangan apa yang disimpan sumbu terbaik.
2. **Putar dengan tangan.** Prediksikan: atur **Sudut sumbu** ke 0 dan tebak sudut mana yang menyimpan varians paling banyak. Lalu coba 45, 90, dan 135, sambil memperhatikan kartu kurva. Sumbu menyimpan 4,41 di 45° (rumus dari pelajaran memberi 4,414), 1,74 di 90°, dan 0,48 di 135°. Di 90°, angka yang dipertahankan dan yang hilang di 0° sudah bertukar. Mengapa varians yang dipertahankan hanya mencapai satu puncak, bukan dua, antara 0° dan 180°?
3. **Tiga awan.** Prediksikan: mana yang menyimpan lebih sedikit dengan sumbu terbaiknya, **Noisy** atau **Bulat (tanpa korelasi)**? Tekan **Pas ke komponen utama pertama** untuk setiap **Kumpulan titik**. **Korelasi kuat** menyimpan 92,7%, **Noisy** 63,9% (35,8°), dan **Bulat (tanpa korelasi)** 50,0% di setiap sudut. Apa yang dikatakan baris detail lab tentang awan bulat itu?
4. **Dimensi ketiga.** Prediksikan: dengan **Dimensi** di **3-D (dua tampilan terhubung)**, apakah sumbu tunggal terbaik menyimpan lebih banyak atau lebih sedikit daripada 92,7% di 2-D? Tekan **Pas ke komponen utama pertama**: sumbu itu menyimpan 4,35 dari 5,36, yaitu 81,0%. Tekan **Putar sumbu 90°** untuk membaca komponen kedua: 0,77, atau 14,4%. Miringkan sumbu dan lihat ia meninggalkan tampilan datar di kartu **Tampak samping**.
5. **Berapa komponen?** Prediksikan: berapa dari 8 komponen yang kamu butuhkan untuk menyimpan 90% varians? Geser **Komponen yang dipertahankan** dari 1 sampai 3 dan baca catatannya: 65,4%, 90,5%, dan 92,5% tersimpan. Lalu ubah **Kumpulan titik** menjadi **Noisy**: dengan 2 komponen hanya tersimpan 63,3%. Dengan **Bulat (tanpa korelasi)** tersimpan 25,0%, karena setiap komponen menjelaskan 12,5%. Seperti apa bentuk scree plot ketika tidak ada yang dapat dimampatkan?
6. **Penguin dan sampel baru.** Prediksikan: dengan **Standarkan pengukurannya** menyala, berapa banyak yang disimpan dua komponen, dan apa yang terjadi ketika kamu mematikannya? Atur **Data** ke **Penguin (data nyata)**: dua komponen menyimpan 88,2% (PC1 68,8%, PC2 19,3%), dan dengan **Komponen yang dipertahankan** di 1, 2, dan 3 catatannya memberi 68,8%, 88,2%, dan 97,3%. Matikan standardisasi: PC1 menjelaskan sekitar 100%, dan loading untuk massa tubuh adalah 1,00. Lalu uji gagasan itu pada data baru: atur **Data** kembali ke **Data buatan**, tekan **Sampel baru** lima kali, dan tekan **Pas ke komponen utama pertama** setiap kali. Dengan **Korelasi kuat**, sumbu terbaik menyimpan 93,7%, 93,3%, 92,5%, 93,8%, dan 93,0% (sampel pertama menyimpan 92,7%). Apakah polanya bertahan pada sampel baru, dan angka mana yang berubah?
