import {mongooseConnect} from "@/lib/mongoose";
import {isAdminRequest} from "@/pages/api/auth/[...nextauth]";
import {Admin} from "@/models/Admin";

export default async function handle(req, res) {
  await mongooseConnect();
  await isAdminRequest(req,res);

  if (req.method === 'GET') {
    res.json(await Admin.find());
  }

  if (req.method === 'POST') {
    const {email} = req.body;
    try {
      const adminDoc = await Admin.create({email});
      res.json(adminDoc);
    } catch (error) {
      if (error.code === 11000) {
        res.status(400).json({message: 'Email already exists'});
      } else {
        res.status(400).json({message: 'Invalid email'});
      }
    }
  }

  if (req.method === 'PUT') {
    // Bulk add multiple emails
    const {emails} = req.body;
    try {
      const adminDocs = [];
      for (const email of emails) {
        const existingAdmin = await Admin.findOne({email});
        if (!existingAdmin) {
          const adminDoc = await Admin.create({email});
          adminDocs.push(adminDoc);
        }
      }
      res.json({message: 'Admins added successfully', count: adminDocs.length});
    } catch (error) {
      res.status(400).json({message: 'Error adding admins'});
    }
  }

  if (req.method === 'DELETE') {
    const {_id} = req.query;
    await Admin.deleteOne({_id});
    res.json(true);
  }
}
