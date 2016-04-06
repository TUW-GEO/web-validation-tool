/** This  Class handles the ISMN - it also is responsible for 
	handling the download requests and populating the continent menu with
	the correct networks.
	@author Christoph Paulik - christoph.paulik@geo.tuwien.ac.at
	@constructor
	@param {google maps object} map - google maps object the ISMN should work on
	@param {boolean} visible - if the ISMN should be visible from the start
	@param {boolean} infoWindowEnabled - if the Markers should have infoWindows, only necessary for static overviews
	@param {boolean} menuEnabled - if a menu exists - does not for static overviews
	@param {int} networkMarkerZoom - zoomlevel at which the network marker should be switched for the station markers
*/
function Wrapper(map, info_map, visible, infoWindowEnabled, menuEnabled, networkMarkerZoom) {

    this.map = map;
    this.info_map = info_map;
    this.infoWindowEnabled = infoWindowEnabled;
    this.menuEnabled = menuEnabled;
    this.networks = [];
    this.networkNames = [];
    this.netcolors = ['B0171F', '8B475D', '8B008B', '4B0082', '483D8B',
        '0000FF', '000080', 'CAE1FF', '1E90FF', '00CED1', '008B45', '3D9140',
        '32CD32', '006400', 'EEEE00', 'FFA500', 'EE7600', 'CD4F39', 'FF0000',
        '7171C6', '388E8E', 'C67171', 'FFDEAD', 'DAA520', 'F0E68C', '9ACD32',
        'CAFF70', '9AFF9A', '2E8B57', '2F4F4F', '99FF33', 'CC6633', 'CCFFCC',
        '6633FF', '00FF99', '0066FF', 'CCFFFF', '006600', 'CC6600', 'FFCC00'
    ];
    this.visible = visible;
    this.selectedBounds = undefined;
    this.selectedPolygon = undefined;
    this.userId = '';
    this.validationButton = false;
    this.networkMarkerZoom = networkMarkerZoom; //zoomlevel at which the network marker should be switched for the station markers
}

/** this function adds Networks to the ISMN and and the Accordion
	this functionality could be split up if ever necessary but for now it is ok in one function 
	it also calls the init() function of each network to set it up internally
	@param {JSON} NetworkJson - Json object from file
	@param {string} addOnly - if given then only this network will be added, only needed for static overviews as used on the website
	*/
Wrapper.prototype.addNetworksJson = function(NetworksJson, addOnly) {

    var numberOfNetworks = 0;
    for (var i = 0; i < NetworksJson.length; i++) { //make network marker
        var uniqueNetworks = NetworksJson[i].networkID;
        if (addOnly === undefined) {
            if (NetworksJson[i].Stations.length !== 0) {

                this.networkNames.push(uniqueNetworks);
                this.networks.push(new Network(this.map, NetworksJson[i], this.netcolors[numberOfNetworks], this.visible, this.infoWindowEnabled, this.menuEnabled, this.networkMarkerZoom));
                this.networks[numberOfNetworks].init();
                numberOfNetworks++;
            }
        } else {
            if (addOnly == uniqueNetworks) {
                this.networkNames.push(uniqueNetworks);
                var new_network = new Network(this.map, NetworksJson[i], this.netcolors[i], this.visible, this.infoWindowEnabled, this.menuEnabled, this.networkMarkerZoom);
                this.networks.push(new_network);
                new_network.init();
            }
        }
    }
    if (this.menuEnabled) {

        $(function() {
            $('#NetworkSelector h3').click(function() {
                $(this).next().toggle('slow');
                return false;
            }).next().hide();
        });

    }

};
/** sets userId of currently logged in user
	@param {int} userId - user id of logged in user
*/
Wrapper.prototype.setUserId = function(userId) {

    this.userId = userId;

};


Wrapper.prototype.searchStation = function(event) {

    event.stopPropagation();
    var searchString = $('#search-string').val();

    if (searchString.length < 1) return;

    var searchRegex = new RegExp(searchString, 'i');
    var foundStations = [];

    for (var i = 0; i < this.networks.length; i++) {

        var stations = this.networks[i].stations;

        for (var j = 0; j < stations.length; j++) {


            var stationString = stations[j].network.name + ' ' + stations[j].name + ' ' + stations[j].abbr + ' ' + stations[j].id;

            if (stationString.match(searchRegex)) {

                foundStations.push(stations[j]);

            }
        }
    }
    $("#search-results").removeClass('hidden');
    $("#search-results").addClass('inuse');
    if (foundStations.length === 0) {
        $('#search-results').html('<h4>no stations found</h4>');
    } else {
        $('#search-results').html('');
        for (var i = 0; i < foundStations.length; i++) {

            $('#search-results').append('<h4 onclick="Master.highlightStation(' + foundStations[i].id + ')">' + foundStations[i].network.name + ' - ' + foundStations[i].name + '</h4>');
        }
    }
};

