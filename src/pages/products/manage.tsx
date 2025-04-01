import { Header, Footer } from "components/common";
import { ProductManage } from "components/product";

export default function ProductManagePage() {
  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <ProductManage />
      </main>
      <Footer />
    </>
  );
} 