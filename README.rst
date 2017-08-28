===================================
ISMN Dataviewer and Validation tool
===================================

This is a webapplication that can host your downloaded ISMN data so that it can
be accessed in a Browser. Just like the ISMN Dataviewer on the official website.
Additionally it can be linked with external data enabling the comparison of the
ISMN data with remotely sensed or modelled datasets.

Installation
============

Clone this repository and install all the dependencies using miniconda_. The following script 

.. code::

   conda env create -f environment.yml
   source activate validation_tool
   python setup.py develop

will create a new conda environment with all the necessary dependencies. Then
activate it and install the ``validation_tool`` in development mode into this
environment.

.. _miniconda: http://conda.pydata.org/miniconda.html

Run locally
===========

Run ``python validation_tool/app.py``, then visit http://localhost:5000

This runs a flask development Server.

This will host the ISMN test data included in ``tests/test_ismn``.


Deployment
----------

With gunicorn the tool can be deployed under the prefix
``/my_app`` using the following command:

``gunicorn --bind 0.0.0.0:5000 validation_tool:app -e SCRIPT_NAME=/my_app``


Configure to host your own ISMN dataset
=======================================

Open the file ``validation_tool/default_settings.py`` and change the folder to
which the ``ISMN_PATH`` variable points.

During the first run after this change the program will parse your ISMN folder
and store some metadata in the file ``ismn_metadata.json`` in the ISMN folder.
This can take a few minutes for bigger datasets but is only a one time thing. If
you add new data to the ISMN folder then delete this json file and the
``python_metadata`` folder to trigger a rebuild of the metadata cache.


Note
====

This project has been set up using PyScaffold 2.5.5. For details and usage
information on PyScaffold see http://pyscaffold.readthedocs.org/.
