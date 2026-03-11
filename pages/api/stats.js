import {mongooseConnect} from "@/lib/mongoose";
import {Product} from "@/models/Product";

export default async function handler(req,res) {
  await mongooseConnect();

  // Статистики за продукти (букети)
  // Не броим архивирани продукти в нито една от метриките
  const baseQuery = { status: { $ne: "archived" } };

  const [totalProducts, availableProducts, outOfStockProducts] = await Promise.all([
    Product.countDocuments(baseQuery),
    // налични: stock > 0
    Product.countDocuments({ ...baseQuery, stock: { $gt: 0 } }),
    // изчерпани: stock <= 0 или липсващо stock
    Product.countDocuments({
      ...baseQuery,
      $or: [
        { stock: { $lte: 0 } },
        { stock: { $exists: false } },
      ],
    }),
  ]);

  res.json({
    trips: {
      total: totalProducts,
      available: availableProducts,
      full: outOfStockProducts,
    }
  });
}


