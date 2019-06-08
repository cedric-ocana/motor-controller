/*
 * @file This file manages the interaction with the Analog Digital Converter
 * @author Cedric Ocaña, BAKOM, 2012 - 2019, +41 79 443 36 03
 */

var os = require('os');
var tools = require('./tools.js');
var unknownAdcValue = -1;

/**
 *Exports maximum range if a value is fetched from ADC
 *@exports max
 */
exports.max = 0x8000;

/**
 *Exports minimum range if a value is fetched from ADC
 *@exports min
 */
exports.min = 0x0000;

/**
 *Converts a raw ADC value to a voltage
 *@param {number} adcValue - The RAW ADC value 
*/
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

/**
 *Emulation of getAdc - allows to emulate behaviour even if the hardware is not present.
 *getAdc function does return the current ADC value.
 */
var internalGetAdc = function(){
	return calcAdc(0x8000);
	};
/**
 *Emulation of getAdc2 - allows to emulate behaviour even if the hardware is not present.
 *getAdc function does return the current ADC value.
 */
var internalGetAdc2 = function(){
	return calcAdc(0x8000);
	};

/**
 *Emulation of getAdcCallback - allows to emulate behaviour even if the hardware is not
 *present. The getAdcCallback function is the asyncrone version of getAdc function
 *@param err - Error handling
 *@param callback - Callback function that expects an errror variable combined with the adcValue.
 */
var internalGetAdcCallback = function(err, callback){
	if (err) throw err;
	setTimeout( function delayGetAdc(){
		callback(null,unknownAdcValue);
	},145);
};

/**
 *Emulation of getAdcCallback2 - allows to emulate behaviour even if the hardware is not
 *present. The getAdcCallback2 function is the asyncrone version of getAdc function
 *@param err - Error handling
 *@param callback - Callback function that expects an errror variable combined with the adcValue.
 */
var internalGetAdc2Callback = internalGetAdcCallback;

/**
 *Initialization of the module.
 *If the hardware is available then it gets attached.
 *If no error occurs while attaching the hardware then the emulation functions get replaced
 *with the real functions. Change here if you replace the i2c ADC with something else.
 */
if (tools.hardwareAvailable())
{
        var i2cbus = require('i2c-bus');
        var i2c1 = i2cbus.openSync(1);
	var address  = 0x48;
	var address2 = 0x4A;

	/*
	 * Blocking version to get ADC value
	 */
	internalGetAdc = function(){
            i2c1.sendByteSync(address,0x0C);
            const buf1 = Buffer.from([0x00, 0x00, 0x00]);
            i2c1.readI2cBlockSync(address,0x0C,3,buf1);
            return buf1.readUInt16BE(0);
        };

	/*
	 * Blocking version to get ADC value from the second ADC unit
	 */
	internalGetAdc2 = function(){
            i2c1.sendByteSync(address2,0x0C);
            const buf1 = Buffer.from([0x00, 0x00, 0x00]);
            i2c1.readI2cBlockSync(address2,0x0C,3,buf1);
            return buf1.readUInt16BE(0);
        };

	/*
	 * Non-blocking version to get ADC value
	 */
        internalGetAdcCallback = function(err, getAdcCallback){
            if (err) throw err;
            const buffer = new Uint16Array(3);
            getAdcCallback(null,internalGetAdc());
        };

	/*
	 * Non-blocking version to get ADC value from the second ADC unit
	 */
        internalGetAdc2Callback = function(err, getAdcCallback){
            if (err) throw err;
            const buffer = new Uint16Array(3);
            getAdcCallback(null,internalGetAdc2());
        };
}

// Functions which will be available to external callers
exports.getValue = internalGetAdc;
exports.getAdcValue = internalGetAdcCallback;
exports.getAdc2Value = internalGetAdc2Callback;

