import crypto from 'crypto';

export class Signature {
  private static readonly ALGORITHM = 'sha256';
  private static readonly ENCODING = 'hex';
  private static readonly SECRET_LENGTH = 32;

  private static translations = {
    en: {
      matchedTool: 'Matched tool',
      inMCP: 'in MCP server',
      result: 'result:'
    },
    zh: {
      matchedTool: '匹配工具',
      inMCP: '在MCP服务器',
      result: '结果:'
    }
  };

  public static translate(lang: string, key: string): string {
    return this.translations[lang]?.[key] || this.translations.en[key];
  };

  public static generateSecret(): string {
    return crypto.randomBytes(Signature.SECRET_LENGTH).toString('hex');
  }

  public static generateSignature(data: string, secret: string): string {
    return crypto
      .createHmac(Signature.ALGORITHM, secret)
      .update(data)
      .digest(Signature.ENCODING);
  }

  public static verifySignature(
    data: string,
    secret: string,
    signature: string
  ): boolean {
    const generatedSignature = Signature.generateSignature(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(generatedSignature),
      Buffer.from(signature)
    );
  }
}