import os
from validation_tool.server.datasets import XarrayDs

# PATH to the downloaded ISMN data
ISMN_PATH = os.path.join(os.path.dirname(__file__), '..', 'tests', 'test_ismn')
ISMN_PATH = "/media/sf_D/CCI/Phase2/validation_tool/ISMN_data/"


# lookup between dataset types and the classes that are used for
# reading, all the classes here must accept, name, fid and variables in their
# __init__
DS_CLASSES = {'xray': XarrayDs}


"""list of validation datasets, where each validation dataset is defined by a
dictionary. Each dictionary must have the following keys:

* type: one of the types in the validation_lookup dictionary
* name: string of the name of the dataset
* fid: file identifier, string of Filename or URL(for OpenDAP datasets)
* variable: string specifying the variable to read from the dataset.
* kwargs: dictionary of additional keyword arguments passed to the constructor
  of the class specified by type
* long_name: string to show in the data viewer

"""
VALIDATION_DS = {'cci': {'type': 'xray',
                         'fid': "http://www.geo.tuwien.ac.at/thredds/dodsC/testAll/ESACCI-SOILMOISTURE-L3S-SSMV-COMBINED-197811-201512_time-13575_lat-10_lon-10.nc",
                         'variable': 'sm',
                         'long_name': 'CCI soil moisture'}}

# set a dataset that should be chosen to validate against by default
# has to be a name in the VALIDATION_DS list.
DEFAULT_VAL_DS = 'cci'


# Masking datasets
# Datasets to be available for masking, same structure as the validation
# datasets
MASKING_DS = {'eraland_st_l1': {'type': 'xray',
                                'fid': "http://www.geo.tuwien.ac.at/thredds/dodsC/testAll/ERALAND_gbg4-139-stacked-1979-2014-time_10000,lon_5,lat_5.nc",
                                'variable': 'var139',
                                'long_name': 'ERALAND 0-7cm soil temperature'}}

# Other default settings

SCALING_OPTIONS = {'noscale': 'No scaling',
                   'linreg': 'Linear Regression',
                   'mean_std': 'Mean - standard deviation',
                   'min_max': 'Minimum,maximum',
                   'lin_cdf_match': 'Piecewise linear CDF matching',
                   'cdf_match': 'CDF matching'}
