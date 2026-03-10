import {S3Client, DeleteObjectCommand} from '@aws-sdk/client-s3';

const bucketName = process.env.S3_BUCKET_NAME;

function getS3Client() {
  return new S3Client({
    region: process.env.S3_REGION || 'eu-central-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  });
}

export function extractKeyFromUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    // Handle both path-style and virtual-hosted–style URLs
    // Example: https://bucket.s3.amazonaws.com/key
    // Example: https://s3.region.amazonaws.com/bucket/key
    if (u.hostname.startsWith(`${bucketName}.s3`)) {
      return u.pathname.replace(/^\//, '');
    }
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts[0] === bucketName && parts.length > 1) {
      return parts.slice(1).join('/');
    }
    return u.pathname.replace(/^\//, '');
  } catch {
    return null;
  }
}

export async function deleteS3Objects(urls) {
  const keys = (urls || [])
    .map(extractKeyFromUrl)
    .filter(Boolean);
  if (keys.length === 0) return;
  const client = getS3Client();
  for (const Key of keys) {
    try {
      await client.send(new DeleteObjectCommand({Bucket: bucketName, Key}));
    } catch (err) {
      console.error('S3 delete failed for', Key, err?.message || err);
    }
  }
}

export async function deleteS3Object(url) {
  return deleteS3Objects([url]);
}


