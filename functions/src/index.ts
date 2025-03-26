/**
 * Import function triggers from their respective submodules:
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onRequest} from "firebase-functions/v2/https";
import {calculateShippingRate} from "../services/dhl-service";
import {handleError} from "../utils/error-handler";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

export const getDhlRates = onRequest(async (req, res) => {
  try {
    const rates = await calculateShippingRate(req.body);
    res.json(rates);
  } catch (error) {
    const errorResponse = handleError(error);
    res.status(errorResponse.statusCode).json(errorResponse);
  }
});
