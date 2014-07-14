var express = require('express');
var router = express.Router();
var os = require('os');
var internalSetDac = function(value, dac, callback){
						console.log("DAC:\t" + value);
						};
if (os.platform() == 'linux')
{
	var SPI = require('spi');
	var spi = new SPI.Spi('/dev/spidev0.0', {
		'mode': SPI.MODE['MODE_0'],  // always set mode as the first option
		'chipSelect': SPI.CS['low'] // 'none', 'high' - defaults to low
	  }, function(s){s.open();});

	internalSetDac = function(value, dac, callback){
		if(value > 4095)
			{
			value = 4095;
		}
		if(value < 0)
		{
			value = 0;
		}
		
			var txbuf = new Buffer(2);
			var rxbuf = new Buffer(2);
			txbuf.writeUInt16BE(value,0);

			//MCP4821 12BIT Byte structure
			//          [------- MSb ------][---14 ---][-- 13 -------------][ 12                 ]> Data
			//Details:  [0=Write, 1=Ignore ][Dont care][Gain 0: x 2 1: x 1 ][Shutdown:0, Active:1]> Data
			//Default:  [0                 ][0        ][1                  ][ 1                  ]> value
			//Default is 0x3x xx
			txbuf.writeUInt8(txbuf.readUInt8(0) | 0x30,0);
			spi.transfer(txbuf, rxbuf, callback(value));
	}
}

// HW - interaction initial definition






router.post('/save', function(req,res){
 var dac = {value:0, max:4096, min:0}
 var settings = {};

 settings.dacValue = parseInt( req.body['dac-value']);
 if (isNaN(settings.dacValue))
 {
  settings.dacValue = 0;
  console.log("Given value vas Not a number!");
 }
 internalSetDac(settings.dacValue,dac,function(dac){console.log("DAC:\t" + dac);});
 res.redirect('back');
});

module.exports = router;
