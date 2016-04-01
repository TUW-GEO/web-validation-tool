/** Responsible for the Dataviewer, loading of variable names and variable time series
  uses dygraph to display them and 3 select drop down menus to choose visible time series
  @author Christoph Paulik - christoph.paulik@geo.tuwien.ac.at
  @constructor
  @param {string} div - id of div the dataviewer is placed in
*/
function ISMNDataViewer(div){

  this.div=div;
  this.dygraphDiv=this.div+"_graph";
  this.labelsDiv=this.div+"_labels";
  this.selectorDiv=this.div+"_selector";
  this.informationDiv=this.div+"_info";
  this.loadingDiv=this.div+"_loading";

  this.selectedStation=-1;

    this.active=false;

    this.graph=null;

  this.variableList=[];	//list of variables

  this.labels=[];	//labes array constructed from variableNames

  this.data=[];	//data array for dygraph [[date,value,value...],[date,value,value...]]

  /*	raw data from database, contains dates array which includes all possible dates for the station and
    variables which themselves contain dates and values.
  */
  this.rawData={dates:[],variables:[]};


  this.displayed=[];	//boolean array showing if a loaded variable is currently displayed

  this.loaded=[];	//boolean array showing if a variable of variableList has already been loaded to the browser

  this.title='';


}

/** Clears all the data and deletes the graph and the div from the DOM
  called on closure of the dataviewer
*/
ISMNDataViewer.prototype.unset=function(){
  this.data=[];
  this.labels=[];
  this.rawData={dates:[],variables:[]};
  this.loaded=[];
  this.displayed=[];
  delete this.graph;
  this.graph=null;
  $('#'+this.div).remove();
}
/** Clears displayed data and labels but keeps rawData
  called when new variable from selector is selected so that a new
  data and labels array can be generated
*/
ISMNDataViewer.prototype.reset=function(){
  this.data=[];
  this.labels=[];
  this.displayed=[];
  for(var i=0;i<this.variableList.length;i++){
    this.displayed.push(false);
  }
}
/** clears all data, called when new time interval is loaded because other variables could be
  available in new time interval
*/
ISMNDataViewer.prototype.refresh=function(){
  this.data=[];
  this.labels=[];
  this.rawData={dates:[],variables:[]};
  this.loaded=[];
  this.displayed=[];
  loadingGif(this.loadingDiv);
  $('#'+this.loadingDiv).removeClass('hidden');
  this.loadVariableList();


}
/** opens the dataviewer populates the window with necessary html
  and loads the inital variableList
  @param {object} station - station object of calling parent
*/
ISMNDataViewer.prototype.openViewer=function(station){
  var _self=this;
  this.selectedStation=station;

  this.title='Dataviewer Station: '+this.selectedStation.name;
  $('body').append('<div id="'+this.div+'" title="'+this.title+'"></div>');



  this.dialog=$( "#"+this.div ).dialog({
      autoOpen: false,
    height: 'auto',
      modal: false,
    closeText:'x',
    width: 800,
    buttons: {
        "Refresh": function() {
          _self.refresh();
        },
        "Close": function() {
       _self.unset();
          $("#"+_self.div).dialog('destroy');

        }
      }
    });

  var body='<div id="'+this.loadingDiv+'" class="dv_loading"></div><div id="'+this.labelsDiv+'" style="width: 740px; height: 60px;"></div><div id="'+this.dygraphDiv+'" style="width:740px;height:345px;"></div>\
  <div class="dv_information">Drag an area to zoom in. Double click to zoom to whole date range. <br> Enter a number in the box to calculate a rolling average over the number of observations\
  (the data interval is hourly for most variables).</div><div id="'+this.selectorDiv+'" class="dv_information"></div>\
  <div id="'+this.informationDiv+'" class="dv_information">To see more data change the time interval on the left an press refresh.<br></div>'

  $('#'+this.div).html(body);

  $( "#"+this.div  ).on( "dialogopen", function( event, ui ) {
    loadingGif(_self.loadingDiv);	//show loadingGif upon opening of the dialog
  } );

  $("#"+this.div).dialog( "open" );
  _self.loadVariableList();

}
/** loads the variable list for the station and the selected dates in the menu
*/
ISMNDataViewer.prototype.loadVariableList=function(){
  var _self=this;

  $.getJSON('./dataviewer_get_variable_list',{station_id:this.selectedStation.id,start:$( "#date_from" ).prop('value'),end:$( "#date_end" ).prop('value')},function(data){

    _self.variableList=data.variables;

    //set time interval to available timeframe
    _self.maxTime=data.maxtime;
    $( "#date_end" ).prop('value',_self.maxTime);
    _self.minTime=data.mintime;
    $( "#date_from" ).prop('value',_self.minTime);
    //trigger change events to update date slider accordingly
    $( "#date_from" ).trigger('change');
    $( "#date_end" ).trigger('change');
    /*if data in the originally selected timeframe was not available the first year of available data is loaded
    and returned together with the new min/max time.
    */
    _self.originalTimeFrame=data.originalTimeFrameValid;

    //set dialog title
    $("#"+_self.div).dialog( "option", "title", _self.title+' from: '+_self.minTime+' to: '+_self.maxTime );

    /*	if variables where available then setup the correct length dislay,loaded and rawData variables
      and generate the time series select boxes.
      if not then show error messages
    */
    if(_self.variableList.length!=0){

      for(var i=0;i<_self.variableList.length;i++){

        _self.rawData.variables.push({dates:[],values:[]});
        _self.displayed.push(false);
        _self.loaded.push(false);

      }
      _self.generateTSSelector(_self.variableList.length);
      //load all timestamps that have data in between min and max time
      _self.loadPossibleTimestamps();
    }else{

      $('#'+_self.loadingDiv).addClass('hidden');
      if(_self.originalTimeFrame){
        $('#'+_self.dygraphDiv).html("<div class='dv_information'>No data available for the selected date range.</div>");
      }
      else{
        $('#'+_self.dygraphDiv).html("<div class='dv_information'>The date range was set to the last year of the data record but no valid data was found.</div>");
      }

    }



  });


}
/** generate on of the select boxes for selecting time series
  @param {int} number - number of the selector user in the id
*/
ISMNDataViewer.prototype.generateSingleTSSelector=function(number){

  var _self=this;

  var html='<select id="selector_'+number+'" name="dv_selector" class="dv_variable_selector">';
  html+='<option value="-1">none</option>';
  for(var i=0; i<this.variableList.length; i++){

    html+='<option value="'+i+'"';
    if(i==number)html+='selected';
    html+='>'+this.variableList[i].variableName+'</option>';

  }

  html+='</select><br>';
  $('#'+this.selectorDiv).append(html);

  $("#selector_"+number).change(function () {
    _self.displayVariablesFromSelector();
  });

}


