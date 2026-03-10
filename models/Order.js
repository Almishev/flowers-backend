import {model, models, Schema} from "mongoose";

const OrderSchema = new Schema({
  line_items: Object,
  name: String,
  email: String,
  phone: String,
  city: String,
  postalCode: String,
  streetAddress: String,
  country: String,
  paid: Boolean,
  paymentMethod: String, // 'cash' (наложен платеж)
}, {
  timestamps: true,
});

export const Order = models?.Order || model('Order', OrderSchema);

