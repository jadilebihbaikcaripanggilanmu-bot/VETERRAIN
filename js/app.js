// =======================================================
// PROTOTYPE WEBGIS 3D RUTE PEJALAN KAKI KAMPUS
// Data masih dummy. Nanti ganti koordinat dan layer dengan data UPN.
// =======================================================

// Titik tengah contoh dibuat di sekitar Kampus 1 UPN Veteran Yogyakarta.
// Silakan sesuaikan lagi dengan koordinat data kamu.
const center = [-7.7632, 110.4099]; // [lat, lng]

// -------------------------------------------------------
// 1) DATA POI / TITIK GEDUNG DAN FASILITAS
// id harus sama dengan node jaringan jalan agar routing bisa jalan.
// -------------------------------------------------------
const pois = [
  { id: "gerbang", name: "Gerbang Utama", category: "Akses Masuk", lat: -7.76425, lng: 110.40855 },
  { id: "feb", name: "Gedung FEB", category: "Fakultas", lat: -7.76375, lng: 110.40915 },
  { id: "faperta", name: "Gedung Faperta", category: "Fakultas", lat: -7.76295, lng: 110.40995 },
  { id: "ftme", name: "Gedung FTME", category: "Fakultas", lat: -7.76225, lng: 110.41075 },
  { id: "masjid", name: "Masjid Kampus", category: "Fasilitas Umum", lat: -7.76315, lng: 110.40895 },
  { id: "kantin", name: "Kantin", category: "Fasilitas Umum", lat: -7.76255, lng: 110.40945 },
  { id: "lapangan", name: "Lapangan", category: "Ruang Terbuka", lat: -7.76375, lng: 110.41035 },
  { id: "parkir", name: "Parkiran", category: "Fasilitas Umum", lat: -7.76410, lng: 110.40985 }
];

// -------------------------------------------------------
// 2) DATA NODE JARINGAN JALAN
// Untuk prototype, sebagian node adalah POI, sebagian node adalah simpang.
// Nanti ini bisa diganti hasil digitasi polyline kamu.
// -------------------------------------------------------
const nodes = {
  gerbang: [-7.76425, 110.40855],
  n1: [-7.76395, 110.40895],
  feb: [-7.76375, 110.40915],
  n2: [-7.76345, 110.40945],
  masjid: [-7.76315, 110.40895],
  n3: [-7.76305, 110.40965],
  faperta: [-7.76295, 110.40995],
  kantin: [-7.76255, 110.40945],
  n4: [-7.76245, 110.41015],
  ftme: [-7.76225, 110.41075],
  lapangan: [-7.76375, 110.41035],
  parkir: [-7.76410, 110.40985],
  n5: [-7.76395, 110.41005]
};

// -------------------------------------------------------
// 3) DATA EDGE / SEGMEN JALAN
// Setiap pasangan node dianggap jalur yang dapat dilewati.
// Bobot routing = panjang segmen dalam meter.
// -------------------------------------------------------
const edges = [
  ["gerbang", "n1"],
  ["n1", "feb"],
  ["n1", "masjid"],
  ["feb", "n2"],
  ["n2", "masjid"],
  ["n2", "n3"],
  ["n3", "faperta"],
  ["n3", "kantin"],
  ["kantin", "n4"],
  ["n4", "ftme"],
  ["n4", "faperta"],
  ["n2", "n5"],
  ["n5", "parkir"],
  ["n5", "lapangan"],
  ["lapangan", "faperta"],
  ["parkir", "gerbang"]
];

// -------------------------------------------------------
// 4) DATA BANGUNAN DUMMY
// Nanti ganti dengan GeoJSON bangunan asli dari QGIS/ArcGIS.
// Atribut height dipakai untuk extrude 3D di MapLibre.
// -------------------------------------------------------
const buildings = {
  type: "FeatureCollection",
  features: [
    polygonFeature("Gedung FEB", "FEB", 16, [
      [110.40895, -7.76395],
      [110.40935, -7.76395],
      [110.40935, -7.76355],
      [110.40895, -7.76355],
      [110.40895, -7.76395]
    ]),
    polygonFeature("Gedung Faperta", "Faperta", 14, [
      [110.40975, -7.76315],
      [110.41020, -7.76315],
      [110.41020, -7.76275],
      [110.40975, -7.76275],
      [110.40975, -7.76315]
    ]),
    polygonFeature("Gedung FTME", "FTME", 18, [
      [110.41050, -7.76245],
      [110.41095, -7.76245],
      [110.41095, -7.76205],
      [110.41050, -7.76205],
      [110.41050, -7.76245]
    ]),
    polygonFeature("Masjid Kampus", "Fasilitas Umum", 10, [
      [110.40875, -7.76332],
      [110.40913, -7.76332],
      [110.40913, -7.76300],
      [110.40875, -7.76300],
      [110.40875, -7.76332]
    ]),
    polygonFeature("Kantin", "Fasilitas Umum", 5, [
      [110.40925, -7.76270],
      [110.40962, -7.76270],
      [110.40962, -7.76242],
      [110.40925, -7.76242],
      [110.40925, -7.76270]
    ])
  ]
};

