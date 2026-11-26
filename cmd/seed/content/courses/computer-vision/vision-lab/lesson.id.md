---
slug: vision-lab
title: Vision lab
---
::: intro
- Latih CNN kecil pada gambar bentuk buatan, dengan dan tanpa augmentation.
- Uji pada gambar yang lebih gelap, lebih terang, diputar, dan bergeser, lalu cocokkan setiap augmentation dengan perubahan yang ditanganinya.
- Nilai hasil dari beberapa seed, dan beri skor pada kotak yang kamu seret terhadap kotak yang benar dengan IoU.

Sebelum mulai: baca "Convolution dan CNN" serta "Augmentation, transfer, dan metrik deteksi" di kursus ini. Pelajaran pertama memberimu network beserta jumlah weight-nya, pelajaran kedua memberimu augmentation, stress test, dan IoU.
:::

## Empat bentuk dalam 144 piksel
*Apa yang dipelajari network, dan dari gambar apa?*

Vision lab tidak memakai foto. Lab menggambar sendiri gambar abu-abu 12 × 12 dari empat bentuk: cincin, batang, silang, dan segitiga. Tiap bentuk setinggi sekitar 5 sampai 7 piksel (batang hanya selebar 1 piksel), terang (0,9) di atas latar gelap (0,1), dengan sedikit noise, dan pusatnya bergeser paling jauh satu piksel dari tengah. Semua gambar latih berada di tengah dan terang, dan itu disengaja.

Secara bawaan ada 200 gambar latih, 80 gambar validation, dan 120 gambar test, 30 untuk tiap bentuk pada test set. Tebakan acak benar 1 dari 4, sehingga 25% adalah batas bawahnya.

Modelnya adalah CNN kecil dari "Convolution dan CNN": convolution 3 × 3 dengan 4 filter, ReLU, max pooling 2 × 2, lalu dense layer yang menghasilkan 4 skor.

> Contoh hitungan: lab menampilkan 444 weight. Convolution punya 4 × (3 × 3) = 36 weight dan 4 bias, jadi 40. Gambar 12 × 12 menghasilkan peta 10 × 10, pooling menjadikannya 5 × 5, sehingga 4 × 25 = 100 angka masuk ke dense layer. Layer itu punya 100 × 4 = 400 weight dan 4 bias, jadi 404. Totalnya 40 + 404 = 444.

## Empat cara dunia bisa berubah
*Bagaimana lab mengubah gambar test, dan mengapa selalu dengan cara yang sama?*

Gambar test dapat diubah dengan empat cara, masing-masing dengan kekuatan yang kamu pilih. **Lebih gelap** mengalikan setiap piksel dengan 1 dikurangi bagian cahaya yang dibuang, mengurangkan 0,1, dan membatasi hasilnya paling rendah di 0. **Lebih terang** menambahkan satu angka ke setiap piksel dan memotongnya di 1. **Diputar** memutar gambar sebesar suatu sudut, ke satu sisi untuk satu gambar dan ke sisi lain untuk gambar berikutnya. **Bergeser** menggesernya sejauh beberapa piksel utuh ke salah satu dari delapan arah yang bergiliran.

Tidak satu pun memakai undian acak. Perubahannya hanya bergantung pada nomor gambar, sehingga dua network dinilai pada gambar yang identik.

> Contoh hitungan: ambil cahaya yang berkurang 60%. Piksel bentuk 0,9 menjadi 0,9 × 0,4 − 0,1 = 0,26, dan piksel latar 0,1 menjadi 0,1 × 0,4 − 0,1 = −0,06, yang dibatasi menjadi 0. Selisihnya menyusut dari 0,8 menjadi 0,26. Dengan kecerahan +0,35, piksel bentuk menjadi 1,25, dipotong menjadi 1, dan latarnya 0,45, sehingga selisihnya 0,55.

