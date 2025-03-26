import {https} from "firebase-functions";
import {handleError} from "../utils/error-handler";

interface DhlRateRequest {
  requestedShipment: {
    shipper: {
      address: {
        postalCode: string;
        countryCode: string;
      };
    };
    recipient: {
      address: {
        postalCode: string;
        countryCode: string;
      };
    };
    packages: Array<{
      weight: number;
      dimensions: {
        length: number;
        width: number;
        height: number;
      };
    }>;
  };
}

interface DhlRateResponse {
  products: Array<{
    productName: string;
    totalPrice: number;
    totalPriceBreakdown: {
      price: number;
      currency: string;
    };
  }>;
}

export const calculateShippingRate = async (data: DhlRateRequest): Promise<DhlRateResponse> => {
  try {
    const apiKey = process.env.DHL_API_KEY;
    if (!apiKey) {
      throw new Error("DHL API key is not configured");
    }

    const response = await fetch("https://api-mock.dhl.com/mydhlapi/rates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to calculate shipping rate");
    }

    const result = await response.json();
    return result as DhlRateResponse;
  } catch (error) {
    throw handleError(error);
  }
};

export const getDhlRates = https.onRequest(async (request, response) => {
  try {
    const rateRequest = request.body as DhlRateRequest;
    const rates = await calculateShippingRate(rateRequest);
    response.json(rates);
  } catch (error) {
    const {statusCode, message} = handleError(error);
    response.status(statusCode).json({error: message});
  }
}); 