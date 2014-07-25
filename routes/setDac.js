var express = require('express');
var router = express.Router();
var os = require('os');
//var tools = require('tools');

 
function assessDacRange(value)
{
	var dac = {value:0, max:4096, min:0}
	if(value > dac.max)
		{
		value = dac.max;
	}
	if(value < dac.min)
	{
		value = dac.min;
	}
	return value;
}

var internalSetDac = function(value, callback){
						console.log("DAC:\t" + value);
					 };
					 
// Check operating system and load SPI interface if linux is detected.
if (os.platform() == 'linux')
{
	// HW - interaction initial definition
	var SPI = require('spi');
	var spi = new SPI.Spi('/dev/spidev0.0', {
		'mode': SPI.MODE['MODE_0'],  // always set mode as the first option
		'chipSelect': SPI.CS['low'] // 'none', 'high' - defaults to low
	  }, function(s){s.open();});

	internalSetDac = function(value, callback){
			var txbuf = new Buffer(2);
			var rxbuf = new Buffer(2);
			txbuf.writeUInt16BE(value,0);

			//MCP4821 12BIT Byte structure
			//          [------- MSb ------][---14 ---][-- 13 -------------][ 12                 ]> Data
			//Details:  [0=Write, 1=Ignore ][Dont care][Gain 0: x 2 1: x 1 ][Shutdown:0, Active:1]> Data
			//Default:  [0                 ][0        ][1                  ][ 1                  ]> value
			//Default is 0x3x xx
			txbuf.writeUInt8(txbuf.readUInt8(0) | 0x30,0);
			spi.transfer(txbuf, rxbuf, callback("DAC" ,value));
	}
}

function setDac(request, callback)
{	
	var settings = {};	
	settings.dacValue = parseInt( request.value);	
	if (isNaN(settings.dacValue))
	{				
		console.log("Given value vas Not a number!");
	}
	else
	{
		internalSetDac(assessDacRange(settings.dacValue),callback);
	}
}



function calcAdc(adcValue)
{
	var minValue = 0.0303;
	var vdd = 3.371;
	var pga = 1;
	var maxAdcValue = 0x8000;
	var outputValue = adcValue/(maxAdcValue * pga) * vdd + minValue;
	outputValue = Math.round(outputValue * 1000)/1000;
	return outputValue;
}

var internalGetAdc = function(){
						return calcAdc(0x8000);
					 };
					 
// Check operating system and load i2c.
if (os.platform() == 'linux')
{
	var i2c = require('i2c');
	var address = 0x48;
	var wire = new i2c(address , { device: "/dev/i2c-1"});
	internalGetAdc = function(){
						wire.writeByte(0x0C, function(err){});
						res = wire.readBytes(0x0C,3,function(err,res){});
						return calcAdc(res.readUInt16BE(0));
					 }
}


function cmdDispatcher(req, callback)
{
	var request = eval(req.body);
	var response = {};	
	response.parameter = request.parameter;
	response.status = "OK";
	
	
	switch (request.parameter)
	{
		case "dac-value":
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

router.post('/save', function(req,res){
	var response = cmdDispatcher(req ,function(parameter, value){console.log(parameter + ":\t" + value);});
	res.writeHead(200);
	res.end(JSON.stringify(response));
});

module.exports = router;
