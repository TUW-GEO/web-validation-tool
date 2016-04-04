
/** This  Class is responsible for each Network, it handles the stations and the 
	visibility of the correct markers (network or stations) and also the info window
	of the network marker.
	@author Christoph Paulik - christoph.paulik@geo.tuwien.ac.at
	@constructor
	@param {google maps object} map - google maps object the ISMN should work on
	@param {object}	networkObject - js object from json file containing information about the network and its stations
	@param {string} color - hex color code of network color
	@param {boolean} visible - if the network should be visible from the start
	@param {boolean} infoWindowEnabled - if the markers should have infoWindows, only necessary for static overviews
	@param {boolean} menuEnabled - if a menu exists - does not for static overviews
	@param {int} networkMarkerZoom - zoomlevel at which the network marker should be switched for the station markers
*/
function Network(map,networkObject,color,visible,infoWindowEnabled,menuEnabled,networkMarkerZoom){
	
	// Name of the DataViewer where the map is displayed
	this.map = map;
	
	this.name=networkObject.networkID;
	
	this.stationObject=networkObject.Stations;	//all stations belonging to the network
	
	this.networkObject=networkObject;
	
	this.networkContinent=networkObject.network_continent.replace("_"," "); //network continent spaces filled with underscores
	
	this.stations=[];
	
	this.visible=visible;
	
	this.startDate=new Date(1950,1,1);
	if(networkObject.network_op_start!=null)this.startDate=new Date(networkObject.network_op_start.replace('/','-'));
	
	this.endDate=new Date();
	if(networkObject.network_op_end!=null)this.endDate=new Date(networkObject.network_op_end.replace('/','-'));
	
	this.stationsVisible=visible;
	
	this.networkMarkerVisible=visible;
	
	this.infoWindowEnabled=infoWindowEnabled;
	
	this.menuEnabled=menuEnabled;
	
	this.color=color;
	
	this.Extent=new google.maps.LatLngBounds();
	
	this.networkMarker=undefined;
	
	this.networkMarkerZoom=networkMarkerZoom;	//zoomlevel at which the network marker should be switched for the station markers
	
	this.zoomLevelsThresholds=[];	//not used, if set the icons change size at these zoomlevels
      		 		
	this.validationButton=false;
}
/** initializes the network
	adds the stations, adds listeners, show the correct markers for the current zoom level
	and generate info windows
	*/
Network.prototype.init= function(){

	this.generateStations();
	this.addListeners();
	this.showCorrectMarkers();
	if(this.infoWindowEnabled){
      this.generateInfoWindow ();}
  this.hideNetworkMarker();

}

/** make new stations from stationObject and calculate Extent of the Network
*/
Network.prototype.generateStations = function(){

	for (var i = 0; i < this.stationObject.length; i++) {	
		var station=new Station(this.map,this,this.stationObject[i],this.visible,this.infoWindowEnabled);
		station.init();
		this.Extent=this.Extent.extend(station.getLocation());
		this.stations.push(station);
	}	
	
	this.networkMarker=new ISMNMarker(this.map,this.stations[0].getLocation(),this.color,this.networkMarkerVisible,this.name);	

}
/** populate info window with content
*/
Network.prototype.generateInfoWindow= function(){

	var html ='<div class="iwindow"><h2>'+this.name+'</h2><br>';
	if(this.networkObject.network_abstract!=null){
		html+='<h2>Abstract:</h2>'+this.networkObject.network_abstract+' <br>';
	}
	if(this.networkObject.network_reference!=null){
		html+='<b>Reference:</b> '+this.networkObject.network_reference+' <br>';
	}
	html+='<b>Status:</b> '+this.networkObject.network_status+' <br> <b>Country:</b> '+this.networkObject.network_country+' <br>\
	<b>Operational start:</b> '+this.networkObject.network_op_start+' <br> <b>Type:</b> '+this.networkObject.network_type+' <br>';
	if(this.networkObject.network_url!=null){
		html+='<b>URL:</b>';
		network_urls = this.networkObject.network_url.split(';');
		$.each(network_urls, function(index,value){
		
			html+='<a target="_blank" href="'+value+'">'+value+'</a>'+' <br>';
			
			
		});
		 
	}
	html+='<table><thead><tr><th> Variables measured </th><th> Soil Moisture measured at </th><th> Soil moisture measured with </th></tr></thead>\
	<tr><td>'+this.networkObject.network_variables+'</td><td>'+this.networkObject.network_depths+'</td><td>'+this.networkObject.network_sensors+'</td></tr></table><br>\
	<a class="Button" onclick="Master.fitToNetwork('+"'"+this.name+"'"+')">zoom in to see Stations</a></div>';
	
    this.networkMarker.setInfoWindow(html,null);
}

/** add zoomListener to google maps.
	in the current case the event is fired for each network which then checks the zoom level and 
	sets the visibility of its markers correctly. May be faster if moved to class ISMN
*/
Network.prototype.addListeners =  function(){
		var _self=this;
		var PreviousZoom=this.map.getZoom();
		 //if zoom crossed the level networkMarkerZoom threshold-> show station_marker
		this.zoomListener=google.maps.event.addListener(this.map, 'zoom_changed', function() {   
				zoomLevel=_self.map.getZoom();
				
				if((PreviousZoom<_self.networkMarkerZoom&&zoomLevel>=_self.networkMarkerZoom)||(PreviousZoom>=_self.networkMarkerZoom&&zoomLevel<_self.networkMarkerZoom)){
					_self.showCorrectMarkers();
					$("#date_end").trigger('change');	//fire the change event to reset the date slider
				}
				
				for(var i=0;i<_self.zoomLevelsThresholds.length;i++){
				
					if((PreviousZoom<_self.zoomLevelsThresholds[i]&&zoomLevel>=_self.zoomLevelsThresholds[i])||(PreviousZoom>=_self.zoomLevelsThresholds[i]&&zoomLevel<_self.zoomLevelsThresholds[i])){
					_self.setMarkerIconsWithRespectToZoom(zoomLevel);
					}
				
				}
				PreviousZoom=zoomLevel;
		});
		
}
/** shows the network marker
*/
Network.prototype.showNetworkMarker = function(){

	this.networkMarker.show();
	this.networkMarkerVisible=true;
}

