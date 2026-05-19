/* VETERRAIN - WebGIS 3D Kampus UPN */
const CONFIG={center:[-7.76236,110.41000],zoom2D:18,zoom3D:18,minZoom:16,maxZoom:21,tileUrl:"TILES02/{z}/{x}/{y}.png",snapToleranceMeters:60,walkingSpeedMetersPerMinute:80,
  // Toleransi ini membantu kalau garis hasil digitasi terlihat tersambung
  // tetapi endpoint-nya beda sedikit. Naikkan ke 2-3 kalau masih ada rute yang muter.
  networkSnapToleranceMeters:6,data:{buildings:"data/bangunan.geojson",boundary:"data/batas.geojson",field:"data/lapangan.geojson",network:"data/jalur_pejalan_kaki.geojson"}};
const state={mode:"2d",pickMode:null,startPoint:null,endPoint:null,geojson:{buildings:null,boundary:null,field:null,network:null},graph:null,route:null};
const layers2D={
  buildings:null,
  buildingLabels:null,
  boundary:null,
  field:null,
  network:null,
  route:null,
  pins:null
};
const markers3D={start:null,end:null,walker:null};
const map2d=L.map("map2d",{zoomControl:true,attributionControl:true}).setView(CONFIG.center,CONFIG.zoom2D);
L.tileLayer(CONFIG.tileUrl,{minZoom:CONFIG.minZoom,maxZoom:CONFIG.maxZoom,tms:false,attribution:"Orthophoto Kampus UPN"}).addTo(map2d);
layers2D.route=L.layerGroup().addTo(map2d);layers2D.pins=L.layerGroup().addTo(map2d);
const map3d=new maplibregl.Map({container:"map3d",style:{version:8,sources:{ortho:{type:"raster",tiles:[CONFIG.tileUrl],tileSize:256,attribution:"Orthophoto Kampus UPN"}},layers:[{id:"ortho",type:"raster",source:"ortho"}]},center:[CONFIG.center[1],CONFIG.center[0]],zoom:CONFIG.zoom3D,minZoom:CONFIG.minZoom,maxZoom:CONFIG.maxZoom,pitch:65,maxPitch:85,bearing:-25,dragRotate:true,pitchWithRotate:true});
map3d.addControl(new maplibregl.NavigationControl(),"top-right");map3d.dragRotate.enable();map3d.touchZoomRotate.enable();map3d.touchZoomRotate.enableRotation();
Promise.all([loadJson(CONFIG.data.buildings),loadJson(CONFIG.data.boundary),loadJson(CONFIG.data.field),loadJson(CONFIG.data.network)]).then(([buildings,boundary,field,network])=>{state.geojson.buildings=buildings;state.geojson.boundary=boundary;state.geojson.field=field;state.geojson.network=network;render2DLayers();state.graph=buildGraphFromGeoJSON(network);map3d.on("load",()=>{render3DLayers();set3DVisibilityFromCheckboxes()});if(map3d.loaded()){render3DLayers();set3DVisibilityFromCheckboxes()}fitToBoundaryOrNetwork();hideLoading();updateRouteStatus("Data siap. Pilih titik A dan B.")}).catch(err=>{hideLoading();console.error(err);updateRouteStatus("Gagal memuat data. Cek path folder data/TILES02.");alert("Ada data yang gagal dimuat. Pastikan folder data/ dan TILES02/ sudah sejajar dengan index.html, lalu cek Console.")});
function loadJson(url){return fetch(url).then(res=>{if(!res.ok)throw new Error(`Gagal memuat ${url}: ${res.status}`);return res.json()})}
function render2DLayers(){layers2D.field=L.geoJSON(state.geojson.field,{style:{color:"#15803d",weight:1.5,fillColor:"#86efac",fillOpacity:.45},onEachFeature:bindGenericPopup}).addTo(map2d);layers2D.buildings=L.geoJSON(state.geojson.buildings,{style:f=>({color:"#0f172a",weight:1,fillColor:buildingColor(getBuildingHeight(f.properties)),fillOpacity:.42}),onEachFeature:bindBuildingPopup}).addTo(map2d);

layers2D.buildingLabels=L.layerGroup().addTo(map2d);
addBuildingLabels2D(state.geojson.buildings);

layers2D.network=L.geoJSON(state.geojson.network,{style:{color:"#facc15",weight:3,opacity:.95,dashArray:"6 5"},onEachFeature:bindNetworkPopup}).addTo(map2d);layers2D.boundary=L.geoJSON(state.geojson.boundary,{style:{color:"#ef4444",weight:3,opacity:.95,fillOpacity:0},onEachFeature:bindGenericPopup}).addTo(map2d)}
function bindBuildingPopup(feature,layer){const p=feature.properties||{};const name=getProp(p,["Nama","NAMA","nama","Name"])||"Bangunan";const area=getProp(p,["Luas","LUAS","luas","area","Area"]);const height=getBuildingHeight(p);layer.bindPopup(`<strong>${escapeHtml(name)}</strong><br>Luas: ${formatNumber(area)} m²<br>Tinggi: ${formatNumber(height)} m`)}
function bindNetworkPopup(feature,layer){const p=feature.properties||{};const id=getProp(p,["id_jalur","ID_JALUR","id","Id","FID"]);const length=getProp(p,["Jalur_m","jalur_m","panjang_m","Panjang_m","length","Length"]);layer.bindPopup(`<strong>Jalur Pejalan Kaki</strong><br>ID: ${id??"-"}<br>Panjang: ${formatNumber(length)} m`)}
function bindGenericPopup(feature,layer){const p=feature.properties||{};const name=getProp(p,["Nama","NAMA","nama","Name"])||"Objek";layer.bindPopup(`<strong>${escapeHtml(name)}</strong>`)}
function render3DLayers(){addOrUpdateSource("field",state.geojson.field);addOrUpdateSource("boundary",state.geojson.boundary);addOrUpdateSource("network",state.geojson.network);addOrUpdateSource("buildings",state.geojson.buildings);
  addOrUpdateSource("building-labels",buildingLabelPoints(state.geojson.buildings));
  addOrUpdateSource("route",emptyFeatureCollection());if(!map3d.getLayer("field-3d")){map3d.addLayer({id:"field-3d",type:"fill",source:"field",paint:{"fill-color":"#86efac","fill-opacity":.45,"fill-outline-color":"#15803d"}})}if(!map3d.getLayer("buildings-3d")){map3d.addLayer({id:"buildings-3d",type:"fill-extrusion",source:"buildings",paint:{"fill-extrusion-color":["interpolate",["linear"],["coalesce",["to-number",["get","Tinggi"]],["to-number",["get","tinggi"]],8],0,"#bae6fd",8,"#67e8f9",16,"#38bdf8",24,"#0ea5e9"],"fill-extrusion-height":["coalesce",["to-number",["get","Tinggi"]],["to-number",["get","tinggi"]],["to-number",["get","TINGGI"]],8],"fill-extrusion-base":0,"fill-extrusion-opacity":.72}})}if(!map3d.getLayer("building-labels-3d")){
    map3d.addLayer({
      id:"building-labels-3d",
      type:"symbol",
      source:"building-labels",
      layout:{
        "text-field":["get","name"],
        "text-size":12,
        "text-font":["Open Sans Bold","Arial Unicode MS Bold"],
        "text-anchor":"center",
        "text-allow-overlap":false,
        "text-ignore-placement":false
      },
      paint:{
        "text-color":"#0f172a",
        "text-halo-color":"#ffffff",
        "text-halo-width":1.6
      }
    });
  }

if(!map3d.getLayer("network-3d")){map3d.addLayer({id:"network-3d",type:"line",source:"network",paint:{"line-color":"#facc15","line-width":3,"line-opacity":.95,"line-dasharray":[1.4,1.1]}})}if(!map3d.getLayer("boundary-3d")){map3d.addLayer({id:"boundary-3d",type:"line",source:"boundary",paint:{"line-color":"#ef4444","line-width":4,"line-opacity":.95}})}if(!map3d.getLayer("route-3d")){map3d.addLayer({id:"route-3d",type:"line",source:"route",paint:{"line-color":"#ef4444","line-width":7,"line-opacity":.98}})}}
function addOrUpdateSource(id,data){if(map3d.getSource(id)){map3d.getSource(id).setData(data)}else{map3d.addSource(id,{type:"geojson",data})}}
document.getElementById("pickStartBtn").addEventListener("click",()=>setPickMode("start"));document.getElementById("pickEndBtn").addEventListener("click",()=>setPickMode("end"));document.getElementById("routeBtn").addEventListener("click",calculateRoute);document.getElementById("playRouteBtn").addEventListener("click",playRouteDemo3D);document.getElementById("resetBtn").addEventListener("click",resetRoute);
map2d.on("click",e=>{if(!state.pickMode)return;setPointFromMapClick(state.pickMode,{lat:e.latlng.lat,lng:e.latlng.lng})});map3d.on("click",e=>{if(!state.pickMode)return;setPointFromMapClick(state.pickMode,{lat:e.lngLat.lat,lng:e.lngLat.lng})});
function setPickMode(mode){state.pickMode=mode;document.getElementById("pickStartBtn").classList.toggle("active",mode==="start");document.getElementById("pickEndBtn").classList.toggle("active",mode==="end");updateRouteStatus(mode==="start"?"Klik peta untuk menaruh Titik A.":"Klik peta untuk menaruh Titik B.")}
function setPointFromMapClick(mode,latlng){if(mode==="start"){state.startPoint=latlng;document.getElementById("startStatus").textContent="Sudah dipilih"}else{state.endPoint=latlng;document.getElementById("endStatus").textContent="Sudah dipilih"}drawPins();state.pickMode=null;document.getElementById("pickStartBtn").classList.remove("active");document.getElementById("pickEndBtn").classList.remove("active");if(state.startPoint&&state.endPoint)updateRouteStatus("Titik A dan B sudah dipilih. Klik Cari Rute Terpendek.")}
function drawPins(){layers2D.pins.clearLayers();if(state.startPoint)L.marker([state.startPoint.lat,state.startPoint.lng],{icon:pinIcon("A","start")}).addTo(layers2D.pins);if(state.endPoint)L.marker([state.endPoint.lat,state.endPoint.lng],{icon:pinIcon("B","end")}).addTo(layers2D.pins);update3DPins()}
function pinIcon(text,type){return L.divIcon({className:"",html:`<div class="pin-marker ${type}">${text}</div>`,iconSize:[34,34],iconAnchor:[17,17]})}
function update3DPins(){stopDemoAnimation();remove3DMarker("start");remove3DMarker("end");removeWalkerMarker();if(state.startPoint)markers3D.start=create3DMarker("A","start",state.startPoint);if(state.endPoint)markers3D.end=create3DMarker("B","end",state.endPoint)}
function create3DMarker(label,type,latlng){const el=document.createElement("div");el.className=`pin-marker ${type}`;el.textContent=label;return new maplibregl.Marker({element:el,anchor:"center"}).setLngLat([latlng.lng,latlng.lat]).addTo(map3d)}
function remove3DMarker(type){if(markers3D[type]){markers3D[type].remove();markers3D[type]=null}}
function buildGraphFromGeoJSON(geojson){
  // Versi revisi topologi:
  // - Memecah garis pada perpotongan.
  // - Menyambungkan endpoint yang dekat dengan segmen lain.
  // - Men-snap node yang jaraknya dekat.
  // Ini membantu kasus jalur terlihat nyambung di peta, tetapi secara data masih ada gap kecil.
  const rawSegments=[];

  forEachLineSegment(geojson,(a,b,props)=>{
    if(distanceMeters(a,b)>0.05){
      rawSegments.push({a,b,props});
    }
  });

  const splitByIntersections=splitSegmentsAtIntersections(rawSegments);
  const splitByNearEndpoints=splitSegmentsAtNearEndpoints(
    splitByIntersections,
    CONFIG.networkSnapToleranceMeters||6
  );

  const graph=new Map();
  const allSegments=[];
  const snapTol=CONFIG.networkSnapToleranceMeters||6;
  const canonical=[];

  function canonicalKey(coord){
    for(const item of canonical){
      if(distanceMeters(coord,item.coord)<=snapTol){
        return item.key;
      }
    }
    const key=coordKey(coord);
    canonical.push({key,coord});
    return key;
  }

  splitByNearEndpoints.forEach((seg)=>{
    const keyA=canonicalKey(seg.a);
    const keyB=canonicalKey(seg.b);
    if(keyA===keyB)return;

    const coordA=keyToCoord(keyA);
    const coordB=keyToCoord(keyB);
    const distance=distanceMeters(coordA,coordB);

    addEdge(graph,keyA,keyB,distance);
    addEdge(graph,keyB,keyA,distance);

    allSegments.push({
      a:coordA,
      b:coordB,
      keyA,
      keyB,
      props:seg.props
    });
  });

  return{graph,segments:allSegments};
}

