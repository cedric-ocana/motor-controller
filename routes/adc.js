/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
var os = require('os');



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




// Functions which will be available to external callers
exports.getAdcValue = internalGetAdc;