/** generates 1 to 3 timeseries selectors depending on the number of available variables
  @param {int} numberOfVariables - if fewer than 3 also fewer seletors are generated
*/
ISMNDataViewer.prototype.generateTSSelector=function(numberOfVariables){

  $('#'+this.selectorDiv).html('<h1>Select variables to show in graph</h1>');

  for(var i=0; i<Math.min(numberOfVariables,3); i++){

    this.generateSingleTSSelector(i);

  }
}

/** displayes the first n variables. Where variableList.length <= n <= maxNumber
  @param {int} maxNumber - maximum number of variables to display
*/
ISMNDataViewer.prototype.displayStartingVariables=function(maxNumber){

  var variablesToLoad=Math.min(this.variableList.length,maxNumber);

  for (var i=0;i<variablesToLoad;i++){
    this.displayVariable(i);
  }

}

/** Displayes the variables that are currently selected in the select boxes
*/
ISMNDataViewer.prototype.displayVariablesFromSelector=function(){

  var _self=this;
  this.reset();
  $("select[name='dv_selector'] option:selected").each(function () {
            var variableIndex=$(this).val();

      if(variableIndex!=-1){
          _self.displayVariable(variableIndex);
      }
  });

}

/** Counts the datapoints of the displayed time series
  and shows an error message if none are present
  instead of an empty dataviewer
*/
ISMNDataViewer.prototype.checkDatapoints=function(){

  var points=0;
  for(var i=0;i<this.variableList.length;i++){
    if(this.displayed){
      points+=this.rawData.variables[i].values.length;

    }
  }
  if(points==0){

    $('#'+this.loadingDiv).html("<div class='dv_information'>The date range was set to the last year of the data record but no valid data was found.</div>");
    $('#'+this.loadingDiv).removeClass('hidden');
  }


}

