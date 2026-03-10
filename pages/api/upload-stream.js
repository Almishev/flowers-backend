import multiparty from 'multiparty';
import {PutObjectCommand, S3Client} from '@aws-sdk/client-s3';
import fs from 'fs';
import mime from 'mime-types';
import {mongooseConnect} from "@/lib/mongoose";
import {isAdminRequest} from "@/pages/api/auth/[...nextauth]";

const bucketName = process.env.S3_BUCKET_NAME;

export default async function handle(req, res) {
  await mongooseConnect();
  await isAdminRequest(req, res);

  if (req.method !== 'POST') {
    return res.status(405).json({message: 'Method not allowed'});
  }

  try {
    // Използваме multiparty за обработка на големи файлове (като в стария проект)
    const form = new multiparty.Form();
    
    const {fields, files} = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('Multiparty parse error:', err);
          reject(err);
          return;
        }
        resolve({fields, files});
      });
    });

    if (!files.file || files.file.length === 0) {
      return res.status(400).json({message: 'Няма файл за качване'});
    }

    const client = new S3Client({
      region: process.env.S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      },
    });

    const links = [];
    
    for (const file of files.file) {
      const ext = file.originalFilename.split('.').pop();
      // За видео файлове ги слагаме в videos/ папка
      const newFilename = `videos/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      
      // Забележка: ACL не се използва, защото bucket-ът е с "Bucket owner enforced"
      // Публичният достъп се управлява чрез Bucket Policy в AWS конзолата
      await client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: newFilename,
        Body: fs.readFileSync(file.path),
        ContentType: mime.lookup(file.path) || 'video/mp4',
      }));
      
      const link = `https://${bucketName}.s3.amazonaws.com/${newFilename}`;
      links.push(link);
    }

    res.json({
      links: links,
      link: links[0], // За обратна съвместимост
    });
  } catch (error) {
    console.error('Error in stream upload:', error);
    res.status(500).json({
      message: 'Грешка при качване на файла',
      error: error.message,
    });
  }
}

export const config = {
  api: {
    bodyParser: false, // Изключваме bodyParser за multiparty
  },
};

