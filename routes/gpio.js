/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
var os = require('os');

var configuration = {"limitoverride":{"pin":11,"setvalue":1,"clrvalue":0},
                     "limitswitch":{"pin":12,"setvalue":1,"clrvalue":0}};
    
var internalSetLimitoverride = function(callback){
        console.log("LIMITOVERRIDE:\tSET");
        callback();
    };

var internalClrLimitoverride = function(callback){
        console.log("LIMITOVERRIDE:\tCLR");
        callback();
    };

var internalLimitSwitch = function(callback){        
        callback(-1);
    };

// Check operating system and load SPI interface if linux is detected.
if (os.platform() === 'linux')
{
    var gpio = require("pi-gpio");
    function setGpio(pin,value, callback){
       gpio.open(pin, "output", function(err) {  
            if (err) throw err;
            gpio.write(pin, value, function() {         
                gpio.close(pin);  
                callback();
            });
        });          
    }
    
    
    
    internalSetLimitoverride = function(callback)
    {
        setGpio(configuration.limitoverride.pin,configuration.limitoverride.setvalue, callback);
    };
    
    internalClrLimitoverride = function(callback)
    {
        setGpio(configuration.limitoverride.pin,configuration.limitoverride.clrvalue, callback);
    }; 
    
    internalLimitSwitch = function(callback){        
        callback(-1);
    };
}

exports.clrLimitoverride = internalClrLimitoverride;

exports.SetLimitoverride = internalSetLimitoverride;

exports.onLimit = function onLimit(callback){        
        internalLimitSwitch(function(value){
           if(value === configuration.limitswitch.setvalue){
               callback();
           }
        });
    };