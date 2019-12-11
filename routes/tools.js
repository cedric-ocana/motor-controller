/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
var os = require('os');
var fs = require('fs');

exports.CHANNEL_EMERGENCY = "emergency";
exports.CHANNEL_HEIGHT = "height";
exports.MSG_EMERGENCY_STOP = "emergency-stop";
exports.MSG_EMERGENCY_RELEASE = "emergency-release";
exports.FLAG_EMERGENCY_ONGOING = "emergency-ongoing";

exports.hardwareAvailable = function hardwareAvailable() {
//                           MKI00S01MAT
    if (os.hostname() === 'MKI00S01MAT')
    {
        return true;
    }
    if (os.hostname() === 'MK_I00S02_MAT')
    {
        return true;
    }
    console.log("NOT PI! But:" + os.hostname() );
    return false;
};


exports.getFloat = function getFloat(field, callback){
	if (field !== undefined){
		var newValue = parseFloat(field,10);
		if (isNaN(newValue)){
			callback(new RangeError("Parameter must be a number."), null);
		}
		else{
			callback(null, newValue);
		}
	}
	else{
		callback(new Error("Called with undefinedn value parameter."), null);
	}
};


exports.loadSettings = function loadSettings(identifier, defaultValues, callback){
	fs.exists(identifier, function(exists){
		if (exists){
			fs.readFile(identifier, function (err, data) {
				if (err) throw err;				
				callback(null, JSON.parse(data));
			});
		}
		else{
			callback(null, defaultValues);	
		}		
	});
};

exports.saveSettings = function saveSettings(identifier, configuration){
		fs.writeFile(identifier, JSON.stringify(configuration), function (err) {
			if (err) throw err;
			console.log("New HW-Config file created.");
		});			
};