function polygonFeature(name, fungsi, height, coords) {
  return {
    type: "Feature",
    properties: { name, fungsi, height },
    geometry: {
      type: "Polygon",
      coordinates: [coords]
    }
  };
}

// -------------------------------------------------------
// UTILITAS HITUNG JARAK
// -------------------------------------------------------
function haversineMeters(a, b) {
  const R = 6371000;
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

// -------------------------------------------------------
// ALGORITMA DIJKSTRA UNTUK RUTE TERPENDEK
// -------------------------------------------------------
function buildGraph() {
  const graph = {};

  Object.keys(nodes).forEach((id) => {
    graph[id] = [];
  });

  edges.forEach(([from, to]) => {
    const distance = haversineMeters(nodes[from], nodes[to]);

    // dua arah, karena pejalan kaki bisa bolak-balik
    graph[from].push({ node: to, weight: distance });
    graph[to].push({ node: from, weight: distance });
  });

  return graph;
}

function shortestPath(start, end) {
  const graph = buildGraph();
  const distances = {};
  const previous = {};
  const unvisited = new Set(Object.keys(graph));

  Object.keys(graph).forEach((node) => {
    distances[node] = Infinity;
    previous[node] = null;
  });
  distances[start] = 0;

  while (unvisited.size > 0) {
    let current = null;

    unvisited.forEach((node) => {
      if (current === null || distances[node] < distances[current]) {
        current = node;
      }
    });

    if (current === null || distances[current] === Infinity) break;
    if (current === end) break;

    unvisited.delete(current);

    graph[current].forEach((neighbor) => {
      if (!unvisited.has(neighbor.node)) return;

      const alt = distances[current] + neighbor.weight;
      if (alt < distances[neighbor.node]) {
        distances[neighbor.node] = alt;
        previous[neighbor.node] = current;
      }
    });
  }

  const path = [];
  let cursor = end;

  while (cursor) {
    path.unshift(cursor);
    cursor = previous[cursor];
  }

  if (path[0] !== start) {
    return { path: [], distance: Infinity };
  }

  return { path, distance: distances[end] };
}

// -------------------------------------------------------
// 2D MAP DENGAN LEAFLET
// -------------------------------------------------------
const map2d = L.map("map2d", {
  zoomControl: true
}).setView(center, 17);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 22,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map2d);

let buildingLayer2d = L.geoJSON(buildings, {
  style: (feature) => ({
    color: "#0f172a",
    weight: 1,
    fillColor: getBuildingColor(feature.properties.fungsi),
    fillOpacity: 0.35
  }),
  onEachFeature: (feature, layer) => {
    layer.bindPopup(`
      <b>${feature.properties.name}</b><br>
      Fungsi: ${feature.properties.fungsi}<br>
      Tinggi: ${feature.properties.height} m
    `);
  }
}).addTo(map2d);

let networkLayer2d = L.layerGroup().addTo(map2d);
let poiLayer2d = L.layerGroup().addTo(map2d);
let routeLayer2d = L.layerGroup().addTo(map2d);

function drawNetwork2D() {
  networkLayer2d.clearLayers();

  edges.forEach(([from, to]) => {
    L.polyline([nodes[from], nodes[to]], {
      color: "#64748b",
      weight: 3,
      opacity: 0.85,
      dashArray: "5 7"
    }).addTo(networkLayer2d);
  });
}

function drawPOI2D() {
  poiLayer2d.clearLayers();

  pois.forEach((poi) => {
    const icon = L.divIcon({
      className: "poi-marker",
      html: poi.name.charAt(0),
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    L.marker([poi.lat, poi.lng], { icon })
      .bindPopup(`<b>${poi.name}</b><br>${poi.category}`)
      .addTo(poiLayer2d);
  });
}

drawNetwork2D();
drawPOI2D();

// -------------------------------------------------------
// 3D MAP DENGAN MAPLIBRE
// -------------------------------------------------------
const map3d = new maplibregl.Map({
  container: "map3d",
  style: {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "&copy; OpenStreetMap contributors"
      }
    },
    layers: [
      {
        id: "osm",
        type: "raster",
        source: "osm"
      }
    ]
  },
  center: [center[1], center[0]],
  zoom: 17,
  pitch: 58,
  bearing: -25
});