[[figure:vision-lab/test-changes-and-copies|Satu cincin dengan empat perubahan test (baris atas), dan satu gambar latih dengan empat salinan hasil augmentation acak (baris bawah).]]

## Salinan baru di setiap epoch
*Apa yang dilakukan setiap saklar augmentation pada gambar latih?*

Lab punya empat saklar augmentation, semuanya mati di awal. **Balik kiri-kanan** mencerminkan gambar pada separuh kesempatan. **Geser acak** menggeser gambar hingga sejauh beberapa piksel yang dipilih ke setiap arah. **Variasi kecerahan** mengalikan piksel dengan gain acak lalu menambahkan offset acak. **Rotasi kecil** memutarnya dengan sudut acak hingga batas yang dipilih.

Di setiap epoch, tiap gambar latih diubah lagi, sehingga network tidak pernah melihat salinan yang sama dua kali. Baris bawah pada figur di atas menunjukkan empat salinan seperti itu dari satu gambar. Labelnya tetap benar: cincin yang bergeser masih cincin.

Flip hampir tidak berpengaruh di sini, karena keempat bentuk sama saja dari kiri ke kanan. Seperti di pelajaran sebelumnya, hanya gambar latih yang diubah: gambar validation dan test dibiarkan apa adanya, dan kedua kurva loss diukur pada gambar yang bersih.

> Gagasan kunci: sebuah augmentation mengajari network bahwa satu jenis perubahan tidak boleh mengubah jawaban. Ia tidak mengajarkan apa pun tentang perubahan yang tidak kamu nyalakan.

## Cocokkan augmentation dengan perubahannya
*Cara melatih mana yang membantu jenis test mana?*

Latih lima network dan uji masing-masing pada lima kondisi. Tabel di bawah merata-ratakan sepuluh seed (seed adalah angka yang menetapkan gambar acak dan titik awal acak), dengan setiap pengaturan di nilai awalnya.

[[figure:vision-lab/which-augmentation-helps|Rata-rata akurasi test pada seed 1 sampai 10 untuk lima cara melatih dan lima kondisi test. Sel yang diberi garis tepi adalah pasangan yang sesuai.]]

Bacalah sepanjang sel yang diberi garis tepi. Tanpa augmentation, gambar yang bergeser mendapat skor sekitar 32%, mendekati tebakan acak. **Geser acak** menaikkannya menjadi 92%. **Variasi kecerahan** membawa gambar yang lebih gelap maupun lebih terang ke sekitar 99%. **Rotasi kecil** menaikkan gambar yang diputar dari 79% menjadi 91%.

Sekarang lihat sel yang tidak diberi garis tepi. Network yang dilatih dengan geseran mendapat skor 25% pada gambar gelap, yaitu tebakan acak: ia tidak pernah melihat gambar yang redup. Network yang dilatih dengan variasi kecerahan masih mendapat 31% pada gambar yang bergeser. **Setiap augmentation terutama membantu perubahan yang ditanganinya.**

Baris terakhir menyalakan ketiganya. Setiap kondisi test kini cukup baik, tetapi tidak ada yang menyamai spesialisnya, dan akurasi pada gambar asli turun dari 99% menjadi 93%.

## Harga yang harus dibayar augmentation
*Mengapa akurasi pada gambar asli bisa turun, dan sejauh mana jangkauan perlindungannya?*

Network dengan 444 weight punya ruang yang tetap. Tanpa augmentation, ia dapat menghafal 200 gambar: loss training-nya berakhir mendekati 0,00. Dengan ketiganya menyala, 30 epoch yang sama harus mencakup kumpulan gambar yang jauh lebih besar, dan loss pada gambar asli berakhir di sekitar 0,29 pada seed 1, dengan akurasi pada gambar asli 85% dibanding 98%.

Augmentation juga hanya menjangkau sejauh yang kamu latihkan. Network yang dilatih dengan geseran hingga 2 px mendapat skor 95% pada 1 px, 87% pada 2 px, 63% pada 3 px, dan 36% pada 4 px (seed 1).

