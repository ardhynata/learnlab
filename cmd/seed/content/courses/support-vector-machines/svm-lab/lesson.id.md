---
slug: svm-lab
title: Lab SVM
---
::: intro
- Perkirakan bagaimana margin berubah ketika sebuah support vector, atau titik lain, digeser, lalu periksa di lab.
- Jelaskan apa yang dilakukan C pada margin dan jumlah support vector, serta apa yang dilakukan gamma pada boundary yang melengkung.
- Bandingkan boundary Linear dan RBF pada bentuk data buatan dan pada penguin yang asli, lalu periksa hasilnya pada sampel yang baru.

Sebelum mulai: baca "Margins and support vectors" dan "Soft margins and kernels".
:::

## Apa yang ditampilkan lab ini
*Apa yang kamu lihat begitu lab SVM terbuka?*

Lab terbuka dengan dua kumpulan titik buatan: 40 titik per kelas, 80 titik seluruhnya. Sebanyak 30%, yaitu 24 titik, disisihkan sebagai held-out. Lab tidak pernah melatih model dengan titik-titik itu dan hanya menilainya, sehingga kamu dapat membandingkan model pada titik yang sudah dilihat dan yang belum. Sisanya, 56 titik, adalah titik training.

Modelnya sama dengan yang ada di "Soft margins and kernels": kernel Linear dengan C 0,1. Di bawah judul, lab menuliskan apa yang dipelajari model. Dari 56 titik training, 13 adalah support vector, lebar margin 2,10, dan accuracy 100,0% pada titik training serta 95,8% pada titik held-out, yaitu 23 dari 24 benar.

Lebar margin adalah 2 / |w| seperti di "Margins and support vectors". Di sini |w| = 0,951, sehingga lebarnya 2 / 0,951 = 2,10.

Setiap eksperimen mengikuti satu pola: perkirakan, ubah satu hal, jelaskan hasilnya, lalu ulangi pada penguin yang asli dan pada sampel yang baru.

## Membaca gambarnya
*Apa arti arsiran, garis, dan tanda-tandanya?*

[[figure:svm-lab/reading-the-plot|Lab pada pengaturan awal, dengan keterangan setiap tanda dan angka yang ditampilkannya.]]

**Arsiran** menunjukkan prediksi model di setiap tempat: biru bila model menjawab kelas A, merah muda bila kelas B. Garis tebal adalah decision boundary, tempat skornya 0. Dua garis putus-putus adalah tepi jalur, tempat skornya -1 dan +1.

Titik bulat adalah titik training kelas A, belah ketupat adalah titik training kelas B, dan tanda silang adalah titik held-out dari kelas mana pun, dengan warna kelasnya. Lingkaran di sekeliling sebuah titik menandai support vector. Seperti di "Soft margins and kernels", itu adalah titik training yang berada di tepi jalur, di dalam jalur, atau di sisi yang salah dari garis.

Pada kernel RBF, boundary melengkung dan lab tidak menggambar garis putus-putus, karena jarak antartepinya tidak sama di semua tempat. Keterangannya berbunyi "Boundary yang melengkung tidak punya satu lebar margin."

## Menggeser sebuah support vector
*Apa yang terjadi pada jalur ketika kamu menyeret titik yang dilingkari?*

[[figure:svm-lab/moving-a-support-vector|Tiga hasil fit pada C 10. Kiri: kondisi awal. Tengah: belah ketupat yang dilingkari diseret mendekati garis. Kanan: diseret menjauh. Panah menunjukkan arah seretan.]]

Atur C ke 10. Hanya tiga titik yang tetap dilingkari dan lebar margin menjadi 1,38. Belah ketupat berlingkaran yang paling dekat dengan tengah, di sekitar x 0,35 dan y 0,31, ikut menahan jalur di tempatnya.

Seret titik itu mendekati garis, ke sekitar x 0 dan y 0, dan margin turun menjadi 0,91. Jalur harus menyempit agar muat di antara belah ketupat itu dan dua titik kelas A yang dilingkari. Dorong sedikit melewati garis, ke sekitar x -0,3 dan y -0,2, dan lebarnya menjadi 0,55.

