/*
 * @file This file represents a basic hardware abstraction layer (HAL) and controls the mast.
 * @author Cedric Ocaña, BAKOM, 2012 - 2019, +41 79 443 36 03
 */

/**
 * @dependencies Inclusion of all dpendencies in order to be able to interact with
 *  the hardware
 */
var dac = require('./dac.js');
var gpio = require('./gpio.js');
var adc = require('./adc.js');
var tools = require('./tools.js');
/**
 * @dependencies Inclusion and setup of redis environemes to manage the status
 */
var redis = require('redis');
var redis = require('redis');
var service = redis.createClient();
var client = redis.createClient();

client.on("error", function (err) {
    console.log("Redis DAC-Client error\n" + err);
});


/**
 * Default mode is the emulation mode.
 */
var mode = "emulator";
if (tools.hardwareAvailable())
{
    mode = "real";
}
/**
 * Acceleration courve table to manage speed of mast.
 * Not needed anymore in current version.
 */
var acceleration = [0.001,0.004,0.009,0.016,0.024,0.035,0.048,0.062,0.078,0.095,0.115,0.136,0.158,0.181,0.206,0.232,0.259,0.287,0.316,0.345,0.376,0.406,0.437,0.469,0.5,0.531,0.563,0.594,0.624,0.655,0.684,0.713,0.741,0.768,0.794,0.819,0.842,0.864,0.885,0.905,0.922,0.938,0.952,0.965,0.976,0.984,0.991,0.996,0.999,1];
var deceleration = [0.999,0.996,0.991,0.984,0.976,0.965,0.952,0.938,0.922,0.905,0.885,0.864,0.842,0.819,0.794,0.768,0.741,0.713,0.684,0.655,0.624,0.594,0.563,0.531,0.5,0.469,0.437,0.406,0.376,0.345,0.316,0.287,0.259,0.232,0.206,0.181,0.158,0.136,0.115,0.095,0.078,0.062,0.048,0.035,0.024,0.016,0.009,0.004,0.001,0];

/**
 * Very generic & basic speed calculation. At the beginning the accelleration
 * was ment to be dynamic in order to speed up and down the movement slowly.
 */
function getSpeed(signedRatio){
    return dac.init() + dac.init() * signedRatio;
}

/**
 * Definiton of the antenna types that are available for the mast.
 * Allows a flexible asignation of antennas and the related dimensions.
 */
var ANTENNAS={	"SMALL":{"ID":"SMALL",
			"RANGE":{"MAX":180,"MIN":60.0, "TOLERANCE":0.2},
			"NAME":"small antenna",
			"COMPRESSION":{"a":111.103,"b":68.8971},
			"CLASSES":{"POLE":"smallAntennadiv",
				"MAIN":"smallAntenna"
				},
				"NEXT":"BIG"
			},
		"BIG":{"ID":"BIG",
			"RANGE":{"MAX":170,"MIN":90, "TOLERANCE":0.2},
			"NAME":"big antenna",
			"COMPRESSION":{"a":88.8923,"b":81.1177},
			"CLASSES":{"POLE":"bigAntennadiv",
				"MAIN":"bigAntenna"
				},
				"NEXT":"SMALL"
			}};
/**
 * Default statup antenna. The safest way is to select the BIG one
 */
var currentAntenna = ANTENNAS.BIG;

/**
 * Exposes the available antennas
 */
exports.getAntennas = function(callback){
	callback(null, ANTENNAS);
};

/**
 * Configuraton of the whole mast controller
 */
