/**
 * Vietnam Administrative Divisions Helper
 *
 * Data source: vietnam-provinces package (PyPI)
 * Structure: 34 tỉnh/thành phố (sau sáp nhập 2025) + phường/xã trực thuộc.
 *
 * Usage:
 *   import { getProvinces, getWardsByProvinceCode, findProvinceByName } from './vietnamLocations';
 */
import provinces from './vietnamProvinces.json';

/** @returns {Array<{code: number, name: string}>} Danh sách 34 tỉnh/thành */
export function getProvinces() {
  return provinces.map(({ code, name }) => ({ code, name }));
}

/**
 * Lấy danh sách phường/xã theo mã tỉnh.
 * @param {number} provinceCode
 * @returns {Array<{code: number, name: string}>}
 */
export function getWardsByProvinceCode(provinceCode) {
  const province = provinces.find((p) => p.code === provinceCode);
  return province?.wards ?? [];
}

/**
 * Tìm tỉnh theo tên (khớp đầy đủ hoặc không dấu).
 * @param {string} name
 * @returns {{ code: number, name: string } | undefined}
 */
export function findProvinceByName(name) {
  if (!name) return undefined;
  const normalizedTarget = name.trim().toLowerCase();
  return provinces.find(
    (p) =>
      p.name.toLowerCase() === normalizedTarget ||
      // Strip common prefixes for loose match
      p.name.toLowerCase().replace(/^(thành phố |tỉnh )/, '') === normalizedTarget
  );
}

export default provinces;
