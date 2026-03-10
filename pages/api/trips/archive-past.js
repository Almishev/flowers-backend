import {Product} from "@/models/Product";
import {mongooseConnect} from "@/lib/mongoose";
import {isAdminRequest} from "@/pages/api/auth/[...nextauth]";

/**
 * API endpoint за автоматично архивиране на минали екскурзии
 * 
 * Логика:
 * - Архивира само екскурзии с endDate < днес
 * - Архивира само екскурзии БЕЗ активни резервации
 * - Запазва екскурзии с резервации (дори минали) за исторически данни
 * - Не изтрива, а само маркира като "archived"
 */
export default async function handle(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({message: 'Method not allowed'});
    return;
  }

  await mongooseConnect();
  await isAdminRequest(req, res);

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Започваме от началото на днес

    // Намираме минали екскурзии, които все още не са архивирани
    const pastTrips = await Product.find({
      endDate: { $lt: today },
      status: { $ne: 'archived' }, // Не са вече архивирани
    }).lean();

    let archivedCount = 0;
    let skippedCount = 0;

    for (const trip of pastTrips) {
      // Проверяваме дали има активни резервации
      const hasActiveReservations = trip.reservations?.some(
        (reservation) => !reservation.cancelledAt
      );

      // Архивираме само ако няма активни резервации
      if (!hasActiveReservations) {
        await Product.updateOne(
          { _id: trip._id },
          { status: 'archived' }
        );
        archivedCount++;
      } else {
        skippedCount++;
      }
    }

    res.json({
      success: true,
      message: `Архивирани ${archivedCount} екскурзии. Пропуснати ${skippedCount} екскурзии с активни резервации.`,
      archivedCount,
      skippedCount,
      totalChecked: pastTrips.length,
    });
  } catch (error) {
    console.error('Error archiving past trips:', error);
    res.status(500).json({message: 'Internal server error', error: error.message});
  }
}

