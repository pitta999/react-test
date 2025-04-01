import { Header, Footer } from "components/common";
import { OrderHistory } from "components/order";

export default function OrderHistoryPage() {
  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <OrderHistory />
      </main>
      <Footer />
    </>
  );
}   
