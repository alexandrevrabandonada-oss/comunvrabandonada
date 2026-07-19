import sharp from "sharp";
import { readFile } from "node:fs/promises";
const jobs=[["public/icons/comun-192.svg","public/icons/comun-192.png",192],["public/icons/comun-512.svg","public/icons/comun-512.png",512],["public/icons/comun-maskable.svg","public/icons/comun-maskable-512.png",512]];
for(const[input,output,size]of jobs){await sharp(await readFile(input)).resize(size,size).png({compressionLevel:9,palette:true}).toFile(output)}
console.log(`COMUN_PWA_ICONS_OK count=${jobs.length}`);
