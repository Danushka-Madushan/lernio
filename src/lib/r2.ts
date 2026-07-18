import { S3Client } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import https from 'node:https';

const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID || '';
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '';

// A video's <video> element can fire off dozens of small sequential Range
// requests to the streaming proxy in quick succession (see route.ts). Each
// one calls s3.send() — without a keep-alive agent, every single call pays
// a fresh TCP + TLS handshake to R2 on top of the actual transfer, which is
// often the single biggest chunk of per-request latency. Reusing sockets
// here lets that whole burst ride the same warm connection(s).
const keepAliveAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30_000,
  maxSockets: 50,
});

export const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  requestHandler: new NodeHttpHandler({
    httpsAgent: keepAliveAgent,
  }),
});

export const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || '';
export const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL || '';
