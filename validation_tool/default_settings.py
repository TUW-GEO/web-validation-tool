import os
from validation_tool.server.datasets import XarrayDs

# PATH to the downloaded ISMN data
ISMN_PATH = os.path.join(os.path.dirname(__file__), '..', 'tests', 'test_ismn')


# lookup between validation dataset types and the classes that are used for
# reading, all the classes here must accept, name, fid and variables in their
# __init__
VALIDATION_LOOKUP = {'xray': XarrayDs}


"""list of validation datasets, where each validation dataset is defined by a
dictionary. Each dictionary must have the following keys:

* type: one of the types in the validation_lookup dictionary
* name: string of the name of the dataset
* fid: file identifier, string of Filename or URL(for OpenDAP datasets)
* variable: string specifying the variable to read from the dataset.
* long_name: string to show in the data viewer

"""
VALIDATION_DS = [{'type': 'xray',
                  'name': 'cci',
                  'fid': "http://www.geo.tuwien.ac.at:8080/thredds/dodsC/testAll/ESACCI-SOILMOISTURE-L3S-SSMV-COMBINED-197811-201512_time-13575_lat-10_lon-10.nc",
                  'variable': 'sm',
                  'long_name': 'CCI soil moisture'}]

# set a dataset that should be chosen to validate against by default
# has to be a name in the VALIDATION_DS list.
DEFAULT_VAL_DS = 'cci'

# Other default settings

SCALING_OPTIONS = {'noscale': 'No scaling',
                   'linreg': 'Linear Regression',
                   'mean_std': 'Mean - standard deviation',
                   'min_max': 'Minimum,maximum',
                   'lin_cdf_match': 'Piecewise linear CDF matching',
                   'cdf_match': 'CDF matching'}
