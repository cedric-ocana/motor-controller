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

function onErrorThrowIt(err){
    if (err) throw err;
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
            callback(new RangeError( "Parameter must be between " + 0 + " and " + 4096 ), null);
        }
        else
        {
            callback(null, newValue);
        }   
    }
    else
    {
        callback(new RangeError( "Parameter not undefined."),null);
    }
}

router.route('/adc')
    .get(function(req, res){     
	var response = getResponseMessageOK("adc");      
        res.json(response);
    });

function generateResponse(err, routeSource, value, callback){
    if(err){      
        if (err.type){
            var response = getResponseMessageERR(routeSource);
            response.err = {};
            response.err.source = err.source;
            response.err.type = err.type;
            callback(null,response);
        }
        else{
            throw err;
        }            
    }
    else{
        var response = getResponseMessageOK(routeSource);
        response.value = value;
        callback(null, response);
    }
}

router.route('/dac')
    .get(function(req, res){              
        generateResponse(null, 'dac', hardware.getDacValue(), function send(err, data){
            res.json(data);
        });
        
        
    })
    .put(function(req,res){
        var request = eval(req.body);
	var response = getResponseMessageOK("dac");
        
        setIntFromRequest(request.dacValue, hardware.setDacValue);
        
        generateResponse(null, 'dac', hardware.getDacValue(), function send(err, data){
            res.json(data);
        });        
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
        if (request.mode !== undefined){
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
        hardware.clrLimitoverride(onErrorThrowIt);
        res.json(response);
    })
    
    .put(function(req, res){          
        var response = getResponseMessageOK("limitoverride");       	
        hardware.setLimitoverride(onErrorThrowIt);
        res.json(response);
    });    

module.exports = router;

