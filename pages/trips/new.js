import ProductForm from "@/components/TripForm";
import Layout from "@/components/Layout";

export default function NewProduct() {
  return (
    <Layout>
      <h1>Нова екскурзия</h1>
      <ProductForm />
    </Layout>
  );
}