
import validation_tool.server.data_request as rs_data
import geo_python.RS.processor.WARP.dgg.db_query as find_gp
import geo_python.RS.dataspecific.ECMWF.grid as era_grid

import cStringIO

from validation_tool import app
from flask import request
from flask import jsonify
from flask import make_response
from flask import render_template

png_buffer = cStringIO.StringIO()


@app.route('/')
def validation_tool():
    return render_template('ascat.html')


@app.route('/getoptions')
def getoptions():
    """
    sends available scaling options to client
    """

    scaling_options = {'noscale': 'No scaling',
                       'porosity': 'Scale using porosity',
                       'linreg': 'Linear Regression',
                       'mean_std': 'Mean - standard deviation',
                       'min_max': 'Minimum,maximum',
                       'lin_cdf_match': 'Piecewise linear CDF matching',
                       'cdf_match': 'CDF matching'}

    data = jsonify({'scaling': scaling_options})
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
    handles the get request, which should containt the arguments listes under
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
    station_id = int(request.args.get('station_id'))
    scaling = request.args.get('scaling')
    snow_depth = request.args.get('snow_depth')
    st_l1 = request.args.get('st_l1')
    air_temp = request.args.get('air_temp')
    ssf_masking = request.args.get('ssf_masking')
    ssf_dict = {'true': True, 'false': False}

    anomaly = request.args.get('anomaly')
    if anomaly == 'none':
        anomaly = None

    data, status = rs_data.get_data(station_id, scaling,
                                    mask={'snow_depth': float(snow_depth), 'st_l1': float(st_l1), 'air_temp': float(air_temp), 'use_ssf': ssf_dict[ssf_masking]}, anomaly=anomaly)
    if status == -1:
        data = 'Error'
    else:
        data = jsonify(data)

    resp = make_response(data)
    resp.headers['Access-Control-Allow-Origin'] = '*'
    return resp
