import CategoryList from "components/CategoryList";
import Header from "components/Header";
import Footer from "components/Footer";

export default function CategoriesPage() {
  return (
    <>
      <Header />
      <main className="main">
        <CategoryList />
      </main>
      <Footer />
    </>
  );
} 