/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/*
 * 
 * Configuration of the hardware module.
 * As there is only one Hardware this configuration is valid for all clients. 
 */

var dac = require('./dac.js');
var gpio = require('./gpio.js');
var adc = require('./adc.js');
var tools = require('./tools.js');
var redis = require('redis');
var redis = require('redis');
var service = redis.createClient();
var client = redis.createClient();

client.on("error", function (err) {
    console.log("Redis DAC-Client error\n" + err);    
});





var mode = "emulator";
if (tools.hardwareAvailable())
{
    mode = "real";
}
var acceleration = [0.001,0.004,0.009,0.016,0.024,0.035,0.048,0.062,0.078,0.095,0.115,0.136,0.158,0.181,0.206,0.232,0.259,0.287,0.316,0.345,0.376,0.406,0.437,0.469,0.5,0.531,0.563,0.594,0.624,0.655,0.684,0.713,0.741,0.768,0.794,0.819,0.842,0.864,0.885,0.905,0.922,0.938,0.952,0.965,0.976,0.984,0.991,0.996,0.999,1];
var deceleration = [0.999,0.996,0.991,0.984,0.976,0.965,0.952,0.938,0.922,0.905,0.885,0.864,0.842,0.819,0.794,0.768,0.741,0.713,0.684,0.655,0.624,0.594,0.563,0.531,0.5,0.469,0.437,0.406,0.376,0.345,0.316,0.287,0.259,0.232,0.206,0.181,0.158,0.136,0.115,0.095,0.078,0.062,0.048,0.035,0.024,0.016,0.009,0.004,0.001,0];

function getSpeed(signedRatio){
    return dac.init() + dac.init() * signedRatio;
}

var configuration = {"mode":mode,
                     "status":-1,
                    "dac":{"value":0},
                    "adc":{
                        "value":43500,
                       /* Basic formula is:
                        * h = n * ((r1 + r2) * 2 * pi * npot/nmax) + offset
                        * h = n * multiplicator + offset
                        * where:
                        * h     := height of the antenna holding tray
                        * r1    := the radius of the cylinder that coils up the cable
                        * r2    := radius of the cable
                        * nmax  := maximal value the adc may get
                        * n     := value that was read out of the ADC
                        * npot  := number of turns of the variable resistor
                        * pi    := 3.141593    
                        * offset:= The offset between measured and calculated values                
                        */
                        "multiplicator":0.0052729034423828125,
                        "loffset": -134.485132598877,
                        "lmax":500,
                        "lfixation":32,
                        "lweel":49
                    },
                    "position":{
                        "actual":110,
                        "default":120,
                        "tolerance":0.05
                    }, //32768
                    "speed":{
                        "zero":getSpeed(0.00), //OK this value comes from a i7...
                        "up": {
                            "fast": {
                                "distance": 50,
                                "speed": 0
                            },
                            "normal": {
                                "distance": 5,
                                "speed": 1100
                            },
                            "slow": {
                                "distance": 1,
                                "speed": 1500
                            }
                        },
                        "down": {
                            "fast": {
                                "distance": 50,
                                "speed": getSpeed(1.00)
                            },
                            "normal": {
                                "distance": 5,
                                "speed": 2800
                            },
                            "slow": {
                                "distance": 1,
                                "speed": 2300
                            }
                        },                                               
                        "tsampling":100,
                        "dtDeceleration":1,
                        "dtAcceleration": 1                        
                        }                                  
                    };
                    
                    
var previousCall = function(){};               


function emulatorActive(){
    return configuration.mode === "emulator";    
}

exports.emulatorActive = emulatorActive();

function dispatcher(callbackToNonEmulatedFunction, callbackToEmulatedFunction)
{
    try{
        if (emulatorActive())
            return callbackToEmulatedFunction();
        else
            return callbackToNonEmulatedFunction();
            
    }catch (exeption)
    {        
        console.log("Dispatching error. Emulator callback is ["  +
                typeof(callbackToEmulatedFunction) + 
                "] Real callback is [" + 
                typeof(callbackToNonEmulatedFunction) +"]");        
        return undefined;
    }
}

exports.getMode = function getMode(err){
    if (err) throw err; 
    return configuration.mode;
};

exports.setMode = function setMode(err, newMode) {
    if (err) throw err; 
    if (newMode==="emulator")
    {
        configuration.mode = "emulator";
    }
    else
    {
        configuration.mode = "real";
    }
    console.log("New mode: " + configuration.mode);
};
/*TODO 
 * On a resetMode call the mode should match the capabilties of the server environment.
 * If possible then set to real mode if not continue with the emulatrion.
 * */

exports.resetMode = function resetMode(err){
    if (err) throw err; 
    configuration.mode = "emulator";
};

