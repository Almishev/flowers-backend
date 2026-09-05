import {useEffect} from "react";
import Head from "next/head";
import {getServerSession} from "next-auth";
import {authOptions} from "@/pages/api/auth/[...nextauth]";
import {mongooseConnect} from "@/lib/mongoose";
import {Admin} from "@/models/Admin";
import {Order} from "@/models/Order";
import Link from "next/link";

function moneyFromCents(cents) {
  return (Number(cents || 0) / 100).toFixed(2);
}

function formatDate(value) {
  try {
    return new Date(value).toLocaleString('bg-BG');
  } catch (e) {
    return '';
  }
}

export default function OrderPrintPage({order}) {
  const shortId = String(order._id).slice(-8).toUpperCase();
  const items = (order.line_items || []).filter(
    item => item.price_data?.product_data?.name !== 'Доставка'
  );
  const shipping = (order.line_items || []).find(
    item => item.price_data?.product_data?.name === 'Доставка'
  );
  const itemsTotal = items.reduce((sum, item) => {
    return sum + (item.quantity || 0) * (item.price_data?.unit_amount || 0);
  }, 0);
  const shippingAmount = shipping?.price_data?.unit_amount || 0;
  const total = typeof order.total === 'number'
    ? order.total.toFixed(2)
    : ((itemsTotal + shippingAmount) / 100).toFixed(2);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = ' ';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <div className="print-page" style={{minHeight: '100vh', background: '#f3f4f6', padding: '24px'}}>
      <Head>
        <title> </title>
      </Head>
      <style jsx global>{`
        @page {
          size: A4;
          margin: 0;
        }
        @media print {
          html, body, #__next {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: hidden !important;
          }
          .print-page {
            min-height: 0 !important;
            height: auto !important;
            padding: 12mm !important;
            background: #fff !important;
          }
          .no-print { display: none !important; }
          .slip {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            max-width: none !important;
          }
        }
      `}</style>
      <div className="no-print" style={{maxWidth: 360, margin: '0 auto 16px', display: 'flex', gap: 8}}>
        <button
          type="button"
          onClick={() => window.print()}
          className="btn-primary"
        >
          Принтирай
        </button>
        <Link href="/orders" className="btn-default">
          Назад към поръчките
        </Link>
      </div>
      <p className="no-print" style={{maxWidth: 360, margin: '0 auto 16px', fontSize: 13, color: '#4b5563'}}>
        Ако още се вижда адресът, в прозореца за печат махнете отметката „Headers and footers“ / „Колонтитули“.
      </p>
      <div
        className="slip"
        style={{
          maxWidth: 360,
          margin: '0 auto',
          background: '#fff',
          color: '#111',
          border: '1px dashed #c9a227',
          padding: '20px 18px',
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: 13,
          lineHeight: 1.45,
        }}
      >
        <div style={{textAlign: 'center', marginBottom: 12}}>
          <div style={{fontFamily: "'Times New Roman', serif", fontSize: 28, letterSpacing: 2, fontWeight: 700}}>
            DÉLIE
          </div>
          <div style={{fontSize: 11, color: '#444'}}>Онлайн парфюмен бутик</div>
          <div style={{fontSize: 11, color: '#444'}}>тел. +359 897 455 021</div>
        </div>
        <div style={{borderTop: '1px dashed #999', margin: '10px 0'}} />
        <p style={{textAlign: 'center', margin: '0 0 8px', fontWeight: 700}}>КАСОВА БЕЛЕЖКА</p>
        <p style={{margin: 0}}>Поръчка № {shortId}</p>
        <p style={{margin: '2px 0 0'}}>Дата: {formatDate(order.createdAt)}</p>
        <div style={{borderTop: '1px dashed #999', margin: '10px 0'}} />
        <p style={{margin: '0 0 4px', fontWeight: 700}}>Клиент</p>
        <p style={{margin: 0}}>{order.name}</p>
        <p style={{margin: 0}}>{order.phone}</p>
        <p style={{margin: 0}}>{order.email}</p>
        <p style={{margin: 0}}>
          {order.streetAddress}, {order.postalCode} {order.city}
        </p>
        <p style={{margin: 0}}>{order.country}</p>
        <div style={{borderTop: '1px dashed #999', margin: '10px 0'}} />
        {items.map((item, index) => {
          const name = item.price_data?.product_data?.name || 'Продукт';
          const qty = item.quantity || 1;
          const unit = item.price_data?.unit_amount || 0;
          return (
            <div key={index} style={{marginBottom: 8}}>
              <div>{name}</div>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span>{qty} x {moneyFromCents(unit)} EUR</span>
                <span>{moneyFromCents(qty * unit)} EUR</span>
              </div>
            </div>
          );
        })}
        <div style={{borderTop: '1px dashed #999', margin: '10px 0'}} />
        <div style={{display: 'flex', justifyContent: 'space-between'}}>
          <span>Междинна сума</span>
          <span>{moneyFromCents(itemsTotal)} EUR</span>
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between'}}>
          <span>Доставка</span>
          <span>{moneyFromCents(shippingAmount)} EUR</span>
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: 6, fontSize: 15}}>
          <span>ОБЩО</span>
          <span>{total} EUR</span>
        </div>
        <div style={{borderTop: '1px dashed #999', margin: '10px 0'}} />
        <p style={{margin: 0}}>Плащане: Наложен платеж</p>
        <p style={{margin: 0}}>Статус: {order.paid ? 'Платена' : 'Неплатена / при доставка'}</p>
        <div style={{borderTop: '1px dashed #999', margin: '10px 0'}} />
        <p style={{margin: '8px 0 0', textAlign: 'center', fontSize: 11, color: '#666'}}>
          Благодарим ви за поръчката!
        </p>
        
      </div>
    </div>
  );
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session?.user?.email) {
    return {redirect: {destination: '/', permanent: false}};
  }

  await mongooseConnect();
  const adminEmails = (await Admin.find().select('email')).map(admin => admin.email);
  if (!adminEmails.includes(session.user.email)) {
    return {redirect: {destination: '/', permanent: false}};
  }

  const order = await Order.findById(context.params.id).lean();
  if (!order) {
    return {notFound: true};
  }

  return {
    props: {
      order: JSON.parse(JSON.stringify(order)),
    },
  };
}