/** loads the variable from the server if it was not loaded before
    and then shows the variable on the dataviewer
  @param {int} variableIndex - array index of the variable in variableList,data,displayed,loaded
*/
ISMNDataViewer.prototype.displayVariable=function(variableIndex){
  var _self=this;

  if(this.loaded[variableIndex]!=true){
    $('#'+this.loadingDiv).removeClass('hidden');
      $.getJSON('./dataviewer_load_variable',{station_id:this.selectedStation.id,
                                              start:this.minTime,
                                              end:this.maxTime,
                                              depth_from:this.variableList[variableIndex].depthFrom,
                                              depth_to:this.variableList[variableIndex].depthTo,
                                              sensor_id:this.variableList[variableIndex].sensorId,
                                              variable:this.variableList[variableIndex].quantityName},
                function(data){
        dates=data.index;
        values=data.data;

        _self.rawData.variables[variableIndex].dates=dates;
        _self.rawData.variables[variableIndex].values=values;
        _self.loaded[variableIndex]=true;
        _self.showVariable(variableIndex);
    });
  }
  else{
    this.showVariable(variableIndex);
  }
}

/** Loads all possible timestamps of data in time interval
*/
ISMNDataViewer.prototype.loadPossibleTimestamps=function(){
  var _self=this;

    $.getJSON('./dataviewer_load_possible_timestamps',{station_id:this.selectedStation.id,start:this.minTime,end:this.maxTime},function(data){
        dates=data.dates;
        _self.rawData.dates=dates;
        _self.displayStartingVariables(3);
    });



}

/** displays the data on the dataviewer
  adds the data to the data array and updates the dygraph
  @param {int} variableIndex - array index of the variable in variableList,data,displayed,loaded
*/
ISMNDataViewer.prototype.showVariable=function(variableIndex){

    //only do something if data not already on dataviewer
    if(!this.displayed[variableIndex]){
      var d=[];
      var values=this.rawData.variables[variableIndex].values;

      //if no data is loaded
      if(this.data.length==0){

        // if dygraph does not yet exist initialize it with dummy data
        if(this.graph==null){
          this.graph=new Dygraph(document.getElementById(this.dygraphDiv),[[0,0],[0,1]],{showRoller:true,labelsDiv:this.labelsDiv,labelsSeparateLines: true,connectSeparatedPoints:true,legend:'always'});
        }

        //setup first column of data array with all possible dates
        var dates=this.rawData.dates;

        for(var i=0;i<dates.length;i++){
          var value=parseFloat(values[i])
          if(isNaN(value))value=null;
          d.push([new Date(dates[i])]);
        }
        this.labels.push('Date');
        this.data=d;
      }


        d=this.data;

        var dates=this.rawData.variables[variableIndex].dates;

        /*	if timeseries are the same length they match up element for element because
          the dates cover all datasets in the time interval
        */
        if(d.length==values.length){

          for(var i=0;i<values.length;i++){
            var value=parseFloat(values[i])
            if(isNaN(value))value=null;
            d[i].push(value);
          }

        }
        else{
            /*if the time series to add has a different number of elements every elements date
              is checked against the list of all dates and the values are inserted in the correct place
            */

            var usedValues=0;

            for(var i=0;i<d.length;i++){

              var date=new Date(dates[usedValues]);
              if(date.getTime()!=d[i][0].getTime()){
                d[i].push(null);
                continue;
              }

              var value=parseFloat(values[usedValues])
              if(isNaN(value))value=null;
              d[i].push(value);
              usedValues++;
            }

          }




        //labels are constructed and the graph is updated with the new data
        this.labels.push(this.variableList[variableIndex].variableName);
        this.data=d;

        this.checkDatapoints();
        if(this.data.length!=0){
          this.graph.updateOptions({'file':this.data,
            labels: this.labels});
            }
        this.displayed[variableIndex]=true;
        $('#'+this.loadingDiv).addClass('hidden');
      }

}
