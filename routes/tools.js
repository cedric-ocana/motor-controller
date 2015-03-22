/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
var os = require('os');

exports.hardwareAvailable = function hardwareAvailable() {
    if (os.hostname() === 'mk-mast1')
    {
        return true;
    }
    else
    {
        console.log("NOT PI! But:" + os.hostname() );
        return false;
    }
   
};


exports.getInteger = function getInteger(field, callback){        
	if (field !== undefined){
		var newValue = parseInt(field);
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