// Membuat node di titik potong antarsegmen.
// Ini membantu kalau dua polyline saling berpotongan tetapi belum di-split di ArcMap/QGIS.
function splitSegmentsAtIntersections(segments){
  const splitPoints=segments.map((seg)=>[
    {coord:seg.a,t:0},
    {coord:seg.b,t:1}
  ]);

  for(let i=0;i<segments.length;i++){
    for(let j=i+1;j<segments.length;j++){
      const hit=segmentIntersection2D(segments[i].a,segments[i].b,segments[j].a,segments[j].b);
      if(!hit)continue;

      addSplitPoint(splitPoints[i],hit.coord,hit.t1);
      addSplitPoint(splitPoints[j],hit.coord,hit.t2);
    }
  }

  return rebuildSegmentsFromSplitPoints(segments,splitPoints);
}

// Revisi penting:
// Kalau endpoint suatu jalur berhenti sangat dekat dengan segmen jalur lain,
// segmen lain akan dipecah pada titik proyeksi tersebut. Ini sering terjadi
// pada hasil digitasi manual di simpang/T-junction.
function splitSegmentsAtNearEndpoints(segments,toleranceMeters){
  const splitPoints=segments.map((seg)=>[
    {coord:seg.a,t:0},
    {coord:seg.b,t:1}
  ]);

  for(let i=0;i<segments.length;i++){
    const endpoints=[segments[i].a,segments[i].b];

    endpoints.forEach((endpoint)=>{
      for(let j=0;j<segments.length;j++){
        if(i===j)return;

        const target=segments[j];
        const projected=closestPointOnSegment(endpoint,target.a,target.b);
        const dist=distanceMeters(endpoint,projected);

        if(dist>toleranceMeters)return;

        const t=segmentParameter(projected,target.a,target.b);
        if(t>0.000001&&t<0.999999){
          addSplitPoint(splitPoints[j],projected,t);

          // Tambahkan juga titik endpoint sebagai kandidat node,
          // supaya nanti canonical snapping menyatukan endpoint dengan projected point.
          addSplitPoint(splitPoints[i],endpoint,endpointAlmostEquals(endpoint,segments[i].a)?0:1);
        }
      }
    });
  }

  return rebuildSegmentsFromSplitPoints(segments,splitPoints);
}

