import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, BUCKET } from './client';

export async function uploadPackage(
  slug: string,
  version: string,
  buffer: Buffer,
  contentType: string = 'application/gzip'
): Promise<string> {
  const key = `${slug}/${version}.tar.gz`;
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return key;
}
