---
slug: knn-lab
title: Lab k-NN
---
::: intro
- Prediksikan bagaimana test score model k-NN berubah saat k diubah, lalu periksa di lab k-NN.
- Regangkan satu feature dan jelaskan, dengan jarak, mengapa neighbor dan boundary-nya berubah.
- Uji gagasan itu pada penguin yang sungguhan, lalu pada training point yang diambil ulang, sebelum kamu mempercayainya.

Sebelum mulai: baca "How k-NN decides", "Tuning k", dan "Distance and similarity". Lab ini memakai vote, pemilihan k, dan jarak dari ketiga pelajaran itu.
:::

## Apa yang ditanyakan lab
*Apa yang kamu kerjakan di lab, dan apa yang tampil di layar saat lab dibuka?*

Lab k-NN hanya mengajukan satu pertanyaan: saat k diubah, atau satu feature diregangkan, test point mana yang berhasil ditebak k-NN dengan benar? Lab dibuka dengan 48 titik latih buatan dalam dua kelas, A dan B. Di tengah plot ada satu titik query, yaitu belah ketupat. k titik latih terdekatnya memberikan vote untuk menentukan kelasnya, dan lab menandai titik-titik itu.

Di awal, k bernilai 3 dan jaraknya Euclidean. Belah ketupat itu berkelas B, karena 2 dari 3 neighbor-nya memilih B. Lab juga menilai model pada 40 test point yang tetap: **34 dari 40**, yaitu 85%. Setiap eksperimen di bawah ini mengubah satu pengaturan lalu membaca skor itu lagi.

Setiap eksperimen mengikuti empat langkah yang sama seperti bagian lain kursus ini. **Prediksikan** hasilnya sebelum menyentuh kontrol apa pun, **ubah** satu pengaturan, **jelaskan** hasilnya dengan jarak dan vote, lalu **terapkan** gagasannya pada data nyata. Langkah terakhir inilah yang membuatnya berarti, sehingga eksperimen penutup memakai penguin yang sungguhan dan training point yang diambil ulang.

## Mengapa test point tetap
*Mengapa skor dihitung dari test point dan bukan dari titik latih?*

Ke-40 test point itu diambil sekali dan tidak pernah berpindah. Mereka tidak boleh ikut vote: hanya 48 titik latih yang boleh. Karena itu, setiap test point diklasifikasikan oleh neighbor yang belum pernah melihatnya, persis seperti contoh baru. Di "Tuning k" kamu sudah melihat mengapa ini penting: pada k = 1 skor titik latih akan sempurna, 100%, karena setiap titik adalah neighbor terdekat bagi dirinya sendiri.

Karena test point sama di setiap pengaturan, perubahan skor berasal dari perubahanmu dan bukan dari hal lain. Begitulah dua boundary dibandingkan: test point yang sama, pengaturan yang berbeda.

Ini juga menentukan seberapa jauh perubahan kecil boleh dipercaya. Satu test point adalah 1 dari 40, atau 2,5 poin persentase. Perubahan satu atau dua poin adalah ukuran perubahan yang dapat muncul begitu saja dari kebetulan pada kumpulan titik acak lain. Carilah perubahan beberapa poin, dan ulangi pada pengambilan baru sebelum kamu mempercayai perubahan yang kecil.

> Gagasan kunci: bandingkan pengaturan pada test point yang sama, dan anggap perubahan satu atau dua dari 40 sebagai noise sampai pengambilan baru menunjukkan hal yang sama.

## Mengubah k
*Apa yang terjadi pada skor saat k diperbesar?*

Seret **Neighbor (k)** ke 1. Belah ketupat berubah menjadi A: satu-satunya neighbor terdekatnya adalah titik A, sedangkan pada k = 3 dua titik B mengalahkannya. Sekarang naikkan ke 15. Skor pada cluster bawaan naik dari 34 menjadi 38 dari 40, dan belah ketupat kembali berkelas B, dengan 9 dari 15 neighbor-nya memilih B.