function rebuildSegmentsFromSplitPoints(segments,splitPoints){
  const result=[];

  segments.forEach((seg,idx)=>{
    const pts=splitPoints[idx]
      .sort((p,q)=>p.t-q.t)
      .filter((p,k,arr)=>k===0||distanceMeters(p.coord,arr[k-1].coord)>0.05);

    for(let i=0;i<pts.length-1;i++){
      if(distanceMeters(pts[i].coord,pts[i+1].coord)>0.05){
        result.push({
          a:pts[i].coord,
          b:pts[i+1].coord,
          props:seg.props
        });
      }
    }
  });

  return result;
}

function addSplitPoint(list,coord,t){
  if(list.some((p)=>distanceMeters(p.coord,coord)<0.05))return;
  list.push({coord,t});
}

function endpointAlmostEquals(a,b){
  return distanceMeters(a,b)<0.05;
}

// Nilai 0-1 posisi projected point pada segmen a-b.
function segmentParameter(point,a,b){
  const refLat=(point[1]+a[1]+b[1])/3;
  const P=projectToMeters(point,refLat);
  const A=projectToMeters(a,refLat);
  const B=projectToMeters(b,refLat);

  const ABx=B.x-A.x;
  const ABy=B.y-A.y;
  const APx=P.x-A.x;
  const APy=P.y-A.y;
  const ab2=ABx*ABx+ABy*ABy;

  if(ab2===0)return 0;

  return Math.max(0,Math.min(1,(APx*ABx+APy*ABy)/ab2));
}

