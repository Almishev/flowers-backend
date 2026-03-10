import mongoose from "mongoose";

export function mongooseConnect() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection.asPromise();
  } else {
    const uri = process.env.MONGODB_URI;
    
    if (!uri || typeof uri !== 'string' || uri.trim() === '') {
      throw new Error('MONGODB_URI environment variable is not set or is empty');
    }
    
    if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
      throw new Error('Invalid MONGODB_URI format: must start with "mongodb://" or "mongodb+srv://"');
    }
    
    return mongoose.connect(uri);
  }
}