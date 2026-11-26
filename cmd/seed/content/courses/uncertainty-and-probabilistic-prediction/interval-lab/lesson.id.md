---
slug: interval-lab
title: Lab interval
---
::: intro
- Bangun prediction interval dengan tiga metode, lalu ukur seberapa sering masing-masing memuat nilai yang benar.
- Perkirakan, lalu periksa, apa yang terjadi pada coverage ketika input uji bergeser menjauh dari input latih.
- Jelaskan mengapa band-band itu meleset, lalu ulangi pengujian pada penguin nyata dengan sampel yang baru.

Sebelum mulai: baca "Ketidakpastian aleatoric dan epistemic", "Conformal prediction", dan "Covariate shift dan concept shift".
:::

## Yang ditanyakan lab
*Apa yang dapat kamu ukur di Lab interval?*

Dua pelajaran terakhir memberi satu janji dan satu peringatan. Janjinya: interval 90% memuat nilai yang benar sekitar 90 dari 100 kali. Peringatannya: janji itu hanya berlaku bila kasus baru mirip dengan kasus yang dipakai untuk membangun interval. Di Lab interval kamu membangun tiga jenis interval, lalu sengaja melanggar syarat itu.

Lab dimulai dengan 120 titik latih, 100 titik kalibrasi, dan 400 titik uji buatan. Aturan sebenarnya adalah kurva yang diketahui, y = 1,5 sin(2,5x), ditambah noise yang membesar dari kiri ke kanan. Modelnya polinomial kubik. Ketiga metode sama-sama memasang band di sekitar kurva model itu: **Split conformal**, **Quantile regression**, dan **Bootstrap ensemble**.

Setelah itu kamu menggeser input uji. Input latih membentang dari -1 sampai 1. **Tingkat shift** menggeser input uji ke kanan sebesar 2 kali tingkatnya, sehingga 40% menggesernya 0,80. Aturan yang menghasilkan y tidak berubah; yang berubah hanya letak input barunya. Inilah **covariate shift**.

[[figure:interval-lab/shift-setup|Input latih dibandingkan dengan input uji pada tiga tingkat shift. Pada 40% sekitar 63% input uji masih berada di dalam rentang latih, dan pada 100% tidak ada satu pun.]]

## Tiga band, tiga janji
*Apa yang diklaim masing-masing band?*

**Split conformal** menambah dan mengurangkan q, yaitu salah satu dari 100 residual absolut titik kalibrasi. Pada alpha bawaan 0,1, rank-nya k = ceil(101 × 0,9) = ceil(90,9) = 91, sehingga q adalah residual terkecil ke-91 dari 100 residual: 0,677. Band-nya adalah kurva hasil fit ± 0,677, selalu setinggi 2 × 0,677 = 1,35. Pada x = 0,8 kurva menunjukkan 1,52, sehingga band-nya membentang dari 0,84 sampai 2,20.

**Quantile regression** mem-fit kurva kuantil bawah dan atas pada titik latih. Karena itu band-nya dapat sempit di tempat noise kecil dan lebar di tempat noise besar. Metode ini tidak memakai calibration set dan tidak punya janji untuk sampel terbatas.

**Bootstrap ensemble** mem-fit ulang kurva pada 30 sampel bootstrap, lalu mengambil 90% bagian tengah dari prediksi-prediksinya. Seperti di "Ketidakpastian aleatoric dan epistemic", ini hanya mengukur seberapa ragu model terhadap kurvanya. Noise pada setiap y tidak ikut dihitung.

> Gagasan kunci: sebuah band menjawab pertanyaan yang diajukan metodenya. Hanya split conformal yang bertanya, "seberapa meleset kasus baru?", lalu memeriksa jawabannya pada titik yang disisihkan.

## Tanpa shift
*Seberapa baik masing-masing band bertahan sebelum ada yang dirusak?*

Atur **Tingkat shift** ke 0%. Tabel **Coverage dan lebar pada test set** menunjukkan:

| Metode | Coverage | Gap ke target (90%) | Lebar rata-rata |
| --- | --- | --- | --- |
| Split conformal | 93,5% | +3,5 poin | 1,35 |
| Quantile regression | 84,8% | -5,2 poin | 0,87 |
| Bootstrap ensemble | 17,5% | -72,5 poin | 0,15 |

