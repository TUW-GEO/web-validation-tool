
import validation_tool.server.data_request as rs_data
import geo_python.RS.processor.WARP.dgg.db_query as find_gp
import geo_python.RS.dataspecific.ECMWF.grid as era_grid
import pandas as pd

import cStringIO
import os
import json

from validation_tool import app
from flask import request
from flask import jsonify
from flask import make_response
from flask import render_template

png_buffer = cStringIO.StringIO()

from validation_tool.server.ismn import ismn_metadata
from validation_tool.server.ismn import variable_list
from validation_tool.server.ismn import get_station_data
from validation_tool.server.ismn import get_station_lonlat
from validation_tool.server.ismn import get_station_first_sm_layer
from validation_tool.server.data_request import get_validation_data
from validation_tool.server.data_request import get_validation_metadata


@app.route('/')
def validation_tool():
    if len(app.config['VALIDATION_DS']) == 0:
        activate_validation = False
    else:
        activate_validation = True
    return render_template('index.html', validation=activate_validation,
                           dataset_name="CCI SM")


@app.route('/getoptions')
def getoptions():
    """
    sends available scaling options to client
    """

    scaling_options = {'noscale': 'No scaling',
                       'linreg': 'Linear Regression',
                       'mean_std': 'Mean - standard deviation',
                       'min_max': 'Minimum,maximum',
                       'lin_cdf_match': 'Piecewise linear CDF matching',
                       'cdf_match': 'CDF matching'}

    # get available validation datasets
    validation_metadata = get_validation_metadata()

    data = jsonify({'scaling': scaling_options,
                    'validation_datasets': validation_metadata})
    resp = make_response(data)
    resp.headers['Access-Control-Allow-Origin'] = '*'
    return resp


@app.route('/getlatlon')
def getlatlon():
    pass
    """
    Parameters
    ----------
    lat: float
        latitude of point
    lon: float
        longitude of point
    """
    lat = float(request.args.get('lat'))
    lon = float(request.args.get('lon'))

    era_interim_grid = era_grid.load_ERAgrid()
    era_gpi, era_dist = era_interim_grid.find_nearest_gpi(lat, lon)
    era_lat, era_lon = era_interim_grid.gpi2lonlat(era_gpi)
    warp_gpi, warp_dist, warp_lat, warp_lon, lenght, cell = find_gp.find_nearest_gp(
        lat, lon, "warp_grid", lm_name='ind_ld')

    data = jsonify({'warp': {'gpi': warp_gpi[0],
                             'distance': '%.1f m' % warp_dist[0],
                             'lat': warp_lat[0],
                             'lon': warp_lon[0]},
                    'era': {'gpi': int(era_gpi), 'distance': '%.1f m' % era_dist[0],
                            'lat': float(era_lat), 'lon': float(era_lon)}})
    resp = make_response(data)
    resp.headers['Access-Control-Allow-Origin'] = '*'
    return resp


@app.route('/getdata')
def getdata():
    """
    handles the get request, which should contain the arguments listes under
    parameters

    Parameters
    ----------
    station_id: int
        id of station in database
    scaling: string
        chosen scaling method , for available choices see general.times_eries.scaling
    snow_depth: float
        mask snow depth greater than this value
    st_l1: float
        mask surface temperature layer1 lower than this value
    air_temp: float
        mask 2m air temperature lower than this value
    ssf_masking: boolean
        use SSF for masking true or false    
    """
    station_id = request.args.get('station_id')
    scaling = request.args.get('scaling')
    snow_depth = request.args.get('snow_depth')
    st_l1 = request.args.get('st_l1')
    air_temp = request.args.get('air_temp')
    ssf_masking = request.args.get('ssf_masking')
    ssf_dict = {'true': True, 'false': False}

    anomaly = request.args.get('anomaly')
    if anomaly == 'none':
        anomaly = None

    (depth_from,
     depth_to,
     sensor_id) = get_station_first_sm_layer(app.config['ISMN_PATH'],
                                             station_id)

    ismn_ts = get_station_data(app.config['ISMN_PATH'],
                               station_id,
                               "soil moisture",
                               depth_from, depth_to, sensor_id)

    lon, lat = get_station_lonlat(app.config['ISMN_PATH'],
                                  station_id)
    validation_data = get_validation_data(lon, lat)

    data, status = rs_data.compare_data(ismn_ts, validation_data,
                                        scaling,
                                        anomaly=anomaly)
    if status == -1:
        data = 'Error'
    else:
        data = jsonify(data)

    resp = make_response(data)
    resp.headers['Access-Control-Allow-Origin'] = '*'
    return resp


@app.route('/get_station_details')
def get_station_details():
    """Get the station details of the used ISMN data.

    If no metadata information exists then it will be generated the first time
    and the json file will be stored in the ismn data path.
    """
    json_path = os.path.join(app.config['ISMN_PATH'], 'ismn_metadata.json')
    if not os.path.exists(json_path):
        data = ismn_metadata(app.config['ISMN_PATH'])
        with open(json_path, 'w') as fid:
            json.dump(data, fid)

    with open(json_path, 'r') as fid:
        data = jsonify(json.load(fid))

    resp = make_response(data)
    resp.headers['Access-Control-Allow-Origin'] = '*'
    return resp


@app.route('/dataviewer_get_variable_list')
def get_variable_list():
    """
    Get variable list for a station id.
    """
    stationname = request.args.get('station_id')
    data = variable_list(app.config['ISMN_PATH'], stationname)
    data = jsonify(data)
    resp = make_response(data)
    resp.headers['Access-Control-Allow-Origin'] = '*'
    return resp


@app.route('/dataviewer_load_possible_timestamps')
def get_possible_timestamps():
    """
    Get possible timestamps for a station id.

    This defaults to returning hourly timestamps at the moment.
    """
    stationname = request.args.get('station_id')
    start = request.args.get('start')
    end = request.args.get('end')

    dr = pd.date_range(start, end, freq='H').to_pydatetime()
    l = map(lambda x: x.isoformat(), dr)

    resp = make_response(jsonify(dates=l))
    resp.headers['Access-Control-Allow-Origin'] = '*'
    return resp


@app.route('/dataviewer_load_variable')
def get_ismn_variable():
    """
    Get data for ismn variable.
    """
    stationname = request.args.get('station_id')
    start = request.args.get('start')
    end = request.args.get('end')
    depth_from = request.args.get('depth_from')
    depth_to = request.args.get('depth_to')
    sensor_id = request.args.get('sensor_id')
    variable = request.args.get('variable')
    ts = get_station_data(app.config['ISMN_PATH'],
                          stationname,
                          variable,
                          depth_from, depth_to, sensor_id)

    resp = make_response(ts.to_json(orient='split',
                                    date_format='iso'))
    resp.headers['Access-Control-Allow-Origin'] = '*'
    return resp
