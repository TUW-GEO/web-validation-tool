'''
Created on Jun 12, 2013

@author: Christoph Paulik christoph.paulik@geo.tuwien.ac.at
'''


import scipy.stats as sc_stats
import numpy as np
import pandas as pd
from datetime import datetime

import pytesmo.temporal_matching as temp_match
import pytesmo.scaling as scale
import pytesmo.metrics as metrics
import pytesmo.time_series.anomaly as anomaly_calc

from validation_tool import app
from validation_tool.server.datasets import init_ds


def to_dygraph_format(self):
    labels = ['date']
    labels.extend(self.columns.values.tolist())
    data_values = np.hsplit(self.values, self.columns.values.size)
    data_index = self.index.values.astype('M8[s]').tolist()
    data_index = [x.strftime("%Y/%m/%d %H:%M:%S") for x in data_index]
    data_index = np.reshape(data_index, (len(data_index), 1))
    data_values.insert(0, data_index)
    data_values = np.column_stack(data_values)
    return labels, data_values.tolist()

pd.DataFrame.to_dygraph_format = to_dygraph_format


def mask_data():

    era_matched = temp_match.df_match(ascat_data, era_interim_data, window=1)

    ascat_masked = ascat_data[(era_matched['snow_depth'] <= mask['snow_depth'])
                              & (era_matched['st_l1'] > mask['st_l1'])
                              & (era_matched['air_temp'] > mask['air_temp'])]

    if mask['use_ssf'] == True:
        ascat_masked = ascat_masked[ascat_masked['ssf'] == 1]

    ascat_masked = ascat_masked[[ascat_label, 'jd']]

    relevant_depth = None
    ISMN_station = ISMN.get_station_by_id(station_id)
    for depth in ISMN_station.sm_depths:
        if float(depth.depth_from) - 0.05 < 0.001:
            relevant_depth = depth

    if relevant_depth == None:
        return 0, -1

    ISMN_data = ISMN_station.get_soil_moisture_for_depth(
        relevant_depth, start_date=datetime(2007, 1, 1))

    sensor = ISMN_data.keys()[0]
    ISMN_data = ISMN_data[sensor]
    ISMN_ts_name = 'insitu sm %.2f - %.2f m sensor: ' % (
        float(relevant_depth.depth_from), float(relevant_depth.depth_to)) + sensor

    era_insitu_matched = temp_match.df_match(
        ISMN_data, era_interim_data, window=1)

    insitu_masked = ISMN_data[(era_insitu_matched['snow_depth'] <= mask['snow_depth'])
                              & (era_insitu_matched['st_l1'] > mask['st_l1'])
                              & (era_insitu_matched['air_temp'] > mask['air_temp'])]

    if mask['use_ssf'] == True:
        ascat_insitu_matched = temp_match.df_match(
            insitu_masked, ascat_data, window=1)
        insitu_masked = insitu_masked[ascat_insitu_matched['ssf'] == 1]

    ISMN_data = insitu_masked[['insitu', 'jd']]

    # slice to same period as insitu data
    era_matched = era_matched[scaled_data.index[0]:
                              scaled_data.index[scaled_data.index.values.size - 1]]

    era_matched.rename(columns={'st_l1': 'soil temperature layer 1',
                                'air_temp': '2m air temperature'}, inplace=True)

    era_matched = era_matched[
        ['snow_depth', 'soil temperature layer 1', '2m air temperature']]

    era_labels, era_values = era_matched.to_dygraph_format()

    masking_data = {'labels': masking_labels, 'data': masking_values}


