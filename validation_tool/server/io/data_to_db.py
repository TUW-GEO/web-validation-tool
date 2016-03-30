'''
Created on Jun 11, 2013

@author: Christoph Paulik
'''



from RS.dataspecific.ISMN.db_model import ISMN_interface
from RS.Validation.io.db_model import interface,Location,ERA_Interim_db,Ascat_ssm
import general.grid.dgg.find as find_gp
import RS.dataspecific.ECMWF.grid as era_grid
from RS.WARP.io.interface import METOP_WARP55R11
from RS.dataspecific.ECMWF.io.interface import ERA_Interim
from datetime import datetime
import numpy as np
import pandas as pd
from sqlalchemy.exc import IntegrityError

from psycopg2.extensions import register_adapter, AsIs
def addapt_numpy_types(numpy_value):
    return AsIs(numpy_value)
register_adapter(np.float32, addapt_numpy_types)
register_adapter(np.float64, addapt_numpy_types)
register_adapter(np.uint8, addapt_numpy_types)


def add_stations_for_ismn_network(network_abbr):
    warp_r = METOP_WARP55R11()
    era_sm_l1 = ERA_Interim(parameter=39)
    era_st_l1 = ERA_Interim(parameter=139,celsius=True)
    era_snow_depth = ERA_Interim(parameter=141)
    era_air_temp = ERA_Interim(parameter=167,celsius=True)
    
    ISMN = ISMN_interface()
    ISMN.connect()
    
    Network = ISMN.get_network(network_abbr)
    
    Stations = ISMN.get_stations_with_data_between(datetime(2007,01,01), datetime(2013,2,28),network=Network)
    
    locations = []
    
    vt_db=interface()
    vt_db.connect()
    
    period=[datetime(2007,01,01),datetime(2013,2,28)]
    
    added_warp_gpis=[]
    added_era_gpis=[]
    
    for station in Stations:
    
        era_gpi,era_dist,era_lat,era_lon,era_status = era_grid.find_nearest_gp(station.lat, station.lon)
        if era_status == 0:
            print "No Era Interim grid point found"
            continue
        warp_gpi,warp_dist,warp_lat,warp_lon,warp_status=find_gp.find_nearest_gp(station.lat, station.lon, "warp_grid",lm_name='ind_ld')
        if warp_status ==0:
            print "No ASCAT grid point found"
            continue
        
        vt_db.session.add(Location(station.station_id,warp_gpi[0],era_gpi))
        try: 
            vt_db.session.commit()
        except IntegrityError:
            print station.station_id
            print station.station_abbr
            print "InegrityError: station probably already in db - skipping to next"    
            vt_db.session.rollback()  
    
        
        
        #if point not yet added then add now
        if not era_gpi in added_era_gpis:
            added_era_gpis.append(era_gpi)
        
        
            sm_l1 = era_sm_l1.read_ts(era_gpi,period=period)
            st_l1 = era_st_l1.read_ts(era_gpi,period=period)
            snow_depth = era_snow_depth.read_ts(era_gpi,period=period)
            air_temp = era_air_temp.read_ts(era_gpi,period=period)
        
            non_nan = ( pd.notnull(sm_l1['data']).values & pd.notnull(st_l1['data']).values & \
                   pd.notnull(snow_depth['data']).values & pd.notnull(air_temp['data']).values)
        
            sm_l1 = sm_l1[non_nan]
            st_l1 = st_l1[non_nan]
            snow_depth = snow_depth[non_nan]
            air_temp = air_temp[non_nan]
        
            for i,value in enumerate(sm_l1.index):
            
                vt_db.session.add(ERA_Interim_db(era_gpi,sm_l1.index[i], \
                                             sm_l1['data'].values[i],st_l1['data'].values[i],\
                                             snow_depth['data'].values[i],air_temp['data'].values[i]))
        
                try:
                    vt_db.session.commit()
                except IntegrityError:    
                    print "Integrity Error: moving to next row of ERA Interim" 
                    print IntegrityError.statement
                    vt_db.session.rollback()     
    
        
        if not warp_gpi[0] in added_warp_gpis:
            added_warp_gpis.append(warp_gpi[0])
        
            ssm = warp_r.read_ssm(warp_gpi[0])
        
            non_nan = ssm['sm'].values != -999999.
        
            ssf = warp_r.read_ssf(warp_gpi[0])
            warp_version='5.5'
        
            ssm = ssm[non_nan]
            ssf = ssf[non_nan]
            direction = {'A':'0','D':'1'}
        
        
            for i,value in enumerate(ssm.index):
                vt_db.session.add(Ascat_ssm(warp_gpi[0],ssm.index[i],ssm['sm'].values[i]\
                                        ,ssf['ssf'].values[i],warp_version,direction[ssm['dir'].values[i]]))
        
                try:
                    vt_db.session.commit()
                except IntegrityError:    
                    print "Integrity Error: moving to next row of ASCAT data" 
                    print IntegrityError.statement
                    vt_db.session.rollback()
        
        
        
        
            
    
        print station.station_id
        print station.station_abbr
    
    vt_db.disconnect()


#===============================================================================
# add_stations_for_ismn_network('SCAN')
# add_stations_for_ismn_network('FMI')
# add_stations_for_ismn_network('ARM')

# add_stations_for_ismn_network('VAS')
# add_stations_for_ismn_network('HOBE')
#===============================================================================
#add_stations_for_ismn_network('AMMA')
#add_stations_for_ismn_network('CARBOAFRICA')
add_stations_for_ismn_network('HSC_SELMACHEON')
add_stations_for_ismn_network('HYU_CHEONGMICHEON')
add_stations_for_ismn_network('MAQU')
add_stations_for_ismn_network('OZNET')
add_stations_for_ismn_network('SASMAS')
add_stations_for_ismn_network('CALABRIA')
add_stations_for_ismn_network('CAMPANIA')
add_stations_for_ismn_network('HYDROL-NET_PERUGIA')
add_stations_for_ismn_network('REMEDHUS')
add_stations_for_ismn_network('TERENO')
add_stations_for_ismn_network('VAS')
add_stations_for_ismn_network('COSMOS')
add_stations_for_ismn_network('ICN')
add_stations_for_ismn_network('USCRN')
add_stations_for_ismn_network('USDA-ARS')



pass


      
        
        