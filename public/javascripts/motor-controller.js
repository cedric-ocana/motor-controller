var TRUE = 1;
var FALSE = 0;
var emergencyDisplayToggler = 0;
var emergencyPending = FALSE;
var keypressed = 0;
var eventHandlerDone = FALSE;
var previousSpeed = 0;

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
		previousSpeed = event.clientY - $("#manualController").position().top;
	}
}

function enableSpeedController(event)
{	
	keypressed = 1;
	speedControl(previousSpeed);
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
	if (typeof $("#manualControllerPad" ).mousemove === "function"){
		$("#manualControllerPad" ).on('mousemove',function(e){
			$("#newPosition").val(e.button);
			speedControlOnMouseMove(e);
		});
	}  
	clearInterval(intervalInitialization);
	intervalDtawStatus = setInterval("drawStatus();", 200);
}

var intervalInitialization = setInterval("init();",500);

function drawStatus()
{	
  
    $.ajax({url:'/api/position', type:'GET'}).success(function(msg){		
		$("#currentPositionText").val(Math.round(msg.value*100)/100 + "cm");
		drawAntennaPosition(parseInt(msg.value));
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
	currentAntenna = ANTENNAS[currentAntenna.NEXT];	
	drawAntenna();
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


function emergencyStop(){
    $.ajax({url:'/api/emergency', type:'PUT'}).success(function(){});
}
function emergencyRelease(){
    $.ajax({url:'/api/emergency', type:'DELETE'}).success(function(){});
}

