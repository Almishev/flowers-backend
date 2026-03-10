import {Product} from "@/models/Product";
import {mongooseConnect} from "@/lib/mongoose";
import {isAdminRequest} from "@/pages/api/auth/[...nextauth]";
import {deleteS3Objects} from "@/lib/s3";

/**
 * API endpoint за изтриване на архивирани екскурзии
 * 
 * ВНИМАНИЕ: Това изтрива ПЕРМАНЕНТНО данните!
 * Изтрива само екскурзии със статус "archived" и БЕЗ резервации
 * 
 * Използва се за освобождаване на място в базата данни
 */
export default async function handle(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({message: 'Method not allowed'});
    return;
  }

  await mongooseConnect();
  await isAdminRequest(req, res);

  try {
    // Намираме архивирани екскурзии БЕЗ резервации
    const archivedTrips = await Product.find({
      status: 'archived',
      $or: [
        { reservations: { $exists: false } },
        { reservations: { $size: 0 } },
      ],
    }).lean();

    let deletedCount = 0;
    const imagesToDelete = [];

    for (const trip of archivedTrips) {
      // Събираме всички изображения за изтриване от S3
      if (trip.images && Array.isArray(trip.images)) {
        trip.images.forEach(img => {
          if (img && typeof img === 'string') {
            imagesToDelete.push(img);
          }
        });
      }

      // Изтриваме екскурзията
      await Product.deleteOne({ _id: trip._id });
      deletedCount++;
    }

    // Изтриваме изображенията от S3 (ако има)
    if (imagesToDelete.length > 0) {
      try {
        await deleteS3Objects(imagesToDelete);
      } catch (s3Error) {
        console.error('Error deleting S3 objects:', s3Error);
        // Продължаваме дори ако изтриването на S3 не успее
      }
    }

    res.json({
      success: true,
      message: `Изтрити ${deletedCount} архивирани екскурзии. Освободено място в базата данни.`,
      deletedCount,
      imagesDeleted: imagesToDelete.length,
    });
  } catch (error) {
    console.error('Error cleaning up archived trips:', error);
    res.status(500).json({message: 'Internal server error', error: error.message});
  }
}

