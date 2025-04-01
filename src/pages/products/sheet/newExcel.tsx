import { Header, Footer } from "components/common";
import { ExcelUpload } from "components/product";

export default function ExcelUploadPage() {
  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <ExcelUpload />
      </main>
      <Footer />
    </>
  );
}