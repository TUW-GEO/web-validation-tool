import os
import json
from validation_tool.server.ismn import ismn_metadata
from validation_tool.server.ismn import get_station_lonlat
from validation_tool.server.ismn import get_station_first_sm_layer
import numpy.testing as nptest


def test_ismn_metadata_json_serializable():
    path = os.path.join(os.path.split(os.path.abspath(__file__))[0],
                        'test_ismn')
    metadata = ismn_metadata(path)
    # metadata should be json serializable
    json_metadata = json.dumps(metadata)


def test_ismn_get_station_lonlat():
    path = os.path.join(os.path.split(os.path.abspath(__file__))[0],
                        'test_ismn')
    lon, lat = get_station_lonlat(path, "CST_02")
    nptest.assert_allclose(lat, 33.6666)
    nptest.assert_allclose(lon, 102.1333)


def test_ismn_get_first_sm_layer():
    path = os.path.join(os.path.split(os.path.abspath(__file__))[0],
                        'test_ismn')
    depth_from, depth_to, sensor = get_station_first_sm_layer(path, "CST_02")
    nptest.assert_allclose(depth_from, 0.05)
    nptest.assert_allclose(depth_to, 0.05)
    assert sensor == "ECH20-EC-TM"
