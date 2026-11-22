import fs from 'fs';
import { pipeline } from 'stream/promises';

async function download() {
  try {
    const res = await fetch('https://www.w3schools.com/html/mov_bbb.mp4');
    if (res.body) {
      await pipeline(res.body, fs.createWriteStream('test.mp4'));
      console.log('Download completed.');
    }
  } catch (err) {
    console.error('Download error:', err);
  }
}

download();
