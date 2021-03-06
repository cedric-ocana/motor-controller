var TRUE = 1;
var FALSE = 0;
var emergencyDisplayToggler = 0;
var emergencyPending = FALSE;
var keypressed = 0;
var eventHandlerDone = FALSE;
var previousSpeedPosition = 0;
var currentPosition = -1;
var currentSpeed = 0;
var speedSlow = FALSE;

var ANTENNAS={"SMALL":	{	"ID":1,
							"RANGE":{"MAX":185,"MIN":70},
							"NAME":"small antenna",
							"CLASSES":{	"POLE":"smallAntennadiv",
										"MAIN":"smallAntenna"
							},
							"NEXT":"BIG"
						},
			  "BIG":	{	"ID":2,
							"RANGE":{"MAX":175,"MIN":90},
							"NAME":"big antenna",
							"CLASSES":{	"POLE":"bigAntennadiv",
										"MAIN":"bigAntenna"
							},
							"NEXT":"SMALL"						
						}
			 };		  		  
var currentAntenna = ANTENNAS.BIG;	

function emergency(){
    if(emergencyPending === TRUE){	
		keypressed = 0;
        alert("System in emergency situation. Please release before continuing!");
        return TRUE;
    }
    else{
        return FALSE;
    }
}

function getHeight(elementName)
{
	return parseInt($("#"+ elementName).css("height"));
}


function control(parameter) {
    if (emergency() === FALSE){
        options = {};
        options.parameter = parameter;
        options.value = -1*($("#"+parameter).val());
        options.value += 2068;

        var response = {};
        $.ajax({url:'/api/speed', type:'PUT', data:options}).success(function(msg){
                response = decodeMsg(msg);
        });	
    }
}


function setSpeed(value)
{	
	currentSpeed = value;
    var rangeMargin = 4;
    var indicatorHeigth = getHeight("speedindicator");
    var barHeight = getHeight("speedbar");
    var range = (barHeight- rangeMargin - indicatorHeigth);
    var indicatorPosition = 1 + range / 2 * (1- value);
    if (indicatorPosition > (barHeight - indicatorHeigth))
    {
            indicatorPosition = (barHeight - indicatorHeigth);
    }
	if (indicatorPosition < 0){
		indicatorPosition = 0;
	}
		
    $("#speed").val(Math.round(value*2068));	
    control("speed");
    $("#speedindicator").css('margin-top',indicatorPosition + 'px');	
}

function controllerApiPutValue(controlWithValue, urlOnTopOfAPI){
	var options = {};
	options.value = $("#"+controlWithValue).val();
	controllerApiPut(urlOnTopOfAPI, options);
}

function controllerApiPut(url, options){
    if (!emergency()){
		$.ajax({url:'/api/'+url, type:'PUT', data:options}).success(function(msg){});
    }	
}

function setMeasuredPosition(source){
	controllerApiPutValue(source, 'position/measured');
}

function drawAntennaPosition(heigthInCm){
   var position = getHeight("mastbar") - heigthInCm;    
   $("#fixation").css("margin-top",(position+31) + 'px');    
   $("#tray").css("margin-top",position + 'px'); 
}

function speedControl(position)
{	
	var range = getHeight("manualControllerPad")/2;
	var safeguarddistance = 0.13;
	var a = 2.5;
	var divider = 1;
	var x = (range  - (position + $(window).scrollTop()) )/divider ;	
	var c = 1000000;
	// Formula:	
	var speed = (a * x * Math.pow(Math.abs(x),2))/c;	
	if (speed > 1 - safeguarddistance)
	{
		speed = 1;
	}
	if (speed < -1 + safeguarddistance)
	{
		speed = -1;
	}
	setSpeed(speed);
}

