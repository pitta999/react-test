import { getAuth, signOut } from "firebase/auth";
import { app } from "firebaseApp";
import { toast } from "react-toastify";

const onSignOut = async () => {
  try {
    const auth = getAuth(app);
    await signOut(auth);
    toast.success("Logged out successfully.");
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
      Logout
    </div>
  );
}
