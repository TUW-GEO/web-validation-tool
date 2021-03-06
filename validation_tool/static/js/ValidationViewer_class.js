function ValidationViewer(div) {

    this.div = "dv_" + div;
    this.compareWith = 'CCI';

    this.graphDiv = this.div + "_graph";
    this.labelsDiv = this.div + "_labels";
    this.selectorDiv = this.div + "_selector";
    this.informationDiv = this.div + "_info";
    this.loadingDiv = this.div + "_loading";

    this.selectedStation = -1;

    this.active = false;

    this.graph = null;
    this.clim_graph = null;
    this.avg_graph = null;
    this.masking_graph = null;
    this.title = '';

    this.satGpi = null;
    this.satCell = null;

    this.data = null;

    this.counter = 0;

    this.standard_snow_depth = 0;
    this.standard_st_l1 = 0;
    this.standard_air_temp = 0;
    this.standard_ssf_masking = true;
    this.anomaly = 'none';

    this.absolute_corr = 0;
    this.clim_corr = 0;
    this.anom_corr = 0;


    this.warpIcon = new google.maps.MarkerImage('./static/images/cross_marker.png',
        new google.maps.Size(25, 25),
        new google.maps.Point(0, 0),
        new google.maps.Point(12, 12));

    this.eraIcon = new google.maps.MarkerImage('./static/images/cross_marker_red.png',
        new google.maps.Size(25, 25),
        new google.maps.Point(0, 0),
        new google.maps.Point(12, 12));
}



/** Clears all the data and deletes the graph and the div from the DOM
	called on closure of the dataviewer
*/
ValidationViewer.prototype.unset = function() {
    this.graph = null;
    this.masking_graph = null;
    $('#' + this.div).remove();
};

/** clears all data, called when new time interval is loaded because other variables could be
	available in new time interval
*/
ValidationViewer.prototype.refresh = function() {
    this.insituData = [];
    this.labels = [];
    this.variableList = [];
    this.matchedData = {
        dates: [],
        values: []
    };
    this.correlation = [];
    this.loaded = [];
    this.displayed = [];
    loadingGif(this.loadingDiv);
    $('#' + this.loadingDiv).removeClass('hidden');
    this.loadVariableList();


};


