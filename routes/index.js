var express = require('express');
//var functions = require('functions');
var router = express.Router();
var mastController = require('./mastController.js');

 
var controllerUpdateTimeout = 1000;
 
// var redis = require('redis');
// var client = redis.createClient();

// /* Error handling if we are unable to connect ot redis */
// client.on("error", function (err){
	// console.log("Redis server cannot be reached" + err);
// });


/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'MK - Motor Controller' });
});

function cmdDispatcher(req, callback)
{
	var request = eval(req.body);
	var response = {};	
	response.parameter = request.parameter;
	response.status = "OK";
	
	
	switch (request.parameter)
	{
		case "speed":
		{		
			setDac(request , callback);
			return response;
		}
		case "adc-value":
		{									
			response.value = internalGetAdc();			
			return response;
		}		
		default:
		{		
			response.status = "UNKNOWN";
			return response;
		}
	}
}


router.post('/control', function(req,res){
	var request = eval(req.body);
	console.log(req.body);
//        console.log(mastController.getOutOfRange())
	var response = {};
	response.status = "OK";
	
	res.writeHead(200);
	res.end(JSON.stringify(response));
});

// Update status of the mast controller module.
setInterval(mastController.updateController, controllerUpdateTimeout);

module.exports = router;
