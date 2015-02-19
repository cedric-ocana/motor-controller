/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
var tools = require('./tools.js');

var CONFIGURATION = {"LIMITOVERRIDE":{"PIN":"16","SET":1,"CLR":0,"INIT":0,"DIRECTION":"output"},
                     "MOTORDRIVER":{"PIN":"18","SET":1,"CLR":0,"INIT":0,"DIRECTION":"output"},
                     "LIMITSWITCH":{"PIN":22,"SET":1,"CLR":0,"INIT":1,"DIRECTION":"input"}};
    
var internalSetLimitoverride = function(callback){
        console.log('LIMITOVERRIDE:\tSET');
        callback(null);
    };

var internalClrLimitoverride = function(callback){
        console.log('LIMITOVERRIDE:\tCLR');
        callback(null);
    };

var internalLimitSwitch = function(callback){        
        callback(null, CONFIGURATION.LIMITSWITCH.INIT);
    };

var internalSetMotordriver = function(callback){
        console.log('MOTORDRIVER:\tSET');
        callback(null);
    };

var internalClrMotordriver = function(callback){
        console.log('MOTORDRIVER:\tCLR');
        callback(null);
    };

var internalGetLimitswitch = function(callback){
        console.log('LIMITSWITCH:\tUNDEF-FALSE');
        callback(null, 0);
    };

// Check operating system and load SPI interface if linux is detected.
if (tools.hardwareAvailable())
{
    var gpio = require('pi-gpio');
    function openGpio(io){
        console.log("OPENING PIN:" + io.PIN);
        gpio.open(io.PIN, io.DIRECTION,function(err){
            if (err) {
                console.log("RE-OPENING PIN:" + io.PIN);
                gpio.close(io.PIN);
                gpio.open(io.PIN, io.DIRECTION, function(err2){
                    if (err2){
                        throw err2;
                    }
                    else{
                        console.log("GPIO OPENED:" + io.PIN);
                    }
                });
            }
            else{
                console.log("GPIO OPENED:" + io.PIN);
            }
        });
    }
    openGpio(CONFIGURATION.LIMITOVERRIDE);
    openGpio(CONFIGURATION.MOTORDRIVER);
    openGpio(CONFIGURATION.LIMITSWITCH);
    
    function setGpio(pin,value, callback){
        //gpio.close(pin);        
        //gpio.open(pin, 'output', function(err) {  
            //if (err) throw err;
            gpio.write(pin, value, function() {         
                callback(null,'OK');
            });
        //});          
    }
    
    function getGpio(pin, callback){
        //gpio.close(pin);        
        //gpio.open(pin, 'input', function(err) {  
            //if (err) throw err;
            gpio.read(pin, callback);

        //});          
    }        
    internalSetLimitoverride = function(callback)
    {
        setGpio(CONFIGURATION.LIMITOVERRIDE.PIN,CONFIGURATION.LIMITOVERRIDE.SET, callback);
    };
    
    internalClrLimitoverride = function(callback)
    {
        setGpio(CONFIGURATION.LIMITOVERRIDE.PIN,CONFIGURATION.LIMITOVERRIDE.CLR, callback);
    }; 
    
    internalSetMotordriver = function(callback)
    {
        setGpio(CONFIGURATION.MOTORDRIVER.PIN, CONFIGURATION.MOTORDRIVER.SET, callback);
    };     

    internalClrMotordriver = function(callback)
    {
        setGpio(CONFIGURATION.MOTORDRIVER.PIN, CONFIGURATION.MOTORDRIVER.CLR, callback);
    };  
    
    internalLimitSwitch = function(callback){        
        callback(null, CONFIGURATION.LIMITOVERRIDE.INIT);
    };
    
    internalGetLimitswitch = function(callback){
        getGpio(CONFIGURATION.LIMITSWITCH.PIN, callback);       
    };    
}

exports.clrLimitoverride = internalClrLimitoverride;
exports.setLimitoverride = internalSetLimitoverride;

exports.enableDriver = internalSetMotordriver;
exports.disableDriver = internalClrMotordriver;

exports.getLimitswitch = internalGetLimitswitch;

exports.onLimit = function onLimit(callback){        
        internalLimitSwitch(function(err, value){
            if (err) throw err;
            if (value === CONFIGURATION.LIMITSWITCH.SET){
                callback(null);
           }
        });
    };