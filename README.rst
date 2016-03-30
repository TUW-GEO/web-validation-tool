===============
validation_tool
===============

To run locally change the host in
``validation_tool/validation_tool/js/ValidationViewer_class.js`` to
``http://localhost:8080`` and also change the port in
``validation_tool/validation_tool/server/server.py`` to ``8080``. Then run
``python server.py`` to start the Tornado Server.

Run ``python -m SimpleHTTPServer 8888`` in the ``validation_tool`` folder to
serve the static files. Then visit http://localhost:8888/ascat.html


Note
====

This project has been set up using PyScaffold 2.5.5. For details and usage
information on PyScaffold see http://pyscaffold.readthedocs.org/.
