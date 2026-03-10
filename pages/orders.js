import Layout from "@/components/Layout";
import {useEffect, useState} from "react";
import axios from "axios";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    axios.get('/api/orders')
      .then(res => setOrders(res.data || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <h1>Поръчки</h1>
      {loading && <p>Зареждане на поръчките...</p>}
      {!loading && orders.length === 0 && (
        <p>Все още няма поръчки.</p>
      )}
      {!loading && orders.length > 0 && (
        <table className="basic mt-4">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Клиент</th>
              <th>Имейл</th>
              <th>Телефон</th>
              <th>Адрес</th>
              <th>Платена</th>
              <th>Метод</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order._id}>
                <td>{new Date(order.createdAt).toLocaleString('bg-BG')}</td>
                <td>{order.name}</td>
                <td>{order.email}</td>
                <td>{order.phone}</td>
                <td>
                  {order.streetAddress}, {order.postalCode} {order.city}, {order.country}
                </td>
                <td className={order.paid ? 'text-green-600' : 'text-red-600'}>
                  {order.paid ? 'Да' : 'Не'}
                </td>
                <td>{order.paymentMethod || 'cash'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Layout>
  );
}