Split conformal dekat dengan targetnya. Band bootstrap hanya setinggi 0,15, sehingga meleset dari sebagian besar titik. Lab memberi baris itu tag "Hanya ketidakpastian model, jadi rendah itu wajar". Quantile regression sedikit di bawah target. Penyebab yang mungkin adalah band-nya di-fit pada titik yang sama dengan yang dipakai untuk menilainya, efek yang sama dengan yang diperingatkan "Conformal prediction" untuk residual.

Satu sampel hanyalah satu undian. Pada sepuluh sampel dengan seed 41 sampai 50, split conformal mencakup antara 86,0% dan 94,0% dengan rata-rata 89,9%, dekat dengan 90%. Quantile regression rata-ratanya 85,3% dan berada di bawah 90% pada 9 dari 10 sampel. Janji itu adalah rata-rata atas banyak calibration set dan kasus baru, bukan jaminan untuk setiap sampel.

::: deeper Seberapa jauh satu angka coverage dapat dipercaya
Coverage sendiri diukur pada test set yang terbatas. Dengan 400 titik uji dan coverage sebenarnya 0,9, galat bakunya sqrt(0,9 × 0,1 / 400) = 0,015, atau sekitar 1,5 poin ke kedua arah. Pada 60 penguin uji dari data nyata, galatnya sqrt(0,09 / 60) = 0,039, sekitar 3,9 poin. Selisih yang lebih kecil dari itu hanyalah noise, bukan temuan.
:::

## Menggeser input uji
*Seberapa cepat coverage turun saat shift membesar?*

Chart **Coverage saat shift membesar** mengukur ulang ketiga band pada setiap shift dari 0% sampai 100%, memakai interval yang kamu lihat di atasnya. Berikut angka bawaan lab.

| Shift | Split conformal | Quantile regression | Bootstrap ensemble | Di dalam rentang latih |
| --- | --- | --- | --- | --- |
| 0% | 93,5% | 84,8% | 17,5% | 98,3% |
| 20% | 85,5% | 79,0% | 20,0% | 82,0% |
| 40% | 66,5% | 62,7% | 16,3% | 62,7% |
| 60% | 45,8% | 43,8% | 13,3% | 43,8% |
| 100% | 9,8% | 11,0% | 4,8% | 0,0% |

[[figure:interval-lab/coverage-sweep|Coverage ketiga band saat shift membesar. Garis putus-putus adalah target 90%, dan garis titik-titik menandai shift bawaan lab, yaitu 40%.]]

Pada shift bawaan, split conformal turun dari 93,5% ke 66,5%, yaitu 23,5 poin di bawah targetnya. Kolom terakhir menjelaskan sebagian besar penyebabnya: pada shift 100% tidak ada input uji yang berada di dalam rentang latih, dan coverage sangat rendah (9,8%). Kalibrasinya tidak salah. Titik kalibrasi hanya tidak lagi mirip dengan titik uji.

## Mengapa band meleset
*Apa yang salah pada band di luar rentang latih?*

Janji conformal mensyaratkan kasus baru dapat dipertukarkan (exchangeable) dengan kasus kalibrasi (ditarik dengan cara yang sama, sehingga mengacak urutannya tidak mengubah apa pun). Menggeser input melanggar syarat itu. Ada penyebab kedua: kurva kubik hanya dilatih pada input dari -1 sampai 1, dan di luar rentang itu kurvanya menjauh dari kebenaran.

[[figure:interval-lab/bands-at-inputs|Ketiga band pada empat input dari sampel bawaan, di samping rentang yang akan diberikan metode yang sempurna. Di dalam rentang latih band berada tepat di sekitar kebenaran; pada x = 1,8 kurvanya jauh darinya.]]

> Contoh hitungan: pada x = 1,8 kurva sebenarnya bernilai -1,47 dan kurva hasil fit -9,09, selisihnya 7,6. Band conformal-nya -9,77 sampai -8,41, hanya setinggi 1,35, sehingga tidak dapat mencapai kebenaran. Band quantile, -10,50 sampai -7,88, dan band bootstrap, -11,09 sampai -7,70, memang lebih lebar, tetapi sama-sama mengitari kurva yang salah.

Karena itu, lebih lebar tidak sama dengan lebih benar. Bandingkan lebarnya pada shift 40%: split conformal 1,35, quantile regression 1,37, bootstrap 0,73. Pada 100% lebarnya 1,35, 3,57, dan 6,01. Band conformal tidak pernah berubah, karena q ditetapkan dari residual yang diukur di dalam rentang latih. Dua lainnya melebar karena kurvanya melebar ke luar. Itu petunjuk, tetapi bukan petunjuk yang terkalibrasi.

