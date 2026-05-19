# Revisi VETERRAIN - Routing Lebih Pintar + Label Nama Bangunan

Isi ZIP ini adalah file pengganti:

```text
index.html
css/style.css
js/app.js
```

Revisi:
- Menampilkan nama bangunan langsung di peta 2D.
- Menampilkan label nama bangunan di mode 3D.
- Routing dibuat lebih toleran:
  - node otomatis dibuat pada perpotongan polyline,
  - endpoint jalur yang sangat dekat akan disnap otomatis,
  - mengurangi kasus rute muter karena garis terlihat nyambung tapi belum tersambung secara topologi.
- Tetap ada fitur Play Demo Jalan 3D dengan marker orang berjalan.
- Shortcut `R` untuk reset view.

Catatan penting:
Kalau masih ada rute yang menurutmu harusnya bisa lewat jalur tertentu tetapi sistem tetap memutar, kemungkinan jalur tersebut belum benar-benar tersedia/terhubung di GeoJSON. Tambahkan/split garis jalurnya di GIS, export ulang `jalur_pejalan_kaki.geojson`, lalu push ulang.

Cara pakai:
1. Extract ZIP.
2. Copy `index.html`, folder `css`, dan folder `js` ke repo `VETERRAIN`.
3. Replace file lama.
4. Commit dan push ke GitHub.
5. Refresh GitHub Pages dengan `Ctrl + F5`.
