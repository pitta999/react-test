import { getAuth, signOut } from "firebase/auth";
import { app } from "firebaseApp";
import { toast } from "react-toastify";

const onSignOut = async () => {
  try {
    const auth = getAuth(app);
    await signOut(auth);
    toast.success("로그아웃 되었습니다.");
  } catch (error: any) {
    console.log(error);
    toast.error(error?.code);
  }
};

export default function Logout() {
  return (
    <div 
      role="presentation" 
      className="profile__logout" 
      onClick={onSignOut}
    >
      로그아웃
    </div>
  );
}
