import Layout from "@/components/Layout";
import {useRouter} from "next/router";
import {useEffect, useState} from "react";
import axios from "axios";
import Link from "next/link";

export default function TripDetailsPage() {
  const router = useRouter();
  const {id} = router.query;
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReserveForm, setShowReserveForm] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [reserveFormData, setReserveFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
  });
  const [cancelFormData, setCancelFormData] = useState({
    reservationIndex: '',
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!id) return;
    fetchTrip();
  }, [id]);

  function fetchTrip() {
    axios.get('/api/trips?id=' + id).then(response => {
      setTrip(response.data);
      setLoading(false);
    });
  }

  async function handleReserveTrip(e) {
    e.preventDefault();
    try {
      await axios.post('/api/trips/book', {
        tripId: id,
        ...reserveFormData,
      });
      setShowReserveForm(false);
      setReserveFormData({customerName: '', customerEmail: '', customerPhone: ''});
      fetchTrip();
    } catch (error) {
      alert(error.response?.data?.message || 'Грешка при записване за екскурзия');
    }
  }

  async function handleCancelReservation(e) {
    e.preventDefault();
    try {
      await axios.post('/api/trips/cancel', {
        tripId: id,
        reservationIndex: parseInt(cancelFormData.reservationIndex),
      });
      setShowCancelForm(false);
      setCancelFormData({reservationIndex: ''});
      fetchTrip();
    } catch (error) {
      alert(error.response?.data?.message || 'Грешка при отказване на резервация');
    }
  }

  function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('bg-BG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <Layout>
        <div>Зареждане...</div>
      </Layout>
    );
  }

  if (!trip) {
    return (
      <Layout>
        <div>Екскурзията не е намерена</div>
      </Layout>
    );
  }

  const activeReservations = trip.reservations?.filter(record => !record.cancelledAt) || [];
  const allReservations = trip.reservations || [];

  return (
    <Layout>
      <Link href="/trips" className="btn-default mb-4">
        ← Назад към екскурзиите
      </Link>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-4">
        <h1 className="text-2xl font-bold mb-4">{trip.title}</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <strong>Дестинация:</strong> {trip.destinationCountry || '-'}
            {trip.destinationCity ? `, ${trip.destinationCity}` : ''}
          </div>
          <div>
            <strong>Отпътуване от:</strong> {trip.departureCity || '-'}
          </div>
          <div>
            <strong>Начална дата:</strong> {trip.startDate ? formatDate(trip.startDate) : '-'}
          </div>
          <div>
            <strong>Крайна дата:</strong> {trip.endDate ? formatDate(trip.endDate) : '-'}
          </div>
          <div>
            <strong>Места:</strong> {trip.availableSeats ?? 0} свободни / {trip.maxSeats ?? 0} общо
          </div>
          <div>
            <strong>Статус:</strong> 
            <span className={`ml-2 px-2 py-1 rounded ${
              trip.status === 'cancelled'
                ? 'bg-red-100 text-red-800'
                : trip.status === 'archived'
                  ? 'bg-gray-200 text-gray-600'
                  : trip.status === 'published'
                    ? 'bg-green-100 text-green-800'
                    : trip.status === 'draft'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
            }`}>
              {trip.status === 'published' ? 'Има записани' : 
               trip.status === 'draft' ? 'Няма записани' :
               trip.status === 'cancelled' ? 'Отменена' :
               trip.status === 'archived' ? 'Архивирана' : trip.status}
            </span>
          </div>
        </div>

        {trip.description && (
          <div className="mb-4">
            <strong>Описание:</strong>
            <p className="mt-2">{trip.description}</p>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => {
              setShowReserveForm(true);
              setShowCancelForm(false);
            }}
            className="btn-primary"
            disabled={(trip.availableSeats ?? 0) <= 0}
          >
            Запиши клиент
          </button>
          {activeReservations.length > 0 && (
            <button
              onClick={() => {
                setShowCancelForm(true);
                setShowReserveForm(false);
              }}
              className="btn-default"
            >
              Откажи резервация
            </button>
          )}
        </div>
      </div>

      {showReserveForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <h2 className="text-xl font-bold mb-4">Нова резервация</h2>
          <form onSubmit={handleReserveTrip}>
            <div className="mb-4">
              <label className="block mb-2">Име на клиента *</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={reserveFormData.customerName}
                onChange={e => setReserveFormData({...reserveFormData, customerName: e.target.value})}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block mb-2">Email</label>
              <input
                type="email"
                className="w-full p-2 border rounded"
                value={reserveFormData.customerEmail}
                onChange={e => setReserveFormData({...reserveFormData, customerEmail: e.target.value})}
              />
            </div>
            <div className="mb-4">
              <label className="block mb-2">Телефон</label>
              <input
                type="tel"
                className="w-full p-2 border rounded"
                value={reserveFormData.customerPhone}
                onChange={e => setReserveFormData({...reserveFormData, customerPhone: e.target.value})}
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">Потвърди</button>
              <button
                type="button"
                onClick={() => setShowReserveForm(false)}
                className="btn-default"
              >
                Отказ
              </button>
            </div>
          </form>
        </div>
      )}

      {showCancelForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <h2 className="text-xl font-bold mb-4">Отказ на резервация</h2>
          <form onSubmit={handleCancelReservation}>
            <div className="mb-4">
              <label className="block mb-2">Избери резервация</label>
              <select
                className="w-full p-2 border rounded"
                value={cancelFormData.reservationIndex}
                onChange={e => setCancelFormData({...cancelFormData, reservationIndex: e.target.value})}
                required
              >
                <option value="">-- Избери --</option>
                {allReservations.map((record, index) => {
                  if (record.cancelledAt) return null;
                  return (
                    <option key={index} value={index}>
                      {record.customerName} ({record.customerEmail || record.customerPhone || 'без контакт'}) - 
                      Записан на: {formatDate(record.reservedAt)}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">Потвърди отказ</button>
              <button
                type="button"
                onClick={() => setShowCancelForm(false)}
                className="btn-default"
              >
                Отказ
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">История на резервациите</h2>
        {allReservations.length === 0 ? (
          <p className="text-gray-500">Няма записи за резервации</p>
        ) : (
          <table className="basic w-full">
            <thead>
              <tr>
                <td>Име</td>
                <td>Email</td>
                <td>Телефон</td>
                <td>Дата на резервация</td>
                <td>Дата на отказ</td>
                <td>Статус</td>
              </tr>
            </thead>
            <tbody>
              {allReservations.map((record, index) => (
                <tr key={index}>
                  <td>{record.customerName}</td>
                  <td>{record.customerEmail || '-'}</td>
                  <td>{record.customerPhone || '-'}</td>
                  <td>{formatDate(record.reservedAt)}</td>
                  <td>{record.cancelledAt ? formatDate(record.cancelledAt) : '-'}</td>
                  <td>
                    <span className={`px-2 py-1 rounded ${
                      record.cancelledAt 
                        ? 'bg-gray-100 text-gray-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {record.cancelledAt ? 'Отменена' : 'Активна'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}