Seret menjauh, ke sekitar x 1,5 dan y 1,5, dan margin melebar menjadi 1,62. Titik itu tidak lagi berada di jalur, sehingga belah ketupat lain, yang berada di sekitar x 0,6 dan y 0,4, menggantikannya sebagai titik yang dilingkari. Inilah klaim dari "Margins and support vectors": geser sebuah support vector dan boundary ikut bergeser.

> Awas: seretan yang sama pada C 0,1 membiarkan margin tetap 2,10. Penjelasannya ada di bagian lebih dalam di bawah ini.

::: deeper Mengapa seretan hampir tidak berpengaruh pada C 0,1
Setiap support vector memiliki bobot, alpha, antara 0 dan C. Pada C 0,1, 10 dari 13 support vector berada di dalam jalur dan alpha-nya tertahan di batas atas C = 0,1. Titik yang tertahan menarik garis dengan gaya yang terbatas, dan seretan tidak dapat menaikkannya. Tiga titik lainnya memiliki alpha 0,038, 0,003, dan 0,035 dan berada tepat di tepi jalur. Pada C 10, ketiga support vector berada di tepi jalur, dengan alpha 0,63, 0,42, dan 1,06, dan masing-masing menarik dengan gaya penuhnya, tanpa batas. Itulah sebabnya seretan menggeser jalur pada C 10. Pada C 0,1, hanya 3 titik di tepi yang menentukan garis, sehingga menggeser titik yang berada di dalam jalur nyaris tidak menggeser garis.
:::

## Titik yang bukan support vector
*Titik mana yang boleh digeser tanpa mengubah apa pun?*

Biarkan C di 10 dan tekan **Kembalikan titik**. Seret belah ketupat paling kanan, di sekitar x 2,7 dan y 0,6, ke atas hingga sekitar x 2 dan y 2,5. Titik itu tadinya jauh dari jalur dan sekarang masih jauh. Tidak ada yang berubah: baris status tetap menyebut 3 dari 56 dan lebar margin 1,38.

Sekarang seret sebuah silang held-out. Ambil silang kelas B di sekitar x 1,8 dan y 0, lalu seret melewati garis ke sekitar x -2 dan y 0. Lebar margin dan titik yang dilingkari tetap tidak berubah. Hanya accuracy held-out yang bergerak, dari 100,0% menjadi 95,8%.

Model tidak pernah dilatih dengan silang itu, sehingga ia tidak dapat membentuk boundary. Ia hanya dapat dinilai. Dengan 24 titik held-out, satu titik yang salah mengurangi 1 / 24 = 4,2 poin persentase.

> Gagasan kunci: boundary ditentukan oleh support vector saja. Titik training yang jauh dari jalur, dan titik held-out, boleh dipindahkan ke mana saja dan jalurnya tetap di tempatnya.

## C: jalur yang lebih sempit dan support vector yang lebih sedikit
*Apa yang dilakukan C pada margin dan pada jumlah support vector?*

[[figure:svm-lab/three-values-of-c|Titik yang sama pada tiga nilai C. Makin besar C, makin sempit jalurnya dan makin sedikit titik yang menahannya.]]

Tekan **Reset** dan baca 13 support vector serta margin 2,10 pada C 0,1. Naikkan C ke 10 dan margin turun menjadi 1,38 serta support vector menjadi 3. Turunkan C ke 0,01 dan margin melebar menjadi 3,75 dengan 42 support vector. Training accuracy tetap 100,0% pada ketiganya.

C yang kecil membuat titik di dalam jalur murah, sehingga jalur menjadi lebar dan banyak titik berada di dalamnya. C yang besar membuat setiap titik semacam itu mahal, sehingga jalur menyempit sampai hanya sedikit titik yang berada di tepi atau di dalamnya.

Naikkan C dari 10 ke 100 dan tidak ada yang berubah: tetap 1,38 dan 3. Tidak ada lagi titik di dalam jalur, jadi tidak ada lagi yang perlu dipersempit.