[[figure:knn-lab/accuracy-by-k|Skor lab pada setiap k dari 1 sampai 15 untuk tiap dataset buatan. Garis putus-putus menandai k = 3, nilai awal lab.]]

k yang lebih besar tidak selalu lebih baik. Pada Cincin konsentris, skornya 40 dari 40 pada k = 3 dan 39 pada k = 9, lalu turun menjadi 33 pada k = 11, 22 pada k = 13, dan 26 pada k = 15. Semua kesalahan ada di cincin luar. Tiap cincin punya 24 titik, tetapi dengan 15 pemilih, test point di cincin luar menjangkau cincin dalam, dan titik-titik dalam mengalahkan cincinnya sendiri. Pada Papan catur skornya 40 dari 40 di setiap k kecuali k = 3, yang bernilai 39, sehingga di sana pilihan k hampir tidak berpengaruh.

> Awas: k terbaik ditentukan oleh datanya. Cluster membutuhkan k yang lebih besar untuk meratakan bagian yang tumpang tindih, sedangkan cincin membutuhkan k yang kecil agar tiap cincin tetap utuh.

## Meregangkan satu feature
*Apa yang dilakukan slider peregangan terhadap jarak?*

Meregangkan sebuah feature berarti mengalikannya dengan suatu angka sebelum jarak apa pun dihitung. Titik-titik tidak berpindah di plot: sumbunya tetap dalam satuan aslinya. Yang berubah hanya neighbor-nya, karena selisih pada feature yang diregangkan sekarang lebih berpengaruh.

Atur **Regangkan feature horizontal** ke ×5 dengan k = 3. Belah ketupat berbalik dari B ke A.

[[figure:knn-lab/stretch-neighbors|Query dan vote tiga neighbor yang sama, tanpa dan dengan feature horizontal diregangkan 5 kali. Di kanan, gambar dibuat dalam satuan yang sudah diregangkan, sehingga hanya sebuah jalur sempit dari plot asli yang tersisa.]]

Neighbor terdekat, yaitu titik A tepat di atas query, tetap berjarak 0,21 karena hampir tidak ada selisih ke samping. Titik B yang tadinya kedua terletak di samping query, dengan selisih ke samping sekitar 0,21. Selisih itu menjadi sekitar 1,04, dan titik tersebut turun ke urutan ketiga. Titik A lain dengan selisih ke atas yang lebih besar naik ke urutan kedua, dan A menang 2 lawan 1. Meregangkan feature horizontal membuat "dekat" berarti "punya nilai horizontal yang mirip".

> Gagasan kunci: meregangkan satu feature berarti memilih feature mana yang menentukan siapa yang dekat. Pada ×1 kedua feature berpengaruh sama besar dalam satuan plot itu sendiri.

## Peregangan bisa membantu, bisa merugikan
*Apakah meregangkan feature menaikkan skor?*

Tidak dengan sendirinya. Peregangan hanya membantu jika feature yang diregangkan membawa informasi yang memisahkan kelas. Gunakan kotak **Kuis Cepat** untuk menetapkan dugaanmu, lalu coba.

[[figure:knn-lab/accuracy-by-stretch|Skor pada k = 3 saat feature horizontal atau vertikal diregangkan dari ×1 sampai ×10. Pada cincin kedua garis turun; pada cluster keduanya naik-turun sampai empat poin.]]

Pada Cincin konsentris, satu kelas berupa cincin yang mengelilingi kelas lain, dan kelasnya bergantung pada jarak dari pusat ke segala arah. Regangkan salah satu feature dan "dekat" tidak lagi berbentuk bulat. Pada ×5 skor turun dari 40 ke 35 dari 40, dan pada ×10 menjadi 33 untuk feature horizontal dan 32 untuk feature vertikal. Pada cluster bawaan, kedua feature membawa informasi kelas, sehingga gambarannya campuran. Pada ×5 skornya 36 dari 40 untuk feature horizontal dan 38 untuk feature vertikal, naik 2 dan 4. Pada ×10 skornya 35 dan 34.

