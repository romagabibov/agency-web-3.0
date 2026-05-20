import fs from 'fs';
import { pipeline } from 'stream/promises';

async function download() {
  const res = await fetch('https://www.w3schools.com/html/mov_bbb.mp4');
  await pipeline(res.body, fs.createWriteStream('test.mp4'));
}
download();
