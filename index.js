import {
  checkForExistingBooking,
  getExistingBookings,
  getBookingConfig,
  makeBooking,
  singleDayFetch
} from './utils/bookingLogic.js';

import { checkTokenExpiration, targetRestaurant, makeAMPM, convertDateToLongFormat, isTimeBetween } from './utils/helpers.js';

//INIT
const targetDate = "2025-01-27";
var targets = [
  //new targetRestaurant("American Bar", 9906, 20, "12:00:00", 2, "18:00:00", "22:00:00", targetDate),
  //new targetRestaurant("L'Artusi", 25973, 21, "09:00:00", 2, "18:00:00", "22:00:00", targetDate),
  new targetRestaurant("4 Charles", 834, 21, "09:00:00", 2, "18:00:00", "22:00:00", targetDate),
  new targetRestaurant("Torrisi", 64593, 30, "10:00:00", 2, "18:00:00", "22:00:00", targetDate),
  new targetRestaurant("Don Angie", 1505, 7, "9:00:00", 2, "18:00:00", "22:00:00", targetDate),
  new targetRestaurant("Carbone", 6194, 30, "10:00:00", 2, "18:00:00", "22:00:00", targetDate),
  new targetRestaurant("The Corner Store", 83517, 14, "10:00:00", 2, "18:00:00", "22:00:00", targetDate),
  new targetRestaurant("Lilia", 418, 29, "00:00:00", 2, "18:00:00", "22:00:00", targetDate),
  new targetRestaurant("Tatiana", 65452, 28, "12:00:00", 2, "18:00:00", "22:00:00", targetDate),
  new targetRestaurant("Bungalow", 80201, 20, "11:00:00", 2, "20:00:00", "23:00:00", targetDate)
]

//UPDATE TARGET DATES FOR SNIPING
updateForSniping();

let token = await checkTokenExpiration(process.env.AUTH_TOKEN);
if (token) {

  // BASIC SCRIPT: CHECK LIST ONCE NOW
  //checkListOnce();

  // ADVANCED SCRIPT: CHECK ALL AVAILABILITY
  checkAllDays();

}

//______________FUNCTIONS______________

async function checkPrimeDays() {

  checkAllDays(true);

}

async function checkAllDays(primeDaysOnly) 
{
  let targetSlots = [];
  let nonTargetSlots = [];
  let altSlots = [];
  let existing = await getExistingBookings(); //get existing bookings (repeating per restaurant in case of mid-loop autobook)

  //FOR EACH RESTAURANT ON THE LIST
  for (let i = 0; i < targets.length; i++) {

    console.log(`Checking ${targets[i].name}...`);
    const [year, month, day] = targets[i].resDate.split('-');

    //FOR EACH DATE TO CHECK
    for (let j = 0; j <= targets[i].daysInAdvance; j++) { //<= so that we get 0 days in advance (today)
      let date = new Date(year, month-1, day);
      date.setDate(date.getDate() - j);
      const new_year = date.getFullYear();
      const new_month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
      const new_day = String(date.getDate()).padStart(2, '0'); 
      const toCheck = `${new_year}-${new_month}-${new_day}`;
      
      //CHECK IF ALREADY BOOKED ON THAT DAY
      let isAlt = false;

      // FOREACH EXISTING BOOKING
      for (let k = 0; k < existing.length; k++) {
        
        // IF WE ALREADY HAVE A RES ON THE TARGET DATE
        if (existing[k].resDate == toCheck) {
          isAlt = true; //DONT AUTO BOOK, JUST DISPLAY
          break; 
        }
      }

      // POPULATE TARGET LIST
      if(primeDaysOnly){
        
      }
      targets[i].resDate = toCheck; // update target date
      let slots = await singleDayFetch( targets[i] ); // run the search
      if(slots != null) { 
        
        // FOR EACH OPEN SLOT ON THIS DAY
        for (let l=0; l<slots.length; l++) {
                      
          // IF THE SLOT IS IN THE TARGET TIME RANGE
          if (isTimeBetween(targets[i].minResTime, targets[i].maxResTime, slots[l].date.start)) {
            console.log(``);
            // IF WE DON'T ALREADY HAVE A RES ON THIS DAY
            if(!isAlt){ 
              targetSlots.push(slots[l]);
              console.log(`+tar`);
            }
            else {
              altSlots.push(slots[l]);
              console.log(`+alt`);
            }
          } 
          else {
            console.log(`+non-tar`);
            nonTargetSlots.push(slots[l]);
          } 
        }//finished all slots at one restaurant on one day
      }
    } //finished all dates for a restaurant
  } //finished all dates for all restaurants

  takeAction(targetSlots,altSlots,nonTargetSlots);
} // end

