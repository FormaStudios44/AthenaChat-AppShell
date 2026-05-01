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

  const { prompt } = body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Replicate token not configured' });
  }

  try {
    // Generate 4 images in parallel using individual requests
    const generateOne = async (seed: number) => {
      const response = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Prefer: 'wait=60',
        },
        body: JSON.stringify({
          input: {
            prompt,
            seed,
            go_fast: true,
            megapixels: '1',
            num_outputs: 1,
            aspect_ratio: '16:9',
            output_format: 'webp',
            output_quality: 80,
            num_inference_steps: 4,
          },
        }),
      });

      const prediction = await response.json();
      console.log('[REPLICATE] prediction:', JSON.stringify(prediction));

      if (prediction.error) {
        console.error('[REPLICATE] error:', prediction.error);
        return null;
      }

      // Poll if not complete
      let result = prediction;
      let attempts = 0;
      while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < 60) {
        await new Promise(r => setTimeout(r, 1000));
        const poll = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        result = await poll.json();
        attempts++;
      }

      console.log('[REPLICATE] final status:', result.status, 'output:', result.output);

      if (result.status === 'succeeded' && result.output) {
        return Array.isArray(result.output) ? result.output[0] : result.output;
      }
      return null;
    };

    // Generate 4 variations with different seeds in parallel
    const seeds = [42, 123, 456, 789];
    const results = await Promise.all(seeds.map(seed => generateOne(seed)));
    const images = results.filter(Boolean);

    console.log('[REPLICATE] final images count:', images.length);

    if (images.length === 0) {
      return res.status(500).json({ error: 'No images generated' });
    }

    return res.status(200).json({ images });
  } catch (err) {
    console.error('[REPLICATE] caught error:', err);
    return res.status(500).json({ error: 'Failed to generate images' });
  }
}
