import { Header, Footer } from "components/common";
import { ProductList } from "components/product";

export default function ProductListPage() {
  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <ProductList />
      </main>
      <Footer />
    </>
  );
}