Terakhir, salinan bukan objek baru. Dengan ketiga saklar menyala dan hanya 100 gambar latih, akurasi pada gambar bergeser adalah 52% pada seed 1, dibanding 82% dengan 200 gambar dan 84% dengan 400.

> Awas: pakailah rentang yang memang kamu harapkan akan ditemui. Batas rotasi ±45° untuk foto yang hanya miring 10° menghabiskan ruang network untuk gambar yang tidak akan pernah ia lihat.

## Jangan percaya satu kali percobaan
*Seberapa jauh skor dari 120 gambar test dapat dipercaya?*

Setiap gambar test bernilai sekitar 0,8 poin. Skor 80% pada 120 gambar punya standard error (ukuran khas keberuntungan dalam sebuah skor) sekitar 3,7 poin, sehingga selisih 3 atau 4 poin dapat terjadi karena kebetulan.

Figur ini menunjukkan network yang dilatih tanpa augmentation pada sepuluh seed. Akurasi pada gambar asli selalu 115 sampai 120 benar dari 120, sekitar 96% sampai 100%. Akurasi pada gambar bergeser selalu berada di antara 24% dan 39%: hasil itu berulang. Akurasi pada gambar yang lebih gelap tidak demikian: 27% pada seed 1 dan 98% pada seed 2. Network tidak pernah melihat gambar redup, sehingga jawabannya bergantung pada titik awal acaknya.

[[figure:vision-lab/seed-spread|Satu network yang dilatih tanpa augmentation, sepuluh seed, lima kondisi test. Gambar bergeser selalu gagal; gambar yang lebih gelap bisa mendarat di mana saja dari 27% sampai 98%.]]

Bacalah **Confusion matrix** di samping akurasinya. Pada seed 1, hampir semua gambar gelap disebut batang (118 dari 120): baris batang sempurna dan hanya 2 cincin yang benar, sehingga hasilnya 32 dari 120, atau 27%.

> Gagasan kunci: percayai efek yang berulang pada seed baru dan lebih besar dari beberapa poin. Anggap hasil yang berubah menurut seed sebagai kebetulan. Semua ini adalah hasil pada tugas buatan; foto sungguhan bervariasi dengan lebih banyak cara.

## Contoh deteksi objek
*Bagaimana IoU menilai kotak yang kamu seret di atas gambar?*

Gambar yang dipilih membawa dua kotak. Kotak bergaris penuh adalah kotak yang benar, ditentukan dari piksel bentuk, dan ia ikut bergerak bersama bentuk ketika gambar digeser atau diputar. Kotak putus-putus adalah milikmu: seret, atau pakai tombol panah. Lab menampilkan IoU dari "Augmentation, transfer, dan metrik deteksi" dan membandingkannya dengan **Threshold IoU**. Tidak ada network di dalam contoh ini: kamulah detektornya.

> Contoh hitungan: gambar test 1 (seed 1) adalah sebuah batang. Kotak yang benar mulai di x 6, y 3 dan lebarnya 1 serta tingginya 7, sehingga luasnya 7. Kotak prediksi pertama mulai di x 6,35, y 4 dan lebarnya 1,5 serta tingginya 7,5, luas 11,25. Irisannya selebar 0,65 (dari 6,35 sampai 7) dan setinggi 6 (dari 4 sampai 10), luas 3,9. Gabungannya 7 + 11,25 − 3,9 = 14,35, sehingga IoU = 3,9 / 14,35 = 0,27. Pada threshold 0,50 itu false positive, dan batangnya terlewat (false negative).

## Pelajaran dari kotak yang tipis
*Mengapa selip kecil begitu mahal bagi bentuk yang tipis?*

Geser kotak 0,5 px ke kiri dan 1 px ke atas. Irisannya menjadi 1 × 7 = 7, gabungannya 7 + 11,25 − 7 = 11,25, dan IoU = 0,62: true positive. Batang selebar hanya 1 piksel menghukum setiap selip ke samping, sedangkan bentuk yang lebih lebar lebih memaafkan.

