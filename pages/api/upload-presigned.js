import {S3Client, PutObjectCommand} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
import {mongooseConnect} from "@/lib/mongoose";
import {isAdminRequest} from "@/pages/api/auth/[...nextauth]";

const bucketName = process.env.S3_BUCKET_NAME;

export default async function handle(req, res) {
  await mongooseConnect();
  await isAdminRequest(req, res);

  if (req.method !== 'POST') {
    return res.status(405).json({message: 'Method not allowed'});
  }

  const {fileName, fileType} = req.body;

  if (!fileName || !fileType) {
    return res.status(400).json({message: 'fileName и fileType са задължителни'});
  }

  try {
    const client = new S3Client({
      region: process.env.S3_REGION || 'us-east-1', // Същият region като в upload.js
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      },
    });

    // Генерираме уникално име на файла
    const ext = fileName.split('.').pop();
    const newFilename = `videos/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    // Създаваме команда за качване с CORS headers
    // Забележка: ACL не се използва, защото bucket-ът е с "Bucket owner enforced"
    // Публичният достъп се управлява чрез Bucket Policy в AWS конзолата
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: newFilename,
      ContentType: fileType,
      // Добавяме CORS headers за по-добра съвместимост
      Metadata: {
        'original-filename': fileName,
      },
    });

    // Генерираме presigned URL (валиден за 1 час)
    const presignedUrl = await getSignedUrl(client, command, {expiresIn: 3600});

    // Връщаме presigned URL и името на файла
    res.json({
      presignedUrl,
      fileUrl: `https://${bucketName}.s3.amazonaws.com/${newFilename}`,
      key: newFilename,
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    res.status(500).json({message: 'Грешка при генериране на presigned URL', error: error.message});
  }
}