// Intersection planar untuk area kecil kampus.
// Return titik potong jika dua segmen benar-benar berpotongan.
function segmentIntersection2D(a,b,c,d){
  const refLat=(a[1]+b[1]+c[1]+d[1])/4;
  const A=projectToMeters(a,refLat);
  const B=projectToMeters(b,refLat);
  const C=projectToMeters(c,refLat);
  const D=projectToMeters(d,refLat);

  const r={x:B.x-A.x,y:B.y-A.y};
  const s={x:D.x-C.x,y:D.y-C.y};
  const denom=cross2D(r,s);

  if(Math.abs(denom)<1e-9)return null;

  const qmp={x:C.x-A.x,y:C.y-A.y};
  const t=cross2D(qmp,s)/denom;
  const u=cross2D(qmp,r)/denom;

  if(t<-1e-9||t>1+1e-9||u<-1e-9||u>1+1e-9)return null;

  const pointMeters={x:A.x+t*r.x,y:A.y+t*r.y};
  const coord=unprojectFromMeters(pointMeters,refLat);

  return{coord,t1:t,t2:u};
}

function cross2D(a,b){
  return a.x*b.y-a.y*b.x;
}

function calculateRoute(){if(!state.graph){alert("Data jaringan jalur belum siap.");return}if(!state.startPoint||!state.endPoint){alert("Pilih titik A dan titik B dulu.");return}const startLngLat=[state.startPoint.lng,state.startPoint.lat],endLngLat=[state.endPoint.lng,state.endPoint.lat];const snapStart=findNearestSegment(startLngLat,state.graph.segments),snapEnd=findNearestSegment(endLngLat,state.graph.segments);if(!snapStart||!snapEnd){alert("Jaringan jalur tidak ditemukan.");return}if(snapStart.distanceToPoint>CONFIG.snapToleranceMeters||snapEnd.distanceToPoint>CONFIG.snapToleranceMeters){alert(`Titik terlalu jauh dari jaringan jalur pejalan kaki.\nJarak Titik A ke jalur: ${Math.round(snapStart.distanceToPoint)} m\nJarak Titik B ke jalur: ${Math.round(snapEnd.distanceToPoint)} m\n\nCoba klik titik yang lebih dekat dengan jalan/koridor.`);return}const augmented=cloneGraph(state.graph.graph);const startPinKey="__START_PIN__",endPinKey="__END_PIN__",startSnapKey="__START_SNAP__",endSnapKey="__END_SNAP__";const coordMap=graphCoordMap(state.graph.graph);coordMap.set(startPinKey,startLngLat);coordMap.set(endPinKey,endLngLat);coordMap.set(startSnapKey,snapStart.point);coordMap.set(endSnapKey,snapEnd.point);addTemporarySnapNode(augmented,startSnapKey,snapStart);addTemporarySnapNode(augmented,endSnapKey,snapEnd);const startConnector=distanceMeters(startLngLat,snapStart.point),endConnector=distanceMeters(endLngLat,snapEnd.point);addEdge(augmented,startPinKey,startSnapKey,startConnector);addEdge(augmented,startSnapKey,startPinKey,startConnector);addEdge(augmented,endPinKey,endSnapKey,endConnector);addEdge(augmented,endSnapKey,endPinKey,endConnector);const result=dijkstra(augmented,startPinKey,endPinKey);if(!result.path.length||!Number.isFinite(result.distance)){alert("Rute tidak ditemukan. Cek koneksi/snap jaringan jalur.");return}const routeCoords=result.path.map(key=>coordMap.get(key)).filter(Boolean);const routeFeature={type:"Feature",properties:{distance_m:result.distance},geometry:{type:"LineString",coordinates:routeCoords}};state.route=routeFeature;renderRoute(routeFeature,result.distance);const minutes=result.distance/CONFIG.walkingSpeedMetersPerMinute;document.getElementById("routeName").textContent="Titik A → Titik B";document.getElementById("routeDistance").textContent=`${Math.round(result.distance)} meter`;document.getElementById("routeTime").textContent=`${Math.max(1,Math.round(minutes))} menit`;updateRouteStatus("Rute berhasil dihitung.");document.getElementById("playRouteBtn").disabled=false;fitRoute(routeCoords)}
function addTemporarySnapNode(graph,snapKey,snap){const distA=distanceMeters(snap.point,snap.a),distB=distanceMeters(snap.point,snap.b);addEdge(graph,snapKey,snap.keyA,distA);addEdge(graph,snap.keyA,snapKey,distA);addEdge(graph,snapKey,snap.keyB,distB);addEdge(graph,snap.keyB,snapKey,distB)}
function renderRoute(routeFeature,distance){layers2D.route.clearLayers();const latLngs=routeFeature.geometry.coordinates.map(c=>[c[1],c[0]]);L.polyline(latLngs,{color:"#ef4444",weight:7,opacity:.98}).bindPopup(`<strong>Rute Terpendek</strong><br>Jarak: ${Math.round(distance)} meter<br>Estimasi waktu: ${Math.max(1,Math.round(distance/CONFIG.walkingSpeedMetersPerMinute))} menit`).addTo(layers2D.route);if(map3d.getSource("route"))map3d.getSource("route").setData({type:"FeatureCollection",features:[routeFeature]})}
function resetRoute(){state.startPoint=null;state.endPoint=null;state.route=null;state.pickMode=null;layers2D.route.clearLayers();layers2D.pins.clearLayers();stopDemoAnimation();remove3DMarker("start");remove3DMarker("end");removeWalkerMarker();if(map3d.getSource("route"))map3d.getSource("route").setData(emptyFeatureCollection());document.getElementById("startStatus").textContent="Belum dipilih";document.getElementById("endStatus").textContent="Belum dipilih";document.getElementById("routeName").textContent="-";document.getElementById("routeDistance").textContent="-";document.getElementById("routeTime").textContent="-";document.getElementById("playRouteBtn").disabled=true;document.getElementById("pickStartBtn").classList.remove("active");document.getElementById("pickEndBtn").classList.remove("active");updateRouteStatus("Menunggu input")}
function dijkstra(graph,start,end){const distances=new Map(),previous=new Map(),visited=new Set();for(const key of graph.keys()){distances.set(key,Infinity);previous.set(key,null)}distances.set(start,0);while(visited.size<graph.size){let current=null,currentDistance=Infinity;for(const [key,distance] of distances.entries()){if(!visited.has(key)&&distance<currentDistance){current=key;currentDistance=distance}}if(current===null)break;if(current===end)break;visited.add(current);for(const edge of graph.get(current)||[]){if(visited.has(edge.to))continue;const alt=currentDistance+edge.weight;if(alt<(distances.get(edge.to)??Infinity)){distances.set(edge.to,alt);previous.set(edge.to,current)}}}const path=[];let cursor=end;while(cursor){path.unshift(cursor);cursor=previous.get(cursor)}if(path[0]!==start)return{path:[],distance:Infinity};return{path,distance:distances.get(end)}}
function forEachLineSegment(geojson,callback){if(!geojson||!geojson.features)return;geojson.features.forEach(feature=>{const geom=feature.geometry;if(!geom)return;if(geom.type==="LineString")processLineCoords(geom.coordinates,feature.properties||{},callback);if(geom.type==="MultiLineString")geom.coordinates.forEach(line=>processLineCoords(line,feature.properties||{},callback))})}
function processLineCoords(coords,props,callback){for(let i=0;i<coords.length-1;i++){const a=coords[i],b=coords[i+1];if(isValidCoord(a)&&isValidCoord(b))callback(a,b,props)}}
function findNearestSegment(point,segments){let best=null;for(const seg of segments){const projected=closestPointOnSegment(point,seg.a,seg.b);const dist=distanceMeters(point,projected);if(!best||dist<best.distanceToPoint)best={...seg,point:projected,distanceToPoint:dist}}return best}
function closestPointOnSegment(point,a,b){const refLat=point[1],p=projectToMeters(point,refLat),A=projectToMeters(a,refLat),B=projectToMeters(b,refLat);const ABx=B.x-A.x,ABy=B.y-A.y,APx=p.x-A.x,APy=p.y-A.y;const ab2=ABx*ABx+ABy*ABy;if(ab2===0)return a;let t=(APx*ABx+APy*ABy)/ab2;t=Math.max(0,Math.min(1,t));const x=A.x+t*ABx,y=A.y+t*ABy;return unprojectFromMeters({x,y},refLat)}
function projectToMeters(coord,refLat){const metersPerDegreeLat=111320,metersPerDegreeLng=111320*Math.cos(refLat*Math.PI/180);return{x:coord[0]*metersPerDegreeLng,y:coord[1]*metersPerDegreeLat}}
function unprojectFromMeters(point,refLat){const metersPerDegreeLat=111320,metersPerDegreeLng=111320*Math.cos(refLat*Math.PI/180);return[point.x/metersPerDegreeLng,point.y/metersPerDegreeLat]}
function isValidCoord(coord){return Array.isArray(coord)&&Number.isFinite(coord[0])&&Number.isFinite(coord[1])}
function distanceMeters(a,b){const R=6371000,lat1=toRad(a[1]),lat2=toRad(b[1]),dLat=toRad(b[1]-a[1]),dLng=toRad(b[0]-a[0]);const x=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}
function toRad(deg){return deg*Math.PI/180}function coordKey(coord){return`${Number(coord[0]).toFixed(7)},${Number(coord[1]).toFixed(7)}`}function keyToCoord(key){const[lng,lat]=key.split(",").map(Number);return[lng,lat]}function addEdge(graph,from,to,weight){if(!graph.has(from))graph.set(from,[]);graph.get(from).push({to,weight})}function cloneGraph(graph){const copy=new Map();for(const[key,edges]of graph.entries())copy.set(key,edges.map(edge=>({...edge})));return copy}function graphCoordMap(graph){const map=new Map();for(const key of graph.keys())if(key.includes(","))map.set(key,keyToCoord(key));return map}
document.getElementById("btn2D").addEventListener("click",()=>switchMode("2d"));document.getElementById("btn3D").addEventListener("click",()=>switchMode("3d"));function switchMode(mode){state.mode=mode;document.getElementById("btn2D").classList.toggle("active",mode==="2d");document.getElementById("btn3D").classList.toggle("active",mode==="3d");document.getElementById("map2d").classList.toggle("active",mode==="2d");document.getElementById("map3d").classList.toggle("active",mode==="3d");if(mode==="2d")setTimeout(()=>map2d.invalidateSize(),100);else setTimeout(()=>map3d.resize(),100)}
document.getElementById("toggleBuildings").addEventListener("change",e=>{set2DLayerVisible(layers2D.buildings,e.target.checked);set3DLayerVisible("buildings-3d",e.target.checked)});document.getElementById("toggleNetwork").addEventListener("change",e=>{set2DLayerVisible(layers2D.network,e.target.checked);set3DLayerVisible("network-3d",e.target.checked)});document.getElementById("toggleBoundary").addEventListener("change",e=>{set2DLayerVisible(layers2D.boundary,e.target.checked);set3DLayerVisible("boundary-3d",e.target.checked)});document.getElementById("toggleField").addEventListener("change",e=>{set2DLayerVisible(layers2D.field,e.target.checked);set3DLayerVisible("field-3d",e.target.checked)});
function set2DLayerVisible(layer,visible){if(!layer)return;if(visible&&!map2d.hasLayer(layer))layer.addTo(map2d);if(!visible&&map2d.hasLayer(layer))map2d.removeLayer(layer)}function set3DLayerVisible(layerId,visible){if(!map3d.getLayer(layerId))return;map3d.setLayoutProperty(layerId,"visibility",visible?"visible":"none")}function set3DVisibilityFromCheckboxes(){
  set3DLayerVisible("buildings-3d",document.getElementById("toggleBuildings").checked);
  set3DLayerVisible("building-labels-3d",document.getElementById("toggleBuildings").checked);set3DLayerVisible("network-3d",document.getElementById("toggleNetwork").checked);set3DLayerVisible("boundary-3d",document.getElementById("toggleBoundary").checked);set3DLayerVisible("field-3d",document.getElementById("toggleField").checked)}
