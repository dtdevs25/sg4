import { S3Client } from '@aws-sdk/client-s3'

// Lê as variáveis do ambiente
const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || 'https://storage-api.ehspro.com.br/',
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_KEY || 'c839e72308512fce27f0bbbf',
    secretAccessKey: process.env.S3_SECRET || '4e3e95b4684b63a1af4ce63cb03b5290c183a8',
  },
  forcePathStyle: true, // Necessário para serviços compatíveis com S3 (como MinIO)
})

export default s3Client
