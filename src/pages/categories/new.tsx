import CategoryForm from "components/CategoryForm";
import Header from "components/Header";
import Footer from "components/Footer";

export default function NewCategoryPage() {
  return (
    <>
      <Header />
      <main className="main">
        <CategoryForm />
      </main>
      <Footer />
    </>
  );
} 