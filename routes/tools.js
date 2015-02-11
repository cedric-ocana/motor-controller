/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
var os = require('os');

exports.hardwareAvailable = function hardwareAvailable() {
    return os.hostname() == 'pi';
};