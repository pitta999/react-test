import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { CustomerPrice, Product, User } from "types/schema";
import { getCustomerPrices, getProductsByCategory, getUserById, updateCustomerPrices } from "utils/firebase";
import AuthContext from "context/AuthContext";
import Header from "components/Header";

interface PriceFormData {
  productId: string;
  productName: string;
  regularPrice: number;
  customPrice: number;
  categoryId: string;
  categoryName: string;
}

export default function UserCustomPriceForm() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [prices, setPrices] = useState<PriceFormData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!userId) {
          console.log("userId is undefined");
          toast.error("사용자 ID가 필요합니다.");
          navigate("/users");
          return;
        }
        
        console.log("Fetching user data for userId:", userId);

        // 사용자 정보 가져오기
        const userData = await getUserById(userId);
        console.log("Fetched user data:", userData);
        
        if (!userData) {
          toast.error("사용자를 찾을 수 없습니다.");
          navigate("/users");
          return;
        }
        setUser(userData);

        // 모든 제품 가져오기
        const allProducts = await getProductsByCategory("");
        console.log("Fetched products:", allProducts);
        setProducts(allProducts);

        // 기존 맞춤 가격 가져오기
        const existingPrices = await getCustomerPrices(userId);
        console.log("Fetched customer prices:", existingPrices);
        
        if (existingPrices) {
          setPrices(existingPrices.prices);
        } else {
          // 새로운 가격 목록 초기화
          const initialPrices = allProducts.map(product => ({
            productId: product.id,
            productName: product.name,
            regularPrice: product.price,
            customPrice: product.price,
            categoryId: product.categoryId,
            categoryName: product.categoryName,
          }));
          setPrices(initialPrices);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("데이터를 불러오는 중 오류가 발생했습니다.");
        navigate("/users");
      }
    };

    fetchData();
  }, [userId, navigate]);

  const handlePriceChange = (productId: string, value: number) => {
    setPrices(prev => 
      prev.map(price => 
        price.productId === productId 
          ? { ...price, customPrice: value }
          : price
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await updateCustomerPrices(userId!, {
        userId: user.id,
        userEmail: user.email,
        companyName: user.fullCompanyName,
        prices,
      });
      toast.success("맞춤 가격이 저장되었습니다.");
    } catch (error) {
      console.error("Error saving prices:", error);
      toast.error("가격 저장 중 오류가 발생했습니다.");
    }
  };

  return (
    <>
      <Header />
      <div className="p-4">
        {!isAdmin ? (
          <div>관리자만 접근할 수 있습니다.</div>
        ) : loading || !user ? (
          <div>로딩 중...</div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold mb-4">
              {user.fullCompanyName} 맞춤 가격 설정
            </h1>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        카테고리
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        제품명
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        정상가
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        맞춤가
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {prices.map((price) => (
                      <tr key={price.productId}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {price.categoryName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {price.productName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {price.regularPrice.toLocaleString()}원
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            value={price.customPrice}
                            onChange={(e) => handlePriceChange(price.productId, Number(e.target.value))}
                            className="w-32 px-2 py-1 border rounded"
                            min="0"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  저장
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
} 