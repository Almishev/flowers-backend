import Layout from "@/components/Layout";
import Link from "next/link";
import {useEffect, useState} from "react";
import axios from "axios";
import {useRouter} from "next/router";
import { withSwal } from 'react-sweetalert2';

function Trips({swal}) {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(router.query.search || '');
  const [statusFilter, setStatusFilter] = useState(router.query.status || '');
  const [sortBy, setSortBy] = useState(router.query.sortBy || '_id');
  const [sortOrder, setSortOrder] = useState(router.query.sortOrder || 'desc');
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    totalCount: 0,
  });

  const currentPage = parseInt(router.query.page) || 1;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchProducts();
  }, [currentPage, router.query.search, router.query.status, router.query.sortBy, router.query.sortOrder]);

  function fetchProducts() {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', currentPage);
    params.set('limit', '30');
    if (searchTerm) {
      params.set('search', searchTerm);
    }
    if (statusFilter) {
      params.set('status', statusFilter);
    }
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);

    axios.get('/api/trips?' + params.toString()).then(response => {
      setProducts(response.data.products || []);
      setPagination(response.data.pagination || {
        page: 1,
        totalPages: 1,
        totalCount: 0,
      });
      setLoading(false);
    }).catch(error => {
      console.error('Error fetching products:', error);
      setLoading(false);
    });
  }

  function handleSort(column) {
    const newSortOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortBy(column);
    setSortOrder(newSortOrder);
    
    const params = new URLSearchParams();
    if (searchTerm) {
      params.set('search', searchTerm);
    }
    if (statusFilter) {
      params.set('status', statusFilter);
    }
    params.set('sortBy', column);
    params.set('sortOrder', newSortOrder);
    params.set('page', '1');
    router.push('/trips?' + params.toString());
  }

  function handleSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm) {
      params.set('search', searchTerm);
    }
    if (statusFilter) {
      params.set('status', statusFilter);
    }
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);
    params.set('page', '1'); // Reset to page 1 on new search
    router.push('/trips?' + params.toString());
  }

  function handleStatusChange(newStatus) {
    setStatusFilter(newStatus);
    const params = new URLSearchParams();
    if (searchTerm) {
      params.set('search', searchTerm);
    }
    if (newStatus) {
      params.set('status', newStatus);
    }
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);
    params.set('page', '1'); // Reset to page 1 on filter change
    router.push('/trips?' + params.toString());
  }

  function handlePageChange(newPage) {
    const params = new URLSearchParams();
    if (searchTerm) {
      params.set('search', searchTerm);
    }
    if (statusFilter) {
      params.set('status', statusFilter);
    }
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);
    if (newPage > 1) {
      params.set('page', newPage);
    }
    router.push('/trips?' + params.toString());
  }

  const [archiving, setArchiving] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  async function handleArchivePast() {
    const result = await swal.fire({
      title: 'Сигурни ли сте?',
      text: 'Искате ли да архивирате минали екскурзии без резервации?',
      showCancelButton: true,
      cancelButtonText: 'Отказ',
      confirmButtonText: 'Да, архивирай!',
      confirmButtonColor: '#2563eb', // Синьо (blue-600)
      cancelButtonColor: '#4b5563', // Тъмно сиво (gray-600)
      reverseButtons: true,
    });
    
    if (!result.isConfirmed) {
      return;
    }
    
    setArchiving(true);
    try {
      const response = await axios.post('/api/trips/archive-past');
      await swal.fire({
        title: 'Успешно!',
        text: response.data.message,
        icon: 'success',
        confirmButtonColor: '#2563eb',
      });
      fetchProducts(); // Обновяваме списъка
    } catch (error) {
      await swal.fire({
        title: 'Грешка!',
        text: 'Грешка при архивиране: ' + (error.response?.data?.message || error.message),
        icon: 'error',
        confirmButtonColor: '#dc2626',
      });
    } finally {
      setArchiving(false);
    }
  }

  async function handleCleanupArchived() {
    const result = await swal.fire({
      title: 'ВНИМАНИЕ!',
      html: 'Това ще изтрие <strong>ПЕРМАНЕНТНО</strong> архивираните екскурзии без резервации!<br><br>Сигурни ли сте?',
      icon: 'warning',
      showCancelButton: true,
      cancelButtonText: 'Отказ',
      confirmButtonText: 'Да, изтрий!',
      confirmButtonColor: '#dc2626', // Тъмно червено (red-600)
      cancelButtonColor: '#4b5563', // Тъмно сиво (gray-600)
      reverseButtons: true,
    });
    
    if (!result.isConfirmed) {
      return;
    }
    
    setCleaning(true);
    try {
      const response = await axios.post('/api/trips/cleanup-archived');
      await swal.fire({
        title: 'Успешно!',
        text: response.data.message,
        icon: 'success',
        confirmButtonColor: '#2563eb',
      });
      fetchProducts(); // Обновяваме списъка
    } catch (error) {
      await swal.fire({
        title: 'Грешка!',
        text: 'Грешка при изтриване: ' + (error.response?.data?.message || error.message),
        icon: 'error',
        confirmButtonColor: '#dc2626',
      });
    } finally {
      setCleaning(false);
    }
  }

  return (
    <Layout>
      <div className="mb-4 flex gap-2 flex-wrap items-center">
        <Link className="btn-primary" href={'/trips/new'}>Добави нова екскурзия</Link>
        <button
          onClick={handleArchivePast}
          disabled={archiving}
          className="btn-default"
          title="Архивира минали екскурзии без резервации"
        >
          {archiving ? 'Архивиране...' : '📦 Архивирай минали'}
        </button>
        <button
          onClick={handleCleanupArchived}
          disabled={cleaning}
          className="btn-default bg-red-100 hover:bg-red-200"
          title="Изтрива архивирани екскурзии без резервации (освобождава място)"
        >
          {cleaning ? 'Изтриване...' : '🗑️ Изтрий архивирани'}
        </button>
      </div>

      <div className="mb-4">
        <form onSubmit={handleSearch} className="flex gap-2 items-center flex-wrap">
          <input
            type="text"
            placeholder="Търси по име, държава, град..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 p-2 border rounded min-w-[200px]"
          />
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="">Всички активни</option>
            <option value="available">Има свободни места</option>
            <option value="no-seats">Няма свободни места</option>
            <option value="archived">Архивирани</option>
          </select>
          <button type="submit" className="btn-default">
            Търси
          </button>
          {(searchTerm || statusFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                router.push('/products');
              }}
              className="btn-default"
            >
              Изчисти
            </button>
          )}
        </form>
      </div>

      {(searchTerm || statusFilter) && (
        <div className="mb-2 text-sm text-gray-600">
          Намерени {pagination.totalCount} {pagination.totalCount === 1 ? 'екскурзия' : 'екскурзии'}
          {searchTerm && ` за "${searchTerm}"`}
          {statusFilter && ` (${statusFilter === 'available' ? 'Има свободни места' : 'Няма свободни места'})`}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Зареждане...</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="basic mt-2">
              <thead>
                <tr>
                  <td>
                    <button 
                      onClick={() => handleSort('title')}
                      className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                      style={{background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 'inherit'}}
                    >
                      Екскурзия
                      {sortBy === 'title' && (
                        <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </td>
                  <td>
                    <button 
                      onClick={() => handleSort('destinationCountry')}
                      className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                      style={{background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 'inherit'}}
                    >
                      Дестинация
                      {sortBy === 'destinationCountry' && (
                        <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </td>
                  <td>
                    <button 
                      onClick={() => handleSort('departureCity')}
                      className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                      style={{background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 'inherit'}}
                    >
                      Отпътуване от
                      {sortBy === 'departureCity' && (
                        <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </td>
                  <td>
                    <button 
                      onClick={() => handleSort('startDate')}
                      className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                      style={{background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 'inherit'}}
                    >
                      Начална дата
                      {sortBy === 'startDate' && (
                        <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </td>
                  <td>
                    <button 
                      onClick={() => handleSort('price')}
                      className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                      style={{background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 'inherit'}}
                    >
                      Цена
                      {sortBy === 'price' && (
                        <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </td>
                  <td>
                    <button 
                      onClick={() => handleSort('availableSeats')}
                      className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                      style={{background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 'inherit'}}
                    >
                      Свободни места
                      {sortBy === 'availableSeats' && (
                        <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </td>
                  <td>
                    <button 
                      onClick={() => handleSort('status')}
                      className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                      style={{background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 'inherit'}}
                    >
                      Статус
                      {sortBy === 'status' && (
                        <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </td>
                  <td></td>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4">
                      {searchTerm ? 'Няма намерени екскурзии.' : 'Няма екскурзии.'}
                    </td>
                  </tr>
                ) : (
                  products.map(trip => {
                    const formatDate = (dateString) => {
                      if (!dateString) return '-';
                      const date = new Date(dateString);
                      return date.toLocaleDateString('bg-BG', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric' 
                      });
                    };

                    const getStatusBadge = (status) => {
                      if (status === 'cancelled') {
                        return { text: 'Отменена', class: 'bg-red-100 text-red-800' };
                      } else if (status === 'archived') {
                        return { text: 'Архивирана', class: 'bg-gray-200 text-gray-600' };
                      } else if (status === 'published') {
                        return { text: 'Има записани', class: 'bg-green-100 text-green-800' };
                      } else if (status === 'draft') {
                        return { text: 'Няма записани', class: 'bg-blue-100 text-blue-800' };
                      }
                      return { text: status || 'Неизвестен', class: 'bg-gray-100 text-gray-800' };
                    };

                    const statusBadge = getStatusBadge(trip.status);
                    
                    // Проверяваме дали екскурзията е минала
                    const isPast = trip.endDate && new Date(trip.endDate) < new Date();
                    const rowClass = isPast && trip.status !== 'archived' ? 'bg-yellow-50' : '';

                    return (
                      <tr key={trip._id} className={rowClass}>
                        <td>
                          {trip.title}
                          {isPast && trip.status !== 'archived' && (
                            <span className="ml-2 text-xs text-orange-600" title="Минала екскурзия">
                              ⚠️
                            </span>
                          )}
                        </td>
                        <td>
                          {trip.destinationCountry || '-'}
                          {trip.destinationCity ? `, ${trip.destinationCity}` : ''}
                        </td>
                        <td>{trip.departureCity || '-'}</td>
                        <td>{formatDate(trip.startDate)}</td>
                        <td>
                          {typeof trip.price === 'number' 
                            ? `${trip.price.toFixed(2)} ${trip.currency || 'BGN'}` 
                            : '-'}
                        </td>
                        <td>{trip.availableSeats ?? 0} / {trip.maxSeats ?? 0}</td>
                        <td>
                          <span className={`px-2 py-1 rounded text-xs ${statusBadge.class}`}>
                            {statusBadge.text}
                          </span>
                        </td>
                        <td>
                      <Link className="btn-default" href={'/trips/'+trip._id}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Детайли
                      </Link>
                      <Link className="btn-default" href={'/trips/edit/'+trip._id}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                        Редактирай
                      </Link>
                      <Link className="btn-red" href={'/trips/delete/'+trip._id}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                        Изтрий
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="mt-4 flex justify-center items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="btn-default"
              >
                ← Назад
              </button>
              <span className="px-4">
                Страница {pagination.page} от {pagination.totalPages}
                {pagination.totalCount > 0 && (
                  <span className="text-gray-500 ml-2">
                    (Общо: {pagination.totalCount})
                  </span>
                )}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="btn-default"
              >
                Напред →
              </button>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}

export default withSwal(({swal}, ref) => (
  <Trips swal={swal} />
));