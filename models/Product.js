import mongoose, {model, Schema, models} from "mongoose";

const ProductSchema = new Schema({
  title: { type: String, required: true },
  slug: { type: String, unique: true, sparse: true },
  description: String,
  brand: { type: String, default: "" },
  volume: { type: String, default: "" },
  concentration: { type: String, default: "" },
  gender: { type: String, default: "" },
  scentFamily: { type: String, default: "" },
  topNotes: { type: String, default: "" },
  heartNotes: { type: String, default: "" },
  baseNotes: { type: String, default: "" },

  price: { type: Number, required: true },
  currency: { type: String, default: "EUR" },

  images: [{ type: String }],
  category: { type: mongoose.Types.ObjectId, ref: "Category" },
  properties: { type: Object },

  stock: { type: Number, default: 0 },
}, {
  timestamps: true,
});

export const Product = models.Product || model("Product", ProductSchema);