function speedControlOnMouseMove(event){	
	var unlinkMargin = 5;
	var xpos = event.clientX - $("#manualController").position().left+ $(window).scrollLeft();
	var ypos = event.clientY - $("#manualController").position().top + $(window).scrollTop();
	
	var unlink = 0;
	if (xpos <= unlinkMargin  | xpos > (parseInt($("#manualControllerPad").css("width"))-unlinkMargin))
	{
		unlink = 1;
	}
	if (ypos <= unlinkMargin  | ypos > (parseInt($("#manualControllerPad").css("height"))-unlinkMargin))
	{
		unlink = 1;
	}		
	if(unlink === 1)
	{
		keypressed = 0;				
	}
	
	if (keypressed == 1){		
		speedControl(event.clientY - $("#manualController").position().top);		
	}
	else{
		previousSpeedPosition = event.clientY - $("#manualController").position().top;
	}
}

function enableSpeedController(event)
{	
	keypressed = 1;
	speedControl(previousSpeedPosition);
}

function disableSpeedController()
{
	keypressed = 0;
	speedControl(150);
}

//mousemove="enableSpeedController()", onmouseup="disableSpeedController()"
function decodeMsg(msg)
{
	$("#currentheight").val(msg.value);
	var response = eval("(" + msg + ")");
	updateStatus(response);
	return response;
}

var intervalDtawStatus;

function init(){
	hideAntennas();
	getAntennas();
	if (typeof $("#manualControllerPad" ).mousemove === "function"){
		$("#manualControllerPad" ).on('mousemove',function(e){
			$("#newPosition").val(e.button);
			speedControlOnMouseMove(e);
		});
	}	
	clearInterval(intervalInitialization);
	intervalDtawStatus = setInterval("drawStatus();", 500);
	$("body").keyup(function(event){		
		keyboardAction(event);
	});

}

var intervalInitialization = setInterval("init();",500);

function getAntennas(){
	$.ajax({url:'/api/antennas', type:'GET'}).success(function(msg){		
		ANTENNAS = msg.value;
	}); 
}

function drawStatus()
{		
    $.ajax({url:'/api/position', type:'GET'}).success(function(msg){
		currentPosition = Math.round(msg.value*100)/100;
		$("#currentPositionText").val(Math.round(currentPosition*100)/100 + "cm");
		drawAntennaPosition(parseInt(msg.value));
	    });   
		
    $.ajax({url:'/api/antenna', type:'GET'}).success(function(msg){
			//alert(msg.value);
			if(ANTENNAS.hasOwnProperty(msg.value)){
				currentAntenna = ANTENNAS[msg.value];
				drawAntenna();
				
			}
	    }); 		
    $.ajax({url:'/api/speed/slow', type:'GET'}).success(function(msg){
                        //alert(msg.value.slow);
                        if((msg.value.slow == FALSE) || (msg.value.slow == TRUE)){
				if(msg.value.slow == "1"){
					speedSlow = TRUE;
					$("#speedSwitch").val("Click to move faster");
				}
				else{
					speedSlow = FALSE;
					$("#speedSwitch").val("Click to move slower");
				}
                        }
            });

    $.ajax({url:'/api/emergency', type:'GET'}).success(function(msg){	
		if (msg.value === "1" && emergencyPending === FALSE){
			emergencyPending = TRUE;
			drawSetEmergency();
		}
		if (msg.value !== "1" && emergencyPending === TRUE){
			emergencyPending = FALSE;
			drawClearEmergency();
		}
    });		
}

var intervalEmergencyHighlighter;

function drawEmergencyHighlighting(){
	if (emergencyDisplayToggler === 1){
		emergencyDisplayToggler = 0;
		$("#positionIdicator").css("border","4px solid red");
	}
	else{
		emergencyDisplayToggler = 1;
		$("#positionIdicator").css("border","4px solid black");	
	}
}

function drawSetEmergency(){
	$("#emergencyStop").css("background-color","gainsboro");
	$("#emergencyRelease").css("background-color","greenyellow");	
	intervalEmergencyHighlighter = setInterval("drawEmergencyHighlighting();", 500);
}

function drawClearEmergency(){
	$("#emergencyRelease").css("background-color","gainsboro");
	$("#emergencyStop").css("background-color","orangered");
	clearInterval(intervalEmergencyHighlighter);
	$("#positionIdicator").css("border","4px solid green");	
	
}

function switchAntenna(){	
	$.ajax({url:'/api/antenna/'+currentAntenna.NEXT, type:'PUT'}).success(function(){});
}