ValidationViewer.prototype.openViewer = function(station) {
    var _self = this;

    $(document).tooltip({
        track: true,
        disabled: false
    });

    this.window_width = $(window).width();
    this.toolbox_width = (1024 < this.window_width - 200) ? this.window_width - 200 : 1024;
    this.graph_width = this.toolbox_width - 519;

    $('#toolbox_container').css('left', '-' + this.toolbox_width + 'px');
    $('#toolbox_container').css('width', this.toolbox_width + 'px');

    this.selectedStation = station;
    Master.selectedStation = station;
    this.title = 'Validation of Station: ' + this.selectedStation.name + ' with ' + this.compareWith;
    $('#station_info_container').addClass("station_info_container_active");
    $('#small_info_map_canvas').show();
    $('#station_info_area').show();
    $('#station_info_area').addClass('station_info_area_active');
    $('#validation_window').removeClass("validation_window_inactive");
    $('#validation_window').addClass("validation_window_active");
    $('#map_overlay').fadeIn(1000, function() {
        //$('#map_canvas').css('display','none');

        google.maps.event.trigger(Master.info_map, 'resize');
        Master.info_map.setCenter(Master.selectedStation.getLocation());

    });

    $('#toolbox_container').animate({
        left: '0'
    }, 1000);

    $("#close_button").bind('click', function(event) {

        _self.standard_snow_depth = 0;
        _self.standard_st_l1 = 0;
        _self.standard_air_temp = 0;
        _self.standard_ssf_masking = true;
        _self.anomaly = 'none';
        _self.graph = null;
        _self.clim_graph = null;
        _self.avg_graph = null;
        _self.masking_graph = null;
        $( "#tabs" ).tabs( "destroy" );

        $("#loading_button").unbind('click');
        $("#anomalies_clim").unbind('click');
        $("#absolute").unbind('click');
        $("#anomalies_average").unbind('click');

        $('#help_div').fadeOut();

        event.preventDefault();
        $('#toolbox_container').animate({
            left: '-' + _self.toolbox_width
        }, 1000, function() {

            $('#station_info_container').removeClass("station_info_container_active");
            $('#small_info_map_canvas').hide();
            $('#station_info_area').hide();
            $('#station_info_area').removeClass('station_info_area_active');
            $('#validation_window').addClass("validation_window_inactive");
            $('#validation_window').removeClass("validation_window_active");
            $('#Results').html('');
            $('#map_overlay').fadeOut();

        });


        _self.marker.hide();
        _self.warpMarker.setMap(null);
        _self.eraMarker.setMap(null);
        $(document).tooltip({
            track: true,
            disabled: true
        });
        $("#close_button").unbind('click');


    });
    $('#station_info_area').html('');

    $('#station_info_area').append(this.selectedStation.htmlInfo);

    $('#station_info_area').append('<div id="hsaf_system_container"><h1>H-SAF assessment criterion</h1><br><select class="hidden" data-target="0" id="hsaf_system"></select></div>');

    var goal = 1.01;
    var step = 0.05;

    for (var value = 0; value <= goal; value = value + step) {

        $('#hsaf_system').append('<option value="' + Math.round(value * 100) / 100 + '">' + Math.round(value * 100) / 100 + '</option>');

    }

    $('#hsaf_system option[value="0.5"]').attr('selected', 'selected');


    $('select#hsaf_system').bulletGraph({
        width: 230,
        height: 40,
        ranges: ['0%', '50%', '65%', '80%', '100%'],
        rangesLabels: ['', '', '', ''],
        rangesTitles: ['low', 'threshold', 'target', 'optimal'],
        customColors: true,
        colors: ['#cccccc', '#ff0000', '#ffff00', '#409300'],
        showTicks: true,
        nTick: 2,
        showLegend: true,
        legendTitle: 'Pearsons r',
        sliderOptions: {
            disabled: true
        }
    });


    this.marker = new ISMNMarker(Master.info_map,
                                 station.getLocation(),
                                 station.network.color,
                                 true,
                                 station.network.name + "-" + station.name);
    this.marker.show();

    var station_location = station.getLocation();


    $.getJSON('getlatlon', {
        lat: station_location.lat(),
        lon: station_location.lng()
    }, function(gridpoints) {

        _self.warpMarker = new google.maps.Marker({
            position: new google.maps.LatLng(gridpoints.warp.lat, gridpoints.warp.lon),
            map: Master.info_map,
            icon: _self.warpIcon,
            title: 'Nearest ASCAT gpi ' + gridpoints.warp.gpi + ' Distance: ' + gridpoints.warp.distance
        });

        _self.eraMarker = new google.maps.Marker({
            position: new google.maps.LatLng(gridpoints.era.lat, gridpoints.era.lon),
            map: Master.info_map,
            icon: _self.eraIcon,
            title: 'Nearest ERA Interim gpi ' + gridpoints.era.gpi + ' Distance: ' + gridpoints.era.distance
        });

        $('#station_info_area').prepend('<h2>Nearest ASCAT grid point (black)</h2> gpi: ' + gridpoints.warp.gpi + '<br> Distance: ' + gridpoints.warp.distance + '<br>\
									<h2>Nearest ERA Interim grid point (red)</h2> gpi: ' + gridpoints.era.gpi + '<br> Distance: ' + gridpoints.era.distance);




    });

    this.buildViewer();

};


ValidationViewer.prototype.buildViewer = function() {


    var _self = this;
    $.getJSON('getoptions', function(options) {

        $('#tabs').tabs();
        $('#tabs').tabs('enable', '#absolute');
        $('#masking-tabs').tabs();
        $('input:radio[name=scaling_selector][value='+ options.default_scaling +']').prop('checked', true);
        _self.standard_scaling = options.default_scaling;

        loadingGif('masking_data');
        loadingGif('scaled_data');

        $(".numeric").numeric();

        $("#loading_button").bind('click', function(event) {
            event.preventDefault();
            _self.standard_scaling = $('input:radio[name=scaling_selector]:checked').val();
            var graph_div = 'scaled_data';

            if (_self.anomaly !== 'none') {
                graph_div += '_' + _self.anomaly;
            }
            loadingGif(graph_div);
            loadingGif('masking_data');
            _self.clim_graph = null;
            _self.avg_graph = null;
            _self.graph = null;
            _self.masking_graph = null;
            _self.loadData(_self.standard_scaling,
                           _self.anomaly, false);

        });

        $("#anomalies_clim").bind('click', function(event) {
            event.preventDefault();
            _self.anomaly = 'climatology';
            if (_self.clim_graph === null) {
                loadingGif('scaled_data_climatology');
                _self.loadData(_self.standard_scaling,
                    _self.anomaly,
                    true);
            } else {
                _self.hideHSAFTarget();
            }


        });


        $("#absolute").bind('click', function(event) {
            event.preventDefault();
            _self.anomaly = 'none';
            if (_self.graph === null) {
                loadingGif('scaled_data');
                _self.loadData(_self.standard_scaling,
                    _self.anomaly,
                    true);
            } else {
                _self.setHSAFTarget(_self.absolute_corr);
            }
        });

        $("#anomalies_average").bind('click', function(event) {
            event.preventDefault();
            _self.anomaly = 'average';
            if (_self.avg_graph === null) {
                loadingGif('scaled_data_average');
                _self.loadData(_self.standard_scaling,
                    _self.anomaly,
                    true);
            } else {
                _self.hideHSAFTarget();
            }
        });
        _self.loadData(_self.standard_scaling,
            _self.anomaly,
            false);

    });
};



