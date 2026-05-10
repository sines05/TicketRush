export const CATEGORY_ALL = 'all';
export const CATEGORY_ALL_LABEL = 'Tất cả';

export const CATEGORY_OPTIONS = [
  { key: 'music_festival', label: 'Nhạc sống', aliases: ['Âm nhạc & Lễ hội', 'Âm nhạc và Lễ hội'] },
  { key: 'arts_stage', label: 'Sân khấu & Nghệ thuật', aliases: ['Sân khấu và Nghệ thuật'] },
  { key: 'sports', label: 'Thể Thao', aliases: ['Thể thao'] },
  { key: 'education_workshop', label: 'Hội thảo & Workshop', aliases: ['Hội thảo & Giáo dục', 'Hội thảo và Giáo dục'] },
  { key: 'experience_entertainment', label: 'Tham quan & Trải nghiệm', aliases: ['Giải trí & Trải nghiệm', 'Giải trí và Trải nghiệm'] },
  { key: 'other', label: 'Khác', aliases: ['Cộng đồng & Khác', 'Cộng đồng và Khác', 'community_other'] }
];

export const CATEGORIES = CATEGORY_OPTIONS.map((item) => item.label);

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/&/g, ' va ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase();
}

export function getCategoryKey(value) {
  const normalized = normalizeText(value);
  if (!normalized) return '';

  if (normalized === normalizeText(CATEGORY_ALL_LABEL) || normalized === normalizeText(CATEGORY_ALL)) {
    return CATEGORY_ALL;
  }

  const found = CATEGORY_OPTIONS.find((item) => {
    if (normalizeText(item.key) === normalized) return true;
    if (normalizeText(item.label) === normalized) return true;
    return item.aliases.some((alias) => normalizeText(alias) === normalized);
  });

  return found?.key || normalized;
}

export function getCategoryLabel(value) {
  const key = getCategoryKey(value);
  if (key === CATEGORY_ALL) return CATEGORY_ALL_LABEL;

  const found = CATEGORY_OPTIONS.find((item) => item.key === key || normalizeText(item.label) === normalizeText(value));
  return found?.label || String(value || '').trim();
}

export default { CATEGORIES, CATEGORY_ALL, CATEGORY_ALL_LABEL, CATEGORY_OPTIONS, getCategoryKey, getCategoryLabel };
