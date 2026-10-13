import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { translations } from '../translations';
import { Camera, CheckCircle, Upload, X } from 'lucide-react';
import { ref, push, set } from 'firebase/database';
import { db } from '../firebase';
import { Application } from '../types';

export const JoinForm: React.FC = () => {
  const { lang, agencyId, logo, applicationQuestions } = useAppContext();
  const t = translations[lang];

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    insta: '',
    email: '',
    height: '',
    weight: '',
    shoe: '',
    params: '',
    imgs: [] as string[],
    answers: {} as Record<string, string>
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingImages, setUploadingImages] = useState(false);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with 0.7 quality
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setUploadingImages(true);
    setUploadProgress(0);
    const files = Array.from(e.target.files);
    
    let completedCount = 0;

    const uploadPromises = files.map(async (file, i) => {
      try {
        const compressedBase64 = await compressImage(file);
        const base64Data = compressedBase64.split(',')[1];
        
        const response = await fetch('https://script.google.com/macros/s/AKfycbxSnlteUcLtexp8-YmaBHIFFk6BDG1N_XmeD2JGcalZF2rNOjy0ZFiuJUH0xVsdqJm5/exec', {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify({
            filename: `application_${Date.now()}_${i}.jpg`,
            mimeType: 'image/jpeg',
            base64: base64Data
          })
        });
        
        const textResponse = await response.text();
        const result = JSON.parse(textResponse);

        completedCount++;
        setUploadProgress(Math.round((completedCount / files.length) * 100));

        if (result.success && result.url) {
          return result.url;
        }
      } catch (error) {
        console.error("Error uploading image:", error);
        completedCount++;
        setUploadProgress(Math.round((completedCount / files.length) * 100));
      }
      return null;
    });

    const results = await Promise.all(uploadPromises);
    const uploadedUrls = results.filter((url): url is string => url !== null);

    setFormData(prev => ({ ...prev, imgs: [...prev.imgs, ...uploadedUrls] }));
    setUploadingImages(false);
    setUploadProgress(0);
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      imgs: prev.imgs.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const newAppRef = push(ref(db, `agencies/${agencyId}/applications`));
      
      const answersArray = Object.entries(formData.answers || {}).map(([q, a]) => ({ question: q, answer: a }));

      const application: Application = {
        id: newAppRef.key as string,
        ...formData,
        answers: answersArray,
        date: new Date().toISOString(),
        status: 'pending'
      };

      await set(newAppRef, application);
      setIsSuccess(true);
    } catch (error) {
      console.error("Error submitting application:", error);
      alert("Failed to submit application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <CheckCircle size={64} className="text-green-500 mb-6" />
        <h1 className="text-3xl font-bold mb-4 text-center">Application Submitted!</h1>
        <p className="text-zinc-400 text-center max-w-md mb-8">
          Thank you for applying. Our team will review your application and get back to you soon.
        </p>
        <button
          onClick={() => {
            window.history.pushState({}, '', '/');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
          className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors"
        >
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white py-12 px-4 sm:px-6 lg:px-8 relative">
      <button
        onClick={() => {
          window.history.pushState({}, '', '/');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }}
        className="absolute top-4 left-4 sm:top-8 sm:left-8 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
        title="Go Back"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <div className="max-w-2xl mx-auto bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden border border-zinc-800">
        <div className="px-8 py-10">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black tracking-tighter mb-2">{logo} CASTING</h1>
            <p className="text-zinc-400">Fill out the form below to apply</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Full Name *</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-white outline-none transition-all"
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Email *</label>
                <input
                  required
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-white outline-none transition-all"
                  placeholder="jane@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Phone *</label>
                <input
                  required
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-white outline-none transition-all"
                  placeholder="+1 234 567 890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Instagram</label>
                <input
                  type="text"
                  value={formData.insta}
                  onChange={e => setFormData({ ...formData, insta: e.target.value })}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-white outline-none transition-all"
                  placeholder="@janedoe"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Height (cm) *</label>
                <input
                  required
                  type="text"
                  value={formData.height}
                  onChange={e => setFormData({ ...formData, height: e.target.value })}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-white outline-none transition-all"
                  placeholder="175"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Weight (kg)</label>
                <input
                  type="text"
                  value={formData.weight}
                  onChange={e => setFormData({ ...formData, weight: e.target.value })}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-white outline-none transition-all"
                  placeholder="55"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Shoe Size *</label>
                <input
                  required
                  type="text"
                  value={formData.shoe}
                  onChange={e => setFormData({ ...formData, shoe: e.target.value })}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-white outline-none transition-all"
                  placeholder="39"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Params (B-W-H)</label>
                <input
                  type="text"
                  value={formData.params}
                  onChange={e => setFormData({ ...formData, params: e.target.value })}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-white outline-none transition-all"
                  placeholder="85-60-90"
                />
              </div>
            </div>

            {applicationQuestions && applicationQuestions.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <h3 className="text-lg font-bold">Additional Questions</h3>
                {applicationQuestions.map((q, idx) => (
                  <div key={idx}>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">{q}</label>
                    <textarea
                      required
                      rows={2}
                      value={formData.answers[q] || ''}
                      onChange={e => setFormData({
                        ...formData,
                        answers: { ...formData.answers, [q]: e.target.value }
                      })}
                      className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-white outline-none transition-all"
                      placeholder="Your answer..."
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-zinc-800">
              <label className="block text-sm font-medium text-zinc-400 mb-2">Photos *</label>
              <p className="text-xs text-zinc-500 mb-3">Upload your polaroids or portfolio images. They will be compressed and securely stored.</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {formData.imgs.map((url, idx) => (
                  <div key={idx} className="relative aspect-[3/4] rounded-lg overflow-hidden group">
                    <img src={url} alt={`Upload ${idx}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                
                <label className="aspect-[3/4] rounded-lg border-2 border-dashed border-zinc-700 hover:border-zinc-500 flex flex-col items-center justify-center cursor-pointer transition-colors bg-zinc-900/50">
                  <Upload size={24} className="text-zinc-500 mb-2" />
                  <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Upload</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImages}
                  />
                </label>
              </div>

              {uploadingImages && (
                <div className="w-full bg-zinc-800 rounded-full h-2 mt-2">
                  <div className="bg-white h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || uploadingImages || formData.imgs.length === 0}
              className="w-full bg-white text-black font-bold py-4 rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest mt-8"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