> Awas: jalur yang lebih sempit belum tentu lebih baik. Pada Dua kumpulan yang tumpang tindih, menaikkan C dari 0,1 ke 100 mempersempit margin dari 1,97 menjadi 0,73 dan mengurangi support vector dari 31 menjadi 14, tetapi accuracy held-out turun dari 83,3% menjadi 79,2%.

## Linear melawan RBF
*Kapan boundary melengkung membantu?*

[[figure:svm-lab/linear-against-rbf|Dua cincin pada C dan gamma bawaan lab. Garis lurus tidak dapat melingkupi cincin dalam; boundary RBF dapat.]]

Tekan **Reset**, lalu atur **Bentuk data buatan** ke **Dua cincin**. Kernel Linear, pada C bawaan 0,1, mendapat 60,7% pada titik training dan 54,2% pada titik held-out, mendekati tebakan acak. C yang lebih besar tidak menolongnya: di seluruh rentang slider, training accuracy terbaik adalah 64,3%, yaitu 36 dari 56 titik. Garis lurus tidak dapat menaruh satu kelas di dalam kelas lainnya.

Ganti **Kernel** ke **RBF (melengkung)**, dengan gamma bawaan 1. Boundary menekuk mengelilingi cincin dalam dan kedua accuracy menjadi 100,0%. Baris **Lebar margin (hanya linear)** menampilkan tanda strip.

Bentuk Bulan sabit berada di antara keduanya. Pada C 0,1 dan gamma 1 yang sama, Linear mendapat 73,2% pada titik training dan 79,2% pada titik held-out; RBF mendapat 87,5% dan 95,8%. Aturan dari "Soft margins and kernels" terbukti: kernel memungkinkan metode yang dibangun dari garis lurus untuk menggambar kurva.

> Gagasan kunci: kernel menentukan boundary mana yang mungkin, sedangkan C dan gamma menentukan boundary mana yang kamu dapatkan. Pilih bentuknya dulu, baru lakukan tuning.

## Gamma dan skor held-out
*Apa yang diberikan gamma yang besar, dan apa harganya?*

Pakai **Dua kumpulan yang tumpang tindih**, kernel **RBF (melengkung)**, dan C 10. Pada gamma 0,1, model memiliki 18 dari 56 support vector, training accuracy 87,5%, dan accuracy held-out 79,2%. Pada gamma 1 ada 24 support vector dan training accuracy 94,6%. Pada gamma 10 ada 50 support vector dan training accuracy 100,0%. Accuracy held-out tetap 79,2%, yaitu 19 dari 24.

Gamma yang besar membuat kurva membungkus setiap titik training dalam petak kecilnya sendiri, sehingga training accuracy cenderung naik. Titik held-out menunjukkan apakah pembungkusan itu mempelajari sesuatu. Di sini tidak.

Tekan **Sampel baru** sekali untuk memeriksanya. Pada gamma 0,1, sampel itu memberi 82,1% pada titik training dan 79,2% pada titik held-out. Pada gamma 10, hasilnya 100,0% dan 66,7%. Inilah overfitting yang ditunjukkan "Soft margins and kernels" lewat tiga panel gamma-nya.

> Contoh hitungan: 66,7% adalah 16 dari 24 titik held-out. Turun dari 79,2% (19 dari 24) ke 66,7% berarti tiga titik tambahan yang salah, masing-masing bernilai 4,2 poin.

## Penguin: C dan kernel
*Apakah aturan tentang C dan kurva berlaku pada data nyata?*

Tekan **Reset**, atur **Data** ke **Penguin (data nyata)**, dan biarkan kernel Linear. Lab membandingkan Adelie dengan Chinstrap berdasarkan panjang dan kedalaman paruh, masing-masing distandarkan hanya dengan penguin training. Sebanyak 219 dari 220 penguin kedua spesies itu memiliki kedua pengukuran, dan lab menampilkan 40 penguin dari tiap spesies.

