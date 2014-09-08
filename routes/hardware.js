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

var configuration = {"mode":"real",
                    "dac":{"value":0},
                    "adc":{"value":21000,
                        "max":0x8000
                    },
                    "position":{
                        "actual":0,
                        "default":120,
                        "tolerance":0.05,                        
                        "adcCorrectionFactor": 0.0052729034423828125 //r * (2*pi*10/adcMax) = r * 0.00191741943359375 |r:=2.75cm
                        }, //32768
                    "speed":{
                        "defaultdt":2625, //OK this value comes from a i7...
                        "up":800,
                        "down":4095
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

function clrDacValueInternal(err){ 
    if (err) throw err; 
    if (emulatorActive()){
        configuration.dac.value = dac.resetEmulator(err);
    }
    else{
        configuration.dac.value = dac.reset(err);;
    }
    
}

exports.clrDacValue = clrDacValueInternal;

function setDacValueInternal(err, newDacValue){   
    if (err) throw err;
    if (emulatorActive()){        
        configuration.dac.value = dac.setValueEmulator(err, newDacValue);
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
    getPositionInternal(null, function moveUpOrDown(err, data){
        configuration.position.actual = data.position;
        console.log("Speed:"+data.speed);
        if ( data.position > limit.max){
            aboveCallback(null, position, data, dt);   
        }
        else{
            if (data.position < limit.min){                
                belowCallback(null, position, data, dt);             
            }
            else{  
                clrDacValueInternal(null);
                okCallback(null, data.position);
            }     
        }                
    });
    
    if (configuration.position.actual > limit.max){
        callback = aboveCallback;        
        return false;
    }
    else{
        if (configuration.position.actual < limit.min){                                        
            return false;
        }
        else{
            console.log("MOVE-NONE");
            return true;
        }
    } 
}


function moveUp(err, targetPosition, data, dt){    
    if (emulatorActive()){
        configuration.adc.value -= 100;
        console.log("MOVE-UP(EMULATION)");
    }
    else{
        setDacValueInternal(null, configuration.speed.up);
    }    
}
function moveDown(err, targetPosition, data,  dt){   
    if (emulatorActive()){
        configuration.adc.value += 100;
        console.log("MOVE-DOWN(EMULATION)");
    }
    else{
        setDacValueInternal(null, configuration.speed.down);
    }
}

exports.setPosition = function setPosition(err, position, callback){  
    var intermediateTime = process.hrtime();
    var intermediateTime1 = process.hrtime();
    var dt = configuration.speed.defaultdt;
    var avg = dt;        
    console.log("Target: " + ((position * 10)|0) + "mm, Current: " + ((configuration.position.actual * 10)|0) + "mm, dt:" + (dt|0) + "ns, avg:" + (avg|0) + "ns");    
    while (inPosition(position,avg, callback,moveDown, moveUp) === false){  
        intermediateTime1 = process.hrtime();
        dt = (calcNanoSeconds(intermediateTime1)-calcNanoSeconds(intermediateTime));
        avg = ((avg + dt) / 2);
        //console.log("Target: " + ((position * 10)|0) + "mm, Current: " + ((configuration.position.actual * 10)|0) + "mm, dt:" + (dt|0) + "ns, avg:" + (avg|0) + "ns");   
        intermediateTime = process.hrtime();
    }       
    console.log("Target: " + position * 10 + "mm, Current: " + configuration.position.actual * 10  + "mm, dt:" + (dt|0) + "ns, avg:" + (avg|0) + "ns");   
};

function getPositionInternal(err, callback){      
    internalGetSpeed(err, function(err, value){
        if (err) throw err; 
        var result = {};
        result.du = value.du;
        result.dt = value.dt;
        result.adc = value.adc;
        result.speed = value.du/value.dt;
        result.position = (adc.max-value.adc) * configuration.position.adcCorrectionFactor + 24.33842163085937;        
        //console.log("Calculated Value: " + result.position  +"\t ADC - Value: " + result.adc);
        callback(null, result);
    });
}

exports.getPosition = getPositionInternal;