function getAdcValueInternal(err, callback){
    if (err) throw err;     
    if (callback === null){
        if(!emulatorActive()){
            configuration.adc.value = adc.getValue();
        }
    }
    else{
        if (emulatorActive()) {
            //console.log("Old value:" + configuration.adc.value);
            //configuration.adc.value = configuration.adc.value + 1;

            //console.log("New value:" + configuration.adc.value);            
            callback(null, configuration.adc.value);
        }
        else{
            adc.getAdcValue(null, callback);
        }
    }
    return configuration.adc.value;
}

exports.getAdcValue = getAdcValueInternal;

exports.setAdcValue = function setAdcValue(err, value){
    if (err) throw err; 
    configuration.adc.value = value;
};

exports.getDacValue = dac.getDacValue;


function changeSpeed(vTarget, callback){
//    var vDelta = vTarget > configuration.dac.value ? vTarget - configuration.dac.value : configuration.dac.value - vTarget;    
    var vDelta = configuration.dac.value - vTarget;
    with (configuration.speed){
        if (!((vDelta < 5) && (vDelta > 5))) {            
            //console.log("Current, Target, delta: " + configuration.dac.value + ", " + vTarget + ", " + vDelta);
            setDacValueInternal(null,(vTarget));
            //celerate(0, vDelta, vTarget, dtDeceleration, deceleration , callback);            
        }
        callback(null);   
    }
}


function celerate(index, vDelta, vTarget, dt, table, callback) {
    var value = deceleration[index];
    if (acceleration[0] === table[0]) {
        value = acceleration[index];
    }
    value = table[index];
    console.log("vTarget:" + vTarget + ",Index:" + index + "Value:" + (vTarget - value * vDelta));
    setDacValueInternal(null,(vTarget - value * vDelta));

    if (index++ < table.length - 1){
        setTimeout(function recursiveCallCelerate(){
            celerate(index, vDelta, vTarget, dt, table, callback);
        },dt);
    }
    else{
        callback();
    }
      
}

function clrSpeedValueInternal(err, callback){ 
    if (err) throw err; 
    
    changeSpeed(configuration.speed.zero, callback);    
}
exports.clrSpeed = clrSpeedValueInternal;

function setSpeedValueInternal(err, value, callback){ 
    if (err) throw err;     
    clrPosition();
    changeSpeed(value, callback);    
}
exports.setSpeed = setSpeedValueInternal;

function clrDacValueInternal(err, callback){ 
    if (err) throw err;     
    setDacValueInternal(null,configuration.speed.zero);
    callback();
}
exports.clrDacValue = clrDacValueInternal;

function setDacValueInternal(err, newDacValue){   
    if (err) throw err;        
    dac.setValue(err, newDacValue, function(){});
}

exports.setDacValue = setDacValueInternal;

exports.setLimitoverride = function setLimitoverride(){
    gpio.SetLimitoverride();
};

exports.clrLimitoverride = function clrLimitoverride(){
    gpio.clrLimitoverride();
};

function calcNanoSeconds(time){
    return (time[0] * 1e9 + time[1]);
}

function internalGetSpeed(err, callback){
    var startTime = process.hrtime();
    getAdcValueInternal(err,function(firstError, firstValue){        
        setTimeout(function(){
            var fristIntermediateTime = process.hrtime(); 
            getAdcValueInternal(err,function(secondError,secondValue){            
                var measurementDuration2 = calcNanoSeconds(process.hrtime(fristIntermediateTime));                        
                var measurementDuration = calcNanoSeconds(fristIntermediateTime) - calcNanoSeconds(startTime);
                var averageDuration = (measurementDuration + measurementDuration2)/2;
                var diff = Math.abs( measurementDuration2 - measurementDuration)/2;
                var dt =  averageDuration - diff;            
                var result = {};
                result.dt = (dt / 1e9);
                result.du = (secondValue - firstValue);
                result.adc  = secondValue;
                result.speed = result.du / result.dt;
                configuration.adc.value = result.adc;
                //console.log("timeout:" + measurementDuration + "ADC fetching delay: " + result.dt + ", ADC difference: " + result.du);
                callback(null, result);
            }); 
        },100);
    });
}
exports.getSpeed = internalGetSpeed;

