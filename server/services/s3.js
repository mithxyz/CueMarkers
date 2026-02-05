const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const config = require('../config');

const s3 = new S3Client({
  endpoint: config.s3.endpoint,
  region: config.s3.region,
  credentials: {
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey,
  },
  forcePathStyle: config.s3.forcePathStyle,
});

const bucket = config.s3.bucket;

async function uploadFile(key, buffer, contentType) {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return key;
}

async function getPresignedUrl(key, expiresIn = 3600) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
}

async function deleteFile(key) {
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

module.exports = { uploadFile, getPresignedUrl, deleteFile };
