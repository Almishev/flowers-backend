import {Category} from "@/models/Category";
import {mongooseConnect} from "@/lib/mongoose";
import {getServerSession} from "next-auth";
import {authOptions, isAdminRequest} from "@/pages/api/auth/[...nextauth]";
import {deleteS3Object} from "@/lib/s3";
import {generateUniqueSlug} from "@/lib/slugify";

export default async function handle(req, res) {
  const {method} = req;
  await mongooseConnect();
  await isAdminRequest(req,res);

  if (method === 'GET') {
    res.json(await Category.find().populate('parent'));
  }

  if (method === 'POST') {
    const {name,parentCategory,properties,image} = req.body;
    
    // Generate unique slug from name
    const slug = await generateUniqueSlug(name, async (slugToCheck) => {
      const existing = await Category.findOne({ slug: slugToCheck });
      return !!existing;
    });
    
    const categoryDoc = await Category.create({
      name,
      slug,
      parent: parentCategory || undefined,
      properties,
      image,
    });
    res.json(categoryDoc);
  }

  if (method === 'PUT') {
    const {name,parentCategory,properties,image,_id} = req.body;
    
    // Get old category to compare image
    const oldCategory = await Category.findById(_id);
    const oldImage = oldCategory?.image;
    
    // Delete old image from S3 if it's being replaced
    if (oldImage && oldImage !== image) {
      try {
        await deleteS3Object(oldImage);
        console.log('Deleted old category image:', oldImage);
      } catch (error) {
        console.error('Error deleting old category image:', error);
      }
    }
    
    // Generate new slug if name changed or slug doesn't exist
    let slug = oldCategory?.slug;
    if (!slug || name !== oldCategory?.name) {
      slug = await generateUniqueSlug(name, async (slugToCheck) => {
        // Check if slug exists for a different category
        const existing = await Category.findOne({ slug: slugToCheck, _id: { $ne: _id } });
        return !!existing;
      });
    }
    
    const categoryDoc = await Category.updateOne({_id},{
      name,
      slug,
      parent: parentCategory || undefined,
      properties,
      image,
    });
    res.json(categoryDoc);
  }

  if (method === 'DELETE') {
    const {_id} = req.query;
    const cat = await Category.findById(_id);
    const imageUrl = cat?.image;
    await Category.deleteOne({_id});
    if (imageUrl) {
      await deleteS3Object(imageUrl);
    }
    res.json('ok');
  }
}