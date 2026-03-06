// S3 operations - uses the real AWS SDK client.
// For local dev, set S3_ENDPOINT to MinIO (e.g. http://localhost:9000).
// For production, leave S3_ENDPOINT unset to use real AWS S3.

export { uploadPackage } from './upload';
export { getObjectStream } from './download';
