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
  } else {
    res.status(405).end();
  }
}

