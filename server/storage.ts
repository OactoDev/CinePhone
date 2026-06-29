import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { isS3Configured, makeS3, type AwsEnv } from './awsClients.ts'

/** Stream a model object from S3 (for the client's loaders). Key-scoped to models/. */
export async function getModelObject(
  env: AwsEnv,
  key: string,
): Promise<{ body: Buffer; contentType: string }> {
  if (!isS3Configured(env)) throw new Error('S3 not configured')
  if (!key.startsWith('models/')) throw new Error('forbidden key')
  const s3 = makeS3(env)
  const out = await s3.send(new GetObjectCommand({ Bucket: env.s3Bucket, Key: key }))
  const bytes = await out.Body!.transformToByteArray()
  return { body: Buffer.from(bytes), contentType: out.ContentType ?? 'model/gltf-binary' }
}

/**
 * S3-backed image host for Luma keyframes (replaces Cloudinary). The client
 * POSTs a data URL; we upload to a (private) bucket and return a presigned GET
 * URL that Luma can fetch for an hour — so the bucket need not be public.
 */

const PRESIGN_TTL = 60 * 60 // seconds

interface UploadBody {
  dataUrl: string
  key: string
}

function decodeDataUrl(dataUrl: string): { buffer: Buffer; contentType: string } {
  const [head, b64] = dataUrl.split(',')
  const contentType = /:(.*?);/.exec(head)?.[1] ?? 'image/jpeg'
  return { buffer: Buffer.from(b64, 'base64'), contentType }
}

/** POST /api/storage/upload → { url } */
export async function handleUpload(env: AwsEnv, raw: string): Promise<{ url: string }> {
  if (!isS3Configured(env)) throw new Error('S3 is not configured (set AWS_REGION + S3_BUCKET)')
  const { dataUrl, key } = JSON.parse(raw) as UploadBody
  if (!dataUrl || !key) throw new Error('missing dataUrl/key')

  const { buffer, contentType } = decodeDataUrl(dataUrl)
  const s3 = makeS3(env)
  const objectKey = `keyframes/${key}`

  await s3.send(
    new PutObjectCommand({
      Bucket: env.s3Bucket,
      Key: objectKey,
      Body: buffer,
      ContentType: contentType,
    }),
  )

  // Public bucket → direct URL; otherwise a time-limited presigned GET URL.
  const url = env.s3PublicBase
    ? `${env.s3PublicBase.replace(/\/$/, '')}/${objectKey}`
    : await getSignedUrl(s3, new GetObjectCommand({ Bucket: env.s3Bucket, Key: objectKey }), {
        expiresIn: PRESIGN_TTL,
      })

  return { url }
}
