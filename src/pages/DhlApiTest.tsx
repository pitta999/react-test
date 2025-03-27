import React, { useState } from 'react';
import { toast } from 'react-toastify';

interface ShippingRate {
  totalPrice: number;
  currency: string;
  deliveryTime: string;
  error?: string;
}

export default function DhlApiTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [rateResult, setRateResult] = useState<ShippingRate | null>(null);

  const calculateShippingRate = async () => {
    setIsLoading(true);
    try {
      const credentials = btoa(`${process.env.REACT_APP_DHL_API_KEY}:${process.env.REACT_APP_DHL_API_SECRET}`);
      console.log('Credentials:', credentials);

      const myHeaders = new Headers();
      myHeaders.append("content-type", "application/json");
      myHeaders.append("X-API-KEY", "demo-key");

      console.log('Headers:', Object.fromEntries(myHeaders.entries()));

      const requestBody = {
        customerDetails: {
          shipperDetails: {
            postalCode: "14800",
            cityName: "Prague",
            countryCode: "CZ",
            addressLine1: "addres1"
          },
          receiverDetails: {
            postalCode: "14800",
            cityName: "Prague",
            countryCode: "CZ",
            addressLine1: "addres1"
          }
        },
        plannedShippingDateAndTime: new Date().toISOString(),
        unitOfMeasurement: "metric",
        packages: [
          {
            weight: 10.5,
            dimensions: {
              length: 25,
              width: 35,
              height: 15
            }
          }
        ]
      };

      const response = await fetch("https://api-mock.dhl.com/mydhlapi/rates", {
        method: "POST",
        headers: myHeaders,
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json();
        console.log('Error data:', errorData);
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setRateResult({
        totalPrice: data.products[0].totalPrice,
        currency: data.products[0].currency,
        deliveryTime: data.products[0].deliveryTime.toString()
      });
      
    } catch (error) {
      console.error('DHL API Error:', error);
      toast.error(`배송비 계산 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      setRateResult({
        totalPrice: 0,
        currency: '',
        deliveryTime: '',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">DHL 배송비 계산 테스트</h1>
      
      <button
        onClick={calculateShippingRate}
        disabled={isLoading}
        className={`px-4 py-2 rounded ${
          isLoading 
            ? 'bg-gray-400' 
            : 'bg-blue-500 hover:bg-blue-600'
        } text-white`}
      >
        {isLoading ? '계산 중...' : '배송비 계산'}
      </button>

      {rateResult && (
        <div className="mt-4 p-4 border rounded">
          {rateResult.error ? (
            <div className="text-red-600">
              <h3 className="font-bold">오류 발생</h3>
              <p>{rateResult.error}</p>
            </div>
          ) : (
            <>
              <h3 className="font-bold">계산 결과</h3>
              <p>배송비: {rateResult.totalPrice} {rateResult.currency}</p>
              <p>예상 배송 시간: {rateResult.deliveryTime}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
