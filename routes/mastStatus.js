/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


/* This module provides informations about the mast status
 * Features are:
 * - get the current height indication of the carriage.
 * - get the current speed of the carriage.
 * - callback if the hardware range limtter was triggered.
 * - callback if a position is reached.
 * - trigger the status update
 */



/* Default emulator
 */

var getHeight = function getHeight()
{
    currentHeight = -1;    
    return -1;
};



var rangeTriggerCallback = function(){};

exports.onOutOfRange = function onOutOfRange(callback)
{
    rangeTriggerCallback = callback;    
};

function outOfRange()
{
    return false;
}

var positionReachedCallback = function(){};
var targetPositionInMeter   = -1;
var currentHeight = -1;
var currentSpeed = 0;

exports.onPositionReached = function onPositionReached(callback, positionInMeter)
{
    positionReachedCallback = callback;
    targetPositionInMeter = positionInMeter;
};

function positionReached()
{    
    if (getHeight()<= targetPositionInMeter)
        return true;
    else
        return false;
}
 
exports.updateStatus = function updateStatus()
{
    if (outOfRange())
    {
        rangeTriggerCallback();
    }
    if (positionReached())
    {
        positionReachedCallback();
    }
};


