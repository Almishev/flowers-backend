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
      // Поддръжка на пагинация, търсене и филтриране по статус
      const page = parseInt(req.query?.page) || 1;
      const limit = parseInt(req.query?.limit) || 30;
      const search = req.query?.search || '';
      const status = req.query?.status || '';
      const skip = (page - 1) * limit;

      // Създаваме query за търсене и статус
      let query = {};

      // Филтриране по статус от UI:
      // 'available' -> екскурзии с налични места
      // 'no-seats'  -> екскурзии без свободни места
      // 'archived'  -> архивирани екскурзии
      if (status === 'available') {
        query.availableSeats = { $gt: 0 };
        query.status = { $ne: 'archived' }; // Не показваме архивирани в "available"
      } else if (status === 'no-seats') {
        query.availableSeats = { $lte: 0 };
        query.status = { $ne: 'archived' }; // Не показваме архивирани в "no-seats"
      } else if (status === 'archived') {
        query.status = 'archived';
      } else {
        // По подразбиране не показваме архивирани (освен ако не е избран филтър 'archived')
        if (!query.status) {
          query.status = { $ne: 'archived' };
        }
      }

      // Търсене (комбинира се с филтъра за статус)
      if (search) {
        const searchQuery = {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { destinationCountry: { $regex: search, $options: 'i' } },
            { destinationCity: { $regex: search, $options: 'i' } },
            { departureCity: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
          ]
        };
        
        // Комбинираме търсенето с останалите филтри
        if (Object.keys(query).length > 0) {
          query = { $and: [query, searchQuery] };
        } else {
          query = searchQuery;
        }
      }

      // Броим общия брой резултати
      const totalCount = await Product.countDocuments(query);
      const totalPages = Math.ceil(totalCount / limit);

      // Определяме сортирането
      const sortBy = req.query?.sortBy || '_id';
      const sortOrder = req.query?.sortOrder === 'asc' ? 1 : -1;
      const sortObj = { [sortBy]: sortOrder };

      // Намираме екскурзиите с пагинация и сортиране
      const products = await Product.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean();

      res.json({
        products,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
        }
      });
    }
  }

  if (method === 'POST') {
    const {
      title,
      description,
      destinationCountry,
      destinationCity,
      departureCity,
      startDate,
      endDate,
      durationDays,
      price,
      currency,
      travelType,
      maxSeats,
      availableSeats,
      isFeatured,
      images,
      category,
      properties,
      status,
    } = req.body;

    const initialMaxSeats = Number(maxSeats ?? 0);
    const initialAvailableSeats =
      availableSeats !== undefined ? Number(availableSeats) : initialMaxSeats;

    // Generate unique slug from title
    const slug = await generateUniqueSlug(title, async (slugToCheck) => {
      const existing = await Product.findOne({ slug: slugToCheck });
      return !!existing;
    });

    const productDoc = await Product.create({
      title,
      slug,
      description,
      destinationCountry,
      destinationCity,
      departureCity,
      startDate,
      endDate,
      durationDays,
      price,
      currency,
      travelType,
      maxSeats: initialMaxSeats,
      availableSeats: initialAvailableSeats,
      isFeatured: !!isFeatured,
      images,
      category,
      properties,
      status: status || 'draft',
    });
    res.json(productDoc);
  }

  if (method === 'PUT') {
    const {
      _id,
      title,
      description,
      destinationCountry,
      destinationCity,
      departureCity,
      startDate,
      endDate,
      durationDays,
      price,
      currency,
      travelType,
      maxSeats,
      availableSeats,
      isFeatured,
      images,
      category,
      properties,
      status,
    } = req.body;

    // Get old product to compare images
    const oldProduct = await Product.findById(_id);
    const oldImages = Array.isArray(oldProduct?.images) ? oldProduct.images : [];
    const newImages = Array.isArray(images) ? images : [];
    
    // Find images that were removed (exist in old but not in new)
    const removedImages = oldImages.filter(oldImg => !newImages.includes(oldImg));
    
    // Delete removed images from S3
    if (removedImages.length > 0) {
      await deleteS3Objects(removedImages);
    }

    // Generate new slug if title changed or slug doesn't exist
    let slug = oldProduct?.slug;
    if (!slug || title !== oldProduct?.title) {
      slug = await generateUniqueSlug(title, async (slugToCheck) => {
        // Check if slug exists for a different product
        const existing = await Product.findOne({ slug: slugToCheck, _id: { $ne: _id } });
        return !!existing;
      });
    }

    const update = {
      title,
      slug,
      description,
      destinationCountry,
      destinationCity,
      departureCity,
      startDate,
      endDate,
      durationDays,
      price,
      currency,
      travelType,
      maxSeats: Number(maxSeats ?? 0),
      availableSeats: Number(availableSeats ?? 0),
      isFeatured: !!isFeatured,
      images,
      category,
      properties,
    };

    if (status) {
      update.status = status;
    }

    await Product.updateOne({_id}, update);
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