ValidationViewer.prototype.loadData = function(scaling, anomaly, add_only) {

    var _self = this;
    var data_div = 'scaled_data';
    var label_div = 'scaled_data_labels';
    var ticker_function_abs = function(min, max, pixels, opts, dygraph, vals) {
        return [{
            v: 2,
            label: '0'
        }, {
            v: 20.0,
            label: '20'
        }, {
            v: 40.0,
            label: '40'
        }, {
            v: 60.0,
            label: '60'
        }, {
            v: 80,
            label: '80'
        }, {
            v: 98.0,
            label: '100'
        }];
    };

    var axis_settings = {
        ticker: ticker_function_abs
    };


    if (anomaly !== 'none') {

        data_div = data_div + '_' + anomaly;
        label_div = label_div + '_' + anomaly;
    }
    var checked_masking_ds = [];
    var masking_operator = [];
    var masking_values = [];
    $("input[name='masking_ds_selector']").each(function(index) {
        if(this.checked){
            checked_masking_ds.push(this.value);
            masking_operator.push($("select[name='"+this.value+"']").val());
            masking_values.push($("input[name='"+this.value+"']").val());
        }
    });


    $.getJSON('getdata', {
        station_id: this.selectedStation.id,
        scaling: scaling,
        masking_ds : checked_masking_ds,
        masking_op : masking_operator,
        masking_values : masking_values,
        anomaly: anomaly
    }, function(data) {
        if (!add_only) {
            _self.counter = _self.counter + 1;
        }
        _self.data = data;

        for (var i = 0; i < data.validation_data.data.length; i++) {
            data.validation_data.data[i][0] = new Date(data.validation_data.data[i][0]);
        }
        for (var i = 0; i < data.masking_data.data.length; i++) {
            data.masking_data.data[i][0] = new Date(data.masking_data.data[i][0]);
        }


        var self = this;

        _self.masking_graph = new Dygraph(document.getElementById('masking_data'), data.masking_data.data, {
            labels: data.masking_data.labels,
            labelsDiv: 'masking_data_labels',
            labelsSeparateLines: true,
            connectSeparatedPoints: true,
            legend: 'always',
            drawPoints: true,
            ylabel: 'Temperature [&deg;C]',
            colors: ['#04396C', '#A63100', '#FF9D73'],
            zoomCallback: function(minDate, maxDate, yRanges) {

                if (_self.graph !== null) _self.graph.updateOptions({
                    dateWindow: [minDate, maxDate]
                });
                if (_self.avg_graph !== null) _self.avg_graph.updateOptions({
                    dateWindow: [minDate, maxDate]
                });
                if (_self.clim_graph !== null) _self.clim_graph.updateOptions({
                    dateWindow: [minDate, maxDate]
                });
            }

        });

        if (data.settings.scaling === 'No scaling') {

            this.graph = new Dygraph(document.getElementById(data_div), data.validation_data.data, {
                labels: data.validation_data.labels,
                labelsDiv: label_div,
                labelsSeparateLines: true,
                connectSeparatedPoints: true,
                legend: 'always',
                'CCI_SSM': {
                    axis: {}
                },
                axes: {
                    y: {
                    },
                    y2: axis_settings
                },
                drawPoints: true,
                ylabel: 'soil moisture [m&sup3;/m&sup3;]',
                y2label: 'CCI SSM [%]',
                //title:'soil moisture data',
                colors: ['#409300', '#5791B4'],
                zoomCallback: function(minDate, maxDate, yRanges) {

                    _self.masking_graph.updateOptions({
                        dateWindow: [minDate, maxDate]
                    });
                    if (anomaly === 'climatology') {

                        if (_self.graph !== null) _self.graph.updateOptions({
                            dateWindow: [minDate, maxDate]
                        });
                        if (_self.avg_graph !== null) _self.avg_graph.updateOptions({
                            dateWindow: [minDate, maxDate]
                        });
                    }
                    if (anomaly === 'average') {

                        if (_self.graph !== null) _self.graph.updateOptions({
                            dateWindow: [minDate, maxDate]
                        });
                        if (_self.clim_graph !== null) _self.clim_graph.updateOptions({
                            dateWindow: [minDate, maxDate]
                        });
                    }
                    if (anomaly === 'none') {
                        if (_self.avg_graph !== null) _self.avg_graph.updateOptions({
                            dateWindow: [minDate, maxDate]
                        });
                        if (_self.clim_graph !== null) _self.clim_graph.updateOptions({
                            dateWindow: [minDate, maxDate]
                        });
                    }

                }


            });

        } else {

            this.graph = new Dygraph(document.getElementById(data_div), data.validation_data.data, {
                labels: data.validation_data.labels,
                labelsDiv: label_div,
                labelsSeparateLines: true,
                connectSeparatedPoints: true,
                legend: 'always',
                axes: {
                    y: {
                    }
                },
                drawPoints: true,
                ylabel: 'soil moisture [m&sup3;/m&sup3;]',
                //title:'soil moisture data',
                colors: ['#409300', '#5791B4'],
                zoomCallback: function(minDate, maxDate, yRanges) {

                    _self.masking_graph.updateOptions({
                        dateWindow: [minDate, maxDate]
                    });
                    if (anomaly === 'climatology') {

                        if (_self.graph !== null) _self.graph.updateOptions({
                            dateWindow: [minDate, maxDate]
                        });
                        if (_self.avg_graph !== null) _self.avg_graph.updateOptions({
                            dateWindow: [minDate, maxDate]
                        });
                    }
                    if (anomaly === 'average') {

                        if (_self.graph !== null) _self.graph.updateOptions({
                            dateWindow: [minDate, maxDate]
                        });
                        if (_self.clim_graph !== null) _self.clim_graph.updateOptions({
                            dateWindow: [minDate, maxDate]
                        });
                    }
                    if (anomaly === 'none') {
                        if (_self.avg_graph !== null) _self.avg_graph.updateOptions({
                            dateWindow: [minDate, maxDate]
                        });
                        if (_self.clim_graph !== null) _self.clim_graph.updateOptions({
                            dateWindow: [minDate, maxDate]
                        });
                    }
                }


            });


        }

        if (anomaly === 'climatology') {

            _self.clim_graph = this.graph;
            _self.clim_corr = data.statistics.pearson.v;
            var graph_header_string = '<h1>Anomalies calculated from climatology</h1>';
            _self.hideHSAFTarget();
        }
        if (anomaly === 'average') {

            _self.avg_graph = this.graph;
            _self.anom_corr = data.statistics.pearson.v;
            var graph_header_string = '<h1>Anomalies calculated from 35 day moving window</h1>';
            _self.hideHSAFTarget();
        }
        if (anomaly === 'none') {

            _self.graph = this.graph;
            _self.absolute_corr = data.statistics.pearson.v;
            var graph_header_string = '<h1>Absolute values</h1>';
            _self.setHSAFTarget(data.statistics.pearson.v);
        }

        var settings_string = '<h1>Filtered measurements for:</h1>';
        $.each(data.settings.masking, function(i, v) {
            settings_string += v.name + " " + v.op + " " + v.val + "<br>";
        });
        settings_string += "<br> <h1>Scaling: </h1> " + data.settings.scaling;

        if (!add_only) {
            $('#Results').prepend('<div id="result' + _self.counter + '" class="result_frame ui-corner-all"><div class="results_text">' + settings_string + '</div><br><div class="graph_frame"><div id="scatter_stat_div' + _self.counter + '">\
			</div></div></div>');
        }


        var bias_string = data.statistics.bias + ' m<sup>3</sup>/m<sup>3</sup>';
        var rmsd_string = data.statistics.rmsd.rmsd + ' m<sup>3</sup>/m<sup>3</sup>';
        var rmsd_components = '\
						' + data.statistics.rmsd.rmsd_corr + ' | ' + data.statistics.rmsd.rmsd_bias + ' | \
						' + data.statistics.rmsd.rmsd_var + ' m<sup>3</sup>/m<sup>3</sup>';
        var mse_string = data.statistics.mse.mse + ' = ' + data.statistics.mse.mse_corr + ' + ' + data.statistics.mse.mse_bias + '\
						+ ' + data.statistics.mse.mse_var + '  m<sup>6</sup>/m<sup>6</sup>';

        if (data.settings.scaling === 'No scaling') {
            bias_string = 'not meaningful';
            rmsd_string = 'not meaningful';
            mse_string = 'not meaningful';


        }

        $('#scatter_stat_div' + _self.counter).append('<div class="step_frame">' + graph_header_string + '<div class="scatterplot" id="scatterplot_' + anomaly + '_' + _self.counter + '"></div>\
		<div class="statistics">\
		<table class="popup"><thead><tr><th>Metric</th><th>Value</th></tr></thead>\
		<tr><td>Spearmans rank correlation rho (p)</td><td>' + data.statistics.spearman.v + ' (' + data.statistics.spearman.p + ')</td></tr>\
		<tr><td>Kendalls rank correlation tau (p)</td><td>' + data.statistics.kendall.v + ' (' + data.statistics.kendall.p + ')</td></tr>\
		<tr><td>Pearsons product-moment correlation r (p)</td><td>' + data.statistics.pearson.v + ' (' + data.statistics.pearson.p + ')</td></tr>\
		<tr><td>Bias </td><td>' + bias_string + '</td></tr><tr><td>RMSD = \
		&radic;<span style="text-decoration:overline;">&nbsp;MSE&nbsp;</span> </td><td> ' + rmsd_string + '</td></tr>\
		<tr><td>RMSD_corr | RMSD_bias | RMSD_var</td><td>' + rmsd_components + '</td></tr>\
		<tr><td>MSE = MSE_corr + MSE_bias + MSE_var <a href="" name="mse_help" class="button help_button">?</a></td><td>' + mse_string + '</td></tr></table></div></div>');


        $("[name='mse_help']").bind('click', function(event) {
            event.preventDefault();
            $("#help_div_content").html('<iframe class="help_iframe" src="static/help/Mean Square Error MSE_valtool.htm"></iframe>');
            $("#help_div").fadeIn();
        });

        //$('#result'+_self.counter).hide();
        $('#result' + _self.counter).fadeIn();

        _self.drawScatter('scatterplot_' + anomaly + '_' + _self.counter);

    });
};