Pada C 0,1, 24 dari 56 penguin training adalah support vector dan marginnya 1,65. Pada C 10 ada 4 dan marginnya 0,42. Tekan **Sampel baru** tiga kali: pada keempat sampel, C 0,1 memberi 24 sampai 29 support vector dengan margin 1,64 atau 1,65, dan C 10 memberi 4 sampai 7 dengan margin 0,36 sampai 0,46. C yang lebih besar kembali menghasilkan jalur yang lebih sempit dan support vector yang lebih sedikit.

Sekarang biarkan C di 10 dan bandingkan kernel pada keempat sampel yang sama. Linear mendapat 100,0% held-out pada keempatnya. RBF dengan gamma 10 mendapat training accuracy 100,0% pada keempatnya, tetapi 91,7%, 95,8%, 91,7%, dan 91,7% pada held-out, dan memerlukan 47 dari 56 penguin sebagai support vector pada sampel pertama, dibandingkan 4 untuk garis lurus. Di sini garis lurus sudah cukup, dan tekukan tambahan hanya menghafal penguin training. Selisihnya satu atau dua penguin dari 24, sehingga ini pemeriksaan kecil dan bukan bukti.

> Gagasan kunci: tanyakan dulu apakah data memerlukan kurva sebelum kamu membayar untuknya. Model yang lebih sederhana dengan skor held-out yang sama baiknya adalah pilihan yang lebih tepat.

::: remember
- Menggeser support vector menggeser jalur. Pada C 10, menyeret belah ketupat berlingkaran dari x 0,35, y 0,31 ke tengah mengurangi margin dari 1,38 menjadi 0,91. Titik yang jauh dari jalur dan titik held-out tidak mengubah apa pun.
- C yang lebih besar menghasilkan jalur yang lebih sempit dan support vector yang lebih sedikit (2,10 menjadi 1,38, dan 13 menjadi 3, dari C 0,1 ke 10), tetapi tidak selalu model yang lebih baik.
- RBF dapat menggambar kurva yang tidak dapat digambar garis lurus (100,0% berbanding 60,7% training accuracy pada Dua cincin, pada C 0,1), tetapi gamma yang besar cenderung menaikkan training accuracy tanpa menaikkan accuracy held-out. Periksa pada titik held-out dan pada sampel yang baru.
:::

@@lab

## Lab: support vector machine
Kamu mulai dengan 80 titik buatan dalam dua kumpulan, 56 untuk training dan 24 held-out. Modelnya adalah kernel Linear dengan C 0,1. Kamu menyeret titik, mengubah C, gamma, dan kernel, lalu melihat margin, support vector yang dilingkari, dan accuracy diperbarui.

### Kontrol
- **Data** berpindah antara **Data buatan** dan **Penguin (data nyata)**. Data nyata membandingkan Adelie dengan Chinstrap berdasarkan panjang dan kedalaman paruh, yang distandarkan. Baris dengan missing value dibuang, dan catatan di bawah kontrol menyebutkan jumlahnya.
- **Bentuk data buatan** (hanya pada data buatan) memilih **Dua kumpulan titik**, **Dua kumpulan yang tumpang tindih**, **Dua cincin**, atau **Bulan sabit**. Awalnya **Dua kumpulan titik**.
- **Kernel** memilih **Linear (garis lurus)** atau **RBF (melengkung)**. Awalnya Linear.
- **C (penalti untuk titik di dalam margin)** adalah slider logaritmik dari 0,01 sampai 100. Awalnya 0,1.
- **Gamma (seberapa tajam kurva RBF menekuk)** adalah slider logaritmik dari 0,01 sampai 10. Awalnya 1. Slider ini hanya muncul ketika **Kernel** adalah **RBF (melengkung)**.
- **Sampel baru** mengambil titik baru dengan bentuk yang sama, atau kumpulan penguin yang baru. Seretanmu dihapus dan pengaturanmu tetap.
- **Kembalikan titik** mengembalikan setiap titik yang diseret ke posisi awalnya.
- Seret sebuah titik dengan mouse atau jarimu, dan model dilatih ulang saat kamu menggesernya. Dengan keyboard, fokus ke plot, tekan tombol panah untuk memilih titik terdekat ke arah itu, tekan Enter untuk mengangkatnya, gerakkan dengan tombol panah (Shift untuk langkah lebih besar), lalu tekan Enter atau Escape untuk meletakkannya.
- **Layar penuh** memperbesar lab. **Reset** mengembalikan lab ke **Data buatan**, **Dua kumpulan titik**, **Linear (garis lurus)**, C 0,1, gamma 1, dan sampel pertama, serta menghapus Kuis Cepat.
- **Kuis Cepat** adalah tombol di bawah kartu Parameter. Isinya satu pertanyaan: "Jika kamu membuat C jauh lebih besar, apa yang terjadi pada margin dan pada jumlah support vector?" Pilih satu jawaban pada kernel Linear, lalu naikkan C jauh lebih besar, misalnya dari 0,1 ke 10, dan kotak itu memeriksa jawabanmu (atau tekan **Periksa jawaban**). Jangan ubah hal lain di antara memilih jawaban dan menaikkan C.

