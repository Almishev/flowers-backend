import {Product} from "@/models/Product";
import {Category} from "@/models/Category";
import {mongooseConnect} from "@/lib/mongoose";
import {isAdminRequest} from "@/pages/api/auth/[...nextauth]";
import {deleteS3Objects} from "@/lib/s3";
import {generateUniqueSlug} from "@/lib/slugify";

async function assertLeafCategory(categoryId) {
  if (!categoryId) {
    const error = new Error('Изберете категория за продукта.');
    error.status = 400;
    throw error;
  }
  const category = await Category.findById(categoryId);
  if (!category) {
    const error = new Error('Категорията не е намерена');
    error.status = 400;
    throw error;
  }
  const childCount = await Category.countDocuments({parent: categoryId});
  if (childCount > 0) {
    const error = new Error('Отдел с подкатегории приема продукти само в подкатегория.');
    error.status = 400;
    throw error;
  }
}

export default async function handle(req, res) {
  const {method} = req;
  await mongooseConnect();
  await isAdminRequest(req,res);

  try {
  if (method === 'GET') {
    if (req.query?.id) {
      res.json(await Product.findOne({_id:req.query.id}).populate('category'));
    } else {
      res.json(await Product.find().populate('category'));
    }
  }

  if (method === 'POST') {
    const {title,description,price,images,category,properties,stock,brand,volume,concentration,gender,scentFamily,topNotes,heartNotes,baseNotes} = req.body;
    await assertLeafCategory(category);

    // Генерираме уникален slug на база заглавието
    const slug = await generateUniqueSlug(title, async (slugToCheck) => {
      const existing = await Product.findOne({ slug: slugToCheck });
      return !!existing;
    });

    const productDoc = await Product.create({
      title,
      slug,
      description,
      brand,
      volume,
      concentration,
      gender,
      scentFamily,
      topNotes,
      heartNotes,
      baseNotes,
      price,
      images,
      category,
      properties,
      stock,
    });
    res.json(productDoc);
  }

  if (method === 'PUT') {
    const {title,description,price,images,category,properties,_id,stock,brand,volume,concentration,gender,scentFamily,topNotes,heartNotes,baseNotes} = req.body;
    await assertLeafCategory(category);

    const existing = await Product.findById(_id);

    let slug = existing?.slug;
    if (!slug || title !== existing?.title) {
      slug = await generateUniqueSlug(title, async (slugToCheck) => {
        const found = await Product.findOne({ slug: slugToCheck, _id: { $ne: _id } });
        return !!found;
      });
    }

    await Product.updateOne(
      {_id},
      {title, slug, description, brand, volume, concentration, gender, scentFamily, topNotes, heartNotes, baseNotes, price, images, category, properties, stock}
    );
    res.json(true);
  }

  if (method === 'DELETE') {
    if (req.query?.id) {
      const prod = await Product.findById(req.query.id);
      const images = Array.isArray(prod?.images) ? prod.images : [];
      await Product.deleteOne({_id:req.query.id});
      // Best-effort S3 cleanup
      await deleteS3Objects(images);
      res.json(true);
    }
  }
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) {
      console.error('Products API error:', error);
    }
    res.status(status).json({error: error.message || 'Грешка при обработка на продукта'});
  }
}

