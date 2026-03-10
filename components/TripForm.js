import {useEffect, useState} from "react";
import {useRouter} from "next/router";
import Image from "next/image";
import axios from "axios";
import Spinner from "@/components/Spinner";
import {ReactSortable} from "react-sortablejs";

// Форма за екскурзия (Trip), базирана на новия модел
export default function TripForm({
  _id,
  title: existingTitle,
  description: existingDescription,
  destinationCountry: existingDestinationCountry,
  destinationCity: existingDestinationCity,
  departureCity: existingDepartureCity,
  startDate: existingStartDate,
  endDate: existingEndDate,
  durationDays: existingDurationDays,
  price: existingPrice,
  currency: existingCurrency,
  travelType: existingTravelType,
  maxSeats: existingMaxSeats,
  availableSeats: existingAvailableSeats,
  isFeatured: existingIsFeatured,
  images: existingImages,
  category: assignedCategory,
  properties: assignedProperties,
  status: existingStatus,
}) {
  const [title, setTitle] = useState(existingTitle || "");
  const [description, setDescription] = useState(existingDescription || "");

  const [destinationCountry, setDestinationCountry] = useState(existingDestinationCountry || "");
  const [destinationCity, setDestinationCity] = useState(existingDestinationCity || "");
  const [departureCity, setDepartureCity] = useState(existingDepartureCity || "");

  const [startDate, setStartDate] = useState(
    existingStartDate ? new Date(existingStartDate).toISOString().slice(0, 10) : ""
  );
  const [endDate, setEndDate] = useState(
    existingEndDate ? new Date(existingEndDate).toISOString().slice(0, 10) : ""
  );
  const [durationDays, setDurationDays] = useState(existingDurationDays ?? "");

  const [price, setPrice] = useState(existingPrice ?? "");
  const [currency, setCurrency] = useState(existingCurrency || "BGN");
  const [travelType, setTravelType] = useState(existingTravelType || "excursion");

  const [maxSeats, setMaxSeats] = useState(existingMaxSeats ?? 0);
  const [availableSeats, setAvailableSeats] = useState(
    existingAvailableSeats ?? existingMaxSeats ?? 0
  );

  const [isFeatured, setIsFeatured] = useState(!!existingIsFeatured);

  const [category, setCategory] = useState(assignedCategory || "");
  const [tripProperties, setTripProperties] = useState(assignedProperties || {});
  // Филтрираме невалидни снимки при инициализация
  const validImages = (existingImages || []).filter(
    link => link && typeof link === 'string' && link.trim() !== ''
  );
  const [images, setImages] = useState(validImages);
  const [status, setStatus] = useState(existingStatus || "draft");
  const [goToTrips, setGoToTrips] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [categories, setCategories] = useState([]);
  const router = useRouter();

  useEffect(() => {
    axios.get("/api/categories").then(result => {
      setCategories(result.data);
    });
  }, []);

  // Обновяваме images когато existingImages се промени (при зареждане на данните)
  useEffect(() => {
    if (existingImages) {
      const validImages = existingImages.filter(
        link => link && typeof link === 'string' && link.trim() !== ''
      );
      setImages(validImages);
    }
  }, [existingImages]);

  function handleMaxSeatsChange(value) {
    const parsed = parseInt(value || "0", 10);
    const safeMax = Number.isNaN(parsed) ? 0 : parsed;
    setMaxSeats(safeMax);
    // Ако availableSeats не е ръчно пипан, пазим го в рамките на maxSeats
    if (availableSeats > safeMax) {
      setAvailableSeats(safeMax);
    }
  }

  async function saveTrip(ev) {
    ev.preventDefault();

    const data = {
      title,
      description,
      destinationCountry,
      destinationCity,
      departureCity,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      durationDays: durationDays ? Number(durationDays) : undefined,
      price: price ? Number(price) : 0,
      currency,
      travelType,
      maxSeats: maxSeats ? Number(maxSeats) : 0,
      availableSeats: availableSeats ? Number(availableSeats) : 0,
      isFeatured,
      images,
      category,
      properties: tripProperties,
      status: status || "draft",
    };

    if (_id) {
      await axios.put("/api/trips", {...data, _id});
    } else {
      await axios.post("/api/trips", data);
    }
    setGoToTrips(true);
  }

  if (goToTrips) {
    router.push("/trips");
  }

  async function uploadImages(ev) {
    const files = ev.target?.files;
    if (files?.length > 0) {
      setIsUploading(true);
      const data = new FormData();
      for (const file of files) {
        data.append("file", file);
      }
      const res = await axios.post("/api/upload", data);
      setImages(oldImages => {
        return [...oldImages, ...res.data.links];
      });
      setIsUploading(false);
    }
  }

  function updateImagesOrder(images) {
    setImages(images);
  }

  function setTripProp(propName, value) {
    setTripProperties(prev => {
      const newProps = {...prev};
      newProps[propName] = value;
      return newProps;
    });
  }

  const propertiesToFill = [];
  if (categories.length > 0 && category) {
    let catInfo = categories.find(({_id}) => _id === category);
    if (catInfo) {
      propertiesToFill.push(...(catInfo.properties || []));
      while (catInfo?.parent?._id) {
        const parentCat = categories.find(({_id}) => _id === catInfo?.parent?._id);
        if (!parentCat) break;
        propertiesToFill.push(...(parentCat.properties || []));
        catInfo = parentCat;
      }
    }
  }

  return (
    <form onSubmit={saveTrip}>
      <label>Име на екскурзията</label>
      <input
        type="text"
        placeholder="Пример: Уикенд в Истанбул"
        value={title}
        onChange={ev => setTitle(ev.target.value)}
        required
      />

      <label>Държава на дестинацията</label>
      <input
        type="text"
        placeholder="Пример: Турция"
        value={destinationCountry}
        onChange={ev => setDestinationCountry(ev.target.value)}
        required
      />

      <label>Град / регион на дестинацията</label>
      <input
        type="text"
        placeholder="Пример: Истанбул"
        value={destinationCity}
        onChange={ev => setDestinationCity(ev.target.value)}
      />

      <label>Град на отпътуване</label>
      <input
        type="text"
        placeholder="Пример: София"
        value={departureCity}
        onChange={ev => setDepartureCity(ev.target.value)}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div>
          <label>Начална дата</label>
          <input
            type="date"
            value={startDate}
            onChange={ev => setStartDate(ev.target.value)}
            required
          />
        </div>
        <div>
          <label>Крайна дата</label>
          <input
            type="date"
            value={endDate}
            onChange={ev => setEndDate(ev.target.value)}
            required
          />
        </div>
        <div>
          <label>Продължителност (дни)</label>
          <input
            type="number"
            min="0"
            value={durationDays}
            onChange={ev => setDurationDays(ev.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div>
          <label>Цена</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={ev => setPrice(ev.target.value)}
            required
          />
        </div>
        <div>
          <label>Валута</label>
          <input
            type="text"
            value={currency}
            onChange={ev => setCurrency(ev.target.value.toUpperCase())}
          />
        </div>
        <div>
          <label>Тип пътуване</label>
          <select
            value={travelType}
            onChange={ev => setTravelType(ev.target.value)}
          >
            <option value="excursion">Екскурзия</option>
            <option value="vacation">Почивка</option>
            <option value="city-break">City break</option>
            <option value="other">Друго</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div>
          <label>Максимален брой места</label>
          <input
            type="number"
            min="0"
            value={maxSeats}
            onChange={ev => handleMaxSeatsChange(ev.target.value)}
          />
        </div>
        <div>
          <label>Свободни места</label>
          <input
            type="number"
            min="0"
            max={maxSeats || undefined}
            value={availableSeats}
            onChange={ev => setAvailableSeats(parseInt(ev.target.value || "0", 10))}
          />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input
            id="isFeatured"
            type="checkbox"
            checked={isFeatured}
            onChange={ev => setIsFeatured(ev.target.checked)}
          />
          <label htmlFor="isFeatured" className="mb-0">
            Акцентна екскурзия
          </label>
        </div>
      </div>

      <div>
        <label>Статус</label>
        <select
          value={status}
          onChange={ev => setStatus(ev.target.value)}
        >
          <option value="draft">Няма записани</option>
          <option value="published">Има записани</option>
          <option value="cancelled">Отменена</option>
          <option value="archived">Архивирана</option>
        </select>
        <small className="text-gray-500 block mt-1">
          <strong>Няма записани (draft)</strong> - няма активни резервации (автоматично се променя при първа резервация на &quot;Има записани&quot;)<br/>
          <strong>Има записани (published)</strong> - има поне една активна резервация (автоматично се променя при отмяна на всички резервации на &quot;Няма записани&quot;)<br/>
          <strong>Отменена</strong> - екскурзията е отменена, не се показва на сайта<br/>
          <strong>Архивирана</strong> - стара екскурзия, не се показва на сайта
        </small>
      </div>

      <label>Категория</label>
      <select
        value={category}
        onChange={ev => setCategory(ev.target.value)}
      >
        <option value="">Без категория</option>
        {categories.length > 0 && categories.map(c => (
          <option key={c._id} value={c._id}>{c.name}</option>
        ))}
      </select>

      {propertiesToFill.length > 0 && propertiesToFill.map(p => (
        <div key={p.name} className="">
          <label>{p.name[0].toUpperCase() + p.name.substring(1)}</label>
          <div>
            <select
              value={tripProperties[p.name]}
              onChange={ev => setTripProp(p.name, ev.target.value)}
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
          {!!images?.length && images.map((link, index) => (
            <div
              key={`${link}-${index}`}
              className="relative h-24 bg-white p-1 shadow-sm rounded-sm border border-gray-200 flex items-center justify-center"
            >
              <button
                type="button"
                onClick={() => {
                  setImages(prev => prev.filter(img => img !== link));
                }}
                className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full bg-red-600 text-white text-xs shadow"
                title="Изтрий снимката"
              >
                ×
              </button>
              <Image
                src={link}
                alt=""
                width={96}
                height={96}
                className="max-h-full rounded-lg object-cover"
                unoptimized={link?.includes('s3.amazonaws.com') || link?.includes('s3.eu-central-1.amazonaws.com')}
              />
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
        placeholder="Описание на екскурзията"
        value={description}
        onChange={ev => setDescription(ev.target.value)}
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
