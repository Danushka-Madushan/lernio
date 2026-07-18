import { NextResponse } from 'next/server';

// Billing data must always be fresh — never let this route be
// statically cached or served from the Next.js data cache.
export const dynamic = 'force-dynamic';

// Cloudflare's actual R2 Class A / Class B action classification
// (confirmed from the dashboard's own GraphQL query).
const CLASS_A_ACTIONS = [
  'ListBuckets',
  'PutBucket',
  'ListObjects',
  'PutObject',
  'CopyObject',
  'CompleteMultipartUpload',
  'CreateMultipartUpload',
  'UploadPart',
  'UploadPartCopy',
  'PutBucketEncryption',
  'ListMultipartUploads',
  'PutBucketCors',
  'PutBucketLifecycleConfiguration',
  'ListParts',
  'PutBucketStorageClass',
  'LifecycleStorageTierTransition',
];

const CLASS_B_ACTIONS = [
  'HeadBucket',
  'HeadObject',
  'GetObject',
  'ReportUsageSummary',
  'GetBucketEncryption',
  'GetBucketLocation',
  'GetBucketLifecycleConfiguration',
  'GetBucketCors',
];

const toDateStr = (d: Date) => d.toISOString().slice(0, 10); // "YYYY-MM-DD"

const quoteList = (items: string[]) => items.map((item) => `"${item}"`).join(', ');

export async function GET() {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    return NextResponse.json(
      {
        error:
          'Server is missing Cloudflare credentials. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in .env.local.',
      },
      { status: 500 }
    );
  }

  // Current billing cycle: 1st of this month through now.
  const now = new Date();
  const firstDayOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const start = toDateStr(firstDayOfMonth);
  const end = toDateStr(now);

  // Cloudflare's analytics schema: r2StorageAdaptiveGroups uses `max`
  // (a daily high-water mark), r2OperationsAdaptiveGroups uses `sum.requests`.
  // Filtering is on `date` (not `datetime`), as date-only strings.
  const query = `
    query {
      viewer {
        accounts(filter: { accountTag: "${accountId}" }) {
          storage: r2StorageAdaptiveGroups(
            limit: 10000
            orderBy: [date_DESC]
            filter: { date_geq: "${start}", date_leq: "${end}" }
          ) {
            max { payloadSize metadataSize }
            dimensions { date storageClass }
          }
          classAOps: r2OperationsAdaptiveGroups(
            limit: 10000
            filter: {
              date_geq: "${start}"
              date_leq: "${end}"
              actionType_in: [${quoteList(CLASS_A_ACTIONS)}]
              actionStatus_in: ["success", "userError"]
            }
          ) {
            sum { requests }
            dimensions { date storageClass }
          }
          classBOps: r2OperationsAdaptiveGroups(
            limit: 10000
            filter: {
              date_geq: "${start}"
              date_leq: "${end}"
              actionType_in: [${quoteList(CLASS_B_ACTIONS)}]
              actionStatus_in: ["success", "userError"]
            }
          ) {
            sum { requests }
            dimensions { date storageClass }
          }
        }
      }
    }
  `;

  try {
    const cfRes = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({ query }),
      cache: 'no-store',
    });

    if (!cfRes.ok) {
      return NextResponse.json(
        { error: `Cloudflare API responded with HTTP ${cfRes.status}` },
        { status: 502 }
      );
    }

    const json = await cfRes.json();

    if (json.errors?.length) {
      return NextResponse.json(
        { error: json.errors[0]?.message ?? 'Cloudflare GraphQL error' },
        { status: 502 }
      );
    }

    const accountData = json.data?.viewer?.accounts?.[0];
    if (!accountData) {
      return NextResponse.json(
        { error: 'No R2 data found for this account.' },
        { status: 404 }
      );
    }

    // Storage rows are ordered date_DESC, so the first row we see for a
    // given storageClass is that class's most recent (current) size.
    // Sum the latest snapshot across storage classes (Standard, IA, etc).
    const latestPayloadByClass = new Map<string, number>();
    for (const row of accountData.storage ?? []) {
      const cls = row?.dimensions?.storageClass ?? 'unknown';
      if (!latestPayloadByClass.has(cls)) {
        latestPayloadByClass.set(cls, row?.max?.payloadSize ?? 0);
      }
    }
    const payloadSizeBytes = [...latestPayloadByClass.values()].reduce((a, b) => a + b, 0);
    const storageGB = payloadSizeBytes / (1024 * 1024 * 1024);

    const sumRequests = (rows: any[]) =>
      (rows ?? []).reduce((total, row) => total + (row?.sum?.requests ?? 0), 0);

    const classAOps = sumRequests(accountData.classAOps);
    const classBOps = sumRequests(accountData.classBOps);

    return NextResponse.json({ storageGB, classAOps, classBOps });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown error contacting Cloudflare.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
