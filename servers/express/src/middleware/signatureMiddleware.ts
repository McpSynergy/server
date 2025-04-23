import { Request, Response, NextFunction } from 'express';
import { Signature } from '../signature';

const data = 'Hello World!';
const secret = 'my_secret_key';

export const signatureMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const signature = req.headers['x-signature'] as string;
  if (!signature) {
    return res.status(401).json({ error: 'Signature is required' });
  }

  const isValid = Signature.verifySignature(data, secret, signature);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
};