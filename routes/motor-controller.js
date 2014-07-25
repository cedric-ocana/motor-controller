var express = require('express');
var router = express.Router();

var redis = require('redis');
var client = redis.createClient();

/* Error handling if we are unable to connect ot redis */
client.on("error", function (err){
	console.log("Redis server cannot be reached");
});



var acceleration = [0.001,0.004,0.009,0.016,0.024,0.035,0.048,0.062,0.078,0.095,0.115,0.136,0.158,0.181,0.206,0.232,0.259,0.287,0.316,0.345,0.376,0.406,0.437,0.469,0.5,0.531,0.563,0.594,0.624,0.655,0.684,0.713,0.741,0.768,0.794,0.819,0.842,0.864,0.885,0.905,0.922,0.938,0.952,0.965,0.976,0.984,0.991,0.996,0.999,1];
var deceleration = [0.999,0.996,0.991,0.984,0.976,0.965,0.952,0.938,0.922,0.905,0.885,0.864,0.842,0.819,0.794,0.768,0.741,0.713,0.684,0.655,0.624,0.594,0.563,0.531,0.5,0.469,0.437,0.406,0.376,0.345,0.316,0.287,0.259,0.232,0.206,0.181,0.158,0.136,0.115,0.095,0.078,0.062,0.048,0.035,0.024,0.016,0.009,0.004,0.001,0];



function accelerate(currentSpeed, newSpeed)
{

}


function getSpeed()
{
    var startTime = process.hrtime();
    // Get the ADC value
    process.nextTick();
    

    setTimeout(function() {
      var diff = process.hrtime(time);
      // [ 1, 552 ]

      console.log('benchmark took %d nanoseconds', diff[0] * 1e9 + diff[1]);
      // benchmark took 1000000527 nanoseconds
    }, 1000);
}




module.exports = router;
