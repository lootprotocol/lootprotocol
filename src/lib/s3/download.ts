import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, BUCKET } from './client';

export interface S3ObjectResult {
  body: ReadableStream;
  contentLength: number | undefined;
  contentType: string | undefined;
}

export async function getObjectStream(s3Key: string): Promise<S3ObjectResult> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
  });

  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new Error('S3 returned empty body');
  }

  const webStream = response.Body.transformToWebStream();

  return {
    body: webStream,
    contentLength: response.ContentLength,
    contentType: response.ContentType,
  };
}
