import multiparty from 'multiparty';
import {PutObjectCommand, S3Client} from '@aws-sdk/client-s3';
import fs from 'fs';
import mime from 'mime-types';
import {mongooseConnect} from "@/lib/mongoose";
import {isAdminRequest} from "@/pages/api/auth/[...nextauth]";
const bucketName = process.env.S3_BUCKET_NAME;

// Динамичен import на Sharp - зарежда се само когато е нужен
let sharp = null;
async function getSharp() {
  if (!sharp) {
    try {
      sharp = (await import('sharp')).default;
    } catch (error) {
      console.error('Failed to load Sharp:', error);
      return null;
    }
  }
  return sharp;
}

export default async function handle(req,res) {
  // Проверка за HTTP метода
  if (req.method !== 'POST') {
    return res.status(405).json({message: 'Method not allowed'});
  }

  try {
    await mongooseConnect();
    await isAdminRequest(req,res);

    // Конфигурираме multiparty
    // Забележка: Vercel ограничава request body до 4.5MB
    const form = new multiparty.Form({
      maxFilesSize: 4 * 1024 * 1024, // 4MB (под Vercel лимита)
      maxFieldsSize: 1 * 1024 * 1024, // 1MB
    });
    
    const {fields,files} = await new Promise((resolve,reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('Multiparty parse error:', err);
          if (err.message && err.message.includes('maxFilesSize')) {
            return res.status(413).json({message: 'Файлът е твърде голям. Максималният размер е 4MB.'});
          }
          return res.status(400).json({message: 'Грешка при обработка на файла', error: err.message});
        }
        resolve({fields,files});
      });
    });

    // Проверка дали има файлове
    if (!files || !files.file || files.file.length === 0) {
      return res.status(400).json({message: 'Няма файлове за качване'});
    }

    // Използваме console.error за по-видими логове в Vercel Runtime Logs
    console.error(`[UPLOAD] 🚀 Започва обработка на ${files.file.length} файл(а)`);
  const client = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  });
    const links = [];
    const errors = [];
    
    for (let i = 0; i < files.file.length; i++) {
      const file = files.file[i];
      
      try {
        // Проверка за валиден файл
        if (!file || !file.path || !file.originalFilename) {
          errors.push(`Файл ${i + 1}: Невалиден файл`);
          continue;
        }

        const ext = file.originalFilename.split('.').pop()?.toLowerCase() || '';
        if (!ext) {
          errors.push(`Файл ${i + 1}: Липсва разширение на файла`);
          continue;
        }

        console.log(`[UPLOAD] Файл ${i + 1}: ${file.originalFilename} (${ext})`);
        const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
        
        let optimizedBuffer;
        let contentType;
        let finalExt = ext;
        
        if (isImage) {
          try {
            // Проверка дали файлът съществува
            if (!fs.existsSync(file.path)) {
              errors.push(`Файл ${i + 1}: Файлът не съществува на диска`);
              continue;
            }

            // Четем оригиналния файл за да видим размера преди оптимизация
            const originalFileBuffer = fs.readFileSync(file.path);
            const originalSize = originalFileBuffer.length;
            const originalSizeMB = (originalSize / (1024 * 1024)).toFixed(2);
            // Използваме console.error за по-видими логове в Vercel
            console.error(`[UPLOAD] 📤 Файл ${i + 1}: ${file.originalFilename} | Оригинален размер: ${originalSizeMB} MB`);

            // Опитваме се да заредим Sharp
            const sharpInstance = await getSharp();
            if (!sharpInstance) {
              // Ако Sharp не може да се зареди, използваме оригиналния файл
              throw new Error('Sharp не е наличен');
            }

            // Компресираме изображението с Sharp
            const image = sharpInstance(file.path);
            const metadata = await image.metadata();
            
            // Проверка за валидни метаданни
            if (!metadata || !metadata.width || !metadata.height) {
              throw new Error('Невалидни метаданни на изображението');
            }
            
            // Определяме максимални размери (1920px за ширина или височина)
            const maxDimension = 1920;
            let width = metadata.width;
            let height = metadata.height;
            
            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                width = maxDimension;
                height = Math.round((metadata.height / metadata.width) * maxDimension);
              } else {
                height = maxDimension;
                width = Math.round((metadata.width / metadata.height) * maxDimension);
              }
            }
            
            // Конвертираме в WebP за по-добра компресия (освен ако е GIF)
            if (ext !== 'gif') {
              optimizedBuffer = await image
                .resize(width, height, {
                  fit: 'inside',
                  withoutEnlargement: true,
                })
                .webp({ quality: 80 })
                .toBuffer();
              contentType = 'image/webp';
              finalExt = 'webp';
            } else {
              // За GIF запазваме оригиналния формат, но все пак компресираме
              optimizedBuffer = await image
                .resize(width, height, {
                  fit: 'inside',
                  withoutEnlargement: true,
                })
                .gif()
                .toBuffer();
              contentType = 'image/gif';
            }
            
            // Логваме размера след оптимизация
            const optimizedSize = optimizedBuffer.length;
            const optimizedSizeMB = (optimizedSize / (1024 * 1024)).toFixed(2);
            const compressionRatio = ((1 - optimizedSize / originalSize) * 100).toFixed(1);
            // Използваме console.error за по-видими логове в Vercel
            console.error(`[UPLOAD] ✅ Sharp оптимизация успешна! Файл: ${file.originalFilename} | Оригинален: ${originalSizeMB} MB → Оптимизиран: ${optimizedSizeMB} MB | Компресия: ${compressionRatio}%`);
          } catch (error) {
            console.warn(`Sharp optimization error for file ${i + 1} (${file.originalFilename}):`, error.message);
            // Ако Sharp не успее, опитваме се да използваме оригиналния файл
            try {
              if (fs.existsSync(file.path)) {
                optimizedBuffer = fs.readFileSync(file.path);
                const fallbackSize = optimizedBuffer.length;
                const fallbackSizeMB = (fallbackSize / (1024 * 1024)).toFixed(2);
                // Използваме console.error за по-видими логове в Vercel
                console.error(`[UPLOAD] ⚠️ Sharp не е наличен! Файл: ${file.originalFilename} | Използва се оригинален файл (fallback): ${fallbackSizeMB} MB`);
                contentType = mime.lookup(file.path) || `image/${ext}`;
              } else {
                errors.push(`Файл ${i + 1}: Грешка при оптимизация и файлът не съществува`);
                continue;
              }
            } catch (readError) {
              errors.push(`Файл ${i + 1}: Грешка при четене на файла: ${readError.message}`);
              continue;
            }
          }
        } else {
          // За не-изображения, използваме оригиналния файл
          try {
            if (!fs.existsSync(file.path)) {
              errors.push(`Файл ${i + 1}: Файлът не съществува на диска`);
              continue;
            }
            optimizedBuffer = fs.readFileSync(file.path);
            contentType = mime.lookup(file.path) || 'application/octet-stream';
          } catch (readError) {
            errors.push(`Файл ${i + 1}: Грешка при четене на файла: ${readError.message}`);
            continue;
          }
        }
        
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const newFilename = `${timestamp}-${randomSuffix}.${finalExt}`;
        
        // Качване в S3 с обработка на грешки
        // Забележка: ACL не се използва, защото bucket-ът е с "Bucket owner enforced"
        // Публичният достъп се управлява чрез Bucket Policy в AWS конзолата
        try {
          await client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: newFilename,
            Body: optimizedBuffer,
            ContentType: contentType,
          }));
          
          // Генерираме правилния S3 URL според региона
          const region = process.env.S3_REGION || 'us-east-1';
          const s3Domain = region === 'us-east-1' 
            ? `${bucketName}.s3.amazonaws.com`
            : `${bucketName}.s3.${region}.amazonaws.com`;
          const link = `https://${s3Domain}/${newFilename}`;
          links.push(link);
          console.log(`[UPLOAD] Файл ${i + 1} (${file.originalFilename}): ✅ Успешно качен в S3: ${link}`);
        } catch (s3Error) {
          console.error(`S3 upload error for file ${i + 1}:`, s3Error);
          errors.push(`Файл ${i + 1}: Грешка при качване в S3: ${s3Error.message}`);
        }
      } catch (error) {
        console.error(`Unexpected error processing file ${i + 1}:`, error);
        errors.push(`Файл ${i + 1}: Неочаквана грешка: ${error.message}`);
      }
    }

    // Връщаме резултат с информация за грешки (ако има)
    if (errors.length > 0) {
      console.error(`[UPLOAD] Завършено с грешки: ${errors.length} грешки от ${files.file.length} файла`);
      return res.status(207).json({ // 207 Multi-Status - частичен успех
        links,
        errors,
        message: `Качени ${links.length} от ${files.file.length} файла. ${errors.length} грешки.`,
      });
    }

    console.log(`[UPLOAD] ✅ Успешно завършено: ${links.length} файл(а) качени в S3`);
    return res.json({links});
  } catch (error) {
    console.error('Upload API error:', error);
    return res.status(500).json({
      message: 'Грешка при качване на файловете',
      error: error.message,
    });
  }
}

export const config = {
  api: {bodyParser: false},
};