import {Product} from "@/models/Product";
import {mongooseConnect} from "@/lib/mongoose";
import {isAdminRequest} from "@/pages/api/auth/[...nextauth]";

export default async function handle(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({message: 'Method not allowed'});
    return;
  }

  await mongooseConnect();
  await isAdminRequest(req, res);

  try {
    const {tripId, reservationIndex} = req.body;

    if (!tripId || reservationIndex === undefined) {
      res.status(400).json({message: 'tripId and reservationIndex are required'});
      return;
    }

    const trip = await Product.findById(tripId);
    if (!trip) {
      res.status(404).json({message: 'Trip not found'});
      return;
    }

    if (!trip.reservations || !trip.reservations[reservationIndex]) {
      res.status(400).json({message: 'Reservation record not found'});
      return;
    }

    const reservationRecord = trip.reservations[reservationIndex];
    
    // Проверяваме дали вече е отменена
    if (reservationRecord.cancelledAt) {
      res.status(400).json({message: 'Reservation is already cancelled'});
      return;
    }

    // Увеличаваме свободните места с 1, но не надвишаваме maxSeats
    const newAvailableSeats = Math.min(
      (trip.availableSeats || 0) + 1,
      trip.maxSeats || Number.MAX_SAFE_INTEGER
    );

    // Обновяваме запис в reservations с дата на отмяна
    const updatedReservations = trip.reservations.map((record, index) => {
      if (index === reservationIndex) {
        return {
          ...record.toObject ? record.toObject() : record,
          cancelledAt: new Date(),
        };
      }
      return record.toObject ? record.toObject() : record;
    });

    const updateData = {
      availableSeats: newAvailableSeats,
      reservations: updatedReservations,
    };

    // Проверяваме дали има още активни резервации
    const activeReservations = updatedReservations.filter(r => !r.cancelledAt);
    
    // Ако няма активни резервации, статусът става "draft" (Няма записани)
    if (activeReservations.length === 0 && trip.status === 'published') {
      updateData.status = 'draft';
    }

    await Product.updateOne({_id: tripId}, updateData);

    res.json({success: true, message: 'Trip reservation cancelled successfully', availableSeats: newAvailableSeats});
  } catch (error) {
    console.error('Error cancelling trip reservation:', error);
    res.status(500).json({message: 'Internal server error'});
  }
}