Gunakan **Simpan boundary ini untuk dibandingkan** sebelum mengubah pengaturan. Tombol itu menyimpan boundary saat ini sebagai garis putus-putus dan menampilkan perubahan skornya, misalnya "Sekarang: 35 dari 40 (−5)".

## Penguin nyata: satuan menentukan
*Mengapa data nyata berperilaku berbeda?*

Ubah **Sumber data** ke **Penguin (data nyata)**. Lab menggambar **Panjang sirip (mm)** pada sumbu mendatar dan **Massa tubuh (g)** pada sumbu tegak, dan kelasnya adalah spesies. Lab mulai dengan 48 penguin latih dan diuji pada 69 penguin yang disisihkan.

Kedua feature itu memakai satuan yang sangat berbeda. Dari 342 penguin yang punya kedua pengukuran, simpangan baku, yaitu sebaran yang lazim di sekitar rata-rata, untuk panjang sirip sekitar 14 mm dan untuk massa tubuh sekitar 800 g, rasio sekitar 57. Gram adalah angka yang besar, sehingga massa tubuh mendominasi setiap jarak yang belum diregangkan. Query berada di 200 mm dan 4.500 g. Tiga penguin latih terdekatnya adalah seekor Chinstrap pada 205 mm dan 4.500 g, seekor Gentoo pada 211 mm dan 4.500 g, dan seekor Adelie pada 191 mm dan 4.600 g.

[[figure:knn-lab/gap-bars|Untuk neighbor Adelie, selisih sirip 9 mm dan selisih massa 100 g. Meregangkan panjang sirip membuat batangnya tumbuh sampai hampir sama dengan batang massa.]]

> Contoh hitungan: untuk Adelie, selisihnya 9 mm ke samping dan 100 g ke atas. Tanpa peregangan jaraknya adalah akar dari (81 + 10.000), yaitu 100,4. Dengan panjang sirip diregangkan 10, selisih ke samping menjadi 90, dan jaraknya adalah akar dari (8.100 + 10.000), yaitu 134,5. Untuk Chinstrap, selisihnya 5 dan 0, sehingga jaraknya naik dari 5 menjadi 50.

Slider berhenti di ×10, jauh di bawah rasio 57, tetapi sudah berpengaruh. Neighbor yang dekat punya selisih massa yang kecil, seperti 100 g di atas, dan peregangan ×10 membuat 10 mm berpengaruh sama besar dengan 100 g. Pada k = 3 skornya 51 dari 69 di ×1, 53 di ×5, dan 52 di ×10. Pada k = 1 skornya naik dari 46 menjadi 51. Meregangkan massa tubuh tidak mengubah apa-apa, karena massa memang sudah menentukan.

## Mengapa skor tetap sekitar 75%
*Apa yang tidak diperbaiki oleh peregangan?*

Skor tetap berada di sekitar 75% karena alasan lain. Hanya 5 dari 48 penguin latih yang Chinstrap, sehingga test point Chinstrap jarang menemukan dua neighbor Chinstrap di antara tiga neighbor-nya. Pada k = 3, paling banyak 1 dari 14 test point Chinstrap yang diklasifikasikan benar pada peregangan apa pun. Peregangan membantu soal satuan, tetapi tidak dapat menambah contoh Chinstrap.

## Pengambilan baru
*Apakah hasilnya bertahan pada kumpulan training point yang baru?*

**Acak ulang** mengambil kumpulan training point baru dan mempertahankan 69 penguin uji. Setiap pengambilan memakai seed acak, yaitu angka yang menentukan titik mana yang terambil, sehingga angkamu akan berbeda dari yang tertulis di sini. **Reset** mengembalikan pengambilan bersama. Pada pengambilan bersama, peregangan menambah 1 poin pada k = 3. Apakah itu lazim?

Dalam 1.000 pengambilan acak, panjang sirip pada ×10 dengan k = 3 kehilangan 1 sampai 3 test point pada sekitar 4% pengambilan dan seri pada sekitar 5%. Pada sisanya skornya naik, dan rata-rata naik sekitar 4 test point pada seluruh pengambilan. Pengambilan bersama berada di sisi rendah, dan satu sampel saja meremehkan efeknya.

