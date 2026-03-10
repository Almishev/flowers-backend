import Layout from "@/components/Layout";
import {useState, useEffect} from "react";
import axios from "axios";
import { withSwal } from 'react-sweetalert2';

function Admins({swal}) {
  const [email, setEmail] = useState('');
  const [admins, setAdmins] = useState([]);

  useEffect(() => {
    fetchAdmins();
  }, []);

  function fetchAdmins() {
    axios.get('/api/admins').then(result => {
      setAdmins(result.data);
    });
  }

  async function addAdmin(ev) {
    ev.preventDefault();
    if (!email) {
      swal.fire({
        title: 'Грешка',
        text: 'Моля, въведете имейл адрес',
        icon: 'error',
      });
      return;
    }
    
    try {
      await axios.post('/api/admins', {email});
      setEmail('');
      fetchAdmins();
      swal.fire({
        title: 'Успех',
        text: 'Администраторът е добавен успешно',
        icon: 'success',
      });
    } catch (error) {
      swal.fire({
        title: 'Грешка',
        text: error.response?.data?.message || 'Неуспешно добавяне на администратор',
        icon: 'error',
      });
    }
  }

  function removeAdmin(admin) {
    swal.fire({
      title: 'Сигурни ли сте?',
      text: `Искате ли да премахнете ${admin.email}?`,
      showCancelButton: true,
      cancelButtonText: 'Отказ',
      confirmButtonText: 'Да, изтрий!',
      confirmButtonColor: '#dc2626', // По-тъмно червено (red-600)
      cancelButtonColor: '#4b5563', // Тъмно сиво (gray-600)
      reverseButtons: true,
    }).then(async result => {
      if (result.isConfirmed) {
        await axios.delete('/api/admins?_id='+admin._id);
        fetchAdmins();
        swal.fire({
          title: 'Изтрито!',
          text: 'Администраторът е премахнат.',
          icon: 'success',
        });
      }
    });
  }

  return (
    <Layout>
      <h1>Администратори</h1>
      <form onSubmit={addAdmin}>
        <label>Добави нов администратор</label>
        <div className="flex gap-2">
          <input
            type="text"
            className="mb-0"
            value={email}
            onChange={ev => setEmail(ev.target.value)}
            placeholder="google имейл" />
          <button
            type="submit"
            className="btn-primary whitespace-nowrap">
            Добави администратор
          </button>
        </div>
      </form>

      <h2>Съществуващи администратори</h2>
      <table className="basic">
        <thead>
          <tr>
            <th>Google имейл на администратора</th>
            <th>Дата на създаване</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {admins.length > 0 && admins.map(admin => (
            <tr key={admin._id}>
              <td>{admin.email}</td>
              <td>
                {admin.createdAt && new Date(admin.createdAt).toLocaleString()}
              </td>
              <td>
                <button
                  onClick={() => removeAdmin(admin)}
                  className="btn-red">
                  Изтрий
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Layout>
  );
}

export default withSwal(({swal}, ref) => (
  <Admins swal={swal} />
));
