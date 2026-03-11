import {Product} from "@/models/Product";
import {mongooseConnect} from "@/lib/mongoose";
import {isAdminRequest} from "@/pages/api/auth/[...nextauth]";
import {deleteS3Objects} from "@/lib/s3";
import {generateUniqueSlug} from "@/lib/slugify";

export default async function handle(req, res) {
  const {method} = req;
  await mongooseConnect();
  await isAdminRequest(req,res);

  if (method === 'GET') {
    if (req.query?.id) {
      res.json(await Product.findOne({_id:req.query.id}));
    } else {
      res.json(await Product.find());
    }
  }

  if (method === 'POST') {
    const {title,description,price,images,category,properties,stock} = req.body;

    // Генерираме уникален slug на база заглавието
    const slug = await generateUniqueSlug(title, async (slugToCheck) => {
      const existing = await Product.findOne({ slug: slugToCheck });
      return !!existing;
    });

    const productDoc = await Product.create({
      title,
      slug,
      description,
      price,
      images,
      category,
      properties,
      stock,
    });
    res.json(productDoc);
  }

  if (method === 'PUT') {
    const {title,description,price,images,category,properties,_id,stock} = req.body;

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
      {title, slug, description,price,images,category,properties,stock}
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
}

