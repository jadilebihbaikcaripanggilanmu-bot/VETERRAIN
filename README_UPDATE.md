# Revisi VETERRAIN - Routing Topologi Lebih Toleran

Isi ZIP ini adalah file pengganti:

```text
index.html
css/style.css
js/app.js
```

Revisi:
- Routing dibuat lebih toleran untuk hasil digitasi manual:
  - memecah garis pada titik perpotongan,
  - menyambungkan endpoint jalur yang dekat dengan segmen lain,
  - toleransi snap jaringan dinaikkan menjadi 6 meter.
- Label nama bangunan tetap tampil langsung di 2D dan 3D.
- Fitur Play Demo Jalan 3D dengan marker orang jalan tetap ada.
- Shortcut `R` untuk reset view tetap ada.

Catatan:
Kalau masih ada rute yang tidak melewati jalan tertentu, kemungkinan jalur tersebut memang belum tersambung di data GeoJSON. Di GIS, tambahkan connector pendek/split jalur di persimpangan, export ulang `jalur_pejalan_kaki.geojson`, lalu push ulang.

Cara pakai:
1. Extract ZIP.
2. Copy `index.html`, folder `css`, dan folder `js` ke repo `VETERRAIN`.
3. Replace file lama.
4. Commit dan push ke GitHub.
5. Refresh GitHub Pages dengan `Ctrl + F5`.
