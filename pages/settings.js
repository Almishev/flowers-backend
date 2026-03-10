import Layout from "@/components/Layout";
import {useState, useEffect} from "react";
import axios from "axios";
import Spinner from "@/components/Spinner";
import { withSwal } from 'react-sweetalert2';
import Image from "next/image";

function SettingsPage({swal}) {
  const [featuredProductId, setFeaturedProductId] = useState('');
  const [heroMediaType, setHeroMediaType] = useState('video'); // 'video' or 'image'
  const [heroVideoDesktop, setHeroVideoDesktop] = useState('');
  const [heroVideoMobile, setHeroVideoMobile] = useState('');
  const [heroImage, setHeroImage] = useState('');
  const [heroTitle, setHeroTitle] = useState('Travel Agency');
  const [heroSubtitle, setHeroSubtitle] = useState('незабравими пътувания и екскурзии');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isUploadingDesktop, setIsUploadingDesktop] = useState(false);
  const [isUploadingMobile, setIsUploadingMobile] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchProducts();
    fetchSettings();
  }, []);

  function fetchProducts() {
    // За settings страницата искаме всички екскурзии, затова използваме голям limit
    axios.get('/api/trips?limit=1000').then(result => {
      // API връща {products: [...], pagination: {...}} – тук products са екскурзии
      if (result.data.products) {
        setProducts(result.data.products);
      } else if (Array.isArray(result.data)) {
        // Fallback за стари версии на API
        setProducts(result.data);
      } else {
        setProducts([]);
      }
    }).catch(error => {
      console.error('Error fetching products:', error);
      swal.fire({
        title: 'Грешка!',
        text: 'Неуспешно зареждане на екскурзиите',
        icon: 'error',
      });
      setProducts([]);
    });
  }

  function fetchSettings() {
    axios.get('/api/settings').then(result => {
      if (result.data.featuredProductId) {
        setFeaturedProductId(result.data.featuredProductId);
      }
      if (result.data.heroMediaType) {
        setHeroMediaType(result.data.heroMediaType);
      }
      if (result.data.heroVideoDesktop) {
        setHeroVideoDesktop(result.data.heroVideoDesktop);
      }
      if (result.data.heroVideoMobile) {
        setHeroVideoMobile(result.data.heroVideoMobile);
      }
      if (result.data.heroImage) {
        setHeroImage(result.data.heroImage);
      }
      if (result.data.heroTitle) {
        setHeroTitle(result.data.heroTitle);
      }
      if (result.data.heroSubtitle) {
        setHeroSubtitle(result.data.heroSubtitle);
      }
    });
  }

  async function saveSettings(ev) {
    ev.preventDefault();
    setLoading(true);
    
    try {
      await axios.post('/api/settings', {
        featuredProductId,
        heroMediaType,
        heroVideoDesktop,
        heroVideoMobile,
        heroImage,
        heroTitle,
        heroSubtitle,
      });
      
      swal.fire({
        title: 'Успех!',
        text: 'Настройките са запазени успешно',
        icon: 'success',
      });
    } catch (error) {
      swal.fire({
        title: 'Грешка!',
        text: 'Неуспешно запазване на настройките',
        icon: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <h1>Настройки</h1>
      <form onSubmit={saveSettings} className="max-w-md">
        <label>Препоръчана екскурзия за началната страница</label>
        <select 
          value={featuredProductId}
          onChange={ev => setFeaturedProductId(ev.target.value)}
        >
          <option value="">Избери екскурзия</option>
          {products.length > 0 && products.map(product => (
            <option key={product._id} value={product._id}>
              {product.title}
            </option>
          ))}
        </select>
        

        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-4">Начална страница Hero настройки</h2>
          
          <label>Заглавие на Hero секцията</label>
          <input 
            type="text" 
            placeholder="Travel Agency"
            value={heroTitle}
            onChange={ev => setHeroTitle(ev.target.value)}
          />

          <label>Подзаглавие на Hero секцията</label>
          <input 
            type="text" 
            placeholder="незабравими пътувания и екскурзии"
            value={heroSubtitle}
            onChange={ev => setHeroSubtitle(ev.target.value)}
          />

          <label>Тип медия за Hero секцията</label>
          <div className="mb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="heroMediaType" 
                value="video"
                checked={heroMediaType === 'video'}
                onChange={ev => setHeroMediaType(ev.target.value)}
                className="cursor-pointer"
              />
              <span>Видео</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer mt-2">
              <input 
                type="radio" 
                name="heroMediaType" 
                value="image"
                checked={heroMediaType === 'image'}
                onChange={ev => setHeroMediaType(ev.target.value)}
                className="cursor-pointer"
              />
              <span>Снимка (за всички екрани)</span>
            </label>
          </div>

          {heroMediaType === 'video' && (
            <>
              <label>Видео за десктоп</label>
          <div className="mb-2">
            {heroVideoDesktop && (
              <div className="mb-2">
                <video 
                  src={heroVideoDesktop} 
                  controls 
                  className="w-48 h-32 object-cover rounded"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm('Сигурни ли сте, че искате да изтриете десктоп видеото?')) {
                      try {
                        await axios.delete('/api/settings', {
                          data: { videoType: 'desktop' }
                        });
                        setHeroVideoDesktop('');
                        swal.fire({
                          title: 'Успех!',
                          text: 'Десктоп видеото е изтрито',
                          icon: 'success',
                        });
                      } catch (error) {
                        swal.fire({
                          title: 'Грешка!',
                          text: 'Неуспешно изтриване на видеото',
                          icon: 'error',
                        });
                      }
                    }
                  }}
                  className="btn-red text-sm mt-2"
                >
                  Изтрий видеото
                </button>
              </div>
            )}
            <label className="w-48 h-24 cursor-pointer text-center flex flex-col items-center justify-center text-sm gap-1 text-primary rounded-sm bg-white shadow-sm border border-primary">
              {isUploadingDesktop ? (
                <Spinner />
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <div>Качи видео</div>
                </>
              )}
              <input 
                type="file" 
                accept="video/*"
                onChange={async ev => {
                  const files = ev.target?.files;
                  if (files?.length > 0) {
                    const file = files[0];
                    const maxSizeForDirectUpload = 4 * 1024 * 1024; // 4MB
                    
                    setIsUploadingDesktop(true);
                    try {
                      let fileUrl;
                      
                      if (file.size > maxSizeForDirectUpload) {
                        // За големи файлове (>4MB) Vercel блокира заявката преди да достигне до нашия код
                        // Единственият начин е presigned URL с правилна CORS конфигурация
                        const fileType = file.type || 'video/mp4';
                        
                        console.log('Файлът е над 4MB, използвам presigned URL...', {
                          fileName: file.name,
                          fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
                          fileType: fileType,
                        });
                        
                        // Генерираме presigned URL
                        const presignedRes = await axios.post('/api/upload-presigned', {
                          fileName: file.name,
                          fileType: fileType,
                        });
                        
                        if (!presignedRes.data?.presignedUrl) {
                          throw new Error('Неуспешно генериране на presigned URL');
                        }
                        
                        const {presignedUrl, fileUrl: uploadedUrl} = presignedRes.data;
                        
                        console.log('Presigned URL получен, качвам директно в S3...');
                        
                        // Качваме директно в S3 с fetch
                        const uploadResponse = await fetch(presignedUrl, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': fileType,
                          },
                          body: file,
                        });
                        
                        if (!uploadResponse.ok) {
                          const errorText = await uploadResponse.text().catch(() => 'Unknown error');
                          console.error('S3 upload failed:', {
                            status: uploadResponse.status,
                            statusText: uploadResponse.statusText,
                            errorText,
                          });
                          throw new Error(`S3 upload failed: ${uploadResponse.status}. Провери CORS настройките на S3 bucket-а.`);
                        }
                        
                        console.log('Файлът е качен успешно в S3');
                        fileUrl = uploadedUrl;
                      } else {
                        // За малки файлове използваме стандартния метод
                        const data = new FormData();
                        data.append('file', file);
                        const res = await axios.post('/api/upload', data, {
                          headers: {
                            'Content-Type': 'multipart/form-data',
                          },
                        });
                        fileUrl = res.data.links?.[0] || '';
                      }
                      
                      setHeroVideoDesktop(fileUrl);
                      swal.fire({
                        title: 'Успех!',
                        text: 'Видеото е качено успешно',
                        icon: 'success',
                        timer: 2000,
                      });
                    } catch (error) {
                      console.error('Upload error:', error);
                      console.error('Error details:', {
                        message: error.message,
                        response: error.response?.data,
                        status: error.response?.status,
                      });
                      
                      let errorMessage = 'Нещо се обърка';
                      if (error.response?.data?.message) {
                        errorMessage = error.response.data.message;
                      } else if (error.message) {
                        errorMessage = error.message;
                      }
                      
                      swal.fire({
                        title: 'Грешка при качване',
                        text: errorMessage,
                        icon: 'error',
                        html: `<p>${errorMessage}</p><p style="font-size: 12px; margin-top: 10px;">Провери конзолата за повече детайли.</p>`,
                      });
                    } finally {
                      setIsUploadingDesktop(false);
                      ev.target.value = ''; // Reset input
                    }
                  }
                }} 
                className="hidden" 
              />
            </label>
          </div>

              <label>Видео за мобилни</label>
              <div className="mb-2">
                {heroVideoMobile && (
                  <div className="mb-2">
                    <video 
                      src={heroVideoMobile} 
                      controls 
                      className="w-48 h-32 object-cover rounded"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm('Сигурни ли сте, че искате да изтриете мобилното видео?')) {
                          try {
                            await axios.delete('/api/settings', {
                              data: { videoType: 'mobile' }
                            });
                            setHeroVideoMobile('');
                            swal.fire({
                              title: 'Успех!',
                              text: 'Мобилното видео е изтрито',
                              icon: 'success',
                            });
                          } catch (error) {
                            swal.fire({
                              title: 'Грешка!',
                              text: 'Неуспешно изтриване на видеото',
                              icon: 'error',
                            });
                          }
                        }
                      }}
                      className="btn-red text-sm mt-2"
                    >
                      Изтрий видеото
                    </button>
                  </div>
                )}
                <label className="w-48 h-24 cursor-pointer text-center flex flex-col items-center justify-center text-sm gap-1 text-primary rounded-sm bg-white shadow-sm border border-primary">
                  {isUploadingMobile ? (
                    <Spinner />
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      <div>Качи видео</div>
                    </>
                  )}
                  <input 
                    type="file" 
                    accept="video/*"
                    onChange={async ev => {
                      const files = ev.target?.files;
                      if (files?.length > 0) {
                        const file = files[0];
                        const maxSizeForDirectUpload = 4 * 1024 * 1024; // 4MB
                        
                        setIsUploadingMobile(true);
                        try {
                          let fileUrl;
                          
                          if (file.size > maxSizeForDirectUpload) {
                            // За големи файлове (>4MB) Vercel блокира заявката преди да достигне до нашия код
                            // Единственият начин е presigned URL с правилна CORS конфигурация
                            const fileType = file.type || 'video/mp4';
                            
                            console.log('Файлът е над 4MB, използвам presigned URL...', {
                              fileName: file.name,
                              fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
                              fileType: fileType,
                            });
                            
                            // Генерираме presigned URL
                            const presignedRes = await axios.post('/api/upload-presigned', {
                              fileName: file.name,
                              fileType: fileType,
                            });
                            
                            if (!presignedRes.data?.presignedUrl) {
                              throw new Error('Неуспешно генериране на presigned URL');
                            }
                            
                            const {presignedUrl, fileUrl: uploadedUrl} = presignedRes.data;
                            
                            console.log('Presigned URL получен, качвам директно в S3...');
                            
                            // Качваме директно в S3 с fetch
                            const uploadResponse = await fetch(presignedUrl, {
                              method: 'PUT',
                              headers: {
                                'Content-Type': fileType,
                              },
                              body: file,
                            });
                            
                            if (!uploadResponse.ok) {
                              const errorText = await uploadResponse.text().catch(() => 'Unknown error');
                              console.error('S3 upload failed:', {
                                status: uploadResponse.status,
                                statusText: uploadResponse.statusText,
                                errorText,
                              });
                              throw new Error(`S3 upload failed: ${uploadResponse.status}. Провери CORS настройките на S3 bucket-а.`);
                            }
                            
                            console.log('Файлът е качен успешно в S3');
                            fileUrl = uploadedUrl;
                          } else {
                            // За малки файлове използваме стандартния метод
                            const data = new FormData();
                            data.append('file', file);
                            const res = await axios.post('/api/upload', data, {
                              headers: {
                                'Content-Type': 'multipart/form-data',
                              },
                            });
                            fileUrl = res.data.links?.[0] || '';
                          }
                          
                          setHeroVideoMobile(fileUrl);
                          swal.fire({
                            title: 'Успех!',
                            text: 'Видеото е качено успешно',
                            icon: 'success',
                            timer: 2000,
                          });
                        } catch (error) {
                          console.error('Upload error:', error);
                          console.error('Error details:', {
                            message: error.message,
                            response: error.response?.data,
                            status: error.response?.status,
                          });
                          
                          let errorMessage = 'Нещо се обърка';
                          if (error.response?.data?.message) {
                            errorMessage = error.response.data.message;
                          } else if (error.message) {
                            errorMessage = error.message;
                          }
                          
                          swal.fire({
                            title: 'Грешка при качване',
                            text: errorMessage,
                            icon: 'error',
                            html: `<p>${errorMessage}</p><p style="font-size: 12px; margin-top: 10px;">Провери конзолата за повече детайли.</p>`,
                          });
                        } finally {
                          setIsUploadingMobile(false);
                          ev.target.value = ''; // Reset input
                        }
                      }
                    }} 
                    className="hidden" 
                  />
                </label>
          </div>
            </>
          )}

          {heroMediaType === 'image' && (
            <>
              <label>Снимка за Hero секцията</label>
              <div className="mb-2">
                {heroImage && (
                  <div className="mb-2">
                    <Image 
                      src={heroImage} 
                      alt="Hero" 
                      width={192}
                      height={128}
                      className="w-48 h-32 object-cover rounded"
                      unoptimized={heroImage?.includes('s3.amazonaws.com')}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm('Сигурни ли сте, че искате да изтриете снимката?')) {
                          try {
                            await axios.delete('/api/settings', {
                              data: { mediaType: 'image' }
                            });
                            setHeroImage('');
                            swal.fire({
                              title: 'Успех!',
                              text: 'Снимката е изтрита',
                              icon: 'success',
                            });
                          } catch (error) {
                            swal.fire({
                              title: 'Грешка!',
                              text: 'Неуспешно изтриване на снимката',
                              icon: 'error',
                            });
                          }
                        }
                      }}
                      className="btn-red text-sm mt-2"
                    >
                      Изтрий снимката
                    </button>
                  </div>
                )}
                <label className="w-48 h-24 cursor-pointer text-center flex flex-col items-center justify-center text-sm gap-1 text-primary rounded-sm bg-white shadow-sm border border-primary">
                  {isUploadingImage ? (
                    <Spinner />
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      <div>Качи снимка</div>
                    </>
                  )}
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={async ev => {
                      const files = ev.target?.files;
                      if (files?.length > 0) {
                        const file = files[0];
                        setIsUploadingImage(true);
                        try {
                          const data = new FormData();
                          data.append('file', file);
                          const res = await axios.post('/api/upload', data, {
                            headers: {
                              'Content-Type': 'multipart/form-data',
                            },
                          });
                          
                          console.log('Upload response:', res.data);
                          
                          // Проверяваме различни формати на отговора
                          const fileUrl = res.data.links?.[0] || 
                                        res.data.link || 
                                        res.data.url || 
                                        (Array.isArray(res.data.links) && res.data.links.length > 0 ? res.data.links[0] : '');
                          
                          if (!fileUrl) {
                            console.error('No file URL in response:', res.data);
                            throw new Error('Неуспешно качване - липсва URL на снимката. Провери конзолата за детайли.');
                          }
                          
                          console.log('File URL:', fileUrl);
                          setHeroImage(fileUrl);
                          
                          // Автоматично запазваме настройките след качване на снимката
                          try {
                            await axios.post('/api/settings', {
                              featuredProductId,
                              heroMediaType,
                              heroVideoDesktop,
                              heroVideoMobile,
                              heroImage: fileUrl,
                              heroTitle,
                              heroSubtitle,
                            });
                            swal.fire({
                              title: 'Успех!',
                              text: 'Снимката е качена и запазена успешно',
                              icon: 'success',
                              timer: 2000,
                            });
                          } catch (saveError) {
                            console.error('Error saving settings:', saveError);
                            swal.fire({
                              title: 'Успех при качване!',
                              text: 'Снимката е качена, но не беше запазена. Моля, натиснете "Запази настройките".',
                              icon: 'warning',
                              timer: 3000,
                            });
                          }
                        } catch (error) {
                          console.error('Upload error:', error);
                          let errorMessage = 'Нещо се обърка';
                          if (error.response?.data?.message) {
                            errorMessage = error.response.data.message;
                          } else if (error.message) {
                            errorMessage = error.message;
                          }
                          swal.fire({
                            title: 'Грешка при качване',
                            text: errorMessage,
                            icon: 'error',
                          });
                        } finally {
                          setIsUploadingImage(false);
                          ev.target.value = '';
                        }
                      }
                    }} 
                    className="hidden" 
                  />
                </label>
              </div>
            </>
          )}
        </div>
        
        <button 
          type="submit" 
          className="btn-primary"
          disabled={loading}
        >
          {loading ? 'Запазване...' : 'Запази настройките'}
        </button>
      </form>
    </Layout>
  );
}

export default withSwal(({swal}, ref) => (
  <SettingsPage swal={swal} />
));
