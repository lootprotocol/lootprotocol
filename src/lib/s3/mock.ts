import { writeFile, readFile, mkdir } from 'fs/promises';
import path from 'path';
import type { S3ObjectResult } from './download';

const MOCK_DIR = '/tmp/lootprotocol-packages';

export async function uploadPackage(
  slug: string,
  version: string,
  buffer: Buffer,
): Promise<string> {
  const dir = path.join(MOCK_DIR, slug);
  await mkdir(dir, { recursive: true });
  const key = `${slug}/${version}.tar.gz`;
  await writeFile(path.join(MOCK_DIR, key), buffer);
  return key;
}

export async function getObjectStream(s3Key: string): Promise<S3ObjectResult> {
  const filePath = path.join(MOCK_DIR, s3Key);
  const buffer = await readFile(filePath);

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(buffer));
      controller.close();
    },
  });

  return {
    body: stream,
    contentLength: buffer.byteLength,
    contentType: 'application/gzip',
  };
}
