import Footer from "components/common/Footer";
import Header from "components/common/Header";
import PostList from "components/post/PostList";

export default function PostsPage() {
  return (
    <>
      <Header />
      <PostList hasNavigation={false} />
      <Footer />
    </>
  );
}