function fitToBoundaryOrNetwork(){const target=state.geojson.boundary||state.geojson.network;try{const bounds=geojsonBounds(target);if(bounds){map2d.fitBounds([[bounds.south,bounds.west],[bounds.north,bounds.east]],{padding:[35,35]});map3d.fitBounds([[bounds.west,bounds.south],[bounds.east,bounds.north]],{padding:60,pitch:58,bearing:-25})}}catch(err){console.warn("Tidak bisa fit bounds:",err)}}
function fitRoute(coords){if(!coords.length)return;const latLngs=coords.map(c=>[c[1],c[0]]);map2d.fitBounds(latLngs,{padding:[80,80]});const bounds=coords.reduce((b,c)=>b.extend([c[0],c[1]]),new maplibregl.LngLatBounds(coords[0],coords[0]));map3d.fitBounds(bounds,{padding:90,pitch:58,bearing:-25})}
function geojsonBounds(geojson){const coords=[];function collect(c){if(!Array.isArray(c))return;if(typeof c[0]==="number"&&typeof c[1]==="number")coords.push(c);else c.forEach(collect)}(geojson.features||[]).forEach(f=>collect(f.geometry&&f.geometry.coordinates));if(!coords.length)return null;const lngs=coords.map(c=>c[0]),lats=coords.map(c=>c[1]);return{west:Math.min(...lngs),east:Math.max(...lngs),south:Math.min(...lats),north:Math.max(...lats)}}
function updateRouteStatus(text){document.getElementById("routeStatus").textContent=text}function hideLoading(){document.getElementById("loadingOverlay").classList.add("hidden")}