[[figure:vision-lab/iou-on-the-grid|Batang pada gambar test 1 dengan kotak yang benar (garis penuh) dan kotak prediksi (garis putus-putus): IoU 0,27 pada awalnya, 0,62 setelah digeser sedikit.]]

::: deeper Ruang lebih besar, kerugian lebih kecil
Dengan 8 filter (884 weight) dan 60 epoch serta ketiganya menyala, seed 1 mencapai 97% pada gambar asli dan 95% pada gambar yang lebih gelap, dibanding 85% dan 72% dengan 4 filter dan 30 epoch.
:::

::: deeper Mengapa 1 piksel masih ditoleransi dan 2 tidak
Pooling mengambil nilai maksimum dari setiap blok 2 × 2 pada peta, sehingga fitur yang bergeser 1 piksel sering tetap berada di blok yang sama dan peta hasil pooling hampir tidak berubah. Pergeseran 2 piksel selalu mendorongnya ke blok berikutnya, dan dense layer membaca setiap posisi blok dengan weight-nya sendiri, sehingga ia melihat sesuatu yang baru. Di lab, seed 1 tanpa augmentation mendapat 78% pada 1 px, 35% pada 2 px, 14% pada 3 px, dan 23% pada 4 px. Anggaplah ini gambaran kasar, bukan bukti: kedelapan arah geseran juga mencampur gerak horizontal dan diagonal.
:::

::: deeper Seberapa berisik skor dari 120 gambar?
Untuk akurasi sebenarnya p, skor pada n gambar punya standard error sekitar sqrt(p × (1 − p) / n). Dengan p = 0,8 dan n = 120: sqrt(0,8 × 0,2 / 120) = sqrt(0,00133) = 0,0365, atau 3,7 poin. Sekitar dua pertiga percobaan jatuh dalam satu standard error dari nilai sebenarnya, sehingga 81% dan 78% pada 120 gambar yang sama bukan perbedaan yang nyata. Hitungan ini hanya mencakup pengambilan sampel gambar test. Seed training yang berbeda menambah sebaran, seperti ditunjukkan figur seed.
:::

::: deeper Dense network pada piksel
Kontrol **Model** juga menawarkan dense network. Ia tidak punya convolution, sehingga lab membangun satu network kecil untuk tiap bentuk, 144 piksel menuju 16 hidden unit menuju 1 skor. Masing-masing punya 144 × 16 + 16 = 2.320 weight di hidden layer dan 16 + 1 = 17 di output, jadi 2.337 seluruhnya, sehingga keempatnya punya 4 × 2.337 = 9.348 weight, sekitar 21 kali dari 444 milik CNN. Pada seed 1 ia mendapat 25% pada gambar bergeser tanpa augmentation, dan 88% dengan **Geser acak** menyala: hampir sama dengan hasil CNN (87%). Augmentation yang melakukan pekerjaan itu; convolution terutama menghemat weight.
:::

::: remember
- Lab melatih pada bentuk yang berada di tengah dan terang, lalu menguji pada salinan yang lebih gelap, lebih terang, diputar, dan bergeser. Skor pada gambar asli menyembunyikan setiap kegagalan yang tidak pernah ditunjukkan saat training.
- Setiap augmentation terutama membantu perubahan yang ditanganinya dan hanya sejauh rentang yang kamu latihkan; menyalakan semuanya mengorbankan sebagian akurasi pada gambar asli.
- Satu kali percobaan pada 120 gambar itu berisik. Percayai efek yang berulang pada seed baru, baca confusion matrix, dan beri skor kotak dengan IoU pada threshold yang disebutkan.
:::

@@lab

