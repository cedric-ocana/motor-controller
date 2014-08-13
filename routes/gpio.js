/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
var os = require('os');

var internalSetLimitoverride = function(callback){
                                    console.log("LIMITOVERRIDE:\tSET");
                                };

var internalClrLimitoverride = function(callback){
                                    console.log("LIMITOVERRIDE:\tCLR");
                                };

// Check operating system and load SPI interface if linux is detected.
if (os.platform() === 'linux')
{
    var gpio = require("pi-gpio");
    internalSetLimitoverride = function(callback)
    {
        gpio.open(15, "output", function(err) {    // Open pin 16 for output
            gpio.write(15, 1, function() {         // Set pin 16 high (1)
            gpio.close(15);                        // Close pin 16
        });
        });  
    };
    
    internalClrLimitoverride = function(callback)
    {
        gpio.open(15, "output", function(err) {    // Open pin 16 for output
            gpio.write(15, 0, function() {         // Set pin 16 low (0)
            gpio.close(15);                        // Close pin 16
        });
        });  
    };    
    
}

exports.clrLimitoverride = function ClrLimitoverride(){
    internalClrLimitoverride();
};

exports.SetLimitoverride = function ClrLimitoverride(){
    internalSetLimitoverride();
};