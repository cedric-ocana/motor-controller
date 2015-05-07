var express = require('express');
var router = express.Router(); 

var hardware = require('./hardware.js');
var tools = require('./tools.js');

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
        hardware.clrDacValue(null,function(){
            generateResponse(null, 'dac-delete', hardware.getDacValue(), function send(err, data){
                res.json(data);
            });        
        });
        hardware.quit();
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
    

router.route('/gpio/motordriver')              
    .delete(function(req, res){
        var response = getResponseMessageOK("motordriver");       	
        hardware.disableMotor(onErrorThrowIt);
        res.json(response);
    })
    
    
    .put(function(req, res){          
        var response = getResponseMessageOK("motordriver");       	
        hardware.enableMotor(onErrorThrowIt);
        res.json(response);
    });    
    
router.route('/gpio/limitswitch')              
    .get(function(req, res){
        hardware.getLimitswitch(function getLimitSwitchSender(err, result){
            generateResponse(null, 'limitswitch-get', result, function send(err, data){
                data.result = result;
                res.json(data);
            });                           
        });
    }); 

router.route('/gpio/status/:io?')              
    .get(function(req, res){
        var routeId = 'gpio-status-get';
        var request = req.params;
        console.log(req.params.io);
        if (request.hasOwnProperty("io")){
            hardware.getInputStatus(request.io, function getStatusSender(err, result){
                generateResponse(null, routeId, result, function send(err, data){
                    data.result = result;
                    res.json(data);
                });                           
            });
        }
        else{
            generateResponse(new Error( "Called with undefined value parameter. Body: " + request), routeId, {}, function send(err, data){
                res.json(data);
            });                       	
        }        
        
    });
	
router.route('/antenna/:id?')              
    .get(function(req, res){
        var routeId = 'antenna-get';        
		hardware.getAntenna(null, function getAntennaSender(err, result){
			generateResponse(null, routeId, result, function send(err, data){
				data.result = result;
				res.json(data);
			});                           
		});             
    })    
	.put(function(req, res){ 
	        var routeId = 'antenna-put';
	        var request = req.params;  		
		if (request.hasOwnProperty("id")){
			hardware.setAntenna(null, request.id, function setAntennaSender(err, result){
				generateResponse(null, routeId, result, function send(err, data){
					data.result = result;
					res.json(data);
				});                           
			});			
		}
        	else{
	            generateResponse(new Error( "Called with undefined value parameter. Body: " + request), routeId, {}, function send(err, data){
        	        res.json(data);
	            });                       	
        	} 		
// =============== SMALL ANTENNA BUG ===========
//        var response = getResponseMessageOK("motordriver");       	
//        hardware.enableMotor(onErrorThrowIt);
//        res.json(response);
    }); 	

router.route('/antennas')              
    .get(function(req, res){
        var routeId = 'antennas-get';        
		hardware.getAntennas(function getAntennaSender(err, result){
			generateResponse(null, routeId, result, function send(err, data){
				data.result = result;
				res.json(data);
			});                           
		});             
    }); 
	
router.route('/speed')
    .get(function(req, res){
        hardware.getSpeed(null, function getSpeedSender(err, result){
            generateResponse(null, 'speed-get', (result.du / result.dt), function send(err, data){
                data.result = result;
                res.json(data);
            });                           
        });
    })
    .delete(function (req, res) {
        hardware.clrSpeed(null, function getSpeedSender(err, result) {
            generateResponse(null, 'speed-delete',0, function send(err, data) {           
                res.json(data);
            });
        });
    })
    .put(function (req, res) {
        var request = eval(req.body);	    
        setIntFromRequest(request.value, function(err, value){
            hardware.setSpeed(err, value, function setSpeedSender(err2) {
                generateResponse(err2, 'speed-put',value, function send(err, data) {           
                    res.json(data);
                });
            });
        }); 
    });


router.route('/emergency')
    .put(function(req, res){
        hardware.setEmergency("CLIENT");
        generateResponse(null, 'emergency-put', 0, function send(err, data){
                data.result = "OK";
                res.json(data);
        });                                   
    })
    .delete(function (req, res) {
        hardware.clrEmergency();
        generateResponse(null, 'emergency-delete', 0, function send(err, data){
                data.result = "OK";
                res.json(data);
        });
    })
    .get(function(req, res){     
        hardware.isEmergencyOngoing(null, function getPositionSender(err, result){
            generateResponse(err, 'emergency-get', result, function send(err, data){
                data.data = result;
                res.json(data);
            });                           
        });
    });
    
router.route('/position')
    .put(function(req, res){
        var request = eval(req.body);
        if (request.value !== undefined){
            hardware.setPosition(null, request.value, function setPositionSender(err, result){
                generateResponse(null, 'position-set', result, function send(err, data){
                    res.json(data);
                });                           
            });
        }
        else{
            generateResponse(new Error( "Called with undefined value parameter. Body: " + request), 'mode-put', hardware.getMode(), function send(err, data){
                res.json(data);
            });                       	
        }
    })
    .get(function(req, res){     
        hardware.getPosition(null, function getPositionSender(err, result){
            generateResponse(err, 'position-get', result.position, function send(err, data){
                data.data = result;
                res.json(data);
            });                           
        });
    });    
        
router.route('/position/measured')
    .put(function(req, res){
        var request = eval(req.body);
        if (request.value !== undefined){
            hardware.setMeasured(null, request.value, function setMeasuredSender(err, result){
                generateResponse(null, 'position-measured-set', result, function send(err, data){
                    res.json(data);
                });                           
            });
        }
        else{
            generateResponse(new Error( "Called with undefined value parameter. Body: " + request), 'mode-put', hardware.getMode(), function send(err, data){
                res.json(data);
            });                       	
        }
    });     
module.exports = router;