## Lab: convolution dan augmentation
Kamu melatih network kecil pada empat bentuk buatan, menyalakan augmentation, dan melihat bagaimana ia menghadapi gambar test yang lebih gelap, lebih terang, diputar, dan bergeser. Network dimulai tanpa dilatih. Tidak ada yang berlatih sampai kamu menekan **Latih** atau **Bandingkan dengan dan tanpa augmentation**. Lab ini menggambar gambarnya sendiri, sehingga tidak ada pilihan data nyata: ujian pada sesuatu yang baru adalah **Seed** baru, yang memberi gambar latih baru, gambar test baru, dan titik awal acak yang baru.

### Kontrol
- **Model** memilih **CNN kecil (convolution)** atau **Dense network pada piksel**. **Filter convolution** (2 sampai 8, dimulai di 4) berlaku untuk CNN. **Hidden unit** (8 sampai 32, dimulai di 16) berlaku untuk dense network.
- **Gambar training** (40 sampai 400, dimulai di 200) dan **Seed** (1 sampai 99, dimulai di 1) menentukan data. Mengubah model, ukurannya, **Gambar training**, **Seed**, atau pengaturan augmentation apa pun akan me-reset network, dan status berbunyi "Pengaturan berubah: network di-reset. Tekan Train."
- **Balik kiri-kanan**, **Geser acak**, **Variasi kecerahan**, dan **Rotasi kecil** adalah augmentation, semuanya mati di awal. Setiap saklar menampilkan kekuatannya saat menyala: **Geser hingga** (1 sampai 4 px, dimulai di 2 px), **Kekuatan kecerahan** (±0,10 sampai ±0,60, dimulai di ±0,40), dan **Putar hingga** (±5° sampai ±45°, dimulai di ±25°).
- **Epoch** (5 sampai 60, dimulai di 30) adalah targetnya. Menaikkannya mempertahankan network; jika kamu menurunkannya setelah training, status menyebut bahwa target kini lebih rendah dan meminta kamu menekan **Latih ulang**.
- **Latih** menjalankan epoch. Tombol ini menjadi **Jeda** saat berjalan dan **Latih ulang** setelah target tercapai. **Langkah (1 epoch)** melatih satu epoch. **Reset model** hanya me-reset weight; ia tidak melatih. Sebuah bar di bawah tombol menunjukkan kemajuan.
- **Kondisi test** adalah **Asli**, **Lebih gelap**, **Lebih terang**, **Diputar**, atau **Bergeser**. **Kekuatan test** di awal berbunyi "cahaya berkurang 60%", "kecerahan +0,35", "25°", atau "2 px", dan setiap kondisi mengingat kekuatannya sendiri. Mengubah salah satunya akan menguji ulang network yang sama tanpa melatih lagi.
- **Bandingkan dengan dan tanpa augmentation** melatih dua network dengan pengaturan saat ini, satu tanpa augmentation dan satu dengan augmentation saat ini, lalu menaruh keduanya di bar chart. Tombol ini nonaktif sampai satu augmentation menyala, dan **Latih** berubah menjadi **Berhenti** selama berjalan. Hasilnya disimpan, sehingga mengulang perbandingan berlangsung seketika.
- **Kisi gambar dan deteksi** adalah grup yang bisa dilipat: **Gambar di kisi** (**Gambar test (dengan kondisi test)**, **Gambar training**, **Gambar training setelah augmentation**), **Gambar terpilih**, dan **Threshold IoU** (0,30 sampai 0,90, dimulai di 0,50).
- Di plot: klik sebuah gambar untuk memilihnya, lalu seret kotak putus-putus. Dengan keyboard, fokuskan plot; tombol panah menggeser kotak, Shift dengan tombol panah mengubah ukurannya, Home mengembalikannya, Page Up dan Page Down memilih gambar lain.
- **Layar penuh** memperbesar lab. **Reset** mengembalikan setiap kontrol ke nilai awal dan menghapus pilihan Kuis Cepat.
- **Kuis Cepat** berisi dua kotak: "Network dilatih hanya dengan gambar yang berada di tengah dan terang. Bagaimana akurasi pada gambar test yang lebih gelap atau bergeser?" dan "Kamu melatih network kedua dengan augmentation yang kamu nyalakan. Bagaimana akurasinya pada gambar test asli dibandingkan dengan network tanpa augmentation?" Pilih jawaban lebih dulu, baru latih.

