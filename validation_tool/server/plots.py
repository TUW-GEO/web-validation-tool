'''
Created on Jun 12, 2013

@author: Christoph Paulik christoph.paulik@geo.tuwien.ac.at
'''

from validation_tool.server.io.db_model import interface


def plot_ascat_data(station_id):

    from matplotlib import pyplot as plt

    vt_db = interface()
    vt_db.connect()

    fig = plt.figure()
    ax = fig.add_axes()
    data = vt_db.get_ascat_data_for_station_id(station_id)
    data['sm'].plot(ax=ax)
    return fig


def plot_era_interim_data(station_id):

    from matplotlib import pyplot as plt

    vt_db = interface()
    vt_db.connect()

    data = vt_db.get_era_interim_data_for_station_id(station_id)
    data.plot(subplots=True)
    plt.show()
