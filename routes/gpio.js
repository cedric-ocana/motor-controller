/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
var tools = require('./tools.js');
var fs = require("fs");
var sysFsPath = "/sys/class/gpio/";

var CONFIGURATION = {"LIMITOVERRIDE":{"PIN":23,"SET":1,"CLR":0,"INIT":0,"DIRECTION":"out"},
                     "MOTORDRIVER":{"PIN":24,"SET":1,"CLR":0,"INIT":0,"DIRECTION":"out"},
                     "STATUS_LIMIT":{"PIN":25,"SET":1,"CLR":0,"INIT":1,"DIRECTION":"in"},
                     "STATUS_CALIBRATION_SWITCH":{"PIN":15,"SET":1,"CLR":0,"INIT":1,"DIRECTION":"in"},
                     "STATUS_5V_FIBER":{"PIN":17,"SET":1,"CLR":0,"INIT":1,"DIRECTION":"in"},
                     "STATUS_15V_NEGATIVE":{"PIN":27,"SET":1,"CLR":0,"INIT":1,"DIRECTION":"in"},
                     "STATUS_15V_POSITIVE":{"PIN":18,"SET":1,"CLR":0,"INIT":1,"DIRECTION":"in"}
                 };

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
        callback(null, 1);
    };

var internalGetGoHomeSwitch = function(callback){
        console.log('CALIBRATIONSWITCH:\tUNDEF-FALSE');
        callback(null, 1);
    };




var internalGetStatus = function(name, callback){
        if (CONFIGURATION.hasOwnProperty(name)){
            console.log(name + ':\tUNDEF-FALSE');
            callback(null, 1);
        }
        else{
            console.log('UNKNOWN IO:\tUNDEF-FALSE');
            callback(null, 1);
        }
    };

var internalInit = function(err, callback){
   if(err){
	callback(err);
   }
   console.log("GPIO-Initialization");
}

// Check operating system and load SPI interface if linux is detected.
if (tools.hardwareAvailable())
{
    function openGpio(name, callback){
        if (CONFIGURATION.hasOwnProperty(name)){
            var io = CONFIGURATION[name];
            console.log("INIT IO:" + io["PIN"] + " AS "+ io["DIRECTION"] +" IO-NAME:"+name);
            fs.writeFile(sysFsPath + "/gpio" + io["PIN"] + "/direction", io["DIRECTION"], function(err){
                if (err) throw err;
                if(io["DIRECTION"]==="out"){
                    console.log("SET IO to default:" + io["PIN"] + " INIT-VALUE "+ io["INIT"]);
                    fs.writeFile(sysFsPath + "/gpio" + io["PIN"] + "/value", io["INIT"], function(err){
                        if (err) throw err;
                        callback(null);
                    });
                }
            });
        }
	else{
		callback(null);
	}
    }

    internalInit = function gpioInit(err, callback){
	if(err){
	    callback(err);
	}
	else{
            callback(null);
		// LIMITOVERRIDE// LIMITOVERRIDE
		openGpio("LIMITOVERRIDE",function(err){
		openGpio("MOTORDRIVER",function(err){
		openGpio("STATUS_LIMIT",function(err){
		openGpio("STATUS_5V_FIBER",function(err){
		openGpio("STATUS_15V_NEGATIVE",function(err){
		openGpio("STATUS_15V_POSITIVE",function(err){
		openGpio("STATUS_CALIBRATION_SWITCH",function(err){callback(err);
		});// STATUS_15V_POSITIVE
		});// STATUS_15V_NEGATIVE
		});// STATUS_5V_FIBER
		});// STATUS_LIMIT
		});// MOTOROVERRIDE
		});// LIMITOVERRIDE
   	    });
	}
    };

    function setGpio(pin,value, callback){
	value = !!value?"1":"0";
	fs.writeFile(sysFsPath + "/gpio" + pin + "/value", value, "utf8", callback);
    }

    function getGpio(pin, callback){
        fs.readFile(sysFsPath + "/gpio" + pin + "/value", function(err, data) {
                        if(err) return (callback || noop)(err);

                        (callback || noop)(null, parseInt(data, 10));
                });
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
        getGpio(CONFIGURATION.STATUS_LIMIT.PIN, callback);
    };
    internalGetStatus = function(name, callback){
        if (CONFIGURATION.hasOwnProperty(name)){
            getGpio(CONFIGURATION[name].PIN, callback);
        }
        else{
            console.log('UNKNOWN IO:\tUNDEF-FALSE');
            callback(null, -1);
        }
    };
}

exports.init = internalInit;
exports.clrLimitoverride = internalClrLimitoverride;
exports.setLimitoverride = internalSetLimitoverride;

exports.enableDriver = internalSetMotordriver;
exports.disableDriver = internalClrMotordriver;

exports.getLimitswitch = internalGetLimitswitch;
exports.getInputStatus = internalGetStatus;

exports.onLimit = function onLimit(callback){        
        internalLimitSwitch(function(err, value){
            if (err) throw err;
            if (value === CONFIGURATION.STATUS_LIMIT.SET){
                callback(null);
           }
        });
};
