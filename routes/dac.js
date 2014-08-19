/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
var os = require('os');

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
                                                callback(null);
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
			spi.transfer(txbuf, rxbuf, callback);
	};
}




function intSetValueEmulator(err, newDacValue){
    if (err) throw err;
    console.log(newDacValue);
    var dacValue = parseInt(newDacValue);	
    if (isNaN(dacValue))
    {				
            console.log("Given value vas Not a number!");

            throw new Error('Given parameter is not a number');
    }
    else
    {
        return assessDacRange(dacValue);      
    }         
}

exports.setValueEmulator = intSetValueEmulator;

exports.setValue = function setValue(err, newDacValue){
    if (err) throw err;
    var dacValue = intSetValueEmulator(newDacValue);
    internalSetDac(dacValue,function errorDuringSetDac(err){if (err) throw err}); 
    return dacValue;
};