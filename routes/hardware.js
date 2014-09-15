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

var mode = "emulator";
if (os.platform() === 'linux')
{
    mode = "real"
}
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
                        "defaultdt":2625, //OK this value comes from a i7...
                        "up":800,
                        "down":4095,
                        "tsampling":100
                    }                    
                    };


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
        setTimeout(function delayedGet(){
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
                console.log("timeout:" + measurementDuration + "ADC fetching delay: " + result.dt + ", ADC difference: " + result.du);
                callback(null, result);
            }); 
        },2000);
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
        configuration.adc.value -= 5;
        console.log("MOVE-UP(EMULATION)");
    }
    else{
        setDacValueInternal(null, configuration.speed.up);
    }    
}
function moveDown(err, targetPosition, data,  dt){   
    if (emulatorActive()){
        configuration.adc.value += 5;
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

function getPositionFromAdcValue(adcValue){     
    with (configuration.adc){
        return (adc.max - adcValue) * multiplicator + offset;
    }
}

function getPositionInternal(err, callback){      
    internalGetSpeed(err, function(err, value){
        if (err) throw err;         
        value.position = getPositionFromAdcValue(value.adc);
        //console.log("Calculated Value: " + result.position  +"\t ADC - Value: " + result.adc);
        callback(null, value);
    });
}

exports.getPosition = getPositionInternal;