function toggleSlowSpeed(){
	if(speedSlow === TRUE){
	        $.ajax({url:'/api/speed/slow', type:'DELETE'}).success(function(){});
	}
	else{
	        $.ajax({url:'/api/speed/slow', type:'PUT'}).success(function(){});
	}
}

function drawAntenna(){
	hideAntennas();
	with(currentAntenna.CLASSES){
		for (var i = 1; i <= 4; i++){
			$("#pole"+i).addClass(POLE);
		}
		$("#antenna").addClass(MAIN); 
	}
	$("#antennaSwitch").val("Click to use " + ANTENNAS[currentAntenna.NEXT].NAME);
	$("#range").text("Valid range: " + currentAntenna.RANGE.MIN  + "cm - " + currentAntenna.RANGE.MAX + "cm");
}

function hideAntennas(){
	for (var i = 1; i <= 4; i++){
		$("#pole"+i).removeClass();
	}  
    $("#antenna").removeClass("smallAntenna bigAntenna"); 
}

function getValidHeight(value){
	with(currentAntenna){
		if (value <= RANGE.MAX & value >= RANGE.MIN){
			return value;
		}
		else{
			alert("Wrong heigth!\nThe valid range for the " + NAME +" is:\n" +
				  RANGE.MIN + "cm - " + RANGE.MAX + "cm");
			return -1;
		}
	}
}

function setNewAntennaHeight(source){	
	disableSpeedController();
    if (!emergency()){		
		var options = {};
		options.value = getValidHeight(parseFloat($("#"+source).val()));
		if (options.value > 0){			
			controllerApiPut('position', options);
		}
		else{            
			$("#"+source).val("");
		}
    }
}
function setNewAntennaHeightOnValue(value){	
	disableSpeedController();
    if (!emergency()){		
		var options = {};
		options.value = getValidHeight(parseFloat(value));
		if (options.value > 0){			
			controllerApiPut('position', options);
		}
		else{            
			$("#"+source).val("");
		}
    }
}

function emergencyStop(){
    $.ajax({url:'/api/emergency', type:'PUT'}).success(function(){});
}
function emergencyRelease(){
    $.ajax({url:'/api/emergency', type:'DELETE'}).success(function(){});
}
function setNewHeight(heigth){
	var id = "newPosition";	
	$("#" + id).val(heigth);	
	setNewAntennaHeight(id);
}
function keyboardAction(event){			
	switch(event.keyCode){
		case 13:
			if (event.target.id === "newPosition"){
				setNewAntennaHeight(event.target.id);
			}			
			$("#newPosition").focus();
			break;
		case 33:// Page up
			setNewHeight(currentPosition + 5);
			$("#newPosition").focus();
			break;
		case 34:// Page down
			setNewHeight(currentPosition - 5);
			$("#newPosition").focus();
			break;
		case 38:// ARROW UP
			setNewHeight(currentPosition + 2);
			$("#newPosition").focus();
			break;
		case 40: // ARROW DOWN
			setNewHeight(currentPosition - 2);
			$("#newPosition").focus();
			break;
		case 36: //HOME
			setNewHeight(currentAntenna.RANGE.MAX);
			$("#newPosition").focus();
			break;
		case 35: //END
			setNewHeight(currentAntenna.RANGE.MIN);
			$("#newPosition").focus();
			break;
		case 107: //ADD
			accelerate(50);
			$("#" + event.target.id).val(0);
			$("#newPosition").focus();
			break;
		case 109: //SUBTRACT
			accelerate(-50);			
			$("#" + event.target.id).val(0);
			$("#newPosition").focus();
			break;
		case 46:
		case 27:
//			$(defaultNewPositonField).val(0);
			setSpeed(0);		
			$("#newPosition").val(currentPosition);
			$("#newPosition").focus();
			break;
		default:
//			alert(event.keyCode);
	}	
}

function accelerate(value){
	currentSpeed += value/2068;
	setSpeed(currentSpeed);
		
}


function powerOff(){
    $.ajax({url:'/api/power', type:'DELETE'}).success(function(){});
}
