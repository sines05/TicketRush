import axios from 'axios';


const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';
const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY || '840694281017313c81a34e9239810201';

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không đọc được file'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });
}

async function uploadImage(file) {
  if (!file) throw { success: false, message: 'Chưa chọn file ảnh' };

  if (USE_MOCK) {
    // Keep mock storage lightweight.
    const maxBytes = 1024 * 1024; // 1MB
    if (file.size > maxBytes) {
      throw { success: false, message: 'Mock mode: ảnh quá lớn (tối đa 1MB)' };
    }
    return await fileToDataUrl(file);
  }

  const form = new FormData();
  form.append('key', IMGBB_API_KEY);
  form.append('image', file);

  try {
    const res = await axios.post('https://api.imgbb.com/1/upload', form);
    const url = res.data?.data?.url;
    if (!url) throw new Error('Upload thất bại (không có url trả về)');
    return url;
  } catch (error) {
    console.error('ImgBB upload error:', error);
    throw {
      success: false,
      message: error.response?.data?.error?.message || error.message || 'Lỗi khi upload ảnh lên ImgBB'
    };
  }
}

export default { uploadImage };
