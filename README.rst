===============
validation_tool
===============

Source code of the ASCAT validation Tool. This version depends on a connection
to a postgresql database running on dbs1.ipf.tuwien.ac.at. The included json
file in network_stations fits to the stations also in the database.

It is planned that future versions will drop this dependency and work with data
from WebServices or netCDF files directly on disk if it is not avoidable.


Run locally
===========

Run ``python app.py``, then visit http://localhost:5000


Note
====

This project has been set up using PyScaffold 2.5.5. For details and usage
information on PyScaffold see http://pyscaffold.readthedocs.org/.
