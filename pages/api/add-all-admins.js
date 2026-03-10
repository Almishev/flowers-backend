import {mongooseConnect} from "@/lib/mongoose";
import {Admin} from "@/models/Admin";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({message: 'Method not allowed'});
  }

  try {
    await mongooseConnect();
    
    // Добавяме всички email-и като admin
    const emails = [
      'antonalmishev123@gmail.com',
      'alimkunev123@gmail.com',
      'mineralhotelinfo@gmail.com',
      'infoconcretecompany@gmail.com'
    ];
    
    const adminDocs = [];
    for (const email of emails) {
      const existingAdmin = await Admin.findOne({email});
      if (!existingAdmin) {
        const adminDoc = await Admin.create({email});
        adminDocs.push(adminDoc);
        console.log(`Added admin: ${email}`);
      } else {
        console.log(`Admin already exists: ${email}`);
      }
    }
    
    res.json({
      message: 'All admins processed successfully',
      added: adminDocs.length,
      total: emails.length
    });
  } catch (error) {
    console.error('Error adding admins:', error);
    res.status(500).json({message: 'Error adding admins'});
  }
}
