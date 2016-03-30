'''
Created on Jun 12, 2013

@author: Christoph Paulik christoph.paulik@geo.tuwien.ac.at
'''

    
import scipy.stats as sc_stats
import numpy as np
import pandas as pd
from datetime import datetime
import time

from RS.Validation.io.db_model import interface
from RS.dataspecific.ISMN.db_model import ISMN_interface
import general.time_series.temporal_matching as temp_match
import general.time_series.scaling as scale
import general.time_series.metrics as metrics
import general.time_series.anomaly as anomaly_calc


def to_dygraph_format(self):
    labels = ['date']
    labels.extend(self.columns.values.tolist())
    data_values = np.hsplit(self.values,self.columns.values.size)
    data_index = self.index.values.astype('M8[s]').tolist()
    data_index = [x.strftime("%Y/%m/%d %H:%M:%S") for x in data_index]
    data_index=np.reshape(data_index,(len(data_index),1))
    data_values.insert(0,data_index)
    data_values= np.column_stack(data_values)
    return labels,data_values.tolist()

pd.DataFrame.to_dygraph_format=to_dygraph_format


def get_data(station_id,scaling='linreg',mask={'snow_depth':0.0,'st_l1':0.0,'air_temp':0.0,'use_ssf':True},\
             anomaly=None):
           
    ascat_label = 'ASCAT_SSM'
    
    vt_db=interface()
    vt_db.connect()
    
    
    
    ascat_data = vt_db.get_ascat_data_for_station_id(station_id)
    
    ascat_data.rename(columns={'sm':ascat_label},inplace=True) 
    
    era_interim_data = vt_db.get_era_interim_data_for_station_id(station_id)
    
    era_matched = temp_match.df_match(ascat_data,era_interim_data,window=1)

    ascat_masked = ascat_data[(era_matched['snow_depth'] <= mask['snow_depth'])\
                                  &(era_matched['st_l1'] > mask['st_l1'])\
                                  &(era_matched['air_temp'] > mask['air_temp'])]   
    
    if mask['use_ssf']==True: ascat_masked = ascat_masked[ascat_masked['ssf']==1]
    
    ascat_masked = ascat_masked[[ascat_label,'jd']] 
    
    
    ISMN = ISMN_interface()
    ISMN.connect()
    relevant_depth = None
    ISMN_station=ISMN.get_station_by_id(station_id)
    for depth in ISMN_station.sm_depths:
        if float(depth.depth_from) - 0.05 < 0.001:
            relevant_depth = depth
        
    if relevant_depth == None:
        return 0,-1
    
    ISMN_data = ISMN_station.get_soil_moisture_for_depth(relevant_depth,start_date=datetime(2007,1,1))
    
    ISMN_ts_name = 'insitu sm %.2f - %.2f m sensor: '%(float(relevant_depth.depth_from),float(relevant_depth.depth_to))+\
                   ISMN_data['sensor_name'].values[0] 
    
    
    if anomaly != None:
        
        era_insitu_matched = temp_match.df_match(ISMN_data,era_interim_data,window=1)

        insitu_masked = ISMN_data[(era_insitu_matched['snow_depth'] <= mask['snow_depth'])\
                                  &(era_insitu_matched['st_l1'] > mask['st_l1'])\
                                  &(era_insitu_matched['air_temp'] > mask['air_temp'])]   
    
        if mask['use_ssf']==True: 
            ascat_insitu_matched = temp_match.df_match(insitu_masked,ascat_data,window=1)
            insitu_masked = insitu_masked[ascat_insitu_matched['ssf']==1]
            
            
        ISMN_data = insitu_masked[['insitu','jd']] 
        
        
        
        if anomaly == 'climatology':
            ascat_clim = anomaly_calc.calc_climatology(ascat_masked[ascat_label])
            insitu_clim = anomaly_calc.calc_climatology(ISMN_data['insitu'])
            
            ascat_anom = anomaly_calc.calc_anomaly(ascat_masked[ascat_label],climatology=ascat_clim)
            ascat_masked[ascat_label]=ascat_anom.values
            
            insitu_anom = anomaly_calc.calc_anomaly(ISMN_data['insitu'],climatology=insitu_clim)
            ISMN_data['insitu']=insitu_anom.values
            
        if anomaly == 'average':
            ascat_anom = anomaly_calc.calc_anomaly(ascat_masked[ascat_label])
            ascat_masked[ascat_label]=ascat_anom.values
            
            insitu_anom = anomaly_calc.calc_anomaly(ISMN_data['insitu'])
            ISMN_data['insitu']=insitu_anom.values    
            
        ascat_masked = ascat_masked.dropna()
        ISMN_data = ISMN_data.dropna()    
            
    
    matched_data = temp_match.match(ISMN_data,ascat_masked,1)
    
    if scaling != 'noscale' and scaling != 'porosity':
    
        scaled_data = scale.add_scaled(matched_data,label_in=ascat_label, label_scale='insitu', method=scaling)
        
        scaled_label=ascat_label+'_scaled_' + scaling
        
        scaled_data = scaled_data[['insitu',scaled_label]]

    elif scaling == 'noscale':
        scaled_data = matched_data[['insitu',ascat_label]]
        scaled_label=ascat_label
    elif scaling == 'porosity':
        loc = vt_db.get_location_for_station_id(station_id)
        porosity_top=loc.gpi_details.porosity_top
        scaled_label=ascat_label+'/porosity'
        matched_data[scaled_label] = (matched_data[ascat_label]/100.0)*(porosity_top/100.0)
        scaled_data=matched_data[['insitu',scaled_label]]
        
            
    vt_db.disconnect()
    
    scaled_data.rename(columns={'insitu':ISMN_ts_name},inplace=True) 
    
    labels,values = scaled_data.to_dygraph_format()
    
    ascat_insitu = {'labels':labels,'data':values}

    #slice to same period as insitu data
    era_matched= era_matched[era_matched.index.get_loc(scaled_data.index[0]):\
                             era_matched.index.get_loc(scaled_data.index[scaled_data.index.values.size-1])]    

    era_matched.rename(columns={'st_l1':'soil temperature layer 1','air_temp':'2m air temperature'},inplace=True)

    era_matched = era_matched[['snow_depth','soil temperature layer 1','2m air temperature']]
    
    era_labels,era_values = era_matched.to_dygraph_format()

    era_data = {'labels':era_labels,'data':era_values}

    
    
    x,y=scaled_data[ISMN_ts_name].values,scaled_data[scaled_label].values
    
    kendall,p_kendall=sc_stats.kendalltau(x.tolist(),y.tolist())
    spearman,p_spearman=sc_stats.spearmanr(x, y)
    pearson,p_pearson=sc_stats.pearsonr(x, y)
    rmsd = metrics.rmsd(x, y)
    bias = metrics.bias(y, x)
    mse,mse_corr,mse_bias,mse_var = metrics.mse(x, y)
    statistics = {'kendall':{'v':'%.2f'%kendall,'p':'%.4f'%p_kendall},
                  'spearman':{'v':'%.2f'%spearman,'p':'%.4f'%p_spearman},
                  'pearson':{'v':'%.2f'%pearson,'p':'%.4f'%p_pearson},
                  'bias':'%.4f'%bias,
                  'rmsd':{'rmsd':'%.4f'%np.sqrt(mse),'rmsd_corr':'%.4f'%np.sqrt(mse_corr),\
                          'rmsd_bias':'%.4f'%np.sqrt(mse_bias),'rmsd_var':'%.4f'%np.sqrt(mse_var)},
                  'mse':{'mse':'%.4f'%mse,'mse_corr':'%.4f'%mse_corr,'mse_bias':'%.4f'%mse_bias,'mse_var':'%.4f'%mse_var}}
    
    scaling_options= {'noscale':'No scaling',
                      'porosity':'Scale using porosity',
                      'linreg':'Linear Regression',
                      'mean_std':'Mean - standard deviation',
                      'min_max':'Minimum,maximum',
                      'lin_cdf_match':'Piecewise <br> linear CDF matching',
                      'cdf_match':'CDF matching'}
    
    
    settings={'scaling':scaling_options[scaling],
              'snow_depth':mask['snow_depth'],
              'surface_temp':mask['st_l1'],
              'air_temp':mask['air_temp']}
    
    
    output_data = {'ascat_insitu':ascat_insitu,'era_interim':era_data,'statistics':statistics,'settings':settings}

    return output_data,1
    
    
    
    
    
    
        
    
    
    
