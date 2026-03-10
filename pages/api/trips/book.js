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
    const {tripId, customerName, customerEmail, customerPhone} = req.body;

    if (!tripId || !customerName) {
      res.status(400).json({message: 'tripId and customerName are required'});
      return;
    }

    const trip = await Product.findById(tripId);
    if (!trip) {
      res.status(404).json({message: 'Trip not found'});
      return;
    }

    if (trip.availableSeats <= 0) {
      res.status(400).json({message: 'No available seats for this trip'});
      return;
    }

    // Намаляваме свободните места с 1
    const newAvailableSeats = trip.availableSeats - 1;

    // Добавяме запис в reservations
    const reservationRecord = {
      customerName,
      customerEmail: customerEmail || '',
      customerPhone: customerPhone || '',
      reservedAt: new Date(),
    };

    const updateData = {
      availableSeats: newAvailableSeats,
      $push: { reservations: reservationRecord },
    };

    // Когато има резервация, статусът става "published" (Има записани)
    if (trip.status === 'draft') {
      updateData.status = 'published';
    }
    // Ако статусът е cancelled или archived, не го променяме

    await Product.updateOne({_id: tripId}, updateData);

    res.json({success: true, message: 'Trip reserved successfully', availableSeats: newAvailableSeats});
  } catch (error) {
    console.error('Error reserving trip:', error);
    res.status(500).json({message: 'Internal server error'});
  }
}

