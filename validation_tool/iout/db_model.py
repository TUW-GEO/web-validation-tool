'''
Created on Jun 11, 2013

@author: Christoph Paulik christoph.paulik@geo.tuwien.ac.at
'''


from sqlalchemy.ext.hybrid import hybrid_property
from geoalchemy2 import Geography
from geoalchemy2.elements import WKTElement
from sqlalchemy import Column, Integer,String,BOOLEAN, REAL,TIMESTAMP, create_engine, ForeignKey
from sqlalchemy.schema import UniqueConstraint
from sqlalchemy.orm import relationship,sessionmaker,create_session
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import numpy as np
import matplotlib.dates as mdates
import pandas as pd



# create engine to connect to postgresql database - read only user
engine = create_engine('postgresql://cpa:pass4cpa@dbs1.ipf.tuwien.ac.at/grid', echo=False)

# Setup the declarative extension
Base = declarative_base(engine)


class interface():
    '''
    Helper Class that connects to the database and provides meta queries that do not fit into other objects.
    Attributes
    ----------
    session : sqlalchemy.orm.session.Session
        database session
    '''
    def __init__(self):
        pass
    
    def connect(self):
        '''
        Builds connection and populates sqlalchemy Classes
        '''
        Session = sessionmaker(bind=engine)
        self.session = Session()#create_session(bind=engine)
    
    def disconnect(self):
        '''
        Closes sqlalchemy session
        '''
        self.session.close()
    
    def get_ascat_data_for_station_id(self,station_id):
        
        loc = self.session.query(Location).filter(Location.station_id==station_id).first()
        
        dataset = self.session.query(Ascat_ssm.time,Ascat_ssm.ssm,Ascat_ssm.ssf,Ascat_ssm.dir).filter(Ascat_ssm.gpi == loc.warp_gpi).all()

        np_data=np.array(dataset)
        
        df = pd.DataFrame(np_data[:,1:4],np_data[:,0])
        df.columns = ['sm', 'ssf', 'dir']
        jd = mdates.num2julian(mdates.date2num(np_data[:,0]))
        df['jd']=jd
        
        return df
    
    def get_era_interim_data_for_station_id(self,station_id):
        
        loc = self.session.query(Location).filter(Location.station_id==station_id).first()
        
        dataset = self.session.query(ERA_Interim_db.time,ERA_Interim_db.sm_l1,ERA_Interim_db.st_l1,ERA_Interim_db.snow_depth,ERA_Interim_db.air_temp).filter(ERA_Interim_db.gpi == loc.ecmwf_gpi).all()
        
        np_data=np.array(dataset)
        df = pd.DataFrame(np_data[:,1:5],np_data[:,0])
        df.columns = ['sm_l1', 'st_l1', 'snow_depth', 'air_temp']
        jd = mdates.num2julian(mdates.date2num(np_data[:,0]))
        df['jd']=jd
        
        return df

    def get_location_for_station_id(self,station_id):
        
        loc = self.session.query(Location).filter(Location.station_id==station_id).first()
        return loc

class Warp_grid(Base):
    __tablename__ = 'warp_grid'
    _table_args__ = {'autoload':True}
    id = Column(Integer,primary_key=True)
    porosity_top = Column(REAL)

class Location(Base):
    __tablename__ = 'vt_location'
    station_id = Column(Integer, primary_key=True)
    warp_gpi =Column(Integer,ForeignKey('warp_grid.id'))
    ecmwf_gpi =Column(Integer)
    gpi_details = relationship('Warp_grid')

    def __init__(self, station_id, warp_gpi,ecmwf_gpi):
        self.station_id = station_id
        self.warp_gpi = warp_gpi
        self.ecmwf_gpi = ecmwf_gpi
    
class ERA_Interim_grid(Base):
    __tablename__ = 'era_interim_grid'
    _table_args__ = {'autoload':True}   
    id = Column(Integer,primary_key=True) 
              
class Ascat_ssm(Base):
    __tablename__ = 'vt_ascat_ssm'
    _table_args__ = {'autoload':True}  
    gpi = Column(Integer,primary_key=True)
    time = Column(TIMESTAMP,primary_key=True)
    ssm= Column(REAL)
    ssf= Column(Integer)
    version = Column(String)
    dir = Column(BOOLEAN)
    UniqueConstraint('gpi','time')
    
    def __init__(self,gpi,time,ssm,ssf,version,dir):
        self.gpi = gpi
        self.time = time
        self.ssm = ssm
        self.ssf = ssf
        self.version = version
        self.dir = dir
        
    
class ERA_Interim_db(Base):
    __tablename__ = 'vt_era_interim'
    _table_args__ = {'autoload':True}  
    id = Column(Integer,primary_key=True)
    gpi = Column(Integer)
    time = Column(TIMESTAMP)
    sm_l1= Column(REAL)
    st_l1= Column(REAL)
    snow_depth = Column(REAL)
    air_temp = Column(REAL)
    UniqueConstraint('gpi','time')
    
    def __init__(self,gpi,time,sm_l1,st_l1,snow_depth,air_temp):
        self.gpi = gpi
        self.time = time
        self.sm_l1 = sm_l1
        self.st_l1 = st_l1
        self.snow_depth = snow_depth
        self.air_temp = air_temp
