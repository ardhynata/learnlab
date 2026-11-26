---
slug: augmentation-transfer-and-detection-metrics
title: Augmentation, transfer, dan metrik deteksi
---
::: intro
- Pilih augmentation yang menjaga label tetap benar, terapkan hanya pada gambar latih, dan uji pada perubahan pencahayaan dan orientasi yang realistis.
- Jelaskan bagaimana model vision memakai ulang filter awal dari jaringan yang sudah dilatih, dan nilai classifier dengan top-1 accuracy serta recall per kelas.
- Hitung intersection over union (IoU) dengan tangan, lalu precision dan recall pada satu IoU threshold, dan jelaskan apa yang diringkas oleh average precision.

Sebelum mulai: baca "Convolution dan CNN" di kursus ini, "Transfer learning dan self-supervision" untuk pemakaian ulang secara frozen dan fine-tuned, serta "Confusion matrix dan rasio-rasionya" untuk precision dan recall.
:::

## Mengajari model apa yang tidak perlu dipedulikan
*Mengapa kamu menunjukkan salinan gambar latih yang sudah diubah kepada model?*

CNN belajar dari gambar yang kamu berikan. Jika semua foto latih sebuah tanaman terang, tegak, dan berada di tengah, jaringan dapat bersandar pada kebetulan-kebetulan itu. Foto baru yang diambil dalam cahaya redup, atau dengan ponsel yang dipegang miring, bisa tampak seperti benda lain baginya.

**Data augmentation** membuat contoh latih baru dengan mengubah contoh yang sudah ada: flip, geser, putaran kecil, jitter kecerahan atau kontras. **Jitter** adalah perubahan acak yang kecil, dan diundi baru setiap kali. Labelnya tetap sama, sehingga model melihat banyak versi dari setiap gambar dan belajar bahwa perubahan-perubahan itu tidak boleh mengubah jawaban.

Augmentation tidak menambah objek baru ke dunia. Ia menambah variasi pada arah yang memang kamu harapkan berubah di dunia nyata. Caranya murah, karena tidak perlu ada yang memotret atau melabeli foto lagi, dan ia juga menyulitkan model untuk menghafal piksel persis dari satu gambar.

## Perubahan yang aman, dan di mana menerapkannya
*Perubahan mana yang menjaga label tetap benar, dan gambar mana yang boleh diubah?*

Sebuah augmentation bersifat **mempertahankan label** (*label-preserving*) bila gambar yang sudah diubah masih pantas mendapat label yang sama. Aman atau tidaknya sebuah perubahan bergantung pada tugasnya, bukan pada perubahannya saja.

[[figure:augmentation-transfer-and-detection-metrics/augmentations|Satu angka dengan empat perubahan yang aman (ditambah aslinya) dan dua perubahan yang membuat label salah.]]

Geseran, putaran kecil, dan perubahan kecerahan atau kontras yang wajar membuat angka 6 tetap 6. Bayangan cermin sebuah angka bukan lagi angka, dan putaran 180° mengubahnya menjadi 9. Flip pada foto kucing aman, karena kucing yang menghadap ke kanan tetap kucing.

> Gagasan kunci: tanyakan pada setiap perubahan, "apakah seseorang masih akan memberi gambar ini label yang sama?" Pakai hanya perubahan yang jawabannya ya, dan jaga agar tetap dalam rentang yang mungkin kamu temui saat dipakai sungguhan.

> Awas: terapkan augmentation **hanya pada gambar latih**, dan bagi data lebih dulu. Gambar validasi dan uji dibiarkan apa adanya, sehingga skornya menggambarkan foto yang nyata. Jika kamu melakukan augmentation sebelum pembagian, salinan dari satu foto akan berada di kedua sisi dan membocorkan jawabannya.

## Menguji pada perubahan yang kamu duga
*Mengapa accuracy pada gambar uji yang bersih dapat melebih-lebihkan ketahanan model?*

Test set yang bersih diambil seperti data latih: terang, tegak, di tengah. Model dapat mendapat skor tinggi di sana dan tetap gagal di lapangan, tempat foto bisa redup, miring, atau bergeser dari tengah. Angka bersih itu menjawab "apakah model bekerja pada gambar seperti ini?" dan tidak banyak bicara tentang yang lain.

Karena itu tambahkan **stress test**: gambar uji yang sama dengan perubahan yang kamu duga akan terjadi, misalnya kecerahan lebih rendah atau putaran 20°. Laporkan skor bersih dan setiap skor stress berdampingan, jangan pernah dicampur menjadi satu angka.

> Contoh hitungan: misalkan ada 200 gambar uji dan dua model, dengan angka rekaan. Model yang dilatih hanya dengan gambar bersih benar pada 188 gambar bersih (94%), 150 salinan yang lebih redup (75%), dan 164 salinan yang diputar (82%). Model yang dilatih dengan jitter kecerahan dan rotasi mendapat 184 (92%), 176 (88%), dan 178 (89%). Skor bersih turun 2 poin, skor redup naik 13, dan skor putaran naik 7.

