'''
Created on Jun 26, 2013

@author: pydev
'''


import scipy.io as sc_io
import numpy as np
#import general.grid.dgg.warp_grid_constants as dgg_const
import psycopg2 as psql

#ind_ld = dgg_const.ind_ld()

porosity = sc_io.readsav('/media/sf_D/porosity_ind_ld.sav')['porosity']

porosity_top=porosity['porosity_top']

conn = psql.connect("host=dbs1.ipf.tuwien.ac.at dbname=grid user=cpa password=pass4cpa")
# Open a cursor to perform database operations
cur = conn.cursor()

for i,gpi in enumerate(ind_ld.tolist()):
    
    command = "UPDATE warp_grid SET porosity_top = '%.6f' WHERE id = '%d'"%(porosity_top[i],gpi)
    cur.execute(command)
    
conn.commit()    


cur.close()
conn.close()

