import mongoose, {model, Schema, models} from "mongoose";

// Модел за продукт (букет) в онлайн магазина
const ProductSchema = new Schema({
  // Основна информация
  title: { type: String, required: true },      // Име на продукта (букет, кошница и т.н.)
  slug: { type: String, unique: true, sparse: true }, // SEO-friendly URL slug
  description: String,

  // Цена
  price: { type: Number, required: true },
  currency: { type: String, default: "BGN" },

  // Медия и класификация
  images: [{ type: String }],
  category: { type: mongoose.Types.ObjectId, ref: "Category" },
  properties: { type: Object },                 // Свойства по категория (напр. Тип цветя, Повод)

  // Наличност (брой налични бройки)
  stock: { type: Number, default: 0 },
}, {
  timestamps: true,
});

export const Product = models.Product || model("Product", ProductSchema);