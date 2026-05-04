const SPANISH_STOPS = new Set([
  'el', 'la', 'de', 'que', 'es', 'y', 'a', 'en', 'un', 'ser', 'se',
  'no', 'haber', 'por', 'con', 'su', 'para', 'estar', 'tener', 'le',
  'lo', 'como', 'más', 'o', 'poder', 'saber', 'me', 'mi', 'si', 'te',
  'ti', 'tu', 'yo', 'él', 'nosotros', 'vosotros', 'ellos', 'eso',
  'este', 'ese', 'aquel', 'los', 'del', 'al', 'buenos', 'días', 'hola',
]);

const ENGLISH_STOPS = new Set([
  'the', 'and', 'is', 'that', 'it', 'for', 'to', 'of', 'a', 'in', 'on',
  'be', 'with', 'have', 'this', 'by', 'from', 'as', 'are', 'or', 'an',
  'was', 'been', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'can', 'hello', 'how',
  'today', 'you', 'me', 'i', 'we',
]);

export function detectLanguage(body: string, previous: 'es' | 'en'): 'es' | 'en' {
  const lower = body.toLowerCase();
  const words = lower.split(/\s+/);

  let spanishCount = 0;
  let englishCount = 0;

  for (const word of words) {
    const clean = word.replace(/[.,!?;:¿¡]/g, '');
    if (SPANISH_STOPS.has(clean)) spanishCount++;
    if (ENGLISH_STOPS.has(clean)) englishCount++;
  }

  if (spanishCount > englishCount && spanishCount > 0) return 'es';
  if (englishCount > spanishCount && englishCount > 0) return 'en';

  return previous;
}
