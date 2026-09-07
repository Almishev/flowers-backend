import Layout from "@/components/Layout";
import Link from "next/link";
import {useEffect, useMemo, useState} from "react";
import axios from "axios";

const PAGE_SIZE = 20;

function parentIdOf(category) {
  if (!category?.parent) return '';
  return typeof category.parent === 'object' ? (category.parent._id || '') : category.parent;
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    axios.get('/api/categories').then((res) => {
      setCategories(Array.isArray(res.data) ? res.data : []);
    }).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const delay = search.trim() ? 300 : 0;
    const timer = setTimeout(() => {
      setLoading(true);
      axios.get('/api/products', {
        params: {
          page,
          limit: PAGE_SIZE,
          search: search.trim() || undefined,
          department: departmentId || undefined,
          subcategory: subcategoryId || undefined,
          stock: stockFilter || undefined,
        },
        signal: controller.signal,
      }).then((res) => {
        setProducts(res.data?.products || []);
        setTotalCount(res.data?.totalCount || 0);
        setTotalPages(res.data?.totalPages || 1);
        if (res.data?.page && res.data.page !== page) setPage(res.data.page);
      }).catch((error) => {
        if (error.code === 'ERR_CANCELED' || error.name === 'CanceledError') return;
        setProducts([]);
        setTotalCount(0);
        setTotalPages(1);
      }).finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    }, delay);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, departmentId, subcategoryId, stockFilter, page]);

  const departments = useMemo(
    () => categories
      .filter((cat) => !cat.parent)
      .sort((a, b) => (a.navOrder || 0) - (b.navOrder || 0) || String(a.name).localeCompare(b.name, 'bg')),
    [categories]
  );

  const subcategories = useMemo(
    () => categories
      .filter((cat) => departmentId && parentIdOf(cat) === departmentId)
      .sort((a, b) => String(a.name).localeCompare(b.name, 'bg')),
    [categories, departmentId]
  );

  const currentPage = Math.min(page, totalPages);
  const from = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, totalCount);
  const hasFilters = !!(search.trim() || departmentId || subcategoryId || stockFilter);

  function clearFilters() {
    setSearch('');
    setDepartmentId('');
    setSubcategoryId('');
    setStockFilter('');
    setPage(1);
  }

  return (
    <Layout>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="mb-0">Продукти</h1>
        <Link className="btn-primary" href={'/products/new'}>Добави нов продукт</Link>
      </div>

      <div className="bg-white rounded-sm shadow-md p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label>Търсене</label>
            <input
              type="search"
              placeholder="Име или марка"
              value={search}
              onChange={(ev) => {
                setSearch(ev.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <label>Отдел</label>
            <select
              value={departmentId}
              onChange={(ev) => {
                setDepartmentId(ev.target.value);
                setSubcategoryId('');
                setPage(1);
              }}
            >
              <option value="">Всички отдели</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>{dept.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Подкатегория</label>
            <select
              value={subcategoryId}
              onChange={(ev) => {
                setSubcategoryId(ev.target.value);
                setPage(1);
              }}
              disabled={!departmentId || subcategories.length === 0}
            >
              <option value="">Всички подкатегории</option>
              {subcategories.map((cat) => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Наличност</label>
            <select
              value={stockFilter}
              onChange={(ev) => {
                setStockFilter(ev.target.value);
                setPage(1);
              }}
            >
              <option value="">Всички</option>
              <option value="in">В наличност</option>
              <option value="low">Под 3 бр.</option>
              <option value="out">Изчерпани</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 mt-1">
          <p className="text-sm text-gray-500 m-0">
            {loading
              ? 'Зареждане...'
              : `Показани ${from}–${to} от ${totalCount}`}
          </p>
          {hasFilters && (
            <button type="button" className="btn-default" onClick={clearFilters}>
              Изчисти филтрите
            </button>
          )}
        </div>
      </div>

      <table className="basic mt-2">
        <thead>
          <tr>
            <td>Име на продукта</td>
            <td>Марка</td>
            <td>Обем</td>
            <td>Категория</td>
            <td>Наличност</td>
            <td></td>
          </tr>
        </thead>
        <tbody>
          {!loading && products.length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-gray-500">
                Няма продукти по избраните филтри.
              </td>
            </tr>
          )}
          {products.map(product => (
            <tr key={product._id}>
              <td>{product.title}</td>
              <td>{product.brand || '—'}</td>
              <td>{product.volume || '—'}</td>
              <td>{product.category?.name || '—'}</td>
              <td className={(product.stock ?? 0) <= 0 ? 'text-red-600 font-semibold' : ''}>
                {product.stock ?? 0}
              </td>
              <td>
                <Link className="btn-default" href={'/products/edit/'+product._id}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                  Редактирай
                </Link>
                <Link className="btn-red" href={'/products/delete/'+product._id}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  Изтрий
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            type="button"
            className="btn-default"
            disabled={currentPage <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Назад
          </button>
          <span className="text-sm text-gray-600">
            Страница {currentPage} от {totalPages}
          </span>
          <button
            type="button"
            className="btn-default"
            disabled={currentPage >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Напред
          </button>
        </div>
      )}
    </Layout>
  );
}