Jalankan pemeriksaan yang sama pada cluster buatan dan jawabannya berubah. Pada 1.000 pengambilan sejenis, peregangan horizontal ×5 mengubah skor sebesar −9 sampai +5 test point, dan 0 pada sekitar 29% di antaranya. Gagasan yang berlaku umum adalah "regangkan feature yang membawa kelas, ketika satuannya tidak sama". Gagasan yang tidak berlaku adalah "peregangan selalu membantu". Menyamakan semua feature ke rentang yang sama terlebih dahulu menghilangkan jebakan satuan itu sebelum kamu mulai. Hal ini dibahas di pelajaran "Scaling dan encoding" pada kursus "Preparing tabular data".

::: deeper Mengapa peregangan mengubah jarak, bukan datanya
Peregangan sebesar s pada feature horizontal mengubah jarak Euclidean antara dua titik dari akar (dx² + dy²) menjadi akar (s² × dx² + dy²), dengan dx dan dy adalah selisih ke samping dan ke atas. Pada s = 1 tidak ada yang berubah. Saat s membesar, dx² dikalikan s², sehingga sepasang titik yang selisihnya kecil ke samping segera menjadi lebih jauh daripada sepasang titik yang hanya berbeda ke atas. Untuk Adelie di atas, s = 10 mengubah 81 menjadi 8.100. Pasangan dengan dx = 0 tetap berjarak sama pada setiap s.
:::

::: remember
- Bandingkan pengaturan pada test point yang sama, dan anggap perubahan satu atau dua dari 40 sebagai noise sampai pengambilan baru menunjukkan hal yang sama.
- k yang lebih besar menghaluskan boundary dan membantu pada kelas yang tumpang tindih, tetapi dapat menghapus struktur sempit seperti cincin.
- Meregangkan feature membuatnya lebih berpengaruh pada setiap jarak. Ini membantu jika feature itu membawa kelas dan satuannya tidak sama, dan merugikan jika strukturnya membutuhkan kedua feature secara setara.
:::

@@lab

## Lab: k-NN dengan peregangan
Lab dibuka dengan 48 titik latih buatan dalam dua kelas, A dan B, 40 test point tetap, dan satu titik query di tengah, dengan k = 3, jarak Euclidean, dan tanpa peregangan. Skornya tertulis "Test point yang diklasifikasikan dengan benar: 34 dari 40 (85%)".

