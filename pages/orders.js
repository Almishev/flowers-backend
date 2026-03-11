import Layout from "@/components/Layout";
import {useEffect, useState} from "react";
import axios from "axios";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortDir, setSortDir] = useState('desc'); // 'desc' (най-нови първо) или 'asc'

  useEffect(() => {
    setLoading(true);
    axios.get('/api/orders')
      .then(res => setOrders(res.data || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  const sortedOrders = [...orders].sort((a, b) => {
    const da = new Date(a.createdAt).getTime();
    const db = new Date(b.createdAt).getTime();
    return sortDir === 'desc' ? db - da : da - db;
  });

  async function deleteOrder(id) {
    if (!window.confirm('Сигурни ли сте, че искате да изтриете тази поръчка?')) return;
    try {
      await axios.delete('/api/orders', { params: { id } });
      setOrders(prev => prev.filter(o => o._id !== id));
    } catch (e) {
      alert('Грешка при изтриване на поръчката.');
    }
  }

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
              <th
                style={{cursor: 'pointer'}}
                onClick={() => setSortDir(d => (d === 'desc' ? 'asc' : 'desc'))}
              >
                Дата {sortDir === 'desc' ? '↓' : '↑'}
              </th>
              <th>Клиент</th>
              <th>Имейл</th>
              <th>Телефон</th>
              <th>Адрес</th>
              <th>Продукти</th>
              <th>Общо</th>
              <th>Платена</th>
              <th>Метод</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sortedOrders.map(order => (
              <tr key={order._id}>
                <td>{new Date(order.createdAt).toLocaleString('bg-BG')}</td>
                <td>{order.name}</td>
                <td>{order.email}</td>
                <td>{order.phone}</td>
                <td>
                  {order.streetAddress}, {order.postalCode} {order.city}, {order.country}
                </td>
                <td>
                  {Array.isArray(order.line_items) && order.line_items.length > 0 ? (
                    <ul style={{margin: 0, paddingLeft: '18px'}}>
                      {order.line_items.map((item, index) => (
                        <li key={index}>
                          {item.price_data?.product_data?.name || 'Продукт'} × {item.quantity || 1}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span style={{color: '#6b7280'}}>Няма данни</span>
                  )}
                </td>
                <td>
                  {typeof order.total === 'number'
                    ? `${order.total.toFixed(2)} EUR`
                    : (
                      Array.isArray(order.line_items)
                        ? `${(order.line_items.reduce((sum, item) => {
                            const qty = item.quantity || 0;
                            const amount = item.price_data?.unit_amount || 0;
                            return sum + qty * amount;
                          }, 0) / 100).toFixed(2)} EUR`
                        : '—'
                    )}
                </td>
                <td className={order.paid ? 'text-green-600' : 'text-red-600'}>
                  {order.paid ? 'Да' : 'Не'}
                </td>
                <td>{order.paymentMethod || 'cash'}</td>
                <td>
                  <button
                    onClick={() => deleteOrder(order._id)}
                    className="btn-red"
                  >
                    Изтрий
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Layout>
  );
}

