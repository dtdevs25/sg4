import { S3Client } from '@aws-sdk/client-s3'

// Lê e sanitiza as variáveis do ambiente (suporta CapRover e múltiplos provedores S3/MinIO)
const rawEndpoint =
  process.env.S3_ENDPOINT ||
  process.env.AWS_ENDPOINT_URL ||
  process.env.AWS_S3_ENDPOINT ||
  'https://storage-api.ehspro.com.br'

const endpoint = rawEndpoint.trim().replace(/\/+$/, '')

const accessKeyId = (
  process.env.S3_KEY ||
  process.env.S3_ACCESS_KEY ||
  process.env.AWS_ACCESS_KEY_ID ||
  'c839e72308512fce27f0bbbf'
).trim()

const secretAccessKey = (
  process.env.S3_SECRET ||
  process.env.S3_SECRET_KEY ||
  process.env.AWS_SECRET_ACCESS_KEY ||
  '4e3e95b4684b63a1af4ce63cb03b5290c183a8'
).trim()

const region = (
  process.env.S3_REGION ||
  process.env.AWS_REGION ||
  'us-east-1'
).trim()

const s3Client = new S3Client({
  endpoint,
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  forcePathStyle: true, // Necessário para serviços compatíveis com S3 (como MinIO)
})

export default s3Client

