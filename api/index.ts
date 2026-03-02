import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader("Cache-Control", "no-store");

  res.status(200).json({
    message: "API funcionando",
    time: new Date().toISOString()
  });
}
