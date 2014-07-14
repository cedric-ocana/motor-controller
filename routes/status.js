var express = require('express');
var router = express.Router();
var os = require('os');

function calcAdc(adcValue)
{
	var minValue = 0.0303;
	var vdd = 3.371;
	var pga = 1;
	var maxAdcValue = 0x8000;
	var outputValue = adcValue/(maxAdcValue * pga) * vdd + minValue;
	outputValue = Math.round(outputValue * 1000)/1000;
}

var internalGetAdc = function(){
						return 3.3;
					 };
					 
// Check operating system and load SPI interface if linux is detected.
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


/* GET home page. */
router.get('/', function(req, res) {
  res.render('status', { title: 'Status', voltage: internalGetAdc()});
});

module.exports = router;
