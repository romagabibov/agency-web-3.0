import fs from 'fs';

async function test() {
  try {
    const formData = new FormData();
    const buffer = fs.readFileSync('test.mp4');
    formData.append('video', new Blob([buffer], { type: 'video/mp4' }), 'test.mp4');
    
    console.log('Sending request...');
    const response = await fetch('http://localhost:3000/api/upload-media-video', {
      method: 'POST',
      body: formData
    });
    
    console.log('Status:', response.status);
    console.log('Headers:', response.headers);
    const text = await response.text();
    console.log('Response body:', text);
  } catch (err) {
    console.error(err);
  }
}
test();
