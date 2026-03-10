/**
 * Converts Bulgarian text to URL-friendly slug
 * Handles Cyrillic to Latin transliteration and URL-safe formatting
 */
export function slugify(text) {
  if (!text) return '';
  
  // Bulgarian Cyrillic to Latin transliteration map
  const transliterationMap = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
    'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f',
    'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sht', 'ъ': 'a', 'ь': 'y',
    'ю': 'yu', 'я': 'ya',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ж': 'Zh',
    'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N',
    'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F',
    'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sht', 'Ъ': 'A', 'Ь': 'Y',
    'Ю': 'Yu', 'Я': 'Ya'
  };

  // Convert to lowercase and transliterate
  let slug = text
    .toLowerCase()
    .split('')
    .map(char => transliterationMap[char] || char)
    .join('');

  // Replace spaces and multiple dashes with single dash
  slug = slug
    .replace(/\s+/g, '-')           // Replace spaces with dash
    .replace(/[^\w\-]+/g, '')       // Remove special characters except word chars and dashes
    .replace(/\-\-+/g, '-')         // Replace multiple dashes with single dash
    .replace(/^-+/, '')             // Remove leading dashes
    .replace(/-+$/, '');            // Remove trailing dashes

  return slug;
}

/**
 * Generates a unique slug by appending a number if the slug already exists
 * @param {string} text - The text to slugify
 * @param {Function} checkExists - Async function that checks if slug exists: (slug) => Promise<boolean>
 * @returns {Promise<string>} - Unique slug
 */
export async function generateUniqueSlug(text, checkExists) {
  let baseSlug = slugify(text);
  if (!baseSlug) {
    baseSlug = 'item';
  }
  
  let slug = baseSlug;
  let counter = 1;
  
  while (await checkExists(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}