ValidationViewer.prototype.setHSAFTarget = function(corr) {
    this.showHSAFTarget();
    $('#target').animate({
        left: Math.round(corr * 100) + '%'
    }, 1000);
    $('#target').attr('title', corr);

};


ValidationViewer.prototype.hideHSAFTarget = function() {
    $('#target').animate({
        left: Math.round(0 * 100) + '%'
    }, 1000);
    $('#target').attr('title', '');
    $('#target').fadeOut();

};

ValidationViewer.prototype.showHSAFTarget = function() {
    $('#target').fadeIn();

};



ValidationViewer.prototype.drawScatter = function(div) {

    _self = this;
    var margin = {
            top: 20,
            right: 20,
            bottom: 30,
            left: 40
        },
        width = 250 - margin.left - margin.right,
        height = 250 - margin.top - margin.bottom;

    var x = d3.scale.linear()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);

    var color = d3.scale.category10();

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .ticks(5);

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")
        .ticks(5);
    var canvas = d3.select("#" + div);

    var svg = canvas.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


    x.domain(d3.extent(_self.data.validation_data.data, function(d) {
        return d[1];
    })).nice();
    y.domain(d3.extent(_self.data.validation_data.data, function(d) {
        return d[2];
    })).nice();

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
        .append("text")
        .attr("class", "label")
        .attr("x", width)
        .attr("y", -6)
        .style("text-anchor", "end")
        .text(_self.data.validation_data.labels[1]);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("class", "label")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".7em")
        .style("text-anchor", "end")
        .text(_self.data.validation_data.labels[2]);

    svg.selectAll(".dot")
        .data(_self.data.validation_data.data)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("r", 1.5)
        .attr("cx", function(d) {
            return x(d[1]);
        })
        .attr("cy", function(d) {
            return y(d[2]);
        })
        .style('fill', '#409300');

    var xdomain = x.domain();
    var ydomain = y.domain();

    svg.append("line")
        .attr("class", "oneoneline")
        .attr("x1", x(Math.max(ydomain[0], xdomain[0])))
        .attr("y1", y(Math.max(ydomain[0], xdomain[0])))
        .attr("x2", x(Math.min(ydomain[1], xdomain[1])))
        .attr("y2", y(Math.min(ydomain[1], xdomain[1])));

    this.svg = svg;
    var legend = svg.selectAll(".legend")
        .data(color.domain())
        .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) {
            return "translate(0," + i * 20 + ")";
        });

    legend.append("rect")
        .attr("x", width - 18)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", color);

    legend.append("text")
        .attr("x", width - 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(function(d) {
            return d;
        });
};
