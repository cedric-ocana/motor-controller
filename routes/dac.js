/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var tools = require('./tools.js');
var redis = require('redis');
var client = redis.createClient();

// if you'd like to select database 3, instead of 0 (default), call
// client.select(3, function() { /* ... */ });

client.on("error", function (err) {
    console.log("Redis client could not be started!\n" + err);
});

var CONFIGURATION = {"DAC":{"RANGE":{"MIN":0,"MAX":4095},"INIT":2068}};


function assessDacRange(value, callback)
{
	if(value > CONFIGURATION.DAC.RANGE.MAX)
		{
		value = CONFIGURATION.DAC.RANGE.MAX;
	}
	if(value < CONFIGURATION.DAC.RANGE.MIN)
	{
		value = CONFIGURATION.DAC.RANGE.MIN;
	}        
	callback(null, value);
}

var internalSetDac = function(value, callback){
        console.log("[Windows]\tDAC:\t" + value);
        callback(null, value);
    };

// Check operating system and load SPI interface if pi is detected.

if (tools.hardwareAvailable())
{
	// HW - interaction initial definition
	var SPI = require('spi');
	var spi = new SPI.Spi('/dev/spidev0.0', {
		'mode': SPI.MODE['MODE_0'],  // always set mode as the first option
		'chipSelect': SPI.CS['low'] // 'none', 'high' - defaults to low
	  }, function(s){
              s.close();
              s.open();
          });

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
			spi.transfer(txbuf, rxbuf, function(){
                            callback(null, value);
                        });
	};
        
        console.log("DAC INITIALIZATION DONE");
        internalSetDac(CONFIGURATION.DAC.INIT,function(){});
        
}

client.set("dac-value", 2068);
client.set("dac-run", 1);

function setLowLevelDacLevel(err, value)
{
    if (err){
        console.log("setLowLevelDacLevel: Check redis!");
        internalSetDac(CONFIGURATION.DAC.INIT,function(){});
        throw err;
    } 
    console.log("New value set" + value);
    internalSetDac(value,function(){});
}

function dacController(err,value)
{
    if (err){
        internalSetDac(CONFIGURATION.DAC.INIT,function(){});
        throw err;
    }         
//    if (value === 1){        
        client.get("dac-value", setLowLevelDacLevel);
        setTimeout(function(){
            client.get("dac-run", dacController);
        },300);
//    }
//    else{
//        setTimeout(function(){
//            client.get("dac-run", dacController);
//        },300);
////        console.log("Wow DAC stop called!" + value === 1);
////        console.log("Wow DAC stop called!" + value === 1);
////        internalSetDac(CONFIGURATION.DAC.INIT,function(){});
//    }       
}

dacController(null, 1);





function intSetValueEmulator(err, newDacValue, callback){    
    if (err) throw err;    
    var dacValue = parseInt(newDacValue);	
    if (isNaN(dacValue))
    {				           
        throw new Error('Given parameter is not a number: '+ newDacValue);
    }
    else
    {        
        assessDacRange(dacValue, callback);      
    }         
}


exports.setValueEmulator = intSetValueEmulator;

function internalSetValue(err, newDacValue, callback){   
    if (err) throw err;  
    intSetValueEmulator(null, newDacValue, function(err, value){
        client.set("dac-value", value, callback);
        
    });
}

exports.setValue = internalSetValue;

function resetEmulator(err) {
    return CONFIGURATION.DAC.INIT;
    if (err) throw err;
};



function reset(err) {
    return internalSetDac(CONFIGURATION.DAC.INIT,function(){});
    if (err) throw err;    
};

exports.resetEmulator = resetEmulator;
exports.reset = reset;

exports.max = function getMax(){
    return CONFIGURATION.DAC.RANGE.MAX;
};

exports.min = function getMin() {
    return CONFIGURATION.DAC.RANGE.MIN;
};

exports.init = function getInit() {
    return CONFIGURATION.DAC.INIT;
};