def compare_data(ismn_data, validation_data,
                 scaling='linreg',
                 anomaly=None):
    """
    Compare data from an ISMN station to the defined validation datasets.

    Parameters
    ----------
    ismn_data: pandas.Dataframe
        Data from the ISMN used as a reference
    validation_data: dict
        Dictionary of pandas.DataFrames, One for each dataset to
        compare against
    scaling: string, optional
        Scaling method to use.
    anomaly: string
        If set then the validation is done for anomalies.
    """
    insitu_label = 'soil moisture'

    if anomaly != None:

        if anomaly == 'climatology':
            ascat_clim = anomaly_calc.calc_climatology(
                ascat_masked[ascat_label])
            insitu_clim = anomaly_calc.calc_climatology(
                ismn_data['soil moisture'])

            ascat_anom = anomaly_calc.calc_anomaly(
                ascat_masked[ascat_label], climatology=ascat_clim)
            ascat_masked[ascat_label] = ascat_anom.values

            insitu_anom = anomaly_calc.calc_anomaly(
                ISMN_data['insitu'], climatology=insitu_clim)
            ISMN_data['insitu'] = insitu_anom.values

        if anomaly == 'average':
            ascat_anom = anomaly_calc.calc_anomaly(ascat_masked[ascat_label])
            ascat_masked[ascat_label] = ascat_anom.values

            insitu_anom = anomaly_calc.calc_anomaly(ISMN_data['insitu'])
            ISMN_data['insitu'] = insitu_anom.values

        ascat_masked = ascat_masked.dropna()
        ISMN_data = ISMN_data.dropna()

    for dname in validation_data:
        vdata = validation_data[dname]
        vdata_label = 'cci_sm'

        matched_data = temp_match.matching(
            ismn_data, vdata, window=1)

        if scaling != 'noscale' and scaling != 'porosity':

            scaled_data = scale.add_scaled(
                matched_data, label_in=vdata_label, label_scale=insitu_label, method=scaling)

            scaled_label = vdata_label + '_scaled_' + scaling

            scaled_data = scaled_data[[insitu_label, scaled_label]]

        elif scaling == 'noscale':
            scaled_data = matched_data[[insitu_label, vdata_label]]
            scaled_label = vdata_label

    # scaled_data.rename(columns={'insitu': ISMN_ts_name}, inplace=True)

    labels, values = scaled_data.to_dygraph_format()

    ascat_insitu = {'labels': labels, 'data': values}

    x, y = scaled_data[insitu_label].values, scaled_data[scaled_label].values

    kendall, p_kendall = sc_stats.kendalltau(x.tolist(), y.tolist())
    spearman, p_spearman = sc_stats.spearmanr(x, y)
    pearson, p_pearson = sc_stats.pearsonr(x, y)
    rmsd = metrics.rmsd(x, y)
    bias = metrics.bias(y, x)
    mse, mse_corr, mse_bias, mse_var = metrics.mse(x, y)
    statistics = {'kendall': {'v': '%.2f' % kendall, 'p': '%.4f' % p_kendall},
                  'spearman': {'v': '%.2f' % spearman, 'p': '%.4f' % p_spearman},
                  'pearson': {'v': '%.2f' % pearson, 'p': '%.4f' % p_pearson},
                  'bias': '%.4f' % bias,
                  'rmsd': {'rmsd': '%.4f' % np.sqrt(mse), 'rmsd_corr': '%.4f' % np.sqrt(mse_corr),
                           'rmsd_bias': '%.4f' % np.sqrt(mse_bias), 'rmsd_var': '%.4f' % np.sqrt(mse_var)},
                  'mse': {'mse': '%.4f' % mse, 'mse_corr': '%.4f' % mse_corr, 'mse_bias': '%.4f' % mse_bias, 'mse_var': '%.4f' % mse_var}}

    scaling_options = {'noscale': 'No scaling',
                       'porosity': 'Scale using porosity',
                       'linreg': 'Linear Regression',
                       'mean_std': 'Mean - standard deviation',
                       'min_max': 'Minimum,maximum',
                       'lin_cdf_match': 'Piecewise <br> linear CDF matching',
                       'cdf_match': 'CDF matching'}

    settings = {'scaling': scaling_options[scaling],
                # 'snow_depth': mask['snow_depth'],
                # 'surface_temp': mask['st_l1'],
                # 'air_temp': mask['air_temp']
                }

    era_data = {'labels': [], 'data': []}
    output_data = {'validation_data': ascat_insitu, 'masking_data': era_data,
                   'statistics': statistics, 'settings': settings}

    return output_data, 1


def get_validation_data(lon, lat):
    """
    Read data from the validation datasets
    based on latitude and longitude.
    """

    datasets = {}
    for ds in app.config['VALIDATION_DS']:
        dataset = init_ds(ds)
        data = dataset.read_ts(lon, lat)
        datasets[dataset.name] = data

    return datasets


def get_validation_ds_dict():
    """
    Read metadata from the validation dataset and return as
    dict compatible with pytesmo validation framework.
    """

    datasets = {}
    for ds in app.config['VALIDATION_DS']:
        dsconfig = app.config['VALIDATION_DS'][ds]
        dataset = init_ds(ds)
        datasets[dataset.name] = {'class': dataset,
                                  'columns': [dsconfig['variable']]}

    return datasets


def get_validation_metadata():
    """
    Read metadata from the validation datasets.
    """

    datasets = {}
    for ds in app.config['VALIDATION_DS']:
        dsconfig = app.config['VALIDATION_DS'][ds]
        dataset = init_ds(ds)
        long_name, units, flag_values, flag_meanings = dataset.get_metadata()
        metadata = dict(long_name=long_name,
                        units=units,
                        flag_values=flag_values,
                        flag_meanings=flag_meanings,
                        name=ds)
        datasets[dataset.name] = {'long_name': dsconfig['long_name'],
                                  'variable': metadata}

    return datasets
