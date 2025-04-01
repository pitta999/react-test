import { Header, Footer } from "components/common";
import { ProductDetail } from "components/product";

export default function ProductDetailPage() {
  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <ProductDetail />
      </main>
      <Footer />
    </>
  );
}