> Awas: jaminan itu berlaku untuk kasus yang dapat dipertukarkan. Ketika syaratnya gugur, tidak ada tanda apa pun di dalam band itu sendiri.

## Alpha dan calibration set
*Apa harga untuk target yang lebih tinggi, dan apa yang kamu butuhkan agar janji tetap berlaku?*

Atur **Tingkat shift** ke 0% lagi. **Alpha** adalah porsi yang boleh meleset. Alpha yang lebih besar menurunkan rank pada split conformal, sehingga band-nya menyempit:

| Alpha (target) | Coverage split conformal | Lebar rata-rata |
| --- | --- | --- |
| 0,05 (95%) | 99,0% | 1,86 |
| 0,10 (90%) | 93,5% | 1,35 |
| 0,30 (70%) | 72,5% | 0,68 |
| 0,50 (50%) | 50,2% | 0,37 |

Calibration set menentukan batas bawah. Seperti di "Conformal prediction", split conformal mensyaratkan ceil((n + 1)(1 - alpha)) tidak lebih dari n. Untuk alpha 0,05, artinya setidaknya 19 titik. Slider bergerak dengan langkah 5, sehingga dengan 10 atau 15 titik kalibrasi band-nya tak terhingga: ia mencakup semuanya dan tidak memberi tahu apa-apa, dan lab menampilkan catatan. Dengan 20 titik, rank-nya ceil(21 × 0,95) = 20 dan band-nya kembali, setinggi 1,35.

Calibration set yang kecil juga membuat hasil berubah-ubah besar dari sampel ke sampel. Dengan alpha 0,1 dan 10 titik, coverage pada empat sampel pertama adalah 80,5%, 88,8%, 99,8%, dan 72,8%, dengan lebar dari 0,66 sampai 2,01. Dengan 100 titik, keempat sampel yang sama memberi 93,5%, 88,0%, 90,0%, dan 89,0%.

## Penguin nyata: persiapan dan hasil Gentoo
*Apakah ceritanya sama pada data nyata?*

Pilih **Penguin (data nyata)**. Lab kini memprediksi massa tubuh dari panjang sirip dengan garis lurus yang di-fit pada dua spesies. Spesies ketiga, yang dipilih di **Spesies yang ditahan (test set yang bergeser)**, tidak pernah dilihat saat training maupun kalibrasi. **Tingkat shift** adalah porsi dari 60 penguin uji yang berasal dari spesies itu. Pada sampel pertama, sirip latih membentang dari 178 sampai 210 mm.

[[figure:interval-lab/species-coverage|Coverage split conformal pada penguin nyata tanpa shift dan pada shift penuh, untuk tiap spesies yang ditahan, beserta porsi sirip spesies itu yang berada di dalam rentang latih.]]

Dengan Gentoo ditahan, coverage split conformal turun dari 98,3% tanpa shift ke 81,7% pada shift bawaan 40%, lalu ke 56,7% pada 100%. Hanya 21,7% sirip Gentoo di test set yang jatuh di dalam rentang latih: sirip Gentoo pada tabel membentang dari 203 sampai 231 mm.

## Yang dapat dan tidak dapat ditunjukkan penguin
*Seberapa jauh hasil pada data nyata dapat dipercaya?*

Dengan Chinstrap ditahan, semua siripnya berada di dalam rentang dan coverage tetap dekat target: 88,3% tanpa shift dan 91,7% pada 100%.

Lab menukar seluruh spesies, sehingga ia tidak memisahkan sirip yang lebih panjang dari perubahan hubungan antara panjang sirip dan massa. Keduanya dapat menurunkan coverage. Selain itu, 60 penguin adalah test set yang kecil: dengan Adelie ditahan, sampel segar yang kedua memberi 73,3% bahkan tanpa shift, karena calibration set berisi 40 titik dapat saja merupakan undian yang kurang beruntung.

::: remember
- Split conformal mempertahankan coverage-nya ketika input baru mirip dengan input kalibrasi, dan kehilangannya ketika tidak mirip. Menggeser input uji menjauh dari rentang latih menurunkan coverage dari 93,5% ke 66,5% pada shift 40%, dan ke 9,8% pada 100%.
- Setiap band menjawab pertanyaan yang berbeda. Band bootstrap hanya memuat ketidakpastian model, sehingga sempit dan hanya mencakup 17,5% bahkan tanpa shift, sedangkan quantile regression tidak punya janji untuk sampel terbatas.
- Target yang lebih tinggi menuntut band yang lebih lebar, calibration set yang kecil membuat hasil berubah-ubah besar dari sampel ke sampel dan dapat membuat band tak terhingga, dan satu angka coverage dari satu sampel itu berfluktuasi. Periksa sebuah gagasan pada sampel yang segar dan pada data nyata.
:::

