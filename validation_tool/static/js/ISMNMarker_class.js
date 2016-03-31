

var infoWindow=new google.maps.InfoWindow();;   //only 1 infoWindowObject so that only 1 is shown on the map simultaniously

/** Responsible for markers and their appearence
	@author Christoph Paulik - christoph.paulik@geo.tuwien.ac.at
	@constructor
	@param {google maps object} map - google maps object the marker should be displayed on
	@param {object}	position - google.maps.LatLng object
	@param {string} color - hex color of the marker
	@param {boolean} visible - if the marker should be visible from the start
	@param {string} title - title of the marker which is shown on mouseover
*/
function ISMNMarker(map,position,color,visible,title){
	
	this.iconURL="http://chart.googleapis.com/chart?chst=d_map_spin&chld=0.35|1|"+color+"|000000";
	  
	this.map=map;
	
	this.color=color;	//color it should have if activated
	
	this.currentColor=color;	//currentColor is the color the marker currently has could be grey if it is deactivated
	
	this.visible=visible;
	
	this.hasInfoWindow=false;
	
	this.infoWindow=undefined;
	
	this.deactivated=false;
	
	if(this.visible){
		var onMap=this.map; 
	}
	else{
		var onMap=null;
	}
	
	this.title=title;
	
	this.marker=new google.maps.Marker({
            position:position,
            map:onMap,
            icon:this.iconURL,
			title:this.title
        });
}

/** sets the info window of the marker and adds eventlisteners. Unfortunately we can only bind events to DOM elements that already exist
	so the click function on "view data" has to be defined here. If there is a better solution please do tell.
	@param {string} html - html content of the info window
	@param {object} parent - parent of the marker whose data viewer has to be opended if the button in the info window is clicked. should only be given if it is a station.
*/
ISMNMarker.prototype.setInfoWindow=function(html,parent){

	var _self=this;
	
	this.clickListener=google.maps.event.addListener(this.marker, 'click', function() {
		infoWindow.setContent(html);
		infoWindow.open(_self.map,_self.marker);
		_self.domReadyListener=google.maps.event.addListener(infoWindow,'domready',function(){
	
			if(parent!=undefined){		//if infomaker is on a station rather than a network
				if($("#compareData").length!=0){
					$("#compareData").click(function() {
						parent.openDataComparison();
					});
				}
			}
	
		});
		
		
		google.maps.event.addListener(infoWindow,'position_changed',function(){
			if(parent!=undefined){		//if infomaker is on a station rather than a network
				google.maps.event.removeListener(_self.domReadyListener);	
			}	
	
		});
		google.maps.event.addListener(infoWindow,'content_changed',function(){
			if(parent!=undefined){		//if infomaker is on a station rather than a network
				google.maps.event.removeListener(_self.domReadyListener);	
			}	
	
		});
			
	});
	this.closeListener=google.maps.event.addListener(infoWindow,'closeclick',function(){
	
			if(parent!=undefined){		//if infomaker is on a station rather than a network
				google.maps.event.removeListener(_self.domReadyListener);	
			}	
	});
	
	
	this.hasInfoWindow=true;

}

/** set marker icon with respect to zoom level
	currently not used
	@param {int} zoom - current zoom level
*/
ISMNMarker.prototype.setIconWithRespectToZoom=function(zoom){

	var scale=zoom/11+0.1;
	if(zoom > 12){	this.iconURL="http://chart.googleapis.com/chart?chst=d_map_spin&chld="+scale+"|1|"+this.currentColor+"|9|_|"+this.title;
	}
	else{
		this.iconURL="http://chart.googleapis.com/chart?chst=d_map_spin&chld="+scale+"|1|"+this.currentColor+"|000000";
	}
	this.marker.setIcon(this.iconURL);

}

/** set marker icon to the title of the marker
	currently not used
*/
ISMNMarker.prototype.addTitleAsIcon=function(){

	this.iconURL="http://chart.googleapis.com/chart?chst=d_text_outline&chld=666666|9|h|"+this.currentColor+"|b|"+this.title;
	this.marker.setIcon(this.iconURL);

}

/** set marker icon to grey icon
*/
ISMNMarker.prototype.deactivate=function(){
	this.deactivated=true;
	this.currentColor='666666';
	this.marker.setIcon("http://chart.googleapis.com/chart?chst=d_map_spin&chld=0.35|1|"+this.currentColor+"|000000");
	//this.hasInfoWindow=false
}

/** set marker icon to original color icon
*/
ISMNMarker.prototype.activate=function(){
	this.deactivated=false;
	this.currentColor=this.color;
	this.marker.setIcon(this.iconURL);
	//this.hasInfoWindow=false
}
/** show marker on map
*/
ISMNMarker.prototype.show=function(){
    this.visible=true;
	this.marker.setMap(this.map);
}
/** hide marker from map
*/
ISMNMarker.prototype.hide=function(){
    this.visible=false;
	this.marker.setMap(null);
}


