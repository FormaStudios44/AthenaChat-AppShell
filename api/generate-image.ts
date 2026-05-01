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
  console.log('[DEBUG] Function called');
  console.log('[DEBUG] Method:', req.method);
  console.log('[DEBUG] Token exists:', !!process.env.REPLICATE_API_TOKEN);
  console.log('[DEBUG] Token length:', process.env.REPLICATE_API_TOKEN?.length ?? 0);
  console.log('[DEBUG] NODE_ENV:', process.env.NODE_ENV);

  // Return debug info immediately to see what's happening
  return res.status(200).json({
    debug: true,
    tokenExists: !!process.env.REPLICATE_API_TOKEN,
    tokenLength: process.env.REPLICATE_API_TOKEN?.length ?? 0,
    method: req.method,
  });
}
