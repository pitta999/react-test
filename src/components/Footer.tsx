import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="flex items-center space-x-6">
            <Link to="/about" className="text-gray-600 hover:text-gray-900">
              회사 소개
            </Link>
            <Link to="/terms" className="text-gray-600 hover:text-gray-900">
              이용약관
            </Link>
            <Link to="/privacy" className="text-gray-600 hover:text-gray-900">
              개인정보처리방침
            </Link>
          </div>
          
          <div className="text-gray-500 text-sm">
            © {new Date().getFullYear()} React Blog. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
