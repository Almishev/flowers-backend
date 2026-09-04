import {mongooseConnect} from "@/lib/mongoose";
import {Product} from "@/models/Product";

export default async function handler(req,res) {
  await mongooseConnect();

  const [totalProducts, availableProducts, outOfStockProducts] = await Promise.all([
    Product.countDocuments({}),
    Product.countDocuments({ stock: { $gt: 0 } }),
    Product.countDocuments({
      $or: [
        { stock: { $lte: 0 } },
        { stock: { $exists: false } },
      ],
    }),
  ]);

  res.json({
    products: {
      total: totalProducts,
      available: availableProducts,
      full: outOfStockProducts,
    }
  });
}


