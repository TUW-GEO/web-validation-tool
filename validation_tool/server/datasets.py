# Copyright (c) 2016,Vienna University of Technology,
# Department of Geodesy and Geoinformation
# All rights reserved.

# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are met:
#   * Redistributions of source code must retain the above copyright notice,
#     this list of conditions and the following disclaimer.
#   * Redistributions in binary form must reproduce the above copyright notice,
#     this list of conditions and the following disclaimer in the documentation
#     and/or other materials provided with the distribution.
#   * Neither the name of the Vienna University of Technology, Department of
#     Geodesy and Geoinformation nor the names of its contributors may be used
#     to endorse or promote products derived from this software without specific
#     prior written permission.

# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
# AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
# IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
# DISCLAIMED. IN NO EVENT SHALL VIENNA UNIVERSITY OF TECHNOLOGY, DEPARTMENT OF
# GEODESY AND GEOINFORMATION BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
# SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
# PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR
# BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
# IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
# ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
# POSSIBILITY OF SUCH DAMAGE.

'''Supported Datasets for validation and masking in the tool.

These classes have to have a read(lon, lat) method that returns a
pandas.DataFrame.
'''

import xarray
from validation_tool import app


class XarrayDs(object):
    """
    Supports reading from xarrays including the xarray OpenDAP support.
    This dataset reads only from one variable.

    Parameters
    ----------
    name: string
        Dataset name to use, will also prefix variables.
    fid: string
        File identifier, either a filename or a OpenDAP URL.
    variable: string
        Variable to read from the dataset.
    """

    def __init__(self, name, fid, variable):
        self.name = name
        self.xr = xarray.open_dataset(fid)
        self.variable = variable

        self.dataset_name = '_'.join([name, variable])

    def read(self, lon, lat):
        """
        Read time series data from a xarray. This is limited to datasets
        having lat, lon coordinates that are recognized by xarray.
        This is the case for most datasets available through openDAP
        that we host.

        Parameters
        ----------
        lon: float
           longitude of datapoint
        lat: float
           latitude of datapoint

        Returns
        -------
        df: pandas.DataFrame
        """

        ds = self.xr[self.variable].sel(lon=lon, lat=lat, method='nearest')
        ser = ds.to_dataframe()[self.variable].dropna()
        ser.name = self.dataset_name
        return ser

    def get_metadata(self):
        """
        Get metadata about the variable.

        If a field is not available then it is set to None.

        Returns
        -------
        long_name: string
            long name of the variable
        units: string
            units of the variable
        flag_values: list
            if the variable is a flag then these are the possible values
        flag_meanings: list
            if the variable is a flag then these are the meanings
            corresponding to the flag_values
        """
        try:
            long_name = self.xr[self.variable].long_name
        except AttributeError:
            long_name = None
        try:
            units = self.xr[self.variable].units
        except AttributeError:
            units = None
        try:
            flag_meanings = self.xr[self.variable].flag_meanings
        except AttributeError:
            flag_meanings = None
        try:
            flag_values = self.xr[self.variable].flag_values
        except AttributeError:
            flag_values = None

        return long_name, units, flag_values, flag_meanings
def init_ds(dsname):
    """
    initialize a dataset based on the global config VALIDATION_DS

    Parameters
    ----------
    dsname: string
        Name of dataset to init

    Returns
    -------
    dataset: object
        Instance of the dataset
    """
    dsconfig = app.config['VALIDATION_DS'][dsname]

    cls = app.config['VALIDATION_CLASSES'][dsconfig['type']]
    if not 'kwargs' in dsconfig:
        dsconfig['kwargs'] = {}

    dataset = cls(dsname,
                  dsconfig['fid'],
                  dsconfig['variable'],
                  **dsconfig['kwargs'])

    return dataset
