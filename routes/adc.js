/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var os = require('os');
var tools = require('./tools.js');

var unknownAdcValue = -1;
exports.max = 0x8000;
exports.min = 0x0000;

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
                                         
var internalGetAdcCallback = function(err, callback){   
    if (err) throw err;
    setTimeout( function delayGetAdc(){
        callback(null,unknownAdcValue);
    },145);
};                                       

                                         
// Check operating system and load i2c.
if (tools.hardwareAvailable())
{
	var i2c = require('i2c');
	var address = 0x49;
	var wire = new i2c(address , { device: "/dev/i2c-1"});
        
        function sendCommand(callback){
            wire.writeByte(0x0C,callback);
        }
        
        function readBytes(callback){
            wire.readBytes(0x0C,3,callback);
        }
        
	internalGetAdc = function(){
						wire.writeByte(0x0C, function(err){});
						res = wire.readBytes(0x0C,3,function(err,res){});                                                 
						return res.readUInt16BE(0);
					 };

        internalGetAdcCallback = function(err, callback){
            if (err) throw err;
            sendCommand(readBytes(function convertToUint(err, res){                 
                callback(err, res.readUInt16BE(0));
            }));                            
        };
}                                         




// Functions which will be available to external callers
exports.getValue = internalGetAdc;
exports.getAdcValue = internalGetAdcCallback;