function move(err, distance, settings, callback){
    //changeSpeed(settings.slow.speed, callback);
    if (distance <= settings.slow.distance) {
        changeSpeed(settings.slow.speed, callback);
    }
    else{
        if (distance <= settings.normal.distance) {
            changeSpeed(settings.normal.speed, callback);
        }
        else{           
//            if (distance > settings.fast.distance) {
                changeSpeed(settings.fast.speed, callback);
//            }
//            else{
//                clrSpeedValueInternal(null,callback);
//            }
        }
    }
}
function moveUp(err, distance, callback){    
    if (emulatorActive()){       
        configuration.adc.value = configuration.adc.value - 20;
    }
    move(err, distance, configuration.speed.up, callback);
}
function moveDown(err, distance, callback){
    if (emulatorActive()){       
        configuration.adc.value = configuration.adc.value + 20;
    }
    move(err, distance, configuration.speed.down, callback);
}
var CACHED_TARGET_POSITION = "target-position";
var CACHED_POSITIONLOOP_ACTIVE = "position-loop";
var SERVICE_NAME = "HARDWARE-SERVICE";
var CHANNEL_POSITION_HANDLER = "position-handler";

exports.setPosition = function setPosition(err, position, callback){      
    client.publish(CHANNEL_POSITION_HANDLER,position,callback);
};

function clrPosition(err,callback){
    client.get(CACHED_TARGET_POSITION, function(err, tempTargetPosition){
        if (tempTargetPosition !== "-1"){
            client.publish(CHANNEL_POSITION_HANDLER,-1,callback);    
        }
    });
}
exports.clrPosition = clrPosition;

function setEmergency(){
    client.publish(tools.CHANNEL_EMERGENCY,tools.MSG_EMERGENCY_STOP,function(){});
    client.set(tools.FLAG_EMERGENCY_ONGOING,1);    
};
exports.setEmergency = setEmergency;

function clrEmergency(){
    client.set(tools.FLAG_EMERGENCY_ONGOING,0);
    client.publish(tools.CHANNEL_EMERGENCY,tools.MSG_EMERGENCY_RELEASE,function(){});
};
exports.clrEmergency = clrEmergency;

function isEmergencyOngoing(err, callback){
    client.get(tools.FLAG_EMERGENCY_ONGOING, callback);
};

exports.isEmergencyOngoing = isEmergencyOngoing;

function getPositionFromAdcValue(adcValue){     
    with (configuration.adc){        
        return lmax - adcValue * multiplicator + loffset;
    }
}

function getPositionInternal(err, callback){      
    internalGetSpeed(err, function(err, value){
        if (err) throw err;         
        value.position = getPositionFromAdcValue(value.adc);
        //console.log("Calculated Value: " + value.position  +"\t ADC - Value: " + value.adc);
        callback(null, value);
    });
}

function monitorStatus(){   
    gpio.getLimitswitch(function(err, limitSwitch){
        if (limitSwitch == 0){	            
            gpio.clrLimitoverride(function(err, status){
                setTimeout(function(){               	    
                    getPositionInternal(null, function(err, value){
                        var speed = configuration.speed.down.normal.speed;
                        if(value.position <= 135){		   
                            speed  = configuration.speed.up.normal.speed;	    
                        }
                        console.log("Recovering from out of range. DAC:" + speed);
                        dac.lowLevelDriverNoProtectionSetValue(null, speed);		    
                        gpio.setLimitoverride(function(){});
                    });
                    setEmergency();
                    setTimeout(monitorStatus, 500);                    
                },500);
            });
        }
        else{
            console.log("Monitoring limit switch.");
            isEmergencyOngoing(null, function(err, value){
                if(value==="1"){
                    dac.reset();
                }                
            });
            setTimeout(monitorStatus, 500);
        }           
    });    
    
}


service.on("subscribe", function(channel, count){
    console.log(SERVICE_NAME + " subscribed for channel: " + channel);
    if (channel === CHANNEL_POSITION_HANDLER){	
	client.set(CACHED_POSITIONLOOP_ACTIVE,"1");	
    }
});

service.on("message", function(channel, message){        
    if (channel === CHANNEL_POSITION_HANDLER){
        console.log("Move to: " + message + "cm");  
        client.set(CACHED_TARGET_POSITION,message, function(err, value){
            positionLoop(null, "1");
        }); 
    }
    if (channel === tools.CHANNEL_EMERGENCY){
	if (message === tools.MSG_EMERGENCY_STOP){
	    service.unsubscribe(CHANNEL_POSITION_HANDLER);		    
	}
	if (message === tools.MSG_EMERGENCY_RELEASE){
	    service.subscribe(CHANNEL_POSITION_HANDLER);
	    getPositionInternal(null, function(err, data){
		client.set(CACHED_TARGET_POSITION,data.position);
	    });	    
	}	
    }
});

service.on("unsubscribe", function(channel, count){
        console.log(SERVICE_NAME + " unsubscribed from channel: " + channel);
	if (channel === CHANNEL_POSITION_HANDLER){
            client.set(CACHED_POSITIONLOOP_ACTIVE,"0");    
	}
});



