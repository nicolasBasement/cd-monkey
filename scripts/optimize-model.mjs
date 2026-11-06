import fs from 'node:fs';
import sharp from 'sharp';
if (!process.argv[2]) throw new Error('Usage: npm run optimize-model -- /path/to/model.glb');
const raw = fs.readFileSync(process.argv[2]);
const length=raw.readUInt32LE(12), gltf=JSON.parse(raw.subarray(20,20+length)), bin=raw.subarray(28+length);
const imageViews=new Map(gltf.images.map(image=>[image.bufferView,image]));
const chunks=[]; let offset=0;
for(const [index,view] of gltf.bufferViews.entries()) {
 let data=bin.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength);
 if(imageViews.has(index)) {
  data=await sharp(data).resize({width:2048,height:2048,fit:'inside',withoutEnlargement:true}).webp({quality:90}).toBuffer();
  imageViews.get(index).mimeType='image/webp';
 }
 view.byteOffset=offset; view.byteLength=data.length;
 const padding=Buffer.alloc((4-data.length%4)%4);
 chunks.push(data,padding); offset+=data.length+padding.length;
}
gltf.buffers[0].byteLength=offset;
const json=Buffer.from(JSON.stringify(gltf)), jp=Buffer.alloc((4-json.length%4)%4,32), binary=Buffer.concat(chunks);
const header=Buffer.alloc(20); header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+jp.length+binary.length,8);header.writeUInt32LE(json.length+jp.length,12);header.writeUInt32LE(0x4e4f534a,16);
const bh=Buffer.alloc(8);bh.writeUInt32LE(binary.length);bh.writeUInt32LE(0x004e4942,4);
fs.writeFileSync(process.argv[3] || 'public/models/cd-2k.glb',Buffer.concat([header,json,jp,bh,binary]));
console.log('GLB optimized to',binary.length,'bytes');