var configuration = 	{"mode":mode,
                     	"status":-1,
                     	"dac":{"value":0},
 			"adc2":2,
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
	                        "loffset": -127.8700631713867,
	                        "lmax":500,
        	                "lfixation":32,
	                        "lweel":49
			},
                    	"position":{
                        	"actual":110,
                        	"default":120,
                        	"tolerance":0.05
                    	},
			"speed":{
				"goSlow":0,
                        	"zero":getSpeed(0.00),
                        	"up": {
                            		"fast":{
                                		"distance": 50,
                                		"speed": 0
                            		},
                           		 "normal":{
                                		"distance": 5,
                                		"speed": 1100
                            		},
                            		"slow": {
                                		"distance": 1,
                                		"speed": 1218
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
                        "tsampling":200,
                        "dtDeceleration":1,
                        "dtAcceleration": 1
                        }
                    };
/**
 * Load the configuration for each startup of the mast. The settings for the mast
 * need to be changed in the /config.hw. 
 */
tools.loadSettings("config.hw",configuration, function(err, newSettings){
	configuration = newSettings;
});

/**
 * Checkes if the emulator mode is active
 */
function emulatorActive(){
    return (configuration.mode === "emulator");    
}
/**
 * Exposes if the emulator mode is active
 */
exports.emulatorActive = emulatorActive();

/**
 * Exposes the mode
 */
exports.getMode = function getMode(err){
    if (err) throw err; 
    return configuration.mode;
};

/**
 * Exposes the set mode possiblity 
 * @param newMode - Only "emulator" can set the emulator mode. Any other value
 * enables the normal mode.
 */
exports.setMode = function setMode(err, newMode) {
	if (err) throw err; 
	var currMode = configuration.mode;
	if (newMode==="emulator")
	{
        	configuration.mode = "emulator";
    	}
    	else
    	{
		if (tools.hardwareAvailable())
		{
        		configuration.mode = "real";
		}
    	}
    	console.log("New mode: " + configuration.mode);
};

/**
 * Esposes the reset mode function
 * This function resets the mode to the capabilitites of the server.
 */
exports.resetMode = function resetMode(err){
	if (err) throw err; 
	if (tools.hardwareAvailable())
	{
        	configuration.mode = "real";
	}
	else
	{
		configuration.mode = "emulator";
	}
};

/**
 * Fetch the current value of the Analog Digital Converter (ADC).
 * @param err - Error that may occurred earlier in the call chain.
 * @param callback - call back function
 */
function getAdcValueInternal(err, callback){
    if (err) throw err;
    if (callback === null){
        if(!emulatorActive()){
            configuration.adc.value = adc.getValue();
        }
	return configuration.adc.value;
    }
    else{
        if (emulatorActive()) {
            callback(null, configuration.adc.value);
        }
        else{
            adc.getAdcValue(null, callback);
        }
    }
}
/**
 * Exposes the getAdcValue function
 */
exports.getAdcValue = getAdcValueInternal;
/**
 * Fetch the current value of the second Analog Digital Converter (ADC).
 * @param err - Error that may occurred earlier in the call chain.
 * @param callback - call back function
 */
function getAdc2ValueInternal(err, callback){
    if (err) throw err;
    if (callback === null){
        if(!emulatorActive()){
            configuration.adc2.value = adc.get2Value();
        }
	return configuration.adc2.value;
    }
    else{
        if (emulatorActive()) {
            callback(null, configuration.adc2.value);
        }
        else{
            adc.getAdc2Value(null, callback);
        }
    }
}
/**
 * Exposes the getAdcValue function
 */
exports.getAdc2Value = getAdc2ValueInternal;

/**
 * Exposes the possiblity to set the ADC value in the emulator mode.
 */
exports.setAdcValue = function setAdcValue(err, value){
    if (err) throw err;
    configuration.adc.value = value;
};

/**
 * Exposes the Digital Analog Converter function.
 */
exports.getDacValue = dac.getDacValue;

/**
 * changes the speed only if the new target speed is not too different.
 * @param vTarget - target speed.
 */
function changeSpeed(vTarget, callback){
    var vDelta = configuration.dac.value - vTarget;
    with (configuration.speed){
        if (!((vDelta < 5) && (vDelta > 5))) {
            setDacValueInternal(null,(vTarget));
        }
        callback(null);
    }
}

/**
 * Clears the current speed setting.
 */
function clrSpeedValueInternal(err, callback){
    if (err) throw err;
    changeSpeed(configuration.speed.zero, callback);
}
exports.clrSpeed = clrSpeedValueInternal;

/**
 * Sets the speed setting.
 */
function setSpeedValueInternal(err, value, callback){
    if (err) throw err;
    clrPosition();
	if (emulatorActive()){
		configuration.dac.value = configuration.dac.value + (value-2068)/10;
	}
    changeSpeed(value, callback);
}
exports.setSpeed = setSpeedValueInternal;

/**
 * Clears the current DAC parameter.
 */
function clrDacValueInternal(err, callback){
    if (err) throw err;
    setDacValueInternal(null,configuration.speed.zero);
    callback();
}
exports.clrDacValue = clrDacValueInternal;

/**
 * Clears the current speed setting.
 */
function setDacValueInternal(err, newDacValue){
    if (err) throw err;
    dac.setValue(err, newDacValue, function(){});
}
exports.setDacValue = setDacValueInternal;

/**
 * Exposes the set limit override. This is used to override the limit protection to get the 
 * antenna out of a limit position.
 */
exports.setLimitoverride = function setLimitoverride(){
    gpio.SetLimitoverride();
};

/**
 * Exposes the clr limit override. This is used to clear the limit protection to get the 
 * antenna out of a limit position.
 */
exports.clrLimitoverride = function clrLimitoverride(){
    gpio.clrLimitoverride();
};

/**
 * Speed calculations that were deemed important at the beginning.
 * The final solution does not relay on it but the functionality remained in the code.
 * => Refactoring could be interesting here.
 */
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
                callback(null, result);
            }); 
        },100);
    });
}
exports.getSpeed = internalGetSpeed;

