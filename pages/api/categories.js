import {Category} from "@/models/Category";
import {Product} from "@/models/Product";
import {mongooseConnect} from "@/lib/mongoose";
import {isAdminRequest} from "@/pages/api/auth/[...nextauth]";
import {deleteS3Object} from "@/lib/s3";
import {generateUniqueSlug} from "@/lib/slugify";

async function assertValidParent(parentId, currentId) {
  if (!parentId) return null;

  if (currentId && String(parentId) === String(currentId)) {
    const error = new Error('Категорията не може да е родител на себе си');
    error.status = 400;
    throw error;
  }

  const parent = await Category.findById(parentId);
  if (!parent) {
    const error = new Error('Родителската категория не е намерена');
    error.status = 400;
    throw error;
  }

  if (parent.parent) {
    const error = new Error('Подкатегорията трябва да е директно под отдел (корен). Трето ниво не е позволено.');
    error.status = 400;
    throw error;
  }

  return parent;
}

export default async function handle(req, res) {
  const {method} = req;
  await mongooseConnect();
  await isAdminRequest(req,res);

  try {
    if (method === 'GET') {
      res.json(await Category.find().populate('parent').sort({navOrder: 1, name: 1}));
      return;
    }

    if (method === 'POST') {
      const {name,parentCategory,properties,image,navOrder} = req.body;
      await assertValidParent(parentCategory);

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
        navOrder: parentCategory ? 0 : Number(navOrder || 0),
      });
      res.json(categoryDoc);
      return;
    }

    if (method === 'PUT') {
      const {name,parentCategory,properties,image,_id,navOrder} = req.body;

      const oldCategory = await Category.findById(_id);
      if (!oldCategory) {
        res.status(404).json({error: 'Категорията не е намерена'});
        return;
      }

      if (parentCategory) {
        const childCount = await Category.countDocuments({parent: _id});
        if (childCount > 0) {
          res.status(400).json({error: 'Отдел с подкатегории не може да стане подкатегория.'});
          return;
        }
      }

      await assertValidParent(parentCategory, _id);

      const oldImage = oldCategory?.image;
      if (oldImage && oldImage !== image) {
        try {
          await deleteS3Object(oldImage);
        } catch (error) {
          console.error('Error deleting old category image:', error);
        }
      }

      let slug = oldCategory?.slug;
      if (!slug || name !== oldCategory?.name) {
        slug = await generateUniqueSlug(name, async (slugToCheck) => {
          const existing = await Category.findOne({ slug: slugToCheck, _id: { $ne: _id } });
          return !!existing;
        });
      }

      const $set = {
        name,
        slug,
        properties,
        image,
        navOrder: parentCategory ? 0 : Number(navOrder ?? oldCategory.navOrder ?? 0),
      };

      const update = parentCategory
        ? { $set: {...$set, parent: parentCategory} }
        : { $set, $unset: {parent: 1} };

      const categoryDoc = await Category.updateOne({_id}, update);
      res.json(categoryDoc);
      return;
    }

    if (method === 'DELETE') {
      const {_id} = req.query;
      const cat = await Category.findById(_id);
      if (!cat) {
        res.status(404).json({error: 'Категорията не е намерена'});
        return;
      }

      const childCount = await Category.countDocuments({parent: _id});
      if (childCount > 0) {
        res.status(409).json({error: 'Не може да се изтрие отдел, който има подкатегории.'});
        return;
      }

      const productCount = await Product.countDocuments({category: _id});
      if (productCount > 0) {
        res.status(409).json({error: 'Не може да се изтрие категория с продукти в нея.'});
        return;
      }

      const imageUrl = cat?.image;
      await Category.deleteOne({_id});
      if (imageUrl) {
        await deleteS3Object(imageUrl);
      }
      res.json('ok');
    }
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) {
      console.error('Categories API error:', error);
    }
    res.status(status).json({error: error.message || 'Грешка при обработка на категория'});
  }
}