function moveThorwardsPosition(positionReached){    
    client.get(CACHED_TARGET_POSITION, function(err, tempTargetPosition){
	  
	    tools.getFloat(tempTargetPosition, function(err, targetPosition){
		getPositionInternal(err, function(err, data){
		    if (err) throw err;                    
		    with (data){
			//console.log("Position loop active" + targetPosition + "Current Position:" + position);
                        if (targetPosition > 0){
                            var distance = Math.abs(targetPosition-position);
                            var limit = {};       
                            limit.max = targetPosition + configuration.position.tolerance;
                            limit.min = targetPosition - configuration.position.tolerance;
                            if(position > limit.max){
                                console.log("DOWN: " + ((targetPosition * 10)|0) + "mm, Current: " + ((data.position * 10)|1) + "mm, >" + ((limit.max * 10)|1) +"mm, <" + ((limit.min * 10)|0) + "mm, distance:" + (distance) + "bit" );            
                                moveDown(null, distance, function(err){
                                    positionReached(null, 0);
                                });                        
                            }
                            else{
                                if (position < limit.min){
                                    console.log("UP  : " + ((targetPosition * 10)|0) + "mm, Current: " + ((data.position * 10)|1) + "mm, >" + ((limit.max * 10)|1) +"mm, <" + ((limit.min * 10)|0) + "mm, distance:" + (distance) + "bit");            
                                    moveUp(null, distance, function(err){
                                        positionReached(null, 0);
                                    });                             
                                }
                                else{
                                    positionReached(null, 1);
                                }
                            }                         
                        }
                        else{
                            positionReached(null, 1);
                        } 
		    }
		});
	    });
    });     
}



function positionLoop(err, value){
    if (err) throw err;
    if (value == "1"){        
	moveThorwardsPosition(function(err, positionReached){
	    if (err) throw err;
	    if (positionReached === 1){
		clrDacValueInternal(null,function() {
		    console.log("Target position reached.");
		}); 
	    }
	    else{
		client.get(CACHED_POSITIONLOOP_ACTIVE,positionLoop);
	    }
	});
    }    
    else{
        console.log("Position loop stopped");
        clrDacValueInternal(null,function() {            
        });        
    }
}


//
//function gotToPosition(err, limit, targetPosition, okCallback){
//    getPositionInternal(err, function(err, data){
//        if (err) throw err;                 
//        with (data){                
//            var distance = Math.abs(targetPosition-position);
//            var timeout = distance * 0.75/Math.abs(du) * dt;  
//            timeout = 10;            
//            if(position > limit.max){
//                console.log("DOWN: " + ((targetPosition * 10)|0) + "mm, Current: " + ((data.position * 10)|1) + "mm, >" + ((limit.max * 10)|1) +"mm, <" + ((limit.min * 10)|0) + "mm, distance:" + (distance) + "bit, timeout:" + timeout);            
//                moveDown(null, distance, function(err){
//                        gotToPosition(err, limit, targetPosition, okCallback);
//                    });
//            }                                                        
//            else{  
//                if (position < limit.min){                
//                    console.log("UP  : " + ((targetPosition * 10)|0) + "mm, Current: " + ((data.position * 10)|1) + "mm, >" + ((limit.max * 10)|1) +"mm, <" + ((limit.min * 10)|0) + "mm, distance:" + (distance) + "bit, timeout:" + timeout);            
//                    moveUp(null, distance, function(err){
//                        gotToPosition(err, limit, targetPosition, okCallback);
//                    });                                      
//                }
//                else{                      
//                    clrDacValueInternal(null,function() {
//                        okCallback(null, data.position);
//                    });                    
//                }
//            }
//        }
//        });   
//}



exports.setMeasured = function setPosition(err, measuredPosition, callback){     
    getPositionInternal(err,function(err, currentPosition){
        var potiPosition = currentPosition.position - configuration.adc.loffset;
        configuration.adc.loffset = measuredPosition - potiPosition;
        console.log("New Offset:" + configuration.adc.loffset);
        callback(null, configuration.adc.loffset );
    });
};


exports.getPosition = getPositionInternal;


exports.enableMotor =  gpio.enableDriver;
exports.disableMotor =  gpio.disableDriver;
exports.setLimitoverride =  gpio.setLimitoverride;
exports.clrLimitoverride =  gpio.clrLimitoverride;

exports.getLimitswitch = gpio.getLimitswitch;
exports.getInputStatus = gpio.getInputStatus;

exports.quit = dac.quit;

function init(){
    setTimeout(monitorStatus, 2500);
    service.subscribe(tools.CHANNEL_EMERGENCY,function(){});
    isEmergencyOngoing(null, function(err, emergency){
        if (emergency === "0"){          
            service.subscribe(CHANNEL_POSITION_HANDLER,function(){});
        }
        else{
            setEmergency();
        }
    });    
}
init();