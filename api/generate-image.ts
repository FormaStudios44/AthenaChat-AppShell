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
  num_outputs?: number;
}

function normalizeReplicateOutput(output: unknown): string[] {
  if (output == null) return [];
  if (Array.isArray(output)) return output.map(o => String(o));
  return [String(output)];
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

  const { prompt, num_outputs } = body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const rawNum = typeof num_outputs === 'number' && Number.isFinite(num_outputs) ? num_outputs : 4;
  const nOut = Math.min(4, Math.max(1, Math.floor(rawNum)));

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Replicate token not configured' });
  }

  try {
    const createRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'wait',
      },
      body: JSON.stringify({
        input: {
          prompt,
          num_outputs: nOut,
          aspect_ratio: '2:1',
          output_format: 'webp',
          output_quality: 80,
          go_fast: true,
        },
      }),
    });

    const prediction = (await createRes.json()) as {
      id?: string;
      status?: string;
      output?: unknown;
      error?: string | { message?: string };
    };

    const errMsg =
      typeof prediction.error === 'string'
        ? prediction.error
        : prediction.error?.message;
    if (errMsg) {
      return res.status(500).json({ error: errMsg });
    }

    if (prediction.status !== 'succeeded' && prediction.id) {
      let result = prediction;
      let attempts = 0;
      while (
        result.status !== 'succeeded'
        && result.status !== 'failed'
        && result.status !== 'canceled'
        && attempts < 30
      ) {
        await new Promise(r => setTimeout(r, 1000));
        const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        result = (await pollRes.json()) as typeof prediction;
        attempts++;
      }

      if (result.status === 'failed' || result.status === 'canceled') {
        return res.status(500).json({ error: 'Image generation failed' });
      }

      return res.status(200).json({ images: normalizeReplicateOutput(result.output) });
    }

    return res.status(200).json({ images: normalizeReplicateOutput(prediction.output) });
  } catch (err) {
    console.error('Replicate error:', err);
    return res.status(500).json({ error: 'Failed to generate images' });
  }
}