map3d.addControl(new maplibregl.NavigationControl(), "top-right");

map3d.on("load", () => {
  map3d.addSource("buildings", {
    type: "geojson",
    data: buildings
  });

  map3d.addLayer({
    id: "buildings-3d",
    type: "fill-extrusion",
    source: "buildings",
    paint: {
      "fill-extrusion-color": [
        "match",
        ["get", "fungsi"],
        "FEB", "#38bdf8",
        "Faperta", "#22c55e",
        "FTME", "#f97316",
        "Fasilitas Umum", "#a855f7",
        "#94a3b8"
      ],
      "fill-extrusion-height": ["get", "height"],
      "fill-extrusion-base": 0,
      "fill-extrusion-opacity": 0.72
    }
  });

  map3d.addSource("network", {
    type: "geojson",
    data: networkGeoJSON()
  });

  map3d.addLayer({
    id: "network-3d",
    type: "line",
    source: "network",
    paint: {
      "line-color": "#334155",
      "line-width": 4,
      "line-opacity": 0.75,
      "line-dasharray": [1, 1.5]
    }
  });

  map3d.addSource("route", {
    type: "geojson",
    data: emptyLine()
  });

  map3d.addLayer({
    id: "route-3d",
    type: "line",
    source: "route",
    paint: {
      "line-color": "#ef4444",
      "line-width": 8,
      "line-opacity": 0.95
    }
  });

  map3d.addSource("poi", {
    type: "geojson",
    data: poiGeoJSON()
  });

  map3d.addLayer({
    id: "poi-3d",
    type: "circle",
    source: "poi",
    paint: {
      "circle-radius": 7,
      "circle-color": "#0f766e",
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 2
    }
  });

  map3d.addLayer({
    id: "poi-label",
    type: "symbol",
    source: "poi",
    layout: {
      "text-field": ["get", "name"],
      "text-size": 12,
      "text-offset": [0, 1.2],
      "text-anchor": "top"
    },
    paint: {
      "text-color": "#0f172a",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.5
    }
  });
});

// -------------------------------------------------------
// KONVERSI DATA KE GEOJSON
// -------------------------------------------------------
function networkGeoJSON() {
  return {
    type: "FeatureCollection",
    features: edges.map(([from, to]) => ({
      type: "Feature",
      properties: { from, to },
      geometry: {
        type: "LineString",
        coordinates: [
          [nodes[from][1], nodes[from][0]],
          [nodes[to][1], nodes[to][0]]
        ]
      }
    }))
  };
}

function poiGeoJSON() {
  return {
    type: "FeatureCollection",
    features: pois.map((poi) => ({
      type: "Feature",
      properties: {
        id: poi.id,
        name: poi.name,
        category: poi.category
      },
      geometry: {
        type: "Point",
        coordinates: [poi.lng, poi.lat]
      }
    }))
  };
}

function routeGeoJSON(path) {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: path.map((nodeId) => [nodes[nodeId][1], nodes[nodeId][0]])
        }
      }
    ]
  };
}

function emptyLine() {
  return {
    type: "FeatureCollection",
    features: []
  };
}

// -------------------------------------------------------
// UI CONTROL
// -------------------------------------------------------
const startSelect = document.getElementById("startSelect");
const endSelect = document.getElementById("endSelect");
const routeBtn = document.getElementById("routeBtn");
const resetBtn = document.getElementById("resetBtn");
const routeName = document.getElementById("routeName");
const routeDistance = document.getElementById("routeDistance");
const routeTime = document.getElementById("routeTime");

pois.forEach((poi) => {
  const option1 = new Option(poi.name, poi.id);
  const option2 = new Option(poi.name, poi.id);
  startSelect.add(option1);
  endSelect.add(option2);
});

startSelect.value = "gerbang";
endSelect.value = "feb";

routeBtn.addEventListener("click", () => {
  const start = startSelect.value;
  const end = endSelect.value;

  if (start === end) {
    alert("Titik asal dan tujuan tidak boleh sama.");
    return;
  }

  const result = shortestPath(start, end);

  if (!result.path.length || !Number.isFinite(result.distance)) {
    alert("Rute tidak ditemukan. Cek koneksi jaringan jalur.");
    return;
  }

  drawRoute(result.path, result.distance);
});

resetBtn.addEventListener("click", () => {
  routeLayer2d.clearLayers();
  if (map3d.getSource("route")) {
    map3d.getSource("route").setData(emptyLine());
  }

  routeName.textContent = "-";
  routeDistance.textContent = "-";
  routeTime.textContent = "-";
});

