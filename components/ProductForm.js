import {useEffect, useState} from "react";
import {useRouter} from "next/router";
import axios from "axios";
import Spinner from "@/components/Spinner";
import {ReactSortable} from "react-sortablejs";

function categoryIdOf(value) {
  if (!value) return '';
  if (typeof value === 'object') return value._id || '';
  return value;
}

function parentIdOf(category) {
  if (!category?.parent) return '';
  return typeof category.parent === 'object' ? category.parent._id : category.parent;
}

function findRoot(categories, categoryId) {
  let cat = categories.find(c => c._id === categoryId);
  if (!cat) return null;
  const seen = new Set();
  while (parentIdOf(cat)) {
    if (seen.has(cat._id)) break;
    seen.add(cat._id);
    const next = categories.find(c => c._id === parentIdOf(cat));
    if (!next) break;
    cat = next;
  }
  return cat;
}

function isPerfumeDepartment(root) {
  if (!root) return false;
  const slug = (root.slug || '').toLowerCase();
  const name = (root.name || '').toLowerCase();
  return slug === 'parfyumi' || name === 'парфюми';
}

export default function ProductForm({
  _id,
  title:existingTitle,
  description:existingDescription,
  price:existingPrice,
  images:existingImages,
  category:assignedCategory,
  properties:assignedProperties,
  stock:existingStock,
  brand:existingBrand,
  volume:existingVolume,
  concentration:existingConcentration,
  gender:existingGender,
  scentFamily:existingScentFamily,
  topNotes:existingTopNotes,
  heartNotes:existingHeartNotes,
  baseNotes:existingBaseNotes,
}) {
  const [title,setTitle] = useState(existingTitle || '');
  const [description,setDescription] = useState(existingDescription || '');
  const [category,setCategory] = useState(categoryIdOf(assignedCategory));
  const [productProperties,setProductProperties] = useState(assignedProperties || {});
  const [price,setPrice] = useState(existingPrice || '');
  const [images,setImages] = useState(existingImages || []);
  const [stock,setStock] = useState(existingStock ?? 0);
  const [brand,setBrand] = useState(existingBrand || '');
  const [volume,setVolume] = useState(existingVolume || '');
  const [concentration,setConcentration] = useState(existingConcentration || '');
  const [gender,setGender] = useState(existingGender || '');
  const [scentFamily,setScentFamily] = useState(existingScentFamily || '');
  const [topNotes,setTopNotes] = useState(existingTopNotes || '');
  const [heartNotes,setHeartNotes] = useState(existingHeartNotes || '');
  const [baseNotes,setBaseNotes] = useState(existingBaseNotes || '');
  const [goToProducts,setGoToProducts] = useState(false);
  const [isUploading,setIsUploading] = useState(false);
  const [categories,setCategories] = useState([]);
  const [saveError,setSaveError] = useState('');
  const router = useRouter();

  useEffect(() => {
    axios.get('/api/categories').then(result => {
      setCategories(result.data);
    });
  }, []);

  const roots = categories
    .filter(c => !c.parent)
    .sort((a, b) => (a.navOrder || 0) - (b.navOrder || 0) || a.name.localeCompare(b.name));
  const childrenOf = (rootId) => categories.filter(c => parentIdOf(c) === rootId);
  const selectedRoot = findRoot(categories, category);
  const showPerfumeFields = isPerfumeDepartment(selectedRoot);

  async function saveProduct(ev) {
    ev.preventDefault();
    setSaveError('');
    const perfume = showPerfumeFields;
    const data = {
      title,
      description,
      brand,
      volume: perfume ? volume : '',
      concentration: perfume ? concentration : '',
      gender: perfume ? gender : '',
      scentFamily: perfume ? scentFamily : '',
      topNotes: perfume ? topNotes : '',
      heartNotes: perfume ? heartNotes : '',
      baseNotes: perfume ? baseNotes : '',
      price,
      images,
      category,
      stock,
      properties: productProperties,
    };
    try {
      if (_id) {
        await axios.put('/api/products', {...data,_id});
      } else {
        await axios.post('/api/products', data);
      }
      setGoToProducts(true);
    } catch (error) {
      setSaveError(error.response?.data?.error || 'Грешка при запис на продукта');
    }
  }

  if (goToProducts) {
    router.push('/products');
  }

  async function uploadImages(ev) {
    const files = ev.target?.files;
    if (files?.length > 0) {
      setIsUploading(true);
      const data = new FormData();
      for (const file of files) {
        data.append('file', file);
      }
      const res = await axios.post('/api/upload', data);
      setImages(oldImages => {
        return [...oldImages, ...res.data.links];
      });
      setIsUploading(false);
    }
  }

  function updateImagesOrder(images) {
    setImages(images);
  }

  function setProductProp(propName,value) {
    setProductProperties(prev => {
      const newProductProps = {...prev};
      newProductProps[propName] = value;
      return newProductProps;
    });
  }

  const propertiesToFill = [];
  if (categories.length > 0 && category) {
    let catInfo = categories.find(({_id}) => _id === category);
    if (catInfo) {
      propertiesToFill.push(...(catInfo.properties || []));
      while (parentIdOf(catInfo)) {
        const parentCat = categories.find(({_id}) => _id === parentIdOf(catInfo));
        if (!parentCat) break;
        propertiesToFill.push(...(parentCat.properties || []));
        catInfo = parentCat;
      }
    }
  }

  return (
    <form onSubmit={saveProduct}>
      {saveError && (
        <div className="mb-2 text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 text-sm">
          {saveError}
        </div>
      )}
      <label>Име на продукта</label>
      <input
        type="text"
        placeholder="напр. Chanel N°5 Eau de Parfum"
        value={title}
        onChange={ev => setTitle(ev.target.value)}
        required
      />

      <label>Марка</label>
      <input
        type="text"
        placeholder="напр. Chanel, Dior, Versace"
        value={brand}
        onChange={ev => setBrand(ev.target.value)}
      />

      <label>Категория</label>
      <select
        value={category}
        onChange={ev => setCategory(ev.target.value)}
        required
      >
        <option value="">Избери категория</option>
        {roots.map(root => {
          const children = childrenOf(root._id);
          if (children.length === 0) {
            return (
              <option key={root._id} value={root._id}>
                {root.name}
              </option>
            );
          }
          return (
            <optgroup key={root._id} label={root.name}>
              {children.map(leaf => (
                <option key={leaf._id} value={leaf._id}>{leaf.name}</option>
              ))}
            </optgroup>
          );
        })}
      </select>

      {showPerfumeFields && (
        <>
          <label>За кого е</label>
          <select
            value={gender}
            onChange={ev => setGender(ev.target.value)}
          >
            <option value="">Не е посочено</option>
            <option value="Дамски">Дамски</option>
            <option value="Мъжки">Мъжки</option>
            <option value="Унисекс">Унисекс</option>
          </select>

          <label>Концентрация</label>
          <select
            value={concentration}
            onChange={ev => setConcentration(ev.target.value)}
          >
            <option value="">Не е посочено</option>
            <option value="Parfum">Parfum</option>
            <option value="Eau de Parfum">Eau de Parfum</option>
            <option value="Eau de Toilette">Eau de Toilette</option>
            <option value="Eau de Cologne">Eau de Cologne</option>
            <option value="Body mist">Body mist</option>
          </select>

          <label>Обем</label>
          <select
            value={volume}
            onChange={ev => setVolume(ev.target.value)}
          >
            <option value="">Не е посочено</option>
            <option value="30 ml">30 ml</option>
            <option value="50 ml">50 ml</option>
            <option value="75 ml">75 ml</option>
            <option value="100 ml">100 ml</option>
            <option value="125 ml">125 ml</option>
            <option value="150 ml">150 ml</option>
            <option value="200 ml">200 ml</option>
          </select>

          <label>Ароматно семейство</label>
          <select
            value={scentFamily}
            onChange={ev => setScentFamily(ev.target.value)}
          >
            <option value="">Не е посочено</option>
            <option value="Цитрусов">Цитрусов</option>
            <option value="Цветен">Цветен</option>
            <option value="Дървесен">Дървесен</option>
            <option value="Ориенталски">Ориенталски</option>
            <option value="Фужерен">Фужерен</option>
            <option value="Ориенталско-фужерен">Ориенталско-фужерен</option>
            <option value="Шипър">Шипър</option>
            <option value="Ароматен">Ароматен</option>
            <option value="Кожен">Кожен</option>
            <option value="Воден">Воден</option>
          </select>

          <label>Връхни нотки</label>
          <input
            type="text"
            placeholder="напр. бергамот, лимон, розов пипер"
            value={topNotes}
            onChange={ev => setTopNotes(ev.target.value)}
          />

          <label>Сърдечни нотки</label>
          <input
            type="text"
            placeholder="напр. лавандула, жасмин, пипер"
            value={heartNotes}
            onChange={ev => setHeartNotes(ev.target.value)}
          />

          <label>Базови нотки</label>
          <input
            type="text"
            placeholder="напр. кедър, амбра, ветивер"
            value={baseNotes}
            onChange={ev => setBaseNotes(ev.target.value)}
          />
        </>
      )}

      <label>Наличност (бр.)</label>
      <input
        type="number"
        min="0"
        value={stock}
        onChange={ev => setStock(parseInt(ev.target.value || '0',10))}
      />

      {propertiesToFill.length > 0 && propertiesToFill.map((p, index) => (
        <div key={p._id || `${p.name}-${index}`} className="">
          <label>{p.name[0].toUpperCase()+p.name.substring(1)}</label>
          <div>
            <select
              value={productProperties[p.name]}
              onChange={ev => setProductProp(p.name,ev.target.value)}
            >
              {p.values.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>
      ))}

      <label>Снимки</label>
      <div className="mb-2 flex flex-wrap gap-1">
        <ReactSortable
          list={images}
          className="flex flex-wrap gap-1"
          setList={updateImagesOrder}
        >
          {!!images?.length && images.map(link => (
            <div
              key={link}
              className="relative h-24 bg-white p-4 shadow-sm rounded-sm border border-gray-200"
            >
              <button
                type="button"
                onClick={() => setImages(old => old.filter(img => img !== link))}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center shadow"
                title="Изтрий снимката"
              >
                ×
              </button>
              <img src={link} alt="" className="rounded-lg h-full w-auto object-cover"/>
            </div>
          ))}
        </ReactSortable>
        {isUploading && (
          <div className="h-24 flex items-center">
            <Spinner />
          </div>
        )}
        <label className="w-24 h-24 cursor-pointer text-center flex flex-col items-center justify-center text-sm gap-1 text-primary rounded-sm bg-white shadow-sm border border-primary">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <div>
            Добави снимка
          </div>
          <input type="file" onChange={uploadImages} className="hidden"/>
        </label>
      </div>

      <label>Описание</label>
      <textarea
        placeholder="напр. Свеж цитрусов аромат за мъже, подходящ за ежедневие и офис. 2–3 изречения."
        value={description}
        onChange={ev => setDescription(ev.target.value)}
      />

      <label>Цена (в EUR)</label>
      <input
        type="number"
        placeholder="цена"
        value={price}
        onChange={ev => setPrice(ev.target.value)}
      />

      <button
        type="submit"
        className="btn-primary"
      >
        Запази
      </button>
    </form>
  );
}
