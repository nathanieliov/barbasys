const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) {
  throw new Error('JWT_SECRET env var must be set and at least 32 characters long');
}

export const JWT_SECRET: string = secret;