[[figure:augmentation-transfer-and-detection-metrics/clean-vs-stress|Accuracy rekaan dua model pada gambar uji bersih, lebih redup, dan diputar.]]

Nilailah model dari perubahan yang akan dihadapinya. Jika stress test memakai persis jitter yang dipakai saat latihan, yang diperiksa adalah resepnya, bukan dunianya.

## Memakai ulang jaringan yang sudah dilatih
*Bagian mana dari jaringan yang dilatih pada gambar lain yang dapat kamu simpan?*

Layer-layer pertama sebuah CNN mempelajari filter kecil yang umum: tepi, bercak warna, tekstur sederhana. Layer berikutnya menggabungkannya menjadi bagian dan bentuk yang sesuai dengan kelas yang dipakai saat jaringan dilatih. Filter awal berguna untuk hampir semua foto, sehingga kamu dapat memakainya ulang.

[[figure:augmentation-transfer-and-detection-metrics/reuse-the-filters|Jaringan yang sudah dilatih: layer awal dipakai ulang, head baru dilatih dengan data berlabelmu yang kecil.]]

Resep yang umum adalah **transfer learning**. Simpan layer yang sudah dilatih, lepas layer akhir yang lama, lalu pasang **head** baru untuk kelas-kelasmu. Latih hanya head-nya dan bagian lain tetap **frozen**. Untuk melangkah lebih jauh, lakukan **fine-tune**: biarkan layer akhir ikut belajar dengan learning rate kecil, sehingga filternya bergeser sedikit.

Misalkan layer yang frozen memberi head 64 feature dan kamu punya 3 kelas. Head itu punya 64 × 3 + 3 = 195 angka, cukup sedikit untuk data berlabel yang kecil. Fine-tuning melatih jauh lebih banyak angka dan dapat overfit. Transfer paling membantu bila gambarmu mirip dengan gambar yang dipakai untuk pelatihan awal, dan kurang membantu bila tidak. "Transfer learning dan self-supervision" di kursus representation-learning membahas pertimbangan yang sama untuk data tabel.

## Metrik klasifikasi sekilas
*Angka apa yang meringkas model yang menyebut apa isi sebuah gambar?*

**Top-1 accuracy** adalah porsi gambar yang kelas dengan skor tertingginya adalah kelas sebenarnya. **Top-5 accuracy** menganggap sebuah gambar benar jika kelas sebenarnya termasuk lima skor tertinggi, yang berguna bila banyak kelas tampak mirip. **Recall per kelas** adalah, untuk satu kelas, porsi gambarnya yang berhasil ditemukan model.

Tabel ini adalah confusion matrix untuk 300 gambar uji kucing, anjing, dan burung. Barisnya adalah kelas sebenarnya.

| Kelas sebenarnya | Prediksi kucing | Prediksi anjing | Prediksi burung | Gambar | Recall |
| --- | --- | --- | --- | --- | --- |
| kucing | 188 | 10 | 2 | 200 | 94% |
| anjing | 20 | 36 | 4 | 60 | 60% |
| burung | 2 | 2 | 36 | 40 | 90% |

> Contoh hitungan: jumlah yang benar ada di diagonal, 188 + 36 + 36 = 260, sehingga top-1 accuracy adalah 260 / 300 = 86,7%. Recall anjing adalah 36 / 60 = 60%.

> Awas: 86,7% terdengar bagus, tetapi model melewatkan 4 dari setiap 10 anjing, karena kucing mendominasi skornya. Selalu baca recall per kelas di samping accuracy, seperti di "Confusion matrix dan rasio-rasionya".

## Intersection over union
*Bagaimana menilai sebuah kotak yang dekat dengan kotak sebenarnya tetapi tidak sama?*

**Detector** melakukan lebih dari menyebut kelas. Untuk setiap objek ia mengembalikan sebuah **kotak** (di mana), sebuah kelas (apa), dan skor keyakinan (seberapa yakin). Kotaknya hampir tidak pernah identik dengan kotak sebenarnya, sehingga pertanyaan "sama atau tidak" tidak berguna. Kita butuh angka yang menyatakan seberapa besar keduanya saling menutupi.

**Intersection over union (IoU)** adalah luas daerah tempat kedua kotak bertumpang tindih dibagi luas daerah yang ditutupi keduanya bersama. Nilainya 0 untuk kotak yang tidak bersentuhan dan 1 untuk kotak yang identik.

> Contoh hitungan: kotak sebenarnya membentang dari x = 2 sampai 8 dan y = 2 sampai 6, jadi ukurannya 6 kali 4 dengan luas 24. Kotak prediksi membentang dari x = 4 sampai 10 dan y = 3 sampai 7, juga 6 kali 4. Keduanya bertumpang tindih dari x = 4 sampai 8 dan y = 3 sampai 6, yaitu 4 kali 3 = 12. Gabungannya 24 + 24 − 12 = 36, sehingga IoU = 12 / 36 = 0,33. Geser kotak prediksi ke x = 3 sampai 9 dan y = 2 sampai 6: irisannya 5 kali 4 = 20, gabungannya 24 + 24 − 20 = 28, dan IoU = 20 / 28 = 0,71.

