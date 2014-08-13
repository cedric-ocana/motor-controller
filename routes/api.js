var express = require('express');
var router = express.Router(); 

var hardware = require('./hardware.js');

function getResponseMessageOK( routeName)
{
    var response = {};
    response.status = "OK";
    response.route = routeName;
    return response;
}

function getResponseMessageERR(routeName, msg)
{
    var response = getResponseMessageOK(routeName);
    response.status = "ERR";
    response.message = msg;
    return response;
}


/*
 *                  GET     PUT     DELETE      POST
 *                  get     set     reset       create
 *                                  auto
 *ADC               Y       E       N           N
 *DAC               E       Y       RESET       N
 *POSITION          Y       Y       RESET       Y  (Define Reset position)
 *UOUT              E       Y       RESET       N
 *UIN               Y       E       N           N
 *MODE              Y       Y       AUTO        N
 *GPIO
 * + LIMITOVERRIDE  Y       Y       N           N
 * + LIMITSWITCH    Y       E       N           N
 *SPEED             Y       Y       RESET       Y  (Define Reset position)
 */

function setIntFromRequest(field, callback){    
    if(field !== undefined)
    {
        var newValue = parseInt(field);
        if (isNaN(newValue))  
        {
            console.log("Given value vas Not a number!: " + field);
        }
        else
        {
            console.log("Call back:" + callback);
            callback(newValue);
        }   
    }
    else
    {
        return getResponseMessageERR("Set Int From Request:", "value not defined");
    }
}

router.route('/adc')
    .get(function(req, res){     
	var response = getResponseMessageOK("adc");      
        res.json(response);
    });
    
router.route('/dac')
    .get(function(req, res){        
	var response = getResponseMessageOK("dac");
        response.value = hardware.getDacValue();
        res.json(response);
    })
    .put(function(req,res){
        var request = eval(req.body);
	var response = getResponseMessageOK("dac");
        response = setIntFromRequest(request.dacValue, hardware.setDacValue);
//        if(request.dacValue !== undefined)
//        {
//            var newDacValue = parseInt( request.dacValue);
//            if (isNaN(newDacValue))
//            {				
//                console.log("Given value vas Not a number!: " + request.dacValue);
//            }
//            else
//            {            
//                hardware.setDacValue(newDacValue);
//            }
//        }
//        else
//        {
//            response = getResponseMessageERR("dac", "dacValue not defined");
//        }
        response.value = hardware.getDacValue();
        res.json(response);                
    });

router.route('/mode')   
    .get(function(req, res){        
        var response = getResponseMessageOK("mode");
        response.mode = hardware.getMode();             
        res.json(response);	
    })
            
    .delete(function(req, res){
        var response = getResponseMessageOK("mode");     
	response.oldMode = hardware.getMode() 
        hardware.resetMode();   
        response.mode = hardware.getMode()                
        res.json(response);
    })
    
    .put(function(req, res){
        var request = eval(req.body);  
        var response = getResponseMessageOK("mode");       	
        if (request.mode !== undef){
            response.oldMode = hardware.getMode();
            hardware.setMode(request.mode);               
        }
        else{
            response = getResponseMessageERR("mode", "Mode parameter is missing.");
        }
        response.mode = hardware.getMode();                
        res.json(response);
    });  
    
    
router.route('/gpio/limitoverride')              
    .delete(function(req, res){
        var response = getResponseMessageOK("limitoverride");       	
        hardware.clrLimitoverride();
        res.json(response);
    })
    
    .put(function(req, res){          
        var response = getResponseMessageOK("limitoverride");       	
        hardware.setLimitoverride();
        res.json(response);
    });    

module.exports = router;