### Membaca layar
- Baris status berbunyi "Belum dilatih: network menebak, sekitar 1 dari 4 benar. Tekan Train." lalu, misalnya, "Epoch 30 dari 30. Akurasi training 100%, akurasi validation 100%." Baris di bawahnya adalah contoh deteksi objek, dan metrik di sebelah kanannya berbunyi "Ukuran model: 444 weight".
- Kisi menampilkan gambar beserta bentuknya yang benar. Setelah training, sebuah bingkai menandai **Prediksi benar** atau **Prediksi salah**, dan yang salah juga menyebut tebakannya. **Gambar terpilih** punya cincinnya sendiri. Berapa banyak gambar yang tampil di kisi bergantung pada lebar layarmu.
- Di bawah kisi, gambar terpilih membawa **Kotak benar** dan **Kotak prediksi (seret)**, dengan "Benar: …", "Prediksi: batang (100%)", dan IoU.
- Di sebelahnya, CNN menampilkan **Filter hasil belajar (3×3) dan feature map gambar terpilih**: sembilan weight tiap filter (**Weight positif** dan **Weight negatif**), feature map-nya setelah ReLU, dan peta setelah max pooling. Dense network menampilkan **Hidden unit pertama: weight pada 144 piksel** dan output tiap unit.
- **Loss selama pelatihan** memuat kurva Training dan Validation, keduanya pada gambar asli. **Akurasi menurut kondisi test** memuat satu batang per kondisi (dipersingkat pada layar sempit) untuk **Tanpa augmentation** dan, setelah dibandingkan, **Dengan augmentation saat ini**, dengan garis putus-putus pada tebakan acak (25%). **Confusion matrix** untuk kondisi test yang dipilih, dengan recall tiap bentuk di sebelah kanan.

### Eksperimen
Angkanya untuk seed 1. Tekan **Reset** dulu agar angkamu sama.

