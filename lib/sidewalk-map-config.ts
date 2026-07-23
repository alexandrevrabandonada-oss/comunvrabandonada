export const VOLTA_REDONDA_MAP = {
  slug: "volta-redonda",
  name: "Volta Redonda",
  center: [-44.1042, -22.5202] as [number, number],
  bounds: [-44.22, -22.60, -43.98, -22.43] as [number, number, number, number],
  defaultZoom: 12,
  style: {
    background: "#dfe7df",
    grid: "#aeb9af",
    water: "#93c5d1",
    marker: "#ffcc00",
  },
} as const;

export const LOCAL_DEMO_CARTOGRAPHY = {
  source: "synthetic_local_fixture",
  license: "Fixture de demonstração do COMUN; não representa levantamento viário real.",
  municipalityBoundary: "M45 90 L180 28 L390 42 L560 118 L570 250 L470 288 L250 275 L75 220 Z",
  roads: [
    {id:"eixo-central",name:"Eixo Central (demo)",path:"M15 205 C135 150 245 210 340 152 S505 82 590 115"},
    {id:"eixo-norte",name:"Eixo Norte (demo)",path:"M95 25 C145 90 205 112 300 125 S455 160 555 225"},
    {id:"eixo-leste",name:"Eixo Leste (demo)",path:"M30 125 C175 105 300 70 565 55"},
  ],
  neighborhoods: [
    {id:"centro",name:"Centro (demo)",x:290,y:135},
    {id:"aterrado",name:"Aterrado (demo)",x:155,y:185},
    {id:"retiro",name:"Retiro (demo)",x:430,y:80},
    {id:"vila",name:"Vila Santa Cecília (demo)",x:405,y:220},
  ],
  facilities: [
    {id:"saude",name:"Unidade de saúde (fixture)",x:330,y:165},
    {id:"onibus",name:"Ponto de ônibus (fixture)",x:245,y:175},
  ],
} as const;

export type PublicSidewalkRecord = {
  id: string;
  slug: string;
  name: string;
  public_geometry_geojson: {type:"Point"|"LineString";coordinates:number[]|number[][]}|null;
  categories: string[];
  condition: "good"|"regular"|"bad"|"terrible";
  forwarding_status: string;
  verification_status: string;
  public_summary: string;
  approximate_location: string|null;
  neighborhood: string|null;
  last_observed_at: string;
  resolved_at: string|null;
  public_photo_url?: string|null;
};

export function pointCoordinates(record: PublicSidewalkRecord): [number,number]|null {
  const geometry=record.public_geometry_geojson;
  if(!geometry)return null;
  const coordinates=geometry.type==="Point"?geometry.coordinates:(geometry.coordinates as number[][])[0];
  if(!Array.isArray(coordinates)||coordinates.length<2)return null;
  const [longitude,latitude]=coordinates as number[];
  return Number.isFinite(longitude)&&Number.isFinite(latitude)?[longitude,latitude]:null;
}

export function projectMercator([longitude,latitude]:[number,number],bounds=VOLTA_REDONDA_MAP.bounds){
  const [west,south,east,north]=bounds;
  const mercator=(lat:number)=>Math.log(Math.tan(Math.PI/4+(Math.max(-85,Math.min(85,lat))*Math.PI/180)/2));
  const x=(longitude-west)/(east-west);
  const y=(mercator(north)-mercator(latitude))/(mercator(north)-mercator(south));
  return{x:Math.max(0,Math.min(1,x)),y:Math.max(0,Math.min(1,y))};
}

export function unprojectMercator(x:number,y:number,bounds=VOLTA_REDONDA_MAP.bounds):[number,number]{
  const[west,south,east,north]=bounds,mercator=(lat:number)=>Math.log(Math.tan(Math.PI/4+(lat*Math.PI/180)/2));
  const longitude=west+x*(east-west),value=mercator(north)-y*(mercator(north)-mercator(south));
  return[Number(longitude.toFixed(6)),Number(((2*Math.atan(Math.exp(value))-Math.PI/2)*180/Math.PI).toFixed(6))];
}

export function distanceMeters(a:[number,number],b:[number,number]){
  const rad=(v:number)=>v*Math.PI/180,R=6371000,dLat=rad(b[1]-a[1]),dLon=rad(b[0]-a[0]);
  const h=Math.sin(dLat/2)**2+Math.cos(rad(a[1]))*Math.cos(rad(b[1]))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}

export type SidewalkCluster={id:string;x:number;y:number;records:PublicSidewalkRecord[]};
export function clusterSidewalkRecords(records:PublicSidewalkRecord[],zoom:number):SidewalkCluster[]{
  const cell=Math.max(.00025,.12/Math.max(1,zoom));
  const groups=new Map<string,SidewalkCluster>();
  for(const record of records){const point=pointCoordinates(record);if(!point)continue;const projected=projectMercator(point),key=`${Math.floor(projected.x/cell)}:${Math.floor(projected.y/cell)}`,current=groups.get(key);
    if(current){current.records.push(record);current.x=(current.x*(current.records.length-1)+projected.x)/current.records.length;current.y=(current.y*(current.records.length-1)+projected.y)/current.records.length}
    else groups.set(key,{id:key,x:projected.x,y:projected.y,records:[record]});
  }
  return [...groups.values()];
}

export function nearbySidewalkRecords(records:PublicSidewalkRecord[],point:[number,number],radiusMeters=75){
  return records.map(record=>({record,point:pointCoordinates(record)})).filter((item):item is {record:PublicSidewalkRecord;point:[number,number]}=>Boolean(item.point)).map(item=>({...item,distance:distanceMeters(point,item.point)})).filter(item=>item.distance<=radiusMeters).sort((a,b)=>a.distance-b.distance);
}
