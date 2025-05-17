import { Request, Response, NextFunction } from 'express';
import { Signature } from '../signature';

const data = {
  "nonce": "a3fB9zLpQ2RgT8yX",
  "payload": {
    "user_id": "USER_6192_XYZ",
  }
}

export const signatureMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 如果是 Get / 则不进行签名验证
  if (req.method === 'GET' && req.path === '/') {
    next();
    return;
  }
  const signature = req.headers['x-signature'] as string;
  if (!signature) {
    return res.status(401).json({ error: 'Signature is required' });
  }
  // @ts-ignore
  const isValid = Signature.verifySignature(JSON.stringify(data), process.env.SECRET, signature);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
};