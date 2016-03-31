import pkg_resources

try:
    __version__ = pkg_resources.get_distribution(__name__).version
except:
    __version__ = 'unknown'

from flask import Flask
app = Flask(__name__)

import validation_tool.views
