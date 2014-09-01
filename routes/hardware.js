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

var configuration = {"mode":"real","dac":{"value":0},"adc":{"value":0.0}};


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

exports.getAdcValue = function getAdcValue(err){
    if (err) throw err; 
    if(emulatorActive()){
        return configuration.adc.value;
    }
    else{
        return adc.getValue();
    }
};

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
        console.log("Go for SetDacValue");
        configuration.dac.value = dac.setValue(err, newDacValue);
    }
};


exports.setLimitoverride = function setLimitoverride(){
    gpio.SetLimitoverride();
};

exports.clrLimitoverride = function clrLimitoverride(){
    gpio.clrLimitoverride();
};


exports.getSpeed = function getSpeed(){
    var startTime = process.hrtime();
    
    function calcSeconds(time){
        return (time[0] * 1e9 + time[1]);
    }
    adc.getAdcValue(function(firstError, firstValue){        
        var measTime = process.hrtime(startTime);
        process.nextTick(adc.getAdcValue(function(secondError,secondValue){
            var fullDuration = process.hrtime(startTime);
            var dt = calcSeconds(fullDuration) - calcSeconds(measTime);
            dt = dt / 1e9;
            return (secondValue - firstValue) / dt;
        }));
        
        var measurementTime = diff[0] * 1e9 + diff[1];
        var time = process.hrtime()
        
    });
    
    setTimeout(function() {
        
        // [ 1, 552 ]

        console.log('benchmark took %d nanoseconds', diff[0] * 1e9 + diff[1]);
        // benchmark took 1000000527 nanoseconds
    }, 1000);
};