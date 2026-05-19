# Prototype WebGIS 3D Rute Pejalan Kaki Kampus

Prototype ini dibuat untuk studi kasus:

**Analisis Rute Terpendek Pejalan Kaki Antar Gedung di Kampus 1 UPN “Veteran” Yogyakarta Berbasis WebGIS 3D**

## Isi folder

```text
webgis3d-routing-prototype/
├── index.html
├── css/
│   └── style.css
└── js/
    └── app.js
```

## Cara menjalankan

Cukup buka `index.html` di browser.

Untuk deploy di GitHub Pages:

1. Buat repository baru.
2. Upload semua isi folder ini.
3. Buka Settings > Pages.
4. Pilih Branch: `main`, folder: `/root`.
5. Tunggu link GitHub Pages aktif.

## Bagian yang perlu diganti dengan data asli

Di `js/app.js`, ganti bagian:

- `pois` untuk titik gedung/fasilitas.
- `nodes` untuk simpul jaringan jalur.
- `edges` untuk segmen jalur yang saling terhubung.
- `buildings` untuk polygon bangunan dan atribut tinggi.

## Catatan

Data di prototype masih dummy. Koordinat, bentuk gedung, dan jaringan jalur perlu disesuaikan dengan hasil digitasi kampus yang sebenarnya.
