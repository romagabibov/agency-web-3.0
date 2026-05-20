import crypto from 'crypto';

const cloud_name = 'ddmhnwhl3'; // assuming from before
const api_key = '157642667529213';
const api_secret = 'eD5s6htlM8P7GDwRkHorwt0lCKQ';

const timestamp = Math.floor(Date.now() / 1000);
const folder = 'models_videos';
const str = `folder=${folder}&timestamp=${timestamp}${api_secret}`;

const signature = crypto.createHash('sha1').update(str).digest('hex');

console.log('Str to sign:', str);
console.log('Signature:', signature);

// We need a dummy file
import fs from 'fs';
const vid = new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);

const formData = new FormData();
formData.append('file', new Blob([vid], { type: 'video/mp4' }), 'dummy.mp4');
formData.append('api_key', api_key);
formData.append('timestamp', timestamp);
formData.append('signature', signature);
formData.append('folder', folder);

fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/video/upload`, {
  method: 'POST',
  body: formData
}).then(res => res.json()).then(console.log).catch(console.error);