/** hides the network marker
*/
Network.prototype.hideNetworkMarker = function(){

	this.networkMarker.hide();
	this.networkMarkerVisible=false;

}

/** sets station icons depending on zoom level 
	currently not used
	@param {int} zoom - zoom level to use for setting the markers
*/
Network.prototype.setMarkerIconsWithRespectToZoom=function(zoom){

	this.networkMarker.setIconWithRespectToZoom(zoom);
	for (var i = 0; i < this.stations.length; i++) {	
		 this.stations[i].setMarkerIconsWithRespectToZoom(zoom);
	}	
	

}

/** checks if stations have data in date range and show or hide them if the current zoomlevel shows stations
	@param {long} start - time in milliseconds from epoch
	@param {long} end - time in milliseconds from epoch
*/
Network.prototype.checkStationsForDataInDateRange=function(start,end){

	var zoom=this.map.getZoom();

	for (var i = 0; i < this.stations.length; i++) {	
		 if(!this.stations[i].hasRecordsInDateRange(start,end)){
			
			
			if(zoom >= this.networkMarkerZoom){
				this.stations[i].hide();
			}
		}	
		 else{
			
			if(zoom >= this.networkMarkerZoom){
				this.stations[i].show();
			}

				
		 }
		 
	}	
	

}

/** checks if stations have data in date range and show or hide them if the current zoomlevel shows stations
	@param {long} start - time in milliseconds from epoch
	@param {long} end - time in milliseconds from epoch
*/
Network.prototype.hasRecordsInDateRange=function(start,end){

	if(this.endDate.getTime()>=start&&this.startDate.getTime()<=end)return true;
	return false;
	
}


/** shows the correct markers for the current zoom level
*/
Network.prototype.showCorrectMarkers= function(){
	
	if(this.isChecked()){
		var zoom=this.map.getZoom();
		if(zoom >= this.networkMarkerZoom){
			this.showStations();
			this.hideNetworkMarker();
		}
		else{
			this.hideStations();
			this.showNetworkMarker();
		}
	}
	
}
/** shows the network and checks it in the menu
*/
Network.prototype.show = function(){
	
	if(this.menuEnabled)this.checkNetwork();
	this.showCorrectMarkers();
	this.visible=true;

}

/** hides the network and unchecks it in the menu
*/
Network.prototype.hide = function(){

	this.hideNetworkMarker();
	this.hideStations();
	if(this.menuEnabled)this.uncheckNetwork();
	this.visible=false;
}

/** unchecks the network checkbox in the menu
*/
Network.prototype.uncheckNetwork=function(){

    var networkId="#networkCheckbox_"+this.name;
	$(networkId).prop('checked',false);

}

/** checks the network checkbox in the menu
*/
Network.prototype.checkNetwork=function(){

    var networkId="#networkCheckbox_"+this.name;
	$(networkId).prop('checked',true);

}

/** checks if network is selected in menu
	@returns {bool} true if network checkbox in menu is checked
*/
Network.prototype.isChecked=function(){

	if(!this.menuEnabled)return true;
    var networkId="#networkCheckbox_"+this.name;
	return $(networkId).prop('checked');

}
/** toggles network visibility
*/
Network.prototype.toggle = function(){

	this.hideNetworkMarker();
	this.hideStations();
	if(this.visible==false){
		this.show();
	}	
	else this.hide();
}

/** shows all stations of the network
*/
Network.prototype.showStations = function(){
	
	for (var i = 0; i < this.stations.length; i++) {	
		 this.stations[i].show();
	}	
	this.stationsVisible=true;
}

/** deactivates all stations of the network
*/
Network.prototype.deactivateStations = function(){
	
	for (var i = 0; i < this.stations.length; i++) {	
		 this.stations[i].deactivate();
	}	

}
/** activates all stations of the network
*/
Network.prototype.activateStations = function(){
	
	for (var i = 0; i < this.stations.length; i++) {	
		 this.stations[i].activate();
	}	

}
/** deactivates all stations of the network that lie in bounds
	@param {object} bounds - google.maps.LatLngBounds object
*/
Network.prototype.deactivateStationsInBounds = function(bounds){
	
	for (var i = 0; i < this.stations.length; i++) {	
		 
		 if(!bounds.contains(this.stations[i].getLocation())){this.stations[i].deactivate();}
		 
	}	

}
/** activates all stations of the network that lie in bounds
	@param {object} bounds - google.maps.LatLngBounds object
*/
Network.prototype.activateStationsInBounds = function(bounds){
	
	for (var i = 0; i < this.stations.length; i++) {	
		 
		 if(!bounds.contains(this.stations[i].getLocation())){this.stations[i].activate();}
		 
	}	

}
/** hides all stations of the network
*/
Network.prototype.hideStations = function(){

	for (var i = 0; i < this.stations.length; i++) {	
		 this.stations[i].hide();
	}	
	this.stationsVisible=false;

}
/** get the network Extent
	@returns {object} google.maps.LatLngBounds object
*/
Network.prototype.getExtent = function(){
    
	return this.Extent;

}


Network.prototype.activateValidationFunction=function(){

	this.validationButton=true;
	for (var i = 0; i < this.stations.length; i++) {
	
		this.stations[i].activateValidationFunction();
	
	}
	
	
}
