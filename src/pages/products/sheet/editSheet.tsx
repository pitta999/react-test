import { Header, Footer } from "components/common";
import { SheetUpload } from "components/product";

export default function SheetUploadPage() {
  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <SheetUpload />
      </main>
      <Footer />
    </>
  );
}