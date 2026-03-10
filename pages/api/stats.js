import {mongooseConnect} from "@/lib/mongoose";
import {Product} from "@/models/Product";

export default async function handler(req,res) {
  await mongooseConnect();

  // Статистики за екскурзии
  const totalTrips = await Product.countDocuments();
  const availableTrips = await Product.countDocuments({availableSeats: {$gt: 0}});
  const fullTrips = await Product.countDocuments({availableSeats: {$lte: 0}});

  res.json({
    trips: {
      total: totalTrips,
      available: availableTrips,
      full: fullTrips,
    }
  });
}


