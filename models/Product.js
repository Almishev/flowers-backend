import mongoose, {model, Schema, models} from "mongoose";

// Резервация за екскурзия (един клиент, една резервация)
const ReservationSchema = new Schema({
  customerName: { type: String, required: true },
  customerEmail: String,
  customerPhone: String,
  reservedAt: { type: Date, default: Date.now },
  cancelledAt: Date,
}, { _id: false });

// Модел само за екскурзии / пътувания
const TripSchema = new Schema({
  // Основна информация
  title: { type: String, required: true },                // Име на екскурзията
  description: String,

  // Дестинация и тръгване
  destinationCountry: { type: String, required: true },
  destinationCity: String,
  departureCity: String,

  // Дати и продължителност
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  durationDays: Number,

  // Цена
  price: { type: Number, required: true },
  currency: { type: String, default: "BGN" },

  // Тип пътуване
  travelType: {
    type: String,
    enum: ["excursion", "vacation", "city-break", "other"],
    default: "excursion",
  },

  // Капацитет и свободни места
  maxSeats: { type: Number, default: 0 },
  availableSeats: { type: Number, default: 0 },

  // Маркиране на акцентни екскурзии
  isFeatured: { type: Boolean, default: false },

  // Медия и класификация
  images: [{ type: String }],
  category: { type: mongoose.Types.ObjectId, ref: "Category" },
  properties: { type: Object },

  // Наличност (за продукти, напр. букети)
  stock: { type: Number, default: 0 },

  // Статус на екскурзията
  status: {
    type: String,
    enum: ["draft", "published", "cancelled", "archived"],
    default: "draft",
  },

  // Резервации за тази екскурзия
  reservations: [ReservationSchema],
}, {
  timestamps: true,
});

// Запазваме името Product за да не чупим import-ите; семантиката вече е "Trip".
export const Product = models.Product || model("Product", TripSchema);