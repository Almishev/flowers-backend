import {mongooseConnect} from "@/lib/mongoose";
import {isAdminRequest} from "@/pages/api/auth/[...nextauth]";
import {Order} from "@/models/Order";

export default async function handle(req, res) {
  await mongooseConnect();
  await isAdminRequest(req, res);

  const {method} = req;

  if (method === 'GET') {
    try {
      const orders = await Order.find({}, null, {
        sort: {createdAt: -1},
      });
      res.json(orders);
    } catch (e) {
      res.status(500).json({error: 'Грешка при зареждане на поръчките.'});
    }
    return;
  }

  if (method === 'DELETE') {
    const {id} = req.query;
    if (!id) {
      res.status(400).json({error: 'Липсва ID на поръчка.'});
      return;
    }
    try {
      await Order.findByIdAndDelete(id);
      res.json({success: true});
    } catch (e) {
      res.status(500).json({error: 'Грешка при изтриване на поръчката.'});
    }
    return;
  }

  res.status(405).end();
}

