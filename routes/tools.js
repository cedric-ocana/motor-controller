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