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
            callback(new RangeError( 'Parameter must be a number.'), null);
        }
        else
        {            
            console.log("OK value OK.");
            callback(null, newValue);
        }   
    }
    else
    {
        callback(new Error( "Called with undefined value parameter."),null);
    }
}

function setFloatFromRequest(field, callback){       
    if(field !== undefined)
    {                
        var newValue = parseFloat(field);
        if (isNaN(newValue))  
        {                     
            callback(new RangeError( 'Parameter must be a number.'), null);
        }
        else
        {            
            callback(null, newValue);
        }   
    }
    else
    {
        callback(new Error( "Called with undefined value parameter."),null);
    }
}

router.route('/adc')
    .get(function(req, res){              
        generateResponse(null, 'adc-get', hardware.getAdcValue(), function send(err, data){
            res.json(data);
        });               
    })
    .put(function(req,res){       
        var request = eval(req.body);	
        setFloatFromRequest(request.value, hardware.setAdcValue);        
        generateResponse(null, 'adc-set', hardware.getAdcValue(), function send(err, data){
            res.json(data);
        });        
    });
    
    

function generateResponse(err, routeSource, value, callback){
    if(err){              
        err.message = '[' + routeSource + ']: ' + err.message;
        console.log(err.message);
        if (err.type){
            var response = getResponseMessageERR(routeSource);
            response.err = {};
            response.err.source = err.source;
            response.err.type = err.type;
            response.err.text = err;
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
        generateResponse(null, 'dac-get', hardware.getDacValue(), function send(err, data){
            res.json(data);
        });               
    })
    
    .delete(function(req, res){
        hardware.clrDacValue(null);
        generateResponse(null, 'dac-delete', hardware.getDacValue(), function send(err, data){
            res.json(data);
        });        
    }) 
    
    .put(function(req,res){       
        var request = eval(req.body);	    
        setIntFromRequest(request.value, hardware.setDacValue);        
        generateResponse(null, 'dac-set', hardware.getDacValue(), function send(err, data){
            res.json(data);
        });        
    });

router.route('/mode')   
    .get(function(req, res){        
        generateResponse(null, 'mode-get', hardware.getMode(null), function send(err, data){
            res.json(data);
        }); 	
    })
            
    .delete(function(req, res){
        hardware.resetMode();   
        generateResponse(null, 'mode-delete', hardware.getMode(null), function send(err, data){
            res.json(data);
        });
    })
    
    .put(function(req, res){
        var request = eval(req.body);
        if (request.value !== undefined){
            hardware.setMode(null, request.value);  
            generateResponse(null, 'mode-put', hardware.getMode(), function send(err, data){
                res.json(data);
            });                       	
        }
        else{
            generateResponse(new Error( "Called with undefined value parameter. Body: " + request), 'mode-put', hardware.getMode(), function send(err, data){
                res.json(data);
            });                       	
        }
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


router.route('/speed')
    .get(function(req, res){              
        generateResponse(null, 'speed-get', hardware.getSpeed(), function send(err, data){
            res.json(data);
        });               
    });
    
module.exports = router;

