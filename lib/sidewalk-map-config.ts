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
