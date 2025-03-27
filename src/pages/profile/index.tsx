import Footer from "components/Footer";
import Header from "components/Header";
// import PostList from "components/PostList";
import Profile from "components/Profile";
import ProfileInfo from "components/ProfileInfo";

export default function ProfilePage() {
  return (
    <>
      <Header />
      <Profile />
      <ProfileInfo />
      {/* <PostList hasNavigation={false} defaultTab="my" /> */}
      <Footer />
    </>
  );
}
