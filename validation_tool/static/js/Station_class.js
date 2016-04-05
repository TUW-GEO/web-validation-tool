/** This  Class is responsible for the station it sets up the info window content
	and contains setters and getters for most options as well as show hide functions.
	It also has a ISMNDataViewer object that it can open.
	@author Christoph Paulik - christoph.paulik@geo.tuwien.ac.at
	@constructor
	@param {google maps object} map - google maps object the ISMN should work on
	@param {object}	Network - reference to owning network
	@param {object} StationObject - js object from json file
	@param {boolean} visible - if the network should be visible from the start
	@param {boolean} infoWindowEnabled - if the markers should have infoWindows, only necessary for static overviews
*/
function Station(map,Network,StationObject,visible,infoWindowEnabled){
	
	this.map = map;
	
	this.location=new google.maps.LatLng(StationObject.lat,StationObject.lng);
	
	this.stationObject=StationObject;
	
	this.name=StationObject.station_name;
	this.abbr=StationObject.station_abbr;
	this.id=StationObject.stationID;
	
	this.startDate=new Date(StationObject.minimum);
	this.endDate=new Date(StationObject.maximum);
	
	this.marker=new ISMNMarker(map,this.location,Network.color,visible,Network.name+"-"+this.name);	
	
	this.dataviewer=new ISMNDataViewer(this.id+'_dv');
	
	this.validationViewer=null;
	
	this.network=Network;
	
	this.visible=visible;
	
	this.color=Network.color;
	
	this.deactivated=false;
	
	this.infoWindowEnabled=infoWindowEnabled;
	
	this.validationButton=false;
	 		 		
	
}
/** initializes the station
	adds info window if enabled
*/
Station.prototype.init= function(){

	if(this.infoWindowEnabled)this.generateInfoWindow();

}

/** deactivates the station
*/
Station.prototype.deactivate=function(){

	this.deactivated=true;
	this.marker.deactivate();

}
/** activates the station
*/
Station.prototype.activate=function(){

	this.deactivated=false;
	this.marker.activate();

}

/** populates info window with information from StationObject
*/
Station.prototype.generateInfoWindow= function(){

	var html="<div class='iwindow'>\
			<h2>Station:</h2> "+this.name+" ("+this.stationObject.station_abbr+")<br>\
			<h2>Network:</h2> "+this.network.name + '<br>';
	if(this.network.networkObject.network_url!=null){
		html+='<h2>Network URL:</h2>';
		network_urls = this.network.networkObject.network_url.split(';');
		$.each(network_urls, function(index,value){
		
			html+='<a target="_blank" href="'+value+'">'+value+'</a>'+' <br>';
			
			
		});
	
	}	
	if(this.stationObject.extMetadata!=null){
	html+='<h2>Metadata URL:</h2> <a target="_blank"  href="'+this.stationObject.extMetadata+'">'+this.stationObject.extMetadata+'</a>'+'<br>';
	}	
	if(this.stationObject.comment!=null){
	html+='<h2>Comment:</h2> '+this.stationObject.comment + '<br>';
	}		
			
	html+='<br>\
			<table class="popup"><thead><tr><th> Data available </th><th> Variables measured </th></tr></thead>\
			<tr><td>from: '+this.stationObject.minimum+'<br> to: '+this.stationObject.maximum+' </td><td>'+this.stationObject.variableText+'</td></tr>\
			<thead><tr><th> Soil Moisture measured at </th><th> Soil moisture measured with </th></tr></thead>\
			<tr><td>'+this.stationObject.depthText+'</td><td>'+this.stationObject.sensorText+'</td></tr></table>';
  // set htmlinfo without buttons to be reused later
	this.htmlInfo = html;	

    html += '<br><a href="#", id="viewData" class="Button">View Data</a>';

			
	  if(this.validationButton&&this.hasRecordsInDateRange(new Date(2007,01,01).getTime(),new Date(2012,11,31).getTime())){
        html+='<a href="#" id="compareData" class="Button">Compare to CCI</a>';
    }
	
	html+='</div>';
	
	if(this.stationObject.minimum=='never')
	{
		var html="<div class='iwindow'><br><h2>Station:</h2> "+this.name+" ("+this.stationObject.station_abbr+")<br><h2>Network:</h2> "+this.network.name + '<br>\
		<br>No Data available</div>';
	}
	
	this.marker.setInfoWindow(html,this);

}
/** checks if station has data in date range
	@param {long} start - time in milliseconds from epoch
	@param {long} end - time in milliseconds from epoch
*/
Station.prototype.hasRecordsInDateRange=function(start,end){

	if(this.endDate.getTime()>=start&&this.startDate.getTime()<=end)return true;
	return false;

}

/** opens the data viewer belonging to this station
*/
Station.prototype.openDataViewer=function(){

	this.dataviewer.openViewer(this);
}

/** shows the station
*/
Station.prototype.show= function(){

	this.marker.show();
	this.visible=true;

}
/** hides the station
*/
Station.prototype.hide= function(){

	this.marker.hide();
	this.visible=false;

}

/** set station marker with respect to zoom level
	currently not used
	@param {int} zoom - current zoom level
*/
Station.prototype.setMarkerIconsWithRespectToZoom=function(zoom){

	this.marker.setIconWithRespectToZoom(zoom);
}

/** get location of station
	@returns {object} google.maps.LatLng object
*/
Station.prototype.getLocation= function(){

	return this.location;
}
/** get latitude of station
	@returns {float} latitude
*/
Station.prototype.getLatitude= function(){

	return this.location.lat();
}
/** get longitude of station
	@returns {float} longitude
*/
Station.prototype.getLongitude= function(){

	return this.location.lng();
}

Station.prototype.activateValidationFunction=function(){

	this.validationButton=true;
	this.validationViewer=new ValidationViewer(this.id+'_dv');
	this.generateInfoWindow();
	
}

Station.prototype.openDataComparison=function(){

	this.validationViewer.openViewer(this);

}

Station.prototype.focusMapOnMe=function(){

	this.map.setCenter(this.location);
	this.map.setZoom(7);

}