// ----------------------------------------------------------
// BUILDING LABELS
// ----------------------------------------------------------
function addBuildingLabels2D(geojson){
  if(!layers2D.buildingLabels||!geojson||!geojson.features)return;

  geojson.features.forEach((feature)=>{
    const p=feature.properties||{};
    const name=getProp(p,["Nama","NAMA","nama","Name"]);
    if(!name)return;

    const center=featureCenter(feature);
    if(!center)return;

    const marker=L.marker([center[1],center[0]],{
      interactive:false,
      icon:L.divIcon({
        className:"",
        html:`<div class="building-label">${escapeHtml(name)}</div>`,
        iconSize:null,
        iconAnchor:[0,0]
      })
    });

    marker.addTo(layers2D.buildingLabels);
  });
}

function buildingLabelPoints(geojson){
  const features=[];

  if(!geojson||!geojson.features){
    return{type:"FeatureCollection",features};
  }

  geojson.features.forEach((feature)=>{
    const p=feature.properties||{};
    const name=getProp(p,["Nama","NAMA","nama","Name"]);
    if(!name)return;

    const center=featureCenter(feature);
    if(!center)return;

    features.push({
      type:"Feature",
      properties:{name},
      geometry:{
        type:"Point",
        coordinates:center
      }
    });
  });

  return{type:"FeatureCollection",features};
}

