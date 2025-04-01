import { Header, Footer } from "components/common";
import { UserList } from "components/user";

export default function UserListPage() {
  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <UserList />
      </main>
      <Footer />
    </>
  );
}
