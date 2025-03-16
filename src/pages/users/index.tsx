import Footer from "components/Footer";
import Header from "components/Header";
import UserList from "components/UserList";
import { Link } from "react-router-dom";

export default function PostsPage() {
  return (
    <>
      <Header />
      <UserList/>
      <Footer />
    </>
  );
}
