var currentAntennaIsSmallAntenna = 0;
var emergencyDisplayToggler = 0;
var emergencyPending = 0;

function emergency(){
    if(emergencyPending === 1){
        alert("System in emergency situation. Please release before continuing!");
        return 1;
    }
    else{
        return 0;
    }
}

function getHeight(elementName)
{
	return parseInt($("#"+ elementName).css("height"));
}

function control(parameter) {
    if (emergency() === 0){
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
    $("#speed").val(Math.round(value*2068));	
    control("speed");
    $("#speedindicator").css('margin-top',indicatorPosition + 'px');	
}
function set(parameter){
    if (!emergency()){
	options = {};
	options.value = $("#"+parameter).val();		
	$.ajax({url:'/api/'+parameter, type:'PUT', data:options}).success(function(msg){
		var response = decodeMsg(msg);
	});
    }
}

function displayAntennaPosition(heigthInCm){
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


function setupControl()
{	
	$("#speedbar").css("background-color","silver");
	setSpeed(0);
	$( "#manualControllerPad" ).mousemove(function( event ) {	
		var unlinkMargin = 5;
		var xpos = event.clientX - $("#manualController").position().left+ $(window).scrollLeft();
		var ypos = event.clientY - $("#manualController").position().top + $(window).scrollTop();
		
		//$("#info").text("ypos" + ypos + "<>" + ( $(window).scrollTop()));
		var unlink = 0;
		if (xpos <= unlinkMargin  | xpos > (parseInt($("#manualControllerPad").css("width"))-unlinkMargin))
		{
			unlink = 1;
		}
		if (ypos <= unlinkMargin  | ypos > (parseInt($("#manualControllerPad").css("height"))-unlinkMargin))
		{
			unlink = 1;
		}		
		if(unlink == 1)
		{
			unlinkControl();
		}
		else
		{
			speedControl(event.clientY - $("#manualController").position().top);		
		}
	});
}

function unlinkControl()
{
	$( "#manualControllerPad" ).unbind('mousemove');
	$("#speedbar").css("background-color","gray");
	setSpeed(0);
}


function decodeMsg(msg)
{
	$("#currentheight").val(msg.value);
	var response = eval("(" + msg + ")");
	updateStatus(response);
	return response;
}

function update()
{
    options = {};	
    $.ajax({url:'/api/position', type:'GET', data:options}).success(function(msg){		
		$("#currentPositionText").val(Math.round(msg.value*100)/100 + "cm");
		displayAntennaPosition(parseInt(msg.value));
	    });
    options = {};	
    $.ajax({url:'/api/emergency', type:'GET', data:options}).success(function(msg){	
	if (msg.value === "1"){
            emergencyPending = 1;
	    $("#emergencyStop").css("background-color","gainsboro");
	    $("#emergencyRelease").css("background-color","greenyellow");
	    if (emergencyDisplayToggler === 1){
		emergencyDisplayToggler = 0;
		$("#positionIdicator").css("border","4px solid black");		
	    }
	    else{
		emergencyDisplayToggler = 1;
		$("#positionIdicator").css("border","4px solid red");
	    }
	}
	else{
            emergencyPending = 0;
	    $("#emergencyRelease").css("background-color","gainsboro");
	    $("#emergencyStop").css("background-color","orangered");
	    $("#positionIdicator").css("border","4px solid green");
	}
    });		
}
setInterval("update();", 500);

function switchAntenna(){
    if (currentAntennaIsSmallAntenna === 0){	
	currentAntennaIsSmallAntenna = 1;
	smallAntenna();	
    }
    else{	
	currentAntennaIsSmallAntenna = 0;
	bigAntenna();
    }
}

function removeAntenna(){
    $("#pole1").removeClass("smallAntennadiv bigAntennadiv");  
    $("#pole2").removeClass("smallAntennadiv bigAntennadiv");    
    $("#pole3").removeClass("smallAntennadiv bigAntennadiv");
    $("#pole4").removeClass("smallAntennadiv bigAntennadiv");   
    $("#antenna").removeClass("smallAntenna bigAntenna"); 
}

function smallAntenna(){
    $("#antennaSwitch").val("switch to big antenna");
    removeAntenna();
    $("#pole1").addClass("smallAntennadiv");  
    $("#pole2").addClass("smallAntennadiv");    
    $("#pole3").addClass("smallAntennadiv");
    $("#pole4").addClass("smallAntennadiv");   
    $("#antenna").addClass("smallAntenna");   
}

function bigAntenna(){
    $("#antennaSwitch").val("switch to small antenna");
    removeAntenna();
    $("#pole1").addClass("bigAntennadiv");  
    $("#pole2").addClass("bigAntennadiv");    
    $("#pole3").addClass("bigAntennadiv");
    $("#pole4").addClass("bigAntennadiv");   
    $("#antenna").addClass("bigAntenna");   
}
function getValidHeight(value, upperLimit, lowerLimit){
    if (value <= upperLimit & value >= lowerLimit){
	return value;
    }
    else{
	return -1;
    }
}

function setPosition(source){
    if (!emergency()){
        var value = parseFloat($("#"+source).val());    
        var range = {};
        range.max = 185;
        range.min = 70;
        if (currentAntennaIsSmallAntenna === 0){
            range.max = 175;
            range.min = 90;	
        }
        value = getValidHeight(value, range.max,range.min);
        if (value > 0){
            options = {};
            options.value = value;	
            $.ajax({url:'/api/position', type:'PUT', data:options}).success(function(msg){
                    var response = decodeMsg(msg);
            });
        }
        else{
            alert("Height outside of limit range! The valid range is: " + range.min + "cm - " + range.max + "cm");
            $("#"+source).val("");
        }
    }
}
function setCurrentPosition(source){
    if (!emergency()){  
	options = {};
	options.value = $("#"+source).val();	
	$.ajax({url:'/api/position/measured', type:'PUT', data:options}).success(function(msg){
		var response = decodeMsg(msg);
	});
    }
}


function emergencyStop(){
    options = {};
    options.value = "STOP";	
    $.ajax({url:'/api/emergency', type:'PUT', data:options}).success(function(msg){
	    var response = decodeMsg(msg);
    });
}
function emergencyRelease(){
    options = {};
    options.value = "RELEASE";	
    $.ajax({url:'/api/emergency', type:'DELETE', data:options}).success(function(msg){
	    var response = decodeMsg(msg);
    });
}