### Membaca layar
- Legenda menamai setiap tanda: **Kelas A (titik bulat)** dan **Kelas B (belah ketupat)** (pada data nyata, **Adelie** dan **Chinstrap**), **Silang: titik held-out, tidak dipakai untuk training**, **Dilingkari: support vector**, **Decision boundary**, dan, hanya pada kernel Linear, **Garis margin**. Arsiran menunjukkan prediksi model.
- Baris status berbunyi, misalnya, "13 dari 56 titik training adalah support vector. Lebar margin 2,10. Accuracy: 100,0% pada titik training, 95,8% pada titik held-out." Dengan **RBF (melengkung)**, kalimat margin menjadi "Boundary yang melengkung tidak punya satu lebar margin." Di sampingnya ada hitungan seperti "56 titik training, 24 held-out".
- Baris di bawahnya memberi tahu apa yang dapat dicoba, dan saat kamu menyeret, baris itu memberi posisi titik, misalnya "Menggeser titik 63 (Kelas B, training): x 0,35, y 0,31."
- Tabel **Yang dipelajari model** memiliki kolom **Ukuran** dan **Nilai** serta baris **Kernel**, **C**, **Gamma (hanya RBF)**, **Titik training**, **Titik held-out**, **Support vector** (misalnya "13 dari 56"), **Lebar margin (hanya linear)**, **Training accuracy**, dan **Held-out accuracy**.
- Jika data penguin tidak dapat dimuat, lab menampilkan "Data penguin tidak bisa dimuat, jadi data buatan yang ditampilkan. Pilih Penguin lagi untuk mencoba lagi."

### Eksperimen
Mulai setiap eksperimen dengan **Reset**, dan baca angkanya dari baris status atau tabel. Satu titik held-out bernilai 4,2 poin accuracy held-out, sehingga selisih kecil di sana hanyalah noise.

