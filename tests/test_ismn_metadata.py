import os
import json
from validation_tool.server.ismn import ismn_metadata


def test_ismn_metadata_json_serializable():
    path = os.path.join(os.path.split(os.path.abspath(__file__))[0],
                        'test_ismn')
    metadata = ismn_metadata(path)
    # metadata should be json serializable
    json_metadata = json.dumps(metadata)
