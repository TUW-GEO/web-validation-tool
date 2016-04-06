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

"""
VALIDATION_DS = [{'type': 'xray',
                  'name': 'cci',
                  'fid': "http://www.geo.tuwien.ac.at:8080/thredds/dodsC/testAll/ESACCI-SOILMOISTURE-L3S-SSMV-COMBINED-197811-201512_time-13575_lat-10_lon-10.nc",
                  'variable': 'sm'}]
