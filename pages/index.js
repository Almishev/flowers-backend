import Layout from "@/components/Layout";
import {useSession, signOut} from "next-auth/react";
import {useEffect, useState} from "react";
import axios from "axios";

export default function Home() {
  const {data: session, status} = useSession();
  const [stats,setStats] = useState(null);
  useEffect(() => {
    axios.get('/api/stats').then(r => setStats(r.data));
  }, []);
  
  if (status === "loading") {
    return <Layout>
      <div className="text-center">
        <h2>Зареждане...</h2>
      </div>
    </Layout>
  }
  
  return <Layout>
    <div className="text-blue-900 flex justify-between">
      <h2>
        Здравей, <b>{session?.user?.name}</b>
      </h2>
      <div className="flex bg-gray-300 gap-1 text-black rounded-lg overflow-hidden">
        <span className="px-2 py-1">
          {session?.user?.name}
        </span>
      </div>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-gray-500 text-sm">Общо продукти (букети)</div>
        <div className="text-3xl font-bold">{stats?.trips?.total ?? '-'}</div>
        <div className="text-xs text-gray-400 mt-1">всички продукти в каталога</div>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-gray-500 text-sm">Продукти с наличност</div>
        <div className="text-3xl font-bold">{stats?.trips?.available ?? '-'}</div>
        <div className="text-xs text-gray-400 mt-1">букети и продукти, които са налични</div>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-gray-500 text-sm">Изчерпани продукти</div>
        <div className="text-3xl font-bold">{stats?.trips?.full ?? '-'}</div>
        <div className="text-xs text-gray-400 mt-1">продукти без наличност</div>
      </div>
    </div>
    <div className="mt-6 p-4 bg-gray-100 rounded">
      <p><strong>Имейл:</strong> {session?.user?.email}</p>
      <button onClick={() => signOut()} className="btn-red mt-2">Изход</button>
    </div>
  </Layout>
}