1. **Network yang hanya melihat bagian tengah.** Perkirakan: tanpa augmentation, kondisi test mana yang akan jatuh jauh di bawah akurasi pada gambar asli? Pilih jawaban di kotak Kuis Cepat pertama, tekan **Latih**, dan baca **Akurasi menurut kondisi test**: **Asli** 98%, **Lebih gelap** 27%, **Lebih terang** 52%, **Diputar** 81%, **Bergeser** 35%. Atur **Kondisi test** ke **Bergeser** dan geser **Kekuatan test** dari 1 px ke 4 px: 78%, 35%, 14%, 23%. Lalu pilih **Lebih gelap** dan buka **Confusion matrix**: kolom batang memuat hampir semuanya. Jelaskan 27%: network menyebut hampir setiap gambar redup sebagai batang. Kembalikan Bergeser ke 2 px sebelum lanjut: lab mengingat kekuatan tiap kondisi.
2. **Pencahayaan.** Perkirakan: jika gambar latih mendapat perubahan kecerahan acak, apa yang terjadi pada **Lebih gelap** dan **Lebih terang**, dan pada **Bergeser**? Nyalakan **Variasi kecerahan** lalu tekan **Bandingkan dengan dan tanpa augmentation**. Lebih gelap naik dari 27% ke 100%, Lebih terang dari 52% ke 98%, Asli tetap 98%, dan Bergeser tetap sekitar 34%. Kotak Kuis Cepat kedua berbunyi "Hampir sama". Buka **Kisi gambar dan deteksi** dan atur **Gambar di kisi** ke **Gambar training setelah augmentation** untuk melihat salinannya. Jelaskan mengapa augmentation pencahayaan tidak dapat membantu geseran.
3. **Geseran atau rotasi.** Perkirakan: dengan hanya **Geser acak** yang menyala, batang mana yang naik? Matikan **Variasi kecerahan**, nyalakan **Geser acak**, lalu tekan **Bandingkan dengan dan tanpa augmentation**. Bergeser naik dari 35% ke 87%, tetapi Lebih gelap masih di tingkat tebakan acak, 25%, dan Asli turun ke 93% (kotak kedua berbunyi "Lebih rendah"). Atur **Kondisi test** ke **Bergeser** dan naikkan **Kekuatan test** ke 3 px dan 4 px: 63% dan 36%. Sekarang matikan **Geser acak** dan nyalakan **Rotasi kecil**, bandingkan lagi, dan atur test ke **Diputar**: 81% naik ke 89%, dan pada 35° dan 45° hasilnya 68% dan 47%. Jelaskan untuk apa network itu tidak pernah dilatih. Bergeser kini di 4 px dan Diputar di 45°.
4. **Semua menyala, dan harganya.** Tekan **Reset**. Perkirakan: dengan ketiganya menyala, apakah setiap kondisi akan mengalahkan spesialisnya? Nyalakan **Geser acak**, **Variasi kecerahan**, dan **Rotasi kecil**, lalu bandingkan: Asli 85%, Lebih gelap 72%, Lebih terang 79%, Diputar 77%, Bergeser 82%. Lihat **Loss selama pelatihan**: kurvanya berakhir di sekitar 0,29, padahal tanpa augmentation berakhir di sekitar 0,00 dan 0,02. Lalu atur **Filter convolution** ke 8 dan **Epoch** ke 60 dan bandingkan lagi: Asli 97%, Lebih gelap 95%, Lebih terang 93%, Diputar 78%, Bergeser 89%, dengan "Ukuran model: 884 weight".
5. **Sebuah kotak dan sebuah threshold.** Perkirakan: apakah kotak putus-putus awal pada gambar 4 lolos **Threshold IoU** 0,50? Buka **Kisi gambar dan deteksi**, atur **Gambar di kisi** ke **Gambar test (dengan kondisi test)** (eksperimen 2 mungkin mengubahnya), atur **Kondisi test** ke **Asli** dan **Gambar terpilih** ke 4, sebuah segitiga. Baris detail memberi IoU 0,48: meleset. Fokuskan plot dan tekan panah atas empat kali: IoU 0,64. Tekan panah kiri dua kali: IoU 0,74. Sekarang naikkan **Threshold IoU** ke 0,75 dan lihat ia gagal lagi. Lalu pilih gambar 1, sebuah batang tipis, yang dimulai di 0,27. Jelaskan mengapa bentuk yang tipis lebih sulit dikotaki.
6. **Seed baru.** Perkirakan: temuan di atas mana yang akan bertahan pada **Seed** baru? Tidak ada pilihan data nyata di sini, sehingga seed baru adalah ujiannya. Tekan **Reset**, atur **Seed** ke 2, dan ulangi eksperimen 1 sampai 3 dengan membaca batang pada kekuatan awal (2 px, 25°). Tanpa augmentation: Asli 99%, Lebih gelap 98%, Lebih terang 68%, Diputar 77%, Bergeser 34%, dan kotak Kuis Cepat pertama kini menyebut hanya gambar bergeser yang turun. **Variasi kecerahan** memberi Lebih gelap 99% dan Lebih terang 98%; **Geser acak** memberi Bergeser 88% dan Lebih gelap 25%; **Rotasi kecil** memberi Diputar 92%. Coba juga **Seed** 3. Hasil mana yang berulang dan mana yang berubah? Terakhir, tekan **Reset** (seed 1, 4 filter, 30 epoch), nyalakan ketiga augmentation, atur **Gambar training** ke 100, lalu bandingkan: Bergeser turun ke 52%, padahal 200 gambar memberi 82%.
