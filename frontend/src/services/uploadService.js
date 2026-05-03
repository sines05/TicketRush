import { API_ROUTES } from '../constants/apiRoutes.js';
import { api, unwrap } from './api.js';

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

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
  form.append('file', file);

  const res = await api.post(API_ROUTES.UPLOADS, form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  const data = unwrap(res);

  const url = data?.url;
  if (!url) throw { success: false, message: 'Upload thất bại (không có url trả về)' };
  return url;
}

export default { uploadImage };
