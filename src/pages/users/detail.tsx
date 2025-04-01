import { Header, Footer } from "components/common";
import { UserDetail } from "components/user";

export default function UserDetailPage() {
  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <UserDetail />
      </main>
      <Footer />
    </>
  );
}
