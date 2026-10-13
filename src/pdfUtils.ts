import QRCode from 'qrcode';
import { safeUrl } from './utils';

export const generateModelPDF = async (model: any, pdfLogo: string) => {
  const div = document.createElement('div');
  div.style.padding = "50px";
  div.style.background = "#fff";
  div.style.color = "#000";
  div.style.fontFamily = "sans-serif";

  const escapeHtml = (str: string) => !str ? '' : String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const showsText = escapeHtml(model.shows || 'Professional experience data.');
  const modelPhoto = safeUrl(model.imgs?.[0], 'img');
  const agencyLogo = safeUrl(pdfLogo, 'img');

  // Generate QR code for the model's profile
  const profileUrl = `${window.location.origin}/?model=${model.id}`;
  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await QRCode.toDataURL(profileUrl, {
      width: 100,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR code', err);
  }

  div.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #000; padding-bottom:30px; margin-bottom:40px;">
      <img src="${agencyLogo}" style="height:115px; object-fit:contain;">
      <div style="text-align:right">
        <h2 style="font-size:32px; text-transform:uppercase; margin:0;">${escapeHtml(model.name)}</h2>
        <p style="color:#777; font-size:12px; letter-spacing:3px; margin-bottom: 8px;">TALENT CARD</p>
        <p style="color:#444; font-size:10px; margin: 0; font-weight: bold;">AMAY Ticarət Mərkəzi, 7 mərtəbə, Baku 1122</p>
        <p style="color:#444; font-size:10px; margin: 0; font-weight: bold;">+994 51 892 86 72</p>
      </div>
    </div>
    <div style="display:flex; gap:40px; align-items:flex-start;">
      <div style="flex: 0 0 45%;">
        <img src="${modelPhoto}" style="width:100%; height:auto; max-height:500px; object-fit:contain; border-radius:10px;">
      </div>
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; min-height: 500px;">
        <div>
          <div style="margin-bottom:25px;">
            <h3 style="background:#000; color:#fff; padding:6px 12px; font-size:13px; text-transform:uppercase; border-radius:4px;">Physical Profile</h3>
            <div style="padding:10px; font-size:15px; line-height:1.8;">
              <p style="margin:0 0 5px 0;"><b>Height:</b> ${escapeHtml(model.height || '-')} cm</p>
              <p style="margin:0 0 5px 0;"><b>Weight:</b> ${escapeHtml(model.weight || '-')} kg</p>
              <p style="margin:0 0 5px 0;"><b>Shoe:</b> ${escapeHtml(model.shoe || '-')}</p>
              <p style="margin:0 0 5px 0;"><b>Meas:</b> ${escapeHtml(model.params || '-')}</p>
            </div>
          </div>
          <div style="margin-bottom:25px;">
            <h3 style="background:#000; color:#fff; padding:6px 12px; font-size:13px; text-transform:uppercase; border-radius:4px;">Contact Details</h3>
            <div style="padding:10px; font-size:14px; line-height:1.6;">
              <p style="margin:0 0 5px 0;"><b>Tel:</b> ${escapeHtml(model.phone || '-')}</p>
              <p style="margin:0 0 5px 0;"><b>Insta:</b> ${escapeHtml(model.insta || '-')}</p>
              <p style="margin:0 0 5px 0;"><b>Email:</b> ${escapeHtml(model.email || '-')}</p>
            </div>
          </div>
          <div>
            <h3 style="background:#000; color:#fff; padding:6px 12px; font-size:13px; text-transform:uppercase; border-radius:4px;">Experience</h3>
            <div style="padding:10px; font-size:13px; color:#444; line-height:1.5; white-space:pre-line;">
              ${showsText}
            </div>
          </div>
        </div>
        ${qrCodeDataUrl ? `
        <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
          <div style="text-align: center;">
            <img src="${qrCodeDataUrl}" style="width: 100px; height: 100px; border: 1px solid #ccc; padding: 5px; border-radius: 8px;">
            <p style="font-size: 8px; color: #777; margin-top: 5px; text-transform: uppercase;">Scan for profile</p>
          </div>
        </div>
        ` : ''}
      </div>
    </div>
  `;

  const opt = {
    margin: 10,
    filename: `${(model.name || 'model')}_BIG.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 3, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  // @ts-ignore
  if (window.html2pdf) {
    // @ts-ignore
    window.html2pdf().from(div).set(opt).save();
  } else {
    alert('PDF generation library not loaded.');
  }
};
