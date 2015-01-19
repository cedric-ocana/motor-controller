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
var os = require('os');
var redis = require('redis');

var mode = "emulator";
if (os.platform() === 'linux')
{
    mode = "real"
}
var acceleration = [0.001,0.004,0.009,0.016,0.024,0.035,0.048,0.062,0.078,0.095,0.115,0.136,0.158,0.181,0.206,0.232,0.259,0.287,0.316,0.345,0.376,0.406,0.437,0.469,0.5,0.531,0.563,0.594,0.624,0.655,0.684,0.713,0.741,0.768,0.794,0.819,0.842,0.864,0.885,0.905,0.922,0.938,0.952,0.965,0.976,0.984,0.991,0.996,0.999,1];
var deceleration = [0.999,0.996,0.991,0.984,0.976,0.965,0.952,0.938,0.922,0.905,0.885,0.864,0.842,0.819,0.794,0.768,0.741,0.713,0.684,0.655,0.624,0.594,0.563,0.531,0.5,0.469,0.437,0.406,0.376,0.345,0.316,0.287,0.259,0.232,0.206,0.181,0.158,0.136,0.115,0.095,0.078,0.062,0.048,0.035,0.024,0.016,0.009,0.004,0.001,0];

var configuration = {"mode":mode,
                    "dac":{"value":0},
                    "adc":{
                        "value":21000,
                       /* Basic formula is:
                        * h = n * ((r1 +r2) * 2 * pi * npot/nmax) + offset
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
                        "offset": 24.3 
                    },
                    "position":{
                        "actual":0,
                        "default":120,
                        "tolerance":0.05                     
                    }, //32768
                    "speed":{
                        "default":dac.resetEmulator(null), //OK this value comes from a i7...
                        "up":{
                            "normal":1250,
                            "fast":0,
                            "slow":1500
                            },
                        
                        "down":{
                            "normal":3950,
                            "fast":4095,
                            "slow":3700
                            },                        
                        "tsampling":100,
                        "dtDeceleration":10,
                        "dtAcceleration":10
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
        if(emulatorActive()){
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

exports.getDacValue = function getDacValue(err){
    if (err) throw err; 
    return configuration.dac.value;
};

function changeSpeed(vTarget, callback){
    var vDelta = vTarget - configuration.dac.value;
    with (configuration.speed){
        if (vDelta > 0){
            celerate(0, vDelta, vTarget, dtDeceleration, deceleration , callback);            
        }
        else{
            celerate(0, vDelta, vTarget, dtAcceleration, acceleration , callback);
        }    
    }
}

function celerate(index, vDelta, vTarget, dt, table, callback){    
    setDacValueInternal(null,(vTarget - table[index] * vDelta));
    if ((table[index] * vDelta ) > 1){
        if (index++ < table.length - 1){
            setTimeout(function recursiveCallCelerate(){
                celerate(index, vDelta, vTarget, dt, callback);
            },dt);
        }
        else{
            callback();
        }
    }
    else{
        callback();
    }    
}

function clrDacValueInternal(err){ 
    if (err) throw err; 
    changeSpeed(configuration.speed.default, function(){});    
}

exports.clrDacValue = clrDacValueInternal;

function setDacValueInternal(err, newDacValue){   
    if (err) throw err;
    // = newDacValue;
    if (emulatorActive()){        
        configuration.dac.value = dac.setValueEmulator(err, newDacValue);
        console.log("DAC:" + configuration.dac.value);
    }
    else{
        
        configuration.dac.value = dac.setValue(err, newDacValue);
    }
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

function inPosition(position, tCall, okCallback, aboveCallback, belowCallback){
    var limit = {};    
    limit.max = position + configuration.position.tolerance;
    limit.min = position - configuration.position.tolerance;    
    getPositionInternal(null, function moveUpOrDown(err, data){
        var dt = tCall - process.hrtime();
        configuration.position.actual = data.position;            
        console.log("Target: " + ((position * 10)|0) + "mm, Current: " + ((data.position * 10)|0) + "mm, dt:" + (dt|0) + "ns, speed:" + (data.speed|0) + "#");    
        
        if ( data.position > limit.max){
            aboveCallback(null, position, data, dt );
            inPosition(position, process.hrtime(), okCallback, aboveCallback, belowCallback)
        }
        else{
            if (data.position < limit.min){                
                belowCallback(null, position, data, dt );                      
                inPosition(position, process.hrtime(), okCallback, aboveCallback, belowCallback)
            }
            else{  
                clrDacValueInternal(null);
                okCallback(null, data.position);
            }     
        }                
    });
}


function moveUp(err, distance,callback){    
    if (emulatorActive()){
        configuration.adc.value -= 5;
        console.log("MOVE-UP(EMULATION)");
    }
    else{
        var dacValue = configuration.speed.default;
        with (configuration.speed.up){
            
            dacValue = slow;
                       
            if(distance > 5){
                dacValue = normal;
            }
            if(distance > 10){
                dacValue = fast;
            }   
        }              
        setDacValueInternal(null, dacValue);
    }
    
    callback();
}
function moveDown(err, distance, callback){   
    if (emulatorActive()){
        configuration.adc.value += 5;
        console.log("MOVE-DOWN(EMULATION)");
    } 
    else{
        var dacValue = configuration.speed.default;
        with (configuration.speed.down){
            dacValue = slow;
                       
            if(distance > 5){
                dacValue = normal;
            }
            if(distance > 10){
                dacValue = fast;
            }   
        }              
        setDacValueInternal(null, dacValue);
    }
    callback();
}

exports.setPosition = function setPosition(err, position, callback){  
    var intermediateTime = process.hrtime();
    var intermediateTime1 = process.hrtime();
    var dt = configuration.speed.defaultdt;
    var avg = dt;        
    console.log("Target: " + ((position * 10)|0) + "mm, Current: " + ((configuration.position.actual * 10)|0) + "mm, dt:" + (dt|0) + "ns, avg:" + (avg|0) + "ns");    
    //err, startSpeed, targetPositon, okCallback
    gotToPosition(null,0, position,callback);
    //inPosition(position,process.hrtime(), callback,moveDown, moveUp);
    /*while (inPosition(position,avg, callback,moveDown, moveUp) === false){  
        intermediateTime1 = process.hrtime();
        dt = (calcNanoSeconds(intermediateTime1)-calcNanoSeconds(intermediateTime));
        avg = ((avg + dt) / 2);
        //console.log("Target: " + ((position * 10)|0) + "mm, Current: " + ((configuration.position.actual * 10)|0) + "mm, dt:" + (dt|0) + "ns, avg:" + (avg|0) + "ns");   
        intermediateTime = process.hrtime();
    } */      
    //console.log("Target: " + position * 10 + "mm, Current: " + configuration.position.actual * 10  + "mm, dt:" + (dt|0) + "ns, avg:" + (avg|0) + "ns");   
};

function getPositionFromAdcValue(adcValue){     
    with (configuration.adc){
        return (adc.max - adcValue) * multiplicator + offset;
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

function gotToPosition(err, startSpeed, targetPosition, okCallback){
    var limit = {};       
    limit.max = targetPosition + configuration.position.tolerance;
    limit.min = targetPosition - configuration.position.tolerance; 
    previousCall(null, targetPosition);
    previousCall = okCallback;
    setTimeout(function(){getPositionInternal(err, function(err, data){
        if (err) throw err;                 
        with (data){            
            var distance = Math.abs(targetPosition-position);
            var timeout = distance * 0.75/Math.abs(du) * dt;     
            console.log("Target: " + ((targetPosition * 10)|0) + "mm, Current: " + ((position * 10)|0) + "mm, dt:" + (dt|0) + "ns, distance:" + (distance) + "bit, timeout:" + timeout);            
            if(position > limit.max){
                moveDown(null, distance, function(){
                        setTimeout(gotToPosition(null, speed, targetPosition, okCallback),timeout);
                    });
            }                                                        
            else{  
                if (position < limit.min){                
                    moveUp(null, distance, function(){
                        setTimeout(gotToPosition(null, speed, targetPosition, okCallback),timeout);
                    });
                                      
                }
                else{  
                    clrDacValueInternal(null);
                    previousCall = function(){};
                    okCallback(null, data.position);
                }
            }
        }
        });
    }, 0);    
}


exports.getPosition = getPositionInternal;
