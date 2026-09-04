import Layout from "@/components/Layout";
import {useEffect, useState} from "react";
import axios from "axios";
import Spinner from "@/components/Spinner";
import { withSwal } from 'react-sweetalert2';
import Image from "next/image";

function parentIdOf(category) {
  if (!category?.parent) return '';
  return category.parent._id || category.parent;
}

function Categories({swal}) {
  const [editedCategory, setEditedCategory] = useState(null);
  const [name,setName] = useState('');
  const [parentCategory,setParentCategory] = useState('');
  const [navOrder,setNavOrder] = useState(0);
  const [categories,setCategories] = useState([]);
  const [properties,setProperties] = useState([]);
  const [image,setImage] = useState('');
  const [isUploading,setIsUploading] = useState(false);
  const [saveError,setSaveError] = useState('');

  useEffect(() => {
    fetchCategories();
  }, [])
  function fetchCategories() {
    axios.get('/api/categories').then(result => {
      setCategories(result.data);
    });
  }

  const roots = categories
    .filter(c => !c.parent)
    .sort((a, b) => (a.navOrder || 0) - (b.navOrder || 0) || a.name.localeCompare(b.name));

  function childrenOf(rootId) {
    return categories
      .filter(c => parentIdOf(c) === rootId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  const treeRows = roots.flatMap(root => [
    {category: root, isRoot: true},
    ...childrenOf(root._id).map(child => ({category: child, isRoot: false})),
  ]);

  function resetForm() {
    setEditedCategory(null);
    setName('');
    setParentCategory('');
    setNavOrder(0);
    setProperties([]);
    setImage('');
    setSaveError('');
  }

  async function saveCategory(ev){
    ev.preventDefault();
    setSaveError('');
    if (!name || !name.trim()) {
      setSaveError('Моля, въведете име на отдела или подкатегорията');
      return;
    }
    const data = {
      name: name.trim(),
      parentCategory,
      image,
      navOrder: parentCategory ? 0 : Number(navOrder || 0),
      properties:properties.map(p => ({
        name:p.name,
        values:p.values.split(','),
      })),
    };
    try {
      if (editedCategory) {
        data._id = editedCategory._id;
        await axios.put('/api/categories', data);
      } else {
        await axios.post('/api/categories', data);
      }
      resetForm();
      fetchCategories();
    } catch (error) {
      setSaveError(error.response?.data?.error || 'Грешка при запис на категорията');
    }
  }
  function editCategory(category){
    setEditedCategory(category);
    setName(category.name);
    setParentCategory(parentIdOf(category));
    setNavOrder(category.navOrder || 0);
    setImage(category.image || '');
    setSaveError('');
    setProperties(
      (category.properties || []).map(({name,values}) => ({
      name,
      values:values.join(',')
    }))
    );
  }
  function deleteCategory(category){
    swal.fire({
      title: 'Сигурни ли сте?',
      text: `Искате ли да изтриете ${category.name}?`,
      showCancelButton: true,
      cancelButtonText: 'Отказ',
      confirmButtonText: 'Да, изтрий!',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#4b5563',
      reverseButtons: true,
    }).then(async result => {
      if (result.isConfirmed) {
        const {_id} = category;
        try {
          await axios.delete('/api/categories?_id='+_id);
          fetchCategories();
        } catch (error) {
          swal.fire({
            icon: 'error',
            title: 'Не може да се изтрие',
            text: error.response?.data?.error || 'Грешка при изтриване',
          });
        }
      }
    });
  }

  async function saveRootOrder(root, nextOrder) {
    try {
      await axios.put('/api/categories', {
        _id: root._id,
        name: root.name,
        parentCategory: '',
        image: root.image || '',
        navOrder: Number(nextOrder || 0),
        properties: root.properties || [],
      });
      fetchCategories();
    } catch (error) {
      swal.fire({
        icon: 'error',
        title: 'Грешка',
        text: error.response?.data?.error || 'Неуспешна промяна на реда',
      });
    }
  }

  function addProperty() {
    setProperties(prev => {
      return [...prev, {name:'',values:''}];
    });
  }
  function handlePropertyNameChange(index,property,newName) {
    setProperties(prev => {
      const properties = [...prev];
      properties[index].name = newName;
      return properties;
    });
  }
  function handlePropertyValuesChange(index,property,newValues) {
    setProperties(prev => {
      const properties = [...prev];
      properties[index].values = newValues;
      return properties;
    });
  }
  function removeProperty(indexToRemove) {
    setProperties(prev => {
      return [...prev].filter((p,pIndex) => {
        return pIndex !== indexToRemove;
      });
    });
  }
  const isEditingRoot = editedCategory && !editedCategory.parent;
  const creatingRoot = !parentCategory;

  return (
    <Layout>
      <h1>Категории</h1>
      <p className="text-gray-500 text-sm mb-4">
        Корен без родител = отдел (Парфюми, Козметика, Бижута). Дете = подкатегория, където живеят продуктите.
        Трето ниво не е позволено. Редът на отделите в менюто се задава с число (navOrder).
      </p>
      <label>
        {editedCategory
          ? `Редактирай ${isEditingRoot ? 'отдел' : 'подкатегория'} ${editedCategory.name}`
          : creatingRoot
            ? 'Създай нов отдел'
            : 'Създай нова подкатегория'}
      </label>
      {saveError && (
        <div className="mb-2 text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 text-sm">
          {saveError}
        </div>
      )}
      <form onSubmit={saveCategory}>
        <div className="flex gap-1">
          <input
            type="text"
            placeholder={creatingRoot ? 'Име на отдела' : 'Име на подкатегорията'}
            onChange={ev => setName(ev.target.value)}
            value={name}/>
          <select
                  onChange={ev => setParentCategory(ev.target.value)}
                  value={parentCategory}>
            <option value="">Няма родител (нов отдел)</option>
            {roots.map(category => (
              <option key={category._id} value={category._id}>{category.name}</option>
            ))}
          </select>
        </div>
        {creatingRoot && (
          <div className="mb-2">
            <label className="block">Ред в менюто (navOrder)</label>
            <input
              type="number"
              min="0"
              value={navOrder}
              onChange={ev => setNavOrder(ev.target.value)}
              placeholder="1 = Парфюми, 2 = Козметика, 3 = Бижута"
            />
          </div>
        )}
        <div className="mb-2">
          <label className="block mb-1">Снимка</label>
          <div className="mb-2 flex flex-wrap gap-2 items-center">
            {image && (
              <div className="relative h-24 w-24 bg-white p-1 shadow-sm rounded border border-gray-200 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setImage('')}
                  className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full bg-red-600 text-white text-xs shadow z-10"
                  title="Изтрий снимката"
                >
                  ×
                </button>
                <Image
                  src={image}
                  alt=""
                  width={96}
                  height={96}
                  className="h-full w-full rounded object-cover"
                  unoptimized={image?.includes('s3.amazonaws.com') || image?.includes('s3.eu-central-1.amazonaws.com')}
                />
              </div>
            )}
            {isUploading && (
              <div className="h-24 flex items-center">
                <Spinner />
              </div>
            )}
          </div>
          <label className="w-48 h-24 cursor-pointer text-center flex flex-col items-center justify-center text-sm gap-1 text-primary rounded-sm bg-white shadow-sm border border-primary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <div>Качи снимка</div>
            <input type="file" onChange={async ev => {
              const files = ev.target?.files;
              if (files?.length > 0) {
                setIsUploading(true);
                const data = new FormData();
                for (const file of files) {
                  data.append('file', file);
                }
                const res = await axios.post('/api/upload', data);
                setImage(res.data.links?.[0] || '');
                setIsUploading(false);
              }
            }} className="hidden" />
          </label>
        </div>
        <div className="mb-2">
          <label className="block">Свойства</label>
          <button
            onClick={addProperty}
            type="button"
            className="btn-default text-sm mb-2">
            Добави ново свойство
          </button>
          {properties.length > 0 && properties.map((property,index) => (
            <div key={index} className="flex gap-1 mb-2">
              <input type="text"
                     value={property.name}
                     className="mb-0"
                     onChange={ev => handlePropertyNameChange(index,property,ev.target.value)}
                     placeholder="име на свойството (пример: ароматно семейство)"/>
              <input type="text"
                     className="mb-0"
                     onChange={ev =>
                       handlePropertyValuesChange(
                         index,
                         property,ev.target.value
                       )}
                     value={property.values}
                     placeholder="стойности, разделени със запетая"/>
              <button
                onClick={() => removeProperty(index)}
                type="button"
                className="btn-red">
                Премахни
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-1">
          {editedCategory && (
            <button
              type="button"
              onClick={resetForm}
              className="btn-default">Отказ</button>
          )}
          <button type="submit"
                  className="btn-primary py-1">
            Запази
          </button>
        </div>
      </form>
      {!editedCategory && (
        <table className="basic mt-4">
          <thead>
          <tr>
            <td>Име</td>
            <td>Тип</td>
            <td>Снимка</td>
            <td>Ред в менюто</td>
            <td></td>
          </tr>
          </thead>
          <tbody>
          {treeRows.map(({category, isRoot}) => (
            <tr key={category._id}>
              <td>
                <span className={isRoot ? 'font-semibold' : 'pl-6 inline-block'}>
                  {isRoot ? category.name : `↳ ${category.name}`}
                </span>
              </td>
              <td>{isRoot ? 'Отдел' : 'Подкатегория'}</td>
              <td>
                {category.image && (
                  <Image
                    src={category.image}
                    alt=""
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded object-cover"
                  />
                )}
              </td>
              <td>
                {isRoot ? (
                  <input
                    type="number"
                    min="0"
                    className="mb-0 w-20"
                    defaultValue={category.navOrder || 0}
                    onBlur={ev => {
                      const next = Number(ev.target.value || 0);
                      if (next !== (category.navOrder || 0)) {
                        saveRootOrder(category, next);
                      }
                    }}
                  />
                ) : (
                  '—'
                )}
              </td>
              <td>
                <button
                  onClick={() => editCategory(category)}
                  className="btn-default mr-1"
                >
                  Редактирай
                </button>
                <button
                  onClick={() => deleteCategory(category)}
                  className="btn-red">Изтрий</button>
              </td>
            </tr>
          ))}
          </tbody>
        </table>
      )}
    </Layout>
  );
}

export default withSwal(({swal}, ref) => (
  <Categories swal={swal} />
));
