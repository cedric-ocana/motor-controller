

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
var tools = require('./tools.js');
var redis = require('redis');
var service = redis.createClient();
var client = redis.createClient();


// if you'd like to select database 3, instead of 0 (default), call
// client.select(3, function() { /* ... */ });

client.on("error", function (err) {
    console.log("Redis DAC-Client error\n" + err);    
});
var CONFIGURATION = {"DAC":{"RANGE":{"MIN":0,"MAX":4095},"INIT":2068}};
var SERVICE_NAME = "DAC-SERVICE";
var CACHED_VALUE = "dac-lastvalue";
var SERVICE_NAME_DAC_VALUE = "dac-value";
var SPI_DEVICE = '/dev/spidev0.0';

service.on("error", function(err){
    console.log("Redis DAC-Service error\n" + err);    
});

function assessDacRange(err, value, callback){
    if(err) throw err;
    if (isNaN(value))
    {				           
        throw new Error('Given parameter is not a number: '+ value);
    }
    else{
        if(value > CONFIGURATION.DAC.RANGE.MAX)
                {
                value = CONFIGURATION.DAC.RANGE.MAX;
        }
        if(value < CONFIGURATION.DAC.RANGE.MIN)
        {
                value = CONFIGURATION.DAC.RANGE.MIN;
        }        
    }
    callback(null, value,function(){});    
}

var internalSetDac = function(err, value, callback){
        if (err) throw err;
        client.set(CACHED_VALUE, value);
        console.log("Emulator\tDAC:\t" + value);
        callback(null, value);
    };

// Check operating system and load SPI interface if pi is detected.
if (tools.hardwareAvailable())
{
	// HW - interaction initial definition
	var SPI = require('spi');
	var spi = new SPI.Spi(SPI_DEVICE, {
		'mode': SPI.MODE['MODE_0'],  // always set mode as the first option
		'chipSelect': SPI.CS['low'] // 'none', 'high' - defaults to low
	  }, function(s){
              s.close();
              s.open();
          });

	internalSetDac = function(err, value, callback){                        
                        client.set(CACHED_VALUE, value);
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
        //* This is just to try to ensure that the DAC is initialized. 
        //  But I know it will not be executed in all cases in the correct order.
        internalSetDac(null, CONFIGURATION.DAC.INIT,function(){}); 
}  

function setLowLevelDacLevel(err, newValue){
    if (err){
        internalSetDac(null, CONFIGURATION.DAC.INIT,function(){});
        throw err;
    }         
    client.get(CACHED_VALUE, function checkIfDifferent(err, oldValue){   
        if (err){
            assessDacRange(null, newValue, internalSetDac);
        }
        if (oldValue != newValue){            
            assessDacRange(null, newValue, internalSetDac);
        }
    });
}


service.on("subscribe", function(channel, count){
	console.log(SERVICE_NAME + " subscribed for channel: " + channel);
});

service.on("message", function(channel, message){    
    if (channel === SERVICE_NAME_DAC_VALUE){
        tools.getInteger(message,setLowLevelDacLevel);		
    }
});

service.on("unsubscribe", function(channel, count){
        console.log(SERVICE_NAME + " unsubscribed for channel: " + channel);
	if (channel === SERVICE_NAME_DAC_VALUE){
            internalSetDac(null, CONFIGURATION.DAC.INIT,function(){});		
	}
});

service.subscribe(SERVICE_NAME_DAC_VALUE);

function intSetValueEmulator(err, newDacValue, callback){    
    if (err) throw err;    
    var dacValue = parseInt(newDacValue);	
    if (isNaN(dacValue))
    {				           
        throw new Error('Given parameter is not a number: '+ newDacValue);
    }
    else
    {        	        
        assessDacRange(null, dacValue, internalSetValue);      
    }         
}

exports.setValueEmulator = intSetValueEmulator;

function internalSetValue(err, newDacValue){   
    if (err) throw err;         
    tools.getInteger(newDacValue,function(err,value){            
        client.publish(SERVICE_NAME_DAC_VALUE,newDacValue,function(){});
    });	
}

exports.setValue = internalSetValue;

function resetEmulator(err) {
    return CONFIGURATION.DAC.INIT;
    if (err) throw err;
};

function reset(err) {
    return internalSetDac(null, CONFIGURATION.DAC.INIT,function(){});
    if (err) throw err;    
};

exports.resetEmulator = resetEmulator;
exports.reset = reset;

exports.open = function open(callback){    
    internalSetDac(null, CONFIGURATION.DAC.INIT,callback);
    service.subscribe(SERVICE_NAME_DAC_VALUE);
};

exports.close = function close(){
    service.unsubscribe(SERVICE_NAME_DAC_VALUE);    
};

exports.getDacValue = function internalGetDacValue(err, callback){
    client.get(CACHED_VALUE, callback);
};

exports.max = function getMax(){
    return CONFIGURATION.DAC.RANGE.MAX;
};

exports.min = function getMin() {
    return CONFIGURATION.DAC.RANGE.MIN;
};

exports.init = function getInit() {
    return CONFIGURATION.DAC.INIT;
};