function drawRoute(path, distance) {
  routeLayer2d.clearLayers();

  const latLngs = path.map((nodeId) => nodes[nodeId]);

  L.polyline(latLngs, {
    color: "#ef4444",
    weight: 8,
    opacity: 0.95
  }).addTo(routeLayer2d);

  // Marker A dan B
  const startNode = path[0];
  const endNode = path[path.length - 1];

  L.marker(nodes[startNode], {
    icon: L.divIcon({
      className: "poi-marker start-marker",
      html: "A",
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    })
  }).addTo(routeLayer2d);

  L.marker(nodes[endNode], {
    icon: L.divIcon({
      className: "poi-marker end-marker",
      html: "B",
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    })
  }).addTo(routeLayer2d);

  map2d.fitBounds(latLngs, { padding: [70, 70] });

  if (map3d.getSource("route")) {
    map3d.getSource("route").setData(routeGeoJSON(path));
    const bounds = latLngs.reduce(
      (b, coord) => b.extend([coord[1], coord[0]]),
      new maplibregl.LngLatBounds([latLngs[0][1], latLngs[0][0]], [latLngs[0][1], latLngs[0][0]])
    );
    map3d.fitBounds(bounds, { padding: 90, pitch: 58, bearing: -25 });
  }

  const startName = getPoiName(startNode);
  const endName = getPoiName(endNode);
  const minutes = distance / 80;

  routeName.textContent = `${startName} → ${endName}`;
  routeDistance.textContent = `${Math.round(distance)} meter`;
  routeTime.textContent = `${Math.max(1, Math.round(minutes))} menit`;
}

function getPoiName(id) {
  const poi = pois.find((p) => p.id === id);
  return poi ? poi.name : id;
}

function getBuildingColor(fungsi) {
  if (fungsi === "FEB") return "#38bdf8";
  if (fungsi === "Faperta") return "#22c55e";
  if (fungsi === "FTME") return "#f97316";
  if (fungsi === "Fasilitas Umum") return "#a855f7";
  return "#94a3b8";
}

// -------------------------------------------------------
// MODE 2D / 3D
// -------------------------------------------------------
const btn2D = document.getElementById("btn2D");
const btn3D = document.getElementById("btn3D");
const map2dEl = document.getElementById("map2d");
const map3dEl = document.getElementById("map3d");

btn2D.addEventListener("click", () => {
  btn2D.classList.add("active");
  btn3D.classList.remove("active");
  map2dEl.classList.add("active");
  map3dEl.classList.remove("active");

  setTimeout(() => map2d.invalidateSize(), 100);
});

btn3D.addEventListener("click", () => {
  btn3D.classList.add("active");
  btn2D.classList.remove("active");
  map3dEl.classList.add("active");
  map2dEl.classList.remove("active");

  setTimeout(() => map3d.resize(), 100);
});

// -------------------------------------------------------
// TOGGLE LAYER
// -------------------------------------------------------
document.getElementById("toggleBuildings").addEventListener("change", (e) => {
  if (e.target.checked) {
    buildingLayer2d.addTo(map2d);
    if (map3d.getLayer("buildings-3d")) map3d.setLayoutProperty("buildings-3d", "visibility", "visible");
  } else {
    map2d.removeLayer(buildingLayer2d);
    if (map3d.getLayer("buildings-3d")) map3d.setLayoutProperty("buildings-3d", "visibility", "none");
  }
});

document.getElementById("toggleNetwork").addEventListener("change", (e) => {
  if (e.target.checked) {
    networkLayer2d.addTo(map2d);
    if (map3d.getLayer("network-3d")) map3d.setLayoutProperty("network-3d", "visibility", "visible");
  } else {
    map2d.removeLayer(networkLayer2d);
    if (map3d.getLayer("network-3d")) map3d.setLayoutProperty("network-3d", "visibility", "none");
  }
});

document.getElementById("togglePoints").addEventListener("change", (e) => {
  if (e.target.checked) {
    poiLayer2d.addTo(map2d);
    if (map3d.getLayer("poi-3d")) map3d.setLayoutProperty("poi-3d", "visibility", "visible");
    if (map3d.getLayer("poi-label")) map3d.setLayoutProperty("poi-label", "visibility", "visible");
  } else {
    map2d.removeLayer(poiLayer2d);
    if (map3d.getLayer("poi-3d")) map3d.setLayoutProperty("poi-3d", "visibility", "none");
    if (map3d.getLayer("poi-label")) map3d.setLayoutProperty("poi-label", "visibility", "none");
  }
});
