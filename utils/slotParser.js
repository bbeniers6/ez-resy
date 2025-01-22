import { convertTimeToTwelveHourFormat, isTimeBetween, makeAMPM} from './helpers.js';

async function slotParser(rawSlots, targetRestaurant) {

}

/*
Don't need:
async function slotChooser(slot, time, type, targetRestaurant) {
  if (isTimeBetween(targetRestaurant.minResTime, targetRestaurant.maxResTime, slot.date.start)) {
    console.log(`Booking a prime slot at ${time} ${type === 'Dining Room' ? 'in' : 'on'} the ${type}!`);
    return slot.config.token;
  }
}*/

export { slotParser };
