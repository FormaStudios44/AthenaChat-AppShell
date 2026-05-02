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
  const size = `${width}x${height}`;

  const images = [
    `https://source.unsplash.com/${size}/?${keywords}&sig=1`,
    `https://source.unsplash.com/${size}/?${keywords}&sig=2`,
    `https://source.unsplash.com/${size}/?${keywords}&sig=3`,
    `https://source.unsplash.com/${size}/?${keywords}&sig=4`,
  ];

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