Wrapper.prototype.highlightStation = function(id) {

    for (var i = 0; i < this.networks.length; i++) {

        var stations = this.networks[i].stations;

        for (var j = 0; j < stations.length; j++) {

            if (stations[j].id == id) {

                this.map.setCenter(stations[j].getLocation());
                this.map.setZoom(7);
                google.maps.event.trigger(stations[j].marker.marker, 'click');
            }
        }
    }
};



Wrapper.prototype.activateValidationFunction = function() {

    this.validationButton = true;
    for (var i = 0; i < this.networks.length; i++) {

        this.networks[i].activateValidationFunction();

    }


};

/** adds an entry to the continent accordion in the main menu
	@param {object} networkObject - javascrip object of the network to be added
	@param {string} netColor - hexadecimal display color of the network
*/
Wrapper.prototype.addNetworksToAccordion = function(networkObject, netColor) {

    var id = networkObject.network_continent;
    document.getElementById(id).innerHTML = document.getElementById(id).innerHTML + '<div class="country_slider">\
	<div class="networkCheckbox"><input type="checkbox" name="Network" id="networkCheckbox_' + networkObject.networkID + '" value="' + networkObject.networkID + '" onclick=' + "'" + 'Master.toggleNetwork("' + networkObject.networkID + '")' + "'" + ' checked>\
	<label for="networkCheckbox_' + networkObject.networkID + '"></label></div> \
	<div class="Netbutton" onclick=' + "'" + 'Master.fitToNetwork("' + networkObject.networkID + '")' + "'" + '>' + networkObject.networkID + '</div>\
	<div class="netcolor" style="background-color:#' + netColor + '"></div>';
    if (document.getElementById(id).style.display == "none") {
        document.getElementById(id + "_header").style.display = '';
    }
};

/** toggles a networks visibility
	@param {string} network - network name
*/
Wrapper.prototype.toggleNetwork = function(network) {

    var net = this.getNetwork(network);
    net.toggle();
};

/** toggles visibility of all networks of a continent
	@param {string} continent - continent name
*/
Wrapper.prototype.toggleContinent = function(continent) {

    var continentId = "#" + continent.toLowerCase().replace(" ", "_") + "_checkbox";
    var continentVisible = $(continentId).prop('checked');
    for (var i = 0; i < this.networks.length; i++) {
        if (this.networks[i].networkContinent == continent) {
            if (!continentVisible) this.networks[i].hide();
            if (continentVisible) this.networks[i].show();

        }
    }
    $(continentId).attr('checked', continentVisible);
};
/** makes all networks of a continent visible, only used for reset when toggle is not sufficient
	@param {string} continent - continent name
*/
Wrapper.prototype.activateContinent = function(continent) {

    var continentId = "#" + continent.toLowerCase().replace(" ", "_") + "_checkbox";
    for (var i = 0; i < this.networks.length; i++) {
        if (this.networks[i].networkContinent == continent) {

            if (!this.networks[i].visible) this.networks[i].show();

        }
    }
    $(continentId).attr('checked', true);
};

/** checks if stations have data in date range for all networks
	@param {date} start - start of date range
	@param {date} end - end of date range
*/
Wrapper.prototype.checkStationsDateRange = function(start, end) {

    var startTime = start.getTime();
    var endTime = end.getTime();

    for (var i = 0; i < this.networks.length; i++) {

        if (this.networks[i].hasRecordsInDateRange(startTime, endTime)) {
            this.networks[i].showCorrectMarkers();
            this.networks[i].checkStationsForDataInDateRange(startTime, endTime);
        } else {
            this.networks[i].hideNetworkMarker();
            this.networks[i].hideStations();
        }
    }
};


