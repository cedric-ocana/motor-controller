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

var configuration = {"mode":"emulator",
                    "dac":{"value":0},
                    "adc":{"value":0.0},
                    "position":{
                        "actual":0,
                        "default":120,
                        "tolerance":0.1,                        
                        "adcCorrectionFactor": 0.0052729034423828125 //r * (2*pi*10/adcMax) = r * 0.00191741943359375 |r:=2.75cm
                        }, //32768
                    "speed":{
                        "defaultdt":2500 //OK this value comes from a i7...
                    }                    
                    };


var dac = require('./dac.js');
var gpio = require('./gpio.js');
var adc = require('./adc.js');

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
    if (callback === undefined){
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

exports.clrDacValue = function clrDacValue(err){ 
    if (err) throw err; 
    if (emulatorActive()){
        configuration.dac.value = dac.resetEmulator(err);
    }
    else{
        configuration.dac.value = dac.reset(err);;
    }
    
};

exports.setDacValue = function setDacValue(err, newDacValue){   
    if (err) throw err;    
    if (emulatorActive()){        
        configuration.dac.value = dac.setValueEmulator(err, newDacValue);
    }
    else{
        configuration.dac.value = dac.setValue(err, newDacValue);
    }
};


exports.setLimitoverride = function setLimitoverride(){
    gpio.SetLimitoverride();
};

exports.clrLimitoverride = function clrLimitoverride(){
    gpio.clrLimitoverride();
};

function calcNanoSeconds(time){
    return (time[0] * 1e9 + time[1]);
}

function internalGetSpeed(callback){
    var startTime = process.hrtime();    
    adc.getAdcValue(function(firstError, firstValue){                
        var fristIntermediateTime = process.hrtime();      
        adc.getAdcValue(function(secondError,secondValue){
            var measurementDuration2 = calcNanoSeconds(process.hrtime(fristIntermediateTime));                        
            var measurementDuration = calcNanoSeconds(fristIntermediateTime) - calcNanoSeconds(startTime);
            var averageDuration = (measurementDuration + measurementDuration2)/2;
            var diff = Math.abs( measurementDuration2 - measurementDuration)/2;
            var dt =  averageDuration - diff;            
            var result = {};
            result.dt = (dt / 1e9);
            result.du = (secondValue - firstValue);
            result.adc  = secondValue;
            configuration.adc.value = result.adc;
            console.log("ADC fetching delay: " + result.dt + ", ADC difference: " + result.du);
            callback(null, result);
        });        
    });
}
exports.getSpeed = internalGetSpeed;

function inPosition(position, dt, okCallback, aboveCallback, belowCallback){
    var limit = {};
    limit.max = position + configuration.position.tolerance;
    limit.min = position - configuration.position.tolerance;
    adc.getAdcValue(null, function toPositionWrapper(err, value){
        toPosition(err, value,function moveUpOrDown(err, actualPos){
            configuration.position.actual = actualPos;
            if ( actualPos > limit.max){
                aboveCallback(null, position, dt);
                return false;
            }
            else{
                if (actualPos < limit.min){
                    belowCallback(null, position, dt);
                    return false;
                }
                else{
                    okCallback(null, currentPosition);
                    return true;
                }
            }            
        });
    });
}


function moveUp(err, targetPosition, dt){
    if (emulatorActive()){
        configuration.adc.value++;
        console.log("UP");
    }
    else{
        
    }    
}
function moveDown(err, targetPosition, dt){
    /*internalGetSpeed(function(err, result){    
        getPositionFromVoltage(err, voltage, function(err){if(err) throw err;});            
        
        // We need to know the duration of a stop action... depends on the CPU load...
    });*/
    if (emulatorActive()){
        configuration.adc.value--;
        console.log("DOWN");
    }
    else{
        
    }
}

exports.setPosition = function setPosition(err, position, callback){  
    var intermediateTime = process.hrtime();
    var intermediateTime1 = process.hrtime();
    var dt = configuration.speed.defaultdt;
    var avg = dt;        
    console.log("Target: " + position + "cm, Current: " + configuration.position.actual + "cm, dt:" + dt + "ns, avg:" + avg + "ns");   
    while (inPosition(position,avg, callback,moveDown, moveUp) === false){  
        intermediateTime1 = process.hrtime();
        dt = (calcNanoSeconds(intermediateTime1)-calcNanoSeconds(intermediateTime));
        avg = ((avg + dt) / 2);
        console.log("Target: " + position + "cm, Current: " + configuration.position.actual + "cm, dt:" + dt + "ns, avg:" + avg + "ns");   
        intermediateTime = process.hrtime();
    }       
};

function getPositionInternal(err, callback){    
    getAdcValueInternal(err, function(err, value){
        if (err) throw err;
        callback(null, value * configuration.position.adcCorrectionFactor);
    });
}

exports.getPosition = function getPosition(err, callback){
    getPositionInternal(err, callback);
};
