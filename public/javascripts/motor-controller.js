function getHeight(elementName)
{
	return parseInt($("#"+ elementName).css("height"));
}

function control(parameter) {
	options = {};
	options.parameter = parameter;
	//alert(parameter);
	options.value = $("#"+parameter).val();
	var response = {}
	$.ajax({url:'/control', type:'POST', data:options}).success(function(msg){
		response = decodeMsg(msg);
		$("#info").text(msg);
	});
	
	
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
	$("#speed").val(value);	
	control("speed");
	$("#speedindicator").css('margin-top',indicatorPosition + 'px');
}


function speedControl(position)
{	
	var range = getHeight("manualControllerPad")/2;
	var safeguarddistance = 0.13;
	var a = 1.5;
	var divider = 1;
	var x = (range  - position)/divider;	
	// c = (range/divider)^2;
	// Uncomment the line herafter to show result in info section.
	//$("#info").text(Math.pow(range/divider,3));
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
		var xpos = event.clientX - $("#manualController").position().left;
		var ypos = event.clientY - $("#manualController").position().top;
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