/** selects all stations that lie withing the given bounds
	draws a rectangle around the selected area
	sets the menu input boxes to the correct coordinates and
	deactivates all stations that are not in the bounds
	@param {object} bounds - google.maps.LatLngBounds object
*/
Wrapper.prototype.selectFromMap = function(bounds) {

    var correctBounds = bounds;
    var swLng = correctBounds.getSouthWest().lng();
    var swLat = correctBounds.getSouthWest().lat();
    var neLng = correctBounds.getNorthEast().lng();
    var neLat = correctBounds.getNorthEast().lat();
    var midLng = (swLng + neLng) / 2; //mid Longitude is needed since google maps would automatically draw the shortest path wich may not be the selected one.

    if (swLng > neLng) {
        midLng = 180;
    }

    this.destroySelectedPolygon();
    this.selectedBounds = correctBounds;

    var polyCoords = [
        new google.maps.LatLng(swLat, swLng),
        new google.maps.LatLng(swLat, midLng),
        new google.maps.LatLng(swLat, neLng),
        new google.maps.LatLng(neLat, neLng),
        new google.maps.LatLng(neLat, midLng),
        new google.maps.LatLng(neLat, swLng),
        new google.maps.LatLng(swLat, swLng)
    ];


    this.selectedPolygon = new google.maps.Polygon({
        paths: polyCoords,
        strokeColor: "#0098cb",
        opacity: 1,
        strokeOpacity: 0.8,
        strokeWeight: 3,
        fillColor: "#FF0000",
        fillOpacity: 0,
        clickable: false
    });
    this.selectedPolygon.setMap(this.map);

    this.setMenuCoordinates();
    this.deactivateStationsInBounds(this.selectedBounds);

};

/** select an area on the map from manual user input
	includes primitive checks if the entered values are numeric and are not the whole globe
*/
Wrapper.prototype.selectBoundsFromInput = function() {

    $("#sw_lat").prop('value', $("#sw_lat").prop('value').replace(',', '.'));
    $("#sw_lng").prop('value', $("#sw_lng").prop('value').replace(',', '.'));
    $("#ne_lat").prop('value', $("#ne_lat").prop('value').replace(',', '.'));
    $("#ne_lng").prop('value', $("#ne_lng").prop('value').replace(',', '.'));


    if ($.isNumeric($("#sw_lat").prop('value')) && $.isNumeric($("#sw_lng").prop('value')) && $.isNumeric($("#ne_lat").prop('value')) && $.isNumeric($("#ne_lng").prop('value'))) {
        if ($("#sw_lat").prop('value') != '-180' || $("#sw_lng").prop('value') != '-90' || $("#ne_lat").prop('value') != '180' || $("#ne_lng").prop('value') != '90') {

            var bounds = new google.maps.LatLngBounds(new google.maps.LatLng($("#sw_lat").prop('value'), $("#sw_lng").prop('value')), new google.maps.LatLng($("#ne_lat").prop('value'), $("#ne_lng").prop('value')));
            this.selectFromMap(bounds);
            this.map.fitBounds(bounds);
        }

    }
};


/** set the menu input boxes to the selected coordinates
	or if nothing is selected to whole globe
*/
Wrapper.prototype.setMenuCoordinates = function() {
    var sw_lat;
    var sw_lng;
    var ne_lat;
    var ne_lng;
    if (this.selectedBounds !== undefined) {

        sw_lat = this.selectedBounds.getSouthWest().lat();
        sw_lng = this.selectedBounds.getSouthWest().lng();
        ne_lat = this.selectedBounds.getNorthEast().lat();
        ne_lng = this.selectedBounds.getNorthEast().lng();


    } else {

        sw_lat = '-180';
        sw_lng = '-90';
        ne_lat = '180';
        ne_lng = '90';

    }

    $("#sw_lat").prop('value', sw_lat);
    $("#sw_lng").prop('value', sw_lng);
    $("#ne_lat").prop('value', ne_lat);
    $("#ne_lng").prop('value', ne_lng);
};

/** reset all user input
	clear polygon selection
	check all continents
    set datepickers and slider to defaults
*/
Wrapper.prototype.reset = function() {

    this.clearRectangle();
    $("#date_end").datepicker('setDate', $("#date_end").datepicker("option", "defaultDate"));
    $("#date_from").datepicker('setDate', $("#date_from").datepicker("option", "defaultDate"));
    $("#date_end").trigger('change'); //fire the change event to reset the date slider
    this.activateContinent("Africa");
    this.activateContinent("Asia");
    this.activateContinent("Australia");
    this.activateContinent("Europe");
    this.activateContinent("North America");
    this.activateContinent("South America");


};

