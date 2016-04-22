
import validation_tool.server.data_request as rs_data
import pandas as pd
import numpy as np

import cStringIO
import os
import json
import operator

from pytesmo.validation_framework.validation import Validation
from pytesmo.validation_framework.metric_calculators import BasicMetricsPlusMSE
from pytesmo.validation_framework.temporal_matchers import BasicTemporalMatching
from pytesmo.validation_framework.data_manager import DataManager

from validation_tool import app
from flask import request
from flask import jsonify
from flask import make_response
from flask import render_template

png_buffer = cStringIO.StringIO()

from validation_tool.server.ismn import ismn_metadata
from validation_tool.server.ismn import variable_list
from validation_tool.server.ismn import get_station_data
from validation_tool.server.ismn import prepare_station_interface
from validation_tool.server.ismn import get_station_lonlat
from validation_tool.server.ismn import get_station_first_sm_layer
from validation_tool.server.ismn import get_station_start_end
from validation_tool.server.data_request import get_validation_ds_dict
from validation_tool.server.data_request import get_validation_metadata
from validation_tool.server.data_request import get_masking_metadata
from validation_tool.server.data_request import get_masking_data

from validation_tool.server.data_request import get_masking_ds_dict
from validation_tool.server.datasets import MaskingAdapter


@app.route('/')
def validation_tool():
    if len(app.config['VALIDATION_DS']) == 0:
        activate_validation = False
    else:
        activate_validation = True
    return render_template('index.html',
                           validation=activate_validation,
                           dataset_name="CCI SM",
                           scaling_options=app.config['SCALING_OPTIONS'],
                           default_scaling='cdf_match',
                           val_ds=get_validation_metadata(),
                           masking_ds=get_masking_metadata(),
                           default_val_ds=app.config['DEFAULT_VAL_DS'])


@app.route('/getoptions')
def getoptions():
    """
    sends available scaling options to client
    """
    # get available validation datasets
    validation_metadata = get_validation_metadata()

    data = jsonify({'scaling': app.config['SCALING_OPTIONS'],
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

    resp = make_response(jsonify({}))
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
    if scaling == 'noscale':
        scaling = None
    masking_ids = request.args.getlist('masking_ds[]')
    masking_ops = request.args.getlist('masking_op[]')
    masking_values = request.args.getlist('masking_values[]')
    masking_values = [float(x) for x in masking_values]

    anomaly = request.args.get('anomaly')
    if anomaly == 'none':
        anomaly = None

    (depth_from,
     depth_to,
     sensor_id) = get_station_first_sm_layer(app.config['ISMN_PATH'],
                                             station_id)
    lon, lat = get_station_lonlat(app.config['ISMN_PATH'],
                                  station_id)
    start, end = get_station_start_end(app.config['ISMN_PATH'],
                                       station_id, "soil moisture",
                                       depth_from, depth_to)
    period = [start, end]

    masking_data = {'labels': [], 'data': []}
    masking_masked_dict = None
    if len(masking_ids) > 0:
        # prepare masking datasets
        masking_ds_dict = get_masking_ds_dict(masking_ids)
        op_lookup = {'<': operator.lt,
                     '<=': operator.le,
                     '==': operator.eq,
                     '>=': operator.ge,
                     '>': operator.gt}
        masking_masked_dict = {}
        for masking_ds, masking_op, masking_value in zip(masking_ids,
                                                         masking_ops,
                                                         masking_values):

            masking_masked_dict[masking_ds] = dict(masking_ds_dict[masking_ds])
            new_cls = MaskingAdapter(masking_masked_dict[masking_ds]['class'],
                                     op_lookup[masking_op],
                                     masking_value)
            masking_masked_dict[masking_ds]['class'] = new_cls

        # use DataManager for reading masking datasets
        masking_dm = DataManager(masking_ds_dict, masking_ids[0],
                                 period=period)
        masking_data = {}
        for mds in masking_ids:
            masking_data[mds] = masking_dm.read_ds(mds, lon, lat)
        if len(masking_ids) > 1:
            masking_data = BasicTemporalMatching().combinatory_matcher(masking_data, len(mds))
        else:
            masking_data = masking_data[masking_ids[0]]

        labels, values = masking_data.to_dygraph_format()

        masking_data = {'labels': labels, 'data': values}

    ismn_iface = prepare_station_interface(app.config['ISMN_PATH'],
                                           station_id,
                                           "soil moisture",
                                           depth_from, depth_to, sensor_id)

    validation_ds_dict = get_validation_ds_dict()
    validation_ds_dict.update({'ISMN': {'class': ismn_iface,
                                        'columns': ['soil moisture']}})
    mcalc = BasicMetricsPlusMSE(other_name='k1',
                                calc_tau=True).calc_metrics
    process = Validation(validation_ds_dict, 'ISMN',
                         temporal_ref='cci',
                         scaling=scaling,
                         metrics_calculators={(2, 2): mcalc},
                         masking_datasets=masking_masked_dict,
                         period=period,
                         temporal_window=1)

    df_dict = process.data_manager.get_data(1,
                                            lon,
                                            lat)

    matched_data, result, used_data = process.perform_validation(
        df_dict, (1, lon, lat))

    res_key = list(result)[0]
    data = used_data[res_key]
    result = result[res_key][0]

    # rename data to original names
    rename_dict = {}
    f = lambda x: "k{}".format(x) if x > 0 else 'ref'
    for i, r in enumerate(res_key):
        rename_dict[f(i)] = " ".join(r)

    data.rename(columns=rename_dict, inplace=True)

    labels, values = data.to_dygraph_format()

    validation_datasets = {'labels': labels, 'data': values}

    statistics = {'kendall': {'v': '%.2f' % result['tau'], 'p': '%.4f' % result['p_tau']},
                  'spearman': {'v': '%.2f' % result['rho'], 'p': '%.4f' % result['p_rho']},
                  'pearson': {'v': '%.2f' % result['R'], 'p': '%.4f' % result['p_R']},
                  'bias': '%.4f' % result['BIAS'],
                  'rmsd': {'rmsd': '%.4f' % np.sqrt(result['mse']),
                           'rmsd_corr': '%.4f' % np.sqrt(result['mse_corr']),
                           'rmsd_bias': '%.4f' % np.sqrt(result['mse_bias']),
                           'rmsd_var': '%.4f' % np.sqrt(result['mse_var'])},
                  'mse': {'mse': '%.4f' % result['mse'],
                          'mse_corr': '%.4f' % result['mse_corr'],
                          'mse_bias': '%.4f' % result['mse_bias'],
                          'mse_var': '%.4f' % result['mse_var']}}

    scaling_options = {'noscale': 'No scaling',
                       'porosity': 'Scale using porosity',
                       'linreg': 'Linear Regression',
                       'mean_std': 'Mean - standard deviation',
                       'min_max': 'Minimum,maximum',
                       'lin_cdf_match': 'Piecewise <br> linear CDF matching',
                       'cdf_match': 'CDF matching'}

    if scaling is None:
        scaling = 'noscale'
    settings = {'scaling': scaling_options[scaling],
                # 'snow_depth': mask['snow_depth'],
                # 'surface_temp': mask['st_l1'],
                # 'air_temp': mask['air_temp']
                }

    output_data = {'validation_data': validation_datasets, 'masking_data': masking_data,
                   'statistics': statistics, 'settings': settings}
    status = 1
    if status == -1:
        data = 'Error'
    else:
        data = jsonify(output_data)

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