### Kontrol
- **Sumber data** beralih antara **Data buatan** dan **Penguin (data nyata)**. Data nyata menggambar **Panjang sirip (mm)** terhadap **Massa tubuh (g)**, dan kelasnya adalah spesies. Catatan di bawah kontrol itu menyebutkan berapa penguin yang dipakai, bahwa 69 disisihkan sebagai test point, dan bahwa menu **Dataset** hanya berlaku untuk data buatan.
- **Dataset** berisi **Cluster tumpang tindih**, **Cincin konsentris**, dan **Papan catur**. Menu ini dinonaktifkan pada data nyata.
- **Jarak** berisi **Euclidean** dan **Manhattan**.
- **Neighbor (k)** berkisar dari 1 sampai 15 dan dimulai di 3.
- **Feature yang diregangkan** memilih **Feature horizontal** atau **Feature vertikal**. Pada data nyata pilihannya adalah **Panjang sirip (horizontal)** dan **Massa tubuh (vertikal)**.
- Slider peregangan berkisar dari ×1 sampai ×10 dan dimulai di ×1. Labelnya mengikuti feature: **Regangkan feature horizontal**, **Regangkan feature vertikal**, **Regangkan panjang sirip**, atau **Regangkan massa tubuh**.
- **Jumlah titik** mengatur banyaknya titik latih, dari 4 sampai 400 (pada data nyata, sampai 273 penguin latih). Nilai awalnya 48. **Acak ulang** mengambil kumpulan titik latih baru; test point tetap sama.
- **Tampilkan decision region** dan **Tampilkan test point** sama-sama aktif di awal.
- **Simpan boundary ini untuk dibandingkan** menyimpan boundary saat ini sebagai garis putus-putus. **Hapus boundary yang disimpan** menghapusnya. Mengubah **Dataset**, **Jumlah titik**, atau **Sumber data**, atau menekan **Acak ulang**, juga menghapusnya, karena boundary itu tidak lagi sesuai dengan titik-titiknya.
- **Kuis Cepat** adalah tombol di bawah kartu pengaturan (tombol bulat di kanan bawah pada ponsel) (lencananya menghitung kuis yang belum kamu jawab; tombol ini membuka panel kecil). Kotak ini bertanya "Apa yang terjadi pada accuracy di test point saat satu feature diregangkan sampai ×5 atau lebih? Pilih jawabanmu, lalu atur slider peregangan." Pilihannya adalah **Naik**, **Hampir tidak berubah**, dan **Turun**.
- Pada plot, klik atau seret untuk menaruh titik query. Saat plot difokus, tombol panah menggesernya seperempat satuan, dan Shift menggesernya satu satuan penuh.
- **Layar penuh** memperbesar lab. **Reset** mengembalikan kumpulan titik bersama dan pengaturan awal: k = 3, **Euclidean**, **Cluster tumpang tindih**, 48 titik, tanpa peregangan, **Feature horizontal**, query di tengah, kotak **Kuis Cepat** kosong, dan tanpa boundary tersimpan. **Sumber data** dan kedua sakelar **Tampilkan** dibiarkan seperti yang kamu atur.

### Membaca layar
- Baris status berbunyi "Prediksi: kelas B" dengan sebuah swatch warna, dan baris di bawahnya berbunyi "2 dari 3 neighbor memilih B." atau, saat seri, "Vote seri, sehingga neighbor terdekat yang menentukan." Bar di atas plot membagi vote menurut kelas, dengan label seperti "Kelas A · 1". Pada data nyata labelnya adalah nama spesies.
- Belah ketupat adalah query. Warnanya mengikuti kelas prediksinya, dan sebuah garis menghubungkannya ke tiap neighbor, yang digambar lebih besar dengan garis tepi gelap.
- Titik latih berupa titik penuh. Test point berupa persegi bergaris tepi dengan warna kelas yang sebenarnya, dan tanda **×** pada sebuah test point berarti ia salah diklasifikasikan. Legenda memuat **Titik latih**, **Test point (tetap)**, **Test point yang salah diklasifikasikan**, **Boundary sekarang** (garis penuh), dan **Boundary yang disimpan** (garis putus-putus).
- Baris skor berbunyi "Test point yang diklasifikasikan dengan benar: 34 dari 40 (85%)". Setelah kamu menekan **Simpan boundary ini untuk dibandingkan**, baris di bawahnya berbunyi, misalnya, "Boundary yang disimpan (k = 3, Euclidean, tanpa peregangan): 40 dari 40 benar. Sekarang: 35 dari 40 (−5)."
- Setelah kamu memilih jawaban di **Kuis Cepat** dan mengatur slider ke ×5 atau lebih, kotak itu menyatakan apakah prediksimu tepat dan membandingkan skornya dengan skor tanpa peregangan. Perubahan 1 test point atau kurang dihitung sebagai "hampir tidak berubah".

### Eksperimen
Tekan **Reset** sebelum setiap eksperimen, dan baca angkanya dari baris skor. Angka itu berlaku untuk titik bersama; **Acak ulang** mengubahnya. **Reset** membiarkan **Sumber data** seperti terakhir kamu atur, karena itu aturlah ke **Data buatan** untuk eksperimen 1 sampai 4.

