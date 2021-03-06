

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
var CHANNEL_DAC_VALUE = "dac-value";
//Target device is '/dev/spidev0.0'
var SPI_DEVICE = 0;
var SPI_DEVICE_NUMBER = 0;

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
	var SPI = require('spi-device');
	var spi = SPI.openSync(SPI_DEVICE, SPI_DEVICE_NUMBER);

	internalSetDac = function(err, value, callback){   
                        if (err){
                            internalSetDac(null, CONFIGURATION.DAC.INIT,function(){});
                            throw err;
                        }
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
                        // An SPI message is an array of one or more read+write transfers
                        var message = [{
                          sendBuffer: txbuf, // Sent to read channel 5
                          receiveBuffer: rxbuf,               // Raw data read from channel 5
                          byteLength: 2,
                          speedHz: 20000 // Use a low bus speed to get a good reading from the TMP36
                        }];                        
			spi.transfer(message, function(err, message){
                            callback(null, value);
                        });
                        
	};        
        //* This is just to try to ensure that the DAC is initialized. 
        //  But I know it will not be executed in all cases in the correct order.
        internalSetDac(null, CONFIGURATION.DAC.INIT,function(){}); 
}  

function setDacLevel(err, newValue){
    if (err){
        internalSetDac(null, CONFIGURATION.DAC.INIT,function(){});
        throw err;
    }         
    client.get(CACHED_VALUE, function checkIfDifferent(err, oldValue){   
        if (err){
            assessDacRange(null, newValue, internalSetDac);
        }
        if (oldValue !== newValue){            
            assessDacRange(null, newValue, internalSetDac);
        }
    });
}


service.on("subscribe", function(channel, count){
    console.log(SERVICE_NAME + " subscribed for channel: " + channel);
    if (channel === CHANNEL_DAC_VALUE){
	internalSetDac(null, CONFIGURATION.DAC.INIT,function(){});		
    }	
});

service.on("message", function(channel, message){    
    if (channel === CHANNEL_DAC_VALUE){
        tools.getFloat(message,setDacLevel);		
    }
    if (channel === tools.CHANNEL_EMERGENCY){
	if (message === tools.MSG_EMERGENCY_STOP){
	    service.unsubscribe(CHANNEL_DAC_VALUE);
	    internalSetDac(null, CONFIGURATION.DAC.INIT,function(){});		
	}
	console.log("Message:" + message);
	if (message === tools.MSG_EMERGENCY_RELEASE){
	    internalSetDac(null, CONFIGURATION.DAC.INIT,function(){});		
	    service.subscribe(CHANNEL_DAC_VALUE);
	}	
    }    
});

service.on("unsubscribe", function(channel, count){
    console.log(SERVICE_NAME + " unsubscribed from channel: " + channel);
    if (channel === CHANNEL_DAC_VALUE){
		internalSetDac(null, CONFIGURATION.DAC.INIT,function(){});		
    }
});

service.subscribe(CHANNEL_DAC_VALUE);
service.subscribe(tools.CHANNEL_EMERGENCY);

function intSetValueEmulator(err, newDacValue, callback){    
    if (err) throw err;    
    var dacValue = parseFloat(newDacValue);	
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
    tools.getFloat(newDacValue,function(err,value){            
        client.publish(CHANNEL_DAC_VALUE,newDacValue,function(){});
    });	
}

exports.setValue = internalSetValue;

exports.lowLevelDriverNoProtectionSetValue = setDacLevel;

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
    service.subscribe(CHANNEL_DAC_VALUE);
};

exports.close = function close(){
    service.unsubscribe(CHANNEL_DAC_VALUE);    
};

	
function internalGetDacValue(err, callback){
    client.get(CACHED_VALUE, function(err, value){
		tools.getFloat(value, callback);
	});
};
exports.getDacValue = internalGetDacValue;

exports.max = function getMax(){
    return CONFIGURATION.DAC.RANGE.MAX;
};

exports.min = function getMin() {
    return CONFIGURATION.DAC.RANGE.MIN;
};

exports.init = function getInit() {
    return CONFIGURATION.DAC.INIT;
};


exports.isMoovingDown = function(callback){
	internalGetDacValue(null, function(err, dacValue){
		if(dacValue< CONFIGURATION.DAC.INIT){
			callback(null, true);
		}
		callback(null,false);
	});
};

exports.isMoovingUp = function(callback){
	internalGetDacValue(null, function(err, dacValue){
		if(dacValue< CONFIGURATION.DAC.INIT){
			callback(null, true);
		}
		callback(null,false);
	});
};

exports.isMooving = function(callback){
	internalGetDacValue(null, function(err, dacValue){
		if(dacValue == CONFIGURATION.DAC.INIT){
			callback(null, false);
		}
		callback(null, true);
	});
};