function featureCenter(feature){
  const coords=[];

  function collect(c){
    if(!Array.isArray(c))return;
    if(typeof c[0]==="number"&&typeof c[1]==="number"){
      coords.push(c);
    }else{
      c.forEach(collect);
    }
  }

  if(!feature.geometry)return null;
  collect(feature.geometry.coordinates);

  if(!coords.length)return null;

  const lngs=coords.map((c)=>c[0]);
  const lats=coords.map((c)=>c[1]);

  return[
    (Math.min(...lngs)+Math.max(...lngs))/2,
    (Math.min(...lats)+Math.max(...lats))/2
  ];
}


function getProp(obj,keys){for(const key of keys)if(obj[key]!==undefined&&obj[key]!==null&&obj[key]!=="")return obj[key];return null}function getBuildingHeight(props){return Number(getProp(props||{},["Tinggi","TINGGI","tinggi","Height","height"]))||8}function buildingColor(height){if(height>=20)return"#0ea5e9";if(height>=16)return"#38bdf8";if(height>=10)return"#67e8f9";return"#bae6fd"}function formatNumber(value){if(value===null||value===undefined||value==="")return"-";const n=Number(value);if(!Number.isFinite(n))return value;return n.toLocaleString("id-ID",{maximumFractionDigits:2})}function escapeHtml(value){return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}function emptyFeatureCollection(){return{type:"FeatureCollection",features:[]}}

