import axios from "axios";
import FormData from "form-data";
import { slotParser } from "./slotParser.js";
import { convertDateToLongFormat, makeAMPM } from "./helpers.js";
import {
  existingReservationConfig,
  slotConfig,
  bookingConfig,
  finalConfig,
} from "../config.js";

// First, we'll see if we already have a reservation
async function checkForExistingBooking( targetRestaurant ) {
  let config = existingReservationConfig(process.env.AUTH_TOKEN);
  let venueID = targetRestaurant.venueID;
  let resDate = targetRestaurant.resDate;
  try {
    const response = await axios.request(config);

    for (let i = 0; i < response.data.reservations.length; i++) {
      if (response.data.reservations[i]?.venue?.id == venueID
        && response.data.reservations[i]?.day == resDate )
      {
        return true;
      }
    } return false
  } catch (error) {
    console.log(error);
  }
}

// Alt version: returns bookings so can recheck for multiple days
async function getExistingBookings() {
  let config = existingReservationConfig(process.env.AUTH_TOKEN);
    try {
    const response = await axios.request(config);
    return response.data.reservations;
  } catch (error) {
    console.log(error);
    return null;
  }
}

// Then, we'll check to see if there are any reservations available
async function singleDayFetch( targetRestaurant ) {
  try {
    let resDate = targetRestaurant.resDate;
    let partySize = targetRestaurant.partySize;
    let venueId = targetRestaurant.venueID;
    let config = slotConfig(resDate, partySize, venueId);

    const response = await axios.request(config);
    if (response.data.results.venues.length === 0) {
      console.log("Error: Please run again after reservations open.");
      return false;
    }
    let openSlots = response.data.results.venues[0].slots;
    if(openSlots.length>0){return openSlots;}
    else{return null;}
  } catch (error) {/* console.log(error); */}
}

// If there are reservations available, we'll grab the booking token
async function getBookingConfig(slotId) {
  try {
    const response = await axios.request(bookingConfig(slotId));
    return response.data.book_token.value;
  } catch (error) {
    console.log(error);
  }
}

// Finally, we'll make the reservation
async function makeBooking(book_token) {
  let config = finalConfig(process.env.AUTH_TOKEN);
  const formData = new FormData();
  formData.append(
    "struct_payment_method",
    JSON.stringify({ id: process.env.PAYMENT_ID }),
  );
  formData.append("book_token", book_token);
  formData.append("source_id", "resy.com-venue-details");

  try {
    const response = await axios.post(config.url, formData, {
      headers: {
        ...config.headers,
        ...formData.getHeaders(),
      },
    });
    return response.data;
  } catch (error) {
    console.log(error.response.data);
  }
}

export {
  checkForExistingBooking,
  getExistingBookings,
  singleDayFetch,
  getBookingConfig,
  makeBooking,
};