@@lab

## Lab: Interval prediksi saat terjadi shift
Lab dimulai dengan data buatan: 120 titik latih, 100 titik kalibrasi, dan 400 titik uji, fit kubik, alpha 0,1 (target 90%), dan shift 40%. Kamu mengubah data, shift, dan alpha, lalu melihat seberapa sering tiap band memuat nilai yang benar.

### Kontrol
- **Data** berganti antara **Data buatan** dan **Penguin (data nyata)**. Dengan data nyata, plot menampilkan **Panjang sirip (mm)** terhadap **Massa tubuh (kg)**.
- **Spesies yang ditahan (test set yang bergeser)** (Adelie, Chinstrap, atau Gentoo; hanya data nyata) adalah spesies yang tidak pernah dilihat model. Spesies ini membentuk bagian test set yang bergeser.
- **Noise** (**Konstan** atau **Membesar seiring x**; hanya data buatan) mengatur bagaimana sebaran y berubah menurut x.
- **Alpha (porsi yang boleh meleset)** (0,05 sampai 0,5) adalah porsi kasus yang kamu terima untuk meleset. Readout-nya juga menampilkan target, misalnya "0,10 (target 90%)".
- **Ukuran calibration set** (10 sampai 250, atau 10 sampai 80 pada data nyata, yang dimulai dari 40) mengatur berapa banyak titik cadangan yang dipakai split conformal untuk mencari q.
- **Tingkat shift** (0% sampai 100%) menggeser test set menjauh dari data latih. Pada data buatan, ia menggeser input uji ke kanan sebesar 2 kali tingkatnya. Pada data nyata, ia adalah porsi penguin uji dari spesies yang ditahan.
- **Sampel baru** mengambil kumpulan titik yang baru, atau pembagian acak penguin yang baru.
- **Tampilkan band split conformal**, **Tampilkan band quantile regression**, **Tampilkan band bootstrap ensemble**, **Tampilkan titik uji**, dan **Tampilkan kurva sebenarnya** (hanya data buatan) menyembunyikan atau menampilkan lapisan-lapisan itu. Semuanya menyala di awal.
- **Layar penuh** memperbesar lab. **Reset** mengembalikan data buatan, sampel pertama, **Noise** Membesar seiring x, Gentoo ditahan, alpha 0,1, 100 titik kalibrasi, shift 40%, dan semua lapisan menyala, serta mengosongkan Kuis Cepat. Tekan sebelum eksperimen 1, 4, 5, dan 6 agar angkamu sama dengan yang di bawah.
- **Kuis Cepat** berisi satu pertanyaan: "Ketika input uji bergeser menjauh dari data latih, apa yang terjadi pada coverage interval 90 persen?" Pilih jawaban dulu. Lab mengungkapkannya begitu shift mencapai 20% atau lebih, dan Reset membiarkan shift di 40%, jadi atur ke 0% sebelum memilih.

### Membaca layar
- Plot menampilkan **Titik latih**, **Titik kalibrasi (hanya split conformal)** sebagai cincin, **Titik uji (input baru)**, **Kurva hasil fit**, dan, pada data buatan, **Kurva sebenarnya**. Strip abu-abu menandai input latih. Sebuah band adalah area terisi dengan dua tepi; ketiga band punya tiga warna. Sumbunya adalah **Input x** dan **Output y**.
- Baris status menampilkan target dan coverage tiap metode pada test set, misalnya "Target coverage 90%. Pada test set: Split conformal 66,5%, Quantile regression 62,7%, Bootstrap ensemble 16,3%." Baris di bawahnya menyebut berapa titik uji yang berada di dalam rentang latih, dan lab juga menampilkan jumlahnya: "120 latih, 100 kalibrasi, 400 uji".
- Tabel **Coverage dan lebar pada test set** punya kolom **Metode**, **Coverage pada test set**, **Gap ke target (90%)**, dan **Lebar rata-rata**. Gap dinyatakan dalam poin; baris bootstrap membawa tag "Hanya ketidakpastian model, jadi rendah itu wajar". Bila split conformal punya terlalu sedikit titik kalibrasi, lebarnya tertulis ∞ dan sebuah catatan menyebut berapa titik yang dibutuhkan.
- Chart **Coverage saat shift membesar** menampilkan coverage pada setiap shift untuk ketiga metode dan garis putus-putus **Target 90%**. Label **Sekarang** menandai shift kamu saat ini.

