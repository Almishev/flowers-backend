import {mongooseConnect} from "@/lib/mongoose";
import {Admin} from "@/models/Admin";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({message: 'Method not allowed'});
  }

  try {
    await mongooseConnect();
    
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({message: 'Email is required'});
    }
    
    // Проверяваме дали вече съществува
    const existingAdmin = await Admin.findOne({email});
    if (existingAdmin) {
      return res.json({
        message: 'Admin already exists',
        admin: existingAdmin
      });
    }
    
    // Създаваме нов админ
    const adminDoc = await Admin.create({email});
    console.log(`Added admin: ${email}`);
    
    res.json({
      message: 'Admin added successfully',
      admin: adminDoc
    });
  } catch (error) {
    console.error('Error adding admin:', error);
    if (error.code === 11000) {
      res.status(400).json({message: 'Email already exists'});
    } else {
      res.status(500).json({message: 'Error adding admin', error: error.message});
    }
  }
}

