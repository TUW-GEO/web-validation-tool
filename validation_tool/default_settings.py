import os
ISMN_PATH = os.path.join(os.path.dirname(__file__), '..', 'tests', 'test_ismn')

"""list of validation datasets, where each validation dataset is defined by a
dictionary. Each dictionary must have the following keys:

* type: one of ['xray']
* name: string of the name of the dataset
* fid: file identifier, string of Filename or URL(for OpenDAP datasets)
* variables: list of strings specifying the variables to read from the dataset.

"""
VALIDATION_DS = []
