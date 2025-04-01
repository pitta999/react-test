import Header from "components/common/Header";
import Footer from "components/common/Footer";

import ProductList from "components/product/ProductList";
import Carousel from "components/common/Carousel";

export default function Home() {
  return (
    <>
      <Header />
      {/* <Carousel /> */}
      <ProductList />
      <Footer />
    </>
  );
}