/** get a String of all the Networks that are selected for display in the Download window
 */
Wrapper.prototype.getCheckedNetworks = function() {

    var networksString = '';

    for (var i = 0; i < this.networks.length; i++) {

        if (this.networks[i].visible) networksString += this.networks[i].name + ', ';

    }

    return networksString.substring(0, networksString.length - 2);
};


/** create the download dialog and open it
 */
Wrapper.prototype.createDownloadDialog = function() {

    var _self = this;
    $("#download_dialog").dialog({
        autoOpen: false,
        height: 'auto',
        modal: true,
        closeText: 'x',
        width: 540,
        buttons: {
            "Download": function() {
                _self.downloadData();
            },
            "Close": function() {
                $(this).dialog("close");
            }
        }
    });

    var body = "You are about to Download the following data: <br><b>Networks:</b><br>" + this.getCheckedNetworks() + "<br> <b>in time range:</b><br>from " + $("#date_from").prop('value') + " until " + $("#date_end").prop('value');
    if (this.selectedBounds !== undefined) {

        body += '<br><b>in Area:</b><br> Latitude ' + this.selectedBounds.getSouthWest().lat() + '&deg; to ' + this.selectedBounds.getNorthEast().lat() + '&deg;<br>\
		Longitude ' + this.selectedBounds.getSouthWest().lng() + '&deg; to ' + this.selectedBounds.getNorthEast().lng() + '&deg;<br>';

    }
    body = body + '<br><b>Choose Format:</b><br> \
	<input type="radio" name="Format" value="CEOP-variable" checked> Variables stored in separate files (CEOP formatted) (zipped)\
	(<a href="http://www.ipf.tuwien.ac.at/insitu/index.php?option=com_content&view=article&id=67:ceop&catid=41" target="blank">View Specifications</a>)';
    body = body + '<br> <input type="radio" name="Format" value="own-format"> Variables stored in separate files (Header+values) (zipped)\
	(<a href="http://www.ipf.tuwien.ac.at/insitu/index.php?option=com_content&view=article&id=68:ceop&catid=41" target="blank">View Specifications</a>)';
    body = body + '<br> <input type="radio" name="Format" value="CEOP"> CEOP Reference Site Data Format (zipped) (Not recommended)\
	(<a href="http://www.ipf.tuwien.ac.at/insitu/index.php?option=com_content&view=article&id=66:ceop&catid=41" target="blank">View Specifications</a>)<br>';
    body = body + '&nbsp;<br><p align="center" class="notification">Please be aware that large data requests may require significant processing time. \
	If your request is not ready for download within 30 seconds you will receive an email with a link to the location from which the data can be downloaded after completion.</p>\
	<div id="sqlstatus" class="divformat" align="center"></div>';


    $("#download_dialog").html(body);

    $("#download_dialog").dialog("open");




};
/** Build download URL and request data from Server 
 */
Wrapper.prototype.downloadData = function() {

    $(":button:contains('Download')").prop("disabled", true).addClass("ui-state-disabled");
    $(":button:contains('Cancel')").prop("disabled", true).addClass("ui-state-disabled");
    var networksPostData = {
        "networks": this.getNetworksPhpString()
    };
    var formats = document.getElementsByName('Format');
    var gen;

    for (var i = 0; i < formats.length; i++) { //selected format determines which php-file will be called

        if (formats[i].checked) {
            switch (formats[i].value) {
                case 'CEOP':
                    gen = '../zip_v3.php';
                    break;
                case 'CEOP-variable':
                    gen = '../zip2_v3.php';
                    break;
                case 'own-format':
                    gen = '../zip_own_format_v3.php';
                    break;
            }

        }
    }


    var url = gen + '?start=' + $("#date_from").prop('value') + '&end=' + $("#date_end").prop('value') + '&user=' + this.userId; //request url
    if (this.selectedBounds !== undefined) {
        url += '&swlat=' + this.selectedBounds.getSouthWest().lat() + '&swlng=' + this.selectedBounds.getSouthWest().lng() + '&nelat=' + this.selectedBounds.getNorthEast().lat() + '&nelng=' + this.selectedBounds.getNorthEast().lng();
    }



    var myRequest = new Request({
        url: url,
        data: networksPostData,
        onSuccess: function(data) {

            if (data.slice(0, 5) != 'Error') { //no Error show link to zip file 
                //data "./temp/filename.zip"
                document.getElementById('sqlstatus').innerHTML = ' <br> <br><a href="../' + data + '">Download ' + data.slice(7) + '</a>';
            } else {
                //if Error -> show the error
                document.getElementById('sqlstatus').innerHTML = '<p style="color:red;">' + data + '</p>';
            }
            $(":button:contains('Cancel')").prop("disabled", false).removeClass("ui-state-disabled");

        },
        onRequest: function() { //show the loading gif while the php-script works

            loadingGif('sqlstatus');

        },
        onCancel: function() {

            document.getElementById('sqlstatus').innerHTML = 'Data preperation is taking more than 30 seconds.<br>You will recieve an email with your download link.';
            $(":button:contains('Cancel')").prop("disabled", false).removeClass("ui-state-disabled");

        }
    });
    myRequest.send();
    setTimeout(function() {
        myRequest.cancel();
    }, 29500); //after 30 seconds cancel the request and display email - send message

};

