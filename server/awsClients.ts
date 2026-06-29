import { RDSDataClient } from '@aws-sdk/client-rds-data'
import { S3Client } from '@aws-sdk/client-s3'

/**
 * Server-side AWS clients + config, built from environment variables. These run
 * only inside the Vite dev middleware (Node) so AWS credentials never reach the
 * browser. In production, ship the same handlers on a real backend.
 */

export interface AwsEnv {
  region: string
  s3Bucket: string
  /** Optional public base URL if the bucket serves public objects directly. */
  s3PublicBase: string
  auroraResourceArn: string
  auroraSecretArn: string
  auroraDatabase: string
  accessKeyId: string
  secretAccessKey: string
  sessionToken: string
}

export function readAwsEnv(env: Record<string, string>): AwsEnv {
  return {
    region: env.AWS_REGION ?? 'us-east-1',
    s3Bucket: env.S3_BUCKET ?? '',
    s3PublicBase: env.S3_PUBLIC_BASE_URL ?? '',
    auroraResourceArn: env.AURORA_RESOURCE_ARN ?? '',
    auroraSecretArn: env.AURORA_SECRET_ARN ?? '',
    auroraDatabase: env.AURORA_DATABASE ?? '',
    accessKeyId: env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY ?? '',
    sessionToken: env.AWS_SESSION_TOKEN ?? '',
  }
}

/**
 * Vite's loadEnv returns vars without populating process.env, so the SDK's
 * default credential chain can't see them — pass them explicitly when present
 * (falls back to the default chain otherwise: SSO, instance role, …).
 */
function credentials(e: AwsEnv) {
  if (!e.accessKeyId || !e.secretAccessKey) return undefined
  return {
    accessKeyId: e.accessKeyId,
    secretAccessKey: e.secretAccessKey,
    ...(e.sessionToken ? { sessionToken: e.sessionToken } : {}),
  }
}

export const isS3Configured = (e: AwsEnv) => Boolean(e.region && e.s3Bucket)
export const isAuroraConfigured = (e: AwsEnv) =>
  Boolean(e.region && e.auroraResourceArn && e.auroraSecretArn && e.auroraDatabase)

/**
 * Credentials come from the standard AWS provider chain (AWS_ACCESS_KEY_ID /
 * AWS_SECRET_ACCESS_KEY in .env, SSO, instance role, …) — we only pass region.
 */
export function makeS3(e: AwsEnv): S3Client {
  return new S3Client({ region: e.region, credentials: credentials(e) })
}

export function makeRds(e: AwsEnv): RDSDataClient {
  return new RDSDataClient({ region: e.region, credentials: credentials(e) })
}
