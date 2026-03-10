import Layout from "@/components/Layout";
import {useRouter} from "next/router";
import {useEffect, useState} from "react";
import axios from "axios";

export default function DeleteProductPage() {
  const router = useRouter();
  const [productInfo,setProductInfo] = useState();
  const {id} = router.query;
  useEffect(() => {
    if (!id) {
      return;
    }
    axios.get('/api/trips?id='+id).then(response => {
      setProductInfo(response.data);
    });
  }, [id]);
  function goBack() {
    router.push('/trips');
  }
  async function deleteProduct() {
    await axios.delete('/api/trips?id='+id);
    goBack();
  }
  return (
    <Layout>
      <h1 className="text-center">Наистина ли искате да изтриете
        &nbsp;&quot;{productInfo?.title}&quot;?
      </h1>
      <div className="flex gap-2 justify-center">
        <button
          onClick={deleteProduct}
          className="btn-red">Да</button>
        <button
          className="btn-default"
          onClick={goBack}>
          НЕ
        </button>
      </div>
    </Layout>
  );
}