1. **Menggeser sebuah support vector.** Prediksikan: pada C 10, jika kamu menyeret belah ketupat berlingkaran yang paling dekat dengan tengah (sekitar x 0,35, y 0,31) mendekati garis, apakah margin menjadi lebih lebar atau lebih sempit? Persiapan: seret **C (penalti untuk titik di dalam margin)** ke 10. Tiga titik dilingkari dan lebar margin 1,38. Seret belah ketupat itu ke sekitar x 0, y 0: lebar margin turun menjadi 0,91. Seret ke sekitar x -0,3, y -0,2: 0,55. Sedikit lebih jauh, sekitar x -0,6, y -0,4, lebarnya naik lagi menjadi 1,05 dan **Training accuracy** turun menjadi 98,2%, karena garis melepaskan satu titik itu. Tekan **Kembalikan titik** dan seret belah ketupat itu menjauh ke sekitar x 1,5, y 1,5: margin melebar menjadi 1,62 dan belah ketupat yang lain dilingkari. Jelaskan: titik mana yang menahan jalur? Lalu atur C ke 0,1 dan ulangi seretan pertama: margin tetap 2,10. Mengapa C berpengaruh di sini?
2. **Titik yang tidak berpengaruh.** Prediksikan: apa yang berubah jika kamu menyeret titik yang tidak dilingkari, dan apa jika kamu menyeret silang held-out? Persiapan: C di 10, lalu **Kembalikan titik**. Seret belah ketupat paling kanan (sekitar x 2,7, y 0,6) ke sekitar x 2, y 2,5: tidak ada yang berubah, tetap 3 dari 56 dan margin 1,38. Sekarang seret silang kelas B di sekitar x 1,8, y 0 ke sekitar x -2, y 0: margin dan titik yang dilingkari tetap sama, dan **Held-out accuracy** turun dari 100,0% menjadi 95,8%. Jelaskan mengapa titik held-out tidak dapat menggeser boundary.
3. **C dan jumlah support vector.** Prediksikan: buka **Kuis Cepat** dan pilih jawaban sebelum menyentuh apa pun. Apa yang dilakukan C yang jauh lebih besar pada margin dan pada support vector? Persiapan: seret C dari 0,1 ke 10. Kotak itu menjawab: lebar margin berubah dari 2,10 menjadi 1,38 dan support vector dari 13 menjadi 3. Coba C 0,01 (3,75 dan 42 dari 56) dan C 100 (1,38 dan 3 lagi). Jelaskan mengapa jumlahnya turun, dan mengapa 10 dan 100 terlihat sama. Lalu atur **Bentuk data buatan** ke **Dua kumpulan yang tumpang tindih** dan bandingkan C 0,1 dengan C 100: margin berubah dari 1,97 menjadi 0,73, support vector dari 31 menjadi 14, dan **Held-out accuracy** dari 83,3% menjadi 79,2%. Apakah C yang lebih besar membantu di sini?
4. **Linear melawan RBF.** Prediksikan: dapatkah garis lurus memisahkan kedua cincin? Persiapan: atur **Bentuk data buatan** ke **Dua cincin**. Baca kernel Linear pada C 0,1: 60,7% training dan 54,2% held-out. Geser C ke mana pun: training accuracy terbaik adalah 64,3%. Ganti **Kernel** ke **RBF (melengkung)** (gamma 1): 100,0% dan 100,0%, dan **Lebar margin (hanya linear)** menampilkan tanda strip. Coba juga **Bulan sabit**, dengan C 0,1 dan gamma 1: Linear memberi 73,2% dan 79,2%, RBF memberi 87,5% dan 95,8%. Jelaskan apa yang diubah oleh kernel.
5. **Gamma dan overfitting.** Prediksikan: ketika **Gamma (seberapa tajam kurva RBF menekuk)** naik dari 0,1 ke 10, apa yang terjadi pada training accuracy dan pada accuracy held-out? Persiapan: **Bentuk data buatan** **Dua kumpulan yang tumpang tindih**, **Kernel** **RBF (melengkung)**, C 10. Baca 0,1, 1, dan 10: training 87,5%, 94,6%, 100,0%; held-out 79,2% setiap kali; support vector 18, 24, 50. Tekan **Sampel baru** sekali dan bandingkan lagi gamma 0,1 dan 10: training 82,1% lalu 100,0%, held-out 79,2% lalu 66,7%. Jelaskan apa yang dilakukan boundary pada gamma 10.
6. **Penguin dan sampel baru.** Prediksikan: apakah C yang lebih besar masih menghasilkan margin yang lebih sempit dan support vector yang lebih sedikit pada data nyata? Persiapan: **Data** **Penguin (data nyata)**, **Kernel** **Linear (garis lurus)**. Pada C 0,1 kamu membaca 24 dari 56 dan margin 1,65; pada C 10, 4 dari 56 dan 0,42. Tekan **Sampel baru** tiga kali dan periksa pada tiap sampel: 26 dan 1,65 lalu 7 dan 0,45; 26 dan 1,65 lalu 5 dan 0,36; 29 dan 1,64 lalu 6 dan 0,46. Sekarang bandingkan kernel pada C 10 untuk tiap sampel: Linear memberi 100,0% held-out setiap kali, RBF dengan gamma 10 memberi 100,0% training tetapi 91,7%, 95,8%, 91,7%, dan 91,7% held-out. Kernel mana yang akan kamu pakai untuk kedua pengukuran ini, dan seberapa yakin kamu setelah empat sampel?