/** serialize network array so it can be sent to php via POST
 */
Wrapper.prototype.getNetworksPhpString = function() {

    var networksArray = [];

    for (var i = 0; i < this.networks.length; i++) {

        if (this.networks[i].visible) networksArray.push(this.networks[i].name);

    }

    return serializeStringArray(networksArray);

};

/** unset polygon and reset menu coordinates
 */
Wrapper.prototype.clearRectangle = function() {

    this.destroySelectedPolygon();
    this.setMenuCoordinates();

};

/** reset polygon and activate stations that were deactivated
 */
Wrapper.prototype.destroySelectedPolygon = function() {

    if (this.selectedPolygon !== undefined) {
        this.activateStationsInBounds(this.selectedBounds);
        this.selectedPolygon.setMap(null);
        this.selectedPolygon = undefined;
        this.selectedBounds = undefined;
    }

};

/** deactivate stations that are within given bounds
	@param {object} bounds - google.maps.LatLngBounds object
*/
Wrapper.prototype.deactivateStationsInBounds = function(bounds) {

    for (var i = 0; i < this.networks.length; i++) {
        if (this.networks[i].getExtent().intersects(bounds)) {
            this.networks[i].deactivateStationsInBounds(bounds);

        } else {
            this.networks[i].deactivateStations();
        }
    }

};

/** activate stations that are within given bounds
	@param {object} bounds - google.maps.LatLngBounds object
*/
Wrapper.prototype.activateStationsInBounds = function(bounds) {

    for (var i = 0; i < this.networks.length; i++) {
        if (this.networks[i].getExtent().intersects(bounds)) {
            this.networks[i].activateStationsInBounds(bounds);

        } else {
            this.networks[i].activateStations();
        }
    }

};

/** show ISMN and all Networks
 */
Wrapper.prototype.show = function() {

    for (var i = 0; i < this.networks.length; i++) {
        this.networks[i].show();
    }
    this.visible = true;
};

/** hide ISMN and all Networks
 */
Wrapper.prototype.hide = function() {

    for (var i = 0; i < this.networks.length; i++) {
        this.networks[i].hide();
    }
    this.visible = false;
};

/** get Network object
	@param {string} Network - name of network to return
*/
Wrapper.prototype.getNetwork = function(Network) {

    var index = this.networkNames.indexOf(Network);
    return this.networks[index];

};

/** show a certain Network
	@param {string} Network - name of network to show
*/
Wrapper.prototype.showNetwork = function(Network) {

    var index = this.networkNames.indexOf(Network);
    this.networks[index].show();
    this.visible = true;
};
/** hide a certain Network
	@param {string} Network - name of network to hide
*/
Wrapper.prototype.hideNetwork = function(Network) {

    var index = this.networkNames.indexOf(Network);
    this.networks[index].hide();
};
/** fit map to bounds of a network
	@param {string} Network - name of network to fit map to
*/
Wrapper.prototype.fitToNetwork = function(Network) {

    var index = this.networkNames.indexOf(Network);
    this.map.fitBounds(this.networks[index].getExtent());
    if (this.map.getZoom() < 3) {
        this.map.setZoom(3);
    }



};
