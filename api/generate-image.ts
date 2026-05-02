interface VercelRequest {
  method?: string;
  body?: GenerateImageBody | string;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (body: Record<string, unknown>) => void;
}

interface GenerateImageBody {
  prompt?: string;
  width?: number;
  height?: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body: GenerateImageBody = {};
  try {
    if (typeof req.body === 'string') body = JSON.parse(req.body || '{}');
    else if (req.body && typeof req.body === 'object') body = req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { prompt = '', width = 1200, height = 600 } = body;
  const keywords = extractKeywords(prompt);
  const photoIds = getUnsplashPhotoIds(keywords);

  const images = photoIds.map((photoId, i) => (
    `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${width}&h=${height}&q=80&sig=${i + 1}`
  ));

  return res.status(200).json({ images });
}

function extractKeywords(prompt: string): string {
  // Map common marketing/email prompt terms to good Unsplash search terms
  const lower = prompt.toLowerCase();

  if (lower.includes('win-back') || lower.includes('re-engagement') || lower.includes('lapsed')) {
    return 'email,marketing,reconnect';
  }
  if (lower.includes('welcome') || lower.includes('onboard')) {
    return 'welcome,bright,modern';
  }
  if (lower.includes('sale') || lower.includes('offer') || lower.includes('discount')) {
    return 'sale,shopping,retail';
  }
  if (lower.includes('product') || lower.includes('launch')) {
    return 'product,launch,technology';
  }
  if (lower.includes('holiday') || lower.includes('seasonal')) {
    return 'holiday,celebration,festive';
  }
  if (lower.includes('banner') || lower.includes('email')) {
    return 'marketing,business,professional';
  }

  // Default — extract first meaningful words from prompt
  const words = prompt
    .replace(/[^a-zA-Z\s]/g, '')
    .split(' ')
    .filter(w => w.length > 4)
    .slice(0, 3)
    .join(',');
  return words || 'marketing,business';
}

function getUnsplashPhotoIds(keywords: string): string[] {
  if (keywords.includes('reconnect')) {
    return [
      'photo-1497366811353-6870744d04b2',
      'photo-1517245386807-bb43f82c33c4',
      'photo-1556761175-b413da4baf72',
      'photo-1551434678-e076c223a692',
    ];
  }

  if (keywords.includes('shopping') || keywords.includes('retail')) {
    return [
      'photo-1441986300917-64674bd600d8',
      'photo-1481437156560-3205f6a55735',
      'photo-1472851294608-062f824d29cc',
      'photo-1607083206968-13611e3d76db',
    ];
  }

  if (keywords.includes('technology') || keywords.includes('launch')) {
    return [
      'photo-1498050108023-c5249f4df085',
      'photo-1519389950473-47ba0277781c',
      'photo-1516321318423-f06f85e504b3',
      'photo-1551288049-bebda4e38f71',
    ];
  }

  if (keywords.includes('holiday') || keywords.includes('festive')) {
    return [
      'photo-1512389142860-9c449e58a543',
      'photo-1512909006721-3d6018887383',
      'photo-1513151233558-d860c5398176',
      'photo-1543589077-47d81606c1bf',
    ];
  }

  return [
    'photo-1497366754035-f200968a6e72',
    'photo-1486406146926-c627a92ad1ab',
    'photo-1497366216548-37526070297c',
    'photo-1556761175-5973dc0f32e7',
  ];
}
