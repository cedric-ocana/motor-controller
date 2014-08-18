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
var configuration = {"mode":"emulator","dac":{"value":0.0}};


var dac = require('./dac.js');
var gpio = require('./gpio.js');

function emulatorActive(){
    return configuration.mode === "emulator";    
};

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
        console.log(exeption.typeof(object));
        console.log("Dispatching error. Emulator callback is ["  +
                typeof(callbackToEmulatedFunction) + 
                "] Real callback is [" + 
                typeof(callbackToNonEmulatedFunction) +"]");        
        return undef;
    }
}

exports.getMode = function getMode(){
    return configuration.mode;
};

exports.setMode = function setMode(newMode) {
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

exports.resetMode = function resetMode(){
    configuration.mode = "emulator";
}
exports.getAdc = function getAdc(){
    return dispatcher(getAdcReal, getAdcEml);
};

function getAdcReal()
{
    return 1;
}


function getAdcEml()
{
    return 1.1;
}

exports.getDacValue = function getDacValue(){
    return configuration.dac.value;
};

exports.setDacValue = function setDacValue(newDacValue){   
    try{
        configuration.dac.value = dac.setValue(newDacValue, emulatorActive);
    }
    catch(err){
        
    }
};


exports.setLimitoverride = function setLimitoverride()
{
    gpio.SetLimitoverride();
}

exports.clrLimitoverride = function clrLimitoverride()
{
    gpio.clrLimitoverride();
}