// ----------------------------------------------------------
// RESET VIEW DENGAN TOMBOL R + DEMO KAMERA JALAN 3D
// ----------------------------------------------------------
document.addEventListener("keydown",(e)=>{
  const activeTag=document.activeElement.tagName;
  const isTyping=["INPUT","TEXTAREA","SELECT"].includes(activeTag);
  if(isTyping)return;
  if(e.key.toLowerCase()==="r")resetView();
});

function resetView(){
  map2d.setView(CONFIG.center,CONFIG.zoom2D);
  map3d.easeTo({
    center:[CONFIG.center[1],CONFIG.center[0]],
    zoom:CONFIG.zoom3D,
    pitch:65,
    bearing:-25,
    duration:1000
  });
  updateRouteStatus("View di-reset.");
}

// ----------------------------------------------------------
// WALKER / ORANG JALAN SAAT PLAY DEMO 3D
// ----------------------------------------------------------
let demoRunId=0;
let demoAnimationFrame=null;

function playRouteDemo3D(){
  if(!state.route||!state.route.geometry||!state.route.geometry.coordinates.length){
    alert("Hitung rute dulu sebelum menjalankan demo jalan 3D.");
    return;
  }

  const coords=state.route.geometry.coordinates;

  if(coords.length<2){
    alert("Rute terlalu pendek untuk demo.");
    return;
  }

  switchMode("3d");
  stopDemoAnimation(false);

  const runId=++demoRunId;
  updateRouteStatus("Demo jalan 3D sedang berjalan...");
  document.getElementById("playRouteBtn").disabled=true;

  removeWalkerMarker();
  markers3D.walker=createWalkerMarker(coords[0]);

  map3d.jumpTo({
    center:coords[0],
    zoom:20.4,
    pitch:75,
    bearing:bearingBetween(coords[0],coords[1])
  });

  setTimeout(()=>{
    animateRouteSegment(coords,0,runId);
  },500);
}

function animateRouteSegment(coords,index,runId){
  if(runId!==demoRunId)return;

  if(index>=coords.length-1){
    updateRouteStatus("Demo jalan 3D selesai.");
    document.getElementById("playRouteBtn").disabled=false;
    return;
  }

  const from=coords[index];
  const to=coords[index+1];
  const segmentDistance=distanceMeters(from,to);
  const bearing=bearingBetween(from,to);

  // Durasi mengikuti panjang segmen. Angka ini bisa dinaikkan kalau mau orangnya lebih lambat.
  const duration=Math.max(750,Math.min(3200,segmentDistance*28));
  const startTime=performance.now();

  map3d.easeTo({
    center:to,
    zoom:20.4,
    pitch:75,
    bearing:bearing,
    duration:duration,
    easing:(t)=>t
  });

  function step(now){
    if(runId!==demoRunId)return;

    const t=Math.min(1,(now-startTime)/duration);
    const pos=interpolateCoord(from,to,t);

    if(markers3D.walker){
      markers3D.walker.setLngLat(pos);
    }

    if(t<1){
      demoAnimationFrame=requestAnimationFrame(step);
    }else{
      setTimeout(()=>{
        animateRouteSegment(coords,index+1,runId);
      },80);
    }
  }

  if(demoAnimationFrame)cancelAnimationFrame(demoAnimationFrame);
  demoAnimationFrame=requestAnimationFrame(step);
}

function createWalkerMarker(coord){
  const el=document.createElement("div");
  el.className="walker-marker";
  el.innerHTML='<div class="walker-person">🚶</div><div class="walker-shadow"></div>';

  return new maplibregl.Marker({
    element:el,
    anchor:"bottom"
  })
  .setLngLat(coord)
  .addTo(map3d);
}

function removeWalkerMarker(){
  if(markers3D.walker){
    markers3D.walker.remove();
    markers3D.walker=null;
  }
}

function stopDemoAnimation(incrementRun=true){
  if(incrementRun)demoRunId++;
  if(demoAnimationFrame){
    cancelAnimationFrame(demoAnimationFrame);
    demoAnimationFrame=null;
  }
}

function interpolateCoord(from,to,t){
  return [
    from[0]+(to[0]-from[0])*t,
    from[1]+(to[1]-from[1])*t
  ];
}

function bearingBetween(from,to){
  const lon1=toRad(from[0]),lat1=toRad(from[1]),lon2=toRad(to[0]),lat2=toRad(to[1]);
  const dLon=lon2-lon1;
  const y=Math.sin(dLon)*Math.cos(lat2);
  const x=Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLon);
  const bearing=Math.atan2(y,x)*180/Math.PI;
  return(bearing+360)%360;
}