/**
 * Moves the antenna up or down
 * @pram err - Error that may occurred in calling function
 * @param distance - distance to the target height
 * @param settings - speed and distance settings
 * @param callback - function to call as soon movemcommand was sent
 */
function move(err, distance, settings, callback){
    if (distance <= settings.slow.distance) {
        changeSpeed(settings.slow.speed, callback);
    }
    else{
        if ((distance <= settings.normal.distance) || (configuration.speed.goSlow === 1)) {
            changeSpeed(settings.normal.speed, callback);
        }
        else{
            changeSpeed(settings.fast.speed, callback);
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
var CACHED_CURRENT_POSITION = "current-position";
var CACHED_POSITIONLOOP_ACTIVE = "position-loop";
var SERVICE_NAME = "HARDWARE-SERVICE";
var CHANNEL_POSITION_HANDLER = "position-handler";

exports.setPosition = function setPosition(err, position, callback){   
	client.publish(CHANNEL_POSITION_HANDLER,position,callback);
};

function clrPosition(err,callback){
	client.set(CACHED_TARGET_POSITION, -1, function(){});
}
exports.clrPosition = clrPosition;

function setEmergency(source){
	console.log("Emergency source: " + source);
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
		var height = lmax - adcValue * multiplicator + loffset;
		client.publish(tools.CHANNEL_HEIGHT, height,function(){});
		return height;
    	}
}

function getPositionInternal(err, callback){
    internalGetSpeed(err, function(err, value){
        if (err) throw err;
        value.position = getPositionFromAdcValue(value.adc);
        callback(null, value);
    });
}

function recoverFromOutOfRange(callback){
	client.get(CACHED_CURRENT_POSITION,function(err, value){
		var speed = configuration.speed.up.normal.speed;
		if(value >= 135){
			speed  = configuration.speed.down.normal.speed;
			if (emulatorActive()){
				configuration.adc.value = configuration.adc.value - 20;
			}
		}
		else{
			if (emulatorActive()){
				configuration.adc.value = configuration.adc.value + 20;
			}
		}
		console.log("Recovering from out of range. DAC:" + speed);
		gpio.clrLimitoverride(function(err, status){
                setTimeout(function(){
			dac.lowLevelDriverNoProtectionSetValue(null, speed);
			gpio.setLimitoverride(function(){});
                    	setTimeout(function(){
				callback();
		    	},100);
                },800);
		});
	});
}

/**
 * Function to check if the antenna tray is in the correct range and if the calibration
 * switch is pressed. In fact the limit GPIO
 * is checked and if the limit protection is triggered then the emergency is set.
 * The function is called at the end of monitorPositon function.
 */
function monitorStatus(callback){
    gpio.getLimitswitch(function(err, limitSwitch){
	if (err) throw err;
        if (limitSwitch == 0){
            recoverFromOutOfRange(function(){
                setEmergency("LIMITSWITCH");
		callback();
		});
        }
        else{
            isEmergencyOngoing(null, function(err, value){
                if(value==="1"){
                    dac.reset();
                }
            });
		callback();
        }
    });
    gpio.getCalibrationswitch(function(err, calibrationSwitch){
    	if (err) throw err;
    	// Check if the calibration switch has been pressed
    	if (calibrationSwitch == 0){
    		adc.getAdc2Value(err, function(err, adcValue){
    			if (err) throw err;
    			with (currentAntenna){
    				var distance = RANGE.MAX - RANGE.MIN;
    				var factor = adcValue/adc.max - 1;
    				if (factor < 0) factor = 1;
				if (factor < 0.35){
					factor = factor * 1.2957;
					newPosition = RANGE.MIN + factor*(40/0.35);
				}
				else if (factor > 0.65){
					factor = factor * 1.2957-0.2957;
				}
				else{
					factor = Math.round(50*(1/3 *(factor + 1)))/50;
				}

    				var newPosition = Math.round(((distance * factor) + RANGE.MIN)*10)/10;
				console.log("MANUAL POSITION factor, POSITION, DISTANCE, NEW EHIGHT: " , factor, (distance * factor), distance, newPosition );
//    				client.set(CACHED_TARGET_POSITION, newPosition, function(){});

    			}
    		});
    	}
    });
}

/**
 * Main loop to manage the position of the antenna. The function is calling it self
 * continuesly with the cycle that is defined in the configuration object.
 * => The target positon can be set through REDIS
 * => The current position is announced through REDIS
 * => Configuration of the general behaviour is done through the configuration object
 * The general concept is not a regulation loop but a simple function taht moves as soon 
 * the target value is changed.
 */
function monitorPosition(){
	getAdcValueInternal(null, function(err, adcValue){
		var height;
		with (configuration.adc){
			height = lmax - adcValue * multiplicator + loffset;
		}
		client.get(CACHED_TARGET_POSITION, function(err, tempTargetPosition){
			tools.getFloat(tempTargetPosition, function(err, targetPosition){
				if (tempTargetPosition>0){
					var distance = Math.abs(targetPosition-height);
					var limit = {};
					limit.max = targetPosition + configuration.position.tolerance;
					limit.min = targetPosition - configuration.position.tolerance;
					if(height > limit.max){
						console.log("DOWN: " + ((targetPosition * 10)|0) + "mm, Current: " + ((height * 10)|1) + "mm, >" + ((limit.max * 10)|1) +"mm, <" + ((limit.min * 10)|0) + "mm, distance:" + (distance) + "bit" );            
						moveDown(null, distance, function(err){
						});
					}
					else{
						if (height < limit.min){
							console.log("UP  : " + ((targetPosition * 10)|0) + "mm, Current: " + ((height * 10)|1) + "mm, >" + ((limit.max * 10)|1) +"mm, <" + ((limit.min * 10)|0) + "mm, distance:" + (distance) + "bit");            
							moveUp(null, distance, function(err){
							});
						}
						else{
							clrDacValueInternal(null,function() {
								console.log("Target position reached.");
								clrPosition();
							});
						}
					}
				}
				else{
					with (currentAntenna.RANGE){
						dac.isMoovingUp(function(err, isMooving){
							if (isMooving && (height >= (MAX - TOLERANCE))){
								client.set(CACHED_TARGET_POSITION,MAX,function(){});
							}
						});
						dac.isMoovingDown(function(err, isMooving){
							if (isMooving && (height <= (MIN + TOLERANCE))){
								client.set(CACHED_TARGET_POSITION,MIN,function(){});
							}
						});
					}
				}
			});
		});
		client.set(CACHED_CURRENT_POSITION,height);
	});
	monitorStatus(function(){
		setTimeout(monitorPosition, configuration.tsampling);
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
		tools.getFloat(message, function(err, height){
			with (currentAntenna.RANGE){
				if (height > MAX){
					client.set(CACHED_TARGET_POSITION,MAX, function(){});
				}
				else{
					if (height < MIN){
						client.set(CACHED_TARGET_POSITION,MIN, function(){});
					}
					else{
						client.set(CACHED_TARGET_POSITION,message, function(){});
					}
				}
			}
		});
	}
    	if (channel === tools.CHANNEL_EMERGENCY){
		if (message === tools.MSG_EMERGENCY_STOP){
			service.unsubscribe(CHANNEL_POSITION_HANDLER);
		}
		if (message === tools.MSG_EMERGENCY_RELEASE){
			service.subscribe(CHANNEL_POSITION_HANDLER);
			clrPosition();
		}
    	}
	if (channel === tools.CHANNEL_HEIGHT){
		// client notifications to be added here...
	}
});

service.on("unsubscribe", function(channel, count){
        console.log(SERVICE_NAME + " unsubscribed from channel: " + channel);
	if (channel === CHANNEL_POSITION_HANDLER){
            client.set(CACHED_POSITIONLOOP_ACTIVE,"0");
	}
});

exports.setMeasured = function setPosition(err, measuredPosition, callback){
    getPositionInternal(err,function(err, currentPosition){
        var potiPosition = currentPosition.position - configuration.adc.loffset;
	var newOffset = measuredPosition - potiPosition;
	var delta = configuration.adc.loffset - newOffset;
	console.log("Delta: " + delta);
	if((delta < 5) && (delta > -5)){
	        configuration.adc.loffset = measuredPosition - potiPosition;
        	console.log("New Offset:" + configuration.adc.loffset);
	        callback(null, configuration.adc.loffset );
		tools.saveSettings("config.hw", configuration);
	}
	else{
        	console.log("Delta for new Offset not OK! Delta:" + delta);
	        callback(null, "Delta for new Offest not OK! Delta:");
	}
    });
};

function getAntenna(err, callback){
	callback(err, currentAntenna.ID);
}

function setAntenna(err, newAntenna, callback){
	if (err) throw err;
	if (ANTENNAS.hasOwnProperty(newAntenna)){
		currentAntenna = ANTENNAS[newAntenna];
	}

	callback(null,currentAntenna.ID);
}
exports.getAntenna = getAntenna;
exports.setAntenna = setAntenna;
exports.getPosition = getPositionInternal;

function setSlow(err, setSlow, callback){
	if(err) throw err;
	if(setSlow == "1"){
		configuration.speed.goSlow = 1;
	}
	else{
		configuration.speed.goSlow = 0;
	}
	callback(null);
}

function getSlow(err, callback){
	result={};
	result.slow = configuration.speed.goSlow;
	callback(err, result);
}

exports.setSlow =  setSlow;
exports.getSlow =  getSlow;
exports.enableMotor =  gpio.enableDriver;
exports.disableMotor =  gpio.disableDriver;
exports.setLimitoverride =  gpio.setLimitoverride;
exports.clrLimitoverride =  gpio.clrLimitoverride;
exports.getLimitswitch = gpio.getLimitswitch;
exports.getInputStatus = gpio.getInputStatus;
exports.quit = dac.quit;

function init(){
	gpio.init(null,function(err){
		if(err) throw err;
		clrPosition();
		setTimeout(monitorPosition, 1000);
		service.subscribe(tools.CHANNEL_EMERGENCY,function(){});
		service.subscribe(tools.CHANNEL_HEIGHT,function(){});
	        isEmergencyOngoing(null, function(err, emergency){
	    		if (emergency === "0"){
        			service.subscribe(CHANNEL_POSITION_HANDLER,function(){});
		    	}
			else{
				clrEmergency();
            		}
        	});
	});
}
init();