### Eksperimen
Tekan **Reset** dulu agar angkamu sama dengan angka di sini.

1. **Sebelum shift.** Perkirakan: dengan **Tingkat shift** di 0%, metode mana yang paling dekat dengan 90%? Atur slider ke 0% dan baca tabelnya: **Split conformal** 93,5% (gap +3,5), **Quantile regression** 84,8% (-5,2), **Bootstrap ensemble** 17,5% (-72,5). Jelaskan mengapa band bootstrap serendah itu. Lalu ubah **Noise** ke **Konstan**: **Split conformal** menjadi 90,8% dan **Quantile regression** 86,3%, dengan lebar rata-rata 1,08 dan 0,94. Perhatikan band-bandnya: mana yang tingginya tetap di sepanjang x, dan mana yang mengikuti noise?
2. **Geser input uji.** Tekan **Reset**, lalu atur **Tingkat shift** ke 0%. Perkirakan: buka **Kuis Cepat** dan pilih jawaban. Lalu naikkan **Tingkat shift** ke 20% dan 40%. Pada 40% baris status menunjukkan 66,5%, 62,7%, dan 16,3%, dan kotaknya mengatakan coverage turun. Geser terus ke 100%: 9,8%, 11,0%, 4,8%. Amati tanda **Sekarang** di chart dan porsi yang berada di dalam rentang latih. Jelaskan bagaimana keduanya berhubungan.
3. **Band mana yang memberi peringatan?** Tekan **Reset**. Perkirakan: saat shift membesar, mana dari ketiga lebar rata-rata yang berubah? Baca **Lebar rata-rata** pada 0%, 40%, dan 100%: **Split conformal** tetap 1,35, **Quantile regression** menjadi 0,87, 1,37, 3,57, dan **Bootstrap ensemble** 0,15, 0,73, 6,01. Matikan dua band lainnya, biarkan **Tampilkan kurva sebenarnya** menyala, dan lihat di mana band berada di ujung kanan. Jelaskan mengapa band yang lebar masih dapat meleset.
4. **Alpha dan calibration set.** Perkirakan: apa yang terjadi pada band split conformal dan coverage-nya bila **Alpha** dinaikkan ke 0,30? Tekan **Reset**, atur shift ke 0%, lalu coba 0,30: coverage 72,5%, lebar 0,68. Lalu atur **Alpha** ke 0,05 dan **Ukuran calibration set** ke 10: band-nya tak terhingga, plot menyatakannya, dan tabel menampilkan ∞. Naikkan ukurannya ke 20: coverage 93,5%, lebar 1,35. Mengapa 20 dan bukan 15?
5. **Calibration set yang kecil.** Perkirakan: dengan 10 titik kalibrasi dan alpha 0,10 pada shift 0%, apakah coverage tetap dekat 90% di setiap sampel? Tekan **Reset**, atur shift ke 0% dan **Ukuran calibration set** ke 10 (coverage 80,5%, lebar 0,86). Tekan **Sampel baru** tiga kali: 88,8%, 99,8%, dan 72,8%, dengan lebar 1,11, 2,01, dan 0,66. Sekarang kembalikan ukurannya ke 100: sampel keempat memberi 89,0%. Tekan **Sampel baru** tiga kali lagi: 93,0%, 87,8%, dan 90,3%. Janji itu merupakan rata-rata atas apa?
6. **Penguin dan sampel segar.** Perkirakan: dengan Gentoo ditahan, apakah split conformal tetap di 90% saat shift dinaikkan? Tekan **Reset**, atur **Data** ke **Penguin (data nyata)** dan shift ke 0%, 40%, dan 100%: 98,3%, 81,7%, dan 56,7%. Sekarang tekan **Sampel baru** dua kali: pada shift 100% kamu mendapat 51,7% dan 46,7%, sehingga penurunannya bukan kebetulan. Atur **Spesies yang ditahan (test set yang bergeser)** ke Chinstrap, taruh shift di 100%, dan bandingkan porsi yang berada di dalam rentang latih dengan milik Gentoo: coverage-nya 91,7%. Terakhir, tekan **Reset**, pilih **Penguin (data nyata)** lagi, tahan Adelie, atur shift ke 0%, dan tekan **Sampel baru** dua kali: 95,0% dan 73,3%. Apakah gagasannya bertahan, dan apa lagi yang berubah?