1. **Ubah k.** Prediksi: pada cluster bawaan, mana yang skornya lebih tinggi, k = 1 atau k = 15? Seret **Neighbor (k)** ke 1: belah ketupat menjadi A dan skornya masih 34 dari 40 (85%). Seret ke 15: belah ketupat menjadi B dengan "9 dari 15 neighbor memilih B.", dan skornya 38 dari 40 (95%). Dengan **Tampilkan decision region** aktif, perhatikan pulau-pulau kecil satu kelas menghilang saat k membesar. Jelaskan: apa yang dirata-ratakan oleh 15 pemilih?
2. **Cincin dan k.** Prediksi: pada **Cincin konsentris**, k berapa yang menjaga kedua cincin tetap utuh? Atur **Dataset** ke **Cincin konsentris** dengan k = 3: 40 dari 40 (100%). Tekan **Simpan boundary ini untuk dibandingkan**, lalu seret k ke 15: barisnya berbunyi "Sekarang: 26 dari 40 (−14)". Telusuri 9, 11, dan 13: 39, 33, dan 22 dari 40. Cari tanda silangnya: semuanya ada di cincin luar. Jelaskan: kedua cincin berisi 24 titik, lalu mengapa test point di cincin luar kalah vote pada k = 15?
3. **Regangkan cincin.** Prediksi: di kotak **Kuis Cepat**, pilih apa yang dilakukan peregangan terhadap skor pada cincin. Atur **Dataset** ke **Cincin konsentris** dengan k = 3, tekan **Simpan boundary ini untuk dibandingkan**, lalu atur slider ke ×5. Skornya 35 dari 40 (−5), dan kotak itu menyatakan prediksimu tepat jika kamu memilih **Turun**. Lanjut ke ×10: 33 dari 40 (−7). Atur **Feature yang diregangkan** ke **Feature vertikal**: 32 dari 40 pada ×10. Jelaskan: kelas bergantung pada jarak dari pusat ke segala arah, maka apa yang dilakukan peregangan terhadap "dekat"?
4. **Regangkan cluster.** Prediksi: pada **Cluster tumpang tindih**, apakah peregangan yang sama membantu? Atur slider ke ×5 dengan **Feature horizontal**: 36 dari 40, naik 2. Ganti ke **Feature vertikal**: 38 dari 40. Sekarang atur k ke 1: 32 dari 40, turun 2 dari 34 yang kamu dapat pada k = 1 tanpa peregangan. Tekan **Acak ulang** beberapa kali dan ulangi horizontal ×5: kadang membantu, kadang merugikan. Jelaskan: kedua feature membawa kelas di sini, maka apakah perubahan 2 dari 40 itu hasil atau noise?
5. **Penguin.** Prediksi: apakah meregangkan **Panjang sirip (horizontal)** ke ×10 membantu? Atur **Sumber data** ke **Penguin (data nyata)**: dengan k = 3 skornya 51 dari 69 (74%), dan belah ketupatnya Chinstrap karena vote seri. Atur k ke 1: 46 dari 69 (67%). Tekan **Simpan boundary ini untuk dibandingkan** dan atur slider ke ×10: 51 dari 69 (+5). Atur **Feature yang diregangkan** ke **Massa tubuh (vertikal)** dengan slider di ×10: skornya kembali ke 46, perubahan 0. Jelaskan dengan contoh hitungan: feature mana yang sejak awal sudah menentukan neighbor? Lalu atur k ke 3 dan lihat tanda silangnya: 14 dari 18 berada pada test point Chinstrap.
6. **Pengambilan baru.** Prediksi: apakah kenaikan dari panjang sirip pada ×10 bertahan pada training point baru? Dengan data nyata dan k = 3, tekan **Acak ulang**, lalu baca skor pada ×1 dan pada ×10, dan ulangi untuk sedikitnya lima pengambilan. Dalam 1.000 pengambilan acak, peregangan rugi pada sekitar 4%, seri pada sekitar 5%, dan naik pada sisanya, sehingga harapkan kenaikan pada sebagian besar pengambilan, tetapi tidak semuanya. Lalu kembalikan **Sumber data** ke **Data buatan**, pilih **Cluster tumpang tindih**, dan ulangi horizontal ×5 pada beberapa pengambilan. Jelaskan: kalimat mana tentang peregangan yang bertahan pada kedua dataset, dan mana yang tidak?