[[figure:augmentation-transfer-and-detection-metrics/iou|Dua kotak prediksi terhadap kotak sebenarnya yang sama: IoU 0,33 dan IoU 0,71.]]

> Awas: kotak yang terlalu besar juga dihukum. Kotak selebar 6 dan setinggi 8 yang memuat kotak sebenarnya punya irisan 24 dan gabungan 48, sehingga IoU hanya 0,5.

## Precision dan recall pada IoU threshold
*Bagaimana skor pada kotak berubah menjadi hitungan yang benar dan salah?*

Pilih sebuah **IoU threshold**, misalnya 0,5. Sebuah kotak prediksi adalah **true positive** jika IoU-nya dengan sebuah kotak sebenarnya yang kelasnya sama setidaknya sebesar threshold, dan belum ada prediksi lain yang mengklaim kotak sebenarnya itu. Setiap kotak prediksi lainnya adalah **false positive**, termasuk kotak kedua pada objek yang sudah ditemukan dan kotak pada latar kosong. Kotak sebenarnya yang tidak diklaim oleh prediksi mana pun adalah **false negative**. Lalu **precision** adalah TP / (TP + FP) dan **recall** adalah TP / (TP + FN), seperti di "Confusion matrix dan rasio-rasionya".

Ambil 5 kotak sebenarnya dan 6 kotak prediksi. Lima prediksi punya IoU 0,83, 0,71, 0,58, 0,47, dan 0,31 dengan lima kotak sebenarnya yang berbeda, dan satu kotak berada di latar kosong.

| IoU threshold | TP | FP | FN | Precision | Recall |
| --- | --- | --- | --- | --- | --- |
| 0,3 | 5 | 1 | 0 | 0,83 | 1 |
| 0,5 | 3 | 3 | 2 | 0,5 | 0,6 |
| 0,75 | 1 | 5 | 4 | 0,17 | 0,2 |

Threshold yang lebih ketat menurunkan kedua angka, karena kotak yang tadinya cukup baik sekarang dihitung sebagai luput. Skor deteksi selalu datang bersama threshold-nya.

## Average precision, dan menuju lab
*Bagaimana banyak batas keyakinan menjadi satu angka, dan di mana kamu mencoba semua ini?*

Kotak-kotak dari detector membawa skor keyakinan. Urutkan dari yang paling yakin sampai yang paling tidak yakin, lalu terima satu per satu. Setelah setiap kotak kamu punya sebuah recall dan sebuah precision pada IoU threshold yang tetap, dan bersama-sama keduanya membentuk kurva precision–recall. **Average precision (AP)** adalah luas di bawah kurva itu untuk satu kelas. **Mean average precision (mAP)** merata-ratakan AP di semua kelas, dan sebagian benchmark juga merata-ratakannya di beberapa IoU threshold. Benchmark berbeda dalam detail kecil cara menghitung AP, sehingga sebuah skor hanya dapat dibandingkan di dalam satu benchmark.

::: deeper AP untuk enam kotak
Beri keenam kotak di bagian terakhir keyakinan 0,95, 0,90, 0,80, 0,70, 0,60, dan 0,40, dengan urutan IoU 0,83, 0,71, latar, 0,58, 0,47, 0,31. Pada threshold 0,5, pasangan (recall, precision) yang berjalan adalah (0,2, 1), (0,4, 1), (0,4, 0,67), (0,6, 0,75), (0,6, 0,6), dan (0,6, 0,5). Ganti setiap precision dengan precision terbaik pada recall itu atau yang lebih tinggi, lalu jumlahkan persegi panjangnya: 0,2 × 1 + 0,2 × 1 + 0,2 × 0,75 = 0,55. Recall tidak pernah melewati 0,6, sehingga sisa kurvanya tidak menambah apa-apa, dan AP = 0,55.
:::

Pelajaran berikutnya adalah lab kursus ini, "Vision lab". Tugasnya sama dengan yang ada di awal pelajaran ini: latih dengan augmentation, lalu uji pada perubahan pencahayaan dan orientasi yang realistis, dan bandingkan skor bersih dengan skor stress.

::: remember
- Lakukan augmentation hanya pada gambar latih, dengan perubahan yang menjaga label tetap benar, dan uji pada perubahan yang realistis: skor uji yang bersih melebih-lebihkan ketahanan model.
- Transfer learning menyimpan filter awal, melatih head baru, dan melakukan fine-tune pada layer akhir hanya bila datanya cukup. Baca top-1 accuracy bersama recall per kelas.
- IoU adalah irisan dibagi gabungan. Sebuah deteksi dianggap benar hanya pada suatu IoU threshold, dan average precision meringkas precision dan recall di sepanjang batas keyakinan.
:::
