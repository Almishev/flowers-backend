import mongoose, {model, models, Schema} from "mongoose";

const CategorySchema = new Schema({
  name: {type: String, required: true},
  slug: {type: String, unique: true, sparse: true},
  parent: {type: mongoose.Types.ObjectId, ref: 'Category'},
  properties: [{type: Object}],
  image: {type: String},
  navOrder: {type: Number, default: 0},
}, {
  timestamps: true,
});

export const Category = models?.Category || model('Category', CategorySchema);
