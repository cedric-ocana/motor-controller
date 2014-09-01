/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
var os = require('os');

var CONFIGURATION = {"LIMITOVERRIDE":{"PIN":"11","SET":1,"CLR":0,"INIT":0},
                     "LIMITSWITCH":{"PIN":12,"SET":1,"CLR":0}};
    
var internalSetLimitoverride = function(callback){
        console.log('LIMITOVERRIDE:\tSET');
        callback(null);
    };

var internalClrLimitoverride = function(callback){
        console.log('LIMITOVERRIDE:\tCLR');
        callback(null);
    };

var internalLimitSwitch = function(callback){        
        callback(null, configuration.limitoverride.initialValue);
    };

// Check operating system and load SPI interface if linux is detected.
if (os.platform() === 'linux')
{
    var gpio = require('pi-gpio');
    function setGpio(pin,value, callback){
        gpio.close(pin);        
        gpio.open(pin, 'output', function(err) {  
            if (err) throw err;
            gpio.write(pin, value, function() {         
                gpio.close(pin);  
                callback(null,'OK');
            });
        });          
    }
        
    internalSetLimitoverride = function(callback)
    {
        internalClrLimitoverride();
        setGpio(CONFIGURATION.LIMITOVERRIDE.PIN,CONFIGURATION.LIMITOVERRIDE.SET, callback);
    };
    
    internalClrLimitoverride = function(callback)
    {
        setGpio(CONFIGURATION.LIMITOVERRIDE.PIN,CONFIGURATION.LIMITOVERRIDE.CLR, callback);
    }; 
    
    internalLimitSwitch = function(callback){        
        callback(null, CONFIGURATION.LIMITOVERRIDE.INIT);
    };
}

exports.clrLimitoverride = internalClrLimitoverride;

exports.SetLimitoverride = internalSetLimitoverride;

exports.onLimit = function onLimit(callback){        
        internalLimitSwitch(function(err, value){
            if (err) throw err;
            if (value === CONFIGURATION.LIMITSWITCH.SET){
                callback(null);
           }
        });
    };