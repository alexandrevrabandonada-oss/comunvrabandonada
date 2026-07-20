import {describe,expect,it} from "vitest";
import {distanceMeters,pointCoordinates,projectMercator,unprojectMercator} from "./sidewalk-map-config";

describe("adaptador cartográfico local das calçadas",()=>{
  it("projeta e desfaz um ponto real sem trocar latitude e longitude",()=>{const point:[number,number]=[-44.1042,-22.5202],screen=projectMercator(point),restored=unprojectMercator(screen.x,screen.y);expect(restored[0]).toBeCloseTo(point[0],5);expect(restored[1]).toBeCloseTo(point[1],5)});
  it("calcula proximidade métrica",()=>{expect(distanceMeters([-44.1042,-22.5202],[-44.1042,-22.5193])).toBeGreaterThan(90);expect(distanceMeters([-44.1042,-22.5202],[-44.1042,-22.5193])).toBeLessThan(110)});
  it("usa somente geometria pública",()=>{expect(pointCoordinates({public_geometry_geojson:null} as any)).toBeNull();expect(pointCoordinates({public_geometry_geojson:{type:"Point",coordinates:[-44.1,-22.5]}} as any)).toEqual([-44.1,-22.5])});
});