function updateForSniping() {
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  for (let i=0; i<targets.length; i++) {
    const result = new Date();
    result.setDate(result.getDate() + targets[i].daysInAdvance);
    const [hours, minutes, seconds] = targets[i].releaseTime.split(":").map(Number);
    result.setHours(hours, minutes, seconds, 0);

    console.log(`${weekdays[result.getDay()]}, ${months[result.getMonth()]} ${result.getDate()} slots live at ${makeAMPM(targets[i].releaseTime)} || ${targets[i].name}`);

    //shitty code, but reformat new resDate to yyyy-mm-dd, update triggertime
    const hyear = result.getFullYear();
    const hmonth = String(result.getMonth() + 1).padStart(2, '0'); // January is 0!
    const hday = String(result.getDate()).padStart(2, '0');

    targets[i].resDate = `${hyear}-${hmonth}-${hday}`
    targets[i].triggerTime = result.getTime()
  }
}

async function checkListOnce() {
  for (let i = 0; i < targets.length; i++) {
    let existingBooking = await checkForExistingBooking(targets[i]);
    if (!existingBooking) {

      // FIND RESERVATIONS
      let slots = await singleDayFetch( targets[i] );

      // BOOK RESERVATIONS
      if (slots) {
        let bookToken = await getBookingConfig(slots);
        let booking = await makeBooking(bookToken);
        if (booking.resy_token) {
          console.log(`You've got a reservation!`);
        } else {
          console.log(`Something went to 💩`);
        }
      }
    } else {
      console.log(`You already have a reservation at ${targets[i].name} on ${targets[i].resDate}`);
    }
  }
}

async function takeAction(targetSlots, altSlots, nonTargetSlots) {
  let booked = false
  displaySlotList(targetSlots, 'target');
  displaySlotList(nonTargetSlots, 'non-target');
  displaySlotList(altSlots, 'alternative');
  /*
  if(targetSlots.length > 0) {
    displaySlotList(targetSlots, 'target');

    /* TODO: BOOKING LOGIC
    let bookToken = await getBookingConfig(targetSlots[0].config.token);
    let booking = await makeBooking(bookToken);
    if (booking.resy_token) {
      console.log(`You've got a reservation!`);
      booked = true;
    } else {
      console.log(`Something went to 💩`);
    } 
  }
  else if (nonTargetSlots.length > 0) {
    displaySlotList(nonTargetSlots, 'non-target');
  }
  else {console.log(`No new reservations`);}

  if(altSlots.length > 0) {
    displaySlotList(altSlots, 'alternative');
  }
  */
 if (booked) {return true} return false;
}

function displaySlotList (slots, type) {
  //DISPLAY
  console.log(`${slots.length} ${type} slots found:`)
  for (let m=0; m<slots.length; m++) {
    let resType = slots[m].config.type
    const [date,time] = slots[m].date.start.split(' ');
    let venueID = slots[m].config.token.split('/resy/')[1].split('/')[0]
    let venue = "unknown";
    for (let x=0; x<targets.length; x++) {
      if (targets[x].venueID == venueID) {
          venue = targets[x].name;
      }
    }
    console.log(`   ${makeAMPM(time)} ${resType} on ${convertDateToLongFormat(date)} at ${venue}`);
  }
}

//END








//______________OLD______________
//let existingBooking = await checkForExistingBooking(targets[0]);
  /*
  if (!existingBooking) {
    let slots = await fetchDataAndParseSlots();

    if (slots) {
      let bookToken = await getBookingConfig(slots);
      let booking = await makeBooking(bookToken);
      if (booking.resy_token) {
        console.log(`You've got a reservation!`);
      } else {
        console.log(`Something went to 💩`);
      }
    }
  }
  */

    /* PRINT OUT EXISTING BOOKINGS
  console.log("Your Booked Reservations:");
  for (let x=0; x<1; x++) { //existing.length; x++) {
    console.log(existing[x]);
    let venueID = existing[x].venue.id;
    let date = existing[x].date;
    let time = existing[x].time_slot;
    console.log(`${venueID} on ${convertDateToLongFormat(date)} at ${makeAMPM(time)}`);
  }*/