function set(parameter) {
	options = {};
	options.parameter = parameter;
	//alert(parameter);
	options.value = $("#"+parameter).val();
	
	$.ajax({url:'/save', type:'POST', data:options}).success(function(msg){
		var response = decodeMsg(msg);
	});
}


function onEnter(event, callback){
	alert(event.keyCode);
	if (event.keyCode==13)
	{
		//callback(this.id);
	}
}

function updateStatus(response)
{
	switch (response.status)
	{
		case "OK":
		{	
			$("#"+response.parameter+"-status").attr('class','statusok');
			break;
		}
		default:
		{	
			$("#"+response.parameter+"-status").attr('class','statuserr');
		}
		
	}
}

function decodeMsg(msg)
{
	$("#ajax-msg").text(msg);
	var response = eval("(" + msg + ")");
	updateStatus(response);
	return response;
}

function update()
{
	options = {};
	options.parameter = "adc-value"
	
	$.ajax({url:'/save', type:'POST', data:options}).success(function(msg){		
			var response = decodeMsg(msg);
			
			$("#adc-value").val(response.value);
			indicator = document.getElementById("indicator");
			var value = response.value/3.3 * 100;
			if (value >= 100)
			{
				value = 100;
			}
			indicator.style.width=value + "px";			
		});
	
}

setInterval("update();", 500);