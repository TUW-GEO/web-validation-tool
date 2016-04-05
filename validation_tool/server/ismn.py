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

'''
Module generates dict representation of ISMN Metadata.
'''

from pytesmo.io.ismn.interface import ISMN_Interface
import numpy as np


def ismn_metadata(path):
    """
    Goes through a downloaded ISMN dataset and reads the necessary metadata
    needed for the viewer.

    Parameters
    ----------
    path: string
        Folder in which the ISMN data is stored

    Returns
    -------
    metadata: dict
       Metadata dictionary.
    """
    metadata = {"Networks": []}
    iface = ISMN_Interface(path)
    for networkname in iface.list_networks():
        network_dict = {
            "networkID": networkname,
            "network_abstract": "",
            "network_status": "",
            "network_country": "",
            "network_continent": "",
            "network_op_start": "",
            "network_op_end": "",
            "network_type": "project",
            "network_constraints": "",
            "network_reference": "",
            "network_url_data": "",
            "network_url": "",
            "network_acknowledge": "",
            "network_variables": "",
            "network_depths": "",
            "network_sensors": "",
            "Stations": []}
        metadata['Networks'].append(network_dict)
        station_list = network_dict['Stations']
        stations = iface.list_stations(network=networkname)
        for stationname in stations:
            station = iface.get_station(stationname, network=networkname)
            dmin, dmax = station.get_min_max_obs_timestamp()
            station_dict = {
                "station_abbr": stationname,
                "lat": station.latitude,
                "lng": station.longitude,
                "comment": None,
                "stationID": stationname,
                "extMetadata": None,
                "station_name": stationname,
                "variableText": '<br>'.join(station.variables),
                "depthText": get_depth_text(station.depth_from,
                                            station.depth_to),
                "sensorText": '<br>'.join(station.sensors),
                "maximum": dmax.isoformat(),
                "minimum": dmin.isoformat()
            }
            station_list.append(station_dict)

    return metadata


def get_depth_text(depths_from, depths_to):

    l = []
    for depth_to, depth_from in zip(depths_to, depths_from):
        l.append("{:.2f} - {:.2f} m".format(depth_from, depth_to))

    return '<br>'.join(l)


def variable_list(path, stationname):
    """
    Goes through a downloaded ISMN dataset and reads the necessary metadata
    needed for the viewer.

    Parameters
    ----------
    path: string
        Folder in which the ISMN data is stored
    stationname: string
        Name of the station

    Returns
    -------
    metadata: dict
       Metadata dictionary.
    """
    variables = []
    iface = ISMN_Interface(path)
    station = iface.get_station(stationname)

    for i, var in enumerate(station.variables):
        name = "{}_{:.2f}_{}".format(var,
                                     station.depth_from[i],
                                     station.sensors[i])
        var_dict = {"quantityName": var,
                    "unit": "",
                    "depthFrom": station.depth_from[i],
                    "depthTo": station.depth_to[i],
                    "sensorId": station.sensors[i],
                    "variableName": name
                    }
        variables.append(var_dict)

    dmin, dmax = station.get_min_max_obs_timestamp()
    vl = {"maxtime": dmax.date().isoformat(),
          "mintime": dmin.date().isoformat(),
          "originalTimeframeValid": False,
          "variables": variables}
    return vl


def get_station_data(path, stationname, variable,
                     depth_from, depth_to, sensor_id):
    """
    Read the data from the ISMN dataset

    Parameters
    ----------
    path: string
        Folder in which the ISMN data is stored
    stationname: string
        Name of the station
    variable: string
        Name of the variable to read
    depth_from: string
        starting depth of the variable
    depth_to: string
        end depth of the variable
    sensor_id: string
        Sensor id of the sensor to read

    Returns
    -------
    ds: pandas.DataFrame
        Data
    """
    iface = ISMN_Interface(path)
    station = iface.get_station(stationname)
    ds = station.read_variable(variable.encode('ascii'),
                               float(depth_from),
                               float(depth_to),
                               sensor_id.encode('ascii'))
    return ds.data[variable]


def get_station_lonlat(path, stationname):
    """
    Get the latitude and longitude coordinates from a station.

    Parameters
    ----------
    path: string
        Folder in which the ISMN data is stored
    stationname: string
        Name of the station

    Returns
    -------
    lon: float
    lat: float
    """
    iface = ISMN_Interface(path)
    station = iface.get_station(stationname)
    return station.longitude, station.latitude


def get_station_first_sm_layer(path, stationname):
    """
    Get the metadata of the first soil moisture layer of this variable.

    Parameters
    ----------
    path: string
        Folder in which the ISMN data is stored
    stationname: string
        Name of the station

    Returns
    -------
    depth_from: float
    depth_to: float
    sensor: string
    """
    iface = ISMN_Interface(path)
    station = iface.get_station(stationname)
    depths_from, depths_to = station.get_depths("soil moisture")
    s_idx = np.argsort(depths_from)
    depth_from = depths_from[s_idx[0]]
    depth_to = depths_to[s_idx[0]]
    sensor = station.get_sensors("soil moisture", depth_from, depth_to)
    return depth_from, depth_to, sensor[0]
