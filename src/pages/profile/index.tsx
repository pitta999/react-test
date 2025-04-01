import Footer from "components/common/Footer";
import Header from "components/common/Header";
// import PostList from "components/PostList";
import Profile from "components/user/Profile";
import ProfileInfo from "components/user/ProfileInfo";


export default function ProfilePage() {
  return (
    <>
      <Header />
      {/* <Profile /> */}
      <ProfileInfo />
      {/* <PostList hasNavigation={false} defaultTab="my" /> */}
      <Footer />
    </>
  );
}
